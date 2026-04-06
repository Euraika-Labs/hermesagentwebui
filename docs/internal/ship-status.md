# Pan Ship Status

Status: release-candidate quality for local/self-hosted admin usage

Verification completed
- [x] `npm run lint`
- [x] `npm run test`
- [x] `npm run build`
- [x] `npm run test:e2e`

Shipped capabilities
- Authenticated admin workspace
- Chat/session management
- Real Hermes-backed session/history reads and major writes
- Runtime runs model and runs explorer
- Approval queue persistence and server-side gating on app-controlled path
- Artifacts, audit, approvals, telemetry, runtime health, MCP diagnostics pages
- Downloadable runtime JSON and CSV exports
- Artifact downloads
- Persisted MCP probe results/errors/timestamps
- Real memory/profile/skills/extensions integrations

Known remaining caveats
- Deep Hermes-core-native live tool pause/resume is still approximated through wrapper/orchestration logic rather than a fully embedded Hermes executor contract
- Some streamed message metadata is persisted with strong practical fidelity, but not every possible Hermes-native internal shape is guaranteed to be mirrored exactly
- Multi-user RBAC and full production observability are not implemented beyond current admin-only session model and durable telemetry/audit stores

Recommended deployment posture
- Suitable for advanced local or self-hosted admin usage
- Strong alpha / early beta quality
- Continue hardening before broader multi-user production rollout