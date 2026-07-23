// Clean-room BitKnit2 (Granny .gr2 section format 4) decompressor.
//
// Original CarbonEngineJS implementation written solely from the published
// format specification (docs/formats/bitknit2.md) by an isolated agent with
// no access to any other BitKnit implementation, then validated byte-exact
// against 539 real EVE .gr2 BitKnit2 streams (sections and pointer-fixup
// blocks) plus synthetic raw-quantum streams. Replaced the prior EUPL-derived
// port on 2026-07-24; see THIRD-PARTY-NOTICES.md.

const TOTAL = 0x8000;
const QUANTUM_BYTES = 0x10000;
const MAGIC = 0x75B1;

// Powers of two as exact doubles, indexed 0..32. All entropy-state values are
// unsigned 32-bit; floor division by these avoids signed-shift pitfalls.
const POW2 = new Float64Array(33);
for (let i = 0; i <= 32; i++)
{
    POW2[i] = Math.pow(2, i);
}

/**
 * One adaptive frequency model with 15-bit precision (TOTAL = 0x8000).
 * Holds a cumulative table cum[0..V] (cum[V] = TOTAL), per-symbol
 * accumulators, and a 1024-entry lookup table for fast symbol search.
 */
class FrequencyModel
{
    /**
     * @param {number} symbolCount Total symbols V.
     * @param {number} minProbCount Trailing minimum-probability symbols M.
     */
    constructor(symbolCount, minProbCount)
    {
        const V = symbolCount;
        const E = V - minProbCount;
        const cum = new Uint16Array(V + 1);
        for (let i = 0; i < E; i++)
        {
            cum[i] = Math.floor((TOTAL - minProbCount) * i / E);
        }
        for (let i = E; i <= V; i++)
        {
            cum[i] = TOTAL - V + i;
        }
        this.symbolCount = V;
        this.cum = cum;
        this.acc = new Uint16Array(V).fill(1);
        this.tick = 0;
        this.inc = Math.floor((TOTAL - V) / 1024);
        this.lastInc = 1 + TOTAL - V - this.inc * 1024;
        this.lookup = new Uint16Array(1024);
        this.rebuildLookup();
    }

    rebuildLookup()
    {
        const cum = this.cum;
        const lookup = this.lookup;
        let s = 0;
        for (let k = 0; k < 1024; k++)
        {
            const threshold = k * 32;
            while (threshold >= cum[s + 1])
            {
                s++;
            }
            lookup[k] = s;
        }
    }

    /**
     * Record one decoded symbol; every 1024th observation folds the
     * accumulators halfway into the cumulative table and resets them.
     * @param {number} sym
     */
    observe(sym)
    {
        const acc = this.acc;
        acc[sym] += this.inc;
        this.tick = (this.tick + 1) & 1023;
        if (this.tick === 0)
        {
            acc[sym] += this.lastInc;
            const cum = this.cum;
            const V = this.symbolCount;
            let run = 0;
            for (let i = 1; i <= V; i++)
            {
                run += acc[i - 1];
                cum[i] += (run - cum[i]) >> 1;
                acc[i - 1] = 1;
            }
            this.rebuildLookup();
        }
    }
}

/**
 * Decompress a BitKnit2 stream (Granny .gr2 section format 4).
 *
 * The stream is a sequence of little-endian uint16 words beginning with the
 * magic 0x75B1, producing output in 65,536-byte quanta that are either raw
 * (word-aligned byte copies) or entropy-coded with two interleaved 32-bit
 * range states driving adaptive literal/match commands.
 *
 * @param {Uint8Array} bytes Compressed stream bytes.
 * @param {number} expandedSize Exact decompressed byte length.
 * @returns {Uint8Array} Decompressed output of exactly expandedSize bytes.
 * @throws {Error} On bad magic, word-stream underflow, a match reaching
 *   before output offset 0, or a coded quantum ending with neither entropy
 *   state equal to 0x10000.
 */
