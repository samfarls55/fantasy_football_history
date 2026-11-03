# Manager profile layout review

Status: B SELECTED for the desktop and mobile arrangement. Design interview remains in progress; no implementation is approved by this selection alone.

This review resolves Q33, the position and presentation of the manager's team-name and takeover timeline. It preserves the accepted compact career summary, Seasons/Rivalries/Players tabs, manager-versus-franchise identity boundary, and History on Demand visual system.

Three desktop mockups compare a side timeline, a timeline strip, and a timeline integrated with the season archive. A mobile adaptation shows the recommended timeline strip. These are images for review, not working routes.

- A: `.impeccable/mocks/a-side-timeline.png`
- B: `.impeccable/mocks/b-timeline-strip.png`
- C: `.impeccable/mocks/c-season-timeline.png`
- B on a phone: `.impeccable/mocks/b-timeline-strip-mobile.png`

Decision: Sam approved B and its phone adaptation: "We can use B. Yes." The takeover and rename remain visible above the local tabs, and the season archive keeps the full desktop width. On a phone the timeline becomes vertical and season results use two-line rows. A and C remain unselected alternatives.

Sam's follow-up requires consistent fonts, colors, and treatment at the top of every page. The selected arrangement remains B. Use the shared header and title roles in ../../platform-chrome.md rather than treating generated font/color variation as a new design token. The approved PNGs are preserved unchanged; this constraint supersedes their incidental variation.

All four workspace images were opened and inspected. Their generation and refinement prompts are in `renders.json`, prompt files, and image sidecars, with the exact final prompt embedded in each PNG. The provenance scan reports four rasters and zero missing origins. B and B-mobile have approval recorded in their sidecars. A and C are unapproved.

Q33 concerns the timeline arrangement and responsive hierarchy. These mockups are not a final inventory of profile statistics. The full screen contract must also place the spec's career points and playoff-appearance information, preserve ties, and use actual linked-season data. The sample has no tied games; a real record must show ties when present. The regular-season selector scopes the applicable game statistics, not championship history.

All results, manager identities, ownership events, and historical team names shown in the mockups are fictional and visibly marked Sample stats. The original Monkey Buccaneers artwork is a current source asset. Its appearance does not establish an actual manager, past team name, or championship. Shipping artwork must remain the original source pixels; generated renderings are layout references only.

The root application's code, approved comp, old review receipts, and inherited gate blocker are outside this review's write boundary. Questions and approvals stay in chat. No public calculation panels, operational status, or update dates belong in these mockups.

The timeline arrangement and its desktop/mobile examples are selected. Full-platform design review and the complete screen contracts remain in progress. No production implementation is authorized by these images alone.
