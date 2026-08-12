# Technical Blueprint
## Notepad Online Architecture & Implementation Guide

**Version:** 1.0  
**Last Updated:** August 12, 2026  
**Phase:** 1-2 (Foundation & Enhancement)

---

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                  NOTEPAD ONLINE APP                      │
│                    (app.js Orchestrator)                 │
└────────────────────┬────────────────────────────────────┘
                     │
     ┌───────────────┼────────────────┐
     │               │                │
┌────▼────┐  ┌───────▼──────┐  ┌────▼──────────┐
│ Window  │  │ Tab          │  │ Editor        │
│ Manager │  │ Manager      │  │ Component     │
└────┬────┘  └───────┬──────┘  └────┬──────────┘
     │               │               │
     ├───────────────┼───────────────┤
     │               │               │
┌────▼───────────────▼───────────────▼────┐
│        StorageEngine (Data Persistence)  │
├──────────────────────────────────────────┤
│  localStorage (5-10MB) + IndexedDB (50MB)│
└────────────────────┬─────────────────────┘
                     │
     ┌───────────────┼────────────────────┐
     │               │                    │
┌────▼────┐  ┌───────▼─────┐  ┌─────────▼┐
│ Keyboard│  │   Theme     │  │ History  │
│ Shortcuts   │   Engine    │  │ Engine   │
└─────────┘  └─────────────┘  └──────────┘

     ┌────────────────────────────────────┐
     │  ImageClipboard / Export / Search  │
     │          (Feature Modules)         │
     └────────────────────────────────────┘
```

---

## 📦 Module Dependency Graph

### Core Dependency Chain
```
app.js (entry point)
  ├─ StorageEngine (foundation)
  ├─ WindowManager
  │   └─ WindowComponent (renders DOM)
  │       └─ domUtils (DOM helpers)
  ├─ TabManager
  │   └─ StorageEngine
  ├─ EditorComponent
  │   ├─ domUtils
  │   └─ TabManager
  ├─ PreferencesManager
  │   └─ StorageEngine
  ├─ HistoryEngine (stateless stack)
  ├─ ImageClipboardEngine
  │   └─ StorageEngine (IndexedDB for blobs)
  ├─ ExportEngine (stateless)
  ├─ SearchReplaceEngine (stateless)
  ├─ KeyboardShortcuts
  │   └─ eventEmitter
  └─ ThemeEngine
      └─ domUtils

eventEmitter.js (pub/sub utility - imported by all)
domUtils.js (DOM helpers - imported by rendering modules)
```

### Event Communication Map
```
KeyboardShortcuts: Ctrl+S → EventEmitter.emit('save')
                       ↓
                 StorageEngine.saveNote()
                       ↓
                 IndexedDB write
                       ↓
                 StorageEngine.emit('noteSaved')
                       ↓
                 UI updates (visual feedback)
```

---

## 💾 Storage Architecture

### LocalStorage Schema
```json
{
  "np_global_prefs": {
    "theme": "light",
    "autoSave": true,
    "autoSaveInterval": 60000,
    "darkMode": false
  },
  "np_window_states": [
    {
      "windowId": "uuid-1",
      "x": 100,
      "y": 100,
      "width": 800,
      "height": 600,
      "minimized": false,
      "maximized": false
    }
  ],
  "np_preset_history": [
    {
      "name": "Default",
      "fontFamily": "monospace",
      "fontSize": 14,
      "theme": "light"
    }
  ],
  "np_recovery_backup": "...(full state backup if corruption detected)"
}
```

### IndexedDB Schema
```
Database: notepad-online
├── Store: notes
│   ├── Key: noteId (auto-increment)
│   ├── Index: tabId
│   ├── Index: windowId
│   ├── Index: createdAt
│   └── Value: {
│         id, tabId, windowId, content, wordCount, 
│         charCount, lastModified, isDirty
│       }
│
├── Store: images
│   ├── Key: imageId (UUID v4)
│   ├── Index: tabId
│   ├── Value: {
│         id, tabId, fileName, blob, size, type, 
│         pastedAt
│       }
│
├── Store: windowStates
│   ├── Key: windowId (UUID v4)
│   └── Value: (full window state object)
│
├── Store: tabStates
│   ├── Key: tabId (UUID v4)
│   ├── Index: windowId
│   └── Value: (full tab state object)
│
├── Store: backups
│   ├── Key: backupId (UUID v4)
│   ├── Index: createdAt
│   └── Value: {
│         id, timestamp, type (auto|manual), 
│         fullState (JSON string)
│       }
│
└── Store: preferences
    ├── Key: presetId (UUID v4)
    └── Value: {
          id, name, fontFamily, fontSize, colors, 
          tabWidth, autoIndent, createdAt
        }
```

---

## 🔄 Data Flow Patterns

### Pattern 1: User Types Text
```
User: key press in textarea
  ↓
EditorComponent: onInput event handler
  ↓
EditorComponent: update line numbers, status bar
  ↓
EditorComponent: emit('contentChanged', {tabId, content})
  ↓
TabManager: listen for contentChanged
  ↓
