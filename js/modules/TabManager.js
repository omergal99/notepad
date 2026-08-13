/**
 * TAB MANAGER
 * Multi-tab engine inside window, tab bar reordering
 * Phase 4 implementation
 */

import { EventEmitter } from '../utils/eventEmitter.js';
import { v4 as uuidv4 } from '../utils/uuid.js';

export class TabManager extends EventEmitter {
    constructor(storage) {
        super();
        this.storage = storage;
        this.tabs = new Map();
        this.activeTabId = null;
    }

    /**
     * Create a new tab
     */
    async createTab(windowId, options = {}) {
        const tabId = uuidv4();
        const tab = {
            id: tabId,
            windowId,
            title: options.title || `Untitled document ${this.tabs.size + 1}`,
            content: options.content || '',
            cursorPos: 0,
            scrollPos: 0,
            isDirty: false,
            preferences: options.preferences || this.getDefaultPreferences(),
            createdAt: new Date().toISOString()
        };

        this.tabs.set(tabId, tab);
        this.activeTabId = tabId;

        this.emit('tabCreated', { tabId, tab });
        return tabId;
    }

    /**
     * Close a tab
     */
    async closeTab(tabId) {
        this.tabs.delete(tabId);
        if (this.activeTabId === tabId) {
            this.activeTabId = Array.from(this.tabs.keys())[0] || null;
        }

        this.emit('tabClosed', { tabId });
    }

    /**
     * Get tab
     */
    getTab(tabId) {
        return this.tabs.get(tabId);
    }

    /**
     * Update tab content
     */
    async updateTabContent(tabId, content) {
        const tab = this.tabs.get(tabId);
        if (tab) {
            tab.content = content;
            tab.isDirty = true;
            this.emit('tabContentChanged', { tabId, content });
        }
    }

    /**
     * Update tab cursor position
     */
    updateTabCursorPos(tabId, position) {
        const tab = this.tabs.get(tabId);
        if (tab) {
            tab.cursorPos = position;
        }
    }

    /**
     * Rename tab
     */
    async renameTab(tabId, newTitle) {
        const tab = this.tabs.get(tabId);
        if (tab) {
            tab.title = newTitle;
            this.emit('tabRenamed', { tabId, title: newTitle });
        }
    }

    /**
     * Get default preferences
     */
    getDefaultPreferences() {
        return {
            fontFamily: 'monospace',
            fontSize: 14,
            textColor: '#333333',
            backgroundColor: '#FFFFFF',
            tabWidth: 4,
            autoIndent: true,
            textWrap: true,
            lineNumbers: true,
            statusBar: true,
            minimap: true
        };
    }

    /**
     * Get all tabs for a window
     */
    getTabsByWindow(windowId) {
        return Array.from(this.tabs.values()).filter(tab => tab.windowId === windowId);
    }
}

export default TabManager;
