# Pan Alpha Release Checklist

Product readiness
- [x] Authentication flow works
- [x] Chat sessions can be created, searched, forked, archived, and deleted
- [x] Streaming responses render in transcript
- [x] Tool cards, approvals, artifacts, and timeline render
- [x] Skills management works
- [x] Extensions/MCP management works
- [x] Memory editing and context inspection work
- [x] Profiles and policy presets work
- [x] Mobile viewport basic usability verified
- [x] Attachments and mock voice controls exist

Engineering quality
- [x] `npm run lint`
- [x] `npm run test`
- [x] `npm run build`
- [x] `npm run test:e2e`

Operational checks
- [ ] Set production session secret
- [ ] Set real Hermes API base URL
- [ ] Disable mock mode for production-like environments if desired
- [ ] Review audit and telemetry output in deployment logs
- [ ] Confirm any required provider credentials

Known alpha constraints
- Core reads/writes are now substantially real-backed, but some UX layers still use fallback/mock behavior when Hermes runtime APIs are unavailable
- Voice input is mock-assisted rather than full speech-to-text
- TTS uses browser speech synthesis when available
- Attachment binary/object storage is local app persistence, not yet integrated into a broader artifact backend
- True live Hermes internal approval resume is still evolving; current server-side gating is strongest on the app-controlled stream path
- Mobile UX is validated but not yet deeply polished