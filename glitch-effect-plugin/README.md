# Glitch Effect — Framer Code Component

A wrapper that tears, duplicates, and throws light-trail streaks and
corrupted noise patches over any layer in a quick burst, on a configurable
trigger — like a signal briefly tearing apart and reassembling. Unlike
[Sliced Text](../sliced-text-plugin), it isn't limited to text or an image
with a `color`/`src` prop it controls directly — it wraps *any* Framer layer
via a connector and glitches it generically: a shape, an image, text, an
SVG, or a whole component.

Built as a **Framer Code Component**: a single `.tsx` file you paste into a
Framer project's code panel. It renders live on the canvas and on the
published site, with every knob exposed in Framer's property controls panel
— not an editor-only tool.

## Use it in Framer

1. In your Framer project, open the **Assets** panel → **Code** → **+** →
   **New Code File**.
2. Name it `GlitchEffect.tsx` and replace the generated contents with the
   contents of [`src/GlitchEffect.tsx`](./src/GlitchEffect.tsx) in this repo.
3. Drag the **Glitch Effect** component from the Assets panel onto your
   canvas, on top of or near the layer you want to glitch.
4. Select the Glitch Effect layer. In the properties panel, the **Content**
   field is a connector, not a picker — drag from its outlet on the canvas
   to the layer you want wrapped (a shape, image, text, SVG, or another
   component). That target layer becomes `props.children`.
5. Configure the trigger and the rest of the controls (see below).

