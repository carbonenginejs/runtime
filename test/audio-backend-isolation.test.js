import test from "node:test";
import assert from "node:assert/strict";
import { CjsAudioBackend, CjsSfxEngine } from "../npm/dist/index.js";
import { CjsBusDuckingController } from "../src/internal/busDucking.js";
import { CjsBusGraphRuntime } from "../src/internal/busGraphRuntime.js";
import { CjsSharedBusMixer } from "../src/internal/busGraphMixer.js";

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

function FakeContext({ withAnalyser = false } = {})
{
  const context = {
    currentTime: 0,
    sampleRate: 48000,
    destination: { name: "destination" },
    gains: [],
    filters: [],
    panners: [],
    analysers: [],
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
        connectedTo: null,
        disconnected: false,
        connect(target)
        {
          node.connectedTo = target;
        },
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
        gain: FakeParam(0),
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
  if (withAnalyser)
  {
    context.createAnalyser = () =>
    {
      const analyser = {
        fftSize: 0,
        connectedTo: null,
        disconnected: false,
        sampleValue: 0.25,
        connect(target)
        {
          analyser.connectedTo = target;
        },
        disconnect()
        {
          analyser.disconnected = true;
        },
        getFloatTimeDomainData(samples)
        {
          samples.fill(analyser.sampleValue);
        },
      };

      context.analysers.push(analyser);
      return analyser;
    };
  }
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
  stateTransitions,
  busRtpcs,
  busStates,
  busDuckingController,
  busEffects,
  busGraphRuntime,
  busMixer,
  busMixerFactory,
  distanceScale,
  withAnalyser,
} = {})
{
  const context = FakeContext({ withAnalyser });
  const resolvedBusMixer = busMixerFactory?.(context) ?? busMixer;
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
    stateTransitions,
    busRtpcs,
    busStates,
    busDuckingController,
    busEffects,
    busGraphRuntime,
    busMixer: resolvedBusMixer,
    distanceScale,
  });
  backend.RegisterGameObj(1);
  return { context, finished, emitter, backend };
}

