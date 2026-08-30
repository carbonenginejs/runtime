import { CjsByteWriter } from "../../../format/CjsByteWriter.js";
import { CjsFormatWriteError } from "../../../format/CjsFormatError.js";
import { FBX_RESERVED_BONE_MASK_PROPERTY_NAMES } from "./constants.js";
import { buildCmfFromShared } from "../../cmf/core/shared.js";
import {
    composeCmfTransform,
    invertMatrix4,
    multiplyMatrix4,
    transposeMatrix4
} from "../../cmf/core/utils/matrix.js";
import { maxMorphDisplacement } from "../../cmf/core/utils/morph.js";
import {
    normalizeQuaternion,
    normalizeQuaternionSeries,
    normalizedLerpQuaternion,
    quaternionAngularDifference,
    quaternionSegmentMidpointTick,
    quaternionSegmentNeedsSubdivision
} from "../../cmf/core/utils/quaternion.js";
import { decodeElementArray } from "../../cmf/core/utils/vertex.js";

const textEncoder = new TextEncoder();
const BINARY_SIGNATURE = "Kaydara FBX Binary  \0\x1a\0";
const VERSION_7400 = 7400;
const NULL_RECORD_SIZE = 13;
const FBX_TICKS_PER_SECOND = 46186158000;
const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const FILE_ID = Uint8Array.from([
    0x28, 0xb3, 0x2a, 0xeb, 0xb6, 0x24, 0xcc, 0xc2,
    0xbf, 0xc8, 0xb0, 0x2a, 0xa9, 0x2b, 0xfc, 0xf1
]);
const FOOT_ID = Uint8Array.from([
    0xfa, 0xbc, 0xab, 0x09, 0xd0, 0xc8, 0xd4, 0x66,
    0xb1, 0x76, 0xfb, 0x83, 0x1c, 0xf7, 0x26, 0x7e
]);
const FOOT_MAGIC = Uint8Array.from([
    0xf8, 0x5a, 0x8c, 0x6a, 0xde, 0xf5, 0xd9, 0x7e,
    0xec, 0xe9, 0x0c, 0xe3, 0x75, 0x8f, 0x29, 0x0b
]);
const IDENTITY_MATRIX4 = Object.freeze([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
]);
const SUPPORTED_VERTEX_CHANNELS = Object.freeze({
    position: 3,
    normal: 3,
    tangent: 3,
    binormal: 3,
    texcoord0: 2,
    texcoord1: 2,
    color0: 4,
    blendIndice: 4,
    blendWeight: 4
});
const DECL_CHANNELS = Object.freeze({
    Position: [ "position", 0 ],
    Normal: [ "normal", 0 ],
    Tangent: [ "tangent", 0 ],
    Binormal: [ "binormal", 0 ],
    TexCoord: [ "texcoord", null ],
    Color: [ "color", null ],
    BoneIndices: [ "blendIndice", 0 ],
    BoneWeights: [ "blendWeight", 0 ]
});

function node(name, properties = [], children = [], forceSentinel = false)
{
    return { name, properties, children, forceSentinel };
}

function long(value)
{
    return { type: "L", value: BigInt(value) };
}

function string(value)
{
    return { type: "S", value: String(value) };
}

function objectName(name, className)
{
    // Binary FBX stores an object's display name and object class in one string.
    // DCC importers split this exact marker; the human-readable `Class::Name`
    // spelling belongs to ASCII FBX syntax and is not interchangeable on wire.
    return string(`${name}\0\x01${className}`);
}

function integer(value)
{
    return { type: "I", value: Number(value) | 0 };
}

function double(value)
{
    return { type: "D", value: Number(value) };
}

function doubleArray(values)
{
    return { type: "d", values };
}

function intArray(values)
{
    return { type: "i", values };
}

function floatArray(values)
{
    return { type: "f", values };
}

function longArray(values)
{
    return { type: "l", values };
}

function raw(value)
{
    return { type: "R", value };
}

function base64Float32(values)
{
    const bytes = new Uint8Array(values.length * 4);
    const view = new DataView(bytes.buffer);
    for (let index = 0; index < values.length; index++) view.setFloat32(index * 4, values[index], true);

    let encoded = "";
    for (let index = 0; index < bytes.length; index += 3)
    {
        const
            a = bytes[index],
            b = bytes[index + 1] ?? 0,
            c = bytes[index + 2] ?? 0,
            value = (a << 16) | (b << 8) | c;
        encoded += BASE64_ALPHABET[(value >> 18) & 63];
        encoded += BASE64_ALPHABET[(value >> 12) & 63];
        encoded += index + 1 < bytes.length ? BASE64_ALPHABET[(value >> 6) & 63] : "=";
        encoded += index + 2 < bytes.length ? BASE64_ALPHABET[value & 63] : "=";
    }
    return encoded;
}

function writeError(message, details = {})
{
    return new CjsFormatWriteError(`FBX write: ${message}`, details);
}

function validateName(value, label)
{
    if (value === undefined || value === null || value === "") return;
    if (typeof value !== "string") throw writeError(`${label} must be a string`);
    if (value.includes("::") || value.includes("\0"))
    {
        throw writeError(`${label} contains an FBX-reserved name separator`);
    }
}

function validateFiniteArray(values, expectedLength, label)
{
    if (!Array.isArray(values) || values.length !== expectedLength)
    {
        throw writeError(`${label} must contain ${expectedLength} values`);
    }
    for (let index = 0; index < values.length; index++)
    {
        if (!Number.isFinite(values[index])) throw writeError(`${label} value ${index} is not finite`);
    }
}

function arraysEqual(a, b)
{
    return a === b || (
        Array.isArray(a) && Array.isArray(b) &&
        a.length === b.length &&
        a.every((value, index) => Object.is(value, b[index]) || value === b[index])
    );
}

function validateLodProjection(mesh, meshIndex)
{
    const lods = mesh.lods ?? [];
    if (!Array.isArray(lods)) throw writeError(`mesh ${meshIndex} lods must be an array`);
    if (lods.length > 1)
    {
        throw writeError(`mesh ${meshIndex} has ${lods.length} LODs; FBX LOD export is not defined`);
    }
    const lod = lods[0];
    if (!lod) return;
    if (mesh.vertex && lod.vertex)
    {
        for (const channel of new Set([ ...Object.keys(mesh.vertex), ...Object.keys(lod.vertex) ]))
        {
            if (!arraysEqual(mesh.vertex[channel] ?? [], lod.vertex[channel] ?? []))
            {
                throw writeError(`mesh ${meshIndex} top-level ${channel} differs from LOD 0`);
            }
        }
    }
    if (mesh.indices && lod.indices && mesh.indices !== lod.indices)
    {
        if (JSON.stringify(mesh.indices) !== JSON.stringify(lod.indices))
        {
            throw writeError(`mesh ${meshIndex} top-level indices differ from LOD 0`);
        }
    }
}

function declarationChannel(element)
{
    const mapping = DECL_CHANNELS[element?.usage];
    if (!mapping) return null;
    const usageIndex = element.usageIndex ?? 0;
    if (mapping[1] !== null && usageIndex !== mapping[1]) return null;
    if (element.usage === "TexCoord" && usageIndex < 2) return `${mapping[0]}${usageIndex}`;
    if (element.usage === "Color" && usageIndex === 0) return "color0";
    return mapping[0];
}

function validateVertexDeclaration(mesh, meshIndex)
{
    const vertex = vertexData(mesh);
    for (const [ channel, values ] of Object.entries(vertex))
    {
        if (!Array.isArray(values) || !values.length) continue;
        if (!Object.hasOwn(SUPPORTED_VERTEX_CHANNELS, channel))
        {
            throw writeError(`mesh ${meshIndex} vertex channel "${channel}" is not supported by FBX export`);
        }
    }
    for (const element of mesh.decl ?? [])
    {
        if (!declarationChannel(element))
        {
            throw writeError(
                `mesh ${meshIndex} declaration ${element?.usage ?? "unknown"}[${element?.usageIndex ?? 0}] ` +
                "is not supported by FBX export"
            );
        }
    }
}

