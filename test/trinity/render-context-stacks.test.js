import assert from "node:assert/strict";
import { test } from "node:test";

import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { Tr2RenderContext, Tr2RenderContextALStub, TriProjection } from "../../npm/dist/trinity/core/index.js";
import { TriStepSetProjection } from "../../npm/dist/trinity/renderJob/index.js";

/**
 * A context with the stub backend installed.
 *
 * Every AL verb requires a backend now - there is no recording fallback - and
 * Carbon ships a stub precisely for the headless case.
 */
function stubContext()
{
  const al = new Tr2RenderContextALStub();

  al.CreateDevice({ mode: { width: 64, height: 64 } });

  const context = new Tr2RenderContext();

  context.SetRenderContextAL(al);

  return context;
}

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
  const context = stubContext();
  const states = context.GetEffectStateManager();
  const al = context.GetRenderContextAL();
  const viewports = [];
  const setViewport = al.SetViewport.bind(al);
  al.SetViewport = (viewport) => { viewports.push(viewport); return setViewport(viewport); };

  states.SetViewport({ x: 0, y: 0, width: 64, height: 64 });
  assert.equal(states.GetStackSizeViewport(), 0);

  states.PushViewport();
  assert.equal(states.GetStackSizeViewport(), 1);

  states.SetViewport({ x: 0, y: 0, width: 32, height: 32 });
  assert.equal(states.GetViewport().width, 32);

  viewports.length = 0;
  assert.equal(states.PopViewport(), true);
  assert.equal(states.GetStackSizeViewport(), 0);
  assert.equal(states.GetViewport().width, 64, "viewport restored");

  // The restore must reach the BACKEND, not merely the manager's own cache -
  // that is what the deleted intent assertion here stood for.
  assert.equal(viewports.at(-1).width, 64, "restore reaches the backend");
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

