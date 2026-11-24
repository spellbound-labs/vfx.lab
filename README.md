# VFX.LAB

A browser tool for drawing stylized 3D effects in the video game and anime tradition. Draw a path, stack layers on a timeline, recolour, and export.

Courtesy of SB.Labs.

## What it does

- **Effects on a path.** Draw a 3D path in the viewport; particles, ribbons and shader meshes follow it.
- **Layers and a timeline.** Each effect is a stack of layers (particles, ribbon, shader mesh, screen flash and shake, occluder, media, manga overlay, SFX lettering), each with its own start, duration and curves. Every frame is a pure function of time, so the timeline scrubs cleanly.
- **26 starter effects**, from Arcane Comet and Crescent Slash to Manga Impact and Heart Flutter.
- **16 looks** applied in one click (cel shade, ink and paper, pixel art, neon, manga tone, VHS and more), plus one-click recolouring with 10 palettes.
- **Your own media.** Import images and video as backdrops, foreground plates, cards or particle sprites, with luma and chroma key.
- **Occlusion**, static and animated: invisible shapes that hide the effect behind them.
- **Manga kit**: focus lines, speed lines, screentone, impact frames and lettering.
- **Export** to video, sprite sheet, PNG, or a `.json` effect file you can reopen.

## Run it

It is a static page with no build step.

```sh
git clone https://github.com/spellbound-labs/vfx.lab
cd vfx.lab
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Opening `index.html` directly in a browser also works.

It needs a browser with WebGL2. Three.js r128 and the fonts load from public CDNs (cdnjs and Google Fonts), so the first load needs a connection.

## Files

| File | What it holds |
| --- | --- |
| `index.html` | Page shell and styles |
| `js/engine.js` | Rendering engine: effect layers, post-processing, looks |
| `js/presets.js` | Layer defaults, path templates, starter effects, looks, palettes |
| `js/editor.js` | Editor UI: viewport tools, timeline, inspector, library, export |

Work is autosaved in the browser's local storage.

## License

[MIT](LICENSE) © 2026 Spellbound Labs.
