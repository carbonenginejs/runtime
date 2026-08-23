import assert from "node:assert/strict";
import test from "node:test";

import CjsObjFormat, { CjsObjFormat as NamedFormat } from "../../../src/formats/obj/index.js";

const QUAD_OBJ = `
# simple quad
o Quad
v 0 0 0
v 1 0 0
v 1 1 0
v 0 1 0
vt 0 0
vt 1 0
vt 1 1
vt 0 1
usemtl Hull
f 1/1 2/2 3/3 4/4
`;

function almostEqual(actual, expected, epsilon = 1e-6)
{
    assert.equal(actual.length, expected.length);
    for (let i = 0; i < actual.length; i++)
    {
        assert.ok(Math.abs(actual[i] - expected[i]) <= epsilon, `index ${i}: ${actual[i]} !== ${expected[i]}`);
    }
}

test("default export and named export are the same CjsObjFormat class", () => {
    assert.equal(CjsObjFormat, NamedFormat);
    assert.equal(CjsObjFormat.Output.JSON, "json");
    assert.equal(CjsObjFormat.Output.OBJ_JSON, "objJson");
    assert.equal(CjsObjFormat.Output.SHARED, "shared");
    assert.equal(CjsObjFormat.Output.GR2, "gr2");
    assert.equal(CjsObjFormat.Output.CMF, "cmf");
    assert.deepEqual(Object.values(CjsObjFormat.outputs).filter(entry => entry.role === "runtime").map(entry => entry.output), [ "shared", "gr2", "cmf" ]);
    assert.deepEqual(Object.values(CjsObjFormat.outputs).filter(entry => entry.role === "debug").map(entry => entry.output), [ "json", "objJson" ]);
});

test("reads a triangulated OBJ quad into the shared JSON mesh schema", () => {
    const json = CjsObjFormat.read(QUAD_OBJ, { source: "quad.obj" });
    const shared = CjsObjFormat.read(QUAD_OBJ, { emit: "shared" });

    assert.equal(json.grannyFileFormatRevision, 0);
    assert.equal(json.grannyFileSource, "quad.obj");
    assert.deepEqual(shared.meshes[0].indices, json.meshes[0].indices);
    assert.equal(json.models.length, 0);
    assert.equal(json.animations.length, 0);
    assert.equal(json.meshes.length, 1);

    const mesh = json.meshes[0];
    assert.equal(mesh.name, "Quad");
    assert.deepEqual(mesh.minBounds, [ 0, 0, 0 ]);
    assert.deepEqual(mesh.maxBounds, [ 1, 1, 0 ]);
    assert.deepEqual(mesh.vertex.position, [
        0, 0, 0,
        1, 0, 0,
        1, 1, 0,
        0, 1, 0
    ]);
    assert.deepEqual(mesh.vertex.texcoord0, [
        0, 0,
        1, 0,
        1, 1,
        0, 1
    ]);
    assert.deepEqual(mesh.vertex.normal, []);
    assert.deepEqual(mesh.vertex.tangent, []);
    assert.deepEqual(mesh.vertex.binormal, []);
    assert.equal(mesh.indices.length, 1);
    assert.deepEqual(mesh.indices[0], {
        name: "Hull",
        bytesPerIndex: 2,
        faces: [ 0, 1, 2, 0, 2, 3 ]
    });
});

test("supports negative OBJ indices", () => {
    const json = CjsObjFormat.read(`
v 0 0 0
v 1 0 0
v 1 1 0
v 0 1 0
f -4 -3 -2 -1
`);

    const mesh = json.meshes[0];
    assert.equal(mesh.name, "obj_mesh");
    assert.deepEqual(mesh.vertex.texcoord0, []);
    assert.deepEqual(mesh.indices[0].faces, [ 0, 1, 2, 0, 2, 3 ]);
});

test("can rebuild missing normals, tangents and binormals", () => {
    const json = CjsObjFormat.read(QUAD_OBJ, {
        rebuildMissingNormals: true,
        rebuildMissingTangents: true,
        rebuildMissingBiNormals: true
    });

    const mesh = json.meshes[0];
    almostEqual(mesh.vertex.normal, [
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1
    ]);
    almostEqual(mesh.vertex.tangent, [
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,
        1, 0, 0
    ]);
    almostEqual(mesh.vertex.binormal, [
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
        0, 1, 0
    ]);
});

test("can pack generated tangent frames for GR2-style shader inputs", () => {
    const json = CjsObjFormat.read(QUAD_OBJ, {
        packTangents: true
    });

    const mesh = json.meshes[0];
    assert.deepEqual(mesh.vertex.normal, []);
    assert.deepEqual(mesh.vertex.binormal, []);
    almostEqual(mesh.vertex.tangent, [
        0.5, 0.75, 0.75, 0.75,
        0.5, 0.75, 0.75, 0.75,
        0.5, 0.75, 0.75, 0.75,
        0.5, 0.75, 0.75, 0.75
    ]);
});

