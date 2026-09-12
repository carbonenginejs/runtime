import assert from "node:assert/strict";
import test from "node:test";

import { PER_FRAME_PS, PER_FRAME_VS, Tr2Blitter, Tr2RenderContext, Tr2Renderer } from "../../npm/dist/trinity/core/index.js";
import { Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";

/** A Tr2RenderContext with the stub backend installed, which is what runs without webgpu or webgl. */
function stubContext()
{
  const al = new Tr2RenderContextALStub();

  al.CreateDevice({ mode: { width: 64, height: 64 } });

  const context = new Tr2RenderContext();

  context.SetRenderContextAL(al);
  return context;
}

/** A material whose shader reports one pass and records what ran. */
function material(log = [])
{
  const shader = {
    GetPassCount: () => 1,
    ApplyAllStateForPass: (technique, pass) => log.push(`state:${technique}:${pass}`)
  };

  return {
    log,
    GetShaderStateInterface: () => shader,
    ApplyMaterialDataForPass: (technique, pass) => log.push(`data:${technique}:${pass}`)
  };
}

test("the constant registers are Carbon's, and they are Trinity's to own", () =>
{
  // Tr2Renderer.cpp:38-43. These lived in the WebGPU engine, where a second
  // backend could not have reached them without copying them.
  const renderer = new Tr2Renderer();

  assert.equal(renderer.GetPerFrameVSStartRegister(), 1);
  assert.equal(renderer.GetPerFramePSStartRegister(), 2);
  assert.equal(renderer.GetPerObjectVSStartRegister(), 3);
  assert.equal(renderer.GetPerObjectPSStartRegister(), 4);
  assert.equal(renderer.GetPerObjectRTVertexBufferDataRegister(), 5);
  assert.equal(renderer.GetPerObjectVSGUIStartRegister(), 6);
});

test("the per-object register depends on the stage, and only the pixel one differs", () =>
{
  // Carbon's overload pair (Tr2Renderer.h:65-81): pixel has its own register,
  // every other stage shares the vertex one.
  const renderer = new Tr2Renderer();

  assert.equal(renderer.GetPerObjectStartRegister(Tr2Renderer.PIXEL_SHADER), 4);
  assert.equal(renderer.GetPerObjectStartRegister(0), 3, "vertex");
  assert.equal(renderer.GetPerObjectStartRegister(3), 3, "geometry shares the vertex register");
  assert.equal(renderer.GetPerObjectStartRegister(), 3, "and so does the default");
});

test("two renderers do not share a register map", () =>
{
  // The reason ours is an instance where Carbon's is static: a second library
  // instance must not silently inherit the first one's renderer state.
  assert.notEqual(new Tr2Renderer(), new Tr2Renderer());
});

test("a register's meaning comes from the accessors, not a lookup table", () =>
{
  // There was a register-to-name table here and it is gone. The numbers are
  // fixed and this class owns them, so a caller with a register compares
  // against the accessors - which is how Carbon answers the same question, and
  // why Carbon has no such table.
  const renderer = new Tr2Renderer();

  assert.equal(renderer.GetPerFrameVSStartRegister(), PER_FRAME_VS);
  assert.equal(renderer.GetPerFramePSStartRegister(), PER_FRAME_PS);
  assert.notEqual(renderer.GetPerObjectVSStartRegister(), PER_FRAME_VS);
});

test("every screen-space draw refuses until the device resources are prepared", () =>
{
  // Carbon guards each of these with `if( s_blitter )` and otherwise returns
  // false (Tr2Renderer.cpp:750-834, 1006-1028). The blitter is made in
  // PrepareDeviceResources, so before that call there is nothing to draw with.
  const renderer = new Tr2Renderer();
  const context = stubContext();

  assert.equal(renderer.GetBlitter(), null);
  assert.equal(renderer.DrawScreenQuad(context, material()), false);
  assert.equal(renderer.DrawScreenQuadRect(context, material(), [ 0, 0 ], [ 1, 1 ]), false);
  assert.equal(renderer.DrawFullScreenWithShader(context, material()), false);
  assert.equal(renderer.DrawTexture(context, { id: "t" }), false);
  assert.equal(renderer.DrawCameraSpaceScreenQuad(context, null, material()), false);
});

test("preparing device resources makes the blitter, once", () =>
{
  const renderer = new Tr2Renderer();
  const blitter = renderer.PrepareDeviceResources();

  assert.ok(blitter instanceof Tr2Blitter);
  assert.equal(renderer.GetBlitter(), blitter);
  // Carbon's `if( !s_blitter )` makes it at most once (cpp:1275-1281).
  assert.equal(renderer.PrepareDeviceResources(), blitter);
});

test("two renderers do not share a blitter", () =>
{
  // The same reason the register map is per instance: a second library
  // instance must not silently inherit the first one's device resources.
  const first = new Tr2Renderer();
  const second = new Tr2Renderer();

  assert.notEqual(first.PrepareDeviceResources(), second.PrepareDeviceResources());
});

test("a prepared renderer actually reaches the blitter", () =>
{
  const renderer = new Tr2Renderer();
  const context = stubContext();

  renderer.PrepareDeviceResources(context);

  const drawn = material();

  assert.equal(renderer.DrawScreenQuad(context, drawn), true);
  // The delegate ran the shader's one pass rather than reporting success
  // without drawing.
  assert.deepEqual(drawn.log, [ "state:0:0", "data:0:0" ]);
});

test("a null material is refused by the renderer as it is by the blitter", () =>
{
  const renderer = new Tr2Renderer();
  const context = stubContext();

  renderer.PrepareDeviceResources(context);

  assert.equal(renderer.DrawScreenQuad(context, null), false);
});
