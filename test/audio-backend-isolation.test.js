import test from "node:test";
import assert from "node:assert/strict";
import { CjsAudioBackend, CjsSfxEngine } from "../npm/dist/index.js";

const START_QUANTUM = 128 / 48000;

// Per-source isolation contract (2026-07-19): every playing source owns its
// gain node, so stop-fades, replays, and pending-load teardown on one event
// can never change a concurrent event's gain or lifetime on the same emitter.

function FakeParam(initial)
{
  const param = {
    value: initial,
    ramps: [],
    curves: [],
    cancellations: [],
    sets: [],
    cancelScheduledValues(time)
    {
      param.cancellations.push(time);
    },
    setValueAtTime(value, time)
    {
      param.sets.push([value, time]);
      param.value = value;
    },
    linearRampToValueAtTime(value, time)
    {
      param.ramps.push([value, time]);
    },
    setValueCurveAtTime(values, time, duration)
    {
      param.curves.push([ Array.from(values), time, duration ]);
    }
  };
  return param;
}

function FakeContext()
{
  const context = {
    currentTime: 0,
    sampleRate: 48000,
    destination: { name: "destination" },
    gains: [],
    sources: [],
    createGain()
    {
      const node = {
        gain: FakeParam(1),
        connectedTo: null,
        disconnected: false,
        connect(target)
        {
          node.connectedTo = target;
        },
        disconnect()
        {
          node.disconnected = true;
        }
      };
      context.gains.push(node);
      return node;
    },
    createPanner()
    {
      return {
        panningModel: "", distanceModel: "", refDistance: 1,
        positionX: FakeParam(0), positionY: FakeParam(0), positionZ: FakeParam(0),
        connect: () => {}, disconnect: () => {}
      };
    },
    createBufferSource()
    {
      const source = {
        buffer: null, loop: false, onended: null, started: false, stoppedAt: null,
        connectedTo: null,
        connect(target)
        {
          source.connectedTo = target;
        },
        start(time, offset)
        {
          source.observedNow = context.currentTime;
          source.started = true;
          source.startedAt = time;
          source.offset = offset;
        },
        stop(time)
        {
          source.stoppedAt = time ?? context.currentTime;
        }
      };
      context.sources.push(source);
      return source;
    }
  };
  return context;
}

function Deferred()
{
  let resolve;
  const promise = new Promise(r =>
  {
    resolve = r;
  });
  return { promise, resolve };
}

const tick = () => new Promise(resolve => setImmediate(resolve));

// Gain creation order: gains[0] master, gains[1] the sfx bus, gains[2] the
// emitter gain from RegisterGameObj; each PostEvent appends that source's
// own gain after those.
function Harness({
  loadBuffer,
  isLoop,
  applyRTPC,
  musicEngine,
  hasSfxEvent,
  resolveSfxProgram,
} = {})
{
  const context = FakeContext();
  const finished = [];
  const emitter = { EventFinishedCallback: playingID => finished.push(playingID) };
  const backend = new CjsAudioBackend({
    context,
    loadBuffer: loadBuffer ?? (async () => ({ fake: "buffer" })),
    isLoop: isLoop ?? (eventName => String(eventName).includes("loop")),
    applyRTPC,
    musicEngine,
    hasSfxEvent,
    resolveSfxProgram,
  });
  backend.RegisterGameObj(1);
  return { context, finished, emitter, backend };
}

test("one authored event can keep SFX and music alive under one playing id", async () =>
{
  let finishMusic = null;
  const musicPosts = [];
  const musicEngine = {
    HandlesEvent: eventName => eventName === "hybrid",
    PostEvent(eventName, playingID, onFinished)
    {
      musicPosts.push([ eventName, playingID ]);
      finishMusic = onFinished;
    },
    ExecuteAction() {},
    Process() {},
    Dispose() {},
  };
  const { context, finished, emitter, backend } = Harness({
    hasSfxEvent: eventName => eventName === "hybrid",
    loadBuffer: async () => ({
      buffer: { duration: 1 },
    }),
    musicEngine,
  });

  const playingID = backend.PostEvent(7, 1, 0, emitter, "hybrid");

  await tick();

  assert.deepEqual(musicPosts, [ [ "hybrid", playingID ] ]);
  assert.equal(context.sources.length, 1);
  assert.equal(backend.GetPlayingCount(), 1);

  context.sources[0].onended();

  assert.deepEqual(finished, []);
  assert.equal(
    backend.GetPlayingCount(),
    1,
    "the music side retains the shared id after SFX finishes",
  );

  finishMusic();

  assert.deepEqual(finished, [ playingID ]);
  assert.equal(backend.GetPlayingCount(), 0);
});

test("synchronous custom music completion is deferred past id retention", async () =>
{
  const musicEngine = {
    HandlesEvent: eventName => eventName === "instant_music",
    PostEvent(_eventName, _playingID, onFinished)
    {
      onFinished();
    },
    ExecuteAction() {},
    Process() {},
    Dispose() {},
  };
  const { finished, emitter, backend } = Harness({
    hasSfxEvent: () => false,
    musicEngine,
  });

  const playingID = backend.PostEvent(
    7,
    1,
    0,
    emitter,
    "instant_music",
  );

  assert.ok(playingID > 0);
  assert.deepEqual(finished, []);

  await Promise.resolve();

  assert.deepEqual(finished, [ playingID ]);
  assert.equal(backend.GetPlayingCount(), 0);
});


test("stopping one of two concurrent sources leaves the other's gain and lifetime untouched", async () =>
{
  const { context, finished, emitter, backend } = Harness();
  const idA = backend.PostEvent(7, 1, 0, emitter, "shot_a");
  const idB = backend.PostEvent(8, 1, 0, emitter, "shot_b");
  await tick();
  const [gainA, gainB] = [context.gains[3], context.gains[4]];
  const [sourceA, sourceB] = context.sources;
  assert.ok(sourceA.started && sourceB.started);
  assert.equal(gainA.connectedTo, context.gains[2], "source gains chain into the emitter gain");

  context.currentTime = START_QUANTUM;
  backend.ExecuteActionOnPlayingID("stop", idA, 500);

  assert.deepEqual(gainA.gain.ramps, [[0, START_QUANTUM + 0.5]], "stopped source fades on its own gain");
  assert.deepEqual(gainA.gain.cancellations, [START_QUANTUM]);
  assert.deepEqual(gainA.gain.sets, [[1, START_QUANTUM]], "the fade is anchored at the current gain");
  assert.equal(sourceA.stoppedAt, START_QUANTUM + 0.5);
  assert.equal(gainB.gain.value, 1, "sibling gain value untouched");
  assert.deepEqual(gainB.gain.ramps, [], "sibling gain has no scheduled fade");
  assert.equal(sourceB.stoppedAt, null, "sibling source not stopped");
  assert.equal(backend.GetPlayingCount(), 2, "sibling record still alive before onended");

  sourceA.onended?.();
  assert.deepEqual(finished, [idA], "only the stopped source finished");
  assert.equal(backend.GetPlayingCount(), 1);
});

