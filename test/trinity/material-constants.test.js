// Tr2Material::UpdateConstants copies each dynamic parameter into the stage's
// constant mirror at its BYTE offset (Tr2Material.cpp). The mirror is bytes;
// the parameters write float components, so they must see a float view of
// those bytes. Handed the byte mirror, each float landed as one truncated byte
// over the container default, and every dynamic parameter ran at its default.
import assert from "node:assert/strict";
import { test } from "node:test";

import { Tr2Material, Tr2FloatParameter, Tr2Vector4Parameter } from "../../npm/dist/trinity/shader/index.js";

test("dynamic parameters land in the constant mirror as whole floats", () =>
{
  const material = new Tr2Material();
  const mirror = new Uint8Array(32);
  new Float32Array(mirror.buffer).set([ 0.6, 1.6, 0.05, 0.5, 3, 3, 0, 0 ]); // container defaults

  const intensity = new Tr2FloatParameter();
  intensity.SetValue(0.0008);
  const modifier = new Tr2FloatParameter();
  modifier.SetValue(-3);
  const vector = new Tr2Vector4Parameter();
  vector.SetValue([ 1, 2, 3, 4 ]);

  const uploaded = new Uint8Array(32);
  const input = {
    constantBuffer: { Lock: () => ({ result: 0, data: uploaded }), Unlock: () => 0 },
    constantBufferDirty: true,
    constantMirror: mirror,
    shaderParameters: [
      { sourceValue: intensity, registerIndex: 8, registerCount: 4 },   // c0.z
      { sourceValue: modifier, registerIndex: 20, registerCount: 4 }    // c1.y
    ],
    shaderParametersWithNotification: [
      { sourceValue: vector, registerIndex: 16, registerCount: 4 }      // c1.x only: its byte budget is 4
    ]
  };

  assert.equal(material.UpdateConstants(1, input, false, {}), true);

  const floats = Array.from(new Float32Array(uploaded.buffer));
  assert.equal(floats[2], Math.fround(0.0008), "intensity is the template's, not the default with a stray low byte");
  assert.equal(floats[5], -3, "the negative modifier survives whole");
  assert.equal(floats[4], 1, "a vector is clamped to its register byte budget");
  assert.deepEqual(floats.slice(0, 2), [ Math.fround(0.6), Math.fround(1.6) ], "neighbouring constants are untouched");
});
