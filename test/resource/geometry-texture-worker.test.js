import assert from "node:assert/strict";
import test from "node:test";
import { Worker } from "node:worker_threads";
import { CjsBlueResMan, CjsResManWorkerLoader, CjsResManQueue, ResourceRequirement } from "../../npm/dist/global/blue/index.js";
import { CjsGr2Format } from "../../npm/dist/resource/formats/gr2/index.js";
import { CjsDdsFormat } from "../../npm/dist/resource/formats/dds/index.js";
import { RegisterGeometryResources, TriGeometryRes } from "../../npm/dist/resource/geometry/index.js";
import { RegisterTextureResources, TriTextureRes, Tr2ImageRes } from "../../npm/dist/resource/texture/index.js";
import { HostBitmap } from "../../npm/dist/global/imageio/index.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";

function workerLoader(t)
{
  const thread = new Worker(new URL("./fixtures/resource-worker-thread.mjs", import.meta.url));
  const messages = [];
  const adapter = {
    postMessage(message, transfer) { messages.push(message); thread.postMessage(message, transfer); },
    terminate() { void thread.terminate(); }
  };
  thread.on("message", data => adapter.onmessage?.({ data }));
  thread.on("error", error => adapter.onerror?.({ error }));
  const loader = new CjsResManWorkerLoader({ worker: adapter });
  t.after(async () => { loader.Disable(); await thread.terminate(); });
  return { loader, messages, adapter };
}

function grannyBytes()
{
  return CjsGr2Format.writeShared({
    meshes: [{ name: "triangle", vertex: { position: [-2,0,0, 1,0,0, 0,3,0] },
      indices: [{ name: "hull", bytesPerIndex: 2, faces: [0,1,2] }], boneBindings: [], morphTargets: [] }],
    skeletons: [], animations: []
  });
}

function ddsBytes({ compressed = false, cube = false, short = false } = {})
{
  const bytes = new Uint8Array(128 + (short ? 2 : (compressed ? 8 : 64) * (cube ? 6 : 1)));
  const view = new DataView(bytes.buffer);
  for (const [offset,value] of [[0,0x20534444],[4,124],[8,0x1007],[12,4],[16,4],[28,1],[76,32],
    [80,compressed ? 4 : 0x41],[84,compressed ? 0x31545844 : 0],[88,compressed ? 0 : 32],
    [92,255],[96,65280],[100,16711680],[104,4278190080],[108,0x1000],[112,cube ? 0xfe00 : 0]])
    view.setUint32(offset,value,true);
  bytes.fill(73,128);
  return bytes;
}

test("GR2 actual worker matches main decode and queued existing-byte preparation performs no fetch", async t =>
{
  const { loader, messages } = workerLoader(t);
  const bytes = grannyBytes();
  const expected = CjsGr2Format.read(bytes, { emit: "json", rebuildMissingBounds: true });
  const manager = new CjsBlueResMan({ workerLoader: loader });
  RegisterGeometryResources(manager);
  let reads = 0;
  manager.SetSource({ Read() { reads++; throw new Error("existing bytes must not fetch"); } });
  const resource = new TriGeometryRes();
  resource.Initialize("res:/test.gr2", "gr2");
  manager.RegisterFormat(CjsGr2Format, { emit: "json", rebuildMissingBounds: true });
  const original = CjsGr2Format.read;
  CjsGr2Format.read = () => { throw new Error("main-thread GR2 decode must not execute"); };
  try { await manager.PrepareResourceObjectQueued(resource, bytes); }
  finally { CjsGr2Format.read = original; }
  assert.deepEqual(resource.GetGrannyInfo(), expected);
  assert.equal(resource.IsUsingCMF(), false);
  assert.equal(resource.GetMeshCount(), 1);
  assert.equal(reads, 0);
  assert.equal(messages.filter(x => x.operation === "format.read").length, 1);
  assert.ok(bytes.byteLength > 0, "shared source bytes remain attached");
  resource.ReleasePayload();
  assert.equal(resource.GetGrannyInfo(), null);
});

test("registered GR2 route fetches and decodes once for concurrent consumers", async t =>
{
  const {loader,messages} = workerLoader(t);
  let reads = 0;
  const bytes = grannyBytes();
  const manager = new CjsBlueResMan({ workerLoader: loader, source: {Read(){reads++;return bytes;}} });
  RegisterGeometryResources(manager);
  const [first,second] = await Promise.all([manager.FetchResource("res:/same.gr2"),manager.FetchResource("res:/same.gr2")]);
  assert.equal(first,second);
  assert.equal(first.IsUsingCMF(),false);
  assert.equal(reads,1);
  assert.equal(messages.filter(x=>x.operation === "format.read").length,1);
});

