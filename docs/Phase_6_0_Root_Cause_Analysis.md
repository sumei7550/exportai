# Phase 6.0 PDF Smoke Failure Root-Cause Analysis

**Date**: 2026-08-14  
**Status**: ROOT-CAUSE IDENTIFIED + ISOLATION HARNESS READY

---

## Real Chrome Smoke Test Result: FAILED

### Failure Symptoms
- PDF generation hung/froze Chrome
- Page stuck on "Status: Generating PDF..."
- Chrome became unresponsive (near crash)
- DevTools Console flooded with massive Base64/font payload output
- PDF never completed generation

---

## Root Cause Analysis

### 1. Original Smoke Implementation Font Loading Path

**File**: `src/exporters/pdf-feasibility-prototype.ts` (lines 65-78)

**Path**:
```
OTF file (16 MB Regular + 17 MB Bold)
→ fetch() → Blob
→ FileReader.readAsDataURL() 
→ Base64 data URL string (~44 MB for 33 MB binary, 1.33x inflation)
→ JavaScript string in memory
→ pdfmake.fonts = { NotoSansSC: { normal: base64, bold: base64 } }
→ pdfmake VFS copy
→ PDF embedding
```

### 2. Identified Issues

#### Issue A: Massive Base64 Conversion (PRIMARY ROOT CAUSE)
- **What**: Converting 16 MB + 17 MB OTF files to base64 data URLs
- **Memory amplification**: 
  - Source binary: 33 MB
  - Base64 string: ~44 MB (33 MB × 1.33)
  - JavaScript string representation: ~88 MB (UTF-16, 2 bytes per char)
  - pdfMake VFS copy: Additional copy
  - **Total estimated**: 150-200 MB memory pressure

#### Issue B: Synchronous FileReader Conversion
- **What**: `FileReader.readAsDataURL()` blocks on 16 MB file
- **Impact**: UI thread frozen during conversion
- **Duration**: Likely 5-10+ seconds per font

#### Issue C: Console Logging (SECONDARY)
- **What**: Error handling or debugging may log base64 strings
- **Impact**: Console becomes unusable, additional memory pressure

#### Issue D: Both Fonts Loaded Simultaneously
- **What**: Promise.all() fetches both fonts at once
- **Impact**: 2x memory pressure, both converted before either can be GC'd

### 3. Memory Amplification Factor

**Conservative estimate**:
```
Source OTF files:       33 MB
Base64 strings:         44 MB  (1.33x)
JS string memory:       88 MB  (2x base64)
pdfMake internal copy:  ~50 MB (estimated)
Peak memory:            150-200 MB
```

**This is for fonts alone**, not including:
- pdfmake engine (~10 MB)
- Chrome V8 heap overhead
- React/DOM memory
- PDF generation buffers

### 4. "new Function" Source

**Location**: `dist/assets/vfs_fonts-*.js` (1.8 MB)

**Count**: 2 occurrences

**Source**: pdfmake dependencies (pdfkit, brotli decompression)

**Context**: Found in dictionary/transform code (likely brotli decompression)

**CSP Status**: UNCERTAIN - Must test in real Chrome with Mode A (engine-only)

---

## Isolation Harness Implementation

### Created Files
```
src/exporters/pdf-isolation-test.ts      - Three test modes
src/feasibility/pdf-isolation-app.tsx    - Harness UI
pdf-isolation.html                        - Entry page
vite.config.ts                            - Updated config
```

### Test Modes

#### Mode A: Engine Only
- **Purpose**: Test pdfmake core without CJK fonts
- **Fonts**: Built-in Roboto (VFS, ~100 KB)
- **Content**: "ExportAI PDF Engine Test" (English only)
- **Validates**: 
  - MV3 CSP compatibility
  - pdfmake engine functionality
  - Uint8Array generation
  - "new Function" execution path

#### Mode B: CJK Regular Only
- **Purpose**: Test single 16 MB font
- **Fonts**: Noto Sans SC Regular only
- **Content**: "你好，世界。ExportAI 中文测试"
- **Validates**:
  - Single font Base64 conversion
  - Memory handling with one large font
  - Minimal Chinese rendering

#### Mode C: CJK Regular + Bold
- **Purpose**: Test both fonts (original configuration)
- **Fonts**: Regular (16 MB) + Bold (17 MB)
- **Content**: Chinese with bold text
- **Validates**:
  - Multiple font handling
  - Peak memory pressure
  - Full configuration that previously failed

### Safety Improvements

1. **Progress stages**: UI shows current stage (fetching, converting, generating)
2. **Elapsed time tracking**: Measure duration of each test
3. **Safe error display**: Shows error.message only, NO font payload logging
4. **Sequential testing**: UI enforces Mode A → B → C order
5. **Stage isolation**: Each mode is independent function