function RouteEqFixture()
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
        "900": [ {
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

function RouteRuntime({ blockedRouteB = false, withEq = false } = {})
{
  const catalog = {
    schemaVersion: 1,
    effects: {},
    buses: {
      "1": {
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
      },
      "900": {
        type: "audio-bus",
        parentBusId: "1",
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
      },
      "901": {
        type: "audio-bus",
        parentBusId: "1",
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
        requiresProcessing: blockedRouteB ? [ "state" ] : [],
      },
    },
    routes: [
      {
        outputBusId: "900",
        busPathIds: [ "900", "1" ],
        userAuxSends: [],
      },
      {
        outputBusId: "901",
        busPathIds: [ "901", "1" ],
        userAuxSends: [],
      },
    ],
    sfxRoutes: {
      "100": 0,
      "101": 1,
    },
    musicRoutes: {},
  };

  if (withEq)
  {
    catalog.effects["990"] = RouteEqFixture().graphEffect;
    catalog.buses["900"].effects = [ {
      slotIndex: 0,
      effectId: "990",
      bypass: false,
      shareSet: true,
      rendered: false,
    } ];
    catalog.buses["900"].requiresProcessing = [ "effects" ];
  }
  return new CjsBusGraphRuntime(catalog);
}

function RoutedVoice(nodeId, spatial = true)
{
  const outputBusId = nodeId === "100" ? "900" : "901";

  return {
    buffer: { duration: 2 },
    spatial,
    busRouteNodeId: nodeId,
    busPathIds: [ outputBusId, "1" ],
  };
}

function RouteBranchForSource(source)
{
  return source.connectedTo?.connectedTo?.connectedTo?.connectedTo ?? null;
}

test("graph-backed SFX routes separate exact route and spatial branches", async () =>
{
  const { context, emitter, backend } = Harness({
    busGraphRuntime: RouteRuntime(),
    distanceScale: 2,
    loadBuffer: async eventID => ({
      voices: [
        eventID === 3
          ? RoutedVoice("101")
          : RoutedVoice("100", eventID !== 4),
      ],
    }),
  });

  backend.PostEvent(1, 1, 0, emitter, "route_a_first");
  backend.PostEvent(2, 1, 0, emitter, "route_a_second");
  backend.PostEvent(3, 1, 0, emitter, "route_b");
  backend.PostEvent(4, 1, 0, emitter, "route_a_flat");
  await tick();

  const routeA = RouteBranchForSource(context.sources[0]);
  const routeASecond = RouteBranchForSource(context.sources[1]);
  const routeB = RouteBranchForSource(context.sources[2]);
  const routeAFlat = RouteBranchForSource(context.sources[3]);

  assert.equal(routeASecond, routeA, "one route and mode share one branch");
  assert.notEqual(routeB, routeA, "different authored routes stay separate");
  assert.notEqual(
    routeAFlat,
    routeA,
    "one route keeps spatial and non-spatial signals separate",
  );
  assert.ok(context.panners.includes(routeA.connectedTo));
  assert.ok(context.panners.includes(routeB.connectedTo));
  assert.equal(routeAFlat.connectedTo, context.gains[1]);

  backend.SetPosition(1, [ 1, 0, 0 ], [ 0, 1, 0 ], [ 2, 3, 4 ]);
  assert.equal(backend.SetScalingFactor(1, 3), true);
  for (const panner of [ context.panners[0], routeA.connectedTo, routeB.connectedTo ])
  {
    assert.deepEqual(
      [ panner.positionX.value, panner.positionY.value, panner.positionZ.value ],
      [ 4, 6, 8 ],
    );
    assert.equal(panner.refDistance, 3);
  }

  backend.Dispose();
  assert.equal(routeA.disconnected, true);
  assert.equal(routeB.disconnected, true);
  assert.equal(routeAFlat.disconnected, true);
  assert.equal(routeA.connectedTo.disconnected, true);
  assert.equal(routeB.connectedTo.disconnected, true);
  backend.Dispose();
});

test("object RTPC adapters replay and update every graph-backed emitter route", async () =>
{
  const applied = [];
  const { emitter, backend } = Harness({
    busGraphRuntime: RouteRuntime(),
    applyRTPC: value => applied.push(value),
    loadBuffer: async eventID => ({
      voices: [
        eventID === 3
          ? RoutedVoice("101")
          : RoutedVoice("100", eventID !== 2),
      ],
    }),
  });

  backend.SetRTPCValue("route_mix", 0.25, 1);
  assert.equal(applied.length, 1, "the legacy adapter target remains intact");

  backend.PostEvent(1, 1, 0, emitter, "route_a");
  backend.PostEvent(1, 1, 0, emitter, "route_a_again");
  backend.PostEvent(2, 1, 0, emitter, "route_a_flat");
  backend.PostEvent(3, 1, 0, emitter, "route_b");
  await tick();

  const replays = applied.filter(value => value.busGraphRoute);

  assert.equal(replays.length, 3, "each lazy route/mode branch replays once");
  assert.equal(replays.filter(value => value.gain).length, 2);
  assert.equal(replays.filter(value => value.flatGain).length, 1);
  assert.equal(new Set(replays.map(value => value.busGraphRoute)).size, 2);

  const before = applied.length;

  backend.SetRTPCValue("route_mix", 0.75, 1);
  const updates = applied.slice(before);

  assert.equal(updates.length, 4, "legacy plus three graph branches update");
  assert.equal(updates.filter(value => value.busGraphRoute).length, 3);
  assert.ok(updates.every(value => value.value === 0.75));
});

test("graph-backed route branches retire with their emitter generation", async () =>
{
  const { context, emitter, backend } = Harness({
    busGraphRuntime: RouteRuntime(),
    loadBuffer: async eventID => ({
      voices: [ RoutedVoice(eventID === 2 ? "101" : "100") ],
    }),
  });

  backend.SetPosition(1, [ 0, 0, -1 ], [ 0, 1, 0 ], [ 1, 2, 3 ]);
  backend.SetScalingFactor(1, 4);
  backend.PostEvent(1, 1, 0, emitter, "old_route_a");
  backend.PostEvent(2, 1, 0, emitter, "old_route_b");
  await tick();

  const oldRouteA = RouteBranchForSource(context.sources[0]);
  const oldRouteB = RouteBranchForSource(context.sources[1]);
  const oldPannerA = oldRouteA.connectedTo;
  const oldPannerB = oldRouteB.connectedTo;

  backend.UnregisterGameObj(1);
  backend.RegisterGameObj(1);
  backend.SetPosition(1, [ 1, 0, 0 ], [ 0, 1, 0 ], [ 7, 8, 9 ]);
  backend.PostEvent(1, 1, 0, emitter, "new_route_a");
  await tick();

  const newRouteA = RouteBranchForSource(context.sources[2]);

  assert.notEqual(newRouteA, oldRouteA);
  assert.deepEqual(
    [ oldPannerA.positionX.value, oldPannerA.positionY.value, oldPannerA.positionZ.value ],
    [ 1, 2, 3 ],
  );
  assert.equal(oldPannerA.refDistance, 4);
  assert.deepEqual(
    [
      newRouteA.connectedTo.positionX.value,
      newRouteA.connectedTo.positionY.value,
      newRouteA.connectedTo.positionZ.value,
    ],
    [ 7, 8, 9 ],
  );

  context.sources[0].onended();
  assert.equal(oldPannerA.disconnected, false);
  assert.equal(oldPannerB.disconnected, false);

  context.sources[1].onended();
  assert.equal(oldPannerA.disconnected, true);
  assert.equal(oldPannerB.disconnected, true);
  assert.equal(newRouteA.connectedTo.disconnected, false);

  backend.ReleaseGameObj(1);
  assert.equal(newRouteA.connectedTo.disconnected, true);
});

test("a deferred graph route realizes with its retired generation transform", async () =>
{
  const pending = Deferred();
  const { context, emitter, backend } = Harness({
    busGraphRuntime: RouteRuntime(),
    distanceScale: 2,
    loadBuffer: () => pending.promise,
  });

  backend.SetPosition(1, [ 0, 0, -1 ], [ 0, 1, 0 ], [ 2, 3, 4 ]);
  backend.SetScalingFactor(1, 5);
  backend.PostEvent(1, 1, 0, emitter, "late_old_route");
  await tick();

  backend.UnregisterGameObj(1);
  backend.RegisterGameObj(1);
  backend.SetPosition(1, [ 1, 0, 0 ], [ 0, 1, 0 ], [ 7, 8, 9 ]);
  backend.SetScalingFactor(1, 9);
  pending.resolve({ voices: [ RoutedVoice("100") ] });
  await tick();

  const retiredRoute = RouteBranchForSource(context.sources[0]);
  const retiredPanner = retiredRoute.connectedTo;

  assert.deepEqual(
    [
      retiredPanner.positionX.value,
      retiredPanner.positionY.value,
      retiredPanner.positionZ.value,
    ],
    [ 4, 6, 8 ],
  );
  assert.equal(retiredPanner.refDistance, 5);
  assert.equal(retiredPanner.disconnected, false);

  context.sources[0].onended();
  assert.equal(retiredPanner.disconnected, true);
  assert.equal(context.panners[1].disconnected, false);
});

test("graph route branches retain aggregate emitter analyser output", async () =>
{
  const { context, emitter, backend } = Harness({
    busGraphRuntime: RouteRuntime(),
    withAnalyser: true,
    loadBuffer: async eventID => ({
      voices: [ RoutedVoice("100", eventID !== 2) ],
    }),
  });

  backend.PostEvent(1, 1, 0, emitter, "metered_spatial_route");
  backend.PostEvent(2, 1, 0, emitter, "metered_flat_route");
  await tick();

  const analyser = context.analysers[0];
  const spatialRoute = RouteBranchForSource(context.sources[0]);
  const flatRoute = RouteBranchForSource(context.sources[1]);

  assert.equal(spatialRoute.connectedTo.connectedTo, analyser);
  assert.equal(flatRoute.connectedTo, analyser);
  assert.equal(analyser.connectedTo, context.gains[1]);
  assert.equal(backend.GetGameObjLevel(1), 0.25);
});

test("strict shared mixer consumes only qualified SFX route branches", async () =>
{
  const runtime = RouteRuntime();
  let mixer = null;
  const { context, emitter, backend } = Harness({
    busGraphRuntime: runtime,
    busMixerFactory: audioContext =>
    {
      mixer = new CjsSharedBusMixer({
        context: audioContext,
        runtime,
        destination: audioContext.destination,
      });
      return mixer;
    },
    loadBuffer: async eventID => ({
      voices: [ RoutedVoice("100", eventID !== 2) ],
    }),
  });

  backend.RegisterGameObj(2);
  backend.PostEvent(1, 1, 0, emitter, "spatial_route_a");
  backend.PostEvent(2, 1, 0, emitter, "flat_route_a");
  backend.PostEvent(1, 2, 0, emitter, "other_emitter_route_a");
  await tick();

  const spatialA = RouteBranchForSource(context.sources[0]);
  const flatA = RouteBranchForSource(context.sources[1]);
  const otherEmitterA = RouteBranchForSource(context.sources[2]);
  const mixerInput = spatialA.connectedTo.connectedTo;

  assert.equal(flatA.connectedTo, mixerInput);
  assert.equal(otherEmitterA.connectedTo.connectedTo, mixerInput);
  assert.notEqual(mixerInput, context.gains[1]);
  backend.SetSfxVolume(0.4);
  assert.equal(mixerInput.gain.value, 0.4);

  backend.Dispose();
  assert.equal(mixerInput.disconnected, false, "the system-owned mixer outlives the backend");
  mixer.Dispose();
  assert.equal(mixerInput.disconnected, true);
});

test("qualified SFX routes realize static EQ once after spatialization", async () =>
{
  const runtime = RouteRuntime({ withEq: true });
  const { busEffects } = RouteEqFixture();
  let mixer = null;
  const { context, emitter, backend } = Harness({
    busEffects,
    busGraphRuntime: runtime,
    busMixerFactory: audioContext =>
    {
      mixer = new CjsSharedBusMixer({
        context: audioContext,
        runtime,
        destination: audioContext.destination,
      });
      return mixer;
    },
    loadBuffer: async () => ({ voices: [ RoutedVoice("100") ] }),
  });

  backend.PostEvent(1, 1, 0, emitter, "shared_eq_a");
  backend.PostEvent(2, 1, 0, emitter, "shared_eq_b");
  await tick();

  const firstBranch = RouteBranchForSource(context.sources[0]);
  const secondBranch = RouteBranchForSource(context.sources[1]);
  const panner = firstBranch.connectedTo;
  const mixerInput = panner.connectedTo;
  const busInput = mixerInput.connectedTo;
  const eq = busInput.connectedTo;

  assert.equal(secondBranch, firstBranch);
  assert.equal(context.filters.length, 1, "voices do not duplicate the shared EQ");
  assert.equal(eq.type, "peaking");
  assert.equal(eq.frequency.value, 120);
  assert.equal(eq.gain.value, -13);
  assert.equal(eq.disconnected, false);

  context.sources[0].onended();
  context.sources[1].onended();
  assert.equal(eq.disconnected, false, "voice lifetime does not own shared Bus effects");
  backend.Dispose();
  assert.equal(eq.disconnected, false);
  mixer.Dispose();
  assert.equal(eq.disconnected, true);
});

test("blocked SFX routes retain the legacy destination without partial mixer use", async () =>
{
  const runtime = RouteRuntime({ blockedRouteB: true });
  let mixer = null;
  const { context, emitter, backend } = Harness({
    busGraphRuntime: runtime,
    busMixerFactory: audioContext =>
    {
      mixer = new CjsSharedBusMixer({
        context: audioContext,
        runtime,
        destination: audioContext.destination,
      });
      return mixer;
    },
    loadBuffer: async () => ({ voices: [ RoutedVoice("101") ] }),
  });

  backend.PostEvent(1, 1, 0, emitter, "blocked_route_b");
  await tick();

  const branch = RouteBranchForSource(context.sources[0]);

  assert.equal(branch.connectedTo.connectedTo, context.gains[1]);
  assert.equal(mixer.GetInput(runtime.ResolveSfxRoute("101"), "sfx"), null);
});

test("qualified SFX mixer branches preserve aggregate emitter metering", async () =>
{
  const runtime = RouteRuntime();
  const { context, emitter, backend } = Harness({
    busGraphRuntime: runtime,
    withAnalyser: true,
    busMixerFactory: audioContext => new CjsSharedBusMixer({
      context: audioContext,
      runtime,
      destination: audioContext.destination,
    }),
    loadBuffer: async eventID => ({
      voices: [ RoutedVoice("100", eventID !== 2) ],
    }),
  });

  context.analysers[0].sampleValue = 0;
  backend.PostEvent(1, 1, 0, emitter, "metered_spatial_mixer_route");
  backend.PostEvent(2, 1, 0, emitter, "metered_flat_mixer_route");
  await tick();

  const spatial = RouteBranchForSource(context.sources[0]);
  const flat = RouteBranchForSource(context.sources[1]);
  const spatialAnalyser = spatial.connectedTo.connectedTo;
  const flatAnalyser = flat.connectedTo;

  assert.equal(spatialAnalyser, context.analysers[1]);
  assert.equal(flatAnalyser, context.analysers[2]);
  assert.equal(spatialAnalyser.connectedTo, flatAnalyser.connectedTo);
  assert.equal(backend.GetGameObjLevel(1), 0.5);
});

function ContinuousSwitchGraph()
{
  return {
    schemaVersion: 2,
    events: {
      continuous_switch: [ { nodeId: "10" } ],
    },
    programs: {
      stop_switch_root: [
        {
          kind: "stop",
          targetId: "10",
          targetFlags: 0,
          scope: "game-object",
          mode: "element",
          transitionMs: 0,
          curve: 4,
          exceptions: [],
        },
      ],
      stop_switch_leaf: [
        {
          kind: "stop",
          targetId: "11",
          targetFlags: 0,
          scope: "game-object",
          mode: "element",
          transitionMs: 0,
          curve: 4,
          exceptions: [],
        },
      ],
    },
    nodes: {
      "10": {
        type: "switch",
        scope: "switch",
        group: "mode",
        cases: {
          a: { nodeId: "11" },
          b: { nodeId: "12" },
          c: { nodeId: "13" },
          mute: { nodeId: "14" },
        },
        default: { nodeId: "14" },
        continuous: {
          transitions: {
            "11": { fadeOutMs: 100, fadeInMs: 200 },
            "12": { fadeOutMs: 250, fadeInMs: 500 },
            "13": { fadeOutMs: 750, fadeInMs: 300 },
            "14": { fadeOutMs: 0, fadeInMs: 0 },
          },
        },
      },
      "11": { type: "sound", mediaId: "100" },
      "12": { type: "sound", mediaId: "200" },
      "13": { type: "sound", mediaId: "300" },
      "14": { type: "silence" },
    },
  };
}

function ProgramVoiceResult(program, duration = 1)
{
  return {
    voices: program.flatMap(operation =>
      operation.kind === "play"
        ? operation.selections.map(selection => ({
            ...selection,
            buffer: { duration },
          }))
        : []),
  };
}

function ContinuousSwitchHarness({ loadBuffer, continueProgram } = {})
{
  const engine = new CjsSfxEngine({
    graph: ContinuousSwitchGraph(),
  });
  return {
    engine,
    ...Harness({
      resolveSfxProgram: (_eventID, eventName, controls) =>
        engine.ResolveProgram(eventName, controls),
      continueSfxProgram: continueProgram ?? ((token, controls) =>
        engine.ContinueProgram(token, controls)),
      loadBuffer: loadBuffer ?? (async (
        _eventID,
        _eventName,
        _controls,
        program,
      ) => ProgramVoiceResult(program)),
    }),
  };
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

test("Continuous Switch survives natural completion and authored silence", async () =>
{
  const { backend, context, emitter, finished } =
    ContinuousSwitchHarness();

  backend.SetSwitch("mode", "a", 1);
  const playingID = backend.PostEvent(
    7,
    1,
    0,
    emitter,
    "continuous_switch",
  );
  await tick();

  assert.equal(context.sources.length, 1);
  context.sources[0].onended();

  assert.equal(backend.GetPlayingCount(), 1);
  assert.deepEqual(finished, []);

  backend.SetSwitch("mode", "mute", 1);
  await tick();
  assert.equal(context.sources.length, 1);
  assert.equal(backend.GetPlayingCount(), 1);

  backend.SetSwitch("mode", "b", 1);
  await tick();
  await tick();

  assert.equal(context.sources.length, 2);
  assert.equal(context.sources[1].started, true);
  assert.deepEqual(finished, []);

  backend.ExecuteActionOnPlayingID("stop", playingID, 0);
  context.sources[1].onended();
});

test("authored root Stop terminates a dormant Continuous Switch", async () =>
{
  const { backend, context, emitter, finished } =
    ContinuousSwitchHarness();

  backend.SetSwitch("mode", "mute", 1);
  const switchID = backend.PostEvent(
    7,
    1,
    0,
    emitter,
    "continuous_switch",
  );
  await tick();

  assert.equal(context.sources.length, 0);
  assert.equal(backend.GetPlayingCount(), 1);

  const stopID = backend.PostEvent(
    8,
    1,
    0,
    emitter,
    "stop_switch_root",
  );
  await tick();

  assert.equal(backend.GetPlayingCount(), 0);
  assert.deepEqual(
    finished.sort((left, right) => left - right),
    [ switchID, stopID ].sort((left, right) => left - right),
  );
});

test("a leaf Stop preserves its parent Continuous Switch session", async () =>
{
  const { backend, context, emitter, finished } =
    ContinuousSwitchHarness();

  backend.SetSwitch("mode", "a", 1);
  const switchID = backend.PostEvent(
    7,
    1,
    0,
    emitter,
    "continuous_switch",
  );
  await tick();
  const stopID = backend.PostEvent(
    8,
    1,
    0,
    emitter,
    "stop_switch_leaf",
  );
  await tick();

  assert.equal(context.sources[0].stoppedAt, context.currentTime);
  context.sources[0].onended();
  assert.equal(backend.GetPlayingCount(), 1);
  assert.deepEqual(finished, [ stopID ]);

  backend.SetSwitch("mode", "b", 1);
  await tick();
  await tick();

  assert.equal(context.sources.length, 2);
  assert.equal(context.sources[1].started, true);
  assert.equal(backend.GetPlayingCount(), 1);
  assert.equal(finished.includes(switchID), false);

  backend.ExecuteActionOnPlayingID("stop", switchID, 0);
  context.sources[1].onended();
});

test("Continuous Switch applies the outgoing and incoming child fades", async () =>
{
  const { backend, context, emitter } = ContinuousSwitchHarness();

  backend.SetSwitch("mode", "a", 1);
  const playingID = backend.PostEvent(
    7,
    1,
    0,
    emitter,
    "continuous_switch",
  );
  await tick();

  context.currentTime = 1;
  backend.SetSwitch("mode", "b", 1);
  await tick();
  await tick();

  assert.equal(context.sources.length, 2);
  assert.ok(Math.abs(context.sources[0].stoppedAt - 1.1) < 1e-9);

  const transitionGain = context.sources[1].connectedTo.connectedTo;
  assert.deepEqual(
    transitionGain.gain.ramps,
    [ [ 1, context.sources[1].startedAt + 0.5 ] ],
  );

  backend.ExecuteActionOnPlayingID("stop", playingID, 0);
  context.sources[0].onended();
  context.sources[1].onended();
});

test("rapid Continuous Switch changes discard stale route loads", async () =>
{
  const initial = Deferred();
  const middle = Deferred();
  let initialProgram;
  let middleProgram;
  let middleSignal;
  const harness = ContinuousSwitchHarness({
    loadBuffer: (
      _eventID,
      _eventName,
      controls,
      program,
    ) =>
    {
      const selection = program.find(operation =>
        operation.kind === "play")?.selections?.[0];

      if (selection?.mediaID === "100")
      {
        initialProgram = program;
        return initial.promise;
      }
      if (selection?.mediaID === "200")
      {
        middleProgram = program;
        middleSignal = controls.getSfxProgramSignal(
          selection.programSlotId,
          selection.actionIndex,
          selection.leafIndex,
          selection.programBatchId,
        );
        return middle.promise;
      }
      return ProgramVoiceResult(program);
    },
  });
  const { backend, context, emitter, finished } = harness;

  backend.SetSwitch("mode", "a", 1);
  const playingID = backend.PostEvent(
    7,
    1,
    0,
    emitter,
    "continuous_switch",
  );
  await tick();
  assert.ok(initialProgram);

  backend.SetSwitch("mode", "b", 1);
  await tick();
  assert.ok(middleProgram);

  backend.SetSwitch("mode", "c", 1);
  await tick();
  await tick();

  assert.equal(middleSignal.aborted, true);
  assert.equal(context.sources.length, 1);
  assert.equal(context.sources[0].buffer.duration, 1);

  middle.resolve(ProgramVoiceResult(middleProgram));
  initial.resolve(ProgramVoiceResult(initialProgram));
  await tick();
  await tick();

  assert.equal(
    context.sources.length,
    1,
    "neither obsolete route may revive after its load resolves",
  );
  assert.deepEqual(finished, []);

  backend.ExecuteActionOnPlayingID("stop", playingID, 0);
  context.sources[0].onended();
});

test("malformed Continuous Switch continuation settles a dormant session", async () =>
{
  const engine = new CjsSfxEngine({ graph: ContinuousSwitchGraph() });
  const { backend, context, emitter, finished } = Harness({
    resolveSfxProgram: (_eventID, eventName, controls) =>
      engine.ResolveProgram(eventName, controls),
    continueSfxProgram()
    {
      throw new Error("malformed continuation");
    },
    loadBuffer: async (
      _eventID,
      _eventName,
      _controls,
      program,
    ) => ProgramVoiceResult(program),
  });

  backend.SetSwitch("mode", "a", 1);
  const playingID = backend.PostEvent(
    7,
    1,
    0,
    emitter,
    "continuous_switch",
  );
  await tick();
  context.sources[0].onended();
  assert.equal(backend.GetPlayingCount(), 1);

  backend.SetSwitch("mode", "b", 1);

  assert.equal(backend.GetPlayingCount(), 0);
  assert.deepEqual(finished, [ playingID ]);
});

test("Continuous Switch sessions crossfade, remain dormant, and stop by container", async () =>
{
  const engine = new CjsSfxEngine({
    graph: {
      schemaVersion: 2,
      events: {
        start_switch: [ { nodeId: "1" } ],
        stop_switch: [],
      },
      programs: {
        stop_switch: [
          {
            kind: "stop",
            targetId: "1",
            targetFlags: 0,
            scope: "game-object",
            mode: "element",
            delayMs: 0,
            transitionMs: 0,
            curve: 4,
            actionFlags: 6,
            exceptions: [],
          },
        ],
      },
      nodes: {
        "1": {
          type: "switch",
          scope: "switch",
          group: "mode",
          cases: {
            a: { nodeId: "2" },
            b: { nodeId: "3" },
            silent: { nodeId: "4" },
          },
          default: { nodeId: "4" },
          continuous: {
            transitions: {
              "2": { fadeOutMs: 500, fadeInMs: 100 },
              "3": { fadeOutMs: 750, fadeInMs: 250 },
              "4": { fadeOutMs: 1000, fadeInMs: 0 },
            },
          },
        },
        "2": { type: "sound", mediaId: "100", loop: false },
        "3": { type: "sound", mediaId: "200", loop: false },
        "4": { type: "silence" },
      },
    },
  });
  const loadBuffer = async (
    _eventID,
    _eventName,
    _controls,
    program,
  ) => ({
    voices: program.flatMap(operation =>
      operation.kind === "play"
        ? operation.selections.map(selection => ({
            buffer: {
              duration: 2,
              mediaID: selection.mediaID,
            },
            loop: selection.loop,
            playbackRate: selection.playbackRate,
            programSlotId: selection.programSlotId,
            programBatchId: selection.programBatchId,
            actionIndex: selection.actionIndex,
            leafIndex: selection.leafIndex,
            matchIds: selection.matchIds,
          }))
        : []),
  });
  const { context, emitter, backend } = Harness({
    loadBuffer,
    hasSfxEvent: eventName => engine.HandlesEvent(eventName),
    resolveSfxProgram: (eventID, eventName, controls) =>
      engine.ResolveProgram(eventName, controls),
    continueSfxProgram: (token, controls) =>
      engine.ContinueProgram(token, controls),
  });

  backend.SetSwitch("mode", "a", 1);
  const playingID = backend.PostEvent(
    7,
    1,
    0,
    emitter,
    "start_switch",
  );

  await tick();
  await tick();
  assert.equal(context.sources.length, 1);
  assert.equal(context.sources[0].buffer.mediaID, "100");

  context.currentTime = 1;
  backend.SetSwitch("mode", "b", 1);

  assert.equal(
    context.sources[0].stoppedAt,
    1.5,
    "the outgoing child uses its own authored Fade Out",
  );

  await tick();
  await tick();
  assert.equal(context.sources.length, 2);
  assert.equal(context.sources[1].buffer.mediaID, "200");
  const incomingTransition =
    context.sources[1].connectedTo.connectedTo.gain;

  assert.equal(incomingTransition.sets[0][0], 0);
  assert.ok(
    Math.abs(
      incomingTransition.ramps.at(-1)[1]
        - context.sources[1].startedAt
        - 0.25,
    ) < 1e-9,
    "the incoming child uses its own authored Fade In",
  );

  context.sources[0].onended();
  context.sources[1].onended();
  assert.equal(
    backend.GetPlayingCount(),
    1,
    "a Continuous Switch remains active after its one-shot ends",
  );

  backend.SetSwitch("mode", "silent", 1);
  await tick();
  assert.equal(context.sources.length, 2);
  assert.equal(backend.GetPlayingCount(), 1);

  backend.PostEvent(8, 1, 0, emitter, "stop_switch");
  await tick();
  await tick();

  assert.equal(
    backend.GetPlayingCount(),
    0,
    "an authored Stop targeting the container ends its dormant session",
  );
  assert.ok(playingID > 0);
});

test("Continuous Switch sessions recover from missing and stale route loads", async () =>
{
  const pendingB = Deferred();
  let pendingBResult = null;
  const engine = new CjsSfxEngine({
    graph: {
      schemaVersion: 2,
      events: {
        live_switch: [ { nodeId: "1" } ],
      },
      nodes: {
        "1": {
          type: "switch",
          scope: "switch",
          group: "mode",
          cases: {
            silent: { nodeId: "2" },
            missing: { nodeId: "3" },
            b: { nodeId: "4" },
            c: { nodeId: "5" },
          },
          default: { nodeId: "2" },
          continuous: {
            transitions: {
              "2": { fadeOutMs: 0, fadeInMs: 0 },
              "3": { fadeOutMs: 0, fadeInMs: 0 },
              "4": { fadeOutMs: 0, fadeInMs: 0 },
              "5": { fadeOutMs: 0, fadeInMs: 0 },
            },
          },
        },
        "2": { type: "silence" },
        "3": { type: "sound", mediaId: "100" },
        "4": { type: "sound", mediaId: "200" },
        "5": { type: "sound", mediaId: "300" },
      },
    },
  });
  const voiceResult = program => ({
    voices: program.flatMap(operation =>
      operation.kind === "play"
        ? operation.selections.map(selection => ({
            buffer: {
              duration: 2,
              mediaID: selection.mediaID,
            },
            playbackRate: selection.playbackRate,
            programSlotId: selection.programSlotId,
            programBatchId: selection.programBatchId,
            actionIndex: selection.actionIndex,
            leafIndex: selection.leafIndex,
            matchIds: selection.matchIds,
          }))
        : []),
  });
  const { context, emitter, backend } = Harness({
    loadBuffer: async (_eventID, _eventName, _controls, program) =>
    {
      const mediaID = program.flatMap(operation =>
        operation.kind === "play" ? operation.selections : [])
        [0]?.mediaID;

      if (mediaID === "100")
      {
        return { voices: [] };
      }
      if (mediaID === "200")
      {
        pendingBResult = voiceResult(program);
        return pendingB.promise;
      }
      return voiceResult(program);
    },
    hasSfxEvent: eventName => engine.HandlesEvent(eventName),
    resolveSfxProgram: (_eventID, eventName, controls) =>
      engine.ResolveProgram(eventName, controls),
    continueSfxProgram: (token, controls) =>
      engine.ContinueProgram(token, controls),
  });

  backend.SetSwitch("mode", "silent", 1);
  backend.PostEvent(7, 1, 0, emitter, "live_switch");
  await tick();
  await tick();

  assert.equal(context.sources.length, 0);
  assert.equal(backend.GetPlayingCount(), 1);

  backend.SetSwitch("mode", "missing", 1);
  await tick();
  await tick();
  assert.equal(context.sources.length, 0);
  assert.equal(
    backend.GetPlayingCount(),
    1,
    "an unavailable branch does not destroy the switch session",
  );

  backend.SetSwitch("mode", "b", 1);
  await tick();
  assert.ok(pendingBResult);

  backend.SetSwitch("mode", "c", 1);
  await tick();
  await tick();
  assert.deepEqual(
    context.sources.map(source => source.buffer.mediaID),
    [ "300" ],
  );

  pendingB.resolve(pendingBResult);
  await tick();
  await tick();
  assert.deepEqual(
    context.sources.map(source => source.buffer.mediaID),
    [ "300" ],
    "a superseded acquisition cannot revive its stale child",
  );

  backend.StopAll();
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
  const { context, finished, emitter, backend } = Harness({
    busDuckingController,
    loadBuffer: async () => ({
      voices: [
        {
          buffer: { duration: 1 },
          delayMs: 500,
          busPathIds: [ "100" ],
        },
      ],
    }),
  });
  const playingID = backend.PostEvent(7, 1, 0, emitter, "delayed_hit");

  await tick();
  backend.ExecuteActionOnPlayingID("stop", playingID, 1000);

  assert.equal(context.sources[0].stoppedAt, 0);
  assert.deepEqual(context.gains[3].gain.ramps, []);
  assert.equal(busDuckingController.EvaluateGainDb([ "200" ], 1), 0);
  context.sources[0].onended?.();
  context.sources[0].onended?.();
  assert.deepEqual(finished, [ playingID ]);
  assert.equal(backend.GetPlayingCount(), 0);
});

test("StopAll cancels future SFX ducking activity before delayed playback", async () =>
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
  const { context, emitter, backend } = Harness({
    busDuckingController,
    loadBuffer: async () => ({
      voices: [ {
        buffer: { duration: 1 },
        delayMs: 500,
        busPathIds: [ "100" ],
      } ],
    }),
  });

  backend.PostEvent(7, 1, 0, emitter, "delayed_hit");
  await tick();
  assert.equal(context.sources[0].startedAt, 0.5);

  backend.StopAll();
  assert.equal(busDuckingController.EvaluateGainDb([ "200" ], 1), 0);
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

test("authored State timing rebases interrupted gain, pitch, and filter blends", async () =>
{
  const graph = {
    schemaVersion: 2,
    events: { stateful_engine: [ { nodeId: "1" } ] },
    nodes: {
      "1": {
        type: "sound",
        mediaId: "100",
        stateProperties: [ {
          group: "combat",
          cases: {
            calm: {
              gainDb: 0,
              pitchCents: 0,
              lowPass: 0,
              highPass: 0,
            },
            danger: {
              gainDb: -6.020599913279624,
              pitchCents: 1200,
              lowPass: 50,
              highPass: 40,
            },
          },
        } ],
      },
    },
    stateTransitions: [ {
      groupId: "10",
      group: "combat",
      defaultTransitionMs: 1000,
      states: [
        { stateId: "100", state: "None" },
        { stateId: "11", state: "calm" },
        { stateId: "12", state: "danger" },
      ],
      transitions: [
        {
          fromId: "100",
          from: "None",
          toId: "11",
          to: "calm",
          transitionMs: 0,
        },
        {
          fromId: "11",
          toId: "12",
          transitionMs: 2000,
        },
        {
          fromId: "12",
          from: "danger",
          toId: "11",
          to: "calm",
          transitionMs: 4000,
        },
      ],
    } ],
  };
  const engine = new CjsSfxEngine({ graph });
  let controls;
  const { context, emitter, backend } = Harness({
    stateTransitions: graph.stateTransitions,
    loadBuffer: async (_eventID, eventName, suppliedControls) =>
    {
      controls = suppliedControls;
      const selection = engine.ResolveEvent(eventName, controls)[0];

      return {
        voices: [ {
          buffer: { duration: 10 },
          playbackRate: selection.playbackRate,
          matchIds: selection.matchIds,
          getGain: at => engine.EvaluateGain(
            selection,
            controls,
            undefined,
            at,
          ),
          getGainAtVoiceVolumeDb: (value, at) => engine.EvaluateGain(
            selection,
            controls,
            value,
            at,
          ),
          getPlaybackRate: at => engine.EvaluatePlaybackRate(
            selection,
            controls,
            undefined,
            at,
          ),
          getPlaybackRateAtVoicePitchCents: (value, at) =>
            engine.EvaluatePlaybackRate(
              selection,
              controls,
              value,
              at,
            ),
          getLowPass: at => engine.EvaluateLowPass(
            selection,
            controls,
            at,
          ),
          getHighPass: at => engine.EvaluateHighPass(
            selection,
            controls,
            at,
          ),
        } ],
      };
    },
  });

  backend.SetGlobalState("10", "11");
  backend.PostEvent(7, 1, 0, emitter, "stateful_engine");
  await tick();

  const gain = context.gains[3].gain;
  const sourceRate = context.sources[0].playbackRate;

  assert.deepEqual(gain.curves, []);
  assert.equal(controls.getState("combat"), "calm");
  assert.equal(backend.GetGlobalState("10"), "calm");

  backend.SetGlobalState("10", "12");
  assert.equal(controls.getState("combat"), "danger");
  assert.equal(gain.curves.at(-1)[2], 2);
  assert.ok(Math.abs(gain.curves.at(-1)[0].at(-1) - 0.5) < 1e-6);
  assert.equal(sourceRate.curves.at(-1)[2], 2);
  assert.ok(Math.abs(sourceRate.curves.at(-1)[0].at(-1) - 2) < 1e-6);

  context.currentTime = 1;
  backend.PostEvent(7, 1, 0, emitter, "stateful_engine");
  await tick();

  assert.ok(
    Math.abs(context.gains[5].gain.value - Math.SQRT1_2) < 1e-5,
    "a new voice joins the current State-property gain blend",
  );
  assert.ok(
    Math.abs(context.sources[1].playbackRate.value - Math.SQRT2) < 1e-5,
    "a new voice joins the current State-property pitch blend",
  );
  assert.equal(context.gains[5].gain.curves.at(-1)[2], 1);
  assert.equal(context.filters[2].frequency.curves.at(-1)[2], 1);
  assert.equal(context.filters[3].frequency.curves.at(-1)[2], 1);

  backend.SetGlobalState("combat", "calm");

  const gainCurve = gain.curves.at(-1);
  const pitchCurve = sourceRate.curves.at(-1);

  assert.equal(controls.getState("combat"), "calm");
  assert.equal(gainCurve[2], 4, "the directed danger-to-calm override wins");
  assert.ok(
    Math.abs(gainCurve[0][0] - Math.SQRT1_2) < 1e-5,
    "the interrupted gain transition starts at its current blend",
  );
  assert.ok(Math.abs(gainCurve[0].at(-1) - 1) < 1e-6);
  assert.equal(pitchCurve[2], 4);
  assert.ok(Math.abs(pitchCurve[0][0] - Math.SQRT2) < 1e-5);
  assert.ok(Math.abs(pitchCurve[0].at(-1) - 1) < 1e-6);
  assert.equal(context.filters[0].frequency.curves.at(-1)[2], 4);
  assert.equal(context.filters[1].frequency.curves.at(-1)[2], 4);

  context.currentTime = 2;
  backend.SetGlobalState("combat", "unknown");
  assert.equal(
    gain.curves.at(-1)[2],
    1,
    "an unmatched directed route uses the State Group default",
  );
});

test("a shorter State transition preserves concurrent longer automation", async () =>
{
  const graph = {
    schemaVersion: 2,
    events: { layered_state: [ { nodeId: "1" } ] },
    nodes: {
      "1": {
        type: "sound",
        mediaId: "100",
        stateProperties: [
          {
            group: "weather",
            cases: {
              clear: {
                gainDb: 0,
                pitchCents: 0,
                lowPass: 0,
                highPass: 0,
              },
              storm: {
                gainDb: -6.020599913279624,
                pitchCents: 600,
                lowPass: 20,
                highPass: 10,
              },
            },
          },
          {
            group: "combat",
            cases: {
              calm: {
                gainDb: 0,
                pitchCents: 0,
                lowPass: 0,
                highPass: 0,
              },
              danger: {
                gainDb: -6.020599913279624,
                pitchCents: 600,
                lowPass: 20,
                highPass: 10,
              },
            },
          },
        ],
      },
    },
  };
  const transitions = [
    {
      groupId: "20",
      group: "weather",
      defaultTransitionMs: 7000,
      states: [
        { stateId: "29", state: "None" },
      ],
      transitions: [
        {
          fromId: "21",
          toId: "22",
          transitionMs: 5000,
        },
        {
          fromId: "29",
          from: "None",
          toId: "21",
          to: "clear",
          transitionMs: 0,
        },
        {
          fromId: "22",
          from: "storm",
          toId: "23",
          to: "after_storm",
          transitionMs: 0,
        },
      ],
    },
    {
      groupId: "10",
      group: "combat",
      defaultTransitionMs: 1000,
      states: [
        { stateId: "19", state: "None" },
        { stateId: "11", state: "calm" },
        { stateId: "12", state: "danger" },
      ],
      transitions: [ {
        fromId: "19",
        from: "None",
        toId: "11",
        to: "calm",
        transitionMs: 0,
      } ],
    },
  ];
  const engine = new CjsSfxEngine({ graph });
  let controls;
  const { context, emitter, backend } = Harness({
    stateTransitions: transitions,
    loadBuffer: async (_eventID, eventName, suppliedControls) =>
    {
      controls = suppliedControls;
      const selection = engine.ResolveEvent(eventName, controls)[0];

      return { voices: [ {
        buffer: { duration: 10 },
        getGain: at => engine.EvaluateGain(
          selection,
          controls,
          undefined,
          at,
        ),
        getGainAtVoiceVolumeDb: (value, at) => engine.EvaluateGain(
          selection,
          controls,
          value,
          at,
        ),
        getPlaybackRate: at => engine.EvaluatePlaybackRate(
          selection,
          controls,
          undefined,
          at,
        ),
        getPlaybackRateAtVoicePitchCents: (value, at) =>
          engine.EvaluatePlaybackRate(selection, controls, value, at),
        getLowPass: at => engine.EvaluateLowPass(
          selection,
          controls,
          at,
        ),
        getHighPass: at => engine.EvaluateHighPass(
          selection,
          controls,
          at,
        ),
      } ] };
    },
  });

  backend.SetGlobalState("weather", "clear");
  backend.SetGlobalState("combat", "calm");
  backend.PostEvent(7, 1, 0, emitter, "layered_state");
  await tick();

  backend.SetGlobalState("weather", "storm");
  backend.SetGlobalState("combat", "danger");

  const gainCurves = context.gains[3].gain.curves.slice(-2);
  const pitchCurves = context.sources[0].playbackRate.curves.slice(-2);
  const lowPassCurves = context.filters[0].frequency.curves.slice(-2);
  const highPassCurves = context.filters[1].frequency.curves.slice(-2);

  for (const curves of [
    gainCurves,
    pitchCurves,
    lowPassCurves,
    highPassCurves,
  ])
  {
    assert.deepEqual(
      curves.map(curve => [ curve[1], curve[2] ]),
      [ [ 0, 1 ], [ 1, 4 ] ],
      "each live property lands on the 1s boundary before continuing to 5s",
    );
  }
  assert.ok(Math.abs(gainCurves[0][0].at(-1) - 0.5 ** 1.2) < 1e-6);
  assert.ok(Math.abs(gainCurves[1][0].at(-1) - 0.25) < 1e-6);
});

test("State aliasing preserves numeric music-engine setter arguments", () =>
{
  const calls = [];
  const { backend } = Harness({
    musicEngine: {
      SetState: (...args) => calls.push(args),
    },
    stateTransitions: [ {
      groupId: "10",
      group: "combat",
      defaultTransitionMs: 0,
      states: [ { stateId: "11", state: "calm" } ],
      transitions: [],
    } ],
  });

  backend.SetGlobalState(10, 11);

  assert.deepEqual(calls, [ [ 10, 11 ] ]);
  assert.equal(backend.GetGlobalState("combat"), "calm");
});

test("direct State catalogs reject endpoint identity collisions", () =>
{
  assert.throws(
    () => Harness({
      stateTransitions: [ {
        groupId: "10",
        defaultTransitionMs: 0,
        states: [ { stateId: "12", state: "11" } ],
        transitions: [ {
          fromId: "11",
          toId: "12",
          to: "11",
          transitionMs: 0,
        } ],
      } ],
    }),
    /Conflicting State transition identity 11/,
  );
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

test("Game Parameter actions persist, transition, rebase, reset, and cancel externally", async () =>
{
  const programs = {
    initialize: [
      {
        kind: "set-game-parameter",
        actionIndex: 0,
        rtpc: "engine_load",
        scope: "global",
        valueMode: "absolute",
        gameParameterValue: 10,
        defaultValue: 0,
        delayMs: 0,
        transitionMs: 1000,
        curve: 4,
        bypassTransition: false,
      },
      {
        kind: "set-game-parameter",
        actionIndex: 1,
        rtpc: "engine_load",
        scope: "game-object",
        valueMode: "absolute",
        gameParameterValue: 20,
        defaultValue: 0,
        delayMs: 0,
        transitionMs: 2000,
        curve: 4,
        bypassTransition: false,
      },
    ],
    relative: [
      {
        kind: "set-game-parameter",
        actionIndex: 0,
        rtpc: "engine_load",
        scope: "game-object",
        valueMode: "relative",
        gameParameterValue: 5,
        defaultValue: 0,
        delayMs: 0,
        transitionMs: 500,
        curve: 4,
        bypassTransition: false,
      },
    ],
    reset: [
      {
        kind: "reset-game-parameter",
        actionIndex: 0,
        rtpc: "engine_load",
        scope: "game-object",
        defaultValue: 0.05,
        delayMs: 0,
        transitionMs: 0,
        curve: 4,
        bypassTransition: false,
      },
    ],
  };
  const { backend, emitter, context, finished } = Harness({
    resolveSfxProgram: (_eventID, eventName) => programs[eventName],
    loadBuffer: async () => ({ voices: [] }),
  });

  const initialized = backend.PostEvent(1, 1, 0, emitter, "initialize");
  await tick();

  context.currentTime = 0.5;
  assert.equal(backend.GetGlobalRTPCValue("engine_load"), 5);
  assert.equal(backend.GetRTPCValue("engine_load", 1), 5);
  assert.ok(finished.includes(initialized));

  backend.SetRTPCValue("engine_load", 7, 1);
  context.currentTime = 1;
  assert.equal(
    backend.GetRTPCValue("engine_load", 1),
    7,
    "an external setter cancels the object transition only",
  );
  assert.equal(backend.GetGlobalRTPCValue("engine_load"), 10);

  backend.PostEvent(2, 1, 0, emitter, "relative");
  context.currentTime = 1.25;
  assert.equal(backend.GetRTPCValue("engine_load", 1), 9.5);
  context.currentTime = 1.5;
  assert.equal(backend.GetRTPCValue("engine_load", 1), 12);

  backend.PostEvent(3, 1, 0, emitter, "reset");
  assert.equal(
    backend.GetRTPCValue("engine_load", 1),
    0.05,
    "Reset restores the authored project default",
  );
  assert.equal(backend.GetGlobalRTPCValue("engine_load"), 10);
});

test("overdue Game Parameter actions run before a new post captures RTPCs", async () =>
{
  const delayed = [{
    kind: "set-game-parameter",
    actionIndex: 0,
    rtpc: "capture_delay",
    scope: "game-object",
    valueMode: "absolute",
    gameParameterValue: 1,
    defaultValue: 0,
    delayMs: 1000,
    transitionMs: 0,
    curve: 4,
    bypassTransition: false,
  }];
  const { backend, emitter, context } = Harness({
    resolveSfxProgram: (_eventID, eventName, controls) =>
      eventName === "delayed"
        ? delayed
        : [{
            kind: "play",
            actionIndex: 0,
            selections: [{
              actionIndex: 0,
              leafIndex: 0,
              programSlotId: "0:0",
              delayMs: (controls.getRTPC("capture_delay") ?? 0) * 1000,
            }],
          }],
    loadBuffer: async (_eventID, _eventName, _controls, program) =>
      ProgramVoiceResult(program),
  });

  backend.PostEvent(1, 1, 0, emitter, "delayed");
  await tick();
  context.currentTime = 1;
  backend.PostEvent(2, 1, 0, emitter, "play");
  await tick();

  assert.equal(backend.GetRTPCValue("capture_delay", 1), 1);
  assert.equal(context.sources[0].startedAt, 2);
});

test("external object RTPC writes flush other due Game Parameter scopes", async () =>
{
  const programs = {
    play: [{
      kind: "play",
      actionIndex: 0,
      selections: [{
        actionIndex: 0,
        leafIndex: 0,
        programSlotId: "0:0",
      }],
    }],
    delayed: [{
      kind: "set-game-parameter",
      actionIndex: 0,
      rtpc: "global_automation",
      scope: "global",
      valueMode: "absolute",
      gameParameterValue: 1,
      defaultValue: 0,
      delayMs: 1000,
      transitionMs: 1000,
      curve: 4,
      bypassTransition: false,
    }],
  };
  const { backend, emitter, context } = Harness({
    resolveSfxProgram: (_eventID, eventName) => programs[eventName],
    loadBuffer: async (_eventID, _eventName, controls, program) => ({
      voices: program.flatMap(operation => operation.kind === "play"
        ? operation.selections.map(selection => ({
            ...selection,
            buffer: { duration: 4 },
            loop: true,
            getGain: at =>
              1 + (controls.getGlobalRTPC("global_automation", at) ?? 0),
            getGainAtVoiceVolumeDb: (_voiceVolumeDb, at) =>
              1 + (controls.getGlobalRTPC("global_automation", at) ?? 0),
          }))
        : []),
    }),
  });

  backend.PostEvent(1, 1, 0, emitter, "play");
  await tick();
  backend.PostEvent(2, 1, 0, emitter, "delayed");
  await tick();

  context.currentTime = 1;
  backend.SetRTPCValue("unrelated", 5, 1);

  const curve = context.gains[3].gain.curves.at(-1);

  assert.equal(backend.GetGlobalRTPCValue("global_automation"), 0);
  assert.equal(curve[1], 1);
  assert.equal(curve[2], 1);
  assert.equal(curve[0][0], 1);
  assert.equal(curve[0].at(-1), 2);
});

test("delayed Game Parameter actions cancel on Stop and reject stale emitter generations", async () =>
{
  const delayed = [
    {
      kind: "set-game-parameter",
      actionIndex: 0,
      rtpc: "engine_load",
      scope: "game-object",
      valueMode: "absolute",
      gameParameterValue: 9,
      defaultValue: 0,
      delayMs: 1000,
      transitionMs: 0,
      curve: 4,
      bypassTransition: false,
    },
  ];
  const { backend, emitter, context, finished } = Harness({
    resolveSfxProgram: () => delayed,
    loadBuffer: async () => ({ voices: [] }),
  });
  const stopped = backend.PostEvent(1, 1, 0, emitter, "delayed");

  await tick();
  context.currentTime = 0.5;
  backend.ExecuteActionOnPlayingID("stop", stopped, 0);
  context.currentTime = 1;
  backend.RenderAudio();
  assert.equal(backend.GetRTPCValue("engine_load", 1), undefined);
  assert.ok(finished.includes(stopped));

  context.currentTime = 2;
  const stale = backend.PostEvent(2, 1, 0, emitter, "delayed");
  await tick();
  backend.UnregisterGameObj(1);
  backend.RegisterGameObj(1);
  context.currentTime = 3;
  backend.RenderAudio();

  assert.equal(backend.GetRTPCValue("engine_load", 1), undefined);
  assert.ok(finished.includes(stale));
});

test("Game Parameter transitions automate live gain, pitch transport, LPF, and HPF", async () =>
{
  const programs = {
    play: [
      {
        kind: "play",
        actionIndex: 0,
        selections: [
          { actionIndex: 0, leafIndex: 0, matchIds: [ "200" ] },
        ],
      },
    ],
    automate: [
      {
        kind: "set-game-parameter",
        actionIndex: 0,
        rtpc: "automation",
        scope: "game-object",
        valueMode: "absolute",
        gameParameterValue: 1,
        defaultValue: 0,
        delayMs: 0,
        transitionMs: 1000,
        curve: 4,
        bypassTransition: false,
      },
    ],
  };
  const { backend, emitter, context } = Harness({
    resolveSfxProgram: (_eventID, eventName) => programs[eventName],
    loadBuffer: async (_eventID, _eventName, controls, program) => ({
      voices: program.flatMap(operation => operation.kind === "play"
        ? [ {
            buffer: { duration: 4 },
            loop: true,
            programSlotId: "0:0",
            matchIds: [ "200" ],
            getGain: at => 1 + (controls.getRTPC("automation", at) ?? 0),
            getGainAtVoiceVolumeDb: (_voiceDb, at) =>
              1 + (controls.getRTPC("automation", at) ?? 0),
            getPlaybackRate: at =>
              1 + (controls.getRTPC("automation", at) ?? 0),
            getPlaybackRateAtVoicePitchCents: (_voicePitch, at) =>
              1 + (controls.getRTPC("automation", at) ?? 0),
            getLowPass: at =>
              (controls.getRTPC("automation", at) ?? 0) * 100,
            getHighPass: at =>
              (controls.getRTPC("automation", at) ?? 0) * 100,
          } ]
        : []),
    }),
  });

  backend.PostEvent(1, 1, 0, emitter, "play");
  await tick();
  backend.PostEvent(2, 1, 0, emitter, "automate");

  const gainCurve = context.gains[3].gain.curves.at(-1);
  const pitchCurve = context.sources[0].playbackRate.curves.at(-1);
  const lowPassCurve = context.filters[0].frequency.curves.at(-1);
  const highPassCurve = context.filters[1].frequency.curves.at(-1);

  for (const curve of [ gainCurve, pitchCurve, lowPassCurve, highPassCurve ])
  {
    assert.equal(curve[1], 0);
    assert.equal(curve[2], 1);
    assert.equal(curve[0].length, 65);
  }
  assert.equal(gainCurve[0][0], 1);
  assert.equal(gainCurve[0].at(-1), 2);
  assert.equal(pitchCurve[0][0], 1);
  assert.equal(pitchCurve[0].at(-1), 2);
  assert.equal(lowPassCurve[0][0], 20000);
  assert.equal(lowPassCurve[0].at(-1), 17);
  assert.equal(highPassCurve[0][0], 17);
  assert.equal(highPassCurve[0].at(-1), 20000);

  context.currentTime = 0.5;
  const position = backend.GetSourcePlayPosition(1);
  const elapsed = 0.5 - START_QUANTUM;
  const expectedPosition = Math.round(
    (elapsed + (0.5 ** 2 - START_QUANTUM ** 2) / 2) * 1000,
  );

  assert.ok(
    Math.abs(position - expectedPosition) <= 1,
    "playback position integrates the RTPC-driven pitch ramp",
  );
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

test("Bus Volume targets routed live and future voices without touching other buses", async () =>
{
  const bus = (scope, valueMode, busVolumeDb) => ({
    kind: "set-bus-volume",
    actionIndex: 0,
    targetId: "928",
    targetFlags: 1,
    scope,
    mode: "element",
    valueMode,
    busVolumeDb,
    delayMs: 0,
    transitionMs: 0,
    curve: 4,
    exceptions: [],
  });
  const play = busPathIds => [ {
    kind: "play",
    actionIndex: 0,
    selections: [ {
      actionIndex: 0,
      leafIndex: 0,
      matchIds: [ "200" ],
      busPathIds,
    } ],
  } ];
  const programs = {
    play_warp: play([ "928", "500" ]),
    play_music: play([ "399", "1" ]),
    set_local: [ bus("game-object", "absolute", -6) ],
    set_global: [ bus("global", "absolute", -12) ],
    set_parent: [ {
      ...bus("global", "absolute", -9),
      targetId: "500",
    } ],
    relative_local: [ bus("game-object", "relative", 3) ],
    reset_local: [ {
      kind: "reset-bus-volume",
      actionIndex: 0,
      targetId: "928",
      targetFlags: 1,
      scope: "game-object",
      mode: "element",
      delayMs: 0,
      transitionMs: 0,
      curve: 4,
      exceptions: [],
    } ],
  };
  const { backend, emitter, context } = Harness({
    resolveSfxProgram: (_eventID, eventName) => programs[eventName],
    loadBuffer: async (_eventID, _eventName, _controls, program) => ({
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
              busPathIds: selection.busPathIds,
              getGain: () => 1,
            }))
          : []),
    }),
  });
  backend.RegisterGameObj(2);

  backend.PostEvent(1, 1, 0, emitter, "play_warp");
  backend.PostEvent(2, 2, 0, emitter, "play_warp");
  backend.PostEvent(3, 1, 0, emitter, "play_music");
  await tick();

  const firstWarp = context.sources[0].connectedTo.connectedTo.gain;
  const secondWarp = context.sources[1].connectedTo.connectedTo.gain;
  const music = context.sources[2].connectedTo.connectedTo.gain;

  backend.PostEvent(4, 1, 0, emitter, "set_local");
  assert.ok(Math.abs(firstWarp.value - 10 ** (-6 / 20)) < 1e-12);
  assert.equal(secondWarp.value, 1);
  assert.equal(music.value, 1);

  backend.PostEvent(5, 1, 0, emitter, "relative_local");
  assert.ok(Math.abs(firstWarp.value - 10 ** (-3 / 20)) < 1e-12);

  backend.PostEvent(6, 1, 0, emitter, "set_global");
  assert.ok(Math.abs(firstWarp.value - 10 ** (-12 / 20)) < 1e-12);
  assert.ok(Math.abs(secondWarp.value - 10 ** (-12 / 20)) < 1e-12);
  assert.equal(music.value, 1);

  backend.PostEvent(7, 1, 0, emitter, "play_warp");
  backend.RegisterGameObj(3);
  backend.PostEvent(8, 3, 0, emitter, "play_warp");
  await tick();
  const futureWarp = context.sources[3].connectedTo.connectedTo.gain;
  const newEmitterWarp = context.sources[4].connectedTo.connectedTo.gain;

  assert.ok(Math.abs(futureWarp.value - 10 ** (-12 / 20)) < 1e-12);
  assert.ok(
    Math.abs(newEmitterWarp.value - 10 ** (-12 / 20)) < 1e-12,
  );

  backend.PostEvent(9, 1, 0, emitter, "reset_local");
  assert.equal(firstWarp.value, 1);
  assert.equal(futureWarp.value, 1);
  assert.ok(Math.abs(secondWarp.value - 10 ** (-12 / 20)) < 1e-12);
  assert.ok(
    Math.abs(newEmitterWarp.value - 10 ** (-12 / 20)) < 1e-12,
  );

  backend.PostEvent(10, 1, 0, emitter, "set_parent");
  assert.ok(Math.abs(firstWarp.value - 10 ** (-9 / 20)) < 1e-12);
  assert.ok(Math.abs(secondWarp.value - 10 ** (-21 / 20)) < 1e-12);
  assert.ok(Math.abs(futureWarp.value - 10 ** (-9 / 20)) < 1e-12);
  assert.ok(
    Math.abs(newEmitterWarp.value - 10 ** (-21 / 20)) < 1e-12,
  );
  assert.equal(music.value, 1);
});

test("authored Bus Volume remains on the bus stage below the voice silence threshold", async () =>
{
  const play = {
    kind: "play",
    actionIndex: 0,
    selections: [ {
      actionIndex: 0,
      leafIndex: 0,
      matchIds: [ "200" ],
      busPathIds: [ "928" ],
      authoredBusVolumeDb: -100,
      authoredBusMakeUpGainDb: 3,
      authoredOutputBusVolumeDb: 2,
    } ],
  };
  const lower = {
    kind: "set-bus-volume",
    actionIndex: 0,
    targetId: "928",
    targetFlags: 1,
    scope: "game-object",
    mode: "element",
    valueMode: "absolute",
    busVolumeDb: -6,
    delayMs: 0,
    transitionMs: 0,
    curve: 4,
    exceptions: [],
  };
  const { backend, emitter, context } = Harness({
    resolveSfxProgram: (_eventID, eventName) =>
      eventName === "play" ? [ play ] : [ lower ],
    loadBuffer: async (_eventID, _eventName, _controls, program) => ({
      voices: program[0].selections.map(selection => ({
        buffer: { duration: 2 },
        loop: true,
        programSlotId: "0:0",
        actionIndex: 0,
        leafIndex: 0,
        matchIds: selection.matchIds,
        busPathIds: selection.busPathIds,
        authoredBusVolumeDb: selection.authoredBusVolumeDb,
        authoredBusMakeUpGainDb: selection.authoredBusMakeUpGainDb,
        authoredOutputBusVolumeDb: selection.authoredOutputBusVolumeDb,
        getGain: () => 1,
      })),
    }),
  });

  backend.PostEvent(1, 1, 0, emitter, "play");
  await tick();

  const voiceGain = context.sources[0].connectedTo.gain;
  const busGain = context.sources[0].connectedTo.connectedTo.gain;

  assert.equal(voiceGain.value, 1);
  assert.ok(Math.abs(busGain.value - 10 ** (-95 / 20)) < 1e-12);

  backend.PostEvent(2, 1, 0, emitter, "lower");
  assert.equal(voiceGain.value, 1);
  assert.ok(Math.abs(busGain.value - 10 ** (-101 / 20)) < 1e-12);
});

test("routed SFX voices realize static Wwise Parametric EQ in the dry route", async () =>
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
  const { backend, emitter, context } = Harness({
    busEffects,
    loadBuffer: async () => ({
      voices: [ {
        buffer: { duration: 2 },
        loop: false,
        programSlotId: "0:0",
        actionIndex: 0,
        leafIndex: 0,
        matchIds: [ "500" ],
        busPathIds: [ "500" ],
        getGain: () => 1,
      } ],
    }),
  });

  backend.PostEvent(1, 1, 0, emitter, "play");
  await tick();

  const [ peaking, shelf ] = context.filters;
  const voiceGain = context.sources[0].connectedTo;
  const busGain = voiceGain.connectedTo;

  assert.equal(context.filters.length, 2);
  assert.equal(peaking.type, "peaking");
  assert.equal(peaking.frequency.value, 120);
  assert.equal(peaking.Q.value, 5);
  assert.equal(peaking.gain.value, -13);
  assert.equal(shelf.type, "highshelf");
  assert.equal(busGain.connectedTo, peaking);
  assert.equal(peaking.connectedTo, shelf);
  assert.equal(shelf.connectedTo.gain.value, 1, "EQ feeds the stop envelope");

  context.sources[0].onended();
  assert.equal(peaking.disconnected, true);
  assert.equal(shelf.disconnected, true);
});

test("routed SFX activity ducks future target voices and releases on source end", async () =>
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
  const program = busPathIds => [ {
    kind: "play",
    actionIndex: 0,
    selections: [ {
      actionIndex: 0,
      leafIndex: 0,
      matchIds: [ "300" ],
      busPathIds,
    } ],
  } ];
  const { backend, emitter, context } = Harness({
    busDuckingController,
    resolveSfxProgram: (_eventID, eventName) =>
      eventName === "source" ? program([ "100" ]) : program([ "200" ]),
    loadBuffer: async (_eventID, _eventName, _controls, resolved) => ({
      voices: resolved[0].selections.map(selection => ({
        buffer: { duration: 20 },
        loop: true,
        programSlotId: "0:0",
        matchIds: selection.matchIds,
        busPathIds: selection.busPathIds,
        getGain: () => 1,
      })),
    }),
  });

  backend.PostEvent(1, 1, 0, emitter, "source");
  await tick();
  context.currentTime = 1;
  backend.PostEvent(2, 1, 0, emitter, "target");
  await tick();

  const ducked = context.sources[1].connectedTo.connectedTo.gain;

  assert.ok(Math.abs(ducked.value - 10 ** (-6 / 20)) < 1e-12);

  context.sources[0].onended();
  context.currentTime = 2;
  backend.PostEvent(3, 1, 0, emitter, "target");
  await tick();

  const released = context.sources[2].connectedTo.connectedTo.gain;

  assert.equal(released.value, 1);
});

test("Bus Volume RTPCs scale ancestor routes for live and future SFX voices", async () =>
{
  const programs = {
    routed: [ {
      kind: "play",
      actionIndex: 0,
      selections: [ {
        actionIndex: 0,
        leafIndex: 0,
        matchIds: [ "200" ],
        busPathIds: [ "928", "500", "1" ],
        authoredBusVolumeDb: -3,
      } ],
    } ],
    unrelated: [ {
      kind: "play",
      actionIndex: 0,
      selections: [ {
        actionIndex: 0,
        leafIndex: 0,
        matchIds: [ "201" ],
        busPathIds: [ "399", "1" ],
      } ],
    } ],
  };
  const busRtpcs = {
    schemaVersion: 1,
    buses: {
      "500": [ {
        curveId: 77,
        rtpc: "menu_advanced_world_level",
        defaultValue: 1,
        scaling: 2,
        points: [
          { x: 0, value: -1, interpolation: 4 },
          { x: 1, value: 0, interpolation: 4 },
        ],
      } ],
    },
  };
  const { backend, emitter, context } = Harness({
    busRtpcs,
    resolveSfxProgram: (_eventID, eventName) => programs[eventName],
    loadBuffer: async (_eventID, _eventName, _controls, program) => ({
      voices: program[0].selections.map(selection => ({
        buffer: { duration: 20 },
        loop: true,
        programSlotId: "0:0",
        matchIds: selection.matchIds,
        busPathIds: selection.busPathIds,
        authoredBusVolumeDb: selection.authoredBusVolumeDb,
        getGain: () => 1,
      })),
    }),
  });

  backend.PostEvent(1, 1, 0, emitter, "routed");
  backend.PostEvent(2, 1, 0, emitter, "unrelated");
  await tick();

  const routed = context.sources[0].connectedTo.connectedTo.gain;
  const unrelated = context.sources[1].connectedTo.connectedTo.gain;

  assert.ok(Math.abs(routed.value - 10 ** (-3 / 20)) < 1e-12);
  assert.equal(unrelated.value, 1);

  backend.SetGlobalRTPCValue("menu_advanced_world_level", 0.5);
  const scaledDb = -3 + 20 * Math.log10(0.5);

  assert.ok(Math.abs(routed.value - 10 ** (scaledDb / 20)) < 1e-12);
  assert.equal(unrelated.value, 1);

  backend.PostEvent(3, 1, 0, emitter, "routed");
  await tick();
  const future = context.sources[2].connectedTo.connectedTo.gain;

  assert.ok(Math.abs(future.value - 10 ** (scaledDb / 20)) < 1e-12);
});

test("Bus Volume States stack across SFX ancestry and preserve missing cases", async () =>
{
  const busStates = {
    schemaVersion: 1,
    buses: {
      "928": [ {
        groupId: "700",
        group: "environment",
        syncType: 0,
        effectiveSyncType: 0,
        states: [ {
          stateId: "701",
          state: "inside",
          gainDb: -4,
        } ],
      } ],
      "500": [
        {
          groupId: "600",
          group: "video_overlay",
          syncType: 1,
          effectiveSyncType: 0,
          states: [ {
            stateId: "602",
            state: "on",
            gainDb: -6,
          } ],
        },
        {
          groupId: "800",
          group: "mix",
          syncType: 0,
          effectiveSyncType: 0,
          states: [ {
            stateId: "801",
            state: "boost",
            gainDb: 2,
          } ],
        },
      ],
    },
  };
  const { backend, emitter, context } = Harness({
    busStates,
    resolveSfxProgram: () => [ {
      kind: "play",
      actionIndex: 0,
      selections: [ {
        actionIndex: 0,
        leafIndex: 0,
        matchIds: [ "200" ],
        busPathIds: [ "928", "500", "1" ],
        authoredBusVolumeDb: -3,
      } ],
    } ],
    loadBuffer: async () => ({
      voices: [ {
        buffer: { duration: 20 },
        loop: true,
        programSlotId: "0:0",
        matchIds: [ "200" ],
        busPathIds: [ "928", "500", "1" ],
        authoredBusVolumeDb: -3,
        getGain: () => 1,
      } ],
    }),
  });

  backend.PostEvent(1, 1, 0, emitter, "routed");
  await tick();
  const live = context.sources[0].connectedTo.connectedTo.gain;

  assert.ok(Math.abs(live.value - 10 ** (-3 / 20)) < 1e-12);

  backend.SetGlobalState("video_overlay", "on");
  backend.SetGlobalState("mix", "boost");
  backend.SetGlobalState("environment", "inside");
  assert.ok(Math.abs(live.value - 10 ** (-11 / 20)) < 1e-12);

  backend.PostEvent(2, 1, 0, emitter, "routed");
  await tick();
  const future = context.sources[1].connectedTo.connectedTo.gain;

  assert.ok(Math.abs(future.value - 10 ** (-11 / 20)) < 1e-12);

  backend.SetGlobalState("video_overlay", "off");
  assert.ok(Math.abs(live.value - 10 ** (-5 / 20)) < 1e-12);
  assert.ok(Math.abs(future.value - 10 ** (-5 / 20)) < 1e-12);
});

test("Bus Volume States reuse directed, default, and interrupted STMG blends", async () =>
{
  const stateTransitions = [ {
    groupId: "600",
    group: "video_overlay",
    defaultTransitionMs: 1000,
    states: [
      { stateId: "601", state: "off" },
      { stateId: "602", state: "on" },
    ],
    transitions: [ {
      fromId: "601",
      from: "off",
      toId: "602",
      to: "on",
      transitionMs: 5000,
    } ],
  } ];
  const { backend, emitter, context } = Harness({
    stateTransitions,
    busStates: {
      schemaVersion: 1,
      buses: {
        "500": [ {
          groupId: "600",
          group: "video_overlay",
          syncType: 1,
          effectiveSyncType: 0,
          states: [ {
            stateId: "602",
            state: "on",
            gainDb: -10,
          } ],
        } ],
      },
    },
    resolveSfxProgram: () => [ {
      kind: "play",
      actionIndex: 0,
      selections: [ {
        actionIndex: 0,
        leafIndex: 0,
        matchIds: [ "200" ],
        busPathIds: [ "500" ],
      } ],
    } ],
    loadBuffer: async () => ({
      voices: [ {
        buffer: { duration: 20 },
        loop: true,
        programSlotId: "0:0",
        matchIds: [ "200" ],
        busPathIds: [ "500" ],
        getGain: () => 1,
      } ],
    }),
  });

  backend.SetGlobalState("video_overlay", "off");
  backend.PostEvent(1, 1, 0, emitter, "routed");
  await tick();
  const gain = context.sources[0].connectedTo.connectedTo.gain;

  backend.SetGlobalState("video_overlay", "on");
  assert.equal(gain.curves.at(-1)[2], 5);
  assert.ok(Math.abs(gain.curves.at(-1)[0].at(-1) - 10 ** (-10 / 20)) < 1e-6);

  context.currentTime = 2;
  backend.SetGlobalState("video_overlay", "off");
  assert.ok(Math.abs(gain.value - 10 ** (-4 / 20)) < 1e-12);
  assert.equal(gain.curves.at(-1)[2], 1);
  assert.ok(Math.abs(gain.curves.at(-1)[0].at(-1) - 1) < 1e-12);
});

test("multi-property Bus States realize SFX pitch and additive route filters", async () =>
{
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
          lowPass: -70,
          highPass: 45,
        } ],
      } ],
    },
  };
  const descriptor = localFilters => ({
    buffer: { duration: 20 },
    loop: true,
    programSlotId: `0:${localFilters ? 0 : 1}`,
    matchIds: [ "200" ],
    busPathIds: [ "500" ],
    getGain: () => 1,
    getPlaybackRate: () => 1,
    getPlaybackRateAtVoicePitchCents: cents => 2 ** (cents / 1200),
    ...(localFilters ? {
      getLowPass: () => 80,
      getHighPass: () => 10,
      getLowPassAtAdditionalPercent: additional => Math.max(
        0,
        Math.min(100, 80 + additional),
      ),
      getHighPassAtAdditionalPercent: additional => Math.max(
        0,
        Math.min(100, 10 + additional),
      ),
    } : {}),
  });
  const { backend, emitter, context } = Harness({
    busStates,
    resolveSfxProgram: () => [ {
      kind: "play",
      actionIndex: 0,
      selections: [
        { actionIndex: 0, leafIndex: 0, matchIds: [ "200" ], busPathIds: [ "500" ] },
        { actionIndex: 0, leafIndex: 1, matchIds: [ "201" ], busPathIds: [ "500" ] },
      ],
    } ],
    loadBuffer: async () => ({
      voices: [ descriptor(true), descriptor(false) ],
    }),
  });

  backend.SetGlobalState("mix_state", "off");
  backend.PostEvent(1, 1, 0, emitter, "routed");
  await tick();

  assert.equal(context.filters.length, 4);
  assert.equal(context.filters[0].frequency.value, 94);
  assert.equal(context.filters[1].frequency.value, 40);
  assert.equal(context.filters[2].frequency.value, 20000);
  assert.equal(context.filters[3].frequency.value, 17);

  backend.SetGlobalState("mix_state", "on");
  assert.equal(context.filters[0].frequency.value, 15667);
  assert.equal(context.filters[1].frequency.value, 1922);
  assert.equal(context.filters[2].frequency.value, 20000);
  assert.equal(context.filters[3].frequency.value, 812);
  assert.ok(Math.abs(
    context.sources[0].playbackRate.value - 2 ** (-100 / 1200),
  ) < 1e-12);
  assert.ok(Math.abs(
    context.sources[1].playbackRate.value - 2 ** (-100 / 1200),
  ) < 1e-12);
});

