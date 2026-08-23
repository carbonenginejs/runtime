import assert from "node:assert/strict";
import { test } from "node:test";
import { CjsSchema } from "../../../npm/dist/global/schema/index.js";
import { PixelFormat as PayloadPixelFormat } from "#consts/graphics";
import { PixelFormat as CarbonPixelFormat } from "#consts/render-context";
import {
  Tr2TextureLodManager,
  Tr2TexturePackChannel,
  Tr2TexturePipeline,
  Tr2TexturePipelineStepLimitSize,
  Tr2TexturePipelineStepLoad,
  Tr2TexturePipelineStepPack,
  TriTextureRes
} from "../../../npm/dist/resource/index.js";

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
    "implemented"
  );
});

test("Tr2TexturePipeline executes Carbon load and limit-size steps on CPU RGBA", async () =>
{
  const load = new Tr2TexturePipelineStepLoad();
  load.path = "res:/source.png";
  const limit = new Tr2TexturePipelineStepLimitSize();
  limit.maxWidth = 1;
  const pipeline = new Tr2TexturePipeline();
  pipeline.steps = [ load, limit ];
  const source = RgbaPayload(2, 2, [
    0, 10, 20, 255,
    20, 30, 40, 255,
    40, 50, 60, 255,
    60, 70, 80, 255
  ]);

  const result = await pipeline.Execute(0, 0, {
    inputs: new Map([[ load.path, source ]])
  });

  assert.equal(result.width, 1);
  assert.equal(result.height, 1);
  assert.deepEqual(result.data, new Uint8Array([ 30, 40, 50, 255 ]));
  assert.equal(source.width, 2);
  assert.equal(
    CjsSchema.getMethod(Tr2TexturePipeline, "Execute").impl.status,
    "adapted"
  );
});

test("Tr2TexturePipeline packs logical RGBA channels from independent inputs", async () =>
{
  const pack = new Tr2TexturePipelineStepPack();
  pack.r = Object.assign(new Tr2TexturePackChannel(), { path: "res:/r.png", channel: 2 });
  pack.g = Object.assign(new Tr2TexturePackChannel(), { fill: 7 });
  pack.b = Object.assign(new Tr2TexturePackChannel(), { path: "res:/b.png", channel: 0 });
  pack.a = Object.assign(new Tr2TexturePackChannel(), { fill: 255 });
  const pipeline = new Tr2TexturePipeline();
  pipeline.steps = [ pack ];

  const result = await pipeline.Execute(0, 0, {
    inputs: {
      "res:/r.png": RgbaPayload(1, 1, [ 11, 22, 33, 44 ]),
      "res:/b.png": RgbaPayload(1, 1, [ 55, 66, 77, 88 ])
    }
  });

  assert.deepEqual(result.data, new Uint8Array([ 11, 7, 77, 255 ]));
  assert.equal(
    result.metadata.carbonPixelFormat,
    CarbonPixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM
  );
});

function RgbaPayload(width, height, data)
{
  return {
    payloadType: "rgba",
    sourceFormat: "png",
    width,
    height,
    pixelFormat: PayloadPixelFormat.RGBA8_UNORM,
    data: new Uint8Array(data),
    strideBytes: width * 4,
    origin: "top-left",
    colorSpace: "srgb",
    alphaMode: "straight"
  };
}
