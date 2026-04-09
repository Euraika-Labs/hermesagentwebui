# Pan WebUI UX Sprint Backlog

> For Hermes: Use subagent-driven-development skill to execute these tickets sprint-by-sprint.

Planning assumptions
- 2-week sprints
- 1 frontend engineer
- 1 full-stack/product engineer
- optional design review support
- story points use a Fibonacci-lite scale: 1, 2, 3, 5, 8

Backlog goals
- reduce UI friction
- make state handling explicit
- shift the experience toward chat-first usage
- improve marketplace discovery
- simplify integrations/plugins/MCP mental model
- increase product trust and polish

---

## Sprint UX-1 — Foundations and State Clarity

Sprint goal
Establish the UX primitives and shared language needed to stop each screen from solving hierarchy, loading, empty states, and degraded states differently.

### UX-001 — Create canonical terminology map
Points: 2
Priority: P0

Goal
Standardize the product language used across chat, marketplace, integrations, plugins, MCP, memory, and profiles.

Scope
- define canonical terms
- define discouraged/internal-only terms
- map old wording to replacement wording
- apply the map to top-level screens first

Files
- `docs/internal/webui-ux-terminology.md`
- top-level screen copy files later

Acceptance criteria
- one canonical term per concept
- screen titles and top-level labels align with the map
- “callable tools”, “current loading semantics”, and similar internal phrases are replaced or wrapped in clearer language

Suggested owner
product + frontend

### UX-002 — Build shared screen-state components
Points: 5
Priority: P0

Goal
Create reusable loading, empty, degraded, and error state components.

Scope
- loading-state component
- empty-state component
- degraded-state component
- error-state component
- support icon, title, body, CTA area

Files
- `src/components/feedback/loading-state.tsx`
- `src/components/feedback/empty-state.tsx`
- `src/components/feedback/degraded-state.tsx`
- `src/components/feedback/error-state.tsx`

Acceptance criteria
- no major screen relies on raw “Loading…” text as its only loading UX
- shared state components are used by at least chat, marketplace, and integrations

Suggested owner
frontend

### UX-003 — Reduce shell noise in sidebar and right drawer
Points: 5
Priority: P0

Goal
Reduce visual clutter in the app shell.

Scope
- reduce border/card density
- tighten spacing
- reduce visual weight of sidebar descriptions
- make right drawer feel more like an inspector than a second dashboard

Files
- `src/components/layout/sidebar.tsx`
- `src/components/layout/right-drawer.tsx`
- `src/styles/globals.css`

Acceptance criteria
- shell looks lighter and easier to scan
- right drawer remains useful without feeling overbuilt
- no regressions on desktop/mobile shell behavior

Suggested owner
frontend

### UX-004 — Define badge/chip usage rules and apply them to high-traffic screens
Points: 3
Priority: P0

Goal
Stop status badges from overwhelming the UI.

Scope
- define where chips are allowed
- reduce duplicate status chips in chat header and session list
- keep only the highest-value inline statuses visible by default

Files
- `docs/internal/webui-ux-terminology.md`
- `src/features/chat/components/chat-header.tsx`
- `src/features/sessions/components/session-sidebar.tsx`

Acceptance criteria
- fewer chips on primary surfaces
- status remains understandable without constant badge overload

Suggested owner
frontend

---

## Sprint UX-2 — Chat-first Workspace Redesign

Sprint goal
Make the chat workspace feel like a conversation-first product instead of a runtime dashboard with a text box.

### UX-005 — Redesign the empty chat state
Points: 5
Priority: P0

Goal
Make starting a new conversation obvious and inviting.

Scope
- redesign empty-state content
- add suggested prompts/actions
- make composer more central
- reduce metadata dominance above the fold

Files
- `src/features/chat/components/chat-screen.tsx`
- `src/features/chat/components/chat-header.tsx`
- `src/features/chat/components/chat-composer.tsx`

Acceptance criteria
- a new user can identify the main next action immediately
- empty state feels like a conversation start, not a system dashboard

Suggested owner
frontend + product

### UX-006 — Simplify chat header hierarchy
Points: 3
Priority: P0

