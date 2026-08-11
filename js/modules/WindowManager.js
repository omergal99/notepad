/**
 * WINDOW MANAGER
 * Manages floating window lifecycle, z-index stacking, positioning, and snapping
 * Phase 3 implementation
 */

import { EventEmitter } from '../utils/eventEmitter.js';
import { v4 as uuidv4 } from 'https://cdn.jsdelivr.net/npm/uuid@9.0.0/dist/esm-browser/index.js';

export class WindowManager extends EventEmitter {
    constructor(storage) {
        super();
        this.storage = storage;
        this.windows = new Map();
        this.activeWindowId = null;
        this.zIndexStack = [];
        this.snapZones = {
            left: null,
            right: null,
            topLeft: null,
            topRight: null,
            bottomLeft: null,
            bottomRight: null
        };
    }

    /**
     * Create a new window
     */
    async createWindow(options = {}) {
        const windowId = uuidv4();
        const windowState = {
            id: windowId,
            title: options.title || `Untitled document ${this.windows.size + 1}`,
            x: options.x || 100,
            y: options.y || 100,
            width: options.width || Math.min(800, window.innerWidth * 0.75),
            height: options.height || Math.min(600, window.innerHeight * 0.75),
            isMinimized: false,
            isMaximized: false,
            tabs: [],
            activeTabId: null,
            createdAt: new Date().toISOString()
        };

        // TODO: Create WindowComponent and render
        this.windows.set(windowId, windowState);
        this.bringToTop(windowId);

        // Save to storage
        await this.storage.saveWindowState(windowId, windowState);

        this.emit('windowCreated', { windowId, windowState });
        return windowId;
    }

    /**
     * Close a window
     */
    async closeWindow(windowId) {
        this.windows.delete(windowId);
        this.zIndexStack = this.zIndexStack.filter(id => id !== windowId);
        if (this.activeWindowId === windowId) {
            this.activeWindowId = this.zIndexStack[this.zIndexStack.length - 1] || null;
        }

        await this.storage.deleteWindowState(windowId);
        this.emit('windowClosed', { windowId });
    }

    /**
     * Bring window to top (increase z-index)
     */
    bringToTop(windowId) {
        this.zIndexStack = this.zIndexStack.filter(id => id !== windowId);
        this.zIndexStack.push(windowId);
        this.activeWindowId = windowId;
        this.emit('windowFocused', { windowId });
    }

    /**
     * Minimize window
     */
    async minimizeWindow(windowId) {
        const window = this.windows.get(windowId);
        if (window) {
            window.isMinimized = true;
            await this.storage.saveWindowState(windowId, window);
            this.emit('windowMinimized', { windowId });
        }
    }

    /**
     * Restore minimized window
     */
    async restoreWindow(windowId) {
        const window = this.windows.get(windowId);
        if (window) {
            window.isMinimized = false;
            await this.storage.saveWindowState(windowId, window);
            this.bringToTop(windowId);
            this.emit('windowRestored', { windowId });
        }
    }

    /**
     * Maximize window
     */
    async maximizeWindow(windowId) {
        const window = this.windows.get(windowId);
        if (window) {
            window.isMaximized = true;
            window.x = 0;
            window.y = 0;
            window.width = window.innerWidth;
            window.height = window.innerHeight - 80;
            await this.storage.saveWindowState(windowId, window);
            this.emit('windowMaximized', { windowId });
        }
    }

    /**
     * Restore window size
     */
    async restoreWindowSize(windowId) {
        const window = this.windows.get(windowId);
        if (window && window.isMaximized) {
            window.isMaximized = false;
            // TODO: Restore to previous size
            await this.storage.saveWindowState(windowId, window);
            this.emit('windowRestored', { windowId });
        }
    }

    /**
     * Update window position
     */
    async updateWindowPosition(windowId, x, y) {
        const window = this.windows.get(windowId);
        if (window) {
            window.x = x;
            window.y = y;
            await this.storage.saveWindowState(windowId, window);
            this.emit('windowMoved', { windowId, x, y });
        }
    }

    /**
     * Update window size
     */
    async updateWindowSize(windowId, width, height) {
        const window = this.windows.get(windowId);
        if (window) {
            window.width = Math.max(400, width);
            window.height = Math.max(200, height);
            await this.storage.saveWindowState(windowId, window);
            this.emit('windowResized', { windowId, width: window.width, height: window.height });
        }
    }

    /**
     * Snap window to zone
     */
    async snapWindow(windowId, snapZone) {
        const window = this.windows.get(windowId);
        if (!window) return;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight - 80;

        const snapConfigs = {
            left: { x: 0, y: 0, width: viewportWidth / 2, height: viewportHeight },
            right: { x: viewportWidth / 2, y: 0, width: viewportWidth / 2, height: viewportHeight },
            topLeft: { x: 0, y: 0, width: viewportWidth / 2, height: viewportHeight / 2 },
            topRight: { x: viewportWidth / 2, y: 0, width: viewportWidth / 2, height: viewportHeight / 2 },
            bottomLeft: { x: 0, y: viewportHeight / 2, width: viewportWidth / 2, height: viewportHeight / 2 },
            bottomRight: { x: viewportWidth / 2, y: viewportHeight / 2, width: viewportWidth / 2, height: viewportHeight / 2 }
        };

        const config = snapConfigs[snapZone];
        if (config) {
            Object.assign(window, config);
            await this.storage.saveWindowState(windowId, window);
            this.emit('windowSnapped', { windowId, snapZone });
        }
    }

    /**
     * Load all windows from storage
     */
    async loadAllWindows() {
        const states = await this.storage.getAllWindowStates();
        for (const state of states) {
            this.windows.set(state.id, state);
            this.zIndexStack.push(state.id);
        }
        this.emit('windowsLoaded', { windows: Array.from(this.windows.keys()) });
    }

    /**
     * Get window state
     */
    getWindow(windowId) {
        return this.windows.get(windowId);
    }

    /**
     * Get all windows
     */
    getAllWindows() {
        return Array.from(this.windows.values());
    }

    /**
     * Get active window
     */
    getActiveWindow() {
        return this.windows.get(this.activeWindowId);
    }
}

export default WindowManager;
