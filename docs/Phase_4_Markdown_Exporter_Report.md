# Phase 4 Markdown Exporter Report

## 1. Phase 4 目标

Phase 4 完成以下导出链路：

```text
Conversation → Markdown Exporter → Markdown File
```

目标：

- 平台无关
- 消费 Unified Conversation Model
- 支持完整 Markdown 导出

## 2. 实现内容

### Phase 4.1 Core Exporter

- Conversation 渲染
- Message 顺序保持
- 文件名处理
- 空会话和导出错误处理

### Phase 4.2 Block Renderer

支持以下内容块：

- text
- paragraph
- heading
- list
- code
- table
- math
- image
- link
- quote
- thematic-break
- unknown

### Phase 4.3 Export Flow

```text
Popup
  ↓
Markdown Exporter
  ↓
Blob
  ↓
.md 文件下载
```

### Polish Patch

- Empty Message fallback：无可渲染内容的消息保留角色标题，并输出 `_No readable content._`。
- Image Alt 清理：空 alt、UUID 或明显自动生成的文件名在 Markdown 输出阶段回退为 `Image`，正常描述保持不变。
- UI 污染修复后的兼容：保留结构化 Block 内容，避免将页面操作 UI 文本写入 Markdown。

## 3. 验证结果

自动化验证：

- `npm test`：通过（5 个测试文件，64 个测试）
- `npm run typecheck`：通过
- `npm run build`：通过
- `git diff --check`：通过

真实浏览器验证：

- ChatGPT Conversation 解析成功
- Markdown 文件成功下载
- 下载的 Markdown 文件可正常打开并完成内容验证

## 4. 已知限制

当前 Phase 4 不包含：

- 消息选择导出
- Markdown 双模式
- 时间显示
- PDF 模板
- JSON 导出

以上能力属于后续版本或后续阶段范围。

## 5. 架构确认

Markdown Exporter 只依赖 Unified Conversation Model。

Markdown Exporter 不依赖：

- DOM
- Adapter
- Parser
- 平台逻辑

导出架构保持为：

```text
Platform DOM
  ↓
Platform Adapter
  ↓
Parser / Normalizer
  ↓
Unified Conversation Model
  ↓
Markdown Exporter
```

## 6. 最终状态

Phase 4 Markdown Exporter：

**COMPLETE**

本记录仅归档 Phase 4 完成状态，不启动 Phase 5。
