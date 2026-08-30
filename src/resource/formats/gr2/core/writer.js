import { CjsFormatWriteError } from "../../../format/CjsFormatError.js";
import { decodeTangentFrame, packTangentFrames } from "#math/tangent";
import { buildCmfFromShared, buildSharedFromCmf } from "../../cmf/core/shared.js";
import { buildGr2Animations } from "../../cmf/core/gr2Compat.js";
import { composeCmfTransform, invertMatrix4, multiplyMatrix4 } from "../../cmf/core/utils/matrix.js";
import { compressGr2Curve } from "./curveCompressor.js";
import { gr2Type, gr2Variant, writeGr2Container } from "./container.js";
import { GRANNY_MEMBER_TYPES as M } from "./reader.js";

const member = (type, name, ref = null, arrayWidth = 0) => ({ type, name, ref, arrayWidth });
const identityTransform = () => ({
    flags: 7,
    position: [ 0, 0, 0 ],
    orientation: [ 0, 0, 0, 1 ],
    scaleShear: [ 1, 0, 0, 0, 1, 0, 0, 0, 1 ]
});

const Int32Element = gr2Type("Int32Element", [ member(M.Int32, "Int32") ]);
const Int16Element = gr2Type("Int16Element", [ member(M.Int16, "Int16") ]);
const UInt16Element = gr2Type("UInt16Element", [ member(M.UInt16, "UInt16") ]);
const UInt8Element = gr2Type("UInt8Element", [ member(M.UInt8, "UInt8") ]);
const Real32Element = gr2Type("Real32Element", [ member(M.Real32, "Real32") ]);
const StringElement = gr2Type("StringElement", [ member(M.String, "String") ]);
const CurveDataHeader = gr2Type("CurveDataHeader", [
    member(M.UInt8, "Format"),
    member(M.UInt8, "Degree")
]);

