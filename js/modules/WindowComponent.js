/**
 * WINDOW COMPONENT
 * Individual window instance DOM rendering and event handling
 * Phase 3 implementation
 */

import { createElement, query, addListener, addClass, removeClass, toggle } from '../utils/domUtils.js';

export class WindowComponent {
    constructor(windowManager, windowId, windowState) {
        this.windowManager = windowManager;
        this.windowId = windowId;
        this.windowState = windowState;
        this.domElement = null;
        this.isDragging = false;
        this.isResizing = false;
        this.dragStart = { x: 0, y: 0 };
    }

    /**
     * Render window DOM
     */
    render() {
        this.domElement = createElement('div', {
            class: ['window'],
            attrs: { 'data-window-id': this.windowId }
        });

        // Title bar
        const titleBar = createElement('div', {
            class: ['window-title-bar']
        });

        // Title text
        const titleText = createElement('div', {
            class: ['window-title-text'],
            text: this.windowState.title
        });
        titleBar.appendChild(titleText);

        // Title bar buttons
        const controlsContainer = createElement('div', {
            class: ['window-title-right']
        });

        // Minimize button
        const btnMinimize = createElement('button', {
            class: ['window-control-btn'],
            text: '_',
            attrs: { title: 'Minimize' }
        });
        btnMinimize.addEventListener('click', () => this.windowManager.minimizeWindow(this.windowId));

        // Maximize button
        const btnMaximize = createElement('button', {
            class: ['window-control-btn'],
            text: '□',
            attrs: { title: 'Maximize' }
        });
        btnMaximize.addEventListener('click', () => {
            if (this.windowState.isMaximized) {
                this.windowManager.restoreWindowSize(this.windowId);
            } else {
                this.windowManager.maximizeWindow(this.windowId);
            }
        });

        // Close button
        const btnClose = createElement('button', {
            class: ['window-control-btn', 'btn-close'],
            text: '✕',
            attrs: { title: 'Close' }
        });
        btnClose.addEventListener('click', () => this.windowManager.closeWindow(this.windowId));

        controlsContainer.appendChild(btnMinimize);
        controlsContainer.appendChild(btnMaximize);
        controlsContainer.appendChild(btnClose);

        titleBar.appendChild(controlsContainer);

        // Content area
        const content = createElement('div', {
            class: ['window-content']
        });

        // Tab bar
        const tabBar = createElement('div', {
            class: ['tab-bar']
        });
        content.appendChild(tabBar);

        // Editor container
        const editorContainer = createElement('div', {
            class: ['editor-container']
        });
        content.appendChild(editorContainer);

        // Assemble window
        this.domElement.appendChild(titleBar);
        this.domElement.appendChild(content);

        // Add resize handles
        this.addResizeHandles();

        // Position window
        this.updateDOMPosition();

        // Attach event listeners
        this.attachEventListeners(titleBar);

        return this.domElement;
    }

    /**
     * Add resize handles to window
     */
    addResizeHandles() {
        const handles = ['top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'];
        
        handles.forEach(position => {
            const handle = createElement('div', {
                class: ['resize-handle', position]
            });
            
            handle.addEventListener('mousedown', (e) => {
                this.startResize(e, position);
            });
            
            this.domElement.appendChild(handle);
        });
    }

    /**
     * Attach event listeners
     */
    attachEventListeners(titleBar) {
        titleBar.addEventListener('mousedown', (e) => {
            if (e.target === titleBar || e.target.classList.contains('window-title-text')) {
                this.startDrag(e);
            }
        });

        this.domElement.addEventListener('click', () => {
            this.windowManager.bringToTop(this.windowId);
            addClass(this.domElement, 'active');
        });
    }

    /**
     * Start drag operation
     */
    startDrag(e) {
        this.isDragging = true;
        this.dragStart = { x: e.clientX, y: e.clientY };
        this.dragStart.windowX = this.windowState.x;
        this.dragStart.windowY = this.windowState.y;

        const handleMouseMove = (moveEvent) => {
            const deltaX = moveEvent.clientX - this.dragStart.x;
            const deltaY = moveEvent.clientY - this.dragStart.y;

            this.windowManager.updateWindowPosition(
                this.windowId,
                this.dragStart.windowX + deltaX,
                this.dragStart.windowY + deltaY
            );

            this.updateDOMPosition();
        };

        const handleMouseUp = () => {
            this.isDragging = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }

    /**
     * Start resize operation
     */
    startResize(e, position) {
        this.isResizing = true;
        this.dragStart = { x: e.clientX, y: e.clientY };
        this.dragStart.width = this.windowState.width;
        this.dragStart.height = this.windowState.height;

        const handleMouseMove = (moveEvent) => {
            const deltaX = moveEvent.clientX - this.dragStart.x;
            const deltaY = moveEvent.clientY - this.dragStart.y;

            let newWidth = this.dragStart.width;
            let newHeight = this.dragStart.height;

            if (position.includes('right')) newWidth += deltaX;
            if (position.includes('bottom')) newHeight += deltaY;
            if (position.includes('left')) newWidth -= deltaX;
            if (position.includes('top')) newHeight -= deltaY;

            this.windowManager.updateWindowSize(this.windowId, newWidth, newHeight);
            this.updateDOMPosition();
        };

        const handleMouseUp = () => {
            this.isResizing = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }

    /**
     * Update DOM position and size
     */
    updateDOMPosition() {
        if (!this.domElement) return;

        this.domElement.style.left = `${this.windowState.x}px`;
        this.domElement.style.top = `${this.windowState.y}px`;
        this.domElement.style.width = `${this.windowState.width}px`;
        this.domElement.style.height = `${this.windowState.height}px`;
        this.domElement.style.zIndex = 100;
    }

    /**
     * Set active state
     */
    setActive(active) {
        if (active) {
            addClass(this.domElement, 'active');
        } else {
            removeClass(this.domElement, 'active');
        }
    }

    /**
     * Update window title
     */
    setTitle(title) {
        this.windowState.title = title;
        const titleElement = query('.window-title-text', this.domElement);
        if (titleElement) {
            titleElement.textContent = title;
        }
    }

    /**
     * Destroy window component
     */
    destroy() {
        if (this.domElement && this.domElement.parentElement) {
            this.domElement.parentElement.removeChild(this.domElement);
        }
    }
}

export default WindowComponent;
