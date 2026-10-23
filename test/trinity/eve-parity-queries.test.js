import test from "node:test";
import assert from "node:assert/strict";
import { EveFiringEffectElementContainer } from "../../npm/dist/trinity/eve/renderable/stretch/EveFiringEffectElementContainer.js";
import { EveStretch } from "../../npm/dist/trinity/eve/renderable/stretch/EveStretch.js";
import { EveLineSet } from "../../npm/dist/trinity/eve/ui/lines/EveLineSet.js";
import { EveTransform } from "../../npm/dist/trinity/eve/spaceObject/EveTransform.js";
import { EveSpaceObject2 } from "../../npm/dist/trinity/eve/spaceObject/EveSpaceObject2.js";
import { EveUpdateContext } from "../../npm/dist/trinity/eve/EveUpdateContext.js";
import { Tr2Lod } from "../../npm/dist/global/consts/trinity.js";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import { vec4 } from "../../npm/dist/global/math/vec4.js";

for (const [name, Class] of [["container", EveFiringEffectElementContainer], ["stretch", EveStretch], ["line set", EveLineSet]])
{
  test(`${name}: native unsupported bounds and model-center queries preserve caller storage`, () =>
  {
    const value = new Class(), position = vec3.fromValues(3, -7, 11), max = vec3.fromValues(20, 30, 40);
    value.UpdateModelCenterWorldPosition(position, 12345);
    value.GetModelCenterWorldPosition(position);
    assert.deepEqual(Array.from(position), [3, -7, 11]);
    assert.equal(value.GetLocalBoundingBox(position, max), false);
    assert.deepEqual(Array.from(position), [3, -7, 11]);
    assert.deepEqual(Array.from(max), [20, 30, 40]);
    const transform = mat4.create(); transform.fill(9);
    value.GetLocalToWorldTransform(transform);
    assert.deepEqual(transform, mat4.create());
    if (Class === EveFiringEffectElementContainer)
    {
      const sphere = vec4.fromValues(3, 4, 5, 6);
      assert.equal(value.GetBoundingSphere(sphere), false);
      assert.deepEqual(Array.from(sphere), [3, 4, 5, 6]);
    }
  });
}

test("stretch returns its stored LOD; line set always returns native HIGH", () =>
{
  const stretch = new EveStretch(), lines = new EveLineSet();
  for (const lod of [Tr2Lod.TR2_LOD_LOW, Tr2Lod.TR2_LOD_MEDIUM, Tr2Lod.TR2_LOD_HIGH])
  {
    stretch.lodLevel = lod;
    assert.equal(stretch.GetLODLevel(), lod);
    assert.equal(lines.GetLODLevel(), Tr2Lod.TR2_LOD_HIGH);
  }
});

test("transform center update performs the context update before copying; ordinary queries do not update", t =>
{
  const value = new EveTransform(), position = vec3.create(), copy = mat4.create();
  value.worldTransform.set([0, 2, 0, 0, -3, 0, 0, 0, 0, 0, 4, 0, 5, 6, 7, 1]);
  const update = t.mock.method(value, "Update__UpdateContext", context =>
  {
    assert.equal(context.GetTime(), 12345);
    assert.equal(context.GetDeltaT(), 0);
    assert.equal(context.lodFactor, 1);
    assert.equal(context.invLodFactor, 1);
    value.worldTransform[12] = 19;
  });
  value.GetLocalToWorldTransform(copy);
  assert.deepEqual(copy, value.worldTransform);
  assert.notEqual(copy, value.worldTransform);
  value.GetModelCenterWorldPosition(position);
  assert.deepEqual(Array.from(position), [5, 6, 7]);
  assert.equal(update.mock.callCount(), 0);
  value.UpdateModelCenterWorldPosition(position, 12345);
  assert.equal(update.mock.callCount(), 1);
  assert.deepEqual(Array.from(position), [19, 6, 7]);
});

test("space-object visibility uses current frustum and inclusive threshold, not cached flags", t =>
{
  const value = new EveSpaceObject2(), context = new EveUpdateContext();
  value.modelWorldPosition.set([4, 5, 6]); value._boundingSphereWorldRadius = 7;
  value.display = false; value._isVisible = false; context.SetVisibilityThreshold(10);
  let visible = true, pixels = 10;
  t.mock.method(context.frustum, "IsSphereVisible__CenterRadius", (center, radius) =>
  {
    assert.equal(center, value.modelWorldPosition); assert.equal(radius, 7); return visible;
  });
  const size = t.mock.method(context.frustum, "GetPixelSizeAccrossEst__CenterRadius", (center, radius) =>
  {
    assert.equal(center, value.modelWorldPosition); assert.equal(radius, 7); return pixels;
  });
  assert.equal(value.IsVisible(context), true);
  pixels = 9; assert.equal(value.IsVisible(context), false);
  visible = false; const before = size.mock.callCount();
  assert.equal(value.IsVisible(context), false); assert.equal(size.mock.callCount(), before);
  value.isPickable = false; assert.equal(value.IsPickable(), false);
  value.isPickable = true; assert.equal(value.IsPickable(), true);
});
