import assert from "node:assert/strict";
import test from "node:test";

import {
  QUAD_SAILS_V5_CASES,
  QUAD_SAILS_V5_CLEAR_TARGETS,
  QUAD_SAILS_V5_SELECTION,
  QUAD_SAILS_V5_SELECTIONS,
  QUAD_SAILS_V5_SKINNED_VERTEX_BUFFER_LAYOUT,
  QUAD_SAILS_V5_TARGET_HEIGHT,
  QUAD_SAILS_V5_TARGET_WIDTH,
  QUAD_SAILS_V5_VERTEX_BUFFER_LAYOUT,
  createQuadSailsV5BindingCases,
  createQuadSailsV5FixtureValues,
  getQuadSailsV5PrimitiveRecipe,
  getQuadSailsV5ResourcePlan,
  validateQuadSailsV5PackagePair,
  validateQuadSailsV5PackageRecord
} from "../harness/webgpu/quadSailsV5Fixture.js";

const BASE_UNIFORMS = [
  [ 0, "fragment", 464, 29 ],
  [ 1, "vertex", 512, 32 ],
  [ 2, "fragment", 352, 22 ],
  [ 4, "fragment", 208, 13 ]
];

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
  "SailsDetailMap"
];

const PROFILES = {
  skinned: {
    bodyIndex: 4,
    sourceFile: "unpackedskinned_quadsailsv5.sm_hi",
    selection: QUAD_SAILS_V5_SELECTIONS.skinned,
    bone: true,
    cb3: [ 3, "vertex", 432, 27 ],
    textureBindingBase: 6,
    samplerBinding: 16,
    pixelTailLocation: 9,
    resourceRegisters: {
      dx11: [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ],
      dx12: [ 0, 1, 2, 3, 4, 6, 7, 9, 10, 13 ]
    }
  },
  static: {
    bodyIndex: 0,
    sourceFile: "unpacked_quadsailsv5.sm_hi",
    selection: QUAD_SAILS_V5_SELECTIONS.static,
    bone: false,
    cb3: [ 3, "vertex", 128, 8 ],
    textureBindingBase: 5,
    samplerBinding: 15,
    pixelTailLocation: 8,
    resourceRegisters: {
      dx11: [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ],
      dx12: [ 0, 1, 2, 3, 4, 6, 7, 9, 10, 11 ]
    }
  }
};

const MATERIAL_CONSTANTS = [
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
  [ "SailsDetailData", 448 ]
];

function profileFor(variant)
{
  return PROFILES[variant];
}

function uniformsFor(variant)
{
  const profile = profileFor(variant);
  return [ ...BASE_UNIFORMS.slice(0, 3), profile.cb3, BASE_UNIFORMS[3] ]
    .sort((left, right) => left[0] - right[0]);
}

function selectedOptions(variant = "skinned")
{
  return Object.entries(profileFor(variant).selection).map(([ name, value ]) => ({
    name,
    value,
    optionIndex: name === "SPACE_OBJECT_PPT_ENABLED" && value === "SOPPT_ENABLED"
      ? 1
      : 0,
    defaultOption: 0,
    defaultValue: name === "SPACE_OBJECT_PPT_ENABLED" ? "SOPPT_DISABLED" : value,
    source: "local"
  }));
}

function uniformBinding(registerIndex, visibility, minBindingSize, vectors)
{
  const identity = `uniform-buffer:0:${registerIndex}`;
  return {
    identity,
    scopeIdentity: `${identity}@${visibility}`,
    resourceKind: "uniform-buffer",
    registerSpace: 0,
    registerIndex,
    sourceTruth: "wgsl-layout",
    group: 0,
    binding: registerIndex,
    dynamic: false,
    visibility: [ visibility ],
    layout: {
      type: `array<vec4<f32>, ${vectors}>`,
      buffer: {
        type: "uniform",
        hasDynamicOffset: false,
        minBindingSize
      },
      texture: null,
      sampler: null
    }
  };
}

