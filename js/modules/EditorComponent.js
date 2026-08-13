/**
 * EDITOR COMPONENT
 * Text editor core, line numbering, caret tracking, word wrap
 * Phase 4 implementation
 */

import { EventEmitter } from '../utils/eventEmitter.js';
import { createElement, query } from '../utils/domUtils.js';

export class EditorComponent extends EventEmitter {
    constructor(tabManager, tabId) {
        super();
        this.tabManager = tabManager;
        this.tabId = tabId;
        this.domElement = null;
        this.textareaElement = null;
        this.lineNumbersElement = null;
        this.statusBarElement = null;
        this.minimapElement = null;
        this.highlightedLine = -1;
    }

    /**
     * Render editor DOM
     */
    render(container) {
        const tab = this.tabManager.getTab(this.tabId);
        if (!tab) return null;

        this.domElement = createElement('div', {
            class: ['editor'],
            attrs: { 'data-tab-id': this.tabId }
        });

        // Hidden by default, shown when active
        this.domElement.style.display = 'none';

        // Editor inner container
        const innerContainer = createElement('div', {
            class: ['editor-inner']
        });

        // Line numbers gutter
        this.lineNumbersElement = createElement('div', {
            class: ['line-numbers']
        });
        if (tab.preferences.lineNumbers) {
            this.lineNumbersElement.classList.add('visible');
        }

        // Textarea wrapper
        const textareaWrapper = createElement('div', {
            class: ['editor-textarea-wrapper']
        });

        // Textarea
        this.textareaElement = createElement('textarea', {
            class: ['editor-textarea'],
            attrs: {
                'spellcheck': 'false',
                'autocomplete': 'off',
                'autocorrect': 'off',
                'autocapitalize': 'off'
            }
        });

        // Set initial content and preferences
        this.textareaElement.value = tab.content;
        this.applyPreferences(tab.preferences);

        // Right margin guide
        const rightMargin = createElement('div', {
            class: ['right-margin']
        });
        if (tab.preferences.showRightMargin) {
            rightMargin.classList.add('visible');
        }

        textareaWrapper.appendChild(this.textareaElement);
        textareaWrapper.appendChild(rightMargin);

        // Minimap
        this.minimapElement = createElement('div', {
            class: ['minimap']
        });
        if (tab.preferences.minimap) {
            this.minimapElement.classList.add('visible');
        }

        innerContainer.appendChild(this.lineNumbersElement);
        innerContainer.appendChild(textareaWrapper);
        innerContainer.appendChild(this.minimapElement);

        // Status bar
        this.statusBarElement = createElement('div', {
            class: ['status-bar']
        });
        if (tab.preferences.statusBar) {
            this.statusBarElement.classList.add('visible');
        }

        this.updateStatusBar();

        this.domElement.appendChild(innerContainer);
        this.domElement.appendChild(this.statusBarElement);

        // Attach event listeners
        this.attachEventListeners();

        if (container) {
            container.appendChild(this.domElement);
        }

        return this.domElement;
    }

    /**
     * Apply preferences to editor
     */
    applyPreferences(preferences) {
        if (!this.textareaElement) return;

        this.textareaElement.style.fontFamily = preferences.fontFamily;
        this.textareaElement.style.fontSize = `${preferences.fontSize}px`;
        this.textareaElement.style.color = preferences.textColor;
        this.textareaElement.style.backgroundColor = preferences.backgroundColor;
        this.textareaElement.style.tabSize = preferences.tabWidth;

        // Text wrapping
        if (preferences.textWrap) {
            this.textareaElement.classList.remove('no-wrap');
            this.textareaElement.classList.add('word-wrap');
        } else {
            this.textareaElement.classList.add('no-wrap');
            this.textareaElement.classList.remove('word-wrap');
        }
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        if (!this.textareaElement) return;

        this.textareaElement.addEventListener('input', () => {
            this.tabManager.updateTabContent(this.tabId, this.textareaElement.value);
            this.updateLineNumbers();
            this.updateStatusBar();
            this.emit('contentChanged', { tabId: this.tabId, content: this.textareaElement.value });
        });

        this.textareaElement.addEventListener('keydown', (e) => {
            this.handleKeydown(e);
        });

        this.textareaElement.addEventListener('scroll', () => {
            this.syncScroll();
        });

        this.textareaElement.addEventListener('click', () => {
            this.updateStatusBar();
        });
    }

