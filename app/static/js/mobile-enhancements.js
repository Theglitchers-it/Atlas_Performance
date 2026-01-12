/**
 * MOBILE ENHANCEMENTS
 * Touch-friendly interactions and haptic feedback
 */

(function() {
    'use strict';

    // ===== HAPTIC FEEDBACK =====
    function hapticFeedback(intensity = 'light') {
        if ('vibrate' in navigator) {
            const patterns = {
                light: 10,
                medium: 20,
                heavy: 30,
                success: [10, 50, 10],
                error: [20, 100, 20]
            };
            navigator.vibrate(patterns[intensity] || 10);
        }
    }

    // Aggiungi haptic feedback a tutti i bottoni e link
    document.addEventListener('DOMContentLoaded', function() {
        // Buttons
        const buttons = document.querySelectorAll('button, .btn, .mobile-menu-item, .nav-item');
        buttons.forEach(btn => {
            btn.addEventListener('touchstart', function(e) {
                // Non vibrare se è un input o textarea
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                    return;
                }
                hapticFeedback('light');
            }, { passive: true });
        });

        // Links con touch feedback
        const links = document.querySelectorAll('a:not(.mobile-menu-item):not(.nav-item)');
        links.forEach(link => {
            link.addEventListener('touchstart', function() {
                hapticFeedback('light');
            }, { passive: true });
        });
    });

    // ===== PREVENT DOUBLE TAP ZOOM =====
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(e) {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, false);

    // ===== PULL TO REFRESH =====
    let ptrStartY = 0;
    let ptrCurrentY = 0;
    let ptrDistance = 0;
    const ptrThreshold = 80;
    let isPulling = false;

    function createPTRIndicator() {
        if (!document.getElementById('ptr-indicator')) {
            const indicator = document.createElement('div');
            indicator.id = 'ptr-indicator';
            indicator.className = 'ptr-indicator';
            indicator.innerHTML = '<i class="fas fa-sync-alt"></i>';
            document.body.appendChild(indicator);
        }
        return document.getElementById('ptr-indicator');
    }

    // Solo su mobile
    if (window.innerWidth <= 768) {
        document.addEventListener('touchstart', function(e) {
            // Solo se siamo in cima alla pagina
            if (window.scrollY === 0) {
                ptrStartY = e.touches[0].clientY;
                isPulling = true;
            }
        }, { passive: true });

        document.addEventListener('touchmove', function(e) {
            if (!isPulling) return;

            ptrCurrentY = e.touches[0].clientY;
            ptrDistance = ptrCurrentY - ptrStartY;

            if (ptrDistance > 0 && window.scrollY === 0) {
                const indicator = createPTRIndicator();
                const progress = Math.min(ptrDistance / ptrThreshold, 1);

                indicator.style.transform = `translateX(-50%) translateY(${ptrDistance * 0.5}px) rotate(${progress * 360}deg)`;

                if (ptrDistance > ptrThreshold) {
                    indicator.classList.add('active');
                }
            }
        }, { passive: true });

        document.addEventListener('touchend', function() {
            if (ptrDistance > ptrThreshold && window.scrollY === 0) {
                hapticFeedback('success');
                // Ricarica la pagina
                window.location.reload();
            }

            const indicator = document.getElementById('ptr-indicator');
            if (indicator) {
                indicator.style.transform = 'translateX(-50%) translateY(-100%)';
                indicator.classList.remove('active');
            }

            isPulling = false;
            ptrDistance = 0;
        });
    }

    // ===== SMART SCROLLING =====
    let lastScrollTop = 0;
    let scrollTimeout;

    window.addEventListener('scroll', function() {
        // Clear timeout
        clearTimeout(scrollTimeout);

        const st = window.pageYOffset || document.documentElement.scrollTop;

        // Nascondi navbar mobile quando scrolli giù
        if (window.innerWidth <= 768) {
            const mobileHeader = document.querySelector('.md\\:hidden.fixed.top-0');
            if (mobileHeader) {
                if (st > lastScrollTop && st > 100) {
                    // Scroll down
                    mobileHeader.style.transform = 'translateY(-100%)';
                    mobileHeader.style.transition = 'transform 0.3s ease';
                } else {
                    // Scroll up
                    mobileHeader.style.transform = 'translateY(0)';
                }
            }
        }

        lastScrollTop = st <= 0 ? 0 : st;

        // Aggiungi shadow alla navbar quando scrolli
        scrollTimeout = setTimeout(function() {
            const navbar = document.querySelector('nav, .fixed.top-0');
            if (navbar) {
                if (window.scrollY > 10) {
                    navbar.classList.add('shadow-lg');
                } else {
                    navbar.classList.remove('shadow-lg');
                }
            }
        }, 100);
    }, { passive: true });

    // ===== TOUCH RIPPLE EFFECT =====
    function createRipple(e) {
        const button = e.currentTarget;
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.touches ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
        const y = e.touches ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

        const ripple = document.createElement('span');
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x - size / 2 + 'px';
        ripple.style.top = y - size / 2 + 'px';
        ripple.classList.add('ripple');

        // Remove any existing ripples
        const existingRipple = button.querySelector('.ripple');
        if (existingRipple) {
            existingRipple.remove();
        }

        button.appendChild(ripple);

        // Remove after animation
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    // Add ripple CSS
    const style = document.createElement('style');
    style.textContent = `
        .ripple {
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.5);
            transform: scale(0);
            animation: ripple-animation 0.6s ease-out;
            pointer-events: none;
        }

        @keyframes ripple-animation {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }

        button, .btn {
            position: relative;
            overflow: hidden;
        }
    `;
    document.head.appendChild(style);

    // Add ripple to buttons
    document.addEventListener('DOMContentLoaded', function() {
        const rippleButtons = document.querySelectorAll('button, .btn');
        rippleButtons.forEach(button => {
            button.addEventListener('touchstart', createRipple, { passive: true });
        });
    });

    // ===== LAZY LOADING IMAGES =====
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    imageObserver.unobserve(img);
                }
            });
        });

        document.addEventListener('DOMContentLoaded', function() {
            const lazyImages = document.querySelectorAll('img.lazy');
            lazyImages.forEach(img => imageObserver.observe(img));
        });
    }

    // ===== SWIPE GESTURES =====
    class SwipeDetector {
        constructor(element, options = {}) {
            this.element = element;
            this.threshold = options.threshold || 50;
            this.restraint = options.restraint || 100;
            this.allowedTime = options.allowedTime || 300;

            this.startX = 0;
            this.startY = 0;
            this.startTime = 0;

            this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
            this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        }

        handleTouchStart(e) {
            const touch = e.touches[0];
            this.startX = touch.clientX;
            this.startY = touch.clientY;
            this.startTime = Date.now();
        }

        handleTouchEnd(e) {
            const touch = e.changedTouches[0];
            const distX = touch.clientX - this.startX;
            const distY = touch.clientY - this.startY;
            const elapsedTime = Date.now() - this.startTime;

            if (elapsedTime <= this.allowedTime) {
                if (Math.abs(distX) >= this.threshold && Math.abs(distY) <= this.restraint) {
                    const direction = distX < 0 ? 'left' : 'right';
                    const event = new CustomEvent('swipe', {
                        detail: { direction, distance: Math.abs(distX) }
                    });
                    this.element.dispatchEvent(event);

                    // Specific direction events
                    const dirEvent = new CustomEvent(`swipe${direction}`);
                    this.element.dispatchEvent(dirEvent);
                }
                else if (Math.abs(distY) >= this.threshold && Math.abs(distX) <= this.restraint) {
                    const direction = distY < 0 ? 'up' : 'down';
                    const event = new CustomEvent('swipe', {
                        detail: { direction, distance: Math.abs(distY) }
                    });
                    this.element.dispatchEvent(event);

                    // Specific direction events
                    const dirEvent = new CustomEvent(`swipe${direction}`);
                    this.element.dispatchEvent(dirEvent);
                }
            }
        }
    }

    // Initialize swipe on swipeable elements
    document.addEventListener('DOMContentLoaded', function() {
        const swipeableElements = document.querySelectorAll('.swipeable');
        swipeableElements.forEach(el => {
            new SwipeDetector(el);
        });
    });

    // ===== ORIENTATION CHANGE HANDLER =====
    window.addEventListener('orientationchange', function() {
        // Reload charts on orientation change
        if (typeof Chart !== 'undefined') {
            Chart.instances.forEach(chart => {
                chart.resize();
            });
        }

        // Adjust layout
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 300);
    });

    // ===== NETWORK STATUS =====
    function updateOnlineStatus() {
        const condition = navigator.onLine ? 'online' : 'offline';

        if (condition === 'offline') {
            // Show offline notification
            showToast('Connessione persa. Modalità offline attiva.', 'warning');
        } else {
            showToast('Connessione ripristinata!', 'success');
        }
    }

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // ===== TOAST NOTIFICATIONS =====
    function showToast(message, type = 'info') {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="flex items-center">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'} mr-2"></i>
                <span>${message}</span>
            </div>
        `;

        container.appendChild(toast);

        hapticFeedback('light');

        setTimeout(() => {
            toast.style.animation = 'slideDown 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Make functions available globally
    window.mobileEnhancements = {
        hapticFeedback,
        showToast,
        SwipeDetector
    };

    // ===== PERFORMANCE MONITORING =====
    if ('performance' in window && window.performance.timing) {
        window.addEventListener('load', function() {
            setTimeout(function() {
                const perfData = window.performance.timing;
                const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;

                // Log performance (remove in production)
                console.log(`Page load time: ${pageLoadTime}ms`);

                // If page is slow, show a message
                if (pageLoadTime > 3000) {
                    console.warn('Page load is slow. Consider optimizing assets.');
                }
            }, 0);
        });
    }

})();