function boneBinding()
{
  return {
    name: "BoneTransforms",
    identity: "sampled-resource:0:0",
    scopeIdentity: "sampled-resource:0:0@vertex",
    resourceKind: "sampled-resource",
    registerSpace: 0,
    registerIndex: 0,
    sourceTruth: "wgsl-layout",
    group: 0,
    binding: 5,
    dynamic: false,
    visibility: [ "vertex" ],
    layout: {
      type: "array<u32>",
      buffer: {
        type: "read-only-storage",
        hasDynamicOffset: false,
        minBindingSize: 48
      },
      texture: null,
      sampler: null
    },
    structureStride: 48
  };
}

function resourceBinding(backend, index, variant = "skinned")
{
  const profile = profileFor(variant);
  const registerIndex = profile.resourceRegisters[backend][index];
  const identity = `sampled-resource:0:${registerIndex}`;
  const isSRGB = index === 0 || index === 5;
  return {
    name: RESOURCE_NAMES[index],
    identity,
    scopeIdentity: `${identity}@fragment`,
    resourceKind: "sampled-resource",
    registerSpace: 0,
    registerIndex,
    sourceTruth: "wgsl-layout",
    group: 0,
    binding: profile.textureBindingBase + index,
    dynamic: false,
    visibility: [ "fragment" ],
    layout: {
      type: index === 0 ? "texture_cube<f32>" : "texture_2d<f32>",
      buffer: null,
      texture: {
        sampleType: "float",
        viewDimension: index === 0 ? "cube" : "2d",
        multisampled: false
      },
      sampler: null
    },
    isSRGB
  };
}

function samplerBinding(variant = "skinned")
{
  const profile = profileFor(variant);
  return {
    name: "SurfaceSampler",
    identity: "sampler:0:0",
    scopeIdentity: "sampler:0:0@fragment",
    resourceKind: "sampler",
    registerSpace: 0,
    registerIndex: 0,
    sourceTruth: "wgsl-layout",
    group: 0,
    binding: profile.samplerBinding,
    dynamic: false,
    visibility: [ "fragment" ],
    layout: {
      type: "sampler",
      buffer: null,
      texture: null,
      sampler: { type: "filtering" }
    }
  };
}

function materialBinding()
{
  return {
    kind: "constantBuffer",
    registerSpace: 0,
    registerIndex: 0,
    carbon: {
      hasLocalConstants: true,
      constantValueSize: 464,
      constants: MATERIAL_CONSTANTS.map(([ name, offset ]) => ({
        name,
        offset,
        size: 16,
        type: 0,
        dimension: 4,
        elements: 0
      }))
    }
  };
}

function reflectedBone()
{
  return {
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
  };
}

function reflectedResource(backend, index, variant = "skinned")
{
  return {
    kind: "resource",
    registerSpace: 0,
    registerIndex: profileFor(variant).resourceRegisters[backend][index],
    registerType: index === 0 ? 41 : 36,
    carbon: {
      name: RESOURCE_NAMES[index],
      type: index === 0 ? 4 : 2,
      arrayElements: 1,
      isSRGB: index === 0 || index === 5,
      isAutoregister: index === 2
    }
  };
}

function reflectedSampler()
{
  return {
    kind: "sampler",
    registerSpace: 0,
    registerIndex: 0,
    registerType: 1,
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
        mipLODBias: 0,
        maxAnisotropy: 16,
        isDynamic: false
      }
    }
  };
}

function shaderModule(backend, stageName, variant = "skinned")
{
  const profile = profileFor(variant);
  const wgsl = stageName === "vertex"
    ? `
      // ${backend}
      struct VertexInput {
        @location(0) input0: vec3<f32>,
        ${profile.bone ? "@location(1) input1: vec4<u32>," : ""}
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
        ${profile.pixelTailLocation === 9
    ? "@location(9) output9: vec4<f32>,"
    : ""}
      };
      @vertex fn main(input: VertexInput) -> VertexOutput {
        var result: VertexOutput;
        result.position = vec4<f32>(input.input0, 1.0);
        return result;
      }`
    : `
      // ${backend}
      struct FragmentInput {
        @builtin(position) position: vec4<f32>,
        @location(1) input1: vec4<f32>,
        @location(2) input2: vec3<f32>,
        @location(3) input3: vec3<f32>,
        @location(4) input4: vec3<f32>,
        @location(5) input5: vec4<f32>,
        @location(${profile.pixelTailLocation}) input${profile.pixelTailLocation}: vec4<f32>,
      };
      struct FragmentOutput {
        @location(0) output0: vec4<f32>,
        @location(1) output1: vec4<f32>,
      };
      @fragment fn main(input: FragmentInput) -> FragmentOutput {
        var result: FragmentOutput;
        result.output0 = input.position;
        result.output1 = input.input${profile.pixelTailLocation};
        return result;
      }`;
  return {
    key: `Main.pass0.${stageName}`,
    techniqueName: "Main",
    passIndex: 0,
    stageName,
    stageType: stageName === "vertex" ? 0 : 1,
    entryPoint: "main",
    wgsl
  };
}

