import { asUint8Array } from "#utils/bytes";

/**
 * glTF/GLB parser that emits the shared CarbonEngineJS geometry JSON shape.
 */

const GLB_MAGIC = 0x46546c67;
const GLB_JSON = 0x4e4f534a;
const GLB_BIN = 0x004e4942;

const COMPONENT_SIZES = Object.freeze({
    5120: 1,
    5121: 1,
    5122: 2,
    5123: 2,
    5125: 4,
    5126: 4
});

const TYPE_WIDTHS = Object.freeze({
    SCALAR: 1,
    VEC2: 2,
    VEC3: 3,
    VEC4: 4,
    MAT2: 4,
    MAT3: 9,
    MAT4: 16
});

const CHANNEL_TEMPLATE = Object.freeze({
    position: null,
    blendIndice: null,
    tangent: null,
    normal: null,
    texcoord0: null,
    texcoord1: null,
    binormal: null,
    blendWeight: null
});

function fr(value)
{
    return Number.isFinite(value) ? Math.fround(value) : 0;
}

function createVertexChannels()
{
    const channels = {};
    for (const key of Object.keys(CHANNEL_TEMPLATE))
    {
        channels[key] = [];
    }
    return channels;
}

/** Returns a byte view over the supplied binary input for the glTF format reader. */function toUtf8(bytes)
{
    return new TextDecoder().decode(bytes);
}

function isGlbBytes(bytes)
{
    return bytes.length >= 12 && new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, true) === GLB_MAGIC;
}

/** Reports whether the current glTF format reader satisfies glb. */
export function isGlb(input)
{
    try
    {
        return isGlbBytes(asUint8Array(input, "CjsGltfFormat input"));
    }
    catch
    {
        return false;
    }
}

function parseJsonText(text)
{
    const json = JSON.parse(text);
    if (!json || typeof json !== "object" || !json.asset)
    {
        throw new Error("CjsGltfFormat: JSON input is not a glTF asset");
    }
    return json;
}

/** Parses input from the current glTF format reader. */
export function parseInput(input)
{
    if (input && typeof input === "object" && !(input instanceof ArrayBuffer) && !ArrayBuffer.isView(input))
    {
        if (!input.asset) throw new Error("CjsGltfFormat: object input is not a glTF asset");
        return { gltf: input, binaryChunk: null, format: "gltf" };
    }

    if (typeof input === "string")
    {
        return { gltf: parseJsonText(input), binaryChunk: null, format: "gltf" };
    }

    const bytes = asUint8Array(input, "CjsGltfFormat input");
    if (isGlbBytes(bytes)) return parseGlb(bytes);
    return { gltf: parseJsonText(toUtf8(bytes)), binaryChunk: null, format: "gltf" };
}

function parseGlb(bytes)
{
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const version = view.getUint32(4, true);
    if (version !== 2)
    {
        throw new Error(`CjsGltfFormat: unsupported GLB version ${version}`);
    }

    const totalLength = view.getUint32(8, true);
    if (totalLength > bytes.byteLength)
    {
        throw new Error("CjsGltfFormat: GLB length exceeds input length");
    }

    let offset = 12;
    let json = null;
    let binaryChunk = null;

    while (offset + 8 <= totalLength)
    {
        const
            chunkLength = view.getUint32(offset, true),
            chunkType = view.getUint32(offset + 4, true),
            chunkStart = offset + 8,
            chunkEnd = chunkStart + chunkLength;

        if (chunkEnd > totalLength)
        {
            throw new Error("CjsGltfFormat: GLB chunk exceeds input length");
        }

        const chunk = bytes.subarray(chunkStart, chunkEnd);
        if (chunkType === GLB_JSON) json = parseJsonText(toUtf8(chunk).trim());
        else if (chunkType === GLB_BIN) binaryChunk = chunk;
        offset = (chunkEnd + 3) & ~3;
    }

    if (!json) throw new Error("CjsGltfFormat: GLB is missing a JSON chunk");
    return { gltf: json, binaryChunk, format: "glb" };
}

function decodeDataUri(uri)
{
    const match = /^data:([^,]*?),(.*)$/s.exec(uri);
    if (!match) return null;

    const
        meta = match[1],
        data = match[2];

    if (meta.includes(";base64"))
    {
        if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(data, "base64"));
        const text = atob(data);
        const bytes = new Uint8Array(text.length);
        for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i);
        return bytes;
    }

    return new TextEncoder().encode(decodeURIComponent(data));
}

