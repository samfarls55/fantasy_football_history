---
name: create-agent
description: Design and create a deeply specialized user-level Codex agent persona.
disable-model-invocation: true
---

# Create Agent

Create one evidence-based agent persona with a narrow mandate, explicit boundaries, and a validated user-level TOML definition.

## 1. Frame the domain

Treat the user's invocation text as the initial persona description. If it is missing, ask what agent they want and wait.

Resolve `<agent-root>` once as `$CODEX_HOME/agents` when `CODEX_HOME` is set, otherwise `~/.codex/agents`. Use this resolved root for inventory, proposed destinations, collision checks, creation, and validation.

Inspect the existing user-level agents under `<agent-root>`. Read enough of each persona to identify:

- the domain it owns;
- the decisions and artifacts it produces;
- its exclusions and handoff boundaries;
- its runtime and instruction conventions.

Turn the request into a provisional design brief containing:

- mission;
- recurring invocation trigger;
- owned decisions and artifacts;
- required inputs;
- out-of-scope work;
- likely neighboring agents;
- observable success criteria.

Ask only questions whose answers would materially change the research or domain boundary. Complete this step when the research agent can work without guessing what the persona owns.

## 2. Commission research

Spawn a dedicated research subagent named `research_agent_<domain>`. Give it the provisional brief and a concise inventory of neighboring agents.

Its exclusive scope is to determine how to make an LLM unusually effective in this specific domain. Require it to research:

- how exceptional human practitioners perform the work;
- domain-specific workflows, heuristics, tools, and failure modes;
- instruction and context strategies supported by current LLM research or provider guidance;
- evaluation tasks that distinguish genuine expertise from plausible prose;
- boundary conditions that keep the persona siloed from existing agents;
- whether a fixed model or reasoning effort is unusually important to this persona.

Treat runtime inheritance from the Chief of Staff or spawning agent, according to the applicable `AGENTS.md` mapping, as the default. Require current primary or authoritative sources wherever available. Distinguish evidence from inference and include direct source links.

Give the research subagent read-only authority. Require it to return its findings in chat without creating files or changing external state.

Complete this step only when every recommended persona behavior is supported by domain practice, LLM evidence, or an explicitly labeled inference.

## 3. Establish the silo

Compare the proposed mandate with every existing agent. Define:

- one sentence describing what the new agent uniquely owns;
- positive invocation examples;
- cases it hands off to another agent;
- inputs it may advise on but does not own;
- outputs for which it is accountable.

If material overlap remains, propose the smallest boundary change that gives each agent exclusive ownership. Ask the user to resolve any boundary choice that would materially change the persona.

Prefer a narrow agent with reliable handoffs to a broad agent with ambiguous ownership. Complete this step when each relevant task has one clear owner.

## 4. Report and stop

Return the research directly in chat with these sections:

1. Recommended persona
2. Evidence and sources
3. Domain mandate
4. Exclusions and handoffs
5. Operating methods
6. Model and runtime recommendations
7. Evaluation scenarios
8. Open decisions

State the exact proposed agent name and destination path.

Create no files at this stage. End by requesting explicit approval to draft and install the proposed persona. Treat only a clear approval given after the report as authorization; questions, revisions, and general positive reactions keep the workflow at this gate.

## 5. Draft after approval

Proceed only when the user explicitly approves the persona described in the research report.

Load and apply `$writing-for-agents` before drafting the agent instructions. Reinspect the current agent examples so the result follows the live user-level conventions rather than a cached schema.

Use a hyphenated filesystem slug and, when required by the local convention, an underscore-separated internal name:

```text
<agent-root>/<agent-slug>/<agent-slug>.toml
```

Start with the locally supported core fields:

```toml
name = "<internal_name>"
description = "<one-line mandate>"
sandbox_mode = "<least authority needed>"

developer_instructions = """
...
"""
```

Treat the observed schema as empirical. Leave `model` and `model_reasoning_effort` undefined by default so the Chief of Staff or spawning agent can assign them through the mapping in `AGENTS.md`.

Add `model` only when the persona's effectiveness depends unusually strongly on a particular model. Add `model_reasoning_effort` only when fixing the effort at the persona level is independently important. A fixed model with inherited reasoning effort is valid and often preferable. Keep `AGENTS.md` authoritative and unchanged for default routing; treat persona-local runtime fields as explicit, evidence-backed exceptions included in the approved persona.

Write `developer_instructions` as an executable role specification containing:

- identity and unique mandate;
- owned decisions and artifacts;
- explicit boundaries and handoffs;
- a repeatable operating loop;
- completion criteria for each stage;
- domain-specific methods and heuristics;
- evidence and uncertainty rules;
- collaboration and escalation behavior;
- response contract;
- evaluation-oriented success criteria.

Encode positive target behavior wherever possible. Preserve one source of truth for every rule.

If the destination already exists, show the collision and obtain separate approval before replacing or materially modifying it.

## 6. Review and validate

Before completing the installation:

- parse the TOML with an available TOML parser;
- verify folder, filename, and internal-name consistency;
- verify that the internal name is unique across user-level agents;
- check multiline strings and escaping;
- confirm that every research-backed requirement appears in the instructions;
- test the persona against the evaluation scenarios;
- audit overlap with existing agents again;
- validate any configured model, reasoning effort, and sandbox value against current runtime support;
- revise until the persona passes every check.

Create only the persona directory and TOML file. Persist no research notes, drafts, or auxiliary documentation.

Report the created path, the persona's mandate, the validation performed, and any remaining limitation.