    /**
     * Handle keydown events
     */
    handleKeydown(e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            const tab = this.tabManager.getTab(this.tabId);
            const indent = ' '.repeat(tab?.preferences?.tabWidth || 4);
            this.insertAtCursor(indent);
        }
    }

    /**
     * Insert text at cursor
     */
    insertAtCursor(text) {
        const start = this.textareaElement.selectionStart;
        const end = this.textareaElement.selectionEnd;
        const content = this.textareaElement.value;

        this.textareaElement.value = content.substring(0, start) + text + content.substring(end);
        this.textareaElement.selectionStart = this.textareaElement.selectionEnd = start + text.length;

        this.tabManager.updateTabContent(this.tabId, this.textareaElement.value);
        this.emit('contentChanged', { tabId: this.tabId, content: this.textareaElement.value });
    }

    /**
     * Update line numbers
     */
    updateLineNumbers() {
        if (!this.lineNumbersElement || !this.lineNumbersElement.classList.contains('visible')) return;

        const lines = this.textareaElement.value.split('\n').length;
        const currentLines = this.lineNumbersElement.children.length;

        if (lines !== currentLines) {
            this.lineNumbersElement.innerHTML = '';
            for (let i = 1; i <= lines; i++) {
                const lineNum = createElement('div', {
                    class: ['line-number'],
                    text: i.toString()
                });
                this.lineNumbersElement.appendChild(lineNum);
            }
        }
    }

    /**
     * Sync scroll between textarea and line numbers
     */
    syncScroll() {
        if (this.lineNumbersElement) {
            this.lineNumbersElement.scrollTop = this.textareaElement.scrollTop;
        }
        if (this.minimapElement) {
            this.minimapElement.scrollTop = this.textareaElement.scrollTop;
        }
    }

    /**
     * Update status bar
     */
    updateStatusBar() {
        if (!this.statusBarElement || !this.statusBarElement.classList.contains('visible')) return;

        const content = this.textareaElement.value;
        const lines = content.split('\n').length;
        const cursorPos = this.textareaElement.selectionStart;
        const beforeCursor = content.substring(0, cursorPos);
        const lineNumber = beforeCursor.split('\n').length;
        const columnNumber = cursorPos - beforeCursor.lastIndexOf('\n');
        const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
        const charCount = content.length;

        this.statusBarElement.innerHTML = `
            <div class="status-bar-left">
                <div class="status-item">
                    <span class="status-label">Line</span>
                    <span class="status-value">${lineNumber}</span>
                </div>
                <div class="status-item">
                    <span class="status-label">Col</span>
                    <span class="status-value">${columnNumber}</span>
                </div>
                <div class="status-item">
                    <span class="status-label">Chars</span>
                    <span class="status-value">${charCount}</span>
                </div>
                <div class="status-item">
                    <span class="status-label">Words</span>
                    <span class="status-value">${wordCount}</span>
                </div>
            </div>
            <div class="status-bar-right">
                <div class="status-item">
                    <span class="status-value">UTF-8</span>
                </div>
            </div>
        `;
    }

    /**
     * Get content
     */
    getContent() {
        return this.textareaElement?.value || '';
    }

    /**
     * Set content
     */
    setContent(content) {
        if (this.textareaElement) {
            this.textareaElement.value = content;
            this.updateLineNumbers();
            this.updateStatusBar();
        }
    }

    /**
     * Focus editor
     */
    focus() {
        this.textareaElement?.focus();
    }

    /**
     * Destroy component
     */
    destroy() {
        if (this.domElement?.parentElement) {
            this.domElement.parentElement.removeChild(this.domElement);
        }
    }
}

export default EditorComponent;
