// Validates the opt-in options.classes node-hydration feature: emitJson
// should instantiate and populate caller-supplied classes instead of plain
// object literals, but only for node keys with a registered constructor.

import { test } from "node:test";
import assert from "node:assert/strict";

import CjsGr2Format, { CjsGr2Format as NamedCjsGr2Format } from "../../../../../src/resource/formats/gr2/index.js";
import { buildCmfFromRaw } from "../../../../../src/resource/formats/gr2/core/targets.js";
import { decompressAnimationCurves } from "../../../../../src/resource/formats/gr2/core/curves.js";
import { CLASS_KEYS, emitJson } from "../../../../../src/resource/formats/gr2/core/json.js";

class TestModel
{
    SetValues(values)
    {
        Object.assign(this, values);
        return this;
    }
}

class Root extends TestModel {}
class Mesh extends TestModel {}
class BoneBinding extends TestModel {}
class IndexGroup extends TestModel {}
class MorphTarget extends TestModel {}
class Model extends TestModel {}
class Skeleton extends TestModel {}
class Bone extends TestModel {}
class Animation extends TestModel {}
class TrackGroup extends TestModel {}
class TransformTrack extends TestModel {}
class VectorTrack extends TestModel {}
class Curve extends TestModel {}

const CLASSES = {
    Root, Mesh, BoneBinding, IndexGroup, MorphTarget, Model, Skeleton, Bone,
    Animation, TrackGroup, TransformTrack, VectorTrack, Curve
};

function buildFileInfo()
{
    const mesh = {
        Name: "TestMesh",
        BoneBindings: [ { BoneName: "root", OBBMin: [ 0, 0, 0 ], OBBMax: [ 1, 1, 1 ] } ],
        PrimaryVertexData: null,
        MorphTargets: [ {
            ScalarName: "SmileShape",
            DataIsDeltas: 1,
            VertexData: null
        } ],
        PrimaryTopology: {
            Indices: [ 0, 1, 2 ],
            Groups: [ { MaterialIndex: 0, TriCount: 1, TriFirst: 0 } ]
        }
    };

    const bone = {
        Name: "root",
        ParentIndex: -1,
        LocalTransform: {
            flags: 7,
            position: [ 1, 2, 3 ],
            orientation: [ 0, 0, 0, 1 ],
            scaleShear: [ 1, 0, 0, 0, 1, 0, 0, 0, 1 ]
        }
    };

    const model = {
        Name: "TestModel",
        Skeleton: { Name: "Skel", Bones: [ bone ] },
        MeshBindings: [ { Mesh: mesh } ]
    };

    const animation = {
        Name: "anim1",
        Duration: 1.5,
        TimeStep: 0.033,
        Oversampling: 1,
        DefaultLoopCount: 0,
        Flags: 0,
        TrackGroups: [ {
            Name: "tg1",
            TransformTracks: [ {
                Name: "root",
                Flags: 0,
                OrientationCurve: null,
                PositionCurve: null,
                ScaleShearCurve: null
            } ],
            VectorTracks: [ {
                Name: "Blink",
                Dimension: 1,
                ValueCurve: {
                    CurveData: {
                        CurveDataHeaderDaConstant32f: { Format: 3, Degree: 0 },
                        Controls: [ 0.375 ]
                    }
                }
            } ]
        } ]
    };

    return {
        FromFileName: "test.gr2",
        Meshes: [ mesh ],
        Models: [ model ],
        Animations: [ animation ],
        Materials: [],
        Textures: []
    };
}

function buildRaw()
{
    return { version: 7, secCount: 3, fileInfo: buildFileInfo() };
}

