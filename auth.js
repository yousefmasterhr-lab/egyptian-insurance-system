// ==========================================================================
// نظام إدارة المصادقة وعزل البيانات (auth.js)
// ==========================================================================

const ADMIN_EMAIL = "admin@insurance.com";
let currentUser = null;
let isGuestMode = false;
// مخزن الذاكرة المؤقت الافتراضي - فارغ تماماً للوضع النظيف للمستخدم الجديد
let guestData = {
    companies: [],
    employees: [],
    operations: []
};

// بيانات توضيحية تجريبية عامة ومبتكرة فقط في حال طلب المستخدم تجربة النظام ببيانات استرشادية
const sampleDemoMockData = {
    companies: [
        {
            id: 'demo_comp_1',
            name: 'شركة الأمل للتجارة والمقاولات (نموذج تجريبي)',
            code: '1001',
            manager: 'أحمد محمود إبراهيم',
            ins_num: '87654321',
            fac_number: '1234',
            fac_type: '1',
            legal_entity: 'شركة مساهمة',
            comm_reg: '98765',
            tax_card: '456-789-123',
            office_name: 'مكتب تأمينات المعادي',
            address: 'القاهرة - المعادي',
            manager_title: 'رئيس مجلس الإدارة',
            manager_nat_id: '29001010101010',
            manager_ins_num: '12345678',
            manager_phone: '01000000001',
            agent_name: 'أحمد سعيد',
            agent_title: 'مفوض عام',
            agent_nat_id: '29202020202020',
            agent_ins_num: '87654321',
            agent_phone: '01000000002',
            attachments: []
        },
        {
            id: 'demo_comp_2',
            name: 'مؤسسة النور للصناعات الهندسية (نموذج تجريبي)',
            code: '1002',
            manager: 'سامي عبد الرحمن',
            ins_num: '87654322',
            fac_number: '5678',
            fac_type: '1',
            legal_entity: 'شركة ذات مسؤولية محدودة',
            comm_reg: '98766',
            tax_card: '456-789-124',
            office_name: 'مكتب تأمينات مدينة نصر',
            address: 'القاهرة - المنطقة الصناعية',
            manager_title: 'المدير العام',
            manager_nat_id: '28503030303030',
            manager_ins_num: '22334455',
            manager_phone: '01000000003',
            agent_name: 'ياسر كمال',
            agent_title: 'مدير شؤون العاملين',
            agent_nat_id: '28804040404040',
            agent_ins_num: '33445566',
            agent_phone: '01000000004',
            attachments: []
        }
    ],
    employees: [
        {
            id: 'demo_emp_1',
            company_id: 'demo_comp_1',
            company_name: 'شركة الأمل للتجارة والمقاولات (نموذج تجريبي)',
            code: '101',
            name: 'إبراهيم علي حسن (تجريبي)',
            nat_id: '29505050505050',
            ins_num: '55443322',
            mother_name: 'فاطمة محمود',
            qualification: 'بكالوريوس تجارة',
            occupation: 'محاسب عام',
            occupationCode: '2411',
            hire_date: '2026-01-01',
            sub_start_date: '2026-01-01',
            ins_date: '2026-01-05',
            resignation_date: '',
            duration_type: 'نمطي',
            sub_wage: '4500',
            comp_wage: '6000',
            has_disability: false,
            gov: 'القاهرة',
            center: 'المعادي',
            village: 'دجلة',
            street: 'شارع 250',
            building_no: '14',
            phone: '01111111111'
        },
        {
            id: 'demo_emp_2',
            company_id: 'demo_comp_2',
            company_name: 'مؤسسة النور للصناعات الهندسية (نموذج تجريبي)',
            code: '102',
            name: 'سارة عبد الله يوسف (تجريبي)',
            nat_id: '29707070707070',
            ins_num: '55443323',
            mother_name: 'مريم علي',
            qualification: 'بكالوريوس هندسة حاسبات',
            occupation: 'مهندس برمجيات',
            occupationCode: '2512',
            hire_date: '2026-02-01',
            sub_start_date: '2026-02-01',
            ins_date: '',
            resignation_date: '',
            duration_type: 'نمطي',
            sub_wage: '8500',
            comp_wage: '12000',
            has_disability: false,
            gov: 'القاهرة',
            center: 'مدينة نصر',
            village: 'مكرم عبيد',
            street: 'شارع حسن المأمون',
            building_no: '22',
            phone: '01122222222'
        }
    ],
    operations: [
        {
            id: 'demo_op_1',
            seqNum: 1,
            requestCode: '101',
            incomingNum: '112233',
            incomingDate: '2026-01-02',
            requestType: 'س1',
            status: 'مكتمل',
            company: 'شركة الأمل للتجارة والمقاولات (نموذج تجريبي)',
            name: 'إبراهيم علي حسن (تجريبي)',
            notes: 'تم اعتماد استمارة س1 بنجاح',
            employeeCode: '101'
        }
    ]
};