function vertexData(mesh)
{
    return mesh.vertex ?? mesh.lods?.[0]?.vertex ?? {};
}

function indexGroups(mesh)
{
    return mesh.indices ?? mesh.lods?.[0]?.indices ?? [];
}

function validateMesh(mesh, meshIndex)
{
    if (!mesh || typeof mesh !== "object") throw writeError(`mesh ${meshIndex} must be an object`);
    validateName(mesh.name, `mesh ${meshIndex} name`);
    validateLodProjection(mesh, meshIndex);
    validateVertexDeclaration(mesh, meshIndex);
    const positions = vertexData(mesh).position ?? [];
    if (!Array.isArray(positions) || positions.length % 3)
    {
        throw writeError(`mesh ${meshIndex} positions must be an array of vec3 values`);
    }
    for (let index = 0; index < positions.length; index++)
    {
        if (!Number.isFinite(positions[index]))
        {
            throw writeError(`mesh ${meshIndex} position ${index} is not finite`);
        }
    }
    if ((mesh.topology ?? "TriangleList") !== "TriangleList")
    {
        throw writeError(`mesh ${meshIndex} topology "${mesh.topology}" is not supported`);
    }

    const vertexCount = positions.length / 3;
    const groups = indexGroups(mesh);
    if (!Array.isArray(groups)) throw writeError(`mesh ${meshIndex} indices must be an array`);
    for (let groupIndex = 0; groupIndex < groups.length; groupIndex++)
    {
        const group = groups[groupIndex];
        if (!group || typeof group !== "object")
        {
            throw writeError(`mesh ${meshIndex} index group ${groupIndex} must be an object`);
        }
        validateName(group.name, `mesh ${meshIndex} index group ${groupIndex} name`);
        const faces = group.faces ?? [];
        if (!Array.isArray(faces) || faces.length % 3)
        {
            throw writeError(`mesh ${meshIndex} index group ${groupIndex} must contain triangles`);
        }
        for (let faceIndex = 0; faceIndex < faces.length; faceIndex++)
        {
            const value = faces[faceIndex];
            if (!Number.isInteger(value) || value < 0 || value >= vertexCount)
            {
                throw writeError(
                    `mesh ${meshIndex} index group ${groupIndex} references vertex ${value} outside 0..${vertexCount - 1}`
                );
            }
        }
    }

    for (const [ channel, width ] of Object.entries(SUPPORTED_VERTEX_CHANNELS))
    {
        const values = vertexData(mesh)[channel] ?? [];
        if (!values.length || channel === "position") continue;
        const validLengths = channel === "tangent" || channel === "binormal"
            ? [ vertexCount * 3, vertexCount * 4 ]
            : [ vertexCount * width ];
        if (!Array.isArray(values) || !validLengths.includes(values.length))
        {
            throw writeError(`mesh ${meshIndex} ${channel} must contain ${validLengths.join(" or ")} values`);
        }
        for (let index = 0; index < values.length; index++)
        {
            if (!Number.isFinite(values[index])) throw writeError(`mesh ${meshIndex} ${channel} value ${index} is not finite`);
        }
    }
}

function polygonVertexIndices(mesh)
{
    const result = [];
    for (const group of indexGroups(mesh))
    {
        const faces = group.faces ?? [];
        for (let index = 0; index < faces.length; index += 3)
        {
            result.push(faces[index], faces[index + 1], ~faces[index + 2]);
        }
    }
    return result;
}

function polygonVertexChannel(mesh, channel, width, meshIndex)
{
    const source = vertexData(mesh)[channel] ?? [];
    if (!source.length) return [];
    const vertexCount = (vertexData(mesh).position ?? []).length / 3;
    const sourceWidth = (channel === "tangent" || channel === "binormal") && source.length === vertexCount * 4
        ? 4
        : width;
    if (!Array.isArray(source) || source.length !== vertexCount * sourceWidth)
    {
        throw writeError(`mesh ${meshIndex} ${channel} must contain ${vertexCount} vec${sourceWidth} values`);
    }
    for (let index = 0; index < source.length; index++)
    {
        if (!Number.isFinite(source[index]))
        {
            throw writeError(`mesh ${meshIndex} ${channel} value ${index} is not finite`);
        }
    }
    const output = [];
    for (const group of indexGroups(mesh))
    {
        for (const vertexIndex of group.faces ?? [])
        {
            const offset = vertexIndex * sourceWidth;
            for (let component = 0; component < width; component++) output.push(source[offset + component]);
        }
    }
    return output;
}

function layerElement(name, valueName, values)
{
    return node(name, [ integer(0) ], [
        node("Version", [ integer(101) ]),
        node("Name", [ string("") ]),
        node("MappingInformationType", [ string("ByPolygonVertex") ]),
        node("ReferenceInformationType", [ string("Direct") ]),
        node(valueName, [ doubleArray(values) ])
    ]);
}

function geometryChildren(mesh, meshIndex, options)
{
    const children = [
        node("Vertices", [ doubleArray(vertexData(mesh).position ?? []) ]),
        node("PolygonVertexIndex", [ intArray(polygonVertexIndices(mesh)) ])
    ];
    const layers = [ [], [] ];
    for (const [ channel, elementName, valueName, width ] of [
        [ "normal", "LayerElementNormal", "Normals", 3 ],
        [ "tangent", "LayerElementTangent", "Tangents", 3 ],
        [ "binormal", "LayerElementBinormal", "Binormals", 3 ],
        [ "color0", "LayerElementColor", "Colors", 4 ]
    ])
    {
        const values = polygonVertexChannel(mesh, channel, width, meshIndex);
        if (values.length)
        {
            children.push(layerElement(elementName, valueName, values));
            layers[0].push(layerElementReference(elementName, 0));
        }
    }

    for (let usageIndex = 0; usageIndex < 2; usageIndex++)
    {
        const channel = `texcoord${usageIndex}`;
        const values = polygonVertexChannel(mesh, channel, 2, meshIndex);
        if (!values.length) continue;
        if (options.flipV !== false)
        {
            for (let index = 1; index < values.length; index += 2) values[index] = 1 - values[index];
        }
        children.push(node("LayerElementUV", [ integer(usageIndex) ], [
            node("Version", [ integer(101) ]),
            node("Name", [ string(usageIndex ? `UVMap_${usageIndex}` : "UVMap") ]),
            node("MappingInformationType", [ string("ByPolygonVertex") ]),
            node("ReferenceInformationType", [ string("Direct") ]),
            node("UV", [ doubleArray(values) ])
        ]));
        layers[usageIndex].push(layerElementReference("LayerElementUV", usageIndex));
    }

    const materialIndices = [];
    for (let groupIndex = 0; groupIndex < indexGroups(mesh).length; groupIndex++)
    {
        const triangleCount = (indexGroups(mesh)[groupIndex].faces ?? []).length / 3;
        for (let triangle = 0; triangle < triangleCount; triangle++) materialIndices.push(groupIndex);
    }
    if (materialIndices.length)
    {
        children.push(node("LayerElementMaterial", [ integer(0) ], [
            node("Version", [ integer(101) ]),
            node("Name", [ string("") ]),
            node("MappingInformationType", [ string("ByPolygon") ]),
            node("ReferenceInformationType", [ string("IndexToDirect") ]),
            node("Materials", [ intArray(materialIndices) ])
        ]));
        layers[0].push(layerElementReference("LayerElementMaterial", 0));
    }
    for (let layerIndex = 0; layerIndex < layers.length; layerIndex++)
    {
        if (!layers[layerIndex].length) continue;
        children.push(node("Layer", [ integer(layerIndex) ], [
            node("Version", [ integer(100) ]),
            ...layers[layerIndex]
        ]));
    }
    return children;
}

