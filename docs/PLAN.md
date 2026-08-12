# Implementation Plan
## Phase-by-Phase Roadmap for Notepad Online

**Last Updated:** August 12, 2026  
**Current Phase:** 2 (StorageEngine Enhancement)  
**Total Phases:** 8

---

## 📋 Phase Overview

| Phase | Feature | Timeline | Status | Tests | LOC |
|-------|---------|----------|--------|-------|-----|
| 1 | Project Setup, HTML Canvas, CSS System | Week 1 | ✅ Complete | - | 7000 |
| 2 | StorageEngine Enhancement, Unit Tests | Week 2 | 🔄 Active | 15+ | 1000 |
| 3 | WindowManager DOM Implementation | Week 3 | ⏳ Pending | 12+ | 800 |
| 4 | TabManager & EditorComponent Integration | Week 4 | ⏳ Pending | 10+ | 1200 |
| 5 | PreferencesManager UI, Preset System | Week 5 | ⏳ Pending | 8+ | 600 |
| 6 | ImageClipboardEngine Full Integration | Week 6 | ⏳ Pending | 6+ | 400 |
| 7 | Search/Replace, Export, Menus | Week 7 | ⏳ Pending | 10+ | 800 |
| 8 | PWA, Service Worker, CI/CD, Docs | Week 8 | ⏳ Pending | 20+ | 400 |

---

## 🔄 PHASE 1: Project Setup & HTML Canvas ✅ COMPLETE

### Deliverables
- [x] Directory structure (css/, js/modules/, js/utils/, tests/)
- [x] index.html with SEO, JSON-LD, modals, 400+ lines
- [x] 6 CSS files with complete styling system (2500+ lines)
- [x] 14 JavaScript modules with stubs (4000+ lines)
- [x] manifest.json for PWA
- [x] sw.js Service Worker skeleton
- [x] package.json and README.md

### Verification
- [x] No console errors
- [x] HTML validates (W3C)
- [x] CSS compiles without errors
- [x] ES6 modules parse correctly
- [x] All class signatures defined

### Status
✅ **COMPLETE** - Ready for Phase 2

---

## 🔄 PHASE 2: StorageEngine Enhancement & Testing (CURRENT)

### Overview
Complete the StorageEngine implementation with full IndexedDB integration, quota management, import/export, and comprehensive unit tests.

### Detailed Tasks

#### 2.1: StorageEngine Core Implementation
**File**: `js/modules/StorageEngine.js`

**Subtasks**:
- [ ] Implement IndexedDB connection initialization
- [ ] Create IndexedDB database schema (5 stores)
- [ ] Implement async/await wrapper for IndexedDB operations
- [ ] Add quota monitoring and percentage calculation
- [ ] Implement localStorage → IndexedDB fallback logic
- [ ] Add data corruption detection and recovery
- [ ] Implement backup/restore mechanism

**Key Methods to Complete**:
```javascript
async init()
async saveNote(tabId, content, metadata)
async loadNote(noteId)
async getAllNotes()
async storeImageBlob(blob, tabId, fileName)
async getImageBlob(imageId)
async createBackup(type)
async restoreBackup(backupId)
async exportAllData()
async importData(jsonData)
getStorageUsage()
getStorageQuota()
```

**Edge Cases to Handle**:
- [ ] EC-01: localStorage quota exceeded → graceful fallback to IndexedDB
- [ ] EC-07: Corrupted localStorage → recovery to clean state
- [ ] Concurrent writes from multiple tabs
- [ ] IndexedDB version upgrades

**Events to Emit**:
- `ready` - After initialization complete
- `quotaWarning` - At 80% capacity
- `quotaExceeded` - At 100% capacity, fallback active
- `noteSaved` - After note persisted
- `imageStored` - After image blob persisted

#### 2.2: Unit Tests for StorageEngine
**File**: `tests/storage.test.js`

**Test Suites** (15+ tests):
- [ ] Initialization tests (3 tests)
  - [ ] IndexedDB initializes correctly
  - [ ] localStorage falls back to IndexedDB
  - [ ] initPromise resolves
  
