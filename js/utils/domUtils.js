/**
 * DOM UTILITIES
 * Helper functions for DOM manipulation and HTML sanitization
 */

/**
 * Create an element with optional attributes
 * @param {string} tag - Tag name
 * @param {Object} options - Attributes and content options
 * @param {string} options.class - CSS classes
 * @param {string} options.id - Element ID
 * @param {string} options.text - Text content
 * @param {string} options.html - HTML content
 * @param {Object} options.attrs - Additional attributes
 * @param {Array} options.children - Child elements
 * @returns {HTMLElement}
 */
export function createElement(tag, options = {}) {
    const element = document.createElement(tag);

    if (options.class) {
        if (Array.isArray(options.class)) {
            element.classList.add(...options.class);
        } else {
            element.classList.add(...options.class.split(' '));
        }
    }

    if (options.id) element.id = options.id;
    if (options.text) element.textContent = options.text;
    if (options.html) element.innerHTML = sanitizeHTML(options.html);

    if (options.attrs) {
        Object.entries(options.attrs).forEach(([key, value]) => {
            if (key === 'data') {
                Object.entries(value).forEach(([dataKey, dataValue]) => {
                    element.dataset[dataKey] = dataValue;
                });
            } else {
                element.setAttribute(key, value);
            }
        });
    }

    if (options.children) {
        options.children.forEach(child => {
            if (child instanceof HTMLElement) {
                element.appendChild(child);
            } else if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            }
        });
    }

    return element;
}

/**
 * Query single element
 * @param {string} selector
 * @param {HTMLElement} parent
 * @returns {HTMLElement|null}
 */
export function query(selector, parent = document) {
    return parent.querySelector(selector);
}

/**
 * Find the editor element for a given tab id without matching tab DOM nodes.
 * @param {HTMLElement} parent
 * @param {string} tabId
 * @returns {HTMLElement|null}
 */
export function findMatchingEditor(parent, tabId) {
    if (!parent || !tabId) return null;

    const editors = parent.querySelectorAll('.editor');
    for (const editor of editors) {
        if (editor.getAttribute('data-tab-id') === tabId) {
            return editor;
        }
    }

    return null;
}

/**
 * Query all elements
 * @param {string} selector
 * @param {HTMLElement} parent
 * @returns {NodeList}
 */
export function queryAll(selector, parent = document) {
    return parent.querySelectorAll(selector);
}

/**
 * Add event listener
 * @param {HTMLElement|string} target
 * @param {string} event
 * @param {Function} handler
 * @param {Object} options
 * @returns {Function} Unsubscribe function
 */
export function addListener(target, event, handler, options = {}) {
    const element = typeof target === 'string' ? query(target) : target;
    if (!element) return () => {};

    element.addEventListener(event, handler, options);

    return () => {
        element.removeEventListener(event, handler, options);
    };
}

/**
 * Add event listener with event delegation
 * @param {HTMLElement} parent
 * @param {string} event
 * @param {string} selector
 * @param {Function} handler
 * @returns {Function} Unsubscribe function
 */
export function addDelegatedListener(parent, event, selector, handler) {
    const delegatedHandler = (e) => {
        const target = e.target.closest(selector);
        if (target && parent.contains(target)) {
            handler.call(target, e);
        }
    };

    parent.addEventListener(event, delegatedHandler);

    return () => {
        parent.removeEventListener(event, delegatedHandler);
    };
}

/**
 * Set multiple attributes
 * @param {HTMLElement} element
 * @param {Object} attrs
 */
export function setAttrs(element, attrs) {
    Object.entries(attrs).forEach(([key, value]) => {
        element.setAttribute(key, value);
    });
}

/**
 * Add classes
 * @param {HTMLElement} element
 * @param {string|Array} classes
 */
export function addClass(element, classes) {
    if (Array.isArray(classes)) {
        element.classList.add(...classes);
    } else {
        element.classList.add(...classes.split(' '));
    }
}

/**
 * Remove classes
 * @param {HTMLElement} element
 * @param {string|Array} classes
 */
export function removeClass(element, classes) {
    if (Array.isArray(classes)) {
        element.classList.remove(...classes);
    } else {
        element.classList.remove(...classes.split(' '));
    }
}

/**
 * Toggle class
 * @param {HTMLElement} element
 * @param {string} className
 * @param {boolean} force
 */
export function toggleClass(element, className, force) {
    element.classList.toggle(className, force);
}

/**
 * Has class
 * @param {HTMLElement} element
 * @param {string} className
 * @returns {boolean}
 */
export function hasClass(element, className) {
    return element.classList.contains(className);
}

/**
 * Set styles
 * @param {HTMLElement} element
 * @param {Object} styles
 */
export function setStyles(element, styles) {
    Object.entries(styles).forEach(([key, value]) => {
        element.style[key] = value;
    });
}

/**
 * Show element
 * @param {HTMLElement} element
 * @param {string} display
 */
export function show(element, display = 'block') {
    element.style.display = display;
}

/**
 * Hide element
 * @param {HTMLElement} element
 */
export function hide(element) {
    element.style.display = 'none';
}

/**
 * Toggle visibility
 * @param {HTMLElement} element
 * @param {boolean} force
 * @param {string} display
 */
export function toggle(element, force, display = 'block') {
    if (force !== undefined) {
        force ? show(element, display) : hide(element);
    } else {
        element.style.display === 'none' ? show(element, display) : hide(element);
    }
}

/**
 * Remove element
 * @param {HTMLElement} element
 */
export function remove(element) {
    element?.parentElement?.removeChild(element);
}

/**
 * Clear element content
 * @param {HTMLElement} element
 */
export function clear(element) {
    element.innerHTML = '';
}

/**
 * HTML sanitization (basic XSS prevention)
 * @param {string} html
 * @returns {string}
 */
export function sanitizeHTML(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
}

/**
 * Escape HTML special characters
 * @param {string} text
 * @returns {string}
 */
export function escapeHTML(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, char => map[char]);
}

/**
 * Get element's computed style
 * @param {HTMLElement} element
 * @param {string} property
 * @returns {string}
 */
export function getComputedStyle(element, property) {
    return window.getComputedStyle(element).getPropertyValue(property);
}

/**
 * Debounce function
 * @param {Function} func
 * @param {number} wait
 * @returns {Function}
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function
 * @param {Function} func
 * @param {number} limit
 * @returns {Function}
 */
export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}

/**
 * Request animation frame wrapper
 * @param {Function} callback
 * @returns {number}
 */
export function raf(callback) {
    return requestAnimationFrame(callback);
}

/**
 * Cancel animation frame
 * @param {number} id
 */
export function caf(id) {
    cancelAnimationFrame(id);
}

/**
 * Check if element is in viewport
 * @param {HTMLElement} element
 * @returns {boolean}
 */
export function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

/**
 * Get scroll position
 * @returns {Object}
 */
export function getScrollPos() {
    return {
        x: window.scrollX || window.pageXOffset,
        y: window.scrollY || window.pageYOffset
    };
}

/**
 * Set scroll position
 * @param {number} x
 * @param {number} y
 */
export function setScrollPos(x, y) {
    window.scrollTo(x, y);
}

export default {
    createElement,
    query,
    queryAll,
    addListener,
    addDelegatedListener,
    setAttrs,
    addClass,
    removeClass,
    toggleClass,
    hasClass,
    setStyles,
    show,
    hide,
    toggle,
    remove,
    clear,
    sanitizeHTML,
    escapeHTML,
    getComputedStyle,
    debounce,
    throttle,
    raf,
    caf,
    isInViewport,
    getScrollPos,
    setScrollPos
};
