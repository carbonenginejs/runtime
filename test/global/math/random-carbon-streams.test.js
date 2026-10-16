import assert from "node:assert/strict";
import { test } from "node:test";
import { random } from "../../../npm/dist/global/math/random.js";

// Golden values compiled with MSVC 14.50.35717 /O2 /std:c++20 x64.
// TriRand: TriMath.cpp:970-1009. Particle: Tr2ParticleSystem.h:145-174.
test("CRT stream matches Windows rand and shares seeding with TriRandomSeed", () =>
{
    random.triRandomSeed(1);
    assert.deepEqual(Array.from({ length: 8 }, () => random.crtRand()),
        [41, 18467, 6334, 26500, 19169, 15724, 11478, 29358]);
    random.crtSrand(1);
    assert.equal(random.triFloatRandom01(), Math.fround(41 / 32767));
    assert.equal(random.crtRand(), 18467);
});

test("TriRand float and integer calls advance one stream independently of CRT", () =>
{
    random.triSrand(1234);
    const states = [207178, 490277, 487181, 658415, 146304, 345098, 616822, 433351];
    for (let i = 0; i < states.length; i++)
    {
        if (i % 2 === 0) assert.equal(random.triRand(), Math.fround(states[i] / 714025));
        else assert.equal(random.triRandInt(100), Math.trunc(states[i] * 100 / 714025));
        assert.equal(random.triRandGetSeed(), states[i]);
        random.crtSrand(i);
    }
    random.triSrand(1234);
    assert.equal(random.triRandInt(10000000000 | 0), 5238);
});

test("particle stream seeds from one CRT draw then advances independently", () =>
{
    random.crtSrand(1);
    assert.deepEqual(Array.from({ length: 8 }, () => random.particleRandCheap()),
        [689087, 844066974, 2104143583, 1727984332, 1811309543, 2098792976, 1994645657, 1789827529]);
    assert.equal(random.crtRand(), 18467, "initialization consumes exactly one CRT draw");
});

test("minstd placement distribution matches MSVC float conversion and seed normalization", () =>
{
    const expected = [0.000022649765014648438, 0.085701942443847656, 0.60608762502670288,
        0.89863181114196777, 0.97557735443115234, 0.19118338823318481, 0.51903074979782104, 0.40114229917526245];
    for (const seed of [0, 1, 0xffffffff])
    {
        const next = random.createMinStdRandom(seed);
        assert.deepEqual(Array.from({ length: 8 }, next), expected);
    }
    const next = random.createMinStdRandom(1234);
    assert.deepEqual(Array.from({ length: 8 }, next), [0.027956128120422363, 0.93736535310745239,
        0.069659173488616943, 0.25027114152908325, 0.4609372615814209, 0.077786087989807129,
        0.48394781351089478, 0.14347183704376221]);
});
