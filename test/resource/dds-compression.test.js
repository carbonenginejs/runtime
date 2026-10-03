import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { Worker } from "node:worker_threads";
import { compressMasked } from "../../npm/dist/resource/formats/dds/core/libsquish.js";
import { CjsDdsFormat as DDS } from "../../npm/dist/resource/formats/dds/index.js";
import { BitmapDimensions, HostBitmap } from "../../npm/dist/global/imageio/index.js";
import { TextureType as T } from "../../npm/dist/global/consts/renderContext/index.js";
import { getRawDataSize } from "../../npm/dist/resource/formats/dds/core/dxtCompression.js";
import { Tr2DxtCompressControl, Tr2DxtCompressor, Tr2HostBitmap } from "../../npm/dist/trinity/core/index.js";
import { Tr2TexturePipeline, Tr2TexturePipelineStepLoad, Tr2TexturePipelineStepCompress } from "../../npm/dist/resource/texture/index.js";
import { RegisterTextureResources, TriTextureRes, Tr2ImageRes } from "../../npm/dist/resource/texture/index.js";

const vectors = JSON.parse(readFileSync(new URL("./fixtures/libsquish-1.15.json", import.meta.url)));

test("MIT libsquish port matches 2310 scalar 1.15 reference blocks", () =>
{
    for (const item of vectors.cases)
    for (let format = 0; format < 5; format++)
    for (let quality = 0; quality < 3; quality++)
    {
        const output = new Uint8Array(format === 0 || format === 3 ? 8 : 16);
        compressMasked(Uint8Array.from(Buffer.from(item.rgba, "hex")), item.mask, format + 5, quality, output);
        assert.equal(Buffer.from(output).toString("hex"), item.blocks[format][quality], `${item.name}/${format}/${quality}`);
    }
});

function packet(overrides = {})
{
    const description = { type: T.TEX_TYPE_2D, width: 7, height: 5, depth: 1, mipCount: 3, arraySize: 1, format: 28, ...overrides };
    const data = new Uint8Array(getRawDataSize(new BitmapDimensions(description)));
    for (let i = 0; i < data.length; i++) data[i] = (i * 71 + 13) & 255;
    return { description, data, metadata: { cutout: {}, metadata: [["duplicate", "one"], ["duplicate", "tū"], ["", ""]] } };
}

test("BC1-BC5 DDS preserves mips, partial blocks, volumes, cube arrays, sRGB, 1D and metadata", () =>
{
    for (const topology of [{}, { type: T.TEX_TYPE_3D, depth: 5 },
        { type: T.TEX_TYPE_CUBE, width: 8, height: 8, arraySize: 12 },
        { arraySize: 3 }, { type: T.TEX_TYPE_1D, height: 1 }])
    for (const mode of [5, 6, 7, 8, 9])
    {
        const source = packet(topology), unchanged = source.data.slice();
        const encoded = DDS.compressBitmap(source, mode, { srgb: mode < 8 });
        const bytes = DDS.write(encoded), restored = DDS.read(bytes, { emit: "bitmap" });
        assert.deepEqual(restored.description, encoded.description);
        assert.deepEqual(restored.data, encoded.data);
        assert.deepEqual(restored.metadata.metadata, source.metadata.metadata);
        assert.deepEqual(source.data, unchanged);
        const view = new DataView(bytes.buffer);
        if (topology.depth > 1)
        {
            assert.ok(view.getUint32(8, true) & 0x800000);
            assert.ok(view.getUint32(112, true) & 0x200000);
        }
    }
});

test("RT modes are squish aliases; DXT5n and YCoCg rearrange only a private block", () =>
{
    const source = packet({ width: 4, height: 4, mipCount: 1 });
    for (const [rt, squish] of [[0, 5], [1, 7], [4, 9]])
        assert.deepEqual(DDS.compressBitmap(source, rt).data, DDS.compressBitmap(source, squish).data);
    for (const mode of [2, 3])
    {
        const transformed = { ...source, data: source.data.slice() };
        for (let p = 0; p < 64; p += 4)
        {
            const [r, g, b, a] = source.data.subarray(p, p + 4);
            const channels = mode === 2 ? [a, g, 0, r] :
                [Math.min(255, Math.round((r - b) / 2 + 128)), Math.min(255, Math.round((-r + 2 * g - b) / 4 + 128)), 0, Math.round((r + 2 * g + b) / 4)];
            transformed.data.set(channels, p);
        }
        assert.deepEqual(DDS.compressBitmap(source, mode).data, DDS.compressBitmap(transformed, 7).data);
    }
});

