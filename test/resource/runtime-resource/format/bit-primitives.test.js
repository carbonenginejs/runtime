import test from "node:test";
import assert from "node:assert/strict";

import {
    CjsBitReader,
    readBitAt,
    readBitsAt
} from "../../../../src/resource/format/CjsBitReader.js";

// The bit orders are the whole point of this file. Every assertion below is
// written against a byte whose value distinguishes LSB-first from MSB-first, so
// a reader that silently flipped convention fails rather than passes.

test("readBitAt takes the low bit of each byte first", () =>
{
    // 0b1000_0001 - only bit 0 and bit 7 set, so a reversed reader is visible.
    const bytes = new Uint8Array([ 0x81 ]);
    assert.deepEqual(
        Array.from({ length: 8 }, (unused, bit) => readBitAt(bytes, bit)),
        [ 1, 0, 0, 0, 0, 0, 0, 1 ]
    );
});

test("readBitsAt accumulates towards the high bit and crosses byte boundaries", () =>
{
    const bytes = new Uint8Array([ 0b1010_0101, 0b0000_0011 ]);

    assert.equal(readBitsAt(bytes, 0, 4), 0b0101);
    assert.equal(readBitsAt(bytes, 4, 4), 0b1010);
    // Six bits from bit 6: two high bits of byte 0 (0b10) then four low of
    // byte 1 (0b0011), the second group shifted up by two.
    assert.equal(readBitsAt(bytes, 6, 6), 0b0011_10);
});

test("readBitsAt of zero bits is zero and consumes nothing", () =>
{
    assert.equal(readBitsAt(new Uint8Array([ 0xff ]), 0, 0), 0);
});

test("ReadBit walks LSB-first and tracks position", () =>
{
    const reader = new CjsBitReader(new Uint8Array([ 0x81 ]));

    assert.equal(reader.remaining, 8);
    assert.equal(reader.ReadBit(), 1);
    assert.equal(reader.totalBitsRead, 1);
    assert.equal(reader.isAligned, false);

    for (let i = 0; i < 6; i++) assert.equal(reader.ReadBit(), 0);
    assert.equal(reader.ReadBit(), 1);

    assert.equal(reader.remaining, 0);
    assert.equal(reader.isAligned, true);
});

test("ReadBits matches a bit-by-bit read of the same source", () =>
{
    const bytes = new Uint8Array([ 0x4d, 0x9c, 0x2a, 0xf1, 0x05, 0xbe ]);

    // The bulk path takes whole bytes at a time; this proves it agrees with the
    // one-bit-at-a-time definition for every split of every width.
    for (let width = 1; width <= 32; width++)
    {
        for (let start = 0; start + width <= bytes.length * 8; start++)
        {
            const bulk = new CjsBitReader(bytes);
            bulk.bitPosition = start;

            const single = new CjsBitReader(bytes);
            single.bitPosition = start;

            let expected = 0;
            for (let bit = 0; bit < width; bit++)
            {
                expected |= single.ReadBit() << bit;
            }

            assert.equal(
                bulk.ReadBits(width),
                expected >>> 0,
                `width ${width} at bit ${start}`
            );
            assert.equal(bulk.bitPosition, single.bitPosition);
        }
    }
});

test("Align discards up to the next byte boundary and reports how many", () =>
{
    const reader = new CjsBitReader(new Uint8Array([ 0xff, 0xff ]));

    assert.equal(reader.Align(), 0, "already aligned discards nothing");
    reader.ReadBits(3);
    assert.equal(reader.Align(), 5);
    assert.equal(reader.bitPosition, 8);
    assert.equal(reader.isAligned, true);
});

test("ReadAlignedBytes aligns first and returns a view, not a copy", () =>
{
    const
        bytes = new Uint8Array([ 0x01, 0xaa, 0xbb, 0xcc ]),
        reader = new CjsBitReader(bytes);

    reader.ReadBits(2);
    const view = reader.ReadAlignedBytes(3);

    assert.deepEqual(Array.from(view), [ 0xaa, 0xbb, 0xcc ]);
    assert.equal(view.buffer, bytes.buffer, "a view shares the source buffer");
    assert.equal(reader.remaining, 0);
});

test("reading past the end throws by default, naming the position", () =>
{
    const reader = new CjsBitReader(new Uint8Array([ 0xff ]), { source: "unit" });
    reader.ReadBits(8);

    assert.throws(() => reader.ReadBit(), (error) =>
    {
        assert.equal(error.name, "CjsFormatRangeError");
        // The lineage is load-bearing: BNK parsers sort a truncated object from a
        // semantic failure with `error instanceof RangeError`, so a reader that
        // threw a plain Error would turn a skippable object into a crash.
        assert.ok(error instanceof RangeError);
        assert.equal(error.code, "CJS_FORMAT_RANGE_ERROR");
        // State is nested under `details`.
        assert.equal(error.details.source, "unit");
        assert.equal(error.details.endBit, 8);
        assert.equal(error.details.bitPosition, 8);
        return true;
    });

    // A partial read must fail rather than return the bits it did have.
    const partial = new CjsBitReader(new Uint8Array([ 0xff ]));
    assert.throws(() => partial.ReadBits(9));
});

test("endBit bounds the cursor in bits, for block codecs", () =>
{
    // A BC7 block is 128 bits inside a longer surface buffer.
    const
        bytes = new Uint8Array(32).fill(0xff),
        reader = new CjsBitReader(bytes, { endBit: 128 });

    assert.equal(reader.remaining, 128);
    reader.ReadBits(32);
    reader.ReadBits(32);
    reader.ReadBits(32);
    reader.ReadBits(32);
    assert.equal(reader.remaining, 0);
    assert.throws(() => reader.ReadBit(), /end of bitstream/i);
});

test("offset starts the cursor at a byte and totalBitsRead counts from there", () =>
{
    const reader = new CjsBitReader(new Uint8Array([ 0x00, 0x01 ]), { offset: 1 });

    assert.equal(reader.bitPosition, 8);
    assert.equal(reader.totalBitsRead, 0);
    assert.equal(reader.ReadBit(), 1);
    assert.equal(reader.totalBitsRead, 1);
});

test("Exhausted is the hook a non-fatal end overrides", () =>
{
    // Vorbis needs end-of-packet to be a terminal condition, not a throw.
    class PacketReader extends CjsBitReader
    {
        eop = false;

        Exhausted()
        {
            this.eop = true;
            return -1;
        }
    }

    const reader = new PacketReader(new Uint8Array([ 0x03 ]));

    assert.equal(reader.ReadBits(2), 3);
    assert.equal(reader.ReadBits(6), 0);
    assert.equal(reader.eop, false);
    assert.equal(reader.ReadBits(1), -1);
    assert.equal(reader.eop, true);
});

test("subclasses replace the error class and message", () =>
{
    class MyError extends Error {}
    class MyBitReader extends CjsBitReader
    {
        static ReadError = MyError;
        static endOfDataMessage = "my bitstream ran out";
    }

    const reader = new MyBitReader(new Uint8Array(0));
    assert.throws(() => reader.ReadBit(), MyError);
    assert.throws(() => reader.ReadBit(), /my bitstream ran out/);
});