function vertexInputs(variant = "skinned")
{
  const profile = profileFor(variant);
  return [
    {
      usageName: "POSITION",
      usageIndex: 0,
      registerIndex: 0,
      usedMask: 7,
      type: 0,
      dimension: 3
    },
    ...(profile.bone ? [ {
      usageName: "BLENDINDICES",
      usageIndex: 0,
      registerIndex: 1,
      usedMask: 1,
      type: 2,
      dimension: 4
    } ] : []),
    {
      usageName: "TEXCOORD",
      usageIndex: 0,
      registerIndex: 2,
      usedMask: 3,
      type: 0,
      dimension: 2
    },
    {
      usageName: "NORMAL",
      usageIndex: 0,
      registerIndex: 3,
      usedMask: 7,
      type: 0,
      dimension: 3
    },
    {
      usageName: "TANGENT",
      usageIndex: 0,
      registerIndex: 4,
      usedMask: 7,
      type: 0,
      dimension: 3
    },
    {
      usageName: "BITANGENT",
      usageIndex: 0,
      registerIndex: 5,
      usedMask: 7,
      type: 0,
      dimension: 3
    },
    {
      usageName: "TEXCOORD",
      usageIndex: 1,
      registerIndex: 6,
      usedMask: 3,
      type: 0,
      dimension: 2
    }
  ];
}

function pixelInputs(variant = "skinned")
{
  const profile = profileFor(variant);
  return [
    {
      usageName: "TEXCOORD",
      usageIndex: 0,
      registerIndex: 1,
      usedMask: 3,
      type: 0,
      dimension: 4
    },
    {
      usageName: "TEXCOORD",
      usageIndex: 1,
      registerIndex: 2,
      usedMask: 7,
      type: 0,
      dimension: 3
    },
    {
      usageName: "TEXCOORD",
      usageIndex: 2,
      registerIndex: 3,
      usedMask: 7,
      type: 0,
      dimension: 3
    },
    {
      usageName: "TEXCOORD",
      usageIndex: 3,
      registerIndex: 4,
      usedMask: 7,
      type: 0,
      dimension: 3
    },
    {
      usageName: "TEXCOORD",
      usageIndex: 4,
      registerIndex: 5,
      usedMask: 15,
      type: 0,
      dimension: 4
    },
    {
      usageName: "TEXCOORD",
      usageIndex: 9,
      registerIndex: profile.pixelTailLocation,
      usedMask: 11,
      type: 0,
      dimension: 4
    }
  ];
}

