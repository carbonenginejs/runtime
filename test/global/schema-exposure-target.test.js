import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { transformSync } from "@babel/core";
import decoratorsPlugin from "@babel/plugin-proposal-decorators";
import { IRoot } from "../../src/global/blue/IRoot.js";
import { unregisterClass, getClassRegistration, getClassRegistrationRevision } from "../../src/global/blue/classes/registry.js";
import { exposure } from "#be";
import { CjsSchema, meta, blue, type } from "../../src/global/schema/index.js";
import { hasOwnInterfaceTable, mappedInterfaces, ownMappedInterfaces } from "../../src/global/compose/interface.js";
import { CjsBlueClasses } from "../../src/global/blue/CjsBlueClasses.js";

// All explicit member/decorator rows of the five preparation samples. Bodies
// are inert: this test proves declaration parity, not engine behaviour.
const samples = JSON.parse(fs.readFileSync(new URL("./fixtures/decorator-sample-shapes.json", import.meta.url)));
const flags = { read: 1, write: 2, readwrite: 3, notify: 4, hidden: 8, persist: 16, rpersist: 32, persistOnly: 24 };
const spaces = { meta, blue, type };
const contracts = new Map();
const registeredEnums = new Set();
const fn = function () {};
const getter = function () { return null; };
const setter = function (value) { void value; };

/** Fixture references are registered literal identities, never reflection names. */
function contract(name)
{
    if (!contracts.has(name))
    {
        class Contract {}
        meta.interface(name)(Contract);
        contracts.set(name, Contract);
    }
    return contracts.get(name);
}

/** Removes only the identity of a fixture owner; every other exported field is compared. */
function comparable(value)
{
    if (Array.isArray(value)) return value.map(comparable);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(Object.entries(value).filter(([key]) => key !== "declaringClass")
        .map(([key,entry]) => [key, comparable(entry)]));
}

/** Builds the same class shape through legacy stacks or their new complete-row spelling. */
function sampleClass(sample, modern)
{
    class Sample {}
    for (const m of sample.members)
    {
        if (m.kind === "constructor") continue;
        const target = m.static ? Sample : Sample.prototype;
        if (m.kind === "method") Object.defineProperty(target, m.name, { value: fn, configurable: true });
        if (m.kind === "get" || m.kind === "set") Object.defineProperty(target, m.name, {
            ...Object.getOwnPropertyDescriptor(target, m.name), configurable: true,
            [m.kind]: m.kind === "get" ? getter : setter
        });
    }
    for (const m of sample.members)
    {
        const target = m.static ? Sample : Sample.prototype;
        const stack = m.decorators.filter(d => d.name.startsWith("blue.") && flags[d.name.slice(5)] !== undefined);
        const chooser = m.decorators.find(d => d.name === "blue.chooser");
        const prop = m.decorators.find(d => d.name === "blue.property");
        if (modern && stack.length)
        {
            const bits = stack.reduce((mask,d) => mask | flags[d.name.slice(5)], 0);
            const map = chooser ? exposure.mapAttributeWithChooser(bits, chooser.args[0]) : exposure.mapAttribute(bits);
            map(target, m.name);
        }
        for (const d of m.decorators)
        {
            if (modern && (stack.includes(d) || chooser === d)) continue;
            const [ns,key] = d.name.split(".");
            if (ns === "type" && ["enum","flags"].includes(key) || d.name === "blue.chooser")
            {
                const enumName = d.args[0];
                if (!registeredEnums.has(enumName))
                {
                    CjsSchema.defineEnum({ ZERO: 0, ONE: 1 }, { name: enumName, chooser: [{ name: "ZERO", value: 0 }, { name: "ONE", value: 1 }] });
                    registeredEnums.add(enumName);
                }
            }
            let decorator = spaces[ns][key];
            if (modern && d === prop)
            {
                const desc = Object.getOwnPropertyDescriptor(Sample.prototype, m.name);
                decorator = desc.set ? exposure.mapProperty() : exposure.mapPropertyReadOnly();
            }
            else if (d.call) decorator = decorator(...d.args);
            decorator(target, m.name);
        }
        // The old record store can express the exact new exposure fact too.
        // Compare all fields, including macro kind/flags, against that explicit oracle.
        if (!modern && stack.length)
        {
            const bits = stack.reduce((mask,d) => mask | flags[d.name.slice(5)], 0);
            CjsSchema.defineField(Sample, m.name, "exposure", { macro: chooser ? "MAP_ATTRIBUTE_WITH_CHOOSER" : "MAP_ATTRIBUTE", flags: bits,
                ...(chooser ? { chooser: chooser.args[0] } : {}) });
        }
        if (!modern && prop)
        {
            const writable = !!Object.getOwnPropertyDescriptor(Sample.prototype, m.name).set;
            CjsSchema.defineField(Sample, m.name, "exposure", { macro: writable ? "MAP_PROPERTY" : "MAP_PROPERTY_READONLY", flags: writable ? 3 : 1 });
        }
    }
    for (const d of sample.decorators)
    {
        if (d.name === "blue.interface")
        {
            const refs = d.args.map(arg => contract(arg.$expr));
            if (modern) for (const ref of refs) exposure.mapInterface(ref)(Sample);
            else blue.interface(...refs)(Sample);
        }
        if (d.name === "blue.chainTo")
        {
            const parent = contract(d.args[0].$expr);
            (modern ? exposure.exposureChainTo(parent) : blue.chainTo(parent))(Sample);
        }
    }
    const name = sample.name === "BlueCallbackManThreadData" ? "BlueCallbackMan::ThreadData" : sample.name;
    if (sample.name === "BlueCallbackManThreadData")
        (modern ? meta.carbon(name) : meta.define({ className: name, carbon: name }))(Sample);
    else
    {
        if (!modern) blue.interface()(Sample);
        (modern ? exposure.define(name) : blue.define(name))(Sample);
    }
    return Sample;
}