test("can flip generated UV handedness for packed tangent frames", () => {
    const json = CjsObjFormat.read(QUAD_OBJ, {
        packTangents: true,
        uvHandedness: "left"
    });

    almostEqual(json.meshes[0].vertex.tangent, [
        0.5, 0.25, 0.25, 0.75,
        0.5, 0.25, 0.25, 0.75,
        0.5, 0.25, 0.25, 0.75,
        0.5, 0.25, 0.25, 0.75
    ]);
});

test("packTangents can be controlled per mesh with a rule function", () => {
    const json = CjsObjFormat.read(QUAD_OBJ, {
        packTangents: ({ mesh }) => mesh.name === "Nope"
    });

    const mesh = json.meshes[0];
    assert.deepEqual(mesh.vertex.normal, []);
    assert.deepEqual(mesh.vertex.tangent, []);
    assert.deepEqual(mesh.vertex.binormal, []);
});

test("inspects OBJ text without class hydration", () => {
    const summary = CjsObjFormat.inspect(QUAD_OBJ, { source: "inline.obj" });

    assert.deepEqual(summary, {
        source: "inline.obj",
        format: "obj",
        meshCount: 1,
        triangleCount: 2,
        meshes: [ {
            name: "Quad",
            vertexCount: 4,
            triangleCount: 2,
            indexGroupCount: 1,
            indexGroupNames: [ "Hull" ],
            hasNormals: false,
            hasTangents: false,
            hasBiNormals: false,
            hasTexcoord0: true
        } ]
    });
});

test("hydrates configured node classes", () => {
    const Root = makeValueClass();
    const Mesh = makeValueClass();
    const IndexGroup = makeValueClass();

    const format = new CjsObjFormat({
        classes: { Root, Mesh }
    });
    format.SetClass("IndexGroup", IndexGroup);

    const json = format.Read(QUAD_OBJ);

    assert.ok(json instanceof Root);
    assert.ok(json.meshes[0] instanceof Mesh);
    assert.ok(json.meshes[0].indices[0] instanceof IndexGroup);
    assert.equal(json.__setValuesCalls, 1);
    assert.deepEqual(json.__setValuesOptions, { source: "memory", skipUpdate: true, skipEvents: true });
    assert.equal(json.meshes[0].__setValuesCalls, 1);
    assert.equal(json.meshes[0].indices[0].__setValuesCalls, 1);
    assert.equal(format.HasClass("Mesh"), true);
    assert.equal(format.GetClass("Mesh"), Mesh);
});

test("requires SetValues on configured node classes", () => {
    class Root {}

    assert.throws(
        () => CjsObjFormat.read(QUAD_OBJ, { classes: { Root } }),
        /requires classes to implement SetValues/u
    );
});

test("emits explicit GR2 and CMF class targets", () => {
    const Root = makeValueClass();
    const Mesh = makeValueClass();
    const VertexElement = makeValueClass();

    assert.throws(
        () => CjsObjFormat.read(QUAD_OBJ, { emit: "cmf" }),
        /requires explicit classes/
    );

    const gr2 = CjsObjFormat.read(QUAD_OBJ, {
        emit: "gr2",
        classes: { Root, Mesh }
    });
    assert.ok(gr2 instanceof Root);
    assert.ok(gr2.meshes[0] instanceof Mesh);
    assert.equal(gr2.grannyFileSource, "memory");

    const cmf = CjsObjFormat.read(QUAD_OBJ, {
        emit: "cmf",
        classes: { Root, Mesh, VertexElement }
    });
    assert.ok(cmf instanceof Root);
    assert.ok(cmf.meshes[0] instanceof Mesh);
    assert.ok(cmf.meshes[0].decl[0] instanceof VertexElement);
    assert.equal(cmf.version, 1);
});

test("accepts UTF-8 byte input", () => {
    const bytes = new TextEncoder().encode(QUAD_OBJ);
    const json = CjsObjFormat.read(bytes);

    assert.equal(json.meshes[0].name, "Quad");
});

function makeValueClass() {
    return class {
        SetValues(values = {}, options = {}) {
            this.__setValuesOptions = options;
            Object.defineProperty(this, "__setValuesCalls", {
                value: (this.__setValuesCalls || 0) + 1,
                writable: true,
                configurable: true,
                enumerable: false
            });
            for (const [ key, value ] of Object.entries(values)) {
                this[key] = value;
            }
            return new Set(Object.keys(values));
        }
    };
}
