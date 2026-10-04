// Tr2Effect::SetParameter's ten overloads (Tr2Effect.h:93-102) are ten methods
// here: the caller states the type, so a null or a whole float can no longer be
// routed by what it happens to look like.
import { getRegisteredClassName } from "../../npm/dist/global/compose/className.js";
import assert from "node:assert/strict";
import test from "node:test";

import { Tr2Effect } from "../../npm/dist/trinity/shader/Tr2Effect.js";
import { StubTarget } from "../support/stubContext.js";

const className = value => getRegisteredClassName(value.constructor);


test("an empty Tr2TextureAL declares the texture slot that a later texture reuses (Tr2ShadowMap.cpp:41-42, 288)", () =>
{
  // The value-sniffing method sent this null to a provider slot, then appended a
  // second slot when the texture arrived.
  const effect = new Tr2Effect();
  effect.SetParameter_TextureAL("DepthMap", null);
  const slot = effect.GetResourceByName("DepthMap");
  assert.equal(className(slot.GetTextureProvider()), "Tr2TextureReference");

  effect.SetParameter_TextureAL("DepthMap", StubTarget());
  assert.equal(effect.resources.filter(resource => resource.name === "DepthMap").length, 1);
  assert.equal(effect.GetResourceByName("DepthMap"), slot);
});


test("an empty Tr2BufferAL declares a buffer slot, not a texture slot (Tr2PostProcessRenderer.cpp:1200-1217)", () =>
{
  const effect = new Tr2Effect();
  effect.SetParameter_BufferAL("Histogram", null);
  assert.equal(className(effect.GetResourceByName("Histogram")), "Tr2GeometryBufferParameter");
});


test("a whole float is a float, and uint32 stores its bits", () =>
{
  const effect = new Tr2Effect();
  effect.SetParameter("Strength", 1);
  assert.equal(className(effect.FindParameterByName("Strength")), "Tr2FloatParameter");
  assert.equal(effect.FindParameterByName("Strength").value, 1);

  effect.SetParameter_UInt32("FrameIndex", 1);
  const bits = new Float32Array([ effect.FindParameterByName("FrameIndex").value ]);
  assert.equal(new Uint32Array(bits.buffer)[0], 1);
});


test("Vector2 and Vector3 pad into a Vector4 parameter, as Carbon's overloads do", () =>
{
  const effect = new Tr2Effect();
  effect.SetParameter_Vector2("Size", [ 5, 6 ]);
  effect.SetParameter_Vector3("Direction", [ 7, 8, 9 ]);
  assert.equal(className(effect.FindParameterByName("Size")), "Tr2Vector4Parameter");
  assert.deepEqual(Array.from(effect.FindParameterByName("Size").value), [ 5, 6, 0, 0 ]);
  assert.deepEqual(Array.from(effect.FindParameterByName("Direction").value), [ 7, 8, 9, 0 ]);

  // A float2 slot receives only its two components.
  const out = new Float32Array(2);
  effect.FindParameterByName("Size").CopyValueToEffect(0, out, 8);
  assert.deepEqual(Array.from(out), [ 5, 6 ]);
});


test("the Vector4 and matrix overloads set their own parameter classes", () =>
{
  const effect = new Tr2Effect();
  effect.SetParameter_Vector4("Color", [ 1, 2, 3, 4 ]);
  effect.SetParameter_Matrix("World", new Float32Array(16));
  assert.equal(className(effect.FindParameterByName("Color")), "Tr2Vector4Parameter");
  assert.equal(className(effect.FindParameterByName("World")), "Tr2Matrix4Parameter");
});
