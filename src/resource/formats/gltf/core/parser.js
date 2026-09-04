import { asUint8Array } from "#utils/bytes";
import { mat4 } from "#math/mat4";

/**
 * glTF/GLB parser that emits the shared CarbonEngineJS geometry JSON shape.
 */

const GLB_MAGIC = 0x46546c67;
const GLB_JSON = 0x4e4f534a;
const GLB_BIN = 0x004e4942;
const FLOAT32_EPSILON = 2 ** -23;

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
    color0: null,
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
    if (mode === 0)
    {
        if (accessorIndex !== undefined)
        {
            throw new Error("CjsGltfFormat: indexed POINTS require vertex unindexing before CMF conversion");
        }
        return [];
    }

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

function normalizedDirection(values, offset, fallback)
{
    const
        x = values[offset],
        y = values[offset + 1],
        z = values[offset + 2],
        squaredLength = x * x + y * y + z * z;

    if (!Number.isFinite(squaredLength) || squaredLength < FLOAT32_EPSILON) return fallback.slice();
    if (Math.abs(squaredLength - 1) <= FLOAT32_EPSILON) return [ x, y, z ];
    const length = Math.sqrt(squaredLength);
    return [ fr(x / length), fr(y / length), fr(z / length) ];
}

function splitTangentFrames(vertex)
{
    const vertexCount = vertex.position.length / 3;
    const tangentChannels = Object.keys(vertex).filter(name => name === "tangent" || /^tangent[1-9][0-9]*$/u.test(name));
    for (const tangentName of tangentChannels)
    {
        if (!vertex[tangentName].length) continue;
        const suffix = tangentName === "tangent" ? "" : tangentName.slice("tangent".length);
        splitTangentFrame(vertex, tangentName, suffix ? `normal${suffix}` : "normal", suffix ? `binormal${suffix}` : "binormal", vertexCount);
    }
}

function splitTangentFrame(vertex, tangentName, normalName, binormalName, vertexCount)
{
    const tangentLabel = tangentName === "tangent" ? "TANGENT" : tangentName;
    const normalLabel = normalName === "normal" ? "NORMAL channel" : normalName;
    if (vertex[tangentName].length !== vertexCount * 4)
    {
        throw new Error(`CjsGltfFormat: ${tangentLabel} must contain one VEC4 per vertex`);
    }
    const sourceNormalName = vertex[normalName]?.length === vertexCount * 3
        ? normalName
        : normalName !== "normal" && vertex.normal?.length === vertexCount * 3
            ? "normal"
            : null;
    if (!sourceNormalName)
    {
        throw new Error(`CjsGltfFormat: ${tangentLabel} requires a matching ${normalLabel}`);
    }

    const tangents = new Array(vertexCount * 3);
    const binormals = new Array(vertexCount * 3);
    const normals = new Array(vertexCount * 3);
    for (let index = 0; index < vertexCount; index++)
    {
        const
            sourceNormalOffset = index * 3,
            sourceTangentOffset = index * 4,
            normal = normalizedDirection(vertex[sourceNormalName], sourceNormalOffset, [ 0, 1, 0 ]),
            tangent = normalizedDirection(vertex[tangentName], sourceTangentOffset, [ 1, 0, 0 ]),
            sign = vertex[tangentName][sourceTangentOffset + 3] < 0 ? -1 : 1,
            binormal = normalizedDirection([
                normal[1] * tangent[2] - normal[2] * tangent[1],
                normal[2] * tangent[0] - normal[0] * tangent[2],
                normal[0] * tangent[1] - normal[1] * tangent[0]
            ], 0, [ 0, 0, 0 ]);

        for (let component = 0; component < 3; component++)
        {
            normals[sourceNormalOffset + component] = normal[component];
            tangents[sourceNormalOffset + component] = tangent[component];
            const signedBinormal = binormal[component] * sign;
            binormals[sourceNormalOffset + component] = signedBinormal === 0 ? 0 : fr(signedBinormal);
        }
    }
    if (sourceNormalName === normalName) vertex[normalName] = normals;
    vertex[tangentName] = tangents;
    vertex[binormalName] = binormals;
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
    return (primitive.targets || []).map((target, index) =>
    {
        const vertex = {
            position: copyAttribute(gltf, buffers, target, "POSITION"),
            blendIndice: [],
            tangent: copyAttribute(gltf, buffers, target, "TANGENT"),
            normal: copyAttribute(gltf, buffers, target, "NORMAL"),
            texcoord0: [],
            texcoord1: [],
            binormal: [],
            blendWeight: []
        };
        copyCarbonIndexedDirections(gltf, buffers, target, vertex);
        return {
            name: targetNames[index] || `target_${index}`,
            dataIsDeltas: true,
            vertex
        };
    });
}

