import assert from "node:assert/strict";
import test from "node:test";

import {
  DECAL_GLOW_V5_CLEAR_TARGET,
  DECAL_GLOW_V5_SELECTION,
  DECAL_GLOW_V5_TARGET_HEIGHT,
  DECAL_GLOW_V5_TARGET_WIDTH,
  DECAL_GLOW_V5_VERTEX_BUFFER_LAYOUT,
  createDecalGlowV5FixtureValues,
  getDecalGlowV5ResourcePlan,
  validateDecalGlowV5PackagePair,
  validateDecalGlowV5PackageRecord
} from "../harness/webgpu/decalGlowV5Fixture.js";
import { buildEveSpaceObjectMainUniformData } from "../harness/webgpu/spaceObjectMainUniforms.js";

const UNIFORMS = [
  [ 0, 0, "fragment", 64 ],
  [ 1, 1, "vertex", 384 ],
  [ 2, 2, "fragment", 352 ],
  [ 3, 3, "vertex", 320 ],
  [ 4, 4, "fragment", 32 ]
];

const MATERIAL_LAYOUT = {
  dx11: [
    [ "DecalTextureScaling", 0 ],
    [ "DecalTextureOffset", 16 ],
    [ "DecalIntensityData", 32 ],
    [ "DecalGlowColor", 48 ]
  ],
  dx12: [
    [ "DecalGlowColor", 0 ],
    [ "DecalTextureScaling", 16 ],
    [ "DecalTextureOffset", 32 ],
    [ "DecalIntensityData", 48 ]
  ]
};

const TEXTURES = [
  [ 0, 5, "DecalTransparencyMap" ],
  [ 1, 6, "DecalGlowMap" ]
];

const SAMPLERS = [
  [ 0, 7, "DecalTransparencySampler", 4 ],
  [ 1, 8, "DecalGlowSampler", 1 ]
];

const PASS_STATES = [
  { state: 14, value: 0 },
  { state: 15, value: 0 },
  { state: 19, value: 2 },
  { state: 20, value: 2 },
  { state: 27, value: 1 },
  { state: 171, value: 1 }
];

function selectedOptions()
{
  return Object.entries(DECAL_GLOW_V5_SELECTION).map(([ name, value ]) => ({
    name,
    value,
    optionIndex: 0,
    defaultOption: 0,
    defaultValue: value,
    source: "local"
  }));
}

function binding(resourceKind, registerIndex, bindingIndex, visibility, layout)
{
  const identity = `${resourceKind}:0:${registerIndex}`;
  return {
    sourceTruth: "wgsl-layout",
    resourceKind,
    identity,
    scopeIdentity: `${identity}@${visibility}`,
    registerSpace: 0,
    registerIndex,
    group: 0,
    binding: bindingIndex,
    visibility: [ visibility ],
    dynamic: false,
    layout
  };
}

function constantBuffer(registerIndex, backend)
{
  const local = registerIndex === 0;
  return {
    kind: "constantBuffer",
    registerSpace: 0,
    registerIndex,
    carbon: {
      hasLocalConstants: local,
      constantValueSize: local ? 64 : 0,
      constants: local
        ? MATERIAL_LAYOUT[backend].map(([ name, offset ]) => ({
            name,
            offset,
            size: 16,
            type: 0,
            dimension: 4,
            elements: 0,
            isSRGB: false,
            isAutoregister: false
          }))
        : []
    }
  };
}

function samplerReflection(registerIndex, addressMode)
{
  return {
    kind: "sampler",
    registerSpace: 0,
    registerIndex,
    carbon: {
      name: null,
      sampler: {
        comparison: false,
        minFilter: 3,
        magFilter: 2,
        mipFilter: 2,
        addressU: addressMode,
        addressV: addressMode,
        addressW: 3,
        mipLODBias: -0.75,
        maxAnisotropy: 16,
        comparisonFunc: 1,
        borderColor: [ 0, 0, 0, 0 ],
        minLOD: -3.4028234663852886e+38,
        maxLOD: 3.4028234663852886e+38,
        isDynamic: false
      }
    }
  };
}

