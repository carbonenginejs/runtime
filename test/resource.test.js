import assert from "node:assert/strict";
import { test } from "node:test";
import { CjsSchema } from "@carbonenginejs/core-types/schema";
import * as runtimeResource from "../npm/dist/index.js";
import {
  CjsMemoryResourceSource,
  CjsAudioDTO,
  CjsGeometryDTO,
  CjsImageDTO,
  CjsShaderDTO,
  CjsTextureDTO,
  CjsVideoDTO,
  CjsEventEmitter,
  Tr2EffectRes,
  Tr2ImageRes,
  TriGeometryRes,
  TriTextureRes,
  CjsResMan,
  CjsResource,
  CjsResourceProbe,
  ResourcePayloadType,
  validateRgbaPayload,
  validateTexturePayload,
  validateAudioPayload,
  validateVideoPayload,
  Tr2GrannyStateRes,
  Tr2LightProfileRes,
  Tr2MaterialRes,
  CjsTextureArrayRes,
  CjsTextureParameterProxy,
  TriGrannyRes,
  getResourceExtension,
  normalizeResourcePath
} from "../npm/dist/index.js";

test("runtime-resource does not export an event scope layer", () => {
  assert.equal(runtimeResource.CjsEventEmitter, CjsEventEmitter);
  assert.equal("CjsEventEmitterScope" in runtimeResource, false);
});

test("CjsEventEmitter supports direct source subscriptions", () => {
  const emitter = new CjsEventEmitter();
  const source = { count: 0 };
  const seen = [];

  function listener(value) {
    this.count += value;
    seen.push(value);
  }

  assert.equal(Object.prototype.hasOwnProperty.call(emitter, "__state"), false);
  assert.equal(emitter.OnEvent("Loaded", listener, source), emitter);

  assert.equal(emitter.__state.events instanceof Map, true);
  assert.equal(emitter.HasEvent("loaded", listener, source), true);
  assert.deepEqual(emitter.GetEventNames(), ["loaded"]);

  emitter.EmitEvent("LOADED", 2);

  assert.deepEqual(seen, [2]);
  assert.equal(source.count, 2);

  emitter.OffEvent("LoAdEd", listener, source);
  assert.equal(Object.prototype.hasOwnProperty.call(emitter.__state, "events"), false);
  emitter.EmitEvent("loaded", 2);

  assert.deepEqual(seen, [2]);
  assert.equal(emitter.HasEvent("loaded"), false);
});

test("CjsEventEmitter once listeners are removed before callback completion", () => {
  const emitter = new CjsEventEmitter();
  let count = 0;

  emitter.OnceEvent("fail", () => {
    count += 1;
    throw new Error("boom");
  });

  assert.throws(() => emitter.EmitEvent("fail"), /boom/u);
  assert.equal(count, 1);
  assert.equal(emitter.HasEvent("fail"), false);

  emitter.EmitEvent("fail");

  assert.equal(count, 1);
});

test("CjsEventEmitter clears event groups and supports AddEvents once suffix", () => {
  const emitter = new CjsEventEmitter();
  const values = [];
  const source = { value: 3 };

  assert.equal(emitter.AddEvents({
    changed(value) {
      values.push(value);
    },
    "changed.once": [function(value) {
      values.push(value + this.value);
    }, source]
  }), emitter);

  emitter.EmitEvent("changed", 4);
  emitter.EmitEvent("changed", 5);

  assert.deepEqual(values, [4, 7, 5]);
  assert.equal(emitter.HasEvent("changed"), true);

  emitter.ClearEvent("*");

  assert.equal(emitter.HasEvent("*"), false);
});

test("CjsEventEmitter independently removes external listener sources", () => {
  const ship = {};
  const scene = {};
  const resource = new CjsEventEmitter();
  const shipValues = [];
  const sceneValues = [];

  function onShipLoaded(value) {
    shipValues.push(value);
  }

  function onSceneLoaded(value) {
    sceneValues.push(value);
  }

  resource.OnEvent("loaded", onShipLoaded, ship);
  resource.OnEvent("loaded", onSceneLoaded, scene);

  assert.equal(resource.GetEventListenerCount("loaded"), 2);

  resource.EmitEvent("loaded", 7);

  assert.deepEqual(shipValues, [7]);
  assert.deepEqual(sceneValues, [7]);

  resource.OffEvent("loaded", null, ship);
  resource.EmitEvent("loaded", 9);

  assert.deepEqual(shipValues, [7]);
  assert.deepEqual(sceneValues, [7, 9]);
  assert.equal(resource.GetEventListenerCount("loaded"), 1);

  resource.ClearEvent("*");
  resource.EmitEvent("loaded", 11);

  assert.deepEqual(sceneValues, [7, 9]);
  assert.equal(resource.HasEvent("loaded"), false);
});

test("resource path helpers normalize Carbon-style paths", () => {
  assert.equal(normalizeResourcePath(" RES:\\Texture\\Ship.DDS "), "res:/texture/ship.dds");
  assert.equal(getResourceExtension("res:/texture/ship.dds?variant=1"), "dds");
});

