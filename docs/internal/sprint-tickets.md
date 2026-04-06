# Pan Sprint Tickets

> For Hermes: Use subagent-driven-development skill to execute these tickets sprint-by-sprint.

**Planning assumption:** 2-week sprints, small product team, MVP-first sequencing.

**Team assumption:**
- 1 frontend engineer
- 1 full-stack/platform engineer
- 1 design-capable product engineer or shared designer
- optional QA support during hardening sprints

**Ticket format:**
- ID
- Title
- Goal
- Scope
- Dependencies
- Acceptance criteria
- Suggested owner

---

# Sprint 1: Foundations and Vertical Slice Setup

## Sprint Goal
Stand up the repository, app shell, shared types, and runtime adapter so the team can start building a thin end-to-end chat slice.

## Tickets

### HW-001 — Initialize Next.js application and base repo structure
**Goal:** Create the project scaffold and agreed directory layout.

**Scope:**
- initialize Next.js with TypeScript and App Router
- create `src/app`, `src/components`, `src/features`, `src/server`, `src/lib`, `tests`
- add path aliases
- set strict TypeScript options

**Dependencies:** none

**Acceptance criteria:**
- `npm install` succeeds
- `npm run dev` starts the app
- root app renders successfully
- directory structure matches architecture doc

**Suggested owner:** frontend/full-stack

### HW-002 — Configure Tailwind, shadcn/ui, and design tokens
**Goal:** Establish the visual foundation.

**Scope:**
- install Tailwind and shadcn/ui
- configure base theme variables
- add semantic colors for status states
- create shared utility helpers

**Dependencies:** HW-001

**Acceptance criteria:**
- design token CSS variables exist
- sample shadcn component renders correctly
- dark mode styling is possible

**Suggested owner:** frontend

### HW-003 — Add linting, formatting, and test toolchain
**Goal:** Make the repo safe to scale.

**Scope:**
- ESLint
- Prettier
- Vitest
- React Testing Library
- Playwright config

**Dependencies:** HW-001

**Acceptance criteria:**
- `npm run lint` passes
- `npm run test` passes with placeholder test
- `npm run test:e2e` is configured, even if only one smoke test exists

**Suggested owner:** full-stack

### HW-004 — Define shared domain types and zod schemas
**Goal:** Create stable types for sessions, messages, tools, skills, extensions, memory, profiles, and policies.

**Scope:**
- TypeScript models
- zod schemas
- normalization helpers

**Dependencies:** HW-001

**Acceptance criteria:**
- type modules exist for all major domains
- schemas parse valid mock payloads
- invalid payloads fail predictably in tests

**Suggested owner:** full-stack

### HW-005 — Build top-level app shell and route skeletons
**Goal:** Create the persistent navigation and layout used across the app.

**Scope:**
- left nav
- top bar
- right drawer shell
- placeholder pages for Chat, Skills, Extensions, Memory, Profiles, Settings
- mobile shell behavior baseline

**Dependencies:** HW-002

**Acceptance criteria:**
- all routes render inside the shared shell
- nav works on desktop and mobile viewport
- right drawer can open and close

**Suggested owner:** frontend

### HW-006 — Add query provider and UI store
**Goal:** Prepare global data fetching and local UI state.

**Scope:**
- TanStack Query provider
- Zustand UI store
- mount providers in app layout

**Dependencies:** HW-001

**Acceptance criteria:**
- query client mounted globally
- local UI store works for drawer visibility/theme/profile selection placeholders

**Suggested owner:** frontend

### HW-007 — Implement Hermes runtime client and error mapping
**Goal:** Create a server-side adapter for Hermes API communication.

**Scope:**
- server-side HTTP client
- base URL/API key config
- timeout/retry handling
- app-level error mapping

**Dependencies:** HW-004

**Acceptance criteria:**
- adapter module exists with typed methods
- connection failures map to stable error objects
- unit tests cover success and failure cases

**Suggested owner:** platform/full-stack

### HW-008 — Implement streaming parser and normalized event model
**Goal:** Convert Hermes responses into UI-friendly stream events.

**Scope:**
- event types:
  - assistant.delta
  - tool.started
  - tool.awaiting_approval
  - tool.completed
  - artifact.emitted
  - error
- stream parser tests
- server route for streaming pass-through

