import {
    AnimationChannelTargetType,
    ElementType,
    Interpolation,
    MeshTopology,
    SectionCompression,
    SectionType,
    Usage
} from "./constants.js";
import { elementTypeSize, readElementComponent } from "./utils/vertex.js";

const UINT8_MAX = 0xff;
const UINT16_MAX = 0xffff;
const UINT32_MAX = 0xffffffff;
const FLOAT32_MAX = 3.4028234663852886e38;

function invalid(message, options)
{
    const prefix = options?.phase === "write" ? "CMF write" : "Invalid CMF";
    const error = new Error(`${prefix}: ${message}`);
    error.code = options?.phase === "write" ? "CJS_FORMAT_WRITE_ERROR" : "CJS_FORMAT_INVALID_DATA";
    throw error;
}

function array(value, label, options, fallback = [])
{
    if (value === undefined || value === null) return fallback;
    if (!Array.isArray(value)) invalid(`${label} must be an array`, options);
    return value;
}

function uint(value, max, label, options)
{
    if (!Number.isInteger(value) || value < 0 || value > max)
    {
        invalid(`${label} must be an unsigned integer within 0..${max}`, options);
    }
    return value;
}

function finiteFloat(value, label, options)
{
    if (!Number.isFinite(value) || !Number.isFinite(Math.fround(value)))
    {
        invalid(`${label} must be a finite Float32 value`, options);
    }
    return value;
}

function finiteArray(value, count, label, options)
{
    if (!Array.isArray(value) || value.length !== count)
    {
        invalid(`${label} must contain ${count} values`, options);
    }
    for (let index = 0; index < value.length; index++)
    {
        finiteFloat(value[index], `${label}[${index}]`, options);
    }
}

function numericArray(value, count, label, options)
{
    if (!Array.isArray(value) || value.length !== count)
    {
        invalid(`${label} must contain ${count} values`, options);
    }
    for (let index = 0; index < value.length; index++)
    {
        if (typeof value[index] !== "number") invalid(`${label}[${index}] must be a number`, options);
    }
}

function name(value, label, options, allowEmpty = true)
{
    if (typeof value !== "string") invalid(`${label} must be a string`, options);
    if (!allowEmpty && !value) invalid(`${label} must not be empty`, options);
}

function uniqueNames(values, label, options, allowEmpty = true)
{
    const seen = new Set();
    for (let index = 0; index < values.length; index++)
    {
        const value = values[index];
        name(value, `${label} ${index}`, options, allowEmpty);
        if (seen.has(value)) invalid(`${label} contains duplicate name ${JSON.stringify(value)}`, options);
        seen.add(value);
    }
}

function validateBounds(bounds, label, options)
{
    if (bounds === undefined || bounds === null) return;
    if (typeof bounds !== "object" || Array.isArray(bounds)) invalid(`${label} must be an object`, options);
    numericArray(bounds.min, 3, `${label}.min`, options);
    numericArray(bounds.max, 3, `${label}.max`, options);
    // Carbon uses this exact FLT_MAX/-FLT_MAX pair for an AABB that has not
    // been initialized yet, and deliberately exempts it from ordering checks.
    if (bounds.min.every(value => value === FLOAT32_MAX) &&
        bounds.max.every(value => value === -FLOAT32_MAX))
    {
        return;
    }
    for (let axis = 0; axis < 3; axis++)
    {
        if (bounds.max[axis] < bounds.min[axis]) invalid(`${label} has max below min on axis ${axis}`, options);
    }
}

