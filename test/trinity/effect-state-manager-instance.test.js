import assert from "node:assert/strict";
import { test } from "node:test";

import { Tr2EffectStateManager } from "../../npm/dist/trinity/shader/index.js";
import { Tr2RenderContext, Tr2RenderContextALStub } from "../../npm/dist/trinity/core/index.js";
import { CullMode, Topology } from "../../npm/dist/global/consts/renderContext/index.js";

const { Unknown, RenderingMode } = Tr2EffectStateManager;

test("a fresh cache holds UNKNOWN, not zero", () =>
{
  // Zero is a VALID handle - RM_ANY's empty setup, and the first interned
  // program - so a zeroed cache would filter out the first bind of a span.
  const values = new Tr2EffectStateManager().GetCurrentValues();

  assert.equal(values.shaderProgram, Unknown);
  assert.equal(values.vertexDeclaration, Unknown);
  assert.equal(values.renderStateSetup, Unknown);
  assert.equal(values.streams.length, 4);
  assert.equal(values.streams[0].offset, Unknown);
});

test("outside a managed span nothing is filtered", () =>
{
  const manager = new Tr2EffectStateManager();

  assert.equal(manager.ApplyShaderProgram(7), true);
  assert.equal(manager.ApplyShaderProgram(7), true);
});

test("inside a span a repeat is filtered", () =>
{
  const manager = new Tr2EffectStateManager();

  manager.BeginManagedRendering();

  assert.equal(manager.ApplyShaderProgram(7), true);
  assert.equal(manager.ApplyShaderProgram(7), false);
  assert.equal(manager.ApplyShaderProgram(8), true);
});

test("the shader-program cache is only written inside a span", () =>
{
  // Carbon's asymmetry (cpp:758-771): outside a span nothing tracks the device,
  // so recording there would let the next span skip a bind it must make.
  const manager = new Tr2EffectStateManager();

  manager.ApplyShaderProgram(7);
  manager.BeginManagedRendering();

  assert.equal(manager.ApplyShaderProgram(7), true);
});

test("beginning a span resets the cache", () =>
{
  const manager = new Tr2EffectStateManager();

  manager.BeginManagedRendering();
  manager.ApplyShaderProgram(3);
  manager.BeginManagedRendering();

  assert.equal(manager.GetCurrentValues().shaderProgram, Unknown);
});

test("a mirrored span inverts the cull mode, and the override outlives it", () =>
{
  const manager = new Tr2EffectStateManager();

  manager.BeginManagedRendering(CullMode.CULLMODE_CCW);
  assert.equal(manager.IsCullModeInverted(), true);

  manager.EndManagedRendering();
  assert.equal(manager.IsCullModeInverted(), true);

  manager.BeginManagedRendering(CullMode.CULLMODE_CW);
  assert.equal(manager.IsCullModeInverted(), false);
});

test("CULLMODE_NONE leaves the current setting alone", () =>
{
  const manager = new Tr2EffectStateManager();

  manager.SetInvertedCullMode(true);
  manager.BeginManagedRendering(CullMode.CULLMODE_NONE);

  assert.equal(manager.IsCullModeInverted(), true);
});

test("the overrides are handed over as flags, not applied here", () =>
{
  const manager = new Tr2EffectStateManager();

  manager.SetInvertedDepthTest(true);

  assert.deepEqual(
    manager.GetRenderStateOverrides(),
    { invertedDepthTest: true, invertedCullMode: false }
  );
  assert.equal(manager.IsDepthTestInverted(), true);
});

test("the returned overrides are a copy", () =>
{
  const manager = new Tr2EffectStateManager();
  const overrides = manager.GetRenderStateOverrides();

  overrides.invertedDepthTest = true;

  assert.equal(manager.IsDepthTestInverted(), false);
});

test("applying standard states clears the current setup so the next apply runs", () =>
{
  // Carbon re-applies a mode's states ahead of every pass setup rather than
  // restoring after one, then sets the setup to UNKNOWN (cpp:790-799).
  const manager = new Tr2EffectStateManager();

  manager.BeginManagedRendering();
  manager.ApplyRenderStates(0);
  assert.equal(manager.ApplyRenderStates(0), false);

  manager.ApplyStandardStates(RenderingMode.RM_OPAQUE);

  assert.equal(manager.GetCurrentValues().renderStateSetup, Unknown);
  assert.notEqual(manager.ApplyRenderStates(0), false);
});

