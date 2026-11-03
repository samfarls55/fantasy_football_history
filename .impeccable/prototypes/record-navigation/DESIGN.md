---
name: Farls da bag league museum
description: The implemented History on Demand visual system.
colors:
  ink: '#0b1028'
  muted: '#51447f'
  violet: '#4908dc'
  aqua: '#e5fbfb'
  lilac: '#f1edfc'
  paper: '#fff'
  aqua-heading-ink: '#086c7d'
  lilac-heading-ink: '#520ad1'
  action-solid: '#4908f8'
  focus: '#7637e4'
  table-head: '#f4f4f8'
  table-border: '#e8e7f1'
  table-divider: '#edecf4'
typography:
  display:
    fontFamily: Anton, sans-serif
    fontSize: calc(121 * var(--u))
    fontWeight: 400
    lineHeight: 1
    letterSpacing: '0'
  headline:
    fontFamily: Roboto Condensed, sans-serif
    fontSize: calc(84 * var(--u))
    fontWeight: 900
    lineHeight: 0.94
    letterSpacing: -.025em
  title:
    fontFamily: Roboto Condensed, sans-serif
    fontSize: calc(40 * var(--u))
    fontWeight: 900
    lineHeight: 1.1
    letterSpacing: -.025em
  body:
    fontFamily: Roboto Condensed, sans-serif
    fontSize: calc(22 * var(--u))
    fontWeight: 400
  label:
    fontFamily: Roboto Condensed, sans-serif
    fontSize: calc(23 * var(--u))
    fontWeight: 700
    lineHeight: 1
  action:
    fontFamily: Urbanist, sans-serif
    fontSize: calc(25 * var(--u))
    fontWeight: 400
  table-value:
    fontFamily: Roboto Condensed, sans-serif
    fontSize: calc(26 * var(--u))
    fontWeight: 800
    lineHeight: 1.05
  evidence-value:
    fontFamily: Radio Canada, sans-serif
    fontSize: calc(58 * var(--u))
    fontWeight: 700
    lineHeight: 1
rounded:
  field: calc(14 * var(--u))
  action: calc(15 * var(--u))
  utility: 10px
  input: 8px
  source: 12px
  image: clamp(12px, 1vw, 16px)
spacing:
  s12: calc(12 * var(--u))
  s16: calc(16 * var(--u))
  s20: calc(20 * var(--u))
  s24: calc(24 * var(--u))
  s28: calc(28 * var(--u))
  s32: calc(32 * var(--u))
  image-inset: clamp(6px, .65vw, 10px)
components:
  button-primary:
    textColor: '{colors.paper}'
    typography: '{typography.action}'
    rounded: '{rounded.action}'
    padding: 0 calc(28 * var(--u))
    width: calc(256 * var(--u))
    height: calc(62 * var(--u))
  button-solid:
    backgroundColor: '{colors.action-solid}'
    textColor: '{colors.paper}'
    rounded: '{rounded.action}'
    padding: 0 calc(22 * var(--u)) 0 calc(26 * var(--u))
    width: calc(235 * var(--u))
    height: calc(56 * var(--u))
  button-copy:
    backgroundColor: '#f6f1fc'
    textColor: '#4b2098'
    rounded: '{rounded.utility}'
    padding: 10px 18px
  button-copy-hover:
    backgroundColor: '#e8ddf8'
  record-link-input:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
    rounded: '{rounded.input}'
    padding: 12px
    width: 100%
  navigation:
    textColor: '{colors.muted}'
  featured-record:
    backgroundColor: '{colors.aqua}'
    rounded: '{rounded.field}'
  supporting-record:
    backgroundColor: '{colors.lilac}'
    rounded: '{rounded.field}'
  recent-record:
    backgroundColor: transparent
    rounded: '{rounded.field}'
  source-image:
    backgroundColor: '{colors.paper}'
    rounded: '{rounded.image}'
    padding: '{spacing.image-inset}'
  record-index:
    backgroundColor: '{colors.paper}'
    rounded: '{rounded.field}'
  evidence-value:
    textColor: '#4908c9'
    typography: '{typography.evidence-value}'
  scope-select:
    textColor: '{colors.muted}'
    padding: 0 calc(38 * var(--u)) 0 calc(12 * var(--u))
    height: calc(36 * var(--u))
---

# Design System: Farls da bag league museum

## Overview

**Creative North Star: "History on Demand"**