- [ ] Note CRUD operations (4 tests)
  - [ ] Save note with content
  - [ ] Load note by ID
  - [ ] Delete note
  - [ ] Get all notes
  
- [ ] Image storage (2 tests)
  - [ ] Store image blob with metadata
  - [ ] Retrieve image blob and verify size
  
- [ ] Backup/Restore (2 tests)
  - [ ] Create backup snapshot
  - [ ] Restore from backup
  
- [ ] Quota management (2 tests)
  - [ ] Detect quota exceeded
  - [ ] Fallback to IndexedDB on quota exceeded
  
- [ ] Import/Export (2 tests)
  - [ ] Export all data as JSON
  - [ ] Import data and verify restoration

**Coverage Target**: > 85% for StorageEngine

#### 2.3: Test Runner Setup
**Files**: 
- `tests/runner.js` - Simple Node.js test runner
- `package.json` - Update with test script

**Implementation**:
- [ ] Create lightweight test framework (assert, describe, it)
- [ ] Support async tests with await
- [ ] Display colorized output (green/red)
- [ ] Report coverage statistics
- [ ] Support running single test file or all tests

**Alternative**: Use Vitest if Node.js environment preferred

#### 2.4: Integration with CI/CD
**Files**: `.github/workflows/deploy.yml`, `.gitlab-ci.yml`

**Phase 2 Requirements**:
- [ ] Run `npm test` on push
- [ ] Fail build if tests fail
- [ ] Report coverage percentage
- [ ] Display results in PR/MR

### Acceptance Criteria
- [ ] All 15+ tests pass locally
- [ ] All 15+ tests pass in CI/CD pipeline
- [ ] Code coverage > 85% for StorageEngine
- [ ] No console errors or warnings
- [ ] Storage operations complete < 100ms
- [ ] Quota management works as specified (EC-01)
- [ ] Data recovery works (EC-07)

### Time Estimate
- Implementation: 6 hours
- Testing: 4 hours
- Debugging/Documentation: 2 hours
- **Total: 12 hours**

### Deliverables
- ✅ `StorageEngine.js` - 100% complete with all methods
- ✅ `storage.test.js` - 15+ unit tests, all passing
- ✅ `tests/runner.js` - Simple test framework
- ✅ `package.json` - Test script configured
- ✅ CI/CD pipelines - Testing integrated

### Success Metrics
- 100% test pass rate
- Code coverage > 85%
- All edge cases handled
- Zero storage-related console errors

---

## 🔄 PHASE 3: WindowManager DOM Implementation

### Overview
Implement WindowManager and WindowComponent DOM rendering, drag/resize, z-index management, and FancyZones snapping.

### Detailed Tasks

#### 3.1: WindowComponent.render() Enhancement
**File**: `js/modules/WindowComponent.js`

- [ ] Create window DOM structure (title bar, content area, resize handles)
- [ ] Implement drag event handlers with requestAnimationFrame
- [ ] Implement resize event handlers (8 positions)
- [ ] Add CSS classes for active/inactive/minimized states
- [ ] Implement minimize/maximize/close button handlers
- [ ] Add smooth animations (fadeIn, slideUp)

#### 3.2: WindowManager Implementation
**File**: `js/modules/WindowManager.js`

- [ ] Implement createWindow() with UUID generation
- [ ] Implement z-index stacking (zIndexStack array)
- [ ] Implement bringToTop() with z-index updates
- [ ] Implement snapWindow() with FancyZones logic
- [ ] Implement window positioning constraints (min/max size)
- [ ] Integrate with StorageEngine for persistence

#### 3.3: FancyZones Snapping
**Implementation**:
- [ ] Detect snap zones (left 50%, right 50%, 4 quadrants)
- [ ] Show visual guides on hover
- [ ] Snap window on release
- [ ] Animate to snap position

#### 3.4: Window Manager Tests
**File**: `tests/windowManager.test.js`

