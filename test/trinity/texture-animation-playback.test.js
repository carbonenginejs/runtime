import test from "node:test";
import assert from "node:assert/strict";
import { buildVta } from "../support/vtaFixture.js";
import { blue } from "../../npm/dist/global/blue/blue.js";
import { Tr2TextureAnimation } from "../../npm/dist/trinity/core/animation/Tr2TextureAnimation.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../npm/dist/trinity/core/context/Tr2RenderContext.js";
import { CjsVtaFormat } from "../../npm/dist/resource/formats/vta/CjsVtaFormat.js";
import { CjsWebgpuTextureAL } from "../../npm/dist/trinityal/webgpu/CjsWebgpuTextureAL.js";
import { BitmapDimensions } from "../../npm/dist/global/imageio/BitmapDimensions.js";
import { TextureType, PixelFormat, Tr2CpuUsage } from "../../npm/dist/global/consts/renderContext/index.js";
import { Tr2TextureSubresource } from "../../npm/dist/trinityal/Tr2HalHelperStructures/Tr2TextureSubresource.js";

function fixture()
{
  return buildVta({
    grids: ["density", "heat"].map(name => ({ name, format: 61, encoding: 0, width: 2, height: 1, depth: 2 })),
    frames: [
      [[1, 2, 3, 4], [10, 20, 30, 40]],
      [[5, 6, 7, 8], [50, 60, 70, 80]],
      [[9, 10, 11, 12], [90, 100, 110, 120]]
    ]
  });
}

function setup(t)
{
  const textures = [];
  t.mock.method(blue.resMan, "ReadResource", async () => fixture());
  t.mock.method(Tr2RenderContext_GetMainThreadRenderContext(), "CreateTexture", (desc, options) =>
  {
    const texture = {
      desc, uploads: [Array.from(options.initialData[0].m_sysMem)], destroyed: false,
      UpdateSubresource(region, bytes, pitch, slicePitch)
      {
        assert.equal(pitch, 2);
        assert.equal(slicePitch, 2);
        this.uploads.push(Array.from(bytes));
      },
      Destroy()
      {
        this.destroyed = true;
      }
    };
    textures.push(texture);
    return texture;
  });
  const animation = new Tr2TextureAnimation();
  animation.resPath = "res:/test.vta";
  return { animation, textures };
}

test("VTA frame iterator is lazy and retains detached multi-grid frames", async () =>
{
  const bytes = fixture();
  const iterator = CjsVtaFormat.readFrames(bytes);
  const first = (await iterator.next()).value;
  const second = (await iterator.next()).value;
  assert.deepEqual(Array.from(first.grids[0].frames[0]), [1, 2, 3, 4]);
  assert.deepEqual(Array.from(second.grids[0].frames[0]), [5, 6, 7, 8]);
  assert.equal(second.grids[0].firstFrame, 1);
  assert.equal(first.grids.length, 2);
  await iterator.return();
  // Corrupt the second frame: obtaining frame zero must still succeed.
  const view = new DataView(bytes.buffer);
  const secondOffset = Number(view.getBigUint64(32 + 2 * 52 + 2 * 8, true));
  bytes[secondOffset] = 255;
  const lazy = CjsVtaFormat.readFrames(bytes);
  assert.equal((await lazy.next()).done, false);
  await assert.rejects(lazy.next());
});

test("texture animation advances one frame after the strict threshold and keeps texture identity", async t =>
{
  const { animation, textures } = setup(t);
  assert.equal(animation.Initialize(), true);
  assert.deepEqual(animation.GetChannelNames(), []);
  await animation._asyncState.pending;
  animation.AdvanceTime(0);
  const texture = animation.GetTexture("density");
  assert.equal(texture, textures[0]);
  assert.equal(texture.desc.GetDepth(), 2);
  assert.deepEqual(animation.GetChannelNames(), ["density", "heat"]);
  await animation._asyncState.pending;
  animation.AdvanceTime(1);
  assert.equal(animation.frame, 0);
  animation.AdvanceTime(0.25);
  assert.equal(animation.frame, 1);
  assert.equal(animation.time, 0.25);
  assert.deepEqual(texture.uploads.at(-1), [5, 6, 7, 8]);
  await animation._asyncState.pending;
  animation.AdvanceTime(8);
  assert.equal(animation.frame, 2);
  assert.equal(animation.GetTexture("density"), texture);
  await animation._asyncState.pending;
  animation.AdvanceTime(1);
  assert.equal(animation.frame, 0);
  assert.deepEqual(texture.uploads.at(-1), [1, 2, 3, 4]);
  animation.Destroy();
  // Carbon's destructor only cancels (Tr2TextureAnimation.cpp:103-109); holders keep the textures.
  assert.ok(textures.every(item => !item.destroyed));
  assert.equal(animation.GetTexture("density"), null);
});

test("reload drops grid textures without destroying ones a resource set may still bind", async t =>
{
  const { animation, textures } = setup(t);
  await animation.ReadData();
  animation.AdvanceTime(0);
  const old = animation.GetTexture("density");
  assert.equal(old, textures[0]);
  await animation.ReadData();
  assert.equal(old.destroyed, false);
  assert.deepEqual(animation.GetChannelNames(), []);
  animation.AdvanceTime(0);
  assert.notEqual(animation.GetTexture("density"), old);
  assert.equal(textures.length, 4);
  assert.ok(textures.every(item => !item.destroyed));
  animation.Destroy();
});

test("grid textures take the grid's pixel format", async t =>
{
  const { animation, textures } = setup(t);
  await animation.ReadData();
  animation.AdvanceTime(0);
  assert.equal(textures[0].desc.GetFormat(), PixelFormat.PIXEL_FORMAT_R8_UNORM);
  animation.Destroy();
});

