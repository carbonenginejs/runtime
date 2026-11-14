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