const CurveDataDaIdentity = gr2Type("CurveDataDaIdentity", [
    member(M.Inline, "CurveDataHeader_DaIdentity", CurveDataHeader),
    member(M.Int16, "Dimension")
]);
const CurveDataDaConstant32f = gr2Type("CurveDataDaConstant32f", [
    member(M.Inline, "CurveDataHeader_DaConstant32f", CurveDataHeader),
    member(M.Int16, "Padding"),
    member(M.ReferenceToArray, "Controls", Real32Element)
]);
const CurveDataD3Constant32f = gr2Type("CurveDataD3Constant32f", [
    member(M.Inline, "CurveDataHeader_D3Constant32f", CurveDataHeader),
    member(M.Int16, "Padding"),
    member(M.Real32, "Controls", null, 3)
]);
const CurveDataD4Constant32f = gr2Type("CurveDataD4Constant32f", [
    member(M.Inline, "CurveDataHeader_D4Constant32f", CurveDataHeader),
    member(M.Int16, "Padding"),
    member(M.Real32, "Controls", null, 4)
]);
const CurveDataDaK32fC32f = gr2Type("CurveDataDaK32fC32f", [
    member(M.Inline, "CurveDataHeader_DaK32fC32f", CurveDataHeader),
    member(M.Int16, "Padding"),
    member(M.ReferenceToArray, "Knots", Real32Element),
    member(M.ReferenceToArray, "Controls", Real32Element)
]);
const CurveDataDaK16uC16u = gr2Type("CurveDataDaK16uC16u", [
    member(M.Inline, "CurveDataHeader_DaK16uC16u", CurveDataHeader),
    member(M.UInt16, "OneOverKnotScaleTrunc"),
    member(M.ReferenceToArray, "ControlScaleOffsets", Real32Element),
    member(M.ReferenceToArray, "KnotsControls", UInt16Element)
]);
const CurveDataD4nK16uC15u = gr2Type("CurveDataD4nK16uC15u", [
    member(M.Inline, "CurveDataHeader_D4nK16uC15u", CurveDataHeader),
    member(M.UInt16, "ScaleOffsetTableEntries"),
    member(M.Real32, "OneOverKnotScale"),
    member(M.ReferenceToArray, "KnotsControls", UInt16Element)
]);
const CurveDataD3K16uC16u = gr2Type("CurveDataD3K16uC16u", [
    member(M.Inline, "CurveDataHeader_D3K16uC16u", CurveDataHeader),
    member(M.UInt16, "OneOverKnotScaleTrunc"),
    member(M.Real32, "ControlScales", null, 3),
    member(M.Real32, "ControlOffsets", null, 3),
    member(M.ReferenceToArray, "KnotsControls", UInt16Element)
]);
const CurveDataD9I1K16uC16u = gr2Type("CurveDataD9I1K16uC16u", [
    member(M.Inline, "CurveDataHeader_D9I1K16uC16u", CurveDataHeader),
    member(M.UInt16, "OneOverKnotScaleTrunc"),
    member(M.Real32, "ControlScale"),
    member(M.Real32, "ControlOffset"),
    member(M.ReferenceToArray, "KnotsControls", UInt16Element)
]);
const CurveDataD9I3K16uC16u = gr2Type("CurveDataD9I3K16uC16u", [
    member(M.Inline, "CurveDataHeader_D9I3K16uC16u", CurveDataHeader),
    member(M.UInt16, "OneOverKnotScaleTrunc"),
    member(M.Real32, "ControlScales", null, 3),
    member(M.Real32, "ControlOffsets", null, 3),
    member(M.ReferenceToArray, "KnotsControls", UInt16Element)
]);
const Curve = gr2Type("Curve", [ member(M.VariantReference, "CurveData") ]);
const TransformTrack = gr2Type("TransformTrack", [
    member(M.String, "Name"),
    member(M.Int32, "Flags"),
    member(M.Inline, "OrientationCurve", Curve),
    member(M.Inline, "PositionCurve", Curve),
    member(M.Inline, "ScaleShearCurve", Curve)
]);
const VectorTrack = gr2Type("VectorTrack", [
    member(M.String, "Name"),
    member(M.UInt32, "TrackKey"),
    member(M.Int32, "Dimension"),
    member(M.Inline, "ValueCurve", Curve)
]);
const TransformLodError = gr2Type("TransformLodError", [ member(M.Real32, "Real32") ]);
const TextTrackEntry = gr2Type("TextTrackEntry", [
    member(M.Real32, "TimeStamp"),
    member(M.String, "Text")
]);
const TextTrack = gr2Type("TextTrack", [
    member(M.String, "Name"),
    member(M.ReferenceToArray, "Entries", TextTrackEntry)
]);
const PeriodicLoop = gr2Type("PeriodicLoop", [
    member(M.Real32, "Radius"),
    member(M.Real32, "dAngle"),
    member(M.Real32, "dZ"),
    member(M.Real32, "BasisX", null, 3),
    member(M.Real32, "BasisY", null, 3),
    member(M.Real32, "Axis", null, 3)
]);
const TrackGroup = gr2Type("TrackGroup", [
    member(M.String, "Name"),
    member(M.ReferenceToArray, "VectorTracks", VectorTrack),
    member(M.ReferenceToArray, "TransformTracks", TransformTrack),
    member(M.ReferenceToArray, "TransformLODErrors", TransformLodError),
    member(M.ReferenceToArray, "TextTracks", TextTrack),
    member(M.Transform, "InitialPlacement"),
    member(M.Int32, "AccumulationFlags"),
    member(M.Real32, "LoopTranslation", null, 3),
    member(M.Reference, "PeriodicLoop", PeriodicLoop),
    member(M.VariantReference, "ExtendedData")
]);
const Animation = gr2Type("Animation", [
    member(M.String, "Name"),
    member(M.Real32, "Duration"),
    member(M.Real32, "TimeStep"),
    member(M.Real32, "Oversampling"),
    member(M.ArrayOfReferences, "TrackGroups", TrackGroup),
    member(M.Int32, "DefaultLoopCount"),
    member(M.Int32, "Flags"),
    member(M.VariantReference, "ExtendedData")
]);

