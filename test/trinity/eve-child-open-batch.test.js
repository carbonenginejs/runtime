// Covers the open-batch ports: the Tr2DeviceResource base on the booster,
// haze and turret sets; the ITr2VolumetricRenderable and ITr2PostProcessOwner
// interfaces; the concrete UnRegisterComponents of the fog, lighting-override
// and post-process volumes; EveChildMesh.GetSofSourceLocator; the named
// BehaviorGroupBooster methods; EveChildTurret's quad forwarding; and the
// EveChildBehaviorSystem declarations Carbon never defines.
import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { BeObjectMetadata } from "../../npm/dist/global/blue/index.js";
import { TriStorageFlags } from "../../npm/dist/global/consts/graphics/index.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../npm/dist/trinity/core/context/Tr2RenderContext.js";
import { TriDevice } from "../../npm/dist/trinity/core/device/TriDevice.js";
import { Tr2DeviceResource } from "../../npm/dist/trinity/core/device/Tr2DeviceResource.js";
import { SharedGeometryBuffer } from "../../npm/dist/trinity/core/mesh/TriGeometryResAllocations.js";
import { Tr2InstancedMesh } from "../../npm/dist/trinity/core/mesh/Tr2InstancedMesh.js";
import { Tr2QuadRenderer } from "../../npm/dist/trinity/core/index.js";
import { ITr2VolumetricRenderable } from "../../npm/dist/trinity/core/ITr2VolumetricRenderable.js";
import { ITr2PostProcessOwner } from "../../npm/dist/trinity/postProcess/ITr2PostProcessOwner.js";
import { Tr2Effect } from "../../npm/dist/trinity/shader/Tr2Effect.js";
import { EveBoosterSet2 } from "../../npm/dist/trinity/eve/attachment/booster/EveBoosterSet2.js";
import { EveHazeSet } from "../../npm/dist/trinity/eve/attachment/haze/EveHazeSet.js";
import { EveTurretSet } from "../../npm/dist/trinity/eve/attachment/turrets/EveTurretSet.js";
import { EveTurretFiringFX } from "../../npm/dist/trinity/eve/attachment/turrets/EveTurretFiringFX.js";
import { EveChildCloud2 } from "../../npm/dist/trinity/eve/child/EveChildCloud2.js";
import { EveChildPostProcessVolume } from "../../npm/dist/trinity/eve/child/EveChildPostProcessVolume.js";
import { EveChildFogVolume } from "../../npm/dist/trinity/eve/child/EveChildFogVolume.js";
import { EveChildLightingOverride } from "../../npm/dist/trinity/eve/child/EveChildLightingOverride.js";
import { EveChildMesh } from "../../npm/dist/trinity/eve/child/EveChildMesh.js";
import { EveChildTurret } from "../../npm/dist/trinity/eve/child/EveChildTurret.js";
import { EveChildBehaviorSystem } from "../../npm/dist/trinity/eve/child/EveChildBehaviorSystem.js";
import { BehaviorGroupBooster } from "../../npm/dist/trinity/eve/child/behaviors/BehaviorGroupBooster.js";
import { EveComponentRegistry } from "../../npm/dist/trinity/eve/scene/components/EveComponentRegistry.js";
import { EveComponentType } from "../../npm/dist/trinity/eve/EntityComponents.js";
import { composeStubResMan } from "../support/stubResMan.js";

const context = Tr2RenderContext_GetMainThreadRenderContext();
context.GetRenderContextAL().CreateDevice();

// Effects created here take res paths, which acquire through be.resMan.
composeStubResMan();

/** One shared-buffer range, so a release can be seen returning it. */
function allocate()
{
  const allocation = SharedGeometryBuffer(context).Allocate(4, 4, new Float32Array(4), context);
  assert.ok(allocation && allocation.IsValid(), "the shared buffer hands out a range");
  return allocation;
}

/** A real Tr2Effect answering a fixed hash, as the quad renderer keys it. */
function hashedEffect(key)
{
  const effect = new Tr2Effect();
  effect.GetHashValue = () => key;
  return effect;
}


