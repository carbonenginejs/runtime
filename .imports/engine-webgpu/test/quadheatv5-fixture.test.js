import assert from "node:assert/strict";
import test from "node:test";

import {
  QUAD_HEAT_V5_CASES,
  QUAD_HEAT_V5_SELECTION,
  createQuadHeatV5FixtureValues,
  getQuadHeatV5PrimitiveRecipe,
  getQuadHeatV5ResourcePlan,
  validateQuadHeatV5PackagePair,
  validateQuadHeatV5PackageRecord
} from "../harness/webgpu/quadHeatV5Fixture.js";

const UNIFORMS = [
  [ 0, "fragment", 464 ],
  [ 1, "vertex", 512 ],
  [ 2, "fragment", 352 ],
  [ 3, "vertex", 128 ],
  [ 4, "fragment", 208 ]
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
  "HeatGlowNoiseMap"
];

const RESOURCE_REGISTERS = {
  dx11: [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ],
  dx12: [ 0, 1, 2, 3, 4, 6, 7, 9, 10, 11 ]
};

const MATERIAL_CONSTANTS = [
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
  [ "Mtl1HeatGlowData", 384 ],
  [ "Mtl2HeatGlowData", 400 ],
  [ "Mtl3HeatGlowData", 416 ],
  [ "Mtl4HeatGlowData", 432 ],
  [ "GeneralHeatGlowColor", 448 ]
];

function selectedOptions()
{
  return Object.entries(QUAD_HEAT_V5_SELECTION).map(([ name, value ]) => ({
    name,
    value,
    optionIndex: 0,
    defaultOption: 0,
    defaultValue: value,
    source: "local"
  }));
}

function uniformBinding(registerIndex, visibility, minBindingSize)
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
      type: "uniform",
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

