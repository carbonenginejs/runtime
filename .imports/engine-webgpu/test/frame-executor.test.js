import assert from "node:assert/strict";
import { test } from "node:test";

import { CjsWebgpuFrameExecutor } from "../src/core/frameExecutor.js";
import { PlanFrame } from "../src/core/framePlan.js";

function segment(...intents)
{
  return { step: null, job: null, phase: "execute", intents };
}

function draw(name)
{
  return { type: "render-object", renderable: name };
}

function compute()
{
  return { type: "run-compute-shader", effect: "cs", groupDimX: 1, groupDimY: 1, groupDimZ: 1 };
}

function setup(options = {})
{
  const calls = [];
  const commandBuffer = { kind: "commandBuffer" };
  const commandEncoder = {
    finish() { calls.push([ "finish" ]); return commandBuffer; }
  };

  const webgpu = {
    GetDevice: () => ({
      createCommandEncoder(descriptor) { calls.push([ "createCommandEncoder", descriptor.label ]); return commandEncoder; }
    }),
    Submit(buffers) { calls.push([ "submit", buffers ]); }
  };

  const frame = { generation: 1, colorView: "color", resolveView: null, depthView: "depth" };
  const renderTarget = {
    AcquireFrame() { calls.push([ "acquire" ]); return frame; },
    CreateRenderPassDescriptor(acquired, descriptorOptions)
    {
      calls.push([ "descriptor", acquired === frame, descriptorOptions ]);
      return { label: descriptorOptions.label, colorAttachments: [ { view: acquired.colorView } ] };
    },
    ApplyViewport(pass, viewportOptions) { calls.push([ "viewport", viewportOptions?.viewport ?? null ]); }
  };

  const passEncoder = {
    Encode(encoder, passes)
    {
      calls.push([ "encode", passes[0].descriptor.label, passes[0].selections ]);
      passes[0].configure?.({ setViewport() {} }, 0);
      return passes[0].selections.length;
    }
  };

  const executor = new CjsWebgpuFrameExecutor(webgpu, {
    renderTarget,
    passEncoder,
    ResolveSelections: options.ResolveSelections
      ?? (() => [ { preparedBatchMap: {}, batchType: 0 } ]),
    ResolveDescriptor: options.ResolveDescriptor,
    ExecuteRegion: options.ExecuteRegion
  });

  return { calls, commandBuffer, executor, frame, renderTarget };
}

test("CjsWebgpuFrameExecutor encodes one frame into one encoder and submits once", () =>
{
  const { calls, commandBuffer, executor } = setup();
  const plan = PlanFrame([ segment(
    { type: "clear", clearColor: true, color: [ 0, 0, 0, 1 ], clearDepth: true, depth: 1 },
    draw("a"),
    { type: "set-render-target", slot: 0, renderTarget: "second" },
    draw("b")
  ) ]);

  const result = executor.ExecuteFrame(plan);

  assert.deepEqual(result, { encodedRegions: 2, encodedSelections: 2, submitted: true });
  assert.deepEqual(calls.filter(([ name ]) => name === "createCommandEncoder").length, 1, "one encoder per frame");
  assert.deepEqual(calls.at(-1), [ "submit", [ commandBuffer ] ]);
  assert.equal(calls.filter(([ name ]) => name === "acquire").length, 1, "the canvas texture is acquired once");
});

test("CjsWebgpuFrameExecutor spells the clear the planner already decided", () =>
{
  const { calls, executor } = setup();
  const plan = PlanFrame([ segment(
    { type: "clear", clearColor: true, color: [ 0.1, 0.2, 0.3, 1 ], clearDepth: true, depth: 1 },
    draw("a"),
    { type: "clear", clearColor: true, color: [ 1, 0, 0, 1 ] },
    draw("b")
  ) ]);

  executor.ExecuteFrame(plan);
  const descriptors = calls.filter(([ name ]) => name === "descriptor").map(entry => entry[2]);

  // The first region clears colour and depth; the second was cut by a clear
  // after work, so it clears colour and loads depth. The executor decides
  // neither - it only converts what the planner folded in.
  assert.deepEqual(descriptors[0].clearColor, { r: 0.1, g: 0.2, b: 0.3, a: 1 });
  assert.equal(descriptors[0].clearDepth, 1);
  assert.deepEqual(descriptors[1].clearColor, { r: 1, g: 0, b: 0, a: 1 });
  assert.equal(descriptors[1].clearDepth, undefined, "depth loads because nothing asked to clear it");
});

