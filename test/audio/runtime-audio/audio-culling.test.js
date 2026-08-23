import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema } from "../../../npm/dist/global/schema/index.js";
import {
  AudEmitter,
  AudGameObjResource,
  AudListener,
  AudManager,
  AudStaticDataRepository,
  SoundPrioritization
} from "../../../npm/dist/audio/index.js";


function makeWorld()
{
  const repository = new AudStaticDataRepository();
  repository.Initialize({
    Events: {
      engine_loop: { eventID: 1, maxRadiusAttenuation: 100, isLoop: 1, is2D: 0, isVital: 0, eventsStoppedBy: [], soundbanks: ["ships.bnk"] },
      hit_once: { eventID: 2, maxRadiusAttenuation: 100, isLoop: 0, is2D: 0, isVital: 0, eventsStoppedBy: [], soundbanks: ["ships.bnk"] }
    },
    SoundBanks: { "ships.bnk": { EssentialSoundBank: 0 } },
    WemFileIDs: {}
  });
  const prioritization = new SoundPrioritization();
  AudGameObjResource.staticDataRepository = repository;
  AudGameObjResource.manager = {
    enabled: true,
    audioCullingEnabled: true,
    soundPrioritization: prioritization,
    RegisterGameObject: (id, object) => prioritization.RegisterGameObject(object)
  };
  return { repository, prioritization };
}

function teardown()
{
  AudGameObjResource.manager = null;
  AudGameObjResource.staticDataRepository = null;
  AudGameObjResource.backend = null;
}


test("calculateObjectWeight matches the Carbon formula", () =>
{
  // Muted: FLT_MAX - additionalWeight, everything else ignored.
  const muted = SoundPrioritization.calculateObjectWeight(9, true, true, true, true, true, true, 5, 3, 7, 1, 2, 3, 4, 5, 6);
  assert.equal(muted, 3.4028234663852886e38 - 5);

  // Unmuted: pure subtraction; waitingOneShotWeight applies unconditionally.
  const weight = SoundPrioritization.calculateObjectWeight(
    1000, false, true, true, false, false, false, 10, 2, 7, 50, 400, 200, 100, 999, 12345);
  assert.equal(weight, 1000 - 200 - 400 - 50 - 7 - 10);
});


test("CullAudio keeps the nearest set awake (with Carbon's +1 quirk) and skips muted emitters", () =>
{
  const { prioritization } = makeWorld();
  try
  {
    const listener = new AudListener();
    const emitters = [];
    for (let i = 0; i < 4; i++)
    {
      const emitter = new AudEmitter();
      emitter.SetPosition([1, 0, 0], [0, 1, 0], [i * 10 + 1, 0, 0]);
      // A queued loop keeps the emitter's attenuation radius > 0.
      emitter.Cull?.();
      emitters.push(emitter);
    }
    // Everyone starts culled; posting while culled queues the loop.
    for (const emitter of emitters)
    {
      assert.equal(emitter.PostEvent("engine_loop"), 0);
      assert.deepEqual(emitter.GetEventsOnWake(), ["engine_loop"]);
    }

    prioritization.SetMaxAwakeGameObjects(1);
    prioritization.CullAudio(0);

    // Ascending weight order: listener (FLT_MAX additional weight subtracts to
    // a huge negative) then nearest emitters. Strict > keeps
    // maxAwakeGameObjects + 1 = 2 slots: listener + nearest emitter. The
    // listener itself stays flagged culled - Wake() early-returns for a
    // positionless object (Carbon registers the listener specially at Enable).
    assert.equal(listener.IsCulled(), true, "positionless listener Wake no-ops (faithful)");
    assert.equal(emitters[0].IsCulled(), false, "nearest emitter woke");
    assert.equal(emitters[1].IsCulled(), true);
    assert.equal(emitters[2].IsCulled(), true);

    // Waking replayed the queued loop attempt (bank not loaded -> queue-again
    // path returns 0 but the wake queue was consumed and re-queued via the
    // culled branch only if still culled; awake object retries live post).
    assert.equal(emitters[0].GetEventsOnWake().length, 0);

    // Muted emitters never wake, even when nearest.
    emitters[0].Mute();
    assert.equal(emitters[0].IsCulled(), true, "muting force-culls");
    prioritization.CullAudio(1);
    assert.equal(emitters[0].IsCulled(), true, "muted emitter stays culled");
    assert.equal(emitters[1].IsCulled(), false, "next emitter takes the slot");
  }
  finally
  {
    teardown();
  }
});

