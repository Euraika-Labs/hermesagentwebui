# Pan WebUI UX — GitHub Issue Drafts (Wave 1)

Use these as issue bodies for the first execution wave.

---

## Issue 1
Title: UX foundations: create canonical terminology map for Pan surfaces
Labels: ux, product, documentation, webui

Body:
Goal
Standardize Pan’s product language before broader UX refactors land.

Problem
The UI currently mixes overlapping or overly technical terms such as integrations, plugins, MCP servers, tools, callable tools, loading semantics, and profile context. This creates avoidable cognitive load.

Scope
- create a canonical terminology doc
- define approved labels for top-level concepts
- identify terms to phase out
- use the terminology map as the reference for later UI copy changes

Files
- docs/internal/webui-ux-terminology.md

Acceptance criteria
- one canonical term per concept
- discouraged terms documented
- map is ready to drive UI copy cleanup in later issues

---

## Issue 2
Title: UX foundations: add shared loading, empty, degraded, and error state components
Labels: ux, frontend, design-system, webui

Body:
Goal
Stop each screen from inventing ad-hoc state handling.

Problem
Pan currently uses inconsistent loading and empty-state treatments. Some screens rely on plain text like “Loading…” or ambiguous zero-count dashboards.

Scope
- create reusable state components for loading, empty, degraded, and error
- support icon, title, description, and CTA slots
- wire them into at least chat, marketplace, and integrations

Files
- src/components/feedback/loading-state.tsx
- src/components/feedback/empty-state.tsx
- src/components/feedback/degraded-state.tsx
- src/components/feedback/error-state.tsx

Acceptance criteria
- no major screen uses plain text as its only loading UX
- chat, marketplace, and integrations use the shared patterns

---

## Issue 3
Title: UX foundations: reduce shell noise in sidebar and right drawer
Labels: ux, frontend, layout, webui

Body:
Goal
Make the app shell calmer and easier to scan.

Problem
The shell currently feels too card-heavy and visually noisy. Sidebar descriptions, inspector cards, and border density compete with the main task flow.

Scope
- reduce border/card density
- tighten spacing in sidebar header/footer blocks
- lower the visual weight of sidebar descriptions
- make the right drawer feel like an inspector instead of a second dashboard

Files
- src/components/layout/sidebar.tsx
- src/components/layout/right-drawer.tsx
- src/styles/globals.css

Acceptance criteria
- shell feels lighter without losing functionality
- desktop and mobile behavior still works

---

## Issue 4
Title: UX foundations: rationalize badge and chip usage on chat and session surfaces
Labels: ux, frontend, chat, sessions, webui

Body:
Goal
Reduce status-badge overload on the most frequently used screens.

Problem
Badges and chips currently carry too much visual weight, especially in chat headers and session rows, which weakens hierarchy and scanability.

Scope
- define practical badge usage rules
- remove low-value inline chips from primary surfaces
- keep only the most important session/runtime statuses visible by default

Files
- src/features/chat/components/chat-header.tsx
- src/features/sessions/components/session-sidebar.tsx
- docs/internal/webui-ux-terminology.md

Acceptance criteria
- fewer inline chips on core surfaces
- title, preview, and primary task remain easier to scan
