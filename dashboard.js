// ==========================================================================
// لوحة التحليلات والمؤشرات الذكية الشاملة (Executive Analytics Dashboard)
// ==========================================================================

let dashboardCharts = {
    turnoverTrend: null,
    operationsStatus: null,
    topCompanies: null,
    wageBrackets: null,
    qualifications: null
};

let dashboardFilterState = {
    period: 'all', // 'all', 'month', 'quarter', 'year'
    companyId: 'all' // 'all' or company ID
};

// استخراج البيانات المركزية النشطة (يدعم وضع الضيف أو فايرستور أو الذاكرة)
function getDashboardData() {
    let companies = [];
    let employees = [];
    let operations = [];

    // 1. الشركات
    if (typeof companiesData !== 'undefined' && Array.isArray(companiesData) && companiesData.length > 0) {
        companies = companiesData;
    } else if (typeof guestData !== 'undefined' && guestData && Array.isArray(guestData.companies)) {
        companies = guestData.companies;
    }

    // 2. الموظفين
    if (typeof employeesData !== 'undefined' && Array.isArray(employeesData) && employeesData.length > 0) {
        employees = employeesData;
    } else if (typeof window.allEmployeesList !== 'undefined' && Array.isArray(window.allEmployeesList) && window.allEmployeesList.length > 0) {
        employees = window.allEmployeesList;
    } else if (typeof guestData !== 'undefined' && guestData && Array.isArray(guestData.employees)) {
        employees = guestData.employees;
    }

    // 3. العمليات
    if (typeof operationsList !== 'undefined' && Array.isArray(operationsList) && operationsList.length > 0) {
        operations = operationsList;
    } else if (typeof operationsData !== 'undefined' && Array.isArray(operationsData) && operationsData.length > 0) {
        operations = operationsData;
    } else if (typeof guestData !== 'undefined' && guestData && Array.isArray(guestData.operations)) {
        operations = guestData.operations;
    }

    return { companies, employees, operations };
}

// تهيئة اللوحة
function initDashboard() {
    initDashboardCharts();
    updateDashboardAnalytics();
    populateDashboardCompanyFilter();
}

// إنشاء وتجهيز الرسوم البيانية التفاعلية
function initDashboardCharts() {
    if (typeof Chart === 'undefined') {
        console.warn("Chart.js is not loaded yet.");
        return;
    }

    // إعدادات الخط والألوان الافتراضية
    Chart.defaults.font.family = "'Cairo', sans-serif";
    Chart.defaults.color = '#94a3b8';

    // 1. مخطط حركة التعيينات والاستقالات ودوران العمالة
    const ctxTurnover = document.getElementById('chartTurnoverTrend');
    if (ctxTurnover && !dashboardCharts.turnoverTrend) {
        dashboardCharts.turnoverTrend = new Chart(ctxTurnover, {
            type: 'bar',
            data: {
                labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
                datasets: [
                    {
                        label: 'تعيينات جديدة (س1)',
                        data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                        backgroundColor: 'rgba(56, 189, 248, 0.75)',
                        borderColor: '#38bdf8',
                        borderWidth: 1.5,
                        borderRadius: 6
                    },
                    {
                        label: 'استقالات وإنهاء خدمة (س6)',
                        data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                        backgroundColor: 'rgba(244, 63, 94, 0.75)',
                        borderColor: '#f43f5e',
                        borderWidth: 1.5,
                        borderRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { font: { size: 12, family: "'Cairo', sans-serif" }, usePointStyle: true }
                    },
                    tooltip: {
                        rtl: true,
                        backgroundColor: 'rgba(15, 23, 42, 0.92)',
                        titleFont: { family: "'Cairo', sans-serif" },
                        bodyFont: { family: "'Cairo', sans-serif" }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1, color: '#94a3b8' },
                        grid: { color: 'rgba(255, 255, 255, 0.05)' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8' }
                    }
                }
            }
        });
    }

    // 2. مخطط توزيع حالات العمليات التأمينية
    const ctxOpStatus = document.getElementById('chartOperationsStatus');
    if (ctxOpStatus && !dashboardCharts.operationsStatus) {
        dashboardCharts.operationsStatus = new Chart(ctxOpStatus, {
            type: 'doughnut',
            data: {
                labels: ['انتظار', 'قيد المراجعة', 'مكتمل', 'مرفوض', 'مكرر'],
                datasets: [{
                    data: [0, 0, 0, 0, 0],
                    backgroundColor: [
                        '#f59e0b', // انتظار
                        '#38bdf8', // قيد المراجعة
                        '#10b981', // مكتمل
                        '#ef4444', // مرفوض
                        '#8b5cf6'  // مكرر
                    ],
                    borderWidth: 0,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '72%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { font: { size: 11, family: "'Cairo', sans-serif" }, usePointStyle: true, boxWidth: 8 }
                    },
                    tooltip: {
                        rtl: true,
                        backgroundColor: 'rgba(15, 23, 42, 0.92)'
                    }
                }
            }
        });
    }

    // 3. كبرى الشركات حسب حجم العمالة
    const ctxTopComp = document.getElementById('chartTopCompanies');
    if (ctxTopComp && !dashboardCharts.topCompanies) {
        dashboardCharts.topCompanies = new Chart(ctxTopComp, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'عدد الموظفين',
                    data: [],
                    backgroundColor: 'rgba(99, 102, 241, 0.75)',
                    borderColor: '#6366f1',
                    borderWidth: 1.5,
                    borderRadius: 6
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { rtl: true, backgroundColor: 'rgba(15, 23, 42, 0.92)' }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: { stepSize: 1, color: '#94a3b8' },
                        grid: { color: 'rgba(255, 255, 255, 0.05)' }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8' }
                    }
                }
            }
        });
    }

    // 4. شرائح الأجور التأمينية
    const ctxWages = document.getElementById('chartWageBrackets');
    if (ctxWages && !dashboardCharts.wageBrackets) {
        dashboardCharts.wageBrackets = new Chart(ctxWages, {
            type: 'bar',
            data: {
                labels: ['أقل من 3500', '3500 - 6000', '6000 - 10000', 'أكثر من 10000'],
                datasets: [{
                    label: 'عدد الموظفين',
                    data: [0, 0, 0, 0],
                    backgroundColor: [
                        'rgba(56, 189, 248, 0.7)',
                        'rgba(16, 185, 129, 0.7)',
                        'rgba(245, 158, 11, 0.7)',
                        'rgba(139, 92, 246, 0.7)'
                    ],
                    borderRadius: 6,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { rtl: true, backgroundColor: 'rgba(15, 23, 42, 0.92)' }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1, color: '#94a3b8' },
                        grid: { color: 'rgba(255, 255, 255, 0.05)' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8' }
                    }
                }
            }
        });
    }

    // 5. المؤهلات الدراسية
    const ctxQual = document.getElementById('chartQualifications');
    if (ctxQual && !dashboardCharts.qualifications) {
        dashboardCharts.qualifications = new Chart(ctxQual, {
            type: 'pie',
            data: {
                labels: ['مؤهل عالي', 'فوق متوسط', 'متوسط', 'أخرى / بدون'],
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: ['#38bdf8', '#818cf8', '#34d399', '#94a3b8'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { font: { size: 11, family: "'Cairo', sans-serif" }, usePointStyle: true, boxWidth: 8 }
                    },
                    tooltip: { rtl: true, backgroundColor: 'rgba(15, 23, 42, 0.92)' }
                }
            }
        });
    }
}

