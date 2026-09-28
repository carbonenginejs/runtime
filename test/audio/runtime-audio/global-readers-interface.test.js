import test from "node:test";
import assert from "node:assert/strict";
import { ICjsAudioGlobalReaders } from "../../../npm/dist/audio/index.js";
import { CjsAudioBackendGlobalReaders } from "../../../src/audio/internal/CjsAudioBackendGlobalReaders.js";

const METHODS = Object.getOwnPropertyNames(ICjsAudioGlobalReaders.prototype).filter(name => name !== "constructor");

test("the backend readers implement every ICjsAudioGlobalReaders method themselves", () =>
{
  assert.equal(METHODS.length, 4);
  const missing = METHODS.filter(name => !Object.hasOwn(CjsAudioBackendGlobalReaders.prototype, name));
  assert.deepEqual(missing, []);
});

test("the backend readers read the backend's global values", () =>
{
  const calls = [];
  const backend = {
    GetGlobalRTPCValue: (name, at) => { calls.push([ "rtpc", name, at ]); return 0.5; },
    GetGlobalRTPCTransitionBoundaries: from => { calls.push([ "rtpcBounds", from ]); return [ 2 ]; },
    GetGlobalStatePropertyWeights: (group, at) => { calls.push([ "state", group, at ]); return [ { state: "on", weight: 1 } ]; },
    GetGlobalStateTransitionBoundaries: from => { calls.push([ "stateBounds", from ]); return [ 3 ]; },
  };
  const readers = new CjsAudioBackendGlobalReaders(backend);

  assert.equal(readers.getGlobalRTPC("speed", 1), 0.5);
  assert.deepEqual(readers.getGlobalRTPCTransitionBoundaries(1), [ 2 ]);
  assert.deepEqual(readers.getGlobalStatePropertyWeights("mix", 1), [ { state: "on", weight: 1 } ]);
  assert.deepEqual(readers.getGlobalStateTransitionBoundaries(1), [ 3 ]);
  assert.deepEqual(calls, [
    [ "rtpc", "speed", 1 ],
    [ "rtpcBounds", 1 ],
    [ "state", "mix", 1 ],
    [ "stateBounds", 1 ],
  ]);
});
