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
    filters: [],
    panners: [],
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
      const node = {
        panningModel: "", distanceModel: "", refDistance: 1,
        positionX: FakeParam(0), positionY: FakeParam(0), positionZ: FakeParam(0),
        disconnected: false,
        connect: () => {},
        disconnect: () =>
        {
          node.disconnected = true;
        }
      };
      context.panners.push(node);
      return node;
    },
    createBiquadFilter()
    {
      const node = {
        type: "",
        frequency: FakeParam(0),
        Q: FakeParam(1),
        connectedTo: null,
        disconnected: false,
        connect(target)
        {
          node.connectedTo = target;
        },
        disconnect()
        {
          node.disconnected = true;
        },
      };
      context.filters.push(node);
      return node;
    },
    createBufferSource()
    {
      const source = {
        buffer: null, loop: false, onended: null, started: false, stoppedAt: null,
        connectedTo: null, playbackRate: FakeParam(1),
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

// Gain creation order: gains[0] master, gains[1] the SFX bus, gains[2] the
// emitter gain from RegisterGameObj; each ordinary voice then appends its
// live control gain and independent Stop envelope.
function Harness({
  loadBuffer,
  isLoop,
  applyRTPC,
  musicEngine,
  hasSfxEvent,
  resolveSfxProgram,
  continueSfxProgram,
  prepareSfxProgram,
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
    continueSfxProgram,
    prepareSfxProgram: prepareSfxProgram ?? (
      typeof continueSfxProgram === "function"
        ? (token, controls) => ({
            program: continueSfxProgram(token, controls),
            commit() {},
            rollback() {},
          })
        : undefined
    ),
  });
  backend.RegisterGameObj(1);
  return { context, finished, emitter, backend };
}

test("invalid RTPC and attenuation values fail without replacing live backend state", () =>
{
  const applied = [];
  const { context, backend } = Harness({
    applyRTPC: value => applied.push(value),
  });

  assert.equal(backend.SetRTPCValue("speed", 0.5, 1), true);
  assert.equal(backend.SetRTPCValue("speed", Infinity, 1), false);
  assert.equal(backend.GetRTPCValue("speed", 1), 0.5);
  assert.equal(applied.length, 1);

  assert.equal(backend.SetGlobalRTPCValue("volume", 0.75), true);
  assert.equal(backend.SetGlobalRTPCValue("volume", NaN), false);
  assert.equal(backend.GetGlobalRTPCValue("volume"), 0.75);

  assert.equal(backend.SetScalingFactor(1, 2), true);
  assert.equal(context.panners[0].refDistance, 2);
  assert.equal(backend.SetScalingFactor(1, 0), false);
  assert.equal(backend.SetScalingFactor(1, Infinity), false);
  assert.equal(context.panners[0].refDistance, 2);
  assert.equal(backend.SetScalingFactor(404, 1), false);
});

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

test("Continuous slots wait for the whole batch and schedule authored Delay", async () =>
{
  const token = {};
  const slot = "0:c0";
  let advances = 0;
  const play = (media, delayMs = 0) => [
    {
      kind: "play",
      actionIndex: 0,
      selections: media.map((mediaID, leafIndex) => ({
        actionIndex: 0,
        leafIndex,
        programSlotId: slot,
        matchIds: [ "10", String(mediaID) ],
      })),
      continuations: [
        {
          programSlotId: slot,
          token,
          delayMs,
        },
      ],
    },
  ];
  const { backend, context, emitter, finished } = Harness({
    resolveSfxProgram: () => play([ 100, 200 ]),
    continueSfxProgram: () =>
    {
      advances++;
      return advances === 1 ? play([ 300 ], 500) : [];
    },
    loadBuffer: async (_eventID, _eventName, _controls, program) => ({
      voices: program.flatMap(operation =>
        operation.selections.map(selection => ({
          buffer: { duration: 1 },
          programSlotId: selection.programSlotId,
        }))),
    }),
  });
  const playingID = backend.PostEvent(
    7,
    1,
    0,
    emitter,
    "continuous",
  );

  await tick();
  assert.equal(context.sources.length, 2);

  context.currentTime = 1;
  context.sources[0].onended();
  await tick();
  assert.equal(
    advances,
    0,
    "one parallel leaf cannot advance its shared child batch",
  );

  context.sources[1].onended();
  await tick();
  await tick();

  assert.equal(advances, 1);
  assert.equal(context.sources.length, 3);
  assert.equal(context.sources[2].startedAt, 1.5);

  context.currentTime = 2.5;
  context.sources[2].onended();
  await tick();

  assert.equal(advances, 2);
  assert.deepEqual(finished, [ playingID ]);
  assert.equal(backend.GetPlayingCount(), 0);
});

test("Trigger Rate schedules overlapping batches from authored action times", async () =>
{
  const token = {};
  const slot = "0:c0";
  let advances = 0;
  const play = (batch, mediaID, delayMs, doneAfterBatch = false) => [
    {
      kind: "play",
      actionIndex: 0,
      selections: [
        {
          actionIndex: 0,
          leafIndex: 0,
          programSlotId: slot,
          programBatchId: `${slot}:b${batch}`,
          delayMs,
          matchIds: [ "10", String(mediaID) ],
        },
      ],
      continuations: [
        {
          programSlotId: slot,
          token,
          containerId: "10",
          advance: "trigger-rate",
          delayMs: 500,
          doneAfterBatch,
        },
      ],
    },
  ];
  const { backend, context, emitter, finished } = Harness({
    resolveSfxProgram: () => play(0, 100, 100),
    continueSfxProgram: () =>
    {
      advances++;
      return advances === 1
        ? play(1, 200, 200, true)
        : [];
    },
    loadBuffer: async (_eventID, _eventName, _controls, program) => ({
      voices: program.flatMap(operation =>
        operation.selections.map(selection => ({
          buffer: { duration: 2 },
          delayMs: selection.delayMs,
          programSlotId: selection.programSlotId,
          programBatchId: selection.programBatchId,
        }))),
    }),
  });
  const playingID = backend.PostEvent(
    7,
    1,
    0,
    emitter,
    "trigger_rate",
  );

  await tick();
  assert.equal(context.sources.length, 1);
  assert.equal(context.sources[0].startedAt, 0.1);
  assert.equal(backend.SeekOnEventMs(playingID, 250), false);
  assert.equal(context.sources.length, 1);

  context.currentTime = 0.599;
  backend.RenderAudio();
  await tick();
  assert.equal(advances, 0);

  context.currentTime = 0.6;
  backend.RenderAudio();
  await tick();
  await tick();

  assert.equal(advances, 1);
  assert.equal(context.sources.length, 2);
  assert.equal(context.sources[1].startedAt, 0.8);
  assert.equal(
    context.sources[0].stoppedAt,
    null,
    "the first voice keeps playing under the second trigger",
  );

  context.currentTime = 1.299;
  backend.RenderAudio();
  assert.equal(advances, 1);

  context.currentTime = 1.3;
  backend.RenderAudio();

  assert.equal(advances, 1);
  assert.deepEqual(finished, []);

  context.sources[0].onended();
  assert.deepEqual(finished, []);
  context.sources[1].onended();

  assert.deepEqual(finished, [ playingID ]);
  assert.equal(backend.GetPlayingCount(), 0);
});

test("Continuous amplitude Crossfade prefetches and clamps overlap to half the outgoing file", async () =>
{
  const token = {};
  const slot = "0:c0";
  let advances = 0;
  const play = (batch, mediaID, doneAfterBatch = false) => [
    {
      kind: "play",
      actionIndex: 0,
      selections: [
        {
          actionIndex: 0,
          leafIndex: 0,
          programSlotId: slot,
          programBatchId: `${slot}:b${batch}`,
          matchIds: [ "10", String(mediaID) ],
        },
      ],
      continuations: [
        {
          programSlotId: slot,
          token,
          containerId: "10",
          advance: "crossfade",
          crossfadeMode: "crossfade-amplitude",
          delayMs: 10000,
          doneAfterBatch,
        },
      ],
    },
  ];
  const { backend, context, emitter, finished } = Harness({
    resolveSfxProgram: () => play(0, 100),
    continueSfxProgram: () =>
    {
      advances++;
      return advances === 1
        ? play(1, 200, true)
        : [];
    },
    loadBuffer: async (_eventID, _eventName, _controls, program) => ({
      voices: program.flatMap(operation =>
        operation.selections.map(selection => ({
          buffer: { duration: 4 },
          programSlotId: selection.programSlotId,
          programBatchId: selection.programBatchId,
        }))),
    }),
  });
  const playingID = backend.PostEvent(
    7,
    1,
    0,
    emitter,
    "crossfade",
  );

  await tick();
  await tick();
  await tick();

  const boundary = START_QUANTUM + 2;
  const end = START_QUANTUM + 4;

  assert.equal(advances, 1, "the successor is selected for lookahead");
  assert.equal(context.sources.length, 2);
  assert.equal(context.sources[0].startedAt, START_QUANTUM);
  assert.ok(
    Math.abs(context.sources[1].startedAt - boundary) < 1e-9,
  );
  assert.equal(backend.SeekOnEventMs(playingID, 250), false);
  assert.deepEqual(context.gains[4].gain.ramps, [ [ 0, end ] ]);
  assert.deepEqual(context.gains[7].gain.ramps, [ [ 1, end ] ]);

  context.currentTime = boundary;
  backend.RenderAudio();

  context.currentTime = end;
  context.sources[0].onended();
  assert.deepEqual(finished, []);

  context.currentTime = boundary + 4;
  context.sources[1].onended();
  assert.deepEqual(finished, [ playingID ]);
  assert.equal(backend.GetPlayingCount(), 0);
});

test("Crossfade fails closed when no transactional preparation provider exists", async () =>
{
  const token = {};
  let destructiveAdvances = 0;
  const play = (batch, doneAfterBatch = false) => [
    {
      kind: "play",
      actionIndex: 0,
      selections: [
        {
          actionIndex: 0,
          leafIndex: 0,
          programSlotId: "0:c0",
          programBatchId: `0:c0:b${batch}`,
          matchIds: [ "10", String(batch) ],
        },
      ],
      continuations: [
        {
          programSlotId: "0:c0",
          token,
          containerId: "10",
          advance: "crossfade",
          crossfadeMode: "crossfade-amplitude",
          delayMs: 500,
          doneAfterBatch,
        },
      ],
    },
  ];
  const context = FakeContext();
  const backend = new CjsAudioBackend({
    context,
    resolveSfxProgram: () => play(0),
    continueSfxProgram: () =>
    {
      destructiveAdvances++;
      return play(1, true);
    },
    loadBuffer: async (_eventID, _eventName, _controls, program) => ({
      voices: program.flatMap(operation =>
        operation.selections.map(selection => ({
          buffer: { duration: 1 },
          programSlotId: selection.programSlotId,
          programBatchId: selection.programBatchId,
        }))),
    }),
  });

  backend.RegisterGameObj(1);
  backend.PostEvent(7, 1, 0, null, "crossfade");
  await tick();
  await tick();

  assert.equal(context.sources.length, 1);
  assert.equal(destructiveAdvances, 0);
});

test("Continuous power Crossfade uses equal-power gain curves", async () =>
{
  const token = {};
  const slot = "0:c0";
  let advances = 0;
  const play = (batch, doneAfterBatch = false) => [
    {
      kind: "play",
      actionIndex: 0,
      selections: [
        {
          actionIndex: 0,
          leafIndex: 0,
          programSlotId: slot,
          programBatchId: `${slot}:b${batch}`,
          matchIds: [ "10", String(batch) ],
        },
      ],
      continuations: [
        {
          programSlotId: slot,
          token,
          containerId: "10",
          advance: "crossfade",
          crossfadeMode: "crossfade-power",
          delayMs: 1000,
          doneAfterBatch,
        },
      ],
    },
  ];
  const { backend, context, emitter } = Harness({
    resolveSfxProgram: () => play(0),
    continueSfxProgram: () =>
    {
      advances++;
      return advances === 1 ? play(1, true) : [];
    },
    loadBuffer: async (_eventID, _eventName, _controls, program) => ({
      voices: program.flatMap(operation =>
        operation.selections.map(selection => ({
          buffer: { duration: 4 },
          programSlotId: selection.programSlotId,
          programBatchId: selection.programBatchId,
        }))),
    }),
  });

  backend.PostEvent(7, 1, 0, emitter, "crossfade_power");
  await tick();
  await tick();
  await tick();

  const outgoing = context.gains[4].gain.curves[0];
  const incoming = context.gains[7].gain.curves[0];

  assert.ok(
    Math.abs(outgoing[1] - (START_QUANTUM + 3)) < 1e-9,
  );
  assert.ok(
    Math.abs(incoming[1] - (START_QUANTUM + 3)) < 1e-9,
  );
  assert.equal(outgoing[2], 1);
  assert.equal(incoming[2], 1);
  assert.ok(Math.abs(outgoing[0][32] - Math.SQRT1_2) < 1e-6);
  assert.ok(Math.abs(incoming[0][32] - Math.SQRT1_2) < 1e-6);
});

test("late Crossfade media rebases after the outgoing voice has ended", async () =>
{
  const pending = Deferred();
  const token = {};
  let loads = 0;
  const play = (batch, doneAfterBatch = false) => [
    {
      kind: "play",
      actionIndex: 0,
      selections: [
        {
          actionIndex: 0,
          leafIndex: 0,
          programSlotId: "0:c0",
          programBatchId: `0:c0:b${batch}`,
          matchIds: [ "10", String(batch) ],
        },
      ],
      continuations: [
        {
          programSlotId: "0:c0",
          token,
          containerId: "10",
          advance: "crossfade",
          crossfadeMode: "crossfade-amplitude",
          delayMs: 400,
          doneAfterBatch,
        },
      ],
    },
  ];
  const { backend, context, emitter, finished } = Harness({
    resolveSfxProgram: () => play(0),
    continueSfxProgram: () => play(1, true),
    loadBuffer: (_eventID, _eventName, _controls, program) =>
    {
      loads++;
      if (loads === 1)
      {
        return Promise.resolve({
          voices: [
            {
              buffer: { duration: 1 },
              programSlotId: "0:c0",
              programBatchId: "0:c0:b0",
            },
          ],
        });
      }
      return pending.promise;
    },
  });
  const playingID = backend.PostEvent(
    7,
    1,
    0,
    emitter,
    "late_crossfade",
  );

  await tick();
  assert.equal(loads, 2, "the successor starts loading immediately");

  context.currentTime = START_QUANTUM + 1;
  context.sources[0].onended();
  assert.deepEqual(finished, []);

  pending.resolve({
    voices: [
      {
        buffer: { duration: 1 },
        programSlotId: "0:c0",
        programBatchId: "0:c0:b1",
      },
    ],
  });
  await tick();
  await tick();

  assert.equal(context.sources.length, 2);
  assert.ok(
    Math.abs(
      context.sources[1].startedAt
        - (context.currentTime + START_QUANTUM),
    ) < 1e-9,
  );
  assert.deepEqual(
    context.gains[7].gain.ramps,
    [],
    "there is no orphan fade after the outgoing source has ended",
  );

  context.currentTime = context.sources[1].startedAt;
  backend.RenderAudio();
  context.sources[1].onended();

  assert.deepEqual(finished, [ playingID ]);
});

test("a Crossfade successor start failure discards its batch and settles", async () =>
{
  const token = {};
  let sources = 0;
  const play = (batch, doneAfterBatch = false) => [
    {
      kind: "play",
      actionIndex: 0,
      selections: [
        {
          actionIndex: 0,
          leafIndex: 0,
          programSlotId: "0:c0",
          programBatchId: `0:c0:b${batch}`,
          matchIds: [ "10", String(batch) ],
        },
      ],
      continuations: [
        {
          programSlotId: "0:c0",
          token,
          containerId: "10",
          advance: "crossfade",
          crossfadeMode: "crossfade-amplitude",
          delayMs: 200,
          doneAfterBatch,
        },
      ],
    },
  ];
  const context = FakeContext();
  const createBufferSource = context.createBufferSource;

  context.createBufferSource = () =>
  {
    const source = createBufferSource();

    sources++;
    if (sources === 2)
    {
      source.start = () =>
      {
        throw new Error("crossfade source start failed");
      };
    }
    return source;
  };
  const finished = [];
  const emitter = {
    EventFinishedCallback: playingID =>
      finished.push(playingID),
  };
  const backend = new CjsAudioBackend({
    context,
    resolveSfxProgram: () => play(0),
    prepareSfxProgram: () => ({
      program: play(1, true),
      commit() {},
      rollback() {},
    }),
    loadBuffer: async (_eventID, _eventName, _controls, program) => ({
      voices: program.flatMap(operation =>
        operation.selections.map(selection => ({
          buffer: { duration: 1 },
          programSlotId: selection.programSlotId,
          programBatchId: selection.programBatchId,
        }))),
    }),
  });

  backend.RegisterGameObj(1);
  const playingID = backend.PostEvent(
    7,
    1,
    0,
    emitter,
    "crossfade_start_failure",
  );

  await tick();
  await tick();
  await tick();

  assert.equal(context.sources.length, 2);
  assert.deepEqual(finished, []);
  context.sources[0].onended();

  assert.deepEqual(finished, [ playingID ]);
  assert.equal(backend.GetPlayingCount(), 0);
});

test("authored Stop cancels a prefetched Crossfade successor before it starts", async () =>
{
  const token = {};
  const slot = "0:c0";
  let commits = 0;
  let rollbacks = 0;
  const play = (batch, doneAfterBatch = false) => [
    {
      kind: "play",
      actionIndex: 0,
      selections: [
        {
          actionIndex: 0,
          leafIndex: 0,
          programSlotId: slot,
          programBatchId: `${slot}:b${batch}`,
          matchIds: [ "10", String(batch) ],
        },
      ],
      continuations: [
        {
          programSlotId: slot,
          token,
          containerId: "10",
          advance: "crossfade",
          crossfadeMode: "crossfade-amplitude",
          delayMs: 1000,
          doneAfterBatch,
        },
      ],
    },
  ];
  const stop = [
    {
      kind: "stop",
      actionIndex: 0,
      targetId: "10",
      targetFlags: 0,
      scope: "game-object",
      mode: "element",
      delayMs: 0,
      transitionMs: 0,
      curve: 4,
      exceptions: [],
    },
  ];
  const { backend, context, emitter } = Harness({
    resolveSfxProgram: (_eventID, eventName) =>
      eventName === "stop_crossfade" ? stop : play(0),
    prepareSfxProgram: () => ({
      program: play(1, true),
      commit()
      {
        commits++;
      },
      rollback()
      {
        rollbacks++;
      },
    }),
    loadBuffer: async (_eventID, eventName, _controls, program) =>
      eventName === "stop_crossfade"
        ? { voices: [] }
        : {
            voices: program.flatMap(operation =>
              operation.selections.map(selection => ({
                buffer: { duration: 4 },
                programSlotId: selection.programSlotId,
                programBatchId: selection.programBatchId,
              }))),
          },
  });

  backend.PostEvent(7, 1, 0, emitter, "crossfade");
  await tick();
  await tick();
  await tick();

  assert.equal(context.sources.length, 2);
  assert.ok(context.sources[1].startedAt > context.currentTime);

  context.currentTime = 0.1;
  backend.PostEvent(8, 1, 0, emitter, "stop_crossfade");
  await tick();

  assert.equal(
    context.sources[1].stoppedAt,
    0.1,
    "the prestarted future source is cancelled with its container",
  );
  assert.equal(commits, 0);
  assert.equal(rollbacks, 1);
});

test("public Stop commits a successor already heard during a render stall", async () =>
{
  const token = {};
  let commits = 0;
  let rollbacks = 0;
  const play = (batch, doneAfterBatch = false) => [
    {
      kind: "play",
      actionIndex: 0,
      selections: [
        {
          actionIndex: 0,
          leafIndex: 0,
          programSlotId: "0:c0",
          programBatchId: `0:c0:b${batch}`,
          matchIds: [ "10", String(batch) ],
        },
      ],
      continuations: [
        {
          programSlotId: "0:c0",
          token,
          containerId: "10",
          advance: "crossfade",
          crossfadeMode: "crossfade-amplitude",
          delayMs: 1000,
          doneAfterBatch,
        },
      ],
    },
  ];
  const { backend, context, emitter } = Harness({
    resolveSfxProgram: () => play(0),
    prepareSfxProgram: () => ({
      program: play(1, true),
      commit()
      {
        commits++;
      },
      rollback()
      {
        rollbacks++;
      },
    }),
    loadBuffer: async (_eventID, _eventName, _controls, program) => ({
      voices: program.flatMap(operation =>
        operation.selections.map(selection => ({
          buffer: { duration: 4 },
          programSlotId: selection.programSlotId,
          programBatchId: selection.programBatchId,
        }))),
    }),
  });
  const playingID = backend.PostEvent(
    7,
    1,
    0,
    emitter,
    "crossfade",
  );

  await tick();
  await tick();
  await tick();

  const boundary = context.sources[1].startedAt;

  context.currentTime = boundary + 0.25;
  backend.ExecuteActionOnPlayingID("stop", playingID, 500);

  assert.equal(commits, 1);
  assert.equal(rollbacks, 0);
  assert.ok(
    Math.abs(context.gains[7].gain.sets.at(-1)[0] - 0.25) < 1e-6,
    "the incoming transition is frozen before the public Stop fade",
  );
});

test("public Stop rolls back an unheard Crossfade successor after a stalled callback", async () =>
{
  const token = {};
  let commits = 0;
  let rollbacks = 0;
  const play = (batch, doneAfterBatch = false) => [
    {
      kind: "play",
      actionIndex: 0,
      selections: [
        {
          actionIndex: 0,
          leafIndex: 0,
          programSlotId: "0:c0",
          programBatchId: `0:c0:b${batch}`,
          matchIds: [ "10", String(batch) ],
        },
      ],
      continuations: [
        {
          programSlotId: "0:c0",
          token,
          containerId: "10",
          advance: "crossfade",
          crossfadeMode: "crossfade-amplitude",
          delayMs: 1000,
          doneAfterBatch,
        },
      ],
    },
  ];
  const { backend, context, emitter } = Harness({
    resolveSfxProgram: () => play(0),
    prepareSfxProgram: () => ({
      program: play(1, true),
      commit()
      {
        commits++;
      },
      rollback()
      {
        rollbacks++;
      },
    }),
    loadBuffer: async (_eventID, _eventName, _controls, program) => ({
      voices: program.flatMap(operation =>
        operation.selections.map(selection => ({
          buffer: { duration: 4 },
          programSlotId: selection.programSlotId,
          programBatchId: selection.programBatchId,
        }))),
    }),
  });
  const playingID = backend.PostEvent(
    7,
    1,
    0,
    emitter,
    "crossfade",
  );

  await tick();
  await tick();
  await tick();

  const successor = context.sources[1];
  const boundary = successor.startedAt;

  context.currentTime = boundary - 0.25;
  backend.ExecuteActionOnPlayingID("stop", playingID, 0);

  assert.equal(successor.stoppedAt, context.currentTime);
  assert.equal(commits, 0);
  assert.equal(rollbacks, 0);

  context.currentTime = boundary + 0.25;
  context.sources[0].onended();
  successor.onended();

  assert.equal(
    commits,
    0,
    "crossing the scheduled start cannot make a cancelled source audible",
  );
  assert.equal(rollbacks, 1);
});

test("a stalled frame still advances a finished Crossfade successor to its next child", async () =>
{
  const token = {};
  const slot = "0:c0";
  let advances = 0;
  const play = (batch, doneAfterBatch = false) => [
    {
      kind: "play",
      actionIndex: 0,
      selections: [
        {
          actionIndex: 0,
          leafIndex: 0,
          programSlotId: slot,
          programBatchId: `${slot}:b${batch}`,
          matchIds: [ "10", String(batch) ],
        },
      ],
      continuations: [
        {
          programSlotId: slot,
          token,
          containerId: "10",
          advance: "crossfade",
          crossfadeMode: "crossfade-amplitude",
          delayMs: 40,
          doneAfterBatch,
        },
      ],
    },
  ];
  const { backend, context, emitter } = Harness({
    resolveSfxProgram: () => play(0),
    continueSfxProgram: () =>
    {
      advances++;
      return play(advances, advances === 2);
    },
    loadBuffer: async (_eventID, _eventName, _controls, program) => ({
      voices: program.flatMap(operation =>
        operation.selections.map(selection => ({
          buffer: { duration: 0.1 },
          programSlotId: selection.programSlotId,
          programBatchId: selection.programBatchId,
        }))),
    }),
  });

  backend.PostEvent(7, 1, 0, emitter, "crossfade_stall");
  await tick();
  await tick();
  await tick();
  assert.equal(context.sources.length, 2);

  context.currentTime = 0.3;
  context.sources[0].onended();
  context.sources[1].onended();
  backend.RenderAudio();
  await tick();
  await tick();
  await tick();

  assert.equal(advances, 2);
  assert.equal(context.sources.length, 3);
  assert.ok(
    Math.abs(
      context.sources[2].startedAt
        - (context.currentTime + START_QUANTUM),
    ) < 1e-9,
  );
});

for (const [ mode, expected ] of [
  [ "crossfade-amplitude", 0.5 ],
  [ "crossfade-power", Math.SQRT1_2 ],
])
{
  test(`Stop freezes an active ${mode} envelope before fading out`, async () =>
  {
    const token = {};
    const slot = "0:c0";
    const play = (batch, doneAfterBatch = false) => [
      {
        kind: "play",
        actionIndex: 0,
        selections: [
          {
            actionIndex: 0,
            leafIndex: 0,
            programSlotId: slot,
            programBatchId: `${slot}:b${batch}`,
            matchIds: [ "10", String(batch) ],
          },
        ],
        continuations: [
          {
            programSlotId: slot,
            token,
            containerId: "10",
            advance: "crossfade",
            crossfadeMode: mode,
            delayMs: 1000,
            doneAfterBatch,
          },
        ],
      },
    ];
    const stop = [
      {
        kind: "stop",
        actionIndex: 0,
        targetId: "10",
        targetFlags: 0,
        scope: "game-object",
        mode: "element",
        delayMs: 0,
        transitionMs: 500,
        curve: 4,
        exceptions: [],
      },
    ];
    const { backend, context, emitter } = Harness({
      resolveSfxProgram: (_eventID, eventName) =>
        eventName === "stop_crossfade" ? stop : play(0),
      continueSfxProgram: () => play(1, true),
      loadBuffer: async (_eventID, eventName, _controls, program) =>
        eventName === "stop_crossfade"
          ? { voices: [] }
          : {
              voices: program.flatMap(operation =>
                operation.selections.map(selection => ({
                  buffer: { duration: 4 },
                  programSlotId: selection.programSlotId,
                  programBatchId: selection.programBatchId,
                }))),
            },
    });

    backend.PostEvent(7, 1, 0, emitter, "crossfade");
    await tick();
    await tick();
    await tick();

    const boundary = START_QUANTUM + 3;

    context.currentTime = boundary;
    backend.RenderAudio();
    context.currentTime = boundary + 0.5;
    backend.PostEvent(8, 1, 0, emitter, "stop_crossfade");
    await tick();

    const held = context.gains[4].gain.sets.at(-1);

    assert.ok(Math.abs(held[0] - expected) < 1e-6);
    assert.equal(held[1], context.currentTime);
    assert.equal(
      context.gains[4].gain.cancellations.at(-1),
      context.currentTime,
    );
  });
}

test("finite Trigger Rate finishes with its final tail, not another interval", async () =>
{
  const token = {};
  const program = [
    {
      kind: "play",
      actionIndex: 0,
      selections: [
        {
          actionIndex: 0,
          leafIndex: 0,
          programSlotId: "0:c0",
          programBatchId: "0:c0:b0",
          matchIds: [ "10", "100" ],
        },
      ],
      continuations: [
        {
          programSlotId: "0:c0",
          token,
          containerId: "10",
          advance: "trigger-rate",
          delayMs: 500,
          doneAfterBatch: true,
        },
      ],
    },
  ];
  const { backend, context, emitter, finished } = Harness({
    resolveSfxProgram: () => program,
    continueSfxProgram: () => [],
    loadBuffer: async () => ({
      voices: [
        {
          buffer: { duration: 0.1 },
          programSlotId: "0:c0",
          programBatchId: "0:c0:b0",
        },
      ],
    }),
  });
  const playingID = backend.PostEvent(
    7,
    1,
    0,
    emitter,
    "trigger_rate",
  );

  await tick();
  context.currentTime = 0.1;
  context.sources[0].onended();
  assert.deepEqual(finished, [ playingID ]);
  assert.equal(backend.GetPlayingCount(), 0);
});

test("Trigger Rate cadence continues while earlier media is still loading", async () =>
{
  const token = {};
  const pending = [ Deferred(), Deferred() ];
  let advances = 0;
  let loads = 0;
  const play = (batch, doneAfterBatch = false) => [
    {
      kind: "play",
      actionIndex: 0,
      selections: [
        {
          actionIndex: 0,
          leafIndex: 0,
          programSlotId: "0:c0",
          programBatchId: `0:c0:b${batch}`,
          matchIds: [ "10", String(100 + batch) ],
        },
      ],
      continuations: [
        {
          programSlotId: "0:c0",
          token,
          containerId: "10",
          advance: "trigger-rate",
          delayMs: 500,
          doneAfterBatch,
        },
      ],
    },
  ];
  const { backend, context, emitter } = Harness({
    resolveSfxProgram: () => play(0),
    continueSfxProgram: () =>
    {
      advances++;
      return play(advances, advances === 2);
    },
    loadBuffer: (_eventID, _eventName, _controls, program) =>
    {
      const batch = program[0].selections[0].programBatchId;

      if (loads++ === 0)
      {
        return Promise.resolve({
          voices: [
            {
              buffer: { duration: 2 },
              programSlotId: "0:c0",
              programBatchId: batch,
            },
          ],
        });
      }
      return pending[loads - 2].promise;
    },
  });

  backend.PostEvent(7, 1, 0, emitter, "trigger_rate");
  await tick();

  context.currentTime = 0.5;
  backend.RenderAudio();
  await tick();
  assert.equal(advances, 1);

  context.currentTime = 1;
  backend.RenderAudio();
  await tick();
  assert.equal(
    advances,
    2,
    "the second boundary is not serialized behind the first cold load",
  );

  for (let index = 0; index < pending.length; index++)
  {
    pending[index].resolve({
      voices: [
        {
          buffer: { duration: 1 },
          programSlotId: "0:c0",
          programBatchId: `0:c0:b${index + 1}`,
        },
      ],
    });
  }
  await tick();
  await tick();
  assert.equal(context.sources.length, 3);
});

test("a Trigger Rate source-start failure cleans its batch and settles", async () =>
{
  const token = {};
  const initial = [
    {
      kind: "play",
      actionIndex: 0,
      selections: [
        {
          actionIndex: 0,
          leafIndex: 0,
          programSlotId: "0:c0",
          programBatchId: "0:c0:b0",
          matchIds: [ "10", "100" ],
        },
      ],
      continuations: [
        {
          programSlotId: "0:c0",
          programBatchId: "0:c0:b0",
          token,
          containerId: "10",
          advance: "trigger-rate",
          delayMs: 500,
          doneAfterBatch: false,
        },
      ],
    },
  ];
  const next = [
    {
      kind: "play",
      actionIndex: 0,
      selections: [ 0, 1 ].map(leafIndex => ({
        actionIndex: 0,
        leafIndex,
        programSlotId: "0:c0",
        programBatchId: "0:c0:b1",
        matchIds: [ "10", String(200 + leafIndex) ],
      })),
      continuations: [
        {
          programSlotId: "0:c0",
          programBatchId: "0:c0:b1",
          token,
          containerId: "10",
          advance: "trigger-rate",
          delayMs: 0,
          doneAfterBatch: true,
        },
      ],
    },
  ];
  const { backend, context, emitter, finished } = Harness({
    resolveSfxProgram: () => initial,
    continueSfxProgram: () => next,
    loadBuffer: async (_eventID, _eventName, _controls, program) => ({
      voices: program[0].selections.map(selection => ({
        buffer: { duration: 2 },
        programSlotId: selection.programSlotId,
        programBatchId: selection.programBatchId,
      })),
    }),
  });
  const playingID = backend.PostEvent(
    7,
    1,
    0,
    emitter,
    "trigger_rate",
  );

  await tick();
  const createSource = context.createBufferSource;
  let continuationCreates = 0;

  context.createBufferSource = () =>
  {
    continuationCreates++;
    if (continuationCreates === 2)
    {
      throw new Error("source start failed");
    }
    return createSource();
  };

  context.currentTime = 0.5;
  backend.RenderAudio();
  await tick();
  await tick();

  assert.equal(context.sources.length, 2);
  assert.equal(context.sources[1].stoppedAt, 0.5);
  assert.deepEqual(finished, []);

  context.sources[0].onended();
  assert.deepEqual(finished, [ playingID ]);
});

test("an overdue Trigger Rate boundary rebases instead of replaying backlog", async () =>
{
  const token = {};
  let advances = 0;
  const play = batch => [
    {
      kind: "play",
      actionIndex: 0,
      selections: [],
      continuations: [
        {
          programSlotId: "0:c0",
          token,
          containerId: "10",
          advance: "trigger-rate",
          delayMs: 500,
          doneAfterBatch: batch === 2,
        },
      ],
    },
  ];
  const { backend, context, emitter } = Harness({
    resolveSfxProgram: () => play(0),
    continueSfxProgram: () => play(++advances),
    loadBuffer: async () => ({ voices: [] }),
  });

  backend.PostEvent(7, 1, 0, emitter, "trigger_rate");
  await tick();

  context.currentTime = 5;
  backend.RenderAudio();
  backend.RenderAudio();
  assert.equal(advances, 1);

  context.currentTime = 5.499;
  backend.RenderAudio();
  assert.equal(advances, 1);

  context.currentTime = 5.5;
  backend.RenderAudio();
  assert.equal(advances, 2);
});

test("silent Trigger Rate choices consume their authored cadence", async () =>
{
  const token = {};
  let advances = 0;
  const play = (batch, selections, doneAfterBatch) => [
    {
      kind: "play",
      actionIndex: 0,
      selections,
      continuations: [
        {
          programSlotId: "0:c0",
          token,
          containerId: "10",
          advance: "trigger-rate",
          delayMs: 500,
          doneAfterBatch,
        },
      ],
    },
  ];
  const { backend, context, emitter } = Harness({
    resolveSfxProgram: () => play(0, [], false),
    continueSfxProgram: () =>
    {
      advances++;
      return advances < 3
        ? play(advances, [], false)
        : play(3, [
            {
              actionIndex: 0,
              leafIndex: 0,
              programSlotId: "0:c0",
              programBatchId: "0:c0:b3",
              matchIds: [ "10", "100" ],
            },
          ], true);
    },
    loadBuffer: async (_eventID, _eventName, _controls, program) => ({
      voices: program[0].selections.map(selection => ({
        buffer: { duration: 1 },
        programSlotId: selection.programSlotId,
        programBatchId: selection.programBatchId,
      })),
    }),
  });

  backend.PostEvent(7, 1, 0, emitter, "trigger_rate");
  await tick();

  context.currentTime = 0.499;
  backend.RenderAudio();
  assert.equal(advances, 0);

  context.currentTime = 0.5;
  backend.RenderAudio();
  assert.equal(advances, 1);
  assert.equal(context.sources.length, 0);

  context.currentTime = 1;
  backend.RenderAudio();
  assert.equal(advances, 2);
  assert.equal(context.sources.length, 0);

  context.currentTime = 1.5;
  backend.RenderAudio();
  await tick();
  await tick();
  assert.equal(advances, 3);
  assert.equal(context.sources.length, 1);
});

test("missing initial Trigger Rate media fails the traversal closed", async () =>
{
  const token = {};
  let advances = 0;
  const program = [
    {
      kind: "play",
      actionIndex: 0,
      selections: [
        {
          actionIndex: 0,
          leafIndex: 0,
          programSlotId: "0:c0",
          programBatchId: "0:c0:b0",
          matchIds: [ "10", "100" ],
        },
      ],
      continuations: [
        {
          programSlotId: "0:c0",
          programBatchId: "0:c0:b0",
          token,
          containerId: "10",
          advance: "trigger-rate",
          delayMs: 500,
          doneAfterBatch: false,
        },
      ],
    },
  ];
  const { backend, context, emitter, finished } = Harness({
    resolveSfxProgram: () => program,
    continueSfxProgram: () =>
    {
      advances++;
      return program;
    },
    loadBuffer: async () => ({ voices: [] }),
  });
  const playingID = backend.PostEvent(
    7,
    1,
    0,
    emitter,
    "trigger_rate",
  );

  await tick();
  assert.deepEqual(finished, [ playingID ]);

  context.currentTime = 0.5;
  backend.RenderAudio();
  assert.equal(advances, 0);
});

test("Stop-All ends an all-silent Trigger Rate traversal", async () =>
{
  const token = {};
  const silent = [
    {
      kind: "play",
      actionIndex: 0,
      selections: [],
      continuations: [
        {
          programSlotId: "0:c0",
          token,
          containerId: "10",
          advance: "trigger-rate",
          delayMs: 500,
          doneAfterBatch: false,
        },
      ],
    },
  ];
  const stopAll = [
    {
      kind: "stop",
      actionIndex: 0,
      targetId: null,
      scope: "game-object",
      mode: "all",
      delayMs: 0,
      transitionMs: 0,
      curve: 4,
      exceptions: [],
    },
  ];
  const { backend, context, emitter, finished } = Harness({
    resolveSfxProgram: (_eventID, eventName) =>
      eventName === "stop_all" ? stopAll : silent,
    continueSfxProgram: () => silent,
    loadBuffer: async () => ({ voices: [] }),
  });
  const playingID = backend.PostEvent(
    7,
    1,
    0,
    emitter,
    "trigger_rate",
  );

  await tick();
  context.currentTime = 0.25;
  backend.PostEvent(8, 1, 0, emitter, "stop_all");
  await tick();

  assert.ok(finished.includes(playingID));
  context.currentTime = 0.5;
  backend.RenderAudio();
  assert.equal(backend.GetPlayingCount(), 0);
});

test("Break preserves active Trigger Rate overlap and cancels its cadence", async () =>
{
  const token = {};
  let advances = 0;
  const play = batch => [
    {
      kind: "play",
      actionIndex: 0,
      selections: [
        {
          actionIndex: 0,
          leafIndex: 0,
          programSlotId: "0:c0",
          programBatchId: `0:c0:b${batch}`,
          matchIds: [ "10", String(100 + batch) ],
        },
      ],
      continuations: [
        {
          programSlotId: "0:c0",
          token,
          containerId: "10",
          advance: "trigger-rate",
          delayMs: 500,
        },
      ],
    },
  ];
  const { backend, context, emitter, finished } = Harness({
    resolveSfxProgram: () => play(0),
    continueSfxProgram: () => play(++advances),
    loadBuffer: async (_eventID, _eventName, _controls, program) => ({
      voices: program[0].selections.map(selection => ({
        buffer: { duration: 2 },
        programSlotId: selection.programSlotId,
        programBatchId: selection.programBatchId,
      })),
    }),
  });
  const playingID = backend.PostEvent(
    7,
    1,
    0,
    emitter,
    "trigger_rate",
  );

  await tick();
  context.currentTime = 0.5;
  backend.RenderAudio();
  await tick();
  await tick();
  assert.equal(context.sources.length, 2);

  context.currentTime = 0.7;
  backend.ExecuteActionOnPlayingID("break", playingID, 0);

  assert.equal(context.sources[0].stoppedAt, null);
  assert.equal(context.sources[1].stoppedAt, null);

  context.currentTime = 2;
  backend.RenderAudio();
  assert.equal(advances, 1);

  context.sources[0].onended();
  assert.deepEqual(finished, []);
  context.sources[1].onended();
  assert.deepEqual(finished, [ playingID ]);
});

test("Seek skips Trigger Rate descendants but restarts an ordinary sibling", async () =>
{
  const token = {};
  const program = [
    {
      kind: "play",
      actionIndex: 0,
      selections: [
        {
          actionIndex: 0,
          leafIndex: 0,
          programSlotId: "0:c0",
          programBatchId: "0:c0:b0",
          matchIds: [ "10", "100" ],
        },
        {
          actionIndex: 0,
          leafIndex: 1,
          programSlotId: "0:1",
          matchIds: [ "200" ],
        },
      ],
      continuations: [
        {
          programSlotId: "0:c0",
          token,
          containerId: "10",
          advance: "trigger-rate",
          delayMs: 0,
          doneAfterBatch: true,
        },
      ],
    },
  ];
  const { backend, context, emitter } = Harness({
    resolveSfxProgram: () => program,
    continueSfxProgram: () => [],
    loadBuffer: async () => ({
      voices: [
        {
          buffer: { duration: 2 },
          programSlotId: "0:c0",
          programBatchId: "0:c0:b0",
        },
        {
          buffer: { duration: 2 },
          programSlotId: "0:1",
        },
      ],
    }),
  });
  const playingID = backend.PostEvent(
    7,
    1,
    0,
    emitter,
    "mixed_seek",
  );

  await tick();
  assert.equal(context.sources.length, 2);
  assert.equal(backend.SeekOnEventMs(playingID, 500), true);
  assert.equal(context.sources.length, 3);
  assert.equal(
    context.sources[0].stoppedAt,
    null,
    "the Trigger Rate child is not restarted",
  );
  assert.equal(context.sources[2].offset, 0.5);
});

test("a fast Trigger Rate continuation cannot consume a pending mixed seek", async () =>
{
  const token = {};
  const initial = Deferred();
  const program = [
    {
      kind: "play",
      actionIndex: 0,
      selections: [
        {
          actionIndex: 0,
          leafIndex: 0,
          programSlotId: "0:c0",
          programBatchId: "0:c0:b0",
          matchIds: [ "10", "100" ],
        },
        {
          actionIndex: 0,
          leafIndex: 1,
          programSlotId: "0:1",
          matchIds: [ "200" ],
        },
      ],
      continuations: [
        {
          programSlotId: "0:c0",
          programBatchId: "0:c0:b0",
          token,
          containerId: "10",
          advance: "trigger-rate",
          delayMs: 500,
          doneAfterBatch: false,
        },
      ],
    },
  ];
  const continuation = [
    {
      kind: "play",
      actionIndex: 0,
      selections: [
        {
          actionIndex: 0,
          leafIndex: 0,
          programSlotId: "0:c0",
          programBatchId: "0:c0:b1",
          matchIds: [ "10", "101" ],
        },
      ],
      continuations: [
        {
          programSlotId: "0:c0",
          programBatchId: "0:c0:b1",
          token,
          containerId: "10",
          advance: "trigger-rate",
          delayMs: 0,
          doneAfterBatch: true,
        },
      ],
    },
  ];
  let loads = 0;
  const { backend, context, emitter } = Harness({
    resolveSfxProgram: () => program,
    continueSfxProgram: () => continuation,
    loadBuffer: async (_eventID, _eventName, _controls, value) =>
    {
      if (loads++ === 0)
      {
        return initial.promise;
      }
      const selection = value[0].selections[0];

      return {
        voices: [
          {
            buffer: { duration: 2 },
            programSlotId: selection.programSlotId,
            programBatchId: selection.programBatchId,
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
    "mixed_seek",
  );

  assert.equal(backend.SeekOnEventMs(playingID, 500), true);
  context.currentTime = 0.5;
  backend.RenderAudio();
  await tick();
  await tick();
  assert.equal(context.sources.length, 1);
  assert.equal(context.sources[0].offset, 0);

  initial.resolve({
    voices: [
      {
        buffer: { duration: 2 },
        programSlotId: "0:c0",
        programBatchId: "0:c0:b0",
      },
      {
        buffer: { duration: 2 },
        programSlotId: "0:1",
      },
    ],
  });
  await tick();
  await tick();

  assert.equal(context.sources.length, 3);
  assert.equal(
    context.sources[2].offset,
    0.5,
    "the ordinary sibling consumes the queued seek",
  );
});

test("Stop aborts a loading Trigger Rate batch without reviving it", async () =>
{
  const pending = Deferred();
  const token = {};
  let loads = 0;
  let continuationSignal = null;
  const play = batch => [
    {
      kind: "play",
      actionIndex: 0,
      selections: [
        {
          actionIndex: 0,
          leafIndex: 0,
          programSlotId: "0:c0",
          programBatchId: `0:c0:b${batch}`,
          matchIds: [ "10", String(100 + batch) ],
        },
      ],
      continuations: [
        {
          programSlotId: "0:c0",
          token,
          containerId: "10",
          advance: "trigger-rate",
          delayMs: 500,
        },
      ],
    },
  ];
  const { backend, context, emitter, finished } = Harness({
    resolveSfxProgram: () => play(0),
    continueSfxProgram: () => play(1),
    loadBuffer: (_eventID, _eventName, controls, program) =>
    {
      loads++;
      if (loads === 1)
      {
        return Promise.resolve({
          voices: [
            {
              buffer: { duration: 2 },
              programSlotId: "0:c0",
              programBatchId: "0:c0:b0",
            },
          ],
        });
      }
      continuationSignal = controls.getSfxProgramSignal(
        "0:c0",
        0,
        0,
        program[0].selections[0].programBatchId,
      );
      return pending.promise;
    },
  });
  const playingID = backend.PostEvent(
    7,
    1,
    0,
    emitter,
    "trigger_rate",
  );

  await tick();
  context.currentTime = 0.5;
  backend.RenderAudio();
  await tick();
  assert.equal(loads, 2);
  assert.equal(continuationSignal.aborted, false);

  backend.ExecuteActionOnPlayingID("stop", playingID, 0);

  assert.equal(continuationSignal.aborted, true);
  pending.resolve({
    voices: [
      {
        buffer: { duration: 2 },
        programSlotId: "0:c0",
        programBatchId: "0:c0:b1",
      },
    ],
  });
  await tick();
  await tick();

  assert.equal(context.sources.length, 1);
  context.sources[0].onended();
  assert.deepEqual(finished, [ playingID ]);
});

test("targeted Stop cancels one loading Trigger Rate child, not its cadence", async () =>
{
  const token = {};
  const pending = Deferred();
  let advances = 0;
  let cancelledSignal = null;
  const play = (batch, mediaID, doneAfterBatch = false) => [
    {
      kind: "play",
      actionIndex: 0,
      selections: [
        {
          actionIndex: 0,
          leafIndex: 0,
          programSlotId: "0:c0",
          programBatchId: `0:c0:b${batch}`,
          matchIds: [ "10", String(mediaID) ],
        },
      ],
      continuations: [
        {
          programSlotId: "0:c0",
          token,
          containerId: "10",
          advance: "trigger-rate",
          delayMs: 500,
          doneAfterBatch,
        },
      ],
    },
  ];
  const stop = [
    {
      kind: "stop",
      actionIndex: 0,
      targetId: "200",
      scope: "game-object",
      mode: "element",
      delayMs: 0,
      transitionMs: 0,
      curve: 4,
      exceptions: [],
    },
  ];
  const { backend, context, emitter } = Harness({
    resolveSfxProgram: (_eventID, eventName) =>
      eventName === "stop_child"
        ? stop
        : play(0, 100),
    continueSfxProgram: () =>
    {
      advances++;
      return advances === 1
        ? play(1, 200)
        : play(2, 300, true);
    },
    loadBuffer: (_eventID, eventName, controls, program) =>
    {
      if (eventName === "stop_child")
      {
        return Promise.resolve({ voices: [] });
      }
      const selection = program[0].selections[0];

      if (selection.programBatchId === "0:c0:b1")
      {
        cancelledSignal = controls.getSfxProgramSignal(
          "0:c0",
          0,
          0,
          selection.programBatchId,
        );
        return pending.promise;
      }
      return Promise.resolve({
        voices: [
          {
            buffer: { duration: 2 },
            programSlotId: selection.programSlotId,
            programBatchId: selection.programBatchId,
          },
        ],
      });
    },
  });

  backend.PostEvent(7, 1, 0, emitter, "trigger_rate");
  await tick();

  context.currentTime = 0.5;
  backend.RenderAudio();
  await tick();
  assert.equal(cancelledSignal.aborted, false);

  context.currentTime = 0.75;
  backend.PostEvent(8, 1, 0, emitter, "stop_child");
  await tick();
  assert.equal(cancelledSignal.aborted, true);

  context.currentTime = 1;
  backend.RenderAudio();
  await tick();
  await tick();
  assert.equal(advances, 2);
  assert.equal(
    context.sources.length,
    2,
    "the initial and later child play; the cancelled child does not",
  );

  pending.resolve({
    voices: [
      {
        buffer: { duration: 1 },
        programSlotId: "0:c0",
        programBatchId: "0:c0:b1",
      },
    ],
  });
  await tick();
  assert.equal(context.sources.length, 2);
});

test("Break lets the active Continuous object loop out without advancing", async () =>
{
  const token = {};
  let advances = 0;
  const program = [
    {
      kind: "play",
      actionIndex: 0,
      selections: [
        {
          actionIndex: 0,
          leafIndex: 0,
          programSlotId: "0:c0",
          matchIds: [ "10", "100" ],
        },
      ],
      continuations: [
        {
          programSlotId: "0:c0",
          token,
          delayMs: 0,
        },
      ],
    },
  ];
  const { backend, context, emitter, finished } = Harness({
    resolveSfxProgram: () => program,
    continueSfxProgram: () =>
    {
      advances++;
      return program;
    },
    loadBuffer: async () => ({
      voices: [
        {
          buffer: { duration: 1 },
          loop: true,
          programSlotId: "0:c0",
        },
      ],
    }),
  });
  const playingID = backend.PostEvent(
    7,
    1,
    0,
    emitter,
    "continuous_loop",
  );

  await tick();
  assert.equal(context.sources[0].loop, true);

  backend.ExecuteActionOnPlayingID("break", playingID, 0);

  assert.equal(context.sources[0].loop, false);
  context.sources[0].onended();
  await tick();

  assert.equal(advances, 0);
  assert.deepEqual(finished, [ playingID ]);
});

test("Break ends a Continuous finite-repeat child at its current boundary", async () =>
{
  const token = {};
  const program = [
    {
      kind: "play",
      actionIndex: 0,
      selections: [
        {
          actionIndex: 0,
          leafIndex: 0,
          programSlotId: "0:c0",
          matchIds: [ "10", "100" ],
        },
      ],
      continuations: [
        {
          programSlotId: "0:c0",
          token,
          delayMs: 0,
          doneAfterBatch: true,
        },
      ],
    },
  ];
  const { backend, context, emitter, finished } = Harness({
    resolveSfxProgram: () => program,
    continueSfxProgram: () => [],
    loadBuffer: async () => ({
      voices: [
        {
          buffer: { duration: 1 },
          playCount: 3,
          programSlotId: "0:c0",
        },
      ],
    }),
  });
  const playingID = backend.PostEvent(
    7,
    1,
    0,
    emitter,
    "continuous_repeat",
  );

  await tick();
  context.currentTime = 0.4;
  backend.ExecuteActionOnPlayingID("break", playingID, 0);

  assert.ok(
    Math.abs(
      context.sources[0].stoppedAt
        - (START_QUANTUM + 1),
    ) < 1e-9,
  );
  context.currentTime = START_QUANTUM + 1;
  context.sources[0].onended();
  assert.deepEqual(finished, [ playingID ]);
});

test("Stop cancels a pending Continuous batch and discards its late result", async () =>
{
  const pending = Deferred();
  const token = {};
  let loads = 0;
  let batchSignal = null;
  const play = [
    {
      kind: "play",
      actionIndex: 0,
      selections: [
        {
          actionIndex: 0,
          leafIndex: 0,
          programSlotId: "0:c0",
          matchIds: [ "10", "100" ],
        },
      ],
      continuations: [
        {
          programSlotId: "0:c0",
          token,
          delayMs: 0,
        },
      ],
    },
  ];
  const { backend, context, emitter, finished } = Harness({
    resolveSfxProgram: () => play,
    continueSfxProgram: () => play,
    loadBuffer: (_eventID, _eventName, controls) =>
    {
      loads++;
      if (loads === 1)
      {
        return Promise.resolve({
          voices: [
            {
              buffer: { duration: 1 },
              programSlotId: "0:c0",
            },
          ],
        });
      }
      batchSignal = controls.getSfxProgramSignal("0:c0");
      return pending.promise;
    },
  });
  const playingID = backend.PostEvent(
    7,
    1,
    0,
    emitter,
    "continuous",
  );

  await tick();
  context.sources[0].onended();
  await tick();

  assert.equal(loads, 2);
  assert.equal(batchSignal.aborted, false);

  backend.ExecuteActionOnPlayingID("stop", playingID, 0);

  assert.equal(batchSignal.aborted, true);
  assert.deepEqual(finished, [ playingID ]);

  pending.resolve({
    voices: [
      {
        buffer: { duration: 1 },
        programSlotId: "0:c0",
      },
    ],
  });
  await tick();
  await tick();

  assert.equal(context.sources.length, 1);
  assert.deepEqual(finished, [ playingID ]);
});

test("Break aborts a loading Continuous continuation without reviving it", async () =>
{
  const pending = Deferred();
  const token = {};
  let loads = 0;
  let batchSignal = null;
  const play = [
    {
      kind: "play",
      actionIndex: 0,
      selections: [
        {
          actionIndex: 0,
          leafIndex: 0,
          programSlotId: "0:c0",
          matchIds: [ "10", "100" ],
        },
      ],
      continuations: [
        {
          programSlotId: "0:c0",
          token,
          delayMs: 0,
        },
      ],
    },
  ];
  const { backend, context, emitter, finished } = Harness({
    resolveSfxProgram: () => play,
    continueSfxProgram: () => play,
    loadBuffer: (_eventID, _eventName, controls) =>
    {
      loads++;
      if (loads === 1)
      {
        return Promise.resolve({
          voices: [
            {
              buffer: { duration: 1 },
              programSlotId: "0:c0",
            },
          ],
        });
      }
      batchSignal = controls.getSfxProgramSignal("0:c0");
      return pending.promise;
    },
  });
  const playingID = backend.PostEvent(
    7,
    1,
    0,
    emitter,
    "continuous",
  );

  await tick();
  context.sources[0].onended();
  await tick();

  assert.equal(loads, 2);
  assert.equal(batchSignal.aborted, false);

  backend.ExecuteActionOnPlayingID("break", playingID, 0);

  assert.equal(batchSignal.aborted, true);
  assert.deepEqual(finished, [ playingID ]);

  pending.resolve({
    voices: [
      {
        buffer: { duration: 1 },
        programSlotId: "0:c0",
      },
    ],
  });
  await tick();
  await tick();

  assert.equal(context.sources.length, 1);
  assert.deepEqual(finished, [ playingID ]);
});

test("Break cancels a decoded Continuous batch before its delayed start", async () =>
{
  const token = {};
  let advances = 0;
  const play = delayMs => [
    {
      kind: "play",
      actionIndex: 0,
      selections: [
        {
          actionIndex: 0,
          leafIndex: 0,
          programSlotId: "0:c0",
          matchIds: [ "10", "100" ],
        },
      ],
      continuations: [
        {
          programSlotId: "0:c0",
          token,
          delayMs,
        },
      ],
    },
  ];
  const { backend, context, emitter, finished } = Harness({
    resolveSfxProgram: () => play(0),
    continueSfxProgram: () =>
    {
      advances++;
      return play(5000);
    },
    loadBuffer: async () => ({
      voices: [
        {
          buffer: { duration: 1 },
          programSlotId: "0:c0",
        },
      ],
    }),
  });
  const playingID = backend.PostEvent(
    7,
    1,
    0,
    emitter,
    "continuous",
  );

  await tick();
  context.currentTime = 1;
  context.sources[0].onended();
  await tick();
  await tick();

  assert.equal(advances, 1);
  assert.equal(context.sources.length, 2);
  assert.equal(context.sources[1].startedAt, 6);

  backend.ExecuteActionOnPlayingID("break", playingID, 0);

  assert.equal(context.sources[1].stoppedAt, 1);
  assert.deepEqual(finished, [ playingID ]);
  assert.equal(backend.GetPlayingCount(), 0);
});

test("authored Stops compare each Continuous leaf's own delayed action time", async () =>
{
  const token = {};
  const play = [
    {
      kind: "play",
      actionIndex: 0,
      selections: [
        {
          actionIndex: 0,
          leafIndex: 0,
          delayMs: 0,
          programSlotId: "0:c0",
          matchIds: [ "10", "100" ],
        },
        {
          actionIndex: 0,
          leafIndex: 1,
          delayMs: 1000,
          programSlotId: "0:c0",
          matchIds: [ "10", "200" ],
        },
      ],
      continuations: [
        {
          programSlotId: "0:c0",
          token,
          delayMs: 0,
        },
      ],
    },
  ];
  const stop = [
    {
      kind: "stop",
      actionIndex: 0,
      targetId: "10",
      scope: "game-object",
      mode: "element",
      delayMs: 0,
      transitionMs: 0,
      curve: 4,
      exceptions: [],
    },
  ];
  const { backend, context, emitter } = Harness({
    resolveSfxProgram: (_eventID, eventName) =>
      eventName === "stop_parent" ? stop : play,
    continueSfxProgram: () => [],
    loadBuffer: async (_eventID, _eventName, _controls, program) => ({
      voices: program.flatMap(operation =>
        (operation.selections ?? []).map(selection => ({
          buffer: { duration: 2 },
          delayMs: selection.delayMs,
          programSlotId: selection.programSlotId,
        }))),
    }),
  });

  backend.PostEvent(7, 1, 0, emitter, "continuous");
  await tick();

  context.currentTime = 0.5;
  backend.PostEvent(8, 1, 0, emitter, "stop_parent");
  await tick();

  assert.equal(context.sources[0].stoppedAt, 0.5);
  assert.equal(
    context.sources[1].stoppedAt,
    null,
    "the Stop predates the second leaf's authored action time",
  );
});

test("an empty Continuous continuation terminates instead of hot-looping", async () =>
{
  const token = {};
  let advances = 0;
  let loads = 0;
  const play = [
    {
      kind: "play",
      actionIndex: 0,
      selections: [
        {
          actionIndex: 0,
          leafIndex: 0,
          programSlotId: "0:c0",
          matchIds: [ "10", "100" ],
        },
      ],
      continuations: [
        {
          programSlotId: "0:c0",
          token,
          delayMs: 0,
        },
      ],
    },
  ];
  const { backend, context, emitter, finished } = Harness({
    resolveSfxProgram: () => play,
    continueSfxProgram: () =>
    {
      advances++;
      return play;
    },
    loadBuffer: () =>
    {
      loads++;
      return Promise.resolve(loads === 1
        ? {
            voices: [
              {
                buffer: { duration: 1 },
                programSlotId: "0:c0",
              },
            ],
          }
        : { voices: [] });
    },
  });
  const playingID = backend.PostEvent(
    7,
    1,
    0,
    emitter,
    "continuous",
  );

  await tick();
  context.sources[0].onended();
  await tick();
  await tick();

  assert.equal(advances, 1);
  assert.equal(loads, 2);
  assert.deepEqual(finished, [ playingID ]);
  assert.equal(backend.GetPlayingCount(), 0);
});

test("synchronous continuation-loader failures settle the playing record", async () =>
{
  const token = {};
  let loads = 0;
  const play = [
    {
      kind: "play",
      actionIndex: 0,
      selections: [
        {
          actionIndex: 0,
          leafIndex: 0,
          programSlotId: "0:c0",
          matchIds: [ "10", "100" ],
        },
      ],
      continuations: [
        {
          programSlotId: "0:c0",
          token,
          delayMs: 0,
        },
      ],
    },
  ];
  const { backend, context, emitter, finished } = Harness({
    resolveSfxProgram: () => play,
    continueSfxProgram: () => play,
    loadBuffer: () =>
    {
      loads++;
      if (loads === 1)
      {
        return Promise.resolve({
          voices: [
            {
              buffer: { duration: 1 },
              programSlotId: "0:c0",
            },
          ],
        });
      }
      throw new Error("sync continuation failure");
    },
  });
  const playingID = backend.PostEvent(
    7,
    1,
    0,
    emitter,
    "continuous",
  );

  await tick();
  context.sources[0].onended();
  await tick();
  await tick();

  assert.equal(loads, 2);
  assert.deepEqual(finished, [ playingID ]);
  assert.equal(backend.GetPlayingCount(), 0);
});

test("overdue authored Stops cancel a loading Continuous boundary", async () =>
{
  const pending = Deferred();
  const token = {};
  let loads = 0;
  let batchSignal = null;
  const play = {
    kind: "play",
    actionIndex: 0,
    selections: [
      {
        actionIndex: 0,
        leafIndex: 0,
        programSlotId: "0:c0",
        matchIds: [ "10", "100" ],
      },
    ],
    continuations: [
      {
        programSlotId: "0:c0",
        token,
        delayMs: 0,
      },
    ],
  };
  const program = [
    play,
    {
      kind: "stop",
      actionIndex: 1,
      targetId: "10",
      scope: "game-object",
      mode: "element",
      delayMs: 500,
      transitionMs: 0,
      curve: 4,
      exceptions: [],
    },
  ];
  const { backend, context, emitter, finished } = Harness({
    resolveSfxProgram: () => program,
    continueSfxProgram: () => [ play ],
    loadBuffer: (_eventID, _eventName, controls) =>
    {
      loads++;
      if (loads === 1)
      {
        return Promise.resolve({
          voices: [
            {
              buffer: { duration: 0.1 },
              programSlotId: "0:c0",
            },
          ],
        });
      }
      batchSignal = controls.getSfxProgramSignal("0:c0");
      return pending.promise;
    },
  });
  const playingID = backend.PostEvent(
    7,
    1,
    0,
    emitter,
    "continuous",
  );

  await tick();
  context.currentTime = 0.1;
  context.sources[0].onended();
  await tick();

  assert.equal(loads, 2);
  assert.equal(batchSignal.aborted, false);

  context.currentTime = 1;
  pending.resolve({
    voices: [
      {
        buffer: { duration: 1 },
        programSlotId: "0:c0",
      },
    ],
  });
  await tick();
  await tick();

  assert.equal(batchSignal.aborted, true);
  assert.equal(context.sources.length, 1);
  assert.deepEqual(finished, [ playingID ]);
});

test("selective Stops isolate leaves inside a Continuous parallel batch", async () =>
{
  const cases = [
    {
      name: "element",
      stop: {
        targetId: "100",
        mode: "element",
        exceptions: [],
      },
    },
    {
      name: "all-except",
      stop: {
        targetId: "0",
        mode: "all-except",
        exceptions: [ { targetId: "200", targetFlags: 0 } ],
      },
    },
  ];

  for (const { name, stop } of cases)
  {
    const token = {};
    let advances = 0;
    const batch = (ids) => [
      {
        kind: "play",
        actionIndex: 0,
        selections: ids.map((id, leafIndex) => ({
          actionIndex: 0,
          leafIndex,
          programSlotId: "0:c0",
          matchIds: [ "10", String(id) ],
        })),
        continuations: [
          {
            programSlotId: "0:c0",
            token,
            delayMs: 0,
          },
        ],
      },
    ];
    const stopProgram = [
      {
        kind: "stop",
        actionIndex: 0,
        scope: "game-object",
        delayMs: 0,
        transitionMs: 0,
        curve: 4,
        ...stop,
      },
    ];
    const { backend, context, emitter } = Harness({
      resolveSfxProgram: (_eventID, eventName) =>
        eventName === `stop_${name}`
          ? stopProgram
          : batch([ 100, 200 ]),
      continueSfxProgram: () =>
      {
        advances++;
        return advances === 1 ? batch([ 300 ]) : [];
      },
      loadBuffer: async (_eventID, _eventName, _controls, program) => ({
        voices: program.flatMap(operation =>
          (operation.selections ?? []).map(selection => ({
            buffer: { duration: 1 },
            programSlotId: selection.programSlotId,
          }))),
      }),
    });

    backend.PostEvent(7, 1, 0, emitter, "continuous");
    await tick();

    backend.PostEvent(8, 1, 0, emitter, `stop_${name}`);
    await tick();

    assert.equal(
      context.sources[0].stoppedAt,
      0,
      `${name} stops the unprotected leaf`,
    );
    assert.equal(
      context.sources[1].stoppedAt,
      null,
      `${name} leaves the sibling voice alone`,
    );

    context.sources[0].onended();
    context.sources[1].onended();
    await tick();
    await tick();

    assert.equal(
      advances,
      1,
      `${name} does not suppress the Continuous traversal`,
    );
    assert.equal(context.sources.length, 3);
  }
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
  const gainA = context.gains[3];
  const stopA = context.gains[4];
  const gainB = context.gains[5];
  const stopB = context.gains[6];
  const [sourceA, sourceB] = context.sources;
  assert.ok(sourceA.started && sourceB.started);
  assert.equal(gainA.connectedTo, stopA);
  assert.equal(
    stopA.connectedTo,
    context.gains[2],
    "the independent stop envelope chains into the emitter gain",
  );

  context.currentTime = START_QUANTUM;
  backend.ExecuteActionOnPlayingID("stop", idA, 500);

  assert.deepEqual(stopA.gain.ramps, [[0, START_QUANTUM + 0.5]], "stopped source fades on its own envelope");
  assert.deepEqual(stopA.gain.cancellations, [START_QUANTUM]);
  assert.deepEqual(stopA.gain.sets, [[1, START_QUANTUM]], "the fade is anchored at the current envelope");
  assert.equal(sourceA.stoppedAt, START_QUANTUM + 0.5);
  assert.equal(gainB.gain.value, 1, "sibling gain value untouched");
  assert.deepEqual(stopB.gain.ramps, [], "sibling gain has no scheduled fade");
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
  const stopFade = context.gains[5].gain;
  const held = actionFade.sets.at(-1);

  assert.deepEqual(actionFade.cancellations, [ context.currentTime ]);
  assert.equal(held[1], context.currentTime);
  assert.ok(held[0] > 0 && held[0] < 0.5);
  assert.deepEqual(liveGain.ramps, []);
  assert.deepEqual(stopFade.ramps, [ [ 0, context.currentTime + 0.5 ] ]);
  assert.equal(context.sources[0].stoppedAt, context.currentTime + 0.5);
});


test("replaying on an emitter does not disturb a sibling's in-progress fade", async () =>
{
  const { context, emitter, backend } = Harness();
  const idA = backend.PostEvent(7, 1, 0, emitter, "engine_loop");
  await tick();
  const gainA = context.gains[3];
  const stopA = context.gains[4];
  context.currentTime = START_QUANTUM;
  backend.ExecuteActionOnPlayingID("stop", idA, 1000);
  assert.deepEqual(stopA.gain.ramps, [[0, START_QUANTUM + 1]]);

  backend.PostEvent(7, 1, 0, emitter, "engine_loop");
  await tick();

  assert.equal(context.sources[1].started, true, "replay starts on its own fresh gain");
  assert.deepEqual(stopA.gain.ramps, [[0, START_QUANTUM + 1]], "the fading source keeps its ramp");
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
  assert.equal(context.gains[4].gain.value, 0, "zero fade silences at once");
  assert.deepEqual(context.gains[4].gain.ramps, [], "zero fade schedules no ramp");
  assert.equal(context.sources[0].stoppedAt, START_QUANTUM, "zero fade stops now, not after the default second");

  backend.ExecuteActionOnPlayingID("stop", idB);
  assert.deepEqual(context.gains[6].gain.ramps, [[0, START_QUANTUM + 1]], "missing duration falls back to the 1s default");
  assert.equal(context.sources[1].stoppedAt, START_QUANTUM + 1);

  backend.ExecuteActionOnPlayingID("stop", idC, 250);
  assert.deepEqual(context.gains[8].gain.ramps, [[0, START_QUANTUM + 0.25]], "explicit nonzero duration is honored");
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
  assert.deepEqual(context.gains[4].gain.ramps, [[0, START_QUANTUM + 0.25]]);
  assert.deepEqual(context.gains[6].gain.ramps, []);

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

test("explicit Stop fades cannot extend finite authored repeats", async () =>
{
  const { context, emitter, backend } = Harness({
    loadBuffer: async () => ({
      voices: [
        {
          buffer: { duration: 3 },
          playCount: 2,
        },
      ],
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
  const authoredEnd = 6 + START_QUANTUM;

  assert.equal(context.sources[0].stoppedAt, authoredEnd);
  context.currentTime = 1;
  backend.ExecuteActionOnPlayingID("stop", playingID, 10000);

  assert.deepEqual(context.gains[4].gain.ramps, [ [ 0, 11 ] ]);
  assert.equal(
    context.sources[0].stoppedAt,
    authoredEnd,
    "the physical source still ends after exactly two complete buffers",
  );
});

test("live playback-rate changes reschedule finite-repeat completion", async () =>
{
  let playbackRate = 1;
  const { context, emitter, backend } = Harness({
    loadBuffer: async () => ({
      voices: [
        {
          buffer: { duration: 4 },
          loop: false,
          playCount: 3,
          getPlaybackRate: () => playbackRate,
        },
      ],
    }),
  });

  backend.PostEvent(7, 1, 0, emitter, "stateful_repeated_shot");
  await tick();

  assert.equal(context.sources[0].stoppedAt, 12 + START_QUANTUM);

  context.currentTime = 2;
  playbackRate = 2;
  backend.SetGlobalState("combat", "danger");

  const acceleratedEnd = context.sources[0].stoppedAt;

  assert.ok(
    Math.abs(acceleratedEnd - (7 + START_QUANTUM / 2)) < 1e-12,
  );

  context.currentTime = 3;
  playbackRate = 0.5;
  backend.SetGlobalState("combat", "None");

  assert.ok(
    Math.abs(
      context.sources[0].stoppedAt
        - (19 + START_QUANTUM * 2),
    ) < 1e-12,
  );
  assert.ok(context.sources[0].stoppedAt > acceleratedEnd);
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


test("UnregisterGameObj retires its node generation while posted sounds finish", async () =>
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

  assert.equal(backend.GetPlayingCount(), 2);
  assert.deepEqual(finished, []);
  assert.equal(context.sources[0].stoppedAt, null, "the loaded source keeps playing");
  assert.equal(inflightSignal.aborted, false, "the in-flight load keeps its lease");
  assert.equal(context.panners[0].disconnected, false);

  backend.RegisterGameObj(1);
  assert.equal(context.panners.length, 2, "re-registration creates a fresh node generation");

  pending.resolve({ fake: "buffer" });
  await tick();
  assert.equal(context.sources.length, 2, "pending media realizes on the retired generation");

  context.sources[0].onended();
  assert.deepEqual(finished, [loaded]);
  assert.equal(context.panners[0].disconnected, false, "the shared old generation remains");

  context.sources[1].onended();
  assert.deepEqual(finished, [loaded, inflight]);
  assert.equal(context.panners[0].disconnected, true, "the old generation drains after its last sound");
  assert.equal(context.panners[1].disconnected, false, "the current generation remains live");
});

test("retired voices freeze object RTPCs while global RTPCs stay live", async () =>
{
  const pending = Deferred();
  const adapterValues = [];
  let controls = null;
  const { context, emitter, backend } = Harness({
    applyRTPC: ({ value }) => adapterValues.push(value),
    loadBuffer: (_eventID, _eventName, suppliedControls) =>
    {
      controls = suppliedControls;
      return pending.promise;
    }
  });

  backend.SetRTPCValue("intensity", 0.25, 1);
  backend.SetGlobalRTPCValue("global_mix", 0.2);
  backend.PostEvent(7, 1, 0, emitter, "pending_layer");
  await tick();

  backend.UnregisterGameObj(1);
  backend.RegisterGameObj(1);
  backend.SetRTPCValue("intensity", 0.75, 1);
  assert.equal(controls.getRTPC("intensity"), 0.25);
  assert.equal(controls.getGlobalRTPC("global_mix"), 0.2);
  pending.resolve({
    voices: [
      {
        buffer: { duration: 2 },
        spatial: false,
        getGain: () =>
          controls.getRTPC("intensity")
          * controls.getGlobalRTPC("global_mix")
      }
    ]
  });
  await tick();

  assert.equal(
    context.gains[4].gain.value,
    0.05,
    "pending voice realizes with the retired generation's object value"
  );
  assert.equal(
    adapterValues.at(-1),
    0.25,
    "the retired lazy 2D route replays its own object RTPC snapshot"
  );

  backend.SetRTPCValue("intensity", 1, 1);
  assert.equal(
    context.gains[4].gain.value,
    0.05,
    "new-generation object RTPC changes cannot reach the retired voice"
  );

  backend.SetGlobalRTPCValue("global_mix", 0.8);
  assert.equal(
    context.gains[4].gain.value,
    0.2,
    "global RTPC changes continue to reach already-posted retired voices"
  );
});

test("ReleaseGameObj halts loaded sources and cancels in-flight loads", async () =>
{
  const pending = Deferred();
  let calls = 0;
  let inflightSignal = null;
  const { context, finished, emitter, backend } = Harness({
    loadBuffer: (_eventID, _eventName, controls) =>
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

  backend.ReleaseGameObj(1);

  assert.equal(backend.GetPlayingCount(), 0);
  assert.deepEqual(finished.sort(), [ loaded, inflight ].sort());
  assert.equal(context.sources[0].stoppedAt, 0);
  assert.equal(inflightSignal.aborted, true);
  assert.equal(context.panners[0].disconnected, true);

  backend.ReleaseGameObj(1);
  pending.resolve({ fake: "buffer" });
  await tick();
  assert.equal(context.sources.length, 1);
  assert.deepEqual(finished.sort(), [ loaded, inflight ].sort());
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
  assert.equal(context.gains[5].gain.value, 0.5);

  backend.SetRTPCValue("intensity", 0.75, 1);
  assert.equal(
    context.gains[3].gain.value,
    0.75,
    "an active authored curve updates without restarting its voice"
  );
  assert.equal(context.gains[5].gain.value, 0.5);

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

test("authored per-voice LPF and HPF follow live RTPC controls", async () =>
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
            getLowPass: () => controls.getRTPC("low_pass") ?? 0,
            getHighPass: () => controls.getRTPC("high_pass") ?? 0,
          },
        ],
      };
    },
  });

  backend.SetRTPCValue("low_pass", 30, 1);
  backend.SetRTPCValue("high_pass", 70, 1);
  backend.PostEvent(7, 1, 0, emitter, "filtered_engine");
  await tick();

  const source = context.sources[0];
  const [ lowPass, highPass ] = context.filters;

  assert.equal(lowPass.type, "lowpass");
  assert.equal(highPass.type, "highpass");
  assert.equal(lowPass.frequency.value, 7000);
  assert.equal(highPass.frequency.value, 7000);
  assert.equal(lowPass.Q.value, Math.SQRT1_2);
  assert.equal(highPass.Q.value, Math.SQRT1_2);
  assert.equal(source.connectedTo, lowPass);
  assert.equal(lowPass.connectedTo, highPass);

  backend.SetRTPCValue("low_pass", 45, 1);
  backend.SetRTPCValue("high_pass", 45, 1);

  assert.equal(context.sources.length, 1);
  assert.equal(context.sources[0], source);
  assert.equal(lowPass.frequency.value, 1922);
  assert.equal(highPass.frequency.value, 812);
});

test("invalid authored filter controls begin at transparent cutoff values", async () =>
{
  const { context, emitter, backend } = Harness({
    loadBuffer: async () => ({
      voices: [
        {
          buffer: { duration: 2 },
          getLowPass: () => Number.NaN,
          getHighPass: () => Number.NaN,
        },
      ],
    }),
  });

  backend.PostEvent(7, 1, 0, emitter, "invalid_filtered_engine");
  await tick();

  const [ lowPass, highPass ] = context.filters;

  assert.equal(lowPass.frequency.value, 20000);
  assert.equal(highPass.frequency.value, 17);
});

test("global states update one active voice's gain and pitch in place", async () =>
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
            getGain: () =>
              controls.getState("combat") === "danger" ? 0.5 : 1,
            getPlaybackRate: () =>
              controls.getState("combat") === "danger" ? 2 : 1
          }
        ]
      };
    }
  });

  backend.PostEvent(7, 1, 0, emitter, "stateful_engine");
  await tick();

  const source = context.sources[0];

  assert.equal(context.gains[3].gain.value, 1);
  assert.equal(source.playbackRate.value, 1);

  backend.SetGlobalState("combat", "danger");

  assert.equal(context.sources.length, 1);
  assert.equal(context.sources[0], source);
  assert.equal(context.gains[3].gain.value, 0.5);
  assert.equal(source.playbackRate.value, 2);

  backend.SetGlobalState("combat", "None");

  assert.equal(context.sources.length, 1);
  assert.equal(context.sources[0], source);
  assert.equal(context.gains[3].gain.value, 1);
  assert.equal(source.playbackRate.value, 1);
});

test("global states remain live under an independent Stop fade", async () =>
{
  let controls;
  const { context, emitter, backend } = Harness({
    loadBuffer: async (_eventID, _eventName, suppliedControls) =>
    {
      controls = suppliedControls;
      return {
        voices: [
          {
            buffer: { duration: 4 },
            getGain: () =>
              controls.getState("combat") === "danger" ? 0.5 : 1,
            getPlaybackRate: () =>
              controls.getState("combat") === "danger" ? 2 : 1
          }
        ]
      };
    }
  });
  const playingID = backend.PostEvent(
    7,
    1,
    0,
    emitter,
    "stateful_fade",
  );

  await tick();
  context.currentTime = START_QUANTUM + 0.25;
  backend.ExecuteActionOnPlayingID("stop", playingID, 1000);

  const source = context.sources[0];
  const controlGain = context.gains[3].gain;
  const stopEnvelope = context.gains[4].gain;
  const stopRamps = structuredClone(stopEnvelope.ramps);

  context.currentTime += 0.25;
  backend.SetGlobalState("combat", "danger");

  assert.equal(controlGain.value, 0.5);
  assert.equal(source.playbackRate.value, 2);
  assert.deepEqual(stopEnvelope.ramps, stopRamps);
  assert.equal(
    source.stoppedAt,
    START_QUANTUM + 1.25,
    "the live control change does not replace the Stop schedule",
  );
});

test("object RTPC gain and pitch remain live under an independent Stop fade", async () =>
{
  let controls;
  const { context, emitter, backend } = Harness({
    loadBuffer: async (_eventID, _eventName, suppliedControls) =>
    {
      controls = suppliedControls;
      return {
        voices: [
          {
            buffer: { duration: 4 },
            getGain: () => controls.getRTPC("load") ?? 1,
            getPlaybackRate: () => controls.getRTPC("speed") ?? 1
          }
        ]
      };
    }
  });

  backend.SetRTPCValue("load", 1, 1);
  backend.SetRTPCValue("speed", 1, 1);
  const playingID = backend.PostEvent(
    7,
    1,
    0,
    emitter,
    "rtpc_fade",
  );

  await tick();
  context.currentTime = START_QUANTUM + 0.25;
  backend.ExecuteActionOnPlayingID("stop", playingID, 1000);

  const source = context.sources[0];
  const controlGain = context.gains[3].gain;
  const stopEnvelope = context.gains[4].gain;
  const stopRamps = structuredClone(stopEnvelope.ramps);

  context.currentTime += 0.25;
  backend.SetRTPCValue("load", 0.5, 1);
  backend.SetRTPCValue("speed", 2, 1);

  assert.equal(context.sources[0], source);
  assert.equal(controlGain.value, 0.5);
  assert.equal(source.playbackRate.value, 2);
  assert.deepEqual(stopEnvelope.ramps, stopRamps);
  assert.equal(source.stoppedAt, START_QUANTUM + 1.25);
});

test("a state changed during acquisition is applied before the source starts", async () =>
{
  const pending = Deferred();
  let controls;
  const { context, emitter, backend } = Harness({
    loadBuffer: (_eventID, _eventName, suppliedControls) =>
    {
      controls = suppliedControls;
      return pending.promise;
    }
  });

  backend.PostEvent(7, 1, 0, emitter, "pending_stateful_engine");
  await tick();

  backend.SetGlobalState("combat", "danger");
  pending.resolve({
    voices: [
      {
        buffer: { duration: 2 },
        getGain: () =>
          controls.getState("combat") === "danger" ? 0.5 : 1,
        getPlaybackRate: () =>
          controls.getState("combat") === "danger" ? 2 : 1
      }
    ]
  });
  await tick();

  assert.equal(context.sources.length, 1);
  assert.equal(context.gains[3].gain.value, 0.5);
  assert.equal(context.sources[0].playbackRate.value, 2);
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

test("Voice Volume persists across posts, isolates objects, and applies globally", async () =>
{
  const programs = {
    play: [
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
    ],
    set_local: [
      {
        kind: "set-voice-volume",
        actionIndex: 0,
        targetId: "700",
        targetFlags: 0,
        scope: "game-object",
        mode: "element",
        valueMode: "absolute",
        volumeDb: -6,
        delayMs: 0,
        transitionMs: 0,
        curve: 4,
      },
    ],
    set_global: [
      {
        kind: "set-voice-volume",
        actionIndex: 0,
        targetId: "700",
        targetFlags: 0,
        scope: "global",
        mode: "element",
        valueMode: "absolute",
        volumeDb: -12,
        delayMs: 0,
        transitionMs: 0,
        curve: 4,
      },
    ],
    relative_local: [
      {
        kind: "set-voice-volume",
        actionIndex: 0,
        targetId: "700",
        targetFlags: 0,
        scope: "game-object",
        mode: "element",
        valueMode: "relative",
        volumeDb: 3,
        delayMs: 0,
        transitionMs: 0,
        curve: 4,
      },
    ],
    reset_local: [
      {
        kind: "reset-voice-volume",
        actionIndex: 0,
        targetId: "700",
        targetFlags: 0,
        scope: "game-object",
        mode: "element",
        delayMs: 0,
        transitionMs: 0,
        curve: 4,
      },
    ],
  };
  const { backend, emitter, context } = Harness({
    resolveSfxProgram: (_eventID, eventName) => programs[eventName],
    loadBuffer: async (_eventID, _eventName, controls, program) => ({
      voices: program.flatMap(operation =>
        operation.kind === "play"
          ? operation.selections.map(selection => ({
              buffer: { duration: 2 },
              loop: true,
              programSlotId:
                `${selection.actionIndex}:${selection.leafIndex}`,
              actionIndex: selection.actionIndex,
              leafIndex: selection.leafIndex,
              matchIds: selection.matchIds,
              getGain: () => 10 ** (
                controls.getVoiceVolumeDb(selection.matchIds) / 20
              ),
              getGainAtVoiceVolumeDb: value => 10 ** (value / 20),
            }))
          : []),
    }),
  });
  backend.RegisterGameObj(2);

  backend.PostEvent(1, 1, 0, emitter, "play");
  backend.PostEvent(2, 2, 0, emitter, "play");
  await tick();

  const firstGain = context.sources[0].connectedTo.gain;
  const secondGain = context.sources[1].connectedTo.gain;

  backend.PostEvent(3, 1, 0, emitter, "set_local");
  assert.ok(Math.abs(firstGain.value - 10 ** (-6 / 20)) < 1e-12);
  assert.equal(secondGain.value, 1);

  backend.PostEvent(4, 1, 0, emitter, "relative_local");
  assert.ok(Math.abs(firstGain.value - 10 ** (-3 / 20)) < 1e-12);

  backend.PostEvent(5, 1, 0, emitter, "set_global");
  assert.ok(Math.abs(firstGain.value - 10 ** (-12 / 20)) < 1e-12);
  assert.ok(Math.abs(secondGain.value - 10 ** (-12 / 20)) < 1e-12);

  backend.PostEvent(6, 1, 0, emitter, "reset_local");
  assert.equal(firstGain.value, 1);
  assert.ok(Math.abs(secondGain.value - 10 ** (-12 / 20)) < 1e-12);
});

test("overdue Voice Volume actions intersect fades at authored action time", async () =>
{
  const programs = {
    play: [
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
    ],
    fade: [
      {
        kind: "set-voice-volume",
        actionIndex: 0,
        targetId: "700",
        targetFlags: 0,
        scope: "game-object",
        mode: "element",
        valueMode: "absolute",
        volumeDb: -20,
        delayMs: 1000,
        transitionMs: 4000,
        curve: 4,
      },
    ],
    relative: [
      {
        kind: "set-voice-volume",
        actionIndex: 0,
        targetId: "700",
        targetFlags: 0,
        scope: "game-object",
        mode: "element",
        valueMode: "relative",
        volumeDb: 10,
        delayMs: 2000,
        transitionMs: 0,
        curve: 4,
      },
    ],
  };
  const { backend, emitter, context, finished } = Harness({
    resolveSfxProgram: (_eventID, eventName) => programs[eventName],
    loadBuffer: async (_eventID, _eventName, controls, program) => ({
      voices: program.flatMap(operation =>
        operation.kind === "play"
          ? operation.selections.map(selection => ({
              buffer: { duration: 2 },
              loop: true,
              programSlotId: "0:0",
              matchIds: selection.matchIds,
              getGain: () => 10 ** (
                controls.getVoiceVolumeDb(selection.matchIds) / 20
              ),
              getGainAtVoiceVolumeDb: value => 10 ** (value / 20),
            }))
          : []),
    }),
  });

  backend.PostEvent(1, 1, 0, emitter, "play");
  const fadeID = backend.PostEvent(2, 1, 0, emitter, "fade");
  const relativeID = backend.PostEvent(3, 1, 0, emitter, "relative");
  await tick();

  context.currentTime = 1;
  backend.RenderAudio();

  const gainParam = context.sources[0].connectedTo.gain;
  const scheduledFade = gainParam.curves.at(-1);

  assert.equal(scheduledFade[1], 1);
  assert.equal(scheduledFade[2], 4);
  assert.ok(Math.abs(scheduledFade[0][0] - 1) < 1e-6);
  assert.ok(Math.abs(scheduledFade[0].at(-1) - 0.1) < 1e-6);
  assert.equal(gainParam.cancellations.at(-1), 0);

  gainParam.holds = [];
  gainParam.cancelAndHoldAtTime = time => gainParam.holds.push(time);
  context.currentTime = 2;
  backend.SetRTPCValue("unused", 1, 1);

  const rescheduledFade = gainParam.curves.at(-1);

  assert.deepEqual(gainParam.holds, [ 2 ]);
  assert.equal(rescheduledFade[1], 2);
  assert.equal(rescheduledFade[2], 3);

  context.currentTime = 5;
  backend.RenderAudio();

  const gainAtSecondAction = 1 + (0.1 - 1) * 0.25;
  const dbAtSecondAction = 20 * Math.log10(gainAtSecondAction);
  const expected = 10 ** ((dbAtSecondAction + 10) / 20);

  assert.ok(
    Math.abs(gainParam.value - expected) < 1e-12,
  );
  assert.ok(finished.includes(fadeID));
  assert.ok(finished.includes(relativeID));
});

test("Voice Volume sums parent and child hierarchy contributions", async () =>
{
  const volume = (targetId, valueMode, volumeDb, transitionMs = 0) => ({
    kind: "set-voice-volume",
    actionIndex: 0,
    targetId,
    targetFlags: 0,
    scope: "game-object",
    mode: "element",
    valueMode,
    volumeDb,
    delayMs: 0,
    transitionMs,
    curve: 4,
  });
  const programs = {
    play: [
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
    ],
    set_parent: [ volume("200", "absolute", -6) ],
    set_child: [ volume("700", "absolute", -3) ],
    relative_parent: [ volume("200", "relative", 2) ],
    fade_parent: [ volume("200", "absolute", -6, 4000) ],
    fade_child: [ volume("700", "absolute", -3, 2000) ],
    reset_child: [
      {
        kind: "reset-voice-volume",
        actionIndex: 0,
        targetId: "700",
        targetFlags: 0,
        scope: "game-object",
        mode: "element",
        delayMs: 0,
        transitionMs: 0,
        curve: 4,
      },
    ],
  };
  const { backend, emitter, context } = Harness({
    resolveSfxProgram: (_eventID, eventName) => programs[eventName],
    loadBuffer: async (_eventID, _eventName, controls, program) => ({
      voices: program.flatMap(operation =>
        operation.kind === "play"
          ? operation.selections.map(selection => ({
              buffer: { duration: 2 },
              loop: true,
              programSlotId: "0:0",
              matchIds: selection.matchIds,
              getGain: () => 10 ** (
                controls.getVoiceVolumeDb(selection.matchIds) / 20
              ),
              getGainAtVoiceVolumeDb: value => 10 ** (value / 20),
            }))
          : []),
    }),
  });

  backend.PostEvent(1, 1, 0, emitter, "play");
  await tick();

  const gain = context.sources[0].connectedTo.gain;

  backend.PostEvent(2, 1, 0, emitter, "set_parent");
  assert.ok(Math.abs(gain.value - 10 ** (-6 / 20)) < 1e-12);
  backend.PostEvent(3, 1, 0, emitter, "set_child");
  assert.ok(Math.abs(gain.value - 10 ** (-9 / 20)) < 1e-12);
  backend.PostEvent(4, 1, 0, emitter, "relative_parent");
  assert.ok(Math.abs(gain.value - 10 ** (-7 / 20)) < 1e-12);
  backend.PostEvent(5, 1, 0, emitter, "reset_child");
  assert.ok(Math.abs(gain.value - 10 ** (-4 / 20)) < 1e-12);

  backend.PostEvent(6, 1, 0, emitter, "fade_parent");
  backend.PostEvent(7, 1, 0, emitter, "fade_child");

  const aggregateFade = gain.curves.at(-1);

  assert.equal(aggregateFade[2], 4);
  assert.ok(
    Math.abs(aggregateFade[0][0] - 10 ** (-4 / 20)) < 1e-6,
  );
  assert.ok(
    Math.abs(aggregateFade[0].at(-1) - 10 ** (-9 / 20)) < 1e-6,
  );
});

test("unregister freezes Voice Volume for retired voices and resets a new generation", async () =>
{
  const programs = {
    play: [
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
    ],
    set: [
      {
        kind: "set-voice-volume",
        actionIndex: 0,
        targetId: "700",
        targetFlags: 0,
        scope: "game-object",
        mode: "element",
        valueMode: "absolute",
        volumeDb: -6,
        delayMs: 0,
        transitionMs: 0,
        curve: 4,
      },
    ],
    set_global: [
      {
        kind: "set-voice-volume",
        actionIndex: 0,
        targetId: "700",
        targetFlags: 0,
        scope: "global",
        mode: "element",
        valueMode: "absolute",
        volumeDb: -12,
        delayMs: 0,
        transitionMs: 0,
        curve: 4,
      },
    ],
  };
  const { backend, emitter, context } = Harness({
    resolveSfxProgram: (_eventID, eventName) => programs[eventName],
    loadBuffer: async (_eventID, _eventName, controls, program) => ({
      voices: program.flatMap(operation =>
        operation.kind === "play"
          ? operation.selections.map(selection => ({
              buffer: { duration: 2 },
              loop: true,
              programSlotId: "0:0",
              matchIds: selection.matchIds,
              getGain: () => 10 ** (
                controls.getVoiceVolumeDb(selection.matchIds) / 20
              ),
              getGainAtVoiceVolumeDb: value => 10 ** (value / 20),
            }))
          : []),
    }),
  });

  backend.PostEvent(1, 1, 0, emitter, "play");
  await tick();
  backend.PostEvent(2, 1, 0, emitter, "set");

  const retiredGain = context.sources[0].connectedTo.gain;

  backend.UnregisterGameObj(1);
  backend.RegisterGameObj(1);
  backend.PostEvent(3, 1, 0, emitter, "play");
  await tick();
  backend.RenderAudio();

  assert.ok(Math.abs(retiredGain.value - 10 ** (-6 / 20)) < 1e-12);
  assert.equal(context.sources[1].connectedTo.gain.value, 1);

  backend.PostEvent(4, 1, 0, emitter, "set_global");
  assert.ok(Math.abs(retiredGain.value - 10 ** (-6 / 20)) < 1e-12);
  assert.ok(
    Math.abs(
      context.sources[1].connectedTo.gain.value - 10 ** (-12 / 20)
    ) < 1e-12,
  );
});

test("authored Pause and Resume preserve position and stack per voice", async () =>
{
  const control = kind => [
    {
      kind,
      actionIndex: 0,
      targetId: "735447374",
      targetFlags: 0,
      scope: "game-object",
      mode: "element",
      delayMs: 0,
      transitionMs: 0,
      curve: 4,
      actionFlags: kind === "pause" ? 7 : 6,
      exceptions: [],
    },
  ];
  const { backend, emitter, context } = Harness({
    resolveSfxProgram: (_eventID, eventName) =>
      eventName === "voice_play"
        ? [
            {
              kind: "play",
              actionIndex: 0,
              selections: [
                {
                  actionIndex: 0,
                  leafIndex: 0,
                  matchIds: [ "735447374", "640431925" ],
                },
              ],
            },
          ]
        : control(eventName === "voice_pause" ? "pause" : "resume"),
    loadBuffer: async (_eventID, eventName) =>
      eventName === "voice_play"
        ? {
            voices: [
              {
                buffer: { duration: 10 },
                loop: true,
                programSlotId: "0:0",
              },
            ],
          }
        : { voices: [] },
  });
  const playingID = backend.PostEvent(
    1,
    1,
    0,
    emitter,
    "voice_play",
  );

  await tick();
  context.currentTime = 1;
  backend.PostEvent(2, 1, 0, emitter, "voice_pause");

  const pausedAt = backend.GetSourcePlayPosition(playingID);

  assert.equal(context.sources.length, 1);
  assert.equal(context.sources[0].stoppedAt, 1);
  assert.ok(pausedAt > 990 && pausedAt < 1000);

  context.currentTime = 2;
  backend.PostEvent(2, 1, 0, emitter, "voice_pause");
  context.currentTime = 3;
  backend.PostEvent(3, 1, 0, emitter, "voice_resume");

  assert.equal(context.sources.length, 1, "one Resume leaves one pause layer");
  assert.equal(backend.GetSourcePlayPosition(playingID), pausedAt);

  context.currentTime = 4;
  backend.PostEvent(3, 1, 0, emitter, "voice_resume");

  assert.equal(context.sources.length, 2);
  assert.ok(
    Math.abs(context.sources[1].offset - pausedAt / 1000) < 0.001,
  );

  context.currentTime = 5;
  assert.ok(backend.GetSourcePlayPosition(playingID) > pausedAt + 990);
  assert.equal(backend.GetPlayingCount() >= 1, true);
});

test("Pause holds pending media and Resume retains finite-repeat progress", async () =>
{
  const pending = Deferred();
  const programs = {
    voice_play: [
      {
        kind: "play",
        actionIndex: 0,
        selections: [
          {
            actionIndex: 0,
            leafIndex: 0,
            matchIds: [ "735447374" ],
          },
        ],
      },
    ],
    voice_pause: [
      {
        kind: "pause",
        actionIndex: 0,
        targetId: "735447374",
        scope: "game-object",
        mode: "element",
        delayMs: 0,
        transitionMs: 0,
        curve: 4,
        actionFlags: 7,
        exceptions: [],
      },
    ],
    voice_resume: [
      {
        kind: "resume",
        actionIndex: 0,
        targetId: "735447374",
        scope: "game-object",
        mode: "element",
        delayMs: 0,
        transitionMs: 0,
        curve: 4,
        actionFlags: 6,
        exceptions: [],
      },
    ],
  };
  const { backend, emitter, context } = Harness({
    resolveSfxProgram: (_eventID, eventName) => programs[eventName],
    loadBuffer: (_eventID, eventName) =>
      eventName === "voice_play"
        ? pending.promise
        : { voices: [] },
  });

  backend.PostEvent(1, 1, 0, emitter, "voice_play");
  context.currentTime = 0.1;
  backend.PostEvent(2, 1, 0, emitter, "voice_pause");
  pending.resolve({
    voices: [
      {
        buffer: { duration: 2 },
        playCount: 3,
        programSlotId: "0:0",
      },
    ],
  });
  await tick();

  assert.equal(context.sources.length, 0, "paused acquisition stays silent");

  context.currentTime = 0.2;
  backend.PostEvent(3, 1, 0, emitter, "voice_resume");

  assert.equal(context.sources.length, 1);
  assert.equal(context.sources[0].offset, 0);

  context.currentTime = 2.5;
  backend.PostEvent(2, 1, 0, emitter, "voice_pause");
  context.currentTime = 4;
  backend.PostEvent(3, 1, 0, emitter, "voice_resume");

  assert.equal(context.sources.length, 2);
  assert.ok(context.sources[1].offset > 0.29);
  assert.ok(context.sources[1].offset < 0.31);
  assert.ok(context.sources[1].stoppedAt > 7.7);
  assert.ok(context.sources[1].stoppedAt < 7.71);
});

test("a targeted Stop settles a paused voice without reviving its source", async () =>
{
  const programs = {
    voice_play: [
      {
        kind: "play",
        actionIndex: 0,
        selections: [
          {
            actionIndex: 0,
            leafIndex: 0,
            matchIds: [ "735447374" ],
          },
        ],
      },
    ],
    voice_pause: [
      {
        kind: "pause",
        actionIndex: 0,
        targetId: "735447374",
        scope: "game-object",
        mode: "element",
        delayMs: 0,
        transitionMs: 0,
        curve: 4,
        actionFlags: 7,
        exceptions: [],
      },
    ],
    voice_stop: [
      {
        kind: "stop",
        actionIndex: 0,
        targetId: "735447374",
        scope: "game-object",
        mode: "element",
        delayMs: 0,
        transitionMs: 0,
        curve: 4,
        actionFlags: 6,
        exceptions: [],
      },
    ],
  };
  const { backend, emitter, finished, context } = Harness({
    resolveSfxProgram: (_eventID, eventName) => programs[eventName],
    loadBuffer: async (_eventID, eventName) =>
      eventName === "voice_play"
        ? {
            voices: [
              {
                buffer: { duration: 10 },
                loop: true,
                programSlotId: "0:0",
              },
            ],
          }
        : { voices: [] },
  });
  const playingID = backend.PostEvent(
    1,
    1,
    0,
    emitter,
    "voice_play",
  );

  await tick();
  context.currentTime = 1;
  backend.PostEvent(2, 1, 0, emitter, "voice_pause");
  backend.PostEvent(3, 1, 0, emitter, "voice_stop");
  await tick();

  assert.equal(context.sources.length, 1);
  assert.equal(backend.GetSourcePlayPosition(playingID), -1);
  assert.ok(finished.includes(playingID));
});

test("Stop during a Pause fade settles the logical voice", async () =>
{
  const control = (kind, transitionMs = 0) => [
    {
      kind,
      actionIndex: 0,
      targetId: "735447374",
      targetFlags: 0,
      scope: "game-object",
      mode: "element",
      delayMs: 0,
      transitionMs,
      curve: 0,
      actionFlags: kind === "pause" ? 7 : 6,
      exceptions: [],
    },
  ];
  const { backend, emitter, context, finished } = Harness({
    resolveSfxProgram: (_eventID, eventName) =>
      eventName === "voice_play"
        ? [
            {
              kind: "play",
              actionIndex: 0,
              selections: [
                {
                  actionIndex: 0,
                  leafIndex: 0,
                  matchIds: [ "735447374" ],
                },
              ],
            },
          ]
        : eventName === "voice_pause"
          ? control("pause", 4000)
          : control("stop"),
    loadBuffer: async (_eventID, eventName) =>
      eventName === "voice_play"
        ? {
            voices: [
              {
                buffer: { duration: 10 },
                loop: true,
                programSlotId: "0:0",
              },
            ],
          }
        : { voices: [] },
  });
  const playingID = backend.PostEvent(1, 1, 0, emitter, "voice_play");

  await tick();
  context.currentTime = 1;
  backend.PostEvent(2, 1, 0, emitter, "voice_pause");
  assert.equal(context.sources[0].stoppedAt, 5);

  context.currentTime = 2;
  backend.PostEvent(3, 1, 0, emitter, "voice_stop");
  assert.equal(context.sources[0].stoppedAt, 2);
  context.sources[0].onended();

  assert.equal(backend.GetSourcePlayPosition(playingID), -1);
  assert.ok(finished.includes(playingID));
});

test("Resume cancels an in-progress Pause envelope before fading in", async () =>
{
  const programs = {
    voice_play: [
      {
        kind: "play",
        actionIndex: 0,
        selections: [
          {
            actionIndex: 0,
            leafIndex: 0,
            matchIds: [ "735447374" ],
          },
        ],
      },
    ],
    voice_pause: [
      {
        kind: "pause",
        actionIndex: 0,
        targetId: "735447374",
        targetFlags: 0,
        scope: "game-object",
        mode: "element",
        delayMs: 0,
        transitionMs: 4000,
        curve: 0,
        actionFlags: 7,
        exceptions: [],
      },
    ],
    voice_resume: [
      {
        kind: "resume",
        actionIndex: 0,
        targetId: "735447374",
        targetFlags: 0,
        scope: "game-object",
        mode: "element",
        delayMs: 0,
        transitionMs: 1000,
        curve: 0,
        actionFlags: 6,
        exceptions: [],
      },
    ],
  };
  const { backend, emitter, context } = Harness({
    resolveSfxProgram: (_eventID, eventName) => programs[eventName],
    loadBuffer: async (_eventID, eventName) =>
      eventName === "voice_play"
        ? {
            voices: [
              {
                buffer: { duration: 10 },
                loop: true,
                programSlotId: "0:0",
              },
            ],
          }
        : { voices: [] },
  });

  backend.PostEvent(1, 1, 0, emitter, "voice_play");
  await tick();
  const stopParam = context.sources[0].connectedTo.connectedTo.gain;

  context.currentTime = 1;
  backend.PostEvent(2, 1, 0, emitter, "voice_pause");
  assert.equal(stopParam.curves.length, 1);

  context.currentTime = 2;
  backend.PostEvent(3, 1, 0, emitter, "voice_resume");

  assert.equal(context.sources.length, 2);
  assert.ok(stopParam.cancellations.includes(0));
  assert.equal(stopParam.curves.length, 2);
  assert.ok(stopParam.curves.at(-1)[1] > 2);
});

test("a natural end wins when it precedes the Pause boundary", async () =>
{
  const programs = {
    voice_play: [
      {
        kind: "play",
        actionIndex: 0,
        selections: [
          {
            actionIndex: 0,
            leafIndex: 0,
            matchIds: [ "735447374" ],
          },
        ],
      },
    ],
    voice_pause: [
      {
        kind: "pause",
        actionIndex: 0,
        targetId: "735447374",
        targetFlags: 0,
        scope: "game-object",
        mode: "element",
        delayMs: 0,
        transitionMs: 3000,
        curve: 4,
        actionFlags: 7,
        exceptions: [],
      },
    ],
  };
  const { backend, emitter, context, finished } = Harness({
    resolveSfxProgram: (_eventID, eventName) => programs[eventName],
    loadBuffer: async (_eventID, eventName) =>
      eventName === "voice_play"
        ? {
            voices: [
              {
                buffer: { duration: 1 },
                playCount: 2,
                programSlotId: "0:0",
              },
            ],
          }
        : { voices: [] },
  });
  const playingID = backend.PostEvent(1, 1, 0, emitter, "voice_play");

  await tick();
  const naturalEnd = context.sources[0].stoppedAt;

  context.currentTime = 0.1;
  backend.PostEvent(2, 1, 0, emitter, "voice_pause");

  assert.ok(naturalEnd > 2 && naturalEnd < 2.01);
  assert.equal(context.sources[0].stoppedAt, naturalEnd);

  context.currentTime = naturalEnd;
  context.sources[0].onended();

  assert.equal(backend.GetSourcePlayPosition(playingID), -1);
  assert.ok(finished.includes(playingID));
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
  assert.equal(context.gains[4].gain.curves.length, 1);
  assert.deepEqual(finished, []);
  assert.equal(backend.GetPlayingCount(), 1);

  context.sources[0].onended?.();
  assert.deepEqual(finished, [ playingID ]);
  assert.equal(backend.GetPlayingCount(), 0);
});

test("authored Stop fades cannot extend finite authored repeats", async () =>
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
          transitionMs: 10000,
          curve: 2,
          exceptions: [],
        },
      ]);
      return {
        voices: [
          {
            buffer: { duration: 2 },
            playCount: 2,
            programSlotId: "0:0",
          },
        ],
      };
    },
  });

  backend.PostEvent(7, 1, 0, emitter, "delayed_stop");
  await tick();
  const authoredEnd = 4 + START_QUANTUM;

  context.currentTime = 1;
  backend.RenderAudio();

  assert.equal(context.gains[4].gain.curves[0][2], 10);
  assert.equal(
    context.sources[0].stoppedAt,
    authoredEnd,
    "the Stop envelope remains authored but cannot add extra repeats",
  );
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
  assert.equal(context.gains[4].gain.value, 0);
  assert.deepEqual(context.gains[4].gain.curves, []);
});

