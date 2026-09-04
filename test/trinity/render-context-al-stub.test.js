import assert from "node:assert/strict";
import test from "node:test";

import { Tr2RenderContextALStub } from "../../src/trinity/core/context/Tr2RenderContextALStub.js";

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
  al.PushRenderTarget(second, 0);

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
  al.PushDepthStencil({ id: "second" });

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
  al.PushRenderTarget({ id: "other" }, 0);
  al.Destroy();

  assert.equal(al.IsValid(), false);
  assert.equal(al.GetRenderTarget(0), null);
  assert.equal(al.GetStackSizeRT(), 0);
});
