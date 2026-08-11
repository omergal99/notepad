/**
 * SEARCH & REPLACE ENGINE
 * Find, Replace, Match Case, Regex search with match highlighting
 * Phase 7 implementation
 */

import { EventEmitter } from '../utils/eventEmitter.js';

export class SearchReplaceEngine extends EventEmitter {
    constructor() {
        super();
        this.searchQuery = '';
        this.replaceQuery = '';
        this.matchCase = false;
        this.wholeWord = false;
        this.useRegex = false;
        this.matches = [];
        this.currentMatchIndex = 0;
    }

    /**
     * Search in content
     */
    search(content, query, options = {}) {
        this.searchQuery = query;
        this.matchCase = options.matchCase || false;
        this.wholeWord = options.wholeWord || false;
        this.useRegex = options.useRegex || false;

        if (!query) {
            this.matches = [];
            this.emit('searchComplete', { matches: [] });
            return [];
        }

        let pattern;
        try {
            if (this.useRegex) {
                pattern = new RegExp(query, this.matchCase ? 'g' : 'gi');
            } else {
                let escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                if (this.wholeWord) {
                    escapedQuery = `\\b${escapedQuery}\\b`;
                }
                pattern = new RegExp(escapedQuery, this.matchCase ? 'g' : 'gi');
            }
        } catch (error) {
            this.emit('searchError', { error });
            return [];
        }

        this.matches = [];
        let match;

        while ((match = pattern.exec(content)) !== null) {
            this.matches.push({
                start: match.index,
                end: match.index + match[0].length,
                text: match[0]
            });
        }

        this.currentMatchIndex = 0;
        this.emit('searchComplete', { matches: this.matches, count: this.matches.length });

        return this.matches;
    }

    /**
     * Find next match
     */
    findNext() {
        if (this.matches.length === 0) return null;

        this.currentMatchIndex = (this.currentMatchIndex + 1) % this.matches.length;
        const match = this.matches[this.currentMatchIndex];

        this.emit('matchFound', { match, index: this.currentMatchIndex, total: this.matches.length });

        return match;
    }

    /**
     * Find previous match
     */
    findPrevious() {
        if (this.matches.length === 0) return null;

        this.currentMatchIndex = (this.currentMatchIndex - 1 + this.matches.length) % this.matches.length;
        const match = this.matches[this.currentMatchIndex];

        this.emit('matchFound', { match, index: this.currentMatchIndex, total: this.matches.length });

        return match;
    }

    /**
     * Replace current match
     */
    replaceCurrent(content, replaceWith) {
        if (this.matches.length === 0) return content;

        const match = this.matches[this.currentMatchIndex];
        const newContent = content.substring(0, match.start) + replaceWith + content.substring(match.end);

        // Recalculate matches with new content
        const offset = replaceWith.length - match.text.length;
        this.matches = this.matches.map((m, index) => {
            if (index > this.currentMatchIndex) {
                return {
                    ...m,
                    start: m.start + offset,
                    end: m.end + offset
                };
            }
            return m;
        });

        this.matches.splice(this.currentMatchIndex, 1);

        this.emit('matchReplaced', { match, replaceWith });

        return newContent;
    }

    /**
     * Replace all matches
     */
    replaceAll(content, replaceWith) {
        if (this.matches.length === 0) return content;

        let newContent = content;
        let offset = 0;

        // Sort matches by position in reverse order to avoid offset issues
        const sortedMatches = [...this.matches].reverse();

        for (const match of sortedMatches) {
            newContent = newContent.substring(0, match.start) + replaceWith + newContent.substring(match.end);
        }

        this.emit('allMatchesReplaced', { count: this.matches.length });

        this.matches = [];
        this.currentMatchIndex = 0;

        return newContent;
    }

    /**
     * Get current match
     */
    getCurrentMatch() {
        if (this.matches.length === 0) return null;
        return this.matches[this.currentMatchIndex];
    }

    /**
     * Clear search
     */
    clear() {
        this.matches = [];
        this.currentMatchIndex = 0;
        this.searchQuery = '';
        this.replaceQuery = '';
        this.emit('searchCleared');
    }

    /**
     * Get match count
     */
    getMatchCount() {
        return this.matches.length;
    }

    /**
     * Get current match index
     */
    getCurrentMatchIndex() {
        return this.matches.length > 0 ? this.currentMatchIndex + 1 : 0;
    }
}

export default SearchReplaceEngine;
