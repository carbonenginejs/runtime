import assert from "node:assert/strict";
import { test } from "node:test";

import {
  QUAD_DETAIL_V5_SELECTION,
  QUAD_DETAIL_V5_SELECTIONS,
  QUAD_DETAIL_V5_TARGET_HEIGHT,
  QUAD_DETAIL_V5_TARGET_WIDTH,
  QUAD_DETAIL_V5_VERTEX_BUFFER_LAYOUT,
  createQuadDetailV5BindingCases,
  createQuadDetailV5FixtureValues,
  getQuadDetailV5ResourcePlan,
  validateQuadDetailV5PackagePair,
  validateQuadDetailV5PackageRecord
} from "../harness/webgpu/quadDetailV5Fixture.js";

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
  "PatternMask2Map",
  "Detail1Map",
  "Detail2Map",
  "Detail3Map"
];

const RESOURCE_REGISTERS = {
  dx11: [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13 ],
  dx12: [ 0, 1, 2, 3, 4, 6, 7, 9, 10, 11, 12, 13, 14, 15 ]
};

const MATERIAL_CONSTANTS = [
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
  [ "PMtl1DiffuseColor", 288 ],
  [ "PMtl1FresnelColor", 304 ],
  [ "PMtl1Gloss", 320 ],
  [ "PMtl2DiffuseColor", 336 ],
  [ "PMtl2FresnelColor", 352 ],
  [ "PMtl2Gloss", 368 ],
  [ "Detail1Data", 448 ],
  [ "Detail2Data", 464 ],
  [ "Detail3Data", 480 ],
  [ "DetailAlbedoColor", 496 ],
  [ "DetailFresnelColor", 512 ],
  [ "DetailSelector", 592 ]
];

const VERTEX_INPUTS = [
  [ "POSITION", 0, 0, 7, 0, 3 ],
  [ "BLENDINDICES", 0, 1, 0, 2, 4 ],
  [ "TEXCOORD", 0, 2, 3, 0, 2 ],
  [ "NORMAL", 0, 3, 7, 0, 3 ],
  [ "TANGENT", 0, 4, 7, 0, 3 ],
  [ "BITANGENT", 0, 5, 7, 0, 3 ],
  [ "TEXCOORD", 1, 6, 3, 0, 2 ]
];

const SKINNED_VERTEX_INPUTS = VERTEX_INPUTS.map((entry) =>
  entry[2] === 1 ? [ ...entry.slice(0, 3), 1, ...entry.slice(4) ] : entry);

const PIXEL_INPUTS = [
  [ "TEXCOORD", 0, 1, 3, 0, 4 ],
  [ "TEXCOORD", 1, 2, 7, 0, 3 ],
  [ "TEXCOORD", 2, 3, 7, 0, 3 ],
  [ "TEXCOORD", 3, 4, 7, 0, 3 ],
  [ "TEXCOORD", 4, 5, 15, 0, 4 ],
  [ "TEXCOORD", 5, 6, 0, 0, 4 ],
  [ "TEXCOORD", 6, 7, 15, 0, 4 ],
  [ "TEXCOORD", 8, 8, 0, 0, 4 ],
  [ "TEXCOORD", 9, 9, 11, 0, 4 ]
];

function selections(variant)
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
  return Object.entries(QUAD_DETAIL_V5_SELECTIONS[variant]).map(([ name, value ]) => ({
    name,
    value,
    optionIndex: provenance[name][0],
    defaultOption: provenance[name][1],
    defaultValue: provenance[name][2],
    source: "local"
  }));
}

function pipelineInput([
  usageName,
  usageIndex,
  registerIndex,
  usedMask,
  type,
  dimension
])
{
  return { usageName, usageIndex, registerIndex, usedMask, type, dimension };
}

function constantBuffer(registerIndex, local = false)
{
  return {
    kind: "constantBuffer",
    registerSpace: 0,
    registerIndex,
    registerType: 0,
    carbon: local
      ? {
        hasLocalConstants: true,
        constantValueSize: 608,
        constants: MATERIAL_CONSTANTS.map(([ name, offset ]) => ({
          name,
          offset,
          size: 16,
          dimension: 4,
          type: 0,
          elements: 0
        }))
      }
      : {
        hasLocalConstants: false,
        constantValueSize: 0,
        constants: []
      }
  };
}

