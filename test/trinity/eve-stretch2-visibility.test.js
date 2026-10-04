// A turret beam (EveStretch2) is visible while any of it is in view: Carbon transforms the beam's box by the source
// transform before the frustum test (EveStretch2.cpp:303-315), so a shooter off screen does not hide its beam.
import test from "node:test";
import assert from "node:assert/strict";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { EveStretch2, EveUpdateContext } from "../../npm/dist/trinity/index.js";
import { TriFrustum } from "../../npm/dist/trinity/core/view/TriFrustum.js";

/** A camera near the target looking down -Z, as the weapons demo frames the target with the shooter behind it. */
function cameraAt(eye, centre)
{
  const frustum = new TriFrustum();
  frustum.DeriveFrustum(mat4.lookAt(mat4.create(), eye, centre, [ 0, 1, 0 ]), eye,
    mat4.perspective(mat4.create(), Math.PI / 3, 1, 1, 100000), { width: 1024, height: 1024 });
  const context = new EveUpdateContext();
  context.SetFrustum(frustum);
  context.SetTime(10 * 10_000_000);
  return context;
}

function beam(context, source, destination)
{
  const stretch = new EveStretch2();
  stretch.boundingRadius = 10;
  stretch.SetFiringTransform(source, destination);
  stretch.Update(context);
  return stretch;
}

test("a beam whose source is behind the camera stays visible while its far end is in view", () =>
{
  const context = cameraAt([ 0, 0, -2500 ], [ 0, 0, -3000 ]);
  const stretch = beam(context, [ 0, 0, 0 ], [ 0, 0, -3000 ]);
  assert.equal(stretch.UpdateVisibility(context), true, "the transformed box reaches the target in front of the camera");
  const renderables = [];
  stretch.GetRenderables(renderables);
  assert.ok(renderables[0] === stretch, "the beam is collected");
});

test("a beam entirely behind the camera is culled", () =>
{
  const context = cameraAt([ 0, 0, -2500 ], [ 0, 0, -3000 ]);
  const stretch = beam(context, [ 0, 0, 0 ], [ 0, 0, -1000 ]);
  assert.equal(stretch.UpdateVisibility(context), false);
  const renderables = [];
  stretch.GetRenderables(renderables);
  assert.equal(renderables.length, 0);
});
