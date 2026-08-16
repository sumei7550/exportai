# Phase 6.4 Real Browser Validation Issues

Status:
IN PROGRESS


## Issue List

| ID | Issue | Severity | Priority | Status |
|----|-------|----------|----------|--------|
| ISSUE-001 | ChatGPT 会话消息提取不稳定：滚动页面后 message count 变化 | High | P0 | Open |
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

### ISSUE-001
描述：
滚动 ChatGPT 会话页面后，提取到的消息数量可能发生变化，导致导出的 Conversation 不完整或前后结果不一致。

影响：
可能造成消息遗漏，影响会话完整性和真实浏览器验证结果。

调查状态：
尚未开始


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
