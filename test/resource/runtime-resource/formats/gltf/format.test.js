import assert from "node:assert/strict";
import test from "node:test";

import CjsGltfFormat, { CjsGltfFormat as NamedFormat } from "../../../../../src/resource/formats/gltf/index.js";

function align4(value)
{
    return (value + 3) & ~3;
}

function bytesOf(view)
{
    return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
}

function overwriteFloatAccessor(gltf, buffer, accessorIndex, values)
{
    const
        accessor = gltf.accessors[accessorIndex],
        bufferView = gltf.bufferViews[accessor.bufferView],
        width = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[accessor.type],
        view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength),
        byteOffset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);

    for (let index = 0; index < values.length; index++)
    {
        view.setFloat32(byteOffset + index * 4, values[index], true);
    }
    accessor.count = values.length / width;
}

function buildFixture({ skin = false, sharedSkins = false } = {})
{
    const withSkin = skin || sharedSkins;
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

    if (withSkin)
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

    if (withSkin)
    {
        const
            times = addAccessor(new Float32Array([ 0, 1 ]), "SCALAR", 5126),
            rotations = addAccessor(new Float32Array([
                0, 0, 0, 1,
                0, 0, 0.70710677, 0.70710677
            ]), "VEC4", 5126);

        if (sharedSkins)
        {
            const
                inverseA = addAccessor(new Float32Array([
                    1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
                    1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 10, 0, 0, 1
                ]), "MAT4", 5126),
                inverseB = addAccessor(new Float32Array([
                    1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 20, 0, 1
                ]), "MAT4", 5126);

            gltf.asset.generator = "cmfprocessor";
            gltf.nodes.push(
                { name: "Root", children: [ 1, 2 ] },
                { name: "BoneA" },
                { name: "BoneB" },
                { name: "PartA", mesh: 0, skin: 0 },
                { name: "PartB", mesh: 0, skin: 1 }
            );
            gltf.skins = [
                { name: "Rig", joints: [ 0, 1 ], skeleton: 0, inverseBindMatrices: inverseA },
                { name: "Rig", joints: [ 2 ], skeleton: 0, inverseBindMatrices: inverseB }
            ];
            gltf.scenes[0].nodes = [ 0, 3, 4 ];
        }
        else
        {
            gltf.nodes.push(
                { name: "Root", children: [ 1 ] },
                { name: "Bone", rotation: [ 0, 0, 0, 1 ] },
                { name: "Ship", mesh: 0, skin: 0 }
            );
            gltf.skins = [ { name: "Rig", joints: [ 0, 1 ], skeleton: 0 } ];
            gltf.scenes[0].nodes = [ 2 ];
        }
        gltf.animations = [ {
            name: "Turn",
            samplers: [ { input: times, output: rotations, interpolation: "LINEAR" } ],
            channels: [ { sampler: 0, target: { node: sharedSkins ? 2 : 1, path: "rotation" } } ]
        } ];
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
    assert.equal(CjsGltfFormat.Output.JSON, "json");
    assert.equal(CjsGltfFormat.Output.GLTF_JSON, "gltfJson");
    assert.equal(CjsGltfFormat.Output.SHARED, "shared");
    assert.equal(CjsGltfFormat.Output.GR2, "gr2");
    assert.equal(CjsGltfFormat.Output.CMF, "cmf");
    assert.deepEqual(Object.values(CjsGltfFormat.outputs).filter(entry => entry.role === "runtime").map(entry => entry.output), [ "shared", "gr2", "cmf" ]);
    assert.deepEqual(Object.values(CjsGltfFormat.outputs).filter(entry => entry.role === "debug").map(entry => entry.output), [ "json", "gltfJson" ]);
    assert.equal(new CjsGltfFormat().GetValues().emit, "shared");
    assert.equal(Object.values(CjsGltfFormat.outputs).find(entry => entry.default).output, "shared");
});

