import assert from "node:assert/strict";
import test from "node:test";

import CjsStlFormat, { CjsStlFormat as NamedCjsStlFormat } from "../../../src/formats/stl/index.js";

const TETRA = Object.freeze({
    grannyFileFormatRevision: 0,
    grannyFileSource: "tetra",
    meshes: [
        {
            name: "tetra",
            morphTargets: [],
            minBounds: [ 0, 0, 0 ],
            maxBounds: [ 1, 1, 1 ],
            boneBindings: [],
            vertex: {
                position: [
                    0, 0, 0,
                    1, 0, 0,
                    0, 1, 0,
                    0, 0, 1
                ],
                blendIndice: [],
                tangent: [],
                normal: [],
                texcoord0: [],
                texcoord1: [],
                binormal: [],
                blendWeight: []
            },
            indices: [
                {
                    name: "default",
                    bytesPerIndex: 2,
                    faces: [
                        0, 2, 1,
                        0, 1, 3,
                        0, 3, 2,
                        1, 2, 3
                    ]
                }
            ]
        }
    ],
    models: [],
    animations: []
});

const OPEN_TRIANGLE = Object.freeze({
    ...TETRA,
    meshes: [
        {
            ...TETRA.meshes[0],
            indices: [
                {
                    name: "default",
                    bytesPerIndex: 2,
                    faces: [ 0, 1, 2 ]
                }
            ]
        }
    ]
});

test("package root exports one public class", () =>
{
    assert.equal(CjsStlFormat, NamedCjsStlFormat);
    assert.equal(CjsStlFormat.Output.JSON, "json");
    assert.equal(CjsStlFormat.Output.STL_JSON, "stlJson");
    assert.equal(CjsStlFormat.Output.SHARED, "shared");
    assert.equal(CjsStlFormat.Output.GR2, "gr2");
    assert.equal(CjsStlFormat.Output.CMF, "cmf");
    assert.deepEqual(Object.values(CjsStlFormat.outputs).filter(entry => entry.role === "runtime").map(entry => entry.output), [ "shared", "gr2", "cmf" ]);
    assert.deepEqual(Object.values(CjsStlFormat.outputs).filter(entry => entry.role === "debug").map(entry => entry.output), [ "json", "stlJson" ]);
    assert.ok(CjsStlFormat.CLASS_KEYS.includes("IndexGroup"));
    assert.ok(CjsStlFormat.CLASS_KEYS.includes("VertexElement"));
});

test("writes ASCII STL from shared JSON", () =>
{
    const text = CjsStlFormat.write(TETRA, { binary: false, solidName: "tetra" });
    assert.match(text, /^solid tetra/);
    assert.match(text, /facet normal/);
    assert.match(text, /endsolid tetra/);
    assert.equal(CjsStlFormat.isStl(text), true);
});

test("reads ASCII STL to shared JSON", () =>
{
    const text = CjsStlFormat.write(TETRA, { binary: false, solidName: "tetra" });
    const json = CjsStlFormat.read(text, { source: "inline.stl" });
    const shared = CjsStlFormat.read(text, { emit: "shared" });

    assert.equal(json.grannyFileSource, "inline.stl");
    assert.deepEqual(shared.meshes[0].indices, json.meshes[0].indices);
    assert.equal(json.meshes.length, 1);
    assert.equal(json.meshes[0].indices[0].faces.length, 12);
    assert.equal(json.meshes[0].vertex.position.length, 36);
    assert.equal(json.meshes[0].vertex.normal.length, 36);
});

test("writes and reads binary STL", () =>
{
    const bytes = CjsStlFormat.write(TETRA, { binary: true, solidName: "tetra" });
    assert.ok(bytes instanceof Uint8Array);
    assert.equal(bytes.byteLength, 84 + 4 * 50);
    assert.equal(CjsStlFormat.isBinaryStl(bytes), true);

    const json = CjsStlFormat.read(bytes, { source: "binary.stl", weldVertices: true });
    assert.equal(json.meshes[0].name, "tetra");
    assert.equal(json.meshes[0].vertex.position.length, 12);
    assert.equal(json.meshes[0].indices[0].faces.length, 12);
});

test("profile writer flattens index groups and applies scale without mutating input", () =>
{
    const mesh = {
        ...TETRA.meshes[0],
        indices: [
            { name: "first", faces: [ 0, 2, 1 ] },
            { name: "second", faces: [ 0, 1, 3 ] }
        ]
    };
    const positionsBefore = [ ...mesh.vertex.position ];
    const format = new CjsStlFormat({ binary: false, scale: 2, solidName: "two groups" });
    const text = format.Write(mesh);
    const report = CjsStlFormat.inspect(text);
    const roundTrip = CjsStlFormat.read(text, { weldVertices: true });

    assert.match(text, /^solid two_groups/u);
    assert.equal(report.triangleCount, 2);
    assert.deepEqual(roundTrip.meshes[0].maxBounds, [ 2, 2, 2 ]);
    assert.deepEqual(mesh.vertex.position, positionsBefore);
});

