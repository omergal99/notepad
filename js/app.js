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
                    // Add window to windowManager
                    this.windowManager.windows.set(windowState.id, windowState);
                    if (!this.windowManager.zIndexStack.includes(windowState.id)) {
                        this.windowManager.zIndexStack.push(windowState.id);
                    }
                    this.windowManager.activeWindowId = windowState.id;
                    
                    // Then render it
                    await this.renderWindow(windowState);
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

            // Get tabs and their data
            const tabIds = windowState.tabs || [];
            const tabsData = tabIds.map(tabId => this.tabManager.getTab(tabId)).filter(t => t);
            
            // Render all editors for the tabs (they'll be hidden/shown as needed)
            for (const tabId of tabIds) {
                await this.renderTab(windowState.id, tabId);
            }

            // Set active tab (default to first tab)
            const activeTabId = windowState.activeTabId || tabIds[0];
            windowState.activeTabId = activeTabId;
            
            // Render tab bar with tabs
            component.renderTabs(tabsData, activeTabId);
            
            // Show only active tab's editor
            this.showActiveTabEditor(windowState.id, activeTabId);

            // Attach window-level event listeners
            this.attachWindowEventListeners(windowState.id, component);

            // Update dock
            this.updateDock();

        } catch (error) {
            console.error('Error rendering window:', error);
        }
    }

    /**
     * Attach event listeners to a specific window component
     */
    attachWindowEventListeners(windowId, component) {
        // Handle tab switching
        component.on('switchTab', async (data) => {
            const windowState = this.windowManager.getWindow(windowId);
            windowState.activeTabId = data.tabId;
            await this.storage.saveWindowState(windowState);
            this.showActiveTabEditor(windowId, data.tabId);
            this.updateWindowTabBar(windowId);
        });

        // Handle tab closing
        component.on('closeTab', async (data) => {
            await this.closeTab(data.tabId, windowId);
        });

        // Handle add tab
        component.on('addTab', async () => {
            await this.createNewTab(windowId);
            this.updateWindowTabBar(windowId);
        });
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
            windowState.activeTabId = tabId;

            await this.storage.saveWindowState(windowState);
            await this.renderTab(windowId, tabId);

            return tabId;
        } catch (error) {
            console.error('Error creating tab:', error);
        }
    }

    /**
     * Close a tab in a window
     */
    async closeTab(tabId, windowId) {
        try {
            const windowState = this.windowManager.getWindow(windowId);
            if (!windowState || !windowState.tabs) return;

            // Remove tab from window
            windowState.tabs = windowState.tabs.filter(id => id !== tabId);
            
            // Remove editor component
            this.editorComponents.delete(tabId);

            // If this was the active tab, switch to another
            if (windowState.activeTabId === tabId) {
                windowState.activeTabId = windowState.tabs[0] || null;
            }

            // If no tabs left, create a new one
            if (windowState.tabs.length === 0) {
                await this.createNewTab(windowId);
            } else {
                await this.tabManager.closeTab(tabId);
                await this.storage.saveWindowState(windowState);
                this.updateWindowTabBar(windowId);
                this.showActiveTabEditor(windowId, windowState.activeTabId);
            }
        } catch (error) {
            console.error('Error closing tab:', error);
        }
    }

    /**
     * Render a tab to DOM (creates editor component)
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
     * Show only the active tab's editor
     */
    showActiveTabEditor(windowId, activeTabId) {
        const windowComponent = this.windowComponents.get(windowId);
        if (!windowComponent) return;

        // Hide all editors in this window
        const editors = query('.editor-container', windowComponent.domElement);
        if (editors) {
            queryAll('.editor', editors).forEach(editor => {
                editor.style.display = 'none';
            });

            // Show only active tab's editor
            const activeEditor = query(`[data-tab-id="${activeTabId}"]`, editors);
            if (activeEditor) {
                activeEditor.style.display = 'flex';
            }
        }
    }

    /**
     * Update window tab bar display
     */
    updateWindowTabBar(windowId) {
        const windowState = this.windowManager.getWindow(windowId);
        const windowComponent = this.windowComponents.get(windowId);
        if (!windowComponent || !windowState) return;

        const tabIds = windowState.tabs || [];
        const tabsData = tabIds.map(tabId => this.tabManager.getTab(tabId)).filter(t => t);
        
        windowComponent.renderTabs(tabsData, windowState.activeTabId);
    }

    /**
     * Attach event listeners to UI elements
     */
    attachEventListeners() {
        // Window Manager Events - Handle focus, minimize, close
        this.windowManager.on('windowFocused', ({ windowId }) => {
            // Remove active class from all windows
            queryAll('.window').forEach(w => removeClass(w, 'active'));
            // Add active class to focused window
            const focusedWindow = query(`[data-window-id="${windowId}"]`);
            if (focusedWindow) addClass(focusedWindow, 'active');
            // Update z-index
            queryAll('.window').forEach(w => {
                const wId = w.getAttribute('data-window-id');
                const windowState = this.windowManager.windows.get(wId);
                if (windowState) w.style.zIndex = windowState.zIndex;
            });
        });

        this.windowManager.on('windowClosed', ({ windowId }) => {
            const element = query(`[data-window-id="${windowId}"]`);
            if (element) element.remove();
            this.updateDock();
        });

        this.windowManager.on('windowMinimized', ({ windowId }) => {
            const element = query(`[data-window-id="${windowId}"]`);
            if (element) addClass(element, 'minimized');
        });

        this.windowManager.on('windowRestored', ({ windowId }) => {
            const element = query(`[data-window-id="${windowId}"]`);
            if (element) removeClass(element, 'minimized');
        });

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

        // Attach preferences modal handlers
        this.attachPreferencesUI();

        console.log('✅ Event listeners attached');
    }

    /**
     * Attach preferences modal UI handlers
     */
    attachPreferencesUI() {
        const prefsModal = query('#preferences-modal');
        if (!prefsModal) return;

        // Preference input elements
        const inputs = {
            fontFamily: query('#pref-font-family'),
            fontSize: query('#pref-font-size'),
            textColor: query('#pref-text-color'),
            backgroundColor: query('#pref-bg-color'),
            tabWidth: query('#pref-tab-width'),
            autoIndent: query('#pref-auto-indent'),
            textWrap: query('#pref-text-wrap'),
            lineNumbers: query('#pref-line-numbers'),
            statusBar: query('#pref-status-bar'),
            minimap: query('#pref-minimap')
        };

        // Font size slider updates display value
        if (inputs.fontSize) {
            inputs.fontSize.addEventListener('input', () => {
                const sizeValue = query('#pref-size-value');
                if (sizeValue) sizeValue.textContent = inputs.fontSize.value;
            });
        }

        // Load current preferences when modal opens
        const btnGlobalPrefs = query('#btn-global-prefs');
        if (btnGlobalPrefs) {
            const originalClick = btnGlobalPrefs.onclick;
            btnGlobalPrefs.addEventListener('click', () => {
                setTimeout(() => this.loadPreferencesUI(inputs), 0);
            });
        }

        // Save preferences button
        const btnSavePrefs = query('#btn-save-defaults');
        if (btnSavePrefs) {
            btnSavePrefs.addEventListener('click', async () => {
                const prefs = {};
                Object.keys(inputs).forEach(key => {
                    const input = inputs[key];
                    if (!input) return;
                    
                    if (input.type === 'checkbox') {
                        prefs[key] = input.checked;
                    } else if (input.type === 'range' || input.type === 'number') {
                        prefs[key] = parseInt(input.value);
                    } else {
                        prefs[key] = input.value;
                    }
                });

                await this.preferencesManager.saveGlobalPreferences(prefs);
                this.applyPreferencesToAll(prefs);
                this.showNotification('Preferences saved', 'success');
                toggle(prefsModal, false);
            });
        }

        // Close preferences button
        const btnClosePrefs = query('#btn-close-prefs');
        if (btnClosePrefs) {
            btnClosePrefs.addEventListener('click', () => {
                toggle(prefsModal, false);
            });
        }
    }

    /**
     * Load current preferences into UI
     */
    loadPreferencesUI(inputs) {
        const prefs = this.preferencesManager.globalPreferences;
        
        Object.keys(inputs).forEach(key => {
            const input = inputs[key];
            if (!input) return;
            
            const value = prefs[key];
            if (input.type === 'checkbox') {
                input.checked = Boolean(value);
            } else if (input.type === 'range') {
                input.value = String(value);
                const sizeValue = query('#pref-size-value');
                if (sizeValue) sizeValue.textContent = String(value);
            } else {
                input.value = String(value);
            }
        });
    }

    /**
     * Apply preferences to all open editors
     */
    applyPreferencesToAll(prefs) {
        this.editorComponents.forEach(editor => {
            editor.applyPreferences(prefs);
        });
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
