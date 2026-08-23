import assert from "node:assert/strict";
import { test } from "node:test";

import { CjsWebgpuRenderTarget } from "../src/core/renderTarget.js";

const TEXTURE_USAGE = Object.freeze({ RENDER_ATTACHMENT: 16, TEXTURE_BINDING: 4, COPY_DST: 8 });

function fakeTexture(label)
{
  const texture = {
    label,
    destroyed: 0,
    views: 0,
    destroy() { this.destroyed += 1; },
    createView() { this.views += 1; return { of: label, index: this.views }; }
  };
  return texture;
}

function fakeSetup(options = {})
{
  const created = [];
  const device = {
    createTexture(descriptor)
    {
      const texture = fakeTexture(descriptor.label);
      texture.descriptor = descriptor;
      created.push(texture);
      return texture;
    }
  };

  let generation = 1;
  const webgpu = {
    GetDevice: () => device,
    GetGeneration: () => generation,
    SetGeneration(value) { generation = value; }
  };

  let currentTexture = fakeTexture("canvas-0");
  let frameIndex = 0;
  const configureCalls = [];
  const context = {
    unconfigured: 0,
    configure(descriptor) { configureCalls.push(descriptor); },
    unconfigure() { this.unconfigured += 1; },
    getCurrentTexture()
    {
      // The browser replaces the texture behind the canvas at presentation.
      frameIndex += 1;
      currentTexture = fakeTexture(`canvas-${frameIndex}`);
      return currentTexture;
    }
  };

  const canvas = { width: 0, height: 0, getContext: (type) => (type === "webgpu" ? context : null) };
  const target = new CjsWebgpuRenderTarget(webgpu, {
    canvas,
    textureUsage: TEXTURE_USAGE,
    gpu: { getPreferredCanvasFormat: () => "bgra8unorm" },
    ...options
  });

  return { canvas, configureCalls, context, created, device, target, webgpu };
}

test("CjsWebgpuRenderTarget configures the canvas and sizes its attachments", () =>
{
  const { canvas, configureCalls, created, target } = fakeSetup({ depthFormat: "depth24plus" });

  target.Configure({ width: 800, height: 600 });

  assert.equal(target.GetFormat(), "bgra8unorm", "the browser's preferred format is used when none is given");
  assert.deepEqual(target.GetSize(), { width: 800, height: 600 });
  assert.deepEqual([ canvas.width, canvas.height ], [ 800, 600 ], "the backing store drives the surface size");
  assert.equal(configureCalls.length, 1);
  assert.equal(configureCalls[0].usage, TEXTURE_USAGE.RENDER_ATTACHMENT);
  assert.equal(configureCalls[0].alphaMode, "opaque");

  const depth = created.at(-1);
  assert.deepEqual(depth.descriptor.size, { width: 800, height: 600, depthOrArrayLayers: 1 });
  assert.equal(depth.descriptor.format, "depth24plus");
});

test("CjsWebgpuRenderTarget reconfigures only when something changed", () =>
{
  const { configureCalls, created, target } = fakeSetup({ depthFormat: "depth24plus" });

  target.Configure({ width: 800, height: 600 });
  target.Configure({ width: 800, height: 600 });
  assert.equal(configureCalls.length, 1, "an unchanged frame recreates nothing, so a caller may call it every frame");

  target.Configure({ width: 1024, height: 600 });
  assert.equal(configureCalls.length, 2);
  // A stale depth attachment after a resize is the classic size-mismatch bug;
  // the old one is destroyed and a matching one takes its place.
  assert.equal(created[0].destroyed, 1);
  assert.deepEqual(created.at(-1).descriptor.size, { width: 1024, height: 600, depthOrArrayLayers: 1 });
});

test("CjsWebgpuRenderTarget treats a device generation change as a full rebuild", () =>
{
  const { configureCalls, created, target, webgpu } = fakeSetup({ depthFormat: "depth24plus" });

  target.Configure({ width: 320, height: 240 });
  const frame = target.AcquireFrame();

  webgpu.SetGeneration(2);
  // An attachment from the previous device is not repairable, and a frame
  // acquired before the loss is not usable after it.
  assert.throws(() => target.AcquireFrame(), /device generation changed/i);

  target.Configure();
  assert.equal(configureCalls.length, 2, "the new device needs its own configuration");
  assert.equal(created[0].destroyed, 1);
  assert.throws(() => target.CreateRenderPassDescriptor(frame), /stale/i);
});

test("CjsWebgpuRenderTarget rejects a canvas view reused across frames", () =>
{
  const { target } = fakeSetup();

  target.Configure({ width: 64, height: 64 });
  const first = target.AcquireFrame();
  assert.ok(target.CreateRenderPassDescriptor(first));

  const second = target.AcquireFrame();
  assert.notEqual(first.colorView, second.colorView, "the browser hands out a new texture each frame");

  // WebGPU replaces the texture at presentation, so the previous view refers to
  // a texture that is gone. Caught here rather than as a validation error from
  // a descriptor that looks correct.
  assert.throws(() => target.CreateRenderPassDescriptor(first), /valid for one frame/i);
  assert.ok(target.CreateRenderPassDescriptor(second));
});

