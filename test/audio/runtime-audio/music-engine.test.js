import test from "node:test";
import assert from "node:assert/strict";
import { CjsMusicEngine, wwiseIdFromName } from "../../../npm/dist/audio/index.js";
import { CjsBusDuckingController } from "../../../src/audio/internal/busDucking.js";
import { CjsBusGraphRuntime } from "../../../src/audio/internal/busGraphRuntime.js";
import { CjsSharedBusMixer } from "../../../src/audio/internal/busGraphMixer.js";


// Synthetic music graph in the extractor's emitted shape: a switch container
// (group "music_mood") routing mood "calm" -> a playlist looping segment A,
// mood "combat" -> segment B directly. Setter event flips the mood.

const GROUP = wwiseIdFromName("music_mood");
const CALM = wwiseIdFromName("calm");
const COMBAT = wwiseIdFromName("combat");
const SILENT = wwiseIdFromName("silent");
const UNSHIPPED = wwiseIdFromName("unshipped");

const SEGMENT_A = 100, SEGMENT_B = 200, TRACK_A = 101, TRACK_B = 201;
const TRANSITION_SEGMENT = 250, TRANSITION_TRACK = 251;
const PLAYLIST = 300, SWITCH = 400;

// Segment A: 10s long, entry cue 1000ms, exit cue 9000ms -> 8s boundary period.
// Its clip covers the full source (10s) starting at timeline 0 (1s pre-entry).
function fixtureGraph()
{
  return {
    schemaVersion: 1,
    nodes: {
      [SEGMENT_A]: {
        type: "music-segment",
        children: [ TRACK_A ],
        meter: { gridPeriod: 1000, gridOffset: 0, tempo: 120, beatsPerBar: 4, beatValue: 4 },
        stingers: [],
        duration: 10000,
        markers: [ { id: 1, position: 1000, name: "" }, { id: 2, position: 9000, name: "" } ]
      },
      [TRACK_A]: {
        type: "music-track",
        trackType: 0,
        subTrackCount: 1,
        switchParams: null,
        sources: [ { pluginId: 0x00040001, streamType: 1, sourceId: 111, inMemoryMediaSize: 0, sourceBits: 0 } ],
        clips: [ { trackId: 0, sourceId: 111, eventId: 0, playAt: 0, beginTrimOffset: 0, endTrimOffset: 0, srcDuration: 10000 } ]
      },
      [SEGMENT_B]: {
        type: "music-segment",
        children: [ TRACK_B ],
        meter: { gridPeriod: 1000, gridOffset: 0, tempo: 120, beatsPerBar: 4, beatValue: 4 },
        stingers: [],
        duration: 4000,
        markers: [ { id: 1, position: 0, name: "" }, { id: 2, position: 4000, name: "" } ]
      },
      [TRACK_B]: {
        type: "music-track",
        trackType: 0,
        subTrackCount: 1,
        switchParams: null,
        sources: [ { pluginId: 0x00040001, streamType: 1, sourceId: 222, inMemoryMediaSize: 0, sourceBits: 0 } ],
        clips: [ { trackId: 0, sourceId: 222, eventId: 0, playAt: 0, beginTrimOffset: 0, endTrimOffset: 0, srcDuration: 4000 } ]
      },
      [PLAYLIST]: {
        type: "music-playlist-container",
        children: [ SEGMENT_A ],
        meter: { gridPeriod: 1000, gridOffset: 0, tempo: 120, beatsPerBar: 4, beatValue: 4 },
        stingers: [],
        rules: [],
        // Root sequence loops forever over one leaf that plays segment A once.
        playlist: [
          { segmentId: 0, playlistItemId: 1, childCount: 1, rsType: 0, loop: 0, loopMin: 0, loopMax: 0, weight: 50000, avoidRepeatCount: 0, usingWeight: false, shuffle: false },
          { segmentId: SEGMENT_A, playlistItemId: 2, childCount: 0, rsType: -1, loop: 1, loopMin: 0, loopMax: 0, weight: 50000, avoidRepeatCount: 0, usingWeight: false, shuffle: false }
        ]
      },
      [SWITCH]: {
        type: "music-switch-container",
        children: [ PLAYLIST, SEGMENT_B ],
        meter: { gridPeriod: 1000, gridOffset: 0, tempo: 120, beatsPerBar: 4, beatValue: 4 },
        stingers: [],
        rules: [ {
          srcIds: [ -1 ], dstIds: [ -1 ],
          src: { transitionTime: 500, fadeCurve: 4, fadeOffset: 0, syncType: 7, cueFilterHash: 0, playPostExit: false },
          dst: { transitionTime: 0, fadeCurve: 4, fadeOffset: 0, cueFilterHash: 0, jumpToId: 0, jumpToType: 0, entryType: 0, playPreEntry: false, matchSourceCueName: false },
          transitionSegment: null
        } ],
        continuePlayback: true,
        argumentGroups: [ { groupId: GROUP, groupType: 0 } ],
        mode: 0,
        treeNodes: [
          { key: 0, audioNodeId: 0, childrenIdx: 1, childrenCount: 5, weight: 50000, probability: 100 },
          { key: 0, audioNodeId: PLAYLIST, childrenIdx: 0, childrenCount: 0, weight: 50000, probability: 100 },
          { key: CALM, audioNodeId: PLAYLIST, childrenIdx: 0, childrenCount: 0, weight: 50000, probability: 100 },
          { key: COMBAT, audioNodeId: SEGMENT_B, childrenIdx: 0, childrenCount: 0, weight: 50000, probability: 100 },
          { key: SILENT, audioNodeId: 0, childrenIdx: 0, childrenCount: 0, weight: 50000, probability: 100 },
          { key: UNSHIPPED, audioNodeId: 999999, childrenIdx: 0, childrenCount: 0, weight: 50000, probability: 100 }
        ]
      }
    },
    eventTargets: { music_test_play: [ SWITCH ] },
    eventStops: { music_test_stop: [ SWITCH ] },
    switchSetters: {
      music_switch_calm: [ { kind: "switch", groupId: GROUP, targetId: CALM } ],
      music_switch_combat: [ { kind: "switch", groupId: GROUP, targetId: COMBAT } ],
      music_switch_silent: [ { kind: "switch", groupId: GROUP, targetId: SILENT } ],
      music_switch_unshipped: [ { kind: "switch", groupId: GROUP, targetId: UNSHIPPED } ]
    }
  };
}

function FakeContext()
{
  const context = {
    currentTime: 0,
    sampleRate: 48000,
    destination: { name: "destination" },
    gains: [],
    filters: [],
    sources: [],
    createGain()
    {
      const node = {
        gain: {
          value: 1,
          ramps: [],
          sets: [],
          curves: [],
          setValueAtTime(v, t)
          {
            node.gain.value = v;
            node.gain.sets.push([ v, t ]);
          },
          linearRampToValueAtTime(v, t)
          {
            node.gain.ramps.push([ v, t ]);
          },
          setValueCurveAtTime(values, start, duration)
          {
            node.gain.curves.push([
              Array.from(values),
              start,
              duration,
            ]);
          }
        },
        connectedTo: null,
        disconnected: false,
        connect(target) { node.connectedTo = target; },
        disconnect() { node.disconnected = true; }
      };
      context.gains.push(node);
      return node;
    },
    createBiquadFilter()
    {
      const node = {
        type: "",
        frequency: { value: 0 },
        Q: { value: 1 },
        gain: { value: 0 },
        connectedTo: null,
        disconnected: false,
        connect(target) { node.connectedTo = target; },
        disconnect() { node.disconnected = true; },
      };
      context.filters.push(node);
      return node;
    },
    createBufferSource()
    {
      const source = {
        buffer: null, onended: null, connectedTo: null,
        startedAt: null, startOffset: null, startDuration: null, stoppedAt: null,
        disconnected: false,
        connect(target) { source.connectedTo = target; },
        disconnect() { source.disconnected = true; },
        start(when, offset, duration) { source.startedAt = when; source.startOffset = offset; source.startDuration = duration; },
        stop(when) { source.stoppedAt = when; }
      };
      context.sources.push(source);
      return source;
    }
  };
  return context;
}

function Harness(mutate = null, engineOptions = {})
{
  const context = FakeContext();
  const loaded = [];
  const finished = [];
  const graph = fixtureGraph();
  mutate?.(graph);
  const engine = new CjsMusicEngine({
    graph,
    context,
    loadMedia: async sourceId => (loaded.push(sourceId), { fake: sourceId }),
    destination: context.destination,
    random: () => 0.5,
    ...engineOptions,
  });
  return { context, engine, loaded, finished };
}

const tick = () => new Promise(resolve => setImmediate(resolve));

function Deferred()
{
  let resolve;
  const promise = new Promise(next => { resolve = next; });
  return { promise, resolve };
}

function MixerBus(overrides = {})
{
  return {
    type: "audio-bus",
    channelConfig: { raw: 0 },
    positioning: {
      flags: 0,
      overrideParent: false,
      listenerRelative: false,
      pannerType: 0,
      positionType: 0,
    },
    hdr: {
      flags: 0,
      enabled: false,
      exponentialRelease: false,
    },
    bypassAllEffects: false,
    userAuxSends: [],
    effects: [],
    requiresProcessing: [],
    ...overrides,
  };
}

function MusicMixerCatalog({
  busVolumeDb = 0,
  authoredBusMakeUpGainDb = 0,
  authoredOutputBusVolumeDb = 0,
} = {})
{
  return {
    schemaVersion: 1,
    effects: {},
    buses: {
      "1": MixerBus(),
      "500": MixerBus({
        parentBusId: "1",
        ...(busVolumeDb === 0 ? {} : { busVolumeDb }),
      }),
      "600": MixerBus({ parentBusId: "1" }),
      "700": MixerBus({
        parentBusId: "1",
        requiresProcessing: [ "state" ],
      }),
    },
    routes: [
      {
        outputBusId: "500",
        busPathIds: [ "500", "1" ],
        userAuxSends: [],
        ...(busVolumeDb === 0 ? {} : { authoredBusVolumeDb: busVolumeDb }),
        ...(authoredBusMakeUpGainDb === 0
          ? {}
          : { authoredBusMakeUpGainDb }),
        ...(authoredOutputBusVolumeDb === 0
          ? {}
          : { authoredOutputBusVolumeDb }),
      },
      {
        outputBusId: "600",
        busPathIds: [ "600", "1" ],
        userAuxSends: [],
      },
      {
        outputBusId: "700",
        busPathIds: [ "700", "1" ],
        userAuxSends: [],
      },
    ],
    sfxRoutes: {},
    musicRoutes: {
      [TRACK_A]: 0,
      [TRACK_B]: 1,
      [TRANSITION_TRACK]: 2,
      "911": 0,
      "921": 1,
    },
  };
}

function MusicEqFixture()
{
  const bytes = new Uint8Array(56);
  const view = new DataView(bytes.buffer);
  let at = 0;

  for (let index = 0; index < 3; index++)
  {
    view.setUint32(at, index === 0 ? 6 : 0, true);
    view.setFloat32(at + 4, index === 0 ? -13 : 0, true);
    view.setFloat32(at + 8, index === 0 ? 120 : 8000, true);
    view.setFloat32(at + 12, index === 0 ? 5 : 1, true);
    view.setUint8(at + 16, index === 0 ? 1 : 0);
    at += 17;
  }
  view.setFloat32(at, 0, true);
  view.setUint8(at + 4, 1);
  return {
    graphEffect: {
      type: "effect-share-set",
      pluginId: 0x00690003,
      parameterByteLength: bytes.byteLength,
      parametersBase64: Buffer.from(bytes).toString("base64"),
      media: [],
      controls: {
        rtpcCount: 0,
        statePropertyCount: 0,
        stateGroupCount: 0,
        propertyValueCount: 0,
      },
    },
    busEffects: {
      schemaVersion: 1,
      buses: {
        "500": [ {
          effectId: "990",
          slotIndex: 0,
          type: "parametric-eq",
          bands: [ {
            index: 0,
            filterType: "peaking",
            gainDb: -13,
            frequencyHz: 120,
            q: 5,
          } ],
          outputGainDb: 0,
          processLfe: true,
        } ],
      },
    },
  };
}

function PlaylistModeGraph({
  rsType,
  loop,
  loopMin = 0,
  loopMax = 0,
  shuffle = false,
  avoidRepeatCount = 0,
  segments = [ 910, 920 ],
})
{
  const nodes = {};
  const playlist = [ {
    segmentId: 0,
    playlistItemId: 900,
    childCount: segments.length,
    rsType,
    loop,
    loopMin,
    loopMax,
    weight: 1,
    avoidRepeatCount,
    usingWeight: true,
    shuffle,
  } ];

  for (const [ index, segmentId ] of segments.entries())
  {
    const trackId = segmentId + 1;

    playlist.push({
      segmentId,
      playlistItemId: segmentId,
      childCount: 0,
      rsType: -1,
      loop: 1,
      loopMin: 0,
      loopMax: 0,
      weight: 1,
      avoidRepeatCount: 0,
      usingWeight: false,
      shuffle: false,
    });
    nodes[segmentId] = {
      type: "music-segment",
      duration: 1000,
      markers: [ { position: 0 }, { position: 1000 } ],
      meter: { tempo: 120, beatsPerBar: 4, gridPeriod: 500, gridOffset: 0 },
      children: [ trackId ],
    };
    nodes[trackId] = {
      type: "music-track",
      trackType: 0,
      subTrackCount: 1,
      switchParams: null,
      clips: [ {
        trackId: 0,
        sourceId: 1000 + index,
        playAt: 0,
        beginTrimOffset: 0,
        endTrimOffset: 0,
        srcDuration: 1000,
      } ],
    };
  }
  nodes[900] = {
    type: "music-playlist-container",
    playlist,
  };
  return {
    nodes,
    eventTargets: { play: [ 900 ] },
    eventStops: {},
    switchSetters: {},
  };
}

async function PlayPlaylistMode(options, samples)
{
  const context = FakeContext();
  const values = [ ...samples ];
  const engine = new CjsMusicEngine({
    graph: PlaylistModeGraph(options),
    context,
    destination: context.destination,
    loadMedia: async sourceId => ({ fake: sourceId }),
    random: () => values.shift() ?? 0,
  });

  engine.PostEvent("play", 990, () => {});
  await tick();
  for (let time = 1; time <= 8; time++)
  {
    context.currentTime = time;
    engine.Process();
    await tick();
  }
  return context.sources.map(source => source.buffer.fake);
}


test("posting the music event schedules the resolved playlist's segment clips on time", async () =>
{
  const { context, engine, loaded, finished } = Harness();
  assert.equal(engine.HandlesEvent("music_test_play"), true);
  assert.equal(engine.HandlesEvent("some_gun_sound"), false);

  engine.PostEvent("music_test_play", 501, () => finished.push(501));
  assert.equal(engine.GetPlayingCount(), 1);
  assert.equal(
    engine.GetStatus()[0].preparingTargetId,
    PLAYLIST,
    "default switch value prepares the playlist before starting its timeline",
  );
  assert.equal(engine.GetStatus()[0].state, "preparing");
  assert.equal(
    engine.GetStatus()[0].silent,
    false,
    "a pending media load is not authored silence",
  );

  await tick();
  assert.equal(engine.GetResolvedTarget(501), PLAYLIST);
  assert.deepEqual(loaded, [ 111 ], "segment A's media requested once");
  const first = context.sources[0];
  // Clip starts 1s pre-entry: entry cue aligns at now (0), so the source
  // starts immediately with a 1000ms offset into the clip.
  assert.equal(first.startedAt, 0);
  assert.equal(first.startOffset, 1);
  assert.equal(first.startDuration, 9, "remaining clip audio after the offset");
  assert.equal(first.connectedTo, context.gains[2], "clips play through their segment gain");
  assert.equal(context.gains[2].connectedTo, context.gains[1], "segment gain chains into the instance gain");
  assert.equal(context.gains[1].connectedTo, context.gains[0], "instance gain chains into the music bus");
  assert.equal(context.gains[0].connectedTo, context.destination, "music bus feeds the destination");
  engine.SetMusicVolume(0.25);
  assert.equal(context.gains[0].gain.value, 0.25, "music volume drives the music bus");

  const [ status ] = engine.GetStatus();
  assert.equal(status.playingID, 501);
  assert.equal(status.resolvedTargetId, PLAYLIST);
  assert.equal(status.preparingTargetId, null, "nothing queued");
  assert.equal(status.silent, false);
  assert.deepEqual(status.segments, [ {
    segmentId: SEGMENT_A, scheduleId: 1, targetId: PLAYLIST, startCtx: 0, endCtx: 8,
    volume: 1, fading: false, fadeEndCtx: null,
    scheduledSources: 1, realizedSources: 1, audibleSources: 1,
    pendingSources: 0, failedSources: 0, missedSources: 0,
    endedSources: 0, pending: 0
  } ], "scheduled window spans entry to exit cue with mix state and identity");

  assert.equal(engine.PreviewSwitchEvent("music_switch_combat", SWITCH), SEGMENT_B, "combat previews playable");
  assert.equal(engine.PreviewSwitchEvent("music_switch_silent", SWITCH), null, "authored silence previews unavailable");
  assert.equal(engine.PreviewSwitchEvent("music_switch_unshipped", SWITCH), null, "unshipped content previews unavailable");
});

test("one music Play event realizes every authored target under one playing id", async () =>
{
  const { context, engine, finished } = Harness(graph =>
  {
    graph.eventTargets.music_multi_play = [ SEGMENT_A, SEGMENT_B ];
  });

  assert.equal(
    engine.PostEvent(
      "music_multi_play",
      512,
      () => finished.push(512),
    ),
    true,
  );
  await tick();

  assert.equal(engine.GetPlayingCount(), 1, "one posted event remains one public playing id");
  assert.deepEqual(
    engine.GetStatus().map(status => status.rootId).sort((a, b) => a - b),
    [ SEGMENT_A, SEGMENT_B ],
  );
  assert.deepEqual(
    context.sources.map(source => source.buffer.fake).sort((a, b) => a - b),
    [ 111, 222 ],
    "both authored target layers schedule media",
  );

  engine.ExecuteAction("stop", 512, 0);
  assert.equal(engine.GetPlayingCount(), 0);
  assert.deepEqual(
    finished,
    [ 512 ],
    "stopping the shared playing id completes once after both targets stop",
  );
});

