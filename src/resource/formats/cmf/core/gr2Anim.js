/*
 * GR2-shaped skeleton/animation conversion into CMF-native data.
 *
 * Input is the GR2 JSON shape emitted by the GR2 reader. Packed Granny curves
 * and already-decoded `{ knots, controls, dimension, degree }` curves are both
 * accepted without mutating the source graph.
 *
 * CMF curves support Step/Linear interpolation only, so Granny curves of
 * degree 2 are resampled (non-uniform quadratic B-spline evaluated via de
 * Boor) at a uniform rate; degree ≤ 1 knots/controls convert exactly.
 * CMF has no shear channel, so authored Granny shear is rejected rather than
 * discarded. Inverse bind matrices are rebuilt from the rest pose hierarchy
 * in the row-major, translation-in-elements-12..14 layout Granny uses.
 * Track-group layering, accumulation and loop metadata, text tracks, and
 * vector tracks that do not name a morph target are not carried into CMF.
 */

import { vec3, quat, mat4 } from "../../../../global/math/index.js";
import {
    decodeCurve,
    FORMAT_DA_KEYFRAMES_32F,
    sampleDecodedCurve
} from "../../gr2/core/curves.js";
import { composeCmfTransform, invertMatrix4, multiplyMatrix4 } from "./utils/matrix.js";
import { normalizeQuaternionSeries } from "./utils/quaternion.js";
import { morphAnimationTargetName } from "./utils/morph.js";

/**
 * Creates a GR2 conversion error.
 *
 * @param {string} message Error detail.
 * @returns {Error} The error, with code CJS_FORMAT_WRITE_ERROR.
 */
function convertError(message)
{
    const error = new Error(`CMF gr2 convert: ${message}`);
    error.code = "CJS_FORMAT_WRITE_ERROR";
    return error;
}

/**
 * Test for a GR2-shaped skeleton (bones as objects with name/parentIndex).
 *
 * @param {object} skeleton Candidate skeleton.
 * @returns {boolean} True when GR2-shaped.
 */
export function isGr2Skeleton(skeleton)
{
    return !!skeleton && Array.isArray(skeleton.bones) &&
        skeleton.bones.length > 0 &&
        typeof skeleton.bones[0] === "object" &&
        skeleton.bones[0] !== null &&
        typeof skeleton.bones[0].name === "string";
}

/**
 * Test for a GR2-shaped animation (carries trackGroups).
 *
 * @param {object} animation Candidate animation.
 * @returns {boolean} True when GR2-shaped.
 */
export function isGr2Animation(animation)
{
    return !!animation && Array.isArray(animation.trackGroups);
}

const IDENTITY_MATRIX = Object.freeze([ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 ]);
const FLOAT32_EPSILON = 2 ** -23;
const SCALE_SHEAR_RELATIVE_EPSILONS = 4;
const SCALE_SHEAR_OFF_DIAGONALS = Object.freeze([ 1, 2, 3, 5, 6, 7 ]);

/**
 * Tests a 3x3 scale/shear block for off-diagonal values beyond a small
 * relative Float32 tolerance.
 *
 * @param {ArrayLike<number>} values Flat scale/shear values.
 * @param {number} [offset=0] Start of the 3x3 block.
 * @returns {boolean} True when the block contains shear.
 */
function containsScaleShear(values, offset = 0)
{
    let magnitude = 1;
    for (let component = 0; component < 9; component++)
    {
        magnitude = Math.max(magnitude, Math.abs(values[offset + component] ?? 0));
    }
    const tolerance = SCALE_SHEAR_RELATIVE_EPSILONS * FLOAT32_EPSILON * magnitude;
    return SCALE_SHEAR_OFF_DIAGONALS.some(
        component => Math.abs(values[offset + component] ?? 0) > tolerance
    );
}

/**
 * Returns a GR2 bone's rest transform as position, rotation and diagonal scale.
 *
 * @param {object} bone GR2 bone with optional `position`, `orientation` and `scaleShear`.
 * @returns {{ position: Array<number>, rotation: Array<number>, scale: Array<number> }} The rest transform.
 * @throws {Error} When the rest scale/shear contains shear.
 */
function boneRestTransform(bone)
{
    const scaleShear = bone.scaleShear || [ 1, 0, 0, 0, 1, 0, 0, 0, 1 ];
    // Granny stores Float32 scale/shear. Transform decomposition leaves a few
    // relative ULPs off-diagonal even when the authored result is diagonal.
    if (containsScaleShear(scaleShear))
    {
        throw convertError(`bone "${bone.name || ""}" rest transform contains shear`);
    }
    return {
        position: (bone.position || [ 0, 0, 0 ]).slice(0, 3),
        rotation: (bone.orientation || [ 0, 0, 0, 1 ]).slice(0, 4),
        scale: [ scaleShear[0], scaleShear[4], scaleShear[8] ]
    };
}

