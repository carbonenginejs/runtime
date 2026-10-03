import { createDdsBitmap } from "../../npm/dist/resource/texture/ddsBitmap.js";
import assert from "node:assert/strict";
import test from "node:test";
import { Worker } from "node:worker_threads";
import { CjsBlueResMan, CjsResManWorkerLoader, CjsResManQueue, ResourceRequirement } from "../../npm/dist/global/blue/index.js";
import { CjsGr2Format } from "../../npm/dist/resource/formats/gr2/index.js";
import { CjsDdsFormat } from "../../npm/dist/resource/formats/dds/index.js";
import { RegisterGeometryResources, TriGeometryRes } from "../../npm/dist/resource/geometry/index.js";
import { RegisterTextureResources, RegisterTextureArray, TriTextureRes, Tr2ImageRes } from "../../npm/dist/resource/texture/index.js";
import { HostBitmap } from "../../npm/dist/global/imageio/index.js";
import { TextureType } from "../../npm/dist/global/consts/renderContext/index.js";
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
  assert.ok(resource.GetGrannyInfo().meshes[0].vertex.position instanceof Float32Array);
  assert.equal(resource.GetPayload().meshes[0].vertex.position,
    resource.GetGrannyInfo().meshes[0].vertex.position, "publication borrows the transferred vertex storage");
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
    const texture = new TriTextureRes().SetPayload(createDdsBitmap(packet));
    const image = new Tr2ImageRes().SetPayload(createDdsBitmap(packet));
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

test("detail arrays and named texture parameters fetch and decode each cached DDS once", async t =>
{
  const { loader, messages } = workerLoader(t);
  for (const order of [ "parameters-first", "array-first", "concurrent" ])
  {
    const reads = new Map();
    const manager = new CjsBlueResMan({ workerLoader: loader, source: {
      Read(path) { reads.set(path, (reads.get(path) || 0) + 1); return ddsBytes(); }
    } });
    RegisterTextureResources(manager);
    RegisterTextureArray(manager);
    const paths = [ "res:/detail1.dds", "res:/detail2.dds", "res:/detail3.dds" ];
    const start = messages.length;
    const parameters = () => Promise.all(paths.map(path => manager.FetchResource(path, { requirement: ResourceRequirement.TEXTURE })));
    const array = () => manager.GetResource("dynamic:/texturearray/" + paths.join(";")).Ready();
    if (order === "parameters-first") { await parameters(); await array(); }
    else if (order === "array-first") { await array(); await parameters(); }
    else await Promise.all([ parameters(), array() ]);
    await parameters();
    await array();
    assert.deepEqual([ ...reads.values() ], [ 1, 1, 1 ], order);
    assert.equal(messages.slice(start).filter(x => x.operation === "format.read").length, 3, order);
    for (const path of paths)
    {
      assert.equal(manager.Lookup(path, { requirement: ResourceRequirement.IMAGE }), null, "no duplicate raw-image owner");
      assert.equal(manager.Lookup(path, { requirement: ResourceRequirement.TEXTURE }).GetBitmap().GetRawData()[0], 73, "array conversion does not mutate its inputs");
    }
    manager.Clear();
  }
});

test("DDS loader honors the selected source and explicit shared decode policy", async t =>
{
  const { loader, messages } = workerLoader(t);
  let reads = 0;
  const source = { Read() { reads++; return ddsBytes(); } };
  const manager = new CjsBlueResMan({ workerLoader: loader });
  RegisterTextureResources(manager);
  const options = { source, cacheSource: true, cacheFormat: true };
  const [ texture, image ] = await Promise.all([
    manager.FetchResource("res:/shared.dds", options),
    manager.FetchResource("res:/shared.dds", { ...options, requirement: ResourceRequirement.IMAGE })
  ]);
  assert.equal(reads, 1);
  assert.equal(messages.filter(x => x.operation === "format.read").length, 1);
  assert.notEqual(texture.GetBitmap(), image.GetBitmap());
  image.GetBitmap().GetRawData()[0] = 0;
  assert.equal(texture.GetBitmap().GetRawData()[0], 73);
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

test("DDS volume header flag survives worker decoding and texture resource materialization", async t =>
{
  // Carbon IsVolumeTexture (Tr2DdsHandler.cpp:350-352): DDSD_DEPTH is set,
  // while caps2 is zero, as in the shipped aquapuff0 density texture.
  const bytes = new Uint8Array(128 + 24);
  bytes.set(ddsBytes({ compressed: true }).subarray(0, 128));
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 0x00801007, true);
  view.setUint32(24, 3, true);
  for (let i = 0; i < 24; i++) bytes[128 + i] = i + 1;
  const { loader, messages } = workerLoader(t);
  const manager = new CjsBlueResMan({ workerLoader: loader, source: { Read: () => bytes } });
  RegisterTextureResources(manager);
  const texture = await manager.FetchResource("res:/volume.dds");
  const bitmap = texture.GetBitmap();
  assert.equal(bitmap.GetType(), TextureType.TEX_TYPE_3D);
  assert.deepEqual([ bitmap.GetWidth(), bitmap.GetHeight(), bitmap.GetDepth() ], [ 4, 4, 3 ]);
  assert.equal(bitmap.GetArraySize(), 1);
  assert.equal(bitmap.GetMipCount(), 1);
  assert.deepEqual(bitmap.GetRawData(), bytes.subarray(128), "all three compressed slices reach the bitmap");
  assert.equal(messages.filter(message => message.operation === "format.read").length, 1);
});