function meshMorphTargetNames(mesh)
{
    const counts = (mesh.primitives ?? []).map(primitive => (primitive.targets ?? []).length);
    const count = counts[0] ?? 0;
    if (counts.some(value => value !== count))
    {
        throw new Error("CjsGltfFormat: every primitive in an animated mesh must use the same morph target count");
    }
    const authored = mesh.extras?.targetNames ?? [];
    return Array.from({ length: count }, (_, index) => authored[index] || `target_${index}`);
}

function normalizeSkinning(vertex, attributes, skinContext)
{
    for (const key of Object.keys(attributes ?? {}))
    {
        if (/^(JOINTS|WEIGHTS)_[1-9][0-9]*$/u.test(key))
        {
            throw new Error(`CjsGltfFormat: ${key} requires reducing influences to CMF's four-weight palette`);
        }
    }

    const hasIndices = vertex.blendIndice.length > 0;
    const hasWeights = vertex.blendWeight.length > 0;
    if (hasIndices !== hasWeights)
    {
        throw new Error("CjsGltfFormat: JOINTS_0 and WEIGHTS_0 must be present together");
    }
    if (!hasIndices && skinContext)
    {
        throw new Error("CjsGltfFormat: a skinned mesh must provide JOINTS_0 and WEIGHTS_0");
    }
    if (hasIndices && !skinContext)
    {
        throw new Error("CjsGltfFormat: JOINTS_0 requires a mesh node with a skin");
    }
    if (!hasIndices) return;
    if (vertex.blendIndice.length !== vertex.blendWeight.length || vertex.blendIndice.length % 4)
    {
        throw new Error("CjsGltfFormat: skin influences must contain matching VEC4 indices and weights");
    }

    const paletteSize = skinContext.boneBindings.length;
    for (let index = 0; index < vertex.blendIndice.length; index++)
    {
        if (vertex.blendWeight[index] === 0)
        {
            vertex.blendIndice[index] = 0;
            continue;
        }
        const joint = vertex.blendIndice[index];
        if (!Number.isInteger(joint) || joint < 0 || joint >= paletteSize)
        {
            throw new Error(`CjsGltfFormat: JOINTS_0 index ${joint} is outside skin palette 0..${paletteSize - 1}`);
        }
    }
}

function buildMeshPrimitive(gltf, buffers, meshIndex, primitiveIndex, nodeIndex, skinContext)
{
    const
        mesh = gltf.meshes[meshIndex],
        primitive = mesh.primitives[primitiveIndex],
        vertex = createVertexChannels();

    vertex.position = copyAttribute(gltf, buffers, primitive.attributes, "POSITION");
    vertex.normal = copyAttribute(gltf, buffers, primitive.attributes, "NORMAL");
    vertex.tangent = copyAttribute(gltf, buffers, primitive.attributes, "TANGENT");
    for (const [ attribute ] of Object.entries(primitive.attributes ?? {}))
    {
        const match = /^(TEXCOORD|COLOR)_([0-9]+)$/u.exec(attribute);
        if (!match) continue;
        const usageIndex = Number(match[2]);
        if (usageIndex > 255)
        {
            throw new Error(`CjsGltfFormat: attribute ${attribute} has a usage index outside 0..255`);
        }
        const channel = `${match[1] === "TEXCOORD" ? "texcoord" : "color"}${usageIndex}`;
        vertex[channel] = copyAttribute(gltf, buffers, primitive.attributes, attribute);
    }
    copyCarbonIndexedDirections(gltf, buffers, primitive.attributes, vertex);
    vertex.blendIndice = copyAttribute(gltf, buffers, primitive.attributes, "JOINTS_0");
    vertex.blendWeight = copyAttribute(gltf, buffers, primitive.attributes, "WEIGHTS_0");
    normalizeSkinning(vertex, primitive.attributes, skinContext);
    splitTangentFrames(vertex);

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
        topology: primitive.mode === 0 ? "PointList" : "TriangleList",
        boneBindings: skinContext?.boneBindings ?? [],
        vertex,
        indices: [ {
            name: materialName(gltf, primitive, primitiveIndex),
            bytesPerIndex,
            ...(primitive.mode === 0 ? { pointCount: vertexCount } : {}),
            faces
        } ]
    };
}

