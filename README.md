# 3D Characters — Interactive Viewer

**Live demo:** [3dchar.bugvector.uz](https://3dchar.bugvector.uz)

An interactive 3D character viewer featuring animated models with auto-detected animations, dark glassmorphism UI, and thumbnail-based model switching. No frameworks, no bundler — pure static files.

## Features

- **7 animated models** — Spider-Man, T-Rex, Deer, Mini Drone, Cow, Dancing Cow ×2
- **Auto-detect animations** — available animations read directly from each model on load
- **Thumbnail strip** — bottom dock with color-coded cards, click to switch models
- **Play / Pause** — toggle animation playback
- **Cycle animations** — ← → arrows step through all detected animations
- **Auto-rotate** — toggleable camera rotation
- **Photo capture** — downloads PNG screenshot of current view
- **Loading progress** — percentage shown during model fetch
- **Error detection** — distinguishes offline vs. WebGL-disabled vs. load failure
- **Accessible** — skip link, ARIA labels, keyboard navigation, live region announcements

## Project structure

```
3D-Characters/
├── index.html
└── assets/
    ├── css/
    │   ├── style.scss          # source styles
    │   └── style.min.css       # compiled output
    ├── js/
    │   ├── config.js           # model catalog (id, name, file, size, accent color, camera)
    │   └── main.js             # app logic, DOM bindings, animation control
    └── model/
        ├── spiderman_rigged.glb
        ├── rex_animation.glb
        ├── realistic_deer.glb
        ├── mini_drone.glb
        ├── cow.glb
        ├── dancing_cow.glb
        └── dancing_cow-v1.glb
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

## Adding a new model

In `assets/js/config.js`, add an entry to the `MODELS` array:

```js
{
    id:     'my-model',
    name:   'My Model',
    file:   './assets/model/my-model.glb',
    size:   '5 MB',
    accent: '#ff9800',      // card accent color
    orbit:  '0deg 85deg 110%',
    target: '0m 0.8m 0m',
}
```

No other changes needed — animations are detected automatically on load.

## Tech stack

| | |
|---|---|
| 3D rendering | [Google model-viewer v3.1.1](https://modelviewer.dev/) (WebGL via CDN) |
| JavaScript | Vanilla ES Modules (no bundler, no jQuery) |
| Styles | SCSS → compressed CSS |
| Persistence | None (stateless) |
| Build | None required |

## License

MIT — see [LICENSE](LICENSE).
