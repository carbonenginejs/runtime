import assert from "node:assert/strict";
import test from "node:test";
import { transformSync } from "@babel/core";
import decoratorsPlugin from "@babel/plugin-proposal-decorators";
import { exposure as be } from "#be";
import { CjsSchema, meta, type } from "../../src/global/schema/index.js";
import { CjsBlueClasses } from "../../src/global/blue/CjsBlueClasses.js";

// decorator-upgrade.md § 00 "Inherited members mapped by a subclass": every be.map* decorator also works above a class, naming a member
// the class inherits. The row lands in the subclass's own table, the base's table keeps what it had, and the name is required.
// Attribute and property rows run before the class registers, so they sit below `@be.define` (nearest the class); method rows may sit anywhere.

const beUrl = new URL("../../src/global/schema/be.js", import.meta.url).href;
const schemaUrl = new URL("../../src/global/schema/index.js", import.meta.url).href;
async function load(source)
{
    const header = `import { exposure as be } from ${JSON.stringify(beUrl)}; import { meta, type } from ${JSON.stringify(schemaUrl)};\n`;
    const code = transformSync(header + source, { configFile: false, babelrc: false, plugins: [ [ decoratorsPlugin, { version: "2023-11" } ] ] }).code;
    return import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
}

test("a method mapped above a subclass lands in the subclass's own table, not the base's", async () =>
{
    const { Base, Sub, Other } = await load(`
      @meta.carbon("InhBase")
      export class Base { @meta.implemented Rebuild() { return 1; } @meta.implemented Other() { return 2; } }
      @be.mapMethodAndWrap("Rebuild")
      @be.define("InhSub")
      export class Sub extends Base {}
      @be.define("InhOther")
      export class Other extends Base {}`);
    const row = CjsSchema.getMethod(Sub, "Rebuild");
    assert.equal(row.exposure.macro, "MAP_METHOD_AND_WRAP");
    assert.equal(row.carbon.method, true);
    assert.equal(CjsSchema.getMethod(Base, "Rebuild").exposure, undefined);
    assert.equal(CjsSchema.getMethod(Other, "Rebuild").exposure, undefined);
    assert.equal(new Sub().Rebuild(), 1, "no override is written");
    const info = CjsBlueClasses._typeInfo(Sub, 0)[3];
    assert.ok("Rebuild" in info);
});

test("methods take an array of names, and every method macro kind records its own macro", async () =>
{
    const { Sub } = await load(`
      export class Base { A() {} B() {} C() {} D() {} }
      @be.mapMethod("D")
      @be.mapMethodAsMethod("C")
      @be.mapMethodAndWrapOptionalArgs("B")
      @be.mapMethodAndWrap(["A"])
      @be.define("InhArrSub")
      export class Sub extends Base {}`);
    const macros = Object.fromEntries(CjsSchema.getSchema(Sub).methods.map(m => [ m.name, m.exposure?.macro ]));
    assert.deepEqual(macros, { A: "MAP_METHOD_AND_WRAP", B: "MAP_METHOD_AND_WRAP_OPTIONAL_ARGS", C: "MAP_METHOD_AS_METHOD", D: "MAP_METHOD" });
    const two = await load(`
      export class Base { A() {} B() {} }
      @be.mapMethodAndWrap(["A", "B"])
      @be.define("InhTwoSub")
      export class Sub extends Base {}`);
    assert.deepEqual(CjsSchema.getSchema(two.Sub).methods.map(m => m.name).sort(), [ "A", "B" ]);
});

