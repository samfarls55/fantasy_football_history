---
name: init
description: Initialize a working directory with project-specific agent context and a modular persistent wiki.
---

# Init

Set up the target directory as a project workspace with a root `AGENTS.md` and a project wiki. Treat an explicit `$init` invocation as authorization to add the proposed files inside the named directory. Existing content remains authoritative.

## Required writing dependency

Before creating or editing any file inside the target working directory, load and rely on the `writing-for-agents` skill. Read it completely, including the skill mechanics it requires for `AGENTS.md` or skill writing. Use its information hierarchy, context pointers, completion criteria, and pruning rules for every piece of writing produced during initialization. If the skill cannot be loaded, stop before the first target-directory write and report the missing dependency.

## Workflow

1. Resolve the target. Use the current working directory unless the user names another directory. Inspect its existing files, instructions, and project metadata before asking questions. The inspection is complete when you can distinguish known context from material gaps.
2. Read [references/interview.md](references/interview.md). Ask only the unanswered questions, with a maximum of five. The interview is complete when project purpose, output, users, scope, and durable constraints are clear enough to write stable project instructions.
3. Read [references/module-selection.md](references/module-selection.md). Select the smallest set of modules supported by the project evidence and interview. Tell the user which modules you selected and why.
4. Preview the deterministic setup before writing:

   ```bash
   python <skill-directory>/scripts/initialize_project.py <target> --modules <comma-separated-modules> --dry-run
   ```

   A clean preview has no untracked conflicting files. A tracked file that the project customized is preserved and reported.
5. If the preview is clean, run the same command without `--dry-run`. An explicit invocation already authorizes additive initialization. Stop for user direction if the script reports a conflict, because resolving it would overwrite or reinterpret existing project material.
6. Read [references/agents-file-guidance.md](references/agents-file-guidance.md). Write or carefully merge the root `AGENTS.md`, then write `wiki/pages/project/overview.md`. Preserve existing instructions and keep changing status out of root instructions.
7. Update `wiki/index.md` for the project overview. Append one initialization entry to `wiki/log.md`. Put any other material project facts, decisions, research, or agent-authored analysis created during initialization in `wiki/inbox/` for later integration.
8. Verify every expected path, the selected-module manifest, root knowledge-sources pointer, index entry, and log entry. Report created, preserved, and unresolved items. Initialization is complete only when a future agent can identify the project and discover both the project wiki and shared knowledge vault from the root `AGENTS.md`.

## Boundaries

- The wiki stores durable agent memory. Human-facing documentation, source code, generated build output, and ordinary tool configuration stay in their conventional project locations.
- `wiki/inbox/` is the capture queue. `wiki/sources/` holds immutable inputs. `wiki/pages/` holds maintained synthesis.
- The initializer adds files and directories. It does not initialize Git, install dependencies, move existing files, or overwrite conflicts.
- On a rerun, preserve project-customized managed files. Add newly selected modules and report template drift instead of replacing local edits.
