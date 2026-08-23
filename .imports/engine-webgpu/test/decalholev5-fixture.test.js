import assert from "node:assert/strict";
import test from "node:test";

import {
  DECAL_HOLE_V5_AXIAL_TRANSPARENCY,
  DECAL_HOLE_V5_BASE_TRANSPARENCY,
  DECAL_HOLE_V5_CLEAR_TARGET,
  DECAL_HOLE_V5_CUBE_ALPHA,
  DECAL_HOLE_V5_GLOW_COLOR,
  DECAL_HOLE_V5_HOLE_ALPHA,
  DECAL_HOLE_V5_HOLE_RED,
  DECAL_HOLE_V5_SELECTION,
  DECAL_HOLE_V5_TARGET_HEIGHT,
  DECAL_HOLE_V5_TARGET_WIDTH,
  DECAL_HOLE_V5_VERTEX_BUFFER_LAYOUT,
  createDecalHoleV5FixtureValues,
  getDecalHoleV5ResourcePlan,
  validateDecalHoleV5PackagePair,
  validateDecalHoleV5PackageRecord
} from "../harness/webgpu/decalHoleV5Fixture.js";
import { buildEveSpaceObjectMainUniformData } from "../harness/webgpu/spaceObjectMainUniforms.js";

const PASS_STATES = [
  { state: 14, value: 0 },
  { state: 15, value: 0 },
  { state: 19, value: 5 },
  { state: 20, value: 6 },
  { state: 27, value: 1 },
  { state: 171, value: 1 }
];

const UNIFORMS = [
  [ 0, 0, "fragment", 16 ],
  [ 1, 1, "vertex", 656 ],
  [ 2, 2, "fragment", 352 ],
  [ 3, 3, "vertex", 384 ],
  [ 4, 4, "fragment", 16 ]
];

const TEXTURES = [
  [ "DecalTransparencyMap", 0, 5, "2d", 2, false ],
  [ "DecalHoleMap", 1, 6, "2d", 2, false ],
  [ "DecalInsideCubeMap", 2, 7, "cube", 4, true ]
];

function selectedOptions()
{
  return Object.entries(DECAL_HOLE_V5_SELECTION).map(([ name, value ]) => ({
    name,
    value,
    optionIndex: 0,
    defaultOption: 0,
    defaultValue: value,
    source: "local"
  }));
}

function pipelineBinding(resourceKind, registerIndex, binding, visibility, layout)
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
    binding,
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
            name: "DecalGlowColor",
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