// ==========================================
// مراقبة حالة المصادقة (Auth State Listener)
// ==========================================
function initAuth() {
    if (typeof firebase === 'undefined' || typeof firebase.auth !== 'function') {
        console.warn("Firebase Auth is not ready yet, retrying...");
        setTimeout(initAuth, 300);
        return;
    }

    const auth = firebase.auth();
    auth.onAuthStateChanged(async (user) => {
        isAuthInitialized = true;
        if (user) {
            currentUser = user;
            isGuestMode = false;
            try {
                localStorage.setItem('insurance_user_cached', 'true');
                document.documentElement.classList.add('has-cached-auth');
            } catch(e) {}
            console.log("Logged in user:", user.email, user.uid);
            
            // إخفاء نافذة تسجيل الدخول وشاشة الترحيب فوراً
            hideAuthModal();
            hideWelcomeScreen();

            // التحقق من ترحيل البيانات القديمة إذا كان الحساب هو المدير
            if (user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
                await checkAndMigrateLegacyData(user.uid);
            }
            
            onUserAuthenticated();
            updateUserUI();
        } else {
            currentUser = null;
            isGuestMode = true;
            try {
                localStorage.removeItem('insurance_user_cached');
                document.documentElement.classList.remove('has-cached-auth');
            } catch(e) {}
            // مستخدم غير مسجل -> إظهار شاشة الترحيب الرئيسية
            showWelcomeScreen();
            updateUserUI();
        }
    });
}

function showWelcomeScreen() {
    const welcome = document.getElementById('welcomeLandingScreen');
    if (welcome) {
        welcome.classList.remove('welcome-hidden');
    }
}
window.showWelcomeScreen = showWelcomeScreen;

function hideWelcomeScreen() {
    const welcome = document.getElementById('welcomeLandingScreen');
    if (welcome) {
        welcome.classList.add('welcome-hidden');
    }
}
window.hideWelcomeScreen = hideWelcomeScreen;

// 1. بدء الاستخدام مباشرة في الوضع النظيف الخالي من البيانات
function handleStartFreshUserDirectly() {
    hideWelcomeScreen();
    isGuestMode = true;
    guestData = { companies: [], employees: [], operations: [] };
    onUserAuthenticated();
    updateUserUI();
    showNotification('مرحباً بك! تم تشغيل النظام بالوضع النظيف وجاهز لإدخال بياناتك.', 'info');
    
    // تشغيل الجولة الإرشادية المحدثة
    setTimeout(() => {
        if (typeof startAppTour === 'function') {
            startAppTour();
        }
    }, 450);
}
window.handleStartFreshUserDirectly = handleStartFreshUserDirectly;

// 2. فتح نافذة تسجيل الدخول / إنشاء حساب من شاشة الترحيب
function handleOpenAuthFromWelcome() {
    hideWelcomeScreen();
    showAuthModal();
}
window.handleOpenAuthFromWelcome = handleOpenAuthFromWelcome;

