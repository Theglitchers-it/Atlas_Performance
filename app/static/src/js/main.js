/**
 * Atlas Performance - Main JavaScript Bundle
 * This file bundles all JavaScript dependencies and custom modules
 */

// Import Alpine.js
import Alpine from 'alpinejs';

// Import Chart.js
import {
  Chart,
  ArcElement,
  LineElement,
  BarElement,
  PointElement,
  BarController,
  BubbleController,
  DoughnutController,
  LineController,
  PieController,
  PolarAreaController,
  RadarController,
  ScatterController,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  RadialLinearScale,
  TimeScale,
  TimeSeriesScale,
  Decimation,
  Filler,
  Legend,
  Title,
  Tooltip,
  SubTitle
} from 'chart.js';

// Register Chart.js components
Chart.register(
  ArcElement,
  LineElement,
  BarElement,
  PointElement,
  BarController,
  BubbleController,
  DoughnutController,
  LineController,
  PieController,
  PolarAreaController,
  RadarController,
  ScatterController,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  RadialLinearScale,
  TimeScale,
  TimeSeriesScale,
  Decimation,
  Filler,
  Legend,
  Title,
  Tooltip,
  SubTitle
);

// Make Alpine and Chart globally available
window.Alpine = Alpine;
window.Chart = Chart;

// Start Alpine
Alpine.start();

// ===== MOBILE ENHANCEMENTS MODULE =====
const MobileEnhancements = (() => {
  'use strict';

  // Haptic Feedback
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

  // Toast Notifications
  function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container fixed bottom-4 right-4 z-50 space-y-2';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const bgColors = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      warning: 'bg-yellow-500',
      info: 'bg-blue-500'
    };
    const icons = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle'
    };

    toast.className = `${bgColors[type] || bgColors.info} text-white px-6 py-4 rounded-lg shadow-lg max-w-md animate-slide-in`;
    toast.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <i class="fas ${icons[type] || icons.info} mr-2"></i>
          <span>${message}</span>
        </div>
        <button class="ml-4 text-white hover:text-gray-200 close-toast">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;

    container.appendChild(toast);

    // Close button
    toast.querySelector('.close-toast').addEventListener('click', () => {
      toast.style.animation = 'slideDown 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    });

    hapticFeedback('light');

    // Auto remove after 3 seconds
    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.animation = 'slideDown 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }
    }, 3000);
  }

  // Swipe Detector Class
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
          this.dispatchSwipeEvent(direction, Math.abs(distX));
        } else if (Math.abs(distY) >= this.threshold && Math.abs(distX) <= this.restraint) {
          const direction = distY < 0 ? 'up' : 'down';
          this.dispatchSwipeEvent(direction, Math.abs(distY));
        }
      }
    }

    dispatchSwipeEvent(direction, distance) {
      const event = new CustomEvent('swipe', {
        detail: { direction, distance }
      });
      this.element.dispatchEvent(event);

      const dirEvent = new CustomEvent(`swipe${direction}`);
      this.element.dispatchEvent(dirEvent);
    }
  }

  // Initialize on DOM ready
  function init() {
    // Add haptic feedback to interactive elements
    const interactiveElements = document.querySelectorAll('button, .btn, a[href], .mobile-menu-item, .nav-item');
    interactiveElements.forEach(el => {
      el.addEventListener('touchstart', () => {
        if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') {
          hapticFeedback('light');
        }
      }, { passive: true });
    });

    // Add ripple effect
    addRippleEffect();

    // Initialize swipeable elements
    const swipeableElements = document.querySelectorAll('.swipeable');
    swipeableElements.forEach(el => new SwipeDetector(el));

    // Prevent double-tap zoom
    preventDoubleTapZoom();

    // Add pull-to-refresh on mobile
    if (window.innerWidth <= 768) {
      initPullToRefresh();
    }

    // Smart scrolling
    initSmartScrolling();

    // Lazy load images
    initLazyLoading();

    // Network status monitoring
    window.addEventListener('online', () => showToast('Connessione ripristinata!', 'success'));
    window.addEventListener('offline', () => showToast('Connessione persa. Modalità offline.', 'warning'));

    // Orientation change handler
    window.addEventListener('orientationchange', handleOrientationChange);
  }

  function addRippleEffect() {
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

    document.addEventListener('click', function(e) {
      const button = e.target.closest('button, .btn');
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = x - size / 2 + 'px';
      ripple.style.top = y - size / 2 + 'px';

      button.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  }

  function preventDoubleTapZoom() {
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    }, false);
  }

  function initPullToRefresh() {
    let ptrStartY = 0;
    let ptrDistance = 0;
    const ptrThreshold = 80;
    let isPulling = false;

    document.addEventListener('touchstart', (e) => {
      if (window.scrollY === 0) {
        ptrStartY = e.touches[0].clientY;
        isPulling = true;
      }
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (!isPulling) return;
      ptrDistance = e.touches[0].clientY - ptrStartY;
    }, { passive: true });

    document.addEventListener('touchend', () => {
      if (ptrDistance > ptrThreshold && window.scrollY === 0) {
        hapticFeedback('success');
        window.location.reload();
      }
      isPulling = false;
      ptrDistance = 0;
    });
  }

  function initSmartScrolling() {
    let lastScrollTop = 0;

    window.addEventListener('scroll', () => {
      const st = window.pageYOffset || document.documentElement.scrollTop;

      if (window.innerWidth <= 768) {
        const mobileHeader = document.querySelector('.md\\:hidden.fixed.top-0');
        if (mobileHeader) {
          if (st > lastScrollTop && st > 100) {
            mobileHeader.style.transform = 'translateY(-100%)';
            mobileHeader.style.transition = 'transform 0.3s ease';
          } else {
            mobileHeader.style.transform = 'translateY(0)';
          }
        }
      }

      lastScrollTop = st <= 0 ? 0 : st;
    }, { passive: true });
  }

  function initLazyLoading() {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.classList.remove('lazy');
              imageObserver.unobserve(img);
            }
          }
        });
      });

      document.querySelectorAll('img.lazy').forEach(img => imageObserver.observe(img));
    }
  }

  function handleOrientationChange() {
    if (typeof Chart !== 'undefined') {
      Object.values(Chart.instances).forEach(chart => {
        if (chart) chart.resize();
      });
    }

    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 300);
  }

  return {
    init,
    hapticFeedback,
    showToast,
    SwipeDetector
  };
})();

