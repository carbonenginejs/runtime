import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CjsWebgpuBindGroup,
  CjsWebgpuBuffer,
  CjsWebgpuPackage,
  CjsWebgpuSampler,
  CjsWebgpuShaderModule,
  CjsWebgpuTexture
} from "../src/index.js";
import { buildCopyblitDrawDescriptor } from "../src/core/packageDraw.js";

// The effect-path helpers that used to be tested here have moved to
// `@carbonenginejs/runtime-core/platform`. This engine never called them - it
// only re-exported them - and an engine that owns a path policy is an engine
// deciding its own configuration. It is handed a resolved path, and it fails
// loudly on anything it cannot load, which the package validation below covers.

test("CjsWebgpuPackage builds immutable pass, shader, and bind-group descriptors from ANLS data", () =>
{
  const pkg = CjsWebgpuPackage.from({
    format: "Carbon WebGPU",
    version: 1,
    sourcePath: "res:/graphics/effect.dx11/space/quadv5.sm_depth",
    metadata: {
      effectName: "quadv5"
    },
    analysis: {
      effectName: "quadv5",
      bodyIndex: 0,
      selectedOptions: [ { name: "QUALITY", value: "HIGH", source: "local" } ],
      passes: [ {
        techniqueName: "Main",
        passIndex: 0,
        renderStates: 12,
        states: [ { state: "CullMode", value: 2 } ]
      } ],
      stages: [ {
        key: "Main.pass0.vertex",
        techniqueName: "Main",
        passIndex: 0,
        stageName: "vertex",
        stageType: 0,
        pipelineInputs: [ { usage: "POSITION", registerIndex: 0 } ],
        bindings: [
          {
            kind: "constantBuffer",
            generatedSymbol: "cb0",
            registerIndex: 0,
            registerCount: 1,
            arrayCount: 1,
            metadataName: "$LocalConstants",
            carbon: {
              hasLocalConstants: true,
              constantValueSize: 64
            },
            annotations: []
          },
          {
            kind: "resource",
            generatedSymbol: "t0",
            registerIndex: 0,
            registerCount: 1,
            arrayCount: 1,
            metadataName: "AlbedoMap",
            carbon: {
              name: "AlbedoMap",
              type: 2,
              arrayElements: 1,
              isSRGB: true
            },
            annotations: []
          },
          {
            kind: "sampler",
            generatedSymbol: "s0",
            registerIndex: 0,
            registerCount: 1,
            arrayCount: 1,
            metadataName: "AlbedoSampler",
            carbon: {
              name: "AlbedoSampler"
            },
            annotations: []
          }
        ]
      }, {
        key: "Main.pass0.pixel",
        techniqueName: "Main",
        passIndex: 0,
        stageName: "pixel",
        stageType: 1,
        bindings: [
          {
            kind: "resource",
            generatedSymbol: "t0",
            registerIndex: 0,
            registerCount: 1,
            arrayCount: 1,
            metadataName: "AlbedoMap",
            carbon: {
              name: "AlbedoMap",
              type: 2,
              arrayElements: 1,
              isSRGB: true
            },
            annotations: []
          }
        ]
      } ]
    },
    stages: [ {
      key: "Main.pass0.vertex",
      techniqueName: "Main",
      passIndex: 0,
      stageName: "vertex",
      stageType: 0,
      pipelineInputs: [ { usage: "POSITION", registerIndex: 0 } ],
      bindings: [
        {
          kind: "constantBuffer",
          generatedSymbol: "cb0",
          registerIndex: 0,
          registerCount: 1,
          arrayCount: 1,
          metadataName: "$LocalConstants",
          carbon: {
            hasLocalConstants: true,
            constantValueSize: 64
          },
          annotations: []
        },
        {
          kind: "resource",
          generatedSymbol: "t0",
          registerIndex: 0,
          registerCount: 1,
          arrayCount: 1,
          metadataName: "AlbedoMap",
          carbon: {
            name: "AlbedoMap",
            type: 2,
            arrayElements: 1,
            isSRGB: true
          },
          annotations: []
        },
        {
          kind: "sampler",
          generatedSymbol: "s0",
          registerIndex: 0,
          registerCount: 1,
          arrayCount: 1,
          metadataName: "AlbedoSampler",
          carbon: {
            name: "AlbedoSampler"
          },
          annotations: []
        }
      ]
    }, {
      key: "Main.pass0.pixel",
      techniqueName: "Main",
      passIndex: 0,
      stageName: "pixel",
      stageType: 1,
      bindings: [
        {
          kind: "resource",
          generatedSymbol: "t0",
          registerIndex: 0,
          registerCount: 1,
          arrayCount: 1,
          metadataName: "AlbedoMap",
          carbon: {
            name: "AlbedoMap",
            type: 2,
            arrayElements: 1,
            isSRGB: true
          },
          annotations: []
        },
        {
          kind: "sampler",
          generatedSymbol: "s0",
          registerIndex: 0,
          registerCount: 1,
          arrayCount: 1,
          metadataName: "AlbedoSampler",
          carbon: {
            name: "AlbedoSampler"
          },
          annotations: []
        }
      ]
    } ],
    shaders: [ {
      key: "Main.pass0.vertex",
      source: "@vertex fn main() -> @builtin(position) vec4f { return vec4f(); }"
    }, {
      key: "Main.pass0.pixel",
      source: "@fragment fn main() -> @location(0) vec4f { return vec4f(1.0); }"
    } ]
  });

  assert.equal(pkg.format, "Carbon WebGPU");
  assert.equal(pkg.shaderModules.length, 2);
  assert.equal(pkg.pipelines.length, 1);
  assert.equal(pkg.bindGroups.length, 1);
  assert(pkg.shaderModules[0] instanceof CjsWebgpuShaderModule);
  assert(pkg.bindGroups[0] instanceof CjsWebgpuBindGroup);

  const pipeline = pkg.GetPipeline("Main", 0);
  assert(pipeline);
  assert.equal(pipeline.HasCompleteWgsl(), true);
  assert.equal(pipeline.GetShaderModule("vertex").HasWgsl(), true);
  assert.equal(pipeline.bindGroups[0].bindings.length, 3);

  const cb0 = pipeline.bindGroups[0].GetBinding("constantBuffer:cb0:$LocalConstants:0");
  const t0 = pipeline.bindGroups[0].GetBinding("resource:t0:AlbedoMap:0");
  const s0 = pipeline.bindGroups[0].GetBinding("sampler:s0:AlbedoSampler:0");

  assert(cb0 instanceof CjsWebgpuBuffer);
  assert.equal(cb0.access, "uniform");
  assert(t0 instanceof CjsWebgpuTexture);
  assert.equal(t0.textureKind, "2d");
  assert.equal(t0.stages.length, 2);
  assert(s0 instanceof CjsWebgpuSampler);

  assert.throws(() =>
  {
    pkg.pipelines.push("nope");
  }, /read only|object is not extensible|Cannot add property/i);
});

