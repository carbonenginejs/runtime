import assert from "node:assert/strict";
import test from "node:test";

import CjsGltfFormat, { CjsGltfFormat as NamedFormat } from "../../../src/formats/gltf/index.js";

function align4(value)
{
    return (value + 3) & ~3;
}

function bytesOf(view)
{
    return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
}

function buildFixture({ skin = false } = {})
{
    const
        gltf = {
            asset: { version: "2.0", generator: "format-gltf test" },
            buffers: [ { byteLength: 0 } ],
            bufferViews: [],
            accessors: [],
            meshes: [],
            nodes: [],
            scenes: [ { nodes: [] } ],
            scene: 0
        },
        chunks = [];

    let byteOffset = 0;

    function addBufferView(bytes)
    {
        const offset = align4(byteOffset);
        while (byteOffset < offset)
        {
            chunks.push(new Uint8Array([ 0 ]));
            byteOffset++;
        }

        const index = gltf.bufferViews.length;
        gltf.bufferViews.push({ buffer: 0, byteOffset, byteLength: bytes.byteLength });
        chunks.push(bytes);
        byteOffset += bytes.byteLength;
        return index;
    }

    function addAccessor(typed, type, componentType, extras = {})
    {
        const bufferView = addBufferView(bytesOf(typed));
        const width = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[type];
        const index = gltf.accessors.length;
        gltf.accessors.push({
            bufferView,
            componentType,
            count: typed.length / width,
            type,
            ...extras
        });
        return index;
    }

    const
        positions = addAccessor(new Float32Array([
            0, 0, 0,
            1, 0, 0,
            0, 1, 0
        ]), "VEC3", 5126, { min: [ 0, 0, 0 ], max: [ 1, 1, 0 ] }),
        normals = addAccessor(new Float32Array([
            0, 0, 1,
            0, 0, 1,
            0, 0, 1
        ]), "VEC3", 5126),
        tangents = addAccessor(new Float32Array([
            1, 0, 0, 1,
            1, 0, 0, 1,
            1, 0, 0, 1
        ]), "VEC4", 5126),
        texcoords = addAccessor(new Float32Array([
            0, 0,
            1, 0,
            0, 1
        ]), "VEC2", 5126),
        indices = addAccessor(new Uint16Array([ 0, 1, 2 ]), "SCALAR", 5123),
        primitive = {
            attributes: {
                POSITION: positions,
                NORMAL: normals,
                TANGENT: tangents,
                TEXCOORD_0: texcoords
            },
            indices,
            material: 0
        };

    gltf.materials = [ { name: "Hull" } ];

    if (skin)
    {
        primitive.attributes.JOINTS_0 = addAccessor(new Uint16Array([
            0, 1, 0, 0,
            0, 1, 0, 0,
            0, 1, 0, 0
        ]), "VEC4", 5123);
        primitive.attributes.WEIGHTS_0 = addAccessor(new Float32Array([
            1, 0, 0, 0,
            1, 0, 0, 0,
            1, 0, 0, 0
        ]), "VEC4", 5126);
    }

    gltf.meshes.push({
        name: "TriangleMesh",
        primitives: [ primitive ]
    });

    if (skin)
    {
        const
            times = addAccessor(new Float32Array([ 0, 1 ]), "SCALAR", 5126),
            rotations = addAccessor(new Float32Array([
                0, 0, 0, 1,
                0, 0, 0.70710677, 0.70710677
            ]), "VEC4", 5126);

        gltf.nodes.push(
            { name: "Root", children: [ 1 ] },
            { name: "Bone", rotation: [ 0, 0, 0, 1 ] },
            { name: "Ship", mesh: 0, skin: 0 }
        );
        gltf.skins = [ { name: "Rig", joints: [ 0, 1 ], skeleton: 0 } ];
        gltf.animations = [ {
            name: "Turn",
            samplers: [ { input: times, output: rotations, interpolation: "LINEAR" } ],
            channels: [ { sampler: 0, target: { node: 1, path: "rotation" } } ]
        } ];
        gltf.scenes[0].nodes = [ 2 ];
    }
    else
    {
        gltf.nodes.push({ name: "Triangle", mesh: 0 });
        gltf.scenes[0].nodes = [ 0 ];
    }

    gltf.buffers[0].byteLength = byteOffset;

    const buffer = new Uint8Array(byteOffset);
    let offset = 0;
    for (const chunk of chunks)
    {
        buffer.set(chunk, offset);
        offset += chunk.byteLength;
    }

    return { gltf, buffer };
}