test("an unavailable music Play target does not cancel an audible sibling", async () =>
{
  const graph = fixtureGraph();
  const context = FakeContext();
  const finished = [];

  graph.eventTargets.music_multi_play = [ SEGMENT_A, SEGMENT_B ];
  const engine = new CjsMusicEngine({
    graph,
    context,
    destination: context.destination,
    loadMedia: async sourceId =>
      sourceId === 111 ? null : { fake: sourceId },
  });

  engine.PostEvent("music_multi_play", 513, () => finished.push(513));
  await tick();
  await tick();

  assert.equal(engine.GetPlayingCount(), 1);
  assert.deepEqual(
    context.sources.map(source => source.buffer.fake),
    [ 222 ],
    "the available target remains audible",
  );
  context.currentTime = 4;
  engine.Process();
  engine.Process();

  assert.equal(engine.GetPlayingCount(), 0);
  assert.deepEqual(finished, [ 513 ], "the group completes once its audible sibling ends");
});

test("Continue Playback preserves a shared target across switch routes", async () =>
{
  const { context, engine, loaded } = Harness();

  engine.PostEvent("music_test_play", 520, () => {});
  await tick();

  const source = context.sources[0];
  const scheduleId = engine.GetStatus()[0].segments[0].scheduleId;

  context.currentTime = 2;
  engine.PostEvent("music_switch_calm", 521, () => {});
  await tick();
  await tick();

  assert.equal(engine.GetResolvedTarget(520), PLAYLIST);
  assert.deepEqual(loaded, [ 111 ], "the shared target is not prepared again");
  assert.equal(context.sources.length, 1, "no replacement source is created");
  assert.equal(source.stoppedAt, null);
  assert.equal(engine.GetStatus()[0].segments[0].scheduleId, scheduleId);

  engine.PostEvent("music_switch_calm", 522, () => {});
  await tick();
  assert.equal(context.sources.length, 1, "reapplying the route is a no-op");
});

test("Continue Playback disabled restarts a shared target at its authored boundary", async () =>
{
  const { context, engine, loaded } = Harness(graph =>
  {
    graph.nodes[SWITCH].continuePlayback = false;
    graph.nodes[SWITCH].rules[0].dst.playPreEntry = true;
  });

  engine.PostEvent("music_test_play", 523, () => {});
  await tick();
  const first = context.sources[0];

  context.currentTime = 2;
  engine.PostEvent("music_switch_calm", 524, () => {});
  await tick();
  await tick();

  assert.equal(engine.GetResolvedTarget(523), PLAYLIST);
  assert.deepEqual(loaded, [ 111 ], "the decoded buffer remains reusable");
  assert.equal(first.stoppedAt, 8, "the old route reaches its exit cue");
  assert.equal(context.sources.length, 2);
  assert.equal(
    context.sources[1].startedAt,
    7,
    "the restarted first segment preserves its one-second pre-entry audio",
  );
  assert.equal(
    engine.GetStatus()[0].segments.at(-1).startCtx,
    8,
    "the shared playlist restarts from its first segment at the boundary",
  );

  engine.PostEvent("music_switch_calm", 525, () => {});
  await tick();
  assert.equal(
    context.sources.length,
    2,
    "reapplying a Continue-disabled route still remains a no-op",
  );
});

test("a cancelled same-target route prepare cannot restart stale music", async () =>
{
  const context = FakeContext();
  const graph = fixtureGraph();
  const restart = Deferred();
  let loads = 0;

  graph.nodes[SWITCH].continuePlayback = false;

  const engine = new CjsMusicEngine({
    graph,
    context,
    destination: context.destination,
    loadMedia: () => ++loads === 1
      ? Promise.resolve({ fake: 111 })
      : restart.promise,
  });

  engine.PostEvent("music_test_play", 526, () => {});
  await tick();
  engine.ReleaseMedia(111);

  context.currentTime = 2;
  engine.PostEvent("music_switch_calm", 527, () => {});
  await tick();
  assert.equal(engine.GetStatus()[0].preparingTargetId, PLAYLIST);

  engine.SetSwitch(GROUP, 0);
  assert.equal(engine.GetStatus()[0].preparingTargetId, null);

  restart.resolve({ fake: 111 });
  await tick();
  await tick();

  assert.equal(context.sources.length, 1);
  assert.equal(context.sources[0].stoppedAt, null);
});

test("a failed same-target restart leaves the current route retryable", async () =>
{
  const context = FakeContext();
  const graph = fixtureGraph();
  let loads = 0;
  let restartAvailable = false;

  graph.nodes[SWITCH].continuePlayback = false;

  const engine = new CjsMusicEngine({
    graph,
    context,
    destination: context.destination,
    loadMedia: async sourceId =>
    {
      loads++;
      return loads === 1 || restartAvailable
        ? { fake: sourceId }
        : null;
    },
  });

  engine.PostEvent("music_test_play", 528, () => {});
  await tick();
  engine.ReleaseMedia(111);

  context.currentTime = 2;
  engine.PostEvent("music_switch_calm", 529, () => {});
  await tick();
  await tick();

  assert.equal(context.sources.length, 1);
  assert.equal(context.sources[0].stoppedAt, null);
  assert.equal(engine.GetStatus()[0].unavailableTargetId, PLAYLIST);

  restartAvailable = true;
  engine.PostEvent("music_switch_calm", 530, () => {});
  await tick();
  await tick();

  assert.equal(
    context.sources.length,
    2,
    "the unchanged requested route retries because the failed route never committed",
  );
  assert.equal(engine.GetStatus()[0].unavailableTargetId, null);
});

test("a nested Continue-disabled route restarts while unrelated groups do not", async () =>
{
  const INNER = 401;
  const INNER_GROUP = wwiseIdFromName("music_inner");
  const INNER_VALUE = wwiseIdFromName("music_inner_active");
  const { context, engine } = Harness(graph =>
  {
    graph.nodes[SWITCH].children = [ INNER, SEGMENT_B ];
    graph.nodes[SWITCH].treeNodes[1].audioNodeId = INNER;
    graph.nodes[SWITCH].treeNodes[2].audioNodeId = INNER;
    graph.nodes[INNER] = {
      type: "music-switch-container",
      children: [ PLAYLIST ],
      rules: [ {
        srcIds: [ PLAYLIST ],
        dstIds: [ PLAYLIST ],
        src: {
          transitionTime: 0,
          fadeCurve: 4,
          fadeOffset: 0,
          syncType: 0,
        },
        dst: {
          transitionTime: 0,
          fadeCurve: 4,
          fadeOffset: 0,
        },
        transitionSegment: null,
      } ],
      continuePlayback: false,
      argumentGroups: [ { groupId: INNER_GROUP, groupType: 0 } ],
      treeNodes: [
        {
          key: 0,
          audioNodeId: 0,
          childrenIdx: 1,
          childrenCount: 2,
        },
        {
          key: 0,
          audioNodeId: PLAYLIST,
          childrenIdx: 0,
          childrenCount: 0,
        },
        {
          key: INNER_VALUE,
          audioNodeId: PLAYLIST,
          childrenIdx: 0,
          childrenCount: 0,
        },
      ],
    };
    graph.switchSetters.music_switch_inner = [ {
      kind: "switch",
      groupId: INNER_GROUP,
      targetId: INNER_VALUE,
    } ];
  });

  engine.PostEvent("music_test_play", 531, () => {});
  await tick();

  engine.SetSwitch(wwiseIdFromName("unrelated"), 1);
  await tick();
  assert.equal(context.sources.length, 1);

  context.currentTime = 2;
  engine.PostEvent("music_switch_inner", 532, () => {});
  await tick();
  await tick();

  assert.equal(context.sources.length, 2);
  assert.equal(
    context.sources[0].stoppedAt,
    2,
    "the changed inner container owns its immediate transition rule",
  );
  assert.equal(engine.GetStatus()[0].segments.at(-1).startCtx, 2);
  assert.equal(engine.GetResolvedTarget(531), PLAYLIST);
});

test("switch rules match their direct nested associations, not terminal leaves", async () =>
{
  const INNER_A = 401;
  const INNER_B = 402;
  const { context, engine } = Harness(graph =>
  {
    const fallback = graph.nodes[SWITCH].rules[0];
    const innerNode = (groupId, targetId) => ({
      type: "music-switch-container",
      children: [ targetId ],
      rules: [],
      continuePlayback: true,
      argumentGroups: [ { groupId, groupType: 0 } ],
      treeNodes: [
        {
          key: 0,
          audioNodeId: 0,
          childrenIdx: 1,
          childrenCount: 1,
        },
        {
          key: 0,
          audioNodeId: targetId,
          childrenIdx: 0,
          childrenCount: 0,
        },
      ],
    });

    graph.nodes[INNER_A] = innerNode(
      wwiseIdFromName("nested_a"),
      PLAYLIST,
    );
    graph.nodes[INNER_B] = innerNode(
      wwiseIdFromName("nested_b"),
      SEGMENT_B,
    );
    graph.nodes[SWITCH].children = [ INNER_A, INNER_B ];
    graph.nodes[SWITCH].treeNodes[1].audioNodeId = INNER_A;
    graph.nodes[SWITCH].treeNodes[2].audioNodeId = INNER_A;
    graph.nodes[SWITCH].treeNodes[3].audioNodeId = INNER_B;
    graph.nodes[SWITCH].rules = [
      {
        srcIds: [ 0 ],
        dstIds: [ INNER_A ],
        src: {
          transitionTime: 0,
          fadeCurve: 4,
          fadeOffset: 0,
          syncType: 0,
        },
        dst: {
          transitionTime: 1000,
          fadeCurve: 4,
          fadeOffset: 0,
        },
        transitionSegment: null,
      },
      fallback,
      {
        srcIds: [ INNER_A ],
        dstIds: [ INNER_B ],
        src: {
          transitionTime: 0,
          fadeCurve: 4,
          fadeOffset: 0,
          syncType: 0,
        },
        dst: {
          transitionTime: 0,
          fadeCurve: 4,
          fadeOffset: 0,
        },
        transitionSegment: null,
      },
    ];
  });

  engine.PostEvent("music_test_play", 535, () => {});
  await tick();
  assert.deepEqual(
    context.gains[2].gain.ramps,
    [ [ 1, 1 ] ],
    "initial Nothing matching uses the root's direct nested child",
  );

  context.currentTime = 2;
  engine.PostEvent("music_switch_combat", 536, () => {});
  await tick();

  assert.equal(
    context.sources[0].stoppedAt,
    2,
    "the direct-child specific rule wins over the exit-cue fallback",
  );
  assert.equal(
    context.sources.find(source => source.buffer?.fake === 222)?.startedAt,
    2,
  );
});

test("Nothing transition rules beat Any fallbacks in both directions", async () =>
{
  const { context, engine } = Harness(graph =>
  {
    const fallback = graph.nodes[SWITCH].rules[0];

    graph.nodes[SWITCH].rules = [
      {
        srcIds: [ 0 ],
        dstIds: [ PLAYLIST ],
        src: {
          transitionTime: 0,
          fadeCurve: 4,
          fadeOffset: 0,
          syncType: 0,
        },
        dst: {
          transitionTime: 1000,
          fadeCurve: 4,
          fadeOffset: 0,
        },
        transitionSegment: null,
      },
      {
        srcIds: [ PLAYLIST ],
        dstIds: [ 0 ],
        src: {
          transitionTime: 0,
          fadeCurve: 4,
          fadeOffset: 0,
          syncType: 0,
        },
        dst: {
          transitionTime: 0,
          fadeCurve: 4,
          fadeOffset: 0,
        },
        transitionSegment: null,
      },
      fallback,
    ];
  });

  engine.PostEvent("music_test_play", 533, () => {});
  await tick();

  assert.deepEqual(
    context.gains[2].gain.sets,
    [ [ 0, 0 ] ],
    "the initial Nothing-to-target rule applies its destination fade",
  );
  assert.deepEqual(context.gains[2].gain.ramps, [ [ 1, 1 ] ]);

  context.currentTime = 2;
  engine.PostEvent("music_switch_silent", 534, () => {});
  await tick();

  assert.equal(
    context.sources[0].stoppedAt,
    2,
    "Any-to-Any does not steal the explicit target-to-Nothing rule",
  );
});

test("initial music waits for media before anchoring its timeline", async () =>
{
  const context = FakeContext();
  const pending = Deferred();
  const engine = new CjsMusicEngine({
    graph: fixtureGraph(),
    context,
    destination: context.destination,
    loadMedia: () => pending.promise,
  });

  engine.PostEvent("music_test_play", 600, () => {});
  await tick();

  assert.equal(engine.GetStatus()[0].preparingTargetId, PLAYLIST);
  assert.equal(engine.GetTransportCapabilities(600).canPause, false);
  assert.equal(context.sources.length, 0);

  context.currentTime = 20;
  pending.resolve({ fake: 111 });
  await tick();
  await tick();

  assert.equal(context.sources.length, 1);
  assert.equal(
    context.sources[0].startedAt,
    20,
    "slow acquisition does not consume the finite segment timeline",
  );
});

test("an unavailable initial switch branch stays live and later recovers", async () =>
{
  const context = FakeContext();
  const engine = new CjsMusicEngine({
    graph: fixtureGraph(),
    context,
    destination: context.destination,
    loadMedia: async sourceId =>
      sourceId === 111 ? null : { fake: sourceId },
  });

  engine.PostEvent("music_test_play", 601, () => {});
  await tick();

  assert.equal(engine.GetPlayingCount(), 1);
  assert.equal(engine.GetStatus()[0].unavailableTargetId, PLAYLIST);
  assert.equal(engine.GetStatus()[0].state, "unavailable");
  assert.equal(engine.GetStatus()[0].silent, false);

  engine.PostEvent("music_switch_combat", 602, () => {});
  await tick();
  await tick();

  assert.equal(engine.GetResolvedTarget(601), SEGMENT_B);
  assert.ok(
    context.sources.some(source => source.buffer?.fake === 222),
    "a later valid switch target starts the silent instance",
  );
});

test("an initial authored-silence switch branch stays live and resumes", async () =>
{
  const { context, engine } = Harness();

  engine.SetSwitch(GROUP, SILENT);
  engine.PostEvent("music_test_play", 603, () => {});
  await tick();

  assert.equal(engine.GetPlayingCount(), 1);
  assert.equal(engine.GetStatus()[0].silent, true);
  assert.equal(context.sources.length, 0);

  engine.SetSwitch(GROUP, COMBAT);
  await tick();
  await tick();

  assert.equal(engine.GetResolvedTarget(603), SEGMENT_B);
  assert.ok(context.sources.some(source => source.buffer?.fake === 222));
});

test("an unavailable direct music target finishes instead of leaking silently", async () =>
{
  const context = FakeContext();
  const finished = [];
  const graph = fixtureGraph();

  graph.eventTargets.direct_play = [ SEGMENT_A ];
  const engine = new CjsMusicEngine({
    graph,
    context,
    destination: context.destination,
    loadMedia: async () => null,
  });

  engine.PostEvent("direct_play", 604, () => finished.push(604));
  await tick();

  assert.equal(engine.GetPlayingCount(), 0);
  assert.deepEqual(finished, [ 604 ]);
});

test("stopping during initial music preparation cannot revive stale playback", async () =>
{
  const context = FakeContext();
  const pending = Deferred();
  const finished = [];
  const engine = new CjsMusicEngine({
    graph: fixtureGraph(),
    context,
    destination: context.destination,
    loadMedia: () => pending.promise,
  });

  engine.PostEvent("music_test_play", 605, () => finished.push(605));
  await tick();
  engine.StopAll(0);

  assert.equal(engine.GetPlayingCount(), 0);
  assert.deepEqual(finished, [ 605 ]);

  pending.resolve({ fake: 111 });
  await tick();
  await tick();

  assert.equal(context.sources.length, 0);
  assert.deepEqual(finished, [ 605 ]);
});

test("finite music remains live through authored post-exit clip audio", async () =>
{
  const context = FakeContext();
  const finished = [];
  const graph = fixtureGraph();

  graph.eventTargets.direct_play = [ SEGMENT_A ];
  const engine = new CjsMusicEngine({
    graph,
    context,
    destination: context.destination,
    loadMedia: async sourceId => ({ fake: sourceId }),
  });

  engine.PostEvent("direct_play", 606, () => finished.push(606));
  await tick();

  context.currentTime = 7;
  engine.Process();
  context.currentTime = 8;
  engine.Process();
  assert.equal(
    engine.GetPlayingCount(),
    1,
    "the exit cue ends scheduling but not the clip's audible tail",
  );
  assert.deepEqual(finished, []);

  context.currentTime = 9;
  engine.Process();
  assert.equal(engine.GetPlayingCount(), 0);
  assert.deepEqual(finished, [ 606 ]);
});

test("browser pause remains available during an audible post-exit tail", async () =>
{
  const context = FakeContext();
  const graph = fixtureGraph();

  graph.eventTargets.direct_play = [ SEGMENT_A ];
  const engine = new CjsMusicEngine({
    graph,
    context,
    destination: context.destination,
    loadMedia: async sourceId => ({ fake: sourceId }),
  });

  engine.PostEvent("direct_play", 1209, () => {});
  await tick();
  context.currentTime = 8;
  engine.Process();

  assert.equal(engine.GetTransportCapabilities(1209).canPause, true);
  assert.equal(engine.PauseTransport(1209), true);
  assert.equal(context.sources[0].stoppedAt, 8.03);
});

test("failed scheduled music media does not remain permanently pending", async () =>
{
  const context = FakeContext();
  const graph = fixtureGraph();

  graph.nodes[PLAYLIST].playlist = [
    {
      segmentId: 0,
      playlistItemId: 1,
      childCount: 2,
      rsType: 0,
      loop: 1,
      loopMin: 0,
      loopMax: 0,
      weight: 1,
      avoidRepeatCount: 0,
      usingWeight: false,
      shuffle: false,
    },
    {
      segmentId: SEGMENT_A,
      playlistItemId: 2,
      childCount: 0,
      rsType: -1,
      loop: 1,
      loopMin: 0,
      loopMax: 0,
      weight: 1,
      avoidRepeatCount: 0,
      usingWeight: false,
      shuffle: false,
    },
    {
      segmentId: SEGMENT_B,
      playlistItemId: 3,
      childCount: 0,
      rsType: -1,
      loop: 1,
      loopMin: 0,
      loopMax: 0,
      weight: 1,
      avoidRepeatCount: 0,
      usingWeight: false,
      shuffle: false,
    },
  ];
  const engine = new CjsMusicEngine({
    graph,
    context,
    destination: context.destination,
    loadMedia: async sourceId =>
      sourceId === 111 ? { fake: sourceId } : null,
  });

  engine.PostEvent("music_test_play", 607, () => {});
  await tick();
  context.currentTime = 7;
  engine.Process();
  await tick();

  const failed = engine.GetStatus()[0].segments.find(segment =>
    segment.segmentId === SEGMENT_B);

  assert.equal(failed?.pending, 0);
  assert.equal(failed?.failedSources, 1);
  assert.equal(failed?.audibleSources, 0);
  assert.equal(engine.GetStatus()[0].state, "degraded");
});