test("authored bus controls supersede legacy hard-coded music volume mapping", () =>
{
  let legacyWrites = 0;
  let rtpcRefreshes = 0;
  const musicEngine = {
    SetMusicVolume()
    {
      legacyWrites++;
    },
    RefreshBusRtpcs()
    {
      rtpcRefreshes++;
    },
  };
  const { backend } = Harness({
    musicEngine,
    busRtpcs: {
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
    },
  });

  backend.SetGlobalRTPCValue("menu_main_music_level", 0.5);

  assert.equal(legacyWrites, 0);
  assert.equal(rtpcRefreshes, 1);
});

test("music receives its emitter Bus Volume state map and refresh notifications", () =>
{
  let receivedStates = null;
  let refreshes = 0;
  const musicEngine = {
    HandlesEvent: eventName => eventName === "music_play",
    PostEvent(_eventName, _playingID, _complete, options)
    {
      receivedStates = options.busVolumeStates;
      return true;
    },
    ExecuteAction() {},
    RefreshBusVolumeGains()
    {
      refreshes++;
    },
  };
  const action = {
    kind: "set-bus-volume",
    actionIndex: 0,
    targetId: "928",
    targetFlags: 1,
    scope: "game-object",
    mode: "element",
    valueMode: "absolute",
    busVolumeDb: -6,
    delayMs: 0,
    transitionMs: 0,
    curve: 4,
    exceptions: [],
  };
  const { backend, emitter } = Harness({
    musicEngine,
    hasSfxEvent: eventName => eventName === "set_bus",
    resolveSfxProgram: (_eventID, eventName) =>
      eventName === "set_bus" ? [ action ] : null,
  });

  backend.PostEvent(1, 1, 0, emitter, "music_play");
  assert.ok(receivedStates instanceof Map);
  assert.equal(receivedStates.size, 0);

  backend.PostEvent(2, 1, 0, emitter, "set_bus");
  assert.equal(refreshes, 1);
  assert.equal(receivedStates.get("928").toDb, -6);
});

