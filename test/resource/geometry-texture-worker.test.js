import { configureResourceManager } from "../support/configuredResMan.js";
import { createDdsBitmap } from "../../npm/dist/resource/formats/dds/ddsBitmap.js";
import assert from "node:assert/strict";
import test from "node:test";
import { Worker } from "node:worker_threads";
import { BlueResManQueue, BlueResMan, CjsResManWorkerLoader } from "../../npm/dist/blue/blue/index.js";
import { CjsGr2Format } from "../../npm/dist/resource/formats/gr2/index.js";
import { CjsDdsFormat } from "../../npm/dist/resource/formats/dds/index.js";
import { CjsPngFormat } from "../../npm/dist/resource/formats/png/index.js";
import { ImageIO } from "../../npm/dist/resource/imageio/index.js";
import { LoadParameters, Metadata } from "../../npm/dist/global/imageio/index.js";
import { TriGeometryRes } from "../../npm/dist/trinity/resources/geometry/index.js";
import { TriGrannyRes } from "../../npm/dist/trinity/resources/geometry/granny/index.js";
import { RegisterTextureArray, TriTextureRes, Tr2ImageRes } from "../../npm/dist/trinity/resources/texture/index.js";
import { HostBitmap } from "../../npm/dist/global/imageio/index.js";
import { TextureType } from "../../npm/dist/global/consts/renderContext/index.js";
import { CjsSchema } from "../../npm/dist/blue/schema/index.js";
import "../support/frameLoop.js";

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

test("GR2 worker decode feeds the native load hook without fetching existing bytes", async t =>
{
  const { loader, messages } = workerLoader(t);
  const bytes = grannyBytes();
  const manager = new BlueResMan({ workerLoader: loader });
  await configureResourceManager(manager);
  let reads = 0;
  manager.SetSource({ Read() { reads++; throw new Error("existing bytes must not fetch"); } });
  const resource = new TriGeometryRes();
  resource._path = "res:/test.gr2";
  resource._ext = "";
  manager._StartResourceLoad(resource);
  resource._dataStream = { form: "bytes", data: bytes };
  const original = CjsGr2Format.prototype.ReadDataAsync;
  CjsGr2Format.prototype.ReadDataAsync = () => { throw new Error("main-thread GR2 decode must not execute"); };
  try { assert.equal(await resource._DoLoad(), resource.constructor.LoadingResult.LR_SUCCESS); }
  finally { CjsGr2Format.prototype.ReadDataAsync = original; resource._dataStream = null; manager._CancelResourceLoad(resource); }
  // The geometry keeps the granny file info, its vertices as the file's bytes, and no CMF data.
  assert.equal(resource.GetGrannyInfo().Meshes.length, 1);
  assert.ok(resource.GetGrannyInfo().Meshes[0].PrimaryVertexData.Vertices.bytes instanceof Uint8Array);
  assert.equal(resource.GetCMFData(), null);
  assert.equal(resource.IsUsingCMF(), false);
  assert.equal(resource.GetMeshCount(), 1);
  assert.equal(reads, 0);
  assert.equal(messages.filter(x => x.operation === "format.read").length, 1);
  assert.ok(bytes.byteLength > 0, "shared source bytes remain attached");
  resource.Shutdown();
  assert.equal(resource.GetGrannyInfo(), null);
});

test("registered GR2 route fetches and decodes once for concurrent consumers", async t =>
{
  const {loader,messages} = workerLoader(t);
  let reads = 0;
  const bytes = grannyBytes();
  const manager = new BlueResMan({ workerLoader: loader, source: {Read(){reads++;return bytes;}} });
  await configureResourceManager(manager);
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
    const texture = new TriTextureRes();
    texture.CreateFromHostBitmap(createDdsBitmap(packet));
    const image = new Tr2ImageRes();
    image.bitmap = createDdsBitmap(packet);
    image.width = image.bitmap.GetWidth();
    image.height = image.bitmap.GetHeight();
    assert.ok(CjsSchema.cast(texture.GetBitmap(),HostBitmap));
    assert.ok(CjsSchema.cast(image.GetBitmap(),HostBitmap));
    assert.equal(image.GetBitmap().GetArraySize(),options.cube ? 6 : 1);
    assert.deepEqual(image.GetBitmap().GetRawData(),packet.data);
    image.GetBitmap().GetRawData()[0] ^= 255;
    assert.deepEqual(texture.GetBitmap().GetRawData(),packet.data,"mutable image does not corrupt texture or cached decode");
  }
});

