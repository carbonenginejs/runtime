import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

/**
 * Reads the current time from an update context, accepting a bare number or any
 * of the GetTime()/currentTime/time spellings the hydrated contexts use.
 */
function getTime(context) {
  if (typeof context === "number") return context;
  return Number(context?.GetTime?.() ?? context?.currentTime ?? context?.time ?? 0);
}

/**
 * Reads the frame delta from an update context, accepting a bare number or any
 * of the GetDeltaT()/deltaTime/deltaT spellings.
 */
function getDeltaTime(context) {
  if (typeof context === "number") return context;
  return Number(context?.GetDeltaT?.() ?? context?.deltaTime ?? context?.deltaT ?? 0);
}

/**
 * Reads the scene's floating-origin shift from an update context.
 * @returns {Array} the context's own vector, or a shared zero vector that callers must not mutate
 */
function getOriginShift(context) {
  return context?.GetOriginShift?.() ?? context?.originShift ?? CjsStretchRuntime.ZERO;
}

/**
 * Samples a vector curve at time through whichever of Update/UpdateValue/GetValueAt the hydrated object exposes, falling back to its stored value field.
 * @param {Array} out - caller-owned vec3; returned unchanged when the curve is null or exposes none of those entry points
 * @returns {Array} out
 */
function sampleVector(curve, time, out) {
  if (!curve) return out;
  if (typeof curve.Update === "function") curve.Update(time, out);else if (typeof curve.UpdateValue === "function") curve.UpdateValue(time, out);else if (typeof curve.GetValueAt === "function") curve.GetValueAt(time, out);else if (curve.value?.length >= 3) vec3.copy(out, curve.value);
  return out;
}

/**
 * Advances a curve set to an absolute time, using UpdateDelta for objects that
 * predate the two-argument Update.
 */
function updateCurveSet(curveSet, time, renderContext = null) {
  if (!curveSet) return;
  curveSet.Update(time, time, renderContext);
}

/**
 * Longest duration a curve set or curve reports through
 * GetMaxCurveDuration/GetCurveDuration/duration, or 0 when it reports none.
 */
function getCurveDuration(value) {
  if (!value) return 0;
  return Number(value.GetMaxCurveDuration?.() ?? value.GetCurveDuration?.() ?? value.duration ?? 0);
}

/**
 * Runs a stretch child's synchronous update phase, tolerating the
 * Synchronous/Syncronous spelling split and falling back to the firing-element
 * hook.
 */
function updateChildSync(child, context, params) {
  if (!child) return;
  if (typeof child.UpdateSynchronous === "function") child.UpdateSynchronous(context, params);else if (typeof child.UpdateSyncronous === "function") child.UpdateSyncronous(context, params);else child.UpdateEffectSync?.(context, params);
}

/**
 * Runs a stretch child's asynchronous update phase, tolerating the
 * Asynchronous/Asyncronous spelling split and falling back to the firing-element
 * hook, then to a plain Update.
 */
function updateChildAsync(child, context, params) {
  if (!child) return;
  if (typeof child.UpdateAsynchronous === "function") child.UpdateAsynchronous(context, params);else if (typeof child.UpdateAsyncronous === "function") child.UpdateAsyncronous(context, params);else if (typeof child.UpdateEffectAsync === "function") child.UpdateEffectAsync(context, params);else child.Update?.(context, params);
}

/**
 * Hands a stretch child its world placement for the frame, falling back to the
 * older UpdateViewDependentData entry point.
 */
function updateChildVisibility(child, context, transform) {
  if (!child) return;
  if (typeof child.UpdateVisibility === "function") child.UpdateVisibility(context, transform);else child.UpdateViewDependentData?.(transform, context);
}

/**
 * Appends a stretch child's renderables to out, pushing the child itself when it produces batches directly rather than delegating.
 * @returns {Array} out
 */
function collectRenderables(child, out) {
  if (!child) return out;
  if (typeof child.GetRenderables === "function") child.GetRenderables(out);else if (typeof child.GetBatches === "function") out.push(child);
  return out;
}