function validateVertexDeclaration(value, label, options)
{
    const decl = array(value, label, options);
    if (!decl.length) invalid(`${label} is empty`, options);

    const keys = new Set();
    let hasPosition = false;
    for (let index = 0; index < decl.length; index++)
    {
        const element = decl[index];
        if (!element || typeof element !== "object") invalid(`${label}[${index}] must be an object`, options);
        if (!Usage.includes(element.usage)) invalid(`${label}[${index}] has invalid usage`, options);
        if (!ElementType.includes(element.type)) invalid(`${label}[${index}] has invalid element type`, options);
        const usageIndex = uint(element.usageIndex ?? 0, UINT8_MAX, `${label}[${index}].usageIndex`, options);
        const elementCount = uint(element.elementCount, UINT8_MAX, `${label}[${index}].elementCount`, options);
        const offset = uint(element.offset ?? 0, UINT32_MAX, `${label}[${index}].offset`, options);
        if (elementCount < 1 || elementCount > 4) invalid(`${label}[${index}] elementCount must be within 1..4`, options);

        const key = `${element.usage}\0${usageIndex}`;
        if (keys.has(key)) invalid(`${label} contains duplicate ${element.usage}[${usageIndex}]`, options);
        keys.add(key);
        if (element.usage === "Position" && usageIndex === 0) hasPosition = true;

        const componentSize = elementTypeSize(element.type);
        if (offset % componentSize) invalid(`${label}[${index}] offset is not aligned to its element type`, options);
        if (element.usage === "BoneIndices" &&
            (usageIndex !== 0 || ![ "UInt8", "UInt16" ].includes(element.type)))
        {
            invalid(`${label}[${index}] BoneIndices must be usage 0 with UInt8 or UInt16 storage`, options);
        }
        if (element.usage === "PackedTangent" &&
            (element.type !== "Int16Norm" || elementCount !== 4))
        {
            invalid(`${label}[${index}] PackedTangent must be Int16Norm4`, options);
        }
        if (element.usage === "PackedTangentLegacy" &&
            (![ "UInt16Norm", "UInt8Norm" ].includes(element.type) || elementCount !== 4))
        {
            invalid(`${label}[${index}] PackedTangentLegacy must be UInt16Norm4 or UInt8Norm4`, options);
        }
    }
    if (!hasPosition) invalid(`${label} has no Position[0] element`, options);

    for (let leftIndex = 0; leftIndex < decl.length; leftIndex++)
    {
        const left = decl[leftIndex];
        const leftEnd = left.offset + left.elementCount * elementTypeSize(left.type);
        for (let rightIndex = leftIndex + 1; rightIndex < decl.length; rightIndex++)
        {
            const right = decl[rightIndex];
            const rightEnd = right.offset + right.elementCount * elementTypeSize(right.type);
            if (left.offset < rightEnd && right.offset < leftEnd)
            {
                invalid(`${label} elements ${leftIndex} and ${rightIndex} overlap`, options);
            }
        }
    }

    for (const packed of decl.filter(element =>
        element.usage === "PackedTangent" || element.usage === "PackedTangentLegacy"))
    {
        if (decl.some(element => element.usageIndex === packed.usageIndex &&
            [ "Normal", "Tangent", "Binormal" ].includes(element.usage)))
        {
            invalid(`${label} mixes ${packed.usage} with an unpacked tangent frame at usage ${packed.usageIndex}`, options);
        }
    }
    return decl;
}

function bufferEntry(graph, index)
{
    const buffers = graph.buffers ?? [];
    const entry = buffers.find?.(item => item && item.index === index) ?? buffers[index];
    const data = entry?.data ?? (entry instanceof Uint8Array ? entry : null);
    if (!data) return null;
    return data instanceof Uint8Array
        ? data
        : ArrayBuffer.isView(data)
            ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
            : data instanceof ArrayBuffer
                ? new Uint8Array(data)
                : null;
}

