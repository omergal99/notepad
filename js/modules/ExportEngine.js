/**
 * EXPORT ENGINE
 * Plain text, Markdown, HTML, PDF export generators
 * Phase 7 implementation
 */

import { EventEmitter } from '../utils/eventEmitter.js';

export class ExportEngine extends EventEmitter {
    constructor() {
        super();
    }

    /**
     * Export as plain text
     */
    exportAsText(content, filename = 'document') {
        const blob = new Blob([content], { type: 'text/plain' });
        this.downloadBlob(blob, `${filename}.txt`);
        this.emit('exported', { format: 'txt', filename });
    }

    /**
     * Export as Markdown
     */
    exportAsMarkdown(content, filename = 'document') {
        const blob = new Blob([content], { type: 'text/markdown' });
        this.downloadBlob(blob, `${filename}.md`);
        this.emit('exported', { format: 'md', filename });
    }

    /**
     * Export as HTML
     */
    exportAsHTML(content, filename = 'document') {
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${filename}</title>
    <style>
        body {
            font-family: 'Courier New', monospace;
            white-space: pre-wrap;
            word-wrap: break-word;
            padding: 20px;
            background-color: #f8f7f2;
        }
        pre {
            background-color: white;
            padding: 20px;
            border-radius: 4px;
            overflow-x: auto;
        }
    </style>
</head>
<body>
    <pre>${this.escapeHTML(content)}</pre>
</body>
</html>
        `;

        const blob = new Blob([html], { type: 'text/html' });
        this.downloadBlob(blob, `${filename}.html`);
        this.emit('exported', { format: 'html', filename });
    }

    /**
     * Export as PDF (via print dialog)
     */
    exportAsPDF(content, filename = 'document') {
        const printWindow = window.open('', '', 'width=800,height=600');
        printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
    <title>${filename}</title>
    <style>
        body {
            font-family: 'Courier New', monospace;
            white-space: pre-wrap;
            word-wrap: break-word;
            margin: 20px;
        }
    </style>
</head>
<body>
    <pre>${this.escapeHTML(content)}</pre>
</body>
</html>
        `);
        printWindow.document.close();
        printWindow.print();

        this.emit('exported', { format: 'pdf', filename });
    }

    /**
     * Export as JSON (full state backup)
     */
    exportAsJSON(data, filename = 'backup') {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        this.downloadBlob(blob, `${filename}.json`);
        this.emit('exported', { format: 'json', filename });
    }

    /**
     * Download blob helper
     */
    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Escape HTML special characters
     */
    escapeHTML(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, char => map[char]);
    }
}

export default ExportEngine;
