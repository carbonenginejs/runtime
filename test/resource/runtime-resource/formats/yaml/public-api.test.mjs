import { readFile } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";

import CjsYamlFormat, { CjsYamlFormat as NamedCjsYamlFormat } from "../../../../../src/resource/formats/yaml/index.js";

test("package root exports one public format class", async () =>
{
    const mod = await import("../../../../../src/resource/formats/yaml/index.js");
    assert.deepEqual(Object.keys(mod).sort(), [ "CjsYamlFormat", "default" ]);
    assert.equal(mod.default, CjsYamlFormat);
    assert.equal(NamedCjsYamlFormat, CjsYamlFormat);
});

test("format facade exposes the standard reusable API", () =>
{
    assert.deepEqual(Object.getOwnPropertyNames(CjsYamlFormat.prototype).sort(), [
        "GetValues", "Inspect", "Read", "ReadDocument", "ReadPayload", "ReadRaw",
        "SetValues", "ToJSON", "constructor"
    ].sort());
    assert.equal(CjsYamlFormat.id, "yaml");
    assert.deepEqual(CjsYamlFormat.extensions, [ ".yaml", ".yml" ]);
});

test("instance and emit-mode APIs share the same normalized options", () =>
{
    const yaml = new CjsYamlFormat({ sourceName: "profile.yaml" });
    assert.equal(yaml.SetValues({ maxAliasCount: 4 }), yaml);
    assert.equal(yaml.GetValues().maxAliasCount, 4);
    assert.deepEqual(yaml.Read("value: 1\n"), { value: 1 });
    assert.deepEqual(yaml.ReadPayload("value: 1\n"), { value: 1 });
    assert.deepEqual(yaml.Read("value: 1\n", { emit: "raw" }), { value: 1 });
    assert.equal(yaml.Read("value: 1\n", { emit: "document" }).source.name, "profile.yaml");
    assert.equal(yaml.ReadDocument("value: 1\n").root.kind, "mapping");
    assert.equal(yaml.Inspect("[1, 2]\n").root.kind, "sequence");
    assert.deepEqual(yaml.ToJSON({ value: new Uint8Array([ 1, 2 ]) }), { value: [ 1, 2 ] });
});

test("raw mode preserves alias identity and cycles", () =>
{
    const raw = CjsYamlFormat.readRaw([
        "left: &shared",
        "  value: 7",
        "right: *shared",
        "cycle: &cycle",
        "  self: *cycle"
    ].join("\n"));

    assert.equal(raw.left, raw.right);
    assert.equal(raw.cycle, raw.cycle.self);
});

test("payload mode deterministically encodes shared and cyclic identity", () =>
{
    const payload = CjsYamlFormat.read([
        "left: &shared",
        "  value: 7",
        "right: *shared",
        "cycle: &cycle",
        "  self: *cycle"
    ].join("\n"));

    assert.deepEqual(payload, {
        left: { $yamlId: 1, value: 7 },
        right: { $yamlRef: 1 },
        cycle: { $yamlId: 2, self: { $yamlRef: 2 } }
    });
    assert.doesNotThrow(() => JSON.stringify(payload));
});

test("legacy Python tags normalize values or remain inert tagged data", async () =>
{
    const source = await readFile(new URL("./fixtures/legacy-python.yaml", import.meta.url), "utf8");
    const raw = CjsYamlFormat.readRaw(source);

    assert.deepEqual(raw.tuple, [ 1, 2, 3 ]);
    assert.equal(raw.unicode, "capsuleer");
    assert.deepEqual(raw.decal, {
        $yamlTag: "tag:yaml.org,2002:python/object:paperDoll.ProjectedDecal",
        $yamlValue: { texturePath: "res:/texture/decal.dds" }
    });
    assert.equal(raw.metadata.$yamlValue.category, "hair");
});

test("unknown tags support preserve, reject, allowlist, and explicit handlers", () =>
{
    const source = "value: !units/metres 12\n";

    assert.deepEqual(CjsYamlFormat.readRaw(source), {
        value: { $yamlTag: "!units/metres", $yamlValue: "12" }
    });
    assert.throws(
        () => CjsYamlFormat.readRaw(source, { tagPolicy: "reject", sourceName: "units.yaml" }),
        /units\.yaml:1:8.*rejected/
    );
    assert.throws(
        () => CjsYamlFormat.readRaw(source, { allowedTags: [ "!different" ] }),
        /not in allowedTags/
    );

    const handled = CjsYamlFormat.readRaw(source, {
        tagPolicy: "handle",
        allowedTags: [ "!units/metres" ],
        tagHandlers: {
            "!units/metres": value => ({ amount: Number(value), unit: "m" })
        }
    });
    assert.deepEqual(handled, { value: { amount: 12, unit: "m" } });
});

test("document and inspect expose source-aware syntax inventories", () =>
{
    const source = "left: &item !domain/item { value: 1 }\nright: *item\n";
    const document = CjsYamlFormat.readDocument(source, { sourceName: "profile.yaml" });

    assert.equal(document.source.name, "profile.yaml");
    assert.equal(document.root.kind, "mapping");
    assert.equal(document.tags[0].tag, "!domain/item");
    assert.equal(document.tags[0].location.line, 1);
    assert.equal(document.anchors[0].name, "item");
    assert.equal(document.aliases[0].name, "item");
    assert.equal(document.value.left, document.value.right);

    const invalid = CjsYamlFormat.inspect("value: [1,\n", { sourceName: "broken.yaml" });
    assert.equal(invalid.errors.length > 0, true);
    assert.match(invalid.errors[0].message, /line 2/);
});

