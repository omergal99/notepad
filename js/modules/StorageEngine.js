/**
 * STORAGE ENGINE
 * LocalStorage + IndexedDB abstraction layer with quota handling
 * Handles: Notes, Window states, Preferences, Image blobs, Backups
 */

import { EventEmitter } from '../utils/eventEmitter.js';

const DB_NAME = 'NotepadOnlineDB';
const DB_VERSION = 1;

const STORES = {
    NOTES: 'notes',
    IMAGES: 'images',
    WINDOW_STATES: 'windowStates',
    PREFERENCES: 'preferences',
    BACKUPS: 'backups'
};

export class StorageEngine extends EventEmitter {
    constructor() {
        super();
        this.db = null;
        this.isInitialized = false;
        this.storageQuota = { usage: 0, quota: 0 };
        this.initPromise = this.init();
    }

    /**
     * Initialize IndexedDB
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('IndexedDB initialization failed:', request.error);
                reject(request.error);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores
                if (!db.objectStoreNames.contains(STORES.NOTES)) {
                    db.createObjectStore(STORES.NOTES, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(STORES.IMAGES)) {
                    db.createObjectStore(STORES.IMAGES, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(STORES.WINDOW_STATES)) {
                    db.createObjectStore(STORES.WINDOW_STATES, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(STORES.PREFERENCES)) {
                    db.createObjectStore(STORES.PREFERENCES, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(STORES.BACKUPS)) {
                    db.createObjectStore(STORES.BACKUPS, { keyPath: 'id' });
                }
            };

            request.onsuccess = () => {
                this.db = request.result;
                this.isInitialized = true;
                this.checkStorageQuota();
                this.emit('ready');
                resolve();
            };
        });
    }

    /**
     * Check storage quota usage
     */
    async checkStorageQuota() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            try {
                const estimate = await navigator.storage.estimate();
                this.storageQuota = {
                    usage: estimate.usage || 0,
                    quota: estimate.quota || 0
                };
                this.emit('quotaUpdated', this.storageQuota);

                // Warn if usage > 80%
                const usage = this.storageQuota.usage / this.storageQuota.quota;
                if (usage > 0.8) {
                    this.emit('quotaWarning', { percentage: Math.round(usage * 100) });
                }
            } catch (error) {
                console.error('Failed to get storage quota:', error);
            }
        }
    }

    /**
     * Save a note
     */
    async saveNote(noteId, content, metadata = {}) {
        await this.initPromise;
        const note = {
            id: noteId,
            content,
            metadata,
            savedAt: new Date().toISOString(),
            isDirty: false
        };

        return this._dbWrite(STORES.NOTES, note);
    }

    /**
     * Load a note
     */
    async loadNote(noteId) {
        await this.initPromise;
        return this._dbRead(STORES.NOTES, noteId);
    }

    /**
     * Delete a note
     */
    async deleteNote(noteId) {
        await this.initPromise;
        return this._dbDelete(STORES.NOTES, noteId);
    }

    /**
     * Get all notes
     */
    async getAllNotes() {
        await this.initPromise;
        return this._dbGetAll(STORES.NOTES);
    }

    /**
     * Store image blob in IndexedDB
     */
    async storeImageBlob(imageId, blob, metadata = {}) {
        await this.initPromise;
        const image = {
            id: imageId,
            blob,
            metadata,
            storedAt: new Date().toISOString()
        };

        return this._dbWrite(STORES.IMAGES, image);
    }

    /**
     * Get image blob
     */
    async getImageBlob(imageId) {
        await this.initPromise;
        const image = await this._dbRead(STORES.IMAGES, imageId);
        return image?.blob || null;
    }

    /**
     * Delete image blob
     */
    async deleteImageBlob(imageId) {
        await this.initPromise;
        return this._dbDelete(STORES.IMAGES, imageId);
    }

    /**
     * Save window state
     */
    async saveWindowState(windowId, state) {
        await this.initPromise;
        const windowState = {
            id: windowId,
            ...state,
            savedAt: new Date().toISOString()
        };

        return this._dbWrite(STORES.WINDOW_STATES, windowState);
    }

    /**
     * Load window state
     */
    async loadWindowState(windowId) {
        await this.initPromise;
        return this._dbRead(STORES.WINDOW_STATES, windowId);
    }

    /**
     * Delete window state
     */
    async deleteWindowState(windowId) {
        await this.initPromise;
        return this._dbDelete(STORES.WINDOW_STATES, windowId);
    }

    /**
     * Get all window states
     */
    async getAllWindowStates() {
        await this.initPromise;
        return this._dbGetAll(STORES.WINDOW_STATES);
    }

    /**
     * Save preferences
     */
    async savePreferences(prefsId, preferences) {
        await this.initPromise;
        const prefs = {
            id: prefsId,
            ...preferences,
            savedAt: new Date().toISOString()
        };

        return this._dbWrite(STORES.PREFERENCES, prefs);
    }

    /**
     * Load preferences
     */
    async loadPreferences(prefsId) {
        await this.initPromise;
        return this._dbRead(STORES.PREFERENCES, prefsId);
    }

    /**
     * Get all preferences
     */
    async getAllPreferences() {
        await this.initPromise;
        return this._dbGetAll(STORES.PREFERENCES);
    }

    /**
     * Create backup copy
     */
    async createBackup(backupId, data) {
        await this.initPromise;
        const backup = {
            id: backupId,
            data,
            createdAt: new Date().toISOString()
        };

        return this._dbWrite(STORES.BACKUPS, backup);
    }

    /**
     * Get backup
     */
    async getBackup(backupId) {
        await this.initPromise;
        return this._dbRead(STORES.BACKUPS, backupId);
    }

    /**
     * Delete backup
     */
    async deleteBackup(backupId) {
        await this.initPromise;
        return this._dbDelete(STORES.BACKUPS, backupId);
    }

    /**
     * Get all backups
     */
    async getAllBackups() {
        await this.initPromise;
        return this._dbGetAll(STORES.BACKUPS);
    }

    /**
     * Get localStorage item
     */
    getLocalStorage(key) {
        try {
            const item = localStorage.getItem(key);
            if (item === null) return null;
            return JSON.parse(item);
        } catch (error) {
            console.error(`Error reading localStorage key "${key}":`, error);
            return null;
        }
    }

    /**
     * Set localStorage item
     */
    setLocalStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Error writing to localStorage key "${key}":`, error);
            if (error.name === 'QuotaExceededError') {
                this.emit('quotaExceeded');
            }
            return false;
        }
    }

    /**
     * Remove localStorage item
     */
    removeLocalStorage(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`Error removing localStorage key "${key}":`, error);
            return false;
        }
    }

    /**
     * Clear all storage (careful!)
     */
    async clearAll() {
        await this.initPromise;
        try {
            localStorage.clear();
            await this._dbClearStore(STORES.NOTES);
            await this._dbClearStore(STORES.IMAGES);
            await this._dbClearStore(STORES.WINDOW_STATES);
            await this._dbClearStore(STORES.PREFERENCES);
            await this._dbClearStore(STORES.BACKUPS);
            this.emit('cleared');
            return true;
        } catch (error) {
            console.error('Error clearing storage:', error);
            return false;
        }
    }

    /**
     * Export all data as JSON
     */
    async exportAllData() {
        await this.initPromise;
        const data = {
            notes: await this._dbGetAll(STORES.NOTES),
            windowStates: await this._dbGetAll(STORES.WINDOW_STATES),
            preferences: await this._dbGetAll(STORES.PREFERENCES),
            backups: await this._dbGetAll(STORES.BACKUPS),
            localStorage: { ...localStorage }
        };

        return data;
    }

    /**
     * Import data from JSON
     */
    async importData(data) {
        await this.initPromise;
        try {
            if (data.notes) {
                for (const note of data.notes) {
                    await this._dbWrite(STORES.NOTES, note);
                }
            }
            if (data.windowStates) {
                for (const state of data.windowStates) {
                    await this._dbWrite(STORES.WINDOW_STATES, state);
                }
            }
            if (data.preferences) {
                for (const prefs of data.preferences) {
                    await this._dbWrite(STORES.PREFERENCES, prefs);
                }
            }
            if (data.backups) {
                for (const backup of data.backups) {
                    await this._dbWrite(STORES.BACKUPS, backup);
                }
            }
            if (data.localStorage) {
                Object.entries(data.localStorage).forEach(([key, value]) => {
                    this.setLocalStorage(key, value);
                });
            }
            this.emit('imported');
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }

    /**
     * PRIVATE: IndexedDB write operation
     */
    _dbWrite(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(data);
        });
    }

    /**
     * PRIVATE: IndexedDB read operation
     */
    _dbRead(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    /**
     * PRIVATE: IndexedDB delete operation
     */
    _dbDelete(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    /**
     * PRIVATE: IndexedDB getAll operation
     */
    _dbGetAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result || []);
        });
    }

    /**
     * PRIVATE: IndexedDB clear store
     */
    _dbClearStore(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }
}

export default StorageEngine;
