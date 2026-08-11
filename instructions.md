# MASTER AI SYSTEM PROMPT: COMPLETE LOCAL-FIRST ONLINE NOTEPAD & WINDOW MANAGER

> **ROLE & DIRECTIVE**: You are a Principal Frontend Architect & Senior Software Engineer. Your task is to build a production-grade, modular, local-first, privacy-focused, desktop-style Online Notepad Web Application.
> 
> **EXECUTION REQUIREMENT**: Read this complete specification carefully. You must execute the implementation phase-by-phase without skipping any details, edge cases, file structures, or functionality outlined below.

---

## 1. PROJECT OVERVIEW & ARCHITECTURAL PHILOSOPHY

1. **Local-First & Air-Gapped Security Model**:
   - Zero external HTTP/API requests or telemetry. All user data (notes, window states, preferences, pasted images) is stored strictly in the browser sandbox (`localStorage` and `IndexedDB`).
   - Air-gapped level privacy: Even sensitive temporary data (e.g., passwords or draft notes) never leaves the local browser environment.
   - Strict Content Security Policy (CSP): `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:;`.

2. **Clean Modular Vanilla JS (ES Modules)**:
   - Built entirely with HTML5, CSS3, and Vanilla Modern JavaScript (ES6+ ES Modules).
   - Zero heavy framework dependencies (No React/Vue/Angular).
   - Highly scalable event-driven architecture using custom event emitters and state management controllers.

3. **Desktop Windowing System Simulation**:
   - Simulated desktop workspace with an off-white/light cream background (`#F8F7F2` or `#F4F2EB`) to reduce glare and eye strain.
   - Linux Notepad desktop window aesthetic: Draggable, resizable, minifiable, and maximizable window components with crisp borders and soft drop shadows (`0 12px 32px rgba(0,0,0,0.12)`).
   - Advanced window snapping (FancyZones style): 50/50 vertical split, 4-quadrant split (top-left, top-right, bottom-left, bottom-right), or freeform position.
   - Minimum window bounds: **400px width x 200px height**. Maximum size: Viewport bounds.

4. **SEO & PWA Standards**:
   - Fully optimized for search query `"NOTEPAD ONLINE"` and related terms using rich meta tags and Schema.org JSON-LD (`WebApplication`).
   - Progressive Web App (PWA) enabled with `manifest.json` and offline `sw.js` (Service Worker).

---

## 2. COMPLETE FILE & DIRECTORY STRUCTURE

You must create and organize the project according to this exact file tree:

online-notepad-app/
├── index.html                      # Main HTML shell, SEO headers, Schema JSON-LD, Desktop canvas
├── manifest.json                   # Web App Manifest for PWA installation
├── package.json                    # Meta information, NPM scripts for local testing
├── README.md                       # Complete documentation with Mermaid diagrams & SEO overview
├── PRD.md                          # Product Requirements Document
├── BLUEPRINT.md                    # Technical System Architecture Blueprint
├── PLAN.md                         # Implementation Plan & Execution Roadmap
├── FUTURE_IDEAS.md                 # Extended feature roadmap & future enhancements
├── .gitlab-ci.yml                  # GitLab Pages deployment pipeline script
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Pages deployment workflow script
├── css/
│   ├── main.css                    # Base resets, typography, desktop canvas styling, CSS variables
│   ├── desktop.css                 # Desktop panel, dock/taskbar, snapping drop zone overlays
│   ├── window.css                  # Window frame, title bar, controls, shadows, resize handles
│   ├── editor.css                  # Textarea/Editor area, line numbers gutter, status bar, minimap
│   ├── modal.css                   # Preferences modal, About, Keyboard Shortcuts, Find/Replace drawer
│   └── responsive.css             # Mobile layout adaptation and touch interface styles
├── js/
│   ├── app.js                      # Application Entry Point & Controller Initialization
│   ├── modules/
│   │   ├── StorageEngine.js        # LocalStorage + IndexedDB abstraction layer with quota handling
│   │   ├── WindowManager.js        # Window lifecycle, z-index stack, positioning, snapping
│   │   ├── WindowComponent.js      # Individual Window Instance & DOM rendering
│   │   ├── TabManager.js           # Multi-tab engine inside window, tab bar reordering
│   │   ├── EditorComponent.js     # Text editor core, line numbering, caret tracking, word wrap
│   │   ├── PreferencesManager.js   # Global vs Tab preferences, last 5 presets history
│   │   ├── ImageClipboardEngine.js # Paste image, blob storage, inline cards, copy image back
│   │   ├── HistoryEngine.js        # Per-tab Undo/Redo stack manager
│   │   ├── ExportEngine.js         # Plain text, Markdown, HTML, PDF export generators
│   │   ├── SearchReplaceEngine.js  # Find, Replace, Match Case, Regex search with match highlighting
│   │   ├── KeyboardShortcuts.js    # Global & Window shortcut event handlers
│   │   └── ThemeEngine.js          # Dark/Light mode and custom tab theme manager
│   └── utils/
│       ├── domUtils.js             # DOM helper utilities and HTML sanitization
│       └── eventEmitter.js         # Pub/Sub event bus for modular communication
└── tests/
    ├── storage.test.js             # Unit tests for LocalStorage and IndexedDB fallback
    ├── windowManager.test.js       # Unit tests for window creation, z-index, and snapping
    ├── editor.test.js              # Unit tests for editor state, undo/redo, line counting
    └── preferences.test.js         # Unit tests for preference inheritance & preset history