test("binding keys preserve distinct D3D register spaces", () =>
{
  const bindings = [ 0, 2 ].map((registerSpace) => ({
    kind: "resource",
    generatedSymbol: "t0",
    registerIndex: 0,
    registerSpace,
    metadataName: "Texture0",
    carbon: { name: "Texture0", type: 2, arrayElements: 1 }
  }));
  const pkg = CjsWebgpuPackage.from({
    format: "Carbon WebGPU",
    version: 1,
    stages: [ {
      key: "Main.pass0.pixel",
      techniqueName: "Main",
      passIndex: 0,
      stageName: "pixel",
      stageType: 1,
      bindings
    } ]
  });

  const merged = pkg.bindGroups[0].bindings;
  assert.equal(merged.length, 2);
  assert.deepEqual(merged.map((entry) => entry.key), [
    "resource:t0:Texture0:0:space0",
    "resource:t0:Texture0:0:space2"
  ]);
});

test("CJS_WGSL_SET code records retain entry points and DXBC source maps", () =>
{
  const code = "@fragment fn translated() -> @location(0) vec4f { return vec4f(1); }";
  const sourceMap = [ { line: 1, instructionIndex: 4, dxbcOffset: 12 } ];
  const pkg = CjsWebgpuPackage.from({
    format: "Carbon WebGPU",
    version: 1,
    stages: [ {
      key: "Main.pass0.pixel",
      techniqueName: "Main",
      passIndex: 0,
      stageName: "pixel",
      stageType: 1
    } ],
    shaders: [ {
      key: "Main.pass0.pixel",
      stageName: "pixel",
      entryPoint: "translated",
      code,
      sourceMap
    } ]
  });

  const module = pkg.shaderModules[0];
  assert.equal(module.wgsl, code);
  assert.equal(module.entryPoint, "translated");
  assert.deepEqual(module.sourceMap, sourceMap);
});

test("compute-only packages retain canonical compute visibility and storage layouts", () =>
{
  const code = `
@group(0) @binding(0) var<storage, read_write> values: array<u32>;
@compute @workgroup_size(1)
fn main()
{
  values[0] = values[0] + 1u;
}`;
  const pkg = CjsWebgpuPackage.from({
    format: "Carbon WebGPU",
    version: 1,
    stages: [ {
      key: "Main.pass0.compute",
      techniqueName: "Main",
      passIndex: 0,
      stageName: "compute",
      stageType: 2,
      bindings: [ {
        kind: "uav",
        generatedSymbol: "u0",
        registerIndex: 0,
        registerSpace: 0,
        metadataName: "Values"
      } ]
    } ],
    wgsl: {
      format: "CJS_WGSL_SET",
      formatVersion: 2,
      shaders: [ {
        key: "Main.pass0.compute",
        techniqueName: "Main",
        passIndex: 0,
        stageName: "compute",
        stage: "compute",
        stageType: 2,
        threadGroupSize: [ 1, 1, 1 ],
        entryPoint: "main",
        code,
        sourceMap: []
      } ],
      layouts: [ {
        key: "Main.pass0",
        techniqueName: "Main",
        passIndex: 0,
        bindGroups: [ {
          group: 0,
          bindings: [ {
            identity: "storage-resource:0:0",
            scopeIdentity: "storage-resource:0:0@compute",
            resourceKind: "storage-resource",
            generatedSymbol: "u0",
            registerSpace: 0,
            registerIndex: 0,
            group: 0,
            binding: 0,
            visibility: [ "compute" ],
            type: "array<u32>",
            buffer: { type: "storage", hasDynamicOffset: false, minBindingSize: 4 }
          } ]
        } ]
      } ]
    }
  });

  const pipeline = pkg.GetPipeline("Main", 0);
  assert.equal(pipeline.HasCompleteWgsl(), true);
  assert.equal(pipeline.shaderModules.length, 1);
  assert.equal(pipeline.GetShaderModule("compute").stageType, 2);
  assert.deepEqual(pipeline.GetShaderModule("compute").threadGroupSize, [ 1, 1, 1 ]);
  const binding = pipeline.bindGroups[0].GetBindingAt(0);
  assert(binding instanceof CjsWebgpuBuffer);
  assert.equal(binding.access, "readWrite");
  assert.equal(binding.scopeIdentity, "storage-resource:0:0@compute");
  assert.deepEqual(binding.visibility, [ "compute" ]);
  assert.deepEqual(binding.stages.map((entry) => entry.stageName), [ "compute" ]);
});