test("Bus Volume transitions rebase from authored linear-gain time", async () =>
{
  const programs = {
    play: [ {
      kind: "play",
      actionIndex: 0,
      selections: [ {
        actionIndex: 0,
        leafIndex: 0,
        matchIds: [ "200" ],
        busPathIds: [ "928" ],
      } ],
    } ],
    fade: [ {
      kind: "set-bus-volume",
      actionIndex: 0,
      targetId: "928",
      targetFlags: 1,
      scope: "game-object",
      mode: "element",
      valueMode: "absolute",
      busVolumeDb: -20,
      delayMs: 1000,
      transitionMs: 4000,
      curve: 4,
      exceptions: [],
    } ],
    relative: [ {
      kind: "set-bus-volume",
      actionIndex: 0,
      targetId: "928",
      targetFlags: 1,
      scope: "game-object",
      mode: "element",
      valueMode: "relative",
      busVolumeDb: 10,
      delayMs: 2000,
      transitionMs: 2000,
      curve: 4,
      exceptions: [],
    } ],
  };
  const { backend, emitter, context } = Harness({
    resolveSfxProgram: (_eventID, eventName) => programs[eventName],
    loadBuffer: async () => ({
      voices: [ {
        buffer: { duration: 2 },
        loop: true,
        programSlotId: "0:0",
        actionIndex: 0,
        leafIndex: 0,
        getGain: () => 1,
      } ],
    }),
  });

  backend.PostEvent(1, 1, 0, emitter, "play");
  backend.PostEvent(2, 1, 0, emitter, "fade");
  backend.PostEvent(3, 1, 0, emitter, "relative");
  await tick();

  context.currentTime = 1;
  backend.RenderAudio();
  const busParam = context.sources[0].connectedTo.connectedTo.gain;
  const fade = busParam.curves.at(-1);

  assert.equal(fade[1], 1);
  assert.equal(fade[2], 4);
  assert.ok(Math.abs(fade[0][0] - 1) < 1e-6);
  assert.ok(Math.abs(fade[0].at(-1) - 0.1) < 1e-6);

  context.currentTime = 1.5;
  backend.PostEvent(4, 1, 0, emitter, "play");
  await tick();
  const futureBusParam = context.sources[1].connectedTo.connectedTo.gain;
  const expectedAtFuturePost = 1 + (0.1 - 1) * 0.125;

  assert.ok(
    Math.abs(futureBusParam.value - expectedAtFuturePost) < 1e-12,
  );

  context.currentTime = 2;
  backend.RenderAudio();
  const gainAtSecondAction = 1 + (0.1 - 1) * 0.25;
  const dbAtSecondAction = 20 * Math.log10(gainAtSecondAction);
  const expectedAfterRelative = 10 ** ((dbAtSecondAction + 10) / 20);

  assert.ok(Math.abs(busParam.value - gainAtSecondAction) < 1e-12);
  const rebased = busParam.curves.at(-1);

  assert.equal(rebased[1], 2);
  assert.equal(rebased[2], 2);
  assert.ok(Math.abs(rebased[0][0] - gainAtSecondAction) < 1e-6);
  assert.ok(Math.abs(rebased[0].at(-1) - expectedAfterRelative) < 1e-6);
  assert.ok(
    Math.abs(futureBusParam.value - gainAtSecondAction) < 1e-12,
  );
});