test("DDS texture and image routes execute in the worker", async t =>
{
  const {loader,messages} = workerLoader(t);
  const manager = new BlueResMan({workerLoader:loader,source:{Read:()=>ddsBytes()}});
  await configureResourceManager(manager);
  const texture = await manager.FetchResource("res:/test.dds");
  const image = await manager.FetchResource("res:/test.dds", {ex:"raw"});
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
    const manager = new BlueResMan({ workerLoader: loader, source: {
      Read(path) { reads.set(path, (reads.get(path) || 0) + 1); return ddsBytes(); }
    } });
    await configureResourceManager(manager);
    RegisterTextureArray(manager);
    const paths = [ "res:/detail1.dds", "res:/detail2.dds", "res:/detail3.dds" ];
    const start = messages.length;
    const parameters = () => Promise.all(paths.map(path => manager.FetchResource(path)));
    const array = () => manager.Ready(manager.GetResource("dynamic:/texturearray/" + paths.join(";")));
    if (order === "parameters-first") { await parameters(); await array(); }
    else if (order === "array-first") { await array(); await parameters(); }
    else await Promise.all([ parameters(), array() ]);
    await parameters();
    await array();
    assert.deepEqual([ ...reads.values() ], [ 1, 1, 1 ], order);
    assert.equal(messages.slice(start).filter(x => x.operation === "format.read").length, 3, order);
    for (const path of paths)
    {
      assert.equal(manager.Lookup(path, { ex: "raw" }), null, "no duplicate raw-image owner");
      assert.equal(manager.Lookup(path).GetBitmap().GetRawData()[0], 73, "array conversion does not mutate its inputs");
    }
    manager.Clear();
  }
});