test("live pitch keeps the physical start time used by an overdue Stop", async () =>
{
  let controls;
  const { backend, emitter, context } = Harness({
    loadBuffer: async (_eventID, _eventName, suppliedControls) =>
    {
      controls = suppliedControls;
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
          delayMs: 4000,
          transitionMs: 3000,
          curve: 4,
          exceptions: [],
        },
      ]);
      return {
        voices: [
          {
            buffer: { duration: 20 },
            programSlotId: "0:0",
            getPlaybackRate: () =>
              controls.getState("combat") === "danger" ? 2 : 1,
          },
        ],
      };
    },
  });

  backend.PostEvent(7, 1, 0, emitter, "rate_then_stop");
  await tick();

  context.currentTime = 5;
  backend.SetGlobalState("combat", "danger");
  context.currentTime = 6;
  backend.RenderAudio();

  assert.equal(
    context.sources[0].stoppedAt,
    7,
    "the overdue transition retains its authored end instead of stopping now",
  );
  assert.equal(context.sources[0].playbackRate.value, 2);
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
  assert.equal(context.gains[4].gain.value, 0);
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
    context.gains[4].gain.ramps,
    context.gains[6].gain.ramps,
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
    context.gains[5].connectedTo,
    context.gains[1],
    "the lazy 2D emitter gain feeds the SFX bus directly"
  );
  assert.equal(
    context.gains[3].connectedTo,
    context.gains[4],
    "the voice retains an independent stop envelope",
  );
  assert.equal(
    context.gains[4].connectedTo,
    context.gains[5],
    "the stop envelope feeds the flat emitter route",
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
    context.gains[5].gain,
    "the adapter receives the newly created flat emitter gain",
  );
});
