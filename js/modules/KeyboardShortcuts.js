/**
 * KEYBOARD SHORTCUTS
 * Global & Window shortcut event handlers
 * Phase 5 implementation
 */

import { EventEmitter } from '../utils/eventEmitter.js';

export class KeyboardShortcuts extends EventEmitter {
    constructor() {
        super();
        this.shortcuts = new Map();
        this.registerDefaultShortcuts();
    }

    /**
     * Register default shortcuts
     */
    registerDefaultShortcuts() {
        // File operations
        this.register({ key: 's', ctrlKey: true }, () => this.emit('save'));
        this.register({ key: 's', metaKey: true }, () => this.emit('save'));

        // Edit operations
        this.register({ key: 'z', ctrlKey: true }, () => this.emit('undo'));
        this.register({ key: 'z', metaKey: true }, () => this.emit('undo'));
        this.register({ key: 'y', ctrlKey: true }, () => this.emit('redo'));
        this.register({ key: 'y', metaKey: true }, () => this.emit('redo'));

        // Find & Replace
        this.register({ key: 'f', ctrlKey: true }, () => this.emit('openFind'));
        this.register({ key: 'f', metaKey: true }, () => this.emit('openFind'));
        this.register({ key: 'h', ctrlKey: true }, () => this.emit('openReplace'));
        this.register({ key: 'h', metaKey: true }, () => this.emit('openReplace'));

        // Window operations
        this.register({ key: 'n', ctrlKey: true }, () => this.emit('newWindow'));
        this.register({ key: 'n', metaKey: true }, () => this.emit('newWindow'));
        this.register({ key: 't', ctrlKey: true }, () => this.emit('newTab'));
        this.register({ key: 't', metaKey: true }, () => this.emit('newTab'));
        this.register({ key: 'w', ctrlKey: true }, () => this.emit('closeTab'));
        this.register({ key: 'w', metaKey: true }, () => this.emit('closeTab'));

        // View operations
        this.register({ key: ',', ctrlKey: true }, () => this.emit('openPreferences'));
        this.register({ key: ',', metaKey: true }, () => this.emit('openPreferences'));

        // Help
        this.register({ key: '?', ctrlKey: true }, () => this.emit('openHelp'));
        this.register({ key: '?', metaKey: true }, () => this.emit('openHelp'));
    }

    /**
     * Register a keyboard shortcut
     */
    register(keyCombination, handler) {
        const key = this.getKey(keyCombination);
        this.shortcuts.set(key, handler);
    }

    /**
     * Unregister a shortcut
     */
    unregister(keyCombination) {
        const key = this.getKey(keyCombination);
        this.shortcuts.delete(key);
    }

    /**
     * Get shortcut key identifier
     */
    getKey(keyCombination) {
        const parts = [];
        if (keyCombination.ctrlKey) parts.push('ctrl');
        if (keyCombination.metaKey) parts.push('meta');
        if (keyCombination.altKey) parts.push('alt');
        if (keyCombination.shiftKey) parts.push('shift');
        parts.push(keyCombination.key.toLowerCase());
        return parts.join('+');
    }

    /**
     * Handle keyboard event
     */
    handleKeydown(event) {
        const key = this.getKey({
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
            altKey: event.altKey,
            shiftKey: event.shiftKey,
            key: event.key
        });

        const handler = this.shortcuts.get(key);
        if (handler) {
            event.preventDefault();
            handler(event);
        }
    }

    /**
     * Attach to document
     */
    attach() {
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
    }

    /**
     * Detach from document
     */
    detach() {
        document.removeEventListener('keydown', (e) => this.handleKeydown(e));
    }
}

export default KeyboardShortcuts;
