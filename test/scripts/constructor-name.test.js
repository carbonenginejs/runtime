import assert from "node:assert/strict";
import { test } from "node:test";
import { findConstructorNameHits } from "../../scripts/lint-constructor-name.js";

for (const source of [
    "const { constructor: factory } = value; const type = factory.name;",
    "const { constructor: { name: type } } = value;",
    "import model from './Model.js'; const type = model.name;",
    "class Widget { constructor() { this.name = new.target.name; } }",
    "let alias; alias = value.constructor; const type = alias.name;",
    "const {name: type} = value.constructor;",
    "const key = 'name'; const type = value.constructor[key];",
    "const id = value.constructor.name;",
    "const id = value?.constructor?.name;",
    'const id = value["constructor"]["name"];',
    "const id = Function.name;",
    "class Widget {} const id = Widget.name;",
    "class Widget {} const alias = Widget; const id = alias.name;",
    'import { Widget as alias } from "./widget.js"; const id = alias.name;',
    'import * as models from "./models.js"; const id = models.Widget.name;',
    "function register(ctor) { return ctor.name; }",
    'function register(type) { if (typeof type === "function") return type.name; }',
    "class Widget { static id() { return this.name; } }",
    'const id = item.constructor.name; new Error(`Bad ${id}`); save(id);',
    'class Uint8Array {} const id = Uint8Array.name;'
]) test(`constructor-name lint rejects ${source}`, () =>
{
    assert.equal(findConstructorNameHits(source).length, 1);
});

for (const source of [
    'const text = "value.constructor.name"; // Widget.name',
    'const name = Uint8Array.name;',
    'function isAsync(value) { return value.constructor.name === "AsyncFunction"; }',
    'throw new Error(`Bad ${value.constructor.name}`);',
    'class Widget {} const name = Widget.name; throw new TypeError(`Bad ${name}`);',
    'const descriptor = { name: "Widget" }; save(descriptor.name);',
    'function read(type) { if (typeof type === "function") type = { className: type }; return type.name; }'
]) test(`constructor-name lint permits ${source}`, () =>
{
    assert.deepEqual(findConstructorNameHits(source), []);
});
