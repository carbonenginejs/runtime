import assert from "node:assert/strict";
import test from "node:test";
import { deflateSync } from "node:zlib";
import CjsFbxFormat, { CjsFbxFormat as NamedCjsFbxFormat } from "../../../src/formats/fbx/index.js";

const FBX_TICKS_PER_SECOND = 46186158000;

test("exports default and named CjsFbxFormat", () =>
{
    assert.equal(CjsFbxFormat, NamedCjsFbxFormat);
    assert.deepEqual(CjsFbxFormat.inputTypes, [ "fbx" ]);
    assert.equal(CjsFbxFormat.OUTPUT_GR2, "gr2");
    assert.deepEqual(CjsFbxFormat.outputTypes, [ "gr2", "cmf" ]);
    assert.deepEqual(CjsFbxFormat.debugOutputTypes, [ "fbxJson", "raw" ]);
    assert.equal(CjsFbxFormat.CLASS_KEYS.includes("Mesh"), true);
});

test("configures output classes without hydrating debug fbxJson", () =>
{
    class Mesh
    {
    }

    const reader = new CjsFbxFormat();
    reader.SetClass("Mesh", Mesh);

    const bytes = makeBinaryFBX(7400, [
        makeBinaryNode7400("Objects", [], [
            makeBinaryNode7400("Geometry", [ 123, "Geometry::Mesh", "Mesh" ])
        ])
    ]);
    const json = reader.Read(bytes, { emit: "fbxJson" });

    assert.equal(reader.GetClass("Mesh"), Mesh);
    assert.equal(reader.HasClass("Mesh"), true);
    assert.equal(json.nodes[0] instanceof Mesh, false);
});

test("requires explicit classes for gr2 output before parsing", () =>
{
    assert.throws(
        () => CjsFbxFormat.read(new Uint8Array([ 1, 2, 3 ]), { emit: "gr2" }),
        /requires explicit classes/u
    );
});

test("requires SetValues on class outputs", () =>
{
    class Root
    {
    }

    const bytes = makeStaticTriangleFBX();

    assert.throws(
        () => CjsFbxFormat.read(bytes, { emit: "gr2", classes: { Root } }),
        /requires classes to implement SetValues/u
    );
});

test("emits gr2 classes for static binary mesh without debug parsing", () =>
{
    const
        Root = makeValueClass(),
        Mesh = makeValueClass(),
        IndexGroup = makeValueClass();

    const bytes = makeBinaryFBX(7400, [
        makeBinaryNode7400("Poison", [ makeUnknownProperty("Z") ]),
        makeBinaryNode7400("Objects", [], [
            makeBinaryNode7400("Geometry", [ 123, "Geometry::Hull", "Mesh" ], [
                makeBinaryNode7400("Vertices", [ new Float64Array([
                    0, 0, 0,
                    1, 0, 0,
                    1, 1, 0,
                    0, 1, 0
                ]) ]),
                makeBinaryNode7400("PolygonVertexIndex", [ new Int32Array([ 0, 1, 2, -4 ]) ])
            ]),
            makeBinaryNode7400("Model", [ 456, "Model::Ship", "Mesh" ])
        ]),
        makeBinaryNode7400("Connections", [], [
            makeBinaryNode7400("C", [ "OO", 123, 456 ])
        ])
    ]);

    const gr2 = CjsFbxFormat.read(bytes, {
        emit: "gr2",
        source: "ship.fbx",
        classes: { Root, Mesh, IndexGroup }
    });

    assert.throws(
        () => CjsFbxFormat.read(bytes, { emit: "fbxJson" }),
        /unsupported property type "Z"/u
    );
    assert.equal(gr2 instanceof Root, true);
    assert.equal(gr2.__setValuesCalls, 1);
    assert.equal(gr2.meshes[0] instanceof Mesh, true);
    assert.equal(gr2.meshes[0].__setValuesCalls, 1);
    assert.equal(gr2.meshes[0].indices[0] instanceof IndexGroup, true);
    assert.equal(gr2.meshes[0].indices[0].__setValuesCalls, 1);
    assert.equal(gr2.grannyFileSource, "ship.fbx");
    assert.equal(gr2.meshes[0].name, "Ship");
    assert.deepEqual(gr2.meshes[0].minBounds, [ 0, 0, 0 ]);
    assert.deepEqual(gr2.meshes[0].maxBounds, [ 1, 1, 0 ]);
    assert.deepEqual(gr2.meshes[0].vertex.position, [
        0, 0, 0,
        1, 0, 0,
        1, 1, 0,
        0, 1, 0
    ]);
    assert.equal(gr2.meshes[0].indices[0].name, "default");
    assert.equal(gr2.meshes[0].indices[0].bytesPerIndex, 2);
    assert.deepEqual(gr2.meshes[0].indices[0].faces, [ 0, 1, 2, 0, 2, 3 ]);
    assert.deepEqual(gr2.models, []);
    assert.deepEqual(gr2.animations, []);
});

test("triangulates concave n-gon polygons for gr2 output", () =>
{
    const
        Root = makeValueClass(),
        Mesh = makeValueClass(),
        IndexGroup = makeValueClass();

    const bytes = makeBinaryFBX(7400, [
        makeBinaryNode7400("Objects", [], [
            makeBinaryNode7400("Geometry", [ 123, "Geometry::Concave", "Mesh" ], [
                makeBinaryNode7400("Vertices", [ new Float64Array([
                    0, 0, 0,
                    2, 0, 0,
                    2, 2, 0,
                    1, 1, 0,
                    0, 2, 0
                ]) ]),
                makeBinaryNode7400("PolygonVertexIndex", [ new Int32Array([ 0, 1, 2, 3, -5 ]) ])
            ])
        ])
    ]);

    const mesh = CjsFbxFormat.read(bytes, {
        emit: "gr2",
        classes: { Root, Mesh, IndexGroup }
    }).meshes[0];

    assert.deepEqual(mesh.indices[0].faces, [
        1, 2, 3,
        0, 1, 3,
        0, 3, 4
    ]);
});

test("triangulates concave n-gon polygons outside the xy plane", () =>
{
    const
        Root = makeValueClass(),
        Mesh = makeValueClass(),
        IndexGroup = makeValueClass();

    const bytes = makeBinaryFBX(7400, [
        makeBinaryNode7400("Objects", [], [
            makeBinaryNode7400("Geometry", [ 123, "Geometry::ConcaveXZ", "Mesh" ], [
                makeBinaryNode7400("Vertices", [ new Float64Array([
                    0, 0, 0,
                    2, 0, 0,
                    2, 0, 2,
                    1, 0, 1,
                    0, 0, 2
                ]) ]),
                makeBinaryNode7400("PolygonVertexIndex", [ new Int32Array([ 0, 1, 2, 3, -5 ]) ])
            ])
        ])
    ]);

    const mesh = CjsFbxFormat.read(bytes, {
        emit: "gr2",
        classes: { Root, Mesh, IndexGroup }
    }).meshes[0];

    assert.deepEqual(mesh.indices[0].faces, [
        1, 2, 3,
        0, 1, 3,
        0, 3, 4
    ]);
});

test("preserves clockwise winding for concave n-gon triangulation", () =>
{
    const
        Root = makeValueClass(),
        Mesh = makeValueClass(),
        IndexGroup = makeValueClass();

    const bytes = makeBinaryFBX(7400, [
        makeBinaryNode7400("Objects", [], [
            makeBinaryNode7400("Geometry", [ 123, "Geometry::ConcaveClockwise", "Mesh" ], [
                makeBinaryNode7400("Vertices", [ new Float64Array([
                    0, 0, 0,
                    2, 0, 0,
                    2, 2, 0,
                    1, 1, 0,
                    0, 2, 0
                ]) ]),
                makeBinaryNode7400("PolygonVertexIndex", [ new Int32Array([ 4, 3, 2, 1, -1 ]) ])
            ])
        ])
    ]);

    const mesh = CjsFbxFormat.read(bytes, {
        emit: "gr2",
        classes: { Root, Mesh, IndexGroup }
    }).meshes[0];

    const areas = [];
    for (let i = 0; i < mesh.indices[0].faces.length; i += 3)
    {
        areas.push(triangleSignedAreaXY(mesh.vertex.position, mesh.indices[0].faces[i], mesh.indices[0].faces[i + 1], mesh.indices[0].faces[i + 2]));
    }

    assert.equal(mesh.indices[0].faces.length, 9);
    assert.equal(areas.every(area => area < 0), true);
    assert.equal(Math.abs(areas.reduce((sum, area) => sum + area, 0)), 3);
});

test("keeps concave n-gon material groups and layer channels", () =>
{
    const
        Root = makeValueClass(),
        Mesh = makeValueClass(),
        IndexGroup = makeValueClass();

    const bytes = makeBinaryFBX(7400, [
        makeBinaryNode7400("Objects", [], [
            makeBinaryNode7400("Geometry", [ 123, "Geometry::ConcaveLayers", "Mesh" ], [
                makeBinaryNode7400("Vertices", [ new Float64Array([
                    0, 0, 0,
                    2, 0, 0,
                    2, 2, 0,
                    1, 1, 0,
                    0, 2, 0,
                    3, 0, 0,
                    4, 0, 0,
                    3, 1, 0
                ]) ]),
                makeBinaryNode7400("PolygonVertexIndex", [ new Int32Array([ 0, 1, 2, 3, -5, 5, 6, -8 ]) ]),
                makeBinaryNode7400("LayerElementNormal", [ 0 ], [
                    makeBinaryNode7400("MappingInformationType", [ "ByPolygonVertex" ]),
                    makeBinaryNode7400("ReferenceInformationType", [ "IndexToDirect" ]),
                    makeBinaryNode7400("Normals", [ new Float64Array([
                        0, 0, 1,
                        0, 1, 0
                    ]) ]),
                    makeBinaryNode7400("NormalsIndex", [ new Int32Array([ 0, 0, 0, 0, 0, 1, 1, 1 ]) ])
                ]),
                makeBinaryNode7400("LayerElementUV", [ 0 ], [
                    makeBinaryNode7400("MappingInformationType", [ "ByPolygonVertex" ]),
                    makeBinaryNode7400("ReferenceInformationType", [ "IndexToDirect" ]),
                    makeBinaryNode7400("UV", [ new Float64Array([
                        0, 0,
                        1, 0,
                        1, 1,
                        0.5, 0.5,
                        0, 1,
                        2, 0,
                        3, 0,
                        2, 1
                    ]) ]),
                    makeBinaryNode7400("UVIndex", [ new Int32Array([ 0, 1, 2, 3, 4, 5, 6, 7 ]) ])
                ]),
                makeBinaryNode7400("LayerElementMaterial", [ 0 ], [
                    makeBinaryNode7400("MappingInformationType", [ "ByPolygon" ]),
                    makeBinaryNode7400("ReferenceInformationType", [ "IndexToDirect" ]),
                    makeBinaryNode7400("Materials", [ new Int32Array([ 0, 1 ]) ])
                ])
            ]),
            makeBinaryNode7400("Model", [ 456, "Model::ConcaveLayers", "Mesh" ]),
            makeBinaryNode7400("Material", [ 700, "Material::Steel", "" ]),
            makeBinaryNode7400("Material", [ 701, "Material::Glass", "" ])
        ]),
        makeBinaryNode7400("Connections", [], [
            makeBinaryNode7400("C", [ "OO", 123, 456 ]),
            makeBinaryNode7400("C", [ "OO", 700, 456 ]),
            makeBinaryNode7400("C", [ "OO", 701, 456 ])
        ])
    ]);

    const mesh = CjsFbxFormat.read(bytes, {
        emit: "gr2",
        classes: { Root, Mesh, IndexGroup }
    }).meshes[0];

    assert.deepEqual(mesh.indices.map(group => ({
        name: group.name,
        faces: group.faces
    })), [
        { name: "Steel", faces: [ 1, 2, 3, 0, 1, 3, 0, 3, 4 ] },
        { name: "Glass", faces: [ 5, 6, 7 ] }
    ]);
    assert.deepEqual(mesh.vertex.normal, [
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 1, 0,
        0, 1, 0,
        0, 1, 0
    ]);
    assert.deepEqual(mesh.vertex.texcoord0, [
        0, 1,
        1, 1,
        1, 0,
        0.5, 0.5,
        0, 0,
        2, 1,
        3, 1,
        2, 0
    ]);
});

test("emits gr2 normals uvs and material index groups", () =>
{
    const
        Root = makeValueClass(),
        Mesh = makeValueClass(),
        IndexGroup = makeValueClass();

    const bytes = makeBinaryFBX(7400, [
        makeBinaryNode7400("Objects", [], [
            makeBinaryNode7400("Geometry", [ 123, "Geometry::Hull", "Mesh" ], [
                makeBinaryNode7400("Vertices", [ new Float64Array([
                    0, 0, 0,
                    1, 0, 0,
                    1, 1, 0,
                    0, 1, 0
                ]) ]),
                makeBinaryNode7400("PolygonVertexIndex", [ new Int32Array([ 0, 1, -3, 0, 2, -4 ]) ]),
                makeBinaryNode7400("LayerElementNormal", [ 0 ], [
                    makeBinaryNode7400("MappingInformationType", [ "ByPolygonVertex" ]),
                    makeBinaryNode7400("ReferenceInformationType", [ "Direct" ]),
                    makeBinaryNode7400("Normals", [ new Float64Array([
                        0, 0, 1,
                        0, 0, 1,
                        0, 0, 1,
                        0, 0, 1,
                        0, 0, 1,
                        0, 0, 1
                    ]) ])
                ]),
                makeBinaryNode7400("LayerElementTangent", [ 0 ], [
                    makeBinaryNode7400("MappingInformationType", [ "AllSame" ]),
                    makeBinaryNode7400("ReferenceInformationType", [ "Direct" ]),
                    makeBinaryNode7400("Tangents", [ new Float64Array([ 1, 0, 0 ]) ])
                ]),
                makeBinaryNode7400("LayerElementBinormal", [ 0 ], [
                    makeBinaryNode7400("MappingInformationType", [ "AllSame" ]),
                    makeBinaryNode7400("ReferenceInformationType", [ "Direct" ]),
                    makeBinaryNode7400("Binormals", [ new Float64Array([ 0, 1, 0 ]) ])
                ]),
                makeBinaryNode7400("LayerElementUV", [ 0 ], [
                    makeBinaryNode7400("MappingInformationType", [ "ByPolygonVertex" ]),
                    makeBinaryNode7400("ReferenceInformationType", [ "IndexToDirect" ]),
                    makeBinaryNode7400("UV", [ new Float64Array([
                        0, 0,
                        1, 0,
                        1, 1,
                        0, 1
                    ]) ]),
                    makeBinaryNode7400("UVIndex", [ new Int32Array([ 0, 1, 2, 0, 2, 3 ]) ])
                ]),
                makeBinaryNode7400("LayerElementColor", [ 0 ], [
                    makeBinaryNode7400("MappingInformationType", [ "ByPolygonVertex" ]),
                    makeBinaryNode7400("ReferenceInformationType", [ "Direct" ]),
                    makeBinaryNode7400("Colors", [ new Float64Array([
                        1, 0, 0, 1,
                        0, 1, 0, 1,
                        0, 0, 1, 1,
                        1, 0, 0, 1,
                        0, 0, 1, 1,
                        1, 1, 1, 1
                    ]) ])
                ]),
                makeBinaryNode7400("LayerElementMaterial", [ 0 ], [
                    makeBinaryNode7400("MappingInformationType", [ "ByPolygon" ]),
                    makeBinaryNode7400("ReferenceInformationType", [ "IndexToDirect" ]),
                    makeBinaryNode7400("Materials", [ new Int32Array([ 0, 1 ]) ])
                ])
            ]),
            makeBinaryNode7400("Model", [ 456, "Model::Ship", "Mesh" ]),
            makeBinaryNode7400("Material", [ 700, "Material::Steel", "" ]),
            makeBinaryNode7400("Material", [ 701, "Material::Glass", "" ])
        ]),
        makeBinaryNode7400("Connections", [], [
            makeBinaryNode7400("C", [ "OO", 123, 456 ]),
            makeBinaryNode7400("C", [ "OO", 700, 456 ]),
            makeBinaryNode7400("C", [ "OO", 701, 456 ])
        ])
    ]);

    const mesh = CjsFbxFormat.read(bytes, {
        emit: "gr2",
        classes: { Root, Mesh, IndexGroup }
    }).meshes[0];

    assert.deepEqual(mesh.vertex.position, [
        0, 0, 0,
        1, 0, 0,
        1, 1, 0,
        0, 0, 0,
        1, 1, 0,
        0, 1, 0
    ]);
    assert.deepEqual(mesh.vertex.normal, [
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1
    ]);
    assert.deepEqual(mesh.vertex.tangent, [
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,
        1, 0, 0
    ]);
    assert.deepEqual(mesh.vertex.binormal, [
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
        0, 1, 0
    ]);
    assert.deepEqual(mesh.vertex.texcoord0, [
        0, 1,
        1, 1,
        1, 0,
        0, 1,
        1, 0,
        0, 0
    ]);
    assert.deepEqual(mesh.vertex.color0, [
        1, 0, 0, 1,
        0, 1, 0, 1,
        0, 0, 1, 1,
        1, 0, 0, 1,
        0, 0, 1, 1,
        1, 1, 1, 1
    ]);
    assert.deepEqual(mesh.indices.map(group => ({
        name: group.name,
        bytesPerIndex: group.bytesPerIndex,
        faces: group.faces
    })), [
        { name: "Steel", bytesPerIndex: 2, faces: [ 0, 1, 2 ] },
        { name: "Glass", bytesPerIndex: 2, faces: [ 3, 4, 5 ] }
    ]);
});