// ===== SUPER ADMIN TABLES MODULE =====
const SuperAdminTables = (() => {
  'use strict';

  const MOBILE_BREAKPOINT = 768;
  let currentView = 'desktop';

  function isMobileView() {
    return window.innerWidth < MOBILE_BREAKPOINT;
  }

  function transformTables() {
    const newView = isMobileView() ? 'mobile' : 'desktop';
    if (newView === currentView) return;

    currentView = newView;
    const tables = document.querySelectorAll('.overflow-x-auto table');

    tables.forEach(table => {
      if (currentView === 'mobile') {
        convertToCardView(table);
      } else {
        restoreTableView(table);
      }
    });
  }

  function convertToCardView(table) {
    if (table.classList.contains('mobile-cards')) return;

    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
    const rows = tbody.querySelectorAll('tr');

    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      cells.forEach((cell, index) => {
        if (headers[index]) {
          cell.setAttribute('data-label', headers[index]);
        }
      });
    });

    table.classList.add('mobile-cards');
  }

  function restoreTableView(table) {
    if (!table.classList.contains('mobile-cards')) return;

    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    tbody.querySelectorAll('td[data-label]').forEach(cell => {
      cell.removeAttribute('data-label');
    });

    table.classList.remove('mobile-cards');
  }

  function init() {
    transformTables();

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(transformTables, 250);
    });

    // Observe new tables
    const observer = new MutationObserver(() => transformTables());
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  return {
    init,
    transform: transformTables,
    isMobile: isMobileView
  };
})();

// ===== FLASH MESSAGES AUTO-HIDE =====
function initFlashMessages() {
  setTimeout(() => {
    const flashMessages = document.querySelectorAll('[class*="bg-green-500"], [class*="bg-red-500"], [class*="bg-yellow-500"], [class*="bg-blue-500"]');
    flashMessages.forEach(el => {
      el.style.transition = 'opacity 0.5s';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 500);
    });
  }, 5000);
}

// ===== INITIALIZATION =====
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    MobileEnhancements.init();
    SuperAdminTables.init();
    initFlashMessages();
  });
} else {
  MobileEnhancements.init();
  SuperAdminTables.init();
  initFlashMessages();
}

// Export to window for backwards compatibility
window.mobileEnhancements = MobileEnhancements;
window.SuperAdminTables = SuperAdminTables;

console.log('Atlas Performance - JavaScript bundle loaded');
