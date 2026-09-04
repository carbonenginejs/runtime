import assert from "node:assert/strict";
import test from "node:test";

import { CjsCharacterGlesTriangleCoverage } from "../../../src/character/gles/CjsCharacterGlesTriangleCoverage.js";

const FOOTWEAR_POLICY = Object.freeze({
    strategy: "triangle-mask",
    triangleRule: "legacy-opengl-exact-foundation-triangle-coverage-v1",
    bonePrefixes: [ "LeftFoot", "RightFoot", "LeftToe", "RightToe" ],
    evidence: {
        status: "policy",
        rule: "legacy-opengl-authored-footwear-coverage-v1"
    }
});

test("keeps triangle coverage active until the final lease releases it", async () =>
{
    const { geometry, mesh, calls } = CreateFixture();
    const coverage = new CjsCharacterGlesTriangleCoverage({ geometryHost: calls.host });
    const first = await coverage.Acquire(geometry, FOOTWEAR_POLICY);
    const second = await coverage.Acquire(geometry, FOOTWEAR_POLICY);

    assert.equal(first.report.maskedTriangleCount, 1);
    assert.deepEqual([ ...mesh.indexData ], [ 0, 0, 0, 2, 3, 4 ]);
    assert.equal(await coverage.Release(geometry, first.lease), true);
    assert.deepEqual([ ...mesh.indexData ], [ 0, 0, 0, 2, 3, 4 ]);
    assert.equal(await coverage.Release(geometry, second.lease), true);
    assert.deepEqual([ ...mesh.indexData ], [ 0, 1, 2, 2, 3, 4 ]);
    assert.equal(calls.uploads, 4);
    assert.equal(calls.rebuilds, 4);
});

test("rolls CPU index data back when the injected host rejects upload", async () =>
{
    const { geometry, mesh, calls } = CreateFixture({ failUploadAt: 1 });
    const coverage = new CjsCharacterGlesTriangleCoverage({ geometryHost: calls.host });

    await assert.rejects(
        coverage.Acquire(geometry, FOOTWEAR_POLICY),
        /triangle coverage upload failed/u
    );
    assert.deepEqual([ ...mesh.indexData ], [ 0, 1, 2, 2, 3, 4 ]);
    assert.equal(calls.uploads, 2);
});

function CreateFixture({ failUploadAt = 0 } = {})
{
    const mesh = {
        indexData: new Uint16Array([ 0, 1, 2, 2, 3, 4 ]),
        boneBindings: [ "Spine", "LeftFoot" ],
        _vertices: 5,
        declaration: { stride: 16 },
        bufferData: new Float32Array(20),
        GetVertexBlendIndice(output, vertex)
        {
            output.splice(0, 4, vertex === 1 ? 1 : 0, 0, 0, 0);
        },
        GetVertexBlendWeight(output)
        {
            output.splice(0, 4, 1, 0, 0, 0);
        }
    };
    const geometry = { meshes: [ mesh ] };
    const calls = {
        uploads: 0,
        rebuilds: 0,
        host: {
            GetMeshes: resource => resource.meshes,
            EnsureSystemMirror: async () => {},
            UploadIndices()
            {
                calls.uploads++;
                return calls.uploads !== failUploadAt;
            },
            RebuildBounds: async () => { calls.rebuilds++; }
        }
    };
    return { geometry, mesh, calls };
}
