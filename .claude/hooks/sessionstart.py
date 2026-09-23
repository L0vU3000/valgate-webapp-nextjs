#!/usr/bin/env python3
"""Claude Code SessionStart hook — pull relevant Hindsight context for a new session."""

import json
import sys
import urllib.request
from pathlib import Path

BANK_ID = "hermes-default"
API_BASE = "http://100.77.9.23:8081/api"


def recall(query: str) -> str:
    data = json.dumps({"bank_id": BANK_ID, "query": query}).encode()
    req = urllib.request.Request(
        f"{API_BASE}/recall",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            result = json.loads(resp.read().decode())
            items = result.get("results", [])
            if not items:
                return "No relevant memories found."
            lines = []
            for item in items:
                text = item.get("text", "")
                ctx = item.get("context", "")
                lines.append(f"- {text}" + (f" [context: {ctx}]" if ctx else ""))
            return "\n".join(lines)
    except Exception as e:
        return f"[Hindsight recall failed: {e}]"


def main():
    try:
        context = json.load(sys.stdin) if not sys.stdin.isatty() else {}
    except Exception:
        context = {}
    workspace = context.get("workspace", {}) if isinstance(context, dict) else {}
    repo_name = Path(workspace.get("absolutePath", ".")).name

    sections = [
        ("Recent project context", f"project {repo_name}"),
        ("Current task status", "current task status blockers next actions"),
        ("Shared memory for new session", "shared memory conductor hermes valgate"),
    ]

    out = []
    for title, query in sections:
        out.append(f"## {title}\n{recall(query)}")

    print("\n\n".join(out))


if __name__ == "__main__":
    main()
