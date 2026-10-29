import { HostBitmap } from "../../../npm/dist/global/imageio/index.js";
import { PixelFormat } from "../../../npm/dist/global/consts/renderContext/index.js";
import assert from "node:assert/strict";
import { test, beforeEach, afterEach } from "node:test";
import {
  getResourceExtension,
  normalizeResourcePath
} from "#utils/path";
import { CjsSchema } from "../../../npm/dist/global/schema/index.js";
import { ICacheable } from "../../../npm/dist/global/blue/index.js";
import * as runtimeResource from "../../../npm/dist/resource/index.js";
import { CjsBlackFormat } from "../../../npm/dist/global/blue/formats/black/index.js";
import { CjsRedFormat } from "../../../npm/dist/global/blue/formats/red/index.js";
import { CjsEventEmitter, Tr2ImageRes, TriGeometryRes, TriTextureRes, CjsMotherLode, CjsLoadingObject, CjsBlueResMan, BlueAsyncRes, CjsResourceProbe, ResourceHandlerMode, Tr2GrannyStateRes, Tr2LightProfileRes, TriGrannyRes, getMotherLodeKey } from "../../../npm/dist/resource/index.js";
import { Tr2EffectRes, Tr2MaterialRes } from "../../../npm/dist/trinity/shader/index.js";
import { LoadData } from "../../support/loadData.js";
import {blue} from "../../../npm/dist/global/blue/index.js";

/** A concrete family test double that owns its reader result. */
class TestValueResource extends BlueAsyncRes
{
  value = null;
  async _DoLoad() { this.value = await blue.resMan.ReadResourceObjectPayload(this, this._dataStream.data); return BlueAsyncRes.LoadingResult.LR_SUCCESS; }
  _DoPrepare() { return this.value !== null; }
  _OnShutdown() { this.value = null; }
}

/** Exercise read caches directly: output choices do not create resource identities. */
async function readDecodedData(manager, path, options)
{
  const bytes = await manager.ReadResource(path, options);
  const resource = new BlueAsyncRes();
  resource._path = normalizeResourcePath(path);
  const descriptor = manager.ResolveFormatDescriptor(getResourceExtension(path), {...options, bytes});
  return manager.ReadFormatOnce(resource, descriptor, bytes, options);
}

test("runtime-resource does not export an event scope layer", () => {
  assert.equal(runtimeResource.CjsEventEmitter, CjsEventEmitter);
  assert.equal("CjsEventEmitterScope" in runtimeResource, false);
  assert.equal("CjsResourceState" in runtimeResource, false);
  assert.equal("isTerminalResourceState" in runtimeResource, false);
  for (const name of [
    "CjsObjectDTO",
    "CjsGeometryDTO",
    "CjsImageDTO",
    "CjsTextureDTO",
    "CjsVideoDTO",
    "CjsShaderDTO",
    "CjsAudioDTO"
  ]) {
    assert.equal(name in runtimeResource, false);
  }
});

test("CjsEventEmitter supports direct source subscriptions", () => {
  const emitter = new CjsEventEmitter();
  const source = { count: 0 };
  const seen = [];

  function listener(name, value) {
    this.count += value;
    seen.push([ name, value ]);
  }

  assert.equal(Object.prototype.hasOwnProperty.call(emitter, "__state"), false);
  assert.equal(emitter.OnEvent("Loaded", listener, source), emitter);

  assert.equal(emitter.__state.events instanceof Map, true);
  assert.equal(emitter.HasListener("loaded", listener, source), true);
  assert.deepEqual(emitter.GetEventNames(), ["loaded"]);

  emitter.EmitEvent("LOADED", 2);

  assert.deepEqual(seen, [ [ "loaded", 2 ] ]);
  assert.equal(source.count, 2);

  emitter.OffEvent("LoAdEd", listener, source);
  assert.equal(Object.prototype.hasOwnProperty.call(emitter.__state, "events"), false);
  emitter.EmitEvent("loaded", 2);

  assert.deepEqual(seen, [ [ "loaded", 2 ] ]);
  assert.equal(emitter.HasListener("loaded"), false);
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
  assert.equal(emitter.HasListener("fail"), false);

  emitter.EmitEvent("fail");

  assert.equal(count, 1);
});

test("CjsEventEmitter clears event groups and supports AddEvents once suffix", () => {
  const emitter = new CjsEventEmitter();
  const values = [];
  const source = { value: 3 };

  assert.equal(emitter.AddEvents({
    changed(name, value) {
      values.push(value);
    },
    "changed.once": [function(name, value) {
      values.push(value + this.value);
    }, source]
  }), emitter);

  emitter.EmitEvent("changed", 4);
  emitter.EmitEvent("changed", 5);

  assert.deepEqual(values, [4, 7, 5]);
  assert.equal(emitter.HasListener("changed"), true);

  emitter.ClearEvent("*");

  assert.equal(emitter.HasListener("*"), false);
});

