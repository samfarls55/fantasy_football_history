# Implementation verification

Local verification on November 3, 2026 covers the implemented v1 before independent code/finish reviews and release handling. Feature issues #2–#18 are integrated; #19 and parent #1 remain open. This record does not certify a deployment or close the inherited prototype tooling gate.

## Reproducible checks

Use Node.js 24 and the setup in [operations](operations.md). The recurring tests need no live provider requests:

```sh
npm ci
npm run test:publication
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium MUSEUM_PORT=4399 npm run test:browser
npm run check
npm run build
```

`MUSEUM_PORT` isolates a browser run's local server; omit it to use 4321. The browser suite publishes controlled Sleeper-shaped responses through real refresh into its dedicated store. Synthetic names, long names, ties, empty scopes and failed-image inputs are QA fixtures, not league facts. The application never serves those fixtures as fallback history.

The publication suite passed all 70 checks. The final complete browser suite passed all 47 checks, including five focused platform checks and the added year-wrapping regression after the two CSS corrections. Astro reports 0 errors, 0 warnings and 0 hints across 93 files, and the standalone production build succeeds.

## Acceptance evidence

| Scenarios | Observable checks |
| --- | --- |
| A01, A14 | Category links and contextual history across browser suites; `platform.spec.ts` adds Home → category → ranked bench performance → actual matchup → person-scoped player, a second-page shared URL, reload and Back. Main navigation resets all four sections from filtered views through desktop links and the phone keyboard Menu. |
| A02–A08 | Publication suites refresh controlled provider responses into a real durable publication and inspect visitor reads: linked seasons, separate careers/franchise owners, official overrides/zero/ties, exact decimal/rational calculations, completed/multiweek scopes, actual starts, later-full-week acquisition/drop attribution, corrections and retained history on failure. |
| A09–A11 | All 17 categories, cutoff ties/expansion, scoped histories, six-category Home/recent results, rivalry/nemesis variants, coherent cross-view official/player/bench corrections, a newly completed week, repeat refresh and last-good-publication behavior. Operator process tests inspect timestamps and success/failure output. |
| A12 | Production-server matrix across 30 route/state variants at 1440, 768, 390 and 320 CSS pixels, with keyboard skip/Menu/focus, long names, failed external images, tied/empty/invalid/blocked/no-start views and reduced motion. Native Chromium 200% zoom checks the same route/state variants and the Home-to-player journey. |
| A13 | Configurable source league and durable path, operator command/process checks, checked types, production build and built Node server; initial missing-publication routes return the shared 503 shell. Host/service/timer activation has not been verified because no host was provisioned. |

The source replay uses the 354 previously cached provider responses, with missing cache paths throwing. It creates a fresh publication with eight seasons, twelve people and 1,174 completed paired team performances. Representative actual-stat screenshots come from that publication; filenames and the local manifest distinguish them from synthetic QA. This bounded replay is dated source evidence, not a guarantee about future provider responses.

## Visual and interaction checks

The approved reference index is [DESIGN-BRIEF.md](../DESIGN-BRIEF.md). The comparison uses its selected Home, collection/category, profile/timeline, season, rivalry, matchup, player and bracket compositions, subject to the shared header/title role override. The captured routes reuse the shared header, use dark h1 headings and retain padded rounded complete artwork. Players categories use player initials without implying an owner/team picture is an NFL player portrait. Home independently resolves and captions the owning person's team artwork, preserving the original-pixel source-URL mappings.

The first batched inspection found mobile Seasons years inheriting the desktop 15% column width and Home's primary heading using supporting ink. Both were corrected with regression checks. An initial capture helper also followed a player link when testing Tab from a selected matchup fragment; its seven matchup checks, including six screenshots, were invalid evidence. The confirmation batch explicitly targets the skip link, preserves the matchup, and replaces those captures. Its 120 synthetic viewport checks, 12 actual-stat checks and 30 native-zoom checks report no capture or interaction errors. All 112 confirmation PNGs were inspected in contact sheets; the final manifest identifies these authoritative files. Existing matchup scoreboard name links use brand ink `#230b52` in `museum.css`, while the pinned title-area manager/team role specifies `#0b1028`. This is an explicit lead for the independent finish reviewer, not a claim that every title-area role has passed.

Actual 200% zoom uses installed Chromium's native `chrome://settings/appearance` page-zoom selector, saved readback at 2, and a fixed 1440 × 1000 window. The CSS viewport changes from 1440 × 913 to 720 × 456, DPR doubles from 1 to 2, and visual viewport scale remains 1. No pinch, CSS zoom or device-scale emulation substitutes for browser zoom. Full-document PNGs use CDP `Page.captureScreenshot` with the measured full-content clip; they are distinct from a viewport capture. Verification applies to this Chromium environment, not another browser or operating-system display scale.

## Detector and remaining review boundaries

One final detector invocation examined added/modified Astro/CSS targets since ticket #7, including Players/Rivalries profile changes and new page families. Its exact command, JSON and exit code are retained in the local handoff packet. It returned exit 2 with 49 findings: 36 color advisories, 12 radius advisories and one `overused-font` warning. This is not a clean detector verdict and does not replace the earlier ticket-7 invocation.

The font warning matches the `Roboto` prefix in the explicitly approved, self-hosted Roboto Condensed face. The rounded frame values implement the approved padded artwork and responsive profile/category scale. Color advisories are existing violet-family surfaces, dividers and supporting inks; shared header colors are explicitly pinned in `.impeccable/platform-chrome.md`. The historical design sidecar does not enumerate every implemented tone. These findings are retained with their visual disposition; no brand/font/radius redesign or sidecar repair was performed to suppress them.

The inherited original-logo/spec-hash receipt issue remains documented in `.impeccable/review/gate-blocker.md`. Its old prototype `responsive` phase and stale sidecar are not repaired or claimed complete. The historical lettering-fix `ship` verdict is scoped to that earlier fix, not this platform. Fresh independent finish review and documentation are owned by orchestration after this implementation packet. No PR, tracker mutation, deployment or integration merge is performed by ticket #19's implementer.

Ignored local review captures, scripts, native zoom readback and detector output are retained for the current handoff under the root checkout's `.impeccable/review/final/ticket-19/`. They are local review artifacts, not committed public/GitHub evidence. The tests and this document remain in Git after child worktrees are removed.
