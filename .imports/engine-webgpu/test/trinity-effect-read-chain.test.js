// Stage 6a: prove the Trinity read chain reaches the same pipeline the fixture
// hook hands the dispatcher today, using real Trinity types rather than stand-ins.
//
// No loader exists yet - nothing anywhere writes Tr2Effect.effectResource - so the
// resource is assigned by hand. That is the honest boundary of this gate: it shows
// that once something does write it, effect -> GetEffectRes() -> package ->
// pipeline resolves to exactly what the harness resolves directly. It does not
// pretend the loader exists, and it never touches a GPU.
//
// A .carbonwebgpu file is one Carbon-v15 record container. The reader derives the
// analysis, permutation, reflection and WGSL views from that one tree; none is a
// second stored chunk, and there is one emit that carries all of them plus the
// complete backend body set.
//
// Nothing but bytes crosses the boundary. Tr2EffectRes.DoLoad takes the container
// bytes and retains its own reader, the way ccpwgl's Tw2Shader.fromCCPBinary does,
// with the engine supplying only binding. An earlier revision handed over a reader
// object and duck-typed a method off it; that is gone.
//
// The engine's own CjsWebgpuPackage is still not a valid Tr2EffectRes payload, and
// the rejection is the safe outcome rather than a property worth preserving for
// its own sake: the engine's view is a binding projection that declares no
// permutation axes, so it fails the payload check by name instead of resolving no
// shader at all.
import assert from "node:assert/strict";
import test from "node:test";

import { Tr2Effect } from "@carbonenginejs/runtime-trinity/shader";
import {
  Tr2RenderBatch,
  TriRenderBatchAccumulator,
  TriRenderBatchMap
} from "@carbonenginejs/runtime-trinity/core";
// TriBatchType is a runtime-utils graphics enum, not a Trinity one. It moved
// packages in trinity 0.11.0, alongside `trinityCore` becoming `core`.
import { TriBatchType } from "@carbonenginejs/runtime-utils/graphics";

import { CjsWebgpuPackage } from "../src/index.js";
import { CjsWebgpuTrinityBatchDispatcher } from "../src/core/trinityBatchDispatcher.js";
import { buildSelectedPackage, corpusSkipReason, manifestFixture } from "./support/effectPackages.js";

const TRIANGLE_LIST = 4;

const SKIP = corpusSkipReason();

async function readerModules()
{
  const [ shader, webgpu ] = await Promise.all([
    import("@carbonenginejs/runtime-resource/resource/shader"),
    import("@carbonenginejs/runtime-resource/formats/webgpu")
  ]);
  return { Tr2EffectRes: shader.Tr2EffectRes, CjsWebgpuFormat: webgpu.CjsWebgpuFormat };
}

function canonicalPackage()
{
  const bindings = [ {
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
  } ];
  return CjsWebgpuPackage.from({
    format: "Carbon WebGPU",
    version: 1,
    sourcePath: "res:/fixture/trinity-read-chain.carbonwebgpu",
    analysis: {
      source: "res:/fixture/trinity-read-chain.carbonwebgpu",
      passes: [ {
        techniqueName: "Main",
        passIndex: 0,
        renderStates: 1,
        states: []
      } ],
      stages: []
    },
    stages: [ {
      key: "Main.pass0.vertex",
      techniqueName: "Main",
      passIndex: 0,
      stageName: "vertex",
      stageType: 0,
      bindings: []
    }, {
      key: "Main.pass0.pixel",
      techniqueName: "Main",
      passIndex: 0,
      stageName: "pixel",
      stageType: 1,
      bindings: []
    } ],
    layouts: [ {
      key: "Main.pass0",
      bindGroups: [ { group: 0, bindings } ]
    } ]
  });
}

// The seam is Tr2Effect.RebuildCachedDataInternal, which duck-types the assigned
// resource: GetShader(options), then getShader(options), then .shader. Nothing
// requires a Tr2EffectRes class - there isn't one in runtime-trinity - so a
// package-carrying resource satisfies it directly.
function effectResourceFor(pkg)
{
  return {
    package: pkg,
    GetShader()
    {
      return pkg;
    }
  };
}

function opaqueBatchFor(effect, geometry)
{
  const batch = new Tr2RenderBatch();
  batch.material = effect;
  batch.shader = effect.shader;
  batch.SetGeometrySource(geometry, 0, 0, 1, false);
  batch.topology = TRIANGLE_LIST;
  batch.indexCountPerInstance = 36;
  batch.instanceCount = 1;
  return batch;
}

