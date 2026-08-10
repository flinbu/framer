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
| Custom Button | Component | Optional. Connect your own button/icon here to use it in place of the built-in circle — only one connection needed (unlike the panel's switches), since this is just a click trigger with no on/off look to alternate between. When connected, Icon/Size/Background/Icon Color are hidden, since they only style the built-in circle. |
| Icon | String | Defaults to ♿. Any text/emoji works. Hidden when a Custom Button is connected. |
| Aria Label | String | Screen-reader label for the button. |
| Size | Number | Diameter in px. Hidden when a Custom Button is connected. |
| Background / Icon Color | Color | Hidden when a Custom Button is connected. |

### Accessibility Panel

| Control | Type | Notes |
| --- | --- | --- |
| Position | Enum | `Left` or `Right` — which edge the panel slides in from. |
| Width | Number | Panel width in px. Always wins over however you resize the layer's own frame on the canvas — see the note in "How it works" if you're wondering why. |
| Title | String | Panel heading. |
| Title Font | Font | Typeface, weight, size, style, letter-spacing, and line-height for the heading — pick any font already in your project (or an installed one) instead of the built-in system-font fallback, so the panel can actually match your site's own type instead of standing out from it. |
| Body Font | Font | Same, applied to the panel's root — cascades to every row label and control below that doesn't set its own fontFamily, so one setting covers the whole panel's body text without touching each row individually. |
| Background / Text / Accent Color | Color | Accent is used for the switches' "on" state. |
| Show Reduce Effects / Show Font Size / Show High Contrast | Boolean | On by default. Hide a row entirely if you don't want that setting exposed on a given page. |
| Reduce Effects Label / Font Size Label / High Contrast Label | String | Row labels — translate these directly, no code changes needed. Hidden along with their row when it's turned off above. |
| Font Scale Min / Max / Step | Number | Bounds and increment for the Font Size stepper (defaults 80%–160%, 10% steps). Hidden when Show Font Size is off. |
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
- **Font Size** scales `document.documentElement`'s root `font-size`
  (via a plain percentage, e.g. `120%`), not `zoom`. An earlier version
  used `zoom`, which — confirmed in real use — throws off a page's own
  custom cursor (a `position: fixed` element tracking the pointer):
  `zoom` rescales the whole page's rendering, including how fixed-
  position coordinates map to actual screen pixels, which a cursor
  script positioning itself from raw `mousemove` `clientX`/`clientY` has
  no way to account for. Scaling root `font-size` only affects `rem`/`em`
  sized text, never the page's layout or coordinate system, so it can't
  touch fixed-position elements at all — verified with a simulated
  fixed-position cursor: zero pixel offset at any Font Size setting,
  where `zoom` previously produced a visible, scale-proportional drift.
  The real tradeoff, and it is a real one: most text authored directly
  in Framer's canvas is set in `px`, which root `font-size` scaling
  can't reach — how much this control actually does depends on whether
  the page's own type happens to use relative units. `zoom` didn't have
  that limitation, but came at the cost of being unsafe to combine with
  a custom cursor (or anything else `position: fixed`), which is the
  worse failure mode of the two.
- **High Contrast** renders a `position: fixed` overlay `div` with
  `backdrop-filter: contrast(1.35) saturate(0.9)` (only while it's
  actually on) rather than setting `filter` directly on `document.body`.
  An earlier version did the latter — the same containing-block trap
  already documented for [CRTEffectAuto](../crt-effect-plugin), and
  confirmed to be exactly what broke a real custom cursor in testing:
  `filter` on `document.body` makes it the containing block for any
  `position: fixed`/`sticky` descendant elsewhere on the page.
  `backdrop-filter` gets the same visual contrast boost (it reads the
  pixels *behind* the element) without that risk, because the overlay
  element has no children of its own to be a containing-block-changing
  ancestor of — there's nothing behind it in the DOM tree for the
  containing-block trap to apply to, only pixels behind it visually.
  - **If you're also using CRTEffectAuto's Curvature/Aberration on the
    same page**, this no longer conflicts the way it used to — High
    Contrast doesn't touch `document.body.style.filter` at all anymore,
    so there's nothing for the two to stomp on each other over.
- **Title Font / Body Font** use Framer's own font control (`ControlType.Font`,
  `controls: "extended"`) rather than a plain text field for a font-family
  string — it returns a real CSS-style object (family, weight, style, size,
  letter-spacing, line-height) straight from Framer's own font picker, so
  you're choosing an actual font already available in your project instead
  of typing a name that might not match what's really installed. Title
  Font is spread onto the heading's own `<span>` (after its `fontSize: 18,
  fontWeight: 700` fallback, so it only overrides what you actually set in
  the control); Body Font is spread onto the panel's root style, after the
  plain system-font fallback, so it cascades down to every row label,
  switch aria-label, and the Font Size stepper's own text — none of which
  set their own `fontFamily` — without needing to touch each one
  individually.
- **Keyboard/focus behavior**: opening the panel moves focus to its close
  button; closing it (via the close button, clicking the backdrop, or
  pressing Escape) returns focus to whatever was focused before it
  opened — normally the toggle button, but this works from any trigger
  since it's captured via `document.activeElement` at the moment the
  panel actually opens, not hardcoded to the button component.
- **Width** is read from the layer's own `style` prop *before* the
  panel's explicit fixed-drawer layout, not after — `...style` is
  spread first, then `width`/`position`/etc. override it, the reverse of
  the usual "spread first, override with explicit values" habit used
  everywhere else in this component. That's deliberate here: Framer
  injects `style` with whatever size the layer's frame happens to be on
  the canvas, and since this component said up front that "its position
  and size don't matter, drop it anywhere," a frame dragged to fill the
  page was a completely reasonable thing for someone to do — and it used
  to silently override the Width control, stretching the panel edge-to-
  edge and shoving its switches out past the visible edge in the
  process. Width (and the rest of the drawer's layout) now always wins,
  regardless of the frame's own on-canvas size.
- **The Width control's own prop is named `panelWidth` internally, not
  `width`**, even though it's still labeled "Width" in Framer's UI. The
  spread-order fix above wasn't the whole story: on a real published
  site, the Width control kept getting ignored even after that fix
  landed and was confirmed re-pasted. Inspecting the live DOM (via the
  browser's DevTools, since this plugin can't reach a published Framer
  site directly) showed the rendered panel's inline style was
  `width: 100%` — every other value in that same style block (z-index,
  padding, max-width) matched the current code exactly, which ruled out
  stale code and pointed at something upstream instead. `width` (and
  `height`) turn out to be prop names Framer's own runtime treats
  specially — every code component instance already has Framer's own
  Fixed/Fill/Fit sizing system managing its layer size, and a custom
  property control that happens to share that exact prop name gets
  silently overridden by Framer's own Fill-derived value before this
  component's own spread-order fix ever gets a chance to apply. Renaming
  the internal prop to `panelWidth` (with the property control's
  `title` left as `"Width"`, so nothing changes in Framer's panel UI)
  sidesteps the collision entirely — verified locally by injecting an
  extra `width: "100%"` prop alongside `panelWidth` the same way
  Framer's runtime does, and confirming the rendered panel still
  measures exactly `panelWidth`'s configured value. If you're
  customizing this component further, treat `width`/`height` as
  reserved prop names to avoid on any Framer code component, not just
  this one.

## Using your own components

Both components fall back to a plain built-in style — good enough to
work out of the box, but you'll usually want them to match your own
design system.

### Switch (Accessibility Panel)

Connect your own switch via **Custom Switch (On)** and **Custom Switch
(Off)** and it replaces the default on every row (Reduce Effects and
High Contrast both use it).

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

**If your connected Switch renders at 0x0** (invisible, and DevTools
shows Framer's own generated wrapper — something like
`div.framer-xxxxxx-container` — measuring `0 x 0`): this is a separate,
known Framer behavior, not specific to this plugin. The wrapper Framer
generates for a `ComponentInstance` connector is sized according to
whatever Fixed/Fill/Fit mode *that layer* had on the canvas when you
connected it. If it was left on Fit ("hug content") and the Switch's own
root is itself `width/height: 100%` of its frame (typical — a component
designed to fill whatever frame holds it), the two resolve in a circle
to zero: Fit says "size me to my content," and the only content is
something that says "size me to 100% of my (otherwise empty) parent."
Two things help:
- **On the canvas**: select each of the two Switch instances connected
  to Custom Switch (On)/(Off) and set their frame's W/H to a **Fixed**
  pixel size instead of Fit — this is the actual root-cause fix.
- **As a safety net that's already built in**: both this component and
  `AccessibilityToggleButton.tsx` measure whatever's connected once,
  right after it mounts (inside a `<span>` this component fully owns),
  and only step in if that measurement comes back genuinely near zero —
  a real collapse, not just a small design. When it does, they inject a
  small scoped stylesheet rule targeting that span's direct child with
  `width: 100% !important; height: 100% !important`, which forces
  something clickable and visible at roughly the right size. A Switch
  that's already correctly Fixed-sized is measured once, found fine, and
  never touched — an earlier version forced that rule unconditionally on
  every connection, which did fix the collapse but also silently
  overrode a Switch that was already sized exactly right, distorting its
  proportions on a real published site. The measurement is deliberately
  **one-time**, not a continuous `ResizeObserver`: a version in between
  kept watching after deciding, which meant the rescue rule's own effect
  on layout (growing the slot from ~4px to 44×26) re-triggered the same
  observer, which measured the new, no-longer-collapsed size, undid the
  rescue, watched it collapse back, redid it, undid it again... an
  unbounded flip-flop, confirmed on a real published site as a
  flickering, doubled-looking switch. The Custom Switch (On)/(Off) rows
  also mount a fresh `ConnectedSlot` (via a React `key`) on every on/off
  toggle specifically so this one-time check runs again for whichever
  variant just became visible, rather than only ever having measured
  whichever one happened to be showing first. This measure-first
  approach is a mitigation either way, not a substitute for fixing the
  sizing mode above: the *real* dimensions your Switch was designed at
  only reliably show up once its layer is set to Fixed.

### Button (Accessibility Toggle Button)

Connect your own icon/button via **Custom Button** — only one
connection needed here, not two, since the button doesn't have an
on/off look to alternate between; it's just a click trigger, handled by
the same wrapping button either way. Icon/Size/Background/Icon Color
(which only style the built-in circle) hide automatically once
something's connected.

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
connectors, and the header button uses a `MockCustomButton` the same
way, so both overrides are shown actually working rather than just
described.

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
