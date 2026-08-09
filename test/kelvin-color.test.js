import assert from "node:assert/strict";
import { test } from "node:test";

import { Tr2KelvinColor } from "../npm/dist/trinityCore/index.js";

const Illuminant = Tr2KelvinColor.Tr2StandardIlluminant;

test("a temperature outside the supported range is black, not clamped", () =>
{
  assert.deepEqual(Array.from(Tr2KelvinColor.fromKelvin(999, 0.5, Illuminant.TR2STANDARDILLUMINANT_D55)), [ 0, 0, 0 ]);
  assert.deepEqual(Array.from(Tr2KelvinColor.fromKelvin(25001, 0.5, Illuminant.TR2STANDARDILLUMINANT_D55)), [ 0, 0, 0 ]);
  assert.deepEqual(Array.from(Tr2KelvinColor.fromKelvin(Number.NaN, 0.5, Illuminant.TR2STANDARDILLUMINANT_D55)), [ 0, 0, 0 ]);
});

test("the brightest channel is normalised to exactly one", () =>
{
  for (const temperature of [ 1000, 2000, 3200, 5500, 6500, 12000, 25000 ])
  {
    const color = Tr2KelvinColor.fromKelvin(temperature, 0.5, Illuminant.TR2STANDARDILLUMINANT_D55);
    const brightest = Math.max(color[0], color[1], color[2]);

    assert.ok(Math.abs(brightest - 1) < 1e-9, `${temperature}K peaked at ${brightest}`);
  }
});

test("a temperature at its own white point comes out near-neutral", () =>
{
  // D55 is nominally 5503K, but the D-series illuminants sit on the DAYLIGHT
  // locus while the temperature is evaluated on the PLANCKIAN one, so the two
  // do not coincide exactly - a few percent of residual tint is the expected
  // answer here, not a bug.
  const color = Tr2KelvinColor.fromKelvin(5503, 0.5, Illuminant.TR2STANDARDILLUMINANT_D55);

  for (const channel of color)
  {
    assert.ok(Math.abs(channel - 1) < 0.05, `channel drifted too far from neutral: ${Array.from(color)}`);
  }
});

test("cooler is redder and hotter is bluer", () =>
{
  const warm = Tr2KelvinColor.fromKelvin(2000, 0.5, Illuminant.TR2STANDARDILLUMINANT_D55);
  const cool = Tr2KelvinColor.fromKelvin(15000, 0.5, Illuminant.TR2STANDARDILLUMINANT_D55);

  assert.ok(warm[0] > warm[2], "a candle-temperature light leans red");
  assert.ok(cool[2] > cool[0], "a daylight-plus light leans blue");
});

test("the white point changes the result, and an unknown one falls back to D55", () =>
{
  const atD55 = Tr2KelvinColor.fromKelvin(5000, 0.5, Illuminant.TR2STANDARDILLUMINANT_D55);
  const atA = Tr2KelvinColor.fromKelvin(5000, 0.5, Illuminant.TR2STANDARDILLUMINANT_A);

  assert.notDeepEqual(Array.from(atD55), Array.from(atA));
  assert.deepEqual(
    Array.from(Tr2KelvinColor.fromKelvin(5000, 0.5, 999)),
    Array.from(atD55), "Carbon defaults an unknown illuminant to D55");
});

test("tint scales green against red and blue rather than shifting hue", () =>
{
  const green = Tr2KelvinColor.fromKelvin(5500, 0.9, Illuminant.TR2STANDARDILLUMINANT_D55);
  const magenta = Tr2KelvinColor.fromKelvin(5500, 0.1, Illuminant.TR2STANDARDILLUMINANT_D55);

  assert.ok(green[1] > green[0] && green[1] > green[2], "a high tint pushes green");
  assert.ok(magenta[0] > magenta[1] && magenta[2] > magenta[1], "a low tint pushes red and blue");
});

test("the record form reads its own authored fields", () =>
{
  const record = new Tr2KelvinColor();

  assert.equal(record.temperature, 5500, "Carbon's default");
  assert.equal(record.tint, 0.5);

  const direct = Tr2KelvinColor.fromKelvin(record.temperature, record.tint, record.whiteBalance);
  assert.deepEqual(Array.from(record.GetColor()), Array.from(direct));
});
