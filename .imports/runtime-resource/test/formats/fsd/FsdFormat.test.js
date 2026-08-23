import assert from "node:assert/strict";
import test from "node:test";

import { CjsFormatStore } from "../../../src/format/CjsFormatStore.js";
import {
    CjsFsd32Format,
    CjsFsd64Format,
    CjsFsdFormat,
} from "../../../src/formats/fsd/index.js";

test("the FSD facade and bit-width implementations declare the data format vocabulary", () =>
{
    for (const Format of [ CjsFsdFormat, CjsFsd32Format, CjsFsd64Format ])
    {
        assert.deepEqual(Format.mediaTypes, [ "data" ]);
        assert.equal(Object.isFrozen(Format.mediaTypes), true);
        assert.equal(Object.hasOwn(Format, "type"), false);
        assert.equal(Object.isFrozen(Format.outputs), true);
    }
});

test("the normal format pipeline identifies and reads modern 64-bit cFSD", async () =>
{
    const bytes = CreateModernContainer(16);
    const reader = {
        Read(input, options)
        {
            return { input, path: options.path };
        },
        ReadJSON()
        {
            return { json: true };
        },
    };
    const metadata = CjsFsdFormat.inspect(bytes);
    const report = CjsFsdFormat.getSupport(bytes, { reader });

    assert.equal(report.recognized, true);
    assert.equal(report.supported, true);
    assert.equal(report.preferredOutput, "payload");
    assert.equal(report.verified, false);
    assert.equal(metadata.bitWidth, 64);
    assert.equal(metadata.headerSize, 32);
    assert.equal((await CjsFsdFormat.verifySupport(bytes, { reader })).verified, true);

    const route = new CjsFormatStore().Register(CjsFsdFormat).Resolve(".fsdbinary", bytes);
    const result = route.Read(bytes, {
        path: "res:/staticdata/example.fsdbinary",
        reader,
    });

    assert.equal(result.input, bytes);
    assert.equal(result.path, "res:/staticdata/example.fsdbinary");
    assert.deepEqual(CjsFsdFormat.readJSON(bytes, { reader }), { json: true });
});

test("identified legacy 32-bit FSD reaches its reserved reader and fails explicitly", () =>
{
    const bytes = new Uint8Array(24);
    const metadata = CjsFsdFormat.inspect(bytes, { bitWidth: 32 });
    const report = CjsFsdFormat.getSupport(bytes, { bitWidth: 32 });
    const route = new CjsFormatStore().Register(CjsFsdFormat).Resolve(".fsdbinary", bytes);

    assert.equal(report.recognized, true);
    assert.equal(report.supported, false);
    assert.equal(report.preferredOutput, "");
    assert.equal(metadata.bitWidth, 32);
    assert.equal(metadata.decodable, false);
    assert.throws(
        () => route.Read(bytes, { bitWidth: 32 }),
        error => error.code === "CJS_FSD_32_UNSUPPORTED"
            && error.bitWidth === 32,
    );
});

test("unknown bytes are not mislabeled as legacy FSD", () =>
{
    const bytes = new Uint8Array(31);
    const report = CjsFsdFormat.getSupport(bytes);

    assert.equal(report.recognized, false);
    assert.equal(report.supported, false);
    assert.equal(report.preferredOutput, "");
    assert.throws(
        () => CjsFsdFormat.read(bytes),
        error => error.code === "CJS_FSD_VARIANT_UNKNOWN",
    );
});

function CreateModernContainer(payloadLength)
{
    const bytes = new Uint8Array(32 + payloadLength);
    const view = new DataView(bytes.buffer);

    for (let index = 0; index < 24; index++) bytes[index] = index + 1;
    view.setBigUint64(24, BigInt(payloadLength), true);
    return bytes;
}