function layerElementReference(type, typedIndex)
{
    return node("LayerElement", [], [
        node("Type", [ string(type) ]),
        node("TypedIndex", [ integer(typedIndex) ])
    ]);
}

function quaternionToEulerXyz(quaternion)
{
    let normalized;
    try
    {
        normalized = normalizeQuaternion(quaternion, "FBX rotation");
    }
    catch (error)
    {
        throw writeError(error.message);
    }
    const [ x, y, z, w ] = normalized;
    const yValue = Math.max(-1, Math.min(1, 2 * (w * y - z * x)));
    const toDegrees = 180 / Math.PI;
    return [
        Math.atan2(2 * (w * x + y * z), 1 - 2 * (x * x + y * y)) * toDegrees,
        Math.asin(yValue) * toDegrees,
        Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z)) * toDegrees
    ];
}

function propertyNode(name, type, flags, values)
{
    return node("P", [
        string(name),
        string(type),
        string(""),
        string(flags),
        ...values.map((value) => double(value))
    ]);
}

function stringPropertyNode(name, value)
{
    return node("P", [ string(name), string("KString"), string(""), string("U"), string(value) ]);
}

function expandPolygonVertexValues(mesh, values, width)
{
    const expanded = [];
    for (const group of indexGroups(mesh))
    {
        for (const vertexIndex of group.faces ?? [])
        {
            expanded.push(...values.slice(vertexIndex * width, vertexIndex * width + width));
        }
    }
    return expanded;
}

function validateSkeleton(skeleton, skeletonIndex)
{
    if (!skeleton || typeof skeleton !== "object")
    {
        throw writeError(`skeleton ${skeletonIndex} must be an object`);
    }
    validateName(skeleton.name, `skeleton ${skeletonIndex} name`);
    const bones = skeleton.bones ?? [];
    const parents = skeleton.parents ?? [];
    const restTransforms = skeleton.restTransforms ?? [];
    const inverseBinds = skeleton.invBindTransforms ?? [];
    if (!Array.isArray(bones) || !Array.isArray(parents) ||
        parents.length !== bones.length || restTransforms.length !== bones.length ||
        inverseBinds.length !== bones.length)
    {
        throw writeError(`skeleton ${skeletonIndex} bone, parent, rest, and inverse-bind counts must match`);
    }
    if (new Set(bones).size !== bones.length)
    {
        throw writeError(`skeleton ${skeletonIndex} contains duplicate bone names`);
    }
    if (bones.length && parents.filter(parent => parent === 0xffffffff).length !== 1)
    {
        throw writeError(`skeleton ${skeletonIndex} must contain exactly one root bone for FBX export`);
    }

    const worldTransforms = new Array(bones.length);
    for (let boneIndex = 0; boneIndex < bones.length; boneIndex++)
    {
        const parent = parents[boneIndex];
        validateName(bones[boneIndex], `skeleton ${skeletonIndex} bone ${boneIndex} name`);
        if (!bones[boneIndex]) throw writeError(`skeleton ${skeletonIndex} bone ${boneIndex} name is empty`);
        if (parent !== 0xffffffff && (!Number.isInteger(parent) || parent < 0 || parent >= boneIndex))
        {
            throw writeError(`skeleton ${skeletonIndex} bone ${boneIndex} has invalid parent ${parent}`);
        }
        const rest = restTransforms[boneIndex];
        if (!rest || typeof rest !== "object")
        {
            throw writeError(`skeleton ${skeletonIndex} rest transform ${boneIndex} must be an object`);
        }
        validateFiniteArray(rest.position, 3, `skeleton ${skeletonIndex} rest position ${boneIndex}`);
        validateFiniteArray(rest.rotation, 4, `skeleton ${skeletonIndex} rest rotation ${boneIndex}`);
        validateFiniteArray(rest.scale, 3, `skeleton ${skeletonIndex} rest scale ${boneIndex}`);
        let local;
        try
        {
            local = composeCmfTransform(rest.position, rest.rotation, rest.scale);
            invertMatrix4(inverseBinds[boneIndex]);
        }
        catch (error)
        {
            throw writeError(`skeleton ${skeletonIndex} bone ${boneIndex}: ${error.message}`);
        }
        const world = parent === 0xffffffff ? local : multiplyMatrix4(local, worldTransforms[parent]);
        const identity = multiplyMatrix4(world, inverseBinds[boneIndex]);
        if (identity.some((value, index) => Math.abs(value - (index % 5 === 0 ? 1 : 0)) > 1e-4))
        {
            throw writeError(`skeleton ${skeletonIndex} inverse bind ${boneIndex} disagrees with its rest hierarchy`);
        }
        worldTransforms[boneIndex] = world;
    }

    const masks = skeleton.boneMasks ?? [];
    if (!Array.isArray(masks)) throw writeError(`skeleton ${skeletonIndex} bone masks must be an array`);
    const maskNames = new Set();
    for (let maskIndex = 0; maskIndex < masks.length; maskIndex++)
    {
        const mask = masks[maskIndex];
        validateName(mask?.name, `skeleton ${skeletonIndex} bone mask ${maskIndex} name`);
        if (!mask?.name || maskNames.has(mask.name) ||
            FBX_RESERVED_BONE_MASK_PROPERTY_NAMES.includes(mask.name))
        {
            throw writeError(`skeleton ${skeletonIndex} bone mask ${maskIndex} has an empty, duplicate, or reserved name`);
        }
        maskNames.add(mask.name);
        if (!Array.isArray(mask.weights))
        {
            throw writeError(`skeleton ${skeletonIndex} bone mask ${maskIndex} weights must be an array`);
        }
        const indices = new Set();
        for (const entry of mask.weights)
        {
            if (!Number.isInteger(entry?.index) || entry.index < 0 || entry.index >= bones.length || indices.has(entry.index))
            {
                throw writeError(`skeleton ${skeletonIndex} bone mask ${maskIndex} has an invalid or duplicate bone index`);
            }
            if (!Number.isFinite(entry.weight) || entry.weight < 0 || entry.weight > 1)
            {
                throw writeError(`skeleton ${skeletonIndex} bone mask ${maskIndex} weight must be within 0..1`);
            }
            indices.add(entry.index);
        }
    }
}

function boneProperties(skeleton, boneIndex)
{
    const rest = skeleton.restTransforms?.[boneIndex] ?? {};
    const children = [
        propertyNode("Lcl Translation", "Lcl Translation", "A", rest.position ?? [ 0, 0, 0 ]),
        propertyNode("Lcl Rotation", "Lcl Rotation", "A", quaternionToEulerXyz(rest.rotation ?? [ 0, 0, 0, 1 ])),
        propertyNode("Lcl Scaling", "Lcl Scaling", "A", rest.scale ?? [ 1, 1, 1 ])
    ];
    if (boneIndex === 0)
    {
        children.push(stringPropertyNode("CjsSkeletonName", skeleton.name ?? ""));
    }
    for (const mask of skeleton.boneMasks ?? [])
    {
        const entry = (mask.weights ?? []).find((weight) => weight.index === boneIndex);
        if (entry) children.push(propertyNode(mask.name ?? "", "Number", "U", [ entry.weight ]));
    }
    return node("Properties70", [], children);
}

