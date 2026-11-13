// CjsBlackFormat's public surface: every read goes through BlackReader into the registered classes; the payload and
// json outputs are the read objects' values, and inspect reports the header and string tables.
import { test } from "node:test";
import assert from "node:assert/strict";
import "../../../../../npm/dist/blue/values.js";
import "../../../../../npm/dist/blue/exposure/BlueClasses.js";
import { CjsSchema } from "../../../../../npm/dist/blue/schema/CjsSchema.js";
import { CjsBlackFormat } from "../../../../../npm/dist/blue/formats/black/index.js";
import * as CjsBlackFormatModule from "../../../../../npm/dist/blue/formats/black/index.js";
import { BlackReader } from "../../../../../npm/dist/blue/formats/black/BlackReader.js";
import { Fixture, f32 } from "../../../../support/blackFixture.js";

class Child { name = ""; weight = 0; }
CjsSchema.be.define(Child, { name: "BlackFormatApiChild", members: [
    { exposure: { macro: "MAP_ATTRIBUTE", flags: 16 }, name: "name", key: "name", type: { kind: "string" }, edit: { persist: true } },
    { exposure: { macro: "MAP_ATTRIBUTE", flags: 16 }, name: "weight", key: "weight", type: { kind: "float32" }, edit: { persist: true } }
] });
class Parent { first = null; second = null; }
CjsSchema.be.define(Parent, { name: "BlackFormatApiParent", members: [
    { exposure: { macro: "MAP_ATTRIBUTE", flags: 16 }, name: "first", key: "first", type: { kind: "rootRef" }, edit: { persist: true } },
    { exposure: { macro: "MAP_ATTRIBUTE", flags: 16 }, name: "second", key: "second", type: { kind: "rootRef" }, edit: { persist: true } }
] });

/** A parent whose two members share one child. */
function parentBytes()
{
    const f = new Fixture();
    return f.Finish(f.Object(1, "BlackFormatApiParent", [
        [ "first", f.Object(2, "BlackFormatApiChild", [ [ "name", f.S("child") ], [ "weight", f32(2.5) ] ]) ],
        [ "second", f.Object(2) ]
    ]));
}

test("the package root exports the format", () =>
{
    assert.deepEqual(Object.keys(CjsBlackFormatModule).sort(), [ "CjsBlackFormat" ]);
    assert.equal("default" in CjsBlackFormatModule, false);
});

test("the format exposes the standard profile API", () =>
{
    assert.deepEqual(Object.getOwnPropertyNames(CjsBlackFormat.prototype).sort(),
        [ "GetValues", "Inspect", "Read", "ReadPayload", "ReadRuntime", "SetValues", "ToJSON", "constructor" ].sort());
    for (const name of [ "read", "readPayload", "readRuntime", "inspect", "createObjectBuilder", "createBlackObjectBuilder", "toJSON", "probeSupport" ])
    {
        assert.equal(typeof CjsBlackFormat[name], "function", name);
    }
    assert.equal(CjsBlackFormat.id, "CjsBlackFormat");
    assert.equal(CjsBlackFormat.version, 1);
    assert.equal(new CjsBlackFormat().GetValues().emit, "json");
    assert.equal(new CjsBlackFormat({ emit: "runtime" }).GetValues().emit, "runtime");
});

test("the support probe recognizes Black's magic without parsing the body", () =>
{
    const bytes = new Uint8Array(8);
    new DataView(bytes.buffer).setUint32(0, CjsBlackFormat.fourCC, true);
    assert.equal(CjsBlackFormat.is(null, bytes), true);
    assert.equal(CjsBlackFormat.is(null, bytes.subarray(1)), false);
    assert.equal(CjsBlackFormat.is(null, new Uint8Array([ 1, 2, 3 ])), false);
});

test("inspect reports the header and string tables", () =>
{
    const info = CjsBlackFormat.inspect(parentBytes());
    assert.equal(info.format.id, "black");
    assert.equal(info.format.version, 1);
    assert.ok(info.dataOffset > 0);
    assert.deepEqual([ ...info.strings ].sort(), [ "BlackFormatApiChild", "BlackFormatApiParent", "child", "first", "name", "second", "weight" ]);
    assert.deepEqual(info.wideStrings, []);
});

test("a runtime read builds the registered classes, sharing what the file shares", () =>
{
    const { root, format } = CjsBlackFormat.readRuntime(parentBytes());
    assert.equal(root.constructor, Parent);
    assert.equal(root.first.constructor, Child);
    assert.equal(root.first, root.second);
    assert.equal(root.first.weight, 2.5);
    assert.deepEqual(format, { id: "black", version: 1 });
    assert.equal(CjsBlackFormat.read(parentBytes(), { emit: "runtime" }).root.first.name, "child");
    const builder = CjsBlackFormat.createObjectBuilder(parentBytes());
    assert.equal(builder.constructor, BlackReader);
    assert.notEqual(builder.CreateObject(0), builder.CreateObject(0));
});

test("the payload is the read objects' values, with each object's class and shared objects as _id/_ref", () =>
{
    const { object } = CjsBlackFormat.readPayload(parentBytes());
    assert.equal(object._type, "BlackFormatApiParent");
    assert.equal(object.first._type, "BlackFormatApiChild");
    assert.equal(object.first.name, "child");
    assert.equal(object.first.weight, 2.5);
    assert.ok(Object.hasOwn(object.first, "_id"));
    assert.deepEqual(object.second, { _ref: object.first._id });
    // The default output is the same payload as JSON-compatible data.
    assert.deepEqual(CjsBlackFormat.read(parentBytes()).object, CjsBlackFormat.toJSON(object));
});

test("a failed read carries BlackReader's message", () =>
{
    const f = new Fixture();
    const bytes = f.Finish(f.Object(1, "BlackFormatApiChild", [ [ "unknown", f32(1) ] ]));
    assert.throws(() => CjsBlackFormat.readRuntime(bytes), /Invalid attribute: unknown/);
    assert.throws(() => CjsBlackFormat.createObjectBuilder(new Uint8Array(8)), /Invalid file/);
});

test("the dropped plain-data reader's options and the removed outputs are refused", () =>
{
    for (const option of [ "schema", "classes", "payloadRootFields", "adapter" ])
    {
        assert.throws(() => CjsBlackFormat.read(parentBytes(), { [option]: null }), new RegExp(`option "${option}" belonged to the dropped plain-data reader`));
    }
    for (const emit of [ "document", "raw" ]) assert.throws(() => CjsBlackFormat.read(parentBytes(), { emit }), /unknown output/);
});
