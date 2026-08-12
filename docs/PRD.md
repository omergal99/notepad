# Product Requirements Document (PRD)
## Notepad Online - Private Desktop Text Editor

**Version:** 1.0  
**Last Updated:** August 12, 2026  
**Status:** Active Development (Phase 1 Complete)

---

## 📋 Executive Summary

**Notepad Online** is a production-grade, modular, **local-first**, privacy-focused desktop-style text editor that runs entirely in the browser. The application offers a multi-window, multi-tab desktop interface with zero external HTTP dependencies, comprehensive offline support via PWA, and enterprise-grade feature support for professional writers and developers.

**Target Users:**
- Privacy-conscious developers and writers
- Teams requiring air-gapped local environments
- Users needing desktop-like editing without installation
- Organizations avoiding cloud-based text storage

---

## 🎯 Core Requirements

### Functional Requirements

#### F1: Multi-Window Desktop Interface
- [ ] Create, minimize, maximize, restore, close windows dynamically
- [ ] Drag windows freely within viewport
- [ ] Resize windows using corner and edge handles (8 positions)
- [ ] Maintain independent window states and restore on reload
- [ ] FancyZones-style snapping to screen edges (50/50 left/right, 4 quadrants)
- [ ] Dock/taskbar displaying active and minimized windows
- [ ] Z-index stacking with active window highlighting

#### F2: Multi-Tab Editing
- [ ] Create unlimited tabs within windows
- [ ] Switch between tabs with visual indication of active tab
- [ ] Show unsaved indicator (●) on modified tabs
- [ ] Close tabs individually or via shortcut
- [ ] Reorder tabs via drag-and-drop (planned Phase 5)
- [ ] Per-tab cursor position preservation
- [ ] Per-tab undo/redo stacks (independent history)

#### F3: Text Editor Core
- [ ] Full textarea-based text editing with spellcheck disabled
- [ ] Line numbers gutter (synchronized scrolling)
- [ ] Status bar showing line, column, character count, word count, encoding
- [ ] Minimap overview column (120px width, draggable viewport)
- [ ] Support for monospace fonts with configurable size (10-32px)
- [ ] Tab width configuration (2, 4, 8 spaces)
- [ ] Text wrapping toggle
- [ ] Configurable right margin guide (80 characters default)
- [ ] Word count and character count statistics

#### F4: Image Clipboard Support
- [ ] Paste images directly from clipboard into editor
- [ ] Render inline image cards with preview thumbnails
- [ ] Copy images from editor back to clipboard
- [ ] Delete images from editor
- [ ] Resize images inline (planned Phase 6)
- [ ] Store image blobs in IndexedDB
- [ ] Handle clipboard permission denied gracefully

#### F5: Search & Replace
- [ ] Find text with case-sensitive toggle
- [ ] Whole word matching
- [ ] Regular expression (regex) support
- [ ] Find next/previous navigation
- [ ] Replace single match or all matches
- [ ] Match highlighting in editor
- [ ] Match count display
- [ ] Keyboard shortcut access (Ctrl+F / Cmd+F)

#### F6: Export Functionality
- [ ] Export as plain text (.txt)
- [ ] Export as Markdown (.md)
- [ ] Export as HTML with styling
- [ ] Export as PDF via print dialog
- [ ] Export as JSON backup (full state including metadata)
- [ ] Download file automatically with appropriate extension

#### F7: Preferences & Configuration
- [ ] Global editor preferences (font, size, colors, theme)
- [ ] Per-tab preferences override
- [ ] Save up to 5 preset configurations
- [ ] Load presets from history
- [ ] Apply presets to single tab or all future tabs
- [ ] Dark/Light mode toggle with system preference detection
- [ ] Auto-save configuration (enabled/disabled, interval)
- [ ] Backup creation toggle

#### F8: Undo & Redo
- [ ] Per-tab undo stack (100 actions default)
- [ ] Per-tab redo stack
- [ ] Undo on Ctrl+Z / Cmd+Z
- [ ] Redo on Ctrl+Y / Cmd+Y
- [ ] Clear redo stack on new action
- [ ] Visual indicator for undo/redo availability

#### F9: Auto-Save & Persistence
- [ ] Automatic background save to localStorage/IndexedDB
- [ ] Configurable save interval (default 60 seconds)
- [ ] Save on window unload with confirmation
- [ ] Create backup copies in IndexedDB
- [ ] Recover from crashes automatically
- [ ] Handle concurrent multi-tab edits