function validateBufferView(view, label, graph, options)
{
    if (!view || typeof view !== "object") invalid(`${label} must be an object`, options);
    const index = uint(view.index ?? 0, UINT32_MAX, `${label}.index`, options);
    const offset = uint(view.offset ?? 0, UINT32_MAX, `${label}.offset`, options);
    const size = uint(view.size ?? 0, UINT32_MAX, `${label}.size`, options);
    const stride = uint(view.stride ?? 0, UINT32_MAX, `${label}.stride`, options);
    if (!size) return;
    if (index === 0) invalid(`${label} uses reserved Data section index 0`, options);
    if (stride && (size % stride || offset % stride))
    {
        invalid(`${label} size and offset must be multiples of stride`, options);
    }

    const sections = graph.sections;
    if (Array.isArray(sections))
    {
        if (index >= sections.length) invalid(`${label} references section ${index} outside the header`, options);
        const section = sections[index];
        if (section.type === "Metadata") invalid(`${label} references the Metadata section`, options);
        if (offset + size > section.uncompressedSize) invalid(`${label} exceeds section ${index}`, options);
        if (section.gpuAlignment && stride !== section.gpuAlignment)
        {
            invalid(`${label} stride does not match section ${index} GPU alignment`, options);
        }
    }

    const bytes = bufferEntry(graph, index);
    if (bytes && offset + size > bytes.byteLength) invalid(`${label} exceeds supplied buffer ${index}`, options);
    if (!bytes && options?.phase === "write") invalid(`${label} has no supplied buffer ${index}`, options);
}

function validateFiniteVertexBuffer(decl, view, graph, label, options)
{
    const bytes = bufferEntry(graph, view.index);
    if (!bytes || !view.size || !view.stride) return;
    const data = new DataView(bytes.buffer, bytes.byteOffset + view.offset, view.size);
    const vertexCount = view.size / view.stride;
    for (const element of decl)
    {
        if (element.type !== "Float32" && element.type !== "Float16") continue;
        for (let vertex = 0; vertex < vertexCount; vertex++)
        {
            for (let component = 0; component < element.elementCount; component++)
            {
                const offset = vertex * view.stride + element.offset + component * elementTypeSize(element.type);
                if (!Number.isFinite(readElementComponent(data, offset, element.type)))
                {
                    invalid(`${label} contains a non-finite ${element.usage}[${element.usageIndex}] value`, options);
                }
            }
        }
    }
}

function validateMeshLod(mesh, lod, lodIndex, graph, options)
{
    if (!lod || typeof lod !== "object") invalid(`mesh ${JSON.stringify(mesh.name)} LOD ${lodIndex} must be an object`, options);
    const label = `mesh ${JSON.stringify(mesh.name)} LOD ${lodIndex}`;
    validateBufferView(lod.vb, `${label} vertex buffer`, graph, options);
    validateBufferView(lod.ib, `${label} index buffer`, graph, options);
    if (!lod.vb.size) invalid(`${label} has no vertex buffer`, options);
    if (!lod.vb.stride) invalid(`${label} has vertex stride 0`, options);
    if (mesh.topology === "PointList")
    {
        if (lod.ib.size) invalid(`${label} PointList has an index buffer`, options);
    }
    else
    {
        if (!lod.ib.size) invalid(`${label} has no index buffer`, options);
        if (lod.ib.stride !== 2 && lod.ib.stride !== 4) invalid(`${label} index stride must be 2 or 4`, options);
        if ((lod.ib.size / lod.ib.stride) % 3) invalid(`${label} index buffer does not contain complete triangles`, options);
    }

    const lodAreas = array(lod.areas, `${label} areas`, options);
    if (lodAreas.length !== mesh.areas.length) invalid(`${label} area count does not match the mesh`, options);
    const elementWidth = mesh.topology === "PointList" ? 1 : 3;
    const elementLimit = mesh.topology === "PointList"
        ? lod.vb.size / lod.vb.stride
        : lod.ib.size / lod.ib.stride;
    for (let areaIndex = 0; areaIndex < lodAreas.length; areaIndex++)
    {
        const area = lodAreas[areaIndex];
        if (!area || typeof area !== "object") invalid(`${label} area ${areaIndex} must be an object`, options);
        const first = uint(area.firstElement ?? 0, UINT32_MAX, `${label} area ${areaIndex}.firstElement`, options);
        const count = uint(area.elementCount ?? 0, UINT32_MAX, `${label} area ${areaIndex}.elementCount`, options);
        if (first * elementWidth + count * elementWidth > elementLimit)
        {
            invalid(`${label} area ${areaIndex} exceeds the vertex/index range`, options);
        }
    }

    const morphs = array(lod.morphTargets, `${label} morph targets`, options);
    if (morphs.length !== mesh.morphTargets.targets.length)
    {
        invalid(`${label} morph target count does not match the mesh`, options);
    }
    let morphStride = null;
    for (let morphIndex = 0; morphIndex < morphs.length; morphIndex++)
    {
        const view = morphs[morphIndex]?.vb;
        validateBufferView(view, `${label} morph target ${morphIndex}`, graph, options);
        if (!view.size) continue;
        if (!view.stride) invalid(`${label} morph target ${morphIndex} has stride 0`, options);
        if (view.size / view.stride !== lod.vb.size / lod.vb.stride)
        {
            invalid(`${label} morph target ${morphIndex} vertex count differs from the LOD`, options);
        }
        if (morphStride === null) morphStride = view.stride;
        else if (morphStride !== view.stride) invalid(`${label} morph target strides differ`, options);
        for (const element of mesh.morphTargets.decl)
        {
            if (element.offset + element.elementCount * elementTypeSize(element.type) > view.stride)
            {
                invalid(`${label} morph vertex element extends past the stride`, options);
            }
        }
        validateFiniteVertexBuffer(mesh.morphTargets.decl, view, graph, `${label} morph target ${morphIndex}`, options);
    }

    for (const element of mesh.decl)
    {
        if (element.offset + element.elementCount * elementTypeSize(element.type) > lod.vb.stride)
        {
            invalid(`${label} vertex element extends past the stride`, options);
        }
    }
    validateFiniteVertexBuffer(mesh.decl, lod.vb, graph, `${label} vertex buffer`, options);
}

