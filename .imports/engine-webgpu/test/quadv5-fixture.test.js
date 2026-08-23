import assert from "node:assert/strict";
import { test } from "node:test";

import {
  QUADV5_CLEAR_TARGETS,
  QUADV5_PPT_SELECTION,
  QUADV5_SKINNED_HEAT_DETAIL_PPT_SELECTION,
  QUADV5_SKINNED_HEAT_PPT_SELECTION,
  QUADV5_SKINNED_PPT_SELECTION,
  QUADV5_SKINNED_VERTEX_BUFFER_LAYOUT,
  QUADV5_TARGET_HEIGHT,
  QUADV5_TARGET_WIDTH,
  QUADV5_VERTEX_BUFFER_LAYOUT,
  createQuadV5FixtureValues,
  createQuadV5HeatBindingCases,
  createQuadV5HeatDetailBindingCases,
  createQuadV5MainBindingValues,
  getQuadV5ResourcePlan,
  validateQuadV5PackagePair,
  validateQuadV5PackageRecord
} from "../harness/webgpu/quadV5Fixture.js";

const RESOURCE_NAMES = [
  "EveSpaceSceneEnvMap",
  "SSAOMap",
  "EveSpaceSceneShadowMap",
  "NormalMap",
  "GlowMap",
  "AlbedoMap",
  "RoughnessMap",
  "MaterialMap",
  "PaintMaskMap",
  "PatternMask1Map",
  "PatternMask2Map"
];

const RESOURCE_REGISTERS = {
  dx11: [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ],
  dx12: [ 0, 1, 2, 3, 4, 6, 7, 9, 10, 11, 12 ]
};

const HEAT_DETAIL_RESOURCE_NAMES = [
  ...RESOURCE_NAMES,
  "HeatGlowNoiseMap",
  "Detail1Map",
  "Detail2Map"
];

const HEAT_RESOURCE_NAMES = [
  ...RESOURCE_NAMES,
  "HeatGlowNoiseMap"
];

const HEAT_DETAIL_RESOURCE_REGISTERS = {
  dx11: [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13 ],
  dx12: [ 0, 1, 2, 3, 4, 6, 7, 9, 10, 11, 12, 13, 14, 15 ]
};

const HEAT_RESOURCE_REGISTERS = {
  dx11: [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 ],
  dx12: [ 0, 1, 2, 3, 4, 6, 7, 9, 10, 11, 12, 13 ]
};

const HIGH_RESOURCE_NAMES = [
  "EveSpaceSceneEnvMap",
  "SSAOMap",
  "EveSpaceSceneShadowMap",
  "NormalMap",
  "GlowMap",
  "DustNoiseMap",
  "AlbedoMap",
  "RoughnessMap",
  "DirtMap",
  "MaterialMap",
  "PaintMaskMap",
  "PatternMask1Map",
  "PatternMask2Map"
];

const HIGH_RESOURCE_REGISTERS = {
  dx11: [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 ],
  dx12: [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 ]
};

const HIGH_STORAGE = [
  { name: "LightIndexBuffer", stride: 4, registers: { dx11: 13, dx12: 14 } },
  { name: "LightBuffer", stride: 48, registers: { dx11: 14, dx12: 15 } }
];

const HIGH_ARRAY_TEXTURE = {
  name: "LightProfileArray",
  registers: { dx11: 15, dx12: 16 }
};

// The producer merges Detail1Map and Detail2Map into one 2d-array binding in
// Detail1Map's slot and removes Detail2Map's binding, so the heat-detail layout
// is one binding shorter than its reflection.
const HEAT_DETAIL_MERGE_REGISTERS = { dx11: [ 12, 13 ], dx12: [ 14, 15 ] };

function heatDetailTransform(backend)
{
  const [ first, second ] = HEAT_DETAIL_MERGE_REGISTERS[backend];
  return {
    id: `Main.pass0:detail-map-array:sampled-resource:0:${first}`,
    kind: "texture-2d-array",
    version: 1,
    layoutKey: "Main.pass0",
    stage: "fragment",
    representation: "native-or-rgba8",
    missingLayer: "reject",
    group: 0,
    binding: 18,
    output: {
      name: "DetailArrayMap",
      identity: `sampled-resource:0:${first}`,
      scopeIdentity: `sampled-resource:0:${first}@fragment`,
      viewDimension: "2d-array",
      layerCount: 2
    },
    inputs: [
      {
        parameter: "Detail1Map",
        layer: 0,
        identity: `sampled-resource:0:${first}`,
        scopeIdentity: `sampled-resource:0:${first}@fragment`
      },
      {
        parameter: "Detail2Map",
        layer: 1,
        identity: `sampled-resource:0:${second}`,
        scopeIdentity: `sampled-resource:0:${second}@fragment`
      }
    ]
  };
}

const HIGH_MATERIAL_CONSTANTS = [
  [ "GeneralData", 0 ],
  [ "GeneralGlowColor", 16 ],
  [ "Mtl1DiffuseColor", 32 ],
  [ "Mtl2DiffuseColor", 48 ],
  [ "Mtl3DiffuseColor", 64 ],
  [ "Mtl4DiffuseColor", 80 ],
  [ "Mtl1FresnelColor", 96 ],
  [ "Mtl2FresnelColor", 112 ],
  [ "Mtl3FresnelColor", 128 ],
  [ "Mtl4FresnelColor", 144 ],
  [ "Mtl1Gloss", 160 ],
  [ "Mtl2Gloss", 176 ],
  [ "Mtl3Gloss", 192 ],
  [ "Mtl4Gloss", 208 ],
  [ "Mtl1DustDiffuseColor", 224 ],
  [ "Mtl2DustDiffuseColor", 240 ],
  [ "Mtl3DustDiffuseColor", 256 ],
  [ "Mtl4DustDiffuseColor", 272 ],
  [ "PMtl1DiffuseColor", 288 ],
  [ "PMtl1FresnelColor", 304 ],
  [ "PMtl1Gloss", 320 ],
  [ "PMtl2DiffuseColor", 336 ],
  [ "PMtl2FresnelColor", 352 ],
  [ "PMtl2Gloss", 368 ]
];

const HEAT_DETAIL_MATERIAL_CONSTANTS = [
  [ "GeneralData", 0 ],
  [ "Mtl1DiffuseColor", 32 ],
  [ "Mtl2DiffuseColor", 48 ],
  [ "Mtl3DiffuseColor", 64 ],
  [ "Mtl4DiffuseColor", 80 ],
  [ "Mtl1FresnelColor", 96 ],
  [ "Mtl2FresnelColor", 112 ],
  [ "Mtl3FresnelColor", 128 ],
  [ "Mtl4FresnelColor", 144 ],
  [ "Mtl1Gloss", 160 ],
  [ "Mtl2Gloss", 176 ],
  [ "Mtl3Gloss", 192 ],
  [ "Mtl4Gloss", 208 ],
  [ "PMtl1DiffuseColor", 288 ],
  [ "PMtl1FresnelColor", 304 ],
  [ "PMtl1Gloss", 320 ],
  [ "PMtl2DiffuseColor", 336 ],
  [ "PMtl2FresnelColor", 352 ],
  [ "PMtl2Gloss", 368 ],
  [ "Mtl1HeatGlowData", 384 ],
  [ "Mtl2HeatGlowData", 400 ],
  [ "Mtl3HeatGlowData", 416 ],
  [ "Mtl4HeatGlowData", 432 ],
  [ "GeneralHeatGlowColor", 448 ],
  [ "Detail1Data", 464 ],
  [ "Detail2Data", 480 ],
  [ "SecondaryDetail2Data", 496 ],
  [ "Detail3Data", 512 ],
  [ "DetailAlbedoColor", 528 ],
  [ "DetailFresnelColor", 544 ],
  [ "DetailSelector", 624 ]
];

const HEAT_MATERIAL_CONSTANTS = HEAT_DETAIL_MATERIAL_CONSTANTS.slice(0, 24);

