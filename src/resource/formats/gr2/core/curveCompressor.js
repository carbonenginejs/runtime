import {
    D4N_OFFSET_TABLE,
    D4N_SCALE_TABLE,
    D4N_SCALE_TABLE_MULTIPLIER_16,
    D4N_SCALE_TABLE_MULTIPLIER_8,
    FORMAT_D3_CONSTANT_32F,
    FORMAT_D3I1_K16U_C16U,
    FORMAT_D3I1_K32F_C32F,
    FORMAT_D3I1_K8U_C8U,
    FORMAT_D3_K16U_C16U,
    FORMAT_D3_K8U_C8U,
    FORMAT_D4_CONSTANT_32F,
    FORMAT_D4N_K16U_C15U,
    FORMAT_D4N_K8U_C7U,
    FORMAT_D9I1_K16U_C16U,
    FORMAT_D9I1_K8U_C8U,
    FORMAT_D9I3_K16U_C16U,
    FORMAT_D9I3_K8U_C8U,
    FORMAT_DA_CONSTANT_32F,
    FORMAT_DA_IDENTITY,
    FORMAT_DA_K16U_C16U,
    FORMAT_DA_K32F_C32F,
    FORMAT_DA_K8U_C8U,
    decodeCurve,
    knotScaleFromTrunc,
    sampleDecodedCurve
} from "./curves.js";
import {
    maximumQuaternionLerpAngularDifference,
    normalizeQuaternion,
    normalizeQuaternionSeries,
    quaternionAngularDifference,
    QUATERNION_SEGMENT_SAMPLE_FRACTIONS
} from "../../cmf/core/utils/quaternion.js";

const DEFAULT_LINEAR_TOLERANCE = 0.1;
const DEFAULT_ORIENTATION_TOLERANCE = Math.PI / 1800;
const UINT16_MAX = 0xffff;
const UINT8_MAX = 0xff;
const CONTROL15_MAX = 0x7fff;
const CONTROL7_MAX = 0x7f;
const FLOAT_BITS = new DataView(new ArrayBuffer(4));

function assertCurve(curve, dimension)
{
    if (!curve || !Array.isArray(curve.knots) || !Array.isArray(curve.controls))
    {
        throw new TypeError("GR2 curve compression requires explicit knots and controls");
    }
    if (!Number.isInteger(dimension) || dimension <= 0)
    {
        throw new TypeError("GR2 curve compression requires a positive control dimension");
    }
    if (curve.controls.length !== curve.knots.length * dimension)
    {
        throw new Error("GR2 curve compression control count does not match its knots and dimension");
    }
    if (!curve.knots.length || curve.knots.some((value) => !Number.isFinite(value)) ||
        curve.controls.some((value) => !Number.isFinite(value)))
    {
        throw new Error("GR2 curve compression requires finite non-empty curve data");
    }
    if (curve.knots[0] < 0)
    {
        throw new Error("GR2 curve compression requires non-negative knots");
    }
    for (let index = 1; index < curve.knots.length; index++)
    {
        if (curve.knots[index] < curve.knots[index - 1])
        {
            throw new Error("GR2 curve compression requires non-decreasing knots");
        }
        if ((curve.degree | 0) <= 1 && curve.knots[index] === curve.knots[index - 1])
        {
            throw new Error("GR2 degree-zero and degree-one curves require distinct knots");
        }
    }
}

function uncompressedCurve(curve)
{
    return {
        format: FORMAT_DA_K32F_C32F,
        degree: curve.degree | 0,
        knots: curve.knots.map(Math.fround),
        controls: curve.controls.map(Math.fround)
    };
}

function alignedPayloadBytes(length, componentSize)
{
    return Math.ceil(length * componentSize / 4) * 4;
}