**Dependencies:** HW-007

**Acceptance criteria:**
- sample streams parse into ordered event objects
- server stream endpoint exists
- parser is covered by tests

**Suggested owner:** platform/full-stack

### HW-009 — Add local auth baseline
**Goal:** Protect the app for self-hosted use.

**Scope:**
- simple login page
- session guard middleware/route guard
- minimal role field in auth session model

**Dependencies:** HW-005

**Acceptance criteria:**
- unauthenticated users are redirected to login
- authenticated session can access app shell
- auth state is available server-side and client-side

**Suggested owner:** full-stack

## Sprint 1 Exit Criteria
- app shell exists
- auth works
- Hermes adapter works
- stream event model exists
- routes are scaffolded and test/lint setup is healthy

---

# Sprint 2: Thin End-to-End Chat Slice

## Sprint Goal
Ship the first real user flow: open chat, create session, send message, stream response.

## Tickets

### HW-010 — Create Chat page shell and transcript layout
**Goal:** Build the visible chat screen structure.

**Scope:**
- chat header
- transcript area
- composer
- empty state for new session

**Dependencies:** HW-005

**Acceptance criteria:**
- `/chat` renders a functional chat screen shell
- empty state explains next action

**Suggested owner:** frontend

### HW-011 — Implement message rendering primitives
**Goal:** Render user and assistant messages cleanly.

**Scope:**
- user bubble
- assistant bubble
- markdown/code rendering
- streaming text component

**Dependencies:** HW-010

**Acceptance criteria:**
- message components render text and code blocks correctly
- streaming content updates without flicker

**Suggested owner:** frontend

### HW-012 — Build session sidebar and recent sessions list
**Goal:** Let users browse and switch sessions.

**Scope:**
- session sidebar
- session list item component
- active session selection state

**Dependencies:** HW-005, HW-004

**Acceptance criteria:**
- sidebar shows session items from mock/live API
- clicking a session loads it in chat view

**Suggested owner:** frontend

### HW-013 — Implement create session and send message flows
**Goal:** Make chat work end to end.

**Scope:**
- create new session
- submit message
- open SSE stream
- append assistant deltas to transcript

**Dependencies:** HW-008, HW-010, HW-011

**Acceptance criteria:**
- user can create a session and send a message
- response streams into transcript in real time
- errors render gracefully

**Suggested owner:** full-stack

### HW-014 — Connect chat route to server-side session APIs
**Goal:** Replace mock state with real session operations.

**Scope:**
- list sessions
- create session
- get session messages
- basic error/loading states

**Dependencies:** HW-007, HW-012, HW-013

**Acceptance criteria:**
- session list populates from backend
- selecting a session loads correct transcript

**Suggested owner:** full-stack

### HW-015 — Add smoke E2E for first chat journey
**Goal:** Lock in the first vertical slice.

**Scope:**
- login
- open chat
- create session
- send message
- receive streamed response

**Dependencies:** HW-013, HW-014

**Acceptance criteria:**
- Playwright test passes in CI/local

**Suggested owner:** QA/full-stack

## Sprint 2 Exit Criteria
- first-chat journey works end to end
- sessions can be created and opened
- transcript streams from real runtime events

---

# Sprint 3: Sessions, Search, and Core Chat Polish

## Sprint Goal
Make chat feel usable day-to-day with session management, search, model controls, and solid baseline polish.

## Tickets

### HW-016 — Add session rename, archive, and delete actions
**Goal:** Complete baseline session management.

**Scope:**
- action menu per session
- rename dialog
- archive action
- delete confirmation

**Dependencies:** HW-014

**Acceptance criteria:**
- user can rename, archive, and delete sessions
- list updates correctly after actions

**Suggested owner:** frontend/full-stack

### HW-017 — Implement session search
**Goal:** Help users find old conversations quickly.

**Scope:**
- debounced session search input
- search API integration
- search result selection

**Dependencies:** HW-014

**Acceptance criteria:**
- user can search sessions and open a result
- search loading/empty states are clear

**Suggested owner:** frontend

### HW-018 — Implement session fork action
**Goal:** Support branching conversations.

**Scope:**
- fork action
- create child session from current context
- simple fork badge in UI

**Dependencies:** HW-016

