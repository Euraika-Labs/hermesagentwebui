# Changelog

All notable changes to Pan by Euraika are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.7.1] — 2026-04-10

### Fixed
- **Hub skill install overrides** — blocked community skills can now be explicitly force-installed from the UI instead of failing with an unresolvable error path
- **Hub skill security errors** — blocked installs now return explicit overrideable API state instead of generic `500` responses
- **Skill inventory parsing** — malformed linked-file groups inside installed skills no longer crash `/api/skills`, `/api/skills/hub`, or `/api/skills/categories`
- **Hub install UX concurrency** — installing one skill now locks the other install buttons and hides successfully installed cards immediately
- **MCP hub installs** — installing an MCP server now persists real config instead of only attempting an ephemeral command execution
- **MCP probe refresh** — stale probe cache and stale hub metadata no longer keep broken diagnostics or missing install metadata around
- **MCP command allowlist resolution** — probes now correctly allow resolved command basenames such as `npx` when Hermes resolves them to absolute paths
- **HTTP MCP install fallback** — installs like `ai.memestack/mcp` now force a fresh registry sync when cached metadata is stale or incomplete

### Changed
- **MCP reliability for fresh setups** — verified installation and test flows now work for both `ai.memestack/mcp` and `dev-fentz-envcp-envcp`
- **README screenshots and docs** — refreshed post-0.7.0 docs polish remains on `main` and is now included in the next packaged release

## [0.7.0] — 2026-04-09

### Added
- **Wave-based UX overhaul shipped to main** — the full roadmap now lands in six reviewed waves, each merged separately into `main`
- **Chat-first workspace redesign** — calmer empty state, starter prompts, stronger composer hierarchy, and a clearer Inspector surface
- **Marketplace discovery redesign** — discover-first hero, above-the-fold featured content, clearer global search scope, and softer separation between discovery and installed inventory
- **Integrations IA cleanup** — clearer distinction between live integrations, MCP servers, tools, approval posture, diagnostics, and repo-based plugins
- **Compact navigation mode** — optional denser sidebar + session history layout for power users
- **Product-grade login + first-run guidance** — stronger trust framing, no unexplained prefilled credentials, password visibility toggle, and lightweight orientation for Skills / MCP / Plugins / Profiles
- **UX planning docs** — roadmap, implementation plan, sprint backlog, issue mapping, and canonical terminology docs added under `docs/internal/`

### Changed
- **Shell hierarchy simplified** — sidebar, right drawer, chat header, session list, and shared layout surfaces are quieter and easier to scan
- **State clarity improved across screens** — loading, empty, degraded, and error treatments are now more consistent across chat, marketplace, and integrations
- **Session navigation polished** — stronger selected states, less row noise, and compact-mode-friendly source/resume affordances
- **Plugin and integrations copy clarified** — the UI now explains more clearly when to use Marketplace, Integrations, MCP servers, Skills, and Plugins

### Fixed
- **Next.js dev-cache instability handling documented and operationalized** — release verification now explicitly used clean rebuilds after `.next` corruption symptoms appeared during UX iteration
- **Plugin install guidance** — invalid repository flows now read as intentional validation instead of generic failure noise
- **Inspector/session/sidebar coherence** — labels and progressive-disclosure patterns are more consistent across chat and surrounding workspace surfaces

## [0.6.0] — 2026-04-09

### Added
- **Unified Marketplace** — new `/marketplace` surface that brings skills, MCP servers, and plugins together in one search-driven workspace
- **MCP Hub** — browse thousands of MCP registry entries with search, trust cues, install metadata, and install dialogs
- **Plugins workspace** — dedicated `/plugins` page plus plugin cards, install dialog, enable/disable controls, and plugin detail APIs
- **New API surface** for marketplace flows:
  - `/api/extensions/hub`
  - `/api/extensions/hub/install`
  - `/api/plugins`
  - `/api/plugins/install`
  - `/api/plugins/[id]`
  - `/api/plugins/[id]/enable`
- **Expanded Playwright coverage** — 23 browser tests across chat, marketplace, MCP hub, plugins, skills, memory/profiles, extensions, and mobile

### Changed
- **Plugin installs hardened** — Pan now treats plugin install success as “real Hermes plugin installed”, not merely “git clone succeeded”
- **GitHub → GitLab mirror workflow** — removed force-push behavior so mirroring no longer fails against protected GitLab `main`
- **Release confidence improved** — marketplace/install flows were validated with Docker rebuilds, direct API checks, and browser-level smoke tests

### Fixed
- **Plugin install contract** — WebUI/API payload mismatch (`repo` vs `identifier`) repaired with compatibility handling
- **Plugin validation** — arbitrary GitHub repos now fail clearly unless they contain `plugin.yaml` and `__init__.py`
- **Skill load into session** — mixed mock/real session paths no longer fail with `Session not found`
- **Skills hub false success** — bogus `hermes skills install` output now reports failure instead of returning a fake success
- **MCP Hub parsing/cache hydration** — registry results populate correctly from the current nested registry shape instead of showing an empty hub
- **Chat/session API auth** — unauthenticated access to `/api/chat/sessions`, `/api/chat/sessions/[id]`, `/api/chat/sessions/[id]/fork`, and `/api/chat/stream` now returns `401 Unauthorized`

## [0.5.2] — 2026-04-09

### Fixed
- **npm standalone packaging** — standalone build output now includes the assets Pan needs at runtime, including copied static assets on start
- **npm release reliability** — package composition aligned with standalone Next.js output so installed builds boot correctly from the published artifact

## [0.5.1] — 2026-04-08

### Fixed
- **Fork session crash** — missing closing `)` in `forkRealSession` Python bridge caused all session forks to fail with a syntax error