const ArtToolInfo = gr2Type("ArtToolInfo", [
    member(M.String, "FromArtToolName"),
    member(M.Int32, "ArtToolMajorRevision"),
    member(M.Int32, "ArtToolMinorRevision"),
    member(M.Int32, "ArtToolPointerSize"),
    member(M.Real32, "UnitsPerMeter"),
    member(M.Real32, "Origin", null, 3),
    member(M.Real32, "RightVector", null, 3),
    member(M.Real32, "UpVector", null, 3),
    member(M.Real32, "BackVector", null, 3),
    member(M.VariantReference, "ExtendedData")
]);
const ExporterInfo = gr2Type("ExporterInfo", [
    member(M.String, "ExporterName"),
    member(M.Int32, "ExporterMajorRevision"),
    member(M.Int32, "ExporterMinorRevision"),
    member(M.Int32, "ExporterCustomization"),
    member(M.Int32, "ExporterBuildNumber"),
    member(M.VariantReference, "ExtendedData")
]);
const TextureLayout = gr2Type("TextureLayout", [
    member(M.Int32, "BytesPerPixel"),
    member(M.Int32, "ShiftForComponent", null, 4),
    member(M.Int32, "BitsForComponent", null, 4)
]);
const TextureMipLevel = gr2Type("TextureMipLevel", [
    member(M.Int32, "Stride"),
    member(M.ReferenceToArray, "PixelBytes", UInt8Element)
]);
const TextureImage = gr2Type("TextureImage", [ member(M.ReferenceToArray, "MIPLevels", TextureMipLevel) ]);
const Texture = gr2Type("Texture", [
    member(M.String, "FromFileName"),
    member(M.Int32, "TextureType"),
    member(M.Int32, "Width"),
    member(M.Int32, "Height"),
    member(M.Int32, "Encoding"),
    member(M.Int32, "SubFormat"),
    member(M.Inline, "Layout", TextureLayout),
    member(M.ReferenceToArray, "Images", TextureImage),
    member(M.VariantReference, "ExtendedData")
]);
let Material;
const MaterialMap = gr2Type("MaterialMap", [
    member(M.String, "Usage"),
    member(M.Reference, "Map", null)
]);
Material = gr2Type("Material", [
    member(M.String, "Name"),
    member(M.ReferenceToArray, "Maps", MaterialMap),
    member(M.Reference, "Texture", Texture),
    member(M.VariantReference, "ExtendedData")
]);
// Resolve the recursive material-map reference after both type objects exist.
MaterialMap.members[1] = { ...MaterialMap.members[1], ref: Material };

const Bone = gr2Type("Bone", [
    member(M.String, "Name"),
    member(M.Int32, "ParentIndex"),
    member(M.Transform, "Transform"),
    member(M.Real32, "InverseWorldTransform", null, 16),
    member(M.Real32, "LODError"),
    member(M.VariantReference, "ExtendedData")
]);
const Skeleton = gr2Type("Skeleton", [
    member(M.String, "Name"),
    member(M.ReferenceToArray, "Bones", Bone),
    member(M.Int32, "LODType"),
    member(M.VariantReference, "ExtendedData")
]);
const VertexAnnotationSet = gr2Type("VertexAnnotationSet", [
    member(M.String, "Name"),
    member(M.ReferenceToVariantArray, "VertexAnnotations"),
    member(M.Int32, "IndicesMapFromVertexToAnnotation"),
    member(M.ReferenceToArray, "VertexAnnotationIndices", Int32Element)
]);
const VertexData = gr2Type("VertexData", [
    member(M.ReferenceToVariantArray, "Vertices"),
    member(M.ReferenceToArray, "VertexComponentNames", StringElement),
    member(M.ReferenceToArray, "VertexAnnotationSets", VertexAnnotationSet)
]);
const TriMaterialGroup = gr2Type("TriMaterialGroup", [
    member(M.Int32, "MaterialIndex"),
    member(M.Int32, "TriFirst"),
    member(M.Int32, "TriCount")
]);
const TriAnnotationSet = gr2Type("TriAnnotationSet", [
    member(M.String, "Name"),
    member(M.ReferenceToVariantArray, "TriAnnotations"),
    member(M.Int32, "IndicesMapFromTriToAnnotation"),
    member(M.ReferenceToArray, "TriAnnotationIndices", Int32Element)
]);
const TriTopology = gr2Type("TriTopology", [
    member(M.ReferenceToArray, "Groups", TriMaterialGroup),
    member(M.ReferenceToArray, "Indices", Int32Element),
    member(M.ReferenceToArray, "Indices16", Int16Element),
    member(M.ReferenceToArray, "VertexToVertexMap", Int32Element),
    member(M.ReferenceToArray, "VertexToTriangleMap", Int32Element),
    member(M.ReferenceToArray, "SideToNeighborMap", Int32Element),
    member(M.ReferenceToArray, "PolygonIndexStarts", Int32Element),
    member(M.ReferenceToArray, "PolygonIndices", Int32Element),
    member(M.ReferenceToArray, "BonesForTriangle", Int32Element),
    member(M.ReferenceToArray, "TriangleToBoneIndices", Int32Element),
    member(M.ReferenceToArray, "TriAnnotationSets", TriAnnotationSet)
]);
const MorphTarget = gr2Type("MorphTarget", [
    member(M.String, "ScalarName"),
    member(M.Reference, "VertexData", VertexData),
    member(M.Int32, "DataIsDeltas")
]);
const MaterialBinding = gr2Type("MaterialBinding", [ member(M.Reference, "Material", Material) ]);
const BoneBinding = gr2Type("BoneBinding", [
    member(M.String, "BoneName"),
    member(M.Real32, "OBBMin", null, 3),
    member(M.Real32, "OBBMax", null, 3),
    member(M.ReferenceToArray, "TriangleIndices", Int32Element)
]);
const Mesh = gr2Type("Mesh", [
    member(M.String, "Name"),
    member(M.Reference, "PrimaryVertexData", VertexData),
    member(M.ReferenceToArray, "MorphTargets", MorphTarget),
    member(M.Reference, "PrimaryTopology", TriTopology),
    member(M.ReferenceToArray, "MaterialBindings", MaterialBinding),
    member(M.ReferenceToArray, "BoneBindings", BoneBinding),
    member(M.VariantReference, "ExtendedData")
]);
const MeshBinding = gr2Type("MeshBinding", [ member(M.Reference, "Mesh", Mesh) ]);
const Model = gr2Type("Model", [
    member(M.String, "Name"),
    member(M.Reference, "Skeleton", Skeleton),
    member(M.Transform, "InitialPlacement"),
    member(M.ReferenceToArray, "MeshBindings", MeshBinding),
    member(M.VariantReference, "ExtendedData")
]);
const FileInfo = gr2Type("FileInfo", [
    member(M.Reference, "ArtToolInfo", ArtToolInfo),
    member(M.Reference, "ExporterInfo", ExporterInfo),
    member(M.String, "FromFileName"),
    member(M.ArrayOfReferences, "Textures", Texture),
    member(M.ArrayOfReferences, "Materials", Material),
    member(M.ArrayOfReferences, "Skeletons", Skeleton),
    member(M.ArrayOfReferences, "VertexDatas", VertexData),
    member(M.ArrayOfReferences, "TriTopologies", TriTopology),
    member(M.ArrayOfReferences, "Meshes", Mesh),
    member(M.ArrayOfReferences, "Models", Model),
    member(M.ArrayOfReferences, "TrackGroups", TrackGroup),
    member(M.ArrayOfReferences, "Animations", Animation),
    member(M.VariantReference, "ExtendedData")
]);

