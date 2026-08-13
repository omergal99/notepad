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

            // Listen for tab content changes to update save indicator
            this.tabManager.on('tabContentChanged', ({ tabId }) => {
                const tab = this.tabManager.getTab(tabId);
                if (tab) {
                    const windowState = this.windowManager.windows.get(tab.windowId);
                    if (windowState) {
                        const component = this.windowComponents.get(tab.windowId);
                        if (component && windowState.tabs) {
                            const tabsData = windowState.tabs.map(id => this.tabManager.getTab(id)).filter(t => t);
                            component.renderTabs(tabsData, windowState.activeTabId);
                        }
                    }
                }
            });

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
            // Focus the new window
            this.windowManager.bringToTop(windowId);
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
            this.refreshRecentFiles(windowState.id);

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

        component.on('save', () => this.saveCurrentWindow());
        component.on('importFile', () => this.importFile(windowId));
        component.on('openRecentFile', ({ fileId }) => this.openRecentFile(windowId, fileId));
        component.on('tabRenamed', async ({ tabId, newTitle }) => {
            await this.tabManager.renameTab(tabId, newTitle);
            const windowState = this.windowManager.getWindow(windowId);
            if (windowState?.activeTabId === tabId) {
                this.showActiveTabEditor(windowId, tabId);
            }
            this.updateWindowTabBar(windowId);
        });

        // Handle window close - delete from storage
        component.on('windowClosed', async () => {
            await this.storage.deleteWindowState(windowId);
        });
    }

    async refreshRecentFiles(windowId) {
        const component = this.windowComponents.get(windowId);
        if (!component) return;

        const notes = await this.storage.getAllNotes();
        const recentFiles = [...notes]
            .sort((first, second) => second.lastModified - first.lastModified)
            .slice(0, 8)
            .map(note => ({ id: note.id, name: note.tabTitle || 'Untitled' }));
        component.populateRecentFiles(recentFiles);
    }

    async importFile(windowId) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.txt,.md,.csv,.json,.js,.css,.html,text/plain,text/markdown,application/json';
        input.addEventListener('change', async () => {
            const [file] = input.files || [];
            if (!file) return;

            const content = await file.text();
            const tabId = await this.createNewTab(windowId, { title: file.name, content });
            const tab = this.tabManager.getTab(tabId);
            if (tab) {
                tab.isDirty = true;
                await this.saveCurrentWindow();
            }
            this.refreshRecentFiles(windowId);
        }, { once: true });
        input.click();
    }

    async openRecentFile(windowId, noteId) {
        const note = await this.storage.loadNote(noteId);
        if (!note) return;

        const tabId = await this.createNewTab(windowId, {
            title: note.tabTitle || 'Untitled',
            content: note.content
        });
        const tab = this.tabManager.getTab(tabId);
        if (tab) tab.noteId = note.id;
        this.showActiveTabEditor(windowId, tabId);
    }

    /**
     * Create a new tab in a window
     */
    async createNewTab(windowId, options = {}) {
        try {
            const tabId = await this.tabManager.createTab(windowId, options);
            const windowState = this.windowManager.getWindow(windowId);
            if (!windowState.tabs) windowState.tabs = [];
            
            // Insert new tab after the currently active tab (or at the end)
            const activeTabIndex = windowState.tabs.indexOf(windowState.activeTabId);
            if (activeTabIndex >= 0) {
                windowState.tabs.splice(activeTabIndex + 1, 0, tabId);
            } else {
                windowState.tabs.push(tabId);
            }
            
            windowState.activeTabId = tabId;

            await this.storage.saveWindowState(windowState);
            await this.renderTab(windowId, tabId);
            this.updateWindowTabBar(windowId);

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

            // Get editor container
            const editorContainer = query('.editor-container', windowComponent.domElement);
            if (editorContainer) {
                // Create editor component - it will render its own div with data-tab-id
                const editorComponent = new EditorComponent(this.tabManager, tabId);
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
        const editorContainer = query('.editor-container', windowComponent.domElement);
        if (editorContainer) {
            queryAll('.editor', editorContainer).forEach(editor => {
                editor.style.display = 'none';
            });

            // Show only active tab's editor
            const activeEditor = query(`[data-tab-id="${activeTabId}"]`, editorContainer);
            if (activeEditor) {
                activeEditor.style.display = 'flex';
            }
        }

        // Update window title to match active tab
        const activeTab = this.tabManager.getTab(activeTabId);
        if (activeTab && windowComponent.windowState) {
            windowComponent.windowState.title = activeTab.title || 'Untitled';
            const titleEl = query('.window-title-text', windowComponent.domElement);
            if (titleEl) {
                titleEl.textContent = activeTab.title || 'Untitled';
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
            this.updateDock();
        });

        this.windowManager.on('windowRestored', ({ windowId }) => {
            const element = query(`[data-window-id="${windowId}"]`);
            if (element) removeClass(element, 'minimized');
            const component = this.windowComponents.get(windowId);
            if (component) {
                component.updateDOMPosition();
                component.updateMaximizeButton();
            }
            this.updateDock();
        });

        this.windowManager.on('windowMaximized', ({ windowId }) => {
            const component = this.windowComponents.get(windowId);
            if (component) {
                component.updateDOMPosition();
                component.updateMaximizeButton();
            }
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
                btnThemeToggle.textContent = this.themeEngine.isDarkMode ? 'Light' : 'Dark';
            });
            // Set initial state
            btnThemeToggle.textContent = this.themeEngine.isDarkMode ? 'Light' : 'Dark';
        }

        // Global preferences
        const btnGlobalPrefs = query('#btn-global-prefs');
        const prefsModal = query('#preferences-modal');
        if (btnGlobalPrefs && prefsModal) {
            btnGlobalPrefs.addEventListener('click', () => {
                removeClass(prefsModal, 'hidden');
                prefsModal.style.display = 'flex';
            });
        }

        // Close modals
        queryAll('.modal-backdrop, .btn-close').forEach(el => {
            el.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal-backdrop') || e.target.classList.contains('btn-close')) {
                    const modal = e.target.closest('.modal');
                    if (modal) {
                        modal.style.display = 'none';
                        addClass(modal, 'hidden');
                    }
                }
            });
        });

        // Keyboard shortcuts
        this.keyboardShortcuts.on('newWindow', () => this.createNewWindow());
        this.keyboardShortcuts.on('openPreferences', () => {
            const prefsModal = query('#preferences-modal');
            if (prefsModal) {
                removeClass(prefsModal, 'hidden');
                prefsModal.style.display = 'flex';
            }
        });
        this.keyboardShortcuts.on('openHelp', () => toggle(query('#help-modal'), true, 'flex'));
        
        // Save, Undo, Redo
        this.keyboardShortcuts.on('save', () => this.saveCurrentWindow());
        this.keyboardShortcuts.on('undo', () => this.showNotification('Undo - Coming soon', 'info', 1000));
        this.keyboardShortcuts.on('redo', () => this.showNotification('Redo - Coming soon', 'info', 1000));
        this.keyboardShortcuts.on('newTab', () => {
            if (this.windowManager.activeWindowId) {
                this.createNewTab(this.windowManager.activeWindowId);
            }
        });
        this.keyboardShortcuts.on('closeTab', () => {
            const windowState = this.windowManager.getWindow(this.windowManager.activeWindowId);
            if (windowState && windowState.activeTabId) {
                const component = this.windowComponents.get(this.windowManager.activeWindowId);
                if (component) {
                    component.emit('closeTab', { tabId: windowState.activeTabId });
                }
            }
        });

        // Application menu handlers
        queryAll('.menu-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const action = e.target.getAttribute('data-action');
                this.handleMenuAction(action);
            });
        });

        // Attach preferences modal handlers
        this.attachPreferencesUI();

        console.log('✅ Event listeners attached');
    }

    /**
     * Handle menu bar actions
     */
    handleMenuAction(action) {
        switch(action) {
            case 'newWindow':
                this.createNewWindow();
                break;
            case 'newTab':
                if (this.windowManager.activeWindowId) {
                    this.createNewTab(this.windowManager.activeWindowId);
                }
                break;
            case 'save':
                this.saveCurrentWindow();
                break;
            case 'saveAll':
                // Save all dirty tabs
                (async () => {
                    for (const [tabId, editor] of this.editorComponents) {
                        const tab = this.tabManager.getTab(tabId);
                        if (tab && tab.isDirty) {
                            await this.storage.saveNote(tabId, editor.getContent(), { tabTitle: tab.title });
                            tab.isDirty = false;
                        }
                    }
                    this.showNotification('✓ All saved', 'success', 1500);
                    // Re-render all tab bars
                    for (const [windowId, component] of this.windowComponents) {
                        const windowState = this.windowManager.getWindow(windowId);
                        if (windowState && windowState.tabs) {
                            const tabsData = windowState.tabs.map(id => this.tabManager.getTab(id)).filter(t => t);
                            component.renderTabs(tabsData, windowState.activeTabId);
                        }
                    }
                })();
                break;
            case 'exit':
                if (confirm('Are you sure you want to close all windows? Your data will be saved.')) {
                    this.showNotification('Goodbye! 👋', 'info', 1000);
                    setTimeout(() => {
                        window.close();
                    }, 500);
                }
                break;
            case 'find':
                this.openFindPrompt();
                break;
            case 'replace':
                this.openReplacePrompt();
                break;
            case 'toggleLineNumbers':
                this.toggleActiveEditorPreference('lineNumbers');
                break;
            case 'toggleMinimap':
                this.toggleActiveEditorPreference('minimap');
                break;
            case 'toggleStatusBar':
                this.toggleActiveEditorPreference('statusBar');
                break;
            case 'zoomIn':
                this.adjustActiveEditorFontSize(1);
                break;
            case 'zoomOut':
                this.adjustActiveEditorFontSize(-1);
                break;
            case 'resetZoom':
                this.setActiveEditorFontSize(14);
                break;
            case 'export':
                this.showNotification('Export feature coming soon', 'info', 2000);
                break;
            case 'print':
                window.print();
                break;
            case 'preferences':
                {
                    const prefsModal = query('#preferences-modal');
                    if (prefsModal) {
                        removeClass(prefsModal, 'hidden');
                        prefsModal.style.display = 'flex';
                    }
                }
                break;
            case 'keyboardShortcuts':
                this.showNotification('Keyboard shortcuts - Ctrl+?, Ctrl+S, Ctrl+N, Ctrl+H', 'info', 3000);
                break;
            case 'about':
                this.showNotification('Notepad Online - Fast, Private, Local-First Text Editor v1.0', 'info', 3000);
                break;
            default:
                break;
        }
    }

    getActiveEditorContext() {
        const windowState = this.windowManager.getWindow(this.windowManager.activeWindowId);
        if (!windowState?.activeTabId) return {};
        return {
            tab: this.tabManager.getTab(windowState.activeTabId),
            editor: this.editorComponents.get(windowState.activeTabId)
        };
    }

    toggleActiveEditorPreference(preference) {
        const { tab, editor } = this.getActiveEditorContext();
        if (!tab || !editor) return;

        tab.preferences[preference] = !tab.preferences[preference];
        if (preference === 'lineNumbers') editor.setLineNumbersVisible(tab.preferences[preference]);
        if (preference === 'minimap') editor.setMinimapVisible(tab.preferences[preference]);
        if (preference === 'statusBar') editor.setStatusBarVisible(tab.preferences[preference]);
    }

    adjustActiveEditorFontSize(amount) {
        const { tab } = this.getActiveEditorContext();
        if (!tab) return;
        this.setActiveEditorFontSize(Math.max(10, Math.min(32, tab.preferences.fontSize + amount)));
    }

    setActiveEditorFontSize(fontSize) {
        const { tab, editor } = this.getActiveEditorContext();
        if (!tab || !editor) return;
        tab.preferences.fontSize = fontSize;
        editor.setFontSize(fontSize);
    }

    openFindPrompt() {
        const { editor } = this.getActiveEditorContext();
        if (!editor) return;
        const searchText = window.prompt('Find');
        if (!searchText) return;
        const index = editor.getContent().indexOf(searchText, editor.textareaElement.selectionEnd);
        if (index < 0) {
            this.showNotification('No match found', 'info', 0);
            return;
        }
        editor.textareaElement.focus();
        editor.textareaElement.setSelectionRange(index, index + searchText.length);
        editor.updateStatusBar();
    }

    openReplacePrompt() {
        const { editor } = this.getActiveEditorContext();
        if (!editor) return;
        const searchText = window.prompt('Find');
        if (!searchText) return;
        const replacement = window.prompt('Replace with', '');
        if (replacement === null) return;
        const content = editor.getContent();
        const index = content.indexOf(searchText, editor.textareaElement.selectionStart);
        if (index < 0) {
            this.showNotification('No match found', 'info', 0);
            return;
        }
        editor.setContent(`${content.slice(0, index)}${replacement}${content.slice(index + searchText.length)}`);
        this.tabManager.updateTabContent(editor.tabId, editor.getContent());
        editor.textareaElement.focus();
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
                prefsModal.style.display = 'none';
                addClass(prefsModal, 'hidden');
            });
        }

        // Close preferences button
        const btnClosePrefs = query('#btn-close-prefs');
        if (btnClosePrefs) {
            btnClosePrefs.addEventListener('click', () => {
                prefsModal.style.display = 'none';
                addClass(prefsModal, 'hidden');
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
    /**
     * Save current window's active tab
     */
    async saveCurrentWindow() {
        const activeWindowId = this.windowManager.activeWindowId;
        if (!activeWindowId) return;

        const windowState = this.windowManager.getWindow(activeWindowId);
        if (!windowState || !windowState.activeTabId) return;

        const tab = this.tabManager.getTab(windowState.activeTabId);
        const editor = this.editorComponents.get(windowState.activeTabId);
        
        if (tab && editor) {
            tab.noteId = await this.storage.saveNote(windowState.activeTabId, editor.getContent(), {
                id: tab.noteId,
                tabTitle: tab.title,
                windowId: activeWindowId
            });
            tab.isDirty = false;
            
            // Update tab bar to show saved status
            const component = this.windowComponents.get(activeWindowId);
            if (component && windowState.tabs) {
                const tabsData = windowState.tabs.map(id => this.tabManager.getTab(id)).filter(t => t);
                component.renderTabs(tabsData, windowState.activeTabId);
            }
            
            this.showNotification('✓ Saved', 'success', 1500);
            this.refreshRecentFiles(activeWindowId);
        }
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
                    // Update tab bar to show saved status
                    const windowState = this.windowManager.windows.get(tab.windowId);
                    if (windowState) {
                        const component = this.windowComponents.get(tab.windowId);
                        if (component) {
                            const tabsData = windowState.tabs.map(id => this.tabManager.getTab(id)).filter(t => t);
                            component.renderTabs(tabsData, windowState.activeTabId);
                        }
                    }
                    this.showNotification('Auto-saved', 'success', 1000);
                }
            }
        }, interval);
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info', duration = 3000) {
        const modal = query('#notification-modal');
        const title = query('#notification-title');
        const body = query('#notification-message');
        const okBtn = query('#notification-ok-btn');
        const closeBtn = query('#close-notification-modal');
        
        if (!modal || !title || !body) return;

        // Set message
        title.textContent = type === 'success' ? '✓ Success' : type === 'error' ? '✗ Error' : 'Message';
        body.textContent = message;

        // Show modal
        removeClass(modal, 'hidden');
        modal.style.display = 'flex';

        // Close handler
        const closeModal = () => {
            addClass(modal, 'hidden');
            modal.style.display = 'none';
        };

        okBtn.onclick = closeModal;
        closeBtn.onclick = closeModal;

        // Auto-close if duration specified (for less intrusive messages)
        if (duration > 0 && type === 'success') {
            setTimeout(closeModal, duration);
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
