import assert from "node:assert/strict";
import test from "node:test";
import { CjsLibrary, DefaultConfiguration } from "../../../npm/dist/core/index.js";
import { blue, CjsBlueResMan, CjsBluePaths, CjsBlueOS, CjsBlueResFileSystemCallback, IBlueDynamicResourceConstructor } from "../../../npm/dist/global/blue/index.js";
import { ImageIO } from "../../../npm/dist/resource/imageio/ImageIO.js";
import { CjsPngFormat } from "../../../npm/dist/resource/formats/png/CjsPngFormat.js";
import { CjsVtaFormat } from "../../../npm/dist/resource/formats/vta/CjsVtaFormat.js";
import { TriSettingsRegistrar } from "../../../npm/dist/trinity/core/TriSettingsRegistrar.js";
import { CreateBlackObjectBuilder } from "../../../npm/dist/global/blue/formats/black/CreateBlackObjectBuilder.js";
import { ReadImageResource } from "../../../npm/dist/trinity/resources/texture/registerTextureResources.js";
import { TriTextureRes } from "../../../npm/dist/trinity/resources/texture/TriTextureRes.js";
import { Tr2EffectRes } from "../../../npm/dist/trinity/shader/Tr2EffectRes.js";
import { GetEffectPathDefaults, SetEffectPathDefaults } from "../../../npm/dist/global/utils/effectPath.js";

/** Isolated real Blue owners; no host loop, fetch or device is started. */
function services()
{
  return { resMan: new CjsBlueResMan(), paths: new CjsBluePaths(), os: new CjsBlueOS(), sof: null };
}

test("LOAD policy remains requested until a fresh resource startup", async t =>
{
  const original = TriTextureRes.compressUncompressedTextures;
  const library = new CjsLibrary({ settings: { compressUncompressedTextures: false } });
  t.after(() => { library.Shutdown(); TriTextureRes.compressUncompressedTextures = original; });
  const owners = services();
  await library.Initialize(owners);
  library.SetConfiguration({ settings: { compressUncompressedTextures: true } });
  assert.equal(TriTextureRes.compressUncompressedTextures, false);
  assert.equal(library.GetConfiguration().requested.settings.compressUncompressedTextures, true);
  assert.equal(library.GetConfiguration().configured.settings.compressUncompressedTextures, false);
  library.Shutdown();
  await library.Initialize(owners);
  assert.equal(TriTextureRes.compressUncompressedTextures, false, "reattaching the same cache is not reboot");
  library.Shutdown();
  await library.Initialize(services());
  assert.equal(TriTextureRes.compressUncompressedTextures, true);
  library.Shutdown();
  await library.Initialize(owners);
  assert.equal(TriTextureRes.compressUncompressedTextures, false, "restore the reused cache's original global LOAD policy");
  assert.equal(library.GetConfiguration().configured.settings.compressUncompressedTextures, false);
  assert.equal(library.GetConfiguration().requested.settings.compressUncompressedTextures, true);
});

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

