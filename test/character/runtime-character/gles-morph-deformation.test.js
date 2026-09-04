import assert from "node:assert/strict";
import test from "node:test";

import {
    CjsCharacterGlesMorphDeformation,
    normalizeCjsCharacterGlesMorphTargetName
} from "../../../src/character/gles/CjsCharacterGlesMorphDeformation.js";

test("normalizes authored morph target names", () =>
{
    assert.equal(normalizeCjsCharacterGlesMorphTargetName("Pinch Boot Ankle Shape01"),
        "pinchbootankle");
});

test("applies, updates, and restores a vertex morph through the injected host", async () =>
{
    const { geometry, mesh, calls } = CreateFixture();
    const deformation = new CjsCharacterGlesMorphDeformation({ geometryHost: calls.host });
    const acquired = await deformation.Acquire(geometry, [ {
        targetName: "PinchBootAnkleShape01",
        weight: 0.5
    } ]);

    assert.equal(acquired.report.matchedTargetCount, 1);
    assert.equal(mesh.bufferData[0], 1);
    const updated = await deformation.Update(geometry, acquired.lease, [ {
        targetName: "PinchBootAnkleShape01",
        weight: 1
    } ]);
    assert.equal(updated.meshReports[0].changedVertexCount, 1);
    assert.equal(mesh.bufferData[0], 2);
    assert.equal(await deformation.Release(geometry, acquired.lease), true);
    assert.equal(mesh.bufferData[0], 0);
    assert.equal(calls.uploads, 3);
    assert.equal(calls.rebuilds, 3);
});

function CreateFixture()
{
    const mesh = {
        buffer: {},
        bufferData: new Float32Array([ 0, 0, 0, 1 ]),
        declaration: { stride: 16 },
        _vertices: 1,
        morphTargets: [ {
            sourceName: "PinchBootAnkleShape01",
            dataIsDeltas: true,
            vertex: { position: new Float32Array([ 2, 0, 0 ]) }
        } ]
    };
    const geometry = { meshes: [ mesh ] };
    const calls = {
        uploads: 0,
        rebuilds: 0,
        host: {
            GetMeshes: resource => resource.meshes,
            EnsureSystemMirror: async () => {},
            GetVertexChannelDeclaration: (_mesh, channel) => channel === "POSITION"
                ? { elements: 3, offset: 0 }
                : null,
            RebuildMeshBounds: () => {},
            UploadVertices()
            {
                calls.uploads++;
                return true;
            },
            RebuildBounds: async () => { calls.rebuilds++; }
        }
    };
    return { geometry, mesh, calls };
}
