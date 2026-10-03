import assert from "node:assert/strict";
import test from "node:test";
import { EveChildCloud2, Tr2Effect, EveComponentRegistry, Tr2TextureReference } from "../../npm/dist/trinity/index.js";
import { EveComponentType } from "../../npm/dist/trinity/eve/EveComponentTypes.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { INotify, NotifyModified } from "../../npm/dist/global/blue/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";

test("cloud effect notifications bind independent native lightmap providers and reset the dirty cursor", t =>
{
  const cloud = new EveChildCloud2(), other = new EveChildCloud2();
  assert.ok(mappedInterfaces(EveChildCloud2).has(INotify));
  assert.equal(CjsSchema.cast(cloud.lightmap, Tr2TextureReference), cloud.lightmap);
  assert.notEqual(cloud.lightmap, other.lightmap);
  const effect = new Tr2Effect(), reflection = new Tr2Effect();
  const rebuild = t.mock.method(effect, "RebuildCachedData");
  const reflectRebuild = t.mock.method(reflection, "RebuildCachedData");
  cloud.effect = effect;
  cloud.reflectionEffect = reflection;
  cloud.lightmapDirty = false;
  cloud.lightmapDirtyOffset = 17;
  NotifyModified(cloud, ["effect", "reflectionEffect"]);
  assert.equal(rebuild.mock.callCount(), 1);
  assert.equal(reflectRebuild.mock.callCount(), 1);
  assert.equal(effect.GetVariableStore(), reflection.GetVariableStore());
  assert.equal(effect.GetVariableStore().FindVariable("LightMapRW").GetValue(), cloud.lightmap);
  assert.equal(effect.GetVariableStore().FindVariable("LightMap").GetValue(), cloud._emptyLightMap);
  assert.notEqual(cloud._variableStore, other._variableStore);
  assert.notEqual(cloud._emptyLightMap, other._emptyLightMap);
  assert.equal(cloud.lightmapDirty, true);
  assert.equal(cloud.lightmapDirtyOffset, 0);
  cloud.effect = null;
  cloud.lightmapDirty = false;
  cloud.lightmapDirtyOffset = 9;
  NotifyModified(cloud, "effect");
  assert.equal(cloud.lightmapDirty, true);
  assert.equal(cloud.lightmapDirtyOffset, 0, "clearing the effect still invalidates the lightmap");
  assert.equal(rebuild.mock.callCount(), 1);
});

test("cloud reflection edits refresh real registry membership without resetting the lightmap cursor", t =>
{
  const cloud = new EveChildCloud2(), registry = new EveComponentRegistry();
  const reflection = new Tr2Effect();
  const rebuild = t.mock.method(reflection, "RebuildCachedData");
  cloud.display = true;
  cloud.reflectionMode = EveChildCloud2.ReflectionMode.REFLECT_LOW_MEDIUM_HIGH;
  cloud.Register(registry);
  try
  {
    assert.equal(registry.GetComponents(EveComponentType.ReflectionRenderable).includes(cloud), false);
    cloud.reflectionEffect = reflection;
    cloud.lightmapDirtyOffset = 23;
    NotifyModified(cloud, "reflectionEffect");
    assert.ok(registry.GetComponents(EveComponentType.ReflectionRenderable).includes(cloud));
    assert.equal(reflection.GetVariableStore(), cloud._variableStore);
    assert.equal(cloud.lightmapDirtyOffset, 23);
    cloud.display = false;
    cloud.OnModified("name");
    assert.ok(registry.GetComponents(EveComponentType.ReflectionRenderable).includes(cloud));
    NotifyModified(cloud, "display");
    assert.equal(registry.GetComponents(EveComponentType.ReflectionRenderable).includes(cloud), false);
    assert.equal(rebuild.mock.callCount(), 1, "display changes do not rebuild effect caches");
    assert.equal(cloud.lightmapDirtyOffset, 23);
  }
  finally { registry.Clear(); }
});
