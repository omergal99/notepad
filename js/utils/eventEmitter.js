/**
 * EVENT EMITTER UTILITY
 * Simple pub/sub event bus for modular communication
 */

export class EventEmitter {
    constructor() {
        this.events = new Map();
    }

    /**
     * Subscribe to an event
     * @param {string} eventName
     * @param {Function} callback
     * @returns {Function} Unsubscribe function
     */
    on(eventName, callback) {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }
        this.events.get(eventName).push(callback);

        // Return unsubscribe function
        return () => {
            const listeners = this.events.get(eventName);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        };
    }

    /**
     * Subscribe to an event once
     * @param {string} eventName
     * @param {Function} callback
     */
    once(eventName, callback) {
        const unsubscribe = this.on(eventName, (...args) => {
            callback(...args);
            unsubscribe();
        });
    }

    /**
     * Emit an event
     * @param {string} eventName
     * @param {...any} args
     */
    emit(eventName, ...args) {
        if (this.events.has(eventName)) {
            this.events.get(eventName).forEach(callback => {
                try {
                    callback(...args);
                } catch (error) {
                    console.error(`Error in event listener for ${eventName}:`, error);
                }
            });
        }
    }

    /**
     * Remove all listeners for an event
     * @param {string} eventName
     */
    off(eventName) {
        this.events.delete(eventName);
    }

    /**
     * Remove all listeners
     */
    removeAllListeners() {
        this.events.clear();
    }
}

export default EventEmitter;