function appendSkeletons(cmf, objects, connections, allocateId)
{
    const skeletonBoneIds = [];
    for (let skeletonIndex = 0; skeletonIndex < (cmf.skeletons ?? []).length; skeletonIndex++)
    {
        const skeleton = cmf.skeletons[skeletonIndex];
        validateSkeleton(skeleton, skeletonIndex);
        const bones = skeleton.bones ?? [];
        const parents = skeleton.parents ?? [];
        const ids = bones.map(() => allocateId());
        skeletonBoneIds.push(ids);
        for (let boneIndex = 0; boneIndex < bones.length; boneIndex++)
        {
            const parent = parents[boneIndex];
            objects.push(node(
                "Model",
                [ long(ids[boneIndex]), objectName(bones[boneIndex], "Model"), string("LimbNode") ],
                [ boneProperties(skeleton, boneIndex) ]
            ));
            connections.push(node("C", [
                string("OO"),
                long(ids[boneIndex]),
                long(parent === 0xffffffff ? 0 : ids[parent])
            ]));
        }

        const inverseBinds = skeleton.invBindTransforms ?? [];
        if (bones.length)
        {
            const poseChildren = [
                node("Type", [ string("BindPose") ]),
                node("Version", [ integer(100) ]),
                node("NbPoseNodes", [ integer(bones.length) ])
            ];
            for (let boneIndex = 0; boneIndex < bones.length; boneIndex++)
            {
                let bindMatrix;
                try
                {
                    bindMatrix = transposeMatrix4(invertMatrix4(inverseBinds[boneIndex]));
                }
                catch (error)
                {
                    throw writeError(`skeleton ${skeletonIndex} inverse bind ${boneIndex}: ${error.message}`);
                }
                poseChildren.push(node("PoseNode", [], [
                    node("Node", [ long(ids[boneIndex]) ]),
                    node("Matrix", [ doubleArray(bindMatrix) ])
                ]));
            }
            const poseId = allocateId();
            objects.push(node(
                "Pose",
                [ long(poseId), objectName(skeleton.name || `Skeleton_${skeletonIndex}`, "Pose"), string("BindPose") ],
                poseChildren
            ));
        }
    }
    return skeletonBoneIds;
}

function appendSkin(mesh, meshIndex, geometryId, cmf, skeletonBoneIds, objects, connections, allocateId)
{
    const bindings = mesh.boneBindings ?? [];
    if (!Array.isArray(bindings)) throw writeError(`mesh ${meshIndex} bone bindings must be an array`);
    const blendIndices = vertexData(mesh).blendIndice ?? [];
    const blendWeights = vertexData(mesh).blendWeight ?? [];
    if (!bindings.length)
    {
        if (mesh.skeleton !== null && mesh.skeleton !== undefined || blendIndices.length || blendWeights.length)
        {
            throw writeError(`mesh ${meshIndex} has skeleton or skin channels without bone bindings`);
        }
        return;
    }
    if (!Number.isInteger(mesh.skeleton) || mesh.skeleton < 0 || mesh.skeleton >= (cmf.skeletons ?? []).length)
    {
        throw writeError(`mesh ${meshIndex} has bone bindings but invalid skeleton ${mesh.skeleton}`);
    }
    const skeleton = cmf.skeletons[mesh.skeleton];
    const boneNames = skeleton.bones ?? [];
    const vertexCount = (vertexData(mesh).position ?? []).length / 3;
    if (blendIndices.length !== vertexCount * 4 || blendWeights.length !== vertexCount * 4)
    {
        throw writeError(`mesh ${meshIndex} skin channels must contain four indices and weights per vertex`);
    }
    const bindingNames = bindings.map((binding, bindingIndex) =>
    {
        if (!binding || typeof binding !== "object")
        {
            throw writeError(`mesh ${meshIndex} bone binding ${bindingIndex} must be an object`);
        }
        const name = binding.name ?? "";
        validateName(name, `mesh ${meshIndex} bone binding ${bindingIndex} name`);
        if (!name) throw writeError(`mesh ${meshIndex} bone binding ${bindingIndex} name is empty`);
        return name;
    });
    if (new Set(bindingNames).size !== bindingNames.length)
    {
        throw writeError(`mesh ${meshIndex} contains duplicate bone binding names`);
    }

    const usedBindings = new Set();
    for (let vertexIndex = 0; vertexIndex < vertexCount; vertexIndex++)
    {
        let totalWeight = 0;
        for (let component = 0; component < 4; component++)
        {
            const
                offset = vertexIndex * 4 + component,
                bindingIndex = blendIndices[offset],
                weight = blendWeights[offset];
            if (!Number.isInteger(bindingIndex) || bindingIndex < 0 || bindingIndex >= bindings.length)
            {
                throw writeError(`mesh ${meshIndex} vertex ${vertexIndex} has invalid blend index ${bindingIndex}`);
            }
            if (!Number.isFinite(weight) || weight < 0)
            {
                throw writeError(`mesh ${meshIndex} vertex ${vertexIndex} has invalid blend weight ${weight}`);
            }
            if (weight > 0)
            {
                usedBindings.add(bindingIndex);
                totalWeight += weight;
            }
        }
        if (totalWeight > 0 && Math.abs(totalWeight - 1) > 1e-4)
        {
            throw writeError(`mesh ${meshIndex} vertex ${vertexIndex} blend weights sum to ${totalWeight}, not 1`);
        }
    }
    const skinId = allocateId();
    objects.push(node(
        "Deformer",
        [ long(skinId), objectName(mesh.name || `Mesh_${meshIndex}`, "Deformer"), string("Skin") ],
        [ node("Version", [ integer(101) ]), node("Link_DeformAcuracy", [ double(50) ]) ]
    ));
    connections.push(node("C", [ string("OO"), long(skinId), long(geometryId) ]));
    for (let bindingIndex = 0; bindingIndex < bindings.length; bindingIndex++)
    {
        if (!usedBindings.has(bindingIndex)) continue;
        const name = bindingNames[bindingIndex];
        const boneIndex = boneNames.indexOf(name);
        if (boneIndex < 0)
        {
            throw writeError(`mesh ${meshIndex} bone binding "${name}" is absent from skeleton ${mesh.skeleton}`);
        }
        const weightsByVertex = new Map();
        for (let vertexIndex = 0; vertexIndex < vertexCount; vertexIndex++)
        {
            for (let component = 0; component < 4; component++)
            {
                const offset = vertexIndex * 4 + component;
                if (blendIndices[offset] !== bindingIndex || !(blendWeights[offset] > 0)) continue;
                weightsByVertex.set(vertexIndex, (weightsByVertex.get(vertexIndex) ?? 0) + blendWeights[offset]);
            }
        }
        const clusterId = allocateId();
        const indices = [ ...weightsByVertex.keys() ];
        const weights = indices.map((vertexIndex) => weightsByVertex.get(vertexIndex));
        const linkMatrix = transposeMatrix4(invertMatrix4(skeleton.invBindTransforms[boneIndex]));
        objects.push(node(
            "Deformer",
            [ long(clusterId), objectName(name, "SubDeformer"), string("Cluster") ],
            [
                node("Version", [ integer(100) ]),
                node("UserData", [ string(""), string("") ]),
                node("Indexes", [ intArray(indices) ]),
                node("Weights", [ doubleArray(weights) ]),
                node("Transform", [ doubleArray(IDENTITY_MATRIX4) ]),
                node("TransformLink", [ doubleArray(linkMatrix) ]),
                node("Mode", [ string("Normalize") ])
            ]
        ));
        connections.push(node("C", [ string("OO"), long(clusterId), long(skinId) ]));
        connections.push(node("C", [ string("OO"), long(skeletonBoneIds[mesh.skeleton][boneIndex]), long(clusterId) ]));
    }
}