const HEAT_DETAIL_VERTEX_INPUTS = [
  { usageName: "POSITION", usageIndex: 0, registerIndex: 0, usedMask: 7, type: 0, dimension: 3 },
  { usageName: "BLENDINDICES", usageIndex: 0, registerIndex: 1, usedMask: 1, type: 2, dimension: 4 },
  { usageName: "TEXCOORD", usageIndex: 0, registerIndex: 2, usedMask: 3, type: 0, dimension: 2 },
  { usageName: "NORMAL", usageIndex: 0, registerIndex: 3, usedMask: 7, type: 0, dimension: 3 },
  { usageName: "TANGENT", usageIndex: 0, registerIndex: 4, usedMask: 7, type: 0, dimension: 3 },
  { usageName: "BITANGENT", usageIndex: 0, registerIndex: 5, usedMask: 7, type: 0, dimension: 3 },
  { usageName: "TEXCOORD", usageIndex: 1, registerIndex: 6, usedMask: 3, type: 0, dimension: 2 }
];

const HEAT_DETAIL_PIXEL_INPUTS = [
  { usageName: "TEXCOORD", usageIndex: 0, registerIndex: 1, usedMask: 3, type: 0, dimension: 4 },
  { usageName: "TEXCOORD", usageIndex: 1, registerIndex: 2, usedMask: 7, type: 0, dimension: 3 },
  { usageName: "TEXCOORD", usageIndex: 2, registerIndex: 3, usedMask: 7, type: 0, dimension: 3 },
  { usageName: "TEXCOORD", usageIndex: 3, registerIndex: 4, usedMask: 7, type: 0, dimension: 3 },
  { usageName: "TEXCOORD", usageIndex: 4, registerIndex: 5, usedMask: 15, type: 0, dimension: 4 },
  { usageName: "TEXCOORD", usageIndex: 5, registerIndex: 6, usedMask: 0, type: 0, dimension: 4 },
  { usageName: "TEXCOORD", usageIndex: 6, registerIndex: 7, usedMask: 15, type: 0, dimension: 4 },
  { usageName: "TEXCOORD", usageIndex: 8, registerIndex: 8, usedMask: 0, type: 0, dimension: 4 },
  { usageName: "TEXCOORD", usageIndex: 9, registerIndex: 9, usedMask: 11, type: 0, dimension: 4 }
];

const ANISOTROPIC_REPEAT = {
  minFilter: 3, magFilter: 2, mipFilter: 2,
  addressU: 1, addressV: 1, addressW: 3
};

// The High light-profile sampler is not a copy of s0: linear, no mip filter,
// clamped on every axis.
const LINEAR_CLAMP = {
  minFilter: 2, magFilter: 2, mipFilter: 0,
  addressU: 3, addressV: 3, addressW: 3
};

function samplerState(isDynamic, filters = ANISOTROPIC_REPEAT)
{
  return {
    comparison: false,
    ...filters,
    mipLODBias: 0,
    maxAnisotropy: 16,
    isDynamic
  };
}

// DX12 declares every unnamed sampler as an immutable root-signature sampler.
// Its wire record stores a border-colour enum and no dynamic flag, but the
// reader resolves both the way Carbon does, so the reflected state matches the
// stage sampler exactly and only `sourceTruth` marks the declaration.
function staticSamplerState(filters = ANISOTROPIC_REPEAT)
{
  return {
    comparison: false,
    ...filters,
    mipLODBias: 0,
    maxAnisotropy: 16,
    borderColor: [ 0, 0, 0, 0 ],
    isDynamic: false
  };
}

function heatDetailVertexWgsl()
{
  return `struct VertexInput {
  @location(0) input0: vec3<f32>,
  @location(1) input1: vec4<u32>,
  @location(2) input2: vec2<f32>,
  @location(3) input3: vec3<f32>,
  @location(4) input4: vec3<f32>,
  @location(5) input5: vec3<f32>,
  @location(6) input6: vec2<f32>,
};
struct VertexOutput {
  @invariant @builtin(position) position: vec4<f32>,
  @location(1) output1: vec4<f32>,
  @location(2) output2: vec3<f32>,
  @location(3) output3: vec3<f32>,
  @location(4) output4: vec3<f32>,
  @location(5) output5: vec4<f32>,
  @location(6) output6: vec4<f32>,
  @location(7) output7: vec4<f32>,
  @location(8) output8: vec4<f32>,
  @location(9) output9: vec4<f32>,
};`;
}

function heatDetailPixelWgsl()
{
  return `struct FragmentInput {
  @builtin(position) position: vec4<f32>,
  @location(1) input1: vec4<f32>,
  @location(2) input2: vec3<f32>,
  @location(3) input3: vec3<f32>,
  @location(4) input4: vec3<f32>,
  @location(5) input5: vec4<f32>,
  @location(7) input7: vec4<f32>,
  @location(9) input9: vec4<f32>,
};
struct FragmentOutput {
  @location(0) output0: vec4<f32>,
  @location(1) output1: vec4<f32>,
};`;
}

function selections(variant = "static")
{
  const provenance = {
    BINDLESS_RENDERING: [ 0, 0, "BINDLESS_RENDERING_DISABLED" ],
    SPACE_OBJECT_CLIPPING: [ 0, 0, "SOC_DISABLED" ],
    SPACE_OBJECT_PPT_ENABLED: [ 1, 0, "SOPPT_DISABLED" ],
    SPACE_OBJECT_TRANSPARENCY: [ 0, 0, "SOT_OPAQUE" ],
    V5_DEBUG: [ 0, 0, "OFF" ],
    SPACE_OBJECT_INSTANCED_ATTACHMENT: [ 0, 0, "SOIA_DISABLED" ],
    BLEND_MODE: [ 0, 0, "BLEND_MODE_OVERLAY" ]
  };
  const selection = variant === "skinnedHeat"
    ? QUADV5_SKINNED_HEAT_PPT_SELECTION
    : (variant === "skinnedHeatDetail"
      ? QUADV5_SKINNED_HEAT_DETAIL_PPT_SELECTION
      : (variant === "skinned" ? QUADV5_SKINNED_PPT_SELECTION : QUADV5_PPT_SELECTION));
  return Object.entries(selection).map(([ name, value ]) => ({
    name,
    value,
    optionIndex: provenance[name][0],
    defaultOption: provenance[name][1],
    defaultValue: provenance[name][2],
    source: "local"
  }));
}

function binding(resourceKind, registerIndex, bindingIndex, visibility, layout)
{
  const identity = `${resourceKind}:0:${registerIndex}`;
  return {
    identity,
    scopeIdentity: `${identity}@${visibility}`,
    sourceTruth: "wgsl-layout",
    resourceKind,
    registerSpace: 0,
    registerIndex,
    group: 0,
    binding: bindingIndex,
    visibility: [ visibility ],
    dynamic: false,
    layout
  };
}

function analysisConstantBuffer(registerIndex, localConstants = null)
{
  return {
    kind: "constantBuffer",
    generatedSymbol: `cb${registerIndex}`,
    registerIndex,
    registerType: 0,
    registerSpace: 0,
    registerCount: 1,
    arrayCount: 1,
    dynamic: true,
    metadataName: localConstants ? "$LocalConstants" : null,
    carbon: localConstants
      ? {
        hasLocalConstants: true,
        ...localConstants
      }
      : {
        hasLocalConstants: false,
        constantValueSize: 0,
        constants: []
      }
  };
}

function unnamedSampler(backend, registerIndex, filters)
{
  return backend === "dx11" ? {
    kind: "sampler",
    registerSpace: 0,
    registerIndex,
    carbon: {
      name: null,
      sampler: samplerState(false, filters)
    }
  } : {
    kind: "sampler",
    registerSpace: 0,
    registerIndex,
    dynamic: false,
    sourceTruth: "carbon-signature-sampler",
    carbon: {
      name: null,
      sampler: staticSamplerState(filters)
    }
  };
}