Goal
Show only the most important session/runtime facts inline.

Scope
- prioritize conversation title and save state
- demote secondary metadata
- improve title treatment and machine-like copy

Files
- `src/features/chat/components/chat-header.tsx`

Acceptance criteria
- title is visually primary
- runtime/context metadata is still available but no longer dominates

Suggested owner
frontend

### UX-007 — Rework right drawer tabs into a clearer inspector model
Points: 5
Priority: P0

Goal
Make the right drawer a useful detail inspector instead of a second mini-dashboard.

Scope
- improve default tab behavior
- reduce card proliferation
- improve empty states within drawer tabs
- reorganize run overview, tool timeline, context, output, session info

Files
- `src/components/layout/right-drawer.tsx`

Acceptance criteria
- drawer is faster to scan
- users can find context/activity/tools/output more easily

Suggested owner
frontend

### UX-008 — Improve composer affordances and advanced controls hierarchy
Points: 3
Priority: P1

Goal
Keep the composer powerful but calm.

Scope
- demote advanced content when not needed
- reduce non-essential visual weight around send area
- improve spacing and hierarchy around attachments, mic, chips, and advanced section

Files
- `src/features/chat/components/chat-composer.tsx`

Acceptance criteria
- send flow feels visually primary
- advanced controls remain available without crowding the composer

Suggested owner
frontend

---

## Sprint UX-3 — Marketplace Discovery Redesign

Sprint goal
Turn Marketplace into a real discovery surface instead of a dense filtering shell.

### UX-009 — Make Discover the default Marketplace mode
Points: 3
Priority: P1

Goal
Ensure `/marketplace` opens into discovery, not installed inventory.

Scope
- change default state
- rework initial layout for content-first discovery

Files
- `src/features/marketplace/marketplace-screen.tsx`

Acceptance criteria
- page feels discovery-first on first load

Suggested owner
frontend

### UX-010 — Add featured, recommended, and trending content blocks
Points: 8
Priority: P1

Goal
Make the marketplace feel alive and useful immediately.

Scope
- featured skills
- featured MCP servers
- plugin recommendations where possible
- support trust/install metadata in cards

Files
- `src/features/marketplace/marketplace-screen.tsx`
- `src/features/marketplace/components/*`

Acceptance criteria
- useful cards visible above the fold
- page no longer feels sparse in the default state

Suggested owner
frontend + product

### UX-011 — Clarify search scope and remove redundant search behavior
Points: 5
Priority: P1

Goal
Reduce confusion caused by layered searches.

Scope
- make one primary marketplace search
- clarify local filtering behavior
- improve placeholders and search result state feedback

Files
- `src/features/marketplace/marketplace-screen.tsx`
- embedded marketplace sub-screens as needed

Acceptance criteria
- search scope is obvious without explanation

Suggested owner
frontend

### UX-012 — Improve no-results / empty / loading states in marketplace
Points: 3
Priority: P1

Goal
Make result states feel intentional and useful.

Scope
- skeletons
- no-results state
- empty discover state
- empty installed state

Files
- `src/features/marketplace/marketplace-screen.tsx`
- shared state components from UX-002

Acceptance criteria
- no more ambiguous blank/sparse result areas

Suggested owner
frontend

---

## Sprint UX-4 — Integrations / Plugins / MCP Clarity

Sprint goal
Make the integrations area understandable, especially in empty/degraded/runtime-sensitive scenarios.

### UX-013 — Redesign integrations landing state
Points: 5
Priority: P1

Goal
Clarify installed vs available vs scoped vs degraded state.

Scope
- replace ambiguous zero dashboards
- separate context from metrics if needed
- add a real empty-state panel under the active tab

Files
- `src/features/extensions/components/extensions-screen.tsx`

Acceptance criteria
- user can tell whether the page is empty, loading, or degraded
- next action is obvious when nothing is installed

Suggested owner
frontend

### UX-014 — Clarify Integrations vs Plugins vs MCP Servers vs Tools
Points: 5
Priority: P1

Goal
Reduce IA overlap and naming confusion.

