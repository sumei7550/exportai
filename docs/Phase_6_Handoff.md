# ExportAI Phase 6 Handoff

## 1. Current Project Status

- Phase 1: COMPLETE
- Phase 2: COMPLETE
- Phase 3: COMPLETE
- Phase 4: COMPLETE
- Phase 5: COMPLETE
- Structured Content Compatibility Patch: COMPLETE
- Phase 6 PDF Exporter Design Review: COMPLETE
- Phase 6.0.1 jsPDF Feasibility: COMPLETE
- Phase 6.1.1 PDF Core Foundation: COMPLETE
- Phase 6.1.2-A PDF Structured Content Rendering: COMPLETE
- Phase 6.1.2-B1 Table Rendering: COMPLETE
- Phase 6.1.2-B2: NOT STARTED
- Phase 6 Integration (Preview / Download / Popup / Template): NOT STARTED

Progress archive: `Phase_6_PDF_Implementation_Progress_Archive.md`

## 2. Phase 6 Design Decision

Approved direction:

```text
Conversation
  -> ExportAI PdfDocumentPlan
  -> pdfmake browser engine
  -> Uint8Array
  -> Preview
  -> Blob Download
```

- v1.0 PDF templates: `Default` and `Dark`.
- Use bundled local CJK fonts; do not use remote fonts, Google Fonts, or a CDN.
- Math v1.0 uses a readable LaTeX source fallback rather than a math rendering engine.
- Remote images are not fetched by default and do not add `host_permissions`. When an image cannot be embedded, render its alt text or placeholder and return a warning.
- Do not use a canvas-based PDF pipeline.
- Do not use `window.print()` as the PDF Core.

## 3. Critical Risks

- pdfmake compatibility with Manifest V3 extension CSP.
- CJK font bundle-size impact.
- Searchable and selectable Chinese text in generated PDFs.
- Emoji glyph and complex emoji-sequence support.
- Memory and performance for a 500-message conversation.
- Remote authenticated images may be unavailable without a network/permission design change.

## 4. Next Step

Phase 6.0.1 jsPDF Feasibility Gate: **COMPLETE**.

Phase 6.1.1 PDF Core Foundation: **COMPLETE**.

Phase 6.1.2-A PDF Structured Content Rendering: **COMPLETE**.

Phase 6.1.2-B1 Table Rendering: **COMPLETE**.

The next step is **not** Phase 6.1.2-B2 until explicitly authorized.

Remaining PDF exporter work not yet started:

- Phase 6.1.2-B2
- Image block rendering
- Math block rendering
- Unknown block rendering
- Preview
- Download
- Popup integration
- Default / Dark template system

See `Phase_6_PDF_Implementation_Progress_Archive.md` for completed milestone details and validation results.

## 5. Scope Restrictions

Do not modify:

- Adapter;
- Parser;
- Conversation Model;
- Markdown Exporter;
- JSON Exporter;
- existing Phase 4 or Phase 5 behavior.

Phase 6.0 may modify only:

- `package.json` and lockfile;
- isolated PDF feasibility files;
- local font and license assets;
- focused tests;
- minimal build configuration, only when required.

If the feasibility work requires a CSP relaxation, new permission, remote font, CDN, or network fetch: stop and report it. Do not apply that change autonomously.

## 6. Working Tree

The following pre-existing uncommitted changes were observed before this handoff document was created. They must be preserved; do not reset, checkout, or overwrite them.

```text
 M src/adapters/chatgpt/chatgpt-block-parser.ts
 M src/adapters/chatgpt/chatgpt-selectors.ts
 M src/popup/popup-app.tsx
 M src/tests/chatgpt-adapter.test.ts
 M src/tests/fixtures/chatgpt-dom.fixture.ts
?? docs/Phase_5_Validation_Report.md
?? docs/Structured_Content_Compatibility_Validation_Report.md
?? src/exporters/json-document.ts
?? src/exporters/json-download-service.ts
?? src/exporters/json-exporter.ts
?? src/exporters/json-filename.ts
?? src/exporters/json-serializer.ts
?? src/exporters/json-validator.ts
?? src/popup/json-export-action.ts
?? src/tests/json-export-flow.test.ts
?? src/tests/json-exporter.test.ts
?? src/tests/popup-json-export.test.tsx
```

`git diff --stat` at handoff time reports tracked changes only:

```text
 src/adapters/chatgpt/chatgpt-block-parser.ts |  51 ++++++++-
 src/adapters/chatgpt/chatgpt-selectors.ts    |   7 +-
 src/popup/popup-app.tsx                      |  22 ++++
 src/tests/chatgpt-adapter.test.ts            | 150 +++++++++++++++++++++++++++
 src/tests/fixtures/chatgpt-dom.fixture.ts    | 109 ++++++++++++++++++++
 5 files changed, 334 insertions(+), 5 deletions(-)
```

## 7. Verification Rules

Follow `AGENTS.md` strictly. Automated testing does not replace real Chrome validation.

Before Phase 6.0 can pass, run and record:

- `npm test`
- `npm run typecheck`
- `npm run build`
- `git diff --check`
- Manifest V3 Chrome smoke test
- Chinese PDF open, search, and text-selection test

The Gate report must clearly distinguish automated results from real Chrome evidence.

## 8. Final Handoff Status

```text
Phase 6 Design Review:
COMPLETE

Phase 6.0.1 jsPDF Feasibility Gate:
COMPLETE

Phase 6.1.1 PDF Core Foundation:
COMPLETE

Phase 6.1.2-A PDF Structured Content Rendering:
COMPLETE

Phase 6.1.2-B1 Table Rendering:
COMPLETE

Phase 6.1.2-B2:
NOT STARTED

Phase 6 Integration (Preview / Download / Popup / Template):
NOT STARTED
```
