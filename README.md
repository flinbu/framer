# Framer

A collection of Framer plugins and code components, each kept in its own folder.

## Plugins

- [`sliced-text-plugin/`](./sliced-text-plugin) — **Sliced Text**, a Framer code
  component that cuts text or an image into strips and distorts them on
  hover, scroll, auto-loop, random, or load, with an optional
  chromatic-split glitch look. See its
  [README](./sliced-text-plugin/README.md) for how to add it to a Framer
  project and run the local preview.
- [`glitch-effect-plugin/`](./glitch-effect-plugin) — **Glitch Effect**, a
  Framer code component that wraps any layer (shape, image, text, SVG) and
  applies a selectable real-datamoshed look (liquid RGB-channel warp,
  position-jump hue cycling, or streaky melt/drip displacement), plus
  optional tearing, ghost duplicates, streaks, and noise blocks, on a
  configurable trigger. See its
  [README](./glitch-effect-plugin/README.md) for how to connect content to
  it and run the local preview.
- [`crt-effect-plugin/`](./crt-effect-plugin) — **CRT Effect**, a Framer
  code component that wraps an entire page or template and overlays an
  old-monitor look: barrel-lens screen curvature, chromatic fringing,
  scanlines, vignette, animated grain, flicker, and an optional rolling
  sync bar — all as property controls, with the real page underneath
  staying fully interactive. See its
  [README](./crt-effect-plugin/README.md) for how to connect a page to it,
  a real limitation worth knowing about before cranking Curvature, and how
  to run the local preview.
- [`accessibility-panel-plugin/`](./accessibility-panel-plugin) — **Accessibility
  Panel**, two Framer code components (a header button and a slide-in
  panel) offering Reduce Effects, Font Size, and High Contrast controls
  site-wide. Reduce Effects reaches Glitch Effect and CRT Effect with zero
  setup — the three plugins agree on a shared `localStorage`/event
  convention rather than connecting through the layer tree or depending
  on Framer's Variables feature. See its
  [README](./accessibility-panel-plugin/README.md) for how to drop it in
  and how that cross-plugin mechanism works.

## Author

Felipe Linares ([me@flinbu.co](mailto:me@flinbu.co))
