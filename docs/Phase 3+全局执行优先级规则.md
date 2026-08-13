确认进入 Phase 3：ChatGPT Adapter。

严格遵守：
- ./AGENTS.md
- ./docs/ExportAI_产品规划方案.md

Phase 3 只做 ChatGPT Adapter，不进入 Claude、Gemini、Exporter 或 PDF。

目标：

在真实 ChatGPT 页面上，将当前 Conversation 稳定解析为已有的 Unified Conversation Model。

本阶段重点完成：

1. ChatGPT 页面识别
2. 当前 Conversation 标题识别
3. user / assistant 消息识别
4. 消息顺序保持
5. 富内容提取：
   - text
   - paragraph
   - heading
   - list / nested list
   - code
   - table
   - math / LaTeX
   - image
   - link
   - quote
6. 将结果交给现有 parser / normalizer
7. 不修改 Exporter 设计
8. 不提前开发 Claude / Gemini

实现原则：

- 不依赖单一 className
- 优先 semantic attributes / data attributes / aria / DOM structure
- selector 必须集中管理，禁止散落在多个文件
- 对单条消息解析失败时应尽可能降级，而不是导致整个 Conversation 失败
- unknown 内容必须有可控 fallback
- 不要简单使用 innerText 代替结构化解析
- 不要使用 ChatGPT 私有 API 作为主要实现路径
- 不增加 host_permissions，除非确有必要；如需增加，先说明原因
- 不增加任何远程请求、遥测或聊天内容上传

在开始编码前：

1. 先检查当前 Chrome extension 能否通过 Load unpacked 正常安装。
2. 检查真实 ChatGPT 页面当前 DOM。
3. 输出 ChatGPT Adapter 的实现方案：
   - 页面识别依据
   - Conversation 定位方式
   - message 定位方式
   - role 判定方式
   - 各 Block 类型解析方式
   - fallback 策略
4. 明确哪些 DOM 特征是稳定依据，哪些只是 fallback。

然后开始实现。

测试要求：

至少建立以下 fixture / test：

- 单轮 user + assistant
- 多轮对话
- heading
- bold / italic
- list
- nested list
- code block
- table
- math
- image
- link
- quote
- mixed content
- unknown node fallback
- 单条消息部分解析失败
- Conversation 标题缺失
- 页面支持但未检测到 Conversation

如果真实 ChatGPT DOM 与 PRD 假设不一致：
不要自行扩大产品范围，按 AGENTS.md 的偏差控制规则处理。

Phase 3 完成后停止，不进入 Phase 4。

最终汇报：

1. 修改文件列表
2. Adapter 架构说明
3. 使用的稳定 DOM 信号
4. fallback selector / heuristic
5. 支持的 Block 类型
6. 已执行测试
7. 测试结果
8. Chrome Load unpacked 验证结果
9. 已知风险
10. Phase 3 是否达到验收标准


全局执行优先级规则
==============================

如果本次 Phase 指令、AGENTS.md、当前代码实现、技术方案或你自己的实现判断，与：

./docs/ExportAI_产品规划方案.md

存在任何冲突，以《ExportAI_产品规划方案.md》为最高产品需求依据。

优先级：

1. ./docs/ExportAI_产品规划方案.md
2. ./AGENTS.md
3. 当前 Phase 执行指令
4. 现有代码与工程实现
5. 技术偏好 / 自主判断

但如果发现 PRD 本身存在明显矛盾、无法实现、信息缺失，或者与真实 ChatGPT 当前页面行为存在重大冲突，不要擅自修改 PRD，也不要强行实现。

此时：

- 停止相关冲突项
- 明确指出冲突
- 给出证据和影响范围
- 提出可选解决方案
- 等待我确认后继续

只暂停存在冲突的工作项。
所有无冲突的 Phase 3 工作可以继续正常推进。

这条规则适用于 Phase 3 以及后续所有 Phase。