for (const sample of samples) test(`complete metadata pair: ${sample.name}`, () =>
{
    const Old = sampleClass(sample, false);
    unregisterClass(CjsSchema.getClassName(Old));
    const New = sampleClass(sample, true);
    assert.deepEqual(comparable(CjsSchema.getSchema(New)), comparable(CjsSchema.getSchema(Old)));
    const names = C => [...ownMappedInterfaces(C)].map(x => x === C ? "<self>" : CjsSchema.getClassName(x));
    assert.deepEqual(names(New), names(Old));
});

test("exposed definitions add self and IRoot; native and own interfaces do not create tables", () =>
{
    class Exposed {}
    class NativeInterface {}
    class OwnInterface {}
    exposure.define("TargetExposed")(Exposed);
    exposure.interface("TargetInterface")(NativeInterface);
    meta.interface("OwnInterface")(OwnInterface);
    assert.deepEqual([...mappedInterfaces(Exposed)], [IRoot, Exposed]);
    assert.equal(hasOwnInterfaceTable(NativeInterface), false);
    assert.equal(hasOwnInterfaceTable(OwnInterface), false);
    assert.equal(CjsSchema.getSchema(NativeInterface).blue, true);
    assert.equal(CjsSchema.getSchema(OwnInterface).blue, undefined);
    assert.equal(new CjsBlueClasses().CreateInstance("TargetInterface"), null);
    assert.equal(new CjsBlueClasses().CreateInstance("OwnInterface"), null);
    assert.equal(CjsSchema.getSchema(NativeInterface).interface, true);
});

test("complete attributes do not inherit parent flags, and ENUM comes only from the explicit bits", () =>
{
    class Parent { value = 0; }
    class Child extends Parent {}
    CjsSchema.defineEnum({ ZERO: 0 }, { name: "Target.Flags", chooser: [{name:"ZERO",value:0}] });
    CjsSchema.decorateField(Parent, "value", blue.readwrite, blue.persist, type.int32);
    blue.define("TargetParent")(Parent);
    CjsSchema.decorateField(Child, "value", exposure.mapAttributeWithChooser(exposure.READ, "Target.Flags"), type.enum("Target.Flags"));
    exposure.define("TargetChild")(Child);
    const own = CjsSchema.getSchema(Child).members.find(m => m.declaringClass === Child);
    assert.deepEqual(own.edit, {read:true});
    assert.equal(CjsSchema.getSchema(Parent).members[0].edit.persist, true);
    const registry = new CjsBlueClasses();
    assert.equal(registry.GetTypeInfo(new Child())[2].value.editflags, exposure.READ);
});

