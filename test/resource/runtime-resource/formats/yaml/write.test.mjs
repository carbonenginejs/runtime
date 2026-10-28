import test from "node:test";
import assert from "node:assert/strict";
import { parseDocument } from "yaml";
import { CjsYamlFormat } from "../../../../../src/resource/formats/yaml/CjsYamlFormat.js";

test("YAML writer declares raw and AST inputs and restores explicit Python tags", () =>
{
    assert.equal(CjsYamlFormat.canWrite(), true);
    assert.equal(CjsYamlFormat.canWrite("document"), true);
    assert.equal(CjsYamlFormat.canWrite("nope"), false);
    const raw = { tuple: { $yamlTag: "tag:yaml.org,2002:python/tuple", $yamlValue: [1, 2, 3] } };
    const text = new CjsYamlFormat().Write(raw);
    assert.match(text, /!!python\/tuple/u);
    assert.deepEqual(CjsYamlFormat.readRaw(text), { tuple: [1, 2, 3] });
    const document = parseDocument("# authored\nname: test\n");
    assert.equal(CjsYamlFormat.write(document, { input: "document" }), document.toString());
    assert.throws(() => CjsYamlFormat.write(CjsYamlFormat.readDocument("x: 1"), { input: "document" }), /AST/);
});

test("source layout keeps numeric keys and tuple tags without mutating the AST", () =>
{
    const document = parseDocument("# layout\nvalues:\n  7: !!python/tuple [0.1, 0.2]\n");
    const before = document.toString();
    const text = CjsYamlFormat.write({ values: { 7: [0.3, 0.4] } }, { sourceDocument: document });
    const after = parseDocument(text);
    assert.equal(after.get("values", true).items[0].key.value, 7);
    assert.equal(after.getIn(["values", 7], true).tag, "tag:yaml.org,2002:python/tuple");
    assert.deepEqual(CjsYamlFormat.readRaw(text), { values: { 7: [0.3, 0.4] } });
    assert.equal(document.toString(), before);
});

test("duplicate pairs retain earlier values and update only the final effective value", () =>
{
    const document = parseDocument("limits:\n  FatShape: [0, 0.5]\n  FatShape: [0, 1]\n", { uniqueKeys: false });
    const text = CjsYamlFormat.write({ limits: { FatShape: [0, 2] } }, { sourceDocument: document });
    const pairs = parseDocument(text, { uniqueKeys: false }).get("limits", true).items;
    assert.deepEqual(pairs.map(pair => pair.value.toJSON()), [[0, 0.5], [0, 2]]);
});

test("shared source aliases keep identity and divergent edits fail explicitly", () =>
{
    const document = parseDocument("left: &same {value: 1}\nright: *same\n");
    const shared = { value: 2 };
    const text = CjsYamlFormat.write({ left: shared, right: shared }, { sourceDocument: document });
    const raw = CjsYamlFormat.readRaw(text);
    assert.equal(raw.left, raw.right);
    assert.equal(raw.left.value, 2);
    assert.match(text, /\*same/u);
    assert.throws(() => CjsYamlFormat.write({ left: {value: 2}, right: {value: 3} }, { sourceDocument: document }), /Divergent/);
});
