import test from "node:test";
import assert from "node:assert/strict";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { quat } from "../../npm/dist/global/math/quat.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import { vec4 } from "../../npm/dist/global/math/vec4.js";
import { TriBatchType } from "../../npm/dist/global/consts/graphics/index.js";
import { ITr2BoundingBox } from "../../npm/dist/global/contracts/index.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { TriGeometryRes } from "../../npm/dist/resource/geometry/index.js";
import {
  EveChildContainer,
  EveChildCloud,
  EveChildPartData,
  EveChildMesh,
  EveChildInstancedMeshes,
  EveDamageOverlay,
  EveEntity,
  EveEffectRoot2,
  EveImpactOverlay,
  EveLocatorSets,
  EveMeshOverlayEffect,
  EveModularObjectModifier,
  EvePlanet,
  EveSpaceObject2,
  EveStation2,
  EveSpaceObjectChild,
  EveTransform,
  EveUpdateContext,
  Locator,
  Tr2DataTextureManager,
  Tr2Mesh,
  Tr2MeshArea
} from "../../npm/dist/trinity/index.js";
import { Tr2Lod } from "../../npm/dist/global/consts/trinity.js";


const EPSILON = 1e-5;


function assertVectorClose(actual, expected, message)
{
  assert.equal(actual.length >= expected.length, true, message);
  for (let index = 0; index < expected.length; index++)
  {
    assert.ok(Math.abs(actual[index] - expected[index]) <= EPSILON,
      `${message}[${index}]: expected ${expected[index]}, got ${actual[index]}`);
  }
}


function createGeometry()
{
  const geometry = new TriGeometryRes().Initialize("res:/geometry/overlay.cmf");
  geometry.SetPayload({
    version: 1,
    sourceFormat: "cmf",
    meshes: [ {
      minBounds: [ -1, -1, -1 ],
      maxBounds: [ 1, 1, 1 ],
      positions: [ -1, -1, 0, 1, -1, 0, 0, 1, 0 ],
      indices: [ 0, 1, 2 ],
      lods: [ {
        maxScreenSize: 1000,
        areas: [ { firstIndex: 0, primitiveCount: 1 } ]
      } ]
    } ]
  });
  geometry.MarkPrepared();
  return geometry;
}


function createOverlay(material)
{
  const overlay = new EveMeshOverlayEffect();
  overlay.opaqueEffects.push(material);
  return overlay;
}


function createAccumulator()
{
  return {
    batches: [],
    Commit(batch)
    {
      this.batches.push(batch);
      return true;
    }
  };
}


test("EveDamageOverlay filters locators compactly and shares impact indices", () =>
{
  const root = new EveDamageOverlay();
  const child = new EveDamageOverlay();

  root.SetDamageLocatorCount(0xffffffff);
  assert.equal(root.damageLocatorCount, 0xffffffff,
    "uint32 counts do not allocate one JavaScript entry per locator");

  root.SetDamageLocatorCount(1);
  root.SetDamageState(0, 0.5, 1, true);
  assert.equal(root.GetArmorImpactGoalCount(), 6);
  assert.equal(root.ArmorImpacts().size, 1,
    "Carbon makes a fixed number of attempts when several impacts choose one locator");

  child.SetImpactIndexSource(root);
  assert.equal(child.CreateImpact(4, 0.5), 2);
  assert.equal(root.CreateImpact(8, 0.5), 3);
  assert.equal(child.HasImpact(2), true);
  assert.equal(root.HasImpact(3), true);

  child.SetDamageLocatorCount(1);
  child.SetEnabledDamageLocators([ false ]);
  child.Clear();
  child.SetDamageState(0, 0.5, 1, true);
  assert.equal(child.ArmorImpacts().size, 0);
});


test("damage blocks remain CPU-owned until an engine consumes packed rows", () =>
{
  const manager = new Tr2DataTextureManager();
  const context = new EveUpdateContext();
  context.SetDataTextureManager(manager);
  context.SetTime(1);

  const shader = { name: "armor" };
  const damage = new EveDamageOverlay();
  damage.SetArmorDamageShaderEffect(shader);
  damage.SetDamageLocatorCount(1);
  damage.CreateImpact(0, 0.5);
  damage.UpdateAsyncronous(context, {
    boundingSphere: [ 0, 0, 0, 20 ],
    estimatedPixelDiameter: 64,
    isInFrustum: true,
    getDamageLocatorPositionOS(_index, out)
    {
      vec3.set(out, 1, 2, 3);
      return true;
    }
  });

  damage.UpdateSyncronous(context);
  assert.equal(damage.GetDataTextureOffset(), -1);
  const packed = manager.Update(context);
  assert.equal(packed.length, 1);
  assert.equal(packed[0].offset, 0);

  damage.UpdateSyncronous(context);
  assert.equal(damage.GetDataTextureOffset(), 0);
  assert.equal(damage.GetArmorDamageShader(TriBatchType.TRIBATCHTYPE_DECAL), shader);
});


