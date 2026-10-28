import { blueEnums } from "../../../../global/blue/enums/CjsBlueEnumRegistry.js";
export const FILE_SIGNATURE = 0x66666D63;
export const FILE_VERSION = 1;

export const OUTPUT_JSON = "json";
export const OUTPUT_CMF = "cmf";
export const OUTPUT_CMF_JSON = "cmfJson";
export const OUTPUT_GR2 = "gr2";
export const OUTPUT_NATIVE = "native";
export const OUTPUT_RAW = "raw";
export const OUTPUT_SHARED = "shared";

export const STRUCT_SIZE = Object.freeze({
    BufferView: 16,
    VertexElement: 8,
    MeshArea: 64,
    LodMeshArea: 8,
    BoneBinding: 40,
    MorphTarget: 24,
    MorphTargets: 32,
    LodMorphTarget: 16,
    MeshLod: 72,
    AudioOcclusionMesh: 56,
    Transform: 40,
    BoneWeight: 8,
    BoneMask: 32,
    Skeleton: 96,
    AnimationChannel: 24,
    AnimationCurve: 40,
    Animation: 56,
    MetadataEntry: 32,
    Metadata: 16,
    Section: 16,
    Header: 32,
    Data: 48,
    Mesh: 216
});

export const Usage = blueEnums.Create("resource.cmf.Usage", {
    "Position": 0,
    "Normal": 1,
    "Tangent": 2,
    "Binormal": 3,
    "TexCoord": 4,
    "Color": 5,
    "BoneIndices": 6,
    "BoneWeights": 7,
    "PackedTangent": 8,
    "PackedTangentLegacy": 9
});

export const ElementType = blueEnums.Create("resource.cmf.ElementType", {
    "Float32": 0,
    "Float16": 1,
    "UInt16Norm": 2,
    "UInt16": 3,
    "Int16Norm": 4,
    "Int16": 5,
    "UInt8Norm": 6,
    "UInt8": 7,
    "Int8Norm": 8,
    "Int8": 9
});

export const MeshTopology = blueEnums.Create("resource.cmf.MeshTopology", {
    "TriangleList": 0,
    "PointList": 1
});

export const SectionType = blueEnums.Create("resource.cmf.SectionType", {
    "Data": 0,
    "GpuBuffer": 1,
    "Metadata": 2
});

export const SectionCompression = blueEnums.Create("resource.cmf.SectionCompression", {
    "None": 0,
    "MeshOptimizerVertexBuffer": 1,
    "MeshOptimizerIndexBuffer": 2
});

export const AnimationChannelTargetType = blueEnums.Create("resource.cmf.AnimationChannelTargetType", {
    "BonePosition": 0,
    "BoneRotation": 1,
    "BoneScale": 2,
    "MorphTarget": 3,
    "Other": 4
});

export const Interpolation = blueEnums.Create("resource.cmf.Interpolation", {
    "Step": 0,
    "Linear": 1
});

export const CMF_CLASS_KEYS = [
    "Root",
    "Section",
    "Metadata",
    "MetadataEntry",
    "Mesh",
    "IndexGroup",
    "VertexElement",
    "MeshLod",
    "MeshArea",
    "LodMeshArea",
    "BoneBinding",
    "MorphTargets",
    "MorphTarget",
    "LodMorphTarget",
    "AudioOcclusionMesh",
    "Skeleton",
    "BoneMask",
    "BoneWeight",
    "Animation",
    "AnimationChannel",
    "AnimationCurve"
];

export const GR2_CLASS_KEYS = [
    "Root",
    "Mesh",
    "BoneBinding",
    "IndexGroup",
    "MorphTarget",
    "Model",
    "Skeleton",
    "Bone",
    "Animation",
    "TrackGroup",
    "TransformTrack",
    "VectorTrack",
    "Curve"
];

export const CLASS_KEYS = Array.from(new Set([
    ...CMF_CLASS_KEYS,
    ...GR2_CLASS_KEYS
]));
