import assert from "node:assert/strict";
import { test } from "node:test";
import { Tr2IntSkinnedObject } from "../../../npm/dist/character/index.js";
import { mat4 } from "../../../npm/dist/global/math/mat4.js";

test("Tr2IntSkinnedObject registers the cell reflection variables", () =>
{
  const object = new Tr2IntSkinnedObject();
  assert.ok(object.variableStore.FindLocalVariable("CellReflectionMap"));
  assert.ok(object.variableStore.FindLocalVariable("CellReflection2ndMap"));
  assert.ok(object.variableStore.FindLocalVariable("CellReflectionInterpolation"));
});

test("Tr2IntSkinnedObject SetPosition/Rotation/Scaling rebuild the transform as Carbon does", () =>
{
  const object = new Tr2IntSkinnedObject();
  object.SetScaling([ 2, 2, 2 ]);
  object.SetPosition([ 1, 2, 3 ]);
  assert.deepEqual(Array.from(object.transform.slice(12, 15)), [ 1, 2, 3 ]);
  assert.equal(object.transform[0], 2);

  // A repeat of the last applied position is ignored even when the transform was changed meanwhile.
  object.transform[12] = 9;
  object.SetPosition([ 1, 2, 3 ]);
  assert.equal(object.transform[12], 9);

  // Rotation keeps scale and translation.
  const half = Math.SQRT1_2;
  object.SetRotation([ 0, half, 0, half ]);
  assert.equal(object.transform[12], 9);
  assert.ok(Math.abs(Math.hypot(object.transform[0], object.transform[1], object.transform[2]) - 2) < 1e-5);
  assert.ok(Math.abs(object.transform[2] + 2) < 1e-5 || Math.abs(object.transform[2] - 2) < 1e-5);
});

test("Tr2IntSkinnedObject UpdatePlacement applies a yaw rotation and the position", () =>
{
  const object = new Tr2IntSkinnedObject();
  object.UpdatePlacement([ 0, 0, 1 ], [ 0, 1, 0 ], [ 4, 5, 6 ]);
  assert.deepEqual(Array.from(object.transform.slice(12, 15)), [ 4, 5, 6 ]);
  // front.z = 1 gives acos = 0, then + pi: a half turn about Y.
  assert.ok(Math.abs(object.transform[0] + 1) < 1e-5);
  assert.ok(Math.abs(object.transform[10] + 1) < 1e-5);
});

test("Tr2IntSkinnedObject reflection maps and apex scene membership", () =>
{
  const object = new Tr2IntSkinnedObject();
  const a = {}, b = {}, c = {};
  object._AddReflectionMap(null);
  object._AddReflectionMap(a);
  assert.deepEqual(object._cellReflectionMaps, [ a, a ]);
  object._AddReflectionMap(b);
  assert.deepEqual(object._cellReflectionMaps, [ a, b ]);
  object._AddReflectionMap(c);
  assert.deepEqual(object._cellReflectionMaps, [ b, c ]);
  object._RemoveReflectionMap(c);
  assert.deepEqual(object._cellReflectionMaps, [ c, b ]);

  object.AddToApexScene(null);
  assert.equal(object._isInApexScene, true);
  object.RemoveFromScene();
  assert.equal(object.GetID(0), object);

  assert.equal(object.IsBoundingBoxReady(), false);
  assert.equal(object.AddToScene(null), false);
  assert.throws(() => object.PostPhysicsUpdate(0, null), /Tr2SkinnedObject/);
});
