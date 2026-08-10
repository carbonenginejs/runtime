/**
 * Granny animation-curve decoding authored by cppctamber for ccpwgl2.
 *
 * This local copy decodes and samples already-materialized curve data without
 * coupling runtime-trinity to a GR2 container reader. The former format-gr2
 * licensing boundary is resolved: its BitKnit2 decoder was replaced by a
 * clean-room implementation, the package is MIT, and the canonical reader now
 * lives at @carbonenginejs/runtime-resource/formats/gr2.
 */
import { num } from "@carbonenginejs/runtime-utils/num";

const fr = Math.fround;
const CURVE_DECODERS = Object.freeze([Object.freeze({
  format: 0,
  decode: decodeDaKeyframes32f
}), Object.freeze({
  format: 1,
  decode: decodeDaK32fC32f
}), Object.freeze({
  format: 2,
  decode: decodeDaIdentity
}), Object.freeze({
  format: 3,
  decode: decodeDaConstant32f
}), Object.freeze({
  format: 4,
  decode: decodeD3Constant32f
}), Object.freeze({
  format: 5,
  decode: decodeD4Constant32f
}), Object.freeze({
  format: 6,
  decode: decodeDaK16uC16u
}), Object.freeze({
  format: 7,
  decode: decodeDaK8uC8u
}), Object.freeze({
  format: 8,
  decode: decodeD4nK16uC15u
}), Object.freeze({
  format: 9,
  decode: decodeD4nK8uC7u
}), Object.freeze({
  format: 10,
  decode: decodeD3K16uC16u
}), Object.freeze({
  format: 11,
  decode: decodeD3K8uC8u
}), Object.freeze({
  format: 12,
  decode: decodeD9I1K16uC16u
}), Object.freeze({
  format: 13,
  decode: decodeD9I3K16uC16u
}), Object.freeze({
  format: 14,
  decode: decodeD9I1K8uC8u
}), Object.freeze({
  format: 15,
  decode: decodeD9I3K8uC8u
}), Object.freeze({
  format: 16,
  decode: decodeD3I1K32fC32f
}), Object.freeze({
  format: 17,
  decode: decodeD3I1K16uC16u
}), Object.freeze({
  format: 18,
  decode: decodeD3I1K8uC8u
})]);
const D4N_SCALE_TABLE = new Float32Array([1.4142135, 0.70710677, 0.35355338, 0.35355338, 0.35355338, 0.17677669, 0.17677669, 0.17677669, -1.4142135, -0.70710677, -0.35355338, -0.35355338, -0.35355338, -0.17677669, -0.17677669, -0.17677669]);
const D4N_OFFSET_TABLE = new Float32Array([-0.70710677, -0.35355338, -0.53033006, -0.17677669, 0.17677669, -0.17677669, -0.088388346, 0.0, 0.70710677, 0.35355338, 0.53033006, 0.17677669, -0.17677669, 0.17677669, 0.088388346, -0.0]);
const D4N_SCALE_TABLE_MULTIPLIER_16 = 0.000030518509;
const D4N_SCALE_TABLE_MULTIPLIER_8 = 0.0078740157;

/**
 * Decodes Granny's 19 compressed animation-curve formats into explicit knots and
 * controls, and samples them at a time, without depending on a GR2 container
 * reader.
 */
export class CjsGrannyCurves
{
  static #resources = new Map();

  /**
   * Decode a GR2 JSON curve object into explicit knots and controls.
   */
  static decodeCurve(curveJson, dimension)
  {
    if (!curveJson || typeof curveJson.format !== "number")
    {
      throw new Error("gr2reader: decodeCurve requires a curve object with a numeric format");
    }
    const decoder = CURVE_DECODERS[curveJson.format];
    if (!decoder)
    {
      throw new Error(`gr2reader: unsupported granny curve format ${curveJson.format}`);
    }
    const {
      knots,
      controls,
      dimension: dim
    } = decoder.decode(curveJson, dimension);
    if (dimension && dim && dim !== dimension)
    {
      throw new Error(`gr2reader: curve format ${curveJson.format} decoded dimension ${dim} does not match track dimension ${dimension}`);
    }
    return {
      knots,
      controls,
      degree: Number(curveJson.degree) || 0,
      dimension: dim || dimension
    };
  }