function makeRecord(backend, variant = "skinned")
{
  const profile = profileFor(variant);
  const source =
    `C:/fixtures/res/graphics/effect.${backend}/managed/space/spaceobject/` +
    `v5/quad/${profile.sourceFile}`;
  const state = [ { state: 14, value: 1 } ];
  const pixelBindings = [
    // Reflected on both backends; DX12 declares it in the root signature.
    reflectedSampler(),
    ...RESOURCE_NAMES.map((_name, index) => reflectedResource(backend, index, variant)),
    materialBinding(),
    { kind: "constantBuffer", registerSpace: 0, registerIndex: 2, carbon: {} },
    { kind: "constantBuffer", registerSpace: 0, registerIndex: 4, carbon: {} }
  ];
  return {
    backend,
    variant,
    label: `${backend}.carbonwebgpu`,
    filePath: `C:/fixtures/quadsailsv5/${backend}.carbonwebgpu`,
    resourcePath: `res:/webgpu-harness/quadsailsv5/${backend}.carbonwebgpu`,
    analysis: {
      source,
      bodyIndex: profile.bodyIndex,
      selectedOptions: selectedOptions(variant),
      passes: [ {
        techniqueName: "Main",
        passIndex: 0,
        renderStates: 1,
        states: structuredClone(state)
      } ],
      stages: [
        {
          techniqueName: "Main",
          passIndex: 0,
          stageName: "vertex",
          pipelineInputs: vertexInputs(variant),
          bindings: [
            { kind: "constantBuffer", registerSpace: 0, registerIndex: 1, carbon: {} },
            { kind: "constantBuffer", registerSpace: 0, registerIndex: 3, carbon: {} },
            ...(profile.bone ? [ reflectedBone() ] : [])
          ]
        },
        {
          techniqueName: "Main",
          passIndex: 0,
          stageName: "pixel",
          pipelineInputs: pixelInputs(variant),
          bindings: pixelBindings
        }
      ]
    },
    metadata: {
      sourcePath: source,
      bodyIndex: profile.bodyIndex,
      selectedOptions: selectedOptions(variant),
      wgslSelection: {
        mode: "explicit",
        techniqueName: "Main",
        passIndex: null,
        requestedStageNames: [],
        selectedStageKeys: [ "Main.pass0.vertex", "Main.pass0.pixel" ],
        completePasses: true
      }
    },
    pipeline: {
      techniqueName: "Main",
      passIndex: 0,
      renderStates: 1,
      states: structuredClone(state),
      shaderModules: [
        shaderModule(backend, "vertex", variant),
        shaderModule(backend, "pixel", variant)
      ],
      bindGroups: [ {
        group: 0,
        bindings: [
          ...uniformsFor(variant).map(([ registerIndex, visibility, size, vectors ]) =>
            uniformBinding(registerIndex, visibility, size, vectors)),
          ...(profile.bone ? [ boneBinding() ] : []),
          ...RESOURCE_NAMES.map((_name, index) =>
            resourceBinding(backend, index, variant)),
          samplerBinding(variant)
        ]
      } ]
    }
  };
}

