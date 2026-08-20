# PDF-002-E Conversation Alignment Layout Analysis

## PDF-002 Layout Foundation v1 Stable

PDF layout v1 已达到可用稳定状态，本阶段不再继续优化 PDF layout foundation。

已完成：

- PDF-001 Font Foundation
- PDF-002-A Message Renderer Foundation
- PDF-002-B Message Identity
- PDF-002-C Visual Hierarchy
- PDF-002-D Title Consistency
- PDF-002-E Conversation Alignment
- PDF-002-E1 Message Container Foundation
- PDF-002-E2 Message Body Context

当前验证：

- User message right alignment ✅
- User background cross-page continuity ✅
- Multi-turn User surface isolation ✅
- Assistant does not inherit User surface ✅
- Header/body background continuity ✅
- Code block context architecture implemented ✅

当前状态：

- PDF layout v1 已达到可用稳定状态。
- PDF-002-E2 不标记为完全完成。
- Architecture implemented: complete
- Visual polish: deferred

延期优化（Future PDF v1.1）：

- User short text fit-content width
- Message-level background segments
- Complex block surface hierarchy
- Code/Table/Image advanced adaptation
- Pagination refinement
- Continuation message visual

以上属于视觉 polish，不阻塞 v1。

## 归档状态

- 状态：分析完成，待实施
- 日期：2026-08-19
- 范围：ChatGPT Conversation 的 User / Assistant 横向布局、消息宽度、容器结构、复杂 block 宽度继承与分页影响
- 本次未修改代码、测试、PDF renderer 或产品流程

## 分析材料

- ChatGPT Conversation 截图：User 右侧气泡、Assistant 左侧宽内容列
- 竞品 PDF：`ExportAI-PDF-Test (竞品).pdf`
- 当前 ExportAI PDF：`ExportAI PDF Test（当前效果）.pdf`

本记录区分：PDF 或截图可以直接确认的事实，以及基于现有 alignment 模型对复杂 block 的实现推导。

## 结论

当前 ExportAI PDF 不是 Conversation spatial layout，而是“角色标签 + 连续 block 流”的统一左对齐文档布局。它保留了 `User` / `Assistant` 标签，但没有保留 User 的右侧 alignment、收缩宽度、背景气泡或 message-level container。

竞品 PDF 保留了核心 Conversation alignment：

- User 位于右侧；
- Assistant 位于左侧；
- User 使用内容驱动的浅色气泡；
- Assistant 使用左侧宽内容列；
- header 与 body 共同组成 message group；
- block 的可用宽度跟随所属 message content width。

因此，差异不是单纯的 header 位置差异，而是 message container 和 width model 缺失。后续实现应先建立 message-level horizontal layout，再处理复杂 block 的 width-aware measurement。

## 1. 对照测量

| 项目 | 竞品 PDF | 当前 ExportAI PDF |
| --- | ---: | ---: |
| 页数 | 39 页 | 29 页 |
| 页面尺寸 | 595.92 × 842.88 pt | 595.28 × 841.89 pt |
| 主要左边界 | 约 x=29.2 pt | 约 x=39.7 pt |
| 主要右边界 | 约 x=567.7 pt | 约 x=555.6 pt |
| 主要 content width | 约 538.5 pt | 约 515.9 pt |
| 生成特征 | Chromium / Skia PDF | jsPDF |

页面宽度差异是次要问题。即使保留当前约 515.9 pt 的页面内容宽度，也可以实现 User 右对齐；核心差异在 message-level alignment。

## 2. Alignment

### 2.1 ChatGPT 截图

截图可以确认：

```text
Conversation content area
├── Assistant message：左侧
│   ├── Assistant header
│   └── Assistant body
└── User message：右侧
    └── User bubble
```

User header、User body 和 User bubble 共同构成右侧 message group。Assistant header 和 Assistant body 共同构成左侧宽内容列。复杂 block 位于所属 message 的 body 内，而不是独立于 message 重新决定位置。

