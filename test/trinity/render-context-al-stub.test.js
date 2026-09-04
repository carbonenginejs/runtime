import assert from "node:assert/strict";
import test from "node:test";

import {
  Tr2BitmapDimensions,
  Tr2RenderContext,
  Tr2RenderContextALStub,
  Tr2TextureALStub
} from "../../npm/dist/trinity/core/index.js";
import { PixelFormat, Tr2GpuUsage } from "../../npm/dist/global/consts/renderContext/index.js";

const ready = () =>
{
  const al = new Tr2RenderContextALStub();

  al.CreateDevice();

  return al;
};

test("a context is invalid until a device is created", () =>
{
  // Carbon gates every resource Create on this, so it is the first thing a
  // headless caller depends on.
  const al = new Tr2RenderContextALStub();

  assert.equal(al.IsValid(), false);
  assert.equal(al.CreateDevice(), true);
  assert.equal(al.IsValid(), true);
});

test("state survives, which is the whole point of the backend", () =>
{
  // A no-op backend would run headless and hold nothing. The requirement is a
  // headless Trinity carrying CORRECT DATA, so what is bound must read back.
  const al = ready();
  const target = { id: "colour" };
  const depth = { id: "depth" };

  al.SetRenderTarget(0, target);
  al.SetDepthStencil(depth);
  al.SetViewport({ x: 0, y: 0, width: 512, height: 512 });

  assert.equal(al.GetRenderTarget(0), target);
  assert.equal(al.GetDepthStencil(), depth);
  assert.deepEqual(al.GetViewport(), { x: 0, y: 0, width: 512, height: 512 });
});

test("the render target stack restores what it replaced", () =>
{
  const al = ready();
  const first = { id: "first" };
  const second = { id: "second" };

  al.SetRenderTarget(0, first);
  al.PushRenderTarget(0);
  al.SetRenderTarget(0, second);

  assert.equal(al.GetRenderTarget(0), second);
  assert.equal(al.GetStackSizeRT(), 1);

  al.PopRenderTarget(0);

  assert.equal(al.GetRenderTarget(0), first);
  assert.equal(al.GetStackSizeRT(), 0);
});

test("the depth stencil stack behaves the same way", () =>
{
  const al = ready();
  const first = { id: "first" };

  al.SetDepthStencil(first);
  al.PushDepthStencil();
  al.SetDepthStencil({ id: "second" });

  assert.equal(al.GetStackSizeDS(), 1);

  al.PopDepthStencil();

  assert.equal(al.GetDepthStencil(), first);
  assert.equal(al.GetStackSizeDS(), 0);
});

test("an unbalanced pop is refused rather than silently rebinding", () =>
{
  // Carbon reports stack depth instead of guarding, but a stray pop here would
  // leave the wrong target bound for the rest of the frame.
  const al = ready();

  assert.throws(() => al.PopRenderTarget(0), /stack is empty/);
  assert.throws(() => al.PopDepthStencil(), /stack is empty/);
});

test("a slot outside the fixed array is refused", () =>
{
  // Carbon's bound-target array is MAX_RENDER_TARGET wide and indexed without
  // a bounds check, so an out-of-range slot corrupts adjacent memory there.
  const al = ready();

  assert.throws(() => al.SetRenderTarget(99, {}), /outside 0\.\./);
  assert.throws(() => al.SetRenderTarget(-1, {}), /outside 0\.\./);
});

test("ClearUav and buffer copies refuse, as Carbon's stub does", () =>
{
  // Deliberate: a caller needing these needs a real backend, and silently
  // succeeding would hide that.
  const al = ready();

  assert.equal(al.ClearUav(), false);
  assert.equal(al.CopyRenderTarget(), false);
});

test("draws are counted, so a headless frame can be asserted", () =>
{
  // The one thing that genuinely needs a GPU is the draw. Counting it is how a
  // test says "the frame got as far as drawing" without one.
  const al = ready();

  assert.equal(al.GetDrawCount(), 0);

  al.DrawIndexedInstanced();
  al.DrawInstanced();

  assert.equal(al.GetDrawCount(), 2);
});

test("a target is only valid once a device exists", () =>
{
  const al = new Tr2RenderContextALStub();
  const target = { id: "colour" };

  assert.equal(al.IsRenderTargetValid(target), false);

  al.CreateDevice();

  assert.equal(al.IsRenderTargetValid(target), true);
  assert.equal(al.IsRenderTargetValid(null), false);
});

test("Destroy clears the bindings and drops validity", () =>
{
  const al = ready();

  al.SetRenderTarget(0, { id: "colour" });
  al.PushRenderTarget(0);
  al.Destroy();

  assert.equal(al.IsValid(), false);
  assert.equal(al.GetRenderTarget(0), null);
  assert.equal(al.GetStackSizeRT(), 0);
});