function normalizeBuffer(value)
{
    if (value === undefined || value === null) return null;
    return asUint8Array(value, "CjsGltfFormat input");
}

function bufferFromOptions(options, index, uri)
{
    const { buffers } = options;
    if (!buffers) return null;
    if (Array.isArray(buffers)) return normalizeBuffer(buffers[index]);
    if (buffers instanceof Map) return normalizeBuffer(buffers.get(uri) ?? buffers.get(index));
    if (typeof buffers === "object") return normalizeBuffer(buffers[uri] ?? buffers[index]);
    return null;
}

function resolveBuffers(gltf, binaryChunk, options)
{
    return (gltf.buffers || []).map((buffer, index) =>
    {
        if (buffer.uri)
        {
            const dataUri = decodeDataUri(buffer.uri);
            if (dataUri) return dataUri;

            const fromOptions = bufferFromOptions(options, index, buffer.uri);
            if (fromOptions) return fromOptions;

            throw new Error(`CjsGltfFormat: external buffer ${JSON.stringify(buffer.uri)} was not provided`);
        }

        const fromOptions = bufferFromOptions(options, index, String(index));
        if (fromOptions) return fromOptions;
        if (index === 0 && binaryChunk) return binaryChunk;

        throw new Error(`CjsGltfFormat: buffer ${index} has no uri and no GLB binary chunk`);
    });
}

function readComponent(view, offset, componentType)
{
    switch (componentType)
    {
        case 5120: return view.getInt8(offset);
        case 5121: return view.getUint8(offset);
        case 5122: return view.getInt16(offset, true);
        case 5123: return view.getUint16(offset, true);
        case 5125: return view.getUint32(offset, true);
        case 5126: return view.getFloat32(offset, true);
        default: throw new Error(`CjsGltfFormat: unsupported componentType ${componentType}`);
    }
}

function normalizeComponent(value, componentType)
{
    switch (componentType)
    {
        case 5120: return Math.max(value / 127, -1);
        case 5121: return value / 255;
        case 5122: return Math.max(value / 32767, -1);
        case 5123: return value / 65535;
        default: return value;
    }
}

function readAccessorRaw(gltf, buffers, accessorIndex, { normalize = true } = {})
{
    const accessor = gltf.accessors && gltf.accessors[accessorIndex];
    if (!accessor) throw new Error(`CjsGltfFormat: missing accessor ${accessorIndex}`);

    const
        width = TYPE_WIDTHS[accessor.type],
        componentSize = COMPONENT_SIZES[accessor.componentType];

    if (!width) throw new Error(`CjsGltfFormat: unsupported accessor type ${accessor.type}`);
    if (!componentSize) throw new Error(`CjsGltfFormat: unsupported componentType ${accessor.componentType}`);

    const out = new Array(accessor.count * width).fill(0);
    if (accessor.bufferView !== undefined)
    {
        const bufferView = gltf.bufferViews && gltf.bufferViews[accessor.bufferView];
        if (!bufferView) throw new Error(`CjsGltfFormat: missing bufferView ${accessor.bufferView}`);

        const
            buffer = buffers[bufferView.buffer],
            byteOffset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0),
            byteStride = bufferView.byteStride || width * componentSize,
            view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

        for (let i = 0; i < accessor.count; i++)
        {
            const elementOffset = byteOffset + i * byteStride;
            for (let c = 0; c < width; c++)
            {
                let value = readComponent(view, elementOffset + c * componentSize, accessor.componentType);
                if (accessor.normalized && normalize) value = normalizeComponent(value, accessor.componentType);
                out[i * width + c] = fr(value);
            }
        }
    }

    if (accessor.sparse)
    {
        applySparseAccessor(gltf, buffers, accessor, out, width, normalize);
    }

    return { values: out, width, accessor };
}