function copyCarbonIndexedDirections(gltf, buffers, attributes, vertex)
{
    for (const attribute of Object.keys(attributes ?? {}))
    {
        const match = /^_(NORMAL|TANGENT)_([1-9][0-9]*)$/u.exec(attribute);
        if (!match) continue;
        const usageIndex = Number(match[2]);
        if (usageIndex > 255)
        {
            throw new Error(`CjsGltfFormat: attribute ${attribute} has a usage index outside 0..255`);
        }
        const channel = `${match[1] === "NORMAL" ? "normal" : "tangent"}${usageIndex}`;
        vertex[channel] = copyAttribute(gltf, buffers, attributes, attribute);
    }
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
    if (matrix.length !== 16 || matrix.some(value => !Number.isFinite(value)))
    {
        throw new Error("CjsGltfFormat: node.matrix must contain 16 finite components");
    }
    const
        source = Float32Array.from(matrix),
        orientation = new Float32Array(4),
        position = new Float32Array(3),
        scale = new Float32Array(3),
        recomposed = mat4.create();
    mat4.decompose(source, orientation, position, scale);
    mat4.fromRotationTranslationScale(recomposed, orientation, position, scale);

    const tolerance = 1e-5;
    if ([ ...orientation, ...position, ...scale ].some(value => !Number.isFinite(value)) ||
        source.some((value, index) => !Number.isFinite(recomposed[index]) ||
            Math.abs(value - recomposed[index]) > tolerance))
    {
        throw new Error("CjsGltfFormat: sheared node.matrix cannot be represented by CMF rest transforms");
    }

    return {
        position: Array.from(position, fr),
        orientation: Array.from(orientation, fr),
        scaleShear: [
            fr(scale[0]), 0, 0,
            0, fr(scale[1]), 0,
            0, 0, fr(scale[2])
        ]
    };
}

function isTransformNode(node)
{
    return node && node.mesh === undefined && node.camera === undefined && node.skin === undefined;
}

function isIdentityTransform(node)
{
    if (node.matrix)
    {
        const identity = [ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 ];
        return node.matrix.length === 16 && node.matrix.every((value, index) => value === identity[index]);
    }
    const
        translation = node.translation ?? [ 0, 0, 0 ],
        rotation = node.rotation ?? [ 0, 0, 0, 1 ],
        scale = node.scale ?? [ 1, 1, 1 ];
    return translation.length === 3 && translation.every(value => value === 0) &&
        rotation.length === 4 && rotation[0] === 0 && rotation[1] === 0 && rotation[2] === 0 && rotation[3] === 1 &&
        scale.length === 3 && scale.every(value => value === 1);
}

function collectDescendants(gltf, rootIndex)
{
    const ordered = [];
    const visited = new Set();
    const visit = (nodeIndex) =>
    {
        if (visited.has(nodeIndex)) return;
        visited.add(nodeIndex);
        const node = gltf.nodes?.[nodeIndex];
        if (!node || !isTransformNode(node)) return;
        ordered.push(nodeIndex);
        for (const child of node.children ?? []) visit(child);
    };
    visit(rootIndex);
    return ordered;
}

function collectSkeletonNodes(gltf, skinIndices, parents)
{
    const
        firstSkin = gltf.skins[skinIndices[0]],
        rootIndex = firstSkin.skeleton,
        isCarbon = gltf.asset?.generator === "cmfprocessor";

    if (isCarbon && Number.isInteger(rootIndex))
    {
        const nodes = collectDescendants(gltf, rootIndex);
        const root = gltf.nodes[rootIndex] ?? {};
        const allJoints = new Set(skinIndices.flatMap(index => gltf.skins[index].joints ?? []));
        const syntheticRoot = !allJoints.has(rootIndex) && isIdentityTransform(root) &&
            skinIndices.some(index => root.name === `${gltf.skins[index].name || `skin_${index}`}_root`);
        return syntheticRoot ? nodes.filter(index => index !== rootIndex) : nodes;
    }

    const included = new Set();
    for (const skinIndex of skinIndices)
    {
        for (const joint of gltf.skins[skinIndex].joints ?? [])
        {
            let nodeIndex = joint;
            while (Number.isInteger(nodeIndex))
            {
                const node = gltf.nodes?.[nodeIndex];
                if (!isTransformNode(node)) break;
                included.add(nodeIndex);
                if (nodeIndex === rootIndex) break;
                nodeIndex = parents.get(nodeIndex);
            }
        }
    }

    const ordered = [];
    const visited = new Set();
    const visit = (nodeIndex) =>
    {
        if (visited.has(nodeIndex) || !included.has(nodeIndex)) return;
        visited.add(nodeIndex);
        const parent = parents.get(nodeIndex);
        if (included.has(parent)) visit(parent);
        ordered.push(nodeIndex);
    };
    for (const nodeIndex of included) visit(nodeIndex);
    return ordered;
}

