import assert from "node:assert/strict";
import test from "node:test";
import { CjsLibrary, DefaultConfiguration } from "../../../npm/dist/core/index.js";
import { blue, CjsBlueResMan, CjsBluePaths, CjsBlueOS, CjsBlueResFileSystemCallback } from "../../../npm/dist/global/blue/index.js";
import { ImageIO } from "../../../npm/dist/resource/imageio/ImageIO.js";
import { CjsPngFormat } from "../../../npm/dist/resource/formats/png/CjsPngFormat.js";
import { CjsVtaFormat } from "../../../npm/dist/resource/formats/vta/CjsVtaFormat.js";
import { TriSettingsRegistrar } from "../../../npm/dist/trinity/core/TriSettingsRegistrar.js";
import { CreateBlackObjectBuilder } from "../../../npm/dist/resource/object/registerObjectResources.js";
import { ReadImageResource } from "../../../npm/dist/resource/texture/registerTextureResources.js";

/** Isolated real Blue owners; no host loop, fetch or device is started. */
function services()
{
  return { resMan: new CjsBlueResMan(), paths: new CjsBluePaths(), os: new CjsBlueOS(), sof: null };
}

test("construction is inert and entry overrides preserve classes without deep merging", t =>
{
  const before = ImageIO._imageHandlers.slice();
  const register = t.mock.method(blue.resMan, "Register", () => assert.fail("construction must not register"));
  const library = new CjsLibrary({ backends: { webgpu: { requiredFeatures: ["a"], limits: { x: 1 } } } });
  library.SetConfiguration({ backends: { webgpu: { limits: { y: 2 } }, webgl: {} } });
  const state = library.GetConfiguration();
  assert.deepEqual(state.requested.backends.webgpu, { limits: { y: 2 } });
  assert.equal(state.requested.formats.png, CjsPngFormat);
  assert.equal(state.requested.objectLoaders.dds, ReadImageResource);
  assert.deepEqual(state.configured, {});
  assert.equal(state.initialized, false);
  assert.equal(state.owners, null);
  assert.equal(register.mock.callCount(), 0);
  assert.deepEqual(ImageIO._imageHandlers, before);
  state.requested.backends.webgpu.limits.y = 99;
  assert.equal(library.GetConfiguration().requested.backends.webgpu.limits.y, 2);
  assert.throws(() => library.SetConfiguration({ imageHandlers: null }), /reset/);
  assert.throws(() => library.SetConfiguration({ unexpected: {} }), /Unsupported/);
});

test("Initialize configures the chosen owners and preserves loader and geometry routes", async t =>
{
  const owners = services(), original = blue.resMan;
  const library = new CjsLibrary({ resMan: { maxConcurrentLoads: 3 }, paths: {
    content: new CjsBlueResFileSystemCallback(() => new Uint8Array())
  }, backends: { webgpu: { requiredFeatures: [] } } });
  t.after(() => library.Shutdown());
  const oldRegister = t.mock.method(original, "Register", () => assert.fail("wrong resource manager"));
  await library.Initialize(owners);
  assert.equal(oldRegister.mock.callCount(), 0);
  assert.equal(owners.resMan.maxConcurrentLoads, 3);
  assert.equal(owners.resMan.GetExtensionRoute("dds").loader, ReadImageResource);
  assert.deepEqual(owners.resMan.GetExtensionRoute("gr2").formats[0].defaults, { emit: "json", rebuildMissingBounds: true });
  assert.equal(owners.resMan.GetObjectLoader("red"), CreateBlackObjectBuilder);
  assert.equal(owners.resMan.GetObjectLoader("black"), CreateBlackObjectBuilder);
  assert.throws(() => owners.resMan.GetObjectLoader("red")(new Uint8Array(), { path: "a.red" }), /not a compiled/);
  const state = library.GetConfiguration();
  assert.equal(state.owners.resMan, owners.resMan);
  assert.equal(state.owners.paths, owners.paths);
  assert.equal(state.configured.backends, undefined, "backend request is not a running device");
  assert.equal(owners.paths.IsFileSystemRegistered(state.requested.paths.content), true);
  assert.equal(owners.os.IsRegisteredForTicks(owners.resMan), true);
  assert.equal(owners.os.GetInfo().pumpTicksTotal, 0, "registration does not pump resource work");
});