test("authored SFX action delay and fade-in schedule from the post time", async () =>
{
  const { context, emitter, backend } = Harness({
    loadBuffer: async () => ({
      voices: [
        {
          buffer: { duration: 1 },
          delayMs: 500,
          fadeInMs: 250,
          fadeCurve: 4,
        },
      ],
    }),
  });
  const playingID = backend.PostEvent(7, 1, 0, emitter, "delayed_hit");

  await tick();

  const liveGain = context.gains[3].gain;
  const actionFade = context.gains[4].gain;
  const source = context.sources[0];

  assert.equal(playingID, 1);
  assert.equal(source.startedAt, 0.5);
  assert.equal(source.connectedTo, context.gains[4]);
  assert.equal(liveGain.value, 1);
  assert.deepEqual(actionFade.cancellations, []);
  assert.deepEqual(actionFade.sets, [ [ 0, 0.5 ] ]);
  assert.deepEqual(actionFade.ramps, [ [ 1, 0.75 ] ]);
});

test("a seek before an authored delayed start leaves its schedule intact", async () =>
{
  const { context, emitter, backend } = Harness({
    loadBuffer: async () => ({
      voices: [
        {
          buffer: { duration: 1 },
          delayMs: 500,
        },
      ],
    }),
  });
  const playingID = backend.PostEvent(7, 1, 0, emitter, "delayed_hit");

  await tick();

  assert.equal(backend.SeekOnEventMs(playingID, 250), false);
  assert.equal(context.sources.length, 1);
  assert.equal(context.sources[0].startedAt, 0.5);
  assert.equal(context.sources[0].offset, 0);
});

test("a seek queued before media resolves preserves the authored delay", async () =>
{
  const pending = Deferred();
  const { context, emitter, backend } = Harness({
    loadBuffer: () => pending.promise,
  });
  const playingID = backend.PostEvent(7, 1, 0, emitter, "delayed_hit");

  assert.equal(backend.SeekOnEventMs(playingID, 250), true);
  pending.resolve({
    voices: [
      {
        buffer: { duration: 1 },
        delayMs: 500,
      },
    ],
  });
  await tick();

  assert.equal(context.sources.length, 1);
  assert.equal(context.sources[0].startedAt, 0.5);
  assert.equal(context.sources[0].offset, 0.25);
});

test("stopping before an authored delayed start cancels and finishes once", async () =>
{
  const { context, finished, emitter, backend } = Harness({
    loadBuffer: async () => ({
      voices: [
        {
          buffer: { duration: 1 },
          delayMs: 500,
        },
      ],
    }),
  });
  const playingID = backend.PostEvent(7, 1, 0, emitter, "delayed_hit");

  await tick();
  backend.ExecuteActionOnPlayingID("stop", playingID, 1000);

  assert.equal(context.sources[0].stoppedAt, 0);
  assert.deepEqual(context.gains[3].gain.ramps, []);
  context.sources[0].onended?.();
  context.sources[0].onended?.();
  assert.deepEqual(finished, [ playingID ]);
  assert.equal(backend.GetPlayingCount(), 0);
});

test("authored nonlinear SFX fades use the Wwise curve shape", async () =>
{
  const { context, emitter, backend } = Harness({
    loadBuffer: async () => ({
      voices: [
        {
          buffer: { duration: 1 },
          fadeInMs: 250,
          fadeCurve: 8,
        },
      ],
    }),
  });

  backend.PostEvent(7, 1, 0, emitter, "faded_hit");
  await tick();

  const [ values, when, duration ] = context.gains[4].gain.curves[0];

  assert.equal(when, START_QUANTUM);
  assert.ok(Math.abs(duration - 0.25) < 1e-12);
  assert.equal(values[0], 0);
  assert.equal(values.at(-1), 1);
  assert.ok(values[32] < 0.2, "Wwise Exp3 stays below a linear fade");
});

test("RTPC updates do not replace an in-progress authored fade", async () =>
{
  let controls;
  const { context, emitter, backend } = Harness({
    loadBuffer: async (_eventID, _eventName, suppliedControls) =>
    {
      controls = suppliedControls;
      return {
        voices: [
          {
            buffer: { duration: 2 },
            fadeInMs: 1000,
            fadeCurve: 8,
            getGain: () => controls.getRTPC("intensity") ?? 0,
          },
        ],
      };
    },
  });

  backend.SetRTPCValue("intensity", 0.25, 1);
  backend.PostEvent(7, 1, 0, emitter, "faded_engine");
  await tick();

  const liveGain = context.gains[3].gain;
  const actionFade = context.gains[4].gain;

  assert.equal(liveGain.value, 0.25);
  assert.equal(actionFade.curves.length, 1);
  backend.SetRTPCValue("intensity", 0.75, 1);
  assert.equal(liveGain.value, 0.75);
  assert.equal(
    actionFade.curves.length,
    1,
    "the authored envelope remains scheduled on its independent stage",
  );
});

test("stop holds an in-progress Play fade before fading out", async () =>
{
  const { context, emitter, backend } = Harness({
    loadBuffer: async () => ({
      voices: [
        {
          buffer: { duration: 2 },
          fadeInMs: 1000,
          fadeCurve: 8,
        },
      ],
    }),
  });
  const playingID = backend.PostEvent(7, 1, 0, emitter, "faded_engine");

  await tick();
  context.currentTime = START_QUANTUM + 0.5;
  backend.ExecuteActionOnPlayingID("stop", playingID, 500);

  const liveGain = context.gains[3].gain;
  const actionFade = context.gains[4].gain;
  const held = actionFade.sets.at(-1);

  assert.deepEqual(actionFade.cancellations, [ context.currentTime ]);
  assert.equal(held[1], context.currentTime);
  assert.ok(held[0] > 0 && held[0] < 0.5);
  assert.deepEqual(liveGain.ramps, [ [ 0, context.currentTime + 0.5 ] ]);
  assert.equal(context.sources[0].stoppedAt, context.currentTime + 0.5);
});


