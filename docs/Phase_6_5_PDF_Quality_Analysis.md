# Phase 6.5 PDF Quality Improvement Analysis

## Analysis Scope

本分析对比两份 PDF：

- 竞品 PDF：`ExportAI-PDF-Test (竞品).pdf`
- ExportAI 当前导出的 PDF：`但是有一个非常重要的问题（ExportAI 当前导出 PDF）.pdf`

分析不局限于页面颜色、边距或其他表面视觉差异，而是沿着完整导出链路检查：

```text
Conversation Structure
        ↓
AST / Block Model
        ↓
PDF Renderer
        ↓
Layout Engine
        ↓
Font Encoding
```

重点检查内容包括：

- User / Assistant 角色与消息边界；
- Conversation metadata 和消息阅读节奏；
- Heading、Bold、Italic、Strike、Inline Code、Link、Quote、List；
- Code Block、Table、Image、Math 等 Block；
- 页面 margin、字体层级、段落间距、页面密度和分页；
- 中文字体、Unicode mapping、PDF 搜索与复制可靠性。

竞品 PDF 约 39 页，ExportAI 当前 PDF 约 29 页。两份 PDF 的原始 Conversation 内容并非完全一致，因此页数只作为辅助证据，不作为单独的质量结论。当前 ExportAI PDF 中已观察到中文乱码、`(cid:0)` 字符和部分图片 unavailable fallback，这些属于内容可读性和数据表达问题，不是单纯的视觉风格差异。

## Overall Conclusion

ExportAI 当前 PDF 的核心差距不是普通的视觉差距，而是 Conversation 数据结构、AST / Block Model、PDF Renderer、Layout Engine 和 Font Encoding 之间的表达没有完全闭合。

当前 Conversation Model 已经具备 Message、role、order、metadata 和多种 Block 类型，整体架构方向正确；主要问题在于这些语义信息没有充分转换为具有 ChatGPT Conversation 特征的 PDF 文档。

竞品更像 ChatGPT Conversation Export，主要因为它把每条消息作为独立阅读单元，形成了稳定的：

```text
Role Header
    ↓
Message Body
    ↓
Message Boundary
```

ExportAI 当前更接近把解析后的 Markdown Block 按顺序绘制到 PDF：角色标签存在，但 Message-level hierarchy 较弱；Code、Table、Quote、Image、Math 虽然已有 Block 类型或基础 Renderer，但容器感、fallback 表达和分页语义不足。

当前最严重的问题是 CJK Font / Unicode Mapping。中文正文、表格、数学字符出现乱码或 `(cid:0)`，会直接影响阅读、搜索和复制。若中文内容无法可靠显示和复制，PDF 即使具备基础分页和 Block 绘制能力，也不能视为高质量 Conversation Export。

## Priority Issues

### PDF-001 CJK Font / Unicode Mapping

Priority: **P0**

当前 PDF 中存在以下风险或已观察到的问题：

- 中文内容出现乱码；
- PDF 文本中出现 `(cid:0)` 等异常字符；
- 中文表格和数学字符受到字体映射影响；
- 字体 subset 可能未覆盖当前 Conversation 中的全部中文、数学符号或其他字符；
- PDF 内部 Unicode mapping / ToUnicode 映射可能不完整；
- 字体 embedding、normal / bold 字体注册和字体切换需要进一步确认；
- `courier` 等代码字体处理中文或宽字符时可能造成不可读或宽度计算异常。

该问题会影响：

- 中文可见性；
- Ctrl+F 中文搜索；
- 中文复制；
- 中文表格阅读；
- 中文代码注释阅读；
- 数学 fallback 的可读性。

建议优先检查：

- `NotoSansSC` subset 的字符覆盖范围；
- jsPDF 字体注册和 normal / bold 映射；
- PDF ToUnicode mapping；
- 表格、Inline Code、Math fallback 是否使用了正确字体；
- 数学符号和 CJK 混排时的字形覆盖。

验收标准是中文必须同时满足：可见、可搜索、可复制、表格可读，且数学 fallback 不出现编码异常。

### PDF-002 Message-level PDF Layout

Priority: **P1**

当前 Conversation Model 已保存 `Message.role`、`id`、`order`、`blocks` 和 `metadata`，因此 User / Assistant 信息并非完全丢失。主要差距在 PDF Renderer 没有把 Message 充分表现为强视觉阅读单元。

需要改善：

- User / Assistant hierarchy；
- Role Header 与正文的层级差异；
- Message boundary；
- Assistant 的 platform / model metadata；
- Message 顶部和底部间距；
- 长消息跨页后的上下文恢复；
- 多轮对话的 conversation rhythm。

竞品的阅读单位更接近：

```text
Message
├── Role Header
├── Optional Metadata
├── Content Blocks
└── Message Boundary
```

