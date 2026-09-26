import assert from "node:assert/strict";
import test from "node:test";

import { Tr2Effect } from "../../npm/dist/trinity/shader/Tr2Effect.js";
import { Tr2RuntimeGpuBuffer } from "../../npm/dist/trinity/core/device/Tr2RuntimeGpuBuffer.js";
import { Tr2BufferALStub, Tr2TextureALStub } from "../../npm/dist/trinityal/stub/index.js";

// Tr2Effect::SetParameter( name, const Tr2BufferAL& ) (Tr2Effect.cpp:2228-2255):
// a buffer lands in a geometry buffer parameter holding a runtime GPU buffer,
// never in a texture slot, and a later set reuses both.
test("SetParameter binds an AL buffer through a geometry buffer parameter", () =>
{
  const effect = new Tr2Effect();
  const first = new Tr2BufferALStub();
  const second = new Tr2BufferALStub();

  effect.SetParameter("Exposure", first);

  const parameter = effect.GetResourceByName("Exposure");
  assert.equal(parameter.constructor.name, "Tr2GeometryBufferParameter");
  const held = parameter.GetGpuBuffer();
  assert.ok(held instanceof Tr2RuntimeGpuBuffer);
  assert.equal(held.GetGpuBuffer(0), first);

  effect.SetParameter("Exposure", second);
  assert.equal(effect.GetResourceByName("Exposure"), parameter, "the slot is reused");
  assert.equal(parameter.GetGpuBuffer(), held, "and so is its runtime buffer");
  assert.equal(held.GetGpuBuffer(0), second);

  // TEMP_PARAM's reset (Tr2PostProcessRenderer.cpp:132-150) is a
  // default-constructed buffer; null is that value and clears the SAME slot.
  effect.SetParameter("Exposure", null);
  assert.equal(effect.GetResourceByName("Exposure"), parameter, "no texture slot replaces it");
  assert.equal(held.GetGpuBuffer(0), null);
});

// Tr2Effect::SetParameter( name, const Tr2TextureAL& ) (Tr2Effect.cpp:2191-2226):
// a raw texture is wrapped in a Tr2TextureReference, because the slot binds
// through a provider's GetTexture(). Passing the texture itself left a slot
// whose provider had no GetTexture, and the first GPU draw threw.
test("SetParameter wraps an AL texture in a reused texture reference", () =>
{
  const effect = new Tr2Effect();
  const first = new Tr2TextureALStub();
  const second = new Tr2TextureALStub();

  effect.SetParameter("InputTexture", first);

  const parameter = effect.GetResourceByName("InputTexture");
  const reference = parameter.GetTextureProvider();
  assert.equal(reference.constructor.name, "Tr2TextureReference");
  assert.equal(reference.GetTexture(), first);

  effect.SetParameter("InputTexture", second);
  assert.equal(parameter.GetTextureProvider(), reference, "the reference is reused");
  assert.equal(reference.GetTexture(), second);

  effect.SetParameter("InputTexture", null);
  assert.equal(parameter.GetTextureProvider(), reference, "TEMP_PARAM's reset empties it");
  assert.equal(reference.GetTexture(), null);
});