test("projects non-finite transform controls to typed identities", () =>
{
    const fileInfo = buildFileInfo();
    fileInfo.Meshes = [];
    fileInfo.Models[0].MeshBindings = [];
    fileInfo.Models[0].Skeleton.Bones[0].LocalTransform = {
        flags: 7,
        position: new Array(3).fill(Number.NaN),
        orientation: new Array(4).fill(Number.NaN),
        scaleShear: new Array(9).fill(Number.NaN)
    };
    fileInfo.Animations[0].TrackGroups[0].VectorTracks = [];
    const track = fileInfo.Animations[0].TrackGroups[0].TransformTracks[0];
    const curve = (controls) => ({
        CurveData: {
            CurveDataHeaderDaK32fC32f: { Format: 1, Degree: 1 },
            Knots: [ 0, 1 ],
            Controls: controls
        }
    });
    track.PositionCurve = curve(new Array(6).fill(Number.NaN));
    track.OrientationCurve = curve(new Array(8).fill(Number.NaN));
    track.ScaleShearCurve = curve(new Array(18).fill(Number.NaN));

    const json = emitJson(fileInfo, 7);
    const emitted = json.animations[0].trackGroups[0].transformTracks[0];
    const bone = json.models[0].skeleton.bones[0];
    assert.deepEqual(bone.position, [ 0, 0, 0 ]);
    assert.deepEqual(bone.orientation, [ 0, 0, 0, 1 ]);
    assert.deepEqual(bone.scaleShear, [ 1, 0, 0, 0, 1, 0, 0, 0, 1 ]);
    assert.deepEqual(emitted.position.controls, [ 0, 0, 0, 0, 0, 0 ]);
    assert.deepEqual(emitted.orientation.controls, [ 0, 0, 0, 1, 0, 0, 0, 1 ]);
    assert.deepEqual(emitted.scaleShear.controls, [
        1, 0, 0, 0, 1, 0, 0, 0, 1,
        1, 0, 0, 0, 1, 0, 0, 0, 1
    ]);

    const cmf = buildCmfFromRaw({ fileInfo, version: 7 });
    assert.equal(cmf.skeletons.length, 1);
    assert.equal(cmf.animations.length, 1);
    assert.equal(cmf.animations[0].channels.length, 3);
});

function withVertexType(vertices, members)
{
    Object.defineProperty(vertices, "__type", { value: members, configurable: true });
    return vertices;
}

function buildGeometryRaw(options = {})
{
    const
        {
            positions = true,
            normals = false,
            packedTangents = false,
            texcoord0 = true,
            indices = true,
            morphTargets = false,
            packedMorphTangents = false
        } = options,
        vertices = [
            {},
            {},
            {}
        ],
        members = [],
        addMember = (name, arrayWidth, type = 10) => members.push({ name, arrayWidth, type });

    if (positions)
    {
        vertices[0].Position = [ 0, 0, 0 ];
        vertices[1].Position = [ 1, 0, 0 ];
        vertices[2].Position = [ 0, 1, 0 ];
        addMember("Position", 3);
    }

    if (normals)
    {
        vertices[0].Normal = [ 0, 0, 1 ];
        vertices[1].Normal = [ 0, 0, 1 ];
        vertices[2].Normal = [ 0, 0, 1 ];
        addMember("Normal", 3);
    }

    if (packedTangents)
    {
        vertices[0].Tangent = [ 0, 0, 0, 255 ];
        vertices[1].Tangent = [ 0, 0, 0, 255 ];
        vertices[2].Tangent = [ 0, 0, 0, 255 ];
        addMember("Tangent", 4, 14);
    }

    if (texcoord0)
    {
        vertices[0].TextureCoordinates0 = [ 0, 0 ];
        vertices[1].TextureCoordinates0 = [ 1, 0 ];
        vertices[2].TextureCoordinates0 = [ 0, 1 ];
        addMember("TextureCoordinates0", 2);
    }

    const mesh = {
        Name: "TriMesh",
        BoneBindings: [],
        PrimaryVertexData: {
            Vertices: withVertexType(vertices, members)
        },
        MorphTargets: morphTargets || packedMorphTangents
            ? [ {
                ScalarName: "Smile",
                DataIsDeltas: 0,
                VertexData: {
                    Vertices: packedMorphTangents
                        ? withVertexType([
                            { Tangent: [ 0, 0, 0, 255 ] },
                            { Tangent: [ 0, 0, 0, 255 ] },
                            { Tangent: [ 0, 0, 0, 255 ] }
                        ], [ { name: "Tangent", arrayWidth: 4, type: 14 } ])
                        : withVertexType([
                            { Position: [ 0, 0, 0 ] },
                            { Position: [ 1, 0, 1 ] },
                            { Position: [ 0, 1, 0 ] }
                        ], [ { name: "Position", arrayWidth: 3, type: 10 } ])
                }
            } ]
            : [],
        PrimaryTopology: indices
            ? { Indices: [ 0, 1, 2 ], Groups: [ { MaterialIndex: 0, TriCount: 1, TriFirst: 0 } ] }
            : { Indices: [], Groups: [] }
    };

    return {
        version: 7,
        secCount: 3,
        fileInfo: {
            FromFileName: "geometry.gr2",
            Meshes: [ mesh ],
            Models: [],
            Animations: [],
            Materials: [],
            Textures: []
        }
    };
}

