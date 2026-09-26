// God rays read FlareOcclusionBuffer at a lens flare's BACKGROUND slot, which
// the flare allocates on its first occlusion query and publishes through the
// global LensflareFxOccScale as float bits (EveLensflare.cpp:168-171, 330-337;
// Tr2OcclusionBuffer EveOccluder.cpp:24-39, 93-122). Without a lens flare
// Carbon draws no god rays.
import assert from "node:assert/strict";
import { test } from "node:test";

import { EveLensflare, Tr2OcclusionBuffer } from "../../npm/dist/trinity/index.js";
import { Tr2VariableStore } from "../../npm/dist/trinity/core/index.js";
import { StubContext } from "../support/stubContext.js";

const bits = values => Array.from(new Uint32Array(Float32Array.from(values).buffer));

test("a lens flare allocates Carbon's slots and publishes them as LensflareFxOccScale bits", () =>
{
  const lensflare = new EveLensflare();
  const context = StubContext();

  lensflare.RunOcclusionQueries(context, null);
  lensflare.Update(0, 0);

  // Four 13-word slots pushed 0, 13, 26, 39 and popped from the back: the
  // foreground takes 39, the background 26 (cpp:34-35, 118-121).
  assert.equal(lensflare.occlusionOffset, 39);
  assert.equal(lensflare.backgroundOcclusionOffset, 26);
  assert.deepEqual(bits(Tr2VariableStore.GlobalStore().FindVariable("LensflareFxOccScale").GetValue()), [ 39, 26, 0, 0 ]);

  // Both new slots are queued for the Clear compute, which writes visibility 1.0.
  assert.deepEqual(Tr2OcclusionBuffer.getInstance().clear.slice(-2), [ 39, 26 ]);
  assert.equal(Tr2OcclusionBuffer.getOccluderOffset(39, 1), 39 + 5 + 2);
  assert.equal(Tr2OcclusionBuffer.getOccluderOffset(null, 1), 0);

  // A second query keeps the slots it has.
  lensflare.RunOcclusionQueries(context, null);
  assert.equal(lensflare.backgroundOcclusionOffset, 26);
});

test("FlareOcclusionBuffer is registered as a GPU-buffer global by the occlusion buffer", () =>
{
  const variable = Tr2VariableStore.GlobalStore().FindVariable("FlareOcclusionBuffer");
  assert.equal(variable.GetValue(), Tr2OcclusionBuffer.getInstance().buffer);
});

test("a destroyed lens flare returns its slots, as Carbon's Offset deleter does", () =>
{
  const occlusionBuffer = Tr2OcclusionBuffer.getInstance();
  const lensflare = new EveLensflare();

  lensflare.RunOcclusionQueries(StubContext(), null);
  const taken = [ lensflare.occlusionOffset, lensflare.backgroundOcclusionOffset ];
  const freeBefore = occlusionBuffer.free.length;

  lensflare.Destroy();

  assert.equal(occlusionBuffer.free.length, freeBefore + 2);
  assert.deepEqual(occlusionBuffer.free.slice(-2), taken);
  assert.equal(lensflare.occlusionOffset, null);
});