function analysisPixelBindings(backend, heat = false, heatDetail = false, tier = "medium")
{
  const high = tier === "high";
  const names = high
    ? HIGH_RESOURCE_NAMES
    : (heatDetail
      ? HEAT_DETAIL_RESOURCE_NAMES
      : (heat ? HEAT_RESOURCE_NAMES : RESOURCE_NAMES));
  const registers = (high
    ? HIGH_RESOURCE_REGISTERS
    : (heatDetail
      ? HEAT_DETAIL_RESOURCE_REGISTERS
      : (heat ? HEAT_RESOURCE_REGISTERS : RESOURCE_REGISTERS)))[backend];
  const resources = registers.map((registerIndex, index) => ({
    kind: "resource",
    registerSpace: 0,
    registerIndex,
    registerType: index === 0 ? 41 : 36,
    carbon: {
      name: names[index],
      type: index === 0 ? 4 : 2,
      arrayElements: 1,
      isSRGB: index === 0 || names[index] === "AlbedoMap",
      isAutoregister: names[index] === "EveSpaceSceneShadowMap"
    }
  }));
  if (high)
  {
    for (const entry of HIGH_STORAGE)
    {
      resources.push({
        kind: "resource",
        registerSpace: 0,
        registerIndex: entry.registers[backend],
        registerType: 33,
        carbon: {
          name: entry.name,
          type: 7,
          arrayElements: 1,
          isSRGB: false,
          isAutoregister: true
        }
      });
    }
    resources.push({
      kind: "resource",
      registerSpace: 0,
      registerIndex: HIGH_ARRAY_TEXTURE.registers[backend],
      registerType: 37,
      carbon: {
        name: HIGH_ARRAY_TEXTURE.name,
        type: 5,
        arrayElements: 1,
        isSRGB: false,
        isAutoregister: true
      }
    });
  }
  const samplers = [
    unnamedSampler(backend, 0, ANISOTROPIC_REPEAT),
    {
      kind: "sampler",
      registerSpace: 0,
      registerIndex: 1,
      carbon: { name: "PatternMask1MapSampler", sampler: samplerState(true) }
    },
    {
      kind: "sampler",
      registerSpace: 0,
      registerIndex: 2,
      carbon: { name: "PatternMask2MapSampler", sampler: samplerState(true) }
    },
    ...(high ? [ unnamedSampler(backend, 3, LINEAR_CLAMP) ] : [])
  ];
  const strictHeat = heat || heatDetail;
  const localConstants = high
    ? { constantValueSize: 384, constants: HIGH_MATERIAL_CONSTANTS }
    : (strictHeat
      ? {
        constantValueSize: heatDetail ? 640 : 464,
        constants: heatDetail ? HEAT_DETAIL_MATERIAL_CONSTANTS : HEAT_MATERIAL_CONSTANTS
      }
      : null);
  const material = localConstants ? [ analysisConstantBuffer(0, {
      constantValueSize: localConstants.constantValueSize,
      constants: localConstants.constants.map(([ name, offset ]) => ({
        name,
        offset,
        size: 16,
        dimension: 4,
        type: 0,
        elements: 0
      }))
  }) ] : [];
  const sharedBuffers = strictHeat
    ? [ analysisConstantBuffer(2), analysisConstantBuffer(4) ]
    : [];
  return [ ...resources, ...samplers, ...material, ...sharedBuffers ];
}

function pipelineBindings(backend, skinned = false, heat = false, heatDetail = false, tier = "medium")
{
  const uniforms = [
    binding("uniform-buffer", 0, 0, "fragment", {
      buffer: {
        type: "uniform",
        hasDynamicOffset: false,
        minBindingSize: heatDetail ? 640 : (heat ? 464 : 384)
      }
    }),
    binding("uniform-buffer", 1, 1, "vertex", {
      buffer: { type: "uniform", hasDynamicOffset: false, minBindingSize: 512 }
    }),
    binding("uniform-buffer", 2, 2, "fragment", {
      buffer: { type: "uniform", hasDynamicOffset: false, minBindingSize: 352 }
    }),
    binding("uniform-buffer", 3, 3, "vertex", {
      buffer: { type: "uniform", hasDynamicOffset: false, minBindingSize: skinned ? 432 : 416 }
    }),
    binding("uniform-buffer", 4, 4, "fragment", {
      buffer: { type: "uniform", hasDynamicOffset: false, minBindingSize: 432 }
    })
  ];
  const bone = skinned ? [ {
    ...binding("sampled-resource", 0, 5, "vertex", {
      buffer: { type: "read-only-storage", hasDynamicOffset: false, minBindingSize: 48 }
    }),
    structureStride: 48
  } ] : [];
  const high = tier === "high";
  const names = high
    ? HIGH_RESOURCE_NAMES
    : (heatDetail
      ? HEAT_DETAIL_RESOURCE_NAMES
      : (heat ? HEAT_RESOURCE_NAMES : RESOURCE_NAMES));
  const registers = (high
    ? HIGH_RESOURCE_REGISTERS
    : (heatDetail
      ? HEAT_DETAIL_RESOURCE_REGISTERS
      : (heat ? HEAT_RESOURCE_REGISTERS : RESOURCE_REGISTERS)))[backend];
  let slot = 5 + (skinned ? 1 : 0);
  const merged = heatDetail ? HEAT_DETAIL_MERGE_REGISTERS[backend] : null;
  const textures = [];
  for (let index = 0; index < registers.length; index += 1)
  {
    const registerIndex = registers[index];
    // Detail2Map's binding does not survive the merge.
    if (merged && registerIndex === merged[1]) continue;
    const isMergedOutput = Boolean(merged) && registerIndex === merged[0];
    const viewDimension = index === 0 ? "cube" : (isMergedOutput ? "2d-array" : "2d");
    textures.push({
      ...binding("sampled-resource", registerIndex, slot, "fragment", {
        type: `texture_${viewDimension.replace("-", "_")}<f32>`,
        texture: {
          sampleType: "float",
          viewDimension,
          multisampled: false
        }
      }),
      textureKind: viewDimension,
      arrayElements: 1,
      isSRGB: index === 0 || names[index] === "AlbedoMap",
      ...(isMergedOutput
        ? { transformId: heatDetailTransform(backend).id, arrayLayerCount: 2 }
        : {})
    });
    slot += 1;
  }
  const lights = [];
  if (high)
  {
    for (const entry of HIGH_STORAGE)
    {
      lights.push({
        ...binding("sampled-resource", entry.registers[backend], slot, "fragment", {
          buffer: {
            type: "read-only-storage",
            hasDynamicOffset: false,
            minBindingSize: entry.stride
          }
        }),
        structureStride: entry.stride
      });
      slot += 1;
    }
    textures.push({
      ...binding("sampled-resource", HIGH_ARRAY_TEXTURE.registers[backend], slot, "fragment", {
        type: "texture_2d_array<f32>",
        texture: {
          sampleType: "float",
          viewDimension: "2d-array",
          multisampled: false
        }
      }),
      textureKind: "2d-array",
      arrayElements: 1,
      isSRGB: false
    });
    slot += 1;
  }
  const samplers = (high ? [ 0, 1, 2, 3 ] : [ 0, 1, 2 ]).map((registerIndex) =>
    binding("sampler", registerIndex, slot + registerIndex, "fragment", {
      sampler: { type: "filtering" }
    }));
  return [ ...uniforms, ...bone, ...lights, ...textures, ...samplers ];
}