#### F10: Keyboard Shortcuts
- [ ] Ctrl+S / Cmd+S: Save current tab
- [ ] Ctrl+Z / Cmd+Z: Undo
- [ ] Ctrl+Y / Cmd+Y: Redo
- [ ] Ctrl+F / Cmd+F: Find
- [ ] Ctrl+H / Cmd+H: Replace
- [ ] Ctrl+A / Cmd+A: Select all
- [ ] Ctrl+N / Cmd+N: New window
- [ ] Ctrl+T / Cmd+T: New tab
- [ ] Ctrl+W / Cmd+W: Close tab
- [ ] Ctrl+, / Cmd+,: Open preferences
- [ ] Ctrl+? / Cmd+?: Show help

#### F11: Offline Support & PWA
- [ ] Installable as standalone app (PWA)
- [ ] Works completely offline after first load
- [ ] Service Worker caching strategy (network-first)
- [ ] Automatic cache updates
- [ ] Web app manifest with icons and metadata
- [ ] Installable on desktop and mobile
- [ ] Share target support for receiving files

#### F12: Help & Documentation
- [ ] Built-in keyboard shortcuts reference
- [ ] About dialog with version and features list
- [ ] Links to documentation
- [ ] Tooltips on UI controls
- [ ] Responsive design explanation

### Non-Functional Requirements

#### NF1: Privacy & Security
- [ ] **Zero external HTTP calls** (air-gapped)
- [ ] **100% local data storage** (no cloud sync)
- [ ] **No telemetry or tracking** (no analytics)
- [ ] **No cookies** (no persistent third-party tracking)
- [ ] **Content Security Policy (CSP)** headers
- [ ] **HTTPS required** for Service Worker
- [ ] Sanitize HTML input to prevent XSS
- [ ] No external API dependencies

#### NF2: Performance
- [ ] Initial load < 500ms (cached < 200ms)
- [ ] Window drag/resize smooth at 60fps
- [ ] Textarea input responsive (< 50ms latency)
- [ ] Line number sync with scroll (debounced)
- [ ] Storage operations async (non-blocking UI)
- [ ] Memory usage < 50MB for typical workload

#### NF3: Compatibility
- [ ] Chrome 61+ (ES6 modules)
- [ ] Firefox 67+
- [ ] Safari 11.1+
- [ ] Edge 79+
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)
- [ ] Tablets (iPad, Android tablets)

#### NF4: Accessibility
- [ ] Semantic HTML structure
- [ ] ARIA labels on interactive elements
- [ ] Keyboard-navigable UI
- [ ] Color contrast WCAG AA compliant
- [ ] Focus indicators visible
- [ ] Screen reader friendly

#### NF5: Storage
- [ ] localStorage: 5-10MB (app state, preferences)
- [ ] IndexedDB: 50MB+ (notes, images, backups)
- [ ] Quota management with user warnings
- [ ] Automatic fallback on quota exceeded
- [ ] Data export/import in JSON format
- [ ] Corrupted data recovery

#### NF6: Responsive Design
- [ ] Desktop-first layout (1920x1080+)
- [ ] Tablet layout (768px - 1024px)
- [ ] Mobile layout (480px - 768px)
- [ ] Small phone layout (< 480px)
- [ ] Landscape mode optimization (< 600px height)
- [ ] Touch-friendly controls (44px minimum tap targets)

---

## 🎨 Design Specifications

### Visual Design
- **Brand Color**: #0078D4 (Windows Blue)
- **Accent Color**: #107C10 (Success Green)
- **Background**: #F8F7F2 (Cream Light)
- **Editor Surface**: #FFFFFF (White)
- **Dark Mode Background**: #1E1E1E
- **Dark Mode Surface**: #252526
- **Typography**: System UI monospace for editor, -apple-system for UI
- **Shadows**: `0 12px 32px rgba(0,0,0,0.12)` for depth

### Window Design
- **Minimum Size**: 400px × 200px
- **Title Bar Height**: 32px with gradient when active
- **Control Buttons**: 32×32px (minimize, maximize, close)
- **Resize Handles**: 8px corners, 4px edges
- **Tab Bar Height**: 32px with 4px border on active tab
- **Dock Height**: 70px at bottom of screen

### Editor Layout
- **Line Numbers Width**: 50-80px (auto-sized)
- **Minimap Width**: 120px
- **Status Bar Height**: 24px
- **Monospace Font**: Fira Code, Consolas, or system monospace
- **Font Size Range**: 10-32px (default 14px)
- **Line Height**: 1.5 × font size

---

## 📊 Edge Cases (EC) & Error Handling

