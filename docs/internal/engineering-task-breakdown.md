# Pan Engineering Task Breakdown

> For Hermes: Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build a first-party Hermes WebUI that supports chat, sessions, skills, extensions/MCP, memory, profiles, and safe tool usage.

**Architecture:** A Next.js frontend talks to a Hermes-specific control plane, which brokers access to Hermes runtime surfaces including the API server, profiles, sessions, skills, and MCP integrations. The implementation should prioritize a polished single-user MVP, while leaving clean seams for multi-user and admin features later.

**Tech Stack:** Next.js, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Zustand, CodeMirror/Monaco, SSE streaming, FastAPI or Next.js server routes as control plane, Playwright, Vitest, React Testing Library.

---

## Assumed Repository Structure

If implementing in this folder as a new app, use:

- `src/app/` — routes and page shells
- `src/components/` — reusable UI primitives
- `src/features/chat/` — chat transcript, composer, tool cards, session state
- `src/features/sessions/` — session sidebar, search, metadata actions
- `src/features/skills/` — installed/catalog/detail/editor flows
- `src/features/extensions/` — MCP and plugin management
- `src/features/memory/` — memory editors and context inspector
- `src/features/profiles/` — profile switch and management
- `src/features/settings/` — model, policy, theme, and runtime settings UI
- `src/server/` — control-plane routes and adapters
- `src/lib/` — shared utilities, schemas, clients, types
- `tests/` — unit, integration, e2e tests
- `docs/` — product and implementation docs

---

## Phase 0: Project Bootstrap and Technical Foundations