test("missing attenuation metadata cannot silence a one-shot at the listener", () =>
{
  const repository = new AudStaticDataRepository();
  const prioritization = new SoundPrioritization();
  const posted = [];

  repository.Initialize({
    Events: {
      authored_shot: {
        eventID: 7,
        maxRadiusAttenuation: 0,
        isLoop: 0,
        is2D: 0,
        isVital: 0,
        eventsStoppedBy: [],
        soundbanks: [ "common.bnk" ],
      },
    },
    SoundBanks: { "common.bnk": { EssentialSoundBank: 0 } },
    WemFileIDs: {},
  });
  AudGameObjResource.staticDataRepository = repository;
  AudGameObjResource.manager = {
    enabled: true,
    audioCullingEnabled: true,
    soundPrioritization: prioritization,
    RegisterGameObject() {},
    GetSoundBankStatus: () => "loaded",
    LogPostEvent() {},
  };
  AudGameObjResource.backend = {
    RegisterGameObj() {},
    SetPosition() {},
    SetScalingFactor() {},
    PostEvent(eventID)
    {
      posted.push(eventID);
      return 91;
    },
  };

  try
  {
    const emitter = new AudEmitter();

    emitter.SetPlacement(
      [ 0, 0, 1 ],
      [ 0, 1, 0 ],
      [ 0, 0, 0 ],
    );
    assert.equal(emitter.PostEvent("authored_shot"), 0);
    assert.equal(emitter.GetWaitingOneShot(), "authored_shot");

    emitter.SetDistanceSqFromListener(0);
    emitter.CalculateCullingWeight(0);
    assert.equal(emitter.listenerInRange, true);

    emitter.Wake();
    assert.deepEqual(posted, [ 7 ]);
    assert.equal(emitter.GetWaitingOneShot(), "");
    assert.equal(emitter.GetPlayingEvents().get(91), "authored_shot");
  }
  finally
  {
    teardown();
  }
});


test("attenuation normalization remaps without clamping", () =>
{
  const { prioritization } = makeWorld();
  try
  {
    const emitter = new AudEmitter();
    emitter.SetPosition([1, 0, 0], [0, 1, 0], [0, 0, 0]);
    emitter.RegisterWwiseObject();
    emitter.normalizeAttenuationScaling = true;
    // Defaults: domain [30, 9000] -> range [0.4, 3.5]. Input 30 -> 0.4.
    assert.equal(emitter.SetAttenuationScalingFactor(30), true);
    assert.ok(Math.abs(emitter.scalingFactor - 0.4) < 1e-6);
    // Input 9000 -> 3.5.
    emitter.SetAttenuationScalingFactor(9000);
    assert.ok(Math.abs(emitter.scalingFactor - 3.5) < 1e-6);
    void prioritization;
  }
  finally
  {
    teardown();
  }
});


test("AudioCurveSetDriver falls back to the curve until the RTPC exists", async () =>
{
  const { AudioCurveSetDriver } = await import("../../../npm/dist/audio/index.js");
  const driver = AudioCurveSetDriver.from({ audioParameterName: "boost" });
  driver.fallbackCurve = { GetValueAt: time => time * 2 };
  // Headless: invalid RTPC -> fallback curve sampled at time.
  assert.equal(driver.GetCurveSetTime(3), 6);
  AudGameObjResource.manager = {
    enabled: true,
    GetParameterInfo: () => ({ parameterValue: 42, parameterExists: true })
  };
  try
  {
    assert.equal(driver.GetCurveSetTime(3), 42, "live RTPC wins once it exists");
    assert.equal(driver.IsValid(), true);
  }
  finally
  {
    teardown();
  }
});

test("AudManager refreshes monitored RTPC values after each enabled render", async () =>
{
  const { AudManager } = await import("../../../npm/dist/audio/index.js");
  const repository = new AudStaticDataRepository();
  const order = [];
  let value = 17;

  repository.Initialize({ Events: {}, SoundBanks: {}, WemFileIDs: {} });
  AudGameObjResource.staticDataRepository = repository;
  AudGameObjResource.backend = {
    Init: () => true,
    LoadBank: (_name, callback) => callback(true),
    RenderAudio: () => order.push("render"),
    GetGlobalRTPCValue(name)
    {
      order.push(`query:${name}`);
      return value;
    },
  };
  const manager = new AudManager();
  AudGameObjResource.manager = manager;

  try
  {
    manager.Enable([]);
    manager.RegisterParameter("boost");
    manager.Process(0);
    assert.deepEqual(order, [ "render", "query:boost" ]);
    assert.deepEqual(manager.GetParameterInfo("boost"), {
      parameterValue: 17,
      parameterExists: true,
      watchers: 1,
    });

    value = undefined;
    manager.Process(1);
    assert.equal(manager.GetParameterInfo("boost").parameterExists, false);
    assert.equal(
      manager.GetParameterInfo("boost").parameterValue,
      0,
      "Carbon resets a missing monitored RTPC query to its zero-initialized value",
    );
  }
  finally
  {
    teardown();
  }
});