| EC | Scenario | Solution |
|----|---------|---------| 
| EC-01 | localStorage quota exceeded | Fallback to IndexedDB automatically |
| EC-02 | Window drag/resize laggy | CSS `transform: translate3d()` for GPU acceleration |
| EC-03 | Concurrent multi-tab edits | Debounce storage writes (300ms), UUID v4 per window/tab |
| EC-04 | Clipboard API permission denied | Fallback to base64 download link for images |
| EC-05 | User closes with unsaved changes | `beforeunload` event with confirmation dialog |
| EC-06 | Mobile < 768px width | Single-window responsive layout, hide dock |
| EC-07 | Corrupted localStorage data | Recovery to clean state, keep IndexedDB backup |

---

## 🔄 Data Flow Architecture

```
User Input (Keyboard, Mouse, Paste)
    ↓
Keyboard Shortcuts / Event Handlers
    ↓
Module-Specific Logic
    (EditorComponent, WindowManager, ImageClipboardEngine, etc.)
    ↓
EventEmitter (Pub/Sub)
    ↓
StorageEngine (Write to IndexedDB/localStorage)
    ↓
Browser Storage APIs
    ↓
IndexedDB / localStorage (Persistent on Disk)
```

---

## 📈 Metrics & Success Criteria

### Performance Metrics
- Initial load time: < 500ms
- Time to interactive: < 1s
- Window drag/resize framerate: 60fps
- Storage write latency: < 100ms
- Memory usage: < 50MB

### User Metrics
- Keyboard shortcut discoverability: 80%+
- Feature adoption rate: 70%+
- User retention (7-day): 60%+
- Time to create first note: < 10 seconds

### Quality Metrics
- Code coverage: > 80%
- Bug rate: < 1 per 1000 lines
- Performance budget: < 200KB total
- Accessibility score: > 90 (Lighthouse)

---

## 🚀 Deployment & Distribution

### Hosting Options
1. **GitHub Pages**: Static hosting with auto-deploy on push
2. **GitLab Pages**: Alternative static hosting
3. **Self-Hosted**: Any static file server (nginx, Apache, etc.)

### Browser Extension (Planned Phase 5)
- Browser extension for quick access
- Optional cloud sync backend integration
- Sync across devices (opt-in)

### Native App (Planned Phase 6)
- Electron-based desktop app
- Tauri-based lightweight alternative
- Synchronized with web version

---

## 📅 Release Timeline

| Phase | Feature | Timeline | Status |
|-------|---------|----------|--------|
| 1 | Project setup, HTML canvas | Week 1 | ✅ Complete |
| 2 | StorageEngine, IndexedDB integration | Week 2 | 🔄 Active |
| 3 | WindowManager, window rendering | Week 3 | ⏳ Pending |
| 4 | TabManager, EditorComponent | Week 4 | ⏳ Pending |
| 5 | PreferencesManager, UI integration | Week 5 | ⏳ Pending |
| 6 | ImageClipboardEngine, image support | Week 6 | ⏳ Pending |
| 7 | Search/Replace, Export, Menus | Week 7 | ⏳ Pending |
| 8 | PWA, Service Worker, Tests, CI/CD | Week 8 | ⏳ Pending |

---

## 🎁 Nice-to-Have Features (Future Releases)

- Markdown live preview (split pane)
- Syntax highlighting for code blocks
- Note tagging and search
- Full-text search across all notes
- End-to-End Encryption (E2EE)
- Optional WebDAV/CouchDB sync
- Collaborative editing (local network)
- Code snippet sharing (local QR codes)
- Custom font upload
- Audio/video recording in notes
- Browser extension
- Native desktop app (Electron/Tauri)

---

## 🔐 Compliance & Standards

- ✅ WCAG 2.1 AA accessibility
- ✅ Schema.org structured data
- ✅ OpenGraph social sharing
- ✅ Twitter Card metadata
- ✅ CSP security headers
- ✅ PWA standards (W3C Web App Manifest)
- ✅ ES6 module specification
- ✅ Semantic HTML5

---

## 🤝 Success Definition

The product is **successful** when:
1. ✅ All Phase 1-8 features implemented and tested
2. ✅ Zero external HTTP calls (verified via DevTools Network tab)
3. ✅ 100% test coverage for core modules
4. ✅ Lighthouse performance score > 90
5. ✅ Lighthouse accessibility score > 90
6. ✅ Works offline (verified via DevTools offline mode)
7. ✅ Installable as PWA on desktop and mobile
8. ✅ Load time < 500ms cached, < 2s uncached
9. ✅ Zero critical security vulnerabilities
10. ✅ Documentation complete (API, Architecture, User Guide)

---

**Document prepared for Phase 2 implementation.**
