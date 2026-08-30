import assert from "node:assert/strict";
import test from "node:test";
import { packTangentFrames } from "#math/tangent";
import CjsFbxFormat from "../../../../../src/resource/formats/fbx/index.js";

class ValueNode
{
    SetValues(values)
    {
        Object.assign(this, values);
        return this;
    }
}

class Root extends ValueNode {}
class Mesh extends ValueNode {}
class IndexGroup extends ValueNode {}

function floatBytes(values)
{
    return Array.from(new Uint8Array(new Float32Array(values).buffer));
}

function quaternionFromEulerXyz(values)
{
    const radians = values.map(value => value * Math.PI / 360);
    const [ x, y, z ] = radians;
    const [ sx, sy, sz ] = [ Math.sin(x), Math.sin(y), Math.sin(z) ];
    const [ cx, cy, cz ] = [ Math.cos(x), Math.cos(y), Math.cos(z) ];
    return [
        sx * cy * cz - cx * sy * sz,
        cx * sy * cz + sx * cy * sz,
        cx * cy * sz - sx * sy * cz,
        cx * cy * cz + sx * sy * sz
    ];
}

function normalizedLerpQuaternion(start, end, alpha)
{
    const value = start.map((component, index) => component + (end[index] - component) * alpha);
    const length = Math.hypot(...value);
    return value.map(component => component / length);
}

function makeCmf()
{
    return {
        version: 1,
        meshes: [ {
            name: "Triangle",
            topology: "TriangleList",
            vertex: {
                position: [ 0, 0, 0, 1, 0, 0, 0, 1, 0 ]
            },
            indices: [ {
                name: "main",
                bytesPerIndex: 2,
                faces: [ 0, 1, 2 ]
            } ],
            skeleton: null,
            boneBindings: [],
            morphTargets: { decl: [], targets: [] },
            lods: []
        } ],
        skeletons: [],
        animations: []
    };
}

function makeDeformedCmf()
{
    const cmf = makeCmf();
    const mesh = cmf.meshes[0];
    mesh.skeleton = 0;
    mesh.boneBindings = [ { name: "BoneA" }, { name: "BoneB" } ];
    mesh.vertex.blendIndice = [
        0, 0, 0, 0,
        0, 1, 0, 0,
        1, 0, 0, 0
    ];
    mesh.vertex.blendWeight = [
        1, 0, 0, 0,
        0.25, 0.75, 0, 0,
        1, 0, 0, 0
    ];
    mesh.morphTargets = {
        decl: [ { usage: "Position", usageIndex: 0, type: "Float32", elementCount: 3, offset: 0 } ],
        targets: [ { name: "Smile", maxDisplacement: 1 } ]
    };
    mesh.lods = [ {
        vertex: mesh.vertex,
        indices: mesh.indices,
        morphTargets: [ {
            vertex: { position: [ 0, 0, 0, 0, 0, 1, 0, 0, 0 ] }
        } ]
    } ];
    cmf.skeletons = [ {
        name: "Rig",
        bones: [ "BoneA", "BoneB" ],
        parents: [ 0xffffffff, 0 ],
        restTransforms: [
            { position: [ 1, 0, 0 ], rotation: [ 0, 0, 0, 1 ], scale: [ 1, 1, 1 ] },
            { position: [ 0, 2, 0 ], rotation: [ 0, 0, 0, 1 ], scale: [ 1, 1, 1 ] }
        ],
        invBindTransforms: [
            [ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -1, 0, 0, 1 ],
            [ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -1, -2, 0, 1 ]
        ],
        boneMasks: []
    } ];
    return cmf;
}

