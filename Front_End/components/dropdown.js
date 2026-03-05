/**
 * Dropdown Component - Component có thể tái sử dụng
 * 
 * Cách sử dụng:
 * 1. Include HTML, CSS và JS vào trang
 * 2. Tạo dropdown bằng cách gọi: new Dropdown(containerId, options)
 * 
 * Ví dụ:
 * const dropdown = new Dropdown('my-dropdown', {
 *     items: ['PM 2.5', 'NO2', 'CO'],
 *     defaultItem: 'PM 2.5',
 *     onSelect: (value, text) => console.log('Selected:', value, text)
 * });
 */

class Dropdown {
    constructor(containerId, options = {}) {
        this.container = typeof containerId === 'string' 
            ? document.getElementById(containerId) || document.querySelector(`[data-dropdown-id="${containerId}"]`)
            : containerId;
        
        if (!this.container) {
            console.error('Dropdown container not found:', containerId);
            return;
        }

        // Cấu hình mặc định
        this.config = {
            items: options.items || [
                { value: 'pm25', text: 'PM 2.5' },
                { value: 'no2', text: 'NO2' },
                { value: 'co3', text: 'CO3' },
                { value: 'co', text: 'CO' },
                { value: 'tsp', text: 'TSP' },
                { value: 'so2', text: 'SO2' },
                { value: 'temperature', text: 'Nhiệt độ' },
                { value: 'humidity', text: 'Độ ẩm' }
            ],
            defaultItem: options.defaultItem || null,
            onSelect: options.onSelect || null,
            placeholder: options.placeholder || 'Chọn tùy chọn'
        };

        // Chuyển đổi items nếu là mảng string đơn giản
        if (this.config.items.length > 0 && typeof this.config.items[0] === 'string') {
            this.config.items = this.config.items.map((item, index) => ({
                value: item.toLowerCase().replace(/\s+/g, '_'),
                text: item
            }));
        }

        this.button = this.container.querySelector('.dropdown-button');
        this.buttonText = this.container.querySelector('.dropdown-button-text');
        this.menu = this.container.querySelector('.dropdown-menu');
        this.isOpen = false;
        this.selectedValue = null;
        this.selectedText = null;

        this.init();
    }

    init() {
        // Render menu items
        this.renderMenu();

        // Set default selection
        if (this.config.defaultItem) {
            this.selectItem(this.config.defaultItem);
        } else if (this.config.items.length > 0) {
            this.selectItem(this.config.items[0].value);
        }

        // Event listeners
        this.button.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        // Close khi click bên ngoài
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.close();
            }
        });

        // Close khi nhấn ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }

    renderMenu() {
        // Xóa các items cũ
        this.menu.innerHTML = '';

        // Tạo các items mới
        this.config.items.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'dropdown-item';
            itemElement.setAttribute('data-value', item.value);
            itemElement.setAttribute('role', 'menuitem');
            itemElement.textContent = item.text;
            
            itemElement.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectItem(item.value);
                this.close();
            });

            this.menu.appendChild(itemElement);
        });
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        this.isOpen = true;
        this.button.setAttribute('aria-expanded', 'true');
        this.menu.classList.add('show');
    }

    close() {
        this.isOpen = false;
        this.button.setAttribute('aria-expanded', 'false');
        this.menu.classList.remove('show');
    }

    selectItem(value) {
        // Tìm item trong config
        const item = this.config.items.find(i => i.value === value);
        if (!item) {
            console.warn('Dropdown item not found:', value);
            return;
        }

        // Cập nhật selected state
        this.selectedValue = item.value;
        this.selectedText = item.text;

        // Cập nhật UI
        this.buttonText.textContent = item.text;

        // Cập nhật selected class cho các items
        this.menu.querySelectorAll('.dropdown-item').forEach(el => {
            if (el.getAttribute('data-value') === value) {
                el.classList.add('selected');
            } else {
                el.classList.remove('selected');
            }
        });

        // Gọi callback
        if (this.config.onSelect) {
            this.config.onSelect(item.value, item.text, item);
        }
    }

    getValue() {
        return this.selectedValue;
    }

    getText() {
        return this.selectedText;
    }

    setItems(items) {
        // Chuyển đổi items nếu là mảng string
        if (items.length > 0 && typeof items[0] === 'string') {
            items = items.map((item, index) => ({
                value: item.toLowerCase().replace(/\s+/g, '_'),
                text: item
            }));
        }
        
        this.config.items = items;
        this.renderMenu();
        
        // Giữ lại selection hiện tại nếu có thể
        if (this.selectedValue) {
            const stillExists = items.find(i => i.value === this.selectedValue);
            if (!stillExists && items.length > 0) {
                this.selectItem(items[0].value);
            }
        }
    }

    setDefaultItem(value) {
        this.selectItem(value);
    }

    destroy() {
        // Xóa event listeners và cleanup
        this.button.removeEventListener('click', this.toggle);
        this.close();
    }
}

// Auto-initialize dropdowns với data attributes
document.addEventListener('DOMContentLoaded', function() {
    const dropdownContainers = document.querySelectorAll('.dropdown-container[data-dropdown-id]');
    
    dropdownContainers.forEach(container => {
        const dropdownId = container.getAttribute('data-dropdown-id');
        if (dropdownId && !container.hasAttribute('data-initialized')) {
            // Có thể thêm logic auto-init ở đây nếu cần
            container.setAttribute('data-initialized', 'true');
        }
    });
});

// Export cho module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Dropdown;
}
