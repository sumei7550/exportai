# Phase 6.4 Real Browser Validation Issues

Status:
IN PROGRESS


## Priority Strategy

当前版本优先保证：

- 导出流程可靠
- 用户体验完整
- 导出反馈清晰

PDF 视觉精修和极端字体覆盖作为后续优化，不阻塞当前版本。


## Issue List

| ID | Issue | Severity | Priority | Status |
|----|-------|----------|----------|--------|
| ISSUE-001 | ChatGPT 会话完整采集不稳定 | High | P0 | Implementation Complete / Validation Pending |
| ISSUE-011 | 导出流程用户体验不足 | High | P1 | Open |
| ISSUE-005 | Popup 首页布局与竞品差距 | Medium High | P1 | Open |
| ISSUE-006 | Download 交互体验 | Medium | P1 | Open |
| ISSUE-002 | CJK Font Coverage | High | P2 | Next Version Optimization |
| ISSUE-003 | PDF 排版可读性优化 | Medium High | P2 | Next Version Optimization |
| ISSUE-004 | Dark Template 视觉优化 | Medium High | P2 | Next Version Optimization |
| ISSUE-007 | Image 高级场景验证 | Medium | P2 | Next Version Optimization |
| ISSUE-008 | 长 Conversation 压力测试 | Medium | P2 | Next Version Optimization |
| ISSUE-009 | Template 视觉细节 | Medium | P2 | Next Version Optimization |
| ISSUE-010 | 文件命名/tmp 下载细节 | Low | P2 | Next Version Optimization |


## ISSUE-001: ChatGPT 会话完整采集不稳定

Priority:
P0

Status:
Implementation Complete

Validation:
Pending

说明：
这是所有导出的基础问题。Markdown、JSON、PDF 三种导出共享同一个 Conversation 数据源，因此必须完成 Real Browser Validation，确认不同滚动状态下都能完整、稳定地采集会话。


## ISSUE-011: 导出流程用户体验不足

Severity:
High

Priority:
P1

包含：

- 会话采集过程页面滚动影响体验
- 缺少 Processing Modal
- 缺少 Loading 动画
- 缺少处理中状态文案循环
- 缺少 Export Success 成功反馈弹窗

目标流程：

```text
Export
  ↓
Processing Modal
  ↓
Export Success!
```

Processing Modal 标题：

```text
Processing, Please wait...
```

Processing Modal 包含 Loading 动画，并循环展示以下状态文案：

- Working on it...
- Longer chats may take a bit more time...
- Formatting your content...
- Almost there...
- Please keep this tab open...

Success Modal：

- 显示 `Export Success!`
- 用户手动关闭
- 支持右上角关闭按钮
- 支持点击弹窗外区域关闭

不包含：

- 评价按钮
- Chrome Web Store 引导
- 社交链接


## P2: Next Version Optimization

### ISSUE-002: CJK Font Coverage

当前基础中文导出能力可用，极端字符覆盖优化不阻塞当前版本。

### ISSUE-003: PDF 排版可读性优化

包括：

- 字号
- 间距
- 页面密度
- 消息层级

### ISSUE-004: Dark Template 视觉优化

包括：

- 对比度
- 表格颜色
- 代码块颜色

### ISSUE-007: Image 高级场景验证

作为下一版本优化，不阻塞当前版本。

### ISSUE-008: 长 Conversation 压力测试

作为下一版本优化，不阻塞当前版本。

### ISSUE-009: Template 视觉细节

作为下一版本优化，不阻塞当前版本。

### ISSUE-010: 文件命名/tmp 下载细节

作为下一版本优化，不阻塞当前版本。


## Current Blocking Issues

P0:

- ISSUE-001 ChatGPT Conversation 完整采集验证

P1:

- ISSUE-011 Export Flow UX


## Validation Status

Phase 6.4:
IN PROGRESS

当前版本待完成项：

- ISSUE-001 Real Browser Validation
- ISSUE-011 Export Processing / Success UX


## Next Action

1. 完成 ISSUE-001 Real Browser Validation
2. 实现 ISSUE-011 Export Processing / Success UX
3. 优化 Popup / Download Flow
4. 后续处理 PDF Quality
