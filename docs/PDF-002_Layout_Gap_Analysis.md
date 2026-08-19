# PDF Layout Gap Analysis

内容分层：

------

# 1. 已完成能力

## 数据一致性

✅ Conversation title

- ChatGPT title → Conversation.title
- MD/JSON/PDF 一致

## 字体

✅ CJK

- 中文显示
- 搜索
- 复制

## 内容结构

✅ AST

支持：

- Heading
- Paragraph
- Inline style
- Code
- List
- Quote
- Table
- Image
- Math fallback

## Message 基础

✅

已有：

```
Message
├ Header
├ Body
└ Boundary
```

------

# 2. 当前与竞品差异

## P0 Conversation Layout

### 当前：

```
User

内容


Assistant

内容
```

### 竞品：

更接近：

```
User message

        user content


Assistant/model

assistant content
```

差异：

- 空间方向；
- 角色视觉；
- 消息宽度。

------

## P1 Message Identity

当前：

```
Assistant · model
```

已有。

差异：

- header 层级；
- 时间；
- 平台；
- metadata。

------

## P1 Message Container

当前：

靠：

- 分隔线；
- 空白。

竞品：

靠：

- identity；
- spacing；
- alignment。

------

## P1 Width System

当前：

全部：

```
contentWidth
```

竞品：

可能：

- User max width；
- Assistant full width。

需要确认。

------

## P2 Document Header

当前：

已有：

- title
- platform
- exportedAt

差异：

- 排版层级。

------

## P2 Block Visual

后续：

- Code
- Table
- Quote
- Image
- Math

不是当前最大问题。

------

# 3. 修改优先级

建议：

## Phase 1

### PDF-002-E Analysis

只读：

确认竞品：

- 是否左右布局；
- User 宽度；
- Assistant 宽度；
- 分页策略。

------

## Phase 2

### PDF-002-E1 Message Alignment

只改：

- x 坐标；
- message width。

不改：

- block renderer。

## PDF-002-E1 Implementation Goal

目标：

将 Message 从单列文档流布局，
调整为 Conversation spatial layout。

第一阶段目标：

- 区分 User / Assistant 空间位置
- 保持现有 Block renderer
- 保持现有内容宽度计算能力
- 不引入气泡 UI

- ------

## PDF-002-E1 当前结果

### Message container

✅ 完成

### 视觉确认

- ✅ User right aligned
- ✅ Assistant left aligned
- ✅ Header/body 同容器

### 剩余工作

- E2 Complex Block Width
- E3 Pagination

### PDF-002-E2-A Code Block Width Adaptation

✅ 完成自动化验证

本子阶段仅处理 code block 的可用宽度传递：

- Message container 的 `bodyWidth` 继续作为 block available width；
- Assistant code block 不超过 Assistant message content width；
- User code block 继承 User message content width，不回到 page full width；
- code block 背景宽度与代码换行宽度保持一致；
- 增加 page content width 上限保护，避免 code block 突破页面内容区。

保持不变：

- code style、背景、padding、语言标签；
- table、image、普通文本、heading、list、quote renderer；
- pagination、title、adapter、parser、font 和 Conversation Model。

验证：

- `npm test`：181 tests passed；
- `npm run typecheck`：passed；
- `npm run build`：passed；
- `git diff --check`：passed。

限制：尚未执行真实 Chrome 链路和 PDF 截图视觉验证；E2-A 不能据此标记为完整真实环境验收通过。

## PDF-002-E2 Message Body Container Context

Status: IMPLEMENTED (visual validation pending)

### Completed

已完成：

- MessageBodyLayoutContext 建立

- Context 包含：
  - x
  - y
  - width
  - availableWidth

- Paragraph renderer：
  - 使用 Message body context

- Code renderer：
  - 使用 Message body context
  - 不再依赖：
    - state.margin
    - state.contentWidth
    - page-level x
    - page-level width

### Code Block Layout Improvements

记录：

Code block 现在理论上继承：

- message body x position
- message body width
- available content width

User:

```text
User Message
└ Body Container
  └ Code Block
```

Assistant：

保持：

```text
Assistant Message
└ Body Container
  └ Code Block
```

---

## Visual Validation Status

标记：

PENDING

原因：

自动化验证已通过：

- npm test
- typecheck
- build

但真实 Chrome 导出 PDF 视觉验证尚未完成。

当前需要验证：

1. User Code Block

确认：

- 是否位于 User body container 内
- background 是否跟随 container
- width 是否正确

2. Assistant Code Block

确认：

- 是否保持 Assistant content width
- 是否没有漂移

3. Clean Conversation Validation

当前测试 Conversation 包含较多验证说明文本，可能影响视觉判断。

下一次验证使用：

- 单纯 User code message
- 单纯 Assistant code message

避免测试说明文本干扰。

---

## Remaining PDF-002-E2 Work

保持：

Pending:

- E2-B Table Width Adaptation
- E2-C Image Width Adaptation
- E3 Pagination Adaptation

不要标记：

Code Block 完全完成。


# P1 Alignment Compatibility Risk

Conversation alignment layout 可能影响现有 Block renderer 行为。

需要重点关注：

- Table width
- Code block width
- Image sizing
- Long text wrapping
- Pagination behavior


实施原则：

PDF-002-E1 第一阶段只调整：

- Message x position
- Message width
- Header alignment

不要修改：

- Block renderer
- Table renderer
- Code renderer
- Image renderer
- Pagination logic


原因：

当前 PDF 已经具备稳定的 Block rendering 能力。

Conversation alignment 应首先作为 Message container 层能力实现，
避免同时引入：

- Message layout change
- Block rendering change
- Pagination change

导致问题定位困难。


验证重点：

- User message alignment 不影响正文换行
- Assistant message 不影响复杂 Block
- Table 保持原有列宽行为
- Code block 保持原有宽度和分页行为
- Image 保持尺寸和位置
- 长消息仍可正常分页

------

## Phase 3

### PDF-002-E2 Complex Block Adaptation

处理：

- table；
- code（E2-A 已完成 message-width 适配）；
- image。

------

## Phase 4

### PDF-003 Block Polish

最后优化：

- 样式；
- 颜色；
- 容器。

------

