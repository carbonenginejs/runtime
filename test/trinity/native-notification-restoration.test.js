import assert from "node:assert/strict";
import test from "node:test";
import { Tr2LineSet, Tr2BoundingLineSet, Tr2GpuBuffer, Tr2GpuStructuredBuffer, EveChildBulletStorm, EveStretch, EveComponentRegistry } from "../../npm/dist/trinity/index.js";
import { EveComponentType } from "../../npm/dist/trinity/eve/EveComponentTypes.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../npm/dist/trinity/core/context/Tr2RenderContext.js";
import { Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";
import { PixelFormat } from "../../npm/dist/global/consts/renderContext/index.js";
import { NotifyModified } from "../../npm/dist/global/blue/index.js";

test("primitive color notification updates real line endpoints; unrelated edits preserve them", t =>
{
  const lines = new Tr2LineSet();
  t.after(() => lines.Destroy());
  lines.AddLine([0,0,0], [1,0,0,1], [1,1,1], [0,1,0,1]);
  lines.color.set([0,0,1,1]);
  lines.OnModified("name");
  assert.deepEqual([...lines.lines[0].color1], [1,0,0,1]);
  NotifyModified(lines, ["name", "color"]);
  assert.deepEqual([...lines.lines[0].color1], [0,0,1,1]);
  assert.deepEqual([...lines.lines[0].color2], [0,0,1,1]);
});

test("bounding notifications rebuild geometry and forward batched color to the native base", t =>
{
  const context = Tr2RenderContext_GetMainThreadRenderContext(), previous = context.GetRenderContextAL();
  const al = new Tr2RenderContextALStub();
  al.CreateDevice();
  al.BeginScene();
  context.SetRenderContextAL(al);
  const bounds = new Tr2BoundingLineSet();
  t.after(() => { bounds.Destroy(); context.SetRenderContextAL(previous); al.Destroy(); });
  bounds.UpdateBounds([-1,-1,-1], [1,1,1]);
  const before = bounds.lines[0];
  bounds.minBounds.set([-3,-4,-5]);
  bounds.OnModified("name");
  assert.equal(bounds.lines[0], before);
  bounds.color.set([0.25,0.5,1,1]);
  assert.equal(bounds.OnModified(["minBounds", "color"]), true);
  assert.notEqual(bounds.lines[0], before);
  assert.equal(bounds.lines.length, 12);
  assert.equal(bounds.triangles.length, 12);
  assert.equal(bounds.currentSubmittedLineCount, 12);
  assert.equal(bounds.currentSubmittedTriangleCount, 12);
  assert.deepEqual([...bounds.lines[0].color1], [0.25,0.5,1,1]);
});

test("bullet storm notifications rebuild instances only for their source inputs", () =>
{
  const storm = new EveChildBulletStorm();
  storm.sourceObject = { GetLocatorsForSet: name => name === "weapon" ? [{position:[1,2,3], direction:[0,0,0,1]}] : null };
  storm.sourceLocatorSet = "weapon";
  storm.multiplier = 2;
  storm.Rebuild();
  const before = storm.instances[0];
  storm.multiplier = 3;
  assert.equal(storm.OnModified("speed"), true);
  assert.equal(storm.objectCount, 2);
  assert.equal(storm.instances[0], before);
  NotifyModified(storm, ["multiplier", "sourceLocatorSet"]);
  assert.equal(storm.objectCount, 3);
  assert.notEqual(storm.instances[0], before);
  storm.sourceLocatorSet = "missing";
  assert.equal(storm.OnModified("sourceLocatorSet"), true);
  assert.equal(storm.instances.length, 0);
});

test("stretch display notification changes actual light-owner registration", () =>
{
  const stretch = new EveStretch(), registry = new EveComponentRegistry();
  stretch.Register(registry);
  try
  {
    assert.ok(registry.GetComponents(EveComponentType.LightOwner).includes(stretch));
    stretch.display = false;
    stretch.OnModified("name");
    assert.ok(registry.GetComponents(EveComponentType.LightOwner).includes(stretch));
    assert.equal(stretch.OnModified(["display", "name"]), true);
    assert.equal(registry.GetComponents(EveComponentType.LightOwner).includes(stretch), false);
    stretch.display = true;
    NotifyModified(stretch, "display");
    assert.ok(registry.GetComponents(EveComponentType.LightOwner).includes(stretch));
  }
  finally { registry.Clear(); }
});

for (const Type of [Tr2GpuBuffer, Tr2GpuStructuredBuffer])
test(`${Type.name} initializes and recreates on notification with native refusal ordering`, () =>
{
  const context = Tr2RenderContext_GetMainThreadRenderContext(), previous = context.GetRenderContextAL();
  const al = new Tr2RenderContextALStub();
  al.CreateDevice();
  const owner = new Type();
  context.SetRenderContextAL(al);
  try
  {
    owner.count = 4;
    owner.creationFlags = 1;
    if (Type === Tr2GpuBuffer) owner.format = PixelFormat.PIXEL_FORMAT_R32_FLOAT;
    else owner.stride = 4;
    assert.equal(owner.Initialize(), true);
    const first = owner.GetGpuBuffer().TrinityALImpl_GetObject();
    owner.count = 8;
    assert.equal(owner.GetCount(), 4, "raw assignment alone must not recreate");
    assert.equal(owner.OnModified(["count", "creationFlags"]), true);
    assert.equal(owner.GetCount(), 8);
    assert.equal(first.IsRegistered(), false);
    const second = owner.GetGpuBuffer().TrinityALImpl_GetObject();
    owner.count = 0;
    assert.equal(owner.OnModified("count"), true, "native callback ignores AL refusal");
    assert.equal(second.IsRegistered(), Type === Tr2GpuStructuredBuffer);
  }
  finally { owner.Destroy(); context.SetRenderContextAL(previous); al.Destroy(); }
});
