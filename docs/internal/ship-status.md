# Pan Ship Status

Status: self-hosted beta / release-quality for admin-operated deployments

Verification completed (v0.6.0)
- [x] `npm run lint`
- [x] `npm run test` — 24/24 unit tests (vitest)
- [x] `npm run build`
- [x] Playwright suite enumerates 23 committed tests across 8 spec files
- [x] Docker mock-mode smoke, API verification, and browser-driven user-path checks completed for marketplace/plugins/skills/auth flows
- [x] Runtime health, sessions, skills, memory, profiles, extensions, plugins, and audit APIs re-verified in Docker
- [x] Chat/session APIs now return `401 Unauthorized` when called without login

Shipped capabilities
- Authenticated admin workspace
- Chat/session management (create, rename, archive, fork, delete, stream)
- Authenticated chat/session API surface (`/api/chat/sessions*`, `/api/chat/stream`)
- Unified Marketplace for skills, MCP Hub, and plugins
- MCP Hub registry browsing with trust/install metadata and cache hydration
- Plugins workspace with install validation, detail routes, and enable/disable flows
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