function buildGlb(gltf, binary)
{
    const
        jsonText = JSON.stringify(gltf),
        jsonBytes = new TextEncoder().encode(jsonText),
        jsonLength = align4(jsonBytes.byteLength),
        binLength = align4(binary.byteLength),
        totalLength = 12 + 8 + jsonLength + 8 + binLength,
        glb = new Uint8Array(totalLength),
        view = new DataView(glb.buffer);

    view.setUint32(0, 0x46546c67, true);
    view.setUint32(4, 2, true);
    view.setUint32(8, totalLength, true);
    view.setUint32(12, jsonLength, true);
    view.setUint32(16, 0x4e4f534a, true);
    glb.fill(0x20, 20, 20 + jsonLength);
    glb.set(jsonBytes, 20);

    const binHeader = 20 + jsonLength;
    view.setUint32(binHeader, binLength, true);
    view.setUint32(binHeader + 4, 0x004e4942, true);
    glb.set(binary, binHeader + 8);

    return glb;
}

test("default export and named export are the same CjsGltfFormat class", () => {
    assert.equal(CjsGltfFormat, NamedFormat);
    assert.equal(CjsGltfFormat.OUTPUT_JSON, "json");
    assert.equal(CjsGltfFormat.OUTPUT_GLTF_JSON, "gltfJson");
    assert.equal(CjsGltfFormat.OUTPUT_SHARED, "shared");
    assert.equal(CjsGltfFormat.OUTPUT_GR2, "gr2");
    assert.equal(CjsGltfFormat.OUTPUT_CMF, "cmf");
    assert.deepEqual(CjsGltfFormat.outputTypes, [ "shared", "gr2", "cmf" ]);
    assert.deepEqual(CjsGltfFormat.debugOutputTypes, [ "json", "gltfJson" ]);
});

test("reads a glTF object with provided buffers into the shared mesh schema", () => {
    const { gltf, buffer } = buildFixture();
    const json = CjsGltfFormat.read(gltf, { source: "triangle.gltf", buffers: [ buffer ] });
    const shared = CjsGltfFormat.read(gltf, { emit: "shared", buffers: [ buffer ] });

    assert.equal(json.grannyFileFormatRevision, 0);
    assert.equal(json.grannyFileSource, "triangle.gltf");
    assert.deepEqual(shared.meshes[0].indices, json.meshes[0].indices);
    assert.equal(json.models.length, 0);
    assert.equal(json.animations.length, 0);
    assert.equal(json.meshes.length, 1);

    const mesh = json.meshes[0];
    assert.equal(mesh.name, "Triangle");
    assert.deepEqual(mesh.minBounds, [ 0, 0, 0 ]);
    assert.deepEqual(mesh.maxBounds, [ 1, 1, 0 ]);
    assert.deepEqual(mesh.vertex.position, [
        0, 0, 0,
        1, 0, 0,
        0, 1, 0
    ]);
    assert.deepEqual(mesh.vertex.normal, [
        0, 0, 1,
        0, 0, 1,
        0, 0, 1
    ]);
    assert.deepEqual(mesh.vertex.tangent, [
        1, 0, 0, 1,
        1, 0, 0, 1,
        1, 0, 0, 1
    ]);
    assert.deepEqual(mesh.vertex.texcoord0, [ 0, 0, 1, 0, 0, 1 ]);
    assert.deepEqual(mesh.indices[0], {
        name: "Hull",
        bytesPerIndex: 2,
        faces: [ 0, 1, 2 ]
    });
});

test("reads GLB bytes and inspects the container", () => {
    const { gltf, buffer } = buildFixture();
    const glb = buildGlb(gltf, buffer);

    assert.equal(CjsGltfFormat.isGlb(glb), true);
    assert.equal(CjsGltfFormat.isGltf(glb), true);

    const json = CjsGltfFormat.read(glb, { source: "triangle.glb" });
    assert.equal(json.meshes[0].name, "Triangle");

    const summary = CjsGltfFormat.inspect(glb, { source: "triangle.glb" });
    assert.equal(summary.format, "glb");
    assert.equal(summary.meshCount, 1);
    assert.equal(summary.meshes[0].primitiveCount, 1);
});