- [ ] Create window test
- [ ] Destroy window test
- [ ] Z-index stacking test
- [ ] Drag positioning test
- [ ] Resize handling test
- [ ] Snap zones test
- [ ] Persistence test

### Acceptance Criteria
- [ ] Windows render with correct DOM structure
- [ ] Drag/resize smooth at 60fps
- [ ] Z-index managed correctly
- [ ] Snap zones work as designed
- [ ] Window state persists after reload
- [ ] All 12+ tests pass

### Time Estimate
- **12 hours**

---

## 🔄 PHASE 4: TabManager & EditorComponent Integration

### Overview
Implement multi-tab engine and text editor with real undo/redo, line counting, and status bar.

### Detailed Tasks

#### 4.1: TabManager Implementation
**File**: `js/modules/TabManager.js`

- [ ] Implement createTab(windowId)
- [ ] Implement closeTab(tabId)
- [ ] Implement tab switching
- [ ] Implement per-tab cursor position tracking
- [ ] Implement per-tab preference override
- [ ] Integrate with HistoryEngine for per-tab undo/redo

#### 4.2: EditorComponent Full Implementation
**File**: `js/modules/EditorComponent.js`

- [ ] Implement line number calculation
- [ ] Implement line number sync with scroll
- [ ] Implement status bar with stats
- [ ] Implement minimap rendering
- [ ] Implement keyboard tab insertion
- [ ] Implement spellcheck disable
- [ ] Integrate with HistoryEngine for undo/redo

#### 4.3: HistoryEngine Integration
**File**: `js/modules/HistoryEngine.js`

- [ ] Verify undo/redo stack management
- [ ] Test concurrent multi-tab histories
- [ ] Implement stack size limits

#### 4.4: Tests
**File**: `tests/editor.test.js`

- [ ] Tab creation test
- [ ] Tab switching test
- [ ] Content update test
- [ ] Line number sync test
- [ ] Undo/redo test
- [ ] Cursor position tracking test
- [ ] Multi-tab concurrent edit test

### Acceptance Criteria
- [ ] Multiple tabs work independently
- [ ] Editor renders correctly
- [ ] Line numbers sync with content
- [ ] Status bar shows accurate stats
- [ ] Undo/redo works per-tab
- [ ] All 10+ tests pass

### Time Estimate
- **14 hours**

---

## 🔄 PHASE 5: PreferencesManager UI Integration

### Overview
Implement preferences modal UI binding, preset management, and live preview.

### Detailed Tasks

#### 5.1: Preferences Modal UI
**File**: `index.html` (update modal), `js/app.js`

- [ ] Bind font selector to PreferencesManager
- [ ] Bind font size slider to live preview
- [ ] Bind color pickers to theme CSS variables
- [ ] Implement "Save as Default" button
- [ ] Implement "Save to This Tab Only" button
- [ ] Implement preset dropdown

#### 5.2: PreferencesManager Enhancement
**File**: `js/modules/PreferencesManager.js`

- [ ] Implement global vs tab-specific scoping
- [ ] Implement preset history (last 5)
- [ ] Implement preset save/load/delete
- [ ] Implement default preset application

#### 5.3: Tests
**File**: `tests/preferences.test.js`

- [ ] Global preference save/load test
- [ ] Tab-specific preference override test
- [ ] Preset save/load test
- [ ] Preset history limit test
- [ ] Default application test

### Acceptance Criteria
- [ ] Preferences modal fully functional
- [ ] Presets work correctly
- [ ] Live preview updates instantly
- [ ] All 8+ tests pass

### Time Estimate
- **10 hours**

---

## 🔄 PHASE 6: ImageClipboardEngine Full Integration

### Overview
Implement full image clipboard support with Clipboard API integration and inline card rendering.

### Detailed Tasks

#### 6.1: ImageClipboardEngine Enhancement
**File**: `js/modules/ImageClipboardEngine.js`

- [ ] Implement Clipboard API paste detection
- [ ] Implement blob → blob URL conversion
- [ ] Implement copy back to clipboard
- [ ] Handle EC-04: Clipboard permission denied fallback
- [ ] Implement image metadata storage

