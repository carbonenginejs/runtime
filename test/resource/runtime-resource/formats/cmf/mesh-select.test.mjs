import assert from "node:assert/strict";
import test from "node:test";
import CjsCmfFormat from "../../../../../src/resource/formats/cmf/index.js";

/**
 * `meshIndex` and `lodIndex` keep one mesh, one LOD of each mesh, or both.
 * Null, the default, keeps everything, and 0 is an index, not "unset".
 */

function triangle(offset)
{
    return {
        position: [ offset, 0, 0, offset + 1, 0, 0, offset, 1, 0 ]
    };
}

function sharedRoot()
{
    return {
        meshes: [
            {
                name: "first",
                vertex: triangle(0),
                indices: [ { name: "a", bytesPerIndex: 2, faces: [ 0, 1, 2 ] } ]
            },
            {
                name: "second",
                vertex: triangle(10),
                indices: [ { name: "a", bytesPerIndex: 2, faces: [ 0, 1, 2 ] } ],
                lods: [
                    { vertex: triangle(10), indices: [ { name: "a", bytesPerIndex: 2, faces: [ 0, 1, 2 ] } ] },
                    { vertex: triangle(20), indices: [ { name: "a", bytesPerIndex: 2, faces: [ 2, 1, 0 ] } ], threshold: 160 }
                ]
            }
        ]
    };
}

test("null and undefined keep every mesh and LOD", () =>
{
    for (const options of [ {}, { meshIndex: null, lodIndex: null }, { meshIndex: undefined } ])
    {
        const graph = CjsCmfFormat.loadShared(sharedRoot(), options);
        assert.deepEqual(graph.meshes.map(mesh => mesh.name), [ "first", "second" ]);
        assert.equal(graph.meshes[1].lods.length, 2);
    }
});

test("meshIndex 0 selects the first mesh", () =>
{
    const graph = CjsCmfFormat.loadShared(sharedRoot(), { meshIndex: 0 });
    assert.deepEqual(graph.meshes.map(mesh => mesh.name), [ "first" ]);
});

test("meshIndex selects one mesh with all its LODs", () =>
{
    const graph = CjsCmfFormat.loadShared(sharedRoot(), { meshIndex: 1 });
    assert.deepEqual(graph.meshes.map(mesh => mesh.name), [ "second" ]);
    assert.deepEqual(graph.meshes[0].lods.map(lod => lod.threshold), [ 0xffffffff, 160 ]);
});

test("lodIndex keeps one LOD as the mesh's first", () =>
{
    const graph = CjsCmfFormat.loadShared(sharedRoot(), { meshIndex: 1, lodIndex: 1 });
    const mesh = graph.meshes[0];
    assert.equal(mesh.lods.length, 1);
    assert.equal(mesh.lods[0].threshold, 0xffffffff);
    assert.equal(mesh.vertex, mesh.lods[0].vertex);
    assert.equal(mesh.indices, mesh.lods[0].indices);
    assert.equal(mesh.vertex.position[0], 20);
    assert.deepEqual(Array.from(mesh.indices[0].faces), [ 2, 1, 0 ]);
});

test("lodIndex alone applies to every mesh", () =>
{
    const graph = CjsCmfFormat.loadShared(sharedRoot(), { lodIndex: 0 });
    assert.deepEqual(graph.meshes.map(mesh => mesh.lods.length), [ 1, 1 ]);
    assert.throws(() => CjsCmfFormat.loadShared(sharedRoot(), { lodIndex: 1 }), RangeError);
});

test("loading a native graph selects without changing it", () =>
{
    const native = CjsCmfFormat.loadShared(sharedRoot());
    const selected = CjsCmfFormat.load(native, { emit: "raw", meshIndex: 1, lodIndex: 1 });
    assert.deepEqual(selected.meshes.map(mesh => mesh.name), [ "second" ]);
    assert.equal(selected.meshes[0].lods[0].threshold, 0xffffffff);
    assert.equal(native.meshes.length, 2);
    assert.deepEqual(native.meshes[1].lods.map(lod => lod.threshold), [ 0xffffffff, 160 ]);
    assert.equal(native.meshes[1].vertex.position[0], 10);
});

test("reading bytes selects too, raw output included", () =>
{
    const bytes = CjsCmfFormat.writeShared(sharedRoot());
    assert.deepEqual(CjsCmfFormat.read(bytes, { meshIndex: 1 }).meshes.map(mesh => mesh.name), [ "second" ]);
    const raw = CjsCmfFormat.read(bytes, { emit: "raw", meshIndex: 1, lodIndex: 1 });
    assert.deepEqual(raw.meshes.map(mesh => mesh.name), [ "second" ]);
    assert.equal(raw.meshes[0].vertex.position[0], 20);
    assert.deepEqual(CjsCmfFormat.readRaw(bytes, { meshIndex: 0 }).meshes.map(mesh => mesh.name), [ "first" ]);
});

test("a reader profile keeps its selection", () =>
{
    const reader = new CjsCmfFormat({ meshIndex: 1 });
    assert.equal(reader.GetValues().meshIndex, 1);
    assert.deepEqual(reader.LoadShared(sharedRoot()).meshes.map(mesh => mesh.name), [ "second" ]);
    assert.equal(reader.LoadShared(sharedRoot(), { meshIndex: null }).meshes.length, 2);
});

test("an absent mesh or LOD is a RangeError and a bad index a TypeError", () =>
{
    assert.throws(() => CjsCmfFormat.loadShared(sharedRoot(), { meshIndex: 2 }), RangeError);
    assert.throws(() => CjsCmfFormat.loadShared(sharedRoot(), { meshIndex: 1, lodIndex: 2 }), RangeError);
    for (const meshIndex of [ -1, 1.5, "1", false, NaN ])
    {
        assert.throws(() => CjsCmfFormat.loadShared(sharedRoot(), { meshIndex }), TypeError);
    }
});
