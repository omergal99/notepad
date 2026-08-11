/**
 * THEME ENGINE
 * Dark/Light mode and custom tab theme manager
 * Phase 5 implementation
 */

import { EventEmitter } from '../utils/eventEmitter.js';
import { addClass, removeClass } from '../utils/domUtils.js';

export class ThemeEngine extends EventEmitter {
    constructor() {
        super();
        this.isDarkMode = false;
        this.themes = new Map();
        this.currentTheme = 'default-light';
        this.loadThemePreference();
    }

    /**
     * Initialize theme
     */
    init() {
        this.registerDefaultThemes();

        // Check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            this.isDarkMode = true;
        }

        this.apply();

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            this.isDarkMode = e.matches;
            this.apply();
        });
    }

    /**
     * Register default themes
     */
    registerDefaultThemes() {
        this.registerTheme('default-light', {
            name: 'Light Mode',
            isDark: false,
            colors: {
                background: '#F8F7F2',
                surface: '#FFFFFF',
                text: '#333333',
                textSecondary: '#666666',
                border: '#D0D0D0',
                accent: '#0078D4'
            }
        });

        this.registerTheme('default-dark', {
            name: 'Dark Mode',
            isDark: true,
            colors: {
                background: '#1E1E1E',
                surface: '#252526',
                text: '#E0E0E0',
                textSecondary: '#B0B0B0',
                border: '#3E3E42',
                accent: '#0078D4'
            }
        });
    }

    /**
     * Register a custom theme
     */
    registerTheme(id, theme) {
        this.themes.set(id, theme);
        this.emit('themeRegistered', { id, theme });
    }

    /**
     * Set theme
     */
    setTheme(themeId) {
        if (this.themes.has(themeId)) {
            this.currentTheme = themeId;
            this.apply();
            this.saveThemePreference();
            this.emit('themeChanged', { themeId });
        }
    }

    /**
     * Toggle dark mode
     */
    toggleDarkMode() {
        this.isDarkMode = !this.isDarkMode;
        this.apply();
        this.saveThemePreference();
        this.emit('darkModeToggled', { isDarkMode: this.isDarkMode });
    }

    /**
     * Apply current theme
     */
    apply() {
        if (this.isDarkMode) {
            addClass(document.body, 'dark-mode');
            this.applyTheme('default-dark');
        } else {
            removeClass(document.body, 'dark-mode');
            this.applyTheme('default-light');
        }
    }

    /**
     * Apply specific theme
     */
    applyTheme(themeId) {
        const theme = this.themes.get(themeId);
        if (!theme) return;

        const root = document.documentElement;
        Object.entries(theme.colors || {}).forEach(([key, value]) => {
            const cssVar = `--${this.camelToKebab(key)}`;
            root.style.setProperty(cssVar, value);
        });
    }

    /**
     * Get current theme
     */
    getCurrentTheme() {
        return this.themes.get(this.currentTheme);
    }

    /**
     * Get all themes
     */
    getAllThemes() {
        return Array.from(this.themes.values());
    }

    /**
     * Save theme preference to localStorage
     */
    saveThemePreference() {
        localStorage.setItem('np_theme_preference', JSON.stringify({
            isDarkMode: this.isDarkMode,
            currentTheme: this.currentTheme
        }));
    }

    /**
     * Load theme preference from localStorage
     */
    loadThemePreference() {
        try {
            const saved = localStorage.getItem('np_theme_preference');
            if (saved) {
                const pref = JSON.parse(saved);
                this.isDarkMode = pref.isDarkMode || false;
                this.currentTheme = pref.currentTheme || 'default-light';
            }
        } catch (error) {
            console.error('Error loading theme preference:', error);
        }
    }

    /**
     * Convert camelCase to kebab-case
     */
    camelToKebab(str) {
        return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
    }

    /**
     * Create custom tab theme
     */
    createTabTheme(tabId, backgroundColor, textColor) {
        const theme = {
            tabId,
            backgroundColor,
            textColor,
            createdAt: new Date().toISOString()
        };

        this.emit('tabThemeCreated', theme);
        return theme;
    }
}

export default ThemeEngine;