test("a late music load that misses its authored window is reported and pruned", async () =>
{
  const context = FakeContext();
  const graph = fixtureGraph();
  const late = Deferred();

  graph.nodes[PLAYLIST].playlist = [
    {
      segmentId: 0,
      playlistItemId: 1,
      childCount: 2,
      rsType: 0,
      loop: 1,
      loopMin: 0,
      loopMax: 0,
      weight: 1,
      avoidRepeatCount: 0,
      usingWeight: false,
      shuffle: false,
    },
    {
      segmentId: SEGMENT_A,
      playlistItemId: 2,
      childCount: 0,
      rsType: -1,
      loop: 1,
      loopMin: 0,
      loopMax: 0,
      weight: 1,
      avoidRepeatCount: 0,
      usingWeight: false,
      shuffle: false,
    },
    {
      segmentId: SEGMENT_B,
      playlistItemId: 3,
      childCount: 0,
      rsType: -1,
      loop: 1,
      loopMin: 0,
      loopMax: 0,
      weight: 1,
      avoidRepeatCount: 0,
      usingWeight: false,
      shuffle: false,
    },
  ];
  const engine = new CjsMusicEngine({
    graph,
    context,
    destination: context.destination,
    loadMedia: sourceId =>
      sourceId === 222 ? late.promise : Promise.resolve({ fake: sourceId }),
  });

  engine.PostEvent("music_test_play", 608, () => {});
  await tick();
  context.currentTime = 7;
  engine.Process();
  await tick();
  context.currentTime = 13;
  late.resolve({ fake: 222 });
  await tick();

  const missed = engine.GetStatus()[0].segments.find(segment =>
    segment.segmentId === SEGMENT_B);

  assert.equal(missed?.pendingSources, 0);
  assert.equal(missed?.missedSources, 1);
  assert.equal(missed?.audibleSources, 0);
  assert.equal(engine.GetStatus()[0].state, "degraded");
  assert.equal(
    context.sources.some(source => source.buffer?.fake === 222),
    false,
    "expired media never creates a WebAudio source",
  );
  const segmentGain = context.gains.find(gain =>
    gain !== context.gains[0]
    && gain !== context.gains[1]
    && !gain.disconnected
    && gain.connectedTo === context.gains[1]);

  context.currentTime = 15;
  engine.Process();
  assert.equal(
    context.gains.filter(gain =>
      gain.connectedTo === context.gains[1]
      && !gain.disconnected).length,
    0,
    "expired segment gains are disconnected when pruned",
  );
  assert.ok(segmentGain, "the test observed at least one live segment gain");
});

test("an ended source disconnects and cannot extend an exhausted segment", async () =>
{
  const context = FakeContext();
  const graph = fixtureGraph();
  const finished = [];

  graph.eventTargets.music_direct_play = [ SEGMENT_B ];
  graph.nodes[TRACK_B].clips[0].srcDuration = 10000;
  const engine = new CjsMusicEngine({
    graph,
    context,
    destination: context.destination,
    loadMedia: async sourceId => ({ fake: sourceId }),
  });

  engine.PostEvent("music_direct_play", 609, () => finished.push(609));
  await tick();
  const source = context.sources[0];

  context.currentTime = 2;
  source.onended();
  assert.equal(source.disconnected, true);
  assert.equal(engine.GetStatus()[0].endedSources, 1);
  engine.Process();
  assert.equal(engine.GetStatus()[0].boundary, 4);
  assert.equal(engine.GetPlayingCount(), 1, "the authored exit boundary remains authoritative");

  context.currentTime = 4;
  engine.Process();
  assert.equal(engine.GetPlayingCount(), 0, "the ended source does not extend the instance to its predicted tail");
  assert.deepEqual(finished, [ 609 ]);
});

test("a WebAudio start failure is reported and disconnected", async () =>
{
  const context = FakeContext();
  const createBufferSource = context.createBufferSource;

  context.createBufferSource = () =>
  {
    const source = createBufferSource();

    source.start = () =>
    {
      throw new Error("start failed");
    };
    return source;
  };
  const engine = new CjsMusicEngine({
    graph: fixtureGraph(),
    context,
    destination: context.destination,
    loadMedia: async sourceId => ({ fake: sourceId }),
  });

  engine.PostEvent("music_test_play", 610, () => {});
  await tick();
  const status = engine.GetStatus()[0];

  assert.equal(status.failedSources, 1);
  assert.equal(status.pendingSources, 0);
  assert.equal(status.state, "degraded");
  assert.equal(context.sources[0].disconnected, true);
  assert.equal(context.sources[0].onended, null);
});


test("the looping playlist chains segment A at its exit-cue boundary, sample-accurately", async () =>
{
  const { context, engine } = Harness();
  engine.PostEvent("music_test_play", 502, () => {});
  await tick();
  // Boundary period = exit - entry = 8s. Advance near the horizon and tick.
  context.currentTime = 7;
  engine.Process();
  await tick();
  assert.equal(context.sources.length >= 2, true, "next iteration scheduled within the lookahead");
  const second = context.sources[1];
  assert.equal(second.startedAt, 7, "past pre-entry start collapses to now");
  assert.equal(second.startOffset, 0);
});

test("playlist transition matrices apply authored source and destination fades", async () =>
{
  const context = FakeContext();
  const graph = PlaylistModeGraph({
    rsType: 0,
    loop: 1,
  });

  graph.nodes[900].rules = [ {
    srcIds: [ -1 ],
    dstIds: [ -1 ],
    src: {
      transitionTime: 500,
      fadeCurve: 4,
      fadeOffset: 0,
      syncType: 7,
      playPostExit: false,
    },
    dst: {
      transitionTime: 500,
      fadeCurve: 4,
      fadeOffset: 0,
      playPreEntry: false,
    },
    transitionSegment: null,
  } ];
  const engine = new CjsMusicEngine({
    graph,
    context,
    destination: context.destination,
    loadMedia: async sourceId => ({ fake: sourceId }),
  });

  engine.PostEvent("play", 991, () => {});
  await tick();

  const [ source, destination ] = context.sources;

  assert.equal(source.stoppedAt, 1);
  assert.deepEqual(
    source.connectedTo.gain.sets,
    [ [ 1, 0.5 ] ],
  );
  assert.deepEqual(
    source.connectedTo.gain.ramps,
    [ [ 0, 1 ] ],
  );
  assert.equal(destination.startedAt, 1);
  assert.deepEqual(
    destination.connectedTo.gain.sets,
    [ [ 0, 1 ] ],
  );
  assert.deepEqual(
    destination.connectedTo.gain.ramps,
    [ [ 1, 1.5 ] ],
  );
});

test("browser pause overrides a future authored fade and retains the audible item", async () =>
{
  const context = FakeContext();
  const graph = PlaylistModeGraph({ rsType: 0, loop: 1 });

  graph.nodes[900].rules = [ {
    srcIds: [ -1 ],
    dstIds: [ -1 ],
    src: {
      transitionTime: 500,
      fadeCurve: 4,
      fadeOffset: 0,
      syncType: 7,
      playPostExit: false,
    },
    dst: {
      transitionTime: 0,
      fadeCurve: 4,
      fadeOffset: 0,
      playPreEntry: false,
    },
    transitionSegment: null,
  } ];
  const engine = new CjsMusicEngine({
    graph,
    context,
    destination: context.destination,
    loadMedia: async sourceId => ({ fake: sourceId }),
  });

  engine.PostEvent("play", 1204, () => {});
  await tick();
  assert.equal(context.sources[0].stoppedAt, 1);

  assert.equal(engine.PauseTransport(1204), true);
  assert.equal(context.sources[0].stoppedAt, 0.03);
  const beforeResume = context.sources.length;
  assert.equal(engine.ResumeTransport(1204), true);
  await tick();
  assert.equal(
    context.sources.slice(beforeResume)
      .find(source => source.buffer.fake === 1000).buffer.fake,
    1000,
    "resume restarts the item audible at pause, not the lookahead successor",
  );
});

test("authored music Pause and Resume preserve offsets, depth, and game-object scope", async () =>
{
  const { context, engine } = Harness(graph =>
  {
    graph.programs = {
      music_authored_pause: [ {
        kind: "pause", targetId: String(SWITCH), targetFlags: 0,
        scope: "game-object", mode: "element", curve: 5,
        actionFlags: 7, exceptions: [], transitionMs: 1000,
      } ],
      music_authored_resume: [ {
        kind: "resume", targetId: String(SWITCH), targetFlags: 0,
        scope: "game-object", mode: "element", curve: 4,
        actionFlags: 6, exceptions: [], transitionMs: 2000,
      } ],
    };
  });

  engine.PostEvent("music_test_play", 1301, () => {}, { gameObjID: 11 });
  engine.PostEvent("music_test_play", 1302, () => {}, { gameObjID: 22 });
  await tick();
  const first = context.sources[0];
  const second = context.sources[1];

  context.currentTime = 2;
  assert.equal(
    engine.PostEvent(
      "music_authored_pause",
      1303,
      () => {},
      { gameObjID: 11 },
    ),
    false,
  );
  assert.equal(
    engine.GetStatus().find(value => value.playingID === 1301).state,
    "pausing",
  );
  assert.equal(
    first.stoppedAt,
    3,
    "music advances until the future audio-clock Pause boundary",
  );

  context.currentTime = 3;
  engine.Process();
  assert.equal(first.stoppedAt, 3, "the carrier freezes at fade completion");
  assert.equal(second.stoppedAt, null, "another game object is unaffected");
  assert.equal(
    engine.GetStatus().find(value => value.playingID === 1301).state,
    "paused",
  );

  context.currentTime = 8;
  engine.Process();
  assert.equal(
    engine.GetStatus().find(value => value.playingID === 1301)
      .scheduledSources > 0,
    true,
    "a long pause does not prune the retained timeline",
  );

  engine.PostEvent(
    "music_authored_pause",
    1304,
    () => {},
    { gameObjID: 11 },
  );
  engine.PostEvent(
    "music_authored_resume",
    1305,
    () => {},
    { gameObjID: 11 },
  );
  assert.equal(
    engine.GetStatus().find(value => value.playingID === 1301).state,
    "paused",
    "one Resume does not release two nested Pauses",
  );

  context.currentTime = 10;
  engine.PostEvent(
    "music_authored_resume",
    1306,
    () => {},
    { gameObjID: 11 },
  );
  const resumed = context.sources.find(source =>
    source !== first && source !== second
      && source.buffer.fake === 111);

  assert.equal(resumed.startedAt, 10);
  assert.equal(resumed.startOffset, 4, "Resume continues the retained media offset");
  assert.equal(resumed.startDuration, 6);
  assert.equal(
    engine.GetStatus().find(value => value.playingID === 1301).boundary,
    15,
    "the live playlist boundary shifts by only the frozen duration",
  );
});

test("authored Resume during a Pause fade cancels the pending freeze", async () =>
{
  const { context, engine } = Harness(graph =>
  {
    graph.programs = {
      pause: [ {
        kind: "pause", targetId: "0", targetFlags: 0,
        scope: "game-object", mode: "all", curve: 5,
        actionFlags: 7, exceptions: [], transitionMs: 7000,
      } ],
      resume: [ {
        kind: "resume", targetId: "0", targetFlags: 0,
        scope: "game-object", mode: "all", curve: 5,
        actionFlags: 6, exceptions: [], transitionMs: 10000,
      } ],
    };
  });

  engine.PostEvent("music_test_play", 1310, () => {}, { gameObjID: 44 });
  await tick();
  const source = context.sources[0];

  context.currentTime = 2;
  engine.PostEvent("pause", 1311, () => {}, { gameObjID: 44 });
  context.currentTime = 4;
  engine.PostEvent("resume", 1312, () => {}, { gameObjID: 44 });
  context.currentTime = 12;
  engine.Process();
  await tick();

  assert.equal(source.stoppedAt, null);
  assert.equal(context.sources.length, 2, "normal lookahead is not a resume restart");
  assert.equal(engine.GetStatus()[0].authoredPauseDepth, 0);
  assert.notEqual(engine.GetStatus()[0].state, "paused");
});

test("overdue authored Resume freezes at the audio-clock boundary without a render tick", async () =>
{
  const { context, engine } = Harness(graph =>
  {
    graph.programs = {
      pause: [ {
        kind: "pause", targetId: "0", targetFlags: 0,
        scope: "game-object", mode: "all", curve: 4,
        actionFlags: 7, exceptions: [], transitionMs: 1000,
      } ],
      resume: [ {
        kind: "resume", targetId: "0", targetFlags: 0,
        scope: "game-object", mode: "all", curve: 4,
        actionFlags: 6, exceptions: [], transitionMs: 0,
      } ],
    };
  });

  engine.PostEvent("music_test_play", 1315, () => {}, { gameObjID: 45 });
  await tick();
  const first = context.sources[0];

  context.currentTime = 2;
  engine.PostEvent("pause", 1316, () => {}, { gameObjID: 45 });
  assert.equal(first.stoppedAt, 3, "the carrier stop is armed immediately");

  context.currentTime = 8;
  first.onended?.();
  engine.PostEvent("resume", 1317, () => {}, { gameObjID: 45 });
  const resumed = context.sources.at(-1);

  assert.equal(resumed.startedAt, 8);
  assert.equal(resumed.startOffset, 4);
  assert.equal(resumed.startDuration, 6);
  assert.equal(engine.GetStatus()[0].boundary, 13);
});

test("music decisions remain live until an authored Pause fade completes", async () =>
{
  const { context, engine } = Harness(graph =>
  {
    graph.programs = {
      pause: [ {
        kind: "pause", targetId: "0", targetFlags: 0,
        scope: "game-object", mode: "all", curve: 5,
        actionFlags: 7, exceptions: [], transitionMs: 5000,
      } ],
    };
  });

  engine.PostEvent("music_test_play", 1318, () => {}, { gameObjID: 46 });
  await tick();
  context.currentTime = 2;
  engine.PostEvent("pause", 1319, () => {}, { gameObjID: 46 });
  context.currentTime = 3;
  engine.SetSwitch(GROUP, COMBAT);
  await tick();
  await tick();

  assert.equal(engine.GetStatus()[0].state, "pausing");
  assert.equal(engine.GetStatus()[0].resolvedTargetId, SEGMENT_B);
  assert.equal(
    context.sources.some(source => source.buffer.fake === 222),
    true,
    "a switch transition can prepare and schedule before the fade edge",
  );
  assert.equal(
    context.sources[0].stoppedAt,
    7,
    "a later transition fade cannot move the armed carrier past Pause",
  );
});

test("an overdue setter cannot cross an authored Pause boundary", async () =>
{
  const { context, engine } = Harness(graph =>
  {
    graph.programs = {
      pause: [ {
        kind: "pause", targetId: "0", targetFlags: 0,
        scope: "game-object", mode: "all", curve: 4,
        actionFlags: 7, exceptions: [], transitionMs: 1000,
      } ],
      resume: [ {
        kind: "resume", targetId: "0", targetFlags: 0,
        scope: "game-object", mode: "all", curve: 4,
        actionFlags: 6, exceptions: [], transitionMs: 0,
      } ],
    };
    graph.switchSetters.delayed_combat = [ {
      kind: "switch",
      groupId: GROUP,
      targetId: COMBAT,
      delayMs: 2000,
    } ];
  });

  engine.PostEvent("music_test_play", 1323, () => {}, { gameObjID: 58 });
  await tick();
  engine.PostEvent("delayed_combat", 1324, () => {});
  engine.PostEvent("pause", 1325, () => {}, { gameObjID: 58 });
  context.currentTime = 3;
  engine.Process();
  await tick();

  assert.equal(engine.GetStatus()[0].state, "paused");
  assert.equal(engine.GetStatus()[0].resolvedTargetId, PLAYLIST);
  assert.equal(
    context.sources.some(source => source.buffer.fake === 222),
    false,
    "the overdue setter is retained for Resume instead of mutating frozen music",
  );

  engine.PostEvent("resume", 1326, () => {}, { gameObjID: 58 });
  await tick();
  await tick();
  assert.equal(engine.GetStatus()[0].resolvedTargetId, SEGMENT_B);
});

test("music media resolving while authored-paused stays silent until Resume", async () =>
{
  const loading = Deferred();
  const { context, engine } = Harness(graph =>
  {
    graph.programs = {
      pause: [ {
        kind: "pause", targetId: String(SWITCH), targetFlags: 0,
        scope: "game-object", mode: "element", curve: 4,
        actionFlags: 7, exceptions: [], transitionMs: 0,
      } ],
      resume: [ {
        kind: "resume", targetId: String(SWITCH), targetFlags: 0,
        scope: "game-object", mode: "element", curve: 4,
        actionFlags: 6, exceptions: [], transitionMs: 0,
      } ],
    };
  }, {
    loadMedia: () => loading.promise,
  });

  engine.PostEvent("music_test_play", 1320, () => {}, { gameObjID: 55 });
  engine.PostEvent("pause", 1321, () => {}, { gameObjID: 55 });
  loading.resolve({ fake: 111 });
  await tick();
  await tick();

  assert.equal(context.sources.length, 0);
  assert.equal(engine.GetStatus()[0].state, "paused");

  context.currentTime = 5;
  engine.PostEvent("resume", 1322, () => {}, { gameObjID: 55 });
  await tick();
  await tick();

  assert.equal(context.sources.length, 1);
  assert.equal(context.sources[0].startedAt, 5);
  assert.equal(context.sources[0].startOffset, 1);
});

