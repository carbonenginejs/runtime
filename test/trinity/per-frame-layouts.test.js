// Guards CjsPerFrameLayouts and the scene's per-frame fills against Carbon.
//
// Every expectation here is derived from the C++ - EveSpaceScene.h:240-327,
// Tr2ConstantBufferFormats.h:10-92, and the two Populate* bodies at
// EveSpaceScene.cpp:3015-3202 - not from running the JS and recording what it
// produced. A layout regression is invisible on screen until a shader reads
// the wrong register, so the offsets are asserted numerically.
import test from "node:test";
import assert from "node:assert/strict";

import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { quat } from "../../npm/dist/global/math/quat.js";

import { CjsPerFrameLayouts } from "../../src/trinity/core/rawData/CjsPerFrameLayouts.js";
import { EveSpaceScene, Tr2RenderContext, Tr2ShadowMap } from "../../npm/dist/trinity/index.js";


/** Field offsets hand-computed from the C++ declaration order. */
const CARBON_OFFSETS = {
  // Tr2ConstantBufferFormats.h:53
  Tr2PerFrameVSData: {
    stride: 72,
    ViewInverseTransposeMat: 0,
    sunDirWorld: 16,
    sceneFogColor: 20,
    ViewProjectionMat: 24,
    ViewMat: 40,
    ProjectionMat: 56
  },

  // Tr2ConstantBufferFormats.h:73
  Tr2PerFramePSData: {
    stride: 80,
    ViewInverseTransposeMat: 0,
    sceneAmbientColor: 16,
    sunDirWorld: 24,
    cullDirection: 39,
    ViewProjectionMat: 40,
    viewPort: 60,
    ViewProjInverse: 64
  },

  // EveSpaceScene.h:300 - ten matrices, then the tail.
  EveSpaceScenePerFrameVSData: {
    stride: 184,
    ViewInverseTransposeMat: 0,
    ViewProjectionMat: 16,
    ProjLast: 144,
    "Sun.DirWorld": 160,
    "Sun.DiffuseColor": 164,
    FogFactors: 168,
    TargetResolution: 172,
    FovXY: 174,
    ViewportAdjustment: 176,
    Time: 180,
    ViewportSize: 182
  },

  // EveSpaceScene.h:240 - the big one.
  EveSpaceScenePerFramePSData: {
    stride: 472,
    ViewInverseTransposeMat: 0,
    EnvMapRotationMat: 32,
    "Sun.DirWorld": 48,
    AmbientColor: 56,
    ReflectionIntensity: 59,
    FogColor: 60,
    ViewportOffset: 64,
    ShadowMapSettings: 72,
    ShadowQuality: 79,
    ProjectionToView: 80,
    GammaBrightness: 87,
    FrameIndex: 88,
    VolumetricSlices: 92,
    ShadowMapValues: 96,
    ShadowMatrixVal: 112,
    SplitInfo: 368,
    ProjectionInverseMat: 372,
    CascadeRanges: 388,
    FroxelFogColor: 452,
    FroxelPlanets: 464
  }
};


/** Every stored value is float32, so compare through the same narrowing. */
function assertClose(actual, expected, message)
{
  const actualValues = Array.from(actual);
  const expectedValues = Array.from(expected);

  assert.equal(actualValues.length, expectedValues.length, `${message}: lane count`);

  for (let index = 0; index < expectedValues.length; index++)
  {
    assert.ok(
      Math.abs(actualValues[index] - expectedValues[index]) < 1e-6,
      `${message}: lane ${index} is ${actualValues[index]}, expected ${expectedValues[index]}`
    );
  }
}


/** An integer field holds a bit pattern, so it has to be read as one. */
function readUint(record, offset)
{
  return new Uint32Array(record.GetData().buffer)[offset];
}


function makeContext({ view = mat4.create(), projection = mat4.create(), viewport = null } = {})
{
  const context = new Tr2RenderContext();

  context.SetViewTransform(view);
  context.SetProjection(projection);

  if (viewport)
  {
    context.SetViewport(viewport);
  }

  return context;
}


test("every per-frame field sits where the C++ declaration order puts it", () =>
{
  for (const [ struct, expected ] of Object.entries(CARBON_OFFSETS))
  {
    const layout = CjsPerFrameLayouts.Get(struct);

    assert.ok(layout, `${struct} is catalogued`);
    assert.equal(layout.stride, expected.stride, `${struct} is ${expected.stride} floats`);

    for (const [ field, offset ] of Object.entries(expected))
    {
      if (field === "stride") continue;

      assert.equal(
        layout.fields.get(field)?.offset,
        offset,
        `${struct}.${field} starts at float ${offset}`
      );
    }
  }
});


