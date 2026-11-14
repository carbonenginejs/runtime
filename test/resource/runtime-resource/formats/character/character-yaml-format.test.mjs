import test from "node:test";
import assert from "node:assert/strict";
import { CjsYamlFormat } from "../../../../../src/resource/formats/yaml/CjsYamlFormat.js";
import { CjsCharacterYamlFormat } from "../../../../../src/resource/formats/character/index.js";

const TUPLE = "tag:yaml.org,2002:python/tuple";
const UNICODE = "tag:yaml.org,2002:python/unicode";

test("the YAML reader converts Python tuples and unicode unless asked to preserve them", () =>
{
    const text = "a: !!python/tuple [1, 2.0]\nb: !!python/unicode 'x'\n";
    assert.deepEqual(CjsYamlFormat.readRaw(text), { a: [ 1, 2 ], b: "x" });
    const kept = CjsYamlFormat.readRaw(text, { preservePythonTags: true });
    assert.deepEqual(kept, { a: { $yamlTag: TUPLE, $yamlValue: [ 1, 2 ] }, b: { $yamlTag: UNICODE, $yamlValue: "x" } });
    assert.throws(() => CjsYamlFormat.readRaw(text, { preservePythonTags: "yes" }), /preservePythonTags/);
});

test("the generic YAML reader knows no character tag; the character format keeps them", async () =>
{
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(new URL("../../../../../src/resource/formats/yaml/core/CjsYamlReader.js", import.meta.url), "utf8");
    assert.doesNotMatch(source, /paperDoll|python\/object/u);
    const decal = "!!python/object:paperDoll.ProjectedDecal {label: arml}\n";
    const metadata = "!!python/object:paperDoll.AvatarPartMetaData {lodLevel: 1}\n";
    for (const text of [ decal, metadata ])
    {
        assert.throws(() => CjsYamlFormat.readRaw(text, { tagPolicy: "reject" }), /rejected by tagPolicy/);
        assert.throws(() => CjsYamlFormat.readRaw(text, { tagPolicy: "handle" }), /no explicit handler/);
    }
    assert.deepEqual(CjsCharacterYamlFormat.readRaw(decal), { $yamlTag: "tag:yaml.org,2002:python/object:paperDoll.ProjectedDecal", $yamlValue: { label: "arml" } });
});

test("the character format reads losslessly: tags kept, ints apart from floats, shared nodes shared", () =>
{
    const raw = CjsCharacterYamlFormat.readRaw("colors:\n- &id001 !!python/tuple [0.5, 0, 1.0]\n- *id001\n");
    assert.equal(raw.colors[0], raw.colors[1]);
    assert.deepEqual(raw.colors[0].$yamlValue, [ 0.5, 0n, 1 ]);
    assert.deepEqual(CjsCharacterYamlFormat.extensions, [ ".base", ".color", ".face", ".info", ".pose", ".proj", ".prs", ".trif", ".type" ]);
});

test("the character format writes as PyYAML dumped the file type", () =>
{
    const color = "colors:\r\n- &id001 !!python/tuple [0.5, 0, 1.0]\r\n- *id001\r\npattern: ''\r\n";
    assert.equal(CjsCharacterYamlFormat.write(CjsCharacterYamlFormat.readRaw(color), { extension: ".color" }), color);
    const type = "!!python/tuple\r\n- hair/hair_bob_02\r\n- ''\r\n- ''\r\n- - 1\r\n  - 2\r\n";
    assert.equal(CjsCharacterYamlFormat.write(CjsCharacterYamlFormat.readRaw(type), { extension: ".type" }), type);
    const recipe = "- female\r\n- category: head\r\n  colorvariation:\r\n  path: head/head_generic\r\n  weight: 1.0\r\n";
    assert.equal(CjsCharacterYamlFormat.write(CjsCharacterYamlFormat.readRaw(recipe), { extension: ".prs" }), recipe);
    assert.throws(() => CjsCharacterYamlFormat.write({}, { extension: ".yaml" }), /writes no \.yaml/);
});