**Acceptance criteria:**
- user can fork a session into a new one
- new session opens with inherited context

**Suggested owner:** full-stack

### HW-019 — Add chat header model/provider switcher
**Goal:** Make model selection easy and visible.

**Scope:**
- searchable model/provider picker
- active model chip in header
- save selection to session settings

**Dependencies:** HW-010

**Acceptance criteria:**
- current model/provider is visible
- user can change model for active session

**Suggested owner:** frontend/full-stack

### HW-020 — Add per-chat settings sheet
**Goal:** Keep advanced session controls contained.

**Scope:**
- settings sheet UI
- controls for model, policy preset, memory mode placeholders

**Dependencies:** HW-019

**Acceptance criteria:**
- settings sheet opens from chat header
- changes persist to active session config

**Suggested owner:** frontend

### HW-021 — Polish transcript states and error handling
**Goal:** Improve perceived quality and resilience.

**Scope:**
- better empty/loading/error states
- retry state in composer/transcript
- scroll anchoring and stream smoothness fixes

**Dependencies:** HW-013

**Acceptance criteria:**
- common error states are readable and recoverable
- transcript remains stable during long streams

**Suggested owner:** frontend

## Sprint 3 Exit Criteria
- sessions are manageable
- search works
- model/session settings exist
- chat feels production-shaped, not prototype-shaped

---

# Sprint 4: Tool Cards, Approvals, and Artifacts

## Sprint Goal
Make Hermes feel like an agent, not just a chatbot, by surfacing tool use and risky actions clearly.

## Tickets

### HW-022 — Implement transcript tool cards
**Goal:** Render tool usage as structured UI.

**Scope:**
- tool card component
- status badge
- expandable args/output sections
- states for queued/running/success/failed

**Dependencies:** HW-008, HW-011

**Acceptance criteria:**
- tool events render inline in transcript
- cards support expand/collapse

**Suggested owner:** frontend

### HW-023 — Implement approval cards and action handlers
**Goal:** Let users approve or reject risky actions inline.

**Scope:**
- approval card component
- approve/reject API actions
- pending approval UI state

**Dependencies:** HW-022

**Acceptance criteria:**
- approval-required events render clearly
- approving or rejecting updates transcript state correctly

**Suggested owner:** full-stack

### HW-024 — Add right-drawer tool timeline
**Goal:** Provide a deeper run-inspection surface.

**Scope:**
- timeline component in right drawer
- ordered event history
- linking between transcript cards and drawer details

**Dependencies:** HW-022

**Acceptance criteria:**
- tool event timeline can be inspected without cluttering main transcript

**Suggested owner:** frontend

### HW-025 — Implement artifact cards and artifact panel
**Goal:** Surface files, diffs, and outputs as first-class results.

**Scope:**
- artifact card component
- artifact panel in right drawer
- support for file/diff/text/image artifact types

**Dependencies:** HW-022

**Acceptance criteria:**
- artifacts can be shown inline and opened in panel

**Suggested owner:** frontend

### HW-026 — Add E2E for tool and approval flow
**Goal:** Prevent regressions in the agent-native experience.

**Scope:**
- test that tool cards appear
- test approval-required path
- test approval resolution updates UI

**Dependencies:** HW-023, HW-025

**Acceptance criteria:**
- Playwright coverage exists for tool and approval flow

**Suggested owner:** QA/full-stack

## Sprint 4 Exit Criteria
- tool activity is visible and understandable
- risky actions can be approved in UI
- artifacts have a usable presentation

---

# Sprint 5: Skills Management MVP

## Sprint Goal
Let users manage Hermes skills without dropping to CLI.

## Tickets

### HW-027 — Build Skills page, tabs, and list view
**Goal:** Create the top-level Skills experience.

**Scope:**
- Skills route
- Installed tab
- Discover tab placeholder or partial support
- skill cards with provenance badges

**Dependencies:** HW-005, HW-004

**Acceptance criteria:**
- skills page renders installed skills from backend
- provenance and enablement state are visible

**Suggested owner:** frontend

### HW-028 — Implement skill detail page
**Goal:** Show metadata and source context for a selected skill.

**Scope:**
- overview section
- metadata section
- source preview
- last updated / scope / provenance

**Dependencies:** HW-027