TabManager: mark tab as dirty, update cursor position
  ↓
HistoryEngine: push new action to undo stack
  ↓
[Auto-save timer (60s) or manual Ctrl+S]
  ↓
StorageEngine: saveNote(tabId, content)
  ↓
StorageEngine: write to IndexedDB
  ↓
StorageEngine: emit('noteSaved')
  ↓
UI: remove unsaved indicator (●)
```

### Pattern 2: User Pastes Image
```
User: Ctrl+V with image in clipboard
  ↓
ImageClipboardEngine: onPaste handler
  ↓
ImageClipboardEngine: Clipboard API → blob
  ↓
ImageClipboardEngine: store blob in IndexedDB
  ↓
ImageClipboardEngine: generate blob URL
  ↓
ImageClipboardEngine: create inline image card DOM
  ↓
EditorComponent: render image card in editor
  ↓
EditorComponent: emit('imagesPasted')
  ↓
StorageEngine: saveImage(imageBlob)
  ↓
StorageEngine: write to IndexedDB images store
```

### Pattern 3: User Changes Preferences
```
User: change font size in preferences modal
  ↓
PreferencesManager: onPreferenceChange handler
  ↓
PreferencesManager: determine scope (global vs tab)
  ↓
PreferencesManager: updatePreferences({fontSize: 16})
  ↓
PreferencesManager: emit('preferencesChanged')
  ↓
EditorComponent: listen for preferencesChanged
  ↓
EditorComponent: applyPreferences()
  ↓
EditorComponent: update textarea CSS
  ↓
StorageEngine: savePreferences(prefs)
  ↓
StorageEngine: write to localStorage
```

---

## 🎯 Module Specifications (Phase 2)

### StorageEngine.js (400+ lines)

**Purpose**: Unified persistence layer abstracting localStorage and IndexedDB

**Public API**:
```javascript
class StorageEngine extends EventEmitter {
  // Initialization
  async init() // Initialize IndexedDB connection
  get initPromise() // Wait for async init
  
  // Note Operations
  async saveNote(tabId, content, metadata = {})
  async loadNote(noteId)
  async deleteNote(noteId)
  async getAllNotes()
  async getNotesByTab(tabId)
  
  // Image Operations
  async storeImageBlob(blob, tabId, fileName)
  async getImageBlob(imageId)
  async getImagesByTab(tabId)
  async deleteImage(imageId)
  
  // Window/Tab State
  async saveWindowState(windowState)
  async loadWindowState(windowId)
  async getAllWindowStates()
  async getTabState(tabId)
  
  // Preferences
  async savePreferences(prefs, scope = 'global')
  async loadPreferences(scope = 'global')
  async savePreset(presetName, preferences)
  
  // Backup/Restore
  async createBackup(type = 'auto')
  async getBackup(backupId)
  async restoreBackup(backupId)
  async getAllBackups()
  
  // Data Management
  async exportAllData() // Return JSON string
  async importData(jsonData) // Parse and restore
  async clearAll()
  
  // Quota Management
  getStorageUsage()
  getStorageQuota()
  estimateQuotaPercentage()
}
```

**Events Emitted**:
- `ready`: StorageEngine initialized
- `quotaUpdated`: Storage quota status changed
- `quotaWarning`: Storage at 80% capacity
- `quotaExceeded`: Storage quota full, falling back to IndexedDB
- `cleared`: All data cleared
- `imported`: Data import completed
- `noteSaved`: Note persisted
- `imageStored`: Image blob persisted
- `backupCreated`: Backup completed

**Error Handling**:
- QuotaExceededError → Fallback to IndexedDB
- CorruptedData → Try/catch with recovery backup
- InitializationError → Retry with exponential backoff

---

## 🔐 Security Measures

### Content Security Policy (CSP)
```
default-src 'self'
script-src 'self'
style-src 'self' 'unsafe-inline'
img-src 'self' data: blob:
font-src 'self'
object-src 'none'
form-action 'none'
frame-ancestors 'none'
```

### Input Sanitization
```javascript
// All user-generated content sanitized
function sanitizeHTML(html) {
  const div = document.createElement('div');
  div.textContent = html; // Convert to text first
  return div.innerHTML; // Re-render as safe HTML
}
```

### No External Dependencies
- ✅ Zero CDN calls
- ✅ UUID v4 generated locally or imported as ES module
- ✅ All processing client-side
- ✅ No telemetry endpoints

---

## 🎨 Styling Architecture

### CSS Variable System
```css
:root {
  /* Colors - Light Mode */
  --bg-cream: #F8F7F2;
  --bg-white: #FFFFFF;
  --text-primary: #333333;
  --text-secondary: #666666;
  --accent-blue: #0078D4;
  --accent-green: #107C10;
  --accent-red: #D83B01;
  
  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  
  /* Shadows */
  --shadow-sm: 0 2px 4px rgba(0,0,0,0.1);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.15);
  --shadow-lg: 0 12px 32px rgba(0,0,0,0.12);
  
  /* Z-Index Levels */
  --z-dock: 100;
  --z-window-bg: 200;
  --z-window-active: 300;
  --z-modal-bg: 900;
  --z-modal-content: 1000;
}