/**
 * Builds the pair of endpoint bases for a stretch: the source basis has its Z axis pointing at the destination, and the destination basis is the same frame with X and Z negated so it faces back down the line. A zero-length span falls back to +Z, and the up reference is the world axis least aligned with the direction.
 * @param {Array} source - caller-owned mat4, overwritten with the source basis
 * @param {Array} destination - caller-owned mat4, overwritten with the destination basis
 * @returns {Array} source
 */
function makeEndpointTransforms(sourcePosition, destinationPosition, source, destination) {
  const direction = CjsStretchRuntime.DIRECTION;
  const up = CjsStretchRuntime.UP;
  const xAxis = CjsStretchRuntime.X;
  const yAxis = CjsStretchRuntime.Y;
  vec3.subtract(direction, destinationPosition, sourcePosition);
  if (vec3.squaredLength(direction) <= Number.EPSILON) vec3.set(direction, 0, 0, 1);else vec3.normalize(direction, direction);
  const ax = Math.abs(direction[0]);
  const ay = Math.abs(direction[1]);
  const az = Math.abs(direction[2]);
  if (ax < ay && ax < az) vec3.set(up, 1, 0, 0);else if (ay < ax && ay < az) vec3.set(up, 0, 1, 0);else vec3.set(up, 0, 0, 1);
  vec3.normalize(xAxis, vec3.cross(xAxis, up, direction));
  vec3.cross(yAxis, xAxis, direction);
  writeBasis(source, xAxis, yAxis, direction, sourcePosition);
  vec3.negate(xAxis, xAxis);
  vec3.negate(direction, direction);
  writeBasis(destination, xAxis, yAxis, direction, destinationPosition);
  return source;
}

/**
 * Builds the source endpoint basis and scales its Z axis by the endpoint distance, so a child authored one unit long in Z spans the gap exactly; negativeZ makes the span run backwards for effects authored down -Z.
 * @param {Array} out - caller-owned mat4, overwritten
 * @returns {Array} out
 */
function makeStretchTransform(sourcePosition, destinationPosition, out, negativeZ = false) {
  makeEndpointTransforms(sourcePosition, destinationPosition, out, CjsStretchRuntime.MATRIX);
  const length = vec3.distance(sourcePosition, destinationPosition) * (negativeZ ? -1 : 1);
  out[8] *= length;
  out[9] *= length;
  out[10] *= length;
  return out;
}

/**
 * Writes a uniform-scale-plus-translation matrix.
 * @param {Array} [out] - caller-owned mat4; a fresh matrix is allocated when omitted
 * @returns {Array} out
 */
function translationMatrix(position, out = mat4.create(), scale = 1) {
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
function mergeSphere(out, sphere) {
  if (!(sphere?.[3] >= 0)) return out;
  if (!(out[3] > 0)) {
    out.set(sphere);
    return out;
  }
  const dx = sphere[0] - out[0];
  const dy = sphere[1] - out[1];
  const dz = sphere[2] - out[2];
  const distance = Math.hypot(dx, dy, dz);
  if (out[3] >= distance + sphere[3]) return out;
  if (sphere[3] >= distance + out[3]) {
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
function writeBasis(out, xAxis, yAxis, zAxis, translation) {
  mat4.identity(out);
  out[0] = xAxis[0];
  out[1] = xAxis[1];
  out[2] = xAxis[2];
  out[4] = yAxis[0];
  out[5] = yAxis[1];
  out[6] = yAxis[2];
  out[8] = zAxis[0];
  out[9] = zAxis[1];
  out[10] = zAxis[2];
  out[12] = translation[0];
  out[13] = translation[1];
  out[14] = translation[2];
  return out;
}
const CjsStretchRuntime = Object.freeze({
  ZERO: vec3.create(),
  DIRECTION: vec3.create(),
  UP: vec3.create(),
  X: vec3.create(),
  Y: vec3.create(),
  MATRIX: mat4.create()
});

export { collectRenderables, getCurveDuration, getDeltaTime, getOriginShift, getTime, makeEndpointTransforms, makeStretchTransform, mergeSphere, sampleVector, translationMatrix, updateChildAsync, updateChildSync, updateChildVisibility, updateCurveSet };
//# sourceMappingURL=CjsStretchRuntime.js.map
