<!-- BEGIN ContextStream -->
# Workspace: Maker
# Project: mcp-server
# Workspace ID: ecb7007a-9271-4066-86eb-2a35da261d54

# Codex CLI Instructions
## ContextStream v0.4.x (Consolidated Domain Tools)

v0.4.x uses ~11 consolidated domain tools for ~75% token reduction vs previous versions.

### Required Every Message

| Message | What to Call |
|---------|--------------|
| **1st message** | `session_init(folder_path="<cwd>", context_hint="<user_message>")` |
| **2nd+ messages** | `context_smart(user_message="<user_message>", format="minified", max_tokens=400)` |
| **Capture decisions** | `session(action="capture", event_type="decision", title="...", content="...")` |
| **Before risky work** | `session(action="get_lessons", query="<topic>")` |
| **On user frustration** | `session(action="capture_lesson", title="...", trigger="...", impact="...", prevention="...")` |

### Quick Reference: Domain Tools

| Tool | Common Usage |
|------|--------------|
| `search` | `search(mode="semantic", query="...")` — modes: semantic, hybrid, keyword, pattern |
| `session` | `session(action="capture", ...)` — actions: capture, capture_lesson, get_lessons, recall, remember, user_context, summary, compress, delta, smart_search |
| `memory` | `memory(action="list_events", ...)` — CRUD for events/nodes, search, decisions, timeline, summary |
| `graph` | `graph(action="dependencies", ...)` — dependencies, impact, call_path, related, ingest |
| `project` | `project(action="list", ...)` — list, get, create, update, index, statistics |
| `workspace` | `workspace(action="list", ...)` — list, get, associate, bootstrap |
| `integration` | `integration(provider="github", action="search", ...)` — GitHub/Slack integration |
| `help` | `help(action="tools")` — tools, auth, version, editor_rules |

### Behavior Rules

- **First message**: Always call `session_init` with context_hint
- **Every message after**: Always call `context_smart` BEFORE responding (semantic search for relevant context)
- **For discovery**: Use `session(action="smart_search")` or `search(mode="hybrid")` before local repo scans
- **For code analysis**: Use `graph(action="dependencies")` or `graph(action="impact")` for call/dependency analysis
- **After completing work**: Always capture decisions/insights with `session(action="capture")`
- **On mistakes/corrections**: Immediately capture lessons with `session(action="capture_lesson")`

Full docs: https://contextstream.io/docs/mcp/tools
<!-- END ContextStream -->
