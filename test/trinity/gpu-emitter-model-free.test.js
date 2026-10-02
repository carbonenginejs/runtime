import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { IInitialize, INotify } from "../../npm/dist/global/blue/index.js";
import { Tr2GpuSharedEmitter, Tr2GpuUniqueEmitter, ITr2GenericEmitter } from "../../npm/dist/trinity/index.js";

test("real pillar GPU emitter initializes and Setup hashes copied structs exactly once on CPU", () =>
{
  const values = JSON.parse(readFileSync(new URL("../support/gpuEmitterAsset.json", import.meta.url), "utf8")).object;
  const emitter = CjsSchema.from(values._type, values);
  assert.ok(emitter instanceof Tr2GpuUniqueEmitter);
  assert.equal(emitter.attractorStrength, -100);
  assert.equal(emitter.GetRevision() > 0, true);
  const control = CjsSchema.from(values._type, values, { initialize: false, notify: false });
  assert.equal(control.GetRevision(), 0, "negative control: suppressed lifecycle leaves parameter cache unbuilt");
  const calls = [];
  const updateHash = emitter.UpdateHash;
  const generateID = emitter.GenerateID;
  emitter.UpdateHash = function () { calls.push("hash"); return updateHash.call(this); };
  emitter.GenerateID = function () { calls.push("id"); return generateID.call(this); };
  const revision = emitter.GetRevision();
  emitter.Setup(emitter.rate, { ...emitter._emitter, positionPrevious: [7, 8, 9] }, {
    ...emitter._params, attractorPosition: [1, 2, 3], attractorStrength: -125
  });
  assert.deepEqual(calls, ["hash", "id"]);
  assert.deepEqual(Array.from(emitter._emitter.positionPrevious), [7, 8, 9]);
  assert.deepEqual(Array.from(emitter._params.attractorPosition), [1, 2, 3]);
  assert.equal(emitter._params.attractorStrength, -125);
  assert.equal(emitter.GetRevision(), revision + 1);
  emitter.OnModified();
  assert.deepEqual(calls, ["hash", "id", "hash", "id"],
    "negative control: the old extra settle hashes and generates identity twice");
  assert.equal("SetValues" in emitter, false);
  assert.deepEqual(mappedInterfaces(Tr2GpuSharedEmitter), new Set([Tr2GpuSharedEmitter, IInitialize, INotify, ITr2GenericEmitter]));
  assert.deepEqual(mappedInterfaces(Tr2GpuUniqueEmitter), new Set([Tr2GpuUniqueEmitter, Tr2GpuSharedEmitter, IInitialize, INotify, ITr2GenericEmitter]));
});