test("shield impacts reuse, age and publish Carbon-compatible data rows", () =>
{
  const manager = new Tr2DataTextureManager();
  const context = new EveUpdateContext();
  context.SetDataTextureManager(manager);
  context.SetTime(1);
  context.SetTime(1.25);

  const locator = new Locator();
  const parent = new EveSpaceObject2();
  parent.AddLocatorSet("damage", [ locator ]);
  parent.SetBoundingSphereInformation([ 0, 0, 0, 5000 ]);
  vec3.set(parent.shapeEllipsoidCenter, 0, 0, 0);
  vec3.set(parent.shapeEllipsoidRadius, 10, 20, 30);
  parent.estimatedPixelDiameter = 128;
  parent.IsInFrustum = () => true;
  parent.Initialize();

  const overlay = new EveImpactOverlay();
  overlay.SetDamageState(0.5, 1, 1);
  assert.equal(overlay.shieldImpactColorFade, 0.25,
    "shield color fade follows Carbon's squared damage curve");
  overlay.SetDamageState(-1, 1, 1);
  assert.equal(overlay.shieldImpactColorFade, 1, "shield color fade clamps to one");
  overlay.SetDamageState(1, 1, 1);
  const index = overlay.CreateImpact(
    0, [ 1, 0, 0 ], 2, 4, 0.75, Tr2Lod.TR2_LOD_HIGH, parent);
  assert.equal(index, 1);
  assert.equal(overlay.CreateImpact(
    0, [ 1, 0, 0 ], 1, 6, 0.5, Tr2Lod.TR2_LOD_HIGH, parent), index,
  "nearby impacts at the same locator reuse the live row");

  const intercept = vec3.create();
  const nextDirection = vec3.fromValues(0, 1, 0);
  assert.equal(overlay.UpdateImpact(intercept, nextDirection, index), true);
  assertVectorClose(intercept, [ 10, 0, 0 ], "CreateImpact computes the first ellipsoid intercept");
  assertVectorClose(nextDirection, [ 0, 1, 0 ], "UpdateImpact does not overwrite the caller direction");

  overlay.UpdateAsyncronous(context, parent);
  assertVectorClose(
    overlay.GetDamageOverlay().HeaderRow()[0], [ 1, -1, 0, 0 ],
    "shield header uses the previous parent size like Carbon");
  assertVectorClose(
    overlay.GetDamageOverlay().TexelRow(0)[0], [ 0, 20, 0, 1.25 ],
    "shield position and remaining lifetime row");
  assertVectorClose(
    overlay.GetDamageOverlay().TexelRow(0)[1], [ 6, 0.75, 0, 3 ],
    "shield size, intensity and full lifetime row");
  assert.equal(overlay.shieldImpactParentSize, 2000, "shield parent size is clamped");

  overlay.UpdateSyncronous(context, parent);
  const packed = manager.Update(context);
  assert.equal(packed.length, 1, "shield-only activity requests a shared data block");
  overlay.UpdateSyncronous(context, parent);
  assert.equal(overlay.GetDataTextureOffset(), 0);

  assert.equal(overlay.CreateImpact(
    0, [ 1, 0, 0 ], 1, 1, 1, Tr2Lod.TR2_LOD_LOW, parent), -1,
  "low LOD suppresses shield impacts");
  EveDamageOverlay.impactEffectEnabled = false;
  try
  {
    assert.equal(overlay.HasShieldActivity(), false);
    assert.equal(overlay.CreateImpact(
      0, [ 1, 0, 0 ], 1, 1, 1, Tr2Lod.TR2_LOD_HIGH, parent), -1);
  }
  finally
  {
    EveDamageOverlay.impactEffectEnabled = true;
  }
});