function validateAudioOcclusionMesh(value, meshLabel, options)
{
    const mesh = value ?? {};
    const vertices = array(mesh.vertices, `${meshLabel} audio vertices`, options);
    const indices = array(mesh.indices, `${meshLabel} audio indices`, options);
    if (vertices.length && !indices.length) invalid(`${meshLabel} audio mesh has vertices without indices`, options);
    if (indices.length && !vertices.length) invalid(`${meshLabel} audio mesh has indices without vertices`, options);
    if (indices.length % 3) invalid(`${meshLabel} audio mesh does not contain complete triangles`, options);
    vertices.forEach((vertex, index) => numericArray(vertex, 3, `${meshLabel} audio vertex ${index}`, options));
    indices.forEach((index, position) =>
    {
        uint(index, UINT16_MAX, `${meshLabel} audio index ${position}`, options);
        if (index >= vertices.length) invalid(`${meshLabel} audio index ${position} is out of range`, options);
    });
    validateBounds(mesh.bounds, `${meshLabel} audio bounds`, options);
}

function validateMesh(mesh, meshIndex, graph, options)
{
    if (!mesh || typeof mesh !== "object") invalid(`mesh ${meshIndex} must be an object`, options);
    name(mesh.name ?? "", `mesh ${meshIndex} name`, options);
    const label = `mesh ${JSON.stringify(mesh.name ?? "")}`;
    const decl = validateVertexDeclaration(mesh.decl, `${label} declaration`, options);
    const topology = mesh.topology ?? "TriangleList";
    if (!MeshTopology.includes(topology)) invalid(`${label} has invalid topology`, options);
    const areas = array(mesh.areas, `${label} areas`, options);
    const boneBindings = array(mesh.boneBindings, `${label} bone bindings`, options);
    const lods = array(mesh.lods, `${label} LODs`, options);
    if (!lods.length) invalid(`${label} has no LODs`, options);
    const thresholds = lods.map((lod, index) => uint(
        lod?.threshold ?? (index === 0 ? UINT32_MAX : undefined),
        UINT32_MAX,
        `${label} LOD ${index} threshold`,
        options
    ));
    if (thresholds[0] !== UINT32_MAX) invalid(`${label} first LOD threshold is not 0xffffffff`, options);
    for (let index = 1; index < thresholds.length; index++)
    {
        if (thresholds[index] >= thresholds[index - 1])
        {
            invalid(`${label} LOD thresholds are not strictly descending at ${index}`, options);
        }
    }

    const morphTargets = mesh.morphTargets ?? { decl: [], targets: [] };
    if (!morphTargets || typeof morphTargets !== "object") invalid(`${label} morphTargets must be an object`, options);
    const targets = array(morphTargets.targets, `${label} morph target metadata`, options);
    let morphDecl = array(morphTargets.decl, `${label} morph declaration`, options);
    if (targets.length)
    {
        morphDecl = validateVertexDeclaration(morphDecl, `${label} morph declaration`, options);
        for (const element of morphDecl)
        {
            if (!decl.some(base => base.usage === element.usage && base.usageIndex === element.usageIndex))
            {
                invalid(`${label} morph declaration is not a subset of the base declaration`, options);
            }
        }
    }
    const validatedMesh = {
        ...mesh,
        name: mesh.name ?? "",
        topology,
        decl,
        areas,
        boneBindings,
        morphTargets: { ...morphTargets, decl: morphDecl, targets }
    };
    for (let index = 0; index < lods.length; index++) validateMeshLod(validatedMesh, lods[index], index, graph, options);
    if (lods.some(lod => lod.vb.stride !== lods[0].vb.stride)) invalid(`${label} LOD vertex strides differ`, options);

    for (let areaIndex = 0; areaIndex < areas.length; areaIndex++)
    {
        const area = areas[areaIndex];
        if (!area || typeof area !== "object") invalid(`${label} area ${areaIndex} must be an object`, options);
        name(area.name ?? "", `${label} area ${areaIndex} name`, options);
        validateBounds(area.bounds, `${label} area ${areaIndex} bounds`, options);
        for (const [ boneIndex, bone ] of array(area.bones, `${label} area ${areaIndex} bones`, options).entries())
        {
            uint(bone, UINT16_MAX, `${label} area ${areaIndex} bone ${boneIndex}`, options);
            if (bone >= boneBindings.length) invalid(`${label} area ${areaIndex} has an out-of-range bone`, options);
        }
    }

    const boneIndices = decl.find(element => element.usage === "BoneIndices" && element.usageIndex === 0);
    if (!!boneIndices !== !!boneBindings.length)
    {
        invalid(`${label} BoneIndices and bone bindings must either both be present or both be absent`, options);
    }
    if (boneIndices?.type === "UInt8" && boneBindings.length > UINT8_MAX)
    {
        invalid(`${label} has more than 255 bindings for UInt8 BoneIndices`, options);
    }
    if (boneBindings.length > UINT16_MAX) invalid(`${label} has more than 65535 bone bindings`, options);
    uniqueNames(boneBindings.map(binding => binding?.name), `${label} bone bindings`, options, false);
    const uvDensities = array(mesh.uvDensities, `${label} uvDensities`, options);
    const uvCount = decl.reduce((count, element) =>
        element.usage === "TexCoord" ? Math.max(count, element.usageIndex + 1) : count, 0);
    if (uvDensities.length !== uvCount) invalid(`${label} uvDensities count does not match UV channel count`, options);
    uvDensities.forEach((density, index) =>
    {
        if (typeof density !== "number") invalid(`${label} uvDensities[${index}] must be a number`, options);
    });

    const skeleton = mesh.skeleton;
    if (skeleton !== null && skeleton !== undefined)
    {
        uint(skeleton, UINT8_MAX - 1, `${label} skeleton`, options);
        if (skeleton >= graph.skeletons.length) invalid(`${label} references an out-of-range skeleton`, options);
        const skeletonBones = graph.skeletons[skeleton].bones;
        if (boneBindings.length > skeletonBones.length) invalid(`${label} binds more bones than its skeleton`, options);
        for (const binding of boneBindings)
        {
            if (!skeletonBones.includes(binding.name)) invalid(`${label} binding ${JSON.stringify(binding.name)} is absent from its skeleton`, options);
        }
    }

    validateAudioOcclusionMesh(mesh.audioOcclusionMesh, label, options);
    validateBounds(mesh.bounds, `${label} bounds`, options);
    uniqueNames(targets.map(target => target?.name), `${label} morph targets`, options, false);
    targets.forEach((target, index) =>
    {
        const maxDisplacement = target.maxDisplacement ?? 0;
        if (typeof maxDisplacement !== "number") invalid(`${label} morph target ${index} maxDisplacement must be a number`, options);
        if (maxDisplacement < 0) invalid(`${label} morph target ${index} has negative maxDisplacement`, options);
    });
}