test("live configuration applies only supplied entries and keeps owner append semantics", async t =>
{
  const owners = services(), library = new CjsLibrary();
  t.after(() => library.Shutdown());
  await library.Initialize(owners);
  const register = t.mock.method(owners.resMan, "Register");
  const count = ImageIO._imageHandlers.filter(value => value === CjsPngFormat).length;
  library.SetConfiguration({ imageHandlers: { png: CjsPngFormat }, resMan: { maxPrepareItemsPerTick: 7 } });
  assert.equal(register.mock.callCount(), 1);
  assert.deepEqual(register.mock.calls[0].arguments, [{ maxPrepareItemsPerTick: 7 }]);
  assert.equal(ImageIO._imageHandlers.filter(value => value === CjsPngFormat).length, count);
  assert.throws(() => library.SetConfiguration({ imageHandlers: { png: CjsVtaFormat }, resMan: { maxConcurrentLoads: 1 } }), /append, not replacement/);
  assert.equal(owners.resMan.maxConcurrentLoads, 8, "whole patch validates before owner calls");
  assert.equal(library.GetConfiguration().requested.imageHandlers.png, CjsPngFormat);
  assert.equal(ImageIO.getImageHandler("png"), CjsPngFormat);
  await library.Shutdown();
  assert.equal(ImageIO.getImageHandler("png"), CjsPngFormat, "Shutdown does not undo global registration");
});

test("settings record configured values without claiming CREATE activation and prevalidate patches", async t =>
{
  const registry = TriSettingsRegistrar.getSettings();
  const owner = { value: 1 };
  registry.RegisterSetting("configurationTest", owner, "value", { applies: "create" });
  const library = new CjsLibrary({ settings: { configurationTest: 2 } });
  t.after(() => library.Shutdown());
  await library.Initialize(services());
  assert.equal(owner.value, 2);
  assert.equal(library.GetConfiguration().configured.settings.configurationTest, 2);
  assert.equal(registry.FindSetting("configurationTest").applies, "create");
  assert.throws(() => library.SetConfiguration({ settings: { configurationTest: 3, missingConfigurationTest: 1 } }), /not registered/);
  assert.equal(owner.value, 2);
});

test("partial owner failure preserves cause and only known successful submissions", async t =>
{
  const owners = services(), library = new CjsLibrary();
  t.after(() => library.Shutdown());
  await library.Initialize(owners);
  const original = owners.resMan.RegisterObjectLoader, failure = new Error("after owner mutation");
  t.mock.method(owners.resMan, "RegisterObjectLoader", function(key, value)
  {
    original.call(this, key, value);
    if (key === "fails") throw failure;
  });
  const first = bytes => bytes, second = bytes => bytes;
  assert.throws(() => library.SetConfiguration({ objectLoaders: { succeeds: first, fails: second } }), error => error === failure);
  const state = library.GetConfiguration();
  assert.equal(state.requested.objectLoaders.fails, second);
  assert.equal(state.configured.objectLoaders.succeeds, first);
  assert.equal(state.configured.objectLoaders.fails, undefined);
  assert.equal(state.failure.error, failure);
  assert.equal(owners.resMan.GetObjectLoader("fails"), second, "no rollback claim after a mutating failure");
});

