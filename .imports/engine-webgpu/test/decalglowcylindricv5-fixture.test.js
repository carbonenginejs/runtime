import assert from "node:assert/strict";
import test from "node:test";

import {
  DECAL_GLOW_CYLINDRIC_V5_CLEAR_TARGET,
  DECAL_GLOW_CYLINDRIC_V5_SELECTION,
  DECAL_GLOW_CYLINDRIC_V5_TARGET_HEIGHT,
  DECAL_GLOW_CYLINDRIC_V5_TARGET_WIDTH,
  DECAL_GLOW_CYLINDRIC_V5_VERTEX_BUFFER_LAYOUT,
  createDecalGlowCylindricV5FixtureValues,
  getDecalGlowCylindricV5ResourcePlan,
  validateDecalGlowCylindricV5PackagePair,
  validateDecalGlowCylindricV5PackageRecord
} from "../harness/webgpu/decalGlowCylindricV5Fixture.js";
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
  return Object.entries(DECAL_GLOW_CYLINDRIC_V5_SELECTION).map(([ name, value ]) => ({
    name,
    value,
    optionIndex: 0,
    defaultOption: 0,
    defaultValue: value,
    source: "local"
  }));
}

function pipelineBinding(resourceKind, registerIndex, slot, visibility, layout)
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
    binding: slot,
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

function resource(registerIndex, name)
{
  return {
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
  };
}

function samplerReflection()
{
  return {
    kind: "sampler",
    registerSpace: 0,
    registerIndex: 0,
    carbon: {
      name: null,
      sampler: {
        comparison: false,
        minFilter: 3,
        magFilter: 2,
        mipFilter: 2,
        addressU: 1,
        addressV: 1,
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
    `res:/graphics/effect.${backend}/managed/space/decals/v5/` +
    "unpacked_decalglowcylindricv5.sm_hi";
  const vertexWgsl = `// ${backend}
struct VertexInput {
  @location(0) input0: vec3<f32>,
  @location(2) input2: vec2<f32>,
  @location(3) input3: vec3<f32>,
  @location(4) input4: vec3<f32>,
  @location(5) input5: vec3<f32>,
};
struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(1) output1: vec4<f32>,
  @location(2) output2: vec4<f32>,
  @location(3) output3: vec4<f32>,
  @location(4) output4: vec4<f32>,
  @location(5) output5: vec4<f32>,
  @location(6) output6: vec4<f32>,
  @location(7) output7: vec4<f32>,
  @location(8) output8: vec4<f32>,
  @location(9) output9: vec4<f32>,
};
@vertex fn main(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  output.position = vec4<f32>(input.input0, 1.0);
  return output;
}`;
  const pixelWgsl = `// ${backend}
struct FragmentInput {
  @location(1) input1: vec4<f32>,
  @location(5) input5: vec4<f32>,
  @location(8) input8: vec4<f32>,
};
struct FragmentOutput {
  @location(0) output0: vec4<f32>,
};
@fragment fn main(input: FragmentInput) -> FragmentOutput {
  var output: FragmentOutput;
  output.output0 = input.input1 + input.input5 + input.input8;
  return output;
}`;
  return {
    backend,
    label: `${backend}.carbonwebgpu`,
    filePath: `E:/fixtures/unpacked_decalglowcylindricv5.${backend}.carbonwebgpu`,
    resourcePath: `res:/webgpu-harness/decalglowcylindricv5/${backend}.carbonwebgpu`,
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
          stageType: 0,
          threadGroupSize: { x: 0, y: 0, z: 0 },
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
          stageType: 1,
          threadGroupSize: { x: 0, y: 0, z: 0 },
          pipelineInputs: [
            { registerIndex: 1, dimension: 4, type: 0, usedMask: 12 },
            { registerIndex: 5, dimension: 4, type: 0, usedMask: 8 },
            { registerIndex: 8, dimension: 4, type: 0, usedMask: 8 }
          ],
          bindings: [
            // Reflected on both backends: DX12 declares it in the root
            // signature, and the reflected state is identical.
            samplerReflection(),
            ...TEXTURES.map(([ registerIndex, _slot, name ]) =>
              resource(registerIndex, name)),
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
      key: "Main.pass0",
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
            pipelineBinding("uniform-buffer", registerIndex, slot, visibility, {
              buffer: { type: "uniform", hasDynamicOffset: false, minBindingSize },
              texture: null,
              sampler: null
            })),
          ...TEXTURES.map(([ registerIndex, slot ]) =>
            pipelineBinding("sampled-resource", registerIndex, slot, "fragment", {
              buffer: null,
              texture: { sampleType: "float", viewDimension: "2d", multisampled: false },
              sampler: null
            })),
          pipelineBinding("sampler", 0, 7, "fragment", {
            buffer: null,
            texture: null,
            sampler: { type: "filtering" }
          })
        ]
      } ]
    }
  };
}

