/**
 * STORAGE ENGINE
 * Unified persistence layer for localStorage and IndexedDB
 * Handles: Notes, images, window/tab states, preferences, backups
 * 
 * Phase 2 - Complete Implementation (v1.0)
 * Tests: 15+ unit tests in tests/storage.test.js
 * Coverage Target: > 85%
 */

import EventEmitter from '../utils/eventEmitter.js';

// Constants
const DB_NAME = 'notepad-online';
const DB_VERSION = 1;
const STORES = {
  NOTES: 'notes',
  IMAGES: 'images',
  WINDOWS: 'windowStates',
  TABS: 'tabStates',
  BACKUPS: 'backups',
  PREFERENCES: 'preferences'
};

const LS_KEYS = {
  GLOBAL_PREFS: 'np_global_prefs',
  WINDOW_STATES: 'np_window_states',
  PRESET_HISTORY: 'np_preset_history',
  RECOVERY_BACKUP: 'np_recovery_backup'
};

const QUOTA_THRESHOLD_WARNING = 0.8;
const MAX_BACKUPS = 10;

export class StorageEngine extends EventEmitter {
  constructor() {
    super();
    this.db = null;
    this.isLocalStorageAvailable = this._checkLocalStorageAvailability();
    this.storageUsage = 0;
    this.storageQuota = 52428800; // 50MB default for IndexedDB
    this.useIndexedDBOnly = false;
    this.initPromise = this.init();
  }

  // ===================================================================
  // INITIALIZATION
  // ===================================================================

  /**
   * Initialize IndexedDB database with schema
   */
  async init() {
    try {
      console.log('📦 StorageEngine: Initializing...');

      // Check if IndexedDB is available
      const indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB;
      if (!indexedDB) {
        throw new Error('IndexedDB not available');
      }

      // Open database
      this.db = await this._openIndexedDB();
      
      // Detect and recover from corruption
      await this._detectAndRecoverCorruption();

      // Calculate initial storage usage
      await this._updateStorageUsage();

      console.log('✅ StorageEngine: Ready');
      this.emit('ready');
    } catch (error) {
      console.error('❌ StorageEngine init error:', error);
      this.useIndexedDBOnly = true;
      this.emit('ready'); // Still ready, just with limitations
    }
  }

