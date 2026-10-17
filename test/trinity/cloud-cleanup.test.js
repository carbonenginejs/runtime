import assert from "node:assert/strict";
import test from "node:test";
import { EveChildCloud2, EveComponentRegistry, Tr2PointLight } from "../../npm/dist/trinity/index.js";
import { EveComponentType } from "../../npm/dist/trinity/eve/EntityComponents.js";
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

test("Cloud2 debug methods pass native geometry and options to the required renderer (cpp:692-712)", () =>
{
  const cloud = new EveChildCloud2(), options = new Set(), calls = [];
  cloud.GetDebugOptions(options);
  assert.deepEqual([...options], ["Bounding Box", "Bounding Sphere"]);
  cloud.RenderDebugInfo({
    HasOption: (_owner, option) => options.has(option),
    DrawBox__Transform: (...args) => calls.push(["DrawBox__Transform", ...args]),
    DrawSphere__CenterRadius: (...args) => calls.push(["DrawSphere__CenterRadius", ...args])
  });
  assert.equal(calls.length, 2);

  const [ boxVariant, boxOwner, boxTransform, boxMin, boxMax, boxEffect, boxColor ] = calls[0];
  assert.equal(boxVariant, "DrawBox__Transform");
  assert.equal(boxOwner.object, cloud);
  assert.equal(boxTransform, cloud.worldTransform);
  assert.deepEqual(Array.from(boxMin), [-0.5, -0.5, -0.5]);
  assert.deepEqual(Array.from(boxMax), [0.5, 0.5, 0.5]);
  assert.equal(boxEffect, ITr2DebugRenderer2.Effect.Wireframe);
  assert.equal(boxColor.color, 0xff00ff00);

  const [ sphereVariant, sphereOwner, center, radius, segments, sphereEffect, sphereColor ] = calls[1];
  assert.equal(sphereVariant, "DrawSphere__CenterRadius");
  assert.equal(sphereOwner.object, cloud);
  assert.equal(center, cloud.boundingSphere.center);
  assert.equal(radius, cloud.boundingSphere.radius);
  assert.equal(segments, 18);
  assert.equal(sphereEffect, ITr2DebugRenderer2.Effect.Wireframe);
  assert.equal(sphereColor.color, 0xff00ff00);

  assert.throws(() => cloud.RenderDebugInfo({ HasOption: () => true }), /DrawBox__Transform/);
});

test("Cloud2 UpdateAsyncronous reads the parent transform unchecked, as Carbon does (cpp:673)", () =>
{
  const cloud = new EveChildCloud2();
  assert.throws(() => cloud.UpdateAsyncronous({ GetOriginShift: () => [0, 0, 0], GetLodFactor: () => 1 }, {}));
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