test("RM_ANY carries no standard states to apply", () =>
{
  const manager = new Tr2EffectStateManager();

  assert.equal(manager.ApplyStandardStates(RenderingMode.RM_ANY), false);
  assert.equal(manager.ApplyStandardStates(RenderingMode.RM_OPAQUE), true);
  assert.equal(manager.ApplyStandardStates(RenderingMode.RM_COUNT), false);
});

test("an unset vertex declaration is not applied", () =>
{
  const manager = new Tr2EffectStateManager();

  assert.equal(manager.ApplyVertexDeclaration(Unknown), false);
  assert.equal(manager.ApplyVertexDeclaration(0), true);
});

test("a stream bind is filtered only inside a managed span", () =>
{
  // Carbon caches the value ONLY in the managed branch (cpp:930-948). Outside a
  // span nothing tracks the device, so every call has to reach it - recording
  // one there would let the next span skip a bind it needs.
  const context = new Tr2RenderContext();
  const al = new Tr2RenderContextALStub();

  al.CreateDevice();
  context.SetRenderContextAL(al);

  const states = context.GetEffectStateManager();
  const buffer = { id: "vertices" };

  assert.equal(states.ApplyStreamSource(0, buffer, 0, 32), true, "unmanaged: always binds");
  assert.equal(states.ApplyStreamSource(0, buffer, 0, 32), true, "unmanaged: still binds");

  states.BeginManagedRendering();

  assert.equal(states.ApplyStreamSource(0, buffer, 0, 32), true, "managed: first bind");
  assert.equal(states.ApplyStreamSource(0, buffer, 0, 32), false, "managed: redundant");
  assert.equal(states.ApplyStreamSource(0, buffer, 16, 32), true, "a different offset is a different bind");
  assert.equal(states.ApplyStreamSource(1, buffer, 0, 32), true, "streams cache separately");
});

test("an index bind is filtered the same way, and a one-byte stride fails", () =>
{
  // Carbon warns "Oh no! This is a big bug!" and carries on (cpp:963-966). No
  // backend has 8-bit indices, so the value can only be uninitialised; a bind
  // that cannot be right should not reach a device.
  const context = new Tr2RenderContext();
  const al = new Tr2RenderContextALStub();

  al.CreateDevice();
  context.SetRenderContextAL(al);

  const states = context.GetEffectStateManager();
  const indices = { id: "indices" };

  states.BeginManagedRendering();

  assert.equal(states.ApplyIndexBuffer(indices, 2), true);
  assert.equal(states.ApplyIndexBuffer(indices, 2), false);
  assert.equal(states.ApplyIndexBuffer(indices, 4), true, "a different stride is a different bind");

  assert.throws(() => states.ApplyIndexBuffer(indices, 1), /one-byte index stride/);
});

test("the binding verbs fail without a backend rather than recording", () =>
{
  // Every other verb on the context has a recording fallback because the intent
  // stream has a vocabulary for it. These have none, and inventing one would be
  // building what the WebGPU AL is about to replace.
  const context = new Tr2RenderContext();

  assert.throws(() => context.SetTopology(1), /no render-context AL installed/);
  assert.throws(() => context.SetStreamSource(0, {}, 0, 32), /no render-context AL installed/);
  assert.throws(() => context.DrawIndexedInstanced(3, 1, 0, 0, 0), /no render-context AL installed/);
});

test("the batch-to-draw sequence reaches the device", () =>
{
  // Carbon's SubmitGeometry (`Tr2RenderContext.cpp:83-103`) in order: topology,
  // then the declaration, streams and indices through the redundancy filter,
  // then the draw.
  const context = new Tr2RenderContext();
  const al = new Tr2RenderContextALStub();

  al.CreateDevice();
  context.SetRenderContextAL(al);

  const states = context.GetEffectStateManager();

  states.BeginManagedRendering();

  assert.equal(context.SetTopology(Topology.TOP_TRIANGLES), true);
  assert.equal(states.ApplyVertexDeclaration(0), true);
  assert.equal(states.ApplyStreamSource(0, { id: "vertices" }, 0, 32), true);
  assert.equal(states.ApplyIndexBuffer({ id: "indices" }, 2), true);
  assert.equal(context.DrawIndexedInstanced(36, 1, 0, 0, 0), true);

  assert.equal(al.GetDrawCount(), 1);
});
