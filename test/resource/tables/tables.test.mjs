import assert from "node:assert/strict";
import { test } from "node:test";
import { sqliteFixture, fsdFixture } from "./fixtures.mjs";
import { CjsTableData } from "../../../src/resource/format/CjsTableData.js";
import { CjsJsonlFormat } from "../../../src/resource/formats/jsonl/CjsJsonlFormat.js";
import { CjsSqliteFormat } from "../../../src/resource/formats/sqlite/CjsSqliteFormat.js";
import { CjsFsd64Format } from "../../../src/resource/formats/fsd/64/CjsFsd64Format.js";

test("table documents preserve native identities and clone across batch boundaries", () =>
{
    const data = new CjsTableData({ build: 123 }).AddTable("graphics");
    data.Add("graphics", 1, { bytes: new Uint8Array([7]), nested: new Map([[2, 3n]]) });
    data.Add("graphics", "1", null).Add("graphics", 9007199254740993n, false).AddTable("empty");
    const rebuilt = new CjsTableData(data.metadata);
    for (const batch of data.Batches(1)) rebuilt.Append(structuredClone(batch));
    assert.deepEqual(rebuilt.GetValues(), data.GetValues());
    assert.equal(rebuilt.Get("graphics", "1").value, null);
    assert.equal(rebuilt.Get("graphics", 999).found, false);
    const malformed = new CjsTableData().AddTable("graphics").Add("graphics", 2, "new").Add("graphics", 1, "duplicate");
    assert.throws(() => rebuilt.Append(malformed.GetValues()), /Duplicate/);
    assert.equal(rebuilt.Get("graphics", 2).found, false, "a rejected append changes nothing");
});

test("JSONL streams handle split UTF-8, BOM, CRLF, blanks and final unterminated records", async () =>
{
    const text = '\uFEFF{"typeID":1,"name":"É舰🚀"}\r\n\r\n{"typeID":2}\n{"typeID":3}';
    const bytes = new TextEncoder().encode(text);
    const chunks = Array.from(bytes, byte => new Uint8Array([byte]));
    const pairs = [];
    for await (const pair of CjsJsonlFormat.iterate(chunks)) pairs.push(pair);
    assert.deepEqual(pairs.map(pair => pair[1]), [1, 3, 4]);
    assert.deepEqual(pairs.map(pair => pair[0]), CjsJsonlFormat.read(text));
    const data = new CjsTableData();
    const sizes = [];
    for await (const batch of CjsJsonlFormat.readBatches(chunks, { name: "types", keyPath: "typeID", batchSize: 2 }))
    {
        sizes.push(batch.tables[0].entries.length);
        data.Append(batch);
    }
    assert.deepEqual(sizes, [2, 1]);
    assert.deepEqual(data.GetValues(), CjsJsonlFormat.read(text, { emit: "cjstables", name: "types", keyPath: "typeID" }));
    assert.deepEqual(CjsJsonlFormat.read(CjsJsonlFormat.writeTables(data.GetValues(), { table: "types" })), pairs.map(pair => pair[0]));
});

test("streaming parse has real error locations, strict UTF-8 and early cancellation", async () =>
{
    const collect = async chunks => { for await (const value of CjsJsonlFormat.iterate(chunks, { source: "types.jsonl" })) void value; };
    await assert.rejects(collect(['{}\n\n', '{bad}']), /types.jsonl has an invalid record at line 3/);
    await assert.rejects(collect([new Uint8Array([0xc3])]), TypeError);
    await assert.rejects(collect(['{}', new Uint8Array([10])]), /mix text and byte/);
    let closed = false;
    async function* input()
    {
        try { yield '{}\n'; throw Error("must not read ahead"); }
        finally { closed = true; }
    }
    for await (const pair of CjsJsonlFormat.iterate(input())) { assert.deepEqual(pair, [{}, 1]); break; }
    assert.equal(closed, true);
    const ordinal = new CjsTableData();
    for await (const batch of CjsJsonlFormat.readBatches(['0\n1\n2'], { batchSize: 1 })) ordinal.Append(batch);
    assert.deepEqual([...ordinal.Entries("records")], [[0,0],[1,1],[2,2]]);
});