function rounded(values)
{
    return Array.from(values, v => Math.round(v * 1000000) / 1000000);
}

test("CLASS_KEYS lists the recognized node keys", () =>
{
    assert.deepEqual([ ...CLASS_KEYS ].sort(), [
        "Animation", "Bone", "BoneBinding", "Curve", "IndexGroup", "Mesh",
        "MorphTarget", "Model", "Root", "Skeleton", "TrackGroup", "TransformTrack", "VectorTrack"
    ].sort());
});

test("emitJson without options.classes returns plain objects (default, unchanged)", () =>
{
    const json = emitJson(buildFileInfo(), 7);
    assert.equal(json.constructor, Object);
    assert.equal(json.meshes[0].constructor, Object);
    assert.equal(json.meshes[0].morphTargets[0].constructor, Object);
    assert.equal(json.meshes[0].morphTargets[0].name, "SmileShape");
    assert.equal(json.meshes[0].morphTargets[0].dataIsDeltas, true);
    assert.equal(json.models[0].constructor, Object);
    assert.equal(json.models[0].skeleton.bones[0].constructor, Object);
    assert.equal(json.animations[0].constructor, Object);
});

test("emitJson preserves shared reflected skeleton identity across models", () =>
{
    const fileInfo = buildFileInfo();
    fileInfo.Models.push({
        Name: "SecondModel",
        Skeleton: fileInfo.Models[0].Skeleton,
        MeshBindings: []
    });

    const json = emitJson(fileInfo, 7);
    assert.equal(json.models[0].skeleton, json.models[1].skeleton);
});

test("emitJson with options.classes hydrates registered node types", () =>
{
    const json = emitJson(buildFileInfo(), 7, { classes: CLASSES });

    assert.ok(json instanceof Root);
    assert.equal(json.grannyFileFormatRevision, 7);
    assert.equal(json.grannyFileSource, "test.gr2");

    const mesh = json.meshes[0];
    assert.ok(mesh instanceof Mesh);
    assert.equal(mesh.name, "TestMesh");
    assert.ok(mesh.boneBindings[0] instanceof BoneBinding);
    assert.equal(mesh.boneBindings[0].name, "root");
    assert.ok(mesh.indices[0] instanceof IndexGroup);
    assert.equal(mesh.indices[0].name, "area_0");
    assert.deepEqual(mesh.indices[0].faces, [ 0, 1, 2 ]);
    assert.ok(mesh.morphTargets[0] instanceof MorphTarget);
    assert.equal(mesh.morphTargets[0].name, "SmileShape");
    assert.equal(mesh.morphTargets[0].dataIsDeltas, true);
    assert.deepEqual(mesh.morphTargets[0].vertex.position, []);

    const model = json.models[0];
    assert.ok(model instanceof Model);
    assert.equal(model.name, "TestModel");
    assert.deepEqual(model.meshBindings, [ 0 ]);

    const skeleton = model.skeleton;
    assert.ok(skeleton instanceof Skeleton);
    assert.equal(skeleton.name, "Skel");

    const bone = skeleton.bones[0];
    assert.ok(bone instanceof Bone);
    assert.equal(bone.name, "root");
    assert.equal(bone.parentIndex, -1);
    assert.deepEqual(bone.position, [ 1, 2, 3 ]);

    const animation = json.animations[0];
    assert.ok(animation instanceof Animation);
    assert.equal(animation.name, "anim1");
    assert.equal(animation.duration, 1.5);

    const trackGroup = animation.trackGroups[0];
    assert.ok(trackGroup instanceof TrackGroup);
    assert.equal(trackGroup.name, "tg1");

    const track = trackGroup.transformTracks[0];
    assert.ok(track instanceof TransformTrack);
    assert.equal(track.name, "root");
    assert.ok(track.orientation instanceof Curve);
    assert.equal(track.orientation.error, "no curve data");
    assert.ok(track.position instanceof Curve);
    assert.ok(track.scaleShear instanceof Curve);

    const vectorTrack = trackGroup.vectorTracks[0];
    assert.ok(vectorTrack instanceof VectorTrack);
    assert.equal(vectorTrack.name, "Blink");
    assert.equal(vectorTrack.dimension, 1);
    assert.ok(vectorTrack.valueCurve instanceof Curve);
    assert.deepEqual(vectorTrack.valueCurve.controls, [ 0.375 ]);
    decompressAnimationCurves(json);
    assert.deepEqual(vectorTrack.valueCurve.knots, [ 0 ]);
    assert.equal(vectorTrack.valueCurve.dimension, 1);
});

