# PDF-002 Message-level Layout Analysis

## 归档状态

- 状态：分析完成，待实施
- 日期：2026-08-18
- 范围：Conversation → PdfDocumentPlan → PDF Engine → Message Rendering 的消息级布局
- 对比材料：当前 ExportAI PDF 与竞品 PDF 样本
- 本次未修改代码、测试、字体、表格 renderer、adapter、parser、export flow、collection 或 pagination 实现

## 结论

当前 PDF 的内容 block 保留能力已经较完整，但 Message 层仍然采用“角色标签 + 连续 block 流”的文档式排版。竞品采用的是更明确的“消息身份 + 消息正文 + 消息间距”结构。

因此，当前 PDF 更像 Markdown document，竞品更像 ChatGPT Conversation Export。核心差异不在字体、表格或解析器，而在当前 `PdfMessagePlan` 只有 `role + blocks`，没有消息级 metadata、消息边界和消息容器语义。

## 1. 当前 Message Rendering Pipeline

当前路径为：

```text
Conversation
  ↓
createPdfDocumentPlan()
  ↓
PdfDocumentPlan
  ↓
renderPdfDocumentPlan()
  ↓
renderTitleAndMetadata()
  ↓
renderRoleLabel()
  ↓
renderMessageBlocks()
```

主要实现位于：

- `src/exporters/pdf-document.ts`
- `src/exporters/pdf-engine.ts`
- `src/exporters/pdf-block-renderer.ts`
- `src/exporters/pdf-layout.ts`
- `src/exporters/pdf-types.ts`

当前 `PdfMessagePlan` 为：

```ts
interface PdfMessagePlan {
  role: "user" | "assistant";
  blocks: PdfBlockPlan[];
}
```

### User message

`user` 角色被映射为固定文本 `User`，随后直接渲染消息 blocks。没有气泡、背景、边框、时间、用户名称或消息级来源信息。

### Assistant message

`assistant` 角色被映射为固定文本 `Assistant`，使用与 User 相同的正文 renderer、左边距和 block 间距。Conversation model 不会进入 Assistant 的 role header。

### Role label

Role label 在 `src/exporters/pdf-engine.ts` 中通过固定映射生成：

```ts
const ROLE_LABELS = {
  user: "User",
  assistant: "Assistant",
};
```

它不是 `PdfMessagePlan` 的字段，也不包含参与者、模型、时间或消息状态。

### Metadata

当前 PDF 只在文档顶部保留：

```text
Platform: chatgpt
Model: ...
```

虽然 Unified Conversation Model 中存在 `createdAt`、`updatedAt`、`exportedAt` 以及 `MessageMetadata.createdAt`、`isPartial`，但当前 PDF Plan 和 Engine 没有使用这些字段。

当前未保留或未显示：

- 导出时间；
- 会话创建/更新时间；
- 消息时间；
- partial message 状态；
- source attributes；
- 消息级模型信息。

## 2. 与竞品的视觉差异

竞品样本显示了导出时间、参与者/模型信息、会话标题、平台与模型，以及更明显的 header/body 节奏。当前 PDF 只显示 `Platform`，并使用 `User` / `Assistant` 作为普通粗体文本。

| 项目 | 当前 PDF | 竞品 PDF |
| --- | --- | --- |
| Role header | `User` / `Assistant` | 参与者或模型名称 |
| Model 信息 | 文档顶部 metadata | 与消息来源更紧密关联 |
| Message boundary | 主要依靠 6mm 空白 | header、正文和间距共同形成 |
| User/Assistant 区分 | 仅文本和粗体 | 身份信息更明确 |
| Message metadata | 基本未显示 | 有时间、参与者等导出上下文 |
| Conversation rhythm | 连续 Markdown 文档流 | 一条消息一条消息阅读 |
| 页脚/导出信息 | 当前样本未体现 | 有导出信息和页码结构 |

当前布局参数为：

```text
ROLE_FONT_SIZE     = 11pt
BODY_FONT_SIZE     = 11pt
MESSAGE_GAP_MM     = 6mm
BLOCK_GAP_MM       = 3mm
SECTION_GAP_MM     = 4mm
METADATA_FONT_SIZE = 10pt
```

Role 与正文同为 11pt，Role 主要依靠粗体识别；消息结束后只有统一的 6mm 间距，没有独立的 header gap、body gap 或 message container。

这会产生三个直接结果：

1. Markdown heading 的层级高于 Message identity，文档章节比角色更突出；
2. 多条消息容易被阅读成同一篇长文档中的多个段落；
3. Message 边界只有空间差，没有真正的消息结构差。

## 3. Pagination Impact

本次不修改 pagination，但当前实现存在以下消息级风险：

| 风险 | 现状 | 优先级 |
| --- | --- | --- |
| Message 跨页断裂 | 可能发生，未做消息整体测量 | P1 |
| Role header 孤立 | 可能发生，Role label 未与首个正文联合保留 | P0 |
| Block 顺序保持 | 基本保持 | - |
| Message context 同页保持 | 未保证 | P1 |

当前 `renderRoleLabel()` 不会为“role header + 至少一行正文”预留联合空间。因此页面底部可能出现：