test("replaying on an emitter does not disturb a sibling's in-progress fade", async () =>
{
  const { context, emitter, backend } = Harness();
  const idA = backend.PostEvent(7, 1, 0, emitter, "engine_loop");
  await tick();
  const gainA = context.gains[3];
  context.currentTime = START_QUANTUM;
  backend.ExecuteActionOnPlayingID("stop", idA, 1000);
  assert.deepEqual(gainA.gain.ramps, [[0, START_QUANTUM + 1]]);

  backend.PostEvent(7, 1, 0, emitter, "engine_loop");
  await tick();

  assert.equal(context.sources[1].started, true, "replay starts on its own fresh gain");
  assert.deepEqual(gainA.gain.ramps, [[0, START_QUANTUM + 1]], "the fading source keeps its ramp");
  assert.equal(gainA.gain.value, 1, "no hard reset was written onto the fading gain");
  assert.equal(context.gains[2].gain.value, 1, "emitter gain is never ramped or reset");
  assert.deepEqual(context.gains[2].gain.ramps, []);
});


test("an explicit zero fade stops immediately; only a missing duration uses the default", async () =>
{
  const { context, emitter, backend } = Harness();
  const idA = backend.PostEvent(7, 1, 0, emitter, "shot_a");
  const idB = backend.PostEvent(8, 1, 0, emitter, "shot_b");
  const idC = backend.PostEvent(9, 1, 0, emitter, "shot_c");
  await tick();

  context.currentTime = START_QUANTUM;
  backend.ExecuteActionOnPlayingID("stop", idA, 0);
  assert.equal(context.gains[3].gain.value, 0, "zero fade silences at once");
  assert.deepEqual(context.gains[3].gain.ramps, [], "zero fade schedules no ramp");
  assert.equal(context.sources[0].stoppedAt, START_QUANTUM, "zero fade stops now, not after the default second");

  backend.ExecuteActionOnPlayingID("stop", idB);
  assert.deepEqual(context.gains[4].gain.ramps, [[0, START_QUANTUM + 1]], "missing duration falls back to the 1s default");
  assert.equal(context.sources[1].stoppedAt, START_QUANTUM + 1);

  backend.ExecuteActionOnPlayingID("stop", idC, 250);
  assert.deepEqual(context.gains[5].gain.ramps, [[0, START_QUANTUM + 0.25]], "explicit nonzero duration is honored");
  assert.equal(context.sources[2].stoppedAt, START_QUANTUM + 0.25);
});


test("pending sources: stop finishes once and break waits for authored loop descriptors", async () =>
{
  const buffers = new Map();
  const { context, finished, emitter, backend } = Harness({
    loadBuffer: (eventID, eventName) =>
    {
      const deferred = Deferred();
      buffers.set(eventName, deferred);
      return deferred.promise;
    }
  });

  const stopped = backend.PostEvent(7, 1, 0, emitter, "shot_stopped");
  backend.ExecuteActionOnPlayingID("stop", stopped, 0);
  assert.deepEqual(finished, [stopped], "stopping a pending source finishes it immediately");
  await tick();
  assert.equal(
    buffers.has("shot_stopped"),
    false,
    "a stop before the loader microtask avoids acquisition",
  );
  assert.equal(context.sources.length, 0, "a stopped pending source never starts");
  assert.deepEqual(finished, [stopped], "the finished callback fired exactly once");

  const broken = backend.PostEvent(8, 1, 0, emitter, "shot_broken");
  await tick();
  backend.ExecuteActionOnPlayingID("break", broken);
  assert.equal(backend.GetPlayingCount(), 1, "a broken pending one-shot stays alive");
  buffers.get("shot_broken").resolve({ fake: "buffer" });
  await tick();
  assert.equal(context.sources.length, 1);
  assert.equal(context.sources[0].started, true, "the broken one-shot plays out once its media resolves");
  assert.equal(context.sources[0].stoppedAt, null);

  const loop = backend.PostEvent(9, 1, 0, emitter, "engine_loop");
  await tick();
  backend.ExecuteActionOnPlayingID("break", loop, 0);
  assert.equal(
    backend.GetPlayingCount(),
    2,
    "a pending break cannot assume the event-level loop flag is authoritative"
  );
  buffers.get("engine_loop").resolve({ fake: "buffer" });
  await tick();
  assert.ok(finished.includes(loop), "the resolved looping descriptor is discarded");
  assert.equal(context.sources.length, 1, "the broken pending loop never starts");
});

test("stopping an in-flight source aborts its loader and finishes exactly once", async () =>
{
  let loaderSignal = null;
  let aborts = 0;
  const { finished, emitter, backend } = Harness({
    loadBuffer: (eventID, eventName, controls) =>
    {
      loaderSignal = controls.signal;
      return new Promise((resolve, reject) =>
      {
        controls.signal.addEventListener("abort", () =>
        {
          aborts++;
          reject(controls.signal.reason);
        }, { once: true });
      });
    }
  });
  const playingID = backend.PostEvent(7, 1, 0, emitter, "pending_shot");

  await tick();
  assert.ok(loaderSignal);
  assert.equal(loaderSignal.aborted, false);

  backend.ExecuteActionOnPlayingID("stop", playingID, 0);
  assert.equal(loaderSignal.aborted, true);
  assert.equal(aborts, 1);
  assert.equal(backend.GetPlayingCount(), 0);
  assert.deepEqual(finished, [playingID]);

  await tick();
  assert.equal(aborts, 1, "loader cancellation is delivered exactly once");
  assert.deepEqual(finished, [playingID]);
});