function boundary()
{
  const calls = [];
  return {
    calls,
    webgpu: {
      async PreparePipeline(pipeline, prepareOptions)
      {
        calls.push([ "PreparePipeline", pipeline, prepareOptions ]);
        return { pipeline, diagnostics: [] };
      },
      async CreateRenderPipeline(prepared, recipe)
      {
        calls.push([ "CreateRenderPipeline", prepared, recipe ]);
        return { prepared, recipe };
      },
      CreateBindingSet()
      {
        return { Destroy() {} };
      },
      CreateDraw(livePipeline, values)
      {
        return { livePipeline, values };
      },
      EncodeDraw(pass, draw)
      {
        calls.push([ "EncodeDraw", pass, draw ]);
      }
    }
  };
}

test("a real Tr2Effect resolves the package pipeline the fixture hook returns", () =>
{
  const pkg = canonicalPackage();
  const direct = pkg.GetPipeline("Main", 0);
  assert.ok(direct, "the package must expose Main.pass0");

  const effect = new Tr2Effect();
  assert.equal(effect.GetEffectRes(), null, "an effect starts with no resource");

  effect.effectResource = effectResourceFor(pkg);
  effect.RebuildCachedData();

  // The chain the loader will one day drive, walked by hand.
  const resource = effect.GetEffectRes();
  assert.ok(resource, "GetEffectRes must return the assigned resource");
  assert.equal(resource.package, pkg);
  assert.equal(effect.shader, pkg, "the duck-typed GetShader must resolve the package");

  const throughChain = effect.GetEffectRes().package.GetPipeline("Main", 0);
  assert.deepEqual(
    throughChain.ToJSON(),
    direct.ToJSON(),
    "the traversed pipeline must equal the one resolved directly from the package"
  );
});

test("a real Tr2RenderBatch carries the effect through a real accumulator", () =>
{
  const pkg = canonicalPackage();
  const effect = new Tr2Effect();
  effect.effectResource = effectResourceFor(pkg);
  effect.RebuildCachedData();

  const batch = opaqueBatchFor(effect, { id: "geometry" });
  assert.equal(batch.IsValid(), true, "a batch is valid once its shader resolves");
  assert.equal(batch.material, effect);

  const accumulator = new TriRenderBatchAccumulator();
  assert.equal(accumulator.Commit(batch), true);
  accumulator.Finalize();

  assert.equal(accumulator.GetBatchCount(), 1);
  assert.equal(accumulator.GetBatches()[0], batch, "the accumulator holds the batch itself");

  // The GDPR path needs an index buffer, and SetGeometrySource never sets one -
  // it records a geometry-resource descriptor instead. Asserted rather than
  // assumed, because a batch that silently took that path would never reach the
  // dispatcher the engine drives.
  assert.equal(batch.indexBuffer, null);
  assert.deepEqual(accumulator.GetGdprBatches(), []);

  const map = new TriRenderBatchMap([ TriBatchType.TRIBATCHTYPE_OPAQUE ]);
  assert.deepEqual(map.GetBatchTypes(), [ TriBatchType.TRIBATCHTYPE_OPAQUE ]);
  const mapped = map.GetAccumulator(TriBatchType.TRIBATCHTYPE_OPAQUE);
  assert.ok(mapped instanceof TriRenderBatchAccumulator);
  assert.equal(map.GetAccumulator(TriBatchType.TRIBATCHTYPE_TRANSPARENT), null);
});

