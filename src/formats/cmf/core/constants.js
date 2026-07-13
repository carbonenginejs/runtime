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

export const Usage = Object.freeze([
    "Position",
    "Normal",
    "Tangent",
    "Binormal",
    "TexCoord",
    "Color",
    "BoneIndices",
    "BoneWeights",
    "PackedTangent",
    "PackedTangentLegacy"
]);

export const ElementType = Object.freeze([
    "Float32",
    "Float16",
    "UInt16Norm",
    "UInt16",
    "Int16Norm",
    "Int16",
    "UInt8Norm",
    "UInt8",
    "Int8Norm",
    "Int8"
]);

export const MeshTopology = Object.freeze([
    "TriangleList",
    "PointList"
]);

export const SectionType = Object.freeze([
    "Data",
    "GpuBuffer",
    "Metadata"
]);

export const SectionCompression = Object.freeze([
    "None",
    "MeshOptimizerVertexBuffer",
    "MeshOptimizerIndexBuffer"
]);

export const AnimationChannelTargetType = Object.freeze([
    "BonePosition",
    "BoneRotation",
    "BoneScale",
    "MorphTarget",
    "Other"
]);

export const Interpolation = Object.freeze([
    "Step",
    "Linear"
]);

export const CMF_CLASS_KEYS = Object.freeze([
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
]);

export const GR2_CLASS_KEYS = Object.freeze([
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
    "Curve"
]);

export const CLASS_KEYS = Object.freeze(Array.from(new Set([
    ...CMF_CLASS_KEYS,
    ...GR2_CLASS_KEYS
])));
