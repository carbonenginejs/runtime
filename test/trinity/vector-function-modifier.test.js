import assert from "node:assert/strict";
import { test } from "node:test";

import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import { Tr2VectorFunctionModifier } from "../../npm/dist/trinity/curves/index.js";
import { Tr2RenderContext } from "../../npm/dist/trinity/core/index.js";

// A position source: Carbon calls it the client ball, sampled through its Be::Time overloads. Each accessor writes a
// distinct value so the test can tell which one the modifier called.
function source()
{
  return {
    calls: [],
    Update__Ticks(time, out) { this.calls.push([ "Update__Ticks", time ]); vec3.set(out, 1, 2, 3); },
    GetValueAt__Ticks(time, out) { this.calls.push([ "GetValueAt__Ticks", time ]); vec3.set(out, 1, 2, 3); },
    GetValueDotAt__Ticks(_time, out) { vec3.set(out, 10, 0, 0); },
    GetValueDoubleDotAt__Ticks(_time, out) { vec3.set(out, 0, 100, 0); },
    InterpolatedPosition(_time, out) { this.calls.push([ "InterpolatedPosition" ]); vec3.set(out, 7, 7, 7); }
  };
}

function modifier(fields = {})
{
  const value = new Tr2VectorFunctionModifier();
  Object.assign(value, fields);
  return value;
}

test("the offset is applied before the scale, so the scale multiplies it too", () =>
{
  const value = modifier({ clientBall: source(), scaleModifier: 2 });
  vec3.set(value.offsetPosition, 5, 0, 0);

  const out = vec3.create();
  value.Update__Ticks(0, out);

  // (1 + 5) * 2 = 12. Scaling first would give 1*2 + 5 = 7.
  assert.deepEqual(Array.from(out), [ 12, 4, 6 ]);
});

test("derivatives are scaled but never offset", () =>
{
  const value = modifier({ clientBall: source(), scaleModifier: 3 });
  vec3.set(value.offsetPosition, 100, 100, 100);

  const velocity = vec3.create();
  value.GetValueDotAt__Ticks(0, velocity);
  assert.deepEqual(Array.from(velocity), [ 30, 0, 0 ], "a constant offset has no rate of change");

  const acceleration = vec3.create();
  value.GetValueDoubleDotAt__Ticks(0, acceleration);
  assert.deepEqual(Array.from(acceleration), [ 0, 300, 0 ]);
});

test("system coordinates read the interpolated position instead of the normal path", () =>
{
  const ball = source();
  const value = modifier({ clientBall: ball, useSystemCoordinates: true });

  const out = vec3.create();
  value.Update__Ticks(42, out);

  assert.deepEqual(ball.calls, [ [ "InterpolatedPosition" ] ], "the Update path is not taken");
  assert.deepEqual(Array.from(out), [ 7, 7, 7 ]);
});

test("Update__Ticks and GetValueAt__Ticks call their matching source accessor (Carbon Be::Time overloads)", () =>
{
  const ball = source();
  const value = modifier({ clientBall: ball });

  value.Update__Ticks(1, vec3.create());
  value.GetValueAt__Ticks(2, vec3.create());

  assert.deepEqual(ball.calls, [ [ "Update__Ticks", 1 ], [ "GetValueAt__Ticks", 2 ] ]);
});

test("a view-space offset rotates with the view but does not pick up the eye position", () =>
{
  const value = modifier({ clientBall: source(), useViewSpace: true });
  vec3.set(value.offsetPosition, 0, 0, 1);

  // A view translated far from the origin and turned a quarter turn about Y.
  const view = mat4.create();
  mat4.rotateY(view, view, Math.PI / 2);
  mat4.translate(view, view, [ 0, 0, -1000 ]);

  const renderContext = new Tr2RenderContext();
  renderContext.SetViewTransform(view);

  const offset = value.GetOffsetPosition(renderContext, vec3.create());

  // w = 0, so the offset only rotates: no part of the 1000-unit eye offset
  // may appear in it.
  assert.ok(vec3.length(offset) < 1.001, `offset picked up translation: ${Array.from(offset)}`);
  assert.ok(Math.abs(vec3.length(offset) - 1) < 1e-5, "and keeps its length");
});

test("view space without a render context falls back to the authored offset", () =>
{
  const value = modifier({ clientBall: source(), useViewSpace: true });
  vec3.set(value.offsetPosition, 3, 4, 0);

  assert.deepEqual(Array.from(value.GetOffsetPosition(null, vec3.create())), [ 3, 4, 0 ]);
});

test("a modifier with no source still applies its own offset and scale", () =>
{
  const value = modifier({ scaleModifier: 2 });
  vec3.set(value.offsetPosition, 1, 1, 1);

  const out = vec3.fromValues(0, 0, 0);
  value.Update__Ticks(0, out);

  assert.deepEqual(Array.from(out), [ 2, 2, 2 ]);
});