test("a context driven by the stub keeps real state and records no intents", () =>
{
  // The point of the port: with a backend installed the context CALLS it, as
  // Carbon's does, instead of writing the call down for someone to replay.
  const context = new Tr2RenderContext();
  const al = new Tr2RenderContextALStub();

  al.CreateDevice();
  context.SetRenderContextAL(al);

  // Real textures, because a render target IS one: the backend reads a bound
  // target's extent to reset the viewport, so a plain object is not a stand-in.
  const target = renderTarget(128, 128);

  context.SetRenderTarget(0, target);
  context.SetViewport({ x: 0, y: 0, width: 64, height: 64 });
  context.Clear({ clearColor: true, color: [ 0, 0, 0, 1 ] });
  const offscreen = renderTarget(32, 32);

  context.PushRenderTarget(offscreen, 0);

  assert.equal(al.GetRenderTarget(0), offscreen, "a pushed target is BOUND, not just saved");

  context.PopRenderTarget(0);

  assert.equal(al.GetRenderTarget(0), target, "the backend holds the state");
  assert.equal(al.GetViewport().width, 128, "and the restored target's viewport with it");
  assert.equal(context.GetIntents().length, 0, "nothing was recorded");
});

test("with no backend the context still records, so nothing broke on the way", () =>
{
  // The fallback is what every existing caller uses until a backend exists;
  // removing it before the WebGPU backend lands would stop the engine drawing.
  const context = new Tr2RenderContext();

  context.Clear({ clearColor: true });

  assert.ok(context.GetIntents().length > 0);
});

test("with a backend installed the context's getters report the backend", () =>
{
  // THE SPLIT CARBON DOES NOT HAVE. Carbon's Tr2RenderContext IS the base plus
  // the AL, so there is one piece of state. Ours composes them, and a getter
  // answering from the recording path while the backend holds the real binding
  // would name a target nothing is drawing to.
  const context = new Tr2RenderContext();
  const al = new Tr2RenderContextALStub();

  al.CreateDevice({ mode: { width: 800, height: 600 } });
  context.SetRenderContextAL(al);

  const target = { id: "colour" };
  const depth = { id: "depth" };

  context.SetRenderTarget(1, target);
  context.SetDepthStencil(depth);
  context.SetViewport({ x: 0, y: 0, width: 32, height: 32 });

  assert.equal(context.GetRenderTarget(1), target);
  assert.equal(context.GetDepthStencil(), depth);
  assert.deepEqual(context.GetViewport(), { x: 0, y: 0, width: 32, height: 32 });
});

test("a full-screen viewport resolves through the backend rather than deferring", () =>
{
  // With a backend there is nothing to defer - it knows the bound target's
  // extent - so "full screen" becomes an ordinary viewport here.
  const context = new Tr2RenderContext();
  const al = new Tr2RenderContextALStub();

  al.CreateDevice({ mode: { width: 1280, height: 720 } });
  context.SetRenderContextAL(al);

  assert.equal(context.SetFullScreenViewport(), true);
  assert.deepEqual(
    context.GetViewport(),
    { x: 0, y: 0, width: 1280, height: 720, minZ: 0, maxZ: 1 }
  );
});

test("a full-screen viewport with nothing bound fails rather than guessing", () =>
{
  const context = new Tr2RenderContext();
  const al = new Tr2RenderContextALStub();

  al.CreateDevice();
  context.SetRenderContextAL(al);

  assert.equal(context.SetFullScreenViewport(), false);
});

test("the viewport stack lives on the state manager, and restores through it", () =>
{
  // Carbon's steps push and pop through renderContext.m_esm
  // (TriStepPushViewport.cpp:9), because the manager owns the AUTHORED viewport
  // while the context's own SetViewport takes an already-clipped device one.
  const context = new Tr2RenderContext();
  const al = new Tr2RenderContextALStub();

  al.CreateDevice({ mode: { width: 256, height: 256 } });
  context.SetRenderContextAL(al);

  const states = context.GetEffectStateManager();

  states.SetViewport({ x: 0, y: 0, width: 64, height: 64 });
  states.PushViewport();
  states.SetViewport({ x: 0, y: 0, width: 16, height: 16 });

  assert.equal(states.PopViewport(), true);
  assert.equal(states.GetViewport().width, 64, "the authored viewport came back");
  assert.equal(al.GetViewport().width, 64, "and reached the backend");
});

test("with no backend the recording path still defers a full-screen viewport", () =>
{
  const context = new Tr2RenderContext();

  assert.equal(context.SetFullScreenViewport(), true);
  assert.equal(context.GetViewport(), null);
  assert.ok(context.GetIntents().some(intent => intent.type === "set-fullscreen-viewport"));
});