test("DDS worker preserves native BC cube and short-file output and resource bitmap identity", async t =>
{
  const {loader} = workerLoader(t);
  for(const options of [{},{compressed:true},{compressed:true,cube:true},{short:true}])
  {
    const bytes = ddsBytes(options);
    const expected = CjsDdsFormat.read(bytes,{emit:"bitmap"});
    const packet = await loader.ReadFormat({Format:CjsDdsFormat},bytes,{emit:"bitmap"});
    assert.deepEqual(packet,expected);
    assert.ok(bytes.byteLength > 0);
    const texture = new TriTextureRes().SetPayload(packet);
    const image = new Tr2ImageRes().SetPayload(packet);
    assert.ok(CjsSchema.cast(texture.GetPayload(),HostBitmap));
    assert.ok(CjsSchema.cast(image.GetPayload(),HostBitmap));
    assert.equal(image.GetPayload().GetArraySize(),options.cube ? 6 : 1);
    assert.deepEqual(image.GetPayload().GetRawData(),packet.data);
    image.GetPayload().GetRawData()[0] ^= 255;
    assert.deepEqual(texture.GetPayload().GetRawData(),packet.data,"mutable image does not corrupt texture or cached decode");
  }
});

test("DDS texture and image routes execute in the worker", async t =>
{
  const {loader,messages} = workerLoader(t);
  const manager = new CjsBlueResMan({workerLoader:loader,source:{Read:()=>ddsBytes()}});
  RegisterTextureResources(manager);
  const texture = await manager.FetchResource("res:/test.dds");
  const image = await manager.FetchResource("res:/test.dds", {requirement:ResourceRequirement.IMAGE});
  assert.ok(CjsSchema.cast(texture,TriTextureRes));
  assert.ok(CjsSchema.cast(image,Tr2ImageRes));
  assert.ok(messages.some(x=>x.operation === "format.read"));
});

test("worker failure, disabled loading and unsupported outputs retain the existing fallback contract", async t =>
{
  const bytes = grannyBytes();
  const expected = CjsGr2Format.read(bytes);
  for(const options of [{enabled:false},{workerFactory(){throw new Error("unavailable");}}])
  {
    const loader = new CjsResManWorkerLoader(options);
    assert.deepEqual(await loader.ReadFormat({Format:CjsGr2Format},bytes),expected);
    assert.equal(loader.GetPendingCount(),0);
  }
  const {loader} = workerLoader(t);
  assert.equal(loader.CanReadFormat({Format:CjsGr2Format},{emit:"cmf"}),false);
  assert.equal(loader.CanReadFormat({Format:CjsGr2Format},{emit:"json",classes:{Root:class Root{}}}),false);
  await assert.rejects(loader.ReadFormat({Format:CjsDdsFormat},new Uint8Array(12),{emit:"bitmap"}),error=>error.code === "CJS_RESOURCE_IMAGE_READ_FAILED");
  await assert.rejects(loader.Execute("format.read",{module:new URL("./absent-worker-format.mjs",import.meta.url).href,input:bytes}),/Cannot find module/);
  assert.deepEqual(await loader.ReadFormat({Format:CjsGr2Format},bytes),expected,"a failed resource does not poison unrelated decoding");
});

test("deleting a resource rejects its late worker result without occupying the main queue", async t =>
{
  const {loader,adapter} = workerLoader(t);
  const manager = new CjsBlueResMan({workerLoader:loader,source:{Read:()=>grannyBytes()}});
  RegisterGeometryResources(manager);
  let received;
  const arrival = new Promise(resolve => {received=resolve;});
  const deliver = adapter.onmessage;
  adapter.onmessage = event => received(event);
  const resource = manager.GetResource("res:/obsolete.gr2");
  const pending = resource.Ready().then(()=>null,error=>error);
  const result = await arrival;
  assert.equal(await manager.QueueTask(CjsResManQueue.MAIN,()=>"responsive").promise,"responsive");
  manager.Delete("res:/obsolete.gr2");
  deliver(result);
  assert.ok(await pending,"stale readiness must reject");
  assert.equal(manager.Lookup("res:/obsolete.gr2"),null);
  assert.equal(resource.GetGrannyInfo(),null,"obsolete result must not attach a Granny graph");
  assert.equal(resource.GetPayload(),null);
});

test("abort settles a worker request and ignores its late response without poisoning later jobs", async t =>
{
  const {loader,adapter} = workerLoader(t);
  let received;
  const arrival = new Promise(resolve => {received=resolve;});
  const deliver = adapter.onmessage;
  adapter.onmessage = event => received(event);
  const controller = new AbortController();
  const bytes = grannyBytes();
  const pending = loader.Execute("format.read",{
    module:CjsGr2Format.worker.module,exportName:"CjsGr2Format",input:bytes,options:{emit:"json"}
  },{signal:controller.signal}).then(()=>null,error=>error);
  const result = await arrival;
  controller.abort();
  assert.equal((await pending).name,"AbortError");
  deliver(result);
  assert.equal(loader.GetPendingCount(),0);
  adapter.onmessage = deliver;
  assert.deepEqual(await loader.ReadFormat({Format:CjsGr2Format},bytes),CjsGr2Format.read(bytes));
});
