// ==========================================================================
// إدارة مركز العمليات ومتابعة الطلبات (operations.js)
// ==========================================================================

let operationsList = [];
let operationsUnsubscribe = null;
let currentOperationFilter = 'الكل';
let opEmployeesCache = [];

// تنسيقات أوراق Excel
const opExcelHeaderStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12, name: "Arial" },
    fill: { fgColor: { rgb: "2B6CB0" } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: {
        top: { style: "thin", color: { rgb: "CBD5E0" } },
        bottom: { style: "thin", color: { rgb: "CBD5E0" } },
        left: { style: "thin", color: { rgb: "CBD5E0" } },
        right: { style: "thin", color: { rgb: "CBD5E0" } }
    }
};

const opExcelDataStyle = {
    font: { sz: 11, name: "Arial", color: { rgb: "2D3748" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
        top: { style: "thin", color: { rgb: "E2E8F0" } },
        bottom: { style: "thin", color: { rgb: "E2E8F0" } },
        left: { style: "thin", color: { rgb: "E2E8F0" } },
        right: { style: "thin", color: { rgb: "E2E8F0" } }
    }
};

function formatOperationsSheet(worksheet, colWidths = 18) {
    if (!worksheet || !worksheet['!ref'] || typeof XLSX === 'undefined') return;
    try {
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        const wscols = [];
        
        for (let C = range.s.c; C <= range.e.c; ++C) {
            wscols.push({ wch: colWidths });
            for (let R = range.s.r; R <= range.e.r; ++R) {
                const address = XLSX.utils.encode_cell({ r: R, c: C });
                if (!worksheet[address]) continue;
                if (R === 0) {
                    worksheet[address].s = opExcelHeaderStyle;
                } else {
                    worksheet[address].s = opExcelDataStyle;
                }
            }
        }
        worksheet['!cols'] = wscols;
        worksheet['!dir'] = 'rtl';
    } catch(e) {
        console.warn("Could not apply styles to worksheet:", e);
    }
}

// دالة تحميل وتصدير ملفات Excel بأسماء واضحة وصحيحة لجميع المتصفحات
function downloadExcelWorkbook(workbook, filename) {
    if (!filename.toLowerCase().endsWith('.xlsx')) {
        filename += '.xlsx';
    }

    const cleanFilename = filename.replace(/[\\/:*?"<>|]/g, '_');

    try {
        const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });

        if (typeof saveAs === 'function') {
            saveAs(blob, cleanFilename);
            return;
        }

        if (window.navigator && window.navigator.msSaveOrOpenBlob) {
            window.navigator.msSaveOrOpenBlob(blob, cleanFilename);
            return;
        }

        let fileOrBlob;
        try {
            fileOrBlob = new File([blob], cleanFilename, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        } catch (e) {
            fileOrBlob = blob;
        }

        const url = URL.createObjectURL(fileOrBlob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = cleanFilename;
        a.setAttribute('download', cleanFilename);

        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
            if (a.parentNode) a.parentNode.removeChild(a);
            URL.revokeObjectURL(url);
        }, 15000);
    } catch (err) {
        console.error("Error in downloadExcelWorkbook:", err);
    }
}

// تحميل العمليات من قاعدة البيانات (Real-time listener)
function loadOperations() {
    if (operationsUnsubscribe) {
        operationsUnsubscribe();
        operationsUnsubscribe = null;
    }

    // وضع الضيف التجريبي: قراءة البيانات من الذاكرة المؤقتة فقط
    if (typeof isGuestMode !== 'undefined' && isGuestMode) {
        loadOpEmployeesCache();
        operationsList = (typeof guestData !== 'undefined' && guestData.operations) ? [...guestData.operations] : [];
        updateOperationsStats();
        filterOperations();
        return;
    }

    const uid = (typeof getCurrentUserId === 'function') ? getCurrentUserId() : null;
    const isAdmin = (typeof isCurrentUserAdmin === 'function') ? isCurrentUserAdmin() : false;

    // إذا لم يكن مسجلاً وليس في وضع الضيف، تصفير القائمة
    if (!uid && !isAdmin) {
        operationsList = [];
        updateOperationsStats();
        filterOperations();
        return;
    }

    if (typeof db === 'undefined') {
        console.error("Firebase db is not initialized yet.");
        return;
    }

    // جلب قائمة الموظفين للربط التلقائي
    loadOpEmployeesCache();

    let query = db.collection('operations');
    if (!isAdmin && uid) {
        query = query.where('userId', '==', uid);
    }

    operationsUnsubscribe = query.onSnapshot(snapshot => {
        operationsList = [];
        snapshot.forEach(doc => {
            operationsList.push({ id: doc.id, ...doc.data() });
        });
        // ترتيب العمليات تنازلياً حسب رقم المسلسل برمجياً
        operationsList.sort((a, b) => (Number(b.seqNum) || 0) - (Number(a.seqNum) || 0));
        updateOperationsStats();
        filterOperations();
    }, err => {
        console.error("Error loading operations: ", err);
    });
}

// تخزين قائمة الموظفين للربط الذكي
async function loadOpEmployeesCache() {
    if (typeof isGuestMode !== 'undefined' && isGuestMode) {
        const compMap = {};
        if (guestData && guestData.companies) {
            guestData.companies.forEach(c => { compMap[c.id] = c.name; });
        }
        opEmployeesCache = (guestData && guestData.employees) ? guestData.employees.map(emp => ({
            id: emp.id,
            name: (emp.name || '').trim(),
            code: (emp.code || '').trim(),
            nat_id: (emp.nat_id || '').trim(),
            company_id: emp.company_id || '',
            company_name: compMap[emp.company_id] || emp.company_name || ''
        })) : [];
        return;
    }

    if (typeof db === 'undefined') return;
    try {
        const uid = (typeof getCurrentUserId === 'function') ? getCurrentUserId() : null;
        const isAdmin = (typeof isCurrentUserAdmin === 'function') ? isCurrentUserAdmin() : false;

        let empQuery = db.collection('employees');
        let compQuery = db.collection('companies');
        if (!isAdmin && uid) {
            empQuery = empQuery.where('userId', '==', uid);
            compQuery = compQuery.where('userId', '==', uid);
        }

        const [empSnap, compSnap] = await Promise.all([
            empQuery.get(),
            compQuery.get()
        ]);
        
        const compMap = {};
        compSnap.forEach(d => { compMap[d.id] = d.data().name || d.id; });

        opEmployeesCache = [];
        empSnap.forEach(doc => {
            const data = doc.data();
            opEmployeesCache.push({
                id: doc.id,
                name: (data.name || '').trim(),
                code: (data.code || '').trim(),
                nat_id: (data.nat_id || '').trim(),
                company_id: data.company_id || '',
                company_name: compMap[data.company_id] || data.company_name || ''
            });
        });
    } catch(e) {
        console.warn("Could not cache employees for operations linking:", e);
    }
}

function updateOperationsStats() {
    const stats = {
        total: operationsList.length,
        waiting: 0,
        completed: 0,
        rejected: 0,
        duplicate: 0,
        underReview: 0
    };

    operationsList.forEach(op => {
        if (op.status === 'انتظار') stats.waiting++;
        else if (op.status === 'مكتمل') stats.completed++;
        else if (op.status === 'مرفوض') stats.rejected++;
        else if (op.status === 'مكرر') stats.duplicate++;
        else if (op.status === 'قيد المراجعة') stats.underReview++;
    });

    const elTotal = document.getElementById('statOpTotal');
    const elWaiting = document.getElementById('statOpWaiting');
    const elCompleted = document.getElementById('statOpCompleted');
    const elRejected = document.getElementById('statOpRejected');
    const elDuplicate = document.getElementById('statOpDuplicate');
    const elUnderReview = document.getElementById('statOpUnderReview');

    if (elTotal) elTotal.innerText = stats.total;
    if (elWaiting) elWaiting.innerText = stats.waiting;
    if (elCompleted) elCompleted.innerText = stats.completed;
    if (elRejected) elRejected.innerText = stats.rejected;
    if (elDuplicate) elDuplicate.innerText = stats.duplicate;
    if (elUnderReview) elUnderReview.innerText = stats.underReview;

    if (typeof updateDashboardAnalytics === 'function') {
        updateDashboardAnalytics();
    }
}

function setOperationsFilter(filter) {
    currentOperationFilter = filter;
    
    const cards = document.querySelectorAll('.op-filter-card');
    cards.forEach(card => {
        if (card.dataset.filter === filter) {
            let color = '#8892b0';
            if (filter === 'مكتمل') color = '#48bb78';
            else if (filter === 'مرفوض') color = '#f56565';
            else if (filter === 'قيد المراجعة') color = '#ecc94b';
            else if (filter === 'مكرر') color = '#9f7aea';
            else if (filter === 'انتظار') color = '#a0aec0';
            
            card.classList.add('active-filter');
            card.style.borderColor = color;
            card.style.boxShadow = `0 0 15px ${color}40`;
        } else {
            card.classList.remove('active-filter');
            card.style.borderColor = 'transparent';
            card.style.boxShadow = 'none';
        }
    });

    filterOperations();
}

function renderOperations(dataList) {
    const tbody = document.getElementById('operationsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (dataList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" class="text-center" style="padding: 25px; color: var(--text-muted);">لا توجد عمليات مضافة</td></tr>';
        return;
    }
    
    dataList.forEach(op => {
        let statusColor = '#a0aec0';
        if(op.status === 'مكتمل') statusColor = '#48bb78';
        else if(op.status === 'مرفوض') statusColor = '#f56565';
        else if(op.status === 'قيد المراجعة') statusColor = '#ecc94b';
        else if(op.status === 'مكرر') statusColor = '#9f7aea';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="checkbox" class="op-checkbox" value="${op.id}" onchange="toggleOperationSelection()" title="تحديد"></td>
            <td style="font-weight: bold; color: var(--primary);">${op.seqNum || '-'}</td>
            <td><span style="font-family: monospace; font-weight: 600;">${op.requestCode || '-'}</span></td>
            <td><span style="font-weight: 600;">${op.incomingNum || '-'}</span></td>
            <td>${op.incomingDate || '-'}</td>
            <td>${op.requestType || '-'}</td>
            <td><span style="background: ${statusColor}20; color: ${statusColor}; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: bold;">${op.status || '-'}</span></td>
            <td title="${op.company || '-'}">${op.company || '-'}</td>
            <td title="${op.name || '-'}">${op.name || '-'}</td>
            <td title="${op.notes || '-'}">${op.notes || '-'}</td>
            <td>
                <div style="display: flex; gap: 4px; justify-content: center;">
                    <button class="neu-btn" style="padding: 4px 8px; color: #3182ce; margin: 0;" onclick="editOperation('${op.id}')" title="تعديل"><i class="fas fa-edit"></i></button>
                    <button class="neu-btn" style="padding: 4px 8px; color: #e53e3e; margin: 0;" onclick="deleteOperation('${op.id}')" title="حذف"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// فتح نافذة الإضافة/التعديل
function openOperationModal(isEdit = false, currentCompany = '') {
    const modal = document.getElementById('operationModal');
    if (!modal) return;

    modal.classList.remove('d-none');
    modal.classList.add('active');
    modal.style.display = 'flex';
    
    // تحميل وتحديث قائمة الشركات الخاصة بالمستخدم
    const uid = (typeof getCurrentUserId === 'function') ? getCurrentUserId() : null;
    const isAdmin = (typeof isCurrentUserAdmin === 'function') ? isCurrentUserAdmin() : false;

    if (typeof isGuestMode !== 'undefined' && isGuestMode) {
        const select = document.getElementById('opCompany');
        if(select) {
            select.innerHTML = '<option value="">اختر الشركة...</option>';
            if (guestData && guestData.companies) {
                guestData.companies.forEach(comp => {
                    select.innerHTML += `<option value="${comp.name}">${comp.name}</option>`;
                });
            }
            if (isEdit && currentCompany) select.value = currentCompany;
        }
    } else if (typeof db !== 'undefined') {
        let compQuery = db.collection('companies');
        if (!isAdmin && uid) {
            compQuery = compQuery.where('userId', '==', uid);
        }
        compQuery.get().then(snapshot => {
            const select = document.getElementById('opCompany');
            if(select) {
                select.innerHTML = '<option value="">اختر الشركة...</option>';
                snapshot.forEach(doc => {
                    const compName = doc.data().name;
                    select.innerHTML += `<option value="${compName}">${compName}</option>`;
                });
                if (isEdit && currentCompany) {
                    for (let i = 0; i < select.options.length; i++) {
                        if (select.options[i].value === currentCompany) {
                            select.selectedIndex = i;
                            break;
                        }
                    }
                }
            }
        });
    }

    // إخفاء بادج الربط وإغلاق المقترحات
    const badge = document.getElementById('opLinkedBadge');
    if (badge) badge.classList.add('d-none');
    const dropdown = document.getElementById('opEmployeeDropdown');
    if (dropdown) dropdown.style.display = 'none';

    if (!isEdit) {
        document.getElementById('operationForm').reset();
        document.getElementById('operationId').value = '';
        document.getElementById('opEmployeeCode').value = '';
        
        // حساب الرقم المسلسل تلقائياً
        const maxSeq = operationsList.reduce((max, op) => Math.max(max, parseInt(op.seqNum, 10) || 0), 0);
        const nextSeq = maxSeq + 1;
        document.getElementById('operationSeqNum').value = nextSeq;

        document.getElementById('operationModalTitle').innerHTML = '<i class="fas fa-plus"></i> إضافة عملية جديدة';
        document.getElementById('opIncomingDate').value = new Date().toISOString().split('T')[0];
    }
}

function closeOperationModal() {
    const modal = document.getElementById('operationModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
    const dropdown = document.getElementById('opEmployeeDropdown');
    if (dropdown) dropdown.style.display = 'none';
}

// البحث والربط التلقائي للموظف
function handleOpEmployeeInput(query) {
    const dropdown = document.getElementById('opEmployeeDropdown');
    const badge = document.getElementById('opLinkedBadge');
    if (!dropdown) return;

    if (!query || !query.trim()) {
        dropdown.style.display = 'none';
        if (badge) badge.classList.add('d-none');
        return;
    }

    const q = query.trim().toLowerCase();
    
    // البحث في الموظفين المخزنين
    const sourceList = opEmployeesCache.length > 0 ? opEmployeesCache : (window.allEmployeesForSearch || []);
    const matches = sourceList.filter(e => 
        (e.name && e.name.toLowerCase().includes(q)) ||
        (e.code && String(e.code).toLowerCase().includes(q)) ||
        (e.nat_id && String(e.nat_id).includes(q))
    );

    // التحقق من التطابق التام للاسم للربط المباشر
    const exactMatch = sourceList.find(e => e.name && e.name.trim() === query.trim());
    if (exactMatch) {
        linkEmployeeToOperation(exactMatch, false);
    } else {
        if (badge) badge.classList.add('d-none');
    }

    if (matches.length === 0) {
        dropdown.style.display = 'none';
        return;
    }

    dropdown.innerHTML = matches.slice(0, 8).map(e => `
        <div class="custom-dropdown-item" onclick="selectOpEmployee('${e.id}')">
            <div class="custom-dropdown-title"><i class="fas fa-user-check" style="color: var(--accent); margin-left: 5px;"></i> ${e.name}</div>
            <div class="custom-dropdown-sub">كود: <b style="color: var(--primary);">${e.code || '-'}</b> | الشركة: ${e.company_name || '-'}</div>
        </div>
    `).join('');
    dropdown.style.display = 'block';
}

function selectOpEmployee(empId) {
    const sourceList = opEmployeesCache.length > 0 ? opEmployeesCache : (window.allEmployeesForSearch || []);
    const emp = sourceList.find(e => e.id === empId);
    if (emp) {
        linkEmployeeToOperation(emp, true);
    }
}

function linkEmployeeToOperation(emp, updateName = true) {
    if (updateName) {
        document.getElementById('opName').value = emp.name;
    }
    
    // ربط كود الطلب بكود الموظف
    if (emp.code) {
        document.getElementById('opRequestCode').value = emp.code;
    }
    
    document.getElementById('opEmployeeCode').value = emp.code || emp.id || '';

    // ربط الشركة تلقائياً إذا كانت مسجلة
    if (emp.company_name) {
        const compSelect = document.getElementById('opCompany');
        if (compSelect) {
            for (let i = 0; i < compSelect.options.length; i++) {
                if (compSelect.options[i].value === emp.company_name) {
                    compSelect.selectedIndex = i;
                    break;
                }
            }
        }
    }

    // إظهار بادج الربط
    const badge = document.getElementById('opLinkedBadge');
    if (badge) {
        badge.innerHTML = `<i class="fas fa-link"></i> كود الموظف: ${emp.code || '-'}`;
        badge.classList.remove('d-none');
    }

    const dropdown = document.getElementById('opEmployeeDropdown');
    if (dropdown) dropdown.style.display = 'none';
}

async function saveOperation(e) {
    if (e) e.preventDefault();
    
    const saveBtn = document.querySelector('#operationForm button[type="submit"]');
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

    const id = document.getElementById('operationId').value;
    let requestCode = document.getElementById('opRequestCode').value.trim();
    const opName = document.getElementById('opName').value.trim();

    // في حال عدم كتابة كود الطلب ولكن الموظف مسجل
    if (!requestCode && opName) {
        const sourceList = opEmployeesCache.length > 0 ? opEmployeesCache : (window.allEmployeesForSearch || []);
        const matchedEmp = sourceList.find(e => e.name && e.name.trim() === opName);
        if (matchedEmp && matchedEmp.code) {
            requestCode = matchedEmp.code;
            document.getElementById('opRequestCode').value = requestCode;
        }
    }

    const data = {
        requestCode: requestCode,
        incomingNum: document.getElementById('opIncomingNum').value.trim(),
        incomingDate: document.getElementById('opIncomingDate').value,
        requestType: document.getElementById('opRequestType').value.trim(),
        status: document.getElementById('opRequestStatus').value,
        company: document.getElementById('opCompany').value,
        name: opName,
        notes: document.getElementById('opNotes').value.trim(),
        employeeCode: document.getElementById('opEmployeeCode') ? document.getElementById('opEmployeeCode').value : ''
    };
    
    // التحقق من تكرار رقم الوارد
    if (data.incomingNum) {
        const isDuplicate = operationsList.some(op => op.incomingNum === data.incomingNum && op.id !== id);
        if (isDuplicate) {
            if(typeof showNotification === 'function') showNotification('رقم الوارد موجود مسبقاً! يرجى التأكد.', 'error');
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
            return;
        }
    }

    // دعم وضع الضيف التجريبي (في الذاكرة فقط)
    if (typeof isGuestMode !== 'undefined' && isGuestMode) {
        if (id) {
            const idx = guestData.operations.findIndex(o => o.id === id);
            if (idx !== -1) {
                guestData.operations[idx] = { ...guestData.operations[idx], ...data, seqNum: parseInt(document.getElementById('operationSeqNum').value, 10) || guestData.operations[idx].seqNum };
            }
            if(typeof showNotification === 'function') showNotification('تم تحديث العملية في الجلسة التجريبية!', 'success');
        } else {
            const maxSeq = guestData.operations.reduce((max, op) => Math.max(max, op.seqNum || 0), 0);
            data.id = 'guest_op_' + Date.now();
            data.seqNum = maxSeq + 1;
            guestData.operations.unshift(data);
            if(typeof showNotification === 'function') showNotification('تمت إضافة العملية في الجلسة التجريبية!', 'success');
        }
        loadOperations();
        closeOperationModal();
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
        return;
    }
    
    try {
        const uid = (typeof getCurrentUserId === 'function') ? getCurrentUserId() : null;
        if (uid) data.userId = uid;

        if (id) {
            data.seqNum = parseInt(document.getElementById('operationSeqNum').value, 10) || 0;
            await db.collection('operations').doc(id).update(data);
            if(typeof showNotification === 'function') showNotification('تم تحديث العملية بنجاح!', 'success');
        } else {
            // توليد رقم مسلسل تلقائي وتأكيده
            let nextSeq = parseInt(document.getElementById('operationSeqNum').value, 10);
            if (!nextSeq) {
                const maxSeq = operationsList.reduce((max, op) => Math.max(max, parseInt(op.seqNum, 10) || 0), 0);
                nextSeq = maxSeq + 1;
            }
            data.seqNum = nextSeq;
            
            await db.collection('operations').add(data);
            if(typeof showNotification === 'function') showNotification('تمت إضافة العملية بنجاح!', 'success');
        }
        closeOperationModal();
    } catch (err) {
        console.error(err);
        if(typeof showNotification === 'function') showNotification('حدث خطأ أثناء الحفظ', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    }
}

function editOperation(id) {
    const op = operationsList.find(o => o.id === id);
    if (!op) return;
    
    document.getElementById('operationId').value = op.id;
    document.getElementById('operationSeqNum').value = op.seqNum || '';
    document.getElementById('opRequestCode').value = op.requestCode || '';
    document.getElementById('opIncomingNum').value = op.incomingNum || '';
    document.getElementById('opIncomingDate').value = op.incomingDate || '';
    document.getElementById('opRequestType').value = op.requestType || '';
    document.getElementById('opRequestStatus').value = op.status || 'انتظار';
    document.getElementById('opCompany').value = op.company || '';
    document.getElementById('opName').value = op.name || '';
    document.getElementById('opNotes').value = op.notes || '';
    document.getElementById('opEmployeeCode').value = op.employeeCode || '';
    
    document.getElementById('operationModalTitle').innerHTML = '<i class="fas fa-edit"></i> تعديل بيانات العملية';
    openOperationModal(true, op.company);

    if (op.employeeCode) {
        const badge = document.getElementById('opLinkedBadge');
        if (badge) {
            badge.innerHTML = `<i class="fas fa-link"></i> كود الموظف: ${op.employeeCode}`;
            badge.classList.remove('d-none');
        }
    }
}

async function deleteOperation(id) {
    if (typeof isGuestMode !== 'undefined' && isGuestMode) {
        guestData.operations = guestData.operations.filter(o => o.id !== id);
        if (typeof showNotification === 'function') showNotification('تم الحذف من الجلسة التجريبية', 'info');
        loadOperations();
        return;
    }

    if (typeof showConfirmDialog === 'function') {
        if (await showConfirmDialog("هل أنت متأكد من حذف هذه العملية؟ لا يمكن التراجع عن هذا الإجراء.")) {
            try {
                await db.collection('operations').doc(id).delete();
                if(typeof showNotification === 'function') showNotification('تم الحذف بنجاح!', 'success');
            } catch (err) {
                console.error(err);
                if(typeof showNotification === 'function') showNotification('حدث خطأ أثناء الحذف', 'error');
            }
        }
    } else {
        if(confirm("هل أنت متأكد من حذف هذه العملية؟")) {
            db.collection('operations').doc(id).delete().then(() => {
                if(typeof showNotification === 'function') showNotification('تم الحذف بنجاح!', 'success');
            }).catch(err => {
                console.error(err);
                if(typeof showNotification === 'function') showNotification('حدث خطأ أثناء الحذف', 'error');
            });
        }
    }
}

function toggleSelectAllOperations() {
    const selectAllCheckbox = document.getElementById('selectAllOperations');
    const checkboxes = document.querySelectorAll('.op-checkbox');
    checkboxes.forEach(cb => cb.checked = selectAllCheckbox.checked);
    toggleOperationSelection();
}

function toggleOperationSelection() {
    const checkboxes = document.querySelectorAll('.op-checkbox');
    const deleteBtn = document.getElementById('btnDeleteSelectedOperations');
    const anyChecked = Array.from(checkboxes).some(cb => cb.checked);
    
    if(deleteBtn) {
        deleteBtn.style.display = anyChecked ? 'inline-flex' : 'none';
        deleteBtn.classList.toggle('d-none', !anyChecked);
    }
    
    const selectAllCheckbox = document.getElementById('selectAllOperations');
    const allChecked = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);
    if(selectAllCheckbox) {
        selectAllCheckbox.checked = allChecked;
    }
}

async function deleteSelectedOperations() {
    const checkboxes = document.querySelectorAll('.op-checkbox:checked');
    if (checkboxes.length === 0) return;
    
    const count = checkboxes.length;
    let confirmDeletion = false;
    if (typeof showConfirmDialog === 'function') {
        confirmDeletion = await showConfirmDialog(`هل أنت متأكد من حذف ${count} عملية؟ لا يمكن التراجع عن هذا الإجراء.`);
    } else {
        confirmDeletion = confirm(`هل أنت متأكد من حذف ${count} عملية؟ لا يمكن التراجع عن هذا الإجراء.`);
    }

    if (confirmDeletion) {
        try {
            const batch = db.batch();
            checkboxes.forEach(cb => {
                const docRef = db.collection('operations').doc(cb.value);
                batch.delete(docRef);
            });
            await batch.commit();
            if(typeof showNotification === 'function') showNotification(`تم حذف ${count} عملية بنجاح!`, 'success');
            
            const deleteBtn = document.getElementById('btnDeleteSelectedOperations');
            if (deleteBtn) {
                deleteBtn.style.display = 'none';
                deleteBtn.classList.add('d-none');
            }
            const selectAllCheckbox = document.getElementById('selectAllOperations');
            if (selectAllCheckbox) selectAllCheckbox.checked = false;
        } catch (err) {
            console.error(err);
            if(typeof showNotification === 'function') showNotification('حدث خطأ أثناء الحذف المتعدد', 'error');
        }
    }
}

function filterOperations() {
    const searchInput = document.getElementById('operationSearch');
    const q = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const filtered = operationsList.filter(op => {
        const matchesSearch = !q || (op.name && op.name.toLowerCase().includes(q)) || 
               (op.company && op.company.toLowerCase().includes(q)) ||
               (op.requestType && op.requestType.toLowerCase().includes(q)) ||
               (op.requestCode && String(op.requestCode).toLowerCase().includes(q)) ||
               (op.incomingNum && String(op.incomingNum).toLowerCase().includes(q));
               
        const matchesTab = (currentOperationFilter === 'الكل') || (op.status === currentOperationFilter);
        
        return matchesSearch && matchesTab;
    });
    renderOperations(filtered);
}

// تصدير العمليات إلى Excel باسم واضح وتاريخ اليوم
function exportOperationsToExcel() {
    try {
        if (typeof XLSX === 'undefined') {
            if(typeof showNotification === 'function') showNotification('مكتبة الإكسيل غير جاهزة حالياً، يرجى إعادة تحميل الصفحة.', 'error');
            return;
        }

        const headers = [
            "م", "كود الطلب", "رقم الوارد", "تاريخ الوارد", "نوع الطلب", "حالة الطلب", "الشركة", "الاسم", "الملاحظات"
        ];

        let data = [];
        if (operationsList && operationsList.length > 0) {
            data = operationsList.map(op => ({
                "م": op.seqNum || '-',
                "كود الطلب": op.requestCode || '-',
                "رقم الوارد": op.incomingNum || '-',
                "تاريخ الوارد": op.incomingDate || '-',
                "نوع الطلب": op.requestType || '-',
                "حالة الطلب": op.status || '-',
                "الشركة": op.company || '-',
                "الاسم": op.name || '-',
                "الملاحظات": op.notes || '-'
            }));
        } else {
            // تصدير ترويسة النموذج حتى لو لم توجد عمليات بعد
            data = [{
                "م": 1,
                "كود الطلب": "101",
                "رقم الوارد": "8472469",
                "تاريخ الوارد": new Date().toISOString().split('T')[0],
                "نوع الطلب": "س1",
                "حالة الطلب": "انتظار",
                "الشركة": "اسم الشركة",
                "الاسم": "اسم الموظف",
                "الملاحظات": "لا توجد عمليات مسجلة حالياً"
            }];
        }

        const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
        formatOperationsSheet(worksheet, 20);
        
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "العمليات");
        
        const todayStr = new Date().toISOString().split('T')[0];
        downloadExcelWorkbook(workbook, `Operations_سجل_العمليات_${todayStr}.xlsx`);
        if(typeof showNotification === 'function') showNotification('تم تصدير ملف العمليات بنجاح!', 'success');
    } catch (error) {
        console.error('Error exporting operations:', error);
        if(typeof showNotification === 'function') showNotification('حدث خطأ أثناء التصدير', 'error');
    }
}

// تحميل نموذج استيراد العمليات فارغ
function downloadOperationsExcelTemplate() {
    try {
        if (typeof XLSX === 'undefined') {
            if(typeof showNotification === 'function') showNotification('مكتبة الإكسيل غير جاهزة حالياً، يرجى إعادة تحميل الصفحة.', 'error');
            return;
        }

        const headers = [
            "كود الطلب", "رقم الوارد", "تاريخ الوارد", "نوع الطلب", "حالة الطلب", "الشركة", "الاسم", "الملاحظات"
        ];
        const templateData = [
            {
                "كود الطلب": "101",
                "رقم الوارد": "8472469",
                "تاريخ الوارد": new Date().toISOString().split('T')[0],
                "نوع الطلب": "س1",
                "حالة الطلب": "انتظار",
                "الشركة": "اسم الشركة",
                "الاسم": "اسم الموظف الرباعي",
                "الملاحظات": "ملاحظات إضافية"
            }
        ];
        const ws = XLSX.utils.json_to_sheet(templateData, { header: headers });
        formatOperationsSheet(ws, 20);
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "نموذج العمليات");
        downloadExcelWorkbook(wb, "Operations_Template_نموذج_العمليات.xlsx");
        if(typeof showNotification === 'function') showNotification('تم تحميل نموذج العمليات بنجاح!', 'success');
    } catch(err) {
        console.error('Error downloading operations template:', err);
        if (typeof showNotification === 'function') showNotification('حدث خطأ أثناء تحميل النموذج', 'error');
    }
}

// استيراد العمليات من Excel
async function importOperationsFromExcel(event) {
    const file = event.target.files[0];
    if (!file) return;

    if(typeof showNotification === 'function') showNotification('جاري قراءة الملف...', 'info');

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { raw: true }); 
            
            if (json.length === 0) {
                if(typeof showNotification === 'function') showNotification("الملف فارغ أو لا يحتوي على بيانات صحيحة!", 'error');
                event.target.value = '';
                return;
            }

            const uid = (typeof getCurrentUserId === 'function') ? getCurrentUserId() : null;
            const isAdmin = (typeof isCurrentUserAdmin === 'function') ? isCurrentUserAdmin() : false;

            let currentSeqNum = operationsList.reduce((max, op) => Math.max(max, parseInt(op.seqNum, 10) || 0), 0);

            let companyNames = [];
            const empMap = {};

            if (typeof isGuestMode !== 'undefined' && isGuestMode) {
                if (guestData && guestData.companies) {
                    companyNames = guestData.companies.map(c => c.name);
                }
                if (guestData && guestData.employees) {
                    guestData.employees.forEach(ed => {
                        if (ed.name) empMap[ed.name.trim()] = ed.code || ed.id;
                    });
                }
            } else {
                let compQuery = db.collection('companies');
                let empQuery = db.collection('employees');
                if (!isAdmin && uid) {
                    compQuery = compQuery.where('userId', '==', uid);
                    empQuery = empQuery.where('userId', '==', uid);
                }
                const [companiesSnapshot, employeesSnapshot] = await Promise.all([
                    compQuery.get(),
                    empQuery.get()
                ]);
                companiesSnapshot.forEach(doc => companyNames.push(doc.data().name));
                employeesSnapshot.forEach(doc => {
                    const ed = doc.data();
                    if (ed.name) empMap[ed.name.trim()] = ed.code || doc.id;
                });
            }

            let successCount = 0;
            let batch = (typeof isGuestMode !== 'undefined' && isGuestMode) ? null : db.batch();
            let batchCount = 0;
            let seenInBatch = new Set();

            for (const row of json) {
                if(!row['الاسم'] && !row['رقم الوارد']) continue;

                const incNum = String(row['رقم الوارد'] || '').trim();
                const rowName = String(row['الاسم'] || '').trim();
                
                let opStatus = String(row['حالة الطلب'] || 'انتظار').trim();
                if (incNum) {
                    const inList = operationsList.some(op => String(op.incomingNum).trim() === incNum);
                    const inBatch = seenInBatch.has(incNum);
                    if (inList || inBatch) {
                        opStatus = 'مكرر';
                    }
                    seenInBatch.add(incNum);
                }
                
                let dateVal = row['تاريخ الوارد'] || '';
                if (typeof dateVal === 'number') {
                    const dateObj = new Date((dateVal - 25569) * 86400 * 1000);
                    dateVal = dateObj.toISOString().split('T')[0];
                } else if (typeof dateVal === 'string') {
                    let dStr = dateVal.replace(/-/g, '/');
                    if (dStr.includes('/')) {
                        let parts = dStr.split('/');
                        if (parts.length === 3) {
                            let p1 = parseInt(parts[0]);
                            let p2 = parseInt(parts[1]);
                            let y = parseInt(parts[2]);
                            if (y < 100) y += 2000;
                            let d = p1, m = p2;
                            if (p1 > 12) { d = p1; m = p2; }
                            else if (p2 > 12) { d = p2; m = p1; }
                            else { d = p1; m = p2; }
                            dateVal = `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
                        }
                    }
                }

                let compName = String(row['الشركة'] || '').trim();
                if (compName) {
                    const exactMatch = companyNames.find(n => n === compName);
                    if (!exactMatch) {
                        const partialMatch = companyNames.find(n => n.includes(compName) || compName.includes(n));
                        if (partialMatch) {
                            compName = partialMatch;
                        }
                    }
                }

                // ربط كود الطلب بكود الموظف إذا لم يكن موجوداً
                let reqCode = String(row['كود الطلب'] || '').trim();
                if (!reqCode && empMap[rowName]) {
                    reqCode = empMap[rowName];
                }

                currentSeqNum++;
                const opData = {
                    seqNum: currentSeqNum,
                    requestCode: reqCode,
                    incomingNum: incNum,
                    incomingDate: dateVal,
                    requestType: String(row['نوع الطلب'] || ''),
                    status: opStatus,
                    company: compName,
                    name: rowName,
                    notes: String(row['الملاحظات'] || ''),
                    employeeCode: empMap[rowName] || ''
                };
                if (uid) opData.userId = uid;
                
                if (typeof isGuestMode !== 'undefined' && isGuestMode) {
                    opData.id = 'guest_op_' + Date.now() + '_' + successCount;
                    guestData.operations.unshift(opData);
                    successCount++;
                } else {
                    const newDocRef = db.collection('operations').doc();
                    batch.set(newDocRef, opData);
                    batchCount++;
                    successCount++;

                    if (batchCount === 500) {
                        await batch.commit();
                        batch = db.batch();
                        batchCount = 0;
                    }
                }
            }

            if (batch && batchCount > 0) {
                await batch.commit();
            }

            if (typeof isGuestMode !== 'undefined' && isGuestMode) {
                loadOperations();
            }

            if(typeof showNotification === 'function') showNotification(`تم استيراد ${successCount} عملية بنجاح!`, 'success');
        } catch (error) {
            console.error('Error importing:', error);
            if(typeof showNotification === 'function') showNotification('حدث خطأ أثناء قراءة الملف. تأكد من تطابق الأعمدة مع النموذج.', 'error');
        } finally {
            event.target.value = '';
        }
    };
    reader.readAsArrayBuffer(file);
}

// إغلاق قائمة مقترحات الموظفين عند النقر خارجها
document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('opEmployeeDropdown');
    if (dropdown && !e.target.closest('#opName') && !e.target.closest('#opEmployeeDropdown')) {
        dropdown.style.display = 'none';
    }
});

let initAttempts = 0;
function initOperations() {
    if (typeof db !== 'undefined') {
        loadOperations();
    } else {
        if(initAttempts < 10) {
            initAttempts++;
            setTimeout(initOperations, 500);
        } else {
            console.error("Failed to initialize operations: db is not defined.");
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initOperations();
});
