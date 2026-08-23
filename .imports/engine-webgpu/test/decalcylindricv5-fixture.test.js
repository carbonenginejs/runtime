import assert from "node:assert/strict";
import test from "node:test";

import {
  DECAL_CYLINDRIC_V5_CLEAR_TARGET,
  DECAL_CYLINDRIC_V5_SELECTION,
  DECAL_CYLINDRIC_V5_TARGET_HEIGHT,
  DECAL_CYLINDRIC_V5_TARGET_WIDTH,
  DECAL_CYLINDRIC_V5_VERTEX_BUFFER_LAYOUT,
  createDecalCylindricV5FixtureValues,
  getDecalCylindricV5ResourcePlan,
  validateDecalCylindricV5PackagePair,
  validateDecalCylindricV5PackageRecord
} from "../harness/webgpu/decalCylindricV5Fixture.js";
import { buildEveSpaceObjectMainUniformData } from "../harness/webgpu/spaceObjectMainUniforms.js";

const UNIFORMS = [
  [ 0, 0, "fragment", 16 ],
  [ 1, 1, "vertex", 384 ],
  [ 2, 2, "fragment", 352 ],
  [ 3, 3, "vertex", 320 ],
  [ 4, 4, "fragment", 16 ]
];

const RESOURCES = [
  [ "EveSpaceSceneEnvMap", "cube", 4, true, false ],
  [ "SSAOMap", "2d", 2, false, false ],
  [ "EveSpaceSceneShadowMap", "2d", 2, false, true ],
  [ "NormalMap", "2d", 2, false, false ],
  [ "DecalTransparencyMap", "2d", 2, false, false ],
  [ "DecalNormalMap", "2d", 2, false, false ],
  [ "DecalAlbedoMap", "2d", 2, true, false ],
  [ "DecalFresnelMap", "2d", 2, true, false ],
  [ "DecalRoughnessMap", "2d", 2, false, false ]
];

const RESOURCE_REGISTERS = {
  dx11: [ 0, 1, 2, 3, 4, 5, 6, 7, 8 ],
  dx12: [ 0, 1, 2, 3, 5, 6, 7, 8, 9 ]
};

const PASS_STATES = [
  { state: 14, value: 0 },
  { state: 15, value: 0 },
  { state: 19, value: 5 },
  { state: 20, value: 6 },
  { state: 27, value: 1 },
  { state: 171, value: 1 }
];

