import assert from "node:assert/strict";
import { test } from "node:test";

import {
  QUAD_GLASS_V5_CLEAR_TARGETS,
  QUAD_GLASS_V5_SELECTION,
  QUAD_GLASS_V5_SKINNED_PPT_SELECTION,
  QUAD_GLASS_V5_SKINNED_VERTEX_BUFFER_LAYOUT,
  QUAD_GLASS_V5_TARGET_HEIGHT,
  QUAD_GLASS_V5_TARGET_WIDTH,
  QUAD_GLASS_V5_VERTEX_BUFFER_LAYOUT,
  createQuadGlassV5FixtureValues,
  getQuadGlassV5PrimitiveRecipe,
  getQuadGlassV5ResourcePlan,
  validateQuadGlassV5PackagePair,
  validateQuadGlassV5PackageRecord
} from "../harness/webgpu/quadGlassV5Fixture.js";

const MATERIAL_NAMES = Object.freeze([
  "GeneralGlowColor",
  "Mtl1DiffuseColor",
  "Mtl2DiffuseColor",
  "Mtl3DiffuseColor",
  "Mtl4DiffuseColor",
  "Mtl1FresnelColor",
  "Mtl2FresnelColor",
  "Mtl3FresnelColor",
  "Mtl4FresnelColor",
  "Mtl1Gloss",
  "Mtl2Gloss",
  "Mtl3Gloss",
  "Mtl4Gloss"
]);

const RESOURCES = Object.freeze({
  dx11: Object.freeze([
    [ "EveSpaceSceneEnvMap", 0, "cube" ],
    [ "EveSceneFogVolumeMap", 1, "2d-array" ],
    [ "NormalMap", 2, "2d" ],
    [ "GlowMap", 3, "2d" ],
    [ "RoughnessMap", 4, "2d" ],
    [ "MaterialMap", 5, "2d" ],
    [ "PaintMaskMap", 6, "2d" ]
  ]),
  dx12: Object.freeze([
    [ "EveSpaceSceneEnvMap", 0, "cube" ],
    [ "EveSceneFogVolumeMap", 2, "2d-array" ],
    [ "NormalMap", 4, "2d" ],
    [ "GlowMap", 5, "2d" ],
    [ "RoughnessMap", 8, "2d" ],
    [ "MaterialMap", 10, "2d" ],
    [ "PaintMaskMap", 11, "2d" ]
  ])
});

const UNIFORMS = Object.freeze([
  [ 0, 0, "fragment", 224 ],
  [ 1, 1, "vertex", 512 ],
  [ 2, 2, "fragment", 384 ],
  [ 3, 3, "vertex", 128 ],
  [ 4, 4, "fragment", 208 ]
]);

