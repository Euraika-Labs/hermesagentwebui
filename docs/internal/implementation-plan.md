# Pan Implementation Plan

## Goal
Turn the current Next.js Pan app into a beautiful, first-party-feeling Hermes WebUI: premium chat UX, real runtime transparency, robust skills/integrations management, and an operator-grade settings surface.

## Delivery Strategy
Build in layers:
1. tighten the design system and shell
2. make chat feel premium and operationally honest
3. unify skills/integrations scope and trust models
4. deepen runtime-backed data and diagnostics
5. harden quality, performance, and mobile behavior

This plan assumes the existing app at `/opt/projects/pan-ui` remains the base.

## Current App Baseline
Existing route structure already covers most of the product surface:
- `/chat`
- `/skills`
- `/skills/[id]`
- `/extensions`
- `/extensions/[id]`
- `/memory`
- `/profiles`
- `/settings`
- operator routes under `/settings/*`

Existing feature areas already present in the codebase:
- chat
- sessions
- skills
- extensions
- memory
- profiles
- settings/runtime browsers

This is good news: the main work is refinement, real-runtime deepening, and consistency, not greenfield product invention.

## Product Priorities
Priority order:
1. Chat and session experience
2. Runtime activity and approvals visibility
3. Skills and integrations trust/scope model
4. Profile-scoped runtime consistency
5. Diagnostics and operator tooling
6. Memory clarity and honesty
7. Mobile polish and performance

## Architectural Direction
### Frontend
Keep:
- Next.js App Router
- TypeScript
- Tailwind
- TanStack Query
- Zustand

Recommended additions or stronger usage:
- a more explicit design-token layer for spacing, surfaces, status colors, and panel behavior
- shared page-shell primitives for list/detail/action layouts
- shared empty/error/state components for consistency

### Server / control plane
Continue using server routes and server-side adapters as the Hermes bridge.

Recommended adapter modules if not yet fully centralized:
- `src/server/core/python-exec.ts`
- `src/server/core/cli.ts`
- `src/server/core/sqlite.ts`
- `src/server/core/yaml.ts`
- `src/server/core/db-bootstrap.ts`

These should centralize:
- subprocess execution
- SQLite reads/writes
- YAML config parsing/writing
- shared bridge errors
- runtime DB bootstrap/migrations

### Runtime data model
Treat Hermes runtime as the source of truth for:
- sessions and messages
- profiles
- config
- memory files
- skills on disk
- MCP/plugin config

Treat app-owned stores as the source of truth for UI-native operator surfaces:
- runtime event timeline
- approvals queue/history where needed
- artifact registry
- telemetry events
- MCP probe cache/results
- audit stream

### App-owned durable storage
Recommended files:
- `.data/runtime.db`
- `.data/audit.db`
- `.data/uploads/`

Recommended runtime tables:
- `runs`
- `tool_events`
- `artifacts`
- `approvals`
- `telemetry_events`
- `mcp_probe_results`

Recommended audit tables:
- `audit_events`

## Workstreams

## Workstream 1: Design system and shell refinement
### Objective
Make the app feel premium and consistent before adding more logic.

### Tasks
- establish design tokens for:
  - spacing
  - panel elevation
  - border styles
  - semantic status colors
  - typography scale
- standardize shell layout primitives:
  - left rail
  - top bar
  - page header
  - right rail/detail inspector
- create shared UI states:
  - loading
  - empty
  - error
  - success
  - approval-needed
- normalize card patterns across skills, integrations, profiles, and settings browsers
- standardize action hierarchy:
  - primary
  - secondary
  - destructive
  - passive text actions

### Likely files
- `src/components/layout/*`
- shared UI primitive directories
- topbar/sidebar/app-shell
- feature card components across `src/features/*/components`

### Done when
- every main screen shares a clear visual grammar
- dark mode and light mode both look intentional
- no screen feels like a different product

## Workstream 2: Premium chat and session experience
### Objective
Make `/chat` the strongest surface in the product.

### Tasks
- refine chat page hierarchy:
  - cleaner header
  - calmer transcript spacing
  - stronger message typography
