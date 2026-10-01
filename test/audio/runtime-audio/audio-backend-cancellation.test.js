import test from "node:test";
import assert from "node:assert/strict";
import { CjsWebAudioSoundEngine, CjsWwiseSoundEngineStub } from "../../../npm/dist/audio/index.js";
import { FakeDynamicsCompressor, FakeAnalyser } from "../../support/webAudioNodes.js";
import { MusicEngineWith } from "../../support/audioStub.js";

const tick = () => new Promise(resolve => setImmediate(resolve));

function Deferred()
{
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function Param(value = 0)
{
  return {
    value,
    setValueAtTime(next) { this.value = next; },
    linearRampToValueAtTime() {},
    cancelScheduledValues() {},
  };
}

function Node(fields = {})
{
  return {
    ...fields,
    disconnected: false,
    connect(target) { this.connectedTo = target; },
    disconnect() { this.disconnected = true; },
  };
}

// Same deterministic AudioContext boundary used by the adjacent backend tests.
// Sources end only when a test delivers onended, independently of cancellation.
function Context()
{
  const context = {
    currentTime: 0,
    sampleRate: 48000,
    destination: {},
    sources: [],
    createDynamicsCompressor: FakeDynamicsCompressor,
    createAnalyser: FakeAnalyser,
    createGain: () => Node({ gain: Param(1) }),
    createPanner: () => Node({
      positionX: Param(), positionY: Param(), positionZ: Param(),
      orientationX: Param(), orientationY: Param(), orientationZ: Param(),
    }),
    createBufferSource()
    {
      const source = Node({
        buffer: null, loop: false, onended: null, playbackRate: Param(1),
        starts: [], stops: [],
        start(...args) { this.starts.push(args); },
        stop(...args) { this.stops.push(args); },
      });
      context.sources.push(source);
      return source;
    },
  };
  return context;
}

function Harness(options = {})
{
  const context = Context();
  const finished = [];
  const emitter = { EventFinishedCallback: id => finished.push(id) };
  const backend = new CjsWebAudioSoundEngine({
    context,
    loadBuffer: async () => ({ duration: 5 }),
    ...options,
  });
  backend.RegisterGameObj(71);
  backend.RegisterGameObj(72);
  return { context, backend, emitter, finished };
}

function Music()
{
  const active = new Map();
  const actions = [];
  const engine = MusicEngineWith({
    HandlesEvent: name => name === "music" || name === "hybrid",
    PostEvent(_name, id, complete) { active.set(id, complete); return true; },
    ExecuteAction(...args) { actions.push(args); },
  });
  return {
    engine, active, actions,
    finish(id)
    {
      const complete = active.get(id);
      assert.equal(typeof complete, "function");
      active.delete(id);
      complete();
    },
  };
}

test("stub cancellation preserves current playback and controls, then suppresses only matching completions", () =>
{
  const backend = new CjsWwiseSoundEngineStub();
  const finished = [];
  const emitter = { EventFinishedCallback: id => finished.push(id) };
  backend.RegisterGameObj(71);
  backend.RegisterGameObj(72);
  const first = backend.PostEvent(1, 71, 0, emitter, "first");
  const second = backend.PostEvent(2, 71, 0, emitter, "second");
  const other = backend.PostEvent(3, 72, 0, emitter, "other");
  backend.SeekOnEventMs(first, 250);
  backend.ExecuteActionOnPlayingID("pause", first);
  backend.SetRTPCValue("speed", 2, 71);
  backend.SetSwitch("surface", "metal", 71);
  const object = backend.GetGameObject(71);
  const entry = backend._playing.get(first);

  assert.equal(backend.CancelEventCallbackGameObject(999), undefined);
  assert.equal(backend.CancelEventCallbackGameObject(71), undefined);
  backend.CancelEventCallbackGameObject(71);
  assert.deepEqual(backend.GetPlayingIDs(), [ first, second, other ]);
  assert.strictEqual(backend.GetGameObject(71), object);
  assert.equal(object.rtpcs.get("speed"), 2);
  assert.equal(object.switches.get("surface"), "metal");
  assert.strictEqual(backend._playing.get(first), entry);
  assert.strictEqual(entry.emitter, emitter);
  assert.equal(entry.paused, true);
  assert.equal(backend.GetSourcePlayPosition(first), 250);
  assert.deepEqual(finished, []);

  const later = backend.PostEvent(4, 71, 0, emitter, "later");
  backend.ExecuteActionOnPlayingID("stop", first);
  backend.ExecuteActionOnPlayingID("break", second);
  backend.ExecuteActionOnPlayingID("stop", other);
  backend.ExecuteActionOnPlayingID("stop", later);
  assert.deepEqual(finished, [ other, later ]);
  assert.deepEqual(backend.GetPlayingIDs(), []);
});

test("stub cancellation survives unregister cleanup without suppressing a reused object ID", () =>
{
  const backend = new CjsWwiseSoundEngineStub();
  const finished = [];
  const emitter = { EventFinishedCallback: id => finished.push(id) };
  backend.CancelEventCallbackGameObject(71);
  backend.RegisterGameObj(71);
  const ordinary = backend.PostEvent(1, 71, 0, emitter, "ordinary");
  backend.ExecuteActionOnPlayingID("stop", ordinary);
  const old = backend.PostEvent(2, 71, 0, emitter, "old");
  backend.CancelEventCallbackGameObject(71);
  backend.UnregisterGameObj(71);
  assert.equal(backend.GetGameObject(71), null);
  assert.equal(backend.GetSourcePlayPosition(old), -1);
  backend.RegisterGameObj(71);
  const reused = backend.PostEvent(3, 71, 0, emitter, "reused");
  backend.UnregisterGameObj(71);
  assert.deepEqual(finished, [ ordinary, reused ]);
  assert.deepEqual(backend.GetPlayingIDs(), []);
});

test("WebAudio cancellation leaves voices and controls live, preserves cleanup and admits later posts", async () =>
{
  const { backend, context, emitter, finished } = Harness();
  const first = backend.PostEvent(1, 71, 0, emitter, "first");
  const second = backend.PostEvent(2, 71, 0, emitter, "second");
  const other = backend.PostEvent(3, 72, 0, emitter, "other");
  await tick();
  backend.SetRTPCValue("speed", 2, 71);
  backend.SetSwitch("surface", "metal", 71);
  const record = backend._playing.get(first);
  const nodes = record.emitterNodes;
  const ended = context.sources.map(source => source.onended);
  context.currentTime = 0.5;
  const position = backend.GetSourcePlayPosition(first);

  assert.equal(backend.CancelEventCallbackGameObject(999), undefined);
  assert.equal(backend.CancelEventCallbackGameObject(71), undefined);
  backend.CancelEventCallbackGameObject(71);
  assert.equal(backend.GetPlayingCount(), 3);
  assert.strictEqual(backend._playing.get(first), record);
  assert.strictEqual(backend._emitterNodes.get(71), nodes);
  assert.strictEqual(record.emitter, emitter);
  assert.equal(record.stopped, false);
  assert.equal(record.controller.signal.aborted, false);
  assert.equal(backend.GetRTPCValue("speed", 71), 2);
  assert.equal(backend.GetSwitchValue("surface", 71), "metal");
  assert.equal(backend.GetSourcePlayPosition(first), position);
  context.currentTime = 1;
  assert.ok(backend.GetSourcePlayPosition(first) > position, "cancelled playback advances");
  for (const [ index, source ] of context.sources.entries())
  {
    assert.strictEqual(source.onended, ended[index]);
    assert.equal(source.disconnected, false);
    assert.deepEqual(source.stops, []);
  }
  assert.deepEqual(finished, []);

  const later = backend.PostEvent(4, 71, 0, emitter, "later");
  await tick();
  for (const source of context.sources) source.onended();
  assert.deepEqual(finished, [ other, later ]);
  assert.equal(backend.GetPlayingCount(), 0);
  assert.equal(record.controller.signal.aborted, true, "normal completion still aborts retained work");
  assert.ok(context.sources.every(source => source.disconnected));
  assert.ok(context.sources.every(source => source.onended === null));
  assert.equal(backend.GetSourcePlayPosition(second), -1);
});

test("WebAudio cancellation includes pending media without aborting its load or playback", async () =>
{
  const deferred = Deferred();
  let controls;
  const { backend, context, emitter, finished } = Harness({ loadBuffer: (_id, _name, value) =>
  {
    controls = value;
    return deferred.promise;
  } });
  const id = backend.PostEvent(1, 71, 0, emitter, "pending");
  backend.CancelEventCallbackGameObject(71);
  await tick();
  assert.equal(backend.GetPlayingCount(), 1);
  assert.equal(controls.signal.aborted, false);
  assert.equal(context.sources.length, 0);
  deferred.resolve({ duration: 5 });
  await tick();
  assert.equal(context.sources.length, 1);
  assert.equal(context.sources[0].starts.length, 1);
  assert.deepEqual(context.sources[0].stops, []);
  assert.equal(backend.GetPlayingCount(), 1);
  assert.deepEqual(finished, []);
  context.sources[0].onended();
  assert.equal(backend.GetPlayingCount(), 0);
  assert.equal(controls.signal.aborted, true);
  assert.equal(backend.GetSourcePlayPosition(id), -1);
  assert.equal(context.sources[0].disconnected, true);
  assert.deepEqual(finished, []);
});

test("cancelled pending load failure still retires its playing record", async () =>
{
  const deferred = Deferred();
  const { backend, emitter, finished } = Harness({ loadBuffer: () => deferred.promise });
  const id = backend.PostEvent(1, 71, 0, emitter, "pending");
  const record = backend._playing.get(id);
  await tick();
  backend.CancelEventCallbackGameObject(71);
  deferred.reject(new Error("fixture media failure"));
  await tick();
  assert.equal(backend.GetPlayingCount(), 0);
  assert.equal(record.controller.signal.aborted, true);
  assert.deepEqual(finished, []);
});

test("cancelled voices release retired nodes and leave a reused game object generation independent", async () =>
{
  const { backend, context, emitter, finished } = Harness();
  const old = backend.PostEvent(1, 71, 0, emitter, "old");
  await tick();
  const retired = backend._playing.get(old).emitterNodes;
  backend.UnregisterGameObj(71);
  backend.CancelEventCallbackGameObject(71);
  assert.equal(backend.GetPlayingCount(), 1, "unregister preserves WebAudio's retiring playback");
  assert.equal(retired.gain.disconnected, false);
  backend.RegisterGameObj(71);
  const current = backend._emitterNodes.get(71);
  assert.notStrictEqual(current, retired);
  const reused = backend.PostEvent(2, 71, 0, emitter, "reused");
  await tick();
  context.sources[0].onended();
  assert.equal(retired.gain.disconnected, true, "cancelled completion still releases retired nodes");
  assert.equal(current.gain.disconnected, false);
  assert.equal(backend.GetPlayingCount(), 1);
  context.sources[1].onended();
  assert.equal(backend.GetPlayingCount(), 0);
  assert.deepEqual(finished, [ reused ]);
});

for (const firstSide of [ "sfx", "music" ])
{
  test(`cancelled hybrid retains internal ${firstSide}-first completion until both sides finish`, async () =>
  {
    const music = Music();
    const { backend, context, emitter, finished } = Harness({ musicEngine: music.engine });
    const id = backend.PostEvent(1, 71, 0, emitter, "hybrid");
    await tick();
    backend.CancelEventCallbackGameObject(71);
    assert.deepEqual(music.actions, []);
    assert.ok(music.active.has(id));
    const finishSfx = () => context.sources[0].onended();
    const finishMusic = () => music.finish(id);
    (firstSide === "sfx" ? finishSfx : finishMusic)();
    assert.equal(backend.GetPlayingCount(), 1);
    assert.deepEqual(finished, []);
    (firstSide === "sfx" ? finishMusic : finishSfx)();
    assert.equal(backend.GetPlayingCount(), 0);
    assert.equal(context.sources[0].disconnected, true);
    assert.deepEqual(finished, []);
    assert.deepEqual(music.actions, []);
  });
}

test("emitter music cancellation is object-local and does not cancel direct music on object 3", () =>
{
  const music = Music();
  const { backend, emitter, finished } = Harness({ musicEngine: music.engine, hasSfxEvent: () => false });
  const first = backend.PostEvent(1, 71, 0, emitter, "music");
  const other = backend.PostEvent(2, 72, 0, emitter, "music");
  const direct = backend.PostMusicEvent("music", id => finished.push(id));
  backend.CancelEventCallbackGameObject(71);
  assert.equal(backend.GetPlayingCount(), 3);
  assert.deepEqual(music.actions, []);
  music.finish(first);
  music.finish(other);
  music.finish(direct);
  assert.equal(backend.GetPlayingCount(), 0);
  assert.deepEqual(finished, [ other, direct ]);
});

test("cancelled WebAudio playback can subsequently be stopped and released normally", async () =>
{
  const { backend, context, emitter, finished } = Harness();
  backend.CancelEventCallbackGameObject(73);
  backend.RegisterGameObj(73);
  const ordinary = backend.PostEvent(1, 73, 0, emitter, "ordinary");
  await tick();
  context.sources[0].onended();
  assert.deepEqual(finished, [ ordinary ], "unknown cancellation does not poison a future object");
  const stopped = backend.PostEvent(2, 71, 0, emitter, "stopped");
  const released = backend.PostEvent(3, 72, 0, emitter, "released");
  await tick();
  backend.CancelEventCallbackGameObject(71);
  backend.CancelEventCallbackGameObject(72);
  backend.ExecuteActionOnPlayingID("stop", stopped, 0);
  // The fake leaves the real source-ended delivery under test control.
  assert.equal(typeof context.sources[1].onended, "function");
  context.sources[1].onended();
  backend.ReleaseGameObj(72);
  assert.equal(backend.GetPlayingCount(), 0);
  assert.equal(backend.GetSourcePlayPosition(released), -1);
  assert.equal(backend._emitterNodes.has(72), false);
  assert.equal(context.sources[1].stops.length, 1);
  assert.ok(context.sources[2].stops.length > 0);
  assert.ok(context.sources.every(source => source.disconnected));
  assert.deepEqual(finished, [ ordinary ]);
});

test("direct music cancellation suppresses onFinished only for current object-3 records", () =>
{
  const music = Music();
  const { backend, emitter, finished } = Harness({ musicEngine: music.engine, hasSfxEvent: () => false });
  backend.CancelEventCallbackGameObject(3);
  const ordinary = backend.PostMusicEvent("music", id => finished.push(id));
  music.finish(ordinary);
  const first = backend.PostMusicEvent("music", id => finished.push(id));
  const second = backend.PostMusicEvent("music", id => finished.push(id));
  const other = backend.PostEvent(2, 71, 0, emitter, "music");
  backend.CancelEventCallbackGameObject(3);
  backend.CancelEventCallbackGameObject(3);
  assert.equal(backend.GetPlayingCount(), 3);
  assert.deepEqual(music.actions, []);
  const later = backend.PostMusicEvent("music", id => finished.push(id));
  for (const id of [ first, second, other, later ]) music.finish(id);
  assert.equal(backend.GetPlayingCount(), 0);
  assert.deepEqual(finished, [ ordinary, other, later ]);
});

test("synchronous music completion queued internally still cleans up after cancellation", async () =>
{
  const musicEngine = MusicEngineWith({
    HandlesEvent: () => true,
    PostEvent(_name, _id, complete) { complete(); return true; },
  });
  const { backend, finished } = Harness({ musicEngine, hasSfxEvent: () => false });
  backend.PostMusicEvent("music", id => finished.push(id));
  assert.equal(backend.GetPlayingCount(), 1);
  backend.CancelEventCallbackGameObject(3);
  await tick();
  assert.equal(backend.GetPlayingCount(), 0);
  assert.deepEqual(finished, []);
});

test("cancellation cannot retract work already queued by a delivered callback", async () =>
{
  const music = Music();
  const { backend } = Harness({ musicEngine: music.engine });
  const delivered = [];
  const queued = [];
  const id = backend.PostMusicEvent("music", value =>
  {
    delivered.push(value);
    queueMicrotask(() => queued.push(value));
  });
  music.finish(id);
  backend.CancelEventCallbackGameObject(3);
  assert.deepEqual(delivered, [ id ]);
  await tick();
  assert.deepEqual(queued, [ id ]);
});