function applySparseAccessor(gltf, buffers, accessor, out, width, normalize)
{
    const
        sparse = accessor.sparse,
        indicesView = gltf.bufferViews[sparse.indices.bufferView],
        valuesView = gltf.bufferViews[sparse.values.bufferView],
        indicesBuffer = buffers[indicesView.buffer],
        valuesBuffer = buffers[valuesView.buffer],
        indicesData = new DataView(indicesBuffer.buffer, indicesBuffer.byteOffset, indicesBuffer.byteLength),
        valuesData = new DataView(valuesBuffer.buffer, valuesBuffer.byteOffset, valuesBuffer.byteLength),
        indexOffset = (indicesView.byteOffset || 0) + (sparse.indices.byteOffset || 0),
        valueOffset = (valuesView.byteOffset || 0) + (sparse.values.byteOffset || 0),
        indexSize = COMPONENT_SIZES[sparse.indices.componentType],
        valueSize = COMPONENT_SIZES[accessor.componentType];

    for (let i = 0; i < sparse.count; i++)
    {
        const outputIndex = readComponent(indicesData, indexOffset + i * indexSize, sparse.indices.componentType);
        for (let c = 0; c < width; c++)
        {
            let value = readComponent(valuesData, valueOffset + (i * width + c) * valueSize, accessor.componentType);
            if (accessor.normalized && normalize) value = normalizeComponent(value, accessor.componentType);
            out[outputIndex * width + c] = fr(value);
        }
    }
}

function readAccessor(gltf, buffers, accessorIndex, options)
{
    return readAccessorRaw(gltf, buffers, accessorIndex, options).values;
}

function readIndices(gltf, buffers, accessorIndex, vertexCount, mode)
{
    const raw = accessorIndex === undefined
        ? Array.from({ length: vertexCount }, (_, i) => i)
        : readAccessor(gltf, buffers, accessorIndex, { normalize: false }).map(value => value >>> 0);

    if (mode === undefined || mode === 4) return raw;
    if (mode === 5) return triangulateStrip(raw);
    if (mode === 6) return triangulateFan(raw);
    throw new Error(`CjsGltfFormat: primitive mode ${mode} is not supported`);
}

function triangulateStrip(indices)
{
    const faces = [];
    for (let i = 0; i < indices.length - 2; i++)
    {
        if (i & 1) faces.push(indices[i + 1], indices[i], indices[i + 2]);
        else faces.push(indices[i], indices[i + 1], indices[i + 2]);
    }
    return faces;
}

function triangulateFan(indices)
{
    const faces = [];
    for (let i = 1; i < indices.length - 1; i++)
    {
        faces.push(indices[0], indices[i], indices[i + 1]);
    }
    return faces;
}

function copyAttribute(gltf, buffers, attributes, gltfKey)
{
    if (!attributes || attributes[gltfKey] === undefined) return [];
    return readAccessor(gltf, buffers, attributes[gltfKey]);
}

function computeBounds(positions)
{
    if (!positions.length) return { minBounds: [ 0, 0, 0 ], maxBounds: [ 0, 0, 0 ] };
    const minBounds = [ positions[0], positions[1], positions[2] ];
    const maxBounds = [ positions[0], positions[1], positions[2] ];
    for (let i = 3; i < positions.length; i += 3)
    {
        for (let c = 0; c < 3; c++)
        {
            const value = positions[i + c];
            if (value < minBounds[c]) minBounds[c] = value;
            if (value > maxBounds[c]) maxBounds[c] = value;
        }
    }
    return { minBounds, maxBounds };
}

function meshName(gltf, meshIndex, primitiveIndex, nodeIndex)
{
    const
        node = nodeIndex === undefined ? null : gltf.nodes && gltf.nodes[nodeIndex],
        mesh = gltf.meshes && gltf.meshes[meshIndex],
        base = (node && node.name) || (mesh && mesh.name) || `mesh_${meshIndex}`;
    return primitiveIndex ? `${base}_${primitiveIndex}` : base;
}

function materialName(gltf, primitive, primitiveIndex)
{
    if (primitive.material !== undefined)
    {
        const material = gltf.materials && gltf.materials[primitive.material];
        return (material && material.name) || `material_${primitive.material}`;
    }
    return `primitive_${primitiveIndex}`;
}

function buildMorphTargets(gltf, buffers, primitive, mesh)
{
    const targetNames = (mesh.extras && mesh.extras.targetNames) || [];
    return (primitive.targets || []).map((target, index) => ({
        name: targetNames[index] || `target_${index}`,
        dataIsDeltas: true,
        vertex: {
            position: copyAttribute(gltf, buffers, target, "POSITION"),
            blendIndice: [],
            tangent: copyAttribute(gltf, buffers, target, "TANGENT"),
            normal: copyAttribute(gltf, buffers, target, "NORMAL"),
            texcoord0: [],
            texcoord1: [],
            binormal: [],
            blendWeight: []
        }
    }));
}

