# Changelog

All notable changes to Pan by Euraika are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.2.4] — 2026-04-06

### Added
- **Daemon mode** — run Pan as a background process with `--daemon` / `-d`
- `npx pan-ui stop` — gracefully stop the daemon
- `npx pan-ui status` — check running state, PID, port, log path
- `npx pan-ui logs` — tail daemon log output
- **Systemd user service** — `npx pan-ui service install` creates a persistent service with auto-start
- `npx pan-ui service remove` — cleanly uninstall the service
- Double-start prevention and stale PID recovery
- Port override via `--port` flag

### Fixed
- Duplicate `PORT` env var when systemd reads `.env.local`

## [0.2.3] — 2026-04-06

### Fixed
- **npm packaging** — `.next/` build artifacts were excluded from the tarball because npm was using `.gitignore` rules. Added `.npmignore` to override.
- Removed hardcoded `outputFileTracingRoot` from `next.config.ts` (was causing path mismatches in standalone builds)
- Added runtime path patching (`patchStandalonePaths()`) in the CLI launcher for belt-and-suspenders reliability

## [0.2.2] — 2026-04-05

### Fixed
- CI publish workflow: skip `prepublishOnly` in publish jobs with `--ignore-scripts`
- Dual-publish to npm and GitHub Packages on release

## [0.2.1] — 2026-04-05

### Fixed
- Publish workflow and README `npx` command corrections
- Package renamed to `@euraika-labs/pan-ui` (scoped npm org)

## [0.2.0] — 2026-04-05

### Added
- **Skills Hub** — browse and install 268+ skills from [skills.sh](https://skills.sh) marketplace
- **Memory overhaul** — global + profile-scoped memory with `§`-separated entry parsing
- **Profile editor** — AI-powered config.yaml + SOUL.md editing
- **Profile creation** — full profile lifecycle management

### Changed
- Rebranded from *Hermes Workspace* to **Pan by Euraika**
- Comprehensive UI token standardization — border radius, font sizes, opacity tiers, shared Button component
- Light mode improvements (muted foreground, border/input colors)
- Sidebar active state redesigned to accent bar

### Fixed
- Cookie `secure: false` for local-first HTTP usage
- Skills always written to global `~/.hermes/skills/` directory
- `jsdom` pinned to `^25` (v29 ESM top-level await breaks Vitest)
- Static chunk 404s resolved via `outputFileTracingRoot`
- CodeQL shell-command-injection-from-environment vulnerability
- Vulnerable dependencies upgraded

### Security
- CodeQL analysis enabled on every push and PR
- Allowlist guard on CLI commands before `execFileSync`

## [0.1.0] — 2026-04-03

### Added
- Initial release of Hermes Workspace WebUI
- Chat with streaming (SSE-based, OpenAI-compatible)
- Skills browser with installed skills view
- Extensions and MCP server management
- Memory inspector
- Profile-based workspace isolation
- Settings: runtime health, runs, audit, telemetry, approvals
- CI pipeline (lint, test, build)
- Dependabot configuration
- Community standards (CoC, CONTRIBUTING, SECURITY, issue templates)

[0.2.4]: https://github.com/Euraika-Labs/pan-ui/compare/v0.2.3...v0.2.4
[0.2.3]: https://github.com/Euraika-Labs/pan-ui/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/Euraika-Labs/pan-ui/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/Euraika-Labs/pan-ui/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/Euraika-Labs/pan-ui/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Euraika-Labs/pan-ui/releases/tag/v0.1.0
