# Agent Loop / Graph System

This project uses the agent-loop pattern: **PLAN → ACT → OBSERVE → VERIFY**.

The canonical Agent Loop Core source lives on the VPS:
`/home/hermes/development/projects/agent-loop-core-nightshift`

## How to use
1. Define a verifiable goal.
2. Run one concrete action.
3. Observe the result.
4. Verify with a separate check or reviewer.
5. Record outcome; if failed, loop.

## Project docs
- `AGENTS.md` / `CLAUDE.md` — codebase rules
- `.hermes/doc/CONTEXT.md` — project context
- `.hermes/prompts/conductor-instructions.md` — conductor brief

## Verification is the linchpin
Always separate the maker from the verifier. Claude-made → GPT verifies. GPT-made → Claude verifies.
