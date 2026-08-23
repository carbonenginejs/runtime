import assert from "node:assert/strict";
import { test } from "node:test";

import {
  MaterialLayoutFromShader,
  NormalizeMaterialLayout,
  PackMaterialConstants
} from "../src/core/materialConstants.js";

// A Tr2Shader-shaped stand-in. The engine declares no runtime dependencies and
// cannot import the real one, which is exactly why the seam is duck-typed:
// anything with this shape works, and runtime-resource's Tr2Shader has it.
function fakeShader(options = {})
{
  const constants = options.constants ?? [
    { name: "Mtl1DiffuseColor", offset: 0, size: 16, type: 0, dimension: 4, elements: 0 },
    { name: "Mtl1FresnelColor", offset: 16, size: 16, type: 0, dimension: 4, elements: 0 }
  ];

  const stageInputs = new Array(6).fill(null).map((value, stageType) => ({
    stageType,
    exists: false,
    constants: [],
    constantValues: null
  }));

  stageInputs[options.stage ?? 1] = {
    stageType: options.stage ?? 1,
    exists: true,
    constants,
    constantValues: options.defaults ?? null,
    // The authored default blob's length. Deliberately NOT the buffer size.
    constantValueSize: options.defaults?.byteLength ?? 0,
    // The real Tr2EffectStageInput owns this arithmetic, so the engine asks
    // rather than recomputing and the stand-in has to answer it too.
    GetConstantBufferSize()
    {
      const extent = constants.reduce((size, constant) => Math.max(size, constant.offset + constant.size), 0);
      return Math.max(extent, options.defaults?.byteLength ?? 0);
    }
  };

  return {
    GetTechniqueIndex: (name) => (name === (options.technique ?? "Main") ? 0 : -1),
    GetEffect: () => ({ techniques: [ { passes: [ { stageInputs } ] } ] })
  };
}

test("MaterialLayoutFromShader reads the pass's stage inputs", () =>
{
  const layout = MaterialLayoutFromShader(fakeShader());

  assert.deepEqual(layout.constants.map(constant => constant.name), [
    "Mtl1DiffuseColor",
    "Mtl1FresnelColor"
  ]);
  assert.deepEqual(layout.constants[1], { name: "Mtl1FresnelColor", offset: 16, size: 16, dimension: 4 });
});

test("MaterialLayoutFromShader sizes the buffer from the constants, not the default blob", () =>
{
  // Carbon sizes the buffer from max(offset + size) while iterating the
  // constants. `constantValueSize` is the authored default blob's length and
  // matches only by coincidence; here the defaults cover just the first
  // constant while the buffer must hold both.
  const layout = MaterialLayoutFromShader(fakeShader({ defaults: new Uint8Array(16) }));

  assert.equal(layout.size, 32);
  assert.notEqual(layout.size, 16);
});

test("MaterialLayoutFromShader refuses a stage or technique that is not there", () =>
{
  assert.throws(() => MaterialLayoutFromShader(fakeShader(), { technique: "Depth" }), /technique "Depth" is absent/);
  assert.throws(() => MaterialLayoutFromShader(fakeShader(), { pass: 3 }), /no pass 3/);
  // stageInputs is a fixed six-slot array with absent stages present but empty,
  // so a missing stage is a populated object with exists === false.
  assert.throws(() => MaterialLayoutFromShader(fakeShader({ stage: 1 }), { stage: 0 }), /no stage 0/);
  assert.throws(() => MaterialLayoutFromShader({}), /Tr2Shader-shaped/);
  assert.throws(() => MaterialLayoutFromShader(fakeShader({ constants: [] })), /declares no constants/);
});

test("PackMaterialConstants writes named values at their reflected offsets", () =>
{
  const layout = MaterialLayoutFromShader(fakeShader());
  const packed = PackMaterialConstants(layout, {
    Mtl1DiffuseColor: [ 1, 0.5, 0.25, 1 ],
    Mtl1FresnelColor: [ 0, 0, 0, 1 ]
  });

  const view = new DataView(packed.buffer);
  assert.equal(packed.byteLength, 32);
  assert.equal(view.getFloat32(0, true), 1);
  assert.equal(view.getFloat32(4, true), 0.5);
  assert.equal(view.getFloat32(16, true), 0);
  assert.equal(view.getFloat32(28, true), 1);
});