function validateSkeleton(skeleton, skeletonIndex, options)
{
    if (!skeleton || typeof skeleton !== "object") invalid(`skeleton ${skeletonIndex} must be an object`, options);
    name(skeleton.name ?? "", `skeleton ${skeletonIndex} name`, options);
    const label = `skeleton ${JSON.stringify(skeleton.name ?? "")}`;
    const bones = array(skeleton.bones, `${label} bones`, options);
    const parents = array(skeleton.parents, `${label} parents`, options);
    const rests = array(skeleton.restTransforms, `${label} rest transforms`, options);
    const inverseBinds = array(skeleton.invBindTransforms, `${label} inverse binds`, options);
    if (!bones.length) invalid(`${label} has no bones`, options);
    if (parents.length !== bones.length || rests.length !== bones.length || inverseBinds.length !== bones.length)
    {
        invalid(`${label} arrays have mismatched lengths`, options);
    }
    uniqueNames(bones, `${label} bones`, options, false);
    parents.forEach((parent, index) =>
    {
        uint(parent, UINT32_MAX, `${label} parent ${index}`, options);
        if (parent !== UINT32_MAX && (parent >= bones.length || parent >= index))
        {
            invalid(`${label} bone ${index} has an out-of-range or forward parent`, options);
        }
    });
    rests.forEach((rest, index) =>
    {
        if (!rest || typeof rest !== "object" || Array.isArray(rest))
        {
            invalid(`${label} rest ${index} must be an object`, options);
        }
        finiteArray(rest?.position ?? [ 0, 0, 0 ], 3, `${label} rest ${index} position`, options);
        finiteArray(rest?.rotation ?? [ 0, 0, 0, 1 ], 4, `${label} rest ${index} rotation`, options);
        finiteArray(rest?.scale ?? [ 1, 1, 1 ], 3, `${label} rest ${index} scale`, options);
    });
    inverseBinds.forEach((matrix, index) => finiteArray(matrix, 16, `${label} inverse bind ${index}`, options));

    const masks = array(skeleton.boneMasks, `${label} bone masks`, options);
    uniqueNames(masks.map(mask => mask?.name), `${label} bone masks`, options, false);
    for (let maskIndex = 0; maskIndex < masks.length; maskIndex++)
    {
        const weights = array(masks[maskIndex]?.weights, `${label} bone mask ${maskIndex} weights`, options);
        for (let weightIndex = 0; weightIndex < weights.length; weightIndex++)
        {
            const weight = weights[weightIndex];
            if (!weight || typeof weight !== "object" || Array.isArray(weight))
            {
                invalid(`${label} bone mask ${maskIndex} weight ${weightIndex} must be an object`, options);
            }
            const boneIndex = uint(
                weight?.index ?? 0,
                UINT32_MAX,
                `${label} bone mask ${maskIndex} weight ${weightIndex} index`,
                options
            );
            if (boneIndex >= bones.length) invalid(`${label} bone mask ${maskIndex} has an out-of-range index`, options);
            const value = weight.weight ?? 1;
            finiteFloat(value, `${label} bone mask ${maskIndex} weight ${weightIndex}`, options);
            if (value < 0 || value > 1) invalid(`${label} bone mask ${maskIndex} weight is outside 0..1`, options);
        }
    }
}