function validRecord(backend = "dx11", variant = "static", tier = "medium")
{
  const skinned = variant === "skinned"
    || variant === "skinnedHeat"
    || variant === "skinnedHeatDetail";
  const heat = variant === "skinnedHeat";
  const heatDetail = variant === "skinnedHeatDetail";
  const strictHeat = heat || heatDetail;
  const selectedOptions = selections(variant);
  const stem = heatDetail
    ? "unpackedskinned_quadheatdetailv5"
    : (heat
      ? "unpackedskinned_quadheatv5"
      : (skinned ? "unpackedskinned_quadv5" : "unpacked_quadv5"));
  const tierSuffix = tier === "high" ? "sm_depth" : (tier === "low" ? "sm_lo" : "sm_hi");
  const source =
    `fixtures/shaders/effect.${backend}/managed/space/spaceobject/v5/quad/${stem}.${tierSuffix}`;
  return {
    backend,
    variant,
    label: "unpacked-quadv5-ppt-on.carbonwebgpu",
    filePath: `fixtures/packages/unpacked-quadv5-ppt-on-${backend}.carbonwebgpu`,
    resourcePath: `res:/webgpu-harness/quadv5/${backend}.carbonwebgpu`,
    analysis: {
      source,
      bodyIndex: 4,
      selectedOptions,
      passes: [ {
        techniqueName: "Main",
        passIndex: 0,
        renderStates: 1,
        states: []
      } ],
      stages: [
        {
          key: "Main.pass0.vertex",
          techniqueName: "Main",
          passIndex: 0,
          stageName: "vertex",
          stageType: 0,
          pipelineInputs: strictHeat ? HEAT_DETAIL_VERTEX_INPUTS.map((entry) => ({ ...entry })) : [
            { registerIndex: 0, dimension: 3, type: 0, usedMask: 7 },
            { registerIndex: 1, dimension: 4, type: 2, usedMask: skinned ? 1 : 0 },
            { registerIndex: 2, dimension: 2, type: 0, usedMask: 3 },
            { registerIndex: 3, dimension: 3, type: 0, usedMask: 7 },
            { registerIndex: 4, dimension: 3, type: 0, usedMask: 7 },
            { registerIndex: 5, dimension: 3, type: 0, usedMask: 7 },
            { registerIndex: 6, dimension: 2, type: 0, usedMask: 3 }
          ],
          bindings: skinned ? [
            ...(strictHeat
              ? [ analysisConstantBuffer(1), analysisConstantBuffer(3) ]
              : []),
            {
              kind: "resource",
              registerSpace: 0,
              registerIndex: 0,
              registerType: 33,
              carbon: {
                name: "BoneTransforms",
                type: 7,
                arrayElements: 1,
                isSRGB: false,
                isAutoregister: false
              }
            }
          ] : []
        },
        {
          key: "Main.pass0.pixel",
          techniqueName: "Main",
          passIndex: 0,
          stageName: "pixel",
          stageType: 1,
          pipelineInputs: strictHeat
            ? HEAT_DETAIL_PIXEL_INPUTS.map((entry) => ({ ...entry }))
            : [],
          bindings: analysisPixelBindings(backend, heat, heatDetail, tier)
        }
      ]
    },
    metadata: {
      sourcePath: source,
      bodyIndex: 4,
      selectedOptions,
      wgslSelection: {
        mode: "explicit",
        techniqueName: "Main",
        passIndex: 0,
        completePasses: true,
        requestedStageNames: [ "vertex", "pixel" ],
        selectedStageKeys: [ "Main.pass0.vertex", "Main.pass0.pixel" ]
      }
    },
    pipeline: {
      techniqueName: "Main",
      passIndex: 0,
      renderStates: 1,
      states: [],
      shaderModules: [
        {
          key: "Main.pass0.vertex",
          techniqueName: "Main",
          passIndex: 0,
          stageName: "vertex",
          stageType: 0,
          entryPoint: "main",
          wgsl: strictHeat ? heatDetailVertexWgsl() : [
            "@location(0) input0: vec3f,",
            ...(skinned ? [ "@location(1) input1: vec4u," ] : []),
            "@location(2) input2: vec2f,",
            "@location(3) input3: vec3f,",
            "@location(4) input4: vec3f,",
            "@location(5) input5: vec3f,",
            "@location(6) input6: vec2f"
          ].join("\n")
        },
        {
          key: "Main.pass0.pixel",
          techniqueName: "Main",
          passIndex: 0,
          stageName: "pixel",
          stageType: 1,
          entryPoint: "main",
          wgsl: strictHeat
            ? heatDetailPixelWgsl()
            : "@location(0) output0: vec4f, @location(1) output1: vec4f"
        }
      ],
      bindGroups: [ {
        group: 0,
        bindings: pipelineBindings(backend, skinned, heat, heatDetail, tier)
      } ],
      resourceTransforms: heatDetail ? [ heatDetailTransform(backend) ] : []
    }
  };
}

test("QuadV5 fixture supplies explicit full-contract synthetic silhouette inputs", () =>
{
  const fixture = createQuadV5FixtureValues(QUADV5_TARGET_WIDTH, QUADV5_TARGET_HEIGHT);
  const values = createQuadV5MainBindingValues(QUADV5_TARGET_WIDTH, QUADV5_TARGET_HEIGHT);
  assert.equal(fixture.vertices.byteLength, 13 * QUADV5_VERTEX_BUFFER_LAYOUT.arrayStride);
  assert.equal(fixture.boneIndices.byteLength, 13 * QUADV5_SKINNED_VERTEX_BUFFER_LAYOUT.arrayStride);
  for (let index = 0; index < 13; index += 1)
  {
    assert.deepEqual(Array.from(fixture.boneIndices.slice(index * 4, index * 4 + 4)), [ 1, 0, 0, 0 ]);
  }
  assert.equal(fixture.indices.length, 36);
  assert.equal(Math.max(...fixture.indices), 12);
  assert.equal(Object.hasOwn(fixture, "uniforms"), false);
  assert.equal(fixture.textures.length, 11);
  assert.equal(fixture.textures.filter((entry) => entry.dimension === "cube").length, 1);
  assert.equal(fixture.textures.filter((entry) => entry.dimension === "2d").length, 10);
  assert.equal(fixture.textures.find((entry) => entry.name === "AlbedoMap").format, "rgba8unorm-srgb");
  assert.equal(fixture.textures.find((entry) => entry.name === "NormalMap").data.byteLength, 8 * 8 * 4);
  assert.deepEqual(fixture.samplerNames, [ "Sampler0", "PatternMask1MapSampler", "PatternMask2MapSampler" ]);
  assert.equal(Object.keys(values.material).length, 20);
  assert.deepEqual(values.material.GeneralData, [ 1, 0, 0, 0 ]);
  assert.deepEqual(values.material.GeneralGlowColor, [ 0.08, 0.22, 0.7, 0 ]);
  assert.deepEqual(values.perFramePS.TargetResolution, [ 64, 64 ]);
  assert.deepEqual(values.perObjectPS.shipData, [ 0, 1, 0, 0 ]);
  assert.deepEqual(QUADV5_CLEAR_TARGETS, [ [ 0, 255, 0, 255 ], [ 255, 0, 255, 255 ] ]);
});

test("QuadV5 heat-detail fixture exposes ordered isolated binding cases", () =>
{
  const cases = createQuadV5HeatDetailBindingCases(
    QUADV5_TARGET_WIDTH,
    QUADV5_TARGET_HEIGHT
  );
  assert.equal(Object.isFrozen(cases), true);
  assert.equal(Object.isFrozen(cases.caseNames), true);
  assert.equal(Object.isFrozen(cases.bindingValuesByCase), true);
  assert.deepEqual(cases.caseNames, [ "surface", "detail", "hotDetail" ]);

  const expectedMaterialNames = HEAT_DETAIL_MATERIAL_CONSTANTS.map(([ name ]) => name);
  for (const caseName of cases.caseNames)
  {
    const values = cases.bindingValuesByCase[caseName];
    assert.equal(Object.isFrozen(values), true);
    assert.equal(Object.isFrozen(values.material), true);
    assert.deepEqual(Object.keys(values.material), expectedMaterialNames);
    assert.equal(Object.hasOwn(values.material, "GeneralGlowColor"), false);
    assert.equal(Object.keys(values.material).length, 31);
  }

  assert.deepEqual(cases.bindingValuesByCase.surface.material.DetailSelector, [ 0, 0, 0, 0 ]);
  assert.deepEqual(cases.bindingValuesByCase.detail.material.DetailSelector, [ 1, 1, 0, 0 ]);
  assert.deepEqual(cases.bindingValuesByCase.hotDetail.material.DetailSelector, [ 1, 1, 0, 0 ]);
  assert.deepEqual(cases.bindingValuesByCase.surface.perObjectVS.shipData, [ 0, 1, 0, 0 ]);
  assert.deepEqual(cases.bindingValuesByCase.detail.perObjectPS.shipData, [ 0, 1, 0, 0 ]);
  assert.deepEqual(cases.bindingValuesByCase.hotDetail.perObjectVS.shipData, [ 1, 1, 0, 0 ]);
  assert.deepEqual(cases.bindingValuesByCase.hotDetail.perObjectPS.shipData, [ 1, 1, 0, 0 ]);
});