test("new emitters inherit an in-progress global Bus Volume timeline", async () =>
{
  const programs = {
    fade: [ {
      kind: "set-bus-volume",
      actionIndex: 0,
      targetId: "928",
      targetFlags: 1,
      scope: "global",
      mode: "element",
      valueMode: "absolute",
      busVolumeDb: -20,
      delayMs: 0,
      transitionMs: 4000,
      curve: 4,
      exceptions: [],
    } ],
    play: [ {
      kind: "play",
      actionIndex: 0,
      selections: [ {
        actionIndex: 0,
        leafIndex: 0,
        matchIds: [ "200" ],
        busPathIds: [ "928" ],
      } ],
    } ],
  };
  const { backend, emitter, context } = Harness({
    resolveSfxProgram: (_eventID, eventName) => programs[eventName],
    loadBuffer: async (_eventID, _eventName, _controls, program) => ({
      voices: program.flatMap(operation => operation.kind === "play"
        ? operation.selections.map(selection => ({
            buffer: { duration: 20 },
            loop: true,
            programSlotId: "0:0",
            matchIds: selection.matchIds,
            busPathIds: selection.busPathIds,
            getGain: () => 1,
          }))
        : []),
    }),
  });

  backend.PostEvent(1, 1, 0, emitter, "fade");
  context.currentTime = 1;
  backend.RenderAudio();
  backend.RegisterGameObj(2);
  backend.PostEvent(2, 2, 0, emitter, "play");
  await tick();

  const busParam = context.sources[0].connectedTo.connectedTo.gain;
  const expectedAtRegistration = 1 + (0.1 - 1) * 0.25;
  const remainder = busParam.curves.at(-1);

  assert.ok(Math.abs(busParam.value - expectedAtRegistration) < 1e-12);
  assert.equal(remainder[1], 1);
  assert.equal(remainder[2], 3);
  assert.ok(Math.abs(remainder[0][0] - expectedAtRegistration) < 1e-6);
  assert.ok(Math.abs(remainder[0].at(-1) - 0.1) < 1e-6);
});