// دالة تحديث كافة الإحصائيات والمخططات البيانية (Real-time Analytics Engine)
function updateDashboardAnalytics() {
    const { companies, employees, operations } = getDashboardData();

    // الشركة المحددة (سواء كانت all أو ID أو اسم أو كود)
    let selectedComp = null;
    if (dashboardFilterState.companyId !== 'all') {
        selectedComp = companies.find(c => 
            String(c.id).trim() === String(dashboardFilterState.companyId).trim() ||
            (c.name && c.name.trim() === String(dashboardFilterState.companyId).trim()) ||
            (c.code && String(c.code).trim() === String(dashboardFilterState.companyId).trim())
        );
    }

    const targetCompId = selectedComp ? String(selectedComp.id).trim() : (dashboardFilterState.companyId !== 'all' ? String(dashboardFilterState.companyId).trim() : null);
    const targetCompName = selectedComp ? (selectedComp.name || '').trim() : (dashboardFilterState.companyId !== 'all' ? String(dashboardFilterState.companyId).trim() : '');
    const targetCompCode = selectedComp ? (selectedComp.code || '').trim() : '';

    // 1. تطبيق فلتر الشركة على الموظفين
    let filteredEmployees = employees;
    if (targetCompId) {
        filteredEmployees = employees.filter(e => {
            const empCompId = e.company_id ? String(e.company_id).trim() : '';
            const empCompName = e.company_name ? String(e.company_name).trim() : '';
            const empCompCode = e.company_code ? String(e.company_code).trim() : '';

            return (
                (empCompId && (empCompId === targetCompId || empCompId === targetCompName)) ||
                (targetCompName && empCompName && (empCompName === targetCompName || empCompName.includes(targetCompName) || targetCompName.includes(empCompName))) ||
                (targetCompCode && empCompCode && empCompCode === targetCompCode)
            );
        });
    }

    // بناء قائمة أكواد وأسماء الموظفين للشركة المحددة للربط الدقيق بالعمليات
    const targetEmpCodes = new Set(filteredEmployees.map(e => String(e.code || '').trim()).filter(Boolean));
    const targetEmpNames = new Set(filteredEmployees.map(e => (e.name || '').trim()).filter(Boolean));

    // 2. تطبيق فلتر الشركة على العمليات
    let filteredOperations = operations;
    if (targetCompId) {
        filteredOperations = operations.filter(o => {
            const opCompId = o.company_id ? String(o.company_id).trim() : '';
            const opCompName = o.company ? String(o.company).trim() : (o.company_name ? String(o.company_name).trim() : '');
            const opEmpCode = o.employeeCode ? String(o.employeeCode).trim() : (o.requestCode ? String(o.requestCode).trim() : '');
            const opEmpName = o.name ? String(o.name).trim() : '';

            // المطابقة بمعرف أو اسم الشركة
            const matchByComp = (
                (opCompId && (opCompId === targetCompId || opCompId === targetCompName)) ||
                (targetCompName && opCompName && (opCompName === targetCompName || opCompName.includes(targetCompName) || targetCompName.includes(opCompName))) ||
                (targetCompId && opCompName && opCompName === targetCompId) ||
                (targetCompCode && opCompName && opCompName === targetCompCode)
            );

            // المطابقة بالموظف التابع لنفس الشركة
            const matchByEmp = (
                (opEmpCode && targetEmpCodes.has(opEmpCode)) ||
                (opEmpName && targetEmpNames.has(opEmpName))
            );

            return matchByComp || matchByEmp;
        });
    }

    // 3. تطبيق فلتر الفترة الزمنية على العمليات
    if (dashboardFilterState.period !== 'all') {
        const now = new Date();
        filteredOperations = filteredOperations.filter(op => {
            const dateStr = op.incomingDate || op.date || op.approvalDate || '';
            if (!dateStr) return true;
            const opDate = new Date(dateStr);
            if (isNaN(opDate.getTime())) return true;

            if (dashboardFilterState.period === 'month') {
                return opDate.getMonth() === now.getMonth() && opDate.getFullYear() === now.getFullYear();
            } else if (dashboardFilterState.period === 'quarter') {
                const curQuarter = Math.floor(now.getMonth() / 3);
                const opQuarter = Math.floor(opDate.getMonth() / 3);
                return curQuarter === opQuarter && opDate.getFullYear() === now.getFullYear();
            } else if (dashboardFilterState.period === 'year') {
                return opDate.getFullYear() === now.getFullYear();
            }
            return true;
        });
    }

    // 1. حساب مؤشرات الشركات
    const totalCompanies = targetCompId ? 1 : companies.length;
    animateValue('dashKpiCompanies', totalCompanies);
    const compSubtitle = document.getElementById('dashKpiCompaniesSub');
    if (compSubtitle) {
        if (targetCompId && selectedComp) {
            compSubtitle.innerText = `${selectedComp.legal_entity || 'كيان مسجل'} • كود: ${selectedComp.code || '-'}`;
        } else {
            const corpCount = companies.filter(c => (c.legal_entity || '').includes('مساهمة')).length;
            compSubtitle.innerText = totalCompanies > 0 
                ? `${corpCount} شركة مساهمة • ${totalCompanies - corpCount} كيانات أخرى`
                : 'لا توجد شركات مسجلة';
        }
    }

    // 2. حساب مؤشرات القوى العاملة
    const totalEmployees = filteredEmployees.length;
    animateValue('dashKpiEmployees', totalEmployees);
    const empSubtitle = document.getElementById('dashKpiEmployeesSub');
    if (empSubtitle) {
        const activeCount = filteredEmployees.filter(e => !e.resignation_date).length;
        const resignedCount = filteredEmployees.filter(e => Boolean(e.resignation_date)).length;
        const disabilityCount = filteredEmployees.filter(e => e.has_disability === true || e.has_disability === 'true' || e.has_disability === '1').length;
        const rawText = totalEmployees > 0 
            ? `${totalEmployees} موظف (${activeCount} نشط • ${resignedCount} استقالة) • ${disabilityCount} ذوي همم`
            : 'لا يوجد موظفين مسجلين';
        empSubtitle.innerText = (typeof toArabicDigits === 'function') ? toArabicDigits(rawText) : rawText;
    }

    // 3. حساب كتلة الأجور والاشتراكات
    let totalSubWage = 0;
    let totalCompWage = 0;
    filteredEmployees.forEach(e => {
        const sw = parseFloat(e.sub_wage) || 0;
        const cw = parseFloat(e.comp_wage) || 0;
        totalSubWage += sw;
        totalCompWage += cw;
    });
    const avgWage = totalEmployees > 0 ? Math.round(totalSubWage / totalEmployees) : 0;
    animateValue('dashKpiTotalWage', totalSubWage, ' ج.م');
    const wageSubtitle = document.getElementById('dashKpiTotalWageSub');
    if (wageSubtitle) {
        const rawText = totalEmployees > 0 
            ? `متوسط الأجر: ${avgWage.toLocaleString('en-US')} ج.م • الشامل: ${Math.round(totalCompWage).toLocaleString('en-US')} ج.م`
            : 'أجور الاشتراك التأميني';
        wageSubtitle.innerText = (typeof toArabicDigits === 'function') ? toArabicDigits(rawText) : rawText;
    }

    // 4. حساب مؤشرات العمليات ومعدل الإنجاز
    const totalOps = filteredOperations.length;
    const completedOps = filteredOperations.filter(o => o.status === 'مكتمل').length;
    const pendingOps = filteredOperations.filter(o => o.status === 'انتظار').length;
    const reviewOps = filteredOperations.filter(o => o.status === 'قيد المراجعة').length;
    const rejectedOps = filteredOperations.filter(o => o.status === 'مرفوض').length;
    const duplicateOps = filteredOperations.filter(o => o.status === 'مكرر').length;

    const completionRate = totalOps > 0 ? Math.round((completedOps / totalOps) * 100) : 0;
    animateValue('dashKpiOperations', totalOps);
    const opSubtitle = document.getElementById('dashKpiOperationsSub');
    if (opSubtitle) {
        const rawText = totalOps > 0 
            ? `نسبة الإنجاز: ${completionRate}% (${completedOps} مكتمل • ${pendingOps + reviewOps} انتظار/مراجعة)`
            : 'لا توجد طلبات مسجلة';
        opSubtitle.innerText = (typeof toArabicDigits === 'function') ? toArabicDigits(rawText) : rawText;
    }

    // 5. حساب معدل دوران العمالة وحركات الاستقالة/التعيين (Turnover Rate Analytics)
    const s1Codes = new Set();
    const s6Codes = new Set();

    filteredOperations.forEach(o => {
        const rType = o.requestType || '';
        const code = String(o.employeeCode || o.requestCode || o.name || '');
        if (rType.includes('س1') || rType.includes('استمارة 1') || rType.includes('تعيين')) {
            s1Codes.add(code || `op_s1_${o.id}`);
        } else if (rType.includes('س6') || rType.includes('استمارة 6') || rType.includes('إنهاء') || rType.includes('استقالة')) {
            s6Codes.add(code || `op_s6_${o.id}`);
        }
    });

    filteredEmployees.forEach(e => {
        const code = String(e.code || e.name || e.id);
        if (e.hire_date || e.sub_start_date) {
            s1Codes.add(code);
        }
        if (e.resignation_date) {
            s6Codes.add(code);
        }
    });

    const s1Hires = s1Codes.size;
    const s6Exits = s6Codes.size;
    
    // معدل الدوران = (الاستقالات / إجمالي الموظفين) * 100
    const turnoverNum = totalEmployees > 0 ? Number(((s6Exits / totalEmployees) * 100).toFixed(1)) : 0;
    animateValue('dashKpiTurnover', turnoverNum, '%');
    const turnoverSubtitle = document.getElementById('dashKpiTurnoverSub');
    if (turnoverSubtitle) {
        const netGrowth = s1Hires - s6Exits;
        const growthSign = netGrowth > 0 ? '+' : '';
        const rawText = `تعيين: ${s1Hires} | استقالة: ${s6Exits} (صافي النمو: ${growthSign}${netGrowth})`;
        turnoverSubtitle.innerText = (typeof toArabicDigits === 'function') ? toArabicDigits(rawText) : rawText;
    }

    // 6. مؤشر اكتمال وجودة البيانات (Compliance Index)
    let compliantCount = 0;
    filteredEmployees.forEach(e => {
        if (e.name && e.nat_id && String(e.nat_id).trim().length === 14 && e.ins_num && e.sub_wage) {
            compliantCount++;
        }
    });
    const complianceRate = totalEmployees > 0 ? Math.round((compliantCount / totalEmployees) * 100) : 100;
    animateValue('dashKpiCompliance', complianceRate, '%');
    const compHealthSub = document.getElementById('dashKpiComplianceSub');
    if (compHealthSub) {
        const rawText = `${compliantCount} من ${totalEmployees} ملف مكتمل الشروط والبيانات`;
        compHealthSub.innerText = (typeof toArabicDigits === 'function') ? toArabicDigits(rawText) : rawText;
    }

    // ==========================================
    // تحديث المخططات البيانية (Chart.js Updates)
    // ==========================================

    // 1. تحديث مخطط دوران العمالة الشهري (س1 vs س6)
    if (dashboardCharts.turnoverTrend) {
        const hiresByMonth = Array(12).fill(0);
        const exitsByMonth = Array(12).fill(0);

        filteredOperations.forEach(op => {
            const dateStr = op.incomingDate || op.date || op.approvalDate || '';
            if (dateStr) {
                const month = new Date(dateStr).getMonth();
                if (!isNaN(month) && month >= 0 && month < 12) {
                    if ((op.requestType || '').includes('س1') || (op.requestType || '').includes('استمارة 1') || (op.requestType || '').includes('تعيين')) {
                        hiresByMonth[month]++;
                    } else if ((op.requestType || '').includes('س6') || (op.requestType || '').includes('استمارة 6') || (op.requestType || '').includes('إنهاء') || (op.requestType || '').includes('استقالة')) {
                        exitsByMonth[month]++;
                    }
                }
            }
        });

        // دعم التواريخ المسجلة في ملفات الموظفين أيضاً
        filteredEmployees.forEach(emp => {
            if (emp.hire_date) {
                const m = new Date(emp.hire_date).getMonth();
                if (!isNaN(m) && m >= 0 && m < 12 && hiresByMonth.every(v => v === 0)) {
                    hiresByMonth[m]++;
                }
            }
            if (emp.resignation_date) {
                const m = new Date(emp.resignation_date).getMonth();
                if (!isNaN(m) && m >= 0 && m < 12) {
                    exitsByMonth[m]++;
                }
            }
        });

        // إذا لم توجد تواريخ تفصيلية، وضع البيانات الإجمالية في الشهر الحالي
        const currentMonth = new Date().getMonth();
        if (hiresByMonth.every(v => v === 0) && s1Hires > 0) {
            hiresByMonth[currentMonth] = s1Hires;
        }
        if (exitsByMonth.every(v => v === 0) && s6Exits > 0) {
            exitsByMonth[currentMonth] = s6Exits;
        }

        dashboardCharts.turnoverTrend.data.datasets[0].data = hiresByMonth;
        dashboardCharts.turnoverTrend.data.datasets[1].data = exitsByMonth;
        dashboardCharts.turnoverTrend.update();
    }

    // 2. تحديث مخطط حالات العمليات
    if (dashboardCharts.operationsStatus) {
        const chartData = (totalOps > 0) 
            ? [pendingOps, reviewOps, completedOps, rejectedOps, duplicateOps]
            : [0, 0, 0, 0, 0];
        dashboardCharts.operationsStatus.data.datasets[0].data = chartData;
        dashboardCharts.operationsStatus.update();
    }

    // 3. تحديث مخطط كبرى الشركات حسب العمالة
    if (dashboardCharts.topCompanies) {
        if (targetCompId && selectedComp) {
            // عند اختيار شركة واحدة: عرض توزيع موظفي الشركة (نشط vs مستقيل vs غير مكتمل)
            const actCount = filteredEmployees.filter(e => !e.resignation_date).length;
            const resCount = filteredEmployees.filter(e => Boolean(e.resignation_date)).length;
            const insCount = filteredEmployees.filter(e => Boolean(e.ins_num)).length;
            const notInsCount = Math.max(0, totalEmployees - insCount);

            dashboardCharts.topCompanies.data.labels = ['نشط على رأس العمل', 'مستقيل / منتهي الخدمة', 'مؤمن عليه', 'غير مؤمن'];
            dashboardCharts.topCompanies.data.datasets[0].data = [actCount, resCount, insCount, notInsCount];
        } else {
            const compCounts = {};
            const compNameMap = {};
            companies.forEach(c => {
                compCounts[c.name || c.id] = 0;
                compNameMap[c.id] = c.name;
            });

            employees.forEach(e => {
                const cId = e.company_id || 'other';
                const cName = compNameMap[cId] || e.company_name || 'غير محدد';
                compCounts[cName] = (compCounts[cName] || 0) + 1;
            });

            // ترتيب الشركات تنازلياً واختيار أعلى 5
            const sortedComps = Object.entries(compCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
            if (sortedComps.length > 0) {
                dashboardCharts.topCompanies.data.labels = sortedComps.map(item => item[0].length > 18 ? item[0].substring(0, 18) + '...' : item[0]);
                dashboardCharts.topCompanies.data.datasets[0].data = sortedComps.map(item => item[1]);
            } else {
                dashboardCharts.topCompanies.data.labels = ['لا توجد بيانات'];
                dashboardCharts.topCompanies.data.datasets[0].data = [0];
            }
        }
        dashboardCharts.topCompanies.update();
    }

    // 4. تحديث شرائح الأجور
    if (dashboardCharts.wageBrackets) {
        let b1 = 0, b2 = 0, b3 = 0, b4 = 0;
        filteredEmployees.forEach(e => {
            const w = parseFloat(e.sub_wage) || 0;
            if (w < 3500) b1++;
            else if (w <= 6000) b2++;
            else if (w <= 10000) b3++;
            else b4++;
        });
        dashboardCharts.wageBrackets.data.datasets[0].data = [b1, b2, b3, b4];
        dashboardCharts.wageBrackets.update();
    }

    // 5. تحديث المؤهلات
    if (dashboardCharts.qualifications) {
        let qHigh = 0, qAboveMid = 0, qMid = 0, qOther = 0;
        filteredEmployees.forEach(e => {
            const q = (e.qualification || '').toLowerCase();
            if (q.includes('بكالوريوس') || q.includes('ليسانس') || q.includes('عالي') || q.includes('ماجستير') || q.includes('دكتوراه')) {
                qHigh++;
            } else if (q.includes('فوق') || q.includes('معهد سنتين') || q.includes('معهد فني')) {
                qAboveMid++;
            } else if (q.includes('متوسط') || q.includes('دبلوم') || q.includes('صنايع') || q.includes('تجاري') || q.includes('ثانوي')) {
                qMid++;
            } else {
                qOther++;
            }
        });
        dashboardCharts.qualifications.data.datasets[0].data = [qHigh, qAboveMid, qMid, qOther];
        dashboardCharts.qualifications.update();
    }
}

// أنيميشن عد الأرقام للأرقام القيادية بطريقة احترافية وذكية بالأرقام العربية
function animateValue(id, endValue, suffix = '') {
    const obj = document.getElementById(id);
    if (!obj) return;
    
    const num = (typeof endValue === 'number' && !isNaN(endValue)) ? endValue : (parseFloat(endValue) || 0);
    const isInt = Number.isInteger(num);
    const rawEnd = isInt ? Math.round(num).toLocaleString('en-US') : num.toFixed(1);
    const formattedEnd = (typeof toArabicDigits === 'function' ? toArabicDigits(rawEnd) : rawEnd) + suffix;

    const startDigits = (obj.innerText || '0').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^0-9.]/g, '');
    const startValue = parseFloat(startDigits) || 0;
    if (startValue === num) {
        obj.innerText = formattedEnd;
        return;
    }

    const duration = 350;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const current = startValue + (num - startValue) * (1 - Math.pow(1 - progress, 3)); // easeOutCubic
        
        let currentText = isInt ? Math.round(current).toLocaleString('en-US') : current.toFixed(1);
        if (typeof toArabicDigits === 'function') currentText = toArabicDigits(currentText);
        
        obj.innerText = currentText + suffix;

        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.innerText = formattedEnd;
        }
    };
    window.requestAnimationFrame(step);
}