/**
 * Convert a GR2-shaped skeleton into a CMF-native skeleton.
 *
 * @param {object} skeleton GR2 skeleton `{ name, bones: [{ name, parentIndex, position?, orientation?, scaleShear? }] }`.
 * @returns {import("./helpers.js").CmfSkeleton} CMF-native skeleton with rebuilt inverse bind matrices.
 */
export function convertGr2Skeleton(skeleton)
{
    const bones = skeleton.bones || [];
    const boneNames = bones.map(bone => bone.name || "");
    if (new Set(boneNames).size !== boneNames.length)
    {
        throw convertError(`skeleton "${skeleton.name || ""}" contains duplicate bone names`);
    }
    const worldTransforms = new Array(bones.length);
    const restTransforms = new Array(bones.length);
    const parents = new Uint32Array(bones.length); // alloc: returned parent indices follow the skeleton size.

    for (let i = 0; i < bones.length; i++)
    {
        const bone = bones[i];
        const parentIndex = typeof bone.parentIndex === "number" ? bone.parentIndex : -1;
        if (!Number.isInteger(parentIndex))
        {
            throw convertError(`bone ${i} (${bone.name}) has non-integer parent index ${parentIndex}`);
        }
        if (parentIndex >= i && parentIndex !== 0xffffffff)
        {
            throw convertError(`bone ${i} (${bone.name}) has forward parent index ${parentIndex}`);
        }
        parents[i] = parentIndex < 0 || parentIndex === 0xffffffff ? 0xffffffff : parentIndex;

        const rest = boneRestTransform(bone);
        restTransforms[i] = {
            position: vec3.clone(rest.position), // alloc: published geometry owns this value beyond the decode call.
            rotation: quat.clone(rest.rotation), // alloc: published geometry owns this value beyond the decode call.
            scale: vec3.clone(rest.scale) // alloc: published geometry owns this value beyond the decode call.
        };
        const local = composeCmfTransform(rest.position, rest.rotation, rest.scale);
        worldTransforms[i] = parents[i] === 0xffffffff
            ? local
            : multiplyMatrix4(local, worldTransforms[parents[i]]);
    }

    const suppliedInverseBinds = Array.isArray(skeleton.invBindTransforms)
        ? skeleton.invBindTransforms
        : [];
    if (suppliedInverseBinds.length && suppliedInverseBinds.length !== bones.length)
    {
        throw convertError(`skeleton "${skeleton.name || ""}" inverse bind count does not match its bones`);
    }
    const invBindTransforms = worldTransforms.map((world, index) =>
    {
        const supplied = suppliedInverseBinds[index];
        if (supplied === null || supplied === undefined) return mat4.clone(invertMatrix4(world)); // alloc: published geometry owns this value beyond the decode call.
        if ((!Array.isArray(supplied) && !ArrayBuffer.isView(supplied)) || supplied.length !== 16 || supplied.some(value => !Number.isFinite(value)))
        {
            throw convertError(`skeleton "${skeleton.name || ""}" inverse bind ${index} is not a finite matrix`);
        }
        return mat4.clone(supplied); // alloc: published geometry owns this value beyond the decode call.
    });

    return {
        name: skeleton.name || "",
        bones: boneNames,
        parents,
        restTransforms,
        invBindTransforms,
        boneMasks: gr2BoneMasks(bones)
    };
}

/**
 * CMF bone masks from a GR2 skeleton's bone extended data. Granny keeps a
 * track mask as a numeric extended-data member of that name on each bone
 * (e.g. `TrackMaskStance: 1`); Carbon's Granny path reads it with
 * GrannyExtractTrackMask, a bone without the member weighing 0
 * (Tr2GrannyAnimationLayer.cpp, ExtractTrackMask). The CMF form is one mask
 * per member name holding the bones that carry it, which
 * cmf::ExtractBoneWeights reads back the same way (animation.cpp:467-482).
 *
 * @param {Array<object>} bones GR2 bones, with `extendedData` where the file has it.
 * @returns {Array<import("./helpers.js").CmfBoneMask>} One mask per numeric extended-data member, in first-seen order.
 */
function gr2BoneMasks(bones)
{
    const masks = new Map();
    for (let index = 0; index < bones.length; index++)
    {
        const data = bones[index].extendedData;
        if (!data || typeof data !== "object") continue;
        for (const [ name, value ] of Object.entries(data))
        {
            if (typeof value !== "number" || !Number.isFinite(value)) continue;
            if (!masks.has(name)) masks.set(name, []);
            masks.get(name).push({ index, weight: value });
        }
    }
    return Array.from(masks, ([ name, weights ]) => ({ name, weights }));
}

