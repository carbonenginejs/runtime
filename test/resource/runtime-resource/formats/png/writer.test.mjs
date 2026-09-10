import assert from "node:assert/strict";
import test from "node:test";
import CjsPngFormat from "../../../../../src/resource/formats/png/index.js";

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

test("writes a PNG the reader reads back exactly", async () =>
{
    // Lossless is the whole reason this exists beside the JPEG writer, so the
    // assertion is equality rather than a tolerance - including the alpha the
    // JPEG path cannot carry at all.
    const source = payload(24, 16, (x, y) => [ x * 10, y * 15, (x + y) * 6, x * 10 ]);

    for (const [ name, bytes ] of [
        [ "stored", CjsPngFormat.write(source) ],
        [ "deflated", await CjsPngFormat.writeAsync(source) ],
    ])
    {
        assert.equal(CjsPngFormat.isPNG(bytes), true, `${name} should be a PNG`);

        const decoded = await CjsPngFormat.readAsync(bytes, { emit: "rgba" });

        assert.equal(decoded.width, source.width);
        assert.equal(decoded.height, source.height);
        assert.deepEqual(Array.from(decoded.data), Array.from(source.data), `${name} lost pixels`);
    }
});

test("compressing is smaller than storing, and both are valid", async () =>
{
    // A gradient is what deflate is good at; the point is not the ratio but
    // that the sync path trades size for needing no await, and says so.
    const source = payload(64, 64, (x, y) => [ x * 4, y * 4, 128 ]);
    const stored = CjsPngFormat.write(source);
    const deflated = await CjsPngFormat.writeAsync(source);

    assert.ok(
        deflated.byteLength < stored.byteLength,
        `deflated ${deflated.byteLength} should beat stored ${stored.byteLength}`,
    );
    assert.ok(stored.byteLength >= source.data.byteLength, "stored blocks cannot compress");
});

test("honours stride and origin from the payload", async () =>
{
    const top = payload(8, 8, (_x, y) => [ y * 30, y * 30, y * 30 ]);
    const bottom = { ...top, origin: "bottom-left" };
    const asTop = await CjsPngFormat.readAsync(await CjsPngFormat.writeAsync(top), { emit: "rgba" });
    const asBottom = await CjsPngFormat.readAsync(
        await CjsPngFormat.writeAsync(bottom),
        { emit: "rgba" },
    );

    assert.equal(asTop.data[0], 0);
    assert.equal(asBottom.data[0], 210);

    // Padded rows must be read as pixels-then-padding, not as a wider image.
    const stride = 8 * 4 + 12;
    const padded = { width: 8, height: 8, strideBytes: stride, data: new Uint8Array(stride * 8) };

    padded.data.fill(77);

    const decoded = await CjsPngFormat.readAsync(
        await CjsPngFormat.writeAsync(padded),
        { emit: "rgba" },
    );

    assert.equal(decoded.width, 8);
    assert.equal(decoded.data[0], 77);
});

test("refuses payloads it cannot encode", () =>
{
    assert.throws(() => CjsPngFormat.write({ width: 0, height: 4, data: new Uint8Array(0) }), /width/u);
    assert.throws(
        () => CjsPngFormat.write({ width: 8, height: 8, data: new Uint8Array(16) }),
        /short of/u,
    );
});

test("accepts compression method 0 and refuses every other", () =>
{
    // PNG defines one compression method. Writing 0 regardless of what was
    // asked would leave the file correct and the caller's belief about it
    // wrong, which is the failure worth refusing.
    const source = payload(8, 8, () => [ 20, 40, 60 ]);

    assert.deepEqual(
        Array.from(CjsPngFormat.write(source, { compression: 0 })),
        Array.from(CjsPngFormat.write(source)),
    );

    for (const method of [ 1, 8, "deflate", -1 ])
    {
        assert.throws(
            () => CjsPngFormat.write(source, { compression: method }),
            /compression method/u,
            `compression ${JSON.stringify(method)} should be refused`,
        );
    }

    assert.equal(CjsPngFormat.write(source)[26], 0, "IHDR must record method 0");
});

test("declares what it can be written from", () =>
{
    assert.equal(CjsPngFormat.canWrite(), true);
    assert.equal(CjsPngFormat.canWrite("rgba"), true);
    assert.equal(CjsPngFormat.canWrite("image"), false);

    const capability = CjsPngFormat.getInputCapability();

    assert.equal(capability.input, "rgba");
    assert.equal(capability.lossy, false, "PNG is exact");
    assert.equal(capability.writeMode, "async", "the compressing path is the real one");
    assert.ok(capability.options.includes("compression"));
});

test("an instance writes the same bytes as the static", () =>
{
    const source = payload(8, 8, (x) => [ x * 30, 40, 90 ]);
    const instance = new CjsPngFormat();

    assert.deepEqual(
        Array.from(instance.Write(source)),
        Array.from(CjsPngFormat.write(source)),
    );
});