function samplerState(isDynamic)
{
  return {
    comparison: false,
    minFilter: 3,
    magFilter: 2,
    mipFilter: 2,
    addressU: 1,
    addressV: 1,
    addressW: 3,
    mipLODBias: 0,
    maxAnisotropy: 16,
    // Transparent black, the same four floats a real package carries on both
    // backends: the wire stores an enum for a static sampler and a float4 for a
    // stage one, and the reader resolves both to this.
    borderColor: [ 0, 0, 0, 0 ],
    isDynamic
  };
}

function analysisResource(name, registerIndex, index)
{
  return {
    kind: "resource",
    registerSpace: 0,
    registerIndex,
    registerType: index === 0 ? 41 : 36,
    carbon: {
      name,
      type: index === 0 ? 4 : 2,
      arrayElements: 1,
      isSRGB: index === 0 || name === "AlbedoMap",
      isAutoregister: name === "EveSpaceSceneShadowMap"
    }
  };
}

function analysisBone()
{
  return {
    kind: "resource",
    generatedSymbol: "t0",
    registerSpace: 0,
    registerIndex: 0,
    registerType: 33,
    metadataName: "BoneTransforms",
    carbon: {
      name: "BoneTransforms",
      type: 7,
      arrayElements: 1,
      isSRGB: false,
      isAutoregister: false
    }
  };
}

function analysisSampler(registerIndex, backend = "dx11")
{
  if (registerIndex === 0 && backend === "dx12")
  {
    return {
      kind: "sampler",
      registerSpace: 0,
      registerIndex,
      registerType: 1,
      dynamic: false,
      sourceTruth: "carbon-signature-sampler",
      carbon: {
        name: null,
        // Same state as the stage sampler. The reader expands the static
        // record's border-colour enum and restores its `isDynamic` exactly as
        // Carbon does, so only `sourceTruth` still marks the declaration.
        sampler: samplerState(false)
      }
    };
  }
  return {
    kind: "sampler",
    registerSpace: 0,
    registerIndex,
    registerType: 1,
    carbon: {
      name: registerIndex === 0 ? null : `PatternMask${registerIndex}MapSampler`,
      sampler: samplerState(registerIndex !== 0)
    }
  };
}

function binding(identity, bindingIndex, visibility, kind, layout)
{
  const [ resourceKind, registerSpace, registerIndex ] = identity.split(":");
  return {
    identity,
    scopeIdentity: `${identity}@${visibility}`,
    resourceKind,
    registerSpace: Number(registerSpace),
    registerIndex: Number(registerIndex),
    sourceTruth: "wgsl-layout",
    group: 0,
    binding: bindingIndex,
    visibility: [ visibility ],
    dynamic: false,
    layout: {
      type: layout.type,
      buffer: kind === "buffer" ? layout.value : null,
      texture: kind === "texture" ? layout.value : null,
      sampler: kind === "sampler" ? layout.value : null
    }
  };
}

function uniformBinding(registerIndex, bindingIndex, visibility, size)
{
  return binding(
    `uniform-buffer:0:${registerIndex}`,
    bindingIndex,
    visibility,
    "buffer",
    {
      type: `array<vec4<f32>, ${size / 16}>`,
      value: {
        type: "uniform",
        hasDynamicOffset: false,
        minBindingSize: size
      }
    }
  );
}

function boneBinding()
{
  return {
    ...binding(
      "sampled-resource:0:0",
      5,
      "vertex",
      "buffer",
      {
        type: "array<u32>",
        value: {
          type: "read-only-storage",
          hasDynamicOffset: false,
          minBindingSize: 48
        }
      }
    ),
    name: "BoneTransforms",
    generatedSymbol: "t0",
    structureStride: 48,
    carbon: {
      name: "BoneTransforms",
      type: 7,
      arrayElements: 1,
      isSRGB: false,
      isAutoregister: false
    }
  };
}

// The producer merges Detail1/2/3Map into one 2d-array binding in Detail1Map's
// slot and removes the other two, so the layout is two bindings shorter than the
// reflection.
const DETAIL_MERGE_INPUTS = [ "Detail1Map", "Detail2Map", "Detail3Map" ];

