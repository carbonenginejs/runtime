import {
    D4N_OFFSET_TABLE,
    D4N_SCALE_TABLE,
    D4N_SCALE_TABLE_MULTIPLIER_16,
    FORMAT_D3_CONSTANT_32F,
    FORMAT_D3_K16U_C16U,
    FORMAT_D4_CONSTANT_32F,
    FORMAT_D4N_K16U_C15U,
    FORMAT_D9I1_K16U_C16U,
    FORMAT_D9I3_K16U_C16U,
    FORMAT_DA_CONSTANT_32F,
    FORMAT_DA_IDENTITY,
    FORMAT_DA_K16U_C16U,
    FORMAT_DA_K32F_C32F,
    decodeCurve,
    knotScaleFromTrunc
} from "./curves.js";
import {
    normalizeQuaternionSeries,
    quaternionAngularDifference
} from "../../cmf/core/utils/quaternion.js";

const DEFAULT_LINEAR_TOLERANCE = 0.1;
const DEFAULT_ORIENTATION_TOLERANCE = Math.PI / 1800;
const UINT16_MAX = 0xffff;
const CONTROL15_MAX = 0x7fff;
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

function candidateWithinTolerance(source, candidate, dimension, tolerance)
{
    const decoded = decodeCurve(candidate, dimension);
    for (let index = 1; index < decoded.knots.length; index++)
    {
        if ((source.degree | 0) <= 1 && decoded.knots[index] <= decoded.knots[index - 1]) return false;
    }
    for (let key = 0; key < source.knots.length; key++)
    {
        const offset = key * dimension;
        if (dimension === 4)
        {
            if (quaternionAngularDifference(
                source.controls.slice(offset, offset + 4),
                decoded.controls.slice(offset, offset + 4)
            ) > tolerance) return false;
            continue;
        }
        let squareError = 0;
        for (let component = 0; component < dimension; component++)
        {
            const difference = source.controls[offset + component] - decoded.controls[offset + component];
            squareError += difference * difference;
        }
        if (Math.sqrt(squareError) > tolerance) return false;
    }
    return true;
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
        if (Math.abs(controls[index] - controls[index % dimension]) > 1e-7) return false;
    }
    return true;
}

function isIdentity(controls, dimension)
{
    const identity = dimension === 3
        ? [ 0, 0, 0 ]
        : dimension === 4
            ? [ 0, 0, 0, 1 ]
            : dimension === 9
                ? [ 1, 0, 0, 0, 1, 0, 0, 0, 1 ]
                : null;
    return !!identity && identity.every((value, index) => Math.abs(controls[index] - value) <= 1e-7);
}

function constantCurve(curve, dimension)
{
    const controls = curve.controls.slice(0, dimension).map(Math.fround);
    if (isIdentity(controls, dimension))
    {
        return { format: FORMAT_DA_IDENTITY, degree: 0, dimension };
    }
    if (dimension === 3) return { format: FORMAT_D3_CONSTANT_32F, degree: 0, controls };
    if (dimension === 4) return { format: FORMAT_D4_CONSTANT_32F, degree: 0, controls };
    return { format: FORMAT_DA_CONSTANT_32F, degree: 0, controls };
}

function encodeDaK16(curve, dimension)
{
    const knots = knotPacking(curve.knots, UINT16_MAX);
    const controls = componentPacking(curve.controls, dimension, UINT16_MAX);
    return {
        format: FORMAT_DA_K16U_C16U,
        degree: curve.degree | 0,
        oneOverKnotScaleTrunc: knots.oneOverKnotScaleTrunc,
        controlScaleOffsets: [ ...controls.scales, ...controls.offsets ],
        knotsControls: [ ...knots.values, ...controls.values ]
    };
}