Scope
- align page titles
- align sidebar labels/descriptions
- align tab names and descriptions
- apply terminology map to integrations surfaces

Files
- `src/components/layout/sidebar.tsx`
- `src/features/extensions/components/extensions-screen.tsx`
- `src/features/plugins/plugins-screen.tsx`
- `src/features/marketplace/marketplace-screen.tsx`

Acceptance criteria
- the distinction between plugins, MCP servers, and available tools is understandable

Suggested owner
frontend + product

### UX-015 — Improve plugin install validation UX
Points: 3
Priority: P1

Goal
Make plugin install failures feel informative instead of brittle.

Scope
- better validation copy
- help text for plugin requirements
- explain why arbitrary repos fail

Files
- `src/features/plugins/components/install-plugin-dialog.tsx`
- plugin-related empty/error states as needed

Acceptance criteria
- invalid repo flow feels intentional and trustworthy

Suggested owner
frontend

---

## Sprint UX-5 — Sessions, Navigation, and Density Modes

Sprint goal
Make navigation and session management faster to scan for daily use.

### UX-016 — Redesign session rows for scanability
Points: 5
Priority: P2

Goal
Improve the session list’s visual hierarchy.

Scope
- title/preview/time priority
- reduce badge clutter
- improve selected state
- move secondary actions out of the primary row if needed

Files
- `src/features/sessions/components/session-sidebar.tsx`

Acceptance criteria
- session rows are easier to parse quickly

Suggested owner
frontend

### UX-017 — Revisit sidebar density and grouping
Points: 3
Priority: P2

Goal
Reduce the visual height and heaviness of left navigation.

Scope
- improve grouping
- reduce permanent description weight
- explore a denser layout without harming usability

Files
- `src/components/layout/sidebar.tsx`

Acceptance criteria
- sidebar remains informative while taking less visual attention

Suggested owner
frontend

### UX-018 — Add compact mode exploration
Points: 5
Priority: P2

Goal
Support experienced users who want a denser workspace.

Scope
- compact mode toggle or preference
- compact nav and/or session rows
- preserve readability

Files
- `src/components/layout/sidebar.tsx`
- `src/features/sessions/components/session-sidebar.tsx`
- `src/lib/store/ui-store.ts`

Acceptance criteria
- compact mode is usable and clearly optional

Suggested owner
frontend

---

## Sprint UX-6 — Trust, Onboarding, and Product Polish

Sprint goal
Improve first-run comprehension and trust.

### UX-019 — Login polish pass
Points: 3
Priority: P2

Goal
Make the login screen feel more product-grade.

Scope
- stronger CTA wording
- password visibility toggle
- clearer trust cues / support affordances
- remove dev-like impressions where possible

Files
- `src/app/login/page.tsx`
- `src/components/auth/login-form.tsx`

Acceptance criteria
- login feels like a product entry point, not an internal admin form

Suggested owner
frontend

### UX-020 — Add lightweight contextual help
Points: 5
Priority: P2

Goal
Help new users understand Pan concepts without leaving the UI.

Scope
- tooltips and helper text for:
  - skills
  - plugins
  - MCP servers
  - approvals
  - profiles
- avoid a giant tour initially

Files
- relevant screen components in chat / marketplace / integrations / profiles

Acceptance criteria
- first-run users can understand the major concepts with minimal guesswork

Suggested owner
frontend + product

---

## Recommended execution sequence

Wave 1
- UX-001
- UX-002
- UX-003
- UX-004

Wave 2
- UX-005
- UX-006
- UX-007
- UX-008

Wave 3
- UX-009
- UX-010
- UX-011
- UX-012
- UX-013
- UX-014
- UX-015

Wave 4
- UX-016
- UX-017
- UX-018
- UX-019
- UX-020

---

## Estimated roadmap size

Total tickets: 20
Total points: 84

Rough delivery expectation
- Wave 1: 1 sprint
- Wave 2: 1 sprint
- Wave 3: 1–2 sprints
- Wave 4: 1 sprint

Practical expectation
- 4 to 5 sprints total for a proper structural UX overhaul