```text
Assistant
```

下一页才出现对应正文。

不建议在 PDF-002 中强制整条长消息不跨页。代码、表格、长列表和长正文仍需要自然分页；本阶段只需要增加 Message 开始时的最小 header/body 分页保护。

## 4. 问题清单与优先级

### P0

1. Role header 不是完整的 Message header；
2. Role header 可能在页面底部孤立；
3. Message 没有独立的 renderer 和布局边界。

### P1

1. `PdfMessagePlan` 只有 `role + blocks`，消息级 metadata 未进入 Plan；
2. Conversation model 没有与 Assistant header 关联；
3. Message boundary 只依靠 6mm 空白；
4. Block gap 与 Message gap 层级不够明确；
5. Message context 的跨页连续性未保证。

### P2

1. 顶部 metadata 不完整；
2. Role label 固定为 `User` / `Assistant`；
3. 导出时间、消息时间和 partial 状态未显示。

## 5. 最小修改方案

### 5.1 扩展 PdfMessagePlan

在不改变 Conversation、adapter 或 parser 的前提下，允许 Plan 消费已有字段：

```ts
interface PdfMessagePlan {
  role: "user" | "assistant";
  blocks: PdfBlockPlan[];
  model?: string;
  createdAt?: string;
  isPartial?: boolean;
}
```

字段是否全部显示，应由 PDF layout 决定，不应在本阶段回头修改采集链路。

### 5.2 增加 Message-level renderer

建议在 `pdf-block-renderer.ts` 增加：

```ts
renderMessage(state, message, x, maxWidth)
```

由它统一负责：

1. header 与首个正文的最小空间保护；
2. Role / model / timestamp header；
3. header-body gap；
4. `renderMessageBlocks()`；
5. message bottom gap。

Engine 只保留文档级编排，消息细节集中在 Message renderer 中。

### 5.3 增加 Message-level layout constants

建议将单一 `MESSAGE_GAP_MM` 拆为职责明确的参数，例如：

```text
MESSAGE_HEADER_GAP_MM
MESSAGE_BODY_GAP_MM
MESSAGE_BOTTOM_GAP_MM
MESSAGE_MIN_START_HEIGHT_MM
```

具体数值应在实现阶段通过 fixture PDF 和真实浏览器导出结果确定。

### 5.4 增加最小分页保护

当当前页剩余空间不足以容纳 Role header、header-body gap 和至少一行正文时，先换页。

不在本阶段重写整体 pagination，也不强制整条长消息保持同页。

## 6. 修改文件范围

### 允许修改

- `src/exporters/pdf-types.ts`
- `src/exporters/pdf-document.ts`
- `src/exporters/pdf-engine.ts`
- `src/exporters/pdf-block-renderer.ts`
- `src/exporters/pdf-layout.ts`
- 与 Message layout contract 直接相关的 PDF tests

### 不应修改

- `src/assets/fonts/**`
- `src/assets/fonts-test/**`
- `src/exporters/pdf-inline-renderer.ts`
- 表格 renderer / AutoTable 逻辑
- `src/adapters/**`
- `src/parser/**`
- `src/content/**`
- `src/popup/**`
- `src/background/**`
- `src/exporters/pdf-download-service.ts`
- `src/preview/**`
- manifest、export flow、collection

## 7. 归档判断

PDF-002 当前结论为：**消息级布局问题已完成分析，实施未开始**。

下一阶段的最小目标是：

```text
让每条 Message 成为独立布局单元，
而不是继续把 Role label 插入 Markdown block 流。
```

优先顺序：

1. Message header 与首个正文保持同页；
2. 建立 Message-level renderer；
3. 映射已有 model / timestamp metadata；
4. 区分 header gap、block gap、message gap；
5. 增强 Message boundary 和 Conversation rhythm。

本记录只归档分析结论，不代表 PDF-002 已实施或真实 Chrome 导出验收已通过。

## PDF-002-A Message Renderer Foundation

Status:
COMPLETE

Completed:

- Added message-level renderer abstraction.
- Message rendering is now structured as:

```text
Message
├── Header
├── Body
└── Spacing
```

Implemented:

- `renderMessage()` introduced.
- `pdf-engine` no longer directly combines:
  - `renderRoleLabel()`
  - `renderMessageBlocks()`
  - `advanceY()`

Message spacing:

Added:

- `HEADER_BODY_GAP_MM`
- `MESSAGE_BOTTOM_GAP_MM`

Separated:

- block spacing
- message spacing

Pagination protection:

Added message start protection.

Before rendering the message header, the renderer ensures enough space for:

- role header
- header/body gap
- first content line

Validation:

- `npm test` passed
- typecheck passed
- build passed
- existing PDF rendering tests passed

Not included:

- model information
- timestamp
- participant identity
- message metadata
- card/background style
- visual redesign

## PDF-002-A Visual Validation Note

Observation:

Although the internal Message rendering structure was improved, the visible difference compared with the previous PDF is limited.

Reason:

This phase focused on:

- rendering architecture
- spacing separation
- pagination safety

It did not yet introduce:

- enhanced message identity
- model header
- visual hierarchy changes

Next:

PDF-002-B Message Identity Enhancement
