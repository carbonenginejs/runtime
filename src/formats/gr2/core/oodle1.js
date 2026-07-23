/**
 * Granny Oodle1 section decompressor.
 *
 * Ported from nwn2mdk gr2_decompress.cpp (Boost licence), derived from
 * berenm/xoreos-tools granny-decoder, and cross-checked against opengr2. The
 * codec uses an adaptive arithmetic coder over a 7-bit-per-byte stream, drives
 * adaptive frequency windows, and emits an LZ token stream. Sections decode in
 * up to three consecutive segments with fresh dictionaries sharing one bitstream.
 */

/** Large back-reference sizes selected by Oodle1 size codes 61..64. */
export const OODLE1_BACKREF_SIZES = Object.freeze([ 128, 192, 256, 512 ]);

/** Number of bytes occupied by the three Oodle1 parameter blocks. */
export const OODLE1_PARAMETER_BYTES = 36;

/** Extra bytes appended to the arithmetic stream for decoder lookahead safety. */
export const OODLE1_STREAM_PADDING = 8;

/** Extra output bytes reserved because final Oodle1 back-references may overshoot. */
export const OODLE1_OUTPUT_SLACK = 512;

/**
 * Arithmetic decoder for the Oodle1 7-bit-per-byte bitstream.
 */
class Decoder
{
    /**
     * Create an arithmetic decoder over a padded compressed stream.
     *
     * @param {Uint8Array} stream Compressed payload after the parameter header.
     */
    constructor(stream)
    {
        this.stream = stream;
        this.pos = 0;
        this.numer = stream[0] >> 1;
        this.denom = 0x80;
        this.nextDenom = 0;
    }

    /**
     * Decode a cumulative value in the range [0, max).
     *
     * @param {number} max Exclusive upper bound for the decoded value.
     * @returns {number} Arithmetic-coded cumulative value.
     */
    decode(max)
    {
        while (this.denom <= 0x800000)
        {
            this.denom = (this.denom << 8) >>> 0;
            this.numer = ((this.numer << 8)
                | ((this.stream[this.pos] << 7) & 0x80)
                | ((this.stream[this.pos + 1] >> 1) & 0x7f)) >>> 0;
            this.pos++;
        }
        this.nextDenom = Math.floor(this.denom / max);
        return Math.min(Math.floor(this.numer / this.nextDenom), max - 1);
    }

    /**
     * Commit a decoded range and shrink the arithmetic interval.
     *
     * @param {number} max Original range size.
     * @param {number} val Range start to commit.
     * @param {number} err Range width to commit.
     * @returns {number} The committed value.
     */
    commit(max, val, err)
    {
        this.numer -= this.nextDenom * val;
        if (val + err < max) this.denom = this.nextDenom * err;
        else this.denom -= this.nextDenom * val;
        return val;
    }

    /**
     * Decode and immediately commit a single-value range.
     *
     * @param {number} max Exclusive upper bound for the decoded value.
     * @returns {number} Decoded value.
     */
    decodeCommit(max)
    {
        return this.commit(max, this.decode(max), 1);
    }
}

/**
 * Adaptive weighted symbol window used by Oodle1 dictionaries.
 */
class WeighWindow
{
    /**
     * Create an adaptive window for values up to a maximum symbol.
     *
     * @param {number} maxValue Maximum symbol value represented by the window.
     * @param {number} countCap Maximum number of weighted entries to retain.
     */
    constructor(maxValue, countCap)
    {
        this.weightTotal = 4;
        this.countCap = (countCap + 1) & 0xffff;
        this.ranges = [ 0, 0x4000 ];
        this.weights = [ 4 ];
        this.values = [ 0 ];

        /**
         * Reusable result carrier for {@link WeighWindow#tryDecode}, owned by
         * this instance so repeated decode calls don't allocate a fresh object
         * per symbol (the hottest allocation site in this decoder). Safe to
         * reuse across calls: each result is fully consumed (read, and any
         * `storeValue` follow-up applied) before this same instance's next
         * `tryDecode` call, and every `decompressBlock` call site that needs
         * more than one decoded value at once (`d3`/`d4`/`d5`) always reads
         * from three distinct `WeighWindow` instances, never this one twice.
         */
        this.result = { newIndex: -1, value: 0 };

        this.threshIncrease = 4;
        this.threshRangeRebuild = 8;
        this.threshWeightRebuild = Math.max(256, Math.min(32 * maxValue, 15160));
        this.threshIncreaseCap = maxValue > 64
            ? Math.min(2 * maxValue, (this.threshWeightRebuild >> 1) - 32)
            : 128;
    }

