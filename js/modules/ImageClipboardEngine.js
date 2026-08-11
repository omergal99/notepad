/**
 * IMAGE CLIPBOARD ENGINE
 * Paste image, blob storage, inline cards, copy image back
 * Phase 6 implementation
 */

import { EventEmitter } from '../utils/eventEmitter.js';
import { v4 as uuidv4 } from 'https://cdn.jsdelivr.net/npm/uuid@9.0.0/dist/esm-browser/index.js';

export class ImageClipboardEngine extends EventEmitter {
    constructor(storage) {
        super();
        this.storage = storage;
        this.pastedImages = new Map();
    }

    /**
     * Handle paste event and extract image
     */
    async handlePaste(e, tabId) {
        const items = e.clipboardData?.items || [];

        for (let item of items) {
            if (item.type.indexOf('image') !== -1) {
                const blob = item.getAsFile();
                if (blob) {
                    await this.pasteImage(blob, tabId);
                }
            }
        }
    }

    /**
     * Paste and store image blob
     */
    async pasteImage(blob, tabId) {
        const imageId = uuidv4();

        // Store blob in IndexedDB
        await this.storage.storeImageBlob(imageId, blob, {
            tabId,
            fileName: `image-${Date.now()}`,
            size: blob.size,
            type: blob.type
        });

        // Create blob URL for preview
        const blobUrl = URL.createObjectURL(blob);
        this.pastedImages.set(imageId, { blobUrl, blob, tabId });

        this.emit('imagesPasted', { imageId, blobUrl, tabId });

        return imageId;
    }

    /**
     * Get image blob URL
     */
    getImageBlobUrl(imageId) {
        const image = this.pastedImages.get(imageId);
        return image?.blobUrl || null;
    }

    /**
     * Get image blob
     */
    async getImageBlob(imageId) {
        const image = this.pastedImages.get(imageId);
        if (image?.blob) return image.blob;

        // Try to load from storage if not in memory
        return await this.storage.getImageBlob(imageId);
    }

    /**
     * Copy image to clipboard
     */
    async copyImageToClipboard(imageId) {
        try {
            const blob = await this.getImageBlob(imageId);
            if (blob) {
                const item = new ClipboardItem({ [blob.type]: blob });
                await navigator.clipboard.write([item]);
                this.emit('imageCopiedToClipboard', { imageId });
                return true;
            }
        } catch (error) {
            console.error('Failed to copy image to clipboard:', error);
            this.emit('copyError', { error });
            return false;
        }
    }

    /**
     * Delete image
     */
    async deleteImage(imageId) {
        const image = this.pastedImages.get(imageId);
        if (image?.blobUrl) {
            URL.revokeObjectURL(image.blobUrl);
        }

        this.pastedImages.delete(imageId);
        await this.storage.deleteImageBlob(imageId);

        this.emit('imageDeleted', { imageId });
    }

    /**
     * Get all images for a tab
     */
    getImagesByTab(tabId) {
        return Array.from(this.pastedImages.entries())
            .filter(([_, image]) => image.tabId === tabId)
            .map(([id, _]) => id);
    }

    /**
     * Clear images for a tab
     */
    async clearTabImages(tabId) {
        const images = this.getImagesByTab(tabId);
        for (const imageId of images) {
            await this.deleteImage(imageId);
        }
    }
}

export default ImageClipboardEngine;
