# AI 포토·AI 일러스트·AI 도면 AI 창 첨부 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 그림 탭(graphics: AI 포토·AI 일러스트)과 도면 탭(cad)의 AI 창에 문서 앱과 같은 첨부를 넣는다(AI가 보고 참고).

**Architecture:** 마인드맵·전자책 앱의 첨부 계약을 그대로 옮긴다. main이 파일을 고르고(대화 상자·경로·붙여넣은 그림) 글을 `parseFileToText`로 쪽 단위로 읽고 그림을 base64로 돌려준다. 렌더러는 `files-skill`(`read_attachment` 도구)과 AI 창의 첨부 줄·단추·끌어 놓기·붙여넣기를 갖는다.

**Tech Stack:** Electron main/preload, React, vitest, `@genoffice/file-parse`, `@genoffice/ui`(`DocAttachButton`, `attachmentFolderLabel`), `@genoffice/agent-core`.

**Spec:** `docs/superpowers/specs/2026-11-18-picture-cad-ai-attachments-design.md`

## Global Constraints

- 형식·크기: `ATTACHABLE_EXTS`, `ATTACHABLE_MAX_BYTES`, 그림 `ATTACHABLE_IMAGE_EXTS`·`ATTACHABLE_IMAGE_MAX_BYTES`(5MB), 메시지당 그림 20장, 한 번 읽기 24,000자(main 상한 48,000).
- 저장 안 된 다른 탭 파일은 읽지 않는다(`assertFileSaved`). 글은 `parseFileToText`로만 읽는다.
- 격리된 웹판 틀에는 첨부 내용이 가지 않는다. 그림 탭 연결부(GraphicsApi)는 지금처럼 `graphicsBridge.take()`로 한 번만 건넨다.
- 포토·일러스트: 캔버스 그림이 첫 그림, 첨부 그림이 그 뒤.
- 도면: `read_attachment`는 기록 묶음에 편집을 더하지 않는다.
- 드라이브 첨부 단추는 넣지 않는다. 문서에서 첨부 단추(`DocAttachButton`)는 넣는다.
- 문구는 21개 언어(전자책 앱의 같은 키 문구를 옮김). 코드 주석은 영어(check-english-comments).

## Review Focus

- 그림을 못 보는 모델에서 첨부 그림을 붙여 보내기 → 그림은 빠지고 안내가 뜨며, 글 첨부는 그대로 읽힌다.
- 첨부만 있고 글이 빈 메시지 → 문서 앱과 같게 처리(보내기 문은 글이 있어야 열림).
- 대기열에 쌓인 메시지 → 그 메시지가 가져간 첨부가 실행될 때 함께 간다.
- 새 대화 → 첨부 줄과 지난 첨부 목록이 비워진다.
- 도면에서 첨부를 읽고 상자를 놓은 요청 → Ctrl+Z 한 번으로 상자가 사라지고 첨부 읽기는 기록에 없다.

---

### Task 1: graphics main·preload·ipc 첨부 채널

**Files:**
- Create: `apps/graphics/src/main/ai-attachments.ts`(전자책 `apps/epub/src/main/ai-attachments.ts`와 같은 내용, `registerGraphicsAttachmentIpc()`)
- Modify: `apps/graphics/src/shared/ipc.ts`(GRAPHICS_CHANNELS에 `filesPick/filesAdd/filesAddPastedImage/filesRead/filesReadImage` = `graphics:files-*`, `AttachmentMeta` 등 타입, `ATTACHMENT_IMAGE_EXTS`, GraphicsApi에 `pickAttachments/addAttachmentPaths/addPastedImage/readAttachment/readAttachmentImage`)
- Modify: `apps/graphics/src/main/graphics-main.ts`(`registerGraphicsIpc` 안에서 등록), `apps/graphics/src/preload/index.ts`(api에 다섯 함수, `DOC_ATTACH_BRIDGE_KEY`로 `docAttachBridge()` 노출)
- Test: `apps/graphics/tests/ai-attachments.test.ts`(마인드맵 `ai-attachments.test.ts`를 옮김: 형식 거절, 쪽 읽기, 저장 안 된 파일 거절, 그림 5MB 초과 거절)

- [ ] 시험 작성 → 실패 확인 → 구현 → 통과 → 커밋 `feat(graphics): attachment channels for the AI panel`

### Task 2: graphics AI 창 첨부

**Files:**
- Create: `apps/graphics/src/renderer/ai/files-skill.ts`(전자책 것, `graphicsApi().readAttachment`)
- Modify: `apps/graphics/src/renderer/ai/AiPanel.tsx`(첨부 상태·줄·단추·`DocAttachButton`·끌어 놓기·붙여넣기·`collectImages`, 보낼 때 `[...shot.images, ...attached]`, 그림 못 보는 모델은 첨부 그림 빼고 안내, 대기열 항목에 첨부, 새 대화에 비움, `TOOL_LABELS.read_attachment`)
- Modify: `apps/graphics/src/renderer/i18n/ai/*.ts` 21개(키 `aiAttachTitle`, `aiRemoveAttachmentTitle`, `aiTooManyImages`, `aiSumReadAttachment`, `aiSumImageAttachment`, `aiSumReadAttachmentName`, `aiToolReadAttachment`, `aiAttachNoVision`)
- Copy: `apps/epub/src/renderer/ai/assets/{attach-icon,file-*}.png` → graphics assets
- Test: `apps/graphics/tests/ai-panel.test.tsx`에 `attaches a picked picture and sends it after the canvas shot`, `drops picture attachments for a model that cannot see images`, `new chat clears the attachments`

- [ ] 시험 작성 → 실패 확인 → 구현 → 통과 → 커밋 `feat(graphics): attach files in the AI panel`

### Task 3: cad main·preload·ipc 첨부 채널

Task 1과 같은 모양: `apps/cad/src/main/ai-attachments.ts`(`registerCadAttachmentIpc()`), `CAD_CHANNELS` `cad:files-*`, `CadAiApi`에 다섯 함수, preload에 문서 첨부 다리, `apps/cad/tests/ai-attachments.test.ts`.

- [ ] 시험 → 실패 → 구현 → 통과 → 커밋 `feat(cad): attachment channels for the AI pane`

### Task 4: cad AI 창 첨부

`apps/cad/src/renderer/ai/files-skill.ts`, AiPanel(전자책과 같게, 대화 저장·복원에 첨부 포함), 21개 언어 같은 키, 자산·CSS(전자책 `ai-panel.css`의 `.ai-attach*` 규칙) 복사. 시험 `apps/cad/tests/ai-panel.test.ts`에 `attaches a PDF and the files skill reads it`, `one undo takes back a request that read an attachment`.

- [ ] 시험 → 실패 → 구현 → 통과 → 커밋 `feat(cad): attach files in the AI pane`

### Task 5: 확인·문서·배포

- e2e: `e2e/cad-tab.spec.ts`에 첨부 단추가 보이고 그림을 붙이면 첨부 줄에 뜨는 시험 1개(가짜 AI). 그림 탭 e2e가 있으면 같은 시험.
- `docs/프로젝트이해.md`(그림·도면 AI 기능 항목에 첨부), `docs/매뉴얼.md`(10·11장 AI 창에 첨부 쓰는 법), 결정 0101·0093 덧붙임 한 줄.
- typecheck·lint·format·check 스크립트, 전체 새 검토(가지 전체).
- PR → 초록이면 병합 → 0.21.1 판 올리기 PR → 초안 릴리스 → 빌드 → 공개는 사용자 "공개해".