test("every catalogued buffer is a whole number of registers", () =>
{
  const names = CjsPerFrameLayouts.Names();

  assert.equal(names.length, 6, "four groups, six buffers");

  for (const name of names)
  {
    const layout = CjsPerFrameLayouts.Get(name);

    assert.equal(layout.stride % 4, 0, `${name} is a multiple of Vector4`);
    assert.equal(layout.registerCount, layout.stride / 4, `${name} reports its registers`);
  }

  assert.equal(CjsPerFrameLayouts.Get("EveSpaceScenePerFramePSData").registerCount, 118);
  assert.equal(CjsPerFrameLayouts.Get("EveSpaceScenePerFrameVSData").registerCount, 46);
});


test("the two families stay distinct, and an unknown struct is null not a guess", () =>
{
  // Same HLSL name, same start register, different layout: binding the wrong
  // one is the failure this catalog exists to prevent.
  assert.notEqual(
    CjsPerFrameLayouts.Get("Tr2PerFrameVSData").stride,
    CjsPerFrameLayouts.Get("EveSpaceScenePerFrameVSData").stride
  );

  assert.equal(CjsPerFrameLayouts.Get("NotAStruct"), null);
  assert.equal(CjsPerFrameLayouts.ToRawLayout("NotAStruct"), null);

  assert.equal(CjsPerFrameLayouts.Find("Tr2PerFramePSData").group, "Tr2PerFrame");
  assert.equal(CjsPerFrameLayouts.Find("Tr2PerFramePSData").key, "ps");
});


test("stages follow the buffer key, so an engine binds each to the right stage", () =>
{
  assert.deepEqual(CjsPerFrameLayouts.Get("EveSpaceScenePerFrameVSData").stages, [ "vs" ]);
  assert.deepEqual(CjsPerFrameLayouts.Get("EveSpaceScenePerFramePSData").stages, [ "ps" ]);
  assert.deepEqual(CjsPerFrameLayouts.Get("Tr2PerFrameShadowPSData").stages, [ "ps" ]);
});


test("the vertex fill stores the camera transposed, and the inverse view as-is", () =>
{
  const scene = new EveSpaceScene();

  // A view and projection that are not symmetric, so a missed transpose shows.
  const view = mat4.fromValues(
    1, 2, 3, 0,
    4, 5, 6, 0,
    7, 8, 10, 0,
    11, 12, 13, 1
  );
  const projection = mat4.perspectiveNO(mat4.create(), Math.PI / 3, 1.5, 1, 1000);
  const context = makeContext({ view, projection });

  const record = scene.PopulatePerFrameVSData(context);

  assert.deepEqual(
    Array.from(record.Copy("ViewMat", new Float32Array(16))),
    Array.from(mat4.transpose(mat4.create(), view)),
    "ViewMat is Transpose(view)"
  );

  // Carbon: view * proj in row-vector order, which gl-matrix writes reversed.
  const viewProjection = mat4.multiply(mat4.create(), projection, view);
  assert.deepEqual(
    Array.from(record.Copy("ViewProjectionMat", new Float32Array(16))),
    Array.from(mat4.transpose(mat4.create(), viewProjection)),
    "ViewProjectionMat is Transpose(view * proj)"
  );

  // The one field that is NOT transposed: cpp:3023 - the value wanted is
  // already a transpose, so transpose(transpose(m)) == m.
  assert.deepEqual(
    Array.from(record.Copy("ViewInverseTransposeMat", new Float32Array(16))),
    Array.from(context.GetInverseViewTransform()),
    "ViewInverseTransposeMat is the inverse view, untransposed"
  );
});