test("AudioCurveSetDriver deterministically releases its monitored watcher", async () =>
{
  const { AudioCurveSetDriver } = await import("../../../npm/dist/audio/index.js");
  const repository = new AudStaticDataRepository();

  repository.Initialize({ Events: {}, SoundBanks: {}, WemFileIDs: {} });
  AudGameObjResource.staticDataRepository = repository;
  AudGameObjResource.backend = {
    Init: () => true,
    LoadBank: (_name, callback) => callback(true),
  };
  const manager = new AudManager();
  AudGameObjResource.manager = manager;

  try
  {
    manager.Enable([]);
    const first = AudioCurveSetDriver.from({
      audioParameterName: "boost",
    });
    const second = AudioCurveSetDriver.from({
      audioParameterName: "boost",
    });

    first.Initialize();
    first.Initialize();
    second.Initialize();
    assert.equal(manager.GetParameterInfo("boost").watchers, 2);

    first.Dispose();
    first.Dispose();
    assert.equal(manager.GetParameterInfo("boost").watchers, 1);

    second.SetAudioParameterName("speed");
    assert.equal(manager.GetParameterInfo("boost"), null);
    assert.equal(manager.GetParameterInfo("speed").watchers, 1);

    second.Dispose();
    assert.equal(manager.GetParameterInfo("speed"), null);
  }
  finally
  {
    teardown();
  }
});


test("AudManager lifecycle: enable, async bank load, deferred-event flush with bypassed prefix", async () =>
{
  const { AudManager } = await import("../../../npm/dist/audio/index.js");
  const repository = new AudStaticDataRepository();
  repository.Initialize({
    Events: { fire: { eventID: 7, maxRadiusAttenuation: 50, isLoop: 0, is2D: 0, isVital: 0, eventsStoppedBy: [], soundbanks: ["weapons.bnk"] } },
    SoundBanks: { "weapons.bnk": { EssentialSoundBank: 0 } },
    WemFileIDs: {}
  });
  AudGameObjResource.staticDataRepository = repository;
  const manager = new AudManager();
  AudGameObjResource.manager = manager;
  const posted = [];
  AudGameObjResource.backend = { PostEvent: eventID => (posted.push(eventID), 100 + posted.length) };
  try
  {
    assert.equal(manager.GetStateValue(), 0);
    manager.Enable(["weapons.bnk"]);
    assert.equal(manager.enabled, true);
    assert.equal(manager.GetSoundBankStatus("Init.bnk"), "loading", "enabled-state loads stay loading until the backend load callback fires");
    assert.deepEqual(manager.GetLoadedSoundBanks().sort(), ["Init.bnk", "weapons.bnk"], "loading counts as loaded (Carbon parity)");

    const emitter = new AudEmitter();
    emitter.SetPosition([1, 0, 0], [0, 1, 0], [0, 0, 0]);
    emitter.Wake();
    assert.equal(emitter.IsCulled(), false);

    // Live post against a LOADING bank defers the event on that bank.
    assert.equal(emitter.PostEvent("fire"), 0);
    // LOADING -> LOADED flushes with bypassPrefix=true and live-posts.
    manager.UpdateSoundBankStatus("weapons", "loaded");
    assert.deepEqual(posted, [7], "flush posted the event id");
    assert.equal([...emitter.GetPlayingEvents().values()][0], "fire");
    // A fresh post now goes straight through.
    assert.notEqual(emitter.PostEvent("fire"), 0);
  }
  finally
  {
    teardown();
  }
});

