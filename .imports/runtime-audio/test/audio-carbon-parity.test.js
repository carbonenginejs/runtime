import test from "node:test";
import assert from "node:assert/strict";
import {
  AudActionLogCB,
  AudEmitter,
  AudGameObjResource,
  AudGeometry,
  AudManager,
  AudPosition,
  AudStaticDataRepository,
  LISTENER_GAME_OBJ_ID,
  SpatialAudioSettings,
  Tr2AudGeometryData
} from "../npm/dist/index.js";
import { AudObstructionOcclusion } from "../npm/dist/trinity/audio/AudObstructionOcclusion.js";

function ResetAudioSeams()
{
  AudGeometry.ClearAllGeometry();
  AudGameObjResource.manager = null;
  AudGameObjResource.staticDataRepository = null;
  AudGameObjResource.backend = null;
}

test("game-object controls propagate Wwise-compatible value failures", () =>
{
  const repository = new AudStaticDataRepository();
  repository.Initialize({
    Events: {},
    SoundBanks: { "ships.bnk": { EssentialSoundBank: 0 } },
    WemFileIDs: {},
  });
  const manager = new AudManager();

  AudGameObjResource.manager = manager;
  AudGameObjResource.staticDataRepository = repository;
  AudGameObjResource.backend = {
    Init: () => true,
    LoadBank: (_name, callback) => callback(true),
    RegisterGameObj: () => {},
    SetPosition: () => {},
    SetScalingFactor: (_gameObjID, value) =>
      Number.isFinite(Number(value)) && Number(value) > 0,
    SetRTPCValue: (_name, value) => Number.isFinite(Number(value)),
    SetGlobalRTPCValue: (_name, value) => Number.isFinite(Number(value)),
    RenderAudio: () => {},
  };

  try
  {
    manager.Enable([ "ships.bnk" ]);
    const emitter = new AudEmitter();
    emitter.SetPosition([ 0, 0, 1 ], [ 0, 1, 0 ], [ 0, 0, 0 ]);
    emitter.Wake();

    assert.equal(emitter.SetAttenuationScalingFactor(2), true);
    assert.equal(emitter.scalingFactor, 2);
    assert.equal(emitter.SetAttenuationScalingFactor(0), false);
    assert.equal(emitter.scalingFactor, 2);
    assert.equal(emitter.SetRTPC("speed", Infinity), false);
    assert.equal(manager.SetGlobalRTPC("volume", Infinity), false);
  }
  finally
  {
    ResetAudioSeams();
  }
});

test("AudActionLogCB receives Carbon-shaped records from live manager and emitter actions", () =>
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
        soundbanks: [ "ships.bnk" ]
      }
    },
    SoundBanks: { "ships.bnk": { EssentialSoundBank: 0 } },
    WemFileIDs: {}
  });
  const manager = new AudManager();
  const log = new AudActionLogCB();
  const records = [];
  manager.log = log;
  AudGameObjResource.manager = manager;
  AudGameObjResource.staticDataRepository = repository;
  AudGameObjResource.backend = {
    Init: () => true,
    LoadBank: (name, callback) => callback(true),
    RegisterGameObj: () => {},
    SetPosition: () => {},
    PostEvent: () => 42,
    ExecuteActionOnPlayingID: () => {},
    SetSwitch: () => {},
    SetRTPCValue: () => {},
    SetGlobalRTPCValue: () => {},
    SetGlobalState: () => {},
    RenderAudio: () => {}
  };

  try
  {
    manager.Enable([ "ships.bnk" ]);
    const emitter = new AudEmitter();
    emitter.SetPosition([ 0, 0, 1 ], [ 0, 1, 0 ], [ 1, 2, 3 ]);
    emitter.Wake();

    assert.equal(emitter.PostEvent("fire"), 42);
    assert.equal(emitter.SetSwitch("mode", "combat"), true);
    assert.equal(emitter.SetRTPC("speed", 0.5), true);
    assert.equal(manager.SetGlobalRTPC("volume", 0.75), true);
    assert.equal(manager.SetState("music", "danger"), true);
    assert.equal(emitter.ExecuteActionOnPlayingID(42, "stop"), true);

    manager.Process();
    assert.deepEqual(records, [], "Carbon retains records until a callback exists");

    log.RegisterCallback(record => records.push(record));
    manager.Process();

    assert.deepEqual(records.map(record => record[0]), [
      "AudActionRecordPostEvent",
      "AudActionRecordSetSwitch",
      "AudActionRecordSetRTPC",
      "AudActionRecordSetRTPC",
      "AudActionRecordSetState",
      "AudActionRecordExecuteActionOnPlayingID"
    ]);
    assert.deepEqual(records[0].slice(2), [ emitter.ID, 42, 7, "fire" ]);
    assert.deepEqual(records[1].slice(2), [ emitter.ID, "mode", "combat" ]);
    assert.deepEqual(records[2].slice(2), [ emitter.ID, "speed", 0.5, 0 ]);
    assert.deepEqual(records[3].slice(2), [ 0, "volume", 0.75, 0 ]);
    assert.deepEqual(records[4].slice(2), [ "music", "danger" ]);
    assert.deepEqual(records[5].slice(2), [ emitter.ID, 42, "Stop" ]);
  }
  finally
  {
    ResetAudioSeams();
  }
});