function appendMorphs(mesh, meshIndex, geometryId, objects, connections, allocateId, morphChannels)
{
    const targets = mesh.morphTargets?.targets ?? [];
    const base = vertexData(mesh).position ?? [];
    const lodTargets = mesh.lods?.[0]?.morphTargets ?? [];
    const declaration = mesh.morphTargets?.decl ?? [];
    if (!Array.isArray(targets) || !Array.isArray(lodTargets) || !Array.isArray(declaration))
    {
        throw writeError(`mesh ${meshIndex} morph metadata and LOD payloads must be arrays`);
    }
    if (!targets.length)
    {
        if (lodTargets.length || declaration.length)
        {
            throw writeError(`mesh ${meshIndex} has morph payload or declaration data without target metadata`);
        }
        return [];
    }
    if (!base.length) throw writeError(`mesh ${meshIndex} cannot export morph targets without base vertices`);
    if (lodTargets.length !== targets.length)
    {
        throw writeError(`mesh ${meshIndex} morph metadata and LOD target counts differ`);
    }
    for (const element of declaration)
    {
        const channel = declarationChannel(element);
        if (![ "position", "normal", "tangent", "binormal" ].includes(channel))
        {
            throw writeError(
                `mesh ${meshIndex} morph declaration ${element?.usage ?? "unknown"}[${element?.usageIndex ?? 0}] ` +
                "is not supported by FBX export"
            );
        }
    }

    const targetNames = [];
    const uniqueTargetNames = new Set();
    for (let targetIndex = 0; targetIndex < targets.length; targetIndex++)
    {
        const target = targets[targetIndex];
        if (!target || typeof target !== "object")
        {
            throw writeError(`mesh ${meshIndex} morph target ${targetIndex} metadata must be an object`);
        }
        validateName(target.name, `mesh ${meshIndex} morph target ${targetIndex} name`);
        const name = target.name || `Morph_${targetIndex}`;
        if (uniqueTargetNames.has(name))
        {
            throw writeError(`mesh ${meshIndex} has duplicate morph target name "${name}"`);
        }
        uniqueTargetNames.add(name);
        targetNames.push(name);
    }

    const customProperties = [];
    const blendShapeId = allocateId();
    objects.push(node("Deformer", [
        long(blendShapeId),
        objectName(mesh.name || String(meshIndex), "Deformer"),
        string("BlendShape")
    ]));
    connections.push(node("C", [ string("OO"), long(blendShapeId), long(geometryId) ]));
    for (let targetIndex = 0; targetIndex < targets.length; targetIndex++)
    {
        const name = targetNames[targetIndex];
        const targetVertex = lodTargets[targetIndex]?.vertex;
        if (!targetVertex || typeof targetVertex !== "object")
        {
            throw writeError(`mesh ${meshIndex} morph target "${name}" has no LOD 0 vertex payload`);
        }
        for (const [ channel, values ] of Object.entries(targetVertex))
        {
            if (!Array.isArray(values) || !values.length) continue;
            if (![ "position", "normal", "tangent", "binormal" ].includes(channel))
            {
                throw writeError(`mesh ${meshIndex} morph target "${name}" channel "${channel}" is not supported`);
            }
        }
        const deltas = targetVertex.position?.length
            ? targetVertex.position
            : new Array(base.length).fill(0);
        if (!Array.isArray(deltas) || deltas.length !== base.length)
        {
            throw writeError(`mesh ${meshIndex} morph target "${name}" positions do not match the base mesh`);
        }
        validateFiniteArray(deltas, base.length, `mesh ${meshIndex} morph target "${name}" position`);
        const displacement = maxMorphDisplacement(deltas);
        if (!Number.isFinite(targets[targetIndex].maxDisplacement) ||
            Math.abs(targets[targetIndex].maxDisplacement - displacement) > Math.max(1e-5, displacement * 1e-5))
        {
            throw writeError(`mesh ${meshIndex} morph target "${name}" maxDisplacement does not match its deltas`);
        }

        const normalDeltas = targetVertex.normal ?? [];
        if (normalDeltas.length)
        {
            const baseNormals = vertexData(mesh).normal ?? [];
            validateFiniteArray(baseNormals, base.length, `mesh ${meshIndex} base normal`);
            validateFiniteArray(normalDeltas, base.length, `mesh ${meshIndex} morph target "${name}" normal`);
            const absoluteNormals = normalDeltas.map((value, index) => value + baseNormals[index]);
            customProperties.push(stringPropertyNode(
                `bsNormals_${name}`,
                base64Float32(expandPolygonVertexValues(mesh, absoluteNormals, 3))
            ));
        }
        for (const channel of [ "tangent", "binormal" ])
        {
            const values = targetVertex[channel] ?? [];
            if (values.length)
            {
                validateFiniteArray(values, base.length, `mesh ${meshIndex} morph target "${name}" ${channel}`);
                throw writeError(`mesh ${meshIndex} morph target "${name}" ${channel} deltas cannot be represented exactly in FBX`);
            }
        }
        const indices = [];
        const sparseDeltas = [];
        const sparseNormalDeltas = [];
        for (let vertexIndex = 0; vertexIndex < base.length / 3; vertexIndex++)
        {
            const offset = vertexIndex * 3;
            const delta = deltas.slice(offset, offset + 3);
            const normalDelta = normalDeltas.slice(offset, offset + 3);
            if (delta.some((value) => value !== 0) || normalDelta.some((value) => value !== 0))
            {
                indices.push(vertexIndex);
                sparseDeltas.push(...delta);
                if (normalDeltas.length) sparseNormalDeltas.push(...normalDelta);
            }
        }
        if (!indices.length && base.length)
        {
            indices.push(0);
            sparseDeltas.push(0, 0, 0);
            if (normalDeltas.length) sparseNormalDeltas.push(0, 0, 0);
        }
        const channelId = allocateId();
        const shapeId = allocateId();
        objects.push(node(
            "Deformer",
            [ long(channelId), objectName(name, "SubDeformer"), string("BlendShapeChannel") ],
            [ node("FullWeights", [ doubleArray([ 100 ]) ]) ]
        ));
        const shapeChildren = [
            node("Version", [ integer(100) ]),
            node("Indexes", [ intArray(indices) ]),
            node("Vertices", [ doubleArray(sparseDeltas) ])
        ];
        if (sparseNormalDeltas.length)
        {
            shapeChildren.push(node("Normals", [ doubleArray(sparseNormalDeltas) ]));
        }
        objects.push(node(
            "Geometry",
            [ long(shapeId), objectName(name, "Geometry"), string("Shape") ],
            shapeChildren
        ));
        connections.push(node("C", [ string("OO"), long(channelId), long(blendShapeId) ]));
        connections.push(node("C", [ string("OO"), long(shapeId), long(channelId) ]));
        if (!morphChannels.has(name)) morphChannels.set(name, []);
        morphChannels.get(name).push(channelId);
    }
    return customProperties;
}

function buildBoneTargetMap(cmf, skeletonBoneIds)
{
    const targets = new Map();
    for (let skeletonIndex = 0; skeletonIndex < (cmf.skeletons ?? []).length; skeletonIndex++)
    {
        const skeleton = cmf.skeletons[skeletonIndex];
        for (let boneIndex = 0; boneIndex < (skeleton.bones ?? []).length; boneIndex++)
        {
            const name = skeleton.bones[boneIndex];
            if (!targets.has(name)) targets.set(name, []);
            targets.get(name).push(skeletonBoneIds[skeletonIndex][boneIndex]);
        }
    }
    return targets;
}

function animationTick(seconds, label)
{
    if (!Number.isFinite(seconds) || seconds < 0)
    {
        throw writeError(`${label} must be a finite non-negative time`);
    }
    const tick = Math.round(seconds * FBX_TICKS_PER_SECOND);
    if (!Number.isSafeInteger(tick)) throw writeError(`${label} exceeds the safe FBX tick range`);
    return tick;
}