test("QuadSailsV5 fixture requires an exact geometry variant and isolates authored sail rotation", () =>
{
  const fixture = createQuadSailsV5FixtureValues(64, 64, "skinned");
  const staticFixture = createQuadSailsV5FixtureValues(64, 64, "static");
  assert.equal(QUAD_SAILS_V5_TARGET_WIDTH, 64);
  assert.equal(QUAD_SAILS_V5_TARGET_HEIGHT, 64);
  assert.equal(fixture.vertices.length, 13 * 16);
  assert.equal(fixture.boneIndices.length, 13 * 4);
  assert.equal(staticFixture.boneIndices, null);
  assert.equal(staticFixture.vertices.length, fixture.vertices.length);
  assert.deepEqual(
    staticFixture.textures.map((entry) => entry.name),
    fixture.textures.map((entry) => entry.name)
  );
  assert.deepEqual(
    Array.from(staticFixture.textures
      .find((entry) => entry.name === "MaterialMap").data.slice(0, 8)),
    [ 0, 255, 128, 255, 0, 255, 128, 255 ]
  );
  assert.notDeepEqual(
    staticFixture.textures.find((entry) => entry.name === "MaterialMap").data,
    fixture.textures.find((entry) => entry.name === "MaterialMap").data
  );
  assert.equal(fixture.indices.length, 36);
  assert.deepEqual(fixture.caseNames, QUAD_SAILS_V5_CASES);
  assert.deepEqual(QUAD_SAILS_V5_CASES, [ "unrotated", "authored" ]);
  assert.deepEqual(
    fixture.textures.map((entry) => entry.name),
    RESOURCE_NAMES
  );
  assert.deepEqual(
    fixture.textures.map((entry) => entry.dimension),
    [ "cube", "2d", "2d", "2d", "2d", "2d", "2d", "2d", "2d", "2d" ]
  );
  const sailsDetail = fixture.textures.at(-1);
  assert.equal(sailsDetail.format, "rgba8unorm");
  assert.equal(sailsDetail.data.length, 8 * 8 * 4);
  assert.deepEqual(Array.from(sailsDetail.data.slice(0, 8)), [
    24, 32, 224, 255,
    61, 45, 207, 255
  ]);
  for (let index = 0; index < fixture.boneIndices.length; index += 4)
  {
    assert.deepEqual(Array.from(fixture.boneIndices.slice(index, index + 4)), [ 1, 0, 0, 0 ]);
  }

  const unrotated = fixture.bindingValuesByCase.unrotated;
  const authored = fixture.bindingValuesByCase.authored;
  assert.deepEqual(unrotated.material.SailsDetailData, [ 16, 0, 1, 0.65 ]);
  assert.deepEqual(
    authored.material.SailsDetailData,
    [ 16, 1.570796012878418, 1, 0.65 ]
  );
  assert.strictEqual(unrotated.perFrameVS, authored.perFrameVS);
  assert.strictEqual(unrotated.perFramePS, authored.perFramePS);
  assert.strictEqual(unrotated.perObjectVS, authored.perObjectVS);
  assert.strictEqual(unrotated.perObjectPS, authored.perObjectPS);
  assert.deepEqual(unrotated.perObjectPS.shipData, authored.perObjectPS.shipData);
  const unrotatedMaterial = { ...unrotated.material, SailsDetailData: null };
  const authoredMaterial = { ...authored.material, SailsDetailData: null };
  assert.deepEqual(unrotatedMaterial, authoredMaterial);
  assert.deepEqual(Object.keys(unrotated.material), MATERIAL_CONSTANTS.map(([ name ]) => name));

  const cases = createQuadSailsV5BindingCases(64, 64);
  assert.deepEqual(cases.caseNames, QUAD_SAILS_V5_CASES);
  assert.deepEqual(
    cases.bindingValuesByCase.authored.material.SailsDetailData,
    authored.material.SailsDetailData
  );
  assert.deepEqual(fixture.samplers, [ {
    name: "SurfaceSampler",
    minFilter: "linear",
    magFilter: "linear",
    mipmapFilter: "linear",
    addressModeU: "repeat",
    addressModeV: "repeat",
    addressModeW: "clamp-to-edge",
    maxAnisotropy: 16
  } ]);
  assert.deepEqual(QUAD_SAILS_V5_VERTEX_BUFFER_LAYOUT, {
    arrayStride: 64,
    attributes: [
      { shaderLocation: 0, offset: 0, format: "float32x3" },
      { shaderLocation: 2, offset: 12, format: "float32x2" },
      { shaderLocation: 3, offset: 20, format: "float32x3" },
      { shaderLocation: 4, offset: 32, format: "float32x3" },
      { shaderLocation: 5, offset: 44, format: "float32x3" },
      { shaderLocation: 6, offset: 56, format: "float32x2" }
    ]
  });
  assert.deepEqual(QUAD_SAILS_V5_SKINNED_VERTEX_BUFFER_LAYOUT, {
    arrayStride: 8,
    attributes: [ { shaderLocation: 1, offset: 0, format: "uint16x4" } ]
  });
  assert.deepEqual(QUAD_SAILS_V5_CLEAR_TARGETS, [
    [ 0, 255, 0, 255 ],
    [ 255, 0, 255, 255 ]
  ]);
  assert.deepEqual(getQuadSailsV5PrimitiveRecipe(), {
    frontFace: "cw",
    cullMode: "back"
  });
  assert.throws(
    () => createQuadSailsV5FixtureValues(64, 64),
    /variant must be static or skinned/u
  );
  assert.throws(
    () => createQuadSailsV5FixtureValues(0, 64, "skinned"),
    /positive integers/u
  );
});

test("QuadSailsV5 validates exact ordered PPT-on skinned DX11/DX12 records", () =>
{
  const records = [ makeRecord("dx11"), makeRecord("dx12") ];
  assert.equal(validateQuadSailsV5PackageRecord(records[0]), records[0]);
  assert.equal(validateQuadSailsV5PackageRecord(records[1]), records[1]);
  assert.equal(validateQuadSailsV5PackagePair(records), records);
  const dx11Plan = getQuadSailsV5ResourcePlan(records[0]);
  const dx12Plan = getQuadSailsV5ResourcePlan(records[1]);
  assert.deepEqual(
    dx11Plan.textures.map((entry) => entry.registerIndex),
    PROFILES.skinned.resourceRegisters.dx11
  );
  assert.deepEqual(
    dx12Plan.textures.map((entry) => entry.registerIndex),
    PROFILES.skinned.resourceRegisters.dx12
  );
  assert.deepEqual(dx11Plan.bone, {
    name: "BoneTransforms",
    identity: "sampled-resource:0:0",
    scopeIdentity: "sampled-resource:0:0@vertex",
    registerIndex: 0,
    binding: 5,
    minBindingSize: 48,
    structureStride: 48
  });
  assert.deepEqual(
    dx12Plan.samplers.map((entry) => [
      entry.name,
      entry.registerIndex,
      entry.binding
    ]),
    [ [ "SurfaceSampler", 0, 16 ] ]
  );
  assert.equal(dx12Plan.textures.at(-1).name, "SailsDetailMap");
  assert.equal(dx12Plan.textures.at(-1).registerIndex, 13);
  assert.deepEqual(records[0].pipeline.states, [ { state: 14, value: 1 } ]);
});

