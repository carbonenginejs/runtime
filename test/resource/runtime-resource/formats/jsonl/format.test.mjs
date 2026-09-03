import assert from "node:assert/strict";
import { test } from "node:test";

import CjsJsonlFormat, {
    CjsJsonlFormat as NamedCjsJsonlFormat,
} from "../../../../../npm/dist/resource/formats/jsonl/index.js";

const SAMPLE = [
    "{\"_key\":\"sde\",\"buildNumber\":3489895}",
    "",
    "{\"typeID\":587,\"name\":\"Rifter\"}",
    "[1,2,3]",
    "",
].join("\n");

test("jsonl reads one record per non-blank line, in order", () =>
{
    const records = CjsJsonlFormat.read(SAMPLE);

    assert.equal(NamedCjsJsonlFormat, CjsJsonlFormat);
    assert.deepEqual(records, [
        { _key: "sde", buildNumber: 3489895 },
        { typeID: 587, name: "Rifter" },
        [ 1, 2, 3 ],
    ]);
});

test("jsonl accepts bytes, CRLF line endings, and one BOM", () =>
{
    const text = "﻿{\"a\":1}\r\n{\"b\":2}\r\n";

    assert.deepEqual(CjsJsonlFormat.read(text), [ { a: 1 }, { b: 2 } ]);
    assert.deepEqual(
        CjsJsonlFormat.read(new TextEncoder().encode(text)),
        [ { a: 1 }, { b: 2 } ],
    );
    assert.deepEqual(
        CjsJsonlFormat.read(new TextEncoder().encode(text).buffer),
        [ { a: 1 }, { b: 2 } ],
    );
});

test("jsonl reports the true line number and the source of a bad record", () =>
{
    assert.throws(
        () => CjsJsonlFormat.read("{\"a\":1}\n\n{broken", { source: "latest.jsonl" }),
        error => error instanceof TypeError
            && /latest\.jsonl has an invalid record at line 3/.test(error.message),
    );
    assert.throws(
        () => CjsJsonlFormat.read(new Uint8Array([ 0xff, 0xfe, 0x00 ])),
        TypeError,
    );
});

test("jsonl inspection counts records without parsing them all", () =>
{
    assert.deepEqual(CjsJsonlFormat.inspect(SAMPLE), {
        lines: 5,
        records: 3,
        firstRecordLine: 1,
    });
    // Only the first record identifies the format; a later bad line is not
    // inspection's concern.
    assert.deepEqual(CjsJsonlFormat.inspect("\n{\"a\":1}\n{broken"), {
        lines: 3,
        records: 2,
        firstRecordLine: 2,
    });
    assert.throws(() => CjsJsonlFormat.inspect("\n \n"), /contains no JSON Lines records/);
    assert.throws(() => CjsJsonlFormat.inspect("not json\n{\"a\":1}"), TypeError);
});

test("jsonl routes by content through the base identification predicate", () =>
{
    assert.equal(CjsJsonlFormat.is(SAMPLE), true);
    assert.equal(CjsJsonlFormat.is("plain text\nlines"), false);
    assert.equal(CjsJsonlFormat.is(""), false);
});

test("jsonl serializes an iterable back to one record per line", () =>
{
    const values = [ { a: 1 }, [ 2 ], "three", null ];
    const text = CjsJsonlFormat.toText(values);

    assert.equal(text, "{\"a\":1}\n[2]\n\"three\"\nnull\n");
    assert.deepEqual(CjsJsonlFormat.read(text), values);
    assert.equal(CjsJsonlFormat.toText([]), "");
    assert.throws(() => CjsJsonlFormat.toText([ undefined ]), TypeError);
    assert.throws(() => CjsJsonlFormat.toText(null), TypeError);
});

test("jsonl instances expose Read and Inspect over the same behavior", () =>
{
    const format = new CjsJsonlFormat();

    assert.deepEqual(format.Read("{\"a\":1}"), [ { a: 1 } ]);
    assert.equal(format.Inspect(SAMPLE).records, 3);
    assert.throws(() => new CjsJsonlFormat(null), TypeError);
});
