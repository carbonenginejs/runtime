import test from "node:test";
import assert from "node:assert/strict";

import { CjsByteWriter } from "../../../../src/resource/format/CjsByteWriter.js";
import { CjsByteReader } from "../../../../src/resource/format/CjsByteReader.js";
import {
    CjsStringTable,
    CJS_STRING_TABLE_NULL_REFERENCE,
    compareTableBlobs
} from "../../../../src/resource/format/CjsStringTable.js";

test("CjsByteWriter appends little-endian fields and reports each offset", () =>
{
    const writer = new CjsByteWriter(4);
    assert.equal(writer.u8(0x12), 0);
    assert.equal(writer.u16(0x3456), 1);
    assert.equal(writer.u32(0x789abcde), 3);
    assert.equal(writer.length, 7);

    const bytes = writer.toBytes();
    assert.deepEqual(Array.from(bytes), [ 0x12, 0x56, 0x34, 0xde, 0xbc, 0x9a, 0x78 ]);
});

test("CjsByteWriter grows past its initial capacity without losing bytes", () =>
{
    const writer = new CjsByteWriter(4);
    for (let index = 0; index < 300; index += 1) writer.u8(index & 0xff);
    const bytes = writer.toBytes();
    assert.equal(bytes.length, 300);
    for (let index = 0; index < 300; index += 1) assert.equal(bytes[index], index & 0xff);
});

test("CjsByteWriter reserves and patches an offset filled in later", () =>
{
    const writer = new CjsByteWriter();
    const slot = writer.reserve(4);
    writer.utf8("body");
    writer.patchU32(slot, writer.length);

    const bytes = writer.toBytes();
    assert.equal(new DataView(bytes.buffer).getUint32(0, true), 8);
    assert.deepEqual(Array.from(bytes.subarray(4)), [ 0x62, 0x6f, 0x64, 0x79 ]);
});

test("CjsByteWriter rejects a patch outside the written range", () =>
{
    const writer = new CjsByteWriter();
    writer.u32(1);
    assert.throws(() => writer.patchU32(4, 0), /Patch target is outside the written range/);
    assert.throws(() => writer.patchU32(-4, 0), /Patch target is outside the written range/);
});

test("CjsByteWriter and CjsByteReader agree on every field width", () =>
{
    const writer = new CjsByteWriter();
    writer.u8(200);
    writer.u16(60000);
    writer.u32(4000000000);
    writer.i32(-7);
    writer.f32(0.5);
    writer.bool(true);
    writer.bool(false);
    writer.bytes(Uint8Array.of(9, 8));

    const reader = new CjsByteReader(writer.toBytes());
    assert.equal(reader.readUint8(), 200);
    assert.equal(reader.readUint16(), 60000);
    assert.equal(reader.readUint32(), 4000000000);
    assert.equal(reader.readInt32(), -7);
    assert.equal(reader.readFloat32(), 0.5);
    assert.equal(reader.readBool(), true);
    assert.equal(reader.readBool(), false);
    assert.deepEqual(Array.from(reader.readRaw(2)), [ 9, 8 ]);
    assert.equal(reader.remaining, 0);
});

test("compareTableBlobs orders by bytes then by shorter length, like Carbon's Blob", () =>
{
    const of = (...values) => Uint8Array.of(...values);
    assert.ok(compareTableBlobs(of(0x61), of(0x62)) < 0);
    assert.ok(compareTableBlobs(of(0x61), of(0x61, 0x00)) < 0);
    assert.ok(compareTableBlobs(of(0x61, 0x62), of(0x62)) < 0);
    assert.equal(compareTableBlobs(of(1, 2), of(1, 2)), 0);
    assert.equal(compareTableBlobs(of(), of()), 0);
});

test("CjsStringTable assigns offsets by Carbon's bytewise sort, not by insertion order", () =>
{
    const table = new CjsStringTable();
    const b = table.addString("b");
    const a = table.addString("a");
    const ab = table.addString("ab");

    // "a\0" < "ab\0" < "b\0": memcmp over the shared prefix, then shorter first.
    assert.equal(table.offsetOf(a), 0);
    assert.equal(table.offsetOf(ab), 2);
    assert.equal(table.offsetOf(b), 5);
    assert.equal(table.byteLength, 7);
    assert.equal(table.containerSize, 11);
    assert.deepEqual(Array.from(table.toBytes()), [ 0x61, 0x00, 0x61, 0x62, 0x00, 0x62, 0x00 ]);
});

