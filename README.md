<p align="center">
  <img src="docs/assets/pan-logo.svg" alt="Pan by Euraika" width="120" />
</p>

<h1 align="center">Pan by Euraika</h1>

<p align="center">
  <strong>Beautiful WebUI for <a href="https://github.com/NousResearch/hermes-agent">Hermes Agent</a></strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@euraika-labs/pan-ui"><img src="https://img.shields.io/npm/v/@euraika-labs/pan-ui" alt="npm" /></a>
  <a href="https://github.com/Euraika-Labs/pan-ui/actions/workflows/ci.yml"><img src="https://github.com/Euraika-Labs/pan-ui/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/Euraika-Labs/pan-ui/actions/workflows/codeql.yml"><img src="https://github.com/Euraika-Labs/pan-ui/actions/workflows/codeql.yml/badge.svg" alt="CodeQL" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" /></a>
</p>

<p align="center">
  <a href="#install">Install</a> •
  <a href="#features">Features</a> •
  <a href="#screenshots">Screenshots</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#development">Development</a> •
  <a href="CHANGELOG.md">Changelog</a>
</p>

---

Pan is a self-hosted web dashboard for [Hermes Agent](https://github.com/NousResearch/hermes-agent). Chat with your agent, manage skills from [skills.sh](https://skills.sh), control MCP integrations, inspect memory, and operate profiles — all from one place.

![Pan chat with runtime tools](docs/assets/screenshots/chat-runtime.png)

## Install

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ installed
- [Hermes Agent](https://github.com/NousResearch/hermes-agent) installed and configured (`~/.hermes`)

### One command

```bash
npx @euraika-labs/pan-ui
```

A setup wizard runs on first launch to connect Pan to your Hermes instance. After setup, open [localhost:3199](http://localhost:3199).

> **First time?** The wizard auto-detects your Hermes home directory, API server, and installed binary. Just press Enter through the defaults to get started.

### Run in the background

```bash
npx @euraika-labs/pan-ui start --daemon  # Fork to background
npx pan-ui status                        # Check if running
npx pan-ui logs                          # Tail log output
npx pan-ui stop                          # Stop the daemon
```

### Run as a system service (Linux)

```bash
npx @euraika-labs/pan-ui service install   # Creates a systemd user service
npx pan-ui service remove                  # Uninstall it
```

The service starts on login and survives logout. Manage it with standard `systemctl --user` commands.

### Update

```bash
npx @euraika-labs/pan-ui@latest
```

Your configuration in `~/.pan-ui/` is preserved across updates.

## Features

| Feature | Description |
|---------|-------------|
| **Chat** | SSE streaming connected to a live Hermes runtime, with tool timelines, approval cards, and artifact rendering |
| **Sessions** | Unified session sidebar with source badges (CLI, Discord, Telegram, WhatsApp, …), source filtering, and cross-platform session resumption |
| **Skills** | Browse installed skills, discover and install 268+ more from [skills.sh](https://skills.sh) |
| **Extensions** | View MCP servers, their tools, health status, and diagnostics |
| **Memory** | Inspect and edit global and profile-scoped agent memory |
| **Profiles** | Isolated workspaces — each with its own sessions, skills, memory, and API keys |
| **Operations** | Approvals, run history, audit trails, telemetry, health monitoring, and exports |
| **Daemon** | Background process with PID management, log tailing, and systemd integration |

## Screenshots

<details>
<summary><strong>Login</strong></summary>

![Login screen](docs/assets/screenshots/login.png)
</details>

<details open>
<summary><strong>Chat</strong></summary>

Streaming chat with session sidebar, tool timelines, and runtime-aware composer.

![Empty chat workspace](docs/assets/screenshots/chat-empty.png)
![Active chat with runtime output](docs/assets/screenshots/chat-runtime.png)
</details>

<details>
<summary><strong>Skills</strong></summary>

Installed skills with search and category filters. Discover tab for the skills.sh hub.

![Skills installed tab](docs/assets/screenshots/skills-installed.png)
![Skills discover tab](docs/assets/screenshots/skills-discover.png)
</details>

<details>
<summary><strong>Extensions & MCP</strong></summary>

![Extensions page](docs/assets/screenshots/extensions.png)
</details>

<details>
<summary><strong>Memory</strong></summary>

![Memory page](docs/assets/screenshots/memory.png)
</details>

<details>
<summary><strong>Profiles</strong></summary>

![Profiles page](docs/assets/screenshots/profiles.png)
</details>

<details>
<summary><strong>Settings</strong></summary>

![Settings page](docs/assets/screenshots/settings.png)
</details>

## Configuration

### CLI Reference

| Command | Description |
|---------|-------------|
| `pan-ui` / `pan-ui start` | Start in foreground |
| `pan-ui start --daemon` | Start in background |
| `pan-ui start --port 8080` | Override port |
| `pan-ui stop` | Stop daemon |
| `pan-ui status` | Show running state |
| `pan-ui logs` | Tail daemon logs |
| `pan-ui setup` | Re-run setup wizard |
| `pan-ui update` | Check for and install updates |
| `pan-ui sync-hermes` | Update vendored Hermes to pinned version |
| `pan-ui version` | Show current version |
| `pan-ui service install` | Install systemd service |
| `pan-ui service remove` | Remove systemd service |
| `pan-ui help` | Show CLI usage |

### Environment Variables

The setup wizard writes these to `.env.local`. You can also edit them directly or re-run `npx pan-ui setup`.

| Variable | Default | Description |
|----------|---------|-------------|
| `HERMES_HOME` | `~/.hermes` | Hermes home directory |
| `HERMES_API_BASE_URL` | `http://127.0.0.1:8642` | Hermes API endpoint |
| `HERMES_API_KEY` | — | API key (if Hermes requires one) |
| `HERMES_WORKSPACE_USERNAME` | `admin` | Login username |
| `HERMES_WORKSPACE_PASSWORD` | `changeme` | Login password |
| `HERMES_WORKSPACE_SECRET` | *(auto-generated)* | Cookie signing secret |
| `HERMES_MOCK_MODE` | `false` | Use mock data when runtime is unavailable |
| `PORT` | `3199` | Server port |

### File Locations

| Path | Purpose |
|------|---------|
| `~/.pan-ui/pan-ui.pid` | Daemon PID file |
| `~/.pan-ui/pan-ui.log` | Daemon log output |
| `~/.config/systemd/user/pan-ui.service` | Systemd service unit (when installed) |
| `.env.local` (in package dir) | Configuration from setup wizard |

## How It Works

Pan runs as a standalone Next.js server that bridges your browser to the Hermes runtime. On startup it **automatically launches the Hermes gateway** if it isn't already running — no manual gateway setup required.

```
  Browser ──── fetch / SSE ────▶ Pan (Next.js API routes)
                                    │             │
                                    ▼             ▼
                              Hermes Gateway   Hermes Filesystem
                              :8642            ~/.hermes/
                              (auto-managed)   (skills, memory, profiles, state.db)
                                    │
                                    ▼
                              Hermes Agent sessions
                              (tools, streaming, full agent capabilities)
```

- **Gateway** — Pan's startup hook detects whether the Hermes gateway is reachable. If not, it spawns `hermes gateway run` as a child process with health monitoring and auto-restart. The gateway uses the active Hermes profile — no hardcoded names or paths.
- **Vendored Hermes** — Pan pins a specific Hermes Agent version via `hermes.version.json`. On first launch, if no `hermes` binary is found, the setup wizard installs it from the [Euraika-Labs/hermes-agent](https://github.com/Euraika-Labs/hermes-agent) fork. Use `pan-ui sync-hermes` to update.
- **Chat** streams through Hermes's OpenAI-compatible SSE endpoint
- **Skills** are read from `~/.hermes/skills/` with YAML frontmatter parsing
- **Memory** reads/writes `USER.md` and `MEMORY.md` at global and profile scope
- **Profiles** map to `~/.hermes/profiles/<name>/` directories

> **Already running a gateway?** Pan detects it and skips auto-launch. This works with systemd services, manual `hermes gateway run`, or any external process on the configured port.

## Development

Want to contribute or run from source? See [CONTRIBUTING.md](CONTRIBUTING.md) for full setup instructions.

```bash
git clone https://github.com/Euraika-Labs/pan-ui.git
cd pan-ui
npm install
npm run dev
```

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run test` | Vitest unit tests |
| `npm run test:e2e` | Playwright end-to-end tests |

## Security

See [SECURITY.md](SECURITY.md) for reporting vulnerabilities.

## License

[MIT](LICENSE) © [Euraika Labs](https://github.com/Euraika-Labs)
