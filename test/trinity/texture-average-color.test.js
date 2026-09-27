import test from "node:test";
import assert from "node:assert/strict";
import { HostBitmap } from "../../npm/dist/global/imageio/index.js";
import { PixelFormat } from "../../npm/dist/global/consts/renderContext/index.js";
import { TriTextureRes } from "../../npm/dist/resource/index.js";
import { EveBannerSet, EvePlaneSet } from "../../npm/dist/trinity/index.js";

// A one-mip 4x4 BGRA image filled with one colour: blue 51, green 102, red 204, alpha 255.
function solidBitmap()
{
    const bitmap = new HostBitmap();
    assert.equal(bitmap.Create(4, 4, 1, PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM), true);
    const data = bitmap.GetMipRawData(0);
    for (let i = 0; i < data.length; i += 4) data.set([ 51, 102, 204, 255 ], i);
    return bitmap;
}

function loadedTexture()
{
    const texture = new TriTextureRes();
    texture.SetPayload(solidBitmap());
    return texture;
}

function close(actual, expected)
{
    for (let i = 0; i < 4; i++) assert.ok(Math.abs(actual[i] - expected[i]) < 1e-5, `[${i}] ${actual[i]} != ${expected[i]}`);
}

const SOLID = [ 204 / 255, 102 / 255, 51 / 255, 1 ];

test("TriTextureRes caches the loaded image's average colour (TriTextureRes.cpp:627-629)", () =>
{
    close(loadedTexture().GetAverageColor(), SOLID);
    assert.deepEqual(new TriTextureRes().GetAverageColor(), [ 0, 0, 0, 0 ]);
});

test("TriTextureRes.SetAverageColor is the push hook a video source uses (VideoPlayer.cpp:179)", () =>
{
    const texture = new TriTextureRes();
    texture.SetAverageColor(0.25, 0.5, 0.75, 1);
    assert.deepEqual(texture.GetAverageColor(), [ 0.25, 0.5, 0.75, 1 ]);
});

test("EveBannerSet reads its primary texture's average, zero without one (EveBannerSet.cpp:441-455)", () =>
{
    const set = new EveBannerSet();
    close(set.GetAverageColor(), [ 0, 0, 0, 0 ]);
    const texture = loadedTexture();
    set.primaryTextureParameter = { GetResource: () => texture };
    close(set.GetAverageColor(), SOLID);
});

test("EvePlaneSet multiplies its maps' averages, a missing map counting as white (EvePlaneSet.cpp:499-527)", () =>
{
    const set = new EvePlaneSet();
    close(set.GetAverageColor(), [ 1, 1, 1, 1 ]);
    const texture = loadedTexture();
    set.imageMapParameter = { GetResource: () => texture };
    close(set.GetAverageColor(), SOLID);
});