test("EveBoosterSet2 is a Tr2DeviceResource that frees its instance range and unregisters on Destruct", () =>
{
  const set = new EveBoosterSet2();
  assert.equal(CjsSchema.cast(set, Tr2DeviceResource), set, "EveBoosterSet2.h:177");
  assert.ok(TriDevice.GetResourcesRegistered().includes(set), "registered by the constructor");
  assert.equal(typeof set.PrepareResources, "function", "PrepareResources comes from the base");

  // ReleaseResources (cpp:891-895) frees the instance range back to the shared buffer.
  const range = allocate();
  set._instanceBuffer = range;
  set.ReleaseResources(TriStorageFlags.TRISTORAGE_ALL);
  assert.equal(range.IsValid(), false);

  // The destructor's members: the Allocation frees itself, the base unregisters.
  const kept = allocate();
  set._instanceBuffer = kept;
  set.Destruct();
  assert.equal(kept.IsValid(), false);
  assert.equal(TriDevice.GetResourcesRegistered().includes(set), false);
});

test("EveBoosterSet2.RebuildInstanceData frees the previous range before allocating (cpp:957-958)", () =>
{
  const set = new EveBoosterSet2();
  const previous = allocate();
  set._instanceBuffer = previous;
  set.RebuildInstanceData(context);
  assert.equal(previous.IsValid(), false, "no boosters: freed, nothing new allocated");
  set.Destruct();
});

test("EveHazeSet is a Tr2DeviceResource whose vertex range is an embedded allocation", () =>
{
  const set = new EveHazeSet();
  assert.equal(CjsSchema.cast(set, Tr2DeviceResource), set, "EveHazeSet.h:43");
  assert.ok(TriDevice.GetResourcesRegistered().includes(set));
  assert.equal(set._vertexBuffer.IsValid(), false, "h:110 by value: present and invalid until prepared");

  const range = allocate();
  set._vertexBuffer = range;
  set.ReleaseResources(0);
  assert.equal(range.IsValid(), false, "cpp:105-109 frees the range");

  const kept = allocate();
  set._vertexBuffer = kept;
  set.Destruct();
  assert.equal(kept.IsValid(), false);
  assert.equal(TriDevice.GetResourcesRegistered().includes(set), false);
});

test("EveTurretSet is a Tr2DeviceResource and Destruct follows Carbon's destructor order", t =>
{
  const set = new EveTurretSet();
  assert.equal(CjsSchema.cast(set, Tr2DeviceResource), set, "EveTurretSet.h:104");
  assert.ok(TriDevice.GetResourcesRegistered().includes(set));

  const calls = [];
  t.mock.method(set, "Cleanup", () => { calls.push("Cleanup"); });
  t.mock.method(set, "ReleaseResources", storage => { calls.push([ "ReleaseResources", storage ]); });
  set.Destruct();
  assert.deepEqual(calls, [ "Cleanup", [ "ReleaseResources", TriStorageFlags.TRISTORAGE_ALL ] ], "cpp:130-145");
  assert.equal(TriDevice.GetResourcesRegistered().includes(set), false);
});

test("EveTurretSet.ReleaseResources frees the instance range", () =>
{
  const set = new EveTurretSet();
  const range = allocate();
  set._instanceBuffer = range;
  set.ReleaseResources(TriStorageFlags.TRISTORAGE_ALL);
  assert.equal(range.IsValid(), false, "cpp:1092-1096");
  set.Destruct();
});


test("EveChildCloud2 takes ITr2VolumetricRenderable as a base", () =>
{
  const cloud = new EveChildCloud2();
  assert.equal(CjsSchema.cast(cloud, ITr2VolumetricRenderable), cloud, "EveChildCloud2.h:31");
  assert.equal(CjsSchema.getClassName(ITr2VolumetricRenderable), "ITr2VolumetricRenderable");

  // The interface's pure virtuals throw on the interface itself (ITr2VolumetricRenderable.h:45-52).
  const bare = new ITr2VolumetricRenderable();
  assert.throws(() => bare.GetVolumetricBatches(null, null));
  assert.throws(() => bare.SetCloudShadowMapHandle());
  assert.throws(() => bare.GetSortValue__Frustum(null));

  // The cloud's own implementations win over the interface's throws.
  assert.notEqual(cloud.GetSortValue__Frustum, bare.GetSortValue__Frustum);
  assert.notEqual(cloud.GetVolumetricBatches, bare.GetVolumetricBatches);
});

