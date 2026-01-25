# Changelog

## 0.4.42

**Streamlined setup wizard and cleaner output.**

The setup experience is now simpler with fewer prompts, and the server produces much cleaner terminal output.

### What's New

- **Simplified Setup Wizard** — Removed the rules detail level prompt (now always uses enhanced rules). Removed Windsurf editor support. MCP config now defaults to project-level instead of global+project.

- **Version Check on Setup** — When running `npx -y @contextstream/mcp-server setup`, you'll now see a warning if you're running an outdated cached version, with clear instructions to get the latest.

- **Cleaner Server Output** — New `CONTEXTSTREAM_LOG_LEVEL` environment variable controls verbosity:
  - `quiet` — Minimal output, errors only
  - `normal` (default) — Clean startup message
  - `verbose` — Full debug output (legacy behavior)

- **Reliable Publishing** — Added `prepublishOnly` hook to ensure builds happen before npm publish.

### Upgrading

```bash
npm install -g @contextstream/mcp-server@latest
```

Or re-run setup:

```bash
npx -y @contextstream/mcp-server@latest setup
```

---

## 0.4.41

**Bug fix release.**

Fixed an issue where npm publish wasn't including the latest build artifacts.

---

## 0.4.40

**Setup wizard improvements.**

- Added version check at setup start to warn about outdated cached versions
- Changed upgrade command to use `@latest` for reliable updates

---

## 0.4.35

**Stronger enforcement for ContextStream-first search.**

The hooks now block *all* Grep/Search operations, not just codebase-wide searches. If your AI tries to grep within a specific file, it gets redirected to use `Read()` instead.

### What's New

- **Smart index detection** — Hooks now only block local tools for projects that are actually indexed. If a project hasn't been indexed yet, local tools work normally so you're not stuck. Once you run `ingest_local`, hooks automatically start enforcing ContextStream-first behavior.

- **More aggressive hooks** — Previously, Grep/Search on specific file paths was allowed through. Now all Grep/Search operations are blocked with clear guidance: use `Read()` for viewing specific files, or ContextStream search for codebase queries.

### Upgrading

```bash
npm update @contextstream/mcp-server
npx -y @contextstream/mcp-server setup  # Re-run to update hooks
```

---

## 0.4.34

**Your AI assistant just got better at following instructions.**

This release focuses on making sure your AI actually uses ContextStream when it should—no more watching it grep through files when a single semantic search would do.

### What's New

- **Claude Code Hooks** — Optional hooks that automatically redirect local file searches to ContextStream's semantic search. Your AI gets better results faster, and you save tokens. Install with `npx -y @contextstream/mcp-server setup` or `generate_rules(editors=["claude"])`.

- **Smarter Reminders** — The API now reminds your AI to search ContextStream first, every time. Even if instructions drift during long conversations, the reminders keep it on track.

- **Lessons That Stick** — Made a mistake once? ContextStream surfaces relevant lessons before your AI repeats it. Past corrections now actively prevent future errors.

- **Automatic Update Prompts** — When your rules or MCP server version falls behind, you'll get a clear nudge to update. Updates are safe—your custom rules are preserved.

- **Notion Project Support** — Pages created via the Notion integration now link to your current project for better organization.

### Upgrading

```bash
npm update @contextstream/mcp-server
```

Or re-run setup to get the latest hooks:

```bash
npx -y @contextstream/mcp-server setup
```