function addAnimations(cmf)
{
    cmf.animations = [ {
        name: "Act",
        duration: 1,
        channels: [
            { target: "BoneB", targetType: "BonePosition", curveIndex: 0 },
            { target: "BoneB", targetType: "BoneRotation", curveIndex: 1 },
            { target: "Smile", targetType: "MorphTarget", curveIndex: 2 }
        ],
        curves: [
            {
                valueDimension: 3,
                interpolation: "Linear",
                knotType: "Float32",
                valueType: "Float32",
                knotCount: 2,
                knots: floatBytes([ 0, 1 ]),
                values: floatBytes([ 0, 2, 0, 0, 4, 0 ])
            },
            {
                valueDimension: 4,
                interpolation: "Linear",
                knotType: "Float32",
                valueType: "Float32",
                knotCount: 2,
                knots: floatBytes([ 0, 1 ]),
                values: floatBytes([ 0, 0, 0, 1, 0, 0, Math.SQRT1_2, Math.SQRT1_2 ])
            },
            {
                valueDimension: 1,
                interpolation: "Step",
                knotType: "Float32",
                valueType: "Float32",
                knotCount: 3,
                knots: floatBytes([ 0, 0.5, 1 ]),
                values: floatBytes([ 0, 1, 0.25 ])
            }
        ]
    } ];
    return cmf;
}

test("writes deterministic reader-compatible binary FBX 7400 geometry", () =>
{
    const first = CjsFbxFormat.write(makeCmf());
    const second = new CjsFbxFormat().Write(makeCmf());
    assert.deepEqual(first, second);
    assert.equal(CjsFbxFormat.isFBX(first), true);

    const document = CjsFbxFormat.read(first, { emit: "fbxJson" });
    assert.equal(document.version, 7400);
    assert.deepEqual(document.nodes.map((entry) => entry.name), [
        "FBXHeaderExtension",
        "FileId",
        "CreationTime",
        "Creator",
        "GlobalSettings",
        "Documents",
        "References",
        "Definitions",
        "Objects",
        "Connections",
        "Takes"
    ]);
    assert.deepEqual(Array.from(first.slice(-16)), [
        0xf8, 0x5a, 0x8c, 0x6a, 0xde, 0xf5, 0xd9, 0x7e,
        0xec, 0xe9, 0x0c, 0xe3, 0x75, 0x8f, 0x29, 0x0b
    ]);
    const objects = document.nodes.find(entry => entry.name === "Objects");
    const geometry = objects.children.find(entry => entry.name === "Geometry");
    assert.equal(geometry.properties[1], "Triangle\0\x01Geometry");
    assert.ok(geometry.children.some(entry => entry.name === "Layer"));
    for (const layer of geometry.children.filter(entry => entry.name.startsWith("LayerElement")))
    {
        assert.equal(layer.children.find(entry => entry.name === "Version")?.properties[0], 101);
        assert.equal(typeof layer.children.find(entry => entry.name === "Name")?.properties[0], "string");
    }
    const model = objects.children.find(entry => entry.name === "Model" && entry.properties[2] === "Mesh");
    assert.equal(model.properties[1], "Triangle\0\x01Model");
    const connections = document.nodes.find(entry => entry.name === "Connections");
    assert.ok(connections.children.some(entry =>
        entry.name === "C" && entry.properties[0] === "OO" &&
        entry.properties[1] === model.properties[0] && entry.properties[2] === 0
    ));

    const gr2 = CjsFbxFormat.read(first, {
        emit: "gr2",
        classes: { Root, Mesh, IndexGroup }
    });
    assert.equal(gr2.meshes[0].name, "Triangle");
    assert.deepEqual(gr2.meshes[0].vertex.position, [ 0, 0, 0, 1, 0, 0, 0, 1, 0 ]);
    assert.deepEqual(gr2.meshes[0].indices[0].faces, [ 0, 1, 2 ]);
});