test("emitJson with a partial classes map only hydrates the given keys", () =>
{
    const json = emitJson(buildFileInfo(), 7, { classes: { Mesh, Bone } });

    assert.equal(json.constructor, Object);
    assert.ok(json.meshes[0] instanceof Mesh);
    assert.equal(json.meshes[0].boneBindings[0].constructor, Object);
    assert.ok(json.models[0].skeleton.bones[0] instanceof Bone);
    assert.equal(json.models[0].constructor, Object);
    assert.equal(json.models[0].skeleton.constructor, Object);
});

test("emitJson requires registered classes to implement SetValues", () =>
{
    class BareMesh {}

    assert.throws(
        () => emitJson(buildFileInfo(), 7, { classes: { Mesh: BareMesh } }),
        /requires classes to implement SetValues/
    );
});

test("CjsGr2Format exposes the static package constants and helper namespaces", () =>
{
    assert.equal(CjsGr2Format.OUTPUT_JSON, "json");
    assert.equal(CjsGr2Format.OUTPUT_GR2, "gr2");
    assert.equal(CjsGr2Format.OUTPUT_GR2_JSON, "gr2Json");
    assert.equal(CjsGr2Format.OUTPUT_CMF, "cmf");
    assert.equal(CjsGr2Format.OUTPUT_RAW, "raw");
    for (const key of CLASS_KEYS) assert.ok(CjsGr2Format.CLASS_KEYS.includes(key));
    assert.ok(CjsGr2Format.CLASS_KEYS.includes("VertexElement"));
    assert.deepEqual(Object.values(CjsGr2Format.outputs).filter(entry => entry.role === "runtime").map(entry => entry.output), [ "gr2", "cmf" ]);
    assert.deepEqual(Object.values(CjsGr2Format.outputs).filter(entry => entry.role === "debug").map(entry => entry.output), [ "json", "gr2Json", "raw" ]);
    assert.equal(typeof CjsGr2Format.curves.decode, "function");
    assert.equal(typeof CjsGr2Format.tangents.unpack, "function");
});

test("formats/gr2 subpath exports the runtime class and the migrated engine", async () =>
{
    const mod = await import("../../../../../src/resource/formats/gr2/index.js");

    // One public class, like every other format: no internal engine class leaks
    // out of the barrel.
    assert.deepEqual(Object.keys(mod).sort(), [ "CjsGr2Format", "default" ]);
    assert.equal(mod.default, CjsGr2Format);
    assert.equal(mod.CjsGr2Format, CjsGr2Format);
    assert.equal(NamedCjsGr2Format, CjsGr2Format);
});

test("curves module exports decoded curve helpers", async () =>
{
    const mod = await import("../../../../../src/resource/formats/gr2/core/curves.js");

    assert.equal(typeof mod.decodeCurve, "function");
    assert.equal(typeof mod.sampleDecodedCurve, "function");
});

test("CjsGr2Format static read builds json from raw results", () =>
{
    const
        raw = buildRaw(),
        fromRead = CjsGr2Format.read(raw);

    assert.equal(fromRead.grannyFileFormatRevision, 7);
    assert.equal(fromRead.grannyFileSource, "test.gr2");
    assert.equal(fromRead.meshes[0].name, "TestMesh");
    assert.equal(CjsGr2Format.buildJson, undefined);
    assert.equal(CjsGr2Format.construct, undefined);
    assert.throws(
        () => CjsGr2Format.read(raw, { emit: "gr2_json" }),
        /unknown emit value/
    );
});

test("CjsGr2Format static read hydrates registered node classes", () =>
{
    const raw = buildRaw();

    const
        constructed = CjsGr2Format.read(raw, { classes: { Root, Mesh } });

    assert.ok(constructed instanceof Root);
    assert.ok(constructed.meshes[0] instanceof Mesh);
});