test("property variants enforce their native contract and readonly ignores an extra JS setter", () =>
{
    class ReadOnly { get value() { return 1; } set value(v) { void v; } }
    CjsSchema.decorateField(ReadOnly, "value", exposure.mapPropertyReadOnly("alias"), type.int32);
    exposure.define("TargetReadOnly")(ReadOnly);
    const p = CjsSchema.getSchema(ReadOnly).properties[0];
    assert.equal(p.name, "alias"); assert.equal(p.property.setter, null);
    assert.deepEqual(p.edit, {read:true});
    class Bad { get value() { return 1; } }
    CjsSchema.decorateField(Bad, "value", exposure.mapProperty(), type.int32);
    assert.throws(() => exposure.define("TargetBad")(Bad), /requires a setter/);
    class Persisted { get value() { return 1; } set value(v) { void v; } }
    CjsSchema.decorateField(Persisted, "value", exposure.mapPropertyPersisted(), type.int32);
    exposure.define("TargetPersisted")(Persisted);
    assert.equal(CjsSchema.getSchema(Persisted).properties[0].exposure.flags, 19);
});

test("method macro variants preserve status and alias; cjs is independent; notUsed throws", () =>
{
    class Sample { Call() {} Skip() {} Own() {} }
    const kinds = { mapMethod:"MAP_METHOD", mapMethodAndWrap:"MAP_METHOD_AND_WRAP", mapMethodAndWrapOptionalArgs:"MAP_METHOD_AND_WRAP_OPTIONAL_ARGS", mapMethodAsMethod:"MAP_METHOD_AS_METHOD" };
    for (const [key,macro] of Object.entries(kinds))
    {
        class Variant { Call() {} }
        CjsSchema.decorateMethod(Variant, "Call", exposure[key]("alias"), meta.implemented);
        exposure.define(`Target${key}`)(Variant);
        assert.deepEqual(CjsSchema.getMethod(Variant,"Call").exposure, {macro,name:"alias"});
        assert.equal(CjsSchema.getMethod(Variant,"Call").impl.status,"implemented");
        assert.deepEqual(Object.keys(new CjsBlueClasses().GetTypeInfo(new Variant())[3]), ["alias"]);
    }
    CjsSchema.decorateMethod(Sample,"Skip",meta.notUsed);
    CjsSchema.decorateMethod(Sample,"Own",meta.cjs,meta.adapted);
    meta.implemented(Sample);
    meta.carbon(["NativeOne","NativeTwo"])(Sample);
    assert.deepEqual(CjsSchema.getSchema(Sample).carbon,["NativeOne","NativeTwo"]);
    assert.equal(CjsSchema.getSchema(Sample).impl.status,"implemented");
    assert.equal(CjsSchema.getMethod(Sample,"Own").carbon.cjs,true);
    assert.throws(() => new Sample().Skip(), /Skip/);
});

test("Babel Stage-3 declarations record before instances exist, including class states and generated throws", async () =>
{
    const schemaUrl = new URL("../../src/global/schema/index.js",import.meta.url).href;
    const targetUrl = new URL("../../src/global/schema/be.js",import.meta.url).href;
    const source = `import {meta,type,CjsSchema} from ${JSON.stringify(schemaUrl)};
        import {exposure as target} from ${JSON.stringify(targetUrl)};
        @meta.implemented
        @target.define("TargetStage3")
        export class Sample {
          @target.mapAttributeWithChooser(target.READWRITE | target.PERSIST, null)
          @meta.implemented
          @type.float32
          value = 0;
          @target.mapMethodAndWrap("call") @meta.implemented Call() {}
          @meta.notUsed Skip() {}
          @target.abstract Abstract(value) {}
        }`;
    const code = transformSync(source,{configFile:false,babelrc:false,plugins:[[decoratorsPlugin,{version:"2023-11"}]]}).code;
    const {Sample}=await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
    assert.equal(CjsSchema.getSchema(Sample).impl.status,"implemented");
    assert.equal(CjsSchema.getSchema(Sample).members[0].exposure.chooser,null);
    assert.equal(CjsSchema.getMethod(Sample,"Call").exposure.name,"call");
    assert.throws(() => new Sample().Skip(),/Skip/);
    assert.throws(() => new Sample().Abstract(1),/Abstract/);
});