test("writes binary FBX object names with DCC-compatible class separators", () =>
{
    const document = CjsFbxFormat.read(CjsFbxFormat.write(addAnimations(makeDeformedCmf())), { emit: "fbxJson" });
    const objects = document.nodes.find(entry => entry.name === "Objects").children;
    const expectedClasses = {
        AnimationCurve: new Set([ "AnimCurve" ]),
        AnimationCurveNode: new Set([ "AnimCurveNode" ]),
        AnimationLayer: new Set([ "AnimLayer" ]),
        AnimationStack: new Set([ "AnimStack" ]),
        Deformer: new Set([ "Deformer", "SubDeformer" ]),
        Geometry: new Set([ "Geometry" ]),
        Material: new Set([ "Material" ]),
        Model: new Set([ "Model" ]),
        Pose: new Set([ "Pose" ])
    };

    for (const object of objects)
    {
        const parts = object.properties[1].split("\0\x01");
        assert.equal(parts.length, 2, `${object.name} must contain one FBX name/class separator`);
        assert.ok(parts[0], `${object.name} must contain a display name`);
        assert.ok(expectedClasses[object.name]?.has(parts[1]), `${object.name} has unexpected object class ${parts[1]}`);
    }
});

test("routes GR2-shaped shared geometry through CMF before writing FBX", () =>
{
    const bytes = CjsFbxFormat.writeShared({
        meshes: [ {
            name: "SharedTriangle",
            vertex: { position: [ 0, 0, 0, 2, 0, 0, 0, 2, 0 ] },
            indices: [ { name: "main", faces: [ 0, 1, 2 ] } ]
        } ]
    });
    const gr2 = CjsFbxFormat.read(bytes, {
        emit: "gr2",
        classes: { Root, Mesh, IndexGroup }
    });
    assert.equal(gr2.meshes[0].name, "SharedTriangle");
    assert.deepEqual(gr2.meshes[0].vertex.position, [ 0, 0, 0, 2, 0, 0, 0, 2, 0 ]);
});

test("routes GR2 skeletons and animations through CMF before writing FBX", () =>
{
    const skeleton = {
        name: "Rig",
        bones: [ {
            name: "RootBone",
            parentIndex: -1,
            position: [ 0, 0, 0 ],
            orientation: [ 0, 0, 0, 1 ],
            scaleShear: [ 1, 0, 0, 0, 1, 0, 0, 0, 1 ]
        } ]
    };
    const bytes = CjsFbxFormat.writeShared({
        meshes: [ {
            name: "Skinned",
            vertex: {
                position: [ 0, 0, 0, 1, 0, 0, 0, 1, 0 ],
                blendIndice: new Array(12).fill(0),
                blendWeight: [ 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0 ]
            },
            indices: [ { name: "main", faces: [ 0, 1, 2 ] } ],
            boneBindings: [ { name: "RootBone" } ]
        } ],
        models: [ { name: "Rig", skeleton, meshBindings: [ 0 ] } ],
        animations: [ {
            name: "Move",
            duration: 1,
            trackGroups: [ {
                name: "Rig",
                transformTracks: [ {
                    name: "RootBone",
                    position: {
                        degree: 1,
                        dimension: 3,
                        knots: [ 0, 1 ],
                        controls: [ 0, 0, 0, 0, 1, 0 ]
                    }
                } ]
            } ]
        } ]
    });
    const cmf = CjsFbxFormat.read(bytes, { emit: "cmf", classes: { Root, Mesh } });
    assert.deepEqual(cmf.skeletons[0].bones, [ "RootBone" ]);
    assert.equal(cmf.meshes[0].skeleton, 0);
    assert.equal(cmf.animations[0].channels[0].target, "RootBone");
    assert.equal(cmf.animations[0].channels[0].targetType, "BonePosition");
});