test("package shader matching rejects contradictory keyed stage provenance", () =>
{
  const value = {
    stages: [ {
      key: "Main.pass0.compute",
      techniqueName: "Main",
      passIndex: 0,
      stageName: "compute",
      stageType: 2
    } ],
    shaders: [ {
      key: "Main.pass0.compute",
      techniqueName: "Main",
      passIndex: 0,
      stageName: "pixel",
      stage: "fragment",
      stageType: 1,
      code: "@fragment fn main() -> @location(0) vec4f { return vec4f(); }"
    } ]
  };
  assert.throws(
    () => CjsWebgpuPackage.from(value),
    /inconsistent WGSL provenance/u
  );

  value.shaders[0].stageName = "compute";
  assert.throws(
    () => CjsWebgpuPackage.from(value),
    /inconsistent WGSL stage fragment/u
  );

  value.shaders[0].stage = "compute";
  value.shaders[0].stageType = 2;
  value.shaders[0].threadGroupSize = [ 1, 1, 1 ];
  value.stages[0].threadGroupSize = { x: 1, y: 1, z: 1 };
  assert.deepEqual(
    CjsWebgpuPackage.from(value).GetShaderModule("Main.pass0.compute").threadGroupSize,
    [ 1, 1, 1 ]
  );

  value.stages[0].threadGroupSize = { x: 2, y: 1, z: 1 };
  assert.throws(
    () => CjsWebgpuPackage.from(value),
    /inconsistent threadGroupSize metadata/u
  );

  value.stages[0].stageName = "pixel";
  value.stages[0].stageType = 1;
  value.shaders[0].stageName = "pixel";
  value.shaders[0].stage = "fragment";
  value.shaders[0].stageType = 1;
  assert.throws(
    () => CjsWebgpuPackage.from(value),
    /cannot declare threadGroupSize/u
  );
});

test("render packages normalize only the inactive zero thread-group sentinel", () =>
{
  const value = {
    stages: [ {
      key: "Main.pass0.vertex",
      techniqueName: "Main",
      passIndex: 0,
      stageName: "vertex",
      stageType: 0,
      threadGroupSize: { x: 0, y: 0, z: 0 }
    } ],
    shaders: [ {
      key: "Main.pass0.vertex",
      techniqueName: "Main",
      passIndex: 0,
      stageName: "vertex",
      stage: "vertex",
      stageType: 0,
      threadGroupSize: { x: 0, y: 0, z: 0 },
      entryPoint: "main",
      code: "@vertex fn main() -> @builtin(position) vec4f { return vec4f(); }"
    } ]
  };
  assert.equal(
    CjsWebgpuPackage.from(value).GetShaderModule("Main.pass0.vertex").threadGroupSize,
    null
  );

  value.shaders[0].threadGroupSize = { x: 1, y: 1, z: 1 };
  assert.throws(
    () => CjsWebgpuPackage.from(value),
    /cannot declare threadGroupSize/u
  );

  value.shaders[0].threadGroupSize = { x: 0, y: 0, z: 0 };
  value.stages[0].threadGroupSize = { x: 1, y: 1, z: 1 };
  assert.throws(
    () => CjsWebgpuPackage.from(value),
    /cannot declare threadGroupSize/u
  );
});

