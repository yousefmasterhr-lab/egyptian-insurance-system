// ==========================================================================
// نظام إدارة التأمينات المتكامل - ملف السكربت الرئيسي (script.js)
// ==========================================================================

// دالة تحويل الأرقام الإنجليزية إلى أرقام عربية مشرقية (٠-٩)
function toArabicDigits(str) {
    if (str === null || str === undefined) return '';
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return String(str).replace(/[0-9]/g, w => arabicDigits[+w]);
}
window.toArabicDigits = toArabicDigits;

// دالة التعريب الذكي للأرقام المعروضة في واجهة المستخدم (مع الحفاظ الصارم على الاستمارة الورقية A4 وبياناتها الهندسية)
function localizeUINumbers(root = document.body) {
    if (!root) return;
    const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function(node) {
                if (!node.nodeValue || !/[0-9]/.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                // استثناء الاستمارة الورقية A4 وحقوق الملكية والأرقام الإنجليزية
                if (parent.closest('.overlay-input') || 
                    parent.closest('.a4-page') || 
                    parent.closest('.a4-page-back') || 
                    parent.closest('.a4-page-s6') || 
                    parent.closest('.a4-page-s6-back') || 
                    parent.closest('.code-output-textarea') ||
                    parent.closest('.welcome-copyright-footer') ||
                    parent.closest('.page-copyright-footer') ||
                    parent.closest('.en-digits') ||
                    parent.tagName === 'SCRIPT' || 
                    parent.tagName === 'STYLE') {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );
    let node;
    while ((node = walker.nextNode())) {
        node.nodeValue = toArabicDigits(node.nodeValue);
    }
}
window.localizeUINumbers = localizeUINumbers;

// تفعيل تعريب الأرقام تلقائياً عند تحميل الصفحة وتحديث الواجهة
document.addEventListener('DOMContentLoaded', () => {
    localizeUINumbers();
    setTimeout(localizeUINumbers, 300);
    setTimeout(localizeUINumbers, 1000);
});

// مراقب التحديثات التلقائي لجداول وبطاقات الواجهة
let _locTimeout = null;
const uiObserver = new MutationObserver((mutations) => {
    let shouldLocalize = false;
    for (const m of mutations) {
        if (m.target && !m.target.closest?.('.overlay-input') && !m.target.closest?.('.a4-page') && !m.target.closest?.('.a4-page-back') && !m.target.closest?.('.a4-page-s6') && !m.target.closest?.('.a4-page-s6-back')) {
            shouldLocalize = true;
            break;
        }
    }
    if (shouldLocalize) {
        clearTimeout(_locTimeout);
        _locTimeout = setTimeout(localizeUINumbers, 150);
    }
});

if (document.body) {
    uiObserver.observe(document.body, { childList: true, subtree: true, characterData: false });
} else {
    document.addEventListener('DOMContentLoaded', () => {
        uiObserver.observe(document.body, { childList: true, subtree: true, characterData: false });
    });
}

// --- متغيرات وضع تعديل وتصميم الاستمارة ---
let isSettingsMode = false;
let draggedInput = null;
let resizingInput = null;
let resizingCorner = null;
let startX, startY, initialRight, initialTop, initialWidth, initialHeight;
let activeInputForDelete = null;

// زر الحذف العائم لخانات الاستمارة في وضع الإعدادات
const deleteBtn = document.createElement('button');
deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
deleteBtn.className = 'overlay-delete-btn no-print';
deleteBtn.style.display = 'none';
deleteBtn.title = 'حذف هذه الخانة';
document.body.appendChild(deleteBtn);

function updateDeleteBtnPosition() {
    if (!activeInputForDelete || !isSettingsMode) {
        deleteBtn.style.display = 'none';
        return;
    }
    const rect = activeInputForDelete.getBoundingClientRect();
    deleteBtn.style.top = (rect.top - 12) + 'px';
    deleteBtn.style.left = (rect.left - 12) + 'px';
}

deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isSettingsMode && activeInputForDelete) {
        activeInputForDelete.remove();
        deleteBtn.style.display = 'none';
        activeInputForDelete = null;
        showNotification('تم حذف الخانة بنجاح', 'info');
    }
});

function updateGridSpacing(input) {
    if (input.id.includes('phone')) return;
    if (input.id.includes('wage')) return;
    if (input.hasAttribute('maxlength')) {
        const maxLen = parseInt(input.getAttribute('maxlength'), 10);
        if (maxLen > 1) {
            const width = parseFloat(input.style.width);
            if (!width) return;
            const cellWidth = width / maxLen;
            input.style.fontFamily = 'monospace';
            input.style.direction = 'ltr';
            input.style.textAlign = 'right';
            input.style.marginRight = '0px';
            input.style.paddingRight = '0px';
            input.style.paddingLeft = '0px';
            input.style.textIndent = '2px';
            input.style.letterSpacing = `calc(${cellWidth}px - 1ch)`;
        }
    }
}

document.querySelectorAll('.overlay-input').forEach(input => {
    input.readOnly = false;
    input.style.cursor = 'text';
});

document.addEventListener('mousedown', (e) => {
    if (!isSettingsMode) {
        if (deleteBtn) deleteBtn.style.display = 'none';
        activeInputForDelete = null;
        return;
    }
    
    if (e.target.classList.contains('overlay-input')) {
        const input = e.target;
        const rect = input.getBoundingClientRect();
        const isBottom = (rect.bottom - e.clientY) < 20;
        const isLeftCorner = (e.clientX - rect.left) < 20;
        const isRightCorner = (rect.right - e.clientX) < 20;

        e.preventDefault();
        startX = e.clientX;
        startY = e.clientY;
        initialRight = parseInt(getComputedStyle(input).right, 10) || 0;
        initialTop = parseInt(getComputedStyle(input).top, 10) || 0;
        initialWidth = rect.width;
        initialHeight = rect.height;

        activeInputForDelete = input;
        updateDeleteBtnPosition();
        deleteBtn.style.display = 'flex';

        if (isBottom && (isLeftCorner || isRightCorner)) {
            resizingInput = input;
            resizingCorner = isLeftCorner ? 'left' : 'right';
            input.style.cursor = isLeftCorner ? 'nesw-resize' : 'nwse-resize';
            return;
        }

        draggedInput = input;
        input.style.cursor = 'move';
    } else if (e.target !== deleteBtn && !deleteBtn.contains(e.target)) {
        deleteBtn.style.display = 'none';
        activeInputForDelete = null;
    }
});

document.addEventListener('mousemove', (e) => {
    if (resizingInput) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        resizingInput.style.height = Math.max(10, initialHeight + dy) + 'px';
        if (resizingCorner === 'right') {
            resizingInput.style.right = (initialRight - dx) + 'px';
            resizingInput.style.width = Math.max(10, initialWidth + dx) + 'px';
        } else {
            resizingInput.style.width = Math.max(10, initialWidth - dx) + 'px';
        }
        updateGridSpacing(resizingInput);
        updateDeleteBtnPosition();
    } else if (draggedInput) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        draggedInput.style.right = (initialRight - dx) + 'px';
        draggedInput.style.top = (initialTop + dy) + 'px';
        updateDeleteBtnPosition();
    }
});

document.addEventListener('mouseup', () => {
    if (resizingInput) {
        resizingInput.style.cursor = 'move';
        resizingInput = null;
    }
    draggedInput = null;
});

function createNewInput() {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'custom_' + Date.now();
    input.className = 'overlay-input';
    input.style.top = '100px';
    input.style.right = '100px';
    input.style.width = '120px';
    input.style.height = '25px';
    input.value = "حقل جديد";
    input.readOnly = true;

    const activeContainer = (window.currentActiveForm === 's6')
        ? document.querySelector('.a4-page-s6')
        : document.querySelector('.a4-page');

    if (activeContainer) {
        activeContainer.appendChild(input);
        showNotification('تمت إضافة حقل جديد بنجاح', 'success');
    }
}

function saveCoordinates() {
    const inputs = document.querySelectorAll('.overlay-input');
    let code = '';
    inputs.forEach(input => {
        const maxLenAttr = input.hasAttribute('maxlength') ? ` maxlength="${input.getAttribute('maxlength')}"` : '';
        const style = `style="top: ${input.style.top}; right: ${input.style.right}; width: ${input.style.width};` + 
                     (input.style.height ? ` height: ${input.style.height};` : ``) + 
                     (input.style.letterSpacing ? ` letter-spacing: ${input.style.letterSpacing}; padding-right: ${input.style.paddingRight}; font-family: monospace; font-size: 16px;` : ``) +
                     (input.style.textAlign === 'center' ? ` text-align: center; font-size: 16px;` : ``) +
                     `"`;
        code += `<input type="text" id="${input.id}"\n    class="overlay-input"${maxLenAttr}\n    ${style}\n    value="">\n`;
    });
    
    const output = document.getElementById('output_code');
    if (output) output.value = code;
    const modal = document.getElementById('codeModal');
    if (modal) modal.style.display = 'flex';
    showNotification("تم استخراج التنسيقات بنجاح! يمكنك الآن نسخها.", 'success');
}

function closeCodeModal() {
    const modal = document.getElementById('codeModal');
    if (modal) modal.style.display = 'none';
}

function copyCodeToClipboard() {
    const output = document.getElementById('output_code');
    if (output) {
        output.select();
        document.execCommand('copy');
        showNotification("تم نسخ الكود بنجاح!", 'success');
    }
}

// ==========================================
// إعداد وتهيئة Firebase
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyCYPIYaARLDCwhLpWupXTho2cTithSm4s8",
  authDomain: "insurance-app-sheets.firebaseapp.com",
  projectId: "insurance-app-sheets",
  storageBucket: "insurance-app-sheets.firebasestorage.app",
  messagingSenderId: "162284817037",
  appId: "1:162284817037:web:ed08b10c21bc6cb505b0c4",
  measurementId: "G-350F9BK5PK"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

// ==========================================
// أوضاع شاشة الاستمارات (Form Mode: Print / Settings)
// ==========================================
function switchFormMode(mode) {
    const btnSettings = document.getElementById('tab-btn-settings');
    const btnPrint = document.getElementById('tab-btn-print');
    const settingsActions = document.getElementById('settings-actions');
    const printActions = document.getElementById('print-actions');
    const inputs = document.querySelectorAll('.overlay-input');

    if (mode === 'settings') {
        isSettingsMode = true;
        if(btnSettings) {
            btnSettings.classList.add('active');
            btnSettings.style.color = 'var(--accent)';
            btnSettings.style.boxShadow = 'var(--inset-shadow)';
        }
        if(btnPrint) {
            btnPrint.classList.remove('active');
            btnPrint.style.color = '';
            btnPrint.style.boxShadow = '';
        }
        if(settingsActions) {
            settingsActions.style.display = 'flex';
            settingsActions.classList.remove('d-none');
        }
        if(printActions) {
            printActions.style.display = 'none';
        }
        inputs.forEach(input => {
            input.style.cursor = 'move';
            input.style.pointerEvents = 'auto';
            input.style.border = '1px dashed rgba(78,84,200,0.5)';
        });
        showNotification('تم تفعيل وضع تعديل الإحداثيات', 'info');
    } else if (mode === 'print') {
        isSettingsMode = false;
        if(btnPrint) {
            btnPrint.classList.add('active');
            btnPrint.style.color = 'var(--accent)';
            btnPrint.style.boxShadow = 'var(--inset-shadow)';
        }
        if(btnSettings) {
            btnSettings.classList.remove('active');
            btnSettings.style.color = '';
            btnSettings.style.boxShadow = '';
        }
        if(settingsActions) {
            settingsActions.style.display = 'none';
        }
        if(printActions) {
            printActions.style.display = 'flex';
        }
        inputs.forEach(input => {
            input.style.cursor = 'default';
            input.style.pointerEvents = 'auto';
            input.style.border = '1px solid transparent';
        });
        if (typeof deleteBtn !== 'undefined' && deleteBtn) deleteBtn.style.display = 'none';
        if (typeof activeInputForDelete !== 'undefined') activeInputForDelete = null;
    }
}

// ==========================================
// التنقل بين الشاشات (View Switching)
// ==========================================
function switchView(viewId) {
    document.querySelectorAll('.app-view').forEach(view => {
        view.classList.remove('active-view');
    });
    const viewEl = document.getElementById(viewId);
    if(viewEl) viewEl.classList.add('active-view');

    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.remove('active-nav');
    });
    
    const activeNav = Array.from(document.querySelectorAll('.nav-item')).find(el => el.getAttribute('onclick') && el.getAttribute('onclick').includes(viewId));
    if(activeNav) activeNav.classList.add('active-nav');

    const floatingBar = document.getElementById('floating-action-bar');
    if (floatingBar) {
        if (viewId === 'form-hub-view') {
            floatingBar.classList.remove('d-none');
            floatingBar.style.display = 'inline-flex';
        } else {
            floatingBar.classList.add('d-none');
            floatingBar.style.display = 'none';
        }
    }

    if(viewId === 'companies-view' || viewId === 'employees-view' || viewId === 'settings-view' || viewId === 'operations-view' || viewId === 'dashboard-view') {
        switchFormMode('print');
    }

    if (viewId === 'dashboard-view') {
        if (typeof initDashboard === 'function') {
            initDashboard();
        } else if (typeof updateDashboardAnalytics === 'function') {
            updateDashboardAnalytics();
        }
        loadCompanies();
        loadEmployees();
        if (typeof loadOperations === 'function') loadOperations();
    } else if (viewId === 'employees-view') {
        loadCompanies();
        loadEmployees();
    } else if (viewId === 'companies-view') {
        loadCompaniesGrid();
    } else if (viewId === 'operations-view' && typeof loadOperations === 'function') {
        const opSearch = document.getElementById('operationSearch');
        if (opSearch && !window._keepOpSearch) {
            opSearch.value = '';
        }
        window._keepOpSearch = false;
        loadOperations();
    }
}

async function loadCompanies() {
    const filter = document.getElementById('company-filter');
    if(!filter) return;

    if (typeof isGuestMode !== 'undefined' && isGuestMode) {
        filter.innerHTML = '<option value="">جميع الشركات</option>';
        if (guestData && guestData.companies) {
            guestData.companies.forEach(comp => {
                filter.innerHTML += `<option value="${comp.id}">${comp.name || comp.id}</option>`;
            });
        }
        return;
    }

    try {
        const uid = (typeof getCurrentUserId === 'function') ? getCurrentUserId() : null;
        const isAdmin = (typeof isCurrentUserAdmin === 'function') ? isCurrentUserAdmin() : false;
        let query = db.collection('companies');
        if (!isAdmin && uid) {
            query = query.where('userId', '==', uid);
        }
        const snapshot = await query.get();
        filter.innerHTML = '<option value="">جميع الشركات</option>';
        snapshot.forEach(doc => {
            const data = doc.data();
            filter.innerHTML += `<option value="${doc.id}">${data.name || doc.id}</option>`;
        });
    } catch (e) {
        console.log("Error loading companies: ", e);
    }
}

document.getElementById('company-filter')?.addEventListener('change', loadEmployees);

async function loadEmployees() {
    if (typeof loadEmployeesGrid === 'function') {
        return loadEmployeesGrid();
    }
}

// ==========================================
// إدارة الشركات (Companies Logic)
// ==========================================
async function openCompanyModal(id = null) {
    document.getElementById('companyModal').style.display = 'flex';
    document.getElementById('companyForm').reset();
    document.getElementById('companyId').value = '';

    if(id) {
        document.getElementById('companyModalTitle').innerText = 'تعديل بيانات الشركة';
        if (typeof isGuestMode !== 'undefined' && isGuestMode) {
            const comp = guestData.companies.find(c => c.id === id);
            if (comp) {
                populateCompanyFormFields(comp);
            }
            return;
        }

        try {
            const doc = await db.collection('companies').doc(id).get();
            if(doc.exists) {
                populateCompanyFormFields(doc.data(), doc.id);
            }
        } catch(err) {
            console.error("Error getting company: ", err);
        }
    } else {
        document.getElementById('companyModalTitle').innerText = 'إضافة شركة جديدة';
    }
}

function populateCompanyFormFields(data, id = null) {
    if (id) document.getElementById('companyId').value = id;
    document.getElementById('companyName').value = data.name || '';
    document.getElementById('companyManager').value = data.manager || '';
    document.getElementById('companyInsNum').value = data.ins_num || '';
    if(document.getElementById('companyCode')) document.getElementById('companyCode').value = data.code || '';
    if(document.getElementById('companyLegalEntity')) document.getElementById('companyLegalEntity').value = data.legal_entity || '';
    if(document.getElementById('companyCommReg')) document.getElementById('companyCommReg').value = data.comm_reg || '';
    if(document.getElementById('companyTaxCard')) document.getElementById('companyTaxCard').value = data.tax_card || '';
    if(document.getElementById('companyOffice')) document.getElementById('companyOffice').value = data.office_name || '';
    if(document.getElementById('companyAddress')) document.getElementById('companyAddress').value = data.address || '';
    if(document.getElementById('companyFacNum')) document.getElementById('companyFacNum').value = data.fac_number || '';
    if(document.getElementById('companyFacType')) document.getElementById('companyFacType').value = data.fac_type || '';
    document.getElementById('companyManagerTitle').value = data.manager_title || '';
    document.getElementById('companyManagerNatId').value = data.manager_nat_id || '';
    document.getElementById('companyManagerInsNum').value = data.manager_ins_num || '';
    document.getElementById('companyManagerPhone').value = data.manager_phone || '';
    document.getElementById('agentName').value = data.agent_name || '';
    document.getElementById('agentTitle').value = data.agent_title || '';
    document.getElementById('agentNatId').value = data.agent_nat_id || '';
    document.getElementById('agentInsNum').value = data.agent_ins_num || '';
    document.getElementById('agentPhone').value = data.agent_phone || '';
}

function closeCompanyModal() {
    document.getElementById('companyModal').style.display = 'none';
}

