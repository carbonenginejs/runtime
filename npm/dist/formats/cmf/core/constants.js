const FILE_SIGNATURE = 0x66666D63;
const FILE_VERSION = 1;
const OUTPUT_JSON = "json";
const OUTPUT_CMF = "cmf";
const OUTPUT_CMF_JSON = "cmfJson";
const OUTPUT_GR2 = "gr2";
const OUTPUT_NATIVE = "native";
const OUTPUT_RAW = "raw";
const OUTPUT_SHARED = "shared";
const STRUCT_SIZE = Object.freeze({
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
const Usage = Object.freeze(["Position", "Normal", "Tangent", "Binormal", "TexCoord", "Color", "BoneIndices", "BoneWeights", "PackedTangent", "PackedTangentLegacy"]);
const ElementType = Object.freeze(["Float32", "Float16", "UInt16Norm", "UInt16", "Int16Norm", "Int16", "UInt8Norm", "UInt8", "Int8Norm", "Int8"]);
const MeshTopology = Object.freeze(["TriangleList", "PointList"]);
const SectionType = Object.freeze(["Data", "GpuBuffer", "Metadata"]);
const SectionCompression = Object.freeze(["None", "MeshOptimizerVertexBuffer", "MeshOptimizerIndexBuffer"]);
const AnimationChannelTargetType = Object.freeze(["BonePosition", "BoneRotation", "BoneScale", "MorphTarget", "Other"]);
const Interpolation = Object.freeze(["Step", "Linear"]);
const CMF_CLASS_KEYS = Object.freeze(["Root", "Section", "Metadata", "MetadataEntry", "Mesh", "IndexGroup", "VertexElement", "MeshLod", "MeshArea", "LodMeshArea", "BoneBinding", "MorphTargets", "MorphTarget", "LodMorphTarget", "AudioOcclusionMesh", "Skeleton", "BoneMask", "BoneWeight", "Animation", "AnimationChannel", "AnimationCurve"]);
const GR2_CLASS_KEYS = Object.freeze(["Root", "Mesh", "BoneBinding", "IndexGroup", "MorphTarget", "Model", "Skeleton", "Bone", "Animation", "TrackGroup", "TransformTrack", "Curve"]);
const CLASS_KEYS = Object.freeze(Array.from(new Set([...CMF_CLASS_KEYS, ...GR2_CLASS_KEYS])));

export { AnimationChannelTargetType, CLASS_KEYS, CMF_CLASS_KEYS, ElementType, FILE_SIGNATURE, FILE_VERSION, GR2_CLASS_KEYS, Interpolation, MeshTopology, OUTPUT_CMF, OUTPUT_CMF_JSON, OUTPUT_GR2, OUTPUT_JSON, OUTPUT_NATIVE, OUTPUT_RAW, OUTPUT_SHARED, STRUCT_SIZE, SectionCompression, SectionType, Usage };
//# sourceMappingURL=constants.js.map