### Changed
- **Health probe decoupled from binary** — `getHermesRuntimeStatus()` now probes the API gateway and detects filesystem assets (config, memories, sessions, skills) even when no `hermes` binary is present. Docker and headless deployments report full health status instead of blanket "unavailable".

### Added
- **Docker test image** — `tests/docker/Dockerfile.test` bundles Hermes Agent (via `uv` + Euraika-Labs fork @ `pan-v0.7.0`). All 7/7 health checks pass inside the container.
- **Docker test suites** — mock-mode (`docker-test.sh`, 37 assertions incl. 7 Playwright E2E) and real-mode (`docker-real-test.sh`, 28 assertions against a live gateway)
- **Full-stack functional test** — `tests/functional/full-stack-test.sh` (33 assertions): clean build → standalone start → auth → CRUD → APIs → pages → unit → E2E
- **`.dockerignore`** — optimised Docker build context

## [0.5.0] — 2026-04-08

### Added
- **Vendored Hermes fork** — Pan now pins and manages its own Hermes Agent binary from `Euraika-Labs/hermes-agent`. Version requirements defined in `hermes.version.json` at the repo root.
- **Auto-install Hermes** — if no `hermes` binary is found, Pan's setup wizard offers to clone and install the vendored fork automatically via `pip install -e .`
- **Version compatibility checks** — startup validates installed Hermes version against `minVersion`/`maxVersion` from `hermes.version.json` and warns on mismatch
- **`pan-ui sync-hermes`** — new CLI subcommand to update Hermes to the pinned version
- **`pan-ui update`** — check for and install Pan updates from npm
- **`pan-ui version`** — display current Pan version
- **`pan-ui help`** — show full CLI usage
- **Update banner** — in-app notification when a newer Pan version is available on npm
- **Update check API** — `/api/runtime/update-check` endpoint for the frontend banner

### Changed
- **CLI refactored to subcommand structure** — `pan-ui start`, `pan-ui stop`, `pan-ui status`, `pan-ui logs`, `pan-ui setup`, `pan-ui service install|remove`. Old flag-style (`--daemon`) still works for backward compatibility.
- **Profile detection hardened** — `getActiveProfileId()` now resolves the active Hermes profile dynamically without hardcoded names or `HERMES_HOME` env var. Falls back gracefully when only one profile exists.
- **Runtime bridge** — improved error handling and profile-aware path resolution

### Fixed
- Hub skills cache reads use profile-aware paths consistently
- Profile context no longer crashes when `~/.hermes/profiles/` contains non-directory entries

## [0.4.0] — 2026-04-07

### Added
- **Automatic gateway management** — Pan now auto-detects and starts the Hermes gateway (`hermes gateway run`) on boot. No manual gateway setup required; just start Pan and chat works immediately.
- **Gateway health monitor** — background health check every 30 s auto-restarts the gateway if it crashes (only when Pan spawned it)
- **Graceful shutdown** — gateway child process is cleaned up on SIGINT/SIGTERM/exit
- Next.js `instrumentation.ts` hook bootstraps the gateway manager at server start

### Changed
- **Simplified deployment** — only one process/service needed. The separate `hermes-gateway.service` systemd unit is no longer required; Pan manages the gateway lifecycle internally.
- Architecture diagram updated to show the gateway manager layer

### Fixed
- Gateway no longer requires hardcoded profile names or `HERMES_HOME` env var — Hermes uses its own active profile detection

## [0.3.0] — 2026-04-07

### Added
- **Session source badges** — sessions now display their origin (CLI, WebUI, Discord, Telegram, WhatsApp, Slack, etc.) with color-coded badges in the sidebar
- **Source filter chips** — filter the session sidebar by source when multiple sources are present (auto-hidden for single-source lists)
- **Resume button** for external sessions — one-click to resume CLI, API, and messaging sessions from the WebUI
- `SessionSource` type union covering 13 platforms (webui, cli, api, discord, telegram, whatsapp, signal, slack, matrix, mattermost, sms, email, unknown)
- `X-Hermes-Session-Id` header forwarded to Hermes gateway for session continuity

### Fixed
- **Skills Discover tab showing "0 discoverable skills"** — hub cache path now uses `getConfiguredHermesHome()` (profile-aware) instead of `getHermesHome()` (root `~/.hermes`), matching where the CLI writes its cache
- **Hub cache reader** expanded to read ALL `.json` index files (repo indexes, browse results), not just `skills_sh_search_*` files, with `Array.isArray()` guard for non-array files
- **Hydration mismatch** — Resume button changed from nested `<button>` to `<span role="button">` with proper keyboard handlers (Enter/Space) to fix HTML validity warning
- Session open handler extracted and streamlined to properly reset all composer state

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

[0.7.1]: https://github.com/Euraika-Labs/pan-ui/compare/v0.7.0...v0.7.1
[0.7.0]: https://github.com/Euraika-Labs/pan-ui/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/Euraika-Labs/pan-ui/compare/v0.5.2...v0.6.0
[0.5.2]: https://github.com/Euraika-Labs/pan-ui/compare/v0.5.1...v0.5.2
[0.5.1]: https://github.com/Euraika-Labs/pan-ui/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/Euraika-Labs/pan-ui/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/Euraika-Labs/pan-ui/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/Euraika-Labs/pan-ui/compare/v0.2.4...v0.3.0
[0.2.4]: https://github.com/Euraika-Labs/pan-ui/compare/v0.2.3...v0.2.4
[0.2.3]: https://github.com/Euraika-Labs/pan-ui/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/Euraika-Labs/pan-ui/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/Euraika-Labs/pan-ui/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/Euraika-Labs/pan-ui/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Euraika-Labs/pan-ui/releases/tag/v0.1.0
