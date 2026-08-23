import assert from "node:assert/strict";
import test from "node:test";
import {
    ColorSpace,
    DxgiFormat,
    MediaType,
    PixelFormat,
    ReflectionMode,
    RenderingMode,
    TextureDimension,
    TriBatchType,
    TriExtrapolation,
    dxgiToPixelFormat,
    getPixelFormatBlockHeight,
    getPixelFormatBlockWidth,
    getPixelFormatBytesPerBlock,
    isCompressedPixelFormat,
    isSrgbPixelFormat,
    normalizeColorSpace,
    toWebGpuTextureFormat
} from "../src/index.js";
import { PixelFormat as RenderContextPixelFormat } from "../src/renderContext/index.js";

test("exports canonical media and graphics tokens", () =>
{
    assert.equal(MediaType.TEXTURE, "texture");
    assert.equal(PixelFormat.RGBA8_UNORM, "rgba8unorm");
    assert.equal(ColorSpace.SRGB, "srgb");
    assert.equal(TextureDimension.CUBE, "cube");
    assert.notEqual(PixelFormat, RenderContextPixelFormat);
});

test("exports shared Trinity enum vocabulary", () =>
{
    assert.equal(TriBatchType.TRIBATCHTYPE_DISTORTION, 13);
    assert.equal(TriBatchType.TRIBATCHTYPE_COUNT_OF_BATCH_TYPES, 14);
    assert.equal(RenderingMode.RM_ANY, 0);
    assert.equal(RenderingMode.RM_ALPHA_ADDITIVE, 5);
    assert.equal(RenderingMode.RM_PREPASS_COLOR, 13);
    assert.equal(RenderingMode.RM_COUNT, 14);
    assert.equal(Object.isFrozen(RenderingMode), true);
    assert.equal(ReflectionMode.REFLECT_NEVER, 3);
    assert.deepEqual(TriExtrapolation, {
        TRIEXT_NONE: 0,
        TRIEXT_CONSTANT: 1,
        TRIEXT_GRADIENT: 2,
        TRIEXT_CYCLE: 3
    });
    assert.equal(Object.isFrozen(TriBatchType), true);
    assert.equal(Object.isFrozen(ReflectionMode), true);
    assert.equal(Object.isFrozen(TriExtrapolation), true);
});

test("classifies compressed and srgb pixel formats", () =>
{
    assert.equal(isCompressedPixelFormat(PixelFormat.BC7_RGBA_UNORM), true);
    assert.equal(isCompressedPixelFormat(PixelFormat.RGBA8_UNORM), false);
    assert.equal(isSrgbPixelFormat(PixelFormat.BC7_RGBA_UNORM_SRGB), true);
});

test("reports pixel format block metrics", () =>
{
    assert.equal(getPixelFormatBytesPerBlock(PixelFormat.RGBA8_UNORM), 4);
    assert.equal(getPixelFormatBytesPerBlock(PixelFormat.BC1_RGBA_UNORM), 8);
    assert.equal(getPixelFormatBlockWidth(PixelFormat.BC1_RGBA_UNORM), 4);
    assert.equal(getPixelFormatBlockHeight(PixelFormat.BC1_RGBA_UNORM), 4);
});

test("maps DXGI and WebGPU texture formats", () =>
{
    assert.equal(DxgiFormat.BC7_UNORM, 98);
    assert.equal(dxgiToPixelFormat(DxgiFormat.BC7_UNORM), PixelFormat.BC7_RGBA_UNORM);
    assert.equal(dxgiToPixelFormat(DxgiFormat.R8G8_UNORM), PixelFormat.RG8_UNORM);
    assert.equal(toWebGpuTextureFormat(PixelFormat.BC7_RGBA_UNORM), "bc7-rgba-unorm");
});

test("normalizes color spaces", () =>
{
    assert.equal(normalizeColorSpace(" SRGB "), ColorSpace.SRGB);
    assert.equal(normalizeColorSpace(""), ColorSpace.UNKNOWN);
});
