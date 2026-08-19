import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getResourceExtension,
  normalizeResourcePath
} from "@carbonenginejs/runtime-utils/path";
import { CjsSchema } from "@carbonenginejs/runtime-utils/schema";
import * as runtimeResource from "../npm/dist/index.js";
import { CjsBlackFormat } from "../npm/dist/formats/black/index.js";
import { CjsRedFormat } from "../npm/dist/formats/red/index.js";
import {
  CjsEventEmitter,
  Tr2EffectRes,
  Tr2ImageRes,
  TriGeometryRes,
  TriTextureRes,
  CjsMotherLode,
  CjsLoadingObject,
  CjsResMan,
  CjsResource,
  CjsResourceProbe,
  ResourceHandlerMode,
  ResourcePayloadType,
  validateRgbaPayload,
  validateTexturePayload,
  validateAudioPayload,
  validateVideoPayload,
  Tr2GrannyStateRes,
  Tr2LightProfileRes,
  Tr2MaterialRes,
  CjsTextureArrayRes,
  CjsTextureArrayResParameterProxy,
  TriGrannyRes,
  getMotherLodeKey
} from "../npm/dist/index.js";

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

  const payload = { skeleton: { bones: [] }, additiveAnimations: [] };
  gstate.SetPayload(payload);
  assert.equal(gstate.GetPayload(), payload);
  assert.equal("models" in payload, false);

  assert.equal(CjsSchema.GetConstructor("TriGrannyRes"), TriGrannyRes);
  assert.equal(CjsSchema.GetConstructor("Tr2GrannyStateRes"), Tr2GrannyStateRes);
  assert.equal(CjsSchema.GetConstructor("Tr2LightProfileRes"), Tr2LightProfileRes);

  const resMan = new CjsResMan().RegisterResourceType(TriGrannyRes);
  assert.equal(
    resMan.GetResource("res:/character/other.gr2", { requirement: "granny" }) instanceof TriGrannyRes,
    true
  );
});