test("music switch changes made while authored-paused commit only after Resume", async () =>
{
  const { context, engine } = Harness(graph =>
  {
    graph.programs = {
      pause: [ {
        kind: "pause", targetId: String(SWITCH), targetFlags: 0,
        scope: "game-object", mode: "element", curve: 4,
        actionFlags: 7, exceptions: [], transitionMs: 0,
      } ],
      resume: [ {
        kind: "resume", targetId: String(SWITCH), targetFlags: 0,
        scope: "game-object", mode: "element", curve: 4,
        actionFlags: 6, exceptions: [], transitionMs: 0,
      } ],
    };
  });

  engine.PostEvent("music_test_play", 1325, () => {}, { gameObjID: 56 });
  await tick();
  assert.equal(engine.GetStatus()[0].resolvedTargetId, PLAYLIST);

  context.currentTime = 2;
  engine.PostEvent("pause", 1326, () => {}, { gameObjID: 56 });
  engine.SetSwitch(GROUP, COMBAT);
  await tick();

  assert.equal(engine.GetStatus()[0].resolvedTargetId, PLAYLIST);
  assert.equal(
    context.sources.some(source => source.buffer.fake === 222),
    false,
    "the new branch does not prepare or schedule while frozen",
  );

  context.currentTime = 5;
  engine.PostEvent("resume", 1327, () => {}, { gameObjID: 56 });
  await tick();
  await tick();

  assert.equal(engine.GetStatus()[0].resolvedTargetId, SEGMENT_B);
  assert.equal(
    context.sources.some(source => source.buffer.fake === 222),
    true,
    "Resume applies the latest switch value against the shifted timeline",
  );
});

test("authored Pause retains a pinned random transition preparation", async () =>
{
  const RANDOM_TARGET = 500;
  const graph = fixtureGraph();
  const context = FakeContext();
  const pending = Deferred();
  const reads = [];
  let randomCalls = 0;

  graph.nodes[RANDOM_TARGET] = {
    type: "music-playlist-container",
    playlist: [
      {
        segmentId: 0, playlistItemId: 500, childCount: 2,
        rsType: 3, loop: 1, loopMin: 0, loopMax: 0,
        weight: 1, avoidRepeatCount: 0, usingWeight: true,
        shuffle: false,
      },
      {
        segmentId: SEGMENT_A, playlistItemId: 501, childCount: 0,
        rsType: -1, loop: 1, loopMin: 0, loopMax: 0,
        weight: 1, avoidRepeatCount: 0, usingWeight: false,
        shuffle: false,
      },
      {
        segmentId: SEGMENT_B, playlistItemId: 502, childCount: 0,
        rsType: -1, loop: 1, loopMin: 0, loopMax: 0,
        weight: 1, avoidRepeatCount: 0, usingWeight: false,
        shuffle: false,
      },
    ],
  };
  graph.nodes[SWITCH].treeNodes.find(node =>
    node.key === COMBAT).audioNodeId = RANDOM_TARGET;
  graph.programs = {
    pause: [ {
      kind: "pause", targetId: "0", targetFlags: 0,
      scope: "game-object", mode: "all", curve: 4,
      actionFlags: 7, exceptions: [], transitionMs: 0,
    } ],
    resume: [ {
      kind: "resume", targetId: "0", targetFlags: 0,
      scope: "game-object", mode: "all", curve: 4,
      actionFlags: 6, exceptions: [], transitionMs: 0,
    } ],
  };
  const engine = new CjsMusicEngine({
    graph,
    context,
    destination: context.destination,
    loadMedia: sourceId =>
    {
      reads.push(sourceId);
      return sourceId === 222
        ? pending.promise
        : Promise.resolve({ fake: sourceId });
    },
    random: () => (randomCalls++, 0.99),
  });

  engine.PostEvent("music_test_play", 1328, () => {}, { gameObjID: 57 });
  await tick();
  engine.PostEvent("music_switch_combat", 1329, () => {});
  await tick();
  engine.PostEvent("pause", 1330, () => {}, { gameObjID: 57 });
  pending.resolve({ fake: 222 });
  await tick();
  await tick();

  assert.equal(engine.GetStatus()[0].state, "paused");
  assert.equal(randomCalls, 1);
  assert.deepEqual(reads, [ 111, 222 ]);

  context.currentTime = 5;
  engine.PostEvent("resume", 1331, () => {}, { gameObjID: 57 });

  assert.equal(engine.GetStatus()[0].resolvedTargetId, RANDOM_TARGET);
  assert.equal(context.sources.at(-1).buffer.fake, 222);
  assert.equal(randomCalls, 1, "Resume does not reroll the pinned branch");
  assert.deepEqual(reads, [ 111, 222 ], "prepared media is not acquired twice");
});

test("authored Pause retains layered clips and active transition progress", async () =>
{
  const context = FakeContext();
  const graph = PlaylistModeGraph({
    rsType: 0,
    loop: 1,
    segments: [ 910, 920 ],
  });

  graph.nodes[900].rules = [ {
    srcIds: [ -1 ], dstIds: [ -1 ],
    src: {
      transitionTime: 500, fadeCurve: 4, fadeOffset: 0,
      syncType: 7, playPostExit: false,
    },
    dst: {
      transitionTime: 500, fadeCurve: 4, fadeOffset: 0,
      playPreEntry: false,
    },
    transitionSegment: null,
  } ];
  graph.programs = {
    pause: [ {
      kind: "pause", targetId: "0", targetFlags: 0,
      scope: "game-object", mode: "all", curve: 4,
      actionFlags: 7, exceptions: [], transitionMs: 0,
    } ],
    resume: [ {
      kind: "resume", targetId: "0", targetFlags: 0,
      scope: "game-object", mode: "all", curve: 4,
      actionFlags: 6, exceptions: [], transitionMs: 0,
    } ],
  };
  const engine = new CjsMusicEngine({
    graph,
    context,
    destination: context.destination,
    loadMedia: async sourceId => ({ fake: sourceId }),
  });

  engine.PostEvent("play", 1330, () => {}, { gameObjID: 66 });
  await tick();
  context.currentTime = 0.75;
  engine.PostEvent("pause", 1331, () => {}, { gameObjID: 66 });
  assert.equal(context.sources[0].stoppedAt, 0.75);
  assert.equal(context.sources[1].stoppedAt, 0.75);

  context.currentTime = 5;
  engine.PostEvent("resume", 1332, () => {}, { gameObjID: 66 });
  const resumedSource = context.sources[2];
  const resumedDestination = context.sources[3];

  assert.equal(resumedSource.startedAt, 5);
  assert.equal(resumedSource.startOffset, 0.75);
  assert.equal(resumedSource.startDuration, 0.25);
  assert.equal(resumedSource.stoppedAt, 5.25);
  assert.equal(resumedDestination.startedAt, 5.25);
  assert.equal(resumedDestination.startOffset, 0);
  assert.deepEqual(
    resumedDestination.connectedTo.gain.ramps.at(-1),
    [ 1, 5.75 ],
    "the destination fade resumes from the same musical boundary",
  );
});

test("an authored Pause prequeues a short playlist through its fade boundary", async () =>
{
  const context = FakeContext();
  const graph = PlaylistModeGraph({ rsType: 0, loop: 0 });

  graph.programs = {
    pause: [ {
      kind: "pause", targetId: "0", targetFlags: 0,
      scope: "game-object", mode: "all", curve: 5,
      actionFlags: 7, exceptions: [], transitionMs: 7000,
    } ],
  };
  const engine = new CjsMusicEngine({
    graph,
    context,
    destination: context.destination,
    loadMedia: async sourceId => ({ fake: sourceId }),
  });

  engine.PostEvent("play", 1335, () => {}, { gameObjID: 67 });
  await tick();
  engine.PostEvent("pause", 1336, () => {}, { gameObjID: 67 });
  await tick();
  await tick();

  assert.equal(
    Math.max(...context.sources.map(source => source.startedAt)) >= 7,
    true,
    "audio-clock starts cover the fade even without another Process call",
  );
  assert.equal(
    Math.max(...context.sources.map(source => source.startedAt)) > 7,
    true,
    "lookahead also covers sources whose transition lead-in begins at the edge",
  );
  assert.equal(
    context.sources
      .filter(source => source.startedAt + source.startDuration > 7)
      .every(source => source.stoppedAt === 7),
    true,
    "every carrier crossing the fade edge is armed to freeze there",
  );
});

test("a playlist prepared during a Pause fade extends through its audible edge", async () =>
{
  const context = FakeContext();
  const graph = PlaylistModeGraph({ rsType: 0, loop: 0 });
  const loading = Deferred();

  graph.programs = {
    pause: [ {
      kind: "pause", targetId: "0", targetFlags: 0,
      scope: "game-object", mode: "all", curve: 5,
      actionFlags: 7, exceptions: [], transitionMs: 7000,
    } ],
  };
  const engine = new CjsMusicEngine({
    graph,
    context,
    destination: context.destination,
    loadMedia: () => loading.promise,
  });

  engine.PostEvent("play", 1337, () => {}, { gameObjID: 68 });
  engine.PostEvent("pause", 1338, () => {}, { gameObjID: 68 });
  loading.resolve({ fake: 1000 });
  await tick();
  await tick();

  assert.equal(engine.GetStatus()[0].state, "pausing");
  assert.equal(
    Math.max(...context.sources.map(source => source.startedAt)) > 7,
    true,
    "an async commit reruns proactive audio-clock prequeueing",
  );
  assert.equal(
    context.sources
      .filter(source => source.startedAt + source.startDuration > 7)
      .every(source => source.stoppedAt === 7),
    true,
  );
});

test("playlist scheduling expands its lookahead for long authored fades", async () =>
{
  const context = FakeContext();
  const graph = PlaylistModeGraph({
    rsType: 0,
    loop: 1,
    segments: [ 910, 920 ],
  });

  graph.nodes[910].duration = 12000;
  graph.nodes[910].markers[1].position = 12000;
  graph.nodes[911].clips[0].srcDuration = 12000;
  graph.nodes[900].rules = [ {
    srcIds: [ -1 ],
    dstIds: [ -1 ],
    src: {
      transitionTime: 10000,
      fadeCurve: 4,
      fadeOffset: 0,
      syncType: 7,
      playPostExit: false,
    },
    dst: {
      transitionTime: 0,
      fadeCurve: 4,
      fadeOffset: 0,
      playPreEntry: true,
    },
    transitionSegment: null,
  } ];
  const engine = new CjsMusicEngine({
    graph,
    context,
    destination: context.destination,
    loadMedia: async sourceId => ({ fake: sourceId }),
  });

  engine.PostEvent("play", 992, () => {});
  await tick();
  context.currentTime = 2;
  engine.Process();
  await tick();

  assert.equal(
    context.sources.length,
    2,
    "the next segment is queued early enough to begin a ten-second fade",
  );
  assert.deepEqual(
    context.sources[0].connectedTo.gain.sets,
    [ [ 1, 2 ] ],
  );
  assert.deepEqual(
    context.sources[0].connectedTo.gain.ramps,
    [ [ 0, 12 ] ],
  );
});


test("exit-cue transitions use the current segment, not the lookahead frontier", async () =>
{
  const { context, engine } = Harness();

  engine.PostEvent("music_test_play", 508, () => {});
  await tick();

  context.currentTime = 6.6;
  engine.Process();
  await tick();
  assert.equal(
    engine.GetStatus()[0].boundary,
    16,
    "lookahead has already advanced beyond the current segment",
  );

  engine.PostEvent("music_switch_combat", 509, () => {});
  await tick();

  const destination = context.sources.find(source =>
    source.buffer?.fake === 222);

  assert.equal(
    destination?.startedAt,
    8,
    "the destination enters at A1's exit rather than after queued A2",
  );
});

test("playlist traversal preserves all four authored Wwise play modes", async () =>
{
  assert.deepEqual(
    await PlayPlaylistMode({ rsType: 0, loop: 1 }, []),
    [ 1000, 1001 ],
    "Sequence Continuous plays the complete group in order",
  );
  assert.deepEqual(
    await PlayPlaylistMode({ rsType: 1, loop: 2 }, [ 0.99, 0.99 ]),
    [ 1000, 1001 ],
    "Sequence Step advances rather than choosing a random child",
  );
  assert.deepEqual(
    await PlayPlaylistMode({ rsType: 2, loop: 1 }, [ 0.99, 0 ]),
    [ 1001, 1000 ],
    "Random Continuous makes one random choice per child slot",
  );
  assert.deepEqual(
    await PlayPlaylistMode({ rsType: 3, loop: 2 }, [ 0.99, 0 ]),
    [ 1001, 1000 ],
    "Random Step makes one random choice per authored loop",
  );
});

test("browser transport steps and randomizes audio inside one authored playlist", async () =>
{
  const context = FakeContext();
  const graph = PlaylistModeGraph({ rsType: 0, loop: 0 });
  const engine = new CjsMusicEngine({
    graph,
    context,
    destination: context.destination,
    loadMedia: async sourceId => ({ fake: sourceId }),
    random: () => 0,
  });

  engine.PostEvent("play", 1200, () => {});
  await tick();

  assert.deepEqual(engine.GetTransportCapabilities(1200), {
    active: true,
    preparing: false,
    paused: false,
    canPause: true,
    canResume: false,
    canPrevious: true,
    canNext: true,
    canRandom: true,
    choiceCount: 2,
  });

  const beforeNext = context.sources.length;
  assert.equal(engine.StepTransport(1200, 1), true);
  await tick();
  assert.equal(context.sources[beforeNext].buffer.fake, 1001);
  assert.equal(engine.GetPlayingCount(), 1, "the posted event remains live");

  const beforePrevious = context.sources.length;
  assert.equal(engine.StepTransport(1200, -1), true);
  await tick();
  assert.equal(
    context.sources.slice(beforePrevious)
      .find(source => source.buffer.fake === 1000).buffer.fake,
    1000,
  );

  const beforeRandom = context.sources.length;
  assert.equal(engine.RandomTransport(1200), true);
  await tick();
  assert.equal(
    context.sources.slice(beforeRandom)
      .find(source => source.buffer.fake === 1001).buffer.fake,
    1001,
  );
});

test("browser transport pauses and resumes the current authored item", async () =>
{
  const { context, engine } = Harness();

  engine.PostEvent("music_test_play", 1201, () => {});
  await tick();

  const fixedCapabilities = engine.GetTransportCapabilities(1201);
  assert.equal(fixedCapabilities.choiceCount, 1);
  assert.equal(fixedCapabilities.canPrevious, false);
  assert.equal(fixedCapabilities.canNext, false);
  assert.equal(fixedCapabilities.canRandom, false);

  assert.equal(engine.PauseTransport(1201), true);
  assert.equal(engine.GetStatus()[0].state, "paused");
  assert.equal(engine.GetTransportCapabilities(1201).canResume, true);
  assert.equal(context.sources[0].stoppedAt, 0.03);

  const beforeResume = context.sources.length;
  assert.equal(engine.ResumeTransport(1201), true);
  await tick();
  assert.equal(context.sources[beforeResume].buffer.fake, 111);
  assert.equal(engine.GetStatus()[0].paused, false);
  assert.equal(engine.GetPlayingCount(), 1);
});

test("browser transport exposes authored random and sequence subtracks", async () =>
{
  const context = FakeContext();
  const graph = PlaylistModeGraph({
    rsType: 0,
    loop: 1,
    segments: [ 910 ],
  });
  const track = graph.nodes[911];

  track.trackType = 1;
  track.subTrackCount = 3;
  track.clips = [ 0, 1, 2 ].map(subTrack => ({
    ...track.clips[0],
    trackId: subTrack,
    sourceId: 1000 + subTrack,
  }));
  graph.nodes[910].children.push(912);
  graph.nodes[912] = {
    ...track,
    subTrackCount: 2,
    clips: [ 0, 1 ].map(subTrack => ({
      ...track.clips[0],
      trackId: subTrack,
      sourceId: 2000 + subTrack,
    })),
  };
  const engine = new CjsMusicEngine({
    graph,
    context,
    destination: context.destination,
    loadMedia: async sourceId => ({ fake: sourceId }),
    random: () => 0,
  });

  engine.PostEvent("play", 1202, () => {});
  await tick();
  assert.equal(
    engine.GetTransportCapabilities(1202).choiceCount,
    3,
    "layered random tracks use a bounded traversal, not a Cartesian product",
  );

  const beforeStep = context.sources.length;
  assert.equal(engine.StepTransport(1202, 1), true);
  await tick();
  const stepped = context.sources.slice(beforeStep);
  const steppedAt = Math.min(...stepped.map(source => source.startedAt));
  assert.deepEqual(
    stepped.filter(source => source.startedAt === steppedAt)
      .map(source => source.buffer.fake)
      .sort((left, right) => left - right),
    [ 1001, 2001 ],
  );
});

test("browser transport keeps current audio when a selected item cannot load", async () =>
{
  const context = FakeContext();
  const graph = PlaylistModeGraph({
    rsType: 0,
    loop: 1,
    segments: [ 910 ],
  });
  const track = graph.nodes[911];

  track.trackType = 1;
  track.subTrackCount = 2;
  track.clips = [ 0, 1 ].map(subTrack => ({
    ...track.clips[0],
    trackId: subTrack,
    sourceId: 1000 + subTrack,
  }));
  const engine = new CjsMusicEngine({
    graph,
    context,
    destination: context.destination,
    loadMedia: async sourceId => sourceId === 1000
      ? { fake: sourceId }
      : null,
    random: () => 0,
  });

  engine.PostEvent("play", 1205, () => {});
  await tick();
  assert.equal(engine.StepTransport(1205, 1), true);
  await tick();
  await tick();

  assert.equal(context.sources.length, 1);
  assert.equal(context.sources[0].stoppedAt, null);
});

test("rapid browser transport steps accumulate while media is preparing", async () =>
{
  const context = FakeContext();
  const graph = PlaylistModeGraph({
    rsType: 0,
    loop: 1,
    segments: [ 910 ],
  });
  const track = graph.nodes[911];
  const middle = Deferred();

  track.trackType = 1;
  track.subTrackCount = 3;
  track.clips = [ 0, 1, 2 ].map(subTrack => ({
    ...track.clips[0],
    trackId: subTrack,
    sourceId: 1000 + subTrack,
  }));
  const engine = new CjsMusicEngine({
    graph,
    context,
    destination: context.destination,
    loadMedia: sourceId => sourceId === 1001
      ? middle.promise
      : Promise.resolve({ fake: sourceId }),
    random: () => 0,
  });

  engine.PostEvent("play", 1207, () => {});
  await tick();
  assert.equal(engine.StepTransport(1207, 1), true);
  assert.equal(engine.StepTransport(1207, 1), true);
  await tick();
  await tick();
  assert.equal(
    context.sources.some(source => source.buffer?.fake === 1002),
    true,
  );

  middle.resolve({ fake: 1001 });
  await tick();
  await tick();
  assert.equal(
    context.sources.some(source => source.buffer?.fake === 1001),
    false,
    "the superseded pending selection never commits",
  );
});