function floatAt(bytes, offset)
{
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    .getFloat32(offset, true);
}

test("DecalGlowCylindricV5 validates its exact shared-sampler contract", () =>
{
  const dx11 = record("dx11");
  const dx12 = record("dx12");
  const pair = [ dx11, dx12 ];
  assert.equal(validateDecalGlowCylindricV5PackageRecord(dx11), dx11);
  assert.equal(validateDecalGlowCylindricV5PackagePair(pair), pair);

  const plan = getDecalGlowCylindricV5ResourcePlan(dx12);
  assert.deepEqual(
    plan.textures.map((entry) => [ entry.name, entry.binding ]),
    [ [ "DecalTransparencyMap", 5 ], [ "DecalGlowMap", 6 ] ]
  );
  assert.deepEqual(
    plan.samplers.map((entry) => [ entry.name, entry.binding ]),
    [ [ "Sampler0", 7 ] ]
  );
});

test("DecalGlowCylindricV5 supplies deterministic cylindrical inputs and controls", () =>
{
  const fixture = createDecalGlowCylindricV5FixtureValues(
    DECAL_GLOW_CYLINDRIC_V5_TARGET_WIDTH,
    DECAL_GLOW_CYLINDRIC_V5_TARGET_HEIGHT
  );
  assert.equal(
    fixture.vertices.byteLength,
    13 * DECAL_GLOW_CYLINDRIC_V5_VERTEX_BUFFER_LAYOUT.arrayStride
  );
  for (let offset = 2; offset < fixture.vertices.length; offset += 16)
  {
    assert.equal(fixture.vertices[offset], 0.25);
  }
  assert.equal(fixture.indices.length, 36);
  assert.deepEqual(
    fixture.textures.map((entry) => entry.name),
    [
      "DecalTransparencyMap",
      "DecalGlowMap",
      "WhiteDecalTransparencyMap",
      "WhiteDecalGlowMap",
      "HalfDecalTransparencyMap",
      "HalfDecalGlowMap"
    ]
  );
  assert.equal(fixture.textures[0].data[0], 32);
  assert.equal(fixture.textures[0].data[7 * 4], 172);
  assert.equal(fixture.textures[1].data[0], 192);
  assert.equal(fixture.textures[1].data[7 * 4], 80);
  assert.equal(fixture.textures[4].data[0], 128);
  assert.equal(fixture.textures[5].data[0], 128);
  assert.deepEqual(Object.keys(fixture.textureResourceVariants), [
    "base",
    "whiteTransparency",
    "whiteGlow",
    "whiteBoth",
    "halfTransparency",
    "halfGlow"
  ]);
  assert.deepEqual(
    fixture.textureResourceVariants.halfTransparency,
    {
      DecalTransparencyMap: "HalfDecalTransparencyMap",
      DecalGlowMap: "WhiteDecalGlowMap"
    }
  );
  assert.deepEqual(fixture.samplers, [ {
    name: "Sampler0",
    minFilter: "linear",
    magFilter: "linear",
    mipmapFilter: "linear",
    addressModeU: "repeat",
    addressModeV: "repeat",
    addressModeW: "clamp-to-edge",
    maxAnisotropy: 16
  } ]);
  assert.deepEqual(DECAL_GLOW_CYLINDRIC_V5_CLEAR_TARGET, [ 0, 255, 0, 255 ]);

  const decalVS = fixture.decalUniformData["uniform-buffer:0:3@vertex"];
  const decalPS = fixture.decalUniformData["uniform-buffer:0:4@fragment"];
  assert.equal(decalVS.byteLength, 384);
  assert.equal(decalPS.byteLength, 32);
  assert.deepEqual(
    Array.from(new Float32Array(decalPS.buffer, decalPS.byteOffset, decalPS.byteLength / 4)),
    [ 0, 1, 0, 0, 0, 1, 0, 0 ]
  );

  const dx11 = buildEveSpaceObjectMainUniformData(record("dx11"), fixture.bindingValues, { materialLayout: materialLayout("dx11") });
  const dx12 = buildEveSpaceObjectMainUniformData(record("dx12"), fixture.bindingValues, { materialLayout: materialLayout("dx12") });
  const dx11Material = dx11["uniform-buffer:0:0@fragment"];
  const dx12Material = dx12["uniform-buffer:0:0@fragment"];
  assert.equal(floatAt(dx11Material, 0), 0);
  assert.equal(floatAt(dx11Material, 12), 1);
  assert.equal(floatAt(dx11Material, 16), 0);
  assert.equal(floatAt(dx11Material, 32), Math.fround(0.85));
  assert.equal(floatAt(dx11Material, 48), Math.fround(0.78));
  assert.equal(floatAt(dx12Material, 0), Math.fround(0.78));
  assert.equal(floatAt(dx12Material, 16), 0);
  assert.equal(floatAt(dx12Material, 28), 1);
  assert.equal(floatAt(dx12Material, 32), 0);
  assert.equal(floatAt(dx12Material, 48), Math.fround(0.85));
});