const STATIC_TYPES = [
    Int32Element, Int16Element, UInt16Element, UInt8Element, Real32Element, StringElement,
    CurveDataHeader, CurveDataDaIdentity, CurveDataDaConstant32f, CurveDataD3Constant32f,
    CurveDataD4Constant32f, CurveDataDaK32fC32f, CurveDataDaK16uC16u,
    CurveDataD4nK16uC15u, CurveDataD3K16uC16u, CurveDataD9I1K16uC16u,
    CurveDataD9I3K16uC16u, Curve, TransformTrack, VectorTrack, TransformLodError,
    TextTrackEntry, TextTrack, PeriodicLoop, TrackGroup, Animation, ArtToolInfo,
    ExporterInfo, TextureLayout, TextureMipLevel, TextureImage, Texture, MaterialMap,
    Material, Bone, Skeleton, VertexAnnotationSet, VertexData, TriMaterialGroup,
    TriAnnotationSet, TriTopology, MorphTarget, MaterialBinding, BoneBinding, Mesh,
    MeshBinding, Model, FileInfo
];

function validateOptions(options)
{
    const tangentMode = options.tangentMode ?? "preserve";
    if (![ "preserve", "packed", "unpacked" ].includes(tangentMode))
    {
        throw new CjsFormatWriteError(`GR2 writer unknown tangentMode "${tangentMode}"`);
    }
    return {
        tangentMode,
        compressedCurves: options.compressedCurves !== false,
        positionTolerance: options.positionTolerance,
        orientationTolerance: options.orientationTolerance,
        scaleShearTolerance: options.scaleShearTolerance,
        sourceName: options.sourceName ?? ""
    };
}

function unpackQuaternionFrames(values)
{
    const result = { normal: [], tangent: [], binormal: [] };
    for (let offset = 0; offset < values.length; offset += 4)
    {
        const
            x = values[offset], y = values[offset + 1], z = values[offset + 2],
            sign = values[offset + 3] < 0 ? -1 : 1,
            w = Math.sqrt(Math.max(0, 1 - x * x - y * y - z * z)),
            x2 = x * x, y2 = y * y, z2 = z * z,
            xy = 2 * x * y, xz = 2 * x * z, yz = 2 * y * z,
            xw = 2 * x * w, yw = 2 * y * w, zw = 2 * z * w;
        result.tangent.push(1 - 2 * y2 - 2 * z2, xy + zw, xz - yw);
        result.binormal.push(xy - zw, 1 - 2 * x2 - 2 * z2, yz + xw);
        result.normal.push((xz + yw) * sign, (yz - xw) * sign, (1 - 2 * x2 - 2 * y2) * sign);
    }
    return result;
}