test("writer preserves requested normals and rejects lossy numeric output", () =>
{
    const mesh = {
        vertex: {
            position: [ 0, 0, 0, 1, 0, 0, 0, 1, 0 ],
            normal: [ 0, 0, -1, 0, 0, -1, 0, 0, -1 ]
        },
        indices: [ { name: "face", faces: [ 0, 1, 2 ] } ]
    };
    const text = CjsStlFormat.write(mesh, { binary: false, recalculateNormals: false });
    assert.match(text, /facet normal 0 0 -1/u);

    const fractional = {
        ...mesh,
        indices: [ { name: "fractional", faces: [ 0, 1, 1.5 ] } ]
    };
    assert.throws(
        () => CjsStlFormat.write(fractional),
        /index group "fractional" contains invalid vertex index 1\.5/u
    );

    const tooLarge = {
        ...mesh,
        vertex: {
            ...mesh.vertex,
            position: [ 0, 0, 0, 1e39, 0, 0, 0, 1, 0 ]
        }
    };
    assert.throws(
        () => CjsStlFormat.write(tooLarge, { binary: true, recalculateNormals: false }),
        /vertex coordinate exceeds binary STL float32 range/u
    );

    const scaleOverflow = {
        ...mesh,
        vertex: {
            ...mesh.vertex,
            position: [ 0, 0, 0, 2, 0, 0, 0, 1, 0 ]
        }
    };
    assert.throws(
        () => CjsStlFormat.write(scaleOverflow, { binary: false, scale: Number.MAX_VALUE }),
        /scaled vertex must contain finite numbers/u
    );
});

test("inspects closed tetrahedron as printable", () =>
{
    const report = CjsStlFormat.inspect(TETRA);
    assert.equal(report.printable, true);
    assert.equal(report.triangleCount, 4);
    assert.equal(report.openEdgeCount, 0);
    assert.equal(report.nonManifoldEdgeCount, 0);
    assert.equal(report.inconsistentWindingEdgeCount, 0);
    assert.equal(report.shellCount, 1);
});

test("inspects STL source name and byte length", () =>
{
    const text = CjsStlFormat.write(TETRA, { binary: false, solidName: "tetra" });
    const report = CjsStlFormat.inspect(text, { source: "tetra.stl" });

    assert.equal(report.format, "ascii");
    assert.equal(report.name, "tetra");
    assert.equal(report.byteLength, new TextEncoder().encode(text).byteLength);
    assert.equal(report.source, "tetra.stl");
});

test("inspects open triangle as not printable", () =>
{
    const report = CjsStlFormat.inspect(OPEN_TRIANGLE);
    assert.equal(report.printable, false);
    assert.equal(report.openEdgeCount, 3);
    assert.deepEqual(report.issues.map(issue => issue.key), [ "open_edges" ]);
});

test("requireWatertight rejects open meshes during write", () =>
{
    assert.throws(
        () => CjsStlFormat.write(OPEN_TRIANGLE, { requireWatertight: true }),
        /requireWatertight failed/
    );
});

test("hydrates caller-provided classes", () =>
{
    const Root = makeValueClass();
    const Mesh = makeValueClass();
    const IndexGroup = makeValueClass();

    const text = CjsStlFormat.write(TETRA, { binary: false, solidName: "tetra" });
    const format = new CjsStlFormat({
        classes: { Root, Mesh, IndexGroup }
    });

    const json = format.Read(text);
    assert.ok(json instanceof Root);
    assert.ok(json.meshes[0] instanceof Mesh);
    assert.ok(json.meshes[0].indices[0] instanceof IndexGroup);
    assert.equal(json.__setValuesCalls, 1);
    assert.equal(json.meshes[0].__setValuesCalls, 1);
    assert.equal(json.meshes[0].indices[0].__setValuesCalls, 1);
});

test("requires SetValues on caller-provided classes", () =>
{
    class Root {}

    const text = CjsStlFormat.write(TETRA, { binary: false, solidName: "tetra" });

    assert.throws(
        () => CjsStlFormat.read(text, { classes: { Root } }),
        /requires classes to implement SetValues/u
    );
});

test("emits explicit GR2 and CMF class targets", () =>
{
    const Root = makeValueClass();
    const Mesh = makeValueClass();
    const VertexElement = makeValueClass();

    const text = CjsStlFormat.write(TETRA, { binary: false, solidName: "tetra" });

    assert.throws(
        () => CjsStlFormat.read(text, { emit: "cmf" }),
        /requires explicit classes/
    );

    const gr2 = CjsStlFormat.read(text, {
        emit: "gr2",
        classes: { Root, Mesh }
    });
    assert.ok(gr2 instanceof Root);
    assert.ok(gr2.meshes[0] instanceof Mesh);

    const cmf = CjsStlFormat.read(text, {
        emit: "cmf",
        classes: { Root, Mesh, VertexElement }
    });
    assert.ok(cmf instanceof Root);
    assert.ok(cmf.meshes[0] instanceof Mesh);
    assert.ok(cmf.meshes[0].decl[0] instanceof VertexElement);
    assert.equal(cmf.version, 1);
});

function makeValueClass()
{
    return class
    {
        SetValues(values = {})
        {
            Object.defineProperty(this, "__setValuesCalls", {
                value: (this.__setValuesCalls || 0) + 1,
                writable: true,
                configurable: true,
                enumerable: false
            });
            for (const [ key, value ] of Object.entries(values))
            {
                this[key] = value;
            }
            return this;
        }
    };
}