test("the sun reaches the shader normalized and NEGATED", () =>
{
  // cpp:3039 - shaders work with the direction TO the light.
  const scene = new EveSpaceScene();

  scene.sunDirection.set([ 0, 0, -5 ]);
  scene.currentSunColor.set([ 0.25, 0.5, 0.75, 0.9 ]);

  const vs = scene.PopulatePerFrameVSData(makeContext());
  assertClose(vs.Copy("Sun.DirWorld", new Float32Array(3)), [ 0, 0, 1 ], "direction to the light");
  assertClose(
    vs.Copy("Sun.DiffuseColor", new Float32Array(4)),
    [ 0.25, 0.5, 0.75, 0.9 ],
    "the vertex block keeps the blended colour's own alpha"
  );

  // cpp:3087 - the PIXEL block alone overwrites alpha with the roughness.
  scene.defaultDiffuseRoughness = 0.375;
  const ps = scene.PopulatePerFramePSData(makeContext());
  assertClose(
    ps.Copy("Sun.DiffuseColor", new Float32Array(4)),
    [ 0.25, 0.5, 0.75, 0.375 ],
    "alpha is the roughness"
  );
});


test("the fog factors are the reciprocal band, guarded against a zero range", () =>
{
  const scene = new EveSpaceScene();

  scene.fogStart = 100;
  scene.fogEnd = 500;
  scene.fogMax = 0.8;

  const record = scene.PopulatePerFrameVSData(makeContext());
  const factors = Array.from(record.Copy("FogFactors", new Float32Array(3)));

  assert.ok(Math.abs(factors[0] - 500 / 400) < 1e-6, "fogEnd / range");
  assert.ok(Math.abs(factors[1] - 1 / 400) < 1e-6, "1 / range");
  assert.ok(Math.abs(factors[2] - 0.8) < 1e-6, "fogMax");

  // cpp:3050 - a zero-width band clamps to 1e-5 rather than dividing by zero.
  scene.fogEnd = 100;
  const guarded = scene.PopulatePerFrameVSData(makeContext());
  const clamped = Array.from(guarded.Copy("FogFactors", new Float32Array(3)));

  assert.ok(Number.isFinite(clamped[0]), "no division by zero");
  assert.ok(Math.abs(clamped[1] - 1e5) < 1, "1 / 1e-5");
});


test("the pixel fill reports shadow quality as a bit, and jitter as a flag", () =>
{
  const scene = new EveSpaceScene();

  const layout = CjsPerFrameLayouts.Get("EveSpaceScenePerFramePSData");
  const quality = layout.fields.get("ShadowQuality").offset;
  const jittering = layout.fields.get("Jittering").offset;

  // cpp:3121 - Carbon stores 1 << quality, not the enum value.
  scene.shadowQualitySetting = 3;
  let record = scene.PopulatePerFramePSData(makeContext());
  assert.equal(readUint(record, quality), 8);

  // cpp:3119 - jittering is on iff m_jitter is not the zero vector.
  assert.equal(readUint(record, jittering), 0, "no jitter by default");

  scene.jitter.set([ 0, 0, 0.5, 0 ]);
  record = scene.PopulatePerFramePSData(makeContext());
  assert.equal(readUint(record, jittering), 1, "any non-zero component counts");
});


test("the pixel fill carries the scene's own lighting outputs, not its authored ones", () =>
{
  // These four are outputs of BlendLightingOverrides (cpp:1360-1362), which
  // the driver runs at step 5 - before this fill.
  const scene = new EveSpaceScene();

  scene.currentReflectionIntensity = 0.6;
  scene.ambientColor.set([ 0.1, 0.2, 0.3, 1 ]);
  scene.fogColor.set([ 0.4, 0.5, 0.6, 0 ]);
  scene.fogMax = 0.7;
  scene.perFrameDebug = 2;

  const record = scene.PopulatePerFramePSData(makeContext());

  assertClose(record.Copy("ReflectionIntensity", new Float32Array(1)), [ 0.6 ], "reflection");
  assertClose(record.Copy("AmbientColor", new Float32Array(3)), [ 0.1, 0.2, 0.3 ], "ambient");

  // FogColor packs the scene's rgb with fogMax in w, NOT the authored alpha.
  assertClose(record.Copy("FogColor", new Float32Array(4)), [ 0.4, 0.5, 0.6, 0.7 ], "w is fogMax");

  assertClose(record.Copy("Debug", new Float32Array(1)), [ 2 ], "debug");
});