test("child meshes emit own overlays before inherited parent overlays", () =>
{
  const geometry = createGeometry();
  const mesh = new Tr2Mesh();
  const area = new Tr2MeshArea();
  area.index = 0;
  area.count = 1;
  mesh.opaqueAreas.push(area);
  mesh.SetGeometryRes(geometry);

  const ownMaterial = { name: "part-damage" };
  const parentMaterial = { name: "cloak" };
  const child = new EveChildMesh();
  child.SetMesh(mesh);
  child.AddOverlayEffect(createOverlay(ownMaterial));

  const parent = new EveSpaceObject2();
  parent.overlayEffects.push(createOverlay(parentMaterial));
  parent.boundingSphereRadius = 10;
  parent.PrepareShaderData(new EveUpdateContext());

  const context = new EveUpdateContext();
  child.UpdateAsyncronous(context, {
    localToWorldTransform: mat4.create(),
    spaceObjectParent: parent,
    activationStrength: 1,
    boneCount: 0,
    bones: null
  });

  const accumulator = createAccumulator();
  assert.equal(child.GetBatchesFromOverlayVector(
    accumulator, {}, TriBatchType.TRIBATCHTYPE_OPAQUE), true);
  assert.deepEqual(accumulator.batches.map(batch => batch.material),
    [ ownMaterial, parentMaterial ]);

  child.inheritOverlayEffects = false;
  child.UpdateAsyncronous(context, {
    localToWorldTransform: mat4.create(),
    spaceObjectParent: parent,
    activationStrength: 1,
    boneCount: 0,
    bones: null
  });
  const optedOut = createAccumulator();
  child.GetBatchesFromOverlayVector(optedOut, {}, TriBatchType.TRIBATCHTYPE_OPAQUE);
  assert.deepEqual(optedOut.batches.map(batch => batch.material), [ ownMaterial ]);
});


test("instanced child overlays use full inverse-local clip transforms", () =>
{
  const geometry = createGeometry();
  const provider = new EveChildInstancedMeshes();
  const rotation = quat.setAxisAngle(quat.create(), [ 0, 0, 1 ], Math.PI / 2);
  const local = mat4.fromRotationTranslationScale(
    mat4.create(), rotation, [ 5, 6, 7 ], [ 2, 3, 4 ]);
  provider.AddMesh("res:/geometry/overlay.cmf", true, 3, 0, [ {
    effect: { name: "base", GetHashValue: () => 1 },
    batchType: TriBatchType.TRIBATCHTYPE_OPAQUE,
    areaIndex: 0,
    areaCount: 1
  } ], [ local ]);
  provider.SetGeometryResource(0, geometry);

  const ownMaterial = { name: "part-overlay" };
  const parentMaterial = { name: "cloak" };
  const ownOverlay = createOverlay(ownMaterial);
  provider.AddMeshOverlayEffect(0, ownOverlay);
  assert.equal(provider.GetMeshOverlayEffectCount(0), 1);

  const parent = new EveSpaceObject2();
  parent.overlayEffects.push(createOverlay(parentMaterial));
  parent.boundingSphereRadius = 20;
  vec3.set(parent.clipSphereCenter, 9, 12, 15);
  parent.clipSphereFactor = 0.5;
  parent.PrepareShaderData(new EveUpdateContext());
  const parentClip = parent.GetPerObjectStructs().vs.Get("clipData");

  const context = new EveUpdateContext();
  context.frustum = {
    IsSphereVisible: () => true,
    GetPixelSizeAccrossEst: () => 100
  };
  context.invLodFactor = 1;
  provider.UpdateVisibility(context);
  provider.UpdateSyncronous(context, { localToWorldTransform: mat4.create() });
  provider.UpdateAsyncronous(context, { spaceObjectParent: parent });
  assert.equal(provider.GetPerObjectData() !== null, true);

  const accumulator = createAccumulator();
  provider.GetBatches(accumulator, TriBatchType.TRIBATCHTYPE_OPAQUE);
  assert.deepEqual(accumulator.batches.map(batch => batch.material),
    [ ownMaterial, parentMaterial ]);

  const inverseLocal = mat4.invert(mat4.create(), local);
  const expectedClip = vec3.transformMat4(
    vec3.create(), parentClip, inverseLocal);
  assertVectorClose(
    accumulator.batches[0].objectData.vs.Get("clipData"),
    [ expectedClip[0], expectedClip[1], expectedClip[2] ],
    "inverse-local clip center");

  provider.SetMeshInheritOverlayEffects(0, false);
  provider.UpdateAsyncronous(context, { spaceObjectParent: parent });
  provider.GetPerObjectData();
  const optedOut = createAccumulator();
  provider.GetBatches(optedOut, TriBatchType.TRIBATCHTYPE_OPAQUE);
  assert.deepEqual(optedOut.batches.map(batch => batch.material), [ ownMaterial ]);
  assert.equal(optedOut.batches[0].objectData.vs.Get("clipData")[3], 0);

  assert.equal(provider.RemoveMeshOverlayEffect(0, ownOverlay), undefined);
  assert.equal(provider.GetMeshOverlayEffectCount(0), 0);
  provider.AddMeshOverlayEffect(0, ownOverlay);
  provider.ClearMeshOverlayEffects(0);
  assert.equal(provider.GetMeshOverlayEffectCount(0), 0);
});