/**
 * Evaluate a decoded Granny curve at `time` (clamped, non-cycling).
 *
 * Degree ≤ 0 steps, degree 1 lerps, degree 2 evaluates the non-uniform
 * quadratic B-spline via de Boor over the Granny knot convention, including
 * the reference evaluator's next-knot wrap at the final segment (the segment
 * after the last knot borrows the first knot advanced by `duration`).
 *
 * @param {object} curve Decoded curve `{ knots, controls, dimension, degree }`.
 * @param {number} time Sample time.
 * @param {Array<number>} out Output vector (dimension entries).
 * @param {number} [duration] Animation duration for the final-segment wrap;
 *   defaults to the last knot.
 * @returns {Array<number>} The `out` vector.
 */
export function evaluateDecodedCurve(curve, time, out, duration = 0)
{
    return sampleDecodedCurve(out, curve, time, false, duration, {
        keyframed: curve.keyframed === true || curve.format === FORMAT_DA_KEYFRAMES_32F
    });
}

/**
 * Rejects a scale/shear curve whose controls contain shear.
 *
 * @param {{ knots: Array<number>, controls: Array<number>, degree: number, dimension: number, preserveIdentity?: boolean, format?: number, keyframed?: boolean }} curve Decoded curve with 9-value controls.
 * @param {string} track Track name for errors.
 * @throws {Error} When any control contains shear.
 */
function validateScaleShearCurve(curve, track)
{
    for (let offset = 0; offset < curve.controls.length; offset += 9)
    {
        if (containsScaleShear(curve.controls, offset))
        {
            throw convertError(`track "${track}" scaleShear curve contains shear`);
        }
    }
}

/**
 * Collects a CMF- or GR2-shaped skeleton's bone names.
 *
 * @param {object} skeleton Skeleton with string or `{ name }` bones.
 * @returns {Set<string>} The bone names.
 */
function skeletonBoneNames(skeleton)
{
    return new Set((skeleton?.bones || []).map(bone =>
        (typeof bone === "string" ? bone : bone?.name || "")
    ));
}

/**
 * Lists a mesh's bone binding names.
 *
 * @param {object} mesh Shared mesh.
 * @returns {Array<string>} The binding names.
 */
function meshBoneBindingNames(mesh)
{
    return (mesh?.boneBindings || []).map(binding => binding?.name || "");
}

/**
 * Tests whether a mesh or any of its LODs carries BoneIndices data.
 *
 * @param {object} mesh Shared mesh.
 * @returns {boolean} True when blendIndice data is present.
 */
function meshHasBoneIndices(mesh)
{
    if ((mesh?.vertex?.blendIndice ?? []).length) return true;
    return (mesh?.lods ?? []).some(lod => (lod?.vertex?.blendIndice ?? []).length > 0);
}

/**
 * Tests whether every binding name is a bone of the skeleton.
 *
 * @param {Set<string>} names Skeleton bone names.
 * @param {Array<string>} bindings Binding names.
 * @returns {boolean} True when all bindings resolve.
 */
function skeletonContainsBindings(names, bindings)
{
    return bindings.every(name => names.has(name));
}

/**
 * Encodes numbers as little-endian Float32 bytes.
 *
 * @param {ArrayLike<number>} values Values.
 * @returns {Array<number>} The bytes.
 */
function floatBytes(values)
{
    return Array.from(new Uint8Array(new Float32Array(values).buffer));
}

/**
 * Tests whether flat quaternion values are all identity.
 *
 * @param {Array<number>} values Flat values.
 * @param {number} dimension Value dimension; only 4 can match.
 * @returns {boolean} True when every value is the identity quaternion.
 */
function isIdentityValue(values, dimension)
{
    const identity = dimension === 4 ? [ 0, 0, 0, 1 ] : dimension === 3 ? null : null;
    if (!identity) return false;
    return values.every((value, index) => Math.abs(value - identity[index % 4]) < 1e-7);
}

/**
 * Returns the scale diagonal of one key's 3x3 scale/shear controls.
 *
 * @param {ArrayLike<number>} controls Flat 9-value controls.
 * @param {number} knotIndex Key index.
 * @returns {Array<number>} The x, y, z scale.
 */
function diagonalFromScaleShear(controls, knotIndex)
{
    return [
        controls[knotIndex * 9],
        controls[knotIndex * 9 + 4],
        controls[knotIndex * 9 + 8]
    ];
}

/**
 * Decodes and validates one GR2 track curve.
 *
 * @param {object|null|undefined} curve Packed or decoded GR2 curve.
 * @param {number} expectedDimension Required value dimension.
 * @param {string} track Track name for errors.
 * @param {string} kind Curve kind for errors.
 * @returns {{ knots: Array<number>, controls: Array<number>, degree: number, dimension: number, preserveIdentity?: boolean, format?: number, keyframed?: boolean }|null} The decoded curve, or null when absent.
 * @throws {Error} When the curve cannot be decoded or is malformed.
 */
