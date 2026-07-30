import test from "node:test";
import assert from "node:assert/strict";
import { AudEmitter, AudUIPlayer, CjsAudioSystem, UI_GAME_OBJ_ID } from "../npm/dist/index.js";

const START_QUANTUM = 128 / 48000;
function Deferred()
{
  let resolve;
  const promise = new Promise(next => { resolve = next; });
  return { promise, resolve };
}

function FakeParam(value = 0)
{
  return { value, linearRampToValueAtTime() {} };
}

function FakeContext()
{
  const context = {
    currentTime: 0,
    destination: {},
    sources: [],
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
        orientationX: FakeParam(), orientationY: FakeParam(), orientationZ: FakeParam(),
        connect() {}, disconnect() {}
      };
    },
    createBufferSource()
    {
      const source = {
        buffer: null,
        loop: false,
        onended: null,
        starts: [],
        stoppedAt: null,
        connect() {},
        disconnect() {},
        start(when = 0, offset = 0, duration)
        {
          source.starts.push({ when, offset, duration });
        },
        stop(when = context.currentTime)
        {
          source.stoppedAt = when;
          source.onended?.();
        }
      };
      context.sources.push(source);
      return source;
    }
  };
  return context;
}

function Metadata()
{
  return {
    Events: {
      dialogue: {
        eventID: 41,
        maxRadiusAttenuation: 1,
        isLoop: 0,
        is2D: 1,
        isVital: 1,
        eventsStoppedBy: [],
        soundbanks: [ "ui.bnk" ]
      }
    },
    SoundBanks: { "ui.bnk": { EssentialSoundBank: 0 } },
    WemFileIDs: {}
  };
}

const tick = () => new Promise(resolve => setImmediate(resolve));

test("AudUIPlayer is the fixed Carbon UI emitter and callbacks survive source replacement", async () =>
{
  const context = FakeContext();
  const system = new CjsAudioSystem({
    createContext: () => context,
    loadBuffer: async () => ({ duration: 10 }),
    audioMetadata: Metadata()
  });
  system.Attach();
  try
  {
    system.Enable([ "ui.bnk" ]);
    const player = new AudUIPlayer();
    player.Wake();
    assert.ok(player instanceof AudEmitter);
    assert.equal(player.ID, UI_GAME_OBJ_ID);
    assert.equal(player.name, "UI");
    assert.ok(player.additionalCullingWeight > 1e30);
    assert.deepEqual(Array.from(player.position), [ 0, 0, 0 ]);

    assert.equal(player.SendEventWithCallback("dialogue"), 0, "a callback is required");
    const completed = [];
    player.eventSenderCallback = eventName => completed.push(eventName);
    const playingID = player.SendEventWithCallback("dialogue");
    assert.ok(playingID > 0);
    assert.equal(player.GetEventPlayPosition(playingID), 0, "pending media has a valid zero position");

    await tick();
    const firstSource = context.sources[0];
    const staleEnded = firstSource.onended;
    context.currentTime = 2;
    assert.equal(
      player.GetEventPlayPosition(playingID),
      Math.round((2 - START_QUANTUM) * 1000),
    );

    assert.equal(player.SeekOnEventMs(playingID, 4000), true);
    assert.equal(context.sources[1].starts[0].offset, 4);
    staleEnded();
    assert.equal(system.backend.GetPlayingCount(), 1, "the replaced source cannot finish the new voice");
    context.currentTime = 3;
    assert.equal(
      player.GetEventPlayPosition(playingID),
      Math.round((5 - START_QUANTUM) * 1000),
    );

    assert.equal(player.SeekOnEventPercent(playingID, 0.5), true);
    assert.equal(context.sources[2].starts[0].offset, 5);
    assert.equal(player.SeekOnEventPercent(playingID, 5000), true, "Carbon accepts out-of-range percentages");
    await tick();
    assert.deepEqual(completed, [ "dialogue" ]);
    assert.equal(player.GetEventPlayPosition(playingID), -1);
    assert.equal(player.GetPlayingEvents().size, 0);
  }
  finally
  {
    system.Detach();
  }
});

test("a pending seek is applied when dialogue media resolves", async () =>
{
  const context = FakeContext();
  const media = Deferred();
  const system = new CjsAudioSystem({
    createContext: () => context,
    loadBuffer: () => media.promise,
    audioMetadata: Metadata()
  });
  system.Attach();
  try
  {
    system.Enable([ "ui.bnk" ]);
    const player = new AudUIPlayer();
    player.Wake();
    const playingID = player.PostDialogueEvent("dialogue");
    assert.equal(player.SeekOnEventPercent(playingID, 0.5), true);
    media.resolve({ duration: 10 });
    await tick();
    assert.equal(context.sources.length, 1);
    assert.equal(context.sources[0].starts[0].offset, 5);
    assert.equal(player.SeekOnEventMs(999999, 10), false);
  }
  finally
  {
    system.Detach();
  }
});
