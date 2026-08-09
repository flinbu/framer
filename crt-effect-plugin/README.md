# CRT Effect — Framer Code Component

A wrapper that puts an old-monitor look over an entire page or template:
barrel-lens screen curvature, chromatic fringing at the edges, scanlines, a
vignette, animated static grain, an irregular brightness flicker, and an
optional rolling sync bar — all as property controls, not a one-off
export. Connect a page's root layer as Content and every real element
underneath (buttons, links, forms) stays fully interactive; only the
visuals are affected.

Built as a **Framer Code Component**: a single `.tsx` file you paste into
a Framer project's code panel. Like [Glitch Effect](../glitch-effect-plugin),
it's a generic `ControlType.ComponentInstance` wrapper rather than
something that renders its own text/image — but where Glitch Effect
duplicates its Content into several layered copies (torn bands, ghost
duplicates), CRT Effect renders Content exactly **once**. This wraps a
whole live page, not a single decorative shape, so duplicating it would
duplicate real interactive elements — two overlapping copies of the same
button, both clickable.

## Use it in Framer

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

## A real limitation, not a bug: click targets don't warp with the curve

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

| Control | Type | Notes |
| --- | --- | --- |
| Content | Component | The page/layer to affect. Connect it via the outlet, not the Content field's picker list. |
| Clip Content | Boolean | On by default. Crops Content to this layer's own frame — off would let it overflow, which rarely makes sense for a whole-screen effect like this. |
| Corner Radius | Number | Rounds the frame's corners, for the physical monitor-bezel look. Shown only when Clip Content is on. |
| Curvature | Number | 0–100, barrel-lens bulge strength. See the click-target note above before pushing this high on an interactive page. |
| Chromatic Aberration | Number | 0–100, R/B channel fringing strength. Kept modest at max (a few px) so page text stays legible rather than becoming a decorative blur. |
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

Then open the printed local URL. The demo page wraps a small mock
template (nav, hero heading, two real `<button>` elements that update
on-screen state when clicked) across a default look, an everything-off
no-op comparison, a heavy/extreme configuration, a subtle barely-there
configuration, and a frame deliberately smaller than the page to show
Clip Content acting as a genuine crop window.

Note: the preview aliases the `framer` import to a local no-op shim
(`src/framer-shim.ts`) via `vite.config.ts`, since the real `framer` npm
package bundles Framer's full canvas-rendering library and isn't meant to
run standalone. `CRTEffect.tsx` itself is untouched — it still imports
from `"framer"` exactly as it needs to when pasted into an actual Framer
project.

## Project structure

```
crt-effect-plugin/
├── src/
│   ├── CRTEffect.tsx      # The Framer code component — copy this into Framer
│   ├── framer-shim.ts     # Local-preview-only stand-in for the "framer" package
│   └── main.tsx           # Vite preview harness (not part of the Framer component)
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Author

Felipe Linares ([me@flinbu.co](mailto:me@flinbu.co))
