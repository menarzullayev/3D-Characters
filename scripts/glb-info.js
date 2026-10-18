import { readFileSync } from 'node:fs';

const GLB_MAGIC = 0x46546c67; // "glTF"
const JSON_CHUNK = 0x4e4f534a;

export function readGlbJson(path) {
    const buf = readFileSync(path);
    if (buf.length < 20 || buf.readUInt32LE(0) !== GLB_MAGIC) {
        throw new Error(`${path}: not a binary glTF (.glb) file`);
    }
    if (buf.readUInt32LE(16) !== JSON_CHUNK) {
        throw new Error(`${path}: first chunk is not JSON`);
    }
    const json = JSON.parse(buf.subarray(20, 20 + buf.readUInt32LE(12)).toString('utf8'));
    return { json, bytes: buf.length };
}

// Triangle count from indexed (or plain) TRIANGLES primitives, as in glTF mode 4.
export function countTriangles(json) {
    let tris = 0;
    for (const mesh of json.meshes ?? []) {
        for (const prim of mesh.primitives ?? []) {
            if ((prim.mode ?? 4) !== 4) continue;
            const acc = json.accessors?.[prim.indices ?? prim.attributes?.POSITION];
            if (acc) tris += Math.floor(acc.count / 3);
        }
    }
    return tris;
}

export function glbInfo(path) {
    const { json, bytes } = readGlbJson(path);
    return {
        bytes,
        tris: countTriangles(json),
        animations: (json.animations ?? []).map(a => a.name ?? ''),
        extras: json.asset?.extras ?? {},
    };
}

if (import.meta.url === `file://${process.argv[1]}`) {
    for (const path of process.argv.slice(2)) {
        const { bytes, tris, animations } = glbInfo(path);
        console.log(`${path}\t${(bytes / 1048576).toFixed(2)} MB\t${tris} tris\t${animations.length} anim`);
    }
}
