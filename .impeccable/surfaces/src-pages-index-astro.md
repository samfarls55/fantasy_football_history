---
version: 1
slug: "src-pages-index-astro"
primary_target: "src/pages/index.astro"
related_targets: []
---

# Home page

## Category clarity revision

Sam requested clarity in both the award meanings and section grouping. Keep the approved desktop geometry and original image files. Replace opaque public category labels with plain primary names: Best season without a title and Highest-scoring benched player. Rename Exhibits navigation to Featured records, and Recent history to Recently added. The Record book is the complete index; its Record column and row names use the same plain categories. Use heading hierarchy and navigation instead of helper paragraphs or secondary aliases. These user-requested copy changes supersede the comp's wording while preserving its visual layout. Existing exhibit identifiers can remain stable internally.

## Units and timeframe revision

Sam confirmed the clarified metrics made sense, then requested an Impeccable clarity pass because the screen had too many words. State All-time records · Regular season once above the gallery. The lead record uses +24%, PPG above league average, and 2024. PPG means points per game; the synthetic fixture compares 124 team points per game against 100 league points per team-game. The bench record retains Highest-scoring benched player, 38.7, points in one game, and Week 7 · 2023. Group its number and unit tightly; place the current team name beneath the complete portrait instead of a floating award badge.

Recently added becomes a compact record link with its complete crest, Best season without a title, The Monkey Buccaneers · 2024, and a chevron. Remove its repeated metric and explanation. Keep the record table's structure and concise matching units. Remove played-game counts from the home presentation at Sam's request; retain actual counts and eligibility in evidence, without assuming that every historical season had the same length. Preserve the visual world and desktop gallery topology. Current revision candidate: .impeccable/mocks/desktop-gallery-concise.png.

## Player-name correction

Sam approved all 14 plan and asset items, including the player-name correction, in review round 8. Display source.playerName beside the score. The current synthetic fixture uses Sample receiver; do not invent an actual league result or identify the current team portrait as that athlete. Preserve the 2025 Champion team-name caption and complete source portrait. The approved full-page reference .impeccable/mocks/desktop-gallery-player.png includes the name.

## Scope

Target: src/pages/index.astro. Mode: Experience. A public, desktop-led responsive league museum for members arriving from group chat. All-time achievements and disasters lead; the record book and exhibits are direct destinations; recent history follows. Build the home page with clearly marked sample records and current sourced team images. This task does not implement the full Sleeper importer or other archive pages. Stack: Astro and TypeScript; hosting remains open.

## Approved constraints

Use History on Demand. Keep the screen light, modern, and image-led. Show team and record names with one clear metric and result date; expose sample counts in evidence. Full-image framing is the default, with padding and room for wide logos, portraits, low-resolution images, long names, ties, and missing assets. Cropping is an optional enhancement, never a layout dependency. Current images are not proof of historical team identity. Sample records must remain visibly labeled. Details expose calculation and supporting evidence; never fake a historical route or an actual league result.

## Direction contract

THESIS: League history is a sequence of visual record stories, with the people and team identities leading rather than a dense statistics dashboard.

OWN-WORLD: A light canvas, violet navigation, pale aqua and lilac record fields, modern sans lettering, real team images, and restrained football icons.

STORY: A member notices a notable result, recognizes the team, opens its evidence, then explores records or exhibits.

FIRST VIEWPORT: Compact league identity and direct record/exhibit navigation precede one image-led achievement and a smaller contrasting disaster. Complete team images sit within padded frames. Desktop uses a broad, multi-column composition at 1440x900, with supporting exhibits and recent history visible near the lead record. Phones adapt into a single column.

FORM: Contemporary sports streaming chapter browser, grounded candidate 3 in re-roll 1. seed:cddb914a8311abbe. Signature interaction: opening an exhibit retains the team image and reveals its source context; reduced-motion navigation stays immediate.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance


## Approved composition

### User refinement after the build

Sam said the page still has too much on it and that square image edges conflict with the site's rounded components. Preserve the overall History on Demand design, original image pixels, record meanings, and evidence interactions. Reduce repeated table imagery and actions: record names link directly to evidence, and the index has Record, Team, Metric, and When columns. Use plain category headings and an unboxed Recently added entry. Give every source image a padded white frame with rounded outer corners, preserving the entire artwork. These requested refinements supersede the older comp's chips, small table images, separate Evidence column, blue recent field, and square image framing.

Sam explicitly instructed: "Keep the original logo; use the mockup only for layout". The original Monkey Buccaneers logo takes precedence over the generated mockup's redrawn logo, including the small record-table image. Preserve the actual source artwork and full-image framing.

Gallery + record index. Approved desktop reference: .impeccable/mocks/desktop-gallery-player.png, accepted in review round 8. A broad lead record sits beside a bench record and compact Recently added entry, above a full-width record table. Shared all-time and regular-season context appears once above the gallery. Use the authentic current source images in complete-image frames; the generated image is a layout reference, not an identity source.

## Prototype acceptance

On October 30, 2026, Sam accepted the implemented home-page prototype after the rounded-image and simplification changes. This approval covers its design and basic interactions using sample records. Further visual refinements are deferred and do not block continued product development. No specific additional visual changes were requested at acceptance.

Carry this frontend forward as the site's foundation. Real league history, automatic imports, and the remaining archive pages still need implementation. The inherited Impeccable approval-record issue remains separate from Sam's prototype acceptance.
