/*
 * Our scalar JavaScript port of libsquish 1.15 (alpha, colourset, colourblock,
 * singlecolourfit, rangefit, clusterfit, maths and simd_float).
 * Archive SHA256: 628796eeba608866183a61d080d46967c9dda6723bc0a3ec52324c85d2147269.
 * Source: trinity/trinity/Tr2DxtCompressor.cpp:644-675,832-920 (squish caller).
 * Copyright (c) 2006 Simon Brown <si@sjbrown.co.uk>
 * Copyright (c) 2007 Ignacio Castano <icastano@nvidia.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import { lookup_5_3, lookup_6_3, lookup_5_4, lookup_6_4 } from "./squishSingleColourLookup.js";

// Carbon's Windows libsquish build is scalar. Round at every float operation,
// including intermediate products: JavaScript otherwise evaluates in double.
const f = Math.fround;
const FLT_MAX = 3.4028234663852886e38;
const GRID = [31, 63, 31];
const GRID_RCP = [f(1 / 31), f(1 / 63), f(1 / 31)];

/** Scalar simd_float addition, retaining each component's float precision. */
function add(a, b)
{
    return a.map((x, i) => f(x + b[i]));
}

/** Scalar simd_float subtraction. */
function sub(a, b)
{
    return a.map((x, i) => f(x - b[i]));
}

/** Scalar simd_float component multiplication. */
function mul(a, b)
{
    return a.map((x, i) => f(x * b[i]));
}

/** Scalar multiplication with a previously rounded float constant. */
function scale(a, s)
{
    return a.map(x => f(x * s));
}

/** Non-fused MultiplyAdd from simd_float.h. */
function multiplyAdd(a, b, c)
{
    return add(mul(a, b), c);
}

/** Three-component Dot from maths.h, with left-to-right addition. */
function dot(a, b)
{
    return f(f(f(a[0] * b[0]) + f(a[1] * b[1])) + f(a[2] * b[2]));
}

/** std::max retains its first argument for an unordered comparison. */
function max(a, b)
{
    return a < b ? b : a;
}

/** Clamp and round endpoints to the 565 grid (RangeFit/ClusterFit). */
function quantize(a)
{
    return GRID.map((g, i) =>
    {
        const positive = max(0, a[i]);
        const clamped = positive < 1 ? positive : 1;
        return f(Math.trunc(f(f(g * clamped) + 0.5)) * GRID_RCP[i]);
    });
}

/** FloatToInt from colourblock.cpp, including float rounding before the cast. */
function floatToInt(a, limit)
{
    return Math.max(0, Math.min(limit, Math.trunc(f(a + 0.5))));
}

/** ColourSet without alpha weighting, matching Carbon's uniform metric call. */
function colourSet(rgba, mask, dxt1)
{
    const points = [], weights = [], remap = [];
    let transparent = false;
    for (let i = 0; i < 16; i++)
    {
        if (!(mask & (1 << i)) || (dxt1 && rgba[4 * i + 3] < 128))
        {
            remap[i] = -1;
            if ((mask & (1 << i)) && dxt1) transparent = true;
            continue;
        }
        let index = -1;
        for (let j = 0; j < i; j++)
        {
            if (remap[j] >= 0 && rgba[4 * i] === rgba[4 * j] &&
                rgba[4 * i + 1] === rgba[4 * j + 1] && rgba[4 * i + 2] === rgba[4 * j + 2])
            {
                index = remap[j];
                break;
            }
        }
        if (index < 0)
        {
            index = points.length;
            points.push([f(rgba[4 * i] / 255), f(rgba[4 * i + 1] / 255), f(rgba[4 * i + 2] / 255)]);
            weights.push(1);
        }
        else weights[index] = f(weights[index] + 1);
        remap[i] = index;
    }
    for (let i = 0; i < weights.length; i++) weights[i] = f(Math.sqrt(weights[i]));
    return { points, weights, remap, transparent };
}

/** ComputeWeightedCovariance and the active eight-step power iteration. */
function principleComponent(set)
{
    let total = 0, centroid = [0, 0, 0];
    for (let i = 0; i < set.points.length; i++)
    {
        total = f(total + set.weights[i]);
        centroid = add(centroid, scale(set.points[i], set.weights[i]));
    }
    if (total > 1.1920928955078125e-7) centroid = scale(centroid, f(1 / total));
    const covariance = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < set.points.length; i++)
    {
        const a = sub(set.points[i], centroid), b = scale(a, set.weights[i]);
        const products = [f(a[0] * b[0]), f(a[0] * b[1]), f(a[0] * b[2]),
            f(a[1] * b[1]), f(a[1] * b[2]), f(a[2] * b[2])];
        for (let j = 0; j < 6; j++) covariance[j] = f(covariance[j] + products[j]);
    }
    const row0 = [covariance[0], covariance[1], covariance[2]];
    const row1 = [covariance[1], covariance[3], covariance[4]];
    const row2 = [covariance[2], covariance[4], covariance[5]];
    let v = [1, 1, 1];
    for (let i = 0; i < 8; i++)
    {
        const w = add(scale(row2, v[2]), add(scale(row1, v[1]), scale(row0, v[0])));
        v = scale(w, f(1 / max(w[0], max(w[1], w[2]))));
    }
    return v;
}

