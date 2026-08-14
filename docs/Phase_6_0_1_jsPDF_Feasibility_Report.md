# Phase 6.0.1 jsPDF Feasibility Gate Implementation Report

**Date**: 2026-08-15  
**Status**: HARNESS READY - PENDING REAL CHROME VALIDATION

---

## 1. Installed Versions

### Dependencies
```
jspdf:          2.5.2 (exact)
jspdf-autotable: 3.8.4 (exact)
```

### Installation Method
```bash
npm install jspdf@2.5.2 jspdf-autotable@3.8.4 --save-exact
```

### License
- jsPDF: MIT
- jspdf-autotable: MIT

---

## 2. Browser Entry Audit

### jsPDF
```json
{
  "main": "dist/jspdf.node.min.js",      // Node.js entry
  "module": "dist/jspdf.es.min.js",      // ES module
  "browser": "dist/jspdf.es.min.js"      // Browser entry
}
```

**Import Path**: `import { jsPDF } from 'jspdf';`

**Vite Resolution**: Resolves to `browser` field → `dist/jspdf.es.min.js` (ES module for browser)

**Available Files**:
- `jspdf.es.js` (ES module unminified)
- `jspdf.es.min.js` (ES module minified) ← Used
- `jspdf.umd.js` (UMD build)
- `jspdf.node.js` (Node.js build)

### jspdf-autotable
```json
{
  "main": "dist/jspdf.plugin.autotable.js",
  "exports": {
    ".": {
      "default": "./dist/jspdf.plugin.autotable.js"
    },
    "./es": {
      "default": "./dist/jspdf.plugin.autotable.mjs"
    }
  }
}
```

**Import Path**: `import autoTable from 'jspdf-autotable';`

**Vite Resolution**: Resolves to `main` → `dist/jspdf.plugin.autotable.js`

### Verdict
✅ **Browser builds selected** (not Node.js builds)

---

## 3. CSP Static Audit

### Production Bundle Inspection

**Artifact**: `dist/assets/pdf-jspdf-feasibility.js` (400 KB)

### Findings

**CSP Risk Keywords**:
```
Function(         1 occurrence  ⚠️ CSP RISK
XMLHttpRequest    4 occurrences  ⚠️ NETWORK?
fetch(            1 occurrence   ⚠️ NETWORK?
http://           2 occurrences  ⚠️ PROTOCOL
https://          1 occurrence   ⚠️ PROTOCOL
```

### Analysis

#### "Function(" - CSP Risk
**Source**: Likely jsPDF core (minified code)

**Risk Level**: ⚠️ **MEDIUM-HIGH**

**Context**: Same as pdfmake - may be in code path not executed for basic PDF generation, or may be polyfill/compatibility code.

**Must Verify**: Real Chrome Extension runtime test required.

**If CSP blocks**: Test A will timeout or throw error.

#### XMLHttpRequest / fetch / http(s)
**Source**: Likely:
1. Optional dependencies (html2canvas, canvg) - NOT used in basic text PDF
2. Static URL strings in comments/error messages
3. Polyfill code for compatibility

**Risk Level**: ⚠️ **LOW** (if not in execution path)

**Actual Network**: Phase 6.0.1 tests do NOT load remote resources.

**Must Verify**: DevTools Network tab during real Chrome test.

### Comparison with pdfmake
| Issue | pdfmake | jsPDF |
|-------|---------|-------|
| eval() | 0 | 0 |
| new Function() | 2 | 0 |
| Function() | 0 | 1 |
| **Total CSP Risk** | 2 | 1 |

**Verdict**: ⚠️ **CSP risk present but lower than pdfmake**

**Real Chrome validation REQUIRED** - Cannot assume compatibility.

---

## 4. Test A — Engine Only

### Content
```
Hello ExportAI
```

### Output API
```typescript
const doc = new jsPDF();
doc.text('Hello ExportAI', 10, 10);
const output = doc.output('arraybuffer');
```

### API Contract (from TypeScript definitions)
```typescript
output(type: "arraybuffer"): ArrayBuffer;
output(type: "blob"): Blob;
output(type: "bloburi" | "bloburl"): URL;
```

### Expected Return Type
**ArrayBuffer** (NOT Uint8Array)

### Normalization
```typescript
const output = doc.output('arraybuffer');  // Returns ArrayBuffer
const pdfBytes = new Uint8Array(output);   // Convert to Uint8Array
```

