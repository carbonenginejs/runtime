// Source: trinity/trinity/TriMath.cpp
//   trinity/trinity/Curves/Tr2CurveRandomAxisRotation.cpp
//
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
