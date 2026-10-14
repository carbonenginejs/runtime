// Source: trinity/trinity/TriMath.cpp
// Source: trinity/trinity/Curves/Tr2CurveRandomAxisRotation.cpp
//
// These are Carbon usage sites, not the generator implementation.
// Carbon reaches for the C++ standard library's Mersenne Twister directly -
// `std::mt19937 randGen( seed )` in TriPerlinNoise's constructor (TriMath.cpp:
// 1023), and `std::default_random_engine`, which is mt19937 under MSVC, in
// Tr2CurveRandomAxisRotation (:5, :9). JavaScript ships no such generator and a
// persisted seed must reproduce Carbon's sequence exactly, so the engine itself
// is ported. That is the platform forcing the divergence, not a design choice.
//
// It is a CALLABLE, not a class, because that is how Carbon uses it - `randGen()`
// - and because the math tree declares namespaces of functions, not classes.
// Two independent copies of this generator existed before it was one: inline in
// noise.js and as a private class beside Tr2CurveRandomAxisRotation.

export const random = {};

const STATE_WORDS = 624;
const TWIST_OFFSET = 397;

/**
 * Builds a seeded MT19937 engine.
 *
 * Source: trinity/trinity/TriMath.cpp:1021-1027 (usage)
 * Source: trinity/trinity/Curves/Tr2CurveRandomAxisRotation.cpp:122-135 (usage)
 * Carbon: TriPerlinNoise::TriPerlinNoise; Tr2CurveRandomAxisRotation::SeedChanged (consumers)
 * Adapted: Implements the standard-library std::mt19937 engine in JavaScript.
 * The donor sites consume an engine; neither defines the generator algorithm.
 * The std::default_random_engine selection is platform-specific.
 *
 * @param {number} seed Unsigned 32-bit seed.
 * @returns {() => number} Returns the next 32-bit unsigned value on each call.
 */
random.mt19937 = function(seed)
{
    const state = new Uint32Array(STATE_WORDS);

    state[0] = Number(seed) >>> 0;
    for (let index = 1; index < STATE_WORDS; index++)
    {
        const previous = state[index - 1] ^ state[index - 1] >>> 30;
        state[index] = Math.imul(1812433253, previous) + index >>> 0;
    }

    let cursor = STATE_WORDS;

    return function()
    {
        if (cursor >= STATE_WORDS)
        {
            for (let index = 0; index < STATE_WORDS; index++)
            {
                const bits = state[index] & 0x80000000 | state[(index + 1) % STATE_WORDS] & 0x7fffffff;
                state[index] = state[(index + TWIST_OFFSET) % STATE_WORDS] ^ bits >>> 1 ^ (bits & 1 ? 0x9908b0df : 0);
            }
            cursor = 0;
        }

        let value = state[cursor++];

        value ^= value >>> 11;
        value ^= value << 7 & 0x9d2c5680;
        value ^= value << 15 & 0xefc60000;
        value ^= value >>> 18;
        return value >>> 0;
    };
};


/**
 * std::uniform_int_distribution<int>( min, max ) drawing from a 32-bit engine,
 * as MSVC's STL 14.50 (toolset v145, the one Carbon's presets name) computes
 * it: Lemire's nearly divisionless method on one engine draw per attempt
 * (<random> _Rng_from_urng_v2::operator(), uniform_int::_Eval). The result is
 * the high word of draw * range; a draw whose low word falls under
 * (2^32 - range) % range is rejected and redrawn.
 *
 * Adapted: the distribution is implementation-defined; this is MSVC's, which
 * is what the Windows client runs.
 *
 * @param {() => number} engine A random.mt19937 engine.
 * @param {number} min Inclusive lower bound.
 * @param {number} max Inclusive upper bound.
 * @returns {number} An integer in [min, max].
 */
random.uniformInt = function(engine, min, max)
{
    const range = (max - min + 1) >>> 0;
    // The full 32-bit range takes the draw as is (_Get_all_bits).
    if (range === 0) return (engine() + min) | 0;
    const wideRange = BigInt(range);
    let product = BigInt(engine()) * wideRange;
    let low = Number(product & 0xffffffffn);
    if (low < range)
    {
        const threshold = (0x100000000 - range) % range;
        while (low < threshold)
        {
            product = BigInt(engine()) * wideRange;
            low = Number(product & 0xffffffffn);
        }
    }
    // The signed adjustment (_Adjust) cancels: the result is min + high word.
    return (Number(product >> 32n) + min) | 0;
};

/**
 * std::uniform_real_distribution<float>( min, max ) drawing from a 32-bit
 * engine, as MSVC's STL 14.50 computes it: generate_canonical<float, 24>
 * keeps the top 24 bits of one draw, scaled by 2^-24, then
 * canonical * ( max - min ) + min in float (<random> generate_canonical,
 * uniform_real::_Eval).
 *
 * Adapted: the distribution is implementation-defined; this is MSVC's.
 *
 * @param {() => number} engine A random.mt19937 engine.
 * @param {number} min Lower bound.
 * @param {number} max Upper bound.
 * @returns {number} A float32 value in [min, max]; float rounding can reach max.
 */
random.uniformRealFloat = function(engine, min, max)
{
    const canonical = Math.fround((engine() >>> 8) * 2 ** -24);
    const lower = Math.fround(min);
    return Math.fround(Math.fround(canonical * Math.fround(Math.fround(max) - lower)) + lower);
};
