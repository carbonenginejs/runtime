import assert from "node:assert/strict";
import test from "node:test";
import {
    decompressBitKnit2,
    encodeBitKnit2Raw
} from "../../../../../src/resource/formats/gr2/core/bitknit2.js";

const QUANTUM_BYTES = 0x10000;

test("encodes exact BitKnit2 raw-quantum byte sequences", () =>
{
    assert.deepEqual(encodeBitKnit2Raw(new Uint8Array()), new Uint8Array());
    assert.deepEqual(
        encodeBitKnit2Raw(new Uint8Array([ 0xaa ])),
        new Uint8Array([ 0xb1, 0x75, 0, 0, 0xaa, 0 ])
    );
    assert.deepEqual(
        encodeBitKnit2Raw(new Uint8Array([ 0xaa, 0xbb ])),
        new Uint8Array([ 0xb1, 0x75, 0, 0, 0xaa, 0xbb ])
    );
    assert.deepEqual(
        encodeBitKnit2Raw(new Uint8Array([ 0xaa, 0xbb, 0xcc ])),
        new Uint8Array([ 0xb1, 0x75, 0, 0, 0xaa, 0xbb, 0xcc, 0 ])
    );
});

test("round-trips raw quanta across BitKnit2 boundaries", () =>
{
    for (const length of [ 0, 1, 2, 3, 65535, 65536, 65537, 131072, 131073 ])
    {
        const source = Uint8Array.from({ length }, (_, index) => index * 131 + 17);
        const before = source.slice();
        const packed = encodeBitKnit2Raw(source);
        const expectedLength = length === 0
            ? 0
            : 2 + 2 * Math.ceil(length / QUANTUM_BYTES) + length + (length & 1);

        assert.equal(packed.length, expectedLength, `packed length ${length}`);
        assert.deepEqual(decompressBitKnit2(packed, length), source, `round-trip ${length}`);
        assert.deepEqual(source, before, `input unchanged ${length}`);
        if (length & 1) assert.equal(packed.at(-1), 0, `final padding ${length}`);
    }
});

test("starts a second raw quantum after exactly 65,536 bytes", () =>
{
    const packed = encodeBitKnit2Raw(new Uint8Array(65537).fill(0xaa));
    assert.deepEqual(packed.subarray(0, 4), new Uint8Array([ 0xb1, 0x75, 0, 0 ]));
    assert.deepEqual(packed.subarray(65540, 65544), new Uint8Array([ 0, 0, 0xaa, 0 ]));
});