test("the engine-supplied frame state lands where Carbon's statics did", () =>
{
  const scene = new EveSpaceScene();

  // Aspect stays at or below 1.6: above that Carbon's CalculateProjectionMatrix
  // clamps, and CalculateFovFromProjection undoes a clamp a plain perspective
  // never applied. A driver that builds its projection Carbon's way is fine
  // either side of the threshold.
  const projection = mat4.perspectiveNO(mat4.create(), Math.PI / 2, 1.5, 1, 1000);
  const context = makeContext({
    projection,
    viewport: { x: 0, y: 0, width: 800, height: 600 }
  });

  const frame = {
    renderTargetWidth: 1600,
    renderTargetHeight: 1200,
    aspectRatio: 1.5,
    animationTime: 12.5,
    frameIndex: 99,
    gammaBrightness: 1.25,
    deviceViewport: { width: 1600, height: 1200 },
    projectionTransform: projection
  };

  const vs = scene.PopulatePerFrameVSData(context, frame);
  assertClose(vs.Copy("TargetResolution", new Float32Array(2)), [ 1600, 1200 ], "target");
  assertClose(vs.Copy("Time", new Float32Array(1)), [ 12.5 ], "animation time");

  // FovXY: y is the recovered vertical FOV, x is that times the aspect ratio.
  const fov = Array.from(vs.Copy("FovXY", new Float32Array(2)));
  assert.ok(Math.abs(fov[1] - Math.PI / 2) < 1e-5, "vertical FOV recovered");
  assert.ok(Math.abs(fov[0] - fov[1] * 1.5) < 1e-5, "horizontal is vertical * aspect");

  // ViewportAdjustment z/w scale the device viewport against the logical one.
  const adjustment = Array.from(vs.Copy("ViewportAdjustment", new Float32Array(4)));
  assert.equal(adjustment[0], 1, "a non-negative x needs no flip");
  assert.equal(adjustment[2], 2, "1600 / 800");
  assert.equal(adjustment[3], 2, "1200 / 600");

  const ps = scene.PopulatePerFramePSData(context, frame);
  const psLayout = CjsPerFrameLayouts.Get("EveSpaceScenePerFramePSData");

  assert.equal(readUint(ps, psLayout.fields.get("FrameIndex").offset), 99);
  assertClose(ps.Copy("GammaBrightness", new Float32Array(1)), [ 1.25 ], "gamma");
  assertClose(ps.Copy("ViewportOffset", new Float32Array(2)), [ 0, 0 ], "viewport offset");

  // cpp:3140-3142 - the reversed-depth projection's _43 and _33.
  assertClose(
    ps.Copy("ProjectionToView", new Float32Array(2)),
    [ projection[14], projection[10] ],
    "projection to view"
  );

  // cpp:3196-3199 - four fixed froxel slice distances.
  assertClose(
    ps.Copy("VolumetricSlices", new Float32Array(4)),
    [ 1000, 10000, 100000, 1000000 ],
    "froxel slices"
  );
});


test("the shadow cascade block is written only when a shadow map is supplied", () =>
{
  const scene = new EveSpaceScene();
  const context = makeContext();

  // cpp:3163 - no shadow map, no cascade block. A fresh persistent record
  // begins at the catalog defaults while ShadowCameraRange disables sampling.
  const bare = scene.PopulatePerFramePSData(context);
  assert.deepEqual(Array.from(bare.Copy("ShadowCameraRange", new Float32Array(2))), [ 1, 0 ]);
  assert.deepEqual(
    Array.from(bare.Copy("ShadowMapSettings", new Float32Array(4))),
    [ 1, 1, 0, 0 ]
  );
  assert.deepEqual(Array.from(bare.Copy("SplitInfo", new Float32Array(4))), [ 0, 0, 0, 0 ]);

  const shadowMap = new Tr2ShadowMap();
  const split = shadowMap.GetPerSplitData();
  for (let index = 0; index < 4; index++)
  {
    split.ShadowMapValues[index].set([ index * 4 + 1, index * 4 + 2, index * 4 + 3, index * 4 + 4 ]);
  }
  for (let index = 0; index < 16; index++)
  {
    split.CascadeRanges[index].set([ index, 0, 0, 0 ]);
  }
  split.SplitInfo.set([ 0.25, 0.5, 0.75, 1 ]);

  const filled = scene.PopulatePerFramePSData(context, {}, shadowMap);

  assert.deepEqual(
    Array.from(filled.Copy("ShadowMapValues", new Float32Array(4), 2)),
    [ 9, 10, 11, 12 ],
    "cascade 2's zFar values"
  );
  assert.deepEqual(
    Array.from(filled.Copy("CascadeRanges", new Float32Array(4), 15)),
    [ 15, 0, 0, 0 ],
    "all sixteen ranges are copied"
  );
  assert.deepEqual(Array.from(filled.Copy("SplitInfo", new Float32Array(4))), [ 0.25, 0.5, 0.75, 1 ]);

  scene.cascadedShadowMap = shadowMap;
  split.SplitInfo.set([ 4, 3, 2, 1 ]);
  const owned = scene.PopulatePerFramePSData(context);
  assert.deepEqual(
    Array.from(owned.Copy("SplitInfo", new Float32Array(4))),
    [ 4, 3, 2, 1 ],
    "the omitted argument uses the scene-owned cascaded shadow map"
  );

  const disabled = scene.PopulatePerFramePSData(context, {}, null);
  assert.deepEqual(
    Array.from(disabled.Copy("ShadowCameraRange", new Float32Array(2))),
    [ 1, 0 ],
    "explicit null disables shadow sampling"
  );
  assert.deepEqual(
    Array.from(disabled.Copy("SplitInfo", new Float32Array(4))),
    [ 4, 3, 2, 1 ],
    "Carbon leaves persistent cascade bytes untouched while disabled"
  );
});