function decodeTrackCurve(curve, expectedDimension, track, kind)
{
    if (!curve) return null;
    const curveError = curve.error ?? curve.Error;
    if (curveError === "no curve data") return null;
    if (curveError)
    {
        throw convertError(`track "${track}" ${kind} curve: ${curveError}`);
    }
    let decoded;
    try
    {
        if (Array.isArray(curve.knots) && Array.isArray(curve.controls) && curve.dimension)
        {
            decoded = {
                knots: curve.knots.slice(),
                controls: curve.controls.slice(),
                degree: curve.degree | 0,
                dimension: curve.dimension | 0,
                preserveIdentity: curve.preserveIdentity === true
            };
        }
        else if (typeof curve.format === "number")
        {
            decoded = decodeCurve(curve, expectedDimension);
        }
        else
        {
            throw new Error("curve has neither decoded values nor a packed format");
        }
    }
    catch (error)
    {
        throw convertError(`track "${track}" ${kind} curve: ${error.message}`);
    }

    if (decoded.dimension !== expectedDimension)
    {
        throw convertError(
            `track "${track}" ${kind} curve dimension ${decoded.dimension} does not match ${expectedDimension}`
        );
    }
    if (!decoded.knots.length || !decoded.controls.length || decoded.controls.length % decoded.dimension)
    {
        throw convertError(`track "${track}" ${kind} curve decoded to invalid control data`);
    }
    if (decoded.knots.some(value => !Number.isFinite(value)) || decoded.controls.some(value => !Number.isFinite(value)))
    {
        throw convertError(`track "${track}" ${kind} curve contains non-finite values`);
    }
    for (let index = 1; index < decoded.knots.length; index++)
    {
        if (decoded.knots[index] < decoded.knots[index - 1] ||
            (decoded.degree <= 1 && decoded.knots[index] === decoded.knots[index - 1]))
        {
            throw convertError(`track "${track}" ${kind} curve knots have invalid ordering`);
        }
    }
    if (curve.format !== FORMAT_DA_KEYFRAMES_32F &&
        decoded.knots.length !== decoded.controls.length / decoded.dimension)
    {
        throw convertError(`track "${track}" ${kind} curve knot and control counts differ`);
    }

    return {
        ...decoded,
        format: curve.format,
        keyframed: curve.format === FORMAT_DA_KEYFRAMES_32F
    };
}

/**
 * Normalizes flat quaternion controls in place, rethrowing failures as
 * conversion errors.
 *
 * @param {Array<number>} values Flat quaternion controls.
 * @returns {Array<number>} The same array.
 * @throws {Error} When a quaternion has zero length.
 */
function normalizeQuaternionValues(values)
{
    try
    {
        return normalizeQuaternionSeries(values, "rotation curve");
    }
    catch (error)
    {
        throw convertError(error.message);
    }
}

/**
 * Converts a decoded Granny curve into a CMF Step or Linear curve,
 * resampling degree-2 curves.
 *
 * @param {{ knots: Array<number>, controls: Array<number>, degree: number, dimension: number, preserveIdentity?: boolean, format?: number, keyframed?: boolean }} curve Decoded curve.
 * @param {number} targetDimension Output value dimension.
 * @param {number} duration Animation duration.
 * @param {number} sampleRate Degree-2 resample rate in Hz.
 * @param {boolean} [quaternion=false] Normalizes values as quaternions.
 * @returns {import("./helpers.js").CmfAnimationCurve & { plainValues: Array<number> }} The CMF curve plus its unencoded values.
 */
