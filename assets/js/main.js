// Overview page interactions
document.addEventListener('DOMContentLoaded', function() {
    // Mode toggle buttons
    const modeButtons = document.querySelectorAll('.mode-btn');
    modeButtons.forEach(button => {
        button.addEventListener('click', function() {
            modeButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Update toggle background position
            const toggle = document.querySelector('.mode-toggle');
            if (this.textContent.trim() === 'Công khai') {
                toggle.style.setProperty('--active-left', '0px');
            } else {
                toggle.style.setProperty('--active-left', '110px');
            }
        });
    });

    // Navigation items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Chart control buttons
    const controlButtons = document.querySelectorAll('.control-btn');
    controlButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Toggle active state for buttons in the same group
            const buttonGroup = this.closest('.control-buttons');
            if (buttonGroup) {
                buttonGroup.querySelectorAll('.control-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
            }
            this.classList.add('active');
        });
    });

    // Sidebar toggle
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
        });
    }

    // Refresh button functionality
    const refreshButtons = document.querySelectorAll('.control-btn');
    refreshButtons.forEach(button => {
        if (button.textContent.includes('Refresh')) {
            button.addEventListener('click', function() {
                // Add loading state
                this.style.opacity = '0.6';
                this.disabled = true;
                
                // Simulate refresh
                setTimeout(() => {
                    this.style.opacity = '1';
                    this.disabled = false;
                    console.log('Data refreshed');
                }, 1000);
            });
        }
    });

    // Map marker interactions (if needed)
    const mapMarkers = document.querySelectorAll('.map-marker');
    mapMarkers.forEach(marker => {
        marker.addEventListener('click', function() {
            // Highlight clicked marker
            mapMarkers.forEach(m => m.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Initialize chart animations
    animateCharts();
});

// Animate chart bars on load
function animateCharts() {
    const rankingBars = document.querySelectorAll('.ranking-bar');
    const heights = [336, 254, 162, 117, 96, 81]; // Heights in pixels
    
    rankingBars.forEach((bar, index) => {
        bar.style.height = '0';
        setTimeout(() => {
            bar.style.height = heights[index] + 'px';
        }, index * 100);
    });
}

// Handle window resize
window.addEventListener('resize', function() {
    // Recalculate scale if needed
    const container = document.querySelector('.overview-container');
    if (container) {
        const scale = Math.min(
            window.innerWidth / 1440,
            window.innerHeight / 1024
        );
        container.style.transform = `scale(${scale})`;
    }
});