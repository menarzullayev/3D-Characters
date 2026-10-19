import { MODELS, thumbFor } from './config.js';
import { loadPrefs, savePrefs } from './storage.js';
import { parseHash, hashFor, stepModel } from './router.js';

// ── DOM refs ──────────────────────────────────────────────────────────────
const modelEl        = document.getElementById('model');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText    = document.getElementById('loadingText');
const errorOverlay   = document.getElementById('errorOverlay');
const galleryEl      = document.getElementById('gallery');
const viewerEl       = document.getElementById('viewer');
const gridEl         = document.getElementById('grid');
const backBtn        = document.getElementById('backBtn');
const errorBackBtn   = document.getElementById('errorBackBtn');
const prevModelBtn   = document.getElementById('prevModel');
const nextModelBtn   = document.getElementById('nextModel');
const modelNameEl    = document.getElementById('modelName');
const arBtn          = document.getElementById('arBtn');
const shareBtn       = document.getElementById('shareBtn');
const infoBtn        = document.getElementById('infoBtn');
const infoPanel      = document.getElementById('infoPanel');
const playPauseBtn   = document.getElementById('playPauseBtn');
const autoRotateBtn  = document.getElementById('autoRotateBtn');
const resetBtn       = document.getElementById('resetBtn');
const photoBtn       = document.getElementById('photoBtn');
const retryBtn       = document.getElementById('retryBtn');
const animNameEl     = document.getElementById('animName');
const animCountEl    = document.getElementById('animCount');
const animPrevBtn    = document.getElementById('animPrev');
const animNextBtn    = document.getElementById('animNext');
const liveRegion     = document.getElementById('liveRegion');

// ── State ─────────────────────────────────────────────────────────────────
let currentModel    = null;
let loadedModelId   = null;
let modelReady      = false;
let animations      = [];
let currentAnimIdx  = 0;
let isPlaying       = true;
let loadStartTime   = 0;

// ── Accessibility ─────────────────────────────────────────────────────────
function announce(msg) {
    if (liveRegion) liveRegion.textContent = msg;
}

