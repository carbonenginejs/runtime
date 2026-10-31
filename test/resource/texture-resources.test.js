import { configureResourceManager } from "../support/configuredResMan.js";
import { blue } from "../../npm/dist/global/blue/index.js";
import { CjsVtaFormat } from "../../npm/dist/resource/formats/vta/index.js";
import { ImageIO } from "../../npm/dist/resource/imageio/index.js";
import assert from "node:assert/strict";
import test, { beforeEach, afterEach } from "node:test";
import { buildVta } from "../support/vtaFixture.js";

import { CjsBlueResMan, TriTextureRes, Tr2ImageRes } from "../../npm/dist/resource/index.js";
import { HostBitmap } from "../../npm/dist/global/imageio/index.js";
import { PixelFormat } from "../../npm/dist/global/consts/renderContext/index.js";

ImageIO.registerImageHandler(CjsVtaFormat);
blue.resMan.RegisterFormat(CjsVtaFormat);

/** A 2x1 BGRA DDS, the legacy (non-DX10) header Carbon's reader accepts. */
function legacyDds(width, height, pixels)
{
  const header = new Uint8Array(128);
  const v = new DataView(header.buffer);
  v.setUint32(0, 0x20534444, true);   // "DDS "
  v.setUint32(4, 124, true);
  v.setUint32(8, 0x1007, true);
  v.setUint32(12, height, true);
  v.setUint32(16, width, true);
  v.setUint32(28, 1, true);
  v.setUint32(76, 32, true);
  v.setUint32(80, 0x41, true);        // RGB | ALPHAPIXELS
  v.setUint32(88, 32, true);
  [ 0xFF0000, 0xFF00, 0xFF, 0xFF000000 ].forEach((mask, i) => v.setUint32(92 + i * 4, mask, true));
  v.setUint32(108, 0x1000, true);
  const out = new Uint8Array(128 + pixels.length);
  out.set(header);
  out.set(pixels, 128);
  return out;
}

/** A manager serving one in-memory file. */
async function managerServing(path, bytes, options = {})
{
  const resMan = new CjsBlueResMan();
  blue.resMan = resMan;
  resMan.Register({ source: { Read: () => Promise.resolve(bytes) } });
  await configureResourceManager(resMan, options);
  return resMan;
}

test("resource declarations preserve Carbon's list and explicitly mark unsupported routes", async () =>
{
  assert.deepEqual(TriTextureRes.extensions, ["dds", "png", "sdd", "tga", "jpg", "jpeg", "bmp", "ecs", "ctr", "vta"]);
  assert.deepEqual(Object.keys(TriTextureRes.unroutedExtensions), ["sdd", "ecs", "ctr"]);
  assert.deepEqual(Tr2ImageRes.extensions, ["pngraw", "ddsraw", "sddraw", "tgaraw"]);
});

test("a texture resource loads as Carbon's HostBitmap, not a plain payload", async () =>
{
  const bytes = legacyDds(2, 1, [ 1, 2, 3, 255, 4, 5, 6, 255 ]);
  const resMan = await managerServing("res:/x/y.dds", bytes);

  const resource = await resMan.FetchResource("res:/x/y.dds");

  assert.ok(resource instanceof TriTextureRes, "the route's handler");

  const bitmap = resource.GetBitmap();

  assert.ok(bitmap instanceof HostBitmap, "Carbon's m_loadedBitmap");
  assert.equal(bitmap.GetFormat(), PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM);
  assert.equal(bitmap.GetWidth(), 2);
  assert.deepEqual([ ...bitmap.GetRawData() ], [ 1, 2, 3, 255, 4, 5, 6, 255 ]);
  // The dimensions TriTextureRes reports are the bitmap's.
  assert.equal(resource.width, 2);
  assert.equal(resource.height, 1);
  assert.equal(resource.cpuMip, 1);
});

