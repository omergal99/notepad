# CRITICAL DIRECTIVE: POC / MVP FIRST & IMMEDIATE VISUAL IMPACT

> **PRIORITY #1**: Focus on bringing an immediate, visible Proof of Concept (POC / MVP) to the live browser RIGHT NOW before proceeding with further feature expansion.
> 
> We must see direct visual impact in the browser first! Ensure the app renders cleanly and is functional in Live Server before finalizing the remaining roadmap phases autonomously.

---

## 🎯 STEP 1: IMMEDIATE BROWSER FIX (POC / MVP VISUAL VERIFICATION)

1. **Fix Application Initialization**:
   - Inspect `index.html` and `js/app.js`.
   - Ensure all module imports include `.js` extensions (e.g., `import { WindowManager } from './modules/WindowManager.js';`).
   - Wire `app.js` to execute on `DOMContentLoaded`.

2. **Render the Live Desktop & Default Window**:
   - Initialize `StorageEngine` and `WindowManager`.
   - Spawning Priority: Immediately spawn 1 centered default window titled `"Untitled document 1"` onto the cream desktop canvas (`#F8F7F2`).
   - Ensure the window frame, title bar controls, tab bar, and editor area render visibly with correct CSS styling when opened via Live Server (`python3 -m http.server`).

3. **Verify Local Impact**:
   - Confirm there are zero console errors in the browser.
   - Verify that the window can be dragged and interacted with visually.

---

## 🚀 STEP 2: AUTONOMOUS EXECUTION OF REMAINING PHASES (PHASES 4 TO 8)

Once the POC / MVP rendering fix is applied and verified, proceed seamlessly through the remaining phases **autonomously without pausing for manual approval**:

### Phase 4: Multi-Tab Engine & Text Editor Core
- Implement `TabManager.js` and `EditorComponent.js`.
- Connect line numbers gutter, status bar (lines, words, chars), and overview map.
- Connect `HistoryEngine.js` for per-tab undo/redo stacks.

### Phase 5: Preferences & Preset History Manager
- Implement `PreferencesManager.js` and Preferences Modal UI.
- Support "Save as Default" vs "Save to This Tab Only".
- Implement the last 5 preference presets and attach the preset dropdown menu to the header "+" button.

### Phase 6: Image Clipboard & Blob Engine
- Implement `ImageClipboardEngine.js`.
- Intercept paste events, store image blobs in IndexedDB, and render inline image cards in the editor with a "Copy Image to Clipboard" button.

### Phase 7: Search & Replace, Export Engine & Menus
- Implement `SearchReplaceEngine.js` with Regex support and live DOM match highlights.
- Implement `ExportEngine.js` (.txt, .md, .html, .pdf, .json).
- Wire top menu bar dropdown actions (File, Edit, View, Preferences, Help).

### Phase 8: PWA, CI/CD, Final E2E Integration & Audit
- Finalize `manifest.json` and service worker (`sw.js`).
- Run the full unit test suite (`npm run test:all`) to ensure 100% of tests pass and zero external network calls are made.

---

## 🏁 EXECUTION INSTRUCTION
Fix the live rendering bug now (Step 1), ensure the MVP is visibly working in the browser, and then autonomously execute Phases 4 through 8 until the application is 100% complete and fully verified!