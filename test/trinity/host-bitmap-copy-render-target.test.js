import assert from "node:assert/strict";
import test from "node:test";
import { Tr2HostBitmap, Tr2RenderTarget, Tr2RenderContext_GetMainThreadRenderContext } from "../../npm/dist/trinity/index.js";
import { Tr2RenderContextALStub, Tr2TextureSubresource, Tr2BitmapDimensions, Tr2MsaaDesc } from "../../npm/dist/trinityal/index.js";
import { PixelFormat, TextureType, Tr2CpuUsage, Tr2GpuUsage } from "../../npm/dist/global/consts/renderContext/index.js";

/**
 * A stub-device texture of the given format, filled so pixel (x, y) is
 * [x, y, x + y, 200], and a render target of the same size. The stub refuses
 * CPU-writable render targets, so the pixels go into a plain texture, which
 * Carbon's copy accepts as any Tr2TextureAL. The "often" usages keep the
 * stub's CPU storage between mappings.
 */
function Target(t, width, height, format)
{
    const context = Tr2RenderContext_GetMainThreadRenderContext(), previous = context.GetRenderContextAL();
    const al = new Tr2RenderContextALStub();
    context.SetRenderContextAL(al);
    al.CreateDevice();
    t.after(() => context.SetRenderContextAL(previous));
    const target = new Tr2RenderTarget();
    target.Create(width, height, 1, format);
    const texture = context.CreateTexture(Tr2BitmapDimensions.create__TypeFormatWidthHeightDepthMipCount(TextureType.TEX_TYPE_2D, format, width, height, 1, 1),
        { gpuUsage: Tr2GpuUsage.SHADER_RESOURCE, cpuUsage: Tr2CpuUsage.READ_OFTEN | Tr2CpuUsage.WRITE_OFTEN, msaa: new Tr2MsaaDesc() });
    const mapped = texture.MapForWriting(Tr2TextureSubresource.create__MipLevel(0), context);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++)
        mapped.data.set([ x, y, x + y, 200 ], y * mapped.pitch + x * 4);
    texture.UnmapForWriting(context);
    return { context, target, texture };
}

/** The four bytes of pixel (x, y) of a 2D bitmap. */
function Pixel(bitmap, x, y)
{
    const pitch = bitmap.GetMipPitch(0);
    return [ ...bitmap.GetMipRawData(0).subarray(y * pitch + x * 4, y * pitch + x * 4 + 4) ];
}

test("CopyFromRenderTarget reads a whole render target back into a matching bitmap", async t =>
{
    const { context, texture, target } = Target(t, 8, 4, PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM);
    const bitmap = new Tr2HostBitmap();
    bitmap.Create(8, 4, 1, PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM);
    assert.equal(await bitmap.CopyFromRenderTarget(texture, context), true);
    assert.deepEqual(Pixel(bitmap, 0, 0), [ 0, 0, 0, 200 ]);
    assert.deepEqual(Pixel(bitmap, 7, 3), [ 7, 3, 10, 200 ]);

    const script = new Tr2HostBitmap();
    script.Create(8, 4, 1, PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM);
    assert.equal(await script._CopyFromRenderTargetPython(target), true, "the script form copies a Tr2RenderTarget");
    assert.equal(await script._CopyFromRenderTargetPython(null), false);
});

test("CopyFromRenderTarget refuses a different size or format, and a bitmap that is not 2D", async t =>
{
    const { context, texture } = Target(t, 8, 4, PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM);
    const small = new Tr2HostBitmap();
    small.Create(4, 4, 1, PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM);
    assert.equal(await small.CopyFromRenderTarget(texture, context), false);
    const other = new Tr2HostBitmap();
    other.Create(8, 4, 1, PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM);
    assert.equal(await other.CopyFromRenderTarget(texture, context), false);
    const cube = new Tr2HostBitmap();
    cube.CreateCube(8, 1, PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM);
    assert.equal(await cube.CopyFromRenderTarget(texture, context), false);
});

test("the source-rectangle copy offsets the source origin and clips to both, as Carbon does", async t =>
{
    const { context, texture } = Target(t, 8, 4, PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM);
    const bitmap = new Tr2HostBitmap();
    bitmap.Create(6, 4, 1, PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM);
    // Carbon adds the clipped rectangle's left and top to the offset (Tr2HostBitmap.cpp:97-98):
    // source (2, 1) lands at (1 + 2, 1 + 1), and the bitmap's right edge clips the width to 3.
    assert.equal(await bitmap.CopyFromRenderTarget__SrcRect(texture, [ 2, 1, 6, 3 ], 1, 1, context), true);
    assert.deepEqual(Pixel(bitmap, 2, 2), [ 0, 0, 0, 0 ], "left of the placed rectangle is untouched");
    assert.deepEqual(Pixel(bitmap, 3, 2), [ 2, 1, 3, 200 ], "the rectangle's top-left lands at offset plus left and top");
    assert.deepEqual(Pixel(bitmap, 5, 3), [ 4, 2, 6, 200 ], "clipped at the bitmap's right edge");
    assert.equal(await bitmap.CopyFromRenderTarget__SrcRect(texture, [ 6, 0, 6, 4 ], 0, 0, context), true, "an empty rectangle succeeds without copying");
});

test("a B8G8R8X8 render target copies into B8G8R8A8 with opaque alpha", async t =>
{
    const { context, texture } = Target(t, 4, 2, PixelFormat.PIXEL_FORMAT_B8G8R8X8_UNORM);
    const bitmap = new Tr2HostBitmap();
    bitmap.Create(4, 2, 1, PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM);
    assert.equal(await bitmap.CopyFromRenderTarget(texture, context), true);
    assert.deepEqual(Pixel(bitmap, 3, 1), [ 3, 1, 4, 255 ]);
});