function byteArray(value, label, options)
{
    const bytes = Array.isArray(value)
        ? value
        : ArrayBuffer.isView(value)
            ? Array.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength))
            : value instanceof ArrayBuffer
                ? Array.from(new Uint8Array(value))
                : null;
    if (!bytes) invalid(`${label} must be a byte array`, options);
    for (let index = 0; index < bytes.length; index++) uint(bytes[index], UINT8_MAX, `${label}[${index}]`, options);
    return bytes;
}

function decodedScalars(bytes, type)
{
    const data = Uint8Array.from(bytes);
    const view = new DataView(data.buffer);
    const size = elementTypeSize(type);
    const output = new Array(data.byteLength / size);
    for (let index = 0; index < output.length; index++) output[index] = readElementComponent(view, index * size, type);
    return output;
}

function validateCurve(curve, animationLabel, curveIndex, options)
{
    const label = `${animationLabel} curve ${curveIndex}`;
    if (!curve || typeof curve !== "object") invalid(`${label} must be an object`, options);
    const knotCount = uint(curve.knotCount, UINT32_MAX, `${label} knotCount`, options);
    if (!knotCount) invalid(`${label} has no keyframes`, options);
    if (!ElementType.includes(curve.knotType)) invalid(`${label} has invalid knotType`, options);
    if (!ElementType.includes(curve.valueType)) invalid(`${label} has invalid valueType`, options);
    if (!Interpolation.includes(curve.interpolation)) invalid(`${label} has invalid interpolation`, options);
    const valueDimension = uint(curve.valueDimension, UINT8_MAX, `${label} valueDimension`, options);
    if (!valueDimension) invalid(`${label} has zero valueDimension`, options);
    const knots = byteArray(curve.knots, `${label} knots`, options);
    const values = byteArray(curve.values, `${label} values`, options);
    if (knots.length !== knotCount * elementTypeSize(curve.knotType)) invalid(`${label} knot buffer size is inconsistent`, options);
    if (values.length !== knotCount * valueDimension * elementTypeSize(curve.valueType))
    {
        invalid(`${label} value buffer size is inconsistent`, options);
    }
    const decodedKnots = decodedScalars(knots, curve.knotType);
    const decodedValues = decodedScalars(values, curve.valueType);
    if (decodedKnots.some(value => !Number.isFinite(value))) invalid(`${label} has non-finite knots`, options);
    if (decodedValues.some(value => !Number.isFinite(value))) invalid(`${label} has non-finite values`, options);
    for (let index = 1; index < decodedKnots.length; index++)
    {
        if (decodedKnots[index] < decodedKnots[index - 1]) invalid(`${label} knots are not ascending`, options);
    }
}

