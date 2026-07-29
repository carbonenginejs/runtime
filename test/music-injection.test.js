import test from "node:test";
import assert from "node:assert/strict";
import { CjsAudioSystem } from "../npm/dist/index.js";

function FakeParam(value = 0)
{
  return { value, linearRampToValueAtTime() {} };
}

function FakeContext()
{
  return {
    currentTime: 0,
    destination: { name: "destination" },
    listener: {
      positionX: FakeParam(), positionY: FakeParam(), positionZ: FakeParam(),
      forwardX: FakeParam(), forwardY: FakeParam(), forwardZ: FakeParam(),
      upX: FakeParam(), upY: FakeParam(), upZ: FakeParam()
    },
    createGain()
    {
      return { gain: FakeParam(1), connect() {}, disconnect() {} };
    },
    createPanner()
    {
      return {
        positionX: FakeParam(), positionY: FakeParam(), positionZ: FakeParam(),
        connect() {}, disconnect() {}
      };
    }
  };
}

function CustomMusicEngine(log)
{
  const active = new Map();
  return {
    HandlesEvent: eventName => eventName === "play_my_music",
    PostEvent(eventName, playingID, onFinished)
    {
      log.push([ "post", eventName, playingID ]);
      active.set(playingID, onFinished);
      return true;
    },
    ExecuteAction(action, playingID, fade)
    {
      log.push([ "action", action, playingID, fade ]);
      const finished = active.get(playingID);
      active.delete(playingID);
      finished?.();
    },
    Process() { log.push([ "process" ]); },
    SetMusicVolume(value) { log.push([ "volume", value ]); },
    Dispose() { log.push([ "dispose" ]); }
  };
}

test("custom music engines are created only at gesture-time enable and accept arbitrary music events", () =>
{
  const log = [];
  let factoryCalls = 0;
  const system = new CjsAudioSystem({
    createContext: FakeContext,
    audioMetadata: { Events: {}, SoundBanks: {}, WemFileIDs: {} },
    createMusicEngine({ context, destination })
    {
      factoryCalls++;
      assert.ok(context);
      assert.ok(destination);
      return CustomMusicEngine(log);
    }
  });
  assert.equal(factoryCalls, 0, "construction stays headless");
  system.Attach();
  try
  {
    assert.equal(system.Enable(), true);
    assert.equal(factoryCalls, 1);
    const finished = [];
    const playingID = system.PostMusicEvent("play_my_music", id => finished.push(id));
    assert.ok(playingID > 0);
    assert.equal(system.backend.GetPlayingCount(), 1);
    system.Process(0);
    assert.equal(system.StopMusicEvent(playingID, 250), true);
    assert.deepEqual(finished, [ playingID ]);
    assert.equal(system.backend.GetPlayingCount(), 0);

    const disabled = system.PostMusicEvent(
      "play_my_music",
      id => finished.push(id)
    );
    system.Disable();
    assert.ok(
      log.some(entry =>
        entry[0] === "action"
        && entry[1] === "stop"
        && entry[2] === disabled
        && entry[3] === 0),
      "disable stops direct music outside prioritized emitters"
    );
    assert.ok(finished.includes(disabled));
    assert.equal(system.backend.GetPlayingCount(), 0);

    const replacement = CustomMusicEngine(log);
    system.SetMusicEngine(replacement);
    assert.equal(log.filter(entry => entry[0] === "dispose").length, 1, "the replaced engine is disposed");
  }
  finally
  {
    system.Dispose();
  }
});

test("a failed headless enable never invokes the custom music factory", () =>
{
  let calls = 0;
  const system = new CjsAudioSystem({
    audioMetadata: { Events: {}, SoundBanks: {}, WemFileIDs: {} },
    createMusicEngine() { calls++; return CustomMusicEngine([]); }
  });
  system.Attach();
  try
  {
    assert.equal(system.Enable(), false);
    assert.equal(calls, 0);
  }
  finally
  {
    system.Detach();
  }
});
