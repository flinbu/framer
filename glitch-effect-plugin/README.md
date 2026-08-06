# Glitch Effect — Framer Code Component

A wrapper that throws light-trail streaks and corrupted noise patches over
any layer in a quick burst, on a configurable trigger — like a signal
briefly tearing apart and reassembling. Unlike [Sliced Text](../sliced-text-plugin),
it doesn't cut or move the wrapped content at all; everything is a
transparent overlay, so it works over anything: a shape, an image, text, an
SVG.

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
Streaks are allowed to bleed outside that frame on purpose — clip the
frame if you don't want that.

## Property controls

| Control | Type | Notes |
| --- | --- | --- |
| Content | Component | The layer to glitch. Connect it via the outlet, not the Content field's picker list. |
| Streak Direction | Enum | `Horizontal` (streaks run left/right) or `Vertical` (streaks run up/down). |
| Trigger | Enum | `Hover`, `Scroll Into View`, `Auto Loop`, `Random`, `On Load`. |
| Intensity | Number | 0–100, drives streak thickness/glow and noise-block opacity. |
| Streaks | Number | 0–16 light-trail streaks per burst. |
| Noise Blocks | Number | 0–12 corrupted-static patches per burst. |
| Streak Color 1 / 2 | Color | The two streak colors, alternated per streak (default cyan/magenta). |
| Duration | Number | Seconds for a streak/block to pop in and fade back out. |
| Stagger | Number | Seconds of delay between each streak/block's pop-in. |
| Easing | Enum | `Smooth`, `Snappy`, `Elastic`, `Linear` — used for the fade back to rest. |
| Interval | Number | Auto Loop only. Seconds between bursts. |
| Min Interval / Max Interval | Number | Random trigger only. Bounds for the gap between bursts — re-rolled each time, so it reads as intermittent rather than a metronome. |
| Replay on Re-enter | Boolean | Scroll trigger only — replay the burst every time the layer re-enters the viewport, instead of once. |

## How it works

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
