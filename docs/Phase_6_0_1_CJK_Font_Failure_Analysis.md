# Phase 6.0.1 CJK Font Embedding Failure - Root Cause Analysis

**Date**: 2026-08-15  
**Issue**: Chinese text displays as garbled characters (e.g., ")FMMMP &YQPSU"*")  
**Status**: ROOT CAUSE IDENTIFIED

---

## Real Chrome Test B Results

### What Worked
- ✅ PDF generation: PASS
- ✅ PDF opens: PASS
- ✅ Font embedding: PASS (glyphs present in PDF)

### What Failed
- ❌ Chinese text displays as: ")FMMMP &YQPSU"*"
- ❌ NOT boxes (□□□)
- ❌ NOT missing glyphs
- ❌ Unicode-to-glyph mapping broken

### Diagnosis
**Font glyphs ARE embedded** (otherwise would show □)  
**Unicode cmap/ToUnicode is BROKEN** (glyph indices don't match Unicode)

---

## Root Cause

### Current Implementation Path
```
NotoSansSC-Regular.otf (OpenType font)
  ↓
fetch() → Blob
  ↓
FileReader.readAsDataURL()
  ↓
Base64 data URL: "data:font/otf;base64,..."
  ↓
Strip "data:font/otf;base64," prefix
  ↓
doc.addFileToVFS('NotoSansSC-Regular.ttf', base64String)
  ↓
doc.addFont('NotoSansSC-Regular.ttf', 'NotoSansSC', 'normal')
  ↓
doc.setFont('NotoSansSC')
  ↓
doc.text('你好，世界', 10, 20)
  ↓
RESULT: Garbled text
```

### Critical Issues

#### Issue 1: OTF vs TTF
**Current**: Using OpenType (OTF) font  
**jsPDF Requirement**: TrueType (TTF) font with specific format

**Evidence**:
```bash
$ file src/assets/fonts/NotoSansSC-Regular.otf
OpenType font data
```

**Problem**: jsPDF's `addFont()` expects TTF format with:
- TrueType glyph outlines (not CFF/PostScript outlines in OTF)
- Specific cmap table format
- ToUnicode mapping jsPDF can parse

#### Issue 2: Missing Font Preprocessing
**jsPDF does NOT accept raw TTF/OTF files directly for custom fonts**

**Required**: Font must be converted to jsPDF-specific format

**Tools**:
1. **jspdf-font** npm package (exists, version 1.0.7)
2. Manual conversion using jsPDF font generator

**What conversion does**:
- Parses TTF glyph data
- Extracts Unicode cmap
- Generates jsPDF-compatible font definition
- Creates JavaScript module with:
  - Glyph widths
  - Unicode mappings
  - Font metrics
  - Encoded glyph data

#### Issue 3: Base64 Encoding Method
**Current**: Using `readAsDataURL()` → data URL

**Problem**: jsPDF font format is NOT just base64-encoded binary

**Required**: Preprocessed font definition, not raw binary

---

## Why Garbled Text?

### Symptom Analysis
```
Input:  你好，世界
Output: )FMMMP &YQPSU"*
```

**Explanation**:
1. jsPDF embeds the OTF glyph data (shapes present)
2. jsPDF fails to parse OTF cmap table correctly
3. jsPDF uses fallback/broken glyph indices
4. Each Chinese character maps to wrong glyph
5. Results in random Latin characters or symbols

**This is NOT**:
- ❌ Missing font (would show □)
- ❌ Font load failure (would error)
- ❌ CSP issue (would timeout)

**This IS**:
- ✅ Unicode cmap parsing failure
- ✅ OTF format incompatibility
- ✅ Missing preprocessing step

---

## jsPDF Custom Font Requirements

### Official Workflow (from jsPDF documentation)

**Step 1**: Convert font to jsPDF format
```bash
# Using jspdf-font package or online tool
# Input: NotoSansSC-Regular.ttf
# Output: NotoSansSC-Regular.js (jsPDF font module)
```

**Step 2**: Import converted font
```typescript
import NotoSansRegular from './fonts/NotoSansSC-Regular.js';
```

**Step 3**: Register font
```typescript
doc.addFileToVFS('NotoSansSC-Regular.ttf', NotoSansRegular);
doc.addFont('NotoSansSC-Regular.ttf', 'NotoSansSC', 'normal');
```

### What We Did Wrong
```typescript
// INCORRECT: Using raw OTF base64
const fontBase64 = await blobToBase64(otfBlob);
doc.addFileToVFS('NotoSansSC-Regular.ttf', fontBase64.split(',')[1]);
```

**Problem**: Raw base64-encoded OTF is NOT the format jsPDF expects

---

## Correct Implementation Strategy

### Option A: Use jspdf-font Package (Recommended)

**Install**:
```bash
npm install jspdf-font --save-dev
```

**Preprocess font** (build-time):
```bash
# Convert TTF to jsPDF format
npx jspdf-font convert NotoSansSC-Regular.ttf
# Generates: NotoSansSC-Regular.js
```

**Use in code**:
```typescript
import NotoSansRegular from '../assets/fonts/NotoSansSC-Regular.js';

doc.addFileToVFS('NotoSansSC-Regular.ttf', NotoSansRegular);
doc.addFont('NotoSansSC-Regular.ttf', 'NotoSansSC', 'normal');
doc.setFont('NotoSansSC');
```

### Option B: Use TTF Instead of OTF

**Problem**: Even TTF requires preprocessing

**Not a solution**: Just using TTF instead of OTF won't fix Unicode mapping

### Option C: Runtime Conversion

**Problem**: No browser-side OTF/TTF → jsPDF converter exists

**FontKit**: Can parse fonts but doesn't generate jsPDF format

---

## Font Preprocessing Requirements

### Input Requirements
1. **TrueType (TTF)** format (not OpenType/CFF)
2. Must contain:
   - cmap table (Unicode mapping)
   - glyf table (TrueType outlines)
   - hmtx table (horizontal metrics)

### Conversion Output
**jsPDF font module** (.js file) containing:
```javascript
module.exports = "base64-encoded-preprocessed-font-data-with-cmap";
```

**Size impact**:
- Input TTF: 16 MB
- Output JS: ~16-20 MB (similar size, different format)

### Can We Skip Preprocessing?

**NO** - jsPDF custom font API **requires** preprocessed format.

**Evidence**: Official jsPDF examples always use converted fonts.

---

## Minimal Correction Strategy

### Phase 1: Get TTF Font
```bash
# Convert OTF to TTF (if OTF-only source)
# OR download TTF version of Noto Sans SC
```

### Phase 2: Preprocess Font
```bash
npm install jspdf-font --save-dev

# Convert TTF to jsPDF format
npx jspdf-font convert src/assets/fonts/NotoSansSC-Regular.ttf

# Output: src/assets/fonts/NotoSansSC-Regular.js
```

### Phase 3: Update Test B Code
```typescript
// Import preprocessed font
import NotoSansRegular from '../assets/fonts/NotoSansSC-Regular.js';

// Register font (no fetch, no base64 conversion)
doc.addFileToVFS('NotoSansSC-Regular.ttf', NotoSansRegular);
doc.addFont('NotoSansSC-Regular.ttf', 'NotoSansSC', 'normal');
doc.setFont('NotoSansSC');
```

### Phase 4: Re-test
- Chinese text should render correctly
- Unicode should be searchable
- Text should be selectable

---

## Can Test B PASS?

### Assessment: ⚠️ **MAYBE** (with significant caveats)

### If We Preprocess Font
**Likelihood**: ✅ **HIGH** - Should work

**Evidence**:
- jsPDF officially supports custom TTF fonts
- Preprocessing is documented workflow
- Many users successfully embed CJK fonts this way

**Blockers**:
1. **Font size**: 16 MB font → 16-20 MB JS module (no size reduction)
2. **Build complexity**: Requires preprocessing step
3. **No runtime subsetting**: Still embeds full font
4. **Manual process**: Not automated

### If We DON'T Preprocess Font
**Likelihood**: ❌ **ZERO** - Will not work

**Cannot** use raw OTF/TTF with jsPDF custom fonts.

---

## Critical Trade-offs

### jsPDF Custom Font Path
**Pros**:
- ✅ Technically feasible (with preprocessing)
- ✅ Chinese text will render correctly
- ✅ Text will be searchable/selectable

**Cons**:
- ❌ Still requires 16-20 MB font
- ❌ Build-time preprocessing required
- ❌ No runtime font subsetting
- ❌ Same memory pressure as pdfmake

### Alternative: Use jsPDF with System Fonts?

**Idea**: Can jsPDF use browser system fonts instead of embedding?

**Answer**: ❌ **NO** - PDF must be self-contained

**Why**: PDF specification requires embedded fonts for portability

---

## Comparison: jsPDF vs pdfmake Font Strategy

| Aspect | pdfmake | jsPDF |
|--------|---------|-------|
| Font Format | OTF/TTF via VFS | TTF → preprocessed JS |
| Preprocessing | None (runtime) | **Required (build-time)** |
| Size | 33 MB OTF | 16-20 MB JS module |
| Unicode Support | Built-in | Built-in (after preprocessing) |
| Memory | High | High (similar) |
| Complexity | Medium | **High (preprocessing)** |

### Verdict
**Neither solves the font size problem**

Both require embedding full 16+ MB fonts (or subsets).

---

## Recommended Next Steps

### Option 1: Fix Test B with Preprocessing

**Effort**: 1-2 hours

**Steps**:
1. Install jspdf-font package
2. Convert TTF to jsPDF format
3. Update Test B to use preprocessed font
4. Re-test in Chrome

**Outcome**: Test B likely PASSES, but font size issue remains

### Option 2: Declare CJK Infeasible for v1.0

**Rationale**:
- Both pdfmake and jsPDF require full font embedding
- 16-33 MB fonts are too large
- Font subsetting is complex/unproven in browser
- PDF with English-only is still valuable

**Alternative**: Ship v1.0 with English-only PDF, add CJK in v1.1

### Option 3: Continue with jsPDF but Document Limitation

**Approach**:
- Fix Test B with preprocessing
- Proceed to Phase 6.1
- Implement English + limited CJK
- Document: "CJK support requires large font download"

---

## Final Recommendation

### Immediate Action: Fix Test B

**Why**: Need to know if jsPDF fundamentally works (not blocked by other issues)

**How**:
1. Download TTF version of Noto Sans SC (if not already TTF)
2. Install jspdf-font
3. Preprocess font to jsPDF format
4. Update Test B code
5. Re-test in Chrome

**Expected Result**: Chinese text renders correctly

### After Test B Fix

**If PASS**:
- ✅ jsPDF engine confirmed working
- ✅ CJK technically feasible (with large fonts)
- Decision: Proceed to Test C/D or re-evaluate font strategy

**If STILL FAIL**:
- ❌ jsPDF has other fundamental issues
- Must investigate further or abandon jsPDF

---

## Current Phase 6.0.1 Status

```
Test A (Engine Only):
  ✅ PASS

Test B (CJK Font):
  ❌ FAIL - Unicode mapping broken
  
Root Cause:
  ✅ IDENTIFIED - Missing font preprocessing

Correction Required:
  Font → jspdf-font conversion → preprocessed JS module

Phase 6.0.1 Gate:
  ⏳ BLOCKED (Test B must be fixed)

Phase 6.1:
  ❌ NOT STARTED
```

---

## Summary

**Root Cause**: jsPDF requires **preprocessed TTF fonts in jsPDF-specific format**, not raw OTF/TTF base64.

**Current Implementation**: Uses raw OTF base64 → broken Unicode mapping → garbled text.

**Solution**: Install `jspdf-font` package, preprocess TTF to jsPDF format, import preprocessed module.

**Feasibility**: ✅ Fixable, but doesn't solve 16+ MB font size problem.

**Next Decision**: Fix Test B to confirm jsPDF fundamentally works, then decide on CJK strategy.

---

**Phase 6.0.1 CJK font embedding failure investigation complete.**