function unpackLegacyFrames(values)
{
    const result = { normal: [], tangent: [], binormal: [] };
    for (let offset = 0; offset < values.length; offset += 4)
    {
        const frame = decodeTangentFrame(values.slice(offset, offset + 4));
        result.normal.push(...frame.N);
        result.tangent.push(...frame.T);
        result.binormal.push(...frame.B);
    }
    return result;
}

function tangentData(vertex, count, tangentMode)
{
    const
        legacy = vertex.packedTangentLegacy?.length === count * 4
            ? vertex.packedTangentLegacy
            : vertex.tangent?.length === count * 4 && !vertex.normal?.length && !vertex.binormal?.length
                ? vertex.tangent
                : null,
        quaternion = vertex.packedTangent?.length === count * 4 ? vertex.packedTangent : null,
        explicit = vertex.normal?.length === count * 3 && vertex.tangent?.length === count * 3 &&
            vertex.binormal?.length === count * 3
            ? { normal: vertex.normal, tangent: vertex.tangent, binormal: vertex.binormal }
            : null,
        packed = tangentMode === "packed" || tangentMode === "preserve" && !!(legacy || quaternion);
    if (!legacy && !quaternion && !explicit) return { packed, values: null };
    if (packed)
    {
        if (legacy) return { packed: true, values: legacy };
        const frame = explicit ?? unpackQuaternionFrames(quaternion);
        return { packed: true, values: packTangentFrames(frame.normal, frame.tangent, frame.binormal) };
    }
    return { packed: false, values: explicit ?? (legacy ? unpackLegacyFrames(legacy) : unpackQuaternionFrames(quaternion)) };
}

function channel(values, width, count, name)
{
    if (!values?.length) return null;
    if (values.length !== width * count)
    {
        throw new CjsFormatWriteError(`GR2 writer vertex channel ${name} has ${values.length} values, expected ${width * count}`);
    }
    return values;
}

function vertexData(vertex, options, typeSuffix)
{
    const positions = vertex.position ?? [];
    if (positions.length % 3 !== 0)
    {
        throw new CjsFormatWriteError("GR2 writer positions must contain complete xyz values");
    }
    const count = positions.length / 3;
    const fields = [ member(M.Real32, "Position", null, 3) ];
    const sources = [ [ "Position", positions, 3, value => value ] ];
    const add = (name, values, width, type, encode = value => value) =>
    {
        if (!channel(values, width, count, name)) return;
        fields.push(member(type, name, null, width));
        sources.push([ name, values, width, encode ]);
    };

    add("BoneWeights", vertex.blendWeight, 4, M.NormalUInt8,
        value => Math.round(Math.max(0, Math.min(1, value)) * 255));
    const maxBoneIndex = (vertex.blendIndice ?? []).reduce((maximum, value) => Math.max(maximum, value), 0);
    add("BoneIndices", vertex.blendIndice, 4, maxBoneIndex > 255 ? M.UInt16 : M.UInt8, value => value);

    const tangents = tangentData(vertex, count, options.tangentMode);
    if (tangents.values)
    {
        if (tangents.packed)
        {
            add("Tangent", tangents.values, 4, M.NormalUInt8,
                value => Math.round(Math.max(0, Math.min(1, value)) * 255));
        }
        else
        {
            add("Normal", tangents.values.normal, 3, M.Real32);
            add("Tangent", tangents.values.tangent, 3, M.Real32);
            add("Binormal", tangents.values.binormal, 3, M.Real32);
        }
    }
    add("DiffuseColor0", vertex.color0, 4, M.NormalUInt8,
        value => Math.round(Math.max(0, Math.min(1, value)) * 255));
    add("TextureCoordinates0", vertex.texcoord0, 2, M.Real32);
    add("TextureCoordinates1", vertex.texcoord1, 2, M.Real32);

    const type = gr2Type(`Vertex_${typeSuffix}`, fields);
    const vertices = new Array(count);
    for (let index = 0; index < count; index++)
    {
        const item = {};
        for (const [ name, values, width, encode ] of sources)
        {
            const output = new Array(width);
            for (let component = 0; component < width; component++)
            {
                output[component] = encode(values[index * width + component]);
            }
            item[name] = output;
        }
        vertices[index] = item;
    }
    return {
        type,
        value: {
            Vertices: gr2Variant(type, vertices),
            VertexComponentNames: fields.map(field => field.name),
            VertexAnnotationSets: []
        }
    };
}

