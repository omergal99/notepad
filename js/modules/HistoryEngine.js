/**
 * HISTORY ENGINE
 * Per-tab Undo/Redo stack manager
 * Phase 4 implementation
 */

import { EventEmitter } from '../utils/eventEmitter.js';

export class HistoryEngine extends EventEmitter {
    constructor(maxStackSize = 100) {
        super();
        this.maxStackSize = maxStackSize;
        this.undoStack = [];
        this.redoStack = [];
    }

    /**
     * Push an action onto undo stack
     */
    push(action) {
        this.undoStack.push(action);

        // Clear redo stack when new action is taken
        if (this.redoStack.length > 0) {
            this.redoStack = [];
            this.emit('redoStackCleared');
        }

        // Maintain max stack size
        if (this.undoStack.length > this.maxStackSize) {
            this.undoStack.shift();
        }

        this.emit('actionPushed', action);
    }

    /**
     * Undo last action
     */
    undo() {
        if (this.undoStack.length === 0) return null;

        const action = this.undoStack.pop();
        this.redoStack.push(action);

        this.emit('undoPerformed', action);
        return action;
    }

    /**
     * Redo last undone action
     */
    redo() {
        if (this.redoStack.length === 0) return null;

        const action = this.redoStack.pop();
        this.undoStack.push(action);

        this.emit('redoPerformed', action);
        return action;
    }

    /**
     * Check if can undo
     */
    canUndo() {
        return this.undoStack.length > 0;
    }

    /**
     * Check if can redo
     */
    canRedo() {
        return this.redoStack.length > 0;
    }

    /**
     * Clear all history
     */
    clear() {
        this.undoStack = [];
        this.redoStack = [];
        this.emit('historyCleared');
    }

    /**
     * Get undo stack size
     */
    getUndoStackSize() {
        return this.undoStack.length;
    }

    /**
     * Get redo stack size
     */
    getRedoStackSize() {
        return this.redoStack.length;
    }
}

export default HistoryEngine;