function workerOptions(t)
{
    const stats = { created: 0, terminated: 0 };
    return { stats, workerFactory() {
        stats.created++;
        const thread = new Worker(new URL("./fixtures/dds-compression-thread.mjs", import.meta.url));
        const listeners = new Map();
        const adapter = {
            postMessage: (message, transfer) => thread.postMessage(message, transfer),
            terminate() { stats.terminated++; void thread.terminate(); },
            addEventListener(type, callback) {
                const fn = value => callback(type === "message" ? { data: value } : { error: value });
                listeners.set(type, fn); thread.on(type, fn);
            },
            removeEventListener(type) { thread.off(type, listeners.get(type)); listeners.delete(type); }
        };
        t.after(() => thread.terminate());
        return adapter;
    } };
}

test("actual worker completes whole bitmap, retains caller input, and terminates", async t =>
{
    const options = workerOptions(t), source = packet({ type: T.TEX_TYPE_3D, depth: 3 });
    const encoded = await DDS.compressBitmapAsync(source, 8, options);
    assert.deepEqual(encoded.data, DDS.compressBitmap(source, 8).data);
    assert.ok(source.data.length > 0);
    assert.deepEqual(options.stats, { created: 1, terminated: 1 });
    assert.ok(encoded.encodeTimeMs >= 0);
});

test("Carbon cancellation before and during encoding publishes no partial output", async t =>
{
    for (const before of [true, false])
    {
        const options = workerOptions(t), control = new Tr2DxtCompressControl();
        const input = new Uint8Array(512 * 512 * 4).fill(123), output = new Uint8Array(512 * 512).fill(29);
        if (before) control.Cancel();
        const promise = Tr2DxtCompressor.Tr2DxtCompressSurfaceAsync(7, input, 512, 512, output, 2048, control, 0, options);
        if (!before) control.Cancel();
        assert.equal(await promise, false);
        assert.equal(control.IsDone(), true);
        assert.equal(control.IsCanceling(), true);
        assert.ok(output.every(value => value === 29));
        assert.equal(options.stats.created, before ? 0 : 1);
        assert.equal(options.stats.terminated, before ? 0 : 1);
    }
});

test("HostBitmap facade publishes corrected DXT3/BC2 output only on worker success", async t =>
{
    const source = new Tr2HostBitmap();
    source.CreateFromBitmapDimensions(new BitmapDimensions(packet().description));
    source.GetRawData().set(packet().data);
    let published = null;
    const output = { CreateFromHostBitmap(bitmap) { published = bitmap; return true; } };
    assert.equal(await source.Compress(6, 2, output, workerOptions(t)), true);
    assert.equal(published.GetFormat(), 74);
    const previous = published;
    assert.equal(await source.Compress(6, 2, output, { workerFactory() { throw new Error("unavailable"); } }), false);
    assert.equal(published, previous);
});

test("pipeline awaits compression before following steps consume BC bytes", async t =>
{
    const source = new HostBitmap();
    source.Create(7, 5, 1, 28);
    const load = new Tr2TexturePipelineStepLoad(); load.path = "res:/colour.dds";
    const step = new Tr2TexturePipelineStepCompress(); step.format = 71;
    let observed = 0;
    const pipeline = new Tr2TexturePipeline();
    pipeline.steps = [load, step, { Execute(bitmap) { observed = bitmap.GetFormat(); return true; } }];
    assert.equal(await pipeline.Execute(new HostBitmap(), new Map([[load.path, source]]), undefined, workerOptions(t)), true);
    assert.equal(observed, 71);
});

test("role policy excludes data and non-UNORM, and uses enabled device features", () =>
{
    const request = { enabled: true, backend: "webgpu", role: "colour", features: ["texture-compression-bc", "texture-compression-bc-sliced-3d", "texture-compression-unaligned"] };
    for (const role of ["lookup", "ramp", "ui", "flow", "data", null])
        assert.equal(DDS.selectCompression(packet(), { ...request, role }).mode, null);
    for (const format of [2, 41, 56, 54, 81, 84])
        assert.equal(DDS.selectCompression(packet({format}), request).mode, null);
    assert.equal(DDS.selectCompression(packet({format:61}), {...request,role:"roughness"}).mode,8);
    // Identical single-channel volume storage: shader role alone separates them.
    const scalarVolume = packet({format:61,type:T.TEX_TYPE_3D,depth:3});
    assert.equal(DDS.selectCompression(scalarVolume, {...request,role:"density"}).mode,8);
    assert.equal(DDS.selectCompression(scalarVolume, {...request,role:"lookup"}).reason,"excluded-role:lookup");
    assert.equal(DDS.selectCompression(scalarVolume, {...request,role:null}).reason,"unknown-texture-role");
    assert.equal(DDS.selectCompression(packet({format:49}), {...request,role:"normal"}).mode,9);
    assert.equal(DDS.selectCompression(packet(), request).mode,7);
    const opaque = packet(); for (let i=3;i<opaque.data.length;i+=4) opaque.data[i]=255;
    assert.equal(DDS.selectCompression(opaque, request).mode,5);
    assert.match(DDS.selectCompression(packet(), {...request,features:[]}).reason,/missing-active/);
    assert.match(DDS.selectCompression(packet(), {...request,features:["texture-compression-bc"]}).reason,/unaligned/);
    assert.match(DDS.selectCompression(packet({type:T.TEX_TYPE_3D,depth:3}), {...request,features:["texture-compression-bc"]}).reason,/sliced/);
    assert.equal(DDS.selectCompression(packet(), {...request,backend:"webgl"}).mode,null);
});

