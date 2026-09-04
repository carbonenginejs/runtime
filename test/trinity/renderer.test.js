import assert from "node:assert/strict";
import test from "node:test";

import { PER_FRAME_PS, PER_FRAME_VS, Tr2Renderer } from "../../npm/dist/trinity/core/index.js";

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