test("CjsGr2Format static read emits explicit GR2 and CMF class targets", () =>
{
    class CmfRoot extends TestModel {}
    class CmfMesh extends TestModel {}

    const raw = buildRaw();

    assert.throws(
        () => CjsGr2Format.read(raw, { emit: "cmf" }),
        /requires explicit classes/
    );

    const gr2 = CjsGr2Format.read(raw, {
        emit: "gr2",
        classes: { Root, Mesh }
    });
    assert.ok(gr2 instanceof Root);
    assert.ok(gr2.meshes[0] instanceof Mesh);

    const cmf = CjsGr2Format.read(raw, {
        emit: "cmf",
        classes: { Root: CmfRoot, Mesh: CmfMesh }
    });
    assert.ok(cmf instanceof CmfRoot);
    assert.ok(cmf.meshes[0] instanceof CmfMesh);
    assert.deepEqual(cmf.meshes[0].decl, []);
    assert.deepEqual(cmf.meshes[0].boneBindings, [
        { name: "root", bounds: { min: [ 0, 0, 0 ], max: [ 1, 1, 1 ] } }
    ]);
    assert.equal(cmf.meshes[0].areas[0].affectedByBones, true);
    assert.equal(cmf.meshes[0].skeleton, 0);
    assert.deepEqual(cmf.skeletons[0].bones, [ "root" ]);
    assert.deepEqual(cmf.skeletons[0].parents, [ 0xffffffff ]);
    assert.equal(cmf.animations[0].name, "anim1");
    assert.deepEqual(cmf.animations[0].channels, [ {
        target: "Blink",
        targetType: "MorphTarget",
        curveIndex: 0
    } ]);
    assert.equal(cmf.version, 1);
});

test("CjsGr2Format CMF target preserves morph target payloads", () =>
{
    class CmfRoot extends TestModel {}
    class CmfMesh extends TestModel {}

    const cmf = CjsGr2Format.read(buildGeometryRaw({ morphTargets: true }), {
        emit: "cmf",
        classes: { Root: CmfRoot, Mesh: CmfMesh }
    });

    const mesh = cmf.meshes[0];

    assert.deepEqual(mesh.morphTargets.decl.map(element => ({
        usage: element.usage,
        type: element.type,
        elementCount: element.elementCount,
        offset: element.offset
    })), [
        { usage: "Position", type: "Float32", elementCount: 3, offset: 0 }
    ]);
    assert.deepEqual(mesh.morphTargets.targets, [
        { name: "Smile", maxDisplacement: 1 }
    ]);
    assert.equal(mesh.areas[0].affectedByMorphTargets, true);
    assert.equal(mesh.lods[0].morphTargets[0].vb.stride, 12);
    assert.deepEqual(mesh.lods[0].morphTargets[0].vertex.position, [
        0, 0, 0,
        0, 0, 1,
        0, 0, 0
    ]);
});

test("CMF emission preserves packed tangents unless GR2 unpacking is explicit", () =>
{
    class CmfRoot extends TestModel {}
    class CmfMesh extends TestModel {}

    const raw = buildGeometryRaw({ packedTangents: true, packedMorphTangents: true });
    const classes = { Root: CmfRoot, Mesh: CmfMesh };
    const preserved = CjsGr2Format.read(raw, { emit: "cmf", classes });
    assert.equal(preserved.meshes[0].decl.some(element => element.usage === "PackedTangentLegacy"), true);
    assert.equal(preserved.meshes[0].decl.some(element => element.usage === "Normal"), false);
    assert.deepEqual(preserved.meshes[0].morphTargets.decl.map(element => element.usage), [ "PackedTangentLegacy" ]);

    const unpacked = CjsGr2Format.read(raw, { emit: "cmf", classes, unpackTangents: true });
    assert.equal(unpacked.meshes[0].decl.some(element => element.usage === "PackedTangentLegacy"), false);
    assert.deepEqual(
        unpacked.meshes[0].decl.filter(element => [ "Normal", "Tangent", "Binormal" ].includes(element.usage))
            .map(element => element.usage),
        [ "Normal", "Tangent", "Binormal" ]
    );
    assert.deepEqual(
        unpacked.meshes[0].morphTargets.decl.map(element => element.usage),
        [ "Normal", "Tangent", "Binormal" ]
    );
});

