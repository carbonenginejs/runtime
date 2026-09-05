import test from "node:test";
import assert from "node:assert/strict";
import DefaultFormat, { CjsIESFormat } from "@carbonenginejs/runtime/resource/formats/ies";
import { CjsFormat } from "../../../../../src/resource/format/CjsFormat.js";

// Synthetic two-plane photometry: deliberately unequal slices and a multiplier
// other than one catch readers that discard planes or bake resource conversion.
const header = "IESNA:LM-63-1995\n[TEST] Synthetic two-plane fixture";
const numbers = [1, -1, 2.5, 3, 2, 1, 2, 0.2, 0.3, 0.4, 1, 1, 12,
    0, 90, 180, 0, 180, 0, 10, 20, 30, 40, 50];
const bytes = (values = numbers, tilt = "NONE") =>
    new TextEncoder().encode(`${header}\nTILT=${tilt}\n${values.join(" ")}\n`);

test("reads every authored plane without normalization or multiplication", () =>
{
    const result = CjsIESFormat.read(bytes());
    assert.equal(result.headerText, header);
    assert.equal(result.tilt, "NONE");
    assert.equal(result.candelaMultiplier, 2.5);
    assert.equal(result.lumensPerLamp, -1);
    assert.deepEqual(result.verticalAngles, [0, 90, 180]);
    assert.deepEqual(result.horizontalAngles, [0, 180]);
    assert.deepEqual(result.candelaValues, [0, 10, 20, 30, 40, 50]);
    assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
    assert.equal(result.width, 0.2);
    assert.equal(result.inputWatts, 12);
});

test("respects byte offsets for typed arrays and DataViews", () =>
{
    const input = bytes();
    const padded = new Uint8Array(input.length + 16).fill(255);
    padded.set(input, 8);
    const expected = CjsIESFormat.read(input.buffer);
    assert.deepEqual(CjsIESFormat.read(padded.subarray(8, 8 + input.length)), expected);
    assert.deepEqual(CjsIESFormat.read(new DataView(padded.buffer, 8, input.length)), expected);
});

test("accepts CRLF, comma separators and decimal exponents", () =>
{
    const text = `${header.replaceAll("\n", "\r\n")}\r\nTILT=NONE\r\n${numbers.join(", ").replace("2.5", "+2.5e0")}\r\n`;
    assert.deepEqual(CjsIESFormat.read(new TextEncoder().encode(text)), {
        ...CjsIESFormat.read(bytes()), headerText: header.replaceAll("\n", "\r\n")
    });
});

test("exposes the shared format contract and validates inspection", async () =>
{
    assert.equal(DefaultFormat, CjsIESFormat);
    CjsFormat.validateContract(CjsIESFormat);
    assert.ok(Object.isFrozen(CjsIESFormat.outputs));
    const format = new CjsIESFormat({ source: "fixture.ies" });
    const expected = CjsIESFormat.read(bytes());
    assert.deepEqual(format.Read(bytes()), expected);
    assert.deepEqual(await format.ReadAsync(bytes()), expected);
    assert.deepEqual(await CjsIESFormat.readAsync(bytes()), expected);
    const { candelaValues, ...metadata } = expected;
    assert.deepEqual(format.Inspect(bytes()), metadata);
    assert.equal(CjsIESFormat.is(bytes()), true);
    assert.equal(CjsIESFormat.getSupport(bytes()).verified, false);
    const support = await CjsIESFormat.verifySupport(bytes());
    assert.equal(support.supported, true);
    assert.equal(support.verified, true);
    assert.throws(() => format.Read(bytes(numbers.slice(0, -1))), /fixture\.ies/);
});

test("rejects unsupported tilt and malformed bytes", () =>
{
    for (const tilt of ["INCLUDE", "external.tlt"])
        assert.throws(() => CjsIESFormat.read(bytes(numbers, tilt)), /unsupported TILT/);
    assert.throws(() => CjsIESFormat.read(new TextEncoder().encode(header)), /missing TILT/);
    assert.throws(() => CjsIESFormat.read(new Uint8Array([255])), /UTF-8/);
    assert.throws(() => CjsIESFormat.read("fixture.ies"), /bytes/);
});

test("rejects incomplete tables, extra data and unsafe counts before allocation", () =>
{
    assert.throws(() => CjsIESFormat.read(bytes(numbers.slice(0, 8))), /truncated photometric header/);
    assert.throws(() => CjsIESFormat.read(bytes(numbers.slice(0, -1))), /truncated angle or candela/);
    assert.throws(() => CjsIESFormat.inspect(bytes(numbers.slice(0, -1))), /truncated/);
    assert.throws(() => CjsIESFormat.read(bytes([...numbers, 1])), /trailing/);
    for (const count of [0, -1, 1.5, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER + 1])
    {
        const values = [...numbers]; values[3] = count;
        assert.throws(() => CjsIESFormat.read(bytes(values)), /counts|integer|truncated/);
    }
});

test("rejects nonnumeric and nonfinite fields in headers, angles and samples", () =>
{
    for (const index of [2, 13, numbers.length - 1])
    {
        for (const value of ["NaN", "Infinity", "1e999", "10oops", "0x10"])
        {
            const values = [...numbers]; values[index] = value;
            assert.throws(() => CjsIESFormat.read(bytes(values)), /invalid number/);
        }
    }
});

test("rejects unsupported options and identifies malformed input as unsupported", async () =>
{
    for (const options of [null, [], { mipmaps: true }, { emit: "texture" }])
        assert.throws(() => CjsIESFormat.read(bytes(), options), TypeError);
    assert.equal(CjsIESFormat.is(bytes(numbers.slice(0, -1))), false);
    const support = await CjsIESFormat.verifySupport(bytes(numbers.slice(0, -1)));
    assert.equal(support.supported, false);
    assert.equal(support.verified, true);
});
