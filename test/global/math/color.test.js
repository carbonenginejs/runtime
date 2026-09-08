import assert from "node:assert/strict";
import { test } from "node:test";

import { color } from "../../../npm/dist/global/math/color.js";

/**
 * Carbon's Color (math/include/Color.h + Color_inline.h) - the one color
 * type Carbon has, four floats rgba.
 */

test("create is Carbon's default: transparent black, not opaque (Color_inline.h:6-12)", () =>
{
  assert.deepEqual([ ...color.create() ], [ 0, 0, 0, 0 ]);
});

test("ARGB decode and encode follow Carbon's word layout and rounding (Color_inline.h:15-52)", () =>
{
  const out = color.create();
  color.fromARGB(out, 0xFF800000 | 0x40);
  assert.ok(Math.abs(out[0] - 128 / 255) < 1e-7, "r from bits 16-23");
  assert.equal(out[1], 0, "g");
  assert.ok(Math.abs(out[2] - 64 / 255) < 1e-7, "b from bits 0-7");
  assert.equal(out[3], 1, "a from bits 24-31");

  // Encode: clamp to [0,1], then *255 + 0.5 truncated.
  assert.equal(color.toARGB(color.fromValues(2, -1, 0.5, 1)), 0xFFFF0080, "clamped channels");
  assert.equal((color.toARGB(color.fromValues(0.5, 0, 0, 0)) >>> 16) & 0xFF, 128, "0.5*255+0.5 = 128");

  // Round trip through the byte quantization.
  const trip = color.fromARGB(color.create(), color.toARGB(color.fromValues(0.25, 0.5, 0.75, 1)));
  assert.ok(Math.abs(trip[0] - 0.25) < 1 / 255);
  assert.ok(Math.abs(trip[2] - 0.75) < 1 / 255);
});

test("lerp includes alpha (Color_inline.h:152-155)", () =>
{
  const out = color.lerp(color.create(), color.fromValues(0, 0, 0, 0), color.fromValues(1, 0.5, 0.25, 1), 0.5);
  assert.deepEqual([ ...out ], [ 0.5, 0.25, 0.125, 0.5 ]);
});

test("saturate is Carbon's grey-to-color lerp, not a clamp (Color_inline.h:158-169)", () =>
{
  const red = color.fromValues(1, 0, 0, 0.5);
  const out = color.create();

  // saturation 1 is a plain copy.
  color.saturate(out, red, 1);
  assert.deepEqual([ ...out ], [ ...red ]);

  // saturation 0 collapses to perceived-intensity grey; alpha untouched.
  color.saturate(out, red, 0);
  const grey = Math.fround(0.299);
  assert.ok(Math.abs(out[0] - grey) < 1e-6);
  assert.ok(Math.abs(out[1] - grey) < 1e-6);
  assert.ok(Math.abs(out[2] - grey) < 1e-6);
  assert.equal(out[3], 0.5);

  // Negative saturation clamps to the grey, exactly like 0 (max(0, s)).
  const negative = color.saturate(color.create(), red, -5);
  assert.deepEqual([ ...negative ], [ ...out ]);

  // Oversaturation pushes past the color, away from grey.
  color.saturate(out, red, 2);
  assert.ok(out[0] > 1, "red channel overshoots");
  assert.ok(out[1] < 0, "green undershoots");
});

test("arithmetic and equality are componentwise and exact (Color_inline.h:110-136)", () =>
{
  const a = color.fromValues(0.5, 0.25, 0.125, 1);
  const b = color.fromValues(0.5, 0.25, 0.125, 1);
  assert.equal(color.exactEquals(a, b), true);

  const sum = color.add(color.create(), a, b);
  assert.deepEqual([ ...sum ], [ 1, 0.5, 0.25, 2 ], "alpha adds too");

  const scaled = color.scale(color.create(), a, 2);
  assert.equal(color.exactEquals(scaled, sum), true);

  const negated = color.negate(color.create(), a);
  assert.equal(negated[0], -0.5);
});
