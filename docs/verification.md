# Implementation verification

Local verification on November 3, 2026 covers feature implementations #2–#19 and the independent-review correction batch at immutable code commit `91ea45288dc5dacd3aa8abf8cf6e65b7d5f4e322`. The original code reviewers confirmed their findings resolved, and the original finish reviewer accepted the four scored visual fixes. This record preserves the completed local checks and their scope; it does not certify a deployment or close the inherited prototype tooling gate.

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

On that code commit, the publication suite passed all 74 checks and the complete browser suite passed all 49 checks using `/usr/bin/chromium` and isolated port 4391. Astro reported 0 errors, 0 warnings and 0 hints across 96 files, the standalone production build succeeded, and `git diff --check` passed. The existing profile and contribution checks also cover the shared-component and game-context refactors. That earlier final handoff changed only this document; its additional checks were the whitespace check and confirmation of that file-only diff.

## Pre-merge static-analysis cleanup

A subsequent targeted cleanup addresses the five annotations from PR #20's first SonarCloud check. Refresh accumulates source responses in a `Map` and constructs the archive's own-key JSON dictionary before publication. Year sorting now uses explicit string comparators, and the existing HTTP assertion strips tags without allowing overlapping opening brackets. The identical manager/franchise tenure continuation logic now shares one helper; each caller retains its own continuity and ownership decisions, including historical-name provenance. No analysis exclusions, gate thresholds or rendered interface files changed.

The complete publication suite passed all 74 checks again, and the browser suite passed all 49 checks with `/usr/bin/chromium` and isolated port 4397. Astro again reported 0 errors, 0 warnings and 0 hints across 96 files; the standalone production build and whitespace check passed. A controlled-provider comparison against `d13c57d6a1f24c63c045cd467061b34366ec9acc` produced byte-identical durable archives, retaining all 89 source paths in the same order, the unchanged repeat-refresh result and identical manager/franchise public reads. No new tests or visual captures were added for these refactors; the 112-image evidence below remains scoped to its original code commit.

These are local verification results. The first remote SonarCloud result failed its security, reliability and duplication conditions; the remote result for this cleanup must be read separately after publication. Local token comparison confirms the extracted manager/franchise match is reduced, but does not establish SonarCloud's project-wide duplication percentage.

## Independent code-review corrections

The Standards review's documented title-ink breach now uses `var(--ink)` for matchup manager/team links. Its three heuristic duplication findings are resolved with shared person/franchise profile controls and history tables, a shared actual-start-to-game projection for player and drop detail, and the existing `formatRecordValue` formatter in equivalent profile views. Person, franchise, owner and move contexts remain distinct.

The four confirmed Spec findings each have a failing-before/passing-after check through the agreed provider → refresh → durable publication → public read or browser boundary:

- Unequal played weeks now use one season-wide league PPG. The controlled 210-point/four-team-week example gives the ten-point team exact dominance `-1700/21`, with the same value in standings and season awards. The conflicting implementation-added metric sentence is corrected.
- A selected category result expands the visible rank boundary through its canonical rank. The rank-12 standings example stays visible through sorting, sharing and reload, while cutoff ties retain their canonical places.
- Zero-start pickups and drops remain ranked zero-value candidates with an unknown contribution period. They still appear as category leaders when eligible and do not invent a Recent date from the move itself.
- An omitted historical playoff-place setting renders an em dash in the season-format facts.

The original Standards and Spec reviewers each confirmed all four of their original findings resolved against the immutable correction commit. Their focused confirmations recorded nine contribution/drop publication checks and four Spec publication regressions passing. These scoped confirmations did not repeat a whole-branch review or a broad defect search.

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

The first batched inspection found mobile Seasons years inheriting the desktop 15% column width and Home's primary heading using supporting ink. Both were corrected with regression checks. An initial capture helper also followed a player link when testing Tab from a selected matchup fragment; its seven matchup checks, including six screenshots, were invalid evidence. The confirmation batch explicitly targets the skip link, preserves the matchup, and replaces those captures. Its 120 synthetic viewport checks, 12 actual-stat checks and 30 native-zoom checks report no capture or interaction errors. All 112 confirmation PNGs were inspected in contact sheets; the original manifest identifies those authoritative review inputs. The separately replaced phone Menu capture shows the full document top, open Menu and visible Records keyboard focus; the independent reviewer accepted that evidence without requiring a runtime Menu change.

