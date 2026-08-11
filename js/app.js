/**
 * NOTEPAD ONLINE - APPLICATION ENTRY POINT
 * Initializes all modules and orchestrates the application
 */

import { StorageEngine } from './modules/StorageEngine.js';
import { WindowManager } from './modules/WindowManager.js';
import { WindowComponent } from './modules/WindowComponent.js';
import { TabManager } from './modules/TabManager.js';
import { EditorComponent } from './modules/EditorComponent.js';
import { PreferencesManager } from './modules/PreferencesManager.js';
import { ImageClipboardEngine } from './modules/ImageClipboardEngine.js';
import { HistoryEngine } from './modules/HistoryEngine.js';
import { ExportEngine } from './modules/ExportEngine.js';
import { SearchReplaceEngine } from './modules/SearchReplaceEngine.js';
import { KeyboardShortcuts } from './modules/KeyboardShortcuts.js';
import { ThemeEngine } from './modules/ThemeEngine.js';
import { query, queryAll, addListener, createElement, addClass, removeClass, toggle } from './utils/domUtils.js';

class NotepadOnlineApp {
    constructor() {
        this.storage = new StorageEngine();
        this.windowManager = new WindowManager(this.storage);
        this.tabManager = new TabManager(this.storage);
        this.preferencesManager = new PreferencesManager(this.storage);
        this.imageClipboard = new ImageClipboardEngine(this.storage);
        this.exportEngine = new ExportEngine();
        this.searchReplace = new SearchReplaceEngine();
        this.keyboardShortcuts = new KeyboardShortcuts();
        this.themeEngine = new ThemeEngine();

        this.windowComponents = new Map();
        this.editorComponents = new Map();

        this.windowsContainer = query('#windows-container');
        this.bottomDock = query('#bottom-dock .dock-content');
    }

    /**
     * Initialize the application
     */
    async init() {
        console.log('🚀 Initializing Notepad Online...');

        try {
            // Wait for storage to initialize
            await this.storage.initPromise;
            console.log('✅ Storage Engine initialized');

            // Initialize other managers
            await this.preferencesManager.loadGlobalPreferences();
            await this.preferencesManager.loadPresetHistory();
            console.log('✅ Preferences Manager initialized');

            this.themeEngine.init();
            console.log('✅ Theme Engine initialized');

            // Attach keyboard shortcuts
            this.keyboardShortcuts.attach();
            console.log('✅ Keyboard Shortcuts attached');

            // Load existing windows from storage or create first one
            const existingWindows = await this.storage.getAllWindowStates();
            if (existingWindows.length === 0) {
                // First visit - create default window
                await this.createNewWindow();
            } else {
                // Load previous windows
                for (const windowState of existingWindows) {
                    this.renderWindow(windowState);
                }
            }

            console.log('✅ Windows loaded');

            // Attach event listeners
            this.attachEventListeners();
            console.log('✅ Event listeners attached');

            // Start auto-save timer if enabled
            if (this.preferencesManager.globalPreferences.autoSave) {
                this.startAutoSave();
            }

            console.log('✨ Notepad Online is ready!');
            this.showNotification('Welcome to Notepad Online', 'success');

        } catch (error) {
            console.error('❌ Initialization error:', error);
            this.showNotification('Failed to initialize app: ' + error.message, 'error');
        }
    }

    /**
     * Create a new window
     */
    async createNewWindow(options = {}) {
        try {
            const windowId = await this.windowManager.createWindow(options);
            const windowState = this.windowManager.getWindow(windowId);
            this.renderWindow(windowState);
            return windowId;
        } catch (error) {
            console.error('Error creating window:', error);
            this.showNotification('Failed to create window', 'error');
        }
    }

    /**
     * Render a window to DOM
     */
    async renderWindow(windowState) {
        try {
            const component = new WindowComponent(this.windowManager, windowState.id, windowState);
            const domElement = component.render();
            this.windowsContainer.appendChild(domElement);
            this.windowComponents.set(windowState.id, component);

            // Create first tab if none exist
            if (!windowState.tabs || windowState.tabs.length === 0) {
                await this.createNewTab(windowState.id);
            }

            // Render existing tabs
            for (const tabId of windowState.tabs || []) {
                await this.renderTab(windowState.id, tabId);
            }

            // Update dock
            this.updateDock();

        } catch (error) {
            console.error('Error rendering window:', error);
        }
    }