test("flips FBX UV V coordinates by default and supports raw V override", () =>
{
    const
        Root = makeValueClass(),
        Mesh = makeValueClass(),
        IndexGroup = makeValueClass(),
        classes = { Root, Mesh, IndexGroup },
        bytes = makeUvTriangleFBX();

    const defaultMesh = CjsFbxFormat.read(bytes, {
        emit: "gr2",
        classes
    }).meshes[0];
    const rawMesh = CjsFbxFormat.read(bytes, {
        emit: "gr2",
        classes,
        flipV: false
    }).meshes[0];

    assert.deepEqual(defaultMesh.vertex.texcoord0, [
        0.25, 0.8,
        0.5, 0.25,
        1, 0
    ]);
    assert.deepEqual(rawMesh.vertex.texcoord0, [
        0.25, 0.2,
        0.5, 0.75,
        1, 1
    ]);
});

test("generates base mesh tangent space when normals and uvs are present", () =>
{
    const
        Root = makeValueClass(),
        Mesh = makeValueClass(),
        IndexGroup = makeValueClass();

    const mesh = CjsFbxFormat.read(makeGeneratedTangentTriangleFBX(), {
        emit: "gr2",
        classes: { Root, Mesh, IndexGroup }
    }).meshes[0];

    assertFloatArrayClose(mesh.vertex.tangent, [
        1, 0, 0,
        1, 0, 0,
        1, 0, 0
    ]);
    assertFloatArrayClose(mesh.vertex.binormal, [
        0, 1, 0,
        0, 1, 0,
        0, 1, 0
    ]);
});

test("applies model transforms and global unit scale to static meshes", () =>
{
    const
        Root = makeValueClass(),
        Mesh = makeValueClass(),
        IndexGroup = makeValueClass();

    const bytes = makeBinaryFBX(7400, [
        makeBinaryNode7400("GlobalSettings", [], [
            makeBinaryNode7400("Properties70", [], [
                makeBinaryNode7400("P", [ "UnitScaleFactor", "double", "Number", "", 50 ])
            ])
        ]),
        makeBinaryNode7400("Objects", [], [
            makeBinaryNode7400("Geometry", [ 123, "Geometry::Triangle", "Mesh" ], [
                makeBinaryNode7400("Vertices", [ new Float64Array([
                    0, 0, 0,
                    1, 0, 0,
                    0, 1, 0
                ]) ]),
                makeBinaryNode7400("PolygonVertexIndex", [ new Int32Array([ 0, 1, -3 ]) ]),
                makeBinaryNode7400("LayerElementNormal", [ 0 ], [
                    makeBinaryNode7400("MappingInformationType", [ "AllSame" ]),
                    makeBinaryNode7400("ReferenceInformationType", [ "Direct" ]),
                    makeBinaryNode7400("Normals", [ new Float64Array([ 0, 0, 1 ]) ])
                ]),
                makeBinaryNode7400("LayerElementTangent", [ 0 ], [
                    makeBinaryNode7400("MappingInformationType", [ "AllSame" ]),
                    makeBinaryNode7400("ReferenceInformationType", [ "Direct" ]),
                    makeBinaryNode7400("Tangents", [ new Float64Array([ 1, 0, 0 ]) ])
                ])
            ]),
            makeBinaryNode7400("Model", [ 456, "Model::Transformed", "Mesh" ], [
                makeBinaryNode7400("Properties70", [], [
                    makeBinaryNode7400("P", [ "Lcl Translation", "Lcl Translation", "", "A", 10, 0, 0 ]),
                    makeBinaryNode7400("P", [ "Lcl Rotation", "Lcl Rotation", "", "A", 0, 0, 90 ]),
                    makeBinaryNode7400("P", [ "Lcl Scaling", "Lcl Scaling", "", "A", 2, 2, 2 ])
                ])
            ])
        ]),
        makeBinaryNode7400("Connections", [], [
            makeBinaryNode7400("C", [ "OO", 123, 456 ])
        ])
    ]);

    const mesh = CjsFbxFormat.read(bytes, {
        emit: "gr2",
        classes: { Root, Mesh, IndexGroup }
    }).meshes[0];

    assert.deepEqual(mesh.vertex.position, [
        5, 0, 0,
        5, 1, 0,
        4, 0, 0
    ]);
    assert.deepEqual(mesh.vertex.normal, [
        0, 0, 1,
        0, 0, 1,
        0, 0, 1
    ]);
    assert.deepEqual(mesh.vertex.tangent, [
        0, 1, 0,
        0, 1, 0,
        0, 1, 0
    ]);
    assert.deepEqual(mesh.minBounds, [ 4, 0, 0 ]);
    assert.deepEqual(mesh.maxBounds, [ 5, 1, 0 ]);
});

test("applies FBX rotation pivots pre post rotations and geometric transforms", () =>
{
    const
        Root = makeValueClass(),
        Mesh = makeValueClass(),
        IndexGroup = makeValueClass();

    const bytes = makeBinaryFBX(7400, [
        makeBinaryNode7400("Objects", [], [
            makeBinaryNode7400("Geometry", [ 123, "Geometry::Triangle", "Mesh" ], [
                makeBinaryNode7400("Vertices", [ new Float64Array([
                    1, 0, 0,
                    2, 0, 0,
                    1, 1, 0
                ]) ]),
                makeBinaryNode7400("PolygonVertexIndex", [ new Int32Array([ 0, 1, -3 ]) ]),
                makeBinaryNode7400("LayerElementNormal", [ 0 ], [
                    makeBinaryNode7400("MappingInformationType", [ "AllSame" ]),
                    makeBinaryNode7400("ReferenceInformationType", [ "Direct" ]),
                    makeBinaryNode7400("Normals", [ new Float64Array([ 0, 0, 1 ]) ])
                ])
            ]),
            makeBinaryNode7400("Model", [ 456, "Model::Pivoted", "Mesh" ], [
                makeBinaryNode7400("Properties70", [], [
                    makeBinaryNode7400("P", [ "RotationPivot", "Vector3D", "Vector", "", 1, 0, 0 ]),
                    makeBinaryNode7400("P", [ "PreRotation", "Vector3D", "Vector", "", 0, 0, 90 ]),
                    makeBinaryNode7400("P", [ "Lcl Rotation", "Lcl Rotation", "", "A", 0, 0, 90 ]),
                    makeBinaryNode7400("P", [ "PostRotation", "Vector3D", "Vector", "", 0, 0, 90 ]),
                    makeBinaryNode7400("P", [ "GeometricTranslation", "Vector3D", "Vector", "", 0, 0, 1 ])
                ])
            ])
        ]),
        makeBinaryNode7400("Connections", [], [
            makeBinaryNode7400("C", [ "OO", 123, 456 ])
        ])
    ]);

    const mesh = CjsFbxFormat.read(bytes, {
        emit: "gr2",
        classes: { Root, Mesh, IndexGroup }
    }).meshes[0];

    assert.deepEqual(mesh.vertex.position, [
        1, 0, 1,
        1, 1, 1,
        0, 0, 1
    ]);
    assert.deepEqual(mesh.vertex.normal, [
        0, 0, 1,
        0, 0, 1,
        0, 0, 1
    ]);
    assert.deepEqual(mesh.minBounds, [ 0, 0, 1 ]);
    assert.deepEqual(mesh.maxBounds, [ 1, 1, 1 ]);
});

test("applies FBX multi axis rotation order in application order", () =>
{
    const
        Root = makeValueClass(),
        Mesh = makeValueClass(),
        IndexGroup = makeValueClass();

    const bytes = makeBinaryFBX(7400, [
        makeBinaryNode7400("Objects", [], [
            makeBinaryNode7400("Geometry", [ 123, "Geometry::Rotated", "Mesh" ], [
                makeBinaryNode7400("Vertices", [ new Float64Array([
                    0, 1, 0,
                    1, 0, 0,
                    0, 0, 1
                ]) ]),
                makeBinaryNode7400("PolygonVertexIndex", [ new Int32Array([ 0, 1, -3 ]) ])
            ]),
            makeBinaryNode7400("Model", [ 456, "Model::Rotated", "Mesh" ], [
                makeBinaryNode7400("Properties70", [], [
                    makeBinaryNode7400("P", [ "RotationOrder", "enum", "", "", 0 ]),
                    makeBinaryNode7400("P", [ "Lcl Rotation", "Lcl Rotation", "", "A", 90, 90, 0 ])
                ])
            ])
        ]),
        makeBinaryNode7400("Connections", [], [
            makeBinaryNode7400("C", [ "OO", 123, 456 ])
        ])
    ]);

    const mesh = CjsFbxFormat.read(bytes, {
        emit: "gr2",
        classes: { Root, Mesh, IndexGroup }
    }).meshes[0];

    assert.deepEqual(mesh.vertex.position, [
        1, 0, 0,
        0, 0, -1,
        0, -1, 0
    ]);
    assert.deepEqual(mesh.minBounds, [ 0, -1, -1 ]);
    assert.deepEqual(mesh.maxBounds, [ 1, 0, 0 ]);
});

test("applies default FBX transform inheritance", () =>
{
    const mesh = readInheritTypeMesh(null);

    assert.deepEqual(mesh.vertex.position, [
        2, 3, 4,
        2, 6, 4,
        0, 3, 4
    ]);
});

test("applies FBX componentwise scale inheritance", () =>
{
    const mesh = readInheritTypeMesh(0);

    assert.deepEqual(mesh.vertex.position, [
        2, 3, 4,
        2, 5, 4,
        -1, 3, 4
    ]);
});

test("applies FBX ignore parent scale inheritance", () =>
{
    const mesh = readInheritTypeMesh(2);

    assert.deepEqual(mesh.vertex.position, [
        2, 3, 4,
        2, 4, 4,
        1, 3, 4
    ]);
});

test("emits skin cluster control point influences on expanded vertices", () =>
{
    const
        Root = makeValueClass(),
        Mesh = makeValueClass(),
        IndexGroup = makeValueClass(),
        BoneBinding = makeValueClass();

    const bytes = makeBinaryFBX(7400, [
        makeBinaryNode7400("Objects", [], [
            makeBinaryNode7400("Geometry", [ 123, "Geometry::Skinned", "Mesh" ], [
                makeBinaryNode7400("Vertices", [ new Float64Array([
                    0, 0, 0,
                    1, 0, 0,
                    0, 1, 0
                ]) ]),
                makeBinaryNode7400("PolygonVertexIndex", [ new Int32Array([ 0, 1, -3 ]) ])
            ]),
            makeBinaryNode7400("Model", [ 456, "Model::Skinned", "Mesh" ]),
            makeBinaryNode7400("Model", [ 900, "Model::BoneA", "LimbNode" ]),
            makeBinaryNode7400("Model", [ 901, "Model::BoneB", "LimbNode" ]),
            makeBinaryNode7400("Deformer", [ 800, "Deformer::Skin", "Skin" ]),
            makeBinaryNode7400("Deformer", [ 801, "SubDeformer::BoneA", "Cluster" ], [
                makeBinaryNode7400("Indexes", [ new Int32Array([ 0, 1 ]) ]),
                makeBinaryNode7400("Weights", [ new Float64Array([ 1, 0.25 ]) ])
            ]),
            makeBinaryNode7400("Deformer", [ 802, "SubDeformer::BoneB", "Cluster" ], [
                makeBinaryNode7400("Indexes", [ new Int32Array([ 1, 2 ]) ]),
                makeBinaryNode7400("Weights", [ new Float64Array([ 0.75, 1 ]) ])
            ])
        ]),
        makeBinaryNode7400("Connections", [], [
            makeBinaryNode7400("C", [ "OO", 123, 456 ]),
            makeBinaryNode7400("C", [ "OO", 800, 123 ]),
            makeBinaryNode7400("C", [ "OO", 801, 800 ]),
            makeBinaryNode7400("C", [ "OO", 802, 800 ]),
            makeBinaryNode7400("C", [ "OO", 900, 801 ]),
            makeBinaryNode7400("C", [ "OO", 901, 802 ])
        ])
    ]);

    const mesh = CjsFbxFormat.read(bytes, {
        emit: "gr2",
        classes: { Root, Mesh, IndexGroup, BoneBinding }
    }).meshes[0];

    assert.equal(mesh.boneBindings[0] instanceof BoneBinding, true);
    assert.deepEqual(mesh.boneBindings.map(binding => ({
        name: binding.name,
        minBounds: binding.minBounds,
        maxBounds: binding.maxBounds
    })), [
        { name: "BoneA", minBounds: [ 0, 0, 0 ], maxBounds: [ 1, 0, 0 ] },
        { name: "BoneB", minBounds: [ 0, 0, 0 ], maxBounds: [ 1, 1, 0 ] }
    ]);
    assert.deepEqual(mesh.vertex.blendIndice, [
        0, 0, 0, 0,
        1, 0, 0, 0,
        1, 0, 0, 0
    ]);
    assert.deepEqual(mesh.vertex.blendWeight, [
        1, 0, 0, 0,
        0.75, 0.25, 0, 0,
        1, 0, 0, 0
    ]);
});

test("computes bone binding bounds in bone local space", () =>
{
    const
        Root = makeValueClass(),
        Mesh = makeValueClass(),
        IndexGroup = makeValueClass(),
        BoneBinding = makeValueClass();

    const bytes = makeBinaryFBX(7400, [
        makeBinaryNode7400("Objects", [], [
            makeBinaryNode7400("Geometry", [ 123, "Geometry::TranslatedSkin", "Mesh" ], [
                makeBinaryNode7400("Vertices", [ new Float64Array([
                    10, 0, 0,
                    11, 0, 0,
                    10, 1, 0
                ]) ]),
                makeBinaryNode7400("PolygonVertexIndex", [ new Int32Array([ 0, 1, -3 ]) ])
            ]),
            makeBinaryNode7400("Model", [ 456, "Model::TranslatedSkin", "Mesh" ]),
            makeBinaryNode7400("Model", [ 900, "Model::BoneA", "LimbNode" ], [
                makeBinaryNode7400("Properties70", [], [
                    makeBinaryNode7400("P", [ "Lcl Translation", "Lcl Translation", "", "A", 10, 0, 0 ])
                ])
            ]),
            makeBinaryNode7400("Deformer", [ 800, "Deformer::Skin", "Skin" ]),
            makeBinaryNode7400("Deformer", [ 801, "SubDeformer::BoneA", "Cluster" ], [
                makeBinaryNode7400("Indexes", [ new Int32Array([ 0, 1 ]) ]),
                makeBinaryNode7400("Weights", [ new Float64Array([ 1, 1 ]) ])
            ])
        ]),
        makeBinaryNode7400("Connections", [], [
            makeBinaryNode7400("C", [ "OO", 123, 456 ]),
            makeBinaryNode7400("C", [ "OO", 800, 123 ]),
            makeBinaryNode7400("C", [ "OO", 801, 800 ]),
            makeBinaryNode7400("C", [ "OO", 900, 801 ])
        ])
    ]);

    const mesh = CjsFbxFormat.read(bytes, {
        emit: "gr2",
        classes: { Root, Mesh, IndexGroup, BoneBinding }
    }).meshes[0];

    assert.equal(mesh.boneBindings[0] instanceof BoneBinding, true);
    assert.deepEqual(mesh.boneBindings[0].minBounds, [ 0, 0, 0 ]);
    assert.deepEqual(mesh.boneBindings[0].maxBounds, [ 1, 0, 0 ]);
});