test("multi-root transport commits only after every selected layer is ready", async () =>
{
  const context = FakeContext();
  const delayed = Deferred();
  const nodes = {};

  for (const [ segmentId, trackId, sourceBase ] of [
    [ 100, 101, 1000 ],
    [ 200, 201, 2000 ],
  ])
  {
    nodes[segmentId] = {
      type: "music-segment",
      duration: 1000,
      markers: [ { position: 0 }, { position: 1000 } ],
      children: [ trackId ],
    };
    nodes[trackId] = {
      type: "music-track",
      trackType: 1,
      subTrackCount: 2,
      clips: [ 0, 1 ].map(subTrack => ({
        trackId: subTrack,
        sourceId: sourceBase + subTrack,
        playAt: 0,
        beginTrimOffset: 0,
        endTrimOffset: 0,
        srcDuration: 1000,
      })),
    };
  }
  const engine = new CjsMusicEngine({
    graph: {
      nodes,
      eventTargets: { play: [ 100, 200 ] },
      eventStops: {},
      switchSetters: {},
    },
    context,
    destination: context.destination,
    loadMedia: sourceId => sourceId === 2001
      ? delayed.promise
      : Promise.resolve({ fake: sourceId }),
    random: () => 0,
  });

  engine.PostEvent("play", 1208, () => {});
  await tick();
  assert.equal(engine.StepTransport(1208, 1), true);
  await tick();
  assert.deepEqual(
    context.sources.map(source => source.buffer.fake).sort(),
    [ 1000, 2000 ],
    "no layer changes while a sibling selection is loading",
  );
  assert.equal(context.sources[0].stoppedAt, null);
  assert.equal(context.sources[1].stoppedAt, null);

  let commitClock = 4;
  Object.defineProperty(context, "currentTime", {
    configurable: true,
    get: () => (commitClock += 0.001),
  });
  delayed.resolve({ fake: 2001 });
  await tick();
  await tick();
  assert.deepEqual(
    context.sources.slice(2)
      .map(source => source.buffer.fake)
      .sort(),
    [ 1001, 2001 ],
  );
  assert.equal(context.sources[2].startedAt, context.sources[3].startedAt);
  assert.ok(context.sources[2].startedAt > 4);
});

test("browser pause cancels a pending switch transition until resume", async () =>
{
  const context = FakeContext();
  const graph = fixtureGraph();
  const destination = Deferred();
  const engine = new CjsMusicEngine({
    graph,
    context,
    destination: context.destination,
    loadMedia: sourceId => sourceId === 222
      ? destination.promise
      : Promise.resolve({ fake: sourceId }),
  });

  engine.PostEvent("music_test_play", 1206, () => {});
  await tick();
  engine.SetSwitch(GROUP, COMBAT);
  assert.equal(engine.GetStatus()[0].preparingTargetId, SEGMENT_B);
  assert.equal(engine.PauseTransport(1206), true);

  destination.resolve({ fake: 222 });
  await tick();
  await tick();
  assert.equal(engine.GetStatus()[0].state, "paused");
  assert.equal(
    context.sources.some(source => source.buffer?.fake === 222),
    false,
  );

  assert.equal(engine.ResumeTransport(1206), true);
  await tick();
  await tick();
  assert.equal(
    context.sources.some(source => source.buffer?.fake === 222),
    true,
    "resume reevaluates the latest switch value",
  );
});

test("browser pause retains an independently selected layered-track combination", async () =>
{
  const context = FakeContext();
  const delayed = Deferred();
  const graph = PlaylistModeGraph({
    rsType: 0,
    loop: 1,
    segments: [ 910 ],
  });
  const track = graph.nodes[911];

  track.trackType = 1;
  track.subTrackCount = 3;
  track.clips = [ 0, 1, 2 ].map(subTrack => ({
    ...track.clips[0],
    trackId: subTrack,
    sourceId: 1000 + subTrack,
  }));
  graph.nodes[910].children.push(912);
  graph.nodes[912] = {
    ...track,
    subTrackCount: 2,
    clips: [ 0, 1 ].map(subTrack => ({
      ...track.clips[0],
      trackId: subTrack,
      sourceId: 2000 + subTrack,
    })),
  };
  const samples = [ 0, 0 ];
  const engine = new CjsMusicEngine({
    graph,
    context,
    destination: context.destination,
    loadMedia: sourceId => sourceId === 2001
      ? delayed.promise
      : Promise.resolve({ fake: sourceId }),
    random: () => samples.shift() ?? 0,
  });

  engine.PostEvent("play", 1203, () => {});
  await tick();
  await tick();
  assert.deepEqual(
    context.sources.map(source => source.buffer.fake).sort(),
    [ 1000, 2000 ],
  );
  assert.equal(engine.PauseTransport(1203), true);
  assert.equal(engine.StepTransport(1203, 1), true);
  const beforeResume = context.sources.length;
  assert.equal(engine.ResumeTransport(1203), true);
  await tick();
  assert.equal(engine.GetTransportCapabilities(1203).preparing, true);
  assert.equal(engine.GetTransportCapabilities(1203).canResume, false);
  assert.equal(engine.StepTransport(1203, 1), false);
  assert.equal(engine.RandomTransport(1203), false);
  assert.equal(
    context.sources.length,
    beforeResume,
    "a resumed layer waits for every selected sibling buffer",
  );
  assert.equal(engine.GetStatus()[0].state, "paused");

  delayed.resolve({ fake: 2001 });
  await tick();
  await tick();
  const resumed = context.sources.slice(beforeResume);
  const resumedAt = Math.min(...resumed.map(source => source.startedAt));
  const immediate = resumed.filter(source => source.startedAt === resumedAt);
  assert.deepEqual(
    immediate.map(source => source.buffer.fake)
      .sort((left, right) => left - right),
    [ 1001, 2001 ],
  );
  assert.equal(immediate[0].startedAt, immediate[1].startedAt);
  assert.equal(engine.GetTransportCapabilities(1203).preparing, false);
  assert.equal(engine.GetStatus()[0].state, "playing");
});

test("switch input cancels a pending browser resume without leaving it stuck", async () =>
{
  const context = FakeContext();
  const graph = fixtureGraph();
  const resumedMedia = Deferred();
  let sourceALoads = 0;
  const engine = new CjsMusicEngine({
    graph,
    context,
    destination: context.destination,
    loadMedia: sourceId =>
    {
      if (sourceId !== 111) return Promise.resolve({ fake: sourceId });
      sourceALoads++;
      return sourceALoads === 1
        ? Promise.resolve({ fake: sourceId })
        : resumedMedia.promise;
    },
  });

  engine.PostEvent("music_test_play", 1209, () => {});
  await tick();
  await tick();
  assert.equal(engine.PauseTransport(1209), true);
  engine.ClearMedia();
  assert.equal(engine.ResumeTransport(1209), true);
  await tick();
  assert.equal(engine.GetTransportCapabilities(1209).preparing, true);

  engine.SetSwitch(GROUP, COMBAT);
  assert.equal(engine.GetTransportCapabilities(1209).preparing, false);
  assert.equal(engine.GetTransportCapabilities(1209).canResume, true);

  resumedMedia.resolve({ fake: 111 });
  await tick();
  await tick();
  assert.equal(engine.GetStatus()[0].state, "paused");
});

test("playlist shuffle exhausts its pool and loop-count randomization is bounded", async () =>
{
  assert.deepEqual(
    await PlayPlaylistMode({
      rsType: 3,
      loop: 4,
      shuffle: true,
      segments: [ 910, 920, 930 ],
    }, [ 0, 0, 0, 0 ]),
    [ 1000, 1001, 1002, 1000 ],
    "shuffle avoids repeats until every child has played",
  );
  assert.deepEqual(
    await PlayPlaylistMode({
      rsType: 0,
      loop: 2,
      loopMin: -1,
      loopMax: 1,
      segments: [ 910 ],
    }, [ 0.99 ]),
    [ 1000, 1000, 1000 ],
    "the sampled loop offset is added to the authored base count",
  );
});

test("sequence music tracks advance their selected subtrack per instance", async () =>
{
  const context = FakeContext();
  const graph = PlaylistModeGraph({
    rsType: 0,
    loop: 1,
    segments: [ 910 ],
  });
  const item = graph.nodes[900].playlist[1];
  const track = graph.nodes[911];

  item.loop = 2;
  track.trackType = 2;
  track.subTrackCount = 2;
  track.clips = [
    { ...track.clips[0], trackId: 0, sourceId: 1000 },
    { ...track.clips[0], trackId: 1, sourceId: 1001 },
  ];

  const engine = new CjsMusicEngine({
    graph,
    context,
    destination: context.destination,
    loadMedia: async sourceId => ({ fake: sourceId }),
  });

  engine.PostEvent("play", 991, () => {});
  await tick();
  context.currentTime = 1;
  engine.Process();
  await tick();

  assert.deepEqual(
    context.sources.map(source => source.buffer.fake),
    [ 1000, 1001 ],
  );
});

test("transition preparation pins one exact random playlist branch", async () =>
{
  const RANDOM_TARGET = 500;
  const graph = fixtureGraph();
  const context = FakeContext();
  const reads = [];
  const samples = [ 0.99, 0 ];
  let randomCalls = 0;

  graph.nodes[RANDOM_TARGET] = {
    type: "music-playlist-container",
    playlist: [
      {
        segmentId: 0,
        playlistItemId: 500,
        childCount: 2,
        rsType: 3,
        loop: 1,
        loopMin: 0,
        loopMax: 0,
        weight: 1,
        avoidRepeatCount: 0,
        usingWeight: true,
        shuffle: false,
      },
      {
        segmentId: SEGMENT_A,
        playlistItemId: 501,
        childCount: 0,
        rsType: -1,
        loop: 1,
        loopMin: 0,
        loopMax: 0,
        weight: 1,
        avoidRepeatCount: 0,
        usingWeight: false,
        shuffle: false,
      },
      {
        segmentId: SEGMENT_B,
        playlistItemId: 502,
        childCount: 0,
        rsType: -1,
        loop: 1,
        loopMin: 0,
        loopMax: 0,
        weight: 1,
        avoidRepeatCount: 0,
        usingWeight: false,
        shuffle: false,
      },
    ],
  };
  graph.nodes[SWITCH].treeNodes.find(node =>
    node.key === COMBAT).audioNodeId = RANDOM_TARGET;

  const engine = new CjsMusicEngine({
    graph,
    context,
    destination: context.destination,
    loadMedia: async sourceId =>
    {
      reads.push(sourceId);
      return sourceId === 222 ? null : { fake: sourceId };
    },
    random: () =>
    {
      randomCalls++;
      return samples.shift() ?? 0;
    },
  });

  engine.PostEvent("music_test_play", 700, () => {});
  await tick();
  const outgoing = context.sources[0];

  engine.PostEvent("music_switch_combat", 701, () => {});
  await tick();

  assert.deepEqual(reads, [ 111, 222 ]);
  assert.equal(randomCalls, 1, "preparation makes one branch choice");
  assert.equal(engine.GetResolvedTarget(700), PLAYLIST);
  assert.equal(engine.GetStatus()[0].unavailableTargetId, RANDOM_TARGET);
  assert.equal(
    outgoing.stoppedAt,
    null,
    "an unavailable selected branch cannot fade the current music",
  );

  engine.PostEvent("music_switch_combat", 702, () => {});
  await tick();

  assert.equal(engine.GetResolvedTarget(700), RANDOM_TARGET);
  assert.equal(context.sources.at(-1).buffer.fake, 111);
  assert.equal(
    randomCalls,
    2,
    "scheduling consumes the pinned branch without rerolling",
  );
  assert.deepEqual(
    reads,
    [ 111, 222 ],
    "the available alternate was reused from cache only after it was selected",
  );
});

test("transition preparation pins one exact random music subtrack", async () =>
{
  const graph = fixtureGraph();
  const context = FakeContext();
  const reads = [];
  let randomCalls = 0;
  const track = graph.nodes[TRACK_B];
  const clip = track.clips[0];

  track.trackType = 1;
  track.subTrackCount = 2;
  track.clips = [
    { ...clip, trackId: 0, sourceId: 222 },
    { ...clip, trackId: 1, sourceId: 333 },
  ];

  const engine = new CjsMusicEngine({
    graph,
    context,
    destination: context.destination,
    loadMedia: async sourceId =>
    {
      reads.push(sourceId);
      return { fake: sourceId };
    },
    random: () =>
    {
      randomCalls++;
      return 0.99;
    },
  });

  engine.PostEvent("music_test_play", 703, () => {});
  await tick();
  engine.PostEvent("music_switch_combat", 704, () => {});
  await tick();

  assert.deepEqual(reads, [ 111, 333 ]);
  assert.equal(randomCalls, 1);
  assert.equal(context.sources.at(-1).buffer.fake, 333);
});

test("a cancelled prepare does not consume a sequence-track cursor", async () =>
{
  const graph = fixtureGraph();
  const context = FakeContext();
  const pending = Deferred();
  const reads = [];
  const track = graph.nodes[TRACK_B];
  const clip = track.clips[0];

  track.trackType = 2;
  track.subTrackCount = 2;
  track.clips = [
    { ...clip, trackId: 0, sourceId: 222 },
    { ...clip, trackId: 1, sourceId: 333 },
  ];

  const engine = new CjsMusicEngine({
    graph,
    context,
    destination: context.destination,
    loadMedia: sourceId =>
    {
      reads.push(sourceId);
      if (sourceId === 222)
      {
        return pending.promise;
      }
      return Promise.resolve({ fake: sourceId });
    },
  });

  engine.PostEvent("music_test_play", 705, () => {});
  await tick();
  engine.PostEvent("music_switch_combat", 706, () => {});
  await tick();
  engine.PostEvent("music_switch_calm", 707, () => {});

  pending.resolve({ fake: 222 });
  await tick();
  engine.PostEvent("music_switch_combat", 708, () => {});
  await tick();

  assert.equal(engine.GetResolvedTarget(705), SEGMENT_B);
  assert.equal(context.sources.at(-1).buffer.fake, 222);
  assert.equal(
    reads.includes(333),
    false,
    "the stale prepare never advanced the live sequence position",
  );
});

test("sequence-track drift during loading replans before commit", async () =>
{
  const SEGMENT_C = 600;
  const graph = fixtureGraph();
  const context = FakeContext();
  const pending = Deferred();
  const track = graph.nodes[TRACK_B];
  const clip = track.clips[0];

  graph.nodes[PLAYLIST].playlist[1].segmentId = SEGMENT_B;
  graph.nodes[SWITCH].treeNodes.find(node =>
    node.key === COMBAT).audioNodeId = SEGMENT_C;
  graph.nodes[SEGMENT_C] = {
    ...graph.nodes[SEGMENT_B],
    children: [ TRACK_B ],
  };
  track.trackType = 2;
  track.subTrackCount = 2;
  track.clips = [
    { ...clip, trackId: 0, sourceId: 222 },
    { ...clip, trackId: 1, sourceId: 333 },
  ];

  const engine = new CjsMusicEngine({
    graph,
    context,
    destination: context.destination,
    loadMedia: sourceId =>
    {
      if (sourceId === 333)
      {
        return pending.promise;
      }
      return Promise.resolve({ fake: sourceId });
    },
  });

  engine.PostEvent("music_test_play", 709, () => {});
  await tick();
  engine.PostEvent("music_switch_combat", 710, () => {});
  await tick();

  context.currentTime = 3;
  engine.Process();
  pending.resolve({ fake: 333 });
  await tick();
  await tick();

  assert.equal(engine.GetResolvedTarget(709), SEGMENT_C);
  assert.equal(
    context.sources.at(-1).buffer.fake,
    222,
    "the destination was replanned from the cursor advanced by outgoing playback",
  );
});

test("switch-track drift during loading replans to the current value", async () =>
{
  const TRACK_GROUP = wwiseIdFromName("track_mood");
  const TRACK_SECOND = wwiseIdFromName("track_second");
  const graph = fixtureGraph();
  const context = FakeContext();
  const pending = Deferred();
  const reads = [];
  const track = graph.nodes[TRACK_B];
  const clip = track.clips[0];

  track.trackType = 3;
  track.subTrackCount = 2;
  track.switchParams = {
    groupId: TRACK_GROUP,
    defaultSwitch: 0,
    assoc: [ 0, TRACK_SECOND ],
  };
  track.clips = [
    { ...clip, trackId: 0, sourceId: 222 },
    { ...clip, trackId: 1, sourceId: 333 },
  ];
  graph.switchSetters.music_track_second = [ {
    kind: "switch",
    groupId: TRACK_GROUP,
    targetId: TRACK_SECOND,
  } ];

  const engine = new CjsMusicEngine({
    graph,
    context,
    destination: context.destination,
    loadMedia: sourceId =>
    {
      reads.push(sourceId);
      if (sourceId === 222)
      {
        return pending.promise;
      }
      return Promise.resolve({ fake: sourceId });
    },
  });

  engine.PostEvent("music_test_play", 713, () => {});
  await tick();
  engine.PostEvent("music_switch_combat", 714, () => {});
  await tick();
  engine.PostEvent("music_track_second", 715, () => {});

  pending.resolve({ fake: 222 });
  await tick();
  await tick();

  assert.equal(engine.GetResolvedTarget(713), SEGMENT_B);
  assert.deepEqual(reads, [ 111, 222, 333 ]);
  assert.equal(context.sources.at(-1).buffer.fake, 333);
});

