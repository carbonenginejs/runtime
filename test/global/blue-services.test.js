import assert from "node:assert/strict";
import test from "node:test";
import { blue, CjsBlue, CjsBlueOS, CjsBlueResMan, CjsBlueClasses, CjsBluePaths } from "../../npm/dist/global/blue/index.js";
import { installBlueServices } from "../../npm/dist/global/blue/blue.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { CjsLibrary } from "../../npm/dist/core/CjsLibrary.js";
import { CjsWwiseSoundEngineStub } from "../../npm/dist/global/audio/CjsWwiseSoundEngineStub.js";
import { AudGameObjResource } from "../../npm/dist/audio/trinity/audio/AudGameObjResource.js";

test("CjsBlue owns inert defaults with explicit donor identities and shared registries", () =>
{
  const value = new CjsBlue();
  assert.equal(value.resMan.constructor, CjsBlueResMan);
  assert.equal(value.classes.constructor, CjsBlueClasses);
  assert.equal(value.paths.constructor, CjsBluePaths);
  assert.equal(value.os.constructor, CjsBlueOS);
  assert.equal(value.enums, blue.enums);
  assert.equal(value.sof, null);
  assert.equal(value.audio.constructor, CjsWwiseSoundEngineStub);
  assert.equal(value.audio._initialized, false);
  assert.equal(value.os.IsRegisteredForTicks(value.resMan), false);
  assert.equal(value.os.GetInfo().pumpTicksTotal, 0);
  assert.equal(value.resMan.workerLoader.worker, null);
  assert.equal(value.resMan.GetPendingLoads(), 0);
  assert.equal(CjsSchema.getSchema(CjsBlueResMan).carbon, "BlueResMan");
  assert.equal(CjsSchema.getSchema(CjsBlueClasses).carbon, "BlueClasses");
});

test("Blue Fetch routes DNA and resource schemes without changing options or results", async () =>
{
  const value = new CjsBlue(), options = {privateOption: {}}, result = {};
  const calls = [];
  value.resMan = {Fetch(input, received) { calls.push(["resource", input, received]); return result; }};
  await assert.rejects(value.Fetch("hull:faction:race"), /SOF is not configured/);
  value.sof = {Fetch(input, received) { calls.push(["sof", input, received]); return result; }};
  for (const dna of ["chjita:caldarinavy:caldari", "mdeha01:deathless:deathless:layout?deathless_hangar"])
  {
    assert.equal(await value.Fetch(dna, options), result);
    assert.deepEqual(calls.pop(), ["sof", dna, options]);
  }
  for (const resource of ["res:/thing:black:part", "dynamic:/inspacevideos:a:b", "http://localhost:5510/a:b", "res:\\thing:a:b", "hull:faction", {path: "res:/x.black"}])
  {
    assert.equal(await value.Fetch(resource, options), result);
    assert.deepEqual(calls.pop(), ["resource", resource, options]);
  }
  const failure = new Error("provider failure");
  value.sof = {Fetch() { throw failure; }};
  await assert.rejects(value.Fetch("a:b:c"), error => error === failure);
});

test("first startup activates unchanged defaults and exact restoration returns them to inert", () =>
{
  const before = installBlueServices({}, false);
  try
  {
    const previous = installBlueServices();
    assert.equal(previous.running, false);
    assert.equal(blue.os.IsRegisteredForTicks(blue.resMan), true);
    const active = installBlueServices(previous, previous.running);
    assert.equal(active.running, true);
    assert.equal(blue.os.IsRegisteredForTicks(blue.resMan), false);
  }
  finally { installBlueServices(before, before.running); }
});

test("SOF/audio installation validates atomically and graph audio follows the same slot", t =>
{
  const snapshot = installBlueServices({}, true);
  t.after(() => installBlueServices(snapshot, snapshot.running));
  const register = t.mock.method(blue.os, "RegisterForTicks");
  const unregister = t.mock.method(blue.os, "UnregisterForTicks");
  const oldSof = blue.sof, oldAudio = blue.audio;
  assert.throws(() => installBlueServices({sof: {Fetch() {}}, audio: null}), TypeError);
  assert.equal(blue.sof, oldSof);
  assert.equal(blue.audio, oldAudio);
  const audio = new CjsWwiseSoundEngineStub(), sof = {Fetch: () => "built"};
  t.mock.method(audio, "Init", () => assert.fail("installation must not initialize playback"));
  installBlueServices({sof, audio});
  assert.equal(blue.sof, sof);
  assert.equal(AudGameObjResource.backend, audio);
  assert.equal(register.mock.callCount(), 0);
  assert.equal(unregister.mock.callCount(), 0);
  AudGameObjResource.backend = null;
  assert.equal(blue.audio.constructor, CjsWwiseSoundEngineStub);
  assert.notEqual(blue.audio, audio);
});