test("QuadV5 heat fixture exposes exact ordered cold and hot binding cases", () =>
{
  const cases = createQuadV5HeatBindingCases(
    QUADV5_TARGET_WIDTH,
    QUADV5_TARGET_HEIGHT
  );
  assert.equal(Object.isFrozen(cases), true);
  assert.equal(Object.isFrozen(cases.caseNames), true);
  assert.equal(Object.isFrozen(cases.bindingValuesByCase), true);
  assert.deepEqual(cases.caseNames, [ "cold", "hot" ]);

  const expectedMaterialNames = HEAT_MATERIAL_CONSTANTS.map(([ name ]) => name);
  for (const caseName of cases.caseNames)
  {
    const values = cases.bindingValuesByCase[caseName];
    assert.equal(Object.isFrozen(values), true);
    assert.equal(Object.isFrozen(values.material), true);
    assert.deepEqual(Object.keys(values.material), expectedMaterialNames);
    assert.equal(Object.keys(values.material).length, 24);
    assert.equal(Object.hasOwn(values.material, "GeneralGlowColor"), false);
    assert.equal(Object.hasOwn(values.material, "DetailSelector"), false);
  }
  assert.deepEqual(cases.bindingValuesByCase.cold.perObjectVS.shipData, [ 0, 1, 0, 0 ]);
  assert.deepEqual(cases.bindingValuesByCase.cold.perObjectPS.shipData, [ 0, 1, 0, 0 ]);
  assert.deepEqual(cases.bindingValuesByCase.hot.perObjectVS.shipData, [ 1, 1, 0, 0 ]);
  assert.deepEqual(cases.bindingValuesByCase.hot.perObjectPS.shipData, [ 1, 1, 0, 0 ]);
});

test("QuadV5 fixture validates the common PPT-on skinned heat contract", () =>
{
  const dx11 = validRecord("dx11", "skinnedHeat");
  const dx12 = validRecord("dx12", "skinnedHeat");
  dx12.pipeline.shaderModules[0].wgsl += " // SM5.1";
  assert.deepEqual(validateQuadV5PackagePair([ dx11, dx12 ]), [ dx11, dx12 ]);

  const fixture = createQuadV5FixtureValues(
    QUADV5_TARGET_WIDTH,
    QUADV5_TARGET_HEIGHT,
    "skinnedHeat"
  );
  assert.equal(fixture.textures.length, 12);
  assert.equal(fixture.textures.at(-1).name, "HeatGlowNoiseMap");
  assert.equal(fixture.textures.some((entry) => entry.name === "Detail1Map"), false);

  const plan = getQuadV5ResourcePlan(dx12);
  assert.equal(plan.storage.length, 1);
  assert.equal(plan.textures.length, 12);
  assert.equal(plan.samplers.length, 3);
  assert.deepEqual(
    plan.textures.find((entry) => entry.name === "HeatGlowNoiseMap"),
    {
      name: "HeatGlowNoiseMap",
      identity: "sampled-resource:0:13",
      scopeIdentity: "sampled-resource:0:13@fragment",
      registerIndex: 13,
      binding: 17,
      scope: "fragment",
      viewDimension: "2d",
      registerType: 36,
      carbonType: 2,
      arrayElements: 1,
      isSRGB: false,
      isAutoregister: false
    }
  );
  assert.equal(plan.samplers[0].binding, 18);

  const wrongMaterial = structuredClone(dx11);
  wrongMaterial.analysis.stages[1].bindings
    .find((entry) => entry.kind === "constantBuffer")
    .carbon.constants.at(-1).offset = 432;
  assert.throws(
    () => validateQuadV5PackageRecord(wrongMaterial),
    /GeneralHeatGlowColor layout/u
  );

  const wrongHeatResource = structuredClone(dx11);
  wrongHeatResource.analysis.stages[1].bindings
    .find((entry) => entry.carbon?.name === "HeatGlowNoiseMap")
    .carbon.type = 4;
  assert.throws(
    () => validateQuadV5PackageRecord(wrongHeatResource),
    /sampled-resource:0:11 has unexpected Carbon metadata/u
  );

  const lowQuality = structuredClone(dx11);
  lowQuality.analysis.source = lowQuality.analysis.source.replace(".sm_hi", ".sm_lo");
  lowQuality.metadata.sourcePath = lowQuality.metadata.sourcePath.replace(".sm_hi", ".sm_lo");
  assert.throws(
    () => validateQuadV5PackageRecord(lowQuality),
    /the low tier is not encoded for the skinnedHeat variant/u
  );

  const missingPerFrame = structuredClone(dx11);
  missingPerFrame.analysis.stages[1].bindings = missingPerFrame.analysis.stages[1].bindings
    .filter((entry) => entry.kind !== "constantBuffer" || entry.registerIndex !== 2);
  assert.throws(
    () => validateQuadV5PackageRecord(missingPerFrame),
    /exact skinned-heat constant-buffer inventory/u
  );

  const wrongMaterialMetadata = structuredClone(dx11);
  wrongMaterialMetadata.analysis.stages[1].bindings
    .find((entry) => entry.kind === "constantBuffer" && entry.registerIndex === 0)
    .metadataName = "Material";
  assert.throws(
    () => validateQuadV5PackageRecord(wrongMaterialMetadata),
    /cb0 has unexpected skinned-heat metadata/u
  );

  const wrongCanonicalSrgb = structuredClone(dx11);
  wrongCanonicalSrgb.pipeline.bindGroups[0].bindings
    .find((entry) => entry.name === undefined
      && entry.scopeIdentity === "sampled-resource:0:5@fragment")
    .isSRGB = false;
  assert.throws(
    () => validateQuadV5PackageRecord(wrongCanonicalSrgb),
    /sampled-resource:0:5 has an unexpected texture layout/u
  );

  const wrongStageOrder = structuredClone(dx11);
  wrongStageOrder.metadata.wgslSelection.selectedStageKeys.reverse();
  assert.throws(
    () => validateQuadV5PackageRecord(wrongStageOrder),
    /complete Main\.pass0 vertex\/pixel pair/u
  );

  const wrongInterface = structuredClone(dx11);
  wrongInterface.analysis.stages[0].pipelineInputs[1].usedMask = 15;
  assert.throws(
    () => validateQuadV5PackageRecord(wrongInterface),
    /unexpected skinned-heat used-mask interface/u
  );

  const wrongDynamicSampler = structuredClone(dx11);
  wrongDynamicSampler.analysis.stages[1].bindings
    .find((entry) => entry.kind === "sampler" && entry.registerIndex === 1)
    .carbon.sampler.maxAnisotropy = 1;
  assert.throws(
    () => validateQuadV5PackageRecord(wrongDynamicSampler),
    /unexpected dynamic sampler state/u
  );
});

test("QuadV5 fixture validates the PPT-on skinned heat-detail contract", () =>
{
  const dx11 = validRecord("dx11", "skinnedHeatDetail");
  const dx12 = validRecord("dx12", "skinnedHeatDetail");
  dx12.pipeline.shaderModules[0].wgsl += " // SM5.1";
  assert.deepEqual(validateQuadV5PackagePair([ dx11, dx12 ]), [ dx11, dx12 ]);

  const fixture = createQuadV5FixtureValues(
    QUADV5_TARGET_WIDTH,
    QUADV5_TARGET_HEIGHT,
    "skinnedHeatDetail"
  );
  assert.equal(fixture.textures.length, 14);
  assert.deepEqual(fixture.textures.slice(-3).map((entry) => entry.name), [
    "HeatGlowNoiseMap",
    "Detail1Map",
    "Detail2Map"
  ]);
  const plan = getQuadV5ResourcePlan(dx12);
  assert.equal(plan.storage.length, 1);
  assert.equal(plan.samplers.length, 3);
  // Post-transform: the two detail maps are one 2d-array binding, so the plan
  // exposes thirteen textures where the reflection lists fourteen resources.
  assert.equal(plan.textures.length, 13);
  assert.equal(plan.analysisResources.length, 14);
  assert.equal(plan.textures.some((entry) => entry.name === "Detail2Map"), false);
  assert.equal(
    plan.analysisResources.find((entry) => entry.name === "Detail2Map").registerIndex,
    15
  );

  const merge = plan.transforms[0];
  assert.equal(plan.transforms.length, 1);
  assert.equal(merge.output.name, "DetailArrayMap");
  assert.equal(merge.output.scopeIdentity, "sampled-resource:0:14@fragment");
  assert.equal(merge.output.layerCount, 2);
  assert.deepEqual(
    merge.inputs.map((entry) => [ entry.layer, entry.parameter, entry.registerIndex ?? null ]),
    [ [ 0, "Detail1Map", null ], [ 1, "Detail2Map", null ] ]
  );
  assert.deepEqual(
    merge.inputs.map((entry) => entry.scopeIdentity),
    [ "sampled-resource:0:14@fragment", "sampled-resource:0:15@fragment" ]
  );
  const arrayBinding = plan.textures.find((entry) => entry.name === "DetailArrayMap");
  assert.equal(arrayBinding.viewDimension, "2d-array");
  assert.equal(arrayBinding.arrayLayerCount, 2);
  assert.equal(arrayBinding.registerIndex, 14);
  assert.equal(plan.samplers[0].binding, 19);

  const wrongMaterial = structuredClone(dx11);
  wrongMaterial.analysis.stages[1].bindings
    .find((entry) => entry.kind === "constantBuffer")
    .carbon.constants.at(-1).offset = 608;
  assert.throws(
    () => validateQuadV5PackageRecord(wrongMaterial),
    /DetailSelector layout/u
  );
});

