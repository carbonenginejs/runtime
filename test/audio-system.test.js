import test from "node:test";
import assert from "node:assert/strict";
import {
  AudEmitter,
  CjsAudioSystem,
  CjsSfxEngine,
} from "../npm/dist/index.js";


function FakeParam()
{
  return { value: 0 };
}

function FakeContext(log)
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
      return { gain: { value: 1, linearRampToValueAtTime: () => log.push("fade") }, connect: () => {}, disconnect: () => {} };
    },
    createPanner()
    {
      const panner = {
        panningModel: "", distanceModel: "", refDistance: 1,
        positionX: FakeParam(), positionY: FakeParam(), positionZ: FakeParam(),
        orientationX: FakeParam(), orientationY: FakeParam(), orientationZ: FakeParam(),
        connect: () => {}, disconnect: () => {}
      };
      log.push(panner);
      return panner;
    },
    createBufferSource()
    {
      const source = {
        buffer: null, loop: false, onended: null,
        connect: () => {},
        start: () => log.push("start"),
        stop: () => { log.push("stop"); source.onended?.(); }
      };
      log.push(source);
      return source;
    }
  };
}


test("CjsAudioSystem realizes an emitter event end to end on a fake AudioContext", async () =>
{
  const log = [];
  const system = new CjsAudioSystem({
    createContext: () => FakeContext(log),
    loadBuffer: async () => ({ fake: "buffer" }),
    audioMetadata: {
      Events: {
        engine_loop: { eventID: 11, maxRadiusAttenuation: 500, isLoop: 1, is2D: 0, isVital: 0, eventsStoppedBy: [], soundbanks: ["ships.bnk"] },
        hit_once: { eventID: 12, maxRadiusAttenuation: 500, isLoop: 0, is2D: 0, isVital: 0, eventsStoppedBy: [], soundbanks: ["ships.bnk"] }
      },
      SoundBanks: { "ships.bnk": { EssentialSoundBank: 0 } },
      WemFileIDs: {}
    }
  });
  system.Attach();
  try
  {
    assert.equal(system.Enable(["ships.bnk"]), true);
    // Catalog-route backend completes bank loads immediately.
    assert.equal(system.manager.GetSoundBankStatus("ships.bnk"), "loaded");

    const emitter = new AudEmitter();
    emitter.SetPosition([1, 0, 0], [0, 1, 0], [10, 0, 0]);
    emitter.Wake();

    const playingID = emitter.SendEvent("engine_loop");
    assert.ok(playingID > 0, "live post returns a real playing id");
    assert.equal(system.backend.GetPlayingCount(), 1);

    // Media resolves async; the source then starts with the loop flag.
    await new Promise(resolve => setImmediate(resolve));
    assert.ok(log.includes("start"), "buffer source started");
    const source = log.find(item => typeof item === "object" && "loop" in item);
    assert.equal(source.loop, true, "repository loop flag reached the source");

    // Position reached the panner.
    const panner = log.find(item => typeof item === "object" && item.positionX);
    assert.equal(panner.positionX.value, 10);
    assert.equal(panner.panningModel, "HRTF");
    assert.deepEqual(
      [panner.orientationX.value, panner.orientationY.value, panner.orientationZ.value],
      [1, 0, 0],
      "effective emitter front reached the panner");

    // Carbon's authored volume control group: the master level RTPC drives
    // the master gain audibly (0..1 user setting).
    system.manager.SetGlobalRTPC("menu_main_master_level", 0.5);
    assert.equal(system.backend.masterGain.gain.value, 0.5, "master volume RTPC maps to the master bus");
    system.backend.SetSfxVolume(0.25);
    assert.equal(system.backend.sfxGain.gain.value, 0.25, "sfx bus volume is independent");

    // Stop fades, halts, and the end-of-event callback clears bookkeeping.
    emitter.StopSound(playingID);
    assert.ok(log.includes("fade"));
    assert.equal(system.backend.GetPlayingCount(), 0, "EventFinishedCallback fired");
    assert.equal(emitter.GetPlayingEvents().size, 0);
  }
  finally
  {
    system.Detach();
  }
});