### 2.2 竞品 PDF

竞品第一页可以确认：

- User header 位于右侧；
- User body 位于右侧浅色气泡中；
- User 气泡约从 x=387.7 pt 延伸至 x=567.7 pt，宽度约 180 pt；
- Assistant header 位于左侧；
- Assistant body 从约 x=29.2 pt 开始，并使用约 538.5 pt 的宽内容列。

竞品的几何模型可以抽象为：

```text
Assistant:
  x = pageLeft
  width = pageContentWidth
  align = left

User:
  width = min(contentWidth + padding, userMaxWidth)
  x = pageLeft + pageContentWidth - width
  align = right
```

User 不是固定使用页面一半宽度，而是更接近 `fit-content + max-width + align-self: flex-end`。

### 2.3 当前 ExportAI PDF

当前 PDF 第一页的 User 和 Assistant 均从约 x=39.7 pt 开始：

```text
User
User body
separator
Assistant
Assistant body
```

当前特征：

- User header 左对齐；
- User body 左对齐；
- User 使用页面 content width；
- User 没有背景气泡；
- Assistant header 和 body 也左对齐；
- User / Assistant 没有独立的横向 message group。

结论：当前问题不是“User header 没有右移”，而是 User message 没有独立的右对齐 container。

## 3. Width

### User message width

竞品 User message 使用内容驱动的收缩宽度，并受最大宽度约束。当前短文本的 User bubble 约为 180 pt，而页面 content width 约为 538.5 pt。

当前 ExportAI User body 的实际布局宽度等同于页面 content width，缺少：

- message width；
- max-width；
- horizontal padding；
- content width；
- right alignment。

### Assistant message width

竞品 Assistant 使用左侧宽内容列。当前 ExportAI Assistant 的宽度本身没有明显的横向错误，主要问题是它与 User 共用同一种文档流布局，没有形成清晰的 message container 语义。

### Block width

竞品可以抽象为：

```text
Message
└── messageContentWidth
    ├── paragraph
    ├── heading
    ├── quote
    ├── code
    ├── table
    └── image
```

当前 ExportAI 更接近：

```text
Page content width
└── all messages and blocks
```

这对 Assistant 普通内容影响较小，但会影响 User code、table、image 和 image-only message。

## 4. Container

### Header

竞品 header 是 message-level header：

- User header 与 User bubble 同属右侧 message group；
- Assistant header 与 Assistant body 同属左侧 message group；
- Assistant header 包含模型/身份信息；
- User header 包含时间、用户名称和用户图标等导出上下文。

当前 ExportAI 只使用普通的 `User` / `Assistant` 文本标签。它们没有和 body 共享同一个 alignment context，也没有作为完整 message header 建模。

### Body

竞品结构为：

```text
UserMessage
├── Header
└── Bubble
    └── Body

AssistantMessage
├── Header
└── Body
```

当前结构更接近：

```text
Role label
Text flow
Full-width separator
Role label
Text flow
```

### Spacing

当前 ExportAI 使用统一 message gap 和 block gap，能够形成基本的垂直节奏，但 User header、User body、separator、Assistant header 之间更像文档章节关系，而不是 Conversation message group。

竞品更接近：

```text
Header
small header/body gap
Body
message gap
next message
```

### Separator

当前全宽 separator 承担了较多的 message 分组职责。alignment 实现后，message boundary 应主要由：

- header identity；
- User background；
- message spacing；
- Assistant header；

共同表达。全宽 separator 应主要保留给文档 section 或特殊 block，而不应成为 User / Assistant 的主要区分方式。

### Background

竞品 User body 使用浅色背景和圆角，Assistant body 基本保持页面白底。当前 ExportAI User 和 Assistant 都没有 message-level background，导致两类消息的视觉区分不足。

## 5. Complex Block

