import assert from "node:assert/strict";
import test from "node:test";
import { TnyInputMan } from "../../npm/dist/input/TnyInputMan.js";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { TnyTransformGizmo } from "../../npm/dist/core/gizmos/TnyTransformGizmo.js";
import { Tr2ManipulationTool, Tr2Effect, TriDevice, TriProjection, TriView,
  Tr2RenderContext_GetMainThreadRenderContext } from "../../npm/dist/trinity/index.js";
import { Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";
import { Tr2Renderer } from "../../npm/dist/trinity/core/Tr2Renderer.js";

const viewport = { x: 0, y: 0, width: 1200, height: 600 };
const fov = Math.PI / 4, depth = 1e6;
const unitsPerPixel = 2 * depth * Math.tan(fov / 2) / viewport.height;

test("tool ray direction is independent of camera translation, including a rotated camera", () =>
{
  const tool = new Tr2ManipulationTool(), projection = new TriProjection();
  projection.PerspectiveFov(fov, 2, 2, 1e8);
  const world = mat4.fromYRotation(mat4.create(), 0.6);
  const nearView = mat4.invert(mat4.create(), world);
  world[12] = 300000; world[13] = 200000; world[14] = depth;
  const farView = mat4.invert(mat4.create(), world);
  const matrix = projection.GetMatrixWithoutViewAdjustment();
  for (const x of [600, 601, 602, 700])
  {
    const near = tool.ScreenCoordinatesToRay(x, 301, viewport, nearView, matrix);
    const far = tool.ScreenCoordinatesToRay(x, 301, viewport, farView, matrix);
    for (let i = 0; i < 3; i++) assert.ok(Math.abs(near.ray[i] - far.ray[i]) < 1e-6,
      `camera translation changed ray component ${i} at pixel ${x}`);
    assert.ok(Math.hypot(...far.ray) > 1.9, "preserve Carbon's unnormalized direction");
  }
});

function setup(t, mode, axis, behind = false)
{
  const context = Tr2RenderContext_GetMainThreadRenderContext(), previous = context.GetRenderContextAL();
  const before = new Set(TriDevice.GetResourcesRegistered()), al = new Tr2RenderContextALStub();
  context.SetRenderContextAL(al); al.CreateDevice();
  Tr2Renderer.PushProjection(); Tr2Renderer.PushViewTransform();
  t.mock.method(Tr2Effect.prototype, "SetEffectPathName", function(path) { this.effectFilePath = path; });
  const projection = new TriProjection(), view = new TriView();
  projection.PerspectiveFov(fov, 2, 2, 1e8);
  view.SetLookAtPosition([300000, 200000, behind ? -depth : depth], [300000, 200000, 0], [0, 1, 0]);
  Tr2Renderer.SetProjectionTransform(projection.GetMatrixWithoutViewAdjustment());
  Tr2Renderer.SetViewTransform(view.GetTransform());
  const local = mat4.fromTranslation(mat4.create(), [300000, 200000, 0]);
  mat4.scale(local, local, [100, 100, 100]);
  const gizmo = new TnyTransformGizmo({ mode, getView: () => ({ context, projection, view, viewport }) });
  gizmo.SetTarget({ readLocal: out => mat4.copy(out, local), writeLocal: value => mat4.copy(local, value),
    readParentWorld: out => mat4.identity(out) });
  gizmo.tool.Update(context);
  // Only GPU selection is replaced; pointer routing, native Move/Update and
  // target composition are real, at the track preview's scale and distance.
  t.mock.method(gizmo.scene, "PickObject", async () => gizmo.tool.primitives.find(item => item.name === axis));
  t.after(() =>
  {
    gizmo.Destroy();
    for (const resource of TriDevice.GetResourcesRegistered()) if (!before.has(resource)) resource.Destruct();
    Tr2Renderer.PopViewTransform(); Tr2Renderer.PopProjection(); context.SetRenderContextAL(previous);
  });
  return { gizmo, local };
}

test("one-pixel translation drags stay smooth at million-metre camera distances", async t =>
{
  const { gizmo, local } = setup(t, "translation", "x");
  await gizmo.HandleInput({ type: "pointerdown", button: 0, x: 700, y: 300 });
  for (let i = 1; i <= 20; i++)
  {
    const previous = local[12];
    await gizmo.HandleInput({ type: "pointermove", x: 700 + i, y: 300, dx: 1, dy: 0 });
    assert.ok(Math.abs(local[12] - previous - unitsPerPixel) < 0.5, `pixel ${i} jumped or stalled`);
    assert.equal(local[13], 200000);
  }
  await gizmo.HandleInput({ type: "pointerup" });
});

test("rotation follows consecutive one-pixel ring drags without angular jumps", async t =>
{
  const { gizmo, local } = setup(t, "rotation", "z");
  await gizmo.HandleInput({ type: "pointerdown", button: 0, x: 700, y: 300 });
  for (let i = 1; i <= 20; i++)
  {
    await gizmo.HandleInput({ type: "pointermove", x: 700, y: 300 - i, dx: 0, dy: -1 });
    const angle = Math.atan2(local[1], local[0]);
    assert.ok(Math.abs(angle - Math.atan2(i, 100)) < 0.0005, `pixel ${i}: angle ${angle}`);
    assert.ok(Math.abs(local[12] - 300000) < 1 && Math.abs(local[13] - 200000) < 1);
  }
  await gizmo.HandleInput({ type: "pointerup" });
});

for (const direction of [-1, 1])
{
  test(`uniform scaling ${direction < 0 ? "down" : "up"} responds to small drags`, async t =>
  {
    const { gizmo, local } = setup(t, "scaling", "w");
    await gizmo.HandleInput({ type: "pointerdown", button: 0, x: 600, y: 300 });
    const handleLength = depth * fov / 7;
    for (let i = 1; i <= 20; i++)
    {
      await gizmo.HandleInput({ type: "pointermove", x: 600 + i * direction, y: 300, dx: direction, dy: 0 });
      // Carbon computes the scale before moving the handle, retaining a
      // one-event delay. Preserve that ordering while testing both directions.
      const expected = 100 * (1 + (i - 1) * direction * unitsPerPixel / handleLength);
      for (const index of [0, 5, 10]) assert.ok(Math.abs(local[index] - expected) < 0.05,
        `pixel ${i}: scale ${local[index]}, expected ${expected}`);
    }
    await gizmo.HandleInput({ type: "pointerup" });
  });
}

for (const axis of ["w", "x", "_x"])
{
  test(`a single coalesced ${axis} scale drag commits its movement on release`, async t =>
  {
    const { gizmo, local } = setup(t, "scaling", axis);
    await gizmo.HandleInput({ type: "pointerdown", button: 0, x: 700, y: 300 });
    await gizmo.HandleInput({ type: "pointermove", x: 712, y: 300, dx: 12, dy: 0 });
    await gizmo.HandleInput({ type: "pointerup", x: 712, y: 300 });
    const expected = 100 * (1 + 12 * unitsPerPixel / (depth * fov / 7));
    assert.ok(Math.abs(local[0] - expected) < 0.05, `released scale ${local[0]}, expected ${expected}`);
    for (const index of [5, 10])
      assert.ok(Math.abs(local[index] - (axis === "w" ? expected : 100)) < 0.05);
    assert.equal(gizmo._drag, null);
  });
}

test("a picked scale guide applies real axis scaling rather than a captured no-op", async t =>
{
  const { gizmo, local } = setup(t, "scaling", "_x");
  await gizmo.HandleInput({ type: "pointerdown", button: 0, x: 650, y: 300 });
  for (let i = 1; i <= 3; i++)
    await gizmo.HandleInput({ type: "pointermove", x: 650 + i, y: 300, dx: 1, dy: 0 });
  const expected = 100 * (1 + 2 * unitsPerPixel / (depth * fov / 7));
  assert.ok(Math.abs(local[0] - expected) < 0.05);
  assert.equal(local[5], 100);
  assert.equal(local[10], 100);
  await gizmo.HandleInput({ type: "pointerup" });
});

for (const behind of [false, true])
{
  for (const direction of [-1, 1])
  {
    test(`X scaling ${direction < 0 ? "inward" : "outward"} from ${behind ? "behind" : "in front"} follows its visible axis`, async t =>
    {
      const { gizmo, local } = setup(t, "scaling", "x", behind);
      const screenDirection = direction * (behind ? -1 : 1);
      await gizmo.HandleInput({ type: "pointerdown", button: 0, x: behind ? 500 : 700, y: 300 });
      for (let i = 1; i <= 20; i++)
      {
        await gizmo.HandleInput({ type: "pointermove", x: 600 + i * screenDirection, y: 300, dx: screenDirection, dy: 0 });
        const expected = 100 * (1 + (i - 1) * direction * unitsPerPixel / (depth * fov / 7));
        assert.ok(Math.abs(local[0] - expected) < 0.05, `pixel ${i}: X scale ${local[0]}, expected ${expected}`);
        assert.equal(local[5], 100);
        assert.equal(local[10], 100);
      }
      await gizmo.HandleInput({ type: "pointerup" });
    });
  }
}

for (const eventType of ["pointermove", "pointerup"])
{
  for (const action of ["cancel", "clear target", "switch off"])
  {
    test(`scale ${eventType} releases capture when its change callback requests ${action}`, async t =>
    {
      const { gizmo, local } = setup(t, "scaling", "w");
      const initial = mat4.clone(local);
      await gizmo.HandleInput({ type: "pointerdown", button: 0, x: 700, y: 300 });
      if (eventType === "pointerup")
        await gizmo.HandleInput({ type: "pointermove", x: 712, y: 300, dx: 12, dy: 0 });
      let changes = 0;
      gizmo.onChange = (_target, phase) =>
      {
        if (phase !== "move") return;
        changes++;
        if (action === "cancel") gizmo.Cancel();
        else if (action === "clear target") gizmo.SetTarget(null);
        else gizmo.SetMode("off");
      };
      const result = await gizmo.HandleInput({ type: eventType, x: 712, y: 300, dx: 12, dy: 0 });
      assert.equal(changes, 1);
      assert.equal(result, TnyInputMan.Result.RELEASE);
      assert.equal(gizmo._drag, null);
      assert.deepEqual(local, initial, "cancellation restores the initial target transform");
      if (gizmo.tool) assert.equal(gizmo.tool.captured, false);
      if (action === "clear target") assert.equal(gizmo.target, null);
      if (action === "switch off") assert.equal(gizmo.tool, null);
    });
  }
}