test("both target inheritance namespaces retain composition and native method metadata", () =>
{
    class Base { Call() { return 7; } }
    CjsSchema.decorateMethod(Base, "Call", meta.implemented);
    meta.carbon("TargetNativeBase")(Base);
    class Exposed {}
    class Native {}
    exposure.inherit(Base)(Exposed);
    meta.inherit(Base)(Native);
    exposure.define("TargetInheritedExposed")(Exposed);
    meta.carbon("TargetInheritedNative")(Native);
    for (const Constructor of [Exposed, Native])
    {
        assert.equal(new Constructor().Call(), 7);
        assert.equal(CjsSchema.getMethod(Constructor, "Call").impl.status, "implemented");
    }
});

test("notUsed replaces imperative static methods and accessors without running their bodies", () =>
{
    class Unused { static Call() { assert.fail("original static called"); } get value() { assert.fail("original getter called"); } }
    meta.notUsed(Unused, "Call");
    meta.notUsed(Unused.prototype, "value");
    meta.define("TargetUnusedKinds")(Unused);
    assert.throws(() => Unused.Call(), /Call/);
    assert.throws(() => new Unused().value, /value/);
});


test("own complete attributes keep explicit flags and aliases without Carbon origin or inherited flags", () =>
{
    class Parent { value = 0; }
    class Child extends Parent {}
    CjsSchema.defineEnum({ ZERO: 0 }, { name: "Goal3.OwnEnum", chooser: [{name:"ZERO",value:0}] });
    CjsSchema.decorateField(Parent, "value", meta.attribute(meta.READWRITE | meta.PERSIST), type.int32);
    meta.define("Goal3OwnParent")(Parent);
    CjsSchema.decorateField(Child, "value", meta.attribute(meta.READ, "alias"), type.enum("Goal3.OwnEnum"));
    meta.define("Goal3OwnChild")(Child);
    const member = CjsSchema.getSchema(Child).members.find(m => m.name === "alias");
    assert.deepEqual(member.edit, {read:true});
    assert.equal(member.carbon, undefined);
    assert.equal(member.exposure.flags, meta.READ);
    assert.equal(new CjsBlueClasses().GetTypeInfo(new Child())[2].alias.editflags, 1);
    assert.equal(CjsSchema.getSchema(Parent).members[0].exposure.flags, 19);
    for (const invalid of [-1, 1.5, NaN, Infinity, 0x100000000]) assert.throws(() => meta.attribute(invalid), /flags/);
    assert.throws(() => meta.attribute(meta.READ, ""), /non-empty/);
    assert.equal(meta.EDIT_FORCELONG, exposure.EDIT_FORCELONG);
});

test("legacy named/indexed own attributes coexist with zero-mask target declarations", () =>
{
    class Sample { value = 0; other = 0; }
    CjsSchema.decorateField(Sample, "value", meta.attribute("legacy"), meta.readwrite, type.float32);
    CjsSchema.decorateField(Sample, "other", meta.attribute(meta.NONE), type.int32);
    meta.define("Goal3LegacyAttribute")(Sample);
    const members=CjsSchema.getSchema(Sample).members;
    assert.equal(members.find(m=>m.name==="legacy").key,"value");
    assert.equal(members.find(m=>m.name==="legacy").exposure,undefined);
    assert.deepEqual(members.find(m=>m.name==="other").edit,{});
});