function estimatedCurveBytes(curve)
{
    const count = curve.knotsControls?.length ?? 0;
    switch (curve.format)
    {
        case FORMAT_DA_K32F_C32F:
            return 44 + curve.knots.length * 4 + curve.controls.length * 4;

        case FORMAT_DA_IDENTITY:
            return 4;

        case FORMAT_DA_CONSTANT_32F:
            return 24 + curve.controls.length * 4;

        case FORMAT_D3_CONSTANT_32F:
            return 16;

        case FORMAT_D4_CONSTANT_32F:
            return 20;

        case FORMAT_DA_K16U_C16U:
            return 44 + curve.controlScaleOffsets.length * 4 + alignedPayloadBytes(count, 2);

        case FORMAT_DA_K8U_C8U:
            return 44 + curve.controlScaleOffsets.length * 4 + alignedPayloadBytes(count, 1);

        case FORMAT_D4N_K16U_C15U:
            return 28 + alignedPayloadBytes(count, 2);

        case FORMAT_D4N_K8U_C7U:
            return 28 + alignedPayloadBytes(count, 1);

        case FORMAT_D3_K16U_C16U:
        case FORMAT_D3I1_K16U_C16U:
        case FORMAT_D9I3_K16U_C16U:
            return 48 + alignedPayloadBytes(count, 2);

        case FORMAT_D3_K8U_C8U:
        case FORMAT_D3I1_K8U_C8U:
        case FORMAT_D9I3_K8U_C8U:
            return 48 + alignedPayloadBytes(count, 1);

        case FORMAT_D9I1_K16U_C16U:
            return 32 + alignedPayloadBytes(count, 2);

        case FORMAT_D9I1_K8U_C8U:
            return 32 + alignedPayloadBytes(count, 1);

        case FORMAT_D3I1_K32F_C32F:
            return 48 + count * 4;

        default:
            return Infinity;
    }
}

function valuesWithinTolerance(source, decoded, dimension, tolerance, asQuaternion)
{
    if (asQuaternion)
    {
        return quaternionAngularDifference(
            normalizeQuaternion(source, "source GR2 orientation"),
            normalizeQuaternion(decoded, "decoded GR2 orientation")
        ) <= tolerance;
    }
    let squareError = 0;
    for (let component = 0; component < dimension; component++)
    {
        const difference = source[component] - decoded[component];
        squareError += difference * difference;
    }
    return Math.sqrt(squareError) <= tolerance;
}

function candidateWithinTolerance(source, candidate, dimension, tolerance, duration, asQuaternion)
{
    const decoded = decodeCurve(candidate, dimension);
    if (decoded.knots.length !== source.knots.length || decoded.controls.length !== source.controls.length)
    {
        return false;
    }
    for (let index = 1; index < decoded.knots.length; index++)
    {
        if ((source.degree | 0) <= 1 && decoded.knots[index] <= decoded.knots[index - 1]) return false;
    }
    for (let key = 0; key < source.knots.length; key++)
    {
        const offset = key * dimension;
        if (!valuesWithinTolerance(
            source.controls.slice(offset, offset + dimension),
            decoded.controls.slice(offset, offset + dimension),
            dimension,
            tolerance,
            asQuaternion
        )) return false;
    }

    const boundaries = [ 0, ...source.knots, ...decoded.knots ];
    if (Number.isFinite(duration) && duration >= 0) boundaries.push(duration);
    boundaries.sort((a, b) => a - b);
    const uniqueBoundaries = boundaries.filter((time, index) => index === 0 || time !== boundaries[index - 1]);
    const fractions = asQuaternion ? QUATERNION_SEGMENT_SAMPLE_FRACTIONS : [ 0.5 ];
    const sampleTimes = [];
    for (let index = 0; index < uniqueBoundaries.length; index++)
    {
        const time = uniqueBoundaries[index];
        if (index)
        {
            const previous = uniqueBoundaries[index - 1];
            for (const fraction of fractions) sampleTimes.push(previous + (time - previous) * fraction);
        }
        sampleTimes.push(time);
    }
    const sourceCurve = { ...source, dimension };
    const sourceValue = new Array(dimension);
    const decodedValue = new Array(dimension);
    const curveDuration = duration ?? source.knots[source.knots.length - 1];
    for (const time of sampleTimes)
    {
        sampleDecodedCurve(sourceValue, sourceCurve, time, false, curveDuration);
        sampleDecodedCurve(decodedValue, decoded, time, false, curveDuration);
        if (!valuesWithinTolerance(sourceValue, decodedValue, dimension, tolerance, asQuaternion)) return false;
    }
    if (asQuaternion && (source.degree | 0) === 1)
    {
        const sourceStart = new Array(4);
        const sourceEnd = new Array(4);
        const decodedStart = new Array(4);
        const decodedEnd = new Array(4);
        for (let index = 1; index < uniqueBoundaries.length; index++)
        {
            const start = uniqueBoundaries[index - 1];
            const end = uniqueBoundaries[index];
            sampleDecodedCurve(sourceStart, sourceCurve, start, false, curveDuration);
            sampleDecodedCurve(sourceEnd, sourceCurve, end, false, curveDuration);
            sampleDecodedCurve(decodedStart, decoded, start, false, curveDuration);
            sampleDecodedCurve(decodedEnd, decoded, end, false, curveDuration);
            try
            {
                if (maximumQuaternionLerpAngularDifference(
                    sourceStart, sourceEnd, decodedStart, decodedEnd
                ) > tolerance) return false;
            }
            catch
            {
                return false;
            }
        }
    }
    return true;
}