async function saveCompany(e) {
    e.preventDefault();
    const id = document.getElementById('companyId').value;
    const name = document.getElementById('companyName').value;
    const manager = document.getElementById('companyManager').value;
    const ins_num = document.getElementById('companyInsNum').value;
    const code = document.getElementById('companyCode') ? document.getElementById('companyCode').value : '';
    const legal_entity = document.getElementById('companyLegalEntity') ? document.getElementById('companyLegalEntity').value : '';
    const comm_reg = document.getElementById('companyCommReg') ? document.getElementById('companyCommReg').value : '';
    const tax_card = document.getElementById('companyTaxCard') ? document.getElementById('companyTaxCard').value : '';
    const office_name = document.getElementById('companyOffice') ? document.getElementById('companyOffice').value : '';
    const address = document.getElementById('companyAddress') ? document.getElementById('companyAddress').value : '';
    const fac_number = document.getElementById('companyFacNum') ? document.getElementById('companyFacNum').value : '';
    const fac_type = document.getElementById('companyFacType') ? document.getElementById('companyFacType').value : '';
    const manager_title = document.getElementById('companyManagerTitle') ? document.getElementById('companyManagerTitle').value : '';
    const manager_nat_id = document.getElementById('companyManagerNatId') ? document.getElementById('companyManagerNatId').value : '';
    const manager_ins_num = document.getElementById('companyManagerInsNum') ? document.getElementById('companyManagerInsNum').value : '';
    const manager_phone = document.getElementById('companyManagerPhone') ? document.getElementById('companyManagerPhone').value : '';
    const agent_name = document.getElementById('agentName') ? document.getElementById('agentName').value : '';
    const agent_title = document.getElementById('agentTitle') ? document.getElementById('agentTitle').value : '';
    const agent_nat_id = document.getElementById('agentNatId') ? document.getElementById('agentNatId').value : '';
    const agent_ins_num = document.getElementById('agentInsNum') ? document.getElementById('agentInsNum').value : '';
    const agent_phone = document.getElementById('agentPhone') ? document.getElementById('agentPhone').value : '';

    const data = { name, manager, ins_num, code, legal_entity, comm_reg, tax_card, office_name, address, fac_number, fac_type, manager_title, manager_nat_id, manager_ins_num, manager_phone, agent_name, agent_title, agent_nat_id, agent_ins_num, agent_phone };
    
    // دعم وضع الضيف التجريبي (في الذاكرة فقط)
    if (typeof isGuestMode !== 'undefined' && isGuestMode) {
        if (id) {
            const idx = guestData.companies.findIndex(c => c.id === id);
            if (idx !== -1) {
                guestData.companies[idx] = { ...guestData.companies[idx], ...data };
            }
            showNotification('تم تحديث الشركة في الجلسة التجريبية!', 'success');
        } else {
            data.id = 'guest_comp_' + Date.now();
            guestData.companies.push(data);
            showNotification('تمت إضافة الشركة في الجلسة التجريبية!', 'success');
        }
        closeCompanyModal();
        loadCompaniesGrid();
        loadCompanies();
        loadSearchData();
        return;
    }

    try {
        const uid = (typeof getCurrentUserId === 'function') ? getCurrentUserId() : null;
        if (uid) data.userId = uid;

        if (data.agent_nat_id && (data.agent_nat_id.length !== 14 || isNaN(data.agent_nat_id))) {
            showNotification('الرقم القومي للمفوض غير صالح، يجب أن يتكون من 14 رقماً!', 'error');
            return;
        }
        
        if (data.ins_num) {
            if (data.ins_num.length < 5) {
                showNotification('الرقم التأميني غير صالح، يجب أن يكون 5 أرقام أو أكثر!', 'error');
                return;
            }
            let existQuery = db.collection('companies').where('ins_num', '==', data.ins_num);
            if (!isCurrentUserAdmin() && uid) {
                existQuery = existQuery.where('userId', '==', uid);
            }
            const existing = await existQuery.get();
            let isDuplicate = false;
            existing.forEach(doc => {
                if (doc.id !== id) isDuplicate = true;
            });
            if (isDuplicate) {
                showNotification('هذا الرقم التأميني مسجل مسبقاً لشركة أخرى!', 'error');
                return;
            }
        }
        
        if (data.code) {
            let codeQuery = db.collection('companies').where('code', '==', data.code);
            if (!isCurrentUserAdmin() && uid) {
                codeQuery = codeQuery.where('userId', '==', uid);
            }
            const existingCode = await codeQuery.get();
            let isDuplicate = false;
            existingCode.forEach(doc => {
                if (doc.id !== id) isDuplicate = true;
            });
            if (isDuplicate) {
                showNotification('هذا الكود مسجل مسبقاً لشركة أخرى!', 'error');
                return;
            }
        }

        if(id) {
            await db.collection('companies').doc(id).update(data);
            showNotification('تم تحديث بيانات الشركة بنجاح!', 'success');
        } else {
            await db.collection('companies').add(data);
            showNotification('تمت إضافة الشركة بنجاح!', 'success');
        }
        closeCompanyModal();
        loadCompaniesGrid();
        loadCompanies();
        loadSearchData();
    } catch(err) {
        console.error("Error saving company: ", err);
        showNotification('حدث خطأ أثناء حفظ الشركة. تأكد من الاتصال بقاعدة البيانات.', 'error');
    }
}

async function deleteCompany(id) {
    if(await showConfirmDialog('هل أنت متأكد من حذف هذه الشركة؟ سيتم حذف جميع الموظفين التابعين لها لاحقاً!')) {
        if (typeof isGuestMode !== 'undefined' && isGuestMode) {
            guestData.companies = guestData.companies.filter(c => c.id !== id);
            guestData.employees = guestData.employees.filter(e => e.company_id !== id);
            showNotification('تم الحذف من الجلسة التجريبية!', 'success');
            loadCompaniesGrid();
            loadCompanies();
            loadSearchData();
            return;
        }

        db.collection('companies').doc(id).delete().then(() => {
            showNotification('تم الحذف بنجاح!', 'success');
            loadCompaniesGrid();
            loadCompanies();
            loadSearchData();
        });
    }
}

async function loadCompaniesGrid() {
    const grid = document.getElementById('companiesGrid');
    if(!grid) return;

    if (typeof isGuestMode !== 'undefined' && isGuestMode) {
        window.companiesData = (guestData && guestData.companies) ? guestData.companies : [];
        if (typeof updateDashboardAnalytics === 'function') updateDashboardAnalytics();
        if (typeof populateDashboardCompanyFilter === 'function') populateDashboardCompanyFilter();

        grid.innerHTML = '';
        if (!guestData || !guestData.companies || guestData.companies.length === 0) {
            grid.innerHTML = `<div class="empty-state-card">
                                <i class="fas fa-folder-open"></i>
                                <p>لا يوجد شركات مضافة حالياً في الجلسة التجريبية.</p>
                              </div>`;
            return;
        }
        guestData.companies.forEach(doc => {
            renderCompanyCard(grid, doc, doc.id);
        });
        return;
    }

    try {
        const uid = (typeof getCurrentUserId === 'function') ? getCurrentUserId() : null;
        const isAdmin = (typeof isCurrentUserAdmin === 'function') ? isCurrentUserAdmin() : false;
        let query = db.collection('companies');
        if (!isAdmin && uid) {
            query = query.where('userId', '==', uid);
        }
        const snapshot = await query.get();
        window.companiesData = [];
        grid.innerHTML = '';
        if(snapshot.empty) {
            grid.innerHTML = `<div class="empty-state-card">
                                <i class="fas fa-folder-open"></i>
                                <p>لا يوجد شركات مضافة حالياً.</p>
                              </div>`;
            if (typeof updateDashboardAnalytics === 'function') updateDashboardAnalytics();
            if (typeof populateDashboardCompanyFilter === 'function') populateDashboardCompanyFilter();
            return;
        }
        snapshot.forEach(doc => {
            const data = doc.data();
            window.companiesData.push({ id: doc.id, ...data });
            renderCompanyCard(grid, data, doc.id);
        });
        if (typeof updateDashboardAnalytics === 'function') updateDashboardAnalytics();
        if (typeof populateDashboardCompanyFilter === 'function') populateDashboardCompanyFilter();
    } catch(err) {
        console.error('Error loading companies:', err);
    }
}

function renderCompanyCard(grid, data, id) {
    const card = document.createElement('div');
    card.className = 'pro-card';
    card.onclick = () => viewCompanyDetails(id);
    card.innerHTML = `
        <div class="pro-card-inner">
            <div class="pro-card-header">
                <div class="pro-avatar">
                    <i class="fas fa-building"></i>
                </div>
                <div class="pro-info">
                    <h3>${data.name || 'بدون اسم'}</h3>
                </div>
                <div class="pro-actions">
                    <button class="neu-btn card-actions-btn" onclick="event.stopPropagation(); openCompanyModal('${id}')" title="تعديل"><i class="fas fa-pen" style="color: var(--accent);"></i></button>
                    <button class="neu-btn card-actions-btn" onclick="event.stopPropagation(); deleteCompany('${id}')" title="حذف"><i class="fas fa-trash" style="color: #e53e3e;"></i></button>
                </div>
            </div>
            
            <div class="pro-divider"></div>

            <div class="pro-details">
                <div class="pro-detail-item">
                    <span class="pro-label"><i class="fas fa-hashtag"></i> رقم التأمينات</span>
                    <span class="pro-value highlight">${data.ins_num || '-'}</span>
                </div>
                <div class="pro-detail-item">
                    <span class="pro-label"><i class="fas fa-id-badge"></i> كود الشركة</span>
                    <span class="pro-value" style="color: var(--accent);">${data.code || data.fac_number || '-'}</span>
                </div>
                <div class="pro-detail-item">
                    <span class="pro-label"><i class="fas fa-layer-group"></i> نوع المنشأة</span>
                    <span class="pro-value">${data.fac_type == '1' ? 'نمطي' : data.fac_type == '2' ? 'سيارة' : data.fac_type == '3' ? 'مركب صيد' : data.fac_type == '4' ? 'مخابز بلدية' : '-'}</span>
                </div>
                <div class="pro-detail-item">
                    <span class="pro-label"><i class="fas fa-user-tie"></i> المدير المسؤول</span>
                    <span class="pro-value">${data.manager || '-'}</span>
                </div>
                <div class="pro-detail-item full-width">
                    <span class="pro-label"><i class="fas fa-map-marker-alt"></i> اسم المكتب</span>
                    <span class="pro-value">${data.office_name || '-'}</span>
                </div>
            </div>
        </div>
    `;
    grid.appendChild(card);
}

function renderCompanyDetailsModal(data, id) {
    const attachments = data.attachments || [];
    
    let attachmentsHTML = '<div class="attachments-grid">';
    if (attachments.length > 0) {
        attachments.forEach((att, index) => {
            attachmentsHTML += `
                <div class="attachment-item">
                    <button onclick="deleteAttachment('${id}', ${index})" class="attachment-delete-btn">&times;</button>
                    <a href="${att.url}" target="_blank">
                        <i class="fas fa-file-alt"></i>
                        <div title="${att.name}">${att.name}</div>
                    </a>
                </div>
            `;
        });
    } else {
        attachmentsHTML += '<div class="no-attachments-msg">لا يوجد ملفات مرفوعة</div>';
    }
    attachmentsHTML += '</div>';

    document.getElementById('detailsBody').innerHTML = `
        <div class="modal-company-title-wrap">
            <h3><i class="fas fa-building"></i> ${data.name || '-'}</h3>
        </div>
        <div class="company-details-grid">
            <div>
                <span class="detail-subtitle">كود الشركة</span>
                <strong class="detail-val-accent">${data.code || '-'}</strong>
            </div>
            <div>
                <span class="detail-subtitle">المدير المسؤول</span>
                <strong class="detail-val">${data.manager || '-'}</strong>
            </div>
            <div>
                <span class="detail-subtitle">رقم التأمينات</span>
                <strong class="detail-val">${data.ins_num || '-'}</strong>
            </div>
            <div>
                <span class="detail-subtitle">رقم المنشأة</span>
                <strong class="detail-val">${data.fac_number || '-'}</strong>
            </div>
            <div>
                <span class="detail-subtitle">نوع المنشأة</span>
                <strong class="detail-val">${data.fac_type == '1' ? 'نمطي' : data.fac_type == '2' ? 'سيارة' : data.fac_type == '3' ? 'مركب صيد' : data.fac_type == '4' ? 'مخابز بلدية' : '-'}</strong>
            </div>
            <div>
                <span class="detail-subtitle">الكيان القانوني</span>
                <strong class="detail-val">${data.legal_entity || '-'}</strong>
            </div>
            <div>
                <span class="detail-subtitle">السجل التجاري</span>
                <strong class="detail-val">${data.comm_reg || '-'}</strong>
            </div>
            <div>
                <span class="detail-subtitle">البطاقة الضريبية</span>
                <strong class="detail-val">${data.tax_card || '-'}</strong>
            </div>
            <div style="grid-column: 1 / -1;">
                <span class="detail-subtitle">العنوان</span>
                <strong class="detail-val">${data.address || '-'}</strong>
            </div>
        </div>

        <!-- Agent Section -->
        <div class="agent-details-box">
            <h4><i class="fas fa-user-tie"></i> بيانات المفوض / الموكل</h4>
            <div class="agent-details-grid">
                <div>
                    <span class="detail-subtitle">اسم المفوض</span>
                    <strong class="detail-val">${data.agent_name || '-'}</strong>
                </div>
                <div>
                    <span class="detail-subtitle">صفته</span>
                    <strong class="detail-val">${data.agent_title || '-'}</strong>
                </div>
                <div>
                    <span class="detail-subtitle">الرقم القومي</span>
                    <strong class="detail-val">${data.agent_nat_id || '-'}</strong>
                </div>
                <div>
                    <span class="detail-subtitle">الرقم التأميني</span>
                    <strong class="detail-val">${data.agent_ins_num || '-'}</strong>
                </div>
                <div style="grid-column: 1 / -1;">
                    <span class="detail-subtitle">الهاتف</span>
                    <strong class="detail-val">${data.agent_phone || '-'}</strong>
                </div>
            </div>
        </div>

        <div class="attachments-section-box">
            <div class="attachments-header">
                <h4><i class="fas fa-paperclip"></i> المرفقات</h4>
                <button onclick="toggleUploadForm()" class="neu-btn btn-pill">
                    <i class="fas fa-plus"></i> إضافة ملف
                </button>
            </div>
            
            <div id="uploadFormContainer" class="upload-form-box">
                <div class="upload-form-flex">
                    <input type="text" id="newAttachmentName" placeholder="تسمية الملف (مثال: سجل تجاري)" class="neu-input">
                    <input type="text" id="newAttachmentFile" placeholder="ضع رابط الملف هنا (مثال: رابط من جوجل درايف)" class="neu-input">
                    <button id="uploadAttachmentBtn" onclick="uploadCompanyAttachment('${id}')" class="neu-btn neu-btn-primary">حفظ الرابط</button>
                </div>
            </div>

            ${attachmentsHTML}
        </div>

        <div class="modal-footer-action">
            <button class="neu-btn neu-btn-primary btn-full-edit" onclick="closeCompanyDetailsModal(); openCompanyModal('${id}')">
                <i class="fas fa-edit"></i> تعديل البيانات
            </button>
        </div>
    `;
}

async function viewCompanyDetails(id) {
    document.getElementById('companyDetailsModal').style.display = 'flex';
    document.getElementById('detailsBody').innerHTML = '<div class="loading-spinner-box"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';
    
    // فحص وضع الزائر / الوضع التجريبي
    if (typeof isGuestMode !== 'undefined' && isGuestMode) {
        let comp = null;
        if (typeof guestData !== 'undefined' && guestData && guestData.companies) {
            comp = guestData.companies.find(c => c.id === id);
        }
        if (!comp && typeof currentCompanies !== 'undefined' && currentCompanies) {
            comp = currentCompanies.find(c => c.id === id);
        }
        if (comp) {
            renderCompanyDetailsModal(comp, id);
        } else {
            document.getElementById('detailsBody').innerHTML = '<div style="color:red; text-align:center; padding: 20px;">لم يتم العثور على بيانات الشركة</div>';
        }
        return;
    }

    try {
        const doc = await db.collection('companies').doc(id).get();
        if (doc.exists) {
            renderCompanyDetailsModal(doc.data(), doc.id);
        } else {
            document.getElementById('detailsBody').innerHTML = '<div style="color:red; text-align:center; padding: 20px;">لم يتم العثور على بيانات الشركة</div>';
        }
    } catch(err) {
        document.getElementById('detailsBody').innerHTML = '<div style="color:red; text-align:center; padding: 20px;">حدث خطأ في جلب البيانات</div>';
    }
}

function closeCompanyDetailsModal() {
    document.getElementById('companyDetailsModal').style.display = 'none';
}

async function uploadCompanyAttachment(companyId) {
    const linkInput = document.getElementById('newAttachmentFile');
    const nameInput = document.getElementById('newAttachmentName');
    
    const url = linkInput.value.trim();
    if (!url) {
        showNotification("الرجاء وضع رابط الملف (مثال: رابط جوجل درايف)!", 'error');
        return;
    }
    const name = nameInput.value.trim();
    if (!name) {
        showNotification("الرجاء كتابة اسم/وصف للملف!", 'error');
        return;
    }

    const uploadBtn = document.getElementById('uploadAttachmentBtn');
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
    uploadBtn.disabled = true;

    try {
        const docRef = db.collection('companies').doc(companyId);
        const docSnap = await docRef.get();
        let attachments = [];
        if (docSnap.exists && docSnap.data().attachments) {
            attachments = docSnap.data().attachments;
        }
        
        attachments.push({ name: name, url: url, uploadedAt: new Date().toISOString() });
        await docRef.update({ attachments: attachments });
        
        showNotification("تم ربط الملف بنجاح!", 'success');
        viewCompanyDetails(companyId);
    } catch (err) {
        console.error("Save error:", err);
        showNotification("حدث خطأ أثناء الحفظ.", 'error');
        uploadBtn.innerHTML = 'حفظ الرابط';
        uploadBtn.disabled = false;
    }
}

