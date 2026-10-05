import assert from "node:assert/strict";
import test from "node:test";

import { CjsPngFormat } from "../../../../src/resource/formats/png/index.js";
import { CjsJpegFormat } from "../../../../src/resource/formats/jpeg/index.js";
import { CjsTgaFormat } from "../../../../src/resource/formats/tga/index.js";
import { CjsDdsFormat } from "../../../../src/resource/formats/dds/index.js";

const payload = { width: 2, height: 1, data: new Uint8Array([ 255, 0, 0, 255, 0, 0, 255, 255 ]) };
const png = CjsPngFormat.write(payload);
const jpeg = CjsJpegFormat.write(payload);
const tga = CjsTgaFormat.write(payload);

test("with bytes, a format with magic decides by the bytes, even against the extension", () =>
{
    assert.equal(CjsPngFormat.is("res:/x/picture.png", png), true);
    assert.equal(CjsPngFormat.is("res:/x/picture.jpg", png), true, "magic wins over a contrary extension");
    assert.equal(CjsPngFormat.is("res:/x/picture.png", jpeg), false, "an extension does not make JPEG bytes a PNG");
    assert.equal(CjsJpegFormat.is(null, jpeg), true);
    assert.equal(CjsJpegFormat.is(null, png), false);
    assert.equal(CjsDdsFormat.is("a.dds", png), false);
});

test("with no bytes, it is Carbon's extension check on the filename", () =>
{
    assert.equal(CjsPngFormat.is("res:/x/picture.PNG", null), true);
    assert.equal(CjsJpegFormat.is("x.jpeg", null), true);
    assert.equal(CjsJpegFormat.is("x.jpg", null), true);
    assert.equal(CjsDdsFormat.is("x.dds", null), true);
    assert.equal(CjsPngFormat.is("x.tga", null), false);
    assert.equal(CjsPngFormat.is("no-extension", null), false);
    assert.equal(CjsPngFormat.is(null, null), false);
});

test("TGA has no magic: it needs its extension, plus a plausible header when bytes are given", () =>
{
    assert.equal(CjsTgaFormat.is("x.tga", tga), true);
    assert.equal(CjsTgaFormat.is("x.tga", null), true);
    assert.equal(CjsTgaFormat.is(null, tga), false, "no extension, no claim");
    assert.equal(CjsTgaFormat.is("x.png", tga), false);
    assert.equal(CjsTgaFormat.is("x.tga", new Uint8Array(18)), false, "a zeroed header is not plausible");
});

test("garbage is answered false, never thrown", () =>
{
    for (const Format of [ CjsPngFormat, CjsJpegFormat, CjsTgaFormat, CjsDdsFormat ])
    {
        for (const bytes of [ new Uint8Array(0), new Uint8Array(3), "not bytes", 42, {}, [] ])
        {
            assert.doesNotThrow(() => Format.is("x.tga", bytes), Format.className);
            assert.equal(Format.is(null, bytes), false, `${Format.className} ${JSON.stringify(bytes)}`);
        }
    }
});