function convertCurve(curve, targetDimension, duration, sampleRate, quaternion = false)
{
    const dimension = curve.dimension;
    const degree = curve.degree | 0;
    const knotCount = curve.knots.length;
    const controlCount = curve.controls.length / dimension;

    const extract = targetDimension === 3 && dimension === 9
        ? (index) => diagonalFromScaleShear(curve.controls, index)
        : (index) => curve.controls.slice(index * dimension, index * dimension + targetDimension);

    if (curve.keyframed)
    {
        const count = duration > 0 ? controlCount : 1;
        const knots = new Array(count);
        const values = [];
        for (let i = 0; i < count; i++)
        {
            knots[i] = i * duration / controlCount;
            values.push(...extract(i));
        }
        if (quaternion) normalizeQuaternionValues(values);
        return {
            valueDimension: targetDimension,
            interpolation: "Step",
            knotType: "Float32",
            valueType: "Float32",
            knotCount: count,
            knots: floatBytes(knots),
            values: floatBytes(values),
            plainValues: values
        };
    }

    if (knotCount <= 1 || controlCount <= 1)
    {
        const values = extract(0);
        if (quaternion) normalizeQuaternionValues(values);
        return {
            valueDimension: targetDimension,
            interpolation: "Step",
            knotType: "Float32",
            valueType: "Float32",
            knotCount: 1,
            knots: floatBytes([ curve.knots[0] ?? 0 ]),
            values: floatBytes(values),
            plainValues: values
        };
    }

    if (degree <= 1)
    {
        const values = [];
        for (let i = 0; i < knotCount; i++) values.push(...extract(i));
        if (quaternion) normalizeQuaternionValues(values);
        return {
            valueDimension: targetDimension,
            interpolation: degree === 0 ? "Step" : "Linear",
            knotType: "Float32",
            valueType: "Float32",
            knotCount,
            knots: floatBytes(curve.knots),
            values: floatBytes(values),
            plainValues: values
        };
    }

    // degree 2: adaptive resample — seed with the original knots plus a
    // uniform grid, recursively subdividing each interval until linear
    // interpolation tracks the quadratic within `tolerance`; intervals that
    // never converge are true discontinuities and snap to one float32 ULP
    // before the jump knot
    const start = Math.max(curve.knots[0], 0);
    // Quantized Granny degree-2 knots can land slightly beyond the authored
    // animation duration. Those keys shape the visible final segment but are
    // not themselves playable CMF times, so sample through duration and clip
    // the emitted linear approximation there.
    const end = duration > 0 ? duration : curve.knots[knotCount - 1];
    const span = Math.max(end - start, 0);
    const tolerance = 1e-3;
    const minStep = 4e-6;
    const maxDepth = 24;

    const seedTimes = new Set(curve.knots.map((knot) => Math.min(Math.max(knot, start), end)));
    const gridCount = Math.max(1, Math.ceil(span * sampleRate));
    for (let i = 0; i <= gridCount; i++) seedTimes.add(start + (span * i) / gridCount);
    const seeds = [ ...seedTimes ].sort((a, b) => a - b);

    const sample = new Array(dimension).fill(0);
    const evaluateAt = (time) =>
    {
        evaluateDecodedCurve(curve, time, sample, duration);
        return targetDimension === 3 && dimension === 9
            ? [ sample[0], sample[4], sample[8] ]
            : sample.slice(0, targetDimension);
    };

    const outTimes = [];
    const outValues = [];
    const emit = (time, value) =>
    {
        outTimes.push(time);
        outValues.push(value);
    };
    const fitsLinear = (v0, v1, actual) =>
    {
        if (quaternion)
        {
            const expected = [
                (v0[0] + v1[0]) / 2,
                (v0[1] + v1[1]) / 2,
                (v0[2] + v1[2]) / 2,
                (v0[3] + v1[3]) / 2
            ];
            normalizeQuaternionValues(expected);
            const normalizedActual = actual.slice();
            normalizeQuaternionValues(normalizedActual);
            const dot = Math.min(1, Math.abs(
                expected[0] * normalizedActual[0] + expected[1] * normalizedActual[1] +
                expected[2] * normalizedActual[2] + expected[3] * normalizedActual[3]
            ));
            return 2 * Math.acos(dot) <= tolerance;
        }
        for (let c = 0; c < targetDimension; c++)
        {
            if (Math.abs(actual[c] - (v0[c] + v1[c]) / 2) > tolerance) return false;
        }
        return true;
    };
    const refine = (t0, v0, t1, v1, depth) =>
    {
        if (t1 - t0 <= minStep || depth >= maxDepth)
        {
            let differs = false;
            for (let c = 0; c < targetDimension; c++)
            {
                if (Math.abs(v0[c] - v1[c]) > tolerance) differs = true;
            }
            if (differs)
            {
                // discontinuity at the right endpoint (an original knot):
                // hold the left value until one float32 ULP before the jump
                const snapped = float32UlpBefore(t1);
                if (snapped > t0) emit(snapped, v0.slice());
            }
            return;
        }
        const mid = (t0 + t1) / 2;
        const vm = evaluateAt(mid);
        if (fitsLinear(v0, v1, vm)) return;
        refine(t0, v0, mid, vm, depth + 1);
        emit(mid, vm);
        refine(mid, vm, t1, v1, depth + 1);
    };

    let previousValue = evaluateAt(seeds[0]);
    emit(seeds[0], previousValue);
    for (let i = 1; i < seeds.length; i++)
    {
        const value = evaluateAt(seeds[i]);
        refine(seeds[i - 1], previousValue, seeds[i], value, 0);
        emit(seeds[i], value);
        previousValue = value;
    }

    const quantizedTimes = [];
    const quantizedValues = [];
    for (let index = 0; index < outTimes.length; index++)
    {
        const time = Math.fround(outTimes[index]);
        if (quantizedTimes.length && time === quantizedTimes[quantizedTimes.length - 1])
        {
            quantizedValues[quantizedValues.length - 1] = outValues[index];
        }
        else
        {
            quantizedTimes.push(time);
            quantizedValues.push(outValues[index]);
        }
    }

    const values = [];
    for (const entry of quantizedValues) values.push(...entry);
    if (quaternion) normalizeQuaternionValues(values);

    return {
        valueDimension: targetDimension,
        interpolation: "Linear",
        knotType: "Float32",
        valueType: "Float32",
        knotCount: quantizedTimes.length,
        knots: floatBytes(quantizedTimes),
        values: floatBytes(values),
        plainValues: values
    };
}