test("keeps strongest four skin influences and reports truncation", () =>
{
    const
        Root = makeValueClass(),
        Mesh = makeValueClass(),
        IndexGroup = makeValueClass(),
        BoneBinding = makeValueClass(),
        objects = [
            makeBinaryNode7400("Geometry", [ 123, "Geometry::CrowdedSkin", "Mesh" ], [
                makeBinaryNode7400("Vertices", [ new Float64Array([
                    0, 0, 0,
                    1, 0, 0,
                    0, 1, 0
                ]) ]),
                makeBinaryNode7400("PolygonVertexIndex", [ new Int32Array([ 0, 1, -3 ]) ])
            ]),
            makeBinaryNode7400("Model", [ 456, "Model::CrowdedSkin", "Mesh" ]),
            makeBinaryNode7400("Deformer", [ 800, "Deformer::Skin", "Skin" ])
        ],
        connections = [
            makeBinaryNode7400("C", [ "OO", 123, 456 ]),
            makeBinaryNode7400("C", [ "OO", 800, 123 ])
        ],
        weights = [ 0.1, 0.5, 0.2, 0.05, 0.15 ];

    for (let i = 0; i < weights.length; i++)
    {
        const
            boneId = 900 + i,
            clusterId = 810 + i;

        objects.push(
            makeBinaryNode7400("Model", [ boneId, `Model::Bone${i}`, "LimbNode" ]),
            makeBinaryNode7400("Deformer", [ clusterId, `SubDeformer::Bone${i}`, "Cluster" ], [
                makeBinaryNode7400("Indexes", [ new Int32Array([ 0 ]) ]),
                makeBinaryNode7400("Weights", [ new Float64Array([ weights[i] ]) ])
            ])
        );
        connections.push(
            makeBinaryNode7400("C", [ "OO", clusterId, 800 ]),
            makeBinaryNode7400("C", [ "OO", boneId, clusterId ])
        );
    }

    const bytes = makeBinaryFBX(7400, [
        makeBinaryNode7400("Objects", [], objects),
        makeBinaryNode7400("Connections", [], connections)
    ]);

    const mesh = CjsFbxFormat.read(bytes, {
        emit: "gr2",
        classes: { Root, Mesh, IndexGroup, BoneBinding }
    }).meshes[0];
    const support = CjsFbxFormat.isSupported(bytes);

    assert.deepEqual(mesh.vertex.blendIndice.slice(0, 4), [ 1, 2, 4, 0 ]);
    assertFloatArrayClose(mesh.vertex.blendWeight.slice(0, 4), [
        0.5263157894736842,
        0.21052631578947367,
        0.15789473684210525,
        0.10526315789473684
    ]);
    assert.equal(support.warnings.some(message => message.includes("more than four positive bone influences")), true);
});

test("emits cmf bone declarations and bindings for skin clusters", () =>
{
    const
        Root = makeValueClass(),
        Mesh = makeValueClass(),
        MeshLod = makeValueClass(),
        VertexElement = makeValueClass(),
        MeshArea = makeValueClass(),
        LodMeshArea = makeValueClass(),
        BoneBinding = makeValueClass(),
        MorphTargets = makeValueClass(),
        AudioOcclusionMesh = makeValueClass();

    const cmf = CjsFbxFormat.read(makeSkinnedTriangleFBX(), {
        emit: "cmf",
        classes: {
            Root,
            Mesh,
            MeshLod,
            VertexElement,
            MeshArea,
            LodMeshArea,
            BoneBinding,
            MorphTargets,
            AudioOcclusionMesh
        }
    });

    const mesh = cmf.meshes[0];

    assert.equal(mesh.boneBindings[0] instanceof BoneBinding, true);
    assert.deepEqual(mesh.boneBindings.map(binding => ({
        name: binding.name,
        bounds: binding.bounds
    })), [
        { name: "BoneA", bounds: { min: [ 0, 0, 0 ], max: [ 1, 0, 0 ] } },
        { name: "BoneB", bounds: { min: [ 0, 0, 0 ], max: [ 1, 1, 0 ] } }
    ]);
    assert.deepEqual(mesh.decl.map(element => ({
        usage: element.usage,
        usageIndex: element.usageIndex,
        type: element.type,
        elementCount: element.elementCount,
        offset: element.offset
    })), [
        { usage: "Position", usageIndex: 0, type: "Float32", elementCount: 3, offset: 0 },
        { usage: "BoneIndices", usageIndex: 0, type: "UInt8", elementCount: 4, offset: 12 },
        { usage: "BoneWeights", usageIndex: 0, type: "Float32", elementCount: 4, offset: 16 }
    ]);
    assert.equal(mesh.lods[0].vb.stride, 32);
    assert.equal(mesh.areas[0].affectedByBones, true);
    assert.deepEqual(mesh.areas[0].bones, [ 0, 1 ]);
    assert.deepEqual(mesh.lods[0].vertex.blendIndice, [
        0, 0, 0, 0,
        1, 0, 0, 0,
        1, 0, 0, 0
    ]);
    assert.deepEqual(mesh.lods[0].vertex.blendWeight, [
        1, 0, 0, 0,
        0.75, 0.25, 0, 0,
        1, 0, 0, 0
    ]);
});

test("emits cmf area-local bone lists for partially skinned material groups", () =>
{
    const
        Root = makeValueClass(),
        Mesh = makeValueClass(),
        MeshLod = makeValueClass(),
        VertexElement = makeValueClass(),
        MeshArea = makeValueClass(),
        LodMeshArea = makeValueClass(),
        BoneBinding = makeValueClass(),
        MorphTargets = makeValueClass(),
        AudioOcclusionMesh = makeValueClass();

    const cmf = CjsFbxFormat.read(makeTwoMaterialPartiallySkinnedFBX(), {
        emit: "cmf",
        classes: {
            Root,
            Mesh,
            MeshLod,
            VertexElement,
            MeshArea,
            LodMeshArea,
            BoneBinding,
            MorphTargets,
            AudioOcclusionMesh
        }
    });

    assert.deepEqual(cmf.meshes[0].areas.map(area => ({
        name: area.name,
        bones: area.bones,
        affectedByBones: area.affectedByBones
    })), [
        { name: "Steel", bones: [ 0 ], affectedByBones: true },
        { name: "Glass", bones: [], affectedByBones: false }
    ]);
    assert.deepEqual(cmf.meshes[0].boneBindings.map(binding => binding.name), [ "BoneA" ]);
});

test("emits gr2 model skeleton classes for skinned limb hierarchies", () =>
{
    const
        Root = makeValueClass(),
        Mesh = makeValueClass(),
        IndexGroup = makeValueClass(),
        BoneBinding = makeValueClass(),
        Model = makeValueClass(),
        Skeleton = makeValueClass(),
        Bone = makeValueClass();

    const gr2 = CjsFbxFormat.read(makeSkinnedHierarchyFBX(), {
        emit: "gr2",
        classes: { Root, Mesh, IndexGroup, BoneBinding, Model, Skeleton, Bone }
    });

    assert.equal(gr2.models[0] instanceof Model, true);
    assert.equal(gr2.models[0].skeleton instanceof Skeleton, true);
    assert.equal(gr2.models[0].skeleton.bones[0] instanceof Bone, true);
    assert.deepEqual(gr2.models.map(model => ({
        name: model.name,
        meshBindings: model.meshBindings,
        boneNames: model.skeleton.bones.map(bone => bone.name),
        parents: model.skeleton.bones.map(bone => bone.parentIndex),
        positions: model.skeleton.bones.map(bone => bone.position)
    })), [
        {
            name: "BoneA",
            meshBindings: [ 0 ],
            boneNames: [ "BoneA", "BoneB" ],
            parents: [ -1, 0 ],
            positions: [ [ 1, 0, 0 ], [ 0, 2, 0 ] ]
        }
    ]);
});

test("emits cmf skeleton rest and inverse bind transforms for skinned limb hierarchies", () =>
{
    const
        Root = makeValueClass(),
        Mesh = makeValueClass(),
        MeshLod = makeValueClass(),
        VertexElement = makeValueClass(),
        MeshArea = makeValueClass(),
        LodMeshArea = makeValueClass(),
        BoneBinding = makeValueClass(),
        MorphTargets = makeValueClass(),
        AudioOcclusionMesh = makeValueClass(),
        Skeleton = makeValueClass();

    const cmf = CjsFbxFormat.read(makeSkinnedHierarchyFBX(), {
        emit: "cmf",
        classes: {
            Root,
            Mesh,
            MeshLod,
            VertexElement,
            MeshArea,
            LodMeshArea,
            BoneBinding,
            MorphTargets,
            AudioOcclusionMesh,
            Skeleton
        }
    });

    assert.equal(cmf.skeletons[0] instanceof Skeleton, true);
    assert.equal(cmf.meshes[0].skeleton, 0);
    assert.deepEqual(cmf.skeletons[0].bones, [ "BoneA", "BoneB" ]);
    assert.deepEqual(cmf.skeletons[0].parents, [ 0xffffffff, 0 ]);
    assert.deepEqual(cmf.skeletons[0].restTransforms, [
        { position: [ 1, 0, 0 ], rotation: [ 0, 0, 0, 1 ], scale: [ 1, 1, 1 ] },
        { position: [ 0, 2, 0 ], rotation: [ 0, 0, 0, 1 ], scale: [ 1, 1, 1 ] }
    ]);
    assert.deepEqual(cmf.skeletons[0].invBindTransforms, [
        [
            1, 0, 0, -1,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ],
        [
            1, 0, 0, -1,
            0, 1, 0, -2,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]
    ]);
});

test("emits cmf bone masks from user-defined numeric bone properties", () =>
{
    const
        Root = makeValueClass(),
        Mesh = makeValueClass(),
        MeshLod = makeValueClass(),
        VertexElement = makeValueClass(),
        MeshArea = makeValueClass(),
        LodMeshArea = makeValueClass(),
        BoneBinding = makeValueClass(),
        MorphTargets = makeValueClass(),
        AudioOcclusionMesh = makeValueClass(),
        Skeleton = makeValueClass(),
        BoneMask = makeValueClass(),
        BoneWeight = makeValueClass();

    const cmf = CjsFbxFormat.read(makeSkinnedHierarchyFBX({ boneMasks: true }), {
        emit: "cmf",
        classes: {
            Root,
            Mesh,
            MeshLod,
            VertexElement,
            MeshArea,
            LodMeshArea,
            BoneBinding,
            MorphTargets,
            AudioOcclusionMesh,
            Skeleton,
            BoneMask,
            BoneWeight
        }
    });

    assert.equal(cmf.skeletons[0].boneMasks[0] instanceof BoneMask, true);
    assert.equal(cmf.skeletons[0].boneMasks[0].weights[0] instanceof BoneWeight, true);
    assert.deepEqual(cmf.skeletons[0].boneMasks.map(mask => ({
        name: mask.name,
        weights: mask.weights.map(weight => ({
            index: weight.index,
            weight: weight.weight
        }))
    })), [
        {
            name: "UpperBody",
            weights: [
                { index: 0, weight: 1 },
                { index: 1, weight: 1 }
            ]
        },
        {
            name: "Disabled",
            weights: [
                { index: 0, weight: 0 }
            ]
        }
    ]);
});

test("skips unusable skin clusters when associating skeletons", () =>
{
    const
        Root = makeValueClass(),
        Mesh = makeValueClass(),
        MeshLod = makeValueClass(),
        VertexElement = makeValueClass(),
        MeshArea = makeValueClass(),
        LodMeshArea = makeValueClass(),
        BoneBinding = makeValueClass(),
        MorphTargets = makeValueClass(),
        AudioOcclusionMesh = makeValueClass(),
        Skeleton = makeValueClass();

    const cmf = CjsFbxFormat.read(makeSkinnedHierarchyFBX({ unusableCluster: true }), {
        emit: "cmf",
        classes: {
            Root,
            Mesh,
            MeshLod,
            VertexElement,
            MeshArea,
            LodMeshArea,
            BoneBinding,
            MorphTargets,
            AudioOcclusionMesh,
            Skeleton
        }
    });

    assert.equal(cmf.meshes[0].skeleton, 0);
    assert.deepEqual(cmf.meshes[0].boneBindings.map(binding => binding.name), [ "BoneA", "BoneB" ]);
    assert.deepEqual(cmf.meshes[0].lods[0].vertex.blendIndice, [
        0, 0, 0, 0,
        1, 0, 0, 0,
        1, 0, 0, 0
    ]);
});

test("uses fbx bind pose matrices for cmf inverse bind transforms", () =>
{
    const
        Root = makeValueClass(),
        Mesh = makeValueClass(),
        MeshLod = makeValueClass(),
        VertexElement = makeValueClass(),
        MeshArea = makeValueClass(),
        LodMeshArea = makeValueClass(),
        BoneBinding = makeValueClass(),
        MorphTargets = makeValueClass(),
        AudioOcclusionMesh = makeValueClass(),
        Skeleton = makeValueClass();

    const cmf = CjsFbxFormat.read(makeSkinnedHierarchyFBX({ bindPose: true }), {
        emit: "cmf",
        classes: {
            Root,
            Mesh,
            MeshLod,
            VertexElement,
            MeshArea,
            LodMeshArea,
            BoneBinding,
            MorphTargets,
            AudioOcclusionMesh,
            Skeleton
        }
    });

    assert.deepEqual(cmf.skeletons[0].restTransforms.map(transform => transform.position), [
        [ 1, 0, 0 ],
        [ 0, 2, 0 ]
    ]);
    assert.deepEqual(cmf.skeletons[0].invBindTransforms, [
        [
            1, 0, 0, -3,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ],
        [
            1, 0, 0, -3,
            0, 1, 0, -4,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]
    ]);
});

test("emits blend shape geometry as gr2 morph targets", () =>
{
    const
        Root = makeValueClass(),
        Mesh = makeValueClass(),
        IndexGroup = makeValueClass(),
        MorphTarget = makeValueClass();

    const mesh = CjsFbxFormat.read(makeMorphedTriangleFBX(), {
        emit: "gr2",
        classes: { Root, Mesh, IndexGroup, MorphTarget }
    }).meshes[0];

    assert.equal(mesh.morphTargets[0] instanceof MorphTarget, true);
    assert.equal(mesh.morphTargets[0].name, "Smile");
    assert.equal(mesh.morphTargets[0].dataIsDeltas, false);
    assert.equal(mesh.morphTargets[0].maxDisplacement, 1);
    assert.deepEqual(mesh.morphTargets[0].vertex.position, [
        0, 0, 0,
        1, 0, 1,
        0, 1, 0
    ]);
});

test("skips unsupported in-between blend shape channels", () =>
{
    const
        Root = makeValueClass(),
        Mesh = makeValueClass(),
        IndexGroup = makeValueClass(),
        MorphTarget = makeValueClass();

    const mesh = CjsFbxFormat.read(makeMorphedTriangleFBX({ inBetweenMorph: true }), {
        emit: "gr2",
        classes: { Root, Mesh, IndexGroup, MorphTarget }
    }).meshes[0];

    assert.deepEqual(mesh.morphTargets, []);
});

test("emits Carbon custom morph normals as gr2 morph target channels", () =>
{
    const
        Root = makeValueClass(),
        Mesh = makeValueClass(),
        IndexGroup = makeValueClass(),
        MorphTarget = makeValueClass();

    const mesh = CjsFbxFormat.read(makeMorphedTriangleFBX({
        customMorphNormals: [
            0, 0, 1,
            0, 1, 0,
            1, 0, 0
        ]
    }), {
        emit: "gr2",
        classes: { Root, Mesh, IndexGroup, MorphTarget }
    }).meshes[0];

    assert.deepEqual(mesh.morphTargets[0].vertex.normal, [
        0, 0, 1,
        0, 1, 0,
        1, 0, 0
    ]);
});

test("emits blend shape geometry as cmf morph target payloads", () =>
{
    const
        Root = makeValueClass(),
        Mesh = makeValueClass(),
        MeshLod = makeValueClass(),
        VertexElement = makeValueClass(),
        MeshArea = makeValueClass(),
        LodMeshArea = makeValueClass(),
        LodMorphTarget = makeValueClass(),
        MorphTargets = makeValueClass(),
        MorphTarget = makeValueClass(),
        AudioOcclusionMesh = makeValueClass();

    const cmf = CjsFbxFormat.read(makeMorphedTriangleFBX(), {
        emit: "cmf",
        classes: {
            Root,
            Mesh,
            MeshLod,
            VertexElement,
            MeshArea,
            LodMeshArea,
            LodMorphTarget,
            MorphTargets,
            MorphTarget,
            AudioOcclusionMesh
        }
    });

    const mesh = cmf.meshes[0];

    assert.equal(mesh.morphTargets instanceof MorphTargets, true);
    assert.equal(mesh.morphTargets.targets[0] instanceof MorphTarget, true);
    assert.equal(mesh.lods[0].morphTargets[0] instanceof LodMorphTarget, true);
    assert.deepEqual(mesh.morphTargets.decl.map(element => ({
        usage: element.usage,
        type: element.type,
        elementCount: element.elementCount,
        offset: element.offset
    })), [
        { usage: "Position", type: "Float32", elementCount: 3, offset: 0 }
    ]);
    assert.deepEqual(mesh.morphTargets.targets.map(target => ({
        name: target.name,
        maxDisplacement: target.maxDisplacement
    })), [
        { name: "Smile", maxDisplacement: 1 }
    ]);
    assert.equal(mesh.areas[0].affectedByMorphTargets, true);
    assert.equal(mesh.lods[0].morphTargets[0].vb.stride, 12);
    assert.deepEqual(mesh.lods[0].morphTargets[0].vertex.position, [
        0, 0, 0,
        1, 0, 1,
        0, 1, 0
    ]);
});

