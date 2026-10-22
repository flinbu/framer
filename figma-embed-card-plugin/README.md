# Figma Embed Card — Framer Code Component

A click-to-load embed for a Figma file (typically a Figma Community file)
on a Framer page. Instead of dropping Figma's live embed straight onto
the page, it first shows a light **poster card** — a title, a short meta
line, an optional poster image, and a "Load the interactive file" button
— and only swaps in the real Figma iframe once someone clicks it. A
footer row underneath carries the file's name, a short note, and an
"Open in Figma" link that's always there, loaded or not.

Built as a **Framer Code Component**: a single `.tsx` file you paste into
a Framer project's code panel, with every piece of copy and color
exposed as a property control.

## Why click-to-load

Figma's embed is a full app in an iframe — several MB of JavaScript that
starts downloading and booting as soon as the iframe exists, whether or
not anyone on the page ever scrolls to it or interacts with it.
`loading="lazy"` alone only defers that until the iframe is near the
viewport; it still loads for everyone who scrolls past. Rendering the
iframe only after an explicit click means:

- **Page load stays fast** — nothing from Figma is fetched until it's
  actually asked for.
- **The text is real, crawlable HTML** — the title, meta line, file name,
  and note are plain text on your page, not locked inside a cross-origin
  iframe search engines can't attribute to you.
- **Scrolling isn't hijacked** — a live Figma canvas captures wheel and
  trackpad gestures to pan/zoom; a poster doesn't, so people scrolling
  down the page don't get stuck inside it.

## Use it in Framer

1. In your Framer project, open the **Assets** panel → **Code** → **+** →
   **New Code File**.
2. Name it `FigmaEmbedCard.tsx` and replace the generated contents with
   the contents of [`src/FigmaEmbedCard.tsx`](./src/FigmaEmbedCard.tsx)
   in this repo.
3. Drag the **Figma Embed Card** component from the Assets panel onto
   your canvas. It prefers a fixed width (1072px by default) and sizes
   its own height from that — the stage is always 16:9, plus the footer
   row.
4. Set **Embed URL** and **Figma link** to your own file (see below),
   then fill in the copy and colors.

### Getting the Embed URL

**Embed URL** and **Figma link** are two different URLs on purpose:

- **Embed URL** is what loads inside the iframe. In Figma, open the file
  → **Share** → **Get embed code**, and copy just the `src="…"` value out
  of the `<iframe>` snippet it gives you. It looks like
  `https://embed.figma.com/design/<fileKey>/<name>?node-id=…&embed-host=…`.
  A plain `figma.com/design/…` or `figma.com/community/file/…` URL won't
  work here — Figma doesn't serve those pages for embedding in an iframe.
  Change `node-id` to open the embed on a specific page or frame.
- **Figma link** is where the "Open in Figma" button sends people — for
  a community file, its `figma.com/community/file/<id>` page, so visitors
  land where they can duplicate it.

## Property controls

| Control | Type | Notes |
| --- | --- | --- |
| Embed URL | String | The iframe `src` from Figma's **Get embed code** — see above. |
| Figma link | Link | Target of the footer's "Open in Figma" link. Opens in a new tab. |
| Title | String | Large heading on the poster. Also used as the card's `aria-label` and the iframe's `title`. |
| Meta | String (text area) | Short line under the title — counts of variables, styles, components, etc. |
| File name | String | Footer, next to the Figma logo. |
| File note | String | Smaller line under File name (e.g. "Free on the Figma Community"). |
| Button | String | Label of the click-to-load button. |
| Link label | String | Label of the footer link. |
| Poster | Image | Optional. Shown behind the title/button at 55% opacity, cropped to 16:9. When empty, the stage shows a subtle dotted grid instead. |
| Surface | Color | Card background (the footer row sits on this). |
| Stage | Color | Background of the 16:9 area behind the poster/iframe. |
| Border | Color | Card outline and the divider above the footer. |
| Radius | Number | Corner radius, 0–40px. |
| Font | Font | Typeface for the whole card (extended controls: family, weight, size, line-height…). Defaults to Rethink Sans with a sans-serif fallback — pick a font already in your project here, since the default only renders as Rethink Sans if that font is loaded on the page. |

## How it works

- **One boolean of state.** `loaded` starts `false`; the poster renders.
  Clicking the button flips it to `true`, and the same 16:9 box renders
  the `<iframe>` instead, absolutely filling it. There's no way back to
  the poster without a reload — once someone's asked for the file, it
  stays.
- **The 16:9 stage** uses CSS `aspect-ratio` on a full-width box, so
  the card's height always follows its width — that's why it's marked
  `@framerSupportedLayoutHeight auto`: you set the width in Framer, the
  height takes care of itself.
- **Text colors are fixed**, not controls: title and footer text are
  white, the meta line is a light slate, the button is white with dark
  text. The color controls cover the card's surfaces and border; the
  component assumes a dark card. If you need a light variant, those
  colors live inline in the component and are straightforward to lift
  into controls.
- **Accessibility:** the card is a `<section>` labeled by Title; the
  button is a real `<button>` (keyboard focusable, 48px tall); the play
  icon and Figma logo are `aria-hidden`; the iframe gets a descriptive
  `title` so screen readers announce what it is once loaded.

## Run the local preview

The preview is a plain Vite + React app that renders two cards — the
defaults, and a narrower one with a poster and custom colors — so you can
check the layout and the click-to-load swap without a Framer project.
The `framer` import is aliased to a tiny local shim
([`src/framer-shim.ts`](./src/framer-shim.ts)); the real `framer`
package is still what the component targets once pasted into Framer.

```bash
cd figma-embed-card-plugin
npm install
npm run dev
```

`npm run build` type-checks and builds the preview.

## Author

Felipe Linares ([me@flinbu.co](mailto:me@flinbu.co))
