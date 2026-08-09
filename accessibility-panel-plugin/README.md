# Accessibility Panel — Framer Code Components

A site-wide accessibility panel: a button you drop into your header,
and a slide-in panel with **Reduce Effects** (turns off
[CRT Effect](../crt-effect-plugin) and [Glitch Effect](../glitch-effect-plugin)
site-wide), a **Font Size** stepper, and a **High Contrast** toggle — all
persisted across page loads and reachable by keyboard (Escape to close,
focus returns to the button that opened it).

Built as **two separate Framer Code Components** that never connect to
each other through the layer tree — only through a shared, plain
`window` event + `localStorage` mechanism. That's a deliberate choice:
Framer's own Variables feature can bind a value to a property control,
but doesn't reach into unrelated components elsewhere on the page (which
is exactly what "turn off CRT Effect and Glitch Effect wherever they are
on this page" needs), and Variables aren't available on every Framer
plan. This works regardless — drop the button in your header, drop the
panel anywhere else, and they find each other at runtime.

## Use it in Framer

1. In your Framer project, open the **Assets** panel → **Code** → **+** →
   **New Code File** twice: once named `AccessibilityToggleButton.tsx`
   (paste in [`src/AccessibilityToggleButton.tsx`](./src/AccessibilityToggleButton.tsx)),
   once named `AccessibilityPanel.tsx` (paste in
   [`src/AccessibilityPanel.tsx`](./src/AccessibilityPanel.tsx)).
2. Drag **Accessibility Toggle Button** into your header component,
   wherever you want the icon to sit.
3. Drag **Accessibility Panel** anywhere else on the page (its position
   doesn't matter — it renders as a fixed drawer regardless of where you
   drop it, the same way [CRTEffectAuto](../crt-effect-plugin) does).
   Configure its colors, labels, and Font Size min/max/step to taste.
4. That's it — no connecting, no Variables, no Interactions to wire up.
   Click the button on the published site and the panel slides in.
5. If you're also using **CRT Effect** or **Glitch Effect** on the same
   page, Reduce Effects already reaches them with no setup — see "How it
   works" below for why that's true without any of these three plugins
   knowing about each other.

## Property controls

### Accessibility Toggle Button

| Control | Type | Notes |
| --- | --- | --- |
| Icon | String | Defaults to ♿. Any text/emoji works. |
| Aria Label | String | Screen-reader label for the button. |
| Size | Number | Diameter in px. |
| Background / Icon Color | Color | |

### Accessibility Panel

| Control | Type | Notes |
| --- | --- | --- |
| Position | Enum | `Left` or `Right` — which edge the panel slides in from. |
| Width | Number | Panel width in px. |
| Title | String | Panel heading. |
| Background / Text / Accent Color | Color | Accent is used for the switches' "on" state. |
| Reduce Effects Label / Font Size Label / High Contrast Label | String | Row labels — translate these directly, no code changes needed. |
| Font Scale Min / Max / Step | Number | Bounds and increment for the Font Size stepper (defaults 80%–160%, 10% steps). |
| Custom Switch (On) / Custom Switch (Off) | Component | Optional. Connect your own switch component here — in its "on" look and its "off" look, as two separate connections — to use it in place of the built-in switch on every toggle row. Leave either one empty to keep the default. See "Using your own Switch component" below. |

## How it works

- **The shared state** is a plain `window.dispatchEvent(new
  CustomEvent(...))` plus, for the three persisted settings,
  `localStorage` — both components (and CRT Effect / Glitch Effect,
  which only *read* one of these keys) agree on the same key names by
  convention, not by importing from each other. Each file stays a single
  paste-in component, matching every other component across this repo's
  plugins — no cross-file import to wire up inside Framer.
  - **Reduce Effects**, **Font Size**, and **High Contrast** persist to
    `localStorage`, so they survive a reload — that's the whole point of
    an accessibility preference; someone shouldn't have to re-apply it on
    every page.
  - **Panel open/closed** deliberately does **not** persist — it's a
    plain in-memory flag plus the event, reset closed on every load, so
    the panel doesn't unexpectedly reopen on its own.
- **Reduce Effects** doesn't touch CRT Effect or Glitch Effect's code at
  all from this plugin's side — instead, those two components each read
  the same `fr-a11y-effects-enabled` key themselves (a ~15-line hook
  duplicated into each of the three files) and bypass their own filter
  entirely when it's off, regardless of their own Trigger/Effect/Curvature
  props. This means Reduce Effects works even if you only have
  `AccessibilityPanel.tsx` and, say, `GlitchEffect.tsx` in a project —
  there's no dependency in either direction, just an agreed-upon key
  name. On Framer's canvas, Reduce Effects is ignored on purpose (a live
  accessibility preference isn't a design-time concern, and CRT Effect
  specifically already keeps Curvature visible on canvas so you can see
  what you're designing).