test("emits Carbon custom morph normals as cmf morph target payloads", () =>
{
    const
        Root = makeValueClass(),
        Mesh = makeValueClass(),
        MeshLod = makeValueClass(),
        VertexElement = makeValueClass(),
        MeshArea = makeValueClass(),
        LodMeshArea = makeValueClass(),
        LodMorphTarget = makeValueClass(),
        MorphTargets = makeValueClass(),
        MorphTarget = makeValueClass(),
        AudioOcclusionMesh = makeValueClass();

    const cmf = CjsFbxFormat.read(makeMorphedTriangleFBX({
        customMorphNormals: [
            0, 0, 1,
            0, 1, 0,
            1, 0, 0
        ]
    }), {
        emit: "cmf",
        classes: {
            Root,
            Mesh,
            MeshLod,
            VertexElement,
            MeshArea,
            LodMeshArea,
            LodMorphTarget,
            MorphTargets,
            MorphTarget,
            AudioOcclusionMesh
        }
    });

    const mesh = cmf.meshes[0];

    assert.deepEqual(mesh.morphTargets.decl.map(element => ({
        usage: element.usage,
        type: element.type,
        elementCount: element.elementCount,
        offset: element.offset
    })), [
        { usage: "Position", type: "Float32", elementCount: 3, offset: 0 },
        { usage: "Normal", type: "Float32", elementCount: 3, offset: 12 }
    ]);
    assert.equal(mesh.lods[0].morphTargets[0].vb.stride, 24);
    assert.deepEqual(mesh.lods[0].morphTargets[0].vertex.normal, [
        0, 0, 1,
        0, 1, 0,
        1, 0, 0
    ]);
});

test("emits cmf material areas with area-local bounds and morph flags", () =>
{
    const
        Root = makeValueClass(),
        Mesh = makeValueClass(),
        MeshLod = makeValueClass(),
        VertexElement = makeValueClass(),
        MeshArea = makeValueClass(),
        LodMeshArea = makeValueClass(),
        LodMorphTarget = makeValueClass(),
        MorphTargets = makeValueClass(),
        MorphTarget = makeValueClass(),
        AudioOcclusionMesh = makeValueClass();

    const cmf = CjsFbxFormat.read(makeTwoMaterialMorphedFBX(), {
        emit: "cmf",
        classes: {
            Root,
            Mesh,
            MeshLod,
            VertexElement,
            MeshArea,
            LodMeshArea,
            LodMorphTarget,
            MorphTargets,
            MorphTarget,
            AudioOcclusionMesh
        }
    });

    const mesh = cmf.meshes[0];

    assert.equal(mesh.areas[0] instanceof MeshArea, true);
    assert.equal(mesh.lods[0].areas[0] instanceof LodMeshArea, true);
    assert.deepEqual(mesh.areas.map(area => ({
        name: area.name,
        bounds: area.bounds,
        bones: area.bones,
        affectedByBones: area.affectedByBones,
        affectedByMorphTargets: area.affectedByMorphTargets
    })), [
        {
            name: "Steel",
            bounds: { min: [ 0, 0, 0 ], max: [ 1, 1, 0 ] },
            bones: [],
            affectedByBones: false,
            affectedByMorphTargets: true
        },
        {
            name: "Glass",
            bounds: { min: [ 3, 0, 0 ], max: [ 4, 1, 0 ] },
            bones: [],
            affectedByBones: false,
            affectedByMorphTargets: false
        }
    ]);
    assert.deepEqual(mesh.lods[0].areas.map(area => ({
        firstElement: area.firstElement,
        elementCount: area.elementCount
    })), [
        { firstElement: 0, elementCount: 1 },
        { firstElement: 1, elementCount: 1 }
    ]);
});

test("builds cmf morph declaration from all morph target channels", () =>
{
    const
        Root = makeValueClass(),
        Mesh = makeValueClass(),
        MeshLod = makeValueClass(),
        VertexElement = makeValueClass(),
        MeshArea = makeValueClass(),
        LodMeshArea = makeValueClass(),
        LodMorphTarget = makeValueClass(),
        MorphTargets = makeValueClass(),
        MorphTarget = makeValueClass(),
        AudioOcclusionMesh = makeValueClass();

    const cmf = CjsFbxFormat.read(makeMorphedTriangleFBX({
        secondMorphCustomNormals: [
            0, 0, -1,
            0, -1, 0,
            -1, 0, 0
        ]
    }), {
        emit: "cmf",
        classes: {
            Root,
            Mesh,
            MeshLod,
            VertexElement,
            MeshArea,
            LodMeshArea,
            LodMorphTarget,
            MorphTargets,
            MorphTarget,
            AudioOcclusionMesh
        }
    });

    const mesh = cmf.meshes[0];

    assert.deepEqual(mesh.morphTargets.targets.map(target => target.name), [ "Smile", "Frown" ]);
    assert.deepEqual(mesh.morphTargets.decl.map(element => ({
        usage: element.usage,
        type: element.type,
        elementCount: element.elementCount,
        offset: element.offset
    })), [
        { usage: "Position", type: "Float32", elementCount: 3, offset: 0 },
        { usage: "Normal", type: "Float32", elementCount: 3, offset: 12 }
    ]);
    assert.equal(mesh.lods[0].morphTargets[0].vb.stride, 24);
    assert.equal(mesh.lods[0].morphTargets[1].vb.stride, 24);
    assert.deepEqual(mesh.lods[0].morphTargets[0].vertex.normal, [
        0, 0, 0,
        0, 0, 0,
        0, 0, 0
    ]);
    assert.deepEqual(mesh.lods[0].morphTargets[1].vertex.normal, [
        0, 0, -1,
        0, -1, 0,
        -1, 0, 0
    ]);
});

test("generates morph target tangent space when base mesh carries tangent space", () =>
{
    const
        Root = makeValueClass(),
        Mesh = makeValueClass(),
        IndexGroup = makeValueClass(),
        MorphTarget = makeValueClass();

    const mesh = CjsFbxFormat.read(makeMorphedTriangleFBX({ tangentSpaceLayers: true }), {
        emit: "gr2",
        classes: { Root, Mesh, IndexGroup, MorphTarget }
    }).meshes[0];

    const
        sqrtHalf = Math.SQRT1_2,
        expectedNormal = [
            -sqrtHalf, 0, sqrtHalf,
            -sqrtHalf, 0, sqrtHalf,
            -sqrtHalf, 0, sqrtHalf
        ],
        expectedTangent = [
            sqrtHalf, 0, sqrtHalf,
            sqrtHalf, 0, sqrtHalf,
            sqrtHalf, 0, sqrtHalf
        ];

    assertFloatArrayClose(mesh.morphTargets[0].vertex.normal, expectedNormal);
    assertFloatArrayClose(mesh.morphTargets[0].vertex.tangent, expectedTangent);
    assertFloatArrayClose(mesh.morphTargets[0].vertex.binormal, [
        0, 1, 0,
        0, 1, 0,
        0, 1, 0
    ]);
});

test("emits generated morph tangent space as cmf morph target payloads", () =>
{
    const
        Root = makeValueClass(),
        Mesh = makeValueClass(),
        MeshLod = makeValueClass(),
        VertexElement = makeValueClass(),
        MeshArea = makeValueClass(),
        LodMeshArea = makeValueClass(),
        LodMorphTarget = makeValueClass(),
        MorphTargets = makeValueClass(),
        MorphTarget = makeValueClass(),
        AudioOcclusionMesh = makeValueClass();

    const cmf = CjsFbxFormat.read(makeMorphedTriangleFBX({ tangentSpaceLayers: true }), {
        emit: "cmf",
        classes: {
            Root,
            Mesh,
            MeshLod,
            VertexElement,
            MeshArea,
            LodMeshArea,
            LodMorphTarget,
            MorphTargets,
            MorphTarget,
            AudioOcclusionMesh
        }
    });

    const mesh = cmf.meshes[0];

    assert.deepEqual(mesh.morphTargets.decl.map(element => ({
        usage: element.usage,
        type: element.type,
        elementCount: element.elementCount,
        offset: element.offset
    })), [
        { usage: "Position", type: "Float32", elementCount: 3, offset: 0 },
        { usage: "Normal", type: "Float32", elementCount: 3, offset: 12 },
        { usage: "Tangent", type: "Float32", elementCount: 3, offset: 24 },
        { usage: "Binormal", type: "Float32", elementCount: 3, offset: 36 }
    ]);
    assert.equal(mesh.lods[0].morphTargets[0].vb.stride, 48);
    assertFloatArrayClose(mesh.lods[0].morphTargets[0].vertex.normal, [
        -Math.SQRT1_2, 0, Math.SQRT1_2,
        -Math.SQRT1_2, 0, Math.SQRT1_2,
        -Math.SQRT1_2, 0, Math.SQRT1_2
    ]);
});

test("rejects malformed Carbon custom morph normals", () =>
{
    const
        Root = makeValueClass(),
        Mesh = makeValueClass(),
        IndexGroup = makeValueClass(),
        MorphTarget = makeValueClass();

    assert.throws(
        () => CjsFbxFormat.read(makeMorphedTriangleFBX({
            customMorphNormals: [ 0, 0, 1 ]
        }), {
            emit: "gr2",
            classes: { Root, Mesh, IndexGroup, MorphTarget }
        }),
        /custom normals "Smile" byte length 12 does not match expected 36/u
    );
});

test("emits blend shape weight animation as cmf animation curves", () =>
{
    const
        Root = makeValueClass(),
        Mesh = makeValueClass(),
        MeshLod = makeValueClass(),
        VertexElement = makeValueClass(),
        MeshArea = makeValueClass(),
        LodMeshArea = makeValueClass(),
        LodMorphTarget = makeValueClass(),
        MorphTargets = makeValueClass(),
        MorphTarget = makeValueClass(),
        AudioOcclusionMesh = makeValueClass(),
        Animation = makeValueClass(),
        AnimationChannel = makeValueClass(),
        AnimationCurve = makeValueClass();

    const cmf = CjsFbxFormat.read(makeAnimatedMorphedTriangleFBX(), {
        emit: "cmf",
        classes: {
            Root,
            Mesh,
            MeshLod,
            VertexElement,
            MeshArea,
            LodMeshArea,
            LodMorphTarget,
            MorphTargets,
            MorphTarget,
            AudioOcclusionMesh,
            Animation,
            AnimationChannel,
            AnimationCurve
        }
    });

    assert.equal(cmf.animations[0] instanceof Animation, true);
    assert.equal(cmf.animations[0].channels[0] instanceof AnimationChannel, true);
    assert.equal(cmf.animations[0].curves[0] instanceof AnimationCurve, true);
    assert.equal(cmf.animations[0].name, "Take 001");
    assert.equal(cmf.animations[0].duration, 1);
    assert.deepEqual({
        target: cmf.animations[0].channels[0].target,
        targetType: cmf.animations[0].channels[0].targetType,
        curveIndex: cmf.animations[0].channels[0].curveIndex
    }, {
        target: "Smile",
        targetType: "MorphTarget",
        curveIndex: 0
    });
    assert.deepEqual({
        valueDimension: cmf.animations[0].curves[0].valueDimension,
        interpolation: cmf.animations[0].curves[0].interpolation,
        knotType: cmf.animations[0].curves[0].knotType,
        valueType: cmf.animations[0].curves[0].valueType,
        knotCount: cmf.animations[0].curves[0].knotCount
    }, {
        valueDimension: 1,
        interpolation: "Linear",
        knotType: "Float32",
        valueType: "Float32",
        knotCount: 2
    });
    assert.deepEqual(cmf.animations[0].curves[0].knots, float32Bytes([ 0, 1 ]));
    assert.deepEqual(cmf.animations[0].curves[0].values, float32Bytes([ 0, 1 ]));
});

test("sorts blend shape animation keys and accepts KeyValue fallback", () =>
{
    const Root = makeValueClass();

    const sorted = CjsFbxFormat.read(makeAnimatedMorphedTriangleFBX({ unsortedAnimationCurve: true }), {
        emit: "cmf",
        classes: { Root }
    });
    const keyValue = CjsFbxFormat.read(makeAnimatedMorphedTriangleFBX({ keyValueFallback: true }), {
        emit: "cmf",
        classes: { Root }
    });

    assert.deepEqual(float32Values(sorted.animations[0].curves[0].knots), [ 0, 1 ]);
    assert.deepEqual(float32Values(sorted.animations[0].curves[0].values), [ 0, 1 ]);
    assert.deepEqual(float32Values(keyValue.animations[0].curves[0].knots), [ 0, 1 ]);
    assert.deepEqual(float32Values(keyValue.animations[0].curves[0].values), [ 0, 1 ]);
});

test("rejects mismatched scalar animation key and value counts", () =>
{
    const Root = makeValueClass();

    assert.throws(
        () => CjsFbxFormat.read(makeAnimatedMorphedTriangleFBX({
            keyValueFallback: true,
            mismatchedAnimationCurve: true
        }), {
            emit: "cmf",
            classes: { Root }
        }),
        /mismatched KeyTime and KeyValue lengths/u
    );
});

test("skips in-between blend shape animation targets", () =>
{
    const
        Root = makeValueClass(),
        Mesh = makeValueClass(),
        MeshLod = makeValueClass(),
        VertexElement = makeValueClass(),
        MeshArea = makeValueClass(),
        LodMeshArea = makeValueClass(),
        LodMorphTarget = makeValueClass(),
        MorphTargets = makeValueClass(),
        MorphTarget = makeValueClass(),
        AudioOcclusionMesh = makeValueClass(),
        Animation = makeValueClass(),
        AnimationChannel = makeValueClass(),
        AnimationCurve = makeValueClass();

    const cmf = CjsFbxFormat.read(makeAnimatedMorphedTriangleFBX({ inBetweenMorph: true }), {
        emit: "cmf",
        classes: {
            Root,
            Mesh,
            MeshLod,
            VertexElement,
            MeshArea,
            LodMeshArea,
            LodMorphTarget,
            MorphTargets,
            MorphTarget,
            AudioOcclusionMesh,
            Animation,
            AnimationChannel,
            AnimationCurve
        }
    });

    assert.deepEqual(cmf.meshes[0].morphTargets.targets, []);
    assert.deepEqual(cmf.animations, []);
});

test("emits bone transform animation as cmf animation curves", () =>
{
    const
        Root = makeValueClass(),
        Mesh = makeValueClass(),
        MeshLod = makeValueClass(),
        VertexElement = makeValueClass(),
        MeshArea = makeValueClass(),
        LodMeshArea = makeValueClass(),
        BoneBinding = makeValueClass(),
        MorphTargets = makeValueClass(),
        AudioOcclusionMesh = makeValueClass(),
        Skeleton = makeValueClass(),
        Animation = makeValueClass(),
        AnimationChannel = makeValueClass(),
        AnimationCurve = makeValueClass();

    const cmf = CjsFbxFormat.read(makeSkinnedHierarchyFBX({ animation: true }), {
        emit: "cmf",
        classes: {
            Root,
            Mesh,
            MeshLod,
            VertexElement,
            MeshArea,
            LodMeshArea,
            BoneBinding,
            MorphTargets,
            AudioOcclusionMesh,
            Skeleton,
            Animation,
            AnimationChannel,
            AnimationCurve
        }
    });

    const animation = cmf.animations[0];
    assert.equal(animation instanceof Animation, true);
    assert.equal(animation.name, "Take 001");
    assert.equal(animation.duration, 1);
    assert.deepEqual(animation.channels.map(channel => ({
        target: channel.target,
        targetType: channel.targetType,
        curveIndex: channel.curveIndex,
        channelClass: channel instanceof AnimationChannel
    })), [
        { target: "BoneB", targetType: "BonePosition", curveIndex: 0, channelClass: true },
        { target: "BoneB", targetType: "BoneRotation", curveIndex: 1, channelClass: true },
        { target: "BoneB", targetType: "BoneScale", curveIndex: 2, channelClass: true }
    ]);
    assert.deepEqual(animation.curves.map(curve => ({
        valueDimension: curve.valueDimension,
        interpolation: curve.interpolation,
        knotType: curve.knotType,
        valueType: curve.valueType,
        knotCount: curve.knotCount,
        curveClass: curve instanceof AnimationCurve
    })), [
        { valueDimension: 3, interpolation: "Linear", knotType: "Float32", valueType: "Float32", knotCount: 2, curveClass: true },
        { valueDimension: 4, interpolation: "Linear", knotType: "Float32", valueType: "Float32", knotCount: 2, curveClass: true },
        { valueDimension: 3, interpolation: "Linear", knotType: "Float32", valueType: "Float32", knotCount: 2, curveClass: true }
    ]);
    assert.deepEqual(animation.curves.map(curve => float32Values(curve.knots)), [
        [ 0, 1 ],
        [ 0, 1 ],
        [ 0, 1 ]
    ]);
    assert.deepEqual(float32Values(animation.curves[0].values), [
        0, 2, 0,
        0, 4, 0
    ]);
    assertFloatArrayClose(float32Values(animation.curves[1].values), [
        0, 0, 0, 1,
        0, 0, Math.SQRT1_2, Math.SQRT1_2
    ]);
    assert.deepEqual(float32Values(animation.curves[2].values), [
        1, 1, 1,
        2, 1, 1
    ]);
});

