你现在要开发一个 Chrome Extension 产品，产品名为 ExportAI。

请先完整阅读项目中的：

ExportAI_产品规划方案.md

并严格按照该文档执行。

参考竞品：

AI Exporter
Chrome Web Store：
https://chromewebstore.google.com/detail/ai-exporter%EF%BC%9A%E4%BF%9D%E5%AD%98-chatgpt%EF%BC%8Ccl/kagjkiiecagemklhmhkabbalfpbianbe?hl=zh-CN&authuser=0

项目目标：

基于竞品 AI Exporter 已公开、可观察的功能和用户流程，开发 ExportAI v1.0。

注意：
这是“功能和流程复刻”，不是源码复制。

禁止：
- 复制竞品源码
- 复制竞品 Logo
- 复制竞品品牌
- 复制竞品图标、插画、文案和其他受版权保护素材
- 猜测或使用竞品私有 API
- 为了“创新”擅自改变产品核心流程

核心原则：

1. 优先保证最终产品行为符合 ExportAI 产品规划方案。
2. 如果实现方案与产品规划冲突，以产品规划为准。
3. 不要自由增加产品规划之外的大功能。
4. 不要为了技术方便改变用户流程。
5. 不要一次性粗暴生成全部功能。
6. 每完成一个阶段必须运行、测试、检查，再进入下一阶段。
7. 如果某项功能无法稳定实现，不要伪造完成状态，要明确记录问题。
8. 所有聊天数据默认本地处理，不建立不必要的后端。
9. 保持代码模块化、可维护、可测试。
10. 所有平台最终必须转换为统一 Conversation 数据模型。

==============================
一、v1.0 范围
==============================

必须支持：

平台：
- ChatGPT
- Claude
- Gemini

导出格式：
- PDF
- Markdown
- JSON

内容类型：
- 普通文本
- Markdown
- Heading
- Bold / Italic
- List
- Nested List
- Code Block
- Table
- Math / LaTeX
- Image
- Link
- Quote

核心流程：

AI Conversation 页面
→ 点击 ExportAI
→ 自动识别当前平台
→ 识别当前 Conversation
→ 解析消息
→ 显示标题、平台、消息数量
→ 用户选择导出格式
→ 预览（适用时）
→ 导出文件

v1.0 不实现：

- 用户账号
- 登录系统
- 后端服务器
- 云同步
- Notion
- AI 总结
- 知识库
- 支付
- 团队协作
- 图片去水印
- 与当前核心导出流程无关的额外功能

==============================
二、技术规范
==============================

必须使用：

- Chrome Extension Manifest V3
- TypeScript
- React
- Vite
- Tailwind CSS

建议工程结构保持职责分离：

src/
  adapters/
    chatgpt/
    claude/
    gemini/

  parser/

  exporters/
    pdf/
    markdown/
    json/

  popup/

  preview/

  content/

  background/

  types/

  utils/

  constants/

  tests/

平台逻辑必须通过 Adapter 隔离。

禁止在 exporter 中直接写：

if platform === chatgpt
if platform === claude
if platform === gemini

正确的数据流必须是：

Platform DOM
→ Platform Adapter
→ Parser / Normalizer
→ Unified Conversation
→ Exporter

Exporter 不允许依赖具体 AI 平台。

==============================
三、Conversation 数据模型
==============================

所有平台必须标准化到统一模型。

至少包含：

Conversation
- id
- title
- platform
- model
- sourceUrl
- createdAt
- exportedAt
- messages
- metadata

Message
- id
- role
- order
- blocks
- metadata

Block 类型至少支持：

- text
- heading
- paragraph
- list
- code
- table
- image
- math
- link
- quote

注意：

不要把所有内容简单压成 innerText。

必须尽量保存内容语义和结构，以保证 PDF / Markdown / JSON 可以共用同一份标准化数据。

==============================
四、Adapter 规范
==============================

每个平台必须独立 Adapter。

Adapter 负责：

- 判断当前页面是否支持
- 获取 Conversation 标题
- 获取消息列表
- 判断 user / assistant
- 提取消息结构
- 识别代码
- 识别表格
- 识别公式
- 识别图片
- 识别链接
- 获取可用的 metadata

Adapter 不负责：

- PDF
- Markdown
- JSON
- UI
- 下载逻辑

DOM selector 不要完全依赖单一 className。

优先考虑：

1. semantic attributes
2. data attributes
3. aria 信息
4. DOM structure
5. fallback selectors

页面结构变化时，应尽量局部失败，而不是整个扩展崩溃。

==============================
五、导出规范
==============================

Markdown：

必须尽量保留：
- heading
- bold
- italic
- list
- code block
- table
- math
- link
- quote

JSON：

必须保存完整标准化 Conversation 数据。

PDF：

PDF 是 v1.0 的重点功能。

禁止把整个聊天页面简单截图后塞进 PDF。

PDF 应基于标准化 Conversation 渲染。

目标：
- 文本可选择
- 中文正常
- 英文正常
- Code 可读
- Table 可读
- Math 正常
- Image 正常
- Link 尽量可点击
- 长内容自动分页
- 不出现明显内容截断

至少提供：

- Default
- Dark

两种视觉模板。

==============================
六、UI / UX
==============================

Popup 不要自由发挥复杂设计。

核心信息：

ExportAI

Current Platform
Conversation Title
Message Count

Export Format:
- PDF
- Markdown
- JSON

Primary Action:
Export

适用时进入 Preview。

必须实现状态：

1. Loading
正在检测当前 Conversation

2. Ready
成功识别 Conversation