function buildMeshPrimitive(gltf, buffers, meshIndex, primitiveIndex, nodeIndex, boneBindings)
{
    const
        mesh = gltf.meshes[meshIndex],
        primitive = mesh.primitives[primitiveIndex],
        vertex = createVertexChannels();

    vertex.position = copyAttribute(gltf, buffers, primitive.attributes, "POSITION");
    vertex.normal = copyAttribute(gltf, buffers, primitive.attributes, "NORMAL");
    vertex.tangent = copyAttribute(gltf, buffers, primitive.attributes, "TANGENT");
    vertex.texcoord0 = copyAttribute(gltf, buffers, primitive.attributes, "TEXCOORD_0");
    vertex.texcoord1 = copyAttribute(gltf, buffers, primitive.attributes, "TEXCOORD_1");
    vertex.blendIndice = copyAttribute(gltf, buffers, primitive.attributes, "JOINTS_0");
    vertex.blendWeight = copyAttribute(gltf, buffers, primitive.attributes, "WEIGHTS_0");

    const
        vertexCount = vertex.position.length / 3,
        faces = readIndices(gltf, buffers, primitive.indices, vertexCount, primitive.mode),
        bytesPerIndex = faces.some(index => index > 0xffff) ? 4 : 2,
        { minBounds, maxBounds } = computeBounds(vertex.position);

    return {
        name: meshName(gltf, meshIndex, primitiveIndex, nodeIndex),
        morphTargets: buildMorphTargets(gltf, buffers, primitive, mesh),
        minBounds,
        maxBounds,
        boneBindings,
        vertex,
        indices: [ {
            name: materialName(gltf, primitive, primitiveIndex),
            bytesPerIndex,
            faces
        } ]
    };
}

function parentMap(gltf)
{
    const parents = new Map();
    for (let i = 0; i < (gltf.nodes || []).length; i++)
    {
        for (const child of gltf.nodes[i].children || [])
        {
            parents.set(child, i);
        }
    }
    return parents;
}

function nodeName(gltf, nodeIndex)
{
    const node = gltf.nodes && gltf.nodes[nodeIndex];
    return (node && node.name) || `node_${nodeIndex}`;
}

function nodeTransform(node)
{
    if (node.matrix)
    {
        return decomposeMatrix(node.matrix);
    }

    const
        position = (node.translation || [ 0, 0, 0 ]).map(fr),
        orientation = (node.rotation || [ 0, 0, 0, 1 ]).map(fr),
        scale = node.scale || [ 1, 1, 1 ];

    return {
        position,
        orientation,
        scaleShear: [
            fr(scale[0]), 0, 0,
            0, fr(scale[1]), 0,
            0, 0, fr(scale[2])
        ]
    };
}

function decomposeMatrix(matrix)
{
    const
        position = [ fr(matrix[12] || 0), fr(matrix[13] || 0), fr(matrix[14] || 0) ],
        sx = Math.hypot(matrix[0], matrix[1], matrix[2]) || 1,
        sy = Math.hypot(matrix[4], matrix[5], matrix[6]) || 1,
        sz = Math.hypot(matrix[8], matrix[9], matrix[10]) || 1;

    return {
        position,
        orientation: [ 0, 0, 0, 1 ],
        scaleShear: [
            fr(sx), 0, 0,
            0, fr(sy), 0,
            0, 0, fr(sz)
        ]
    };
}

function buildSkeleton(gltf, skinIndex, parents)
{
    const
        skin = gltf.skins[skinIndex],
        joints = skin.joints || [],
        jointLookup = new Map(joints.map((nodeIndex, index) => [ nodeIndex, index ]));

    return {
        name: skin.name || `skin_${skinIndex}`,
        bones: joints.map(nodeIndex =>
        {
            const
                node = gltf.nodes[nodeIndex] || {},
                parentIndex = jointLookup.has(parents.get(nodeIndex)) ? jointLookup.get(parents.get(nodeIndex)) : -1,
                transform = nodeTransform(node);

            return {
                name: nodeName(gltf, nodeIndex),
                parentIndex,
                flag: 7,
                position: transform.position,
                orientation: transform.orientation,
                scaleShear: transform.scaleShear,
                extendedData: {
                    gltfNode: nodeIndex
                }
            };
        })
    };
}

