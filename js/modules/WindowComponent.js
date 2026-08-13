/**
 * WINDOW COMPONENT
 * Individual window instance DOM rendering and event handling.
 */

import { createElement, query, addClass, removeClass } from '../utils/domUtils.js';
import { EventEmitter } from '../utils/eventEmitter.js';

export class WindowComponent extends EventEmitter {
    constructor(windowManager, windowId, windowState) {
        super();
        this.windowManager = windowManager;
        this.windowId = windowId;
        this.windowState = windowState;
        this.domElement = null;
        this.isDragging = false;
        this.isResizing = false;
        this.dragStart = { x: 0, y: 0 };
        this.rafId = null;
    }

    _makeButton(label, className, title, onClick) {
        const button = createElement('button', {
            class: ['window-control-btn', className],
            text: label,
            attrs: { type: 'button', title }
        });
        button.addEventListener('click', onClick);
        return button;
    }

    render() {
        this.domElement = createElement('div', {
            class: ['window'],
            attrs: { 'data-window-id': this.windowId }
        });

        this.domElement.style.position = 'absolute';
        this.domElement.style.left = `${this.windowState.x}px`;
        this.domElement.style.top = `${this.windowState.y}px`;
        this.domElement.style.width = `${this.windowState.width}px`;
        this.domElement.style.height = `${this.windowState.height}px`;
        this.domElement.style.zIndex = String(this.windowState.zIndex || 1);

        // ===== BUILD TITLE BAR: [+ button] [title center] [save min max close] =====
        const titleBar = createElement('div', { class: ['window-title-bar'] });
        
        // LEFT: Add tab button
        const titleLeft = createElement('div', { class: ['window-title-left'] });
        const addTabBtn = createElement('button', {
            class: ['window-control-btn', 'tab-add-btn'],
            text: '+',
            attrs: { type: 'button', title: 'New Tab' }
        });
        addTabBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.emit('addTab');
        });
        titleLeft.appendChild(addTabBtn);
        
        // CENTER: Title text
        const titleText = createElement('div', {
            class: ['window-title-text'],
            text: this.windowState.title || 'Untitled'
        });
        titleLeft.appendChild(titleText);
        
        // RIGHT: Control buttons (Save, Delete, Minimize, Maximize, Close)
        const titleRight = createElement('div', { class: ['window-title-right'] });
        
        const saveBtn = this._makeButton('💾', 'window-save-btn', 'Save', async (e) => {
            e.stopPropagation();
            if (this.windowManager && typeof this.windowManager.saveWindowState === 'function') {
                await this.windowManager.saveWindowState(this.windowId);
            }
        });
        
        const minimizeBtn = this._makeButton('−', 'window-minimize-btn', 'Minimize', (e) => {
            e.stopPropagation();
            this.windowManager.minimizeWindow(this.windowId);
        });
        
        const maximizeBtn = this._makeButton('□', 'window-maximize-btn', 'Maximize', (e) => {
            e.stopPropagation();
            if (this.windowState.isMaximized) {
                this.windowManager.restoreWindowSize(this.windowId);
            } else {
                this.windowManager.maximizeWindow(this.windowId);
            }
        });
        
        const closeBtn = this._makeButton('✕', 'window-close-btn', 'Close', (e) => {
            e.stopPropagation();
            this.windowManager.closeWindow(this.windowId);
        });
        
        titleRight.append(saveBtn, minimizeBtn, maximizeBtn, closeBtn);
        titleBar.append(titleLeft, titleRight);

        const content = createElement('div', { class: ['window-content'] });
        
        // Create tab bar (removed menu bar, it's unnecessary)
        const tabBar = createElement('div', { class: ['tab-bar'] });
        tabBar.setAttribute('data-window-id', this.windowId);
        
        const editorWrapper = createElement('div', { class: ['editor-container'] });
        const editor = createElement('textarea', {
            class: ['window-editor'],
            attrs: { spellcheck: 'false' }
        });
        editor.value = this.windowState.content || '';
        editorWrapper.appendChild(editor);
        content.append(tabBar, editorWrapper);

        this.domElement.append(titleBar, content);
        this.addResizeHandles();
        this.attachEventListeners(titleBar);
        this.updateDOMPosition();

        return this.domElement;
    }

    addResizeHandles() {
        const handles = ['top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'];

        handles.forEach(position => {
            const handle = createElement('div', {
                class: ['resize-handle', position]
            });
            handle.addEventListener('pointerdown', (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.startResize(event, position);
            });
            this.domElement.appendChild(handle);
        });
    }

    attachEventListeners(titleBar) {
        titleBar.addEventListener('dblclick', () => {
            if (this.windowState.isMaximized) {
                this.windowManager.restoreWindowSize(this.windowId);
            } else {
                this.windowManager.maximizeWindow(this.windowId);
            }
        });

        titleBar.addEventListener('pointerdown', (event) => {
            if (event.target.closest('button')) {
                return;
            }
            this.startDrag(event);
        });

        this.domElement.addEventListener('pointerdown', () => {
            this.windowManager.bringToTop(this.windowId);
            this.setActive(true);
        });
    }

    startDrag(event) {
        if (this.windowState.isMaximized) return;

        this.isDragging = true;
        this.dragStart = {
            x: event.clientX,
            y: event.clientY,
            startX: this.windowState.x,
            startY: this.windowState.y
        };

        const applyMove = (moveEvent) => {
            if (!this.isDragging) return;
            if (this.rafId) return;

            this.rafId = requestAnimationFrame(() => {
                const deltaX = moveEvent.clientX - this.dragStart.x;
                const deltaY = moveEvent.clientY - this.dragStart.y;
                const nextX = this.dragStart.startX + deltaX;
                const nextY = this.dragStart.startY + deltaY;
                this.windowManager.updateWindowPosition(this.windowId, nextX, nextY);
                this.updateDOMPosition();
                this.rafId = null;
            });
        };

        const stopDrag = () => {
            this.isDragging = false;
            if (this.rafId) {
                cancelAnimationFrame(this.rafId);
                this.rafId = null;
            }
            document.removeEventListener('pointermove', applyMove);
            document.removeEventListener('pointerup', stopDrag);
            document.body.style.cursor = '';
            const textarea = query('.window-editor', this.domElement);
            if (textarea) textarea.style.pointerEvents = '';
        };

        document.addEventListener('pointermove', applyMove);
        document.addEventListener('pointerup', stopDrag);
        document.body.style.cursor = 'grabbing';
        const textarea = query('.window-editor', this.domElement);
        if (textarea) textarea.style.pointerEvents = 'none';
    }

    startResize(event, position) {
        this.isResizing = true;
        this.dragStart = {
            x: event.clientX,
            y: event.clientY,
            width: this.windowState.width,
            height: this.windowState.height
        };

        const applyMove = (moveEvent) => {
            if (!this.isResizing) return;
            if (this.rafId) return;

            this.rafId = requestAnimationFrame(() => {
                const deltaX = moveEvent.clientX - this.dragStart.x;
                const deltaY = moveEvent.clientY - this.dragStart.y;
                let nextWidth = this.dragStart.width;
                let nextHeight = this.dragStart.height;

                if (position.includes('right')) nextWidth += deltaX;
                if (position.includes('bottom')) nextHeight += deltaY;
                if (position.includes('left')) nextWidth -= deltaX;
                if (position.includes('top')) nextHeight -= deltaY;

                this.windowManager.updateWindowSize(this.windowId, nextWidth, nextHeight);
                this.updateDOMPosition();
                this.rafId = null;
            });
        };

        const stopResize = () => {
            this.isResizing = false;
            if (this.rafId) {
                cancelAnimationFrame(this.rafId);
                this.rafId = null;
            }
            document.removeEventListener('pointermove', applyMove);
            document.removeEventListener('pointerup', stopResize);
            const textarea = query('.window-editor', this.domElement);
            if (textarea) textarea.style.pointerEvents = '';
            document.body.style.cursor = '';
        };

        document.addEventListener('pointermove', applyMove);
        document.addEventListener('pointerup', stopResize);
        document.body.style.cursor = 'nwse-resize';
        const textarea = query('.window-editor', this.domElement);
        if (textarea) textarea.style.pointerEvents = 'none';
    }

    updateDOMPosition() {
        if (!this.domElement) return;
        const state = this.windowState || {};
        this.domElement.style.left = `${state.x ?? 0}px`;
        this.domElement.style.top = `${state.y ?? 0}px`;
        this.domElement.style.width = `${state.width ?? 800}px`;
        this.domElement.style.height = `${state.height ?? 600}px`;
        this.domElement.style.zIndex = String(state.zIndex || 1);
    }

    setActive(active) {
        if (!this.domElement) return;
        if (active) {
            addClass(this.domElement, 'active');
        } else {
            removeClass(this.domElement, 'active');
        }
    }

    setTitle(title) {
        this.windowState.title = title;
        const titleElement = query('.window-title-text', this.domElement);
        if (titleElement) {
            titleElement.textContent = title;
        }
    }

    destroy() {
        if (this.domElement && this.domElement.parentElement) {
            this.domElement.parentElement.removeChild(this.domElement);
        }
    }

    /**
     * Render tabs in the tab bar
     */
    renderTabs(tabs, activeTabId) {
        const tabBar = query('.tab-bar', this.domElement);
        if (!tabBar) return;

        // Find and remove all existing tab elements (keep the add button)
        const existingTabs = tabBar.querySelectorAll('.tab');
        existingTabs.forEach(tab => tab.remove());

        // Render each tab
        tabs.forEach(tab => {
            const tabElement = createElement('div', {
                class: ['tab'],
                attrs: { 'data-tab-id': tab.id }
            });

            if (tab.id === activeTabId) {
                addClass(tabElement, 'active');
            }

            if (tab.isDirty) {
                addClass(tabElement, 'tab-unsaved');
            }

            // Tab title
            const titleElement = createElement('div', {
                class: ['tab-title'],
                text: tab.title
            });

            // Close button
            const closeBtn = createElement('button', {
                class: ['tab-close'],
                text: '✕',
                attrs: { type: 'button', title: 'Close tab' }
            });

            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.emit('closeTab', { tabId: tab.id });
            });

            // Tab click to switch
            tabElement.addEventListener('click', () => {
                this.switchTab(tab.id);
            });

            tabElement.append(titleElement, closeBtn);
            tabBar.insertBefore(tabElement, tabBar.lastChild);
        });
    }

    /**
     * Switch to a different tab
     */
    switchTab(tabId) {
        this.emit('switchTab', { tabId });
    }

    /**
     * Update tab visual state
     */
    updateTabState(tabId, tab) {
        const tabElement = query(`[data-tab-id="${tabId}"]`, this.domElement);
        if (!tabElement) return;

        // Update active state
        const allTabs = query('.tab-bar', this.domElement).querySelectorAll('.tab');
        allTabs.forEach(t => removeClass(t, 'active'));
        if (tabElement) addClass(tabElement, 'active');

        // Update unsaved state
        if (tab.isDirty) {
            addClass(tabElement, 'tab-unsaved');
        } else {
            removeClass(tabElement, 'tab-unsaved');
        }

        // Update title
        const titleEl = query('.tab-title', tabElement);
        if (titleEl) {
            titleEl.textContent = tab.title;
        }
    }
}

export default WindowComponent;
