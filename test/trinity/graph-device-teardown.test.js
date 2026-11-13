import assert from "node:assert/strict";
import { BlueResMan, blue } from "../../npm/dist/blue/index.js";
import { TriGeometryRes } from "../../npm/dist/trinity/resources/geometry/TriGeometryRes.js";
import test from "node:test";
import { CjsGraph } from "../../npm/dist/global/model/graph/index.js";
import { Tr2Mesh, Tr2InstancedMesh, Tr2Sprite2dLayer, Tr2Sprite2dContainer, Tr2Sprite2dDisplayList, Tr2GpuResourcePool, Tr2LightManager, TriDevice, EveChildLineSet, EveCurveLineSet, EveSpherePin, Tr2ImpostorManager } from "../../npm/dist/trinity/index.js";

for (const Type of [Tr2GpuResourcePool, Tr2LightManager])
{
  test(`${Type.name}: unexposed composition dispatches device teardown`, () =>
  {
    const owner = new Type();
    assert.equal(CjsGraph.isDefined(Type), false, "lifetime must not activate value handling");
    TriDevice.RegisterResource(owner);
    assert.ok(TriDevice.GetResourcesRegistered().includes(owner));
    owner.Destruct();
    owner.Destruct();
    assert.equal(TriDevice.GetResourcesRegistered().includes(owner), false);
  });
}

test("child line teardown forwards the managed set through generic dispatch", t =>
{
  const owner = new EveChildLineSet(), shared = new EveCurveLineSet(), owned = new EveCurveLineSet();
  owner._ownedLineSet = shared;
  owner._retiredLineSets.add(owned);
  const sharedDestruct = t.mock.method(shared, "Destruct");
  const ownedDestruct = t.mock.method(owned, "Destruct");
  owner.Destruct(new Set([shared]));
  owner.Destruct(new Set([shared]));
  assert.equal(sharedDestruct.mock.callCount(), 0);
  assert.equal(ownedDestruct.mock.callCount(), 1);
  assert.equal(owner._ownedLineSet, null);
  assert.equal(owner._retiredLineSets.size, 0);
});

for (const Type of [EveSpherePin, Tr2ImpostorManager])
{
  test(`${Type.name}: managed effects remain owned by their caller`, t =>
  {
    const owner = new Type(), effects = [...owner._ownedEffects];
    assert.ok(effects.length);
    const counters = effects.map(effect => t.mock.method(effect, "Destruct"));
    owner.Destruct(new Set(effects));
    owner.Destruct(new Set(effects));
    for (const counter of counters) assert.equal(counter.mock.callCount(), 0);
    assert.equal(owner._ownedEffects.size, 0);
  });
}


test("sprite layer runs layer, cached display and parent-detachment cleanup in order", t =>
{
  const layer = new Tr2Sprite2dLayer(), background = new Tr2Sprite2dContainer(), child = new Tr2Sprite2dContainer();
  layer.background.Append(background);
  layer.children.Append(child);
  const display = new Tr2Sprite2dDisplayList(layer), events = [];
  layer._cachedDisplayList = display;
  t.mock.method(layer, "_FreeRenderTarget", () => events.push("layer"));
  const destroy = display.Destruct;
  t.mock.method(display, "Destruct", function() { events.push("display"); destroy.call(this); });
  for (const [name, object] of [["background", background], ["child", child]])
  {
    const setParent = object.SetParent;
    t.mock.method(object, "SetParent", function(parent) { events.push(name); setParent.call(this, parent); });
  }
  layer.Destruct();
  assert.deepEqual(events, ["layer", "display", "background", "child"]);
  assert.equal(layer._cachedDisplayList, null);
  assert.equal(background._parent, null);
  assert.equal(child._parent, null);
  assert.equal(layer.background.length, 1, "does not introduce generic list clearing");
  assert.equal(layer.children.length, 1);
  events.length = 0;
  layer.Destruct();
  assert.deepEqual(events, ["layer", "background", "child"], "cached display is released only once");
});


for (const Type of [Tr2Mesh, Tr2InstancedMesh])
{
  test(`${Type.name}: teardown invalidates a still-pending geometry fence`, async t =>
  {
    const previous = blue.resMan, manager = new BlueResMan();
    blue.resMan = manager;
    const owner = new Type(), geometry = new TriGeometryRes();
    let complete;
    const ready = new Promise(resolve => { complete = resolve; });
    t.mock.method(manager, "GetResource", () => geometry);
    t.mock.method(manager, "Ready", () => ready);
    t.mock.method(blue.paths, "FileExistsLocally", () => true);
    try
    {
      owner.geometryResPath = "res:/fixture/pending.gr2";
      owner.InitializeGeometryResource();
      const generation = owner._loadFenceGeneration;
      assert.equal(owner._loadFenceResource, geometry);
      owner.Destruct();
      assert.ok(owner._loadFenceGeneration > generation);
      assert.equal(owner._destroyed, true);
      complete(geometry);
      await ready;
      await Promise.resolve();
      assert.equal(owner.geometry, null);
      assert.equal(owner.lowResGeometry, null);
      assert.equal(owner._loadFenceResource, null);
      assert.equal(owner.isLoading, false);
      assert.deepEqual(manager.notify.GetByOwner(owner), []);
    }
    finally { blue.resMan = previous; }
  });
}