test("CjsLibrary initializes once, rejects a second root and restores borrowed providers", async t =>
{
  const original = {resMan: blue.resMan, paths: blue.paths, os: blue.os, sof: blue.sof, audio: blue.audio};
  const library = new CjsLibrary(), second = new CjsLibrary();
  t.after(() => library.Shutdown());
  t.after(() => second.Shutdown());
  const os = new CjsBlueOS(), audio = new CjsWwiseSoundEngineStub();
  const result = {}, sof = {Fetch: () => result};
  t.mock.method(audio, "Init", () => assert.fail("borrowed audio remains unstarted"));
  const first = library.Initialize({os, sof, audio});
  assert.deepEqual(await Promise.all([first, library.Initialize()]), [library, library]);
  await assert.rejects(second.Initialize(), /already active/);
  assert.equal(os.IsRegisteredForTicks(blue.resMan), true);
  assert.equal(await library.Fetch("a:b:c"), result);
  assert.equal(await library.Initialize(), library);
  await library.Shutdown();
  for (const [key, value] of Object.entries(original)) assert.equal(blue[key], value, key);
  assert.equal(os.IsRegisteredForTicks(original.resMan), false);
  assert.equal(original.os.IsRegisteredForTicks(original.resMan), false);
  assert.equal(audio._initialized, false);
  await second.Initialize({sof});
  await second.Shutdown();
});

test("failed initial tick registration leaves no publication or active-root claim and can retry", async t =>
{
  const library = new CjsLibrary(), os = new CjsBlueOS();
  t.after(() => library.Shutdown());
  const previous = {os: blue.os, sof: blue.sof, audio: blue.audio};
  const originalRegister = os.RegisterForTicks;
  let refuse = true;
  t.mock.method(os, "RegisterForTicks", function(...args)
  {
    originalRegister.apply(this, args);
    if (refuse) throw new Error("registration failed after mutation");
  });
  const sof = {Fetch() {}};
  await assert.rejects(library.Initialize({os, sof}), /registration failed after mutation/);
  assert.equal(os.IsRegisteredForTicks(blue.resMan), false);
  for (const [key, value] of Object.entries(previous)) assert.equal(blue[key], value);
  refuse = false;
  await library.Initialize({os, sof});
  assert.equal(os.IsRegisteredForTicks(blue.resMan), true);
  await library.Shutdown();
  assert.equal(os.IsRegisteredForTicks(blue.resMan), false);
});

test("default SOF installation is deferred and does not fetch its catalog", async t =>
{
  const library = new CjsLibrary();
  t.after(() => library.Shutdown());
  const before = blue.sof;
  t.mock.method(blue.resMan, "Fetch", () => assert.fail("startup must not fetch"));
  await library.Initialize();
  assert.equal(CjsSchema.getClassName(blue.sof.constructor), "EveSOF");
  assert.equal(typeof blue.sof.Fetch, "function");
  await library.Shutdown();
  assert.equal(blue.sof, before);
});

test("provider hook reentry shares startup and preserves the active-root claim", async t =>
{
  const library = new CjsLibrary(), second = new CjsLibrary();
  t.after(() => library.Shutdown());
  t.after(() => second.Shutdown());
  const os = new CjsBlueOS(), sof = {Fetch() {}};
  const register = os.RegisterForTicks;
  let nested = null;
  t.mock.method(os, "RegisterForTicks", function(...args)
  {
    nested = library.Initialize({sof}).then(value => ({value}), error => ({error}));
    return register.apply(this, args);
  });
  await library.Initialize({os, sof});
  assert.deepEqual(await nested, {value: library});
  await assert.rejects(second.Initialize({sof}), /already active/);
  assert.equal(os.IsRegisteredForTicks(blue.resMan), true);
  await library.Shutdown();
  await second.Initialize({sof});
  await second.Shutdown();
});