test("portable stop relationships dispatch the backend action Wwise normally owns", () =>
{
  const repository = new AudStaticDataRepository();
  repository.Initialize({
    Events: {
      engine_loop: {
        eventID: 7,
        isLoop: 1,
        eventsStoppedBy: [ "engine_stop" ],
        soundbanks: [ "ships.bnk" ]
      },
      engine_stop: {
        eventID: 8,
        isLoop: 0,
        eventsStoppedBy: [],
        soundbanks: [ "ships.bnk" ]
      }
    },
    SoundBanks: { "ships.bnk": { EssentialSoundBank: 0 } },
    WemFileIDs: {}
  });
  const manager = new AudManager();
  const actions = [];
  let nextPlayingID = 40;

  AudGameObjResource.manager = manager;
  AudGameObjResource.staticDataRepository = repository;
  AudGameObjResource.backend = {
    Init: () => true,
    LoadBank: (name, callback) => callback(true),
    RegisterGameObj: () => {},
    SetPosition: () => {},
    PostEvent: () => ++nextPlayingID,
    ExecuteActionOnPlayingID: (...args) => actions.push(args),
    RenderAudio: () => {}
  };

  try
  {
    manager.Enable([ "ships.bnk" ]);
    const emitter = new AudEmitter();
    emitter.SetPosition([ 0, 0, 1 ], [ 0, 1, 0 ], [ 0, 0, 0 ]);
    emitter.Wake();

    assert.equal(emitter.PostEvent("engine_loop"), 41);
    assert.equal(emitter.PostEvent("engine_stop"), 42);
    assert.deepEqual(actions, [
      [ "stop", 41, 1000 ]
    ]);
  }
  finally
  {
    ResetAudioSeams();
  }
});

test("authored Stop programs suppress the duplicate metadata stop dispatch", () =>
{
  const repository = new AudStaticDataRepository();
  repository.Initialize({
    Events: {
      engine_loop: {
        eventID: 7,
        isLoop: 1,
        eventsStoppedBy: [ "engine_stop" ],
        soundbanks: [ "ships.bnk" ],
      },
      engine_stop: {
        eventID: 8,
        isLoop: 0,
        eventsStoppedBy: [],
        soundbanks: [ "ships.bnk" ],
      },
    },
    SoundBanks: { "ships.bnk": { EssentialSoundBank: 0 } },
    WemFileIDs: {},
  });
  const manager = new AudManager();
  const actions = [];
  let nextPlayingID = 40;

  AudGameObjResource.manager = manager;
  AudGameObjResource.staticDataRepository = repository;
  AudGameObjResource.backend = {
    Init: () => true,
    LoadBank: (_name, callback) => callback(true),
    RegisterGameObj: () => {},
    SetPosition: () => {},
    PostEvent: () => ++nextPlayingID,
    HandlesEventStops: eventName => eventName === "engine_stop",
    ExecuteActionOnPlayingID: (...args) => actions.push(args),
    RenderAudio: () => {},
  };

  try
  {
    manager.Enable([ "ships.bnk" ]);
    const emitter = new AudEmitter();

    emitter.SetPosition(
      [ 0, 0, 1 ],
      [ 0, 1, 0 ],
      [ 0, 0, 0 ],
    );
    emitter.Wake();

    assert.equal(emitter.PostEvent("engine_loop"), 41);
    assert.equal(emitter.PostEvent("engine_stop"), 42);
    assert.deepEqual(
      actions,
      [],
      "the ordered backend program owns its authored timing and curve",
    );

    emitter.Cull();
    assert.deepEqual(
      actions[0],
      [ "stop", 41, 3000 ],
      "an authored delayed/excepted Stop does not pre-mark the surviving loop as stopped",
    );
  }
  finally
  {
    ResetAudioSeams();
  }
});

