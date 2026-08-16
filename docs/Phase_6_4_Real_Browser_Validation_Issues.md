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
| ISSUE-012 | Unsupported Website Toast Lifecycle | High | P1 | Open |
| ISSUE-013 | Export Failed Error Modal Visual Polish | High | P1 | Open |
| ISSUE-014 | Export Success Modal Visual Polish | High | P1 | Open |
| ISSUE-015 | Real Browser Export Flow Validation | High | P1 | Pending |
| ISSUE-002 | CJK Font Coverage | High | P2 | Next Version Optimization |
| ISSUE-003 | PDF 排版可读性优化 | Medium High | P2 | Next Version Optimization |
| ISSUE-004 | Dark Template 视觉优化 | Medium High | P2 | Next Version Optimization |
| ISSUE-007 | Image 高级场景验证 | Medium | P2 | Next Version Optimization |
| ISSUE-008 | 长 Conversation 压力测试 | Medium | P2 | Next Version Optimization |
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


## ISSUE-012: Unsupported Website Toast Lifecycle

Priority:
P1

Status:
OPEN

问题：

普通网页点击 PDF / Markdown / JSON 后，提示：

```text
Please use on supported AI chat websites
```

出现后无法按预期自动消失。

原因记录：

当前存在 Popup Notice 和 Content Script Toast 两个提示来源，需要统一 Toast 生命周期。

影响：

仅 UX。

不影响：

- ChatGPT Export Flow
- Markdown Export
- JSON Export
- PDF Export


## ISSUE-013: Export Failed Error Modal Visual Polish

Status:
OPEN

Priority:
P1

问题：

ChatGPT 页面未完全加载或导出失败时显示 Error Modal。

当前问题：

- 样式与 Processing / Success Modal 不统一
- 错误视觉过重
- 布局、图标、文案层级需要优化

范围：

仅视觉优化。

不涉及：

- Conversation collection
- Export logic
- Error detection


## ISSUE-014: Export Success Modal Visual Polish

Status:
OPEN

Priority:
P1

问题：

Export Success Modal 与竞品视觉存在差异。

待优化：

- 弹窗尺寸过大
- 下载提示文案不符合预期
- Buy me a coffee 按钮样式需要调整

目标：

统一 Processing / Error / Success Modal 视觉语言。


## ISSUE-015: Real Browser Export Flow Validation

Status:
PENDING

Priority:
P1

验证：

ChatGPT：

- Popup 自动关闭
- Processing Modal
- Success Modal
- 自动下载

普通网页：

- `Please use on supported AI chat websites`

未支持 AI 平台：

- `xxx export is coming soon`


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

### ISSUE-010: 文件命名/tmp 下载细节

作为下一版本优化，不阻塞当前版本。


## Current Priority

P0:

- ISSUE-001 ChatGPT Conversation 完整采集稳定性

P1:

- ISSUE-012 Unsupported Website Toast Lifecycle
- ISSUE-013 Error Modal Visual Polish
- ISSUE-014 Success Modal Visual Polish
- ISSUE-015 Real Browser Export Flow Validation

P2:

- CJK Font Coverage
- PDF Readability
- Dark Template
- Image
- Long Conversation Stress Test
- File naming/download details


## Validation Status

Phase 6.4:
IN PROGRESS

当前版本待完成项：

- ISSUE-001 Real Browser Validation
- ISSUE-015 Real Browser Export Flow Validation
- ISSUE-012 Unsupported Website Toast Lifecycle
- ISSUE-013 Error Modal Visual Polish
- ISSUE-014 Success Modal Visual Polish


## Next Steps

1. 完成 Real Browser Export Flow 验证
2. 修复 Toast 生命周期
3. 优化 Error / Success Modal 视觉
4. 后续进入 PDF Quality 优化