**Acceptance criteria:**
- selecting a skill opens detail page with full data

**Suggested owner:** frontend

### HW-029 — Implement skill install/uninstall/enable/disable actions
**Goal:** Make skill lifecycle functional.

**Scope:**
- action bar buttons
- install/uninstall APIs
- enable/disable APIs
- optimistic state updates

**Dependencies:** HW-028

**Acceptance criteria:**
- user can install and enable a skill from UI
- state updates correctly after action completion

**Suggested owner:** full-stack

### HW-030 — Implement skill editor
**Goal:** Support direct editing of local skill source.

**Scope:**
- CodeMirror/Monaco-based editor
- save action
- warnings for bundled/managed skills

**Dependencies:** HW-028

**Acceptance criteria:**
- editable skills can be modified and saved
- warnings appear for non-local/bundled skills

**Suggested owner:** frontend/full-stack

### HW-031 — Add “load skill into current session” flow
**Goal:** Connect skills management back into chat usage.

**Scope:**
- action button in skill detail/action bar
- active session integration

**Dependencies:** HW-029

**Acceptance criteria:**
- user can load a skill into active chat from Skills UI

**Suggested owner:** full-stack

### HW-032 — Add E2E for skill install/edit flow
**Goal:** Protect one of Hermes’s key differentiators.

**Scope:**
- install skill
- enable skill
- edit local skill
- load into session

**Dependencies:** HW-030, HW-031

**Acceptance criteria:**
- Playwright skill management flow passes

**Suggested owner:** QA/full-stack

## Sprint 5 Exit Criteria
- users can inspect, install, enable, edit, and load skills in the UI

---

# Sprint 6: Extensions and MCP Management MVP

## Sprint Goal
Make it possible to add, configure, test, and scope MCP servers and extensions from the WebUI.

## Tickets

### HW-033 — Build Extensions page and installed list
**Goal:** Create the base extensions management surface.

**Scope:**
- Extensions route
- installed list
- status badges for health/risk/compatibility

**Dependencies:** HW-005, HW-004

**Acceptance criteria:**
- extensions page renders installed items correctly

**Suggested owner:** frontend

### HW-034 — Implement Add MCP Server dialog and form
**Goal:** Let users add new MCP servers visually.

**Scope:**
- add dialog
- command-based config
- URL-based config
- zod validation

**Dependencies:** HW-033

**Acceptance criteria:**
- user can submit valid MCP definitions
- invalid input is blocked with clear messaging

**Suggested owner:** frontend/full-stack

### HW-035 — Implement extension detail view with tabs
**Goal:** Provide a full management surface for each extension.

**Scope:**
- overview tab
- permissions tab
- configuration tab
- capabilities tab
- versions/activity placeholders if needed

**Dependencies:** HW-033

**Acceptance criteria:**
- extension detail page renders all major sections

**Suggested owner:** frontend

### HW-036 — Implement test connection and auth/config actions
**Goal:** Support actual extension setup, not just listing.

**Scope:**
- save config action
- test connection action
- health state refresh after test

**Dependencies:** HW-034, HW-035

**Acceptance criteria:**
- user can configure an extension and run test connection
- success/failure updates the UI clearly

**Suggested owner:** full-stack

### HW-037 — Implement capability-level toggles and scope controls
**Goal:** Allow granular extension exposure.

**Scope:**
- enable/disable capability toggles
- show risk class per capability
- allow basic scope choice

**Dependencies:** HW-035

**Acceptance criteria:**
- user can enable one capability and leave others off
- scope selections persist

**Suggested owner:** frontend/full-stack

### HW-038 — Add extension health state UI
**Goal:** Make setup problems easy to understand.

**Scope:**
- health badge component
- states: healthy, needs configuration, auth expired, incompatible, test failed, disabled by policy

**Dependencies:** HW-033

**Acceptance criteria:**
- all known health states render consistently in list and detail views

**Suggested owner:** frontend

### HW-039 — Add E2E for add/configure/test MCP flow
**Goal:** Protect the core extension path.

**Scope:**
- add MCP server
- configure it
- test connection
- enable one capability

**Dependencies:** HW-036, HW-037

**Acceptance criteria:**
- Playwright MCP management flow passes

**Suggested owner:** QA/full-stack