    /**
     * Create a new tab in a window
     */
    async createNewTab(windowId, options = {}) {
        try {
            const tabId = await this.tabManager.createTab(windowId, options);
            const windowState = this.windowManager.getWindow(windowId);
            if (!windowState.tabs) windowState.tabs = [];
            windowState.tabs.push(tabId);

            await this.storage.saveWindowState(windowId, windowState);
            await this.renderTab(windowId, tabId);

            return tabId;
        } catch (error) {
            console.error('Error creating tab:', error);
        }
    }

    /**
     * Render a tab to DOM
     */
    async renderTab(windowId, tabId) {
        try {
            const tab = this.tabManager.getTab(tabId);
            const windowComponent = this.windowComponents.get(windowId);
            if (!windowComponent || !tab) return;

            // Create editor component
            const editorComponent = new EditorComponent(this.tabManager, tabId);
            const editorContainer = query('.editor-container', windowComponent.domElement);

            if (editorContainer) {
                editorComponent.render(editorContainer);
                this.editorComponents.set(tabId, editorComponent);
            }

        } catch (error) {
            console.error('Error rendering tab:', error);
        }
    }

    /**
     * Attach event listeners to UI elements
     */
    attachEventListeners() {
        // New window button
        const btnNewWindow = query('#btn-new-window');
        if (btnNewWindow) {
            btnNewWindow.addEventListener('click', () => this.createNewWindow());
        }

        // Theme toggle
        const btnThemeToggle = query('#btn-theme-toggle');
        if (btnThemeToggle) {
            btnThemeToggle.addEventListener('click', () => {
                this.themeEngine.toggleDarkMode();
                btnThemeToggle.textContent = this.themeEngine.isDarkMode ? '☀️' : '🌙';
            });
        }

        // Global preferences
        const btnGlobalPrefs = query('#btn-global-prefs');
        const prefsModal = query('#preferences-modal');
        if (btnGlobalPrefs && prefsModal) {
            btnGlobalPrefs.addEventListener('click', () => {
                toggle(prefsModal, true, 'flex');
            });
        }

        // Close modals
        queryAll('.modal-backdrop, .btn-close').forEach(el => {
            el.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal-backdrop') || e.target.classList.contains('btn-close')) {
                    const modal = e.target.closest('.modal');
                    if (modal) toggle(modal, false);
                }
            });
        });

        // Keyboard shortcuts
        this.keyboardShortcuts.on('newWindow', () => this.createNewWindow());
        this.keyboardShortcuts.on('openPreferences', () => toggle(query('#preferences-modal'), true, 'flex'));
        this.keyboardShortcuts.on('openHelp', () => toggle(query('#help-modal'), true, 'flex'));

        console.log('✅ Event listeners attached');
    }

    /**
     * Update dock with windows
     */
    updateDock() {
        if (!this.bottomDock) return;

        this.bottomDock.innerHTML = '';

        const windows = this.windowManager.getAllWindows();
        windows.forEach(windowState => {
            const item = createElement('div', {
                class: ['dock-item'],
                text: windowState.title,
                attrs: { 'data-window-id': windowState.id }
            });

            if (windowState.id === this.windowManager.activeWindowId) {
                addClass(item, 'active');
            }

            item.addEventListener('click', async () => {
                if (windowState.isMinimized) {
                    await this.windowManager.restoreWindow(windowState.id);
                }
                this.windowManager.bringToTop(windowState.id);
                this.updateDock();
            });

            this.bottomDock.appendChild(item);
        });
    }

    /**
     * Start auto-save timer
     */
    startAutoSave() {
        const interval = this.preferencesManager.globalPreferences.autoSaveInterval || 60000;
        setInterval(async () => {
            for (const [tabId, editor] of this.editorComponents) {
                const tab = this.tabManager.getTab(tabId);
                if (tab && tab.isDirty) {
                    await this.storage.saveNote(tabId, editor.getContent(), { tabTitle: tab.title });
                    tab.isDirty = false;
                    this.showNotification('Auto-saved', 'success', 1000);
                }
            }
        }, interval);
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info', duration = 3000) {
        const indicator = query('#status-indicator');
        if (indicator) {
            indicator.textContent = message;
            indicator.className = `status-indicator ${type}`;
            removeClass(indicator, 'hidden');

            if (duration > 0) {
                setTimeout(() => addClass(indicator, 'hidden'), duration);
            }
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const app = new NotepadOnlineApp();
    await app.init();
    window.notepadApp = app; // Expose for debugging
});

console.log('📝 Notepad Online v1.0 - Loading...');
