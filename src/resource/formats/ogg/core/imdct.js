/**
 * Fast IMDCT for Vorbis synthesis.
 *
 * The IMDCT is computed as a DCT-IV of half the block size followed by the
 * standard three-segment rearrangement; the DCT-IV itself runs on a complex
 * FFT of a quarter block with pre/post twiddles. The factorization was
 * derived analytically and is verified against the naive transforms to float
 * precision in the test suite.
 */

const tableCache = new Map();

function getTables(m)
{
    let tables = tableCache.get(m);
    if (tables) return tables;

    const h = m >> 1;
    const preCos = new Float32Array(h);
    const preSin = new Float32Array(h);
    const postCos = new Float32Array(h);
    const postSin = new Float32Array(h);
    for (let i = 0; i < h; i++)
    {
        const pre = (Math.PI * i) / m;
        preCos[i] = Math.cos(pre);
        preSin[i] = Math.sin(pre);
        const post = (Math.PI * (4 * i + 1)) / (4 * m);
        postCos[i] = Math.cos(post);
        postSin[i] = Math.sin(post);
    }

    const bitrev = new Uint32Array(h);
    for (let i = 1, j = 0; i < h; i++)
    {
        let bit = h >> 1;
        for (; j & bit; bit >>= 1) j ^= bit;
        j ^= bit;
        bitrev[i] = j;
    }

    const twiddles = [];
    for (let len = 2; len <= h; len <<= 1)
    {
        const half = len >> 1;
        const cos = new Float32Array(half);
        const sin = new Float32Array(half);
        for (let j = 0; j < half; j++)
        {
            const angle = (-2 * Math.PI * j) / len;
            cos[j] = Math.cos(angle);
            sin[j] = Math.sin(angle);
        }
        twiddles.push({ len, cos, sin });
    }

    tables = {
        preCos,
        preSin,
        postCos,
        postSin,
        bitrev,
        twiddles,
        workRe: new Float32Array(h),
        workIm: new Float32Array(h),
        dct: new Float32Array(m)
    };
    tableCache.set(m, tables);
    return tables;
}

function fftInPlace(re, im, tables)
{
    const n = re.length;
    const bitrev = tables.bitrev;
    for (let i = 1; i < n; i++)
    {
        const j = bitrev[i];
        if (i < j)
        {
            const tr = re[i]; re[i] = re[j]; re[j] = tr;
            const ti = im[i]; im[i] = im[j]; im[j] = ti;
        }
    }
    for (const { len, cos, sin } of tables.twiddles)
    {
        const half = len >> 1;
        for (let i = 0; i < n; i += len)
        {
            for (let j = 0; j < half; j++)
            {
                const wr = cos[j];
                const wi = sin[j];
                const a = i + j;
                const b = a + half;
                const vr = re[b] * wr - im[b] * wi;
                const vi = re[b] * wi + im[b] * wr;
                re[b] = re[a] - vr;
                im[b] = im[a] - vi;
                re[a] += vr;
                im[a] += vi;
            }
        }
    }
}

/**
 * In-place unnormalized DCT-IV of `input` (length must be a power of two ≥ 4)
 * into `output`.
 *
 * @param {Float32Array} input Input samples (not modified).
 * @param {Float32Array} output Output buffer of the same length.
 */
export function dctIv(input, output)
{
    const m = input.length;
    const h = m >> 1;
    const tables = getTables(m);
    const { preCos, preSin, postCos, postSin, workRe, workIm } = tables;

    for (let i = 0; i < h; i++)
    {
        const xr = input[2 * i];
        const xi = input[m - 1 - 2 * i];
        workRe[i] = xr * preCos[i] + xi * preSin[i];
        workIm[i] = xi * preCos[i] - xr * preSin[i];
    }
    fftInPlace(workRe, workIm, tables);
    for (let k = 0; k < h; k++)
    {
        const wr = workRe[k] * postCos[k] + workIm[k] * postSin[k];
        const wi = workIm[k] * postCos[k] - workRe[k] * postSin[k];
        output[2 * k] = wr;
        output[m - 1 - 2 * k] = -wi;
    }
}

/**
 * IMDCT: `spectrum` (n/2 coefficients) to `output` (n samples).
 *
 * Matches y[i] = Σ x[j]·cos(π/(2n)·(2i+1+n/2)·(2j+1)).
 *
 * @param {Float32Array} spectrum Input coefficients (length n/2, not modified).
 * @param {Float32Array} output Output buffer (length n).
 * @param {number} n Block size (power of two).
 */
export function imdct(spectrum, output, n)
{
    const n2 = n >> 1;
    const n4 = n >> 2;
    const n34 = n - n4;
    const tables = getTables(n2);
    const t = tables.dct;
    dctIv(spectrum, t);
    for (let i = 0; i < n4; i++) output[i] = t[i + n4];
    for (let i = n4; i < n34; i++) output[i] = -t[n34 - i - 1];
    for (let i = n34; i < n; i++) output[i] = -t[i - n34];
}

const windowCache = new Map();

/**
 * The Vorbis synthesis window slope of `length` samples:
 * sin(π/2 · sin²(π·(i+0.5)/(2·length))).
 *
 * @param {number} length Slope length in samples.
 * @returns {Float32Array} Cached window slope values.
 */
export function vorbisWindowSlope(length)
{
    let slope = windowCache.get(length);
    if (slope) return slope;
    slope = new Float32Array(length);
    for (let i = 0; i < length; i++)
    {
        const s = Math.sin((Math.PI * (i + 0.5)) / (2 * length));
        slope[i] = Math.sin((Math.PI / 2) * s * s);
    }
    windowCache.set(length, slope);
    return slope;
}
