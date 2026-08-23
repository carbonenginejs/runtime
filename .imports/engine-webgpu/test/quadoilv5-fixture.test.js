import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  QUAD_OIL_V5_CLEAR_TARGETS,
  QUAD_OIL_V5_RESOURCE_VARIANTS,
  QUAD_OIL_V5_SELECTION,
  QUAD_OIL_V5_SKINNED_VERTEX_BUFFER_LAYOUT,
  QUAD_OIL_V5_TARGET_HEIGHT,
  QUAD_OIL_V5_TARGET_WIDTH,
  QUAD_OIL_V5_VERTEX_BUFFER_LAYOUT,
  createQuadOilV5FixtureValues,
  getQuadOilV5ResourcePlan,
  validateQuadOilV5PackagePair,
  validateQuadOilV5PackageRecord
} from "../harness/webgpu/quadOilV5Fixture.js";

const UNIFORMS = [
  [ 0, "fragment", 224, 14 ],
  [ 1, "vertex", 512, 32 ],
  [ 2, "fragment", 352, 22 ],
  [ 3, "vertex", 432, 27 ],
  [ 4, "fragment", 208, 13 ]
];

const RESOURCE_NAMES = [
  "EveSpaceSceneEnvMap",
  "SSAOMap",
  "EveSpaceSceneShadowMap",
  "NormalMap",
  "GlowMap",
  "OilFilmLookupMap",
  "AlbedoMap",
  "RoughnessMap",
  "MaterialMap",
  "PaintMaskMap"
];

const RESOURCE_REGISTERS = {
  dx11: [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ],
  dx12: [ 0, 1, 2, 3, 4, 5, 7, 8, 10, 11 ]
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
  [ "Mtl4Gloss", 208 ]
];

