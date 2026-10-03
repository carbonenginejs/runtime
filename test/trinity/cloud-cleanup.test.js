import assert from "node:assert/strict";
import test from "node:test";
import { EveChildCloud2, EveComponentRegistry, Tr2PointLight } from "../../npm/dist/trinity/index.js";
import { EveComponentType } from "../../npm/dist/trinity/eve/EveComponentTypes.js";
import { ITr2DebugRenderer2 } from "../../npm/dist/global/interfaces/index.js";

test("Cloud2 constructor matches native authored defaults (cpp:72-118)", () =>
{
  const cloud = new EveChildCloud2();
  assert.equal(cloud.display, true);
  assert.equal(cloud.castShadows, true);
  assert.equal(cloud.receiveShadows, true);
  assert.equal(cloud.reflectionMode, 3);
  assert.equal(cloud.sortingModifier, 1);
  assert.equal(cloud.noiseTextureSize, 32);
  assert.equal(cloud.lightmapSizeScale, 0.5);
  for (const value of [cloud.scaling, cloud.textureTiling, cloud.detailTiling1, cloud.detailTiling2])
    assert.deepEqual(Array.from(value), [1, 1, 1]);
});

test("Cloud2 first/last native light-list events change light-owner membership", () =>
{
  const cloud = new EveChildCloud2(), registry = new EveComponentRegistry();
  cloud.Register(registry);
  try
  {
    const light = new Tr2PointLight();
    cloud.lights.Append(light);
    assert.ok(registry.GetComponents(EveComponentType.LightOwner).includes(cloud));
    cloud.lights.Remove(0);
    assert.ok(!registry.GetComponents(EveComponentType.LightOwner).includes(cloud));
    cloud.lights.Append(light);
    cloud.lights.Remove(-1);
    assert.ok(!registry.GetComponents(EveComponentType.LightOwner).includes(cloud));
  }
  finally { registry.Clear(); }
});

test("Cloud2 debug methods pass native geometry and options to the required renderer", () =>
{
  const cloud = new EveChildCloud2(), options = new Set(), calls = [];
  cloud.GetDebugOptions(options);
  assert.deepEqual([...options], ["Bounding Box", "Bounding Sphere"]);
  cloud.RenderDebugInfo({
    HasOption: (_owner, option) => options.has(option),
    DrawBox: (...args) => calls.push(args),
    DrawSphere: (...args) => calls.push(args)
  });
  assert.equal(calls[0][0], cloud);
  assert.equal(calls[0][1], cloud.worldTransform);
  assert.deepEqual(Array.from(calls[0][2]), [-0.5, -0.5, -0.5]);
  assert.deepEqual(Array.from(calls[0][3]), [0.5, 0.5, 0.5]);
  assert.equal(calls[0][4], ITr2DebugRenderer2.Effect.Wireframe);
  assert.equal(calls[1][3], 18);
  assert.throws(() => cloud.RenderDebugInfo({ HasOption: () => true }), /DrawBox/);
});

test("Cloud2 required effect and animation methods fail loudly", () =>
{
  const cloud = new EveChildCloud2();
  cloud.effect = {};
  assert.throws(() => cloud.UpdateSyncronous(null), /GetHashValue/);
  cloud.effect = null;
  cloud.animation = {};
  assert.throws(() => cloud.UpdateSyncronous(null), /UpdateOnlyWhenRendered/);
});