test("CjsResMan.Register adds formats and semantic resource types", async () => {
  class CjsTestFormat
  {
    static inputTypes = [ "foo", "bar" ];
    static outputTypes = [ "granny" ];
    static debugOutputTypes = [ "cmfJson" ];
    static read(input, options) { return { input, emit: options.emit }; }
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
  assert.equal(resMan.ResolveFormat("foo", { emit: "cmfjson" }), CjsTestFormat);
  assert.deepEqual(
    await resMan.ReadFormat(resMan.GetFormatDescriptors("foo")[0], 7, { emit: "cmfjson" }),
    { input: 7, emit: "cmfJson" }
  );
  assert.throws(
    () => resMan.ResolveFormat("foo", { emit: "cmf" }),
    error => error.code === "CJS_RESOURCE_FORMAT_OUTPUT_MISSING"
      && error.ext === "foo"
      && error.emit === "cmf"
  );
  assert.throws(
    () => resMan.GetResource("res:/character/value.foo", { emit: "cmf" }),
    error => error.code === "CJS_RESOURCE_FORMAT_OUTPUT_MISSING"
  );
  resMan.GetResource("res:/character/cached.foo", { variant: "cmf" });
  assert.throws(
    () => resMan.GetResource("res:/character/cached.foo", {
      variant: "cmf",
      emit: "cmf"
    }),
    error => error.code === "CJS_RESOURCE_FORMAT_OUTPUT_MISSING"
  );
  assert.equal(
    resMan.GetResource("res:/character/value.foo", { requirement: "granny" }) instanceof TriGrannyRes,
    true
  );
  assert.equal(resMan.Register({ formats: [ CjsTestFormat ] }), resMan);
  assert.deepEqual(resMan.GetFormats("foo"), [ CjsTestFormat ]);

  resMan.RegisterObjectLoader("plain", value => value);
  resMan.GetResource("res:/character/cached.plain", { variant: "cmf" });
  assert.throws(
    () => resMan.GetResource("res:/character/cached.plain", {
      variant: "cmf",
      emit: "cmf"
    }),
    error => error.code === "CJS_RESOURCE_FORMAT_OUTPUT_MISSING"
  );
});

test("CjsResMan registers immutable extension handlers through every short form", async () =>
{
  class CjsRouteResource extends CjsResource {}
  class CjsRouteFormat
  {
    static outputTypes = [ "payload" ];
    static read(bytes) { return { byte: bytes[0] }; }
  }

  const source = { Read() { return new Uint8Array([ 7 ]); } };
  const resMan = new CjsResMan({ source });

  assert.equal(CjsResource.handlerMode, ResourceHandlerMode.RESOURCE);
  assert.equal(CjsLoadingObject.handlerMode, ResourceHandlerMode.OBJECT);
  assert.equal(new CjsLoadingObject().isResource, false);
  assert.equal(resMan.RegisterExtension(".RoUtE", CjsRouteResource, CjsRouteFormat), resMan);
  const shortRoute = resMan.GetExtensionRoute("route");
  assert.equal(shortRoute.Handler, CjsRouteResource);
  assert.equal(shortRoute.formats[0].Format, CjsRouteFormat);
  assert.equal(Object.isFrozen(shortRoute), true);

  resMan.RegisterExtension("route", CjsRouteResource, { Format: CjsRouteFormat });
  const longRoute = resMan.GetExtensionRoute(".ROUTE");
  assert.notEqual(longRoute, shortRoute);
  assert.equal(longRoute.formats[0].Format, CjsRouteFormat);

  const resource = await resMan.Fetch("res:/data/one.route");
  assert.equal(resource instanceof CjsRouteResource, true);
  assert.deepEqual(resource.GetPayload(), { byte: 7 });
  assert.equal(await resMan.GetObject("res:/data/one.route"), resource);

  assert.throws(
    () => resMan.RegisterExtension("bad", class {}, CjsRouteFormat),
    /CjsResource-compatible handler/u
  );
  class MissingMode extends CjsResource {}
  MissingMode.handlerMode = "other";
  assert.throws(
    () => resMan.RegisterExtension("bad", MissingMode, CjsRouteFormat),
    /Handler\.handlerMode/u
  );
});

test("CjsResMan object extension routes hydrate targets and retain captured routes", async () =>
{
  class CjsFirstFormat
  {
    static read(bytes) { return { value: bytes[0], source: "first" }; }
  }
  class CjsSecondFormat
  {
    static read(bytes) { return { value: bytes[0], source: "second" }; }
  }
  class CjsTarget
  {
    constructor(values) { Object.assign(this, values); }
    static from(values) { return new CjsTarget(values); }
  }
  class CjsSemanticResource extends CjsResource {}

  let reads = 0;
  const path = "res:/data/model.typed";
  const resMan = new CjsResMan({
    source: { Read() { reads += 1; return new Uint8Array([ reads ]); } }
  });
  resMan.RegisterExtension("typed", CjsLoadingObject, {
    Format: CjsFirstFormat,
    Target: CjsTarget
  });
  resMan.RegisterResourceType("semantic", CjsSemanticResource);

  const first = await resMan.Fetch(path);
  assert.equal(first instanceof CjsTarget, true);
  assert.deepEqual({ ...first }, { value: 1, source: "first" });
  const handler = resMan.GetResource(path);
  assert.equal(handler instanceof CjsLoadingObject, true);
  assert.equal(handler.GetPayload(), first);
  assert.equal(await resMan.Fetch(path), first);
  assert.equal(reads, 1);

  resMan.RegisterExtension("typed", CjsLoadingObject, {
    Format: CjsSecondFormat,
    Target: CjsTarget
  });
  assert.equal(await resMan.Fetch(path), first);

  assert.equal(resMan.Delete(path), true);
  const second = await resMan.Fetch(path);
  assert.equal(second instanceof CjsTarget, true);
  assert.deepEqual({ ...second }, { value: 2, source: "second" });

  const semantic = await resMan.Fetch("res:/data/semantic.typed", {
    requirement: "semantic"
  });
  assert.equal(semantic instanceof CjsSemanticResource, true);
  assert.equal(semantic.GetPayload() instanceof CjsTarget, true);
  assert.equal(
    await resMan.GetObject("res:/data/semantic.typed", { requirement: "semantic" }),
    semantic
  );

  assert.throws(
    () => resMan.RegisterExtension("invalid", CjsLoadingObject, {
      Format: CjsFirstFormat,
      Target: CjsTarget,
      Identify() { return true; }
    }),
    /either Target or Identify/u
  );
});

test("CjsResMan ordered extension formats probe once and use only a final fallback", async () =>
{
  const calls = [];
  class CjsRejectingFormat
  {
    static inputTypes = [ "legacyprobe" ];
    static isSupported() { calls.push("probe:reject"); return { supported: "none" }; }
    static read() { calls.push("read:reject"); throw new Error("must not read"); }
  }
  class CjsAcceptedFormat
  {
    static inputTypes = [ "legacyprobe" ];
    static isSupported() { calls.push("probe:accept"); return true; }
    static read() { calls.push("read:accept"); return { accepted: true }; }
  }
  class CjsFallbackFormat
  {
    static read() { calls.push("read:fallback"); return { fallback: true }; }
  }

  const source = { Read() { return new Uint8Array([ 1 ]); } };
  const resMan = new CjsResMan({ source });
  resMan.RegisterExtension("ordered", CjsLoadingObject, [
    CjsRejectingFormat,
    CjsAcceptedFormat,
    CjsFallbackFormat
  ]);
  assert.deepEqual(await resMan.Fetch("res:/data/value.ordered"), { accepted: true });
  assert.deepEqual(calls, [ "probe:reject", "probe:accept", "read:accept" ]);

  calls.length = 0;
  const legacy = new CjsResMan()
    .RegisterFormat(CjsRejectingFormat)
    .RegisterFormat(CjsAcceptedFormat);
  assert.equal(
    legacy.ResolveFormat("legacyprobe", { bytes: new Uint8Array([ 1 ]) }),
    CjsAcceptedFormat
  );
  assert.deepEqual(calls, [ "probe:reject", "probe:accept" ]);

  assert.throws(
    () => resMan.RegisterExtension("invalid", CjsLoadingObject, [
      CjsFallbackFormat,
      CjsAcceptedFormat
    ]),
    /has no support probe and must be last/u
  );
});

test("CjsResMan uses Black-first content routing for both red and black suffixes", async () =>
{
  const encoded = new TextEncoder().encode("type: TestRoot\nname: yaml-content\n");
  const source = { Read() { return encoded; } };
  const resMan = new CjsResMan({ source });
  resMan.RegisterExtension("red", CjsLoadingObject, [ CjsBlackFormat, CjsRedFormat ]);
  resMan.RegisterExtension("black", CjsLoadingObject, [ CjsBlackFormat, CjsRedFormat ]);

  const fromRed = await resMan.Fetch("res:/data/value.red");
  const fromBlack = await resMan.Fetch("res:/data/value.black");
  assert.equal(fromRed.object._type, "TestRoot");
  assert.equal(fromRed.object.name, "yaml-content");
  assert.deepEqual(fromBlack, fromRed);
});

test("CjsResMan never falls through after an ordered format is selected", async () =>
{
  let fallbackReads = 0;
  class CjsSelectedFormat
  {
    static isSupported() { return true; }
    static read() { throw new Error("selected reader failure"); }
  }
  class CjsUnselectedFallback
  {
    static read()
    {
      fallbackReads += 1;
      return {};
    }
  }

  const resMan = new CjsResMan({
    source: { Read() { return new Uint8Array([ 1 ]); } }
  });
  resMan.RegisterExtension("once", CjsLoadingObject, [
    CjsSelectedFormat,
    CjsUnselectedFallback
  ]);

  await assert.rejects(
    resMan.Fetch("res:/data/value.once"),
    /selected reader failure/u
  );
  assert.equal(fallbackReads, 0);
});

test("CjsResMan Register accepts composed extension route objects", async () =>
{
  class CjsValueFormat
  {
    static read() { return { type: "known", value: 4 }; }
  }
  class CjsKnownTarget
  {
    constructor(values) { Object.assign(this, values); }
    static from(values) { return new CjsKnownTarget(values); }
  }
  class CjsYamlTarget
  {
    static from() { throw new Error("fromYAML must win"); }
    static fromYAML(values, context)
    {
      return { ...values, hydratedBy: context.format };
    }
  }

  const resMan = new CjsResMan({
    source: { Read() { return new Uint8Array([ 4 ]); } },
    extensions: {
      shape: {
        Handler: CjsLoadingObject,
        Format: CjsValueFormat,
        Identify(values)
        {
          return values.type === "known" ? CjsKnownTarget : false;
        }
      }
    }
  });

  const known = await resMan.Fetch("res:/data/value.shape");
  assert.equal(known instanceof CjsKnownTarget, true);
  assert.equal(known.value, 4);

  resMan.RegisterExtension("yamlshape", CjsLoadingObject, {
    Format: CjsValueFormat,
    Target: CjsYamlTarget
  });
  assert.deepEqual(
    await resMan.Fetch("res:/data/value.yamlshape"),
    { type: "known", value: 4, hydratedBy: "CjsValueFormat" }
  );

  resMan.RegisterExtension("rawshape", CjsLoadingObject, {
    Format: CjsValueFormat,
    Identify() { return true; }
  });
  assert.deepEqual(
    await resMan.Fetch("res:/data/value.rawshape"),
    { type: "known", value: 4 }
  );

  resMan.RegisterExtension("unknownshape", CjsLoadingObject, {
    Format: CjsValueFormat,
    Identify() { return false; }
  });
  await assert.rejects(
    resMan.Fetch("res:/data/value.unknownshape"),
    error => error.code === "CJS_RESOURCE_EXTENSION_TARGET_FAILED"
      && error.path === "res:/data/value.unknownshape"
  );
});

test("CjsResMan exposes normalized resource paths and exact translated URLs to formats and targets", async () =>
{
  let formatContext = null;
  let identifyContext = null;
  let sourceUrl = null;

  class CjsContextFormat
  {
    static read(_bytes, _options, context)
    {
      formatContext = context;
      return { type: "context" };
    }
  }

  const source = {
    requiresUrl: true,
    Read(url)
    {
      sourceUrl = url;
      return new Uint8Array([ 1 ]);
    }
  };
  const resMan = new CjsResMan({
    paths: {
      res: "https://CDN.Example.invalid/Assets/"
    },
    source,
    extensions: {
      yaml: {
        Handler: CjsLoadingObject,
        Format: CjsContextFormat,
        Identify(values, context)
        {
          assert.deepEqual(values, { type: "context" });
          identifyContext = context;
          return true;
        }
      }
    }
  });

  assert.deepEqual(
    await resMan.Fetch(" RES:\\Character\\Folder\\Metadata.YAML "),
    { type: "context" }
  );

  const expected = {
    path: "res:/character/folder/metadata.yaml",
    resFilePath: "res:/character/folder/metadata.yaml",
    ext: "yaml",
    fileName: "metadata.yaml",
    url: "https://CDN.Example.invalid/Assets/character/folder/metadata.yaml"
  };

  assert.equal(sourceUrl, expected.url);
  assert.deepEqual(formatContext, expected);
  assert.equal(Object.isFrozen(formatContext), true);
  assert.equal(identifyContext.path, expected.path);
  assert.equal(identifyContext.resFilePath, expected.resFilePath);
  assert.equal(identifyContext.ext, expected.ext);
  assert.equal(identifyContext.fileName, expected.fileName);
  assert.equal(identifyContext.url, expected.url);
  assert.equal(Object.isFrozen(identifyContext), true);

  await resMan.Fetch("res:/character/folder/metadata", { ext: ".YAML" });
  assert.equal(formatContext.resFilePath, "res:/character/folder/metadata");
  assert.equal(formatContext.fileName, "metadata");
  assert.equal(formatContext.ext, "yaml");
  assert.equal(identifyContext.ext, "yaml");
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
  assert.equal(CjsResource.isValidState(CjsResource.State.EMPTY), true);
  assert.equal(CjsResource.isTerminalState(CjsResource.State.EMPTY), false);
  assert.equal(CjsResource.isTerminalState(CjsResource.State.PREPARED), true);
  assert.equal(CjsResource.isTerminalState(CjsResource.State.FAILED), true);
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

test("CjsResMan identity is source path plus promised output", () =>
{
  const resMan = new CjsResMan();
  const converted = resMan.GetResource("res:/ship.gr2", {
    requirement: "geometry",
    emit: "cmf",
    formatOptions: { debug: false }
  });
  const equivalent = resMan.GetResource("RES:/SHIP.GR2", {
    requirement: "geometry",
    emit: "CMF",
    formatOptions: { debug: true }
  });
  const native = resMan.GetResource("res:/ship.gr2", { emit: "gr2" });
  const packaged = resMan.GetResource("res:/ship.cmf", { emit: "cmf" });

  assert.equal(equivalent, converted);
  assert.notEqual(native, converted);
  assert.notEqual(packaged, converted);
  assert.equal(resMan.GetResourceVariant({ emit: "CMF" }), "cmf");
  assert.equal(resMan.GetResourceVariant({ requirement: "Geometry" }), "geometry");
  assert.equal(resMan.GetResourceVariant({ variant: "cmf2", emit: "cmf" }), "cmf2");
  assert.equal(resMan.Lookup("res:/ship.gr2", { emit: "cmf" }), converted);
  assert.equal(resMan.motherLode.GetSize(), 3);
  assert.throws(
    () => resMan.GetResourceVariant({ variant: {} }),
    /variant must be a non-empty string/u
  );
  assert.throws(
    () => resMan.GetResourceVariant({ variant: "", emit: "cmf" }),
    /variant must be a non-empty string/u
  );
});

test("bound resource handles keep their promised output during reconstruction", async () =>
{
  let reads = 0;
  class CjsBoundOutputFormat
  {
    static inputTypes = [ "boundoutput" ];
    static outputTypes = [ "cmf", "gr2" ];

    static read(_bytes, options)
    {
      reads += 1;
      return { emit: options.emit, reads };
    }
  }

  const path = "res:/ship.boundoutput";
  const resMan = new CjsResMan({
    source: { Read() { return new Uint8Array([ 1 ]); } }
  }).RegisterFormat(CjsBoundOutputFormat);
  const resource = resMan.GetResource(path, {
    variant: "cmf",
    emit: "cmf",
    pipeline: "ignored",
    preparePipeline: "ignored",
    prepareStages: [ () => { throw new Error("must not be retained"); } ]
  });

  assert.equal(Object.isFrozen(resource.GetObjectRequest()), true);
  assert.equal(resource.GetObjectRequest().variant, "cmf");
  assert.equal(resource.GetObjectRequest().emit, "cmf");
  assert.equal(Object.hasOwn(resource.GetObjectRequest(), "pipeline"), false);
  assert.equal(Object.hasOwn(resource.GetObjectRequest(), "preparePipeline"), false);
  assert.equal(Object.hasOwn(resource.GetObjectRequest(), "prepareStages"), false);
  assert.deepEqual(await resource.Ready({ emit: "gr2" }), { emit: "cmf", reads: 1 });
  resource.ReleasePayload();
  assert.deepEqual(
    await resMan.GetObject(path, { variant: "cmf", emit: "gr2" }),
    { emit: "cmf", reads: 2 }
  );
  assert.equal(resMan.motherLode.GetSize(), 1);
});

test("registration changes do not create hidden resource identities", () =>
{
  class FirstResource extends CjsResource {}
  class SecondResource extends CjsResource {}

  const resMan = new CjsResMan();
  const path = "res:/data/configured.bin";
  resMan.RegisterResourceType("configured", FirstResource);
  const first = resMan.GetResource(path, { requirement: "configured" });

  resMan.RegisterResourceType("configured", SecondResource);
  const sameIdentity = resMan.GetResource(path, { requirement: "configured" });
  assert.equal(sameIdentity, first);
  assert.equal(sameIdentity instanceof FirstResource, true);

  assert.equal(resMan.Delete(path, { requirement: "configured" }), true);
  const afterExplicitReset = resMan.GetResource(path, { requirement: "configured" });
  assert.notEqual(afterExplicitReset, first);
  assert.equal(afterExplicitReset instanceof SecondResource, true);
});

test("CjsMotherLode exposes canonical identity and activity diagnostics", () =>
{
  let time = 100;
  const motherLode = new CjsMotherLode({
    cacheSize: 4096,
    now: () => time++
  });
  const resource = new CjsResource().Initialize("RES:/Texture/Ship.DDS");
  const key = getMotherLodeKey(resource.GetPath(), "texture/native@1");
  const result = motherLode.Insert(key, resource, { bytes: 256 });

  assert.equal(result.key, key);
  assert.equal(result.resource, resource);
  assert.equal(result.inserted, true);
  assert.equal(result.replaced, false);
  assert.equal(result.displaced, null);
  assert.equal(motherLode.IsStarted(), true);
  assert.equal(motherLode.HasKey(key), true);
  assert.equal(motherLode.Has(resource.GetPath(), "texture/native@1"), true);
  assert.equal(motherLode.Lookup(key), resource);
  assert.equal(motherLode.GetSize(), 1);
  assert.equal(motherLode.GetCount(), 1);
  assert.equal(motherLode.GetCacheSize(), 4096);
  assert.deepEqual(motherLode.GetKeys(), [ key ]);
  assert.deepEqual(motherLode.GetValues(), [ resource ]);
  assert.deepEqual([ ...motherLode.Entries() ], [ [ key, resource ] ]);

  assert.equal(motherLode.Lock(key), 1);
  assert.equal(motherLode.Lock(key), 2);
  motherLode.Insert(key, resource, { cached: true });
  assert.equal(motherLode.Unlock(key), 1);
  assert.equal(motherLode.KeepAlive(key), resource);

  const stats = motherLode.GetStats();
  assert.equal(stats.count, 1);
  assert.equal(stats.size, 1);
  assert.equal(stats.live, 1);
  assert.equal(stats.cached, 0);
  assert.equal(stats.locked, 1);
  assert.equal(stats.bytes, 256);
  assert.equal(stats.cacheSize, 4096);
  assert.equal(stats.states.empty, 1);
  assert.deepEqual(stats.paths, [ "res:/texture/ship.dds" ]);
  assert.ok(stats.activityFrame >= 4);
});

test("CjsMotherLode replacement and removal clean displaced resource ownership", () =>
{
  const motherLode = new CjsMotherLode();
  const key = getMotherLodeKey("res:/data/value.bin", "raw@1");
  const first = new CjsResource().Initialize("res:/data/value.bin");
  const blocked = new CjsResource().Initialize("res:/data/value.bin");
  const replacement = new CjsResource().Initialize("res:/data/value.bin");
  let firstDestroyed = 0;
  let replacementDestroyed = 0;

  first.SetPayload({ value: 1 });
  first.SetAdapterResource("test", { destroy() { firstDestroyed += 1; } });
  replacement.SetPayload({ value: 2 });
  replacement.SetAdapterResource("test", { destroy() { replacementDestroyed += 1; } });

  motherLode.Insert(key, first);
  const refused = motherLode.Insert(key, blocked, { replace: false });

  assert.equal(refused.resource, first);
  assert.equal(refused.inserted, false);
  assert.equal(refused.replaced, false);
  assert.equal(motherLode.Lookup(key), first);
  assert.equal(first.HasPayload(), true);

  const replaced = motherLode.Insert(key, replacement);

  assert.equal(replaced.resource, replacement);
  assert.equal(replaced.inserted, true);
  assert.equal(replaced.replaced, true);
  assert.equal(replaced.displaced, first);
  assert.equal(firstDestroyed, 1);
  assert.equal(first.HasAdapterResource("test"), false);
  assert.equal(first.HasPayload(), false);
  assert.equal(motherLode.Lookup(key), replacement);

  assert.equal(motherLode.Delete(key), true);
  assert.equal(replacementDestroyed, 1);
  assert.equal(replacement.HasPayload(), false);
  assert.equal(motherLode.Delete(key), false);

  const retainedKey = getMotherLodeKey("res:/data/retained.bin");
  const retained = new CjsResource().Initialize("res:/data/retained.bin");
  const retainedReplacement = new CjsResource().Initialize("res:/data/retained.bin");
  let retainedDestroyed = 0;
  retained.SetPayload({ retained: true });
  retained.SetAdapterResource("test", { destroy() { retainedDestroyed += 1; } });
  motherLode.Insert(retainedKey, retained);

  const retainedResult = motherLode.Insert(retainedKey, retainedReplacement, { cleanup: false });

  assert.equal(retainedResult.displaced, retained);
  assert.equal(retainedDestroyed, 0);
  assert.equal(retained.HasAdapterResource("test"), true);
  assert.equal(retained.HasPayload(), true);
  assert.equal(motherLode.Delete(retainedKey), true);

  const failingKey = getMotherLodeKey("res:/data/failing-cleanup.bin");
  const failingOwner = {
    ReleasePayload()
    {
      throw new Error("expected cleanup failure");
    }
  };
  const rejectedReplacement = {};
  motherLode.Insert(failingKey, failingOwner);

  assert.throws(
    () => motherLode.Insert(failingKey, rejectedReplacement),
    error => error.code === "CJS_MOTHERLODE_CLEANUP_FAILED"
      && error.operation === "replace"
      && error.resource === failingOwner
  );
  assert.equal(motherLode.Lookup(failingKey), failingOwner);
  assert.equal(motherLode.Delete(failingKey, { cleanup: false }), true);
});

test("CjsMotherLode conditional replacement commits before displaced cleanup", () =>
{
  const motherLode = new CjsMotherLode();
  const key = getMotherLodeKey("res:/data/conditional-replace.bin");
  const expected = new CjsResource().Initialize(key);
  const candidate = new CjsResource().Initialize(key);
  const unexpected = new CjsResource().Initialize(key);
  expected.SetPayload({ revision: 1 });
  candidate.SetPayload({ revision: 2 });
  motherLode.Insert(key, expected, { bytes: 32, cached: true });

  const mismatch = motherLode.ReplaceExpected(key, unexpected, candidate);
  assert.deepEqual(mismatch, {
    key,
    committed: false,
    resource: expected,
    displaced: null
  });
  assert.equal(motherLode.Lookup(key), expected);

  assert.throws(
    () => motherLode.ReplaceExpected(key, expected, candidate, {
      cleanup(resource)
      {
        assert.equal(resource, expected);
        assert.equal(motherLode.Lookup(key), candidate);
        throw new Error("expected post-commit cleanup failure");
      }
    }),
    error => error.code === "CJS_MOTHERLODE_REPLACE_CLEANUP_FAILED"
      && error.result.committed === true
      && error.result.resource === candidate
      && error.result.displaced === expected
  );
  assert.equal(motherLode.Lookup(key), candidate);
  assert.equal(motherLode.GetStats().bytes, 32);
  assert.equal(motherLode.GetStats().cached, 0);
  assert.equal(candidate.HasPayload(), true);
});

test("CjsMotherLode clears explicit cached entries and shuts down idempotently", () =>
{
  const motherLode = new CjsMotherLode();
  const live = new CjsResource().Initialize("res:/data/live.bin");
  const cached = new CjsResource().Initialize("res:/data/cached.bin");
  let cachedDestroyed = 0;

  cached.SetPayload({ cached: true });
  cached.SetAdapterResource("test", { destroy() { cachedDestroyed += 1; } });
  motherLode.Insert(getMotherLodeKey(live.GetPath()), live);
  motherLode.Insert(getMotherLodeKey(cached.GetPath()), cached, { cached: true, bytes: 64 });

  assert.equal(motherLode.GetStats().cached, 1);
  assert.equal(motherLode.ClearCached(), 1);
  assert.equal(cachedDestroyed, 1);
  assert.equal(cached.HasPayload(), false);
  assert.equal(motherLode.GetSize(), 1);

  motherLode.Shutdown();
  motherLode.Shutdown();

  assert.equal(motherLode.IsStarted(), false);
  assert.equal(motherLode.GetSize(), 0);
  assert.throws(
    () => motherLode.Insert(getMotherLodeKey("res:/data/rejected.bin"), {}),
    error => error.code === "CJS_MOTHERLODE_INACTIVE"
  );

  motherLode.Startup();
  const restarted = new CjsResource().Initialize("res:/data/restarted.bin");
  const restartedResult = motherLode.Insert(restarted, restarted.GetPath(), "legacy");
  assert.equal(restartedResult.inserted, true);
  assert.equal(restartedResult.key, getMotherLodeKey(restarted.GetPath(), "legacy"));
  assert.equal(motherLode.Has(restarted.GetPath(), "legacy"), true);
});

test("CjsMotherLode trims explicit cached identities oldest-first by recorded bytes", () =>
{
  let time = 0;
  const motherLode = new CjsMotherLode({ cacheSize: 128, now: () => time });
  const destroyed = [];

  const createCached = (name, frame) =>
  {
    const path = `res:/data/${name}.bin`;
    const key = getMotherLodeKey(path);
    const resource = new CjsResource().Initialize(path);
    resource.SetPayload({ name });
    resource.SetAdapterResource("test", { destroy() { destroyed.push(name); } });
    time = frame;
    motherLode.Insert(key, resource, { cached: true, bytes: 64, frame, time });
    return { key, resource };
  };

  const first = createCached("first", 1);
  const second = createCached("second", 2);
  const third = createCached("third", 3);
  const trim = motherLode.TrimCache();

  assert.deepEqual(trim, {
    cacheSize: 128,
    beforeBytes: 192,
    afterBytes: 128,
    evictedBytes: 64,
    overBudget: false,
    evicted: 1,
    failed: 0,
    evictedKeys: [ first.key ],
    failedKeys: []
  });
  assert.deepEqual(destroyed, [ "first" ]);
  assert.equal(first.resource.HasPayload(), false);
  assert.equal(first.resource.IsPurged(), true);
  assert.equal(motherLode.Lookup(first.key), null);
  assert.equal(motherLode.Lookup(second.key), second.resource);
  assert.equal(motherLode.Lookup(third.key), third.resource);
  assert.equal(motherLode.TrimCache().evicted, 0);

  assert.equal(motherLode.SetCacheSize(64), motherLode);
  assert.deepEqual(destroyed, [ "first", "second" ]);
  assert.equal(second.resource.IsPurged(), true);
  assert.equal(motherLode.Lookup(third.key), third.resource);

  motherLode.SetCacheSize(0);
  assert.deepEqual(destroyed, [ "first", "second", "third" ]);
  assert.equal(third.resource.IsPurged(), true);
  assert.equal(motherLode.GetSize(), 0);
});

test("CjsMotherLode validates cache-size cleanup options before changing policy", () =>
{
  const motherLode = new CjsMotherLode({ cacheSize: 128 });

  assert.throws(
    () => motherLode.SetCacheSize(64, []),
    /set cache size options must be an object/u
  );
  assert.equal(motherLode.GetCacheSize(), 128);
});

test("CjsMotherLode byte pressure excludes live, zero-byte, and promoted locked identities", () =>
{
  const motherLode = new CjsMotherLode({ cacheSize: 10 });
  const liveKey = getMotherLodeKey("res:/data/live-weight.bin");
  const zeroKey = getMotherLodeKey("res:/data/zero-weight.bin");
  const lockedKey = getMotherLodeKey("res:/data/locked-weight.bin");
  const pressureKey = getMotherLodeKey("res:/data/pressure-weight.bin");
  const live = new CjsResource().Initialize(liveKey);
  const zero = new CjsResource().Initialize(zeroKey);
  const locked = new CjsResource().Initialize(lockedKey);
  const pressure = new CjsResource().Initialize(pressureKey);

  motherLode.Insert(liveKey, live, { bytes: 1000 });
  motherLode.Insert(zeroKey, zero, { cached: true, bytes: 0 });
  motherLode.Insert(lockedKey, locked, { cached: true, bytes: 20 });
  assert.equal(motherLode.Lock(lockedKey), 1);
  assert.equal(motherLode.Unlock(lockedKey), 0);
  motherLode.Insert(pressureKey, pressure, { cached: true, bytes: 20 });

  const trim = motherLode.TrimCache();

  assert.deepEqual(trim.evictedKeys, [ pressureKey ]);
  assert.equal(motherLode.Lookup(liveKey), live);
  assert.equal(motherLode.Lookup(zeroKey), zero);
  assert.equal(motherLode.Lookup(lockedKey), locked);
  assert.equal(motherLode.Lookup(pressureKey), null);
  assert.equal(motherLode.GetStats().cacheBytes, 0);
  motherLode.SetCacheSize(0);
  assert.equal(motherLode.Lookup(zeroKey), zero);
  assert.equal(motherLode.ClearCached(), 1);
  assert.equal(motherLode.Lookup(zeroKey), null);
});

test("CjsMotherLode cache trim preserves failed owners and reports partial pressure relief", () =>
{
  const motherLode = new CjsMotherLode({ cacheSize: 50 });
  const failingKey = getMotherLodeKey("res:/data/failing-cache.bin");
  const goodKey = getMotherLodeKey("res:/data/good-cache.bin");
  const failing = new CjsResource().Initialize(failingKey);
  const good = new CjsResource().Initialize(goodKey);
  failing.SetPayload({ failing: true });
  failing.SetAdapterResource("test", { destroy() { throw new Error("expected cache cleanup failure"); } });
  good.SetPayload({ good: true });
  motherLode.Insert(failingKey, failing, { cached: true, bytes: 80 });
  motherLode.Insert(goodKey, good, { cached: true, bytes: 80 });

  assert.throws(
    () => motherLode.TrimCache(),
    error => error instanceof AggregateError
      && error.code === "CJS_MOTHERLODE_CACHE_TRIM_FAILED"
      && error.result.beforeBytes === 160
      && error.result.afterBytes === 80
      && error.result.overBudget === true
      && error.result.evicted === 1
      && error.result.failed === 1
      && error.result.evictedKeys[0] === goodKey
      && error.result.failedKeys[0] === failingKey
  );
  assert.equal(motherLode.Lookup(failingKey), failing);
  assert.equal(motherLode.Lookup(goodKey), null);
  assert.equal(failing.IsPurged(), false);
  assert.equal(good.IsPurged(), true);
  assert.equal(motherLode.Delete(failingKey, { cleanup: false }), true);
});

test("CjsMotherLode rejects unsafe aggregate byte weights before ownership changes", () =>
{
  const motherLode = new CjsMotherLode();
  const firstKey = getMotherLodeKey("res:/data/max-safe.bin");
  const rejectedKey = getMotherLodeKey("res:/data/unsafe-total.bin");
  const first = new CjsResource().Initialize(firstKey);
  const rejected = new CjsResource().Initialize(rejectedKey);
  motherLode.Insert(firstKey, first, { bytes: Number.MAX_SAFE_INTEGER });

  assert.throws(
    () => motherLode.Insert(rejectedKey, rejected, { bytes: 1 }),
    /aggregate recorded bytes exceed Number\.MAX_SAFE_INTEGER/u
  );
  assert.equal(motherLode.Lookup(firstKey), first);
  assert.equal(motherLode.Lookup(rejectedKey), null);
});

test("CjsResMan Update enforces cache pressure unless one update skips it", () =>
{
  const motherLode = new CjsMotherLode({ cacheSize: 16 });
  const resMan = new CjsResMan({ motherLode });
  const resource = resMan.GetResource("res:/data/update-cache.bin");
  const key = getMotherLodeKey(resource.GetPath());
  resource.SetPayload({ cached: true });
  motherLode.Insert(key, resource, { cached: true, bytes: 32 });

  assert.equal(resMan.Update({ cache: false, purge: false }), false);
  assert.equal(motherLode.Lookup(key), resource);
  assert.equal(resMan.Update({ purge: false }), true);
  assert.equal(resMan.Lookup(resource.GetPath()), null);
  assert.equal(resource.HasPayload(), false);
  assert.equal(resource.IsPurged(), true);
});

test("CjsResMan stages reload candidates and cleans displaced ownership only after commit", async () =>
{
  const resMan = new CjsResMan({
    source: { Read: () => "{\"value\":2}" }
  });
  resMan.RegisterObjectLoader("json", value => JSON.parse(value));
  const path = "res:/data/reload.json";
  const first = resMan.GetResource(path);
  assert.equal(first.IsCurrent(), true);
  let firstDestroyed = 0;
  first.SetPayload({ value: 1 });
  first.SetAdapterResource("test", { destroy() { firstDestroyed += 1; } });

  const replacement = resMan.GetResource(path, { reload: true });

  assert.notEqual(replacement, first);
  assert.equal(firstDestroyed, 0);
  assert.equal(first.HasPayload(), true);
  assert.equal(resMan.Lookup(path), first);

  assert.deepEqual(await replacement.Ready(), { value: 2 });
  assert.equal(firstDestroyed, 1);
  assert.equal(first.HasPayload(), false);
  assert.equal(resMan.Lookup(path), replacement);
  assert.equal(first.IsCurrent(), false);
  assert.equal(replacement.IsCurrent(), true);

  let replacementDestroyed = 0;
  replacement.SetAdapterResource("test", { destroy() { replacementDestroyed += 1; } });
  assert.equal(resMan.Delete(path), true);
  assert.equal(replacementDestroyed, 1);
  assert.equal(replacement.HasPayload(), false);
  assert.equal(replacement.IsCurrent(), false);

  const cleared = resMan.GetResource("res:/data/clear.bin");
  let clearedDestroyed = 0;
  cleared.SetAdapterResource("test", { destroy() { clearedDestroyed += 1; } });
  resMan.Clear();
  assert.equal(clearedDestroyed, 1);
  assert.equal(resMan.motherLode.GetSize(), 0);
});

test("failed reload source work preserves the exact good owner and cleans its candidate", async () =>
{
  const expectedError = new Error("expected reload source failure");
  const path = "res:/data/reload-source-failure.json";
  const resMan = new CjsResMan({
    source: { Read() { throw expectedError; } }
  });
  const current = resMan.GetResource(path);
  const currentPayload = { revision: 1 };
  let currentDestroyed = 0;
  let candidateDestroyed = 0;
  current.SetPayload(currentPayload);
  current.MarkLoaded();
  current.SetAdapterResource("current", { destroy() { currentDestroyed += 1; } });

  const candidate = resMan.GetResource(path, { reload: true });
  candidate.SetAdapterResource("candidate", { destroy() { candidateDestroyed += 1; } });

  await assert.rejects(candidate.Ready(), error => error === expectedError);
  assert.equal(resMan.Lookup(path), current);
  assert.equal(current.GetPayload(), currentPayload);
  assert.equal(currentDestroyed, 0);
  assert.equal(current.HasLoaded(), true);
  assert.equal(candidateDestroyed, 1);
  assert.equal(candidate.HasPayload(), false);
  assert.equal(candidate.IsFailed(), true);
});

test("failed reload CPU read preserves the good owner and releases candidate adapters", async () =>
{
  const expectedError = new Error("expected reload CPU read failure");
  const path = "res:/data/reload-read-failure.json";
  let candidateDestroyed = 0;
  const resMan = new CjsResMan({
    source: { Read: () => "{\"revision\":2}" }
  });
  resMan.RegisterObjectLoader("json", () => { throw expectedError; });
  const current = resMan.GetResource(path);
  const currentPayload = { revision: 1 };
  current.SetPayload(currentPayload);
  current.MarkLoaded();

  const candidate = resMan.GetResource(path, { reload: true });
  candidate.SetAdapterResource("candidate", {
    destroy() { candidateDestroyed += 1; }
  });
  await assert.rejects(candidate.Ready(), error => error === expectedError);

  assert.equal(resMan.Lookup(path), current);
  assert.equal(current.GetPayload(), currentPayload);
  assert.equal(current.HasLoaded(), true);
  assert.equal(candidateDestroyed, 1);
  assert.equal(candidate.HasAdapterResource("candidate"), false);
  assert.equal(candidate.IsFailed(), true);
});

test("reload rejects singleton candidate aliasing before mutating the canonical handle", () =>
{
  const shared = new CjsResource();
  function SingletonResource()
  {
    return shared;
  }

  const path = "res:/data/reload-singleton.bin";
  const resMan = new CjsResMan({
    resourceTypes: { singleton: SingletonResource }
  });
  const current = resMan.GetResource(path, { requirement: "singleton" });
  current.SetPayload({ stable: true });

  assert.throws(
    () => resMan.GetResource(path, { requirement: "singleton", reload: true }),
    error => error.code === "CJS_RESMAN_RELOAD_CANDIDATE_ALIAS"
      && error.resource === current
  );
  assert.equal(resMan.Lookup(path, { requirement: "singleton" }), current);
  assert.deepEqual(current.GetPayload(), { stable: true });
});

test("displaced cleanup failure reports a committed atomic reload", async () =>
{
  const path = "res:/data/reload-cleanup-failure.json";
  const resMan = new CjsResMan({
    source: { Read: () => "{\"revision\":2}" }
  });
  resMan.RegisterObjectLoader("json", value => JSON.parse(value));
  const current = resMan.GetResource(path);
  current.SetPayload({ revision: 1 });
  current.SetAdapterResource("failing", {
    destroy() { throw new Error("expected displaced cleanup failure"); }
  });

  const candidate = resMan.GetResource(path, { reload: true });
  await assert.rejects(
    candidate.Ready(),
    error => error.code === "CJS_MOTHERLODE_REPLACE_CLEANUP_FAILED"
      && error.result.committed === true
      && error.result.resource === candidate
      && error.result.displaced === current
  );

  assert.equal(resMan.Lookup(path), candidate);
  assert.deepEqual(candidate.GetPayload(), { revision: 2 });
  assert.equal(candidate.HasLoaded(), true);
  assert.equal(current.HasPayload(), false);
});

test("candidate cleanup failure is aggregated without replacing the good owner", async () =>
{
  const expectedError = new Error("expected reload failure");
  const path = "res:/data/reload-candidate-cleanup-failure.bin";
  const resMan = new CjsResMan({
    source: { Read() { throw expectedError; } }
  });
  const current = resMan.GetResource(path);
  current.SetPayload({ stable: true });
  current.MarkLoaded();
  const candidate = resMan.GetResource(path, { reload: true });
  candidate.SetAdapterResource("failing", {
    destroy() { throw new Error("expected candidate cleanup failure"); }
  });

  await assert.rejects(
    candidate.Ready(),
    error => error.code === "CJS_RESMAN_RELOAD_CANDIDATE_CLEANUP_FAILED"
      && error.cause === expectedError
      && error.errors[0] === expectedError
  );
  assert.equal(resMan.Lookup(path), current);
  assert.deepEqual(current.GetPayload(), { stable: true });
  assert.equal(current.HasLoaded(), true);
});

test("CjsResMan binds explicit resource and payload leases for deterministic purge", () =>
{
  let time = 0;
  const motherLode = new CjsMotherLode({ now: () => time });
  const resMan = new CjsResMan({ motherLode });
  const resource = resMan.GetResource("res:/data/leased.bin");
  let destroyed = 0;
  resource.SetAdapterResource("test", { destroy() { destroyed += 1; } });

  resource.SetLifecycleController(null);
  assert.equal(resMan.Lookup(resource.GetPath()), resource);

  time = 10;
  resource.SetPayload({ revision: 1 });
  assert.equal(motherLode.GetStats().payloads, 1);

  resource.GetPayload();
  resource.HasPayload();
  time = 20;
  const payloadSweep = resMan.PurgeInactive({
    time,
    maxIdleMilliseconds: 50,
    payloadMaxIdleMilliseconds: 5
  });

  assert.equal(payloadSweep.purged, 0);
  assert.equal(payloadSweep.payloadsReleased, 1);
  assert.deepEqual(payloadSweep.payloadKeys, [ getMotherLodeKey(resource.GetPath()) ]);
  assert.equal(resource.HasPayload(), false);
  assert.equal(resource.HasAdapterResource("test"), true);
  assert.equal(resource.IsPurged(), false);

  resource.SetPayload({ revision: 2 });
  assert.equal(resource.Lock(), 1);
  time = 100;
  const lockedSweep = resMan.PurgeInactive({
    time,
    maxIdleMilliseconds: 1,
    payloadMaxIdleMilliseconds: 1
  });

  assert.equal(lockedSweep.locked, 1);
  assert.equal(lockedSweep.purged, 0);
  assert.equal(lockedSweep.payloadsReleased, 0);
  assert.equal(resource.HasPayload(), true);
  assert.equal(resource.Unlock(), 0);

  resource.KeepAlive({ time });
  time = 101;
  const separatePayloadSweep = resMan.PurgeInactive({
    time,
    maxIdleMilliseconds: 50,
    payloadMaxIdleMilliseconds: 50
  });
  assert.equal(separatePayloadSweep.purged, 0);
  assert.equal(separatePayloadSweep.payloadsReleased, 1);
  assert.equal(resource.HasAdapterResource("test"), true);

  resource.SetPayload({ revision: 3 });
  time = 200;
  const identitySweep = resMan.PurgeInactive({ time, maxIdleMilliseconds: 50 });

  assert.equal(identitySweep.purged, 1);
  assert.deepEqual(identitySweep.purgedKeys, [ getMotherLodeKey(resource.GetPath()) ]);
  assert.equal(destroyed, 1);
  assert.equal(resource.HasPayload(), false);
  assert.equal(resource.HasAdapterResource("test"), false);
  assert.equal(resource.IsPurged(), true);
  assert.equal(resMan.Lookup(resource.GetPath()), null);
  assert.equal(resource.Lock(), 0);
});

test("CjsResMan automatic purge is opt-in and follows deterministic time cadence", () =>
{
  let time = 0;
  const motherLode = new CjsMotherLode({ now: () => time });
  const resMan = new CjsResMan({
    motherLode,
    autoPurgePolicy: {
      intervalMilliseconds: 10,
      maxIdleMilliseconds: 20,
      payloadMaxIdleMilliseconds: 5,
      now: () => time
    }
  });
  const policy = resMan.GetAutoPurgePolicy();
  const resource = resMan.GetResource("res:/data/automatic-purge.bin");
  resource.SetPayload({ revision: 1 });

  assert.equal(resMan.IsAutoPurgeEnabled(), true);
  assert.equal(Object.isFrozen(policy), true);
  assert.equal(policy.intervalMilliseconds, 10);
  assert.equal(policy.destroyAdapters, true);
  assert.equal(policy.releasePayload, true);
  assert.throws(
    () => resMan.SetAutoPurgePolicy({ intervalMilliseconds: 1 }),
    /requires an identity or payload inactivity limit/u
  );
  assert.throws(
    () => resMan.SetAutoPurgePolicy({ maxIdleFrames: 1 }),
    /does not support: maxIdleFrames/u
  );
  assert.equal(resMan.GetAutoPurgePolicy(), policy);

  const initialSweep = resMan.PumpAutoPurge({ time });
  assert.equal(initialSweep.purged, 0);
  assert.equal(initialSweep.payloadsReleased, 0);

  time = 5;
  assert.equal(resMan.Update({ purge: { time } }), false);
  assert.equal(resource.HasPayload(), true);

  time = 10;
  assert.equal(resMan.Update({ purge: false }), false);
  assert.equal(resource.HasPayload(), true);
  assert.equal(resMan.Update({ purge: { time } }), true);
  assert.equal(resource.HasPayload(), false);
  assert.equal(resource.IsPurged(), false);

  time = 20;
  assert.equal(resMan.Tick({ purge: { time } }), true);
  assert.equal(resource.IsPurged(), true);
  assert.equal(resMan.Lookup(resource.GetPath()), null);

  time = 15;
  assert.equal(resMan.PumpAutoPurge({ time }), null);
  time = 24;
  assert.equal(resMan.PumpAutoPurge({ time }), null);
  time = 25;
  assert.equal(resMan.PumpAutoPurge({ time }).purged, 0);

  assert.equal(resMan.SetAutoPurgePolicy(false), resMan);
  assert.equal(resMan.IsAutoPurgeEnabled(), false);
  assert.equal(resMan.GetAutoPurgePolicy(), null);
  assert.equal(resMan.PumpAutoPurge({ time }), null);
});

test("CjsResMan automatic purge protects queued resource work with a balanced lock", async () =>
{
  let time = 0;
  let sourceReads = 0;
  let releaseRead;
  const read = new Promise(resolve => { releaseRead = resolve; });
  const motherLode = new CjsMotherLode({ now: () => time });
  const resMan = new CjsResMan({
    motherLode,
    source: {
      Read()
      {
        sourceReads += 1;
        return read;
      }
    },
    autoPurgePolicy: {
      intervalMilliseconds: 0,
      maxIdleMilliseconds: 0,
      now: () => time
    }
  });
  resMan.RegisterObjectLoader("json", value => JSON.parse(value));

  const operation = resMan.GetObject("res:/data/active-load.json");
  const resource = resMan.Lookup("res:/data/active-load.json");
  assert.equal(motherLode.GetStats().locked, 1);

  time = 10;
  const protectedSweep = resMan.PumpAutoPurge({ time });
  assert.equal(protectedSweep.locked, 1);
  assert.equal(protectedSweep.purged, 0);
  assert.equal(resource.IsPurged(), false);

  releaseRead("{\"loaded\":true}");
  assert.deepEqual(await operation, { loaded: true });
  assert.equal(sourceReads, 1);
  assert.equal(motherLode.GetStats().locked, 0);

  time = 11;
  const completedSweep = resMan.PumpAutoPurge({ time });
  assert.equal(completedSweep.locked, 0);
  assert.equal(completedSweep.purged, 1);
  assert.equal(resource.IsPurged(), true);
  assert.equal(sourceReads, 1);
});

test("CjsMotherLode inactivity purge preserves failed owners and continues", () =>
{
  let time = 0;
  const motherLode = new CjsMotherLode({ now: () => time });
  const failingKey = getMotherLodeKey("res:/data/failing-purge.bin");
  const goodKey = getMotherLodeKey("res:/data/good-purge.bin");
  const failing = new CjsResource().Initialize("res:/data/failing-purge.bin");
  const good = new CjsResource().Initialize("res:/data/good-purge.bin");
  failing.SetAdapterResource("test", { destroy() { throw new Error("expected purge failure"); } });
  good.SetPayload({ good: true });
  motherLode.Insert(failingKey, failing);
  motherLode.Insert(goodKey, good);

  time = 10;
  assert.throws(
    () => motherLode.PurgeInactive({ time, maxIdleMilliseconds: 1 }),
    error => error instanceof AggregateError
      && error.code === "CJS_MOTHERLODE_PURGE_FAILED"
      && error.result.purged === 1
      && error.result.purgedKeys[0] === goodKey
      && error.errors[0].code === "CJS_MOTHERLODE_CLEANUP_FAILED"
  );

  assert.equal(motherLode.Lookup(failingKey), failing);
  assert.equal(motherLode.Lookup(goodKey), null);
  assert.equal(failing.IsPurged(), false);
  assert.equal(good.IsPurged(), true);
  assert.equal(motherLode.Delete(failingKey, { cleanup: false }), true);
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
  assert.equal(detail1 instanceof CjsTextureArrayResParameterProxy, true);
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

test("CjsTextureArrayResParameterProxy can attach a source while keeping the array as textureRes", () =>
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

test("CjsTextureArrayResParameterProxy exposes source attachment and same-source revision changes", () =>
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

test("TriTextureRes accepts a plain video payload and preserves it on invalid replacement", () => {
  const video = {
    payloadType: ResourcePayloadType.VIDEO,
    sourceFormat: "webm",
    duration: 2000,
    durationTimescale: 1000,
    tracks: [],
    durationSeconds: 2,
    width: 1920,
    height: 1080,
    sourceBytes: new Uint8Array([ 1, 2, 3 ])
  };
  const texture = new TriTextureRes().Initialize("dynamic:/video/hangar");

  texture.SetPayload(video);

  assert.equal(video.width, 1920);
  assert.equal(video.durationSeconds, 2);
  assert.equal(texture.HasPayload(), true);
  assert.equal(texture.GetPayload(), video);
  assert.equal(texture.GetPayload().sourceFormat, "webm");
  assert.throws(
    () => texture.SetPayload({ payloadType: ResourcePayloadType.VIDEO }),
    error => error.code === "CJS_RESOURCE_PAYLOAD_INVALID"
  );
  assert.equal(texture.GetPayload(), video);
});

test("TriTextureRes and TriGeometryRes consume validated plain payloads", () => {
  const texture = new TriTextureRes().Initialize("res:/texture/ship.dds");
  const texturePayload = {
    payloadType: ResourcePayloadType.TEXTURE,
    sourceFormat: "dds",
    width: 4,
    height: 4,
    dimension: "2d",
    arraySize: 1,
    pixelFormat: "bc1-rgba-unorm",
    mipCount: 1,
    isCompressed: true,
    multiSampleType: 4,
    multiSampleQuality: 2,
    hadLodRequests: true,
    originalMemoryUsage: 64,
    data: new Uint8Array(8),
    subresources: [ {
      mip: 0,
      layer: 0,
      offset: 0,
      byteLength: 8,
      width: 4,
      height: 4,
      rowPitch: 8,
      slicePitch: 8
    } ]
  };
  texture.SetPayload(texturePayload);

  const geometry = new TriGeometryRes().Initialize("res:/geometry/ship.cmf");
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
  geometry.SetPayload(geometryPayload);

  assert.equal(texture.GetPath(), "res:/texture/ship.dds");
  assert.equal(texture.width, 4);
  assert.equal(texture.GetMipCount(), 1);
  assert.equal(texture.GetMsaaType(), 4);
  assert.equal(texture.GetMsaaQuality(), 2);
  assert.equal(texture.HadLodRequests(), true);
  assert.equal(texture.GetOriginalMemoryUsage(), 64);
  assert.equal(texture.HasPayload(), true);
  assert.equal(texture.GetPayload().sourceFormat, "dds");
  assert.equal(TriTextureRes.payload, "texture");
  assert.equal(CjsSchema.GetConstructor("TriTextureRes"), TriTextureRes);
  assert.equal(CjsSchema.getField(TriTextureRes, "variants"), null);
  assert.equal(CjsSchema.getMethod(TriTextureRes, "PrepareResources").carbon.method, true);
  assert.equal(CjsSchema.getMethod(TriTextureRes, "Save").impl.status, "notSupported");
  assert.equal(CjsSchema.getMethod(TriTextureRes, "CreateEmptyTexture").impl.status, "notSupported");
  assert.equal(CjsSchema.getMethod(TriTextureRes, "SetPayload"), null);

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
  assert.deepEqual(
    geometry.GetIntersectionPointNormalBone([ 0.25, 0.25, 1 ], [ 0, 0, -1 ]),
    {
      hit: true,
      boneIndex: 7,
      point: [ 0.25, 0.25, 0 ],
      normal: [ 0, 0, 1 ],
      distance: 1,
      meshIndex: 0,
      areaIndex: 0
    }
  );
  assert.equal(geometry.HasPayload(), true);
  assert.equal(TriGeometryRes.payload, "geometry");
  assert.equal(CjsSchema.getField(TriGeometryRes, "meshes"), null);
  assert.equal(CjsSchema.getMethod(TriGeometryRes, "GetMeshCount").impl.status, "adapted");
  assert.equal(CjsSchema.getMethod(TriGeometryRes, "GetSkeletonCount").impl.status, "adapted");
  assert.equal(CjsSchema.getMethod(TriGeometryRes, "GetSkeletonData").impl.status, "adapted");
  assert.throws(
    () => geometry.SetPayload({ animations: [] }),
    error => error.code === "CJS_RESOURCE_PAYLOAD_INVALID" && error.field === "meshes"
  );
  assert.equal(geometry.GetPayload(), geometryPayload);
});

test("a geometry intersection query reports unavailable CPU data instead of a miss", () =>
{
  // The regression this guards is silent: reading `GetPayload()?.meshes` on a
  // released payload returned `hit: false`, which no caller can distinguish
  // from the ray genuinely missing. Picking degrades to "nothing is ever
  // clickable" with no error anywhere. See
  // /docs/contracts/cpu-geometry-residency.md.
  const geometry = new TriGeometryRes();

  assert.equal(geometry.HasPayload(), false);
  assert.throws(
    () => geometry.GetIntersectionPointNormalBone([ 0, 0, 1 ], [ 0, 0, -1 ]),
    /CPU geometry is not resident/u,
    "an absent payload must not answer a ray query"
  );
  assert.throws(
    () => geometry.GetAreaIntersectionPointNormalBone([ 0, 0, 1 ], [ 0, 0, -1 ], 0),
    /CPU geometry is not resident/u,
    "the area query fails the same way"
  );

  // Negative control: the failure must be about residency, not about the ray.
  // An invalid ray still fails as an invalid ray.
  assert.throws(
    () => geometry.GetAreaIntersectionPointNormalBone([ 0, 0, 1 ], [ 0, 0, -1 ], -2),
    RangeError,
    "an invalid area index is still a RangeError"
  );
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
  const shaderPayload = {
    payloadType: "shader",
    sourceFormat: "carbonwebgpu",
    techniques: [ "Main" ],
    passes: [ "Forward" ],
    // Axes, not selections. A permutation entry declares the options an effect
    // was compiled for; which one is wanted is an argument to GetShader.
    permutations: [
      { name: "QUALITY", options: [ "HIGH", "LOW" ], defaultOption: 0 }
    ]
  };
  effect.SetPayload(shaderPayload);

  const image = new Tr2ImageRes().Initialize("res:/image/icon.png");
  const imagePayload = {
    payloadType: ResourcePayloadType.RGBA,
    sourceFormat: "png",
    width: 2,
    height: 1,
    pixelFormat: "rgba8unorm",
    data: new Uint8Array([ 255, 255, 255, 255, 0, 0, 0, 0 ]),
    strideBytes: 8,
    origin: "top-left",
    colorSpace: "srgb",
    alphaMode: "straight"
  };
  image.SetPayload(imagePayload);

  assert.equal(effect.HasPayload(), true);
  assert.deepEqual(effect.GetPermutationDescription(), [ {
    name: "QUALITY",
    options: [ "HIGH", "LOW" ],
    defaultOption: 0,
    description: "",
    type: 0
  } ]);
  assert.equal(Tr2EffectRes.payload, "shader");
  assert.equal(CjsSchema.GetConstructor("Tr2EffectRes"), Tr2EffectRes);
  assert.equal(CjsSchema.getField(Tr2EffectRes, "permutations"), null);

  assert.equal(image.HasPayload(), true);
  assert.equal(image.width, 2);
  assert.equal(image.GetWidth(), 2);
  assert.equal(image.GetHeight(), 1);
  assert.deepEqual(image.GetPixelColor(0, 0), [ 255, 255, 255, 255 ]);
  assert.equal(image.IsPixelOpaque(1, 0), false);
  assert.equal(Tr2ImageRes.payload, "image");
  assert.equal(CjsSchema.getField(Tr2ImageRes, "pixels"), null);
  assert.throws(
    () => image.SetPayload({ payloadType: ResourcePayloadType.RGBA, width: 2, height: 1 }),
    error => error.code === "CJS_RESOURCE_PAYLOAD_INVALID"
  );
  assert.equal(image.GetPayload(), imagePayload);
});

test("CjsResMan.LoadObject reads source, dispatches loaders, and marks resource prepared", async () => {
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
  const resMan = new CjsResMan({ source });

  resMan.RegisterObjectLoader("json", (value, context) => {
    loaderContext = context;
    return JSON.parse(value);
  });

  const object = await resMan.LoadObject("RES:/data/example.JSON");
  const resource = resMan.Lookup("res:/data/example.json");

  assert.deepEqual(object, { name: "example" });
  // Publishing hands over the reader OUTCOME, so the bytes are already what
  // they needed to become - that is preparation, and the resource is good.
  assert.equal(resource.state, CjsResource.State.PREPARED);
  assert.equal(resource.HasLoaded(), true);
  assert.equal(resource.IsPrepared(), true);
  assert.equal(resource.IsGood(), true);
  assert.equal(resource.object, object);
  assert.equal(loaderContext.path, "res:/data/example.json");
  assert.equal(loaderContext.resFilePath, "res:/data/example.json");
  assert.equal(loaderContext.ext, "json");
  assert.equal(loaderContext.fileName, "example.json");
  assert.equal(loaderContext.url, null);
  assert.equal(Object.isFrozen(loaderContext), true);
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

test("generic payloads release and reconstruct only on explicit object use", async () =>
{
  let time = 0;
  let sourceReads = 0;
  const motherLode = new CjsMotherLode({ now: () => time });
  const resMan = new CjsResMan({
    motherLode,
    source: {
      Read()
      {
        sourceReads += 1;
        return `{\"revision\":${sourceReads}}`;
      }
    }
  });
  resMan.RegisterObjectLoader("json", value => JSON.parse(value));

  const path = "res:/data/reconstruct.json";
  const resource = resMan.GetResource(path);
  const first = resource.Ready();
  const concurrent = resMan.GetObject(path);

  assert.equal(first, concurrent);
  const firstObject = await first;
  assert.deepEqual(firstObject, { revision: 1 });
  assert.equal(resource.GetPayload(), firstObject);
  assert.equal(resource.object, firstObject);
  assert.equal(motherLode.GetStats().payloads, 1);

  const resident = resMan.GetObject(path);
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
  assert.equal(resource.HasPayload(), false);
  assert.equal(resource.GetPayload(), null);
  assert.equal(resource.object, null);
  assert.equal(sourceReads, 1);

  resource.HasLoaded();
  resource.GetPayload();
  resource.KeepAlive({ time });
  assert.equal(sourceReads, 1);

  const reconstructed = await resource.Ready();
  assert.deepEqual(reconstructed, { revision: 2 });
  assert.equal(resMan.Lookup(path), resource);
  assert.equal(resource.GetPayload(), reconstructed);
  assert.equal(resource.object, reconstructed);
  assert.equal(sourceReads, 2);

  time = 20;
  const identitySweep = resMan.PurgeInactive({ time, maxIdleMilliseconds: 1 });
  assert.equal(identitySweep.purged, 1);
  assert.equal(resource.IsPurged(), true);
  assert.equal(resource.object, null);

  const replacementObject = await resource.Ready();
  const replacement = resMan.Lookup(path);
  assert.notEqual(replacement, resource);
  assert.deepEqual(replacementObject, { revision: 3 });
  assert.equal(resource.IsPurged(), true);
  assert.equal(resource.object, null);
  assert.equal(replacement.object, replacementObject);
  assert.equal(sourceReads, 3);
});

test("failed object operations are removed so explicit retry can succeed", async () =>
{
  let attempts = 0;
  const path = "res:/data/retry.json";
  const resMan = new CjsResMan({
    source: {
      Read()
      {
        attempts += 1;
        if (attempts === 1) throw new Error("expected source failure");
        return "{\"recovered\":true}";
      }
    }
  });
  resMan.RegisterObjectLoader("json", value => JSON.parse(value));

  await assert.rejects(resMan.GetObject(path), /expected source failure/u);
  const resource = resMan.Lookup(path);
  assert.equal(resource.IsFailed(), true);

  const recovered = await resource.Ready();
  assert.deepEqual(recovered, { recovered: true });
  assert.equal(attempts, 2);
  assert.equal(resource.state, CjsResource.State.PREPARED);
  assert.equal(resource.error, null);
  assert.equal(resource.GetPayload(), recovered);
  assert.equal(resource.object, recovered);
});

test("reload replaces retained source and format results for later reconstruction", async () =>
{
  let revision = 1;
  let sourceReads = 0;
  let formatReads = 0;
  const source = {
    Read()
    {
      sourceReads += 1;
      return new Uint8Array([ revision ]);
    }
  };

  class CjsReloadCacheFormat
  {
    static inputTypes = [ "reloadcache" ];
    static outputTypes = [ "raw" ];

    static read(bytes)
    {
      formatReads += 1;
      return { revision: bytes[0] };
    }
  }

  const path = "res:/data/value.reloadcache";
  const resMan = new CjsResMan({ source }).RegisterFormat(CjsReloadCacheFormat);
  const firstObject = await resMan.GetObject(path, {
    emit: "raw",
    sourceRevision: "r1",
    cacheSource: true,
    cacheFormat: true
  });
  const firstResource = resMan.Lookup(path, { emit: "raw" });
  assert.deepEqual(firstObject, { revision: 1 });

  revision = 2;
  const replacementObject = await resMan.ReloadObject(path, {
    emit: "raw",
    sourceRevision: "r2",
    cacheSource: true,
    cacheFormat: true
  });
  const replacement = resMan.Lookup(path, { emit: "raw" });
  assert.deepEqual(replacementObject, { revision: 2 });
  assert.notEqual(replacement, firstResource);
  assert.equal(firstResource.HasPayload(), false);
  assert.equal(firstResource.object, null);
  assert.equal(sourceReads, 2);
  assert.equal(formatReads, 2);

  replacement.ReleasePayload();
  assert.equal(replacement.object, null);
  assert.equal(await replacement.Ready(), replacementObject);
  assert.equal(sourceReads, 2);
  assert.equal(formatReads, 2);
});

test("ReloadResource consumes freshness once and returns the committed canonical handle", async () =>
{
  let revision = 1;
  let sourceReads = 0;
  const source = {
    Read()
    {
      sourceReads += 1;
      return `{"revision":${revision}}`;
    }
  };
  const path = "res:/data/fetch-reload.json";
  const resMan = new CjsResMan({ source });
  resMan.RegisterObjectLoader("json", value => JSON.parse(value));

  const first = await resMan.FetchResource(path);
  revision = 2;
  const replacement = await resMan.ReloadResource(path);

  assert.notEqual(replacement, first);
  assert.equal(replacement, resMan.Lookup(path));
  assert.deepEqual(replacement.GetPayload(), { revision: 2 });
  assert.equal(sourceReads, 2);
});

test("reload candidates retain the source selected before delayed readiness", async () =>
{
  let sourceAReads = 0;
  let sourceBReads = 0;
  const sourceA = { Read() { sourceAReads += 1; return `{"source":"a","read":${sourceAReads}}`; } };
  const sourceB = { Read() { sourceBReads += 1; return `{"source":"b","read":${sourceBReads}}`; } };
  const path = "res:/data/delayed-reload-source.json";
  const resMan = new CjsResMan({ source: sourceA });
  resMan.RegisterObjectLoader("json", value => JSON.parse(value));

  await resMan.FetchResource(path);
  const candidate = resMan.GetResource(path, { reload: true });
  resMan.SetSource(sourceB);

  assert.deepEqual(await candidate.Ready(), { source: "a", read: 2 });
  candidate.ReleasePayload();
  assert.deepEqual(await candidate.Ready(), { source: "a", read: 3 });
  assert.equal(sourceAReads, 3);
  assert.equal(sourceBReads, 0);
});

test("ReloadResource invalidates retained reads before creating a first canonical owner", async () =>
{
  let revision = 1;
  let sourceReads = 0;
  const source = {
    Read()
    {
      sourceReads += 1;
      return `{"revision":${revision}}`;
    }
  };
  const path = "res:/data/initial-reload.json";
  const resMan = new CjsResMan({ source });
  resMan.RegisterObjectLoader("json", value => JSON.parse(value));

  assert.equal(await resMan.ReadResource(path, { cacheSource: true }), "{\"revision\":1}");
  revision = 2;
  const resource = await resMan.ReloadResource(path, { cacheSource: true });

  assert.equal(resource, resMan.Lookup(path));
  assert.deepEqual(resource.GetPayload(), { revision: 2 });
  assert.equal(sourceReads, 2);
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

  class CjsRevisionCacheFormat
  {
    static inputTypes = [ "revisioncache" ];
    static outputTypes = [ "raw" ];

    static read(bytes)
    {
      formatReads += 1;
      return { revision: bytes[0] };
    }
  }

  const path = "res:/data/value.revisioncache";
  const resMan = new CjsResMan({ source }).RegisterFormat(CjsRevisionCacheFormat);
  const revisionOneA = await resMan.GetObject(path, {
    variant: "revision-one-a",
    requirement: "one-a",
    emit: "raw",
    sourceRevision: 1,
    cacheSource: true,
    cacheFormat: true
  });
  const revisionOneB = await resMan.GetObject(path, {
    variant: "revision-one-b",
    requirement: "one-b",
    emit: "raw",
    sourceRevision: 1
  });
  const revisionTwo = await resMan.GetObject(path, {
    variant: "revision-two",
    requirement: "two",
    emit: "raw",
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

  class CjsDescriptorCacheFormat
  {
    static inputTypes = [ "descriptorcache" ];
    static outputTypes = [ "raw" ];

    static read(bytes, options)
    {
      formatReads += 1;
      return { value: bytes[0] * options.multiplier, formatRead: formatReads };
    }
  }

  const path = "res:/data/value.descriptorcache";
  const resMan = new CjsResMan({ source: sourceA })
    .RegisterFormat(CjsDescriptorCacheFormat, { multiplier: 1 });
  const fromA = await resMan.GetObject(path, {
    variant: "source-a",
    source: sourceA,
    requirement: "source-a",
    emit: "raw",
    sourceRevision: 1,
    cacheSource: true,
    cacheFormat: true
  });
  const fromB = await resMan.GetObject(path, {
    variant: "source-b",
    source: sourceB,
    requirement: "source-b",
    emit: "raw",
    sourceRevision: 1,
    cacheSource: true,
    cacheFormat: true
  });
  assert.deepEqual(fromA, { value: 2, formatRead: 1 });
  assert.deepEqual(fromB, { value: 7, formatRead: 2 });

  resMan.RegisterFormat(CjsDescriptorCacheFormat, { multiplier: 3 });
  const reregistered = await resMan.GetObject(path, {
    variant: "descriptor-v2",
    source: sourceA,
    requirement: "descriptor-v2",
    emit: "raw",
    sourceRevision: 1,
    cacheFormat: true
  });
  const bypassed = await resMan.GetObject(path, {
    variant: "descriptor-bypass",
    source: sourceA,
    requirement: "descriptor-bypass",
    emit: "raw",
    sourceRevision: 1,
    cacheFormat: false
  });
  const retained = await resMan.GetObject(path, {
    variant: "descriptor-v2",
    source: sourceA,
    requirement: "descriptor-retained",
    emit: "raw",
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

  class CjsClassIdentityFormat
  {
    static inputTypes = [ "classidentity" ];
    static outputTypes = [ "raw" ];

    static read(bytes, options)
    {
      formatReads += 1;
      return { Constructor: options.classes.Root, byte: bytes[0] };
    }
  }

  const path = "res:/data/classes.classidentity";
  const resMan = new CjsResMan({ source }).RegisterFormat(CjsClassIdentityFormat);
  const first = await resMan.GetObject(path, {
    variant: "class-a",
    requirement: "class-a",
    emit: "raw",
    classes: { Root: ClassA },
    sourceRevision: 1,
    cacheSource: true,
    cacheFormat: true
  });
  const second = await resMan.GetObject(path, {
    variant: "class-b",
    requirement: "class-b",
    emit: "raw",
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

  class CjsNonCanonicalCacheFormat
  {
    static inputTypes = [ "noncanonical" ];
    static outputTypes = [ "raw" ];

    static read(bytes)
    {
      formatReads += 1;
      return { byte: bytes[0], formatRead: formatReads };
    }
  }

  const path = "res:/data/options.noncanonical";
  const formatOptions = { timestamp: new Date(0) };
  const resMan = new CjsResMan({ source }).RegisterFormat(CjsNonCanonicalCacheFormat);
  const first = await resMan.GetObject(path, {
    variant: "noncanonical-a",
    requirement: "noncanonical-a",
    emit: "raw",
    formatOptions,
    sourceRevision: 1,
    cacheSource: true,
    cacheFormat: true
  });
  const second = await resMan.GetObject(path, {
    variant: "noncanonical-b",
    requirement: "noncanonical-b",
    emit: "raw",
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

  class CjsDefaultSnapshotFormat
  {
    static inputTypes = [ "defaultsnapshot" ];
    static outputTypes = [ "raw" ];

    static read(bytes, options)
    {
      return bytes[0] * options.transform.multiplier
        + options.offsets[0]
        + options.offsets[1].value;
    }
  }

  const path = "res:/data/defaults.defaultsnapshot";
  const resMan = new CjsResMan({
    source: { Read() { return new Uint8Array([ 4 ]); } }
  }).RegisterFormat(CjsDefaultSnapshotFormat, defaults);
  defaults.transform.multiplier = 20;
  defaults.offsets[0] = 10;
  defaults.offsets[1].value = 30;

  const descriptor = resMan.GetFormatDescriptors("defaultsnapshot")[0];
  assert.equal(Object.isFrozen(descriptor.defaults), true);
  assert.equal(Object.isFrozen(descriptor.defaults.transform), true);
  assert.equal(Object.isFrozen(descriptor.defaults.offsets), true);
  assert.equal(Object.isFrozen(descriptor.defaults.offsets[1]), true);
  assert.equal(await resMan.GetObject(path, { emit: "raw" }), 12);
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
  const resMan = new CjsResMan({ source });
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
  const resMan = new CjsResMan({ source });
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

  class CjsLateFormatCache
  {
    static inputTypes = [ "lateformat" ];
    static outputTypes = [ "raw" ];

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
  const resMan = new CjsResMan({ source }).RegisterFormat(CjsLateFormatCache);
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
  const resMan = new CjsResMan({ source });
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
  const resMan = new CjsResMan({ source: originalSource });
  resMan.RegisterObjectLoader("json", value => JSON.parse(value));
  const path = "res:/data/provenance.json";
  const resource = resMan.GetResource(path, {
    sourceRevision: "original-v1"
  });
  await resource.Ready({ cacheSource: true });
  assert.equal(originalReads, 1);
  resMan.SetSource(laterDefaultSource);
  assert.equal(resMan.InvalidateReadCache(path, {
    source: originalSource,
    sourceRevision: "original-v1"
  }).source, 1);

  resource.ReleasePayload();
  assert.deepEqual(
    await resMan.GetObject(path, {
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

test("semantic resource readiness resolves the resource and retains its plain payload", async () =>
{
  const bytes = new Uint8Array([ 4, 3, 2, 1 ]);
  class CjsTestFormat
  {
    static inputTypes = [ "semantic" ];
    static outputTypes = [ "semantic" ];
    static read(input) { return { payloadType: "semantic", data: input }; }
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
  assert.equal(resource.GetPayload().data, bytes);
  assert.equal(resource.ReleasePayload(), resource);
  assert.equal(resource.HasPayload(), false);
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

// LOD selection and the primitive-count sum belong to the geometry resource
// (Carbon declares both beside TriGeometryRes); the mesh draw path in
// runtime-trinity consumes them to complete a batch's draw arguments.
test("TriGeometryRes selects a LOD by screen size, lowest quality first", () => {
  const geometry = new TriGeometryRes().Initialize("res:/geometry/ship.gr2");
  geometry.SetPayload({
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
  assert.equal(geometry.GetMeshLod(0, 20).maxScreenSize, 50);
  assert.equal(geometry.GetMeshLod(0, 900).maxScreenSize, 1000);
  assert.equal(geometry.GetLodIndexForScreenSize(9, 10), -1, "no such mesh");
  assert.equal(geometry.GetMeshLod(9, 10), null);

  geometry.forceLod = true;
  geometry.forcedLodIndex = 1;
  assert.equal(geometry.GetLodIndexForScreenSize(0, 99999), 1, "forceLod pins the index");
  geometry.forcedLodIndex = 99;
  assert.equal(geometry.GetLodIndexForScreenSize(0, 10), 2, "clamped to the last LOD");
});

test("TriGeometryRes treats a flattened single-LOD mesh as its own LOD", () => {
  const geometry = new TriGeometryRes().Initialize("res:/geometry/rock.cmf");
  geometry.SetPayload({
    version: 1,
    sourceFormat: "cmf",
    meshes: [ { name: "rock", areas: [ { firstIndex: 0, primitiveCount: 12 } ] } ]
  });

  assert.equal(geometry.GetMeshLod(0, 100)?.name, "rock");
  assert.equal(geometry.GetMeshLodByIndex(0, 1), null, "there is only one");
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
  const geometry = new TriGeometryRes().Initialize("res:/geometry/ship.cmf");

  // The CMF reader names this `decl`, after the CMF struct field.
  geometry.SetPayload({
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
