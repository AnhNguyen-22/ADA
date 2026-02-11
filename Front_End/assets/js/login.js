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
    
    // --- XỬ LÝ ĐĂNG NHẬP ---
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
            
            // Log thử để kiểm tra
            console.log('Login attempt:', { email, password });

            // GỌI API BACK-END
            fetch('http://127.0.0.1:5000/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: email, password: password })
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    alert('Đăng nhập thành công!');
                    
                    localStorage.setItem(STORAGE_KEYS.MODE, MODES.MANAGEMENT);
                    localStorage.removeItem(STORAGE_KEYS.PENDING_MODE);
                    
                    const target = getRedirectTarget();
                    localStorage.removeItem(STORAGE_KEYS.POST_LOGIN_REDIRECT);
                    window.location.href = target;
                } else {
                    alert(data.message || 'Sai thông tin đăng nhập. Vui lòng thử lại!');
                }
            })
            .catch(error => {
                console.error('Lỗi kết nối Server:', error);
                alert('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
            });
        }); 
    }
    
    // --- HIỆU ỨNG GIAO DIỆN (UI EFFECTS) ---

    // 1. Ẩn/hiện mật khẩu
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function() {
            // Kiểm tra trạng thái hiện tại
            const isPassword = passwordInput.getAttribute('type') === 'password';
            
            // Thay đổi type của input
            passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
            
            // Cập nhật icon tương ứng
            this.src = isPassword ? '../assets/img/login_password_unhide.png' : '../assets/img/login_password_hide.png';
        });
    }

    // 2. Hiệu ứng focus vào ô input
    const inputs = document.querySelectorAll('.form-input');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.style.borderColor = '#013a59';
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.style.borderColor = '#b0bec5';
        });
    });

    // 3. Link "Quay về trang công khai"
    const publicLink = document.querySelector('.public-page-link');
    if (publicLink) {
        publicLink.addEventListener('click', function(e) {
            e.preventDefault();
            goPublic();
        });
    }
});