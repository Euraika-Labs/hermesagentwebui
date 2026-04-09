# Pan WebUI UX Roadmap (v0.7 direction)

Status: draft
Date: 2026-04-09
Owner: product / design / frontend

Goal
Turn Pan from a capable power-user dashboard into a clearer, calmer, more compelling AI workspace without losing technical depth.

Product thesis
Pan already proves capability. The next step is not adding more features first; it is reducing UI friction, improving hierarchy, clarifying states, and making discovery and conversation flow feel intentional.

Success criteria
- New users understand what Pan is, what they can do next, and what the current state means within 10 seconds.
- Core tasks (start a chat, find a session, discover a skill/plugin/MCP server, inspect runtime state) require fewer decisions and less scanning.
- Empty, loading, degraded, and error states are visually distinct.
- Power-user depth remains available, but secondary details move behind clearer progressive disclosure.

---

## North-star design principles

1. Chat-first, inspector-second
- The main task is conversation and agent execution.
- Runtime metadata should support the conversation, not dominate it.

2. State clarity over cleverness
- Users should always know whether the screen is loading, empty, degraded, or ready.
- Zero counts should never be ambiguous.

3. One concept, one name
- Use consistent language for skills, plugins, integrations, MCP servers, tools, approvals, and profiles.
- Avoid internal jargon where plain language works.

4. Fewer boxes, stronger hierarchy
- Reduce visual fragmentation caused by too many cards, borders, chips, and stacked controls.
- Use spacing and typography before adding more containers.

5. Progressive disclosure for power features
- Keep advanced details available, but not always loud.
- Drawers, inspectors, accordions, and detail panels should earn their visual weight.

---

## Problem areas observed

1. Main chat workspace is metadata-heavy
- The empty-state chat view feels like a control panel instead of a conversation starter.
- Too many chips and stats compete with the composer.

2. Marketplace feels filter-heavy and content-light
- It reads more like inventory/settings than discovery.
- Discoverability is weaker than it should be for a marketplace surface.

3. Integrations page has weak state clarity
- Loading, empty, degraded, and filtered states blur together.
- Terminology is too technical and overlapping.

4. Navigation scope is muddy
- Sidebar sections, top actions, page tabs, and runtime controls overlap in function and visual weight.

5. Session list is useful but visually busy
- Rows carry too many badges and secondary details.
- Selected state and scanning hierarchy can improve.

6. Login lacks trust and polish
- Strong enough for internal/admin use, but not yet fully product-grade.

---

## Roadmap overview

### Phase 1 — UX Foundations and State Clarity
Target: v0.7.0-alpha
Priority: P0

Goals
- Make core states explicit and consistent.
- Establish a calmer hierarchy in shell/header/sidebar/common patterns.

Deliverables
- Shared screen-state patterns:
  - loading
  - empty
  - degraded
  - error
  - success/ready
- Global terminology cleanup
- Badge/chip usage rules
- Reduced card/border density in shared layouts
- More disciplined top-bar and page-header hierarchy

Acceptance criteria
- No major screen uses plain text like “Loading…” as the only loading treatment.
- No “0” dashboard state appears without explanatory empty-state copy and next actions.
- Shared terminology list is applied across chat, marketplace, and integrations.

### Phase 2 — Chat-first Workspace Redesign
Target: v0.7.0-beta
Priority: P0

Goals
- Make chat the visual and interaction center of the product.
- Move technical metadata into a better inspector pattern.

Deliverables
- Redesigned empty-state chat workspace
- Simplified chat header with stronger conversation focus
- Composer-first interaction hierarchy
- Right drawer reduced to a clearer inspector model
- More intentional runtime/context/skill summaries

Acceptance criteria
- A first-time user can identify the prompt entry path immediately.
- Chat header shows only the most important context inline.
- Empty conversation state includes suggested next actions.

### Phase 3 — Marketplace and Discovery Redesign
Target: v0.7.1
Priority: P1

