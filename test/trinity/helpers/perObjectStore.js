// Test definitions for per-object records that are not yet in Trinity's
// production CjsPerObjectLayouts catalog. Catalogued records resolve their
// fields, encodings, offsets, and stages directly from runtime-trinity.
import { TriPoolAllocator } from "../../../npm/dist/trinity/index.js";


const Type = TriPoolAllocator.Type;

// Additional per-object struct shapes used by tests. Grouping mirrors Carbon's
// declarations and grows as payloads migrate into the production catalog.
export const TEST_PER_OBJECT_STRUCTS = {
  EveBasicPerObjectData: [
    { name: "world",        size: 16, encoding: Type.MATRIX },
    { name: "worldLast",    size: 16, encoding: Type.MATRIX },
    { name: "worldInverse", size: 16, encoding: Type.MATRIX }
  ],
  EveMissileWarheadPerObjectData: [
    { name: "world",       size: 16, encoding: Type.MATRIX },
    { name: "missileSize", size: 4,  encoding: Type.VECTOR }
  ],
  EveSceneStaticParticlesPerObjectData: [
    { name: "world",     size: 16, encoding: Type.MATRIX },
    { name: "lastWorld", size: 16, encoding: Type.MATRIX }
  ],
  // The generic Tr2PerObjectDataStandard pair (EveConstantBufferFormats.h:16/:11)
  // consumed by EveLineSet / EveCurveLineSet / EveEllipseSet as a { vs, ps }
  // record - each half is one WorldMat.
  EvePerObjectVSData: [
    { name: "WorldMat", size: 16, encoding: Type.MATRIX }
  ],
  EvePerObjectPSData: {
    def: [{ name: "WorldMat", size: 16, encoding: Type.MATRIX }],
    stages: ["ps"]
  },
  // EveLensflare.cpp:41-45 - same bytes bound to VS and PS; indices[2..3] are
  // never written in Carbon (arena garbage).
  EveLensflarePerObjectData: {
    def: [
      { name: "directionScale", size: 4, encoding: Type.VECTOR },
      { name: "indices",        size: 1, elements: 4, encoding: Type.UINT }
    ],
    stages: ["vs", "ps"]
  },
  // EveSpherePin.h:25 - the ui variant; same field run as the child pin,
  // same dual binding (EveSpherePin.cpp:415-425).
  EveSpherePinPerObjectData: {
    def: [
      { name: "worldMatrix",      size: 16, encoding: Type.MATRIX },
      { name: "pinPosition",      size: 4,  encoding: Type.VECTOR },
      { name: "pinRotation",      size: 4,  encoding: Type.VECTOR },
      { name: "pinColor",         size: 4,  encoding: Type.VECTOR },
      { name: "pinThreshold",     size: 4,  encoding: Type.VECTOR },
      { name: "pinRadiusPrecalc", size: 4,  encoding: Type.VECTOR },
      { name: "pinUV",            size: 4,  encoding: Type.VECTOR }
    ],
    stages: ["vs", "ps"]
  },
  // EveChildSpherePin.h:16 - same bytes bound to VS and PS.
  EveChildSpherePinPerObjectData: {
    def: [
      { name: "worldMatrix",      size: 16, encoding: Type.MATRIX },
      { name: "pinPosition",      size: 4,  encoding: Type.VECTOR },
      { name: "pinRotation",      size: 4,  encoding: Type.VECTOR },
      { name: "pinColor",         size: 4,  encoding: Type.VECTOR },
      { name: "pinThreshold",     size: 4,  encoding: Type.VECTOR },
      { name: "pinRadiusPrecalc", size: 4,  encoding: Type.VECTOR },
      { name: "pinUV",            size: 4,  encoding: Type.VECTOR }
    ],
    stages: ["vs", "ps"]
  },
  // EveSpaceObjectDecal.h:27-45 - the EveDecalPerObjectData composite,
  // uploaded as two constant buffers (cpp:975-976). m_unused (the vec3 that
  // shares clipRadius2Sq's register) is declared but never written.
  DecalVSPerObjectData: [
    { name: "worldMatrix",           size: 16, encoding: Type.MATRIX },
    { name: "invWorldMatrix",        size: 16, encoding: Type.MATRIX },
    { name: "decalMatrix",           size: 16, encoding: Type.MATRIX },
    { name: "inverseDecalMatrix",    size: 16, encoding: Type.MATRIX },
    { name: "parentBoneMatrix",      size: 16, encoding: Type.MATRIX },
    { name: "invParentBoneMatrix",   size: 16, encoding: Type.MATRIX }
  ],
  DecalPSPerObjectData: {
    def: [
      { name: "displayData",            size: 4, encoding: Type.VECTOR },
      { name: "shipData",               size: 4, encoding: Type.VECTOR },
      { name: "clipData",               size: 4, encoding: Type.VECTOR },
      { name: "clipRadius2Sq",          size: 1, encoding: Type.VECTOR },
      { name: "unused",                 size: 3, encoding: Type.VECTOR },
      { name: "shLightingCoefficients", size: 4, elements: 7, encoding: Type.VECTOR }
    ],
    stages: ["ps"]
  },
  // EveBoosterSet2.h:48-71 - the EveBoosterSetPerObjectData composite: a
  // VertexShaderData + PixelShaderData pair uploaded as two constant buffers
  // (cpp:1325-1329). The padding scalars are declared but never written.
  EveBoosterSetVSData: [
    { name: "shipMatrix",             size: 16, encoding: Type.MATRIX },
    { name: "boosterIntensity",       size: 1,  encoding: Type.VECTOR },
    { name: "shipSpeed",              size: 1,  encoding: Type.VECTOR },
    { name: "maxBoosterSize",         size: 1,  encoding: Type.VECTOR },
    { name: "padding",                size: 1,  encoding: Type.VECTOR },
    { name: "trailsControlPositions", size: 4,  elements: 5, encoding: Type.VECTOR },
    { name: "trailsControlNormals",   size: 4,  elements: 5, encoding: Type.VECTOR }
  ],
  EveBoosterSetPSData: {
    def: [
      { name: "boosterIntensity", size: 1, encoding: Type.VECTOR },
      { name: "trailIntensity",   size: 1, encoding: Type.VECTOR },
      { name: "warpIntensity",    size: 1, encoding: Type.VECTOR },
      { name: "padding2",         size: 1, encoding: Type.VECTOR }
    ],
    stages: ["ps"]
  },
  // EveChildBulletStorm.h:20 - VS only; targetPositionsWS slots past the
  // filled target count stay arena garbage (cpp:403-407).
  EveChildBulletStormPerObjectData: [
    { name: "worldTransform",    size: 16, encoding: Type.MATRIX },
    { name: "effectInfo",        size: 4,  encoding: Type.VECTOR },
    { name: "targetPositionsWS", size: 4,  elements: 10, encoding: Type.VECTOR }
  ],
  // EveStretch2.cpp:327-337 - Carbon uploads the contiguous member run
  // m_source..m_effectData[2] (EveStretch2.h:105-109) as 4 vec4s to VS and PS.
  EveStretch2PerObjectData: {
    def: [
      { name: "sourceData",      size: 4, encoding: Type.VECTOR },
      { name: "destinationData", size: 4, encoding: Type.VECTOR },
      { name: "effectData",      size: 4, elements: 2, encoding: Type.VECTOR }
    ],
    stages: ["vs", "ps"]
  }
};

/** A store with the test structs registered. */
/**
 * Catalogued structs that need no test def: passing no def makes the store take
 * Carbon's declared layout from CjsPerObjectLayouts, which is what production
 * does for these.
 */
const CATALOG_PER_OBJECT_STRUCTS = [
  "EveSpaceObjectVSData",
  "EveSpaceObjectPSData",
  "EveTurretSetVSData",
  "EveTurretSetPSData",
  "EveChildBoosterSetVSData",
  "EveChildBoosterSetPSData"
];


export function makePerObjectStore(options)
{
  const store = new TriPoolAllocator(options).Register(TEST_PER_OBJECT_STRUCTS);

  for (const name of CATALOG_PER_OBJECT_STRUCTS)
  {
    store.RegisterStruct(name);
  }

  return store;
}

/** A render-context stand-in that carries the per-object store. */
export function makeRenderContextWithStore(store = makePerObjectStore())
{
  return { GetTriPoolAllocator: () => store };
}