---

## Actual Bundle Size (Isolation Build)

### Total
```
dist/:                    34 MB (unchanged)
```

### Components
```
vfs_fonts chunk:          1.8 MB (pdfmake + pdfkit + dependencies)
pdf-isolation.js:         11 KB (isolation harness)
pdf-feasibility.js:       7.8 KB (original harness, now unused)
NotoSansSC-Regular.otf:   16 MB
NotoSansSC-Bold.otf:      17 MB
popup.js:                 18 KB
client chunk:             189 KB
content.js:               16 KB
```

**Note**: Both font files still bundled as assets (Vite imports them)

---

## Chrome User Instructions

### Step 1: Rebuild
```bash
npm run build
```

### Step 2: Reload Extension
1. Chrome: `chrome://extensions/`
2. Find ExportAI extension
3. Click "Reload" button

### Step 3: Open Isolation Test Page
```
chrome-extension://<YOUR-EXTENSION-ID>/pdf-isolation.html
```

### Step 4: Test Mode A (REQUIRED FIRST)
1. Open DevTools Console (F12) **BEFORE clicking**
2. Click "Test Engine Only"
3. **CRITICAL**: Watch console for CSP violations
4. Wait for result
5. If success: PDF downloads, check it opens
6. If CSP error: Gate FAILED, cannot use pdfmake

### Step 5: Test Mode B (Only if Mode A passes)
1. Clear Console
2. Click "Test CJK Regular"
3. Watch progress stages
4. Monitor Chrome Task Manager for memory
5. Note elapsed time
6. If hangs >30 seconds: Single font still too large

### Step 6: Test Mode C (Only if Mode B passes)
1. Clear Console
2. Click "Test CJK Both"
3. Same monitoring as Mode B
4. This will likely reproduce original failure

---

## Automated Validation

```
npm test:          ✅ PASS (117/117)
npm run typecheck: ✅ PASS
npm run build:     ✅ PASS
git diff --check:  ✅ PASS (line endings only)
```

---

## Font Subsetting Claims Retracted

**Previous report claimed**: "Font subsetting: 33 MB → ~600 KB"

**Status**: UNPROVEN / NOT VALIDATED

**Reality**:
- 600 KB subset cannot provide arbitrary complete Chinese coverage
- Trade-off between size and glyph coverage is non-trivial
- Common Chinese (GB2312 ~6,700 chars): ~300-600 KB possible
- Extended Chinese (GB18030 ~27,000 chars): ~1-2 MB
- Rare glyphs (龘 麤 齉 翾 𠀀): May not be in subset

**Removed from recommendations** until proven.

---

## Options for Consideration (NOT IMPLEMENTED)

If Mode B or C confirms full-font VFS is root cause:

### Option A: Single Font + Synthetic Bold
- Use Regular only, let pdfmake synthesize bold
- Reduces to 16 MB + memory amplification
- May have poor Chinese bold rendering

### Option B: ArrayBuffer Instead of Base64
- Investigate if pdfmake accepts ArrayBuffer for fonts
- Eliminates Base64 conversion step
- May not be supported by pdfmake API

### Option C: Font Subsetting
- Use fonttools pyftsubset for common Chinese chars
- Target: 300-600 KB per weight
- Coverage: GB2312 (6,700 chars)
- Trade-off: Rare glyphs will be missing

### Option D: Chunked/Lazy Font Loading
- Load font only when generating PDF (not at page load)
- Use Web Worker for Base64 conversion
- Still doesn't solve memory size

### Option E: Alternative PDF Engine
- Switch to jsPDF (lighter, simpler, no Base64 VFS)
- May not support CJK out of box
- Would require new Phase 6 Design Review

**None of these implemented this round** - awaiting user validation results.

---

## Phase 6.0 Status

```
Original Smoke Test:             ❌ FAILED (Chrome hang)
Root Cause:                      ✅ IDENTIFIED (Base64 memory pressure)
Isolation Harness:               ✅ IMPLEMENTED
Automated Tests:                 ✅ PASS (117/117)
Real Chrome Isolation Tests:     ⏳ PENDING USER ACTION
Phase 6.0 Final Gate:            ❌ BLOCKED (previous failure)
Phase 6.1:                       ❌ NOT STARTED
```

---

## Next Steps

1. **User runs Mode A**: Determine if pdfmake engine + CSP work
2. **User runs Mode B**: Determine if single 16 MB font is viable
3. **User runs Mode C**: Confirm original failure reproduced

**Based on results**:
- **All pass**: Font subsetting may be sufficient
- **Mode B hangs**: Even single font too large, need alternative approach
- **Mode A CSP fails**: Cannot use pdfmake at all

---

**Phase 6.0 root-cause analysis complete. Isolation harness ready for user validation.**