ExportAI 当前主要依靠角色标签和固定 `MESSAGE_GAP_MM` 分隔消息，导致长内容、复杂 Block 或跨页场景下消息边界变弱。此问题主要属于 PDF Plan、PDF Renderer 和 Layout 层，不应首先归因于 Collection 或 Adapter。

### PDF-003 Block Renderer Quality

Priority: **P1**

当前已有语义 Block Model 和基础 Block Renderer，但不同 Block 与普通正文之间的视觉和布局差异还不够强。

#### Code Block

- 已有代码背景、padding、monospace 和语言字段；
- 需要加强语言 label 的层级；
- 需要优化代码背景、padding 和代码容器感；
- 需要验证中文注释、宽字符和长 token 的换行；
- 需要改善 Code Block 跨页时的连续性。

#### Table

- 已使用 `jspdf-autotable`，并具备重复表头和基础分页能力；
- 需要先解决中文字体和 Unicode mapping；
- 需要优化 column width、cell padding、header style 和长文本换行；
- 需要验证中文表格在 Default / Dark template 下的可读性；
- 需要确认表格内的 Inline Style、Link、Code 和 Math 是否会降级。

#### Quote

- 已有 Quote Block 和左侧边界绘制；
- 需要增强引用线、缩进、背景和上下间距；
- 需要保证引用内部的多段文本、列表等内容保持引用上下文。

#### Image

- Model 已有 `src`、`alt` 和可选 `caption`；
- 需要确认图片源在 Parser 输出时是否仍然可嵌入；
- 需要优化图片尺寸、最大宽度、位置和 caption 关系；
- 图片加载失败时应展示可理解的 fallback，而不是普通正文或模糊的 unavailable 文本；
- 需要区分图片不存在、图片源不安全、格式不支持和加载失败。

#### Math

- Model 已有 `latex` 和 `display` 字段；
- 当前主要是 LaTeX source fallback，不是完整公式排版；
- inline math 与 display math 的视觉区别不足；
- `$$`、`^` 等源语法直接出现在正文中时，容易被用户理解为解析失败；
- 需要将数学 fallback 作为独立、可复制、可读的 Block 展示；
- 需要确保数学字符不受字体 subset 和 Unicode mapping 破坏。

### PDF-004 Pagination Semantics

Priority: **P1**

当前 Layout Engine 的基本策略是根据剩余页面高度判断是否换页，能够避免内容超出页面底部，但还没有充分理解 Conversation 和 Block 的语义。

需要重点处理：

- heading keep-with-next，避免标题孤立在页面底部；
- role label 与消息第一个 Block 保持在一起；
- Message boundary 在跨页后仍然可识别；
- Code Block 跨页时保持代码连续性；
- Table 跨页时重复表头并保持列结构；
- Image 与 image caption 尽量保持在一起；
- Quote Block 不应被不必要地拆散；
- 长消息跨页后仍能恢复 User / Assistant 上下文。

当前 `ensureSpace` 是必要的基础能力，但它属于空间阈值分页，尚不是完整的 Conversation document pagination。

### PDF-005 Image / Math fallback

Priority: **P1**

Image 和 Math 的基础数据结构已经存在，但 fallback 的用户表现仍不够产品化。

Image fallback 需要：

- 保留 alt 和 caption；
- 明确失败原因；
- 使用独立的图片占位区域；
- 避免图片失败后破坏消息顺序；
- 保持图片与前后文字的 Message context。

Math fallback 需要：

- 区分 inline 和 display；
- 保留 LaTeX 可复制性；
- 不让原始 Markdown wrapper 污染普通段落；
- 提供清晰的数学内容区域；
- 记录 warning，但不让 warning 直接破坏正文阅读。

Phase 6.5 不要求立即引入完整 KaTeX / MathJax PDF 排版。优先目标是让 fallback 稳定、可读、可复制，并且不会被误认为普通 Markdown 残留。

### PDF-006 Typography / Theme Polish

Priority: **P2**

在 P0 / P1 问题解决后，再处理以下视觉细节：

- 页面 margin；
- Conversation title 和 metadata 的字体层级；
- User / Assistant header 的字号、字重和颜色；
- Heading 1-6 的字号差距和上下间距；
- 段落和 Block 间距；
- Code Block 背景和边界；
- Table header、border 和 cell padding；
- Link 颜色和可识别性；
- Default / Dark template 的对比度；
- Footer、页码和导出信息；
- 页面整体密度。

这些视觉优化会影响“像不像产品文档”，但不能排在字体编码、Message hierarchy 和 Block 语义之后。

## Recommended Fix Order

推荐按以下顺序推进：

1. **Font / Unicode**
   - 修复 CJK 字体覆盖、字体注册、Unicode mapping、ToUnicode 和 PDF embedding；
   - 验证中文显示、搜索、复制、表格和数学 fallback。