test("uses animation curve node defaults for missing bone animation axes", () =>
{
    const
        Root = makeValueClass(),
        Mesh = makeValueClass(),
        MeshLod = makeValueClass(),
        VertexElement = makeValueClass(),
        MeshArea = makeValueClass(),
        LodMeshArea = makeValueClass(),
        BoneBinding = makeValueClass(),
        MorphTargets = makeValueClass(),
        AudioOcclusionMesh = makeValueClass(),
        Skeleton = makeValueClass(),
        Animation = makeValueClass(),
        AnimationChannel = makeValueClass(),
        AnimationCurve = makeValueClass();

    const cmf = CjsFbxFormat.read(makeSkinnedHierarchyFBX({ animation: true, animationCurveNodeDefaults: true }), {
        emit: "cmf",
        classes: {
            Root,
            Mesh,
            MeshLod,
            VertexElement,
            MeshArea,
            LodMeshArea,
            BoneBinding,
            MorphTargets,
            AudioOcclusionMesh,
            Skeleton,
            Animation,
            AnimationChannel,
            AnimationCurve
        }
    });

    assert.equal(cmf.animations[0].channels[0].targetType, "BonePosition");
    assert.deepEqual(float32Values(cmf.animations[0].curves[0].values), [
        10, 40, 30,
        10, 50, 30
    ]);
    assert.equal(cmf.animations[0].channels[2].targetType, "BoneScale");
    assert.deepEqual(float32Values(cmf.animations[0].curves[2].values), [
        2, 20, 30,
        4, 20, 30
    ]);
});

test("emits skeleton root custom properties as cmf morph animation curves", () =>
{
    const
        Root = makeValueClass(),
        Mesh = makeValueClass(),
        MeshLod = makeValueClass(),
        VertexElement = makeValueClass(),
        MeshArea = makeValueClass(),
        LodMeshArea = makeValueClass(),
        BoneBinding = makeValueClass(),
        MorphTargets = makeValueClass(),
        MorphTarget = makeValueClass(),
        LodMorphTarget = makeValueClass(),
        AudioOcclusionMesh = makeValueClass(),
        Skeleton = makeValueClass(),
        Animation = makeValueClass(),
        AnimationChannel = makeValueClass(),
        AnimationCurve = makeValueClass();

    const cmf = CjsFbxFormat.read(makeSkinnedHierarchyFBX({ rootMorphAnimation: true }), {
        emit: "cmf",
        classes: {
            Root,
            Mesh,
            MeshLod,
            VertexElement,
            MeshArea,
            LodMeshArea,
            BoneBinding,
            MorphTargets,
            MorphTarget,
            LodMorphTarget,
            AudioOcclusionMesh,
            Skeleton,
            Animation,
            AnimationChannel,
            AnimationCurve
        }
    });

    const animation = cmf.animations[0];
    assert.equal(cmf.meshes[0].morphTargets.targets[0] instanceof MorphTarget, true);
    assert.equal(cmf.meshes[0].lods[0].morphTargets[0] instanceof LodMorphTarget, true);
    assert.equal(animation instanceof Animation, true);
    assert.deepEqual({
        target: animation.channels[0].target,
        targetType: animation.channels[0].targetType,
        curveIndex: animation.channels[0].curveIndex,
        channelClass: animation.channels[0] instanceof AnimationChannel
    }, {
        target: "Smile",
        targetType: "MorphTarget",
        curveIndex: 0,
        channelClass: true
    });
    assert.deepEqual({
        valueDimension: animation.curves[0].valueDimension,
        interpolation: animation.curves[0].interpolation,
        knotCount: animation.curves[0].knotCount,
        curveClass: animation.curves[0] instanceof AnimationCurve
    }, {
        valueDimension: 1,
        interpolation: "Linear",
        knotCount: 2,
        curveClass: true
    });
    assert.deepEqual(float32Values(animation.curves[0].knots), [ 0, 1 ]);
    assert.deepEqual(float32Values(animation.curves[0].values), [ 0, 0.5 ]);
});

test("uses animation stack local time span for cmf animation duration", () =>
{
    const
        Root = makeValueClass(),
        Mesh = makeValueClass(),
        MeshLod = makeValueClass(),
        VertexElement = makeValueClass(),
        MeshArea = makeValueClass(),
        LodMeshArea = makeValueClass(),
        LodMorphTarget = makeValueClass(),
        MorphTargets = makeValueClass(),
        AudioOcclusionMesh = makeValueClass(),
        Animation = makeValueClass(),
        AnimationChannel = makeValueClass(),
        AnimationCurve = makeValueClass();

    const cmf = CjsFbxFormat.read(makeAnimatedMorphedTriangleFBX({ stackTimeSpan: true }), {
        emit: "cmf",
        classes: {
            Root,
            Mesh,
            MeshLod,
            VertexElement,
            MeshArea,
            LodMeshArea,
            LodMorphTarget,
            MorphTargets,
            AudioOcclusionMesh,
            Animation,
            AnimationChannel,
            AnimationCurve
        }
    });

    assert.equal(cmf.animations[0].duration, 2);
    assert.deepEqual(float32Values(cmf.animations[0].curves[0].knots), [ 0, 0.5 ]);
    assert.deepEqual(float32Values(cmf.animations[0].curves[0].values), [ 0, 1 ]);
});

test("inspects binary fbx version and emits raw payload", () =>
{
    const bytes = makeBinaryFBX(7400, [
        makeBinaryNode7400("FBXHeaderExtension", [], [
            makeBinaryNode7400("FBXVersion", [ 7400 ])
        ]),
        makeBinaryNode7400("GlobalSettings", [], [
            makeBinaryNode7400("Properties70", [], [
                makeBinaryNode7400("P", [ "UpAxis", "int", "Integer", "", 1 ])
            ])
        ]),
        makeBinaryNode7400("Objects", [], [
            makeBinaryNode7400("Geometry", [ 123, "Geometry::Mesh", "Mesh" ], [
                makeBinaryNode7400("Vertices", [ new Float64Array([ 0, 0, 0, 1, 0, 0, 0, 1, 0 ]) ]),
                makeBinaryNode7400("PolygonVertexIndex", [ new Int32Array([ 0, 1, -3 ]) ])
            ]),
            makeBinaryNode7400("Model", [ 456, "Model::Root", "Null" ])
        ]),
        makeBinaryNode7400("Connections", [], [
            makeBinaryNode7400("C", [ "OO", 123, 456 ])
        ])
    ]);
    const raw = CjsFbxFormat.read(bytes);

    assert.equal(CjsFbxFormat.isFBX(bytes), true);
    assert.equal(raw.sourceFormat, "fbx");
    assert.equal(raw.metadata.encoding, "binary");
    assert.equal(raw.metadata.version, 7400);
    assert.deepEqual(raw.metadata.rootNodeNames, [ "FBXHeaderExtension", "GlobalSettings", "Objects", "Connections" ]);
});

test("parses binary fbx node and property tree", () =>
{
    const bytes = makeBinaryFBX(7400, [
        makeBinaryNode7400("FBXHeaderExtension", [], [
            makeBinaryNode7400("FBXVersion", [ 7400 ])
        ]),
        makeBinaryNode7400("GlobalSettings", [], [
            makeBinaryNode7400("Properties70", [], [
                makeBinaryNode7400("P", [ "UpAxis", "int", "Integer", "", 1 ])
            ])
        ]),
        makeBinaryNode7400("Objects", [], [
            makeBinaryNode7400("Geometry", [ 123, "Geometry::Mesh", "Mesh" ], [
                makeBinaryNode7400("Vertices", [ new Float64Array([ 0, 0, 0, 1, 0, 0, 0, 1, 0 ]) ]),
                makeBinaryNode7400("PolygonVertexIndex", [ new Int32Array([ 0, 1, -3 ]) ])
            ]),
            makeBinaryNode7400("Model", [ 456, "Model::Root", "Null" ])
        ]),
        makeBinaryNode7400("Connections", [], [
            makeBinaryNode7400("C", [ "OO", 123, 456 ])
        ])
    ]);
    const json = CjsFbxFormat.read(bytes, { emit: "fbxJson" });
    const objects = json.nodes.find(node => node.name === "Objects");
    const geometry = objects.children[0];

    assert.equal(json.nodeCount, 12);
    assert.equal(objects.name, "Objects");
    assert.equal(geometry.name, "Geometry");
    assert.deepEqual(geometry.properties, [ 123, "Geometry::Mesh", "Mesh" ]);
    assert.deepEqual(Array.from(geometry.children[0].properties[0]), [ 0, 0, 0, 1, 0, 0, 0, 1, 0 ]);
    assert.deepEqual(Array.from(geometry.children[1].properties[0]), [ 0, 1, -3 ]);
    assert.equal(json.root.header.fbxVersion, 7400);
    assert.equal(json.root.globalSettings.properties.UpAxis.value, 1);
    assert.deepEqual(json.root.objects.byType.Geometry, [ "123" ]);
    assert.equal(json.root.objects.byId["456"].name, "Root");
    assert.deepEqual(json.root.connections.childrenByParent["456"], [ "123" ]);
});

test("normalizes binary fbx object names with embedded class separators", () =>
{
    const
        Root = makeValueClass(),
        Mesh = makeValueClass(),
        IndexGroup = makeValueClass(),
        bytes = makeBinaryFBX(7400, [
            makeBinaryNode7400("Objects", [], [
                makeBinaryNode7400("Geometry", [ 123, "MeshShape\u0000\u0001Geometry", "Mesh" ], [
                    makeBinaryNode7400("Vertices", [ new Float64Array([ 0, 0, 0, 1, 0, 0, 0, 1, 0 ]) ]),
                    makeBinaryNode7400("PolygonVertexIndex", [ new Int32Array([ 0, 1, -3 ]) ])
                ]),
                makeBinaryNode7400("Model", [ 456, "ShipHull\u0000\u0001Model", "Mesh" ]),
                makeBinaryNode7400("Material", [ 789, "Material::Glass\u0000\u0001Material", "" ])
            ]),
            makeBinaryNode7400("Connections", [], [
                makeBinaryNode7400("C", [ "OO", 123, 456 ])
            ])
        ]);

    const json = CjsFbxFormat.read(bytes, { emit: "fbxJson" });
    const gr2 = CjsFbxFormat.read(bytes, {
        emit: "gr2",
        classes: { Root, Mesh, IndexGroup }
    });

    assert.equal(json.root.objects.byId["123"].name, "MeshShape");
    assert.equal(json.root.objects.byId["456"].name, "ShipHull");
    assert.equal(json.root.objects.byId["789"].name, "Glass");
    assert.equal(gr2.meshes[0].name, "ShipHull");
});

test("reports partial FBX feature warnings in support probe", () =>
{
    const bytes = makeBinaryFBX(7400, [
        makeBinaryNode7400("Objects", [], [
            makeBinaryNode7400("Geometry", [ 123, "Geometry::ProbeMesh", "Mesh" ], [
                makeBinaryNode7400("Vertices", [ new Float64Array([ 0, 0, 0, 1, 0, 0, 0, 1, 0 ]) ]),
                makeBinaryNode7400("PolygonVertexIndex", [ new Int32Array([ 0, 1, -3 ]) ]),
                makeBinaryNode7400("LayerElementNormal", [ 0 ], [
                    makeBinaryNode7400("MappingInformationType", [ "ByEdge" ]),
                    makeBinaryNode7400("ReferenceInformationType", [ "Direct" ]),
                    makeBinaryNode7400("Normals", [ new Float64Array([ 0, 0, 1 ]) ])
                ]),
                makeBinaryNode7400("LayerElementColor", [ 0 ], [
                    makeBinaryNode7400("MappingInformationType", [ "AllSame" ]),
                    makeBinaryNode7400("ReferenceInformationType", [ "UnsupportedReference" ]),
                    makeBinaryNode7400("Colors", [ new Float64Array([ 1, 1, 1, 1 ]) ])
                ]),
                makeBinaryNode7400("LayerElementMaterial", [ 0 ], [
                    makeBinaryNode7400("MappingInformationType", [ "ByVertex" ])
                ])
            ]),
            makeBinaryNode7400("Geometry", [ 124, "Geometry::Curve", "NurbsCurve" ]),
            makeBinaryNode7400("Geometry", [ 125, "Geometry::NoVertices", "Mesh" ], [
                makeBinaryNode7400("PolygonVertexIndex", [ new Int32Array([ 0, 1, -3 ]) ])
            ]),
            makeBinaryNode7400("Geometry", [ 126, "Geometry::NoPolygons", "Mesh" ], [
                makeBinaryNode7400("Vertices", [ new Float64Array([ 0, 0, 0, 1, 0, 0, 0, 1, 0 ]) ])
            ]),
            makeBinaryNode7400("Model", [ 456, "Model::ProbeModel", "Mesh" ]),
            makeBinaryNode7400("Model", [ 900, "Model::ProbeBone", "LimbNode" ]),
            makeBinaryNode7400("Deformer", [ 800, "Deformer::Skin", "Skin" ]),
            makeBinaryNode7400("Deformer", [ 801, "SubDeformer::Unlinked", "Cluster" ], [
                makeBinaryNode7400("Indexes", [ new Int32Array([ 0 ]) ]),
                makeBinaryNode7400("Weights", [ new Float64Array([ 1 ]) ])
            ]),
            makeBinaryNode7400("Deformer", [ 802, "Deformer::ExtraSkin", "Skin" ]),
            makeBinaryNode7400("Deformer", [ 803, "SubDeformer::NoIndexes", "Cluster" ], [
                makeBinaryNode7400("Weights", [ new Float64Array([ 1 ]) ])
            ]),
            makeBinaryNode7400("Deformer", [ 804, "SubDeformer::ZeroWeights", "Cluster" ], [
                makeBinaryNode7400("Indexes", [ new Int32Array([ 0 ]) ]),
                makeBinaryNode7400("Weights", [ new Float64Array([ 0 ]) ])
            ]),
            makeBinaryNode7400("Deformer", [ 810, "Deformer::BlendShape", "BlendShape" ]),
            makeBinaryNode7400("Deformer", [ 811, "SubDeformer::Smile", "BlendShapeChannel" ], [
                makeBinaryNode7400("FullWeights", [ new Float64Array([ 50, 100 ]) ])
            ]),
            makeBinaryNode7400("Geometry", [ 812, "Geometry::Smile", "Shape" ], [
                makeBinaryNode7400("Indexes", [ new Int32Array([ 1 ]) ]),
                makeBinaryNode7400("Vertices", [ new Float64Array([ 0, 0, 1 ]) ])
            ]),
            makeBinaryNode7400("Geometry", [ 813, "Geometry::SmileWide", "Shape" ], [
                makeBinaryNode7400("Indexes", [ new Int32Array([ 1 ]) ]),
                makeBinaryNode7400("Vertices", [ new Float64Array([ 0, 0, 2 ]) ])
            ])
        ]),
        makeBinaryNode7400("Connections", [], [
            makeBinaryNode7400("C", [ "OO", 123, 456 ]),
            makeBinaryNode7400("C", [ "OO", 800, 123 ]),
            makeBinaryNode7400("C", [ "OO", 801, 800 ]),
            makeBinaryNode7400("C", [ "OO", 802, 123 ]),
            makeBinaryNode7400("C", [ "OO", 803, 800 ]),
            makeBinaryNode7400("C", [ "OO", 804, 800 ]),
            makeBinaryNode7400("C", [ "OO", 900, 803 ]),
            makeBinaryNode7400("C", [ "OO", 900, 804 ]),
            makeBinaryNode7400("C", [ "OO", 810, 123 ]),
            makeBinaryNode7400("C", [ "OO", 811, 810 ]),
            makeBinaryNode7400("C", [ "OO", 812, 811 ]),
            makeBinaryNode7400("C", [ "OO", 813, 811 ])
        ])
    ]);

    const support = CjsFbxFormat.isSupported(bytes);

    assert.equal(support.supported, "partial");
    assert.deepEqual(support.errors, []);
    assert.equal(support.warnings.some(message => message.includes("MappingInformationType \"ByEdge\"")), true);
    assert.equal(support.warnings.some(message => message.includes("ReferenceInformationType \"UnsupportedReference\"")), true);
    assert.equal(support.warnings.some(message => message.includes("LayerElementMaterial") && message.includes("MappingInformationType \"ByVertex\"")), true);
    assert.equal(support.warnings.some(message => message.includes("NurbsCurve")), true);
    assert.equal(support.warnings.some(message => message.includes("NoVertices") && message.includes("missing Vertices")), true);
    assert.equal(support.warnings.some(message => message.includes("NoPolygons") && message.includes("missing PolygonVertexIndex")), true);
    assert.equal(support.warnings.some(message => message.includes("2 Skin deformers")), true);
    assert.equal(support.warnings.some(message => message.includes("no linked bone Model")), true);
    assert.equal(support.warnings.some(message => message.includes("NoIndexes") && message.includes("no Indexes")), true);
    assert.equal(support.warnings.some(message => message.includes("ZeroWeights") && message.includes("no positive Weights")), true);
    assert.equal(support.warnings.some(message => message.includes("in-between morph interpolation")), true);
});