test("reads a glTF object with provided buffers into the shared mesh schema", () => {
    const { gltf, buffer } = buildFixture();
    const json = CjsGltfFormat.read(gltf, { source: "triangle.gltf", buffers: [ buffer ] });
    const shared = CjsGltfFormat.read(gltf, { emit: "shared", buffers: [ buffer ] });
    const explicitJson = CjsGltfFormat.read(gltf, { emit: "json", buffers: [ buffer ] });

    assert.equal(json.grannyFileFormatRevision, 0);
    assert.equal(json.grannyFileSource, "triangle.gltf");
    assert.deepEqual(shared.meshes[0].indices, json.meshes[0].indices);
    assert.deepEqual(explicitJson.meshes[0].indices, shared.meshes[0].indices);
    assert.notEqual(explicitJson, shared);
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
        1, 0, 0,
        1, 0, 0,
        1, 0, 0
    ]);
    assert.deepEqual(mesh.vertex.binormal, [
        0, 1, 0,
        0, 1, 0,
        0, 1, 0
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
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0
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
    assert.equal(json.animations[0].trackGroups[0].name, "Rig");

    const track = json.animations[0].trackGroups[0].transformTracks[0];
    assert.equal(track.name, "Bone");
    assert.deepEqual(track.orientation.knots, [ 0, 1 ]);
    assert.deepEqual(track.orientation.controls, [
        0, 0, 0, 1,
        0, 0, Math.fround(0.70710677), Math.fround(0.70710677)
    ]);
    assert.equal(track.orientation.dimension, 4);
    assert.equal(track.position, undefined);
    assert.equal(track.scaleShear, undefined);
});

test("shares a full skeleton across Carbon per-mesh skin palettes and maps inverse binds", () =>
{
    const { gltf, buffer } = buildFixture({ sharedSkins: true });
    const shared = CjsGltfFormat.read(gltf, { buffers: [ buffer ] });

    assert.equal(shared.models.length, 2);
    assert.equal(shared.models[0].skeleton, shared.models[1].skeleton);
    assert.deepEqual(shared.models[0].skeleton.bones.map(bone => bone.name), [ "Root", "BoneA", "BoneB" ]);
    assert.deepEqual(shared.meshes.map(mesh => mesh.boneBindings.map(binding => binding.name)), [
        [ "Root", "BoneA" ],
        [ "BoneB" ]
    ]);

    const Root = makeValueClass();
    const Mesh = makeValueClass();
    const cmf = CjsGltfFormat.read(gltf, {
        emit: "cmf",
        buffers: [ buffer ],
        classes: { Root, Mesh }
    });
    assert.equal(cmf.skeletons.length, 1);
    assert.deepEqual(cmf.meshes.map(mesh => mesh.skeleton), [ 0, 0 ]);
    assert.deepEqual(cmf.skeletons[0].invBindTransforms.map(matrix => matrix.slice(12, 15)), [
        [ 0, 0, 0 ],
        [ 10, 0, 0 ],
        [ 0, 20, 0 ]
    ]);
    assert.deepEqual(
        cmf.animations[0].channels.map(({ target, targetType }) => ({ target, targetType })),
        [ { target: "BoneB", targetType: "BoneRotation" } ]
    );
});

test("decomposes rotated skeleton matrices and rejects unrepresentable node transforms", () =>
{
    const rotated = buildFixture({ skin: true });
    delete rotated.gltf.nodes[1].rotation;
    rotated.gltf.nodes[1].matrix = [
        0, 1, 0, 0,
        -1, 0, 0, 0,
        0, 0, 1, 0,
        2, 3, 4, 1
    ];
    const shared = CjsGltfFormat.read(rotated.gltf, { buffers: [ rotated.buffer ] });
    const bone = shared.models[0].skeleton.bones[1];
    assert.deepEqual(bone.position, [ 2, 3, 4 ]);
    assert.ok(Math.abs(bone.orientation[2] - Math.SQRT1_2) < 1e-6);
    assert.ok(Math.abs(bone.orientation[3] - Math.SQRT1_2) < 1e-6);

    const sheared = buildFixture({ skin: true });
    delete sheared.gltf.nodes[1].rotation;
    sheared.gltf.nodes[1].matrix = [
        1, 0, 0, 0,
        0.25, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ];
    assert.throws(
        () => CjsGltfFormat.read(sheared.gltf, { buffers: [ sheared.buffer ] }),
        /sheared node\.matrix/u
    );

    const transformedMesh = buildFixture();
    transformedMesh.gltf.nodes[0].translation = [ 1, 0, 0 ];
    assert.throws(
        () => CjsGltfFormat.read(transformedMesh.gltf, { buffers: [ transformedMesh.buffer ] }),
        /mesh-node transforms must be baked/u
    );
});