Goals
- Make Marketplace feel like a true discovery surface, not a filter sheet.
- Increase confidence and usefulness in skill/plugin/MCP browsing.

Deliverables
- Discover-first marketplace default
- Featured/recommended/trending sections
- Stronger result cards with trust and install metadata
- Reduced nested control stack
- Better empty and no-results states
- Clear distinction between global marketplace search and local section filtering

Acceptance criteria
- Users see meaningful content above the fold.
- Marketplace supports both discovery and installed inventory, without mixing the two awkwardly.
- MCP/plugin/skill cards provide enough trust/metadata to support selection.

### Phase 4 — Integrations and Plugin Information Architecture Cleanup
Target: v0.7.1
Priority: P1

Goals
- Reduce confusion across Integrations, Plugins, MCP Servers, Tools, Approvals, and Diagnostics.
- Make this area understandable without internal platform knowledge.

Deliverables
- Simplified naming and copy
- Better grouping of tabs/subsections
- Strong empty-state flow for no integrations installed
- Clear separation between current context, installed assets, and available tools
- Better explanations for session-scoped vs profile-scoped vs global visibility

Acceptance criteria
- Integrations page can answer quickly:
  - what is installed?
  - what is available now?
  - what is blocked/degraded?
  - what should I do next?

### Phase 5 — Session Management and Navigation Polish
Target: v0.7.2
Priority: P2

Goals
- Improve scanning, reduce noise, and sharpen selection states.

Deliverables
- Session row redesign
- Improved selected states
- Better use of preview text and metadata priority
- Reduced visible badge clutter
- Compact mode exploration for power users
- Navigation grouping review for sidebar

Acceptance criteria
- Session list becomes faster to scan.
- Sidebar remains informative but less vertically heavy.

### Phase 6 — Trust, Onboarding, and Product Polish
Target: v0.8.0
Priority: P2

Goals
- Improve first-run clarity and product trust.

Deliverables
- Login polish pass
- Forgot password / password visibility patterns as appropriate
- Stronger brand hierarchy on auth and shell surfaces
- Contextual help/tooltips for advanced concepts
- First-run guidance for marketplace / skills / plugins / MCP concepts

Acceptance criteria
- New users can understand Pan’s major product concepts without external explanation.
- Login/auth screens feel less like an internal tool and more like a product.

---

## Priority backlog by impact

### P0
- Chat-first layout and empty-state redesign
- Explicit screen-state system (loading / empty / degraded / error)
- Terminology cleanup across top screens
- Header/sidebar hierarchy simplification

### P1
- Marketplace discovery redesign
- Integrations IA cleanup
- Better trust metadata on cards and installs
- Reduced duplicate navigation/control surfaces

### P2
- Session row redesign
- Compact mode for power users
- Login trust/polish pass
- Tooltips/onboarding/help system

### P3
- Personalization and recommendations in marketplace
- Saved views / layout preferences
- More advanced visualizations of runtime/tool state

---

## Risks

1. Overcorrecting toward simplicity
- Risk: removing too much depth and frustrating advanced users
- Mitigation: use progressive disclosure, not feature removal

2. Inconsistent terminology during transition
- Risk: old and new wording coexist and create more confusion
- Mitigation: define and enforce a canonical terminology map early

3. UI-only redesign without verification
- Risk: visual cleanup that does not actually improve flow
- Mitigation: validate each phase with real usage scenarios and browser/Docker smoke checks

4. Scope creep into full design-system rewrite
- Risk: too much foundational work before user-facing gains
- Mitigation: prioritize high-signal screens first

---

## Recommended versioning strategy

- v0.7.0
  - UX foundations
  - chat-first redesign
- v0.7.1
  - marketplace + integrations redesign
- v0.7.2
  - session/sidebar/navigation polish
- v0.8.0
  - onboarding, trust, and product polish

---

## Definition of done for the UX overhaul

A phase is done only when:
- implementation ships
- copy is updated
- loading/empty/error/degraded states are covered
- browser-level smoke checks are re-run
- docs/screenshots are updated where relevant
