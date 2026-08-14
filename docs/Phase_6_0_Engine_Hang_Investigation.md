# Phase 6.0 Engine-Only Hang Investigation Report

**Date**: 2026-08-14  
**Status**: DIAGNOSTIC HARNESS READY

---

## 1. Mode A Current Call Chain

### Actual Call Path (Original Implementation)
```
Line 10: import pdfMake from 'pdfmake/build/pdfmake'
  ↓
Line 11: import * as pdfFonts from 'pdfmake/build/vfs_fonts'
  ↓
Line 15: pdfMake.vfs = pdfFonts as any
  ↓
testEngineOnly()
  ↓
docDefinition = { content: [...] }
  ↓
Line 65: pdfDocGenerator = pdfMake.createPdf(docDefinition)
  ↓
generatePdfBytes(docDefinition)
  ↓
Line 312: pdfDocGenerator.getBase64((base64String) => { ... })
  ↓
[CALLBACK NEVER FIRES - HANG POINT]
```

### Identified Hang Point
**Line 312** in `pdf-isolation-test.ts`:
```typescript
pdfDocGenerator.getBase64((base64String: string) => {
  // This callback NEVER executes in Chrome MV3 Extension
  ...
});
```

The Promise wrapper waits forever because the callback is never invoked.

---

## 2. pdfmake Browser Entry

### Import Path
```typescript
import pdfMake from 'pdfmake/build/pdfmake';
```

### Package Entry Points (pdfmake@0.3.11)
```json
{
  "main": "js/index.js",        // Node.js entry
  "esnext": "src/index.js",     // ES module source
  "browser": "build/pdfmake.js" // Browser UMD build
}
```

### Vite Resolution
Vite correctly resolves to **browser** build: `pdfmake/build/pdfmake.js` (2.4 MB)

### Bundle Analysis
- ✅ Browser build selected (not Node)
- ✅ VFS fonts loaded from `pdfmake/build/vfs_fonts.js`
- ✅ Bundled into `dist/assets/vfs_fonts-BqSrE0wO.js` (1.8 MB)
- ✅ No Node-specific dependencies in production bundle

---

## 3. Generation API

### Current Implementation
```typescript
const pdfDocGenerator = pdfMake.createPdf(docDefinition);

// Callback-based API
pdfDocGenerator.getBase64((base64String: string) => {
  // Convert to Uint8Array
});
```

### API Contract
- **Type**: Callback-based (not Promise)
- **Return**: void
- **Async**: Callback fires when PDF generation complete
- **Problem**: Callback never fires in Chrome MV3 Extension context

---

## 4. API Version Audit

### Question: Is this a 0.2 vs 0.3 API mismatch?

**Answer**: NO

**Evidence**:
- pdfmake 0.1, 0.2, and 0.3 all use same callback-based API
- `createPdf()` returns document generator object
- Methods: `getBuffer()`, `getBase64()`, `getBlob()`, `getDataUrl()`
- All are callback-based, not Promise-based
- API usage is correct per pdfmake documentation

**Conclusion**: API usage is correct. The hang is not due to API version mismatch.

---

## 5. VFS / Roboto

### Initialization
```typescript
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
pdfMake.vfs = pdfFonts as any;
```

### Roboto Fonts
Built-in `vfs_fonts.js` contains:
- Roboto-Regular.ttf
- Roboto-Medium.ttf
- Roboto-Italic.ttf
- Roboto-MediumItalic.ttf

### Default Font Mapping
pdfmake uses **Roboto** as default font family if not specified.

Document definition `{ content: [{ text: 'Hello ExportAI' }] }` uses default Roboto.

### Status
✅ VFS initialized correctly  
✅ Roboto fonts present  
✅ No font loading errors expected  

---

## 6. Production Bundle Audit

### Entry Point
- ✅ Browser build: `pdfmake/build/pdfmake.js`
- ✅ Not Node build

### Relevant Chunks
```
vfs_fonts-BqSrE0wO.js:          1.8 MB (pdfmake + pdfkit + fonts)
pdf-engine-diagnostic.js:       12 KB (diagnostic harness)
```

### Runtime Dependencies
Detected in vfs_fonts chunk:
- pdfkit (PDF generation engine)
- linebreak (text layout)
- brotli decompression (font/data compression)
- Buffer polyfill (browser compatibility)

### Browser Compatibility
✅ All dependencies have browser-compatible builds  
✅ No native Node modules (fs, crypto, etc.)  
✅ Buffer is polyfilled  

---

## 7. "new Function" Analysis

### Location
`dist/assets/vfs_fonts-*.js` (1.8 MB chunk)

### Count
2 occurrences

### Source
**Brotli decompression library** (used for font/VFS data)

### Context
Found in dictionary transform code for decompressing VFS data.

### Mode A Execution Path
**Question**: Does Mode A trigger "new Function"?

**Analysis**: 
- VFS fonts are loaded at module init time
- Brotli may decompress VFS data on first access
- If VFS data is compressed, "new Function" may execute

### CSP Risk
⚠️ **UNCERTAIN** - requires real Chrome test

**If CSP blocks "new Function":**
- No console error may appear (silent failure)
- Callbacks may never fire
- Could explain the hang

---

## 8. Most Likely Hang Point