test("QuadSailsV5 validates exact ordered PPT-off static DX11/DX12 records", () =>
{
  const records = [ makeRecord("dx11", "static"), makeRecord("dx12", "static") ];
  assert.equal(validateQuadSailsV5PackageRecord(records[0]), records[0]);
  assert.equal(validateQuadSailsV5PackageRecord(records[1]), records[1]);
  assert.equal(validateQuadSailsV5PackagePair(records), records);
  const dx11Plan = getQuadSailsV5ResourcePlan(records[0]);
  const dx12Plan = getQuadSailsV5ResourcePlan(records[1]);
  assert.equal(dx11Plan.bone, null);
  assert.deepEqual(
    dx11Plan.textures.map((entry) => entry.registerIndex),
    PROFILES.static.resourceRegisters.dx11
  );
  assert.deepEqual(
    dx12Plan.textures.map((entry) => entry.registerIndex),
    PROFILES.static.resourceRegisters.dx12
  );
  assert.deepEqual(
    dx12Plan.textures.map((entry) => entry.binding),
    [ 5, 6, 7, 8, 9, 10, 11, 12, 13, 14 ]
  );
  assert.deepEqual(
    dx12Plan.samplers.map((entry) => [
      entry.name,
      entry.registerIndex,
      entry.binding
    ]),
    [ [ "SurfaceSampler", 0, 15 ] ]
  );
  assert.equal(dx12Plan.textures.at(-1).name, "SailsDetailMap");
  assert.equal(dx12Plan.textures.at(-1).registerIndex, 11);
  assert.equal(
    records[0].pipeline.bindGroups[0].bindings
      .find((entry) => entry.scopeIdentity === "uniform-buffer:0:3@vertex")
      .layout.buffer.minBindingSize,
    128
  );
  assert.equal(
    records[0].pipeline.bindGroups[0].bindings
      .some((entry) => entry.scopeIdentity === "sampled-resource:0:0@vertex"),
    false
  );
});