#### 6.2: Inline Image Cards
**File**: `js/modules/EditorComponent.js`

- [ ] Render image cards in editor
- [ ] Implement delete image button
- [ ] Implement copy image button
- [ ] Implement resize handle (planned)

#### 6.3: Tests
**File**: `tests/images.test.js`

- [ ] Paste image test
- [ ] Image storage test
- [ ] Copy image test
- [ ] Delete image test
- [ ] Clipboard permission denied fallback test

### Acceptance Criteria
- [ ] Images paste from clipboard
- [ ] Image cards render inline
- [ ] Copy/delete/resize work
- [ ] All 6+ tests pass
- [ ] Handle EC-04 gracefully

### Time Estimate
- **8 hours**

---

## 🔄 PHASE 7: Search/Replace, Export, Menus

### Overview
Implement find/replace drawer, multi-format export, and top menu bar.

### Detailed Tasks

#### 7.1: Find/Replace Drawer
**Files**: `index.html`, `js/app.js`

- [ ] Bind find/replace drawer to SearchReplaceEngine
- [ ] Implement match highlighting
- [ ] Implement next/previous navigation
- [ ] Implement replace single/all
- [ ] Implement regex support

#### 7.2: Export Dialog
**Files**: `index.html`, `js/app.js`

- [ ] Bind export buttons to ExportEngine
- [ ] Implement TXT, MD, HTML, PDF, JSON formats
- [ ] Test each format output

#### 7.3: Top Menu Bar
**Files**: `index.html`, `css/desktop.css`, `js/app.js`

- [ ] Implement File menu (New, Open Recent, Save, Export)
- [ ] Implement Edit menu (Undo, Redo, Cut, Copy, Paste)
- [ ] Implement View menu (Theme, Zoom, Full Screen)
- [ ] Implement Help menu (Shortcuts, About)

#### 7.4: Tests
**File**: `tests/export.test.js`, `tests/search.test.js`

- [ ] Search functionality test
- [ ] Replace functionality test
- [ ] Export format test (each format)

### Acceptance Criteria
- [ ] Find/Replace fully functional
- [ ] All export formats work
- [ ] Menu bar complete
- [ ] All 10+ tests pass

### Time Estimate
- **12 hours**

---

## 🔄 PHASE 8: PWA, Service Worker, CI/CD, Documentation

### Overview
Complete PWA setup, Service Worker implementation, automated CI/CD pipelines, comprehensive testing, and finalization.

### Detailed Tasks

#### 8.1: Service Worker Enhancement
**File**: `sw.js`

- [ ] Implement network-first caching strategy
- [ ] Implement background sync (when available)
- [ ] Implement update notification
- [ ] Test offline functionality
- [ ] Test cache invalidation

#### 8.2: PWA Installation
**Files**: `manifest.json`, `index.html`

- [x] Manifest complete with icons, shortcuts, share target
- [ ] Add install prompt UI
- [ ] Test installation on mobile and desktop

#### 8.3: CI/CD Pipelines
**Files**: `.github/workflows/deploy.yml`, `.gitlab-ci.yml`

- [ ] Test stage: Run all test suites
- [ ] Build stage: Verify no errors
- [ ] Deploy stage: Push to Pages branch
- [ ] Set up automatic deployment on push to main

#### 8.4: Comprehensive Testing
**Files**: `tests/integration.test.js`, `tests/e2e.test.js`

- [ ] End-to-end user flow tests (create → edit → export → close)
- [ ] Performance tests (load time, drag/resize framerate)
- [ ] Browser compatibility tests
- [ ] Mobile responsiveness tests
- [ ] Offline mode tests

#### 8.5: Documentation
**Files**: Created in previous steps

- [x] README.md - User guide
- [x] PRD.md - Product requirements
- [x] BLUEPRINT.md - Technical architecture
- [x] PLAN.md - This roadmap
- [ ] API.md - Complete module API reference
- [ ] FUTURE_IDEAS.md - Planned enhancements