// تعبئة قائمة اختيار الشركات في فلاتر لوحة التحكم
function populateDashboardCompanyFilter() {
    const select = document.getElementById('dashCompanyFilter');
    if (!select) return;

    const { companies } = getDashboardData();
    const currentVal = select.value || dashboardFilterState.companyId || 'all';

    let html = '<option value="all">🏢 جميع الشركات (مجمّع)</option>';
    companies.forEach(c => {
        html += `<option value="${c.id}">${c.name} (${c.code || c.ins_num || ''})</option>`;
    });

    select.innerHTML = html;
    select.value = currentVal;
}

// تغيير تصفية الشركة
function handleDashboardCompanyChange(companyId) {
    dashboardFilterState.companyId = companyId;
    updateDashboardAnalytics();
}

// تغيير تصفية الفترة الزمنية
function handleDashboardPeriodChange(period) {
    dashboardFilterState.period = period;
    document.querySelectorAll('.dash-period-btn').forEach(btn => {
        if (btn.dataset.period === period) {
            btn.classList.add('active-period');
        } else {
            btn.classList.remove('active-period');
        }
    });
    updateDashboardAnalytics();
}

// ==========================================================================
// محرك تصدير التقرير الإحصائي والتحليلي الفاخر (Executive Colored Excel Export)
// ==========================================================================

