import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MODELS, DEFAULT_MODEL_ID } from './config.js';

describe('MODELS catalog', () => {
    it('is a non-empty array', () => {
        assert.ok(Array.isArray(MODELS) && MODELS.length > 0);
    });

    it('every model has required fields', () => {
        for (const m of MODELS) {
            assert.ok(m.id,     `${m.name}: missing id`);
            assert.ok(m.name,   `${m.id}: missing name`);
            assert.ok(m.file,   `${m.id}: missing file`);
            assert.ok(m.size,   `${m.id}: missing size`);
            assert.ok(m.accent, `${m.id}: missing accent`);
            assert.ok(m.orbit,  `${m.id}: missing orbit`);
        }
    });

    it('accent colors are valid hex', () => {
        for (const m of MODELS) {
            assert.match(m.accent, /^#[0-9a-fA-F]{6}$/, `${m.id}: invalid accent color`);
        }
    });

    it('orbit strings have 3 space-separated parts', () => {
        for (const m of MODELS) {
            const parts = m.orbit.trim().split(/\s+/);
            assert.equal(parts.length, 3, `${m.id}: orbit must have 3 parts`);
        }
    });

    it('all model ids are unique', () => {
        const ids = MODELS.map(m => m.id);
        assert.equal(new Set(ids).size, ids.length, 'duplicate model ids found');
    });

    it('DEFAULT_MODEL_ID exists in MODELS', () => {
        assert.ok(MODELS.find(m => m.id === DEFAULT_MODEL_ID),
            `DEFAULT_MODEL_ID "${DEFAULT_MODEL_ID}" not found in MODELS`);
    });

    it('file paths end with .glb', () => {
        for (const m of MODELS) {
            assert.ok(m.file.includes('.glb'), `${m.id}: file should be .glb`);
        }
    });
});