## Sprint 6 Exit Criteria
- users can add and manage MCP/extension integrations without CLI

---

# Sprint 7: Memory, Profiles, and Safety Controls

## Sprint Goal
Make profile isolation, memory editing, and safety policies concrete and usable.

## Tickets

### HW-040 — Build Memory page and tab structure
**Goal:** Create the memory management area.

**Scope:**
- Memory route
- tabs for User Memory, Agent Memory, Session Search, Context Inspector

**Dependencies:** HW-005

**Acceptance criteria:**
- memory page renders and tabs switch correctly

**Suggested owner:** frontend

### HW-041 — Implement user memory and agent memory editors
**Goal:** Let users view and edit prompt memory safely.

**Scope:**
- memory editor component
- save flow
- next-session vs current-session warning copy

**Dependencies:** HW-040

**Acceptance criteria:**
- user can edit and save memory
- UI explains effect timing clearly

**Suggested owner:** frontend/full-stack

### HW-042 — Implement session-search panel within Memory
**Goal:** Separate searchable history from prompt memory.

**Scope:**
- debounced search
- searchable results
- link back to matching session

**Dependencies:** HW-040

**Acceptance criteria:**
- user can search prior conversations from Memory page

**Suggested owner:** frontend

### HW-043 — Implement context inspector
**Goal:** Show active profile, loaded memory, model, and session context clearly.

**Scope:**
- context inspector panel
- backend integration for current context payload

**Dependencies:** HW-040

**Acceptance criteria:**
- context inspector shows current session/profile state accurately

**Suggested owner:** full-stack

### HW-044 — Build Profiles page and global profile switcher
**Goal:** Make profile isolation visible everywhere.

**Scope:**
- Profiles route
- profile cards
- global switcher in app shell/header
- active profile summary

**Dependencies:** HW-005

**Acceptance criteria:**
- switching profile updates scoped app data
- active profile is always visible in UI

**Suggested owner:** frontend

### HW-045 — Implement create/clone/delete profile actions
**Goal:** Complete profile lifecycle basics.

**Scope:**
- create profile dialog
- clone profile action
- delete confirmation

**Dependencies:** HW-044

**Acceptance criteria:**
- user can create, clone, and delete profiles
- safe confirmations exist for destructive actions

**Suggested owner:** full-stack

### HW-046 — Implement policy preset selector and badges
**Goal:** Expose safety posture in a clear user-facing way.

**Scope:**
- Safe Chat, Research, Builder, Full Power presets
- selector UI
- policy badge in header/chat settings

**Dependencies:** HW-020

**Acceptance criteria:**
- user can change policy preset
- active preset is visible in chat header/settings

**Suggested owner:** frontend/full-stack

### HW-047 — Add audit log view for approvals and config changes
**Goal:** Improve trust and traceability.

**Scope:**
- audit log list page or settings section
- events for approvals, extension changes, skill changes, profile/policy changes

**Dependencies:** HW-023, HW-029, HW-036, HW-045, HW-046

**Acceptance criteria:**
- recent security-relevant and config events are visible in audit view

**Suggested owner:** full-stack

### HW-048 — Add E2E for memory/profile flows
**Goal:** Prevent regressions in context and isolation behavior.

**Scope:**
- edit memory
- switch profile
- verify scoped data changes

**Dependencies:** HW-041, HW-044, HW-045

**Acceptance criteria:**
- Playwright memory/profile flow passes

**Suggested owner:** QA/full-stack

## Sprint 7 Exit Criteria
- memory is editable
- profiles are manageable
- policy presets are visible and functional
- audit visibility exists

---

# Sprint 8: Attachments, Voice, Responsive Polish, and MVP Hardening

## Sprint Goal
Finish the MVP by hardening usability, responsiveness, and critical non-chat features.

## Tickets

### HW-049 — Implement attachment flow in composer
**Goal:** Support file upload and attachment metadata in chat.

**Scope:**
- drag/drop area
- attachment chips
- upload route or proxy
- send message with attachment refs

**Dependencies:** HW-013

**Acceptance criteria:**
- user can attach a file and send it with a message
- uploaded attachments are visible in UI before send

**Suggested owner:** frontend/full-stack

### HW-050 — Implement voice input and TTS controls
**Goal:** Support speech interaction for convenience and accessibility.

