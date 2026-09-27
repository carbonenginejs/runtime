import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CjsResourceGroupFormat as Group } from "@carbonenginejs/runtime/resource/formats/resourcegroup";
import { CjsResFileIndexFormat as Index } from "@carbonenginejs/runtime/resource/formats/resfileindex";
import { CjsFormat } from "../../src/resource/format/CjsFormat.js";
import { CjsFormatStore } from "../../src/global/blue/CjsFormatStore.js";

const fixture = name => readFileSync(new URL("../tools/fixtures/carbon-resources/" + name, import.meta.url), "utf8");
const example = "res:/A,aa/file,abc,18446744073709551615,9007199254740993,4294967295\nres:/B,aa/other,def,0,0\n";

test("CSV to JSON to CSV preserves uint64, distinct paths, case, order and zero sizes", () =>
{
    const value = Index.read(new TextEncoder().encode(example));
    assert.equal(value.resources[0].uncompressedSize, "18446744073709551615");
    assert.equal(value.resources[1].compressedSize, "0");
    assert.equal(Index.write(Group.read(Group.write(value))), example);
});

test("native fixture is imported without requiring Carbon class construction", () =>
{
    const csv = fixture("merge-base.txt");
    const value = Index.read(csv);
    assert.equal(value.resources.length, csv.trim().split(/\r?\n/u).length);
    assert.doesNotThrow(() => JSON.stringify(value));
    assert.throws(() => Index.read(fixture("overflow.txt")), /uint32/);
});

test("native YAML fixture and populated uint64 documents round trip through JSON", () =>
{
    const empty = Group.readYaml(fixture("empty.yaml"));
    assert.deepEqual(Group.readYaml(Group.writeYaml(empty)), empty);
    const value = Index.read(example);
    const imported = Group.readYaml(Group.writeYaml(value));
    assert.deepEqual(imported.resources, value.resources);
    assert.deepEqual(Group.read(Group.write(imported)), imported);
});

test("optional field absence is distinct from an explicit zero", () =>
{
    const value = Index.read("res:/a,aa/a,abc,0,0");
    delete value.resources[0].compressedSize;
    const result = Group.read(Group.write(value));
    assert.equal(Object.hasOwn(result.resources[0], "compressedSize"), false);
    assert.throws(() => Index.write(result), /compressedSize/);
});

test("unsafe numbers, unsupported schemas, unknown fields and out-of-range integers fail", () =>
{
    const value = Index.read(example);
    value.resources[0].uncompressedSize = 9007199254740992;
    assert.throws(() => Group.write(value), /safe integer/);
    value.resources[0].uncompressedSize = "18446744073709551616";
    assert.throws(() => Group.write(value), /uint64/);
    assert.throws(() => Group.read({ ...Index.read(example), schemaVersion: 2 }), /schemaVersion/);
    assert.throws(() => Group.read({ ...Index.read(example), accidental: true }), /Unknown/);
});

test("CSV matches native prefix/sign parsing and ignores columns beyond operation", () =>
{
    const value = Index.read("res:/a,aa/a,abc,-1suffix,+5tail,1,ignored");
    assert.equal(value.resources[0].uncompressedSize, "18446744073709551615");
    assert.equal(value.resources[0].compressedSize, "5");
});

test("readers reject invalid UTF-8 and writers refuse unquoted CSV delimiters", () =>
{
    assert.throws(() => Index.read(new Uint8Array([255])), TypeError);
    const value = Index.read(example);
    value.resources[0].relativePath = "comma,path";
    assert.throws(() => Index.write(value), /quoting/);
});

test("format contracts declare writing and require explicit extension routing", () =>
{
    for (const Format of [Group, Index])
    {
        CjsFormat.validateContract(Format);
        assert.equal(Format.canWrite(), true);
        assert.deepEqual(Format.extensions, []);
    }
    const store = new CjsFormatStore();
    assert.throws(() => store.Register(Index), /no extensions/);
    store.Register(Index, { extensions: ".txt", output: "json" });
    store.Register(Group, { extensions: ".yaml", read: "readYaml", output: "json" });
    assert.equal(store.Resolve("txt", example).Format, Index);
    assert.equal(store.Resolve("yaml", fixture("empty.yaml")).read, "readYaml");
    assert.equal(store.Resolve("json", "{}"), null);
});

test("writers do not reorder or mutate caller documents", () =>
{
    const value = Index.read("res:/z,aa/z,z,1,1\nres:/a,aa/a,a,1,1");
    const before = JSON.stringify(value);
    Index.write(value);
    Group.write(value);
    Group.writeYaml(value);
    assert.equal(JSON.stringify(value), before);
});