test("temporary culling preserves authored per-object SFX container state", () =>
{
  const log = [];
  const sfx = new CjsSfxEngine({
    graph: {
      schemaVersion: 1,
      events: {
        step: [ { nodeId: "1" } ],
      },
      nodes: {
        "1": {
          type: "sequence",
          scope: "object",
          children: [
            { nodeId: "2" },
            { nodeId: "3" },
          ],
        },
        "2": { type: "sound", mediaId: "10" },
        "3": { type: "sound", mediaId: "11" },
      },
    },
  });
  const system = new CjsAudioSystem({
    createContext: () => FakeContext(log),
    releaseGameObj: gameObjID => sfx.ReleaseGameObj(gameObjID),
    audioMetadata: {
      Events: {},
      SoundBanks: {},
      WemFileIDs: {},
    },
  });

  system.Attach();
  try
  {
    assert.equal(system.Enable(), true);
    const emitter = new AudEmitter();

    emitter.SetPosition([ 1, 0, 0 ], [ 0, 1, 0 ], [ 0, 0, 0 ]);
    system.AdoptEmitter(emitter);

    assert.equal(
      sfx.ResolveEvent("step", { gameObjID: emitter.ID })[0].mediaID,
      "10",
    );
    emitter.Cull();
    emitter.Wake();
    assert.equal(
      sfx.ResolveEvent("step", { gameObjID: emitter.ID })[0].mediaID,
      "11",
      "Cull/Wake tears down WebAudio nodes without restarting the sequence",
    );

    assert.equal(system.ReleaseEmitter(emitter), true);
    assert.equal(
      sfx.ResolveEvent("step", { gameObjID: emitter.ID })[0].mediaID,
      "10",
      "permanent graph release clears object-scoped selection state",
    );
  }
  finally
  {
    system.Dispose();
  }
});

test("Dispose disables bank state and permits a full later enable", () =>
{
  const log = [];
  let contexts = 0;
  const system = new CjsAudioSystem({
    createContext: () =>
    {
      contexts++;
      return FakeContext(log);
    },
    audioMetadata: {
      Events: {},
      SoundBanks: {
        "ships.bnk": { EssentialSoundBank: 0 },
      },
      WemFileIDs: {},
    },
  });

  system.Attach();
  assert.equal(system.Enable([ "ships.bnk" ]), true);
  assert.equal(system.manager.GetSoundBankStatus("ships.bnk"), "loaded");
  system.Dispose();

  assert.equal(system.manager.GetState(), "disabled");
  assert.deepEqual(system.manager.GetLoadedSoundBanks(), []);

  system.Attach();
  try
  {
    assert.equal(system.Enable([ "ships.bnk" ]), true);
    assert.equal(system.manager.GetSoundBankStatus("ships.bnk"), "loaded");
    assert.equal(contexts, 2, "re-enable creates and initializes a new backend");
  }
  finally
  {
    system.Dispose();
  }
});