function selectedOptions()
{
  return Object.entries(DECAL_CYLINDRIC_V5_SELECTION).map(([ name, value ]) => ({
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

function constantBuffer(registerIndex)
{
  const local = registerIndex === 0;
  return {
    kind: "constantBuffer",
    registerSpace: 0,
    registerIndex,
    carbon: {
      hasLocalConstants: local,
      constantValueSize: local ? 16 : 0,
      constants: local
        ? [ {
            name: "DecalTextureScaling",
            offset: 0,
            size: 16,
            type: 0,
            dimension: 4,
            elements: 0,
            isSRGB: false,
            isAutoregister: false
          } ]
        : []
    }
  };
}

function resource(registerIndex, definition)
{
  const [ name, _dimension, type, isSRGB, isAutoregister ] = definition;
  return {
    kind: "resource",
    registerSpace: 0,
    registerIndex,
    carbon: {
      name,
      type,
      arrayElements: 1,
      isSRGB,
      isAutoregister
    }
  };
}

function samplerReflection(registerIndex)
{
  const border = registerIndex === 1;
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
        addressU: border ? 4 : 1,
        addressV: border ? 4 : 1,
        addressW: 3,
        mipLODBias: border ? -0.75 : 0,
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

// The layout the caller must now state; see the note in the sibling decal
// fixtures. A fixture owns its own layout rather than reading a format record.
function materialLayout()
{
  return {
    size: 16,
    constants: [ { name: "DecalTextureScaling", offset: 0, size: 16, type: 0, dimension: 4, elements: 0 } ]
  };
}

function record(backend)
{
  const source =
    `res:/graphics/effect.${backend}/managed/space/decals/v5/` +
    "unpacked_decalcylindricv5.sm_hi";
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
  @location(2) output2: vec3<f32>,
  @location(3) output3: vec3<f32>,
  @location(4) output4: vec3<f32>,
  @location(5) output5: vec4<f32>,
  @location(6) output6: vec3<f32>,
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
  @location(2) input2: vec3<f32>,
  @location(3) input3: vec3<f32>,
  @location(4) input4: vec3<f32>,
  @location(5) input5: vec4<f32>,
  @location(8) input8: vec4<f32>,
  @location(9) input9: vec4<f32>,
};
struct FragmentOutput {
  @location(0) output0: vec4<f32>,
};
@fragment fn main(input: FragmentInput) -> FragmentOutput {
  var output: FragmentOutput;
  output.output0 = input.input1;
  return output;
}`;
  const registers = RESOURCE_REGISTERS[backend];
  const reflectedResources = RESOURCES.map((definition, index) =>
    resource(registers[index], definition));
  return {
    backend,
    label: `${backend}.carbonwebgpu`,
    filePath: `E:/fixtures/unpacked_decalcylindricv5.${backend}.carbonwebgpu`,
    resourcePath: `res:/webgpu-harness/decalcylindricv5/${backend}.carbonwebgpu`,
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
          bindings: [ constantBuffer(1), constantBuffer(3) ]
        },
        {
          key: "Main.pass0.pixel",
          techniqueName: "Main",
          passIndex: 0,
          stageName: "pixel",
          stageType: 1,
          threadGroupSize: { x: 0, y: 0, z: 0 },
          pipelineInputs: [
            { registerIndex: 1, dimension: 4, type: 0, usedMask: 15 },
            { registerIndex: 2, dimension: 3, type: 0, usedMask: 7 },
            { registerIndex: 3, dimension: 3, type: 0, usedMask: 7 },
            { registerIndex: 4, dimension: 3, type: 0, usedMask: 7 },
            { registerIndex: 5, dimension: 4, type: 0, usedMask: 15 },
            { registerIndex: 6, dimension: 4, type: 0, usedMask: 0 },
            { registerIndex: 7, dimension: 4, type: 0, usedMask: 0 },
            { registerIndex: 8, dimension: 4, type: 0, usedMask: 15 },
            { registerIndex: 9, dimension: 4, type: 0, usedMask: 7 }
          ],
          bindings: [
            // Reflected on both backends: DX12 declares these in the root
            // signature, and the reflected state is identical.
            samplerReflection(0),
            samplerReflection(1),
            ...reflectedResources,
            constantBuffer(0),
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
          ...RESOURCES.map((definition, index) =>
            pipelineBinding("sampled-resource", registers[index], 5 + index, "fragment", {
              buffer: null,
              texture: {
                sampleType: "float",
                viewDimension: definition[1],
                multisampled: false
              },
              sampler: null
            })),
          pipelineBinding("sampler", 0, 14, "fragment", {
            buffer: null,
            texture: null,
            sampler: { type: "filtering" }
          }),
          pipelineBinding("sampler", 1, 15, "fragment", {
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

test("DecalCylindricV5 validates its exact surface and cylindrical contract", () =>
{
  const dx11 = record("dx11");
  const dx12 = record("dx12");
  const pair = [ dx11, dx12 ];
  assert.equal(validateDecalCylindricV5PackageRecord(dx11), dx11);
  assert.equal(validateDecalCylindricV5PackagePair(pair), pair);

  const dx11Plan = getDecalCylindricV5ResourcePlan(dx11);
  const dx12Plan = getDecalCylindricV5ResourcePlan(dx12);
  assert.deepEqual(
    dx11Plan.textures.map((entry) => [ entry.name, entry.registerIndex, entry.binding ]),
    RESOURCES.map((entry, index) => [ entry[0], index, 5 + index ])
  );
  assert.deepEqual(
    dx12Plan.textures.map((entry) => [ entry.name, entry.registerIndex, entry.binding ]),
    RESOURCES.map((entry, index) =>
      [ entry[0], RESOURCE_REGISTERS.dx12[index], 5 + index ])
  );
  assert.deepEqual(
    dx11Plan.samplers.map((entry) => [ entry.name, entry.binding ]),
    [ [ "Sampler0", 14 ], [ "DecalSampler", 15 ] ]
  );
});

test("DecalCylindricV5 supplies deterministic alpha axes and exact decal overrides", () =>
{
  const fixture = createDecalCylindricV5FixtureValues(
    DECAL_CYLINDRIC_V5_TARGET_WIDTH,
    DECAL_CYLINDRIC_V5_TARGET_HEIGHT
  );
  assert.equal(
    fixture.vertices.byteLength,
    13 * DECAL_CYLINDRIC_V5_VERTEX_BUFFER_LAYOUT.arrayStride
  );
  for (let offset = 2; offset < fixture.vertices.length; offset += 16)
  {
    assert.equal(fixture.vertices[offset], 0.5);
  }
  assert.equal(fixture.indices.length, 36);
  assert.deepEqual(Object.keys(fixture.textureResourceVariants), [
    "base",
    "axialTransparency",
    "whiteTransparency"
  ]);
  const angular = fixture.textures.find((entry) =>
    entry.name === "DecalTransparencyMap");
  const axial = fixture.textures.find((entry) =>
    entry.name === "AxialDecalTransparencyMap");
  assert.deepEqual(
    Array.from({ length: 8 }, (_, x) => angular.data[x * 4]),
    [ 48, 72, 96, 120, 144, 168, 192, 216 ]
  );
  assert.deepEqual(
    Array.from({ length: 8 }, (_, y) => axial.data[y * axial.bytesPerRow]),
    [ 48, 72, 96, 120, 144, 168, 192, 216 ]
  );
  assert.deepEqual(
    fixture.samplers.map(({ name, addressModeU, addressModeV }) =>
      [ name, addressModeU, addressModeV ]),
    [
      [ "Sampler0", "repeat", "repeat" ],
      [ "DecalSampler", "clamp-to-edge", "clamp-to-edge" ]
    ]
  );
  assert.deepEqual(DECAL_CYLINDRIC_V5_CLEAR_TARGET, [ 0, 255, 0, 255 ]);

  const decalVS = fixture.decalUniformData["uniform-buffer:0:3@vertex"];
  const decalPS = fixture.decalUniformData["uniform-buffer:0:4@fragment"];
  assert.equal(decalVS.byteLength, 320);
  assert.equal(decalPS.byteLength, 16);
  assert.deepEqual(
    Array.from(new Float32Array(decalPS.buffer, decalPS.byteOffset, decalPS.byteLength / 4)),
    [ 0, 1, 0, 0 ]
  );

  for (const backend of [ "dx11", "dx12" ])
  {
    const packed = {
      ...buildEveSpaceObjectMainUniformData(record(backend), fixture.bindingValues, { materialLayout: materialLayout() }),
      ...fixture.decalUniformData
    };
    assert.deepEqual(
      Object.values(packed).map((bytes) => bytes.byteLength),
      [ 16, 736, 1888, 320, 16 ]
    );
    assert.equal(floatAt(packed["uniform-buffer:0:0@fragment"], 12), 1);
  }
});

test("DecalCylindricV5 rejects provenance, interface, reflection, and pair drift", () =>
{
  const wrongSource = record("dx11");
  wrongSource.analysis.source = wrongSource.analysis.source.replace("cylindric", "");
  assert.throws(
    () => validateDecalCylindricV5PackageRecord(wrongSource),
    /source provenance/u
  );

  const wrongPass = record("dx11");
  wrongPass.analysis.passes[0].states[3].value = 2;
  assert.throws(
    () => validateDecalCylindricV5PackageRecord(wrongPass),
    /render states/u
  );

  const wrongCylindricalMask = record("dx12");
  wrongCylindricalMask.analysis.stages[1].pipelineInputs
    .find((entry) => entry.registerIndex === 8).usedMask = 7;
  assert.throws(
    () => validateDecalCylindricV5PackageRecord(wrongCylindricalMask),
    /cylindrical surface input/u
  );

  const missingVertexOutput = record("dx12");
  missingVertexOutput.pipeline.shaderModules[0].wgsl =
    missingVertexOutput.pipeline.shaderModules[0].wgsl
      .replace("  @location(8) output8: vec4<f32>,\n", "");
  assert.throws(
    () => validateDecalCylindricV5PackageRecord(missingVertexOutput),
    /vertex module interface/u
  );

  const wrongSampler = record("dx11");
  wrongSampler.analysis.stages[1].bindings[1].carbon.sampler.borderColor[0] = 1;
  assert.throws(
    () => validateDecalCylindricV5PackageRecord(wrongSampler),
    /static sampler state/u
  );

  const wrongMaterial = record("dx12");
  wrongMaterial.analysis.stages[1].bindings
    .find((entry) => entry.kind === "constantBuffer" && entry.registerIndex === 0)
    .carbon.constants[0].name = "DecalTextureOffset";
  assert.throws(
    () => validateDecalCylindricV5PackageRecord(wrongMaterial),
    /DecalTextureScaling/u
  );

  const shiftedResource = record("dx12");
  shiftedResource.pipeline.bindGroups[0].bindings[9].binding = 10;
  assert.throws(
    () => validateDecalCylindricV5PackageRecord(shiftedResource),
    /canonical binding slot/u
  );

  // A duplicate sampler, not "a DX12 sampler". DX12 reflects s0 and s1 exactly
  // as DX11 does, so what must be rejected is a third one, not their presence.
  const duplicatedSampler = record("dx12");
  duplicatedSampler.analysis.stages[1].bindings.unshift(samplerReflection(0));
  assert.throws(
    () => validateDecalCylindricV5PackageRecord(duplicatedSampler),
    /binding count/u
  );

  const left = record("dx11");
  const right = record("dx12");
  right.pipeline.shaderModules = structuredClone(left.pipeline.shaderModules);
  assert.throws(
    () => validateDecalCylindricV5PackagePair([ left, right ]),
    /identical WGSL/u
  );
});
