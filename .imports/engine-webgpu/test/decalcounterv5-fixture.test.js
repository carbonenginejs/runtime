import assert from "node:assert/strict";
import test from "node:test";

import {
  DECAL_COUNTER_V5_CLEAR_TARGET,
  DECAL_COUNTER_V5_KILL_COUNT,
  DECAL_COUNTER_V5_SELECTION,
  DECAL_COUNTER_V5_TARGET_HEIGHT,
  DECAL_COUNTER_V5_TARGET_WIDTH,
  DECAL_COUNTER_V5_VERTEX_BUFFER_LAYOUT,
  createDecalCounterV5FixtureValues,
  getDecalCounterV5ResourcePlan,
  validateDecalCounterV5PackagePair,
  validateDecalCounterV5PackageRecord
} from "../harness/webgpu/decalCounterV5Fixture.js";
import { buildEveSpaceObjectMainUniformData } from "../harness/webgpu/spaceObjectMainUniforms.js";

const UNIFORMS = [
  [ 0, 0, "fragment", 48 ],
  [ 1, 1, "vertex", 384 ],
  [ 2, 2, "fragment", 352 ],
  [ 3, 3, "vertex", 320 ],
  [ 4, 4, "fragment", 32 ]
];

const MATERIAL_LAYOUT = {
  dx11: [
    [ "DecalTextureScaling", 0 ],
    [ "DecalIntensityData", 16 ],
    [ "DecalGlowColor", 32 ]
  ],
  dx12: [
    [ "DecalGlowColor", 0 ],
    [ "DecalTextureScaling", 16 ],
    [ "DecalIntensityData", 32 ]
  ]
};

function selectedOptions()
{
  return Object.entries(DECAL_COUNTER_V5_SELECTION).map(([ name, value ]) => ({
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
      constantValueSize: local ? 48 : 0,
      constants: local
        ? MATERIAL_LAYOUT[backend].map(([ name, offset ]) => ({
            name,
            offset,
            size: 16,
            type: 0,
            dimension: 4,
            elements: 0
          }))
        : []
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
    size: 48,
    constants: MATERIAL_LAYOUT[backend].map(([ name, offset ]) => ({ name, offset, size: 16, type: 0, dimension: 4, elements: 0 }))
  };
}

function record(backend)
{
  const source =
    `res:/graphics/effect.${backend}/managed/space/decals/v5/unpacked_decalcounterv5.sm_hi`;
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
  return {
    backend,
    label: `${backend}.carbonwebgpu`,
    filePath: `E:/fixtures/unpacked_decalcounterv5.${backend}.carbonwebgpu`,
    resourcePath: `res:/webgpu-harness/decalcounterv5/${backend}.carbonwebgpu`,
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
          bindings: [ constantBuffer(1, backend), constantBuffer(3, backend) ]
        },
        {
          key: "Main.pass0.pixel",
          techniqueName: "Main",
          passIndex: 0,
          stageName: "pixel",
          bindings: [
            // Reflected on both backends: DX12 declares it in the root
            // signature, and the reflected state is identical.
            samplerReflection(),
            {
              kind: "resource",
              registerSpace: 0,
              registerIndex: 0,
              carbon: { name: "DecalTransparencyMap" }
            },
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
          binding("sampled-resource", 0, 5, "fragment", {
            texture: { sampleType: "float", viewDimension: "2d", multisampled: false }
          }),
          binding("sampler", 0, 6, "fragment", { sampler: { type: "filtering" } })
        ]
      } ]
    }
  };
}

function floatAt(bytes, offset)
{
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getFloat32(offset, true);
}

test("DecalCounterV5 validates its backend-specific reflected material order", () =>
{
  const dx11 = record("dx11");
  const dx12 = record("dx12");
  const pair = [ dx11, dx12 ];
  assert.equal(validateDecalCounterV5PackageRecord(dx11), dx11);
  assert.equal(validateDecalCounterV5PackagePair(pair), pair);

  const plan = getDecalCounterV5ResourcePlan(dx12);
  assert.deepEqual(plan.textures.map((entry) => entry.name), [ "DecalTransparencyMap" ]);
  assert.deepEqual(plan.samplers.map((entry) => entry.name), [ "Sampler0" ]);
  assert.equal(plan.textures[0].scopeIdentity, "sampled-resource:0:0@fragment");
  assert.equal(plan.samplers[0].scopeIdentity, "sampler:0:0@fragment");
});