function decodeAnimationCurve(curve, animationIndex, channelIndex)
{
    if (!curve)
    {
        throw writeError(`animation ${animationIndex} channel ${channelIndex} references a missing curve`);
    }
    if (curve.interpolation !== "Step" && curve.interpolation !== "Linear")
    {
        throw writeError(`animation ${animationIndex} curve interpolation "${curve.interpolation}" is not supported`);
    }
    const knots = decodeElementArray(curve.knots, curve.knotType);
    const values = decodeElementArray(curve.values, curve.valueType);
    if (knots.length !== curve.knotCount || values.length !== curve.knotCount * curve.valueDimension)
    {
        throw writeError(`animation ${animationIndex} channel ${channelIndex} has inconsistent curve lengths`);
    }
    const ticks = knots.map((knot, index) => animationTick(knot, `animation ${animationIndex} knot ${index}`));
    for (let index = 1; index < ticks.length; index++)
    {
        if (ticks[index] <= ticks[index - 1])
        {
            throw writeError(`animation ${animationIndex} knots must produce strictly ascending FBX ticks`);
        }
    }
    if (values.some((value) => !Number.isFinite(value)))
    {
        throw writeError(`animation ${animationIndex} values must be finite`);
    }
    if (!ticks.length)
    {
        throw writeError(`animation ${animationIndex} channel ${channelIndex} has no keys`);
    }
    return { ...curve, knots, ticks, values };
}

function nearestAngle(value, reference)
{
    return value + 360 * Math.round((reference - value) / 360);
}

function quaternionFromEulerXyz(values)
{
    const
        toRadians = Math.PI / 360,
        x = values[0] * toRadians,
        y = values[1] * toRadians,
        z = values[2] * toRadians,
        sx = Math.sin(x),
        cx = Math.cos(x),
        sy = Math.sin(y),
        cy = Math.cos(y),
        sz = Math.sin(z),
        cz = Math.cos(z);
    return normalizeQuaternion([
        sx * cy * cz - cx * sy * sz,
        cx * sy * cz + sx * cy * sz,
        cx * cy * sz - sx * sy * cz,
        cx * cy * cz + sx * sy * sz
    ], "FBX Euler rotation");
}

function closestEulerXyz(quaternion, previous)
{
    const principal = quaternionToEulerXyz(quaternion);
    if (!previous) return principal;

    const candidates = [];
    const addCandidate = (values) => candidates.push(values.map((value, axis) => nearestAngle(value, previous[axis])));
    addCandidate(principal);
    addCandidate([ principal[0] + 180, 180 - principal[1], principal[2] + 180 ]);

    if (Math.abs(Math.abs(principal[1]) - 90) < 1e-5)
    {
        const relation = 2 * Math.atan2(quaternion[0], quaternion[3]) * 180 / Math.PI;
        for (let turn = -2; turn <= 2; turn++)
        {
            const value = relation + turn * 360;
            if (principal[1] > 0)
            {
                addCandidate([
                    (previous[0] + previous[2] + value) / 2,
                    90,
                    (previous[0] + previous[2] - value) / 2
                ]);
            }
            else
            {
                addCandidate([
                    (previous[0] - previous[2] + value) / 2,
                    -90,
                    (-previous[0] + previous[2] + value) / 2
                ]);
            }
        }
    }

    const valid = candidates.filter((candidate) =>
    {
        const converted = quaternionFromEulerXyz(candidate);
        const dot = Math.abs(converted.reduce((sum, value, index) => sum + value * quaternion[index], 0));
        return dot > 1 - 1e-6;
    });
    return (valid.length ? valid : candidates).reduce((best, candidate) =>
    {
        const score = candidate.reduce((sum, value, axis) => sum + (value - previous[axis]) ** 2, 0);
        return !best || score < best.score ? { values: candidate, score } : best;
    }, null).values;
}

function bakeQuaternionCurveToEuler(curve)
{
    const quaternions = curve.values.slice();
    try
    {
        normalizeQuaternionSeries(quaternions, "FBX rotation curve");
    }
    catch (error)
    {
        throw writeError(error.message);
    }
    const source = [];
    let previous = null;
    for (let index = 0; index < curve.ticks.length; index++)
    {
        const quaternion = quaternions.slice(index * 4, index * 4 + 4);
        previous = closestEulerXyz(quaternion, previous);
        source.push({ tick: curve.ticks[index], quaternion, euler: previous });
    }
    if (curve.interpolation === "Step" || source.length < 2)
    {
        return { ...curve, values: source.flatMap(key => key.euler), valueDimension: 3 };
    }

    const output = [ source[0] ];
    const appendSegment = (start, end, alpha0, alpha1, depth) =>
    {
        const tick = quaternionSegmentMidpointTick(start.tick, end.tick);
        if (tick <= start.tick || tick >= end.tick)
        {
            output.push(end);
            return;
        }
        const needsSubdivision = quaternionSegmentNeedsSubdivision(start.tick, end.tick, (_tick, local) =>
        {
            const
                alpha = alpha0 + (alpha1 - alpha0) * local,
                quaternion = normalizedLerpQuaternion(sourceQuaternion0, sourceQuaternion1, alpha),
                linearEuler = start.euler.map((value, axis) => value + (end.euler[axis] - value) * local),
                linearQuaternion = quaternionFromEulerXyz(linearEuler);
            return quaternionAngularDifference(quaternion, linearQuaternion);
        });
        if (!needsSubdivision)
        {
            output.push(end);
            return;
        }
        if (depth >= 12)
        {
            throw writeError("rotation curve requires more than 4096 baked keys per source segment");
        }
        const
            local = (tick - start.tick) / (end.tick - start.tick),
            alpha = alpha0 + (alpha1 - alpha0) * local,
            quaternion = normalizedLerpQuaternion(sourceQuaternion0, sourceQuaternion1, alpha),
            linearEuler = start.euler.map((value, axis) => value + (end.euler[axis] - value) * local);
        const middle = { tick, quaternion, euler: closestEulerXyz(quaternion, linearEuler) };
        appendSegment(start, middle, alpha0, alpha, depth + 1);
        appendSegment(middle, end, alpha, alpha1, depth + 1);
    };

    let sourceQuaternion0;
    let sourceQuaternion1;
    for (let index = 1; index < source.length; index++)
    {
        sourceQuaternion0 = source[index - 1].quaternion;
        sourceQuaternion1 = source[index].quaternion;
        appendSegment(source[index - 1], source[index], 0, 1, 0);
    }
    return {
        ...curve,
        ticks: output.map(key => key.tick),
        values: output.flatMap(key => key.euler),
        valueDimension: 3
    };
}

function animationCurveNodeChildren(curve, component)
{
    const values = [];
    for (let index = component; index < curve.values.length; index += curve.valueDimension)
    {
        values.push(curve.values[index]);
    }
    return [
        node("Default", [ double(values[0] ?? 0) ]),
        node("KeyVer", [ integer(4009) ]),
        node("KeyTime", [ longArray(curve.ticks) ]),
        node("KeyValueFloat", [ floatArray(values) ]),
        node("KeyAttrFlags", [ intArray([ curve.interpolation === "Step" ? 0x02 : 0x04 ]) ]),
        node("KeyAttrDataFloat", [ floatArray([ 0, 0, 0, 0 ]) ]),
        node("KeyAttrRefCount", [ intArray([ curve.ticks.length ]) ])
    ];
}

function timePropertyNode(name, tick)
{
    return node("P", [ string(name), string("KTime"), string("Time"), string(""), long(tick) ]);
}

function appendAnimationCurve(
    objects,
    connections,
    allocateId,
    curveNodeId,
    label,
    curve,
    component,
    property
)
{
    const curveId = allocateId();
    objects.push(node(
        "AnimationCurve",
        [ long(curveId), objectName(label, "AnimCurve"), string("") ],
        animationCurveNodeChildren(curve, component)
    ));
    connections.push(node("C", [ string("OP"), long(curveId), long(curveNodeId), string(property) ]));
}