test("CjsWebgpuRenderTarget clears through load operations, not a draw", () =>
{
  const { target } = fakeSetup({ depthFormat: "depth24plus" });
  target.Configure({ width: 64, height: 64 });

  const frame = target.AcquireFrame();
  const cleared = target.CreateRenderPassDescriptor(frame, { clearColor: { r: 0, g: 0, b: 0, a: 1 }, clearDepth: 1 });
  assert.equal(cleared.colorAttachments[0].loadOp, "clear");
  assert.deepEqual(cleared.colorAttachments[0].clearValue, { r: 0, g: 0, b: 0, a: 1 });
  assert.equal(cleared.depthStencilAttachment.depthLoadOp, "clear");
  assert.equal(cleared.depthStencilAttachment.depthClearValue, 1);

  // A second pass over the same target composites, so it loads rather than
  // clearing. That is the whole reason clearing is a load op and not a draw.
  const loaded = target.CreateRenderPassDescriptor(frame);
  assert.equal(loaded.colorAttachments[0].loadOp, "load");
  assert.equal(loaded.depthStencilAttachment.depthLoadOp, "load");
  assert.equal(loaded.colorAttachments[0].resolveTarget, undefined, "no multisampling means no resolve");
});

test("CjsWebgpuRenderTarget resolves multisampled colour into the canvas", () =>
{
  const { created, target } = fakeSetup({ sampleCount: 4, depthFormat: "depth24plus" });
  target.Configure({ width: 128, height: 128 });

  const multisample = created.find(texture => texture.label.endsWith("multisample"));
  const depth = created.find(texture => texture.label.endsWith("depth"));
  assert.equal(multisample.descriptor.sampleCount, 4);
  assert.equal(depth.descriptor.sampleCount, 4, "depth must match the colour attachment's sample count");

  const frame = target.AcquireFrame();
  const descriptor = target.CreateRenderPassDescriptor(frame, { clearColor: { r: 0, g: 0, b: 0, a: 1 } });
  assert.equal(descriptor.colorAttachments[0].view, frame.colorView, "the pass renders into the multisample texture");
  assert.equal(descriptor.colorAttachments[0].resolveTarget, frame.resolveView, "and resolves into the canvas");
  assert.notEqual(frame.colorView, frame.resolveView);
});

test("CjsWebgpuRenderTarget applies viewport and scissor per pass", () =>
{
  const { target } = fakeSetup();
  target.Configure({ width: 800, height: 600 });

  const calls = [];
  const pass = {
    setViewport(...args) { calls.push([ "viewport", ...args ]); },
    setScissorRect(...args) { calls.push([ "scissor", ...args ]); }
  };

  target.ApplyViewport(pass);
  assert.deepEqual(calls, [ [ "viewport", 0, 0, 800, 600, 0, 1 ], [ "scissor", 0, 0, 800, 600 ] ]);

  calls.length = 0;
  target.ApplyViewport(pass, { viewport: { x: 10, y: 20, width: 100, height: 50 } });
  assert.deepEqual(calls[0], [ "viewport", 10, 20, 100, 50, 0, 1 ]);

  assert.throws(
    () => target.ApplyViewport(pass, { scissor: { x: 700, y: 0, width: 200, height: 10 } }),
    /exceeds the 800x600 target/
  );
});

test("CjsWebgpuRenderTarget refuses work it cannot do", () =>
{
  const { target } = fakeSetup();

  assert.throws(() => target.AcquireFrame(), /Configure must run before/i);
  target.Configure({ width: 32, height: 32 });
  const frame = target.AcquireFrame();

  // No depth attachment exists, so a depth clear is a caller mistake rather
  // than something to silently drop.
  assert.throws(() => target.CreateRenderPassDescriptor(frame, { clearDepth: 1 }), /no depth attachment/i);
  assert.throws(() => target.Configure({ width: 0, height: 32 }), /positive integer/i);

  target.Destroy();
  assert.throws(() => target.AcquireFrame(), /destroyed/i);
  target.Destroy();
});

test("CjsWebgpuRenderTarget releases what it created and leaves the canvas alone", () =>
{
  const { canvas, context, created, target } = fakeSetup({ sampleCount: 4, depthFormat: "depth24plus" });
  target.Configure({ width: 64, height: 64 });

  target.Destroy();

  assert.deepEqual(created.map(texture => texture.destroyed), [ 1, 1 ]);
  assert.equal(context.unconfigured, 1);
  assert.equal(canvas.width, 64, "the canvas belongs to the caller and is left as it was");
});
