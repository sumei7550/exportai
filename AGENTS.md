# ExportAI Development Constraints

## Product source of truth

- Product: **ExportAI v1.0**, a local-first Chrome extension for saving currently readable ChatGPT, Claude, and Gemini conversations as PDF, Markdown, or JSON.
- PRD: [`./docs/ExportAI_产品规划方案.md`](./docs/ExportAI_产品规划方案.md). It is the product requirements **Source of Truth**. If implementation preference, a competitor observation, or this file conflicts with the PRD, follow the PRD.
- Competitor reference: [AI Exporter on Chrome Web Store](https://chromewebstore.google.com/detail/ai-exporter-save-chatgpt/kagjkiiecagemklhmhkabbalfpbianbe?hl=en). Reference only publicly observable capabilities and user flows.
- Reproduce public functionality and core flows only. Never copy competitor source code, private APIs, brand, name, logo, icons, illustrations, store assets, copywriting, or other protected material. Do not imply affiliation.

## v1.0 scope

- Platforms: ChatGPT, Claude, Gemini.
- Outputs: PDF, Markdown, JSON.
- Preserve structured text, headings, emphasis, nested lists, quotes, code, tables, math/LaTex, images, links, message roles, order, and available metadata.
- Core flow: supported conversation page → open ExportAI → identify platform and conversation → parse → display title/platform/message count → choose format → preview where applicable → save locally.
- PDF uses the unified model, renders selectable text, supports Default and Dark templates, and provides preview and pagination.
- Partial-message export is a v1.0 baseline capability when the PRD flow requires it.

## Out of scope

Do not add accounts, login, backends, cloud sync/storage, telemetry, chat-content uploads, Notion/Google Docs integration, AI summarization/transformation, knowledge base/search, billing, teams, collaboration, mobile apps, image watermark removal, or unrelated features unless the PRD is explicitly changed.

## Required technology and architecture

- Use Chrome Extension Manifest V3, TypeScript in strict mode, React, Vite, and Tailwind CSS.
- Keep responsibilities separated under `src/`: `adapters/`, `parser/`, `exporters/`, `popup/`, `preview/`, `content/`, `background/`, `types/`, `utils/`, `constants/`, and `tests/` as applicable to the current phase.
- Required one-way architecture:

```text
Platform DOM
  ↓
Platform Adapter
  ↓
Parser / Normalizer
  ↓
Unified Conversation Model
  ↓
Exporter
```

- Every platform must produce the same `Conversation` model. Adapters isolate platform detection, selectors, title/message/role extraction, and semantic DOM extraction.
- Parser/normalizer owns platform-independent cleanup, validation, warnings, and safe fallback behavior.
- Exporters accept only the unified `Conversation` model. They must never inspect ChatGPT/Claude/Gemini DOM or branch on a platform implementation.
- No single selector/class name may be the only platform strategy; prefer semantic attributes, data attributes, aria data, DOM structure, and local fallbacks.

## Privacy and security

- Local-first and privacy-first are mandatory: process conversation content in the browser and save to the user device.
- Do not add a server, cloud storage, analytics, telemetry, error reporting, `fetch` upload, or third-party chat-content transfer without explicit PRD authorization and user-facing consent.
- Request only minimum Chrome permissions. Never use `eval`, remote executable JavaScript, credential simulation, private APIs, or hidden/deleted/unloaded page data.
- Do not store credentials, cookies, tokens, or unnecessary conversation copies. Treat page HTML, links, image URLs, filenames, and conversation content as untrusted data.

## Code quality

- Keep TypeScript strict; avoid `any`. Use explicit discriminated unions and narrow types at boundaries.
- Keep shared types and platform constants centralized; avoid duplicate platform/block/message definitions and magic strings.
- Keep modules focused, generally below 500 lines, and avoid giant components/adapters. Do not silently catch errors; convert expected failures into user-safe states or structured warnings.
- Do not build feature stubs that misrepresent completion. If a capability is unstable, state the limitation and retain readable fallback content where possible.

## Tests and phase discipline

- Add fixtures and focused tests before advancing a phase. Cover model validity, normalization, warnings, and the content types introduced by that phase; later phases must cover all PRD scenarios, including long and 500-message conversations.
- Follow PRD order. Do not start a later phase until the current phase meets its acceptance criteria.
- After every phase, stop scope expansion and report: completed work, changed files, architecture rationale, commands/tests run and results, known issues, and whether acceptance criteria passed.
- Before changing a core flow or adding a feature, verify PRD authorization. Never change the product flow merely for technical convenience.
- If the PRD is ambiguous, identify the ambiguity and ask for direction before making a material product decision; make only the smallest conservative implementation when it does not alter product scope or flow.
## Testing Rules

---

### Validation Rules

自动化 fixture 测试不能替代真实第三方页面验证。

对于以下外部 AI 平台：

- ChatGPT
- Claude
- Gemini

Adapter 完成标准必须同时满足：

1. Fixture Test
2. Real Browser Validation

两者均通过后，Adapter 才能标记为 Phase 完成。

Fixture Test 用于验证：

- 数据结构转换
- Block Parser
- 边界情况
- 错误处理

Real Browser Validation 用于验证：

- 真实页面加载
- Content Script 注入
- 平台识别
- Adapter 调用链
- 真实 DOM 结构兼容性
- Conversation 实际解析结果

禁止：

仅因为 fixture 测试通过，就认为第三方平台 Adapter 已完成。

如果真实页面验证失败：

必须：

- 标记 Phase 未完成
- 输出失败位置
- 输出真实环境证据
- 提出最小修复方案

不得伪造验证通过。

---

### Feature Completion Rules

功能完成必须验证完整用户链路。

单独完成底层模块，不代表功能完成。

一个功能只有满足完整链路后，才可以标记 Phase 完成。


功能验收必须覆盖：

1. UI 触发
2. Message Flow
3. Business Logic 执行
4. Data Result 返回
5. UI 状态展示
6. Real Environment Validation（适用时）


示例：

Adapter 存在 ≠ Adapter 功能完成。

必须确认：

用户操作

↓

Extension Message Flow

↓

Adapter / Logic 执行

↓

数据结果生成

↓

UI 展示正确结果


只有完整用户链路通过后，才能认为功能完成。


禁止：

- 仅因为某个模块代码存在，就认为功能完成。
- 仅因为单元测试通过，就认为用户流程完成。
- 跳过 UI、消息通信或真实环境验证。


如果发现：

底层实现完成，但用户链路未连接：

必须：

- 标记功能未完成。
- 指出缺失链路。
- 提出最小修复方案。

不得进入下一 Phase。

## Development Workflow

### Windows 文件修改与补丁策略

项目运行环境可能为 Windows。

当使用 patch 工具修改文件失败，并出现以下情况：

- credential error
- sandbox permission error
- patch apply failed
- file replacement blocked

不要重复尝试相同 patch 操作超过 1 次。

处理流程：

1. 读取当前文件完整内容。
2. 判断失败原因是否属于：
   - 工具问题
   - 权限问题
   - 文件锁问题

   不要误判为代码方案错误。

3. 切换备用文件修改方式。
4. 完成修改后输出修改 diff。
5. 执行相关 build/test 验证。

备用修改方式优先级：

1. PowerShell 文件写入
2. Node.js fs 写入
3. 编辑器级直接修改

不要因为 patch 工具失败而：

- 修改技术方案
- 重构无关代码
- 判断原方案不可行

### 配置文件修改规范

以下文件属于高风险配置文件：

- package.json
- package-lock.json
- vite.config.ts
- manifest.json
- tsconfig.json

修改这些文件时：

修改前必须：

1. 读取当前文件完整内容。
2. 理解现有配置用途。
3. 明确本次修改目的。
4. 评估对现有功能的影响。

修改后必须：

1. 检查 git diff。
2. 执行相关 build/test。
3. 确认没有破坏已有功能。
4. 汇报修改原因和影响范围。

禁止：

- 未读取文件直接覆盖。
- 未检查 diff 直接修改配置。
- 未验证构建结果。
- 为解决局部问题大范围重写配置。

### 文件修改原则

所有代码和配置修改遵循：

1. 最小修改范围。
2. 保持现有架构。
3. 避免无关重构。
4. 修改后立即验证。

如果修改失败：

不要重复执行相同失败操作。

必须先判断：

- 工具失败
- 权限失败
- 文件锁
- 代码问题

然后选择对应解决方案。