test("CjsLibrary routes BMP through its existing native image handler", async () =>
{
  // Two 24-bit BGR pixels and two padding bytes in one bottom-up scanline.
  const bytes = new Uint8Array(62);
  const view = new DataView(bytes.buffer);
  view.setUint16(0, 0x4d42, true);
  view.setUint32(2, bytes.length, true);
  view.setUint32(10, 54, true);
  view.setUint32(14, 40, true);
  view.setInt32(18, 2, true);
  view.setInt32(22, 1, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
  view.setUint32(34, 8, true);
  bytes.set([10, 20, 30, 40, 50, 60, 0, 0], 54);
  const manager = await managerServing("res:/two-pixels.bmp", bytes);
  const texture = await manager.FetchResource("res:/two-pixels.bmp");
  assert.ok(texture instanceof TriTextureRes);
  assert.equal(texture.GetWidth(), 2);
  assert.equal(texture.GetHeight(), 1);
  const bitmap = texture.GetBitmap();
  assert.deepEqual(Array.from(bitmap.GetRawData()).slice(0, 3), [10, 20, 30]);
  assert.deepEqual(Array.from(bitmap.GetRawData()).slice(4, 7), [40, 50, 60]);
  assert.equal(await manager.FetchResource("res:/two-pixels.bmp"), texture);
});

test("the same route serves Tr2ImageRes, which is Carbon's CPU-only image", async () =>
{
  const bytes = legacyDds(1, 1, [ 10, 20, 30, 255 ]);
  const resMan = await managerServing("res:/x/icon.dds", bytes, { extensions: { dds: Tr2ImageRes } });

  const resource = await resMan.FetchResource("res:/x/icon.dds");

  assert.ok(resource instanceof Tr2ImageRes);
  assert.equal(resource.GetBitmap().IsValid(), true);
  assert.equal(resource.GetWidth(), 1);
  assert.deepEqual(resource.GetPixelColor(0, 0), { b: Math.fround(10 / 255), g: Math.fround(20 / 255), r: Math.fround(30 / 255), a: 1 });
  assert.equal(resource.IsPixelOpaque(0, 0), true);
});

test("a file the image handlers refuse fails the load, as Carbon's DoLoad does", async () =>
{
  const resMan = await managerServing("res:/x/broken.dds", new Uint8Array(128));

  await assert.rejects(
    () => resMan.FetchResource("res:/x/broken.dds"),
    error => /broken\.dds/.test(error.message) || error.code === "CJS_RESOURCE_IMAGE_READ_FAILED"
  );
});

test("a texture built from a pipeline packs images loaded as raw Tr2ImageRes (Carbon's .ctr route)", async () =>
{
  const { Tr2TexturePipeline, Tr2TexturePipelineStepPack, Tr2TexturePackChannel } = await import("../../npm/dist/resource/index.js");
  const files = {
    "res:/x/red.dds": legacyDds(2, 1, [ 0, 0, 200, 255, 0, 0, 100, 255 ]),
    "res:/x/mask.dds": legacyDds(2, 1, [ 0, 0, 7, 255, 0, 0, 9, 255 ])
  };
  const resMan = new CjsBlueResMan();
  blue.resMan = resMan;
  resMan.Register({ source: { Read: path => Promise.resolve(files[path]) } });
  await configureResourceManager(resMan);

  const pack = new Tr2TexturePipelineStepPack();
  pack.format = PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM;
  // Channel 0 is authored red; in BGRA memory that is byte 2.
  pack.r = Object.assign(new Tr2TexturePackChannel(), { path: "res:/x/red.dds", channel: 0 });
  pack.a = Object.assign(new Tr2TexturePackChannel(), { path: "res:/x/mask.dds", channel: 0 });
  const pipeline = new Tr2TexturePipeline();
  pipeline.steps = [ pack ];

  const texture = new TriTextureRes();
  assert.equal(await texture.LoadPipeline(pipeline, resMan), true);

  // Each input was loaded once, as Carbon's "raw" image, not as a texture.
  assert.ok(resMan.GetResource("res:/x/red.dds", { ex: "raw" }) instanceof Tr2ImageRes);

  const bitmap = texture.GetBitmap();
  assert.equal(bitmap.GetWidth(), 2);
  assert.deepEqual([ ...bitmap.GetRawData() ], [ 0, 0, 200, 7, 0, 0, 100, 9 ]);
  assert.equal(texture.IsPrepared(), true);
});

test("a pipeline whose input fails leaves the texture prepared without a bitmap, as Carbon does", async () =>
{
  const { Tr2TexturePipeline, Tr2TexturePipelineStepLoad } = await import("../../npm/dist/resource/index.js");
  const resMan = new CjsBlueResMan();
  blue.resMan = resMan;
  resMan.Register({ source: { Read: () => Promise.resolve(new Uint8Array(128)) } });
  await configureResourceManager(resMan);

  const load = new Tr2TexturePipelineStepLoad();
  load.path = "res:/x/broken.dds";
  const pipeline = new Tr2TexturePipeline();
  pipeline.steps = [ load ];

  const texture = new TriTextureRes();
  assert.equal(await texture.LoadPipeline(pipeline, resMan), false);
  assert.equal(texture.IsPrepared(), true, "Carbon sets m_isGood regardless (TriTextureRes.cpp:337)");
  assert.equal(texture.GetBitmap(), null, "so the parameter binds its fallback");
});

test("dynamic:/texturepack builds a recipe and packs channels from separate images", async () =>
{
  const { RegisterTexturePack, CjsTexturePackConstructor } = await import("../../npm/dist/resource/index.js");
  const files = {
    "res:/x/rough.dds": legacyDds(1, 1, [ 0, 0, 40, 255 ]),
    "res:/x/metal.dds": legacyDds(2, 2, new Array(4).fill([ 0, 0, 90, 255 ]).flat())
  };
  const resMan = new CjsBlueResMan();
  blue.resMan = resMan;
  resMan.Register({ source: { Read: path => Promise.resolve(files[path]) } });
  await configureResourceManager(resMan);
  RegisterTexturePack(resMan);

  const texture = resMan.GetResource("dynamic:/texturepack/res:/x/rough.dds;res:/x/metal.dds");
  await resMan.Ready(texture);

  const bitmap = texture.GetBitmap();
  assert.equal(bitmap.GetWidth(), 2, "resized up to the largest source");
  // Two channels pack to RG8 (ours; Carbon's Pack writes only BGRA/BGRX/R8):
  // r = rough's red, g = metal's red; plus a mip chain.
  const { PixelFormat: F } = await import("../../npm/dist/global/consts/renderContext/index.js");
  assert.equal(bitmap.GetFormat(), F.PIXEL_FORMAT_R8G8_UNORM);
  assert.deepEqual([ ...bitmap.GetMipRawData(0).subarray(0, 2) ], [ 40, 90 ]);
  assert.equal(bitmap.GetTrueMipCount(), 2);
  assert.equal(resMan.GetResource("dynamic:/texturepack/res:/x/rough.dds;res:/x/metal.dds"), texture, "one texture per query");

  // Channel selection, and the limits of a query.
  assert.deepEqual(CjsTexturePackConstructor.parseQuery("res:/a.dds:rg;res:/b.dds:rg").map(s => s.channels.join("")), [ "rg", "rg" ]);
  assert.equal(CjsTexturePackConstructor.parseQuery("res:/a.dds:rgb;res:/b.dds:rg"), null, "five channels");
  assert.equal(CjsTexturePackConstructor.parseQuery(""), null);
});

test("dynamic:/texturearray stacks separate images as the layers of one array", async () =>
{
  const { RegisterTextureArray } = await import("../../npm/dist/resource/index.js");
  const files = {
    "res:/x/detail1.dds": legacyDds(2, 2, new Array(4).fill([ 1, 2, 3, 255 ]).flat()),
    "res:/x/detail2.dds": legacyDds(1, 1, [ 4, 5, 6, 255 ])
  };
  const resMan = new CjsBlueResMan();
  blue.resMan = resMan;
  resMan.Register({ source: { Read: path => Promise.resolve(files[path]) } });
  await configureResourceManager(resMan);
  RegisterTextureArray(resMan);

  const texture = resMan.GetResource("dynamic:/texturearray/res:/x/detail1.dds;res:/x/detail2.dds");
  await resMan.Ready(texture);

  const bitmap = texture.GetBitmap();
  assert.equal(bitmap.GetArraySize(), 2, "one layer per path, in order");
  assert.equal(bitmap.GetWidth(), 2, "layers resized to the largest");
  assert.deepEqual([ ...bitmap.GetMipRawData(0, 0).subarray(0, 4) ], [ 1, 2, 3, 255 ]);
  assert.deepEqual([ ...bitmap.GetMipRawData(0, 1).subarray(0, 4) ], [ 4, 5, 6, 255 ]);
  assert.equal(bitmap.GetTrueMipCount(), 2, "a mip chain per layer");
  assert.equal(resMan.GetResource("dynamic:/texturearray/res:/x/detail1.dds;res:/x/detail2.dds"), texture, "the string is the identity");
});

test("a loaded texture resource handed to a runtime texture parameter is made on first bind", async () =>
{
  // CORTAO's lookup table: Tr2SSAO passes its TriTextureRes to
  // Tr2Effect.SetParameter, which holds it in a Tr2RuntimeTextureParameter.
  // Our resources make their texture on first bind (Tr2ImageIOHelpers), so
  // that parameter must realize it, as TriTextureParameter does; it bound
  // the placeholder instead ("lookupTable ... texture: false").
  const { Tr2RuntimeTextureParameter } = await import("../../npm/dist/trinity/index.js");
  const { Tr2TexturePipeline, Tr2TexturePipelineStepLoad } = await import("../../npm/dist/resource/index.js");
  const { StubContext } = await import("../support/stubContext.js");
  const resMan = new CjsBlueResMan();
  blue.resMan = resMan;
  resMan.Register({ source: { Read: () => Promise.resolve(legacyDds(2, 1, [ 0, 0, 200, 255, 0, 0, 100, 255 ])) } });
  await configureResourceManager(resMan);

  const load = new Tr2TexturePipelineStepLoad();
  load.path = "res:/texture/ssao/lookup.dds";
  const pipeline = new Tr2TexturePipeline();
  pipeline.steps = [ load ];

  const resource = new TriTextureRes();
  assert.equal(await resource.LoadPipeline(pipeline, resMan), true);
  assert.equal(resource.GetTexture(), null, "loaded, not yet made");

  const parameter = new Tr2RuntimeTextureParameter();
  parameter.Create("LookupTable", resource);
  let bound;
  const description = { SetSrv__TextureAL: (_stage, _register, texture) => { bound = texture; return true; } };

  // No context: nothing to make it through, so the placeholder.
  parameter.CopyToResourceSet(description, 5, 2, 0);
  assert.equal(bound, null);

  parameter.CopyToResourceSet(description, 5, 2, 0, StubContext());
  assert.notEqual(bound, null);
  assert.equal(resource.GetTexture(), bound, "made once, kept on the resource");
});

test("VTA textures load the first volume frame through the ordinary texture resource route", async () =>
{
  const path = "res:/cloud/density.vta";
  const bytes = buildVta({
    grids: [ { name: "density", encoding: 0, width: 2, height: 1, depth: 2 } ],
    frames: [ [ [ 1, 2, 3, 4 ] ], [ [ 5, 6, 7, 8 ] ] ]
  });
  const resource = await (await managerServing(path, bytes)).FetchResource(path);
  assert.equal(resource.constructor, TriTextureRes);
  const bitmap = resource.GetBitmap();
  assert.equal(bitmap.constructor, HostBitmap);
  assert.equal(bitmap.GetFormat(), PixelFormat.PIXEL_FORMAT_R8_UNORM);
  assert.deepEqual([ resource.width, resource.height, bitmap.GetDepth() ], [ 2, 1, 2 ]);
  assert.deepEqual(Array.from(bitmap.GetRawData()), [ 1, 2, 3, 4 ]);
});

test("SetTextureFromRT wraps a render target as a live view (TriTextureRes.cpp:871-892)", async () =>
{
  const { CjsSchema } = await import("../../npm/dist/global/schema/index.js");
  const { Tr2Event } = await import("../../npm/dist/trinity/index.js");

  /** A render target with Carbon's IsValid / GetRenderTarget / OnTextureChange. */
  const makeTarget = valid =>
  {
    const texture = { valid, IsValid() { return this.valid; } };
    const event = new Tr2Event();
    return { texture, event, IsValid() { return texture.valid; }, GetRenderTarget() { return texture; }, OnTextureChange() { return event; } };
  };

  const texture = new TriTextureRes();
  const changes = [];
  const owner = {};
  texture.OnTextureChange().RegisterListener(owner, function () { changes.push("changed"); });

  const target = makeTarget(true);
  assert.equal(texture.SetTextureFromRT(target), true, "Carbon always returns true");
  assert.equal(texture.wrappedRenderTarget, target);
  assert.equal(texture.texture, target.texture, "a valid render target supplies the texture");

  // The wrapped render target's change is this resource's change.
  changes.length = 0;
  target.event.Broadcast();
  assert.deepEqual(changes, [ "changed" ]);

  // Re-wrapping stops listening to the previous render target.
  const next = makeTarget(false);
  texture.SetTextureFromRT(next);
  assert.equal(texture.wrappedRenderTarget, next);
  assert.equal(texture.texture, null, "an invalid render target supplies nothing yet");
  assert.equal(target.event.listeners.length, 0);
  assert.equal(next.event.listeners.length, 1);

  // GetTexture picks the texture up once the render target becomes valid (cpp:396-401).
  next.texture.valid = true;
  assert.equal(texture.GetTexture(), next.texture);

  // null unwraps.
  texture.SetTextureFromRT(null);
  assert.equal(texture.wrappedRenderTarget, null);
  assert.equal(next.event.listeners.length, 0);

  const row = CjsSchema.getMethod(TriTextureRes, "SetTextureFromRT");
  assert.equal(row.exposure.macro, "MAP_METHOD_AND_WRAP");
  assert.equal(row.exposure.name, "SetFromRenderTarget");
  assert.equal(row.impl.status, "adapted");
});

let previousManager;
beforeEach(() => { previousManager = blue.resMan; });
afterEach(() =>
{
  try { if (blue.resMan !== previousManager) blue.resMan.Clear(); }
  finally { blue.resMan = previousManager; }
});