test("QuadV5 heat-detail validator rejects stage, interface, and WGSL drift", () =>
{
  const wrongAnalysisState = structuredClone(validRecord("dx11", "skinnedHeatDetail"));
  wrongAnalysisState.analysis.passes[0].renderStates = 0;
  assert.throws(
    () => validateQuadV5PackageRecord(wrongAnalysisState),
    /exact skinned-heat Main\.pass0 render state/u
  );

  const wrongPipelineState = structuredClone(validRecord("dx11", "skinnedHeatDetail"));
  wrongPipelineState.pipeline.renderStates = 0;
  assert.throws(
    () => validateQuadV5PackageRecord(wrongPipelineState),
    /exact skinned-heat Main\.pass0 render state/u
  );

  const extraMainStage = structuredClone(validRecord("dx11", "skinnedHeatDetail"));
  extraMainStage.analysis.stages.push({
    key: "Main.pass1.pixel",
    techniqueName: "Main",
    passIndex: 1,
    stageName: "pixel",
    stageType: 1
  });
  assert.throws(
    () => validateQuadV5PackageRecord(extraMainStage),
    /exactly the skinned-heat Main\.pass0 stage pair/u
  );

  const wrongVertexMask = structuredClone(validRecord("dx11", "skinnedHeatDetail"));
  wrongVertexMask.analysis.stages[0].pipelineInputs[1].usedMask = 15;
  assert.throws(
    () => validateQuadV5PackageRecord(wrongVertexMask),
    /unexpected skinned-heat used-mask interface/u
  );

  const wrongInactivePixelMask = structuredClone(validRecord("dx11", "skinnedHeatDetail"));
  wrongInactivePixelMask.analysis.stages[1].pipelineInputs[5].usedMask = 1;
  assert.throws(
    () => validateQuadV5PackageRecord(wrongInactivePixelMask),
    /unexpected skinned-heat used-mask interface/u
  );

  const wrongVertexOutput = structuredClone(validRecord("dx11", "skinnedHeatDetail"));
  wrongVertexOutput.pipeline.shaderModules[0].wgsl =
    wrongVertexOutput.pipeline.shaderModules[0].wgsl.replace(
      "@location(8) output8: vec4<f32>",
      "@location(8) output8: vec3<f32>"
    );
  assert.throws(
    () => validateQuadV5PackageRecord(wrongVertexOutput),
    /unexpected VertexOutput contract/u
  );

  const wrongFragmentInput = structuredClone(validRecord("dx11", "skinnedHeatDetail"));
  wrongFragmentInput.pipeline.shaderModules[1].wgsl =
    wrongFragmentInput.pipeline.shaderModules[1].wgsl.replace(
      "@location(7) input7: vec4<f32>",
      "@location(6) input6: vec4<f32>"
    );
  assert.throws(
    () => validateQuadV5PackageRecord(wrongFragmentInput),
    /unexpected FragmentInput contract/u
  );
});

test("QuadV5 heat-detail validator rejects reflected resource and sampler drift", () =>
{
  const wrongBoneType = structuredClone(validRecord("dx11", "skinnedHeatDetail"));
  wrongBoneType.analysis.stages[0].bindings
    .find((entry) => entry.kind === "resource")
    .registerType = 36;
  assert.throws(
    () => validateQuadV5PackageRecord(wrongBoneType),
    /vertex t0 has unexpected BoneTransforms Carbon metadata/u
  );

  const wrongAlbedoSrgb = structuredClone(validRecord("dx11", "skinnedHeatDetail"));
  wrongAlbedoSrgb.analysis.stages[1].bindings
    .find((entry) => entry.carbon?.name === "AlbedoMap")
    .carbon.isSRGB = false;
  assert.throws(
    () => validateQuadV5PackageRecord(wrongAlbedoSrgb),
    /sampled-resource:0:5 has unexpected Carbon metadata/u
  );

  const wrongShadowAutoreg = structuredClone(validRecord("dx11", "skinnedHeatDetail"));
  wrongShadowAutoreg.analysis.stages[1].bindings
    .find((entry) => entry.carbon?.name === "EveSpaceSceneShadowMap")
    .carbon.isAutoregister = false;
  assert.throws(
    () => validateQuadV5PackageRecord(wrongShadowAutoreg),
    /sampled-resource:0:2 has unexpected Carbon metadata/u
  );

  const wrongDetailArray = structuredClone(validRecord("dx11", "skinnedHeatDetail"));
  wrongDetailArray.analysis.stages[1].bindings
    .find((entry) => entry.carbon?.name === "Detail2Map")
    .carbon.arrayElements = 2;
  assert.throws(
    () => validateQuadV5PackageRecord(wrongDetailArray),
    /sampled-resource:0:13 has unexpected Carbon metadata/u
  );

  const extraTexture = structuredClone(validRecord("dx11", "skinnedHeatDetail"));
  extraTexture.analysis.stages[1].bindings.push({
    kind: "resource",
    registerSpace: 0,
    registerIndex: 99,
    registerType: 36,
    carbon: {
      name: "UnexpectedMap",
      type: 2,
      arrayElements: 1,
      isSRGB: false,
      isAutoregister: false
    }
  });
  assert.throws(
    () => validateQuadV5PackageRecord(extraTexture),
    /exact declared inventory/u
  );

  const wrongSamplerAddress = structuredClone(validRecord("dx11", "skinnedHeatDetail"));
  wrongSamplerAddress.analysis.stages[1].bindings
    .find((entry) => entry.kind === "sampler" && entry.registerIndex === 1)
    .carbon.sampler.addressU = 2;
  assert.throws(
    () => validateQuadV5PackageRecord(wrongSamplerAddress),
    /unexpected dynamic sampler state/u
  );

  const wrongSamplerDynamic = structuredClone(validRecord("dx11", "skinnedHeatDetail"));
  wrongSamplerDynamic.analysis.stages[1].bindings
    .find((entry) => entry.kind === "sampler" && entry.registerIndex === 2)
    .carbon.sampler.isDynamic = false;
  assert.throws(
    () => validateQuadV5PackageRecord(wrongSamplerDynamic),
    /unexpected dynamic sampler state/u
  );

  const extraSampler = structuredClone(validRecord("dx11", "skinnedHeatDetail"));
  extraSampler.analysis.stages[1].bindings.push({
    kind: "sampler",
    registerSpace: 0,
    registerIndex: 99,
    carbon: { name: "UnexpectedSampler", sampler: samplerState(true) }
  });
  assert.throws(
    () => validateQuadV5PackageRecord(extraSampler),
    /exact declared inventory/u
  );
});