---

## 3. FULL PRODUCT SPECIFICATIONS & FEATURES

### A. Desktop Workspace & Window Manager
- **Desktop Background**: Soft, light cream color (`#F8F7F2`) to keep white text editor windows visually distinct and easy on the eyes.
- **Initial Launch**: On first visit, automatically open 1 default window titled `"Untitled document 1"`.
- **Window Positioning & Bounds**:
  - Centered by default, taking 75% of the viewport width and height.
  - Strict minimum size constraints: **400px width x 200px height**.
- **Window Header UI & Controls**:
  - **Top-Left Header**:
    - **Open**: Opens file picker to upload local text files (`.txt`, `.md`, `.json`, `.js`, `.css`, `.html`).
    - **+ (Add Tab)**: Adds a new tab in the current window using default settings.
    - **+ Choptchik (Dropdown Arrow)**: Opens a dropdown to launch a new tab using one of the **last 5 saved Preference Presets**.
  - **Top-Right Header**:
    - **Save**: Saves current tab to local storage / downloads file.
    - **Delete**: Located adjacent to Save. Confirms and deletes the current notepad/tab.
    - **Minimize (_)**: Minifies window into the bottom taskbar panel.
    - **Maximize / Restore (□)**: Toggles full-desktop view or restores window size.
    - **Close (X)**: Closes current window (prompts if unsaved changes exist).
- **Window Dragging & Snapping**:
  - Smooth dragging via `pointerevents` and `requestAnimationFrame`.
  - **FancyZones Snapping**:
    - Drag to left edge -> Snap to Left 50% split.
    - Drag to right edge -> Snap to Right 50% split.
    - Drag to corners -> Snap to Quadrants (Top-Left, Top-Right, Bottom-Left, Bottom-Right).
- **Taskbar / Dock Panel**:
  - Floating bottom panel elevated 12px above screen bottom.
  - Displays minimized windows and active open windows. Clicking an item restores and brings focus/z-index to top.

---

### B. Multi-Tab System
- Each window supports unlimited tabs.
- Auto-naming: `Untitled document 1`, `Untitled document 2`, etc. Dynamic title updates on file open or manual rename.
- Drag-and-drop tab reordering. Close button (`×`) on each tab.
- Each tab maintains its own isolated text buffer, cursor position, scroll state, and undo/redo history stack.

---

### C. Text Editor Engine & View Features
- **View Customization Menu**:
  - **Display Line Numbers**: Toggleable left gutter showing synchronized line numbers.
  - **Display Right Margin**: Vertical guide line at column 80 (or custom column).
  - **Display Status Bar**: Shows Line number, Column number, Character count, Word count, Selection length, and File encoding (UTF-8).
  - **Display Overview Map (Minimap)**: Code outline preview column on right side.
  - **Display Grid Pattern**: Optional subtle dot/grid background for note canvas.
  - **Enable Text Wrapping**: Toggle `white-space: pre-wrap` vs `white-space: pre` (horizontal scroll).
  - **Do Not Split Words Over Two Lines**: Toggle `word-break: keep-all` / `overflow-wrap: break-word`.
  - **Highlight Current Line**: Active cursor line background tinting.