History on Demand puts complete team images beside record names, large results, units, and dates. White space and pale record fields separate the stories. Violet marks actions, while dark condensed headings keep names readable at the scale of the image.

This system records the implemented home page. Its gallery and record index are one page composition, not a required template for every future page. The shared commitments are complete source artwork, clear record identity, concise copy, visible sample status, and evidence that retains the team context.

**Key Characteristics:**

- Complete source images in padded, rounded frames.
- Pale aqua and lilac record fields with unboxed recent links on white.
- Condensed names and heavy featured numbers.
- Direct evidence links with visible focus.

## Colors

White carries the page; cool pastel fields group records without competing with the source images. The frontmatter contains the normative values.

### Primary

Violet is the action color. The lead evidence action uses a violet gradient, and the supporting action uses the solid action variant. Selected navigation uses a violet underline. The focus color supplies the shared keyboard outline.

### Secondary

Aqua identifies the lead record field. Lilac identifies the supporting record field. Each uses a darker heading color without a separate heading fill. Recently added sits directly on the white page.

### Neutral

Ink carries names, headings, and table values. Muted violet carries dates, units, scope, and supporting text. Paper is the white page and table body. The table head, border, and divider tokens form the quiet index structure. Local variations in the featured metric and utility controls remain component treatments rather than extra global accents.

## Typography

Roboto Condensed is the main family for names, navigation, headings, body text, and the record table. Urbanist supplies evidence actions, the supporting player's name, and selected supporting details. Anton supplies the heavy featured metrics. Radio Canada supplies the evidence value. All four are self-hosted WOFF2 files in `public/fonts`; the CSS disables synthetic font styles.

### Hierarchy

The frontmatter records the desktop reference sizes. They use the page scale described in Layout. There is no uniform ratio across this role-based hierarchy.

- Display is the lead featured value. The supporting value uses the same Anton face at a smaller reference size of 93 units.
- Headline is the lead team name. The brand uses Roboto Condensed at 49 units and weight 900. Record-index titles use the title token.
- Body is the root text role. Table text uses 21 units; table units use 20. Evidence prose has a line height of 1.5 and a maximum measure of 65ch.
- Label is the plain lead category heading. The supporting and recent headings use 20 and 22 units. Record headings use sentence case; table column headers use uppercase.
- Action is the lead evidence link. The supporting action uses Urbanist at 23 units and weight 500. Record names in the index are the evidence links and retain the row-heading typography.
- Table value uses condensed text with tabular numbers. Evidence value uses Radio Canada at weight 700.

**The metric-role rule.** Use Anton for featured numbers, Radio Canada for evidence values, and Roboto Condensed for table values. Keep symbol and digit fitting inside the featured metric component.

The featured lead result splits sign, digits, and percent into separate spans. The sign has a fixed .5868em slot and a vertical and horizontal transform; the digits have a 1.2727em slot and horizontal expansion; the percent is compressed horizontally. The supporting number has its own horizontal expansion. These reproduce the approved numeric lettering and belong to those components only.

## Layout

Above 980px the home page uses a 1584px reference canvas through `--u: 0.063131313vw`. A value of 22 units therefore renders at 22px on that reference width. The header, page gutters, gallery dimensions, typography, and most spacing scale together. The frontmatter spacing entries are observed recurring steps, not a new mandatory spacing grid.

The implemented home gallery has a broad lead record and a narrower supporting column, with a 953:579 column ratio and a 17-unit gap. The supporting column divides into 370:190 rows with a 16-unit gap. The full-width record index follows with a 24-unit margin. These proportions describe this home page only.

At 980px and below, the scale becomes 1px and root text becomes 18px. The gallery becomes one column; supporting records initially share a row. Feature contents switch from positioned desktop composition to content grids. The table retains its table semantics while its rows become stacked record entries. At 800px the header becomes two rows. At 700px supporting records stack. At 600px the lead team spans the available width, action buttons fill their row, page gutters become 14px, and evidence uses smaller images and headings. The body minimum width is 320px.

The lead team name uses a responsive clamp at tablet and phone sizes, and category names can wrap. Desktop team captions have a two-line limit, while the supporting player's name uses ellipsis; both expand into wrapping text in the responsive layout. Dates, units, and metric groups remain adjacent rather than drifting into separate regions. The record index uses four columns, Record, Team, Metric, and When. Below 980px each entry has three rows, with metric and date sharing the final row.

