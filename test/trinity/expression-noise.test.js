// Carbon's expression noise(x) and fractal(x, alpha, beta, n)
// (Curves/Tr2CurveScalarExpression.cpp:19-28): smooth 1D Perlin noise from
// PerlinNoise1D, offset by the curve's random constant and remapped from
// [-1, 1] to [0, 1]. They were a per-input hash (white noise), which made
// noise-driven effects flicker violently (Machariel Blackbody Drift).
import assert from "node:assert/strict";
import test from "node:test";

import { CjsControllerExpressionProgram } from "../../npm/dist/trinity/index.js";
import { carbonPerlin1D } from "../../npm/dist/global/math/noise.js";

const evaluate = (source, context = {}) => CjsControllerExpressionProgram.Compile(source).Evaluate(context);

test("noise(x) is Carbon's (PerlinNoise1D(x + randomConstant, 1, 1, 1) + 1) / 2", () =>
{
  for (const x of [ 0, 0.3, 1.7, 12.25, -4.5 ])
  {
    assert.ok(Math.abs(evaluate(`noise(${x})`) - (carbonPerlin1D(x, 1, 1, 1) + 1) / 2) < 1e-6, `noise(${x})`);
  }
  const curve = { randomConstant: 3.7 };
  assert.ok(Math.abs(evaluate("noise(1.2)", { curve }) - (carbonPerlin1D(1.2 + 3.7, 1, 1, 1) + 1) / 2) < 1e-6, "offset by the random constant");
});

test("noise is smooth: nearby inputs give nearby values (a hash would not)", () =>
{
  let worst = 0;
  for (let i = 0; i < 400; i++)
  {
    const x = i * 0.05;
    worst = Math.max(worst, Math.abs(evaluate(`noise(${x + 0.01})`) - evaluate(`noise(${x})`)));
  }
  assert.ok(worst < 0.05, `largest step for dx 0.01 was ${worst}`);
});

test("fractal(x, alpha, beta, n) passes its octave arguments to PerlinNoise1D", () =>
{
  const expected = (carbonPerlin1D(2.5, 2, 2, 3) + 1) / 2;
  assert.ok(Math.abs(evaluate("fractal(2.5, 2, 2, 3)") - expected) < 1e-6);
  assert.ok(Math.abs(evaluate("fractal(2.5, 2, 2, 2.6)") - expected) < 1e-6, "n rounds as int(n + 0.5)");
});