test("breaking a pending one-shot preserves its loader signal", async () =>
{
  const pending = Deferred();
  let loaderSignal = null;
  const { context, emitter, backend } = Harness({
    loadBuffer: (eventID, eventName, controls) =>
    {
      loaderSignal = controls.signal;
      return pending.promise;
    }
  });
  const playingID = backend.PostEvent(7, 1, 0, emitter, "pending_shot");

  await tick();
  backend.ExecuteActionOnPlayingID("break", playingID, 0);
  assert.equal(loaderSignal.aborted, false);

  pending.resolve({
    voices: [ { buffer: { duration: 1 }, loop: false } ]
  });
  await tick();
  assert.equal(context.sources.length, 1);
  assert.equal(context.sources[0].started, true);
  assert.equal(loaderSignal.aborted, false);
});


test("break halts only looping voices in a mixed authored event", async () =>
{
  const { context, finished, emitter, backend } = Harness({
    loadBuffer: async () => ({
      voices: [
        { buffer: { duration: 10 }, loop: true },
        { buffer: { duration: 2 }, loop: false }
      ]
    })
  });
  const playingID = backend.PostEvent(7, 1, 0, emitter, "mixed");

  await tick();
  context.currentTime = START_QUANTUM;
  backend.ExecuteActionOnPlayingID("break", playingID, 250);

  assert.equal(context.sources[0].stoppedAt, START_QUANTUM + 0.25);
  assert.equal(context.sources[1].stoppedAt, null);
  assert.deepEqual(context.gains[3].gain.ramps, [[0, START_QUANTUM + 0.25]]);
  assert.deepEqual(context.gains[4].gain.ramps, []);

  assert.equal(backend.SeekOnEventMs(playingID, 500), true);
  assert.equal(context.sources.length, 3);
  assert.equal(context.sources[2].loop, false, "seek cannot resurrect the broken loop");

  context.sources[0].onended?.();
  assert.equal(backend.GetPlayingCount(), 1);
  assert.deepEqual(finished, []);
  context.sources[2].onended?.();
  assert.deepEqual(finished, [playingID]);
});


test("pending break honors per-voice loop overrides instead of event metadata", async () =>
{
  const pending = Deferred();
  const { context, emitter, backend } = Harness({
    isLoop: () => false,
    loadBuffer: () => pending.promise
  });
  const playingID = backend.PostEvent(7, 1, 0, emitter, "metadata_one_shot");

  backend.ExecuteActionOnPlayingID("break", playingID, 0);
  pending.resolve({
    voices: [
      { buffer: { duration: 10 }, loop: true },
      { buffer: { duration: 2 }, loop: false }
    ]
  });
  await tick();

  assert.equal(context.sources.length, 1);
  assert.equal(context.sources[0].loop, false);
});

test("finite authored repeats play an exact number of complete buffers", async () =>
{
  const { context, finished, emitter, backend } = Harness({
    isLoop: () => true,
    loadBuffer: async () => ({
      voices: [
        {
          buffer: { duration: 3 },
          playCount: 2
        }
      ]
    })
  });
  const playingID = backend.PostEvent(7, 1, 0, emitter, "repeated_shot");

  await tick();

  assert.equal(context.sources[0].loop, true, "one source loops sample-accurately");
  assert.equal(
    context.sources[0].stoppedAt,
    6 + START_QUANTUM,
    "playCount overrides stale event loop metadata and schedules two plays"
  );
  assert.equal(backend.GetPlayingCount(), 1);

  context.sources[0].onended?.();
  assert.equal(backend.GetPlayingCount(), 0);
  assert.deepEqual(finished, [playingID]);
});

test("a pre-start break preserves the first complete repeat boundary", async () =>
{
  const { context, emitter, backend } = Harness({
    loadBuffer: async () => ({
      voices: [ {
        buffer: { duration: 4 },
        playCount: 3,
      } ],
    }),
  });
  const playingID = backend.PostEvent(
    7,
    1,
    0,
    emitter,
    "repeated_shot",
  );

  await tick();
  assert.equal(context.sources[0].startedAt, START_QUANTUM);

  backend.ExecuteActionOnPlayingID("break", playingID, 0);
  assert.equal(
    context.sources[0].stoppedAt,
    4 + START_QUANTUM,
    "break waits for one full buffer after the scheduled start",
  );
});


test("break lets the current finite repeat finish and stop overrides its schedule", async () =>
{
  const { context, finished, emitter, backend } = Harness({
    loadBuffer: async () => ({
      voices: [
        {
          buffer: { duration: 4 },
          loop: false,
          playCount: 3
        }
      ]
    })
  });
  const broken = backend.PostEvent(7, 1, 0, emitter, "repeated_shot");

  await tick();
  assert.equal(context.sources[0].stoppedAt, 12 + START_QUANTUM);

  context.currentTime = 1;
  backend.ExecuteActionOnPlayingID("break", broken, 0);
  assert.equal(
    context.sources[0].stoppedAt,
    4 + START_QUANTUM,
    "break ends the repeated sound at the current buffer boundary"
  );
  context.sources[0].onended?.();
  assert.deepEqual(finished, [broken]);

  context.currentTime = 5;
  const stopped = backend.PostEvent(8, 1, 0, emitter, "repeated_shot");
  await tick();
  assert.equal(context.sources[1].stoppedAt, 17 + START_QUANTUM);

  context.currentTime = 5.5;
  backend.ExecuteActionOnPlayingID("stop", stopped, 0);
  assert.equal(
    context.sources[1].stoppedAt,
    5.5,
    "stop replaces the authored finite-repeat end time"
  );

  context.currentTime = 20;
  const overdue = backend.PostEvent(9, 1, 0, emitter, "repeated_shot");
  await tick();
  assert.equal(context.sources[2].stoppedAt, 32 + START_QUANTUM);

  context.currentTime = 32.5;
  backend.ExecuteActionOnPlayingID("break", overdue, 0);
  assert.equal(
    context.sources[2].stoppedAt,
    32.5,
    "a late break cannot replace the authored end with a later boundary"
  );
});


