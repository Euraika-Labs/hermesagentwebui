# Pan WebUI UX Terminology

Status: active
Date: 2026-04-09
Scope: Wave 1 UX foundations

Purpose
This document defines the canonical product language for Pan’s top-level surfaces so the UI stops mixing internal/runtime terms with user-facing labels.

## Core rules

1. One concept, one name
- Use one primary label per concept across navigation, page headers, and empty states.

2. User-facing language beats internal implementation language
- Internal type names such as extension or session may remain in code.
- User-facing copy should prefer clearer product terms.

3. Prefer plain language over internal jargon
- Avoid phrases like “callable tools” or “loading semantics” in primary UI.

4. Scope language should be explicit
- Use Global, Profile, and Chat in the UI.
- Avoid using Session in primary UI copy unless discussing API or data-model behavior.

## Canonical terminology map

| Concept | Canonical UI label | Internal term (allowed in code/docs) | Avoid in primary UI |
|--------|--------------------|--------------------------------------|---------------------|
| Main conversation surface | Chat | session | conversation, thread, workspace conversation |
| Individual saved interaction history | Chat | session | session (except settings/debug/API contexts) |
| Discovery surface for add-ons | Marketplace | marketplace | extensions marketplace |
| Reusable instructions/workflows | Skills | skills | procedures (unless explanatory) |
| Installed/connected external capabilities | Integrations | extensions | connectors, extensions |
| Hermes-compatible external servers | MCP servers | MCP servers | extensions (when meaning MCP) |
| Packages that add automations/tools/hooks | Plugins | plugins | integrations (as a synonym) |
| Executable capabilities surfaced to the agent | Tools | tools | callable tools |
| Durable user facts | User memory | user memory | user profile |
| Durable environment/agent facts | Agent memory | agent memory | profile memory |
| Workspace boundary with defaults/policies/access | Profile | profile | user profile (unless truly user account profile) |
| Human approval queue | Approvals | approvals | approval-gated requests (as page title) |
| Technical health and debugging area | Diagnostics | diagnostics | loading semantics |

## Approved top-level navigation labels
- Chat
- Marketplace
- Skills
- Integrations
- Plugins
- Memory
- Profiles
- Settings

## Preferred replacements for current conflicting copy

### Sidebar
- “Active workspace runs and transcripts”
  -> “Your chats and chat history”
- “Installed · MCP Servers · Tools · Approvals · Diagnostics”
  -> “Installed integrations, MCP servers, tools, approvals, and diagnostics”
- “Custom tools, hooks, and integrations from plugins”
  -> “Automations, tools, and hooks added by plugins”
- “User profile, agent memory, context, and session recall”
  -> “User memory, agent memory, context, and chat history”
- “Active profile, policies, and session scope”
  -> “Active profile, defaults, policies, and access”

### Chat
- “Workspace conversation”
  -> “Chat”
- “Saved session”
  -> “Saved chat”
- “Temporary session”
  -> “New chat”
- “No skills pinned to this session yet”
  -> “No skills added to this chat yet”

### Marketplace
- “Discover and install extensions”
  -> “Discover skills, MCP servers, and plugins”

### Integrations
- “Callable tools”
  -> “Available tools”
- “Current loading semantics”
  -> “How availability works”
- “Session scoped”
  -> “Chat scoped”
- “Profile context”
  -> “Active profile”
- “Installed connectors...”
  -> “Manage installed integrations, MCP servers, tools, approvals, and diagnostics in one place.”

### Memory / Profiles
- “User Profile” (when referring to memory)
  -> “User memory”
- “Session search”
  -> “Chat history” where user-facing context allows it

## Terms to phase out from primary UI
- Extensions
- Connectors
- Callable tools
- Workspace conversation
- Session (for ordinary top-level user-facing labels)
- Thread
- User Profile (when meaning memory)
- Current loading semantics

## Notes
- Plugins and Integrations remain separate concepts in the UI.
- MCP servers are a subtype of Integrations.
- Tools are what the user/runtime can actually use; they are produced by Integrations and Plugins.
