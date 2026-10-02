import { addChild, removeChild } from "../../../../npm/dist/global/blue/children.js";
import { CjsSchema } from "../../../../npm/dist/global/schema/index.js";
import { Traverse } from "../../../../npm/dist/global/blue/find.js";
import { mat4 } from "../../../../npm/dist/global/math/mat4.js";
import { CjsBlackFormat } from "../../../../npm/dist/resource/formats/black/index.js";
import { TriDevice, Tr2ImpostorManager, EveSpherePin, EveChildLineSet, Tr2CurveLineSet, EveChildBehaviorSystem, Tr2ParticleSystem, Tr2InstancedMesh, Tr2DirectInstanceData, Tr2RuntimeInstanceData } from "../../../../npm/dist/trinity/index.js";

/** Whether a model has an explicitly managed device or behavior lifetime owned by demo ships. */
function isShipResource(model)
{
  return CjsSchema.cast(model, Tr2ParticleSystem) || CjsSchema.cast(model, Tr2InstancedMesh)
    || CjsSchema.cast(model, Tr2RuntimeInstanceData) || CjsSchema.cast(model, Tr2DirectInstanceData) || CjsSchema.cast(model, EveChildBehaviorSystem)
    || CjsSchema.cast(model, Tr2ImpostorManager) || CjsSchema.cast(model, EveSpherePin) || CjsSchema.cast(model, EveChildLineSet) || CjsSchema.cast(model, Tr2CurveLineSet);
}

/** Hydrates synchronously; a failed graph may be inaccessible except through device registration. */
export function hydrateDemoShip(values)
{
  const before = new Set(TriDevice.GetResourcesRegistered());
  try
  {
    const ship = CjsSchema.from(values._type, values);
    ship.StartControllers();
    return ship;
  }
  catch (error)
  {
    const resources = TriDevice.GetResourcesRegistered();
    const managedResources = new Set(resources);
    for (const resource of resources)
    {
      if (!before.has(resource) && isShipResource(resource))
      {
        if (CjsSchema.cast(resource, EveChildLineSet) || CjsSchema.cast(resource, EveSpherePin) || CjsSchema.cast(resource, Tr2ImpostorManager)) resource.Destroy(managedResources);
        else resource.Destroy();
      }
    }
    throw error;
  }
}

/** Retires only named ship resources unreachable from the other live or pending ships. */
export function retireDemoShips(roots, retained)
{
  const keep = new Set(), candidates = new Set();
  for (const root of retained) Traverse(root, model => { keep.add(model); });
  for (const root of roots) Traverse(root, model => { if (isShipResource(model)) candidates.add(model); });
  // Pin/impostor effects have explicit JS lifetimes but no device registration. Include
  // current and replaced constructor effects so shared defaults retire once.
  for (const model of candidates)
  {
    if (CjsSchema.cast(model, Tr2ImpostorManager))
    {
      for (const effect of model._ownedEffects) candidates.add(effect);
      if (model.effect) candidates.add(model.effect);
      continue;
    }
    if (!CjsSchema.cast(model, EveSpherePin)) continue;
    for (const effect of model._ownedEffects) candidates.add(effect);
    if (model.pinEffect) candidates.add(model.pinEffect);
    if (model.pickEffect) candidates.add(model.pickEffect);
  }
  // Collect first: destroying a mesh clears its shared provider reference.
  // This walk owns every visited line set; child destruction must neither
  // destroy a kept set nor destroy a candidate again ahead of the walk.
  const managedResources = new Set(keep);
  for (const model of candidates) managedResources.add(model);
  for (const model of candidates)
  {
    if (keep.has(model)) continue;
    if (CjsSchema.cast(model, EveChildLineSet) || CjsSchema.cast(model, EveSpherePin) || CjsSchema.cast(model, Tr2ImpostorManager)) model.Destroy(managedResources);
    else model.Destroy();
  }
}

/** Replaces the demo's ship, rolling back partial overlays and retiring cancelled builds. */
export async function replaceDemoShip({ old, nextDna, scene, pending, isDisposed, buildShip,
  applyBanners, resourceBytes, commit, wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)) })
{
  const check = () => { if (isDisposed()) throw new Error("skin change: demo disposed"); };
  check();
  const next = await buildShip(nextDna);
  pending.add(next);
  const overlays = [], saved = [old.clipSphereFactor, old.clipSphereFactor2, old.activationStrength];
  let succeeded = false;
  try
  {
    check();
    next.displayKillCounterValue = old.displayKillCounterValue;
    applyBanners(next);
    next.speed = old.speed;
    next.translationCurve = old.translationCurve;
    next.maxSpeed = old.maxSpeed;
    mat4.copy(next.worldTransform, old.worldTransform);
    for (let attempt = 0; attempt < 100 && !next.mesh?.GetGeometryResource()?.IsGood(); attempt++)
    {
      await wait(100);
      check();
    }
    const skinned = (old.mesh?.opaqueAreas ?? []).some(area => /skinned/iu.test(area.effect?.effectFilePath ?? ""));
    const bytes = await resourceBytes(`fisfx/skinchange/${skinned ? "skin_change_skinned" : "skin_change"}.black`);
    check();
    for (const owner of [old, next])
    {
      const overlay = CjsBlackFormat.read(bytes, { emit: "runtime" }).root;
      overlays.push({owner, overlay});
      for (const binding of overlay.curveSet?.bindings ?? [])
      {
        binding.destinationObject = binding.name.startsWith("old_") ? old : next;
        binding.Initialize();
      }
      owner.overlayEffects.push(overlay);
      overlay.curveSet.ApplyTime(0);
      overlay.PlayCurveSet(overlay.curveSet.name);
    }
    addChild(scene, "objects", next, { listNotify: scene });
    await wait(overlays[0].overlay.curveSet.GetMaxCurveDuration() * 1000 + 100);
    check();
    next.clipSphereFactor = 0;
    next.clipSphereFactor2 = 0;
    next.activationStrength = 1;
    next.OnModified("clipSphereFactor2");
    if (!removeChild(scene, "objects", old, { listNotify: scene })) throw new Error("skin change: old ship is no longer in scene");
    commit(next);
    succeeded = true;
  }
  finally
  {
    // Overlay bindings reference both ships. Remove both before the sharing walk.
    for (const {owner, overlay} of overlays)
    {
      const index = owner.overlayEffects.indexOf(overlay);
      if (index !== -1) owner.overlayEffects.splice(index, 1);
    }
    pending.delete(next);
    if (succeeded)
    {
      retireDemoShips([old], [next, ...pending]);
    }
    else
    {
      removeChild(scene, "objects", next, { listNotify: scene });
      if (!isDisposed())
      {
        [old.clipSphereFactor, old.clipSphereFactor2, old.activationStrength] = saved;
        old.OnModified("clipSphereFactor");
        old.OnModified("clipSphereFactor2");
      }
      retireDemoShips([next], isDisposed() ? [] : [old, ...pending]);
    }
  }
}
