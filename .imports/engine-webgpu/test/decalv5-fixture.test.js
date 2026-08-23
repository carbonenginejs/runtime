import assert from "node:assert/strict";
import test from "node:test";

import {
  DECALV5_CLEAR_TARGET,
  DECALV5_SELECTION,
  DECALV5_TARGET_HEIGHT,
  DECALV5_TARGET_WIDTH,
  DECALV5_VERTEX_BUFFER_LAYOUT,
  createDecalV5FixtureValues,
  getDecalV5ResourcePlan,
  validateDecalV5PackagePair,
  validateDecalV5PackageRecord
} from "../harness/webgpu/decalV5Fixture.js";

const UNIFORMS = [
  [ 1, 0, "vertex", 384 ],
  [ 2, 1, "fragment", 352 ],
  [ 3, 2, "vertex", 320 ],
  [ 4, 3, "fragment", 16 ]
];

const RESOURCE_NAMES = [
  "EveSpaceSceneEnvMap",
  "SSAOMap",
  "EveSpaceSceneShadowMap",
  "NormalMap",
  "DecalTransparencyMap",
  "DecalNormalMap",
  "DecalAlbedoMap",
  "DecalFresnelMap",
  "DecalRoughnessMap"
];

const RESOURCE_REGISTERS = {
  dx11: [ 0, 1, 2, 3, 4, 5, 6, 7, 8 ],
  dx12: [ 0, 1, 2, 3, 5, 6, 7, 8, 9 ]
};

function selectedOptions()
{
  return Object.entries(DECALV5_SELECTION).map(([ name, value ]) => ({
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

function constantBuffer(registerIndex)
{
  return {
    kind: "constantBuffer",
    registerSpace: 0,
    registerIndex,
    carbon: {
      hasLocalConstants: false,
      constantValueSize: 0,
      constants: []
    }
  };
}

function samplerReflection(registerIndex)
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
        addressU: registerIndex === 0 ? 1 : 4,
        addressV: registerIndex === 0 ? 1 : 4,
        addressW: 3,
        mipLODBias: registerIndex === 0 ? 0 : -0.75,
        maxAnisotropy: 16,
        isDynamic: false
      }
    }
  };
}