const ulpScratch = new Float32Array(1);
const ulpScratchBits = new Uint32Array(ulpScratch.buffer);

/**
 * Returns the Float32 value one ULP below a positive value.
 *
 * @param {number} value Input.
 * @returns {number} The previous Float32, or the input when not positive.
 */
function float32UlpBefore(value)
{
    if (!(value > 0)) return value;
    ulpScratch[0] = value;
    ulpScratchBits[0] -= 1;
    return ulpScratch[0];
}

/**
 * Convert a GR2-shaped animation into a CMF-native animation.
 *
 * @param {object} animation GR2 animation with decoded curves.
 * @param {object} [options={}] Conversion options.
 * @param {number} [options.sampleRate=30] Degree-2 resample rate in Hz.
 * @param {Set<string>} [options.morphTargetNames] Vector track names kept as MorphTarget channels.
 * @param {boolean} [options.preserveIdentity] Keeps constant identity rotation and scale channels.
 * @param {boolean} [options.dropEmpty] Returns null when filtering leaves no channels.
 * @returns {import("./helpers.js").CmfAnimation|null} CMF-native animation with channels and curves, or null when requested.
 */
export function convertGr2Animation(animation, options = {})
{
    const sampleRate = options.sampleRate ?? 30;
    const morphTargetNames = options.morphTargetNames;
    const duration = animation.duration ?? 0;
    if (!Number.isFinite(sampleRate) || sampleRate <= 0)
    {
        throw convertError("sampleRate must be a positive finite number");
    }
    if (!Number.isFinite(duration) || duration <= 0)
    {
        throw convertError(`animation "${animation.name || ""}" duration must be positive and finite`);
    }
    const channels = [];
    const curves = [];
    const channelKeys = new Set();

    const addChannel = (target, targetType, decoded, targetDimension, tolerateDuplicate = false) =>
    {
        // Granny's truncated reciprocal knot scale can decode the terminal
        // knot slightly past a positive animation duration. Carbon treats the
        // duration as the playable boundary and CMF permits such finite,
        // ascending knots, so preserve them for exact degree-0/1 conversion.
        // A curve that starts outside the playable interval is still invalid;
        // zero-duration curves cannot carry a later knot.
        if (!decoded.keyframed && (
            decoded.knots[0] < 0 ||
            decoded.knots[0] > duration ||
            duration === 0 && decoded.knots[decoded.knots.length - 1] > duration
        ))
        {
            throw convertError(`animation "${animation.name || ""}" ${targetType} target "${target}" has keys outside its duration`);
        }
        if (decoded.keyframed && duration === 0 && decoded.controls.length > decoded.dimension)
        {
            throw convertError(`animation "${animation.name || ""}" keyframed target "${target}" has multiple controls at zero duration`);
        }
        const key = `${targetType}\0${target}`;
        if (channelKeys.has(key))
        {
            // A repeated name is a genuine conflict for a bone channel: two
            // curves would drive one bone and neither wins.
            //
            // It is NORMAL for a Granny vector track. Those carry rig driver
            // channels - real ship hulls ship `ikRotateX` sixteen times and
            // `blendAim1` twice, one per driven bone - and the name is a
            // channel label rather than a key. Carbon simply scans for the
            // first match and returns
            // (trinity/trinity/Curves/Tr2GrannyVectorTrack.cpp:41-54), never
            // reaching the later ones, so keeping the first reproduces its
            // behaviour exactly.
            //
            // Rejecting them cost five real hull variants - cc1_t1, conf5_t1,
            // mc2_t2c, mf2_t1 and mf2_t2b, each with its _lowdetail sibling -
            // which could not be decoded at all.
            if (tolerateDuplicate) return;
            throw convertError(`animation "${animation.name || ""}" contains duplicate ${targetType} target "${target}"`);
        }
        const converted = convertCurve(
            decoded,
            targetDimension,
            duration,
            sampleRate,
            targetType === "BoneRotation"
        );
        // constant identity channels carry no information
        if (!options.preserveIdentity && !decoded.preserveIdentity && converted.knotCount === 1 &&
            targetType === "BoneRotation" && isIdentityValue(converted.plainValues, 4)) return;
        if (!options.preserveIdentity && !decoded.preserveIdentity && converted.knotCount === 1 && targetType === "BoneScale" &&
            converted.plainValues.every((value) => Math.abs(value - 1) < 1e-7)) return;
        delete converted.plainValues;
        channelKeys.add(key);
        channels.push({ target, targetType, curveIndex: curves.length });
        curves.push(converted);
    };

    for (const trackGroup of animation.trackGroups || [])
    {
        for (const track of trackGroup.transformTracks || [])
        {
            const position = decodeTrackCurve(track.position, 3, track.name, "position");
            const orientation = decodeTrackCurve(track.orientation, 4, track.name, "orientation");
            const scaleShear = decodeTrackCurve(track.scaleShear, 9, track.name, "scaleShear");

            if (position) addChannel(track.name, "BonePosition", position, 3);
            if (orientation) addChannel(track.name, "BoneRotation", orientation, 4);
            if (scaleShear)
            {
                validateScaleShearCurve(scaleShear, track.name);
                addChannel(track.name, "BoneScale", scaleShear, 3);
            }
        }

        for (const track of trackGroup.vectorTracks || [])
        {
            // A Granny vector track is a generic numeric-property carrier.
            // Only a name resolving to geometry in this conversion is a CMF
            // MorphTarget channel; Maya bind/camera metadata is not.
            if (morphTargetNames && !morphTargetNames.has(track.name ?? "")) continue;
            const dimension = Number(track.dimension ?? track.valueCurve?.dimension);
            if (dimension !== 1)
            {
                throw convertError(`vector track "${track.name || ""}" has unsupported dimension ${dimension}`);
            }
            const value = decodeTrackCurve(track.valueCurve, 1, track.name, "value");
            if (value) addChannel(track.name, "MorphTarget", value, 1, true);
        }
    }

    if (!channels.length)
    {
        if (options.dropEmpty) return null;
        throw convertError(`animation "${animation.name || ""}" contains no non-identity channels`);
    }

    return {
        name: animation.name || "",
        channels,
        curves,
        duration
    };
}