test("DDS loader honors the selected source and explicit shared decode policy", async t =>
{
  const { loader, messages } = workerLoader(t);
  let reads = 0;
  const source = { Read() { reads++; return ddsBytes(); } };
  const manager = new BlueResMan({ workerLoader: loader });
  await configureResourceManager(manager);
  const options = { source, cacheSource: true, cacheFormat: true };
  const [ texture, image ] = await Promise.all([
    manager.FetchResource("res:/shared.dds", options),
    manager.FetchResource("res:/shared.dds", { ...options, ex: "raw" })
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
  const manager = new BlueResMan({workerLoader:loader,source:{Read:()=>grannyBytes()}});
  await configureResourceManager(manager);
  let received;
  const arrival = new Promise(resolve => {received=resolve;});
  const deliver = adapter.onmessage;
  adapter.onmessage = event => received(event);
  const resource = manager.GetResource("res:/obsolete.gr2");
  const pending = manager.Ready(resource).then(()=>null,error=>error);
  const result = await arrival;
  assert.equal(await new Promise(resolve=>manager.AddToQueue(BlueResManQueue.BRMQ_MAIN,resolve,"responsive")),"responsive");
  manager.Delete("res:/obsolete.gr2");
  deliver(result);
  assert.ok(await pending,"stale readiness must reject");
  assert.equal(manager.Lookup("res:/obsolete.gr2"),null);
  assert.equal(resource.GetGrannyInfo(),null,"obsolete result must not attach a Granny graph");
  assert.equal(resource.GetCMFData(),null);
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
  const manager = new BlueResMan({ workerLoader: loader, source: { Read: () => bytes } });
  await configureResourceManager(manager);
  const texture = await manager.FetchResource("res:/volume.dds");
  const bitmap = texture.GetBitmap();
  assert.equal(bitmap.GetType(), TextureType.TEX_TYPE_3D);
  assert.deepEqual([ bitmap.GetWidth(), bitmap.GetHeight(), bitmap.GetDepth() ], [ 4, 4, 3 ]);
  assert.equal(bitmap.GetArraySize(), 1);
  assert.equal(bitmap.GetMipCount(), 1);
  assert.deepEqual(bitmap.GetRawData(), bytes.subarray(128), "all three compressed slices reach the bitmap");
  assert.equal(messages.filter(message => message.operation === "format.read").length, 1);
});

test("PNG textures never go to the resource worker, and match the main-thread ImageIO read", async t =>
{
  // The decode is BeCallbackMan's job (image.decodeBitmap); BeCallbackMan is not started in this file, so it runs here.
  ImageIO.registerImageHandler(CjsPngFormat);
  const rgba = Uint8Array.from({ length: 5 * 3 * 4 }, (_, i) => (i * 37 + 11) & 255);
  const png = await CjsPngFormat.writeAsync({ width: 5, height: 3, data: rgba });
  const { loader, messages } = workerLoader(t);
  const manager = new BlueResMan({ workerLoader: loader, source: { Read: () => png } });
  await configureResourceManager(manager);
  const image = await manager.FetchResource("res:/test.png", { ex: "raw" });
  assert.ok(!messages.some(message => message.operation === "format.read"), "the resource worker decodes no PNG");
  const main = new HostBitmap();
  assert.ok((await ImageIO.readImageAsync(png, new LoadParameters("res:/test.png"), main, new Metadata())).IsOk());
  const bitmap = image.GetBitmap();
  assert.equal(bitmap.GetFormat(), main.GetFormat());
  assert.equal(bitmap.GetWidth(), 5);
  assert.deepEqual(Array.from(bitmap.GetRawData()), Array.from(main.GetRawData()));
});

test("a PNG decodes on this thread when no worker is available", async () =>
{
  ImageIO.registerImageHandler(CjsPngFormat);
  const png = await CjsPngFormat.writeAsync({ width: 2, height: 2, data: new Uint8Array(16).fill(200) });
  const manager = new BlueResMan({ source: { Read: () => png } });
  await configureResourceManager(manager);
  const image = await manager.FetchResource("res:/plain.png", { ex: "raw" });
  assert.equal(image.GetBitmap().GetWidth(), 2);
});

test("direct Granny Load uses library registration, both queues and the worker", async t =>
{
  const { loader, messages } = workerLoader(t);
  const bytes = grannyBytes();
  let reads = 0;
  const manager = new BlueResMan({ workerLoader: loader, source: { Read() { reads++; return bytes; } } });
  await configureResourceManager(manager);
  assert.equal(manager.GetFormatDescriptors("gr2").length, 0, "no bare-format registration masks the extension/ex reader");
  manager.PauseQueue(BlueResManQueue.BRMQ_BACKGROUND);
  manager.PauseQueue(BlueResManQueue.BRMQ_MAIN);
  const resource = new TriGrannyRes();
  const other = new TriGrannyRes();
  const original = CjsGr2Format.prototype.ReadDataAsync;
  CjsGr2Format.prototype.ReadDataAsync = () => { throw new Error("direct Granny decode must execute on the worker"); };
  t.after(() => { CjsGr2Format.prototype.ReadDataAsync = original; });
  const first = resource.Load("res:/direct.gr2");
  const second = other.Load("res:/direct.gr2");
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(reads, 0, "a paused background queue prevents source I/O");
  assert.equal(messages.length, 0);
  manager.ResumeQueue(BlueResManQueue.BRMQ_BACKGROUND);
  const deadline = Date.now() + 10000;
  while (manager.GetPendingLoads() !== 0)
  {
    assert.ok(Date.now() < deadline, "background worker loads settle");
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  assert.equal(resource.IsPrepared(), false, "preparation stays on MAIN");
  assert.equal(reads, 1, "concurrent direct handles share the source operation");
  assert.equal(messages.filter(message => message.operation === "format.read").length, 1,
    "the stable registered descriptor shares the decode operation");
  manager.ResumeQueue(BlueResManQueue.BRMQ_MAIN);
  assert.deepEqual(await Promise.all([first, second]), [true, true]);
  assert.equal(resource.GetExt(), "raw");
  assert.equal(resource.GetGrannyFile().meshes.length, 1);
  assert.ok(bytes.byteLength > 0, "worker decoding does not detach shared input");
  assert.equal(manager.GetExtensionRoute("cmf"), null);
  assert.equal(manager.GetExtensionRoute("cmfraw"), null);
});

test("direct geometry Initialize resolves the configured reader without CreateResource", async t =>
{
  const { loader, messages } = workerLoader(t);
  const manager = new BlueResMan({ workerLoader: loader, source: { Read: grannyBytes } });
  await configureResourceManager(manager);
  const geometry = new TriGeometryRes();
  geometry.Initialize("res:/direct-geometry.gr2", "");
  await manager.Ready(geometry);
  assert.equal(geometry.GetMeshCount(), 1);
  const decode = messages.find(message => message.operation === "format.read");
  assert.ok(decode, "configured geometry runs through its worker declaration");
  assert.equal(geometry.IsUsingCMF(), false, "the reduced fix preserves existing Granny animation data");
  assert.ok(geometry.GetGrannyInfo());
});

test("direct unregistered file loads fail before I/O and cannot use the bare format registry", async t =>
{
  let reads = 0;
  const manager = new BlueResMan({ source: { Read() { reads++; return grannyBytes(); } } });
  await configureResourceManager(manager);
  manager.RegisterFormat(CjsGr2Format, { emit: "json" });
  const raw = new TriGrannyRes();
  assert.equal(await raw.Load("res:/unregistered.gsf"), false);
  assert.match(manager.GetResourceStatus(raw).error.message, /no registered reader for \.gsf/u);
  const geometry = new TriGeometryRes();
  geometry.Initialize("res:/unregistered.gsf", "");
  await assert.rejects(manager.Ready(geometry), /no registered reader for \.gsf/u);
  assert.equal(reads, 0);
  assert.throws(() => manager.GetFormat(".gsf"), /no registered reader/u);
});


test("registered GR2 instances finish worker and in-place data once with Blue on and off", async t =>
{
  const { loader, messages } = workerLoader(t);
  const bytes = grannyBytes();
  let populated = 0, finished = 0;
  class Mesh
  {
    SetValues(values) { populated++; Object.assign(this, values); }
  }
  const finish = CjsGr2Format.prototype.FinishRead;
  t.mock.method(CjsGr2Format.prototype, "FinishRead", function(data, options)
  {
    finished++;
    return finish.call(this, data, options);
  });
  for (const buildClasses of [false, true])
  {
    const results = [];
    for (const workers of [false, true])
    {
      const before = messages.length;
      const manager = new BlueResMan({ workerLoader: loader, source: { Read: () => bytes } });
      await configureResourceManager(manager, {
        formatOptions: { buildClasses },
        formats: { gr2: { Format: CjsGr2Format, options: { classes: { Mesh }, rebuildMissingBounds: true },
          workers, routes: [{ extension: "gr2", Res: TriGeometryRes }] } }
      });
      const resource = await manager.FetchResource("res:/parity.gr2");
      const data = resource.GetGrannyInfo();
      assert.equal(data.meshes[0] instanceof Mesh, buildClasses);
      assert.ok(data.meshes[0].vertex.position instanceof Float32Array);
      assert.ok(ArrayBuffer.isView(data.meshes[0].indices[0].faces));
      assert.equal(resource.GetCMFData().meshes[0].vertex.position, data.meshes[0].vertex.position);
      const requests = messages.slice(before).filter(message => message.operation === "format.read");
      assert.equal(requests.length, workers ? 1 : 0);
      if (workers)
      {
        assert.equal(requests[0].payload.nativeData, true);
        assert.equal(Object.hasOwn(requests[0].payload.options, "classes"), false);
        assert.equal(Object.hasOwn(requests[0].payload.options, "emit"), false);
      }
      results.push(data);
      manager.Clear();
    }
    assert.deepEqual(results[0], results[1]);
  }
  assert.equal(finished, 4);
  assert.equal(populated, 2);
  assert.ok(bytes.byteLength > 0);
});

test("GR2 registrations keep distinct options and cached results for the same source", async t =>
{
  const { loader, messages } = workerLoader(t);
  const bytes = grannyBytes();
  let reads = 0;
  const manager = new BlueResMan({ workerLoader: loader, source: { Read() { reads++; return bytes; } } });
  await configureResourceManager(manager, {
    formats: { gr2raw: { Format: CjsGr2Format, options: { rebuildMissingNormals: true },
      routes: [{ extension: "gr2", ex: "raw", Res: TriGrannyRes }] } }
  });
  const [geometry, granny] = await Promise.all([
    manager.FetchResource("res:/profiles.gr2", { cacheSource: true, cacheFormat: true }),
    manager.FetchResource("res:/profiles.gr2", { ex: "raw", cacheSource: true, cacheFormat: true })
  ]);
  assert.equal(reads, 1);
  assert.equal(messages.filter(message => message.operation === "format.read").length, 2);
  assert.equal(geometry.GetGrannyInfo().Meshes[0].PrimaryVertexData.Vertices.type.some(member => member.name === "Normal"), false, "the geometry reads the file's own vertices, with no rebuilt normals");
  assert.deepEqual(Array.from(granny.GetGrannyFile().meshes[0].vertex.normal), [0,0,1, 0,0,1, 0,0,1]);
  assert.throws(() => manager.GetFormat("gr2").SetValues({ rebuildMissingNormals: true }), TypeError);
});

test("GR2 callback options stay in place and preserve their per-mesh behavior", async t =>
{
  const { loader, messages } = workerLoader(t);
  let calls = 0;
  const manager = new BlueResMan({ workerLoader: loader, source: { Read: grannyBytes } });
  await configureResourceManager(manager, {
    formats: { gr2: { Format: CjsGr2Format,
      options: { rebuildMissingNormals: () => { calls++; return true; } },
      routes: [{ extension: "gr2", Res: TriGeometryRes }] } }
  });
  const resource = await manager.FetchResource("res:/callback.gr2");
  assert.equal(calls, 1);
  assert.deepEqual(Array.from(resource.GetGrannyInfo().meshes[0].vertex.normal), [0,0,1, 0,0,1, 0,0,1]);
  assert.equal(messages.filter(message => message.operation === "format.read").length, 0);
});


test("captured geometry routes preserve explicit extensions and different ex profiles", async t =>
{
  const manager = new BlueResMan({ source: { Read: grannyBytes } });
  await configureResourceManager(manager, {
    formats: { geometryNormals: { Format: CjsGr2Format, options: { rebuildMissingNormals: true },
      routes: [{ extension: "gr2", ex: "normals", Res: TriGeometryRes }] } }
  });
  const [base, normals] = await Promise.all([
    manager.FetchResource("res:/opaque", { ext: "gr2" }),
    manager.FetchResource("res:/opaque", { ext: "gr2", ex: "normals" })
  ]);
  assert.equal(base.GetGrannyInfo().Meshes[0].PrimaryVertexData.Vertices.type.some(member => member.name === "Normal"), false, "the geometry reads the file's own vertices, with no rebuilt normals");
  assert.deepEqual(Array.from(normals.GetGrannyInfo().meshes[0].vertex.normal), [0,0,1, 0,0,1, 0,0,1]);
});


test("pending GR2 workers finish with the class mapping captured at dispatch", async t =>
{
  const { loader } = workerLoader(t);
  class First { SetValues(values) { Object.assign(this, values); } }
  class Second { SetValues(values) { Object.assign(this, values); } }
  const classes = { Mesh: First };
  const format = new CjsGr2Format().SetBlue({});
  const pending = loader.ReadFormat(format, grannyBytes(), { classes });
  classes.Mesh = Second;
  const result = await pending;
  assert.ok(result.meshes[0] instanceof First);
});


test("dynamic single-mesh GR2 reads use the configured native-data worker", async t =>
{
  const { loader, messages } = workerLoader(t);
  const bytes = grannyBytes();
  const manager = new BlueResMan({ workerLoader: loader, source: { Read: () => bytes } });
  await configureResourceManager(manager);
  const resource = await manager.FetchResource("dynamic:/mesh/0/res:/single.gr2");
  assert.equal(resource.GetMeshCount(), 1);
  assert.equal(resource.GetLodPositions(0, resource.GetMeshLod__LodIndex(0, 0)).length, 9);
  const request = messages.find(message => message.operation === "format.read");
  assert.equal(request.payload.nativeData, true);
  assert.equal(request.payload.options.meshIndex, 0);
  assert.ok(bytes.byteLength > 0);
});