### Signature Validation
```typescript
// Check bytes[0..4] === "%PDF-"
const signature = String.fromCharCode(
  bytes[0], bytes[1], bytes[2], bytes[3], bytes[4]
);
return signature === '%PDF-';
```

### Stages (13 total)
```
Stage A1: jsPDF module loaded
Stage A2: jsPDF constructor starting
Stage A3: jsPDF instance created
Stage A4: minimal English text added
Stage A5: output(arraybuffer) starting
Stage A6: output(arraybuffer) returned
Stage A7: actual output type inspected
Stage A8: normalized to Uint8Array
Stage A9: byte length verified
Stage A10: %PDF- signature verified
Stage A11: Blob created
Stage A12: Blob URL created
Stage A13: complete
```

### Critical Gate Criteria
- ✅ No timeout (completes within 10 seconds)
- ✅ output('arraybuffer') returns successfully
- ✅ ArrayBuffer converts to Uint8Array
- ✅ Byte length > 0
- ✅ %PDF- signature present
- ✅ Blob creates successfully
- ✅ No CSP violations in Console
- ✅ PDF opens in Chrome viewer

**If ANY criteria fails**: Gate FAILED

---

## 5. Test B — CJK Single Font

### Font Source
**File**: `src/assets/fonts/NotoSansSC-Regular.otf` (16 MB full font)

**License**: SIL Open Font License 1.1

**Type**: **FULL CJK FONT** (not subset)

**Note**: This is for feasibility only. Production will use pre-subset font (~1-2 MB).

### Font Registration API (jsPDF 2.5.2)
```typescript
// 1. Convert font to base64
const fontBlob = await fetch(fontUrl).then(r => r.blob());
const fontBase64 = await blobToBase64(fontBlob); // data:font/otf;base64,...

// 2. Add to VFS (without "data:" prefix)
doc.addFileToVFS('NotoSansSC-Regular.ttf', fontBase64.split(',')[1]);

// 3. Register font
doc.addFont('NotoSansSC-Regular.ttf', 'NotoSansSC', 'normal');

// 4. Select font
doc.setFont('NotoSansSC');

// 5. Use font
doc.text('你好，世界', 10, 20);
```

### Content
```
Hello ExportAI
你好，世界
ExportAI 中文 PDF
```

### Stages (14 total)
```
Stage B1: local font asset available
Stage B2: font bytes loaded
Stage B3: font payload size recorded
Stage B3a: converting font to base64
Stage B4: jsPDF instance created
Stage B5: font registered in VFS
Stage B6: font added
Stage B7: font selected
Stage B8: English + Chinese text added
Stage B9: output started
Stage B10: output returned
Stage B11: normalized Uint8Array
Stage B12: %PDF- verified
Stage B13: Blob created
Stage B14: complete
```

### Critical Gate Criteria
- ✅ Font loads without error
- ✅ Base64 conversion completes (may take time)
- ✅ addFileToVFS succeeds
- ✅ addFont succeeds
- ✅ setFont succeeds
- ✅ Chinese text renders (not □□□)
- ✅ PDF signature valid
- ✅ **Manual**: Chinese text is selectable
- ✅ **Manual**: Search "你好" finds result

**If font embedding fails**: CJK strategy must be re-evaluated (but jsPDF core may still be viable)

---

## 6. Test C — Simple Table

### Plugin Integration
```typescript
import autoTable from 'jspdf-autotable';

const doc = new jsPDF();

autoTable(doc, {
  head: [['Name', 'Role', 'Status']],
  body: [
    ['Alice', 'User', 'Active'],
    ['ExportAI', 'Assistant', 'Ready'],
    ['Bob', 'User', 'Active'],
  ],
});

const output = doc.output('arraybuffer');
```

### Table Data
3x3 table (1 header row + 3 body rows)

### Stages (8 total)
```
Stage C1: plugin available
Stage C2: jsPDF created
Stage C3: table generation started
Stage C4: table generation completed
Stage C5: PDF output generated
Stage C6: signature verified
Stage C7: Blob created
Stage C8: complete
```

### Critical Gate Criteria
- ✅ autoTable function available
- ✅ No CSP violation on plugin load
- ✅ Table renders
- ✅ PDF output valid

---

## 7. Test D — Multi-page Pagination

### Table Data
**200 rows** (synthetic data to force pagination)