function selectionEntries(selection = QUAD_GLASS_V5_SELECTION)
{
  return Object.entries(selection).map(([ name, value ]) => ({
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

function uniformBinding(registerIndex, binding, visibility, minBindingSize)
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
    binding,
    dynamic: false,
    visibility: [ visibility ],
    layout: {
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

function storageBinding()
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
    structureStride: 48,
    layout: {
      buffer: {
        type: "read-only-storage",
        hasDynamicOffset: false,
        minBindingSize: 48
      },
      texture: null,
      sampler: null
    }
  };
}

function resourceBinding(name, registerIndex, viewDimension, binding, skinned = false, index = 0)
{
  const identity = `sampled-resource:0:${registerIndex}`;
  return {
    name,
    identity,
    scopeIdentity: `${identity}@fragment`,
    resourceKind: "sampled-resource",
    registerSpace: 0,
    registerIndex,
    sourceTruth: "wgsl-layout",
    group: 0,
    binding,
    dynamic: false,
    visibility: [ "fragment" ],
    ...(skinned ? {
      textureKind: viewDimension,
      arrayElements: 1,
      isSRGB: index === 0
    } : {}),
    layout: {
      ...(skinned ? {
        type: `texture_${viewDimension.replace("-", "_")}<f32>`
      } : {}),
      buffer: null,
      texture: {
        sampleType: "float",
        viewDimension,
        multisampled: false
      },
      sampler: null
    }
  };
}

function samplerBinding(registerIndex, binding)
{
  const identity = `sampler:0:${registerIndex}`;
  return {
    identity,
    scopeIdentity: `${identity}@fragment`,
    resourceKind: "sampler",
    registerSpace: 0,
    registerIndex,
    sourceTruth: "wgsl-layout",
    group: 0,
    binding,
    dynamic: false,
    visibility: [ "fragment" ],
    layout: {
      buffer: null,
      texture: null,
      sampler: { type: "filtering" }
    }
  };
}

function materialBinding(skinned = false)
{
  return {
    kind: "constantBuffer",
    registerSpace: 0,
    registerIndex: 0,
    ...(skinned ? {
      generatedSymbol: "cb0",
      registerType: 0,
      registerCount: 1,
      arrayCount: 1,
      dynamic: true,
      metadataName: "$LocalConstants"
    } : {}),
    carbon: {
      hasLocalConstants: true,
      constantValueSize: 224,
      constants: MATERIAL_NAMES.map((name, index) => ({
        name,
        offset: 16 + index * 16,
        size: 16,
        type: 0,
        dimension: 4,
        elements: 0
      }))
    }
  };
}

function analysisConstantBuffer(registerIndex)
{
  return {
    kind: "constantBuffer",
    generatedSymbol: `cb${registerIndex}`,
    registerType: 0,
    registerSpace: 0,
    registerIndex,
    registerCount: 1,
    arrayCount: 1,
    dynamic: true,
    metadataName: null,
    carbon: {
      hasLocalConstants: false,
      constantValueSize: 0,
      constants: []
    }
  };
}

function boneAnalysisBinding()
{
  return {
    kind: "resource",
    generatedSymbol: "BoneTransforms",
    registerType: 33,
    registerSpace: 0,
    registerIndex: 0,
    registerCount: 1,
    arrayCount: 1,
    dynamic: true,
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

function staticSampler(registerIndex)
{
  return {
    kind: "sampler",
    registerSpace: 0,
    registerIndex,
    carbon: {
      name: null,
      sampler: registerIndex === 0
        ? {
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
        : {
            comparison: false,
            minFilter: 2,
            magFilter: 2,
            mipFilter: 2,
            addressU: 3,
            addressV: 3,
            addressW: 3,
            mipLODBias: 0,
            maxAnisotropy: 16,
            isDynamic: false
          }
    }
  };
}

function vertexWgsl(suffix, skinned = false)
{
  return `struct VertexInput {
@location(0) input0: vec3<f32>,
${skinned ? "@location(1) input1: vec4<u32>,\n" : ""}@location(2) input2: vec2<f32>,
@location(3) input3: vec3<f32>,
@location(4) input4: vec3<f32>,
@location(5) input5: vec3<f32>,
@location(6) input6: vec2<f32>,
};
@vertex fn main(input: VertexInput) -> @builtin(position) vec4<f32> {
return vec4<f32>(input.input0, ${suffix}.0);
}`;
}

function pixelWgsl(suffix, skinned = false)
{
  return `struct FragmentInput {
@builtin(position) position: vec4<f32>,
@builtin(front_facing) front_facing: bool,
@location(1) input1: vec4<f32>,
@location(2) input2: vec3<f32>,
@location(3) input3: vec3<f32>,
@location(4) input4: vec3<f32>,
@location(5) input5: vec4<f32>,
@location(${skinned ? 9 : 8}) input${skinned ? 9 : 8}: vec4<f32>,
};
struct PixelOutput {
@location(0) output0: vec4<f32>,
@location(1) output1: vec4<f32>,
};
@fragment fn main(input: FragmentInput) -> PixelOutput {
var output: PixelOutput;
output.output0 = vec4<f32>(select(-${suffix}.0, ${suffix}.0, input.front_facing));
output.output1 = vec4<f32>(0.0);
return output;
}`;
}

function validRecord(backend, variant = "static")
{
  const skinned = variant === "skinned";
  const shaderName = skinned
    ? "unpackedskinned_quadglassv5.sm_hi"
    : "unpacked_quadglassv5.sm_hi";
  const source =
    `E:/fixtures/res/graphics/effect.${backend}/managed/space/spaceobject/v5/quad/` +
    shaderName;
  const resources = RESOURCES[backend];
  const selection = skinned
    ? QUAD_GLASS_V5_SKINNED_PPT_SELECTION
    : QUAD_GLASS_V5_SELECTION;
  const selectedOptions = selectionEntries(selection);
  const analysisBindings = [
    materialBinding(skinned),
    ...(skinned ? [ analysisConstantBuffer(2), analysisConstantBuffer(4) ] : []),
    ...resources.map(([ name, registerIndex ], index) => ({
      kind: "resource",
      registerSpace: 0,
      registerIndex,
      ...(skinned ? {
        generatedSymbol: name,
        registerType: index === 0 ? 41 : (index === 1 ? 37 : 36),
        registerCount: 1,
        arrayCount: 1,
        dynamic: true,
        metadataName: name
      } : {}),
      carbon: {
        name,
        ...(skinned ? {
          type: index === 0 ? 4 : (index === 1 ? 5 : 2),
          arrayElements: 1,
          isSRGB: index === 0,
          isAutoregister: index === 1
        } : {})
      }
    })),
    // Reflected on both backends; DX12 declares them in the root signature.
    staticSampler(0),
    staticSampler(1)
  ];
  const analysisStages = [];
  for (const passIndex of [ 0, 1 ])
  {
    analysisStages.push(
      {
        techniqueName: "Main",
        passIndex,
        stageName: "vertex",
        pipelineInputs: [
          { registerIndex: 0, usedMask: 7, dimension: 3, type: 0 },
          { registerIndex: 1, usedMask: skinned ? 1 : 0, dimension: 4, type: 2 },
          { registerIndex: 2, usedMask: 3, dimension: 2, type: 0 },
          { registerIndex: 3, usedMask: 7, dimension: 3, type: 0 },
          { registerIndex: 4, usedMask: 7, dimension: 3, type: 0 },
          { registerIndex: 5, usedMask: 7, dimension: 3, type: 0 },
          { registerIndex: 6, usedMask: 3, dimension: 2, type: 0 }
        ],
        bindings: skinned
          ? [
              analysisConstantBuffer(1),
              analysisConstantBuffer(3),
              boneAnalysisBinding()
            ]
          : []
      },
      {
        techniqueName: "Main",
        passIndex,
        stageName: "pixel",
        pipelineInputs: [
          { registerIndex: 1, usedMask: 3, dimension: 4, type: 0 },
          { registerIndex: 2, usedMask: 7, dimension: 3, type: 0 },
          { registerIndex: 3, usedMask: 7, dimension: 3, type: 0 },
          { registerIndex: 4, usedMask: 7, dimension: 3, type: 0 },
          { registerIndex: 5, usedMask: 15, dimension: 4, type: 0 },
          { registerIndex: 6, usedMask: 0, dimension: 4, type: 0 },
          { registerIndex: skinned ? 9 : 8, usedMask: 11, dimension: 4, type: 0 }
        ],
        bindings: structuredClone(analysisBindings)
      }
    );
  }
  const makePipeline = (passIndex) => ({
    techniqueName: "Main",
    passIndex,
    renderStates: passIndex === 0 ? 1 : 2,
    states: [ { state: 22, value: passIndex === 0 ? 3 : 2 } ],
    shaderModules: [
      {
        key: `Main.pass${passIndex}.vertex`,
        techniqueName: "Main",
        passIndex,
        stageName: "vertex",
        stageType: 0,
        entryPoint: "main",
        wgsl: vertexWgsl(backend === "dx11" ? 1 : 2, skinned)
      },
      {
        key: `Main.pass${passIndex}.pixel`,
        techniqueName: "Main",
        passIndex,
        stageName: "pixel",
        stageType: 1,
        entryPoint: "main",
        wgsl: pixelWgsl(backend === "dx11" ? 1 : 2, skinned)
      }
    ],
    bindGroups: [ {
      group: 0,
      bindings: [
        ...UNIFORMS.map((entry) => uniformBinding(
          entry[0],
          entry[1],
          entry[2],
          skinned && entry[0] === 3 ? 432 : entry[3]
        )),
        ...(skinned ? [ storageBinding() ] : []),
        ...resources.map(([ name, registerIndex, viewDimension ], index) =>
          resourceBinding(
            name,
            registerIndex,
            viewDimension,
            (skinned ? 6 : 5) + index,
            skinned,
            index
          )),
        samplerBinding(0, skinned ? 13 : 12),
        samplerBinding(1, skinned ? 14 : 13)
      ]
    } ]
  });
  return {
    ...(skinned ? { variant: "skinned" } : {}),
    backend,
    label: skinned
      ? `unpackedskinned_quadglassv5.${backend}.carbonwebgpu`
      : `unpacked_quadglassv5.${backend}.carbonwebgpu`,
    filePath: skinned
      ? `E:/fixtures/unpackedskinned_quadglassv5.${backend}.carbonwebgpu`
      : `E:/fixtures/unpacked_quadglassv5.${backend}.carbonwebgpu`,
    resourcePath: skinned
      ? `res:/webgpu-harness/quadglassv5/skinned/${backend}.carbonwebgpu`
      : `res:/webgpu-harness/quadglassv5/${backend}.carbonwebgpu`,
    analysis: {
      source,
      bodyIndex: skinned ? 4 : 0,
      selectedOptions,
      passes: [
        {
          techniqueName: "Main",
          passIndex: 0,
          renderStates: 1,
          states: [ { state: 22, value: 3 } ]
        },
        {
          techniqueName: "Main",
          passIndex: 1,
          renderStates: 2,
          states: [ { state: 22, value: 2 } ]
        }
      ],
      stages: analysisStages
    },
    metadata: {
      sourcePath: source,
      bodyIndex: skinned ? 4 : 0,
      selectedOptions: selectionEntries(selection),
      wgslSelection: {
        mode: "explicit",
        techniqueName: "Main",
        passIndex: null,
        completePasses: true,
        requestedStageNames: [],
        selectedStageKeys: [
          "Main.pass0.vertex",
          "Main.pass0.pixel",
          "Main.pass1.vertex",
          "Main.pass1.pixel"
        ]
      }
    },
    pipelines: [ makePipeline(0), makePipeline(1) ]
  };
}

test("QuadGlassV5 fixture supplies the exact active geometry and texture dimensions", () =>
{
  const values = createQuadGlassV5FixtureValues(
    QUAD_GLASS_V5_TARGET_WIDTH,
    QUAD_GLASS_V5_TARGET_HEIGHT
  );
  assert.equal(values.vertices.length, 26 * 16);
  assert.equal(values.indices.length, 72);
  assert.equal(values.indices[36], 13);
  assert.equal(values.indices[37], 15);
  assert.equal(values.indices[38], 14);
  assert.deepEqual(
    QUAD_GLASS_V5_VERTEX_BUFFER_LAYOUT.attributes.map((entry) => entry.shaderLocation),
    [ 0, 2, 3, 4, 5, 6 ]
  );
  const skinnedValues = createQuadGlassV5FixtureValues(
    QUAD_GLASS_V5_TARGET_WIDTH,
    QUAD_GLASS_V5_TARGET_HEIGHT,
    "skinned"
  );
  assert.deepEqual(QUAD_GLASS_V5_SKINNED_VERTEX_BUFFER_LAYOUT, {
    arrayStride: 8,
    attributes: [ {
      shaderLocation: 1,
      offset: 0,
      format: "uint16x4"
    } ]
  });
  assert.equal(skinnedValues.boneIndices.length, 26 * 4);
  assert.deepEqual(
    skinnedValues.boneIndices.slice(0, skinnedValues.boneIndices.length / 2),
    skinnedValues.boneIndices.slice(skinnedValues.boneIndices.length / 2)
  );
  assert.deepEqual(getQuadGlassV5PrimitiveRecipe(0), {
    frontFace: "cw",
    cullMode: "back"
  });
  assert.deepEqual(getQuadGlassV5PrimitiveRecipe(1), {
    frontFace: "cw",
    cullMode: "front"
  });
  assert.throws(() => getQuadGlassV5PrimitiveRecipe(2), /pass 0 or 1/u);

  const signedAreas = [];
  for (let index = 0; index < values.indices.length; index += 3)
  {
    const points = [ 0, 1, 2 ].map((offset) =>
    {
      const vertex = values.indices[index + offset] * 16;
      return [ values.vertices[vertex], values.vertices[vertex + 1] ];
    });
    signedAreas.push(
      (points[1][0] - points[0][0]) * (points[2][1] - points[0][1])
        - (points[1][1] - points[0][1]) * (points[2][0] - points[0][0])
    );
  }
  assert.equal(signedAreas.slice(0, 12).every((area) => area < 0), true);
  assert.equal(signedAreas.slice(12).every((area) => area > 0), true);
  assert.deepEqual(QUAD_GLASS_V5_CLEAR_TARGETS, [
    [ 0, 255, 0, 255 ],
    [ 255, 0, 255, 255 ]
  ]);
  assert.deepEqual(
    values.textures.map(({ name, dimension }) => [ name, dimension ]),
    [
      [ "EveSpaceSceneEnvMap", "cube" ],
      [ "NormalMap", "2d" ],
      [ "GlowMap", "2d" ],
      [ "RoughnessMap", "2d" ],
      [ "MaterialMap", "2d" ],
      [ "OpaquePaintMaskMap", "2d" ],
      [ "TransparentPaintMaskMap", "2d" ],
      [ "EveSceneFogVolumeMap", "2d-array" ]
    ]
  );
  assert.deepEqual(values.bindingValues.perFramePS.VolumetricSlices, [ 1, 2, 3, 4 ]);
  assert.equal(
    values.textures.find((entry) => entry.name === "EveSceneFogVolumeMap")
      .depthOrArrayLayers,
    4
  );
  assert.deepEqual(Object.keys(values.textureResourceVariants), [ "base", "transparentPaint" ]);
  assert.deepEqual(values.textureResourceVariants.base, {
    PaintMaskMap: "OpaquePaintMaskMap"
  });
  assert.deepEqual(
    values.samplers.map(({ name, addressModeU, addressModeV, maxAnisotropy }) => ({
      name,
      addressModeU,
      addressModeV,
      maxAnisotropy
    })),
    [
      {
        name: "SurfaceSampler",
        addressModeU: "repeat",
        addressModeV: "repeat",
        maxAnisotropy: 16
      },
      {
        name: "FogSampler",
        addressModeU: "clamp-to-edge",
        addressModeV: "clamp-to-edge",
        maxAnisotropy: 16
      }
    ]
  );
});

test("QuadGlassV5 validates the ordered default-body DX11/DX12 contract", () =>
{
  const dx11 = validRecord("dx11");
  const dx12 = validRecord("dx12");
  assert.equal(validateQuadGlassV5PackageRecord(dx11), dx11);
  assert.deepEqual(validateQuadGlassV5PackagePair([ dx11, dx12 ]), [ dx11, dx12 ]);

  const left = getQuadGlassV5ResourcePlan(dx11);
  const right = getQuadGlassV5ResourcePlan(dx12);
  assert.deepEqual(left.textures.map((entry) => entry.registerIndex), [ 0, 1, 2, 3, 4, 5, 6 ]);
  assert.deepEqual(right.textures.map((entry) => entry.registerIndex), [ 0, 2, 4, 5, 8, 10, 11 ]);
  assert.deepEqual(left.textures.map((entry) => entry.viewDimension), [
    "cube", "2d-array", "2d", "2d", "2d", "2d", "2d"
  ]);
  assert.deepEqual(left.samplers.map((entry) => entry.registerIndex), [ 0, 1 ]);
});

test("QuadGlassV5 validates the exact PPT-on skinned body-4 Main contract", () =>
{
  const dx11 = validRecord("dx11", "skinned");
  const dx12 = validRecord("dx12", "skinned");
  const selectedStageKeys = [
    "Main.pass0.vertex",
    "Main.pass0.pixel",
    "Main.pass1.vertex",
    "Main.pass1.pixel"
  ];
  const selectedOptions = [
    [ "BINDLESS_RENDERING", "BINDLESS_RENDERING_DISABLED", 0 ],
    [ "SPACE_OBJECT_CLIPPING", "SOC_DISABLED", 0 ],
    [ "SPACE_OBJECT_PPT_ENABLED", "SOPPT_ENABLED", 1 ],
    [ "SPACE_OBJECT_TRANSPARENCY", "SOT_OPAQUE", 0 ],
    [ "V5_DEBUG", "OFF", 0 ]
  ];

  for (const record of [ dx11, dx12 ])
  {
    assert.equal(record.variant, "skinned");
    assert.equal(record.analysis.bodyIndex, 4);
    assert.equal(record.metadata.bodyIndex, 4);
    assert.deepEqual(
      record.metadata.selectedOptions.map(({ name, value, optionIndex }) =>
        [ name, value, optionIndex ]),
      selectedOptions
    );
    assert.deepEqual(record.metadata.wgslSelection, {
      mode: "explicit",
      techniqueName: "Main",
      passIndex: null,
      completePasses: true,
      requestedStageNames: [],
      selectedStageKeys
    });
    assert.deepEqual(
      record.analysis.stages.map((entry) =>
        `${entry.techniqueName}.pass${entry.passIndex}.${entry.stageName}`),
      selectedStageKeys
    );

    for (const pipeline of record.pipelines)
    {
      assert.deepEqual(
        pipeline.shaderModules.map((entry) => entry.key),
        selectedStageKeys.slice(pipeline.passIndex * 2, pipeline.passIndex * 2 + 2)
      );
      const bindings = pipeline.bindGroups[0].bindings;
      assert.equal(bindings.length, 15);
      const bone = bindings.find((entry) =>
        entry.scopeIdentity === "sampled-resource:0:0@vertex");
      assert.equal(bone.binding, 5);
      assert.deepEqual(bone.visibility, [ "vertex" ]);
      assert.deepEqual(bone.layout.buffer, {
        type: "read-only-storage",
        hasDynamicOffset: false,
        minBindingSize: 48
      });
      assert.equal(bone.structureStride, 48);
      assert.equal(
        bindings.find((entry) =>
          entry.scopeIdentity === "uniform-buffer:0:3@vertex")
          .layout.buffer.minBindingSize,
        432
      );
      assert.deepEqual(
        bindings.filter((entry) => entry.layout.texture)
          .map(({ name, binding }) => [ name, binding ]),
        RESOURCES[record.backend].map(([ name ], index) => [ name, 6 + index ])
      );
      assert.deepEqual(
        bindings.filter((entry) => entry.layout.sampler)
          .map((entry) => entry.binding),
        [ 13, 14 ]
      );
    }

    for (const passIndex of [ 0, 1 ])
    {
      const pixel = record.analysis.stages.find((entry) =>
        entry.passIndex === passIndex && entry.stageName === "pixel");
      const active = pixel.pipelineInputs.filter((entry) => entry.usedMask !== 0);
      assert.equal(active.at(-1).registerIndex, 9);
      assert.equal(active.at(-1).usedMask, 11);
    }

    assert.equal(validateQuadGlassV5PackageRecord(record), record);
  }

  assert.deepEqual(validateQuadGlassV5PackagePair([ dx11, dx12 ]), [ dx11, dx12 ]);
  const left = getQuadGlassV5ResourcePlan(dx11);
  const right = getQuadGlassV5ResourcePlan(dx12);
  assert.deepEqual(left.storage, [ {
    name: "BoneTransforms",
    identity: "sampled-resource:0:0",
    scopeIdentity: "sampled-resource:0:0@vertex",
    registerIndex: 0,
    binding: 5
  } ]);
  assert.deepEqual(right.storage, left.storage);
  assert.deepEqual(left.textures.map((entry) => entry.binding), [ 6, 7, 8, 9, 10, 11, 12 ]);
  assert.deepEqual(right.textures.map((entry) => entry.binding), [ 6, 7, 8, 9, 10, 11, 12 ]);
  assert.deepEqual(left.samplers.map((entry) => entry.binding), [ 13, 14 ]);
});

test("QuadGlassV5 rejects provenance, pass-state, reflection, and pair drift", () =>
{
  const dx11 = validRecord("dx11");
  const dx12 = validRecord("dx12");

  const wrongBody = structuredClone(dx11);
  wrongBody.analysis.bodyIndex = 1;
  assert.throws(() => validateQuadGlassV5PackageRecord(wrongBody), /body index 0/u);

  const wrongSelection = structuredClone(dx11);
  wrongSelection.metadata.selectedOptions[2].value = "SOPPT_ENABLED";
  assert.throws(() => validateQuadGlassV5PackageRecord(wrongSelection), /SOPPT_DISABLED/u);

  const wrongPass = structuredClone(dx11);
  wrongPass.pipelines[0].states[0].value = 2;
  assert.throws(
    () => validateQuadGlassV5PackageRecord(wrongPass),
    /complementary cull state/u
  );

  const wrongAnalysisPass = structuredClone(dx11);
  wrongAnalysisPass.analysis.passes[1].states[0].value = 3;
  assert.throws(
    () => validateQuadGlassV5PackageRecord(wrongAnalysisPass),
    /analysis.*complementary Main cull states/u
  );

  const wrongFog = structuredClone(dx12);
  wrongFog.pipelines[0].bindGroups[0].bindings[6].layout.texture.viewDimension = "2d";
  assert.throws(() => validateQuadGlassV5PackageRecord(wrongFog), /texture layout/u);

  const wrongMaterial = structuredClone(dx11);
  wrongMaterial.analysis.stages[1].bindings[0].carbon.constants[0].name = "Changed";
  assert.throws(() => validateQuadGlassV5PackageRecord(wrongMaterial), /GeneralGlowColor/u);

  const missingFrontFacing = structuredClone(dx11);
  missingFrontFacing.pipelines[0].shaderModules[1].wgsl =
    missingFrontFacing.pipelines[0].shaderModules[1].wgsl
      .replace("@builtin(front_facing) front_facing: bool,", "");
  missingFrontFacing.pipelines[1].shaderModules[1].wgsl =
    missingFrontFacing.pipelines[0].shaderModules[1].wgsl;
  assert.throws(
    () => validateQuadGlassV5PackageRecord(missingFrontFacing),
    /front_facing/u
  );

  const sameFile = structuredClone(dx12);
  sameFile.filePath = dx11.filePath;
  assert.throws(
    () => validateQuadGlassV5PackagePair([ dx11, sameFile ]),
    /distinct physical/u
  );
});

test("QuadGlassV5 rejects skinned body, bone, interface, binding, and pair drift", () =>
{
  const dx11 = validRecord("dx11", "skinned");
  const dx12 = validRecord("dx12", "skinned");

  const wrongBody = structuredClone(dx11);
  wrongBody.analysis.bodyIndex = 0;
  assert.throws(() => validateQuadGlassV5PackageRecord(wrongBody), /body index 4/u);

  const wrongPpt = structuredClone(dx11);
  wrongPpt.metadata.selectedOptions.find((entry) =>
    entry.name === "SPACE_OBJECT_PPT_ENABLED").value = "SOPPT_DISABLED";
  assert.throws(
    () => validateQuadGlassV5PackageRecord(wrongPpt),
    /SPACE_OBJECT_PPT_ENABLED=SOPPT_ENABLED/u
  );

  const malformedBoneStorage = structuredClone(dx11);
  malformedBoneStorage.pipelines[0].bindGroups[0].bindings
    .find((entry) => entry.scopeIdentity === "sampled-resource:0:0@vertex")
    .layout.buffer.minBindingSize = 32;
  assert.throws(
    () => validateQuadGlassV5PackageRecord(malformedBoneStorage),
    /BoneTransforms.*read-only storage layout/u
  );

  const missingBoneStorage = structuredClone(dx11);
  missingBoneStorage.pipelines[0].bindGroups[0].bindings =
    missingBoneStorage.pipelines[0].bindGroups[0].bindings.filter((entry) =>
      entry.scopeIdentity !== "sampled-resource:0:0@vertex");
  assert.throws(
    () => validateQuadGlassV5PackageRecord(missingBoneStorage),
    /exactly 15 canonical bindings/u
  );

  const malformedBoneReflection = structuredClone(dx11);
  malformedBoneReflection.analysis.stages[0].bindings
    .find((entry) => entry.carbon?.name === "BoneTransforms").registerType = 36;
  assert.throws(
    () => validateQuadGlassV5PackageRecord(malformedBoneReflection),
    /unexpected BoneTransforms metadata/u
  );

  const missingBoneReflection = structuredClone(dx11);
  missingBoneReflection.analysis.stages[0].bindings =
    missingBoneReflection.analysis.stages[0].bindings.filter((entry) =>
      entry.carbon?.name !== "BoneTransforms");
  assert.throws(
    () => validateQuadGlassV5PackageRecord(missingBoneReflection),
    /BoneTransforms reflection does not match/u
  );

  const shiftedInterface = structuredClone(dx11);
  shiftedInterface.analysis.stages[1].pipelineInputs.find((entry) =>
    entry.registerIndex === 9).registerIndex = 8;
  assert.throws(
    () => validateQuadGlassV5PackageRecord(shiftedInterface),
    /pixel has an unexpected active input contract/u
  );

  const floatBlendIndices = structuredClone(dx11);
  for (const pipeline of floatBlendIndices.pipelines)
  {
    pipeline.shaderModules[0].wgsl =
      pipeline.shaderModules[0].wgsl.replace("input1: vec4<u32>", "input1: vec4<f32>");
  }
  assert.throws(
    () => validateQuadGlassV5PackageRecord(floatBlendIndices),
    /WGSL must use uint4 blend indices/u
  );

  const shiftedBinding = structuredClone(dx11);
  shiftedBinding.pipelines[0].bindGroups[0].bindings.find((entry) =>
    entry.scopeIdentity === "sampled-resource:0:0@fragment").binding = 7;
  assert.throws(
    () => validateQuadGlassV5PackageRecord(shiftedBinding),
    /unexpected slot, scope, register, or visibility/u
  );

  const wrongCb3Size = structuredClone(dx11);
  wrongCb3Size.pipelines[0].bindGroups[0].bindings.find((entry) =>
    entry.scopeIdentity === "uniform-buffer:0:3@vertex")
    .layout.buffer.minBindingSize = 128;
  assert.throws(
    () => validateQuadGlassV5PackageRecord(wrongCb3Size),
    /uniform-buffer:0:3.*uniform-buffer layout/u
  );

  // Stage order is pinned on the pipelines' own module keys rather than on
  // `metadata.wgslSelection`. The container omits that field entirely for a
  // technique with more than one pass, so on this two-pass family it never
  // reaches the validator; the modules are what a real package actually
  // carries.
  const wrongStageOrder = structuredClone(dx11);
  [
    wrongStageOrder.pipelines[0].shaderModules[0].key,
    wrongStageOrder.pipelines[0].shaderModules[1].key
  ] = [
    wrongStageOrder.pipelines[0].shaderModules[1].key,
    wrongStageOrder.pipelines[0].shaderModules[0].key
  ];
  assert.throws(
    () => validateQuadGlassV5PackageRecord(wrongStageOrder),
    /both complete Main render passes/u
  );

  assert.throws(
    () => validateQuadGlassV5PackagePair([ validRecord("dx11"), dx12 ]),
    /same QuadGlassV5 variant/u
  );
});
