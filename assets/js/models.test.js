import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { MODELS, thumbFor } from './config.js';
import { glbInfo } from '../../scripts/glb-info.js';

const root = new URL('../../', import.meta.url);
const pathOf = rel => new URL(rel.replace(/^\.\//, '').split('?')[0], root);

const MAX_BYTES = 5 * 1024 * 1024;

function parseSize(label) {
    const [num, unit] = label.split(' ');
    return Number(num) * (unit === 'MB' ? 1048576 : 1024);
}

describe('model files', () => {
    for (const m of MODELS) {
        describe(m.id, () => {
            const url = pathOf(m.file);

            it('exists and is a valid .glb', () => {
                assert.ok(existsSync(url), `${m.file} not found`);
                glbInfo(url); // throws on a bad header or JSON chunk
            });

            it(`is at most ${MAX_BYTES / 1048576} MB`, () => {
                assert.ok(statSync(url).size <= MAX_BYTES);
            });

            it('declared size matches the file (±10%)', () => {
                const actual = statSync(url).size;
                const declared = parseSize(m.size);
                assert.ok(Math.abs(actual - declared) / actual <= 0.10,
                    `${m.id}: size says ${m.size} but file is ${(actual / 1024).toFixed(0)} KB`);
            });

            it('declared triangle count matches the file', () => {
                assert.equal(glbInfo(url).tris, m.tris);
            });

            it('credits its author, license and source', () => {
                assert.ok(m.author, 'missing author');
                assert.ok(m.license, 'missing license');
                assert.match(m.licenseUrl, /^https:\/\//);
                assert.match(m.source, /^https:\/\//);
            });

            it('has a gallery thumbnail', () => {
                assert.ok(existsSync(pathOf(thumbFor(m))), `${thumbFor(m)} not found`);
            });
        });
    }

    it('every .glb in assets/model is listed in the catalog', () => {
        const listed = new Set(MODELS.map(m => m.file.replace(/^\.\/assets\/model\//, '').split('?')[0]));
        for (const f of readdirSync(pathOf('assets/model/'))) {
            if (f.endsWith('.glb')) assert.ok(listed.has(f), `${f} is not referenced in config.js`);
        }
    });
});