test("structured WGSL package input accepts only set versions 1, 2 and 3", () =>
{
  for (const formatVersion of [ 1, 2, 3 ])
  {
    const pkg = CjsWebgpuPackage.from({
      wgsl: { format: "CJS_WGSL_SET", formatVersion, shaders: [], layouts: [] }
    });
    assert.equal(pkg.wgsl.formatVersion, formatVersion);
  }
  assert.throws(() => CjsWebgpuPackage.from({
    wgsl: { format: "CJS_WGSL_SET", formatVersion: 4, shaders: [], layouts: [] }
  }), /CJS_WGSL_SET version 1, 2 or 3/u);
  const version2Binding = {
    identity: "sampler:0:0",
    scopeIdentity: "sampler:0:0@fragment",
    resourceKind: "sampler",
    generatedSymbol: "s0",
    registerSpace: 0,
    registerIndex: 0,
    group: 0,
    binding: 0,
    visibility: [ "fragment" ],
    type: "sampler",
    sampler: { type: "filtering" }
  };
  const version2Package = (binding) => ({
    wgsl: { format: "CJS_WGSL_SET", formatVersion: 2, shaders: [], layouts: [ {
      key: "Main.pass0",
      bindGroups: [ { group: 0, bindings: [ binding ] } ]
    } ] },
    stages: [ {
      key: "Main.pass0.pixel",
      techniqueName: "Main",
      passIndex: 0,
      stageName: "pixel",
      stageType: 1,
      bindings: []
    } ]
  });
  assert.throws(() => CjsWebgpuPackage.from(version2Package({
    ...version2Binding,
    scopeIdentity: ""
  })), /invalid scope identity/u);
  const missingIdentity = { ...version2Binding };
  delete missingIdentity.identity;
  assert.throws(() => CjsWebgpuPackage.from(version2Package(missingIdentity)), /requires an explicit D3D identity/u);
  const missingScope = { ...version2Binding };
  delete missingScope.scopeIdentity;
  assert.throws(() => CjsWebgpuPackage.from(version2Package(missingScope)), /requires an explicit scope identity/u);
  assert.throws(() => CjsWebgpuPackage.from(version2Package({
    ...version2Binding,
    scopeIdentity: "sampler:0:0"
  })), /does not cover multiple stages/u);
  const shared = CjsWebgpuPackage.from(version2Package({
    ...version2Binding,
    scopeIdentity: "sampler:0:0",
    visibility: [ "vertex", "fragment" ]
  }));
  assert.equal(shared.pipelines[0].bindGroups[0].bindings[0].scopeIdentity, "sampler:0:0");

  const authoritative = version2Package(version2Binding);
  authoritative.layouts = [ {
    key: "Main.pass0",
    bindGroups: [ { group: 0, bindings: [ { ...version2Binding, scopeIdentity: "" } ] } ]
  } ];
  assert.equal(
    CjsWebgpuPackage.from(authoritative).pipelines[0].bindGroups[0].bindings[0].scopeIdentity,
    "sampler:0:0@fragment"
  );

  const malformedNestedLayouts = version2Package(version2Binding);
  malformedNestedLayouts.wgsl.layouts = { invalid: true };
  malformedNestedLayouts.layouts = authoritative.wgsl.layouts;
  assert.throws(
    () => CjsWebgpuPackage.from(malformedNestedLayouts),
    /structured wgsl shaders and layouts must be arrays when provided/u
  );

  const malformedNestedShaders = version2Package(version2Binding);
  malformedNestedShaders.wgsl.shaders = { invalid: true };
  malformedNestedShaders.shaders = [];
  assert.throws(
    () => CjsWebgpuPackage.from(malformedNestedShaders),
    /structured wgsl shaders and layouts must be arrays when provided/u
  );

  const legacyBinding = { ...version2Binding };
  delete legacyBinding.identity;
  delete legacyBinding.scopeIdentity;
  const legacy = version2Package(legacyBinding);
  legacy.wgsl.formatVersion = 1;
  assert.equal(CjsWebgpuPackage.from(legacy).pipelines[0].bindGroups[0].bindings[0].scopeIdentity, "sampler:0:0");
});

test("version 3 WGSL sets keep version 2 identity strictness and bound transform metadata", () =>
{
  const binding = {
    identity: "sampler:0:0",
    scopeIdentity: "sampler:0:0@fragment",
    resourceKind: "sampler",
    generatedSymbol: "s0",
    registerSpace: 0,
    registerIndex: 0,
    group: 0,
    binding: 0,
    visibility: [ "fragment" ],
    type: "sampler",
    sampler: { type: "filtering" }
  };
  const version3Package = (entry, wgslExtras = {}) => ({
    wgsl: {
      format: "CJS_WGSL_SET",
      formatVersion: 3,
      shaders: [],
      layouts: [ { key: "Main.pass0", bindGroups: [ { group: 0, bindings: [ entry ] } ] } ],
      ...wgslExtras
    },
    stages: [ {
      key: "Main.pass0.pixel",
      techniqueName: "Main",
      passIndex: 0,
      stageName: "pixel",
      stageType: 1,
      bindings: []
    } ]
  });

  assert.equal(
    CjsWebgpuPackage.from(version3Package(binding)).pipelines[0].bindGroups[0].bindings[0].scopeIdentity,
    "sampler:0:0@fragment"
  );

  const missingIdentity = { ...binding };
  delete missingIdentity.identity;
  assert.throws(
    () => CjsWebgpuPackage.from(version3Package(missingIdentity)),
    /version 3 binding sampler:0:0 requires an explicit D3D identity/u
  );

  const missingScope = { ...binding };
  delete missingScope.scopeIdentity;
  assert.throws(
    () => CjsWebgpuPackage.from(version3Package(missingScope)),
    /version 3 binding sampler:0:0 requires an explicit scope identity/u
  );

  assert.throws(
    () => CjsWebgpuPackage.from(version3Package({ ...binding, scopeIdentity: "sampler:0:0" })),
    /does not cover multiple stages/u
  );

  // Fail closed on the feature, never the version: a source-declared
  // texture_2d_array carries no transform metadata and stays realizable.
  const arrayBinding = {
    ...binding,
    identity: "sampled-resource:0:13",
    scopeIdentity: "sampled-resource:0:13@fragment",
    resourceKind: "sampled-resource",
    generatedSymbol: "t13",
    registerIndex: 13,
    binding: 1,
    type: "texture_2d_array<f32>",
    texture: { sampleType: "float", viewDimension: "2d-array" }
  };
  delete arrayBinding.sampler;
  assert.equal(
    CjsWebgpuPackage.from(version3Package(arrayBinding)).pipelines[0].bindGroups[0].bindings[0].identity,
    "sampled-resource:0:13"
  );

  // A binding cannot claim a transform the document never declared, and array
  // layers are only meaningful as part of one.
  assert.throws(
    () => CjsWebgpuPackage.from(version3Package({ ...arrayBinding, transformId: "detail-0" })),
    /claims undeclared resource transform detail-0/u
  );
  assert.throws(
    () => CjsWebgpuPackage.from(version3Package({ ...arrayBinding, arrayLayerCount: 2 })),
    /declares 2 array layers without a resource transform/u
  );

  // A null placeholder is absence, not a transform.
  assert.equal(
    CjsWebgpuPackage.from(version3Package({ ...arrayBinding, transformId: null, arrayLayerCount: null }))
      .pipelines[0].bindGroups[0].bindings[0].identity,
    "sampled-resource:0:13"
  );
});

