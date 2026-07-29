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
  SpatialAudioSettings,
  Tr2AudGeometryData
} from "../npm/dist/index.js";

function ResetAudioSeams()
{
  AudGeometry.ClearAllGeometry();
  AudGameObjResource.manager = null;
  AudGameObjResource.staticDataRepository = null;
  AudGameObjResource.backend = null;
}

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