test("inflates compressed binary arrays for debug and runtime outputs", () =>
{
    const
        Root = makeValueClass(),
        Mesh = makeValueClass(),
        IndexGroup = makeValueClass(),
        vertices = new Float64Array([
            0, 0, 0,
            1, 0, 0,
            0, 1, 0
        ]),
        polygonVertexIndex = new Int32Array([ 0, 1, -3 ]);

    const bytes = makeBinaryFBX(7400, [
        makeBinaryNode7400("Objects", [], [
            makeBinaryNode7400("Geometry", [ 123, "Geometry::Compressed", "Mesh" ], [
                makeBinaryNode7400("Vertices", [ makeCompressedArrayProperty("d", vertices) ]),
                makeBinaryNode7400("PolygonVertexIndex", [ makeCompressedArrayProperty("i", polygonVertexIndex) ])
            ])
        ])
    ]);
    const json = CjsFbxFormat.read(bytes, { emit: "fbxJson" });
    const gr2 = CjsFbxFormat.read(bytes, {
        emit: "gr2",
        classes: { Root, Mesh, IndexGroup }
    });

    assert.deepEqual(Array.from(json.nodes[0].children[0].children[0].properties[0]), Array.from(vertices));
    assert.deepEqual(Array.from(json.nodes[0].children[0].children[1].properties[0]), Array.from(polygonVertexIndex));
    assert.deepEqual(gr2.meshes[0].vertex.position, Array.from(vertices));
    assert.deepEqual(gr2.meshes[0].indices[0].faces, [ 0, 1, 2 ]);
});

test("accepts DataView input and enforces array limits", () =>
{
    const bytes = makeBinaryFBX(7400, [
        makeBinaryNode7400("Objects", [], [
            makeBinaryNode7400("Geometry", [], [
                makeBinaryNode7400("Vertices", [ new Float64Array([ 0, 1, 2 ]) ])
            ])
        ])
    ]);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    assert.equal(CjsFbxFormat.inspect(view).version, 7400);
    assert.throws(
        () => CjsFbxFormat.read(view, { emit: "fbxJson", maxArrayLength: 2 }),
        /maxArrayLength/u
    );
});

test("inspects ascii fbx version as debug json", () =>
{
    const bytes = new TextEncoder().encode(
        "; FBX 7.4.0 project file\n" +
        "FBXHeaderExtension:  {\n" +
        "    FBXVersion: 7400\n" +
        "}\n" +
        "GlobalSettings:  {\n" +
        "    Properties70:  {\n" +
        "        P: \"UpAxis\", \"int\", \"Integer\", \"\", 1\n" +
        "    }\n" +
        "}\n" +
        "Objects:  {\n" +
        "    Geometry: 123, \"Geometry::Mesh\", \"Mesh\" {\n" +
        "        Vertices: *9 {\n" +
        "            a: 0,0,0,1,0,0,0,1,0\n" +
        "        }\n" +
        "        PolygonVertexIndex: *3 {\n" +
        "            a: 0,1,-3\n" +
        "        }\n" +
        "    }\n" +
        "    Model: 456, \"Model::Root\", \"Null\" {\n" +
        "    }\n" +
        "}\n" +
        "Connections:  {\n" +
        "    C: \"OO\", 123, 456\n" +
        "}\n"
    );
    const json = CjsFbxFormat.read(bytes, { emit: "json" });
    const support = CjsFbxFormat.isSupported(bytes);
    const objects = json.nodes.find(node => node.name === "Objects");
    const geometry = objects.children[0];

    assert.equal(json.encoding, "ascii");
    assert.equal(json.version, 7400);
    assert.equal(geometry.name, "Geometry");
    assert.deepEqual(geometry.properties, [ 123, "Geometry::Mesh", "Mesh" ]);
    assert.deepEqual(geometry.children[0].children[0].properties, [ 0, 0, 0, 1, 0, 0, 0, 1, 0 ]);
    assert.equal(json.root.globalSettings.properties.UpAxis.value, 1);
    assert.equal(json.root.objects.byId["123"].name, "Mesh");
    assert.equal(json.root.objects.byId["456"].nodeName, "Model");
    assert.deepEqual(json.root.connections.parentsByChild["123"], [ "456" ]);
    assert.equal(support.supported, "partial");
    assert.equal(support.preferred, "gr2");
    assert.equal(support.variants.some(variant => variant.kind === "cmf" && variant.codec === "cmf-geometry-animation"), true);
});

test("emits gr2 classes for static ascii mesh", () =>
{
    const
        Root = makeValueClass(),
        Mesh = makeValueClass(),
        IndexGroup = makeValueClass();

    const bytes = new TextEncoder().encode(
        "; FBX 7.4.0 project file\n" +
        "Objects:  {\n" +
        "    Geometry: 123, \"Geometry::AsciiMesh\", \"Mesh\" {\n" +
        "        Vertices: *9 {\n" +
        "            a: 0,0,0,1,0,0,0,1,0\n" +
        "        }\n" +
        "        PolygonVertexIndex: *3 {\n" +
        "            a: 0,1,-3\n" +
        "        }\n" +
        "    }\n" +
        "    Model: 456, \"Model::AsciiModel\", \"Mesh\" {\n" +
        "    }\n" +
        "}\n" +
        "Connections:  {\n" +
        "    C: \"OO\", 123, 456\n" +
        "}\n"
    );

    const gr2 = CjsFbxFormat.read(bytes, {
        emit: "gr2",
        classes: { Root, Mesh, IndexGroup }
    });

    assert.equal(gr2 instanceof Root, true);
    assert.equal(gr2.meshes[0] instanceof Mesh, true);
    assert.equal(gr2.meshes[0].indices[0] instanceof IndexGroup, true);
    assert.equal(gr2.meshes[0].name, "AsciiModel");
    assert.deepEqual(gr2.meshes[0].vertex.position, [ 0, 0, 0, 1, 0, 0, 0, 1, 0 ]);
    assert.deepEqual(gr2.meshes[0].indices[0].faces, [ 0, 1, 2 ]);
});