function buildTopology(groups)
{
    const indices = [];
    const topologyGroups = [];
    let triangle = 0;
    for (let groupIndex = 0; groupIndex < groups.length; groupIndex++)
    {
        const faces = groups[groupIndex].faces ?? [];
        if (faces.length % 3 !== 0)
        {
            throw new CjsFormatWriteError(`GR2 writer index group ${groupIndex} is not a triangle list`);
        }
        for (const index of faces)
        {
            if (!Number.isInteger(index) || index < 0) throw new CjsFormatWriteError("GR2 writer indices must be non-negative integers");
            indices.push(index);
        }
        const triangleCount = faces.length / 3;
        topologyGroups.push({ MaterialIndex: groupIndex, TriFirst: triangle, TriCount: triangleCount });
        triangle += triangleCount;
    }
    const use16 = indices.every(index => index <= 0x7fff);
    return {
        Groups: topologyGroups,
        Indices: use16 ? [] : indices,
        Indices16: use16 ? indices : [],
        VertexToVertexMap: [],
        VertexToTriangleMap: [],
        SideToNeighborMap: [],
        PolygonIndexStarts: [],
        PolygonIndices: [],
        BonesForTriangle: [],
        TriangleToBoneIndices: [],
        TriAnnotationSets: []
    };
}

function lodSources(mesh)
{
    const lods = (mesh.lods ?? []).filter(lod => lod?.vertex && lod?.indices);
    if (!lods.length) return [ { vertex: mesh.vertex ?? {}, indices: mesh.indices ?? [], morphTargets: mesh.morphTargets ?? [] } ];
    return lods.map((lod, index) => ({
        vertex: lod.vertex,
        indices: lod.indices,
        threshold: lod.threshold,
        morphTargets: (lod.morphTargets ?? []).map((target, targetIndex) => ({
            ...(mesh.morphTargets?.[targetIndex] ?? {}),
            ...target
        })),
        index
    }));
}

function buildMeshes(shared, options, dynamicTypes)
{
    const meshes = [];
    const vertexDatas = [];
    const topologies = [];
    const materials = [];
    const sourceIndices = [];
    for (let meshIndex = 0; meshIndex < (shared.meshes ?? []).length; meshIndex++)
    {
        const source = shared.meshes[meshIndex];
        const lods = lodSources(source);
        for (let lodIndex = 0; lodIndex < lods.length; lodIndex++)
        {
            const lod = lods[lodIndex];
            const primary = vertexData(lod.vertex ?? {}, options, `${meshIndex}_${lodIndex}`);
            dynamicTypes.push(primary.type);
            vertexDatas.push(primary.value);
            const topology = buildTopology(lod.indices ?? []);
            topologies.push(topology);

            const meshMaterials = (lod.indices ?? []).map((group, groupIndex) => ({
                Name: group.name ?? `area_${groupIndex}`,
                Maps: [],
                Texture: null,
                ExtendedData: null
            }));
            for (const material of meshMaterials) materials.push(material);

            const morphTargets = [];
            for (let targetIndex = 0; targetIndex < (lod.morphTargets ?? []).length; targetIndex++)
            {
                const target = lod.morphTargets[targetIndex];
                const data = vertexData(target.vertex ?? {}, options, `${meshIndex}_${lodIndex}_m${targetIndex}`);
                dynamicTypes.push(data.type);
                vertexDatas.push(data.value);
                morphTargets.push({
                    ScalarName: target.name ?? `morph_${targetIndex}`,
                    VertexData: data.value,
                    DataIsDeltas: target.dataIsDeltas === false ? 0 : 1
                });
            }
            const name = lodIndex === 0 ? source.name ?? "" : `${source.name ?? ""} LOD ${lod.threshold ?? lodIndex}`;
            meshes.push({
                Name: name,
                PrimaryVertexData: primary.value,
                MorphTargets: morphTargets,
                PrimaryTopology: topology,
                MaterialBindings: meshMaterials.map(material => ({ Material: material })),
                BoneBindings: (source.boneBindings ?? []).map(binding => ({
                    BoneName: binding.name ?? "",
                    OBBMin: binding.minBounds ?? binding.bounds?.min ?? [ 0, 0, 0 ],
                    OBBMax: binding.maxBounds ?? binding.bounds?.max ?? [ 0, 0, 0 ],
                    TriangleIndices: []
                })),
                ExtendedData: null,
                skeletonIndex: source.skeleton ?? null
            });
            sourceIndices.push(meshIndex);
        }
    }
    return { meshes, vertexDatas, topologies, materials, sourceIndices };
}