test("Bus Volume Reset All and All-Except operate on exact bus keys", async () =>
{
  const action = ({
    kind = "set-bus-volume",
    targetId,
    mode = "element",
    busVolumeDb,
    exceptions = [],
  }) => ({
    kind,
    actionIndex: 0,
    targetId,
    targetFlags: 1,
    scope: "global",
    mode,
    valueMode: "absolute",
    busVolumeDb,
    delayMs: 0,
    transitionMs: 0,
    curve: 4,
    exceptions,
  });
  const programs = {
    play: [ {
      kind: "play",
      actionIndex: 0,
      selections: [ {
        actionIndex: 0,
        leafIndex: 0,
        matchIds: [ "200" ],
        busPathIds: [ "928", "500" ],
      } ],
    } ],
    set_child: [ action({ targetId: "928", busVolumeDb: -6 }) ],
    set_parent: [ action({ targetId: "500", busVolumeDb: -9 }) ],
    reset_except_parent: [ action({
      kind: "reset-bus-volume",
      targetId: "0",
      mode: "all-except",
      exceptions: [ { targetId: "500", targetFlags: 1 } ],
    }) ],
    reset_all: [ action({
      kind: "reset-bus-volume",
      targetId: "0",
      mode: "all",
    }) ],
  };
  const { backend, emitter, context } = Harness({
    resolveSfxProgram: (_eventID, eventName) => programs[eventName],
    loadBuffer: async (_eventID, _eventName, _controls, program) => ({
      voices: program.flatMap(operation => operation.kind === "play"
        ? operation.selections.map(selection => ({
            buffer: { duration: 20 },
            loop: true,
            programSlotId: "0:0",
            matchIds: selection.matchIds,
            busPathIds: selection.busPathIds,
            getGain: () => 1,
          }))
        : []),
    }),
  });

  backend.PostEvent(1, 1, 0, emitter, "set_child");
  backend.PostEvent(2, 1, 0, emitter, "set_parent");
  backend.PostEvent(3, 1, 0, emitter, "play");
  await tick();

  const busGain = context.sources[0].connectedTo.connectedTo.gain;

  assert.ok(Math.abs(busGain.value - 10 ** (-15 / 20)) < 1e-12);

  backend.PostEvent(4, 1, 0, emitter, "reset_except_parent");
  assert.ok(
    Math.abs(busGain.value - 10 ** (-9 / 20)) < 1e-12,
    "the exact parent exception preserves only its own contribution",
  );

  backend.PostEvent(5, 1, 0, emitter, "reset_all");
  assert.equal(busGain.value, 1);
});

