
## Check for pinned MCP server versions when updating

**Date:** 2026-01-05

**Trigger:** User updated MCP server globally with `npm update -g` and restarted Claude Code, but still got old version

**Impact:** Wasted time debugging why new version wasn't loading; old version 0.3.73 kept running instead of 0.4.4

**Prevention - Checklist when MCP server isn't updating:**
1. Run `claude mcp list` to check the actual command being used
2. Look for pinned versions like `@contextstream/mcp-server@0.3.73` instead of `@contextstream/mcp-server`
3. If pinned, run `claude mcp remove <name>` then re-add without version pin
4. Clear npx cache if needed: `npm cache clean --force`
5. Verify with `npx -y @contextstream/mcp-server --version`
6. After fixing config, restart Claude Code completely (Ctrl+C then `claude`)
