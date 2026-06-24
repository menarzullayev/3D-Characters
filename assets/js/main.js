import { MODELS, DEFAULT_MODEL_ID } from './config.js';
import { loadPrefs, savePrefs } from './storage.js';

// ── DOM refs ──────────────────────────────────────────────────────────────
const modelEl        = document.getElementById('model');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText    = document.getElementById('loadingText');
const errorOverlay   = document.getElementById('errorOverlay');
const thumbnailsEl   = document.getElementById('thumbnails');
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
const prefs         = loadPrefs();
const startId       = MODELS.find(m => m.id === prefs.lastModel) ? prefs.lastModel : DEFAULT_MODEL_ID;
let currentModel    = MODELS.find(m => m.id === startId);
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

// ── Thumbnails ────────────────────────────────────────────────────────────
function buildThumbnails() {
    thumbnailsEl.innerHTML = '';
    MODELS.forEach((model, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'thumb-card';
        btn.dataset.modelId = model.id;
        btn.dataset.idx = String(idx);
        btn.setAttribute('aria-label', `Load ${model.name}`);
        btn.setAttribute('tabindex', model.id === currentModel.id ? '0' : '-1');
        btn.style.setProperty('--accent', model.accent);
        btn.innerHTML = `
            <span class="thumb-card__bar"></span>
            <span class="thumb-card__name">${model.name}</span>
            <span class="thumb-card__size">${model.size}</span>
        `;
        if (model.id === currentModel.id) btn.classList.add('thumb-card--active');
        btn.addEventListener('click', () => loadModel(model));
        thumbnailsEl.appendChild(btn);
    });
}

function setActiveThumb(modelId) {
    const cards = [...document.querySelectorAll('.thumb-card')];
    cards.forEach(card => {
        const active = card.dataset.modelId === modelId;
        card.classList.toggle('thumb-card--active', active);
        card.setAttribute('tabindex', active ? '0' : '-1');
        if (active) card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });
}

// ── Poster ────────────────────────────────────────────────────────────────
export function makePoster(accent) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><defs><radialGradient id="g" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="${accent}" stop-opacity="0.25"/><stop offset="100%" stop-color="#0a0d14" stop-opacity="1"/></radialGradient></defs><rect width="400" height="400" fill="#0a0d14"/><rect width="400" height="400" fill="url(#g)"/></svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// ── Model loading ─────────────────────────────────────────────────────────
function loadModel(model) {
    if (model.id === currentModel.id) return;
    currentModel = model;
    animations = [];
    currentAnimIdx = 0;
    updateAnimUI();
    loadStartTime = performance.now();
    showLoading(`Loading ${model.name}…`);
    hideError();
    setActiveThumb(model.id);
    modelEl.setAttribute('poster', makePoster(model.accent));
    modelEl.setAttribute('src', model.file);
    applyModelCamera(model);
    savePrefs({ lastModel: model.id });
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

// ── Keyboard navigation (thumbnail strip) ────────────────────────────────
function bindThumbKeyboard() {
    thumbnailsEl.addEventListener('keydown', e => {
        const cards = [...thumbnailsEl.querySelectorAll('.thumb-card')];
        const focused = document.activeElement;
        const idx = cards.indexOf(focused);
        if (idx === -1) return;

        let next = -1;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown')  next = (idx + 1) % cards.length;
        if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')    next = (idx - 1 + cards.length) % cards.length;
        if (e.key === 'Home') next = 0;
        if (e.key === 'End')  next = cards.length - 1;

        if (next !== -1) {
            e.preventDefault();
            cards.forEach((c, i) => c.setAttribute('tabindex', i === next ? '0' : '-1'));
            cards[next].focus();
        }
    });
}

// ── Events ────────────────────────────────────────────────────────────────
function bindEvents() {
    playPauseBtn.addEventListener('click', () => setPlaying(!isPlaying));

    autoRotateBtn.addEventListener('click', () => {
        setAutoRotate(autoRotateBtn.getAttribute('aria-pressed') !== 'true');
    });

    resetBtn.addEventListener('click', () => {
        resetCamera();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    photoBtn?.addEventListener('click', takePhoto);

    animPrevBtn?.addEventListener('click', () => cycleAnim(-1));
    animNextBtn?.addEventListener('click', () => cycleAnim(1));

    retryBtn?.addEventListener('click', () => {
        hideError();
        showLoading(`Loading ${currentModel.name}…`);
        loadStartTime = performance.now();
        const src = modelEl.getAttribute('src');
        modelEl.setAttribute('src', '');
        requestAnimationFrame(() => modelEl.setAttribute('src', src));
    });

    bindThumbKeyboard();
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
        showError();
    });

    modelEl.addEventListener('model-visibility', e => {
        console.info(`[3D] visibility changed: visible=${e.detail.visible} model=${currentModel.name}`);
    });
}

// ── Init ──────────────────────────────────────────────────────────────────
function init() {
    if (!modelEl) return;
    loadStartTime = performance.now();
    buildThumbnails();
    bindEvents();
    bindModelEvents();
    setAutoRotate(true);
    updateAnimUI();
    modelEl.setAttribute('poster', makePoster(currentModel.accent));
    applyModelCamera(currentModel);
    showLoading(`Loading ${currentModel.name}…`);

    if (modelEl.loaded) {
        hideLoading();
        onModelLoad();
    }
}

init();
