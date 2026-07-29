import assert from "node:assert/strict";
import test from "node:test";
import CjsGr2Format, {
    CjsGr2Format as NamedCjsGr2Format
} from "../../../src/formats/gr2/index.js";
// CjsFormat pulls in decorated probe code - test the consumer output.
import { CjsFormat } from "../../../npm/dist/index.js";

const MAGIC_32 = "29de6cc0baa4532b25f5b7a5f666e2ee";

function createMinimalGr2()
{
    const
        sectionDirectoryOffset = 68,
        sectionDataOffset = 112,
        sectionSize = 48,
        pointerFixupOffset = sectionDataOffset + sectionSize,
        bytes = new Uint8Array(pointerFixupOffset + 12),
        view = new DataView(bytes.buffer);

    for (let i = 0; i < 16; i++) bytes[i] = Number.parseInt(MAGIC_32.slice(i * 2, i * 2 + 2), 16);

    view.setUint32(32, 7, true);
    view.setUint32(44, sectionDirectoryOffset - 32, true);
    view.setUint32(48, 1, true);
    view.setUint32(52, 0, true);
    view.setUint32(56, 0, true);
    view.setUint32(60, 0, true);
    view.setUint32(64, 36, true);

    view.setUint32(sectionDirectoryOffset, 0, true);
    view.setUint32(sectionDirectoryOffset + 4, sectionDataOffset, true);
    view.setUint32(sectionDirectoryOffset + 8, sectionSize, true);
    view.setUint32(sectionDirectoryOffset + 12, sectionSize, true);
    view.setUint32(sectionDirectoryOffset + 28, pointerFixupOffset, true);
    view.setUint32(sectionDirectoryOffset + 32, 1, true);

    view.setUint32(sectionDataOffset, 20, true);
    view.setInt32(sectionDataOffset + 12, 1, true);
    view.setUint32(sectionDataOffset + 36, 42, true);
    bytes.set([ 0x63, 0x61, 0x66, 0xc3, 0xa9, 0 ], sectionDataOffset + 40);

    view.setUint32(pointerFixupOffset, 4, true);
    view.setUint32(pointerFixupOffset + 4, 0, true);
    view.setUint32(pointerFixupOffset + 8, 40, true);
    return bytes;
}

test("exports one public class as default and named", () =>
{
    assert.equal(CjsGr2Format, NamedCjsGr2Format);
});

test("satisfies the runtime-resource format contract", () =>
{
    CjsFormat.validateContract(CjsGr2Format);
    assert.deepEqual([ ...CjsGr2Format.inputTypes ], [ "gr2", "gsf" ]);
    assert.deepEqual([ ...CjsGr2Format.mediaTypes ], [ "geometry" ]);
    assert.equal(typeof CjsGr2Format.read, "function");
    assert.equal(typeof CjsGr2Format.readAsync, "function");
    assert.equal(typeof CjsGr2Format.inspect, "function");
});

test("isSupported answers from the 16-byte Granny magic", () =>
{
    assert.equal(CjsGr2Format.isSupported(createMinimalGr2()), true);
    assert.equal(CjsGr2Format.isSupported(new Uint8Array(64)), false);
    assert.equal(CjsGr2Format.isSupported(new Uint8Array(4)), false);
    assert.equal(CjsGr2Format.isSupported(null), false);
});

test("reads browser byte inputs without a Buffer global", () =>
{
    const
        bytes = createMinimalGr2(),
        padded = new Uint8Array(bytes.length + 11),
        previousBuffer = globalThis.Buffer;
    padded.set(bytes, 7);

    const inputs = [
        bytes,
        padded.subarray(7, 7 + bytes.length),
        bytes.buffer.slice(0),
        new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    ];

    try
    {
        globalThis.Buffer = undefined;
        for (const input of inputs)
        {
            const result = CjsGr2Format.readRaw(input);
            assert.equal(result.fileInfo["café"], 42);
        }
    }
    finally
    {
        globalThis.Buffer = previousBuffer;
    }
});

test("readAsync resolves the same result as read", async () =>
{
    const bytes = createMinimalGr2();
    const result = await CjsGr2Format.readAsync(bytes, { emit: "raw" });
    assert.equal(result.fileInfo["café"], 42);
});
