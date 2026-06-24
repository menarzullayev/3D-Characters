import { MODELS, DEFAULT_MODEL_ID } from './config.js';

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
let currentModel    = MODELS.find(m => m.id === DEFAULT_MODEL_ID);
let animations      = [];
let currentAnimIdx  = 0;
let isPlaying       = true;

// ── Accessibility ─────────────────────────────────────────────────────────
function announce(msg) {
    if (liveRegion) liveRegion.textContent = msg;
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
    MODELS.forEach(model => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'thumb-card';
        btn.dataset.modelId = model.id;
        btn.setAttribute('aria-label', `Load ${model.name}`);
        btn.setAttribute('role', 'option');
        btn.style.setProperty('--accent', model.accent);
        btn.innerHTML = `
            <span class="thumb-card__bar"></span>
            <span class="thumb-card__name">${model.name}</span>
            <span class="thumb-card__size">${model.size}</span>
        `;
        if (model.id === currentModel.id) {
            btn.classList.add('thumb-card--active');
            btn.setAttribute('aria-selected', 'true');
        } else {
            btn.setAttribute('aria-selected', 'false');
        }
        btn.addEventListener('click', () => loadModel(model));
        thumbnailsEl.appendChild(btn);
    });
}

function setActiveThumb(modelId) {
    document.querySelectorAll('.thumb-card').forEach(card => {
        const active = card.dataset.modelId === modelId;
        card.classList.toggle('thumb-card--active', active);
        card.setAttribute('aria-selected', String(active));
        if (active) card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });
}

// ── Poster (lazy loading placeholder) ────────────────────────────────────
function makePoster(accent) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><defs><radialGradient id="g" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="${accent}" stop-opacity="0.25"/><stop offset="100%" stop-color="#0a0d14" stop-opacity="1"/></radialGradient></defs><rect width="400" height="400" fill="#0a0d14"/><rect width="400" height="400" fill="url(%23g)"/></svg>`;
    return `data:image/svg+xml,${svg}`;
}

// ── Model loading ─────────────────────────────────────────────────────────
function loadModel(model) {
    if (model.id === currentModel.id) return;
    currentModel = model;
    animations = [];
    currentAnimIdx = 0;
    updateAnimUI();
    showLoading(`Loading ${model.name}…`);
    hideError();
    setActiveThumb(model.id);
    modelEl.setAttribute('poster', makePoster(model.accent));
    modelEl.setAttribute('src', model.file);
    applyModelCamera(model);
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

    if (model.scale) modelEl.setAttribute('scale', model.scale);
    else modelEl.removeAttribute('scale');

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
        const src = modelEl.getAttribute('src');
        modelEl.setAttribute('src', '');
        requestAnimationFrame(() => modelEl.setAttribute('src', src));
    });
}

function bindModelEvents() {
    modelEl.addEventListener('progress', e => {
        const pct = Math.round(e.detail.totalProgress * 100);
        if (pct > 0 && pct < 100) loadingText.textContent = `Loading ${currentModel.name}… ${pct}%`;
    });

    modelEl.addEventListener('load', () => {
        hideLoading();
        hideError();
        onModelLoad();
        announce(`${currentModel.name} loaded`);
    });

    modelEl.addEventListener('error', showError);
}

// ── Init ──────────────────────────────────────────────────────────────────
function init() {
    if (!modelEl) return;
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
