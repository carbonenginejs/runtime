import assert from "node:assert/strict";
import test from "node:test";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { Tr2Renderer } from "../../npm/dist/trinity/core/Tr2Renderer.js";
import { EveCamera, TriProjection, TriView, Tr2PrimitiveScene, Tr2PrimitiveSet,
  Tr2RenderContext_GetMainThreadRenderContext } from "../../npm/dist/trinity/index.js";

for (const mode of ["fov", "off-center", "custom", "ortho"])
{
  test(`primitive picking preserves visible handle size with ${mode} projection`, t =>
  {
    const context = Tr2RenderContext_GetMainThreadRenderContext();
    const projection = new TriProjection(), view = new TriView();
    const scene = new Tr2PrimitiveScene(), handle = new Tr2PrimitiveSet();
    const viewport = { width: 1200, height: 600 };
    // Stale FOV parameters must not override a subsequently selected mode.
    projection.PerspectiveFov(Math.PI / 3, 2, 1, 10000);
    if (mode === "off-center") projection.PerspectiveOffCenter(-2, 3, -1, 1, 1, 10000);
    if (mode === "custom") EveCamera.CalculateProjectionMatrix(mat4.create(), 2, Math.PI / 4, 0.2, -0.1, 1, 10000, projection);
    if (mode === "ortho") projection.PerspectiveOrthographic(800, 400, 1, 10000);
    const original = projection.GetMatrixWithoutViewAdjustment();
    const expectedFov = mode === "ortho" ? 1 : mode === "fov" ? projection.fov : 2 * Math.atan(1 / original[5]);
    view.SetLookAtPosition([10, 20, 1000], [0, 0, 0], [0, 1, 0]);
    handle.scaleByDistanceToView = true;
    handle.localTransform[12] = 30;
    scene.primitives.push(handle);
    Tr2Renderer.PushProjection();
    Tr2Renderer.PushViewTransform();
    t.after(() => { Tr2Renderer.PopViewTransform(); Tr2Renderer.PopProjection(); scene.Destruct(); });
    // Carbon sets the view and the projection the way a pass does.
    Tr2Renderer.SetViewTransform(view.GetTransform());
    projection.SetProjection();
    scene.GetPickingObjectsToRender(null, context);
    const visibleWorld = [...handle.worldTransform], visibleScale = handle.scale;
    assert.ok(visibleScale > 0);

    scene.SetupTransformsForPicking(0.25, -0.4, projection, view, viewport, context);
    scene.GetPickingObjectsToRender(null, context);
    assert.equal(Tr2Renderer.GetFieldOfView(), expectedFov);
    assert.equal(handle.scale, visibleScale, "picking must not collapse or shrink the handle");
    assert.deepEqual([...handle.worldTransform], visibleWorld);
    assert.deepEqual([...projection.GetMatrixWithoutViewAdjustment()], [...original]);
    assert.ok(Math.abs(Tr2Renderer.GetProjectionTransform()[0] - original[0] * viewport.width) < 0.001);
  });
}
