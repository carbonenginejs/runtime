import { CjsSchema } from "../../../../npm/dist/global/schema/index.js";
import { CjsModel } from "../../../../npm/dist/global/model/index.js";
import { mat4 } from "../../../../npm/dist/global/math/mat4.js";
import { CjsBlackFormat } from "../../../../npm/dist/resource/formats/black/index.js";
import { TriDevice, Tr2ParticleSystem, Tr2InstancedMesh, EveShip2 } from "../../../../npm/dist/trinity/index.js";

/** Whether a model has one of the two CPU-particle lifetimes owned by demo ships. */
function isShipResource(model)
{
  return CjsSchema.cast(model, Tr2ParticleSystem) || CjsSchema.cast(model, Tr2InstancedMesh);
}

/** Hydrates synchronously; a failed graph may be inaccessible except through device registration. */
export function hydrateDemoShip(values)
{
  const before = new Set(TriDevice.GetResourcesRegistered());
  try
  {
    const ship = EveShip2.from(values);
    ship.StartControllers();
    return ship;
  }
  catch (error)
  {
    for (const resource of TriDevice.GetResourcesRegistered())
    {
      if (!before.has(resource) && isShipResource(resource)) resource.Destroy();
    }
    throw error;
  }
}

/** Retires only named CPU resources unreachable from the other live or pending ships. */
export function retireDemoShips(roots, retained)
{
  const keep = new Set(), candidates = new Set();
  for (const root of retained) root.Traverse(model => { keep.add(model); });
  for (const root of roots) root.Traverse(model => { if (isShipResource(model)) candidates.add(model); });
  // Collect first: destroying a mesh clears its shared provider reference.
  for (const model of candidates) if (!keep.has(model)) model.Destroy();
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
    CjsModel.addChild(scene, "objects", next);
    await wait(overlays[0].overlay.curveSet.GetMaxCurveDuration() * 1000 + 100);
    check();
    next.clipSphereFactor = 0;
    next.clipSphereFactor2 = 0;
    next.activationStrength = 1;
    next.OnModified("clipSphereFactor2");
    if (!CjsModel.removeChild(scene, "objects", old)) throw new Error("skin change: old ship is no longer in scene");
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
      CjsModel.removeChild(scene, "objects", next);
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