function buildSkeletons(cmf)
{
    return (cmf.skeletons ?? []).map((skeleton) =>
    {
        const world = new Array((skeleton.bones ?? []).length);
        return {
            Name: skeleton.name ?? "",
            Bones: (skeleton.bones ?? []).map((name, index) =>
            {
                const
                    rest = skeleton.restTransforms?.[index] ?? {},
                    position = rest.position ?? [ 0, 0, 0 ],
                    orientation = rest.rotation ?? [ 0, 0, 0, 1 ],
                    scale = rest.scale ?? [ 1, 1, 1 ],
                    local = composeCmfTransform(position, orientation, scale),
                    parent = skeleton.parents?.[index] ?? 0xffffffff;
                world[index] = parent === 0xffffffff || parent < 0
                    ? local
                    : multiplyMatrix4(local, world[parent]);
                return {
                    Name: name,
                    ParentIndex: parent === 0xffffffff ? -1 : parent,
                    Transform: {
                        flags: 7,
                        position,
                        orientation,
                        scaleShear: [ scale[0], 0, 0, 0, scale[1], 0, 0, 0, scale[2] ]
                    },
                    InverseWorldTransform: skeleton.invBindTransforms?.[index] ?? invertMatrix4(world[index]),
                    LODError: 0,
                    ExtendedData: null
                };
            }),
            LODType: 0,
            ExtendedData: null
        };
    });
}

function curveVariant(curve)
{
    const header = { Format: curve.format, Degree: curve.degree | 0 };
    switch (curve.format)
    {
        case 1:
            return gr2Variant(CurveDataDaK32fC32f, {
                CurveDataHeader_DaK32fC32f: header, Padding: 0,
                Knots: curve.knots, Controls: curve.controls
            });

        case 2:
            return gr2Variant(CurveDataDaIdentity, {
                CurveDataHeader_DaIdentity: header, Dimension: curve.dimension
            });

        case 3:
            return gr2Variant(CurveDataDaConstant32f, {
                CurveDataHeader_DaConstant32f: header, Padding: 0, Controls: curve.controls
            });

        case 4:
            return gr2Variant(CurveDataD3Constant32f, {
                CurveDataHeader_D3Constant32f: header, Padding: 0, Controls: curve.controls
            });

        case 5:
            return gr2Variant(CurveDataD4Constant32f, {
                CurveDataHeader_D4Constant32f: header, Padding: 0, Controls: curve.controls
            });

        case 6:
            return gr2Variant(CurveDataDaK16uC16u, {
                CurveDataHeader_DaK16uC16u: header,
                OneOverKnotScaleTrunc: curve.oneOverKnotScaleTrunc,
                ControlScaleOffsets: curve.controlScaleOffsets,
                KnotsControls: curve.knotsControls
            });

        case 8:
            return gr2Variant(CurveDataD4nK16uC15u, {
                CurveDataHeader_D4nK16uC15u: header,
                ScaleOffsetTableEntries: curve.scaleOffsetTableEntries,
                OneOverKnotScale: curve.oneOverKnotScale,
                KnotsControls: curve.knotsControls
            });

        case 10:
            return gr2Variant(CurveDataD3K16uC16u, {
                CurveDataHeader_D3K16uC16u: header,
                OneOverKnotScaleTrunc: curve.oneOverKnotScaleTrunc,
                ControlScales: curve.controlScales,
                ControlOffsets: curve.controlOffsets,
                KnotsControls: curve.knotsControls
            });

        case 12:
            return gr2Variant(CurveDataD9I1K16uC16u, {
                CurveDataHeader_D9I1K16uC16u: header,
                OneOverKnotScaleTrunc: curve.oneOverKnotScaleTrunc,
                ControlScale: curve.controlScales[0],
                ControlOffset: curve.controlOffsets[0],
                KnotsControls: curve.knotsControls
            });

        case 13:
            return gr2Variant(CurveDataD9I3K16uC16u, {
                CurveDataHeader_D9I3K16uC16u: header,
                OneOverKnotScaleTrunc: curve.oneOverKnotScaleTrunc,
                ControlScales: curve.controlScales,
                ControlOffsets: curve.controlOffsets,
                KnotsControls: curve.knotsControls
            });

        default:
            throw new CjsFormatWriteError(`GR2 writer cannot serialize curve format ${curve.format}`);
    }
}