test("stored JSON uses path keys and shared columns with absent optional cells", () =>
{
    const value = Index.read(example);
    delete value.resources[0].compressedSize;
    const stored = JSON.parse(Group.write(value));
    assert.equal(Object.hasOwn(stored, "resources"), false);
    assert.equal(stored.values["res:/A"][stored.columns.indexOf("compressedSize")], null);
    assert.equal(stored.values["res:/B"][stored.columns.indexOf("compressedSize")], "0");
    assert.deepEqual(Group.read(stored), value);
    const reversed = {
        ...stored,
        columns: [...stored.columns].reverse(),
        values: Object.fromEntries(Object.entries(stored.values).map(([path, row]) => [path, [...row].reverse()]))
    };
    assert.deepEqual(Group.read(reversed), value);
});

test("compact JSON rejects ambiguous columns, invalid row widths and missing required cells", () =>
{
    const stored = JSON.parse(Group.write(Index.read(example)));
    assert.throws(() => Group.read({ ...stored, columns: [...stored.columns, stored.columns[0]] }), /Duplicate/);
    assert.throws(() => Group.read({ ...stored, columns: ["unknown"] }), /Unknown/);
    assert.throws(() => Group.read({ ...stored, values: { "res:/a": [] } }), /width/);
    assert.throws(() => Group.read({ ...stored, resources: [] }), /not both/);
    assert.throws(() => Group.read({ ...stored, columns: [], values: {} }), /required/);
    const missing = structuredClone(stored);
    missing.values["res:/A"][missing.columns.indexOf("checksum")] = null;
    assert.throws(() => Group.read(missing), /cannot be null/);
    assert.deepEqual(Group.read(Group.write(Index.read(""))), Index.read(""));
});

test("JSON rejects duplicate paths instead of silently overwriting records", () =>
{
    const rows = Index.read("res:/a,aa/a,abc,1,1\nres:/a,aa/b,def,2,2");
    assert.equal(rows.resources.length, 2);
    assert.throws(() => Group.write(rows), /Duplicate resource path/);
});

test("logical roots disambiguate names, and special object keys remain ordinary data", () =>
{
    const value = Index.read("res:/a,aa/a,abc,1,1\napp:/a,aa/b,def,2,2");
    const stored = JSON.parse(Group.write(value));
    assert.deepEqual(Object.keys(stored.values), ["res:/a", "app:/a"]);
    assert.equal(stored.columns.includes("relativePath"), false);
    assert.equal(stored.columns.includes("prefix"), false);
    assert.deepEqual(Group.read(stored), value);
    const plain = Index.read("res:/a,aa/a,abc,1,1");
    delete plain.resources[0].prefix;
    plain.resources[0].relativePath = "__proto__";
    const special = JSON.parse(Group.write(plain));
    assert.equal(Object.hasOwn(special.values, "__proto__"), true);
    assert.deepEqual(Group.read(special), plain);
});

test("separate build documents can resolve the same path to different content", () =>
{
    const first = JSON.parse(Group.write(Index.read("res:/a,aa/first,abc,1,1")));
    const second = JSON.parse(Group.write(Index.read("res:/a,bb/second,def,2,2")));
    assert.equal(first.values["res:/a"][first.columns.indexOf("location")], "aa/first");
    assert.equal(second.values["res:/a"][second.columns.indexOf("location")], "bb/second");
});

test("CSV retains an explicitly present zero binary operation", () =>
{
    // ResourceInfo.cpp ExportToCsv tests HasValue, not whether the code is nonzero.
    const row = "res:/a,aa/a,abc,1,1,0\n";
    assert.equal(Index.write(Index.read(row)), row);
    assert.equal(Index.write(Group.read(Group.write(Index.read(row)))), row);
});

test("YAML factory requires Type even for document version 0.0.0", () =>
{
    // ResourceGroupFactory.cpp:90-93 rejects absent Type before field versioning.
    const value = Index.read("res:/a,aa/a,abc,1,1");
    value.documentVersion = "0.0.0";
    const yaml = Group.writeYaml(value);
    assert.throws(() => Group.readYaml(yaml), /type/);
});

test("shared YAML reader has opt-in lossless raw integers and JSON-safe decimal output", async () =>
{
    const { CjsYamlFormat } = await import("../../src/resource/formats/yaml/CjsYamlFormat.js");
    const yaml = "size: 18446744073709551615\nsmall: 1\n";
    const raw = CjsYamlFormat.readRaw(yaml, { intAsBigInt: true });
    assert.equal(raw.size, 18446744073709551615n);
    assert.equal(raw.small, 1n);
    const payload = CjsYamlFormat.read(yaml, { intAsBigInt: true });
    assert.equal(payload.size, "18446744073709551615");
    assert.doesNotThrow(() => JSON.stringify(payload));
    assert.equal(CjsYamlFormat.readRaw("small: 1").small, 1);
    assert.throws(() => CjsYamlFormat.readRaw(yaml, { intAsBigInt: "yes" }), /boolean/);
});