test("resource transforms realize only in the exact shape the engine can assemble", () =>
{
  const carrier = {
    identity: "sampled-resource:0:12",
    scopeIdentity: "sampled-resource:0:12@fragment",
    resourceKind: "sampled-resource",
    generatedSymbol: "t12",
    registerSpace: 0,
    registerIndex: 12,
    group: 0,
    binding: 18,
    visibility: [ "fragment" ],
    type: "texture_2d_array<f32>",
    texture: { sampleType: "float", viewDimension: "2d-array", multisampled: false },
    transformId: "Main.pass0:detail-map-array:sampled-resource:0:12",
    arrayLayerCount: 2
  };
  const transform = () => ({
    id: "Main.pass0:detail-map-array:sampled-resource:0:12",
    version: 1,
    kind: "texture-2d-array",
    layoutKey: "Main.pass0",
    stage: "fragment",
    inputs: [
      {
        parameter: "Detail1Map",
        layer: 0,
        identity: "sampled-resource:0:12",
        scopeIdentity: "sampled-resource:0:12@fragment"
      },
      {
        parameter: "Detail2Map",
        layer: 1,
        identity: "sampled-resource:0:13",
        scopeIdentity: "sampled-resource:0:13@fragment"
      }
    ],
    output: {
      name: "DetailMapArray",
      identity: "sampled-resource:0:12",
      scopeIdentity: "sampled-resource:0:12@fragment",
      viewDimension: "2d-array",
      layerCount: 2
    },
    representation: "native-or-rgba8",
    missingLayer: "reject"
  });
  const build = (mutate = (value) => value, extraBindings = []) =>
  {
    const declared = mutate(transform());
    return CjsWebgpuPackage.from({
      wgsl: {
        format: "CJS_WGSL_SET",
        formatVersion: 3,
        shaders: [],
        layouts: [ {
          key: "Main.pass0",
          bindGroups: [ { group: 0, bindings: [ carrier, ...extraBindings ] } ]
        } ],
        resourceTransforms: declared === null ? [] : [ declared ]
      },
      stages: [ {
        key: "Main.pass0.pixel",
        techniqueName: "Main",
        passIndex: 0,
        stageName: "pixel",
        stageType: 1,
        bindings: []
      } ]
    });
  };

  const pipeline = build().pipelines[0];
  assert.equal(pipeline.resourceTransforms.length, 1);

  // The carrier occupies its layer-0 input's register slot, so Carbon metadata
  // looked up by register names the first source rather than the array. The
  // transform owns the output name, and the binding must take it from there.
  const carrierBinding = build().bindGroups[0].bindings
    .find((entry) => entry.transformId);
  assert.equal(carrierBinding.name, "DetailMapArray");
  assert.equal(carrierBinding.arrayLayerCount, 2);

  const realized = pipeline.resourceTransforms[0];
  assert.equal(realized.output.scopeIdentity, "sampled-resource:0:12@fragment");
  assert.equal(realized.output.layerCount, 2);
  assert.equal(realized.group, 0);
  assert.equal(realized.binding, 18);
  assert.deepEqual(
    realized.inputs.map((entry) => [ entry.layer, entry.parameter ]),
    [ [ 0, "Detail1Map" ], [ 1, "Detail2Map" ] ]
  );
  // The pipeline answers which bindings need assembly and which do not.
  assert.equal(
    pipeline.GetResourceTransform("sampled-resource:0:12@fragment"),
    realized
  );
  assert.equal(pipeline.GetResourceTransform("sampled-resource:0:1@fragment"), null);

  // Anything outside the supported shape throws: guessing would emit WGSL the
  // device accepts and pixels that are quietly wrong.
  const rejects = [
    [ (t) => ({ ...t, kind: "texture-3d" }), /kind texture-3d is not supported/u ],
    [ (t) => ({ ...t, version: 2 }), /version 2 is not supported/u ],
    [ (t) => ({ ...t, representation: "rgba8-only" }), /representation rgba8-only is not supported/u ],
    [ (t) => ({ ...t, missingLayer: "black" }), /missingLayer policy black is not supported/u ],
    [ (t) => ({ ...t, stage: "geometry" }), /stage geometry is not a known shader stage/u ],
    [ (t) => ({ ...t, layoutKey: "Depth.pass0" }), /names layout Depth\.pass0, which the package does not contain/u ],
    [
      (t) => ({ ...t, output: { ...t.output, layerCount: 3 } }),
      /output layerCount 3 does not match its 2 inputs/u
    ],
    [
      (t) => ({ ...t, inputs: [ { ...t.inputs[0] }, { ...t.inputs[1], layer: 0 } ] }),
      /declares layer 0 more than once/u
    ],
    [
      (t) => ({
        ...t,
        inputs: [ { ...t.inputs[0], layer: 1 }, { ...t.inputs[1], layer: 1 } ]
      }),
      /declares layer 1 more than once/u
    ],
    [
      (t) => ({
        ...t,
        output: { ...t.output, scopeIdentity: "sampled-resource:0:13@fragment" }
      }),
      /must occupy its layer 0 input slot/u
    ]
  ];
  for (const [ mutate, pattern ] of rejects)
  {
    assert.throws(() => build(mutate), pattern);
  }

  // A layer index outside the range cannot be placed at all.
  assert.throws(
    () => build((t) => ({ ...t, inputs: [ { ...t.inputs[0] }, { ...t.inputs[1], layer: 5 } ] })),
    /layer 5 is outside 0\.\.1/u
  );

  // A merged-away input that survived in the layout would still be bindable and
  // would silently receive a texture the shader never reads.
  const survivor = {
    ...carrier,
    identity: "sampled-resource:0:13",
    scopeIdentity: "sampled-resource:0:13@fragment",
    generatedSymbol: "t13",
    registerIndex: 13,
    binding: 19,
    type: "texture_2d<f32>",
    texture: { sampleType: "float", viewDimension: "2d", multisampled: false }
  };
  delete survivor.transformId;
  delete survivor.arrayLayerCount;
  assert.throws(
    () => build(undefined, [ survivor ]),
    /but sampled-resource:0:13@fragment is still bound in Main\.pass0/u
  );

  // The carrier and the transform must agree about the merge.
  assert.throws(
    () => build((t) => ({ ...t, output: { ...t.output, layerCount: 2 }, inputs: t.inputs.slice(0, 1) })),
    /output layerCount 2 does not match its 1 inputs/u
  );
  assert.throws(
    () => CjsWebgpuPackage.from({
      wgsl: {
        format: "CJS_WGSL_SET",
        formatVersion: 3,
        shaders: [],
        layouts: [ {
          key: "Main.pass0",
          bindGroups: [ { group: 0, bindings: [ { ...carrier, arrayLayerCount: 3 } ] } ]
        } ],
        resourceTransforms: [ transform() ]
      },
      stages: []
    }),
    /carrier declares 3 layers but the transform merges 2/u
  );

  assert.throws(
    () => CjsWebgpuPackage.from({
      wgsl: {
        format: "CJS_WGSL_SET",
        formatVersion: 3,
        shaders: [],
        layouts: [ { key: "Main.pass0", bindGroups: [ { group: 0, bindings: [] } ] } ],
        resourceTransforms: [ transform() ]
      },
      stages: []
    }),
    /must be carried by exactly one binding in Main\.pass0, found 0/u
  );

  assert.throws(
    () => CjsWebgpuPackage.from({
      wgsl: {
        format: "CJS_WGSL_SET",
        formatVersion: 3,
        shaders: [],
        layouts: [ { key: "Main.pass0", bindGroups: [ { group: 0, bindings: [ carrier ] } ] } ],
        resourceTransforms: [ transform(), transform() ]
      },
      stages: []
    }),
    /is declared more than once/u
  );

  assert.throws(
    () => CjsWebgpuPackage.from({
      wgsl: {
        format: "CJS_WGSL_SET",
        formatVersion: 3,
        shaders: [],
        layouts: [],
        resourceTransforms: {}
      },
      stages: []
    }),
    /resourceTransforms must be an array when present/u
  );
});