2. **Message-level hierarchy**
   - 强化 User / Assistant Role Header；
   - 增加 Message boundary；
   - 利用 platform、model 和时间等 metadata；
   - 保持多轮对话节奏。

3. **Block renderer**
   - 优先优化 Code Block、Table、Quote；
   - 然后处理 Image 和 Math 的独立容器；
   - 保持现有 `Conversation → PdfDocumentPlan → jsPDF` 架构。

4. **Pagination**
   - 增加 heading keep、role label keep、Code Block 连续性、Table 重复表头和 Image caption 绑定；
   - 减少语义上不合理的分页。

5. **Image / Math**
   - 明确图片源状态和 fallback；
   - 将数学 fallback 与普通文本区分；
   - 保证可读性和可复制性。

6. **Visual polish**
   - 最后调整字体层级、颜色、主题、间距、页脚和页面密度。

不建议第一步更换 PDF 引擎。当前 jsPDF + AutoTable 的基础架构仍可通过局部修改满足 Phase 6.5 的主要目标。

## Scope Boundary

Phase 6.5 不修改：

- Popup；
- Export Flow；
- Adapter；
- Collection；
- Download Service。

主要修改范围：

- `src/exporters/pdf-engine.ts`；
- `src/exporters/pdf-layout.ts`；
- `src/exporters/pdf-block-renderer.ts`；
- `src/exporters/pdf-inline-renderer.ts`；
- `src/exporters/pdf-document.ts` 和 `src/exporters/pdf-types.ts`，仅在需要补充 PDF Plan 语义时修改；
- Font assets，尤其是 `NotoSansSC` subset 和相关字体注册资源。

只有在后续证据确认图片 source 在 Parser 之前已经丢失时，才考虑扩大到对应的 Parser 或 Adapter 边界；不应为了 PDF 视觉优化直接修改 Collection、Adapter 或 Export Flow。

## Final Assessment

ExportAI 当前并非缺少 Conversation Model 或 Block Model。它已经拥有继续改进所需的核心结构，当前主要问题是这些结构在 PDF Renderer、Layout Engine 和 Font Encoding 中没有被完整表达。

Phase 6.5 的目标不是制作一个普通 PDF Generator，而是让输出接近：

```text
ChatGPT Conversation Export
```

最小高收益路径是：

```text
CJK Font / Unicode
        ↓
Message-level hierarchy
        ↓
Code / Table / Quote containers
        ↓
Semantic pagination
        ↓
Image / Math fallback
        ↓
Typography / Theme polish
```

完成 P0 和主要 P1 后，ExportAI PDF 才能从“打印 Markdown / Block”逐步转向“可阅读、可搜索、可复制的 ChatGPT Conversation 文档”。

---

## PDF-001 Font and Unicode Mapping Investigation Archive

**Issue**: PDF-001 CJK Font and Unicode Mapping Investigation  
**Phase**: 6.5 PDF Quality Improvement  
**Status**: ANALYSIS COMPLETE  
**Scope**: Font selection, font registration, embedding, Unicode mapping, fallback, and font-only comparison with the competitor PDF.  
**Code changes**: None.

### Evidence Reviewed

- ExportAI sample PDF: `但是有一个非常重要的问题（ExportAI 当前导出 PDF）.pdf`
- Competitor sample PDF: `ExportAI-PDF-Test (竞品).pdf`
- `src/exporters/pdf-engine.ts`
- `src/exporters/pdf-inline-renderer.ts`
- `src/exporters/pdf-block-renderer.ts`
- `src/assets/fonts-subset/NotoSansSC-Subset.js`

### Archived Findings

1. ExportAI registers `NotoSansSC-Subset.ttf` through jsPDF VFS and registers only `normal` and `bold`. The same Regular TTF is used for both styles; separate CJK italic and bold-italic registrations are absent.
2. The checked ExportAI PDF contains `/NotoSansSC` Type0 resources with ToUnicode, so the root cause is not simply “CJK font is not registered” or “ToUnicode is completely absent.”
3. The embedded subset metadata reports 143 listed characters and only 105 unique characters. This is insufficient for arbitrary conversations, Chinese tables, code comments, mathematical symbols, special Unicode characters, and emoji.
4. The PDF also retains jsPDF Type1 resources including Helvetica, Courier, Times, Symbol, and ZapfDingbats. Inline code and code blocks explicitly select `CODE_FONT`; Latin italic paths explicitly select Helvetica. These paths are not proven to provide complete CJK or Unicode coverage.
5. Tables select the shared `FONT_FAMILY`, but table content is still constrained by the same incomplete subset and does not perform character-level fallback.
6. The competitor PDF uses many embedded Type0 subsets with ToUnicode, including separate CJK regular/bold resources and CJK-capable monospace resources. Its first-page sample visibly contains Chinese, bold text, and emoji that are absent or unstable in the ExportAI sample.