test("PackMaterialConstants applies authored defaults so a caller names only overrides", () =>
{
  // Carbon keeps a default-constant block per stage input, and it is why an
  // effect draws without the caller naming every parameter. The analysis path
  // had no access to them and demanded all of them.
  const defaults = new Uint8Array(32);
  new DataView(defaults.buffer).setFloat32(16, 0.75, true);

  const layout = MaterialLayoutFromShader(fakeShader({ defaults }));
  const packed = PackMaterialConstants(layout, { Mtl1DiffuseColor: [ 1, 1, 1, 1 ] });
  const view = new DataView(packed.buffer);

  assert.equal(view.getFloat32(0, true), 1, "the override wins");
  assert.equal(view.getFloat32(16, true), 0.75, "the authored default survives");
});

test("PackMaterialConstants demands a value when there is no default to fall back to", () =>
{
  const layout = MaterialLayoutFromShader(fakeShader());

  // A silently black material is far harder to notice than a thrown name.
  assert.throws(
    () => PackMaterialConstants(layout, { Mtl1DiffuseColor: [ 1, 1, 1, 1 ] }),
    /material\.Mtl1FresnelColor is required/
  );
});

test("PackMaterialConstants rejects values a float32 cannot carry", () =>
{
  const layout = MaterialLayoutFromShader(fakeShader());
  const values = { Mtl1DiffuseColor: [ 1, 1, 1, 1 ], Mtl1FresnelColor: [ 0, 0, 0, 1 ] };

  // Finite as a double is not enough: MAX_VALUE passes that and becomes
  // Infinity once stored, so the buffer uploads cleanly carrying a value the
  // caller never asked for.
  assert.throws(
    () => PackMaterialConstants(layout, { ...values, Mtl1DiffuseColor: [ Number.MAX_VALUE, 1, 1, 1 ] }),
    /must be a finite float32/
  );
  assert.throws(
    () => PackMaterialConstants(layout, { ...values, Mtl1FresnelColor: [ 1, 2 ] }),
    /must contain exactly 4 values/
  );
  assert.throws(() => PackMaterialConstants(layout, null), /material values are required/);
  assert.throws(() => PackMaterialConstants(null, {}), /material layout is required/);
});

test("NormalizeMaterialLayout catches the layouts that fail silently", () =>
{
  const constant = { name: "A", offset: 0, size: 16, type: 0, dimension: 4, elements: 0 };

  assert.throws(() => NormalizeMaterialLayout({ size: 0, constants: [ constant ] }), /positive multiple of four/);
  assert.throws(() => NormalizeMaterialLayout({ size: 16, constants: [] }), /at least one constant/);
  assert.throws(
    () => NormalizeMaterialLayout({ size: 16, constants: [ constant, { ...constant } ] }),
    /declared twice/
  );
  assert.throws(
    () => NormalizeMaterialLayout({ size: 32, constants: [ constant, { ...constant, name: "B", offset: 8 } ] }),
    /overlaps another constant/
  );
  assert.throws(
    () => NormalizeMaterialLayout({ size: 16, constants: [ { ...constant, offset: 2 } ] }),
    /four-byte boundary/
  );
  assert.throws(
    () => NormalizeMaterialLayout({ size: 16, constants: [ { ...constant, offset: 8 } ] }),
    /does not fit/
  );
  // Arrays and non-float constants are real Carbon vocabulary that is simply
  // not implemented; saying so beats packing them as four floats.
  assert.throws(
    () => NormalizeMaterialLayout({ size: 16, constants: [ { ...constant, elements: 2 } ] }),
    /array or non-float type/
  );
  assert.throws(
    () => NormalizeMaterialLayout({ size: 16, constants: [ { ...constant, type: 1 } ] }),
    /array or non-float type/
  );
  assert.throws(
    () => NormalizeMaterialLayout({ size: 16, constants: [ constant ], defaults: [ 0, 0 ] }),
    /defaults must be a typed array/
  );
});
