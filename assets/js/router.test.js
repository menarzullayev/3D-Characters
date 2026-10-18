import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseHash, hashFor, stepModel } from './router.js';

const models = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

describe('parseHash', () => {
    it('returns null for gallery routes', () => {
        for (const h of ['', '#', '#/', undefined]) assert.equal(parseHash(h, models), null);
    });

    it('finds a model by id, with or without slash', () => {
        assert.equal(parseHash('#b', models), models[1]);
        assert.equal(parseHash('#/c', models), models[2]);
    });

    it('returns null for unknown ids', () => {
        assert.equal(parseHash('#nope', models), null);
    });

    it('treats malformed escapes as the gallery', () => {
        assert.equal(parseHash('#%E0%A4%A', models), null);
    });
});

describe('hashFor', () => {
    it('round-trips with parseHash', () => {
        assert.equal(hashFor(models[1]), '#b');
        assert.equal(parseHash(hashFor(models[1]), models), models[1]);
        assert.equal(hashFor(null), '#');
    });
});

describe('stepModel', () => {
    it('wraps around both ways', () => {
        assert.equal(stepModel(models, models[2], 1), models[0]);
        assert.equal(stepModel(models, models[0], -1), models[2]);
        assert.equal(stepModel(models, models[1], 1), models[2]);
    });
});