#### 8.6: Performance Audit
- [ ] Lighthouse score > 90 (Performance, Accessibility, Best Practices)
- [ ] Bundle size < 200KB (unminified)
- [ ] Load time < 500ms (cached), < 2s (uncached)
- [ ] Drag/resize at 60fps

#### 8.7: Security Audit
- [ ] No external HTTP calls (audit with DevTools Network)
- [ ] CSP headers enforced
- [ ] No XSS vulnerabilities
- [ ] No CSRF vulnerabilities
- [ ] No sensitive data in localStorage

#### 8.8: Final Tests
**File**: `tests/final.test.js`

- [ ] All 50+ tests pass
- [ ] Code coverage > 80%
- [ ] No console errors
- [ ] All edge cases handled

### Acceptance Criteria
- [ ] Service Worker works offline
- [ ] Installable as PWA
- [ ] CI/CD pipelines fully functional
- [ ] 50+ tests all passing
- [ ] Code coverage > 80%
- [ ] Lighthouse score > 90
- [ ] Zero external HTTP calls verified
- [ ] Security audit passed
- [ ] Complete documentation

### Time Estimate
- **16 hours**

---

## 📊 Cumulative Progress

```
Phase 1 (Complete):  ████████████████████ 100% (7000 LOC)
Phase 2 (Current):   ░░░░░░░░░░░░░░░░░░░░   0% (1000 LOC)
Phase 3 (Next):      ░░░░░░░░░░░░░░░░░░░░   0% (800 LOC)
Phase 4 (Pending):   ░░░░░░░░░░░░░░░░░░░░   0% (1200 LOC)
Phase 5 (Pending):   ░░░░░░░░░░░░░░░░░░░░   0% (600 LOC)
Phase 6 (Pending):   ░░░░░░░░░░░░░░░░░░░░   0% (400 LOC)
Phase 7 (Pending):   ░░░░░░░░░░░░░░░░░░░░   0% (800 LOC)
Phase 8 (Pending):   ░░░░░░░░░░░░░░░░░░░░   0% (400 LOC)

TOTAL:               ████░░░░░░░░░░░░░░░░ 12% (7000 of 58000 LOC)
```

---

## ⏱️ Timeline Summary

| Phase | Weeks | Hours | LOC | Status |
|-------|-------|-------|-----|--------|
| 1 | Week 1 | 20 | 7000 | ✅ Complete |
| 2 | Week 2 | 12 | 1000 | 🔄 Active |
| 3 | Week 3 | 12 | 800 | ⏳ Pending |
| 4 | Week 4 | 14 | 1200 | ⏳ Pending |
| 5 | Week 5 | 10 | 600 | ⏳ Pending |
| 6 | Week 6 | 8 | 400 | ⏳ Pending |
| 7 | Week 7 | 12 | 800 | ⏳ Pending |
| 8 | Week 8 | 16 | 400 | ⏳ Pending |
| **TOTAL** | **8 weeks** | **104 hours** | **~12,000 LOC** | - |

---

## 🎯 Quality Gates

### Before Phase Completion
- [ ] All tests pass (run `npm test`)
- [ ] Code coverage > 80%
- [ ] No console errors or warnings
- [ ] All acceptance criteria met
- [ ] Code reviewed (self-review minimum)
- [ ] Documentation updated

### Before Deployment
- [ ] Lighthouse score > 90
- [ ] No external HTTP calls
- [ ] Security audit passed
- [ ] Performance benchmarks met
- [ ] Offline mode verified
- [ ] Mobile responsive tested

---

## 🚀 Go Live Checklist

- [ ] All 8 phases complete
- [ ] 100+ tests passing
- [ ] Code coverage > 80%
- [ ] Zero external dependencies
- [ ] Lighthouse score 95+
- [ ] No security vulnerabilities
- [ ] CI/CD pipelines green
- [ ] Deployment tested
- [ ] Documentation complete
- [ ] User guide published
- [ ] Privacy audit completed
- [ ] Performance audit passed

---

**Plan created August 12, 2026. To be updated weekly as phases progress.**
