# blender-production

An agent skill for building, refining, inspecting, rendering and visually verifying
Blender projects — via Blender's Python API and MCP.

Used to build a full 3D reconstruction and flythrough of Frank Lloyd Wright's
Fallingwater: **https://fallingwater-astra.vercel.app**

## Install

```bash
npx skills add per-simmons/blender-production
```

Or drop the folder into your agent's skills directory:

- Codex — `~/.codex/skills/blender-production`
- Claude Code — `~/.claude/skills/blender-production`

## What's in it

| Path | What it does |
|---|---|
| `SKILL.md` | The workflow: establish the session, translate the brief into checks, build in dependency order, benchmark delivery, verify |
| `references/control.md` | API/MCP selection, scoped session control, dependency failures, recovery |
| `references/realism.md` | Appearance methods and diagnostic vocabulary |
| `references/rendering.md` | Render performance, resumable sequences, benchmarking the real scene |
| `references/qa-delivery.md` | Visual QA and delivery checks |
| `references/validation.md` | Scope of the skill's own checks |
| `scripts/probe_scene.py` | Bounded scene/asset/device diagnostics, run inside Blender |
| `scripts/benchmark.py` | Summarise phase costs and warm timings from JSONL frame logs |
| `scripts/sequence_tools.py` | PNG integrity/dimension checks, gap-free sequence encoding |
| `scripts/file_bridge.py` | File transport helper |

## Requires

Blender (tested on 5.1.2) and a Blender MCP server for live scene inspection.

## Licence

MIT
