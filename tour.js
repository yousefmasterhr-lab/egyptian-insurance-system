// ==========================================================================
// الجولة الإرشادية التفاعلية لنظام التأمينات (Guided Tour - Onboarding)
// ==========================================================================

class GuidedTour {
    constructor(steps) {
        this.steps = steps;
        this.currentStepIndex = 0;
        this.isActive = false;
        
        this.overlay = document.createElement('div');
        this.overlay.className = 'tour-overlay';
        this.overlay.innerHTML = `
            <div id="tour-highlight" class="tour-highlight"></div>
            <div class="tour-tooltip">
                <div class="tour-arrow"></div>
                <button id="tour-close" class="tour-close-btn" title="إغلاق الجولة"><i class="fas fa-times"></i></button>
                <div class="tour-header">
                    <div class="tour-icon"><i class="fas fa-lightbulb"></i></div>
                    <h3 id="tour-title"></h3>
                </div>
                <p id="tour-desc"></p>
                <div class="tour-controls">
                    <span id="tour-progress"></span>
                    <div class="tour-buttons">
                        <button id="tour-prev" class="neu-btn tour-btn-sm">السابق</button>
                        <button id="tour-next" class="neu-btn neu-btn-primary tour-btn-sm">التالي</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.overlay);
        
        document.getElementById('tour-prev').onclick = () => this.prev();
        document.getElementById('tour-next').onclick = () => this.next();
        document.getElementById('tour-close').onclick = () => this.stop();
        
        window.addEventListener('keydown', (e) => {
            if (!this.isActive) return;
            if (e.key === 'Escape') this.stop();
            if (e.key === 'ArrowLeft') this.next();
            if (e.key === 'ArrowRight') this.prev();
        });
    }

    start() {
        this.currentStepIndex = 0;
        this.isActive = true;
        this.overlay.style.display = 'block';
        this.showStep();
    }

    stop() {
        this.isActive = false;
        this.overlay.style.display = 'none';
        try {
            localStorage.setItem('insurance_app_tour_completed', 'true');
        } catch(e) {}
        
        if(this.steps[this.currentStepIndex]?.onExit) {
            this.steps[this.currentStepIndex].onExit();
        }
    }

    next() {
        if (this.currentStepIndex < this.steps.length - 1) {
            if(this.steps[this.currentStepIndex].onExit) this.steps[this.currentStepIndex].onExit();
            this.currentStepIndex++;
            this.showStep();
        } else {
            this.stop();
            if (typeof showNotification === 'function') {
                showNotification('تم الانتهاء من الجولة! أنت الآن مستعد لإدارة النظام باحترافية.', 'success');
            }
        }
    }

    prev() {
        if (this.currentStepIndex > 0) {
            if(this.steps[this.currentStepIndex].onExit) this.steps[this.currentStepIndex].onExit();
            this.currentStepIndex--;
            this.showStep();
        }
    }

    showStep() {
        const step = this.steps[this.currentStepIndex];
        
        if (step.onEnter) {
            step.onEnter();
        }

        setTimeout(() => {
            const tooltip = this.overlay.querySelector('.tour-tooltip');
            const highlight = document.getElementById('tour-highlight');
            const arrow = tooltip.querySelector('.tour-arrow');
            
            tooltip.classList.remove('show');

            // 1. تعبئة المحتوى أولاً لقياس الأبعاد الحقيقية بدقة
            document.getElementById('tour-title').textContent = step.title;
            document.getElementById('tour-desc').innerHTML = step.content;
            document.getElementById('tour-progress').textContent = `${this.currentStepIndex + 1} / ${this.steps.length}`;
            
            const nextBtn = document.getElementById('tour-next');
            if (this.currentStepIndex === this.steps.length - 1) {
                nextBtn.innerHTML = 'إنهاء <i class="fas fa-check"></i>';
                nextBtn.classList.add('neu-btn-warning');
            } else {
                nextBtn.textContent = 'التالي';
                nextBtn.classList.remove('neu-btn-warning');
            }
            
            document.getElementById('tour-prev').style.display = this.currentStepIndex === 0 ? 'none' : 'block';

            setTimeout(() => {
                let target;
                if (typeof step.target === 'string') {
                    target = document.querySelector(step.target);
                } else if (typeof step.target === 'function') {
                    const result = step.target();
                    target = typeof result === 'string' ? document.querySelector(result) : result;
                }

                if (target && target.offsetParent !== null && window.getComputedStyle(target).display !== 'none') {
                    target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

                    setTimeout(() => {
                        const rect = target.getBoundingClientRect();
                        
                        // إظهار إطار التحديد
                        highlight.style.display = 'block';
                        highlight.style.top = Math.max(0, rect.top - 6) + 'px';
                        highlight.style.left = Math.max(0, rect.left - 6) + 'px';
                        highlight.style.width = (rect.width + 12) + 'px';
                        highlight.style.height = (rect.height + 12) + 'px';

                        // قياس الأبعاد الحقيقية للنافذة
                        const tooltipW = tooltip.offsetWidth || 380;
                        const tooltipH = tooltip.offsetHeight || 280;
                        let placement = step.placement || 'bottom';

                        // التبديل الذكي للموقع إذا كان سيخرج عن حدود الشاشة
                        if (placement === 'bottom' && (rect.bottom + tooltipH + 20 > window.innerHeight)) {
                            if (rect.top - tooltipH - 20 > 0) {
                                placement = 'top';
                            }
                        } else if (placement === 'top' && (rect.top - tooltipH - 20 < 0)) {
                            if (rect.bottom + tooltipH + 20 < window.innerHeight) {
                                placement = 'bottom';
                            }
                        }

                        tooltip.setAttribute('data-placement', placement);
                        
                        let topPos = 0, leftPos = 0;

                        if (placement === 'bottom') {
                            topPos = rect.bottom + 16;
                            leftPos = rect.left + (rect.width / 2) - (tooltipW / 2);
                        } else if (placement === 'top') {
                            topPos = rect.top - tooltipH - 16;
                            leftPos = rect.left + (rect.width / 2) - (tooltipW / 2);
                        } else if (placement === 'right') {
                            topPos = rect.top + (rect.height / 2) - (tooltipH / 2);
                            leftPos = rect.right + 16;
                        } else if (placement === 'left') {
                            topPos = rect.top + (rect.height / 2) - (tooltipH / 2);
                            leftPos = rect.left - tooltipW - 16;
                        } else { // center
                            topPos = (window.innerHeight - tooltipH) / 2;
                            leftPos = (window.innerWidth - tooltipW) / 2;
                        }

                        // ضمان عدم خروج النافذة تماماً عن الشاشة من أي اتجاه
                        const margin = 16;
                        leftPos = Math.max(margin, Math.min(leftPos, window.innerWidth - tooltipW - margin));
                        topPos = Math.max(margin, Math.min(topPos, window.innerHeight - tooltipH - margin));

                        tooltip.style.top = topPos + 'px';
                        tooltip.style.left = leftPos + 'px';
                        tooltip.style.transform = '';

                        // ضبط موضع السهم ليشير دائماً بدقة لمنتصف العنصر المستهدف
                        if (arrow) {
                            if (placement === 'bottom' || placement === 'top') {
                                const targetCenterX = rect.left + (rect.width / 2);
                                const relativeArrowLeft = targetCenterX - leftPos - 10;
                                arrow.style.left = Math.max(25, Math.min(relativeArrowLeft, tooltipW - 35)) + 'px';
                                arrow.style.top = '';
                                arrow.style.right = '';
                                arrow.style.bottom = '';
                            }
                        }

                        tooltip.classList.add('show');
                    }, 180);
                } else {
                    highlight.style.display = 'none';
                    tooltip.setAttribute('data-placement', 'center');
                    tooltip.style.top = '50%';
                    tooltip.style.left = '50%';
                    tooltip.style.transform = 'translate(-50%, -50%)';
                    tooltip.classList.add('show');
                }
            }, 50);
        }, 120);
    }
}

// خطوات الجولة التفاعلية الشاملة والمحدثة
const appTourSteps = [
    {
        title: 'مرحباً بك في نظام التأمينات الذكي 🚀',
        content: 'تهانينا! أنت الآن تستخدم أحدث منظومة رقمية لإدارة التأمينات الاجتماعية. ستأخذك هذه الجولة في رحلة سريعة لاكتشاف ميزات النظام الجديدة وكيفية إدارة أعمالك باحترافية.',
        placement: 'center',
        target: 'body'
    },
    {
        title: 'لوحة التحليلات والمؤشرات الذكية 📊',
        content: 'تحليل فوري وشامل لبيانات القوى العاملة، متوسط وكتلة الأجور التأمينية، معدل دوران العمالة والنمو، ومؤشر جودة واكتمال السجلات.',
        target: '#dashboard-view .dash-kpi-grid-luxury',
        placement: 'bottom',
        onEnter: () => { if (typeof switchView === 'function') switchView('dashboard-view'); }
    },
    {
        title: 'إدارة الشركات والمنشآت 🏢',
        content: 'إضافة ومتابعة الشركات، رفع سجلات وسندات التفويض، استيراد وتصدير بيانات المنشآت إلى Excel، وعرض كروت تفاصيل مسؤولي التأمينات والمكاتب.',
        target: '#companies-view .view-header-bar',
        placement: 'bottom',
        onEnter: () => { if (typeof switchView === 'function') switchView('companies-view'); }
    },
    {
        title: 'قاعدة بيانات الموظفين والخط الزمني 👥',
        content: 'إدارة متكاملة للعاملين: الفرز التلقائي للحالة التأمينية (مؤمن، غير مؤمن، استقالة، رفض)، التحقق الذكي من صحة الرقم القومي والتأميني، والأرشيف.',
        target: '#employees-view .view-header-bar',
        placement: 'bottom',
        onEnter: () => { if (typeof switchView === 'function') switchView('employees-view'); }
    },
    {
        title: 'مركز العمليات ومتابعة الطلبات 📋',
        content: 'متابعة حركة المعاملات مع مكاتب التأمينات: تصفية فورية حسب الحالة (مكتمل، مرفوض مع ذكر السبب، قيد المراجعة، انتظار)، مع تتبع أرقام وتواريخ الوارد.',
        target: '#operations-view .view-header-bar',
        placement: 'bottom',
        onEnter: () => { if (typeof switchView === 'function') switchView('operations-view'); }
    },
    {
        title: 'مركز النماذج والاستمارات الرسمية (س١ وس٦) 📄',
        content: 'طباعة فورية وتصدير لاستمارات س١ (تعيين) وس٦ (استقالة) بوجهيها الأمامي والخلفي، مع مطابقة هندسية كاملة بنسبة 100% لشبكة المربعات الحكومية.',
        target: '.form-hub-tabs',
        placement: 'bottom',
        onEnter: () => { if (typeof switchView === 'function') switchView('form-hub-view'); }
    },
    {
        title: 'الشريط العائم الذكي ⚡',
        content: 'البحث الفوري عن الشركات والموظفين بالاسم أو الكود لتعبئة الاستمارة تلقائياً، مسح الحقول، الطباعة الفورية، وفتح نموذج التعديل الحي.',
        target: '#floating-action-bar',
        placement: 'top',
        onEnter: () => { if (typeof switchView === 'function') switchView('form-hub-view'); }
    },
    {
        title: 'نموذج إدخال وتعديل البيانات الحي 📝',
        content: 'يمكنك إدخال وتعديل أي حقل يدوياً من هذه اللوحة وتحديث الاستمارة الورقية لحظياً، مع إمكانية التعبئة التجريبية السريعة والطباعة المباشرة.',
        target: '#btn-toggle-live-editor',
        placement: 'top',
        onEnter: () => { 
            if (typeof switchView === 'function') switchView('form-hub-view');
            if (typeof toggleLiveEditorDrawer === 'function') toggleLiveEditorDrawer(true);
        },
        onExit: () => {
            if (typeof toggleLiveEditorDrawer === 'function') toggleLiveEditorDrawer(false);
        }
    },
    {
        title: 'الملف الشخصي، المظهر والأمان ⚙️',
        content: 'من هنا يمكنك إدارة حسابك، تغيير كلمة المرور، تبديل المظهر بين الداكن والفاتح، وإعادة بدء الجولة الإرشادية في أي وقت.',
        target: '#userProfileNavBtn',
        placement: 'bottom'
    }
];

let globalAppTour = null;
window.startAppTour = function() {
    if (!globalAppTour) {
        globalAppTour = new GuidedTour(appTourSteps);
    }
    globalAppTour.start();
};

// بدء الجولة الإرشادية تلقائياً عند أول زيارة للموقع لشرح كيفية الاستخدام
function checkFirstTimeOnboardingTour() {
    try {
        const hasCompleted = localStorage.getItem('insurance_app_tour_completed');
        if (!hasCompleted) {
            setTimeout(() => {
                startAppTour();
            }, 850);
        }
    } catch(e) {
        console.warn("Could not check tour status:", e);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkFirstTimeOnboardingTour);
} else {
    checkFirstTimeOnboardingTour();
}