test("runtime-owned Carbon resource classes are canonical CjsResource implementations", () => {
  const granny = new TriGrannyRes().Initialize("res:/character/ship.gr2");
  const gstate = new Tr2GrannyStateRes().Initialize("res:/character/ship.gstate");
  const lightProfile = new Tr2LightProfileRes().Initialize("res:/light/ship.lightprofile");

  assert.equal(new Tr2MaterialRes().name, "");
  assert.equal(granny instanceof CjsResource, true);
  assert.equal(gstate instanceof CjsResource, true);
  assert.equal(lightProfile instanceof CjsResource, true);
  assert.equal(TriGrannyRes.payload, "granny");
  assert.equal(Tr2GrannyStateRes.payload, "granny-state");
  assert.equal(Tr2LightProfileRes.payload, "light-profile");

  const dto = { skeleton: { bones: [] }, additiveAnimations: [] };
  gstate.SetDTO(dto);
  assert.equal(gstate.GetDTO(), dto);
  assert.equal("models" in dto, false);

  assert.equal(CjsSchema.GetConstructor("TriGrannyRes"), TriGrannyRes);
  assert.equal(CjsSchema.GetConstructor("Tr2GrannyStateRes"), Tr2GrannyStateRes);
  assert.equal(CjsSchema.GetConstructor("Tr2LightProfileRes"), Tr2LightProfileRes);

  const resMan = new CjsResMan().RegisterResourceType(TriGrannyRes);
  assert.equal(
    resMan.GetResource("res:/character/other.gr2", { requirement: "granny" }) instanceof TriGrannyRes,
    true
  );
});

test("CjsResMan.Register adds formats and semantic resource types", () => {
  class CjsTestFormat
  {
    static inputTypes = [ "foo", "bar" ];
    static outputTypes = [ "granny" ];
    static read(input) { return input; }
  }

  const source = { Read() { return new Uint8Array([ 1 ]); } };
  const resMan = new CjsResMan().Register({
    source,
    formats: [ CjsTestFormat ],
    resourceTypes: [ TriGrannyRes ]
  });

  assert.equal(resMan.source, source);
  assert.equal(resMan.ResolveFormat("foo", { emit: "granny" }), CjsTestFormat);
  assert.equal(resMan.ResolveFormat("bar", { emit: "granny" }), CjsTestFormat);
  assert.equal(
    resMan.GetResource("res:/character/value.foo", { requirement: "granny" }) instanceof TriGrannyRes,
    true
  );
  assert.equal(resMan.Register({ formats: [ CjsTestFormat ] }), resMan);
  assert.deepEqual(resMan.GetFormats("foo"), [ CjsTestFormat ]);
});