### Primary Hypothesis
**Line 312** in `generatePdfBytes()`:
```typescript
pdfDocGenerator.getBase64((callback) => {
  // NEVER CALLED
});
```

### Why Callback Doesn't Fire

**Possible causes** (in order of likelihood):

1. **CSP blocking "new Function"** in pdfkit/brotli (silent failure)
2. **Browser API incompatibility** in Chrome Extension context
3. **pdfkit internal error** not surfaced to callback
4. **VFS data corruption** during bundling
5. **Worker/thread requirement** not met in Extension
6. **Canvas/document API missing** in Extension context

### Evidence
- `createPdf()` returns successfully (no immediate error)
- Page doesn't crash (no unhandled exception)
- No CSP error in Console (yet - may be silent)
- Timeout occurs after waiting indefinitely

---

## 9. Diagnostic Stages

### New Detailed Stages
```
Stage 1: pdfmake module loaded
Stage 2: vfs_fonts module loaded  
Stage 3: VFS initialized
Stage 4: Creating minimal document definition
Stage 5: Calling createPdf()
Stage 6: createPdf() returned
Stage 7: Attempting PDF byte generation
  Stage 7a: Calling getBase64()
  Stage 7f: getBase64() call completed (waiting for callback)
  [HANG - callback never fires]
  
  Alternative paths:
  Stage 7a_ALT: Calling getBuffer()
  Stage 7a_BLOB: Calling getBlob()
```

### Timeout
- **10 seconds** per test
- Displays: "PDF_GENERATION_TIMEOUT"
- Shows: Last completed stage

---

## 10. Timeout / Error Handling

### Implemented Safety
```typescript
// Test timeout
const TEST_TIMEOUT_MS = 10000;

// Promise race
Promise.race([
  attemptGetBase64(...),
  createTimeout(10000),
]);

// Global error handlers
window.addEventListener('unhandledrejection', ...);
window.addEventListener('error', ...);
```

### Error Display
- ✅ Safe error messages only
- ✅ No font payload logging
- ✅ No base64 console spam
- ✅ Stage progression visible

---

## 11. Modified Files

### New Files
```
src/exporters/pdf-engine-diagnostic.ts
src/feasibility/pdf-engine-diagnostic-app.tsx
pdf-engine-diagnostic.html
```

### Modified Files
```
vite.config.ts (added pdf-engine-diagnostic entry)
```

### Unchanged
```
src/exporters/markdown-*
src/exporters/json-*
src/adapters/**
src/popup/**
manifest.json (no permission changes)
```

---

## 12. Tests

```
npm test:          ✅ PASS (117/117)
npm run typecheck: ✅ PASS
npm run build:     ✅ PASS
git diff --check:  ✅ PASS (line endings only)
```

All existing functionality preserved.

---

## 13. User Next Action

### Instructions

**Step 1**: Rebuild
```bash
npm run build
```

**Step 2**: Reload Extension
1. `chrome://extensions/`
2. Find ExportAI
3. Click "Reload"

**Step 3**: Open Diagnostic Page
```
chrome-extension://<YOUR-EXTENSION-ID>/pdf-engine-diagnostic.html
```

**Step 4**: Run Test A (getBase64)
1. Open DevTools Console (F12) **BEFORE clicking**
2. Click "Test getBase64"
3. Watch stage progression
4. **CRITICAL**: Check Console for CSP violations
5. Wait up to 10 seconds for result or timeout

**Step 5**: If Test A Times Out
1. Note last completed stage (likely "Stage 7f")
2. Check Console for any errors
3. Try "Test getBuffer" button
4. Try "Test getBlob" button

**Step 6**: Report Results
- Which API method worked (if any)
- Exact stage where hang occurred
- Any Console errors or CSP violations
- Screenshot of page and Console

### What NOT to Do
- ❌ Do NOT test Mode B (CJK Regular)
- ❌ Do NOT test Mode C (CJK Both)
- ❌ Do NOT test pdf-isolation.html

Wait for Mode A diagnostic results first.

---

## 14. Current Gate Status

```
Phase 6.0 Engine Diagnostic Harness:
  ✅ READY

Real Chrome Mode A Re-test:
  ⏳ PENDING USER VALIDATION

Previous Mode A Result:
  ❌ HANG (getBase64 callback never fired)

Mode B (CJK Regular):
  ⏳ NOT RUN (blocked on Mode A)

Mode C (CJK Both):
  ⏳ NOT RUN (blocked on Mode A)

Phase 6.0 Final Gate:
  ❌ BLOCKED

Phase 6.1:
  ❌ NOT STARTED
```

---

## Summary

**Root Cause Hypothesis**: `pdfDocGenerator.getBase64()` callback never fires in Chrome MV3 Extension context, likely due to:
1. CSP blocking "new Function" in brotli/pdfkit (silent)
2. Browser API incompatibility in Extension sandbox

**Diagnostic Solution**: Created comprehensive test harness with:
- ✅ Detailed stage progression (11+ stages)
- ✅ 10-second timeout per test
- ✅ Three alternative API methods (getBase64, getBuffer, getBlob)
- ✅ Global error capture
- ✅ Safe error display (no payload spam)

**Next Step**: User validates in real Chrome to determine which (if any) API method works.

---

**Phase 6.0 engine-only hang investigation complete. Diagnostic harness ready for user validation.**