| Block | 竞品布局模型 | 当前模型 | alignment 风险 |
| --- | --- | --- | --- |
| Quote | 跟随所属 message width，内部缩进 | 跟随 page content width | 中 |
| Code | 跟随所属 message width，有内部 padding | 主要跟随 page content width | 高 |
| Table | 使用所属 message 的 available width | 使用 page content width | 高 |
| Image | 受所属 message width 限制 | message ownership 不明确 | 高 |
| Image-only message | 独立 message container | 当前没有专门结构 | 高 |

### Quote

Assistant quote 的左边界和可用宽度应跟随 Assistant body。User quote 则必须跟随 User bubble 的 content width，不能在 alignment 后回到页面最左侧。

### Code

User code 在窄 bubble 中可能导致：

- code 可用宽度变窄；
- 换行数增加；
- code block 高度增加；
- 分页位置前移；
- 代码背景和 User bubble 背景发生嵌套。

因此 code 必须在最终 message width 确定后测量，不能先按 page width 测量、最后仅做水平平移。

### Table

User table 不应机械地完全继承普通短文本的窄 bubble 宽度，否则中文列和长文本列可能不可读。建议后续区分：

```text
User plain text:
  fit-content + max-width

User complex block:
  min-width constraint / larger max-width
```

Assistant table 则继续使用 Assistant 的宽内容列。

### Image

当前材料没有提供足够的真实 image block 证据来确认竞品的最终 image-only 样式，因此这里只确认宽度约束原则：

```text
imageWidth = min(intrinsicImageWidth, availableMessageContentWidth)
```

Image-only message 不能依赖文本宽度计算，必须拥有独立的 message height 和 width context。

## 6. Pagination Impact

Alignment 会改变 User 的可用宽度，从而改变换行、block 高度和分页位置。

### 长文本

User 使用较窄的 max-width 后，换行数会增加，message height 会增加，后续消息可能提前分页。必须使用 User 的最终 content width 进行文本测量。

### Code

长 code block 需要在 message width 确定后计算行数。应避免 code header 与第一段代码分离，并处理背景跨页、换行和横向溢出策略。

### Table

宽度变化会影响列宽、中文换行、行高和分页。表头重复策略仍需保持，不能因嵌套到 User message 而使用不可读的小列宽。

### Image

image 的宽度变化会改变高度。需要避免 image 在页尾被切成不可读的碎片，也要防止 image-only message 的 body 与后续文本重叠。

### 推荐计算顺序

```text
1. 计算 page content width
2. 计算 message layout width
3. 使用 message content width 测量 blocks
4. 计算 message height
5. 执行分页
6. 按 message layout 渲染 header/body/block
7. 必要时绘制 section separator
```

不应采用“先按 page width 测量全部内容，最后把 User 内容水平平移”的方案。

## 7. 竞品与当前布局模型

### 竞品模型

```text
Page
├── page header / metadata
├── UserMessage
│   ├── right-aligned Header
│   └── right-aligned bubble
│       └── user blocks
├── AssistantMessage
│   ├── left-aligned Header
│   └── left-aligned wide body
│       └── assistant blocks
└── footer / page number
```

### 当前模型

```text
Page
├── document title
├── metadata
├── User label
├── User body
├── full-width separator
├── Assistant label
├── Assistant body
└── full-width section separators
```

当前模型的优点是实现简单、现有 block 和分页逻辑较稳定；缺点是无法表达 User / Assistant 的空间关系，也无法自然支持 User complex block 的 width context。

## 8. 差异与优先级

### P0

1. User message 未右对齐；
2. User 没有独立 message container；
3. User 没有收缩宽度、padding 和背景语义；
4. block width 没有继承 message width；
5. 分页测量无法使用最终 message-specific width。

### P1

1. Header 和 body 未组成同一 message group；
2. User bubble 背景与圆角缺失；
3. User / Assistant 之间过度依赖全宽 separator；
4. code、table、image 的 message-aware width 需要适配；
5. 需要重新验证长文本、复杂 block 和跨页行为。

### P2