test("UnregisterGameObj halts loaded sources and cancels in-flight loads", async () =>
{
  const pending = Deferred();
  let calls = 0;
  let inflightSignal = null;
  const { context, finished, emitter, backend } = Harness({
    loadBuffer: (eventID, eventName, controls) =>
    {
      calls++;
      if (calls === 1)
      {
        return Promise.resolve({ fake: "buffer" });
      }
      inflightSignal = controls.signal;
      return pending.promise;
    }
  });

  const loaded = backend.PostEvent(7, 1, 0, emitter, "shot_loaded");
  await tick();
  const inflight = backend.PostEvent(8, 1, 0, emitter, "shot_inflight");
  await tick();
  assert.equal(backend.GetPlayingCount(), 2);
  assert.equal(inflightSignal.aborted, false);

  backend.UnregisterGameObj(1);

  assert.equal(backend.GetPlayingCount(), 0, "no playing record survives its emitter");
  assert.deepEqual(finished.sort(), [loaded, inflight].sort(), "both records finished exactly once");
  assert.equal(context.sources[0].stoppedAt, 0, "the loaded source halts immediately");
  assert.equal(inflightSignal.aborted, true, "the in-flight load receives cancellation");

  pending.resolve({ fake: "buffer" });
  await tick();
  assert.equal(context.sources.length, 1, "the in-flight load never starts on the torn-down graph");
  assert.deepEqual(finished.sort(), [loaded, inflight].sort(), "resolution after teardown adds no callbacks");
});

test("StopAll aborts every pending non-music loader", async () =>
{
  const signals = [];
  const { finished, emitter, backend } = Harness({
    loadBuffer: (eventID, eventName, controls) =>
    {
      signals.push(controls.signal);
      return new Promise((resolve, reject) =>
      {
        controls.signal.addEventListener("abort", () =>
        {
          reject(controls.signal.reason);
        }, { once: true });
      });
    }
  });
  const first = backend.PostEvent(7, 1, 0, emitter, "pending_a");
  const second = backend.PostEvent(8, 1, 0, emitter, "pending_b");

  await tick();
  assert.equal(signals.length, 2);
  backend.StopAll();

  assert.equal(signals.every(signal => signal.aborted), true);
  assert.equal(backend.GetPlayingCount(), 0);
  assert.deepEqual(finished.sort(), [ first, second ].sort());
  await tick();
  assert.deepEqual(finished.sort(), [ first, second ].sort());
});


test("a synchronous media-loader failure cleans up the playing record", async () =>
{
  const { finished, emitter, backend } = Harness({
    loadBuffer()
    {
      throw new Error("decode failed");
    }
  });
  const playingID = backend.PostEvent(7, 1, 0, emitter, "broken");

  assert.ok(playingID > 0);
  await tick();
  assert.equal(backend.GetPlayingCount(), 0);
    assert.deepEqual(finished, [playingID]);
});


test("a later voice start failure stops an already-started sibling", async () =>
{
  const { context, finished, emitter, backend } = Harness({
    loadBuffer: async () => ({
      voices: [
        { buffer: { duration: 2 }, loop: true },
        { buffer: { duration: 2 }, loop: true }
      ]
    })
  });
  const createBufferSource = context.createBufferSource.bind(context);
  let created = 0;

  context.createBufferSource = () =>
  {
    const source = createBufferSource();

    created++;
    if (created === 2)
    {
      source.start = () =>
      {
        throw new Error("start failed");
      };
    }
    return source;
  };

  const playingID = backend.PostEvent(7, 1, 0, emitter, "layered");

  await tick();
  assert.equal(backend.GetPlayingCount(), 0);
  assert.equal(context.sources[0].stoppedAt, 0);
  assert.deepEqual(finished, [playingID]);
});


test("one authored event owns parallel voices with live per-object RTPC gains", async () =>
{
  let controls;
  const { context, finished, emitter, backend } = Harness({
    loadBuffer: async (eventID, eventName, suppliedControls) =>
    {
      controls = suppliedControls;
      return {
        voices: [
          {
            buffer: { duration: 2 },
            getGain: () => controls.getRTPC("intensity") ?? 0
          },
          {
            buffer: { duration: 2 },
            gain: 0.5
          }
        ]
      };
    }
  });

  backend.SetRTPCValue("intensity", 0.25, 1);
  const playingID = backend.PostEvent(7, 1, 0, emitter, "layered_shot");
  await tick();

  assert.equal(context.sources.length, 2);
  assert.equal(context.gains[3].gain.value, 0.25);
  assert.equal(context.gains[4].gain.value, 0.5);

  backend.SetRTPCValue("intensity", 0.75, 1);
  assert.equal(
    context.gains[3].gain.value,
    0.75,
    "an active authored curve updates without restarting its voice"
  );
  assert.equal(context.gains[4].gain.value, 0.5);

  context.sources[0].onended?.();
  assert.equal(
    backend.GetPlayingCount(),
    1,
    "the logical event survives until every parallel voice ends"
  );
  context.sources[1].onended?.();
  assert.deepEqual(finished, [playingID]);
  assert.equal(backend.GetPlayingCount(), 0);
});

test("setter-only authored events update controls and complete without a voice", async () =>
{
  const engine = new CjsSfxEngine({
    graph: {
      schemaVersion: 2,
      events: {},
      programs: {
        select_large: [
          { kind: "switch", group: "ship_size", value: "large" },
        ],
      },
      nodes: {},
    },
  });
  const { backend, emitter, finished, context } = Harness({
    loadBuffer: async (_eventID, eventName, controls) =>
    {
      assert.deepEqual(engine.ResolveEvent(eventName, controls), []);
      return { voices: [] };
    },
  });

  const playingID = backend.PostEvent(
    7,
    1,
    0,
    emitter,
    "select_large",
  );

  await tick();
  assert.equal(backend.GetSwitchValue("ship_size", 1), "large");
  assert.equal(context.sources.length, 0);
  assert.deepEqual(finished, [ playingID ]);
  assert.equal(backend.GetPlayingCount(), 0);
});

test("an authored Play then Stop cancels its pending slot before media resolves", async () =>
{
  const pending = Deferred();
  let signal = null;
  const { backend, emitter, finished, context } = Harness({
    loadBuffer: (_eventID, _eventName, controls) =>
    {
      signal = controls.signal;
      controls.installSfxProgram([
        {
          kind: "play",
          actionIndex: 0,
          selections: [
            {
              actionIndex: 0,
              leafIndex: 0,
              matchIds: [ "200", "700" ],
            },
          ],
        },
        {
          kind: "stop",
          actionIndex: 1,
          targetId: "700",
          scope: "game-object",
          mode: "element",
          delayMs: 0,
          transitionMs: 0,
          curve: 4,
          exceptions: [],
        },
      ]);
      return pending.promise;
    },
  });
  const playingID = backend.PostEvent(
    7,
    1,
    0,
    emitter,
    "play_then_stop",
  );

  assert.equal(backend.GetPlayingCount(), 1);
  assert.equal(context.sources.length, 0);
  assert.deepEqual(finished, []);

  await tick();

  assert.equal(signal.aborted, true);
  assert.equal(context.sources.length, 0);
  assert.equal(backend.GetPlayingCount(), 0);
  assert.deepEqual(finished, [ playingID ]);
});