- improve session sidebar with:
  - pinned/recent/archived grouping
  - better branch indicators
  - stronger active state
  - search UX polish
- add compact inline runtime progress strip during active runs
- improve event rendering so tool steps are compact and expandable, not noisy
- ensure the right rail is useful by default with tabs:
  - Context
  - Activity
  - Tools
  - Output
  - Session
- tighten composer ergonomics:
  - default-simple controls
  - expandable advanced controls
  - visible loaded-skills state
  - better attachment affordances
- polish approval cards and error cards in transcript

### Likely files
- `src/features/chat/components/chat-screen.tsx`
- message/tool/approval/artifact components under `src/features/chat/components`
- `src/features/sessions/components/*`
- `src/features/settings/components/chat-settings-sheet.tsx`
- layout components for right rail behavior

### Done when
- chat feels premium even before deep operator features are opened
- users can tell what Hermes is doing without reading raw internals
- the transcript remains readable during tool-heavy runs

## Workstream 3: Scope and trust model for skills and integrations
### Objective
Make skills and integrations understandable and safe.

### Tasks
- standardize shared vocabulary in UI:
  - installed
  - enabled globally
  - enabled in profile
  - loaded in session
  - approval-gated
  - disabled by policy
- redesign skill cards/detail views around provenance, scope, and session state
- redesign integration cards/detail views around trust, risk, health, and configuration
- add explicit trust badges:
  - Official
  - Verified
  - Curated
  - Community
  - Local
- add human-readable risk summaries:
  - reads files
  - writes files
  - network access
  - shell/subprocess use
  - credentials required
- surface current session load state clearly on skills/integration screens
- deepen MCP-specific diagnostics and selective tool exposure UX

### Likely files
- `src/features/skills/components/*`
- `src/features/extensions/components/*`
- schemas/types under `src/lib/types` and `src/lib/schemas`
- API hooks under `src/features/skills/api` and `src/features/extensions/api`

### Done when
- users can understand capability state without guessing
- skill and integration detail pages explain what will happen before the user enables anything
- scope is visible everywhere it matters

## Workstream 4: Runtime-backed data deepening
### Objective
Move more UI surfaces from mock-feeling state to honest Hermes-backed runtime state.

### Tasks
- strengthen server-side runtime status endpoint and profile normalization
- ensure session metadata and loaded-skill state read from real profile-scoped runtime where possible
- keep skills list sourced from actual skill roots with proper provenance labeling
- keep integrations sourced from config/runtime probe state with graceful degradation
- use app-owned `runtime.db` for:
  - run timeline
  - approvals history
  - artifact registry
  - telemetry
  - MCP probe cache
- normalize event contracts from streaming responses into durable runtime events

### Likely files
- `src/server/**`
- runtime API routes under `src/app/api/**` if present
- adapters and storage helpers
- hooks using runtime data in settings/chat

### Done when
- the UI feels truthful about Hermes runtime state
- diagnostic/operator pages are useful without devtools
- failures degrade clearly rather than silently falling back to fake success

## Workstream 5: Profiles and memory clarity
### Objective
Make profile scope and memory semantics obvious and trustworthy.

### Tasks
- improve profile switcher visibility in top bar and page headers
- make profile switching trigger full requery and visible context refresh
- redesign profiles screen around summary cards plus selected-profile detail
- clarify memory page separation between:
  - User memory
  - Agent memory
  - Session search
  - Context inspector
- add explicit save flows on memory page:
  - Save
  - Save and start new session
  - Save and fork fresh session
- explain next-session semantics prominently whenever memory is edited

### Likely files
- `src/features/profiles/components/*`
- `src/features/memory/components/*`
- relevant hooks and state store files
- shell/topbar components showing active profile

### Done when
- profile changes are never subtle or confusing
- users do not mistake memory for searchable history
- memory editing never implies false real-time effect on the current session

## Workstream 6: Operator surfaces and diagnostics polish
### Objective
Turn the settings area into an operator-grade cockpit rather than a link dump.

### Tasks
- standardize browser pages for:
  - audit
  - approvals
  - artifacts
  - runs
  - MCP diagnostics
  - runtime health
  - telemetry
