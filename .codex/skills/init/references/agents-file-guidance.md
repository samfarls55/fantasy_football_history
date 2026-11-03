# Project instruction writing

Apply the loaded `writing-for-agents` skill. The root `AGENTS.md` is scarce, always-loaded context. Include only stable information that changes agent decisions.

## Root AGENTS.md

Capture:

- What the project is and what the directory produces
- Who or what uses the output
- Stable scope boundaries and constraints
- Existing working conventions that cannot be discovered cheaply from project files
- This knowledge-sources pointer, adapted only when project paths differ:

  > Knowledge sources: Before answering or acting on work that depends on domain knowledge, you must consult and use both the shared knowledge vault at `C:\agent_work\knowledge-wiki` and this project's wiki when it exists. In the shared vault, read its root `AGENTS.md` and follow its pointers to the relevant index, pages, and sources. In the project wiki, read `wiki/AGENTS.md`, `wiki/index.md`, and the relevant material. Treat project-specific facts and decisions as authoritative for this project. Use the shared vault for reusable domain guidance. Record conflicts and follow project-specific material for this project. The lookup is complete only after you check both vaults or confirm that the project wiki does not exist. Put new durable project material in `wiki/inbox/` unless it belongs in human-facing documentation or a conventional project file.

Merge with existing instructions by meaning. Keep each rule in one authoritative place. Do not copy package scripts, directory listings, current tasks, or facts the agent can obtain from one cheap lookup.

## Project overview

Write `wiki/pages/project/overview.md` as maintained project memory. Include the project purpose, outputs, users, success definition, scope, constraints, and unresolved foundational questions. Link to supporting sources when they exist. Keep temporary execution state in a separate inbox note until the wiki develops a stable home for it.

## Initialization bookkeeping

Add the overview to `wiki/index.md` with a one-line description. Append this parseable log entry, using the current date and actual selected modules:

```text
## [YYYY-MM-DD] init | Project initialized

- Created or merged root project instructions.
- Added project overview.
- Enabled modules: module list or `none`.
```
