# Contributing to Pan

Thanks for your interest in contributing to Pan by Euraika! This guide will help you get started.

## Development Setup

```bash
# Clone the repo
git clone https://github.com/Euraika-Labs/pan-ui.git
cd pan-ui

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open [localhost:3199](http://localhost:3199). Default login: `admin` / `changeme`.

### Running Tests

```bash
npm run lint          # ESLint
npm run test          # Vitest unit tests
npm run build         # Production build
npm run test:e2e      # Playwright e2e (requires running dev server)
```

## How to Contribute

### Reporting Bugs

Use the [Bug Report](https://github.com/Euraika-Labs/pan-ui/issues/new?template=bug_report.yml) template. Include:
- Steps to reproduce
- Expected vs actual behavior
- Browser, OS, and Hermes version

### Suggesting Features

Use the [Feature Request](https://github.com/Euraika-Labs/pan-ui/issues/new?template=feature_request.yml) template. Describe the problem you're solving and your proposed approach.

### Submitting Changes

1. Fork the repo and create a branch from `main`
2. Make focused, reviewable changes
3. Run the full verification suite:
   ```bash
   npm run lint && npm run test && npm run build
   ```
4. Open a pull request with a clear summary and test plan

## Code Conventions

### Project Structure

- **`src/app/api/`** — Server-side API routes (Next.js Route Handlers)
- **`src/features/`** — UI feature modules (chat, skills, memory, etc.)
- **`src/server/`** — Hermes filesystem bridge and server-side logic
- **`src/components/`** — Shared layout and UI components
- **`src/lib/`** — Types, schemas, Zustand stores, utilities
- **`bin/`** — CLI launcher (setup wizard, daemon, systemd service)
- **`tests/`** — Unit tests (`unit/`) and E2E tests (`e2e/`)

### Style

- Prefer small, focused PRs over large sweeping changes
- Keep server bridges typed and centralized in `src/server/`
- Extend existing feature modules under `src/features/`
- Add tests for non-trivial behavior changes
- Use the shared UI token system (see `src/styles/`) — avoid hardcoded colors, radii, or font sizes

### Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/) prefixes:

```
feat:      New feature
fix:       Bug fix
refactor:  Code restructure (no behavior change)
docs:      Documentation only
test:      Adding or updating tests
chore:     Build, CI, dependency updates
polish:    Visual/UX improvements
```

## Before Submitting

- [ ] No secrets or `.env.local` values committed
- [ ] No `.data/` artifacts committed
- [ ] Documentation updated if behavior or configuration changed
- [ ] All CI checks pass (`lint`, `test`, `build`)

## Security Issues

Please report security vulnerabilities **privately** — see [SECURITY.md](SECURITY.md) for details. Do not open a public issue for security bugs.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
