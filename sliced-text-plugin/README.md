# Sliced Text — Framer Code Component

A text or image layer that cuts its content into strips and, on a
configurable trigger, kicks each strip out of alignment with a slight skew
and a chromatic ghosting pass — so it reads as torn apart and reassembled.

Built as a **Framer Code Component**: a single `.tsx` file you paste into a
Framer project's code panel. It renders live on the canvas and on the
published site, with every knob exposed in Framer's property controls panel
— not an editor-only tool.

## Use it in Framer

1. In your Framer project, open the **Assets** panel → **Code** → **+** →
   **New Code File**.
2. Name it `SlicedText.tsx` and replace the generated contents with the
   contents of [`src/SlicedText.tsx`](./src/SlicedText.tsx) in this repo.
3. Drag the **Sliced Text** component from the Assets panel onto your
   canvas.
4. Select the layer and configure it from the properties panel on the
   right (see [Property controls](#property-controls) below).

In text mode, the component sizes itself to its content (like a native
Framer text layer). In image mode, it sizes to the image's natural
dimensions unless you set the layer to a Fixed size. Either way it also
respects Framer's Fixed/Fill sizing if you resize the layer frame directly.

## Property controls

| Control | Type | Notes |
| --- | --- | --- |
| Content | Enum | `Text` or `Image` — switches which controls below apply. |
| Text | String | Text mode only. The content to slice. |
| Typography | Font | Text mode only. Family, weight, style, size, letter-spacing, line-height. |
| Color | Color | Text mode only. Text color. |
| Image | Image | Image mode only. The image to slice. |
| Slice Direction | Enum | `Horizontal` (strips stack top-to-bottom) or `Vertical` (strips sit side-by-side). |
| Slices | Number | 2–24 strips. |
| Trigger | Enum | `Hover`, `Scroll Into View`, `Auto Loop`, `On Load`. |
| Distortion | Number | 0–100, drives per-slice translation/skew magnitude. |
| Duration | Number | Seconds per slice's settle animation. |
| Stagger | Number | Seconds of delay between each slice's animation start. |
| Easing | Enum | `Smooth`, `Snappy`, `Elastic`, `Linear`. |
| Chromatic Split | Boolean | Adds ghost layers offset during distortion for a glitch look. |
| Split Color 1 / 2 | Color | Text mode only. The two ghost tint colors (default cyan/red) — change these if your text color washes one of them out. |
| Replay on Re-enter | Boolean | Scroll trigger only — replay the effect every time the layer re-enters the viewport, instead of once. |

## How it works

- Each slice is a full copy of the text, absolutely positioned over the
  same box and masked to its strip with `clip-path: inset(...)`
  (horizontal) or an equivalent vertical inset. Because the mask is on the
  wrapper and the text inside is untouched, moving/skewing a slice only
  displaces the visible strip — no re-layout, no font remeasuring.
- Per-slice offsets are pseudo-random but **deterministic** (seeded by
  slice index), so the same `sliceCount`/`intensity` always produces the
  same-looking break pattern instead of reshuffling on every re-render.
- All four triggers share one `rest` / `distort` state per slice:
  - **Hover** toggles it on mouse enter/leave.
  - **On Load** fires it once on mount, then settles back.
  - **Scroll Into View** uses `useInView` and fires the same one-shot pulse
    each time the layer enters the viewport (or once only, if "Replay on
    Re-enter" is off).
  - **Auto Loop** bypasses the rest/distort state entirely and instead
    animates each slice with an infinite mirrored keyframe loop.
- A visually-hidden span carries the real text for screen readers in text
  mode; in image mode the layer gets `role="img"` and an `aria-label` from
  the image's alt text instead. The sliced layers themselves are
  `aria-hidden`.
- Chromatic Split renders two extra full copies of the content, offset
  left/right by a constant amount, in addition to the base copy. In text
  mode these are recolored (a solid glyph fill tints cleanly) and blended
  with `mix-blend-mode: screen`. An image has no single fill to recolor, so
  in image mode its ghost copies stay the original photo and blend with
  `difference` instead — two near-identical copies offset by a few pixels
  naturally produce colorful fringing at contrast edges without needing to
  fake channel colors.

## Local preview

The sliced/distortion logic is easiest to iterate on in a browser instead
of round-tripping through Framer's editor. This repo includes a small Vite
harness that renders the same `SlicedText.tsx` file with a demo page for
each trigger mode, plus live sliders for the hover example.

```bash
npm install
npm run dev
```

Then open the printed local URL. Scroll through the page to see the load,
hover (with live controls), multi-line text, auto-loop, scroll-triggered,
and image-mode examples.

Note: the preview aliases the `framer` import to a local no-op shim
(`src/framer-shim.ts`) via `vite.config.ts`, since the real `framer` npm
package bundles Framer's full canvas-rendering library and isn't meant to
run standalone. `SlicedText.tsx` itself is untouched — it still imports
from `"framer"` exactly as it needs to when pasted into an actual Framer
project.

## Project structure

```
sliced-text-plugin/
├── src/
│   ├── SlicedText.tsx     # The Framer code component — copy this into Framer
│   ├── framer-shim.ts     # Local-preview-only stand-in for the "framer" package
│   └── main.tsx           # Vite preview harness (not part of the Framer component)
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Author

Felipe Linares ([me@flinbu.co](mailto:me@flinbu.co))
