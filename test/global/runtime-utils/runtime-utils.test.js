import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import test from "node:test";

import { copyArrayLike, fillArrayLike, toArray } from "@carbonenginejs/runtime/utils/arrays";
import { asUint8Array, copyBytes, hasBytePrefix, toArrayBuffer } from "@carbonenginejs/runtime/utils/bytes";
import { decompressGzip, decompressGzipIfNeeded, isGzip } from "@carbonenginejs/runtime/utils/compression";
import {
    isArrayLike,
    isFunction,
    isNullish,
    isObject,
    isObjectLike,
    isPlainObject as isPlainObjectPredicate,
    isPromiseLike,
    isTypedArray
} from "@carbonenginejs/runtime/utils/is";
import { decodeJson, encodeJson } from "@carbonenginejs/runtime/utils/json";
import { compareCodeUnits, indexBy, sortStrings } from "@carbonenginejs/runtime/utils/lookup";
import {
    approximatelyEqual,
    clamp,
    cubicHermite,
    cubicHermiteDerivative,
    degreesToRadians,
    lerp,
    radiansToDegrees,
    saturate,
    smoothStep,
    smootherStep,
    wrapDegrees,
    wrapRadians
} from "@carbonenginejs/runtime/math/scalar";
import {
    getResourceExtension,
    normalizePath,
    normalizeResourceExtension,
    normalizeResourcePath
} from "@carbonenginejs/runtime/utils/path";
import { decodeUtf8, encodeUtf8 } from "@carbonenginejs/runtime/utils/text";
import {
    assertNonEmptyString,
    assertPlainObject,
    assertSupportedVersion,
    isPlainObject
} from "@carbonenginejs/runtime/utils/validation";

test("array helpers normalize and mutate without replacing targets", () =>
{
    const
        source = new Uint8Array([ 1, 2, 3, 4 ]),
        target = new Uint8Array(3);

    assert.equal(copyArrayLike(target, source), target);
    assert.deepEqual([ ...target ], [ 1, 2, 3 ]);
    assert.equal(fillArrayLike(target, 7), target);
    assert.deepEqual([ ...target ], [ 7, 7, 7 ]);

    const existing = [ 1, 2 ];
    assert.equal(toArray(existing), existing);
    assert.deepEqual(toArray(null), []);
    assert.deepEqual(toArray(undefined), []);
    assert.deepEqual(toArray(3), [ 3 ]);
    assert.deepEqual(toArray(source), [ source ]);
});

test("neutral predicates behave consistently for browser and Node values", () =>
{
    const bytes = new Uint8Array([ 1, 2 ]);

    assert.equal(isTypedArray(bytes), true);
    assert.equal(isTypedArray(new DataView(bytes.buffer)), false);
    assert.equal(isArrayLike(bytes, 2), true);
    assert.equal(isArrayLike([], 1), false);
    assert.equal(isArrayLike("ab", 2), false);
    assert.equal(isFunction(() => {}), true);
    assert.equal(isNullish(null), true);
    assert.equal(isNullish(undefined), true);
    assert.equal(isNullish(0), false);
    assert.equal(isObject(() => {}), true);
    assert.equal(isObjectLike(() => {}), false);
    assert.equal(isPlainObjectPredicate(Object.create(null)), true);
    assert.equal(isPromiseLike({ then() {} }), true);
    assert.equal(isPromiseLike(null), false);
});

test("fresh scalar math primitives have explicit dependency-free semantics", () =>
{
    assert.equal(clamp(2, 0, 1), 1);
    assert.equal(saturate(-1), 0);
    assert.equal(lerp(10, 20, 0.25), 12.5);
    assert.equal(approximatelyEqual(1, 1 + 1e-7), true);
    assert.equal(approximatelyEqual(1, 1.1), false);
    assert.throws(() => approximatelyEqual(1, 1, -1), RangeError);
    assert.equal(radiansToDegrees(degreesToRadians(90)), 90);
    assert.equal(wrapDegrees(270), -90);
    assert.ok(approximatelyEqual(wrapRadians(Math.PI * 1.5), -Math.PI / 2));

    assert.equal(cubicHermite(0, 1, 1, 1, 0), 0);
    assert.equal(cubicHermite(0, 1, 1, 1, 1), 1);
    assert.equal(cubicHermiteDerivative(0, 1, 1, 1, 0), 1);
    assert.equal(cubicHermiteDerivative(0, 1, 1, 1, 1), 1);
    assert.equal(smoothStep(-1, 0, 1), 0);
    assert.equal(smoothStep(2, 0, 1), 1);
    assert.equal(smootherStep(0.5, 0, 1), 0.5);
});