test("canonical WGSL layouts own numeric bind groups and survive missing ANLS metadata", () =>
{
  const canonicalBindings = [ {
    resourceKind: "uniform-buffer",
    generatedSymbol: "cb0",
    registerSpace: 0,
    registerIndex: 0,
    group: 0,
    binding: 0,
    visibility: [ "fragment" ],
    type: "array<vec4<f32>, 3>",
    buffer: { type: "uniform", hasDynamicOffset: false, minBindingSize: 48 }
  }, {
    resourceKind: "sampled-resource",
    generatedSymbol: "t0",
    registerSpace: 0,
    registerIndex: 0,
    group: 0,
    binding: 1,
    visibility: [ "fragment" ],
    type: "texture_2d<f32>",
    texture: { sampleType: "float", viewDimension: "2d", multisampled: false }
  }, {
    resourceKind: "sampler",
    generatedSymbol: "s0",
    registerSpace: 0,
    registerIndex: 0,
    group: 0,
    binding: 2,
    visibility: [ "fragment" ],
    type: "sampler",
    sampler: { type: "filtering" }
  } ];
  const pkg = CjsWebgpuPackage.from({
    format: "Carbon WebGPU",
    version: 1,
    stages: [ {
      key: "Main.pass0.pixel",
      techniqueName: "Main",
      passIndex: 0,
      stageName: "pixel",
      stageType: 1,
      bindings: [ {
        kind: "constantBuffer",
        generatedSymbol: "cb0",
        registerIndex: 0,
        registerSpace: 0,
        metadataName: "$LocalConstants",
        carbon: { constantValueSize: 48 }
      }, {
        kind: "resource",
        generatedSymbol: "t0",
        registerIndex: 0,
        registerSpace: 0,
        metadataName: "Texture0",
        carbon: { type: 2, arrayElements: 1 }
      } ]
    } ],
    layouts: [ {
      key: "Main.pass0",
      bindGroups: [ { group: 0, bindings: canonicalBindings } ]
    } ]
  });

  const group = pkg.pipelines[0].bindGroups[0];
  assert.equal(group.group, 0);
  assert.equal(group.bindings.length, 3);
  assert(group.GetBindingAt(0) instanceof CjsWebgpuBuffer);
  assert(group.GetBindingAt(1) instanceof CjsWebgpuTexture);
  assert(group.GetBindingAt(2) instanceof CjsWebgpuSampler);
  assert.equal(group.GetBindingAt(0).layout.buffer.minBindingSize, 48);
  assert.equal(group.GetBindingAt(0).metadataName, "$LocalConstants");
  assert.equal(group.GetBindingAt(2).sourceTruth, "wgsl-layout");
  assert.deepEqual(group.GetBindingAt(2).visibility, [ "fragment" ]);
  assert.deepEqual(group.GetBindingAt(2).stages, [ {
    key: "Main.pass0.pixel",
    stageName: "pixel",
    stageType: 1
  } ]);

  const collision = structuredClone(canonicalBindings);
  collision[2].binding = 1;
  assert.throws(() => CjsWebgpuPackage.from({
    stages: pkg.ToJSON().stages,
    layouts: [ { key: "Main.pass0", bindGroups: [ { group: 0, bindings: collision } ] } ]
  }), /duplicates group\/binding 0:1/i);
});

