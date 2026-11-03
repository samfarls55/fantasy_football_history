# Issue tracker: GitHub

Issues and specs live in samfarls55/fantasy_football_history.
Use the gh CLI from this repository.

## Operations

Before creating issues, verify the target with:
gh repo view --json nameWithOwner

- Create: gh issue create --title "..." --body-file <file>
- Read: gh issue view <number> --json number,title,body,labels,comments
- List: gh issue list --state open --json number,title,labels
- Label: gh issue edit <number> --add-label "..."
- Comment: gh issue comment <number> --body-file <file>
- Close: post the explanation, then gh issue close <number>

Use body files for multiline content.

## Relationships

Use GitHub's native parent-child and blocking relationships.
Issue numbers and database IDs are different.

Get a database ID:
gh api repos/samfarls55/fantasy_football_history/issues/<number> --jq .id

Attach a child:
gh api --method POST repos/samfarls55/fantasy_football_history/issues/<parent>/sub_issues -F sub_issue_id=<child-database-id>

Add a blocker:
gh api --method POST repos/samfarls55/fantasy_football_history/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-database-id>

A ticket is ready when every blocker is closed.
Report unavailable native relationships rather than substituting text.

## Pull requests

PRs as a request surface: no.

When asked to open a PR, open a ready-for-review PR.

## Skill conventions

"Publish to the issue tracker" means create a GitHub issue.
"Fetch the relevant ticket" means read that GitHub issue.