test("prepared failed layers are omitted without an immediate second read", async () =>
{
  const TRACK_C = 202;
  const graph = fixtureGraph();
  const context = FakeContext();
  const reads = new Map();
  const baseTrack = graph.nodes[TRACK_B];
  const clip = baseTrack.clips[0];

  graph.nodes[SEGMENT_B].children = [ TRACK_B, TRACK_C ];
  graph.nodes[TRACK_C] = {
    ...baseTrack,
    clips: [ { ...clip, sourceId: 333 } ],
  };

  const engine = new CjsMusicEngine({
    graph,
    context,
    destination: context.destination,
    loadMedia: async sourceId =>
    {
      reads.set(sourceId, (reads.get(sourceId) ?? 0) + 1);
      return sourceId === 333 ? null : { fake: sourceId };
    },
  });

  engine.PostEvent("music_test_play", 711, () => {});
  await tick();
  engine.PostEvent("music_switch_combat", 712, () => {});
  await tick();
  await tick();

  assert.equal(engine.GetResolvedTarget(711), SEGMENT_B);
  assert.equal(reads.get(222), 1);
  assert.equal(reads.get(333), 1);
  assert.equal(
    context.sources.some(source => source.buffer?.fake === 333),
    false,
  );
  assert.equal(
    engine.GetStatus()[0].segments.find(segment =>
      segment.segmentId === SEGMENT_B)?.pending,
    0,
  );
});

test("multi-setter music events reevaluate once from the combined state", async () =>
{
  const secondGroup = wwiseIdFromName("music_layer");
  const firstValue = wwiseIdFromName("combat_enabled");
  const secondValue = wwiseIdFromName("layer_enabled");
  const { context, engine } = Harness(graph =>
  {
    graph.nodes[SWITCH].argumentGroups = [
      { groupId: GROUP, groupType: 0 },
      { groupId: secondGroup, groupType: 0 },
    ];
    graph.nodes[SWITCH].treeNodes = [
      { key: 0, audioNodeId: 0, childrenIdx: 1, childrenCount: 2 },
      { key: 0, audioNodeId: 0, childrenIdx: 3, childrenCount: 1 },
      { key: firstValue, audioNodeId: 0, childrenIdx: 4, childrenCount: 2 },
      { key: 0, audioNodeId: PLAYLIST, childrenIdx: 0, childrenCount: 0 },
      { key: 0, audioNodeId: 0, childrenIdx: 0, childrenCount: 0 },
      { key: secondValue, audioNodeId: SEGMENT_B, childrenIdx: 0, childrenCount: 0 },
    ];
    graph.nodes[SWITCH].rules = [ {
      srcIds: [ PLAYLIST ],
      dstIds: [ SEGMENT_B ],
      src: {
        transitionTime: 2000,
        fadeCurve: 4,
        fadeOffset: 2000,
        syncType: 0,
      },
      dst: {
        transitionTime: 0,
        fadeCurve: 4,
        fadeOffset: 0,
      },
      transitionSegment: null,
    } ];
    graph.switchSetters.music_switch_combined = [
      { kind: "switch", groupId: GROUP, targetId: firstValue },
      { kind: "switch", groupId: secondGroup, targetId: secondValue },
    ];
  });

  engine.PostEvent("music_test_play", 992, () => {});
  await tick();
  const source = context.sources.find(value => value.buffer?.fake === 111);

  context.currentTime = 2;
  engine.PostEvent("music_switch_combined", 993, () => {});
  await tick();

  assert.equal(engine.GetResolvedTarget(992), SEGMENT_B);
  assert.equal(
    source.stoppedAt,
    4,
    "no intermediate one-setter silence captures the outgoing fade",
  );
});


test("a switch setter event transitions to segment B at the exit-cue boundary with the rule's fade", async () =>
{
  const { context, engine, finished } = Harness();
  engine.PostEvent("music_test_play", 503, () => finished.push(503));
  await tick();

  engine.PostEvent("music_switch_combat", 504, () => finished.push(504));
  await tick();
  assert.deepEqual(finished, [ 504 ], "setter event finishes immediately; music keeps playing");
  assert.equal(engine.GetPlayingCount(), 1);

  // Pending target applies at the next boundary (8s): segment A's source is
  // fades over the 500ms before the exit cue and segment B starts there.
  context.currentTime = 6.6;
  engine.Process();
  await tick();
  assert.equal(engine.GetResolvedTarget(503), SEGMENT_B, "tree re-resolves to combat");
  const segmentASource = context.sources[0];
  assert.equal(segmentASource.stoppedAt, 8, "old segment stops at the exit cue after its rule fade");
  const segmentBSource = context.sources.find(s => s.startDuration === 4);
  assert.ok(segmentBSource, "segment B clip scheduled");
  assert.equal(segmentBSource.startedAt, 8, "segment B enters at the boundary");
});

test("fixed-delay music setters remain live and reevaluate only when due", async () =>
{
  const { context, engine, finished } = Harness(graph =>
  {
    graph.switchSetters.music_switch_delayed = [ {
      kind: "switch",
      groupId: GROUP,
      targetId: COMBAT,
      delayMs: 1000,
    } ];
    graph.switchSetters.music_switch_cancelled = [ {
      kind: "switch",
      groupId: GROUP,
      targetId: wwiseIdFromName("peace"),
      delayMs: 1000,
    } ];
  });

  engine.PostEvent("music_test_play", 513, () => finished.push(513));
  await tick();
  const retained = engine.PostEvent(
    "music_switch_delayed",
    514,
    () => finished.push(514),
  );

  assert.equal(retained, true);
  assert.equal(engine.GetPlayingCount(), 2);
  assert.equal(engine.GetResolvedTarget(513), PLAYLIST);
  assert.deepEqual(finished, []);

  context.currentTime = 0.999;
  engine.Process();
  await tick();
  assert.equal(engine.GetResolvedTarget(513), PLAYLIST);
  assert.deepEqual(finished, []);

  context.currentTime = 1;
  engine.Process();
  await tick();
  await tick();
  assert.equal(engine.GetResolvedTarget(513), SEGMENT_B);
  assert.deepEqual(finished, [ 514 ]);
  assert.equal(engine.GetPlayingCount(), 1);

  engine.PostEvent(
    "music_switch_cancelled",
    515,
    () => finished.push(515),
  );
  engine.ExecuteAction("stop", 515, 0);
  context.currentTime = 2;
  engine.Process();
  await tick();

  assert.deepEqual(finished, [ 514, 515 ]);
  assert.equal(engine.GetResolvedTarget(513), SEGMENT_B);
});

test("overdue music setters preserve distinct authored deadlines", async () =>
{
  const { context, engine, loaded, finished } = Harness(graph =>
  {
    graph.switchSetters.music_switch_overdue = [
      {
        kind: "switch",
        groupId: GROUP,
        targetId: COMBAT,
        delayMs: 100,
      },
      {
        kind: "switch",
        groupId: GROUP,
        targetId: CALM,
        delayMs: 200,
      },
    ];
  });

  engine.PostEvent("music_test_play", 516, () => finished.push(516));
  await tick();
  engine.PostEvent(
    "music_switch_overdue",
    517,
    () => finished.push(517),
  );

  context.currentTime = 0.2;
  engine.Process();
  await tick();
  await tick();

  assert.ok(
    loaded.includes(222),
    "the 100 ms combat decision is observed before the 200 ms calm decision",
  );
  assert.equal(engine.GetResolvedTarget(516), PLAYLIST);
  assert.deepEqual(finished, [ 517 ]);
});

test("transition pre-entry and post-exit flags control the source windows", async () =>
{
  const transition = async ({ playPreEntry, playPostExit }) =>
  {
    const { context, engine } = Harness(graph =>
    {
      const rule = graph.nodes[SWITCH].rules[0];

      rule.src.transitionTime = 0;
      rule.src.playPostExit = playPostExit;
      rule.dst.playPreEntry = playPreEntry;
      graph.nodes[SEGMENT_B].duration = 5000;
      graph.nodes[SEGMENT_B].markers = [
        { id: 1, position: 1000, name: "" },
        { id: 2, position: 4000, name: "" },
      ];
      graph.nodes[TRACK_B].clips[0].srcDuration = 5000;
    });

    engine.PostEvent("music_test_play", 516, () => {});
    await tick();
    context.currentTime = 6.6;
    engine.PostEvent("music_switch_combat", 517, () => {});
    await tick();

    return {
      outgoing: context.sources.find(source =>
        source.buffer?.fake === 111),
      destination: context.sources.find(source =>
        source.buffer?.fake === 222),
    };
  };

  const clipped = await transition({
    playPreEntry: false,
    playPostExit: false,
  });

  assert.equal(clipped.outgoing.stoppedAt, 8);
  assert.equal(clipped.destination.startedAt, 8);
  assert.equal(
    clipped.destination.startOffset,
    1,
    "disabled pre-entry begins at the entry cue with the source advanced",
  );

  const retained = await transition({
    playPreEntry: true,
    playPostExit: true,
  });

  assert.equal(
    retained.outgoing.stoppedAt,
    null,
    "enabled post-exit lets the authored tail finish naturally",
  );
  assert.equal(retained.destination.startedAt, 7);
  assert.equal(retained.destination.startOffset, 0);
});


test("a NextBar rule transitions at the next bar boundary with a crossfade", async () =>
{
  // 120 BPM 4/4 -> bar = 2000ms. Segment A entry cue at 1000ms aligned to
  // ctx 0 puts segment-timeline zero at ctx -1s.
  const { context, engine } = Harness(graph =>
  {
    graph.nodes[SWITCH].rules[0].src.syncType = 2;
    graph.nodes[SWITCH].rules[0].src.transitionTime = 500;
  });
  engine.PostEvent("music_test_play", 508, () => {});
  await tick();

  context.currentTime = 2.3;
  engine.PostEvent("music_switch_combat", 509, () => {});
  await tick();

  assert.equal(engine.GetResolvedTarget(508), SEGMENT_B);
  // Position 3300ms into the segment timeline -> next bar at 4000ms -> ctx 3.0.
  assert.equal(context.sources[0].stoppedAt, 3, "old segment stops at the next bar");
  const segmentAGain = context.gains[2];
  assert.deepEqual(segmentAGain.gain.ramps, [ [ 0, 3 ] ], "old segment gain fades into the sync point");
  const segmentBSource = context.sources.find(s => s.startDuration === 4);
  assert.ok(segmentBSource, "segment B scheduled");
  assert.equal(segmentBSource.startedAt, 3, "segment B enters at the bar boundary");
});

test("NextBar uses inherited music time settings until a child overrides them", async () =>
{
  const transitionAt = async meterOverride =>
  {
    const { context, engine } = Harness(graph =>
    {
      const root = graph.nodes[SWITCH];

      root.meterOverride = true;
      root.meter = {
        gridPeriod: 750,
        gridOffset: 0,
        tempo: 80,
        beatsPerBar: 4,
        beatValue: 4,
      };
      root.rules[0].src.syncType = 2;
      root.rules[0].src.transitionTime = 0;
      // Exercise direct root -> segment inheritance rather than allowing the
      // intervening playlist to establish a separate time-setting owner.
      root.treeNodes[1].audioNodeId = SEGMENT_A;
      root.treeNodes[2].audioNodeId = SEGMENT_A;
      graph.nodes[SEGMENT_A].meterOverride = meterOverride;
    });

    engine.PostEvent("music_test_play", 518, () => {});
    await tick();
    context.currentTime = 2.3;
    engine.PostEvent("music_switch_combat", 519, () => {});
    await tick();
    return context.sources[0].stoppedAt;
  };

  assert.equal(
    await transitionAt(false),
    5,
    "80 BPM parent owns the next 3-second bar (timeline zero is ctx -1)",
  );
  assert.equal(
    await transitionAt(true),
    3,
    "the child's authored 120 BPM override restores its 2-second bar",
  );
});

test("later specific transition rules override an earlier Any-to-Any fallback", async () =>
{
  const { context, engine } = Harness(graph =>
  {
    const fallback = {
      ...graph.nodes[SWITCH].rules[0],
      src: {
        ...graph.nodes[SWITCH].rules[0].src,
        transitionTime: 0,
        syncType: 7
      }
    };
    const specific = {
      ...fallback,
      srcIds: [ PLAYLIST ],
      dstIds: [ SEGMENT_B ],
      src: {
        ...fallback.src,
        syncType: 0
      }
    };

    graph.nodes[SWITCH].rules = [ fallback, specific ];
  });

  engine.PostEvent("music_test_play", 510, () => {});
  await tick();
  context.currentTime = 2;
  engine.PostEvent("music_switch_combat", 511, () => {});
  await tick();

  const segmentBSource = context.sources.find(s => s.startDuration === 4);

  assert.ok(segmentBSource, "specific rule schedules the destination segment");
  assert.equal(
    segmentBSource.startedAt,
    2,
    "bottom-to-top rule precedence selects the specific Immediate transition"
  );
});

test("an authored transition segment bridges the source and destination", async () =>
{
  const { context, engine, loaded } = Harness(graph =>
  {
    graph.nodes[TRANSITION_SEGMENT] = {
      type: "music-segment",
      children: [ TRANSITION_TRACK ],
      meter: {
        gridPeriod: 1000,
        gridOffset: 0,
        tempo: 120,
        beatsPerBar: 4,
        beatValue: 4
      },
      stingers: [],
      duration: 4000,
      markers: [
        { id: 1, position: 1000, name: "" },
        { id: 2, position: 3000, name: "" }
      ]
    };
    graph.nodes[TRANSITION_TRACK] = {
      type: "music-track",
      trackType: 0,
      subTrackCount: 1,
      switchParams: null,
      sources: [
        {
          pluginId: 0x00040001,
          streamType: 1,
          sourceId: 333,
          inMemoryMediaSize: 0,
          sourceBits: 0
        }
      ],
      clips: [
        {
          trackId: 0,
          sourceId: 333,
          eventId: 0,
          playAt: 0,
          beginTrimOffset: 0,
          endTrimOffset: 0,
          srcDuration: 4000
        }
      ]
    };
    graph.nodes[SWITCH].rules[0].transitionSegment = {
      segmentId: TRANSITION_SEGMENT,
      fadeIn: {
        transitionTime: 500,
        fadeCurve: 4,
        fadeOffset: 0
      },
      fadeOut: {
        transitionTime: 500,
        fadeCurve: 4,
        fadeOffset: 0
      },
      playPreEntry: false,
      playPostExit: false
    };
  });

  engine.PostEvent("music_test_play", 512, () => {});
  await tick();
  context.currentTime = 6.6;
  engine.PostEvent("music_switch_combat", 513, () => {});
  await tick();

  assert.deepEqual(
    loaded,
    [ 111, 222, 333 ],
    "the destination and bridge media are prepared before transition"
  );
  const bridgeSource = context.sources.find(source =>
    source.buffer?.fake === 333);
  const destinationSource = context.sources.find(source =>
    source.buffer?.fake === 222);

  assert.ok(bridgeSource, "transition segment is scheduled");
  assert.equal(
    bridgeSource.startedAt,
    8,
    "disabled transition pre-entry clips playback to the bridge entry cue"
  );
  assert.equal(
    bridgeSource.startOffset,
    1,
    "clipped pre-entry advances the source offset"
  );
  assert.equal(
    bridgeSource.startDuration,
    2,
    "disabled transition post-exit clips playback at the bridge exit cue"
  );
  assert.equal(
    bridgeSource.stoppedAt,
    10,
    "transition fade-out ends at the bridge exit cue"
  );
  assert.deepEqual(
    bridgeSource.connectedTo.gain.ramps,
    [ [ 1, 8.5 ], [ 0, 10 ] ],
    "transition fade envelopes are anchored to its entry and exit cues"
  );
  assert.ok(destinationSource, "destination segment is scheduled");
  assert.equal(
    destinationSource.startedAt,
    10,
    "destination entry follows the transition segment exit cue"
  );
});

test("transition fade offsets are anchored to source exit and destination entry cues", async () =>
{
  const { context, engine } = Harness(graph =>
  {
    const rule = graph.nodes[SWITCH].rules[0];

    rule.src = {
      ...rule.src,
      transitionTime: 1000,
      fadeOffset: 500,
      syncType: 0
    };
    rule.dst = {
      ...rule.dst,
      transitionTime: 2000,
      fadeOffset: -500
    };
  });

  engine.PostEvent("music_test_play", 514, () => {});
  await tick();
  context.currentTime = 2;
  engine.PostEvent("music_switch_combat", 515, () => {});
  await tick();

  const source = context.sources.find(value => value.buffer?.fake === 111);
  const destination = context.sources.find(value => value.buffer?.fake === 222);

  assert.equal(
    source.stoppedAt,
    2.5,
    "source fade ends at sync cue plus its positive offset"
  );
  assert.ok(destination, "destination is scheduled");
  assert.deepEqual(
    destination.connectedTo.gain.sets,
    [ [ 0.25, 2 ] ],
    "late scheduling resumes the destination fade at its linear progress"
  );
  assert.deepEqual(
    destination.connectedTo.gain.ramps,
    [ [ 1, 3.5 ] ],
    "destination fade begins 500ms before entry and lasts two seconds"
  );
});

test("authored nonlinear transition fades use sampled Wwise curve shapes", async () =>
{
  const { context, engine } = Harness(graph =>
  {
    const rule = graph.nodes[SWITCH].rules[0];

    rule.src = {
      ...rule.src,
      transitionTime: 1000,
      fadeCurve: 8,
      fadeOffset: 1000,
      syncType: 0
    };
    rule.dst = {
      ...rule.dst,
      transitionTime: 2000,
      fadeCurve: 0,
      fadeOffset: -500
    };
  });

  engine.PostEvent("music_test_play", 516, () => {});
  await tick();
  context.currentTime = 2;
  engine.PostEvent("music_switch_combat", 517, () => {});
  await tick();

  const source = context.sources.find(value => value.buffer?.fake === 111);
  const destination = context.sources.find(value => value.buffer?.fake === 222);
  const [ sourceCurve ] = source.connectedTo.gain.curves;
  const [ destinationCurve ] = destination.connectedTo.gain.curves;

  assert.ok(sourceCurve, "Exp3 source fade is sampled");
  assert.equal(sourceCurve[1], 2);
  assert.equal(sourceCurve[2], 1);
  assert.equal(sourceCurve[0][0], 1);
  assert.ok(Math.abs(sourceCurve[0][32] - 0.875) < 1e-6);
  assert.equal(sourceCurve[0][64], 0);

  assert.ok(destinationCurve, "Log3 destination fade is sampled");
  assert.equal(destinationCurve[1], 2);
  assert.equal(destinationCurve[2], 1.5);
  assert.ok(Math.abs(destinationCurve[0][0] - 0.578125) < 1e-6);
  assert.ok(Math.abs(destinationCurve[0][32] - 0.947265625) < 1e-6);
  assert.equal(destinationCurve[0][64], 1);
});