test("audioMetadataFromSoundbanksInfo builds the base repository shape", async () =>
{
  const { audioMetadataFromSoundbanksInfo, AudStaticDataRepository } = await import("../npm/dist/index.js");
  const metadata = audioMetadataFromSoundbanksInfo({
    SoundBanksInfo: {
      SoundBanks: [
        {
          Id: "1", ShortName: "ships", Path: "SoundBanks\\ships.bnk",
          Events: [{ Id: "12345", Name: "engine_loop" }],
          Media: [{ Id: "777", ShortName: "engine.wem" }]
        },
        {
          Id: "2", ShortName: "weapons", Path: "SoundBanks\\weapons.bnk",
          Events: [{ Id: "12345", Name: "engine_loop" }, { Id: "22", Name: "fire" }]
        }
      ]
    }
  });
  // Live-posting must-haves are present without optional enrichment.
  assert.deepEqual(metadata.Events.engine_loop.soundbanks, ["ships.bnk", "weapons.bnk"]);
  assert.equal(metadata.Events.engine_loop.eventID, 12345);
  assert.equal(metadata.Events.engine_loop.isLoop, 0, "degraded default without enrichment");
  assert.equal(metadata.WemFileIDs["777"].SoundBank, "ships.bnk");

  const legacy = audioMetadataFromSoundbanksInfo({
    SoundBanksInfo: {
      SchemaVersion: "12",
      SoundbankVersion: "140",
      SoundBanks: [
        {
          Id: "3",
          ShortName: "common",
          Path: "Common.bnk",
          IncludedEvents: [
            {
              Id: "1483003980",
              Name: "Play_TestLoop",
              MaxAttenuation: "100."
            }
          ],
          IncludedMemoryFiles: [
            {
              Id: "839160035",
              ShortName: "loop.wav"
            }
          ]
        }
      ]
    }
  });
  assert.equal(legacy.Events.Play_TestLoop.eventID, 1483003980);
  assert.equal(legacy.Events.Play_TestLoop.maxRadiusAttenuation, 100);
  assert.equal(legacy.WemFileIDs["839160035"].SoundBank, "Common.bnk");

  // Optional enrichment supplies additional culling flags.
  const enriched = audioMetadataFromSoundbanksInfo(
    { SoundBanksInfo: { SoundBanks: [{ Id: "1", Path: "SoundBanks\\ships.bnk", Events: [{ Id: "12345", Name: "engine_loop" }] }] } },
    { Events: { engine_loop: { maxRadiusAttenuation: 250, isLoop: 1 } }, SoundBanks: { "init.bnk": { EssentialSoundBank: 1 } } }
  );
  assert.equal(enriched.Events.engine_loop.isLoop, 1);
  assert.equal(enriched.Events.engine_loop.maxRadiusAttenuation, 250);
  assert.deepEqual(enriched.Events.engine_loop.soundbanks, ["ships.bnk"], "SoundbanksInfo membership preserved");

  // The repository accepts the mapped shape directly.
  const repository = new AudStaticDataRepository();
  repository.Initialize(enriched);
  assert.equal(repository.EventIsLoop("engine_loop"), true);
  assert.equal(repository.GetEventRadiusSq("engine_loop"), 62500);
  assert.equal(repository.SoundBankIsEssential("init.bnk"), true);
  assert.deepEqual(repository.SoundBanksRequiredForEvent("engine_loop"), ["ships.bnk"]);
});


// Contract rewritten 2026-07-19: headless Enable used to report true while
// banks stuck in "loading" forever. Carbon's Enable bails un-enabled when
// Init fails (AudManager.cpp:848-881) and a disabled LoadBank tracks nothing
// (AudManager.cpp:538-575); no backend is that failure, so the manager stays
// a true null manager and known events queue emitter-side for a later wake.
test("CjsAudioSystem without a context is a true null manager; a later backend attachment replays the queued loop", async () =>
{
  const log = [];
  let contextAvailable = false;
  const system = new CjsAudioSystem({
    createContext: () => contextAvailable ? FakeContext(log) : null,
    loadBuffer: async () => ({ fake: "buffer" }),
    audioMetadata: {
      Events: {
        engine_loop: { eventID: 11, maxRadiusAttenuation: 500, isLoop: 1, is2D: 0, isVital: 0, eventsStoppedBy: [], soundbanks: ["ships.bnk"] }
      },
      SoundBanks: { "ships.bnk": { EssentialSoundBank: 0 } },
      WemFileIDs: {}
    }
  });
  system.Attach();
  try
  {
    assert.equal(system.Enable(["ships.bnk"]), false, "Carbon Init-failure semantics: no backend, no enable");
    assert.equal(system.backend, null);
    assert.equal(system.manager.GetState(), "uninitialized");
    assert.equal(system.manager.GetSoundBankStatus("ships.bnk"), "not_loaded", "disabled bank loads track nothing - nothing can stick in loading");
    assert.deepEqual(system.manager.GetLoadedSoundBanks(), []);

    const emitter = new AudEmitter();
    emitter.SetPosition([1, 0, 0], [0, 1, 0], [10, 0, 0]);
    assert.equal(emitter.SendEvent("engine_loop"), 0, "known loop returns the invalid playing id headless");
    assert.equal(emitter.SendEvent("unknown_event"), 0, "unknown event is still a 0 no-op");

    // The context becomes available (user gesture): the same Enable call now
    // initializes, loads the banks, and the wake pass replays the queued loop.
    contextAvailable = true;
    assert.equal(system.Enable(["ships.bnk"]), true, "backend attachment enables the engine");
    assert.equal(system.manager.GetSoundBankStatus("ships.bnk"), "loaded");
    assert.equal(system.backend.GetPlayingCount(), 1, "wake pass replayed the queued loop event");
    assert.equal(emitter.GetPlayingEvents().size, 1);

    await new Promise(resolve => setImmediate(resolve));
    assert.ok(log.includes("start"), "replayed loop reached a real buffer source");
  }
  finally
  {
    system.Detach();
  }
});