test("nested child damage locators merge and route damage to their owning mesh", () =>
{
  const locator = new Locator();
  vec3.set(locator.position, 2, 0, 0);
  const damageSet = new EveLocatorSets();
  damageSet.Set("damage", [ locator ]);

  const mesh = new EveChildMesh();
  mesh.Setup([ 1, 1, 1 ], [ 0, 0, 0, 1 ], [ 1, 0, 0 ]);
  mesh.SetOwnedLocatorSets([ damageSet ]);
  const container = new EveChildContainer();
  container.Setup([ 1, 1, 1 ], [ 0, 0, 0, 1 ], [ 10, 0, 0 ]);
  container.AddToEffectChildrenList(mesh);

  const object = new EveSpaceObject2();
  object.SetImpactOverlay(new EveImpactOverlay());
  object.AddToEffectChildrenList(container);
  object.Initialize();

  const merged = object.GetLocatorsForSet("damage");
  assert.equal(merged.length, 1);
  assertVectorClose(merged[0].position, [ 13, 0, 0 ], "nested damage locator");

  object.SetImpactDamageState(0, 0.5, 1, true);
  assert.equal(mesh.GetDamageOverlay() instanceof EveDamageOverlay, true);
  assert.equal(mesh.GetDamageOverlay().ArmorImpacts().size, 1);
  object.SetImpactAnimation("armorrepair", true, 4);
  assert.equal(mesh.GetDamageOverlay().GetArmorRepairing().kickInLength, 1);
  object.ClearImpactDamage();
  assert.equal(mesh.GetDamageOverlay().ArmorImpacts().size, 0);
});


test("TriGeometryRes raycast sessions expose parametric hit distance", () =>
{
  const geometry = createGeometry();
  geometry.PrepareRayCaster();
  assert.equal(geometry.IsRayCasterReady(), true);
  assert.equal(geometry.HasRayCasterPreparationFailed(), false);

  const hit = {};
  assert.equal(geometry.GetIntersectionPoints(
    [ 0, 0, 1 ], [ 0, 0, -2 ], hit, 0, 1), true);
  assert.ok(Math.abs(hit.distance - 0.5) <= EPSILON);
  assertVectorClose(hit.position, [ 0, 0, 0 ], "canonical ray hit position");
  assertVectorClose(hit.point, [ 0, 0, 0 ], "ray hit");
  assertVectorClose(hit.normal, [ 0, 0, 1 ], "unit ray hit normal");
  assertVectorClose(hit.unnormalizedNormal, [ 0, 0, 4 ], "area-weighted ray hit normal");
  assert.equal(hit.meshIndex, 0);
  assert.equal(hit.areaIndex, 0);

  geometry.ResetRayCaster();
  assert.equal(geometry.IsRayCasterReady(), false);
  assert.throws(() => geometry.GetIntersectionPoints(
    [ 0, 0, 1 ], [ 0, 0, -1 ], {}), /prepared raycast session/);
});


test("EveModularObjectModifier adds, transforms, bounds and removes parts", () =>
{
  const object = new EveStation2();
  object.SetImpactOverlay(new EveImpactOverlay());
  object.Initialize();
  const builtChildren = [];
  const sof = {
    BuildChild(target, dna, partTag)
    {
      assert.equal(dna, "hull:amarr:race");
      const child = new EveChildMesh();
      child.SetPartTag(partTag);
      target.AddToEffectChildrenList(child);
      target.SetBoundingSphereInformation([ 1, 0, 0, 2 ]);
      builtChildren.push(child);
      return true;
    }
  };

  const modifier = new EveModularObjectModifier().Create(object, sof);
  const partData = object.effectChildren.find(child => child instanceof EveChildPartData);
  partData.faction = "amarr";
  partData.race = "race";
  const id = modifier.AddHull(
    "hull", "", "", [ 2, 0, 0 ], [ 0, 0, 0, 1 ], [ 1, 1, 1 ]);
  assert.equal(id, 1);
  assert.equal(partData.parts.length, 1);
  assertVectorClose(modifier.GetPosition(id), [ 2, 0, 0 ], "part position");
  assertVectorClose(partData.parts[0].boundingSphere, [ 1, 0, 0, 2 ], "part bounds");
  assertVectorClose(
    [ object.boundingSphereCenter[0], object.boundingSphereCenter[1],
      object.boundingSphereCenter[2], object.boundingSphereRadius ],
    partData.parts[0].boundingSphere,
    "AddHull applies modular bounds before returning");

  modifier.SetTransform(id, [ 4, 5, 6 ], [ 0, 0, 0, 1 ], [ 2, 3, 4 ]);
  assertVectorClose(builtChildren[0].translation, [ 4, 5, 6 ], "child transform");
  const bounds = modifier.ApplyBounds();
  assertVectorClose(bounds, partData.parts[0].boundingSphere, "modular bounds");
  assertVectorClose(
    object.shapeEllipsoidCenter,
    partData.parts[0].boundingSphere.subarray(0, 3),
    "inner ellipsoid center");
  const ellipsoidRadius = partData.parts[0].boundingSphere[3] * Math.sqrt(3);
  assertVectorClose(
    object.shapeEllipsoidRadius,
    [ ellipsoidRadius, ellipsoidRadius, ellipsoidRadius ],
    "Carbon inner ellipsoid expands box half-extents by sqrt(3)");
  assert.equal(modifier.Remove(id), true);
  assert.equal(partData.parts.length, 0);
  assert.equal(object.effectChildren.includes(builtChildren[0]), false);
  assertVectorClose(object.shapeEllipsoidRadius, [ 0, 0, 0 ], "empty modular ellipsoid");
  assert.throws(() => modifier.GetPosition(id), /Unknown modular part tag/);
});


