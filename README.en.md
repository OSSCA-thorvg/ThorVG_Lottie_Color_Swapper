# Lottie Color Swapper

[한국어](README.md)

A web tool for recoloring Lottie animations directly in the browser and exporting them with color vision deficiency correction applied. Both rendering and color replacement are handled by [ThorVG](https://www.npmjs.com/package/@thorvg/webcanvas). Built with Vite and TypeScript.

[**Live demo**](https://ossca-thorvg.github.io/ThorVG_Lottie_Color_Swapper/)

A hackathon project built for week 4 of the ThorVG track of the [OSSCA 2026 program](https://www.contribution.ac/).

## Features

- Opens `.json` (Lottie) and `.lottie` (dotLottie v1.0/v2.0) — via file picker or drag and drop
- Color hierarchy tree following the file's own layer/group structure; selecting a color highlights the matching shape on the canvas
- Live color editing through the color picker (uninterrupted while the animation plays)
- Undo (`Ctrl+Z`) and reset to the colors the file had at upload time
- Three color vision deficiency corrections (protanopia, deuteranopia, tritanopia) — applied to both the preview and the export
- Playback controls — play/pause, stop, a frame seek bar, `Space` to play/pause, `←` `→` to step frames
- JSON export with color vision deficiency correction applied, Korean/English interface
- Automatic deployment to GitHub Pages on pushes to `main`

## Using ThorVG Slots

In Lottie, colors sit deep inside the shape hierarchy, so changing one normally means editing the JSON and reloading the whole animation. Playback stops and the current frame position is lost.

ThorVG's **slots** attach a name (`sid`) to a color property, letting you address and replace just that property on an already-loaded animation. This tool is built on top of that.

- `src/lottieSlots.ts` — most Lottie files carry no slots, so this walks layers and precomps recursively and injects a `sid` and a `slots` entry for every static fill and stroke color.
- `src/renderer.ts` — a color change never reloads the file. `animation.gen(...)` followed by `animation.apply(id)` updates only that one slot, which is why playback state and the current frame survive the edit.

Narrowing the scope to color editing was a deliberate choice: rather than a general-purpose Lottie editor, the goal was to make real use of what ThorVG already provides.

## Color Vision Deficiency Correction

The correction model is Viénot, Brettel & Mollon (1999), *Digital video colourmaps for checking the legibility of displays by dichromats* ([PDF](https://vision.psychol.cam.ac.uk/jdmollon/papers/colourmaps.pdf)). It works in LMS cone-response space, applied to gamma-decoded linear light rather than to display-encoded sRGB.

Scoring a correction with the same model it is built on would be circular, so it is **verified against an independent model** — Machado, Oliveira & Fernandes (2009), the one Chrome DevTools uses. For the red-green deficiencies it separates over 97% of the confusable pairs found, while tritanopia scores lower (Viénot's single-plane projection is the construction validated for the red-green types).

```bash
npm run verify:cvd   # prints the verification table
```

Limitations: no validation with actual color-blind users was carried out, and about 1% of pairs come out *less* distinguishable, because corrected colors that land outside the RGB gamut are clipped back onto it. A test pins down the upper bound.

## Running

```bash
npm install
npm run dev     # dev server
npm run build   # type check + build
npm test        # tests
```

## Team

- [@alpakaDurumi](https://github.com/alpakaDurumi) — UI, color editing, JSON export, color vision deficiency correction
- [@Saususge](https://github.com/Saususge) — Lottie/dotLottie parser, dotLottie v1.0/v2.0 support