test("CjsWebgpuFrameExecutor refuses to silently drop compute or transfer work", () =>
{
  const plan = PlanFrame([ segment(draw("a"), compute(), draw("b")) ]);

  // Skipping planned work would render a frame that looks right and is subtly
  // wrong, which is the expensive kind of bug.
  const { executor } = setup();
  assert.throws(() => executor.ExecuteFrame(plan), /no ExecuteRegion handler/);

  const handled = [];
  const withHandler = setup({ ExecuteRegion: (encoder, region, index) => handled.push([ region.kind, index ]) });
  const result = withHandler.executor.ExecuteFrame(plan);

  assert.deepEqual(handled, [ [ "compute", 1 ] ]);
  assert.equal(result.encodedRegions, 3, "compute is encoded in order between the two render regions");
});

test("CjsWebgpuFrameExecutor treats no selections as a pass worth skipping", () =>
{
  const { calls, executor } = setup({ ResolveSelections: (region, index) => (index === 0 ? [] : [ { preparedBatchMap: {}, batchType: 2 } ]) });
  const plan = PlanFrame([ segment(
    draw("a"),
    { type: "set-render-target", slot: 0, renderTarget: "second" },
    draw("b")
  ) ]);

  const result = executor.ExecuteFrame(plan);

  assert.equal(result.encodedRegions, 1);
  // A region whose intents map to no prepared batch type is a legitimate
  // answer; opening a pass to draw nothing is waste.
  assert.deepEqual(calls.filter(([ name ]) => name === "encode").map(entry => entry[1]), [ "region 1" ]);
});

test("CjsWebgpuFrameExecutor submits nothing when a plan encodes nothing", () =>
{
  const { calls, executor } = setup({ ResolveSelections: () => [] });
  const plan = PlanFrame([ segment(draw("a")) ]);

  assert.deepEqual(executor.ExecuteFrame(plan), { encodedRegions: 0, encodedSelections: 0, submitted: false });
  assert.equal(calls.some(([ name ]) => name === "submit"), false, "an empty command buffer is not worth submitting");
});

test("CjsWebgpuFrameExecutor lets a caller own the descriptor for offscreen targets", () =>
{
  // A region targeting something other than the backbuffer needs attachments
  // this module does not own, so the descriptor is the caller's to supply.
  const seen = [];
  const { calls, executor } = setup({
    ResolveDescriptor: (region, index) =>
    {
      seen.push([ index, region.target?.colorTargets?.[0] ?? null ]);
      return { label: `custom ${index}`, colorAttachments: [] };
    }
  });

  const plan = PlanFrame([ segment(
    { type: "set-render-target", slot: 0, renderTarget: "gbuffer" },
    draw("a")
  ) ]);

  executor.ExecuteFrame(plan);
  assert.deepEqual(seen, [ [ 0, "gbuffer" ] ]);
  assert.equal(calls.some(([ name ]) => name === "descriptor"), false, "the target's own descriptor is not built");
});

test("CjsWebgpuFrameExecutor validates what it was composed with", () =>
{
  const { renderTarget } = setup();
  const passEncoder = { Encode() {} };
  const webgpu = { GetDevice: () => ({}), Submit() {} };

  assert.throws(() => new CjsWebgpuFrameExecutor({}, { renderTarget, passEncoder, ResolveSelections: () => [] }), /GetDevice/);
  assert.throws(() => new CjsWebgpuFrameExecutor(webgpu, { passEncoder, ResolveSelections: () => [] }), /render target requires/);
  assert.throws(() => new CjsWebgpuFrameExecutor(webgpu, { renderTarget, ResolveSelections: () => [] }), /pass encoder requires Encode/);
  assert.throws(() => new CjsWebgpuFrameExecutor(webgpu, { renderTarget, passEncoder }), /ResolveSelections is required/);

  const executor = new CjsWebgpuFrameExecutor(webgpu, { renderTarget, passEncoder, ResolveSelections: () => [] });
  assert.throws(() => executor.ExecuteFrame(null), /frame plan with regions/);
  assert.throws(() => executor.ExecuteFrame({ regions: [] }), /createCommandEncoder is required/);
});
