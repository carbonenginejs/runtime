import assert from "node:assert/strict";
import test from "node:test";

import { CjsFsd64Reader } from "../../../src/formats/fsd/64/index.js";

test("exports the Cjs-prefixed reader from the 64-bit format entry point", () =>
{
    assert.equal(typeof CjsFsd64Reader, "function");
});

test("dispatches caller-supplied bytes to an exact registered reader", async () =>
{
    const fsd = new CjsFsd64Reader();
    const input = Uint8Array.from([ 7, 11, 13 ]);

    fsd.Register("RES:\\StaticData\\Example.fsdbinary", {
        Read(bytes, context)
        {
            assert.equal(bytes.buffer, input.buffer);
            assert.equal(context.path, "res:/staticdata/example.fsdbinary");
            assert.equal(context.build, "synthetic");
            return [ ...bytes ];
        },
    });

    const result = await fsd.Read(input, {
        path: "res:/staticdata/example.fsdbinary",
        build: "synthetic",
    });

    assert.deepEqual(result, [ 7, 11, 13 ]);
    assert.deepEqual(fsd.List(), [ "res:/staticdata/example.fsdbinary" ]);
});

test("supports function shorthand and bounded ArrayBuffer views", async () =>
{
    const fsd = new CjsFsd64Reader();
    const source = Uint8Array.from([ 1, 2, 3, 4 ]);
    const view = new DataView(source.buffer, 1, 2);

    fsd.Register("example", bytes => [ ...bytes ]);

    assert.deepEqual(await fsd.Read(view, { path: "example" }), [ 2, 3 ]);
});

test("dispatches JSON decoding only to schema-backed readers", async () =>
{
    const fsd = new CjsFsd64Reader();
    const input = Uint8Array.from([ 3, 5, 8 ]);

    fsd.Register("json", {
        Read()
        {
            return new Map();
        },
        ReadJSON(bytes, context)
        {
            return {
                path: context.path,
                values: [ ...bytes ],
            };
        },
    });
    fsd.Register("map-only", () => new Map());

    assert.deepEqual(await fsd.ReadJSON(input, { path: "JSON" }), {
        path: "json",
        values: [ 3, 5, 8 ],
    });
    await assert.rejects(
        () => fsd.ReadJSON(input, { path: "map-only" }),
        error => error.code === "CJS_FSD_JSON_READER_INVALID",
    );
});

test("rejects missing, duplicate, and invalid readers deterministically", async () =>
{
    const fsd = new CjsFsd64Reader();

    fsd.Register("example", () => null);

    assert.throws(
        () => fsd.Register("EXAMPLE", () => null),
        error => error.code === "CJS_FSD_READER_EXISTS",
    );
    assert.throws(
        () => fsd.Register("other", {}),
        error => error.code === "CJS_FSD_READER_INVALID",
    );
    await assert.rejects(
        () => fsd.Read(new Uint8Array(), { path: "missing" }),
        error => error.code === "CJS_FSD_READER_NOT_FOUND",
    );
    await assert.rejects(
        () => fsd.Read("not bytes", { path: "example" }),
        error => error.code === "CJS_FSD_INPUT_INVALID",
    );
});

test("supports explicit replacement and removal", async () =>
{
    const fsd = new CjsFsd64Reader();

    fsd.Register("example", () => "first");
    fsd.Register("example", () => "second", { replace: true });

    assert.equal(await fsd.Read(new ArrayBuffer(0), { path: "example" }), "second");
    assert.equal(fsd.Has("EXAMPLE"), true);
    assert.equal(fsd.Remove("example"), true);
    assert.equal(fsd.Has("example"), false);
});
