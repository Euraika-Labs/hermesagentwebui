# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.2.x   | ✅ Current |
| < 0.2   | ❌ No longer maintained |

## Scope

Pan is designed for **self-hosted, local-first usage**. Security issues affecting the following areas should be reported:

- Authentication and session management
- Approval flow bypass
- Secret or credential exposure
- Diagnostics or runtime data leakage
- Directory traversal or file access outside `HERMES_HOME`
- Command injection via the CLI or API routes

## Reporting a Vulnerability

**Please report security issues privately.** Do not open a public issue.

- **Email:** [security@euraika.net](mailto:security@euraika.net)
- **GitHub:** Use [private vulnerability reporting](https://github.com/Euraika-Labs/pan-ui/security/advisories/new)

Include:
- Description of the vulnerability
- Steps to reproduce
- Affected endpoints or files
- Risk impact assessment (if known)

We aim to acknowledge reports within **48 hours** and provide an initial assessment within **5 business days**.

## Hardening Notes

- Admin pages require authenticated sessions with `httpOnly` cookies
- CLI commands use an allowlist guard (`ALLOWED_COMMANDS`) before `execFileSync`
- File path parameters are sanitized to prevent directory traversal
- CodeQL analysis runs on every push and pull request
- Profile isolation separates sessions, memory, API keys, and skills per workspace
- Runtime/audit data persists under `.data/` — protect at the host/filesystem level