test("failed initialization restores service references, retains registration evidence and allows another root", async t =>
{
  const owners = services(), original = blue.resMan, failure = new Error("initial registration failure");
  const library = new CjsLibrary(), other = new CjsLibrary();
  t.after(() => library.Shutdown());
  t.after(() => other.Shutdown());
  const register = owners.resMan.RegisterObjectBuilder;
  t.mock.method(owners.resMan, "RegisterObjectBuilder", function(key, value)
  {
    if (key === "red") throw failure;
    return register.call(this, key, value);
  });
  await assert.rejects(library.Initialize(owners), error => error === failure);
  assert.equal(blue.resMan, original);
  assert.equal(owners.os.IsRegisteredForTicks(owners.resMan), false);
  assert.equal(library.GetConfiguration().configured.objectBuilders.black, CreateBlackObjectBuilder);
  assert.equal(library.GetConfiguration().initialized, false);
  await other.Initialize(services());
});

test("plain provider objects remain borrowed references including readback", async t =>
{
  const source = { value: 1, Read() { return this.value; } };
  const dynamic = { value: 2, GetResource() { return this.value; } };
  const owners = services(), library = new CjsLibrary({ resMan: { source }, resourceConstructors: { custom: dynamic } });
  t.after(() => library.Shutdown());
  assert.equal(library.GetConfiguration().requested.resMan.source, source);
  await library.Initialize(owners);
  assert.equal(owners.resMan.source, source);
  assert.equal(owners.resMan._dynamicConstructors.get("custom"), dynamic);
  source.value = 5;
  assert.equal(owners.resMan.source.Read(), 5);
  assert.equal(library.GetConfiguration().configured.resMan.source, source);
  assert.equal(library.GetConfiguration().configured.resourceConstructors.custom, dynamic);
});

test("changing an existing loader requires a route submission and future handles capture it", async t =>
{
  const owners = services(), library = new CjsLibrary();
  t.after(() => library.Shutdown());
  await library.Initialize(owners);
  let reads = 0;
  const loader = (bytes, context) => { reads++; return ReadImageResource(bytes, context); };
  assert.throws(() => library.SetConfiguration({ objectLoaders: { dds: loader } }), /corresponding extension route/);
  assert.equal(owners.resMan.GetExtensionRoute("dds").loader, ReadImageResource);
  library.SetConfiguration({ objectLoaders: { dds: loader }, extensions: { dds: DefaultConfiguration.extensions.dds } });
  assert.equal(owners.resMan.GetExtensionRoute("dds").loader, loader);
  assert.equal(owners.resMan.GetObjectLoader("dds"), loader);
  const bytes = new Uint8Array(132), header = new DataView(bytes.buffer);
  for (const [offset, value] of [[0,0x20534444],[4,124],[8,0x1007],[12,1],[16,1],[28,1],
    [76,32],[80,0x41],[88,32],[92,0xff0000],[96,0xff00],[100,0xff],[104,0xff000000],[108,0x1000]])
    header.setUint32(offset, value, true);
  bytes.set([1,2,3,255],128);
  library.SetConfiguration({resMan:{source:{Read:()=>bytes}}});
  const resource = await owners.resMan.LoadObject("res:/configured.dds");
  assert.equal(reads,1);
  assert.equal(resource.GetBitmap().GetWidth(),1);
});

test("reinitializing the same path owner cannot hide an unsupported provider replacement", async t =>
{
  const owners = services(), first = new CjsBlueResFileSystemCallback(() => new Uint8Array()),
    second = new CjsBlueResFileSystemCallback(() => new Uint8Array());
  const library = new CjsLibrary({ paths: { content: first } });
  t.after(() => library.Shutdown());
  await library.Initialize(owners);
  await library.Shutdown();
  library.SetConfiguration({ paths: { content: second } });
  await assert.rejects(library.Initialize(owners), /paths.content: owner supports append/);
  assert.equal(owners.paths.IsFileSystemRegistered(first), true);
  assert.equal(owners.paths.IsFileSystemRegistered(second), false);
  assert.equal(library.GetConfiguration().configured.paths.content, first);
});