test("a destination whose media cannot load leaves the current music playing", async () =>
{
  const context = FakeContext();
  const graph = fixtureGraph();
  graph.nodes[TRACK_B].clips.push({
    ...graph.nodes[TRACK_B].clips[0],
    sourceId: 223
  });
  let destinationAvailable = false;
  const engine = new CjsMusicEngine({
    graph,
    context,
    destination: context.destination,
    loadMedia: async sourceId =>
      sourceId === 223 || (sourceId === 222 && !destinationAvailable)
        ? null
        : { fake: sourceId },
    random: () => 0.5
  });

  engine.PostEvent("music_test_play", 800, () => {});
  await tick();
  const source = context.sources.find(value => value.buffer?.fake === 111);

  context.currentTime = 2;
  engine.PostEvent("music_switch_combat", 801, () => {});
  await tick();

  assert.equal(
    engine.GetResolvedTarget(800),
    PLAYLIST,
    "the failed destination does not replace the audible target"
  );
  assert.equal(source.stoppedAt, null, "the current source is not faded out");
  assert.equal(
    context.sources.some(value => value.buffer?.fake === 222),
    false,
    "no destination voice is scheduled from a missing buffer"
  );
  assert.equal(
    engine.GetStatus()[0].unavailableTargetId,
    SEGMENT_B,
    "status identifies the destination rejected by preparation"
  );

  destinationAvailable = true;
  engine.PostEvent("music_switch_calm", 802, () => {});
  engine.PostEvent("music_switch_combat", 803, () => {});
  await tick();
  await tick();

  assert.equal(engine.GetResolvedTarget(800), SEGMENT_B);
  context.currentTime = 6.6;
  engine.Process();
  await tick();
  assert.ok(
    context.sources.some(value => value.buffer?.fake === 222),
    "a later state change retries the evicted failed buffer"
  );
  assert.equal(engine.GetStatus()[0].unavailableTargetId, null);
});


test("states that resolve to nothing fade to silence and the music resumes on the next state", async () =>
{
  // EVE's trees contain authored-silence leaves (audio node 0) AND leaves
  // referencing ids absent from every shipped bank; both must silence the
  // instance without killing it.
  for (const chip of [ "music_switch_silent", "music_switch_unshipped" ])
  {
    const { context, engine, finished } = Harness();
    engine.PostEvent("music_test_play", 600, () => finished.push(600));
    await tick();
    const outgoingSource = context.sources[0];
    const outgoingSegmentGain = outgoingSource.connectedTo;
    context.currentTime = 2;
    engine.PostEvent(chip, 601, () => {});
    await tick();
    assert.equal(engine.GetPlayingCount(), 1, `${chip}: instance survives silence`);
    assert.equal(engine.GetResolvedTarget(600), null, `${chip}: resolved to nothing`);
    assert.ok(context.sources[0].stoppedAt !== null, `${chip}: outgoing audio faded out`);
    assert.deepEqual(finished, [], `${chip}: the play event did not finish`);

    // Advance well past the old boundary: silent instances never exhaust.
    context.currentTime = 30;
    engine.Process();
    assert.equal(engine.GetPlayingCount(), 1, `${chip}: still alive while silent`);
    assert.equal(engine.GetStatus()[0].segments.length, 0, `${chip}: expired outgoing segment pruned`);
    assert.equal(outgoingSource.disconnected, true, `${chip}: outgoing source disconnected`);
    assert.equal(outgoingSegmentGain.disconnected, true, `${chip}: outgoing gain disconnected`);

    engine.PostEvent("music_switch_combat", 602, () => {});
    await tick();
    engine.Process();
    assert.equal(engine.GetResolvedTarget(600), SEGMENT_B, `${chip}: resumed on the next state`);
    const resumed = context.sources.find(s => s.startDuration === 4);
    assert.ok(resumed, `${chip}: segment B scheduled after silence`);
    assert.ok(resumed.startedAt >= 30, `${chip}: resume scheduled from now, not the stale timeline`);
  }
});


test("an authored stop event stops the matching instance with the default fade", async () =>
{
  const { context, engine, finished } = Harness();
  engine.PostEvent("music_test_play", 506, () => finished.push(506));
  await tick();
  context.currentTime = 3;
  engine.PostEvent("music_test_stop", 507, () => finished.push(507));
  await tick();
  assert.deepEqual(finished, [ 507 ], "the stop setter completes while the outgoing music remains audible");
  assert.equal(engine.GetPlayingCount(), 1);
  assert.deepEqual(context.gains[1].gain.ramps, [ [ 0, 4 ] ], "default 1s fade");
  context.currentTime = 4;
  engine.Process();
  assert.deepEqual(finished.sort(), [ 506, 507 ], "music finishes when the scheduled fade lands");
  assert.equal(engine.GetPlayingCount(), 0);
});


test("stop fades the instance gain and finishes exactly once", async () =>
{
  const { context, engine, finished } = Harness();
  engine.PostEvent("music_test_play", 505, () => finished.push(505));
  await tick();
  context.currentTime = 2;
  engine.ExecuteAction("stop", 505, 1000);
  assert.deepEqual(context.gains[1].gain.ramps, [ [ 0, 3 ] ], "1s fade on the instance gain");
  assert.equal(context.sources[0].stoppedAt, 3, "source stops when the fade lands");
  assert.equal(engine.GetStatus()[0].state, "stopping");
  assert.equal(engine.GetStatus()[0].segments.length, 1, "status retains the audible fade");
  assert.deepEqual(finished, [], "completion waits for the audible fade");
  assert.equal(engine.GetPlayingCount(), 1);
  assert.equal(context.gains[1].disconnected, false, "instance output remains connected through the fade");
  context.currentTime = 3;
  engine.Process();
  assert.deepEqual(finished, [ 505 ]);
  assert.equal(engine.GetPlayingCount(), 0);
  assert.equal(context.gains[1].disconnected, true, "instance output disconnects after the fade");
  engine.ExecuteAction("stop", 505, 0);
  assert.deepEqual(finished, [ 505 ], "second stop is a no-op");
});

test("Break leaves authored interactive music playing", async () =>
{
  const { context, engine, finished } = Harness();
  engine.PostEvent("music_test_play", 508, () => finished.push(508));
  await tick();

  engine.ExecuteAction("break", 508, 1000);

  assert.equal(engine.GetPlayingCount(), 1);
  assert.deepEqual(context.gains[1].gain.ramps, []);
  assert.equal(context.sources[0].stoppedAt, null);
  assert.deepEqual(finished, []);

  engine.ExecuteAction("stop", 508, 0);
  engine.Process();
  assert.deepEqual(finished, [ 508 ]);
});

test("decoded music cache can be released and null loads retry", async () =>
{
  const context = FakeContext();
  let calls = 0;
  const engine = new CjsMusicEngine({
    graph: fixtureGraph(),
    context,
    destination: context.destination,
    loadMedia: async sourceId => (++calls === 1 ? null : { fresh: sourceId }),
    random: () => 0.5
  });
  engine.PostEvent("music_test_play", 700, () => {});
  await tick();
  assert.equal(calls, 1);
  assert.equal(engine.GetCachedMediaCount(), 0, "a null result is not cached forever");

  engine.SetSwitch(GROUP, CALM);
  await tick();
  assert.equal(calls, 2, "reapplying a playable state retries the missing source");
  assert.equal(engine.GetCachedMediaCount(), 1);
  assert.equal(engine.ReleaseMedia(111), true);
  assert.equal(engine.GetCachedMediaCount(), 0);
  assert.equal(engine.ClearMedia(), 0);
  engine.Dispose();
});

test("graph replacement cancels stale pending media and reuses source ids with the new loader", async () =>
{
  const context = FakeContext();
  const pending = Deferred();
  const finished = [];
  const engine = new CjsMusicEngine({
    graph: fixtureGraph(),
    context,
    destination: context.destination,
    loadMedia: () => pending.promise,
    random: () => 0.5
  });
  engine.PostEvent("music_test_play", 701, () => finished.push(701));
  engine.SetGraph(fixtureGraph(), {
    loadMedia: async sourceId => ({ replacement: sourceId })
  });
  assert.deepEqual(finished, [ 701 ], "replacement finishes old instances exactly once");
  pending.resolve({ stale: true });
  await tick();
  assert.equal(context.sources.length, 0, "the stale load cannot create a source");

  engine.PostEvent("music_test_play", 702, () => finished.push(702));
  await tick();
  assert.equal(context.sources.length, 1);
  assert.deepEqual(context.sources[0].buffer, { replacement: 111 });
  engine.Dispose();
  assert.deepEqual(finished, [ 701, 702 ]);
});

test("qualified music routes keep segment and instance fades before the shared mixer", async () =>
{
  const graph = fixtureGraph();
  const context = FakeContext();
  const catalog = MusicMixerCatalog();
  const runtime = new CjsBusGraphRuntime(catalog);
  const mixer = new CjsSharedBusMixer({
    context,
    runtime,
    destination: context.destination,
  });

  Object.assign(graph.nodes[TRACK_A], {
    outputBusId: "500",
    busPathIds: [ "500", "1" ],
  });
  graph.nodes[TRANSITION_TRACK] = {
    type: "music-track",
    trackType: 0,
    subTrackCount: 1,
    switchParams: null,
    outputBusId: "700",
    busPathIds: [ "700", "1" ],
    clips: [ {
      trackId: 0,
      sourceId: 333,
      eventId: 0,
      playAt: 0,
      beginTrimOffset: 0,
      endTrimOffset: 0,
      srcDuration: 10000,
    } ],
  };
  graph.nodes[SEGMENT_A].children.push(TRANSITION_TRACK);
  const engine = new CjsMusicEngine({
    graph,
    context,
    destination: context.destination,
    loadMedia: async sourceId => ({ fake: sourceId }),
    random: () => 0.5,
    busGraphRuntime: runtime,
    busMixer: mixer,
  });

  engine.PostEvent("music_test_play", 702, () => {});
  await tick();

  const qualifiedSource = context.sources.find(source => source.buffer.fake === 111);
  const blockedSource = context.sources.find(source => source.buffer.fake === 333);
  const routeGain = qualifiedSource.connectedTo;
  const segmentRouteGain = routeGain.connectedTo;
  const instanceRouteGain = segmentRouteGain.connectedTo;
  const qualifiedInput = mixer.GetInput(
    runtime.ResolveMusicRoute(String(TRACK_A)),
    "music",
  );
  const blockedRouteGain = blockedSource.connectedTo;
  const legacySegmentGain = blockedRouteGain.connectedTo;
  const legacyInstanceGain = legacySegmentGain.connectedTo;

  assert.equal(instanceRouteGain.connectedTo, qualifiedInput);
  assert.equal(
    mixer.GetInput(runtime.ResolveMusicRoute(String(TRANSITION_TRACK)), "music"),
    null,
    "an authored processing barrier remains on the legacy music lane",
  );
  assert.equal(legacyInstanceGain.connectedTo, engine.musicGain);

  engine.SetMusicVolume(0.4);
  assert.equal(qualifiedInput.gain.value, 0.4);
  assert.equal(engine.musicGain.gain.value, 0.4);

  context.currentTime = 2;
  engine.ExecuteAction("stop", 702, 1000);
  assert.deepEqual(segmentRouteGain.gain.ramps, [ [ 0, 3 ] ]);
  assert.deepEqual(instanceRouteGain.gain.ramps, [ [ 0, 3 ] ]);
  assert.deepEqual(legacySegmentGain.gain.ramps, [ [ 0, 3 ] ]);
  assert.deepEqual(legacyInstanceGain.gain.ramps, [ [ 0, 3 ] ]);

  context.currentTime = 3;
  engine.Process();
  assert.equal(segmentRouteGain.disconnected, true);
  assert.equal(instanceRouteGain.disconnected, true);
  assert.equal(qualifiedInput.disconnected, false, "the system-owned mixer survives music disposal");
  assert.equal(
    mixer.GetInput(runtime.ResolveMusicRoute(String(TRACK_A)), "music"),
    qualifiedInput,
  );
  mixer.Dispose();
  runtime.Dispose();
});

test("qualified music routes share static EQ after their route-local fades", async () =>
{
  const graph = fixtureGraph();
  const context = FakeContext();
  const catalog = MusicMixerCatalog();
  const { graphEffect, busEffects } = MusicEqFixture();

  catalog.effects["990"] = graphEffect;
  catalog.buses["500"].effects = [ {
    slotIndex: 0,
    effectId: "990",
    bypass: false,
    shareSet: true,
    rendered: false,
  } ];
  catalog.buses["500"].requiresProcessing = [ "effects" ];
  Object.assign(graph.nodes[TRACK_A], {
    outputBusId: "500",
    busPathIds: [ "500", "1" ],
  });
  const runtime = new CjsBusGraphRuntime(catalog);
  const mixer = new CjsSharedBusMixer({
    context,
    runtime,
    destination: context.destination,
  });
  const engine = new CjsMusicEngine({
    graph,
    context,
    destination: context.destination,
    loadMedia: async sourceId => ({ fake: sourceId }),
    random: () => 0.5,
    busEffects,
    busGraphRuntime: runtime,
    busMixer: mixer,
  });

  engine.PostEvent("music_test_play", 706, () => {});
  engine.PostEvent("music_test_play", 707, () => {});
  await tick();

  const mixerInput = mixer.GetInput(
    runtime.ResolveMusicRoute(String(TRACK_A)),
    "music",
  );
  const busInput = mixerInput.connectedTo;
  const eq = busInput.connectedTo;

  assert.equal(context.sources.length, 2);
  assert.equal(context.filters.length, 1, "music instances do not duplicate shared EQ");
  assert.ok(context.sources.every(source =>
    source.connectedTo.connectedTo.connectedTo.connectedTo === mixerInput));
  assert.equal(eq.type, "peaking");
  assert.equal(eq.gain.value, -13);

  engine.Dispose();
  assert.equal(eq.disconnected, false, "music lifetime does not own shared Bus effects");
  mixer.Dispose();
  assert.equal(eq.disconnected, true);
  runtime.Dispose();
});

test("qualified music keeps local gain while the shared Bus owns post-effect volume", async () =>
{
  const graph = fixtureGraph();
  const context = FakeContext();
  const route = {
    authoredBusVolumeDb: -6,
    authoredBusMakeUpGainDb: 2,
    authoredOutputBusVolumeDb: 3,
  };
  const catalog = MusicMixerCatalog({
    busVolumeDb: route.authoredBusVolumeDb,
    authoredBusMakeUpGainDb: route.authoredBusMakeUpGainDb,
    authoredOutputBusVolumeDb: route.authoredOutputBusVolumeDb,
  });
  const { graphEffect, busEffects } = MusicEqFixture();

  catalog.effects["990"] = graphEffect;
  catalog.buses["500"].effects = [ {
    slotIndex: 0,
    effectId: "990",
    bypass: false,
    shareSet: true,
    rendered: false,
  } ];
  catalog.buses["500"].requiresProcessing = [ "effects" ];
  Object.assign(graph.nodes[TRACK_A], {
    outputBusId: "500",
    busPathIds: [ "500", "1" ],
    ...route,
  });
  const runtime = new CjsBusGraphRuntime(catalog);
  const mixer = new CjsSharedBusMixer({
    context,
    runtime,
    destination: context.destination,
  });
  const engine = new CjsMusicEngine({
    graph,
    context,
    destination: context.destination,
    loadMedia: async sourceId => ({ fake: sourceId }),
    random: () => 0.5,
    busEffects,
    busGraphRuntime: runtime,
    busMixer: mixer,
  });

  engine.PostEvent("music_test_play", 708, () => {});
  await tick();

  const routeGain = context.sources[0].connectedTo;
  const mixerInput = mixer.GetInput(
    runtime.ResolveMusicRoute(String(TRACK_A)),
    "music",
  );
  const effect = mixerInput.connectedTo.connectedTo;
  const sharedFader = effect.connectedTo;

  assert.ok(Math.abs(routeGain.gain.value - 10 ** (5 / 20)) < 1e-6);
  assert.equal(effect.type, "peaking");
  assert.ok(Math.abs(sharedFader.gain.value - 10 ** (-6 / 20)) < 1e-12);
  assert.equal(sharedFader.connectedTo.connectedTo, context.destination);

  engine.Dispose();
  assert.equal(sharedFader.disconnected, false);
  mixer.Dispose();
  assert.equal(sharedFader.disconnected, true);
  runtime.Dispose();
});

test("qualified music crossfades retain distinct segment lanes on one route", async () =>
{
  const graph = fixtureGraph();
  const context = FakeContext();
  const catalog = MusicMixerCatalog();

  catalog.musicRoutes[TRACK_B] = 0;
  Object.assign(graph.nodes[TRACK_A], {
    outputBusId: "500",
    busPathIds: [ "500", "1" ],
  });
  Object.assign(graph.nodes[TRACK_B], {
    outputBusId: "500",
    busPathIds: [ "500", "1" ],
  });
  graph.nodes[SWITCH].rules[0].src.syncType = 2;
  graph.nodes[SWITCH].rules[0].src.transitionTime = 500;
  graph.nodes[SWITCH].rules[0].dst.transitionTime = 500;
  const runtime = new CjsBusGraphRuntime(catalog);
  const mixer = new CjsSharedBusMixer({
    context,
    runtime,
    destination: context.destination,
  });
  const engine = new CjsMusicEngine({
    graph,
    context,
    destination: context.destination,
    loadMedia: async sourceId => ({ fake: sourceId }),
    random: () => 0.5,
    busGraphRuntime: runtime,
    busMixer: mixer,
  });

  engine.PostEvent("music_test_play", 703, () => {});
  await tick();
  context.currentTime = 2.3;
  engine.PostEvent("music_switch_combat", 704, () => {});
  await tick();

  const source = context.sources.find(node => node.buffer.fake === 111);
  const destination = context.sources.find(node => node.buffer.fake === 222);
  const sourceSegmentLane = source.connectedTo.connectedTo;
  const destinationSegmentLane = destination.connectedTo.connectedTo;

  assert.notEqual(sourceSegmentLane, destinationSegmentLane);
  assert.equal(
    sourceSegmentLane.connectedTo,
    destinationSegmentLane.connectedTo,
    "overlapping segments share only the instance lane for one exact route",
  );
  assert.deepEqual(sourceSegmentLane.gain.ramps, [ [ 0, 3 ] ]);
  assert.ok(
    destinationSegmentLane.gain.ramps.some(([ value ]) => value === 1),
    "the incoming route lane receives the authored fade-in",
  );

  engine.Dispose();
  assert.equal(sourceSegmentLane.disconnected, true);
  assert.equal(destinationSegmentLane.disconnected, true);
  assert.equal(mixer.GetInput(runtime.ResolveMusicRoute(String(TRACK_A)), "music").disconnected, false);
  mixer.Dispose();
  runtime.Dispose();
});