test("a part's metadata modifiers read as { path, weight } and write back as their strings", () =>
{
    const text = "!!python/object:paperDoll.AvatarPartMetaData {dependantModifiers: [utilityshapes/a###0.05, archetypes/b###1.0, utilityshapes/c#, dependants/d],\n  occludesModifiers: [utilityshapes/e#2.0, hair]}\n";
    const raw = CjsCharacterYamlFormat.readRaw(text);
    assert.deepEqual(raw.$yamlValue.dependantModifiers, [ { path: "utilityshapes/a", weight: 0.05 }, { path: "archetypes/b", weight: 1 }, { path: "utilityshapes/c", weight: null }, { path: "dependants/d", weight: null } ]);
    assert.deepEqual(raw.$yamlValue.occludesModifiers, [ { path: "utilityshapes/e", weight: 2 }, { path: "hair", weight: null } ]);
    // The bare `#` of outer/jacketmilf01 states no weight and is not written back.
    const written = CjsCharacterYamlFormat.write(raw, { extension: ".proj", lineBreak: "\n" });
    assert.equal(written, "!!python/object:paperDoll.AvatarPartMetaData\ndependantModifiers: [utilityshapes/a###0.05, archetypes/b###1.0, utilityshapes/c,\n  dependants/d]\noccludesModifiers: [utilityshapes/e#2.0, hair]\n");
    assert.deepEqual(CjsCharacterYamlFormat.readRaw(written), raw);
    // A caller's handler for the metadata tag is given the decoded lists.
    const handled = CjsCharacterYamlFormat.readRaw("!!python/object:paperDoll.AvatarPartMetaData {occludesModifiers: [x#0.5]}\n",
        { tagPolicy: "handle", tagHandlers: { "!!python/object:paperDoll.AvatarPartMetaData": values => values } });
    assert.deepEqual(handled, { occludesModifiers: [ { path: "x", weight: 0.5 } ] });
    assert.deepEqual(CjsCharacterYamlFormat.decodeModifier("topunderwear###1", "#", "f"), { path: "topunderwear", weight: 1 });
    for (const [ entry, separator ] of [ [ "x#0.5", "###" ], [ "utilityshapes/x###0.5", "#" ], [ "x#wat", "#" ], [ "x#2.0#1", "#" ] ])
        assert.throws(() => CjsCharacterYamlFormat.decodeModifier(entry, separator, "f"), /^TypeError: f: no modifier form reads/u);
});

test("a recipe's colours text reads as its list and writes back as Python's repr", () =>
{
    const recipe = "- female\r\n- category: head\r\n  colors: '[(0.5, 0, 1.0, 1), (0.25, 0.5, 0.5, 1.0)]'\r\n  weight: 1.0\r\n";
    const raw = CjsCharacterYamlFormat.readRaw(recipe, { sourceName: "res:/x.prs" });
    assert.deepEqual(raw[1].colors.map(tuple => tuple.$yamlValue), [ [ 0.5, 0n, 1, 1n ], [ 0.25, 0.5, 0.5, 1 ] ]);
    assert.equal(CjsCharacterYamlFormat.write(raw, { extension: ".prs" }), recipe);
    // Plain values for hydration: tuples are arrays and ints numbers; a tuple of tuples ending in a number keeps its order.
    const plain = { preservePythonTags: false, intAsBigInt: false };
    assert.deepEqual(CjsCharacterYamlFormat.decodeRepr("((0.1, 0.2, 0.3, 1.0), 2.5)", { ...plain, tagField: "$yamlTag", valueField: "$yamlValue" }, "t"), [ [ 0.1, 0.2, 0.3, 1 ], 2.5 ]);
    assert.equal(CjsCharacterYamlFormat.writeRepr(CjsCharacterYamlFormat.decodeRepr("((0.1, 2), 2.5)", { preservePythonTags: true, intAsBigInt: true, tagField: "$yamlTag", valueField: "$yamlValue" }, "t")), "((0.1, 2), 2.5)");
    assert.equal(CjsCharacterYamlFormat.writeRepr(CjsCharacterYamlFormat.decodeRepr("((0.1, 0.2, 0.3, 1),)", { preservePythonTags: true, intAsBigInt: true, tagField: "$yamlTag", valueField: "$yamlValue" }, "t")), "((0.1, 0.2, 0.3, 1),)");
    assert.throws(() => CjsCharacterYamlFormat.decodeRepr("[(0.1, x)]", { ...plain, tagField: "$yamlTag", valueField: "$yamlValue" }, "f colors"), /^TypeError: f colors: not a Python repr of numbers/u);
    // Outside a recipe the text stays a string.
    assert.equal(CjsCharacterYamlFormat.readRaw("colors: '[(1, 2)]'\n", { sourceName: "res:/x.color" }).colors, "[(1, 2)]");
});

test("floats are written as Python's repr, with PyYAML's .0e rule", () =>
{
    const write = (value, floatDigits = null) => CjsCharacterYamlFormat.write([ value ], { defaultFlowStyle: null, lineBreak: "\n", floatDigits });
    assert.equal(write(1), "[1.0]\n");
    assert.equal(write(1e-5), "[1.0e-05]\n");
    assert.equal(write(1.5e-14), "[1.5e-14]\n");
    assert.equal(write(1e16), "[1.0e+16]\n");
    assert.equal(write(0.0001), "[0.0001]\n");
    assert.equal(write(0.4, 17), "[0.40000000000000002]\n");
    assert.equal(write(0.5, 17), "[0.5]\n");
    assert.equal(write(-0), "[-0.0]\n");
});