function validateAnimation(animation, animationIndex, options)
{
    if (!animation || typeof animation !== "object") invalid(`animation ${animationIndex} must be an object`, options);
    name(animation.name ?? "", `animation ${animationIndex} name`, options);
    const label = `animation ${JSON.stringify(animation.name ?? "")}`;
    if (typeof animation.duration !== "number") invalid(`${label} duration must be a number`, options);
    if (animation.duration <= 0) invalid(`${label} has non-positive duration`, options);
    const channels = array(animation.channels, `${label} channels`, options);
    const curves = array(animation.curves, `${label} curves`, options);
    if (!channels.length) invalid(`${label} has no channels`, options);
    curves.forEach((curve, index) => validateCurve(curve, label, index, options));
    for (let index = 0; index < channels.length; index++)
    {
        const channel = channels[index];
        if (!channel || typeof channel !== "object") invalid(`${label} channel ${index} must be an object`, options);
        name(channel.target, `${label} channel ${index} target`, options, false);
        if (!AnimationChannelTargetType.includes(channel.targetType)) invalid(`${label} channel ${index} has invalid targetType`, options);
        const curveIndex = uint(channel.curveIndex, UINT32_MAX, `${label} channel ${index} curveIndex`, options);
        if (curveIndex >= curves.length) invalid(`${label} channel ${index} references an out-of-range curve`, options);
        const dimension = curves[curveIndex].valueDimension;
        if ([ "BonePosition", "BoneScale" ].includes(channel.targetType) && dimension !== 3 ||
            channel.targetType === "BoneRotation" && dimension !== 4 ||
            channel.targetType === "MorphTarget" && dimension !== 1)
        {
            invalid(`${label} channel ${index} has an incompatible curve dimension`, options);
        }
    }
}