test("QuadSailsV5 rejects variant, provenance, body, permutation, and state drift", () =>
{
  const invalidVariant = makeRecord("dx11");
  invalidVariant.variant = "opaque";
  assert.throws(
    () => validateQuadSailsV5PackageRecord(invalidVariant),
    /variant must be static or skinned/u
  );

  const invalidSource = makeRecord("dx11");
  invalidSource.metadata.sourcePath = invalidSource.metadata.sourcePath
    .replace("effect.dx11", "effect.dx12");
  assert.throws(
    () => validateQuadSailsV5PackageRecord(invalidSource),
    /source provenance/u
  );

  const invalidShaderPath = makeRecord("dx11");
  invalidShaderPath.analysis.source = invalidShaderPath.analysis.source
    .replace("unpackedskinned_quadsailsv5", "unpacked_quadsailsv5");
  invalidShaderPath.metadata.sourcePath = invalidShaderPath.analysis.source;
  assert.throws(
    () => validateQuadSailsV5PackageRecord(invalidShaderPath),
    /unpackedskinned_quadsailsv5/u
  );

  const invalidBody = makeRecord("dx12");
  invalidBody.analysis.bodyIndex = 0;
  assert.throws(
    () => validateQuadSailsV5PackageRecord(invalidBody),
    /body index 4/u
  );

  const invalidPpt = makeRecord("dx11");
  invalidPpt.analysis.selectedOptions
    .find((entry) => entry.name === "SPACE_OBJECT_PPT_ENABLED").value = "SOPPT_DISABLED";
  assert.throws(
    () => validateQuadSailsV5PackageRecord(invalidPpt),
    /SOPPT_ENABLED/u
  );

  const invalidPptProvenance = makeRecord("dx11");
  invalidPptProvenance.metadata.selectedOptions
    .find((entry) => entry.name === "SPACE_OBJECT_PPT_ENABLED").optionIndex = 0;
  assert.throws(
    () => validateQuadSailsV5PackageRecord(invalidPptProvenance),
    /unexpected provenance/u
  );

  const injectedTransparency = makeRecord("dx11");
  injectedTransparency.metadata.selectedOptions.push({
    name: "SPACE_OBJECT_TRANSPARENCY",
    value: "SOT_OPAQUE",
    optionIndex: 0,
    defaultOption: 0,
    defaultValue: "SOT_OPAQUE",
    source: "local"
  });
  assert.throws(
    () => validateQuadSailsV5PackageRecord(injectedTransparency),
    /every QuadSailsV5 permutation selection/u
  );

  const incompleteMain = makeRecord("dx11");
  incompleteMain.metadata.wgslSelection.completePasses = false;
  assert.throws(
    () => validateQuadSailsV5PackageRecord(incompleteMain),
    /complete Main.pass0/u
  );

  const invalidAnalysisState = makeRecord("dx11");
  invalidAnalysisState.analysis.passes[0].states[0].value = 0;
  assert.throws(
    () => validateQuadSailsV5PackageRecord(invalidAnalysisState),
    /RS_ZWRITEENABLE=1/u
  );

  const invalidPipelineState = makeRecord("dx12");
  invalidPipelineState.pipeline.states = [];
  assert.throws(
    () => validateQuadSailsV5PackageRecord(invalidPipelineState),
    /RS_ZWRITEENABLE=1/u
  );
});