// The layout keeps Detail1Map's register but renames it to the merged output.
const MERGED_RESOURCE_NAMES = RESOURCE_NAMES
  .filter((name) => DETAIL_MERGE_INPUTS.indexOf(name) <= 0)
  .map((name) => name === DETAIL_MERGE_INPUTS[0] ? "DetailArrayMap" : name);

function mergedRegisters(backend)
{
  return RESOURCE_REGISTERS[backend]
    .filter((_register, index) => DETAIL_MERGE_INPUTS.indexOf(RESOURCE_NAMES[index]) <= 0);
}

function detailTransform(backend)
{
  const registers = RESOURCE_REGISTERS[backend];
  const first = registers[RESOURCE_NAMES.indexOf(DETAIL_MERGE_INPUTS[0])];
  return {
    id: `Main.pass0:detail-map-array:sampled-resource:0:${first}`,
    kind: "texture-2d-array",
    version: 1,
    layoutKey: "Main.pass0",
    stage: "fragment",
    representation: "native-or-rgba8",
    missingLayer: "reject",
    group: 0,
    binding: null,
    output: {
      name: "DetailArrayMap",
      identity: `sampled-resource:0:${first}`,
      scopeIdentity: `sampled-resource:0:${first}@fragment`,
      viewDimension: "2d-array",
      layerCount: 3
    },
    inputs: DETAIL_MERGE_INPUTS.map((parameter, layer) =>
    {
      const registerIndex = registers[RESOURCE_NAMES.indexOf(parameter)];
      return {
        parameter,
        layer,
        identity: `sampled-resource:0:${registerIndex}`,
        scopeIdentity: `sampled-resource:0:${registerIndex}@fragment`
      };
    })
  };
}

// Post-transform layout bindings: every resource except the merged-away inputs,
// with Detail1Map's slot carrying the array instead.
function layoutResourceBindings(backend, skinned)
{
  const registers = RESOURCE_REGISTERS[backend];
  const bindings = [];
  let slot = skinned ? 6 : 5;
  for (let index = 0; index < RESOURCE_NAMES.length; index += 1)
  {
    const name = RESOURCE_NAMES[index];
    const layer = DETAIL_MERGE_INPUTS.indexOf(name);
    if (layer > 0) continue;
    if (layer === 0)
    {
      bindings.push({
        ...resourceBinding("DetailArrayMap", registers[index], slot, index, "2d-array"),
        transformId: detailTransform(backend).id,
        arrayLayerCount: 3,
        isSRGB: false
      });
    }
    else
    {
      bindings.push(resourceBinding(name, registers[index], slot, index));
    }
    slot += 1;
  }
  return { bindings, samplerBase: slot };
}

function resourceBinding(name, registerIndex, bindingIndex, index, override = null)
{
  const viewDimension = override ?? (index === 0 ? "cube" : "2d");
  return {
    ...binding(
      `sampled-resource:0:${registerIndex}`,
      bindingIndex,
      "fragment",
      "texture",
      {
        type: `texture_${viewDimension.replace("-", "_")}<f32>`,
        value: {
          sampleType: "float",
          viewDimension,
          multisampled: false
        }
      }
    ),
    name,
    textureKind: viewDimension,
    arrayElements: 1,
    isSRGB: index === 0 || name === "AlbedoMap"
  };
}

function samplerBinding(registerIndex, bindingIndex)
{
  return binding(
    `sampler:0:${registerIndex}`,
    bindingIndex,
    "fragment",
    "sampler",
    { type: "sampler", value: { type: "filtering" } }
  );
}

