import assert from "node:assert/strict";
import { test } from "node:test";
import { findOwnedInstanceof } from "../../scripts/lint-instanceof.js";

for (const [source, expected] of [
    ["if (value instanceof EveEntity) use(value);", ["EveEntity"]],
    ["const ok = item instanceof models.Tr2MeshArea;", ["models"]],
    ["@meta.define({ className: \"A\" }) class A { Is(x) { return x instanceof A; } }", ["A"]],
    ["function f(value) { if (!(value instanceof Tr2Mesh)) return; }", ["Tr2Mesh"]]
]) test(`instanceof lint counts ${source}`, () =>
{
    assert.deepEqual(findOwnedInstanceof(source), expected);
});

for (const source of [
    "const ok = value instanceof Map;",
    "const ok = value instanceof Uint8Array;",
    "const words = \"implements import inline instanceof interface layout\";",
    "const text = `a instanceof Thing`;",
    "// value instanceof EveEntity\nconst ok = true;",
    "/* value instanceof EveEntity */ const ok = true;"
]) test(`instanceof lint ignores ${source}`, () =>
{
    assert.deepEqual(findOwnedInstanceof(source), []);
});
