import test from "node:test";
import assert from "node:assert/strict";
import { CjsAudioBackend, CjsAudioBackendStub, ICjsAudioBackend } from "../../../npm/dist/audio/index.js";

const METHODS = Object.getOwnPropertyNames(ICjsAudioBackend.prototype).filter(name => name !== "constructor");

test("both backends implement every ICjsAudioBackend method themselves", () =>
{
  // An inherited method would be the interface's throwing default.
  assert.equal(METHODS.length, 26);
  for (const Backend of [ CjsAudioBackend, CjsAudioBackendStub ])
  {
    const missing = METHODS.filter(name => !Object.hasOwn(Backend.prototype, name));
    assert.deepEqual(missing, [], `${Backend.name} lacks ${missing.join(", ")}`);
  }
});

test("the headless backend keeps coherent state and makes no sound", () =>
{
  const backend = new CjsAudioBackendStub();
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
