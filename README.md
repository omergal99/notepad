# 📝 Notepad Online - Private Desktop Text Editor

> A fast, private, **local-first** online notepad with multi-window desktop interface, tabs, auto-save, image paste support, and full offline capabilities.

## ✨ Features

### 🎯 Core Features
- ✅ **100% Local-First**: All data stored locally in your browser
- ✅ **Zero HTTP Calls**: Completely air-gapped and private—no telemetry, no tracking
- ✅ **Desktop-Style Windows**: Drag, resize, snap, minimize windows like a real OS
- ✅ **Multi-Tab Editing**: Unlimited tabs within windows with independent buffers
- ✅ **Image Clipboard**: Paste and copy images directly from/to clipboard
- ✅ **Search & Replace**: Full regex support with match highlighting
- ✅ **Multiple Exports**: TXT, MD, HTML, PDF, JSON backup formats
- ✅ **Auto-Save**: Automatic background saves (configurable interval)
- ✅ **Offline-First PWA**: Works completely offline, installable on desktop/mobile

### 🎨 Advanced Features
- **Line Numbers & Status Bar**: Show line, column, character count, word count
- **Syntax Highlighting**: Support for multiple highlight modes
- **Window Snapping**: FancyZones-style snapping (50/50 split, 4-quadrant)
- **Preferences & Presets**: Save up to 5 custom preference configurations
- **Dark/Light Mode**: Full theme support with system preference detection
- **Minimap**: Code overview column on the right side
- **Right Margin Guide**: Visual column guide at 80 characters
- **Responsive Design**: Mobile, tablet, and desktop optimized layouts

### 🔒 Privacy & Security
- **Content Security Policy (CSP)**: Strict security headers
- **No External APIs**: Zero external dependencies—all processing is local
- **No Cookies**: No tracking cookies or analytics
- **No Telemetry**: No data collection whatsoever
- **Open Source**: Audit the code yourself

## 🚀 Quick Start

### Option 1: Online (No Installation)
Visit the deployed version at `https://notepad.example.com/notepad/`

### Option 2: Local Development
```bash
# Clone the repository
git clone https://github.com/notepad-online/notepad-online.git
cd notepad-online

# Start a local web server
python3 -m http.server 8000

# Open in browser
# Navigate to http://localhost:8000/notepad/
```

### Option 3: Install as PWA
1. Open the app in your browser
2. Click "Install" (or menu → "Install app")
3. Choose location and click "Install"
4. App works offline after installation

## 📋 File Structure

```
notepad-online/
├── index.html                   # Main HTML shell with SEO & schema
├── manifest.json                # PWA manifest for installation
├── sw.js                         # Service Worker (offline support)
├── package.json                  # Project metadata
├── README.md                     # This file
├── css/
│   ├── main.css                 # Base resets & typography
│   ├── desktop.css              # Desktop layout & menu bar
│   ├── window.css               # Window frame & controls
│   ├── editor.css               # Text editor styling
│   ├── modal.css                # Modal dialogs & overlays
│   └── responsive.css           # Mobile & tablet layouts
├── js/
│   ├── app.js                   # Application entry point
│   ├── modules/
│   │   ├── StorageEngine.js     # LocalStorage + IndexedDB
│   │   ├── WindowManager.js     # Window lifecycle & z-index
│   │   ├── WindowComponent.js   # Individual window rendering
│   │   ├── TabManager.js        # Multi-tab engine
│   │   ├── EditorComponent.js   # Text editor core
│   │   ├── PreferencesManager.js# Settings & presets
│   │   ├── ImageClipboardEngine.js # Image paste/copy
│   │   ├── HistoryEngine.js     # Undo/Redo stack
│   │   ├── ExportEngine.js      # Export to formats
│   │   ├── SearchReplaceEngine.js # Find & replace
│   │   ├── KeyboardShortcuts.js # Keyboard bindings
│   │   └── ThemeEngine.js       # Dark/Light mode
│   └── utils/
│       ├── domUtils.js          # DOM helper utilities
│       └── eventEmitter.js      # Pub/Sub event bus
└── tests/                        # Unit tests (TODO)
    ├── storage.test.js
    ├── windowManager.test.js
    ├── editor.test.js
    └── preferences.test.js
```

## 🎮 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` / `Cmd+S` | Save Current Tab |
| `Ctrl+Z` / `Cmd+Z` | Undo |
| `Ctrl+Y` / `Cmd+Y` | Redo |
| `Ctrl+F` / `Cmd+F` | Find & Replace |
| `Ctrl+A` / `Cmd+A` | Select All |
| `Ctrl+N` / `Cmd+N` | New Window |
| `Ctrl+W` / `Cmd+W` | Close Current Tab |
| `Ctrl+T` / `Cmd+T` | New Tab in Window |
| `Ctrl+,` / `Cmd+,` | Open Preferences |
| `Ctrl+?` / `Cmd+?` | Show Help |

## 🛠️ Architecture

### Modular Design
The application uses **ES6 modules** with a strict separation of concerns:

- **StorageEngine**: Handles all data persistence (localStorage + IndexedDB)
- **WindowManager**: Manages window lifecycle, positioning, and z-index
- **TabManager**: Maintains multi-tab state and tab-specific settings
- **EditorComponent**: Core textarea with line numbers, status bar, minimap
- **PreferencesManager**: Global and tab-level settings with preset history
- **ThemeEngine**: Dark/Light mode and custom theme support

### Event-Driven Architecture
All modules communicate via a centralized **EventEmitter** using pub/sub pattern. This ensures:
- Loose coupling between components
- Easy testing and debugging
- Extensibility for future features

### Storage Strategy
- **localStorage**: Preferences, app state, small data (<5MB limit)
- **IndexedDB**: Notes, images, backups (can store up to 50MB+)
- **Fallback mechanism**: Automatic escalation from localStorage to IndexedDB

## 🔧 Configuration

### Auto-Save Settings
Edit in Preferences → Global Settings:
```
Auto-Save: Enabled (default)
Auto-Save Interval: 1 minute (60000ms)
Create Backup Copies: Enabled
```

### Editor Preferences
- **Font Family**: Monospace, Fira Code, System UI, etc.
- **Font Size**: 10–32px
- **Tab Width**: 2, 4, or 8 spaces
- **Text Wrapping**: Enable/Disable
- **Line Numbers**: Toggle display
- **Status Bar**: Toggle display
- **Minimap**: Toggle overview column

### Global Preferences
- **Theme**: Light or Dark mode
- **Auto-Save**: Enable/disable background saves
- **Backup Creation**: Enable/disable backup copies

## 📊 Edge Case Handling

| Edge Case | Solution |
|-----------|----------|
| localStorage quota exceeded (5MB) | Fallback to IndexedDB |
| Rapid drag/resize lag | CSS `transform: translate3d()` for acceleration |
| Concurrent multi-tab edits | Debounce storage writes (300ms) |
| Clipboard API denied | Fallback to base64 download link |
| Unsaved changes on close | `beforeunload` confirmation dialog |
| Mobile (< 768px width) | Responsive stacked single-window layout |
| Corrupted localStorage | Recovery to clean default state |

## 🧪 Testing

Tests are located in the `/tests/` directory:

```bash
# Run all tests (setup required)
npm test

# Run specific test suite
npm test -- storage.test.js
npm test -- editor.test.js
```

## 🌐 SEO & Schema

The app is fully optimized for search term "**NOTEPAD ONLINE**":
- ✅ Meta tags for social sharing (OpenGraph, Twitter Card)
- ✅ Schema.org JSON-LD WebApplication markup
- ✅ Rich snippets with features and ratings
- ✅ Mobile-friendly responsive design
- ✅ Sitemap for search engines (if deployed)

## 📦 Deployment

### GitHub Pages
See `.github/workflows/deploy.yml` for automatic deployment on push to `main` branch.

### GitLab Pages
See `.gitlab-ci.yml` for automatic deployment.

### Self-Hosted
```bash
# Copy all files to your web server
cp -r notepad/* /var/www/html/notepad/

# Ensure HTTPS is enabled (required for Service Worker)
# Update manifest.json start_url to match your domain
```

## 🔐 Privacy Audit

To verify zero external HTTP calls:
1. Open the app in browser
2. Open DevTools → Network tab
3. Perform any note operation (create, edit, save, export)
4. Confirm **no external requests** are made

Local-only data flow:
- User types in textarea → Stored in IndexedDB → Never leaves browser

## 🚧 Known Limitations

- **Browser Support**: ES6 modules required (Chrome 61+, Firefox 67+, Safari 11.1+)
- **Max Note Size**: Limited by browser quota (50MB+ typical)
- **Sync**: No cloud sync (by design—local-first only)
- **Encryption**: Not yet implemented (planned for v1.1)

## 🗺️ Future Roadmap

### v1.1 (Planned)
- End-to-End Encryption (E2EE) with Web Crypto API
- Markdown Live Preview split-pane
- Syntax highlighting themes (Dracula, Monokai, etc.)
- Note tagging and search
- Full-text search across all notes

### v1.2+ (Planned)
- Optional WebDAV/CouchDB cloud sync
- Collaborative editing (local network)
- Code snippet sharing (local QR codes)
- Custom font upload
- Audio/video recording in notes

## 📖 Documentation

- [API.md](./docs/API.md) - Complete module API reference
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - System design deep dive
- [PLAN.md](./docs/PLAN.md) - Implementation roadmap
- [ALGORITHMS.md](./docs/ALGORITHMS.md) - Search, storage, snapping algorithms

## 🐛 Bug Reports & Feature Requests

Please report issues and feature requests on [GitHub Issues](https://github.com/notepad-online/notepad-online/issues).

## 📄 License

MIT License - See LICENSE file for details.

---

**Built with ❤️ for privacy-conscious developers and writers.**

Made with vanilla JavaScript (no frameworks), 100% local-first, zero telemetry.

**Questions?** See [Privacy Audit](./docs/PRIVACY.md) or [FAQ](./docs/FAQ.md).