    /**
     * Recompute arithmetic ranges from the current symbol weights.
     *
     * @returns {void}
     */
    rebuildRanges()
    {
        const w = this.weights;
        this.ranges.length = w.length + 1;
        const rangeWeight = Math.floor((8 * 0x4000) / this.weightTotal);

        let start = 0;
        for (let i = 0; i < w.length; i++)
        {
            this.ranges[i] = start;
            start += Math.floor((w[i] * rangeWeight) / 8);
        }
        this.ranges[w.length] = 0x4000;

        if (this.threshIncrease > (this.threshIncreaseCap >> 1))
        {
            this.threshRangeRebuild = this.weightTotal + this.threshIncreaseCap;
        }
        else
        {
            this.threshIncrease *= 2;
            this.threshRangeRebuild = this.weightTotal + this.threshIncrease;
        }
    }

    /**
     * Decay, compact, and reorder adaptive weights when the table grows stale.
     *
     * @returns {void}
     */
    rebuildWeights()
    {
        const
            w = this.weights,
            v = this.values;

        let total = 0;
        for (let i = 0; i < w.length; i++)
        {
            w[i] >>= 1;
            total += w[i];
        }
        this.weightTotal = total;

        for (let i = 1; i < w.length; i++)
        {
            while (i < w.length && w[i] === 0)
            {
                w[i] = w[w.length - 1]; w.pop();
                v[i] = v[v.length - 1]; v.pop();
            }
        }

        if (w.length > 1)
        {
            let mi = 1, mw = 0;
            for (let i = 1; i < w.length; i++)
            {
                if (w[i] > mw)
                {
                    mw = w[i];
                    mi = i;
                }
            }
            const l = w.length - 1;
            [ w[mi], w[l] ] = [ w[l], w[mi] ];
            [ v[mi], v[l] ] = [ v[l], v[mi] ];
        }

        if (w.length < this.countCap && w[0] === 0)
        {
            w[0] = 1;
            this.weightTotal++;
        }
    }

    /**
     * Decode a symbol through this adaptive window.
     *
     * When `newIndex` is non-negative, the caller must decode and store a
     * fresh literal value with {@link WeighWindow#storeValue}. Otherwise `value`
     * is final.
     *
     * @param {Decoder} dec Arithmetic decoder to read from.
     * @returns {{newIndex: number, value: number}} Decoded value or slot requiring a fresh literal.
     */
    tryDecode(dec)
    {
        if (this.weightTotal >= this.threshRangeRebuild)
        {
            if (this.threshRangeRebuild >= this.threshWeightRebuild) this.rebuildWeights();
            this.rebuildRanges();
        }

        const
            value = dec.decode(0x4000),
            r = this.ranges;

        let lo = 0, hi = r.length;
        while (lo < hi) { const mid = (lo + hi) >> 1; if (r[mid] <= value) lo = mid + 1; else hi = mid; }
        const index = lo - 1;
        dec.commit(0x4000, r[index], r[index + 1] - r[index]);

        this.weights[index]++;
        this.weightTotal++;

        const result = this.result;

        if (index > 0)
        {
            result.newIndex = -1;
            result.value = this.values[index];
            return result;
        }

        if (this.weights.length >= this.ranges.length && dec.decodeCommit(2) === 1)
        {
            const i = this.ranges.length + dec.decodeCommit(this.weights.length - this.ranges.length + 1) - 1;
            this.weights[i] += 2;
            this.weightTotal += 2;
            result.newIndex = -1;
            result.value = this.values[i];
            return result;
        }

        this.values.push(0);
        this.weights.push(2);
        this.weightTotal += 2;

        if (this.weights.length === this.countCap)
        {
            this.weightTotal -= this.weights[0];
            this.weights[0] = 0;
        }

        result.newIndex = this.values.length - 1;
        result.value = 0;
        return result;
    }