  /**
   * Open IndexedDB database and create stores if needed
   */
  async _openIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(new Error('Failed to open IndexedDB'));
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create notes store
        if (!db.objectStoreNames.contains(STORES.NOTES)) {
          const noteStore = db.createObjectStore(STORES.NOTES, { keyPath: 'id' });
          noteStore.createIndex('tabId', 'tabId', { unique: false });
          noteStore.createIndex('windowId', 'windowId', { unique: false });
          noteStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Create images store
        if (!db.objectStoreNames.contains(STORES.IMAGES)) {
          const imageStore = db.createObjectStore(STORES.IMAGES, { keyPath: 'id' });
          imageStore.createIndex('tabId', 'tabId', { unique: false });
        }

        // Create window states store
        if (!db.objectStoreNames.contains(STORES.WINDOWS)) {
          db.createObjectStore(STORES.WINDOWS, { keyPath: 'id' });
        }

        // Create tab states store
        if (!db.objectStoreNames.contains(STORES.TABS)) {
          const tabStore = db.createObjectStore(STORES.TABS, { keyPath: 'id' });
          tabStore.createIndex('windowId', 'windowId', { unique: false });
        }

        // Create backups store
        if (!db.objectStoreNames.contains(STORES.BACKUPS)) {
          const backupStore = db.createObjectStore(STORES.BACKUPS, { keyPath: 'id' });
          backupStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Create preferences store
        if (!db.objectStoreNames.contains(STORES.PREFERENCES)) {
          db.createObjectStore(STORES.PREFERENCES, { keyPath: 'id' });
        }

        console.log('📊 IndexedDB: Stores initialized');
      };
    });
  }

  // ===================================================================
  // NOTES - CRUD OPERATIONS
  // ===================================================================

  /**
   * Save note with metadata
   */
  async saveNote(tabId, content, metadata = {}) {
    try {
      const noteId = metadata.id || this._generateId();
      const now = Date.now();

      const note = {
        id: noteId,
        tabId,
        windowId: metadata.windowId || null,
        content,
        wordCount: this._countWords(content),
        charCount: content.length,
        lineCount: content.split('\n').length,
        lastModified: now,
        createdAt: metadata.createdAt || now,
        isDirty: false,
        ...metadata
      };

      await this._dbWrite(STORES.NOTES, note.id, note);
      this.emit('noteSaved', { noteId, tabId, size: content.length });
      return noteId;
    } catch (error) {
      console.error('❌ saveNote error:', error);
      throw error;
    }
  }

  /**
   * Load note by ID
   */
  async loadNote(noteId) {
    try {
      const note = await this._dbRead(STORES.NOTES, noteId);
      if (!note) {
        console.warn(`⚠️ Note not found: ${noteId}`);
        return null;
      }
      return note;
    } catch (error) {
      console.error('❌ loadNote error:', error);
      throw error;
    }
  }

  /**
   * Delete note by ID
   */
  async deleteNote(noteId) {
    try {
      await this._dbDelete(STORES.NOTES, noteId);
      this.emit('noteDeleted', { noteId });
      return true;
    } catch (error) {
      console.error('❌ deleteNote error:', error);
      throw error;
    }
  }

  /**
   * Get all notes
   */
  async getAllNotes() {
    try {
      const notes = await this._dbGetAll(STORES.NOTES);
      return notes || [];
    } catch (error) {
      console.error('❌ getAllNotes error:', error);
      return [];
    }
  }

  /**
   * Get notes for specific tab
   */
  async getNotesByTab(tabId) {
    try {
      const notes = await this._dbGetAll(STORES.NOTES);
      return notes.filter(note => note.tabId === tabId) || [];
    } catch (error) {
      console.error('❌ getNotesByTab error:', error);
      return [];
    }
  }

  // ===================================================================
  // IMAGES - BLOB STORAGE
  // ===================================================================

  /**
   * Store image blob in IndexedDB
   */
  async storeImageBlob(blob, tabId, fileName) {
    try {
      const imageId = this._generateId();
      const now = Date.now();

      const image = {
        id: imageId,
        tabId,
        fileName: fileName || `image-${now}.png`,
        blob,
        size: blob.size,
        type: blob.type || 'image/png',
        pastedAt: now
      };

      await this._dbWrite(STORES.IMAGES, imageId, image);
      this.emit('imageStored', { imageId, tabId, size: blob.size });
      return imageId;
    } catch (error) {
      console.error('❌ storeImageBlob error:', error);
      throw error;
    }
  }

  /**
   * Get image blob by ID
   */
  async getImageBlob(imageId) {
    try {
      const image = await this._dbRead(STORES.IMAGES, imageId);
      return image ? image.blob : null;
    } catch (error) {
      console.error('❌ getImageBlob error:', error);
      return null;
    }
  }

  /**
   * Get all images for specific tab
   */
  async getImagesByTab(tabId) {
    try {
      const images = await this._dbGetAll(STORES.IMAGES);
      return images.filter(img => img.tabId === tabId) || [];
    } catch (error) {
      console.error('❌ getImagesByTab error:', error);
      return [];
    }
  }

  /**
   * Delete image by ID
   */
  async deleteImage(imageId) {
    try {
      await this._dbDelete(STORES.IMAGES, imageId);
      this.emit('imageDeleted', { imageId });
      return true;
    } catch (error) {
      console.error('❌ deleteImage error:', error);
      throw error;
    }
  }

  // ===================================================================
  // WINDOW & TAB STATES
  // ===================================================================

  /**
   * Save window state
   */
  async saveWindowState(windowState) {
    try {
      const now = Date.now();
      windowState.lastModified = now;

      // Also save to localStorage for quick access
      if (this.isLocalStorageAvailable) {
        try {
          let states = JSON.parse(localStorage.getItem(LS_KEYS.WINDOW_STATES) || '[]');
          const idx = states.findIndex(w => w.id === windowState.id);
          if (idx >= 0) {
            states[idx] = windowState;
          } else {
            states.push(windowState);
          }
          localStorage.setItem(LS_KEYS.WINDOW_STATES, JSON.stringify(states));
        } catch (e) {
          console.warn('⚠️ localStorage window save failed:', e);
        }
      }

      // Always save to IndexedDB
      await this._dbWrite(STORES.WINDOWS, windowState.id, windowState);
      return windowState.id;
    } catch (error) {
      console.error('❌ saveWindowState error:', error);
      throw error;
    }
  }

  /**
   * Load window state by ID
   */
  async loadWindowState(windowId) {
    try {
      return await this._dbRead(STORES.WINDOWS, windowId);
    } catch (error) {
      console.error('❌ loadWindowState error:', error);
      return null;
    }
  }

  /**
   * Get all window states
   */
  async getAllWindowStates() {
    try {
      // Try localStorage first (faster)
      if (this.isLocalStorageAvailable) {
        try {
          const states = JSON.parse(localStorage.getItem(LS_KEYS.WINDOW_STATES) || '[]');
          if (states.length > 0) {
            return states;
          }
        } catch (e) {
          console.warn('⚠️ localStorage window load failed:', e);
        }
      }

      // Fallback to IndexedDB
      return await this._dbGetAll(STORES.WINDOWS) || [];
    } catch (error) {
      console.error('❌ getAllWindowStates error:', error);
      return [];
    }
  }

  /**
   * Get tab state by ID
   */
  async getTabState(tabId) {
    try {
      return await this._dbRead(STORES.TABS, tabId);
    } catch (error) {
      console.error('❌ getTabState error:', error);
      return null;
    }
  }

  /**
   * Save tab state
   */
  async saveTabState(tabState) {
    try {
      const now = Date.now();
      tabState.lastModified = now;
      await this._dbWrite(STORES.TABS, tabState.id, tabState);
      return tabState.id;
    } catch (error) {
      console.error('❌ saveTabState error:', error);
      throw error;
    }
  }

  // ===================================================================
  // PREFERENCES & PRESETS
  // ===================================================================

  /**
   * Save preferences (global or tab-specific)
   */
  async savePreferences(prefs, scope = 'global') {
    try {
      if (scope === 'global' && this.isLocalStorageAvailable) {
        localStorage.setItem(LS_KEYS.GLOBAL_PREFS, JSON.stringify(prefs));
      } else if (scope === 'global') {
        await this._dbWrite(STORES.PREFERENCES, 'global', prefs);
      } else {
        // Tab-specific preferences
        await this._dbWrite(STORES.PREFERENCES, `tab-${scope}`, prefs);
      }

      this.emit('preferencesSaved', { scope });
      return true;
    } catch (error) {
      console.error('❌ savePreferences error:', error);
      throw error;
    }
  }

  /**
   * Load preferences
   */
  async loadPreferences(scope = 'global') {
    try {
      if (scope === 'global' && this.isLocalStorageAvailable) {
        const prefs = localStorage.getItem(LS_KEYS.GLOBAL_PREFS);
        return prefs ? JSON.parse(prefs) : null;
      } else if (scope === 'global') {
        return await this._dbRead(STORES.PREFERENCES, 'global');
      } else {
        // Tab-specific preferences
        return await this._dbRead(STORES.PREFERENCES, `tab-${scope}`);
      }
    } catch (error) {
      console.error('❌ loadPreferences error:', error);
      return null;
    }
  }

  /**
   * Save preset configuration
   */
  async savePreset(presetName, preferences) {
    try {
      const presetId = this._generateId();
      const preset = {
        id: presetId,
        name: presetName,
        ...preferences,
        createdAt: Date.now()
      };

      await this._dbWrite(STORES.PREFERENCES, presetId, preset);

      // Update preset history in localStorage
      if (this.isLocalStorageAvailable) {
        try {
          let history = JSON.parse(localStorage.getItem(LS_KEYS.PRESET_HISTORY) || '[]');
          history.push(preset);
          // Keep only last 5
          history = history.slice(-5);
          localStorage.setItem(LS_KEYS.PRESET_HISTORY, JSON.stringify(history));
        } catch (e) {
          console.warn('⚠️ localStorage preset history failed:', e);
        }
      }

      this.emit('presetSaved', { presetId, name: presetName });
      return presetId;
    } catch (error) {
      console.error('❌ savePreset error:', error);
      throw error;
    }
  }

  /**
   * Get preset by ID
   */
  async getPreset(presetId) {
    try {
      return await this._dbRead(STORES.PREFERENCES, presetId);
    } catch (error) {
      console.error('❌ getPreset error:', error);
      return null;
    }
  }

  /**
   * Get all presets
   */
  async getAllPresets() {
    try {
      const all = await this._dbGetAll(STORES.PREFERENCES);
      return all.filter(p => p.id && p.id.startsWith('p-')) || [];
    } catch (error) {
      console.error('❌ getAllPresets error:', error);
      return [];
    }
  }

  // ===================================================================
  // BACKUP & RESTORE
  // ===================================================================

  /**
   * Create full state backup
   */
  async createBackup(type = 'auto') {
    try {
      const backupId = this._generateId();
      const now = Date.now();

      // Collect all data
      const notes = await this.getAllNotes();
      const windows = await this.getAllWindowStates();
      const prefs = await this.loadPreferences('global');

      const backup = {
        id: backupId,
        type,
        timestamp: now,
        fullState: JSON.stringify({
          notes,
          windows,
          preferences: prefs,
          timestamp: now,
          version: 1
        }),
        size: 0 // Will calculate
      };

      backup.size = new Blob([backup.fullState]).size;

      // Check backup limit
      const allBackups = await this._dbGetAll(STORES.BACKUPS);
      if (allBackups.length >= MAX_BACKUPS) {
        // Delete oldest
        const oldest = allBackups.sort((a, b) => a.timestamp - b.timestamp)[0];
        await this._dbDelete(STORES.BACKUPS, oldest.id);
      }

      await this._dbWrite(STORES.BACKUPS, backupId, backup);
      this.emit('backupCreated', { backupId, type, size: backup.size });
      return backupId;
    } catch (error) {
      console.error('❌ createBackup error:', error);
      throw error;
    }
  }

  /**
   * Get backup by ID
   */
  async getBackup(backupId) {
    try {
      return await this._dbRead(STORES.BACKUPS, backupId);
    } catch (error) {
      console.error('❌ getBackup error:', error);
      return null;
    }
  }

  /**
   * Restore full state from backup
   */
  async restoreBackup(backupId) {
    try {
      const backup = await this.getBackup(backupId);
      if (!backup) {
        throw new Error(`Backup not found: ${backupId}`);
      }

      const state = JSON.parse(backup.fullState);

      // Restore notes
      for (const note of state.notes) {
        await this._dbWrite(STORES.NOTES, note.id, note);
      }

      // Restore windows
      for (const window of state.windows) {
        await this._dbWrite(STORES.WINDOWS, window.id, window);
      }

      // Restore preferences
      if (state.preferences) {
        await this.savePreferences(state.preferences, 'global');
      }

      this.emit('backupRestored', { backupId });
      return true;
    } catch (error) {
      console.error('❌ restoreBackup error:', error);
      throw error;
    }
  }

  /**
   * Get all backups metadata
   */
  async getAllBackups() {
    try {
      return await this._dbGetAll(STORES.BACKUPS) || [];
    } catch (error) {
      console.error('❌ getAllBackups error:', error);
      return [];
    }
  }

  /**
   * Delete backup by ID
   */
  async deleteBackup(backupId) {
    try {
      await this._dbDelete(STORES.BACKUPS, backupId);
      return true;
    } catch (error) {
      console.error('❌ deleteBackup error:', error);
      throw error;
    }
  }

  // ===================================================================
  // IMPORT/EXPORT
  // ===================================================================

  /**
   * Export all data as JSON string
   */
  async exportAllData() {
    try {
      const notes = await this.getAllNotes();
      const windows = await this.getAllWindowStates();
      const prefs = await this.loadPreferences('global');
      const presets = await this.getAllPresets();
      const backups = await this.getAllBackups();

      const exportData = {
        version: 1,
        exportedAt: Date.now(),
        data: {
          notes,
          windows,
          preferences: prefs,
          presets,
          backups: backups.map(b => ({
            ...b,
            fullState: JSON.parse(b.fullState)
          }))
        }
      };

      this.emit('dataExported', { size: JSON.stringify(exportData).length });
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('❌ exportAllData error:', error);
      throw error;
    }
  }

  /**
   * Import data from JSON
   */
  async importData(jsonData) {
    try {
      const importData = JSON.parse(jsonData);

      if (!importData.data) {
        throw new Error('Invalid import format');
      }

      const { notes, windows, preferences, presets, backups } = importData.data;

      // Import notes
      if (notes && Array.isArray(notes)) {
        for (const note of notes) {
          await this._dbWrite(STORES.NOTES, note.id, note);
        }
      }

      // Import windows
      if (windows && Array.isArray(windows)) {
        for (const window of windows) {
          await this.saveWindowState(window);
        }
      }

      // Import preferences
      if (preferences) {
        await this.savePreferences(preferences, 'global');
      }

      // Import presets
      if (presets && Array.isArray(presets)) {
        for (const preset of presets) {
          await this.savePreset(preset.name, preset);
        }
      }

      this.emit('dataImported', { notesCount: notes.length, windowsCount: windows.length });
      return true;
    } catch (error) {
      console.error('❌ importData error:', error);
      throw error;
    }
  }

  /**
   * Clear all data from storage
   */
  async clearAll() {
    try {
      // Clear IndexedDB stores
      await this._dbClearStore(STORES.NOTES);
      await this._dbClearStore(STORES.IMAGES);
      await this._dbClearStore(STORES.WINDOWS);
      await this._dbClearStore(STORES.TABS);
      await this._dbClearStore(STORES.BACKUPS);
      await this._dbClearStore(STORES.PREFERENCES);

      // Clear localStorage
      if (this.isLocalStorageAvailable) {
        localStorage.removeItem(LS_KEYS.GLOBAL_PREFS);
        localStorage.removeItem(LS_KEYS.WINDOW_STATES);
        localStorage.removeItem(LS_KEYS.PRESET_HISTORY);
      }

      this.emit('cleared');
      return true;
    } catch (error) {
      console.error('❌ clearAll error:', error);
      throw error;
    }
  }

  // ===================================================================
  // QUOTA MANAGEMENT
  // ===================================================================

  /**
   * Get current storage usage in bytes
   */
  getStorageUsage() {
    return this.storageUsage;
  }

  /**
   * Get available storage quota in bytes
   */
  getStorageQuota() {
    return this.storageQuota;
  }

  /**
   * Get percentage of quota used
   */
  estimateQuotaPercentage() {
    const percentage = (this.storageUsage / this.storageQuota) * 100;
    return Math.round(percentage * 10) / 10; // One decimal place
  }

  /**
   * Update storage usage and emit events
   */
  async _updateStorageUsage() {
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        this.storageUsage = estimate.usage;
        this.storageQuota = estimate.quota;

        const percentage = this.estimateQuotaPercentage();

        if (percentage >= 100) {
          console.warn('⚠️ Storage quota exceeded!');
          this.emit('quotaExceeded', { usage: this.storageUsage, quota: this.storageQuota });
          this.useIndexedDBOnly = true;
        } else if (percentage >= 80) {
          console.warn(`⚠️ Storage ${percentage}% full`);
          this.emit('quotaWarning', { percentage, usage: this.storageUsage, quota: this.storageQuota });
        }

        this.emit('quotaUpdated', { percentage, usage: this.storageUsage, quota: this.storageQuota });
      }
    } catch (error) {
      console.warn('⚠️ Storage estimate failed:', error);
    }
  }

  // ===================================================================
  // PRIVATE HELPERS
  // ===================================================================

  /**
   * Check if localStorage is available and writable
   */
  _checkLocalStorageAvailability() {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Write to IndexedDB
   */
  async _dbWrite(storeName, key, value) {
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(value);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Read from IndexedDB
   */
  async _dbRead(storeName, key) {
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Delete from IndexedDB
   */
  async _dbDelete(storeName, key) {
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get all records from store
   */
  async _dbGetAll(storeName) {
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Clear entire store
   */
  async _dbClearStore(storeName) {
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Detect corrupted localStorage and recover (EC-07)
   */
  async _detectAndRecoverCorruption() {
    try {
      const globalPrefs = localStorage.getItem(LS_KEYS.GLOBAL_PREFS);
      const windowStates = localStorage.getItem(LS_KEYS.WINDOW_STATES);

      // Try to parse
      if (globalPrefs) {
        try {
          JSON.parse(globalPrefs);
        } catch (e) {
          console.warn('⚠️ Corrupted global preferences detected');
          localStorage.removeItem(LS_KEYS.GLOBAL_PREFS);
          // Create recovery backup
          const backup = {
            corruptedKey: LS_KEYS.GLOBAL_PREFS,
            recoveredAt: Date.now(),
            data: globalPrefs
          };
          localStorage.setItem(LS_KEYS.RECOVERY_BACKUP, JSON.stringify(backup));
        }
      }

      if (windowStates) {
        try {
          JSON.parse(windowStates);
        } catch (e) {
          console.warn('⚠️ Corrupted window states detected');
          localStorage.removeItem(LS_KEYS.WINDOW_STATES);
          const backup = {
            corruptedKey: LS_KEYS.WINDOW_STATES,
            recoveredAt: Date.now(),
            data: windowStates
          };
          localStorage.setItem(LS_KEYS.RECOVERY_BACKUP, JSON.stringify(backup));
        }
      }
    } catch (error) {
      console.warn('⚠️ Corruption detection failed:', error);
    }
  }

  /**
   * Generate unique ID
   */
  _generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Count words in text
   */
  _countWords(text) {
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
  }

  /**
   * Get value from localStorage (wrapper for compatibility)
   */
  getLocalStorage(key) {
    try {
      if (!this.isLocalStorageAvailable) {
        return null;
      }
      const value = localStorage.getItem(key);
      if (!value) return null;
      try {
        return JSON.parse(value);
      } catch (e) {
        // Return as-is if not JSON
        return value;
      }
    } catch (error) {
      console.warn(`⚠️ getLocalStorage error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value to localStorage (wrapper for compatibility)
   */
  setLocalStorage(key, value) {
    try {
      if (!this.isLocalStorageAvailable) {
        return false;
      }
      const jsonValue = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, jsonValue);
      return true;
    } catch (error) {
      console.warn(`⚠️ setLocalStorage error for key ${key}:`, error);
      return false;
    }
  }
}

export default StorageEngine;
