import assert from "node:assert/strict";
import test from "node:test";
import CjsTgaFormat from "../../../../../src/resource/formats/tga/index.js";

/** An RGBA payload in the shape the image formats emit for `rgba`. */
function payload(width, height, fill)
{
    const data = new Uint8Array(width * height * 4);

    for (let y = 0; y < height; y++)
    {
        for (let x = 0; x < width; x++)
        {
            const offset = (y * width + x) * 4;
            const [ r, g, b, a = 255 ] = fill(x, y);

            data[offset] = r;
            data[offset + 1] = g;
            data[offset + 2] = b;
            data[offset + 3] = a;
        }
    }

    return { width, height, data, strideBytes: width * 4, origin: "top-left" };
}

test("writes a TGA the reader reads back exactly, compressed or not", () =>
{
    const source = payload(20, 12, (x, y) => [ x * 12, y * 20, (x * y) % 256, 255 - x * 10 ]);

    for (const compress of [ false, true ])
    {
        const bytes = CjsTgaFormat.write(source, { compress });
        const decoded = CjsTgaFormat.read(bytes, { emit: "rgba" });

        assert.equal(decoded.width, source.width);
        assert.equal(decoded.height, source.height);
        assert.deepEqual(
            Array.from(decoded.data),
            Array.from(source.data),
            `compress: ${compress} lost pixels`,
        );
    }
});

test("stores channels as BGRA, which is the trap in this format", () =>
{
    // Checked at the bytes rather than through the reader: a writer and reader
    // that swap the same way agree with each other and with nothing else.
    const bytes = CjsTgaFormat.write(payload(1, 1, () => [ 10, 20, 30, 40 ]));

    assert.equal(bytes[18], 30, "blue first");
    assert.equal(bytes[19], 20, "then green");
    assert.equal(bytes[20], 10, "then red");
    assert.equal(bytes[21], 40, "then alpha");
});

test("declares top-left origin rather than relying on the default", () =>
{
    // Bit 5 of the descriptor. Without it a reader starts at the bottom row,
    // and the picture arrives upside down for no visible reason.
    const bytes = CjsTgaFormat.write(payload(4, 4, () => [ 1, 2, 3 ]));

    assert.equal(bytes[17] & 0x20, 0x20);

    const top = payload(4, 4, (_x, y) => [ y * 60, y * 60, y * 60 ]);
    const bottom = { ...top, origin: "bottom-left" };

    assert.equal(CjsTgaFormat.read(CjsTgaFormat.write(top), { emit: "rgba" }).data[0], 0);
    assert.equal(CjsTgaFormat.read(CjsTgaFormat.write(bottom), { emit: "rgba" }).data[0], 180);
});

test("run-length encoding survives its worst case", () =>
{
    // Alternating pixels defeat RLE: every packet is a one-pixel literal, so
    // the output is LARGER than the input. Sizing the buffer for the best case
    // instead of this one is an out-of-bounds write, not a bad ratio.
    const noisy = payload(64, 64, (x, y) => [ (x + y) % 2 ? 0 : 255, 128, (x * 7) % 256 ]);
    const compressed = CjsTgaFormat.write(noisy, { compress: true });

    assert.deepEqual(
        Array.from(CjsTgaFormat.read(compressed, { emit: "rgba" }).data),
        Array.from(noisy.data),
    );

    // And flat colour is where it pays.
    const flat = payload(64, 64, () => [ 90, 90, 90 ]);

    assert.ok(
        CjsTgaFormat.write(flat, { compress: true }).byteLength
            < CjsTgaFormat.write(flat).byteLength / 10,
    );
});

test("refuses payloads it cannot encode", () =>
{
    assert.throws(() => CjsTgaFormat.write({ width: 0, height: 4, data: new Uint8Array(0) }), /width/u);
    assert.throws(
        () => CjsTgaFormat.write({ width: 8, height: 8, data: new Uint8Array(16) }),
        /short of/u,
    );
    assert.throws(
        () => CjsTgaFormat.write({ width: 70000, height: 1, data: new Uint8Array(70000 * 4) }),
        /65535/u,
    );
});

test("an instance writes the same bytes as the static", () =>
{
    const source = payload(8, 8, (x) => [ x * 30, 40, 90 ]);
    const instance = new CjsTgaFormat();

    assert.deepEqual(
        Array.from(instance.Write(source)),
        Array.from(CjsTgaFormat.write(source)),
    );
});

test("declares what it can be written from", () =>
{
    assert.equal(CjsTgaFormat.canWrite(), true);
    assert.equal(CjsTgaFormat.canWrite("rgba"), true);

    const capability = CjsTgaFormat.getInputCapability();

    assert.equal(capability.input, "rgba");
    assert.equal(capability.lossy, false);
    assert.equal(capability.writeMode, "sync");
    assert.ok(capability.options.includes("compress"));
});