- **Editor Configurations**:
  - **Tab Width**: Configurable (2, 4, or 8 spaces). Pressing `Tab` key inserts spaces instead of losing focus.
  - **Automatic Indentation**: New line inherits indentation depth of the preceding line.
  - **Auto-Save**: Automatic background save every X minutes (Default: **1 minute**).
  - **Backup Copy Creation**: Creates a `.bak` backup copy in local storage prior to major saves.

---

### D. Preferences & Presets Management
- **Hierarchy of Settings**:
  - **Font Settings**: Font family (Monospace, Sans-Serif, Serif, Fira Code, System UI), Font Size, Text Color, Tab Background Color.
  - **Save as Default**: Applies current configuration as global default for all future windows/tabs.
  - **Save to This Tab Only**: Applies settings exclusively to the active tab.
- **Preset History (Last 5 Configurations)**:
  - System automatically stores the **last 5 preference configurations** used.
  - User can view, edit, name, set as default, or delete saved presets from the Preferences screen.
  - The "+" dropdown on the window header allows spawning new tabs directly formatted with any of these 5 presets.
- **Outer Desktop Global Settings**:
  - A side panel / main menu outside windows to control global app behavior, dark/light theme, and backup management.

---

### E. Image & Multimedia Handling (Paste & Copy Back)
- **Pasting Images**:
  - Listens for `paste` events on the editor.
  - If an image is pasted from clipboard, extracts image blob and stores it safely inside `IndexedDB`.
  - Renders an inline image thumbnail card inside the editor at cursor position.
- **Copying Images Back**:
  - Clicking an image card shows a "Copy Image to Clipboard" button utilizing native `navigator.clipboard.write([new ClipboardItem(...)])`.
  - Allows deleting or resizing image preview cards.

---

### F. Search & Replace Engine
- Shortcut: `Ctrl+F` / `Cmd+F` or Menu -> Edit -> Find & Replace.
- Controls: Search Query, Replace Query, Match Case toggle, Whole Word toggle, **Regular Expression (Regex) toggle**, Find Next/Previous, Replace, Replace All.
- Highlights all active text matches dynamically inside the editor.

---

### G. Import & Multi-Format Export
- **Import**: Open files via button or drag-and-drop onto window.
- **Export Formats**:
  - Plain Text (`.txt`)
  - Markdown (`.md`)
  - HTML document (`.html`)
  - Printable PDF (`.pdf`) via client-side print layout
  - Full State JSON Backup (`.json`)

---

### H. Complete Menu Bar Navigation
Each window features a standard top desktop menu:
- **File**: New Window, Open File, Save (`Ctrl+S`), Save As, Save All, Delete Notepad, Print, Close Tab (`Ctrl+W`), Close Window.
- **Edit**: Undo (`Ctrl+Z`), Redo (`Ctrl+Y`), Cut, Copy, Paste, Select All, Find & Replace (`Ctrl+F`).
- **View**: Line Numbers, Status Bar, Minimap, Font Zoom (+ / - / Reset), Highlight Mode (Plain Text, MD, HTML, JS, CSS), Dark/Light Mode.
- **Preferences**: Open Preferences Modal, Apply Preset 1..5.
- **Help**: Keyboard Shortcuts (`Ctrl+?`), About Notepad Online, Privacy Audit (Shows local storage usage).

---

## 4. SEO ARCHITECTURE & METADATA

Targeting top search intent: **"NOTEPAD ONLINE"**, "Private Online Notepad", "Tabbed Browser Text Editor".