test("canonical WGSL layouts preserve stage-scoped structured and texture t0 resources", () =>
{
  const stages = [ {
    key: "Main.pass0.vertex",
    techniqueName: "Main",
    passIndex: 0,
    stageName: "vertex",
    stageType: 0,
    bindings: [ {
      kind: "resource",
      generatedSymbol: "t0",
      registerIndex: 0,
      registerSpace: 0,
      metadataName: "SkinningData",
      carbon: { type: 7, arrayElements: 1 }
    } ]
  }, {
    key: "Main.pass0.pixel",
    techniqueName: "Main",
    passIndex: 0,
    stageName: "pixel",
    stageType: 1,
    bindings: [ {
      kind: "resource",
      generatedSymbol: "t0",
      registerIndex: 0,
      registerSpace: 0,
      metadataName: "AlbedoMap",
      carbon: { type: 2, arrayElements: 1, isSRGB: true }
    } ]
  } ];
  const bindings = [ {
    identity: "sampled-resource:0:0",
    scopeIdentity: "sampled-resource:0:0@vertex",
    resourceKind: "sampled-resource",
    generatedSymbol: "t0",
    registerSpace: 0,
    registerIndex: 0,
    group: 0,
    binding: 0,
    visibility: [ "vertex" ],
    type: "array<u32>",
    structureStride: 48,
    buffer: { type: "read-only-storage", hasDynamicOffset: false, minBindingSize: 48 }
  }, {
    identity: "sampled-resource:0:0",
    scopeIdentity: "sampled-resource:0:0@fragment",
    resourceKind: "sampled-resource",
    generatedSymbol: "t0",
    registerSpace: 0,
    registerIndex: 0,
    group: 0,
    binding: 1,
    visibility: [ "fragment" ],
    type: "texture_2d<f32>",
    texture: { sampleType: "float", viewDimension: "2d", multisampled: false }
  } ];
  const pkg = CjsWebgpuPackage.from({
    format: "Carbon WebGPU",
    version: 1,
    stages,
    layouts: [ {
      key: "Main.pass0",
      bindGroups: [ { group: 0, bindings } ]
    } ]
  });
  const group = pkg.pipelines[0].bindGroups[0];
  const structured = group.GetBindingAt(0);
  const texture = group.GetBindingAt(1);

  assert(structured instanceof CjsWebgpuBuffer);
  assert.equal(structured.access, "readOnly");
  assert.equal(structured.bufferKind, "structuredBuffer");
  assert.equal(structured.identity, "sampled-resource:0:0");
  assert.equal(structured.scopeIdentity, "sampled-resource:0:0@vertex");
  assert.equal(structured.structureStride, 48);
  assert.equal(structured.metadataName, "SkinningData");
  assert.deepEqual(structured.stages.map((entry) => entry.stageName), [ "vertex" ]);
  assert(texture instanceof CjsWebgpuTexture);
  assert.equal(texture.scopeIdentity, "sampled-resource:0:0@fragment");
  assert.equal(texture.metadataName, "AlbedoMap");
  assert.deepEqual(texture.stages.map((entry) => entry.stageName), [ "pixel" ]);
  assert.deepEqual(pkg.ToJSON().pipelines[0].bindGroups[0].bindings.map((entry) => entry.scopeIdentity), [
    "sampled-resource:0:0@vertex",
    "sampled-resource:0:0@fragment"
  ]);

  const inconsistent = structuredClone(bindings);
  inconsistent[0].identity = "sampled-resource:0:9";
  assert.throws(() => CjsWebgpuPackage.from({
    stages,
    layouts: [ { key: "Main.pass0", bindGroups: [ { group: 0, bindings: inconsistent } ] } ]
  }), /inconsistent D3D identity/u);

  const malformedScope = structuredClone(bindings);
  malformedScope[0].scopeIdentity = "sampled-resource:0:0@fragment";
  assert.throws(() => CjsWebgpuPackage.from({
    stages,
    layouts: [ { key: "Main.pass0", bindGroups: [ { group: 0, bindings: malformedScope } ] } ]
  }), /invalid scope identity/u);

  const mixedForms = structuredClone(bindings);
  mixedForms[0].scopeIdentity = "sampled-resource:0:0";
  mixedForms[0].visibility = [ "vertex", "fragment" ];
  assert.throws(() => CjsWebgpuPackage.from({
    stages,
    layouts: [ { key: "Main.pass0", bindGroups: [ { group: 0, bindings: mixedForms } ] } ]
  }), /mixes shared and stage-scoped forms/u);
});

test("CjsWebgpuPackage.fromBytes accepts an injected reader", () =>
{
  const pkg = CjsWebgpuPackage.fromBytes(new Uint8Array([ 1, 2, 3 ]), {
    read(bytes)
    {
      assert.equal(bytes.length, 3);
      return {
        format: "Carbon WebGPU",
        version: 1,
        stages: [],
        shaders: []
      };
    }
  });

  assert.equal(pkg.version, 1);
  assert.deepEqual(pkg.ToJSON().pipelines, []);
});