test("preserves authored identity animation channels and rejects silent cubic linearization", () =>
{
    const identityFixture = buildFixture({ skin: true });
    const sampler = identityFixture.gltf.animations[0].samplers[0];
    overwriteFloatAccessor(identityFixture.gltf, identityFixture.buffer, sampler.input, [ 1 ]);
    overwriteFloatAccessor(identityFixture.gltf, identityFixture.buffer, sampler.output, [ 0, 0, 0, 1 ]);

    const Root = makeValueClass();
    const cmf = CjsGltfFormat.read(identityFixture.gltf, {
        emit: "cmf",
        buffers: [ identityFixture.buffer ],
        classes: { Root }
    });
    assert.deepEqual(cmf.animations[0].channels.map(channel => channel.targetType), [ "BoneRotation" ]);

    const cubicFixture = buildFixture({ skin: true });
    cubicFixture.gltf.animations[0].samplers[0].interpolation = "CUBICSPLINE";
    assert.throws(
        () => CjsGltfFormat.read(cubicFixture.gltf, { buffers: [ cubicFixture.buffer ] }),
        /CUBICSPLINE rotation animation requires resampling/u
    );
});

test("splits glTF weight animation into CMF scalar morph channels", () =>
{
    const { gltf, buffer } = buildFixture({ skin: true });
    const primitive = gltf.meshes[0].primitives[0];
    primitive.targets = [ { POSITION: primitive.attributes.POSITION } ];
    gltf.meshes[0].extras = { targetNames: [ "SmileShape" ] };
    const animation = gltf.animations[0];
    animation.channels[0] = { sampler: 0, target: { node: 2, path: "weights" } };
    animation.samplers[0].output = animation.samplers[0].input;

    const shared = CjsGltfFormat.read(gltf, { buffers: [ buffer ] });
    assert.equal(shared.animations[0].trackGroups[0].name, "MorphTargets");
    assert.deepEqual(shared.animations[0].trackGroups[0].vectorTracks.map(track => track.name), [ "Smile" ]);
    assert.deepEqual(shared.animations[0].trackGroups[0].vectorTracks[0].valueCurve.controls, [ 0, 1 ]);

    const Root = makeValueClass();
    const cmf = CjsGltfFormat.read(gltf, {
        emit: "cmf",
        buffers: [ buffer ],
        classes: { Root }
    });
    assert.deepEqual(cmf.animations[0].channels.map(({ target, targetType }) => ({ target, targetType })), [
        { target: "Smile", targetType: "MorphTarget" }
    ]);
});

test("imports dynamic UV/color channels and rejects unsupported extra influence sets", () =>
{
    const { gltf, buffer } = buildFixture();
    const attributes = gltf.meshes[0].primitives[0].attributes;
    attributes.TEXCOORD_2 = attributes.TEXCOORD_0;
    attributes.COLOR_0 = attributes.NORMAL;

    const Root = makeValueClass();
    const cmf = CjsGltfFormat.read(gltf, {
        emit: "cmf",
        buffers: [ buffer ],
        classes: { Root }
    });
    assert.deepEqual(cmf.meshes[0].decl.map(({ usage, usageIndex, elementCount }) => ({
        usage,
        usageIndex,
        elementCount
    })), [
        { usage: "Position", usageIndex: 0, elementCount: 3 },
        { usage: "Normal", usageIndex: 0, elementCount: 3 },
        { usage: "Tangent", usageIndex: 0, elementCount: 3 },
        { usage: "Binormal", usageIndex: 0, elementCount: 3 },
        { usage: "TexCoord", usageIndex: 0, elementCount: 2 },
        { usage: "TexCoord", usageIndex: 2, elementCount: 2 },
        { usage: "Color", usageIndex: 0, elementCount: 3 }
    ]);
    assert.equal(cmf.meshes[0].uvDensities.length, 3);
    assert.equal(cmf.meshes[0].uvDensities[1], 0);

    const skinnedFixture = buildFixture({ skin: true });
    const skinnedAttributes = skinnedFixture.gltf.meshes[0].primitives[0].attributes;
    skinnedAttributes.JOINTS_1 = skinnedAttributes.JOINTS_0;
    skinnedAttributes.WEIGHTS_1 = skinnedAttributes.WEIGHTS_0;
    assert.throws(
        () => CjsGltfFormat.read(skinnedFixture.gltf, { buffers: [ skinnedFixture.buffer ] }),
        /JOINTS_1 requires reducing influences/u
    );
});

