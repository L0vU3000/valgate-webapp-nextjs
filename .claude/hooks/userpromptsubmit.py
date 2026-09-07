#!/usr/bin/env python3
"""Claude Code UserPromptSubmit hook — inject only new Hindsight context since last check."""

import json
import sys
import time
import urllib.request
from pathlib import Path

BANK_ID = "hermes-default"
API_BASE = "http://100.77.9.23:8081/api"
LAST_CHECK_FILE = Path.home() / ".claude" / "hooks" / ".last_hindsight_check"
THROTTLE_SECONDS = 30


def recall(query: str) -> str:
    data = json.dumps({"bank_id": BANK_ID, "query": query}).encode()
    req = urllib.request.Request(
        f"{API_BASE}/recall",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read().decode())
            items = result.get("results", [])
            if not items:
                return ""
            lines = []
            for item in items:
                text = item.get("text", "")
                ctx = item.get("context", "")
                lines.append(f"- {text}" + (f" [context: {ctx}]" if ctx else ""))
            return "\n".join(lines)
    except Exception as e:
        return f"[Hindsight recall failed: {e}]"


def should_run() -> bool:
    now = time.time()
    if LAST_CHECK_FILE.exists():
        try:
            last = float(LAST_CHECK_FILE.read_text().strip() or "0")
            if now - last < THROTTLE_SECONDS:
                return False
        except ValueError:
            pass
    LAST_CHECK_FILE.parent.mkdir(parents=True, exist_ok=True)
    LAST_CHECK_FILE.write_text(str(now))
    return True


def main():
    try:
        context = json.load(sys.stdin) if not sys.stdin.isatty() else {}
    except Exception:
        context = {}
    prompt = context.get("prompt", "") if isinstance(context, dict) else ""

    workspace = context.get("workspace", {}) if isinstance(context, dict) else {}
    workspace_path = Path(workspace.get("absolutePath", "."))
    repo_name = workspace_path.name

    # Read Hermes inbox if present
    inbox_path = workspace_path / ".hermes" / "inbox.md"
    inbox_note = ""
    if inbox_path.exists():
        try:
            inbox_text = inbox_path.read_text().strip()
            if inbox_text:
                inbox_note = inbox_text
                # Clear after reading so it is not repeated
                inbox_path.write_text("")
        except Exception:
            pass

    if not should_run():
        if inbox_note:
            print(f"[Hermes inbox message]\n{inbox_note}\n---")
        return

    delta = recall(f"relevant context for: {prompt} in project {repo_name}")
    sections = []
    if inbox_note:
        sections.append(f"[Hermes inbox message]\n{inbox_note}")
    if delta and not delta.startswith("[Hindsight recall failed"):
        sections.append(f"[Hindsight delta context]\n{delta}")
    if sections:
        print("\n---\n".join(sections) + "\n---")


if __name__ == "__main__":
    main()