// 3. فتح/إغلاق القائمة الجانبية في شاشات الهواتف
function toggleMobileSidebar(forceState) {
    const sidebar = document.getElementById('mainSidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (!sidebar) return;

    const isOpen = sidebar.classList.contains('mobile-sidebar-open');
    const shouldOpen = (forceState !== undefined) ? forceState : !isOpen;

    if (shouldOpen) {
        sidebar.classList.add('mobile-sidebar-open');
        if (backdrop) backdrop.classList.add('show');
    } else {
        sidebar.classList.remove('mobile-sidebar-open');
        if (backdrop) backdrop.classList.remove('show');
    }
}
window.toggleMobileSidebar = toggleMobileSidebar;

// ==========================================
// دوال تسجيل الدخول والعمليات
// ==========================================

// 1. تسجيل الدخول بالبريد وكلمة المرور
async function handleEmailLogin(event) {
    if (event) event.preventDefault();
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const btn = document.getElementById('btnLoginSubmit');
    const origText = btn.innerHTML;

    if (!email || !password) {
        showNotification('الرجاء إدخال البريد الإلكتروني وكلمة المرور', 'error');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';

    try {
        await firebase.auth().signInWithEmailAndPassword(email, password);
        showNotification('تم تسجيل الدخول بنجاح! مرحباً بك.', 'success');
        hideAuthModal();
    } catch (error) {
        console.error("Login error:", error);
        // إذا كان البريد هو بريد الأدمن ولم يكن منشأ بعد في Firebase Auth، نقوم بإنشائه تلقائياً كحساب افتراضي
        if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase() && (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential')) {
            try {
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> إنشاء حساب المدير الافتراضي...';
                await firebase.auth().createUserWithEmailAndPassword(email, password);
                showNotification('تم تفعيل وإنشاء حساب المدير الافتراضي بنجاح!', 'success');
                hideAuthModal();
                return;
            } catch (createErr) {
                console.error("Admin auto-create error:", createErr);
                showNotification(getAuthErrorMessage(createErr), 'error');
            }
        } else {
            showNotification(getAuthErrorMessage(error), 'error');
        }
    } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
    }
}

// 2. إنشاء حساب جديد مع التحقق
let pendingRegistrationData = null;
async function handleEmailRegister(event) {
    if (event) event.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const btn = document.getElementById('btnRegisterSubmit');
    const origText = btn.innerHTML;

    if (!name || !email || !password) {
        showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
    }

    if (password.length < 6) {
        showNotification('كلمة المرور يجب ألا تقل عن 6 أحرف أو أرقام', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showNotification('كلمتا المرور غير متطابقتين!', 'error');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري إنشاء الحساب...';

    try {
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // تحديث اسم المستخدم
        await user.updateProfile({ displayName: name });
        
        // إرسال بريد التحقق
        try {
            await user.sendEmailVerification();
            showNotification('تم إرسال رابط تأكيد إلى بريدك الإلكتروني.', 'info');
        } catch (e) {
            console.warn("Could not send email verification:", e);
        }

        showNotification(`أهلاً بك يا ${name}! تم إنشاء حسابك الخاص بنجاح.`, 'success');
        hideAuthModal();
    } catch (error) {
        console.error("Register error:", error);
        showNotification(getAuthErrorMessage(error), 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
    }
}

// 3. الدخول بنقرة واحدة بواسطة Google
async function handleGoogleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');

    try {
        showNotification('جاري الاتصال بـ Google...', 'info');
        await firebase.auth().signInWithPopup(provider);
        showNotification('تم تسجيل الدخول بحساب Google بنجاح!', 'success');
        hideAuthModal();
    } catch (error) {
        console.error("Google sign in error:", error);
        if (error.code !== 'auth/popup-closed-by-user') {
            showNotification(getAuthErrorMessage(error), 'error');
        }
    }
}

// 4. الدخول كزائر (الوضع التجريبي - بدون تسجيل)
function handleGuestLogin(useSampleData = true) {
    isGuestMode = true;
    currentUser = null;
    hideWelcomeScreen();
    hideAuthModal();
    if (useSampleData) {
        guestData = JSON.parse(JSON.stringify(sampleDemoMockData));
        showNotification('أنت الآن في الوضع التجريبي مع بيانات استرشادية غير حقيقية.', 'info');
    } else {
        guestData = { companies: [], employees: [], operations: [] };
        showNotification('أنت الآن في وضع الاستخدام النظيف الخالي من البيانات.', 'info');
    }
    onUserAuthenticated();
    updateUserUI();
}
window.handleGuestLogin = handleGuestLogin;

// 5. استعادة كلمة المرور وإرسال الرابط للبريد
async function handlePasswordReset(event) {
    if (event) event.preventDefault();
    const email = document.getElementById('forgotEmail').value.trim();
    const btn = document.getElementById('btnForgotSubmit');
    const origText = btn.innerHTML;

    if (!email) {
        showNotification('يرجى كتابة البريد الإلكتروني لاستعادة كلمة المرور', 'error');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';

    try {
        await firebase.auth().sendPasswordResetEmail(email);
        showNotification('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك بنجاح! يرجى فحص صندوق الوارد.', 'success');
        switchAuthTab('login');
    } catch (error) {
        console.error("Password reset error:", error);
        showNotification(getAuthErrorMessage(error), 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
    }
}

// 6. تغيير كلمة المرور من داخل الإعدادات / الملف الشخصي
async function handleChangePassword(event) {
    if (event) event.preventDefault();
    const user = firebase.auth().currentUser;
    if (!user) {
        showNotification('يجب تسجيل الدخول أولاً لتغيير كلمة المرور', 'error');
        return;
    }

    const currentPass = document.getElementById('currentPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confirmPass = document.getElementById('confirmNewPassword').value;
    const btn = document.getElementById('btnChangePassSubmit');

    if (!newPass || newPass.length < 6) {
        showNotification('كلمة المرور الجديدة يجب أن تكون 6 خانات على الأقل', 'error');
        return;
    }

    if (newPass !== confirmPass) {
        showNotification('كلمتا المرور غير متطابقتين!', 'error');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحديث...';

    try {
        // إعادة المصادقة للتأكيد
        if (currentPass && user.email) {
            const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPass);
            await user.reauthenticateWithCredential(credential);
        }
        await user.updatePassword(newPass);
        showNotification('تم تغيير كلمة المرور بنجاح!', 'success');
        closeChangePasswordModal();
    } catch (error) {
        console.error("Change password error:", error);
        showNotification(getAuthErrorMessage(error), 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-key"></i> حفظ كلمة المرور الجديدة';
    }
}

// 7. إرسال بريد استعادة الحساب من لوحة الملف الشخصي
async function sendRecoveryEmailToCurrent() {
    const user = firebase.auth().currentUser;
    if (!user || !user.email) {
        showNotification('لا يوجد بريد مسجل للمستخدم الحالي', 'error');
        return;
    }
    try {
        await firebase.auth().sendPasswordResetEmail(user.email);
        showNotification(`تم إرسال رابط استعادة وضبط كلمة المرور إلى ${user.email}`, 'success');
    } catch (error) {
        showNotification(getAuthErrorMessage(error), 'error');
    }
}

// 8. تسجيل الخروج
async function handleLogout() {
    try {
        localStorage.removeItem('insurance_user_cached');
        document.documentElement.classList.remove('has-cached-auth');
    } catch(e) {}

    if (isGuestMode) {
        isGuestMode = false;
        currentUser = null;
        showNotification('تم إنهاء الجلسة التجريبية', 'info');
        showAuthModal();
        updateUserUI();
        return;
    }

    try {
        await firebase.auth().signOut();
        currentUser = null;
        isGuestMode = false;
        showNotification('تم تسجيل الخروج بنجاح', 'success');
        showAuthModal();
        updateUserUI();
    } catch (error) {
        console.error("Logout error:", error);
        showNotification('حدث خطأ أثناء تسجيل الخروج', 'error');
    }
}

// ==========================================
// ترحيل البيانات القديمة وربطها بحساب المدير
// ==========================================
async function checkAndMigrateLegacyData(adminUid) {
    if (typeof db === 'undefined') return;
    try {
        const collections = ['companies', 'employees', 'operations'];
        for (const colName of collections) {
            const snap = await db.collection(colName).get();
            let batch = db.batch();
            let count = 0;
            snap.forEach(doc => {
                const data = doc.data();
                if (!data.userId) {
                    batch.update(doc.ref, { userId: adminUid });
                    count++;
                }
            });
            if (count > 0) {
                await batch.commit();
                console.log(`Migrated ${count} records in ${colName} to admin: ${adminUid}`);
            }
        }
    } catch (err) {
        console.warn("Legacy migration notice:", err);
    }
}

// ==========================================
// عزل البيانات: استرجاع المعرف الحالي
// ==========================================
function getCurrentUserId() {
    if (isGuestMode) return 'guest_session';
    if (currentUser) return currentUser.uid;
    return null;
}

function isCurrentUserAdmin() {
    if (isGuestMode) return false;
    if (currentUser && currentUser.email && currentUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        return true;
    }
    return false;
}

// تشغيل إعادة تحميل البيانات بعد تغير المستخدم
function onUserAuthenticated() {
    if (typeof loadCompaniesGrid === 'function') loadCompaniesGrid();
    if (typeof loadEmployeesGrid === 'function') loadEmployeesGrid();
    if (typeof loadOperations === 'function') loadOperations();
    if (typeof loadSearchData === 'function') loadSearchData();
    if (typeof loadSavedCoordinatesFromFirestore === 'function') loadSavedCoordinatesFromFirestore();
    if (typeof updateDashboardAnalytics === 'function') updateDashboardAnalytics();
    if (typeof populateDashboardCompanyFilter === 'function') populateDashboardCompanyFilter();
}

// ==========================================
// التحكم بواجهة المستخدم (UI Controllers)
// ==========================================

function showAuthModal() {
    const modal = document.getElementById('authOverlay');
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
    }
}

function hideAuthModal() {
    const modal = document.getElementById('authOverlay');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

function switchAuthTab(tab) {
    const tabs = ['login', 'register', 'forgot', 'guest'];
    tabs.forEach(t => {
        const pane = document.getElementById(`authTabPane_${t}`);
        const btn = document.getElementById(`authTabBtn_${t}`);
        if (pane) pane.style.display = (t === tab) ? 'block' : 'none';
        if (btn) {
            if (t === tab) {
                btn.classList.add('active-auth-tab');
            } else {
                btn.classList.remove('active-auth-tab');
            }
        }
    });
}

function updateUserUI() {
    const user = currentUser || (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser);
    const isGuest = !user && isGuestMode;

    const guestBanner = document.getElementById('guestModeBanner');
    const userProfileBtn = document.getElementById('userProfileNavBtn');
    const profileName = document.getElementById('sidebarUserName');
    const profileRole = document.getElementById('sidebarUserRole');
    const profileAvatar = document.getElementById('sidebarUserAvatar');

    // شريط التنبيه لوضع الضيف
    if (guestBanner) {
        guestBanner.style.display = (isGuest && !user) ? 'flex' : 'none';
    }

    if (userProfileBtn) {
        userProfileBtn.style.display = 'flex';
    }

    if (user) {
        const isAdmin = isCurrentUserAdmin();
        const rawName = (user.displayName || (user.email ? user.email.split('@')[0] : 'مستخدم')).trim();
        const firstName = (isAdmin && (!user.displayName || user.displayName === 'مستخدم')) ? 'Admin' : (rawName.split(' ')[0] || rawName);
        
        if (profileName) profileName.innerText = firstName;
        if (profileRole) {
            if (isAdmin) {
                profileRole.innerHTML = '<span class="badge-role badge-admin"><i class="fas fa-shield-alt"></i> مدير النظام</span>';
            } else if (user.emailVerified) {
                profileRole.innerHTML = '<span class="badge-role badge-verified" title="البريد الإلكتروني موثق"><i class="fas fa-check-circle"></i> حساب موثق</span>';
            } else {
                profileRole.innerHTML = '<span class="badge-role badge-unverified" title="بانتظار توثيق البريد الإلكتروني"><i class="fas fa-exclamation-circle"></i> غير موثق</span>';
            }
        }
        if (profileAvatar) {
            if (user.photoURL) {
                profileAvatar.innerHTML = `<img src="${user.photoURL}" alt="${firstName}" class="user-avatar-img">`;
            } else {
                profileAvatar.innerHTML = `<div class="user-avatar-initials">${firstName.charAt(0).toUpperCase()}</div>`;
            }
        }
    } else {
        if (profileName) profileName.innerText = isGuest ? 'زائر' : 'تسجيل الدخول';
        if (profileRole) profileRole.innerHTML = isGuest ? '<span class="badge-role badge-guest">زائر</span>' : '<span class="badge-role">غير مسجل</span>';
        if (profileAvatar) profileAvatar.innerHTML = isGuest ? '<i class="fas fa-user-clock"></i>' : '<i class="fas fa-sign-in-alt"></i>';
    }
}

// نافذة الملف الشخصي المنبثقة
function toggleProfileDropdown() {
    const modal = document.getElementById('profileModal');
    if (!modal) return;
    
    if (modal.style.display === 'flex' || modal.classList.contains('active')) {
        closeProfileModal();
    } else {
        updateProfileModalDetails();
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
}

function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
}

function updateProfileModalDetails() {
    const user = currentUser;
    const isGuest = isGuestMode || !user;
    
    const pName = document.getElementById('profModalName');
    const pEmail = document.getElementById('profModalEmail');
    const pRole = document.getElementById('profModalRole');
    const pAvatar = document.getElementById('profModalAvatar');
    const pVerifyBox = document.getElementById('profModalVerifyBox');
    const userActions = document.getElementById('userActionList');
    const guestActions = document.getElementById('guestActionList');

    if (isGuest) {
        if (pName) pName.innerText = 'زائر (وضع تجريبي)';
        if (pEmail) pEmail.innerText = 'جلسة مؤقتة في الذاكرة (لا يتم الحفظ)';
        if (pRole) pRole.innerHTML = '<span class="badge-role badge-guest"><i class="fas fa-user-clock"></i> الوضع التجريبي</span>';
        if (pAvatar) pAvatar.innerHTML = '<div class="modal-avatar-letter" style="background: linear-gradient(135deg, #64748b, #475569);"><i class="fas fa-user"></i></div>';
        if (pVerifyBox) {
            pVerifyBox.classList.add('d-none');
            pVerifyBox.style.display = 'none';
        }
        if (userActions) {
            userActions.classList.add('d-none');
            userActions.style.display = 'none';
        }
        if (guestActions) {
            guestActions.classList.remove('d-none');
            guestActions.style.display = 'flex';
        }
    } else if (user) {
        const rawName = (user.displayName || user.email.split('@')[0] || 'مستخدم').trim();
        if (pName) pName.innerText = rawName;
        if (pEmail) pEmail.innerText = user.email || '-';
        
        if (isCurrentUserAdmin()) {
            if (pRole) pRole.innerHTML = '<span class="badge-role badge-admin"><i class="fas fa-shield-alt"></i> مدير النظام (Admin)</span>';
            if (pVerifyBox) {
                pVerifyBox.classList.add('d-none');
                pVerifyBox.style.display = 'none';
            }
        } else if (user.emailVerified) {
            if (pRole) pRole.innerHTML = '<span class="badge-role badge-verified"><i class="fas fa-check-circle"></i> حساب موثق</span>';
            if (pVerifyBox) {
                pVerifyBox.classList.add('d-none');
                pVerifyBox.style.display = 'none';
            }
        } else {
            if (pRole) pRole.innerHTML = '<span class="badge-role badge-unverified"><i class="fas fa-exclamation-circle"></i> غير موثق</span>';
            if (pVerifyBox) {
                pVerifyBox.classList.remove('d-none');
                pVerifyBox.style.display = 'block';
            }
        }

        if (pAvatar) {
            if (user.photoURL) {
                pAvatar.innerHTML = `<img src="${user.photoURL}" alt="${rawName}" class="modal-avatar-img">`;
            } else {
                pAvatar.innerHTML = `<div class="modal-avatar-letter">${rawName.charAt(0).toUpperCase()}</div>`;
            }
        }

        if (guestActions) {
            guestActions.classList.add('d-none');
            guestActions.style.display = 'none';
        }
        if (userActions) {
            userActions.classList.remove('d-none');
            userActions.style.display = 'flex';
        }
    }
}

// إرسال رابط توثيق البريد الإلكتروني
async function sendEmailVerificationToUser() {
    if (isGuestMode) {
        showNotification('أنت في الوضع التجريبي، يرجى تسجيل حساب موثوق أولاً.', 'warning');
        return;
    }
    const user = firebase.auth().currentUser;
    if (!user || !user.email) return;
    
    if (user.emailVerified) {
        showNotification('حسابك موثق بالفعل!', 'info');
        return;
    }

    const btn = document.getElementById('btnSendVerifyLink');
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>جاري الإرسال...</span>';
    }

    try {
        await user.sendEmailVerification();
        showNotification(`تم إرسال رابط التوثيق إلى ${user.email} بنجاح! يرجى مراجعة بريدك والضغط على الرابط ثم النقر على "فحص الآن".`, 'success');
    } catch (err) {
        console.error("Email verification send error:", err);
        showNotification(getAuthErrorMessage(err), 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origHtml;
        }
    }
}

// فحص وتحديث حالة توثيق الحساب
async function checkEmailVerificationStatus() {
    if (isGuestMode) {
        showNotification('أنت في الوضع التجريبي.', 'info');
        return;
    }
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    const icon = document.getElementById('iconCheckVerify');
    if (icon) icon.classList.add('fa-spin');
    
    try {
        await user.reload();
        const updatedUser = firebase.auth().currentUser;
        currentUser = updatedUser;
        updateUserUI();
        updateProfileModalDetails();

        if (updatedUser.emailVerified) {
            showNotification('تهانينا! تم تأكيد توثيق حسابك بنجاح وأصبح الآن حساباً موثقاً 🛡️✨', 'success');
        } else {
            showNotification('لم يتم التوثيق بعد! تأكد من فتح الرابط المرسل إلى بريدك الإلكتروني ثم المحاولة مرة أخرى.', 'warning');
        }
    } catch (err) {
        console.error("Check verification status error:", err);
        showNotification(getAuthErrorMessage(err), 'error');
    } finally {
        if (icon) {
            setTimeout(() => icon.classList.remove('fa-spin'), 600);
        }
    }
}

// إرسال بريد استعادة كلمة المرور للحساب الحالي
async function sendRecoveryEmailToCurrent() {
    if (isGuestMode) {
        showNotification('أنت في الوضع التجريبي، لا يوجد حساب مسجل لاستعادة كلمة مروره.', 'warning');
        return;
    }
    const user = firebase.auth().currentUser;
    if (!user || !user.email) {
        showNotification('لم يتم العثور على بريد إلكتروني مسجل.', 'error');
        return;
    }

    try {
        await firebase.auth().sendPasswordResetEmail(user.email);
        showNotification(`تم إرسال رابط استعادة وتعيين كلمة المرور إلى ${user.email} بنجاح!`, 'success');
    } catch (err) {
        console.error("Password reset email error:", err);
        showNotification(getAuthErrorMessage(err), 'error');
    }
}

function openChangePasswordModal() {
    closeProfileModal();
    const modal = document.getElementById('changePasswordModal');
    if (modal) {
        document.getElementById('changePasswordForm').reset();
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
}

function closeChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
}

function openDeleteAccountModal() {
    closeProfileModal();
    if (isGuestMode) {
        showNotification('أنت في الوضع التجريبي، لا يوجد حساب لحذفه.', 'warning');
        return;
    }
    const user = firebase.auth().currentUser;
    if (!user) {
        showNotification('لم يتم العثور على مستخدم مسجل.', 'error');
        return;
    }
    if (user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        showNotification('لا يمكن حذف حساب المدير الرئيسي للنظام!', 'error');
        return;
    }

    const modal = document.getElementById('deleteAccountModal');
    if (modal) {
        document.getElementById('deleteAccountForm').reset();
        const isGoogle = user.providerData && user.providerData.some(p => p.providerId === 'google.com');
        const passWrap = document.getElementById('deleteAccountPassWrap');
        if (passWrap) {
            passWrap.style.display = isGoogle ? 'none' : 'block';
        }
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
}

function closeDeleteAccountModal() {
    const modal = document.getElementById('deleteAccountModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
}

async function handleDeleteAccount(e) {
    if (e) e.preventDefault();
    if (isGuestMode) return;

    const user = firebase.auth().currentUser;
    if (!user) return;

    if (user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        showNotification('لا يمكن حذف حساب المدير الرئيسي للنظام!', 'error');
        return;
    }

    const btnSubmit = document.getElementById('btnDeleteAccountSubmit');
    const origText = btnSubmit.innerHTML;
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري حذف الحساب وبياناته...';

    try {
        const passInput = document.getElementById('deleteAccountPassword');
        const isGoogle = user.providerData && user.providerData.some(p => p.providerId === 'google.com');

        // إذا كان بريد وكلمة مرور وتم إدخال كلمة المرور، إعادة المصادقة للتأكيد
        if (!isGoogle && passInput && passInput.value && user.email) {
            try {
                const cred = firebase.auth.EmailAuthProvider.credential(user.email, passInput.value);
                await user.reauthenticateWithCredential(cred);
            } catch (reauthErr) {
                showNotification('كلمة المرور غير صحيحة، تعذر تأكيد الهوية!', 'error');
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = origText;
                return;
            }
        }

        const uid = user.uid;

        // 1. حذف جميع بيانات المستخدم من Firestore
        if (typeof db !== 'undefined') {
            const collections = ['companies', 'employees', 'operations'];
            for (const colName of collections) {
                const snap = await db.collection(colName).where('userId', '==', uid).get();
                if (!snap.empty) {
                    let batch = db.batch();
                    let count = 0;
                    snap.forEach(doc => {
                        batch.delete(doc.ref);
                        count++;
                        if (count === 450) {
                            batch.commit();
                            batch = db.batch();
                            count = 0;
                        }
                    });
                    if (count > 0) {
                        await batch.commit();
                    }
                }
            }
        }

        // 2. حذف حساب المستخدم من Firebase Auth
        await user.delete();

        // 3. إنهاء الجلسة وتحديث الواجهة
        currentUser = null;
        isGuestMode = false;
        closeDeleteAccountModal();
        showNotification('تم حذف الحساب وجميع البيانات التابعة له نهائياً بنجاح!', 'success');
        
        // إعادة تهيئة الواجهة
        if (typeof loadCompaniesGrid === 'function') loadCompaniesGrid();
        if (typeof loadEmployeesGrid === 'function') loadEmployeesGrid();
        if (typeof loadOperations === 'function') loadOperations();
        
        showAuthModal();
        updateUserUI();
    } catch (error) {
        console.error("Delete account error:", error);
        if (error.code === 'auth/requires-recent-login') {
            showNotification('يرجى تسجيل الدخول مجدداً ثم محاولة حذف الحساب لتأكيد الهوية لأسباب أمنية.', 'error');
        } else {
            showNotification(getAuthErrorMessage(error), 'error');
        }
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = origText;
    }
}

// تعبئة بيانات الأدمن الافتراضية بنقرة زر للتسهيل
function fillAdminCredentials() {
    document.getElementById('authEmail').value = ADMIN_EMAIL;
    document.getElementById('authPassword').value = "Admin@panel.1";
    showNotification('تمت تعبئة بيانات المدير الافتراضية!', 'info');
}

// ترجمة أخطاء Firebase والمصادقة للغة العربية الواضحة
function getAuthErrorMessage(error) {
    if (!error) return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';

    const errStr = (typeof error === 'string' ? error : (error.code || '') + ' ' + (error.message || '') + ' ' + JSON.stringify(error)).toUpperCase();

    if (errStr.includes('INVALID_LOGIN_CREDENTIALS') ||
        errStr.includes('INVALID_PASSWORD') ||
        errStr.includes('WRONG-PASSWORD') ||
        errStr.includes('INVALID-CREDENTIAL') ||
        errStr.includes('USER-NOT-FOUND') ||
        errStr.includes('EMAIL_NOT_FOUND')) {
        return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
    }

    if (errStr.includes('EMAIL-ALREADY-IN-USE') || errStr.includes('EMAIL_EXISTS')) {
        return 'هذا البريد الإلكتروني مسجل مسبقاً بحساب آخر.';
    }

    if (errStr.includes('INVALID-EMAIL') || errStr.includes('INVALID_EMAIL')) {
        return 'صيغة البريد الإلكتروني غير صحيحة.';
    }

    if (errStr.includes('WEAK-PASSWORD') || errStr.includes('WEAK_PASSWORD')) {
        return 'كلمة المرور ضعيفة جداً، يرجى كتابة 6 خانات على الأقل.';
    }

    if (errStr.includes('TOO-MANY-REQUESTS') || errStr.includes('TOO_MANY_ATTEMPTS')) {
        return 'تم إيقاف المحاولات مؤقتاً لتكرار المحاولة الخاطئة. يرجى الانتظار قليلاً.';
    }

    if (errStr.includes('POPUP-CLOSED-BY-USER')) {
        return 'تم إلغاء نافذة تسجيل الدخول من قبل المستخدم.';
    }

    if (errStr.includes('NETWORK-REQUEST-FAILED') || errStr.includes('NETWORK')) {
        return 'تعذر الاتصال بالخادم، يرجى التحقق من اتصال الإنترنت.';
    }

    if (errStr.includes('REQUIRES-RECENT-LOGIN') || errStr.includes('CREDENTIAL_TOO_OLD')) {
        return 'يرجى تسجيل الدخول مجدداً لتأكيد هويتك قبل تغيير كلمة المرور.';
    }

    if (error.code) {
        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
            case 'auth/invalid-login-credentials':
                return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
            case 'auth/email-already-in-use':
                return 'هذا البريد الإلكتروني مسجل مسبقاً بحساب آخر.';
            case 'auth/invalid-email':
                return 'صيغة البريد الإلكتروني غير صحيحة.';
            case 'auth/weak-password':
                return 'كلمة المرور ضعيفة جداً، يرجى كتابة 6 خانات على الأقل.';
            case 'auth/too-many-requests':
                return 'تم إيقاف المحاولات مؤقتاً لكثرة الطلبات. يرجى المحاولة بعد قليل.';
            case 'auth/popup-closed-by-user':
                return 'تم إلغاء نافذة تسجيل الدخول من قبل المستخدم.';
            case 'auth/network-request-failed':
                return 'تعذر الاتصال بالخادم، يرجى التحقق من اتصال الإنترنت.';
            case 'auth/requires-recent-login':
                return 'يرجى تسجيل الدخول مجدداً لتأكيد هويتك قبل تغيير كلمة المرور.';
        }
    }

    // إذا كانت الرسالة نصية واضحة وليست كود أو JSON
    if (error.message && typeof error.message === 'string' && !error.message.startsWith('{') && !error.message.includes('{"error"')) {
        return error.message;
    }

    return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
}

// تهيئة المصادقة فور تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    initAuth();
});