test("deferred qualified music keeps pre-scheduled fades on distinct routes", async () =>
{
  const graph = PlaylistModeGraph({
    rsType: 0,
    loop: 1,
    segments: [ 910, 920 ],
  });
  const context = FakeContext();
  const pending = Deferred();
  const catalog = MusicMixerCatalog();

  Object.assign(graph.nodes[911], {
    outputBusId: "500",
    busPathIds: [ "500", "1" ],
  });
  Object.assign(graph.nodes[921], {
    outputBusId: "600",
    busPathIds: [ "600", "1" ],
  });
  graph.nodes[900].rules = [ {
    srcIds: [ -1 ],
    dstIds: [ -1 ],
    src: {
      transitionTime: 500,
      fadeCurve: 4,
      fadeOffset: 0,
      syncType: 7,
      playPostExit: false,
    },
    dst: {
      transitionTime: 500,
      fadeCurve: 4,
      fadeOffset: 0,
      playPreEntry: false,
    },
    transitionSegment: null,
  } ];
  const runtime = new CjsBusGraphRuntime(catalog);
  const mixer = new CjsSharedBusMixer({
    context,
    runtime,
    destination: context.destination,
  });
  const engine = new CjsMusicEngine({
    graph,
    context,
    destination: context.destination,
    loadMedia: sourceId => sourceId === 1001
      ? pending.promise
      : Promise.resolve({ fake: sourceId }),
    busGraphRuntime: runtime,
    busMixer: mixer,
  });

  engine.PostEvent("play", 705, () => {});
  await tick();

  const sourceInput = mixer.GetInput(
    runtime.ResolveMusicRoute("911"),
    "music",
  );
  const destinationInput = mixer.GetInput(
    runtime.ResolveMusicRoute("921"),
    "music",
  );
  const source = context.sources.find(node => node.buffer.fake === 1000);
  const sourceSegmentLane = source.connectedTo.connectedTo;
  const sourceInstanceLane = sourceSegmentLane.connectedTo;
  const destinationInstanceLane = context.gains.find(gain =>
    gain.connectedTo === destinationInput);
  const destinationSegmentLane = context.gains.find(gain =>
    gain.connectedTo === destinationInstanceLane);

  assert.equal(sourceInstanceLane.connectedTo, sourceInput);
  assert.notEqual(sourceInstanceLane, destinationInstanceLane);
  assert.notEqual(sourceInput, destinationInput);
  assert.deepEqual(destinationSegmentLane.gain.sets, [ [ 0, 1 ] ]);
  assert.deepEqual(destinationSegmentLane.gain.ramps, [ [ 1, 1.5 ] ]);
  assert.equal(
    context.sources.some(node => node.buffer.fake === 1001),
    false,
    "the destination route lane exists before its media resolves",
  );

  context.currentTime = 0.25;
  pending.resolve({ fake: 1001 });
  await tick();
  const destination = context.sources.find(node => node.buffer.fake === 1001);

  assert.equal(destination.connectedTo.connectedTo, destinationSegmentLane);
  assert.deepEqual(
    destinationSegmentLane.gain.ramps,
    [ [ 1, 1.5 ] ],
    "late media enters the already-authored destination fade",
  );

  engine.Dispose();
  mixer.Dispose();
  runtime.Dispose();
});

test("music track routes combine authored base gain with live ancestor Bus Volume", async () =>
{
  const { context, engine } = Harness(graph =>
  {
    Object.assign(graph.nodes[TRACK_A], {
      outputBusId: "928",
      busPathIds: [ "928", "500", "1" ],
      authoredBusVolumeDb: -6,
      authoredBusMakeUpGainDb: 2,
      authoredOutputBusVolumeDb: 3,
    });
  });
  const states = new Map([
    [ "500", {
      fromDb: -6,
      toDb: -12,
      startTime: 0,
      duration: 4,
      curve: 4,
    } ],
  ]);

  engine.PostEvent(
    "music_test_play",
    703,
    () => {},
    { busVolumeStates: states },
  );
  await tick();

  const segmentGain = context.gains[2];
  const routeGain = context.gains.find(gain =>
    gain !== segmentGain && gain.connectedTo === segmentGain);

  assert.ok(routeGain, "the routed track owns a separate gain stage");
  assert.equal(context.sources[0].connectedTo, routeGain);
  assert.ok(Math.abs(routeGain.gain.value - 10 ** (-7 / 20)) < 1e-6);
  assert.equal(routeGain.gain.curves.length, 1);
  assert.equal(routeGain.gain.curves[0][1], 0);
  assert.equal(routeGain.gain.curves[0][2], 4);
  assert.ok(
    Math.abs(routeGain.gain.curves[0][0].at(-1) - 10 ** (-13 / 20))
      < 1e-6,
    "the live transition ends after the authored base remains applied",
  );

  states.set("500", {
    fromDb: 0,
    toDb: 0,
    startTime: 0,
    duration: 0,
    curve: 4,
  });
  engine.RefreshBusVolumeGains();
  assert.ok(
    Math.abs(routeGain.gain.value - 10 ** (-1 / 20)) < 1e-6,
    "Reset preserves authored Bus Volume, Make-Up Gain, and Output Bus Volume",
  );

  engine.SetMusicVolume(0.25);
  assert.equal(context.gains[0].gain.value, 0.25);
  assert.ok(Math.abs(routeGain.gain.value - 10 ** (-1 / 20)) < 1e-6);

  engine.ExecuteAction("stop", 703, 0);
  engine.Process();
  assert.equal(routeGain.disconnected, true);
});

test("music track dry routes realize static Wwise Parametric EQ", async () =>
{
  const busEffects = {
    schemaVersion: 1,
    buses: {
      "500": [ {
        effectId: "900",
        slotIndex: 1,
        type: "parametric-eq",
        bands: [
          {
            index: 1,
            filterType: "peaking",
            gainDb: -13,
            frequencyHz: 120,
            q: 5,
          },
          {
            index: 2,
            filterType: "highshelf",
            gainDb: 0,
            frequencyHz: 12000,
            q: 1,
          },
        ],
        outputGainDb: 0,
        processLfe: true,
      } ],
    },
  };
  const { context, engine } = Harness(graph =>
  {
    Object.assign(graph.nodes[TRACK_A], {
      outputBusId: "500",
      busPathIds: [ "500" ],
    });
  }, { busEffects });

  engine.PostEvent("music_test_play", 704, () => {});
  await tick();

  const [ peaking, shelf ] = context.filters;
  const routeGain = context.sources[0].connectedTo;

  assert.equal(context.filters.length, 2);
  assert.equal(peaking.type, "peaking");
  assert.equal(peaking.frequency.value, 120);
  assert.equal(peaking.Q.value, 5);
  assert.equal(peaking.gain.value, -13);
  assert.equal(routeGain.connectedTo, peaking);
  assert.equal(peaking.connectedTo, shelf);
  assert.equal(shelf.connectedTo, context.gains[2]);

  engine.ExecuteAction("stop", 704, 0);
  engine.Process();
  assert.equal(peaking.disconnected, true);
  assert.equal(shelf.disconnected, true);
});

test("music routes apply dynamic ancestor Bus Volume RTPC scaling", async () =>
{
  let control = 1;
  const busRtpcs = {
    schemaVersion: 1,
    buses: {
      "500": [ {
        curveId: 77,
        rtpc: "menu_main_music_level",
        defaultValue: 1,
        scaling: 2,
        points: [
          { x: 0, value: -1, interpolation: 4 },
          { x: 1, value: 0, interpolation: 4 },
        ],
      } ],
    },
  };
  const { context, engine } = Harness(graph =>
  {
    Object.assign(graph.nodes[TRACK_A], {
      outputBusId: "928",
      busPathIds: [ "928", "500", "1" ],
      authoredBusVolumeDb: -3,
    });
  }, {
    busRtpcs,
    getGlobalRTPC: () => control,
  });

  engine.PostEvent("music_test_play", 704, () => {});
  await tick();

  const segmentGain = context.gains[2];
  const routeGain = context.gains.find(gain =>
    gain !== segmentGain && gain.connectedTo === segmentGain);

  assert.ok(Math.abs(routeGain.gain.value - 10 ** (-3 / 20)) < 1e-6);

  control = 0.5;
  engine.RefreshBusRtpcs();
  const scaledDb = -3 + 20 * Math.log10(0.5);

  assert.ok(
    Math.abs(routeGain.gain.value - 10 ** (scaledDb / 20)) < 1e-6,
  );
});

test("music tracks apply authored global Voice Volume RTPC curves", async () =>
{
  let control;
  const { context, engine } = Harness(graph =>
  {
    graph.nodes[TRACK_A].rtpcCurves = [ {
      property: "volume",
      rtpc: "music_intensity",
      scope: "global",
      scaling: 2,
      defaultValue: 0.5,
      points: [
        { x: 0, value: -1, interpolation: 4 },
        { x: 1, value: 0, interpolation: 4 },
      ],
    } ];
  }, {
    getGlobalRTPC: () => control,
  });

  engine.PostEvent("music_test_play", 705, () => {});
  await tick();

  const trackGain = context.sources[0].connectedTo;

  assert.equal(trackGain.connectedTo, context.gains[2]);
  assert.ok(Math.abs(trackGain.gain.value - 0.5) < 1e-6);

  control = 0.25;
  engine.RefreshBusRtpcs();
  assert.ok(Math.abs(trackGain.gain.value - 0.25) < 1e-6);
});

test("shared legacy Bus effects retain independent track Voice Volume RTPC gains", async () =>
{
  const { busEffects } = MusicEqFixture();
  const { context, engine } = Harness(graph =>
  {
    graph.nodes[SEGMENT_A].children.push(TRACK_B);
    graph.nodes[TRACK_A].busPathIds = [ "500", "1" ];
    graph.nodes[TRACK_B].busPathIds = [ "500", "1" ];
    graph.nodes[TRACK_A].rtpcCurves = [ {
      property: "volume",
      rtpc: "music_track_a",
      scope: "global",
      scaling: 2,
      defaultValue: 0,
      points: [ { x: 0, value: -0.5, interpolation: 4 } ],
    } ];
    graph.nodes[TRACK_B].rtpcCurves = [ {
      property: "volume",
      rtpc: "music_track_b",
      scope: "global",
      scaling: 2,
      defaultValue: 0,
      points: [ { x: 0, value: 0, interpolation: 4 } ],
    } ];
  }, { busEffects });

  engine.PostEvent("music_test_play", 706, () => {});
  await tick();

  assert.equal(context.sources.length, 2);
  const sourceA = context.sources.find(source => source.buffer.fake === 111);
  const sourceB = context.sources.find(source => source.buffer.fake === 222);

  assert.notEqual(sourceA.connectedTo, sourceB.connectedTo);
  assert.equal(sourceA.connectedTo.connectedTo, sourceB.connectedTo.connectedTo);
  assert.equal(context.filters.length, 1);
  assert.ok(
    Math.abs(sourceA.connectedTo.gain.value - 0.5) < 1e-6,
    `track A gain was ${sourceA.connectedTo.gain.value}`,
  );
  assert.equal(sourceB.connectedTo.gain.value, 1);
});

test("music routes apply Immediate ancestor Bus Volume State gain", async () =>
{
  let state = "off";
  const busStates = {
    schemaVersion: 1,
    buses: {
      "500": [ {
        groupId: "600",
        group: "mix_state",
        syncType: 0,
        effectiveSyncType: 0,
        states: [ {
          stateId: "602",
          state: "on",
          gainDb: -6,
        } ],
      } ],
    },
  };
  const { context, engine } = Harness(graph =>
  {
    Object.assign(graph.nodes[TRACK_A], {
      outputBusId: "928",
      busPathIds: [ "928", "500", "1" ],
      authoredBusVolumeDb: -3,
    });
  }, {
    busStates,
    getGlobalStatePropertyWeights: () => [ { state, weight: 1 } ],
  });

  engine.PostEvent("music_test_play", 704, () => {});
  await tick();

  const segmentGain = context.gains[2];
  const routeGain = context.gains.find(gain =>
    gain !== segmentGain && gain.connectedTo === segmentGain);

  assert.ok(Math.abs(routeGain.gain.value - 10 ** (-3 / 20)) < 1e-6);

  state = "on";
  engine.RefreshBusStates();
  assert.ok(Math.abs(routeGain.gain.value - 10 ** (-9 / 20)) < 1e-6);
});

test("music routes apply Bus State filters while Bus Pitch leaves timing unchanged", async () =>
{
  let state = "off";
  const busStates = {
    schemaVersion: 2,
    filterBehavior: "additive",
    buses: {
      "500": [ {
        groupId: "600",
        group: "mix_state",
        syncType: 0,
        effectiveSyncType: 0,
        states: [ {
          stateId: "602",
          state: "on",
          pitchCents: -100,
          lowPass: 60,
          highPass: 25,
        } ],
      } ],
    },
  };
  const { context, engine } = Harness(graph =>
  {
    Object.assign(graph.nodes[TRACK_A], {
      outputBusId: "928",
      busPathIds: [ "928", "500", "1" ],
    });
  }, {
    busStates,
    getGlobalStatePropertyWeights: () => [ { state, weight: 1 } ],
  });

  engine.PostEvent("music_test_play", 704, () => {});
  await tick();

  assert.equal(context.filters.length, 2);
  assert.equal(context.filters[0].type, "lowpass");
  assert.equal(context.filters[1].type, "highpass");
  assert.equal(context.filters[0].frequency.value, 20000);
  assert.equal(context.filters[1].frequency.value, 17);
  assert.equal(context.sources[0].playbackRate, undefined);

  state = "on";
  engine.RefreshBusStates();
  assert.equal(context.filters[0].frequency.value, 528);
  assert.equal(context.filters[1].frequency.value, 145);
  assert.equal(context.sources[0].playbackRate, undefined);

  engine.Dispose();
  assert.equal(context.filters[0].disconnected, true);
  assert.equal(context.filters[1].disconnected, true);
});

test("music routes share Audio Bus ducking activity with SFX", async () =>
{
  const busDuckingController = new CjsBusDuckingController({
    schemaVersion: 1,
    sources: {
      "100": {
        recoveryMs: 0,
        maxDuckVolumeDb: -12,
        targets: [ {
          targetBusId: "200",
          volumeDb: -6,
          fadeOutMs: 0,
          fadeInMs: 0,
          curve: 4,
          targetProperty: "bus-volume",
        } ],
      },
    },
  });
  const sourceMusic = Harness(graph =>
  {
    Object.assign(graph.nodes[TRACK_A], {
      outputBusId: "100",
      busPathIds: [ "100" ],
    });
  }, { busDuckingController });

  sourceMusic.engine.PostEvent("music_test_play", 705, () => {});
  await tick();
  sourceMusic.context.currentTime = 1;
  assert.ok(Math.abs(
    busDuckingController.EvaluateGainDb([ "200" ], 1) + 6,
  ) < 1e-9);

  sourceMusic.context.sources[0].onended();
  assert.equal(busDuckingController.EvaluateGainDb([ "200" ], 1), 0);
  sourceMusic.engine.Dispose();

  const sfxActivity = busDuckingController.ScheduleActivity([ "100" ], 0, 10);
  const targetMusic = Harness(graph =>
  {
    Object.assign(graph.nodes[TRACK_A], {
      outputBusId: "200",
      busPathIds: [ "200" ],
    });
  }, { busDuckingController });

  targetMusic.context.currentTime = 1;
  targetMusic.engine.PostEvent("music_test_play", 706, () => {});
  await tick();
  const segmentGain = targetMusic.context.gains[2];
  const routeGain = targetMusic.context.gains.find(gain =>
    gain !== segmentGain && gain.connectedTo === segmentGain);

  assert.ok(Math.abs(routeGain.gain.value - 10 ** (-6 / 20)) < 1e-6);
  sfxActivity.End(1);
  targetMusic.engine.Dispose();
});

test("disposing music before a future clip start cancels its ducking activity", async () =>
{
  const busDuckingController = new CjsBusDuckingController({
    schemaVersion: 1,
    sources: {
      "100": {
        recoveryMs: 2000,
        maxDuckVolumeDb: -12,
        targets: [ {
          targetBusId: "200",
          volumeDb: -6,
          fadeOutMs: 0,
          fadeInMs: 0,
          curve: 4,
          targetProperty: "bus-volume",
        } ],
      },
    },
  });
  const { context, engine } = Harness(graph =>
  {
    Object.assign(graph.nodes[TRACK_A], {
      outputBusId: "100",
      busPathIds: [ "100" ],
      clips: [ {
        trackId: 0,
        sourceId: 111,
        eventId: 0,
        playAt: 5000,
        beginTrimOffset: 0,
        endTrimOffset: 0,
        srcDuration: 1000,
      } ],
    });
  }, { busDuckingController });

  engine.PostEvent("music_test_play", 707, () => {});
  await tick();
  assert.equal(context.sources[0].startedAt, 4);

  engine.Dispose();
  assert.equal(busDuckingController.EvaluateGainDb([ "200" ], 5), 0);
});

test("an early music end shortens a later requested fade-stop activity", async () =>
{
  const busDuckingController = new CjsBusDuckingController({
    schemaVersion: 1,
    sources: {
      "100": {
        recoveryMs: 2000,
        maxDuckVolumeDb: -12,
        targets: [ {
          targetBusId: "200",
          volumeDb: -6,
          fadeOutMs: 0,
          fadeInMs: 0,
          curve: 4,
          targetProperty: "bus-volume",
        } ],
      },
    },
  });
  const { context, engine } = Harness(graph =>
  {
    Object.assign(graph.nodes[TRACK_A], {
      outputBusId: "100",
      busPathIds: [ "100" ],
    });
  }, { busDuckingController });

  engine.PostEvent("music_test_play", 708, () => {});
  await tick();
  context.currentTime = 2;
  engine.ExecuteAction("stop", 708, 6000);
  assert.equal(context.sources[0].stoppedAt, 8);

  context.currentTime = 5;
  context.sources[0].onended();
  assert.equal(busDuckingController.EvaluateGainDb([ "200" ], 7.5), 0);
  engine.Dispose();
});
