import test from "node:test";
import assert from "node:assert/strict";
import {
  AudEmitter,
  AudMusicPlayer,
  AudParameter,
  CjsAudioSystem
} from "../../../npm/dist/audio/index.js";

function FakeParam(value = 0)
{
  return { value, linearRampToValueAtTime() {} };
}

function FakeContext()
{
  return {
    currentTime: 0,
    destination: {},
    listener: {
      positionX: FakeParam(), positionY: FakeParam(), positionZ: FakeParam(),
      forwardX: FakeParam(), forwardY: FakeParam(), forwardZ: FakeParam(),
      upX: FakeParam(), upY: FakeParam(), upZ: FakeParam()
    },
    createGain() { return { gain: FakeParam(1), connect() {}, disconnect() {} }; },
    createPanner()
    {
      return {
        positionX: FakeParam(), positionY: FakeParam(), positionZ: FakeParam(),
        orientationX: FakeParam(), orientationY: FakeParam(), orientationZ: FakeParam(),
        connect() {}, disconnect() {}
      };
    },
    createBufferSource()
    {
      return { buffer: null, loop: false, onended: null, connect() {}, start() {}, stop() {} };
    }
  };
}

function EmptyMetadata()
{
  return { Events: {}, SoundBanks: {}, WemFileIDs: {} };
}

test("AudParameter binds to its owning object and backend RTPC/switch state remains isolated", () =>
{
  const applied = [];
  const logged = [];
  const switches = [];
  const musicEngine = {
    HandlesEvent: () => false,
    PostEvent() {},
    ExecuteAction() {},
    SetSwitch: (...args) => switches.push(args),
    Process() {},
    Dispose() {}
  };
  const system = new CjsAudioSystem({
    createContext: FakeContext,
    audioMetadata: EmptyMetadata(),
    musicEngine,
    applyRTPC: value => applied.push(value)
  });
  system.Attach();
  try
  {
    system.manager.log = {
      LogSetRTPC: (...args) => logged.push(args),
    };
    system.Enable();
    const first = system.CreateEmitter({ name: "first", position: [ 0, 0, 0 ] });
    const second = system.CreateEmitter({ name: "second", position: [ 1, 0, 0 ] });
    const parameter = new AudParameter();
    parameter.SetValues({ name: "speed", value: 2 });
    first.parameters.push(parameter);
    first.UpdateValues({ property: "parameters" });
    assert.equal(applied.length, 0, "binding does not push the existing value");
    parameter.SetValues({ name: "renamed" });
    assert.equal(applied.length, 0, "name-only changes do not push");
    parameter.SetValues({ value: 3 });
    assert.equal(applied.length, 1);
    assert.equal(applied[0].gameObjID, first.ID);
    assert.deepEqual(logged, [
      [ first.ID, "renamed", 3, 0 ],
    ]);
    assert.equal(system.backend.GetRTPCValue("renamed", first.ID), 3);
    assert.equal(system.backend.GetRTPCValue("renamed", second.ID), undefined);

    first.SetRTPC("manual", 4);
    second.SetRTPC("manual", 9);
    assert.equal(system.backend.GetRTPCValue("manual", first.ID), 4);
    assert.equal(system.backend.GetRTPCValue("manual", second.ID), 9);
    first.SetSwitch("state", "warp");
    assert.equal(switches.length, 0, "ordinary emitter switches do not steer global music");

    const music = new AudMusicPlayer();
    music.Wake();
    music.SetSwitch("music_mood", "combat");
    assert.deepEqual(switches, [ [ "music_mood", "combat", music.ID ] ]);

    system.ReleaseEmitter(first);
    assert.equal(system.backend.GetRTPCValue("manual", first.ID), undefined);
  }
  finally
  {
    system.Detach();
  }
});

test("pre-attachment emitters and plain descriptors can be adopted after enable", () =>
{
  const orphan = new AudEmitter();
  orphan.SetValues({ name: "orphan", position: [ 2, 3, 4 ] });
  const system = new CjsAudioSystem({
    createContext: FakeContext,
    audioMetadata: EmptyMetadata()
  });
  system.Attach();
  try
  {
    system.Enable();
    assert.equal(system.manager.GetAudioEmitter(orphan.ID), null);
    assert.equal(system.AdoptEmitter(orphan), orphan);
    assert.equal(system.AdoptEmitter(orphan), orphan, "adoption is idempotent");
    assert.equal(system.manager.GetAudioEmitter(orphan.ID), orphan);

    const created = system.CreateEmitter({
      name: "sof_engine",
      prefix: "ship_",
      position: [ 5, 6, 7 ],
      attenuationScalingFactor: 2
    });
    assert.equal(created.name, "sof_engine");
    assert.equal(created.eventPrefix, "ship_");
    assert.deepEqual(Array.from(created.position), [ 5, 6, 7 ]);
    assert.equal(created.scalingFactor, 2);
  }
  finally
  {
    system.Detach();
  }
});
