# CRT Effect — Framer Code Component

An old-monitor look for an entire page or template: barrel-lens screen
curvature, chromatic fringing at the edges, scanlines, a vignette,
animated static grain, an irregular brightness flicker, and an optional
rolling sync bar — all as property controls, not a one-off export.

This ships as **two components** that produce the same look via two
different mechanisms, because there's a real precision/convenience
tradeoff between them and neither side of it is strictly better:

- **`CRTEffect`** — a `ControlType.ComponentInstance` wrapper. You connect
  a specific layer (typically a page's root Stack/Frame) as Content, and
  only that connected subtree is affected. Every real element underneath
  (buttons, links, forms) stays fully interactive; only the visuals
  change. Precise and scoped, at the cost of one manual connect step.
- **`CRTEffectAuto`** — no Content connector at all. Drop it anywhere on a
  page with zero connections and it affects the *entire rendered page* by
  reaching outside its own render tree (`document.body.style.filter`, and
  `position: fixed` overlays that cover the viewport regardless of where
  the layer sits). Zero setup, at the cost of a real caveat — see its own
  section below before reaching for it.

Both are **Framer Code Components**: a single `.tsx` file you paste into
a Framer project's code panel. Like [Glitch Effect](../glitch-effect-plugin),
`CRTEffect` renders Content exactly **once** rather than duplicating it
into several layered copies the way Glitch Effect's tear/ghost layers
do — this wraps a whole live page, not a single decorative shape, so
duplicating it would duplicate real interactive elements (two overlapping
copies of the same button, both clickable). `CRTEffectAuto` doesn't
render Content at all, by design — see below.

## Use CRTEffect in Framer (connect a layer, precise/scoped)

1. In your Framer project, open the **Assets** panel → **Code** → **+** →
   **New Code File**.
2. Name it `CRTEffect.tsx` and replace the generated contents with the
   contents of [`src/CRTEffect.tsx`](./src/CRTEffect.tsx) in this repo.
3. Drag the **CRT Effect** component from the Assets panel onto your
   canvas. Resize its frame to cover the page/section you want affected —
   typically the same size as the page itself.
4. Select the CRT Effect layer. In the properties panel, the **Content**
   field is a connector, not a picker — drag from its outlet on the canvas
   to your page's root Stack/Frame (or any layer you want the effect
   applied to). That target layer becomes `props.children`.
5. Configure Curvature, Aberration, and the rest of the controls (see
   below).

## Use CRTEffectAuto in Framer (drop it, zero connections, whole page)

1. Same Assets → Code → New Code File flow, but name it
   `CRTEffectAuto.tsx` and paste in
   [`src/CRTEffectAuto.tsx`](./src/CRTEffectAuto.tsx) instead.
2. Drag it onto the canvas anywhere on the page — its position and size
   don't matter, since it doesn't wrap or connect to anything. On the
   canvas itself it shows as a small placeholder box so you can still
   select/move/delete it; that placeholder never appears in Preview or on
   the published site.