// The layout the caller must now state. It was read off the package's analysis
// chunk until that fallback was removed; a fixture owns its own layout, and a
// composed caller derives one from `Tr2Shader`.
function materialLayout(backend)
{
  return {
    size: 64,
    constants: MATERIAL_LAYOUT[backend].map(([ name, offset ]) => ({ name, offset, size: 16, type: 0, dimension: 4, elements: 0 }))
  };
}

function record(backend)
{
  const source =
    `res:/graphics/effect.${backend}/managed/space/decals/v5/unpacked_decalglowv5.sm_hi`;
  const vertexWgsl = `// ${backend}
struct VertexInput {
  @location(0) input0: vec3<f32>,
  @location(2) input2: vec2<f32>,
  @location(3) input3: vec3<f32>,
  @location(4) input4: vec3<f32>,
  @location(5) input5: vec3<f32>,
};
@vertex fn main(input: VertexInput) -> @builtin(position) vec4<f32> {
  return vec4<f32>(input.input0, 1.0);
}`;
  const pixelWgsl = `// ${backend}
struct FragmentInput {
  @location(1) input1: vec4<f32>,
  @location(5) input5: vec4<f32>,
};
struct FragmentOutput {
  @location(0) output0: vec4<f32>,
};
@fragment fn main(input: FragmentInput) -> FragmentOutput {
  var output: FragmentOutput;
  output.output0 = input.input1 + input.input5;
  return output;
}`;
  return {
    backend,
    label: `${backend}.carbonwebgpu`,
    filePath: `E:/fixtures/unpacked_decalglowv5.${backend}.carbonwebgpu`,
    resourcePath: `res:/webgpu-harness/decalglowv5/${backend}.carbonwebgpu`,
    analysis: {
      source,
      bodyIndex: 0,
      selectedOptions: selectedOptions(),
      passes: [ {
        techniqueName: "Main",
        passIndex: 0,
        renderStates: 1,
        states: structuredClone(PASS_STATES)
      } ],
      stages: [
        {
          key: "Main.pass0.vertex",
          techniqueName: "Main",
          passIndex: 0,
          stageName: "vertex",
          pipelineInputs: [
            { registerIndex: 0, dimension: 3, type: 0, usedMask: 7 },
            { registerIndex: 1, dimension: 4, type: 2, usedMask: 0 },
            { registerIndex: 2, dimension: 2, type: 0, usedMask: 3 },
            { registerIndex: 3, dimension: 3, type: 0, usedMask: 7 },
            { registerIndex: 4, dimension: 3, type: 0, usedMask: 7 },
            { registerIndex: 5, dimension: 3, type: 0, usedMask: 7 }
          ],
          bindings: [ constantBuffer(1, backend), constantBuffer(3, backend) ]
        },
        {
          key: "Main.pass0.pixel",
          techniqueName: "Main",
          passIndex: 0,
          stageName: "pixel",
          pipelineInputs: [
            { registerIndex: 1, dimension: 4, type: 0, usedMask: 12 },
            { registerIndex: 5, dimension: 4, type: 0, usedMask: 8 }
          ],
          bindings: [
            // Reflected on both backends; DX12 declares them in the root
            // signature, with identical reflected state.
            samplerReflection(0, 4),
            samplerReflection(1, 1),
            ...TEXTURES.map(([ registerIndex, _slot, name ]) => ({
              kind: "resource",
              registerSpace: 0,
              registerIndex,
              carbon: {
                name,
                type: 2,
                arrayElements: 1,
                isSRGB: false,
                isAutoregister: false
              }
            })),
            constantBuffer(0, backend),
            constantBuffer(2, backend),
            constantBuffer(4, backend)
          ]
        }
      ]
    },
    metadata: {
      sourcePath: source,
      bodyIndex: 0,
      selectedOptions: selectedOptions(),
      wgslSelection: {
        mode: "explicit",
        completePasses: true,
        techniqueName: "Main",
        passIndex: 0,
        requestedStageNames: [ "vertex", "pixel" ],
        selectedStageKeys: [ "Main.pass0.vertex", "Main.pass0.pixel" ]
      }
    },
    pipeline: {
      techniqueName: "Main",
      passIndex: 0,
      renderStates: 1,
      states: structuredClone(PASS_STATES),
      shaderModules: [
        {
          key: "Main.pass0.vertex",
          techniqueName: "Main",
          passIndex: 0,
          stageName: "vertex",
          stageType: 0,
          entryPoint: "main",
          threadGroupSize: null,
          wgsl: vertexWgsl
        },
        {
          key: "Main.pass0.pixel",
          techniqueName: "Main",
          passIndex: 0,
          stageName: "pixel",
          stageType: 1,
          entryPoint: "main",
          threadGroupSize: null,
          wgsl: pixelWgsl
        }
      ],
      bindGroups: [ {
        group: 0,
        bindings: [
          ...UNIFORMS.map(([ registerIndex, slot, visibility, minBindingSize ]) =>
            binding("uniform-buffer", registerIndex, slot, visibility, {
              buffer: { type: "uniform", hasDynamicOffset: false, minBindingSize }
            })),
          ...TEXTURES.map(([ registerIndex, slot ]) =>
            binding("sampled-resource", registerIndex, slot, "fragment", {
              texture: { sampleType: "float", viewDimension: "2d", multisampled: false }
            })),
          ...SAMPLERS.map(([ registerIndex, slot ]) =>
            binding("sampler", registerIndex, slot, "fragment", {
              sampler: { type: "filtering" }
            }))
        ]
      } ]
    }
  };
}

