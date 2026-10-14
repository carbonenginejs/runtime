import assert from "node:assert/strict";
import { test } from "node:test";

import { random } from "../../../npm/dist/global/math/random.js";

/**
 * EveDamageOverlay::SetDamageState's draws (EveDamageOverlay.cpp:481-491):
 * std::mt19937 with uniform_int_distribution<int> and
 * uniform_real_distribution<float>, as MSVC 14.50 (toolset v145) computes
 * them. The expected values were printed by that call compiled with MSVC
 * 14.50 /O2 x64, which draws the size before the locator.
 */
function draws(seed, count, length)
{
  const generator = random.mt19937(seed);
  const out = [];
  for (let i = 0; i < length; i++)
  {
    const size = random.uniformRealFloat(generator, 0.2, 0.8);
    const locator = random.uniformInt(generator, 0, count - 1);
    out.push([ locator, Number(size.toPrecision(9)) ]);
  }
  return out;
}

test("damage locator and size draws match MSVC's distributions", () =>
{
  assert.deepEqual(draws(842534409, 43, 5), [
    [ 8, 0.744204044 ], [ 0, 0.442092955 ], [ 14, 0.659205675 ], [ 38, 0.287505627 ], [ 5, 0.510151923 ]
  ]);
  assert.deepEqual(draws(0, 1000, 4), [
    [ 592, 0.529288113 ], [ 844, 0.629113615 ], [ 857, 0.561658025 ], [ 847, 0.526929915 ]
  ]);
});

test("a uniform float stays float32 and inside [min, max]", () =>
{
  // Float rounding can land the top canonical value on max itself.
  const generator = random.mt19937(1);
  for (let i = 0; i < 1000; i++)
  {
    const value = random.uniformRealFloat(generator, 0.2, 0.8);
    assert.equal(Math.fround(value), value);
    assert.ok(value >= Math.fround(0.2) && value <= Math.fround(0.8));
  }
});