test("CjsStringTable stores strings with a NUL and raw blobs without one", () =>
{
    const table = new CjsStringTable();
    const asString = table.addString("a");
    const asBlob = table.addBytes(Uint8Array.of(0x61));

    assert.notEqual(asString, asBlob);
    assert.equal(table.entryCount, 2);
    assert.equal(table.byteLength, 3);
    // [0x61] sorts before [0x61, 0x00] on the shorter-wins tiebreak.
    assert.equal(table.offsetOf(asBlob), 0);
    assert.equal(table.offsetOf(asString), 1);
});

test("CjsStringTable deduplicates on exact bytes with no suffix merging", () =>
{
    const table = new CjsStringTable();
    assert.equal(table.addString("shared"), table.addString("shared"));
    assert.equal(table.addBytes(Uint8Array.of(1, 2, 3)), table.addBytes(Uint8Array.of(1, 2, 3)));
    assert.equal(table.entryCount, 2);

    // "red" is a suffix of "shared" but gets its own entry, as in Carbon.
    const red = table.addString("red");
    assert.equal(table.entryCount, 3);
    assert.equal(table.byteLength, 7 + 3 + 4);
    assert.ok(table.offsetOf(red) >= 0);
});

test("CjsStringTable copies the bytes it is given so later mutation cannot shift the arena", () =>
{
    const table = new CjsStringTable();
    const source = Uint8Array.of(1, 2, 3);
    const reference = table.addBytes(source);
    source[0] = 9;
    assert.deepEqual(Array.from(table.bytesOf(reference)), [ 1, 2, 3 ]);
});

test("CjsStringTable resolves an absent reference to Carbon's null sentinel", () =>
{
    const table = new CjsStringTable();
    table.addString("present");
    assert.equal(table.offsetOf(null), CJS_STRING_TABLE_NULL_REFERENCE);
    assert.equal(table.offsetOf(undefined), CJS_STRING_TABLE_NULL_REFERENCE);
    assert.equal(CJS_STRING_TABLE_NULL_REFERENCE, 0xffffffff);
});

test("CjsStringTable rejects an addition made after an offset was handed out", () =>
{
    const table = new CjsStringTable();
    const first = table.addString("first");
    assert.equal(table.offsetOf(first), 0);

    // Re-adding an existing entry is fine: it cannot move anything.
    assert.equal(table.addString("first"), first);

    // A genuinely new entry would re-sort and shift every offset already used.
    assert.throws(
        () => table.addString("second"),
        /String-table entry added after offsets were resolved/
    );
});

test("CjsStringTable writes a u32 payload size then the payload", () =>
{
    const table = new CjsStringTable();
    table.addString("hi");

    const writer = new CjsByteWriter();
    table.write(writer);
    const bytes = writer.toBytes();
    assert.equal(bytes.length, 4 + 3);
    assert.equal(new DataView(bytes.buffer).getUint32(0, true), 3);
    assert.deepEqual(Array.from(bytes.subarray(4)), [ 0x68, 0x69, 0x00 ]);

    const empty = new CjsStringTable();
    const emptyWriter = new CjsByteWriter();
    empty.write(emptyWriter);
    assert.deepEqual(Array.from(emptyWriter.toBytes()), [ 0, 0, 0, 0 ]);
    assert.equal(empty.containerSize, 4);
});

test("CjsStringTable round-trips through the reader's arena primitives", () =>
{
    const table = new CjsStringTable();
    const name = table.addString("Main");
    const payload = table.addBytes(Uint8Array.of(0x44, 0x58, 0x42, 0x43));

    const reader = new CjsByteReader(new Uint8Array(0), {
        stringTable: table.toBytes(),
        stringTableSize: table.byteLength
    });
    assert.equal(reader.readStringAt(table.offsetOf(name)), "Main");
    const blob = reader.stringTable.subarray(table.offsetOf(payload), table.offsetOf(payload) + 4);
    assert.deepEqual(Array.from(blob), [ 0x44, 0x58, 0x42, 0x43 ]);
});
