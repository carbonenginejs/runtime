// Guards the per-object payload classes against their Carbon C++ declarations.
//
// Carbon uploads per-object data by memcpy'ing the C++ struct into the constant
// buffer, so the struct's float footprint IS the buffer layout. Carbon asserts
// the register rule itself (Tr2PerObjectData.h:57, "Size of per-object data must
// be a multiple of Vector4"); this reproduces that assert on the JS side and
// pins each struct's total against the header.
//
// Every expectation below is the size implied by the quoted Carbon declaration.
// A class that drops an array bound (the historical failure: booster trail rings
// and bullet-storm target positions were declared as single vec4s) fails here
// even though it still constructs and still round-trips.
import test from "node:test";

import { CjsSchema } from "@carbonenginejs/runtime-utils/schema";

import {
  DecalPSPerObjectData,
  DecalVSPerObjectData,
  EveBoosterSetPSData,
  EveBoosterSetVSData,
  EveChildBulletStormPerObjectData,
  EveChildSpherePinPerObjectData,
  EvePerObjectPSData,
  EvePerObjectVSData,
  EveSpaceObjectPSData,
  EveSpaceObjectVSData,
  EveSpacePerObjectData,
  EveSpherePinPerObjectData,
  EveTurretSetPSData,
  EveTurretSetVSData,
  MergeMorphsConstantBuffer
} from "../npm/dist/index.js";


function assert(condition, message = "assertion failed")
{
  if (!condition)
  {
    throw new Error(message);
  }
}


function assertEquals(actual, expected, message = "")
{
  if (actual !== expected)
  {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}


/** Float lanes per declared field kind. */
const LANES = {
  mat4: 16,
  mat3: 9,
  quat: 4,
  color: 4,
  vec4: 4,
  vec3: 3,
  vec2: 2,
  float32: 1,
  uint32: 1,
  int32: 1
};


/** The float footprint a class declares, summed over its schema fields. */
function declaredFloats(model)
{
  const fields = CjsSchema.getSchema(model).fields;
  let floats = 0;

  for (const field of fields)
  {
    const kind = field.type.kind === "array" ? field.type.itemType : field.type.kind;
    const lanes = LANES[kind];

    assert(lanes !== undefined, `${model.name}.${field.name}: unhandled field kind "${kind}"`);
    floats += lanes * (field.type.kind === "array" ? new model()[field.name].length : 1);
  }

  return floats;
}


// [class, floats, Carbon declaration]
const LAYOUTS = [
  [DecalVSPerObjectData, 96, "EveSpaceObjectDecal.h:27 - six Matrix"],
  [DecalPSPerObjectData, 44, "EveSpaceObjectDecal.h:37 - 3 Vector4 + float + Vector3 + Vector4[7]"],
  [EvePerObjectVSData, 16, "EveConstantBufferFormats.h:16 - Matrix WorldMat"],
  [EvePerObjectPSData, 16, "EveConstantBufferFormats.h:11 - Matrix WorldMat"],
  [EveSpaceObjectVSData, 116, "EveSpaceObject2.h:99"],
  [EveSpaceObjectPSData, 116, "EveSpaceObject2.h:122"],
  [EveSpacePerObjectData, 164, "EveSpaceObject2.h:143"],
  [EveChildSpherePinPerObjectData, 40, "EveChildSpherePin.h:16 - Matrix + 6 Vector4"],
  [EveSpherePinPerObjectData, 40, "EveSpherePin.h:25 - Matrix + 6 Vector4"],
  [EveChildBulletStormPerObjectData, 60, "EveChildBulletStorm.h:20 - Matrix + Vector4 + Vector4[10]"],
  [EveBoosterSetVSData, 60, "EveBoosterSet2.h:51 - Matrix + 4 float + 2x Vector4[5]"],
  [EveBoosterSetPSData, 4, "EveBoosterSet2.h:66 - four float"],
  [EveTurretSetVSData, 236, "EveTurretSet.h:47 - 2 Vector4 + 2 Matrix + 4 uint32 + Vector4[24] + Quaternion[24]"],
  [EveTurretSetPSData, 40, "EveTurretSet.h:63 - 2 Vector4 + float + Vector3 + Vector4[7]"],
  [MergeMorphsConstantBuffer, 12, "EveChildMesh.h:33 - twelve uint32_t"]
];


for (const [model, floats, source] of LAYOUTS)
{
  test(`${model.name} matches its Carbon footprint (${source})`, () =>
  {
    assertEquals(declaredFloats(model), floats, `${model.name} float count`);
    // Carbon's own static_assert: the struct must fill whole float4 registers.
    assertEquals((floats * 4) % 16, 0, `${model.name} must be a multiple of Vector4`);
  });
}


test("EveSpacePerObjectData declares Carbon's field order, not the VS/PS order", () =>
{
  // This struct is memcpy'd into a STRUCTURED BUFFER
  // (EveInstancedMeshManager.cpp:69-77), so declaration order is the contract.
  // Carbon puts the five clip scalars at fields 6-10, before the ellipsoid -
  // unlike EveSpaceObjectVSData/PSData, which this class must not be assumed to
  // mirror.
  const order = CjsSchema.getSchema(EveSpacePerObjectData).fields.map((field) => field.name);

  assertEquals(order.join(","), [
    "worldTransform",
    "worldTransformLast",
    "invWorldTransform",
    "shipData",
    "clipSphereCenter",
    "clipRadiusSq",
    "clipRadius2Sq",
    "impactDataOffset",
    "clipSphereFactor2",
    "clipSphereFactor",
    "ellpsoidRadii",
    "ellpsoidCenter",
    "customMaskMatrix",
    "customMaskData",
    "customMaskMaterialIDs",
    "customMaskTargets",
    "customMaskClamps",
    "boneOffsets",
    "customData",
    "shLighting"
  ].join(","));
});


test("the byte-identical sphere pin pair agrees on pinRotation", () =>
{
  // Both Carbon declarations are `Vector4 m_pinRotation` (EveSpherePin.h:33,
  // EveChildSpherePin.h:22), and both registered struct defs encode VECTOR.
  for (const model of [EveSpherePinPerObjectData, EveChildSpherePinPerObjectData])
  {
    assertEquals(CjsSchema.getField(model, "pinRotation")?.type.kind, "vec4", model.name);
  }
});


test("booster per-object data is a composite of the two stage structs", () =>
{
  // Carbon declares exactly two members (EveBoosterSet2.h:73-74). Flattening
  // them collided the two stages' boosterIntensity and left the record at a
  // size Carbon's static_assert rejects.
  const fields = CjsSchema.getSchema(EveBoosterSetVSData).fields.map((field) => field.name);

  assertEquals(new EveBoosterSetVSData().trailsControlPositions.length, EveBoosterSetVSData.CONTROL_POINT_COUNT);
  assertEquals(new EveBoosterSetVSData().trailsControlNormals.length, EveBoosterSetVSData.CONTROL_POINT_COUNT);
  assertEquals(EveBoosterSetVSData.CONTROL_POINT_COUNT, 5);
  assert(fields.includes("boosterIntensity"), "the vertex stage keeps its own boosterIntensity");
  assert(
    CjsSchema.getField(EveBoosterSetPSData, "boosterIntensity") !== null,
    "the pixel stage declares boosterIntensity too - it is not a duplicate"
  );
});


test("bullet storm keeps Carbon's ten target positions", () =>
{
  assertEquals(EveChildBulletStormPerObjectData.TARGET_POSITION_COUNT, 10);
  assertEquals(new EveChildBulletStormPerObjectData().targetPositionsWS.length, 10);
});