export function decompressBitKnit2(bytes, expandedSize)
{
    const out = new Uint8Array(expandedSize);
    if (expandedSize === 0)
    {
        return out;
    }

    const wordCount = bytes.length >>> 1;
    let wordIndex = 0;

    function nextWord()
    {
        if (wordIndex >= wordCount)
        {
            throw new Error("BitKnit2: source underflow");
        }
        const p = wordIndex * 2;
        wordIndex++;
        return bytes[p] | (bytes[p + 1] << 8);
    }

    if (nextWord() !== MAGIC)
    {
        throw new Error("BitKnit2: bad magic word");
    }

    // Nine adaptive models, all created at stream start; they persist and
    // keep adapting across quantum boundaries.
    const commandModels = [
        new FrequencyModel(300, 36),
        new FrequencyModel(300, 36),
        new FrequencyModel(300, 36),
        new FrequencyModel(300, 36)
    ];
    const cacheRefModels = [
        new FrequencyModel(40, 0),
        new FrequencyModel(40, 0),
        new FrequencyModel(40, 0),
        new FrequencyModel(40, 0)
    ];
    const exponentModel = new FrequencyModel(21, 0);

    // Recent-offset cache: eight entries plus a packed 4-bit-per-rank order
    // word (nibble at bit 4r = slot holding rank r; rank 0 = most recent).
    const recentOffsets = new Float64Array(8).fill(1);
    let recentOrder = 0x76543210;

    // Distance used by literal deltas; replaced by every match distance.
    let deltaOffset = 1;

    // Two interleaved entropy states; swapped after every operation.
    let stateA = 0;
    let stateB = 0;

    function initEntropyStates()
    {
        let merged = nextWord() * 0x10000 + nextWord();
        const split = merged & 15;
        merged = Math.floor(merged / 16);
        if (merged < 0x10000)
        {
            merged = merged * 0x10000 + nextWord();
        }
        stateA = split === 0 ? merged : Math.floor(merged / POW2[split]);
        if (stateA < 0x10000)
        {
            stateA = stateA * 0x10000 + nextWord();
        }
        const modulus = POW2[16 + split];
        stateB = ((merged % 0x10000) * 0x10000 + nextWord()) % modulus + modulus;
    }

    function popBits(n)
    {
        const value = stateA % POW2[n];
        stateA = Math.floor(stateA / POW2[n]);
        if (stateA < 0x10000)
        {
            stateA = stateA * 0x10000 + nextWord();
        }
        const t = stateA;
        stateA = stateB;
        stateB = t;
        return value;
    }

    function popSymbol(model)
    {
        const cum = model.cum;
        const code = stateA & (TOTAL - 1);
        let sym = model.lookup[code >>> 5];
        while (code >= cum[sym + 1])
        {
            sym++;
        }
        stateA = Math.floor(stateA / TOTAL) * (cum[sym + 1] - cum[sym]) + (code - cum[sym]);
        if (stateA < 0x10000)
        {
            stateA = stateA * 0x10000 + nextWord();
        }
        model.observe(sym);
        const t = stateA;
        stateA = stateB;
        stateB = t;
        return sym;
    }

    let offset = 0;
    while (offset < expandedSize)
    {
        const quantumEnd = Math.min(expandedSize, offset - (offset % QUANTUM_BYTES) + QUANTUM_BYTES);

        if (wordIndex >= wordCount)
        {
            throw new Error("BitKnit2: source underflow");
        }
        const peekPos = wordIndex * 2;
        const peek = bytes[peekPos] | (bytes[peekPos + 1] << 8);

        if (peek === 0)
        {
            // Raw quantum: consume the zero word, then copy bytes straight
            // from the word stream in stream order.
            wordIndex++;
            const remainingWords = wordCount - wordIndex;
            const quantumRemaining = quantumEnd - offset;
            const length = Math.min(remainingWords * 2, quantumRemaining);
            const start = wordIndex * 2;
            out.set(bytes.subarray(start, start + length), offset);
            offset += length;
            // When length is odd, the final word's high byte is NOT consumed
            // and the next quantum begins at that same word.
            wordIndex += length >> 1;
            continue;
        }

        // Coded quantum.
        initEntropyStates();

        if (offset === 0)
        {
            out[0] = popBits(8);
            offset = 1;
        }

        while (offset < quantumEnd)
        {
            const phase = offset & 3;
            const command = popSymbol(commandModels[phase]);

            if (command < 256)
            {
                // Literal: byte delta against the byte one last-match-distance
                // behind.
                out[offset] = (command + out[offset - deltaOffset]) & 0xFF;
                offset++;
                continue;
            }

            // Match length.
            let copyLength;
            if (command < 288)
            {
                copyLength = command - 254;
            }
            else
            {
                const n = command - 287;
                copyLength = POW2[n] + popBits(n) + 32;
            }

            // Match distance.
            const ref = popSymbol(cacheRefModels[phase]);
            let copyOffset;
            if (ref < 8)
            {
                // Recent-offset cache hit at rank `ref`, then promote to
                // rank 0 (ranks 0..ref-1 shift up one nibble).
                const shift = 4 * ref;
                const slot = (recentOrder >>> shift) & 15;
                copyOffset = recentOffsets[slot];
                if (ref === 7)
                {
                    recentOrder = ((recentOrder << 4) | slot) >>> 0;
                }
                else if (ref > 0)
                {
                    const mask = (16 << shift) - 1;
                    recentOrder = ((recentOrder & ~mask) | (((recentOrder << 4) | slot) & mask)) >>> 0;
                }
            }
            else
            {
                // Explicit distance: exponent symbol, extra mantissa bits,
                // optionally one raw word appended as the LOW 16 bits.
                const n = popSymbol(exponentModel);
                let extra = popBits(n & 15);
                if (n >= 16)
                {
                    extra = extra * 0x10000 + nextWord();
                }
                copyOffset = 32 * POW2[n] + extra * 32 + ref - 39;
                // Insert: rank-7 slot takes the rank-6 slot's value, then the
                // rank-6 slot takes the new distance; order is unchanged.
                const slot7 = (recentOrder >>> 28) & 15;
                const slot6 = (recentOrder >>> 24) & 15;
                recentOffsets[slot7] = recentOffsets[slot6];
                recentOffsets[slot6] = copyOffset;
            }

            deltaOffset = copyOffset;
            const src = offset - copyOffset;
            if (src < 0)
            {
                throw new Error("BitKnit2: match source before output start");
            }
            // Byte-by-byte ascending copy; self-overlap replicates.
            for (let i = 0; i < copyLength; i++)
            {
                out[offset + i] = out[src + i];
            }
            offset += copyLength;
        }

        if (stateA !== 0x10000 && stateB !== 0x10000)
        {
            throw new Error("BitKnit2: corrupt quantum end state");
        }
    }

    return out;
}
