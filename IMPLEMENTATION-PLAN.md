# Full-platform implementation plan

Status: APPROVED AND PUBLISHED. Sam approved the 18-ticket breakdown. All child issues are published under [spec #1](https://github.com/samfarls55/fantasy_football_history/issues/1), labeled ready-for-agent, with GitHub's native parent-child and blocking relationships. Implementation is in final verification. Feature issues #2–#18 are closed; #19 and parent #1 remain open pending independent reviews and the ready-for-review PR. See [docs/verification.md](docs/verification.md).

## Start here

The published GitHub issues are the execution task graph. Their acceptance criteria carry the approved scope; their native blockers determine the ready frontier. This document is the publication snapshot and replaces the earlier 13-ticket outline.

Read [SPEC.md](SPEC.md), [DESIGN-BRIEF.md](DESIGN-BRIEF.md), [docs/metrics.md](docs/metrics.md) and [docs/requirements.md](docs/requirements.md). The design brief links the selected desktop/phone references and defines routine route variants. Preserve original artwork, the shared header and the approved category-first flow.

Repository, remote, issue destination, shared workflow configuration and triage labels are already configured. Do not repeat setup. Hosting/persistence/refresh execution and license choices remain the work of [#3](https://github.com/samfarls55/fantasy_football_history/issues/3).

The current application remains the synthetic Astro/TypeScript Home prototype. Publishing tickets does not implement the importer, durable history, complete platform routes or automatic refresh.

## Published task graph

Numbers in the left column are the approved proposal numbers. Linked issue numbers are the real GitHub identifiers. Only direct blockers are listed; ancestors are implied by the graph.

| Proposal | GitHub ticket | Blocked by |
| --- | --- | --- |
| 1 | [#2](https://github.com/samfarls55/fantasy_football_history/issues/2) Verify historical Sleeper coverage | None |
| 2 | [#3](https://github.com/samfarls55/fantasy_football_history/issues/3) Choose durable storage and automatic refresh execution | None |
| 3 | [#4](https://github.com/samfarls55/fantasy_football_history/issues/4) Import linked seasons into browsable standings | [#2](https://github.com/samfarls55/fantasy_football_history/issues/2), [#3](https://github.com/samfarls55/fantasy_football_history/issues/3) |
| 4 | [#5](https://github.com/samfarls55/fantasy_football_history/issues/5) Browse official matchups and historical lineups | [#4](https://github.com/samfarls55/fantasy_football_history/issues/4) |
| 5 | [#6](https://github.com/samfarls55/fantasy_football_history/issues/6) Revisit championships and playoff brackets | [#5](https://github.com/samfarls55/fantasy_football_history/issues/5) |
| 6 | [#7](https://github.com/samfarls55/fantasy_football_history/issues/7) Follow manager careers and tenure timelines | [#6](https://github.com/samfarls55/fantasy_football_history/issues/6) |
| 7 | [#8](https://github.com/samfarls55/fantasy_football_history/issues/8) Follow franchise history across owners | [#7](https://github.com/samfarls55/fantasy_football_history/issues/7) |
| 8 | [#9](https://github.com/samfarls55/fantasy_football_history/issues/9) Compare career records through category rankings | [#7](https://github.com/samfarls55/fantasy_football_history/issues/7) |
| 9 | [#10](https://github.com/samfarls55/fantasy_football_history/issues/10) Discover scoring extremes, margins and streaks | [#9](https://github.com/samfarls55/fantasy_football_history/issues/9) |
| 10 | [#11](https://github.com/samfarls55/fantasy_football_history/issues/11) Compare season dominance and schedule outcomes | [#9](https://github.com/samfarls55/fantasy_football_history/issues/9) |
| 11 | [#12](https://github.com/samfarls55/fantasy_football_history/issues/12) Explore scoped starting-player contributions | [#8](https://github.com/samfarls55/fantasy_football_history/issues/8) |
| 12 | [#13](https://github.com/samfarls55/fantasy_football_history/issues/13) Rank high-scoring bench performances | [#9](https://github.com/samfarls55/fantasy_football_history/issues/9), [#12](https://github.com/samfarls55/fantasy_football_history/issues/12) |
| 13 | [#14](https://github.com/samfarls55/fantasy_football_history/issues/14) Rank productive waiver and free-agent pickups | [#9](https://github.com/samfarls55/fantasy_football_history/issues/9), [#12](https://github.com/samfarls55/fantasy_football_history/issues/12) |
| 14 | [#15](https://github.com/samfarls55/fantasy_football_history/issues/15) Rank dropped players who contributed elsewhere | [#14](https://github.com/samfarls55/fantasy_football_history/issues/14) |
| 15 | [#16](https://github.com/samfarls55/fantasy_football_history/issues/16) Compare rivalries and identify nemeses | [#8](https://github.com/samfarls55/fantasy_football_history/issues/8) |
| 16 | [#17](https://github.com/samfarls55/fantasy_football_history/issues/17) Connect the six-record Home to real history | [#10](https://github.com/samfarls55/fantasy_football_history/issues/10), [#11](https://github.com/samfarls55/fantasy_football_history/issues/11), [#13](https://github.com/samfarls55/fantasy_football_history/issues/13), [#15](https://github.com/samfarls55/fantasy_football_history/issues/15) |
| 17 | [#18](https://github.com/samfarls55/fantasy_football_history/issues/18) Refresh and correct the complete archive automatically | [#16](https://github.com/samfarls55/fantasy_football_history/issues/16), [#17](https://github.com/samfarls55/fantasy_football_history/issues/17) |
| 18 | [#19](https://github.com/samfarls55/fantasy_football_history/issues/19) Verify the complete platform and implementation handoff | [#18](https://github.com/samfarls55/fantasy_football_history/issues/18) |

## Original ready frontier

At publication, the initial unblocked tickets were [#2](https://github.com/samfarls55/fantasy_football_history/issues/2), historical source coverage, and [#3](https://github.com/samfarls55/fantasy_football_history/issues/3), durable storage and automatic refresh execution. They could proceed independently. Coverage findings must identify unsupported claims without silently changing the approved ranking windows.

Once both are complete, [#4](https://github.com/samfarls55/fantasy_football_history/issues/4) delivers the first import-to-public standings slice. After manager profiles, franchise history and career rankings branch independently. Scoring records, season comparisons, player contributions and rivalries then provide further parallel work.

The Home ticket joins the required record categories. Complete-archive refresh follows Home and rivalries so its correction tests can inspect every affected public view. Final verification follows that integration.

All tickets include their own meaningful behavior checks. The final verification ticket is for cross-platform acceptance and whole journeys, not permission to defer every feature's testing or responsive usability until the end.

## Execution contracts

- Test through controlled provider responses, the real import/refresh entry point and observable public history. Prefer this agreed application boundary over private-function tests.
- Use exact source scores, supported identity/timing facts and the selected game scopes. A missing required input blocks the affected claim; a required blocked claim prevents declaring the full v1 complete.
- Keep public method/source panels, freshness/status indicators, draft boards, exhaustive transaction feeds and unsupported counterfactual lineup claims excluded.
- Each feature slice includes its data-to-public behavior and verification. The first two tickets are bounded feasibility/delivery prerequisites; no speculative prefactoring ticket is required.
- Use the issue tracker's actual parent-child and blocking relationships. Do not substitute text mentions for native edges.
- Keep all implementation work on the implement-spec workflow's reviewable integration branch. Sam's ready-for-review PR instruction overrides the skill's draft-PR step.
- Issue publication does not start implementation or authorize paid-service provisioning or public deployment.

## Requirement coverage and publication record

[docs/requirements.md](docs/requirements.md) maps all 54 original story IDs and six walkthrough additions to the published issues. Public removals remain explicit.

The accepted proposal, exact issue-body files, publication journal and relationship verification report are retained in the designated review scratch area. No parent issue body, title, state, labels or comments were edited by ticket publication; native sub-issue attachments supply its child list.
