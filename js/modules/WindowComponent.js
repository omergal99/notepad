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

    _createIcon(iconName) {
        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        icon.classList.add('button-icon');
        icon.setAttribute('viewBox', '0 0 24 24');
        icon.setAttribute('aria-hidden', 'true');
        use.setAttribute('href', `assets/icons.svg#${iconName}`);
        icon.appendChild(use);
        return icon;
    }

    _makeButton(iconName, className, title, onClick) {
        const button = createElement('button', {
            class: ['window-control-btn', className],
            attrs: { type: 'button', title, 'aria-label': title }
        });
        button.appendChild(this._createIcon(iconName));
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
            attrs: { type: 'button', title: 'Open file', 'aria-label': 'Open file' }
        });
        openBtn.appendChild(this._createIcon('open'));
        
        const openDropdown = createElement('div', { class: ['open-dropdown'] });
        
        openBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openDropdown.classList.toggle('show');
        });

        document.addEventListener('pointerdown', (event) => {
            if (!openBtnContainer.contains(event.target)) {
                openDropdown.classList.remove('show');
            }
        });

        openBtnContainer.appendChild(openBtn);
        openBtnContainer.appendChild(openDropdown);
        titleLeft.appendChild(openBtnContainer);

        const addTabBtn = createElement('button', {
            class: ['window-control-btn', 'tab-add-btn'],
            attrs: { type: 'button', title: 'New tab', 'aria-label': 'New tab' }
        });
        addTabBtn.appendChild(this._createIcon('new-tab'));
        addTabBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.emit('addTab');
        });
        titleLeft.appendChild(addTabBtn);
        titleLeft.appendChild(this.createWindowMenu());
        
        // CENTER: Title text with save status
        const titleCenter = createElement('div', { class: ['window-title-center'] });
        const titleText = createElement('div', {
            class: ['window-title-text'],
            text: this.windowState.title || 'Untitled'
        });
        titleCenter.appendChild(titleText);
        
        // RIGHT: Window commands
        const titleRight = createElement('div', { class: ['window-title-right'] });
        
        this.saveBtn = this._makeButton('save', 'window-save-btn', 'Save', (e) => {
            e.stopPropagation();
            this.emit('save');
        });
        
        const minimizeBtn = this._makeButton('minimize', 'window-minimize-btn', 'Minimize', (e) => {
            e.stopPropagation();
            this.windowManager.minimizeWindow(this.windowId);
        });
        
        // Store reference so its label changes with the window state.
        this.maximizeBtn = this._makeButton(
            this.windowState?.isMaximized ? 'restore' : 'maximize',
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
        
        const closeBtn = this._makeButton('close', 'window-close-btn', 'Close', (e) => {
            e.stopPropagation();
            this.emit('requestClose');
        });
        
        titleRight.append(this.saveBtn, minimizeBtn, this.maximizeBtn, closeBtn);
        titleBar.append(titleLeft, titleCenter, titleRight);

        const content = createElement('div', { class: ['window-content'] });
        
        // Create tab bar
        const tabBar = createElement('div', { class: ['tab-bar'] });
        tabBar.setAttribute('data-window-id', this.windowId);
        
        content.appendChild(tabBar);
        this.domElement.append(titleBar, content);
        this.addResizeHandles();
        this.attachEventListeners(titleBar, titleText);
        this.updateDOMPosition();

        return this.domElement;
    }

    createWindowMenu() {
        const menuBar = createElement('div', { class: ['window-menu-bar'] });
        const menus = [
            ['File', [['New Window', 'newWindow'], ['New Tab', 'newTab'], ['Save', 'save'], ['Save All', 'saveAll'], ['Exit', 'exit']]],
            ['Edit', [['Undo', 'undo'], ['Redo', 'redo'], ['Find', 'find'], ['Replace', 'replace']]],
            ['View', [['Line Numbers', 'toggleLineNumbers'], ['Minimap', 'toggleMinimap'], ['Status Bar', 'toggleStatusBar'], ['Zoom In', 'zoomIn'], ['Zoom Out', 'zoomOut'], ['Reset Zoom', 'resetZoom']]],
            ['Tools', [['Export', 'export'], ['Print', 'print'], ['Preferences', 'preferences']]],
            ['Help', [['About', 'about'], ['Documentation', 'documentation']]]
        ];

        menus.forEach(([label, actions]) => {
            const item = createElement('div', { class: ['window-menu-item'] });
            const button = createElement('button', { text: label, attrs: { type: 'button' } });
            const dropdown = createElement('div', { class: ['window-menu-dropdown'] });
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                menuBar.querySelectorAll('.window-menu-dropdown.visible').forEach(menu => {
                    if (menu !== dropdown) removeClass(menu, 'visible');
                });
                dropdown.classList.toggle('visible');
            });
            actions.forEach(([actionLabel, action]) => {
                const actionButton = createElement('button', { text: actionLabel, attrs: { type: 'button' } });
                actionButton.addEventListener('click', () => {
                    removeClass(dropdown, 'visible');
                    this.emit('menuAction', { action });
                });
                dropdown.appendChild(actionButton);
            });
            item.append(button, dropdown);
            menuBar.appendChild(item);
        });

        document.addEventListener('pointerdown', (event) => {
            if (!menuBar.contains(event.target)) {
                menuBar.querySelectorAll('.window-menu-dropdown.visible').forEach(menu => removeClass(menu, 'visible'));
            }
        });
        return menuBar;
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

    indicateSaved() {
        if (!this.saveBtn) return;
        this.saveBtn.classList.add('is-saved');
        this.saveBtn.title = 'Saved';
        this.saveBtn.setAttribute('aria-label', 'Saved');
        this.saveBtn.replaceChildren(this._createIcon('check'));
        clearTimeout(this.saveFeedbackTimer);
        this.saveFeedbackTimer = setTimeout(() => {
            this.saveBtn.classList.remove('is-saved');
            this.saveBtn.title = 'Save';
            this.saveBtn.setAttribute('aria-label', 'Save');
            this.saveBtn.replaceChildren(this._createIcon('save'));
        }, 1800);
    }

    /**
     * Update maximize button label based on maximized state.
     */
    updateMaximizeButton() {
        if (this.maximizeBtn && this.windowState) {
            if (this.windowState.isMaximized) {
                this.maximizeBtn.replaceChildren(this._createIcon('restore'));
                this.maximizeBtn.title = 'Restore';
            } else {
                this.maximizeBtn.replaceChildren(this._createIcon('maximize'));
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
                const titleBar = query('.window-title-bar', this.domElement);
                const titleBarHeight = titleBar ? titleBar.offsetHeight : 40;

                this.windowManager.updateWindowPosition(this.windowId, nextX, nextY, {
                    allowTitleBarOverflow: true,
                    titleBarHeight
                });
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

        const tabList = Array.isArray(tabs) ? tabs : [];

        if (tabList.length <= 1) {
            tabBar.style.display = 'none';
        } else {
            tabBar.style.display = 'flex';
        }

        const existingTabs = new Map(
            Array.from(tabBar.querySelectorAll('.tab')).map(tabElement => [tabElement.getAttribute('data-tab-id'), tabElement])
        );
        const liveTabIds = new Set();

        tabList.forEach(tab => {
            liveTabIds.add(tab.id);

            let tabElement = existingTabs.get(tab.id);
            if (!tabElement) {
                tabElement = createElement('div', {
                    class: ['tab'],
                    attrs: { 'data-tab-id': tab.id }
                });

                const titleElement = createElement('div', {
                    class: ['tab-title'],
                    text: tab.title
                });

                titleElement.addEventListener('dblclick', (e) => {
                    e.stopPropagation();
                    this.startTabRename(titleElement, tab.id);
                });

                const saveIndicator = createElement('div', {
                    class: ['tab-save-indicator']
                });

                const closeBtn = createElement('button', {
                    class: ['tab-close'],
                    attrs: { type: 'button', title: 'Close tab', 'aria-label': 'Close tab' }
                });
                closeBtn.appendChild(this._createIcon('close'));

                closeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.emit('closeTab', { tabId: tab.id });
                });

                tabElement.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showTabContextMenu(tabElement, tab.id);
                });

                tabElement.addEventListener('click', () => {
                    if (tab.id !== activeTabId) {
                        this.switchTab(tab.id);
                    }
                });

                tabElement.append(titleElement, saveIndicator, closeBtn);
                tabBar.appendChild(tabElement);
                existingTabs.set(tab.id, tabElement);
            }

            const titleElement = query('.tab-title', tabElement);
            if (titleElement) {
                titleElement.textContent = tab.title;
            }

            const saveIndicator = query('.tab-save-indicator', tabElement);
            if (saveIndicator) {
                saveIndicator.classList.toggle('saved', !tab.isDirty);
            }

            tabElement.classList.toggle('active', tab.id === activeTabId);
            tabElement.classList.toggle('tab-unsaved', Boolean(tab.isDirty));
        });

        Array.from(tabBar.querySelectorAll('.tab')).forEach(tabElement => {
            const tabId = tabElement.getAttribute('data-tab-id');
            if (!liveTabIds.has(tabId)) {
                tabElement.remove();
            }
        });
    }

    /**
     * Switch to a different tab
     */
    switchTab(tabId) {
        this.emit('switchTab', { tabId });
    }

    showTabContextMenu(tabElement, tabId) {
        const activeMenu = this.domElement.querySelector('.tab-context-menu');
        if (activeMenu) activeMenu.remove();

        const menu = createElement('div', { class: ['tab-context-menu'] });
        const rename = createElement('button', { text: 'Rename', attrs: { type: 'button' } });
        const save = createElement('button', { text: 'Save', attrs: { type: 'button' } });

        rename.addEventListener('click', () => {
            const title = query('.tab-title', tabElement);
            if (title) this.startTabRename(title, tabId);
            menu.remove();
        });
        save.addEventListener('click', () => {
            this.emit('saveTab', { tabId });
            menu.remove();
        });

        menu.append(rename, save);
        this.domElement.appendChild(menu);

        const tabRect = tabElement.getBoundingClientRect();
        const windowRect = this.domElement.getBoundingClientRect();
        menu.style.left = `${tabRect.left - windowRect.left}px`;
        menu.style.top = `${tabRect.bottom - windowRect.top + 2}px`;

        setTimeout(() => {
            document.addEventListener('pointerdown', (event) => {
                if (!menu.contains(event.target)) {
                    menu.remove();
                }
            }, { once: true });
        }, 0);
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