test("each cascade matrix lands in its own cell of the 8x2 atlas", () =>
{
  // cpp:3175-3188 - clip space is flipped in y, remapped to (0,1), then scaled
  // into cell (i % 8, i / 8). Cascade 0 sits at the origin of the atlas;
  // cascade 8 starts one full row down.
  const scene = new EveSpaceScene();
  const context = makeContext();
  const shadowMap = new Tr2ShadowMap();

  const record = scene.PopulatePerFramePSData(context, {}, shadowMap);

  const first = mat4.transpose(
    mat4.create(),
    record.Copy("ShadowMatrixVal", new Float32Array(16), 0)
  );
  const ninth = mat4.transpose(
    mat4.create(),
    record.Copy("ShadowMatrixVal", new Float32Array(16), 8)
  );

  // The translation row carries the cell offset plus the 0.5 recentring,
  // scaled by the cell size: x = (0.5 + cellX) / 8, y = (0.5 + cellY) / 2.
  assert.ok(Math.abs(first[12] - 0.5 / 8) < 1e-6, "cascade 0 in column 0");
  assert.ok(Math.abs(first[13] - 0.5 / 2) < 1e-6, "cascade 0 in row 0");
  assert.ok(Math.abs(ninth[12] - 0.5 / 8) < 1e-6, "cascade 8 back in column 0");
  assert.ok(Math.abs(ninth[13] - (0.5 / 2 + 0.5)) < 1e-6, "cascade 8 one row down");

  // The scale halves twice over: 0.5 for the (-1,+1)->(0,1) remap, then the
  // cell size. y stays negated by the flip.
  assert.ok(Math.abs(first[0] - 0.5 / 8) < 1e-6, "x scale");
  assert.ok(Math.abs(first[5] + 0.5 / 2) < 1e-6, "y scale, flipped");
});


test("logical shadow matrices are composed once and transposed only at RawData", () =>
{
  const view = mat4.fromValues(
    0, 2, 0, 0,
    -3, 0, 0, 0,
    0, 0, 4, 0,
    5, -7, 11, 1
  );
  const context = makeContext({ view });
  const logicalLvp = mat4.fromValues(
    1, 2, 3, 0,
    4, 5, 6, 0,
    7, 8, 9, 0,
    10, 11, 12, 1
  );
  const shadowMap = new Tr2ShadowMap();
  mat4.copy(shadowMap.GetPerSplitData().ShadowMatrixVal[0], logicalLvp);

  const record = new EveSpaceScene().PopulatePerFramePSData(context, {}, shadowMap);
  const actualLogical = mat4.transpose(
    mat4.create(),
    record.Copy("ShadowMatrixVal", new Float32Array(16), 0)
  );

  const clipToUv = mat4.fromValues(
    0.5, 0, 0, 0,
    0, -0.5, 0, 0,
    0, 0, 1, 0,
    0.5, 0.5, 0, 1
  );
  const atlasCell = mat4.create();
  mat4.scale(atlasCell, atlasCell, [ 1 / 8, 1 / 2, 1 ]);
  const expected = mat4.multiply(
    mat4.create(),
    logicalLvp,
    context.GetInverseViewTransform()
  );
  mat4.multiply(expected, clipToUv, expected);
  mat4.multiply(expected, atlasCell, expected);
  assertClose(actualLogical, expected, "logical LVP -> view -> clip -> atlas");
});


