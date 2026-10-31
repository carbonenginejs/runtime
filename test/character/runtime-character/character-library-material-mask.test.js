import test from "node:test";
import assert from "node:assert/strict";
import { CjsCharacterLibrary, CjsCharacterLibraryManager } from "../../../npm/dist/character/index.js";
import { blue } from "../../../npm/dist/global/blue/index.js";
import { PixelFormat } from "../../../npm/dist/global/consts/renderContext/formats.js";

// The decoders are Graphene's zoneAreas.js and usedColourAreas.js (graphene 469a432) moved unchanged: on
// 20,000 random bitmaps of every encoding, with and without valid cutouts, CjsCharacterTexture's statics
// answered what Graphene's functions did, errors included (40,000 comparisons, 2026-11-01).

/** A ready texture as blue.resMan answers one: format, size, cutout and a CPU bitmap. */
function Texture(path, format, width, height, bytes)
{
    const pitch = bytes.length / height;
    return { path, format, width, height, cutoutX: 0, cutoutY: 0, cutoutWidth: 1, cutoutHeight: 1,
        loadedBitmap: { GetMipRawData: () => bytes, GetPitch: () => pitch } };
}

/** A manager whose library is installed (so nothing is indexed), over blue.resMan answering `textures`. */
function Manager(t, textures)
{
    const asked = [];
    t.mock.method(blue.resMan, "GetResource", path => { asked.push(path); return textures[path]; });
    t.mock.method(blue.resMan, "Ready", async resource => resource);
    return { manager: new CjsCharacterLibraryManager(new CjsCharacterLibrary()), asked };
}

const ZONE_GREY = "res:/test/colorize_head_z.png", ZONE_BLUE = "res:/test/colorize_body_z.png", DETAIL = "res:/test/colorize_body_l.png";
const textures = {
    // A single-channel zone of 0: the 42/255 bands give area 1.
    [ZONE_GREY]: Texture(ZONE_GREY, PixelFormat.PIXEL_FORMAT_R8_UNORM, 2, 2, new Uint8Array(4)),
    // An opaque BGRA zone of pure blue: area 3.
    [ZONE_BLUE]: Texture(ZONE_BLUE, PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM, 1, 1, Uint8Array.of(255, 0, 0, 255)),
    // An opaque white RGBA detail that paints everywhere.
    [DETAIL]: Texture(DETAIL, PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM, 1, 1, Uint8Array.of(255, 255, 255, 255))
};

test("FetchMaterialMaskAreas__Zone decodes a zone once and hands out a new list each time", async t =>
{
    const { manager, asked } = Manager(t, textures);
    const first = await manager.FetchMaterialMaskAreas__Zone(ZONE_GREY);
    const second = await manager.FetchMaterialMaskAreas__Zone(ZONE_GREY);
    assert.deepEqual(first, [ 1 ]);
    assert.deepEqual(second, [ 1 ]);
    assert.notEqual(first, second);
    assert.deepEqual(asked, [ ZONE_GREY ]);
});

test("FetchMaterialMaskAreas decodes the areas a detail paints through its zone, once per pair", async t =>
{
    const { manager, asked } = Manager(t, textures);
    assert.deepEqual(await manager.FetchMaterialMaskAreas(DETAIL, ZONE_BLUE), [ 3 ]);
    assert.deepEqual(await manager.FetchMaterialMaskAreas(DETAIL, ZONE_BLUE), [ 3 ]);
    assert.deepEqual(asked.sort(), [ DETAIL, ZONE_BLUE ].sort());
});

test("a zone that selects no area rejects, and the failure is not kept", async t =>
{
    const empty = "res:/test/empty_z.png";
    const { manager, asked } = Manager(t, { [empty]: Texture(empty, PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM, 1, 1, new Uint8Array(4)) });
    await assert.rejects(manager.FetchMaterialMaskAreas__Zone(empty), /Zone selects no colour area res:\/test\/empty_z.png/u);
    await assert.rejects(manager.FetchMaterialMaskAreas__Zone(empty), /Zone selects no colour area/u);
    assert.equal(asked.length, 2);
});
