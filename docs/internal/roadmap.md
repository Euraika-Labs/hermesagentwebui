# Pan WebUI — Internal Roadmap

> Status: 2026-04-08 · Revised after 3-agent parallel review (technical / UX / strategy)
> For the marketplace implementation plan in detail, see the `pan-marketplace-plan` skill.

---

## Phase Ordering (REVISED)

Previous ordering:

    Phase 2 (command palette) → Phase 3 (Teams/Admin) → Phase 4 (Marketplace)

Revised ordering (unanimous from 3 independent reviews):

    Phase 2 (close out) → Phase 3 (Marketplace) → Phase 4 (Multi-user lite)

**Rationale:** Marketplace serves every user. Teams serves admins. MCP Hub alone is
the single highest-ROI item on the entire roadmap (2-3 days of work → 13,000+
integrations). It should not sit behind multi-month enterprise auth work.

---

## Phase 2 — Close Out (CURRENT)

**Goal:** Ship remaining Phase 2 items and move on. No scope expansion.

- [ ] Command palette (Cmd/Ctrl-K) — ship the MVP and close
- [x] DROP: branch visualization (unclear user demand, deferred)
- [ ] Verify all Phase 2 acceptance criteria are green

**Exit criteria:** Command palette in main, changelog entry, no open Phase 2 bugs.
**Estimated effort:** 2-4 days.

---

## Phase 3 — Marketplace (NEXT — Highest Priority)

**Goal:** Unified discovery and one-click install for MCP Servers, Plugins, and Skills.

### Phase 3a — MCP Server Hub (highest ROI, do first)

- "Discover" tab added to `/extensions`, mirroring Skills Hub pattern
- Backend: `hub-mcp.ts` syncs from Official MCP Registry (registry.modelcontextprotocol.io)
  in a background job, writes JSON cache
- Frontend: MCP hub grid with search, install wizard with env var validation
- Featured/Curated tab is the default — 15-30 hand-picked servers
- Trust badges (Verified / Community / Unreviewed) ship with this phase
- **Effort:** 8-12 new files, 5-8 days

### Phase 3b — Plugin Management UI

- New `/plugins` route, makes plugins visible and manageable
- Backend: `real-plugins.ts`, reads `~/.hermes/plugins/*/plugin.yaml`
- Frontend: plugin list, install-from-git dialog, enable/disable toggle
- **Effort:** 6-8 new files, 3-4 days

### Phase 3c — Unified Marketplace Shell

- New `/marketplace` route with tabs: Skills | MCP Servers | Plugins
- Build the shell FIRST, fill tabs as 3a and 3b land
- Unified search bar across all three registries
- **Effort:** 3-5 modified files, 1-2 days

### Non-Negotiable Technical Requirements (all Phase 3 code)

1. **No `execFileSync` anywhere.** Use promisified `execFile` with array args and timeouts.
2. **YAML via `eemeli/yaml` `parseDocument`**, never `js-yaml` (destroys comments).
3. **Fuse.js index as module singleton**, not per-request (300ms tax on 13K records).
4. **Registry fetch in background job**, not in API routes. Routes read cache only.
5. **Input sanitization** — strict regex allowlist for any user-provided slug before execFile.
6. **Version pinning** to exact registry-reported version, never `latest`.
7. **Probe for uv/docker at boot**, surface missing tools in UI.

**Total Phase 3 effort:** ~2-3 weeks.

---

## Phase 4 — Multi-User Lite (AFTER Marketplace)

**Goal:** Minimal multi-user support. NOT enterprise. NOT full admin suite.

### Scope (IN)

- OIDC login (Keycloak, Auth0, or any OIDC provider)
- Shared workspaces (multiple users see same sessions/skills)
- 2 roles only: admin and member
- Per-user profile isolation (each user gets their own Hermes profile)
- Basic workspace settings (name, invite link, member list)

### Scope (OUT — deferred to v2.0 enterprise track)

- Approval workflows
- Audit logs beyond basic login/logout
- Org policies and compliance controls
- Analytics and usage dashboards
- SSO group sync
- Billing and licensing

**Estimated effort:** 1-2 weeks for the lite version.

---

## Phase 5 — Demand-Driven (NOT pre-planned)

Items move here when users request them:

- Branch visualization
- Advanced audit logging
- Enterprise SSO group sync
- Analytics dashboards
- Marketplace ratings/reviews
- Community contributions
- Plugin marketplace (curated registry beyond git URLs)

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| MCP Registry API changes (v0.2) | Medium | Pin to v0.1, monitor for breaking changes |
| 13K servers overwhelm UI without curation | High | Featured tab mandatory, trust badges at launch |
| execFileSync pattern copied from hub-skills.ts | High | Code review gate, lint rule if possible |
| Plugin install via git clone is fragile | Medium | Pre-flight checks, clear error messages, timeout handling |
| Multi-user scope creep into enterprise | High | Hard scope boundary documented above, enforce in reviews |
| Context exhaustion during doc writing | Meta | Use large-doc-writing skill, write via execute_code |

---

## Priority Matrix

| Item | Effort | Impact | Priority |
|------|--------|--------|----------|
| MCP Server Hub (3a) | 5-8 days | Unlocks 13K+ integrations | P0 — do first |
| Command Palette (Phase 2) | 2-4 days | UX improvement | P1 — close out |
| Plugin UI (3b) | 3-4 days | Makes plugins visible | P1 |
| Marketplace Shell (3c) | 1-2 days | UX unification | P2 |
| Multi-user Lite (Phase 4) | 1-2 weeks | Enables sharing | P2 |

---

## Release Strategy

| Milestone | Version | Content |
|-----------|---------|---------|
| Alpha (current) | v0.5.x | Core features, single-user, CLI parity |
| Beta | v0.6.x | Marketplace (MCP Hub + Plugin UI + Unified shell) |
| RC | v0.8.x | Multi-user lite, polished UX |
| GA | v1.0.0 | Production-ready, documented, tested |

---

## Review History

- **2026-04-08:** 3-agent parallel review (technical architecture, product/UX, strategy).
  All three independently concluded: swap Phase 3↔4, MCP Hub is highest ROI,
  execFileSync must go, trust badges are security infrastructure not polish.
  See `pan-marketplace-plan` skill for detailed findings.
