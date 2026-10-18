import { StubBuffer } from "../support/stubContext.js";
import assert from "node:assert/strict";
import { test } from "node:test";

import { Tr2EffectStateManager } from "../../npm/dist/trinity/shader/index.js";
import { Tr2RenderContext } from "../../npm/dist/trinity/core/index.js";
import { Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";
import { CullMode, ShaderType, Topology } from "../../npm/dist/global/consts/renderContext/index.js";
import { ALResult } from "../../npm/dist/trinityal/index.js";
import { Tr2RenderContextALWebgl2 } from "../../npm/dist/trinityal/webgl2/index.js";
import { FakeWebgl2 } from "../trinityal/webgl2/fakeWebgl2.js";

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

test("beginning a span binds a default program, so the device matches the reset cache", () =>
{
  // Carbon's BeginManagedRendering: m_currentValues.Reset(), then
  // m_renderContext.SetShaderProgram( Tr2ShaderProgramAL() )
  // (Tr2EffectStateManager.cpp:672-674). Without the unbind a span inherited
  // the previous span's program while its cache said UNKNOWN.
  const context = new Tr2RenderContext();
  const al = new Tr2RenderContextALStub();
  const bound = [];

  al.CreateDevice();
  context.SetRenderContextAL(al);

  const setShaderProgram = al.SetShaderProgram.bind(al);
  al.SetShaderProgram = program => { bound.push(program); return setShaderProgram(program); };

  const states = context.GetEffectStateManager();

  states.BeginManagedRendering();

  assert.equal(bound.length, 1);
  assert.equal(bound[0].IsValid(), false, "a default-constructed, invalid program (cpp:674)");
  assert.equal(states.IsManagedRendering(), true);

  // A manager bound to no context still begins its span and reaches nothing.
  const unbound = new Tr2EffectStateManager();
  unbound.BeginManagedRendering();
  assert.equal(unbound.IsManagedRendering(), true);
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

test("a bare BeginManagedRendering clears a mirrored span: Carbon's default is CULLMODE_CW", () =>
{
  // Tr2EffectStateManager.h:48 defaults the argument to CULLMODE_CW, and the
  // CW case is SetInvertedCullMode( false ) (cpp:678-682). Only the reflection
  // path, which renders into a mirrored cube face, passes CULLMODE_NONE
  // (EveSpaceScene.cpp:1933).
  const manager = new Tr2EffectStateManager();

  manager.SetInvertedCullMode(true);
  manager.BeginManagedRendering();

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
    { invertedDepthTest: true, invertedCullMode: false, wireframe: false }
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
  const buffer = StubBuffer();

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
  const indices = StubBuffer();

  states.BeginManagedRendering();

  assert.equal(states.ApplyIndexBuffer__Stride(indices, 2), true);
  assert.equal(states.ApplyIndexBuffer__Stride(indices, 2), false);
  assert.equal(states.ApplyIndexBuffer__Stride(indices, 4), true, "a different stride is a different bind");

  assert.throws(() => states.ApplyIndexBuffer__Stride(indices, 1), /one-byte index stride/);

  // Carbon's one-argument overload takes the stride from the buffer's own description
  // (Tr2EffectStateManager.cpp:951-954); the stub buffer's stride is 4.
  assert.equal(states.ApplyIndexBuffer__Stride(indices, 2), true);
  assert.equal(states.ApplyIndexBuffer(indices), true, "stride 4 from the description differs from the bound 2");
  assert.equal(states.ApplyIndexBuffer(indices), false, "the same buffer and description stride is redundant");
  assert.equal(states.ApplyIndexBuffer__Stride(indices, 4), false);
});

test("the binding verbs reach a backend even on a bare context", () =>
{
  // THIS TEST USED TO ASSERT THE OPPOSITE, and both of its earlier premises
  // were wrong. First these verbs were said to have no recording fallback while
  // every other verb did; then, when the recording went, they were said to
  // throw for want of a backend.
  //
  // Carbon has neither behaviour, because it cannot reach the state: its
  // context INHERITS Tr2RenderContextAL, a compile-time platform typedef
  // (Tr2RenderContext.h:85-87). Ours defaults the field to the stub for the
  // same guarantee, so a bare context is headless rather than broken.
  const context = new Tr2RenderContext();

  assert.equal(context.SetTopology(1), ALResult.S_OK);
  assert.equal(context.SetStreamSource(0, {}, 0, 32), ALResult.S_OK);
  // The stub accepts the draw and counts it. It does NOT check for a bound
  // index buffer - Carbon's stub validates only the user-pointer draws, where a
  // null pointer is a caller error catchable without a GPU.
  const drawsBefore = context.GetRenderContextAL().GetDrawCount();
  assert.equal(context.DrawIndexedInstanced(3, 1, 0, 0, 0), ALResult.S_OK);
  assert.equal(context.GetRenderContextAL().GetDrawCount(), drawsBefore + 1);
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

  assert.equal(context.SetTopology(Topology.TOP_TRIANGLES), ALResult.S_OK);

  // An INTERNED declaration, not a bare 0. Since 2026-09-09 applying one
  // creates the backend layout and binds it, so a handle that names nothing
  // reaches no backend - which is right, and means a stand-in number no longer
  // stands in.
  const declaration = Tr2EffectStateManager.getVertexDeclarationHandle([ { usage: 0, usageIndex: 0, registerIndex: 0 } ]);

  assert.equal(states.ApplyVertexDeclaration(declaration), true);
  assert.equal(states.ApplyStreamSource(0, { id: "vertices" }, 0, 32), true);
  assert.equal(states.ApplyIndexBuffer__Stride({ id: "indices" }, 2), true);
  assert.equal(context.DrawIndexedInstanced(36, 1, 0, 0, 0), ALResult.S_OK);

  assert.equal(al.GetDrawCount(), 1);
});

test("NullDeclaration unbinds and Unknown does not, because they are different sentinels", () =>
{
  // Carbon has two: UNINITIALIZED_DECLARATION (~0u), which it ASSERTS against,
  // and NULL_DECLARATION (~0u - 1), which is the unbind (h:81-82, cpp:886-893).
  // Collapsing them meant a batch carrying NullDeclaration fell past the unbind,
  // found no elements for 0xFFFFFFFE, and bound nothing at all - while the
  // redundancy cache, already written, suppressed every retry.
  const context = new Tr2RenderContext();
  const al = new Tr2RenderContextALStub();
  const bound = [];

  al.CreateDevice();
  al.SetVertexLayout = layout => { bound.push(layout); return ALResult.S_OK; };
  context.SetRenderContextAL(al);

  const states = context.GetEffectStateManager();

  assert.equal(states.ApplyVertexDeclaration(Tr2EffectStateManager.NullDeclaration), true);
  assert.equal(bound.length, 1);
  assert.equal(bound[0].IsValid(), false, "NullDeclaration binds a default-constructed, invalid layout (cpp:891)");

  // Uninitialized is a caller defect. Carbon asserts; we refuse rather than
  // report a success that bound nothing, which is what hid the bug.
  assert.equal(states.ApplyVertexDeclaration(Tr2EffectStateManager.Unknown), false);
  assert.equal(bound.length, 1, "and reaches the backend with nothing");
});

test("releasing the realized objects destroys the shaders, programs and layouts made for the context", () =>
{
  // Carbon deletes every s_shaders and s_shaderPrograms row on device loss
  // (Tr2EffectStateManager.cpp:998-1007), and each delete drops the value's
  // share of its implementation. This forgot the maps without releasing a
  // share, so every backend object behind them leaked.
  const context = new Tr2RenderContext();
  const al = new Tr2RenderContextALStub();

  al.CreateDevice();
  context.SetRenderContextAL(al);

  const states = context.GetEffectStateManager();
  const vertex = Tr2EffectStateManager.registerShader(ShaderType.VERTEX_SHADER, new Uint8Array([ 0xE5, 1 ]));
  const pixel = Tr2EffectStateManager.registerShader(ShaderType.PIXEL_SHADER, new Uint8Array([ 0xE5, 2 ]));
  const otherPixel = Tr2EffectStateManager.registerShader(ShaderType.PIXEL_SHADER, new Uint8Array([ 0xE5, 3 ]));
  const program = states.GetShaderProgram(Tr2EffectStateManager.registerShaderProgram([ vertex, pixel ]));
  const other = states.GetShaderProgram(Tr2EffectStateManager.registerShaderProgram([ vertex, otherPixel ]));

  // One stage value per registration, shared by every program linking it
  // (cpp:510, 562).
  const stages = program.TrinityALImpl_GetObject().GetShaders();
  assert.equal(stages[0].TrinityALImpl_GetObject(), other.TrinityALImpl_GetObject().GetShaders()[0].TrinityALImpl_GetObject());

  const declaration = Tr2EffectStateManager.getVertexDeclarationHandle([ { usage: 0, usageIndex: 0, registerIndex: 0 } ]);
  const bound = [];
  const setVertexLayout = al.SetVertexLayout.bind(al);

  al.SetVertexLayout = layout => { bound.push(layout); return setVertexLayout(layout); };
  states.ApplyVertexDeclaration(declaration);

  const implementations = [
    program.TrinityALImpl_GetObject(),
    other.TrinityALImpl_GetObject(),
    ...stages.map(stage => stage.TrinityALImpl_GetObject()),
    other.TrinityALImpl_GetObject().GetShaders()[1].TrinityALImpl_GetObject(),
    bound[0]._layout.implementation
  ];
  const destroyed = [];

  for (const implementation of implementations)
  {
    assert.equal(implementation.IsValid(), true);

    const destroy = implementation.Destroy.bind(implementation);
    implementation.Destroy = () => { destroyed.push(implementation); destroy(); };
  }

  states.ReleaseRealizedObjects();

  assert.equal(destroyed.length, implementations.length, "every realized implementation is destroyed once");
  assert.equal(new Set(destroyed).size, implementations.length);
  assert.equal(program.IsValid(), false);
  assert.equal(bound[0].IsValid(), false);

  // The next apply realizes fresh objects through the backend now installed.
  const again = states.GetShaderProgram(Tr2EffectStateManager.registerShaderProgram([ vertex, pixel ]));
  assert.equal(again.IsValid(), true);
  assert.notEqual(again.TrinityALImpl_GetObject(), implementations[0]);
});

test("a WebGL2 context's GL shaders and programs are deleted with the realized objects", () =>
{
  // The leak as a GL object count: each registered stage is compiled once,
  // each program linked once, and the release deletes all of them.
  const { gl, calls } = FakeWebgl2();
  const al = new Tr2RenderContextALWebgl2({ gl });

  assert.equal(al.CreateDevice({ mode: { width: 4, height: 4 } }), ALResult.S_OK);

  const context = new Tr2RenderContext();
  context.SetRenderContextAL(al);

  const states = context.GetEffectStateManager();
  const glsl = source => new TextEncoder().encode(`#version 300 es\n${source}\nvoid main() {}\n`);
  const vertex = Tr2EffectStateManager.registerShader(ShaderType.VERTEX_SHADER, glsl("// esm leak vs"));
  const pixel = Tr2EffectStateManager.registerShader(ShaderType.PIXEL_SHADER, glsl("// esm leak ps a"));
  const otherPixel = Tr2EffectStateManager.registerShader(ShaderType.PIXEL_SHADER, glsl("// esm leak ps b"));
  const count = name => calls.filter(call => call[0] === name).length;
  const before = { shaders: count("createShader"), programs: count("createProgram") };

  assert.equal(states.GetShaderProgram(Tr2EffectStateManager.registerShaderProgram([ vertex, pixel ])).IsValid(), true);
  assert.equal(states.GetShaderProgram(Tr2EffectStateManager.registerShaderProgram([ vertex, otherPixel ])).IsValid(), true);

  const shaders = count("createShader") - before.shaders;
  const programs = count("createProgram") - before.programs;

  assert.equal(shaders, 3, "the shared vertex stage is compiled once");
  assert.equal(programs, 2);

  const deleted = { shaders: count("deleteShader"), programs: count("deleteProgram") };

  // Replacing the backend is the release's ordinary caller.
  context.SetRenderContextAL(null);

  assert.equal(count("deleteShader") - deleted.shaders, shaders);
  assert.equal(count("deleteProgram") - deleted.programs, programs);
});

test("a release through one context destroys every context's programs, so a reused handle cannot serve a stale one", async () =>
{
  // Carbon has one table and one backend, so `ReleaseDeviceResources` deletes
  // every row and nothing else holds them (Tr2EffectStateManager.cpp:998-1007).
  // Ours realizes per context (our multi-context extension), and the static
  // release truncates the shared tables, so the next registration reuses the
  // handle numbers. A second context that kept its objects then answered the
  // reused number with the program it realized for the OLD registration.
  const { TriStorageFlags } = await import("../../npm/dist/global/consts/graphics/index.js");
  const contexts = [ new Tr2RenderContext(), new Tr2RenderContext() ];

  for (const context of contexts)
  {
    const al = new Tr2RenderContextALStub();

    al.CreateDevice();
    context.SetRenderContextAL(al);
  }

  const [ first, second ] = contexts.map(context => context.GetEffectStateManager());

  // Start from empty tables, so the handle numbers below are reused for certain.
  first.ReleaseDeviceResources(TriStorageFlags.TRISTORAGE_ALL);

  const oldHandle = Tr2EffectStateManager.registerShaderProgram([
    Tr2EffectStateManager.registerShader(ShaderType.VERTEX_SHADER, new Uint8Array([ 0xE6, 1 ])),
    Tr2EffectStateManager.registerShader(ShaderType.PIXEL_SHADER, new Uint8Array([ 0xE6, 2 ]))
  ]);

  first.GetShaderProgram(oldHandle);

  const stale = second.GetShaderProgram(oldHandle);
  const staleStages = stale.TrinityALImpl_GetObject().GetShaders().map(stage => stage.TrinityALImpl_GetObject());

  first.ReleaseDeviceResources(TriStorageFlags.TRISTORAGE_ALL);

  // The second context's objects are released with the tables (cpp:998-1007).
  assert.equal(stale.IsValid(), false, "the other context's program is destroyed with the tables");

  for (const stage of staleStages) assert.equal(stage.IsValid(), false, "and so are its stages");

  const newVertex = Tr2EffectStateManager.registerShader(ShaderType.VERTEX_SHADER, new Uint8Array([ 0xE6, 3 ]));
  const newPixel = Tr2EffectStateManager.registerShader(ShaderType.PIXEL_SHADER, new Uint8Array([ 0xE6, 4 ]));
  const newHandle = Tr2EffectStateManager.registerShaderProgram([ newVertex, newPixel ]);

  assert.equal(newHandle, oldHandle, "the release frees the number for reuse");

  const fresh = second.GetShaderProgram(newHandle);

  assert.notEqual(fresh, stale, "the reused number realizes the new registration");
  assert.equal(fresh.IsValid(), true);

  const freshStages = fresh.TrinityALImpl_GetObject().GetShaders().map(stage => stage.TrinityALImpl_GetObject());

  assert.equal(freshStages.length, 2);
  for (const stage of freshStages) assert.equal(staleStages.includes(stage), false, "built from the new stages");
});