test("QuadV5 fixture validates the High .sm_depth 25-binding contract", () =>
{
  const dx11 = validRecord("dx11", "static", "high");
  const dx12 = validRecord("dx12", "static", "high");
  dx12.pipeline.shaderModules[0].wgsl += " // SM5.1";
  assert.deepEqual(validateQuadV5PackagePair([ dx11, dx12 ]), [ dx11, dx12 ]);

  const plan = getQuadV5ResourcePlan(dx11);
  assert.equal(plan.tier, "high");
  // 13 sampled textures plus the light profile array, two storage buffers, four
  // samplers, five uniforms: the 25 canonical bindings the manifest pins.
  assert.equal(plan.textures.length, 14);
  assert.equal(plan.storage.length, 2);
  assert.equal(plan.samplers.length, 4);
  assert.deepEqual(
    plan.textures.map((entry) => entry.binding),
    [ 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 20 ]
  );
  assert.deepEqual(plan.storage.map((entry) => entry.binding), [ 18, 19 ]);
  assert.deepEqual(plan.samplers.map((entry) => entry.binding), [ 21, 22, 23, 24 ]);

  const array = plan.textures.at(-1);
  assert.equal(array.name, "LightProfileArray");
  assert.equal(array.viewDimension, "2d-array");
  assert.equal(array.registerIndex, 15);
  assert.equal(getQuadV5ResourcePlan(dx12).textures.at(-1).registerIndex, 16);
  assert.deepEqual(
    plan.storage.map((entry) => [ entry.name, entry.structureStride, entry.minBindingSize ]),
    [ [ "LightIndexBuffer", 4, 4 ], [ "LightBuffer", 48, 48 ] ]
  );

  // High and Medium share every uniform size, so the tiers are distinguished by
  // their binding inventory rather than by a cheaper signal.
  const medium = getQuadV5ResourcePlan(validRecord("dx11", "static"));
  assert.equal(medium.tier, "medium");
  assert.equal(medium.textures.length, 11);
  assert.equal(medium.storage.length, 0);
  assert.equal(medium.samplers.length, 3);

  const flatArrayView = structuredClone(dx11);
  const arrayBinding = flatArrayView.pipeline.bindGroups[0].bindings
    .find((entry) => entry.binding === 20);
  arrayBinding.layout.texture.viewDimension = "2d";
  arrayBinding.layout.type = "texture_2d<f32>";
  arrayBinding.textureKind = "2d";
  assert.throws(
    () => validateQuadV5PackageRecord(flatArrayView),
    /sampled-resource:0:15 has an unexpected texture layout/u
  );

  const wrongStride = structuredClone(dx11);
  wrongStride.pipeline.bindGroups[0].bindings.find((entry) => entry.binding === 19)
    .structureStride = 32;
  assert.throws(
    () => validateQuadV5PackageRecord(wrongStride),
    /LightBuffer has an unexpected read-only storage layout/u
  );

  // s3 is not s0: a fixture that copied s0's state would bind the wrong sampler.
  const copiedSamplerState = structuredClone(dx11);
  copiedSamplerState.analysis.stages[1].bindings
    .find((entry) => entry.kind === "sampler" && entry.registerIndex === 3)
    .carbon.sampler = samplerState(false);
  assert.throws(
    () => validateQuadV5PackageRecord(copiedSamplerState),
    /sampler:0:3 has unexpected static sampler state/u
  );

  const missingDust = structuredClone(dx11);
  const material = missingDust.analysis.stages[1].bindings
    .find((entry) => entry.kind === "constantBuffer" && entry.registerIndex === 0);
  material.carbon.constants = material.carbon.constants
    .filter((entry) => !entry.name.includes("Dust"));
  assert.throws(
    () => validateQuadV5PackageRecord(missingDust),
    /pixel cb0 must expose exactly 24 High constants/u
  );

  const highSkinned = validRecord("dx11", "skinned", "high");
  assert.throws(
    () => validateQuadV5PackageRecord(highSkinned),
    /the high tier is not encoded for the skinned variant/u
  );
});

test("QuadV5 High fixture values author every reflected High input", () =>
{
  const fixture = createQuadV5FixtureValues(
    QUADV5_TARGET_WIDTH,
    QUADV5_TARGET_HEIGHT,
    "static",
    "high"
  );
  assert.equal(fixture.tier, "high");
  assert.deepEqual(fixture.samplerNames, [
    "Sampler0",
    "PatternMask1MapSampler",
    "PatternMask2MapSampler",
    "Sampler3"
  ]);
  const names = fixture.textures.map((entry) => entry.name);
  assert.ok(names.includes("DustNoiseMap") && names.includes("DirtMap"));

  const array = fixture.textures.find((entry) => entry.name === "LightProfileArray");
  assert.equal(array.dimension, "2d-array");
  assert.equal(array.depthOrArrayLayers, 2);
  // Distinct layer contents, so collapsing the view to layer 0 changes the draw.
  assert.notDeepEqual([ ...array.data.slice(0, 4) ], [ ...array.data.slice(4, 8) ]);

  assert.deepEqual(
    fixture.storageBuffers.map((entry) => [ entry.name, entry.data.byteLength ]),
    [ [ "LightIndexBuffer", 4 ], [ "LightBuffer", 48 ] ]
  );
  for (const entry of fixture.storageBuffers)
  {
    assert.equal(entry.data.byteLength % entry.structureStride, 0);
  }

  // packMaterial requires a value for every reflected constant, so the four dust
  // colors must exist at High and must not exist at Medium.
  const high = createQuadV5MainBindingValues(QUADV5_TARGET_WIDTH, QUADV5_TARGET_HEIGHT, "high");
  const medium = createQuadV5MainBindingValues(QUADV5_TARGET_WIDTH, QUADV5_TARGET_HEIGHT);
  for (const index of [ 1, 2, 3, 4 ])
  {
    assert.equal(high.material[`Mtl${index}DustDiffuseColor`].length, 4);
    assert.equal(medium.material[`Mtl${index}DustDiffuseColor`], undefined);
  }

  assert.throws(
    () => createQuadV5FixtureValues(QUADV5_TARGET_WIDTH, QUADV5_TARGET_HEIGHT, "skinned", "high"),
    /High fixture values are only authored for the static variant/u
  );
});

test("QuadV5 fixture validates the skinned storage and vertex contract", () =>
{
  const dx11 = validRecord("dx11", "skinned");
  const dx12 = validRecord("dx12", "skinned");
  dx12.pipeline.shaderModules[0].wgsl += " // SM5.1";
  assert.deepEqual(validateQuadV5PackagePair([ dx11, dx12 ]), [ dx11, dx12 ]);

  const plan = getQuadV5ResourcePlan(dx11);
  assert.deepEqual(plan.storage, [ {
    name: "BoneTransforms",
    identity: "sampled-resource:0:0",
    scopeIdentity: "sampled-resource:0:0@vertex",
    registerIndex: 0,
    binding: 5,
    scope: "vertex",
    arrayElements: 1,
    registerType: 33,
    carbonType: 7,
    isSRGB: false,
    isAutoregister: false,
    minBindingSize: 48,
    structureStride: 48
  } ]);
  assert.equal(plan.tier, "medium");
  assert.equal(plan.textures[0].scopeIdentity, "sampled-resource:0:0@fragment");
  assert.equal(plan.textures[0].binding, 6);
  assert.equal(plan.samplers[0].binding, 17);

  const missingBone = structuredClone(dx11);
  missingBone.analysis.stages[0].bindings = [];
  assert.throws(() => validateQuadV5PackageRecord(missingBone), /vertex resource reflection/u);

  const wrongStride = structuredClone(dx11);
  wrongStride.pipeline.bindGroups[0].bindings[5].structureStride = 64;
  assert.throws(() => validateQuadV5PackageRecord(wrongStride), /BoneTransforms.*storage layout/u);
});

test("QuadV5 fixture accepts only the current full PPT-on Main contract", () =>
{
  const record = validRecord();
  assert.equal(validateQuadV5PackageRecord(record), record);

  const wrongBody = structuredClone(record);
  wrongBody.analysis.bodyIndex = 0;
  assert.throws(() => validateQuadV5PackageRecord(wrongBody), /body index 4/u);

  const pptOff = structuredClone(record);
  pptOff.analysis.selectedOptions.find((entry) => entry.name === "SPACE_OBJECT_PPT_ENABLED").value = "SOPPT_DISABLED";
  assert.throws(() => validateQuadV5PackageRecord(pptOff), /SOPPT_ENABLED/u);

  const wrongSource = structuredClone(record);
  wrongSource.analysis.source = wrongSource.analysis.source.replace("unpacked_quadv5", "quadv5");
  wrongSource.metadata.sourcePath = wrongSource.analysis.source;
  assert.throws(() => validateQuadV5PackageRecord(wrongSource), /unpacked_quadv5 ship shader/u);

  // Provenance drift is pinned on `optionIndex` rather than on `source`. This
  // control used to flip `source` to "default", which the chunk package stored
  // and the Carbon container cannot: `source` records who CHOSE a value, and
  // the container carries only which permutation was translated. `optionIndex`
  // is derived from the axes and the resolved variant, so it does survive the
  // round trip and a wrong one is exactly the drift worth catching.
  const defaulted = structuredClone(record);
  defaulted.metadata.selectedOptions.find((entry) => entry.name === "SPACE_OBJECT_PPT_ENABLED").optionIndex = 0;
  assert.throws(() => validateQuadV5PackageRecord(defaulted), /unexpected provenance/u);

  const wrongShaderKey = structuredClone(record);
  wrongShaderKey.pipeline.shaderModules[0].key = "Bogus.pass9.vertex";
  assert.throws(() => validateQuadV5PackageRecord(wrongShaderKey), /complete vertex module/u);

  const wrongEntryPoint = structuredClone(record);
  wrongEntryPoint.pipeline.shaderModules[1].entryPoint = "bogus";
  assert.throws(() => validateQuadV5PackageRecord(wrongEntryPoint), /complete pixel module/u);

  const wrongSelectionMode = structuredClone(record);
  wrongSelectionMode.metadata.wgslSelection.mode = "default";
  assert.throws(() => validateQuadV5PackageRecord(wrongSelectionMode), /complete Main.pass0/u);
});

