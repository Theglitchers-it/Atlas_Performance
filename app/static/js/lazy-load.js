/**
 * Lazy Loading Image Handler
 * Handles progressive image loading with Intersection Observer API
 */

class LazyLoadManager {
    constructor(options = {}) {
        this.options = {
            rootMargin: '50px 0px', // Start loading 50px before entering viewport
            threshold: 0.01,
            loadingClass: 'lazy-loading',
            loadedClass: 'lazy-loaded',
            errorClass: 'lazy-error',
            ...options
        };

        this.observer = null;
        this.images = [];
        this.init();
    }

    init() {
        // Check if IntersectionObserver is supported
        if (!('IntersectionObserver' in window)) {
            console.warn('IntersectionObserver not supported, loading all images immediately');
            this.loadAllImages();
            return;
        }

        // Create observer
        this.observer = new IntersectionObserver(
            this.onIntersection.bind(this),
            {
                rootMargin: this.options.rootMargin,
                threshold: this.options.threshold
            }
        );

        // Observe all lazy images
        this.observeImages();
    }

    observeImages() {
        // Find all images with data-src attribute
        const images = document.querySelectorAll('img[data-src], source[data-srcset]');

        images.forEach(img => {
            this.observer.observe(img);
            this.images.push(img);
        });
    }

    onIntersection(entries, observer) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const element = entry.target;
                this.loadImage(element);
                observer.unobserve(element);
            }
        });
    }

    loadImage(element) {
        const tagName = element.tagName.toLowerCase();

        element.classList.add(this.options.loadingClass);

        if (tagName === 'img') {
            // Handle img element
            const src = element.dataset.src;
            const srcset = element.dataset.srcset;

            if (srcset) {
                element.srcset = srcset;
            }

            if (src) {
                // Create temp image to preload
                const tempImg = new Image();

                tempImg.onload = () => {
                    element.src = src;
                    element.classList.remove(this.options.loadingClass);
                    element.classList.add(this.options.loadedClass);

                    // Remove data attributes
                    delete element.dataset.src;
                    delete element.dataset.srcset;

                    // Dispatch custom event
                    element.dispatchEvent(new CustomEvent('lazyloaded', {
                        detail: { src, element }
                    }));
                };

                tempImg.onerror = () => {
                    element.classList.remove(this.options.loadingClass);
                    element.classList.add(this.options.errorClass);
                    console.error(`Failed to load image: ${src}`);
                };

                tempImg.src = src;
            }
        } else if (tagName === 'source') {
            // Handle source element (for picture tags)
            const srcset = element.dataset.srcset;
            if (srcset) {
                element.srcset = srcset;
                delete element.dataset.srcset;
            }
        }
    }

    loadAllImages() {
        // Fallback: load all images immediately
        const images = document.querySelectorAll('img[data-src]');

        images.forEach(img => {
            if (img.dataset.src) {
                img.src = img.dataset.src;
                delete img.dataset.src;
            }
            if (img.dataset.srcset) {
                img.srcset = img.dataset.srcset;
                delete img.dataset.srcset;
            }
        });
    }

    // Add new images to observer (useful for dynamic content)
    observe(element) {
        if (this.observer && element) {
            this.observer.observe(element);
        }
    }

    // Disconnect observer
    disconnect() {
        if (this.observer) {
            this.observer.disconnect();
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.lazyLoader = new LazyLoadManager({
        rootMargin: '100px 0px',
        threshold: 0.01
    });
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LazyLoadManager;
}


/**
 * Image Preloader Utility
 * Preload critical images that should load immediately
 */
class ImagePreloader {
    static preload(urls) {
        if (!Array.isArray(urls)) {
            urls = [urls];
        }

        const promises = urls.map(url => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(url);
                img.onerror = () => reject(url);
                img.src = url;
            });
        });

        return Promise.allSettled(promises);
    }

    static preloadCritical() {
        // Preload above-the-fold images
        const criticalImages = document.querySelectorAll('img[data-critical="true"]');
        const urls = Array.from(criticalImages).map(img => img.dataset.src || img.src);

        return ImagePreloader.preload(urls);
    }
}

// Preload critical images immediately
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        ImagePreloader.preloadCritical();
    });
} else {
    ImagePreloader.preloadCritical();
}


/**
 * Responsive Image Helper
 * Automatically handles device pixel ratio
 */
class ResponsiveImageHelper {
    static getSrcsetForImage(basePath, sizes = ['small', 'medium', 'large'], ext = 'webp') {
        const widths = {
            'small': 300,
            'medium': 600,
            'large': 1200
        };

        return sizes.map(size => {
            return `${basePath}_${size}.${ext} ${widths[size]}w`;
        }).join(', ');
    }

    static getOptimalSize(containerWidth) {
        const dpr = window.devicePixelRatio || 1;
        const targetWidth = containerWidth * dpr;

        if (targetWidth <= 300) return 'small';
        if (targetWidth <= 600) return 'medium';
        return 'large';
    }
}

// Make available globally
window.ResponsiveImageHelper = ResponsiveImageHelper;
window.ImagePreloader = ImagePreloader;
