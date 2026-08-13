/**
 * PREFERENCES MANAGER
 * Global vs Tab preferences, preset history (last 5)
 * Phase 5 implementation
 */

import { EventEmitter } from '../utils/eventEmitter.js';

export class PreferencesManager extends EventEmitter {
    constructor(storage) {
        super();
        this.storage = storage;
        this.globalPreferences = this.getDefaultPreferences();
        this.presetHistory = [];
        this.maxPresets = 5;
    }

    /**
     * Get default preferences
     */
    getDefaultPreferences() {
        return {
            fontFamily: 'monospace',
            fontSize: 14,
            textColor: '#333333',
            backgroundColor: '#FFFFFF',
            tabBackgroundColor: '#E8E8E8',
            tabWidth: 4,
            autoIndent: true,
            textWrap: true,
            lineNumbers: true,
            statusBar: true,
            minimap: true,
            rightMargin: false,
            showGrid: false,
            highlightCurrentLine: false,
            autoSave: true,
            autoSaveInterval: 60000, // 1 minute
            createBackup: true,
            saveAllTabs: true,
            darkMode: false
        };
    }

    /**
     * Load global preferences
     */
    async loadGlobalPreferences() {
        try {
            const saved = this.storage.getLocalStorage('np_global_prefs');
            if (saved) {
                this.globalPreferences = { ...this.getDefaultPreferences(), ...saved };
            }
        } catch (error) {
            console.error('Error loading preferences:', error);
        }
    }

    /**
     * Save global preferences
     */
    async saveGlobalPreferences(preferences) {
        this.globalPreferences = { ...this.globalPreferences, ...preferences };
        this.storage.setLocalStorage('np_global_prefs', this.globalPreferences);
        this.emit('preferencesChanged', { preferences: this.globalPreferences, scope: 'global' });
    }

    /**
     * Save current preferences as preset
     */
    async savePreset(name, preferences) {
        const preset = {
            id: Date.now(),
            name: name || `Preset ${this.presetHistory.length + 1}`,
            preferences: { ...preferences },
            createdAt: new Date().toISOString()
        };

        this.presetHistory.unshift(preset);

        // Keep only last 5
        if (this.presetHistory.length > this.maxPresets) {
            this.presetHistory.pop();
        }

        this.storage.setLocalStorage('np_preset_history', this.presetHistory);
        this.emit('presetSaved', preset);

        return preset.id;
    }

    /**
     * Load preset history
     */
    async loadPresetHistory() {
        try {
            const saved = this.storage.getLocalStorage('np_preset_history');
            if (Array.isArray(saved)) {
                this.presetHistory = saved;
            }
        } catch (error) {
            console.error('Error loading preset history:', error);
        }
    }

    /**
     * Get preset by id
     */
    getPreset(presetId) {
        return this.presetHistory.find(p => p.id === presetId);
    }

    /**
     * Delete preset
     */
    async deletePreset(presetId) {
        this.presetHistory = this.presetHistory.filter(p => p.id !== presetId);
        this.storage.setLocalStorage('np_preset_history', this.presetHistory);
        this.emit('presetDeleted', { presetId });
    }

    /**
     * Get last preset
     */
    getLastPreset() {
        return this.presetHistory[0];
    }

    /**
     * Get all presets
     */
    getAllPresets() {
        return [...this.presetHistory];
    }

    /**
     * Apply preset to preferences
     */
    async applyPreset(presetId) {
        const preset = this.getPreset(presetId);
        if (preset) {
            await this.saveGlobalPreferences(preset.preferences);
            this.emit('presetApplied', preset);
            return true;
        }
        return false;
    }

    /**
     * Update preset
     */
    async updatePreset(presetId, name, preferences) {
        const index = this.presetHistory.findIndex(p => p.id === presetId);
        if (index >= 0) {
            this.presetHistory[index].name = name;
            this.presetHistory[index].preferences = preferences;
            this.storage.setLocalStorage('np_preset_history', this.presetHistory);
            this.emit('presetUpdated', this.presetHistory[index]);
            return true;
        }
        return false;
    }
}

export default PreferencesManager;
