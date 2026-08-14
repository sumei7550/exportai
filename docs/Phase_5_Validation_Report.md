# Phase 5 Validation Report

## 1. Phase 5 Goal

Phase 5 完成 ExportAI 的平台无关 JSON 导出闭环：

```text
Unified Conversation Model
  → JSON Exporter
  → JSON Document
  → JSON Serializer
  → JSON Download Service
  → JSON File
```

本阶段目标是将已经解析、规范化的统一 Conversation 数据稳定保存为可解析的本地 JSON 文件。Phase 5 不负责新增平台 Adapter、重新读取 DOM、PDF 导出或其他后续阶段功能。

## 2. Architecture

Phase 5 保持以下职责分层：

- JSON Exporter 仅消费 Unified Conversation Model，平台无关。
- JSON Exporter 不读取 DOM，不依赖 ChatGPT、Claude 或 Gemini Adapter，也不依赖 Parser 执行二次清洗。
- JSON Document 使用显式公共字段白名单映射，不直接执行 `JSON.stringify(conversation)`。
- JSON Exporter Core 负责验证、Schema 映射、序列化及文件名生成。
- JSON Download Service 独立负责 UTF-8 Blob、临时 object URL 和浏览器本地下载触发。
- Popup 复用已经解析完成的同一个 Conversation，不为 JSON 建立第二套页面解析流程。

```text
Popup
  → Existing Parsed Conversation
  → JSON Validator
  → JSON Document Mapping
  → JSON Serializer
  → JSON String + Filename
  → JSON Download Service
  → Local Browser Download
```

Exporter Core 中不包含 Blob、DOM 下载节点、Chrome API 或 Popup UI。

## 3. JSON Schema

公开 JSON 顶层结构稳定为：

```json
{
  "schemaVersion": "1.0",
  "exportMetadata": {},
  "conversationMetadata": {},
  "messages": []
}
```

契约记录：

- `schemaVersion = "1.0"`
- `exporterVersion = "1.0.0"`
- Conversation `modelVersion` 独立保留，不与 Schema 或 Exporter 版本混用。
- `conversationMetadata` 保留公开的会话 ID、标题、平台、消息数量、完整性、解析警告及模型版本等业务元数据。
- `messages` 按 `order` 稳定输出。
- Message 保留 `id`、`role`、`order`、`blocks`、`originalText` 和公开 `metadata`。
- `metadata.isPartial` 始终导出为明确的布尔值。
- 所有 Unified Conversation Model Block 类型及嵌套结构均保留。
- Inline content 的文本、样式和公开链接字段均保留。
- Empty Message 和 Unknown Block 不会被静默丢弃。
- `parseWarnings` 保留。
- `sourceAttributes` 等 Adapter、页面或调试内部字段不进入公开 JSON Schema。

Serializer 输出两个空格缩进，并以一个换行结束。Download Service 直接保存 Exporter 返回的 JSON 字符串，不执行二次格式化或内容清洗。

## 4. Error Handling

Phase 5 覆盖以下错误：

- `EMPTY_CONVERSATION`：没有消息时阻止 JSON 生成和下载。
- `INVALID_CONVERSATION`：公共契约验证失败时阻止映射和下载；不调用 Parser 修复，不修改输入数据，不猜测缺失字段。
- `SERIALIZATION_FAILED`：序列化失败时不返回空 JSON，也不生成截断文件。
- `SAVE_FAILED`：Blob、object URL 或浏览器下载触发失败时返回安全失败状态，不显示伪成功。

错误 UI 不包含 Conversation 正文、JSON 全文、Token、Cookie、DOM HTML、本地绝对路径或 stack trace。

## 5. Privacy / Permissions

- 未新增 `downloads` permission。
- 未新增 `host_permissions`。
- 未新增网络请求权限或文件系统权限。
- 未新增 `fetch`、XMLHttpRequest、WebSocket 或其他远程传输。
- 无上传、云存储、遥测或分析。
- JSON 在浏览器本地生成，并通过 Blob 与 `<a download>` 触发本地下载。
- Download Service 使用 `application/json;charset=utf-8`。
- 临时 anchor 在触发后移除，object URL 被 revoke。
- Download Service 不修改 JSON 内容，也不修改 Exporter 生成的文件名。

## 6. Automated Validation

最终自动化验证记录：

- Phase 5.2 JSON Export Flow：12/12 passed。
- ChatGPT Adapter：30/30 passed。
- Full test suite：101/101 passed。
- TypeScript strict typecheck：passed。
- Production build：passed。
- `git diff --check`：passed。
- 500-message JSON 集成导出：passed；消息完整、顺序正确、无截断、无重复且可由 `JSON.parse` 解析。
- Markdown Exporter / Flow / Popup regression：passed。
- JSON Core / Flow / Popup regression：passed。
- ChatGPT image pagination cleanup fixture 与 Markdown/JSON 联动回归：passed。

## 7. Real Browser Validation

真实 Chrome Extension 环境已使用 ChatGPT Conversation **“UI 工作流程设计”** 完成最终验证。

Conversation 验证结果：

- `platform = "chatgpt"`
- `messageCount = 18`
- User / Assistant 顺序与真实页面一致。
- `isComplete = true`
- `parseWarnings = []`
- JSON 文件成功生成并触发浏览器下载。
- 下载的 JSON 可由独立 JSON parser 正常解析。
- 图片 blocks、用户正文及 assistant image-only message 均保留。

Image-only assistant 验证结果：

- 保留 ImageBlock。
- `originalText = ""`
- `metadata.isPartial = false`

ChatGPT image pagination cleanup 验证结果：

- 之前图片回复中的独立 `2/2` carousel UI 污染已消失。
- JSON 不再包含 pagination `2/2` paragraph 或 `originalText` 污染。
- Markdown 不再包含独立 `2/2`、Previous/Next response 文本或错误 partial note。
- Markdown 图片仍正常输出。

结论：

- Pagination Cleanup Real Browser Validation：PASS
- Markdown Regression Real Browser Validation：PASS
- JSON Export Real Browser Validation：PASS

## 8. Known / Intentional Behavior

JSON `ImageBlock.alt` 有意保留 Unified Conversation Model 中的原始业务值，包括用户上传图片可能具有的 UUID 文件名 alt，例如：

```text
a048683c-f186-4826-a447-867fa46f572f.png
```

这不是缺陷。职责边界如下：

- JSON Exporter 保留原始 `ImageBlock.alt`，便于备份、迁移和二次处理。
- Markdown Exporter 可在显示层将空 alt、UUID 或明显自动生成的文件名降级显示为 `Image`。
- JSON Exporter 不执行 Markdown 显示策略的值级清洗。

## 9. Final Acceptance

Phase 5 JSON Exporter 最终验收：

| Acceptance Area | Result |
| --- | --- |
| Implementation | PASS |
| Automated Validation | PASS |
| Real Browser Validation | PASS |
| Privacy / Permission Validation | PASS |
| Regression Validation | PASS |

Final Status：

**COMPLETE**

本报告仅归档 Phase 5 完成状态，不启动 Phase 6。