/** WriteColourBlock3/4, including endpoint swaps and equal-endpoint indices. */
function writeColourBlock(start, end, indices, set, three, output, offset)
{
    const packed = a => (floatToInt(f(31 * a[0]), 31) << 11) |
        (floatToInt(f(63 * a[1]), 63) << 5) | floatToInt(f(31 * a[2]), 31);
    let a = packed(start), b = packed(end);
    const swap = three ? a > b : a < b;
    const equal = !three && a === b;
    if (swap) [a, b] = [b, a];
    output[offset] = a & 255;
    output[offset + 1] = a >> 8;
    output[offset + 2] = b & 255;
    output[offset + 3] = b >> 8;
    for (let y = 0; y < 4; y++)
    {
        let bits = 0;
        for (let x = 0; x < 4; x++)
        {
            const remap = set.remap[4 * y + x];
            let index = remap < 0 ? 3 : indices[remap];
            if (equal) index = 0;
            else if (swap && (!three || index < 2)) index ^= 1;
            bits |= index << (2 * x);
        }
        output[offset + 4 + y] = bits;
    }
}

/** SingleColourFit with the exact 1.15 integer lookup tables. */
function singleColourFit(set, three, best, output, offset)
{
    const tables = three ? [lookup_5_3, lookup_6_3, lookup_5_3] : [lookup_5_4, lookup_6_4, lookup_5_4];
    let error = 0x7fffffff, start, end, index;
    for (let candidate = 0; candidate < 2; candidate++)
    {
        let sum = 0;
        const s = [], e = [];
        for (let c = 0; c < 3; c++)
        {
            const at = 6 * floatToInt(f(255 * set.points[0][c]), 255) + 3 * candidate;
            const table = tables[c];
            sum += table[at + 2] * table[at + 2];
            s[c] = f(table[at] / GRID[c]);
            e[c] = f(table[at + 1] / GRID[c]);
        }
        if (sum < error)
        {
            error = sum; start = s; end = e; index = 2 * candidate;
        }
    }
    if (error < best)
    {
        writeColourBlock(start, end, [index], set, three, output, offset);
        return error;
    }
    return best;
}

/** RangeFit using unweighted point error, as in the native implementation. */
function rangeFit(set, three, best, output, offset)
{
    const axis = principleComponent(set);
    let start = [0, 0, 0], end = [0, 0, 0];
    if (set.points.length)
    {
        start = end = set.points[0];
        let low = dot(start, axis), high = low;
        for (let i = 1; i < set.points.length; i++)
        {
            const value = dot(set.points[i], axis);
            if (value < low) { start = set.points[i]; low = value; }
            else if (value > high) { end = set.points[i]; high = value; }
        }
    }
    start = quantize(start); end = quantize(end);
    const codes = [start, end];
    if (three) codes.push(add(scale(start, 0.5), scale(end, 0.5)));
    else
    {
        codes.push(add(scale(start, f(2 / 3)), scale(end, f(1 / 3))));
        codes.push(add(scale(start, f(1 / 3)), scale(end, f(2 / 3))));
    }
    const indices = [];
    let error = 0;
    for (const point of set.points)
    {
        let distance = FLT_MAX, index = 0;
        for (let j = 0; j < codes.length; j++)
        {
            const delta = sub(point, codes[j]), d = dot(delta, delta);
            if (d < distance) { distance = d; index = j; }
        }
        indices.push(index);
        error = f(error + distance);
    }
    if (error < best)
    {
        writeColourBlock(start, end, indices, set, three, output, offset);
        return error;
    }
    return best;
}