test("Tr2ShadowMap split output reaches the packed scene record end to end", () =>
{
  const view = mat4.fromValues(
    0.8, 0.1, -0.3, 0,
    -0.2, 0.9, 0.25, 0,
    0.35, -0.15, 0.75, 0,
    4, -6, 9, 1
  );
  const context = makeContext({ view });
  const shadowMap = new Tr2ShadowMap();
  shadowMap.shadowSplitMode = Tr2ShadowMap.ShadowSplitMode.MANUAL;
  shadowMap.OnModified();
  shadowMap.disableShimmer = false;
  shadowMap.SplitNr0 = 80;
  const setup = shadowMap.SetupShadowSplit(
    0,
    context.GetInverseViewTransform(),
    [ 0.2, -1, 0.35 ],
    2,
    -0.9,
    1.1,
    0.8,
    -1.2
  );
  const record = new EveSpaceScene().PopulatePerFramePSData(context, {}, shadowMap);
  const actual = mat4.transpose(
    mat4.create(),
    record.Copy("ShadowMatrixVal", new Float32Array(16), 0)
  );

  const clipToUv = mat4.fromValues(
    0.5, 0, 0, 0,
    0, -0.5, 0, 0,
    0, 0, 1, 0,
    0.5, 0.5, 0, 1
  );
  const atlasCell = mat4.create();
  mat4.scale(atlasCell, atlasCell, [ 1 / 8, 1 / 2, 1 ]);
  const expected = mat4.multiply(
    mat4.create(),
    setup.lightViewProjection,
    context.GetInverseViewTransform()
  );
  mat4.multiply(expected, clipToUv, expected);
  mat4.multiply(expected, atlasCell, expected);
  assertClose(actual, expected, "producer -> scene -> RawData");
});


test("projection inverse is derived logically before RawData's sole transpose", () =>
{
  const projection = mat4.fromValues(
    2, 3, 5, 0,
    7, 11, 13, 0,
    17, 19, 23, -1,
    29, 31, 37, 1
  );
  const record = new EveSpaceScene().PopulatePerFramePSData(makeContext({ projection }));
  const expectedStored = mat4.transpose(
    mat4.create(),
    mat4.invert(mat4.create(), projection)
  );
  assertClose(
    record.Copy("ProjectionInverseMat", new Float32Array(16)),
    expectedStored,
    "Inverse(Transpose(P)) packed bytes"
  );
});


test("controlled shadow-map shapes fail loudly instead of uploading fallback zeros", () =>
{
  const scene = new EveSpaceScene();
  const context = makeContext();
  assert.throws(
    () => scene.PopulatePerFramePSData(context, {}, { GetPerSplitData: () => ({}) }),
    /requires a Tr2ShadowMap/u
  );
  assert.throws(
    () => scene.PopulatePerFramePSData(context, {}, {}),
    /requires a Tr2ShadowMap/u
  );
});


test("the scene owns one persistent record per stage, reused every frame", () =>
{
  const scene = new EveSpaceScene();
  const context = makeContext();

  const vs = scene.PopulatePerFrameVSData(context);
  const ps = scene.PopulatePerFramePSData(context);

  assert.equal(vs, scene.GetPerFrameVSData(), "the vertex fill returns the scene's own record");
  assert.equal(ps, scene.GetPerFramePSData(), "and so does the pixel fill");
  assert.equal(scene.PopulatePerFrameVSData(context), vs, "the same record next frame");
  assert.notEqual(vs.GetData().buffer, ps.GetData().buffer, "the two do not share a buffer");

  assert.equal(vs.GetData().length, 184, "46 registers");
  assert.equal(ps.GetData().length, 472, "118 registers");

  // A caller may supply its own record - Carbon's shadow pass fills a local
  // PerFrameVSData rather than the member (cpp:760-769).
  const scratch = scene.PopulatePerFrameVSData(context, {}, scene.GetPerFrameVSData());
  assert.equal(scratch, vs);
});


test("the env-map rotation reaches the shader as a transposed rotation matrix", () =>
{
  const scene = new EveSpaceScene();
  const rotation = quat.setAxisAngle(quat.create(), [ 0, 1, 0 ], Math.PI / 4);

  quat.copy(scene.envMapRotation, rotation);

  const record = scene.PopulatePerFrameVSData(makeContext());
  const expected = mat4.transpose(mat4.create(), mat4.fromQuat(mat4.create(), rotation));

  assert.deepEqual(
    Array.from(record.Copy("EnvMapRotationMat", new Float32Array(16))),
    Array.from(expected)
  );
});
