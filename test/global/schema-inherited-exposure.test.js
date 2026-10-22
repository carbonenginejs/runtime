import assert from "node:assert/strict";
import test from "node:test";
import { transformSync } from "@babel/core";
import decoratorsPlugin from "@babel/plugin-proposal-decorators";
import { exposure as be } from "#be";
import { CjsSchema, meta, type } from "../../src/global/schema/index.js";
import { CjsBlueClasses } from "../../src/global/blue/CjsBlueClasses.js";
import { getClassRegistration } from "../../src/global/blue/classes/registry.js";

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
    assert.equal(row.impl.status, "implemented", "the inherited state is kept");
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
      export class Base { @type.int32 plain = 0; @type.int32 chosen = 0; @type.uint32 owner = 0; }
      @be.define("InhAttrSub")
      @be.mapPropertyReadOnly__Field("owner")
      @be.mapAttributeWithChooser(be.READWRITE | be.PERSIST | be.ENUM, null, "chosen")
      @be.mapAttribute(be.READ, "plain")
      export class Sub extends Base {}`);
    // The schema lists inherited declarations beside the class's own, as it does for any redeclared member; the subclass's row is the one it declares.
    const own = name => CjsSchema.getSchema(Sub).members.find(m => m.name === name && m.declaringClass === Sub);
    const members = Object.fromEntries([ "plain", "chosen", "owner" ].map(name => [ name, own(name)?.exposure?.macro ]));
    assert.deepEqual(members, { plain: "MAP_ATTRIBUTE", chosen: "MAP_ATTRIBUTE_WITH_CHOOSER", owner: "MAP_PROPERTY_READONLY" });
    assert.equal(own("plain").exposure.flags, be.READ);
    assert.equal(own("plain").type.kind, "int32", "the inherited type is kept");
    assert.equal(own("owner").type.kind, "uint32");
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

test("the subclass's row is Carbon's complete row: its flags replace the base's instead of overlaying them", async () =>
{
    const { Base, Sub } = await load(`
      @meta.carbon("InhFlagBase")
      export class Base { @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY) @type.boolean display = true; }
      @be.define("InhFlagSub")
      @be.mapAttribute(be.READWRITE | be.PERSIST, "display")
      export class Sub extends Base {}`);
    const own = CjsSchema.getSchema(Sub).members.find(m => m.name === "display" && m.declaringClass === Sub);
    assert.equal(own.edit.notify, undefined, "the base's NOTIFY does not survive");
    assert.equal(own.edit.write, true);
    assert.equal(own.edit.persist, true);
    assert.equal(own.exposure.flags, be.READWRITE | be.PERSIST);
    assert.equal(own.type.kind, "boolean", "what the row does not define stays inherited");
    const base = CjsSchema.getSchema(Base).members.find(m => m.name === "display");
    assert.equal(base.edit.notify, true, "the base keeps its own flags");
    assert.equal(base.exposure.flags, be.READWRITE | be.PERSIST | be.NOTIFY);
});

test("be.abstract and meta.abstract above a class mark it abstract, below the identity decorator", async () =>
{
    const { Plain, Marked, Ours } = await load(`
      @be.define("AbstractPlain") export class Plain {}
      @be.define("AbstractMarked") @be.abstract export class Marked {}
      @meta.define("AbstractOurs") @meta.abstract export class Ours {}`);
    assert.equal(CjsSchema.getSchema(Plain).abstract, undefined);
    assert.equal(CjsSchema.getSchema(Marked).abstract, true);
    assert.equal(getClassRegistration("AbstractMarked").flags, 1, "Blue refuses to construct it");
    assert.equal(getClassRegistration("AbstractPlain").flags, 0);
    assert.equal(CjsSchema.getSchema(Ours).abstract, true);
    assert.equal(getClassRegistration("AbstractOurs").flags, 1);
    class Late2 {}
    be.define("AbstractLate")(Late2);
    assert.throws(() => be.abstract(Late2), /added to AbstractLate after it registered/);
});
