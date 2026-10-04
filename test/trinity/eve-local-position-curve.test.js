// EveLocalPositionCurve's centre-of-bounds mode (EveLocalPositionCurve.cpp:144-156) asks its parent space object for
// the model centre with Carbon's UpdateModelCenterWorldPosition(position, t) argument order.
import assert from "node:assert/strict";
import test from "node:test";
import { EveEffectRoot2, EveLocalPositionCurve } from "../../npm/dist/trinity/index.js";

test("GetCenterBoundingSphere answers the parent's updated model centre, and leaves out alone without a parent", () =>
{
  const parent = new EveEffectRoot2();
  parent.boundingSphereCenter.set([ 1, 2, 3 ]);
  parent.translation.set([ 10, 0, 0 ]);

  const curve = new EveLocalPositionCurve();
  curve.parent = parent;
  const out = new Float32Array(3);
  assert.equal(curve.GetCenterBoundingSphere(10000000, out), out);
  assert.deepEqual(Array.from(out), [ 11, 2, 3 ], "boundingSphereCenter through the effect root's local transform");

  const orphan = new EveLocalPositionCurve();
  const untouched = Float32Array.of(7, 8, 9);
  orphan.GetCenterBoundingSphere(10000000, untouched);
  assert.deepEqual(Array.from(untouched), [ 7, 8, 9 ]);
});