### Task 1: Initialize the web app project structure
**Objective:** Create the base application skeleton with the agreed folder structure and tooling.

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/styles/globals.css`

**Implementation notes:**
- Use Next.js App Router.
- Configure TypeScript strict mode.
- Add path aliases for `@/components`, `@/features`, `@/lib`, `@/server`.
- Keep initial route simple: redirect root to `/chat` or render a shell with nav.

**Verification:**
- Run: `npm install`
- Run: `npm run dev`
- Expected: app loads without errors.

### Task 2: Add UI and state management dependencies
**Objective:** Install and configure the baseline libraries used by the UI.

**Files:**
- Modify: `package.json`
- Create: `components.json` if using shadcn
- Create: `src/lib/utils.ts`

**Implementation notes:**
- Add Tailwind, shadcn/ui, class-variance-authority, lucide-react.
- Add TanStack Query.
- Add Zustand.
- Add zod for schema validation.

**Verification:**
- Build a test component using shadcn primitives.
- Expected: component renders and styles apply correctly.

### Task 3: Set up linting, formatting, and test tooling
**Objective:** Establish engineering hygiene early.

**Files:**
- Create: `.eslintrc.*` or `eslint.config.*`
- Create: `.prettierrc`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `tests/setup.ts`

**Implementation notes:**
- Enable ESLint for TypeScript + React + Next.js.
- Configure Vitest for unit/component tests.
- Configure Playwright for end-to-end tests.

**Verification:**
- Run: `npm run lint`
- Run: `npm run test`
- Expected: both succeed with initial placeholder tests.

### Task 4: Define shared TypeScript domain models
**Objective:** Create stable, reusable types for the whole app.

**Files:**
- Create: `src/lib/types/chat.ts`
- Create: `src/lib/types/session.ts`
- Create: `src/lib/types/skill.ts`
- Create: `src/lib/types/extension.ts`
- Create: `src/lib/types/memory.ts`
- Create: `src/lib/types/profile.ts`
- Create: `src/lib/types/policy.ts`

**Implementation notes:**
- Include types for Session, Message, ToolCall, Artifact, Skill, Extension, MemoryEntry, Profile, ApprovalRequest.
- Mirror likely runtime payloads but keep UI-specific fields optional.

**Verification:**
- Add a compile-only test import in a shared file.
- Expected: no circular or unresolved type errors.

### Task 5: Define API schemas and normalization layer
**Objective:** Ensure backend responses are normalized before they reach feature components.

**Files:**
- Create: `src/lib/schemas/chat.ts`
- Create: `src/lib/schemas/session.ts`
- Create: `src/lib/schemas/skill.ts`
- Create: `src/lib/schemas/extension.ts`
- Create: `src/lib/schemas/memory.ts`
- Create: `src/lib/api/client.ts`
- Create: `src/lib/api/normalizers.ts`

**Implementation notes:**
- Use zod to parse server responses.
- Add defensive normalization for missing/unknown fields.

**Verification:**
- Unit-test malformed payload handling.
- Expected: invalid payloads are rejected cleanly.

---

## Phase 1: App Shell, Navigation, and Global State

### Task 6: Build the top-level app shell
**Objective:** Create the permanent layout structure used throughout the app.

**Files:**
- Create: `src/components/layout/app-shell.tsx`
- Create: `src/components/layout/sidebar.tsx`
- Create: `src/components/layout/topbar.tsx`
- Create: `src/components/layout/right-drawer.tsx`
- Modify: `src/app/layout.tsx`

**Implementation notes:**
- Include navigation for Chat, Skills, Extensions, Memory, Profiles, Settings.
- Make desktop and mobile variants early.
- Keep content slots generic.

**Verification:**
- Manual: desktop and mobile viewport check.
- Expected: shell is responsive and routes switch correctly.

### Task 7: Add theme system and design tokens
**Objective:** Establish a polished visual system before feature complexity grows.

**Files:**
- Modify: `src/styles/globals.css`
- Create: `src/components/theme/theme-provider.tsx`
- Create: `src/components/theme/theme-toggle.tsx`

**Implementation notes:**
- Support dark mode and light mode.
- Add semantic tokens for status states: running, success, error, warning, approval.

**Verification:**
- Manual: theme persists and status colors remain legible.

### Task 8: Add global query and store providers
**Objective:** Set up shared data-fetching and local UI state.

**Files:**
- Create: `src/components/providers/query-provider.tsx`
- Create: `src/lib/store/ui-store.ts`
- Modify: `src/app/layout.tsx`

**Implementation notes:**
- Use TanStack Query for server state.
- Use Zustand for local state like drawer visibility, selected tool card, active profile UI state.

**Verification:**
- Add a small sample store interaction test.
- Expected: provider wiring works across routes.

---

## Phase 2: Authentication and Runtime Connectivity

### Task 9: Implement control-plane auth foundation
**Objective:** Add authentication to protect the app and future admin controls.

**Files:**
- Create: `src/server/auth/session.ts`
- Create: `src/server/auth/guards.ts`
- Create: `src/app/login/page.tsx`
- Create: `src/app/api/auth/*` or equivalent backend routes

**Implementation notes:**
- Start with simple local auth suitable for self-hosted deployments.
- Keep role fields in session model even if only one role exists initially.

**Verification:**
- Manual: unauthenticated access redirects to login.
- Expected: authenticated user can access chat.

### Task 10: Implement Hermes runtime client adapter
**Objective:** Create one server-side adapter for Hermes API server communication.

**Files:**
- Create: `src/server/hermes/client.ts`
- Create: `src/server/hermes/config.ts`
- Create: `src/server/hermes/errors.ts`

**Implementation notes:**
- Centralize base URL, API key, timeout, and retry logic.
- Handle connection failures and stream interruptions consistently.

**Verification:**
- Unit test connection and error mapping.
- Expected: runtime errors are transformed into app-level errors.

### Task 11: Implement server-side streaming adapter
**Objective:** Normalize Hermes stream output into frontend-friendly events.

**Files:**
- Create: `src/server/hermes/stream-parser.ts`
- Create: `src/server/hermes/event-types.ts`
- Create: `src/app/api/chat/stream/route.ts` or equivalent

**Implementation notes:**
- Normalize into event shapes like:
  - `assistant.delta`
  - `tool.started`
  - `tool.awaiting_approval`
  - `tool.completed`
  - `artifact.emitted`
  - `error`
- Preserve event ordering.

**Verification:**
- Unit test sample streams.
- Expected: stream parser emits stable event sequence.

---

## Phase 3: Chat and Session Experience

### Task 12: Build the Chat route shell
**Objective:** Create the main chat page layout.

**Files:**
- Create: `src/app/chat/page.tsx`
- Create: `src/features/chat/components/chat-screen.tsx`
- Create: `src/features/chat/components/chat-header.tsx`
- Create: `src/features/chat/components/chat-transcript.tsx`
- Create: `src/features/chat/components/chat-composer.tsx`

**Implementation notes:**
- Header should show session title, active profile, model chip, policy badge.
- Composer should support multiline entry and future attachment/mic controls.

**Verification:**
- Manual: route loads and mock transcript renders.

### Task 13: Implement message and transcript rendering primitives
**Objective:** Create reusable transcript components for user/assistant/system entries.

**Files:**
- Create: `src/features/chat/components/message-bubble.tsx`
- Create: `src/features/chat/components/message-list.tsx`
- Create: `src/features/chat/components/streaming-message.tsx`

**Implementation notes:**
- Messages should support markdown/code rendering.
- Streaming assistant text should update smoothly.

**Verification:**
- Component tests for rendering, streaming, and code blocks.

### Task 14: Build the session sidebar
**Objective:** Let users browse and switch sessions quickly.

**Files:**
- Create: `src/features/sessions/components/session-sidebar.tsx`
- Create: `src/features/sessions/components/session-list.tsx`
- Create: `src/features/sessions/components/session-list-item.tsx`
- Create: `src/features/sessions/api/use-sessions.ts`

**Implementation notes:**
- Group by recency if possible.
- Include actions for rename/archive/delete later, but stub affordances early.

**Verification:**
- Manual: switching session updates transcript context.

### Task 15: Implement send-message and new-session flows
**Objective:** Make core chat functional end to end.

**Files:**
- Create: `src/features/chat/api/use-chat-stream.ts`
- Modify: `src/features/chat/components/chat-composer.tsx`
- Modify: `src/features/chat/components/chat-screen.tsx`

**Implementation notes:**
- New chat should create or select a fresh session.
- Sending a message should stream assistant output into the active session view.

**Verification:**
- E2E: create new chat, send message, receive streamed response.

### Task 16: Implement session actions: rename, archive, delete
**Objective:** Complete the baseline session management workflow.

**Files:**
- Create: `src/features/sessions/components/session-actions-menu.tsx`
- Create: `src/features/sessions/api/use-session-actions.ts`

**Implementation notes:**
- Use optimistic updates carefully.
- Add confirmation for delete.

**Verification:**
- E2E: rename and delete a session from the sidebar.

### Task 17: Add session search
**Objective:** Let users search their session history.

**Files:**
- Create: `src/features/sessions/components/session-search.tsx`
- Modify: `src/features/sessions/api/use-sessions.ts`

**Implementation notes:**
- Debounce search input.
- Highlight match snippets if available.

**Verification:**
- E2E: search returns and opens a matching session.

### Task 18: Add session fork support
**Objective:** Support branching conversations.

**Files:**
- Create: `src/features/sessions/components/fork-session-dialog.tsx`
- Modify: `src/features/sessions/api/use-session-actions.ts`

**Implementation notes:**
- Create a new session linked to parent metadata.
- UI can initially display fork as a simple badge without a full graph.

**Verification:**
- E2E: forked session opens separately with copied context.

---

## Phase 4: Tool Visibility, Artifacts, and Approvals

### Task 19: Implement tool call cards
**Objective:** Render tool activity as first-class UI.

**Files:**
- Create: `src/features/chat/components/tool-card.tsx`
- Create: `src/features/chat/components/tool-card-header.tsx`
- Create: `src/features/chat/components/tool-card-body.tsx`
- Create: `src/features/chat/components/tool-status-badge.tsx`

**Implementation notes:**
- States: queued, running, awaiting approval, success, failed.
- Body should show arguments/output with redaction support.

**Verification:**
- Component tests for each state.

### Task 20: Implement approval request cards and actions
**Objective:** Let users approve or reject risky actions from the transcript.

**Files:**
- Create: `src/features/chat/components/approval-card.tsx`
- Create: `src/features/chat/api/use-approval-actions.ts`
- Create: `src/app/api/approvals/[id]/approve/route.ts`
- Create: `src/app/api/approvals/[id]/reject/route.ts`

**Implementation notes:**
- Approval UI must show action summary, risk class, and scope.
- Keep copy human-readable.

**Verification:**
- E2E: risky action pauses, approval card appears, approve continues flow.

### Task 21: Implement artifact cards and right-drawer artifact panel
**Objective:** Show files, diffs, and outputs as structured artifacts.

**Files:**
- Create: `src/features/chat/components/artifact-card.tsx`
- Create: `src/features/chat/components/artifact-panel.tsx`
- Modify: `src/components/layout/right-drawer.tsx`

**Implementation notes:**
- Start with generic artifact types: file, diff, image, text output.
- Support transcript references that open the artifact drawer.

**Verification:**
- Component tests for artifact rendering.

### Task 22: Implement tool timeline drawer content
**Objective:** Provide a deeper debugging view without cluttering the transcript.

**Files:**
- Create: `src/features/chat/components/tool-timeline.tsx`
- Modify: `src/components/layout/right-drawer.tsx`

**Implementation notes:**
- Timeline should show ordered tool events with timestamps.
- Selecting a timeline item can focus the corresponding tool card.

**Verification:**
- Manual: open drawer and inspect event sequence.

---

## Phase 5: Model Selection, Attachments, Voice, and Settings

### Task 23: Implement model/provider switcher
**Objective:** Let users choose the model and provider per session.

**Files:**
- Create: `src/features/settings/components/model-switcher.tsx`
- Create: `src/features/settings/api/use-models.ts`
- Modify: `src/features/chat/components/chat-header.tsx`

**Implementation notes:**
- Show provider, model name, and capability badges.
- Keep advanced inference controls out of the primary flow initially.

**Verification:**
- Manual: selecting a model updates session settings.

### Task 24: Add per-chat settings sheet
**Objective:** Expose model, policy, and session-level settings in a contained UI.

**Files:**
- Create: `src/features/settings/components/chat-settings-sheet.tsx`
- Create: `src/features/settings/api/use-chat-settings.ts`

**Implementation notes:**
- Include model, policy preset, and memory mode.
- Keep the sheet lightweight.

**Verification:**
- Component test for reading and saving settings.

### Task 25: Add file attachment UI
**Objective:** Support drag/drop and attach flows in the composer.

**Files:**
- Create: `src/features/chat/components/attachment-chip.tsx`
- Create: `src/features/chat/components/attachment-dropzone.tsx`
- Modify: `src/features/chat/components/chat-composer.tsx`
- Create: `src/app/api/uploads/route.ts` if needed

**Implementation notes:**
- Start with visible attachment chips before send.
- Keep upload API abstract so backend implementation can evolve.

**Verification:**
- E2E: attach file and send message with attachment metadata.

### Task 26: Add voice input and TTS playback controls
**Objective:** Support speech-based interaction.

**Files:**
- Create: `src/features/chat/components/mic-button.tsx`
- Create: `src/features/chat/components/tts-button.tsx`
- Create: `src/features/chat/api/use-voice.ts`

**Implementation notes:**
- Voice input can start with browser recording + upload.
- TTS should be optional per message.

**Verification:**
- Manual: trigger voice flow and playback on supported environments.

---

## Phase 6: Skills Management

### Task 27: Build Skills list page
**Objective:** Create the base Skills experience.

**Files:**
- Create: `src/app/skills/page.tsx`
- Create: `src/features/skills/components/skills-screen.tsx`
- Create: `src/features/skills/components/skills-list.tsx`
- Create: `src/features/skills/components/skill-card.tsx`
- Create: `src/features/skills/api/use-skills.ts`

**Implementation notes:**
- Support Installed and Discover tabs eventually.
- Show provenance badge and enablement state.

**Verification:**
- Manual: installed skills render from API.

### Task 28: Implement skill detail and inspect flow
**Objective:** Let users inspect metadata and source.

**Files:**
- Create: `src/app/skills/[id]/page.tsx`
- Create: `src/features/skills/components/skill-detail.tsx`
- Create: `src/features/skills/api/use-skill-detail.ts`

**Implementation notes:**
- Include metadata, source, provenance, last updated, scope.

**Verification:**
- Manual: detail page loads and displays content correctly.

### Task 29: Implement skill install/uninstall/enable/disable actions
**Objective:** Make skills manageable without the CLI.

**Files:**
- Create: `src/features/skills/api/use-skill-actions.ts`
- Create: `src/features/skills/components/skill-action-bar.tsx`

**Implementation notes:**
- Distinguish installed vs enabled.
- Show optimistic state changes carefully.

**Verification:**
- E2E: install and enable a skill from the Skills UI.

### Task 30: Implement skill source editor
**Objective:** Let users edit local skills safely.

**Files:**
- Create: `src/features/skills/components/skill-editor.tsx`
- Create: `src/features/skills/components/skill-diff-preview.tsx`

**Implementation notes:**
- Use CodeMirror/Monaco.
- Show warnings for bundled/managed skills.
- Prefer save with preview if backend allows it.

**Verification:**
- Component test for editor load/save.

### Task 31: Add “load skill into current session” action
**Objective:** Close the loop between skills management and chat usage.

**Files:**
- Modify: `src/features/skills/components/skill-action-bar.tsx`
- Modify: `src/features/chat/*` as needed

**Implementation notes:**
- Trigger a session-scoped load or prompt injection action through the backend.

**Verification:**
- Manual: user can load a chosen skill into active chat.

---

## Phase 7: Extensions and MCP Management

### Task 32: Build Extensions list page
**Objective:** Create the base Extensions area.

**Files:**
- Create: `src/app/extensions/page.tsx`
- Create: `src/features/extensions/components/extensions-screen.tsx`
- Create: `src/features/extensions/components/extension-card.tsx`
- Create: `src/features/extensions/api/use-extensions.ts`

**Implementation notes:**
- Support Installed first; Discover can be partial in MVP.
- Show health, risk, compatibility, and type.

**Verification:**
- Manual: extensions render with status badges.

### Task 33: Implement Add MCP server flow
**Objective:** Let users add an MCP server from the WebUI.

**Files:**
- Create: `src/features/extensions/components/add-mcp-server-dialog.tsx`
- Create: `src/features/extensions/components/mcp-server-form.tsx`
- Create: `src/features/extensions/api/use-add-mcp-server.ts`

**Implementation notes:**
- Support command-based and URL-based definitions.
- Validate input strongly.

**Verification:**
- E2E: create MCP server entry successfully.

### Task 34: Implement extension detail view
**Objective:** Provide deep inspection and controls.

**Files:**
- Create: `src/app/extensions/[id]/page.tsx`
- Create: `src/features/extensions/components/extension-detail.tsx`
- Create: `src/features/extensions/components/extension-permissions-tab.tsx`
- Create: `src/features/extensions/components/extension-config-tab.tsx`
- Create: `src/features/extensions/components/extension-capabilities-tab.tsx`

**Implementation notes:**
- Tabs: Overview, Permissions, Configuration, Capabilities, Versions, Activity.

**Verification:**
- Manual: detail page shows all sections correctly.

### Task 35: Implement extension auth/config and test connection actions
**Objective:** Support practical setup flows.

**Files:**
- Create: `src/features/extensions/api/use-extension-actions.ts`
- Modify: `src/features/extensions/components/extension-config-tab.tsx`

**Implementation notes:**
- Include test connection button.
- Report health state changes after test.

**Verification:**
- E2E: configure and test an MCP server.

### Task 36: Implement capability-level enable/disable controls
**Objective:** Allow granular extension exposure.

**Files:**
- Modify: `src/features/extensions/components/extension-capabilities-tab.tsx`
- Create: `src/features/extensions/components/capability-toggle.tsx`

**Implementation notes:**
- Show risk classes and scope.
- Allow enable/disable per capability.

**Verification:**
- E2E: enable one capability while leaving another disabled.

### Task 37: Implement health state and compatibility indicators
**Objective:** Make extension failures and setup gaps understandable.

**Files:**
- Create: `src/features/extensions/components/extension-health-badge.tsx`
- Modify: `src/features/extensions/components/extension-card.tsx`

**Implementation notes:**
- States: healthy, needs configuration, auth expired, incompatible, test failed, disabled by policy.

**Verification:**
- Component tests for each state.

---

## Phase 8: Memory and Context Inspector

### Task 38: Build Memory page shell
**Objective:** Create the Memory area and navigation.

**Files:**
- Create: `src/app/memory/page.tsx`
- Create: `src/features/memory/components/memory-screen.tsx`
- Create: `src/features/memory/components/memory-tabs.tsx`

**Implementation notes:**
- Tabs: User Memory, Agent Memory, Session Search, Context Inspector.

**Verification:**
- Manual: page loads and tabs switch correctly.

### Task 39: Implement user and agent memory editors
**Objective:** Make prompt memory manageable.

**Files:**
- Create: `src/features/memory/components/memory-editor.tsx`
- Create: `src/features/memory/api/use-memory.ts`

**Implementation notes:**
- Support view/edit/save for both memory types.
- Warn when changes affect next session rather than current session.

**Verification:**
- E2E: edit and save a memory entry.

### Task 40: Implement session search UI
**Objective:** Expose searchable history distinctly from prompt memory.

**Files:**
- Create: `src/features/memory/components/session-search-panel.tsx`
- Create: `src/features/memory/api/use-session-search.ts`

**Implementation notes:**
- Use debounced search.
- Link results back to sessions when possible.

**Verification:**
- E2E: search history and open matching session.

### Task 41: Implement context inspector
**Objective:** Show users what Hermes is using as context.

**Files:**
- Create: `src/features/memory/components/context-inspector.tsx`
- Create: `src/features/memory/api/use-context-inspector.ts`

**Implementation notes:**
- Show loaded memory, selected profile, active model, and active skill/extension context if available.

**Verification:**
- Manual: context data reflects current session state.

---

## Phase 9: Profiles, Policies, and Audit

### Task 42: Build Profiles page and switcher
**Objective:** Make profile isolation visible and easy to manage.

**Files:**
- Create: `src/app/profiles/page.tsx`
- Create: `src/features/profiles/components/profiles-screen.tsx`
- Create: `src/features/profiles/components/profile-card.tsx`
- Create: `src/features/profiles/components/profile-switcher.tsx`
- Create: `src/features/profiles/api/use-profiles.ts`

**Implementation notes:**
- Global profile switcher should also appear in app header.
- Show summary counts for sessions, skills, extensions.

**Verification:**
- E2E: switch profile and see scoped data update.

### Task 43: Implement create/clone/delete profile actions
**Objective:** Complete the profile management workflow.

**Files:**
- Create: `src/features/profiles/components/create-profile-dialog.tsx`
- Create: `src/features/profiles/api/use-profile-actions.ts`

**Implementation notes:**
- Ask for confirmation before delete.
- Clone should preserve safe defaults.

**Verification:**
- E2E: create and switch to a new profile.

### Task 44: Implement policy presets UI
**Objective:** Expose tool safety posture as a user-facing concept.

**Files:**
- Create: `src/features/settings/components/policy-preset-selector.tsx`
- Create: `src/features/settings/api/use-policies.ts`

**Implementation notes:**
- Include Safe Chat, Research, Builder, Full Power.
- Show short human-readable descriptions.

**Verification:**
- Manual: changing policy updates header badge and backend payload.

### Task 45: Implement audit event view
**Objective:** Surface risky actions and extension changes for debugging and trust.

**Files:**
- Create: `src/app/settings/audit/page.tsx` or `src/features/settings/components/audit-log.tsx`
- Create: `src/features/settings/api/use-audit-log.ts`

**Implementation notes:**
- Start with simple list view: timestamp, actor, action type, target, outcome.

**Verification:**
- Manual: recent approvals and config changes appear in the audit log.

---

## Phase 10: Quality, Performance, and Hardening

### Task 46: Add loading, empty, and error states across major screens
**Objective:** Ensure the app feels polished and debuggable.

**Files:**
- Modify: feature screen components across `src/features/**`
- Create: `src/components/feedback/*`

**Implementation notes:**
- Every screen should explain what it is for in empty states.
- Error states should be actionable.

**Verification:**
- Manual and component tests for empty/error variants.

### Task 47: Add mobile and responsive refinements
**Objective:** Make core flows usable on small screens.

**Files:**
- Modify: layout and feature components across `src/components/layout` and `src/features/**`

**Implementation notes:**
- Sidebar becomes slide-over.
- Right drawer becomes bottom sheet/full-screen panel.
- Composer remains easy to use.

**Verification:**
- Playwright mobile viewport tests for chat, skills, and extensions.

### Task 48: Add telemetry and client-side diagnostics hooks
**Objective:** Make failures visible during alpha/beta.

**Files:**
- Create: `src/lib/telemetry/client.ts`
- Create: `src/server/telemetry/server.ts`

**Implementation notes:**
- Track stream failures, load failures, approval outcomes, MCP test failures.

**Verification:**
- Unit tests for event emission wrappers.

### Task 49: Add E2E flows for critical journeys
**Objective:** Protect the highest-value user journeys from regression.

**Files:**
- Create: `tests/e2e/chat.spec.ts`
- Create: `tests/e2e/skills.spec.ts`
- Create: `tests/e2e/extensions.spec.ts`
- Create: `tests/e2e/memory.spec.ts`
- Create: `tests/e2e/profiles.spec.ts`

**Implementation notes:**
- Critical flows:
  - first chat
  - session resume
  - skill install/edit
  - add/test MCP server
  - memory edit
  - profile switch

**Verification:**
- Run: `npm run test:e2e`
- Expected: all critical user journeys pass.

### Task 50: Prepare alpha release checklist
**Objective:** Make the first release intentional rather than ad hoc.

**Files:**
- Create: `docs/alpha-release-checklist.md`
- Create: `docs/deployment-notes.md`

**Implementation notes:**
- Include config requirements, supported environments, known limitations, safe defaults, and test status.

**Verification:**
- Manual review and signoff.

---

## Recommended Task Order for First Shipping Milestone

Implement in this order:
1. Tasks 1-11: foundations, app shell, auth, Hermes client, stream adapter
2. Tasks 12-18: chat, sessions, send flow, session search/fork
3. Tasks 19-22: tool cards, approvals, artifacts, timeline
4. Tasks 23-26: model switcher, settings, attachments, voice/TTS
5. Tasks 27-31: skills
6. Tasks 32-37: extensions/MCP
7. Tasks 38-41: memory
8. Tasks 42-45: profiles, policies, audit
9. Tasks 46-50: hardening and alpha prep

---

## Definition of Done for MVP

The MVP is done when:
- a user can log in, open chat, and stream a response
- session history and search work
- tool activity appears as structured UI
- risky actions can be approved in the UI
- a skill can be installed, enabled, inspected, and edited
- an MCP server can be added, configured, tested, and scoped
- user and agent memory can be viewed and edited
- profiles can be switched cleanly
- mobile usage is acceptable for chat and basic management flows
- critical E2E tests pass

---

## Recommended Immediate Next Step

Start with Tasks 1-11 and build a thin vertical slice:
- login
- app shell
- session list
- chat transcript
- composer
- Hermes stream adapter
- basic tool event rendering

That slice will validate the architecture before deeper feature investment.