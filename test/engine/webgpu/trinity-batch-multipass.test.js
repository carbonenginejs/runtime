// Carbon resolves the shader program, render states and material data PER PASS
// (Tr2RenderContext.cpp:472-535), and draws a group pass-major: every batch
// draws pass 0, then every batch draws pass 1. Encoding batch-major would
// interleave a two-pass effect between objects and change what lands on screen.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CjsTrinityBatchResolver,
  Tr2PerObjectData,
  Tr2RenderBatch
} from "../../../npm/dist/trinity/index.js";
import { CjsWebgpuDevice } from "../../../npm/dist/engine/webgpu/index.js";
import { CjsWebgpuTrinityBatchDispatcher } from "../../../npm/dist/engine/webgpu/internal.js";
import { FixtureEffect } from "../../support/fixtureEffect.js";

const SHADER_STAGE = Object.freeze({ VERTEX: 1, FRAGMENT: 2, COMPUTE: 4 });

/** A material that reports a technique with `passCount` passes, as Carbon's does. */
function materialWithPasses(passCount, techniqueName = "Main")
{
  return {
    id: "material",
    GetShaderStateInterface: () => ({
      GetTechniqueIndex: name => (name === techniqueName ? 0 : -1),
      GetPassCount: () => passCount
    })
  };
}

function batchWith(material)
{
  const batch = new Tr2RenderBatch();
  batch.SetMaterial(FixtureEffect(material));
  batch.SetGeometrySource({ id: "geometry" }, 0, 0, 1, false);
  batch.SetPerObjectData(new Tr2PerObjectData());
  batch.SetDrawIndexedInstanced(6, 1, 0, 0, 0);
  return batch;
}

class PassResolver extends CjsTrinityBatchResolver
{
  constructor() { super(); this.seen = []; }

  async ResolveMaterial(material, batch, context)
  {
    this.seen.push([ "material", context.passIndex ]);
    return {
      pipeline: { key: `Main.pass${context.passIndex}` },
      recipe: { fragment: { targets: [ { format: "rgba8unorm" } ] } }
    };
  }

  async ResolveGeometry(source, batch, context)
  {
    this.seen.push([ "geometry", context.passIndex ]);
    return { geometry: { id: "live" }, indexed: true };
  }

  async ResolveBindings(batch, objectData, context)
  {
    this.seen.push([ "bindings", context.passIndex ]);
    return { uniformData: new Map(), resources: new Map() };
  }
}

/** A device that records encode order and nothing else. */
class MockDevice extends CjsWebgpuDevice
{
  constructor()
  {
    super({ device: { createShaderModule() {} }, shaderStage: SHADER_STAGE });
    this.encoded = [];
  }

  async PreparePipeline(pipeline) { return { pipeline, identity: pipeline.key }; }

  async CreateRenderPipeline(prepared) { return { prepared }; }

  CreateBindingSet() { return { destroyed: 0, Destroy() { this.destroyed += 1; } }; }

  CreateDraw(livePipeline) { return { key: livePipeline.prepared.identity }; }

  EncodeDraw(pass, draw) { this.encoded.push(draw.key); }
}

const boundary = () => new MockDevice();
const dispatcherOver = (webgpu, resolver) => new CjsWebgpuTrinityBatchDispatcher(webgpu, resolver);

test("a two-pass technique prepares one pipeline and one binding set per pass", async () =>
{
  const resolver = new PassResolver();
  const webgpu = boundary();
  const dispatcher = dispatcherOver(webgpu, resolver);

  const handle = await dispatcher.Prepare(batchWith(materialWithPasses(2)));

  assert.equal(handle.passes.length, 2);
  assert.notEqual(handle.passes[0].bindingSet, handle.passes[1].bindingSet);
  assert.deepEqual(
    resolver.seen.filter(([ hook ]) => hook === "material").map(([ , pass ]) => pass),
    [ 0, 1 ],
    "the material is resolved once per pass, as Carbon calls ApplyAllStateForPass"
  );
  assert.deepEqual(
    resolver.seen.filter(([ hook ]) => hook === "bindings").map(([ , pass ]) => pass),
    [ 0, 1 ],
    "and the material data likewise"
  );
});

test("geometry is resolved once, not once per pass", async () =>
{
  // Carbon sets the vertex declaration, streams and index buffer ONCE for the
  // whole group, outside the pass loop (Tr2RenderContext.cpp:479-487).
  const resolver = new PassResolver();
  const dispatcher = dispatcherOver(boundary(), resolver);

  await dispatcher.Prepare(batchWith(materialWithPasses(3)));

  assert.equal(resolver.seen.filter(([ hook ]) => hook === "geometry").length, 1);
});

test("a single-pass material still reads as it did before passes existed", async () =>
{
  const dispatcher = dispatcherOver(boundary(), new PassResolver());
  const handle = await dispatcher.Prepare(batchWith(materialWithPasses(1)));

  assert.equal(handle.passes.length, 1);
  assert.equal(handle.draw, handle.passes[0].draw);
  assert.equal(handle.bindingSet, handle.passes[0].bindingSet);
});

test("a material that cannot report passes draws exactly one", async () =>
{
  // Carbon always holds a Tr2Material; a caller resolving its own pipeline
  // without Trinity reflection means one thing to draw.
  const dispatcher = dispatcherOver(boundary(), new PassResolver());
  const handle = await dispatcher.Prepare(batchWith({ id: "opaque-to-trinity" }));

  assert.equal(handle.passes.length, 1);
});

test("an absent technique emits nothing rather than drawing", async () =>
{
  // Carbon returns before touching the device (Tr2RenderContext.cpp:465-471).
  const dispatcher = dispatcherOver(boundary(), new PassResolver());
  const material = materialWithPasses(2, "Shadow");

  assert.equal(await dispatcher.Prepare(batchWith(material)), null);
});

test("a technique with zero passes emits nothing", async () =>
{
  const dispatcher = dispatcherOver(boundary(), new PassResolver());

  assert.equal(await dispatcher.Prepare(batchWith(materialWithPasses(0))), null);
});

test("destroying a multi-pass batch releases every pass's binding set", async () =>
{
  const dispatcher = dispatcherOver(boundary(), new PassResolver());
  const handle = await dispatcher.Prepare(batchWith(materialWithPasses(3)));

  dispatcher.Destroy(handle);

  assert.deepEqual(handle.passes.map(entry => entry.bindingSet.destroyed), [ 1, 1, 1 ]);
});

test("encoding one batch draws its passes in order", async () =>
{
  const webgpu = boundary();
  const dispatcher = dispatcherOver(webgpu, new PassResolver());
  const handle = await dispatcher.Prepare(batchWith(materialWithPasses(2)));

  dispatcher.Encode({ id: "pass" }, handle);

  assert.deepEqual(webgpu.encoded, [ "Main.pass0", "Main.pass1" ]);
});