test("permanent unregister purges deferred bank posts while culling preserves them", async () =>
{
  const repository = new AudStaticDataRepository();
  repository.Initialize({
    Events: {
      fire: {
        eventID: 7,
        maxRadiusAttenuation: 50,
        isLoop: 0,
        is2D: 0,
        isVital: 0,
        eventsStoppedBy: [],
        soundbanks: [ "weapons.bnk" ],
      },
    },
    SoundBanks: {
      "weapons.bnk": { EssentialSoundBank: 0 },
    },
    WemFileIDs: {},
  });
  AudGameObjResource.staticDataRepository = repository;
  const posted = [];
  AudGameObjResource.backend = {
    Init: () => true,
    LoadBank() {},
    PostEvent: eventID =>
    {
      posted.push(eventID);
      return 100 + posted.length;
    },
    RegisterGameObj() {},
    UnregisterGameObj() {},
    SetPosition() {},
  };
  const manager = new AudManager();

  AudGameObjResource.manager = manager;

  try
  {
    manager.Enable([ "weapons.bnk" ]);
    const released = new AudEmitter();

    released.SetPosition([ 1, 0, 0 ], [ 0, 1, 0 ], [ 0, 0, 0 ]);
    released.Wake();
    assert.equal(released.PostEvent("fire"), 0);

    manager.RemoveCallbackGameObject(released.ID);
    manager.UnregisterGameObject(released.ID);
    manager.RegisterGameObject(released.ID, released);
    manager.UpdateSoundBankStatus("weapons", "loaded");
    assert.deepEqual(
      posted,
      [],
      "re-adoption cannot revive an event queued before permanent release"
    );

    manager.UnloadBank("weapons.bnk");
    manager.UpdateSoundBankStatus("weapons", "not_loaded");
    manager.LoadBank("weapons.bnk");
    const culled = new AudEmitter();

    culled.SetPosition([ 1, 0, 0 ], [ 0, 1, 0 ], [ 0, 0, 0 ]);
    culled.Wake();
    assert.equal(culled.PostEvent("fire"), 0);
    culled.Cull();
    manager.UpdateSoundBankStatus("weapons", "loaded");
    assert.deepEqual(posted, []);
    culled.SetDistanceSqFromListener(0);
    culled.CalculateCullingWeight();
    culled.Wake();
    assert.deepEqual(
      posted,
      [ 7 ],
      "ordinary Cull/Wake preserves a deferred bank post"
    );
  }
  finally
  {
    teardown();
  }
});

test("AudManager ignores stale asynchronous bank callbacks", async () =>
{
  const { AudManager } = await import("../../../npm/dist/audio/index.js");
  const repository = new AudStaticDataRepository();
  const loads = [];
  const unloads = [];

  repository.Initialize({ Events: {}, SoundBanks: {}, WemFileIDs: {} });
  AudGameObjResource.staticDataRepository = repository;
  AudGameObjResource.backend = {
    LoadBank(name, callback)
    {
      loads.push({ name, callback });
    },
    UnloadBank(name, callback)
    {
      unloads.push({ name, callback });
    }
  };

  const manager = new AudManager();

  AudGameObjResource.manager = manager;

  try
  {
    manager.Enable([]);
    loads.shift().callback(true);

    manager.LoadBank("race.bnk");
    const firstLoad = loads.shift();
    manager.UnloadBank("race.bnk");
    const firstUnload = unloads.shift();
    manager.LoadBank("race.bnk");
    const secondLoad = loads.shift();

    firstUnload.callback();
    firstLoad.callback(true);
    assert.equal(manager.GetSoundBankStatus("race.bnk"), "loading");

    secondLoad.callback(true);
    assert.equal(manager.GetSoundBankStatus("race.bnk"), "loaded");

    manager.UnloadBank("race.bnk");
    const secondUnload = unloads.shift();
    manager.LoadBank("race.bnk");
    const thirdLoad = loads.shift();
    manager.UnloadBank("race.bnk");
    const thirdUnload = unloads.shift();

    secondUnload.callback();
    thirdLoad.callback(true);
    assert.equal(manager.GetSoundBankStatus("race.bnk"), "unloading");

    thirdUnload.callback();
    assert.equal(manager.GetSoundBankStatus("race.bnk"), "not_loaded");
  }
  finally
  {
    teardown();
  }
});