test("live configuration applies scheduling but defers image-handler policy until reboot", async t =>
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
  library.SetConfiguration({ imageHandlers: { png: CjsVtaFormat }, resMan: { maxConcurrentLoads: 1 } });
  assert.equal(owners.resMan.maxConcurrentLoads, 1, "independent scheduling changes apply immediately");
  assert.equal(library.GetConfiguration().requested.imageHandlers.png, CjsVtaFormat);
  assert.equal(library.GetConfiguration().configured.imageHandlers.png, CjsPngFormat);
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

test("pending reader policies do not call live owners or trigger a reload", async t =>
{
  const owners = services(), library = new CjsLibrary();
  t.after(() => library.Shutdown());
  await library.Initialize(owners);
  const register = t.mock.method(owners.resMan, "RegisterObjectLoader", () => assert.fail("reader policy needs reboot"));
  const purge = t.mock.method(owners.resMan, "Delete", () => assert.fail("no implicit invalidation"));
  const reload = t.mock.method(owners.resMan, "ReloadResource", () => assert.fail("no implicit reload"));
  const loader = bytes => bytes;
  library.SetConfiguration({ objectLoaders: { dds: loader }, extensions: { dds: DefaultConfiguration.extensions.dds } });
  const state = library.GetConfiguration();
  assert.equal(state.requested.objectLoaders.dds, loader);
  assert.equal(state.configured.objectLoaders.dds, ReadImageResource);
  assert.equal(owners.resMan.GetExtensionRoute("dds").loader, ReadImageResource);
  assert.equal(register.mock.callCount(), 0);
  assert.equal(purge.mock.callCount(), 0);
  assert.equal(reload.mock.callCount(), 0);
});

test("partial startup policy failure preserves the cause and successful submissions", async t =>
{
  const owners = services(), first = bytes => bytes, second = bytes => bytes;
  const library = new CjsLibrary({ objectLoaders: { succeeds: first, fails: second } });
  t.after(() => library.Shutdown());
  const original = owners.resMan.RegisterObjectLoader, failure = new Error("after owner mutation");
  t.mock.method(owners.resMan, "RegisterObjectLoader", function(key, value)
  {
    original.call(this, key, value);
    if (key === "fails") throw failure;
  });
  await assert.rejects(library.Initialize(owners), error => error === failure);
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

test("failed initial policy installation can retry on the same resource manager", async t =>
{
  const owners = services(), library = new CjsLibrary();
  t.after(() => library.Shutdown());
  const register = owners.resMan.RegisterObjectBuilder;
  let fail = true;
  t.mock.method(owners.resMan, "RegisterObjectBuilder", function(key, value)
  {
    if (key === "red" && fail) throw new Error("initial policy failure");
    return register.call(this, key, value);
  });
  await assert.rejects(library.Initialize(owners), /initial policy failure/);
  fail = false;
  await library.Initialize(owners);
  assert.equal(owners.resMan.GetObjectLoader("red"), CreateBlackObjectBuilder);
  assert.equal(library.GetConfiguration().configured.objectBuilders.red, CreateBlackObjectBuilder);
});

test("plain provider objects remain borrowed references including readback", async t =>
{
  const source = { value: 1, Read() { return this.value; } };
  const dynamic = new (class extends IBlueDynamicResourceConstructor { value = 2; GetResource() { return this.value; } })();
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

test("deferred reader policy is installed on the next startup with fresh resource owners", async t =>
{
  const owners = services(), library = new CjsLibrary();
  t.after(() => library.Shutdown());
  await library.Initialize(owners);
  let reads = 0;
  const loader = (bytes, context) => { reads++; return ReadImageResource(bytes, context); };
  library.SetConfiguration({ objectLoaders: { dds: loader } });
  assert.equal(owners.resMan.GetObjectLoader("dds"), ReadImageResource);
  await library.Shutdown();

  await library.Initialize(owners);
  assert.equal(owners.resMan.GetObjectLoader("dds"), ReadImageResource, "reattaching the same cache is not reboot");
  assert.equal(library.GetConfiguration().requested.objectLoaders.dds, loader);
  assert.equal(library.GetConfiguration().configured.objectLoaders.dds, ReadImageResource);
  await library.Shutdown();

  const next = services();
  await library.Initialize(next);
  assert.equal(next.resMan.GetExtensionRoute("dds").loader, loader);
  assert.equal(library.GetConfiguration().configured.objectLoaders.dds, loader);
  const bytes = new Uint8Array(132), header = new DataView(bytes.buffer);
  for (const [offset, value] of [[0,0x20534444],[4,124],[8,0x1007],[12,1],[16,1],[28,1],
    [76,32],[80,0x41],[88,32],[92,0xff0000],[96,0xff00],[100,0xff],[104,0xff000000],[108,0x1000]])
    header.setUint32(offset, value, true);
  bytes.set([1,2,3,255],128);
  library.SetConfiguration({resMan:{source:{Read:()=>bytes}}});
  const resource = await next.resMan.LoadObject("res:/configured.dds");
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

test("installed reader policy follows the resource owner across wrappers and owner switches", async t =>
{
  const firstOwners = services(), secondOwners = services();
  const first = new CjsLibrary(), loader = bytes => bytes;
  const second = new CjsLibrary({ objectLoaders: { dds: loader } });
  t.after(() => first.Shutdown());
  t.after(() => second.Shutdown());
  await first.Initialize(firstOwners);
  await first.Shutdown();

  await second.Initialize(firstOwners);
  assert.equal(firstOwners.resMan.GetObjectLoader("dds"), ReadImageResource);
  assert.equal(second.GetConfiguration().requested.objectLoaders.dds, loader);
  assert.equal(second.GetConfiguration().configured.objectLoaders.dds, ReadImageResource);
  await second.Shutdown();

  await second.Initialize(secondOwners);
  assert.equal(secondOwners.resMan.GetObjectLoader("dds"), loader);
  await second.Shutdown();
  await second.Initialize(firstOwners);
  assert.equal(firstOwners.resMan.GetObjectLoader("dds"), ReadImageResource);
  assert.equal(second.GetConfiguration().configured.objectLoaders.dds, ReadImageResource);
});

test("effects commit the source tree, target and translator once, at startup", async t =>
{
  const translator = { buildEffect() {} };
  assert.throws(() => new CjsLibrary({ effects: { source: "dx 11" } }), /effects\.source/u);
  assert.throws(() => new CjsLibrary({ effects: { translator: {} } }), /effects\.translator/u);
  assert.throws(() => new CjsLibrary({ effects: { unknown: 1 } }), /effects\.unknown/u);

  const library = new CjsLibrary({ effects: { source: "dx11", target: "webgpu", translator, shaderModel: "depth" } });
  t.after(() => { library.Shutdown(); SetEffectPathDefaults(null); });
  assert.equal(library.GetConfiguration().requested.effects.translator, translator, "the translator stays a reference");
  assert.equal(Tr2EffectRes.GetBackend(), null, "construction commits nothing");

  await library.Initialize(services());
  assert.deepEqual(Tr2EffectRes.GetBackend(), { source: "dx11", target: "webgpu", translator, permutations: "onDemand" });
  assert.deepEqual(GetEffectPathDefaults(), { platformName: "dx11", shaderModel: "depth" });

  library.SetConfiguration({ effects: { target: "webgl2" } });
  assert.equal(Tr2EffectRes.GetBackend().target, "webgpu", "effects change only at a reboot");
});