test("QuadSailsV5 rejects interface, binding, reflection, and pair drift", () =>
{
  const invalidBlendIndex = makeRecord("dx11");
  invalidBlendIndex.analysis.stages[0].pipelineInputs[1].type = 0;
  assert.throws(
    () => validateQuadSailsV5PackageRecord(invalidBlendIndex),
    /vertex.*input contract/u
  );

  const invalidVertexWgsl = makeRecord("dx11");
  invalidVertexWgsl.pipeline.shaderModules[0].wgsl =
    invalidVertexWgsl.pipeline.shaderModules[0].wgsl.replace(
      "@location(1) input1: vec4<u32>",
      "@location(1) input1: vec4<f32>"
    );
  assert.throws(
    () => validateQuadSailsV5PackageRecord(invalidVertexWgsl),
    /VertexInput.*interface contract/u
  );

  const invalidVertexTail = makeRecord("dx11");
  invalidVertexTail.pipeline.shaderModules[0].wgsl =
    invalidVertexTail.pipeline.shaderModules[0].wgsl.replace(
      "@location(9) output9",
      "@location(10) output9"
    );
  assert.throws(
    () => validateQuadSailsV5PackageRecord(invalidVertexTail),
    /VertexOutput.*interface contract/u
  );

  const invalidPixelTail = makeRecord("dx12");
  invalidPixelTail.analysis.stages[1].pipelineInputs.at(-1).registerIndex = 8;
  assert.throws(
    () => validateQuadSailsV5PackageRecord(invalidPixelTail),
    /pixel.*input contract/u
  );

  const invalidFragmentWgsl = makeRecord("dx12");
  invalidFragmentWgsl.pipeline.shaderModules[1].wgsl =
    invalidFragmentWgsl.pipeline.shaderModules[1].wgsl.replace(
      "@location(9) input9",
      "@location(8) input9"
    );
  assert.throws(
    () => validateQuadSailsV5PackageRecord(invalidFragmentWgsl),
    /FragmentInput.*interface contract/u
  );

  const invalidMaterialGap = makeRecord("dx11");
  invalidMaterialGap.analysis.stages[1].bindings
    .find((entry) => entry.kind === "constantBuffer" && entry.registerIndex === 0)
    .carbon.constants.unshift({
      name: "GeneralData",
      offset: 0,
      size: 16,
      type: 0,
      dimension: 4,
      elements: 0
    });
  assert.throws(
    () => validateQuadSailsV5PackageRecord(invalidMaterialGap),
    /sparse material constant count/u
  );

  const invalidSailsOffset = makeRecord("dx12");
  invalidSailsOffset.analysis.stages[1].bindings
    .find((entry) => entry.kind === "constantBuffer" && entry.registerIndex === 0)
    .carbon.constants.at(-1).offset = 224;
  assert.throws(
    () => validateQuadSailsV5PackageRecord(invalidSailsOffset),
    /SailsDetailData layout/u
  );

  const invalidBoneStride = makeRecord("dx11");
  invalidBoneStride.pipeline.bindGroups[0].bindings
    .find((entry) => entry.scopeIdentity === "sampled-resource:0:0@vertex")
    .structureStride = 64;
  assert.throws(
    () => validateQuadSailsV5PackageRecord(invalidBoneStride),
    /BoneTransforms.*storage layout/u
  );

  const invalidBoneReflection = makeRecord("dx11");
  invalidBoneReflection.analysis.stages[0].bindings
    .find((entry) => entry.kind === "resource").carbon.type = 2;
  assert.throws(
    () => validateQuadSailsV5PackageRecord(invalidBoneReflection),
    /BoneTransforms.*Carbon metadata/u
  );

  const invalidDx12Tail = makeRecord("dx12");
  const dx12Tail = invalidDx12Tail.pipeline.bindGroups[0].bindings
    .find((entry) => entry.name === "SailsDetailMap");
  dx12Tail.identity = "sampled-resource:0:11";
  dx12Tail.scopeIdentity = "sampled-resource:0:11@fragment";
  dx12Tail.registerIndex = 11;
  assert.throws(
    () => validateQuadSailsV5PackageRecord(invalidDx12Tail),
    /sampled-resource:0:13.*slot/u
  );

  const invalidTexture = makeRecord("dx12");
  invalidTexture.pipeline.bindGroups[0].bindings
    .find((entry) => entry.name === "AlbedoMap").isSRGB = false;
  assert.throws(
    () => validateQuadSailsV5PackageRecord(invalidTexture),
    /texture layout/u
  );

  const invalidSampler = makeRecord("dx11");
  invalidSampler.analysis.stages[1].bindings
    .find((entry) => entry.kind === "sampler")
    .carbon.sampler.maxAnisotropy = 1;
  assert.throws(
    () => validateQuadSailsV5PackageRecord(invalidSampler),
    /static state/u
  );

  const dx12SamplerReflection = makeRecord("dx12");
  dx12SamplerReflection.analysis.stages[1].bindings.push(reflectedSampler());
  assert.throws(
    () => validateQuadSailsV5PackageRecord(dx12SamplerReflection),
    /binding inventory/u
  );

  const extraBinding = makeRecord("dx11");
  extraBinding.pipeline.bindGroups[0].bindings.push({
    ...resourceBinding("dx11", 9),
    identity: "sampled-resource:0:99",
    scopeIdentity: "sampled-resource:0:99@fragment",
    registerIndex: 99,
    binding: 17
  });
  assert.throws(
    () => validateQuadSailsV5PackageRecord(extraBinding),
    /exactly 17 canonical bindings/u
  );

  const reversed = [ makeRecord("dx12"), makeRecord("dx11") ];
  assert.throws(
    () => validateQuadSailsV5PackagePair(reversed),
    /order must be DX11 then DX12/u
  );

  const mixed = [ makeRecord("dx11", "static"), makeRecord("dx12", "skinned") ];
  assert.throws(
    () => validateQuadSailsV5PackagePair(mixed),
    /matching package variants/u
  );

  const duplicatePath = [ makeRecord("dx11"), makeRecord("dx12") ];
  duplicatePath[1].filePath = duplicatePath[0].filePath;
  assert.throws(
    () => validateQuadSailsV5PackagePair(duplicatePath),
    /distinct physical/u
  );

  const identicalWgsl = [ makeRecord("dx11"), makeRecord("dx12") ];
  identicalWgsl[1].pipeline.shaderModules = structuredClone(
    identicalWgsl[0].pipeline.shaderModules
  );
  assert.throws(
    () => validateQuadSailsV5PackagePair(identicalWgsl),
    /identical WGSL/u
  );
});