function floatAt(bytes, offset)
{
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getFloat32(offset, true);
}

test("DecalGlowV5 validates its exact two-texture backend contract", () =>
{
  const dx11 = record("dx11");
  const dx12 = record("dx12");
  const pair = [ dx11, dx12 ];
  assert.equal(validateDecalGlowV5PackageRecord(dx11), dx11);
  assert.equal(validateDecalGlowV5PackagePair(pair), pair);

  const plan = getDecalGlowV5ResourcePlan(dx12);
  assert.deepEqual(
    plan.textures.map((entry) => entry.name),
    [ "DecalTransparencyMap", "DecalGlowMap" ]
  );
  assert.deepEqual(
    plan.samplers.map((entry) => entry.name),
    [ "DecalTransparencySampler", "DecalGlowSampler" ]
  );
  assert.deepEqual(
    plan.textures.map((entry) => entry.scopeIdentity),
    [ "sampled-resource:0:0@fragment", "sampled-resource:0:1@fragment" ]
  );
  assert.deepEqual(
    plan.samplers.map((entry) => entry.scopeIdentity),
    [ "sampler:0:0@fragment", "sampler:0:1@fragment" ]
  );
});

test("DecalGlowV5 supplies reflected material, object data, textures, and sampler states", () =>
{
  const fixture = createDecalGlowV5FixtureValues(
    DECAL_GLOW_V5_TARGET_WIDTH,
    DECAL_GLOW_V5_TARGET_HEIGHT
  );
  assert.equal(fixture.vertices.byteLength, 13 * DECAL_GLOW_V5_VERTEX_BUFFER_LAYOUT.arrayStride);
  assert.equal(fixture.indices.length, 36);
  assert.deepEqual(
    fixture.textures.map((entry) => entry.name),
    [
      "DecalTransparencyMap",
      "DecalGlowMap",
      "WhiteDecalTransparencyMap",
      "WhiteDecalGlowMap"
    ]
  );
  assert.ok(fixture.textures.slice(0, 2).every((entry) => new Set(entry.data).size > 2));
  const transparency = fixture.textures[0];
  for (let coordinate = 0; coordinate < 8; coordinate += 1)
  {
    for (const [ x, y ] of [
      [ coordinate, 0 ],
      [ coordinate, 7 ],
      [ 0, coordinate ],
      [ 7, coordinate ]
    ])
    {
      assert.equal(transparency.data[y * transparency.bytesPerRow + x * 4], 0);
    }
  }
  assert.deepEqual(fixture.textureResourceVariants, {
    base: {},
    whiteTransparency: { DecalTransparencyMap: "WhiteDecalTransparencyMap" },
    whiteGlow: { DecalGlowMap: "WhiteDecalGlowMap" }
  });
  assert.deepEqual(
    fixture.samplers.map(({ name, addressModeU, addressModeV }) =>
      [ name, addressModeU, addressModeV ]),
    [
      [ "DecalTransparencySampler", "clamp-to-edge", "clamp-to-edge" ],
      [ "DecalGlowSampler", "repeat", "repeat" ]
    ]
  );
  assert.deepEqual(DECAL_GLOW_V5_CLEAR_TARGET, [ 0, 255, 0, 255 ]);

  const decalVS = fixture.decalUniformData["uniform-buffer:0:3@vertex"];
  const decalPS = fixture.decalUniformData["uniform-buffer:0:4@fragment"];
  assert.equal(decalVS.byteLength, 384);
  assert.equal(decalPS.byteLength, 32);
  assert.deepEqual(
    Array.from(new Float32Array(decalVS.buffer, decalVS.byteOffset, decalVS.byteLength / 4)),
    Array.from({ length: 96 }, (_, index) =>
      index % 16 === 0 || index % 16 === 5 || index % 16 === 10 || index % 16 === 15 ? 1 : 0)
  );
  assert.deepEqual(
    Array.from(new Float32Array(decalPS.buffer, decalPS.byteOffset, decalPS.byteLength / 4)),
    [ 0, 1, 0, 0, 0, 1, 0, 0 ]
  );

  const dx11 = buildEveSpaceObjectMainUniformData(record("dx11"), fixture.bindingValues, { materialLayout: materialLayout("dx11") });
  const dx12 = buildEveSpaceObjectMainUniformData(record("dx12"), fixture.bindingValues, { materialLayout: materialLayout("dx12") });
  const dx11Material = dx11["uniform-buffer:0:0@fragment"];
  const dx12Material = dx12["uniform-buffer:0:0@fragment"];
  assert.equal(dx11Material.byteLength, 64);
  assert.equal(dx12Material.byteLength, 64);
  assert.equal(floatAt(dx11Material, 0), Math.fround(-0.25));
  assert.equal(floatAt(dx11Material, 16), Math.fround(0.61));
  assert.equal(floatAt(dx11Material, 32), Math.fround(0.85));
  assert.equal(floatAt(dx11Material, 48), Math.fround(0.78));
  assert.equal(floatAt(dx12Material, 0), Math.fround(0.78));
  assert.equal(floatAt(dx12Material, 16), Math.fround(-0.25));
  assert.equal(floatAt(dx12Material, 32), Math.fround(0.61));
  assert.equal(floatAt(dx12Material, 48), Math.fround(0.85));
});