### Content
```typescript
const rows = [];
for (let i = 1; i <= 200; i++) {
  rows.push([`Row ${i}`, `Data ${i}`, `Status ${i % 3 === 0 ? 'Complete' : 'Pending'}`]);
}

autoTable(doc, {
  head: [['Index', 'Data', 'Status']],
  body: rows,
});
```

### Page Count Detection
```typescript
const pageCount = doc.internal.getNumberOfPages();
```

### Stages (9 total)
```
Stage D1: generating synthetic data
Stage D2: jsPDF created
Stage D3: multi-page table generation started
Stage D4: table generation completed
Stage D5: counting pages
Stage D6: PDF output generated
Stage D7: signature verified
Stage D8: Blob created
Stage D9: complete
```

### Critical Gate Criteria
- ✅ Table generation completes
- ✅ Multiple pages created (pageCount > 1)
- ✅ No freeze/hang
- ✅ PDF output valid
- ✅ Elapsed time recorded

---

## 8. Diagnostic Stages Summary

### Total Stages by Test
- Test A (Engine Only): 13 stages
- Test B (CJK Font): 14 stages
- Test C (Simple Table): 8 stages
- Test D (Multi-page): 9 stages

### Stage Display
- ✅ Each stage shows on UI immediately
- ✅ Elapsed time shown per stage
- ✅ Completed stages list maintained
- ✅ Failed stage identified if error

### Timeout
- **10 seconds** per test
- Promise.race with timeout promise
- **Note**: Cannot interrupt synchronous CPU freeze, only async hang

---

## 9. Timeout / Error Handling

### Test-Level Timeout
```typescript
const TEST_TIMEOUT_MS = 10000;

Promise.race([
  testPromise,
  createTimeout(10000)
]);
```

### Global Error Capture
```typescript
window.addEventListener('unhandledrejection', handler);
window.addEventListener('error', handler);
```

### Safe Error Display
- ✅ error.name
- ✅ error.message
- ✅ current stage
- ✅ elapsed time
- ❌ NO PDF binary
- ❌ NO ArrayBuffer contents
- ❌ NO font payload
- ❌ NO large object dumps

### Console Logging
- ✅ Errors logged to console.error
- ✅ Safe, minimal logging
- ❌ NO font/PDF payload dumps

---

## 10. Bundle Audit

### Total Dist Size
```
Baseline (Phase 5):     238 KB
Phase 6.0.1:            35 MB
Delta:                  +35 MB (same as pdfmake phase)
```

### jsPDF Feasibility Bundle
```
pdf-jspdf-feasibility.html:     426 bytes
pdf-jspdf-feasibility.js:       400 KB (132.75 KB gzipped)
```

### Breakdown
| Component | Size | Gzipped | Notes |
|-----------|------|---------|-------|
| jsPDF + autotable | ~280 KB | ~90 KB | Core engines |
| React/ReactDOM | ~190 KB | ~60 KB | Shared chunk |
| Harness code | ~20 KB | ~10 KB | Test logic |
| **Total JS** | **~490 KB** | **~160 KB** | |
| NotoSansSC fonts | 33 MB | N/A | Full CJK (feasibility only) |
| **Total** | **~35 MB** | **~33 MB** | |

### Comparison with pdfmake
| Component | pdfmake | jsPDF |
|-----------|---------|-------|
| Engine | 1.8 MB | 400 KB |
| Gzipped | 829 KB | 133 KB |
| **Advantage** | | **jsPDF 78% smaller** |

**Note**: Fonts not included in comparison (same 33 MB in both cases for feasibility).

### Production Projection (with font subsetting)
```
jsPDF core:         ~280 KB
autotable:          ~60 KB
CJK font subset:    ~1-2 MB (after subsetting)
Custom layout:      ~25 KB
Total:              ~2.4 MB (vs pdfmake ~2.5 MB)
```

---

## 11. Modified Files

### New Files
```
src/exporters/jspdf-feasibility-test.ts
src/feasibility/jspdf-feasibility-app.tsx
pdf-jspdf-feasibility.html
```

### Modified Files
```
package.json (added jspdf, jspdf-autotable)
package-lock.json
vite.config.ts (added pdf-jspdf-feasibility entry)
```

### Unchanged
```
manifest.json           ✅ NO CHANGES
src/exporters/markdown-* ✅ UNCHANGED
src/exporters/json-*    ✅ UNCHANGED
src/adapters/**         ✅ UNCHANGED
src/types/**            ✅ UNCHANGED
src/popup/**            ✅ UNCHANGED
```

**Verification**: `git diff manifest.json` → No output

---