### Root Cause Priority

| Priority | Root cause | Impact |
| --- | --- | --- |
| P0 | Static CJK subset covers only 105 unique characters | Missing Chinese glyphs, malformed CJK text, table failures, math/special-character failures |
| P0 | Subset coverage and effective CID/ToUnicode coverage are incomplete for actual output characters | `(cid:0)`, failed copy/search, empty or replacement characters |
| P1 | `normal` / `bold` / `italic` / `bolditalic` mapping is incomplete | Inconsistent glyphs and fallback during emphasis rendering |
| P1 | Code and inline-code paths select a font without demonstrated CJK coverage | Chinese code and wide Unicode characters become unreadable or unmapped |
| P2 | Default Type1 font resources remain available to renderer paths | Helvetica/Courier/Symbol fallback for unsupported CJK, math, and emoji |

### Minimal Fix Boundary

When implementation is authorized, limit the first fix to:

- `src/exporters/pdf-engine.ts`: font assets, registration, and explicit style mappings;
- the font subset generation source and generated assets under `src/assets/fonts/` and `src/assets/fonts-subset/`;
- `src/exporters/pdf-inline-renderer.ts`: only controlled font selection/fallback;
- `src/exporters/pdf-block-renderer.ts`: only table/code font binding.

Do not modify Popup, Export Flow, Conversation Collection, Adapter, Parser, PDF layout, pagination, or block layout as part of PDF-001.

### Recommended Fix Order

1. Replace the 105-character production subset with a font strategy that covers every character emitted by the conversation, initially prioritizing correctness over font-size optimization.
2. Register independent CJK Regular and CJK Bold assets; do not treat one Regular file as the final Bold implementation.
3. Provide an explicit CJK-capable code font or controlled fallback for inline code and code blocks.
4. Verify every emitted CJK/symbol character through rendered output, copy, search, and PDF object inspection of Type0, ToUnicode, and subset coverage.
5. Define emoji support separately; expanding a CJK font subset alone does not provide reliable emoji support.

### Validation Boundary

This archive records static PDF inspection and source inspection only. It does not claim that a corrected implementation exists or that real Chrome export validation has passed. PDF-001 remains an implementation issue until the repaired font chain passes fixture-level checks and a real browser export flow.

---

## PDF-001-A Production CJK Font Strategy Status

**Status**: **VALIDATED PARTIAL COMPLETE**

### Completed

- Removed the production dependency on the static 105-character subset.
- Enabled the full CJK Regular TrueType font for the PDF engine.
- Corrected inline code, code block, and table font fallback so these paths no longer explicitly select Courier or Helvetica for CJK content.

### Blocked

- True CJK Bold font registration remains blocked.

### Reason

The current Bold asset is a CFF OTF font. It is incompatible with the jsPDF TrueType font parser and cannot be registered as a reliable production Bold face in the current PDF engine.

The Regular font must not be treated as the final Bold implementation.

### Next

Provide a jsPDF-compatible TrueType Bold font, then repeat PDF-001-A validation for Chinese display, copy, and search across regular, bold, inline code, code block, table, and math fallback content.

---

## PDF-001-C True CJK Bold Font Integration

**Status**: **COMPLETE**

### Completed

- Added `NotoSansSC-Bold.ttf`.
- Generated the jsPDF font module.
- Registered the real CJK Bold font.
- Removed the Regular-as-Bold workaround.

### Font Mapping

```text
NotoSansSC-Regular.ttf
→ normal

NotoSansSC-Bold.ttf
→ bold
```

### Validated

- Chinese text rendering;
- Heading bold;
- Inline bold;
- Mixed bold text;
- Table header bold;
- Table cell normal rendering.

### Notes

Copying PDF text preserves Unicode content, but plain text copy does not preserve font weight.

---

## PDF-003-A Table Cell Rich Text

**Status**: **DEFERRED**

### Attempt

Implemented custom table cell rich text rendering using AutoTable hooks.

### Result

Failed for production use.

### Reason

Custom cell drawing conflicted with `jspdf-autotable` layout calculations:

- cell height;
- wrapping;
- positioning;
- pagination.

### Decision

Restore AutoTable default rendering.

### Current Behavior

- Table structure stable;
- Column width stable;
- Wrapping stable;
- Pagination stable;
- Header bold supported.

### Future

Requires a custom table layout engine or deeper AutoTable integration.

---

## PDF Validation Snapshot

Latest PDF:

- CJK rendering: **PASS**;
- Bold rendering: **PASS**;
- Table layout: **PASS**;
- Table rich inline style: **Deferred**;
- Emoji: **Pending**;
- Image advanced cases: **Pending**;
- Long pagination stress: **Pending**.
