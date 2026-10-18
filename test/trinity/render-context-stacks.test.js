import assert from "node:assert/strict";
import { test } from "node:test";

import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { Tr2RenderContext, Tr2Renderer, TriProjection } from "../../npm/dist/trinity/core/index.js";
import { Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";
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


test("Tr2Renderer PushProjection/PopProjection save and restore the raw projection", () =>
{
  const p0 = mat4.fromScaling(mat4.create(), [ 1, 2, 3 ]);
  const p1 = mat4.fromScaling(mat4.create(), [ 4, 5, 6 ]);
  Tr2Renderer.SetProjectionTransform(p0);
  Tr2Renderer.PushProjection();
  Tr2Renderer.SetProjectionTransform(p1);
  assert.deepEqual(Array.from(Tr2Renderer.GetProjectionTransform()), Array.from(p1));
  assert.ok(Math.abs(Tr2Renderer.GetFieldOfView() - 2 * Math.atan(1 / 5)) < 1e-6);

  Tr2Renderer.PopProjection();
  assert.deepEqual(Array.from(Tr2Renderer.GetProjectionTransform()), Array.from(p0));
  // Carbon PopProjection re-derives the parameters from the restored matrix
  // (Tr2Renderer.cpp:981-991).
  assert.ok(Math.abs(Tr2Renderer.GetFieldOfView() - 2 * Math.atan(1 / 2)) < 1e-6);
  assert.throws(() => Tr2Renderer.PopProjection(), RangeError, "an empty stack is Carbon's assert");
});

test("Carbon quirk: PopProjection does not restore the orthographic field of view", () =>
{
  Tr2Renderer.SetOrthoProjection__WidthHeight(20, 10, 1, 1000);
  assert.equal(Tr2Renderer.GetFieldOfView(), 1);
  Tr2Renderer.PushProjection();
  Tr2Renderer.SetPerspectiveProjection__FovAspect(1.07, 1, 1000, 1.6);
  Tr2Renderer.PopProjection();
  // UpdateProjectionParameters reads 2 * atan(1 / _22) back, _22 = 2 / height.
  assert.ok(Math.abs(Tr2Renderer.GetFieldOfView() - 2 * Math.atan(5)) < 1e-6);
});

test("TriStepSetProjection preserves Carbon field-of-view semantics by mode", () =>
{
  const context = new Tr2RenderContext();
  const step = new TriStepSetProjection();
  const projection = new TriProjection();

  projection.PerspectiveFov(1.07, 1.6, 1, 1000);
  step.SetProjection(projection);
  step.Execute(0, 0, context);
  assert.ok(Math.abs(Tr2Renderer.GetFieldOfView() - 1.07) < 1e-6, "FOV projections retain the authored scalar");

  projection.PerspectiveOrthographic(20, 10, 1, 1000);
  step.Execute(0, 0, context);
  assert.equal(Tr2Renderer.GetFieldOfView(), 1, "Carbon caches one radian for orthographic projections");

  const custom = mat4.create();
  custom[5] = 3.5;
  projection.CustomProjection(custom);
  step.Execute(0, 0, context);
  assert.ok(Math.abs(Tr2Renderer.GetFieldOfView() - 2 * Math.atan(1 / 3.5)) < 1e-6);
});

test("Tr2Renderer PushViewTransform/PopViewTransform save and restore the view matrix", () =>
{
  Tr2Renderer.SetViewTransform(viewWithTranslationX(5));
  assert.equal(Tr2Renderer.GetViewTransform()[12], 5);

  Tr2Renderer.PushViewTransform();
  Tr2Renderer.SetViewTransform(viewWithTranslationX(9));
  assert.equal(Tr2Renderer.GetViewTransform()[12], 9);

  Tr2Renderer.PopViewTransform();
  assert.equal(Tr2Renderer.GetViewTransform()[12], 5, "view matrix restored");
  assert.equal(Tr2Renderer.GetViewPosition()[0], -5, "eye position re-derived from inverse");
  assert.throws(() => Tr2Renderer.PopViewTransform(), RangeError, "an empty stack is Carbon's assert");
});