test("DecalGlowCylindricV5 rejects provenance, interface, layout, and pair drift", () =>
{
  const wrongSource = record("dx11");
  wrongSource.analysis.source = wrongSource.analysis.source.replace("glowcylindric", "glow");
  assert.throws(
    () => validateDecalGlowCylindricV5PackageRecord(wrongSource),
    /source provenance/u
  );

  const wrongInput = record("dx12");
  wrongInput.analysis.stages[1].pipelineInputs[2].usedMask = 4;
  assert.throws(
    () => validateDecalGlowCylindricV5PackageRecord(wrongInput),
    /cylindrical input contract/u
  );

  const missingLocation = record("dx12");
  missingLocation.pipeline.shaderModules[1].wgsl =
    missingLocation.pipeline.shaderModules[1].wgsl.replaceAll("input8", "value8");
  assert.throws(
    () => validateDecalGlowCylindricV5PackageRecord(missingLocation),
    /pixel module interface/u
  );

  const missingVertexOutput = record("dx12");
  missingVertexOutput.pipeline.shaderModules[0].wgsl =
    missingVertexOutput.pipeline.shaderModules[0].wgsl
      .replace("  @location(8) output8: vec4<f32>,\n", "");
  assert.throws(
    () => validateDecalGlowCylindricV5PackageRecord(missingVertexOutput),
    /vertex module interface/u
  );

  const wrongStageType = record("dx12");
  wrongStageType.analysis.stages[0].stageType = 1;
  assert.throws(
    () => validateDecalGlowCylindricV5PackageRecord(wrongStageType),
    /stage key, type/u
  );

  const wrongThreadGroup = record("dx12");
  wrongThreadGroup.analysis.stages[1].threadGroupSize.x = 1;
  assert.throws(
    () => validateDecalGlowCylindricV5PackageRecord(wrongThreadGroup),
    /thread-group metadata/u
  );

  const wrongPipelineKey = record("dx12");
  wrongPipelineKey.pipeline.key = "Main.pass1";
  assert.throws(
    () => validateDecalGlowCylindricV5PackageRecord(wrongPipelineKey),
    /render states/u
  );

  const wrongPass = record("dx11");
  wrongPass.analysis.passes[0].states[5].value = 0;
  assert.throws(
    () => validateDecalGlowCylindricV5PackageRecord(wrongPass),
    /render states/u
  );

  const wrongSampler = record("dx11");
  wrongSampler.analysis.stages[1].bindings[0].carbon.sampler.addressU = 4;
  assert.throws(
    () => validateDecalGlowCylindricV5PackageRecord(wrongSampler),
    /static wrap state/u
  );

  const unexpectedDx12Sampler = record("dx12");
  unexpectedDx12Sampler.analysis.stages[1].bindings.unshift(samplerReflection());
  assert.throws(
    () => validateDecalGlowCylindricV5PackageRecord(unexpectedDx12Sampler),
    /binding count/u
  );

  const wrongMaterial = record("dx12");
  wrongMaterial.analysis.stages[1].bindings
    .find((entry) => entry.kind === "constantBuffer" && entry.registerIndex === 0)
    .carbon.constants[0].name = "DecalTextureScaling";
  assert.throws(
    () => validateDecalGlowCylindricV5PackageRecord(wrongMaterial),
    /DecalGlowColor/u
  );

  const shifted = record("dx12");
  shifted.pipeline.bindGroups[0].bindings[7].binding = 8;
  assert.throws(
    () => validateDecalGlowCylindricV5PackageRecord(shifted),
    /canonical binding slot/u
  );

  const left = record("dx11");
  const right = record("dx12");
  right.pipeline.shaderModules = structuredClone(left.pipeline.shaderModules);
  assert.throws(
    () => validateDecalGlowCylindricV5PackagePair([ left, right ]),
    /identical WGSL/u
  );
});