1. Assistant header 的 icon、model 和身份视觉增强；
2. User timestamp、participant metadata；
3. User complex block 的 min-width / max-width 精细策略；
4. separator、颜色、页脚等视觉 polish。

## 9. 最小实现方案

不需要重写整个 PDF renderer。建议先在 message-level 引入 layout context：

```ts
type MessageLayout = {
  role: "user" | "assistant";
  x: number;
  width: number;
  contentX: number;
  contentWidth: number;
  align: "left" | "right";
  paddingLeft: number;
  paddingRight: number;
  background?: string;
  borderRadius?: number;
};
```

最小实施顺序：

1. 在 `renderMessage()` 中计算 User / Assistant 的 message layout；
2. Assistant 保持当前左侧宽内容列；
3. User 根据内容宽度和 max-width 计算 `x / width / contentWidth`；
4. Header 和 body 使用同一个 layout，不能只移动 header；
5. block renderer 接收 `availableWidth`；
6. 先验证普通文本 alignment，再接入 code、table、image；
7. 用最终 message width 重新执行 block measurement 和 pagination；
8. 弱化 message 之间的全宽 separator，保留 document section separator。

User 普通文本的基础计算可以是：

```text
userWidth = min(measuredContentWidth + horizontalPadding * 2, userMaxWidth)
userX = pageLeft + pageContentWidth - userWidth
```

复杂 block 不应机械继承普通短文本的窄宽度；table、code、image 需要在后续 PDF-002-E2 中增加 block-specific min-width 或 max-width 策略。

### PDF-002-E2-A Code Block Width Adaptation

E2-A 仅处理 code block 的 message-width 适配，不改变 code block 的视觉样式、语言标签、分页策略或其它 block renderer。

当前实现链路为：

```text
Message container
  ↓
bodyWidth
  ↓
renderMessageBlocks(..., bodyWidth)
  ↓
renderCodeBlock(..., maxWidth)
  ↓
code block background width + text wrapping width
```

实现结果：

- Assistant code block 继承 Assistant message content width，并保持左侧布局；
- User code block 继承 User message content width，不回退到 page full width；
- code block 的最终宽度不会超过 PDF page content width；
- code block 背景矩形和代码换行使用同一可用宽度；
- 保持现有背景、padding、语言标签和代码样式；
- 未修改 table、image、pagination、title、adapter、parser、font 或 Conversation Model。

验证结果：

- `npm test`：14 个测试文件、181 个测试通过；
- `npm run typecheck`：通过；
- `npm run build`：popup 和 content-script 构建通过；
- `git diff --check`：通过。

PDF renderer screenshot verification: PASS（Poppler `pdftoppm`，样本输出为 `tests/output/pdf-render/page-1.png`）。该流程验证了 User code block 位于右侧、Assistant code block 保持更宽内容列、背景覆盖代码文本区域，且没有页面边界漂移或截断。Chrome rendered screenshot verification: pending（当前环境未提供 Chrome/PDFium；该缺口属于真实浏览器链路，不影响本次 PDF renderer 验证）。

## 10. 验证范围

实现后必须至少验证：

- 短 User 文本右对齐、收缩宽度、背景和圆角；
- 长 User 文本按 User max-width 正确换行；
- Assistant 仍保持左侧宽内容列；
- User / Assistant header 与 body alignment 一致；
- User 和 Assistant code 的宽度、背景和分页；
- User 和 Assistant table 的列宽与分页；
- quote 不错误回到页面最左侧；
- image 和 image-only message 的尺寸与分页；
- message 接近页尾时不发生 header/body 分离、重叠或裁切。

自动化 fixture 和 PDF 渲染检查不能替代真实 ChatGPT 页面导出验证。完成 alignment 实现后仍需执行真实 Chrome 链路验证，再决定 PDF-002-E 是否满足完整验收。

## 归档判断

PDF-002-E1 Message Alignment 已完成，PDF-002-E2-A Code Block Width Adaptation 已完成自动化验证。