test("document mode reports tag-policy errors without losing syntax context", () =>
{
    const document = CjsYamlFormat.readDocument("value: !unsafe 1\n", {
        tagPolicy: "reject",
        sourceName: "unsafe.yaml"
    });
    assert.equal(document.value, null);
    assert.equal(document.errors.length, 1);
    assert.match(document.errors[0].message, /unsafe\.yaml:1:8/);
    assert.equal(document.tags[0].tag, "!unsafe");
});

test("ToJSON converts a caller graph using payload identity conventions", () =>
{
    const node = { value: 1 };
    node.self = node;
    assert.deepEqual(CjsYamlFormat.toJSON(node), {
        $yamlId: 1,
        value: 1,
        self: { $yamlRef: 1 }
    });
});

test("payload encoding handles repeated arrays and rejects identity-field collisions", () =>
{
    const values = [ 1, 2 ];
    assert.deepEqual(CjsYamlFormat.toJSON({ left: values, right: values }), {
        left: { $yamlId: 1, $yamlValues: [ 1, 2 ] },
        right: { $yamlRef: 1 }
    });

    const reserved = { $yamlId: "source-owned" };
    assert.throws(
        () => CjsYamlFormat.toJSON({ left: reserved, right: reserved }),
        /reserved field "\$yamlId" already exists/
    );
});

test("standard YAML tags are data and never treated as custom constructors", () =>
{
    assert.deepEqual(CjsYamlFormat.readRaw("text: !!str 12\nnumber: !!int 12\n"), {
        text: "12",
        number: 12
    });
});

test("duplicate keys are strict by default and explicitly relaxable", () =>
{
    const source = "value: 1\nvalue: 2\n";
    assert.throws(() => CjsYamlFormat.readRaw(source), /Map keys must be unique/);
    assert.deepEqual(CjsYamlFormat.readRaw(source, { uniqueKeys: false }), { value: 2 });
    assert.throws(() => new CjsYamlFormat({ uniqueKeys: "false" }), /uniqueKeys must be a boolean/);
});

test("mapping keys cannot mutate result prototypes", () =>
{
    const raw = CjsYamlFormat.readRaw("__proto__: { polluted: true }\nconstructor: safe\n");
    assert.equal(Object.getPrototypeOf(raw), Object.prototype);
    assert.equal(Object.prototype.polluted, undefined);
    assert.equal(Object.hasOwn(raw, "__proto__"), true);
    assert.deepEqual(raw.__proto__, { polluted: true });
    assert.equal(raw.constructor, "safe");

    const payload = CjsYamlFormat.toJSON(raw);
    assert.equal(Object.getPrototypeOf(payload), Object.prototype);
    assert.equal(Object.hasOwn(payload, "__proto__"), true);
    assert.equal(Object.prototype.polluted, undefined);
});

test("alias limits and tag handlers are validated", () =>
{
    assert.throws(
        () => CjsYamlFormat.readRaw("a: &x 1\nb: *x\n", { maxAliasCount: 0, sourceName: "aliases.yaml" }),
        /aliases\.yaml.*alias count 1 exceeds maxAliasCount 0/
    );
    assert.throws(
        () => new CjsYamlFormat({ tagHandlers: { "!unsafe": "constructor" } }),
        /tag handler "!unsafe" must be a function/
    );
});

test("invalid inputs, options, keys, and tag shapes fail closed", () =>
{
    assert.throws(() => CjsYamlFormat.readRaw(null), /input must be a YAML string/);
    assert.throws(() => new CjsYamlFormat({ unknown: true }), /unknown option "unknown"/);
    assert.throws(() => new CjsYamlFormat({ emit: "unsafe" }), /unknown emit value/);
    assert.throws(() => new CjsYamlFormat({ tagPolicy: "unsafe" }), /unknown tagPolicy value/);
    assert.throws(() => new CjsYamlFormat({ allowedTags: "!tag" }), /allowedTags must be/);
    assert.throws(() => new CjsYamlFormat({ tagHandlers: null }), /tagHandlers must be/);
    assert.throws(() => new CjsYamlFormat({ maxAliasCount: -1 }), /non-negative integer/);
    assert.throws(() => new CjsYamlFormat({ idField: "" }), /idField must be a non-empty string/);
    assert.throws(
        () => CjsYamlFormat.readRaw("? [compound, key]\n: value\n"),
        /mapping keys must be scalar values/
    );
    assert.throws(
        () => CjsYamlFormat.readRaw("value: !!python\/tuple not-a-sequence\n"),
        /python\/tuple.*must decorate a sequence/
    );
    assert.throws(
        () => CjsYamlFormat.readRaw("value: !unhandled 1\n", { tagPolicy: "handle" }),
        /has no explicit handler/
    );
});

test("reader accepts bounded UTF-8 byte views and rejects invalid UTF-8", () =>
{
    const source = new TextEncoder().encode("value: 7\n");
    const padded = new Uint8Array(source.length + 4);
    padded.set(source, 2);

    assert.deepEqual(
        CjsYamlFormat.readRaw(new DataView(padded.buffer, 2, source.length)),
        { value: 7 }
    );
    assert.throws(
        () => CjsYamlFormat.readRaw(new Uint8Array([ 0xC3, 0x28 ])),
        /valid UTF-8 YAML/u
    );
});