/** ClusterFit least-squares solution and error, with scalar non-fused math. */
function solve(alphax, betax, alphabeta)
{
    const alpha2 = alphax[3], beta2 = betax[3];
    const factor = f(1 / f(f(alpha2 * beta2) - f(alphabeta * alphabeta)));
    const a = quantize(scale(sub(scale(alphax, beta2), scale(betax, alphabeta)), factor));
    const b = quantize(scale(sub(scale(betax, alpha2), scale(alphax, alphabeta)), factor));
    let error = 0;
    for (let c = 0; c < 3; c++)
    {
        const e1 = f(f(f(a[c] * a[c]) * alpha2) + f(f(b[c] * b[c]) * beta2));
        const e2 = f(f(f(a[c] * b[c]) * alphabeta) - f(a[c] * alphax[c]));
        const e3 = f(e2 - f(b[c] * betax[c]));
        const e4 = f(f(2 * e3) + e1);
        error = c === 0 ? e4 : f(error + e4);
    }
    return { a, b, error };
}

/** ClusterFit stable ordering, exhaustive cluster boundaries and eight iterations. */
function clusterFit(set, three, best, iterative, output, offset)
{
    const count = set.points.length, orders = [];
    let axis = principleComponent(set), bestIteration = 0, winning = null;
    let bestError = best;
    for (let iteration = 0; iteration < (iterative ? 8 : 1); iteration++)
    {
        const order = set.points.map((point, index) => ({ index, dp: dot(point, axis) }));
        // Native insertion sort is stable; NaN comparisons deliberately don't move.
        for (let i = 0; i < count; i++)
        {
            for (let j = i; j > 0 && order[j].dp < order[j - 1].dp; j--)
                [order[j], order[j - 1]] = [order[j - 1], order[j]];
        }
        const indices = order.map(item => item.index);
        if (orders.some(previous => previous.every((value, i) => value === indices[i]))) break;
        orders.push(indices);
        const weighted = indices.map(i => scale([...set.points[i], 1], set.weights[i]));
        let sum = [0, 0, 0, 0];
        for (const point of weighted) sum = add(sum, point);
        let part0 = [0, 0, 0, 0];
        for (let i = 0; i < count; i++)
        {
            let part1 = three && i === 0 ? weighted[0] : [0, 0, 0, 0];
            for (let j = three && i === 0 ? 1 : i; j <= count; j++)
            {
                if (three)
                {
                    const part2 = sub(sub(sum, part1), part0), half = [0.5, 0.5, 0.5, 0.25];
                    const result = solve(multiplyAdd(part1, half, part0),
                        multiplyAdd(part1, half, part2), f(part1[3] * 0.25));
                    if (result.error < bestError)
                    {
                        bestError = result.error; bestIteration = iteration;
                        winning = { ...result, i, j, k: count };
                    }
                }
                else
                {
                    let part2 = j === 0 ? weighted[0] : [0, 0, 0, 0];
                    for (let k = j === 0 ? 1 : j; k <= count; k++)
                    {
                        const part3 = sub(sub(sub(sum, part2), part1), part0);
                        const oneThird = [f(1 / 3), f(1 / 3), f(1 / 3), f(1 / 9)];
                        const twoThirds = [f(2 / 3), f(2 / 3), f(2 / 3), f(4 / 9)];
                        const alphax = multiplyAdd(part2, oneThird, multiplyAdd(part1, twoThirds, part0));
                        const betax = multiplyAdd(part1, oneThird, multiplyAdd(part2, twoThirds, part3));
                        const result = solve(alphax, betax, f(f(2 / 9) * f(part1[3] + part2[3])));
                        if (result.error < bestError)
                        {
                            bestError = result.error; bestIteration = iteration;
                            winning = { ...result, i, j, k };
                        }
                        if (k < count) part2 = add(part2, weighted[k]);
                    }
                }
                if (j < count) part1 = add(part1, weighted[j]);
            }
            part0 = add(part0, weighted[i]);
        }
        if (bestIteration !== iteration) break;
        if (!winning) break;
        axis = sub(winning.b, winning.a);
    }
    if (bestError < best)
    {
        const indices = [], order = orders[bestIteration];
        for (let m = 0; m < count; m++)
            indices[order[m]] = m < winning.i ? 0 : m < winning.j ? 2 : m < winning.k && !three ? 3 : 1;
        writeColourBlock(winning.a, winning.b, indices, set, three, output, offset);
    }
    return bestError;
}

