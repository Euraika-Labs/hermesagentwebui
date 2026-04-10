# Pan Ship Status

Status: self-hosted beta / release-quality for admin-operated deployments

Verification completed (v0.7.1)
- [x] `npm run lint`
- [x] `npm run test` — 24/24 unit tests (vitest)
- [x] `npm run build`
- [x] Playwright suite enumerates 23 committed tests across 8 spec files
- [x] `npm pack --dry-run` after a clean rebuild
- [x] Browser-driven validation completed for login, chat, marketplace, integrations, plugins, compact navigation, and first-run guidance flows during the UX overhaul
- [x] Runtime health, sessions, skills, memory, profiles, extensions, plugins, and audit APIs re-verified through the integrated app flows

Shipped capabilities
- Authenticated admin workspace with more product-grade login and first-run framing
- Chat-first workspace with starter prompts, calmer header hierarchy, and Inspector-based progressive disclosure
- Chat/session management (create, rename, archive, fork, delete, stream)
- Authenticated chat/session API surface (`/api/chat/sessions*`, `/api/chat/stream`)
- Unified Marketplace with discover-first browsing for skills, MCP Hub, and plugins
- MCP Hub registry browsing with trust/install metadata and cache hydration
- Integrations workspace that clearly separates installed inventory, tools, approval posture, diagnostics, and MCP discovery
- Plugins workspace with install validation, repo requirements guidance, detail routes, and enable/disable flows
- Session/sidebar compact mode and denser history navigation for power users
- Real Hermes-backed session/history reads and major writes
- Approval queue persistence and server-side gating on app-controlled path
- Artifacts, audit, approvals, telemetry, runtime health, MCP diagnostics pages
- Downloadable runtime JSON and CSV exports
- Persisted MCP probe results/errors/timestamps
- Real memory/profile/skills/extensions integrations
- Docker deployment with bundled Hermes Agent (test image)
- GitHub → GitLab mirror workflow compatible with protected GitLab `main`

Known remaining caveats
- Full Playwright execution remains environment-sensitive in headless agent shells even though the committed suite enumerates correctly; use a real shell or Docker/browser verification for highest confidence
- Not every third-party MCP or plugin install command can be guaranteed to succeed — Pan now reports failures honestly instead of false-success installs
- Multi-user RBAC and full production observability are not implemented beyond current admin-only session model and durable telemetry/audit stores

Recommended deployment posture
- Suitable for advanced self-hosted admin usage
- Good release confidence for local/private deployments
- Continue hardening before broader multi-user production rollout