test("object ownership aliases preserve complete legacy class information and Blue type view", () =>
{
    class Item {}
    meta.define("Goal3ObjectItem")(Item);
    const pairs=[["root","embed"],["rootRef","ref"],["rootWeak","weak"]];
    for(const [oldName,newName] of pairs) for(const argument of ["Goal3ObjectItem",Item])
    {
        class Old { value = null; }
        class New { value = null; }
        CjsSchema.decorateField(Old,"value",type[oldName](argument),meta.readwrite);
        CjsSchema.decorateField(New,"value",type.object[newName](argument),meta.readwrite);
        const suffix=typeof argument==="string"?"Name":"Class";
        meta.define(`Goal3Old${oldName}${suffix}`)(Old);
        meta.define(`Goal3New${oldName}${suffix}`)(New);
        assert.deepEqual(comparable(CjsSchema.getSchema(New).members),comparable(CjsSchema.getSchema(Old).members));
        assert.deepEqual(new CjsBlueClasses().GetTypeInfo(new New())[2],new CjsBlueClasses().GetTypeInfo(new Old())[2]);
        assert.equal(CjsSchema.getSchema(New).members[0].lifecycle,undefined);
    }
});

test("Stage-3 own attributes and all object aliases register before construction", async () =>
{
    const schemaUrl=new URL("../../src/global/schema/index.js",import.meta.url).href;
    const source=`import {meta,type} from ${JSON.stringify(schemaUrl)};
      @meta.define("Goal3StageOwn") export class Sample {
        @meta.attribute(meta.READ | meta.PERSIST, "alias") @type.float32 value=2;
        @type.object.embed("Goal3ObjectItem") embedded=null;
        @type.object.ref("Goal3ObjectItem") counted=null;
        @type.object.weak("Goal3ObjectItem") weak=null;
      }`;
    const code=transformSync(source,{configFile:false,babelrc:false,plugins:[[decoratorsPlugin,{version:"2023-11"}]]}).code;
    const {Sample}=await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
    const members=CjsSchema.getSchema(Sample).members;
    assert.equal(members.find(m=>m.name==="alias").exposure.flags,17);
    assert.deepEqual(members.filter(m=>m.name!=="alias").map(m=>m.type.kind),["root","rootRef","rootWeak"]);
    assert.equal(new Sample().value,2);
});

test("separate Stage-3 interface maps preserve native row order while imperative maps append", async () =>
{
    const exposureUrl = new URL("../../src/global/schema/be.js", import.meta.url).href;
    const source = `import { exposure } from ${JSON.stringify(exposureUrl)};
      export class First {} export class Second {}
      @exposure.define("Goal4bOrderedStage")
      @exposure.mapInterface(First)
      @exposure.mapInterface(Second)
      export class Sample {}`;
    const code = transformSync(source, { configFile: false, babelrc: false,
        plugins: [[decoratorsPlugin, {version: "2023-11"}]] }).code;
    const { Sample, First, Second } = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
    assert.deepEqual([...mappedInterfaces(Sample)], [IRoot, Sample, First, Second]);

    class Imperative {}
    exposure.define("Goal4bOrderedImperative")(Imperative);
    exposure.mapInterface(First)(Imperative);
    exposure.mapInterface(Second)(Imperative);
    assert.deepEqual([...mappedInterfaces(Imperative)], [IRoot, Imperative, First, Second]);

    class Legacy {}
    blue.interface(First, Second)(Legacy);
    meta.define("Goal4bOrderedLegacy")(Legacy);
    assert.deepEqual([...mappedInterfaces(Legacy)], [IRoot, Legacy, First, Second]);
    for (const Constructor of [Sample, Imperative, Legacy]) unregisterClass(CjsSchema.getClassName(Constructor));
});

