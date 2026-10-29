import assert from "node:assert/strict";
import test from "node:test";
import {CjsAudioBufferRes, CjsAudioRes} from "../../../npm/dist/audio/resources/index.js";
import {CjsAudioBufferRes as RootBuffer, CjsAudioRes as RootAudio} from "../../../npm/dist/audio/index.js";
import {blue, CjsBlueResMan} from "../../../npm/dist/global/blue/index.js";

/** Load a physical owner through the same configured route a host supplies. */
async function backingFor(t, bytes)
{
  const previous = blue.resMan;
  const manager = new CjsBlueResMan({source: {Read: () => new Uint8Array(bytes)}});
  blue.resMan = manager;
  t.after(() => { try { manager.Clear(); } finally { blue.resMan = previous; } });
  manager.RegisterObjectLoader("bin", data => data);
  manager.RegisterExtension("bin", CjsAudioBufferRes);
  const backing = await manager.FetchResource("res:/audio/source.bin");
  return {manager, backing};
}

/** Bind and initialize one logical file while its physical source stays shared. */
async function audioFile(manager, backing, values)
{
  const resource = new CjsAudioRes({...values, backing});
  resource.Initialize(values.info.path || "aud:/" + values.info.id + ".wem", "");
  manager.motherLode.Insert(resource.GetPath(), resource);
  await manager.Ready(resource);
  return resource;
}

test("audio resources are canonical audio exports", () =>
{
  assert.equal(RootBuffer, CjsAudioBufferRes);
  assert.equal(RootAudio, CjsAudioRes);
});

test("a logical audio resource loads its shared backing and returns detached complete-file bytes", async t =>
{
  const {manager, backing} = await backingFor(t, [10, 20, 30, 40]);
  const resource = await audioFile(manager, backing, {info: {id: "100", path: "aud:/100.wem"}});
  const result = await resource.GetBytes();
  assert.deepEqual(Array.from(new Uint8Array(result.bytes)), [10, 20, 30, 40]);
  assert.equal(result.id, "100");
  assert.equal(result.path, "aud:/100.wem");
  assert.equal(result.offset, 0);
  assert.equal(result.byteLength, 4);
  assert.equal(result.totalByteLength, 4);
  assert.equal(result.complete, true);
  assert.equal(resource.GetBackingResource(), backing);
  assert.equal(resource.GetSourceOffset(), 0);
  assert.equal(resource.GetByteLength(), null);
  assert.equal(manager.motherLode.GetStats().locked, 0);
  new Uint8Array(result.bytes)[0] = 99;
  assert.equal((await backing.GetByteView())[0], 10);
});

test("a bank member copies only the requested window and balances child and backing locks", async t =>
{
  const {manager, backing} = await backingFor(t, [0, 1, 2, 3, 4, 5, 6, 7]);
  const resource = await audioFile(manager, backing, {info: {id: "200", sourcePath: "res:/audio/source.bnk"}, offset: 2, byteLength: 4});
  resource.Lock();
  assert.equal(manager.motherLode.GetStats().locked, 2);
  const result = await resource.GetBytes({offset: 1, byteLength: 2});
  assert.deepEqual(Array.from(new Uint8Array(result.bytes)), [3, 4]);
  assert.equal(result.offset, 1);
  assert.equal(result.byteLength, 2);
  assert.equal(result.totalByteLength, 4);
  assert.equal(result.complete, false);
  assert.equal(resource.GetSourceOffset(), 2);
  assert.equal(resource.GetByteLength(), 4);
  assert.equal(manager.motherLode.GetStats().locked, 2, "the caller's outer pin is retained");
  resource.Unlock();
  assert.equal(manager.motherLode.GetStats().locked, 0);
  assert.equal("_bytes" in resource, false, "the logical file retains no second bank view");
});

test("invalid audio windows and ranges release their locks on rejection", async t =>
{
  const {manager, backing} = await backingFor(t, [1, 2, 3]);
  const invalid = await audioFile(manager, backing, {info: {id: "300"}, offset: 2, byteLength: 2});
  const valid = await audioFile(manager, backing, {info: {id: "301"}, byteLength: 3});
  await assert.rejects(invalid.GetBytes(), {code: "CJS_AUDIO_SOURCE_WINDOW_INVALID"});
  await assert.rejects(valid.GetBytes({offset: 2, byteLength: 2}), RangeError);
  assert.equal(manager.motherLode.GetStats().locked, 0);
});

test("explicit physical reload refills the same audio owner", async t =>
{
  const {manager, backing} = await backingFor(t, [1, 2]);
  const before = await backing.GetByteView();
  const after = await backing.GetByteView({reload: true});
  assert.notEqual(after, before);
  assert.deepEqual(after, before);
  assert.equal(manager.Lookup(backing.GetPath()), backing);
  assert.equal(manager.motherLode.GetStats().locked, 0);
});