- **Font Size** applies `zoom` to `document.documentElement` — chosen
  over scaling a root `rem` value because it works regardless of whether
  the page's own text happens to use relative or fixed (px) units, which
  is the more common case for layers built directly in Framer's canvas.
  The tradeoff: `zoom` scales the whole page's layout, not just text, so
  "Font Size" is a slight misnomer — it's closer to a page zoom. That's
  usually what someone reaching for a font-size control actually wants
  anyway (everything gets more readable/tappable together), but it's
  worth knowing if you were expecting only the text to grow.
- **High Contrast** applies a CSS `filter: contrast(1.35) saturate(0.9)`
  to `document.body`, only while it's actually on (never left applied at
  its identity/off state) — the same discipline
  [CRTEffectAuto](../crt-effect-plugin) uses for its own body filter, and
  for the same reason: setting `filter` on `document.body` makes it the
  containing block for any `position: fixed`/`sticky` element elsewhere
  on the page (a sticky nav, a custom cursor), so it should never be
  applied at a no-op strength.
  - **If you're also using CRTEffectAuto's Curvature/Aberration on the
    same page**, know that both features independently set
    `document.body.style.filter` — they don't compose, the second one to
    run simply overwrites the first's value. Use
    [CRTEffect](../crt-effect-plugin) (the connector-based sibling)
    instead of CRTEffectAuto if you need both at once; it never touches
    `document.body`, so there's nothing to conflict with.
- **Keyboard/focus behavior**: opening the panel moves focus to its close
  button; closing it (via the close button, clicking the backdrop, or
  pressing Escape) returns focus to whatever was focused before it
  opened — normally the toggle button, but this works from any trigger
  since it's captured via `document.activeElement` at the moment the
  panel actually opens, not hardcoded to the button component.

## Using your own Switch component

The built-in switch is a plain styled button — good enough to work
out of the box, but you'll usually want the panel's toggles to match a
Switch component you've already designed. Connect it via **Custom Switch
(On)** and **Custom Switch (Off)** and it replaces the default on every
row (Reduce Effects and High Contrast both use it).

**Why two connections instead of one:** the obvious-looking approach —
connect your Switch once, and drive its on/off look with a boolean prop
from code — only works if your Switch is a *code* component with a
property control for that. A component built purely from Framer's
canvas (variants for the two looks, no code) has no way to accept an
incoming value like that; the only thing you can expose on it is
**Events** (outgoing — "On Tap does X"), which is the wrong direction
for "tell this component what state to show." Two static connections
sidesteps needing any of that entirely:

1. Drag your Switch onto the canvas twice.
2. Set one instance to look "on" (whatever that means for your
   design — its Active variant, a color override, whatever) and connect
   it to **Custom Switch (On)**.
3. Set the other to look "off" and connect it to **Custom Switch (Off)**.
4. The panel picks whichever one to render based on its own internal
   state and handles the click itself — your Switch doesn't need to know
   it's inside an accessibility panel, or do anything beyond looking
   right in each of its two configured states.

If your Switch *is* a code component with, say, a `checked` boolean
property control, you don't need this at all — you could just as
easily drop your own switch markup straight into a copy of
`AccessibilityPanel.tsx` and drive it directly. The two-connector
approach exists specifically for the common case where the switch was
designed visually and has no code-level API to hook into.

## Local preview

```bash
npm install
npm run dev
```

Then open the printed local URL. The demo page has a header with the
toggle button, and — for the local preview only — imports
[CRTEffect](../crt-effect-plugin/src/CRTEffect.tsx) and
[GlitchEffect](../glitch-effect-plugin/src/GlitchEffect.tsx) directly
from their sibling plugin folders so you can see Reduce Effects actually
disable both live. That cross-folder import is a convenience specific to
this local demo — the real components you paste into Framer never import
each other; they only agree on the same `localStorage`/event key names.
The panel is also wired up with a `MockCustomSwitch` (styled nothing
like the built-in switch, on purpose) passed as both Custom Switch
connectors, so opening the panel shows the two-instance override
actually working rather than just being described.

Note: the preview aliases the `framer` import to a local no-op shim
(`src/framer-shim.ts`) via `vite.config.ts`, since the real `framer` npm
package bundles Framer's full canvas-rendering library and isn't meant to
run standalone. `AccessibilityToggleButton.tsx` and
`AccessibilityPanel.tsx` themselves are untouched — they still import
from `"framer"` exactly as they need to when pasted into an actual Framer
project.

## Project structure

```
accessibility-panel-plugin/
├── src/
│   ├── AccessibilityToggleButton.tsx  # Copy this into Framer
│   ├── AccessibilityPanel.tsx         # Copy this into Framer
│   ├── framer-shim.ts                 # Local-preview-only stand-in for the "framer" package
│   └── main.tsx                       # Vite preview harness (not part of either component)
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Author

Felipe Linares ([me@flinbu.co](mailto:me@flinbu.co))
