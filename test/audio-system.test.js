import test from "node:test";
import assert from "node:assert/strict";
import {
  AudEmitter,
  AudGameObjResource,
  AudListener,
  AudioCurveSetDriver,
  CjsAudioSystem,
  CjsSfxEngine,
  createAudioUpdateContext,
} from "../npm/dist/index.js";
import { CjsBusGraphRuntime } from "../src/internal/busGraphRuntime.js";
import { CjsSharedBusMixer } from "../src/internal/busGraphMixer.js";


function FakeParam()
{
  return { value: 0 };
}

function FakeContext(log)
{
  const context = {
    currentTime: 0,
    destination: { name: "destination" },
    listener: {
      positionX: FakeParam(), positionY: FakeParam(), positionZ: FakeParam(),
      forwardX: FakeParam(), forwardY: FakeParam(), forwardZ: FakeParam(),
      upX: FakeParam(), upY: FakeParam(), upZ: FakeParam()
    },
    createGain()
    {
      const node = {
        gain: { value: 1, linearRampToValueAtTime: () => log.push("fade") },
        disconnected: false,
        connect: () => {},
        disconnect: () => { node.disconnected = true; },
      };

      return node;
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
        start: time =>
        {
          context.currentTime = time;
          log.push("start");
        },
        stop: () => { log.push("stop"); source.onended?.(); }
      };
      log.push(source);
      return source;
    }
  };
  return context;
}

function MixerBus(overrides = {})
{
  return {
    type: "audio-bus",
    channelConfig: { raw: 0 },
    positioning: { flags: 0 },
    hdr: { flags: 0 },
    bypassAllEffects: false,
    userAuxSends: [],
    effects: [],
    requiresProcessing: [],
    ...overrides,
  };
}

function MixerCatalog()
{
  return {
    schemaVersion: 1,
    effects: {},
    buses: {
      "1": MixerBus(),
      "500": MixerBus({ parentBusId: "1" }),
      "600": MixerBus({ parentBusId: "1" }),
    },
    routes: [
      {
        outputBusId: "500",
        busPathIds: [ "500", "1" ],
        userAuxSends: [],
      },
      {
        outputBusId: "600",
        busPathIds: [ "600", "1" ],
        userAuxSends: [],
      },
    ],
    sfxRoutes: { "100": 0, "101": 1 },
    musicRoutes: { "200": 0 },
  };
}

function ParametricEqParameters({
  bands = [
    { type: 6, gain: -13, frequency: 120, q: 5, enabled: true },
    { type: 0, gain: 0, frequency: 8000, q: 0.707, enabled: false },
    { type: 5, gain: 3, frequency: 12000, q: 1, enabled: true },
  ],
  outputGainDb = -6,
  processLfe = 1,
} = {})
{
  const bytes = new Uint8Array(56);
  const view = new DataView(bytes.buffer);
  let at = 0;

  for (const band of bands)
  {
    view.setUint32(at, band.type, true);
    view.setFloat32(at + 4, band.gain, true);
    view.setFloat32(at + 8, band.frequency, true);
    view.setFloat32(at + 12, band.q, true);
    view.setUint8(at + 16, band.enabled ? 1 : 0);
    at += 17;
  }
  view.setFloat32(at, outputGainDb, true);
  view.setUint8(at + 4, processLfe);
  return bytes;
}

function GraphParametricEq(bytes = ParametricEqParameters())
{
  return {
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
  };
}

function AddGraphEffect(catalog, busId, effectId, slotIndex, bytes)
{
  catalog.effects[effectId] = GraphParametricEq(bytes);
  catalog.buses[busId].effects.push({
    slotIndex,
    effectId,
    bypass: false,
    shareSet: true,
    rendered: false,
  });
  catalog.buses[busId].requiresProcessing = [ "effects" ];
}

