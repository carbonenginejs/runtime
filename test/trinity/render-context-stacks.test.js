import assert from "node:assert/strict";
import { test } from "node:test";

import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { Tr2RenderContext, TriProjection } from "../../npm/dist/trinity/core/index.js";
import { TriStepSetProjection } from "../../npm/dist/trinity/renderJob/index.js";

function viewWithTranslationX(tx)
{
  const matrix = new Array(16).fill(0);
  matrix[0] = matrix[5] = matrix[10] = matrix[15] = 1;
  matrix[12] = tx;
  return matrix;
}

test("PushViewport/PopViewport save and restore the current viewport", () =>
{
  // The stack belongs to the effect state manager, as Carbon's steps assume
  // (TriStepPushViewport.cpp:9). The context's own SetViewport is the
  // abstraction layer's and takes an already-clipped device viewport.
  const context = new Tr2RenderContext();
  const states = context.GetEffectStateManager();

  states.SetViewport({ x: 0, y: 0, width: 64, height: 64 });
  assert.equal(states.GetStackSizeViewport(), 0);

  states.PushViewport();
  assert.equal(states.GetStackSizeViewport(), 1);

  states.SetViewport({ x: 0, y: 0, width: 32, height: 32 });
  assert.equal(states.GetViewport().width, 32);

  context.ClearIntents();
  assert.equal(states.PopViewport(), true);
  assert.equal(states.GetStackSizeViewport(), 0);
  assert.equal(states.GetViewport().width, 64, "viewport restored");

  const intents = context.GetIntents();
  assert.equal(intents.at(-1).type, "set-viewport", "restore is exposed to realization");
  assert.equal(intents.at(-1).viewport.width, 64);
});


test("PopViewport on an empty stack returns false and does not throw", () =>
{
  const context = new Tr2RenderContext();

  assert.equal(context.GetEffectStateManager().PopViewport(), false);
});


test("PushProjection/PopProjection save and restore the current projection", () =>
{
  const context = new Tr2RenderContext();
  const p0 = mat4.fromScaling(mat4.create(), [ 1, 2, 3 ]);
  const p1 = mat4.fromScaling(mat4.create(), [ 4, 5, 6 ]);
  context.SetProjection(p0, 0.75);
  context.PushProjection();
  context.SetProjection(p1, 1.25);
  assert.deepEqual(Array.from(context.GetProjection()), Array.from(p1));
  assert.equal(context.GetFieldOfView(), 1.25);

  assert.equal(context.PopProjection(), true);
  assert.deepEqual(Array.from(context.GetProjection()), Array.from(p0));
  assert.equal(context.GetFieldOfView(), 0.75, "field of view is restored with its projection");
  assert.equal(context.GetStackSizeProjection(), 0);
});

test("TriStepSetProjection preserves Carbon field-of-view semantics by mode", () =>
{
  const context = new Tr2RenderContext();
  const step = new TriStepSetProjection();
  const projection = new TriProjection();

  projection.PerspectiveFov(1.07, 1.6, 1, 1000);
  step.SetProjection(projection);
  step.Execute(0, 0, context);
  assert.equal(context.GetFieldOfView(), 1.07, "FOV projections retain the authored scalar");

  projection.PerspectiveOrthographic(20, 10, 1, 1000);
  step.Execute(0, 0, context);
  assert.equal(context.GetFieldOfView(), 1, "Carbon caches one radian for orthographic projections");

  const custom = mat4.create();
  custom[5] = 3.5;
  projection.CustomProjection(custom);
  step.Execute(0, 0, context);
  assert.ok(Math.abs(context.GetFieldOfView() - 2 * Math.atan(1 / 3.5)) < 1e-12);
});

test("PushViewTransform/PopViewTransform save and restore the cached view matrix", () =>
{
  const context = new Tr2RenderContext();
  context.SetViewTransform(viewWithTranslationX(5));
  assert.equal(context.GetViewTransform()[12], 5);
  assert.equal(context.HasViewMatrix(), true);

  context.PushViewTransform();
  assert.equal(context.GetStackSizeViewTransform(), 1);

  context.SetViewTransform(viewWithTranslationX(9));
  assert.equal(context.GetViewTransform()[12], 9);

  assert.equal(context.PopViewTransform(), true);
  assert.equal(context.GetViewTransform()[12], 5, "view matrix restored");
  assert.equal(context.GetViewPosition()[0], -5, "eye position re-derived from inverse");
  assert.equal(context.GetStackSizeViewTransform(), 0);
});

test("TakeIntents consumes incrementally and exactly once", () =>
{
  const context = new Tr2RenderContext();
  context.SetViewport({ id: "a" });
  context.SetProjection(mat4.create());

  const first = context.TakeIntents();
  assert.equal(first.length, 2);
  assert.equal(context.TakeIntents().length, 0, "already-taken intents are not returned again");

  context.SetRenderState(1, 2);
  assert.deepEqual(context.PeekIntents().map((i) => i.type), [ "set-render-state" ]);
  assert.equal(context.PeekIntents().length, 1, "peek does not advance the cursor");

  const second = context.TakeIntents();
  assert.equal(second.length, 1);
  assert.equal(second[0].type, "set-render-state");

  // GetIntents still returns the full history.
  assert.equal(context.GetIntents().length, 3);
});

test("ClearIntents resets the incremental cursor", () =>
{
  const context = new Tr2RenderContext();
  context.SetViewport({ id: "a" });
  context.TakeIntents();
  context.ClearIntents();

  context.SetViewport({ id: "b" });
  const taken = context.TakeIntents();
  assert.equal(taken.length, 1, "cursor reset so the new intent is taken");
  assert.equal(context.GetIntentCursor(), 1);
});