test("imports only the default scene and reassembles Carbon MSFT_lod nodes", () =>
{
    const { gltf, buffer } = buildFixture();
    gltf.meshes.push(structuredClone(gltf.meshes[0]), structuredClone(gltf.meshes[0]));
    gltf.nodes[0].extensions = { MSFT_lod: { ids: [ 1, 2 ] } };
    gltf.nodes[0].extras = { MSFT_screencoverage: [ 0.5, 0.25, 0 ] };
    gltf.nodes.push(
        { name: "Triangle_LOD1", mesh: 1 },
        { name: "Triangle_LOD2", mesh: 2 },
        { name: "Unused", mesh: 0 }
    );

    const shared = CjsGltfFormat.read(gltf, { buffers: [ buffer ] });
    assert.equal(shared.meshes.length, 1);
    assert.equal(shared.meshes[0].lods.length, 3);
    assert.deepEqual(shared.meshes[0].lods.map(lod => lod.threshold), [ 0xffffffff, 1024, 512 ]);

    const Root = makeValueClass();
    const cmf = CjsGltfFormat.read(gltf, {
        emit: "cmf",
        buffers: [ buffer ],
        classes: { Root }
    });
    assert.equal(cmf.meshes.length, 1);
    assert.deepEqual(cmf.meshes[0].lods.map(lod => lod.threshold), [ 0xffffffff, 1024, 512 ]);
});

test("imports non-indexed glTF points as CMF PointList and rejects indexed points", () =>
{
    const { gltf, buffer } = buildFixture();
    const primitive = gltf.meshes[0].primitives[0];
    primitive.mode = 0;
    delete primitive.indices;

    const Root = makeValueClass();
    const cmf = CjsGltfFormat.read(gltf, {
        emit: "cmf",
        buffers: [ buffer ],
        classes: { Root }
    });
    assert.equal(cmf.meshes[0].topology, "PointList");
    assert.deepEqual(cmf.meshes[0].lods[0].ib, { index: 0, offset: 0, size: 0, stride: 0 });
    assert.deepEqual(cmf.meshes[0].lods[0].areas, [ { firstElement: 0, elementCount: 3 } ]);

    primitive.indices = 0;
    assert.throws(
        () => CjsGltfFormat.read(gltf, { buffers: [ buffer ] }),
        /indexed POINTS require vertex unindexing/u
    );
});

test("uses glTF tangent handedness and never treats tangent VEC4 as packed geometry", () =>
{
    const { gltf, buffer } = buildFixture();
    const tangentAccessor = gltf.meshes[0].primitives[0].attributes.TANGENT;
    overwriteFloatAccessor(gltf, buffer, tangentAccessor, [
        1, 0, 0, -1,
        1, 0, 0, -1,
        1, 0, 0, -1
    ]);
    const shared = CjsGltfFormat.read(gltf, { buffers: [ buffer ] });
    assert.deepEqual(shared.meshes[0].vertex.binormal, [
        0, -1, 0,
        0, -1, 0,
        0, -1, 0
    ]);

    delete gltf.meshes[0].primitives[0].attributes.NORMAL;
    assert.throws(
        () => CjsGltfFormat.read(gltf, { buffers: [ buffer ] }),
        /TANGENT requires a matching NORMAL channel/u
    );
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
    assert.deepEqual(
        cmf.meshes[0].decl.map(element => element.usage),
        [ "Position", "Normal", "Tangent", "Binormal", "TexCoord" ]
    );

    const skinnedFixture = buildFixture({ skin: true });
    const skinnedCmf = CjsGltfFormat.read(skinnedFixture.gltf, {
        emit: "cmf",
        buffers: [ skinnedFixture.buffer ],
        classes: { Root, Mesh, VertexElement }
    });
    assert.equal(skinnedCmf.skeletons.length, 1);
    assert.equal(skinnedCmf.meshes[0].skeleton, 0);
    assert.equal(skinnedCmf.animations.length, 1);
    assert.deepEqual(
        skinnedCmf.animations[0].channels.map(({ target, targetType }) => ({ target, targetType })),
        [ { target: "Bone", targetType: "BoneRotation" } ]
    );
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