3. Configure the same controls as CRTEffect, minus Content, Clip Content,
   and Corner Radius (there's no connected box to crop to — see "How it
   works" below).
4. **Use only one instance per page.** Every instance writes straight to
   `document.body.style.filter`; a second instance on the same page
   overwrites the first's, they don't combine.

### The tradeoff, read before using CRTEffectAuto

Setting `filter` on `document.body` has a real, if lesser-known, CSS side
effect: it makes body the **containing block** for any `position: fixed`
*or* `position: sticky` element elsewhere on that page — a sticky nav, a
fixed modal, a cookie banner, or a custom cursor implemented as a
viewport-pinned element that tracks the pointer — the same way
`transform` on an ancestor does for `position: absolute` descendants.
Once Curvature or Aberration is above 0, any of those can visibly detach
from the viewport and drift with the page's own scroll/layout instead of
tracking the real cursor or staying pinned. This isn't a rare edge case —
the demo's own `auto-demo.tsx` includes a fixed nav specifically to catch
this, and confirmed it: at only 30/25 (the defaults), a nav that should
stay pinned at `y: 0` while scrolling instead drifted to `y: -96` after a
400px scroll.

`CRTEffectAuto` only touches `document.body.style.filter` at all when
Curvature or Aberration is actually above 0 — with both at 0 it leaves
`filter` unset entirely, so fixed/sticky elements are completely
unaffected (confirmed: the nav above stays exactly at `y: 0` after the
same scroll with both at 0). That removes the cost for anyone using Auto
for just the overlay effects (Scanlines, Vignette, Grain, Flicker, Roll
Bar, Tint), none of which touch `document.body` at all. But there's no
equivalent fix once you actually want Curvature or Aberration — CSS gives
no way to filter a whole page while exempting one specific fixed element
from the containing-block change. **If your page has anything
`fixed`/`sticky` that needs to keep behaving normally — a custom cursor
is exactly this case — and you want Curvature/Aberration, use `CRTEffect`
instead** and connect only the actual page content as Content, leaving
the cursor layer unconnected. `CRTEffect` only filters what's inside its
own connected subtree; an unconnected layer elsewhere on the page,
including a fixed-position custom cursor, is never touched and behaves
exactly as it would with no CRT component in the project at all.

## A real limitation shared by both: click targets don't warp with the curve

CSS/SVG filters (including the `feDisplacementMap` curvature here) are a
**paint-time** effect — the browser hit-tests clicks and taps against the
element's original, unwarped layout box, not against where the filter
visually moved its pixels. Near the center this is invisible since the
displacement is small there by construction, but near the edges of a
strongly curved screen, a button's visible position and its actual
clickable area can noticeably diverge. There's no way around this with a
CSS/SVG-based approach — genuinely remapping input coordinates to match a
visual warp needs a canvas/WebGL layer sitting between the page and the
user's pointer events, a much bigger build than the rest of this effect
combined. Keep Curvature modest on pages with interactive elements near
the edges, and test the actual click targets after enabling it.

## Property controls

Both components share every control below except the first three, which
only apply to `CRTEffect` — `CRTEffectAuto` has no connected box to crop
or round, since it affects the whole page directly.

| Control | Type | Notes |
| --- | --- | --- |
| Content | Component | **CRTEffect only.** The page/layer to affect. Connect it via the outlet, not the Content field's picker list. |
| Clip Content | Boolean | **CRTEffect only.** On by default. Crops Content to this layer's own frame — off would let it overflow, which rarely makes sense for a whole-screen effect like this. |
| Corner Radius | Number | **CRTEffect only.** Rounds the frame's corners, for the physical monitor-bezel look. Shown only when Clip Content is on. |
| Curvature | Boolean | **CRTEffectAuto only.** On by default. Carries an ⚠️ description (hover the ⓘ in Framer's panel) warning about the `document.body` containing-block side effect — see the tradeoff section above. `CRTEffect` has no equivalent toggle since it doesn't have that risk; there, Curvature is just the Number control below directly. |
| Curvature Amount *(CRTEffectAuto)* / Curvature *(CRTEffect)* | Number | 0–100, barrel-lens bulge strength. See the click-target note above before pushing this high on an interactive page. Shown only when Curvature is on (CRTEffectAuto only — always shown on CRTEffect). |
| Chromatic Aberration | Boolean | **CRTEffectAuto only.** On by default. Same ⚠️ description and reasoning as Curvature above — independent of it, so turning one off doesn't cover the other. |
| Aberration Amount *(CRTEffectAuto)* / Chromatic Aberration *(CRTEffect)* | Number | 0–100, R/B channel fringing strength. Kept modest at max (a few px) so page text stays legible rather than becoming a decorative blur. Shown only when Chromatic Aberration is on (CRTEffectAuto only — always shown on CRTEffect). |
| Scanlines | Boolean | On by default. Repeating horizontal dark lines. |
| Scanline Opacity / Spacing | Number | Darkness and pixel gap between lines. Shown only when Scanlines is on. |
| Vignette | Boolean | On by default. Darkens the corners/edges. |
| Vignette Opacity | Number | Strength of the corner darkening. Shown only when Vignette is on. |
| Grain | Boolean | On by default. Fine white static overlay. |
| Grain Opacity | Number | Strength of the static. Shown only when Grain is on. |
| Animate Grain | Boolean | On by default. Re-rolls the noise pattern a few times a second for a "dancing" analog-static look instead of a fixed texture. Shown only when Grain is on. |
| Flicker | Boolean | On by default. An irregular brightness dip, not a smooth pulse — real CRT flicker doesn't read as a metronome. |
| Flicker Intensity | Number | How dark the dips get. Shown only when Flicker is on. |
| Roll Bar | Boolean | Off by default. A faint horizontal band that scrolls down the screen and loops, like a CRT losing vertical sync briefly. |
| Roll Bar Speed | Number | Seconds for one full pass top-to-bottom. Shown only when Roll Bar is on. |
| Phosphor Tint | Boolean | Off by default. A flat color wash over the whole screen (green, amber, etc.), the way old monochrome monitors tinted everything. |
| Tint Color / Opacity | Color / Number | The tint's color and how strongly it's blended in. Shown only when Phosphor Tint is on. |

## How it works

- **Curvature** bakes a radial "barrel lens" displacement field into an
  offscreen `<canvas>` once (shared across every instance on the page via
  a module-level cache, since the field's *shape* never changes — only
  its strength does) and feeds it into an SVG filter's
  `feDisplacementMap` through `feImage`. The field uses the same
  coordinate-swap shape common to CRT shaders — the horizontal
  displacement at a point depends on its *vertical* distance from center,
  and vice versa — which is what produces bowed barrel sides rather than
  a uniform fisheye bulge. Because the field is baked at a fixed
  reference strength and `feDisplacementMap`'s own `scale` attribute
  dials the actual visible strength at render time, Curvature is a plain
  reactive number with **no animation loop** — turning the slider just
  re-renders the filter's `scale` attribute, unlike Glitch Effect's
  `requestAnimationFrame`-driven filters, none of which are static
  configuration the way this is.
  - `feImage`'s `x`/`y`/`width`/`height` are notorious for resolving
    inconsistently as percentages across browsers — the first version of
    this filter used percentages here, and instead of a symmetric bulge
    the entire page shifted hard to one side. Fixed by measuring the
    filtered element's actual pixel size via `ResizeObserver` and feeding
    `feImage` explicit pixel dimensions instead.
  - Channel value 128 = zero displacement in the baked field, matching
    `feDisplacementMap`'s own no-op midpoint, so `Curvature: 0` is a true
    identity transform, not an approximation of one.
- **Chromatic Aberration** splits the (already curvature-warped) image
  into R/G/B via three `feColorMatrix` primitives, nudges the R and B
  channels apart with a static `feOffset` (no animation — this is a
  constant fringe amount, not a drifting one like Glitch Effect's
  Datamosh), and recombines with `feBlend mode="screen"` — the same
  screen-reconstructs-the-original-at-zero-offset math Glitch Effect's
  Datamosh filter uses, verified the same way (a wrapped page at
  `Aberration: 0` is pixel-identical to the unwrapped page).
- **Grain** is a shared `feTurbulence` + `feColorMatrix` filter (turned
  into white noise with alpha driven by the turbulence's own luminance),
  screen-blended over the content at low opacity. With Animate Grain on,
  the turbulence's `seed` attribute is re-rolled every ~90ms via a direct
  `setAttribute` call through a ref — a real per-frame
  `requestAnimationFrame` loop isn't needed here, since analog static
  doesn't read as any smoother at 60fps than it does at ~10fps, so a
  plain `setInterval` is both simpler and cheaper.
- **Scanlines** and **Vignette** are plain CSS `repeating-linear-gradient`
  and `radial-gradient` overlays — no filter needed, since alternating
  transparent/semi-transparent stripes and a radial darken already
  composite correctly with normal alpha blending.
- **Flicker** and **Roll Bar** are both ordinary framer-motion `animate`
  keyframes on plain CSS properties (`opacity`, `top`) — unlike Glitch
  Effect's SVG filter primitive attributes (`feOffset`'s `dx`/`dy`,
  `feDisplacementMap`'s `scale`), these aren't restricted to
  `requestAnimationFrame` + direct DOM writes, since CSS properties *are*
  part of framer-motion's animatable style system. Flicker's keyframes
  use an irregular `times` array rather than evenly-spaced steps — real
  CRT flicker is a jittery dip, not a smooth periodic pulse, and a
  perfectly regular oscillation reads as mechanical rather than analog.
- Every overlay layer (scanlines, vignette, grain, flicker, roll bar,
  tint) is `pointer-events: none`, and Content itself is rendered
  directly as a normal sibling underneath them, not wrapped in anything
  that would intercept events — so the whole page stays clickable through
  the stack. See the click-target section above for the one thing this
  *doesn't* fully solve (hit-testing following the visual curvature).
- Curvature, Aberration, Scanlines, Vignette, and Tint are all static
  configuration, not a burst trigger, so they render on Framer's design
  canvas too — the frame preview is accurate while you're still
  designing. Only the continuous-motion pieces (Flicker, Roll Bar,
  Animate Grain) freeze on canvas, the same `RenderTarget.current() ===
  RenderTarget.canvas` convention [Glitch Effect](../glitch-effect-plugin)
  and [Sliced Text](../sliced-text-plugin) both use, since Framer's canvas
  doesn't dispatch real events and would otherwise just burn cycles
  animating something no one's watching.

### CRTEffectAuto's mechanism specifically

- On mount, a `useEffect` writes `document.body.style.filter =
  "url(#...)"` directly (the same filter definition CRTEffect uses,
  duplicated into this file since both are meant to be single
  self-contained pastes), and restores whatever was there before on
  unmount. This only runs in Preview/published — `document.body` doesn't
  correspond to a single live page while editing on Framer's canvas, so
  there's nothing sensible to mutate there, and the component renders a
  visible placeholder box instead so it stays selectable.
  - Skipped entirely — `document.body.style.filter` is left untouched —
    when the effective Curvature and Aberration strength are both 0. The
    filter would be a visual no-op at those settings either way, but the
    CSS `filter` property still triggers the containing-block change for
    fixed/sticky descendants regardless of whether the filter it points
    to actually does anything, so there's no reason to pay that cost when
    this instance isn't using either control. Both the Curvature and
    Chromatic Aberration Booleans and their 0–100 Number amounts feed
    into this — either being off (or the amount being turned down to 0
    manually) drives that control's contribution to 0. Turning one off
    doesn't cover the other; each carries the same risk independently,
    which is exactly why each has its own toggle and its own warning
    rather than one shared switch — a page's fixed/sticky elements can be
    broken by Aberration alone with Curvature fully off, or vice versa.
  - The Boolean toggles' `description` field (shown as a hover-over ⓘ in
    Framer's properties panel — any control type can carry one, this
    isn't unique to Booleans) is where the disclaimer actually lives,
    right at the control someone would reach for, rather than only in
    this README where it's easy to miss before turning something on.
- The overlay layers (scanlines, vignette, grain, flicker, roll bar,
  tint) are `position: fixed; inset: 0` with a very high `z-index`,
  which makes them cover the full viewport **regardless of where in the
  layer stack this component was dropped** — no measurement or targeting
  needed for those, since `position: fixed` already means "relative to
  the viewport, ignore your actual DOM position" by default. (This does
  assume no ancestor between this component and `<body>` already has its
  own `transform`/`filter`/`perspective` set, which would make *that*
  ancestor the containing block instead — an uncommon setup, but see the
  containing-block section above for why this class of quirk is worth
  knowing about at all.)
- Sizing the displacement map for `feImage` measures `document.body`
  itself via `ResizeObserver` (its full rendered box, not just the
  viewport) rather than a single connected element's box, so Curvature
  stays correct on pages taller than one screen.
- If [`accessibility-panel-plugin`](../accessibility-panel-plugin) is
  also in the project and its Reduce Effects setting is on, both
  `CRTEffect` and `CRTEffectAuto` bypass everything — Curvature,
  Aberration, and every overlay layer — with no connection or setup
  required; all three plugins just read the same `localStorage` key by
  convention. On canvas this is ignored on purpose, since Reduce Effects
  is a live user preference, not a design-time concern, and Curvature
  specifically is meant to stay visible on canvas so you can see what
  you're designing.

## A performance caveat worth knowing

`feDisplacementMap` (used here for Curvature) is not always
GPU-composited the way simpler filters like `blur()` often are — on a
large, complex, or frequently-repainting page (lots of scrolling content,
video, or its own animations underneath), a whole-page curvature filter
can be a genuinely heavier paint cost than the rest of this effect
combined. This is inherent to doing real page-wide lens curvature without
WebGL, not something tunable away. If a page feels sluggish with this on,
try lowering Curvature first — Aberration, Scanlines, Vignette, Grain,
Flicker, and Roll Bar are all comparatively cheap on their own.

## Local preview

```bash
npm install
npm run dev
```

Then open the printed local URL. That page (`index.html` /
`src/main.tsx`) demos **CRTEffect**: it wraps a small mock template (nav,
hero heading, two real `<button>` elements that update on-screen state
when clicked) across a default look, an everything-off no-op comparison,
a heavy/extreme configuration, a subtle barely-there configuration, and a
frame deliberately smaller than the page to show Clip Content acting as a
genuine crop window.

**CRTEffectAuto** has its own separate entry point,
`auto-demo.html` / `src/auto-demo.tsx` — open `/auto-demo.html` on the
same local server. It has to be a separate page rather than another
section on the same one, because CRTEffectAuto filters `document.body`
itself: sharing a page with the other demo sections would curve/fringe
all of them too, not just its own. That demo page also includes a real
fixed nav bar, unrelated to the effect, specifically so you can see the
containing-block caveat described above for yourself rather than taking
it on faith.

Note: the preview aliases the `framer` import to a local no-op shim
(`src/framer-shim.ts`) via `vite.config.ts`, since the real `framer` npm
package bundles Framer's full canvas-rendering library and isn't meant to
run standalone. `CRTEffect.tsx` and `CRTEffectAuto.tsx` themselves are
untouched — they still import from `"framer"` exactly as they need to
when pasted into an actual Framer project.

## Project structure

```
crt-effect-plugin/
├── src/
│   ├── CRTEffect.tsx      # Connector-based component — copy this into Framer
│   ├── CRTEffectAuto.tsx  # Zero-connection component — copy this into Framer
│   ├── framer-shim.ts     # Local-preview-only stand-in for the "framer" package
│   ├── main.tsx           # Vite preview harness for CRTEffect (not part of the component)
│   └── auto-demo.tsx      # Vite preview harness for CRTEffectAuto (not part of the component)
├── index.html
├── auto-demo.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Author

Felipe Linares ([me@flinbu.co](mailto:me@flinbu.co))
