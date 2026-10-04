import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { TimeAsDouble } from "#blue";


/**
 * Reads the current time from an update context, accepting a bare number or any
 * of the GetTime()/currentTime/time spellings the hydrated contexts use.
 */
export function getTime(context)
{
  if (typeof context === "number") return context;
  return Number(context?.GetTime?.() ?? context?.currentTime ?? context?.time ?? 0);
}

/**
 * Reads the frame delta from an update context, accepting a bare number or any
 * of the GetDeltaT()/deltaTime/deltaT spellings.
 */
export function getDeltaTime(context)
{
  if (typeof context === "number") return context;
  return Number(context?.GetDeltaT?.() ?? context?.deltaTime ?? context?.deltaT ?? 0);
}

/**
 * Reads the scene's floating-origin shift from an update context.
 * @returns {Array} the context's own vector, or a shared zero vector that callers must not mutate
 */
export function getOriginShift(context)
{
  return context?.GetOriginShift?.() ?? context?.originShift ?? CjsStretchRuntime.ZERO;
}

/**
 * Advances a curve set to a Blue tick time through its seconds overload, as
 * Carbon's EveStretch2 does: Update( TimeAsDouble( time ) ) (EveStretch2.cpp:228-238).
 */
export function updateCurveSet(curveSet, time, renderContext = null)
{
  if (!curveSet) return;
  curveSet.Update(TimeAsDouble(time), renderContext);
}

/**
 * Longest duration a curve set or curve reports through
 * GetMaxCurveDuration/GetCurveDuration/duration, or 0 when it reports none.
 */
export function getCurveDuration(value)
{
  if (!value) return 0;
  return Number(value.GetMaxCurveDuration?.() ?? value.GetCurveDuration?.() ?? value.duration ?? 0);
}

/**
 * Runs a stretch child's synchronous update phase, tolerating the
 * Synchronous/Syncronous spelling split and falling back to the firing-element
 * hook.
 */
export function updateChildSync(child, context, params)
{
  if (!child) return;
  if (typeof child.UpdateSynchronous === "function") child.UpdateSynchronous(context, params);
  else if (typeof child.UpdateSyncronous === "function") child.UpdateSyncronous(context, params);
  else child.UpdateEffectSync?.(context, params);
}

/**
 * Runs a stretch child's asynchronous update phase, tolerating the
 * Asynchronous/Asyncronous spelling split and falling back to the firing-element
 * hook, then to a plain Update.
 */
export function updateChildAsync(child, context, params)
{
  if (!child) return;
  if (typeof child.UpdateAsynchronous === "function") child.UpdateAsynchronous(context, params);
  else if (typeof child.UpdateAsyncronous === "function") child.UpdateAsyncronous(context, params);
  else if (typeof child.UpdateEffectAsync === "function") child.UpdateEffectAsync(context, params);
  else child.Update?.(context, params);
}

/**
 * Hands a stretch child its world placement for the frame, falling back to the
 * older UpdateViewDependentData entry point.
 */
export function updateChildVisibility(child, context, transform, lod = undefined)
{
  if (!child) return;
  if (typeof child.UpdateVisibility === "function") child.UpdateVisibility(context, transform, lod);
  else child.UpdateViewDependentData?.(transform, context);
}

/**
 * Appends a stretch child's renderables to out, pushing the child itself when it produces batches directly rather than delegating.
 * @returns {Array} out
 */
export function collectRenderables(child, out, impostors = null)
{
  if (!child) return out;
  // Carbon forwards the impostor manager to IEveSpaceObject2 children (EveStretch.cpp:310-325).
  if (typeof child.GetRenderables_Impostors === "function") child.GetRenderables_Impostors(out, impostors);
  else if (typeof child.GetRenderables === "function") child.GetRenderables(out);
  else if (typeof child.GetBatches === "function") out.push(child);
  return out;
}

/**
 * Writes a uniform-scale-plus-translation matrix.
 * @param {Array} [out] - caller-owned mat4; a fresh matrix is allocated when omitted
 * @returns {Array} out
 */
export function translationMatrix(position, out = mat4.create(), scale = 1)
{
  mat4.identity(out);
  out[0] = out[5] = out[10] = scale;
  out[12] = position[0];
  out[13] = position[1];
  out[14] = position[2];
  return out;
}

/**
 * Grows out to the smallest sphere enclosing both spheres, where each is packed (x, y, z, radius). A negative-radius input is ignored, and an empty out is replaced outright rather than merged.
 * @returns {Array} out
 */
export function mergeSphere(out, sphere)
{
  if (!(sphere?.[3] >= 0)) return out;
  if (!(out[3] > 0))
  {
    out.set(sphere);
    return out;
  }
  const dx = sphere[0] - out[0];
  const dy = sphere[1] - out[1];
  const dz = sphere[2] - out[2];
  const distance = Math.hypot(dx, dy, dz);
  if (out[3] >= distance + sphere[3]) return out;
  if (sphere[3] >= distance + out[3])
  {
    out.set(sphere);
    return out;
  }
  const radius = (distance + out[3] + sphere[3]) * 0.5;
  const amount = distance ? (radius - out[3]) / distance : 0;
  out[0] += dx * amount;
  out[1] += dy * amount;
  out[2] += dz * amount;
  out[3] = radius;
  return out;
}

const CjsStretchRuntime = {
  ZERO: vec3.create()
};
