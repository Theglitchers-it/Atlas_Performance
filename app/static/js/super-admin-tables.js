/**
 * Super Admin Tables - Mobile Card View Transformer
 * Converte automaticamente le tabelle in card view su mobile
 */

(function() {
    'use strict';

    // Configurazione
    const MOBILE_BREAKPOINT = 768;
    let currentView = 'desktop';

    /**
     * Inizializza il transformer
     */
    function init() {
        // Esegui al caricamento pagina
        transformTables();

        // Esegui al resize della finestra (debounced)
        let resizeTimer;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(transformTables, 250);
        });

        // Osserva nuove tabelle aggiunte dinamicamente
        observeNewTables();
    }

    /**
     * Determina se siamo in vista mobile
     */
    function isMobileView() {
        return window.innerWidth < MOBILE_BREAKPOINT;
    }

    /**
     * Trasforma tutte le tabelle nella pagina
     */
    function transformTables() {
        const newView = isMobileView() ? 'mobile' : 'desktop';

        // Se la vista non è cambiata, non fare nulla
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

    /**
     * Converte una tabella in card view mobile
     */
    function convertToCardView(table) {
        // Se già convertita, skip
        if (table.classList.contains('mobile-cards')) return;

        const tbody = table.querySelector('tbody');
        if (!tbody) return;

        const rows = tbody.querySelectorAll('tr');
        const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());

        rows.forEach(row => {
            const cells = row.querySelectorAll('td');

            cells.forEach((cell, index) => {
                // Aggiungi data-label per CSS ::before
                if (headers[index]) {
                    cell.setAttribute('data-label', headers[index]);
                }
            });
        });

        table.classList.add('mobile-cards');
    }

    /**
     * Ripristina la vista tabella originale
     */
    function restoreTableView(table) {
        if (!table.classList.contains('mobile-cards')) return;

        const tbody = table.querySelector('tbody');
        if (!tbody) return;

        const cells = tbody.querySelectorAll('td[data-label]');
        cells.forEach(cell => {
            cell.removeAttribute('data-label');
        });

        table.classList.remove('mobile-cards');
    }

    /**
     * Osserva nuove tabelle aggiunte al DOM
     */
    function observeNewTables() {
        // Usa MutationObserver per rilevare nuove tabelle
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes.length) {
                    // Controlla se ci sono nuove tabelle
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) { // Element node
                            const tables = node.querySelectorAll ?
                                          node.querySelectorAll('table') :
                                          [];

                            if (tables.length > 0) {
                                transformTables();
                            }
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Helper: Crea card mobile da row
     */
    function createMobileCard(row, headers) {
        const card = document.createElement('div');
        card.className = 'mobile-table-card bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4';

        const cells = row.querySelectorAll('td');

        cells.forEach((cell, index) => {
            const field = document.createElement('div');
            field.className = 'mobile-field mb-3 last:mb-0';

            // Label
            if (headers[index]) {
                const label = document.createElement('div');
                label.className = 'mobile-field-label text-xs font-semibold text-gray-500 uppercase mb-1';
                label.textContent = headers[index];
                field.appendChild(label);
            }

            // Value
            const value = document.createElement('div');
            value.className = 'mobile-field-value text-sm text-gray-900';
            value.innerHTML = cell.innerHTML;
            field.appendChild(value);

            card.appendChild(field);
        });

        return card;
    }

    /**
     * Export funzioni pubbliche
     */
    window.SuperAdminTables = {
        init: init,
        transform: transformTables,
        isMobile: isMobileView
    };

    // Auto-inizializza quando il DOM è pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

/**
 * Miglioramenti specifici per Recent Tenants Table
 */
document.addEventListener('DOMContentLoaded', function() {

    // Aggiungi touch feedback alle righe cliccabili
    const tableRows = document.querySelectorAll('tbody tr');

    tableRows.forEach(row => {
        // Trova il link "Dettagli" nella riga
        const detailsLink = row.querySelector('a[href*="tenant_detail"]');

        if (detailsLink) {
            // Rendi tutta la riga cliccabile su mobile
            row.style.cursor = 'pointer';

            row.addEventListener('click', function(e) {
                // Se non ha cliccato direttamente sul link
                if (e.target.tagName !== 'A' && !e.target.closest('a')) {
                    // Aggiungi haptic feedback
                    if (window.mobileEnhancements) {
                        window.mobileEnhancements.hapticFeedback('light');
                    }
                    // Naviga al link
                    window.location.href = detailsLink.href;
                }
            });

            // Touch feedback visivo
            row.addEventListener('touchstart', function() {
                row.style.backgroundColor = '#f3f4f6';
            });

            row.addEventListener('touchend', function() {
                setTimeout(() => {
                    row.style.backgroundColor = '';
                }, 150);
            });
        }
    });

    // Ottimizza filtri per scroll orizzontale smooth
    const filterContainer = document.querySelector('.flex.items-center.flex-wrap.gap-4');

    if (filterContainer && window.innerWidth < 768) {
        // Aggiungi indicatore scroll
        if (filterContainer.scrollWidth > filterContainer.clientWidth) {
            const scrollIndicator = document.createElement('div');
            scrollIndicator.className = 'absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white pointer-events-none';
            scrollIndicator.style.marginBottom = '0.5rem';

            filterContainer.parentElement.style.position = 'relative';
            filterContainer.parentElement.appendChild(scrollIndicator);

            // Nascondi indicatore quando si scrolla fino in fondo
            filterContainer.addEventListener('scroll', function() {
                const isAtEnd = filterContainer.scrollLeft + filterContainer.clientWidth >= filterContainer.scrollWidth - 10;
                scrollIndicator.style.opacity = isAtEnd ? '0' : '1';
            });
        }
    }
});

/**
 * Analytics Table Optimization
 */
document.addEventListener('DOMContentLoaded', function() {
    const analyticsTable = document.querySelector('.overflow-x-auto table');

    if (analyticsTable && window.innerWidth < 768) {
        // Aggiungi classe speciale per tabella analytics
        analyticsTable.classList.add('analytics-table-mobile');

        // Nascondi colonne meno importanti su mobile molto piccoli
        if (window.innerWidth < 375) {
            const headers = analyticsTable.querySelectorAll('thead th');
            const rows = analyticsTable.querySelectorAll('tbody tr');

            // Nascondi colonna "Workout" su schermi molto piccoli
            if (headers.length >= 6) {
                headers[5].style.display = 'none';
                rows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells[5]) cells[5].style.display = 'none';
                });
            }
        }
    }
});