test("direct CMF emission retains reflected tangent-only x3 widths", () =>
{
    const vertices = withVertexType([
        { Position: [ 0, 0, 0 ], Tangent: [ 1, 0, 0 ] },
        { Position: [ 1, 0, 0 ], Tangent: [ 1, 0, 0 ] }
    ], [
        { name: "Position", arrayWidth: 3, type: 10 },
        { name: "Tangent", arrayWidth: 3, type: 10 }
    ]);
    const morphVertices = withVertexType([
        { Tangent: [ 0, 1, 0 ] },
        { Tangent: [ 0, 1, 0 ] }
    ], [ { name: "Tangent", arrayWidth: 3, type: 10 } ]);
    const raw = {
        version: 7,
        fileInfo: {
            FromFileName: "tangent-x3.gr2",
            Meshes: [ {
                Name: "TangentX3",
                BoneBindings: [],
                PrimaryVertexData: { Vertices: vertices },
                MorphTargets: [ {
                    ScalarName: "Frame",
                    DataIsDeltas: 1,
                    VertexData: { Vertices: morphVertices }
                } ],
                PrimaryTopology: { Indices16: [ 0, 1, 1 ], Groups: [ { MaterialIndex: 0, TriFirst: 0, TriCount: 1 } ] }
            } ],
            Models: [],
            Animations: []
        }
    };

    const cmf = buildCmfFromRaw(raw);
    assert.deepEqual(cmf.meshes[0].decl.map(({ usage, elementCount }) => ({ usage, elementCount })), [
        { usage: "Position", elementCount: 3 },
        { usage: "Tangent", elementCount: 3 }
    ]);
    assert.deepEqual(cmf.meshes[0].morphTargets.decl.map(({ usage, elementCount }) => ({ usage, elementCount })), [
        { usage: "Tangent", elementCount: 3 }
    ]);
});

test("CjsGr2Format instances expose only the PascalCase public profile API", () =>
{
    assert.deepEqual(Object.getOwnPropertyNames(CjsGr2Format.prototype).sort(), [
        "GetClass",
        "GetValues",
        "HasClass",
        "Inspect",
        "InspectGSF",
        "IsGSF",
        "Read",
        "ReadGSF",
        "ReadRaw",
        "SetClass",
        "SetClasses",
        "SetValues",
        "ToJSON",
        "Write",
        "WriteShared",
        "constructor"
    ].sort());

    assert.equal(typeof CjsGr2Format.read, "function");
    assert.equal(typeof CjsGr2Format.Read, "undefined");
    assert.equal(typeof CjsGr2Format.inspect, "function");
    assert.equal(typeof CjsGr2Format.Inspect, "undefined");
});

test("CjsGr2Format instances carry reusable values and classes", () =>
{
    const reader = new CjsGr2Format({
        classes: { Root, Mesh },
        decompressCurves: true,
        unpackTangents: false,
        rebuildMissingNormals: true,
        rebuildMissingTangents: false,
        rebuildMissingBiNormals: false
    })
        .SetClasses({ Bone })
        .SetClass("Animation", Animation);

    const values = reader.GetValues();

    assert.equal(reader.HasClass("Root"), true);
    assert.equal(reader.HasClass("Bone"), true);
    assert.equal(reader.HasClass("Animation"), true);
    assert.equal(reader.GetClass("Mesh"), Mesh);
    assert.equal(reader.GetClass("Bone"), Bone);
    assert.equal(values.decompressCurves, true);
    assert.equal(values.unpackTangents, false);
    assert.equal(values.rebuildMissingNormals, true);
    assert.equal(values.rebuildMissingTangents, false);
    assert.equal(values.rebuildMissingBiNormals, false);

    const constructed = reader.Read(buildRaw(), { rebuildMissingNormals: false });

    assert.ok(constructed instanceof Root);
    assert.ok(constructed.meshes[0] instanceof Mesh);
    assert.equal(reader.Read(buildRaw(), { emit: CjsGr2Format.OUTPUT_RAW }).version, 7);
    assert.equal(reader.GetValues({ emit: CjsGr2Format.OUTPUT_RAW }).emit, CjsGr2Format.OUTPUT_RAW);
    assert.equal(reader.GetValues().emit, CjsGr2Format.OUTPUT_JSON);
});