test("EveChildPostProcessVolume takes ITr2PostProcessOwner and unregisters its component", () =>
{
  const volume = new EveChildPostProcessVolume();
  assert.equal(CjsSchema.cast(volume, ITr2PostProcessOwner), volume, "EveChildPostProcessVolume.h:24");
  assert.equal(CjsSchema.getClassName(ITr2PostProcessOwner), "ITr2PostProcessOwner");
  assert.throws(() => new ITr2PostProcessOwner().GetPostProcessAttributes());

  const registry = new EveComponentRegistry();
  volume.Register(registry);
  assert.ok(registry.GetComponents(EveComponentType.PostProcessOwner).includes(volume));

  // cpp:67-70: the concrete override removes the component, the entity stays.
  volume.UnRegisterComponents();
  assert.equal(registry.GetComponents(EveComponentType.PostProcessOwner).includes(volume), false);
  assert.equal(volume.GetComponentRegistry(), registry);

  // Through EveEntity::UnRegister the removal finds nothing left and is harmless.
  volume.RegisterComponents();
  assert.doesNotThrow(() => volume.UnRegister(registry));
  assert.equal(registry.GetComponents(EveComponentType.PostProcessOwner).includes(volume), false);
});

test("EveChildFogVolume.UnRegisterComponents removes its FroxelFogSettings component (cpp:76-79)", () =>
{
  const fog = new EveChildFogVolume();
  const registry = new EveComponentRegistry();
  fog.Register(registry);
  assert.ok(registry.GetComponents(EveComponentType.FroxelFogSettings).includes(fog));
  fog.UnRegisterComponents();
  assert.equal(registry.GetComponents(EveComponentType.FroxelFogSettings).includes(fog), false);
  assert.equal(fog.GetComponentRegistry(), registry);
  fog.RegisterComponents();
  assert.doesNotThrow(() => fog.UnRegister(registry));
});

test("EveChildLightingOverride.UnRegisterComponents removes its EveLightingOverride component (cpp:52-55)", () =>
{
  const override = new EveChildLightingOverride();
  const registry = new EveComponentRegistry();
  override.Register(registry);
  assert.ok(registry.GetComponents(EveComponentType.EveLightingOverride).includes(override));
  override.UnRegisterComponents();
  assert.equal(registry.GetComponents(EveComponentType.EveLightingOverride).includes(override), false);
  assert.equal(override.GetComponentRegistry(), registry);
  override.RegisterComponents();
  assert.doesNotThrow(() => override.UnRegister(registry));
});


test("EveChildMesh.GetSofSourceLocator reads the SOF metadata (cpp:2008-2043)", () =>
{
  const child = new EveChildMesh();
  assert.equal(child.GetSofSourceLocator(3), null, "no metadata");

  BeObjectMetadata.Set(child, "SofParentHullName", "hull_a");
  assert.equal(child.GetSofSourceLocator(3), null, "hull without locator set");

  BeObjectMetadata.Set(child, "SofLocatorSetName", "set_a");
  assert.deepEqual(child.GetSofSourceLocator(3), [ "hull_a", "set_a", 0 ], "no SofLocatorIndex: 0");

  for (const [ text, expected ] of [
    [ "7", 7 ], [ " 12abc", 12 ], [ "abc", 0 ], [ "-1", 0xFFFFFFFF ], [ "99999999999", 0xFFFFFFFF ]
  ])
  {
    BeObjectMetadata.Set(child, "SofLocatorIndex", text);
    assert.deepEqual(child.GetSofSourceLocator(3), [ "hull_a", "set_a", expected ], `strtoul("${text}")`);
  }

  // An instanced mesh's locator index is the area id (cpp:2024-2027).
  child.mesh = new Tr2InstancedMesh();
  assert.deepEqual(child.GetSofSourceLocator(5), [ "hull_a", "set_a", 5 ]);
});


test("BehaviorGroupBooster's flare initializers key and register with the global quad renderer (cpp:131-141)", () =>
{
  const booster = new BehaviorGroupBooster();
  const halo = hashedEffect(910001), ambient = hashedEffect(910002);
  booster.haloFlareEffect = halo;
  booster.ambientFlareEffect = ambient;

  booster._InitializeHaloFlare();
  booster._InitializeAmbientFlare();
  assert.equal(booster._haloFlareHash, 910001);
  assert.equal(booster._ambientFlareHash, 910002);

  const records = Tr2QuadRenderer.Instance().GetEffectRecords();
  assert.equal(records.get(910001).effect, halo);
  assert.equal(records.get(910002).effect, ambient);
});

test("BehaviorGroupBooster.OnModified registers a newly set flare effect (cpp:143-174)", () =>
{
  const booster = new BehaviorGroupBooster();
  const halo = hashedEffect(910011);
  CjsSchema.setValues(booster, { haloFlareEffect: halo });
  assert.equal(booster._haloFlareHash, 910011);
  assert.equal(Tr2QuadRenderer.Instance().GetEffectRecords().get(910011).effect, halo);
});