test("AudPosition retains Carbon placement-observer values without browser globals", () =>
{
  const position = new AudPosition();
  position.UpdatePlacement([ 1, 0, 0 ], [ 0, 0, 1 ], [ 4, 5, 6 ]);

  assert.deepEqual(Array.from(position.value.front), [ 1, 0, 0 ]);
  assert.deepEqual(Array.from(position.value.top), [ 0, 0, 1 ]);
  assert.deepEqual(Array.from(position.value.position), [ 4, 5, 6 ]);
  assert.equal(position.OnModified(), true);
});

test("SpatialAudioSettings and AudManager expose Carbon defaults and delegates", () =>
{
  const settings = new SpatialAudioSettings();
  const manager = new AudManager();

  assert.equal(settings.GetMovementThreshold(), 100);
  assert.equal(settings.GetNumberOfPrimaryRays(), 35);
  assert.equal(settings.GetMaxDiffractionOrder(), 4);
  assert.equal(settings.GetTransmissionLoss(), 0.7);
  settings.SetTransmissionLoss(2);
  assert.equal(settings.GetTransmissionLoss(), 1, "transmission loss clamps to Carbon's range");
  settings.SetTransmissionLoss(-1);
  assert.equal(settings.GetTransmissionLoss(), 0);

  manager.SetMovementThreshold(12);
  manager.SetNumberOfPrimaryRays(18);
  manager.SetEnableDiffraction(false);
  assert.equal(manager.GetMovementThreshold(), 12);
  assert.equal(manager.GetNumberOfPrimaryRays(), 18);
  assert.equal(manager.GetEnableDiffraction(), false);

  assert.deepEqual(settings.PopulateInitSettings({}), {
    fMovementThreshold: 100,
    uNumberOfPrimaryRays: 35,
    uMaxReflectionOrder: 0,
    uMaxDiffractionOrder: 4,
    uMaxEmitterRoomAuxSends: 0,
    uDiffractionOnReflectionsOrder: 0,
    fMaxPathLength: 1000,
    fCPULimitPercentage: 20,
    uLoadBalancingSpread: 1,
    bEnableGeometricDiffractionAndTransmission: true,
    bCalcEmitterVirtualPosition: true
  });
});

