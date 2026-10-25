import assert from "node:assert/strict";
import test from "node:test";
import { CjsGr2Format } from "../../../../../src/resource/formats/gr2/CjsGr2Format.js";

/**
 * `meshIndex` counts the meshes the output holds: the file's meshes for JSON
 * and raw output, the meshes after LOD siblings fold in for CMF output.
 * `lodIndex` exists only for CMF output, where LODs are inside a mesh.
 */

class TestModel
{
    SetValues(values)
    {
        Object.assign(this, values);
        return this;
    }
}

function reflectedMesh(name, offset)
{
    const vertices = [
        { Position: [ offset, 0, 0 ] },
        { Position: [ offset + 1, 0, 0 ] },
        { Position: [ offset, 1, 0 ] }
    ];
    Object.defineProperty(vertices, "__type", { value: [ { name: "Position", arrayWidth: 3, type: 10 } ] });
    return {
        Name: name,
        BoneBindings: [],
        MorphTargets: [],
        PrimaryVertexData: { Vertices: vertices },
        PrimaryTopology: { Indices: [ 0, 1, 2 ], Groups: [ { MaterialIndex: 0, TriCount: 1, TriFirst: 0 } ] }
    };
}

function buildRaw()
{
    const meshes = [ reflectedMesh("Rail", 0), reflectedMesh("Hull", 10), reflectedMesh("Hull LOD 160", 20) ];
    return {
        version: 7,
        secCount: 3,
        fileInfo: {
            FromFileName: "select.gr2",
            Meshes: meshes,
            Models: [ { Name: "model", Skeleton: null, MeshBindings: meshes.map(mesh => ({ Mesh: mesh })) } ],
            Animations: [],
            Materials: [],
            Textures: []
        }
    };
}

const CMF = { emit: "cmf", classes: { Root: TestModel, Mesh: TestModel } };

test("JSON output keeps every file mesh by default", () =>
{
    const json = CjsGr2Format.read(buildRaw());
    assert.deepEqual(json.meshes.map(mesh => mesh.name), [ "Rail", "Hull", "Hull LOD 160" ]);
    assert.deepEqual(Array.from(json.models[0].meshBindings), [ 0, 1, 2 ]);
});

test("JSON meshIndex keeps one file mesh; other bindings read -1", () =>
{
    const first = CjsGr2Format.read(buildRaw(), { meshIndex: 0 });
    assert.deepEqual(first.meshes.map(mesh => mesh.name), [ "Rail" ]);

    const json = CjsGr2Format.read(buildRaw(), { meshIndex: 2 });
    assert.deepEqual(json.meshes.map(mesh => mesh.name), [ "Hull LOD 160" ]);
    assert.deepEqual(Array.from(json.models[0].meshBindings), [ -1, -1, 0 ]);
});

test("raw output selects without changing the read it was given", () =>
{
    const raw = buildRaw();
    const selected = CjsGr2Format.read(raw, { emit: "raw", meshIndex: 1 });
    assert.deepEqual(selected.fileInfo.Meshes.map(mesh => mesh.Name), [ "Hull" ]);
    assert.equal(raw.fileInfo.Meshes.length, 3);
});

test("CMF meshIndex counts meshes after LOD siblings fold in", () =>
{
    const all = CjsGr2Format.read(buildRaw(), CMF);
    assert.deepEqual(all.meshes.map(mesh => mesh.name), [ "Rail", "Hull" ]);

    const hull = CjsGr2Format.read(buildRaw(), { ...CMF, meshIndex: 1 });
    assert.deepEqual(hull.meshes.map(mesh => mesh.name), [ "Hull" ]);
    assert.deepEqual(hull.meshes[0].lods.map(lod => lod.threshold), [ 0xffffffff, 160 ]);
});

test("CMF lodIndex keeps one LOD as the mesh's first", () =>
{
    const low = CjsGr2Format.read(buildRaw(), { ...CMF, meshIndex: 1, lodIndex: 1 });
    const mesh = low.meshes[0];
    assert.equal(mesh.lods.length, 1);
    assert.equal(mesh.lods[0].threshold, 0xffffffff);
    assert.equal(mesh.vertex.position[0], 20);
});

test("lodIndex outside CMF output is a TypeError", () =>
{
    assert.throws(() => CjsGr2Format.read(buildRaw(), { lodIndex: 0 }), /lodIndex needs emit "cmf"/);
    assert.throws(() => CjsGr2Format.read(buildRaw(), { emit: "raw", lodIndex: 0 }), TypeError);
});

test("an absent mesh is a RangeError and a bad index a TypeError", () =>
{
    assert.throws(() => CjsGr2Format.read(buildRaw(), { meshIndex: 3 }), RangeError);
    assert.throws(() => CjsGr2Format.read(buildRaw(), { ...CMF, meshIndex: 2 }), RangeError);
    for (const meshIndex of [ -1, 0.5, "0", true ])
    {
        assert.throws(() => CjsGr2Format.read(buildRaw(), { meshIndex }), TypeError);
    }
});

test("a reader profile keeps its selection and its bounds rebuild", () =>
{
    const reader = new CjsGr2Format({ meshIndex: 1, rebuildMissingBounds: true });
    const values = reader.GetValues();
    assert.equal(values.meshIndex, 1);
    assert.equal(values.rebuildMissingBounds, true);
    const json = reader.Read(buildRaw());
    assert.deepEqual(json.meshes.map(mesh => mesh.name), [ "Hull" ]);
    assert.deepEqual(Array.from(json.meshes[0].maxBounds), [ 11, 1, 0 ]);
});