// ── Toast ─────────────────────────────────────────────────────────────────
function showToast(msg) {
    const existing = document.getElementById('loadToast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'loadToast';
    toast.className = 'load-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('load-toast--visible'));
    setTimeout(() => {
        toast.classList.remove('load-toast--visible');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// ── Loading ───────────────────────────────────────────────────────────────
function showLoading(text = 'Loading model…') {
    loadingText.textContent = text;
    loadingOverlay.classList.remove('hidden');
    loadingOverlay.setAttribute('aria-busy', 'true');
}

function hideLoading() {
    loadingOverlay.classList.add('hidden');
    loadingOverlay.setAttribute('aria-busy', 'false');
}

// ── Error ─────────────────────────────────────────────────────────────────
function showError() {
    hideLoading();
    errorOverlay.classList.remove('hidden');
}

function hideError() {
    errorOverlay.classList.add('hidden');
}

// ── Gallery grid ──────────────────────────────────────────────────────────
function buildGrid() {
    gridEl.innerHTML = '';
    MODELS.forEach((model, idx) => {
        const li = document.createElement('li');
        const a  = document.createElement('a');
        a.className = 'card';
        a.href = hashFor(model);
        a.style.setProperty('--accent', model.accent);
        a.style.setProperty('--i', String(idx));
        a.setAttribute('aria-label', `Open ${model.name}`);

        const img = document.createElement('img');
        img.className = 'card__img';
        img.src = thumbFor(model);
        img.alt = '';
        img.loading = 'lazy';
        img.width = 480;
        img.height = 360;
        img.addEventListener('error', () => img.remove(), { once: true });

        const body = document.createElement('span');
        body.className = 'card__body';
        const name = document.createElement('span');
        name.className = 'card__name';
        name.textContent = model.name;
        const tag = document.createElement('span');
        tag.className = 'card__tag';
        tag.textContent = model.tagline;
        const meta = document.createElement('span');
        meta.className = 'card__meta';
        meta.textContent = `${model.size} · ${model.tris.toLocaleString('en-US')} tris`;
        body.append(name, tag, meta);

        a.append(img, body);
        li.appendChild(a);
        gridEl.appendChild(li);
    });
}

// ── Poster ────────────────────────────────────────────────────────────────
export function makePoster(accent) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><defs><radialGradient id="g" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="${accent}" stop-opacity="0.25"/><stop offset="100%" stop-color="#0a0d14" stop-opacity="1"/></radialGradient></defs><rect width="400" height="400" fill="#0a0d14"/><rect width="400" height="400" fill="url(#g)"/></svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// ── Model loading ─────────────────────────────────────────────────────────
function loadModel(model) {
    currentModel = model;
    modelNameEl.textContent = model.name;
    renderInfo(model);
    document.title = `${model.name} — 3D Characters`;
    viewerEl.style.setProperty('--accent', model.accent);
    if (loadedModelId === model.id) {
        if (!modelReady) showLoading(`Loading ${model.name}…`);
        applyModelCamera(model);
        return;
    }
    loadedModelId = model.id;
    modelReady = false;
    animations = [];
    currentAnimIdx = 0;
    updateAnimUI();
    arBtn.classList.add('hidden');
    loadStartTime = performance.now();
    showLoading(`Loading ${model.name}…`);
    hideError();
    modelEl.setAttribute('poster', makePoster(model.accent));
    modelEl.setAttribute('src', '');
    applyModelCamera(model);
    requestAnimationFrame(() => modelEl.setAttribute('src', model.file));
    announce(`Loading ${model.name}`);
}

// ── Camera ────────────────────────────────────────────────────────────────
function applyModelCamera(model) {
    const radiusPart = model.orbit.split(' ')[2] ?? '';
    const isMeters = radiusPart.endsWith('m') && !radiusPart.endsWith('%');
    if (isMeters) {
        modelEl.setAttribute('min-camera-orbit', 'auto auto 0.1m');
        modelEl.setAttribute('max-camera-orbit', 'auto auto 50m');
    } else {
        modelEl.setAttribute('min-camera-orbit', 'auto auto 50%');
        modelEl.setAttribute('max-camera-orbit', 'auto auto 200%');
    }

    modelEl.setAttribute('scale', model.scale ?? '1 1 1');

    modelEl.setAttribute('camera-orbit', model.orbit);
    if (model.target && model.target !== 'auto') {
        modelEl.setAttribute('camera-target', model.target);
    } else {
        modelEl.removeAttribute('camera-target');
        if (modelEl.loaded) modelEl.updateFraming();
    }
}

function resetCamera() {
    applyModelCamera(currentModel);
    announce('View reset');
}

// ── Animation ─────────────────────────────────────────────────────────────
function updateAnimUI() {
    const hasAnim = animations.length > 0;
    animNameEl.textContent  = hasAnim ? animations[currentAnimIdx] : '—';
    animCountEl.textContent = hasAnim ? `${currentAnimIdx + 1} / ${animations.length}` : '';
    if (animPrevBtn) animPrevBtn.disabled = !hasAnim;
    if (animNextBtn) animNextBtn.disabled = !hasAnim;
    playPauseBtn.disabled = !hasAnim;

    const label = isPlaying ? 'Pause animation' : 'Play animation';
    playPauseBtn.setAttribute('aria-label', label);
    playPauseBtn.setAttribute('aria-pressed', String(isPlaying && hasAnim));
    playPauseBtn.querySelector('.btn__label').textContent = isPlaying && hasAnim ? 'Pause' : 'Play';

    const pauseIcon = playPauseBtn.querySelector('.icon-pause');
    const playIcon  = playPauseBtn.querySelector('.icon-play');
    if (pauseIcon) pauseIcon.style.display = isPlaying && hasAnim ? '' : 'none';
    if (playIcon)  playIcon.style.display  = isPlaying && hasAnim ? 'none' : '';
}

function onModelLoad() {
    const ms = Math.round(performance.now() - loadStartTime);
    if (ms > 0) {
        console.info(`[3D-Characters] ✓ ${currentModel.name} loaded in ${ms}ms (${currentModel.size})`);
        showToast(`${currentModel.name} — ${(ms / 1000).toFixed(1)}s`);
    }

    animations = [...(modelEl.availableAnimations ?? [])];
    currentAnimIdx = 0;

    if (animations.length > 0) {
        modelEl.animationName = animations[0];
        if (isPlaying) modelEl.play({ repetitions: Infinity });
    } else {
        modelEl.removeAttribute('animation-name');
    }
    updateAnimUI();
    applyModelCamera(currentModel);
}

function setPlaying(playing) {
    isPlaying = playing;
    if (!animations.length) return;
    if (playing) modelEl.play({ repetitions: Infinity });
    else         modelEl.pause();
    updateAnimUI();
    announce(`Animation ${playing ? 'playing' : 'paused'}`);
}

function cycleAnim(dir) {
    if (!animations.length) return;
    currentAnimIdx = (currentAnimIdx + dir + animations.length) % animations.length;
    const name = animations[currentAnimIdx];
    modelEl.animationName = name;
    if (isPlaying) modelEl.play({ repetitions: Infinity });
    updateAnimUI();
    announce(`Animation: ${name}`);
}

// ── Auto-rotate ───────────────────────────────────────────────────────────
function setAutoRotate(enabled) {
    if (enabled) modelEl.setAttribute('auto-rotate', '');
    else         modelEl.removeAttribute('auto-rotate');
    autoRotateBtn.setAttribute('aria-pressed', String(enabled));
    autoRotateBtn.setAttribute('aria-label', `Auto-rotate ${enabled ? 'on' : 'off'}`);
}

// ── Photo ─────────────────────────────────────────────────────────────────
async function takePhoto() {
    showLoading('Capturing…');
    try {
        const date = new Date().toISOString().slice(0, 10);
        let blob;
        try {
            blob = await modelEl.toBlob('image/png');
        } catch {
            const res = await fetch(modelEl.toDataURL('image/png'));
            blob = await res.blob();
        }
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = `character-${currentModel.id}-${date}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        announce('Photo saved');
    } finally {
        hideLoading();
    }
}

// ── Info panel ────────────────────────────────────────────────────────────
function renderInfo(model) {
    document.getElementById('infoName').textContent   = model.name;
    document.getElementById('infoDesc').textContent   = model.desc;
    document.getElementById('infoTris').textContent   = model.tris.toLocaleString('en-US');
    document.getElementById('infoSize').textContent   = model.size;
    document.getElementById('infoAuthor').textContent = model.author;
    const lic = document.getElementById('infoLicense');
    lic.textContent = model.license;
    lic.href = model.licenseUrl;
    document.getElementById('infoSource').href = model.source;
}

function setInfoOpen(open) {
    infoPanel.classList.toggle('hidden', !open);
    infoBtn.setAttribute('aria-pressed', String(open));
    infoBtn.setAttribute('aria-label', open ? 'Hide model info' : 'Show model info');
    savePrefs({ infoOpen: open });
}

// ── AR ────────────────────────────────────────────────────────────────────
function updateArButton() {
    arBtn.classList.toggle('hidden', !modelEl.canActivateAR === true);
}

// ── Share ─────────────────────────────────────────────────────────────────
async function shareModel() {
    const url = new URL(hashFor(currentModel), location.href.split('#')[0]).href;
    try {
        if (navigator.share) {
            await navigator.share({ title: `${currentModel.name} — 3D Characters`, url });
            return;
        }
        await navigator.clipboard.writeText(url);
        showToast('Link copied');
        announce('Link copied');
    } catch (err) {
        if (err?.name === 'AbortError') return;
        showToast(url);
    }
}

// ── Routing (#<model-id>) ─────────────────────────────────────────────────
function showGallery() {
    viewerEl.classList.add('hidden');
    galleryEl.classList.remove('hidden');
    document.body.classList.remove('is-viewing');
    document.title = '3D Characters — Neon Gallery';
    hideLoading();
    hideError();
    modelEl.pause?.();
    currentModel = null;
    window.scrollTo(0, 0);
}

function showViewer(model) {
    galleryEl.classList.add('hidden');
    viewerEl.classList.remove('hidden');
    document.body.classList.add('is-viewing');
    loadModel(model);
    if (modelReady && animations.length && isPlaying) modelEl.play({ repetitions: Infinity });
    window.scrollTo(0, 0);
}

function route() {
    const model = parseHash(location.hash, MODELS);
    if (model) showViewer(model);
    else showGallery();
}

function goTo(model) {
    location.hash = hashFor(model);
}

function goGallery() {
    // Keep history clean: drop the hash entirely instead of leaving a bare "#".
    history.pushState(null, '', location.pathname + location.search);
    route();
}

// ── Events ────────────────────────────────────────────────────────────────
function bindEvents() {
    playPauseBtn.addEventListener('click', () => setPlaying(!isPlaying));

    autoRotateBtn.addEventListener('click', () => {
        setAutoRotate(autoRotateBtn.getAttribute('aria-pressed') !== 'true');
    });

    resetBtn.addEventListener('click', () => resetCamera());

    photoBtn?.addEventListener('click', takePhoto);
    shareBtn.addEventListener('click', shareModel);
    infoBtn.addEventListener('click', () => setInfoOpen(infoPanel.classList.contains('hidden')));
    arBtn.addEventListener('click', () => modelEl.activateAR());

    animPrevBtn?.addEventListener('click', () => cycleAnim(-1));
    animNextBtn?.addEventListener('click', () => cycleAnim(1));

    backBtn.addEventListener('click', goGallery);
    errorBackBtn.addEventListener('click', goGallery);
    prevModelBtn.addEventListener('click', () => goTo(stepModel(MODELS, currentModel, -1)));
    nextModelBtn.addEventListener('click', () => goTo(stepModel(MODELS, currentModel, 1)));

    retryBtn?.addEventListener('click', () => {
        hideError();
        showLoading(`Loading ${currentModel.name}…`);
        loadStartTime = performance.now();
        const src = modelEl.getAttribute('src');
        modelEl.setAttribute('src', '');
        requestAnimationFrame(() => modelEl.setAttribute('src', src));
    });

    window.addEventListener('hashchange', route);
    window.addEventListener('popstate', route);

    window.addEventListener('keydown', e => {
        if (!currentModel || e.altKey || e.ctrlKey || e.metaKey) return;
        if (e.key === 'Escape') goGallery();
        else if (e.key === 'ArrowRight') nextModelBtn.click();
        else if (e.key === 'ArrowLeft')  prevModelBtn.click();
    });
}

function bindModelEvents() {
    modelEl.addEventListener('progress', e => {
        const pct = Math.round(e.detail.totalProgress * 100);
        const elapsed = Math.round(performance.now() - loadStartTime);
        if (pct > 0 && pct < 100) {
            loadingText.textContent = `Loading ${currentModel.name}… ${pct}%`;
            if (pct % 25 === 0) console.info(`[3D] ${currentModel.name} ${pct}% (${elapsed}ms)`);
        }
    });

    modelEl.addEventListener('load', () => {
        if (!currentModel || !modelEl.getAttribute('src')) return;
        modelReady = true;
        updateArButton();
        hideLoading();
        hideError();
        onModelLoad();
        announce(`${currentModel.name} loaded`);
    });

    modelEl.addEventListener('error', e => {
        const elapsed = Math.round(performance.now() - loadStartTime);
        const src = modelEl.getAttribute('src') ?? '—';
        const detail = e.detail ?? {};
        console.group(`[3D] ✗ ${currentModel.name} FAILED (${elapsed}ms)`);
        console.error('src:', src);
        console.error('error type:', detail.type ?? 'unknown');
        console.error('sourceError:', detail.sourceError ?? detail.error ?? e);
        console.error('online:', navigator.onLine);
        console.error('WebGL:', !!document.createElement('canvas').getContext('webgl2'));
        console.groupEnd();
        loadedModelId = null;
        showError();
    });

    modelEl.addEventListener('model-visibility', e => {
        console.info(`[3D] visibility changed: visible=${e.detail.visible} model=${currentModel.name}`);
    });
}

// ── Init ──────────────────────────────────────────────────────────────────
function init() {
    if (!modelEl) return;
    buildGrid();
    bindEvents();
    bindModelEvents();
    setAutoRotate(true);
    updateAnimUI();
    setInfoOpen(loadPrefs().infoOpen === true);
    route();
}

init();