test("the engine dispatcher reaches the package pipeline through a real batch map", async () =>
{
  const pkg = canonicalPackage();
  const expected = pkg.GetPipeline("Main", 0);

  const effect = new Tr2Effect();
  effect.effectResource = effectResourceFor(pkg);
  effect.RebuildCachedData();

  const geometry = { id: "geometry" };
  const batch = opaqueBatchFor(effect, geometry);

  // A real map and its real accumulator, driven through the engine's own
  // batch-map entry point rather than a single hand-fed batch.
  const map = new TriRenderBatchMap([ TriBatchType.TRIBATCHTYPE_OPAQUE ]);
  const accumulator = map.GetAccumulator(TriBatchType.TRIBATCHTYPE_OPAQUE);
  assert.equal(accumulator.Commit(batch), true);
  map.Finalize();

  const { calls, webgpu } = boundary();
  const resolvedMaterials = [];
  const dispatcher = new CjsWebgpuTrinityBatchDispatcher(webgpu, {
    // The same traversal the fixture hook performs today, except the material is
    // a real Tr2Effect instead of a package record.
    async ResolveMaterial(material, dispatched)
    {
      assert.equal(material, dispatched.material);
      const resolved = material.GetEffectRes().package.GetPipeline("Main", 0);
      resolvedMaterials.push(resolved);
      return {
        pipeline: resolved,
        recipe: {
          vertex: { buffers: [ { arrayStride: 16, attributes: [] } ] },
          fragment: { targets: [ { format: "rgba8unorm" } ] },
          primitive: { cullMode: "none" }
        }
      };
    },
    async ResolveGeometry(source, dispatched)
    {
      assert.equal(source, dispatched.geometrySource);
      assert.equal(source.geometry, geometry, "the geometry source survives the batch");
      return { geometry: { id: "live-geometry" }, indexed: true };
    },
    async ResolveBindings()
    {
      return { uniformData: new Map(), resources: new Map() };
    }
  });

  const handle = await dispatcher.PrepareBatchMap(map);
  dispatcher.EncodeBatchType({ id: "pass" }, handle, TriBatchType.TRIBATCHTYPE_OPAQUE);

  assert.equal(resolvedMaterials.length, 1);
  assert.equal(resolvedMaterials[0], expected, "the dispatcher resolved the package pipeline");

  const prepared = calls.find(([ name ]) => name === "PreparePipeline");
  assert.ok(prepared, "the dispatcher must prepare a pipeline");
  assert.equal(prepared[1], expected, "the prepared pipeline is the package's own Main.pass0");
  assert.deepEqual(prepared[1].ToJSON(), pkg.GetPipeline("Main", 0).ToJSON());

  assert.ok(
    calls.some(([ name ]) => name === "EncodeDraw"),
    "the batch must reach the draw encoder"
  );

  dispatcher.DestroyBatchMap(handle);
});

// The direction of travel arrived: nothing but bytes crosses the boundary.
// `Tr2EffectRes.DoLoad` takes the container bytes and retains its own reader, so
// there is no reader object to hand over and no method to duck-type off one.
test("a real Tr2EffectRes resolves a shader from real container bytes", { skip: SKIP }, async () =>
{
  const { Tr2EffectRes, CjsWebgpuFormat } = await readerModules();
  const fixture = await manifestFixture("quadv5-ppt-main");
  const { bytes, source } = await buildSelectedPackage(CjsWebgpuFormat, fixture, "dx11");

  const resource = new Tr2EffectRes();
  resource.DoLoad(bytes);

  const effect = new Tr2Effect();
  effect.effectResource = resource;
  effect.RebuildCachedData();

  assert.equal(effect.GetEffectRes(), resource);
  assert.ok(effect.shader, "the effect must resolve a shader through Tr2EffectRes");
  assert.equal(effect.shader.constructor.name, "Tr2Shader");
  assert.equal(resource.GetShader([]).constructor.name, "Tr2Shader");

  // One file, one read. The engine builds its own view from the same bytes for
  // binding; that view is a lossy derived projection, not a second artifact the
  // format requires and not something a loader has to "also produce".
  const enginePackage = CjsWebgpuPackage.fromBytes(bytes, {
    read: CjsWebgpuFormat.read,
    readOptions: { source }
  });
  const pipeline = enginePackage.GetPipeline("Main", 0);
  assert.ok(pipeline, "the engine package must expose Main.pass0");

  // Both halves of the read work off the same bytes now, and both are complete:
  // the shader resolves through Tr2EffectRes, and the engine's own view builds a
  // pipeline. Neither is a fallback for the other failing.
  assert.ok(pipeline.HasCompleteWgsl(), "the engine package's Main.pass0 must carry complete WGSL");

  // The engine's view is a projection for binding, not an effect payload. It
  // declares no permutation axes, so it is rejected - and the rejection stays
  // loud rather than resolving no shader at all, which is the failure a loader
  // is most likely to ship by accident.
  assert.throws(
    () => new Tr2EffectRes().SetPayload(enginePackage),
    /permutations array/u,
    "the engine package must not be accepted as a Tr2EffectRes payload"
  );
});