- add shared list/detail/filter/export patterns across these pages
- ensure every operator screen can answer:
  - what happened
  - when it happened
  - what object was affected
  - what the user should do next
- deepen run detail pages with timeline/event drilldown
- improve runtime health with explicit readiness checks and remediation hints

### Likely files
- `src/features/settings/components/*`
- settings route pages under `src/app/settings/**`

### Done when
- operational pages feel cohesive
- power users can troubleshoot from the UI instead of the terminal for common issues

## Workstream 7: Mobile, accessibility, and performance hardening
### Objective
Make the product robust, not just attractive.

### Tasks
- verify all core flows on mobile widths:
  - login
  - first chat
  - session switch
  - skill load
  - MCP add/test
  - approval handling
- improve keyboard navigation and semantic labels
- tighten focus states and contrast
- reduce expensive rerenders in chat and settings browsers
- optimize SSE/event rendering paths
- ensure side panels degrade gracefully to sheets on narrow screens

### Done when
- core flows pass mobile e2e coverage
- app remains smooth in long transcripts and heavy event views
- accessibility issues are materially reduced

## Milestone Plan

## Milestone 1: Visual shell and chat polish
Deliver:
- refined app shell and top bar
- unified visual tokens
- cleaner chat transcript and composer
- better session sidebar
- right rail tab structure

Exit criteria:
- `/chat` feels premium and consistent with the rest of the app
- major empty/loading/error states are standardized

## Milestone 2: Runtime transparency and approvals
Deliver:
- compact runtime progress strip
- stronger tool event rendering
- improved approval cards and approvals browser
- run/event persistence improvements where needed

Exit criteria:
- users can see what Hermes is doing and why a risky action is blocked

## Milestone 3: Skills and integrations overhaul
Deliver:
- provenance/scope redesign for skills
- trust/risk redesign for integrations
- stronger MCP-specific diagnostics and capability controls
- clearer session-loaded state across pages

Exit criteria:
- users can install/enable/load capabilities with minimal ambiguity

## Milestone 4: Profiles, memory, and runtime-backed consistency
Deliver:
- improved profile switcher and profile summary UX
- redesigned memory screen with explicit semantics
- more honest runtime-backed state across pages

Exit criteria:
- profile scope and memory behavior are obvious to a new user

## Milestone 5: Operator cockpit and quality hardening
Deliver:
- cohesive settings browsers
- stronger health/telemetry/runs/audit experiences
- mobile and accessibility polish
- performance cleanup

Exit criteria:
- the app is credible as a self-hosted alpha or release candidate

## Testing Strategy
### Unit and component tests
Add or expand tests for:
- scope-state label formatting
- permission/risk badge logic
- session metadata rendering
- right rail tab behavior
- profile switching state propagation
- memory action semantics and warnings

### Integration tests
Cover:
- runtime status loading
- skill inspect/edit/load flow
- extension add/test/configure flow
- profile switch and data requery
- memory save and next-session guidance
- run detail and approvals visibility

### E2E tests
Priority journeys:
1. first chat with approval flow
2. search, rename, fork, archive session
3. inspect skill, edit local skill, load into session
4. add MCP server and inspect diagnostics
5. switch profile and verify scoped data refresh
6. edit memory and start a fresh session
7. mobile chat and approvals flow

## Sequencing Recommendation
Build in this order:
1. chat shell polish
2. runtime activity/approval clarity
3. skills/integrations trust-and-scope unification
4. profile/memory refinement
5. settings cockpit polish
6. final mobile/perf/accessibility hardening

This order maximizes perceived product quality early while reducing the risk of building polished screens on top of unclear state models.

## Recommended Immediate Next Steps
1. Turn this plan into issue-sized tasks by milestone and feature area.
2. Create low-fidelity wireframes directly against the existing route set.
3. Refactor the shell and shared state components before adding more bespoke UI.
4. Define a normalized runtime event model used by chat, runs, approvals, and artifacts.
5. Standardize scope/trust/risk labels in shared types and UI primitives before further feature work.