test("unpackTangents accepts per-mesh rule functions", () =>
{
    let seen = null;

    const reader = new CjsGr2Format({
        unpackTangents: context =>
        {
            seen = context;
            return context.mesh.name === "NeverUnpackThisSyntheticMesh";
        }
    });

    const
        raw = buildRaw(),
        json = reader.Read(raw);

    assert.equal(seen.reader, reader);
    assert.equal(seen.options.unpackTangents, reader.GetValues().unpackTangents);
    assert.equal(seen.raw, raw);
    assert.equal(seen.json, json);
    assert.equal(seen.mesh, json.meshes[0]);
    assert.equal(seen.meshIndex, 0);

    assert.throws(
        () => new CjsGr2Format({ unpackTangents: () => "yes" }).Read(buildRaw()),
        /must return true or false/
    );
    assert.throws(
        () => new CjsGr2Format({ unpackTangents: "yes" }).Read(buildRaw()),
        /must be true, false, or a function/
    );
});

test("static read uses the class as rule context without creating a profile", () =>
{
    let seen = null;

    CjsGr2Format.read(buildRaw(), {
        unpackTangents: context =>
        {
            seen = context;
            return false;
        }
    });

    assert.equal(seen.reader, CjsGr2Format);
});

test("CjsGr2Format rebuilds missing normals, tangents, and binormals when configured", () =>
{
    const seen = [];
    const json = CjsGr2Format.read(buildGeometryRaw(), {
        rebuildMissingNormals: context =>
        {
            seen.push([ context.feature, context.channel, context.mesh.name, context.meshIndex ]);
            return true;
        },
        rebuildMissingTangents: true,
        rebuildMissingBiNormals: true
    });

    const vertex = json.meshes[0].vertex;
    assert.deepEqual(seen, [ [ "rebuildMissingNormals", "normal", "TriMesh", 0 ] ]);
    assert.deepEqual(rounded(vertex.normal), [ 0, 0, 1, 0, 0, 1, 0, 0, 1 ]);
    assert.deepEqual(rounded(vertex.tangent), [ 1, 0, 0, 1, 0, 0, 1, 0, 0 ]);
    assert.deepEqual(rounded(vertex.binormal), [ 0, 1, 0, 0, 1, 0, 0, 1, 0 ]);
});

test("CjsGr2Format throws when missing rebuild requirements are unavailable", () =>
{
    assert.throws(
        () => CjsGr2Format.read(buildGeometryRaw({ positions: false }), { rebuildMissingNormals: true }),
        /rebuildMissingNormals requires mesh\.vertex\.position/
    );

    assert.throws(
        () => CjsGr2Format.read(buildGeometryRaw(), { rebuildMissingTangents: true }),
        /rebuildMissingTangents requires mesh\.vertex\.normal/
    );

    assert.throws(
        () => CjsGr2Format.read(buildGeometryRaw({ normals: true, texcoord0: false }), { rebuildMissingTangents: true }),
        /rebuildMissingTangents requires mesh\.vertex\.texcoord0/
    );

    assert.throws(
        () => CjsGr2Format.read(buildGeometryRaw({ normals: true }), { rebuildMissingBiNormals: true }),
        /rebuildMissingBiNormals requires mesh\.vertex\.tangent/
    );

    assert.throws(
        () => CjsGr2Format.read(buildGeometryRaw(), { rebuildMissingNormals: () => "yes" }),
        /rebuildMissingNormals rule must return true or false/
    );

    assert.throws(
        () => CjsGr2Format.read(buildGeometryRaw(), { rebuildMissingNormals: "yes" }),
        /rebuildMissingNormals option must be true, false, or a function/
    );
});

test("CjsGr2Format.inspect returns stable metadata and counts", () =>
{
    const summary = CjsGr2Format.inspect(buildRaw());

    assert.deepEqual(summary, {
        reader: "CjsGr2Format",
        format: "gr2",
        version: 7,
        sectionCount: 3,
        source: "test.gr2",
        counts: {
            meshes: 1,
            models: 1,
            animations: 1,
            materials: 0,
            textures: 0
        }
    });

    assert.deepEqual(CjsGr2Format.inspect(buildRaw()), summary);
});

test("CjsGr2Format.toJSON returns JSON-compatible data", () =>
{
    const
        json = CjsGr2Format.read(buildRaw()),
        plain = CjsGr2Format.toJSON(json),
        readerPlain = new CjsGr2Format().ToJSON(json);

    assert.deepEqual(plain, readerPlain);
    assert.deepEqual(plain, JSON.parse(JSON.stringify(plain)));
    assert.equal(plain.grannyFileFormatRevision, 7);
    assert.equal(plain.grannyFileSource, "test.gr2");
    assert.throws(() =>
    {
        const circular = {};
        circular.self = circular;
        CjsGr2Format.toJSON(circular);
    }, /cannot convert circular data/);
});