test("CjsResource exposes Carbon-style lifecycle methods and schema", () => {
  const resource = new CjsResource().Initialize("res:/Texture/Ship.DDS");
  const states = [];
  resource.OnEvent("statechange", (changed, state, previous) => {
    assert.equal(changed, resource);
    states.push([ state, previous ]);
  });

  assert.equal(resource instanceof CjsEventEmitter, true);
  assert.equal(Object.prototype.hasOwnProperty.call(resource, "__state"), true);
  assert.equal(resource.__state.events instanceof Map, true);
  assert.equal(Object.prototype.hasOwnProperty.call(resource.__state, "dirty"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(resource.__state, "rebuild"), false);
  assert.equal(resource.GetPath(), "res:/texture/ship.dds");
  assert.equal(resource.GetExt(), "dds");
  assert.equal(resource.state, CjsResource.State.EMPTY);
  assert.equal(resource.IsPrepared(), false);
  assert.equal(resource.IsGood(), false);
  assert.equal(resource.HasLoaded(), false);
  assert.equal(resource.MarkLoaded().HasLoaded(), true);
  assert.equal(resource.MarkPrepared().IsPrepared(), true);
  assert.equal(resource.MarkGood().IsGood(), true);
  assert.deepEqual(states, [
    [ CjsResource.State.LOADED, CjsResource.State.EMPTY ],
    [ CjsResource.State.PREPARED, CjsResource.State.LOADED ]
  ]);
  assert.equal(CjsResource.State.GOOD, undefined);
  assert.throws(() => resource.SetState("cooked"), /Invalid CjsResource state/u);
  assert.equal(CjsSchema.GetConstructor("CjsResource"), CjsResource);
  assert.equal(CjsSchema.getField(CjsResource, "path").type.kind, "path");
  assert.equal(resource.GetValues().path, "res:/texture/ship.dds");
});

test("CjsMotherLode cache is reused through CjsResMan.GetResource", () => {
  const resMan = new CjsResMan();
  const a = resMan.GetResource("res:/Texture/Ship.DDS");
  const b = resMan.GetResource("RES:/texture/ship.dds");

  assert.equal(a, b);
  assert.equal(resMan instanceof CjsEventEmitter, true);
  assert.equal(resMan.motherLode.GetCount(), 1);
});

test("CjsTextureArrayRes exposes texture parameter proxies backed by one parent", () =>
{
  const scheduled = [];
  const textureArray = new CjsTextureArrayRes({
    paths: [
      "RES:/Texture/Detail1.DDS",
      "res:/texture/detail2.dds",
      "res:/texture/detail3.dds"
    ],
    layerNames: [ "Detail1Map", "Detail2Map", "Detail3Map" ],
    updateScheduler: resource => scheduled.push(resource)
  });

  assert.equal(textureArray.GetLayerCount(), 3);
  assert.equal(scheduled.length, 1);

  const detail1 = textureArray.GetLayerParameter(0);
  assert.equal(detail1 instanceof CjsTextureParameterProxy, true);
  assert.equal(detail1.GetParameterName(), "Detail1Map");
  assert.equal(detail1.GetLayerIndex(), 0);
  assert.equal(detail1.GetValue(), "res:/texture/detail1.dds");
  assert.equal(detail1.textureRes, textureArray);
  assert.equal(detail1.res, textureArray);
  assert.equal(detail1.resource, textureArray);
  assert.equal(detail1.GetResource(), textureArray);
  assert.deepEqual(detail1.GetResources(), [ textureArray ]);
  assert.equal(CjsSchema.GetConstructor("CjsTextureArrayRes"), CjsTextureArrayRes);

  const initial = textureArray.ConsumeUpdateRequest();
  assert.deepEqual(initial.paths, [
    "res:/texture/detail1.dds",
    "res:/texture/detail2.dds",
    "res:/texture/detail3.dds"
  ]);
  assert.equal(textureArray.CommitPreparedAdapterRevision(initial.revision, "test", {}).published, true);
  assert.equal(textureArray.IsPrepared(), true);
  assert.equal(textureArray.IsGood(), true);
});

test("CjsTextureArrayRes coalesces proxy changes into the next frame request", () =>
{
  let scheduled = 0;
  const textureArray = new CjsTextureArrayRes({
    paths: [ "res:/one.dds", "res:/two.dds", "res:/three.dds" ],
    updateScheduler: () => scheduled++
  });
  const initial = textureArray.ConsumeUpdateRequest();
  textureArray.CommitPreparedAdapterRevision(initial.revision, "test", {});
  const preparedRevision = textureArray.GetPreparedRevision();
  scheduled = 0;

  assert.equal(textureArray.GetLayerParameter(0).SetValue("res:/changed-one.dds"), true);
  assert.equal(textureArray.GetLayerParameter(2).SetResourcePath("res:/changed-three.dds"), true);
  assert.equal(textureArray.GetLayerParameter(2).SetValue("RES:/CHANGED-THREE.DDS"), false);
  assert.equal(scheduled, 1);
  assert.equal(textureArray.IsGood(), true);
  assert.equal(textureArray.NeedsUpdate(), true);

  const request = textureArray.ConsumeUpdateRequest();
  assert.deepEqual(request.dirtyLayers, [ 0, 2 ]);
  assert.deepEqual(request.paths, [
    "res:/changed-one.dds",
    "res:/two.dds",
    "res:/changed-three.dds"
  ]);
  assert.equal(textureArray.CommitPreparedAdapterRevision(preparedRevision, "test", {}).published, false);
  assert.equal(textureArray.CommitPreparedAdapterRevision(request.revision, "test", {}).published, true);
  assert.equal(textureArray.NeedsUpdate(), false);
});

test("CjsTextureParameterProxy can attach a source while keeping the array as textureRes", () =>
{
  const textureArray = new CjsTextureArrayRes({ layerCount: 2 });
  textureArray.ConsumeUpdateRequest();
  const proxy = textureArray.GetLayerParameter(1);
  const source = {
    GetPath() {
      return "RES:/Attached/Layer.DDS";
    }
  };

  assert.equal(proxy.SetResource(source), true);
  assert.equal(proxy.GetSourceResource(), source);
  assert.equal(proxy.GetResourcePath(), "");
  assert.equal(proxy.textureRes, textureArray);
  assert.throws(() => textureArray.GetLayerParameter(2), /out of range/u);
});

test("CjsTextureArrayRes preserves unchanged sources and dirties only changed bulk paths", () =>
{
  const textureArray = new CjsTextureArrayRes({
    paths: [ "res:/one.dds", "res:/two.dds", "res:/three.dds" ]
  });
  textureArray.ConsumeUpdateRequest();
  const sources = [ { id: 1 }, { id: 2 }, { id: 3 } ];
  for (let layer = 0; layer < sources.length; layer++)
  {
    textureArray.SetLayerResource(layer, sources[layer]);
  }
  const attached = textureArray.ConsumeUpdateRequest();
  textureArray.CommitPreparedAdapterRevision(attached.revision, "test", {});

  assert.equal(textureArray.SetLayerResourcePaths([
    "RES:/ONE.DDS",
    "res:/two.dds",
    "res:/three.dds"
  ]), false);
  assert.deepEqual([
    textureArray.GetLayerResource(0),
    textureArray.GetLayerResource(1),
    textureArray.GetLayerResource(2)
  ], sources);
  assert.equal(textureArray.ConsumeUpdateRequest(), null);

  assert.equal(textureArray.SetLayerResourcePaths([
    "res:/one.dds",
    "res:/changed-two.dds",
    "res:/three.dds"
  ]), true);
  assert.equal(textureArray.GetLayerResource(0), sources[0]);
  assert.equal(textureArray.GetLayerResource(1), null);
  assert.equal(textureArray.GetLayerResource(2), sources[2]);
  const changed = textureArray.ConsumeUpdateRequest();
  assert.deepEqual(changed.dirtyLayers, [ 1 ]);
  assert.equal(changed.topologyChanged, false);
});

test("CjsTextureArrayRes reports topology shrink with only valid current layers", () =>
{
  const textureArray = new CjsTextureArrayRes({
    paths: [ "res:/one.dds", "res:/two.dds", "res:/three.dds" ]
  });
  const initial = textureArray.ConsumeUpdateRequest();
  assert.equal(initial.topologyChanged, true);
  textureArray.CommitPreparedAdapterRevision(initial.revision, "test", {});

  assert.equal(textureArray.SetLayerCount(2), true);
  const request = textureArray.ConsumeUpdateRequest();
  assert.equal(request.topologyChanged, true);
  assert.deepEqual(request.dirtyLayers, [ 0, 1 ]);
  assert.equal(request.paths.length, 2);
  assert.throws(() => textureArray.GetLayerResource(2), /out of range/u);
});

test("CjsTextureParameterProxy exposes source attachment and same-source revision changes", () =>
{
  let scheduled = 0;
  const textureArray = new CjsTextureArrayRes({
    paths: [ "res:/authored.dds" ],
    updateScheduler: () => scheduled++
  });
  const initial = textureArray.ConsumeUpdateRequest();
  textureArray.CommitPreparedAdapterRevision(initial.revision, "test", {});
  scheduled = 0;

  const proxy = textureArray.GetLayerParameter(0);
  const source = { path: "res:/resolved-lod.dds" };
  const changes = [];
  proxy.OnEvent("changed", (...args) => changes.push(args));

  assert.equal(proxy.SetSourceResource(source), true);
  assert.equal(proxy.GetResourcePath(), "res:/authored.dds");
  assert.equal(proxy.GetSourceResource(), source);
  assert.equal(changes.at(-1)[1], "sourceresource");
  textureArray.ConsumeUpdateRequest();
  scheduled = 0;

  assert.equal(proxy.Touch(), proxy);
  assert.equal(proxy.GetSourceResource(), source);
  assert.equal(scheduled, 1);
  assert.deepEqual(textureArray.ConsumeUpdateRequest().dirtyLayers, [ 0 ]);
  assert.equal(changes.at(-1)[1], "sourcerevision");
});

test("CjsTextureArrayRes requeues consumed work for retry", () =>
{
  let scheduled = 0;
  const textureArray = new CjsTextureArrayRes({
    paths: [ "res:/one.dds", "res:/two.dds" ],
    updateScheduler: () => scheduled++
  });
  const request = textureArray.ConsumeUpdateRequest();
  scheduled = 0;

  assert.equal(textureArray.IsRevisionInFlight(request.revision), true);
  assert.deepEqual(textureArray.GetInFlightRevisions(), [ request.revision ]);
  assert.equal(textureArray.RetryUpdateRequest(request.revision), true);
  assert.equal(textureArray.IsRevisionInFlight(request.revision), false);
  assert.equal(scheduled, 1);

  const retry = textureArray.ConsumeUpdateRequest();
  assert.equal(retry.revision, request.revision);
  assert.deepEqual(retry.dirtyLayers, request.dirtyLayers);
  assert.equal(retry.topologyChanged, request.topologyChanged);
});

test("CjsTextureArrayRes rejects commit-before-consume and stale adapter candidates", () =>
{
  const destroyed = [];
  const makeCandidate = name => ({
    name,
    destroy() { destroyed.push(name); }
  });
  const textureArray = new CjsTextureArrayRes({ paths: [ "res:/one.dds" ] });
  const revision = textureArray.GetRequestedRevision();

  assert.deepEqual(
    textureArray.CommitPreparedAdapterRevision(revision, "webgpu", makeCandidate("early")),
    { published: false, revision, displaced: null }
  );
  assert.deepEqual(destroyed, [ "early" ]);

  const first = textureArray.ConsumeUpdateRequest();
  const newerRevision = textureArray.TouchLayer(0).GetRequestedRevision();
  assert.equal(newerRevision > first.revision, true);
  assert.equal(
    textureArray.CommitPreparedAdapterRevision(first.revision, "webgpu", makeCandidate("stale")).published,
    false
  );
  assert.deepEqual(destroyed, [ "early", "stale" ]);
});

test("CjsTextureArrayRes atomically publishes adapters across reentrant invalidation", async () =>
{
  const textureArray = new CjsTextureArrayRes({ paths: [ "res:/one.dds" ] });
  const request = textureArray.ConsumeUpdateRequest();
  const ready = textureArray.Ready();
  const candidate = { id: "first" };
  let observed = false;

  textureArray.OnEvent("revisionprepared", (resource, revision, adapterKey, allocation) =>
  {
    assert.equal(resource.GetAdapterResource(adapterKey), candidate);
    assert.equal(resource.GetPreparedRevision(), revision);
    assert.equal(allocation, candidate);
    observed = true;
    resource.TouchLayer(0);
  });

  const result = textureArray.CommitPreparedAdapterRevision(request.revision, "webgpu", candidate);
  assert.equal(result.published, true);
  assert.equal(result.displaced, null);
  assert.equal(observed, true);
  assert.equal(await ready, textureArray);
  assert.equal(textureArray.GetAdapterResource("webgpu"), candidate);
  assert.equal(textureArray.GetPreparedRevision(), request.revision);
  assert.equal(textureArray.GetRequestedRevision() > request.revision, true);
  assert.equal(textureArray.NeedsUpdate(), true);
  assert.equal(textureArray.IsGood(), true);
});

test("CjsTextureArrayRes returns displaced allocations only after publication", () =>
{
  const textureArray = new CjsTextureArrayRes({ paths: [ "res:/one.dds" ] });
  const firstRequest = textureArray.ConsumeUpdateRequest();
  const firstAllocation = { id: "first" };
  textureArray.CommitPreparedAdapterRevision(firstRequest.revision, "webgpu", firstAllocation);

  textureArray.TouchLayer(0);
  const secondRequest = textureArray.ConsumeUpdateRequest();
  const secondAllocation = { id: "second" };
  const result = textureArray.CommitPreparedAdapterRevision(
    secondRequest.revision,
    "webgpu",
    secondAllocation
  );

  assert.equal(result.published, true);
  assert.equal(result.displaced, firstAllocation);
  assert.equal(textureArray.GetAdapterResource("webgpu"), secondAllocation);
  assert.equal(textureArray.GetPreparedRevision(), secondRequest.revision);
});

test("CjsTextureArrayRes keeps the previous prepared generation after replacement failure", async () =>
{
  const textureArray = new CjsTextureArrayRes({ paths: [ "res:/one.dds" ] });
  const initial = textureArray.ConsumeUpdateRequest();
  const allocation = { id: "prepared" };
  textureArray.CommitPreparedAdapterRevision(initial.revision, "webgpu", allocation);
  const preparedRevision = textureArray.GetPreparedRevision();

  textureArray.TouchLayer(0);
  const replacement = textureArray.ConsumeUpdateRequest();
  const ready = textureArray.Ready();
  assert.equal(textureArray.FailUpdateRequest(replacement.revision, new Error("replacement failed")), true);

  await assert.rejects(ready, /replacement failed/u);
  assert.equal(textureArray.IsGood(), true);
  assert.equal(textureArray.GetPreparedRevision(), preparedRevision);
  assert.equal(textureArray.GetAdapterResource("webgpu"), allocation);
});

test("CjsTextureArrayRes readiness follows generation failure and adapter loss", async () =>
{
  let destroyed = 0;
  const allocation = { destroy() { destroyed++; } };
  const textureArray = new CjsTextureArrayRes({ paths: [ "res:/one.dds" ] });
  const initial = textureArray.ConsumeUpdateRequest();
  const failedReady = textureArray.Ready();
  const failure = new Error("prepare failed");

  assert.equal(textureArray.FailUpdateRequest(initial.revision, failure), true);
  await assert.rejects(failedReady, /prepare failed/u);
  await assert.rejects(textureArray.Ready(), /prepare failed/u);
  assert.equal(textureArray.IsFailed(), true);

  textureArray.TouchLayer(0);
  const retry = textureArray.ConsumeUpdateRequest();
  const ready = textureArray.Ready();
  assert.equal(textureArray.CommitPreparedAdapterRevision(retry.revision, "webgpu", allocation).published, true);
  assert.equal(await ready, textureArray);
  assert.equal(textureArray.IsGood(), true);

  assert.equal(textureArray.HandleAdapterLoss("webgpu"), allocation);
  assert.equal(destroyed, 1);
  assert.equal(textureArray.GetAdapterResource("webgpu"), null);
  assert.equal(textureArray.IsGood(), false);
  const lost = textureArray.ConsumeUpdateRequest();
  assert.equal(lost.topologyChanged, true);
  assert.deepEqual(lost.dirtyLayers, [ 0 ]);
});

test("CjsObjectDTO and CjsGeometryDTO carry payload contracts", () => {
  const geometry = new CjsGeometryDTO({
    sourceFormat: "cmf",
    meshes: [ { name: "body" } ],
    animations: [ { name: "idle" } ],
    bounds: { min: [ 0, 0, 0 ] }
  });

  assert.equal(CjsGeometryDTO.payload, "geometry");
  assert.equal(geometry.sourceFormat, "cmf");
  assert.equal(geometry.meshes.length, 1);
  assert.equal(CjsSchema.GetConstructor("CjsGeometryDTO"), CjsGeometryDTO);
  assert.equal(CjsSchema.getField(CjsGeometryDTO, "resourceData"), null);
  assert.deepEqual(geometry.GetValues().meshes, [ { name: "body" } ]);
});

test("CjsTextureDTO exposes texture/image intent fields", () => {
  const texture = new CjsTextureDTO({
    width: 64,
    height: 32,
    channels: 4,
    pixelFormat: "RGBA8",
    dimension: "2d",
    arraySize: 1,
    mipCount: 2,
    subresources: [ { mip: 0, layer: 0, offset: 0, byteLength: 16 } ],
    hasMipMaps: true,
    isCompressed: true
  });

  assert.equal(texture.width, 64);
  assert.equal(texture.height, 32);
  assert.equal(texture.dimension, "2d");
  assert.equal(texture.arraySize, 1);
  assert.equal(texture.subresources.length, 1);
  assert.deepEqual(texture.GetValues().pixelFormat, "RGBA8");
  assert.equal(CjsTextureDTO.payload, "texture");
});

test("resource payload validators enforce canonical typed media shapes", () => {
  const rgba = validateRgbaPayload({
    payloadType: ResourcePayloadType.RGBA,
    width: 2,
    height: 1,
    pixelFormat: "rgba8unorm",
    data: new Uint8Array([ 255, 0, 0, 255, 0, 0, 0, 0 ]),
    strideBytes: 8,
    origin: "top-left",
    colorSpace: "srgb",
    alphaMode: "straight"
  });
  assert.equal(rgba.data instanceof Uint8Array, true);

  const hdr = validateRgbaPayload({
    payloadType: ResourcePayloadType.RGBA,
    width: 1,
    height: 1,
    pixelFormat: "rgba32float",
    data: new Float32Array([ 1, 0.5, 0, 1 ]),
    strideBytes: 16,
    origin: "top-left",
    colorSpace: "linear",
    alphaMode: "straight"
  });
  assert.equal(hdr.data instanceof Float32Array, true);

  const texture = validateTexturePayload({
    payloadType: ResourcePayloadType.TEXTURE,
    width: 4,
    height: 4,
    dimension: "2d",
    pixelFormat: "bc1-rgba-unorm",
    isCompressed: true,
    mipCount: 1,
    arraySize: 1,
    data: new Uint8Array(8),
    subresources: [ {
      mip: 0,
      layer: 0,
      offset: 0,
      byteLength: 8,
      rowPitch: 8,
      slicePitch: 8,
      width: 4,
      height: 4
    } ]
  });
  assert.equal(texture.isCompressed, true);

  const audio = validateAudioPayload({
    payloadType: ResourcePayloadType.PCM,
    sampleRate: 48000,
    channels: 2,
    frameCount: 1,
    sampleFormat: "pcm16le",
    data: new Int16Array([ 0, 0 ]),
    durationSeconds: 1 / 48000
  });
  assert.equal(audio.channels, 2);

  const video = validateVideoPayload({
    payloadType: ResourcePayloadType.VIDEO,
    sourceFormat: "webm",
    duration: 1000,
    durationTimescale: 1000,
    tracks: []
  });
  assert.equal(video.sourceFormat, "webm");
});

test("resource payload validators reject ambiguous image data", () => {
  assert.throws(() => validateRgbaPayload({
    payloadType: ResourcePayloadType.RGBA,
    width: 1,
    height: 1,
    pixelFormat: "rgba8unorm",
    data: [ 255, 255, 255, 255 ],
    strideBytes: 4,
    origin: "top-left",
    colorSpace: "srgb",
    alphaMode: "opaque"
  }), /Uint8Array/);
});

test("CjsResourceProbe preserves generalized capability variants", () => {
  const probe = CjsResourceProbe.createSupported("dds", [
    {
      kind: "rgba",
      payloadType: "rgba",
      codec: "rgba8unorm",
      supported: true,
      isDecoded: true,
      rgbaDecodeSupported: true
    },
    {
      kind: "compressed",
      payloadType: "texture",
      codec: "bc7-rgba-unorm",
      supported: true,
      mimeType: "image/vnd-ms.dds",
      containerOnly: false,
      isDecoded: false
    }
  ]);

  assert.equal(probe.preferred, "bc7-rgba-unorm");
  assert.equal(probe.canUseRaw(), true);
  assert.equal(probe.canUse("rgba"), true);
  assert.equal(probe.canUseCompressed(), true);
  assert.equal(probe.variants[0].payloadType, "rgba");
  assert.equal(probe.variants[0].isDecoded, true);
  assert.equal(probe.variants[0].rgbaDecodeSupported, true);
  assert.equal(probe.variants[1].mimeType, "image/vnd-ms.dds");
  assert.equal(probe.variants[1].containerOnly, false);
  assert.equal(probe.variants[1].isDecoded, false);
});

test("CjsResourceProbe.from normalizes plain reports without dropping handoff metadata", () => {
  const probe = CjsResourceProbe.from({
    format: "webp",
    source: "buffer",
    supported: "partial",
    preferred: "webp",
    variants: [
      {
        kind: "raw",
        payloadType: "raw",
        codec: "webp",
        mimeType: "image/webp",
        supported: true,
        containerOnly: true,
        isDecoded: false,
        rgbaDecodeSupported: false
      }
    ]
  });

  assert.equal(probe.canUse("raw"), true);
  assert.equal(probe.variants[0].payloadType, "raw");
  assert.equal(probe.variants[0].mimeType, "image/webp");
  assert.equal(probe.variants[0].containerOnly, true);
  assert.equal(probe.variants[0].isDecoded, false);
  assert.equal(probe.variants[0].rgbaDecodeSupported, false);
});

test("CjsVideoDTO carries sparse video facts for texture resources", () => {
  const video = new CjsVideoDTO({
    sourceFormat: "webm",
    sourceKind: "bytes",
    sourceUri: "res:/video/intro.webm",
    durationSeconds: 2,
    frameRate: 30,
    seekable: true,
    codec: "vp9",
    width: 1920,
    height: 1080,
    duration: 123000000n,
    hasAlpha: true,
    looped: true,
    state: "playing"
  });
  const texture = new TriTextureRes().Initialize("dynamic:/video/hangar");

  texture.SetDTO(video);

  assert.equal(CjsVideoDTO.payload, "video");
  assert.equal(video.width, 1920);
  assert.equal(video.hasAlpha, true);
  assert.equal(video.sourceKind, "bytes");
  assert.equal(video.durationSeconds, 2);
  assert.equal(video.seekable, true);
  assert.equal(texture.HasDTO(), true);
  assert.equal(texture.GetDTO(), video);
  assert.equal(texture.GetDTO().sourceFormat, "webm");
});

test("CjsAudioDTO and CjsShaderDTO accept typed payloads", () => {
  const audio = new CjsAudioDTO({
    sampleRate: 48000,
    channels: 2,
    duration: 1.25,
    audioFormat: "wav"
  });
  const shader = new CjsShaderDTO({
    techniques: [ "base" ],
    passes: [ "forward" ],
    permutations: [ "quality=high" ],
    signature: { inputs: 3 }
  });

  assert.equal(audio.sampleRate, 48000);
  assert.equal(shader.passes.length, 1);
  assert.equal(audio.duration > 1, true);
});

test("CjsImageDTO hydrates image metadata through SetValues", () => {
  const image = new CjsImageDTO({ width: 1, height: 1 });
  image.SetValues({
    width: 4,
    height: 2,
    channels: 3,
    pixelFormat: "RGB8",
    colorSpace: "sRGB",
    strideInfo: { row: 12 }
  });

  assert.equal(image.width, 4);
  assert.equal(image.colorSpace, "sRGB");
});

test("TriTextureRes and TriGeometryRes are resource DTOs", () => {
  const texture = new TriTextureRes().Initialize("res:/texture/ship.dds");
  const textureDTO = new CjsTextureDTO({
    sourceFormat: "dds",
    width: 128,
    height: 64,
    pixelFormat: "BC7",
    mipCount: 4,
    variants: [ { kind: "compressed", codec: "bc7", supported: true } ],
    isCompressed: true,
    hasMipMaps: true
  });
  texture.SetDTO(textureDTO);

  const geometry = new TriGeometryRes().Initialize("res:/geometry/ship.cmf");
  const geometryDTO = new CjsGeometryDTO({
    sourceFormat: "cmf",
    meshes: [ { name: "body", areas: [ { name: "hull" } ] } ],
    skeletons: [ { name: "skeleton" } ]
  });
  geometry.SetDTO(geometryDTO);

  assert.equal(texture.GetPath(), "res:/texture/ship.dds");
  assert.equal(texture.width, 128);
  assert.equal(texture.GetMipCount(), 4);
  assert.equal(texture.HasDTO(), true);
  assert.equal(texture.GetDTO().sourceFormat, "dds");
  assert.equal(TriTextureRes.payload, "texture");
  assert.equal(CjsSchema.GetConstructor("TriTextureRes"), TriTextureRes);
  assert.equal(CjsSchema.getField(TriTextureRes, "variants"), null);
  assert.equal(CjsSchema.getMethod(TriTextureRes, "PrepareResources").carbon.method, true);
  assert.equal(CjsSchema.getMethod(TriTextureRes, "Save").impl.status, "notImplemented");
  assert.equal(CjsSchema.getMethod(TriTextureRes, "CreateEmptyTexture").impl.status, "notSupported");
  assert.equal(CjsSchema.getMethod(TriTextureRes, "SetDTO"), null);

  assert.equal(geometry.GetMeshCount(), 1);
  assert.equal(geometry.GetAnimationCount(), 0);
  assert.equal(geometry.GetMeshAreaCount(0), 1);
  assert.equal(geometry.GetMeshAreaName(0, 0), "hull");
  assert.equal(geometry.HasDTO(), true);
  assert.equal(TriGeometryRes.payload, "geometry");
  assert.equal(CjsSchema.getField(TriGeometryRes, "meshes"), null);
  assert.equal(CjsSchema.getMethod(TriGeometryRes, "GetMeshCount").impl.status, "adapted");
});

test("CjsResource can hold opaque engine-owned subobjects", () => {
  const resource = new TriTextureRes().Initialize("res:/texture/ship.dds");
  const gpuTexture = {
    destroyed: false,
    destroy() {
      this.destroyed = true;
    }
  };

  resource.SetAdapterResource("webgpu", gpuTexture);

  assert.equal(resource.HasAdapterResource("webgpu"), true);
  assert.equal(resource.GetAdapterResource("webgpu"), gpuTexture);

  resource.DestroyAdapterResource("webgpu");

  assert.equal(gpuTexture.destroyed, true);
  assert.equal(resource.HasAdapterResource("webgpu"), false);
});

test("Tr2EffectRes and Tr2ImageRes are semantic resources", () => {
  const effect = new Tr2EffectRes().Initialize("res:/shader/ship.sm_hi");
  const shaderDTO = new CjsShaderDTO({
    sourceFormat: "cewgpu",
    techniques: [ "Main" ],
    passes: [ "Forward" ],
    permutations: [ { name: "QUALITY", value: "HIGH" } ]
  });
  effect.SetDTO(shaderDTO);

  const image = new Tr2ImageRes().Initialize("res:/image/icon.png");
  const imageDTO = new CjsImageDTO({
    sourceFormat: "png",
    width: 2,
    height: 1,
    channels: 4,
    pixelFormat: "RGBA8",
    pixels: [ [ [ 255, 255, 255, 255 ], [ 0, 0, 0, 0 ] ] ]
  });
  image.SetDTO(imageDTO);

  assert.equal(effect.HasDTO(), true);
  assert.deepEqual(effect.GetPermutationDescription(), [ { name: "QUALITY", value: "HIGH" } ]);
  assert.equal(Tr2EffectRes.payload, "shader");
  assert.equal(CjsSchema.GetConstructor("Tr2EffectRes"), Tr2EffectRes);
  assert.equal(CjsSchema.getField(Tr2EffectRes, "permutations"), null);

  assert.equal(image.HasDTO(), true);
  assert.equal(image.width, 2);
  assert.equal(image.GetWidth(), 2);
  assert.equal(image.GetHeight(), 1);
  assert.deepEqual(image.GetPixelColor(0, 0), [ 255, 255, 255, 255 ]);
  assert.equal(image.IsPixelOpaque(1, 0), false);
  assert.equal(Tr2ImageRes.payload, "image");
  assert.equal(CjsSchema.getField(Tr2ImageRes, "pixels"), null);
});

test("CjsResMan.LoadObject reads source, dispatches loaders, and marks resource loaded", async () => {
  const source = new CjsMemoryResourceSource({
    "res:/data/example.json": "{\"name\":\"example\"}"
  });
  const resMan = new CjsResMan({ source });

  resMan.RegisterObjectLoader("json", value => JSON.parse(value));

  const object = await resMan.LoadObject("RES:/data/example.JSON");
  const resource = resMan.Lookup("res:/data/example.json");

  assert.deepEqual(object, { name: "example" });
  assert.equal(resource.state, CjsResource.State.LOADED);
  assert.equal(resource.HasLoaded(), true);
  assert.equal(resource.IsPrepared(), false);
  assert.equal(resource.object, object);
});

test("registered formats and resource readiness share one object operation", async () =>
{
  const bytes = new Uint8Array([ 1, 2, 3, 4 ]);
  let sourceReads = 0;
  let formatReads = 0;
  let formatInput = null;
  const source = {
    async Read()
    {
      sourceReads += 1;
      return bytes;
    }
  };

  class CjsTestFormat
  {
    static inputTypes = [ "one", "two" ];
    static outputTypes = [ "raw" ];
    static debugOutputTypes = [ "json" ];
    static mediaTypes = [ "data" ];

    static read(input)
    {
      formatReads += 1;
      formatInput = input;
      return input;
    }
  }

  const resMan = new CjsResMan({ source }).RegisterFormat(CjsTestFormat);
  const resource = resMan.GetResource("res:/data/shared.one", { emit: "raw" });
  const first = resMan.GetObject("res:/data/shared.one", { emit: "raw" });
  const second = resource.GetObject({ emit: "raw" });
  const third = resource.Ready({ emit: "raw" });

  assert.equal(resMan.ResolveFormat("two", { emit: "raw" }), CjsTestFormat);
  assert.deepEqual(resMan.GetFormats("one"), [ CjsTestFormat ]);
  assert.equal(first, second);
  assert.equal(first, third);
  assert.equal(await first, bytes);
  assert.equal(formatInput, bytes);
  assert.equal(sourceReads, 1);
  assert.equal(formatReads, 1);
  assert.equal(resource.object, bytes);
});

test("semantic resource readiness resolves the resource without separately pinning its DTO", async () =>
{
  const bytes = new Uint8Array([ 4, 3, 2, 1 ]);
  class CjsTestFormat
  {
    static inputTypes = [ "semantic" ];
    static outputTypes = [ "semantic" ];
    static read(input) { return input; }
  }
  class CjsTestResource extends CjsResource
  {
    static payload = "semantic";
  }

  const options = { requirement: "semantic", emit: "semantic" };
  const resMan = new CjsResMan().Register({
    source: { Read() { return bytes; } },
    formats: [ CjsTestFormat ],
    resourceTypes: [ CjsTestResource ]
  });
  const resource = resMan.GetResource("res:/data/value.semantic", options);
  const first = resMan.GetObject("res:/data/value.semantic", options);
  const second = resource.Ready();

  assert.equal(first, second);
  assert.equal(resource.GetRequirement(), "semantic");
  assert.equal(await first, resource);
  assert.equal(resource.object, resource);
  assert.equal(resource.GetDTO(), bytes);
  assert.equal(resource.ReleaseDTO(), resource);
  assert.equal(resource.HasDTO(), false);
});

test("different outcomes use distinct resources while sharing source bytes", async () =>
{
  let sourceReads = 0;
  let formatReads = 0;
  class CjsTestFormat
  {
    static inputTypes = [ "test" ];
    static outputTypes = [ "raw" ];
    static debugOutputTypes = [ "json" ];
    static mediaTypes = [ "data" ];

    static read(input, options)
    {
      formatReads += 1;
      return { emit: options.emit, input };
    }
  }

  const resMan = new CjsResMan({
    source: {
      Read()
      {
        sourceReads += 1;
        return new Uint8Array([ 7 ]);
      }
    }
  }).RegisterFormat(CjsTestFormat);

  const raw = resMan.GetObject("res:/data/value.test", { emit: "raw" });
  const json = resMan.GetObject("res:/data/value.test", { emit: "json" });
  const rawResource = resMan.Lookup("res:/data/value.test", { emit: "raw" });
  const jsonResource = resMan.Lookup("res:/data/value.test", { emit: "json" });

  assert.notEqual(rawResource, jsonResource);
  assert.deepEqual(resMan.motherLode.GetStats().paths, [ "res:/data/value.test" ]);
  assert.deepEqual((await raw).input, new Uint8Array([ 7 ]));
  assert.equal((await json).emit, "json");
  assert.equal(sourceReads, 1);
  assert.equal(formatReads, 2);
  assert.equal(resMan.Delete("res:/data/value.test"), true);
  assert.equal(resMan.motherLode.GetCount(), 0);
});