    /**
     * Store a freshly decoded escape value in an adaptive window slot.
     *
     * @param {number} index Slot index returned by {@link WeighWindow#tryDecode}.
     * @param {number} value Value to store.
     * @returns {number} Stored value.
     */
    storeValue(index, value)
    {
        this.values[index] = value;
        return value;
    }

}

const BACKREF_SIZES = OODLE1_BACKREF_SIZES;

/**
 * Per-segment Oodle1 dictionary and adaptive symbol windows.
 */
class Dictionary
{
    /**
     * Create a dictionary from one decoded Oodle1 parameter block.
     *
     * @param {{decodedValueMax: number, backrefValueMax: number, decodedCount: number, highbitCount: number, sizesCount: number[]}} p Parameter block.
     */
    constructor(p)
    {
        this.decodedSize = 0;
        this.backrefSize = 0;
        this.decodedValueMax = p.decodedValueMax;
        this.backrefValueMax = p.backrefValueMax;
        this.lowbitValueMax = Math.min(p.backrefValueMax + 1, 4);
        this.midbitValueMax = Math.min(Math.floor(p.backrefValueMax / 4) + 1, 256);
        this.highbitValueMax = Math.floor(p.backrefValueMax / 1024) + 1;

        this.lowbitWindow = new WeighWindow(this.lowbitValueMax - 1, this.lowbitValueMax);
        this.highbitWindow = new WeighWindow(this.highbitValueMax - 1, p.highbitCount + 1);
        this.midbitWindows = [];

        for (let i = 0; i < this.highbitValueMax; i++)
        {
            this.midbitWindows.push(new WeighWindow(this.midbitValueMax - 1, this.midbitValueMax));
        }

        this.decodedWindows = [];
        for (let i = 0; i < 4; i++)
        {
            this.decodedWindows.push(new WeighWindow(this.decodedValueMax - 1, p.decodedCount));
        }

        this.sizeWindows = [];
        for (let i = 0; i < 4; i++)
        {
            for (let j = 0; j < 16; j++)
            {
                this.sizeWindows.push(new WeighWindow(64, p.sizesCount[3 - i]));
            }
        }

        this.sizeWindows.push(new WeighWindow(64, p.sizesCount[0]));
    }

    /**
     * Decode one literal or back-reference block into the output buffer.
     *
     * Back-references use byte-by-byte overlapping copies so offsets smaller than
     * the copy length behave like the original LZ stream.
     *
     * @param {Decoder} dec Arithmetic decoder shared across all segments.
     * @param {Uint8Array} out Output buffer with slack for overshoot copies.
     * @param {number} pos Current output write offset.
     * @returns {number} Number of bytes produced.
     */
    decompressBlock(dec, out, pos)
    {
        const sw = this.sizeWindows[this.backrefSize];
        let d1 = sw.tryDecode(dec);
        if (d1.newIndex >= 0) d1.value = sw.storeValue(d1.newIndex, dec.decodeCommit(65));
        this.backrefSize = d1.value;

        if (this.backrefSize > 0)
        {
            const
                size = this.backrefSize < 61 ? this.backrefSize + 1 : BACKREF_SIZES[this.backrefSize - 61],
                range = Math.min(this.backrefValueMax, this.decodedSize);

            let d3 = this.lowbitWindow.tryDecode(dec);
            if (d3.newIndex >= 0) d3.value = this.lowbitWindow.storeValue(d3.newIndex, dec.decodeCommit(this.lowbitValueMax));

            let d4 = this.highbitWindow.tryDecode(dec);
            if (d4.newIndex >= 0) d4.value = this.highbitWindow.storeValue(d4.newIndex, dec.decodeCommit(Math.floor(range / 1024) + 1));

            const mw = this.midbitWindows[d4.value];
            let d5 = mw.tryDecode(dec);
            if (d5.newIndex >= 0) d5.value = mw.storeValue(d5.newIndex, dec.decodeCommit(Math.min(Math.floor(range / 4) + 1, 256)));

            const offset = (d4.value << 10) + (d5.value << 2) + d3.value + 1;
            this.decodedSize += size;

            let src = pos - offset;
            for (let i = 0; i < size; i++)
            {
                out[pos + i] = out[src + i];
            }
            return size;
        }
        else
        {
            const dw = this.decodedWindows[pos & 3];
            let d2 = dw.tryDecode(dec);
            if (d2.newIndex >= 0) d2.value = dw.storeValue(d2.newIndex, dec.decodeCommit(this.decodedValueMax));
            out[pos] = d2.value & 0xff;
            this.decodedSize++;
            return 1;
        }
    }
}

