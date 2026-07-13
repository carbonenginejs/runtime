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
    assert.equal(CjsStlFormat.OUTPUT_JSON, "json");
    assert.equal(CjsStlFormat.OUTPUT_STL_JSON, "stlJson");
    assert.equal(CjsStlFormat.OUTPUT_SHARED, "shared");
    assert.equal(CjsStlFormat.OUTPUT_GR2, "gr2");
    assert.equal(CjsStlFormat.OUTPUT_CMF, "cmf");
    assert.deepEqual(CjsStlFormat.outputTypes, [ "shared", "gr2", "cmf" ]);
    assert.deepEqual(CjsStlFormat.debugOutputTypes, [ "json", "stlJson" ]);
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
    assert.equal(json.meshes[0].vertex.position.length, 12);
    assert.equal(json.meshes[0].indices[0].faces.length, 12);
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