function selectedOptions()
{
  return [
    [ "BINDLESS_RENDERING", "BINDLESS_RENDERING_DISABLED", "local" ],
    [ "SPACE_OBJECT_CLIPPING", "SOC_DISABLED", "default" ],
    [ "SPACE_OBJECT_PPT_ENABLED", "SOPPT_DISABLED", "local" ],
    [ "SPACE_OBJECT_TRANSPARENCY", "SOT_OPAQUE", "default" ],
    [ "V5_DEBUG", "OFF", "default" ]
  ].map(([ name, value, source ]) => ({
    name,
    value,
    optionIndex: 0,
    defaultOption: 0,
    defaultValue: value,
    source
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

function resourceBinding(backend, index)
{
  const registerIndex = RESOURCE_REGISTERS[backend][index];
  const identity = `sampled-resource:0:${registerIndex}`;
  const cube = index === 0;
  return {
    name: RESOURCE_NAMES[index],
    identity,
    scopeIdentity: `${identity}@fragment`,
    resourceKind: "sampled-resource",
    registerSpace: 0,
    registerIndex,
    sourceTruth: "wgsl-layout",
    group: 0,
    binding: 6 + index,
    dynamic: false,
    visibility: [ "fragment" ],
    layout: {
      type: cube ? "texture_cube<f32>" : "texture_2d<f32>",
      buffer: null,
      texture: {
        sampleType: "float",
        viewDimension: cube ? "cube" : "2d",
        multisampled: false
      },
      sampler: null
    },
    isSRGB: index === 0 || index === 5 || index === 6
  };
}

function canonicalSampler(registerIndex)
{
  const identity = `sampler:0:${registerIndex}`;
  return {
    name: `s${registerIndex}`,
    identity,
    scopeIdentity: `${identity}@fragment`,
    resourceKind: "sampler",
    registerSpace: 0,
    registerIndex,
    sourceTruth: "wgsl-layout",
    group: 0,
    binding: 16 + registerIndex,
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
      constantValueSize: 224,
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
    dynamic: true,
    carbon: {
      name: "BoneTransforms",
      type: 7,
      arrayElements: 1,
      isSRGB: false,
      isAutoregister: false
    }
  };
}

function reflectedResource(backend, index)
{
  const cube = index === 0;
  return {
    kind: "resource",
    registerSpace: 0,
    registerIndex: RESOURCE_REGISTERS[backend][index],
    registerType: cube ? 41 : 36,
    dynamic: true,
    carbon: {
      name: RESOURCE_NAMES[index],
      type: cube ? 4 : 2,
      arrayElements: 1,
      isSRGB: index === 0 || index === 5 || index === 6,
      isAutoregister: index === 2
    }
  };
}

function reflectedSampler(registerIndex)
{
  return {
    kind: "sampler",
    registerSpace: 0,
    registerIndex,
    registerType: 1,
    // The override authorisation, and these samplers are not overridable.
    dynamic: false,
    carbon: {
      name: null,
      sampler: {
        comparison: false,
        minFilter: registerIndex === 0 ? 3 : 2,
        magFilter: 2,
        mipFilter: 2,
        addressU: 1,
        addressV: 1,
        addressW: 3,
        mipLODBias: 0,
        maxAnisotropy: 16,
        minLOD: registerIndex === 0 ? -3.4028234663852886e+38 : 0,
        isDynamic: false
      }
    }
  };
}

function vertexInputs()
{
  return [
    [ "POSITION", 0, 0, 7, 0, 3 ],
    [ "BLENDINDICES", 0, 1, 1, 2, 4 ],
    [ "TEXCOORD", 0, 2, 3, 0, 2 ],
    [ "NORMAL", 0, 3, 7, 0, 3 ],
    [ "TANGENT", 0, 4, 7, 0, 3 ],
    [ "BITANGENT", 0, 5, 7, 0, 3 ],
    [ "TEXCOORD", 1, 6, 3, 0, 2 ]
  ].map(([ usageName, usageIndex, registerIndex, usedMask, type, dimension ]) => ({
    usageName,
    usageIndex,
    registerIndex,
    usedMask,
    type,
    dimension
  }));
}

function pixelInputs()
{
  return [
    [ "TEXCOORD", 0, 1, 3, 0, 4 ],
    [ "TEXCOORD", 1, 2, 7, 0, 3 ],
    [ "TEXCOORD", 2, 3, 7, 0, 3 ],
    [ "TEXCOORD", 3, 4, 7, 0, 3 ],
    [ "TEXCOORD", 4, 5, 15, 0, 4 ],
    [ "TEXCOORD", 5, 6, 0, 0, 4 ],
    [ "TEXCOORD", 8, 7, 0, 0, 4 ],
    [ "TEXCOORD", 9, 8, 11, 0, 4 ]
  ].map(([ usageName, usageIndex, registerIndex, usedMask, type, dimension ]) => ({
    usageName,
    usageIndex,
    registerIndex,
    usedMask,
    type,
    dimension
  }));
}

function shaderModule(backend, stageName)
{
  const wgsl = stageName === "vertex"
    ? `
      // ${backend}
      struct VertexInput {
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
        @location(8) input8: vec4<f32>,
      };
      struct FragmentOutput {
        @location(0) output0: vec4<f32>,
        @location(1) output1: vec4<f32>,
      };
      @fragment fn main(input: FragmentInput) -> FragmentOutput {
        var result: FragmentOutput;
        result.output0 = input.position;
        result.output1 = input.input8;
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
    "v5/quad/unpackedskinned_quadoilv5.sm_hi";
  return {
    backend,
    variant: "skinned",
    label: `${backend}.carbonwebgpu`,
    filePath: `C:/fixtures/quadoilv5/${backend}.carbonwebgpu`,
    resourcePath: `res:/webgpu-harness/quadoilv5/${backend}.carbonwebgpu`,
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
          pipelineInputs: vertexInputs(),
          bindings: [
            { kind: "constantBuffer", registerSpace: 0, registerIndex: 1 },
            { kind: "constantBuffer", registerSpace: 0, registerIndex: 3 },
            reflectedBone()
          ]
        },
        {
          techniqueName: "Main",
          passIndex: 0,
          stageName: "pixel",
          pipelineInputs: pixelInputs(),
          bindings: [
            // Reflected on both backends; DX12 declares them in the root signature.
            reflectedSampler(0),
            reflectedSampler(1),
            ...RESOURCE_NAMES.map((_name, index) =>
              reflectedResource(backend, index)),
            materialBinding(),
            { kind: "constantBuffer", registerSpace: 0, registerIndex: 2 },
            { kind: "constantBuffer", registerSpace: 0, registerIndex: 4 }
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
      states: [],
      shaderModules: [
        shaderModule(backend, "vertex"),
        shaderModule(backend, "pixel")
      ],
      bindGroups: [ {
        group: 0,
        bindings: [
          ...UNIFORMS.map(([ registerIndex, visibility, size, vectors ]) =>
            uniformBinding(registerIndex, visibility, size, vectors)),
          boneBinding(),
          ...RESOURCE_NAMES.map((_name, index) =>
            resourceBinding(backend, index)),
          canonicalSampler(0),
          canonicalSampler(1)
        ]
      } ]
    }
  };
}

test("QuadOilV5 fixture isolates only the mip-clamped oil lookup", () =>
{
  const fixture = createQuadOilV5FixtureValues(64, 64);
  assert.equal(QUAD_OIL_V5_TARGET_WIDTH, 64);
  assert.equal(QUAD_OIL_V5_TARGET_HEIGHT, 64);
  assert.equal(fixture.vertices.length, 13 * 16);
  assert.equal(fixture.boneIndices.length, 13 * 4);
  assert.equal(fixture.indices.length, 36);
  assert.deepEqual(QUAD_OIL_V5_RESOURCE_VARIANTS, [
    "oilOff",
    "oilChromatic"
  ]);
  assert.deepEqual(Object.keys(fixture.textureResourceVariants),
    QUAD_OIL_V5_RESOURCE_VARIANTS);
  assert.deepEqual(fixture.textureResourceVariants, {
    oilOff: { OilFilmLookupMap: "OilFilmLookupOff" },
    oilChromatic: { OilFilmLookupMap: "OilFilmLookupChromatic" }
  });
  assert.deepEqual(
    fixture.textures.map((entry) => entry.name),
    [
      "EveSpaceSceneEnvMap",
      "SSAOMap",
      "EveSpaceSceneShadowMap",
      "NormalMap",
      "GlowMap",
      "AlbedoMap",
      "RoughnessMap",
      "MaterialMap",
      "PaintMaskMap",
      "OilFilmLookupOff",
      "OilFilmLookupChromatic"
    ]
  );
  const oilOff = fixture.textures.at(-2);
  const oilChromatic = fixture.textures.at(-1);
  assert.equal(oilOff.format, "rgba8unorm-srgb");
  assert.equal(oilChromatic.format, "rgba8unorm-srgb");
  assert.deepEqual(Array.from(oilOff.data.slice(0, 8)), [
    0, 0, 0, 255,
    0, 0, 0, 255
  ]);
  assert.deepEqual(Array.from(oilChromatic.data.slice(0, 8)), [
    255, 48, 224, 255,
    255, 48, 224, 255
  ]);
  assert.deepEqual(
    Object.keys(fixture.bindingValues.material),
    MATERIAL_CONSTANTS.map(([ name ]) => name)
  );
  assert.equal("OilFilmData" in fixture.bindingValues.material, false);
  assert.equal("PMtl1DiffuseColor" in fixture.bindingValues.material, false);
  assert.strictEqual(
    fixture.bindingValues.perFrameVS.Sun,
    fixture.bindingValues.perFramePS.Sun
  );
  assert.deepEqual(fixture.bindingValues.perFramePS.Sun.DirWorld, [
    -0.8660253882408142,
    0,
    0.5
  ]);
  assert.deepEqual(fixture.samplers.map((entry) => entry.name), [
    "SurfaceSampler",
    "OilFilmSampler"
  ]);
  assert.deepEqual(QUAD_OIL_V5_VERTEX_BUFFER_LAYOUT.attributes.map((entry) =>
    entry.shaderLocation), [ 0, 2, 3, 4, 5, 6 ]);
  assert.deepEqual(QUAD_OIL_V5_SKINNED_VERTEX_BUFFER_LAYOUT, {
    arrayStride: 8,
    attributes: [ { shaderLocation: 1, offset: 0, format: "uint16x4" } ]
  });
  assert.deepEqual(QUAD_OIL_V5_CLEAR_TARGETS, [
    [ 0, 255, 0, 255 ],
    [ 255, 0, 255, 255 ]
  ]);
  assert.throws(
    () => createQuadOilV5FixtureValues(0, 64),
    /positive integers/u
  );
});

test("QuadOilV5 validates exact ordered body-0 DX11/DX12 records", () =>
{
  const records = [ makeRecord("dx11"), makeRecord("dx12") ];
  assert.equal(validateQuadOilV5PackageRecord(records[0]), records[0]);
  assert.equal(validateQuadOilV5PackageRecord(records[1]), records[1]);
  assert.equal(validateQuadOilV5PackagePair(records), records);
  const dx11Plan = getQuadOilV5ResourcePlan(records[0]);
  const dx12Plan = getQuadOilV5ResourcePlan(records[1]);
  assert.deepEqual(dx11Plan.textures.map((entry) => entry.registerIndex),
    RESOURCE_REGISTERS.dx11);
  assert.deepEqual(dx12Plan.textures.map((entry) => entry.registerIndex),
    RESOURCE_REGISTERS.dx12);
  assert.deepEqual(dx12Plan.textures.map((entry) => entry.binding),
    [ 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 ]);
  assert.deepEqual(dx12Plan.bone, {
    name: "BoneTransforms",
    identity: "sampled-resource:0:0",
    scopeIdentity: "sampled-resource:0:0@vertex",
    registerIndex: 0,
    binding: 5,
    minBindingSize: 48,
    structureStride: 48
  });
  assert.deepEqual(dx12Plan.samplers.map((entry) => [
    entry.name,
    entry.registerIndex,
    entry.binding
  ]), [
    [ "SurfaceSampler", 0, 16 ],
    [ "OilFilmSampler", 1, 17 ]
  ]);
  assert.deepEqual(QUAD_OIL_V5_SELECTION, {
    BINDLESS_RENDERING: "BINDLESS_RENDERING_DISABLED",
    SPACE_OBJECT_CLIPPING: "SOC_DISABLED",
    SPACE_OBJECT_PPT_ENABLED: "SOPPT_DISABLED",
    SPACE_OBJECT_TRANSPARENCY: "SOT_OPAQUE",
    V5_DEBUG: "OFF"
  });
});

test("QuadOilV5 rejects profile, interface, binding, and material drift", () =>
{
  const invalid = [
    (() =>
    {
      const record = makeRecord("dx11");
      record.variant = "static";
      return record;
    })(),
    (() =>
    {
      const record = makeRecord("dx11");
      record.analysis.bodyIndex = 4;
      return record;
    })(),
    (() =>
    {
      // Drift is pinned on `optionIndex`, not `source`: the Carbon container
      // records which permutation was translated, never who chose it, so
      // `source` cannot survive a read back. See quadV5Fixture.js.
      const record = makeRecord("dx11");
      record.analysis.selectedOptions[2].optionIndex += 1;
      return record;
    })(),
    (() =>
    {
      const record = makeRecord("dx11");
      record.analysis.stages[0].pipelineInputs[1].type = 0;
      return record;
    })(),
    (() =>
    {
      const record = makeRecord("dx12");
      record.pipeline.bindGroups[0].bindings
        .find((entry) => entry.scopeIdentity === "sampled-resource:0:5@fragment")
        .binding = 12;
      return record;
    })(),
    (() =>
    {
      const record = makeRecord("dx11");
      record.analysis.stages[1].bindings
        .find((entry) => entry.kind === "constantBuffer"
          && entry.registerIndex === 0)
        .carbon.constants.push({
          name: "OilFilmData",
          offset: 224,
          size: 16,
          type: 0,
          dimension: 4,
          elements: 0
        });
      return record;
    })(),
    (() =>
    {
      const record = makeRecord("dx11");
      record.analysis.stages[1].bindings
        .find((entry) => entry.kind === "sampler"
          && entry.registerIndex === 1)
        .carbon.sampler.minFilter = 3;
      return record;
    })()
  ];
  for (const record of invalid)
  {
    assert.throws(
      () => validateQuadOilV5PackageRecord(record),
      /QuadOilV5 fixture/u
    );
  }
});

test("QuadOilV5 rejects aliased, reordered, and identical parity inputs", () =>
{
  const dx11 = makeRecord("dx11");
  const dx12 = makeRecord("dx12");
  assert.throws(
    () => validateQuadOilV5PackagePair([ dx12, dx11 ]),
    /order must be DX11 then DX12/u
  );
  const aliased = makeRecord("dx12");
  aliased.filePath = dx11.filePath;
  assert.throws(
    () => validateQuadOilV5PackagePair([ dx11, aliased ]),
    /distinct physical/u
  );
  const logicalAlias = makeRecord("dx12");
  logicalAlias.resourcePath = dx11.resourcePath;
  assert.throws(
    () => validateQuadOilV5PackagePair([ dx11, logicalAlias ]),
    /distinct logical/u
  );
  const identical = makeRecord("dx12");
  identical.pipeline.shaderModules.forEach((module) =>
  {
    module.wgsl = module.wgsl.replace("// dx12", "// dx11");
  });
  assert.throws(
    () => validateQuadOilV5PackagePair([ dx11, identical ]),
    /identical WGSL/u
  );
});

test("QuadOilV5 launcher rejects a mixed decal-family invocation", () =>
{
  const script = fileURLToPath(
    new URL("../scripts/run-webgpu-harness.js", import.meta.url)
  );
  const result = spawnSync(process.execPath, [
    script,
    "--draw-skinned-quadoilv5",
    "oil-dx11.carbonwebgpu",
    "oil-dx12.carbonwebgpu",
    "--draw-decalv5",
    "decal-dx11.carbonwebgpu",
    "decal-dx12.carbonwebgpu"
  ], {
    encoding: "utf8"
  });
  assert.notEqual(result.status, 0);
  assert.match(
    `${result.stdout}\n${result.stderr}`,
    /--draw-decalv5 cannot be combined with --draw-skinned-quadoilv5/u
  );
});
