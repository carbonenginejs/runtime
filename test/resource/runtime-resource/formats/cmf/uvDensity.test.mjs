import assert from "node:assert/strict";
import test from "node:test";

import { buildCmfFromShared } from "../../../../../src/resource/formats/cmf/core/shared.js";

function buildMesh(vertex, faces = [ 0, 1, 2 ])
{
    return buildCmfFromShared({
        meshes: [ {
            name: "Triangle",
            vertex,
            indices: [ { name: "Area", bytesPerIndex: 2, faces } ]
        } ]
    }).meshes[0];
}

test("CMF construction emits one UV density per TexCoord usage index", () =>
{
    const mesh = buildMesh({
        position: [ 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0 ],
        texcoord0: [ 0, 0, 1, 0, 1, 1, 0, 1 ],
        texcoord1: [ 0, 0, 2, 0, 2, 2, 0, 2 ]
    }, [ 0, 1, 2, 0, 2, 3 ]);

    assert.equal(mesh.uvDensities.length, 2);
    assert.ok(Math.abs(mesh.uvDensities[0] - Math.sqrt(2)) < 1e-6);
    assert.ok(Math.abs(mesh.uvDensities[1] - 2 * Math.sqrt(2)) < 1e-6);
});

test("single-triangle UV density is deterministic at Carbon's out-of-range percentile edge", () =>
{
    const mesh = buildMesh({
        position: [ 0, 0, 0, 1, 0, 0, 0, 1, 0 ],
        texcoord0: [ 0, 0, 1, 0, 0, 1 ]
    });

    assert.equal(Number.isFinite(mesh.uvDensities[0]), true);
    assert.ok(mesh.uvDensities[0] > 0);
});

test("UV density preserves sparse usage-index slots and the no-UV empty shape", () =>
{
    const positions = [ 0, 0, 0, 1, 0, 0, 0, 1, 0 ];
    const secondSetOnly = buildMesh({
        position: positions,
        texcoord1: [ 0, 0, 1, 0, 0, 1 ]
    });
    const noUv = buildMesh({ position: positions });

    assert.equal(secondSetOnly.uvDensities.length, 2);
    assert.equal(secondSetOnly.uvDensities[0], 0);
    assert.ok(secondSetOnly.uvDensities[1] > 0);
    assert.deepEqual(noUv.uvDensities, []);
});

test("UV density retains Carbon's first-edge-zero ordering quirk", () =>
{
    const mesh = buildMesh({
        position: [ 0, 0, 0, 1, 0, 0, 0, 1, 0 ],
        texcoord0: [ 0, 0, 0, 0, 0, 1 ]
    });

    assert.equal(mesh.uvDensities[0], 0);
});