  /**
   * Sample a decoded Granny curve into caller-provided output.
   */
  static sampleDecodedCurve(out, curve, time, cycle = false, duration = 0, options = {})
  {
    if (!curve || !curve.knots || !curve.controls || !curve.dimension)
    {
      return out;
    }
    const knots = curve.knots,
      count = knots.length,
      dim = curve.dimension,
      controlCount = curve.controls.length / dim;
    if (!count || !controlCount)
    {
      return out;
    }
    if (options.keyframed)
    {
      return CjsGrannyCurves.#copyControl(out, curve, CjsGrannyCurves.#sampleKeyframedCurve(count, time, duration));
    }
    const knot = CjsGrannyCurves.#findKnotIndex(knots, time);
    if (curve.degree <= 0 || count === 1 || controlCount === 1)
    {
      const index = time >= knots[count - 1]
        ? count - 1
        : Math.max(0, knot - 1);
      return CjsGrannyCurves.#copyControl(out, curve, Math.min(index, controlCount - 1));
    }
    if (curve.degree === 1)
    {
      return CjsGrannyCurves.#sampleLinearCurve(out, curve, time, cycle, duration || knots[count - 1], knot);
    }
    return CjsGrannyCurves.#sampleQuadraticCurve(out, curve, time, cycle, duration || knots[count - 1], knot);
  }

  /**
   * Registers a decoded Granny source under a resource path so tracks can
   * resolve it later; the caller retains ownership of the source object.
   */
  static registerResource(path, source)
  {
    if (path)
    {
      CjsGrannyCurves.#resources.set(path, source);
    }
  }

  /** Drops the registration for a resource path. */
  static unregisterResource(path)
  {
    CjsGrannyCurves.#resources.delete(path);
  }

  /** Drops every registered Granny source. */
  static clearResources()
  {
    CjsGrannyCurves.#resources.clear();
  }

  /** Gets the source registered for a resource path, or null. */
  static resolveResource(path)
  {
    return CjsGrannyCurves.#resources.get(path) ?? null;
  }

  /**
   * Unwraps an arbitrary loader result down to the object that actually carries
   * an `animations` array, searching nested json/data/value/source/fileInfo keys
   * up to eight levels deep.
   */
  static getTrackSource(value)
  {
    return CjsGrannyCurves.#findTrackSource(value, 0);
  }

  /**
   * Gets a source's animation list, accepting either the camel-case or
   * Pascal-case key and returning an empty array when absent.
   */
  static getAnimations(source)
  {
    return CjsGrannyCurves.#getArray(source, "animations", "Animations");
  }

  /**
   * Gets an animation's track group list, accepting either the camel-case or
   * Pascal-case key and returning an empty array when absent.
   */
  static getTrackGroups(animation)
  {
    return CjsGrannyCurves.#getArray(animation, "trackGroups", "TrackGroups");
  }

  /**
   * Gets an animation's duration in seconds, or 0 when it is absent or
   * non-numeric.
   */
  static getAnimationDuration(animation)
  {
    return Number(animation.duration ?? animation.Duration) || 0;
  }

  /**
   * Gets an animation's authored time step in seconds, or 0 when it is absent or
   * non-numeric.
   */
  static getAnimationTimeStep(animation)
  {
    return Number(animation.timeStep ?? animation.TimeStep) || 0;
  }