function toggleUploadForm() {
    const form = document.getElementById('uploadFormContainer');
    if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

async function deleteAttachment(companyId, attachmentIndex) {
    if(!(await showConfirmDialog("هل أنت متأكد من حذف هذا الملف؟"))) return;
    try {
        const docRef = db.collection('companies').doc(companyId);
        const docSnap = await docRef.get();
        if(docSnap.exists) {
            const data = docSnap.data();
            let attachments = data.attachments || [];
            attachments.splice(attachmentIndex, 1);
            await docRef.update({ attachments });
            viewCompanyDetails(companyId);
        }
    } catch (err) {
        console.error("Delete error:", err);
        showNotification("حدث خطأ أثناء الحذف.", 'error');
    }
}

// ==========================================
// إدارة الموظفين (Employees Logic)
// ==========================================
function getEmployeeStatus(emp) {
    const isComplete = emp.nat_id && emp.nat_id.length === 14 && 
                       emp.ins_num && emp.ins_num.length >= 5 &&
                       emp.name && emp.qualification && emp.occupation;
    return {
        isComplete: !!isComplete
    };
}

function openEmployeeModal(isEdit = false) {
    if (!isEdit) {
        document.getElementById('employeeId').value = '';
        document.getElementById('employeeForm').reset();
        toggleDisabilityFields();
        document.getElementById('employeeModalTitle').innerHTML = '<i class="fas fa-user-plus"></i> إضافة موظف جديد';
    }
    
    db.collection('companies').get().then(snapshot => {
        const select = document.getElementById('empCompanyId');
        if(select) {
            const currentValue = select.value;
            select.innerHTML = '<option value="">اختر الشركة...</option>';
            snapshot.forEach(doc => {
                select.innerHTML += `<option value="${doc.id}">${doc.data().name}</option>`;
            });
            if (isEdit && currentValue) {
                select.value = currentValue;
            }
        }
    });

    document.getElementById('employeeModal').style.display = 'flex';
}

function closeEmployeeModal() {
    document.getElementById('employeeModal').style.display = 'none';
}

function toggleDisabilityFields() {
    const isChecked = document.getElementById('empHasDisability').checked;
    const fields = document.getElementById('disabilityFields');
    if (isChecked) {
        fields.style.display = 'block';
    } else {
        fields.style.display = 'none';
        document.getElementById('empDisabilityDate').value = '';
        document.getElementById('empDisabilityPercent').value = '';
    }
}

async function saveEmployee(e) {
    e.preventDefault();
    const id = document.getElementById('employeeId').value;
    
    const data = {
        company_id: document.getElementById('empCompanyId').value,
        name: document.getElementById('empName').value.trim(),
        code: document.getElementById('empCode').value.trim(),
        nat_id: document.getElementById('empNatId').value.trim(),
        ins_num: document.getElementById('empInsNum').value.trim(),
        mother_name: document.getElementById('empMotherName').value.trim(),
        qualification: document.getElementById('empQualification').value.trim(),
        occupation: document.getElementById('empOccupation').value.trim(),
        occupationCode: document.getElementById('empOccupationCode') ? document.getElementById('empOccupationCode').value.trim() : '',
        sub_start_date: document.getElementById('empSubStartDate').value,
        duration_type: document.getElementById('empDurationType').value.trim(),
        sub_wage: document.getElementById('empSubWage').value,
        comp_wage: document.getElementById('empCompWage').value,
        
        // حقول دورة حياة الموظف والتواريخ التأمينية
        hire_date: document.getElementById('empHireDate') ? document.getElementById('empHireDate').value : '',
        ins_date: document.getElementById('empInsDate') ? document.getElementById('empInsDate').value : '',
        resignation_date: document.getElementById('empResignationDate') ? document.getElementById('empResignationDate').value : '',

        has_disability: document.getElementById('empHasDisability').checked,
        disability_date: document.getElementById('empHasDisability').checked ? document.getElementById('empDisabilityDate').value : '',
        disability_percent: document.getElementById('empHasDisability').checked ? document.getElementById('empDisabilityPercent').value : '',
        
        gov: document.getElementById('empGov').value.trim(),
        center: document.getElementById('empCenter').value.trim(),
        village: document.getElementById('empVillage').value.trim(),
        street: document.getElementById('empStreet').value.trim(),
        building_no: document.getElementById('empBuildingNo').value.trim(),
        phone: document.getElementById('empPhone').value.trim()
    };

    // دعم وضع الضيف التجريبي (في الذاكرة فقط)
    if (typeof isGuestMode !== 'undefined' && isGuestMode) {
        if (id) {
            const idx = guestData.employees.findIndex(e => e.id === id);
            if (idx !== -1) {
                guestData.employees[idx] = { ...guestData.employees[idx], ...data };
            }
            showNotification('تم تحديث الموظف في الجلسة التجريبية!', 'success');
        } else {
            data.id = 'guest_emp_' + Date.now();
            guestData.employees.push(data);
            showNotification('تمت إضافة الموظف في الجلسة التجريبية!', 'success');
        }
        closeEmployeeModal();
        loadEmployeesGrid();
        loadSearchData();
        return;
    }

    try {
        const uid = (typeof getCurrentUserId === 'function') ? getCurrentUserId() : null;
        if (uid) data.userId = uid;

        if (!data.nat_id || data.nat_id.length !== 14 || isNaN(data.nat_id)) {
            showNotification('يوجد خطأ: الرقم القومي يجب أن يتكون من 14 رقماً بالضبط!', 'error');
            return;
        }

        if (data.ins_num && data.ins_num.length < 5) {
            showNotification('الرقم التأميني غير صالح، يجب أن يكون 5 أرقام أو أكثر!', 'error');
            return;
        }

        let natQuery = db.collection('employees').where('nat_id', '==', data.nat_id);
        if (!isCurrentUserAdmin() && uid) {
            natQuery = natQuery.where('userId', '==', uid);
        }
        const existingNatId = await natQuery.get();
        let isDuplicateNatId = false;
        existingNatId.forEach(doc => {
            if (doc.id !== id) isDuplicateNatId = true;
        });
        if (isDuplicateNatId) {
            showNotification('هذا الرقم القومي مسجل مسبقاً لموظف آخر!', 'error');
            return;
        }
        
        if (data.code) {
            let codeQuery = db.collection('employees').where('code', '==', data.code);
            if (!isCurrentUserAdmin() && uid) {
                codeQuery = codeQuery.where('userId', '==', uid);
            }
            const existingCode = await codeQuery.get();
            let isDuplicateCode = false;
            existingCode.forEach(doc => {
                if (doc.id !== id) isDuplicateCode = true;
            });
            if (isDuplicateCode) {
                showNotification('هذا الكود مسجل مسبقاً لموظف آخر!', 'error');
                return;
            }
        }

        if(id) {
            await db.collection('employees').doc(id).update(data);
            showNotification('تم تحديث بيانات الموظف بنجاح!', 'success');
        } else {
            await db.collection('employees').add(data);
            showNotification('تمت إضافة الموظف بنجاح!', 'success');
        }
        closeEmployeeModal();
        loadEmployeesGrid();
        loadSearchData();
    } catch(err) {
        console.error("Error saving employee: ", err);
        showNotification('حدث خطأ أثناء الحفظ.', 'error');
    }
}

async function editEmployee(id) {
    if (typeof isGuestMode !== 'undefined' && isGuestMode) {
        const emp = guestData.employees.find(e => e.id === id);
        if (emp) {
            populateEmployeeFormFields(emp, emp.id);
            document.getElementById("employeeModalTitle").innerHTML = '<i class="fas fa-user-edit"></i> تعديل بيانات الموظف';
            openEmployeeModal(true);
        }
        return;
    }

    try {
        const doc = await db.collection('employees').doc(id).get();
        if(doc.exists) {
            populateEmployeeFormFields(doc.data(), doc.id);
            document.getElementById("employeeModalTitle").innerHTML = '<i class="fas fa-user-edit"></i> تعديل بيانات الموظف';
            openEmployeeModal(true);
        }
    } catch(err) {
        console.error("Error editing employee: ", err);
    }
}

function populateEmployeeFormFields(data, id = null) {
    if (id) document.getElementById('employeeId').value = id;
    document.getElementById('empCompanyId').value = data.company_id || '';
    document.getElementById('empName').value = data.name || '';
    document.getElementById('empCode').value = data.code || '';
    document.getElementById('empNatId').value = data.nat_id || '';
    document.getElementById('empInsNum').value = data.ins_num || '';
    document.getElementById('empMotherName').value = data.mother_name || '';
    document.getElementById('empQualification').value = data.qualification || '';
    document.getElementById('empOccupation').value = data.occupation || '';
    if(document.getElementById('empOccupationSearch')) document.getElementById('empOccupationSearch').value = data.occupation || '';
    document.getElementById('empOccupationCode').value = data.occupationCode || data.occupation_code || '';
    if(document.getElementById('empOccupationCodeSearch')) document.getElementById('empOccupationCodeSearch').value = data.occupationCode || data.occupation_code || '';
    document.getElementById('empSubStartDate').value = data.sub_start_date || '';
    document.getElementById('empDurationType').value = data.duration_type || '';
    document.getElementById('empSubWage').value = data.sub_wage || '';
    document.getElementById('empCompWage').value = data.comp_wage || '';
    
    if (document.getElementById('empHireDate')) document.getElementById('empHireDate').value = data.hire_date || '';
    if (document.getElementById('empInsDate')) document.getElementById('empInsDate').value = data.ins_date || '';
    if (document.getElementById('empResignationDate')) document.getElementById('empResignationDate').value = data.resignation_date || '';

    document.getElementById('empHasDisability').checked = data.has_disability || false;
    document.getElementById('empDisabilityDate').value = data.disability_date || '';
    document.getElementById('empDisabilityPercent').value = data.disability_percent || '';
    toggleDisabilityFields();
    
    document.getElementById('empGov').value = data.gov || '';
    document.getElementById('empCenter').value = data.center || '';
    document.getElementById('empVillage').value = data.village || '';
    document.getElementById('empStreet').value = data.street || '';
    document.getElementById('empBuildingNo').value = data.building_no || '';
    document.getElementById('empPhone').value = data.phone || '';
}

async function deleteEmployee(id) {
    if(await showConfirmDialog('هل أنت متأكد من حذف هذا الموظف نهائياً؟')) {
        if (typeof isGuestMode !== 'undefined' && isGuestMode) {
            guestData.employees = guestData.employees.filter(e => e.id !== id);
            showNotification('تم الحذف من الجلسة التجريبية!', 'success');
            loadEmployeesGrid();
            loadSearchData();
            return;
        }

        try {
            await db.collection('employees').doc(id).delete();
            showNotification('تم الحذف بنجاح!', 'success');
            loadEmployeesGrid();
            loadSearchData();
        } catch (e) {
            console.error('Error deleting employee:', e);
            showNotification('حدث خطأ أثناء الحذف', 'error');
        }
    }
}

// ==========================================================================
// محرك فحص الحالة التأمينية ودورة حياة الموظف (Insurance Status Engine)
// ==========================================================================
function getEmployeeInsuranceStatus(emp, opMap = {}) {
    const linkedOps = (emp.code && opMap[emp.code]) ? opMap[emp.code] : (emp.linkedOps || []);
    
    // 1. فحص طلبات الاستقالة وإنهاء الخدمة (س6)
    const s6Op = linkedOps.find(o => 
        ((o.requestType || '').includes('س6') || 
         (o.requestType || '').includes('استمارة 6') || 
         (o.requestType || '').includes('إنهاء') ||
         (o.requestType || '').includes('استقالة'))
    );

    // تاريخ الاستقالة الفعلي: الأولوية لطلب مركز العمليات إذا كان مكتملاً
    const effectiveResignationDate = (s6Op && s6Op.status === 'مكتمل' && s6Op.incomingDate)
        ? s6Op.incomingDate
        : (emp.resignation_date || (s6Op ? s6Op.incomingDate : ''));

    if ((s6Op && s6Op.status === 'مكتمل') || emp.resignation_date) {
        return {
            statusKey: 'resigned',
            label: 'استقالة / إنهاء خدمة',
            badgeClass: 'badge-resigned',
            icon: 'fa-user-slash',
            isArchived: true,
            isInsured: false,
            s6Op: s6Op,
            effectiveInsDate: emp.ins_date || emp.sub_start_date || '',
            effectiveResignationDate: effectiveResignationDate,
            tooltip: `تم إنهاء الخدمة | تاريخ الاستقالة: ${effectiveResignationDate || '-'}`
        };
    }

    // 2. فحص طلبات التأمين الجديدة (س1)
    const s1Op = linkedOps.find(o => 
        ((o.requestType || '').includes('س1') || 
         (o.requestType || '').includes('استمارة 1'))
    );

    // تاريخ التأمين الفعلي: الأولوية المطلقة لطلب مركز العمليات المكتمل
    const effectiveInsDate = (s1Op && s1Op.status === 'مكتمل' && (s1Op.incomingDate || s1Op.approvalDate))
        ? (s1Op.incomingDate || s1Op.approvalDate)
        : (emp.ins_date || emp.sub_start_date || '');

    // إذا وجد طلب س1 مكتمل أو تم إدخال تاريخ تأمين ورقم تأميني صريح
    if ((s1Op && s1Op.status === 'مكتمل') || (emp.ins_date && emp.ins_num && (!s1Op || s1Op.status !== 'مرفوض'))) {
        return {
            statusKey: 'insured',
            label: 'مؤمن عليه',
            badgeClass: 'badge-insured',
            icon: 'fa-shield-alt',
            isArchived: false,
            isInsured: true,
            s1Op: s1Op,
            s6Op: null,
            effectiveInsDate: effectiveInsDate,
            effectiveResignationDate: effectiveResignationDate,
            tooltip: `مؤمن عليه معتمد | تاريخ التأمين: ${effectiveInsDate || '-'}`
        };
    }

    if (s1Op) {
        if (s1Op.status === 'قيد المراجعة') {
            return {
                statusKey: 'review',
                label: 'قيد المراجعة',
                badgeClass: 'badge-review',
                icon: 'fa-hourglass-half',
                isArchived: false,
                isInsured: false,
                s1Op: s1Op,
                s6Op: null,
                effectiveInsDate: effectiveInsDate,
                effectiveResignationDate: effectiveResignationDate,
                tooltip: `طلب س1 قيد المراجعة | وارد رقم ${s1Op.incomingNum || '-'}`
            };
        }
        if (s1Op.status === 'انتظار') {
            return {
                statusKey: 'pending',
                label: 'انتظار الاعتماد',
                badgeClass: 'badge-pending',
                icon: 'fa-clock',
                isArchived: false,
                isInsured: false,
                s1Op: s1Op,
                s6Op: null,
                effectiveInsDate: effectiveInsDate,
                effectiveResignationDate: effectiveResignationDate,
                tooltip: `طلب س1 في قائمة الانتظار | وارد رقم ${s1Op.incomingNum || '-'}`
            };
        }
        if (s1Op.status === 'مرفوض') {
            return {
                statusKey: 'rejected',
                label: 'مرفوض',
                badgeClass: 'badge-rejected',
                icon: 'fa-times-circle',
                isArchived: false,
                isInsured: false,
                s1Op: s1Op,
                s6Op: null,
                effectiveInsDate: effectiveInsDate,
                effectiveResignationDate: effectiveResignationDate,
                rejectionReason: s1Op.notes || s1Op.rejectionReason || 'تم رفض طلب التأمين من مكتب التأمينات',
                tooltip: `تم رفض استمارة 1: ${s1Op.notes || 'انقر لفتح الملف ومعرفة الأسباب'}`
            };
        }
    }

    // إذا كان الموظف لديه رقم تأميني وبدء اشتراك
    if (emp.ins_num && emp.sub_start_date) {
        return {
            statusKey: 'insured',
            label: 'مؤمن عليه',
            badgeClass: 'badge-insured',
            icon: 'fa-shield-alt',
            isArchived: false,
            isInsured: true,
            s1Op: null,
            s6Op: null,
            effectiveInsDate: effectiveInsDate,
            effectiveResignationDate: effectiveResignationDate,
            tooltip: 'مؤمن عليه مسجل'
        };
    }

    return {
        statusKey: 'uninsured',
        label: 'غير مؤمن عليه',
        badgeClass: 'badge-uninsured',
        icon: 'fa-user-shield',
        isArchived: false,
        isInsured: false,
        s1Op: null,
        s6Op: null,
        effectiveInsDate: effectiveInsDate,
        effectiveResignationDate: effectiveResignationDate,
        tooltip: 'لم يتم تقديم أو اعتماد استمارة س1 حتى الآن'
    };
}

// عرض ملف وبطاقة الموظف الشاملة مع الخط الزمني والمستندات
async function viewEmployeeDetails(id) {
    document.getElementById('employeeDetailsModal').style.display = 'flex';
    document.getElementById('empDetailsBody').innerHTML = '<div class="loading-spinner-box"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';
    
    let opMap = {};
    if (typeof isGuestMode !== 'undefined' && isGuestMode) {
        if (guestData && guestData.operations) {
            guestData.operations.forEach(op => {
                if (op.employeeCode) {
                    if (!opMap[op.employeeCode]) opMap[op.employeeCode] = [];
                    opMap[op.employeeCode].push(op);
                }
            });
        }
        const emp = guestData.employees.find(e => e.id === id);
        if (emp) {
            renderEmployeeDetailsModal(emp, emp.id, opMap);
        }
        return;
    }

    try {
        const uid = (typeof getCurrentUserId === 'function') ? getCurrentUserId() : null;
        const isAdmin = (typeof isCurrentUserAdmin === 'function') ? isCurrentUserAdmin() : false;
        let opQuery = db.collection('operations');
        if (!isAdmin && uid) opQuery = opQuery.where('userId', '==', uid);
        
        const [doc, opSnap] = await Promise.all([
            db.collection('employees').doc(id).get(),
            opQuery.get()
        ]);

        opSnap.forEach(opDoc => {
            const op = opDoc.data();
            if (op.employeeCode) {
                if (!opMap[op.employeeCode]) opMap[op.employeeCode] = [];
                opMap[op.employeeCode].push(op);
            }
        });

        if(doc.exists) {
            renderEmployeeDetailsModal(doc.data(), doc.id, opMap);
        }
    } catch(err) {
        console.error("Error viewing employee details:", err);
    }
}

function renderEmployeeDetailsModal(data, id, opMap = {}) {
    const statusInfo = getEmployeeInsuranceStatus(data, opMap);
    const s1Op = statusInfo.s1Op;
    const s6Op = statusInfo.s6Op;
    const attachments = data.attachments || [];

    // صندوق تنبيه الرفض يظهر داخل بطاقة الموظف فقط عند فتحها
    let rejectionBoxHTML = '';
    if (statusInfo.statusKey === 'rejected') {
        rejectionBoxHTML = `
            <div class="rejection-notice-box">
                <i class="fas fa-exclamation-circle rejection-notice-icon"></i>
                <div>
                    <div class="rejection-notice-title">تنبيه: تم رفض طلب التأمين (استمارة س1) للموظف</div>
                    <p class="rejection-notice-text">
                        <b>سبب الرفض المسجل:</b> ${statusInfo.rejectionReason || 'يرجى مراجعة مكتب التأمينات المختص لتصحيح البيانات أو استيفاء المستندات المطلوبة.'}
                    </p>
                </div>
            </div>
        `;
    }

    // بناء قائمة المستندات والمرفقات
    let attachmentsListHTML = '';
    if (attachments.length === 0) {
        attachmentsListHTML = `
            <div class="text-center p-15" style="color: var(--text-muted); grid-column: 1/-1;">
                <i class="fas fa-folder-open mb-10" style="font-size: 1.8rem; opacity: 0.5;"></i>
                <p style="margin: 0; font-size: 0.85rem;">لا توجد مستندات أو استمارات مرفوعة حتى الآن. يمكنك رفع نسخة ضوئية من استمارة س1 أو س6.</p>
            </div>
        `;
    } else {
        attachmentsListHTML = attachments.map(att => `
            <div class="emp-attachment-item">
                <div class="emp-att-info">
                    <div class="emp-att-icon">
                        <i class="fas ${att.fileType && att.fileType.includes('pdf') ? 'fa-file-pdf' : 'fa-file-image'}"></i>
                    </div>
                    <div>
                        <span class="emp-att-name" title="${att.name}">${att.name}</span>
                        <span class="emp-att-date"><i class="fas fa-calendar-alt"></i> ${att.date || '-'}</span>
                    </div>
                </div>
                <div class="emp-att-actions">
                    <button class="neu-btn card-actions-btn" onclick="previewEmployeeAttachment('${att.dataUrl}', '${att.name}')" title="معاينة المستند"><i class="fas fa-eye text-cyan"></i></button>
                    <button class="neu-btn card-actions-btn" onclick="deleteEmployeeAttachment('${id}', '${att.id}')" title="حذف المستند"><i class="fas fa-trash text-rose"></i></button>
                </div>
            </div>
        `).join('');
    }

    document.getElementById('empDetailsBody').innerHTML = `
        <div class="emp-profile-header pos-relative">
            <div class="emp-avatar-circle">
                ${data.name ? data.name.charAt(0) : 'M'}
            </div>
            <h3>${data.name || '-'}</h3>
            <p>${data.occupation || 'بدون مهنة'}</p>
            
            <div class="mt-10">
                <span class="pro-badge ${statusInfo.badgeClass}" style="font-size: 0.88rem; padding: 6px 16px;">
                    <i class="fas ${statusInfo.icon}"></i>
                    ${statusInfo.label}
                </span>
            </div>

            ${s1Op ? `
                <div class="milestone-extra-box mt-10 justify-center">
                    <span><i class="fas fa-file-invoice text-emerald"></i> <b>استمارة س1:</b> وارد رقم ${s1Op.incomingNum || '-'} بتاريخ ${s1Op.incomingDate || '-'}</span>
                    <span><i class="fas fa-info-circle text-cyan"></i> <b>حالة الطلب:</b> ${s1Op.status || '-'}</span>
                </div>
            ` : ''}
        </div>

        ${rejectionBoxHTML}

        <!-- ========================================== -->
        <!-- الخط الزمني لدورة حياة الموظف (Lifecycle Timeline) -->
        <!-- ========================================== -->
        <h4 class="emp-section-heading mt-20"><i class="fas fa-history text-cyan"></i> دورة حياة الموظف والمسار التأميني</h4>
        <div class="emp-timeline-container">
            <div class="emp-timeline-wrap">
                <!-- 1. التعيين -->
                <div class="timeline-milestone">
                    <div class="milestone-icon-wrap milestone-icon-cyan">
                        <i class="fas fa-user-plus"></i>
                    </div>
                    <div class="milestone-card">
                        <div class="milestone-header">
                            <span class="milestone-title"><i class="fas fa-building"></i> الالتحاق بالعمل بالمنشأة</span>
                            <span class="milestone-date-badge">${data.hire_date || data.sub_start_date || 'تاريخ غير محدد'}</span>
                        </div>
                        <p class="milestone-desc">تم تسجيل الموظف بالمنشأة كود (${data.code || '-'}) بمسمى وظيفي <b>${data.occupation || 'غير محدد'}</b>.</p>
                    </div>
                </div>

                <!-- 2. تقديم استمارة س1 -->
                <div class="timeline-milestone">
                    <div class="milestone-icon-wrap milestone-icon-emerald">
                        <i class="fas fa-file-contract"></i>
                    </div>
                    <div class="milestone-card">
                        <div class="milestone-header">
                            <span class="milestone-title"><i class="fas fa-file-invoice"></i> تقديم وقيد استمارة س1</span>
                            <span class="milestone-date-badge">${s1Op ? (s1Op.incomingDate || 'مسجل') : (data.sub_start_date || 'قيد الإجراء')}</span>
                        </div>
                        <p class="milestone-desc">
                            ${s1Op 
                                ? `تم إرسال وقيد استمارة 1 برقم وارد <b>${s1Op.incomingNum || '-'}</b> وحالة الطلب حالياً: <b>${s1Op.status || '-'}</b>.`
                                : `تم تسجيل بدء الاشتراك التأميني اعتباراً من <b>${data.sub_start_date || '-'}</b>.`}
                        </p>
                    </div>
                </div>

                <!-- 3. الاعتماد والتأمين الفعلي -->
                <div class="timeline-milestone">
                    <div class="milestone-icon-wrap ${statusInfo.isInsured ? 'milestone-icon-emerald' : 'milestone-icon-amber'}">
                        <i class="fas ${statusInfo.isInsured ? 'fa-shield-alt' : 'fa-hourglass-half'}"></i>
                    </div>
                    <div class="milestone-card">
                        <div class="milestone-header">
                            <span class="milestone-title"><i class="fas fa-user-shield"></i> التأمين الفعلي والاعتماد</span>
                            <span class="milestone-date-badge">${statusInfo.effectiveInsDate || 'قيد المتابعة'}</span>
                        </div>
                        <p class="milestone-desc">
                            ${statusInfo.isInsured
                                ? `الموظف مؤمن عليه بنجاح برقم تأميني <b>${data.ins_num || '-'}</b> وأجر اشتراك <b>${(data.sub_wage || 0).toLocaleString ? Number(data.sub_wage || 0).toLocaleString('ar-EG') : data.sub_wage} ج.م</b>.`
                                : `في انتظار اكتمال اعتماد استمارة س1 من مكتب التأمينات المختص.`}
                        </p>
                    </div>
                </div>

                <!-- 4. الاستقالة وإنهاء الخدمة إن وجدت -->
                ${(data.resignation_date || s6Op) ? `
                <div class="timeline-milestone">
                    <div class="milestone-icon-wrap milestone-icon-rose">
                        <i class="fas fa-user-slash"></i>
                    </div>
                    <div class="milestone-card">
                        <div class="milestone-header">
                            <span class="milestone-title text-rose"><i class="fas fa-door-open"></i> استقالة وإنهاء خدمة (س6)</span>
                            <span class="milestone-date-badge" style="color: #fb7185;">${statusInfo.effectiveResignationDate || 'تم إنهاء الخدمة'}</span>
                        </div>
                        <p class="milestone-desc">
                            تم إنهاء خدمة الموظف ونقله للأرشيف ${s6Op ? `بموجب استمارة 6 وارد رقم <b>${s6Op.incomingNum || '-'}</b>` : ''}.
                        </p>
                    </div>
                </div>
                ` : ''}
            </div>
        </div>

        <!-- ========================================== -->
        <!-- المرفقات ومستندات الاستمارات (Form Attachments) -->
        <!-- ========================================== -->
        <div class="emp-attachments-container">
            <div class="attachments-header-flex">
                <h4 class="m-0" style="font-size: 0.95rem; color: var(--text-main);"><i class="fas fa-paperclip text-cyan"></i> ملفات ومرفقات الاستمارات (س1 / س6)</h4>
                <button class="neu-btn neu-btn-primary" onclick="handleUploadEmployeeAttachment('${id}')" style="padding: 6px 14px; font-size: 0.82rem;">
                    <i class="fas fa-cloud-upload-alt"></i> رفع مستند استمارة
                </button>
            </div>
            <div class="emp-attachments-grid">
                ${attachmentsListHTML}
            </div>
        </div>
        
        <!-- البيانات الأساسية -->
        <h4 class="emp-section-heading mt-20"><i class="fas fa-id-card"></i> البيانات الأساسية</h4>
        <div class="emp-details-grid">
            <div><span class="detail-subtitle">كود الموظف</span><strong class="detail-val">${data.code || '-'}</strong></div>
            <div><span class="detail-subtitle">الرقم القومي</span><strong class="detail-val">${data.nat_id || '-'}</strong></div>
            <div><span class="detail-subtitle">الرقم التأميني</span><strong class="detail-val">${data.ins_num || '-'}</strong></div>
            <div><span class="detail-subtitle">اسم الأم</span><strong class="detail-val">${data.mother_name || '-'}</strong></div>
            <div><span class="detail-subtitle">المؤهل</span><strong class="detail-val">${data.qualification || '-'}</strong></div>
        </div>

        <!-- بيانات الاشتراك والأجور -->
        <h4 class="emp-section-heading"><i class="fas fa-money-check-alt"></i> بيانات الاشتراك والأجور</h4>
        <div class="emp-details-grid">
            <div><span class="detail-subtitle">تاريخ التعيين</span><strong class="detail-val">${data.hire_date || '-'}</strong></div>
            <div><span class="detail-subtitle">بدء الاشتراك</span><strong class="detail-val">${data.sub_start_date || '-'}</strong></div>
            <div><span class="detail-subtitle">تاريخ التأمين الفعلي</span><strong class="detail-val">${statusInfo.effectiveInsDate || data.ins_date || '-'}</strong></div>
            <div><span class="detail-subtitle">أجر الاشتراك</span><strong class="detail-val">${data.sub_wage || '0'} ج.م</strong></div>
            <div><span class="detail-subtitle">الأجر الشامل</span><strong class="detail-val">${data.comp_wage || '0'} ج.م</strong></div>
            <div><span class="detail-subtitle">نوع المدة</span><strong class="detail-val">${data.duration_type || '-'}</strong></div>
        </div>
        
        ${data.has_disability ? `
        <h4 class="emp-section-heading disability-heading"><i class="fas fa-wheelchair"></i> بيانات العجز</h4>
        <div class="emp-details-grid disability-box">
            <div><span class="detail-subtitle" style="color:#c53030;">تاريخ العجز</span><strong style="color: #9b2c2c;">${data.disability_date || '-'}</strong></div>
            <div><span class="detail-subtitle" style="color:#c53030;">نسبة العجز</span><strong style="color: #9b2c2c;">${data.disability_percent ? data.disability_percent + '%' : '-'}</strong></div>
        </div>
        ` : ''}

        <h4 class="emp-section-heading"><i class="fas fa-map-marker-alt"></i> بيانات العنوان والتواصل</h4>
        <div class="emp-details-grid">
            <div style="grid-column: 1/-1;"><span class="detail-subtitle">العنوان الكامل</span><strong class="detail-val">
                عقار ${data.building_no || '-'}، شارع ${data.street || '-'}، قرية/منطقة ${data.village || '-'}، مركز ${data.center || '-'}، ${data.gov || '-'}
            </strong></div>
            <div style="grid-column: 1/-1;"><span class="detail-subtitle">رقم التليفون</span><strong class="detail-val">${data.phone || '-'}</strong></div>
        </div>
        
        <div class="modal-footer-buttons">
            <button class="neu-btn neu-btn-primary" onclick="handleOpenEmployeeFormModal(event, '${id}')"><i class="fas fa-print"></i> طباعة استمارة</button>
            <button class="neu-btn" onclick="editEmployee('${id}'); document.getElementById('employeeDetailsModal').style.display='none'"><i class="fas fa-pen" style="color: var(--accent);"></i> تعديل</button>
            <button class="neu-btn neu-btn-danger" onclick="deleteEmployee('${id}'); document.getElementById('employeeDetailsModal').style.display='none'"><i class="fas fa-trash"></i> حذف</button>
        </div>
    `;
}

// رفع مرفق استمارة للموظف
async function handleUploadEmployeeAttachment(empId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.pdf';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const defaultName = file.name.includes('.pdf') ? 'استمارة س1 معتمدة.pdf' : 'صورة استمارة التأمين';
        const docName = prompt("أدخل مسمى المستند (مثال: استمارة س1 معتمدة، شهادة قيد، استمارة س6):", defaultName) || defaultName;
        
        const reader = new FileReader();
        reader.onload = async (event) => {
            const dataUrl = event.target.result;
            const newAtt = {
                id: 'att_' + Date.now(),
                name: docName,
                fileName: file.name,
                fileType: file.type || 'application/octet-stream',
                date: new Date().toLocaleDateString('ar-EG'),
                dataUrl: dataUrl
            };

            if (typeof isGuestMode !== 'undefined' && isGuestMode) {
                const emp = guestData.employees.find(x => x.id === empId);
                if (emp) {
                    if (!emp.attachments) emp.attachments = [];
                    emp.attachments.push(newAtt);
                    showNotification('تم حفظ وإرفاق المستند بنجاح!', 'success');
                    viewEmployeeDetails(empId);
                }
                return;
            }

            try {
                const empRef = db.collection('employees').doc(empId);
                const empDoc = await empRef.get();
                if (empDoc.exists) {
                    const currentData = empDoc.data();
                    const attachments = currentData.attachments || [];
                    attachments.push(newAtt);
                    await empRef.update({ attachments: attachments });
                    showNotification('تم رفع وحفظ المستند بنجاح!', 'success');
                    viewEmployeeDetails(empId);
                }
            } catch (err) {
                console.error("Error uploading attachment:", err);
                showNotification('حدث خطأ أثناء رفع المستند', 'error');
            }
        };
        reader.readAsDataURL(file);
    };
    input.click();
}