test("same-stack program planning lets a due Stop cancel an earlier post", () =>
{
  const pending = Deferred();
  let playSignal = null;
  const { backend, emitter, finished, context } = Harness({
    resolveSfxProgram: (_eventID, eventName, controls) =>
    {
      if (eventName === "delayed_stop")
      {
        return [
          {
            kind: "stop",
            actionIndex: 0,
            targetId: "700",
            scope: "global",
            mode: "element",
            delayMs: 1000,
            transitionMs: 0,
            curve: 4,
            exceptions: [],
          },
        ];
      }

      playSignal = controls.signal;
      return [
        {
          kind: "play",
          actionIndex: 0,
          selections: [
            {
              actionIndex: 0,
              leafIndex: 0,
              matchIds: [ "200", "700" ],
            },
          ],
        },
      ];
    },
    loadBuffer: (_eventID, eventName) =>
      eventName === "delayed_stop"
        ? { voices: [] }
        : pending.promise,
  });
  const stopID = backend.PostEvent(
    8,
    1,
    0,
    emitter,
    "delayed_stop",
  );

  context.currentTime = 0.5;
  const playID = backend.PostEvent(
    7,
    1,
    0,
    emitter,
    "earlier_play",
  );
  context.currentTime = 1;
  backend.RenderAudio();

  assert.equal(playSignal.aborted, true);
  assert.equal(context.sources.length, 0);
  assert.equal(backend.GetPlayingCount(), 0);
  assert.deepEqual(finished.sort(), [ stopID, playID ].sort());
});

test("an authored Stop then Play preserves the later same-time slot", async () =>
{
  const { backend, emitter, context } = Harness({
    loadBuffer: async (_eventID, _eventName, controls) =>
    {
      controls.installSfxProgram([
        {
          kind: "stop",
          actionIndex: 0,
          targetId: "700",
          scope: "game-object",
          mode: "element",
          delayMs: 0,
          transitionMs: 0,
          curve: 4,
          exceptions: [],
        },
        {
          kind: "play",
          actionIndex: 1,
          selections: [
            {
              actionIndex: 1,
              leafIndex: 0,
              matchIds: [ "200", "700" ],
            },
          ],
        },
      ]);
      return {
        voices: [
          {
            buffer: { duration: 2 },
            programSlotId: "1:0",
          },
        ],
      };
    },
  });

  backend.PostEvent(7, 1, 0, emitter, "stop_then_play");
  await tick();

  assert.equal(context.sources.length, 1);
  assert.equal(context.sources[0].started, true);
  assert.equal(context.sources[0].stoppedAt, null);
});

test("a delayed authored Stop keeps its owner alive and uses its transition curve", async () =>
{
  const { backend, emitter, finished, context } = Harness({
    loadBuffer: async (_eventID, _eventName, controls) =>
    {
      controls.installSfxProgram([
        {
          kind: "play",
          actionIndex: 0,
          selections: [
            {
              actionIndex: 0,
              leafIndex: 0,
              matchIds: [ "200", "700" ],
            },
          ],
        },
        {
          kind: "stop",
          actionIndex: 1,
          targetId: "700",
          scope: "game-object",
          mode: "element",
          delayMs: 1000,
          transitionMs: 250,
          curve: 2,
          exceptions: [],
        },
      ]);
      return {
        voices: [
          {
            buffer: { duration: 2 },
            programSlotId: "0:0",
          },
        ],
      };
    },
  });
  const playingID = backend.PostEvent(
    7,
    1,
    0,
    emitter,
    "delayed_stop",
  );

  await tick();
  assert.equal(backend.GetPlayingCount(), 1);
  assert.equal(context.sources[0].stoppedAt, null);

  context.currentTime = 1;
  backend.RenderAudio();

  assert.equal(context.sources[0].stoppedAt, 1.25);
  assert.equal(context.gains[3].gain.curves.length, 1);
  assert.deepEqual(finished, []);
  assert.equal(backend.GetPlayingCount(), 1);

  context.sources[0].onended?.();
  assert.deepEqual(finished, [ playingID ]);
  assert.equal(backend.GetPlayingCount(), 0);
});

test("explicit stop clears an owned delayed Stop before the voice ends", async () =>
{
  const { backend, emitter, finished, context } = Harness({
    loadBuffer: async (_eventID, _eventName, controls) =>
    {
      controls.installSfxProgram([
        {
          kind: "play",
          actionIndex: 0,
          selections: [
            {
              actionIndex: 0,
              leafIndex: 0,
              matchIds: [ "200", "700" ],
            },
          ],
        },
        {
          kind: "stop",
          actionIndex: 1,
          targetId: "700",
          scope: "game-object",
          mode: "element",
          delayMs: 10000,
          transitionMs: 250,
          curve: 4,
          exceptions: [],
        },
      ]);
      return {
        voices: [
          {
            buffer: { duration: 20 },
            programSlotId: "0:0",
          },
        ],
      };
    },
  });
  const playingID = backend.PostEvent(
    7,
    1,
    0,
    emitter,
    "long_delayed_stop",
  );

  await tick();
  backend.ExecuteActionOnPlayingID("stop", playingID, 0);
  context.sources[0].onended?.();

  assert.deepEqual(finished, [ playingID ]);
  assert.equal(backend.GetPlayingCount(), 0);
});