/**
 * Convert any GR2-shaped skeletons/animations in a shared root, leaving
 * CMF-native ones untouched.
 *
 * GR2 files frequently carry their skeleton under `models[].skeleton` rather
 * than a root skeleton list. Model skeletons are unioned by object identity.
 * Model mesh bindings select among skeletons compatible with the mesh's bone
 * palette; a unique palette match resolves otherwise-unbound skinned meshes.
 *
 * @param {object} root Shared geometry root.
 * @param {object} [options={}] Conversion options.
 * @param {number} [options.sampleRate] Degree-2 resample rate in Hz.
 * @returns {object} Root with converted skeletons/animations.
 */
export function convertGr2SkeletonsAndAnimations(root, options = {})
{
    const projectedFromGr2 = Number.isInteger(root?.grannyFileFormatRevision);
    const sourceSkeletons = Array.isArray(root.skeletons) ? [ ...root.skeletons ] : [];
    const skeletonIndexByIdentity = new Map();
    for (let index = 0; index < sourceSkeletons.length; index++)
    {
        const skeleton = sourceSkeletons[index];
        if (skeleton && typeof skeleton === "object" && !skeletonIndexByIdentity.has(skeleton))
        {
            skeletonIndexByIdentity.set(skeleton, index);
        }
    }

    const models = Array.isArray(root.models) ? root.models : [];
    const modelSkeletonIndices = new Array(models.length).fill(null);
    for (let modelIndex = 0; modelIndex < models.length; modelIndex++)
    {
        const skeleton = models[modelIndex]?.skeleton;
        if (!isGr2Skeleton(skeleton)) continue;
        if (!skeletonIndexByIdentity.has(skeleton))
        {
            skeletonIndexByIdentity.set(skeleton, sourceSkeletons.length);
            sourceSkeletons.push(skeleton);
        }
        modelSkeletonIndices[modelIndex] = skeletonIndexByIdentity.get(skeleton);
    }

    const sourceMeshes = Array.isArray(root.meshes) ? root.meshes : [];
    const boneNamesBySkeleton = sourceSkeletons.map(skeletonBoneNames);
    const bindingNamesByMesh = sourceMeshes.map(meshBoneBindingNames);
    const compatibleSkeletonsByMesh = bindingNamesByMesh.map(bindings =>
    {
        if (!bindings.length) return [];
        const compatible = [];
        for (let skeletonIndex = 0; skeletonIndex < boneNamesBySkeleton.length; skeletonIndex++)
        {
            if (skeletonContainsBindings(boneNamesBySkeleton[skeletonIndex], bindings))
            {
                compatible.push(skeletonIndex);
            }
        }
        return compatible;
    });
    const modelAssignments = new Array(sourceMeshes.length).fill(null);
    const assignmentModels = new Array(sourceMeshes.length).fill(null);
    for (let modelIndex = 0; modelIndex < models.length; modelIndex++)
    {
        const bindings = (Array.isArray(models[modelIndex]?.meshBindings) || ArrayBuffer.isView(models[modelIndex]?.meshBindings))
            ? models[modelIndex].meshBindings
            : [];
        for (let bindingIndex = 0; bindingIndex < bindings.length; bindingIndex++)
        {
            const meshIndex = bindings[bindingIndex];
            // The GR2 JSON emitter uses -1 when a model binding points at a
            // mesh omitted from this file, as EVE low-detail hull files do.
            if (meshIndex === -1) continue;
            if (!Number.isInteger(meshIndex) || meshIndex < 0 || meshIndex >= sourceMeshes.length)
            {
                throw convertError(
                    `model ${modelIndex} mesh binding ${bindingIndex} references mesh ${meshIndex} outside 0..${sourceMeshes.length - 1}`
                );
            }
            const skeletonIndex = modelSkeletonIndices[modelIndex];
            if (skeletonIndex === null) continue;
            // A model list expresses scene membership, not a usable skin by
            // itself. CMF can bind only a skeleton containing every palette
            // name, so stale or duplicate incompatible model claims are not
            // candidates for this mesh.
            if (bindingNamesByMesh[meshIndex].length &&
                !compatibleSkeletonsByMesh[meshIndex].includes(skeletonIndex)) continue;
            if (modelAssignments[meshIndex] !== null && modelAssignments[meshIndex] !== skeletonIndex)
            {
                throw convertError(
                    `mesh ${meshIndex} is bound to skeleton ${modelAssignments[meshIndex]} by model ${assignmentModels[meshIndex]} ` +
                    `and skeleton ${skeletonIndex} by model ${modelIndex}`
                );
            }
            modelAssignments[meshIndex] = skeletonIndex;
            assignmentModels[meshIndex] = modelIndex;
        }
    }

    const meshes = sourceMeshes.map((mesh, meshIndex) =>
    {
        const authored = mesh?.skeleton;
        const assigned = modelAssignments[meshIndex];
        const bindings = bindingNamesByMesh[meshIndex];
        const compatible = compatibleSkeletonsByMesh[meshIndex];
        let skeleton = authored;
        if (authored !== null && authored !== undefined)
        {
            if (!Number.isInteger(authored) || authored < 0 || authored >= sourceSkeletons.length)
            {
                throw convertError(`mesh ${meshIndex} has skeleton index ${authored} outside 0..${sourceSkeletons.length - 1}`);
            }
            if (bindings.length && !compatible.includes(authored))
            {
                throw convertError(`mesh ${meshIndex} declares skeleton ${authored} which does not contain all bone bindings`);
            }
            if (assigned !== null && assigned !== authored)
            {
                throw convertError(
                    `mesh ${meshIndex} declares skeleton ${authored} but model ${assignmentModels[meshIndex]} binds skeleton ${assigned}`
                );
            }
        }
        else if (assigned !== null)
        {
            skeleton = assigned;
        }
        else if (bindings.length)
        {
            if (compatible.length === 1) skeleton = compatible[0];
            else if (compatible.length > 1)
            {
                throw convertError(`mesh ${meshIndex} has bone bindings but no unambiguous compatible skeleton`);
            }
            else if (sourceSkeletons.length)
            {
                throw convertError(`mesh ${meshIndex} has bone bindings but no compatible skeleton`);
            }
        }
        let converted = skeleton === authored ? mesh : { ...mesh, skeleton };
        if (projectedFromGr2 && bindings.length && !meshHasBoneIndices(mesh))
        {
            // Granny permits a rigid mesh to carry a one-bone palette even
            // though its vertices have no BoneIndices. Carbon's published CMF
            // keeps the model/skeleton relationship but omits that palette;
            // CMF requires BoneBindings and BoneIndices to appear together.
            converted = { ...converted, boneBindings: [] };
        }
        return converted;
    });

    const skeletons = sourceSkeletons.map((skeleton) =>
        (isGr2Skeleton(skeleton) ? convertGr2Skeleton(skeleton) : skeleton));
    // Compare channel names, not mesh names: Carbon resolves SmileShape to
    // the Smile channel. Filtering the raw names drops valid morph-only clips.
    const morphTargetNames = new Set(sourceMeshes.flatMap(mesh =>
        (mesh?.morphTargets ?? []).map(target => morphAnimationTargetName(target?.name ?? ""))));
    // Carbon's Granny-to-CMF publishing path writes one P/R/S channel for
    // every authored transform track, including constant identity components.
    const animationOptions = {
        ...options,
        morphTargetNames,
        preserveIdentity: projectedFromGr2,
        dropEmpty: projectedFromGr2
    };
    const animations = (root.animations || []).map((animation) =>
        (isGr2Animation(animation) ? convertGr2Animation(animation, animationOptions) : animation)).filter(Boolean);

    const boneTargetCounts = new Map();
    for (const skeleton of skeletons)
    {
        for (const name of skeleton.bones ?? [])
        {
            boneTargetCounts.set(name, (boneTargetCounts.get(name) ?? 0) + 1);
        }
    }
    for (const animation of animations)
    {
        for (const channel of animation.channels ?? [])
        {
            if (channel.targetType !== "MorphTarget" && (boneTargetCounts.get(channel.target) ?? 0) > 1)
            {
                throw convertError(`bone animation target "${channel.target}" is ambiguous across skeletons`);
            }
        }
    }

    return { ...root, meshes, skeletons, animations };
}
