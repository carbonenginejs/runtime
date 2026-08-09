import assert from "node:assert/strict";
import { test } from "node:test";

import { quat } from "@carbonenginejs/runtime-utils/quat";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { TriRigidOrientation, TriTorque } from "../npm/dist/trinityCore/index.js";

function key({ time = 0, rot0 = quat.create(), omega0 = [ 0, 0, 0 ], torque = [ 0, 0, 0 ] } = {})
{
  const value = new TriTorque();
  value.time = time;
  quat.copy(value.rot0, rot0);
  vec3.copy(value.omega0, omega0);
  vec3.copy(value.torque, torque);
  return value;
}

function orientation(states, { drag = 1, inertia = 1 } = {})
{
  const value = new TriRigidOrientation();
  value.drag = drag;
  value.I = inertia;
  value.states = states;
  return value;
}

test("before the first key the retained value is reported", () =>
{
  const held = quat.setAxisAngle(quat.create(), [ 0, 1, 0 ], 1.2);
  const value = orientation([ key({ time: 5 }) ]);
  quat.copy(value.value, held);

  assert.deepEqual(Array.from(value.GetValueAt(quat.create(), 1)), Array.from(held));
  assert.deepEqual(Array.from(value.GetValueAt(quat.create(), -3)), Array.from(held));
  assert.deepEqual(Array.from(value.GetValueDotAt(vec3.create(), 1)), [ 0, 0, 0 ]);
});

test("at a key exactly, the orientation is that key's own", () =>
{
  const start = quat.setAxisAngle(quat.create(), [ 1, 0, 0 ], 0.5);
  const value = orientation([ key({ time: 0, rot0: start, omega0: [ 0, 2, 0 ] }) ]);

  const out = value.GetValueAt(quat.create(), 0);

  for (let index = 0; index < 4; index++)
  {
    assert.ok(Math.abs(out[index] - start[index]) < 1e-9, "zero elapsed adds no rotation");
  }
});

test("angular velocity decays toward the torque's terminal rate", () =>
{
  // Terminal rate is torque / drag = 4 / 2 = 2, approached from 0.
  const value = orientation([ key({ omega0: [ 0, 0, 0 ], torque: [ 4, 0, 0 ] }) ], { drag: 2, inertia: 1 });

  const early = value.GetValueDotAt(vec3.create(), 0.1)[0];
  const late = value.GetValueDotAt(vec3.create(), 10)[0];

  assert.ok(early > 0 && early < 2, `early rate ${early} should be climbing`);
  assert.ok(Math.abs(late - 2) < 1e-6, `late rate ${late} should reach terminal 2`);
});

test("with no torque the angular velocity decays to nothing", () =>
{
  const value = orientation([ key({ omega0: [ 3, 0, 0 ] }) ], { drag: 2, inertia: 1 });

  assert.ok(Math.abs(value.GetValueDotAt(vec3.create(), 0)[0] - 3) < 1e-9);
  assert.ok(value.GetValueDotAt(vec3.create(), 20)[0] < 1e-6, "drag brings it to rest");
});

test("the accumulated rotation composes AFTER the key's orientation, not before", () =>
{
  // Start facing a quarter turn about X, then spin about world Y. The two do
  // not commute, so the operand order is observable: applying the spin first
  // would send the probe somewhere else entirely.
  const start = quat.setAxisAngle(quat.create(), [ 1, 0, 0 ], Math.PI / 2);
  const value = orientation([ key({ rot0: start, omega0: [ 0, 1, 0 ] }) ], { drag: 1e-4, inertia: 1 });

  const sampled = value.GetValueAt(quat.create(), 1);

  // Build the expected result explicitly in the same convention: the spin is
  // applied after the start orientation.
  const spin = quat.setAxisAngle(quat.create(), [ 0, 1, 0 ], 1);
  const expected = quat.multiply(quat.create(), spin, start);

  const probe = [ 0, 0, 1 ];
  const fromSampled = vec3.transformQuat(vec3.create(), probe, sampled);
  const fromExpected = vec3.transformQuat(vec3.create(), probe, expected);
  const fromWrongOrder = vec3.transformQuat(vec3.create(), probe,
    quat.multiply(quat.create(), start, spin));

  for (let axis = 0; axis < 3; axis++)
  {
    assert.ok(Math.abs(fromSampled[axis] - fromExpected[axis]) < 2e-3,
      `axis ${axis}: ${fromSampled[axis]} !== ${fromExpected[axis]}`);
  }

  assert.ok(vec3.distance(fromExpected, fromWrongOrder) > 0.5,
    "the two orders genuinely differ, so this test can detect a swap");
});

test("Seek picks the key covering a time and reuses its cursor", () =>
{
  const value = orientation([ key({ time: 0 }), key({ time: 10 }), key({ time: 20 }) ]);

  assert.equal(value.Seek(5), 0);
  assert.equal(value.Seek(15), 1);
  assert.equal(value.Seek(999), 2, "past the last key clamps to it");
  assert.equal(value.Seek(1), 0, "and walking backwards still resolves");
});

test("Update retains what it sampled", () =>
{
  const value = orientation([ key({ omega0: [ 0, 0, 1 ] }) ], { drag: 1e-4 });

  const out = value.Update(quat.create(), 1);

  assert.deepEqual(Array.from(value.value), Array.from(out), "the sample is retained as the value");
  assert.notDeepEqual(Array.from(out), [ 0, 0, 0, 1 ], "and it actually rotated");
});