test("capabilities are reached through the context, and only with a backend", () =>
{
  // Carbon reads renderContext.GetCaps().SupportsX() and never touches a caps
  // object directly (TriDevice.cpp:1295-1300, 1399-1403), so the context is the
  // only door. Without a backend there is nothing behind it.
  const context = new Tr2RenderContext();

  assert.throws(() => context.GetCaps(), /no render-context AL installed/);

  const al = new Tr2RenderContextALStub();

  al.CreateDevice();
  context.SetRenderContextAL(al);

  const caps = context.GetCaps();

  assert.equal(caps, al.GetCaps(), "the context owns one caps object, as Carbon's does");
  assert.equal(caps.SupportsRaytracing(), false);
  assert.equal(caps.SupportsVertexShaderTextures(), true, "not everything is a no");
});

test("pushing a target BINDS it, and popping restores the one beneath", () =>
{
  // THE DEFECT THIS REPLACES. Push used to save the SUPPLIED target and bind
  // nothing, so a render job that pushed an offscreen target went on drawing
  // into the previous one. Carbon's state manager pushes then sets
  // (Tr2EffectStateManager.cpp:1048-1052), and its pop rebinds.
  const context = new Tr2RenderContext();
  const main = { id: "main" };
  const offscreen = { id: "offscreen" };

  context.SetRenderTarget(0, main);
  context.PushRenderTarget(offscreen, 0);

  assert.equal(context.GetRenderTarget(0), offscreen);
  assert.equal(context.GetStackSizeRT(), 1);

  assert.equal(context.PopRenderTarget(0), true);
  assert.equal(context.GetRenderTarget(0), main, "the target beneath is bound again");
  assert.equal(context.GetStackSizeRT(), 0);
  assert.equal(context.PopRenderTarget(0), false, "an empty stack says so");
});

test("pushing with no target saves the bound one and changes nothing", () =>
{
  // Carbon's one-argument state-manager form, and the batch bracket's own use:
  // CjsDirectTrinityStepExecutor.BeginBatch pushes null purely as a guard.
  const context = new Tr2RenderContext();
  const main = { id: "main" };

  context.SetRenderTarget(0, main);
  context.PushRenderTarget(null, 0);

  assert.equal(context.GetRenderTarget(0), main);
  assert.equal(context.GetStackSizeRT(), 1);

  context.PopRenderTarget(0);

  assert.equal(context.GetRenderTarget(0), main);
});

test("the depth stencil pushes and pops the same way", () =>
{
  const context = new Tr2RenderContext();
  const main = { id: "main" };
  const shadow = { id: "shadow" };

  context.SetDepthStencil(main);
  context.PushDepthStencil(shadow);

  assert.equal(context.GetDepthStencil(), shadow);

  assert.equal(context.PopDepthStencil(), true);
  assert.equal(context.GetDepthStencil(), main);
  assert.equal(context.PopDepthStencil(), false);
});

test("each slot has its own stack, so interleaved pushes unwind correctly", () =>
{
  // Carbon's stacks are m_stackRT[MAX_RENDER_TARGET]. One shared stack pops the
  // most recent push whatever slot it names, so pushing slot 0 then slot 1 and
  // popping slot 0 restores the wrong surface into the wrong slot.
  const al = ready();
  const zero = { id: "zero" };
  const one = { id: "one" };

  al.SetRenderTarget(0, zero);
  al.SetRenderTarget(1, one);

  al.PushRenderTarget(0);
  al.PushRenderTarget(1);

  al.SetRenderTarget(0, { id: "zero-offscreen" });
  al.SetRenderTarget(1, { id: "one-offscreen" });

  assert.equal(al.GetStackSizeRT(0), 1);
  assert.equal(al.GetStackSizeRT(1), 1);

  al.PopRenderTarget(0);

  assert.equal(al.GetRenderTarget(0), zero, "slot 0 restored its own target");
  assert.equal(al.GetRenderTarget(1).id, "one-offscreen", "slot 1 is untouched");
  assert.equal(al.GetStackSizeRT(0), 0);
  assert.equal(al.GetStackSizeRT(1), 1);

  al.PopRenderTarget(1);

  assert.equal(al.GetRenderTarget(1), one);
});

test("stack depth is reported by the backend when one is installed", () =>
{
  // The same seam bug the getters had: the context's own stacks stay empty
  // while the backend holds the real ones, so an unbalance guard reading zero
  // would never fire.
  const context = new Tr2RenderContext();
  const al = new Tr2RenderContextALStub();

  al.CreateDevice();
  context.SetRenderContextAL(al);

  context.PushRenderTarget(null, 0);
  context.PushDepthStencil(null);

  assert.equal(context.GetStackSizeRT(0), 1);
  assert.equal(context.GetStackSizeDS(), 1);

  context.PopRenderTarget(0);
  context.PopDepthStencil();

  assert.equal(context.GetStackSizeRT(0), 0);
  assert.equal(context.GetStackSizeDS(), 0);
});