function buildBoneBindings(skeleton)
{
    return skeleton.bones.map(bone => ({
        name: bone.name,
        minBounds: [ 0, 0, 0 ],
        maxBounds: [ 0, 0, 0 ]
    }));
}

function collectMeshNodes(gltf)
{
    const nodes = [];
    for (let i = 0; i < (gltf.nodes || []).length; i++)
    {
        if (gltf.nodes[i].mesh !== undefined) nodes.push(i);
    }
    if (nodes.length) return nodes;
    return (gltf.meshes || []).map((_, index) => ({ meshIndex: index }));
}

function makeCurve(path, dimension, knots, controls, interpolation, generated = false)
{
    return {
        source: {
            format: 1,
            degree: interpolation === "STEP" ? 0 : 1,
            interpolation,
            path,
            generated
        },
        uncompressed: {
            dimension,
            knots: knots.map(fr),
            controls: controls.map(fr)
        }
    };
}

function identityCurve(path, duration)
{
    if (path === "position")
    {
        return makeCurve(path, 3, [ 0, duration ], [ 0, 0, 0, 0, 0, 0 ], "STEP", true);
    }
    if (path === "orientation")
    {
        return makeCurve(path, 4, [ 0, duration ], [ 0, 0, 0, 1, 0, 0, 0, 1 ], "STEP", true);
    }
    return makeCurve(path, 9, [ 0, duration ], [
        1, 0, 0, 0, 1, 0, 0, 0, 1,
        1, 0, 0, 0, 1, 0, 0, 0, 1
    ], "STEP", true);
}

function scaleToScaleShear(values, interpolation)
{
    const controls = interpolation === "CUBICSPLINE"
        ? cubicSplineValues(values, 3)
        : values;

    const out = [];
    for (let i = 0; i < controls.length; i += 3)
    {
        out.push(
            controls[i], 0, 0,
            0, controls[i + 1], 0,
            0, 0, controls[i + 2]
        );
    }
    return out;
}

function cubicSplineValues(values, dimension)
{
    const out = [];
    for (let i = 0; i < values.length; i += dimension * 3)
    {
        for (let c = 0; c < dimension; c++)
        {
            out.push(values[i + dimension + c]);
        }
    }
    return out;
}

function channelCurve(gltf, buffers, animation, channel)
{
    const
        sampler = animation.samplers[channel.sampler],
        interpolation = sampler.interpolation || "LINEAR",
        knots = readAccessor(gltf, buffers, sampler.input),
        rawControls = readAccessor(gltf, buffers, sampler.output),
        path = channel.target.path;

    if (path === "translation")
    {
        const controls = interpolation === "CUBICSPLINE" ? cubicSplineValues(rawControls, 3) : rawControls;
        return { path: "position", curve: makeCurve("position", 3, knots, controls, interpolation) };
    }

    if (path === "rotation")
    {
        const controls = interpolation === "CUBICSPLINE" ? cubicSplineValues(rawControls, 4) : rawControls;
        return { path: "orientation", curve: makeCurve("orientation", 4, knots, controls, interpolation) };
    }

    if (path === "scale")
    {
        return { path: "scaleShear", curve: makeCurve("scaleShear", 9, knots, scaleToScaleShear(rawControls, interpolation), interpolation) };
    }

    return null;
}

function buildAnimations(gltf, buffers, modelTargets)
{
    return (gltf.animations || []).map((animation, animationIndex) =>
    {
        const
            duration = animationDuration(gltf, buffers, animation),
            groups = new Map();

        for (const channel of animation.channels || [])
        {
            const mapped = modelTargets.get(channel.target.node);
            if (!mapped) continue;

            const curve = channelCurve(gltf, buffers, animation, channel);
            if (!curve) continue;

            for (const target of mapped)
            {
                let group = groups.get(target.modelName);
                if (!group)
                {
                    group = { name: target.modelName, tracks: new Map() };
                    groups.set(target.modelName, group);
                }

                let track = group.tracks.get(target.boneName);
                if (!track)
                {
                    track = { name: target.boneName, flags: 0 };
                    group.tracks.set(target.boneName, track);
                }

                track[curve.path] = curve.curve;
            }
        }

        return {
            name: animation.name || `animation_${animationIndex}`,
            duration,
            timeStep: 0,
            oversampling: 1,
            defaultLoopCount: 0,
            flags: 0,
            trackGroups: Array.from(groups.values()).map(group => ({
                name: group.name,
                transformTracks: Array.from(group.tracks.values()).map(track => ({
                    name: track.name,
                    flags: track.flags,
                    orientation: track.orientation || identityCurve("orientation", duration),
                    position: track.position || identityCurve("position", duration),
                    scaleShear: track.scaleShear || identityCurve("scaleShear", duration)
                }))
            }))
        };
    }).filter(animation => animation.trackGroups.length);
}

