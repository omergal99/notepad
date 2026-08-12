/**
 * WINDOW COMPONENT
 * Individual window instance DOM rendering and event handling.
 */

import { createElement, query, addClass, removeClass } from '../utils/domUtils.js';

export class WindowComponent {
    constructor(windowManager, windowId, windowState) {
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

        const titleBar = createElement('div', { class: ['window-title-bar'] });
        const titleText = createElement('div', {
            class: ['window-title-text'],
            text: this.windowState.title || 'Untitled'
        });

        const controls = createElement('div', { class: ['window-title-controls'] });
        const saveBtn = this._makeButton('Save', 'window-save-btn', 'Save', async () => {
            if (this.windowManager && typeof this.windowManager.saveWindowState === 'function') {
                await this.windowManager.saveWindowState(this.windowId);
            }
        });
        const deleteBtn = this._makeButton('Delete', 'window-delete-btn', 'Delete', async () => {
            if (this.windowManager && typeof this.windowManager.closeWindow === 'function') {
                await this.windowManager.closeWindow(this.windowId);
            }
        });
        const minimizeBtn = this._makeButton('_', 'window-minimize-btn', 'Minimize', () => this.windowManager.minimizeWindow(this.windowId));
        const maximizeBtn = this._makeButton('□', 'window-maximize-btn', 'Maximize / Restore', () => {
            if (this.windowState.isMaximized) {
                this.windowManager.restoreWindowSize(this.windowId);
            } else {
                this.windowManager.maximizeWindow(this.windowId);
            }
        });
        const closeBtn = this._makeButton('✕', 'window-close-btn', 'Close', () => this.windowManager.closeWindow(this.windowId));

        controls.append(saveBtn, deleteBtn, minimizeBtn, maximizeBtn, closeBtn);
        titleBar.append(titleText, controls);

        const content = createElement('div', { class: ['window-content'] });
        const menuBar = createElement('div', { class: ['window-menu-bar'], text: 'File Edit View Tools Help' });
        const editorWrapper = createElement('div', { class: ['editor-container'] });
        const editor = createElement('textarea', {
            class: ['window-editor'],
            attrs: { spellcheck: 'false' }
        });
        editor.value = this.windowState.content || '';
        editorWrapper.appendChild(editor);
        content.append(menuBar, editorWrapper);

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
}

export default WindowComponent;