test("DecalCounterV5 supplies semantic values that pack correctly for both backends", () =>
{
  const fixture = createDecalCounterV5FixtureValues(
    DECAL_COUNTER_V5_TARGET_WIDTH,
    DECAL_COUNTER_V5_TARGET_HEIGHT
  );
  assert.equal(fixture.vertices.byteLength, 13 * DECAL_COUNTER_V5_VERTEX_BUFFER_LAYOUT.arrayStride);
  assert.equal(fixture.indices.length, 36);
  assert.deepEqual(fixture.textures.map((entry) => entry.name), [ "DecalTransparencyMap" ]);
  assert.deepEqual(fixture.samplerNames, [ "Sampler0" ]);
  assert.deepEqual(DECAL_COUNTER_V5_CLEAR_TARGET, [ 0, 255, 0, 255 ]);
  const decalVS = fixture.decalUniformData["uniform-buffer:0:3@vertex"];
  const decalPS = fixture.decalUniformData["uniform-buffer:0:4@fragment"];
  assert.equal(decalVS.byteLength, 384);
  assert.equal(decalPS.byteLength, 32);
  assert.deepEqual(
    Array.from(new Float32Array(decalVS.buffer, decalVS.byteOffset, decalVS.byteLength / 4)),
    Array.from({ length: 96 }, (_, index) =>
      index % 16 === 0 || index % 16 === 5 || index % 16 === 10 || index % 16 === 15 ? 1 : 0)
  );
  assert.equal(DECAL_COUNTER_V5_KILL_COUNT, 731);
  assert.ok(DECAL_COUNTER_V5_KILL_COUNT >= 0 && DECAL_COUNTER_V5_KILL_COUNT <= 999);
  assert.deepEqual(
    Array.from(new Float32Array(decalPS.buffer, decalPS.byteOffset, decalPS.byteLength / 4)),
    [ DECAL_COUNTER_V5_KILL_COUNT, 1, 0, 0, 0, 1, 0, 0 ]
  );

  const dx11 = buildEveSpaceObjectMainUniformData(record("dx11"), fixture.bindingValues, { materialLayout: materialLayout("dx11") });
  const dx12 = buildEveSpaceObjectMainUniformData(record("dx12"), fixture.bindingValues, { materialLayout: materialLayout("dx12") });
  assert.equal(dx11["uniform-buffer:0:0@fragment"].byteLength, 48);
  assert.equal(dx12["uniform-buffer:0:0@fragment"].byteLength, 48);
  assert.equal(floatAt(dx11["uniform-buffer:0:0@fragment"], 0), 1);
  assert.equal(floatAt(dx11["uniform-buffer:0:0@fragment"], 32), Math.fround(0.95));
  assert.equal(floatAt(dx12["uniform-buffer:0:0@fragment"], 0), Math.fround(0.95));
  assert.equal(floatAt(dx12["uniform-buffer:0:0@fragment"], 16), 1);
});

test("DecalCounterV5 rejects provenance, material-layout, and pair drift", () =>
{
  const wrongSource = record("dx11");
  wrongSource.analysis.source = wrongSource.analysis.source.replace("decalcounter", "decal");
  assert.throws(
    () => validateDecalCounterV5PackageRecord(wrongSource),
    /source provenance/u
  );

  const wrongMaterial = record("dx12");
  wrongMaterial.analysis.stages[1].bindings
    .find((entry) => entry.kind === "constantBuffer" && entry.registerIndex === 0)
    .carbon.constants[0].name = "DecalTextureScaling";
  assert.throws(
    () => validateDecalCounterV5PackageRecord(wrongMaterial),
    /DecalGlowColor/u
  );

  const shifted = record("dx12");
  shifted.pipeline.bindGroups[0].bindings[5].binding += 1;
  assert.throws(
    () => validateDecalCounterV5PackageRecord(shifted),
    /unexpected slot/u
  );

  const left = record("dx11");
  const right = record("dx12");
  right.pipeline.shaderModules = structuredClone(left.pipeline.shaderModules);
  assert.throws(
    () => validateDecalCounterV5PackagePair([ left, right ]),
    /identical WGSL/u
  );
});