test("AudObstructionOcclusion preserves Carbon fade, cull, retry, and clear semantics", () =>
{
  const sends = [];
  const emitters = new Map();
  let culled = false;
  let failNextSend = false;
  let geometryEnabled = false;
  let now = 10;
  const manager = {
    GetState: () => "enabled",
    GetSpatialAudioGeometryEnabled: () => geometryEnabled,
    WithCallbackGameObject(emitterID, callback)
    {
      const emitter = emitters.get(emitterID);

      if (!emitter) return false;
      callback(emitter);
      return true;
    },
  };
  const backend = {
    SetObjectObstructionAndOcclusion(...args)
    {
      sends.push(args);
      if (failNextSend)
      {
        failNextSend = false;
        return false;
      }
      return true;
    },
  };
  const obstruction = new AudObstructionOcclusion(manager, () => now);
  const emitter = {
    ID: 77,
    IsCulled: () => culled,
  };

  emitters.set(emitter.ID, emitter);
  assert.equal(obstruction.IsEnabled(), true);
  assert.equal(obstruction.GetFadeRate(), 1);
  assert.equal(obstruction.SetEmitterLineOfSightBlockage(emitter.ID, 2), true);
  assert.equal(
    obstruction.GetEmitterOcclusion(emitter.ID),
    1,
    "a newly tracked emitter snaps to its first clamped target",
  );

  obstruction.Update(backend);
  assert.deepEqual(sends, [
    [ emitter.ID, LISTENER_GAME_OBJ_ID, 0, 1 ],
  ]);

  obstruction.SetEmitterLineOfSightBlockage(emitter.ID, 0);
  now = 10.25;
  obstruction.Update(backend);
  assert.equal(obstruction.GetEmitterOcclusion(emitter.ID), 0.75);
  assert.deepEqual(sends.at(-1), [
    emitter.ID,
    LISTENER_GAME_OBJ_ID,
    0,
    0.75,
  ]);

  culled = true;
  now = 10.5;
  obstruction.Update(backend);
  assert.equal(obstruction.GetEmitterOcclusion(emitter.ID), 0.5);
  assert.equal(sends.length, 2, "culled emitters keep fading without sending");

  culled = false;
  failNextSend = true;
  now = 10.75;
  obstruction.Update(backend);
  assert.equal(sends.length, 3, "wake resends the latest faded value");
  obstruction.Update(backend);
  assert.equal(sends.length, 4, "a failed backend delivery remains pending");

  obstruction.SetEnabled(false);
  assert.equal(obstruction.IsEnabled(), false);
  assert.equal(obstruction.SetEmitterLineOfSightBlockage(emitter.ID, 1), false);
  now = 11.75;
  obstruction.Update(backend);
  assert.equal(obstruction.GetEmitterOcclusion(emitter.ID), 0);

  obstruction.SetEnabled(true);
  geometryEnabled = true;
  assert.equal(obstruction.SetEmitterLineOfSightBlockage(emitter.ID, 1), true);
  assert.equal(
    obstruction.GetEmitterOcclusion(emitter.ID),
    0,
    "geometry transmission suppresses duplicate line-of-sight occlusion",
  );
  assert.equal(
    obstruction.SetEmitterLineOfSightBlockage(LISTENER_GAME_OBJ_ID, 1),
    false,
  );
  assert.equal(obstruction.SetEmitterLineOfSightBlockage(999, 1), false);

  obstruction.SetFadeRate(-1);
  assert.equal(obstruction.GetFadeRate(), 0);
  obstruction.RemoveEmitter(emitter.ID);
  assert.equal(obstruction.GetEmitterOcclusion(emitter.ID), 0);
});

test("AudManager owns obstruction lifecycle and delivers it before render", () =>
{
  const repository = new AudStaticDataRepository();
  const manager = new AudManager();
  const order = [];

  repository.Initialize({ Events: {}, SoundBanks: {}, WemFileIDs: {} });
  AudGameObjResource.manager = manager;
  AudGameObjResource.staticDataRepository = repository;
  AudGameObjResource.backend = {
    Init: () => true,
    LoadBank: (_name, callback) => callback(true),
    SetObjectObstructionAndOcclusion(...args)
    {
      order.push([ "occlusion", ...args ]);
    },
    RenderAudio: () => order.push([ "render" ]),
  };

  try
  {
    manager.DisableAudioCulling();
    manager.Enable();
    const emitter = {
      ID: 88,
      GetID: () => 88,
      IsCulled: () => false,
      Cull: () => {},
    };

    manager.RegisterGameObject(emitter.ID, emitter);
    manager.SetObstructionOcclusionFadeRate(0);
    assert.equal(manager.SetEmitterLineOfSightBlockage(emitter.ID, 1), true);
    manager.Process();
    assert.deepEqual(order, [
      [ "occlusion", emitter.ID, LISTENER_GAME_OBJ_ID, 0, 1 ],
      [ "render" ],
    ]);

    manager.ClearObstructionOcclusion();
    manager.Process();
    assert.equal(manager.GetEmitterOcclusion(emitter.ID), 0);
    manager.UnregisterGameObject(emitter.ID);
    assert.equal(manager.GetEmitterOcclusion(emitter.ID), 0);

    manager.RegisterGameObject(emitter.ID, emitter);
    manager.SetEmitterLineOfSightBlockage(emitter.ID, 1);
    manager.Disable();
    assert.equal(manager.GetEmitterOcclusion(emitter.ID), 0);
  }
  finally
  {
    ResetAudioSeams();
  }
});

