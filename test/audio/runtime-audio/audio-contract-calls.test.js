import test from "node:test";
import assert from "node:assert/strict";
import { AudEmitter, AudGameObjResource, AudListener, AudManager, AudUIPlayer, SoundPrioritization, Tr2AudioStretchBase } from "../../../npm/dist/audio/index.js";
import { CjsScriptCallback } from "../../../npm/dist/global/blue/CjsScriptCallback.js";
import { WwiseSoundEngineStubWith, AudioManagerWith } from "../../support/audioStub.js";

for (const missing of [ "IsCulled", "Wake" ])
{
  test(`disabling culling requires the registered emitter's ${missing} contract`, () =>
  {
    const prioritization = new SoundPrioritization();
    const emitter = new AudEmitter();
    emitter.IsCulled = () => true;
    emitter[missing] = undefined;
    prioritization.RegisterGameObject(emitter);
    assert.throws(() => prioritization.DisableAudioCulling(), TypeError);
    assert.equal(prioritization.GetAudioCullingEnabled(), true, "failed wake must not report culling disabled");
  });
}

test("disabling culling wakes only the culled registered emitters", () =>
{
  const prioritization = new SoundPrioritization();
  const awake = new AudEmitter(), culled = new AudEmitter(), calls = [];
  Object.assign(awake, { IsCulled: () => false, Wake: () => calls.push("awake") });
  Object.assign(culled, { IsCulled: () => true, Wake: () => calls.push("culled") });
  prioritization.RegisterGameObject(awake);
  prioritization.RegisterGameObject(culled);
  prioritization.DisableAudioCulling();
  assert.deepEqual(calls, [ "culled" ]);
  assert.equal(prioritization.GetAudioCullingEnabled(), false);
});

test("stretch audio requires GetPosition on a present listener", t =>
{
  const previous = AudGameObjResource.manager;
  t.after(() => { AudGameObjResource.manager = previous; });
  AudGameObjResource.manager = null;
  const stretch = new Tr2AudioStretchBase();
  const listener = new AudListener();
  listener.GetPosition = undefined;
  const manager = new AudManager();
  manager.GetListener = () => listener;
  AudGameObjResource.manager = manager;
  assert.throws(() => stretch.Update([ 0, 0, 0 ], [ 10, 0, 0 ]), TypeError);
});

test("stretch audio projects the listener and retains its headless placement", t =>
{
  const previous = AudGameObjResource.manager;
  t.after(() => { AudGameObjResource.manager = previous; });
  AudGameObjResource.manager = null;
  const stretch = new Tr2AudioStretchBase(), listener = new AudListener(), positions = [];
  listener.GetPosition = () => [ 4, 3, 0 ];
  stretch.stretchEmitter.SetPosition = (_front, _top, position) => positions.push(Array.from(position));
  const manager = new AudManager();
  manager.GetListener = () => listener;
  AudGameObjResource.manager = manager;
  stretch.Update([ 0, 0, 0 ], [ 10, 0, 0 ]);
  AudGameObjResource.manager = null;
  stretch.Update([ 0, 0, 0 ], [ 10, 0, 0 ]);
  assert.deepEqual(positions, [ [ 4, 0, 0 ], [ 0, 0, 0 ] ]);
});

test("stretch lookup requires its initialized emitter receivers", () =>
{
  const stretch = new Tr2AudioStretchBase();
  assert.equal(stretch.FindEmitterByName("stretch_source_sfx"), stretch.sourceEmitter);
  stretch.sourceEmitter = null;
  assert.throws(() => stretch.FindEmitterByName("stretch_dest_sfx"), TypeError);
});

test("UI completion invokes functions and nominal Blue callbacks", () =>
{
  const names = [];
  AudUIPlayer._InvokeCallback(name => names.push(name), "function_event");
  AudUIPlayer._InvokeCallback(new CjsScriptCallback(name => names.push(name)), "blue_event");
  assert.deepEqual(names, [ "function_event", "blue_event" ]);
});

test("UI completion fails when a Blue callback loses CallVoid", () =>
{
  const callback = new CjsScriptCallback(() => {});
  callback.CallVoid = undefined;
  assert.throws(() => AudUIPlayer._InvokeCallback(callback, "event"), TypeError);
});

test("UI playback preserves the backend result instead of inventing an unavailable position", t =>
{
  const previousManager = AudGameObjResource.manager, previousBackend = AudGameObjResource.backend;
  t.after(() => { AudGameObjResource.manager = previousManager; AudGameObjResource.backend = previousBackend; });
  AudGameObjResource.manager = null;
  AudGameObjResource.backend = null;
  const player = new AudUIPlayer();
  AudGameObjResource.manager = AudioManagerWith({ enabled: true });
  const backend = WwiseSoundEngineStubWith({ GetSourcePlayPosition: () => undefined });
  AudGameObjResource.backend = backend;
  assert.equal(player.GetEventPlayPosition(17), undefined, "a broken backend result must not look like a valid -1 sentinel");
  backend.GetSourcePlayPosition = () => 0;
  assert.equal(player.GetEventPlayPosition(17), 0);
  AudGameObjResource.backend = null;
  assert.equal(player.GetEventPlayPosition(17), -1);
});