test("maps glTF skins and transform animation channels to GR2-shaped models and curves", () => {
    const { gltf, buffer } = buildFixture({ skin: true });
    const json = CjsGltfFormat.read(gltf, { source: "skinned.gltf", buffers: [ buffer ] });

    assert.equal(json.meshes.length, 1);
    assert.deepEqual(json.meshes[0].boneBindings.map(x => x.name), [ "Root", "Bone" ]);
    assert.deepEqual(json.meshes[0].vertex.blendIndice, [
        0, 1, 0, 0,
        0, 1, 0, 0,
        0, 1, 0, 0
    ]);
    assert.deepEqual(json.meshes[0].vertex.blendWeight, [
        1, 0, 0, 0,
        1, 0, 0, 0,
        1, 0, 0, 0
    ]);

    assert.equal(json.models.length, 1);
    assert.equal(json.models[0].name, "Ship");
    assert.deepEqual(json.models[0].meshBindings, [ 0 ]);
    assert.deepEqual(json.models[0].skeleton.bones.map(x => x.name), [ "Root", "Bone" ]);
    assert.equal(json.models[0].skeleton.bones[1].parentIndex, 0);

    assert.equal(json.animations.length, 1);
    assert.equal(json.animations[0].name, "Turn");
    assert.equal(json.animations[0].duration, 1);
    assert.equal(json.animations[0].trackGroups[0].name, "Ship");

    const track = json.animations[0].trackGroups[0].transformTracks[0];
    assert.equal(track.name, "Bone");
    assert.deepEqual(track.orientation.uncompressed.knots, [ 0, 1 ]);
    assert.deepEqual(track.orientation.uncompressed.controls, [
        0, 0, 0, 1,
        0, 0, Math.fround(0.70710677), Math.fround(0.70710677)
    ]);
    assert.equal(track.orientation.uncompressed.dimension, 4);
    assert.equal(track.position.uncompressed.dimension, 3);
    assert.equal(track.scaleShear.uncompressed.dimension, 9);
});

test("hydrates configured node classes", () => {
    const Root = makeValueClass();
    const Mesh = makeValueClass();
    const Model = makeValueClass();
    const Animation = makeValueClass();

    const { gltf, buffer } = buildFixture({ skin: true });
    const format = new CjsGltfFormat({
        buffers: [ buffer ],
        classes: { Root, Mesh }
    });
    format.SetClass("Model", Model);
    format.SetClass("Animation", Animation);

    const json = format.Read(gltf);

    assert.ok(json instanceof Root);
    assert.ok(json.meshes[0] instanceof Mesh);
    assert.ok(json.models[0] instanceof Model);
    assert.ok(json.animations[0] instanceof Animation);
    assert.equal(json.__setValuesCalls, 1);
    assert.equal(json.meshes[0].__setValuesCalls, 1);
    assert.equal(json.models[0].__setValuesCalls, 1);
    assert.equal(json.animations[0].__setValuesCalls, 1);
    assert.equal(format.HasClass("Mesh"), true);
    assert.equal(format.GetClass("Mesh"), Mesh);
});

test("requires SetValues on configured node classes", () => {
    class Root {}

    const { gltf, buffer } = buildFixture();

    assert.throws(
        () => CjsGltfFormat.read(gltf, { buffers: [ buffer ], classes: { Root } }),
        /requires classes to implement SetValues/u
    );
});

test("emits explicit GR2 and CMF class targets", () => {
    const Root = makeValueClass();
    const Mesh = makeValueClass();
    const VertexElement = makeValueClass();

    const { gltf, buffer } = buildFixture();

    assert.throws(
        () => CjsGltfFormat.read(gltf, { emit: "cmf", buffers: [ buffer ] }),
        /requires explicit classes/
    );

    const gr2 = CjsGltfFormat.read(gltf, {
        emit: "gr2",
        buffers: [ buffer ],
        classes: { Root, Mesh }
    });
    assert.ok(gr2 instanceof Root);
    assert.ok(gr2.meshes[0] instanceof Mesh);

    const cmf = CjsGltfFormat.read(gltf, {
        emit: "cmf",
        buffers: [ buffer ],
        classes: { Root, Mesh, VertexElement }
    });
    assert.ok(cmf instanceof Root);
    assert.ok(cmf.meshes[0] instanceof Mesh);
    assert.ok(cmf.meshes[0].decl[0] instanceof VertexElement);
    assert.equal(cmf.version, 1);
});

test("can pack authored glTF tangent frames for GR2-style shader inputs", () => {
    const { gltf, buffer } = buildFixture();
    const json = CjsGltfFormat.read(gltf, {
        buffers: [ buffer ],
        packTangents: true
    });

    const mesh = json.meshes[0];
    assert.deepEqual(mesh.vertex.normal, []);
    assert.deepEqual(mesh.vertex.binormal, []);
    assert.equal(mesh.vertex.tangent.length, 12);
});

function makeValueClass() {
    return class {
        SetValues(values = {}) {
            Object.defineProperty(this, "__setValuesCalls", {
                value: (this.__setValuesCalls || 0) + 1,
                writable: true,
                configurable: true,
                enumerable: false
            });
            for (const [ key, value ] of Object.entries(values)) {
                this[key] = value;
            }
            return this;
        }
    };
}