// حذف مرفق استمارة من الموظف
async function deleteEmployeeAttachment(empId, attId) {
    if (!confirm('هل أنت متأكد من حذف هذا المستند؟')) return;

    if (typeof isGuestMode !== 'undefined' && isGuestMode) {
        const emp = guestData.employees.find(x => x.id === empId);
        if (emp && emp.attachments) {
            emp.attachments = emp.attachments.filter(a => a.id !== attId);
            showNotification('تم حذف المستند بنجاح!', 'success');
            viewEmployeeDetails(empId);
        }
        return;
    }

    try {
        const empRef = db.collection('employees').doc(empId);
        const empDoc = await empRef.get();
        if (empDoc.exists) {
            const currentData = empDoc.data();
            const attachments = (currentData.attachments || []).filter(a => a.id !== attId);
            await empRef.update({ attachments: attachments });
            showNotification('تم حذف المستند بنجاح!', 'success');
            viewEmployeeDetails(empId);
        }
    } catch (err) {
        console.error("Error deleting attachment:", err);
        showNotification('حدث خطأ أثناء حذف المستند', 'error');
    }
}

// معاينة مرفق استمارة في نافذة جديدة
function previewEmployeeAttachment(dataUrl, name) {
    if (!dataUrl) {
        showNotification('تعذر فتح المستند', 'error');
        return;
    }
    const win = window.open();
    if (win) {
        win.document.write(`
            <html>
                <head>
                    <title>${name || 'معاينة المستند'}</title>
                    <style>
                        body { margin: 0; display: flex; align-items: center; justify-content: center; background: #0f172a; height: 100vh; }
                        img, iframe { max-width: 100%; max-height: 100%; border: none; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
                    </style>
                </head>
                <body>
                    ${dataUrl.includes('data:application/pdf') 
                        ? `<iframe src="${dataUrl}" width="100%" height="100%"></iframe>`
                        : `<img src="${dataUrl}" alt="${name || 'مستند'}">`}
                </body>
            </html>
        `);
    }
}

