(function() {
    'use strict';

    class SidebarManager {
        constructor() {
            this.sidebar = null;
            this.navItems = null;
            this.userAction = null;
            this.init();
        }

        init() {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setup());
            } else {
                this.setup();
            }
        }

        setup() {
            this.sidebar = document.querySelector('#sidebar');
            if (!this.sidebar) return;

            this.initializeToggle();
            this.initializeModeSwitcher();
            this.initializeNavigation();
            this.initializeUserAction();
            this.initializeResizeHandler();
            this.initializeStickyBehavior();
            this.restoreState();
            this.updateActivePage();
        }

        initializeToggle() {
            const toggle = document.querySelector('#sidebarToggle');
            if (toggle) {
                toggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleSidebar();
                });
            }
        }

        toggleSidebar() {
            if (!this.sidebar) return;
            
            this.sidebar.classList.toggle('collapsed');
            const isCollapsed = this.sidebar.classList.contains('collapsed');
            localStorage.setItem('sidebarCollapsed', isCollapsed);
            this.updateMainContentMargin(isCollapsed);
            this.updateScrollFollow(true);
            
            window.dispatchEvent(new CustomEvent('sidebarToggle', {
                detail: { collapsed: isCollapsed }
            }));
        }
        
        updateMainContentMargin(isCollapsed) {
            const frame = document.querySelector('.frame');
            if (frame) {
                frame.style.left = isCollapsed ? '118px' : '315px';
                frame.style.transition = 'left 0.3s ease';
            }
            
            // Cập nhật main-content để tự động co giãn
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.style.marginLeft = isCollapsed ? '118px' : '315px';
                mainContent.style.transition = 'margin-left 0.3s ease';
            }
        }

        initializeModeSwitcher() {
            const publicMode = document.querySelector('.text-wrapper-76');
            const managementMode = document.querySelector('.text-wrapper-77');
            const rectangle27 = document.querySelector('.rectangle-27');
            
            if (publicMode) {
                publicMode.addEventListener('click', () => this.switchMode('public', rectangle27));
            }
            if (managementMode) {
                managementMode.addEventListener('click', () => this.switchMode('management', rectangle27));
            }
        }

        switchMode(mode, rectangle27) {
            if (!rectangle27) return;
            
            localStorage.setItem('currentMode', mode);
            const publicModeText = document.querySelector('.text-wrapper-76');
            const managementModeText = document.querySelector('.text-wrapper-77');
            
            if (mode === 'public') {
                rectangle27.style.left = '0px';
                if (publicModeText) publicModeText.style.color = '#ffffff';
                if (managementModeText) managementModeText.style.color = '#131e29';
            } else {
                rectangle27.style.left = '110px';
                if (publicModeText) publicModeText.style.color = '#131e29';
                if (managementModeText) managementModeText.style.color = '#ffffff';
            }
            
            this.updateUserStatus(mode);
            window.dispatchEvent(new CustomEvent('modeChanged', { detail: { mode } }));
        }

        updateUserStatus(mode) {
            const userStatus = document.querySelector('.text-wrapper-75');
            if (userStatus) {
                userStatus.textContent = mode === 'public' 
                    ? 'Bạn đang ở trang công khai' 
                    : 'Bạn đang ở trang quản lý';
            }
        }

        initializeNavigation() {
            this.navItems = document.querySelectorAll('.nav-link');
            const rectangle28 = document.querySelector('.rectangle-28');
            
            this.navItems.forEach(item => {
                item.addEventListener('click', () => {
                    this.navItems.forEach(nav => nav.classList.remove('active'));
                    item.classList.add('active');
                    this.updateActiveMenuBackground(item.getAttribute('data-page'), rectangle28);
                    window.dispatchEvent(new CustomEvent('navItemClick', {
                        detail: { page: item.getAttribute('data-page') }
                    }));
                });
            });
        }

        updateActiveMenuBackground(page, rectangle28) {
            if (!rectangle28 || !page) return;
            
            const positions = {
                'overview': '297px',
                'station-tracking': '393px',
                'recommendations': '489px',
                'dataset': '585px',
                'model-evaluation': '681px',
                'policy-suggestions': '777px'
            };
            
            if (positions[page]) {
                rectangle28.style.top = positions[page];
            }
        }

        updateActivePage() {
            if (!this.navItems) return;
            
            const currentPage = window.location.pathname.split('/').pop() || 'index.html';
            const rectangle28 = document.querySelector('.rectangle-28');
            
            this.navItems.forEach(item => {
                const itemPage = item.getAttribute('href')?.split('/').pop();
                const page = item.getAttribute('data-page');
                
                item.classList.remove('active');
                
                if (itemPage === currentPage || (currentPage === 'index.html' && itemPage === 'overview.html')) {
                    item.classList.add('active');
                    this.updateActiveMenuBackground(page, rectangle28);
                }
            });
        }

        initializeUserAction() {
            this.userAction = document.querySelector('.logout-rounded');
            if (this.userAction) {
                this.userAction.addEventListener('click', () => this.handleUserAction());
            }
        }

        initializeResizeHandler() {
            let resizeTimeout;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    if (this.sidebar) {
                        const isCollapsed = this.sidebar.classList.contains('collapsed');
                        this.updateMainContentMargin(isCollapsed);
                    }
                    this.updateScrollFollow(true);
                }, 50);
            });
        }

        initializeStickyBehavior() {
            this.scrollFollow = {
                topSpacing: 48,
                bottomSpacing: 24,
                lastScrollY: window.scrollY,
                currentTop: 48,
                ticking: false
            };
            this.updateScrollFollow(true);
            window.addEventListener('scroll', () => this.requestScrollFollowUpdate(), { passive: true });
        }

        requestScrollFollowUpdate() {
            if (!this.sidebar || !this.scrollFollow || this.scrollFollow.ticking) return;
            this.scrollFollow.ticking = true;
            window.requestAnimationFrame(() => {
                this.updateScrollFollow(false);
                this.scrollFollow.ticking = false;
            });
        }

        updateScrollFollow(force) {
            if (!this.sidebar || !this.scrollFollow) return;

            const viewportHeight = window.innerHeight;
            const sidebarHeight = this.sidebar.offsetHeight;
            const topSpacing = this.scrollFollow.topSpacing;
            const bottomSpacing = this.scrollFollow.bottomSpacing;
            const fitsViewport = sidebarHeight + topSpacing + bottomSpacing <= viewportHeight;
            const minTop = viewportHeight - bottomSpacing - sidebarHeight;
            const maxTop = topSpacing;

            if (fitsViewport) {
                this.sidebar.style.position = 'fixed';
                this.sidebar.style.top = `${topSpacing}px`;
                this.scrollFollow.currentTop = topSpacing;
                this.scrollFollow.lastScrollY = window.scrollY;
                return;
            }

            if (force) {
                const idealTop = maxTop - window.scrollY;
                this.scrollFollow.currentTop = Math.min(maxTop, Math.max(minTop, idealTop));
                this.scrollFollow.lastScrollY = window.scrollY;
            }

            const scrollY = window.scrollY;
            const delta = scrollY - this.scrollFollow.lastScrollY;

            if (delta > 0) {
                this.scrollFollow.currentTop = Math.max(minTop, this.scrollFollow.currentTop - delta);
            } else if (delta < 0) {
                this.scrollFollow.currentTop = Math.min(maxTop, this.scrollFollow.currentTop - delta);
            }

            this.sidebar.style.position = 'fixed';
            this.sidebar.style.top = `${this.scrollFollow.currentTop}px`;
            this.scrollFollow.lastScrollY = scrollY;
        }

        handleUserAction() {
            if (this.userAction) {
                this.userAction.style.transition = 'transform 0.5s ease';
                this.userAction.style.transform = 'rotate(360deg)';
                setTimeout(() => {
                    this.userAction.style.transform = 'rotate(0deg)';
                }, 500);
            }
            
            window.dispatchEvent(new CustomEvent('userAction', {
                detail: { action: 'logout' }
            }));
        }

        restoreState() {
            const savedCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
            if (this.sidebar) {
                if (savedCollapsed) {
                    this.sidebar.classList.add('collapsed');
                } else {
                    this.sidebar.classList.remove('collapsed');
                }
                this.updateMainContentMargin(savedCollapsed);
            }
            
            const savedMode = localStorage.getItem('currentMode') || 'management';
            const rectangle27 = document.querySelector('.rectangle-27');
            const publicModeText = document.querySelector('.text-wrapper-76');
            const managementModeText = document.querySelector('.text-wrapper-77');
            
            if (rectangle27) {
                if (savedMode === 'public') {
                    rectangle27.style.left = '0px';
                    if (publicModeText) publicModeText.style.color = '#ffffff';
                    if (managementModeText) managementModeText.style.color = '#131e29';
                } else {
                    rectangle27.style.left = '110px';
                    if (publicModeText) publicModeText.style.color = '#131e29';
                    if (managementModeText) managementModeText.style.color = '#ffffff';
                }
                this.updateUserStatus(savedMode);
            }

            this.updateScrollFollow(true);
        }

        collapse() {
            if (this.sidebar && !this.sidebar.classList.contains('collapsed')) {
                this.toggleSidebar();
            }
        }

        expand() {
            if (this.sidebar && this.sidebar.classList.contains('collapsed')) {
                this.toggleSidebar();
            }
        }

        setMode(mode) {
            const rectangle27 = document.querySelector('.rectangle-27');
            if (rectangle27) {
                this.switchMode(mode, rectangle27);
            }
        }

        setActivePage(page) {
            if (this.navItems) {
                this.navItems.forEach(item => {
                    item.classList.remove('active');
                    if (item.getAttribute('data-page') === page) {
                        item.classList.add('active');
                    }
                });
            }
        }
    }

    let sidebarManager = null;

    function initSidebar() {
        if (!sidebarManager) {
            sidebarManager = new SidebarManager();
        }
        return sidebarManager;
    }

    window.SidebarManager = SidebarManager;
    window.initSidebar = initSidebar;
    window.getSidebarManager = () => sidebarManager || initSidebar();

    if (document.querySelector('#sidebar')) {
        initSidebar();
    } else if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (document.querySelector('#sidebar')) {
                initSidebar();
            }
        });
    }

})();
