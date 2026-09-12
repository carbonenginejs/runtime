import test from "node:test";
import assert from "node:assert/strict";

import {
    toJsonAcyclic,
    toJsonWithArrayValues,
    toJsonWithByteSummary,
    toJsonWithCollections
} from "../../../../src/resource/format/jsonPolicies.js";

// These four policies replaced a local `toJsonValue` in twenty-five formats. Only
// the cycle guard was pinned by any existing test: the byte-summary, array-value
// and collection policies could each return nonsense and the whole resource suite
// still passed. The axis they DISAGREE on — what happens to binary data — was the
// entirely untested one, so it is the axis this file leads with.

test("the policies disagree about binary data, and that is the point", () =>
{
    const bytes = new Uint8Array([ 1, 2, 3 ]);

    // Summarised: the payload is the file's bulk, not its description.
    assert.deepEqual(toJsonWithByteSummary({ data: bytes }), { data: { byteLength: 3 } });

    // Expanded: for geometry, the typed array IS the document.
    assert.deepEqual(toJsonWithArrayValues({ data: bytes }), { data: [ 1, 2, 3 ] });
    assert.deepEqual(toJsonWithCollections({ data: bytes }), { data: [ 1, 2, 3 ] });
    assert.deepEqual(toJsonAcyclic({ data: bytes }), { data: [ 1, 2, 3 ] });
});

test("toJsonWithByteSummary reports length and recurses through containers", () =>
{
    assert.deepEqual(
        toJsonWithByteSummary({
            name: "clip",
            count: 2,
            flag: true,
            nothing: null,
            frames: [ new Uint8Array(4), { payload: new Uint8Array(0) } ]
        }),
        {
            name: "clip",
            count: 2,
            flag: true,
            nothing: null,
            frames: [ { byteLength: 4 }, { payload: { byteLength: 0 } } ]
        }
    );
});

test("toJsonWithByteSummary summarises ONLY Uint8Array, by inheritance", () =>
{
    // The check is `instanceof Uint8Array`, not `ArrayBuffer.isView`, so other
    // typed arrays fall through to the object branch and serialise by index. That
    // is the behaviour all fifteen callers had; it is pinned so a later "tidy-up"
    // to isView has to be a decision rather than an accident.
    assert.deepEqual(
        toJsonWithByteSummary({ samples: new Float32Array([ 1, 2 ]) }),
        { samples: { 0: 1, 1: 2 } }
    );
});

test("toJsonWithArrayValues honours toJSON and excludes DataView", () =>
{
    assert.deepEqual(
        toJsonWithArrayValues({ thing: { toJSON: () => ({ replaced: true }) } }),
        { thing: { replaced: true } }
    );

    // A DataView is a window onto bytes, not a sequence of values, so it is not
    // expanded — it falls through to the object branch.
    const view = new DataView(new Uint8Array([ 7 ]).buffer);
    assert.deepEqual(toJsonWithArrayValues({ view }), { view: {} });

    assert.equal(toJsonWithArrayValues(undefined), undefined);
    assert.equal(toJsonWithArrayValues(null), null);
    assert.equal(toJsonWithArrayValues(5), 5);
});

test("toJsonWithCollections stringifies bigint rather than narrowing it", () =>
{
    // JSON has no integer this wide. A number would silently lose digits, so the
    // policy is a string and the exact value must survive.
    const wide = 9007199254740993n;
    assert.equal(toJsonWithCollections({ hash: wide }).hash, "9007199254740993");
    assert.notEqual(Number(wide).toString(), "9007199254740993");
});

test("toJsonWithCollections converts Map and Set", () =>
{
    assert.deepEqual(
        toJsonWithCollections({ byName: new Map([ [ "a", 1 ], [ "b", 2 ] ]) }),
        { byName: { a: 1, b: 2 } }
    );
    assert.deepEqual(
        toJsonWithCollections({ used: new Set([ 1, 2, 2 ]) }),
        { used: [ 1, 2 ] }
    );
    // Nested values go through the same policy.
    assert.deepEqual(
        toJsonWithCollections(new Map([ [ "k", new Set([ 3n ]) ] ])),
        { k: [ "3" ] }
    );
});

test("toJsonWithCollections yields null for anything unserialisable", () =>
{
    // The output must always be serialisable, so a function becomes null rather
    // than being passed through and vanishing at JSON.stringify time.
    assert.equal(toJsonWithCollections(() => 1), null);
    assert.equal(toJsonWithCollections(Symbol("s")), null);
    assert.equal(toJsonWithCollections(undefined), null);
    assert.equal(toJsonWithCollections(null), null);
});

test("toJsonAcyclic refuses a cycle and names the reader", () =>
{
    const node = { name: "root" };
    node.self = node;

    assert.throws(() => toJsonAcyclic(node), /Reader\.toJSON cannot convert circular data/);
    assert.throws(() => toJsonAcyclic(node, "CjsGr2Format"), /CjsGr2Format\.toJSON cannot convert circular data/);
    assert.throws(() => toJsonAcyclic(node), TypeError);
});

test("toJsonAcyclic allows the same node twice on different paths", () =>
{
    // A shared reference is not a cycle. The guard is released on the way out, so
    // a diamond must convert rather than be rejected.
    const shared = { id: 7 };

    assert.deepEqual(
        toJsonAcyclic({ left: shared, right: shared }),
        { left: { id: 7 }, right: { id: 7 } }
    );

    // And a cycle through an array is still caught.
    const list = [];
    list.push(list);
    assert.throws(() => toJsonAcyclic({ list }), TypeError);
});

test("toJsonAcyclic honours toJSON without losing the guard", () =>
{
    const escaping = { toJSON() { return { inner: escaping }; } };
    assert.throws(() => toJsonAcyclic(escaping), TypeError);
});

test("every policy leaves primitives and plain structures alone", () =>
{
    const plain = { a: 1, b: "two", c: false, d: [ 1, 2 ], e: { f: null } };

    for (const policy of [
        toJsonWithByteSummary,
        toJsonWithArrayValues,
        toJsonWithCollections,
        toJsonAcyclic
    ])
    {
        assert.deepEqual(policy(plain), plain, policy.name);
        // And the result is genuinely serialisable.
        assert.equal(JSON.stringify(policy(plain)), JSON.stringify(plain), policy.name);
    }
});