function resource(definition)
{
  const [ name, registerIndex, _binding, _dimension, type, isSRGB ] = definition;
  return {
    kind: "resource",
    registerSpace: 0,
    registerIndex,
    carbon: {
      name,
      type,
      arrayElements: 1,
      isSRGB,
      isAutoregister: false
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
        addressU: 4,
        addressV: 4,
        addressW: 3,
        mipLODBias: registerIndex === 0 ? -0.75 : 0,
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

function vertexWgsl(backend)
{
  return `// ${backend}
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
}

function pixelWgsl(backend)
{
  return `// ${backend}
struct FragmentInput {
  @location(8) input8: vec4<f32>,
  @location(9) input9: vec4<f32>,
};
struct FragmentOutput {
  @location(0) output0: vec4<f32>,
};
@fragment fn main(input: FragmentInput) -> FragmentOutput {
  var output: FragmentOutput;
  output.output0 = vec4<f32>(input.input8.xyz + input.input9.xyz, 1.0);
  return output;
}`;
}

// The layout the caller must now state; see the note in the sibling decal
// fixtures. A fixture owns its own layout rather than reading a format record.
function materialLayout()
{
  return {
    size: 16,
    constants: [ { name: "DecalGlowColor", offset: 0, size: 16, type: 0, dimension: 4, elements: 0 } ]
  };
}

function record(backend)
{
  const source =
    `res:/graphics/effect.${backend}/managed/space/decals/v5/` +
    "unpacked_decalholev5.sm_hi";
  const textureBindings = TEXTURES.map((definition) =>
  {
    const [ _name, registerIndex, binding, dimension ] = definition;
    return pipelineBinding("sampled-resource", registerIndex, binding, "fragment", {
      buffer: null,
      texture: {
        sampleType: "float",
        viewDimension: dimension,
        multisampled: false
      },
      sampler: null
    });
  });
  return {
    backend,
    filePath: `E:/fixtures/unpacked_decalholev5.${backend}.carbonwebgpu`,
    resourcePath: `res:/webgpu-harness/decalholev5/${backend}.carbonwebgpu`,
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
            { registerIndex: 0, usedMask: 7, dimension: 3, type: 0 },
            { registerIndex: 1, usedMask: 0, dimension: 4, type: 2 },
            { registerIndex: 2, usedMask: 3, dimension: 2, type: 0 },
            { registerIndex: 3, usedMask: 7, dimension: 3, type: 0 },
            { registerIndex: 4, usedMask: 7, dimension: 3, type: 0 },
            { registerIndex: 5, usedMask: 7, dimension: 3, type: 0 }
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
            ...Array.from({ length: 7 }, (_, index) => ({
              registerIndex: index + 1,
              usedMask: 0,
              dimension: index === 1 || index === 2 || index === 3 ? 3 : 4,
              type: 0
            })),
            { registerIndex: 8, usedMask: 7, dimension: 4, type: 0 },
            { registerIndex: 9, usedMask: 7, dimension: 4, type: 0 }
          ],
          bindings: [
            // Reflected on both backends; DX12 declares them in the root signature.
            samplerReflection(0),
            samplerReflection(1),
            ...TEXTURES.map(resource),
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
          wgsl: vertexWgsl(backend)
        },
        {
          key: "Main.pass0.pixel",
          techniqueName: "Main",
          passIndex: 0,
          stageName: "pixel",
          stageType: 1,
          entryPoint: "main",
          threadGroupSize: null,
          wgsl: pixelWgsl(backend)
        }
      ],
      bindGroups: [ {
        group: 0,
        bindings: [
          ...UNIFORMS.map(([ registerIndex, binding, visibility, minBindingSize ]) =>
            pipelineBinding("uniform-buffer", registerIndex, binding, visibility, {
              buffer: { type: "uniform", hasDynamicOffset: false, minBindingSize },
              texture: null,
              sampler: null
            })),
          ...textureBindings,
          pipelineBinding("sampler", 0, 8, "fragment", {
            buffer: null,
            texture: null,
            sampler: { type: "filtering" }
          }),
          pipelineBinding("sampler", 1, 9, "fragment", {
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

test("DecalHoleV5 validates the exact default ray/sphere contract", () =>
{
  const dx11 = record("dx11");
  const dx12 = record("dx12");
  assert.equal(validateDecalHoleV5PackageRecord(dx11), dx11);
  assert.equal(validateDecalHoleV5PackagePair([ dx11, dx12 ])[1], dx12);
  for (const backend of [ dx11, dx12 ])
  {
    const plan = getDecalHoleV5ResourcePlan(backend);
    assert.deepEqual(
      plan.textures.map((entry) =>
        [ entry.name, entry.registerIndex, entry.binding, entry.viewDimension ]),
      TEXTURES.map(([ name, registerIndex, binding, dimension ]) =>
        [ name, registerIndex, binding, dimension ])
    );
    assert.deepEqual(
      plan.samplers.map((entry) => [ entry.name, entry.binding, entry.mipLODBias ]),
      [ [ "DecalSampler", 8, -0.75 ], [ "InsideCubeSampler", 9, 0 ] ]
    );
  }
});

test("DecalHoleV5 supplies deterministic discard geometry, controls, and exact overrides", () =>
{
  const fixture = createDecalHoleV5FixtureValues(
    DECAL_HOLE_V5_TARGET_WIDTH,
    DECAL_HOLE_V5_TARGET_HEIGHT
  );
  assert.equal(fixture.vertices.byteLength, 4 * DECAL_HOLE_V5_VERTEX_BUFFER_LAYOUT.arrayStride);
  assert.deepEqual(
    Array.from({ length: 4 }, (_, index) => fixture.vertices[index * 16 + 2]),
    Array.from(new Float32Array([ 0.3, 0.3, 0.7, 0.7 ]))
  );
  assert.deepEqual(Array.from(fixture.indices), [ 0, 1, 2, 0, 2, 3 ]);
  assert.deepEqual(Object.keys(fixture.textureResourceVariants), [
    "base",
    "axialTransparency",
    "interiorWhiteTransparency",
    "zeroHole",
    "insideHole"
  ]);
  assert.deepEqual(fixture.bindingValues.material.DecalGlowColor, DECAL_HOLE_V5_GLOW_COLOR);
  assert.deepEqual(DECAL_HOLE_V5_BASE_TRANSPARENCY, [ 0, 32, 72, 120, 176, 224, 248, 0 ]);
  assert.deepEqual(DECAL_HOLE_V5_AXIAL_TRANSPARENCY, [ 0, 16, 96, 208, 240, 160, 48, 0 ]);
  assert.deepEqual(DECAL_HOLE_V5_HOLE_RED, [ 0, 40, 88, 152, 216, 176, 64, 0 ]);
  assert.deepEqual(DECAL_HOLE_V5_HOLE_ALPHA, [ 0, 224, 72, 192, 48, 240, 112, 0 ]);
  const cube = fixture.textures.find((entry) => entry.name === "DecalInsideCubeMap");
  assert.equal(cube.dimension, "cube");
  assert.deepEqual(
    Array.from({ length: 6 }, (_, face) => cube.data[face * 4 + 3]),
    Array(6).fill(DECAL_HOLE_V5_CUBE_ALPHA)
  );
  for (const texture of fixture.textures.filter((entry) => entry.dimension === "2d"))
  {
    for (const [ x, y ] of [ [ 0, 0 ], [ 7, 0 ], [ 0, 7 ], [ 7, 7 ] ])
    {
      const offset = y * texture.bytesPerRow + x * 4;
      assert.deepEqual(Array.from(texture.data.slice(offset, offset + 4)), [ 0, 0, 0, 0 ]);
    }
  }
  assert.deepEqual(DECAL_HOLE_V5_CLEAR_TARGET, [ 0, 255, 0, 255 ]);
  assert.equal(fixture.decalUniformData["uniform-buffer:0:3@vertex"].byteLength, 384);
  assert.equal(fixture.decalUniformData["uniform-buffer:0:4@fragment"].byteLength, 16);
  for (const backend of [ "dx11", "dx12" ])
  {
    const packed = {
      ...buildEveSpaceObjectMainUniformData(record(backend), fixture.bindingValues, { materialLayout: materialLayout() }),
      ...fixture.decalUniformData
    };
    assert.deepEqual(
      Object.values(packed).map((bytes) => bytes.byteLength),
      [ 16, 736, 1888, 384, 16 ]
    );
    assert.equal(floatAt(packed["uniform-buffer:0:2@fragment"], 340), 0);
    assert.equal(floatAt(packed["uniform-buffer:0:2@fragment"], 348), 1);
    assert.equal(floatAt(packed["uniform-buffer:0:4@fragment"], 4), 1);
  }
});

test("DecalHoleV5 rejects provenance, interface, reflection, and pair drift", () =>
{
  const wrongSource = record("dx11");
  wrongSource.metadata.sourcePath = wrongSource.metadata.sourcePath.replace("hole", "");
  assert.throws(() => validateDecalHoleV5PackageRecord(wrongSource), /source provenance/u);

  const wrongPass = record("dx12");
  wrongPass.pipeline.states[2].value = 4;
  assert.throws(() => validateDecalHoleV5PackageRecord(wrongPass), /render states/u);

  const wrongInput = record("dx11");
  wrongInput.analysis.stages[1].pipelineInputs
    .find((entry) => entry.registerIndex === 9).usedMask = 15;
  assert.throws(() => validateDecalHoleV5PackageRecord(wrongInput), /ray\/sphere input/u);

  const missingPixelInput = record("dx12");
  missingPixelInput.pipeline.shaderModules[1].wgsl =
    missingPixelInput.pipeline.shaderModules[1].wgsl
      .replace("  @location(9) input9: vec4<f32>,\n", "");
  assert.throws(
    () => validateDecalHoleV5PackageRecord(missingPixelInput),
    /pixel module interface/u
  );

  const wrongMaterial = record("dx11");
  wrongMaterial.analysis.stages[1].bindings
    .find((entry) => entry.kind === "constantBuffer" && entry.registerIndex === 0)
    .carbon.constants[0].name = "DecalHoleColor";
  assert.throws(() => validateDecalHoleV5PackageRecord(wrongMaterial), /DecalGlowColor/u);

  const wrongSampler = record("dx11");
  wrongSampler.analysis.stages[1].bindings[0].carbon.sampler.addressU = 1;
  assert.throws(() => validateDecalHoleV5PackageRecord(wrongSampler), /static sampler state/u);

  const wrongCube = record("dx12");
  wrongCube.pipeline.bindGroups[0].bindings[7].layout.texture.viewDimension = "2d";
  assert.throws(() => validateDecalHoleV5PackageRecord(wrongCube), /texture layout/u);

  // A duplicate sampler, not "a DX12 sampler": DX12 reflects s0 and s1 exactly
  // as DX11 does, so a third one is what must be rejected.
  const duplicatedSampler = record("dx12");
  duplicatedSampler.analysis.stages[1].bindings.unshift(samplerReflection(0));
  assert.throws(() => validateDecalHoleV5PackageRecord(duplicatedSampler), /binding count/u);

  const left = record("dx11");
  const right = record("dx12");
  right.pipeline.shaderModules = structuredClone(left.pipeline.shaderModules);
  assert.throws(
    () => validateDecalHoleV5PackagePair([ left, right ]),
    /identical WGSL/u
  );
});