function copyblitDrawPipeline()
{
  const layoutBindings = [ {
    resourceKind: "uniform-buffer", generatedSymbol: "cb0", registerSpace: 0, registerIndex: 0,
    group: 0, binding: 0, visibility: [ "fragment" ], type: "array<vec4<f32>, 3>",
    buffer: { type: "uniform", hasDynamicOffset: false, minBindingSize: 48 }
  }, {
    resourceKind: "sampled-resource", generatedSymbol: "t0", registerSpace: 0, registerIndex: 0,
    group: 0, binding: 1, visibility: [ "fragment" ], type: "texture_2d<f32>",
    texture: { sampleType: "float", viewDimension: "2d", multisampled: false }
  }, {
    resourceKind: "sampler", generatedSymbol: "s0", registerSpace: 0, registerIndex: 0,
    group: 0, binding: 2, visibility: [ "fragment" ], type: "sampler",
    sampler: { type: "filtering" }
  } ];
  const pkg = CjsWebgpuPackage.from({
    stages: [
      { key: "Main.pass0.vertex", techniqueName: "Main", passIndex: 0, stageName: "vertex", stageType: 0 },
      { key: "Main.pass0.pixel", techniqueName: "Main", passIndex: 0, stageName: "pixel", stageType: 1 }
    ],
    shaders: [
      { key: "Main.pass0.vertex", entryPoint: "vs", code: "@vertex fn vs() -> @builtin(position) vec4f { return vec4f(); }", sourceMap: [] },
      { key: "Main.pass0.pixel", entryPoint: "ps", code: "@fragment fn ps() -> @location(0) vec4f { return vec4f(1); }", sourceMap: [] }
    ],
    layouts: [ { key: "Main.pass0", bindGroups: [ { group: 0, bindings: layoutBindings } ] } ]
  });
  return pkg.GetPipeline("Main", 0).ToJSON();
}

test("package copyblit draw preserves canonical numeric layouts and rejects unsupported resources", () =>
{
  const pipeline = copyblitDrawPipeline();
  const descriptor = buildCopyblitDrawDescriptor(pipeline);
  assert.equal(Object.isFrozen(descriptor), true);
  assert.deepEqual(descriptor.shaders.map((entry) => [ entry.stage, entry.entryPoint ]), [
    [ "vertex", "vs" ],
    [ "fragment", "ps" ]
  ]);
  assert.deepEqual(descriptor.bindGroups[0].bindings.map((entry) => [ entry.identity, entry.binding ]), [
    [ "uniform-buffer:0:0", 0 ],
    [ "sampled-resource:0:0", 1 ],
    [ "sampler:0:0", 2 ]
  ]);

  const translatedState = structuredClone(pipeline);
  translatedState.renderStates = 1;
  translatedState.states = [
    { state: 19, value: 2 }, { state: 20, value: 1 }, { state: 27, value: 1 }, { state: 171, value: 1 },
    { state: 206, value: 1 }, { state: 207, value: 2 }, { state: 208, value: 1 }, { state: 209, value: 1 }
  ];
  assert.deepEqual(buildCopyblitDrawDescriptor(translatedState).blend, {
    color: { operation: "add", srcFactor: "one", dstFactor: "zero" },
    alpha: { operation: "add", srcFactor: "one", dstFactor: "zero" }
  });
  translatedState.states[0].value = 5;
  assert.throws(() => buildCopyblitDrawDescriptor(translatedState), /unsupported render state 19:5/i);

  const missingSampler = structuredClone(pipeline);
  missingSampler.bindGroups[0].bindings.pop();
  assert.throws(() => buildCopyblitDrawDescriptor(missingSampler), /missing fixture identity sampler:0:0/i);

  const dynamicUniform = structuredClone(pipeline);
  dynamicUniform.bindGroups[0].bindings[0].dynamic = true;
  assert.throws(() => buildCopyblitDrawDescriptor(dynamicUniform), /cannot use dynamic offsets/i);
});

test("read-write storage UAV bindings build readWrite buffers", () => {
  const pkg = CjsWebgpuPackage.from({
    format: "Carbon WebGPU",
    version: 1,
    stages: [ {
      key: "Main.pass0.pixel",
      techniqueName: "Main",
      passIndex: 0,
      stageName: "pixel",
      stageType: 1,
      bindings: [ {
        kind: "resource",
        generatedSymbol: "u1",
        registerIndex: 1,
        registerSpace: 0,
        metadataName: "OccluderCounters"
      } ]
    } ],
    layouts: [ {
      key: "Main.pass0",
      bindGroups: [ { group: 0, bindings: [ {
        identity: "storage-resource:0:1",
        scopeIdentity: "storage-resource:0:1@fragment",
        resourceKind: "storage-resource",
        generatedSymbol: "u1",
        registerSpace: 0,
        registerIndex: 1,
        group: 0,
        binding: 0,
        visibility: [ "fragment" ],
        type: "array<atomic<u32>>",
        buffer: { type: "storage", hasDynamicOffset: false, minBindingSize: 4 }
      } ] } ]
    } ]
  });
  const uav = pkg.pipelines[0].bindGroups[0].GetBindingAt(0);
  assert(uav instanceof CjsWebgpuBuffer);
  assert.equal(uav.access, "readWrite");
  assert.equal(uav.bufferKind, "rwBuffer");
  assert.equal(uav.scopeIdentity, "storage-resource:0:1@fragment");
  assert.deepEqual(uav.layout.buffer, { type: "storage", hasDynamicOffset: false, minBindingSize: 4 });
});