const DASH_EXCEL_STYLES = {
    mainBanner: {
        font: { name: "Arial", sz: 14, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "0F2E59" } },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: {
            top: { style: "medium", color: { rgb: "0A1E3F" } },
            bottom: { style: "medium", color: { rgb: "0A1E3F" } },
            left: { style: "medium", color: { rgb: "0A1E3F" } },
            right: { style: "medium", color: { rgb: "0A1E3F" } }
        }
    },
    subBanner: {
        font: { name: "Arial", sz: 10, italic: true, bold: true, color: { rgb: "E2E8F0" } },
        fill: { fgColor: { rgb: "1E3A8A" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
            top: { style: "thin", color: { rgb: "3B82F6" } },
            bottom: { style: "medium", color: { rgb: "0A1E3F" } },
            left: { style: "thin", color: { rgb: "3B82F6" } },
            right: { style: "thin", color: { rgb: "3B82F6" } }
        }
    },
    sectionHeader: (bgColorRgb) => ({
        font: { name: "Arial", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: bgColorRgb } },
        alignment: { horizontal: "right", vertical: "center" },
        border: {
            top: { style: "thin", color: { rgb: "CBD5E1" } },
            bottom: { style: "thin", color: { rgb: "CBD5E1" } },
            left: { style: "thin", color: { rgb: "CBD5E1" } },
            right: { style: "thin", color: { rgb: "CBD5E1" } }
        }
    }),
    tableHeader: (bgColorRgb = "1E3A8A") => ({
        font: { name: "Arial", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: bgColorRgb } },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: {
            top: { style: "medium", color: { rgb: "0F172A" } },
            bottom: { style: "medium", color: { rgb: "0F172A" } },
            left: { style: "thin", color: { rgb: "CBD5E1" } },
            right: { style: "thin", color: { rgb: "CBD5E1" } }
        }
    }),
    kpiLabel: (isEven = false) => ({
        font: { name: "Arial", sz: 11, bold: true, color: { rgb: "1E293B" } },
        fill: { fgColor: { rgb: isEven ? "F8FAFC" : "FFFFFF" } },
        alignment: { horizontal: "right", vertical: "center" },
        border: {
            top: { style: "thin", color: { rgb: "E2E8F0" } },
            bottom: { style: "thin", color: { rgb: "E2E8F0" } },
            left: { style: "thin", color: { rgb: "E2E8F0" } },
            right: { style: "thin", color: { rgb: "E2E8F0" } }
        }
    }),
    kpiValue: (isEven = false, colorRgb = "0F172A") => ({
        font: { name: "Arial", sz: 11, bold: true, color: { rgb: colorRgb } },
        fill: { fgColor: { rgb: isEven ? "F8FAFC" : "FFFFFF" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
            top: { style: "thin", color: { rgb: "E2E8F0" } },
            bottom: { style: "thin", color: { rgb: "E2E8F0" } },
            left: { style: "thin", color: { rgb: "E2E8F0" } },
            right: { style: "thin", color: { rgb: "E2E8F0" } }
        }
    }),
    kpiNote: (isEven = false) => ({
        font: { name: "Arial", sz: 10, color: { rgb: "64748B" } },
        fill: { fgColor: { rgb: isEven ? "F8FAFC" : "FFFFFF" } },
        alignment: { horizontal: "right", vertical: "center" },
        border: {
            top: { style: "thin", color: { rgb: "E2E8F0" } },
            bottom: { style: "thin", color: { rgb: "E2E8F0" } },
            left: { style: "thin", color: { rgb: "E2E8F0" } },
            right: { style: "thin", color: { rgb: "E2E8F0" } }
        }
    }),
    dataCell: (isEven = false, align = "center") => ({
        font: { name: "Arial", sz: 10, color: { rgb: "334155" } },
        fill: { fgColor: { rgb: isEven ? "F8FAFC" : "FFFFFF" } },
        alignment: { horizontal: align, vertical: "center" },
        border: {
            top: { style: "thin", color: { rgb: "E2E8F0" } },
            bottom: { style: "thin", color: { rgb: "E2E8F0" } },
            left: { style: "thin", color: { rgb: "E2E8F0" } },
            right: { style: "thin", color: { rgb: "E2E8F0" } }
        }
    }),
    statusBadge: (status) => {
        let bg = "F1F5F9", fg = "475569";
        if (status === 'مكتمل') { bg = "DCFCE7"; fg = "15803D"; }
        else if (status === 'انتظار') { bg = "FEF3C7"; fg = "B45309"; }
        else if (status === 'قيد المراجعة') { bg = "E0F2FE"; fg = "0369A1"; }
        else if (status === 'مرفوض') { bg = "FEE2E2"; fg = "B91C1C"; }
        else if (status === 'مكرر') { bg = "F3E8FF"; fg = "7E22CE"; }
        return {
            font: { name: "Arial", sz: 10, bold: true, color: { rgb: fg } },
            fill: { fgColor: { rgb: bg } },
            alignment: { horizontal: "center", vertical: "center" },
            border: {
                top: { style: "thin", color: { rgb: "CBD5E1" } },
                bottom: { style: "thin", color: { rgb: "CBD5E1" } },
                left: { style: "thin", color: { rgb: "CBD5E1" } },
                right: { style: "thin", color: { rgb: "CBD5E1" } }
            }
        };
    }
};