test("EveModularObjectModifier reacquires graph records replaced by SOF hydration", () =>
{
  const object = new EveStation2();
  object.Initialize();
  let detachedData = null;
  let liveInstanced = null;
  let removedPartTag = null;
  const sof = {
    BuildChild(target, _dna, partTag)
    {
      detachedData = target.effectChildren.find(child => child instanceof EveChildPartData);
      const replacement = new EveChildPartData();
      replacement.faction = detachedData.faction;
      replacement.race = detachedData.race;
      liveInstanced = new EveChildInstancedMeshes();
      liveInstanced.RemoveInstancesByPartTag = tag =>
      {
        removedPartTag = tag;
        return true;
      };
      const built = new EveChildMesh();
      built.SetPartTag(partTag);
      target.effectChildren = [ replacement, liveInstanced, built ];
      target.SetBoundingSphereInformation([ 0, 0, 0, 1 ]);
      return true;
    }
  };

  const modifier = new EveModularObjectModifier().Create(object, sof);
  const id = modifier.AddHull(
    "hull", "faction", "race", [ 0, 0, 0 ], [ 0, 0, 0, 1 ], [ 1, 1, 1 ]);
  const liveData = object.effectChildren.find(child => child instanceof EveChildPartData);
  assert.equal(detachedData.parts.length, 0, "detached pre-hydration data stays untouched");
  assert.equal(liveData.parts.length, 1, "part is appended to the live hydrated graph");
  assert.equal(liveData.parts[0].partId, id);

  modifier.Remove(id);
  assert.equal(removedPartTag, id, "removal reaches the live hydrated instanced child");
  assert.equal(object.effectChildren.includes(liveInstanced), true);
});


test("EveModularObjectModifier AddChild is atomic and keeps bounds current", () =>
{
  const object = new EveStation2();
  object.Initialize();
  const loader = {
    LoadChild(path)
    {
      return path === "res:/child.red" ? new EveChildMesh() : null;
    }
  };
  const modifier = new EveModularObjectModifier().Create(
    object, { BuildChild: () => false }, loader);
  const partData = object.effectChildren.find(child => child instanceof EveChildPartData);

  const id = modifier.AddChild(
    "res:/child.red", [ 3, 4, 5 ], [ 0, 0, 0, 1 ], [ 2, 2, 2 ]);
  assert.equal(id, 1);
  assert.equal(partData.parts.length, 1);
  const child = object.effectChildren.find(candidate => candidate instanceof EveChildMesh);
  assert.equal(child.GetPartTag(), id);
  assertVectorClose(child.translation, [ 3, 4, 5 ], "loaded child transform");

  const childCount = object.effectChildren.length;
  assert.equal(modifier.AddChild(
    "res:/missing.red", [ 0, 0, 0 ], [ 0, 0, 0, 1 ], [ 1, 1, 1 ]),
  EveModularObjectModifier.INVALID_PART_TAG);
  assert.equal(partData.parts.length, 1, "failed loads do not append part data");
  assert.equal(object.effectChildren.length, childCount, "failed loads do not append children");
});


