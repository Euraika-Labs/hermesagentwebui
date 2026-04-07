# Architecture

Pan is a Next.js application that bridges a web browser to a local Hermes Agent runtime.

## System overview

```
  Browser ──── fetch / SSE ────▶ Pan (Next.js standalone server)
                                    │             │
                                    ▼             ▼
                              Hermes API    Hermes Filesystem
                              :8642         ~/.hermes/
                              (streaming)   (skills, memory, profiles, state.db)
```

Pan is both the frontend and the backend. It runs as a standalone Next.js 15 server (no separate API server needed) and communicates with Hermes through two channels:

1. **Hermes API** — OpenAI-compatible HTTP/SSE endpoint at `:8642` for chat streaming and runtime operations
2. **Hermes filesystem** — direct reads/writes to `~/.hermes/` for skills, memory, profiles, and session data

## Key design decisions

- **Standalone output** — `next build` produces a self-contained server in `.next/standalone/` that runs without `node_modules`. This is what the npm package ships.
- **No database** — Pan has no database of its own. All state lives in Hermes's filesystem (`state.db`, skill files, memory files, profile directories).
- **Server-side bridges** — All Hermes interactions go through Next.js Route Handlers (`src/app/api/`), never directly from the browser. This provides auth gating, input sanitization, and CORS protection.
- **Profile isolation** — Each Hermes profile (`~/.hermes/profiles/<name>/`) is a full workspace boundary with its own sessions, skills, memory, and config.

## Project structure

```
src/
├── app/                  # Next.js App Router
│   ├── api/              # Server-side API routes (Route Handlers)
│   │   ├── chat/         # Chat streaming, session CRUD
│   │   ├── skills/       # Skills CRUD, hub search, categories
│   │   ├── memory/       # User/agent memory, context inspector
│   │   ├── profiles/     # Profile CRUD and config editing
│   │   ├── extensions/   # MCP extension management
│   │   └── runtime/      # Health, approvals, runs, telemetry, export
│   ├── chat/             # Chat page
│   ├── skills/           # Skills browser page
│   ├── extensions/       # Extensions page
│   ├── memory/           # Memory page
│   ├── profiles/         # Profiles page
│   ├── settings/         # Settings and operations pages
│   └── login/            # Login page
├── features/             # UI feature modules (components + hooks per feature)
│   ├── chat/             # Chat screen, composer, message rendering
│   └── sessions/         # Session sidebar, source badges, source filtering
├── server/               # Server-side Hermes bridge (filesystem reads, API calls)
├── components/           # Shared layout and UI components
├── lib/                  # Types, schemas, Zustand stores, utilities
└── styles/               # CSS custom properties and theme tokens
middleware.ts             # Auth middleware (cookie check, redirect to /login)
bin/
└── pan-ui.mjs            # CLI entry point: setup wizard, standalone server, daemon, systemd
```

## API routes

All routes live under `src/app/api/` and use Next.js Route Handlers.

| Area | Routes | Backend |
|------|--------|---------|
| Chat | `/api/chat/stream`, `/api/chat/sessions/*` | Hermes API (SSE) + state.db |
| Skills | `/api/skills/*`, `/api/skills/hub/*` | `~/.hermes/skills/` + skills.sh cache |
| Memory | `/api/memory/user`, `/api/memory/agent` | `USER.md` / `MEMORY.md` files |
| Profiles | `/api/profiles/*` | `~/.hermes/profiles/` directories |
| Extensions | `/api/extensions/*` | `config.yaml` MCP server entries |
| Runtime | `/api/runtime/*` | Hermes API health, runs, telemetry |

## Chat streaming lifecycle

1. Browser POSTs to `/api/chat/stream` with message and session context
2. Route handler resolves profile, model, and toolset
3. Forwards to Hermes API's OpenAI-compatible `/v1/chat/completions` with `stream: true`
4. SSE events flow back through Pan to the browser
5. Frontend renders assistant text, tool timelines, approval cards, and artifacts in real time

## Session sources

Hermes sessions can originate from many platforms. Pan reads the `source` column from `state.db` and displays it as a color-coded badge in the sidebar.

| Source | Badge color | Description |
|--------|-------------|-------------|
| `webui` | Muted | Created in Pan itself |
| `cli` | Slate | Hermes CLI terminal session |
| `api` | Violet | Direct API call |
| `discord` | Indigo | Discord bot |
| `telegram` | Sky | Telegram bot |
| `whatsapp` | Emerald | WhatsApp gateway |
| `slack` | Fuchsia | Slack integration |
| `signal` | Blue | Signal gateway |
| `matrix` | Teal | Matrix bridge |
| `sms` | Amber | SMS gateway |
| `email` | Rose | Email gateway |
| `unknown` | Muted | Source not recorded |

The sidebar includes filter chips that appear when sessions from multiple sources are present. External sessions (anything except `webui`) show a **Resume** button.

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router, standalone output) |
| Language | TypeScript |
| State | TanStack Query v5 + Zustand |
| Styling | Tailwind CSS |
| UI | Radix UI primitives + custom components |
| Testing | Vitest (unit) + Playwright (e2e) |
| Runtime | Node.js 18+ |

## npm package structure

The published `@euraika-labs/pan-ui` package contains:

```
bin/pan-ui.mjs            # CLI entry point
.next/standalone/         # Pre-built Next.js server + node_modules
.next/static/             # Static assets (JS, CSS, fonts)
public/                   # Public files (favicon, etc.)
.env.example              # Example configuration
```

The CLI (`bin/pan-ui.mjs`) handles:
- First-run setup wizard (detects Hermes, writes `.env.local`)
- Starting the standalone Next.js server
- Daemon mode (fork, PID file, log file)
- Systemd service install/remove