/** A render target of a given size, valid enough to report its extent. */
function renderTarget(width, height)
{
  const texture = new Tr2TextureALStub();
  const al = new Tr2RenderContextALStub();

  al.CreateDevice();
  texture.Create(
    Tr2BitmapDimensions.Texture2D(width, height, 1, PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM),
    { gpuUsage: Tr2GpuUsage.RENDER_TARGET },
    al
  );

  return texture;
}

test("binding a target to slot zero resets the viewport to its size", () =>
{
  // CARBON DOES THIS ON EVERY BIND (Tr2EffectStateManager.cpp:1133-1149), and
  // forgetting it is the bug where a pass renders into a corner: a 2048-wide
  // shadow pass would leave the viewport at 2048 for the frame that follows.
  const context = new Tr2RenderContext();
  const al = new Tr2RenderContextALStub();

  al.CreateDevice();
  context.SetRenderContextAL(al);

  context.SetRenderTarget(0, renderTarget(512, 512));

  assert.deepEqual(context.GetViewport(), { x: 0, y: 0, width: 512, height: 512, minZ: 0, maxZ: 1 });

  context.PushRenderTarget(renderTarget(2048, 2048), 0);

  assert.equal(context.GetViewport().width, 2048, "the offscreen pass gets its own viewport");

  context.PopRenderTarget(0);

  assert.equal(context.GetViewport().width, 512, "and the main target gets its own back");
});

test("only slot zero moves the viewport, and a caller can decline", () =>
{
  const context = new Tr2RenderContext();
  const al = new Tr2RenderContextALStub();

  al.CreateDevice();
  context.SetRenderContextAL(al);

  context.SetRenderTarget(0, renderTarget(512, 512));
  context.SetRenderTarget(1, renderTarget(64, 64));

  assert.equal(context.GetViewport().width, 512, "a second colour attachment is not the viewport");

  context.SetRenderTarget(0, renderTarget(256, 256), false);

  assert.equal(context.GetViewport().width, 512, "updateViewport: false leaves it alone");
});

test("an authored viewport is clipped to the render target, never to nothing", () =>
{
  // Carbon's SetupViewport (cpp:1221-1245) clips to the bound target and floors
  // each edge at one, because a zero edge is refused. Ours adds one refusal of
  // its own: with no extent recorded it does NOT clip, since clipping to zero
  // would floor a real viewport to a single pixel and draw silently.
  const context = new Tr2RenderContext();
  const al = new Tr2RenderContextALStub();

  al.CreateDevice({ mode: { width: 256, height: 256 } });
  context.SetRenderContextAL(al);

  const states = context.GetEffectStateManager();

  states.SetViewport({ x: 0, y: 0, width: 1024, height: 1024 });

  assert.equal(states.GetViewport().width, 1024, "the authored viewport is kept as authored");
  assert.equal(states.GetDeviceViewport().width, 1024, "and unclipped while no extent is known");

  context.SetRenderTarget(0, al.GetBackBuffer());
  states.SetViewport({ x: 0, y: 0, width: 1024, height: 1024 });

  assert.equal(states.GetViewport().width, 1024);
  assert.equal(states.GetDeviceViewport().width, 256, "clipped to the target once it is known");
  assert.equal(al.GetViewport().width, 256, "and only the clipped one reaches the backend");
});

test("a viewport starting outside the target still has a legal extent", () =>
{
  const context = new Tr2RenderContext();
  const al = new Tr2RenderContextALStub();

  al.CreateDevice({ mode: { width: 256, height: 256 } });
  context.SetRenderContextAL(al);
  context.SetRenderTarget(0, al.GetBackBuffer());

  const states = context.GetEffectStateManager();

  states.SetViewport({ x: 300, y: 300, width: 64, height: 64 });

  assert.equal(states.GetDeviceViewport().width, 1, "floored at one, not zero or negative");
  assert.equal(states.GetDeviceViewport().height, 1);
});

test("the manager reports the viewport and target sizes shaders read", () =>
{
  // Carbon sets m_viewportSizeVar to (viewport, renderTarget) on every setup
  // (cpp:1242), so a pass reading it sees both.
  const context = new Tr2RenderContext();
  const al = new Tr2RenderContextALStub();

  al.CreateDevice({ mode: { width: 256, height: 128 } });
  context.SetRenderContextAL(al);
  context.SetRenderTarget(0, al.GetBackBuffer());

  const states = context.GetEffectStateManager();

  states.SetViewport({ x: 0, y: 0, width: 64, height: 32 });

  assert.deepEqual(states.viewportSizeVar, [ 64, 32, 256, 128 ]);
});