test("Bus Volume isolates object generations and cancels stale delayed actions", async () =>
{
  const setBus = ({
    scope,
    busVolumeDb,
    delayMs = 0,
  }) => ({
    kind: "set-bus-volume",
    actionIndex: 0,
    targetId: "928",
    targetFlags: 1,
    scope,
    mode: "element",
    valueMode: "absolute",
    busVolumeDb,
    delayMs,
    transitionMs: 0,
    curve: 4,
    exceptions: [],
  });
  const play = {
    kind: "play",
    actionIndex: 0,
    selections: [ {
      actionIndex: 0,
      leafIndex: 0,
      matchIds: [ "200" ],
      busPathIds: [ "928" ],
    } ],
  };
  const programs = {
    play: [ play ],
    local: [ setBus({ scope: "game-object", busVolumeDb: -6 }) ],
    current_local: [ setBus({ scope: "game-object", busVolumeDb: -12 }) ],
    global: [ setBus({ scope: "global", busVolumeDb: -9 }) ],
    delayed_local: [ setBus({
      scope: "game-object",
      busVolumeDb: -30,
      delayMs: 1000,
    }) ],
  };
  const { backend, emitter, context, finished } = Harness({
    resolveSfxProgram: (_eventID, eventName) => programs[eventName],
    loadBuffer: async (_eventID, _eventName, _controls, program) => ({
      voices: program.flatMap(operation => operation.kind === "play"
        ? operation.selections.map(selection => ({
            buffer: { duration: 20 },
            loop: true,
            programSlotId: "0:0",
            matchIds: selection.matchIds,
            busPathIds: selection.busPathIds,
            getGain: () => 1,
          }))
        : []),
    }),
  });

  backend.PostEvent(1, 1, 0, emitter, "local");
  backend.PostEvent(2, 1, 0, emitter, "play");
  await tick();
  const retiredGain = context.sources[0].connectedTo.connectedTo.gain;

  backend.UnregisterGameObj(1);
  backend.RegisterGameObj(1);
  backend.PostEvent(3, 1, 0, emitter, "play");
  await tick();
  const currentGain = context.sources[1].connectedTo.connectedTo.gain;

  assert.ok(Math.abs(retiredGain.value - 10 ** (-6 / 20)) < 1e-12);
  assert.equal(currentGain.value, 1);

  backend.PostEvent(4, 1, 0, emitter, "current_local");
  assert.ok(Math.abs(retiredGain.value - 10 ** (-6 / 20)) < 1e-12);
  assert.ok(Math.abs(currentGain.value - 10 ** (-12 / 20)) < 1e-12);

  backend.PostEvent(5, 1, 0, emitter, "global");
  assert.ok(Math.abs(retiredGain.value - 10 ** (-9 / 20)) < 1e-12);
  assert.ok(Math.abs(currentGain.value - 10 ** (-9 / 20)) < 1e-12);

  backend.RegisterGameObj(2);
  backend.PostEvent(6, 2, 0, emitter, "play");
  const stale = backend.PostEvent(7, 1, 0, emitter, "delayed_local");
  await tick();
  const futureGain = context.sources[2].connectedTo.connectedTo.gain;

  assert.ok(Math.abs(futureGain.value - 10 ** (-9 / 20)) < 1e-12);

  backend.UnregisterGameObj(1);
  backend.RegisterGameObj(1);
  backend.PostEvent(8, 1, 0, emitter, "play");
  await tick();
  const newestGain = context.sources[3].connectedTo.connectedTo.gain;

  context.currentTime = 1;
  backend.RenderAudio();
  assert.ok(Math.abs(newestGain.value - 10 ** (-9 / 20)) < 1e-12);
  assert.ok(finished.includes(stale));
});

test("Voice LPF and HPF actions provision filters and preserve reset semantics", async () =>
{
  const filter = ({
    kind,
    actionIndex = 0,
    targetId = "700",
    scope = "game-object",
    mode = "element",
    valueMode,
    value,
    transitionMs = 0,
    exceptions = [],
  }) => ({
    kind,
    actionIndex,
    targetId,
    targetFlags: 0,
    scope,
    mode,
    transitionMs,
    curve: 4,
    exceptions,
    ...(valueMode === undefined
      ? {}
      : {
          valueMode,
          [kind.endsWith("low-pass") ? "lowPass" : "highPass"]:
            value,
        }),
  });
  const play = {
    kind: "play",
    actionIndex: 0,
    selections: [
      {
        actionIndex: 0,
        leafIndex: 0,
        matchIds: [ "200", "700", "701" ],
        lowPass: 0,
        highPass: 0,
      },
    ],
  };
  const programs = {
    set_then_play: [
      filter({
        kind: "set-voice-low-pass",
        valueMode: "absolute",
        value: 80,
        transitionMs: 10000,
      }),
      filter({
        kind: "set-voice-high-pass",
        valueMode: "absolute",
        value: 20,
      }),
      play,
    ],
    play: [ play ],
    reset_parent: [ filter({
      kind: "reset-voice-low-pass",
      transitionMs: 2000,
    }) ],
    set_child: [ filter({
      kind: "set-voice-low-pass",
      targetId: "701",
      valueMode: "relative",
      value: 20,
    }) ],
    reset_all_except_child: [ filter({
      kind: "reset-voice-low-pass",
      targetId: "0",
      mode: "all-except",
      exceptions: [ { targetId: "701", targetFlags: 0 } ],
    }) ],
    reset_all: [ filter({
      kind: "reset-voice-low-pass",
      targetId: "0",
      mode: "all",
    }) ],
    same_time: [
      filter({
        kind: "set-voice-low-pass",
        actionIndex: 0,
        valueMode: "absolute",
        value: 10,
      }),
      filter({
        kind: "set-voice-low-pass",
        actionIndex: 1,
        valueMode: "relative",
        value: 20,
      }),
    ],
    delayed_high: [ {
      ...filter({
        kind: "set-voice-high-pass",
        valueMode: "relative",
        value: 40,
        transitionMs: 4000,
      }),
      delayMs: 1000,
      curve: 8,
    } ],
    reset_high_all: [ filter({
      kind: "reset-voice-high-pass",
      targetId: "0",
      mode: "all",
    }) ],
  };
  const { backend, emitter, context, finished } = Harness({
    resolveSfxProgram: (_eventID, eventName) => programs[eventName],
    loadBuffer: async (_eventID, _eventName, controls, program) => ({
      voices: program.flatMap(operation => operation.kind === "play"
        ? operation.selections.map(selection => ({
            buffer: { duration: 20 },
            loop: true,
            programSlotId: "0:0",
            matchIds: selection.matchIds,
            ...(selection.lowPass === undefined
              ? {}
              : {
                  getLowPass: at => controls.getVoiceLowPass(
                    selection.matchIds,
                    at,
                  ),
                }),
            ...(selection.highPass === undefined
              ? {}
              : {
                  getHighPass: at => controls.getVoiceHighPass(
                    selection.matchIds,
                    at,
                  ),
                }),
          }))
        : []),
    }),
  });

  backend.PostEvent(1, 1, 0, emitter, "set_then_play");
  await tick();

  assert.equal(context.filters.length, 2);
  assert.equal(context.filters[0].type, "lowpass");
  assert.equal(context.filters[1].type, "highpass");
  assert.equal(context.filters[0].frequency.value, 20000);
  assert.equal(context.filters[1].frequency.value, 94);
  const initialFade = context.filters[0].frequency.curves.at(-1);

  assert.equal(initialFade[1], 0);
  assert.equal(initialFade[2], 10);
  assert.equal(initialFade[0][0], 20000);
  assert.equal(initialFade[0].at(-1), 94);

  context.currentTime = 4;
  backend.PostEvent(2, 1, 0, emitter, "play");
  await tick();

  assert.equal(context.filters[2].frequency.value, 5892);
  const inheritedFade = context.filters[2].frequency.curves.at(-1);

  assert.equal(inheritedFade[1], 4);
  assert.equal(inheritedFade[2], 6);
  assert.equal(inheritedFade[0][0], 5892);
  assert.equal(inheritedFade[0].at(-1), 94);

  backend.PostEvent(3, 1, 0, emitter, "reset_parent");
  const interrupted = context.filters[0].frequency.curves.at(-1);

  assert.equal(interrupted[1], 4);
  assert.equal(interrupted[2], 2);
  assert.equal(interrupted[0][0], 5892);
  assert.equal(interrupted[0].at(-1), 20000);
  assert.equal(context.filters[1].frequency.value, 94);

  context.currentTime = 5;
  backend.PostEvent(4, 1, 0, emitter, "set_child");
  assert.equal(context.filters[0].frequency.value, 4174);

  backend.PostEvent(5, 1, 0, emitter, "reset_all_except_child");
  assert.equal(
    context.filters[0].frequency.value,
    11333,
    "the exact child exception keeps only the child contribution",
  );

  backend.PostEvent(6, 1, 0, emitter, "reset_all");
  assert.equal(context.filters[0].frequency.value, 20000);
  assert.equal(
    context.filters[1].frequency.value,
    94,
    "LPF resets do not alter the independent HPF property",
  );

  backend.PostEvent(7, 1, 0, emitter, "same_time");
  assert.equal(
    context.filters[0].frequency.value,
    7000,
    "same-time filter actions retain authored actionIndex order",
  );

  context.currentTime = 6;
  const delayedHigh = backend.PostEvent(
    8,
    1,
    0,
    emitter,
    "delayed_high",
  );
  await tick();
  context.currentTime = 8;
  backend.RenderAudio();

  assert.ok(
    Math.abs(context.filters[1].frequency.value - 99.625) < 1e-12,
    "an overdue nonlinear HPF fade starts at its authored progress: "
      + context.filters[1].frequency.value,
  );
  const highPassRemainder = context.filters[1].frequency.curves.at(-1);

  assert.equal(highPassRemainder[1], 8);
  assert.equal(highPassRemainder[2], 3);
  assert.ok(Math.abs(highPassRemainder[0][0] - 99.625) < 1e-6);
  assert.equal(highPassRemainder[0].at(-1), 2957);
  assert.ok(finished.includes(delayedHigh));

  backend.PostEvent(9, 1, 0, emitter, "reset_high_all");
  assert.equal(context.filters[1].frequency.value, 17);
  assert.equal(
    context.filters[0].frequency.value,
    7000,
    "HPF Reset All does not alter the independent LPF property",
  );
});

