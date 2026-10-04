// Tr2VolumetricsRenderer's froxel fog constants (Tr2VolumetricsRenderer.cpp:808-1043). The compositions are checked
// against Carbon's row-vector products computed independently here, on rotating, non-uniformly scaled matrices, so a
// reversed operand order or a missed transpose cannot pass.
import test from "node:test";
import assert from "node:assert/strict";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import { vec4 } from "../../npm/dist/global/math/vec4.js";
import { RawData, Tr2LightManager, Tr2ShadowMap, Tr2VolumetricsRenderer } from "../../npm/dist/trinity/core/index.js";

/** Carbon's row-major Matrix product A * B (A applied first), on the shared byte layout. */
function rowMultiply(a, b)
{
  const out = new Float64Array(16);
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      out[r * 4 + c] = a[r * 4] * b[c] + a[r * 4 + 1] * b[4 + c] + a[r * 4 + 2] * b[8 + c] + a[r * 4 + 3] * b[12 + c];
  return out;
}

/** A rotating, non-uniformly scaled, translated matrix. */
function skewed(angle, axis, scale, translation)
{
  const out = mat4.fromRotationTranslationScale(mat4.create(), [ 0, 0, 0, 1 ], translation, scale);
  return mat4.multiply(out, out, mat4.fromRotation(mat4.create(), angle, axis));
}

/** The logical matrix behind a stored (transposed) record matrix. */
const logical = stored => mat4.transpose(mat4.create(), stored);

function near(actual, expected, message, epsilon = 1e-4)
{
  for (let index = 0; index < expected.length; index++)
  {
    assert.ok(Math.abs(actual[index] - expected[index]) < epsilon * Math.max(1, Math.abs(expected[index])),
      `${message}: [${index}] ${actual[index]} != ${expected[index]}`);
  }
}

function update(renderer, overrides = {})
{
  const values = Object.assign({
    view: skewed(0.4, [ 0, 1, 0 ], [ 1, 1, 1 ], [ 10, -20, 30 ]),
    projection: mat4.perspective(mat4.create(), 1, 1.5, 1, 1000),
    viewLast: null, projectionLast: null,
    origin: new Float64Array([ 1e6 + 0.25, -2e6 + 0.5, 3e6 + 0.75 ]), originShift: new Float64Array(3),
    sunDirection: vec3.normalize(vec3.create(), [ 0, 0, 1 ]), sunColor: [ 1, 0.5, 0.25, 1 ],
    jitter: [ 0.1, 0.2, 0.3 ], shadowMap: null
  }, overrides);
  values.viewLast ??= values.view;
  values.projectionLast ??= values.projection;
  const data = RawData.create("FogPerObjectData");
  renderer._UpdatePerObjectData(data, values.view, values.projection, values.viewLast, values.projectionLast,
    values.origin, values.originShift, values.sunDirection, values.sunColor, 40, 30, 64, values.jitter, values.shadowMap);
  return { data, values };
}

test("the cascade matrices are Carbon's inverseView * LVP, then clip to UV, then the atlas cell", () =>
{
  const renderer = new Tr2VolumetricsRenderer();
  const shadowMap = new Tr2ShadowMap();
  const split = shadowMap.perSplitData;
  for (let index = 0; index < 16; index++)
  {
    mat4.copy(split.ShadowMatrixVal[index], skewed(0.3 + index * 0.1, [ 1, 2, 3 ], [ 2, 0.5, 3 ], [ index, 2, -3 ]));
  }
  vec4.set(split.ShadowMapValues[2], 1, 2, 3, 4);
  vec4.set(split.SplitInfo, 4, 0, 0, 0);

  const { data, values } = update(renderer, { shadowMap });
  const inverseView = mat4.invert(mat4.create(), values.view);
  // ScalingMatrix( 0.5, -0.5, 1 ) * TranslationMatrix( 0.5, 0.5, 0 ), in Carbon's row form.
  const clipToUv = [ 0.5, 0, 0, 0, 0, -0.5, 0, 0, 0, 0, 1, 0, 0.5, 0.5, 0, 1 ];
  for (const index of [ 0, 5, 9, 15 ])
  {
    const x = index % 8, y = Math.floor(index / 8);
    const cell = rowMultiply([ 1 / 8, 0, 0, 0, 0, 1 / 2, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 ], [ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x / 8, y / 2, 0, 1 ]);
    const expected = rowMultiply(rowMultiply(rowMultiply(inverseView, split.ShadowMatrixVal[index]), clipToUv), cell);
    near(logical(data.GetTransposedIndex("ShadowMatrix", index)), expected, `cascade ${index}`);
  }
  near(data.GetIndex("ShadowMapValues", 2), [ 1, 2, 3, 4 ], "ShadowMapValues");
  near(data.Get("SplitInfo"), [ 4, 0, 0, 0 ], "SplitInfo");
});