function readSkinInverseBinds(gltf, buffers, skinIndex)
{
    const skin = gltf.skins[skinIndex];
    if (skin.inverseBindMatrices === undefined)
    {
        return (skin.joints ?? []).map(() => [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    }

    const decoded = readAccessorRaw(gltf, buffers, skin.inverseBindMatrices);
    if (decoded.accessor.type !== "MAT4" || decoded.accessor.componentType !== 5126 ||
        decoded.accessor.count !== (skin.joints ?? []).length)
    {
        throw new Error(`CjsGltfFormat: skin ${skinIndex} inverseBindMatrices must be FLOAT MAT4 with one entry per joint`);
    }
    return (skin.joints ?? []).map((_, index) => decoded.values.slice(index * 16, index * 16 + 16));
}

function equalMatrix(left, right)
{
    return left.length === 16 && right.length === 16 &&
        left.every((value, index) => value === right[index]);
}

function buildSkinContexts(gltf, buffers, skinIndices, parents)
{
    const groups = new Map();
    for (const skinIndex of skinIndices)
    {
        const skin = gltf.skins?.[skinIndex];
        if (!skin) throw new Error(`CjsGltfFormat: missing skin ${skinIndex}`);
        if (!(skin.joints ?? []).length) throw new Error(`CjsGltfFormat: skin ${skinIndex} has no joints`);
        if (new Set(skin.joints).size !== skin.joints.length)
        {
            throw new Error(`CjsGltfFormat: skin ${skinIndex} contains duplicate joints`);
        }
        const key = Number.isInteger(skin.skeleton) ? `root:${skin.skeleton}` : `skin:${skinIndex}`;
        const group = groups.get(key) ?? [];
        group.push(skinIndex);
        groups.set(key, group);
    }

    const contexts = new Map();
    for (const groupedSkinIndices of groups.values())
    {
        const
            nodeIndices = collectSkeletonNodes(gltf, groupedSkinIndices, parents),
            boneIndexByNode = new Map(nodeIndices.map((nodeIndex, index) => [ nodeIndex, index ])),
            inverseByNode = new Map();

        for (const skinIndex of groupedSkinIndices)
        {
            const skin = gltf.skins[skinIndex];
            const matrices = readSkinInverseBinds(gltf, buffers, skinIndex);
            for (let index = 0; index < skin.joints.length; index++)
            {
                const joint = skin.joints[index];
                if (!boneIndexByNode.has(joint))
                {
                    throw new Error(`CjsGltfFormat: skin ${skinIndex} joint ${joint} is outside its skeleton hierarchy`);
                }
                const previous = inverseByNode.get(joint);
                if (previous && !equalMatrix(previous, matrices[index]))
                {
                    throw new Error(`CjsGltfFormat: joint ${joint} has conflicting inverse bind matrices`);
                }
                inverseByNode.set(joint, matrices[index]);
            }
        }

        const firstSkin = gltf.skins[groupedSkinIndices[0]];
        const skeleton = {
            name: firstSkin.name || `skin_${groupedSkinIndices[0]}`,
            bones: nodeIndices.map(nodeIndex =>
            {
                const
                    node = gltf.nodes[nodeIndex] ?? {},
                    parentIndex = boneIndexByNode.get(parents.get(nodeIndex)) ?? -1,
                    transform = nodeTransform(node);

                return {
                    name: nodeName(gltf, nodeIndex),
                    parentIndex,
                    flag: 7,
                    position: transform.position,
                    orientation: transform.orientation,
                    scaleShear: transform.scaleShear,
                    extendedData: { gltfNode: nodeIndex }
                };
            }),
            invBindTransforms: nodeIndices.map(nodeIndex => inverseByNode.get(nodeIndex) ?? null)
        };

        const boneNames = skeleton.bones.map(bone => bone.name);
        if (new Set(boneNames).size !== boneNames.length)
        {
            throw new Error(`CjsGltfFormat: skeleton ${JSON.stringify(skeleton.name)} contains duplicate bone names`);
        }

        for (const skinIndex of groupedSkinIndices)
        {
            const skin = gltf.skins[skinIndex];
            contexts.set(skinIndex, {
                skeleton,
                boneBindings: skin.joints.map(nodeIndex => ({
                    name: skeleton.bones[boneIndexByNode.get(nodeIndex)].name,
                    minBounds: [ 0, 0, 0 ],
                    maxBounds: [ 0, 0, 0 ]
                }))
            });
        }
    }
    return contexts;
}

function collectMeshNodes(gltf)
{
    if (!(gltf.scenes ?? []).length)
    {
        const nodes = [];
        for (let index = 0; index < (gltf.nodes ?? []).length; index++)
        {
            if (gltf.nodes[index].mesh !== undefined) nodes.push(index);
        }
        if (nodes.length) return nodes;
        return (gltf.meshes || []).map((_, index) => ({ meshIndex: index }));
    }

    const sceneIndex = gltf.scene ?? 0;
    const scene = gltf.scenes[sceneIndex];
    if (!scene) throw new Error(`CjsGltfFormat: default scene ${sceneIndex} does not exist`);

    const ordered = [];
    const visited = new Set();
    const visit = (nodeIndex) =>
    {
        if (visited.has(nodeIndex)) return;
        const node = gltf.nodes?.[nodeIndex];
        if (!node) throw new Error(`CjsGltfFormat: scene references missing node ${nodeIndex}`);
        visited.add(nodeIndex);
        if (node.mesh !== undefined) ordered.push(nodeIndex);
        for (const child of node.children ?? []) visit(child);
    };
    for (const nodeIndex of scene.nodes ?? []) visit(nodeIndex);

    const lowerLods = new Set();
    for (const nodeIndex of ordered)
    {
        for (const lower of gltf.nodes[nodeIndex].extensions?.MSFT_lod?.ids ?? []) lowerLods.add(lower);
    }
    return ordered.filter(nodeIndex => !lowerLods.has(nodeIndex));
}

function lodNodeIndices(gltf, nodeIndex)
{
    if (!Number.isInteger(nodeIndex)) return [ nodeIndex ];
    const ids = gltf.nodes[nodeIndex]?.extensions?.MSFT_lod?.ids ?? [];
    const result = [ nodeIndex ];
    for (const lowerNodeIndex of ids)
    {
        if (!Number.isInteger(lowerNodeIndex) || !gltf.nodes?.[lowerNodeIndex])
        {
            throw new Error(`CjsGltfFormat: MSFT_lod references missing node ${lowerNodeIndex}`);
        }
        if (result.includes(lowerNodeIndex))
        {
            throw new Error("CjsGltfFormat: MSFT_lod node chain contains a cycle or duplicate");
        }
        result.push(lowerNodeIndex);
    }
    return result;
}

function lodThresholds(gltf, nodeIndex, lodCount)
{
    if (lodCount === 1) return [ 0xffffffff ];
    const coverage = gltf.nodes[nodeIndex]?.extras?.MSFT_screencoverage;
    if (!Array.isArray(coverage) || coverage.length !== lodCount)
    {
        throw new Error("CjsGltfFormat: MSFT_lod requires one MSFT_screencoverage value per LOD plus its final sentinel");
    }

    const thresholds = [ 0xffffffff ];
    for (let index = 0; index < lodCount - 1; index++)
    {
        const value = coverage[index];
        if (!Number.isFinite(value) || value < 0 || value > 1)
        {
            throw new Error("CjsGltfFormat: MSFT_screencoverage values must be finite values from zero through one");
        }
        thresholds.push(Math.round(value * 2048));
    }
    if (!Number.isFinite(coverage[lodCount - 1]) || coverage[lodCount - 1] < 0 ||
        coverage[lodCount - 1] > 1)
    {
        throw new Error("CjsGltfFormat: MSFT_screencoverage sentinel must be a finite value from zero through one");
    }
    for (let index = 1; index < thresholds.length; index++)
    {
        if (thresholds[index] >= thresholds[index - 1])
        {
            throw new Error("CjsGltfFormat: reconstructed CMF LOD thresholds must be strictly descending");
        }
    }
    return thresholds;
}

function makeCurve(path, dimension, knots, controls, interpolation)
{
    return {
        format: 1,
        degree: interpolation === "STEP" ? 0 : 1,
        interpolation,
        path,
        preserveIdentity: true,
        dimension,
        knots: knots.map(fr),
        controls: controls.map(fr)
    };
}

function scaleToScaleShear(values)
{
    const out = [];
    for (let i = 0; i < values.length; i += 3)
    {
        out.push(
            values[i], 0, 0,
            0, values[i + 1], 0,
            0, 0, values[i + 2]
        );
    }
    return out;
}

function resampleCubicSpline(knots, controls, dimension, label, normalize = false)
{
    if (controls.length !== knots.length * dimension * 3)
    {
        throw new Error(`CjsGltfFormat: CUBICSPLINE ${label} output has an invalid length`);
    }
    if (!knots.length || knots.some((value, index) => !Number.isFinite(value) || index && value <= knots[index - 1]))
    {
        throw new Error(`CjsGltfFormat: CUBICSPLINE ${label} input times must be finite and strictly increasing`);
    }

    const valueAtKey = (key) => controls.slice((key * 3 + 1) * dimension, (key * 3 + 2) * dimension);
    const sample = (segment, amount) =>
    {
        const duration = knots[segment + 1] - knots[segment];
        const p0 = valueAtKey(segment);
        const p1 = valueAtKey(segment + 1);
        const m0 = controls.slice((segment * 3 + 2) * dimension, (segment * 3 + 3) * dimension);
        const m1 = controls.slice(((segment + 1) * 3) * dimension, ((segment + 1) * 3 + 1) * dimension);
        const amount2 = amount * amount;
        const amount3 = amount2 * amount;
        const h00 = 2 * amount3 - 3 * amount2 + 1;
        const h10 = amount3 - 2 * amount2 + amount;
        const h01 = -2 * amount3 + 3 * amount2;
        const h11 = amount3 - amount2;
        const value = p0.map((component, index) =>
            component * h00 + m0[index] * duration * h10 + p1[index] * h01 + m1[index] * duration * h11
        );
        return normalize ? normalizeVector(value, label) : value;
    };
    const normalizeValue = value => normalize ? normalizeVector(value, label) : value;
    if (knots.length === 1)
    {
        return { knots: [ fr(knots[0]) ], controls: normalizeValue(valueAtKey(0)).map(fr) };
    }
    const output = [ { time: knots[0], value: normalizeValue(valueAtKey(0)) } ];
    const tolerance = 1e-4;

    for (let segment = 0; segment < knots.length - 1; segment++)
    {
        const start = { amount: 0, time: knots[segment], value: normalizeValue(valueAtKey(segment)) };
        const end = { amount: 1, time: knots[segment + 1], value: normalizeValue(valueAtKey(segment + 1)) };
        let segmentKeyCount = 1;
        const append = (left, right, depth) =>
        {
            const amount = (left.amount + right.amount) * 0.5;
            const middle = {
                amount,
                time: knots[segment] + (knots[segment + 1] - knots[segment]) * amount,
                value: sample(segment, amount)
            };
            let error = 0;
            for (const local of [ 0.25, 0.5, 0.75 ])
            {
                const probeAmount = left.amount + (right.amount - left.amount) * local;
                const actual = local === 0.5 ? middle.value : sample(segment, probeAmount);
                error = Math.max(error, normalize
                    ? quaternionInterpolationError(actual, left.value, right.value, local, label)
                    : Math.hypot(...actual.map((value, index) =>
                        value - (left.value[index] + (right.value[index] - left.value[index]) * local))));
            }
            if (error <= tolerance)
            {
                segmentKeyCount++;
                if (segmentKeyCount > 4096)
                {
                    throw new Error(`CjsGltfFormat: CUBICSPLINE ${label} requires more than 4096 baked keys per segment`);
                }
                output.push({ time: right.time, value: right.value });
                return;
            }
            if (depth >= 12)
            {
                throw new Error(`CjsGltfFormat: CUBICSPLINE ${label} requires more than 4096 baked keys per segment`);
            }
            append(left, middle, depth + 1);
            append(middle, right, depth + 1);
        };
        append(start, end, 0);
    }
    if (normalize)
    {
        for (let index = 1; index < output.length; index++)
        {
            if (dot(output[index - 1].value, output[index].value) < 0)
            {
                output[index].value = output[index].value.map(value => -value);
            }
        }
    }
    return {
        knots: output.map(entry => fr(entry.time)),
        controls: output.flatMap(entry => entry.value.map(fr))
    };
}

function dot(left, right)
{
    return left.reduce((sum, value, index) => sum + value * right[index], 0);
}

function quaternionInterpolationError(actual, left, right, amount, label)
{
    const alignedRight = dot(left, right) < 0 ? right.map(value => -value) : right;
    const linear = normalizeVector(left.map((value, index) =>
        value + (alignedRight[index] - value) * amount), label);
    const cosine = Math.min(1, Math.abs(dot(actual, linear)));
    return 2 * Math.acos(cosine);
}

function validateSamplerInterpolation(interpolation)
{
    if (![ "STEP", "LINEAR", "CUBICSPLINE" ].includes(interpolation))
    {
        throw new Error(`CjsGltfFormat: animation sampler interpolation ${JSON.stringify(interpolation)} is not supported`);
    }
}

function normalizeVector(value, label)
{
    const length = Math.hypot(...value);
    if (!(length > 0) || !Number.isFinite(length))
    {
        throw new Error(`CjsGltfFormat: CUBICSPLINE ${label} produced a zero or non-finite quaternion`);
    }
    return value.map(component => component / length);
}

function channelCurve(gltf, buffers, animation, channel)
{
    const
        sampler = animation.samplers[channel.sampler],
        interpolation = sampler.interpolation || "LINEAR",
        knots = readAccessor(gltf, buffers, sampler.input),
        rawControls = readAccessor(gltf, buffers, sampler.output),
        path = channel.target.path;
    validateSamplerInterpolation(interpolation);
    const dimension = path === "rotation" ? 4 : 3;
    const sampled = interpolation === "CUBICSPLINE"
        ? resampleCubicSpline(knots, rawControls, dimension, path, path === "rotation")
        : { knots, controls: rawControls };
    const curveInterpolation = interpolation === "CUBICSPLINE" ? "LINEAR" : interpolation;

    if (path === "translation")
    {
        return { path: "position", curve: makeCurve("position", 3, sampled.knots, sampled.controls, curveInterpolation) };
    }

    if (path === "rotation")
    {
        return { path: "orientation", curve: makeCurve("orientation", 4, sampled.knots, sampled.controls, curveInterpolation) };
    }

    if (path === "scale")
    {
        return { path: "scaleShear", curve: makeCurve("scaleShear", 9, sampled.knots, scaleToScaleShear(sampled.controls), curveInterpolation) };
    }

    return null;
}

function sameCurve(left, right)
{
    return left.degree === right.degree && left.dimension === right.dimension &&
        left.knots.length === right.knots.length && left.controls.length === right.controls.length &&
        left.knots.every((value, index) => value === right.knots[index]) &&
        left.controls.every((value, index) => value === right.controls[index]);
}

function weightCurves(gltf, buffers, animation, channel, targetNames)
{
    const
        sampler = animation.samplers[channel.sampler],
        interpolation = sampler.interpolation || "LINEAR",
        knots = readAccessor(gltf, buffers, sampler.input),
        rawControls = readAccessor(gltf, buffers, sampler.output),
        targetCount = targetNames.length;
    validateSamplerInterpolation(interpolation);
    if (!targetCount)
    {
        throw new Error("CjsGltfFormat: weights animation output must contain one value per morph target and key");
    }
    const sampled = interpolation === "CUBICSPLINE"
        ? resampleCubicSpline(knots, rawControls, targetCount, "weights")
        : { knots, controls: rawControls };
    if (sampled.controls.length !== sampled.knots.length * targetCount)
    {
        throw new Error("CjsGltfFormat: weights animation output must contain one value per morph target and key");
    }
    const curveInterpolation = interpolation === "CUBICSPLINE" ? "LINEAR" : interpolation;

    return targetNames.map((name, targetIndex) =>
    {
        const values = sampled.knots.map((_, knotIndex) => sampled.controls[knotIndex * targetCount + targetIndex]);
        return {
            name: name.endsWith("Shape") ? name.slice(0, -5) : name,
            dimension: 1,
            valueCurve: makeCurve("value", 1, sampled.knots, values, curveInterpolation)
        };
    });
}

function buildAnimations(gltf, buffers, modelTargets, morphTargets)
{
    return (gltf.animations || []).map((animation, animationIndex) =>
    {
        const
            duration = animationDuration(gltf, buffers, animation),
            groups = new Map(),
            morphTracks = new Map();

        for (const channel of animation.channels || [])
        {
            if (channel.target.path === "weights")
            {
                const names = morphTargets.get(channel.target.node);
                if (!names)
                {
                    throw new Error(`CjsGltfFormat: weights animation targets node ${channel.target.node} without morph targets`);
                }
                for (const track of weightCurves(gltf, buffers, animation, channel, names))
                {
                    const previous = morphTracks.get(track.name);
                    if (previous && !sameCurve(previous.valueCurve, track.valueCurve))
                    {
                        throw new Error(`CjsGltfFormat: conflicting morph animation curves target ${JSON.stringify(track.name)}`);
                    }
                    if (!previous) morphTracks.set(track.name, track);
                }
                continue;
            }

            const mapped = modelTargets.get(channel.target.node);
            if (!mapped)
            {
                throw new Error(
                    `CjsGltfFormat: ${channel.target.path} animation targets node ${channel.target.node} outside a CMF skeleton`
                );
            }

            const curve = channelCurve(gltf, buffers, animation, channel);
            if (!curve)
            {
                throw new Error(`CjsGltfFormat: animation target path ${JSON.stringify(channel.target.path)} is not supported`);
            }

            for (const target of mapped)
            {
                let group = groups.get(target.skeleton);
                if (!group)
                {
                    group = { name: target.groupName, tracks: new Map() };
                    groups.set(target.skeleton, group);
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

        const trackGroups = Array.from(groups.values()).map(group => ({
            name: group.name,
            transformTracks: Array.from(group.tracks.values()),
            vectorTracks: []
        }));
        if (morphTracks.size)
        {
            trackGroups.push({
                name: "MorphTargets",
                transformTracks: [],
                vectorTracks: Array.from(morphTracks.values())
            });
        }
        if (trackGroups.length && !(duration > 0))
        {
            throw new Error("CjsGltfFormat: CMF animations require a positive duration");
        }

        return {
            name: animation.name || `animation_${animationIndex}`,
            duration,
            timeStep: 0,
            oversampling: 1,
            defaultLoopCount: 0,
            flags: 0,
            trackGroups
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
        if (!targets.some(target => target.skeleton === model.skeleton && target.boneName === bone.name))
        {
            targets.push({
                skeleton: model.skeleton,
                groupName: model.skeleton.name || model.name,
                boneName: bone.name
            });
        }
        modelTargets.set(nodeIndex, targets);
    }
}

function registerMorphTargets(morphTargets, gltf, nodeIndex)
{
    if (!Number.isInteger(nodeIndex)) return;
    const mesh = gltf.meshes?.[gltf.nodes?.[nodeIndex]?.mesh];
    if (!mesh) return;
    const names = meshMorphTargetNames(mesh);
    if (names.length) morphTargets.set(nodeIndex, names);
}

/**
 * Parses glTF or GLB input into the normalized shared geometry graph.
 */
export function parseGltfToShared(gltf, { binaryChunk = null, source = "memory", buffers: providedBuffers = null } = {})
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
        modelTargets = new Map(),
        morphTargets = new Map(),
        meshNodes = collectMeshNodes(gltf),
        meshNodeChains = meshNodes.map(meshNode => typeof meshNode === "number"
            ? lodNodeIndices(gltf, meshNode)
            : [ meshNode ]),
        usedSkinIndices = new Set();

    for (const chain of meshNodeChains)
    {
        for (const meshNode of chain)
        {
            if (typeof meshNode !== "number") continue;
            const skinIndex = gltf.nodes[meshNode]?.skin;
            if (skinIndex !== undefined) usedSkinIndices.add(skinIndex);
        }
    }
    const skinContexts = buildSkinContexts(gltf, buffers, usedSkinIndices, parents);

    for (const chain of meshNodeChains)
    {
        const
            meshNode = chain[0],
            nodeIndex = typeof meshNode === "number" ? meshNode : undefined,
            node = nodeIndex === undefined ? null : gltf.nodes[nodeIndex],
            meshIndex = node ? node.mesh : meshNode.meshIndex,
            mesh = gltf.meshes && gltf.meshes[meshIndex],
            skinIndex = node && node.skin,
            skinContext = skinIndex === undefined ? null : skinContexts.get(skinIndex),
            skeleton = skinContext?.skeleton ?? null,
            thresholds = lodThresholds(gltf, nodeIndex, chain.length),
            meshBindings = [];

        if (!mesh) continue;

        const lodMeshes = chain.map((lodNode, lodIndex) =>
        {
            if (typeof lodNode !== "number") return mesh;
            const lodNodeData = gltf.nodes[lodNode];
            if (!isIdentityTransform(lodNodeData))
            {
                throw new Error("CjsGltfFormat: mesh-node transforms must be baked before CMF conversion");
            }
            const lodMesh = gltf.meshes?.[lodNodeData.mesh];
            if (!lodMesh)
            {
                throw new Error(`CjsGltfFormat: LOD ${lodIndex} node ${lodNode} has no mesh`);
            }
            if (lodMesh.primitives.length !== mesh.primitives.length)
            {
                throw new Error(`CjsGltfFormat: LOD ${lodIndex} must contain ${mesh.primitives.length} primitives`);
            }
            const lodSkinIndex = gltf.nodes[lodNode].skin;
            const lodSkinContext = lodSkinIndex === undefined ? null : skinContexts.get(lodSkinIndex);
            if ((lodSkinContext?.skeleton ?? null) !== skeleton)
            {
                throw new Error("CjsGltfFormat: every LOD of a skinned mesh must use the same skeleton");
            }
            const basePalette = skinContext?.boneBindings.map(binding => binding.name) ?? [];
            const lodPalette = lodSkinContext?.boneBindings.map(binding => binding.name) ?? [];
            if (basePalette.length !== lodPalette.length ||
                basePalette.some((name, index) => name !== lodPalette[index]))
            {
                throw new Error("CjsGltfFormat: every LOD of a skinned mesh must use the same joint palette");
            }
            return lodMesh;
        });
        for (const lodNode of chain) registerMorphTargets(morphTargets, gltf, lodNode);

        for (let primitiveIndex = 0; primitiveIndex < mesh.primitives.length; primitiveIndex++)
        {
            const lodParts = chain.map((lodNode, lodIndex) =>
            {
                const lodNodeIndex = typeof lodNode === "number" ? lodNode : undefined;
                const lodSkinIndex = lodNodeIndex === undefined ? undefined : gltf.nodes[lodNodeIndex].skin;
                return {
                    ...buildMeshPrimitive(
                        gltf,
                        buffers,
                        lodMeshes[lodIndex] === mesh ? meshIndex : gltf.nodes[lodNodeIndex].mesh,
                        primitiveIndex,
                        lodNodeIndex,
                        lodSkinIndex === undefined ? null : skinContexts.get(lodSkinIndex)
                    ),
                    threshold: thresholds[lodIndex]
                };
            });
            const sharedMesh = { ...lodParts[0], lods: lodParts };
            meshBindings.push(root.meshes.length);
            root.meshes.push(sharedMesh);
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

    root.animations = buildAnimations(gltf, buffers, modelTargets, morphTargets);
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
