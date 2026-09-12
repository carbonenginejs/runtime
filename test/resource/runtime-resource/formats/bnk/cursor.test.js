import test from "node:test";
import assert from "node:assert/strict";

import { WwiseCursor } from "../../../../../src/resource/formats/bnk/core/nodeBase.js";

// WwiseCursor is now the only cursor in this format; `ActionCursor`,
// `GlobalSettingsCursor` and `MusicCursor` were private re-implementations of it
// and their distinctive members moved here. Nothing constructed the cursor
// directly before, so every member below was reachable only through a parser —
// which is why a big-endian s16 and a disabled count guard both went unnoticed.

const cursorOver = (...bytes) => new WwiseCursor(new Uint8Array(bytes));

test("rejects a range it cannot honour", () =>
{
    const bytes = new Uint8Array(4);

    assert.throws(() => new WwiseCursor(bytes, 0, 5), TypeError);
    assert.throws(() => new WwiseCursor(bytes, 3, 2), TypeError);
    assert.throws(() => new WwiseCursor(bytes, -1), TypeError);
    assert.throws(() => new WwiseCursor([ 0, 1 ]), TypeError);
});

test("reads every integer width little-endian", () =>
{
    const cursor = cursorOver(
        0xff,                    // u8  255
        0xff,                    // s8  -1
        0x34, 0x12,              // u16 0x1234
        0xfe, 0xff,              // s16 -2
        0x78, 0x56, 0x34, 0x12,  // u32 0x12345678
        0xff, 0xff, 0xff, 0xff   // s32 -1
    );

    assert.equal(cursor.u8(), 255);
    assert.equal(cursor.s8(), -1);
    assert.equal(cursor.u16(), 0x1234);
    assert.equal(cursor.s16(), -2);
    assert.equal(cursor.u32(), 0x12345678);
    assert.equal(cursor.s32(), -1);
    assert.equal(cursor.remaining, 0);
});

test("s16 is little-endian and signed", () =>
{
    // 0x0100 little-endian is 1; big-endian it is 256. Loop counts of 0 and -1
    // read the same either way, which is how the byte order went unpinned.
    assert.equal(cursorOver(0x00, 0x01).s16(), 256);
    assert.equal(cursorOver(0x01, 0x00).s16(), 1);
    assert.equal(cursorOver(0x00, 0x80).s16(), -32768);
});

test("f32 and f64 are little-endian", () =>
{
    assert.equal(cursorOver(0x00, 0x00, 0x80, 0x3f).f32(), 1);
    assert.equal(
        cursorOver(0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf0, 0x3f).f64(),
        1
    );
});

test("finiteF32 rejects a non-finite value but still consumes it", () =>
{
    const finite = cursorOver(0x00, 0x00, 0x80, 0x3f);
    assert.equal(finite.finiteF32(), 1);

    // The four bytes are spent either way, so the cursor must be past the field
    // a caller just rejected.
    for (const bytes of [
        [ 0x00, 0x00, 0x80, 0x7f ],  // +Infinity
        [ 0x00, 0x00, 0x80, 0xff ],  // -Infinity
        [ 0x00, 0x00, 0xc0, 0x7f ]   // NaN
    ])
    {
        const cursor = cursorOver(...bytes);
        assert.throws(() => cursor.finiteF32(), RangeError);
        assert.equal(cursor.at, 4, "the rejected field is still consumed");
    }
});

test("readBoundedCount refuses a count the payload cannot hold", () =>
{
    // Count 2, stride 4, and 8 bytes left: exactly enough.
    const exact = new WwiseCursor(new Uint8Array([ 2, 0, 0, 0, ...new Array(8).fill(0) ]));
    assert.equal(exact.readBoundedCount(4), 2);

    // Count 3 with only 8 bytes left cannot be honoured at stride 4.
    const overrun = new WwiseCursor(new Uint8Array([ 3, 0, 0, 0, ...new Array(8).fill(0) ]));
    assert.throws(() => overrun.readBoundedCount(4), RangeError);

    // The pathological case this guard exists for: a corrupt huge count that
    // would otherwise drive an allocation for a table that is not there.
    const corrupt = cursorOver(0xff, 0xff, 0xff, 0xff, 0x00);
    assert.throws(() => corrupt.readBoundedCount(1), RangeError);
});

test("stringZ decodes byte-for-byte and consumes the terminator", () =>
{
    const cursor = cursorOver(0x41, 0x42, 0x00, 0x43, 0x00);

    assert.equal(cursor.stringZ(), "AB");
    assert.equal(cursor.at, 3, "the NUL is consumed");
    assert.equal(cursor.stringZ(), "C");

    // Not UTF-8: a high byte decodes as its own code point, which is the
    // behaviour the music marker comparisons depend on.
    assert.equal(cursorOver(0xe9, 0x00).stringZ(), "é");
    assert.equal(cursorOver(0x00).stringZ(), "", "an empty string is legal");
});

test("stringZ stops at the cursor end rather than running into the buffer", () =>
{
    // An unterminated string must not read past the bounded range.
    const cursor = new WwiseCursor(new Uint8Array([ 0x41, 0x42, 0x43 ]), 0, 2);
    assert.equal(cursor.stringZ(), "AB");
});

test("every read is bounds-checked, and the failure is a RangeError", () =>
{
    // A RangeError specifically: the BNK parsers sort a truncated object from a
    // semantic failure on that type, returning null for the former.
    for (const method of [ "u8", "s8", "u16", "s16", "u32", "s32", "f32", "f64", "finiteF32" ])
    {
        const cursor = new WwiseCursor(new Uint8Array(0));
        assert.throws(() => cursor[method](), RangeError, method);
    }

    const partial = cursorOver(0x01, 0x02);
    assert.throws(() => partial.u32(), RangeError, "a partial read must fail, not truncate");
});

test("ensure validates the requested size, not just the bound", () =>
{
    const cursor = cursorOver(0x00, 0x01, 0x02, 0x03);

    assert.throws(() => cursor.ensure(-1), RangeError);
    assert.throws(() => cursor.ensure(1.5), RangeError);
    assert.throws(() => cursor.ensure(5), RangeError);
    cursor.ensure(4);
});

test("variable reads Wwise base-128 and rejects a non-canonical encoding", () =>
{
    assert.equal(cursorOver(0x00).variable(), 0);
    assert.equal(cursorOver(0x7f).variable(), 127);
    // 0x81 0x00 is 128: continuation bit set, then a final zero septet.
    assert.equal(cursorOver(0x81, 0x00).variable(), 128);

    // A leading 0x80 is a zero with a continuation bit — not canonical.
    assert.throws(() => cursorOver(0x80, 0x01).variable(), RangeError);
    // Truncated: continuation bit set with nothing following.
    assert.throws(() => cursorOver(0x81).variable(), RangeError);
});

test("the cursor honours a bounded window, not the whole buffer", () =>
{
    const
        bytes = new Uint8Array([ 0xaa, 0x01, 0x02, 0xbb ]),
        cursor = new WwiseCursor(bytes, 1, 3);

    assert.equal(cursor.remaining, 2);
    assert.equal(cursor.u16(), 0x0201);
    assert.equal(cursor.remaining, 0);
    assert.throws(() => cursor.u8(), RangeError, "the window ends before the buffer does");
});