function exportDashboardReport() {
    try {
        if (typeof XLSX === 'undefined') {
            showNotification('مكتبة تصدير Excel غير متوفرة حالياً', 'error');
            return;
        }

        const { companies, employees, operations } = getDashboardData();
        const wb = XLSX.utils.book_new();

        const curDate = new Date();
        const dateStr = curDate.toLocaleDateString('ar-EG');
        const timeStr = curDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

        // تطبيق الفلاتر النشطة في لوحة التحكم
        let selectedComp = null;
        if (dashboardFilterState.companyId !== 'all') {
            selectedComp = companies.find(c => 
                String(c.id).trim() === String(dashboardFilterState.companyId).trim() ||
                (c.name && c.name.trim() === String(dashboardFilterState.companyId).trim()) ||
                (c.code && String(c.code).trim() === String(dashboardFilterState.companyId).trim())
            );
        }

        const targetCompId = selectedComp ? String(selectedComp.id).trim() : (dashboardFilterState.companyId !== 'all' ? String(dashboardFilterState.companyId).trim() : null);
        const targetCompName = selectedComp ? (selectedComp.name || '').trim() : (dashboardFilterState.companyId !== 'all' ? String(dashboardFilterState.companyId).trim() : '');
        const targetCompCode = selectedComp ? (selectedComp.code || '').trim() : '';

        let expCompanies = companies;
        let expEmployees = employees;
        let expOperations = operations;

        if (targetCompId) {
            expCompanies = selectedComp ? [selectedComp] : companies.filter(c => String(c.id).trim() === targetCompId || (c.name && c.name.trim() === targetCompName));
            
            expEmployees = employees.filter(e => {
                const empCompId = e.company_id ? String(e.company_id).trim() : '';
                const empCompName = e.company_name ? String(e.company_name).trim() : '';
                const empCompCode = e.company_code ? String(e.company_code).trim() : '';

                return (
                    (empCompId && (empCompId === targetCompId || empCompId === targetCompName)) ||
                    (targetCompName && empCompName && (empCompName === targetCompName || empCompName.includes(targetCompName) || targetCompName.includes(empCompName))) ||
                    (targetCompCode && empCompCode && empCompCode === targetCompCode)
                );
            });

            const targetEmpCodes = new Set(expEmployees.map(e => String(e.code || '').trim()).filter(Boolean));
            const targetEmpNames = new Set(expEmployees.map(e => (e.name || '').trim()).filter(Boolean));

            expOperations = operations.filter(o => {
                const opCompId = o.company_id ? String(o.company_id).trim() : '';
                const opCompName = o.company ? String(o.company).trim() : (o.company_name ? String(o.company_name).trim() : '');
                const opEmpCode = o.employeeCode ? String(o.employeeCode).trim() : (o.requestCode ? String(o.requestCode).trim() : '');
                const opEmpName = o.name ? String(o.name).trim() : '';

                const matchByComp = (
                    (opCompId && (opCompId === targetCompId || opCompId === targetCompName)) ||
                    (targetCompName && opCompName && (opCompName === targetCompName || opCompName.includes(targetCompName) || targetCompName.includes(opCompName))) ||
                    (targetCompId && opCompName && opCompName === targetCompId) ||
                    (targetCompCode && opCompName && opCompName === targetCompCode)
                );

                const matchByEmp = (
                    (opEmpCode && targetEmpCodes.has(opEmpCode)) ||
                    (opEmpName && targetEmpNames.has(opEmpName))
                );

                return matchByComp || matchByEmp;
            });
        }

        if (dashboardFilterState.period !== 'all') {
            const now = new Date();
            expOperations = expOperations.filter(op => {
                const dateStr = op.incomingDate || op.date || op.approvalDate || '';
                if (!dateStr) return true;
                const opDate = new Date(dateStr);
                if (isNaN(opDate.getTime())) return true;

                if (dashboardFilterState.period === 'month') {
                    return opDate.getMonth() === now.getMonth() && opDate.getFullYear() === now.getFullYear();
                } else if (dashboardFilterState.period === 'quarter') {
                    const curQuarter = Math.floor(now.getMonth() / 3);
                    const opQuarter = Math.floor(opDate.getMonth() / 3);
                    return curQuarter === opQuarter && opDate.getFullYear() === now.getFullYear();
                } else if (dashboardFilterState.period === 'year') {
                    return opDate.getFullYear() === now.getFullYear();
                }
                return true;
            });
        }

        // ======================================================================
        // الورقة 1: لوحة المؤشرات العامة والتحليلات القيادية
        // ======================================================================
        const wsKpi = {};
        const merges = [];
        let r = 0;

        // دالة مساعدة لوضع خلية مع التنسيق
        const setCell = (row, col, value, style) => {
            const addr = XLSX.utils.encode_cell({ r: row, c: col });
            wsKpi[addr] = { v: value, t: (typeof value === 'number' ? 'n' : 's'), s: style };
        };

        // 1. البانر الرئيسي والعنوان (Merged A1:C1)
        const filterTitle = targetCompName ? `تقرير مؤشرات: ${targetCompName}` : "نظام إدارة التأمينات المتكامل - تقرير المؤشرات والتحليلات القيادية الشاملة";
        setCell(r, 0, filterTitle, DASH_EXCEL_STYLES.mainBanner);
        setCell(r, 1, "", DASH_EXCEL_STYLES.mainBanner);
        setCell(r, 2, "", DASH_EXCEL_STYLES.mainBanner);
        merges.push({ s: { r: r, c: 0 }, e: { r: r, c: 2 } });
        r++;

        // 2. الشريط الفرعي للبيانات الوصفية (Merged A2:C2)
        const filterPeriodLabel = dashboardFilterState.period === 'month' ? 'الشهر الحالي' : (dashboardFilterState.period === 'quarter' ? 'الربع الحالي' : (dashboardFilterState.period === 'year' ? 'العام الحالي' : 'كافة الفترات'));
        const subText = `تاريخ الاستخراج: ${dateStr}  |  الوقت: ${timeStr}  |  نطاق التقرير: ${targetCompName || 'جميع المنشآت (مجمّع)'}  |  الفترة: ${filterPeriodLabel}`;
        setCell(r, 0, subText, DASH_EXCEL_STYLES.subBanner);
        setCell(r, 1, "", DASH_EXCEL_STYLES.subBanner);
        setCell(r, 2, "", DASH_EXCEL_STYLES.subBanner);
        merges.push({ s: { r: r, c: 0 }, e: { r: r, c: 2 } });
        r++;

        // فاصل فارغ
        r++;

        // أقسام المؤشرات
        const addKpiSection = (sectionTitle, sectionBgRgb, items) => {
            // عنوان القسم مدمج على العرض كاملاً
            setCell(r, 0, sectionTitle, DASH_EXCEL_STYLES.sectionHeader(sectionBgRgb));
            setCell(r, 1, "", DASH_EXCEL_STYLES.sectionHeader(sectionBgRgb));
            setCell(r, 2, "", DASH_EXCEL_STYLES.sectionHeader(sectionBgRgb));
            merges.push({ s: { r: r, c: 0 }, e: { r: r, c: 2 } });
            r++;

            // ترويسة الجدول الفرعي
            setCell(r, 0, "المؤشر الإحصائي", DASH_EXCEL_STYLES.tableHeader("334155"));
            setCell(r, 1, "القيمة الرقمية", DASH_EXCEL_STYLES.tableHeader("334155"));
            setCell(r, 2, "التفاصيل والملاحظات", DASH_EXCEL_STYLES.tableHeader("334155"));
            r++;

            // صفوف البيانات
            items.forEach((item, idx) => {
                const isEven = idx % 2 === 1;
                setCell(r, 0, item.label, DASH_EXCEL_STYLES.kpiLabel(isEven));
                setCell(r, 1, item.value, DASH_EXCEL_STYLES.kpiValue(isEven, item.color || "0F172A"));
                setCell(r, 2, item.note || "-", DASH_EXCEL_STYLES.kpiNote(isEven));
                r++;
            });

            // فاصل فارغ بعد كل قسم
            r++;
        };

        // حسابات المؤشرات
        const corpCount = expCompanies.filter(c => (c.legal_entity || '').includes('مساهمة')).length;
        const totalSubWage = expEmployees.reduce((sum, e) => sum + (parseFloat(e.sub_wage) || 0), 0);
        const totalCompWage = expEmployees.reduce((sum, e) => sum + (parseFloat(e.comp_wage) || 0), 0);
        const avgWage = expEmployees.length > 0 ? Math.round(totalSubWage / expEmployees.length) : 0;
        const disabilityCount = expEmployees.filter(e => e.has_disability === true || e.has_disability === 'true' || e.has_disability === '1').length;
        
        const completedOps = expOperations.filter(o => o.status === 'مكتمل').length;
        const pendingOps = expOperations.filter(o => o.status === 'انتظار').length;
        const reviewOps = expOperations.filter(o => o.status === 'قيد المراجعة').length;
        const s1Codes = new Set();
        const s6Codes = new Set();
        expOperations.forEach(o => {
            const rType = o.requestType || '';
            const code = String(o.employeeCode || o.requestCode || o.name || '');
            if (rType.includes('س1') || rType.includes('استمارة 1') || rType.includes('تعيين')) s1Codes.add(code || o.id);
            else if (rType.includes('س6') || rType.includes('استمارة 6') || rType.includes('إنهاء') || rType.includes('استقالة')) s6Codes.add(code || o.id);
        });
        expEmployees.forEach(e => {
            const code = String(e.code || e.name || e.id);
            if (e.hire_date || e.sub_start_date) s1Codes.add(code);
            if (e.resignation_date) s6Codes.add(code);
        });
        const s1Hires = s1Codes.size;
        const s6Exits = s6Codes.size;
        const netGrowth = s1Hires - s6Exits;
        const turnoverRate = expEmployees.length > 0 ? ((s6Exits / expEmployees.length) * 100).toFixed(1) + '%' : '0.0%';
        const opCompletionRate = expOperations.length > 0 ? Math.round((completedOps / expOperations.length) * 100) + '%' : '0%';

        let compliantCount = 0;
        expEmployees.forEach(e => {
            if (e.name && e.nat_id && String(e.nat_id).trim().length === 14 && e.ins_num && e.sub_wage) compliantCount++;
        });
        const compRate = expEmployees.length > 0 ? Math.round((compliantCount / expEmployees.length) * 100) + '%' : '100%';

        // 1. قسم الشركات
        addKpiSection("🏢 أولاً: مؤشرات المنشآت والشركات المسجلة", "0284C7", [
            { label: "إجمالي الشركات المسجلة", value: expCompanies.length, color: "0284C7", note: targetCompName ? `المنشأة المحددة: ${targetCompName}` : "جميع المنشآت النشطة بالنظام" },
            { label: "شركات الأموال والمساهمة", value: corpCount, color: "0F172A", note: "شركات مساهمة مقيدة" },
            { label: "الكيانات والشركات الأخرى", value: expCompanies.length - corpCount, color: "0F172A", note: "تضامن، مسؤولية محدودة، وفردية" }
        ]);

        // 2. قسم القوى العاملة
        addKpiSection("👥 ثانياً: مؤشرات القوى العاملة والعمالة", "4338CA", [
            { label: "إجمالي القوى العاملة المسجلة", value: expEmployees.length, color: "4338CA", note: "إجمالي العمالة والموظفين في نطاق التقرير" },
            { label: "العمالة من ذوي الهمم (نسبة 5%)", value: disabilityCount, color: "0D9488", note: "مستوفاة شروط نسبة العجز القانونية" },
            { label: "مؤشر اكتمال وصحة السجلات", value: compRate, color: "16A34A", note: `${compliantCount} من ${expEmployees.length} ملف مكتمل تماماً` }
        ]);

        // 3. قسم الأجور
        addKpiSection("💰 ثالثاً: كتلة الأجور والاشتراكات التأمينية", "059669", [
            { label: "إجمالي أجور الاشتراك التأميني (شهرياً)", value: totalSubWage.toLocaleString('ar-EG') + " ج.م", color: "059669", note: "وعاء حساب الاشتراكات الشهرية" },
            { label: "إجمالي الأجور الشاملة", value: totalCompWage.toLocaleString('ar-EG') + " ج.م", color: "0F172A", note: "الكتلة الإجمالية شاملة البدلات" },
            { label: "متوسط الأجر التأميني للموظف", value: avgWage.toLocaleString('ar-EG') + " ج.م", color: "0F172A", note: "متوسط أجر الاشتراك للعمالة" }
        ]);

        // 4. قسم العمليات ودوران العمالة
        addKpiSection("📋 رابعاً: العمليات التأمينية ومؤشر دوران العمالة (Turnover)", "BE123C", [
            { label: "إجمالي المعاملات والطلبات", value: expOperations.length, color: "BE123C", note: "كافة الحركات المسجلة بالنظام في النطاق" },
            { label: "المعاملات المكتملة والمعتمدة", value: completedOps, color: "16A34A", note: `نسبة الإنجاز العامة: ${opCompletionRate}` },
            { label: "المعاملات قيد المراجعة والانتظار", value: pendingOps + reviewOps, color: "D97706", note: `${pendingOps} انتظار • ${reviewOps} مراجعة` },
            { label: "حركات التعيين الجديدة (استمارة 1)", value: s1Hires, color: "0284C7", note: "إجمالي التعيينات المقيدة" },
            { label: "حركات الاستقالة وإنهاء الخدمة (استمارة 6)", value: s6Exits, color: "E11D48", note: "إجمالي الاستقالات وحالات إنهاء الخدمة" },
            { label: "معدل دوران العمالة (Turnover Rate)", value: turnoverRate, color: "BE123C", note: `صافي النمو: ${netGrowth >= 0 ? '+' : ''}${netGrowth} موظف` }
        ]);

        wsKpi['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r - 1, c: 2 } });
        wsKpi['!merges'] = merges;
        wsKpi['!cols'] = [{ wch: 46 }, { wch: 28 }, { wch: 42 }];
        wsKpi['!dir'] = 'rtl';
        XLSX.utils.book_append_sheet(wb, wsKpi, "المؤشرات والتحليلات القيادية");

        // ======================================================================
        // الورقة 2: تفاصيل المنشآت والشركات
        // ======================================================================
        const wsComp = {};
        const compMerges = [];
        let cr = 0;

        const setCompCell = (row, col, value, style) => {
            const addr = XLSX.utils.encode_cell({ r: row, c: col });
            wsComp[addr] = { v: value, t: (typeof value === 'number' ? 'n' : 's'), s: style };
        };

        setCompCell(cr, 0, "سجل الشركات والمنشآت المسجلة بالنظام", DASH_EXCEL_STYLES.mainBanner);
        for (let c = 1; c <= 7; c++) setCompCell(cr, c, "", DASH_EXCEL_STYLES.mainBanner);
        compMerges.push({ s: { r: cr, c: 0 }, e: { r: cr, c: 7 } });
        cr++;

        const compHeaders = ["م", "كود الشركة", "اسم المنشأة / الشركة", "الرقم التأميني", "الشكل القانوني", "نوع المنشأة", "المدير المسؤول", "اسم المكتب"];
        compHeaders.forEach((h, c) => setCompCell(cr, c, h, DASH_EXCEL_STYLES.tableHeader("0284C7")));
        cr++;

        expCompanies.forEach((comp, idx) => {
            const isEven = idx % 2 === 1;
            setCompCell(cr, 0, idx + 1, DASH_EXCEL_STYLES.dataCell(isEven, "center"));
            setCompCell(cr, 1, comp.code || comp.fac_number || "-", DASH_EXCEL_STYLES.dataCell(isEven, "center"));
            setCompCell(cr, 2, comp.name || "-", DASH_EXCEL_STYLES.dataCell(isEven, "right"));
            setCompCell(cr, 3, comp.ins_num || "-", DASH_EXCEL_STYLES.dataCell(isEven, "center"));
            setCompCell(cr, 4, comp.legal_entity || "-", DASH_EXCEL_STYLES.dataCell(isEven, "center"));
            setCompCell(cr, 5, comp.fac_type == '1' ? 'نمطي' : (comp.fac_type || '-'), DASH_EXCEL_STYLES.dataCell(isEven, "center"));
            setCompCell(cr, 6, comp.manager || "-", DASH_EXCEL_STYLES.dataCell(isEven, "right"));
            setCompCell(cr, 7, comp.office_name || "-", DASH_EXCEL_STYLES.dataCell(isEven, "right"));
            cr++;
        });

        wsComp['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: cr - 1, c: 7 } });
        wsComp['!merges'] = compMerges;
        wsComp['!cols'] = [{ wch: 6 }, { wch: 14 }, { wch: 34 }, { wch: 18 }, { wch: 22 }, { wch: 14 }, { wch: 24 }, { wch: 26 }];
        wsComp['!dir'] = 'rtl';
        XLSX.utils.book_append_sheet(wb, wsComp, "الشركات والمنشآت");

        // ======================================================================
        // الورقة 3: سجل العمليات والطلبات
        // ======================================================================
        const wsOps = {};
        const opsMerges = [];
        let or = 0;

        const setOpCell = (row, col, value, style) => {
            const addr = XLSX.utils.encode_cell({ r: row, c: col });
            wsOps[addr] = { v: value, t: (typeof value === 'number' ? 'n' : 's'), s: style };
        };

        setOpCell(or, 0, "سجل العمليات والطلبات التأمينية ومتابعة الحالات", DASH_EXCEL_STYLES.mainBanner);
        for (let c = 1; c <= 8; c++) setOpCell(or, c, "", DASH_EXCEL_STYLES.mainBanner);
        opsMerges.push({ s: { r: or, c: 0 }, e: { r: or, c: 8 } });
        or++;

        const opHeaders = ["م", "كود الطلب", "رقم الوارد", "تاريخ الوارد", "نوع الطلب", "اسم الموظف / المعاملة", "الشركة / المنشأة", "حالة الطلب", "الملاحظات"];
        opHeaders.forEach((h, c) => setOpCell(or, c, h, DASH_EXCEL_STYLES.tableHeader("BE123C")));
        or++;

        expOperations.forEach((op, idx) => {
            const isEven = idx % 2 === 1;
            setOpCell(or, 0, idx + 1, DASH_EXCEL_STYLES.dataCell(isEven, "center"));
            setOpCell(or, 1, op.requestCode || op.seqNum || "-", DASH_EXCEL_STYLES.dataCell(isEven, "center"));
            setOpCell(or, 2, op.incomingNum || "-", DASH_EXCEL_STYLES.dataCell(isEven, "center"));
            setOpCell(or, 3, op.incomingDate || op.date || "-", DASH_EXCEL_STYLES.dataCell(isEven, "center"));
            setOpCell(or, 4, op.requestType || "-", DASH_EXCEL_STYLES.dataCell(isEven, "center"));
            setOpCell(or, 5, op.name || "-", DASH_EXCEL_STYLES.dataCell(isEven, "right"));
            setOpCell(or, 6, op.company || op.company_name || "-", DASH_EXCEL_STYLES.dataCell(isEven, "right"));
            setOpCell(or, 7, op.status || "-", DASH_EXCEL_STYLES.statusBadge(op.status));
            setOpCell(or, 8, op.notes || "-", DASH_EXCEL_STYLES.dataCell(isEven, "right"));
            or++;
        });

        wsOps['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: or - 1, c: 8 } });
        wsOps['!merges'] = opsMerges;
        wsOps['!cols'] = [{ wch: 6 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 28 }, { wch: 30 }, { wch: 16 }, { wch: 36 }];
        wsOps['!dir'] = 'rtl';
        XLSX.utils.book_append_sheet(wb, wsOps, "سجل العمليات والطلبات");

        // ======================================================================
        // الورقة 4: سجل الموظفين والأجور
        // ======================================================================
        const wsEmp = {};
        const empMerges = [];
        let er = 0;

        const setEmpCell = (row, col, value, style) => {
            const addr = XLSX.utils.encode_cell({ r: row, c: col });
            wsEmp[addr] = { v: value, t: (typeof value === 'number' ? 'n' : 's'), s: style };
        };

        setEmpCell(er, 0, "سجل بيانات الموظفين والأجور التأمينية والشاملة", DASH_EXCEL_STYLES.mainBanner);
        for (let c = 1; c <= 9; c++) setEmpCell(er, c, "", DASH_EXCEL_STYLES.mainBanner);
        empMerges.push({ s: { r: er, c: 0 }, e: { r: er, c: 9 } });
        er++;

        const empHeaders = ["م", "كود الموظف", "اسم الموظف", "الرقم القومي", "الرقم التأميني", "المنشأة التابع لها", "المؤهل الدراسي", "المهنة", "أجر الاشتراك (ج.م)", "الأجر الشامل (ج.م)"];
        empHeaders.forEach((h, c) => setEmpCell(er, c, h, DASH_EXCEL_STYLES.tableHeader("059669")));
        er++;

        expEmployees.forEach((emp, idx) => {
            const isEven = idx % 2 === 1;
            setEmpCell(er, 0, idx + 1, DASH_EXCEL_STYLES.dataCell(isEven, "center"));
            setEmpCell(er, 1, emp.code || "-", DASH_EXCEL_STYLES.dataCell(isEven, "center"));
            setEmpCell(er, 2, emp.name || "-", DASH_EXCEL_STYLES.dataCell(isEven, "right"));
            setEmpCell(er, 3, emp.nat_id || "-", DASH_EXCEL_STYLES.dataCell(isEven, "center"));
            setEmpCell(er, 4, emp.ins_num || "-", DASH_EXCEL_STYLES.dataCell(isEven, "center"));
            setEmpCell(er, 5, emp.company_name || "-", DASH_EXCEL_STYLES.dataCell(isEven, "right"));
            setEmpCell(er, 6, emp.qualification || "-", DASH_EXCEL_STYLES.dataCell(isEven, "center"));
            setEmpCell(er, 7, emp.occupation || "-", DASH_EXCEL_STYLES.dataCell(isEven, "right"));
            setEmpCell(er, 8, parseFloat(emp.sub_wage) || 0, DASH_EXCEL_STYLES.dataCell(isEven, "center"));
            setEmpCell(er, 9, parseFloat(emp.comp_wage) || 0, DASH_EXCEL_STYLES.dataCell(isEven, "center"));
            er++;
        });

        wsEmp['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: er - 1, c: 9 } });
        wsEmp['!merges'] = empMerges;
        wsEmp['!cols'] = [{ wch: 6 }, { wch: 14 }, { wch: 28 }, { wch: 20 }, { wch: 18 }, { wch: 30 }, { wch: 24 }, { wch: 26 }, { wch: 18 }, { wch: 18 }];
        wsEmp['!dir'] = 'rtl';
        XLSX.utils.book_append_sheet(wb, wsEmp, "الموظفين والأجور");

        // تصدير الملف
        const suffixName = targetCompName ? `_${targetCompName.replace(/[\\/:*?"<>|]/g, '_')}` : '';
        const fileName = `تقرير_التحليلات_التأمينية${suffixName}_${curDate.toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        showNotification('تم استخراج وتصدير تقرير التحليلات الفاخر بنجاح!', 'success');
    } catch (err) {
        console.error("Export dashboard error:", err);
        showNotification('حدث خطأ أثناء تصدير التقرير المنسق', 'error');
    }
}

// طباعة لوحة التحكم
function printDashboardReport() {
    window.print();
}

// تشغيل تلقائي عند اكتمال تحميل المستند
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initDashboard, 150);
    });
} else {
    setTimeout(initDashboard, 150);
}