function writeCurve(source, dimension, options)
{
    const explicit = source?.error
        ? { degree: 0, knots: [ 0 ], controls: dimension === 3 ? [ 0, 0, 0 ] :
            dimension === 4 ? [ 0, 0, 0, 1 ] : dimension === 9 ? [ 1, 0, 0, 0, 1, 0, 0, 0, 1 ] : [ 0 ] }
        : source;
    const packed = compressGr2Curve(explicit, dimension, {
        compressed: options.compressedCurves,
        positionTolerance: options.positionTolerance,
        orientationTolerance: options.orientationTolerance,
        scaleShearTolerance: options.scaleShearTolerance
    });
    return { CurveData: curveVariant(packed) };
}

function buildAnimations(cmf, options)
{
    const animations = buildGr2Animations(cmf).map((animation) => ({
        Name: animation.name,
        Duration: animation.duration,
        TimeStep: animation.timeStep,
        Oversampling: animation.oversampling,
        TrackGroups: animation.trackGroups.map((group) => ({
            Name: group.name,
            VectorTracks: group.vectorTracks.map((track) => ({
                Name: track.name,
                TrackKey: 0,
                Dimension: track.dimension,
                ValueCurve: writeCurve(track.valueCurve, track.dimension, options)
            })),
            TransformTracks: group.transformTracks.map((track) => ({
                Name: track.name,
                Flags: track.flags,
                OrientationCurve: writeCurve(track.orientation, 4, options),
                PositionCurve: writeCurve(track.position, 3, options),
                ScaleShearCurve: writeCurve(track.scaleShear, 9, options)
            })),
            TransformLODErrors: [],
            TextTracks: [],
            InitialPlacement: identityTransform(),
            AccumulationFlags: 0,
            LoopTranslation: [ 0, 0, 0 ],
            PeriodicLoop: null,
            ExtendedData: null
        })),
        DefaultLoopCount: animation.defaultLoopCount,
        Flags: animation.flags,
        ExtendedData: null
    }));
    const trackGroups = [];
    for (const animation of animations)
    {
        for (const group of animation.TrackGroups) trackGroups.push(group);
    }
    return { animations, trackGroups };
}

function buildFileInfo(cmf, shared, options)
{
    const dynamicTypes = [];
    const geometry = buildMeshes(shared, options, dynamicTypes);
    const skeletons = buildSkeletons(cmf);
    const models = skeletons.map((skeleton, skeletonIndex) => ({
        Name: skeleton.Name,
        Skeleton: skeleton,
        InitialPlacement: identityTransform(),
        MeshBindings: geometry.meshes
            .filter(mesh => mesh.skeletonIndex === skeletonIndex)
            .map(mesh => ({ Mesh: mesh })),
        ExtendedData: null
    }));
    const animation = buildAnimations(cmf, options);
    return {
        types: [ ...STATIC_TYPES, ...dynamicTypes ],
        root: {
            ArtToolInfo: null,
            ExporterInfo: {
                ExporterName: "CarbonEngineJS",
                ExporterMajorRevision: 1,
                ExporterMinorRevision: 0,
                ExporterCustomization: 0,
                ExporterBuildNumber: 0,
                ExtendedData: null
            },
            FromFileName: options.sourceName,
            Textures: [],
            Materials: geometry.materials,
            Skeletons: skeletons,
            VertexDatas: geometry.vertexDatas,
            TriTopologies: geometry.topologies,
            Meshes: geometry.meshes,
            Models: models,
            TrackGroups: animation.trackGroups,
            Animations: animation.animations,
            ExtendedData: null
        }
    };
}

/** Serialize a native CMF graph to a canonical uncompressed-section GR2 file. */
export function writeGr2(input, writerOptions = {})
{
    const options = validateOptions(writerOptions);
    if (!input || input.version !== 1 || !Array.isArray(input.meshes))
    {
        throw new CjsFormatWriteError("CjsGr2Format.write expects a native CMF v1 graph");
    }
    const shared = buildSharedFromCmf(input, {});
    const fileInfo = buildFileInfo(input, shared, options);
    return writeGr2Container(FileInfo, fileInfo.root, fileInfo.types);
}

/** Convert shared or GR2-shaped geometry through CMF, then serialize GR2. */
export function writeSharedGr2(input, writerOptions = {})
{
    const options = validateOptions(writerOptions);
    const cmf = buildCmfFromShared(input, {
        ...writerOptions,
        preservePackedTangents: options.tangentMode === "preserve"
    });
    return writeGr2(cmf, options);
}

export const writer = { write: writeGr2, writeShared: writeSharedGr2 };