test("an inherited property is mapped by the subclass with its own flags", async () =>
{
    const { Base, Sub } = await load(`
      @meta.carbon("InhPropBase")
      export class Base {
        get partTag() { return 3; }
        get both() { return 1; }
        set both(value) {}
        get saved() { return 1; }
        set saved(value) {}
      }
      @be.define("InhPropSub")
      @be.mapPropertyPersisted("saved")
      @be.mapProperty("both")
      @be.mapPropertyReadOnly("partTag")
      export class Sub extends Base {}`);
    const rows = Object.fromEntries(CjsSchema.getSchema(Sub).properties.map(p => [ p.name, p.exposure?.macro ]));
    assert.deepEqual(rows, { partTag: "MAP_PROPERTY_READONLY", both: "MAP_PROPERTY", saved: "MAP_PROPERTY_PERSISTED" });
    assert.equal(CjsSchema.getSchema(Sub).properties.find(p => p.name === "partTag").edit.write, undefined);
    assert.equal(CjsSchema.getSchema(Sub).properties.find(p => p.name === "saved").edit.persist, true);
    assert.equal(CjsSchema.getSchema(Base).properties.some(p => p.exposure), false);
    assert.equal(new Sub().partTag, 3);
});

test("an inherited field is mapped as an attribute, with a chooser, or as a field property", async () =>
{
    const { Sub, Base } = await load(`
      @meta.carbon("InhAttrBase")
      export class Base { plain = 0; chosen = 0; owner = null; }
      @be.define("InhAttrSub")
      @be.mapPropertyReadOnly__Field("owner")
      @be.mapAttributeWithChooser(be.READWRITE | be.PERSIST | be.ENUM, null, "chosen")
      @be.mapAttribute(be.READ, "plain")
      export class Sub extends Base {}`);
    const members = Object.fromEntries(CjsSchema.getSchema(Sub).members.map(m => [ m.name, m.exposure?.macro ]));
    assert.deepEqual(members, { plain: "MAP_ATTRIBUTE", chosen: "MAP_ATTRIBUTE_WITH_CHOOSER", owner: "MAP_PROPERTY_READONLY" });
    assert.equal(CjsSchema.getSchema(Sub).members.find(m => m.name === "plain").exposure.flags, be.READ);
    assert.equal(CjsSchema.getSchema(Base).members.some(m => m.exposure), false);
});

test("above a class the name is required, a single string for non-methods, and must name a member for methods and properties", () =>
{
    class Base { Go() {} get prop() { return 1; } }
    for (const name of [ "mapMethod", "mapMethodAndWrap", "mapMethodAndWrapOptionalArgs", "mapMethodAsMethod",
        "mapProperty", "mapPropertyReadOnly", "mapPropertyPersisted", "mapProperty__Field", "mapPropertyReadOnly__Field", "mapPropertyPersisted__Field" ])
        assert.throws(() => { class Sub extends Base {} be[name]()(Sub); }, /requires the name of the inherited member/, name);
    assert.throws(() => { class Sub extends Base {} be.mapAttribute(be.READ)(Sub); }, /requires the name of the inherited member/);
    assert.throws(() => { class Sub extends Base {} be.mapAttributeWithChooser(be.READ, null)(Sub); }, /requires the name of the inherited member/);
    assert.throws(() => { class Sub extends Base {} be.mapMethodAndWrap([])(Sub); }, /requires the name/);
    assert.throws(() => { class Sub extends Base {} be.mapMethodAndWrap([ "Go", "" ])(Sub); }, /requires the name/);
    assert.throws(() => { class Sub extends Base {} be.mapProperty([ "prop" ])(Sub); }, /only methods take an array/);
    assert.throws(() => { class Sub extends Base {} be.mapAttribute(be.READ, [ "x" ])(Sub); }, /only methods take an array/);
    assert.throws(() => { class Sub extends Base {} be.mapMethodAndWrap("Missing")(Sub); }, /does not have or inherit/);
    assert.throws(() => { class Sub extends Base {} be.mapPropertyReadOnly("missing")(Sub); }, /does not have or inherit/);
});

test("below a member the name stays the optional exposed name and an array is refused", () =>
{
    class Base { Go() {} }
    assert.throws(() => be.mapMethodAndWrap([ "A" ])(Base.prototype, "Go"), /array of names only above a class/);
    class Own { Go() {} }
    be.mapMethodAndWrap("go")(Own.prototype, "Go");
    meta.carbon("InhOwn")(Own);
    assert.equal(CjsSchema.getSchema(Own).methods.find(m => m.name === "Go").exposure.name, "go");
});