function record(backend)
{
  const registers = RESOURCE_REGISTERS[backend];
  const source =
    `res:/graphics/effect.${backend}/managed/space/decals/v5/unpacked_decalv5.sm_hi`;
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
struct FragmentOutput {
  @location(0) output0: vec4<f32>,
};
@fragment fn main() -> FragmentOutput {
  var output: FragmentOutput;
  output.output0 = vec4<f32>(1.0);
  return output;
}`;
  const analysisBindings = registers.map((registerIndex, index) => ({
    kind: "resource",
    registerSpace: 0,
    registerIndex,
    carbon: { name: RESOURCE_NAMES[index] }
  }));
  return {
    backend,
    label: `${backend}.carbonwebgpu`,
    filePath: `E:/fixtures/unpacked_decalv5.${backend}.carbonwebgpu`,
    resourcePath: `res:/webgpu-harness/decalv5/${backend}.carbonwebgpu`,
    analysis: {
      source,
      bodyIndex: 0,
      selectedOptions: selectedOptions(),
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
          bindings: [ constantBuffer(1), constantBuffer(3) ]
        },
        {
          key: "Main.pass0.pixel",
          techniqueName: "Main",
          passIndex: 0,
          stageName: "pixel",
          bindings: [
            // Reflected on both backends; DX12 declares them in the root signature.
            samplerReflection(0),
            samplerReflection(1),
            ...analysisBindings,
            constantBuffer(2),
            constantBuffer(4)
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
      shaderModules: [
        {
          key: "Main.pass0.vertex",
          techniqueName: "Main",
          passIndex: 0,
          stageName: "vertex",
          stageType: 0,
          entryPoint: "main",
          wgsl: vertexWgsl
        },
        {
          key: "Main.pass0.pixel",
          techniqueName: "Main",
          passIndex: 0,
          stageName: "pixel",
          stageType: 1,
          entryPoint: "main",
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
          ...registers.map((registerIndex, index) =>
            binding("sampled-resource", registerIndex, 4 + index, "fragment", {
              texture: {
                sampleType: "float",
                viewDimension: index === 0 ? "cube" : "2d",
                multisampled: false
              }
            })),
          binding("sampler", 0, 13, "fragment", { sampler: { type: "filtering" } }),
          binding("sampler", 1, 14, "fragment", { sampler: { type: "filtering" } })
        ]
      } ]
    }
  };
}

test("DecalV5 fixture validates the exact non-bindless backend contracts", () =>
{
  const dx11 = record("dx11");
  const dx12 = record("dx12");
  const pair = [ dx11, dx12 ];
  assert.equal(validateDecalV5PackageRecord(dx11), dx11);
  assert.equal(validateDecalV5PackagePair(pair), pair);

  const dx11Plan = getDecalV5ResourcePlan(dx11);
  const dx12Plan = getDecalV5ResourcePlan(dx12);
  assert.equal(dx11Plan.textures.length, 9);
  assert.equal(dx11Plan.samplers.length, 2);
  assert.equal(dx11Plan.textures[4].name, "DecalTransparencyMap");
  assert.equal(dx11Plan.textures[4].identity, "sampled-resource:0:4");
  assert.equal(dx12Plan.textures[4].identity, "sampled-resource:0:5");
  assert.equal(dx12Plan.textures[8].identity, "sampled-resource:0:9");
});

test("DecalV5 fixture supplies complete authored geometry, uniforms, and textures", () =>
{
  const fixture = createDecalV5FixtureValues(DECALV5_TARGET_WIDTH, DECALV5_TARGET_HEIGHT);
  assert.equal(fixture.vertices.byteLength, 13 * 64);
  assert.equal(fixture.indices.length, 36);
  assert.equal(DECALV5_VERTEX_BUFFER_LAYOUT.arrayStride, 64);
  assert.deepEqual(
    DECALV5_VERTEX_BUFFER_LAYOUT.attributes.map((entry) => entry.shaderLocation),
    [ 0, 2, 3, 4, 5 ]
  );
  assert.deepEqual(
    Object.fromEntries(Object.entries(fixture.uniformData).map(([ key, value ]) =>
      [ key, value.byteLength ])),
    {
      "uniform-buffer:0:1@vertex": 384,
      "uniform-buffer:0:2@fragment": 352,
      "uniform-buffer:0:3@vertex": 320,
      "uniform-buffer:0:4@fragment": 16
    }
  );
  const perFrameVS = new Float32Array(
    fixture.uniformData["uniform-buffer:0:1@vertex"].buffer
  );
  assert.equal(perFrameVS[4 * 4], 1);
  assert.equal(perFrameVS[3 * 4 + 2], 5);
  assert.deepEqual(fixture.textures.map((entry) => entry.name), RESOURCE_NAMES);
  assert.equal(fixture.textures.filter((entry) => entry.dimension === "cube").length, 1);
  const ssao = fixture.textures.find((entry) => entry.name === "SSAOMap");
  assert.deepEqual(Array.from(ssao.data.slice(0, 4)), [ 255, 255, 255, 255 ]);
  assert.deepEqual(DECALV5_CLEAR_TARGET, [ 0, 255, 0, 255 ]);
});

test("DecalV5 fixture rejects provenance, selection, layout, and pair drift", () =>
{
  const wrongSource = record("dx11");
  wrongSource.analysis.source = wrongSource.analysis.source.replace("unpacked_decalv5", "decalv5");
  assert.throws(
    () => validateDecalV5PackageRecord(wrongSource),
    /source provenance/u
  );

  const bindless = record("dx12");
  bindless.analysis.selectedOptions[0].value = "BINDLESS_RENDERING_ENABLED";
  assert.throws(
    () => validateDecalV5PackageRecord(bindless),
    /BINDLESS_RENDERING_DISABLED/u
  );

  const shifted = record("dx12");
  shifted.pipeline.bindGroups[0].bindings[8].binding += 1;
  assert.throws(
    () => validateDecalV5PackageRecord(shifted),
    /unexpected slot/u
  );

  const left = record("dx11");
  const right = record("dx12");
  right.pipeline.shaderModules = structuredClone(left.pipeline.shaderModules);
  assert.throws(
    () => validateDecalV5PackagePair([ left, right ]),
    /identical WGSL/u
  );
});
