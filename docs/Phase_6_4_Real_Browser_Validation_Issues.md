# Phase 6.4 Real Browser Validation Issues

Status:
Phase 6.4 Implementation Complete / Real Browser Validation Pending


## Priority Strategy

当前版本优先保证：

- 导出流程可靠
- 用户体验完整
- 导出反馈清晰

PDF 视觉精修和极端字体覆盖作为后续优化，不阻塞当前版本。


## Issue List

| ID | Issue | Severity | Priority | Status |
|----|-------|----------|----------|--------|
| ISSUE-001 | ChatGPT 会话完整采集不稳定 | High | v1.1 | Deferred to v1.1 |
| ISSUE-012 | Unsupported Website Toast Lifecycle | High | P1 | Complete |
| ISSUE-013 | Empty Chat Page Feedback UX | High | P1 | Complete |
| ISSUE-015-A | Processing / Popup Flow Timing | High | P1 | Complete |
| ISSUE-015-B | Collection Scroll UX Known Limitation | High | P1 | Known Limitation |
| ISSUE-014 | PDF Quality Issues | High | P2 | Later Phase |
| ISSUE-002 | CJK Font Coverage | High | P2 | Next Version Optimization |
| ISSUE-003 | PDF 排版可读性优化 | Medium High | P2 | Next Version Optimization |
| ISSUE-004 | Dark Template 视觉优化 | Medium High | P2 | Next Version Optimization |
| ISSUE-007 | Image 高级场景验证 | Medium | P2 | Next Version Optimization |
| ISSUE-008 | 长 Conversation 压力测试 | Medium | P2 | Next Version Optimization |
| ISSUE-010 | 文件命名/tmp 下载细节 | Low | P2 | Next Version Optimization |


## ISSUE-001 ChatGPT Full Conversation Collection Stability

当前状态：

```text
Deferred to v1.1
```

原因：

ChatGPT virtualization / dynamic loading 场景需要更深入处理，不阻塞 v1 发布。

已完成：

- ✅ Message identity collection
- ✅ MessageCache alias merge
- ✅ Ordering conflict prevention
- ✅ Virtualized DOM edge validation
- ✅ Turn sequence baseline validation
- ✅ Real Chrome diagnostic framework

当前限制：

Known limitation:

- Extremely long ChatGPT conversations may occasionally fail complete collection.
- Different initial scroll positions may produce different collection completeness.
- Future version will improve virtualization settle detection.

未来计划：

v1.1:

- Improve top loading completion detection
- Improve virtualization settle strategy
- Complete top/middle/bottom consistency validation
- Improve incomplete recovery behavior


## ISSUE-012: Unsupported Website Toast Lifecycle

Priority:
P1

Status:
COMPLETE

问题：

普通网页点击 PDF / Markdown / JSON 后，提示：

```text
Please use on supported AI chat websites
```

出现后无法按预期自动消失。

原因记录：

当前存在 Popup Notice 和 Content Script Toast 两个提示来源，需要统一 Toast 生命周期。

处理结果：

已统一 Toast 生命周期，Unsupported Website 提示可按预期结束。

影响：

仅 UX。

不影响：

- ChatGPT Export Flow
- Markdown Export
- JSON Export
- PDF Export


## ISSUE-013: Empty Chat Page Feedback UX

Status:
COMPLETE

Priority:
P1

问题：

支持的 AI Chat 页面没有可导出 Conversation 时，Popup 显示明确的空页面反馈。

当前问题：

处理结果：

- Empty Chat Page 状态已接入 Popup Flow
- 用户可明确区分空页面与导出失败

范围：

仅视觉优化。

不涉及：

- Conversation collection
- Export logic
- Error detection


## ISSUE-015-A: Processing / Popup Flow Timing

Status:
COMPLETE

Priority:
P1

问题：

Popup 不提前解析 Conversation。用户点击导出格式后，Popup 发送 Export Request，
页面级 Processing Modal 和 Success Modal 负责展示导出生命周期。

处理结果：

- Popup close、Processing、Success 和自动下载的时序已接入统一流程。

## ISSUE-015-B: Collection Scroll UX Known Limitation

Status:
KNOWN LIMITATION

Priority:
P1

虚拟滚动页面的完整 Conversation collection 仍需 Real Browser Validation，
并保留滚动采集 UX 已知限制。该问题不在本次 Popup Redesign 实现范围内。


## Real Browser Validation Pending

以下真实浏览器场景仍需验证：

- ChatGPT 完整导出流程
- Popup 自动关闭
- Processing Modal
- Success Modal
- 普通网页 fallback
- 未支持 AI 平台通知

## PDF Quality Issues

Status:
LATER PHASE

PDF 视觉质量、字体覆盖、排版可读性和模板精修保留到后续阶段，不阻塞当前
Phase 6.4 Popup Redesign + Export Flow UX 提交。


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

P1:

- ISSUE-015-B Collection Scroll UX Known Limitation

P2:

- CJK Font Coverage
- PDF Readability
- Dark Template
- Image
- Long Conversation Stress Test
- File naming/download details


## Validation Status

Phase 6.4:
COMPLETE (Implementation)

当前版本已知限制：

- ISSUE-001 ChatGPT Full Conversation Collection Stability（Deferred to v1.1）
- ISSUE-015-B Collection Scroll UX Known Limitation
- PDF Quality Issues 后续阶段


## Next Steps

1. 处理 ISSUE-015-B Collection Scroll UX Known Limitation
2. 后续进入 PDF Quality 优化
3. v1.1 处理 ISSUE-001 ChatGPT Full Conversation Collection Stability