function vertexWgsl(tag, skinned)
{
  return `// ${tag}
struct VertexInput {
  @location(0) input0: vec3<f32>,
${skinned ? "  @location(1) input1: vec4<u32>,\n" : ""}  @location(2) input2: vec2<f32>,
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

function pixelWgsl(tag)
{
  return `// ${tag}
struct FragmentInput {
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

function packageRecord(backend, variant = "static")
{
  const skinned = variant === "skinned";
  const sourceStem = skinned
    ? "unpackedskinned_quaddetailv5"
    : "unpacked_quaddetailv5";
  const source =
    `res:/graphics/effect.${backend}/managed/space/spaceobject/v5/quad/` +
      `${sourceStem}.sm_hi`;
  const registers = RESOURCE_REGISTERS[backend];
  const shaderModules = [
    {
      key: "Main.pass0.vertex",
      techniqueName: "Main",
      passIndex: 0,
      stageName: "vertex",
      stageType: 0,
      entryPoint: "main",
      wgsl: vertexWgsl(backend, skinned)
    },
    {
      key: "Main.pass0.pixel",
      techniqueName: "Main",
      passIndex: 0,
      stageName: "pixel",
      stageType: 1,
      entryPoint: "main",
      wgsl: pixelWgsl(backend)
    }
  ];
  const bindings = [
    uniformBinding(0, 0, "fragment", 608),
    uniformBinding(1, 1, "vertex", 512),
    uniformBinding(2, 2, "fragment", 352),
    uniformBinding(3, 3, "vertex", skinned ? 432 : 416),
    uniformBinding(4, 4, "fragment", 432),
    ...(skinned ? [ boneBinding() ] : []),
    ...layoutResourceBindings(backend, skinned).bindings,
    samplerBinding(0, layoutResourceBindings(backend, skinned).samplerBase),
    samplerBinding(1, layoutResourceBindings(backend, skinned).samplerBase + 1),
    samplerBinding(2, layoutResourceBindings(backend, skinned).samplerBase + 2)
  ];
  const selectedOptions = selections(variant);
  return {
    backend,
    variant,
    filePath: `C:/fixture/quaddetail-${variant}-${backend}.carbonwebgpu`,
    resourcePath: `res:/fixture/quaddetail-${variant}-${backend}.carbonwebgpu`,
    analysis: {
      source,
      bodyIndex: 4,
      selectedOptions: structuredClone(selectedOptions),
      passes: [
        {
          techniqueName: "Main",
          passIndex: 0,
          renderStates: 1,
          states: []
        }
      ],
      stages: [
        {
          key: "Main.pass0.vertex",
          techniqueName: "Main",
          passIndex: 0,
          stageName: "vertex",
          stageType: 0,
          pipelineInputs: (skinned ? SKINNED_VERTEX_INPUTS : VERTEX_INPUTS)
            .map(pipelineInput),
          bindings: [
            ...(skinned ? [ analysisBone() ] : []),
            constantBuffer(1),
            constantBuffer(3)
          ]
        },
        {
          key: "Main.pass0.pixel",
          techniqueName: "Main",
          passIndex: 0,
          stageName: "pixel",
          stageType: 1,
          pipelineInputs: PIXEL_INPUTS.map(pipelineInput),
          bindings: [
            // Both backends reflect s0; DX12 lowers it to a signature sampler
            // rather than omitting it.
            analysisSampler(0, backend),
            analysisSampler(1),
            analysisSampler(2),
            ...RESOURCE_NAMES.map((name, index) =>
              analysisResource(name, registers[index], index)),
            constantBuffer(0, true),
            constantBuffer(2),
            constantBuffer(4)
          ]
        }
      ]
    },
    metadata: {
      sourcePath: source,
      bodyIndex: 4,
      selectedOptions,
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
      states: [],
      shaderModules,
      bindGroups: [ { group: 0, bindings } ],
      resourceTransforms: [ {
        ...detailTransform(backend),
        binding: bindings.find((entry) => entry.transformId).binding
      } ]
    }
  };
}

function changedMaterialFields(left, right)
{
  const names = new Set([
    ...Object.keys(left.material),
    ...Object.keys(right.material)
  ]);
  return [ ...names ].filter((name) =>
    JSON.stringify(left.material[name]) !== JSON.stringify(right.material[name]));
}

test("QuadDetailV5 exact static body4 records and resource plans validate", () =>
{
  const dx11 = packageRecord("dx11");
  const dx12 = packageRecord("dx12");
  assert.equal(validateQuadDetailV5PackageRecord(dx11), dx11);
  assert.equal(validateQuadDetailV5PackageRecord(dx12), dx12);
  assert.equal(validateQuadDetailV5PackagePair([ dx11, dx12 ])[1], dx12);

  const dx11Plan = getQuadDetailV5ResourcePlan(dx11);
  const dx12Plan = getQuadDetailV5ResourcePlan(dx12);
  assert.equal(dx11Plan.bone, null);
  // Post-transform: the three detail maps are one array binding, so the layout
  // is two shorter than the reflection and the samplers move down with it.
  assert.deepEqual(dx11Plan.textures.map((entry) => entry.name), MERGED_RESOURCE_NAMES);
  assert.deepEqual(dx11Plan.analysisResources.map((entry) => entry.name), RESOURCE_NAMES);
  assert.deepEqual(dx11Plan.textures.map((entry) => entry.registerIndex),
    mergedRegisters("dx11"));
  assert.deepEqual(dx12Plan.textures.map((entry) => entry.registerIndex),
    mergedRegisters("dx12"));
  assert.deepEqual(dx12Plan.analysisResources.map((entry) => entry.registerIndex),
    RESOURCE_REGISTERS.dx12);
  assert.deepEqual(dx12Plan.samplers.map((entry) => entry.binding), [ 17, 18, 19 ]);
  assert.equal(dx12Plan.textures.length + dx12Plan.samplers.length + 5, 20);

  assert.equal(dx11Plan.transforms.length, 1);
  const merge = dx11Plan.transforms[0];
  assert.equal(merge.output.name, "DetailArrayMap");
  assert.equal(merge.output.layerCount, 3);
  assert.equal(merge.output.scopeIdentity, "sampled-resource:0:11@fragment");
  assert.deepEqual(
    merge.inputs.map((entry) => [ entry.layer, entry.parameter, entry.scopeIdentity ]),
    [
      [ 0, "Detail1Map", "sampled-resource:0:11@fragment" ],
      [ 1, "Detail2Map", "sampled-resource:0:12@fragment" ],
      [ 2, "Detail3Map", "sampled-resource:0:13@fragment" ]
    ]
  );
  assert.deepEqual(
    dx12Plan.transforms[0].inputs.map((entry) => entry.scopeIdentity),
    [
      "sampled-resource:0:13@fragment",
      "sampled-resource:0:14@fragment",
      "sampled-resource:0:15@fragment"
    ]
  );
  const arrayBinding = dx11Plan.textures.at(-1);
  assert.equal(arrayBinding.viewDimension, "2d-array");
  assert.equal(arrayBinding.arrayLayerCount, 3);
  assert.equal(Object.isFrozen(dx12Plan), true);
  assert.equal(QUAD_DETAIL_V5_SELECTION, QUAD_DETAIL_V5_SELECTIONS.static);
});

test("QuadDetailV5 exact skinned body4 records, bone plan, and fixture validate", () =>
{
  const dx11 = packageRecord("dx11", "skinned");
  const dx12 = packageRecord("dx12", "skinned");
  assert.equal(validateQuadDetailV5PackageRecord(dx11), dx11);
  assert.equal(validateQuadDetailV5PackageRecord(dx12), dx12);
  assert.equal(validateQuadDetailV5PackagePair([ dx11, dx12 ])[1], dx12);

  assert.deepEqual(
    dx11.metadata.selectedOptions.map((entry) => entry.name),
    [
      "BINDLESS_RENDERING",
      "SPACE_OBJECT_CLIPPING",
      "SPACE_OBJECT_PPT_ENABLED",
      "SPACE_OBJECT_TRANSPARENCY",
      "V5_DEBUG",
      "BLEND_MODE"
    ]
  );
  assert.equal(
    dx11.metadata.selectedOptions.some((entry) =>
      entry.name === "SPACE_OBJECT_INSTANCED_ATTACHMENT"),
    false
  );
  assert.equal(
    dx11.pipeline.bindGroups[0].bindings[3].layout.buffer.minBindingSize,
    432
  );
  assert.match(
    dx11.pipeline.shaderModules[0].wgsl,
    /@location\(1\)\s+input1:\s*vec4<u32>/u
  );

  const dx11Plan = getQuadDetailV5ResourcePlan(dx11);
  const dx12Plan = getQuadDetailV5ResourcePlan(dx12);
  assert.deepEqual(dx11Plan.bone, {
    name: "BoneTransforms",
    identity: "sampled-resource:0:0",
    scopeIdentity: "sampled-resource:0:0@vertex",
    registerIndex: 0,
    binding: 5,
    minBindingSize: 48,
    structureStride: 48
  });
  assert.deepEqual(dx11Plan.textures.map((entry) => entry.binding), [
    6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17
  ]);
  assert.deepEqual(dx11Plan.textures.map((entry) => entry.registerIndex),
    mergedRegisters("dx11"));
  assert.deepEqual(dx12Plan.textures.map((entry) => entry.registerIndex),
    mergedRegisters("dx12"));
  assert.deepEqual(dx12Plan.analysisResources.map((entry) => entry.registerIndex),
    RESOURCE_REGISTERS.dx12);
  assert.deepEqual(dx12Plan.samplers.map((entry) => entry.binding), [ 18, 19, 20 ]);
  assert.equal(5 + 1 + dx12Plan.textures.length + dx12Plan.samplers.length, 21);

  const fixture = createQuadDetailV5FixtureValues(64, 64, "skinned");
  assert.ok(fixture.boneIndices instanceof Uint16Array);
  assert.equal(fixture.boneIndices.length, 13 * 4);
  for (let index = 0; index < 13; index += 1)
  {
    assert.deepEqual(
      Array.from(fixture.boneIndices.slice(index * 4, index * 4 + 4)),
      [ 1, 0, 0, 0 ]
    );
  }
  assert.deepEqual(fixture.textures.map((entry) => entry.name), RESOURCE_NAMES);
  assert.deepEqual(fixture.caseNames, [ "pptNeutral", "surface", "detail1", "detail2" ]);
});

test("QuadDetailV5 rejects permutation, IO, sparse material, binding, and bone drift", () =>
{
  const mutations = [
    (record) => { record.analysis.bodyIndex = 0; },
    (record) => { record.metadata.selectedOptions[2].value = "SOPPT_DISABLED"; },
    (record) => { record.analysis.selectedOptions[6].defaultValue = "OTHER"; },
    (record) => { record.metadata.wgslSelection.completePasses = false; },
    (record) => { record.analysis.stages[0].pipelineInputs[1].usedMask = 1; },
    (record) => { record.analysis.stages[1].pipelineInputs[6].registerIndex = 8; },
    (record) => { record.pipeline.shaderModules[0].wgsl =
      record.pipeline.shaderModules[0].wgsl.replace("@location(9)", "@location(8)"); },
    (record) => { record.pipeline.bindGroups[0].bindings[0].layout.buffer.minBindingSize = 592; },
    (record) => { record.pipeline.bindGroups[0].bindings[3].layout.buffer.minBindingSize = 432; },
    (record) => { record.pipeline.bindGroups[0].bindings.pop(); },
    (record) => { record.analysis.stages[0].bindings.push(analysisResource("BoneTransforms", 0, 0)); },
    (record) => {
      record.analysis.stages[1].bindings
        .find((entry) => entry.carbon?.name === "Detail3Map").registerIndex = 99;
    },
    (record) => {
      record.analysis.stages[1].bindings
        .find((entry) => entry.carbon?.hasLocalConstants)
        .carbon.constants.at(-1).offset = 576;
    },
    (record) => {
      record.analysis.stages[1].bindings
        .find((entry) => entry.kind === "sampler" && entry.registerIndex === 1)
        .carbon.sampler.addressU = 3;
    }
  ];
  for (const mutate of mutations)
  {
    const record = packageRecord("dx11");
    mutate(record);
    assert.throws(() => validateQuadDetailV5PackageRecord(record), /QuadDetailV5 fixture/u);
  }
});

test("QuadDetailV5 skinned validator rejects profile, interface, bone, and binding drift", () =>
{
  const mutations = [
    (record) => { delete record.variant; },
    (record) => {
      record.analysis.source = record.analysis.source.replace(
        "unpackedskinned_quaddetailv5",
        "unpacked_quaddetailv5"
      );
      record.metadata.sourcePath = record.analysis.source;
    },
    (record) => {
      record.metadata.selectedOptions.push({
        name: "SPACE_OBJECT_INSTANCED_ATTACHMENT",
        value: "SOIA_DISABLED",
        optionIndex: 0,
        defaultOption: 0,
        defaultValue: "SOIA_DISABLED",
        source: "local"
      });
    },
    (record) => { record.analysis.stages[0].pipelineInputs[1].usedMask = 0; },
    (record) => {
      record.pipeline.shaderModules[0].wgsl =
        record.pipeline.shaderModules[0].wgsl.replace(
          "  @location(1) input1: vec4<u32>,\n",
          ""
        );
    },
    (record) => {
      record.analysis.stages.push({
        key: "Main.pass1.pixel",
        techniqueName: "Main",
        passIndex: 1,
        stageName: "pixel",
        stageType: 1
      });
    },
    (record) => {
      record.pipeline.bindGroups[0].bindings[3].layout.buffer.minBindingSize = 416;
    },
    (record) => { record.analysis.stages[0].bindings.shift(); },
    (record) => { record.analysis.stages[0].bindings[0].carbon.type = 2; },
    (record) => { record.pipeline.bindGroups[0].bindings[5].structureStride = 64; },
    (record) => { record.pipeline.bindGroups[0].bindings[5].carbon.type = 2; },
    (record) => { record.pipeline.bindGroups[0].bindings[6].binding = 5; },
    (record) => { record.pipeline.bindGroups[0].bindings[20].binding = 19; }
  ];
  for (const mutate of mutations)
  {
    const record = packageRecord("dx11", "skinned");
    mutate(record);
    assert.throws(
      () => validateQuadDetailV5PackageRecord(record),
      /QuadDetailV5 fixture/u
    );
  }
});

test("QuadDetailV5 rejects unordered, aliased, and identical parity inputs", () =>
{
  const dx11 = packageRecord("dx11");
  const dx12 = packageRecord("dx12");
  assert.throws(
    () => validateQuadDetailV5PackagePair([
      dx11,
      packageRecord("dx12", "skinned")
    ]),
    /matching package variants/u
  );
  assert.throws(
    () => validateQuadDetailV5PackagePair([ dx12, dx11 ]),
    /order must be DX11 then DX12/u
  );
  dx12.filePath = dx11.filePath;
  assert.throws(
    () => validateQuadDetailV5PackagePair([ dx11, dx12 ]),
    /distinct physical package files/u
  );
  dx12.filePath = "C:/fixture/quaddetail-dx12.carbonwebgpu";
  dx12.resourcePath = dx11.resourcePath;
  assert.throws(
    () => validateQuadDetailV5PackagePair([ dx11, dx12 ]),
    /distinct logical resource paths/u
  );
  dx12.resourcePath = "res:/fixture/quaddetail-dx12.carbonwebgpu";
  dx12.pipeline.shaderModules.forEach((module, index) =>
  {
    module.wgsl = dx11.pipeline.shaderModules[index].wgsl;
  });
  assert.throws(
    () => validateQuadDetailV5PackagePair([ dx11, dx12 ]),
    /identical WGSL payloads/u
  );
});

test("QuadDetailV5 cases isolate pattern surface and individual detail weights", () =>
{
  const cases = createQuadDetailV5BindingCases(64, 64);
  assert.deepEqual(cases.caseNames, [ "pptNeutral", "surface", "detail1", "detail2" ]);
  assert.equal(Object.isFrozen(cases), true);
  assert.equal(Object.isFrozen(cases.bindingValuesByCase), true);
  const { pptNeutral, surface, detail1, detail2 } = cases.bindingValuesByCase;

  assert.deepEqual(changedMaterialFields(pptNeutral, surface), [
    "PMtl1DiffuseColor",
    "PMtl1FresnelColor",
    "PMtl1Gloss",
    "PMtl2DiffuseColor",
    "PMtl2FresnelColor",
    "PMtl2Gloss"
  ]);
  assert.deepEqual(changedMaterialFields(surface, detail1), [ "Detail1Data" ]);
  assert.deepEqual(changedMaterialFields(surface, detail2), [ "Detail2Data" ]);
  for (const value of [ pptNeutral, surface, detail1, detail2 ])
  {
    assert.deepEqual(value.material.DetailSelector, [ 1, 1, 1, 1 ]);
    assert.deepEqual(value.material.Detail3Data, [ 1, 0, 0, 0 ]);
    assert.deepEqual(value.material.DetailAlbedoColor, [ 0.32, 0.18, 0.08, 1 ]);
    assert.deepEqual(value.material.DetailFresnelColor, [ 0.24, 0.2, 0.16, 1 ]);
    assert.deepEqual(
      value.perObjectPS.customMaskMaterialIDs,
      [ 4, 5, 0, 0, 0, 0, 0, 0 ]
    );
    assert.deepEqual(
      value.perObjectPS.customMaskTargets,
      [ 1, 1, 1, 1, 1, 1, 1, 1 ]
    );
  }
  assert.deepEqual(detail1.material.Detail1Data, [ 1, 1, 0, 0 ]);
  assert.deepEqual(detail2.material.Detail2Data, [ 1, 1, 0, 0 ]);
});

test("QuadDetailV5 fixture is static, complete, and per-layer distinct", () =>
{
  assert.equal(QUAD_DETAIL_V5_TARGET_WIDTH, 64);
  assert.equal(QUAD_DETAIL_V5_TARGET_HEIGHT, 64);
  assert.deepEqual(
    QUAD_DETAIL_V5_VERTEX_BUFFER_LAYOUT.attributes.map((entry) => entry.shaderLocation),
    [ 0, 2, 3, 4, 5, 6 ]
  );
  const fixture = createQuadDetailV5FixtureValues(64, 64);
  assert.ok(fixture.vertices instanceof Float32Array);
  assert.ok(fixture.indices instanceof Uint16Array);
  assert.equal("boneIndices" in fixture, false);
  assert.deepEqual(fixture.textures.map((entry) => entry.name), RESOURCE_NAMES);
  assert.deepEqual(
    fixture.samplers.map((entry) => entry.name),
    [ "Sampler0", "PatternMask1MapSampler", "PatternMask2MapSampler" ]
  );
  const detail1 = fixture.textures.find((entry) => entry.name === "Detail1Map");
  const detail2 = fixture.textures.find((entry) => entry.name === "Detail2Map");
  const detail3 = fixture.textures.find((entry) => entry.name === "Detail3Map");

  // Layers 0 and 1 carry saturated, mutually distinct colour and a full-range
  // mask on opposite axes. Flat mid-grey with only an alpha ramp left the detail
  // control peaking at 3/255 on the skinned High body - the colour contributed
  // nothing - so per-layer distinctness is the contract, not neutrality.
  assert.deepEqual(Array.from(detail1.data.slice(0, 3)), [ 230, 90, 40 ]);
  assert.deepEqual(Array.from(detail2.data.slice(0, 3)), [ 40, 120, 230 ]);
  assert.notDeepEqual(
    Array.from(detail1.data.slice(0, 3)),
    Array.from(detail2.data.slice(0, 3))
  );
  const alphaOf = (texture) => [ ...new Set(Array.from(texture.data)
    .filter((_value, index) => index % 4 === 3)) ].sort((a, b) => a - b);
  assert.deepEqual(alphaOf(detail1), [ 0, 255 ]);
  assert.deepEqual(alphaOf(detail2), [ 0, 255 ]);

  // Layer 2 stays a no-op: the controls isolate layers 0 and 1, so a contributing
  // third layer would make their deltas harder to attribute.
  assert.deepEqual(Array.from(detail3.data.slice(0, 3)), [ 128, 128, 128 ]);
  assert.equal(Array.from(detail3.data).every((value, index) =>
    index % 4 !== 3 || value === 0), true);

  // The masks must vary on different axes, or the two delta maps could coincide.
  const rowMajorAlpha = (texture, x, y) => texture.data[(y * texture.width + x) * 4 + 3];
  assert.notEqual(rowMajorAlpha(detail1, 0, 0), rowMajorAlpha(detail1, 0, 7));
  assert.notEqual(rowMajorAlpha(detail2, 0, 0), rowMajorAlpha(detail2, 7, 0));
  assert.equal(rowMajorAlpha(detail1, 0, 0), rowMajorAlpha(detail1, 7, 0));
  assert.equal(rowMajorAlpha(detail2, 0, 0), rowMajorAlpha(detail2, 0, 7));
  assert.deepEqual(fixture.caseNames, [ "pptNeutral", "surface", "detail1", "detail2" ]);
});