function selectSmallestCandidate(source, candidates, dimension, tolerance, duration, asQuaternion = false)
{
    let best = uncompressedCurve(source);
    let bestSize = estimatedCurveBytes(best);
    for (const candidate of candidates)
    {
        if (!candidate || !candidateWithinTolerance(
            source, candidate, dimension, tolerance, duration, asQuaternion
        )) continue;
        const size = estimatedCurveBytes(candidate);
        if (size < bestSize)
        {
            best = candidate;
            bestSize = size;
        }
    }
    return best;
}

function high16(value)
{
    FLOAT_BITS.setFloat32(0, Math.fround(value), true);
    return FLOAT_BITS.getUint16(2, true);
}

function knotPacking(knots, maximum)
{
    const last = knots[knots.length - 1];
    const requestedScale = last > 0 ? maximum / last : 1;
    let oneOverKnotScaleTrunc = high16(requestedScale);
    let scale = knotScaleFromTrunc(oneOverKnotScaleTrunc);
    if (!(scale > 0))
    {
        oneOverKnotScaleTrunc = high16(1);
        scale = 1;
    }
    return {
        oneOverKnotScaleTrunc,
        values: knots.map((value) => Math.max(0, Math.min(maximum, Math.floor(value * scale))))
    };
}

function floatKnotPacking(knots, maximum)
{
    const last = knots[knots.length - 1];
    const oneOverKnotScale = Math.fround(last > 0 ? maximum / last : 1);
    return {
        oneOverKnotScale,
        values: knots.map((value) => Math.max(0, Math.min(maximum, Math.floor(value * oneOverKnotScale))))
    };
}

function componentPacking(controls, dimension, maximum, components = dimension)
{
    const scales = new Array(components);
    const offsets = new Array(components);
    const values = new Array((controls.length / dimension) * components);

    for (let component = 0; component < components; component++)
    {
        let minimum = Infinity;
        let maximumValue = -Infinity;
        for (let index = component; index < controls.length; index += dimension)
        {
            minimum = Math.min(minimum, controls[index]);
            maximumValue = Math.max(maximumValue, controls[index]);
        }
        const scale = Math.fround(maximumValue === minimum ? 0 : (maximumValue - minimum) / maximum);
        scales[component] = scale;
        offsets[component] = Math.fround(minimum);
        for (let key = 0; key < controls.length / dimension; key++)
        {
            const value = controls[key * dimension + component];
            values[key * components + component] = scale === 0
                ? 0
                : Math.max(0, Math.min(maximum, Math.round((value - offsets[component]) / scale)));
        }
    }
    return { scales, offsets, values };
}

function allControlsEqual(controls, dimension)
{
    for (let index = dimension; index < controls.length; index++)
    {
        if (controls[index] !== controls[index % dimension]) return false;
    }
    return true;
}

function isIdentity(controls, identity)
{
    return Array.isArray(identity) && identity.length === controls.length &&
        identity.every((value, index) => controls[index] === value);
}

function constantCurve(curve, dimension, identity)
{
    const controls = curve.controls.slice(0, dimension).map(Math.fround);
    if (isIdentity(controls, identity))
    {
        return { format: FORMAT_DA_IDENTITY, degree: 0, dimension };
    }
    if (dimension === 3) return { format: FORMAT_D3_CONSTANT_32F, degree: 0, controls };
    if (dimension === 4) return { format: FORMAT_D4_CONSTANT_32F, degree: 0, controls };
    return { format: FORMAT_DA_CONSTANT_32F, degree: 0, controls };
}

function encodeDaK(curve, dimension, maximum, format)
{
    const knots = knotPacking(curve.knots, maximum);
    const controls = componentPacking(curve.controls, dimension, maximum);
    return {
        format,
        degree: curve.degree | 0,
        oneOverKnotScaleTrunc: knots.oneOverKnotScaleTrunc,
        controlScaleOffsets: [ ...controls.scales, ...controls.offsets ],
        knotsControls: [ ...knots.values, ...controls.values ]
    };
}

