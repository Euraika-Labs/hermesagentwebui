# Pan WebUI UX Overhaul Implementation Plan

> For Hermes: Use subagent-driven-development skill to implement this plan task-by-task.

Goal: Improve Pan’s clarity, usability, and visual polish across chat, marketplace, integrations, navigation, and auth without removing advanced runtime capabilities.

Architecture: Use a layered UX refactor. Start with shared layout/state patterns and terminology, then redesign the highest-impact screens (chat, marketplace, integrations), then polish navigation, sessions, and onboarding. Favor progressive disclosure over adding more always-visible UI.

Tech stack: Next.js 15, TypeScript, Tailwind CSS, TanStack Query, Zustand, Playwright, Docker smoke validation.

---

## Workstream A — UX foundations

### Task A1: Define canonical terminology map
Objective: Standardize product language before touching multiple screens.

Files:
- Create: `docs/internal/webui-ux-terminology.md`
- Modify: affected screen copy files later

Plan:
- Define canonical labels for:
  - Chat
  - Session
  - Skill
  - Plugin
  - Integration
  - MCP Server
  - Tool
  - Approval
  - Diagnostics
  - Profile
- Include “avoid using” terms where current wording is too internal.

Verification:
- Review all top-level screen titles and primary labels against the terminology map.

### Task A2: Create shared screen-state patterns
Objective: Stop every screen from inventing its own loading/empty/degraded/error UX.

Files:
- Create: `src/components/feedback/loading-state.tsx`
- Create: `src/components/feedback/empty-state.tsx`
- Create: `src/components/feedback/degraded-state.tsx`
- Create: `src/components/feedback/error-state.tsx`

Plan:
- Define reusable patterns with title, body, CTA slots, and icon support.
- Use these across chat, marketplace, integrations, plugins, memory, and profiles.

Verification:
- Build passes.
- At least one screen per state pattern uses the shared component.

### Task A3: Reduce shell noise in shared layout
Objective: Improve hierarchy at the app-shell level.

Files:
- Modify: `src/components/layout/sidebar.tsx`
- Modify: `src/components/layout/right-drawer.tsx`
- Modify: `src/styles/globals.css`

Plan:
- Reduce border/card density in shell elements.
- Tighten spacing in sidebar header/footer blocks.
- Consider collapsing nav descriptions in some modes or reducing their visual weight.
- Make right drawer feel more like an inspector than a second dashboard.

Verification:
- Browser smoke on login/chat/marketplace/extensions.
- No layout regressions at desktop and mobile widths.

---

## Workstream B — Chat-first workspace redesign

### Task B1: Redesign chat empty state
Objective: Make “new chat” feel actionable instead of metadata-heavy.

Files:
- Modify: `src/features/chat/components/chat-header.tsx`
- Modify: `src/features/chat/components/chat-screen.tsx`
- Modify: `src/features/chat/components/chat-composer.tsx`

Plan:
- Replace the current control-heavy empty state with:
  - clearer title
  - suggested starter actions/prompts
  - stronger composer prominence
  - reduced metadata density above the fold
- Keep advanced session/runtime details available, but secondary.

Verification:
- Browser smoke: login -> new chat -> can immediately identify how to start.

### Task B2: Simplify chat header hierarchy
Objective: Only the most important session/runtime facts should be visible by default.

Files:
- Modify: `src/features/chat/components/chat-header.tsx`

Plan:
- Inline only key facts:
  - conversation title
  - saved/draft/archive state
  - maybe model/runtime/profile summary
- Move secondary stats into expandable detail area or drawer.
- Replace machine-feeling labels where possible.

Verification:
- Compare before/after scanability with screenshots.

### Task B3: Re-scope the right drawer
Objective: Preserve depth while lowering cognitive load.

Files:
- Modify: `src/components/layout/right-drawer.tsx`

Plan:
- Make one default tab clearly useful.
- Reduce number of boxed sections per tab.
- Improve empty states inside drawer tabs.
- Ensure drawer content reflects “inspection” rather than “parallel dashboard.”

Verification:
- Browser smoke after sending a message and after an approval event.

---

## Workstream C — Marketplace redesign

### Task C1: Make Discover the marketplace default
Objective: Marketplace should feel like discovery first, not installed inventory first.

Files:
- Modify: `src/features/marketplace/marketplace-screen.tsx`

Plan:
- Default to Discover-oriented content.
- Keep Installed as a secondary mode.
- Ensure meaningful content appears above the fold.

Verification:
- Open `/marketplace` and confirm the first impression is content-driven, not filter-driven.

### Task C2: Add featured/recommended/trending sections
Objective: Make the marketplace feel alive and useful immediately.

Files:
- Modify: `src/features/marketplace/marketplace-screen.tsx`
- Possibly create: `src/features/marketplace/components/*`

Plan:
- Add featured modules/cards for skills, MCP servers, and plugins.
- Use available metadata to surface recommendations/trending/recently-updated blocks.
- Add stronger trust cues on cards.

Verification:
- Marketplace shows real cards/modules before users scroll into dense filters.