/**
 * Pagination Mobile Enhancement
 */
document.addEventListener('DOMContentLoaded', function() {
    const pagination = document.querySelector('.flex.items-center.justify-center.space-x-2');

    if (pagination && window.innerWidth < 768) {
        // Nascondi numeri pagina estremi su mobile, mantieni solo corrente +/- 1
        const pageLinks = pagination.querySelectorAll('a, span');
        const currentPage = pagination.querySelector('.bg-gradient-to-r');

        if (currentPage) {
            const currentPageNum = parseInt(currentPage.textContent);

            pageLinks.forEach(link => {
                const pageNum = parseInt(link.textContent);

                if (!isNaN(pageNum)) {
                    // Mostra solo pagina corrente e +/- 1
                    if (Math.abs(pageNum - currentPageNum) > 1) {
                        link.style.display = 'none';
                    }
                }
            });
        }
    }
});

/**
 * Chart Resize Handler per Analytics
 */
let resizeChartTimer;
window.addEventListener('resize', function() {
    clearTimeout(resizeChartTimer);
    resizeChartTimer = setTimeout(function() {
        // Trigger resize event per Chart.js
        if (typeof Chart !== 'undefined' && Chart.instances) {
            Object.values(Chart.instances).forEach(chart => {
                if (chart) chart.resize();
            });
        }
    }, 250);
});

/**
 * Stat Cards Number Animation Enhancement
 */
document.addEventListener('DOMContentLoaded', function() {
    const statNumbers = document.querySelectorAll('.stat-number');

    // Intersection Observer per animare solo quando visibile
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.dataset.animated) {
                animateNumber(entry.target);
                entry.target.dataset.animated = 'true';
            }
        });
    }, { threshold: 0.5 });

    statNumbers.forEach(el => observer.observe(el));

    function animateNumber(element) {
        const text = element.textContent;
        const match = text.match(/[\d,.]+/);

        if (match) {
            const targetValue = parseFloat(match[0].replace(/,/g, ''));
            const prefix = text.substring(0, match.index);
            const suffix = text.substring(match.index + match[0].length);

            let current = 0;
            const increment = targetValue / 30;
            const duration = 1000;
            const stepTime = duration / 30;

            const timer = setInterval(() => {
                current += increment;

                if (current >= targetValue) {
                    element.textContent = prefix + formatNumber(targetValue) + suffix;
                    clearInterval(timer);
                } else {
                    element.textContent = prefix + formatNumber(Math.floor(current)) + suffix;
                }
            }, stepTime);
        }
    }

    function formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
});

/**
 * Touch Ripple Effect per Cards
 */
document.addEventListener('DOMContentLoaded', function() {
    const cards = document.querySelectorAll('.tenant-card, .stat-card, .bg-gradient-to-br');

    cards.forEach(card => {
        card.addEventListener('touchstart', function(e) {
            // Crea ripple effect
            const ripple = document.createElement('span');
            ripple.className = 'touch-ripple';

            const rect = card.getBoundingClientRect();
            const x = e.touches[0].clientX - rect.left;
            const y = e.touches[0].clientY - rect.top;

            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';

            card.style.position = 'relative';
            card.style.overflow = 'hidden';
            card.appendChild(ripple);

            setTimeout(() => ripple.remove(), 600);
        });
    });

    // Aggiungi CSS per ripple effect
    const style = document.createElement('style');
    style.textContent = `
        .touch-ripple {
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.3);
            width: 100px;
            height: 100px;
            margin-left: -50px;
            margin-top: -50px;
            animation: ripple-animation 0.6s ease-out;
            pointer-events: none;
        }

        @keyframes ripple-animation {
            from {
                transform: scale(0);
                opacity: 1;
            }
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
});

console.log('🚀 Super Admin Tables - Mobile optimization loaded');