The wrapper sizes itself to whatever you connect as Content, and also
respects Framer's Fixed/Fill sizing if you resize its frame directly.
Streaks (and a torn band's own displacement) are allowed to bleed outside
that frame on purpose — clip the frame if you don't want that.

## Property controls

| Control | Type | Notes |
| --- | --- | --- |
| Content | Component | The layer to glitch. Connect it via the outlet, not the Content field's picker list. |
| Streak Direction | Enum | `Horizontal` (streaks/tear bands run left/right) or `Vertical` (run up/down). |
| Trigger | Enum | `Hover`, `Scroll Into View`, `Auto Loop`, `Random`, `On Load`. |
| Intensity | Number | 0–100, drives streak thickness/glow, tear/ghost displacement distance, and noise-block opacity. |
| Tear Content | Boolean | Cuts the content itself into bands that jitter apart during a burst — the object visibly comes apart, not just decoration around it. |
| Tear Bands | Number | 1–10. How many chunks Tear Content cuts the object into. Shown only when Tear Content is on. |
| Ghost Duplicate | Boolean | Adds two offset, recolored copies of the content itself (toward Streak Color 1/2) behind the real one — a chromatic/RGB-split duplicate of the object, not just a tint on decoration. |
| Streaks | Number | 0–16 light-trail streaks per burst. |
| Noise Blocks | Number | 0–12 corrupted-static patches per burst. |
| Streak Color 1 / 2 | Color | Used for both the decorative streaks and the Ghost Duplicate copies (default cyan/magenta). |
| Duration | Number | Seconds for a streak/block to pop in and fade back out. |
| Stagger | Number | Seconds of delay between each streak/block's pop-in. |
| Easing | Enum | `Smooth`, `Snappy`, `Elastic`, `Linear` — used for the fade back to rest. |
| Interval | Number | Auto Loop only. Seconds between bursts. |
| Min Interval / Max Interval | Number | Random trigger only. Bounds for the gap between bursts — re-rolled each time, so it reads as intermittent rather than a metronome. |
| Replay on Re-enter | Boolean | Scroll trigger only — replay the burst every time the layer re-enters the viewport, instead of once. |

## How it works

- **Tear Content** renders the connected layer N times (Tear Bands),
  stacked exactly on top of each other and each windowed to its own strip
  via `clip-path` — the same technique Sliced Text uses. While a burst is
  active, each band jitters through a short, seeded, per-band keyframe path
  on an infinite loop (so it keeps stuttering for as long as the trigger
  holds distort, not just once); at rest all bands sit at zero offset and
  reconstruct the original, intact layer.
  - Clipping a band tightly is correct *between* bands — that hard edge is
    the intentional tear — but the very first/last band and the whole
    cross-axis aren't seams, so they get a generous outward allowance
    instead of a tight clip, or a glow/shadow that naturally bleeds past
    the layer's own box gets cut into a flat rectangle at rest.
  - The seams between bands intentionally have **zero** overlap, unlike
    Sliced Text's small bleed. Sliced Text bleeds adjacent slices into each
    other by a fraction of a pixel so device-pixel rounding overlaps
    instead of gapping — correct there because the content is opaque flat
    color, where painting the same pixel twice is invisible. Content here
    can be translucent (a soft box-shadow glow, for instance), where that
    same overlap means two bands both paint the same semi-transparent
    sliver — which visibly *brightens* it into a seam, the opposite
    problem. A tiny gap in a blurred edge turned out to be far less
    noticeable than that double-paint brightening was, so there's no bleed
    here at all.
- **Ghost Duplicate** renders two more full copies of the connected layer,
  each recolored to a flat Streak Color 1/2 silhouette and offset to one
  side, jittering independently during a burst. The recolor uses an SVG
  filter (`feFlood` + `feComposite operator="in"`) that floods the color
  and then masks it to the layer's own alpha shape — a plain CSS
  `mix-blend-mode: color` overlay can't do this safely: blending a solid
  color against a mostly transparent backdrop still paints the *entire
  bounding box*, not just the visible pixels, which showed up as a solid
  colored square behind an object with transparent areas (a ring, for
  instance) until this was fixed.
- Streaks are thin gradient bars (`transparent → color → transparent`),
  deliberately sized wider/taller than the container and positioned so they
  bleed past its edges, with `box-shadow` for glow and
  `mix-blend-mode: screen` so they add light rather than paint a flat bar.
- Noise blocks are small rectangles filtered with a shared SVG
  `feTurbulence` + `feColorMatrix` + a discrete `feFuncA` alpha transfer,
  which produces chunky, colorful, blocky static rather than smooth cloud
  noise — closer to a corrupted-pixel look. One filter is defined per
  component instance (via `useId()`) so multiple instances on the same page
  don't collide.
- Every streak/block animates between a `rest` (invisible) and `distort`
  (visible) style target — not a self-resetting keyframe array. That
  distinction matters for Hover: a keyframe array like `[0, 1, 0]` plays
  once over its duration and then sits frozen at the final value even while
  still hovering, so it would look like it "turns itself off" after half a
  second. Driving it from the same external `rest`/`distort` state that
  Sliced Text uses means it stays lit for as long as the trigger holds it,
  and always animates back out cleanly when the trigger releases.
- The pop-in and fade-out use different transitions (fast/snappy in, slower
  out on the Easing curve) so a single two-state animation still reads as a
  flicker rather than a linear cross-fade.
- Hover toggles continuously on pointer enter/leave. Load, Scroll Into
  View, Auto Loop, and Random all fire the same one-shot burst — a JS
  timer flips back to rest after all streaks/blocks have had time to pop
  in — Auto Loop and Random just differ in how they schedule the *next*
  burst (fixed interval vs. a fresh random gap each time).
- Framer's design canvas renders overflow content unclipped and doesn't
  dispatch real hover events to code components, so all triggers are
  frozen (no timers, no animation) while `RenderTarget.current()` reports
  `canvas` — the burst only plays in Preview and on the published site.

## Local preview

```bash
npm install
npm run dev
```

Then open the printed local URL. The demo page recreates a glowing neon
ring (built from stacked `box-shadow`s, no image asset needed) and wraps it
— plus a text layer and a gradient block — with Glitch Effect across
several trigger modes.

Note: the preview aliases the `framer` import to a local no-op shim
(`src/framer-shim.ts`) via `vite.config.ts`, since the real `framer` npm
package bundles Framer's full canvas-rendering library and isn't meant to
run standalone. `GlitchEffect.tsx` itself is untouched — it still imports
from `"framer"` exactly as it needs to when pasted into an actual Framer
project.

## Project structure

```
glitch-effect-plugin/
├── src/
│   ├── GlitchEffect.tsx   # The Framer code component — copy this into Framer
│   ├── framer-shim.ts     # Local-preview-only stand-in for the "framer" package
│   └── main.tsx           # Vite preview harness (not part of the Framer component)
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Author

Felipe Linares ([me@flinbu.co](mailto:me@flinbu.co))