/** CompressAlphaDxt5, also used directly for the BC4 and BC5 channels. */
function compressAlpha(rgba, mask, channel, output, offset)
{
    let min5 = 255, max5 = 0, min7 = 255, max7 = 0;
    for (let i = 0; i < 16; i++)
    {
        if (!(mask & (1 << i))) continue;
        const value = rgba[4 * i + channel];
        min7 = Math.min(min7, value); max7 = Math.max(max7, value);
        if (value !== 0) min5 = Math.min(min5, value);
        if (value !== 255) max5 = Math.max(max5, value);
    }
    if (min5 > max5) min5 = max5;
    if (min7 > max7) min7 = max7;
    if (max5 - min5 < 5) max5 = Math.min(min5 + 5, 255);
    if (max5 - min5 < 5) min5 = Math.max(0, max5 - 5);
    if (max7 - min7 < 7) max7 = Math.min(min7 + 7, 255);
    if (max7 - min7 < 7) min7 = Math.max(0, max7 - 7);
    const codes5 = [min5, max5], codes7 = [min7, max7];
    for (let i = 1; i < 5; i++) codes5[i + 1] = Math.trunc(((5 - i) * min5 + i * max5) / 5);
    codes5[6] = 0; codes5[7] = 255;
    for (let i = 1; i < 7; i++) codes7[i + 1] = Math.trunc(((7 - i) * min7 + i * max7) / 7);
    const fit = codes =>
    {
        const indices = [];
        let error = 0;
        for (let i = 0; i < 16; i++)
        {
            let index = 0, least = 0x7fffffff;
            if (!(mask & (1 << i))) { indices[i] = 0; continue; }
            for (let j = 0; j < 8; j++)
            {
                const delta = rgba[4 * i + channel] - codes[j], distance = delta * delta;
                if (distance < least) { least = distance; index = j; }
            }
            indices[i] = index; error += least;
        }
        return { indices, error };
    };
    const five = fit(codes5), seven = fit(codes7), useFive = five.error <= seven.error;
    const indices = useFive ? five.indices : seven.indices;
    output[offset] = useFive ? min5 : max7;
    output[offset + 1] = useFive ? max5 : min7;
    for (let half = 0; half < 2; half++)
    {
        let bits = 0;
        for (let j = 0; j < 8; j++)
        {
            let index = indices[8 * half + j];
            if (!useFive) index = index < 2 ? 1 - index : 9 - index;
            bits |= index << (3 * j);
        }
        for (let j = 0; j < 3; j++) output[offset + 2 + half * 3 + j] = (bits >>> (8 * j)) & 255;
    }
}

/**
 * Encode a single RGBA block using Carbon's squish format and quality enums.
 * Source: libsquish 1.15 CompressMasked; Carbon Tr2DxtCompressor.cpp:832-920.
 * Approved bug fix: Carbon declares KBC4/KBC5 but omits their dispatch cases;
 * they use libsquish's existing red/green alpha encoders here.
 * @param {Uint8Array} rgba Sixteen RGBA texels (masked entries ignored).
 * @param {number} mask Valid texel bitmask.
 * @param {number} format Carbon SQUISH_DXT1..SQUISH_KBC5 (5..9).
 * @param {number} quality ITER_CLUSTER_FIT=0, CLUSTER_FIT=1, RANGE_FIT=2.
 * @param {Uint8Array} output Destination block storage.
 * @param {number} [offset=0] Destination byte offset.
 * @returns {void}
 */
export function compressMasked(rgba, mask, format, quality, output, offset = 0)
{
    if (!Number.isInteger(format) || format < 5 || format > 9) throw new RangeError("Unknown squish format");
    if (!Number.isInteger(quality) || quality < 0 || quality > 2) throw new RangeError("Unknown squish quality");
    if (rgba.length < 64 || !Number.isSafeInteger(offset) || offset < 0 || offset + (format === 5 || format === 8 ? 8 : 16) > output.length)
        throw new RangeError("Squish block storage is too short");
    if (format >= 8)
    {
        compressAlpha(rgba, mask, 0, output, offset);
        if (format === 9) compressAlpha(rgba, mask, 1, output, offset + 8);
        return;
    }
    const colourOffset = offset + (format === 5 ? 0 : 8);
    const set = colourSet(rgba, mask, format === 5);
    const fit = (three, best) =>
    {
        if (set.points.length === 1) return singleColourFit(set, three, best, output, colourOffset);
        if (quality === 2 || set.points.length === 0) return rangeFit(set, three, best, output, colourOffset);
        return clusterFit(set, three, best, quality === 0, output, colourOffset);
    };
    let best = FLT_MAX;
    if (format === 5) best = fit(true, best);
    if (format !== 5 || !set.transparent) fit(false, best);
    if (format === 6)
    {
        for (let i = 0; i < 8; i++)
        {
            const a = mask & (1 << (2 * i)) ? floatToInt(f(rgba[8 * i + 3] * f(15 / 255)), 15) : 0;
            const b = mask & (1 << (2 * i + 1)) ? floatToInt(f(rgba[8 * i + 7] * f(15 / 255)), 15) : 0;
            output[offset + i] = a | (b << 4);
        }
    }
    else if (format === 7) compressAlpha(rgba, mask, 3, output, offset);
}