test("QuadV5 fixture maps backend-local registers through reflected semantic names", () =>
{
  const dx11 = getQuadV5ResourcePlan(validRecord("dx11"));
  const dx12 = getQuadV5ResourcePlan(validRecord("dx12"));
  const dx11Albedo = dx11.textures.find((entry) => entry.name === "AlbedoMap");
  const dx12Albedo = dx12.textures.find((entry) => entry.name === "AlbedoMap");
  assert.equal(dx11Albedo.identity, "sampled-resource:0:5");
  assert.equal(dx12Albedo.identity, "sampled-resource:0:6");
  assert.equal(dx11Albedo.binding, dx12Albedo.binding);
  assert.equal(dx11.samplers.length, 3);
  assert.equal(dx12.samplers.length, 3);

  const wrongName = structuredClone(validRecord("dx12"));
  wrongName.analysis.stages[1].bindings.find((entry) => entry.carbon?.name === "AlbedoMap").carbon.name = "WrongMap";
  assert.throws(() => validateQuadV5PackageRecord(wrongName), /must reflect AlbedoMap/u);

  const wrongStaticSampler = structuredClone(validRecord("dx11"));
  wrongStaticSampler.analysis.stages[1].bindings
    .find((entry) => entry.kind === "sampler" && entry.registerIndex === 0)
    .carbon.sampler.maxAnisotropy = 1;
  assert.throws(() => validateQuadV5PackageRecord(wrongStaticSampler), /unexpected static sampler state/u);
});

test("QuadV5 fixture requires the exact DX12 immutable signature sampler", () =>
{
  const signatureSampler = (record) => record.analysis.stages[1].bindings
    .find((entry) => entry.kind === "sampler" && entry.registerIndex === 0);

  const missing = structuredClone(validRecord("dx12"));
  missing.analysis.stages[1].bindings = missing.analysis.stages[1].bindings
    .filter((entry) => !(entry.kind === "sampler" && entry.registerIndex === 0));
  assert.throws(
    () => validateQuadV5PackageRecord(missing),
    /unexpected DX12 signature-sampler reflection/u
  );

  const wrongTruth = structuredClone(validRecord("dx12"));
  signatureSampler(wrongTruth).sourceTruth = "carbon-stage-register";
  assert.throws(
    () => validateQuadV5PackageRecord(wrongTruth),
    /unexpected DX12 signature-sampler reflection/u
  );

  const wrongDynamic = structuredClone(validRecord("dx12"));
  signatureSampler(wrongDynamic).dynamic = true;
  assert.throws(
    () => validateQuadV5PackageRecord(wrongDynamic),
    /unexpected DX12 signature-sampler reflection/u
  );

  // The raw wire enum, left unexpanded. Carbon expands it to four floats, so a
  // reader that passes the byte through is the defect now.
  const unexpandedBorderColor = structuredClone(validRecord("dx12"));
  signatureSampler(unexpandedBorderColor).carbon.sampler.borderColor = 0;
  assert.throws(
    () => validateQuadV5PackageRecord(unexpandedBorderColor),
    /unexpected DX12 signature-sampler reflection/u
  );

  // A missing dynamic flag is the contradiction, not a present one. It is the
  // override authorisation, and a consumer testing `isDynamic !== false` reads
  // absence as dynamic -- the opposite of what an immutable sampler is.
  const missingDynamicFlag = structuredClone(validRecord("dx12"));
  delete signatureSampler(missingDynamicFlag).carbon.sampler.isDynamic;
  assert.throws(
    () => validateQuadV5PackageRecord(missingDynamicFlag),
    /unexpected DX12 signature-sampler reflection/u
  );

  const named = structuredClone(validRecord("dx12"));
  signatureSampler(named).carbon.name = "Sampler0";
  assert.throws(
    () => validateQuadV5PackageRecord(named),
    /unexpected DX12 signature-sampler reflection/u
  );

  const wrongFilter = structuredClone(validRecord("dx12"));
  signatureSampler(wrongFilter).carbon.sampler.maxAnisotropy = 1;
  assert.throws(
    () => validateQuadV5PackageRecord(wrongFilter),
    /unexpected DX12 signature-sampler reflection/u
  );
});

test("QuadV5 fixture rejects binding and MRT drift", () =>
{
  const wrongSize = structuredClone(validRecord());
  wrongSize.pipeline.bindGroups[0].bindings[1].layout.buffer.minBindingSize = 496;
  assert.throws(() => validateQuadV5PackageRecord(wrongSize), /uniform-buffer layout/u);

  const wrongDimension = structuredClone(validRecord());
  wrongDimension.pipeline.bindGroups[0].bindings[5].layout.texture.viewDimension = "2d";
  assert.throws(() => validateQuadV5PackageRecord(wrongDimension), /texture layout/u);

  const wrongRegister = structuredClone(validRecord());
  const albedo = wrongRegister.pipeline.bindGroups[0].bindings
    .find((entry) => entry.scopeIdentity === "sampled-resource:0:5@fragment");
  albedo.resourceKind = "sampler";
  albedo.registerSpace = 7;
  albedo.registerIndex = 99;
  assert.throws(() => validateQuadV5PackageRecord(wrongRegister), /slot, scope, register, or visibility/u);

  const oneTarget = structuredClone(validRecord());
  oneTarget.pipeline.shaderModules[1].wgsl = "@location(0) output0: vec4f";
  assert.throws(() => validateQuadV5PackageRecord(oneTarget), /both QuadV5 render targets/u);
});

test("QuadV5 fixture requires distinct ordered backend provenance", () =>
{
  const dx11 = validRecord("dx11");
  const dx12 = validRecord("dx12");
  dx12.pipeline.shaderModules[0].wgsl += " // SM5.1";
  assert.deepEqual(validateQuadV5PackagePair([ dx11, dx12 ]), [ dx11, dx12 ]);

  const sameFile = structuredClone(dx12);
  sameFile.filePath = dx11.filePath.toUpperCase();
  assert.throws(() => validateQuadV5PackagePair([ dx11, sameFile ]), /distinct physical/u);

  const missingFile = structuredClone(dx12);
  missingFile.filePath = "";
  assert.throws(() => validateQuadV5PackagePair([ dx11, missingFile ]), /distinct physical/u);

  const missingResource = structuredClone(dx12);
  missingResource.resourcePath = "";
  assert.throws(() => validateQuadV5PackagePair([ dx11, missingResource ]), /distinct logical/u);

  const mislabeled = structuredClone(dx12);
  mislabeled.analysis.source = dx11.analysis.source;
  mislabeled.metadata.sourcePath = dx11.metadata.sourcePath;
  assert.throws(() => validateQuadV5PackagePair([ dx11, mislabeled ]), /must match dx12/u);

  assert.throws(() => validateQuadV5PackagePair([ dx12, dx11 ]), /must match dx12|order must be DX11/u);

  const identicalWgsl = structuredClone(dx12);
  identicalWgsl.pipeline.shaderModules = structuredClone(dx11.pipeline.shaderModules);
  assert.throws(() => validateQuadV5PackagePair([ dx11, identicalWgsl ]), /identical WGSL/u);

  const heatDx11 = validRecord("dx11", "skinnedHeat");
  const heatDetailDx12 = validRecord("dx12", "skinnedHeatDetail");
  heatDetailDx12.pipeline.shaderModules[0].wgsl += " // SM5.1";
  assert.throws(
    () => validateQuadV5PackagePair([ heatDx11, heatDetailDx12 ]),
    /variants must match/u
  );
});