test("an overdue authored Stop catches up instead of restarting its full fade", async () =>
{
  const { backend, emitter, context } = Harness({
    loadBuffer: async (_eventID, _eventName, controls) =>
    {
      controls.installSfxProgram([
        {
          kind: "play",
          actionIndex: 0,
          selections: [
            {
              actionIndex: 0,
              leafIndex: 0,
              matchIds: [ "200", "700" ],
            },
          ],
        },
        {
          kind: "stop",
          actionIndex: 1,
          targetId: "700",
          scope: "game-object",
          mode: "element",
          delayMs: 1000,
          transitionMs: 250,
          curve: 2,
          exceptions: [],
        },
      ]);
      return {
        voices: [
          {
            buffer: { duration: 20 },
            programSlotId: "0:0",
          },
        ],
      };
    },
  });

  backend.PostEvent(7, 1, 0, emitter, "overdue_stop");
  await tick();

  context.currentTime = 2;
  backend.RenderAudio();

  assert.equal(context.sources[0].stoppedAt, 2);
  assert.equal(context.gains[3].gain.value, 0);
  assert.deepEqual(context.gains[3].gain.curves, []);
});

test("late media resolution applies an overdue Stop before realizing its voice", async () =>
{
  const pending = Deferred();
  let loaderSignal = null;
  const { backend, emitter, finished, context } = Harness({
    resolveSfxProgram: () => [
      {
        kind: "play",
        actionIndex: 0,
        selections: [
          {
            actionIndex: 0,
            leafIndex: 0,
            matchIds: [ "200", "700" ],
          },
        ],
      },
      {
        kind: "stop",
        actionIndex: 1,
        targetId: "700",
        scope: "game-object",
        mode: "element",
        delayMs: 1000,
        transitionMs: 0,
        curve: 4,
        exceptions: [],
      },
    ],
    loadBuffer: (_eventID, _eventName, controls) =>
    {
      loaderSignal = controls.signal;
      return pending.promise;
    },
  });
  const playingID = backend.PostEvent(
    7,
    1,
    0,
    emitter,
    "late_media",
  );

  await tick();
  context.currentTime = 2;
  pending.resolve({
    voices: [
      {
        buffer: { duration: 20 },
        programSlotId: "0:0",
      },
    ],
  });
  await tick();

  assert.equal(loaderSignal.aborted, true);
  assert.equal(context.sources.length, 0);
  assert.equal(backend.GetPlayingCount(), 0);
  assert.deepEqual(finished, [ playingID ]);
});

test("a later authored Stop can shorten an in-progress Stop fade", async () =>
{
  const resolveSfxProgram = (_eventID, eventName) =>
  {
    const transitionMs = eventName === "stop_long"
      ? 5000
      : eventName === "stop_now"
        ? 0
        : null;

    if (transitionMs !== null)
    {
      return [
        {
          kind: "stop",
          actionIndex: 0,
          targetId: "700",
          scope: "game-object",
          mode: "element",
          delayMs: 0,
          transitionMs,
          curve: 4,
          exceptions: [],
        },
      ];
    }

    return [
      {
        kind: "play",
        actionIndex: 0,
        selections: [
          {
            actionIndex: 0,
            leafIndex: 0,
            matchIds: [ "200", "700" ],
          },
        ],
      },
    ];
  };
  const loadBuffer = async (_eventID, eventName) =>
    eventName === "stop_long" || eventName === "stop_now"
      ? { voices: [] }
      : {
      voices: [
        {
          buffer: { duration: 20 },
          programSlotId: "0:0",
        },
      ],
    };
  const { backend, emitter, context } = Harness({
    loadBuffer,
    resolveSfxProgram,
  });

  backend.PostEvent(7, 1, 0, emitter, "loop");
  await tick();

  context.currentTime = 0.1;
  backend.PostEvent(8, 1, 0, emitter, "stop_long");
  assert.equal(context.sources[0].stoppedAt, 5.1);

  context.currentTime = 0.2;
  backend.PostEvent(9, 1, 0, emitter, "stop_now");
  assert.equal(context.sources[0].stoppedAt, 0.2);
  assert.equal(context.gains[3].gain.value, 0);
});

test("game-object element Stops match raw hierarchy ids without crossing emitters", async () =>
{
  const loadBuffer = async (_eventID, eventName, controls) =>
  {
    const stop = eventName === "stop_parent";

    controls.installSfxProgram(stop
      ? [
          {
            kind: "stop",
            actionIndex: 0,
            targetId: "700",
            scope: "game-object",
            mode: "element",
            delayMs: 0,
            transitionMs: 0,
            curve: 4,
            exceptions: [],
          },
        ]
      : [
          {
            kind: "play",
            actionIndex: 0,
            selections: [
              {
                actionIndex: 0,
                leafIndex: 0,
                matchIds: [ "200", "700" ],
              },
            ],
          },
        ]);
    return stop
      ? { voices: [] }
      : {
          voices: [
            {
              buffer: { duration: 2 },
              programSlotId: "0:0",
            },
          ],
        };
  };
  const { backend, emitter, context } = Harness({ loadBuffer });

  backend.RegisterGameObj(2);
  backend.PostEvent(7, 1, 0, emitter, "loop_a");
  backend.PostEvent(7, 2, 0, emitter, "loop_b");
  await tick();

  backend.PostEvent(8, 1, 0, emitter, "stop_parent");
  await tick();

  assert.equal(context.sources[0].stoppedAt, 0);
  assert.equal(
    context.sources[1].stoppedAt,
    null,
    "game-object scope does not stop a matching hierarchy on another emitter",
  );
});

test("global Stop-All exceptions protect matching hierarchy branches", async () =>
{
  const loadBuffer = async (_eventID, eventName, controls) =>
  {
    const stop = eventName === "stop_all_except";
    const protectedVoice = eventName === "protected";

    controls.installSfxProgram(stop
      ? [
          {
            kind: "stop",
            actionIndex: 0,
            targetId: "0",
            scope: "global",
            mode: "all-except",
            delayMs: 0,
            transitionMs: 0,
            curve: 4,
            exceptions: [ { targetId: "700", targetFlags: 0 } ],
          },
        ]
      : [
          {
            kind: "play",
            actionIndex: 0,
            selections: [
              {
                actionIndex: 0,
                leafIndex: 0,
                matchIds: protectedVoice
                  ? [ "200", "700" ]
                  : [ "300", "800" ],
              },
            ],
          },
        ]);
    return stop
      ? { voices: [] }
      : {
          voices: [
            {
              buffer: { duration: 2 },
              programSlotId: "0:0",
            },
          ],
        };
  };
  const { backend, emitter, context } = Harness({ loadBuffer });

  backend.RegisterGameObj(2);
  backend.PostEvent(7, 1, 0, emitter, "protected");
  backend.PostEvent(7, 2, 0, emitter, "unprotected");
  await tick();

  backend.PostEvent(8, 1, 0, emitter, "stop_all_except");
  await tick();

  assert.equal(context.sources[0].stoppedAt, null);
  assert.equal(context.sources[1].stoppedAt, 0);
});