test("playback time accumulates in float32 like Carbon's float dt * m_fps", async t =>
{
  const { animation } = setup(t);
  await animation.ReadData();
  animation.AdvanceTime(0);
  await animation._asyncState.pending;
  animation.fps = 3;
  animation.AdvanceTime(0.1);
  assert.equal(animation.time, Math.fround(Math.fround(0.1) * 3));
  animation.Destroy();
});

test("WebGPU MapForWriting on a volume maps every depth slice", () =>
{
  const texture = new CjsWebgpuTextureAL();
  texture.m_texture = {};
  texture.m_cpuUsage = Tr2CpuUsage.WRITE;
  texture.m_desc = new BitmapDimensions({ type: TextureType.TEX_TYPE_3D, format: PixelFormat.PIXEL_FORMAT_R8_UNORM, width: 4, height: 2, depth: 3, mipCount: 1 });
  let upload;
  texture.m_webgpu = { GetDevice: () => ({ queue: { writeTexture: (_target, bytes, layout, size) => { upload = { bytes, layout, size }; } } }) };
  const al = { IsValid: () => true };
  const mapping = texture.MapForWriting(Tr2TextureSubresource.ForMipLevel(0), al);
  assert.equal(mapping.pitch, 4);
  assert.equal(mapping.data.length, 4 * 2 * 3);
  texture.UnmapForWriting(al);
  assert.equal(upload.bytes.length, 24);
  assert.equal(upload.layout.rowsPerImage, 2);
  assert.deepEqual(upload.size, { width: 4, height: 2, depthOrArrayLayers: 3 });
});

test("unlooped playback stops at the last frame and paused restart still completes", async t =>
{
  const { animation, textures } = setup(t);
  animation.looped = false;
  await animation.ReadData();
  animation.AdvanceTime(0);
  for (let frame = 0; frame < 3; frame++)
  {
    await animation._asyncState.pending;
    animation.AdvanceTime(1.25);
  }
  assert.equal(animation.frame, 2);
  assert.equal(animation.time, 1);
  assert.equal(textures[0].uploads.length, 3);
  animation.paused = true;
  animation.RestartAnimation();
  assert.equal(animation.frame, 2);
  await animation._asyncState.pending;
  animation.AdvanceTime(100);
  assert.equal(animation.frame, 0);
  assert.equal(animation.time, 0);
  assert.deepEqual(textures[0].uploads.at(-1), [1, 2, 3, 4]);
  animation.Destroy();
});

test("restart requested during pending decode waits before rewinding", async t =>
{
  const { animation } = setup(t);
  await animation.ReadData();
  animation.AdvanceTime(0);
  animation.RestartAnimation();
  assert.equal(animation._restartState, Tr2TextureAnimation.RestartState.WaitingToRestart);
  await animation._asyncState.pending;
  animation.AdvanceTime(100);
  assert.equal(animation._restartState, Tr2TextureAnimation.RestartState.WaitingForFrame);
  await animation._asyncState.pending;
  animation.AdvanceTime(100);
  assert.equal(animation.time, 0);
  assert.equal(animation._restartState, Tr2TextureAnimation.RestartState.NotRestarting);
  animation.Destroy();
});

test("reload cancellation and load failure cannot publish stale frames", async t =>
{
  const { animation, textures } = setup(t);
  let resolve;
  t.mock.method(blue.resMan, "ReadResource", () => new Promise(done => { resolve = done; }));
  const pending = animation.ReadData();
  await Promise.resolve();
  animation.resPath = "";
  await animation.ReadData();
  resolve(fixture());
  assert.equal(await pending, false);
  animation.AdvanceTime(10);
  assert.equal(textures.length, 0);
  const errors = [];
  t.mock.method(console, "error", (...args) => errors.push(args));
  t.mock.method(blue.resMan, "ReadResource", async () => { throw new Error("unavailable"); });
  animation.resPath = "res:/missing.vta";
  assert.equal(await animation.ReadData(), false);
  assert.equal(animation._asyncState.error.message, "unavailable");
  assert.equal(errors.length, 1);
  animation.Destroy();
});

test("WebGPU updates upload every depth slice of a volume mip", () =>
{
  const texture = new CjsWebgpuTextureAL();
  texture.m_texture = {};
  texture.m_desc = new BitmapDimensions({ type: TextureType.TEX_TYPE_3D, format: PixelFormat.PIXEL_FORMAT_R8_UNORM, width: 4, height: 2, depth: 4, mipCount: 2 });
  let extent;
  texture.m_webgpu = { GetDevice: () => ({ queue: { writeTexture: (_target, _bytes, _layout, size) => { extent = size; } } }) };
  texture.UpdateSubresource(Tr2TextureSubresource.ForMipLevel(1), new Uint8Array(4), 2, 2, null);
  assert.deepEqual(extent, { width: 2, height: 1, depthOrArrayLayers: 2 });
});

test("loaded VTA preserves duplicate channel names and returns the first texture", async t =>
{
  const { animation, textures } = setup(t);
  const bytes = buildVta({
    grids: [0, 1].map(() => ({ name: "density", format: 61, encoding: 0, width: 1, height: 1, depth: 1 })),
    frames: [[[1], [2]]]
  });
  t.mock.method(blue.resMan, "ReadResource", async () => bytes);
  await animation.ReadData();
  animation.AdvanceTime(0);
  assert.deepEqual(animation.GetChannelNames(), ["density", "density"]);
  assert.equal(animation.GetTexture("density"), textures[0]);
  assert.equal(animation.GetTexture("unknown"), null);
  animation.Destroy();
});
