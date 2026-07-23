// Validates the opt-in options.classes node-hydration feature: emitJson
// should instantiate and populate caller-supplied classes instead of plain
// object literals, but only for node keys with a registered constructor.

import { test } from "node:test";
import assert from "node:assert/strict";

import CjsGr2Format, { CjsFormatGr2, CjsFormatGr2 as NamedCjsFormatGr2 } from "../../../src/formats/gr2/index.js";
import { CLASS_KEYS, emitJson } from "../../../src/formats/gr2/core/json.js";

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
class Curve extends TestModel {}

const CLASSES = {
    Root, Mesh, BoneBinding, IndexGroup, MorphTarget, Model, Skeleton, Bone,
    Animation, TrackGroup, TransformTrack, Curve
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
        ParentIndex: 255,
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
            texcoord0 = true,
            indices = true,
            morphTargets = false
        } = options,
        vertices = [
            {},
            {},
            {}
        ],
        members = [],
        addMember = (name, arrayWidth) => members.push({ name, arrayWidth, type: 10 });

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
        MorphTargets: morphTargets
            ? [ {
                ScalarName: "Smile",
                DataIsDeltas: 0,
                VertexData: {
                    Vertices: withVertexType([
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
        "MorphTarget", "Model", "Root", "Skeleton", "TrackGroup", "TransformTrack"
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
    assert.equal(bone.parentIndex, 255);
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

test("CjsFormatGr2 exposes the static package constants and helper namespaces", () =>
{
    assert.equal(CjsFormatGr2.OUTPUT_JSON, "json");
    assert.equal(CjsFormatGr2.OUTPUT_GR2, "gr2");
    assert.equal(CjsFormatGr2.OUTPUT_GR2_JSON, "gr2Json");
    assert.equal(CjsFormatGr2.OUTPUT_CMF, "cmf");
    assert.equal(CjsFormatGr2.OUTPUT_RAW, "raw");
    for (const key of CLASS_KEYS) assert.ok(CjsFormatGr2.CLASS_KEYS.includes(key));
    assert.ok(CjsFormatGr2.CLASS_KEYS.includes("VertexElement"));
    assert.deepEqual(CjsFormatGr2.outputTypes, [ "gr2", "cmf" ]);
    assert.deepEqual(CjsFormatGr2.debugOutputTypes, [ "json", "gr2Json", "raw" ]);
    assert.equal(typeof CjsFormatGr2.curves.decode, "function");
    assert.equal(typeof CjsFormatGr2.tangents.unpack, "function");
});

test("formats/gr2 subpath exports the runtime class and the migrated engine", async () =>
{
    const mod = await import("../../../src/formats/gr2/index.js");

    assert.deepEqual(Object.keys(mod).sort(), [ "CjsFormatGr2", "CjsGr2Format", "default" ]);
    assert.equal(mod.default, CjsGr2Format);
    assert.equal(mod.CjsGr2Format, CjsGr2Format);
    assert.equal(mod.CjsFormatGr2, CjsFormatGr2);
    assert.equal(NamedCjsFormatGr2, CjsFormatGr2);
    assert.equal(Object.getPrototypeOf(CjsGr2Format), CjsFormatGr2);
});

test("curves module exports decoded curve helpers", async () =>
{
    const mod = await import("../../../src/formats/gr2/core/curves.js");

    assert.equal(typeof mod.decodeCurve, "function");
    assert.equal(typeof mod.sampleDecodedCurve, "function");
});

test("CjsFormatGr2 static read builds json from raw results", () =>
{
    const
        raw = buildRaw(),
        fromRead = CjsFormatGr2.read(raw);

    assert.equal(fromRead.grannyFileFormatRevision, 7);
    assert.equal(fromRead.grannyFileSource, "test.gr2");
    assert.equal(fromRead.meshes[0].name, "TestMesh");
    assert.equal(CjsFormatGr2.buildJson, undefined);
    assert.equal(CjsFormatGr2.construct, undefined);
    assert.throws(
        () => CjsFormatGr2.read(raw, { emit: "gr2_json" }),
        /unknown emit value/
    );
});

test("CjsFormatGr2 static read hydrates registered node classes", () =>
{
    const raw = buildRaw();

    const
        constructed = CjsFormatGr2.read(raw, { classes: { Root, Mesh } });

    assert.ok(constructed instanceof Root);
    assert.ok(constructed.meshes[0] instanceof Mesh);
});

test("CjsFormatGr2 static read emits explicit GR2 and CMF class targets", () =>
{
    class CmfRoot extends TestModel {}
    class CmfMesh extends TestModel {}

    const raw = buildRaw();

    assert.throws(
        () => CjsFormatGr2.read(raw, { emit: "cmf" }),
        /requires explicit classes/
    );

    const gr2 = CjsFormatGr2.read(raw, {
        emit: "gr2",
        classes: { Root, Mesh }
    });
    assert.ok(gr2 instanceof Root);
    assert.ok(gr2.meshes[0] instanceof Mesh);

    const cmf = CjsFormatGr2.read(raw, {
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
    assert.equal(cmf.version, 1);
});

test("CjsFormatGr2 CMF target preserves morph target payloads", () =>
{
    class CmfRoot extends TestModel {}
    class CmfMesh extends TestModel {}

    const cmf = CjsFormatGr2.read(buildGeometryRaw({ morphTargets: true }), {
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

test("CjsFormatGr2 instances expose only the PascalCase public profile API", () =>
{
    assert.deepEqual(Object.getOwnPropertyNames(CjsFormatGr2.prototype).sort(), [
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
        "constructor"
    ].sort());

    assert.equal(typeof CjsFormatGr2.read, "function");
    assert.equal(typeof CjsFormatGr2.Read, "undefined");
    assert.equal(typeof CjsFormatGr2.inspect, "function");
    assert.equal(typeof CjsFormatGr2.Inspect, "undefined");
});

test("CjsFormatGr2 instances carry reusable values and classes", () =>
{
    const reader = new CjsFormatGr2({
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
    assert.equal(reader.Read(buildRaw(), { emit: CjsFormatGr2.OUTPUT_RAW }).version, 7);
    assert.equal(reader.GetValues({ emit: CjsFormatGr2.OUTPUT_RAW }).emit, CjsFormatGr2.OUTPUT_RAW);
    assert.equal(reader.GetValues().emit, CjsFormatGr2.OUTPUT_JSON);
});

test("unpackTangents accepts per-mesh rule functions", () =>
{
    let seen = null;

    const reader = new CjsFormatGr2({
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
        () => new CjsFormatGr2({ unpackTangents: () => "yes" }).Read(buildRaw()),
        /must return true or false/
    );
    assert.throws(
        () => new CjsFormatGr2({ unpackTangents: "yes" }).Read(buildRaw()),
        /must be true, false, or a function/
    );
});

test("static read uses the class as rule context without creating a profile", () =>
{
    let seen = null;

    CjsFormatGr2.read(buildRaw(), {
        unpackTangents: context =>
        {
            seen = context;
            return false;
        }
    });

    assert.equal(seen.reader, CjsFormatGr2);
});

test("CjsFormatGr2 rebuilds missing normals, tangents, and binormals when configured", () =>
{
    const seen = [];
    const json = CjsFormatGr2.read(buildGeometryRaw(), {
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

test("CjsFormatGr2 throws when missing rebuild requirements are unavailable", () =>
{
    assert.throws(
        () => CjsFormatGr2.read(buildGeometryRaw({ positions: false }), { rebuildMissingNormals: true }),
        /rebuildMissingNormals requires mesh\.vertex\.position/
    );

    assert.throws(
        () => CjsFormatGr2.read(buildGeometryRaw(), { rebuildMissingTangents: true }),
        /rebuildMissingTangents requires mesh\.vertex\.normal/
    );

    assert.throws(
        () => CjsFormatGr2.read(buildGeometryRaw({ normals: true, texcoord0: false }), { rebuildMissingTangents: true }),
        /rebuildMissingTangents requires mesh\.vertex\.texcoord0/
    );

    assert.throws(
        () => CjsFormatGr2.read(buildGeometryRaw({ normals: true }), { rebuildMissingBiNormals: true }),
        /rebuildMissingBiNormals requires mesh\.vertex\.tangent/
    );

    assert.throws(
        () => CjsFormatGr2.read(buildGeometryRaw(), { rebuildMissingNormals: () => "yes" }),
        /rebuildMissingNormals rule must return true or false/
    );

    assert.throws(
        () => CjsFormatGr2.read(buildGeometryRaw(), { rebuildMissingNormals: "yes" }),
        /rebuildMissingNormals option must be true, false, or a function/
    );
});

test("CjsFormatGr2.inspect returns stable metadata and counts", () =>
{
    const summary = CjsFormatGr2.inspect(buildRaw());

    assert.deepEqual(summary, {
        reader: "CjsFormatGr2",
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

    assert.deepEqual(CjsFormatGr2.inspect(buildRaw()), summary);
});

test("CjsFormatGr2.toJSON returns JSON-compatible data", () =>
{
    const
        json = CjsFormatGr2.read(buildRaw()),
        plain = CjsFormatGr2.toJSON(json),
        readerPlain = new CjsFormatGr2().ToJSON(json);

    assert.deepEqual(plain, readerPlain);
    assert.deepEqual(plain, JSON.parse(JSON.stringify(plain)));
    assert.equal(plain.grannyFileFormatRevision, 7);
    assert.equal(plain.grannyFileSource, "test.gr2");
    assert.throws(() =>
    {
        const circular = {};
        circular.self = circular;
        CjsFormatGr2.toJSON(circular);
    }, /cannot convert circular data/);
});
