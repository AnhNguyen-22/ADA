// Form submission handler
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');

    const STORAGE_KEYS = {
        MODE: 'currentMode',
        PENDING_MODE: 'pendingMode',
        POST_LOGIN_REDIRECT: 'postLoginRedirect'
    };

    const MODES = {
        PUBLIC: 'public',
        MANAGEMENT: 'management'
    };

    const ALLOWED_REDIRECTS = new Set([
        'overview.html',
        'station-tracking.html',
        'recommendations.html',
        'dataset.html',
        'model-evaluation.html',
        'policy-suggestions.html'
    ]);

    function getRedirectTarget() {
        const params = new URLSearchParams(window.location.search);
        const fromQuery = params.get('redirect');
        const fromStorage = localStorage.getItem(STORAGE_KEYS.POST_LOGIN_REDIRECT);

        const candidate = fromQuery || fromStorage || 'overview.html';
        return ALLOWED_REDIRECTS.has(candidate) ? candidate : 'overview.html';
    }

    function goPublic() {
        localStorage.setItem(STORAGE_KEYS.MODE, MODES.PUBLIC);
        localStorage.removeItem(STORAGE_KEYS.PENDING_MODE);
        localStorage.removeItem(STORAGE_KEYS.POST_LOGIN_REDIRECT);
        window.location.href = 'overview.html';
    }
    
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            // Basic validation
            if (!email || !password) {
                alert('Vui lòng điền đầy đủ thông tin đăng nhập.');
                return;
            }
            
            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                alert('Vui lòng nhập địa chỉ email hợp lệ.');
                return;
            }
            
            // Here you would typically send the data to a server
            console.log('Login attempt:', { email, password });

            // Demo logic: đăng nhập thành công => chuyển sang chế độ quản lý
            localStorage.setItem(STORAGE_KEYS.MODE, MODES.MANAGEMENT);
            localStorage.removeItem(STORAGE_KEYS.PENDING_MODE);

            const target = getRedirectTarget();
            localStorage.removeItem(STORAGE_KEYS.POST_LOGIN_REDIRECT);
            window.location.href = target;
        });
    }
    
    // Add focus effects to inputs
    const inputs = document.querySelectorAll('.form-input');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.style.borderColor = '#013a59';
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.style.borderColor = '#b0bec5';
        });
    });

    // Link "Quay về trang công khai"
    const publicLink = document.querySelector('.public-page-link');
    if (publicLink) {
        publicLink.addEventListener('click', function(e) {
            e.preventDefault();
            goPublic();
        });
    }
});