function encodeD3K(curve, maximum, format)
{
    const knots = knotPacking(curve.knots, maximum);
    const controls = componentPacking(curve.controls, 3, maximum);
    return {
        format,
        degree: curve.degree | 0,
        oneOverKnotScaleTrunc: knots.oneOverKnotScaleTrunc,
        controlScales: controls.scales,
        controlOffsets: controls.offsets,
        knotsControls: [ ...knots.values, ...controls.values ]
    };
}

function d3I1Shape(controls)
{
    const count = controls.length / 3;
    let dominant = 0;
    let dominantMinimum = Infinity;
    let dominantMaximum = -Infinity;
    let dominantRange = -Infinity;
    let minimumIndex = 0;
    let maximumIndex = 0;

    for (let component = 0; component < 3; component++)
    {
        let minimum = Infinity;
        let maximum = -Infinity;
        let lowIndex = 0;
        let highIndex = 0;
        for (let key = 0; key < count; key++)
        {
            const value = controls[key * 3 + component];
            if (value < minimum)
            {
                minimum = value;
                lowIndex = key;
            }
            if (value > maximum)
            {
                maximum = value;
                highIndex = key;
            }
        }
        const range = maximum - minimum;
        if (range > dominantRange)
        {
            dominant = component;
            dominantMinimum = minimum;
            dominantMaximum = maximum;
            dominantRange = range;
            minimumIndex = lowIndex;
            maximumIndex = highIndex;
        }
    }

    const span = dominantMaximum - dominantMinimum;
    if (!(span > 0)) return null;
    const offsets = controls.slice(minimumIndex * 3, minimumIndex * 3 + 3).map(Math.fround);
    const maximumControl = controls.slice(maximumIndex * 3, maximumIndex * 3 + 3);
    const scales = maximumControl.map((value, component) => Math.fround(value - offsets[component]));
    const parameters = new Array(count);
    for (let key = 0; key < count; key++)
    {
        parameters[key] = (controls[key * 3 + dominant] - dominantMinimum) / span;
    }
    return { offsets, scales, parameters };
}

function encodeD3I1Float(curve, shape)
{
    return {
        format: FORMAT_D3I1_K32F_C32F,
        degree: curve.degree | 0,
        controlScales: shape.scales,
        controlOffsets: shape.offsets,
        knotsControls: [ ...curve.knots.map(Math.fround), ...shape.parameters.map(Math.fround) ]
    };
}

function encodeD3I1(curve, shape, maximum, format)
{
    const knots = knotPacking(curve.knots, maximum);
    return {
        format,
        degree: curve.degree | 0,
        oneOverKnotScaleTrunc: knots.oneOverKnotScaleTrunc,
        controlScales: shape.scales.map(value => Math.fround(value / maximum)),
        controlOffsets: shape.offsets,
        knotsControls: [
            ...knots.values,
            ...shape.parameters.map(value => Math.max(0, Math.min(maximum, Math.round(value * maximum))))
        ]
    };
}

function scaleCurveShape(controls)
{
    let uniform = true;
    for (let index = 0; index < controls.length; index += 9)
    {
        for (const offDiagonal of [ 1, 2, 3, 5, 6, 7 ])
        {
            if (Math.abs(controls[index + offDiagonal]) > 1e-7) return null;
        }
        if (Math.abs(controls[index] - controls[index + 4]) > 1e-7 ||
            Math.abs(controls[index] - controls[index + 8]) > 1e-7)
        {
            uniform = false;
        }
    }
    return uniform ? "uniform" : "diagonal";
}

function encodeD9I(curve, shape, maximum, uniformFormat, diagonalFormat)
{
    const knots = knotPacking(curve.knots, maximum);
    if (shape === "uniform")
    {
        const diagonal = [];
        for (let index = 0; index < curve.controls.length; index += 9) diagonal.push(curve.controls[index]);
        const packed = componentPacking(diagonal, 1, maximum);
        return {
            format: uniformFormat,
            degree: curve.degree | 0,
            oneOverKnotScaleTrunc: knots.oneOverKnotScaleTrunc,
            controlScales: packed.scales,
            controlOffsets: packed.offsets,
            knotsControls: [ ...knots.values, ...packed.values ]
        };
    }

    const diagonal = [];
    for (let index = 0; index < curve.controls.length; index += 9)
    {
        diagonal.push(curve.controls[index], curve.controls[index + 4], curve.controls[index + 8]);
    }
    const packed = componentPacking(diagonal, 3, maximum);
    return {
        format: diagonalFormat,
        degree: curve.degree | 0,
        oneOverKnotScaleTrunc: knots.oneOverKnotScaleTrunc,
        controlScales: packed.scales,
        controlOffsets: packed.offsets,
        knotsControls: [ ...knots.values, ...packed.values ]
    };
}