test("EveChildCloud participates in the owned child contract", () =>
{
  const cloud = new EveChildCloud();
  const owner = new EveSpaceObject2();
  const parent = new EveSpaceObjectChild();
  cloud.SetOwner(owner);
  cloud.SetParent(parent);
  cloud.SetPartTag(7);
  assert.equal(cloud instanceof EveSpaceObjectChild, true);
  assert.equal(cloud.GetOwner(), owner);
  assert.equal(cloud.GetParent(), parent);
  assert.equal(cloud.GetPartTag(), 7);
  assert.doesNotThrow(() => cloud.CollectOwnedLocatorSets(mat4.create(), []));

  owner.Initialize();
  mat4.fromTranslation(owner.worldTransform, [ 10, 0, 0 ]);
  vec3.set(cloud.translation, 1, 2, 3);
  vec3.set(cloud.scaling, 2, 4, 6);
  let volumeTime = -1;
  cloud.volume = { Update(time) { volumeTime = time; } };
  const context = new EveUpdateContext();
  context.SetTime(7);
  context.SetLodFactor(2);
  context.SetFrustum({
    IsSphereVisible: () => true,
    GetPixelSizeAccross: () => 20
  });
  cloud.UpdateSyncronous(context, { childParent: null, spaceObjectParent: owner });
  assert.equal(volumeTime, 7);
  assert.equal(cloud.hasUpdated, true);
  assertVectorClose(
    [ cloud.worldTransform[12], cloud.worldTransform[13], cloud.worldTransform[14] ],
    [ 11, 2, 3 ],
    "cloud world translation");
  assertVectorClose(cloud.boundingSphere, [ 11, 2, 3, Math.sqrt(14) ], "cloud bounds");
  const sphere = vec4.create();
  assert.equal(cloud.GetBoundingSphere(sphere), true);
  assertVectorClose(sphere, cloud.boundingSphere, "cloud bounding-sphere copy");
  const cloudWorld = cloud.GetLocalToWorldTransform();
  assertVectorClose(
    [ cloudWorld[12], cloudWorld[13], cloudWorld[14] ],
    [ 11, 2, 3 ],
    "cloud local-to-world copy");
  cloud.minScreenSize = 5;
  cloud.UpdateVisibility(context, mat4.create(), Tr2Lod.TR2_LOD_HIGH);
  assert.equal(cloud.isVisible, true);
  assert.equal(cloud.lastLodFactor, 2);
  assert.equal(cloud.HasTransparentBatches(), true);
});


test("Carbon bounding-box providers publish local, world, mesh, and planet bounds", () =>
{
  const contract = new ITr2BoundingBox();
  assert.equal(CjsSchema.GetConstructor("ITr2BoundingBox"), ITr2BoundingBox);
  assert.throws(() => contract.GetWorldBoundingBox([], []), /must be implemented/);
  assert.throws(() => contract.IsBoundingBoxReady(), /must be implemented/);

  const min = vec3.create();
  const max = vec3.create();
  assert.equal(new EveEntity() instanceof ITr2BoundingBox, false);
  const effect = new EveEffectRoot2();
  assert.equal(effect instanceof ITr2BoundingBox, true);
  vec3.set(effect.boundingSphereCenter, 1, 2, 3);
  effect.boundingSphereRadius = 2;
  vec3.set(effect.translation, 10, 0, 0);
  effect.UpdateSyncronous({ currentTime: 0 });
  assert.equal(effect.GetLocalBoundingBox(min, max), true);
  assertVectorClose(min, [ -1, 0, 1 ], "effect local minimum");
  assertVectorClose(max, [ 3, 4, 5 ], "effect local maximum");
  assert.equal(effect.GetWorldBoundingBox(min, max), true);
  assertVectorClose(min, [ 9, 0, 1 ], "effect world minimum");
  assertVectorClose(max, [ 13, 4, 5 ], "effect world maximum");
  assert.equal(effect.IsBoundingBoxReady(), true);

  const transform = new EveTransform();
  assert.equal(transform instanceof ITr2BoundingBox, true);
  vec3.set(transform.overrideBoundsMin, -1, -2, -3);
  vec3.set(transform.overrideBoundsMax, 1, 2, 3);
  vec3.set(transform.translation, 5, 6, 7);
  transform.UpdateViewDependentData({ GetFrustum: () => null, renderContext: {} });
  assert.equal(transform.GetWorldBoundingBox(min, max), true);
  assertVectorClose(min, [ 4, 4, 4 ], "transform world minimum");
  assertVectorClose(max, [ 6, 8, 10 ], "transform world maximum");
  assert.equal(transform.IsBoundingBoxReady(), true);
  assert.equal(transform.HasTransparentBatches(), false);
  assert.equal(transform.GetBatches(
    createAccumulator(), TriBatchType.TRIBATCHTYPE_OPAQUE, null, 0), false);
  assert.equal(transform.GetSortValue({ GetViewPosition: () => [ 5, 6, 17 ] }), 10);

  const mesh = new Tr2Mesh();
  mesh.SetGeometryRes(createGeometry());
  mesh.maxVertexScale = 2;
  mesh.maxVertexDisplacement = 1;
  assert.equal(mesh.GetBoundingBox(min, max), true);
  assertVectorClose(min, [ -3, -3, -3 ], "adjusted mesh minimum");
  assertVectorClose(max, [ 3, 3, 3 ], "adjusted mesh maximum");
  mesh.rotatesVertices = true;
  assert.equal(mesh.GetBoundingBox(min, max), true);
  const rotatedRadius = Math.sqrt(27);
  assertVectorClose(min, [ -rotatedRadius, -rotatedRadius, -rotatedRadius ], "rotating mesh minimum");
  assertVectorClose(max, [ rotatedRadius, rotatedRadius, rotatedRadius ], "rotating mesh maximum");

  const planet = new EvePlanet();
  assert.equal(planet instanceof ITr2BoundingBox, true);
  planet.radius = 2000000;
  planet.translationCurve = {
    Update(_time, out)
    {
      vec3.set(out, 4000000, 5000000, 6000000);
    }
  };
  planet.UpdateSyncronous({ currentTime: 0 });
  assert.equal(planet.GetWorldBoundingBox(min, max), true);
  assertVectorClose(min, [ 2, 3, 4 ], "planet world minimum");
  assertVectorClose(max, [ 6, 7, 8 ], "planet world maximum");
  assert.equal(planet.IsBoundingBoxReady(), true);
});


