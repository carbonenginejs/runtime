import assert from "node:assert/strict";
import { test } from "node:test";
import { CjsSchema } from "../../../src/global/schema/index.js";
import { PixelFormat } from "#consts/render-context";
import { HostBitmap } from "../../../src/global/imageio/index.js";
import {
  Tr2TextureLodManager,
  Tr2TexturePackChannel,
  Tr2TexturePipeline,
  Tr2TexturePipelineStepCompress,
  Tr2TexturePipelineStepLimitSize,
  Tr2TexturePipelineStepGenerateMips,
  Tr2TexturePipelineStepLoad,
  Tr2TexturePipelineStepPack,
  TriTextureRes
} from "../../../src/resource/index.js";

test("Tr2TextureLodManager mirrors Carbon registration and removal order", () =>
{
  const manager = new Tr2TextureLodManager();
  const first = new TriTextureRes({ name: "first" });
  const second = new TriTextureRes({ name: "second" });

  manager.RegisterTexture(first).RegisterTexture(second).RegisterTexture(first);
  const snapshot = manager.GetManagedTextures();

  assert.deepEqual(snapshot, [ first, second, first ]);
  snapshot.length = 0;
  assert.deepEqual(manager.GetManagedTextures(), [ first, second, first ]);
  assert.equal(manager.UnregisterTexture(first), manager);
  assert.deepEqual(manager.GetManagedTextures(), [ second ]);
  assert.equal(
    CjsSchema.getMethod(Tr2TextureLodManager, "GetManagedTextures").impl.status,
    "implemented"
  );
});

test("Tr2TexturePipeline collects sorted unique Carbon step dependencies", () =>
{
  const load = new Tr2TexturePipelineStepLoad();
  load.path = "res:/z.png";
  const pack = new Tr2TexturePipelineStepPack();
  pack.r = Object.assign(new Tr2TexturePackChannel(), { path: "res:/a.png" });
  pack.g = Object.assign(new Tr2TexturePackChannel(), { path: "res:/z.png" });
  const pipeline = new Tr2TexturePipeline();
  pipeline.steps = [ load, pack ];

  assert.deepEqual(pipeline.GetResourceDependencies(), [ "res:/a.png", "res:/z.png" ]);
  assert.equal(
    CjsSchema.getMethod(Tr2TexturePipeline, "GetResourceDependencies").impl.status,
    "adapted"
  );
});

test("Tr2TexturePipeline runs Carbon's steps against one HostBitmap", () =>
{
  const load = new Tr2TexturePipelineStepLoad();
  load.path = "res:/source.png";
  const limit = new Tr2TexturePipelineStepLimitSize();
  limit.maxWidth = 1;
  const pipeline = new Tr2TexturePipeline();
  pipeline.steps = [ load, limit ];

  // 2x2 BGRA; each pixel's blue channel is 0, 20, 40, 60.
  const source = Bgra(2, 2, [
    0, 10, 20, 255,
    20, 30, 40, 255,
    40, 50, 60, 255,
    60, 70, 80, 255
  ]);
  const result = new HostBitmap();

  assert.equal(pipeline.Execute(result, new Map([[ load.path, source ]])), true);
  assert.equal(result.GetWidth(), 1);
  assert.equal(result.GetHeight(), 1);
  // The box filter of the four source pixels, not a zeroed level (Carbon issue 1).
  assert.deepEqual([ ...result.GetMipRawData(0) ], [ 30, 40, 50, 255 ]);
  assert.equal(source.GetWidth(), 2, "the input bitmap is not consumed");
  assert.equal(
    CjsSchema.getMethod(Tr2TexturePipeline, "Execute").impl.status,
    "adapted"
  );
});

test("a failed step stops the pipeline (diverged from Carbon, issue 19)", () =>
{
  const load = new Tr2TexturePipelineStepLoad();
  load.path = "res:/missing.png";
  const mips = new Tr2TexturePipelineStepGenerateMips();
  const pipeline = new Tr2TexturePipeline();
  pipeline.steps = [ load, mips ];
  const result = new HostBitmap();

  assert.equal(pipeline.Execute(result, new Map()), false);
  assert.equal(result.IsValid(), false);
});

test("Tr2TexturePipeline packs channels from independent inputs", () =>
{
  const pack = new Tr2TexturePipelineStepPack();
  pack.format = PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM;
  pack.r = Object.assign(new Tr2TexturePackChannel(), { path: "res:/r.png", channel: 2 });
  pack.g = Object.assign(new Tr2TexturePackChannel(), { fill: 7 });
  pack.b = Object.assign(new Tr2TexturePackChannel(), { path: "res:/b.png", channel: 0 });
  pack.a = Object.assign(new Tr2TexturePackChannel(), { fill: 255 });
  const pipeline = new Tr2TexturePipeline();
  pipeline.steps = [ pack ];
  const result = new HostBitmap();

  const inputs = new Map([
    [ "res:/r.png", Bgra(1, 1, [ 11, 22, 33, 44 ]) ],
    [ "res:/b.png", Bgra(1, 1, [ 55, 66, 77, 88 ]) ]
  ]);

  assert.equal(pipeline.Execute(result, inputs), true);
  assert.equal(result.GetFormat(), PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM);
  // b from b.png's channel 0 (byte 2), g filled, r from r.png's channel 2 (byte 0), a filled.
  assert.deepEqual([ ...result.GetMipRawData(0) ], [ 77, 7, 11, 255 ]);
});