test("BehaviorGroupBooster.Initialize registers the flare effects that are set (cpp:82-92)", () =>
{
  const booster = new BehaviorGroupBooster();
  const ambient = hashedEffect(910021);
  booster.ambientFlareEffect = ambient;
  booster.Initialize();
  assert.equal(booster._ambientFlareHash, 910021);
  assert.equal(booster._haloFlareHash, 0, "no halo effect: not registered");
  assert.equal(Tr2QuadRenderer.Instance().GetEffectRecords().get(910021).effect, ambient);
});

test("BehaviorGroupBooster.RegisterWithQuadRenderer keys both effects (cpp:365-378)", () =>
{
  const booster = new BehaviorGroupBooster();
  const halo = hashedEffect(910031), ambient = hashedEffect(910032);
  booster.haloFlareEffect = halo;
  booster.ambientFlareEffect = ambient;
  const renderer = new Tr2QuadRenderer();
  booster.RegisterWithQuadRenderer(renderer);
  assert.equal(booster._haloFlareHash, 910031);
  assert.equal(booster._ambientFlareHash, 910032);
  assert.equal(renderer.GetEffectRecords().get(910031).effect, halo);
  assert.equal(renderer.GetEffectRecords().get(910032).effect, ambient);
});

test("BehaviorGroupBooster creates its effects through Carbon's private methods (cpp:112-129, 246-312)", t =>
{
  const booster = new BehaviorGroupBooster();
  const setup = t.mock.method(booster, "_SetupBoosterEffect");

  const effect = booster._CreateBoosterEffect("BOOSTER_LOD_HIGH");
  assert.equal(effect.effectFilePath, "res:/Graphics/Effect/Managed/Space/Booster/DroneBoosterVolumetric.fx");
  assert.equal(setup.mock.callCount(), 1);
  assert.equal(setup.mock.calls[0].arguments[0], effect, "SetupBoosterEffect configures the new effect");

  const flare = booster._CreateFlareEffect();
  assert.equal(flare.effectFilePath, "res:/Graphics/Effect/Managed/Space/SpecialFX/FlareQuad.fx");

  // InitializeEffects creates all three and keys both flares by their hashes.
  booster.InitializeEffects();
  assert.notEqual(booster.boosterEffect, null);
  assert.notEqual(booster.haloFlareEffect, null);
  assert.notEqual(booster.ambientFlareEffect, null);
  assert.equal(booster._haloFlareHash, booster.haloFlareEffect.GetHashValue());
  assert.equal(booster._ambientFlareHash, booster.ambientFlareEffect.GetHashValue());
  assert.ok(Tr2QuadRenderer.Instance().GetEffectRecords().has(booster._haloFlareHash));
});


test("EveChildTurret forwards quad registration and submission to its firing effect (cpp:282-300, 686)", t =>
{
  const turret = new EveChildTurret();
  const effect = new EveTurretFiringFX();
  const register = t.mock.method(effect, "RegisterWithQuadRenderer");
  const add = t.mock.method(effect, "AddQuadsToQuadRenderer");

  // InitializeFiringEffect registers with the global quad renderer (cpp:686).
  turret.SetFiringEffect(effect);
  assert.equal(register.mock.callCount(), 1);
  assert.equal(register.mock.calls[0].arguments[0], Tr2QuadRenderer.Instance());

  const renderer = new Tr2QuadRenderer();
  turret.RegisterWithQuadRenderer(renderer);
  assert.equal(register.mock.callCount(), 2);
  assert.equal(register.mock.calls[1].arguments[0], renderer);

  const frustum = {};
  turret.AddQuadsToQuadRenderer(frustum, renderer);
  assert.equal(add.mock.callCount(), 1);
  assert.deepEqual(add.mock.calls[0].arguments, [ frustum, renderer ]);

  turret.display = false;
  turret.AddQuadsToQuadRenderer(frustum, renderer);
  assert.equal(add.mock.callCount(), 1, "hidden: the firing effect adds nothing");
});


test("EveChildBehaviorSystem carries Carbon's two undefined ITr2InstanceData declarations (h:95, 97)", t =>
{
  const system = new EveChildBehaviorSystem();
  t.after(() => system.Destruct());
  assert.throws(() => system.IsInstanceDataReady(), /no Carbon body/);
  assert.throws(() => system.GetInstanceBufferVertexDeclaration(0), /no Carbon body/);
});