test("the reprojection is Carbon's inverseView * originShift * viewLast: identity for a still camera", () =>
{
  const renderer = new Tr2VolumetricsRenderer();
  const still = update(renderer);
  near(logical(still.data.GetTransposed("ReprojectionMatrix")), mat4.create(), "still camera");

  const viewLast = skewed(0.7, [ 1, 0, 0 ], [ 1, 1, 1 ], [ -5, 6, 7 ]);
  const originShift = new Float64Array([ 3, -4, 5 ]);
  const moved = update(renderer, { viewLast, originShift });
  const inverseView = mat4.invert(mat4.create(), moved.values.view);
  const shift = [ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -3, 4, -5, 1 ];
  near(logical(moved.data.GetTransposed("ReprojectionMatrix")), rowMultiply(rowMultiply(inverseView, shift), viewLast), "moved camera");
  near(logical(moved.data.GetTransposed("InverseViewMatrix")), inverseView, "InverseViewMatrix");
});

test("the god-ray noise realigns with a turned sun without moving the camera in noise space", () =>
{
  const renderer = new Tr2VolumetricsRenderer();
  const view = skewed(0.4, [ 0, 1, 0 ], [ 1, 1, 1 ], [ 10, -20, 30 ]);
  const origin = new Float64Array([ 1e6 + 0.25, -2e6 + 0.5, 3e6 + 0.75 ]);
  // A first turn leaves the noise matrix away from the identity, so the second turn's composition order matters.
  update(renderer, { view, origin, sunDirection: vec3.normalize(vec3.create(), [ -2, 1, 1 ]) });
  const before = Float64Array.from(renderer._godRayNoiseMatrix);

  const sun = vec3.normalize(vec3.create(), [ 1, 2, 2 ]);
  update(renderer, { view, origin, sunDirection: sun });
  const matrix = renderer._godRayNoiseMatrix;
  const direction = vec3.normalize(vec3.create(), [ matrix[2], matrix[6], matrix[10] ]);
  near(direction, sun, "the noise's third column follows the sun", 1e-6);

  // Matrix4dTransform( camera, m ) is the row-vector camera * m.
  const inverseView = mat4.invert(mat4.create(), view);
  const camera = [ origin[0] + inverseView[12], origin[1] + inverseView[13], origin[2] + inverseView[14], 1 ];
  near(vec4.transformMat4(new Float64Array(4), camera, matrix), vec4.transformMat4(new Float64Array(4), camera, before),
    "the camera keeps its noise-space position", 1e-9);
});

test("the volumetric lights' packed words reach DynamicLights bit for bit, signalling-NaN patterns included", () =>
{
  const manager = Tr2LightManager.getOrCreateInstance("res:/graphics/effect/managed/space/system/computelightlists.fx");
  try
  {
    const lanes = 12;
    manager._packedCount = 4;
    for (let word = 0; word < 4 * lanes; word++) manager._packedBits[word] = 0x01000000 + word;
    // A shadow-atlas word whose offsets set every exponent bit with the quiet bit clear: a signalling NaN as a float.
    manager._packedBits[3 * lanes + 11] = 0x7F800004;
    manager._volumetricLights.length = 0;
    manager._volumetricLights.push(3, 1);

    const { data } = update(new Tr2VolumetricsRenderer());
    const field = data.GetLayout().fields.DynamicLights;
    const floats = data.GetData();
    const words = new Uint32Array(floats.buffer, floats.byteOffset + field.offset * 4, 2 * lanes);
    assert.deepEqual(Array.from(words.subarray(0, lanes)), Array.from(manager._packedBits.subarray(3 * lanes, 4 * lanes)), "light 3");
    assert.equal(words[11], 0x7F800004);
    assert.deepEqual(Array.from(words.subarray(lanes, 2 * lanes)), Array.from(manager._packedBits.subarray(lanes, 2 * lanes)), "light 1");
    assert.equal(new Uint32Array(floats.buffer, floats.byteOffset + data.GetLayout().fields.NumDynamicLights.offset * 4, 1)[0], 2);
  }
  finally { Tr2LightManager.deleteInstance(); }
});

test("without a light manager the light counts are zero", () =>
{
  Tr2LightManager.deleteInstance();
  const { data } = update(new Tr2VolumetricsRenderer());
  const floats = data.GetData();
  const word = name => new Uint32Array(floats.buffer, floats.byteOffset + data.GetLayout().fields[name].offset * 4, 1)[0];
  assert.equal(word("NumDynamicLights"), 0);
  assert.equal(word("ShadowMapAtlasEntryMinSizeLog2"), 0);
  assert.equal(data.Get("InverseShadowMapAtlasSize")[0], 0);
  assert.equal(word("ResolutionX"), 40);
  assert.equal(word("ResolutionZ"), 64);
});