**The complete-image rule.** Keep the complete source artwork visible by default. Use scale-down framing; a crop must be an optional enhancement, never a layout dependency.

All implemented team images use `object-fit: scale-down`, including the retained evidence identity. They do not depend on zoom or cropping. The record index uses team names without repeated thumbnails. A failed image becomes an accessible initials block. Current team names and portraits do not establish historical identity or identify the player named in a record.

## Elevation & Depth

Most content is flat. Tinted fields, white gutters, and thin table rules establish separation. Evidence actions have a small soft violet shadow. There are no general card-lift shadows, hard offset shadows, or background textures in this implementation.

**The quiet-depth rule.** Use tinted fields and spacing to separate content. The small violet action shadow supports the button; it does not lift every container.

The sidecar records the exact shadow, focus, and motion values because those properties are outside the frontmatter component schema.

## Shapes

Record fields and the record index share the field radius. Evidence actions use the slightly larger action radius. Copy controls, the readonly link input, and source-fixture block use their smaller utility radii. Team images sit inside padded white frames with the image radius, so their outer corners fit the rounded components. Scale-down fitting preserves all source pixels inside that frame. The accessible initials fallback keeps the same padding with a lilac fill and the source radius.

Chevrons are inline SVG with rounded line caps and joins. Their color follows the surrounding action. Category headings are plain text without colored chips.

## Components

### Evidence actions

The lead action is a white Urbanist label and chevron on a violet gradient. The supporting action is the solid violet variant. Desktop dimensions and padding are in the frontmatter. Responsive actions use content height with minimum heights of 52px for the lead and 48px for the supporting action; both fill their phone row.

Hover slightly darkens the filled action and moves its chevron 3px. Linked record names underline and turn violet on hover. All interactive controls share the 3px focus outline with a 5px offset. The copy button uses a light tinted fill, thin border, and a darker hover fill; its disabled state reduces opacity and stops the pointer cursor.

### Scope and link fields

The game-scope control is a native select with transparent fill and an inline downward chevron. It sits beside the record-index heading. Responsive select and linked record names have a minimum height of 44px.

The readonly record-link input appears when clipboard copying needs a manual fallback. It uses the input radius, a violet-tinted border, and the full available width. It is not a general editable form pattern or an established error-state system.

### Navigation

The header groups the league name, direct section links, and Sample stats status. The active location has both violet text and an underline. Hover underlines the link. On smaller screens the links occupy a separate row with horizontal overflow available if needed. The skip link becomes visible when focused.

### Record fields and index

A record field groups the category heading, identity, result, unit, timeframe, original team image, and evidence action. The compact recent record is unboxed, omits the repeated metric, and links through its identity block. The record index repeats the same record names and units in a bordered table on desktop and stacked entries below 980px. Its record names open evidence directly, without a separate action column or team thumbnails. A source-image fallback uses initials rather than a new illustration.

### Evidence reveal

A selected record opens inline through a shareable URL, retains its team image, and shows the measurement method, supporting facts, and source fixture. The selected heading receives focus. The reveal lasts 280ms with the recorded easing, moving upward from 8px with a 2px blur. Chevron motion lasts 160ms; color, filter, and background changes last 150ms. Reduced motion removes the reveal animation and chevron travel, and evidence scrolling becomes immediate. Brief color and filter transitions remain.

The evidence value uses the dedicated Radio Canada role. Sample status and the distinction between synthetic results and sourced images stay visible. No display treatment should turn the synthetic fixture into an actual league claim.

## Do's and Don'ts

### Do

- Do preserve the original team artwork, including the Monkey Buccaneers logo.
- Do contain complete artwork in a padded, rounded frame and keep initials fallbacks rounded.
- Do pair a result with its unit and timeframe, and retain the player name when the record measures a player.
- Do keep sample statistics visible as samples and retain the team image when revealing evidence.
- Do let long names wrap in the responsive layout and preserve the initials fallback when an image fails.
- Do keep keyboard focus visible and make evidence navigation immediate when reduced motion is requested.

### Don't

- Don't replace source artwork with a generated reinterpretation or use a current image as proof of historical identity.
- Don't apply the featured metric's symbol transforms or digit widths to general text or table numbers.
- Don't add taglines, repeated explanations, or secondary labels to compensate for unclear layout.
- Don't treat the home page's gallery proportions as a layout rule for every archive page.