test("unpacks GR2 tangent frames through the shared CMF boundary", () =>
{
    const packed = packTangentFrames(
        [ 0, 0, 1, 0, 0, 1, 0, 0, 1 ],
        [ 1, 0, 0, 1, 0, 0, 1, 0, 0 ],
        [ 0, 1, 0, 0, 1, 0, 0, 1, 0 ]
    );
    const bytes = CjsFbxFormat.writeShared({
        meshes: [ {
            name: "Packed",
            vertex: {
                position: [ 0, 0, 0, 1, 0, 0, 0, 1, 0 ],
                tangent: packed
            },
            indices: [ { name: "main", faces: [ 0, 1, 2 ] } ]
        } ]
    });
    const mesh = CjsFbxFormat.read(bytes, {
        emit: "gr2",
        classes: { Root, Mesh, IndexGroup }
    }).meshes[0];

    assert.deepEqual(mesh.vertex.normal.map(value => Math.round(value)), [
        0, 0, 1, 0, 0, 1, 0, 0, 1
    ]);
    assert.deepEqual(mesh.vertex.tangent.map(value => Math.round(value)), [
        1, 0, 0, 1, 0, 0, 1, 0, 0
    ]);
    assert.deepEqual(mesh.vertex.binormal.map(value => Math.round(value)), [
        0, 1, 0, 0, 1, 0, 0, 1, 0
    ]);
});

test("exports explicitly unpacked GR2 tangent and binormal vec4 channels", () =>
{
    const bytes = CjsFbxFormat.writeShared({
        meshes: [ {
            name: "Unpacked",
            vertex: {
                position: [ 0, 0, 0, 1, 0, 0, 0, 1, 0 ],
                normal: [ 0, 0, 1, 0, 0, 1, 0, 0, 1 ],
                tangent: [ 1, 0, 0, 7, 1, 0, 0, 8, 1, 0, 0, 9 ],
                binormal: [ 0, 1, 0, 4, 0, 1, 0, 5, 0, 1, 0, 6 ]
            },
            indices: [ { name: "main", faces: [ 0, 1, 2 ] } ]
        } ]
    });
    const mesh = CjsFbxFormat.read(bytes, {
        emit: "gr2",
        classes: { Root, Mesh, IndexGroup }
    }).meshes[0];

    assert.deepEqual(mesh.vertex.tangent, [ 1, 0, 0, 1, 0, 0, 1, 0, 0 ]);
    assert.deepEqual(mesh.vertex.binormal, [ 0, 1, 0, 0, 1, 0, 0, 1, 0 ]);
});

test("round-trips CMF vertex layers and material areas", () =>
{
    const cmf = makeCmf();
    cmf.meshes[0].vertex = {
        position: [ 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0 ],
        normal: [ 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1 ],
        texcoord0: [ 0, 0, 1, 0, 1, 1, 0, 1 ],
        color0: [ 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1 ]
    };
    cmf.meshes[0].indices = [
        { name: "Red", faces: [ 0, 1, 2 ] },
        { name: "Blue", faces: [ 0, 2, 3 ] }
    ];

    const gr2 = CjsFbxFormat.read(CjsFbxFormat.write(cmf), {
        emit: "gr2",
        classes: { Root, Mesh, IndexGroup }
    });
    assert.deepEqual(gr2.meshes[0].vertex.normal, [
        0, 0, 1, 0, 0, 1, 0, 0, 1,
        0, 0, 1, 0, 0, 1, 0, 0, 1
    ]);
    assert.deepEqual(gr2.meshes[0].vertex.texcoord0, [
        0, 0, 1, 0, 1, 1,
        0, 0, 1, 1, 0, 1
    ]);
    assert.deepEqual(gr2.meshes[0].indices.map((group) => group.name), [ "Red", "Blue" ]);
    assert.deepEqual(gr2.meshes[0].indices.map((group) => group.faces), [ [ 0, 1, 2 ], [ 3, 4, 5 ] ]);
});