test("emits cmf classes for static binary mesh without debug parsing", () =>
{
    const
        Root = makeValueClass(),
        Metadata = makeValueClass(),
        MetadataEntry = makeValueClass(),
        Mesh = makeValueClass(),
        MeshLod = makeValueClass(),
        VertexElement = makeValueClass(),
        MeshArea = makeValueClass(),
        LodMeshArea = makeValueClass(),
        MorphTargets = makeValueClass(),
        AudioOcclusionMesh = makeValueClass();

    const bytes = makeBinaryFBX(7400, [
        makeBinaryNode7400("Poison", [ makeUnknownProperty("Z") ]),
        makeBinaryNode7400("Objects", [], [
            makeBinaryNode7400("Geometry", [ 123, "Geometry::Hull", "Mesh" ], [
                makeBinaryNode7400("Vertices", [ new Float64Array([
                    0, 0, 0,
                    1, 0, 0,
                    1, 1, 0
                ]) ]),
                makeBinaryNode7400("PolygonVertexIndex", [ new Int32Array([ 0, 1, -3 ]) ])
            ]),
            makeBinaryNode7400("Model", [ 456, "Model::Ship", "Mesh" ])
        ]),
        makeBinaryNode7400("Connections", [], [
            makeBinaryNode7400("C", [ "OO", 123, 456 ])
        ])
    ]);

    const cmf = CjsFbxFormat.read(bytes, {
        emit: "cmf",
        source: "ship.fbx",
        classes: {
            Root,
            Metadata,
            MetadataEntry,
            Mesh,
            MeshLod,
            VertexElement,
            MeshArea,
            LodMeshArea,
            MorphTargets,
            AudioOcclusionMesh
        }
    });

    assert.throws(
        () => CjsFbxFormat.read(bytes, { emit: "fbxJson" }),
        /unsupported property type "Z"/u
    );
    assert.equal(cmf instanceof Root, true);
    assert.equal(cmf.__setValuesCalls, 1);
    assert.equal(cmf.version, 1);
    assert.equal(cmf.metadata instanceof Metadata, true);
    assert.equal(cmf.metadata.__setValuesCalls, 1);
    assert.equal(cmf.metadata.entries[0] instanceof MetadataEntry, true);
    assert.equal(cmf.metadata.entries[0].__setValuesCalls, 1);
    assert.deepEqual(Object.fromEntries(cmf.metadata.entries.map(entry => [ entry.key, entry.value ])), {
        source: "ship.fbx",
        sourceFormat: "fbx",
        generator: "CjsFbxFormat"
    });
    assert.equal(cmf.meshes[0] instanceof Mesh, true);
    assert.equal(cmf.meshes[0].__setValuesCalls, 1);
    assert.equal(cmf.meshes[0].name, "Ship");
    assert.equal(cmf.meshes[0].decl[0] instanceof VertexElement, true);
    assert.equal(cmf.meshes[0].decl[0].__setValuesCalls, 1);
    assert.deepEqual({
        usage: cmf.meshes[0].decl[0].usage,
        usageIndex: cmf.meshes[0].decl[0].usageIndex,
        type: cmf.meshes[0].decl[0].type,
        elementCount: cmf.meshes[0].decl[0].elementCount,
        offset: cmf.meshes[0].decl[0].offset
    }, {
        usage: "Position",
        usageIndex: 0,
        type: "Float32",
        elementCount: 3,
        offset: 0
    });
    assert.equal(cmf.meshes[0].lods[0] instanceof MeshLod, true);
    assert.equal(cmf.meshes[0].areas[0] instanceof MeshArea, true);
    assert.equal(cmf.meshes[0].lods[0].areas[0] instanceof LodMeshArea, true);
    assert.equal(cmf.meshes[0].morphTargets instanceof MorphTargets, true);
    assert.equal(cmf.meshes[0].audioOcclusionMesh instanceof AudioOcclusionMesh, true);
    assert.deepEqual(cmf.meshes[0].bounds, { min: [ 0, 0, 0 ], max: [ 1, 1, 0 ] });
    assert.deepEqual(cmf.meshes[0].lods[0].vertex.position, [ 0, 0, 0, 1, 0, 0, 1, 1, 0 ]);
    assert.deepEqual(cmf.meshes[0].lods[0].indices[0].faces, [ 0, 1, 2 ]);
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

function float32Bytes(values)
{
    const
        bytes = new Uint8Array(values.length * 4),
        view = new DataView(bytes.buffer);

    values.forEach((value, index) => view.setFloat32(index * 4, value, true));
    return Array.from(bytes);
}

function float32Base64(values)
{
    const
        bytes = new Uint8Array(values.length * 4),
        view = new DataView(bytes.buffer);

    values.forEach((value, index) => view.setFloat32(index * 4, value, true));
    return Buffer.from(bytes).toString("base64");
}

function float32Values(bytes)
{
    const
        data = Uint8Array.from(bytes),
        view = new DataView(data.buffer, data.byteOffset, data.byteLength),
        values = [];

    for (let offset = 0; offset < data.byteLength; offset += 4)
    {
        values.push(view.getFloat32(offset, true));
    }
    return values;
}

function assertFloatArrayClose(actual, expected, epsilon = 1e-6)
{
    assert.equal(actual.length, expected.length);
    for (let i = 0; i < actual.length; i++)
    {
        assert.ok(Math.abs(actual[i] - expected[i]) <= epsilon, `index ${i}: expected ${expected[i]}, got ${actual[i]}`);
    }
}

function triangleSignedAreaXY(positions, a, b, c)
{
    const
        ax = positions[a * 3],
        ay = positions[a * 3 + 1],
        bx = positions[b * 3],
        by = positions[b * 3 + 1],
        cx = positions[c * 3],
        cy = positions[c * 3 + 1];

    return ((bx - ax) * (cy - ay) - (by - ay) * (cx - ax)) * 0.5;
}

function makeStaticTriangleFBX()
{
    return makeBinaryFBX(7400, [
        makeBinaryNode7400("Objects", [], [
            makeBinaryNode7400("Geometry", [ 123, "Geometry::Triangle", "Mesh" ], [
                makeBinaryNode7400("Vertices", [ new Float64Array([
                    0, 0, 0,
                    1, 0, 0,
                    0, 1, 0
                ]) ]),
                makeBinaryNode7400("PolygonVertexIndex", [ new Int32Array([ 0, 1, -3 ]) ])
            ])
        ])
    ]);
}

function makeUvTriangleFBX()
{
    return makeBinaryFBX(7400, [
        makeBinaryNode7400("Objects", [], [
            makeBinaryNode7400("Geometry", [ 123, "Geometry::UvTriangle", "Mesh" ], [
                makeBinaryNode7400("Vertices", [ new Float64Array([
                    0, 0, 0,
                    1, 0, 0,
                    0, 1, 0
                ]) ]),
                makeBinaryNode7400("PolygonVertexIndex", [ new Int32Array([ 0, 1, -3 ]) ]),
                makeBinaryNode7400("LayerElementUV", [ 0 ], [
                    makeBinaryNode7400("MappingInformationType", [ "ByPolygonVertex" ]),
                    makeBinaryNode7400("ReferenceInformationType", [ "Direct" ]),
                    makeBinaryNode7400("UV", [ new Float64Array([
                        0.25, 0.2,
                        0.5, 0.75,
                        1, 1
                    ]) ])
                ])
            ])
        ])
    ]);
}

function makeGeneratedTangentTriangleFBX()
{
    return makeBinaryFBX(7400, [
        makeBinaryNode7400("Objects", [], [
            makeBinaryNode7400("Geometry", [ 123, "Geometry::GeneratedTangent", "Mesh" ], [
                makeBinaryNode7400("Vertices", [ new Float64Array([
                    0, 0, 0,
                    1, 0, 0,
                    0, 1, 0
                ]) ]),
                makeBinaryNode7400("PolygonVertexIndex", [ new Int32Array([ 0, 1, -3 ]) ]),
                makeBinaryNode7400("LayerElementNormal", [ 0 ], [
                    makeBinaryNode7400("MappingInformationType", [ "AllSame" ]),
                    makeBinaryNode7400("ReferenceInformationType", [ "Direct" ]),
                    makeBinaryNode7400("Normals", [ new Float64Array([ 0, 0, 1 ]) ])
                ]),
                makeBinaryNode7400("LayerElementUV", [ 0 ], [
                    makeBinaryNode7400("MappingInformationType", [ "ByPolygonVertex" ]),
                    makeBinaryNode7400("ReferenceInformationType", [ "Direct" ]),
                    makeBinaryNode7400("UV", [ new Float64Array([
                        0, 0,
                        1, 0,
                        0, 1
                    ]) ])
                ])
            ])
        ])
    ]);
}

function makeSkinnedTriangleFBX()
{
    return makeBinaryFBX(7400, [
        makeBinaryNode7400("Objects", [], [
            makeBinaryNode7400("Geometry", [ 123, "Geometry::Skinned", "Mesh" ], [
                makeBinaryNode7400("Vertices", [ new Float64Array([
                    0, 0, 0,
                    1, 0, 0,
                    0, 1, 0
                ]) ]),
                makeBinaryNode7400("PolygonVertexIndex", [ new Int32Array([ 0, 1, -3 ]) ])
            ]),
            makeBinaryNode7400("Model", [ 456, "Model::Skinned", "Mesh" ]),
            makeBinaryNode7400("Model", [ 900, "Model::BoneA", "LimbNode" ]),
            makeBinaryNode7400("Model", [ 901, "Model::BoneB", "LimbNode" ]),
            makeBinaryNode7400("Deformer", [ 800, "Deformer::Skin", "Skin" ]),
            makeBinaryNode7400("Deformer", [ 801, "SubDeformer::BoneA", "Cluster" ], [
                makeBinaryNode7400("Indexes", [ new Int32Array([ 0, 1 ]) ]),
                makeBinaryNode7400("Weights", [ new Float64Array([ 1, 0.25 ]) ])
            ]),
            makeBinaryNode7400("Deformer", [ 802, "SubDeformer::BoneB", "Cluster" ], [
                makeBinaryNode7400("Indexes", [ new Int32Array([ 1, 2 ]) ]),
                makeBinaryNode7400("Weights", [ new Float64Array([ 0.75, 1 ]) ])
            ])
        ]),
        makeBinaryNode7400("Connections", [], [
            makeBinaryNode7400("C", [ "OO", 123, 456 ]),
            makeBinaryNode7400("C", [ "OO", 800, 123 ]),
            makeBinaryNode7400("C", [ "OO", 801, 800 ]),
            makeBinaryNode7400("C", [ "OO", 802, 800 ]),
            makeBinaryNode7400("C", [ "OO", 900, 801 ]),
            makeBinaryNode7400("C", [ "OO", 901, 802 ])
        ])
    ]);
}

function makeTwoMaterialPartiallySkinnedFBX()
{
    return makeBinaryFBX(7400, [
        makeBinaryNode7400("Objects", [], [
            makeBinaryNode7400("Geometry", [ 123, "Geometry::TwoMaterialSkin", "Mesh" ], [
                makeBinaryNode7400("Vertices", [ new Float64Array([
                    0, 0, 0,
                    1, 0, 0,
                    0, 1, 0,
                    3, 0, 0,
                    4, 0, 0,
                    3, 1, 0
                ]) ]),
                makeBinaryNode7400("PolygonVertexIndex", [ new Int32Array([ 0, 1, -3, 3, 4, -6 ]) ]),
                makeBinaryNode7400("LayerElementMaterial", [ 0 ], [
                    makeBinaryNode7400("MappingInformationType", [ "ByPolygon" ]),
                    makeBinaryNode7400("ReferenceInformationType", [ "IndexToDirect" ]),
                    makeBinaryNode7400("Materials", [ new Int32Array([ 0, 1 ]) ])
                ])
            ]),
            makeBinaryNode7400("Model", [ 456, "Model::TwoMaterialSkin", "Mesh" ]),
            makeBinaryNode7400("Model", [ 900, "Model::BoneA", "LimbNode" ]),
            makeBinaryNode7400("Material", [ 700, "Material::Steel", "" ]),
            makeBinaryNode7400("Material", [ 701, "Material::Glass", "" ]),
            makeBinaryNode7400("Deformer", [ 800, "Deformer::Skin", "Skin" ]),
            makeBinaryNode7400("Deformer", [ 801, "SubDeformer::BoneA", "Cluster" ], [
                makeBinaryNode7400("Indexes", [ new Int32Array([ 0, 1, 2 ]) ]),
                makeBinaryNode7400("Weights", [ new Float64Array([ 1, 1, 1 ]) ])
            ])
        ]),
        makeBinaryNode7400("Connections", [], [
            makeBinaryNode7400("C", [ "OO", 123, 456 ]),
            makeBinaryNode7400("C", [ "OO", 700, 456 ]),
            makeBinaryNode7400("C", [ "OO", 701, 456 ]),
            makeBinaryNode7400("C", [ "OO", 800, 123 ]),
            makeBinaryNode7400("C", [ "OO", 801, 800 ]),
            makeBinaryNode7400("C", [ "OO", 900, 801 ])
        ])
    ]);
}

function makeMorphedTriangleFBX(options = {})
{
    const geometryChildren = [
        makeBinaryNode7400("Vertices", [ new Float64Array([
            0, 0, 0,
            1, 0, 0,
            0, 1, 0
        ]) ]),
        makeBinaryNode7400("PolygonVertexIndex", [ new Int32Array([ 0, 1, -3 ]) ])
    ];
    if (options.tangentSpaceLayers)
    {
        geometryChildren.push(
            makeBinaryNode7400("LayerElementNormal", [ 0 ], [
                makeBinaryNode7400("MappingInformationType", [ "AllSame" ]),
                makeBinaryNode7400("ReferenceInformationType", [ "Direct" ]),
                makeBinaryNode7400("Normals", [ new Float64Array([ 0, 0, 1 ]) ])
            ]),
            makeBinaryNode7400("LayerElementTangent", [ 0 ], [
                makeBinaryNode7400("MappingInformationType", [ "AllSame" ]),
                makeBinaryNode7400("ReferenceInformationType", [ "Direct" ]),
                makeBinaryNode7400("Tangents", [ new Float64Array([ 1, 0, 0 ]) ])
            ]),
            makeBinaryNode7400("LayerElementBinormal", [ 0 ], [
                makeBinaryNode7400("MappingInformationType", [ "AllSame" ]),
                makeBinaryNode7400("ReferenceInformationType", [ "Direct" ]),
                makeBinaryNode7400("Binormals", [ new Float64Array([ 0, 1, 0 ]) ])
            ]),
            makeBinaryNode7400("LayerElementUV", [ 0 ], [
                makeBinaryNode7400("MappingInformationType", [ "ByPolygonVertex" ]),
                makeBinaryNode7400("ReferenceInformationType", [ "Direct" ]),
                makeBinaryNode7400("UV", [ new Float64Array([
                    0, 0,
                    1, 0,
                    0, 1
                ]) ])
            ])
        );
    }

    const modelProperties = [];
    if (options.customMorphNormals)
    {
        modelProperties.push(makeBinaryNode7400("P", [ "bsNormals_Smile", "KString", "", "U", float32Base64(options.customMorphNormals) ]));
    }
    if (options.secondMorphCustomNormals)
    {
        modelProperties.push(makeBinaryNode7400("P", [ "bsNormals_Frown", "KString", "", "U", float32Base64(options.secondMorphCustomNormals) ]));
    }

    const modelChildren = modelProperties.length
        ? [ makeBinaryNode7400("Properties70", [], modelProperties) ]
        : [];

    return makeBinaryFBX(7400, [
        makeBinaryNode7400("Objects", [], [
            makeBinaryNode7400("Geometry", [ 123, "Geometry::Morphed", "Mesh" ], geometryChildren),
            makeBinaryNode7400("Model", [ 456, "Model::Morphed", "Mesh" ], modelChildren),
            makeBinaryNode7400("Deformer", [ 810, "Deformer::BlendShape", "BlendShape" ]),
            makeBinaryNode7400("Deformer", [ 811, "SubDeformer::Smile", "BlendShapeChannel" ], [
                makeBinaryNode7400("FullWeights", [ new Float64Array(options.inBetweenMorph ? [ 50, 100 ] : [ 100 ]) ])
            ]),
            makeBinaryNode7400("Geometry", [ 812, "Geometry::Smile", "Shape" ], [
                makeBinaryNode7400("Indexes", [ new Int32Array([ 1 ]) ]),
                makeBinaryNode7400("Vertices", [ new Float64Array([ 0, 0, 1 ]) ])
            ]),
            ...(options.secondMorphCustomNormals
                ? [
                    makeBinaryNode7400("Deformer", [ 814, "SubDeformer::Frown", "BlendShapeChannel" ], [
                        makeBinaryNode7400("FullWeights", [ new Float64Array([ 100 ]) ])
                    ]),
                    makeBinaryNode7400("Geometry", [ 815, "Geometry::Frown", "Shape" ], [
                        makeBinaryNode7400("Indexes", [ new Int32Array([ 1 ]) ]),
                        makeBinaryNode7400("Vertices", [ new Float64Array([ 0, 0, -1 ]) ])
                    ])
                ]
                : []),
            ...(options.inBetweenMorph
                ? [
                    makeBinaryNode7400("Geometry", [ 813, "Geometry::SmileWide", "Shape" ], [
                        makeBinaryNode7400("Indexes", [ new Int32Array([ 1 ]) ]),
                        makeBinaryNode7400("Vertices", [ new Float64Array([ 0, 0, 2 ]) ])
                    ])
                ]
                : [])
        ]),
        makeBinaryNode7400("Connections", [], [
            makeBinaryNode7400("C", [ "OO", 123, 456 ]),
            makeBinaryNode7400("C", [ "OO", 810, 123 ]),
            makeBinaryNode7400("C", [ "OO", 811, 810 ]),
            makeBinaryNode7400("C", [ "OO", 812, 811 ]),
            ...(options.secondMorphCustomNormals
                ? [
                    makeBinaryNode7400("C", [ "OO", 814, 810 ]),
                    makeBinaryNode7400("C", [ "OO", 815, 814 ])
                ]
                : []),
            ...(options.inBetweenMorph ? [ makeBinaryNode7400("C", [ "OO", 813, 811 ]) ] : [])
        ])
    ]);
}

function makeTwoMaterialMorphedFBX()
{
    return makeBinaryFBX(7400, [
        makeBinaryNode7400("Objects", [], [
            makeBinaryNode7400("Geometry", [ 123, "Geometry::TwoMaterials", "Mesh" ], [
                makeBinaryNode7400("Vertices", [ new Float64Array([
                    0, 0, 0,
                    1, 0, 0,
                    0, 1, 0,
                    3, 0, 0,
                    4, 0, 0,
                    3, 1, 0
                ]) ]),
                makeBinaryNode7400("PolygonVertexIndex", [ new Int32Array([ 0, 1, -3, 3, 4, -6 ]) ]),
                makeBinaryNode7400("LayerElementMaterial", [ 0 ], [
                    makeBinaryNode7400("MappingInformationType", [ "ByPolygon" ]),
                    makeBinaryNode7400("ReferenceInformationType", [ "IndexToDirect" ]),
                    makeBinaryNode7400("Materials", [ new Int32Array([ 0, 1 ]) ])
                ])
            ]),
            makeBinaryNode7400("Model", [ 456, "Model::TwoMaterials", "Mesh" ]),
            makeBinaryNode7400("Material", [ 700, "Material::Steel", "" ]),
            makeBinaryNode7400("Material", [ 701, "Material::Glass", "" ]),
            makeBinaryNode7400("Deformer", [ 810, "Deformer::BlendShape", "BlendShape" ]),
            makeBinaryNode7400("Deformer", [ 811, "SubDeformer::Smile", "BlendShapeChannel" ], [
                makeBinaryNode7400("FullWeights", [ new Float64Array([ 100 ]) ])
            ]),
            makeBinaryNode7400("Geometry", [ 812, "Geometry::Smile", "Shape" ], [
                makeBinaryNode7400("Indexes", [ new Int32Array([ 1 ]) ]),
                makeBinaryNode7400("Vertices", [ new Float64Array([ 0, 0, 1 ]) ])
            ])
        ]),
        makeBinaryNode7400("Connections", [], [
            makeBinaryNode7400("C", [ "OO", 123, 456 ]),
            makeBinaryNode7400("C", [ "OO", 700, 456 ]),
            makeBinaryNode7400("C", [ "OO", 701, 456 ]),
            makeBinaryNode7400("C", [ "OO", 810, 123 ]),
            makeBinaryNode7400("C", [ "OO", 811, 810 ]),
            makeBinaryNode7400("C", [ "OO", 812, 811 ])
        ])
    ]);
}

function makeAnimatedMorphedTriangleFBX(options = {})
{
    const
        stackStart = options.stackTimeSpan ? FBX_TICKS_PER_SECOND : 0,
        stackStop = options.stackTimeSpan ? FBX_TICKS_PER_SECOND * 3 : FBX_TICKS_PER_SECOND,
        keyStart = stackStart,
        keyStop = options.stackTimeSpan ? stackStart + FBX_TICKS_PER_SECOND / 2 : FBX_TICKS_PER_SECOND,
        animationTicks = options.unsortedAnimationCurve ? [ keyStop, keyStart ] : [ keyStart, keyStop ],
        animationValues = options.unsortedAnimationCurve ? [ 100, 0 ] : [ 0, 100 ],
        animationValueNodeName = options.keyValueFallback ? "KeyValue" : "KeyValueFloat",
        animationValueArray = options.mismatchedAnimationCurve ? [ animationValues[0] ] : animationValues,
        stackChildren = options.stackTimeSpan
            ? [
                makeBinaryNode7400("Properties70", [], [
                    makeBinaryNode7400("P", [ "LocalStart", "KTime", "Time", "", makeInt64(stackStart) ]),
                    makeBinaryNode7400("P", [ "LocalStop", "KTime", "Time", "", makeInt64(stackStop) ])
                ])
            ]
            : [];

    return makeBinaryFBX(7400, [
        makeBinaryNode7400("Objects", [], [
            makeBinaryNode7400("Geometry", [ 123, "Geometry::Morphed", "Mesh" ], [
                makeBinaryNode7400("Vertices", [ new Float64Array([
                    0, 0, 0,
                    1, 0, 0,
                    0, 1, 0
                ]) ]),
                makeBinaryNode7400("PolygonVertexIndex", [ new Int32Array([ 0, 1, -3 ]) ])
            ]),
            makeBinaryNode7400("Model", [ 456, "Model::Morphed", "Mesh" ]),
            makeBinaryNode7400("Deformer", [ 810, "Deformer::BlendShape", "BlendShape" ]),
            makeBinaryNode7400("Deformer", [ 811, "SubDeformer::Smile", "BlendShapeChannel" ], [
                makeBinaryNode7400("FullWeights", [ new Float64Array(options.inBetweenMorph ? [ 50, 100 ] : [ 100 ]) ])
            ]),
            makeBinaryNode7400("Geometry", [ 812, "Geometry::Smile", "Shape" ], [
                makeBinaryNode7400("Indexes", [ new Int32Array([ 1 ]) ]),
                makeBinaryNode7400("Vertices", [ new Float64Array([ 0, 0, 1 ]) ])
            ]),
            ...(options.inBetweenMorph
                ? [
                    makeBinaryNode7400("Geometry", [ 813, "Geometry::SmileWide", "Shape" ], [
                        makeBinaryNode7400("Indexes", [ new Int32Array([ 1 ]) ]),
                        makeBinaryNode7400("Vertices", [ new Float64Array([ 0, 0, 2 ]) ])
                    ])
                ]
                : []),
            makeBinaryNode7400("AnimationStack", [ 820, "AnimStack::Take 001", "" ], stackChildren),
            makeBinaryNode7400("AnimationLayer", [ 821, "AnimLayer::BaseLayer", "" ]),
            makeBinaryNode7400("AnimationCurveNode", [ 822, "AnimCurveNode::Smile", "" ]),
            makeBinaryNode7400("AnimationCurve", [ 823, "AnimCurve::Smile", "" ], [
                makeBinaryNode7400("KeyTime", [ new Float64Array(animationTicks) ]),
                makeBinaryNode7400(animationValueNodeName, [ new Float64Array(animationValueArray) ])
            ])
        ]),
        makeBinaryNode7400("Connections", [], [
            makeBinaryNode7400("C", [ "OO", 123, 456 ]),
            makeBinaryNode7400("C", [ "OO", 810, 123 ]),
            makeBinaryNode7400("C", [ "OO", 811, 810 ]),
            makeBinaryNode7400("C", [ "OO", 812, 811 ]),
            ...(options.inBetweenMorph ? [ makeBinaryNode7400("C", [ "OO", 813, 811 ]) ] : []),
            makeBinaryNode7400("C", [ "OO", 821, 820 ]),
            makeBinaryNode7400("C", [ "OO", 822, 821 ]),
            makeBinaryNode7400("C", [ "OP", 822, 811, "DeformPercent" ]),
            makeBinaryNode7400("C", [ "OP", 823, 822, "d|DeformPercent" ])
        ])
    ]);
}

function readInheritTypeMesh(inheritType)
{
    const
        Root = makeValueClass(),
        Mesh = makeValueClass(),
        IndexGroup = makeValueClass();

    return CjsFbxFormat.read(makeInheritTypeFBX(inheritType), {
        emit: "gr2",
        classes: { Root, Mesh, IndexGroup }
    }).meshes[0];
}

function makeInheritTypeFBX(inheritType)
{
    const childProperties = [
        makeBinaryNode7400("P", [ "Lcl Translation", "Lcl Translation", "", "A", 1, 1, 1 ]),
        makeBinaryNode7400("P", [ "Lcl Rotation", "Lcl Rotation", "", "A", 0, 0, 90 ])
    ];

    if (inheritType !== null)
    {
        childProperties.push(makeBinaryNode7400("P", [ "InheritType", "enum", "", "", inheritType ]));
    }

    return makeBinaryFBX(7400, [
        makeBinaryNode7400("Objects", [], [
            makeBinaryNode7400("Geometry", [ 123, "Geometry::Inherit", "Mesh" ], [
                makeBinaryNode7400("Vertices", [ new Float64Array([
                    0, 0, 0,
                    1, 0, 0,
                    0, 1, 0
                ]) ]),
                makeBinaryNode7400("PolygonVertexIndex", [ new Int32Array([ 0, 1, -3 ]) ])
            ]),
            makeBinaryNode7400("Model", [ 455, "Model::Parent", "Mesh" ], [
                makeBinaryNode7400("Properties70", [], [
                    makeBinaryNode7400("P", [ "Lcl Scaling", "Lcl Scaling", "", "A", 2, 3, 4 ])
                ])
            ]),
            makeBinaryNode7400("Model", [ 456, "Model::Child", "Mesh" ], [
                makeBinaryNode7400("Properties70", [], childProperties)
            ])
        ]),
        makeBinaryNode7400("Connections", [], [
            makeBinaryNode7400("C", [ "OO", 123, 456 ]),
            makeBinaryNode7400("C", [ "OO", 456, 455 ])
        ])
    ]);
}

function makeSkinnedHierarchyFBX(options = {})
{
    const
        boneAProperties = [
            makeBinaryNode7400("P", [ "Lcl Translation", "Lcl Translation", "", "A", 1, 0, 0 ])
        ],
        boneBProperties = [
            makeBinaryNode7400("P", [ "Lcl Translation", "Lcl Translation", "", "A", 0, 2, 0 ])
        ];

    if (options.rootMorphAnimation)
    {
        boneAProperties.push(makeBinaryNode7400("P", [ "Smile", "Number", "", "U", 0 ]));
    }
    if (options.boneMasks)
    {
        boneAProperties.push(
            makeBinaryNode7400("P", [ "UpperBody", "Number", "", "U", 2 ]),
            makeBinaryNode7400("P", [ "Disabled", "Number", "", "U", -1 ]),
            makeBinaryNode7400("P", [ "IgnoredText", "KString", "", "U", "not_numeric" ])
        );
        boneBProperties.push(makeBinaryNode7400("P", [ "UpperBody", "Number", "", "U", 1 ]));
    }

    const objects = [
        makeBinaryNode7400("Geometry", [ 123, "Geometry::Skinned", "Mesh" ], [
            makeBinaryNode7400("Vertices", [ new Float64Array([
                0, 0, 0,
                1, 0, 0,
                0, 1, 0
            ]) ]),
            makeBinaryNode7400("PolygonVertexIndex", [ new Int32Array([ 0, 1, -3 ]) ])
        ]),
        makeBinaryNode7400("Model", [ 456, "Model::Skinned", "Mesh" ]),
        makeBinaryNode7400("Model", [ 900, "Model::BoneA", "LimbNode" ], [
            makeBinaryNode7400("Properties70", [], boneAProperties)
        ]),
        makeBinaryNode7400("Model", [ 901, "Model::BoneB", "LimbNode" ], [
            makeBinaryNode7400("Properties70", [], boneBProperties)
        ]),
        makeBinaryNode7400("Deformer", [ 800, "Deformer::Skin", "Skin" ]),
        makeBinaryNode7400("Deformer", [ 801, "SubDeformer::BoneA", "Cluster" ], [
            makeBinaryNode7400("Indexes", [ new Int32Array([ 0, 1 ]) ]),
            makeBinaryNode7400("Weights", [ new Float64Array([ 1, 0.25 ]) ])
        ]),
        makeBinaryNode7400("Deformer", [ 802, "SubDeformer::BoneB", "Cluster" ], [
            makeBinaryNode7400("Indexes", [ new Int32Array([ 1, 2 ]) ]),
            makeBinaryNode7400("Weights", [ new Float64Array([ 0.75, 1 ]) ])
        ])
    ];

    if (options.rootMorphAnimation)
    {
        objects.push(
            makeBinaryNode7400("Deformer", [ 810, "Deformer::BlendShape", "BlendShape" ]),
            makeBinaryNode7400("Deformer", [ 811, "SubDeformer::Smile", "BlendShapeChannel" ], [
                makeBinaryNode7400("FullWeights", [ new Float64Array([ 100 ]) ])
            ]),
            makeBinaryNode7400("Geometry", [ 812, "Geometry::Smile", "Shape" ], [
                makeBinaryNode7400("Indexes", [ new Int32Array([ 1 ]) ]),
                makeBinaryNode7400("Vertices", [ new Float64Array([ 0, 0, 1 ]) ])
            ]),
            makeBinaryNode7400("AnimationStack", [ 840, "AnimStack::Take 001", "" ]),
            makeBinaryNode7400("AnimationLayer", [ 841, "AnimLayer::BaseLayer", "" ]),
            makeBinaryNode7400("AnimationCurveNode", [ 842, "AnimCurveNode::Smile", "" ]),
            makeBinaryNode7400("AnimationCurve", [ 843, "AnimCurve::Smile", "" ], [
                makeBinaryNode7400("KeyTime", [ new Float64Array([ 0, FBX_TICKS_PER_SECOND ]) ]),
                makeBinaryNode7400("KeyValueFloat", [ new Float64Array([ 0, 0.5 ]) ])
            ])
        );
    }

    if (options.unusableCluster)
    {
        objects.push(makeBinaryNode7400("Deformer", [ 803, "SubDeformer::Unlinked", "Cluster" ], [
            makeBinaryNode7400("Indexes", [ new Int32Array([ 2 ]) ]),
            makeBinaryNode7400("Weights", [ new Float64Array([ 1 ]) ])
        ]));
    }

    if (options.animation)
    {
        const
            translationCurveNodeChildren = options.animationCurveNodeDefaults
                ? [
                    makeBinaryNode7400("Properties70", [], [
                        makeBinaryNode7400("P", [ "d|X", "Number", "", "A", 10 ]),
                        makeBinaryNode7400("P", [ "d|Y", "Number", "", "A", 20 ]),
                        makeBinaryNode7400("P", [ "d|Z", "Number", "", "A", 30 ])
                    ])
                ]
                : [],
            scaleCurveNodeChildren = options.animationCurveNodeDefaults
                ? [
                    makeBinaryNode7400("Properties70", [], [
                        makeBinaryNode7400("P", [ "d|X", "Number", "", "A", 10 ]),
                        makeBinaryNode7400("P", [ "d|Y", "Number", "", "A", 20 ]),
                        makeBinaryNode7400("P", [ "d|Z", "Number", "", "A", 30 ])
                    ])
                ]
                : [],
            translationYValues = options.animationCurveNodeDefaults ? [ 40, 50 ] : [ 2, 4 ],
            scaleXValues = options.animationCurveNodeDefaults ? [ 2, 4 ] : [ 1, 2 ];

        objects.push(
            makeBinaryNode7400("AnimationStack", [ 820, "AnimStack::Take 001", "" ]),
            makeBinaryNode7400("AnimationLayer", [ 821, "AnimLayer::BaseLayer", "" ]),
            makeBinaryNode7400("AnimationCurveNode", [ 822, "AnimCurveNode::BoneBTranslation", "" ], translationCurveNodeChildren),
            makeBinaryNode7400("AnimationCurve", [ 823, "AnimCurve::BoneBTranslationY", "" ], [
                makeBinaryNode7400("KeyTime", [ new Float64Array([ 0, FBX_TICKS_PER_SECOND ]) ]),
                makeBinaryNode7400("KeyValueFloat", [ new Float64Array(translationYValues) ])
            ]),
            makeBinaryNode7400("AnimationCurveNode", [ 824, "AnimCurveNode::BoneBRotation", "" ]),
            makeBinaryNode7400("AnimationCurve", [ 825, "AnimCurve::BoneBRotationZ", "" ], [
                makeBinaryNode7400("KeyTime", [ new Float64Array([ 0, FBX_TICKS_PER_SECOND ]) ]),
                makeBinaryNode7400("KeyValueFloat", [ new Float64Array([ 0, 90 ]) ])
            ]),
            makeBinaryNode7400("AnimationCurveNode", [ 826, "AnimCurveNode::BoneBScale", "" ], scaleCurveNodeChildren),
            makeBinaryNode7400("AnimationCurve", [ 827, "AnimCurve::BoneBScaleX", "" ], [
                makeBinaryNode7400("KeyTime", [ new Float64Array([ 0, FBX_TICKS_PER_SECOND ]) ]),
                makeBinaryNode7400("KeyValueFloat", [ new Float64Array(scaleXValues) ])
            ])
        );
    }

    if (options.bindPose)
    {
        objects.push(makeBinaryNode7400("Pose", [ 1000, "Pose::BindPose", "BindPose" ], [
            makeBinaryNode7400("Type", [ "BindPose" ]),
            makeBinaryNode7400("NbPoseNodes", [ 2 ]),
            makeBinaryNode7400("PoseNode", [], [
                makeBinaryNode7400("Node", [ 900 ]),
                makeBinaryNode7400("Matrix", [ new Float64Array([
                    1, 0, 0, 3,
                    0, 1, 0, 0,
                    0, 0, 1, 0,
                    0, 0, 0, 1
                ]) ])
            ]),
            makeBinaryNode7400("PoseNode", [], [
                makeBinaryNode7400("Node", [ 901 ]),
                makeBinaryNode7400("Matrix", [ new Float64Array([
                    1, 0, 0, 3,
                    0, 1, 0, 4,
                    0, 0, 1, 0,
                    0, 0, 0, 1
                ]) ])
            ])
        ]));
    }

    const connections = [
        makeBinaryNode7400("C", [ "OO", 123, 456 ]),
        makeBinaryNode7400("C", [ "OO", 901, 900 ]),
        makeBinaryNode7400("C", [ "OO", 800, 123 ]),
        makeBinaryNode7400("C", [ "OO", 801, 800 ]),
        makeBinaryNode7400("C", [ "OO", 802, 800 ]),
        makeBinaryNode7400("C", [ "OO", 900, 801 ]),
        makeBinaryNode7400("C", [ "OO", 901, 802 ])
    ];

    if (options.unusableCluster)
    {
        connections.push(makeBinaryNode7400("C", [ "OO", 803, 800 ]));
    }

    if (options.animation)
    {
        connections.push(
            makeBinaryNode7400("C", [ "OO", 821, 820 ]),
            makeBinaryNode7400("C", [ "OO", 822, 821 ]),
            makeBinaryNode7400("C", [ "OP", 822, 901, "Lcl Translation" ]),
            makeBinaryNode7400("C", [ "OP", 823, 822, "d|Y" ]),
            makeBinaryNode7400("C", [ "OO", 824, 821 ]),
            makeBinaryNode7400("C", [ "OP", 824, 901, "Lcl Rotation" ]),
            makeBinaryNode7400("C", [ "OP", 825, 824, "d|Z" ]),
            makeBinaryNode7400("C", [ "OO", 826, 821 ]),
            makeBinaryNode7400("C", [ "OP", 826, 901, "Lcl Scaling" ]),
            makeBinaryNode7400("C", [ "OP", 827, 826, "d|X" ])
        );
    }

    if (options.rootMorphAnimation)
    {
        connections.push(
            makeBinaryNode7400("C", [ "OO", 810, 123 ]),
            makeBinaryNode7400("C", [ "OO", 811, 810 ]),
            makeBinaryNode7400("C", [ "OO", 812, 811 ]),
            makeBinaryNode7400("C", [ "OO", 841, 840 ]),
            makeBinaryNode7400("C", [ "OO", 842, 841 ]),
            makeBinaryNode7400("C", [ "OP", 842, 900, "Smile" ]),
            makeBinaryNode7400("C", [ "OP", 843, 842, "d|X" ])
        );
    }

    return makeBinaryFBX(7400, [
        makeBinaryNode7400("Objects", [], objects),
        makeBinaryNode7400("Connections", [], connections)
    ]);
}

function makeBinaryFBX(version, nodes = [])
{
    const signature = "Kaydara FBX Binary  \u0000\u001a\u0000";
    const nodeBytes = [];
    let offset = 27;
    for (const node of nodes)
    {
        const bytes = buildBinaryNode7400(node, offset);
        nodeBytes.push(bytes);
        offset += bytes.byteLength;
    }

    const bytes = new Uint8Array(offset + 13);
    for (let i = 0; i < signature.length; i++)
    {
        bytes[i] = signature.charCodeAt(i);
    }
    bytes[23] = version & 0xff;
    bytes[24] = (version >>> 8) & 0xff;
    bytes[25] = (version >>> 16) & 0xff;
    bytes[26] = (version >>> 24) & 0xff;

    offset = 27;
    for (const node of nodeBytes)
    {
        bytes.set(node, offset);
        offset += node.byteLength;
    }
    return bytes;
}

function makeBinaryNode7400(name, properties = [], children = [])
{
    return { name, properties, children };
}

function buildBinaryNode7400(node, absoluteOffset)
{
    const nameBytes = new TextEncoder().encode(node.name);
    const propertyBytes = node.properties.map(makeBinaryProperty);
    const propertyLength = propertyBytes.reduce((total, value) => total + value.byteLength, 0);
    const childBytes = [];
    let cursor = absoluteOffset + 13 + nameBytes.byteLength + propertyLength;
    for (const child of node.children)
    {
        const bytes = buildBinaryNode7400(child, cursor);
        childBytes.push(bytes);
        cursor += bytes.byteLength;
    }

    const sentinelLength = node.children.length ? 13 : 0;
    const endOffset = cursor + sentinelLength;
    const bytes = new Uint8Array(endOffset - absoluteOffset);

    writeU32LE(bytes, 0, endOffset);
    writeU32LE(bytes, 4, node.properties.length);
    writeU32LE(bytes, 8, propertyLength);
    bytes[12] = nameBytes.byteLength;
    bytes.set(nameBytes, 13);

    let offset = 13 + nameBytes.byteLength;
    for (const property of propertyBytes)
    {
        bytes.set(property, offset);
        offset += property.byteLength;
    }
    for (const child of childBytes)
    {
        bytes.set(child, offset);
        offset += child.byteLength;
    }

    return bytes;
}

function makeBinaryProperty(value)
{
    if (value && value.syntheticUnknownProperty)
    {
        const bytes = new Uint8Array(1);
        bytes[0] = value.type.charCodeAt(0);
        return bytes;
    }

    if (value && value.syntheticCompressedArray)
    {
        const bytes = new Uint8Array(13 + value.bytes.byteLength);
        bytes[0] = value.type.charCodeAt(0);
        writeU32LE(bytes, 1, value.length);
        writeU32LE(bytes, 5, 1);
        writeU32LE(bytes, 9, value.bytes.byteLength);
        bytes.set(value.bytes, 13);
        return bytes;
    }

    if (value && value.syntheticInt64Property)
    {
        const bytes = new Uint8Array(9);
        bytes[0] = "L".charCodeAt(0);
        writeI64LE(bytes, 1, value.value);
        return bytes;
    }

    if (typeof value === "number" && Number.isInteger(value))
    {
        const bytes = new Uint8Array(5);
        bytes[0] = "I".charCodeAt(0);
        writeI32LE(bytes, 1, value);
        return bytes;
    }

    if (typeof value === "string")
    {
        const text = new TextEncoder().encode(value);
        const bytes = new Uint8Array(5 + text.byteLength);
        bytes[0] = "S".charCodeAt(0);
        writeU32LE(bytes, 1, text.byteLength);
        bytes.set(text, 5);
        return bytes;
    }

    if (value instanceof Float64Array)
    {
        const bytes = new Uint8Array(13 + value.length * 8);
        bytes[0] = "d".charCodeAt(0);
        writeU32LE(bytes, 1, value.length);
        writeU32LE(bytes, 5, 0);
        writeU32LE(bytes, 9, value.length * 8);
        const view = new DataView(bytes.buffer);
        for (let i = 0; i < value.length; i++)
        {
            view.setFloat64(13 + i * 8, value[i], true);
        }
        return bytes;
    }

    if (value instanceof Int32Array)
    {
        const bytes = new Uint8Array(13 + value.length * 4);
        bytes[0] = "i".charCodeAt(0);
        writeU32LE(bytes, 1, value.length);
        writeU32LE(bytes, 5, 0);
        writeU32LE(bytes, 9, value.length * 4);
        for (let i = 0; i < value.length; i++)
        {
            writeI32LE(bytes, 13 + i * 4, value[i]);
        }
        return bytes;
    }

    throw new TypeError("Unsupported synthetic FBX property");
}

function makeCompressedArrayProperty(type, values)
{
    const source = makeBinaryProperty(values).slice(13);

    return {
        syntheticCompressedArray: true,
        type,
        length: values.length,
        bytes: deflateSync(source)
    };
}

function makeInt64(value)
{
    return {
        syntheticInt64Property: true,
        value
    };
}

function makeUnknownProperty(type)
{
    return {
        syntheticUnknownProperty: true,
        type
    };
}

function writeU32LE(bytes, offset, value)
{
    bytes[offset] = value & 0xff;
    bytes[offset + 1] = (value >>> 8) & 0xff;
    bytes[offset + 2] = (value >>> 16) & 0xff;
    bytes[offset + 3] = (value >>> 24) & 0xff;
}

function writeI32LE(bytes, offset, value)
{
    writeU32LE(bytes, offset, value >>> 0);
}

function writeI64LE(bytes, offset, value)
{
    const
        sign = value < 0 ? -1 : 1,
        absolute = Math.abs(value),
        low = absolute % 0x100000000,
        high = Math.floor(absolute / 0x100000000);

    if (sign < 0)
    {
        throw new RangeError("Synthetic FBX int64 helper only supports non-negative values");
    }
    writeU32LE(bytes, offset, low);
    writeU32LE(bytes, offset + 4, high);
}