test("byte helpers preserve visible ranges and make ownership explicit", () =>
{
    const source = new Uint8Array([ 9, 1, 2, 3, 8 ]);
    const view = new DataView(source.buffer, 1, 3);
    const bytes = asUint8Array(view);

    assert.deepEqual([ ...bytes ], [ 1, 2, 3 ]);
    assert.equal(bytes.buffer, source.buffer);
    assert.equal(asUint8Array(bytes), bytes);
    assert.equal(hasBytePrefix(bytes, new Uint8Array([ 1, 2 ])), true);
    assert.equal(hasBytePrefix(bytes, new Uint8Array([ 1, 3 ])), false);

    const copy = copyBytes(bytes);
    const buffer = toArrayBuffer(bytes);

    assert.notEqual(copy.buffer, source.buffer);
    assert.deepEqual([ ...copy ], [ 1, 2, 3 ]);
    assert.deepEqual([ ...new Uint8Array(buffer) ], [ 1, 2, 3 ]);
});

test("UTF-8 and JSON helpers round trip browser-style byte inputs", () =>
{
    const text = "Carbon 🚀";
    const encoded = encodeUtf8(text);

    assert.equal(decodeUtf8(encoded), text);

    const json = encodeJson({ typeID: 587, name: text });

    assert.equal(decodeUtf8(json).endsWith("\n"), true);
    assert.deepEqual(decodeJson(json), { typeID: 587, name: text });
    assert.equal(decodeUtf8(encodeJson({ a: 1 }, { space: 0, trailingNewline: false })), "{\"a\":1}");
});

test("path normalization preserves schemes and leaves domain policy to callers", () =>
{
    assert.equal(normalizePath("  RES:\\Graphics///Ship.RED  "), "RES:/Graphics/Ship.RED");
    assert.equal(
        normalizePath("  RES:\\Graphics///Ship.RED  ", { lowerCase: true }),
        "res:/graphics/ship.red"
    );
    assert.equal(normalizePath("https://example.test//a\\b"), "https://example.test/a/b");
    assert.equal(normalizePath("a/../b"), "a/../b");
    assert.equal(
        normalizeResourcePath(" RES:\\Texture\\Ship.DDS "),
        "res:/texture/ship.dds"
    );
    assert.equal(
        getResourceExtension("res:/texture/ship.dds?variant=1"),
        "dds"
    );
    assert.equal(normalizeResourceExtension(" .WEM "), "wem");
});

test("lookup helpers use explicit stable ordering and reject duplicates", () =>
{
    assert.equal(compareCodeUnits("a", "b"), -1);
    assert.deepEqual(sortStrings([ "z", "a", "aa" ]), [ "a", "aa", "z" ]);

    const values = [ { typeID: 2 }, { typeID: 1 } ];
    const lookup = indexBy(values, value => value.typeID, { label: "type" });

    assert.equal(lookup.get(1), values[1]);
    assert.throws(
        () => indexBy([ { id: 1 }, { id: 1 } ], value => value.id),
        /Duplicate value key 1/u
    );
});

test("validation primitives preserve Carbon acronym field names without translating records", () =>
{
    const record = { typeID: 587, graphicID: 42 };

    assert.equal(isPlainObject(record), true);
    assert.equal(isPlainObject([]), false);
    assert.equal(assertPlainObject(record), record);
    assert.equal(assertNonEmptyString("  skinID  "), "skinID");
    assert.equal(assertSupportedVersion("1", [ 1, 2 ], "schemaVersion"), 1);
    assert.throws(() => assertSupportedVersion(3, [ 1, 2 ], "schemaVersion"), RangeError);
});

test("gzip helpers use the shared Web DecompressionStream behavior in Node", async () =>
{
    const plain = encodeJson({ schema: "test.library", schemaVersion: 1 });
    const compressed = gzipSync(plain, { mtime: 0 });

    assert.equal(isGzip(compressed), true);
    assert.deepEqual(decodeJson(await decompressGzip(compressed)), {
        schema: "test.library",
        schemaVersion: 1
    });

    const unchanged = await decompressGzipIfNeeded(plain);

    assert.equal(unchanged, plain);
    await assert.rejects(
        decompressGzip(compressed, { decompressionStreamClass: null }),
        error => error?.code === "CJS_DECOMPRESSION_UNSUPPORTED"
    );
});