test("round-trips CMF skeletons, skin clusters, bind poses, and morph deltas", () =>
{
    const cmf = CjsFbxFormat.read(CjsFbxFormat.write(makeDeformedCmf()), {
        emit: "cmf",
        classes: { Root, Mesh }
    });
    assert.deepEqual(cmf.skeletons[0].bones, [ "BoneA", "BoneB" ]);
    assert.equal(cmf.skeletons[0].name, "Rig");
    assert.deepEqual(cmf.skeletons[0].parents, [ 0xffffffff, 0 ]);
    assert.deepEqual(cmf.skeletons[0].restTransforms.map((transform) => transform.position), [
        [ 1, 0, 0 ], [ 0, 2, 0 ]
    ]);
    assert.deepEqual(cmf.skeletons[0].invBindTransforms, makeDeformedCmf().skeletons[0].invBindTransforms);
    assert.equal(cmf.meshes[0].skeleton, 0);
    assert.deepEqual(cmf.meshes[0].boneBindings.map((binding) => binding.name), [ "BoneA", "BoneB" ]);
    assert.deepEqual(cmf.meshes[0].lods[0].vertex.blendIndice, [
        0, 0, 0, 0,
        1, 0, 0, 0,
        1, 0, 0, 0
    ]);
    assert.deepEqual(cmf.meshes[0].lods[0].vertex.blendWeight, [
        1, 0, 0, 0,
        0.75, 0.25, 0, 0,
        1, 0, 0, 0
    ]);
    assert.deepEqual(cmf.meshes[0].morphTargets.targets.map((target) => target.name), [ "Smile" ]);
    assert.deepEqual(cmf.meshes[0].lods[0].morphTargets[0].vertex.position, [
        0, 0, 0,
        0, 0, 1,
        0, 0, 0
    ]);
});

test("omits unused CMF bone bindings while preserving skin influences", () =>
{
    const source = makeDeformedCmf();
    source.skeletons[0].bones.push("Unused");
    source.skeletons[0].parents.push(0);
    source.skeletons[0].restTransforms.push({
        position: [ 0, 0, 3 ], rotation: [ 0, 0, 0, 1 ], scale: [ 1, 1, 1 ]
    });
    source.skeletons[0].invBindTransforms.push([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        -1, 0, -3, 1
    ]);
    source.meshes[0].boneBindings.push({ name: "Unused" });

    const bytes = CjsFbxFormat.write(source);
    const support = CjsFbxFormat.getSupport(bytes);
    const cmf = CjsFbxFormat.read(bytes, { emit: "cmf", classes: { Root, Mesh } });

    assert.equal(support.warnings.some(warning => /no Indexes|no positive Weights/u.test(warning)), false);
    assert.deepEqual(cmf.meshes[0].boneBindings.map(binding => binding.name), [ "BoneA", "BoneB" ]);
    assert.deepEqual(cmf.meshes[0].lods[0].vertex.blendIndice, [
        0, 0, 0, 0,
        1, 0, 0, 0,
        1, 0, 0, 0
    ]);
    assert.deepEqual(cmf.meshes[0].lods[0].vertex.blendWeight, [
        1, 0, 0, 0,
        0.75, 0.25, 0, 0,
        1, 0, 0, 0
    ]);
});

test("round-trips CMF morph normal deltas through Carbon FBX properties", () =>
{
    const source = makeDeformedCmf();
    source.meshes[0].vertex.normal = [
        0, 0, 1,
        0, 0, 1,
        0, 0, 1
    ];
    source.meshes[0].morphTargets.decl.push({
        usage: "Normal", usageIndex: 0, type: "Float32", elementCount: 3, offset: 12
    });
    source.meshes[0].lods[0].morphTargets[0].vertex.normal = [
        0, 1, -1,
        0, 0, 0,
        0, 0, 0
    ];

    const bytes = CjsFbxFormat.write(source);
    const document = CjsFbxFormat.read(bytes, { emit: "fbxJson" });
    const shape = document.nodes.find(entry => entry.name === "Objects").children.find(entry =>
        entry.name === "Geometry" && entry.properties[2] === "Shape"
    );
    assert.ok(shape.children.some(entry => entry.name === "Normals"));
    const cmf = CjsFbxFormat.read(bytes, {
        emit: "cmf",
        classes: { Root, Mesh }
    });
    assert.deepEqual(cmf.meshes[0].lods[0].morphTargets[0].vertex.normal, [
        0, 1, -1,
        0, 0, 0,
        0, 0, 0
    ]);
});