function resourceBinding(backend, index)
{
  const registerIndex = RESOURCE_REGISTERS[backend][index];
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
    binding: 5 + index,
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

function samplerBinding()
{
  return {
    name: "s0",
    identity: "sampler:0:0",
    scopeIdentity: "sampler:0:0@fragment",
    resourceKind: "sampler",
    registerSpace: 0,
    registerIndex: 0,
    sourceTruth: "wgsl-layout",
    group: 0,
    binding: 15,
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

function reflectedResource(backend, index)
{
  return {
    kind: "resource",
    registerSpace: 0,
    registerIndex: RESOURCE_REGISTERS[backend][index],
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

function shaderModule(backend, stageName)
{
  const wgsl = stageName === "vertex"
    ? `
      // ${backend}
      struct VertexInput {
        @location(0) input0: vec3<f32>,
        @location(2) input2: vec2<f32>,
        @location(3) input3: vec3<f32>,
        @location(4) input4: vec3<f32>,
        @location(5) input5: vec3<f32>,
        @location(6) input6: vec2<f32>,
      };
      @vertex fn main(input: VertexInput) -> @builtin(position) vec4<f32> {
        return vec4<f32>(input.input0, 1.0);
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
        @location(8) input8: vec4<f32>,
      };
      struct FragmentOutput {
        @location(0) output0: vec4<f32>,
        @location(1) output1: vec4<f32>,
      };
      @fragment fn main(input: FragmentInput) -> FragmentOutput {
        var result: FragmentOutput;
        result.output0 = input.position;
        result.output1 = input.position;
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

function makeRecord(backend)
{
  const source =
    `C:/fixtures/res/graphics/effect.${backend}/managed/space/spaceobject/` +
    "v5/quad/unpacked_quadheatv5.sm_hi";
  const pixelBindings = [
    // Reflected on both backends; DX12 declares it in the root signature.
    reflectedSampler(),
    ...RESOURCE_NAMES.map((_name, index) => reflectedResource(backend, index)),
    materialBinding(),
    { kind: "constantBuffer", registerSpace: 0, registerIndex: 2, carbon: {} },
    { kind: "constantBuffer", registerSpace: 0, registerIndex: 4, carbon: {} }
  ];
  return {
    backend,
    label: `${backend}.carbonwebgpu`,
    filePath: `C:/fixtures/${backend}.carbonwebgpu`,
    resourcePath: `res:/webgpu-harness/quadheatv5/${backend}.carbonwebgpu`,
    analysis: {
      source,
      bodyIndex: 0,
      selectedOptions: selectedOptions(),
      passes: [ {
        techniqueName: "Main",
        passIndex: 0,
        renderStates: 1,
        states: []
      } ],
      stages: [
        {
          techniqueName: "Main",
          passIndex: 0,
          stageName: "vertex",
          pipelineInputs: [
            { registerIndex: 0, usedMask: 7, dimension: 3, type: 0 },
            { registerIndex: 2, usedMask: 3, dimension: 2, type: 0 },
            { registerIndex: 3, usedMask: 7, dimension: 3, type: 0 },
            { registerIndex: 4, usedMask: 7, dimension: 3, type: 0 },
            { registerIndex: 5, usedMask: 7, dimension: 3, type: 0 },
            { registerIndex: 6, usedMask: 3, dimension: 2, type: 0 }
          ],
          bindings: [
            { kind: "constantBuffer", registerSpace: 0, registerIndex: 1, carbon: {} },
            { kind: "constantBuffer", registerSpace: 0, registerIndex: 3, carbon: {} }
          ]
        },
        {
          techniqueName: "Main",
          passIndex: 0,
          stageName: "pixel",
          pipelineInputs: [
            { registerIndex: 1, usedMask: 3, dimension: 4, type: 0 },
            { registerIndex: 2, usedMask: 7, dimension: 3, type: 0 },
            { registerIndex: 3, usedMask: 7, dimension: 3, type: 0 },
            { registerIndex: 4, usedMask: 7, dimension: 3, type: 0 },
            { registerIndex: 5, usedMask: 15, dimension: 4, type: 0 },
            { registerIndex: 8, usedMask: 11, dimension: 4, type: 0 }
          ],
          bindings: pixelBindings
        }
      ]
    },
    metadata: {
      sourcePath: source,
      bodyIndex: 0,
      selectedOptions: selectedOptions(),
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
      states: [],
      shaderModules: [
        shaderModule(backend, "vertex"),
        shaderModule(backend, "pixel")
      ],
      bindGroups: [ {
        group: 0,
        bindings: [
          ...UNIFORMS.map(([ registerIndex, visibility, size ]) =>
            uniformBinding(registerIndex, visibility, size)),
          ...RESOURCE_NAMES.map((_name, index) => resourceBinding(backend, index)),
          samplerBinding()
        ]
      } ]
    }
  };
}

test("QuadHeatV5 fixture supplies cold/hot ship data and the exact active resources", () =>
{
  const fixture = createQuadHeatV5FixtureValues(64, 64);
  assert.equal(fixture.vertices.length, 13 * 16);
  assert.equal(fixture.indices.length, 36);
  assert.deepEqual(fixture.caseNames, QUAD_HEAT_V5_CASES);
  assert.deepEqual(
    fixture.textures.map((entry) => entry.name),
    RESOURCE_NAMES
  );
  assert.deepEqual(
    fixture.textures.map((entry) => entry.dimension),
    [ "cube", "2d", "2d", "2d", "2d", "2d", "2d", "2d", "2d", "2d" ]
  );
  assert.equal(fixture.textures.at(-1).data.length, 8 * 8 * 4);
  assert.deepEqual(fixture.bindingValuesByCase.cold.perObjectPS.shipData, [ 0, 1, 0, 0 ]);
  assert.deepEqual(fixture.bindingValuesByCase.hot.perObjectPS.shipData, [ 1, 1, 0, 0 ]);
  assert.deepEqual(fixture.bindingValuesByCase.cold.perObjectVS.shipData, [ 0, 1, 0, 0 ]);
  assert.deepEqual(fixture.bindingValuesByCase.hot.perObjectVS.shipData, [ 1, 1, 0, 0 ]);
  assert.deepEqual(
    fixture.bindingValuesByCase.hot.material.GeneralHeatGlowColor,
    [ 0.85, 0, 0, 1 ]
  );
  assert.deepEqual(
    fixture.bindingValuesByCase.hot.material.Mtl2HeatGlowData,
    [ 1, 0.005, 8, 0.0005 ]
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
  assert.deepEqual(getQuadHeatV5PrimitiveRecipe(), {
    frontFace: "cw",
    cullMode: "back"
  });
});

test("QuadHeatV5 validates the ordered default-body DX11/DX12 contract", () =>
{
  const records = [ makeRecord("dx11"), makeRecord("dx12") ];
  assert.equal(validateQuadHeatV5PackageRecord(records[0]), records[0]);
  assert.equal(validateQuadHeatV5PackagePair(records), records);
  assert.deepEqual(
    getQuadHeatV5ResourcePlan(records[0]).textures.map((entry) => entry.registerIndex),
    RESOURCE_REGISTERS.dx11
  );
  assert.deepEqual(
    getQuadHeatV5ResourcePlan(records[1]).textures.map((entry) => entry.registerIndex),
    RESOURCE_REGISTERS.dx12
  );
  assert.deepEqual(
    getQuadHeatV5ResourcePlan(records[0]).samplers.map((entry) => [
      entry.name,
      entry.registerIndex,
      entry.binding
    ]),
    [ [ "SurfaceSampler", 0, 15 ] ]
  );
});

test("QuadHeatV5 rejects provenance, interface, reflection, and pair drift", () =>
{
  const invalidSource = makeRecord("dx11");
  invalidSource.metadata.sourcePath = invalidSource.metadata.sourcePath
    .replace("effect.dx11", "effect.dx12");
  assert.throws(
    () => validateQuadHeatV5PackageRecord(invalidSource),
    /source provenance/u
  );

  const invalidState = makeRecord("dx11");
  invalidState.analysis.passes[0].states.push({ state: 22, value: 3 });
  assert.throws(
    () => validateQuadHeatV5PackageRecord(invalidState),
    /render state/u
  );

  const invalidVertexMask = makeRecord("dx11");
  invalidVertexMask.analysis.stages[0].pipelineInputs[0].usedMask = 1;
  assert.throws(
    () => validateQuadHeatV5PackageRecord(invalidVertexMask),
    /vertex.*input contract/u
  );

  const invalidInterface = makeRecord("dx11");
  invalidInterface.pipeline.shaderModules[1].wgsl =
    invalidInterface.pipeline.shaderModules[1].wgsl.replace(
      "@location(8) input8",
      "@location(9) input8"
    );
  assert.throws(
    () => validateQuadHeatV5PackageRecord(invalidInterface),
    /FragmentInput.*interface contract/u
  );

  const invalidMaterial = makeRecord("dx11");
  invalidMaterial.analysis.stages[1].bindings
    .find((entry) => entry.kind === "constantBuffer" && entry.registerIndex === 0)
    .carbon.constants.at(-1).offset = 432;
  assert.throws(
    () => validateQuadHeatV5PackageRecord(invalidMaterial),
    /GeneralHeatGlowColor layout/u
  );

  const invalidTexture = makeRecord("dx12");
  invalidTexture.pipeline.bindGroups[0].bindings
    .find((entry) => entry.name === "AlbedoMap").isSRGB = false;
  assert.throws(
    () => validateQuadHeatV5PackageRecord(invalidTexture),
    /texture layout/u
  );

  const invalidSampler = makeRecord("dx11");
  invalidSampler.analysis.stages[1].bindings
    .find((entry) => entry.kind === "sampler")
    .carbon.sampler.maxAnisotropy = 1;
  assert.throws(
    () => validateQuadHeatV5PackageRecord(invalidSampler),
    /static state/u
  );

  const extraBinding = makeRecord("dx11");
  extraBinding.analysis.stages[1].bindings.push({
    kind: "resource",
    registerSpace: 0,
    registerIndex: 99,
    carbon: {
      name: "Injected",
      type: 2,
      arrayElements: 1,
      isSRGB: false,
      isAutoregister: false
    }
  });
  assert.throws(
    () => validateQuadHeatV5PackageRecord(extraBinding),
    /binding inventory/u
  );

  const duplicatePath = [ makeRecord("dx11"), makeRecord("dx12") ];
  duplicatePath[1].filePath = duplicatePath[0].filePath;
  assert.throws(
    () => validateQuadHeatV5PackagePair(duplicatePath),
    /distinct physical/u
  );

  const identicalWgsl = [ makeRecord("dx11"), makeRecord("dx12") ];
  identicalWgsl[1].pipeline.shaderModules = structuredClone(
    identicalWgsl[0].pipeline.shaderModules
  );
  assert.throws(
    () => validateQuadHeatV5PackagePair(identicalWgsl),
    /identical WGSL/u
  );
});