### Task C3: Clarify global vs local search
Objective: Reduce confusion from overlapping search controls.

Files:
- Modify: `src/features/marketplace/marketplace-screen.tsx`
- Review: embedded screens like skills / mcp / plugins

Plan:
- Make one search the primary marketplace search.
- Only show secondary/local filters when useful and clearly scoped.
- Rename placeholders to communicate scope.

Verification:
- Search intent is obvious without reading source code.

---

## Workstream D — Integrations and plugins clarity

### Task D1: Redesign integrations landing state
Objective: Make integrations understandable in loading/empty/degraded cases.

Files:
- Modify: `src/features/extensions/components/extensions-screen.tsx`

Plan:
- Replace ambiguous zero dashboards with explicit state messaging.
- Add proper empty-state content under the selected tab.
- Separate counts from context if needed.
- Rename internal language such as “Current loading semantics” to clearer copy.

Verification:
- In empty/mock state, users understand whether nothing is installed or something is still loading.

### Task D2: Clarify relationship between Integrations, Plugins, MCP Servers, and Tools
Objective: Reduce IA overlap and naming confusion.

Files:
- Modify: sidebar labels/descriptions where needed
- Modify: extensions and plugins page copy
- Modify: marketplace copy where needed

Plan:
- Use the terminology map from A1.
- Ensure the sidebar and page headers do not contradict each other.
- Reduce duplicate navigational concepts where possible.

Verification:
- A new user can explain the difference between Plugins and MCP Servers after browsing the UI.

### Task D3: Improve plugin install UX feedback
Objective: Make plugin install validation understandable and reassuring.

Files:
- Modify: `src/features/plugins/components/install-plugin-dialog.tsx`
- Modify: plugin-related cards/pages as needed

Plan:
- Improve validation/error feedback wording.
- Explain why a non-plugin repo is rejected.
- Consider linking to plugin requirements/help.

Verification:
- Invalid repo flow feels intentional, not broken.

---

## Workstream E — Session/sidebar polish

### Task E1: Simplify session row design
Objective: Improve scanability and reduce badge noise.

Files:
- Modify: `src/features/sessions/components/session-sidebar.tsx`

Plan:
- Prioritize row title, preview, and timestamp.
- Reduce visible badge clutter.
- Strengthen selected-state styling.
- Move secondary actions into overflow where helpful.

Verification:
- Session list is faster to scan visually.

### Task E2: Add compact mode exploration
Objective: Support power users who want denser navigation/history.

Files:
- Modify: `src/components/layout/sidebar.tsx`
- Modify: `src/features/sessions/components/session-sidebar.tsx`
- Possibly: `src/lib/store/ui-store.ts`

Plan:
- Introduce compact vs default density for nav and/or session list.
- Keep this optional, not forced.

Verification:
- Both modes remain readable and usable.

---

## Workstream F — Login trust and onboarding

### Task F1: Improve login trust and affordances
Objective: Make auth feel more product-grade.

Files:
- Modify: `src/app/login/page.tsx`
- Modify: `src/components/auth/login-form.tsx`

Plan:
- Change CTA to “Sign in” if still needed.
- Add password visibility toggle.
- Remove unexplained prefilled defaults if present.
- Add support/trust/help affordances as appropriate.

Verification:
- Login page reads like a product entry point, not an internal tool.

### Task F2: Add lightweight first-run guidance
Objective: Help users understand Pan’s concepts without reading external docs.

Files:
- Potential create/modify: contextual help components in chat, marketplace, integrations

Plan:
- Add lightweight helper content/tooltips around:
  - skills
  - plugins
  - MCP servers
  - approvals
  - profiles
- Avoid building a giant tour first; start with contextual guidance.

Verification:
- First-run users have a clearer sense of what each major product area does.

---

## Execution order

Recommended order:
1. A1 terminology
2. A2 shared state patterns
3. A3 shell cleanup
4. B1 chat empty state
5. B2 chat header simplification
6. B3 right drawer refactor
7. C1 marketplace discover-first
8. C2 featured/recommended content
9. C3 search clarification
10. D1 integrations landing state redesign
11. D2 naming/IA cleanup
12. D3 plugin install UX feedback
13. E1 session row redesign
14. E2 compact mode
15. F1 login polish
16. F2 onboarding/help

---

## Verification plan

For each workstream:
- run `npm run lint`
- run `npm run test`
- run `npm run build`
- run Docker smoke (`tests/docker/docker-test.sh`) when screen-level behavior changed materially
- do browser-level smoke checks for:
  - login
  - chat
  - marketplace
  - integrations
  - plugins
  - skills

Special rule:
- when changing install/discovery surfaces, do not rely on CI alone; repeat Docker/API/browser verification

---

## Deliverables expected by the end of the overhaul

- calmer shell and better hierarchy
- explicit state patterns across screens
- chat-first workspace feel
- compelling marketplace discovery experience
- clearer integrations/plugins/MCP mental model
- improved session navigation and scanning
- more trustworthy login/onboarding experience