test("bakes linear quaternion motion at interior quarter points", () =>
{
    for (const angles of [ [ 120, 80, 45 ], [ 0, 0, 170 ] ])
    {
        const source = makeDeformedCmf();
        const end = quaternionFromEulerXyz(angles);
        source.animations = [ {
            name: "Rotation",
            duration: 1,
            channels: [ { target: "BoneB", targetType: "BoneRotation", curveIndex: 0 } ],
            curves: [ {
                valueDimension: 4,
                interpolation: "Linear",
                knotType: "Float32",
                valueType: "Float32",
                knotCount: 2,
                knots: floatBytes([ 0, 1 ]),
                values: floatBytes([ 0, 0, 0, 1, ...end ])
            } ]
        } ];
        const cmf = CjsFbxFormat.read(CjsFbxFormat.write(source), {
            emit: "cmf",
            classes: { Root, Mesh }
        });
        const curve = cmf.animations[0].curves[0];
        assert.ok(curve.knotCount > 2);
        const knots = Array.from(new Float32Array(new Uint8Array(curve.knots).buffer));
        const values = Array.from(new Float32Array(new Uint8Array(curve.values).buffer));
        const quarterIndex = knots.findIndex(value => Math.abs(value - 0.25) < 1e-6);
        assert.ok(quarterIndex >= 0);
        const actual = values.slice(quarterIndex * 4, quarterIndex * 4 + 4);
        const expected = normalizedLerpQuaternion([ 0, 0, 0, 1 ], end, 0.25);
        const dot = Math.abs(actual.reduce((sum, value, index) => sum + value * expected[index], 0));
        assert.ok(dot > 1 - 1e-5);
    }
});

test("treats adjacent opposite quaternion signs as one orientation", () =>
{
    const source = makeDeformedCmf();
    source.animations = [ {
        name: "Hemisphere",
        duration: 1,
        channels: [ { target: "BoneB", targetType: "BoneRotation", curveIndex: 0 } ],
        curves: [ {
            valueDimension: 4,
            interpolation: "Linear",
            knotType: "Float32",
            valueType: "Float32",
            knotCount: 2,
            knots: floatBytes([ 0, 1 ]),
            values: floatBytes([ 0, 0, 0, 1, 0, 0, 0, -1 ])
        } ]
    } ];
    const cmf = CjsFbxFormat.read(CjsFbxFormat.write(source), {
        emit: "cmf",
        classes: { Root, Mesh }
    });
    const rotation = cmf.animations[0].curves[0];
    assert.equal(rotation.knotCount, 2);
    assert.deepEqual(Array.from(new Float32Array(new Uint8Array(rotation.values).buffer)), [
        0, 0, 0, 1,
        0, 0, 0, 1
    ]);
});

test("preserves duplicate and empty material groups by FBX slot identity", () =>
{
    const source = makeCmf();
    source.meshes[0].vertex.position = [
        0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0
    ];
    source.meshes[0].indices = [
        { name: "Same", faces: [ 0, 1, 2 ] },
        { name: "Same", faces: [ 0, 2, 3 ] },
        { name: "", faces: [] }
    ];
    const mesh = CjsFbxFormat.read(CjsFbxFormat.write(source), {
        emit: "gr2",
        classes: { Root, Mesh, IndexGroup }
    }).meshes[0];

    assert.deepEqual(mesh.indices.map(group => group.name), [ "Same", "Same", "" ]);
    assert.deepEqual(mesh.indices.map(group => group.faces), [ [ 0, 1, 2 ], [ 3, 4, 5 ], [] ]);
});

