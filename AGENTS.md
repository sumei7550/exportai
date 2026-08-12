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