test("CjsEventEmitter independently removes external listener sources", () => {
  const ship = {};
  const scene = {};
  const resource = new CjsEventEmitter();
  const shipValues = [];
  const sceneValues = [];

  function onShipLoaded(name, value) {
    shipValues.push(value);
  }

  function onSceneLoaded(name, value) {
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
  assert.equal(resource.HasListener("loaded"), false);
});

test("resource path helpers normalize Carbon-style paths", () => {
  assert.equal(normalizeResourcePath(" RES:\\Texture\\Ship.DDS "), "res:/texture/ship.dds");
  assert.equal(getResourceExtension("res:/texture/ship.dds?variant=1"), "dds");
});

test("CjsBlueResMan registers immutable extension handlers through every short form", async () =>
{
  class TestRouteResource extends TestValueResource {}
  class TestRouteFormat
  {
    static outputs = Object.freeze({ "payload": Object.freeze({ output: "payload" }) })
    static read(bytes) { return { byte: bytes[0] }; }
  }

  const source = { Read() { return new Uint8Array([ 7 ]); } };
  const resMan = new CjsBlueResMan({ source });
  blue.resMan = resMan;

  assert.equal(BlueAsyncRes.isResource, true);
  assert.equal(CjsLoadingObject.handlerMode, ResourceHandlerMode.OBJECT);
  assert.equal(new CjsLoadingObject().isResource, false);
  assert.equal(resMan.RegisterExtension(".RoUtE", TestRouteResource, TestRouteFormat), resMan);
  const shortRoute = resMan.GetExtensionRoute("route");
  assert.equal(shortRoute.Handler, TestRouteResource);
  assert.equal(shortRoute.formats[0].Format, TestRouteFormat);

  resMan.RegisterExtension("route", TestRouteResource, { Format: TestRouteFormat });
  const longRoute = resMan.GetExtensionRoute(".ROUTE");
  assert.notEqual(longRoute, shortRoute);
  assert.equal(longRoute.formats[0].Format, TestRouteFormat);

  const resource = await resMan.Fetch("res:/data/one.route");
  assert.equal(resource instanceof TestRouteResource, true);
  assert.deepEqual(resource.value, { byte: 7 });
  assert.equal(await resMan.LoadObject("res:/data/one.route"), resource);

  class MissingMode extends TestValueResource {}
  MissingMode.handlerMode = "other";
  assert.throws(
    () => resMan.RegisterExtension("bad", MissingMode, TestRouteFormat),
    /Handler\.handlerMode/u
  );
});

test("CjsBlueResMan ordered extension formats probe once and use only a final fallback", async () =>
{
  const calls = [];
  class TestRejectingFormat
  {
    static extensions = Object.freeze([ ".legacyprobe" ]);
    static is() { calls.push("probe:reject"); return { supported: "none" }; }
    static read() { calls.push("read:reject"); throw new Error("must not read"); }
  }
  class TestAcceptedFormat
  {
    static extensions = Object.freeze([ ".legacyprobe" ]);
    static is() { calls.push("probe:accept"); return true; }
    static read() { calls.push("read:accept"); return { accepted: true }; }
  }
  class TestFallbackFormat
  {
    static read() { calls.push("read:fallback"); return { fallback: true }; }
  }

  const source = { Read() { return new Uint8Array([ 1 ]); } };
  const resMan = new CjsBlueResMan({ source });
  blue.resMan = resMan;
  resMan.RegisterExtension("ordered", CjsLoadingObject, [
    TestRejectingFormat,
    TestAcceptedFormat,
    TestFallbackFormat
  ]);
  assert.deepEqual(await LoadData(resMan, "res:/data/value.ordered"), { accepted: true });
  assert.deepEqual(calls, [ "probe:reject", "probe:accept", "read:accept" ]);

  calls.length = 0;
  const legacy = new CjsBlueResMan()
    .RegisterFormat(TestRejectingFormat)
    .RegisterFormat(TestAcceptedFormat);
  blue.resMan = legacy;
  assert.equal(
    legacy.ResolveFormat("legacyprobe", { bytes: new Uint8Array([ 1 ]) }),
    TestAcceptedFormat
  );
  assert.deepEqual(calls, [ "probe:reject", "probe:accept" ]);

  assert.throws(
    () => resMan.RegisterExtension("invalid", CjsLoadingObject, [
      TestFallbackFormat,
      TestAcceptedFormat
    ]),
    /has no support probe and must be last/u
  );
});

test("CjsBlueResMan uses Black-first content routing for both red and black suffixes", async () =>
{
  class RedRouteRoot { name = ""; }
  CjsSchema.define(RedRouteRoot, { className: "RedRouteRoot", fields: {
    name: { type: { kind: "string" }, edit: { persist: true } }
  } });
  const encoded = new TextEncoder().encode("type: RedRouteRoot\nname: yaml-content\n");
  const source = { Read() { return encoded; } };
  const resMan = new CjsBlueResMan({ source });
  blue.resMan = resMan;
  resMan.RegisterExtension("red", CjsLoadingObject, [ CjsBlackFormat, CjsRedFormat ]);
  resMan.RegisterExtension("black", CjsLoadingObject, [ CjsBlackFormat, CjsRedFormat ]);

  const fromRed = await LoadData(resMan, "res:/data/value.red");
  const fromBlack = await LoadData(resMan, "res:/data/value.black");
  assert.equal(fromRed.constructor, RedRouteRoot);
  assert.equal(fromRed.name, "yaml-content");
  assert.deepEqual(fromBlack, fromRed);
});

test("CjsBlueResMan never falls through after an ordered format is selected", async () =>
{
  let fallbackReads = 0;
  class TestSelectedFormat
  {
    static is() { return true; }
    static read() { throw new Error("selected reader failure"); }
  }
  class TestUnselectedFallback
  {
    static read()
    {
      fallbackReads += 1;
      return {};
    }
  }

  const resMan = new CjsBlueResMan({
    source: { Read() { return new Uint8Array([ 1 ]); } }
  });
  blue.resMan = resMan;
  resMan.RegisterExtension("once", CjsLoadingObject, [
    TestSelectedFormat,
    TestUnselectedFallback
  ]);

  await assert.rejects(
    resMan.Fetch("res:/data/value.once"),
    /selected reader failure/u
  );
  assert.equal(fallbackReads, 0);
});

test("CjsBlueResMan Register accepts composed extension route objects", async () =>
{
  class TestValueFormat
  {
    static id = "TestValueFormat";
    static read() { return { type: "known", value: 4 }; }
  }
  class TestKnownTarget
  {
    constructor(values) { Object.assign(this, values); }
    static from(values) { return new TestKnownTarget(values); }
  }
  class TestYamlTarget
  {
    static from() { throw new Error("fromYAML must win"); }
    static fromYAML(values, context)
    {
      return { ...values, hydratedBy: context.format };
    }
  }

  const resMan = new CjsBlueResMan({
    source: { Read() { return new Uint8Array([ 4 ]); } },
    extensions: {
      shape: {
        Handler: CjsLoadingObject,
        Format: TestValueFormat,
        Identify(values)
        {
          return values.type === "known" ? TestKnownTarget : false;
        }
      }
    }
  });
  blue.resMan = resMan;

  const known = await resMan.Fetch("res:/data/value.shape");
  assert.equal(known instanceof TestKnownTarget, true);
  assert.equal(known.value, 4);

  resMan.RegisterExtension("yamlshape", CjsLoadingObject, {
    Format: TestValueFormat,
    Target: TestYamlTarget
  });
  assert.deepEqual(
    await resMan.Fetch("res:/data/value.yamlshape"),
    { type: "known", value: 4, hydratedBy: "TestValueFormat" }
  );

  resMan.RegisterExtension("rawshape", CjsLoadingObject, {
    Format: TestValueFormat,
    Identify() { return true; }
  });
  assert.deepEqual(
    await LoadData(resMan, "res:/data/value.rawshape"),
    { type: "known", value: 4 }
  );

  resMan.RegisterExtension("unknownshape", CjsLoadingObject, {
    Format: TestValueFormat,
    Identify() { return false; }
  });
  await assert.rejects(
    resMan.Fetch("res:/data/value.unknownshape"),
    error => error.code === "CJS_RESOURCE_EXTENSION_TARGET_FAILED"
      && error.path === "res:/data/value.unknownshape"
  );
});

test("CjsBlueResMan exposes normalized resource paths to sources, formats and targets", async () =>
{
  let formatContext = null;
  let identifyContext = null;
  let sourceUrl = null;

  class TestContextFormat
  {
    static read(_bytes, _options, context)
    {
      formatContext = context;
      return { type: "context" };
    }
  }

  const source = {
    Read(url)
    {
      sourceUrl = url;
      return new Uint8Array([ 1 ]);
    }
  };
  const resMan = new CjsBlueResMan({
    source,
    extensions: {
      yaml: {
        Handler: CjsLoadingObject,
        Format: TestContextFormat,
        Identify(values, context)
        {
          assert.deepEqual(values, { type: "context" });
          identifyContext = context;
          return true;
        }
      }
    }
  });
  blue.resMan = resMan;

  assert.deepEqual(
    await LoadData(resMan, " RES:\\Character\\Folder\\Metadata.YAML "),
    { type: "context" }
  );

  const expected = {
    path: "res:/character/folder/metadata.yaml",
    resFilePath: "res:/character/folder/metadata.yaml",
    ext: "yaml",
    fileName: "metadata.yaml",
    url: null
  };

  assert.equal(sourceUrl, expected.path);
  assert.deepEqual(formatContext, expected);
  assert.equal(identifyContext.path, expected.path);
  assert.equal(identifyContext.resFilePath, expected.resFilePath);
  assert.equal(identifyContext.ext, expected.ext);
  assert.equal(identifyContext.fileName, expected.fileName);
  assert.equal(identifyContext.url, expected.url);

  await LoadData(resMan, "res:/character/folder/metadata", { ext: ".YAML" });
  assert.equal(formatContext.resFilePath, "res:/character/folder/metadata");
  assert.equal(formatContext.fileName, "metadata");
  assert.equal(formatContext.ext, "yaml");
  assert.equal(identifyContext.ext, "yaml");
});

test("resource exports no obsolete payload vocabulary or validators", () => {
  for (const name of ["ResourcePayloadType", "ResourcePayloadValues", "validateRgbaPayload",
    "validateTexturePayload", "validateAudioPayload", "validateVideoPayload"])
  {
    assert.equal(name in runtimeResource, false);
  }
});

test("the native base declines load and prepare by default", () =>
{
  const resource = new BlueAsyncRes();
  assert.equal(resource._DoLoad(), BlueAsyncRes.LoadingResult.LR_FAILED);
  assert.equal(resource._DoPrepare(), false);
});

test("Tr2EffectRes overrides the native load hook", () =>
{
  assert.equal(typeof Tr2EffectRes.prototype._DoLoad, "function");
  assert.notEqual(Tr2EffectRes.prototype._DoLoad, BlueAsyncRes.prototype._DoLoad);
});

test("CjsResourceProbe preserves generalized output capabilities", () => {
  const probe = CjsResourceProbe.from({
    format: "dds",
    source: "buffer",
    recognized: true,
    output: "texture",
    supported: true,
    verified: false,
    preferredOutput: "texture",
    outputs: [
      {
        output: "rgba",
        payloadType: "rgba",
        codec: "rgba8unorm",
        decoded: true,
        supported: true,
        verified: false
      },
      {
        output: "texture",
        payloadType: "texture",
        codec: "bc7-rgba-unorm",
        passthrough: false,
        supported: true,
        verified: false
      }
    ]
  });

  assert.equal(probe.preferredOutput, "texture");
  assert.equal(probe.canUseSelected(), true);
  assert.equal(probe.canUseSelected({ verified: true }), false);
  assert.equal(probe.canUse("rgba"), true);
  assert.equal(probe.canUse("texture"), true);
  assert.equal(probe.outputs[0].payloadType, "rgba");
  assert.equal(probe.outputs[0].decoded, true);
  assert.equal(probe.outputs[1].passthrough, false);
});

test("CjsResourceProbe.from normalizes plain reports without dropping handoff metadata", () => {
  const probe = CjsResourceProbe.from({
    format: "webp",
    source: "buffer",
    recognized: true,
    output: "raw",
    supported: true,
    preferredOutput: "raw",
    outputs: [
      {
        output: "raw",
        payloadType: "raw",
        codec: "webp",
        supported: true,
        verified: false,
        passthrough: true,
        decoded: false
      }
    ]
  });

  assert.equal(probe.canUse("raw"), true);
  assert.equal(probe.outputs[0].payloadType, "raw");
  assert.equal(probe.outputs[0].passthrough, true);
  assert.equal(probe.outputs[0].decoded, false);
});

test("TriTextureRes holds a HostBitmap, and TriGeometryRes a validated payload", () => {
  const texture = new TriTextureRes();
  // The image is a bitmap; the rest are values the loader knows and the
  // bitmap does not - MSAA, LOD history, the original memory use.
  const bitmap = new HostBitmap();
  bitmap.Create(4, 4, 1, PixelFormat.PIXEL_FORMAT_BC1_UNORM);
  texture.CreateFromHostBitmap(bitmap);
  texture._path = "res:/texture/ship.dds";
  texture.hadLodRequests = true;
  texture.originalMemoryUsage = 64;

  const geometry = new TriGeometryRes();
  const geometryPayload = {
    version: 1,
    sourceFormat: "cmf",
    meshes: [ {
      name: "body",
      bounds: { min: [ 0, 0, 0 ], max: [ 1, 1, 0 ] },
      areas: [ {
        name: "hull",
        bounds: { min: [ 0, 0, 0 ], max: [ 1, 1, 0 ] }
      } ],
      vertex: {
        position: [ 0, 0, 0, 1, 0, 0, 0, 1, 0 ],
        blendIndices: [ 7, 0, 0, 0, 8, 0, 0, 0, 9, 0, 0, 0 ]
      },
      indices: [ { name: "hull", faces: [ 0, 1, 2 ] } ]
    } ],
    skeletons: [ { name: "skeleton" } ],
    animations: []
  };
  geometry.ReadCMFFile(geometryPayload);

  assert.equal(texture.GetPath(), "res:/texture/ship.dds");
  assert.equal(texture.width, 4);
  assert.equal(texture.GetMipCount(), 1);
  // Carbon reads MSAA from the texture, and there is none until it is made.
  assert.equal(texture.GetMsaaType(), 1);
  assert.equal(texture.GetMsaaQuality(), 0);
  assert.equal(texture.HadLodRequests(), true);
  assert.equal(texture.GetOriginalMemoryUsage(), 64);
  assert.equal(texture.GetBitmap() !== null, true);
  assert.equal(texture.GetBitmap(), bitmap, "the bitmap IS what the resource holds");
  assert.equal("payload" in TriTextureRes, false);
  assert.equal(CjsSchema.getConstructor("TriTextureRes"), TriTextureRes);
  assert.equal(CjsSchema.getField(TriTextureRes, "variants"), null);
  assert.equal(CjsSchema.getMethod(TriTextureRes, "PrepareResources").carbon.method, true);
  assert.equal(CjsSchema.getMethod(TriTextureRes, "Save").impl.status, "notSupported");
  assert.equal(CjsSchema.getMethod(TriTextureRes, "CreateEmptyTexture").impl.status, "notSupported");
  assert.equal(CjsSchema.getMethod(TriTextureRes, "_DoLoad").impl.status, "adapted");

  assert.equal(geometry.GetMeshCount(), 1);
  assert.equal(geometry.GetAnimationCount(), 0);
  assert.equal(geometry.GetSkeletonCount(), 1);
  assert.equal(geometry.GetSkeletonData(0), geometryPayload.skeletons[0]);
  assert.equal(geometry.GetSkeletonData(1), null);
  assert.equal(geometry.GetSkeletonData(-1), null);
  assert.equal(geometry.GetMeshAreaCount(0), 1);
  assert.equal(geometry.GetMeshAreaName(0, 0), "hull");
  const boundsMin = new Float32Array(3);
  const boundsMax = new Float32Array(3);
  assert.equal(geometry.GetBoundingBox(0, boundsMin, boundsMax), true);
  assert.deepEqual(Array.from(boundsMin), [ 0, 0, 0 ]);
  assert.deepEqual(Array.from(boundsMax), [ 1, 1, 0 ]);
  assert.deepEqual(
    geometry.CalculateBoundingBoxFromTransform(0, [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      3, 4, 5, 1
    ]),
    { min: [ 3, 4, 5 ], max: [ 4, 5, 5 ] }
  );
  assert.equal(geometry.RecalculateBoundingSphere(), true);
  const sphere = new Float32Array(4);
  assert.equal(geometry.GetBoundingSphere(0, sphere), true);
  assert.deepEqual(Array.from(sphere.subarray(0, 3)), [ 0.5, 0.5, 0 ]);
  assert.ok(Math.abs(sphere[3] - Math.SQRT1_2) < 1e-6);

  // The FromScript members (TriGeometryRes.cpp:416-431, 2875-2910) answer Carbon's pairs and throw its Be::Result messages.
  assert.deepEqual(geometry.GetBoundingBoxFromScript(0), [ [ 0, 0, 0 ], [ 1, 1, 0 ] ]);
  assert.deepEqual(geometry.GetAreaBoundingBoxFromScript(0, 0), [ [ 0, 0, 0 ], [ 1, 1, 0 ] ]);
  const [ center, radius ] = geometry.GetBoundingSphereFromScript(0);
  assert.deepEqual(center, [ 0.5, 0.5, 0 ]);
  assert.ok(Math.abs(radius - Math.SQRT1_2) < 1e-6);
  assert.throws(() => geometry.GetBoundingBoxFromScript(1), /^Error: Mesh index out of bounds$/u);
  assert.throws(() => geometry.GetBoundingSphereFromScript(1), /^Error: Mesh index out of range$/u);
  assert.throws(() => geometry.GetAreaBoundingBoxFromScript(1, 0), /^Error: Mesh index out of range, or invalid mesh$/u);
  assert.throws(() => geometry.GetAreaBoundingBoxFromScript(0, 1), /^Error: Area index out of range$/u);
  assert.throws(() => geometry.GetAreaBoundingBoxFromScript(0, -1), /^Error: Area index out of range$/u);
  assert.throws(() => geometry.GetAreaIntersectionPointNormalBoneFromScript([ 0, 0, 1 ], [ 0, 0, -1 ], -2), /^RangeError: Invalid area index$/u);
  assert.equal(geometry.GetAreaIntersectionPointNormalBoneFromScript([ 0.25, 0.25, 1 ], [ 0, 0, -1 ], 0).hit, true);
  assert.equal(geometry.GetAreaIntersectionPointNormalBoneFromScript([ 0.25, 0.25, 1 ], [ 0, 0, -1 ], 1).hit, false, "no area 1");
  for (const [ member, exposed ] of [
    [ "GetAreaBoundingBoxFromScript", "GetAreaBoundingBox" ],
    [ "GetBoundingBoxFromScript", "GetBoundingBox" ],
    [ "GetBoundingSphereFromScript", "GetBoundingSphere" ],
    [ "GetIntersectionPointNormalBoneFromScript", "GetIntersectionPointNormalBone" ],
    [ "GetAreaIntersectionPointNormalBoneFromScript", "GetAreaIntersectionPointNormalBone" ] ])
  {
    const row = CjsSchema.getMethod(TriGeometryRes, member);
    assert.equal(row.exposure.macro, "MAP_METHOD_AND_WRAP", member);
    assert.equal(row.exposure.name, exposed, member);
    assert.equal(row.impl.status, "adapted", member);
  }
  assert.deepEqual(
    geometry.GetIntersectionPointNormalBoneFromScript([ 0.25, 0.25, 1 ], [ 0, 0, -1 ]),
    {
      hit: true,
      boneIndex: 7,
      position: [ 0.25, 0.25, 0 ],
      point: [ 0.25, 0.25, 0 ],
      normal: [ 0, 0, 1 ],
      unnormalizedNormal: [ 0, 0, 1 ],
      distance: 1,
      meshIndex: 0,
      areaIndex: 0
    }
  );
  assert.equal(geometry.GetCMFData() !== null, true);
  assert.equal("payload" in TriGeometryRes, false);
  assert.equal(CjsSchema.getField(TriGeometryRes, "meshes"), null);
  assert.equal(CjsSchema.getMethod(TriGeometryRes, "GetMeshCount").impl.status, "adapted");
  assert.equal(CjsSchema.getMethod(TriGeometryRes, "GetSkeletonCount").impl.status, "adapted");
  assert.equal(CjsSchema.getMethod(TriGeometryRes, "GetSkeletonData").impl.status, "adapted");
  assert.throws(
    () => geometry.SetupMeshes({ animations: [] }),
    error => error.code === "CJS_RESOURCE_PAYLOAD_INVALID" && error.field === "meshes"
  );
  assert.equal(geometry.GetCMFData(), geometryPayload);
});

test("a geometry intersection query reports unavailable CPU data instead of a miss", () =>
{
  // The regression this guards is silent: reading `GetPayload()?.meshes` on a
  // released payload returned `hit: false`, which no caller can distinguish
  // from the ray genuinely missing. Picking degrades to "nothing is ever
  // clickable" with no error anywhere.
  const geometry = new TriGeometryRes();

  assert.equal(geometry.GetCMFData() !== null, false);
  assert.throws(
    () => geometry.GetIntersectionPointNormalBoneFromScript([ 0, 0, 1 ], [ 0, 0, -1 ]),
    /CPU geometry is not resident/u,
    "an absent payload must not answer a ray query"
  );
  assert.throws(
    () => geometry.GetAreaIntersectionPointNormalBoneFromScript([ 0, 0, 1 ], [ 0, 0, -1 ], 0),
    /CPU geometry is not resident/u,
    "the area query fails the same way"
  );

  // Negative control: the failure must be about residency, not about the ray.
  // An invalid ray still fails as an invalid ray.
  assert.throws(
    () => geometry.GetAreaIntersectionPointNormalBoneFromScript([ 0, 0, 1 ], [ 0, 0, -1 ], -2),
    RangeError,
    "an invalid area index is still a RangeError"
  );
});

test("device resource families hold and destroy opaque backend adapters", () => {
  const resource = new TriTextureRes();
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

test("CjsBlueResMan reads source through a registered loader and marks the resource prepared", async () => {
  let loaderContext = null;
  const records = new Map([
    [ "res:/data/example.json", "{\"name\":\"example\"}" ]
  ]);
  const source = {
    Read(path)
    {
      return records.get(normalizeResourcePath(path));
    }
  };
  const resMan = new CjsBlueResMan({ source });
  blue.resMan = resMan;

  resMan.RegisterObjectLoader("json", (value, context) => {
    loaderContext = context;
    return JSON.parse(value);
  });

  const object = await LoadData(resMan, "RES:/data/example.JSON");
  const resource = resMan.Lookup("res:/data/example.json");

  assert.deepEqual(object, { name: "example" });
  // Publishing hands over the reader OUTCOME, so the bytes are already what
  // they needed to become - that is preparation, and the resource is good.
  assert.equal(resource.IsPrepared(), true);
  assert.equal(resource.IsPrepared(), true);
  assert.equal(resource.IsPrepared(), true);
  assert.equal(resource.IsGood(), true);
  assert.equal(resMan.GetResourcePayload(resource), object);
  assert.equal(loaderContext.path, "res:/data/example.json");
  assert.equal(loaderContext.resFilePath, "res:/data/example.json");
  assert.equal(loaderContext.ext, "json");
  assert.equal(loaderContext.fileName, "example.json");
  assert.equal(loaderContext.url, null);
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

  class TestFormat
  {
    static extensions = Object.freeze([ ".one", ".two" ]);
    static outputs = Object.freeze({ "raw": Object.freeze({ output: "raw" }), "json": Object.freeze({ output: "json" }) })

    static read(input)
    {
      formatReads += 1;
      formatInput = input;
      return input;
    }
  }

  const resMan = new CjsBlueResMan({ source }).RegisterFormat(TestFormat);
  blue.resMan = resMan;
  const resource = resMan.GetResource("res:/data/shared.one", { emit: "raw" });
  const first = resMan.Ready(resource);
  const second = resMan.Ready(resource);
  const third = resMan.Ready(resource);
  // Plain data is read through its resource (GetObject answers objects only):
  // a manager-level read joins the same operation - one source and one format
  // read below - rather than being the same promise.
  const viaManager = LoadData(resMan, "res:/data/shared.one", { emit: "raw" });

  assert.equal(resMan.ResolveFormat("two", { emit: "raw" }), TestFormat);
  assert.deepEqual(resMan.GetFormats("one"), [ TestFormat ]);
  assert.equal(first, second);
  assert.equal(first, third);
  assert.equal(await first, bytes);
  assert.equal(await viaManager, bytes);
  assert.equal(formatInput, bytes);
  assert.equal(sourceReads, 1);
  assert.equal(formatReads, 1);
  assert.equal(resMan.GetResourcePayload(resource), bytes);
});

test("generic payloads release and reconstruct only on explicit object use", async () =>
{
  let time = 0;
  let sourceReads = 0;
  const motherLode = new CjsMotherLode({ now: () => time });
  const resMan = new CjsBlueResMan({
    motherLode,
    source: {
      Read()
      {
        sourceReads += 1;
        return `{\"revision\":${sourceReads}}`;
      }
    }
  });
  blue.resMan = resMan;
  resMan.RegisterObjectLoader("json", value => JSON.parse(value));

  const path = "res:/data/reconstruct.json";
  const resource = resMan.GetResource(path);
  const first = resMan.Ready(resource);
  const concurrent = resMan.Ready(resource);
  // The manager-level read of plain data goes through the resource and joins
  // this operation: one source read, the same payload.
  const viaManager = LoadData(resMan, path);

  assert.equal(first, concurrent);
  const firstObject = await first;
  assert.equal(await viaManager, firstObject);
  assert.deepEqual(firstObject, { revision: 1 });
  assert.equal(resMan.GetResourcePayload(resource), firstObject);
  assert.equal(resMan.GetResourcePayload(resource), firstObject);
  assert.equal(motherLode.GetStats().payloads, 1);

  const resident = LoadData(resMan, path);
  assert.notEqual(resident, first);
  assert.equal(await resident, firstObject);
  assert.equal(sourceReads, 1);

  time = 10;
  const payloadSweep = resMan.PurgeInactive({
    time,
    maxIdleMilliseconds: 100,
    payloadMaxIdleMilliseconds: 1
  });
  assert.equal(payloadSweep.payloadsReleased, 1);
  assert.equal(resMan.HasResourcePayload(resource), false);
  assert.equal(resMan.GetResourcePayload(resource), null);
  assert.equal(resMan.GetResourcePayload(resource), null);
  assert.equal(sourceReads, 1);

  resource.IsPrepared();
  resMan.GetResourcePayload(resource);
  resource.KeepAlive({ time });
  assert.equal(sourceReads, 1);

  const reconstructed = await resMan.Ready(resource);
  assert.deepEqual(reconstructed, { revision: 2 });
  assert.equal(resMan.Lookup(path), resource);
  assert.equal(resMan.GetResourcePayload(resource), reconstructed);
  assert.equal(resMan.GetResourcePayload(resource), reconstructed);
  assert.equal(sourceReads, 2);

  time = 20;
  const identitySweep = resMan.PurgeInactive({ time, maxIdleMilliseconds: 1 });
  assert.equal(identitySweep.purged, 1);
  assert.equal(resMan.GetResourceStatus(resource).purged, true);
  assert.equal(resMan.GetResourcePayload(resource), null);

  const replacementObject = await resMan.Ready(resource);
  const replacement = resMan.Lookup(path);
  assert.equal(replacement, resource);
  assert.deepEqual(replacementObject, { revision: 3 });
  assert.equal(resMan.GetResourceStatus(resource).purged, false);
  assert.equal(resMan.GetResourcePayload(resource), replacementObject);
  assert.equal(sourceReads, 3);
});

test("source revision scopes shared source and parsed format operations", async () =>
{
  let sourceReads = 0;
  let formatReads = 0;
  const source = {
    Read(path, options)
    {
      sourceReads += 1;
      return new Uint8Array([ options.sourceRevision ]);
    }
  };

  class TestRevisionCacheFormat
  {
    static extensions = Object.freeze([ ".revisioncache" ]);
    static outputs = Object.freeze({ "raw": Object.freeze({ output: "raw" }) })

    static read(bytes)
    {
      formatReads += 1;
      return { revision: bytes[0] };
    }
  }

  const path = "res:/data/value.revisioncache";
  const resMan = new CjsBlueResMan({ source }).RegisterFormat(TestRevisionCacheFormat);
  blue.resMan = resMan;
  const revisionOneA = await readDecodedData(resMan, path, {    emit: "raw",
    sourceRevision: 1,
    cacheSource: true,
    cacheFormat: true
  });
  const revisionOneB = await readDecodedData(resMan, path, {    emit: "raw",
    sourceRevision: 1
  });
  const revisionTwo = await readDecodedData(resMan, path, {    emit: "raw",
    sourceRevision: 2,
    cacheSource: true,
    cacheFormat: true
  });

  assert.equal(revisionOneB, revisionOneA);
  assert.deepEqual(revisionTwo, { revision: 2 });
  assert.equal(sourceReads, 2);
  assert.equal(formatReads, 2);
});

test("format caches isolate source objects and registration descriptors", async () =>
{
  let sourceAReads = 0;
  let sourceBReads = 0;
  let formatReads = 0;
  const sourceA = { Read() { sourceAReads += 1; return new Uint8Array([ 2 ]); } };
  const sourceB = { Read() { sourceBReads += 1; return new Uint8Array([ 7 ]); } };

  class TestDescriptorCacheFormat
  {
    static extensions = Object.freeze([ ".descriptorcache" ]);
    static outputs = Object.freeze({ "raw": Object.freeze({ output: "raw" }) })

    static read(bytes, options)
    {
      formatReads += 1;
      return { value: bytes[0] * options.multiplier, formatRead: formatReads };
    }
  }

  const path = "res:/data/value.descriptorcache";
  const resMan = new CjsBlueResMan({ source: sourceA })
    .RegisterFormat(TestDescriptorCacheFormat, { multiplier: 1 });
  blue.resMan = resMan;
  const fromA = await readDecodedData(resMan, path, {    source: sourceA,    emit: "raw",
    sourceRevision: 1,
    cacheSource: true,
    cacheFormat: true
  });
  const fromB = await readDecodedData(resMan, path, {    source: sourceB,    emit: "raw",
    sourceRevision: 1,
    cacheSource: true,
    cacheFormat: true
  });
  assert.deepEqual(fromA, { value: 2, formatRead: 1 });
  assert.deepEqual(fromB, { value: 7, formatRead: 2 });

  resMan.RegisterFormat(TestDescriptorCacheFormat, { multiplier: 3 });
  const reregistered = await readDecodedData(resMan, path, {    source: sourceA,    emit: "raw",
    sourceRevision: 1,
    cacheFormat: true
  });
  const bypassed = await readDecodedData(resMan, path, {    source: sourceA,    emit: "raw",
    sourceRevision: 1,
    cacheFormat: false
  });
  const retained = await readDecodedData(resMan, path, {    source: sourceA,    emit: "raw",
    sourceRevision: 1
  });

  assert.deepEqual(reregistered, { value: 6, formatRead: 3 });
  assert.deepEqual(bypassed, { value: 6, formatRead: 4 });
  assert.equal(retained, reregistered);
  assert.equal(sourceAReads, 1);
  assert.equal(sourceBReads, 1);
  assert.equal(formatReads, 4);
});

test("format cache identity distinguishes same-named class constructors", async () =>
{
  let sourceReads = 0;
  let formatReads = 0;
  const source = {
    Read()
    {
      sourceReads += 1;
      return new Uint8Array([ 1 ]);
    }
  };
  const ClassA = class SharedName {};
  const ClassB = class SharedName {};

  class TestClassIdentityFormat
  {
    static extensions = Object.freeze([ ".classidentity" ]);
    static outputs = Object.freeze({ "raw": Object.freeze({ output: "raw" }) })

    static read(bytes, options)
    {
      formatReads += 1;
      return { Constructor: options.classes.Root, byte: bytes[0] };
    }
  }

  const path = "res:/data/classes.classidentity";
  const resMan = new CjsBlueResMan({ source }).RegisterFormat(TestClassIdentityFormat);
  blue.resMan = resMan;
  const first = await readDecodedData(resMan, path, {    emit: "raw",
    classes: { Root: ClassA },
    sourceRevision: 1,
    cacheSource: true,
    cacheFormat: true
  });
  const second = await readDecodedData(resMan, path, {    emit: "raw",
    classes: { Root: ClassB },
    sourceRevision: 1,
    cacheFormat: true
  });

  assert.equal(first.Constructor, ClassA);
  assert.equal(second.Constructor, ClassB);
  assert.notEqual(first, second);
  assert.equal(sourceReads, 1);
  assert.equal(formatReads, 2);
});

test("non-canonical format options bypass retained format sharing", async () =>
{
  let sourceReads = 0;
  let formatReads = 0;
  const source = { Read() { sourceReads += 1; return new Uint8Array([ 3 ]); } };

  class TestNonCanonicalCacheFormat
  {
    static extensions = Object.freeze([ ".noncanonical" ]);
    static outputs = Object.freeze({ "raw": Object.freeze({ output: "raw" }) })

    static read(bytes)
    {
      formatReads += 1;
      return { byte: bytes[0], formatRead: formatReads };
    }
  }

  const path = "res:/data/options.noncanonical";
  const formatOptions = { timestamp: new Date(0) };
  const resMan = new CjsBlueResMan({ source }).RegisterFormat(TestNonCanonicalCacheFormat);
  blue.resMan = resMan;
  const first = await readDecodedData(resMan, path, {    emit: "raw",
    formatOptions,
    sourceRevision: 1,
    cacheSource: true,
    cacheFormat: true
  });
  const second = await readDecodedData(resMan, path, {    emit: "raw",
    formatOptions,
    sourceRevision: 1,
    cacheFormat: true
  });

  assert.deepEqual(first, { byte: 3, formatRead: 1 });
  assert.deepEqual(second, { byte: 3, formatRead: 2 });
  assert.equal(sourceReads, 1);
  assert.equal(formatReads, 2);
});

test("registered format defaults are deeply snapshotted", async () =>
{
  const defaults = {
    transform: { multiplier: 2 },
    offsets: [ 1, { value: 3 } ]
  };

  class TestDefaultSnapshotFormat
  {
    static extensions = Object.freeze([ ".defaultsnapshot" ]);
    static outputs = Object.freeze({ "raw": Object.freeze({ output: "raw" }) })

    static read(bytes, options)
    {
      return bytes[0] * options.transform.multiplier
        + options.offsets[0]
        + options.offsets[1].value;
    }
  }

  const path = "res:/data/defaults.defaultsnapshot";
  const resMan = new CjsBlueResMan({
    source: { Read() { return new Uint8Array([ 4 ]); } }
  }).RegisterFormat(TestDefaultSnapshotFormat, defaults);
  blue.resMan = resMan;
  defaults.transform.multiplier = 20;
  defaults.offsets[0] = 10;
  defaults.offsets[1].value = 30;

  const descriptor = resMan.GetFormatDescriptors("defaultsnapshot")[0];
  assert.equal(await LoadData(resMan, path, { emit: "raw" }), 12);
});

test("joined cache retention upgrades and cache false bypasses source sharing", async () =>
{
  let sourceReads = 0;
  let releaseFirst;
  const source = {
    Read()
    {
      sourceReads += 1;
      if (sourceReads === 1)
      {
        return new Promise(resolve => { releaseFirst = resolve; });
      }
      return new Uint8Array([ sourceReads ]);
    }
  };
  const resMan = new CjsBlueResMan({ source });
  blue.resMan = resMan;
  const path = "res:/data/source-cache.bin";
  const first = resMan.ReadResource(path, { sourceRevision: 4 });
  const upgraded = resMan.ReadResource(path, { sourceRevision: 4, cacheSource: true });
  assert.equal(first, upgraded);
  await Promise.resolve();
  assert.equal(sourceReads, 1);
  releaseFirst(new Uint8Array([ 1 ]));
  await first;

  const retained = resMan.ReadResource(path, { sourceRevision: 4 });
  assert.equal(retained, first);
  const bypassed = resMan.ReadResource(path, { sourceRevision: 4, cacheSource: false });
  assert.notEqual(bypassed, first);
  assert.deepEqual(await bypassed, new Uint8Array([ 2 ]));
  assert.equal(sourceReads, 2);

  const invalidated = resMan.InvalidateReadCache(path, { sourceRevision: 4 });
  assert.equal(invalidated.source, 1);
  assert.deepEqual(await resMan.ReadResource(path, { sourceRevision: 4 }), new Uint8Array([ 3 ]));
  assert.equal(sourceReads, 3);
});

test("late invalidated source settlement cannot displace a newer retained record", async () =>
{
  const resolvers = [];
  let sourceReads = 0;
  const source = {
    Read()
    {
      sourceReads += 1;
      return new Promise(resolve => resolvers.push(resolve));
    }
  };
  const resMan = new CjsBlueResMan({ source });
  blue.resMan = resMan;
  const path = "res:/data/late-cache.bin";
  const oldOperation = resMan.ReadResource(path, { sourceRevision: "same", cacheSource: true });
  await Promise.resolve();
  assert.equal(resMan.InvalidateReadCache(path, { sourceRevision: "same" }).source, 1);
  const newOperation = resMan.ReadResource(path, { sourceRevision: "same", cacheSource: true });
  await Promise.resolve();
  assert.equal(sourceReads, 2);

  resolvers[0](new Uint8Array([ 1 ]));
  await oldOperation;
  resolvers[1](new Uint8Array([ 2 ]));
  assert.deepEqual(await newOperation, new Uint8Array([ 2 ]));
  assert.equal(resMan.ReadResource(path, { sourceRevision: "same" }), newOperation);
});

test("late invalidated format settlement cannot displace a newer retained record", async () =>
{
  const resolvers = [];
  let formatReads = 0;
  const source = { Read() { return new Uint8Array([ 0 ]); } };

  class TestLateFormatCache
  {
    static extensions = Object.freeze([ ".lateformat" ]);
    static outputs = Object.freeze({ "raw": Object.freeze({ output: "raw" }) })

    static readAsync(bytes)
    {
      formatReads += 1;
      return new Promise(resolve => resolvers.push(() => resolve({ revision: bytes[0] })));
    }
  }

  const path = "res:/data/late.lateformat";
  const options = {
    emit: "raw",
    sourceRevision: "same",
    cacheFormat: true
  };
  const resMan = new CjsBlueResMan({ source }).RegisterFormat(TestLateFormatCache);
  blue.resMan = resMan;
  const resource = resMan.GetResource(path, options);
  const descriptor = resMan.ResolveFormatDescriptor("lateformat", options);
  const oldOperation = resMan.ReadFormatOnce(resource, descriptor, new Uint8Array([ 1 ]), options);
  await Promise.resolve();
  assert.equal(resMan.InvalidateReadCache(path, { sourceRevision: "same" }).format, 1);
  const newOperation = resMan.ReadFormatOnce(resource, descriptor, new Uint8Array([ 2 ]), options);
  await Promise.resolve();
  assert.equal(formatReads, 2);

  resolvers[0]();
  assert.deepEqual(await oldOperation, { revision: 1 });
  resolvers[1]();
  assert.deepEqual(await newOperation, { revision: 2 });
  assert.equal(
    resMan.ReadFormatOnce(resource, descriptor, new Uint8Array([ 9 ]), options),
    newOperation
  );
});

test("Delete preserves retained reads while Clear resets every read ledger", async () =>
{
  let sourceReads = 0;
  const source = { Read() { sourceReads += 1; return new Uint8Array([ sourceReads ]); } };
  const resMan = new CjsBlueResMan({ source });
  blue.resMan = resMan;
  resMan.RegisterObjectLoader("bin", value => value);
  const path = "res:/data/delete-cache.bin";
  const retained = resMan.ReadResource(path, { sourceRevision: 1, cacheSource: true });
  await retained;
  resMan.GetResource(path);
  assert.equal(resMan.Delete(path), true);
  assert.equal(resMan.ReadResource(path, { sourceRevision: 1 }), retained);
  assert.equal(sourceReads, 1);

  resMan.Clear();
  assert.deepEqual(await resMan.ReadResource(path, { sourceRevision: 1 }), new Uint8Array([ 2 ]));
  assert.equal(sourceReads, 2);
});

test("released resources retain source provenance but not cache policy", async () =>
{
  let originalReads = 0;
  let laterDefaultReads = 0;
  const originalSource = { Read() { originalReads += 1; return "{\"source\":\"original\"}"; } };
  const laterDefaultSource = { Read() { laterDefaultReads += 1; return "{\"source\":\"later\"}"; } };
  const resMan = new CjsBlueResMan({ source: originalSource });
  blue.resMan = resMan;
  resMan.RegisterObjectLoader("json", value => JSON.parse(value));
  const path = "res:/data/provenance.json";
  // Request options go on GetResource, which starts the load; Ready() waits.
  const resource = resMan.GetResource(path, {
    sourceRevision: "original-v1",
    cacheSource: true
  });
  await resMan.Ready(resource);
  assert.equal(originalReads, 1);
  resMan.SetSource(laterDefaultSource);
  assert.equal(resMan.InvalidateReadCache(path, {
    source: originalSource,
    sourceRevision: "original-v1"
  }).source, 1);

  resMan.ReleaseResourcePayload(resource);
  assert.deepEqual(
    await LoadData(resMan, path, {
      source: laterDefaultSource,
      sourceRevision: "different-v2"
    }),
    { source: "original" }
  );
  assert.equal(originalReads, 2);
  assert.equal(laterDefaultReads, 0);
  assert.equal(resMan.InvalidateReadCache(path, {
    source: originalSource,
    sourceRevision: "original-v1"
  }).source, 0);
});

test("TriGeometryRes selects a LOD by screen size, lowest quality first", () => {
  const geometry = new TriGeometryRes();
  geometry.ReadCMFFile({
    version: 1,
    sourceFormat: "gr2",
    meshes: [ {
      name: "hull",
      lods: [
        { maxScreenSize: 1000, areas: [ { firstIndex: 0, primitiveCount: 100 } ] },
        { maxScreenSize: 200, areas: [ { firstIndex: 0, primitiveCount: 40 } ] },
        { maxScreenSize: 50, areas: [ { firstIndex: 0, primitiveCount: 10 } ] }
      ]
    } ]
  });

  assert.equal(geometry.GetLodIndexForScreenSize(0, 20), 2, "the cheapest LOD that still covers it");
  assert.equal(geometry.GetLodIndexForScreenSize(0, 150), 1);
  assert.equal(geometry.GetLodIndexForScreenSize(0, 900), 0);
  assert.equal(geometry.GetLodIndexForScreenSize(0, 99999), 0,
    "a request larger than the best LOD falls back to the highest quality one");
  assert.equal(geometry.GetMeshLod__ScreenSize(0, 20).maxScreenSize, 50);
  assert.equal(geometry.GetMeshLod__ScreenSize(0, 900).maxScreenSize, 1000);
  assert.equal(geometry.GetLodIndexForScreenSize(9, 10), -1, "no such mesh");
  assert.equal(geometry.GetMeshLod__ScreenSize(9, 10), null);

  geometry.forceLod = true;
  geometry.forcedLodIndex = 1;
  assert.equal(geometry.GetLodIndexForScreenSize(0, 99999), 1, "forceLod pins the index");
  geometry.forcedLodIndex = 99;
  assert.equal(geometry.GetLodIndexForScreenSize(0, 10), 2, "clamped to the last LOD");
});

test("TriGeometryRes treats a flattened single-LOD mesh as its own LOD", () => {
  const geometry = new TriGeometryRes();
  geometry.ReadCMFFile({
    version: 1,
    sourceFormat: "cmf",
    meshes: [ { name: "rock", areas: [ { firstIndex: 0, primitiveCount: 12 } ] } ]
  });

  assert.equal(geometry.GetMeshLod__ScreenSize(0, 100)?.name, "rock");
  assert.equal(geometry.GetMeshLod__LodIndex(0, 1), null, "there is only one");
});

test("TriGeometryRes.getPrimitiveCount sums an area run and clamps it", () => {
  const lod = { areas: [
    { primitiveCount: 10 },
    { primitiveCount: 12 },
    { primitiveCount: 8 }
  ] };

  assert.equal(TriGeometryRes.getPrimitiveCount(lod, 0, 1), 10);
  assert.equal(TriGeometryRes.getPrimitiveCount(lod, 1, 2), 20, "12 + 8");
  assert.equal(TriGeometryRes.getPrimitiveCount(lod, 1, 99), 20, "run clamped to the list");
  assert.equal(TriGeometryRes.getPrimitiveCount(lod, 3, 1), 0, "index out of range");
  assert.equal(TriGeometryRes.getPrimitiveCount(null, 0, 1), 0);
});

test("GetMeshVertexElements reads the element list the readers actually emit", () => {
  const geometry = new TriGeometryRes();

  // The CMF reader names this `decl`, after the CMF struct field.
  geometry.ReadCMFFile({
    version: 1,
    sourceFormat: "cmf",
    meshes: [ {
      name: "hull",
      decl: [
        { usage: "POSITION", usageIndex: 0, type: "FLOAT3", elementCount: 3, offset: 0 },
        { usage: "TEXCOORD", usageIndex: 0, type: "FLOAT2", elementCount: 2, offset: 12 }
      ],
      areas: [ { firstIndex: 0, primitiveCount: 4 } ]
    } ]
  });

  const elements = geometry.GetMeshVertexElements(0);
  assert.equal(elements.length, 2, "an empty list here means nothing can bind geometry");
  assert.equal(elements[0].usage, "POSITION");
  assert.equal(elements[1].offset, 12);
  assert.deepEqual(geometry.GetMeshVertexElements(9), [], "no such mesh");
});

test("GetResource requests the resource; Ready() waits on that request (Carbon's Initialize queues the load)", async () =>
{
  let reads = 0;
  const resMan = new CjsBlueResMan({ source: { Read() { reads += 1; return "{\"loaded\":true}"; } } });
  blue.resMan = resMan;
  resMan.RegisterObjectLoader("json", value => JSON.parse(value));

  const resource = resMan.GetResource("res:/data/requested.json");
  // Nothing has awaited it: the request was made by asking for the resource.
  for (let i = 0; i < 20 && reads === 0; i++) await Promise.resolve();
  assert.equal(reads, 1, "GetResource alone read the source");

  assert.deepEqual(await resMan.Ready(resource), { loaded: true });
  assert.equal(reads, 1, "Ready() joined the request rather than reading again");
  assert.equal(resMan.GetResource("res:/data/requested.json"), resource);
  assert.equal(reads, 1, "a cache hit requests nothing");
});

test("a resource that cannot be fetched fails on the resource, not in GetResource", async () =>
{
  const resMan = new CjsBlueResMan();
  blue.resMan = resMan;
  resMan.RegisterObjectLoader("json", JSON.parse);
  const resource = resMan.GetResource("res:/data/unreachable.json");
  // The load fails on the resource once the read through be.paths answers.
  await resMan.Wait();

  assert.equal(resource.IsPrepared() && !resource.IsGood(), true);
  assert.ok(resMan.GetResourceStatus(resource).error, "the reason is kept on the resource");
});

test("an invalid GetResource call throws; only resource failures are recorded", async () =>
{
  const resMan = new CjsBlueResMan();
  blue.resMan = resMan;

  assert.throws(() => resMan.GetResource(42), TypeError);
  assert.throws(() => resMan.GetResource(""), TypeError);
  assert.throws(() => resMan.GetResource("res:/data/x.json", 5), TypeError);
  resMan.RegisterObjectLoader("json", JSON.parse);
  const resource = resMan.GetResource("res:/data/x.json");
  await resMan.Wait();
  assert.equal(resource.IsPrepared() && !resource.IsGood(), true, "no file system is the resource's failure");
});


let previousManager;
beforeEach(() => { previousManager = blue.resMan; });
afterEach(() => { try { blue.resMan.Clear(); } finally { blue.resMan = previousManager; } });