test("an R8 pack writes one byte per pixel (diverged from Carbon, issue 2)", () =>
{
  const pack = new Tr2TexturePipelineStepPack();
  pack.format = PixelFormat.PIXEL_FORMAT_R8_UNORM;
  pack.r = Object.assign(new Tr2TexturePackChannel(), { path: "res:/r.png", channel: 0 });
  const pipeline = new Tr2TexturePipeline();
  pipeline.steps = [ pack ];
  const result = new HostBitmap();

  assert.equal(pipeline.Execute(result, new Map([[ "res:/r.png", Bgra(2, 1, [ 1, 2, 3, 4, 5, 6, 7, 8 ]) ]])), true);
  assert.equal(result.GetFormat(), PixelFormat.PIXEL_FORMAT_R8_UNORM);
  // Red is byte 2 of each BGRA pixel; Carbon's switch never reaches this arm.
  assert.deepEqual([ ...result.GetMipRawData(0) ], [ 3, 7 ]);
});

test("a BGRX pack leaves the X byte alone (diverged from Carbon, issue 2)", () =>
{
  const pack = new Tr2TexturePipelineStepPack();
  pack.format = PixelFormat.PIXEL_FORMAT_B8G8R8X8_UNORM;
  pack.b = Object.assign(new Tr2TexturePackChannel(), { path: "res:/x.png", channel: 2 });
  pack.g = Object.assign(new Tr2TexturePackChannel(), { fill: 9 });
  pack.r = Object.assign(new Tr2TexturePackChannel(), { fill: 8 });
  const pipeline = new Tr2TexturePipeline();
  pipeline.steps = [ pack ];
  const result = new HostBitmap();

  assert.equal(pipeline.Execute(result, new Map([[ "res:/x.png", Bgra(2, 1, [ 1, 2, 3, 4, 5, 6, 7, 8 ]) ]])), true);
  // Carbon writes three bytes per pixel into four-byte pixels, shifting pixel 2.
  assert.deepEqual([ ...result.GetMipRawData(0) ], [ 1, 9, 8, 0, 5, 9, 8, 0 ]);
});

test("the compress step refuses rather than passing data off as compressed", () =>
{
  const bitmap = Bgra(4, 4, new Array(4 * 4 * 4).fill(1));
  const compress = new Tr2TexturePipelineStepCompress();
  compress.format = PixelFormat.PIXEL_FORMAT_BC1_UNORM;

  assert.equal(compress.Execute(bitmap), false);
  compress.format = PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM;
  assert.equal(compress.Execute(bitmap), true);
});

/** A BGRA HostBitmap holding the supplied bytes. */
function Bgra(width, height, data)
{
  const bitmap = new HostBitmap();
  bitmap.Create(width, height, 1, PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM);
  bitmap.GetRawData().set(new Uint8Array(data));
  return bitmap;
}

test("our Convert and Resize steps let Pack join a compressed source and a differently sized one", async () =>
{
  const { CjsTexturePipelineStepConvert, CjsTexturePipelineStepResize } = await import("../../../src/resource/index.js");

  // A 4x4 BC1 block of pure red (color0 = 0xF800, all indices 0) - EVE ships
  // scalar maps compressed, and Carbon's Pack refuses block formats.
  const compressed = new HostBitmap();
  compressed.Create(4, 4, 1, PixelFormat.PIXEL_FORMAT_BC1_UNORM);
  compressed.GetRawData().set([ 0x00, 0xF8, 0x00, 0x00, 0, 0, 0, 0 ]);
  // An 8x8 BGRA source whose red byte is 100 everywhere.
  const larger = Bgra(8, 8, new Array(8 * 8).fill([ 0, 0, 100, 255 ]).flat());
  const inputs = new Map([ [ "res:/red.dds", compressed ], [ "res:/mask.dds", larger ] ]);

  const pack = new Tr2TexturePipelineStepPack();
  pack.format = PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM;
  pack.r = Object.assign(new Tr2TexturePackChannel(), { path: "res:/red.dds", channel: 0 });
  pack.g = Object.assign(new Tr2TexturePackChannel(), { path: "res:/mask.dds", channel: 0 });
  pack.a = Object.assign(new Tr2TexturePackChannel(), { fill: 255 });

  const pipeline = new Tr2TexturePipeline();
  pipeline.steps = [ new CjsTexturePipelineStepConvert(), new CjsTexturePipelineStepResize(), pack ];

  // Carbon's Pack alone refuses both: a block format, and mismatched sizes.
  const carbonOnly = new Tr2TexturePipeline();
  carbonOnly.steps = [ pack ];
  assert.equal(carbonOnly.Execute(new HostBitmap(), new Map(inputs)), false);

  const result = new HostBitmap();
  assert.equal(pipeline.Execute(result, inputs), true);
  assert.equal(result.GetWidth(), 8, "resized up to the largest input");
  assert.equal(result.GetHeight(), 8);
  // BGRA: b (unset fill 0), g from the mask's red, r from the decoded red block.
  assert.deepEqual([ ...result.GetMipRawData(0).subarray(0, 4) ], [ 0, 100, 255, 255 ]);
  assert.equal(compressed.GetFormat(), PixelFormat.PIXEL_FORMAT_BC1_UNORM, "the source bitmap was not changed");
});