test("round-trips CMF bone and morph animations with interpolation", () =>
{
    const cmf = CjsFbxFormat.read(CjsFbxFormat.write(addAnimations(makeDeformedCmf())), {
        emit: "cmf",
        classes: { Root, Mesh }
    });
    assert.equal(cmf.animations.length, 1);
    assert.equal(cmf.animations[0].name, "Act");
    assert.equal(cmf.animations[0].duration, 1);
    assert.deepEqual(cmf.animations[0].channels.map((channel) => [ channel.target, channel.targetType ]), [
        [ "BoneB", "BonePosition" ],
        [ "BoneB", "BoneRotation" ],
        [ "Smile", "MorphTarget" ]
    ]);
    assert.deepEqual(cmf.animations[0].curves.map((curve) => curve.interpolation), [ "Linear", "Linear", "Step" ]);
    assert.deepEqual(Array.from(new Float32Array(new Uint8Array(cmf.animations[0].curves[0].values).buffer)), [
        0, 2, 0, 0, 4, 0
    ]);
    const rotationValues = Array.from(new Float32Array(new Uint8Array(cmf.animations[0].curves[1].values).buffer));
    assert.ok(Math.abs(rotationValues.at(-2) - Math.SQRT1_2) < 1e-6);
    assert.ok(Math.abs(rotationValues.at(-1) - Math.SQRT1_2) < 1e-6);
    assert.deepEqual(Array.from(new Float32Array(new Uint8Array(cmf.animations[0].curves[2].values).buffer)), [
        0, 1, 0.25
    ]);
});

test("rejects unsupported or malformed CMF geometry", () =>
{
    const cmf = makeCmf();
    cmf.meshes[0].indices[0].faces = [ 0, 1, 3 ];
    assert.throws(
        () => CjsFbxFormat.write(cmf),
        error => error?.name === "CjsFormatWriteError" && /references vertex 3 outside 0\.\.2/u.test(error.message)
    );
    assert.throws(() => CjsFbxFormat.write(makeCmf(), { version: 7500 }), /only binary FBX 7400/u);

    const multipleLods = makeCmf();
    multipleLods.meshes[0].lods = [
        { vertex: multipleLods.meshes[0].vertex, indices: multipleLods.meshes[0].indices, morphTargets: [] },
        { vertex: multipleLods.meshes[0].vertex, indices: multipleLods.meshes[0].indices, morphTargets: [] }
    ];
    assert.throws(() => CjsFbxFormat.write(multipleLods), /FBX LOD export is not defined/u);

    const invalidSkin = makeDeformedCmf();
    invalidSkin.meshes[0].vertex.blendWeight[0] = 0.5;
    assert.throws(() => CjsFbxFormat.write(invalidSkin), /blend weights sum/u);

    const invalidMorph = makeDeformedCmf();
    invalidMorph.meshes[0].lods[0].morphTargets[0].vertex.tangent = new Array(9).fill(0);
    assert.throws(() => CjsFbxFormat.write(invalidMorph), /tangent deltas cannot be represented exactly/u);

    for (const names of [ [ "Smile", "Smile" ], [ "", "Morph_0" ] ])
    {
        const duplicateMorph = makeDeformedCmf();
        duplicateMorph.meshes[0].morphTargets.targets = names.map(name => ({ name, maxDisplacement: 1 }));
        duplicateMorph.meshes[0].lods[0].morphTargets.push({
            vertex: { position: [ 0, 0, 0, 0, 0, 1, 0, 0, 0 ] }
        });
        assert.throws(() => CjsFbxFormat.write(duplicateMorph), /duplicate morph target name/u);
    }

    const multipleRoots = makeDeformedCmf();
    multipleRoots.skeletons[0].parents[1] = 0xffffffff;
    assert.throws(() => CjsFbxFormat.write(multipleRoots), /exactly one root bone/u);

    for (const name of [
        "Lcl Translation",
        "Lcl Rotation",
        "Lcl Scaling",
        "InheritType",
        "GeometricTranslation",
        "GeometricRotation",
        "GeometricScaling",
        "RotationOrder",
        "RotationPivot",
        "ScalingPivot",
        "RotationOffset",
        "PreRotation",
        "PostRotation",
        "ScalingOffset",
        "CjsSkeletonName"
    ])
    {
        const reservedMask = makeDeformedCmf();
        reservedMask.skeletons[0].boneMasks = [ {
            name,
            weights: [ { index: 0, weight: 1 } ]
        } ];
        assert.throws(() => CjsFbxFormat.write(reservedMask), /reserved name/u);
    }
});
