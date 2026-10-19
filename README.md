# 3D Characters — Interactive Viewer

**Live demo:** [3dchar.bugvector.uz](https://3dchar.bugvector.uz)

A neon-retro gallery of animated 3D characters with a per-model viewer, AR, an info panel and shareable links. No frameworks, no bundler — pure static files.

## Features

- **Neon gallery** — card grid of all 11 models; each card links straight to its viewer
- **Shareable links** — every model has its own URL (`/#fox`, `/#rex`, …); the Share button copies it or opens the native share sheet
- **AR** — the AR button appears on devices that support it (WebXR, Android Scene Viewer, iOS Quick Look) and puts the model in your room
- **Info panel** — description, triangle count, file size, author, license and source for every model
- **Auto-detected animations** — read from each model on load; ← → step through them, Play/Pause toggles playback
- **Browse models** — prev/next buttons in the viewer, `←` / `→` keys, `Esc` back to the gallery
- **Auto-rotate, reset view, photo capture** (PNG)
- **Loading progress and error detection** — offline vs. WebGL-disabled vs. load failure
- **Accessible** — skip link, ARIA labels, keyboard navigation, live-region announcements, reduced-motion support

## Project structure

```
3D-Characters/
├── index.html
├── assets/
│   ├── css/            style.scss → style.min.css
│   ├── js/
│   │   ├── config.js   model catalog (metadata, credits, camera)
│   │   ├── router.js   #model-id routing helpers
│   │   ├── main.js     gallery, viewer, AR, share, info panel
│   │   └── *.test.js   unit and model-file tests
│   ├── model/          .glb files
│   └── thumbs/         gallery card images (480×360 JPEG)
├── scripts/glb-info.js reads a .glb: triangle count, animations, author
└── .github/workflows/ci.yml
```

## Running locally

```bash
python3 -m http.server 8040
# open http://localhost:8040
```

## Editing styles

```bash
npx sass assets/css/style.scss assets/css/style.min.css --style=compressed --source-map
```

## Tests and CI

```bash
npm test          # unit tests + model-file checks
npm run models    # size / triangle count / animations of every .glb
```

The model checks fail if a catalog entry points at a missing or invalid `.glb`, if its declared size or triangle
count is wrong, if a file is over 5 MB, if author/license/source are missing, if its thumbnail is missing, or
if a `.glb` in `assets/model/` is not in the catalog. GitHub Actions runs the same checks (plus a syntax check
and a check that `style.min.css` matches `style.scss`) on every push and pull request.

## Adding a new model

1. Put the `.glb` in `assets/model/` (5 MB max; only add models whose license allows it, and credit the author).
2. Run `npm run models` to get its triangle count.
3. Add an entry to `MODELS` in `assets/js/config.js`:

```js
{
    id:      'my-model',               // used in the URL: /#my-model
    name:    'My Model',
    tagline: 'Short card subtitle',
    desc:    'One or two sentences for the info panel.',
    file:    './assets/model/my-model.glb',
    size:    '1.2 MB',
    tris:    12345,
    accent:  '#ff9800',                // card glow / viewer accent
    orbit:   '0deg 85deg 110%',
    target:  'auto',
    author:  'Author name',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    source:  'https://…',
}
```

4. Add `assets/thumbs/my-model.jpg` (480×360). Animations are detected automatically on load.

## Tech stack

| | |
|---|---|
| 3D rendering | [Google model-viewer v4.0.0](https://modelviewer.dev/) (WebGL via CDN) |
| JavaScript | Vanilla ES Modules (no bundler, no jQuery) |
| Styles | SCSS → compressed CSS |
| Persistence | `localStorage` (info-panel preference only) |
| Build | None required (SCSS is compiled and committed) |

## License

MIT — see [LICENSE](LICENSE).
