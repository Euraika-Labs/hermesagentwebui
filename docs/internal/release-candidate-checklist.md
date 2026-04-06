# Pan Release Candidate Checklist

Build and test
- [x] `npm run lint`
- [x] `npm run test`
- [x] `npm run build`
- [x] `npm run test:e2e`

Runtime/ops surfaces
- [x] Runtime health page
- [x] MCP diagnostics page with persisted probe results
- [x] Audit browser
- [x] Approvals browser
- [x] Artifacts browser
- [x] Runs explorer and run detail
- [x] Downloadable runtime JSON/CSV exports
- [x] Artifact download endpoint
- [x] Durable runtime.db and audit.db

Security/admin baseline
- [x] Settings/ops pages require authenticated admin session
- [x] Sensitive operations isolated under settings pages
- [x] Session auth cookie remains httpOnly
- [x] Production secure cookie toggle enabled by NODE_ENV

Known remaining caveats
- True Hermes-core-native live tool pause/resume still relies on wrapper-level orchestration rather than full Hermes internal executor integration
- Some metadata persistence remains approximate rather than perfectly matching every Hermes-native message shape
- No multi-user RBAC model beyond current admin-only session role
- Observability is durable and inspectable but not yet a full metrics/tracing stack