function encodeD3K16(curve)
{
    const knots = knotPacking(curve.knots, UINT16_MAX);
    const controls = componentPacking(curve.controls, 3, UINT16_MAX);
    return {
        format: FORMAT_D3_K16U_C16U,
        degree: curve.degree | 0,
        oneOverKnotScaleTrunc: knots.oneOverKnotScaleTrunc,
        controlScales: controls.scales,
        controlOffsets: controls.offsets,
        knotsControls: [ ...knots.values, ...controls.values ]
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

function encodeD9I16(curve, shape)
{
    const knots = knotPacking(curve.knots, UINT16_MAX);
    if (shape === "uniform")
    {
        const diagonal = [];
        for (let index = 0; index < curve.controls.length; index += 9) diagonal.push(curve.controls[index]);
        const packed = componentPacking(diagonal, 1, UINT16_MAX);
        return {
            format: FORMAT_D9I1_K16U_C16U,
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
    const packed = componentPacking(diagonal, 3, UINT16_MAX);
    return {
        format: FORMAT_D9I3_K16U_C16U,
        degree: curve.degree | 0,
        oneOverKnotScaleTrunc: knots.oneOverKnotScaleTrunc,
        controlScales: packed.scales,
        controlOffsets: packed.offsets,
        knotsControls: [ ...knots.values, ...packed.values ]
    };
}

function selectorForRange(minimum, maximum)
{
    let best = null;
    for (let selector = 0; selector < D4N_SCALE_TABLE.length; selector++)
    {
        const
            scale = Math.fround(D4N_SCALE_TABLE[selector] * D4N_SCALE_TABLE_MULTIPLIER_16),
            offset = D4N_OFFSET_TABLE[selector],
            end = CONTROL15_MAX * scale + offset,
            lower = Math.min(offset, end) - Math.abs(scale) * 0.51,
            upper = Math.max(offset, end) + Math.abs(scale) * 0.51;
        if (minimum < lower || maximum > upper) continue;
        if (!best || Math.abs(scale) < Math.abs(best.scale)) best = { selector, scale, offset };
    }
    return best;
}

function encodeD4n16(curve, tolerance)
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
        ? { selector: 7, scale: Math.fround(D4N_SCALE_TABLE[7] * D4N_SCALE_TABLE_MULTIPLIER_16), offset: D4N_OFFSET_TABLE[7] }
        : selectorForRange(range.minimum, range.maximum));
    if (selectors.some((selector) => !selector)) return null;

    const knots = floatKnotPacking(curve.knots, UINT16_MAX);
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
            return Math.max(0, Math.min(CONTROL15_MAX,
                Math.round((controls[controlOffset + component] - entry.offset) / entry.scale)));
        };
        packedControls[packedOffset] = quantize(swizzle2) |
            (controls[controlOffset + swizzle1] < 0 ? 0x8000 : 0);
        packedControls[packedOffset + 1] = quantize(swizzle3) | ((swizzle1 & 2) << 14);
        packedControls[packedOffset + 2] = quantize(swizzle4) | ((swizzle1 & 1) << 15);
    }

    const candidate = {
        format: FORMAT_D4N_K16U_C15U,
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
            decoded.controls.slice(offset, offset + 4)
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
    if (curve.knots.length === 1 || allControlsEqual(curve.controls, dimension))
    {
        return constantCurve(curve, dimension);
    }
    if (options.compressed === false)
    {
        return uncompressedCurve(curve);
    }
    if (dimension === 4)
    {
        const tolerance = options.orientationTolerance ?? DEFAULT_ORIENTATION_TOLERANCE;
        const packed = encodeD4n16(curve, tolerance);
        if (packed) return packed;
        const general = encodeDaK16(curve, dimension);
        return candidateWithinTolerance(curve, general, dimension, tolerance) ? general : uncompressedCurve(curve);
    }
    if (dimension === 3)
    {
        const candidate = encodeD3K16(curve);
        const tolerance = options.positionTolerance ?? DEFAULT_LINEAR_TOLERANCE;
        return candidateWithinTolerance(curve, candidate, dimension, tolerance) ? candidate : uncompressedCurve(curve);
    }
    if (dimension === 9)
    {
        const shape = scaleCurveShape(curve.controls);
        const tolerance = options.scaleShearTolerance ?? DEFAULT_LINEAR_TOLERANCE;
        if (shape)
        {
            const candidate = encodeD9I16(curve, shape);
            if (candidateWithinTolerance(curve, candidate, dimension, tolerance)) return candidate;
        }
        const general = encodeDaK16(curve, dimension);
        return candidateWithinTolerance(curve, general, dimension, tolerance) ? general : uncompressedCurve(curve);
    }
    const general = encodeDaK16(curve, dimension);
    const tolerance = options.tolerance ?? DEFAULT_LINEAR_TOLERANCE;
    return candidateWithinTolerance(curve, general, dimension, tolerance) ? general : uncompressedCurve(curve);
}

/** Return the default Carbon curve tolerances used by the pure-JS writer. */
export const GR2_CURVE_TOLERANCES = {
    position: DEFAULT_LINEAR_TOLERANCE,
    orientation: DEFAULT_ORIENTATION_TOLERANCE,
    scaleShear: DEFAULT_LINEAR_TOLERANCE
};
