// Hash routes: "" / "#" / "#/" → gallery, "#<model-id>" → that model.
export function parseHash(hash, models) {
    let id;
    try { id = decodeURIComponent((hash ?? '').replace(/^#\/?/, '')).trim(); } catch { return null; }
    return models.find(m => m.id === id) ?? null;
}

export function hashFor(model) {
    return model ? `#${model.id}` : '#';
}

// Next/previous model with wrap-around.
export function stepModel(models, current, dir) {
    const idx = models.findIndex(m => m.id === current.id);
    return models[(idx + dir + models.length) % models.length];
}
