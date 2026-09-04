import assert from "node:assert/strict";
import test from "node:test";

import { CONSTANT_SLOTS, PER_FRAME_PS, PER_FRAME_VS, Tr2Renderer } from "../../npm/dist/trinity/core/index.js";

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

test("the reverse map answers what a declared register means", () =>
{
  // No Carbon counterpart: Carbon never asks, because each producer names the
  // slot it fills. Reading a pipeline's DECLARED bindings runs the other way.
  assert.equal(CONSTANT_SLOTS[PER_FRAME_VS], "perFrameVS");
  assert.equal(CONSTANT_SLOTS[PER_FRAME_PS], "perFramePS");
  assert.equal(CONSTANT_SLOTS[3], "perObjectVS");
  assert.equal(CONSTANT_SLOTS[4], "perObjectPS");
  assert.equal(CONSTANT_SLOTS[7], undefined, "seven is not one of Carbon's");
});
