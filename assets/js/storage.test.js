import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const store = {};
globalThis.localStorage = {
    getItem:  k => store[k] ?? null,
    setItem:  (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
};

const { loadPrefs, savePrefs } = await import('./storage.js');

describe('loadPrefs', () => {
    beforeEach(() => { delete store['char3d-prefs']; });

    it('returns empty object when nothing stored', () => {
        assert.deepEqual(loadPrefs(), {});
    });

    it('returns stored prefs', () => {
        store['char3d-prefs'] = JSON.stringify({ lastModel: 'rex' });
        assert.equal(loadPrefs().lastModel, 'rex');
    });

    it('returns empty object on corrupted JSON', () => {
        store['char3d-prefs'] = '{bad}}}';
        assert.deepEqual(loadPrefs(), {});
    });
});

describe('savePrefs', () => {
    beforeEach(() => { delete store['char3d-prefs']; });

    it('saves lastModel', () => {
        savePrefs({ lastModel: 'deer' });
        assert.equal(loadPrefs().lastModel, 'deer');
    });

    it('merges with existing prefs', () => {
        savePrefs({ lastModel: 'cow' });
        savePrefs({ other: true });
        assert.equal(loadPrefs().lastModel, 'cow');
        assert.equal(loadPrefs().other, true);
    });

    it('overwrites same key', () => {
        savePrefs({ lastModel: 'cow' });
        savePrefs({ lastModel: 'rex' });
        assert.equal(loadPrefs().lastModel, 'rex');
    });
});
