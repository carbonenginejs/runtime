import assert from "node:assert/strict";
import test from "node:test";
import CjsJpegFormat from "../../../../../src/resource/formats/jpeg/index.js";


/** An opaque RGBA payload in the shape the image formats emit for `rgba`. */
function payload(width, height, fill)
{
    const data = new Uint8Array(width * height * 4);

    for (let y = 0; y < height; y++)
    {
        for (let x = 0; x < width; x++)
        {
            const offset = (y * width + x) * 4;
            const [ r, g, b ] = fill(x, y);

            data[offset] = r;
            data[offset + 1] = g;
            data[offset + 2] = b;
            data[offset + 3] = 255;
        }
    }

    return { width, height, data, strideBytes: width * 4, origin: "top-left" };
}

/** Mean absolute RGB difference between a source payload and a decode. */
function meanError(source, decoded)
{
    let total = 0;
    let count = 0;

    for (let index = 0; index < source.data.length; index += 4)
    {
        for (let channel = 0; channel < 3; channel++)
        {
            total += Math.abs(source.data[index + channel] - decoded.data[index + channel]);
            count += 1;
        }
    }

    return total / count;
}

test("writes a baseline JPEG a decoder can read back", () =>
{
    const source = payload(32, 32, (x, y) => [ x * 8, y * 8, 128 ]);
    const bytes = CjsJpegFormat.write(source, { quality: 0.95 });

    assert.equal(CjsJpegFormat.isJPEG(bytes), true);
    assert.equal(bytes[0], 0xff);
    assert.equal(bytes[1], 0xd8);
    assert.equal(bytes.at(-2), 0xff);
    assert.equal(bytes.at(-1), 0xd9);

    const decoded = CjsJpegFormat.read(bytes, { emit: "rgba" });

    assert.equal(decoded.width, 32);
    assert.equal(decoded.height, 32);
});

test("round-trips flat colour exactly and detail closely", () =>
{
    // Flat colour exercises only the DC path, so it must be exact - any loss
    // here is a quantisation or level-shift error rather than the lossiness
    // the format is allowed.
    const flat = payload(16, 16, () => [ 200, 30, 30 ]);

    assert.equal(
        meanError(flat, CjsJpegFormat.read(CjsJpegFormat.write(flat, { quality: 0.95 }), { emit: "rgba" })),
        0,
    );

    // Both gradient directions, because a transposed index in either the
    // encoder or the decoder passes one of them and fails the other - which is
    // exactly how the decoder's inverted zigzag table stayed hidden.
    for (const [ name, fill ] of [
        [ "horizontal", (x) => [ x * 16, x * 16, x * 16 ] ],
        [ "vertical", (_x, y) => [ y * 16, y * 16, y * 16 ] ],
    ])
    {
        const source = payload(16, 16, fill);
        const decoded = CjsJpegFormat.read(
            CjsJpegFormat.write(source, { quality: 0.95 }),
            { emit: "rgba" },
        );

        assert.ok(
            meanError(source, decoded) < 3,
            `${name} gradient lost too much: ${meanError(source, decoded)}`,
        );
    }
});

test("takes the payload shape the image formats emit, including its origin", () =>
{
    // The point of the writer: whatever a reader in this package emits for
    // `rgba` is what this accepts, with no adaptation at the call site. That
    // shape carries an origin, and honouring it is the difference between a
    // converted TGA arriving upright and arriving upside down.
    const top = payload(16, 16, (_x, y) => [ y * 16, y * 16, y * 16 ]);
    const bottom = { ...top, origin: "bottom-left" };
    const asTop = CjsJpegFormat.read(CjsJpegFormat.write(top), { emit: "rgba" });
    const asBottom = CjsJpegFormat.read(CjsJpegFormat.write(bottom), { emit: "rgba" });

    // Same rows, opposite ends: dark at the top one way, dark at the bottom the
    // other. Compared loosely because the format is lossy, not because the flip
    // is approximate.
    assert.ok(asTop.data[0] < 40, `top-left should start dark, got ${asTop.data[0]}`);
    assert.ok(asBottom.data[0] > 200, `bottom-left should start light, got ${asBottom.data[0]}`);

    const lastRow = (16 * 15) * 4;

    assert.ok(asTop.data[lastRow] > 200);
    assert.ok(asBottom.data[lastRow] < 40);

    // And the field names are read from the payload rather than assumed: a
    // stride wider than the visible pixels must not shear the picture.
    const padded = { width: 8, height: 8, strideBytes: 8 * 4 + 16, data: new Uint8Array((8 * 4 + 16) * 8) };

    padded.data.fill(90);
    assert.equal(CjsJpegFormat.read(CjsJpegFormat.write(padded), { emit: "rgba" }).width, 8);
});

test("quality changes size, and both subsamplings are readable", () =>
{
    const source = payload(64, 64, (x, y) => [ (x * 7) % 256, (y * 11) % 256, (x * y) % 256 ]);
    const low = CjsJpegFormat.write(source, { quality: 0.3 });
    const high = CjsJpegFormat.write(source, { quality: 0.95 });

    assert.ok(low.byteLength < high.byteLength, "lower quality must be smaller");

    for (const subsampling of [ "4:2:0", "4:4:4" ])
    {
        const decoded = CjsJpegFormat.read(
            CjsJpegFormat.write(source, { quality: 0.9, subsampling }),
            { emit: "rgba" },
        );

        assert.equal(decoded.width, 64);
        assert.equal(decoded.height, 64);
    }
});

test("refuses payloads it cannot encode", () =>
{
    assert.throws(() => CjsJpegFormat.write({ width: 0, height: 8, data: new Uint8Array(0) }), /width/u);
    assert.throws(
        () => CjsJpegFormat.write({ width: 8, height: 8, data: new Uint8Array(16) }),
        /short of/u,
    );
    assert.throws(
        () => CjsJpegFormat.write(payload(8, 8, () => [ 0, 0, 0 ]), { quality: 5 }),
        /quality/u,
    );
    assert.throws(
        () => CjsJpegFormat.write(payload(8, 8, () => [ 0, 0, 0 ]), { subsampling: "4:1:1" }),
        /subsampling/u,
    );
});

test("an instance writes the same bytes as the static", () =>
{
    const source = payload(16, 16, (x) => [ x * 16, 64, 200 ]);
    const instance = new CjsJpegFormat();

    assert.deepEqual(
        Array.from(instance.Write(source, { quality: 0.8 })),
        Array.from(CjsJpegFormat.write(source, { quality: 0.8 })),
    );
});

test("declares what it can be written from, and that it is lossy", () =>
{
    // Declared rather than inferred: a converter choosing JPEG to save space
    // needs to know it will lose the alpha channel BEFORE it writes, and the
    // presence of a `write` method says nothing about that.
    assert.equal(CjsJpegFormat.canWrite(), true);
    assert.equal(CjsJpegFormat.canWrite("rgba"), true);
    assert.equal(CjsJpegFormat.canWrite("nonsense"), false);

    const capability = CjsJpegFormat.getInputCapability();

    assert.equal(capability.input, "rgba");
    assert.equal(capability.lossy, true);
    assert.equal(capability.writeMode, "sync");
    assert.deepEqual(capability.options, [ "quality", "subsampling" ]);
});
