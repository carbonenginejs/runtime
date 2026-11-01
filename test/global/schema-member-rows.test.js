import assert from "node:assert/strict";
import test from "node:test";
import { transformSync } from "@babel/core";
import decoratorsPlugin from "@babel/plugin-proposal-decorators";
import { exposure as be } from "#be";
import { CjsSchema, type } from "../../src/blue/schema/index.js";
import { BlueClasses } from "../../src/blue/blueexposure/BlueClasses.js";
import { isWritableField } from "../../src/blue/compose/values.js";

// decorator-upgrade.md § 00 "One member under two Carbon names": each be.map* row on a member registers its own exposed name over the
// same key with its own flags. The row nearest the member is the member's own; rows above it add names. Two rows with one name throw.

const beUrl = new URL("../../src/blue/blueexposure/be.js", import.meta.url).href;
const schemaUrl = new URL("../../src/blue/schema/index.js", import.meta.url).href;
async function load(source)
{
    const header = `import { exposure as be } from ${JSON.stringify(beUrl)}; import { meta, type } from ${JSON.stringify(schemaUrl)};\n`;
    const code = transformSync(header + source, { configFile: false, babelrc: false, plugins: [ [ decoratorsPlugin, { version: "2023-11" } ] ] }).code;
    return import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
}

const TWO_NAMES = `
  @be.define("RowsTwoNames")
  export class RowsTwoNames
  {
    @be.mapAttribute(be.READ, "currentValue")
    @be.mapAttribute(be.READWRITE | be.PERSIST)
    @type.float32
    value = 1;
  }`;

test("a second attribute row adds its own exposed name with its own flags", async () =>
{
    const { RowsTwoNames } = await load(TWO_NAMES);
    const members = Object.fromEntries(CjsSchema.getSchema(RowsTwoNames).members.map(member => [ member.name, member ]));
    assert.deepEqual(Object.keys(members), [ "currentValue", "value" ], "source order, the order of Carbon's rows");
    assert.equal(members.value.key, "value");
    assert.equal(members.currentValue.key, "value");
    assert.deepEqual(members.value.edit, { read: true, write: true, persist: true });
    assert.deepEqual(members.currentValue.edit, { read: true });
    assert.equal(members.value.exposure.flags, 19);
    assert.equal(members.currentValue.exposure.flags, 1);
    assert.equal(members.currentValue.type.kind, "float32", "the alias shares the member's type");
    assert.equal(CjsSchema.getSchema(RowsTwoNames).fields.filter(field => field.name === "value").length, 1, "one storage, one field");
});

test("the READ name refuses a script write and the persisted name reads from a file bag", async () =>
{
    const { RowsTwoNames } = await load(TWO_NAMES);
    const members = Object.fromEntries(CjsSchema.getSchema(RowsTwoNames).members.map(member => [ member.name, member ]));
    assert.equal(isWritableField(members.currentValue), false, "READ-only: a script write is refused");
    assert.equal(isWritableField(members.value), true);
    assert.equal(members.value.edit.persist, true, "the persisted name is read from and written to files");
    assert.equal(members.currentValue.edit.persist, undefined, "the READ name is not persisted");
});

test("type information lists both names, each with its own flags", async () =>
{
    const { RowsTwoNames } = await load(TWO_NAMES);
    const info = BlueClasses._typeInfo(RowsTwoNames, 0);
    const members = info.find(section => section && typeof section === "object" && "value" in section && "currentValue" in section);
    assert.ok(members, "both names are in the type information");
});

test("property rows also keep a second name", async () =>
{
    const { RowsProp } = await load(`
      @be.define("RowsProp")
      export class RowsProp
      {
        @be.mapPropertyReadOnly("level")
        @be.mapProperty("amount")
        get amount() { return 1; }
        set amount(value) {}
      }`);
    const props = Object.fromEntries(CjsSchema.getSchema(RowsProp).properties.map(property => [ property.name, property ]));
    assert.deepEqual(Object.keys(props).sort(), [ "amount", "level" ]);
    assert.equal(props.amount.exposure.macro, "MAP_PROPERTY");
    assert.equal(props.level.exposure.macro, "MAP_PROPERTY_READONLY");
});

test("two rows with one exposed name throw, identical or not", async () =>
{
    await assert.rejects(load(`
      @be.define("RowsDupSame")
      export class RowsDupSame
      {
        @be.mapAttribute(be.READWRITE)
        @be.mapAttribute(be.READWRITE)
        value = 1;
      }`), /named "value"|duplicate/);
    await assert.rejects(load(`
      @be.define("RowsDupFlags")
      export class RowsDupFlags
      {
        @be.mapAttribute(be.READ)
        @be.mapAttribute(be.READWRITE)
        value = 1;
      }`), /named "value"|duplicate/);
    await assert.rejects(load(`
      @be.define("RowsDupAlias")
      export class RowsDupAlias
      {
        @be.mapAttribute(be.READ, "same")
        @be.mapAttribute(be.READWRITE, "same")
        value = 1;
      }`), /named "same"|duplicate/);
});

test("the imperative call form registers the same rows", () =>
{
    class RowsCalled { value = 1; }
    CjsSchema.decorateField(RowsCalled, "value", type.float32, be.mapAttribute(be.READWRITE | be.PERSIST), be.mapAttribute(be.READ, "currentValue"));
    be.define("RowsCalled")(RowsCalled);
    const names = CjsSchema.getSchema(RowsCalled).members.map(member => member.name).sort();
    assert.deepEqual(names, [ "currentValue", "value" ]);
});

test("mapAttribute__Index names one element of an array member and leaves the array without a declaration of its own", async () =>
{
    const { RowsIndexed } = await load(`
      @be.define("RowsIndexed")
      export class RowsIndexed
      {
        @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "First", 0)
        @be.mapAttribute__Index(be.READ, "Second", 1)
        @type.array({ kind: "color" })
        slots = [ [ 1, 1, 1, 1 ], [ 0, 0, 0, 1 ] ];
      }`);
    const schema = CjsSchema.getSchema(RowsIndexed);
    assert.deepEqual(schema.members.map(member => [ member.name, member.key, member.index ]), [ [ "First", "slots", 0 ], [ "Second", "slots", 1 ] ]);
    assert.deepEqual(schema.members.map(member => member.type), [ { kind: "color" }, { kind: "color" } ], "each slot has the element type");
    assert.deepEqual(schema.members.map(member => member.exposure.flags), [ 19, 1 ]);
    assert.equal(schema.fields.some(field => field.name === "slots"), false, "the array hosts rows and declares nothing itself");
});

test("an indexed row needs its flags, a name and an index, and a repeated name throws", async () =>
{
    assert.throws(() => be.mapAttribute__Index("First", 0), /flags first/);
    assert.throws(() => be.mapAttribute__Index(be.READ, undefined, 0), /exposed name/);
    assert.throws(() => be.mapAttribute__Index(be.READ, "First"), /element index/);
    await assert.rejects(load(`
      @be.define("RowsIndexedDup")
      export class RowsIndexedDup
      {
        @be.mapAttribute__Index(be.READ, "Same", 0)
        @be.mapAttribute__Index(be.READ, "Same", 1)
        @type.array({ kind: "color" })
        slots = [ [ 1, 1, 1, 1 ], [ 0, 0, 0, 1 ] ];
      }`), /named "Same"/);
});