test("DecalGlowV5 rejects provenance, sampler, material-layout, and pair drift", () =>
{
  const wrongSource = record("dx11");
  wrongSource.analysis.source = wrongSource.analysis.source.replace("decalglow", "decal");
  assert.throws(
    () => validateDecalGlowV5PackageRecord(wrongSource),
    /source provenance/u
  );

  const wrongPass = record("dx11");
  wrongPass.analysis.passes[0].states[5].value = 0;
  assert.throws(
    () => validateDecalGlowV5PackageRecord(wrongPass),
    /render states/u
  );

  const wrongPixelInput = record("dx12");
  wrongPixelInput.analysis.stages[1].pipelineInputs[0].usedMask = 8;
  assert.throws(
    () => validateDecalGlowV5PackageRecord(wrongPixelInput),
    /pixel.*input contract/u
  );

  const wrongSampler = record("dx11");
  wrongSampler.analysis.stages[1].bindings
    .find((entry) => entry.kind === "sampler" && entry.registerIndex === 0)
    .carbon.sampler.borderColor[0] = 1;
  assert.throws(
    () => validateDecalGlowV5PackageRecord(wrongSampler),
    /sampler state/u
  );

  const wrongMaterial = record("dx12");
  wrongMaterial.analysis.stages[1].bindings
    .find((entry) => entry.kind === "constantBuffer" && entry.registerIndex === 0)
    .carbon.constants[0].name = "DecalTextureScaling";
  assert.throws(
    () => validateDecalGlowV5PackageRecord(wrongMaterial),
    /DecalGlowColor/u
  );

  const shifted = record("dx12");
  shifted.pipeline.bindGroups[0].bindings[6].binding += 1;
  assert.throws(
    () => validateDecalGlowV5PackageRecord(shifted),
    /unexpected slot/u
  );

  const left = record("dx11");
  const right = record("dx12");
  right.pipeline.shaderModules = structuredClone(left.pipeline.shaderModules);
  assert.throws(
    () => validateDecalGlowV5PackagePair([ left, right ]),
    /identical WGSL/u
  );
});