test("pre-enabled spatial geometry participates in Carbon manager initialization", () =>
{
  const repository = new AudStaticDataRepository();
  const manager = new AudManager();
  const geometrySettings = [];
  const loadedBanks = [];
  let geometrySucceeds = false;

  repository.Initialize({
    Events: {},
    SoundBanks: {},
    WemFileIDs: {}
  });
  manager.SetMovementThreshold(12);
  manager.SetSpatialAudioGeometryEnabled(true);
  AudGameObjResource.manager = manager;
  AudGameObjResource.staticDataRepository = repository;
  const createBackend = () => ({
    Init: () => true,
    InitSpatialAudioGeometry(settings)
    {
      geometrySettings.push(settings);
      return geometrySucceeds;
    },
    LoadBank(name, callback)
    {
      loadedBanks.push(name);
      callback(true);
    }
  });
  AudGameObjResource.backend = createBackend();

  try
  {
    manager.Enable();
    assert.equal(
      manager.GetState(),
      "uninitialized",
      "a geometry initialization failure gates the complete Carbon init",
    );
    assert.deepEqual(loadedBanks, []);
    assert.equal(geometrySettings[0].fMovementThreshold, 12);

    geometrySucceeds = true;
    manager.Enable();
    assert.equal(manager.GetState(), "enabled");
    assert.deepEqual(loadedBanks, [ "Init.bnk" ]);
    assert.equal(geometrySettings.length, 2);

    manager.SetSpatialAudioGeometryEnabled(false);
    manager.SetSpatialAudioGeometryEnabled(true);
    assert.equal(
      geometrySettings.length,
      2,
      "Carbon initializes geometry only once per sound-engine lifetime",
    );

    manager.Disable();
    AudGameObjResource.backend = createBackend();
    manager.Enable();
    assert.equal(
      geometrySettings.length,
      3,
      "a replacement browser backend starts a new sound-engine lifetime",
    );
  }
  finally
  {
    ResetAudioSeams();
  }
});

test("AudGeometry preserves Carbon set reference counts and RH-to-LH backend projection", () =>
{
  const calls = [];
  const manager = new AudManager();
  manager.SetSpatialAudioGeometryEnabled(true);
  AudGameObjResource.manager = manager;
  AudGameObjResource.backend = {
    SetGeometry: (id, params) => calls.push([ "set", id, params ]),
    SetGeometryInstance: (id, params) => calls.push([ "instance", id, params ]),
    RemoveGeometryInstance: id => calls.push([ "remove-instance", id ]),
    RemoveGeometry: id => calls.push([ "remove-set", id ])
  };

  try
  {
    const geometry = new AudGeometry();
    const data = Tr2AudGeometryData.from({
      vertices: [ [ 1, 2, 3 ], [ 4, 5, 6 ], [ 7, 8, 9 ] ],
      indices: [ 0, 1, 2 ]
    });
    const identity = [ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 10, 20, 30, 1 ];

    geometry.SetGeometry(100, 200, data, identity);
    geometry.SetGeometry(100, 201, data, identity);

    const setCalls = calls.filter(call => call[0] === "set");
    assert.equal(setCalls.length, 1, "shared geometry data is registered once");
    assert.deepEqual(setCalls[0][2].vertices[0], [ 1, 2, -3 ]);
    assert.deepEqual(setCalls[0][2].triangles[0], [ 0, 1, 2, 0 ]);

    const instance = calls.find(call => call[0] === "instance");
    assert.deepEqual(instance[2].position, [ 10, 20, -30 ]);
    assert.deepEqual(instance[2].scale, [ 1, 1, 1 ]);

    geometry.RemoveGeometry(100, 200);
    assert.equal(calls.some(call => call[0] === "remove-set"), false);
    geometry.RemoveGeometry(100, 201);
    assert.deepEqual(calls.slice(-2).map(call => call.slice(0, 2)), [
      [ "remove-instance", 201 ],
      [ "remove-set", 100 ]
    ]);
  }
  finally
  {
    ResetAudioSeams();
  }
});