PDF-002-E2 整体仍未完成，table、image 以及真实 Chrome 链路验证仍属于后续范围。

当前最重要的下一步不是继续调整字体或单个 block 样式，而是建立：

```text
Message
├── Header
├── Body container
├── Alignment
├── Width context
└── Pagination-aware measurement
```

本记录同时保存 E1 与 E2-A 的实施进度，但不代表 PDF-002-E2 整体完成，也不代表真实 Chrome PDF 导出验收已通过。

## 11. 2026-08-21 当前效果复核：背景连续性与消息高度问题

### 分析范围

本次只复核当前生成的 PDF `内置优化提示词算法 (10).pdf` 及多轮次渲染样例的视觉结果，不修改 Adapter、Parser、Collection、Exporter 主流程、Popup、Modal 或 Conversation Model。附件 PDF 中出现的文字属于被导出的会话内容和视觉参考，不属于本项目的执行指令。

### 已确认的视觉事实

#### 1. User 背景的左右错位问题暂未在当前样例中重现

- User header、正文、代码和图片 fallback 整体仍位于右侧 User container 内；
- Assistant 消息没有明显继承 User 背景；
- 后续 User 消息能够重新创建右侧背景；
- 长 User 消息跨页后，背景仍延续在右侧区域。

这说明当前 `messageId + pageNumber + x + width` 状态隔离方向可以防止最明显的跨轮次坐标泄漏，但还不能证明所有复杂 block 和真实 Chrome 页面都已通过验收。

#### 2. 同一 User 消息的背景连续性仍然存在结构性风险

当前背景主要通过以下局部路径绘制：

```text
role header bridge
text line
paragraph / block gap
code block
table
image fallback
```

它不是一个在消息级别一次确定、按页分段的完整背景区域。因此以下位置仍可能出现切割或颜色断层：

- header 与第一段 body 的连接处；
- 不同 block 之间的间距；
- code background、User surface 和 image fallback 的叠加边界；
- quote、nested list、thematic break 等没有独立 surface measurement 的 block；
- block 刚好触发分页时的页底和下一页顶部。

当前已通过 bridge rectangle 和 block gap 绘制缓解了部分断缝，但这是补偿式修复，不是最终的 message-level background 模型。

#### 3. User 短内容的宽度仍然偏大

当前 User 容器使用固定的最大宽度比例：

```text
userWidth = contentWidth * 0.72
```

因此像 `User 1`、`我没有用 ai 的...` 这样的短消息，也会占据明显大于内容所需的右侧气泡宽度。视觉上表现为：

- 短 User 消息像宽栏，而不是内容驱动的气泡；
- 背景色覆盖了大量空白区域；
- User 与 Assistant 的垂直节奏被不必要的宽容器强化；
- 与参考 PDF 中更接近 `fit-content + max-width` 的效果仍有差异。

这属于当前最明确的 P1 布局问题。后续应把“普通短文本宽度”和“复杂 block 最小可读宽度”分开处理，不能用单一比例覆盖所有 User 消息。

#### 4. User 消息高度出现异常的大面积空白

在 `内置优化提示词算法 (10).pdf` 第 1 页中，首个 User 消息的浅色区域占据了很大高度，但实际可见文字只有若干短行，并且行间空白明显偏大。当前证据更支持以下原因之一：

- 原始 DOM 中的多个视觉行被解析为多个 paragraph/block；
- block 之间统一使用 `BLOCK_GAP_MM`，导致短行被异常拉开；
- 某些空 block、换行 block 或 fallback block 被保留并产生高度；
- PDF block renderer 对空内容或单行内容的高度归一化不足。

目前不能仅凭 PDF 视觉结果断定具体是哪一个 Parser 输入造成的，因此该项应先通过 plan/block 数量和每个 block 的起止高度进行日志或测试级定位，再决定修改 parser 还是 renderer。

#### 5. 分页续页的 User 背景缺少消息边界语义