  /**
   * Finds a named transform track in a track group and returns it with its
   * orientation, position and scaleShear curves normalized to camel-case keys.
   */
  static findTransformTrack(group, name)
  {
    const trackGroup = CjsGrannyCurves.#asTrackGroup(group);
    if (!trackGroup)
    {
      return null;
    }
    const tracks = CjsGrannyCurves.#getArray(trackGroup, "transformTracks", "TransformTracks");
    const track = tracks.find(item => CjsGrannyCurves.#getName(item) === name);
    return track ? CjsGrannyCurves.#normalizeTransformTrack(track) : null;
  }

  /**
   * Finds a named vector track in a track group and returns it with its
   * valueCurve normalized to a camel-case key.
   */
  static findVectorTrack(group, name)
  {
    const trackGroup = CjsGrannyCurves.#asTrackGroup(group);
    if (!trackGroup)
    {
      return null;
    }
    const tracks = CjsGrannyCurves.#getArray(trackGroup, "vectorTracks", "VectorTracks");
    const track = tracks.find(item => CjsGrannyCurves.#getName(item) === name);
    return track ? CjsGrannyCurves.#normalizeVectorTrack(track) : null;
  }

  /** Finds a named text (event) track in a track group, or null. */
  static findTextTrack(group, name)
  {
    const trackGroup = CjsGrannyCurves.#asTrackGroup(group);
    if (!trackGroup)
    {
      return null;
    }
    const textTracks = CjsGrannyCurves.#getArray(trackGroup, "textTracks", "TextTracks");
    return textTracks.find(track => CjsGrannyCurves.#getName(track) === name) ?? null;
  }

  /**
   * Flattens a text track into `{ time, text }` records in source order,
   * dropping entries whose timestamp is not a finite number.
   */
  static getTextTrackEntries(track)
  {
    const entries = CjsGrannyCurves.#getArray(track, "entries", "Entries");
    const out = [];
    for (const entry of entries)
    {
      const time = CjsGrannyCurves.#getEntryTime(entry);
      if (Number.isFinite(time))
      {
        out.push({ time, text: String(entry.text ?? entry.Text ?? "") });
      }
    }
    return out;
  }

  /**
   * Decodes one Granny curve to the shared sampler shape for the expected
   * dimension, first reusing already-explicit knots and controls when present
   * and otherwise running the format decoder; returns null instead of throwing
   * for an errored, malformed or unsupported curve.
   */
  static decodeGrannyCurve(curve, dimension)
  {
    if (!curve || curve.error || curve.Error)
    {
      return null;
    }
    const normalized = CjsGrannyCurves.#normalizeCurve(curve);
    const decodedDirect = CjsGrannyCurves.#getDecodedCurve(normalized, dimension);
    if (decodedDirect)
    {
      return decodedDirect;
    }
    if (typeof normalized.format !== "number" || typeof normalized.degree !== "number")
    {
      return null;
    }
    try
    {
      const decoded = CjsGrannyCurves.decodeCurve(normalized, dimension);
      return {
        format: normalized.format,
        knots: decoded.knots,
        controls: decoded.controls,
        degree: decoded.degree,
        dimension: decoded.dimension,
        keyframed: normalized.format === 0
      };
    }
    catch
    {
      return null;
    }
  }

  /** Decodes an already-materialized Carbon animation curve into the shared sampler shape. */
  static decodeAnimationCurve(curve, dimension)
  {
    if (!curve)
    {
      return null;
    }

    const valueDimension = Number(curve.valueDimension ?? curve.ValueDimension);
    const knotCount = Number(curve.knotCount ?? curve.KnotCount);
    if (valueDimension !== dimension || !Number.isSafeInteger(knotCount) || knotCount <= 0)
    {
      return null;
    }

    try
    {
      const knots = decodeElements(
        curve.knots ?? curve.Knots,
        curve.knotType ?? curve.KnotType,
        knotCount
      );
      const controls = decodeElements(
        curve.values ?? curve.Values,
        curve.valueType ?? curve.ValueType,
        knotCount * valueDimension
      );
      const interpolation = curve.interpolation ?? curve.Interpolation;

      return {
        knots,
        controls,
        degree: interpolation === "Step" || interpolation === 0 ? 0 : 1,
        dimension: valueDimension,
        keyframed: false
      };
    }
    catch
    {
      return null;
    }
  }

  /**
   * Samples a decoded curve into the caller-owned `out` array, taking the
   * keyframed flag from the curve itself; `out` must hold at least the curve's
   * dimension.
   */
  static sampleGrannyCurve(out, curve, time, cycle, duration)
  {
    CjsGrannyCurves.sampleDecodedCurve(out, curve, time, cycle, duration, {
      keyframed: curve.keyframed
    });
    return out;
  }

  /** Narrows a value to a non-null object, otherwise null. */
  static #asRecord(value)
  {
    return value !== null && typeof value === "object" ? value : null;
  }

  /**
   * Accepts a value as a Granny source only if it carries an animations array
   * under either casing.
   */
  static #asTrackSource(value)
  {
    const record = CjsGrannyCurves.#asRecord(value);
    return CjsGrannyCurves.#hasArrayValue(record, "animations", "Animations") ? record : null;
  }

  /** Narrows a value to a non-null object usable as a track group. */
  static #asTrackGroup(value)
  {
    return CjsGrannyCurves.#asRecord(value);
  }

  /**
   * Recursively searches the common wrapper keys for the object carrying the
   * animations array, stopping past depth 8 to bound cyclic or deeply nested
   * loader results.
   */
  static #findTrackSource(value, depth)
  {
    const direct = CjsGrannyCurves.#asTrackSource(value);
    if (direct)
    {
      return direct;
    }
    const record = CjsGrannyCurves.#asRecord(value);
    if (!record || depth > 8)
    {
      return null;
    }
    for (const key of ["json", "Json", "data", "Data", "value", "Value", "source", "Source", "fileInfo", "FileInfo"])
    {
      const nested = CjsGrannyCurves.#findTrackSource(record[key], depth + 1);
      if (nested)
      {
        return nested;
      }
    }
    return null;
  }

  /**
   * Reads an array property under either the camel-case or Pascal-case key,
   * returning an empty array when neither holds one.
   */
  static #getArray(value, lowerKey, upperKey)
  {
    const lower = value[lowerKey];
    if (Array.isArray(lower))
    {
      return lower;
    }
    const upper = value[upperKey];
    return Array.isArray(upper) ? upper : [];
  }

  /** Checks whether either the camel-case or Pascal-case key holds an array. */
  static #hasArrayValue(value, lowerKey, upperKey)
  {
    return Array.isArray(value?.[lowerKey]) || Array.isArray(value?.[upperKey]);
  }

  /** Reads a name under either the camel-case or Pascal-case key. */
  static #getName(value)
  {
    return value.name ?? value.Name;
  }

  /**
   * Reads a text-track entry's time from timeStamp, TimeStamp, timestamp or
   * time, returning NaN when none is numeric.
   */
  static #getEntryTime(entry)
  {
    const value = entry.timeStamp ?? entry.TimeStamp ?? entry.timestamp ?? entry.time;
    return typeof value === "number" ? value : Number.NaN;
  }

  /**
   * Copies a transform track with its name and its orientation, position and
   * scaleShear curves exposed under camel-case keys.
   */
  static #normalizeTransformTrack(track)
  {
    return {
      ...track,
      name: CjsGrannyCurves.#getName(track),
      orientation: track.orientation ?? track.Orientation,
      position: track.position ?? track.Position,
      scaleShear: track.scaleShear ?? track.ScaleShear
    };
  }

  /**
   * Copies a vector track with its name and valueCurve exposed under camel-case
   * keys.
   */
  static #normalizeVectorTrack(track)
  {
    return {
      ...track,
      name: CjsGrannyCurves.#getName(track),
      valueCurve: track.valueCurve ?? track.ValueCurve
    };
  }

  /**
   * Copies a curve object with every Pascal-case key also exposed camel-case, so
   * the format decoders can read one casing regardless of how the source was
   * produced.
   */
  static #normalizeCurve(curve)
  {
    const normalized = { ...curve };
    for (const [key, value] of Object.entries(curve))
    {
      const lowerKey = CjsGrannyCurves.#lowerFirst(key);
      if (!(lowerKey in normalized))
      {
        normalized[lowerKey] = value;
      }
    }
    normalized.format = curve.format ?? curve.Format;
    normalized.degree = curve.degree ?? curve.Degree;
    normalized.knots = curve.knots ?? curve.Knots;
    normalized.controls = curve.controls ?? curve.Controls;
    normalized.dimension = curve.dimension ?? curve.Dimension;
    normalized.error = curve.error ?? curve.Error;
    return normalized;
  }

  /**
   * Reuses a curve that already carries explicit knot and control arrays,
   * rejecting it when the dimension does not match the track or the control
   * count is not a whole number of samples.
   */
  static #getDecodedCurve(curve, dimension)
  {
    const knots = curve.knots;
    const controls = curve.controls;
    const curveDimension = Number(curve.dimension) || dimension;
    if (!Array.isArray(knots) || !Array.isArray(controls) || curveDimension !== dimension || controls.length % curveDimension !== 0)
    {
      return null;
    }
    return {
      format: curve.format,
      knots,
      controls,
      degree: Number(curve.degree) || 0,
      dimension: curveDimension,
      keyframed: curve.format === 0
    };
  }

  /** Lower-cases the first character of a key name. */
  static #lowerFirst(value)
  {
    return value ? value[0].toLowerCase() + value.slice(1) : value;
  }

  /** Copies one whole control sample into the caller-owned `out` array. */
  static #copyControl(out, curve, index)
  {
    const offset = index * curve.dimension;
    for (let i = 0; i < curve.dimension; i++)
    {
      out[i] = curve.controls[offset + i];
    }
    return out;
  }

  /**
   * Binary-searches the knot array for the index of the first knot strictly
   * greater than the time.
   */
  static #findKnotIndex(knots, time)
  {
    let low = 0;
    let high = knots.length - 1;
    while (low < high)
    {
      const mid = low + high >> 1;
      if (knots[mid] > time)
      {
        high = mid;
      }
      else
      {
        low = mid + 1;
      }
    }
    return low;
  }

  /**
   * Maps a time onto a frame index for a uniformly keyframed curve, clamping to
   * the first and last frame; a duration of zero always yields frame 0.
   */
  static #sampleKeyframedCurve(count, time, duration)
  {
    const frame = duration > 0 ? Math.trunc(count * time / duration) : 0;
    return Math.max(0, Math.min(count - 1, frame));
  }

  /**
   * Linearly interpolates a degree-1 curve into `out`, wrapping the segment
   * around the end of the knot array and shifting the times by one duration when
   * cycling.
   */
  static #sampleLinearCurve(out, curve, time, cycle, duration, knot)
  {
    const knots = curve.knots;
    const count = knots.length;
    const dim = curve.dimension;
    const knot0 = cycle ? (knot + count - 1) % count : knot === 0 ? 0 : knot - 1;
    const start = knots[knot0];
    let end = knots[knot];
    let localTime = time;
    if (cycle && end < start)
    {
      end += duration;
    }
    if (cycle && localTime < start)
    {
      localTime += duration;
    }
    const t = end !== start ? (localTime - start) / (end - start) : 0;
    const p0 = knot0 * dim;
    const p1 = knot * dim;
    for (let i = 0; i < dim; i++)
    {
      out[i] = curve.controls[p0 + i] * (1 - t) + curve.controls[p1 + i] * t;
    }
    return out;
  }

  /**
   * Evaluates a degree-2 curve into `out` from the three controls ending at the
   * found knot, shifting out-of-order times by one duration so a cycling curve
   * stays monotonic.
   */
  static #sampleQuadraticCurve(out, curve, time, cycle, duration, knot)
  {
    const knots = curve.knots;
    const count = knots.length;
    const dim = curve.dimension;
    const k2 = cycle ? (knot + count - 2) % count : knot === 0 ? 0 : Math.max(0, knot - 2);
    const k1 = cycle ? (knot + count - 1) % count : knot === 0 ? 0 : knot - 1;
    const ti2 = knots[k2];
    const ti1 = knots[k1];
    let ti = knots[knot];
    let tiNext = knots[(knot + 1) % count];
    let localTime = time;
    if (ti2 > ti)
    {
      ti += duration;
      tiNext += duration;
      localTime += duration;
    }
    if (ti1 > ti)
    {
      ti += duration;
      tiNext += duration;
      localTime += duration;
    }
    if (tiNext < ti)
    {
      tiNext += duration;
    }
    const d0 = ti - ti1;
    const d1a = ti - ti2;
    const d1b = tiNext - ti1;
    const l0 = d0 !== 0 ? (localTime - ti1) / d0 : 0;
    const l1a = d1a !== 0 ? (localTime - ti2) / d1a : 0;
    const l1b = d1b !== 0 ? (localTime - ti1) / d1b : 0;
    let c2 = l1a + l0 - l0 * l1a;
    const ci = l0 * l1b;
    const c1 = c2 - ci;
    c2 = 1 - c2;
    const p0 = k2 * dim;
    const p1 = k1 * dim;
    const p2 = knot * dim;
    for (let i = 0; i < dim; i++)
    {
      out[i] = c2 * curve.controls[p0 + i] + c1 * curve.controls[p1 + i] + ci * curve.controls[p2 + i];
    }
    return out;
  }
}

const ANIMATION_ELEMENT_TYPES = Object.freeze([
  "Float32",
  "Float16",
  "UInt16Norm",
  "UInt16",
  "Int16Norm",
  "Int16",
  "UInt8Norm",
  "UInt8",
  "Int8Norm",
  "Int8"
]);

function decodeElements(value, typeValue, count)
{
  const type = typeof typeValue === "number" ? ANIMATION_ELEMENT_TYPES[typeValue] : typeValue;
  const size = elementTypeSize(type);

  if (ArrayBuffer.isView(value) && !(value instanceof Uint8Array) && value.length === count)
  {
    return Array.from(value, Number);
  }
  if (Array.isArray(value) && size > 1 && value.length === count)
  {
    return value.map(Number);
  }

  const bytes = asByteView(value);
  if (!bytes || bytes.byteLength < count * size)
  {
    throw new TypeError("Animation curve data is incomplete");
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return Array.from({ length: count }, (_, index) => readElement(view, index * size, type));
}

function asByteView(value)
{
  if (value instanceof Uint8Array)
  {
    return value;
  }
  if (ArrayBuffer.isView(value))
  {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  if (value instanceof ArrayBuffer)
  {
    return new Uint8Array(value);
  }
  return Array.isArray(value) ? Uint8Array.from(value) : null;
}

function elementTypeSize(type)
{
  switch (type)
  {
    case "Float32":
      return 4;
    case "Float16":
    case "UInt16Norm":
    case "UInt16":
    case "Int16Norm":
    case "Int16":
      return 2;
    case "UInt8Norm":
    case "UInt8":
    case "Int8Norm":
    case "Int8":
      return 1;
    default:
      throw new TypeError(`Unsupported animation curve element type "${type}"`);
  }
}

function readElement(view, offset, type)
{
  switch (type)
  {
    case "Float32":
      return view.getFloat32(offset, true);
    case "Float16":
      return num.fromHalfFloat(view.getUint16(offset, true));
    case "UInt16Norm":
      return view.getUint16(offset, true) / 65535;
    case "UInt16":
      return view.getUint16(offset, true);
    case "Int16Norm":
      return Math.max(view.getInt16(offset, true) / 32767, -1);
    case "Int16":
      return view.getInt16(offset, true);
    case "UInt8Norm":
      return view.getUint8(offset) / 255;
    case "UInt8":
      return view.getUint8(offset);
    case "Int8Norm":
      return Math.max(view.getInt8(offset) / 127, -1);
    case "Int8":
      return view.getInt8(offset);
    default:
      throw new TypeError(`Unsupported animation curve element type "${type}"`);
  }
}

function exactDiv(numerator, divisor, what)
{
  const value = numerator / divisor;
  if (!Number.isInteger(value))
  {
    throw new Error(`gr2reader: curve ${what}: ${numerator} is not divisible by ${divisor}`);
  }
  return value;
}
function knotScaleFromTrunc(oneOverKnotScaleTrunc)
{
  const buffer = new Uint32Array([oneOverKnotScaleTrunc << 16]);
  return new Float32Array(buffer.buffer)[0];
}
function knotsFromControls(knotsControls, count, scale)
{
  const out = new Array(count);
  for (let i = 0; i < count; i++)
  {
    out[i] = fr(knotsControls[i] / scale);
  }
  return out;
}
function knotsFromControlsTrunc(knotsControls, count, oneOverKnotScaleTrunc)
{
  return knotsFromControls(knotsControls, count, knotScaleFromTrunc(oneOverKnotScaleTrunc));
}
function identityControls(dimension)
{
  switch (dimension)
  {
    case 3:
      return [0, 0, 0];
    case 4:
      return [0, 0, 0, 1];
    case 9:
      return [1, 0, 0, 0, 1, 0, 0, 0, 1];
    default:
      throw new Error(`gr2reader: invalid curve dimension ${dimension}`);
  }
}
function decodeDaKeyframes32f(c, dimension)
{
  const dim = c.dimension || dimension,
    controls = c.controls || [],
    count = exactDiv(controls.length, dim, "DaKeyframes32f controls/dimension"),
    knots = new Array(count);
  for (let i = 0; i < count; i++)
  {
    knots[i] = i;
  }
  return {
    knots,
    controls: controls.map(fr),
    dimension: dim
  };
}
function decodeDaK32fC32f(c, dimension)
{
  const knots = (c.knots || []).map(fr),
    controls = (c.controls || []).map(fr),
    dim = knots.length ? exactDiv(controls.length, knots.length, "DaK32fC32f controls/knots") : dimension;
  return {
    knots,
    controls,
    dimension: dim
  };
}
function decodeDaIdentity(c, dimension)
{
  const dim = c.dimension || dimension;
  return {
    knots: [0],
    controls: identityControls(dim),
    dimension: dim
  };
}
function decodeDaConstant32f(c, dimension)
{
  const controls = (c.controls || []).map(fr);
  return {
    knots: [0],
    controls,
    dimension: controls.length || dimension
  };
}
function decodeD3Constant32f(c)
{
  const controls = (c.controls || [0, 0, 0]).slice(0, 3).map(fr);
  return {
    knots: [0],
    controls,
    dimension: 3
  };
}
function decodeD4Constant32f(c)
{
  const controls = (c.controls || [0, 0, 0, 1]).slice(0, 4).map(fr);
  return {
    knots: [0],
    controls,
    dimension: 4
  };
}
function decodeDaK(c)
{
  const controlScaleOffsets = c.controlScaleOffsets || [],
    knotsControls = c.knotsControls || [],
    dim = exactDiv(controlScaleOffsets.length, 2, "DaK controlScaleOffsets/2"),
    count = exactDiv(knotsControls.length, dim + 1, "DaK knotsControls/(dim+1)"),
    knots = knotsFromControlsTrunc(knotsControls, count, Number(c.oneOverKnotScaleTrunc) || 0),
    controls = new Array(count * dim);
  for (let i = 0; i < count; i++)
  {
    for (let x = 0; x < dim; x++)
    {
      controls[i * dim + x] = fr(knotsControls[count + i * dim + x] * controlScaleOffsets[x] + controlScaleOffsets[dim + x]);
    }
  }
  return {
    knots,
    controls,
    dimension: dim
  };
}
function quatFromControl16(out, a, b, c, scales, offsets)
{
  const swizzle1 = (b & 0x8000) >> 14 | c >> 15,
    swizzle2 = swizzle1 + 1 & 3,
    swizzle3 = swizzle2 + 1 & 3,
    swizzle4 = swizzle3 + 1 & 3;
  const dataA = (a & 0x7fff) * scales[swizzle2] + offsets[swizzle2],
    dataB = (b & 0x7fff) * scales[swizzle3] + offsets[swizzle3],
    dataC = (c & 0x7fff) * scales[swizzle4] + offsets[swizzle4];
  let dataD = Math.sqrt(Math.max(0, 1 - (dataA * dataA + dataB * dataB + dataC * dataC)));
  if ((a & 0x8000) !== 0)
  {
    dataD = -dataD;
  }
  out[swizzle2] = fr(dataA);
  out[swizzle3] = fr(dataB);
  out[swizzle4] = fr(dataC);
  out[swizzle1] = fr(dataD);
  return out;
}
function decodeD4n(c, decoder, scaleTableMultiplier)
{
  const knotsControls = c.knotsControls || [],
    count = exactDiv(knotsControls.length, 4, "D4n knotsControls/4"),
    knots = knotsFromControls(knotsControls, count, Number(c.oneOverKnotScale) || 0);
  const selector = (c.scaleOffsetTableEntries ?? 0) >>> 0,
    scales = new Float32Array([D4N_SCALE_TABLE[selector >> 0 & 0x0f] * scaleTableMultiplier, D4N_SCALE_TABLE[selector >> 4 & 0x0f] * scaleTableMultiplier, D4N_SCALE_TABLE[selector >> 8 & 0x0f] * scaleTableMultiplier, D4N_SCALE_TABLE[selector >> 12 & 0x0f] * scaleTableMultiplier]),
    offsets = new Float32Array([D4N_OFFSET_TABLE[selector >> 0 & 0x0f], D4N_OFFSET_TABLE[selector >> 4 & 0x0f], D4N_OFFSET_TABLE[selector >> 8 & 0x0f], D4N_OFFSET_TABLE[selector >> 12 & 0x0f]]);
  const controls = new Array(count * 4),
    quat = [0, 0, 0, 1];
  for (let i = 0; i < count; i++)
  {
    decoder(quat, knotsControls[count + i * 3], knotsControls[count + i * 3 + 1], knotsControls[count + i * 3 + 2], scales, offsets);
    controls[i * 4] = quat[0];
    controls[i * 4 + 1] = quat[1];
    controls[i * 4 + 2] = quat[2];
    controls[i * 4 + 3] = quat[3];
  }
  return {
    knots,
    controls,
    dimension: 4
  };
}
function decodeD4nK16uC15u(c)
{
  return decodeD4n(c, quatFromControl16, D4N_SCALE_TABLE_MULTIPLIER_16);
}
function quatFromControl8(out, a, b, c, scales, offsets)
{
  const swizzle1 = (b & 0x80) >> 6 | (c & 0x80) >> 7,
    swizzle2 = swizzle1 + 1 & 3,
    swizzle3 = swizzle2 + 1 & 3,
    swizzle4 = swizzle3 + 1 & 3;
  const dataA = (a & 0x7f) * scales[swizzle2] + offsets[swizzle2],
    dataB = (b & 0x7f) * scales[swizzle3] + offsets[swizzle3],
    dataC = (c & 0x7f) * scales[swizzle4] + offsets[swizzle4];
  let dataD = Math.sqrt(Math.max(0, 1 - (dataA * dataA + dataB * dataB + dataC * dataC)));
  if ((a & 0x80) !== 0)
  {
    dataD = -dataD;
  }
  out[swizzle2] = fr(dataA);
  out[swizzle3] = fr(dataB);
  out[swizzle4] = fr(dataC);
  out[swizzle1] = fr(dataD);
  return out;
}
function decodeD4nK8uC7u(c)
{
  return decodeD4n(c, quatFromControl8, D4N_SCALE_TABLE_MULTIPLIER_8);
}
function decodeD3K(c)
{
  const knotsControls = c.knotsControls || [],
    count = exactDiv(knotsControls.length, 4, "D3K knotsControls/4"),
    knots = knotsFromControlsTrunc(knotsControls, count, Number(c.oneOverKnotScaleTrunc) || 0),
    controlScales = c.controlScales || [],
    controlOffsets = c.controlOffsets || [],
    controls = new Array(count * 3);
  for (let i = 0; i < count; i++)
  {
    for (let x = 0; x < 3; x++)
    {
      controls[i * 3 + x] = fr(knotsControls[count + i * 3 + x] * controlScales[x] + controlOffsets[x]);
    }
  }
  return {
    knots,
    controls,
    dimension: 3
  };
}
function decodeD9I1(c)
{
  const knotsControls = c.knotsControls || [],
    count = exactDiv(knotsControls.length, 2, "D9I1 knotsControls/2"),
    knots = knotsFromControlsTrunc(knotsControls, count, Number(c.oneOverKnotScaleTrunc) || 0);
  const scale = Array.isArray(c.controlScales) ? c.controlScales[0] ?? 0 : c.controlScale || 0,
    offset = Array.isArray(c.controlOffsets) ? c.controlOffsets[0] ?? 0 : c.controlOffset || 0,
    controls = new Array(count * 9).fill(0);
  for (let i = 0; i < count; i++)
  {
    const s = fr(knotsControls[count + i] * scale + offset);
    controls[i * 9] = s;
    controls[i * 9 + 4] = s;
    controls[i * 9 + 8] = s;
  }
  return {
    knots,
    controls,
    dimension: 9
  };
}
function decodeD9I3(c)
{
  const knotsControls = c.knotsControls || [],
    count = exactDiv(knotsControls.length, 4, "D9I3 knotsControls/4"),
    knots = knotsFromControlsTrunc(knotsControls, count, Number(c.oneOverKnotScaleTrunc) || 0),
    controlScales = c.controlScales || [],
    controlOffsets = c.controlOffsets || [],
    controls = new Array(count * 9).fill(0);
  for (let i = 0; i < count; i++)
  {
    controls[i * 9] = fr(knotsControls[count + i * 3] * controlScales[0] + controlOffsets[0]);
    controls[i * 9 + 4] = fr(knotsControls[count + i * 3 + 1] * controlScales[1] + controlOffsets[1]);
    controls[i * 9 + 8] = fr(knotsControls[count + i * 3 + 2] * controlScales[2] + controlOffsets[2]);
  }
  return {
    knots,
    controls,
    dimension: 9
  };
}
function d3I1Controls(knotsControls, count, scales, offsets)
{
  const controls = new Array(count * 3);
  for (let i = 0; i < count; i++)
  {
    const value = knotsControls[count + i];
    controls[i * 3] = fr(value * scales[0] + offsets[0]);
    controls[i * 3 + 1] = fr(value * scales[1] + offsets[1]);
    controls[i * 3 + 2] = fr(value * scales[2] + offsets[2]);
  }
  return controls;
}
function decodeD3I1K32fC32f(c)
{
  const knotsControls = c.knotsControls || [],
    count = exactDiv(knotsControls.length, 2, "D3I1K32f knotsControls/2"),
    knots = new Array(count);
  for (let i = 0; i < count; i++)
  {
    knots[i] = fr(knotsControls[i]);
  }
  return {
    knots,
    controls: d3I1Controls(knotsControls, count, c.controlScales || [], c.controlOffsets || []),
    dimension: 3
  };
}
function decodeD3I1u(c)
{
  const knotsControls = c.knotsControls || [],
    count = exactDiv(knotsControls.length, 2, "D3I1 knotsControls/2"),
    knots = knotsFromControlsTrunc(knotsControls, count, Number(c.oneOverKnotScaleTrunc) || 0);
  return {
    knots,
    controls: d3I1Controls(knotsControls, count, c.controlScales || [], c.controlOffsets || []),
    dimension: 3
  };
}
function decodeDaK16uC16u(c)
{
  return decodeDaK(c);
}
function decodeDaK8uC8u(c)
{
  return decodeDaK(c);
}
function decodeD3K16uC16u(c)
{
  return decodeD3K(c);
}
function decodeD3K8uC8u(c)
{
  return decodeD3K(c);
}
function decodeD9I1K16uC16u(c)
{
  return decodeD9I1(c);
}
function decodeD9I1K8uC8u(c)
{
  return decodeD9I1(c);
}
function decodeD9I3K16uC16u(c)
{
  return decodeD9I3(c);
}
function decodeD9I3K8uC8u(c)
{
  return decodeD9I3(c);
}
function decodeD3I1K16uC16u(c)
{
  return decodeD3I1u(c);
}
function decodeD3I1K8uC8u(c)
{
  return decodeD3I1u(c);
}
