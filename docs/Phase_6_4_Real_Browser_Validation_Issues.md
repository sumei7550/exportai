# Phase 6.4 Real Browser Validation Issues

Status:
IN PROGRESS


## Issue List

| ID | Issue | Severity | Priority | Status |
|----|-------|----------|----------|--------|
| ISSUE-001 | ChatGPT 会话完整采集失败：滚动状态导致消息数量变化 | High | P0 | Root Cause Identified |
| ISSUE-002 | PDF 中文字体覆盖不足：部分中文/特殊字符乱码 | High | P0 | Open |
| ISSUE-003 | PDF 排版可读性不足：字号、间距、页面密度、消息层级需要优化 | Medium High | P1 | Open |
| ISSUE-004 | Dark Template 对比度不足：部分文字、表格不可读 | Medium High | P1 | Open |
| ISSUE-005 | Popup 首页布局与竞品存在差距 | Medium High | P1 | Open |
| ISSUE-006 | PDF 下载交互体验不足：loading、默认下载流程、tmp 文件行为 | Medium | P1 | Open |
| ISSUE-007 | 图片导出场景覆盖不足 | Medium | P1 | Open |
| ISSUE-008 | 长 Conversation 分页压力不足 | Medium | P2 | Open |
| ISSUE-009 | Template 视觉细节需要优化 | Medium | P2 | Open |
| ISSUE-010 | 下载文件命名和保存体验需要优化 | Low | P2 | Open |


## 当前阻塞问题

### ISSUE-001：ChatGPT 会话完整采集失败：滚动状态导致消息数量变化

现象：
同一 ChatGPT 会话在不同滚动位置 message count 不一致。

根因：
ChatGPT Adapter 当前只读取 Popup 打开瞬间 DOM 中已挂载的消息节点。

未处理：
- 虚拟滚动
- lazy loading
- 历史消息卸载
- 跨滚动窗口聚合

影响：
影响 Markdown、JSON、PDF 三种导出，因为它们共享同一个 Conversation 数据源。

修复方向：
在 Adapter 层实现完整会话采集，不在 exporter 中补偿。

当前状态：

ISSUE-001:
Root Cause Identified

Fix:
NOT STARTED


### ISSUE-002
描述：
当前 PDF 使用的中文字体覆盖范围不足，部分中文字符或特殊字符无法正确显示，可能出现乱码或缺字。

影响：
中文 Conversation 的 PDF 内容可能不可读，无法满足可读文本导出的要求。

调查状态：
尚未开始


## 验证状态

Phase 6.4:
IN PROGRESS

未通过项：
- Conversation consistency
- Font coverage


## 下一步行动

优先修复 P0 问题。