test("SetTransform moves shared instanced-part geometry outside the child partTag gate", () =>
{
  const object = new EveStation2();
  object.Initialize();

  // The shared instanced child carries many parts' instances under its own
  // aggregate tag, which never equals a part id (PLAT-11963).
  const shared = new EveChildInstancedMeshes();
  shared.SetPartTag(99);
  const areas = [ { effect: null, batchType: TriBatchType.TRIBATCHTYPE_OPAQUE, areaIndex: 0, areaCount: 1 } ];
  shared.AddMesh("res:/a.cmf", false, 3, 0, areas, [ mat4.create(), mat4.create() ], "", "", 1);
  shared.AddMesh("res:/b.cmf", false, 3, 0, areas, [ mat4.create() ], "", "", 2);

  const sof = {
    BuildChild(target, _dna, partTag)
    {
      const child = new EveChildMesh();
      child.SetPartTag(partTag);
      target.AddToEffectChildrenList(child);
      target.AddToEffectChildrenList(shared);
      target.SetBoundingSphereInformation([ 0, 0, 0, 1 ]);
      return true;
    }
  };
  const modifier = new EveModularObjectModifier().Create(object, sof);
  const partData = object.effectChildren.find(child => child instanceof EveChildPartData);
  partData.faction = "amarr";
  partData.race = "race";
  const id = modifier.AddHull("hull", "", "", [ 0, 0, 0 ], [ 0, 0, 0, 1 ], [ 1, 1, 1 ]);
  assert.equal(id, 1);

  modifier.SetTransform(id, [ 4, 5, 6 ], [ 0, 0, 0, 1 ], [ 1, 1, 1 ]);

  // Both instances of the part's mesh get the ABSOLUTE new transform.
  for (const instance of shared.meshes[0].instances)
  {
    assertVectorClose(
      [ instance.transform[12], instance.transform[13], instance.transform[14] ],
      [ 4, 5, 6 ], "moved instance translation");
  }
  // The other part's instances stay put.
  assertVectorClose(
    [ shared.meshes[1].instances[0].transform[12],
      shared.meshes[1].instances[0].transform[13],
      shared.meshes[1].instances[0].transform[14] ],
    [ 0, 0, 0 ], "unmoved instance translation");

  const decomposed = shared.GetInstancesTransforms(0);
  assert.equal(decomposed.length, 2);
  assertVectorClose(decomposed[0].translation, [ 4, 5, 6 ], "decomposed translation");
  assert.throws(() => shared.GetInstancesTransforms(9), RangeError);
});