function selectorForRange(minimum, maximum, multiplier, controlMaximum)
{
    let best = null;
    for (let selector = 0; selector < D4N_SCALE_TABLE.length; selector++)
    {
        const
            scale = Math.fround(D4N_SCALE_TABLE[selector] * multiplier),
            offset = D4N_OFFSET_TABLE[selector],
            end = controlMaximum * scale + offset,
            lower = Math.min(offset, end) - Math.abs(scale) * 0.51,
            upper = Math.max(offset, end) + Math.abs(scale) * 0.51;
        if (minimum < lower || maximum > upper) continue;
        if (!best || Math.abs(scale) < Math.abs(best.scale)) best = { selector, scale, offset };
    }
    return best;
}

function encodeD4n(curve, tolerance, maximum, controlMaximum, multiplier, format)
{
    const controls = normalizeQuaternionSeries(curve.controls.slice(), "GR2 orientation compression");
    const omitted = new Array(controls.length / 4);
    const ranges = Array.from({ length: 4 }, () => ({ minimum: Infinity, maximum: -Infinity }));

    for (let key = 0; key < omitted.length; key++)
    {
        const offset = key * 4;
        let largest = 0;
        for (let component = 1; component < 4; component++)
        {
            if (Math.abs(controls[offset + component]) > Math.abs(controls[offset + largest])) largest = component;
        }
        omitted[key] = largest;
        for (let component = 0; component < 4; component++)
        {
            if (component === largest) continue;
            ranges[component].minimum = Math.min(ranges[component].minimum, controls[offset + component]);
            ranges[component].maximum = Math.max(ranges[component].maximum, controls[offset + component]);
        }
    }

    const selectors = ranges.map((range) => range.minimum === Infinity
        ? { selector: 7, scale: Math.fround(D4N_SCALE_TABLE[7] * multiplier), offset: D4N_OFFSET_TABLE[7] }
        : selectorForRange(range.minimum, range.maximum, multiplier, controlMaximum));
    if (selectors.some((selector) => !selector)) return null;

    const knots = floatKnotPacking(curve.knots, maximum);
    const packedControls = new Array(omitted.length * 3);
    for (let key = 0; key < omitted.length; key++)
    {
        const
            controlOffset = key * 4,
            packedOffset = key * 3,
            swizzle1 = omitted[key],
            swizzle2 = (swizzle1 + 1) & 3,
            swizzle3 = (swizzle2 + 1) & 3,
            swizzle4 = (swizzle3 + 1) & 3;
        const quantize = component =>
        {
            const entry = selectors[component];
            return Math.max(0, Math.min(controlMaximum,
                Math.round((controls[controlOffset + component] - entry.offset) / entry.scale)));
        };
        const signBit = maximum === UINT8_MAX ? 0x80 : 0x8000;
        const selectorShift = maximum === UINT8_MAX ? 6 : 14;
        const lowSelectorShift = maximum === UINT8_MAX ? 7 : 15;
        packedControls[packedOffset] = quantize(swizzle2) |
            (controls[controlOffset + swizzle1] < 0 ? signBit : 0);
        packedControls[packedOffset + 1] = quantize(swizzle3) | ((swizzle1 & 2) << selectorShift);
        packedControls[packedOffset + 2] = quantize(swizzle4) | ((swizzle1 & 1) << lowSelectorShift);
    }

    const candidate = {
        format,
        degree: curve.degree | 0,
        scaleOffsetTableEntries: selectors.reduce((value, entry, component) =>
            value | (entry.selector << (component * 4)), 0),
        oneOverKnotScale: knots.oneOverKnotScale,
        knotsControls: [ ...knots.values, ...packedControls ]
    };
    const decoded = decodeCurve(candidate, 4);
    for (let key = 1; key < decoded.knots.length; key++)
    {
        if ((curve.degree | 0) <= 1 && decoded.knots[key] <= decoded.knots[key - 1]) return null;
    }
    for (let key = 0; key < omitted.length; key++)
    {
        const offset = key * 4;
        if (quaternionAngularDifference(
            controls.slice(offset, offset + 4),
            normalizeQuaternion(decoded.controls.slice(offset, offset + 4), "decoded GR2 orientation")
        ) > tolerance)
        {
            return null;
        }
    }
    return candidate;
}