test("global Voice Filter state survives registration and isolates retired generations", async () =>
{
  const setLowPass = ({
    scope,
    valueMode,
    lowPass,
    delayMs = 0,
    transitionMs = 0,
  }) => ({
    kind: "set-voice-low-pass",
    actionIndex: 0,
    targetId: "700",
    targetFlags: 0,
    scope,
    mode: "element",
    valueMode,
    lowPass,
    delayMs,
    transitionMs,
    curve: 4,
    exceptions: [],
  });
  const play = {
    kind: "play",
    actionIndex: 0,
    selections: [ {
      actionIndex: 0,
      leafIndex: 0,
      matchIds: [ "200", "700" ],
      lowPass: 0,
    } ],
  };
  const programs = {
    play: [ play ],
    global_fade: [ setLowPass({
      scope: "global",
      valueMode: "absolute",
      lowPass: 60,
      transitionMs: 10000,
    }) ],
    local_override: [ setLowPass({
      scope: "game-object",
      valueMode: "absolute",
      lowPass: 30,
    }) ],
    global_relative: [ setLowPass({
      scope: "global",
      valueMode: "relative",
      lowPass: 20,
    }) ],
    delayed_local: [ setLowPass({
      scope: "game-object",
      valueMode: "absolute",
      lowPass: 90,
      delayMs: 1000,
    }) ],
    global_reset_all: [ {
      kind: "reset-voice-low-pass",
      actionIndex: 0,
      targetId: "0",
      targetFlags: 0,
      scope: "global",
      mode: "all",
      transitionMs: 0,
      curve: 4,
      exceptions: [],
    } ],
  };
  const { backend, emitter, context, finished } = Harness({
    resolveSfxProgram: (_eventID, eventName) => programs[eventName],
    loadBuffer: async (_eventID, _eventName, controls, program) => ({
      voices: program.flatMap(operation => operation.kind === "play"
        ? operation.selections.map(selection => ({
            buffer: { duration: 20 },
            loop: true,
            programSlotId: "0:0",
            matchIds: selection.matchIds,
            getLowPass: at => controls.getVoiceLowPass(
              selection.matchIds,
              at,
            ),
          }))
        : []),
    }),
  });

  backend.PostEvent(1, 1, 0, emitter, "global_fade");
  context.currentTime = 2;
  backend.PostEvent(2, 1, 0, emitter, "local_override");

  context.currentTime = 4;
  backend.RegisterGameObj(2);
  backend.PostEvent(3, 2, 0, emitter, "play");
  await tick();

  assert.equal(context.filters[0].frequency.value, 9600);
  const inheritedGlobalFade = context.filters[0].frequency.curves.at(-1);

  assert.equal(inheritedGlobalFade[1], 4);
  assert.equal(inheritedGlobalFade[2], 6);
  assert.equal(inheritedGlobalFade[0].at(-1), 528);

  backend.PostEvent(4, 1, 0, emitter, "global_relative");
  assert.equal(context.filters[0].frequency.value, 2095);

  backend.RegisterGameObj(3);
  backend.PostEvent(5, 1, 0, emitter, "play");
  backend.PostEvent(6, 3, 0, emitter, "play");
  await tick();

  assert.equal(
    context.filters[1].frequency.value,
    1249,
    "the global relative action rebases the locally diverged object",
  );
  assert.equal(
    context.filters[2].frequency.value,
    2095,
    "a later object inherits the canonical global result",
  );

  const stale = backend.PostEvent(7, 1, 0, emitter, "delayed_local");
  await tick();
  backend.UnregisterGameObj(1);
  backend.RegisterGameObj(1);
  backend.PostEvent(8, 1, 0, emitter, "play");
  await tick();

  assert.equal(context.filters[3].frequency.value, 2095);
  context.currentTime = 5;
  backend.RenderAudio();
  assert.equal(
    context.filters[3].frequency.value,
    2095,
    "a delayed action cannot cross an emitter generation",
  );

  backend.PostEvent(9, 2, 0, emitter, "global_reset_all");
  assert.equal(context.filters[0].frequency.value, 20000);
  assert.equal(
    context.filters[1].frequency.value,
    1249,
    "a retired voice keeps its retired object-local filter map",
  );
  assert.equal(context.filters[2].frequency.value, 20000);
  assert.equal(context.filters[3].frequency.value, 20000);

  backend.RegisterGameObj(4);
  backend.PostEvent(10, 4, 0, emitter, "play");
  await tick();
  assert.equal(
    context.filters[4].frequency.value,
    20000,
    "registration after global Reset All inherits the reset template",
  );
  assert.ok(finished.includes(stale));

  const cancelled = backend.PostEvent(
    11,
    2,
    0,
    emitter,
    "delayed_local",
  );
  await tick();
  backend.ExecuteActionOnPlayingID("stop", cancelled, 0);
  context.currentTime = 6;
  backend.RenderAudio();
  assert.equal(context.filters[0].frequency.value, 20000);
  assert.ok(finished.includes(cancelled));
});

test("Voice Pitch persists across posts, isolates objects, and intersects transitions", async () =>
{
  const pitch = (
    targetId,
    valueMode,
    pitchCents,
    transitionMs = 0,
    scope = "game-object",
  ) => ({
    kind: "set-voice-pitch",
    actionIndex: 0,
    targetId,
    targetFlags: 0,
    scope,
    mode: "element",
    valueMode,
    pitchCents,
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
    set_local: [ pitch("700", "absolute", 1200) ],
    fade_local: [ pitch("700", "absolute", 1200, 2000) ],
    relative_local: [ pitch("700", "relative", -600) ],
    set_global: [
      pitch("700", "absolute", -1200, 0, "global"),
    ],
    reset_local: [
      {
        kind: "reset-voice-pitch",
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
              getPlaybackRate: () => 2 ** (
                controls.getVoicePitchCents(selection.matchIds) / 1200
              ),
              getPlaybackRateAtVoicePitchCents: value =>
                2 ** (value / 1200),
            }))
          : []),
    }),
  });
  backend.RegisterGameObj(2);

  backend.PostEvent(1, 1, 0, emitter, "play");
  backend.PostEvent(2, 2, 0, emitter, "play");
  await tick();

  const firstRate = context.sources[0].playbackRate;
  const secondRate = context.sources[1].playbackRate;

  backend.PostEvent(3, 1, 0, emitter, "set_local");
  assert.equal(firstRate.value, 2);
  assert.equal(secondRate.value, 1);

  backend.PostEvent(4, 1, 0, emitter, "relative_local");
  assert.ok(Math.abs(firstRate.value - Math.SQRT2) < 1e-12);

  backend.PostEvent(5, 1, 0, emitter, "set_global");
  assert.equal(firstRate.value, 0.5);
  assert.equal(secondRate.value, 0.5);

  backend.PostEvent(6, 1, 0, emitter, "reset_local");
  assert.equal(firstRate.value, 1);
  assert.equal(secondRate.value, 0.5);

  backend.PostEvent(7, 1, 0, emitter, "fade_local");
  const transition = firstRate.curves.at(-1);

  assert.equal(transition[1], 0);
  assert.equal(transition[2], 2);
  assert.equal(transition[0][0], 1);
  assert.equal(transition[0].at(-1), 2);

  context.currentTime = 1;
  backend.PostEvent(8, 1, 0, emitter, "relative_local");
  assert.equal(firstRate.value, 1);
});

test("Voice Pitch changes finite-repeat timing without restarting", async () =>
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
    set_pitch: [
      {
        kind: "set-voice-pitch",
        actionIndex: 0,
        targetId: "700",
        targetFlags: 0,
        scope: "game-object",
        mode: "element",
        valueMode: "absolute",
        pitchCents: 1200,
        delayMs: 0,
        transitionMs: 0,
        curve: 4,
      },
    ],
    reset_pitch: [
      {
        kind: "reset-voice-pitch",
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
              buffer: { duration: 4 },
              playCount: 3,
              programSlotId:
                `${selection.actionIndex}:${selection.leafIndex}`,
              actionIndex: selection.actionIndex,
              leafIndex: selection.leafIndex,
              matchIds: selection.matchIds,
              getPlaybackRate: () => 2 ** (
                controls.getVoicePitchCents(selection.matchIds) / 1200
              ),
              getPlaybackRateAtVoicePitchCents: value =>
                2 ** (value / 1200),
            }))
          : []),
    }),
  });

  backend.PostEvent(1, 1, 0, emitter, "play");
  await tick();

  assert.equal(context.sources[0].playbackRate.value, 1);
  assert.ok(
    Math.abs(context.sources[0].stoppedAt - (12 + START_QUANTUM))
      < 1e-12,
  );

  context.currentTime = 2;
  backend.PostEvent(2, 1, 0, emitter, "set_pitch");

  assert.equal(context.sources[0].playbackRate.value, 2);
  assert.ok(
    Math.abs(context.sources[0].stoppedAt - (7 + START_QUANTUM / 2))
      < 1e-12,
  );

  context.currentTime = 3;
  backend.PostEvent(3, 1, 0, emitter, "reset_pitch");

  assert.equal(context.sources[0].playbackRate.value, 1);
  assert.ok(
    Math.abs(context.sources[0].stoppedAt - (11 + START_QUANTUM))
      < 1e-12,
  );
});

test("overdue Voice Pitch preserves heard transport and integrates live queries", async () =>
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
        kind: "set-voice-pitch",
        actionIndex: 0,
        targetId: "700",
        targetFlags: 0,
        scope: "game-object",
        mode: "element",
        valueMode: "absolute",
        pitchCents: 1200,
        delayMs: 1000,
        transitionMs: 2000,
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
              buffer: { duration: 10 },
              loop: true,
              programSlotId: "0:0",
              matchIds: selection.matchIds,
              getPlaybackRate: () => 2 ** (
                controls.getVoicePitchCents(selection.matchIds) / 1200
              ),
              getPlaybackRateAtVoicePitchCents: value =>
                2 ** (value / 1200),
            }))
          : []),
    }),
  });

  const playingID = backend.PostEvent(1, 1, 0, emitter, "play");

  backend.PostEvent(2, 1, 0, emitter, "fade");
  await tick();

  context.currentTime = 2;
  backend.RenderAudio();

  assert.equal(
    backend.GetSourcePlayPosition(playingID),
    Math.round((2 - START_QUANTUM) * 1000),
    "an overdue action cannot retroactively change audio already heard",
  );

  context.currentTime = 2.5;
  const transitionedSeconds = 2 / Math.LN2
    * (2 ** 0.75 - 2 ** 0.5);
  const expectedMs = Math.round(
    (2 - START_QUANTUM + transitionedSeconds) * 1000,
  );

  assert.ok(
    Math.abs(backend.GetSourcePlayPosition(playingID) - expectedMs) <= 1,
    "position queries integrate the scheduled pitch curve",
  );
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
  backend.SetGlobalState("unused", "refresh");

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

  const [ childBoundary, aggregateFade ] = gain.curves.slice(-2);

  assert.equal(childBoundary[1], 0);
  assert.equal(childBoundary[2], 2);
  assert.equal(aggregateFade[1], 2);
  assert.equal(aggregateFade[2], 2);
  assert.ok(
    Math.abs(childBoundary[0][0] - 10 ** (-4 / 20)) < 1e-6,
  );
  assert.ok(
    Math.abs(
      childBoundary[0].at(-1) - aggregateFade[0][0]
    ) < 1e-12,
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