test("CollectOwnedGeometry pools areas by batch type and shares them across instances", () =>
{
  const geometry = { token: "geo" };
  const mesh = new Tr2Mesh();
  const opaque = new Tr2MeshArea();
  opaque.index = 0;
  opaque.count = 2;
  const cutout = new Tr2MeshArea();
  cutout.index = 3;
  cutout.count = 1;
  cutout.alphaCutout = true;
  cutout.reversed = true;
  mesh.opaqueAreas.push(opaque, cutout);
  mesh.SetGeometryRes(geometry);

  const child = new EveChildMesh();
  child.mesh = mesh;
  child.translation = [ 5, 0, 0 ];
  const container = new EveChildContainer();
  container.translation = [ 0, 7, 0 ];
  container.objects.push(child);

  const out = [];
  const pool = [];
  container.CollectOwnedGeometry(TriBatchType.TRIBATCHTYPE_OPAQUE, mat4.create(), out, pool);
  assert.equal(out.length, 1);
  assert.equal(out[0].geometry, geometry);
  assert.equal(out[0].areaStart, 0);
  assert.equal(out[0].areaCount, 2);
  assertVectorClose(
    [ out[0].childToObject[12], out[0].childToObject[13], out[0].childToObject[14] ],
    [ 5, 7, 0 ], "container-composed childToObject translation");
  assert.deepEqual(pool, [
    { index: 0, count: 2, alphaCutout: false, reversed: false },
    { index: 3, count: 1, alphaCutout: true, reversed: true }
  ]);

  // A batch type the mesh has no areas for contributes a zero-area record.
  const emptyOut = [];
  const emptyPool = [];
  child.CollectOwnedGeometry(TriBatchType.TRIBATCHTYPE_DISTORTION, mat4.create(), emptyOut, emptyPool);
  assert.equal(emptyOut.length, 1);
  assert.equal(emptyOut[0].areaCount, 0);
  assert.equal(emptyPool.length, 0);

  // Instanced meshes emit their areas ONCE and share the range per instance;
  // composition is gl multiply(parent, instance) per the Carbon row order.
  const instanced = new EveChildInstancedMeshes();
  const transformA = mat4.fromTranslation(mat4.create(), [ 1, 0, 0 ]);
  const transformB = mat4.fromTranslation(mat4.create(), [ 0, 1, 0 ]);
  instanced.AddMesh("res:/a.cmf", false, 3, 0, [
    { effect: null, batchType: TriBatchType.TRIBATCHTYPE_OPAQUE, areaIndex: 2, areaCount: 2, alphaCutout: true },
    { effect: null, batchType: TriBatchType.TRIBATCHTYPE_TRANSPARENT, areaIndex: 9, areaCount: 1 }
  ], [ transformA, transformB ], "", "", 0);
  instanced.meshes[0].SetGeometryResource(geometry);

  const instancedOut = [];
  const instancedPool = [];
  const parent = mat4.fromTranslation(mat4.create(), [ 10, 0, 0 ]);
  instanced.CollectOwnedGeometry(TriBatchType.TRIBATCHTYPE_OPAQUE, parent, instancedOut, instancedPool);
  assert.equal(instancedOut.length, 2);
  assert.deepEqual(instancedPool, [ { index: 2, count: 2, alphaCutout: true, reversed: false } ]);
  assert.equal(instancedOut[0].areaStart, 0);
  assert.equal(instancedOut[0].areaCount, 1);
  assert.equal(instancedOut[1].areaStart, 0);
  assert.equal(instancedOut[1].areaCount, 1);
  assertVectorClose(
    [ instancedOut[0].childToObject[12], instancedOut[0].childToObject[13], instancedOut[0].childToObject[14] ],
    [ 11, 0, 0 ], "instance A childToObject");
  assertVectorClose(
    [ instancedOut[1].childToObject[12], instancedOut[1].childToObject[13], instancedOut[1].childToObject[14] ],
    [ 10, 1, 0 ], "instance B childToObject");

  // A mesh whose areas do not match the batch type contributes nothing at all.
  const noneOut = [];
  const nonePool = [];
  instanced.CollectOwnedGeometry(TriBatchType.TRIBATCHTYPE_DISTORTION, mat4.create(), noneOut, nonePool);
  assert.equal(noneOut.length, 0);
  assert.equal(nonePool.length, 0);
});


test("damage-locator filtering raycasts every sub-area of a pooled area", () =>
{
  const raycastAreas = [];
  const geometry = {
    IsPrepared: () => true,
    IsGood: () => true,
    PrepareRayCaster() {},
    ResetRayCaster() {},
    HasRayCasterPreparationFailed: () => false,
    IsRayCasterReady: () => true,
    // Only sub-area 1 occludes; the pooled area is {index:0, count:2}, so the
    // pre-340250f2 GetIndex()-only raycast never saw it.
    GetIntersectionPoints(rayOrigin, _rayDirection, hit, areaIndex, _rayLength)
    {
      raycastAreas.push(areaIndex);
      if (areaIndex !== 1) return false;
      if (Math.abs(rayOrigin[0]) > 10) return false;
      hit.distance = 0.01;
      hit.unnormalizedNormal = [ 0, -1, 0 ];
      return true;
    }
  };
  const mesh = new Tr2Mesh();
  const area = new Tr2MeshArea();
  area.index = 0;
  area.count = 2;
  mesh.opaqueAreas.push(area);
  mesh.SetGeometryRes(geometry);

  const object = new EveSpaceObject2();
  object.mesh = mesh;
  object.SetBoundingSphereInformation([ 0, 0, 0, 10 ]);
  const damage = new EveLocatorSets();
  damage.SetName("damage");
  damage.Append([
    { position: [ 0, 0, 0 ], direction: [ 0, 0, 0, 1 ], boneIndex: 0 },
    { position: [ 50, 0, 0 ], direction: [ 0, 0, 0, 1 ], boneIndex: 0 }
  ]);
  object.locatorSets.push(damage);

  object.RunDamageLocatorFilter();
  object.UpdateDamageLocatorFilter();

  assert.ok(raycastAreas.includes(1), "the inner loop reaches sub-area 1");
  // Locator 0 is occluded and filtered out of closest-locator queries.
  assert.equal(object.GetCloseLocatorIndex([ 0, 0, 1 ], "damage"), 1);
});