**Scope:**
- mic button
- browser recording flow
- TTS button on assistant messages
- fallback/error states

**Dependencies:** HW-011

**Acceptance criteria:**
- voice recording can be triggered on supported browsers
- TTS control appears and works where backend supports it

**Suggested owner:** frontend/full-stack

### HW-051 — Improve mobile navigation and right-drawer behavior
**Goal:** Make the app feel deliberate on smaller screens.

**Scope:**
- sidebar slide-over
- right drawer bottom sheet/full-screen behavior
- composer fixed positioning and spacing

**Dependencies:** HW-005 and all major route screens

**Acceptance criteria:**
- core routes are usable on mobile viewport
- transcript and composer remain comfortable to use

**Suggested owner:** frontend

### HW-052 — Standardize loading, empty, and error states across app
**Goal:** Make every feature area feel finished.

**Scope:**
- feedback components
- empty-state copy
- error retry affordances
- loading placeholders

**Dependencies:** all feature routes

**Acceptance criteria:**
- each major page has polished empty/loading/error states

**Suggested owner:** frontend

### HW-053 — Add telemetry hooks and operational diagnostics
**Goal:** Improve alpha/beta observability.

**Scope:**
- track stream failures
- track approval outcomes
- track extension test failures
- track page-level load failures

**Dependencies:** core features complete

**Acceptance criteria:**
- telemetry events fire from critical flows
- operational logs are reviewable in development

**Suggested owner:** platform/full-stack

### HW-054 — Complete critical E2E suite and alpha release checklist
**Goal:** Prepare MVP for real users.

**Scope:**
- first chat
- session resume/search/fork
- approval flow
- skill flow
- MCP flow
- memory flow
- profile flow
- docs for deployment and alpha release checklist

**Dependencies:** all MVP features

**Acceptance criteria:**
- full critical path E2E suite passes
- deployment notes and alpha checklist exist

**Suggested owner:** QA/full-stack

## Sprint 8 Exit Criteria
- MVP is mobile-usable
- attachments and voice exist
- critical paths are tested
- alpha release checklist is complete

---

# Post-MVP Backlog Sprints

These are not required for MVP but should be staged after alpha feedback.

## Sprint 9+: Beta Depth
Potential tickets:
- richer branch visualization for forked sessions
- project/folder organization for sessions
- command palette
- background task run states
- richer artifact diff viewers
- extension update notifications and changelogs
- profile export/import

## Sprint 10+: Team/Admin
Potential tickets:
- multi-user auth providers
- RBAC
- org policy editor
- allowlist/blocklist for extensions
- approval requests workflow
- secrets management UX
- richer audit filters and analytics

## Sprint 11+: Marketplace/Ecosystem
Potential tickets:
- discoverable skill catalog
- extension marketplace
- verified publisher badges
- signature/review pipeline
- version channels and rollback UI
- recommended extensions/skills

---

# Suggested Sprint Ownership Summary

## Frontend-heavy tickets
- HW-002, 005, 006, 010, 011, 012, 016, 017, 019, 020, 021, 022, 024, 025, 027, 028, 030, 033, 035, 038, 040, 042, 044, 046, 049, 050, 051, 052

## Full-stack/platform-heavy tickets
- HW-003, 004, 007, 008, 009, 013, 014, 015, 018, 023, 026, 029, 031, 032, 034, 036, 037, 039, 041, 043, 045, 047, 048, 053, 054

---

# MVP Release Gate

MVP can be called ready when all of the following are true:
- user can authenticate and access app shell
- user can create, search, manage, and fork chat sessions
- user can stream a response and inspect tool cards
- risky actions can be approved in UI
- skill install/edit/load works
- MCP server add/configure/test/scope works
- memory can be edited with clear context messaging
- profiles can be switched and managed
- policy preset is visible and functional
- mobile core flows work
- critical E2E suite passes

---

# Recommended Immediate Execution Start

Start Sprint 1 immediately with HW-001 through HW-009.

If you want a fast proof-of-concept path, do these first in order:
1. HW-001
2. HW-002
3. HW-005
4. HW-007
5. HW-008
6. HW-010
7. HW-011
8. HW-013
9. HW-014
10. HW-015

That sequence gives you the fastest visible vertical slice.