function MixerContext()
{
  const context = {
    sampleRate: 48000,
    destination: { name: "destination" },
    gains: [],
    filters: [],
    createGain()
    {
      const node = {
        gain: { value: 1 },
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
  };

  return context;
}

test("shared Bus graph runtime resolves stable SFX and music route handles", () =>
{
  const route = Object.freeze({
    outputBusId: "500",
    busPathIds: Object.freeze([ "500", "1" ]),
    userAuxSends: Object.freeze([]),
    authoredBusVolumeDb: -6,
  });
  const runtime = new CjsBusGraphRuntime({
    schemaVersion: 1,
    routes: Object.freeze([ route ]),
    sfxRoutes: Object.freeze({ "100": 0 }),
    musicRoutes: Object.freeze({ "200": 0 }),
  });
  const projection = {
    outputBusId: "500",
    busPathIds: [ "500", "1" ],
    authoredBusVolumeDb: -6,
  };
  const sfx = runtime.ResolveSfxRoute("100", projection);
  const music = runtime.ResolveMusicRoute("200", projection);

  assert.equal(sfx, music);
  assert.equal(sfx.index, 0);
  assert.equal(sfx.route, route);
  assert.equal(Object.isFrozen(sfx), true);
  assert.equal(runtime.ResolveSfxRoute("101"), null);
  assert.throws(
    () => runtime.ResolveMusicRoute("200", {
      ...projection,
      busPathIds: [ "500" ],
    }),
    /dry route disagrees/u,
  );
  runtime.Dispose();
  runtime.Dispose();
  assert.equal(runtime.ResolveSfxRoute("100", projection), null);
});

test("strict shared Bus mixer shares effect-free ancestry without merging categories", () =>
{
  const context = MixerContext();
  const catalog = MixerCatalog();
  const runtime = new CjsBusGraphRuntime(catalog);
  const mixer = new CjsSharedBusMixer({
    context,
    runtime,
    destination: context.destination,
  });
  const routeA = runtime.ResolveSfxRoute("100");
  const routeAMusic = runtime.ResolveMusicRoute("200");
  const routeB = runtime.ResolveSfxRoute("101");
  const sfxA = mixer.GetInput(routeA, "sfx");
  const musicA = mixer.GetInput(routeAMusic, "music");
  const sfxB = mixer.GetInput(routeB, "sfx");

  assert.equal(routeAMusic, routeA);
  assert.equal(mixer.GetInput(routeA, "sfx"), sfxA);
  assert.notEqual(sfxA, musicA, "category sliders remain before the shared mix");
  assert.notEqual(sfxA, sfxB, "distinct routes retain distinct entry nodes");
  assert.equal(sfxA.connectedTo, musicA.connectedTo);
  assert.notEqual(sfxA.connectedTo, sfxB.connectedTo);
  assert.equal(sfxA.connectedTo.connectedTo, sfxB.connectedTo.connectedTo);
  assert.equal(sfxA.connectedTo.connectedTo.connectedTo, context.destination);

  mixer.SetCategoryVolume("sfx", 0.25);
  assert.equal(sfxA.gain.value, 0.25);
  assert.equal(sfxB.gain.value, 0.25);
  assert.equal(musicA.gain.value, 1);

  const nodes = [ ...context.gains ];

  mixer.Dispose();
  mixer.Dispose();
  assert.ok(nodes.every(node => node.disconnected));
  assert.equal(mixer.GetInput(routeA, "sfx"), null);
});

test("strict shared Bus mixer realizes one ordered Parametric EQ chain per Bus", () =>
{
  const context = MixerContext();
  const catalog = MixerCatalog();
  const rootBytes = ParametricEqParameters({
    bands: [
      { type: 1, gain: 0, frequency: 60, q: 0.5, enabled: true },
      { type: 0, gain: 0, frequency: 8000, q: 1, enabled: false },
      { type: 0, gain: 0, frequency: 8000, q: 1, enabled: false },
    ],
    outputGainDb: 0,
  });

  AddGraphEffect(catalog, "500", "900", 1, ParametricEqParameters());
  AddGraphEffect(catalog, "1", "901", 0, rootBytes);
  const runtime = new CjsBusGraphRuntime(catalog);
  const mixer = new CjsSharedBusMixer({
    context,
    runtime,
    destination: context.destination,
  });
  const routeA = runtime.ResolveSfxRoute("100");
  const routeAMusic = runtime.ResolveMusicRoute("200");
  const routeB = runtime.ResolveSfxRoute("101");
  const sfxA = mixer.GetInput(routeA, "sfx");
  const musicA = mixer.GetInput(routeAMusic, "music");
  const sfxB = mixer.GetInput(routeB, "sfx");
  const bus500 = sfxA.connectedTo;
  const firstBand = bus500.connectedTo;
  const secondBand = firstBand.connectedTo;
  const outputGain = secondBand.connectedTo;
  const rootBus = outputGain.connectedTo;
  const rootBand = rootBus.connectedTo;

  assert.equal(musicA.connectedTo, bus500);
  assert.notEqual(sfxB.connectedTo, bus500);
  assert.equal(sfxB.connectedTo.connectedTo, rootBus);
  assert.equal(firstBand.type, "peaking");
  assert.equal(secondBand.type, "highshelf");
  assert.ok(Math.abs(outputGain.gain.value - 10 ** (-6 / 20)) < 1e-12);
  assert.equal(rootBand.type, "highpass");
  assert.equal(rootBand.connectedTo, context.destination);
  assert.equal(context.filters.length, 3, "each shared Bus EQ is allocated once");

  mixer.Dispose();
  assert.ok(context.filters.every(filter => filter.disconnected));
  assert.equal(outputGain.disconnected, true);
});

test("strict shared Bus EQ qualification fails before allocating partial nodes", () =>
{
  const mutations = [
    catalog => { catalog.effects["900"].type = "unsupported-effect"; },
    catalog => { catalog.effects["900"].pluginId = 0x006c0003; },
    catalog => { catalog.effects["900"].controls.rtpcCount = 1; },
    catalog => { catalog.effects["900"].media.push({ index: 0, sourceId: "10" }); },
    catalog => { catalog.buses["500"].effects[0].rendered = true; },
    catalog => { catalog.buses["500"].requiresProcessing.push("state"); },
    catalog =>
    {
      const bytes = ParametricEqParameters({ processLfe: 0 });
      catalog.effects["900"].parametersBase64 = Buffer.from(bytes).toString("base64");
    },
  ];

  for (const mutate of mutations)
  {
    const context = MixerContext();
    const catalog = MixerCatalog();

    AddGraphEffect(catalog, "500", "900", 0, ParametricEqParameters());
    mutate(catalog);
    const runtime = new CjsBusGraphRuntime(catalog);
    const mixer = new CjsSharedBusMixer({
      context,
      runtime,
      destination: context.destination,
    });

    assert.equal(mixer.GetInput(runtime.ResolveSfxRoute("100"), "sfx"), null);
    assert.equal(context.gains.length, 0);
    assert.equal(context.filters.length, 0);
  }
});

test("strict shared Bus mixer allocates nothing across authored processing barriers", () =>
{
  const barriers = [
    catalog => { catalog.routes[0].userAuxSends = [ { targetBusId: "700" } ]; },
    catalog => { catalog.routes[0].outputBusId = "600"; },
    catalog => { catalog.buses["500"].parentBusId = "600"; },
    catalog => { catalog.buses["1"].parentBusId = "600"; },
    catalog => { catalog.buses["500"].type = "auxiliary-bus"; },
    catalog => { catalog.buses["500"].channelConfig.raw = 1; },
    catalog => { catalog.buses["500"].positioning.flags = 2; },
    catalog => { catalog.buses["500"].hdr.flags = 1; },
    catalog => { catalog.buses["500"].requiresProcessing = [ "state" ]; },
    catalog =>
    {
      catalog.buses["500"].effects = [ { effectId: "900", bypass: false } ];
      catalog.buses["500"].requiresProcessing = [ "effects" ];
    },
    catalog =>
    {
      catalog.buses["500"].userAuxSends = [ { targetBusId: "700" } ];
      catalog.buses["500"].requiresProcessing = [ "aux-sends" ];
    },
  ];

  for (const mutate of barriers)
  {
    const context = MixerContext();
    const catalog = MixerCatalog();

    mutate(catalog);
    const runtime = new CjsBusGraphRuntime(catalog);
    const mixer = new CjsSharedBusMixer({
      context,
      runtime,
      destination: context.destination,
    });

    assert.equal(mixer.GetInput(runtime.ResolveSfxRoute("100"), "sfx"), null);
    assert.equal(context.gains.length, 0, "a blocked route cannot allocate a partial graph");
  }

  const context = MixerContext();
  const bypassed = MixerCatalog();

  bypassed.buses["500"].effects = [ { effectId: "900", bypass: true } ];
  const runtime = new CjsBusGraphRuntime(bypassed);
  const mixer = new CjsSharedBusMixer({
    context,
    runtime,
    destination: context.destination,
  });

  assert.ok(mixer.GetInput(runtime.ResolveSfxRoute("100"), "sfx"));
});

test("CjsAudioSystem owns one Bus graph runtime for a library generation", () =>
{
  let captured = null;
  let capturedMixer = null;
  let disposed = false;
  const system = new CjsAudioSystem({
    createContext: () => FakeContext([]),
    busGraph: MixerCatalog(),
    createMusicEngine(options)
    {
      captured = options.busGraphRuntime;
      capturedMixer = options.busMixer;
      return {
        HandlesEvent: () => false,
        PostEvent: () => false,
        ExecuteAction() {},
        Process() {},
        Dispose() { disposed = true; },
      };
    },
  });

  system.Enable();
  assert.ok(captured);
  assert.ok(capturedMixer);
  assert.equal(captured.ResolveSfxRoute("100").index, 0);
  const mixerInput = capturedMixer.GetInput(
    captured.ResolveSfxRoute("100"),
    "sfx",
  );

  assert.ok(mixerInput);
  system.Dispose();
  assert.equal(disposed, true);
  assert.equal(mixerInput.disconnected, true);
  assert.equal(capturedMixer.GetInput(captured.ResolveSfxRoute("100"), "sfx"), null);
  assert.equal(captured.ResolveSfxRoute("100"), null);
});

test("audio update context normalizes host timing without owning playback time", () =>
{
  const context = createAudioUpdateContext();

  context.Update({
    GetTime: () => 12,
    GetRealTime: () => 15,
    GetDeltaT: () => 0.25,
    GetFrame: () => 41,
  });

  assert.equal(context.time, 12);
  assert.equal(context.currentTime, 12);
  assert.equal(context.realTime, 15);
  assert.equal(context.deltaTime, 0.25);
  assert.equal(context.frame, 41);
  assert.equal(context.frameCount, 41);

  context.Update({
    time: 20,
    currentTime: 99,
    realTime: 21,
    deltaTime: 0.5,
    frame: 42,
  });
  assert.equal(context.time, 20);
});

test("audio update context supplies a standalone monotonic frame context", () =>
{
  const ticks = [ 2, 2.125 ];
  const context = createAudioUpdateContext({
    now: () => ticks.shift(),
  });

  context.Update();
  assert.deepEqual(
    {
      time: context.time,
      realTime: context.realTime,
      deltaTime: context.deltaTime,
      frame: context.frame,
    },
    { time: 2, realTime: 2, deltaTime: 0, frame: 1 },
  );

  context.Update();
  assert.deepEqual(
    {
      time: context.time,
      realTime: context.realTime,
      deltaTime: context.deltaTime,
      frame: context.frame,
    },
    { time: 2.125, realTime: 2.125, deltaTime: 0.125, frame: 2 },
  );
});

test("CjsAudioSystem retains a caller-provided frame context but Carbon audio ignores its clocks", () =>
{
  const renders = [];
  const supplied = {
    time: 4,
    realTime: 5,
    deltaTime: 0.5,
    frame: 8,
  };
  const system = new CjsAudioSystem({
    updateContext: supplied,
    audioMetadata: {
      Events: {},
      SoundBanks: {},
      WemFileIDs: {},
    },
  });

  system.manager.Process = (...args) => renders.push(args);
  const context = system.Process();

  assert.equal(context, system.updateContext);
  assert.deepEqual(
    {
      time: context.time,
      realTime: context.realTime,
      deltaTime: context.deltaTime,
      frame: context.frame,
    },
    supplied,
  );
  assert.deepEqual(renders, [ [] ]);
});


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

test("pre-attachment authored eventName is recovered exactly once", async () =>
{
  const log = [];
  const system = new CjsAudioSystem({
    createContext: () => FakeContext(log),
    loadBuffer: async () => ({ fake: "buffer" }),
    audioMetadata: {
      Events: {
        engine_loop: {
          eventID: 11,
          maxRadiusAttenuation: 500,
          isLoop: 1,
          is2D: 0,
          isVital: 0,
          eventsStoppedBy: [],
          soundbanks: [ "ships.bnk" ],
        },
      },
      SoundBanks: { "ships.bnk": { EssentialSoundBank: 0 } },
      WemFileIDs: {},
    },
  });
  const emitter = AudEmitter.from({
    eventName: "engine_loop",
    position: [ 10, 0, 0 ],
  });

  system.AdoptEmitter(emitter);
  system.Attach();
  try
  {
    assert.equal(system.Enable([ "ships.bnk" ]), true);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(system.backend.GetPlayingCount(), 1);
    assert.equal(log.filter(value => value === "start").length, 1);

    system.AdoptEmitter(emitter);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(system.backend.GetPlayingCount(), 1);
    assert.equal(log.filter(value => value === "start").length, 1);

    system.Disable();
    assert.equal(system.Enable([ "ships.bnk" ]), true);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(system.backend.GetPlayingCount(), 1);
    assert.equal(
      log.filter(value => value === "start").length,
      2,
      "re-enable performs only Carbon's normal loop wake replay",
    );
  }
  finally
  {
    system.Dispose();
  }
});

test("pre-backend listener placement realizes its actual stored orientation once", () =>
{
  let writes = 0;
  const CountingParam = () =>
  {
    let current = 0;
    return {
      get value()
      {
        return current;
      },
      set value(value)
      {
        current = value;
        writes++;
      },
    };
  };
  const context = FakeContext([]);
  for (const name of [
    "positionX", "positionY", "positionZ",
    "forwardX", "forwardY", "forwardZ",
    "upX", "upY", "upZ",
  ])
  {
    context.listener[name] = CountingParam();
  }
  const system = new CjsAudioSystem({
    createContext: () => context,
    audioMetadata: {
      Events: {},
      SoundBanks: {},
      WemFileIDs: {},
    },
  });
  const listener = new AudListener();

  listener.SetPosition([ 1, 0, 0 ], [ 0, 1, 0 ], [ 3, 4, 5 ]);
  listener.MarkPositionReceived();
  system.AdoptEmitter(listener);
  system.Attach();
  try
  {
    assert.equal(system.Enable(), true);
    assert.deepEqual([
      context.listener.positionX.value,
      context.listener.positionY.value,
      context.listener.positionZ.value,
      context.listener.forwardX.value,
      context.listener.forwardY.value,
      context.listener.forwardZ.value,
      context.listener.upX.value,
      context.listener.upY.value,
      context.listener.upZ.value,
    ], [ 3, 4, 5, 1, 0, 0, 0, 1, 0 ]);
    assert.equal(writes, 9);

    system.AdoptEmitter(listener);
    system.Disable();
    assert.equal(system.Enable(), true);
    assert.equal(writes, 9, "the same backend does not receive duplicate placement writes");

    listener.SetPosition([ 0, 0, 1 ], [ 0, 1, 0 ], [ 6, 7, 8 ]);
    assert.equal(writes, 18, "live listener changes still apply immediately");
  }
  finally
  {
    system.Dispose();
  }
});

test("listener realization retries when a backend gains placement support", () =>
{
  const backend = {};
  const writes = [];

  AudGameObjResource.backend = backend;
  try
  {
    const listener = new AudListener();

    listener.SetPosition([ 1, 0, 0 ], [ 0, 0, 1 ], [ 2, 3, 4 ]);
    assert.equal(listener.RealizePlacement(), false);

    backend.SetListenerPosition = (...values) => writes.push(values);
    assert.equal(listener.RealizePlacement(), true);
    assert.equal(listener.RealizePlacement(), false);
    assert.equal(writes.length, 1);
  }
  finally
  {
    AudGameObjResource.backend = null;
  }
});


test("temporary culling preserves authored per-object SFX container state", () =>
{
  const log = [];
  const sfx = new CjsSfxEngine({
    graph: {
      schemaVersion: 2,
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
      "Cull/Wake preserves selection state across temporary node retirement",
    );

    const wrongInstance = new AudEmitter();

    wrongInstance.ID = emitter.ID;
    assert.equal(system.ReleaseEmitter(wrongInstance), false);
    assert.equal(
      system.manager.GetAudioEmitter(emitter.ID),
      emitter,
      "a different object reusing an ID cannot destructively release the owner",
    );

    assert.equal(system.ReleaseEmitter(emitter), true);
    assert.equal(system.ReleaseEmitter(emitter), false);
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

test("Cull composes loop retirement and one-shot range actions through the backend", async () =>
{
  const log = [];
  const context = FakeContext(log);
  const sources = [];

  context.createBufferSource = () =>
  {
    const source = {
      buffer: null,
      loop: false,
      onended: null,
      stoppedAt: null,
      connect() {},
      disconnect() {},
      start(time)
      {
        source.startedAt = time;
      },
      stop(time)
      {
        source.stoppedAt = time ?? context.currentTime;
      },
    };

    sources.push(source);
    return source;
  };

  const system = new CjsAudioSystem({
    createContext: () => context,
    loadBuffer: async () => ({ duration: 2 }),
    audioMetadata: {
      Events: {
        engine_loop: {
          eventID: 11,
          maxRadiusAttenuation: 100,
          isLoop: 1,
          is2D: 0,
          isVital: 0,
          eventsStoppedBy: [],
          soundbanks: [ "ships.bnk" ],
        },
        impact: {
          eventID: 12,
          maxRadiusAttenuation: 100,
          isLoop: 0,
          is2D: 0,
          isVital: 0,
          eventsStoppedBy: [],
          soundbanks: [ "ships.bnk" ],
        },
      },
      SoundBanks: {
        "ships.bnk": { EssentialSoundBank: 0 },
      },
      WemFileIDs: {},
    },
  });

  system.Attach();
  try
  {
    assert.equal(system.Enable([ "ships.bnk" ]), true);
    const emitter = new AudEmitter();

    emitter.SetPosition([ 1, 0, 0 ], [ 0, 1, 0 ], [ 0, 0, 0 ]);
    emitter.SetDistanceSqFromListener(0);
    system.AdoptEmitter(emitter);
    emitter.CalculateCullingWeight();

    const firstLoop = emitter.SendEvent("engine_loop");

    await new Promise(resolve => setImmediate(resolve));
    context.currentTime = 1;
    emitter.Cull();
    assert.equal(sources[0].stoppedAt, 4);
    assert.equal(emitter.GetPlayingEvents().has(firstLoop), true);

    emitter.Wake();
    await new Promise(resolve => setImmediate(resolve));
    const secondLoop = [ ...emitter.GetPlayingEvents().keys() ]
      .find(value => value !== firstLoop);

    assert.ok(secondLoop > firstLoop);
    assert.equal(
      log.filter(value => value?.positionX).length,
      2,
      "Wake realizes a fresh emitter node generation",
    );

    sources[0].onended?.();
    assert.equal(emitter.GetPlayingEvents().has(firstLoop), false);
    assert.equal(
      emitter.GetPlayingEvents().has(secondLoop),
      true,
      "old-generation completion cannot remove the replayed loop",
    );

    emitter.StopSound(secondLoop, 0);
    sources[1].onended?.();

    emitter.SetDistanceSqFromListener(0);
    emitter.CalculateCullingWeight();
    const inRange = emitter.SendEvent("impact");

    await new Promise(resolve => setImmediate(resolve));
    context.currentTime = 2;
    emitter.Cull();
    assert.equal(
      sources[2].stoppedAt,
      null,
      "Break lets an in-range one-shot finish naturally",
    );
    sources[2].onended?.();
    assert.equal(emitter.GetPlayingEvents().has(inRange), false);

    emitter.Wake();
    emitter.SetDistanceSqFromListener(200 * 200);
    const outOfRange = emitter.SendEvent("impact");

    await new Promise(resolve => setImmediate(resolve));
    emitter.CalculateCullingWeight();
    context.currentTime = 3;
    emitter.Cull();
    assert.equal(
      sources[3].stoppedAt,
      4,
      "an out-of-range one-shot receives Carbon's default one-second stop",
    );
    sources[3].onended?.();
    assert.equal(emitter.GetPlayingEvents().has(outOfRange), false);
  }
  finally
  {
    system.Dispose();
  }
});

test("graph adoption owns AudioCurveSetDriver monitored watchers", () =>
{
  const system = new CjsAudioSystem({
    createContext: () => FakeContext([]),
    loadBuffer: async () => ({ fake: "buffer" }),
    audioMetadata: {
      Events: {},
      SoundBanks: {},
      WemFileIDs: {},
    },
  });
  const first = AudioCurveSetDriver.from({
    audioParameterName: "boost",
  });
  const second = AudioCurveSetDriver.from({
    audioParameterName: "boost",
  });
  const graph = {
    Traverse(visitor)
    {
      visitor(first);
      visitor(second);
    },
  };

  system.Attach();
  try
  {
    assert.deepEqual(system.AdoptGraph(graph), [ first, second ]);
    assert.deepEqual(system.AdoptGraph(graph), [ first, second ]);
    assert.equal(system.manager.GetParameterInfo("boost"), null);

    assert.equal(system.Enable(), true);
    assert.equal(system.manager.GetParameterInfo("boost").watchers, 2);

    assert.deepEqual(system.ReleaseGraph(first), [ first ]);
    assert.equal(system.manager.GetParameterInfo("boost").watchers, 1);
    assert.deepEqual(system.ReleaseGraph(first), []);

    system.Dispose();
    assert.equal(system.manager.GetParameterInfo("boost"), null);
  }
  finally
  {
    system.Detach();
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
