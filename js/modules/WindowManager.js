/**
 * WINDOW MANAGER
 * Manages floating window lifecycle, z-index stacking, positioning, and snapping.
 */

import { EventEmitter } from '../utils/eventEmitter.js';

const DEFAULT_VIEWPORT = { width: 1200, height: 800 };

function getViewport() {
    if (typeof window !== 'undefined') {
        return { width: window.innerWidth || DEFAULT_VIEWPORT.width, height: window.innerHeight || DEFAULT_VIEWPORT.height };
    }
    return DEFAULT_VIEWPORT;
}

function createId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `window-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export class WindowManager extends EventEmitter {
    constructor(storage) {
        super();
        this.storage = storage || {};
        this.windows = new Map();
        this.activeWindowId = null;
        this.zIndexStack = [];
        this.minimizedWindowIds = [];
        this.snapZones = {
            left: true,
            right: true,
            topLeft: true,
            topRight: true,
            bottomLeft: true,
            bottomRight: true
        };
    }

    _viewport() {
        return getViewport();
    }

    _clampWindow(state) {
        const viewport = this._viewport();
        const minWidth = 400;
        const minHeight = 200;
        const maxWidth = Math.min(viewport.width, viewport.width);
        const maxHeight = Math.min(viewport.height, viewport.height);

        const next = { ...state };
        next.width = Math.min(Math.max(Number(next.width) || minWidth, minWidth), maxWidth);
        next.height = Math.min(Math.max(Number(next.height) || minHeight, minHeight), maxHeight);
        next.x = Math.min(Math.max(Number(next.x) || 0, 0), Math.max(0, viewport.width - next.width));
        next.y = Math.min(Math.max(Number(next.y) || 0, 0), Math.max(0, viewport.height - next.height));

        next.zIndex = Number(next.zIndex) || 1;
        return next;
    }

    async _persistWindow(windowState) {
        if (!windowState || !this.storage) return;
        if (typeof this.storage.saveWindowState === 'function') {
            const saveTarget = this.storage.saveWindowState.length >= 2 ? [windowState.id, windowState] : [windowState];
            await this.storage.saveWindowState(...saveTarget);
        }
    }

    async _deletePersistedWindow(windowId) {
        if (!this.storage || typeof this.storage.deleteWindowState !== 'function') return;
        await this.storage.deleteWindowState(windowId);
    }

    _refreshZIndexes() {
        this.zIndexStack.forEach((id, index) => {
            const windowState = this.windows.get(id);
            if (windowState) {
                windowState.zIndex = index + 1;
            }
        });
    }

    _syncMinimizedList(windowId, isMinimized) {
        if (isMinimized) {
            if (!this.minimizedWindowIds.includes(windowId)) {
                this.minimizedWindowIds.push(windowId);
            }
        } else {
            this.minimizedWindowIds = this.minimizedWindowIds.filter(id => id !== windowId);
        }
    }

    async createWindow(options = {}) {
        const viewport = this._viewport();
        const width = Math.max(400, Math.min(Number(options.width) || viewport.width * 0.75, viewport.width));
        const height = Math.max(200, Math.min(Number(options.height) || viewport.height * 0.75, viewport.height));
        const x = Number(options.x) || (viewport.width - width) / 2;
        const y = Number(options.y) || (viewport.height - height) / 2;

        const windowId = createId();
        const windowState = this._clampWindow({
            id: windowId,
            title: options.title || `Untitled document ${this.windows.size + 1}`,
            x,
            y,
            width,
            height,
            isMinimized: false,
            isMaximized: false,
            prevWidth: width,
            prevHeight: height,
            prevX: x,
            prevY: y,
            tabs: [],
            activeTabId: null,
            createdAt: new Date().toISOString(),
            zIndex: 1
        });

        this.windows.set(windowId, windowState);
        this.zIndexStack.push(windowId);
        this.activeWindowId = windowId;
        this._refreshZIndexes();
        this._syncMinimizedList(windowId, false);

        await this._persistWindow(windowState);
        this.emit('windowCreated', { windowId, windowState });
        return windowId;
    }

    async closeWindow(windowId) {
        if (!this.windows.has(windowId)) return;

        this.windows.delete(windowId);
        this.zIndexStack = this.zIndexStack.filter(id => id !== windowId);
        this.minimizedWindowIds = this.minimizedWindowIds.filter(id => id !== windowId);

        if (this.activeWindowId === windowId) {
            this.activeWindowId = this.zIndexStack[this.zIndexStack.length - 1] || null;
        }

        this._refreshZIndexes();
        await this._deletePersistedWindow(windowId);
        this.emit('windowClosed', { windowId });
    }

    bringToTop(windowId) {
        if (!this.windows.has(windowId)) return;

        this.zIndexStack = this.zIndexStack.filter(id => id !== windowId);
        this.zIndexStack.push(windowId);
        this.activeWindowId = windowId;
        this._refreshZIndexes();
        this.emit('windowFocused', { windowId });
    }

    getMinimizedWindows() {
        return [...this.minimizedWindowIds];
    }

    async minimizeWindow(windowId) {
        const window = this.windows.get(windowId);
        if (!window) return;

        window.isMinimized = true;
        this._syncMinimizedList(windowId, true);
        this.emit('windowMinimized', { windowId });
        await this._persistWindow(window);
    }

    async restoreWindow(windowId) {
        const window = this.windows.get(windowId);
        if (!window) return;

        window.isMinimized = false;
        this._syncMinimizedList(windowId, false);
        this.bringToTop(windowId);
        this.emit('windowRestored', { windowId });
        await this._persistWindow(window);
    }

    async maximizeWindow(windowId) {
        const window = this.windows.get(windowId);
        if (!window) return;

        const viewport = this._viewport();
        window.prevX = window.x;
        window.prevY = window.y;
        window.prevWidth = window.width;
        window.prevHeight = window.height;
        window.isMaximized = true;
        window.x = 0;
        window.y = 0;
        window.width = viewport.width;
        window.height = viewport.height - 80;

        await this._persistWindow(window);
        this.emit('windowMaximized', { windowId });
    }

    async restoreWindowSize(windowId) {
        const window = this.windows.get(windowId);
        if (!window) return;

        if (!window.isMaximized) {
            return;
        }

        window.isMaximized = false;
        window.x = Number.isFinite(window.prevX) ? window.prevX : 0;
        window.y = Number.isFinite(window.prevY) ? window.prevY : 0;
        window.width = Number.isFinite(window.prevWidth) ? Math.max(400, window.prevWidth) : 800;
        window.height = Number.isFinite(window.prevHeight) ? Math.max(200, window.prevHeight) : 600;
        const clamped = this._clampWindow(window);
        Object.assign(window, clamped);

        await this._persistWindow(window);
        this.emit('windowRestored', { windowId });
    }

    async updateWindowPosition(windowId, x, y) {
        const window = this.windows.get(windowId);
        if (!window) return;

        const clamped = this._clampWindow({ ...window, x, y });
        Object.assign(window, clamped);
        await this._persistWindow(window);
        this.emit('windowMoved', { windowId, x: window.x, y: window.y });
    }

    async updateWindowSize(windowId, width, height) {
        const window = this.windows.get(windowId);
        if (!window) return;

        const nextState = this._clampWindow({ ...window, width, height });
        Object.assign(window, nextState);
        await this._persistWindow(window);
        this.emit('windowResized', { windowId, width: window.width, height: window.height });
    }

    async snapWindow(windowId, snapZone) {
        const window = this.windows.get(windowId);
        if (!window) return;

        const viewport = this._viewport();
        const width = viewport.width;
        const height = viewport.height;
        const halfWidth = width / 2;
        const halfHeight = height / 2;

        const snapConfigs = {
            left: { x: 0, y: 0, width: halfWidth, height },
            right: { x: halfWidth, y: 0, width: halfWidth, height },
            topLeft: { x: 0, y: 0, width: halfWidth, height: halfHeight },
            topRight: { x: halfWidth, y: 0, width: halfWidth, height: halfHeight },
            bottomLeft: { x: 0, y: halfHeight, width: halfWidth, height: halfHeight },
            bottomRight: { x: halfWidth, y: halfHeight, width: halfWidth, height: halfHeight }
        };

        const config = snapConfigs[snapZone];
        if (!config) return;

        window.isMaximized = false;
        const snapped = this._clampWindow({ ...window, ...config });
        Object.assign(window, snapped);
        this.emit('windowSnapped', { windowId, snapZone });
        await this._persistWindow(window);
    }

    async loadAllWindows() {
        const storageStates = this.storage && typeof this.storage.getAllWindowStates === 'function'
            ? await this.storage.getAllWindowStates()
            : [];

        storageStates.forEach(state => {
            if (!state || !state.id) return;
            const normalized = this._clampWindow(state);
            this.windows.set(state.id, normalized);
            if (!this.zIndexStack.includes(state.id)) {
                this.zIndexStack.push(state.id);
            }
        });

        this._refreshZIndexes();
        if (this.zIndexStack.length > 0) {
            this.activeWindowId = this.zIndexStack[this.zIndexStack.length - 1];
        }
        this.emit('windowsLoaded', { windows: Array.from(this.windows.keys()) });
    }

    getWindow(windowId) {
        return this.windows.get(windowId);
    }

    getAllWindows() {
        return Array.from(this.windows.values());
    }

    getActiveWindow() {
        return this.windows.get(this.activeWindowId);
    }
}

export default WindowManager;
