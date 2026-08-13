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

    /**
     * Generate a unique color for this window in dark mode
     */
    generateWindowColor() {
        const colors = ['#4A5568', '#3A6B6B', '#5A4A68', '#68563A', '#3A4A68', '#683A4A'];
        // Use window ID to consistently generate the same color
        const hash = this.windowId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
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

        // Generate unique color for this window if not set
        if (!this.windowState.titlebarColor) {
            this.windowState.titlebarColor = this.generateWindowColor();
        }
        this.domElement.setAttribute('data-color', this.windowState.titlebarColor);

        // ===== BUILD TITLE BAR: [+ button] [title center with status] [save min max close] =====
        const titleBar = createElement('div', { class: ['window-title-bar'] });
        
        // LEFT: Open documents, then create a new tab
        const titleLeft = createElement('div', { class: ['window-title-left'] });
        const openBtnContainer = createElement('div', { class: ['open-btn-container'] });
        const openBtn = createElement('button', {
            class: ['window-control-btn', 'open-btn'],
            text: 'Open',
            attrs: { type: 'button', title: 'Open File' }
        });
        
        const openDropdown = createElement('div', { class: ['open-dropdown'] });
        
        openBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openDropdown.classList.toggle('show');
        });

        openBtnContainer.appendChild(openBtn);
        openBtnContainer.appendChild(openDropdown);
        titleLeft.appendChild(openBtnContainer);

        const addTabBtn = createElement('button', {
            class: ['window-control-btn', 'tab-add-btn'],
            text: 'New Tab',
            attrs: { type: 'button', title: 'New Tab' }
        });
        addTabBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.emit('addTab');
        });
        titleLeft.appendChild(addTabBtn);
        
        // CENTER: Title text with save status
        const titleCenter = createElement('div', { class: ['window-title-center'] });
        const titleText = createElement('div', {
            class: ['window-title-text'],
            text: this.windowState.title || 'Untitled'
        });
        titleCenter.appendChild(titleText);
        titleLeft.appendChild(titleCenter);
        
        // RIGHT: Window commands
        const titleRight = createElement('div', { class: ['window-title-right'] });
        
        const saveBtn = this._makeButton('Save', 'window-save-btn', 'Save', (e) => {
            e.stopPropagation();
            this.emit('save');
        });
        
        const minimizeBtn = this._makeButton('Minimize', 'window-minimize-btn', 'Minimize', (e) => {
            e.stopPropagation();
            this.windowManager.minimizeWindow(this.windowId);
        });
        
        // Store reference so its label changes with the window state.
        this.maximizeBtn = this._makeButton(
            this.windowState?.isMaximized ? 'Restore' : 'Maximize',
            'window-maximize-btn',
            this.windowState?.isMaximized ? 'Restore' : 'Maximize',
            (e) => {
                e.stopPropagation();
                if (this.windowState?.isMaximized) {
                    this.windowManager.restoreWindowSize(this.windowId);
                } else {
                    this.windowManager.maximizeWindow(this.windowId);
                }
            }
        );
        
        const closeBtn = this._makeButton('Close', 'window-close-btn', 'Close', (e) => {
            e.stopPropagation();
            if (confirm('Close this window?')) {
                this.windowManager.closeWindow(this.windowId);
            }
        });
        
        titleRight.append(saveBtn, minimizeBtn, this.maximizeBtn, closeBtn);
        titleBar.append(titleLeft, titleRight);

        const content = createElement('div', { class: ['window-content'] });
        
        // Create tab bar
        const tabBar = createElement('div', { class: ['tab-bar'] });
        tabBar.setAttribute('data-window-id', this.windowId);
        
        // Editor container - will be filled by app.js with EditorComponent instances
        const editorContainer = createElement('div', { class: ['editor-container'] });
        editorContainer.style.flex = '1';
        editorContainer.style.overflow = 'hidden';
        editorContainer.style.position = 'relative';
        editorContainer.setAttribute('data-window-id', this.windowId);
        
        content.append(tabBar, editorContainer);
        this.domElement.append(titleBar, content);
        this.addResizeHandles();
        this.attachEventListeners(titleBar, titleText);
        this.updateDOMPosition();

        return this.domElement;
    }

    /**
     * Update save status indicator
     */
    updateSaveStatus(isSaved) {
        if (this.saveIndicator) {
            if (isSaved) {
                this.saveIndicator.classList.add('saved');
            } else {
                this.saveIndicator.classList.remove('saved');
            }
        }
    }

    /**
     * Update maximize button label based on maximized state.
     */
    updateMaximizeButton() {
        if (this.maximizeBtn && this.windowState) {
            if (this.windowState.isMaximized) {
                this.maximizeBtn.textContent = 'Restore';
                this.maximizeBtn.title = 'Restore';
            } else {
                this.maximizeBtn.textContent = 'Maximize';
                this.maximizeBtn.title = 'Maximize';
            }
        }
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

    attachEventListeners(titleBar, titleText) {
        // Double-click title to rename
        if (titleText) {
            titleText.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                this.startRename(titleText);
            });
        }

        // Only start drag when clicking title bar outside buttons and title text
        titleBar.addEventListener('pointerdown', (event) => {
            if (event.target.closest('button') || event.target.closest('.window-title-text') || event.target.closest('.window-title-status')) {
                return;
            }
            this.startDrag(event);
        });

        this.domElement.addEventListener('pointerdown', () => {
            this.windowManager.bringToTop(this.windowId);
            this.setActive(true);
        });
    }

    startRename(titleElement) {
        const currentTitle = titleElement.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentTitle;
        input.className = 'window-title-input';
        input.style.flex = '1';
        input.style.padding = '0 4px';
        input.style.border = '1px solid #0078D4';
        input.style.borderRadius = '2px';
        input.style.fontWeight = '500';
        input.style.fontSize = '13px';
        input.style.color = '#333';

        titleElement.replaceWith(input);
        input.focus();
        input.select();

        const finishRename = () => {
            const newTitle = input.value.trim() || currentTitle;
            this.setTitle(newTitle);
            input.replaceWith(titleElement);
            titleElement.textContent = newTitle;
        };

        input.addEventListener('blur', finishRename);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') finishRename();
            if (e.key === 'Escape') {
                input.replaceWith(titleElement);
            }
        });
    }

    /**
     * Start editing a tab title
     */
    startTabRename(titleElement, tabId) {
        const currentTitle = titleElement.textContent;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentTitle;
        input.className = 'tab-title-input';
        input.style.padding = '0 2px';
        input.style.border = '1px solid #0078D4';
        input.style.borderRadius = '2px';
        input.style.fontSize = '12px';
        input.style.backgroundColor = '#FFF';
        input.style.color = '#333';
        input.style.flex = '1';
        input.style.minWidth = '50px';

        titleElement.replaceWith(input);
        input.focus();
        input.select();

        const finishRename = () => {
            const newTitle = input.value.trim() || currentTitle;
            this.emit('tabRenamed', { tabId, newTitle });
            input.replaceWith(titleElement);
            titleElement.textContent = newTitle;
        };

        input.addEventListener('blur', finishRename);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') finishRename();
            if (e.key === 'Escape') {
                input.replaceWith(titleElement);
            }
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

        // Hide tab bar if only one tab
        if (tabs.length <= 1) {
            tabBar.style.display = 'none';
        } else {
            tabBar.style.display = 'flex';
        }

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

            // Tab title - double-click to rename
            const titleElement = createElement('div', {
                class: ['tab-title'],
                text: tab.title
            });

            titleElement.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                this.startTabRename(titleElement, tab.id);
            });

            // Save indicator dot
            const saveIndicator = createElement('div', {
                class: ['tab-save-indicator']
            });
            if (!tab.isDirty) {
                saveIndicator.classList.add('saved');
            }

            // Close button
            const closeBtn = createElement('button', {
                class: ['tab-close'],
                text: 'Close',
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

            tabElement.append(titleElement, saveIndicator, closeBtn);
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

    /**
     * Populate recent files dropdown
     */
    populateRecentFiles(recentFiles) {
        const dropdown = this.domElement?.querySelector('.open-dropdown');
        if (!dropdown) return;

        dropdown.innerHTML = '';

        if (recentFiles && recentFiles.length > 0) {
            recentFiles.forEach(file => {
                const option = document.createElement('div');
                option.className = 'open-dropdown-item';
                option.textContent = file.name || 'Untitled';
                option.title = file.name;
                option.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.emit('openRecentFile', { fileId: file.id });
                    dropdown.classList.remove('show');
                });
                dropdown.appendChild(option);
            });

            const separator = document.createElement('div');
            separator.className = 'open-dropdown-separator';
            dropdown.appendChild(separator);
        }

        const importOption = document.createElement('div');
        importOption.className = 'open-dropdown-item import-option';
        importOption.textContent = 'Import from Computer';
        importOption.addEventListener('click', (e) => {
            e.stopPropagation();
            this.emit('importFile');
            dropdown.classList.remove('show');
        });
        dropdown.appendChild(importOption);
    }
}

export default WindowComponent;