function animationDuration(gltf, buffers, animation)
{
    let duration = 0;
    for (const sampler of animation.samplers || [])
    {
        const knots = readAccessor(gltf, buffers, sampler.input);
        for (const knot of knots)
        {
            if (knot > duration) duration = knot;
        }
    }
    return fr(duration);
}

function registerModelTargets(modelTargets, model)
{
    for (const bone of model.skeleton.bones)
    {
        const nodeIndex = bone.extendedData && bone.extendedData.gltfNode;
        if (nodeIndex === undefined) continue;
        const targets = modelTargets.get(nodeIndex) || [];
        targets.push({ modelName: model.name, boneName: bone.name });
        modelTargets.set(nodeIndex, targets);
    }
}

/**
 * Parses glTF or GLB input into its normalized JSON document for the glTF format
 * reader.
 */
export function parseGltfToJson(gltf, { binaryChunk = null, source = "memory", buffers: providedBuffers = null } = {})
{
    if (!gltf.asset || !String(gltf.asset.version || "").startsWith("2"))
    {
        throw new Error("CjsGltfFormat: only glTF 2.x assets are supported");
    }

    const
        buffers = resolveBuffers(gltf, binaryChunk, { buffers: providedBuffers }),
        parents = parentMap(gltf),
        root = {
            grannyFileFormatRevision: 0,
            grannyFileSource: source,
            meshes: [],
            models: [],
            animations: []
        },
        modelTargets = new Map();

    for (const meshNode of collectMeshNodes(gltf))
    {
        const
            nodeIndex = typeof meshNode === "number" ? meshNode : undefined,
            node = nodeIndex === undefined ? null : gltf.nodes[nodeIndex],
            meshIndex = node ? node.mesh : meshNode.meshIndex,
            mesh = gltf.meshes && gltf.meshes[meshIndex],
            skinIndex = node && node.skin,
            skeleton = skinIndex === undefined ? null : buildSkeleton(gltf, skinIndex, parents),
            boneBindings = skeleton ? buildBoneBindings(skeleton) : [],
            meshBindings = [];

        if (!mesh) continue;

        for (let primitiveIndex = 0; primitiveIndex < mesh.primitives.length; primitiveIndex++)
        {
            meshBindings.push(root.meshes.length);
            root.meshes.push(buildMeshPrimitive(gltf, buffers, meshIndex, primitiveIndex, nodeIndex, boneBindings));
        }

        if (skeleton)
        {
            const model = {
                name: (node && node.name) || mesh.name || `model_${nodeIndex}`,
                skeleton,
                meshBindings
            };
            root.models.push(model);
            registerModelTargets(modelTargets, model);
        }
    }

    root.animations = buildAnimations(gltf, buffers, modelTargets);
    return root;
}

/** Inspects glTF without materializing the full glTF format reader payload. */
export function inspectGltf(gltf, { format = "gltf", source = "memory" } = {})
{
    return {
        source,
        format,
        assetVersion: gltf.asset && gltf.asset.version,
        sceneCount: (gltf.scenes || []).length,
        nodeCount: (gltf.nodes || []).length,
        meshCount: (gltf.meshes || []).length,
        skinCount: (gltf.skins || []).length,
        animationCount: (gltf.animations || []).length,
        materialCount: (gltf.materials || []).length,
        meshes: (gltf.meshes || []).map((mesh, index) => ({
            name: mesh.name || `mesh_${index}`,
            primitiveCount: (mesh.primitives || []).length
        })),
        animations: (gltf.animations || []).map((animation, index) => ({
            name: animation.name || `animation_${index}`,
            channelCount: (animation.channels || []).length,
            samplerCount: (animation.samplers || []).length
        }))
    };
}

