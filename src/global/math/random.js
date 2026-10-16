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

// Source: trinity/trinity/TriMath.cpp:209-238,970-1009
// Carbon has TWO independent process streams here: CRT rand and TriRand.
let crtState = 1;
let triState = 1234;
let particleState = null;

/** Windows CRT srand: the stream is shared by all native rand consumers. */
random.crtSrand = function(seed)
{
    crtState = Number(seed) >>> 0;
};

/** Windows CRT rand, matching the Windows Carbon target (RAND_MAX = 32767). */
random.crtRand = function()
{
    crtState = (Math.imul(crtState, 214013) + 2531011) >>> 0;
    return (crtState >>> 16) & 0x7fff;
};

/** Carbon TriRandomSeed delegates to the CRT stream, not TriSrand. */
random.triRandomSeed = function(seed)
{
    random.crtSrand(seed);
};

/** Carbon TriFloatRandom01, including the inclusive upper endpoint. */
random.triFloatRandom01 = function()
{
    return Math.fround(random.crtRand() / 32767);
};

/** Carbon's historical Gaussian helper, including its 0.75 exponent. */
random.triFloatRandomGauss = function(mu, deviation)
{
    let first = random.triFloatRandom01();
    // Preserve the native float assignment, including underflow of 1e-100.
    if (first < 1e-100) first = Math.fround(1e-100);
    first = Math.fround(-2 * Math.log(first));
    const second = Math.fround(random.triFloatRandom01() * Math.fround(Math.PI * 2));
    return Math.fround(mu + deviation * Math.pow(first, 0.75) * Math.cos(second));
};

/** One TriRand integer-state step; also used by isolated SOF planning state. */
random.triRandStep = function(seed)
{
    return (((seed << 12) + 150889) >>> 0) % 714025;
};

/** Carbon TriSrand(uint32_t). */
random.triSrand = function(seed)
{
    triState = (Number(seed) >>> 0) % 714025;
};

/** Carbon TriRandGetSeed. */
random.triRandGetSeed = function()
{
    return triState;
};

/** Carbon TriRand; shares state with both integer overloads. */
random.triRand = function()
{
    triState = random.triRandStep(triState);
    return Math.fround(triState / 714025);
};

/** Carbon TriRandInt(int hi), including uint32 multiplication overflow. */
random.triRandInt = function(hi)
{
    triState = random.triRandStep(triState);
    return Math.trunc((Math.imul(hi | 0, triState) >>> 0) / 714025);
};

/** Carbon TriRandInt(int lo, int hi). */
random.triRandIntRange = function(lo, hi)
{
    return (random.triRandInt((hi - lo) | 0) + (lo | 0)) | 0;
};

/** Source: Particle/Tr2ParticleSystem.h:145-174. Lazy CRT-seeded shared state. */
random.particleRandCheap = function()
{
    if (particleState === null) particleState = random.crtRand();
    const seed = particleState;
    let lo = Math.imul(16807, seed & 0xffff) >>> 0;
    const hi = Math.imul(16807, seed >>> 16) >>> 0;
    lo = (lo + ((hi & 0x7fff) << 16)) >>> 0;
    lo = (lo + (hi >>> 15)) >>> 0;
    particleState = ((lo & 0x7fffffff) + (lo >>> 31)) >>> 0;
    return particleState;
};

/** Carbon Tr2ParticleSystem::RandFloat. */
random.particleRandFloat = function()
{
    return Math.fround(Math.fround(random.particleRandCheap() & 0x7fffffff) / Math.fround(0x7fffffff));
};

/** std::minstd_rand engine; distribution conversion is separate from its state. */
random.minstdRand = function(seed)
{
    const modulus = 2147483647;
    let state = (Number(seed) >>> 0) % modulus;
    if (state === 0) state = 1;
    return function()
    {
        state = state * 48271 % modulus;
        return state;
    };
};

/** MSVC 14.50 generate_canonical<float,24> for minstd_rand (include/random:298-358). */
random.createMinStdRandom = function(seed)
{
    const engine = random.minstdRand(seed);
    return function()
    {
        // R=2147483646, X=floor(R/2^24)=127; reject the incomplete top bucket.
        let value;
        do
        {
            value = engine() - 1;
        }
        while (value >= 2130706432);
        return Math.floor(value / 127) * 2 ** -24;
    };
};

/** Entropy for std::random_device consumers; never substitutes for a seeded engine. */
random.randomDevice = function()
{
    return globalThis.crypto.getRandomValues(new Uint32Array(1))[0];
};

/** Host randomness for explicitly non-Carbon APIs, centralized at this boundary. */
random.host = function()
{
    return Math.random();
};

/** Existing non-Carbon room-reverb generator; sequence preserved during consolidation. */
random.mulberry32 = function(seed)
{
    let state = Number(seed) >>> 0 || 0x6d2b79f5;

    return () =>
    {
        state += 0x6d2b79f5;
        let value = state;

        value = Math.imul(value ^ value >>> 15, value | 1);
        value ^= value + Math.imul(value ^ value >>> 7, value | 61);
        return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
};