// نافذة استعراض مسار وسجل طلبات الموظف التفاعلية
function viewEmployeeOperations(empCode, empName = '') {
    const modal = document.getElementById('employeeOperationsTimelineModal');
    if (!modal) return;

    const nameEl = document.getElementById('opsModalEmpName');
    if (nameEl) nameEl.innerText = empName || empCode;

    const body = document.getElementById('opsModalBody');
    body.innerHTML = '<div class="loading-spinner-box"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';
    modal.style.display = 'flex';

    let linkedOps = [];
    if (typeof isGuestMode !== 'undefined' && isGuestMode) {
        if (guestData && guestData.operations) {
            linkedOps = guestData.operations.filter(o => 
                String(o.employeeCode || '').trim() === String(empCode).trim() ||
                String(o.requestCode || '').trim() === String(empCode).trim()
            );
        }
    } else if (typeof operationsList !== 'undefined' && operationsList.length > 0) {
        linkedOps = operationsList.filter(o => 
            String(o.employeeCode || '').trim() === String(empCode).trim() ||
            String(o.requestCode || '').trim() === String(empCode).trim()
        );
    }

    if (linkedOps.length === 0) {
        body.innerHTML = `
            <div class="text-center p-25 text-muted">
                <i class="fas fa-inbox fa-3x mb-15 opacity-50"></i>
                <p>لا توجد طلبات مسجلة لهذا الموظف في مركز العمليات حتى الآن.</p>
            </div>
        `;
        return;
    }

    let timelineHTML = `<div class="emp-timeline-wrap">`;
    linkedOps.forEach(op => {
        let statusBadgeClass = 'badge-pending';
        let iconClass = 'milestone-icon-amber';
        let statusIcon = 'fa-clock';

        if (op.status === 'مكتمل') {
            statusBadgeClass = 'badge-insured';
            iconClass = 'milestone-icon-emerald';
            statusIcon = 'fa-check-circle';
        } else if (op.status === 'مرفوض') {
            statusBadgeClass = 'badge-rejected';
            iconClass = 'milestone-icon-rose';
            statusIcon = 'fa-times-circle';
        } else if (op.status === 'قيد المراجعة') {
            statusBadgeClass = 'badge-review';
            iconClass = 'milestone-icon-cyan';
            statusIcon = 'fa-hourglass-half';
        }

        const targetSearch = op.incomingNum || op.requestCode || op.name || '';

        timelineHTML += `
            <div class="timeline-milestone">
                <div class="milestone-icon-wrap ${iconClass}">
                    <i class="fas ${statusIcon}"></i>
                </div>
                <div class="milestone-card">
                    <div class="milestone-header">
                        <span class="milestone-title">
                            <i class="fas fa-file-invoice text-cyan"></i>
                            ${op.requestType || 'طلب عملية'} - رقم وارد (${op.incomingNum || '-'})
                        </span>
                        <span class="pro-badge ${statusBadgeClass}" style="font-size: 0.78rem; padding: 2px 10px;">
                            ${op.status || 'انتظار'}
                        </span>
                    </div>
                    <p class="milestone-desc">
                        <b>تاريخ الوارد:</b> ${op.incomingDate || '-'} | <b>الشركة:</b> ${op.company || '-'} | <b>كود الطلب:</b> ${op.requestCode || '-'}
                    </p>
                    ${op.notes ? `<p class="milestone-desc mt-5" style="color: var(--text-main);"><b>ملاحظات / سبب الحالة:</b> ${op.notes}</p>` : ''}
                    <div class="mt-10" style="display: flex; justify-content: flex-end;">
                        <button class="neu-btn neu-btn-primary" onclick="goToOperation('${op.id}', '${targetSearch.replace(/'/g, "\\'")}')" style="padding: 6px 14px; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 6px;">
                            <i class="fas fa-external-link-alt"></i> الذهاب للطلب في مركز العمليات
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    timelineHTML += `</div>`;
    body.innerHTML = timelineHTML;
}

// الانتقال المباشر وتحديد الطلب في مركز العمليات
function goToOperation(opId, searchVal) {
    closeModal('employeeOperationsTimelineModal');
    const detailsModal = document.getElementById('employeeDetailsModal');
    if (detailsModal) detailsModal.style.display = 'none';

    if (typeof switchView === 'function') {
        switchView('operations-view');
    }

    setTimeout(() => {
        const searchInput = document.getElementById('operationSearch');
        if (searchInput && searchVal) {
            searchInput.value = searchVal;
            if (typeof filterOperations === 'function') {
                filterOperations();
            }
        }

        const tbody = document.getElementById('operationsTableBody');
        if (tbody) {
            const rows = tbody.querySelectorAll('tr');
            rows.forEach(row => {
                if (row.innerText.includes(searchVal)) {
                    row.classList.add('highlight-target-pulse');
                    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setTimeout(() => row.classList.remove('highlight-target-pulse'), 3500);
                }
            });
        }

        if (typeof showNotification === 'function') {
            showNotification('تم الانتقال وتحديد الطلب في مركز العمليات بنجاح!', 'success');
        }
    }, 250);
}

// تحميل شبكة الموظفين وتصنيف الأرشيف والحالات التأمينية
async function loadEmployeesGrid() {
    const grid = document.getElementById('employeesGrid');
    if (!grid) return;
    grid.innerHTML = '';

    if (typeof isGuestMode !== 'undefined' && isGuestMode) {
        const compMap = {};
        if (guestData && guestData.companies) {
            guestData.companies.forEach(c => {
                compMap[c.id] = c.name;
            });
        }
        const opMap = {};
        if (guestData && guestData.operations) {
            guestData.operations.forEach(op => {
                if (op.employeeCode) {
                    if (!opMap[op.employeeCode]) opMap[op.employeeCode] = [];
                    opMap[op.employeeCode].push(op);
                }
            });
        }

        window.employeesCompStats = {
            totalEmployees: 0,
            activeCount: 0,
            archivedCount: 0,
            noCompany: { active: 0, archived: 0, total: 0 },
            companies: {},
            compMap: compMap
        };

        window.allEmployeesList = [];

        if (guestData && guestData.employees) {
            guestData.employees.forEach(emp => {
                window.allEmployeesList.push(emp);
                const statusInfo = getEmployeeInsuranceStatus(emp, opMap);
                const isArchived = statusInfo.isArchived;

                window.employeesCompStats.totalEmployees++;
                if (isArchived) window.employeesCompStats.archivedCount++;
                else window.employeesCompStats.activeCount++;

                if (!emp.company_id) {
                    if (isArchived) window.employeesCompStats.noCompany.archived++;
                    else window.employeesCompStats.noCompany.active++;
                    window.employeesCompStats.noCompany.total++;
                } else {
                    if (!window.employeesCompStats.companies[emp.company_id]) {
                        window.employeesCompStats.companies[emp.company_id] = {
                            active: 0,
                            archived: 0,
                            total: 0,
                            name: compMap[emp.company_id] || 'شركة'
                        };
                    }
                    if (isArchived) window.employeesCompStats.companies[emp.company_id].archived++;
                    else window.employeesCompStats.companies[emp.company_id].active++;
                    window.employeesCompStats.companies[emp.company_id].total++;
                }

                renderEmployeeCard(grid, emp, emp.id, compMap, opMap);
            });
        }
        window.employeesData = window.allEmployeesList;
        renderEmployeeStatsCounters();
        if (typeof updateDashboardAnalytics === 'function') updateDashboardAnalytics();
        return;
    }
    
    try {
        const uid = (typeof getCurrentUserId === 'function') ? getCurrentUserId() : null;
        const isAdmin = (typeof isCurrentUserAdmin === 'function') ? isCurrentUserAdmin() : false;

        let compQuery = db.collection('companies');
        let empQuery = db.collection('employees');
        let opQuery = db.collection('operations');
        if (!isAdmin && uid) {
            compQuery = compQuery.where('userId', '==', uid);
            empQuery = empQuery.where('userId', '==', uid);
            opQuery = opQuery.where('userId', '==', uid);
        }

        const [compSnap, snapshot, opSnap] = await Promise.all([
            compQuery.get(),
            empQuery.get(),
            opQuery.get()
        ]);

        const compMap = {};
        compSnap.forEach(c => {
            compMap[c.id] = c.data().name;
        });

        const opMap = {};
        opSnap.forEach(opDoc => {
            const op = opDoc.data();
            if (op.employeeCode) {
                if (!opMap[op.employeeCode]) opMap[op.employeeCode] = [];
                opMap[op.employeeCode].push(op);
            }
        });
        
        window.employeesCompStats = {
            totalEmployees: 0,
            activeCount: 0,
            archivedCount: 0,
            noCompany: { active: 0, archived: 0, total: 0 },
            companies: {},
            compMap: compMap
        };

        window.allEmployeesList = [];

        snapshot.forEach(doc => {
            const emp = { id: doc.id, ...doc.data() };
            window.allEmployeesList.push(emp);
            
            const statusInfo = getEmployeeInsuranceStatus(emp, opMap);
            const isArchived = statusInfo.isArchived;

            window.employeesCompStats.totalEmployees++;
            if (isArchived) window.employeesCompStats.archivedCount++;
            else window.employeesCompStats.activeCount++;

            if (!emp.company_id) {
                if (isArchived) window.employeesCompStats.noCompany.archived++;
                else window.employeesCompStats.noCompany.active++;
                window.employeesCompStats.noCompany.total++;
            } else {
                if (!window.employeesCompStats.companies[emp.company_id]) {
                    window.employeesCompStats.companies[emp.company_id] = {
                        active: 0,
                        archived: 0,
                        total: 0,
                        name: compMap[emp.company_id] || 'شركة'
                    };
                }
                if (isArchived) window.employeesCompStats.companies[emp.company_id].archived++;
                else window.employeesCompStats.companies[emp.company_id].active++;
                window.employeesCompStats.companies[emp.company_id].total++;
            }

            renderEmployeeCard(grid, emp, doc.id, compMap, opMap);
        });

        window.employeesData = window.allEmployeesList;
        renderEmployeeStatsCounters();
        if (typeof updateDashboardAnalytics === 'function') updateDashboardAnalytics();
    } catch(e) {
        console.error("Error loading employees grid: ", e);
    }
}

function renderEmployeeCard(grid, emp, id, compMap, opMap) {
    const statusInfo = getEmployeeInsuranceStatus(emp, opMap);
    const compName = compMap[emp.company_id] || 'بدون شركة';
    
    // شريط الطلبات المصغر الذكي مع الإحصائيات الملونة
    const linkedOps = opMap[emp.code] || [];
    let linkedOpsHTML = '';
    if (linkedOps.length > 0) {
        const completedCount = linkedOps.filter(o => o.status === 'مكتمل').length;
        const pendingCount = linkedOps.filter(o => o.status === 'انتظار' || o.status === 'قيد المراجعة').length;
        const rejectedCount = linkedOps.filter(o => o.status === 'مرفوض').length;
        const otherCount = linkedOps.length - (completedCount + pendingCount + rejectedCount);

        linkedOpsHTML = `
            <div class="emp-card-ops-strip" onclick="event.stopPropagation(); viewEmployeeOperations('${emp.code}', '${(emp.name || '').replace(/'/g, "\\'")}')" title="انقر لعرض خط سير وتفاصيل الطلبات والذهاب إليها">
                <div class="ops-strip-title">
                    <i class="fas fa-tasks text-cyan"></i>
                    <span>الطلبات (${linkedOps.length})</span>
                </div>
                <div class="ops-mini-badges">
                    ${completedCount > 0 ? `<span class="ops-mini-pill pill-completed" title="طلبات مكتملة: ${completedCount}"><i class="fas fa-check"></i> ${completedCount}</span>` : ''}
                    ${pendingCount > 0 ? `<span class="ops-mini-pill pill-pending" title="طلبات انتظار ومراجعة: ${pendingCount}"><i class="fas fa-clock"></i> ${pendingCount}</span>` : ''}
                    ${rejectedCount > 0 ? `<span class="ops-mini-pill pill-rejected" title="طلبات مرفوضة: ${rejectedCount}"><i class="fas fa-times"></i> ${rejectedCount}</span>` : ''}
                    ${otherCount > 0 ? `<span class="ops-mini-pill pill-other" title="أخرى: ${otherCount}">${otherCount}</span>` : ''}
                </div>
                <i class="fas fa-chevron-left ops-strip-arrow"></i>
            </div>
        `;
    }

    const card = document.createElement('div');
    card.className = 'pro-card';
    card.setAttribute('data-company-id', emp.company_id || 'no-company');
    card.setAttribute('data-archived', statusInfo.isArchived ? 'true' : 'false');
    card.setAttribute('data-status-key', statusInfo.statusKey);
    card.onclick = () => viewEmployeeDetails(id);
    card.innerHTML = `
        <div class="pro-card-inner">
            <div class="pro-card-header">
                <div class="pro-avatar">
                    <i class="fas ${statusInfo.isArchived ? 'fa-user-slash' : 'fa-user-tie'}"></i>
                </div>
                <div class="pro-info">
                    <h3>${emp.name || 'بدون اسم'}</h3>
                    <span class="pro-badge ${statusInfo.badgeClass}" title="${statusInfo.tooltip}">
                        <i class="fas ${statusInfo.icon}"></i>
                        ${statusInfo.label}
                    </span>
                </div>
                <div class="pro-actions">
                    <button class="neu-btn card-actions-btn" onclick="event.stopPropagation(); handleOpenEmployeeFormModal(event, '${id}')" title="الاستمارات"><i class="fas fa-file-invoice" style="color: #48bb78;"></i></button>
                    <button class="neu-btn card-actions-btn" onclick="event.stopPropagation(); handleOpenEmployeeOperationModal(event, '${id}')" title="الطلبات"><i class="fas fa-tasks" style="color: #3182ce;"></i></button>
                    <button class="neu-btn card-actions-btn" onclick="event.stopPropagation(); editEmployee('${id}')" title="تعديل"><i class="fas fa-pen" style="color: var(--accent);"></i></button>
                    <button class="neu-btn card-actions-btn" onclick="event.stopPropagation(); deleteEmployee('${id}')" title="حذف"><i class="fas fa-trash" style="color: #e53e3e;"></i></button>
                </div>
            </div>
            
            <div class="pro-divider"></div>

            <div class="pro-details">
                <div class="pro-detail-item full-width">
                    <span class="pro-label"><i class="fas fa-building"></i> الشركة</span>
                    <span class="pro-value">${compName}</span>
                </div>
                <div class="pro-detail-item">
                    <span class="pro-label"><i class="fas fa-id-card"></i> كود الموظف</span>
                    <span class="pro-value highlight">${emp.code || '-'}</span>
                </div>
                <div class="pro-detail-item">
                    <span class="pro-label"><i class="fas fa-briefcase"></i> المهنة</span>
                    <span class="pro-value">${emp.occupation || '-'}</span>
                </div>
                <div class="pro-detail-item">
                    <span class="pro-label"><i class="fas fa-fingerprint"></i> الرقم القومي</span>
                    <span class="pro-value">${emp.nat_id || '-'}</span>
                </div>
                <div class="pro-detail-item">
                    <span class="pro-label"><i class="fas fa-shield-alt"></i> الرقم التأميني</span>
                    <span class="pro-value">${emp.ins_num || '-'}</span>
                </div>
                ${linkedOpsHTML}
            </div>
        </div>
    `;
    grid.appendChild(card);
}

function renderEmployeeStatsCounters() {
    const stats = window.employeesCompStats;
    if (!stats) return;

    if (document.getElementById('empActiveCount')) document.getElementById('empActiveCount').innerText = stats.activeCount;
    if (document.getElementById('empArchivedCount')) document.getElementById('empArchivedCount').innerText = stats.archivedCount;
    if (document.getElementById('empTotalCount')) document.getElementById('empTotalCount').innerText = stats.totalEmployees;

    const statsContainer = document.getElementById('employeesStats');
    if (!statsContainer) return;

    const mode = window.currentEmployeeArchiveFilter || 'active'; // 'active', 'archived', 'all'

    let overallTitle = 'إجمالي على رأس العمل';
    let overallCount = stats.activeCount;
    let noCompCount = stats.noCompany.active;

    if (mode === 'archived') {
        overallTitle = 'إجمالي المستقيلين';
        overallCount = stats.archivedCount;
        noCompCount = stats.noCompany.archived;
    } else if (mode === 'all') {
        overallTitle = 'إجمالي السجلات';
        overallCount = stats.totalEmployees;
        noCompCount = stats.noCompany.total;
    }

    let html = `
        <div class="stat-card neu-card emp-filter-card active-filter" data-filter="all" onclick="setEmployeeFilter('all', this)">
            <h5>${overallTitle}</h5>
            <h3>${overallCount}</h3>
        </div>
        <div class="stat-card neu-card emp-filter-card" data-filter="no-company" onclick="setEmployeeFilter('no-company', this)">
            <h5 style="color: #e74c3c;">بدون شركة</h5>
            <h3 style="color: #e74c3c;">${noCompCount}</h3>
            ${mode === 'all' && (stats.noCompany.total > 0) ? `
                <div class="comp-stat-split">
                    <span class="pill-active"><i class="fas fa-user-check"></i> ${stats.noCompany.active} نشط</span>
                    <span class="pill-resigned"><i class="fas fa-user-slash"></i> ${stats.noCompany.archived} استقالة</span>
                </div>
            ` : ''}
        </div>
    `;

    const colors = ['#3182ce', '#38a169', '#d69e2e', '#805ad5', '#319795', '#dd6b20', '#d53f8c', '#2c5282', '#276749', '#b7791f', '#553c9a', '#285e61', '#9c4221', '#97266d'];
    let colorIndex = 0;

    for (const [id, compData] of Object.entries(stats.companies)) {
        let compDisplayCount = compData.active;
        if (mode === 'archived') compDisplayCount = compData.archived;
        else if (mode === 'all') compDisplayCount = compData.total;

        // إظهار كارت الشركة حسب التبويب النشط
        const shouldShow = (mode === 'all') ? (compData.total > 0) : (mode === 'archived' ? (compData.archived > 0) : (compData.active > 0));

        if (shouldShow) {
            const color = colors[colorIndex % colors.length];
            html += `
                <div class="stat-card neu-card emp-filter-card" data-filter="${id}" onclick="setEmployeeFilter('${id}', this)" title="${compData.name}">
                    <h5 style="color: ${color}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; margin-left: auto; margin-right: auto;">${compData.name}</h5>
                    <h3 style="color: ${color};">${compDisplayCount}</h3>
                    ${mode === 'all' ? `
                        <div class="comp-stat-split">
                            <span class="pill-active"><i class="fas fa-user-check"></i> ${compData.active} نشط</span>
                            <span class="pill-resigned"><i class="fas fa-user-slash"></i> ${compData.archived} استقالة</span>
                        </div>
                    ` : ''}
                </div>
            `;
            colorIndex++;
        }
    }

    statsContainer.innerHTML = html;

    if (window.currentEmployeeFilter && window.currentEmployeeFilter !== 'all') {
        const activeCard = document.querySelector(`.emp-filter-card[data-filter="${window.currentEmployeeFilter}"]`);
        if (activeCard) {
            setEmployeeFilter(window.currentEmployeeFilter, activeCard);
        }
    } else {
        filterEmployees();
    }
}

window.currentEmployeeArchiveFilter = 'active'; // 'active', 'archived', 'all'

function setEmployeeArchiveFilter(archiveMode, element) {
    window.currentEmployeeArchiveFilter = archiveMode;
    document.querySelectorAll('.emp-archive-btn').forEach(btn => {
        if (btn.dataset.archive === archiveMode) {
            btn.classList.add('active-archive');
        } else {
            btn.classList.remove('active-archive');
        }
    });
    renderEmployeeStatsCounters();
    filterEmployees();
}

function filterEmployees() {
    const q = document.getElementById('employeeSearch') ? document.getElementById('employeeSearch').value.toLowerCase() : '';
    const grid = document.getElementById('employeesGrid');
    if (!grid) return;
    const cards = grid.getElementsByClassName('pro-card');
    const archiveMode = window.currentEmployeeArchiveFilter || 'active';

    for(let i=0; i<cards.length; i++) {
        const card = cards[i];
        const text = card.innerText.toLowerCase();
        const cardCompanyId = card.getAttribute('data-company-id');
        const isArchived = card.getAttribute('data-archived') === 'true';

        // تصفية الأرشيف والحالة
        let matchesArchive = true;
        if (archiveMode === 'active') {
            matchesArchive = !isArchived;
        } else if (archiveMode === 'archived') {
            matchesArchive = isArchived;
        }

        const matchesCompany = (!window.currentEmployeeFilter || window.currentEmployeeFilter === 'all' || window.currentEmployeeFilter === cardCompanyId);
        
        if (text.includes(q) && matchesCompany && matchesArchive) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    }
}

function setEmployeeFilter(filterValue, element) {
    window.currentEmployeeFilter = filterValue;
    const statCards = document.querySelectorAll('.emp-filter-card');
    statCards.forEach(c => {
        c.classList.remove('active-filter');
        c.style.boxShadow = 'none';
        if (c === element) {
            c.classList.add('active-filter');
            c.style.boxShadow = `0 0 15px var(--accent)`;
        }
    });
    filterEmployees();
}

function filterCompanies() {
    const q = document.getElementById('companySearch') ? document.getElementById('companySearch').value.toLowerCase() : '';
    const grid = document.getElementById('companiesGrid');
    if (!grid) return;
    const cards = grid.getElementsByClassName('pro-card');
    for(let i=0; i<cards.length; i++) {
        const text = cards[i].innerText.toLowerCase();
        if(text.includes(q)) {
            cards[i].style.display = 'block';
        } else {
            cards[i].style.display = 'none';
        }
    }
}

// ==========================================
// البحث والملء التلقائي للاستمارات (Form Hub)
// ==========================================
let allCompaniesForSearch = [];
let allEmployeesForSearch = [];

async function loadSearchData() {
    if (typeof isGuestMode !== 'undefined' && isGuestMode) {
        allCompaniesForSearch = (guestData && guestData.companies) ? [...guestData.companies] : [];
        allEmployeesForSearch = (guestData && guestData.employees) ? [...guestData.employees] : [];
        window.allEmployeesForSearch = allEmployeesForSearch;
        populateLiveEditorDropdowns();
        return;
    }

    try {
        const uid = (typeof getCurrentUserId === 'function') ? getCurrentUserId() : null;
        const isAdmin = (typeof isCurrentUserAdmin === 'function') ? isCurrentUserAdmin() : false;

        let compQuery = db.collection('companies');
        let empQuery = db.collection('employees');
        if (!isAdmin && uid) {
            compQuery = compQuery.where('userId', '==', uid);
            empQuery = empQuery.where('userId', '==', uid);
        }

        const [cSnap, eSnap] = await Promise.all([compQuery.get(), empQuery.get()]);
        allCompaniesForSearch = [];
        cSnap.forEach(doc => allCompaniesForSearch.push({ id: doc.id, ...doc.data() }));
        
        allEmployeesForSearch = [];
        eSnap.forEach(doc => allEmployeesForSearch.push({ id: doc.id, ...doc.data() }));
        window.allEmployeesForSearch = allEmployeesForSearch;
        populateLiveEditorDropdowns();
    } catch(err) {
        console.error("Error loading search data:", err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(loadSearchData, 1000);
});

function handleCompanySearch(query) {
    const dropdown = document.getElementById('company_dropdown');
    const empDropdown = document.getElementById('employee_dropdown');
    if(empDropdown) empDropdown.style.display = 'none';
    
    if(!query.trim()) {
        if (dropdown) dropdown.style.display = 'none';
        return;
    }
    
    query = query.toLowerCase();
    const results = allCompaniesForSearch.filter(c => 
        (c.name && c.name.toLowerCase().includes(query)) || 
        (c.code && String(c.code).includes(query))
    );
    
    if(results.length === 0) {
        dropdown.innerHTML = '<div class="no-results-pad">لا توجد نتائج</div>';
    } else {
        dropdown.innerHTML = results.slice(0, 10).map(c => `
            <div class="custom-dropdown-item" onclick="selectCompanySearch('${c.id}')">
                <div class="custom-dropdown-title">${c.name}</div>
                <div class="custom-dropdown-sub">كود: ${c.code || '-'}</div>
            </div>
        `).join('');
    }
    dropdown.style.display = 'block';
}

function handleEmployeeSearch(query) {
    const dropdown = document.getElementById('employee_dropdown');
    const compDropdown = document.getElementById('company_dropdown');
    if (compDropdown) compDropdown.style.display = 'none';
    
    if(!query.trim()) {
        if (dropdown) dropdown.style.display = 'none';
        return;
    }
    
    query = query.toLowerCase();
    const results = allEmployeesForSearch.filter(e => 
        (e.name && e.name.toLowerCase().includes(query)) || 
        (e.code && String(e.code).includes(query)) ||
        (e.nat_id && String(e.nat_id).includes(query))
    );
    
    if(results.length === 0) {
        dropdown.innerHTML = '<div class="no-results-pad">لا توجد نتائج</div>';
    } else {
        dropdown.innerHTML = results.slice(0, 10).map(e => `
            <div class="custom-dropdown-item" onclick="selectEmployeeSearch('${e.id}')">
                <div class="custom-dropdown-title">${e.name}</div>
                <div class="custom-dropdown-sub">كود: ${e.code || '-'} | قومي: ${e.nat_id || '-'}</div>
            </div>
        `).join('');
    }
    dropdown.style.display = 'block';
}

window.currentSelectedCompany = null;
window.currentSelectedEmployee = null;

async function selectCompanySearch(companyId) {
    const compDrop = document.getElementById('company_dropdown');
    if (compDrop) compDrop.style.display = 'none';
    const comp = allCompaniesForSearch.find(c => c.id === companyId);
    if(comp) {
        const cSearch = document.getElementById('search_company');
        if (cSearch) cSearch.value = comp.name;
        
        // س1
        safeSet('office_name', comp.office_name);
        safeSet('fac_name', comp.name);
        safeSet('back_fac_name', comp.name);
        safeSet('fac_number', comp.fac_number || comp.ins_num);
        safeSet('back_fac_ins_num', comp.ins_num);
        safeSet('back_fac_address', comp.address);
        safeSet('fac_manager', comp.manager);
        safeSet('fac_address', comp.address);
        safeSet('fac_ins_num', comp.ins_num);
        safeSet('fac_commercial_reg', comp.comm_reg);
        safeSet('fac_legal_entity', comp.legal_entity);
        ['fac_type_1', 'fac_type_2', 'fac_type_3', 'fac_type_4'].forEach(id => safeSet(id, ''));
        if(comp.fac_type) safeSet(`fac_type_${String(comp.fac_type).trim()}`, '✔');

        // س6
        safeSet('s6_office_name', comp.office_name);
        safeSet('s6_fac_name', comp.name);
        safeSet('s6_fac_number', comp.fac_number || comp.ins_num);
        safeSet('s6_back_fac_name', comp.name);
        safeSet('s6_back_fac_ins_num', comp.fac_number || comp.ins_num);
        safeSet('s6_back_fac_address', comp.address);
        
        // مزامنة اللوحة الجانبية
        safeSet('live_fac_name', comp.name);
        safeSet('live_fac_number', comp.fac_number || comp.ins_num);
        safeSet('live_fac_address', comp.address);
        safeSet('live_office_name', comp.office_name);
        safeSet('live_manager_name', comp.manager);
        safeSet('live_manager_phone', comp.manager_phone);
        const compSel = document.getElementById('live_company_select');
        if (compSel) compSel.value = comp.id;

        window.currentSelectedCompany = comp;
        updateApplicantData();
        
        showNotification('تم جلب بيانات الشركة بنجاح', 'success');
    }
}

async function selectEmployeeSearch(employeeId) {
    const empDrop = document.getElementById('employee_dropdown');
    if (empDrop) empDrop.style.display = 'none';
    const emp = allEmployeesForSearch.find(e => e.id === employeeId);
    if(emp) {
        window.currentSelectedEmployee = emp;
        const eSearch = document.getElementById('search_employee');
        if (eSearch) eSearch.value = emp.name;
        
        // س1
        safeSet('emp_name', emp.name);
        safeSet('back_emp_name', emp.name);
        safeSet('emp_ins_num', emp.ins_num);
        safeSet('emp_nat_id', emp.nat_id);
        safeSet('emp_nationality', 'مصري');
        safeSet('emp_qualification', emp.qualification);
        safeSet('emp_profession', emp.occupation);
        safeSet('emp_duration_type', emp.duration_type);
        safeSet('emp_sub_code', emp.duration_type === 'مؤقت' ? '2' : '1');
        safeSet('emp_wage_pounds', emp.sub_wage);
        safeSet('emp_comp_wage_pounds', emp.comp_wage);
        safeSet('emp_disability_pct', emp.disability_percent);
        safeSet('sig_insured', emp.name);
        safeSet('sig_phone', emp.phone);
        
        if (emp.has_disability && emp.disability_date) {
            const parts = emp.disability_date.split('-');
            if(parts.length === 3) {
                safeSet('emp_disability_start_year', parts[0]);
                safeSet('emp_disability_start_month', parts[1]);
                safeSet('emp_disability_start_day', parts[2]);
                safeSet('live_emp_disability_date', emp.disability_date);
            }
        }
        
        safeSet('res_building', emp.building_no);
        safeSet('res_street', emp.street);
        safeSet('res_village', emp.village);
        safeSet('res_center', emp.center);
        safeSet('res_gov', emp.gov);
        
        if(emp.sub_start_date) {
            const parts = emp.sub_start_date.split('-');
            if(parts.length === 3) {
                safeSet('emp_sub_date_year', parts[0]);
                safeSet('emp_sub_date_month', parts[1]);
                safeSet('emp_sub_date_day', parts[2]);
                safeSet('sig_date_year', parts[0]);
                safeSet('sig_date_month', parts[1]);
                safeSet('sig_date_day', parts[2]);
                safeSet('live_sub_date', emp.sub_start_date);
                safeSet('live_sig_date', emp.sub_start_date);
            }
        }

        // س6
        safeSet('s6_emp_name', emp.name);
        safeSet('s6_emp_ins_num', emp.ins_num);
        safeSet('s6_emp_nat_id', emp.nat_id);
        safeSet('s6_back_emp_name', emp.name);
        safeSet('s6_back_emp_ins_num', emp.ins_num);

        // تاريخ وسبب الاستقالة / إنهاء الخدمة لس6
        const exitDate = emp.resignation_date || '';
        const exitReason = emp.resignation_reason || 'استقالة';
        safeSet('s6_resignation_reason', exitReason);
        safeSet('live_resignation_reason', exitReason);

        if (exitDate) {
            const expParts = exitDate.split('-');
            if (expParts.length === 3) {
                safeSet('s6_exit_date_year', expParts[0]);
                safeSet('s6_exit_date_month', expParts[1]);
                safeSet('s6_exit_date_day', expParts[2]);
                safeSet('live_exit_date', exitDate);
            }
        }
        
        // مزامنة اللوحة الجانبية
        safeSet('live_emp_name', emp.name);
        safeSet('live_emp_nat_id', emp.nat_id);
        safeSet('live_emp_ins_num', emp.ins_num);
        safeSet('live_emp_profession', emp.occupation);
        safeSet('live_emp_qualification', emp.qualification);
        safeSet('live_emp_nationality', 'مصري');
        safeSet('live_emp_phone', emp.phone);
        safeSet('live_res_building', emp.building_no);
        safeSet('live_res_street', emp.street);
        safeSet('live_res_village', emp.village);
        safeSet('live_res_center', emp.center);
        safeSet('live_res_gov', emp.gov);
        safeSet('live_emp_duration_type', emp.duration_type || 'نمطي');
        safeSet('live_emp_wage', emp.sub_wage);
        safeSet('live_emp_comp_wage', emp.comp_wage);
        safeSet('live_emp_disability_pct', emp.disability_percent);
        const empSel = document.getElementById('live_employee_select');
        if (empSel) empSel.value = emp.id;

        updateApplicantData();

        if(emp.company_id) {
            await selectCompanySearch(emp.company_id);
        } else {
            showNotification('تم جلب بيانات الموظف بنجاح (الموظف غير مربوط بشركة)', 'success');
        }
    }
}

// تبديل نوع الاستمارة المعروضة (س1 vs س6)
window.currentActiveForm = 's1';

function switchActiveForm(formType) {
    window.currentActiveForm = formType;
    const tabS1 = document.getElementById('tab_form_s1');
    const tabS6 = document.getElementById('tab_form_s6');
    const s1Container = document.getElementById('s1_form_container');
    const s6Container = document.getElementById('s6_form_container');
    const s1CatSection = document.getElementById('s1_category_section');
    const s6ReasonSection = document.getElementById('s6_reason_section');
    const cardS1 = document.querySelector('.drawer-card-s1');
    const cardS6 = document.querySelector('.drawer-card-s6');

    if (formType === 's6') {
        if (tabS1) tabS1.classList.remove('form-tab-active');
        if (tabS6) tabS6.classList.add('form-tab-active');
        if (s1Container) {
            s1Container.classList.add('d-none');
            s1Container.style.display = 'none';
        }
        if (s6Container) {
            s6Container.classList.remove('d-none');
            s6Container.style.display = 'block';
        }
        
        // تحديث لوحة الاختيارات الكلاسيكية (إخفاء فئة س1 وإظهار سبب إنهاء خدمة س6)
        if (s1CatSection) {
            s1CatSection.classList.add('d-none');
            s1CatSection.style.display = 'none';
        }
        if (s6ReasonSection) {
            s6ReasonSection.classList.remove('d-none');
            s6ReasonSection.style.display = 'block';
        }
        
        // تحديث لوحة الإدخال الحية (إخفاء كارت س1 وإظهار كارت س6)
        if (cardS1) {
            cardS1.classList.add('d-none');
            cardS1.style.display = 'none';
        }
        if (cardS6) {
            cardS6.classList.remove('d-none');
            cardS6.style.display = 'block';
            cardS6.style.opacity = '1';
            cardS6.style.borderColor = 'rgba(245, 158, 11, 0.6)';
        }
    } else {
        if (tabS6) tabS6.classList.remove('form-tab-active');
        if (tabS1) tabS1.classList.add('form-tab-active');
        if (s6Container) {
            s6Container.classList.add('d-none');
            s6Container.style.display = 'none';
        }
        if (s1Container) {
            s1Container.classList.remove('d-none');
            s1Container.style.display = 'block';
        }
        
        // تحديث لوحة الاختيارات الكلاسيكية (إظهار فئة س1 وإخفاء سبب إنهاء خدمة س6)
        if (s6ReasonSection) {
            s6ReasonSection.classList.add('d-none');
            s6ReasonSection.style.display = 'none';
        }
        if (s1CatSection) {
            s1CatSection.classList.remove('d-none');
            s1CatSection.style.display = 'block';
        }
        
        // تحديث لوحة الإدخال الحية (إظهار كارت س1 وإخفاء كارت س6)
        if (cardS6) {
            cardS6.classList.add('d-none');
            cardS6.style.display = 'none';
        }
        if (cardS1) {
            cardS1.classList.remove('d-none');
            cardS1.style.display = 'block';
            cardS1.style.opacity = '1';
            cardS1.style.borderColor = 'rgba(16, 185, 129, 0.6)';
        }
    }
}

function updateS6Reason(val) {
    safeSet('s6_resignation_reason', val);
    safeSet('live_resignation_reason', val);
}

function updateApplicantData() {
    const applicantTypeRadios = document.getElementsByName('applicant_type');
    let selectedType = 'employee';
    for (let radio of applicantTypeRadios) {
        if (radio.checked) {
            selectedType = radio.value;
            break;
        }
    }
    
    // س1
    safeSet('applicant_name', '');
    safeSet('applicant_capacity', '');
    safeSet('applicant_ins_num', '');
    safeSet('applicant_nat_id', '');
    safeSet('applicant_phone', '');

    // س6
    safeSet('s6_applicant_name', '');
    safeSet('s6_applicant_capacity', '');
    safeSet('s6_applicant_ins_num', '');
    safeSet('s6_applicant_nat_id', '');
    safeSet('s6_applicant_phone', '');
    
    if (selectedType === 'employer' && window.currentSelectedCompany) {
        const comp = window.currentSelectedCompany;
        const name = comp.manager || '';
        const cap = comp.manager_title || 'صاحب العمل';
        const ins = comp.manager_ins_num || '';
        const nat = comp.manager_nat_id || '';
        const phone = comp.manager_phone || '';

        safeSet('applicant_name', name);
        safeSet('applicant_capacity', cap);
        safeSet('applicant_ins_num', ins);
        safeSet('applicant_nat_id', nat);
        safeSet('applicant_phone', phone);

        safeSet('s6_applicant_name', name);
        safeSet('s6_applicant_capacity', cap);
        safeSet('s6_applicant_ins_num', ins);
        safeSet('s6_applicant_nat_id', nat);
        safeSet('s6_applicant_phone', phone);

        safeSet('live_applicant_name', name);
        safeSet('live_applicant_ins_num', ins);
        safeSet('live_applicant_nat_id', nat);
        safeSet('live_applicant_phone', phone);
    } 
    else if (selectedType === 'agent' && window.currentSelectedCompany) {
        const comp = window.currentSelectedCompany;
        const name = comp.agent_name || '';
        const cap = comp.agent_title || 'مفوض';
        const ins = comp.agent_ins_num || '';
        const nat = comp.agent_nat_id || '';
        const phone = comp.agent_phone || '';

        safeSet('applicant_name', name);
        safeSet('applicant_capacity', cap);
        safeSet('applicant_ins_num', ins);
        safeSet('applicant_nat_id', nat);
        safeSet('applicant_phone', phone);

        safeSet('s6_applicant_name', name);
        safeSet('s6_applicant_capacity', cap);
        safeSet('s6_applicant_ins_num', ins);
        safeSet('s6_applicant_nat_id', nat);
        safeSet('s6_applicant_phone', phone);

        safeSet('live_applicant_name', name);
        safeSet('live_applicant_ins_num', ins);
        safeSet('live_applicant_nat_id', nat);
        safeSet('live_applicant_phone', phone);
    }
    else if (selectedType === 'employee' && window.currentSelectedEmployee) {
        const emp = window.currentSelectedEmployee;
        const name = emp.name || '';
        const cap = 'المؤمن عليه';
        const ins = emp.ins_num || '';
        const nat = emp.nat_id || '';
        const phone = emp.phone || '';

        safeSet('applicant_name', name);
        safeSet('applicant_capacity', cap);
        safeSet('applicant_ins_num', ins);
        safeSet('applicant_nat_id', nat);
        safeSet('applicant_phone', phone);

        safeSet('s6_applicant_name', name);
        safeSet('s6_applicant_capacity', cap);
        safeSet('s6_applicant_ins_num', ins);
        safeSet('s6_applicant_nat_id', nat);
        safeSet('s6_applicant_phone', phone);

        safeSet('live_applicant_name', name);
        safeSet('live_applicant_ins_num', ins);
        safeSet('live_applicant_nat_id', nat);
        safeSet('live_applicant_phone', phone);
    }
}

function updateCategoryData() {
    const categoryRadios = document.getElementsByName('category_type');
    let selectedType = null;
    for (let radio of categoryRadios) {
        if (radio.checked) {
            selectedType = radio.value;
            break;
        }
    }
    
    safeSet('category_1', '');
    safeSet('category_2', '');
    safeSet('category_3', '');
    
    if (selectedType) {
        safeSet(`category_${selectedType}`, '✔');
    }
}

function safeSet(id, val) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = (val !== null && val !== undefined) ? val : '';
}

function clearFormFields() {
    const inputs = document.querySelectorAll('.a4-page input, .a4-page-back input, .a4-page-s6 input, .a4-page-s6-back input');
    inputs.forEach(input => input.value = '');
    const cSearch = document.getElementById('search_company');
    if (cSearch) cSearch.value = '';
    const eSearch = document.getElementById('search_employee');
    if (eSearch) eSearch.value = '';
    window.currentSelectedCompany = null;
    window.currentSelectedEmployee = null;
}

// ==========================================================================
// وظائف نموذج إدخال وتعديل البيانات الحي (Live Data Entry & Real-time Sync)
// ==========================================================================

function populateLiveEditorDropdowns() {
    const compSelect = document.getElementById('live_company_select');
    const empSelect = document.getElementById('live_employee_select');
    
    if (compSelect && allCompaniesForSearch) {
        const currentVal = compSelect.value;
        compSelect.innerHTML = '<option value="">-- اختر شركة للتحميل التلقائي --</option>' +
            allCompaniesForSearch.map(c => `<option value="${c.id}">${c.name || 'شركة'} (${c.code || '-'})</option>`).join('');
        if (currentVal) compSelect.value = currentVal;
    }
    
    if (empSelect && allEmployeesForSearch) {
        const currentVal = empSelect.value;
        empSelect.innerHTML = '<option value="">-- اختر موظفاً للتحميل التلقائي --</option>' +
            allEmployeesForSearch.map(e => `<option value="${e.id}">${e.name || 'موظف'} (${e.code || e.nat_id || '-'})</option>`).join('');
        if (currentVal) empSelect.value = currentVal;
    }
}

function handleLiveCompanySelect(compId) {
    if (!compId) return;
    selectCompanySearch(compId);
}

function handleLiveEmployeeSelect(empId) {
    if (!empId) return;
    selectEmployeeSearch(empId);
}

function syncLiveInput(fieldKey, val) {
    val = val || '';
    
    switch(fieldKey) {
        // الشركة
        case 'fac_name':
            safeSet('fac_name', val);
            safeSet('back_fac_name', val);
            safeSet('s6_fac_name', val);
            safeSet('s6_back_fac_name', val);
            break;
        case 'fac_number':
            safeSet('fac_number', val);
            safeSet('back_fac_ins_num', val);
            safeSet('s6_fac_number', val);
            safeSet('s6_back_fac_ins_num', val);
            break;
        case 'fac_address':
            safeSet('back_fac_address', val);
            safeSet('s6_back_fac_address', val);
            break;
        case 'office_name':
            safeSet('office_name', val);
            safeSet('s6_office_name', val);
            break;
        case 'manager_name':
            if (document.querySelector('input[name="live_applicant_type"]:checked')?.value === 'employer') {
                safeSet('applicant_name', val);
                safeSet('s6_applicant_name', val);
                safeSet('live_applicant_name', val);
            }
            break;
        case 'manager_phone':
            if (document.querySelector('input[name="live_applicant_type"]:checked')?.value === 'employer') {
                safeSet('applicant_phone', val);
                safeSet('s6_applicant_phone', val);
                safeSet('live_applicant_phone', val);
            }
            break;

        // الموظف
        case 'emp_name':
            safeSet('emp_name', val);
            safeSet('back_emp_name', val);
            safeSet('sig_insured', val);
            safeSet('s6_emp_name', val);
            safeSet('s6_back_emp_name', val);
            if (document.querySelector('input[name="live_applicant_type"]:checked')?.value === 'employee') {
                safeSet('applicant_name', val);
                safeSet('s6_applicant_name', val);
                safeSet('live_applicant_name', val);
            }
            break;
        case 'emp_nat_id':
            safeSet('emp_nat_id', val);
            safeSet('s6_emp_nat_id', val);
            if (document.querySelector('input[name="live_applicant_type"]:checked')?.value === 'employee') {
                safeSet('applicant_nat_id', val);
                safeSet('s6_applicant_nat_id', val);
                safeSet('live_applicant_nat_id', val);
            }
            break;
        case 'emp_ins_num':
            safeSet('emp_ins_num', val);
            safeSet('s6_emp_ins_num', val);
            safeSet('s6_back_emp_ins_num', val);
            if (document.querySelector('input[name="live_applicant_type"]:checked')?.value === 'employee') {
                safeSet('applicant_ins_num', val);
                safeSet('s6_applicant_ins_num', val);
                safeSet('live_applicant_ins_num', val);
            }
            break;
        case 'emp_profession':
            safeSet('emp_profession', val);
            break;
        case 'emp_qualification':
            safeSet('emp_qualification', val);
            break;
        case 'emp_nationality':
            safeSet('emp_nationality', val);
            break;
        case 'emp_phone':
            safeSet('sig_phone', val);
            if (document.querySelector('input[name="live_applicant_type"]:checked')?.value === 'employee') {
                safeSet('applicant_phone', val);
                safeSet('s6_applicant_phone', val);
                safeSet('live_applicant_phone', val);
            }
            break;
        case 'res_building':
            safeSet('res_building', val);
            break;
        case 'res_street':
            safeSet('res_street', val);
            break;
        case 'res_village':
            safeSet('res_village', val);
            break;
        case 'res_center':
            safeSet('res_center', val);
            break;
        case 'res_gov':
            safeSet('res_gov', val);
            break;

        // التعيين (س1)
        case 'emp_duration_type':
            safeSet('emp_duration_type', val);
            safeSet('emp_sub_code', val === 'مؤقت' ? '2' : '1');
            break;
        case 'emp_wage':
            safeSet('emp_wage_pounds', val);
            break;
        case 'emp_comp_wage':
            safeSet('emp_comp_wage_pounds', val);
            break;
        case 'emp_sector':
            safeSet('emp_sector', val);
            break;
        case 'emp_disability_pct':
            safeSet('emp_disability_pct', val);
            break;

        // الاستقالة (س6)
        case 'resignation_reason':
            safeSet('s6_resignation_reason', val);
            break;

        // مقدم الطلب
        case 'applicant_name':
            safeSet('applicant_name', val);
            safeSet('s6_applicant_name', val);
            break;
        case 'applicant_ins_num':
            safeSet('applicant_ins_num', val);
            safeSet('s6_applicant_ins_num', val);
            break;
        case 'applicant_nat_id':
            safeSet('applicant_nat_id', val);
            safeSet('s6_applicant_nat_id', val);
            break;
        case 'applicant_phone':
            safeSet('applicant_phone', val);
            safeSet('s6_applicant_phone', val);
            break;
    }
}

function syncLiveDate(dateType, dateStr) {
    if (!dateStr) return;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return;
    const [year, month, day] = parts;
    
    if (dateType === 'sub_date') {
        safeSet('emp_sub_date_year', year);
        safeSet('emp_sub_date_month', month);
        safeSet('emp_sub_date_day', day);
        safeSet('sig_date_year', year);
        safeSet('sig_date_month', month);
        safeSet('sig_date_day', day);
        safeSet('live_sig_date', dateStr);
    } else if (dateType === 'exit_date') {
        safeSet('s6_exit_date_year', year);
        safeSet('s6_exit_date_month', month);
        safeSet('s6_exit_date_day', day);
    } else if (dateType === 'disability_date') {
        safeSet('emp_disability_start_year', year);
        safeSet('emp_disability_start_month', month);
        safeSet('emp_disability_start_day', day);
    } else if (dateType === 'sig_date') {
        safeSet('sig_date_year', year);
        safeSet('sig_date_month', month);
        safeSet('sig_date_day', day);
    }
}

function syncCategoryLive(val) {
    safeSet('category_1', '');
    safeSet('category_2', '');
    safeSet('category_3', '');
    if (val) safeSet(`category_${val}`, '✔');
}

function handleLiveApplicantTypeChange(type) {
    let name = '', cap = '', ins = '', nat = '', phone = '';
    
    if (type === 'employer') {
        cap = 'صاحب العمل';
        name = document.getElementById('live_manager_name')?.value || window.currentSelectedCompany?.manager || '';
        phone = document.getElementById('live_manager_phone')?.value || window.currentSelectedCompany?.manager_phone || '';
        ins = window.currentSelectedCompany?.manager_ins_num || '';
        nat = window.currentSelectedCompany?.manager_nat_id || '';
    } else if (type === 'agent') {
        cap = 'المفوض / الوكيل';
        name = window.currentSelectedCompany?.agent_name || document.getElementById('live_manager_name')?.value || '';
        phone = window.currentSelectedCompany?.agent_phone || document.getElementById('live_manager_phone')?.value || '';
        ins = window.currentSelectedCompany?.agent_ins_num || '';
        nat = window.currentSelectedCompany?.agent_nat_id || '';
    } else {
        cap = 'المؤمن عليه';
        name = document.getElementById('live_emp_name')?.value || window.currentSelectedEmployee?.name || '';
        ins = document.getElementById('live_emp_ins_num')?.value || window.currentSelectedEmployee?.ins_num || '';
        nat = document.getElementById('live_emp_nat_id')?.value || window.currentSelectedEmployee?.nat_id || '';
        phone = document.getElementById('live_emp_phone')?.value || window.currentSelectedEmployee?.phone || '';
    }
    
    safeSet('applicant_name', name);
    safeSet('applicant_capacity', cap);
    safeSet('applicant_ins_num', ins);
    safeSet('applicant_nat_id', nat);
    safeSet('applicant_phone', phone);
    
    safeSet('s6_applicant_name', name);
    safeSet('s6_applicant_capacity', cap);
    safeSet('s6_applicant_ins_num', ins);
    safeSet('s6_applicant_nat_id', nat);
    safeSet('s6_applicant_phone', phone);
    
    safeSet('live_applicant_name', name);
    safeSet('live_applicant_ins_num', ins);
    safeSet('live_applicant_nat_id', nat);
    safeSet('live_applicant_phone', phone);
}

function fillDemoHireData() {
    switchActiveForm('s1');
    
    // الشركة
    safeSet('live_fac_name', 'مجموعة ماستر جروب الدولية للحلول المتطورة');
    safeSet('live_fac_number', '108924551');
    safeSet('live_fac_address', '15 شارع الثورة، الكوربة، مصر الجديدة، القاهرة');
    safeSet('live_office_name', 'مكتب تأمينات مصر الجديدة');
    safeSet('live_manager_name', 'د. محمد محمد عبد الدايم عبد الواحد');
    safeSet('live_manager_phone', '01093539583');
    
    // الموظف
    safeSet('live_emp_name', 'محمد مجدي الشامي سعيد');
    safeSet('live_emp_nat_id', '29302010119378');
    safeSet('live_emp_ins_num', '483920194');
    safeSet('live_emp_profession', 'أخصائي أول موارد بشرية (HR Specialist)');
    safeSet('live_emp_qualification', 'بكالوريوس تجارة - إدارة أعمال');
    safeSet('live_emp_nationality', 'مصري');
    safeSet('live_emp_phone', '01093539583');
    
    safeSet('live_res_building', '12');
    safeSet('live_res_street', 'شارع النصر');
    safeSet('live_res_village', 'المعادي الجديدة');
    safeSet('live_res_center', 'البساتين والمعادي');
    safeSet('live_res_gov', 'القاهرة');
    
    // التعيين
    const today = new Date().toISOString().split('T')[0];
    safeSet('live_sub_date', today);
    safeSet('live_emp_duration_type', 'نمطي');
    safeSet('live_emp_wage', '7500');
    safeSet('live_emp_comp_wage', '9800');
    safeSet('live_emp_sector', 'خاص');
    safeSet('live_sig_date', today);
    
    // المزامنة للاستمارة
    syncLiveInput('fac_name', 'مجموعة ماستر جروب الدولية للحلول المتطورة');
    syncLiveInput('fac_number', '108924551');
    syncLiveInput('fac_address', '15 شارع الثورة، الكوربة، مصر الجديدة، القاهرة');
    syncLiveInput('office_name', 'مكتب تأمينات مصر الجديدة');
    syncLiveInput('emp_name', 'محمد مجدي الشامي سعيد');
    syncLiveInput('emp_nat_id', '29302010119378');
    syncLiveInput('emp_ins_num', '483920194');
    syncLiveInput('emp_profession', 'أخصائي أول موارد بشرية (HR Specialist)');
    syncLiveInput('emp_qualification', 'بكالوريوس تجارة - إدارة أعمال');
    syncLiveInput('emp_nationality', 'مصري');
    syncLiveInput('emp_phone', '01093539583');
    syncLiveInput('res_building', '12');
    syncLiveInput('res_street', 'شارع النصر');
    syncLiveInput('res_village', 'المعادي الجديدة');
    syncLiveInput('res_center', 'البساتين والمعادي');
    syncLiveInput('res_gov', 'القاهرة');
    syncLiveInput('emp_wage', '7500');
    syncLiveInput('emp_comp_wage', '9800');
    syncLiveInput('emp_sector', 'خاص');
    syncLiveDate('sub_date', today);
    syncCategoryLive('1');
    handleLiveApplicantTypeChange('employee');
    
    showNotification('تم ملء وتجهيز بيانات تعيين تجريبية في استمارة س1 بنجاح!', 'success');
}

function fillDemoResignData() {
    switchActiveForm('s6');
    
    // الشركة
    safeSet('live_fac_name', 'شركة الترابط لتكنولوجيا الاتصالات والمعلومات');
    safeSet('live_fac_number', '984520114');
    safeSet('live_fac_address', 'القرية الذكية، المبنى الإداري B4، طريق الإسكندرية الصحراوي');
    safeSet('live_office_name', 'مكتب تأمينات 6 أكتوبر أول');
    safeSet('live_manager_name', 'أ. أحمد حسني عبد العزيز');
    safeSet('live_manager_phone', '01223456789');
    
    // الموظف
    safeSet('live_emp_name', 'إبراهيم خالد متولي أحمد');
    safeSet('live_emp_nat_id', '29004150102456');
    safeSet('live_emp_ins_num', '662019483');
    safeSet('live_emp_profession', 'مهندس شبكات ونظم');
    safeSet('live_emp_qualification', 'بكالوريوس هندسة اتصالات');
    safeSet('live_emp_nationality', 'مصري');
    safeSet('live_emp_phone', '01122334455');
    
    const today = new Date().toISOString().split('T')[0];
    safeSet('live_exit_date', today);
    safeSet('live_resignation_reason', 'استقالة');
    
    // المزامنة للاستمارة
    syncLiveInput('fac_name', 'شركة الترابط لتكنولوجيا الاتصالات والمعلومات');
    syncLiveInput('fac_number', '984520114');
    syncLiveInput('fac_address', 'القرية الذكية، المبنى الإداري B4، طريق الإسكندرية الصحراوي');
    syncLiveInput('office_name', 'مكتب تأمينات 6 أكتوبر أول');
    syncLiveInput('emp_name', 'إبراهيم خالد متولي أحمد');
    syncLiveInput('emp_nat_id', '29004150102456');
    syncLiveInput('emp_ins_num', '662019483');
    syncLiveInput('resignation_reason', 'استقالة');
    syncLiveDate('exit_date', today);
    handleLiveApplicantTypeChange('employee');
    
    showNotification('تم ملء وتجهيز بيانات استقالة تجريبية في استمارة س6 بنجاح!', 'success');
}

function clearAllFormAndDrawerFields() {
    clearFormFields();
    
    // تفريغ حقول اللوحة الجانبية
    const drawerInputs = document.querySelectorAll('#formLiveEditorDrawer input, #formLiveEditorDrawer select');
    drawerInputs.forEach(input => {
        if (input.type === 'radio') {
            if (input.value === 'employee' || input.value === '1') input.checked = true;
        } else {
            input.value = '';
        }
    });
    
    showNotification('تم تفريغ الاستمارة واللوحة بالكامل', 'info');
}

// فتح/إغلاق لوحة نموذج إدخال وتعديل البيانات الحي
function toggleLiveEditorDrawer(forceState) {
    const drawer = document.getElementById('formLiveEditorDrawer');
    const classicPanel = document.getElementById('applicantSelectorPanel');
    const toggleBtn = document.getElementById('btn-toggle-live-editor');
    
    if (!drawer) return;
    
    const isCurrentlyOpen = !drawer.classList.contains('d-none') && drawer.style.display !== 'none';
    const shouldOpen = (forceState !== undefined) ? forceState : !isCurrentlyOpen;
    
    if (shouldOpen) {
        drawer.classList.remove('d-none');
        drawer.style.display = 'flex';
        if (classicPanel) {
            classicPanel.classList.add('d-none');
            classicPanel.style.display = 'none';
        }
        if (toggleBtn) toggleBtn.classList.add('active-toggle');
        populateLiveEditorDropdowns();
        showNotification('تم تفعيل نموذج إدخال وتعديل البيانات الحي', 'info');
    } else {
        drawer.classList.add('d-none');
        drawer.style.display = 'none';
        if (classicPanel) {
            classicPanel.classList.remove('d-none');
            classicPanel.style.display = 'block';
        }
        if (toggleBtn) toggleBtn.classList.remove('active-toggle');
        showNotification('تم الرجوع للعرض الأساسي للاستمارة', 'info');
    }
}

document.addEventListener('click', function(e) {
    if(!e.target.closest('#floating-action-bar')) {
        const cDrop = document.getElementById('company_dropdown');
        const eDrop = document.getElementById('employee_dropdown');
        if(cDrop) cDrop.style.display = 'none';
        if(eDrop) eDrop.style.display = 'none';
    }
});

// ملاءمة حجم الخط تلقائياً للنصوص الطويلة داخل الحقول
setInterval(() => {
    document.querySelectorAll('.overlay-input').forEach(input => {
        if (input.type === 'text' && !input.hasAttribute('maxlength') && input.value) {
            let currentSize = parseFloat(window.getComputedStyle(input).fontSize) || 16;
            if (input.scrollWidth > input.clientWidth + 2) {
                while (input.scrollWidth > input.clientWidth + 2 && currentSize > 9) {
                    currentSize -= 0.5;
                    input.style.fontSize = currentSize + 'px';
                }
            } else if (currentSize < 16) {
                while (currentSize < 16) {
                    input.style.fontSize = (currentSize + 0.5) + 'px';
                    if (input.scrollWidth > input.clientWidth + 2) {
                        input.style.fontSize = currentSize + 'px';
                        break;
                    }
                    currentSize += 0.5;
                }
            }
        } else if (input.type === 'text' && !input.hasAttribute('maxlength') && !input.value) {
            input.style.fontSize = '16px';
        }
    });
}, 800);

// ==========================================
// نوافذ الاستمارات والربط (Modals & Operations Integration)
// ==========================================
window.currentSelectedEmployeeId = null;

function closeModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.style.display = 'none';
}

function handleOpenEmployeeFormModal(event, id) {
    if (event) event.stopPropagation();
    window.currentSelectedEmployeeId = id;
    const m = document.getElementById('employeeFormModal');
    if (m) m.style.display = 'flex';
}

function handleOpenEmployeeOperationModal(event, id) {
    if (event) event.stopPropagation();
    window.currentSelectedEmployeeId = id;
    const m = document.getElementById('employeeOperationChoiceModal');
    if (m) m.style.display = 'flex';
}

async function fillEmployeeForm(formType) {
    if (!window.currentSelectedEmployeeId) {
        showNotification('لم يتم تحديد موظف', 'error');
        return;
    }
    
    try {
        const empId = window.currentSelectedEmployeeId;
        
        // Ensure search data is ready
        if (!allEmployeesForSearch || allEmployeesForSearch.length === 0) {
            await loadSearchData();
        }
        
        let emp = allEmployeesForSearch.find(e => e.id === empId);
        
        // Fallback: check in-memory list or guest data or firestore
        if (!emp) {
            if (window.allEmployeesList && window.allEmployeesList.length > 0) {
                emp = window.allEmployeesList.find(e => e.id === empId);
            } else if (window.employeesData && window.employeesData.length > 0) {
                emp = window.employeesData.find(e => e.id === empId);
            } else if (typeof isGuestMode !== 'undefined' && isGuestMode && typeof guestData !== 'undefined' && guestData.employees) {
                emp = guestData.employees.find(e => e.id === empId);
            } else if (typeof db !== 'undefined') {
                const doc = await db.collection('employees').doc(empId).get();
                if (doc.exists) {
                    emp = { id: doc.id, ...doc.data() };
                }
            }
        }
        
        if (emp) {
            if (!allEmployeesForSearch.find(e => e.id === emp.id)) {
                allEmployeesForSearch.push(emp);
            }
            
            // Switch to form hub and activate form
            switchView('form-hub-view');
            switchActiveForm(formType);
            
            // Populate employee and company in form
            await selectEmployeeSearch(emp.id);
            
            // Close modal
            closeModal('employeeFormModal');
            const m = document.getElementById('employeeFormModal');
            if (m) m.style.display = 'none';
            
            const formLabel = (formType === 's6') ? 'س 6 (إنهاء الخدمة والتسوية)' : 'س 1 (التحاق بالعمل)';
            showNotification(`تم تجهيز استمارة ${formLabel} بالبيانات بنجاح!`, 'success');
        } else {
            showNotification('لم يتم العثور على بيانات الموظف', 'error');
        }
    } catch(err) {
        console.error("Error in fillEmployeeForm:", err);
        showNotification('حدث خطأ أثناء تحميل بيانات الاستمارة', 'error');
    }
}

function openLinkExistingOperationModal() {
    closeModal('employeeOperationChoiceModal');
    const m = document.getElementById('linkExistingOperationModal');
    if (m) m.style.display = 'flex';
}

async function linkExistingOperation() {
    const codeInput = document.getElementById('existingOperationCode');
    const code = codeInput ? codeInput.value.trim() : '';
    if (!code) {
        showNotification('الرجاء إدخال كود الطلب أو رقم الوارد', 'error');
        return;
    }
    
    try {
        const empDoc = await db.collection('employees').doc(window.currentSelectedEmployeeId).get();
        if (!empDoc.exists) return;
        
        const empCode = empDoc.data().code;
        if (!empCode) {
            showNotification('لا يوجد كود لهذا الموظف للربط به! يرجى إضافة كود للموظف أولاً.', 'error');
            return;
        }

        const snapshot = await db.collection('operations').get();
        let targetOpId = null;
        snapshot.forEach(doc => {
            const op = doc.data();
            if (op.requestCode === code || op.incomingNum === code) {
                targetOpId = doc.id;
            }
        });
        
        if (targetOpId) {
            await db.collection('operations').doc(targetOpId).update({
                employeeCode: empCode
            });
            showNotification('تم ربط الطلب بالموظف بنجاح!', 'success');
            closeModal('linkExistingOperationModal');
            loadEmployeesGrid(); 
        } else {
            showNotification('لم يتم العثور على طلب بهذا الكود!', 'error');
        }
    } catch (err) {
        console.error(err);
        showNotification('حدث خطأ أثناء الربط', 'error');
    }
}

async function createNewOperationForEmployee() {
    closeModal('employeeOperationChoiceModal');
    
    try {
        const empDoc = await db.collection('employees').doc(window.currentSelectedEmployeeId).get();
        if (empDoc.exists) {
            const emp = empDoc.data();
            
            if (typeof openOperationModal === 'function') {
                openOperationModal();
                
                const nameInput = document.getElementById('opName');
                if (nameInput) nameInput.value = emp.name || '';
                
                const opEmpCode = document.getElementById('opEmployeeCode');
                if (opEmpCode && emp.code) {
                    opEmpCode.value = emp.code;
                } else if (opEmpCode) {
                    opEmpCode.value = '';
                }
                
                setTimeout(() => {
                    const compSelect = document.getElementById('opCompany');
                    if (compSelect && emp.company_id) {
                        compSelect.value = emp.company_id;
                    }
                }, 600);
            }
        }
    } catch (err) {
        console.error(err);
    }
}

window.viewEmployeeOperations = function(empCode) {
    window._keepOpSearch = true;
    switchView('operations-view');
    setTimeout(() => {
        const searchInput = document.getElementById('operationSearch');
        if (searchInput) {
            searchInput.value = empCode;
            if (typeof filterOperations === 'function') filterOperations();
        }
    }, 100);
};

// ==========================================
// تصدير واستيراد ملفات Excel المنسقة
// ==========================================
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

const excelHeaderStyle = {
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

const excelDataStyle = {
    font: { sz: 11, name: "Arial", color: { rgb: "2D3748" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
        top: { style: "thin", color: { rgb: "E2E8F0" } },
        bottom: { style: "thin", color: { rgb: "E2E8F0" } },
        left: { style: "thin", color: { rgb: "E2E8F0" } },
        right: { style: "thin", color: { rgb: "E2E8F0" } }
    }
};

function applyStylesToSheet(worksheet, colWidths = 18) {
    if (!worksheet['!ref']) return;
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const wscols = [];
    
    for (let C = range.s.c; C <= range.e.c; ++C) {
        wscols.push({ wch: colWidths });
        for (let R = range.s.r; R <= range.e.r; ++R) {
            const address = XLSX.utils.encode_cell({ r: R, c: C });
            if (!worksheet[address]) continue;
            if (R === 0) {
                worksheet[address].s = excelHeaderStyle;
            } else {
                worksheet[address].s = excelDataStyle;
            }
        }
    }
    worksheet['!cols'] = wscols;
    worksheet['!dir'] = 'rtl';
}

function downloadEmployeeExcelTemplate() {
    const headers = [
        "كود الموظف", "الاسم", "الرقم القومي", "الرقم التأميني", "اسم الأم", "المؤهل", "المهنة", "كود المهنة",
        "تاريخ التعيين", "تاريخ بدء الاشتراك", "تاريخ التأمين", "تاريخ الاستقالة",
        "نوع المدة", "أجر الاشتراك", "الأجر الشامل",
        "تاريخ العجز", "نسبة العجز", "محافظة", "مركز", "قرية", "شارع", "رقم العقار", "تليفون"
    ];
    
    const templateData = [];
    const worksheet = XLSX.utils.json_to_sheet(templateData, { header: headers });
    applyStylesToSheet(worksheet, 20);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "نموذج الموظفين");
    downloadExcelWorkbook(workbook, "Employees_Template_نموذج_الموظفين.xlsx");
}

async function exportEmployeesToExcel() {
    try {
        let employeesToExport = [];
        if (typeof isGuestMode !== 'undefined' && isGuestMode) {
            employeesToExport = (guestData && guestData.employees) ? [...guestData.employees] : [];
        } else {
            const uid = (typeof getCurrentUserId === 'function') ? getCurrentUserId() : null;
            const isAdmin = (typeof isCurrentUserAdmin === 'function') ? isCurrentUserAdmin() : false;
            let query = db.collection('employees');
            if (!isAdmin && uid) {
                query = query.where('userId', '==', uid);
            }
            const snapshot = await query.get();
            snapshot.forEach(doc => employeesToExport.push(doc.data()));
        }

        if(employeesToExport.length === 0) {
            showNotification('لا توجد بيانات لتصديرها.', 'error');
            return;
        }
        
        const data = [];
        employeesToExport.forEach(e => {
            data.push({
                "كود الموظف": e.code || '',
                "الاسم": e.name || '',
                "الرقم القومي": e.nat_id || '',
                "الرقم التأميني": e.ins_num || '',
                "اسم الأم": e.mother_name || '',
                "المؤهل": e.qualification || '',
                "المهنة": e.occupation || '',
                "كود المهنة": e.occupationCode || '',
                "تاريخ التعيين": e.hire_date || '',
                "تاريخ بدء الاشتراك": e.sub_start_date || '',
                "تاريخ التأمين": e.ins_date || '',
                "تاريخ الاستقالة": e.resignation_date || '',
                "نوع المدة": e.duration_type || '',
                "أجر الاشتراك": e.sub_wage || '',
                "الأجر الشامل": e.comp_wage || '',
                "تاريخ العجز": e.disability_date || '',
                "نسبة العجز": e.disability_percent || '',
                "محافظة": e.gov || '',
                "مركز": e.center || '',
                "قرية": e.village || '',
                "شارع": e.street || '',
                "رقم العقار": e.building_no || '',
                "تليفون": e.phone || ''
            });
        });

        const headers = [
            "كود الموظف", "الاسم", "الرقم القومي", "الرقم التأميني", "اسم الأم", "المؤهل", "المهنة", "كود المهنة",
            "تاريخ التعيين", "تاريخ بدء الاشتراك", "تاريخ التأمين", "تاريخ الاستقالة",
            "نوع المدة", "أجر الاشتراك", "الأجر الشامل",
            "تاريخ العجز", "نسبة العجز", "محافظة", "مركز", "قرية", "شارع", "رقم العقار", "تليفون"
        ];

        const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
        applyStylesToSheet(worksheet, 20);

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "الموظفين");
        const todayStr = new Date().toISOString().split('T')[0];
        downloadExcelWorkbook(workbook, `Employees_بيانات_الموظفين_${todayStr}.xlsx`);
        showNotification('تم التصدير بنجاح!', 'success');
    } catch (error) {
        console.error('Error exporting:', error);
        showNotification('حدث خطأ أثناء التصدير', 'error');
    }
}

async function importEmployeesFromExcel(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { raw: false });
            
            if (json.length === 0) {
                showNotification("الملف فارغ!", 'error');
                return;
            }

            const uid = (typeof getCurrentUserId === 'function') ? getCurrentUserId() : null;
            const existingIds = new Set();

            if (typeof isGuestMode !== 'undefined' && isGuestMode) {
                if (guestData && guestData.employees) {
                    guestData.employees.forEach(emp => {
                        if (emp.nat_id) existingIds.add(emp.nat_id.toString().trim());
                    });
                }
            } else {
                let query = db.collection('employees');
                if (!isCurrentUserAdmin() && uid) {
                    query = query.where('userId', '==', uid);
                }
                const currentSnapshot = await query.get();
                currentSnapshot.forEach(doc => {
                    if (doc.data().nat_id) {
                        existingIds.add(doc.data().nat_id.toString().trim());
                    }
                });
            }

            let addedCount = 0;
            let skipCount = 0;
            let invalidNatIdCount = 0;
            let errorCount = 0;

            for (let i = 0; i < json.length; i++) {
                const row = json[i];
                const natId = row["الرقم القومي"] ? row["الرقم القومي"].toString().trim() : null;
                
                if (!natId) {
                    continue;
                }
                
                if (natId.length !== 14 || isNaN(natId)) {
                    invalidNatIdCount++;
                    continue;
                }

                if (existingIds.has(natId)) {
                    skipCount++;
                    continue;
                }

                const hasDisab = (row["تاريخ العجز"] && row["تاريخ العجز"].trim() !== "") || (row["نسبة العجز"] && row["نسبة العجز"].toString().trim() !== "");

                const empData = {
                    code: row["كود الموظف"] ? row["كود الموظف"].toString().trim() : '',
                    name: row["الاسم"] ? row["الاسم"].toString().trim() : '',
                    nat_id: natId,
                    ins_num: row["الرقم التأميني"] ? row["الرقم التأميني"].toString().trim() : '',
                    mother_name: row["اسم الأم"] ? row["اسم الأم"].toString().trim() : '',
                    qualification: row["المؤهل"] ? row["المؤهل"].toString().trim() : '',
                    occupation: row["المهنة"] ? row["المهنة"].toString().trim() : '',
                    occupationCode: row["كود المهنة"] ? row["كود المهنة"].toString().trim() : '',
                    
                    hire_date: row["تاريخ التعيين"] ? row["تاريخ التعيين"].toString().trim() : '',
                    sub_start_date: row["تاريخ بدء الاشتراك"] ? row["تاريخ بدء الاشتراك"].toString().trim() : '',
                    ins_date: row["تاريخ التأمين"] ? row["تاريخ التأمين"].toString().trim() : '',
                    resignation_date: row["تاريخ الاستقالة"] ? row["تاريخ الاستقالة"].toString().trim() : '',

                    duration_type: row["نوع المدة"] ? row["نوع المدة"].toString().trim() : '',
                    sub_wage: row["أجر الاشتراك"] ? row["أجر الاشتراك"].toString().trim() : '',
                    comp_wage: row["الأجر الشامل"] ? row["الأجر الشامل"].toString().trim() : '',
                    
                    has_disability: hasDisab ? true : false,
                    disability_date: row["تاريخ العجز"] ? row["تاريخ العجز"].toString().trim() : '',
                    disability_percent: row["نسبة العجز"] ? row["نسبة العجز"].toString().trim() : '',
                    
                    gov: row["محافظة"] ? row["محافظة"].toString().trim() : '',
                    center: row["مركز"] ? row["مركز"].toString().trim() : '',
                    village: row["قرية"] ? row["قرية"].toString().trim() : '',
                    street: row["شارع"] ? row["شارع"].toString().trim() : '',
                    building_no: row["رقم العقار"] ? row["رقم العقار"].toString().trim() : '',
                    phone: row["تليفون"] ? row["تليفون"].toString().trim() : '',
                    
                    createdAt: (typeof isGuestMode !== 'undefined' && isGuestMode) ? new Date().toISOString() : firebase.firestore.FieldValue.serverTimestamp()
                };

                if (uid) empData.userId = uid;

                try {
                    if (typeof isGuestMode !== 'undefined' && isGuestMode) {
                        empData.id = 'guest_emp_' + Date.now() + '_' + i;
                        guestData.employees.push(empData);
                        existingIds.add(natId);
                        addedCount++;
                    } else {
                        await db.collection('employees').add(empData);
                        existingIds.add(natId);
                        addedCount++;
                    }
                } catch(e) {
                    console.error('Error adding employee:', e);
                    errorCount++;
                }
            }

            let msg = `تم الاستيراد! إضافة: ${addedCount} | تم تخطي: ${skipCount} | أخطاء رقم قومي: ${invalidNatIdCount}`;
            if (errorCount > 0) msg += ` | أخطاء أخرى: ${errorCount}`;
            
            showNotification(msg, 'success');
            document.getElementById('employeeExcelUpload').value = "";
            loadEmployeesGrid();
            loadSearchData();

        } catch (error) {
            console.error('Error importing:', error);
            showNotification('حدث خطأ أثناء استيراد الملف.', 'error');
            document.getElementById('employeeExcelUpload').value = "";
        }
    };
    reader.readAsArrayBuffer(file);
}

function downloadCompanyExcelTemplate() {
    const headers = [
        "كود الشركة", "الكيان القانوني", "الرقم التأميني", "المدير المسئول", "الرقم القومي", "الشكل القانوني", "نشاط المنشأة"
    ];
    const templateData = [];
    const worksheet = XLSX.utils.json_to_sheet(templateData, { header: headers });
    applyStylesToSheet(worksheet, 25);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "نموذج الشركات");
    downloadExcelWorkbook(workbook, "Companies_Template_نموذج_الشركات.xlsx");
}

async function exportCompaniesToExcel() {
    try {
        let companiesToExport = [];
        if (typeof isGuestMode !== 'undefined' && isGuestMode) {
            companiesToExport = (guestData && guestData.companies) ? [...guestData.companies] : [];
        } else {
            const uid = (typeof getCurrentUserId === 'function') ? getCurrentUserId() : null;
            const isAdmin = (typeof isCurrentUserAdmin === 'function') ? isCurrentUserAdmin() : false;
            let query = db.collection('companies');
            if (!isAdmin && uid) {
                query = query.where('userId', '==', uid);
            }
            const snapshot = await query.get();
            snapshot.forEach(doc => companiesToExport.push(doc.data()));
        }

        if(companiesToExport.length === 0) {
            showNotification('لا توجد بيانات لتصديرها.', 'error');
            return;
        }
        
        const data = [];
        companiesToExport.forEach(c => {
            data.push({
                "كود الشركة": c.code || '',
                "الكيان القانوني": c.name || '',
                "الرقم التأميني": c.ins_num || '',
                "المدير المسئول": c.manager || '',
                "الرقم القومي": c.manager_nat_id || '',
                "الشكل القانوني": c.legal_entity || '',
                "نشاط المنشأة": c.office_name || ''
            });
        });

        const headers = [
            "كود الشركة", "الكيان القانوني", "الرقم التأميني", "المدير المسئول", "الرقم القومي", "الشكل القانوني", "نشاط المنشأة"
        ];

        const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
        applyStylesToSheet(worksheet, 25);

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "الشركات");
        const todayStr = new Date().toISOString().split('T')[0];
        downloadExcelWorkbook(workbook, `Companies_بيانات_الشركات_${todayStr}.xlsx`);
        showNotification('تم التصدير بنجاح!', 'success');
    } catch (error) {
        console.error('Error exporting:', error);
        showNotification('حدث خطأ أثناء التصدير', 'error');
    }
}

// ==========================================
// نظام الإشعارات والتأكيدات (Toasts & Confirms)
// ==========================================
function showNotification(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    
    let icon = '<i class="fas fa-check-circle"></i>';
    if (type === 'error') icon = '<i class="fas fa-exclamation-circle"></i>';
    if (type === 'info') icon = '<i class="fas fa-info-circle"></i>';
    if (type === 'warning') icon = '<i class="fas fa-exclamation-triangle"></i>';
    
    toast.innerHTML = `
        ${icon}
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if(toast.parentElement) toast.parentElement.removeChild(toast);
        }, 400);
    }, 4000);
}