1. **JSON-LD Schema (`index.html`)**:
```json
{
  "@context": "[https://schema.org](https://schema.org)",
  "@type": "WebApplication",
  "name": "Notepad Online - Private Desktop Text Editor",
  "applicationCategory": "UtilitiesApplication",
  "operatingSystem": "All",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "description": "Fast, private, local-first online notepad with multi-window desktop interface, tabs, auto-save, image paste support, and full offline capabilities."
}

EDGE CASE VALIDATION & STABILITY MATRIX
You MUST implement explicit handlers for all the following edge cases:
ID,Edge Case Scenario,System Safeguard & Recovery Strategy
EC-01,LocalStorage quota exceeded (5MB limit),Catch QuotaExceededError. Fallback image blobs and large document histories to IndexedDB. Display warning if storage > 50MB.
EC-02,Rapid drag/resize performance lag,"Apply CSS transform: translate3d(x,y,0) for hardware acceleration. Set pointer-events: none on textareas during window drag."
EC-03,Concurrent multi-tab edits,Assign unique UUID v4 to each window and tab. Debounce storage writes by 300ms to eliminate race conditions.
EC-04,Clipboard API permission denied,Fallback to base64 image download link if navigator.clipboard.write access is blocked.
EC-05,Closing browser with unsaved changes,Attach beforeunload window listener checking isDirty state across all open tabs. Prompt confirmation dialog.
EC-06,Mobile screen size (< 768px),Automatically collapse desktop window manager into a responsive stacked single-window layout with bottom tab navigation.
EC-07,Corrupted LocalStorage payload,Wrap JSON operations in try/catch. Restore clean default state and preserve raw corrupted string in np_recovery_backup.


SEQUENTIAL STEP-BY-STEP IMPLEMENTATION PLAN
Execute the development in these exact phases:

Phase 1: Project Setup, SEO & HTML Canvas
Initialize file tree (css/, js/, tests/).

Create index.html with SEO tags, JSON-LD Schema, #desktop-canvas, and #bottom-dock.

Create css/main.css & css/desktop.css establishing theme CSS variables (--bg-cream: #F8F7F2).

Phase 2: Storage Engine & State Persistence (StorageEngine.js)
Implement StorageEngine class wrapping localStorage and IndexedDB.

Add methods: saveWindowState(), loadWindowState(), saveTab(), storeImageBlob(), getPreferences().

Phase 3: Window Manager & Snapping (WindowManager.js, WindowComponent.js)
Build floating window DOM factory.

Implement pointer event dragging, corner resizing, active z-index stacking.

Implement FancyZones snapping logic (50/50 vertical & 4 quadrants).

Build minimize to dock and maximize/restore features.

Phase 4: Multi-Tab Engine & Editor Core (TabManager.js, EditorComponent.js)
Build window tab bar and dynamic tab creation.

Wire textarea editor with line numbers gutter, caret tracking, status bar, and minimap.

Build HistoryEngine for per-tab undo/redo stack.

Phase 5: Preferences, Presets & Desktop Settings (PreferencesManager.js)
Build Preferences Modal UI.

Implement "Save as Default" vs "Save to This Tab Only".

Store last 5 preference presets and attach dropdown selector to the "+" tab button.

Phase 6: Image Clipboard Engine (ImageClipboardEngine.js)
Attach paste event interceptor. Store images in IndexedDB.

Render inline image cards with "Copy Image to Clipboard" action.

Phase 7: Search/Replace, Export & Menus
Implement Regex Find & Replace drawer with match highlights.

Implement ExportEngine (TXT, MD, HTML, PDF export).

Wire top menu bar actions (File, Edit, View, Preferences, Help).

Phase 8: PWA, CI/CD Pipelines, Tests & Audit
Create manifest.json and offline sw.js service worker.

Write unit tests inside tests/ directory.

Create .github/workflows/deploy.yml and .gitlab-ci.yml for GitHub/GitLab Pages auto-deployment.

Audit network tab to verify zero outbound HTTP requests on user notes.

FUTURE ROADMAP & EXTENSIONS (FUTURE_IDEAS.md)
Document these features in FUTURE_IDEAS.md for post-v1 expansion:

End-to-End Encryption (E2EE): Optional password protection per note using Web Crypto API (AES-GCM).

Markdown Live Preview Mode: Split-pane live markdown renderer with syntax highlighting.

Cloud Sync Plugin (Optional / Self-Hosted): WebDAV or CouchDB integration for optional user-owned cloud sync.