3. Unsupported
当前网站暂不支持

4. Empty
当前页面没有检测到可导出的 Conversation

5. Parse Error
检测到平台，但对话解析失败

6. Exporting
正在生成文件

7. Export Error
导出失败

错误信息必须面向用户，不要直接暴露内部堆栈。

==============================
七、性能要求
==============================

必须考虑长对话。

目标：

至少支持 500 条消息的 Conversation。

要求：

- 不明显卡死 Popup
- 不因为单条消息异常导致整个导出失败
- 避免不必要的重复 DOM 扫描
- 避免巨量同步阻塞
- 大型图片和长代码需要合理处理

==============================
八、安全与隐私
==============================

默认 Local First。

禁止：

- 上传用户聊天内容到 ExportAI 服务器
- 发送 Conversation 到第三方分析服务
- eval
- 远程加载可执行 JS
- 不必要的 host permissions
- 不必要的数据收集

Chrome permissions 必须最小化。

==============================
九、开发阶段
==============================

不要一次完成所有内容。

按照以下顺序执行。

Phase 1
项目初始化

完成：
- Manifest V3
- React + TypeScript + Vite
- Popup
- Content Script
- Background / Service Worker
- 基础通信

验收：
- Chrome 可加载 unpacked extension
- Popup 正常打开
- Content Script 正常工作
- 无明显 console error

Phase 2
统一 Conversation Model

完成：
- types
- block model
- message model
- conversation model
- validator / basic normalization

验收：
- 能使用 fixture 构造标准 Conversation
- Markdown / JSON 后续不依赖平台 DOM

Phase 3
ChatGPT Adapter

完成：
- 页面检测
- 标题
- user / assistant messages
- text
- markdown structure
- code
- table
- math
- image
- link

ChatGPT 是第一优先级。

不要在 ChatGPT 未稳定前开始三个平台同时开发。

Phase 4
Markdown Exporter

验收：
- 普通文本
- heading
- list
- code
- table
- math
- link
均可以正确输出

Phase 5
JSON Exporter

验收：
- 完整保存统一 Conversation
- 导出的 JSON 可重新 parse

Phase 6
PDF Renderer / Exporter

完成：
- Default
- Dark
- preview
- pagination

验收：
- 中英文
- code
- table
- math
- image
- long conversation

Phase 7
Claude Adapter

按照已有 Adapter interface 实现，不修改 exporter。

Phase 8
Gemini Adapter

同上。

Phase 9
完整回归测试

==============================
十、测试要求
==============================

必须建立 fixtures / test cases。

至少覆盖：

A. 简单聊天
user + assistant

B. Markdown
heading
bold
italic
list

C. Code
JavaScript
Python
JSON

D. Table

E. Math / LaTeX

F. Image

G. Links

H. Mixed content

I. Very long response

J. 500-message conversation

K. Unsupported page

L. Empty conversation

M. DOM parsing partially fails

N. PDF generation fails

==============================
十一、代码质量规范
==============================

必须：

- strict TypeScript
- 清晰类型
- 模块职责单一
- 公共逻辑提取
- 常量集中管理
- 错误统一处理
- parser / adapter / exporter 解耦
- 可测试

尽量避免：

- 单文件超过 500 行
- 巨型组件
- 巨型 Adapter
- 重复 selector
- 魔法字符串
- any 滥用
- silently catch error
- 为了快速完成写临时代码后不清理

==============================
十二、每阶段输出要求
==============================

每完成一个 Phase，先停止扩展范围，进行自检。

输出：

1. 本阶段完成内容
2. 修改文件列表
3. 关键架构说明
4. 已执行测试
5. 测试结果
6. 已知问题
7. 是否满足本阶段验收标准

只有当前阶段达到验收标准后，再进入下一阶段。

==============================
十三、最终验收
==============================

最终必须验证：

[ ] Extension 可以通过 Chrome Load unpacked 安装

[ ] ChatGPT 页面可自动识别

[ ] Claude 页面可自动识别

[ ] Gemini 页面可自动识别

[ ] 能读取当前 Conversation 标题

[ ] 能识别 user / assistant

[ ] 普通文本完整

[ ] Markdown 结构基本完整

[ ] Code Block 正常

[ ] Table 正常

[ ] LaTeX / Math 正常

[ ] Image 正常

[ ] Link 正常

[ ] Markdown 导出成功

[ ] JSON 导出成功

[ ] PDF 导出成功

[ ] PDF 文本可选择，不是单纯截图

[ ] Default PDF 模板正常

[ ] Dark PDF 模板正常

[ ] 长 Conversation 可导出

[ ] 500 条消息测试通过

[ ] Unsupported 状态正常

[ ] Parse Error 状态正常

[ ] Export Error 状态正常

[ ] 用户聊天内容没有上传到服务器

[ ] Exporter 中不存在平台判断耦合

[ ] 三个平台共用统一 Conversation 数据模型

==============================
十四、偏差控制
==============================

开发过程中，如果出现以下情况：

A. 产品方案没有定义
B. 竞品当前行为与假设不同
C. 页面 DOM 已发生变化
D. 技术实现与 PRD 有冲突

不要自行扩大产品范围。

优先级：

ExportAI 产品规划方案
>
>已确认的产品需求
>
>竞品公开可观察行为
>
>工程实现偏好

对于不确定项：

使用最小、最保守、最符合现有产品流程的实现。

不要因为觉得“这样更好”就自行重新设计产品。

最终目标不是展示技术复杂度，而是：

稳定、完整、符合预期地完成 ExportAI v1.0。