test("game-object Stop-All includes flat fallback SFX but excludes other emitters", async () =>
{
  const stopProgram = [
        {
          kind: "stop",
          actionIndex: 0,
          targetId: "0",
          scope: "game-object",
          mode: "all",
          delayMs: 0,
          transitionMs: 0,
          curve: 4,
          exceptions: [],
        },
  ];
  const { backend, emitter, context } = Harness({
    resolveSfxProgram: (_eventID, eventName) =>
      eventName === "stop_all" ? stopProgram : null,
    loadBuffer: async (_eventID, eventName) =>
      eventName === "stop_all"
        ? { voices: [] }
        : { voices: [ { buffer: { duration: 20 } } ] },
  });

  backend.RegisterGameObj(2);
  backend.PostEvent(7, 1, 0, emitter, "flat_a");
  backend.PostEvent(7, 2, 0, emitter, "flat_b");
  await tick();

  backend.PostEvent(8, 1, 0, emitter, "stop_all");

  assert.equal(context.sources[0].stoppedAt, 0);
  assert.equal(context.sources[1].stoppedAt, null);
});

test("authored SFX Stop-All never dispatches into the music engine", async () =>
{
  const musicActions = [];
  const musicEngine = {
    HandlesEvent: eventName => eventName === "music_play",
    PostEvent() {},
    ExecuteAction: (...args) => musicActions.push(args),
    Process() {},
    Dispose() {},
  };
  const loadBuffer = async (_eventID, eventName, controls) =>
  {
    controls.installSfxProgram(eventName === "stop_all"
      ? [
          {
            kind: "stop",
            actionIndex: 0,
            targetId: "0",
            scope: "global",
            mode: "all",
            delayMs: 0,
            transitionMs: 0,
            curve: 4,
            exceptions: [],
          },
        ]
      : []);
    return { voices: [] };
  };
  const { backend, emitter } = Harness({
    loadBuffer,
    musicEngine,
  });

  backend.PostEvent(1, 1, 0, emitter, "music_play");
  backend.PostEvent(2, 1, 0, emitter, "stop_all");
  await tick();

  assert.deepEqual(musicActions, []);
  assert.equal(
    backend.GetPlayingCount(),
    1,
    "the music playing ID survives the SFX Stop-All",
  );
});

test("parallel voices and seek restarts share one sample-time anchor", async () =>
{
  const { context, emitter, backend } = Harness({
    loadBuffer: async () => ({
      voices: [
        {
          buffer: { duration: 2 },
          playCount: 2
        },
        {
          buffer: { duration: 2 },
          playCount: 2
        }
      ]
    })
  });
  let now = 10;

  Object.defineProperty(context, "currentTime", {
    configurable: true,
    get()
    {
      now += 0.00025;
      return now;
    }
  });

  const playingID = backend.PostEvent(
    7,
    1,
    0,
    emitter,
    "layered_repeat",
  );

  await tick();
  assert.equal(context.sources[0].startedAt, context.sources[1].startedAt);
  assert.equal(context.sources[0].stoppedAt, context.sources[1].stoppedAt);
  assert.ok(context.sources[0].startedAt > context.sources[0].observedNow);
  assert.ok(context.sources[1].startedAt > context.sources[1].observedNow);

  assert.equal(backend.SeekOnEventMs(playingID, 500), true);
  assert.equal(context.sources.length, 4);
  assert.equal(context.sources[2].startedAt, context.sources[3].startedAt);
  assert.ok(context.sources[2].startedAt > context.sources[2].observedNow);
  assert.ok(context.sources[3].startedAt > context.sources[3].observedNow);
  assert.equal(context.sources[2].offset, 0.5);
  assert.equal(context.sources[3].offset, 0.5);
  assert.equal(context.sources[2].stoppedAt, context.sources[3].stoppedAt);
  assert.equal(
    context.sources[0].stoppedAt,
    context.sources[1].stoppedAt,
    "replaced sibling sources stop on the same restart boundary",
  );

  backend.ExecuteActionOnPlayingID("stop", playingID, 500);
  assert.equal(context.sources[2].stoppedAt, context.sources[3].stoppedAt);
  assert.deepEqual(
    context.gains[3].gain.ramps,
    context.gains[4].gain.ramps,
    "parallel stop fades share one action-time anchor",
  );
});


test("a non-spatial voice bypasses the emitter panner but keeps voice and SFX gain", async () =>
{
  const { context, emitter, backend } = Harness({
    loadBuffer: async () => ({
      voices: [
        {
          buffer: { duration: 2 },
          spatial: false
        }
      ]
    })
  });

  backend.PostEvent(7, 1, 0, emitter, "ui_click");
  await tick();

  assert.equal(
    context.gains[4].connectedTo,
    context.gains[1],
    "the lazy 2D emitter gain feeds the SFX bus directly"
  );
  assert.equal(
    context.gains[3].connectedTo,
    context.gains[4],
    "the voice retains an emitter-level gain before the 2D bus",
  );
  assert.notEqual(context.gains[3].connectedTo, context.gains[2]);
});

test("stored object RTPCs replay when the lazy non-spatial route is created", async () =>
{
  const applied = [];
  const { context, emitter, backend } = Harness({
    applyRTPC: value => applied.push(value),
    loadBuffer: async () => ({
      voices: [ {
        buffer: { duration: 2 },
        spatial: false,
      } ],
    }),
  });

  backend.SetRTPCValue("ui_mix", 0.4, 1);
  assert.equal(applied.length, 1);
  assert.equal(applied[0].flatGain, null);

  backend.PostEvent(7, 1, 0, emitter, "ui_click");
  await tick();

  assert.equal(applied.length, 2);
  assert.equal(applied[1].rtpcName, "ui_mix");
  assert.equal(applied[1].value, 0.4);
  assert.equal(
    applied[1].flatGain,
    context.gains[4].gain,
    "the adapter receives the newly created flat emitter gain",
  );
});