The independent finish review requested four material corrections: preserve labels when tables stack at 720 CSS pixels/native 200%, keep directory headings full width, bound Records collection shared-leader previews, use primary ink for matchup identities, and round collection percentages for display. The first two responsive requirements are one finding. Profile and contribution tables now share the global 760-pixel reflow breakpoint, including visible field labels and grouped record/title facts. The collection previews at most two tied results, states the complete shared-result count, and links to the full ranking. A browser check independently works the 38 tied lowest-score results and opens all 38 canonical rank-one rows. Collection percentages use one display decimal while exact values and rank comparisons remain unchanged. Matchup identity links now use the pinned `#0b1028` ink. Original artwork is unchanged.

The correction batch was recaptured from its completed standalone production build in the same 112-view scope, separately from the original review inputs. All 112 authoritative `fixed-*.png` hashes, dimensions, requested viewports, document-top geometry and settled-render guards passed validation. Review helpers opened all 14 contact sheets and 11 original PNGs individually; no capture validity concern remained. The correction QA recorded 120 synthetic viewport checks, 12 actual-stat checks and 30 native-zoom checks with `errors: []`. The native-zoom Home → category → season-filtered result → selected matchup lineup → player → reload → Back journey passed. Synthetic and dated cached-provider source labels, publication hashes and viewport/full-document distinctions remain in the manifest. The application source hash was unchanged before and after capture.

The original finish reviewer scored all four material fixes **resolved**, observed no material regression in the scored views and returned `disposition: ship`. That verdict applies to those four fixes on the immutable code commit; it is not a new whole-branch finish review. The historical prototype lettering-fix verdict remains a separate earlier scope.

One interrupted preparation helper waited on offscreen lazy images that Chromium had not requested and produced three desktop PNGs before being stopped. Those files are retained separately as non-authoritative evidence and excluded from the final manifest. After the helper scrolled through the document before checking image readiness, the complete authoritative batch passed with exit 0. That preparation issue caused no application failure or code correction.

Actual 200% zoom uses installed Chromium's native `chrome://settings/appearance` page-zoom selector, saved readback at 2, and a fixed 1440 × 1000 window. The CSS viewport changes from 1440 × 913 to 720 × 456, DPR doubles from 1 to 2, and visual viewport scale remains 1. No pinch, CSS zoom or device-scale emulation substitutes for browser zoom. Full-document PNGs use CDP `Page.captureScreenshot` with the measured full-content clip; they are distinct from a viewport capture. Verification applies to this Chromium environment, not another browser or operating-system display scale.

## Detector and remaining review boundaries

One final detector invocation examined added/modified Astro/CSS targets since ticket #7, including Players/Rivalries profile changes and new page families. Its exact command, JSON and exit code are retained in the local handoff packet. It returned exit 2 with 49 findings: 36 color advisories, 12 radius advisories and one `overused-font` warning. This is not a clean detector verdict and does not replace the earlier ticket-7 invocation.

The font warning matches the `Roboto` prefix in the explicitly approved, self-hosted Roboto Condensed face. The rounded frame values implement the approved padded artwork and responsive profile/category scale. Color advisories are existing violet-family surfaces, dividers and supporting inks; shared header colors are explicitly pinned in `.impeccable/platform-chrome.md`. The historical design sidecar does not enumerate every implemented tone. These findings are retained with their visual disposition; no brand/font/radius redesign or sidecar repair was performed to suppress them.

No additional detector invocation was made for the correction batch. The raster provenance scan reported three rasters, zero missing prompts and exit 0. Its launcher was invoked through `sh` because of the file mode; that launcher detail was not an application failure.

The fresh documentation review returned `disposition: complete — ordinary extension; incumbent system preserved`. It checked the established History on Demand contracts and independently confirmed all 112 correction PNG hashes and dimensions with zero mismatches. `DESIGN.md` and `.impeccable/design.json` were preserved. Their pre-existing prototype font/scale/breakpoint, evidence-component, focus-offset and navigation/snippet drift remains disclosed; the current brief and pinned platform roles govern this extension. This bounded documentation check does not certify a complete canonical extraction or repair the historical sidecar.

The inherited original-logo/spec-hash receipt issue remains documented in `.impeccable/review/gate-blocker.md`. Its old prototype `responsive` phase and stale sidecar remain historical and unrepaired. No native prototype finish receipt, host, deployment or active timer is claimed. Release integration, PR and tracker handling are separate from these local verification results.

Ignored local review captures, scripts, native zoom readback, detector output and reviewer reports are retained under the root checkout's `.impeccable/review/final/`. The original capture packet is in `ticket-19/`; the correction manifest, validation and captures are in `review-fixes/`. These are local review artifacts, not committed public/GitHub evidence. The tests and this document remain in Git after child worktrees are removed.