## 12. Tests

### Automated Test Results
```
npm test:           ✅ PASS (117/117 tests)
npm run typecheck:  ✅ PASS
npm run build:      ✅ PASS
git diff --check:   ✅ PASS (line endings only)
```

### Test Breakdown
- conversation-normalizer: 5/5
- markdown-exporter: 25/25
- json-exporter: 21/21
- pdf-feasibility-module: 11/11
- markdown-export-flow: 6/6
- json-export-flow: 8/8
- popup-markdown-export: 2/2
- popup-json-export: 4/4
- chatgpt-adapter: 35/35

### Regression Verification
✅ All Phase 1-5 tests pass  
✅ No breaking changes  
✅ No TypeScript errors  

---

## 13. Regression Scope

### Confirmed Unchanged
```
Markdown Exporter:        ✅ UNCHANGED
JSON Exporter:            ✅ UNCHANGED
ChatGPT Adapter:          ✅ UNCHANGED
Parser:                   ✅ UNCHANGED
Conversation Model:       ✅ UNCHANGED
Popup:                    ✅ UNCHANGED
Manifest:                 ✅ UNCHANGED (no CSP changes, no permissions)
Content Script:           ✅ UNCHANGED
Background Service Worker: ✅ UNCHANGED
```

### Build Artifacts
- ✅ popup.html/js: Unchanged
- ✅ content.js: Unchanged
- ✅ background.js: Unchanged
- ✅ manifest.json: Unchanged
- ✅ Only added: pdf-jspdf-feasibility.html/js

---

## 14. User Next Action

### ONLY TEST A FIRST

**Step 1**: Rebuild
```bash
npm run build
```

**Step 2**: Reload Extension
1. Open `chrome://extensions/`
2. Find ExportAI extension
3. Click "Reload" button

**Step 3**: Open Feasibility Page
```
chrome-extension://<YOUR-EXTENSION-ID>/pdf-jspdf-feasibility.html
```

**Step 4**: Run Test A
1. **Open DevTools Console (F12) BEFORE clicking**
2. **Open Network tab**
3. Click "Test A: Engine Only"
4. Watch stage progression
5. **CRITICAL**: Check Console for CSP violations
6. **CRITICAL**: Check Network tab for external requests
7. Wait for completion or timeout

**Step 5**: Verify Test A Results
- [ ] Test completes (not timeout)
- [ ] PDF auto-downloads
- [ ] "Stage A13: complete" reached
- [ ] result.success === true
- [ ] result.metadata.hasValidSignature === true
- [ ] Console shows NO CSP violations
- [ ] Network shows ZERO http/https requests
- [ ] Click "Open Preview"
- [ ] PDF opens in Chrome viewer
- [ ] Text "Hello ExportAI" is visible

**Step 6**: Report Test A Results
Take screenshots of:
1. Feasibility page (showing result)
2. DevTools Console
3. DevTools Network tab
4. Chrome PDF viewer

### DO NOT Proceed to Test B/C/D Until Test A PASSES

---

## 15. Current Gate Status

### Phase Status
```
pdfmake@0.3.11:
  ❌ FAILED (all three output APIs timed out)

jsPDF Candidate:
  ⏳ PENDING REAL CHROME VALIDATION

Phase 6.0.1 Harness:
  ✅ READY

Real Chrome Test A:
  ⏳ PENDING USER VALIDATION

Real Chrome Test B:
  ⏳ BLOCKED (requires Test A PASS)

Real Chrome Test C:
  ⏳ BLOCKED (requires Test B PASS)

Real Chrome Test D:
  ⏳ BLOCKED (requires Test C PASS)

Phase 6.0.1 Final Gate:
  ❌ BLOCKED

Phase 6.1:
  ❌ NOT STARTED
```

### CSP Risk Summary
```
Static Analysis:
  Function():    1 occurrence  ⚠️ RISK
  
Real Chrome Validation:
  ⏳ REQUIRED
  
If CSP violation occurs:
  jsPDF route: FAILED
  Must re-evaluate pdf-lib or declare PDF infeasible
```

---

## Final Summary

**Phase 6.0.1 jsPDF Feasibility Gate harness implementation: COMPLETE**

**Next milestone**: User executes Test A in real Chrome Extension

**Decision point**: If Test A passes, proceed to Test B. If Test A fails with CSP or timeout, jsPDF is not viable.

**Full documentation**: This file

**Phase 6.0.1 harness ready for real Chrome validation.**