function validateMetadata(metadata, options)
{
    if (metadata === undefined || metadata === null) return;
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) invalid("metadata must be an object", options);
    const entries = array(metadata.entries, "metadata entries", options);
    uniqueNames(entries.map(entry => entry?.key), "metadata keys", options, false);
    entries.forEach((entry, index) => name(entry?.value ?? "", `metadata value ${index}`, options));
}

/**
 * Validate a decoded/native CMF v1 graph with Carbon's graph and buffer rules.
 *
 * Source: mesh/src/cmf/utils.cpp (IsMeshValid, IsSkeletonValid,
 * IsAnimationValid, AreBufferViewsValid, AreBuffersValid).
 *
 * @param {object} graph CMF graph, optionally carrying parsed sections and decoded/supplied buffers.
 * @param {{ phase?: "read"|"write" }} [options] Validation context.
 * @returns {object} The validated graph.
 */
export function validateCmfGraph(graph, options = {})
{
    if (!graph || typeof graph !== "object" || Array.isArray(graph)) invalid("root must be an object", options);
    const meshes = array(graph.meshes, "meshes", options);
    const skeletons = array(graph.skeletons, "skeletons", options);
    const animations = array(graph.animations, "animations", options);
    const validatedGraph = { ...graph, meshes, skeletons, animations };
    skeletons.forEach((skeleton, index) => validateSkeleton(skeleton, index, options));
    meshes.forEach((mesh, index) => validateMesh(mesh, index, validatedGraph, options));
    animations.forEach((animation, index) => validateAnimation(animation, index, options));
    validateMetadata(graph.metadata, options);
    return graph;
}

/** Validate parsed CMF header sections against Carbon's file rules. */
export function validateCmfSections(header, fileSize, options = {})
{
    if (header.headerSize < 32 || header.headerSize > fileSize) invalid("headerSize is outside the file", options);
    const sections = array(header.sections, "header sections", options);
    if (!sections.length) invalid("header contains no sections", options);
    let lastEnd = header.headerSize;
    for (let index = 0; index < sections.length; index++)
    {
        const section = sections[index];
        if (!SectionType.includes(section.type)) invalid(`section ${index} has invalid type`, options);
        if (!SectionCompression.includes(section.compression)) invalid(`section ${index} has invalid compression`, options);
        uint(section.offset, UINT32_MAX, `section ${index}.offset`, options);
        uint(section.compressedSize, UINT32_MAX, `section ${index}.compressedSize`, options);
        uint(section.uncompressedSize, UINT32_MAX, `section ${index}.uncompressedSize`, options);
        uint(section.gpuAlignment, UINT16_MAX, `section ${index}.gpuAlignment`, options);
        if (section.offset + section.compressedSize > fileSize) invalid(`section ${index} exceeds file bounds`, options);
        if (section.offset < lastEnd) invalid(`section ${index} overlaps a previous section`, options);
        if (section.compression === "None" && section.compressedSize !== section.uncompressedSize)
        {
            invalid(`section ${index} has mismatched compressed and uncompressed sizes`, options);
        }
        if (section.gpuAlignment && section.uncompressedSize % section.gpuAlignment)
        {
            invalid(`section ${index} size is not a multiple of GPU alignment`, options);
        }
        if (section.compression !== "None" && !section.gpuAlignment)
        {
            invalid(`compressed section ${index} has zero GPU alignment`, options);
        }
        if (index === 0 && section.type !== "Data") invalid("first section is not Data", options);
        if (index > 0 && section.type === "Data") invalid("file contains multiple Data sections", options);
        if (section.type === "Data" && section.compression !== "None") invalid("Data section is compressed", options);
        if (section.type === "Metadata" && index !== sections.length - 1) invalid("Metadata section is not last", options);
        if (section.type === "Metadata" && section.compression !== "None") invalid("Metadata section is compressed", options);
        lastEnd = section.offset + section.compressedSize;
    }
    if (sections[0].offset % 8) invalid("Data section is not 8-byte aligned", options);
    const metadata = sections.at(-1);
    if (metadata.type === "Metadata" && metadata.offset % 8) invalid("Metadata section is not 8-byte aligned", options);
}