function appendAnimations(
    cmf,
    objects,
    connections,
    allocateId,
    skeletonBoneIds,
    morphChannels
)
{
    const boneTargets = buildBoneTargetMap(cmf, skeletonBoneIds);
    for (let animationIndex = 0; animationIndex < (cmf.animations ?? []).length; animationIndex++)
    {
        const animation = cmf.animations[animationIndex];
        if (!animation || typeof animation !== "object")
        {
            throw writeError(`animation ${animationIndex} must be an object`);
        }
        validateName(animation.name, `animation ${animationIndex} name`);
        if (!Array.isArray(animation.channels) || !Array.isArray(animation.curves))
        {
            throw writeError(`animation ${animationIndex} channels and curves must be arrays`);
        }
        if (!animation.channels.length)
        {
            throw writeError(`animation ${animationIndex} has no channels`);
        }
        const durationTick = animationTick(animation.duration ?? 0, `animation ${animationIndex} duration`);
        const stackId = allocateId();
        const layerId = allocateId();
        const name = animation.name || `Animation_${animationIndex}`;
        objects.push(node(
            "AnimationStack",
            [ long(stackId), objectName(name, "AnimStack"), string("") ],
            [ node("Properties70", [], [
                timePropertyNode("LocalStart", 0),
                timePropertyNode("LocalStop", durationTick)
            ]) ]
        ));
        objects.push(node(
            "AnimationLayer",
            [ long(layerId), objectName("BaseLayer", "AnimLayer"), string("") ],
            [],
            true
        ));
        connections.push(node("C", [ string("OO"), long(layerId), long(stackId) ]));

        const usedCurves = new Set();
        for (let channelIndex = 0; channelIndex < (animation.channels ?? []).length; channelIndex++)
        {
            const channel = animation.channels[channelIndex];
            if (!channel || typeof channel !== "object" || !Number.isInteger(channel.curveIndex))
            {
                throw writeError(`animation ${animationIndex} channel ${channelIndex} is malformed`);
            }
            usedCurves.add(channel.curveIndex);
            const curve = decodeAnimationCurve(animation.curves?.[channel.curveIndex], animationIndex, channelIndex);
            if (curve.ticks.length && curve.ticks[curve.ticks.length - 1] > durationTick)
            {
                throw writeError(`animation ${animationIndex} duration ends before channel ${channelIndex}`);
            }
            const curveNodeId = allocateId();
            const target = channel.target ?? "";
            validateName(target, `animation ${animationIndex} channel ${channelIndex} target`);
            if (!target) throw writeError(`animation ${animationIndex} channel ${channelIndex} target is empty`);
            objects.push(node(
                "AnimationCurveNode",
                [ long(curveNodeId), objectName(`${target}_${channel.targetType}`, "AnimCurveNode"), string("") ]
            ));
            connections.push(node("C", [ string("OO"), long(curveNodeId), long(layerId) ]));

            if (channel.targetType === "MorphTarget")
            {
                if (curve.valueDimension !== 1) throw writeError(`morph animation "${target}" must have dimension 1`);
                const targets = morphChannels.get(target) ?? [];
                if (!targets.length) throw writeError(`morph animation target "${target}" was not exported`);
                curve.values = curve.values.map((value) => value * 100);
                for (const channelId of targets)
                {
                    connections.push(node("C", [ string("OP"), long(curveNodeId), long(channelId), string("DeformPercent") ]));
                }
                appendAnimationCurve(
                    objects,
                    connections,
                    allocateId,
                    curveNodeId,
                    `${name}_${target}`,
                    curve,
                    0,
                    "d|DeformPercent"
                );
                continue;
            }

            const boneIds = boneTargets.get(target) ?? [];
            if (boneIds.length !== 1)
            {
                throw writeError(`bone animation target "${target}" resolves to ${boneIds.length} exported bones`);
            }
            let property;
            if (channel.targetType === "BonePosition") property = "Lcl Translation";
            else if (channel.targetType === "BoneRotation") property = "Lcl Rotation";
            else if (channel.targetType === "BoneScale") property = "Lcl Scaling";
            else throw writeError(`animation target type "${channel.targetType}" is not supported`);
            const expectedDimension = channel.targetType === "BoneRotation" ? 4 : 3;
            if (curve.valueDimension !== expectedDimension)
            {
                throw writeError(`${channel.targetType} animation "${target}" must have dimension ${expectedDimension}`);
            }
            if (channel.targetType === "BoneRotation")
            {
                Object.assign(curve, bakeQuaternionCurveToEuler(curve));
            }
            connections.push(node("C", [ string("OP"), long(curveNodeId), long(boneIds[0]), string(property) ]));
            for (let component = 0; component < 3; component++)
            {
                const axis = "XYZ"[component];
                appendAnimationCurve(
                    objects,
                    connections,
                    allocateId,
                    curveNodeId,
                    `${name}_${target}_${axis}`,
                    curve,
                    component,
                    `d|${axis}`
                );
            }
        }
        if (usedCurves.size !== animation.curves.length ||
            [ ...usedCurves ].some(index => index < 0 || index >= animation.curves.length))
        {
            throw writeError(`animation ${animationIndex} contains an unused or invalid curve`);
        }
    }
}

function integerPropertyNode(name, value)
{
    return node("P", [ string(name), string("int"), string("Integer"), string(""), integer(value) ]);
}

function numberPropertyNode(name, value)
{
    return node("P", [ string(name), string("double"), string("Number"), string(""), double(value) ]);
}

function headerNodes(version)
{
    return [
        node("FBXHeaderExtension", [], [
            node("FBXHeaderVersion", [ integer(1003) ]),
            node("FBXVersion", [ integer(version) ]),
            node("EncryptionType", [ integer(0) ]),
            node("CreationTimeStamp", [], [
                node("Version", [ integer(1000) ]),
                node("Year", [ integer(1970) ]),
                node("Month", [ integer(1) ]),
                node("Day", [ integer(1) ]),
                node("Hour", [ integer(10) ]),
                node("Minute", [ integer(0) ]),
                node("Second", [ integer(0) ]),
                node("Millisecond", [ integer(0) ])
            ]),
            node("Creator", [ string("CarbonEngineJS") ]),
            node("SceneInfo", [ string("GlobalInfo\u0000\u0001SceneInfo"), string("UserData") ], [
                node("Type", [ string("UserData") ]),
                node("Version", [ integer(100) ]),
                node("MetaData", [], [
                    node("Version", [ integer(100) ]),
                    node("Title", [ string("") ]),
                    node("Subject", [ string("") ]),
                    node("Author", [ string("CarbonEngineJS") ]),
                    node("Keywords", [ string("") ]),
                    node("Revision", [ string("") ]),
                    node("Comment", [ string("") ])
                ])
            ])
        ]),
        node("FileId", [ raw(FILE_ID) ]),
        node("CreationTime", [ string("1970-01-01 10:00:00:000") ]),
        node("Creator", [ string("CarbonEngineJS") ]),
        node("GlobalSettings", [], [
            node("Version", [ integer(1000) ]),
            node("Properties70", [], [
                integerPropertyNode("UpAxis", 1),
                integerPropertyNode("UpAxisSign", 1),
                integerPropertyNode("FrontAxis", 2),
                integerPropertyNode("FrontAxisSign", 1),
                integerPropertyNode("CoordAxis", 0),
                integerPropertyNode("CoordAxisSign", 1),
                integerPropertyNode("OriginalUpAxis", 1),
                integerPropertyNode("OriginalUpAxisSign", 1),
                numberPropertyNode("UnitScaleFactor", 100),
                numberPropertyNode("OriginalUnitScaleFactor", 100)
            ])
        ])
    ];
}