function showConfirmDialog(message) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay custom-confirm-overlay';
        overlay.style.display = 'flex';
        overlay.style.zIndex = '99999';
        
        overlay.innerHTML = `
            <div class="modal-content confirm-modal-box">
                <i class="fas fa-exclamation-triangle confirm-modal-icon"></i>
                <h3 class="confirm-modal-title">تأكيد الإجراء</h3>
                <p class="confirm-modal-desc">${message}</p>
                <div class="confirm-modal-btns">
                    <button id="confirmBtnYes" class="neu-btn neu-btn-warning" style="min-width: 100px;">نعم، متأكد</button>
                    <button id="confirmBtnNo" class="neu-btn" style="min-width: 100px;">إلغاء</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        document.getElementById('confirmBtnYes').onclick = () => {
            document.body.removeChild(overlay);
            resolve(true);
        };
        
        document.getElementById('confirmBtnNo').onclick = () => {
            document.body.removeChild(overlay);
            resolve(false);
        };
    });
}

// ==========================================
// المستمعات العامة للأحداث (ESC, Enter, Modals)
// ==========================================
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(modal => {
            if (modal.style.display === 'flex') {
                if (modal.classList.contains('custom-confirm-overlay')) {
                    const noBtn = document.getElementById('confirmBtnNo');
                    if (noBtn) noBtn.click();
                } else {
                    modal.style.display = 'none';
                }
            }
        });
    }
    
    if (e.key === 'Enter') {
        const confirmDialog = document.querySelector('.custom-confirm-overlay');
        if (confirmDialog && confirmDialog.style.display === 'flex') {
            e.preventDefault();
            const yesBtn = document.getElementById('confirmBtnYes');
            if (yesBtn) yesBtn.click();
        }
    }
});

window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        if (!e.target.classList.contains('custom-confirm-overlay')) {
            e.target.style.display = 'none';
        }
    }
});

// ==========================================
// الثيم (Dark / Light Mode)
// ==========================================
function initTheme() {
    const savedTheme = localStorage.getItem('app-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeUI(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('app-theme', newTheme);
    updateThemeUI(newTheme);
}

function updateThemeUI(theme) {
    const btns = document.querySelectorAll('#themeToggleBtn, .auth-theme-toggle-btn, .welcome-theme-toggle, #mobileThemeIcon');
    btns.forEach(btn => {
        if (btn.tagName === 'I') {
            btn.className = (theme === 'light') ? 'fas fa-moon' : 'fas fa-sun';
            return;
        }
        if (theme === 'light') {
            btn.innerHTML = '<i class="fas fa-moon"></i>';
            btn.title = 'تفعيل الوضع الداكن';
        } else {
            btn.innerHTML = '<i class="fas fa-sun"></i>';
            btn.title = 'تفعيل الوضع الفاتح';
        }
    });
}

initTheme();