test("StretchAudio projects the listener onto the beam segment", async () =>
{
  const { AudManager, StretchAudio } = await import("../../../npm/dist/audio/index.js");
  const manager = new AudManager();
  const repository = new AudStaticDataRepository();
  repository.Initialize({ Events: {}, SoundBanks: {}, WemFileIDs: {} });
  AudGameObjResource.staticDataRepository = repository;
  AudGameObjResource.manager = manager;
  // Minimal backend so Enable succeeds: a true-null (backendless) manager
  // stays un-enabled by contract, and this test wants the enabled premise.
  AudGameObjResource.backend = {};
  try
  {
    manager.Enable([]);
    const listener = new AudListener();
    listener.SetPosition([0, 1, 0], [0, 0, 1], [5, 10, 0]);
    manager.RegisterGameObject(listener.GetID(), listener);

    const stretch = new StretchAudio();
    stretch.Initialize();
    stretch.Update([0, 0, 0], [10, 0, 0]);
    // Listener at x=5 above the segment -> projection lands mid-segment.
    assert.deepEqual(Array.from(stretch.stretchEmitter.position), [5, 0, 0]);
    assert.deepEqual(Array.from(stretch.stretchEmitter.front, value => value || 0), [1, 0, 0]);
    assert.deepEqual(Array.from(stretch.stretchEmitter.top, value => value || 0), [0, 0, 1]);
    // Beyond the dest end -> clamped to t=1.
    stretch.Update([0, 0, 0], [3, 0, 0]);
    assert.deepEqual(Array.from(stretch.stretchEmitter.position), [3, 0, 0]);
    // Degenerate segment -> source position.
    stretch.Update([2, 2, 2], [2, 2, 2]);
    assert.deepEqual(Array.from(stretch.stretchEmitter.position), [2, 2, 2]);
    assert.deepEqual(Array.from(stretch.stretchEmitter.front, value => value || 0), [0, 1, 0]);
    assert.deepEqual(Array.from(stretch.stretchEmitter.top, value => value || 0), [0, 0, 1]);
    assert.equal(stretch.FindEmitterByName("stretch_mid_sfx"), stretch.stretchEmitter);
  }
  finally
  {
    teardown();
  }
});


test("headless (no manager): posts queue, RTPC/switch store and return false", () =>
{
  const repository = new AudStaticDataRepository();
  repository.Initialize({
    Events: { ping: { eventID: 9, maxRadiusAttenuation: 10, isLoop: 0, is2D: 0, isVital: 0, eventsStoppedBy: [], soundbanks: ["a.bnk"] } },
    SoundBanks: {},
    WemFileIDs: {}
  });
  AudGameObjResource.staticDataRepository = repository;
  try
  {
    const emitter = new AudEmitter();
    assert.equal(emitter.PostEvent("ping"), 0);
    assert.equal(emitter.GetWaitingOneShot(), "ping", "non-loop queues as waiting one-shot");
    assert.equal(emitter.SetRTPC("speed", 0.5), false);
    assert.equal(emitter.SetSwitch("state", "warp"), false);
    assert.equal(emitter.GetSwitches().get("state"), "warp", "value stored despite false return");
    emitter.SetPrefix("ship_");
    assert.equal(emitter.PostEvent("ping"), 0);
    assert.equal(emitter.GetWaitingOneShot(), "ship_ping", "prefix applied");
    assert.equal(emitter.PostEvent(" ping ", true), 0);
    assert.equal(emitter.GetWaitingOneShot(), "ping", "bypass skips prefix, trim always applies");
  }
  finally
  {
    teardown();
  }
});

test("AudManager exposes portable culling/debug methods and marks native device APIs unsupported", () =>
{
  const manager = new AudManager();
  const repository = new AudStaticDataRepository();
  repository.Initialize({ Events: {}, SoundBanks: {}, WemFileIDs: {} });
  AudGameObjResource.manager = manager;
  AudGameObjResource.staticDataRepository = repository;
  AudGameObjResource.backend = {};
  try
  {
    manager.Enable();
    const emitter = new AudEmitter();
    emitter.SetPosition([ 0, 0, 1 ], [ 0, 1, 0 ], [ 0, 0, 0 ]);
    assert.equal(emitter.IsCulled(), true);
    manager.DisableAudioCulling();
    assert.equal(manager.audioCullingEnabled, false);
    assert.equal(emitter.IsCulled(), false);
    manager.EnableAudioCulling();
    assert.equal(manager.audioCullingEnabled, true);
    assert.ok(manager.GetPrioritizedEmitters().includes(emitter));

    manager.EnableDebugDisplayAllEmitters();
    assert.equal(manager.GetDebugDisplayAllEmitters(), true);
    manager.DisableDebugDisplayAllEmitters();
    assert.equal(manager.GetDebugDisplayAllEmitters(), false);

    new AudManager();
    assert.equal(CjsSchema.getMethod(AudManager, "EnableSpatialAudio").impl.status, "notSupported");
    assert.equal(CjsSchema.getMethod(AudManager, "StartProfilerCapture").impl.status, "notSupported");
    assert.equal(manager.SpatialAudioIsSupported(), false);
    assert.equal(manager.IsProfilerCapturing(), false);
  }
  finally
  {
    teardown();
  }
});
