import test from "node:test";
import assert from "node:assert/strict";

import { HlslReader } from "../../../../../src/resource/formats/hlsl/core/HlslReader.js";
import { HlslEffectReadError } from "../../../../../src/resource/formats/hlsl/core/HlslEffectReadError.js";

/**
 * Builds a little-endian byte buffer from an array of [writer, value] pairs
 * so numeric round-trip tests stay declarative.
 */
function bytesOf(writes)
{
    const size = writes.reduce((total, [ , , byteLength ]) => total + byteLength, 0);
    const bytes = new Uint8Array(size);
    const view = new DataView(bytes.buffer);
    let offset = 0;
    for (const [ setter, value, byteLength ] of writes)
    {
        view[setter](offset, value, true);
        offset += byteLength;
    }
    return bytes;
}

test("reads little-endian integers, floats and bools sequentially", () =>
{
    const bytes = bytesOf([
        [ "setUint8", 0xab, 1 ],
        [ "setUint16", 0x1234, 2 ],
        [ "setUint32", 0xdeadbeef, 4 ],
        [ "setInt32", -42, 4 ],
        [ "setFloat32", 1.5, 4 ],
        [ "setUint8", 1, 1 ],
        [ "setUint8", 0, 1 ]
    ]);
    const reader = new HlslReader(bytes);

    assert.equal(reader.ReadUint8(), 0xab);
    assert.equal(reader.ReadUint16(), 0x1234);
    assert.equal(reader.ReadUint32(), 0xdeadbeef);
    assert.equal(reader.ReadInt32(), -42);
    assert.equal(reader.ReadFloat32(), 1.5);
    assert.equal(reader.ReadBool(), true);
    assert.equal(reader.ReadBool(), false);
    assert.equal(reader.remaining, 0);
});

test("readRaw returns a view without copying and advances the offset", () =>
{
    const bytes = Uint8Array.of(1, 2, 3, 4, 5);
    const reader = new HlslReader(bytes);

    const slice = reader.ReadRaw(3);
    assert.deepEqual(Array.from(slice), [ 1, 2, 3 ]);
    assert.equal(reader.offset, 3);
    assert.equal(reader.remaining, 2);
});

test("readString and readStringAt resolve offsets against a string table", () =>
{
    const encoder = new TextEncoder();
    const stringTable = new Uint8Array([ ...encoder.encode("Hello"), 0, ...encoder.encode("World"), 0 ]);

    const view = new DataView(new ArrayBuffer(8));
    view.setUint32(0, 0, true);
    view.setUint32(4, 6, true);
    const bytes = new Uint8Array(view.buffer);

    const reader = new HlslReader(bytes, { stringTable, stringTableSize: stringTable.length });
    assert.equal(reader.ReadString(), "Hello");
    assert.equal(reader.ReadString(), "World");
    assert.equal(reader.ReadStringAt(0), "Hello");
});

test("readStringOptional returns null for zero-length fields without consuming the string table", () =>
{
    const bytes = bytesOf([ [ "setUint32", 0, 4 ] ]);
    const reader = new HlslReader(bytes);
    assert.equal(reader.ReadStringOptional(0), null);
});

test("readTableBlob and readTableBlobOptional resolve string-table byte ranges", () =>
{
    const stringTable = Uint8Array.of(10, 20, 30, 40, 50);
    const bytes = bytesOf([ [ "setUint32", 1, 4 ], [ "setUint32", 0, 4 ] ]);
    const reader = new HlslReader(bytes, { stringTable, stringTableSize: stringTable.length });

    const blob = reader.ReadTableBlob(3);
    assert.equal(blob.offset, 1);
    assert.deepEqual(Array.from(blob.bytes), [ 20, 30, 40 ]);

    const empty = reader.ReadTableBlobOptional(0);
    assert.deepEqual(Array.from(empty.bytes), []);
});

test("setStringTable replaces the string table used by later reads", () =>
{
    const encoder = new TextEncoder();
    const first = encoder.encode("A\0");
    const second = new Uint8Array([ ...encoder.encode("B"), 0 ]);
    const bytes = bytesOf([ [ "setUint32", 0, 4 ] ]);
    const reader = new HlslReader(bytes, { stringTable: first, stringTableSize: first.length });

    reader.SetStringTable(second, second.length);
    reader.offset = 0;
    assert.equal(reader.ReadString(), "B");
});

test("reading past the configured bounds throws HlslEffectReadError", () =>
{
    const reader = new HlslReader(Uint8Array.of(1, 2));
    assert.throws(() => reader.ReadUint32(), HlslEffectReadError);
    assert.throws(() => reader.ReadUint32(), /Unexpected end of effect data/);
});

test("string reads without a string table throw HlslEffectReadError", () =>
{
    const bytes = bytesOf([ [ "setUint32", 0, 4 ] ]);
    const reader = new HlslReader(bytes);
    assert.throws(() => reader.ReadString(), /Missing effect string table/);
});

test("out-of-range string table offsets throw HlslEffectReadError", () =>
{
    const stringTable = Uint8Array.of(1, 2, 3);
    const bytes = bytesOf([ [ "setUint32", 100, 4 ] ]);
    const reader = new HlslReader(bytes, { stringTable, stringTableSize: stringTable.length });
    assert.throws(() => reader.ReadString(), /Invalid string-table offset/);
});

test("skip advances the offset and honours the same bounds check", () =>
{
    const reader = new HlslReader(Uint8Array.of(1, 2, 3, 4));
    reader.Skip(2);
    assert.equal(reader.offset, 2);
    assert.throws(() => reader.Skip(10), HlslEffectReadError);
});
