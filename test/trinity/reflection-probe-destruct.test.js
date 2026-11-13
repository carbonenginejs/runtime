import assert from "node:assert/strict";
import test from "node:test";
import { Tr2ReflectionProbe } from "../../npm/dist/trinity/index.js";
import { TriStorageFlags } from "../../npm/dist/global/consts/graphics/index.js";

test("reflection-probe destruction releases all storage, once", t =>
{
  // Tr2ReflectionProbe.cpp:58-61: ReleaseResources(TRISTORAGE_ALL).
  const probe = new Tr2ReflectionProbe();
  const release = t.mock.method(probe, "ReleaseResources");
  probe._initialized = true;
  assert.equal(probe.Destruct(), true);
  assert.equal(probe.Destruct(), false);
  assert.equal(probe._initialized, false);
  assert.deepEqual(release.mock.calls.map(call => call.arguments[0]), [ TriStorageFlags.TRISTORAGE_ALL ]);
});