body.dark-mode {
  --bg-cream: #1E1E1E;
  --bg-white: #252526;
  --text-primary: #E0E0E0;
  --text-secondary: #A0A0A0;
}
```

### Responsive Breakpoints
```css
/* Desktop (default) */
@media (max-width: 1024px) {
  /* Tablet */
}

@media (max-width: 768px) {
  /* Mobile */
}

@media (max-width: 480px) {
  /* Small phone */
}

@media (max-height: 600px) {
  /* Landscape mode */
}
```

---

## ⚡ Performance Optimizations

### Rendering
- ✅ CSS `transform: translate3d()` for GPU-accelerated dragging
- ✅ `will-change` on windows during drag
- ✅ Debounced line number sync (50ms)
- ✅ Debounced storage writes (300ms)
- ✅ Lazy-loaded minimap rendering

### Memory Management
- ✅ Blob URL revocation after use
- ✅ Event listener cleanup on component destroy
- ✅ Bounded undo/redo stacks (100 items)
- ✅ Image card virtual scrolling (future)

### Caching
- ✅ Service Worker network-first strategy
- ✅ CSS and JavaScript cached indefinitely
- ✅ HTML cached with fallback

---

## 🧪 Testing Strategy

### Unit Tests
- **StorageEngine**: 15+ tests for CRUD operations, quota handling, import/export
- **WindowManager**: 12+ tests for positioning, snapping, z-index
- **EditorComponent**: 10+ tests for content updates, line numbers, status bar
- **PreferencesManager**: 8+ tests for preferences, presets, scope handling

### Integration Tests
- **Window + Tab + Editor**: Creating window → tab → editing → saving
- **Drag/Resize + Storage**: Window operations → state persistence
- **Image Paste + Export**: Clipboard → storage → export format

### E2E Tests
- User flow: Create window → New tab → Type text → Search → Export → Close
- Edge cases: Quota exceeded, corrupted localStorage, concurrent edits
- Performance: Drag 10 windows at 60fps, handle 100k character note

### Test Runner
- **Framework**: Lightweight custom runner (Phase 8) or Vitest
- **Coverage Target**: > 80% for Phase 1-7
- **CI/CD**: Run on every push to GitHub/GitLab

---

## 🚀 Deployment Pipeline

### GitHub Actions Workflow
1. **Trigger**: Push to `main` branch
2. **Run Tests**: Execute all test suites
3. **Build Check**: Verify no build errors (no build step needed)
4. **Lint Check**: Basic syntax validation
5. **Deploy**: Push to `gh-pages` branch automatically

### GitLab CI Pipeline
1. **Test Stage**: Run all tests
2. **Build Stage**: Verify static files
3. **Deploy Stage**: Push to `gitlab-pages`

---

## 📊 Metrics & Monitoring

### Key Performance Indicators
- **Load Time**: Track initial load and cached load
- **Interaction Latency**: Measure keyboard input → display latency
- **Memory Usage**: Monitor heap size over time
- **Storage Usage**: Track localStorage/IndexedDB consumption
- **Error Rate**: Log JavaScript errors to IndexedDB for analysis

### Debugging Tools
- Chrome DevTools: Full access to DOM, Storage, Network, Performance
- Firefox Developer Edition: Same capabilities
- Service Worker debugging: chrome://inspect
- Storage quota: DevTools → Application → Storage

---

## 🔍 Code Organization Standards

### Module Structure
```javascript
import EventEmitter from './utils/eventEmitter.js';

export class MyModule extends EventEmitter {
  // Constructor with initialization
  constructor() {
    super();
    this.state = {};
    this.events = ['eventName1', 'eventName2'];
  }
  
  // Async initialization (if needed)
  async init() {
    // Setup
  }
  
  // Public API methods
  publicMethod() {
    // Implementation
    this.emit('eventName', data);
  }
  
  // Private helper methods (prefix with _)
  _privateHelper() {
    // Implementation
  }
}
```

### Naming Conventions
- **Classes**: PascalCase (WindowManager, EditorComponent)
- **Methods**: camelCase (saveNote, getWindowState)
- **Constants**: UPPER_SNAKE_CASE (MAX_UNDO_STACK_SIZE)
- **Private members**: _camelCase (_dbWrite, _sanitize)
- **Events**: snake-case-kebab (window-created, content-changed)

---

## 🎁 Extension Points (Future Enhancements)

### Plugin System (Phase 9)
- RegisterPlugin(pluginName, pluginClass)
- Plugin hooks for: beforeSave, afterLoad, onKeyPress, onExport
- Plugin API for accessing StorageEngine, EditorComponent

### Theme System (Phase 5+)
- RegisterTheme(themeName, colorMap)
- Custom theme editor in preferences modal
- Import/export themes

### Syntax Highlighting (Phase 6+)
- RegisterSyntaxHighlighter(language, highlighter)
- Language detection from file extension
- Lazy-load language packs

---

**Blueprint completed for Phase 2 implementation.**