test("native R16 UNORM DDS retains exact bytes and malformed optional metadata is ignored", () =>
{
    const source = packet({width:7,height:5,format:56,mipCount:3,arraySize:2});
    const bytes = new Uint8Array(148 + source.data.length), view = new DataView(bytes.buffer);
    for (const [offset,value] of [[0,0x20534444],[4,124],[8,0x2100f],[12,5],[16,7],[20,14],[28,3],
        [76,32],[80,4],[84,0x30315844],[108,0x401008],[128,56],[132,3],[140,2]]) view.setUint32(offset,value,true);
    bytes.set(source.data,148);
    const restored = DDS.read(bytes,{emit:"bitmap"});
    assert.deepEqual(restored.description,source.description);
    assert.deepEqual(restored.data,source.data);
    assert.equal(DDS.inspect(bytes).pixelFormat,"r16unorm");
    assert.throws(()=>DDS.read(bytes,{emit:"rgba"}));
    const encoded = DDS.compressBitmap(packet(),5), saved = DDS.write(encoded);
    const metadataOffset = 128 + encoded.data.length;
    new DataView(saved.buffer).setUint32(metadataOffset + 20,0xffffffff,true);
    const withoutMetadata = DDS.read(saved,{emit:"bitmap"});
    assert.deepEqual(withoutMetadata.data,encoded.data);
    assert.deepEqual(withoutMetadata.metadata.metadata,[]);
});

test("pitched RT output leaves padding intact and rejects incomplete input transactionally", () =>
{
    const input = new Uint8Array(5*5*4).fill(213), output = new Uint8Array(80).fill(37);
    assert.equal(Tr2DxtCompressor.Tr2DxtCompressSurface(1,input,5,5,output,48),true);
    assert.ok(output.subarray(32,48).every(x=>x===37));
    const before = output.slice();
    assert.equal(Tr2DxtCompressor.Tr2DxtCompressSurface(1,input.subarray(0,20),5,5,output,48),false);
    assert.deepEqual(output,before);
});

test("unsigned high-bit extents terminate mip counting and reject insufficient storage", () =>
{
    const description = {type:T.TEX_TYPE_2D,width:0x80000000,height:1,depth:1,arraySize:1,mipCount:0,format:61};
    const dimensions = new BitmapDimensions(description);
    assert.equal(dimensions.GetTrueMipCount(),32);
    assert.equal(dimensions.GetMipWidth(0),0x80000000);
    assert.throws(()=>DDS.compressBitmap({description,data:new Uint8Array(1)},8),/storage/);
    assert.throws(()=>DDS.write({description:{...description,format:80},data:new Uint8Array(1)}),/storage/);
});

test("load hook snapshots LOAD settings, bypasses raw images, and publishes paired diagnostics", async t =>
{
    const original = TriTextureRes.compressUncompressedTextures;
    t.after(() => { TriTextureRes.compressUncompressedTextures = original; });
    const loaders = new Map();
    const manager = { RegisterObjectLoader(ext,loader) { loaders.set(ext,loader); }, RegisterExtension() {}, RegisterResourceType() {} };
    RegisterTextureResources(manager, { compression: { backend:"webgpu", features:["texture-compression-bc","texture-compression-unaligned"], resolveRole:()=>"colour", ...workerOptions(t) } });
    let release;
    const resource = new TriTextureRes(); resource.Initialize("res:/colour.dds","dds");
    const context = { resource, path: "res:/colour.dds", resMan: { ReadFormatOnce() { return new Promise(resolve=>{release=resolve;}); } } };
    TriTextureRes.compressUncompressedTextures = true;
    const pending = loaders.get("dds")(new Uint8Array(),context);
    TriTextureRes.compressUncompressedTextures = false;
    release(packet());
    const bitmap = await pending;
    assert.equal(bitmap.GetFormat(),77); assert.equal(bitmap.compression.requested,true);
    resource.SetPayload(bitmap);
    assert.equal(resource.compression.outputFormat,resource.format);
    const raw = new Tr2ImageRes(); raw.Initialize("res:/colour.dds","dds");
    TriTextureRes.compressUncompressedTextures = true;
    const uncompressed = await loaders.get("dds")(new Uint8Array(), {...context,resource:raw,resMan:{ReadFormatOnce:async()=>packet()}});
    assert.equal(uncompressed.GetFormat(),28); assert.equal(uncompressed.compression,undefined);
});
