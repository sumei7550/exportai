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
- code；
- image。

------

## Phase 4

### PDF-003 Block Polish

最后优化：

- 样式；
- 颜色；
- 容器。

------