/**
 * Compress one explicit Granny curve using browser-safe JavaScript only.
 *
 * The first writer pass keeps the authored degree and knot count. It performs
 * format packing and quantization, while curve fitting/reduction remains a
 * separate optimization that can use this function's decoder validation.
 */
export function compressGr2Curve(curve, dimension, options = {})
{
    assertCurve(curve, dimension);
    const asQuaternion = options.asQuaternion === true;
    if (asQuaternion && dimension !== 4)
    {
        throw new TypeError("GR2 quaternion compression requires dimension 4");
    }
    const source = asQuaternion
        ? {
            ...curve,
            controls: normalizeQuaternionSeries(curve.controls.slice(), "GR2 orientation compression")
        }
        : curve;
    if (source.knots.length === 1 || allControlsEqual(source.controls, dimension))
    {
        return constantCurve(source, dimension, options.identity);
    }
    if (options.compressed === false || (source.degree | 0) > 1)
    {
        return uncompressedCurve(source);
    }
    if (asQuaternion)
    {
        const tolerance = options.orientationTolerance ?? DEFAULT_ORIENTATION_TOLERANCE;
        return selectSmallestCandidate(source, [
            encodeD4n(source, tolerance, UINT8_MAX, CONTROL7_MAX,
                D4N_SCALE_TABLE_MULTIPLIER_8, FORMAT_D4N_K8U_C7U),
            encodeD4n(source, tolerance, UINT16_MAX, CONTROL15_MAX,
                D4N_SCALE_TABLE_MULTIPLIER_16, FORMAT_D4N_K16U_C15U)
        ], dimension, tolerance, options.duration, true);
    }
    if (dimension === 3)
    {
        const tolerance = options.positionTolerance ?? DEFAULT_LINEAR_TOLERANCE;
        const shape = d3I1Shape(source.controls);
        return selectSmallestCandidate(source, [
            shape && encodeD3I1(source, shape, UINT8_MAX, FORMAT_D3I1_K8U_C8U),
            shape && encodeD3I1(source, shape, UINT16_MAX, FORMAT_D3I1_K16U_C16U),
            encodeD3K(source, UINT8_MAX, FORMAT_D3_K8U_C8U),
            encodeD3K(source, UINT16_MAX, FORMAT_D3_K16U_C16U),
            shape && encodeD3I1Float(source, shape)
        ], dimension, tolerance, options.duration);
    }
    if (dimension === 9)
    {
        const shape = scaleCurveShape(source.controls);
        const tolerance = options.scaleShearTolerance ?? DEFAULT_LINEAR_TOLERANCE;
        return selectSmallestCandidate(source, [
            shape && encodeD9I(source, shape, UINT8_MAX,
                FORMAT_D9I1_K8U_C8U, FORMAT_D9I3_K8U_C8U),
            shape && encodeD9I(source, shape, UINT16_MAX,
                FORMAT_D9I1_K16U_C16U, FORMAT_D9I3_K16U_C16U),
            encodeDaK(source, dimension, UINT8_MAX, FORMAT_DA_K8U_C8U),
            encodeDaK(source, dimension, UINT16_MAX, FORMAT_DA_K16U_C16U)
        ], dimension, tolerance, options.duration);
    }
    const tolerance = options.tolerance ?? DEFAULT_LINEAR_TOLERANCE;
    return selectSmallestCandidate(source, [
        encodeDaK(source, dimension, UINT8_MAX, FORMAT_DA_K8U_C8U),
        encodeDaK(source, dimension, UINT16_MAX, FORMAT_DA_K16U_C16U)
    ], dimension, tolerance, options.duration);
}

/** Return the default Carbon curve tolerances used by the pure-JS writer. */
export const GR2_CURVE_TOLERANCES = {
    position: DEFAULT_LINEAR_TOLERANCE,
    orientation: DEFAULT_ORIENTATION_TOLERANCE,
    scaleShear: DEFAULT_LINEAR_TOLERANCE
};