function documentNodes(objects, animations)
{
    const counts = new Map();
    for (const object of objects) counts.set(object.name, (counts.get(object.name) ?? 0) + 1);
    const definitionChildren = [
        node("Version", [ integer(100) ]),
        node("Count", [ integer(objects.length) ])
    ];
    for (const [ name, count ] of [ ...counts ].sort(([ a ], [ b ]) => a.localeCompare(b)))
    {
        definitionChildren.push(node("ObjectType", [ string(name) ], [
            node("Count", [ integer(count) ])
        ]));
    }
    return [
        node("Documents", [], [
            node("Count", [ integer(1) ]),
            node("Document", [ long(0x434a53464e58444fn), string("Scene"), string("Scene") ], [
                node("Properties70", [], [
                    node("P", [ string("SourceObject"), string("object"), string(""), string("") ]),
                    stringPropertyNode("ActiveAnimStackName", animations[0]?.name ?? "")
                ]),
                node("RootNode", [ long(0) ])
            ])
        ]),
        node("References", [], [], true),
        node("Definitions", [], definitionChildren)
    ];
}

function takesNode(animations)
{
    const children = [ node("Current", [ string(animations[0]?.name ?? "") ]) ];
    for (let index = 0; index < animations.length; index++)
    {
        const
            animation = animations[index],
            name = animation.name || `Animation_${index}`,
            stop = animationTick(animation.duration ?? 0, `animation ${index} duration`);
        children.push(node("Take", [ string(name) ], [
            node("FileName", [ string("") ]),
            node("LocalTime", [ long(0), long(stop) ]),
            node("ReferenceTime", [ long(0), long(stop) ])
        ]));
    }
    return node("Takes", [], children);
}

function buildDocument(cmf, options)
{
    if (!cmf || !Array.isArray(cmf.meshes))
    {
        throw writeError("input must be a native CMF root with a meshes array");
    }
    if (!Array.isArray(cmf.skeletons ?? []) || !Array.isArray(cmf.animations ?? []))
    {
        throw writeError("CMF skeletons and animations must be arrays");
    }

    const objects = [];
    const connections = [];
    let nextId = 1n;
    const allocateId = () => nextId++;
    const skeletonBoneIds = appendSkeletons(cmf, objects, connections, allocateId);
    const morphChannels = new Map();
    for (let meshIndex = 0; meshIndex < cmf.meshes.length; meshIndex++)
    {
        const mesh = cmf.meshes[meshIndex];
        validateMesh(mesh, meshIndex);
        const geometryId = allocateId();
        const modelId = allocateId();
        const name = mesh.name || `Mesh_${meshIndex}`;
        objects.push(node(
            "Geometry",
            [ long(geometryId), objectName(name, "Geometry"), string("Mesh") ],
            geometryChildren(mesh, meshIndex, options)
        ));
        const model = node("Model", [ long(modelId), objectName(name, "Model"), string("Mesh") ]);
        objects.push(model);
        connections.push(node("C", [ string("OO"), long(geometryId), long(modelId) ]));
        connections.push(node("C", [ string("OO"), long(modelId), long(0) ]));

        for (let groupIndex = 0; groupIndex < indexGroups(mesh).length; groupIndex++)
        {
            const materialId = allocateId();
            const materialName = indexGroups(mesh)[groupIndex].name ?? `Material_${groupIndex}`;
            objects.push(node("Material", [ long(materialId), objectName(materialName, "Material"), string("") ]));
            connections.push(node("C", [ string("OO"), long(materialId), long(modelId) ]));
        }
        appendSkin(mesh, meshIndex, geometryId, cmf, skeletonBoneIds, objects, connections, allocateId);
        const morphProperties = appendMorphs(
            mesh,
            meshIndex,
            geometryId,
            objects,
            connections,
            allocateId,
            morphChannels
        );
        if (morphProperties.length) model.children.push(node("Properties70", [], morphProperties));
    }
    appendAnimations(cmf, objects, connections, allocateId, skeletonBoneIds, morphChannels);

    return [
        ...headerNodes(options.version ?? VERSION_7400),
        ...documentNodes(objects, cmf.animations ?? []),
        node("Objects", [], objects, true),
        node("Connections", [], connections, true),
        takesNode(cmf.animations ?? [])
    ];
}

function writeProperty(writer, property)
{
    writer.u8(property.type.charCodeAt(0));
    switch (property.type)
    {
        case "L":
            writer.i64(property.value);
            break;
        case "I":
            writer.i32(property.value);
            break;
        case "D":
            writer.f64(property.value);
            break;
        case "S":
        {
            const bytes = textEncoder.encode(property.value);
            writer.u32(bytes.byteLength);
            writer.bytes(bytes);
            break;
        }
        case "R":
            writer.u32(property.value.byteLength);
            writer.bytes(property.value);
            break;
        case "d":
            writer.u32(property.values.length);
            writer.u32(0);
            writer.u32(property.values.length * 8);
            for (const value of property.values) writer.f64(value);
            break;
        case "i":
            writer.u32(property.values.length);
            writer.u32(0);
            writer.u32(property.values.length * 4);
            for (const value of property.values) writer.i32(value);
            break;
        case "f":
            writer.u32(property.values.length);
            writer.u32(0);
            writer.u32(property.values.length * 4);
            for (const value of property.values) writer.f32(value);
            break;
        case "l":
            writer.u32(property.values.length);
            writer.u32(0);
            writer.u32(property.values.length * 8);
            for (const value of property.values) writer.i64(value);
            break;
        default:
            throw writeError(`unsupported property type "${property.type}"`);
    }
}

function encodeProperties(properties)
{
    const writer = new CjsByteWriter();
    for (const property of properties) writeProperty(writer, property);
    return writer.toBytes();
}

function writeNode(writer, value)
{
    const name = textEncoder.encode(value.name);
    if (name.byteLength > 255)
    {
        throw writeError(`node name "${value.name}" exceeds 255 UTF-8 bytes`);
    }
    const properties = encodeProperties(value.properties);
    const endOffset = writer.u32(0);
    writer.u32(value.properties.length);
    writer.u32(properties.byteLength);
    writer.u8(name.byteLength);
    writer.bytes(name);
    writer.bytes(properties);
    for (const child of value.children) writeNode(writer, child);
    if (value.children.length || value.forceSentinel) writer.reserve(NULL_RECORD_SIZE);
    if (writer.length > 0xffffffff)
    {
        throw writeError("FBX 7400 output exceeds the 32-bit node offset limit");
    }
    writer.patchU32(endOffset, writer.length);
}

/**
 * Write a deterministic, uncompressed binary FBX 7400 document from native CMF.
 *
 * The output uses the standard binary document envelope and an uncompressed
 * geometry/deformation subset shared with the runtime reader.
 */
export function writeFbx(cmf, options = {})
{
    const version = options.version ?? VERSION_7400;
    if (version !== VERSION_7400)
    {
        throw writeError(`only binary FBX ${VERSION_7400} is supported`);
    }

    const writer = new CjsByteWriter();
    writer.utf8(BINARY_SIGNATURE);
    writer.u32(version);
    for (const root of buildDocument(cmf, options)) writeNode(writer, root);
    writer.reserve(NULL_RECORD_SIZE);
    writer.bytes(FOOT_ID);
    writer.u32(0);
    let padding = (16 - (writer.length % 16)) % 16;
    if (!padding) padding = 16;
    writer.reserve(padding);
    writer.u32(version);
    writer.reserve(120);
    writer.bytes(FOOT_MAGIC);
    return writer.toBytes();
}

/** Convert shared/GR2-shaped geometry through CMF and write binary FBX. */
export function writeSharedFbx(input, options = {})
{
    return writeFbx(buildCmfFromShared(input, options), options);
}

export default writeFbx;