长 User 消息在下一页继续时，当前实现会在右侧绘制连续矩形，但下一页没有重新出现 User header，也没有视觉上的 continuation 标识。这会产生两个风险：

- 用户可能把续页背景误认为新的 User 消息；
- 如果下一页后面紧接 Assistant，User surface 的结束位置只依赖清理矩形，边界不够明确。

这是视觉设计问题，不建议通过继续扩大或缩小 `paintActiveUserSurface()` 的局部矩形来解决。后续应先确定产品规则：续页是否需要 `User (continued)`、是否保留圆角、是否允许背景只包围本页实际内容。

#### 6. 复杂 block 的外层和内层背景层级不统一

当前视觉中可以同时看到：

```text
User surface
  ├── codeBackground
  └── image fallback surface / border
```

这会导致同一 User 消息内部出现多种灰色区域、边框和间距规则。尤其是 image fallback 仍以近似独立卡片绘制，而不是完全继承 User bubble 的视觉语义。表格、quote 和 nested list 也可能出现类似问题。

后续应先定义层级：

```text
Message surface
└── block surface（仅在 block 本身需要独立视觉背景时存在）
```

并明确 code、table、image fallback 是否允许覆盖 User surface，而不是在各 renderer 内部自行决定填充色和边框。

#### 7. Assistant 内容暴露出独立的 block 高度和排版问题

参考样例第 2、3、14 页中，Assistant 的列表、图片 fallback 和长文本总体保持左侧，但存在以下需要单独跟踪的问题：

- 列表 marker、嵌套列表和正文的垂直节奏不完全一致；
- 图片 fallback 的边框高度与文字高度耦合较弱；
- Assistant 复杂 block 与普通 paragraph 的间隔规则不统一；
- 这些问题虽然不直接造成 User 左侧背景，但会影响后续消息的分页位置，间接放大 User surface 的分页风险。

本项不应在本轮通过修改 User surface 逻辑顺手处理，建议作为独立的 block-height 子任务。

### 问题优先级

#### P0：后续继续优化前必须保留的稳定性约束

- User 背景不能泄漏到 Assistant；
- 多轮次 User 消息不能复用上一轮的 `x / width`；
- 跨页后 User 背景不能跳到左侧；
- Assistant 开始时必须立即结束上一条 User 的 active surface。

#### P1：下一轮优先优化

- 普通短 User 文本改为内容驱动宽度；
- 解决短消息大面积垂直空白；
- 建立消息级的按页 background segment，而不是依赖多个 renderer 局部补画；
- 明确 User header、body、block gap 和分页续页的统一几何模型。

#### P2：后续视觉 polish

- code/table/image fallback 的内外背景层级统一；
- Assistant 列表和图片 fallback 的高度归一化；
- 续页 continuation 标识和圆角策略；
- User bubble 的边距、颜色、圆角和参考 PDF 的细节对齐。

### 推荐的下一轮分析/实现顺序

```text
1. 不改渲染逻辑，输出每条 message 的 block 数量、block 类型、起始 y、结束 y、页码
2. 用短文本、多段文本、长文本分别确认异常空白来自 plan 还是 renderer
3. 设计 message-level page segments：messageId + pageNumber + top + bottom + x + width
4. 先实现普通文本的 fit-content + max-width
5. 再定义 code/table/image 的最小可读宽度和独立 block surface 规则
6. 最后重新处理 continuation、圆角和跨页边界
7. 自动化 PDF/PNG 验证后，再进行真实 Chrome 导出验证
```

### 本次结论

当前版本相较“User 背景跳到左侧”的状态已经改善，但仍属于过渡实现。当前最值得优先解决的不是继续增加局部 `paintActiveUserSurface()` 调用，而是：

```text
Message-level geometry
  → page-level background segments
  → content-driven User width
  → block-specific height and surface rules
```

在完成上述分析和模型调整前，不应将 PDF-002-E2 标记为完整完成，也不应将当前 PNG 视觉结果等同于真实 Chrome/PDFium 验收通过。
