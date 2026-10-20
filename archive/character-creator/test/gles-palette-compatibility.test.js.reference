import assert from "node:assert/strict";
import test from "node:test";

import { CjsCharacterGlesPaletteCompatibility } from "../../../src/character/gles/CjsCharacterGlesPaletteCompatibility.js";

const POLICY = Object.freeze({
    status: "policy",
    rule: "legacy-opengl-bone-capacity-mask-v1",
    shaderCapacity: 58,
    requiredBoneCount: 69,
    bonePrefixes: [ "RightHand" ]
});

test("masks affected triangles through the injected GLES geometry host", async () =>
{
    const mesh = CreateMesh();
    const calls = [];
    const compatibility = new CjsCharacterGlesPaletteCompatibility({
        geometryHost: {
            GetMeshes(resource)
            {
                calls.push([ "GetMeshes", resource ]);
                return resource.meshes;
            },
            async EnsureSystemMirror(resource)
            {
                calls.push([ "EnsureSystemMirror", resource ]);
            },
            UploadIndices(value)
            {
                calls.push([ "UploadIndices", value ]);
                return true;
            },
            async RebuildBounds(resource)
            {
                calls.push([ "RebuildBounds", resource ]);
            }
        }
    });
    const resource = { meshes: [ mesh ] };

    const report = await compatibility.Apply(resource, POLICY);

    assert.equal(report.status, "applied");
    assert.equal(report.matchedBoneCount, 1);
    assert.equal(report.maskedVertexCount, 1);
    assert.equal(report.maskedTriangleCount, 1);
    assert.deepEqual([ ...mesh.indexData ], [ 0, 0, 0 ]);
    assert.deepEqual(calls.map(([ name ]) => name), [
        "GetMeshes",
        "EnsureSystemMirror",
        "UploadIndices",
        "RebuildBounds"
    ]);
});

test("restores the original indices before applying the current policy", async () =>
{
    const mesh = CreateMesh();
    const compatibility = new CjsCharacterGlesPaletteCompatibility({
        geometryHost: CreateHost()
    });
    const resource = { meshes: [ mesh ] };

    await compatibility.Apply(resource, POLICY);
    mesh.indexData[0] = 2;
    await compatibility.Apply(resource, POLICY);

    assert.deepEqual([ ...mesh.indexData ], [ 0, 0, 0 ]);
});

test("requires a complete injected geometry host", () =>
{
    assert.throws(() => new CjsCharacterGlesPaletteCompatibility({
        geometryHost: {}
    }), /geometryHost\.GetMeshes/u);
});

function CreateMesh()
{
    return {
        indexData: new Uint16Array([ 0, 1, 2 ]),
        boneBindings: [ "Spine", "RightHand" ],
        _vertices: 3,
        declaration: { stride: 16 },
        bufferData: new Float32Array(12),
        GetVertexBlendIndice(output, vertex)
        {
            output.splice(0, 4, vertex === 1 ? 1 : 0, 0, 0, 0);
        },
        GetVertexBlendWeight(output)
        {
            output.splice(0, 4, 1, 0, 0, 0);
        }
    };
}

function CreateHost()
{
    return {
        GetMeshes: resource => resource.meshes,
        EnsureSystemMirror: async () => {},
        UploadIndices: () => true,
        RebuildBounds: async () => {}
    };
}