test("SQLite batches retain rowid, named keys, wide integers, blobs and empty tables", () =>
{
    const bytes = sqliteFixture();
    const options = { emit: "cjstables", keyPaths: { graphics: "graphicID" }, batchSize: 128 };
    const batches = [...CjsSqliteFormat.readBatches(bytes, options)];
    assert.deepEqual(batches.map(batch => batch.tables[0].entries.length), [128,128,1,0]);
    const data = CjsTableData.from(CjsSqliteFormat.read(bytes, options));
    assert.deepEqual(data.Get("graphics", 257).value, { graphicID: 257, bytes: new Uint8Array([1]), wide: 9007199254740993n });
    assert.deepEqual(CjsTableData.from(CjsSqliteFormat.read(bytes, { emit: "cjstables", tables: ["graphics"] })).Get("graphics", 257), data.Get("graphics", 257));
});

test("FSD uses inert schemas for the same native table output and bounded batches", () =>
{
    const { bytes, schema } = fsdFixture();
    const batches = [...CjsFsd64Format.readBatches(bytes, { schema, batchSize: 2 })];
    assert.deepEqual(batches.map(batch => batch.tables[0].entries.length), [2,1]);
    const data = new CjsTableData();
    for (const batch of batches) data.Append(batch);
    assert.deepEqual(data.GetValues(), CjsFsd64Format.read(bytes, { schema, emit: "cjstables" }));
    assert.deepEqual(data.Get("graphics", 11).value, { graphicID: 11, size: 2.25 });
    assert.equal(CjsFsd64Format.getSupport(bytes, { schema, emit: "cjstables" }).supported, true);
    assert.throws(() => CjsFsd64Format.read(bytes, { emit: "cjstables" }), /inert options.schema/);
    const objectSchema = { ...schema, container: { type: "OBJECT", headerSize: 4, fields: [{ name: "graphicID", type: "UINT_32", offset: 0 }] } };
    const root = CjsTableData.from(CjsFsd64Format.read(bytes, { schema: objectSchema, emit: "cjstables" }));
    assert.equal(root.Get("graphics", 0).value.graphicID, 32);
    assert.equal(root.tables.get("graphics").records.size, 1);
});

test("JSONL table export rejects native values and unrepresentable external keys", () =>
{
    for (const value of [new Uint8Array([1]), new Map([[1, 2]]), 4n, NaN, { missing: undefined }])
    {
        const doc = new CjsTableData().AddTable("t").Add("t", 0, value).GetValues();
        assert.throws(() => CjsJsonlFormat.writeTables(doc, { table: "t" }), TypeError);
    }
    const external = new CjsTableData().AddTable("t").Add("t", "external", {}).GetValues();
    assert.throws(() => CjsJsonlFormat.writeTables(external, { table: "t" }), /external record keys/);
});

test("wide FSD identities stay BigInt natively and exact decimal strings in JSON", () =>
{
    const { bytes, schema } = fsdFixture();
    schema.container.key.type = "UINT_64_IDENTIFIER";
    schema.container.fields = [{ name: "value", type: "UINT_64", offset: 8 }];
    const view = new DataView(bytes.buffer);
    for (let i=0; i<3; i++)
    {
        view.setBigUint64(96 + i*16, 9007199254740993n + BigInt(i), true);
        view.setBigUint64(104 + i*16, 18446744073709551615n, true);
    }
    const data = CjsTableData.from(CjsFsd64Format.read(bytes, { schema, emit: "cjstables" }));
    assert.deepEqual(data.Get("graphics", 9007199254740993n), { found: true, value: { value: 18446744073709551615n } });
    assert.equal(CjsFsd64Format.read(bytes, { schema, emit: "json" })["9007199254740993"].value, "18446744073709551615");
});