test("donor annotation preserves explicit registration, cached rows and factory policy", () =>
{
    class Sample { Run() {} }
    CjsSchema.decorateMethod(Sample, "Run", exposure.mapMethod(), meta.implemented);
    exposure.define("DonorAnnotationExplicit")(Sample);
    const cached = CjsSchema.getSchema(Sample);
    const table = [ ...mappedInterfaces(Sample) ];
    const revision = getClassRegistrationRevision();
    meta.carbon(["DonorAnnotationNativeA", "DonorAnnotationNativeB"])(Sample);
    const schema = CjsSchema.getSchema(Sample);
    assert.equal(getClassRegistrationRevision(), revision);
    assert.equal(CjsSchema.getConstructor("DonorAnnotationExplicit"), Sample);
    assert.equal(CjsSchema.getConstructor("DonorAnnotationNativeA"), null);
    assert.equal(CjsSchema.getConstructor("DonorAnnotationNativeB"), null);
    assert.deepEqual(schema.carbon, ["DonorAnnotationNativeA", "DonorAnnotationNativeB"]);
    assert.deepEqual(schema.donors, schema.carbon);
    assert.equal(schema.className, cached.className);
    assert.deepEqual(schema.methods, cached.methods);
    assert.deepEqual([ ...mappedInterfaces(Sample) ], table);
    assert.equal(getClassRegistration("DonorAnnotationExplicit").createFn().constructor, Sample);
    assert.throws(() => meta.carbon([]), /at least one/);
    assert.throws(() => meta.carbon("Bad")({}, { kind: "class" }), /constructor/);
    assert.throws(() => meta.carbon("Bad")(Sample, { kind: "method" }), /constructor/);
});

for (const donorFirst of [true, false]) test(`Stage-3 donor annotation registers once with donor first ${donorFirst}`, async () =>
{
    const schemaUrl = new URL("../../src/global/schema/index.js", import.meta.url).href;
    const targetUrl = new URL("../../src/global/schema/be.js", import.meta.url).href;
    const name = `DonorStack${donorFirst}`, donor = `NativeDonorStack${donorFirst}`;
    const annotations = [`@exposure.define("${name}")`, `@meta.carbon("${donor}")`];
    if (donorFirst) annotations.reverse();
    const source = `import { meta, type } from ${JSON.stringify(schemaUrl)};
        import { exposure } from ${JSON.stringify(targetUrl)};
        ${annotations.join("\n")}
        export class Sample {
            @exposure.mapAttribute(exposure.READWRITE) @type.float32 value = 2;
            @exposure.mapMethod() @meta.implemented Run() { return this.value; }
        }`;
    const code = transformSync(source, { configFile: false, babelrc: false,
        plugins: [[decoratorsPlugin, { version: "2023-11" }]] }).code;
    const revision = getClassRegistrationRevision();
    const { Sample } = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
    assert.equal(getClassRegistrationRevision(), revision + 1);
    assert.equal(CjsSchema.getConstructor(name), Sample);
    assert.equal(CjsSchema.getConstructor(donor), null);
    const schema = CjsSchema.getSchema(Sample);
    assert.equal(schema.carbon, donor);
    assert.deepEqual(schema.donors, [donor]);
    assert.equal(schema.members[0].name, "value");
    assert.equal(CjsSchema.getMethod(Sample, "Run").impl.status, "implemented");
    assert.deepEqual([ ...mappedInterfaces(Sample) ], [IRoot, Sample]);
    assert.equal(new Sample().Run(), 2);
});

test("standalone Stage-3 native identity still registers before its module is consumed", async () =>
{
    const schemaUrl = new URL("../../src/global/schema/index.js", import.meta.url).href;
    const source = `import { meta, type } from ${JSON.stringify(schemaUrl)};
        @meta.carbon("StandaloneNativeDonor")
        export class Sample { @type.float32 value = 4; }`;
    const code = transformSync(source, { configFile: false, babelrc: false,
        plugins: [[decoratorsPlugin, { version: "2023-11" }]] }).code;
    const revision = getClassRegistrationRevision();
    const { Sample } = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
    assert.equal(getClassRegistrationRevision(), revision + 1);
    assert.equal(CjsSchema.getConstructor("StandaloneNativeDonor"), Sample);
    assert.equal(CjsSchema.getSchema(Sample).carbon, "StandaloneNativeDonor");
    assert.equal(CjsSchema.getSchema(Sample).fields[0].name, "value");
    assert.equal(hasOwnInterfaceTable(Sample), false);
});
