#!/usr/bin/env python3
"""
ContextStream Media-Aware Hook for Claude Code

This hook detects media-related prompts and injects context about
the ContextStream media tool capabilities.

Triggers on patterns like:
- Video editing, Remotion, timeline, clips
- Image/photo editing, thumbnails, visuals
- Audio, podcast, transcription
- Creative assets, media library

Install this hook via Claude Code settings:
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "*",
        "hooks": [{
          "type": "command",
          "command": "python3 ~/.claude/hooks/media-aware.py"
        }]
      }
    ]
  }
}
"""

import json
import sys
import os
import re

# Configuration
MEDIA_HOOK_ENABLED = os.environ.get("CONTEXTSTREAM_MEDIA_HOOK_ENABLED", "true").lower() == "true"

# Media-related patterns (case-insensitive)
MEDIA_PATTERNS = [
    # Video
    r"\b(video|videos|clip|clips|footage|keyframe|keyframes)\b",
    r"\b(remotion|timeline|video\s*edit|movie|film)\b",
    r"\b(frame|frames|scene|scenes|shot|shots)\b",
    # Image
    r"\b(image|images|photo|photos|picture|pictures)\b",
    r"\b(thumbnail|thumbnails|visual|visuals|graphic|graphics)\b",
    r"\b(screenshot|screenshots|banner|banners|poster)\b",
    # Audio
    r"\b(audio|podcast|transcript|transcription|voice|speech)\b",
    r"\b(sound|sounds|music|recording|recordings)\b",
    # Creative/General
    r"\b(media|asset|assets|creative|content\s*library)\b",
    r"\b(b-roll|broll|stock|footage\s*library)\b",
    # Actions
    r"\b(find\s*(a|the|some)?\s*(clip|video|image|audio|footage))\b",
    r"\b(search\s*(for)?\s*(video|image|audio|media))\b",
    r"\b(what\s*(video|image|clip|footage))\b",
    r"\b(show\s*me\s*(video|image|clip|footage|media))\b",
]

# Compiled patterns for efficiency
COMPILED_PATTERNS = [re.compile(p, re.IGNORECASE) for p in MEDIA_PATTERNS]

# Context to inject when media patterns are detected
MEDIA_CONTEXT = """
[MEDIA TOOLS AVAILABLE]
Your workspace may have indexed media assets. Use ContextStream media tools:

- **Search media**: `mcp__contextstream__media(action="search", query="your description")`
  - Semantic search across videos, images, audio, documents
  - Returns timestamps, transcripts, and match context

- **Index new media**: `mcp__contextstream__media(action="index", file_path="...", content_type="video|audio|image|document")`

- **Get clip for editing**: `mcp__contextstream__media(action="get_clip", content_id="...", start="1:34", end="2:15", output_format="remotion|ffmpeg|raw")`
  - `output_format="remotion"` returns frame-based props for Remotion Video component

- **List indexed assets**: `mcp__contextstream__media(action="list")`

- **Check status**: `mcp__contextstream__media(action="status", content_id="...")`

TIP: For Remotion projects, search for relevant clips first, then use get_clip with output_format="remotion".
[END MEDIA TOOLS]
""".strip()


def matches_media_pattern(text: str) -> bool:
    """Check if text contains any media-related patterns."""
    for pattern in COMPILED_PATTERNS:
        if pattern.search(text):
            return True
    return False


def main():
    if not MEDIA_HOOK_ENABLED:
        sys.exit(0)

    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError:
        sys.exit(0)

    # Get the user's prompt
    prompt = input_data.get("prompt", "")
    if not prompt:
        # Try to get from session messages
        session = input_data.get("session", {})
        messages = session.get("messages", [])
        if messages:
            # Get the last user message
            for msg in reversed(messages):
                if msg.get("role") == "user":
                    content = msg.get("content", "")
                    if isinstance(content, str):
                        prompt = content
                    elif isinstance(content, list):
                        # Handle content blocks
                        for block in content:
                            if isinstance(block, dict) and block.get("type") == "text":
                                prompt = block.get("text", "")
                                break
                    break

    # Check if prompt matches media patterns
    if not prompt or not matches_media_pattern(prompt):
        sys.exit(0)

    # Output the additional context to inject
    output = {
        "hookSpecificOutput": {
            "hookEventName": "UserPromptSubmit",
            "additionalContext": MEDIA_CONTEXT
        }
    }

    print(json.dumps(output))
    sys.exit(0)


if __name__ == "__main__":
    main()
