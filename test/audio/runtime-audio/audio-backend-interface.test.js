import test from "node:test";
import assert from "node:assert/strict";
import { CjsWebAudioSoundEngine, CjsWwiseSoundEngineStub, ICjsWwiseSoundEngine } from "../../../npm/dist/audio/index.js";
import { CjsSchema } from "../../../npm/dist/global/schema/index.js";

const METHODS = Object.getOwnPropertyNames(ICjsWwiseSoundEngine.prototype).filter(name => name !== "constructor");

test("both backends implement every ICjsWwiseSoundEngine method themselves", () =>
{
  // An inherited method would be the interface's throwing default.
  assert.equal(METHODS.length, 28);
  for (const Backend of [ CjsWebAudioSoundEngine, CjsWwiseSoundEngineStub ])
  {
    const missing = METHODS.filter(name => !Object.hasOwn(Backend.prototype, name));
    assert.deepEqual(missing, [], `${Backend.name} lacks ${missing.join(", ")}`);
  }
});

test("callback cancellation and authored Stops are required backend contracts", () =>
{
  const backend = new ICjsWwiseSoundEngine();
  for (const method of [ "CancelEventCallbackGameObject", "HandlesEventStops" ])
  {
    assert.ok(METHODS.includes(method));
    assert.equal(CjsSchema.getMethod(ICjsWwiseSoundEngine, method).impl.status, "abstract");
    assert.throws(() => backend[method](71), new RegExp(`${method} must be overridden`));
  }
});

test("authored Stop capability requires an explicit true from WebAudio and is false headlessly", () =>
{
  const stub = new CjsWwiseSoundEngineStub();
  assert.equal(stub.HandlesEventStops("stop"), false);
  assert.equal(new CjsWebAudioSoundEngine().HandlesEventStops("stop"), false);
  const received = [];
  const results = new Map([ [ "stop", true ], [ "truthy", 1 ], [ "false", false ] ]);
  const backend = new CjsWebAudioSoundEngine({ hasEventStops: name =>
  {
    received.push(name);
    return results.get(name);
  } });
  for (const [ name, expected ] of [ [ "stop", true ], [ "truthy", false ], [ "false", false ], [ 9, false ] ])
  {
    assert.equal(backend.HandlesEventStops(name), expected);
  }
  assert.deepEqual(received, [ "stop", "truthy", "false", "9" ]);
});

test("the headless backend keeps coherent state and makes no sound", () =>
{
  const backend = new CjsWwiseSoundEngineStub();
  const finished = [];
  const emitter = { EventFinishedCallback: playingID => finished.push(playingID) };

  assert.equal(backend.Init(), true);
  let loaded = null;
  backend.LoadBank("Init.bnk", ok => { loaded = ok; });
  assert.equal(loaded, true);
  assert.equal(backend.IsBankLoaded("Init.bnk"), true);

  assert.equal(backend.PostEvent(1, 7, 0, emitter, "play"), 0, "an unregistered game object posts nothing");
  backend.RegisterGameObj(7);
  const playingID = backend.PostEvent(1, 7, 0, emitter, "play");
  assert.ok(playingID > 0);
  assert.equal(backend.SeekOnEventMs(playingID, 250), true);
  assert.equal(backend.GetSourcePlayPosition(playingID), 250);

  assert.equal(backend.SetRTPCValue("speed", 2, 7), true);
  backend.SetSwitch("surface", "metal", 7);
  assert.equal(backend.GetGameObject(7).rtpcs.get("speed"), 2);
  assert.equal(backend.GetGameObject(7).switches.get("surface"), "metal");
  assert.equal(backend.SetGlobalRTPCValue("volume", 0.5), true);
  assert.equal(backend.GetGlobalRTPCValue("volume"), 0.5);
  backend.SetGlobalState("phase", "combat");
  assert.equal(backend.GetGlobalState("phase"), "combat");

  backend.ExecuteActionOnPlayingID("stop", playingID);
  assert.deepEqual(finished, [ playingID ]);
  assert.equal(backend.GetSourcePlayPosition(playingID), -1);

  const second = backend.PostEvent(2, 7, 0, emitter, "loop");
  backend.UnregisterGameObj(7);
  assert.deepEqual(finished, [ playingID, second ], "unregistering ends the object's events");
  assert.equal(backend.GetGameObject(7), null);

  backend.ClearBanks();
  assert.equal(backend.IsBankLoaded("Init.bnk"), false);
  assert.equal(backend.InitSpatialAudioGeometry({}), false, "spatial geometry is not ported");
});
