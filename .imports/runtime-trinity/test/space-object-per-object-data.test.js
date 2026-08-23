// EveSpaceObject2's PERSISTENT per-object records.
//
// Carbon fills m_vsData/m_psData during update and reads them back afterwards,
// so the records are owner-held rather than pool leases. Every matrix in them is
// stored TRANSPOSED (carbon-math-conventions F1/F6), which is what these tests
// assert - against a rotating, non-uniformly placed transform, because an
// identity or translation-only fixture passes with either orientation.
import test from "node:test";

import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";

import { EveCustomMask, EveSpaceObject2, EveTurretSet } from "../npm/dist/index.js";
import { makePerObjectStore } from "./helpers/perObjectStore.js";


function assert(condition, message = "assertion failed")
{
  if (!condition)
  {
    throw new Error(message);
  }
}


function assertClose(actual, expected, message = "", tolerance = 1e-5)
{
  if (Math.abs(actual - expected) > tolerance)
  {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}


/** A rotating, translated, non-uniformly informative transform. */
function makeTransform()
{
  const rotation = quat.create();
  quat.rotateY(rotation, rotation, 0.7);
  quat.rotateX(rotation, rotation, 0.3);

  return mat4.fromRotationTranslation(mat4.create(), rotation, vec3.fromValues(11, -22, 33));
}


function updated(object, time = 1)
{
  object.update = true;
  object.UpdateWorldTransform(time);
  object.UpdateAsyncronous({ GetTime: () => time, GetHighDetailThreshold: () => 100 });

  return object;
}


test("EveSpaceObject2 stores its world transform transposed in both records", () =>
{
  const object = new EveSpaceObject2();
  const transform = makeTransform();

  mat4.copy(object.worldTransform, transform);
  mat4.invert(object.inverseWorldTransform, transform);
  object.update = true;
  object.UpdateAsyncronous({ GetTime: () => 1, GetHighDetailThreshold: () => 100 });

  const { vs, ps } = object.GetPerObjectData();
  const stored = vs.GetTransposed("worldTransform");
  const expected = mat4.transpose(mat4.create(), transform);

  for (let index = 0; index < 16; index++)
  {
    assertClose(stored[index], expected[index], `vs.worldTransform[${index}]`);
  }

  // A BASIS element, not the translation: a double or missing transpose leaves
  // the translation looking correct while the rotation block flips.
  assertClose(stored[1], transform[4], "vs.worldTransform[1] is the transposed basis");
  assertClose(ps.GetTransposed("worldTransform")[1], transform[4], "ps carries the same bytes");
});


test("EveSpaceObject2 refuses to read a stored matrix as a logical one", () =>
{
  const object = new EveSpaceObject2();
  const { vs } = object.GetPerObjectData();

  let threw = false;
  try
  {
    vs.Get("worldTransform");
  }
  catch (error)
  {
    threw = /stored TRANSPOSED/u.test(error.message);
  }

  assert(threw, "Get must reject a matrix field and name GetTransposed");
});


test("EveSpaceObject2 rolls the outgoing transform into worldTransformLast", () =>
{
  const object = new EveSpaceObject2();
  const first = makeTransform();

  mat4.copy(object.worldTransform, first);
  object.UpdateWorldTransform(2);

  const { vs } = object.GetPerObjectData();
  const stored = vs.GetTransposed("worldTransformLast");
  const expected = mat4.transpose(mat4.create(), first);

  assertClose(stored[1], expected[1], "worldTransformLast basis element");
  assertClose(stored[13], expected[13], "worldTransformLast translation lane");
});


test("EveSpaceObject2 packs the ship data lanes Carbon packs", () =>
{
  const object = new EveSpaceObject2();

  object.dirtLevel = 0.25;
  object.boundingSphereRadius = 40;
  updated(object);

  const { vs, ps } = object.GetPerObjectData();

  assertClose(vs.Get("shipData")[1], 1, "activation strength defaults to full on");
  assertClose(vs.Get("shipData")[2], 0.25, "dirt level");
  assertClose(ps.Get("shipData")[2], 0.25, "both records carry the same ship data");
});


test("EveSpaceObject2 derives the clip sphere into both records", () =>
{
  const object = new EveSpaceObject2();

  object.boundingSphereRadius = 10;
  object.modelScale = 1;
  object.clipSphereFactor = 0.5;
  object.clipSphereFactor2 = 0.25;
  updated(object);

  const { vs, ps } = object.GetPerObjectData();
  const radius = ps.Get("clipRadiusSq")[0];

  // clipData packs the same centre and squared radius the PS record carries.
  assertClose(vs.Get("clipData")[3], radius, "clipData.w is the signed squared radius");
  assertClose(ps.Get("clipSphereFactor")[0], 0.5, "clipSphereFactor");
  assertClose(ps.Get("clipSphereFactor2")[0], 0.25, "clipSphereFactor2");
  assert(radius > 0, "a positive dissolve radius keeps its sign");
});


test("EveSpaceObject2 fills and zeroes the custom-mask slots", () =>
{
  const object = new EveSpaceObject2();
  const mask = new EveCustomMask();

  mask.Setup(vec3.fromValues(1, 2, 3), vec3.fromValues(2, 2, 2), quat.create(), false, true, true, 3, null);
  object.customMasks.push(mask);
  updated(object);

  const { vs, ps } = object.GetPerObjectData();

  assertClose(vs.GetIndex("customMaskData", 0)[0], 1, "slot 0 is enabled");
  assertClose(ps.GetIndex("customMaskMaterialIDs", 0)[0], 3, "slot 0 material index");
  assertClose(ps.Get("customMaskClamps")[0], 1, "slot 0 clampU");
  assertClose(ps.Get("customMaskClamps")[1], 1, "slot 0 clampV");

  // Slot 1 has no mask, so it is zeroed - matrix back to identity.
  const cleared = vs.GetTransposedIndex("customMaskMatrix", 1);
  assertClose(cleared[0], 1, "cleared slot is identity");
  assertClose(cleared[1], 0, "cleared slot is identity");
  assertClose(vs.GetIndex("customMaskData", 1)[0], 0, "slot 1 is disabled");
});


test("EveSpaceObject2 copies both records out of GetPerObjectStructs", () =>
{
  const object = new EveSpaceObject2();

  object.customShaderData[0] = 7;
  updated(object);

  const { vs, ps } = object.GetPerObjectStructs();

  assertClose(ps.Get("customData")[0], 7, "the PS record owns customData");
  assertClose(vs.Get("customData")[0], 7, "Carbon copies it into the VS record");

  // The copies are independent of the live records.
  const live = object.GetPerObjectData();
  vs.Set("shipData", [ 9, 9, 9, 9 ]);
  assert(live.vs.Get("shipData")[0] !== 9, "GetPerObjectStructs must hand out copies");
});


test("EveTurretSet fills the VS/PS pair from its turrets and parent data", () =>
{
  const set = new EveTurretSet();
  const store = makePerObjectStore();
  const parentTransform = makeTransform();

  set.geometryResource = {};
  set.bottomClipHeight = 1.5;
  set.SetTurrets([
    { localMatrix: mat4.create(), valid: true, localPosition: [ 1, 2, 3, 1 ], localQuaternion: [ 0, 0, 0, 1 ] },
    { localMatrix: mat4.create(), valid: false, localPosition: [ 9, 9, 9, 9 ], localQuaternion: [ 9, 9, 9, 9 ] }
  ]);
  set.UpdateAsyncronous({ deltaTime: 0 }, {
    transform: parentTransform,
    shipData: [ 5, 6, 7, 8 ],
    clipSphereCenter: [ 1, 2, 3 ],
    clipRadiusSq: 4,
    clipRadius2Sq: 5
  });

  // UpdateTurretTransforms validates every turret it places, so the invalid
  // case is marked afterwards - that is the state Carbon's fill branches on.
  set.GetTurrets()[1].valid = false;

  const { vs, ps } = set.GetPerObjectData({ Alloc: (name) => store.Alloc(name) });

  assertClose(vs.GetTransposed("shipMatrix")[1], parentTransform[4], "the ship matrix is stored transposed");
  assertClose(vs.Get("baseCutoffData")[0], 1.5, "base cutoff height");
  assertClose(vs.Get("turretSetData")[0], 3, "default bones per turret");
  assertClose(vs.GetIndex("turretTranslation", 0)[0], 1, "a valid turret keeps its pose");
  assertClose(vs.GetIndex("turretTranslation", 1)[3], 1, "an invalid turret gets Carbon's placeholder");
  assertClose(ps.Get("shipData")[1], 6, "parent ship data");
  assertClose(ps.Get("clipData1")[3], 4, "clipData1.w is the squared clip radius");
  assertClose(ps.Get("clipRadius2Sq")[0], 5, "second clip radius");
});


test("EveSpaceObject2 hands attachments the typed parent-data record", () =>
{
  const object = new EveSpaceObject2();

  object.clipSphereFactor = 0.5;
  object.customShaderData[0] = 3;
  updated(object);

  const parent = object.GetParentData();

  assertClose(parent.clipFactor, 0.5, "clipFactor comes from the PS record");
  assertClose(parent.customData[0], 3, "customData is copied out");
  assertClose(parent.killCount, 0, "Carbon never assigns killCount on this path");
  assert(parent.shLighting?.length === 28, "shLighting is the live 7-vec4 span");

  // Carbon hands out a raw pointer into m_psData, so the view must be LIVE:
  // an attachment holding it sees the hull's later coefficients.
  const { ps } = object.GetPerObjectData();
  ps.SetIndex("shLightingCoefficients", 0, [ 9, 0, 0, 0 ]);
  assertClose(parent.shLighting[0], 9, "the borrowed span tracks the hull");
});
