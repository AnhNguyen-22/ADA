// JavaScript cho các tương tác (nếu cần)

document.addEventListener('DOMContentLoaded', function() {
    // Thêm hiệu ứng hover cho sidebar icons
    const sidebarIcons = document.querySelectorAll('.sidebar-icon');
    sidebarIcons.forEach(icon => {
        icon.addEventListener('click', function() {
            sidebarIcons.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Thêm hiệu ứng click cho các gợi ý chính sách
    const suggestionItems = document.querySelectorAll('.suggestion-item');
    suggestionItems.forEach(item => {
        item.addEventListener('click', function() {
            // Có thể thêm logic xử lý khi click vào gợi ý
            console.log('Gợi ý được chọn:', this.textContent);
        });
    });
});