/**
 * Read the three Oodle1 parameter blocks from the compressed section header.
 *
 * Each block is a 12-byte little-endian C bitfield record.
 *
 * @param {Uint8Array} bytes Compressed Oodle1 section bytes.
 * @returns {{decodedValueMax: number, backrefValueMax: number, decodedCount: number, highbitCount: number, sizesCount: number[]}[]} Parsed parameter blocks.
 */
export function readOodle1Parameters(bytes)
{
    const
        dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
        params = [];

    for (let i = 0; i < 3; i++)
    {
        const
            b = i * 12,
            a = dv.getUint32(b, true),
            c = dv.getUint32(b + 4, true);

        params.push({
            decodedValueMax: a & 0x1ff,
            backrefValueMax: a >>> 9,
            decodedCount: c & 0x1ff,
            highbitCount: (c >>> 19) & 0x1fff,
            sizesCount: [ bytes[b + 8], bytes[b + 9], bytes[b + 10], bytes[b + 11] ]
        });
    }

    return params;
}

/**
 * Decompress a Granny Oodle1 (section format 2) block.
 *
 * The compressed stream is padded so the arithmetic decoder's one-byte lookahead
 * never reads out of bounds. Output is allocated with slack because a final
 * back-reference may overshoot before the returned view is trimmed.
 *
 * @param {Uint8Array} bytes Compressed section bytes.
 * @param {number} expandedSize Decompressed byte length.
 * @param {{first16:number, first8:number}} stops Segment stop offsets from the section directory.
 * @returns {Uint8Array} Exactly `expandedSize` bytes.
 */
export function decompressOodle1(bytes, expandedSize, { first16, first8 })
{
    const out = new Uint8Array(expandedSize + OODLE1_OUTPUT_SLACK);
    if (bytes.length === 0 || expandedSize === 0) return out.subarray(0, expandedSize);
    if (bytes.length < OODLE1_PARAMETER_BYTES) throw new Error("Oodle1 block too small for parameter header");

    const params = readOodle1Parameters(bytes);

    const stream = new Uint8Array(bytes.length - OODLE1_PARAMETER_BYTES + OODLE1_STREAM_PADDING);
    stream.set(bytes.subarray(OODLE1_PARAMETER_BYTES));
    const dec = new Decoder(stream);

    const steps = [ first16, first8, expandedSize ];
    let pos = 0;
    for (let s = 0; s < 3; s++)
    {
        const dict = new Dictionary(params[s]);
        while (pos < steps[s]) pos += dict.decompressBlock(dec, out, pos);
    }

    return expandedSize === out.length ? out : out.subarray(0, expandedSize);
}

/**
 * Frozen convenience namespace for Granny Oodle1 section decompression.
 *
 * The same constants and functions are also exported directly from oodle1.js.
 */
export const oodle1 = Object.freeze({
    BACKREF_SIZES: OODLE1_BACKREF_SIZES,
    PARAMETER_BYTES: OODLE1_PARAMETER_BYTES,
    STREAM_PADDING: OODLE1_STREAM_PADDING,
    OUTPUT_SLACK: OODLE1_OUTPUT_SLACK,
    readParameters: readOodle1Parameters,
    readOodle1Parameters,
    decompress: decompressOodle1,
    decompressOodle1
});
