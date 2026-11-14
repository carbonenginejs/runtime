import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema } from "../../npm/dist/blue/schema/CjsSchema.js";
import { type } from "../../npm/dist/blue/schema/index.js";
import { Copier } from "../../npm/dist/blue/index.js";
import { DictReader, CreateAnchorTable } from "../../npm/dist/blue/formats/graph/DictReader.js";
import { IInitialize } from "../../npm/dist/blue/exposure/IInitialize.js";
import { INotify } from "../../npm/dist/blue/exposure/INotify.js";
import { ClassInfo } from "../../npm/dist/blue/base/ClassInfo.js";
import { BLACK_DESTINATION } from "../../npm/dist/blue/base/VarEntry.js";
import "../../npm/dist/trinity/index.js";
import { composeStubResMan } from "../support/stubResMan.js";
import { exposure as be } from "../../npm/dist/blue/exposure/be.js";

const { meta } = CjsSchema;

// A BlueStructureList record: a shared string at 0 and a float4 at 8, as
// Tr2ConstantEffectParameter lays it out.
class StructListRecord
{
    name = "";
    value = [0, 0, 0, 0];
}
CjsSchema.be.define(StructListRecord, { name: "StructListRecord", struct: { size: 24 }, fields: {
    name: [ be.mapAttribute(be.PERSIST), meta.struct.SHAREDSTRING_1(0) ],
    value: [ be.mapAttribute(be.PERSIST), meta.struct.FLOAT32_4(8) ]
} });

class StructListOwner
{
    records = [];
}
CjsSchema.be.define(StructListOwner, { name: "StructListOwner", fields: {
    records: [ type.structList("StructListRecord"), be.mapAttribute(be.PERSIST) ]
} });

test("structList declares a BlueStructureList of its item class", () =>
{
    const field = CjsSchema.getField(StructListOwner, "records").type;
    assert.equal(field.kind, "structList");
    assert.equal(field.className, "StructListRecord");
    assert.deepEqual(new StructListOwner().records, []);
    assert.throws(() => type.structList(""), /registered class name/);
});

test("Black reads a structure list with the item class's layout", () =>
{
    const entry = ClassInfo.exposeToBlue(StructListOwner).meta.entries.get("records");
    assert.equal(entry.destination, BLACK_DESTINATION.STRUCTURELIST);
    assert.equal(entry.structClass, "StructListRecord");
    assert.equal(entry.structure.size, 24);
    assert.equal(entry.structure.Item, StructListRecord);
    assert.deepEqual(entry.structure.fields.map(member => [member.name, member.offset]), [["name", 0], ["value", 8]]);
});

test("values build records as instances of the item class and refill them in place", () =>
{
    const owner = new StructListOwner();
    const source = { records: [{ name: "a", value: [1, 2, 3, 4] }, { name: "b", value: [5, 6, 7, 8] }] };
    assert.equal(CjsSchema.setValues(owner, source, { returnBoolean: true }), true);
    assert.equal(owner.records.length, 2);
    assert.ok(owner.records.every(record => CjsSchema.getClassName(record.constructor) === "StructListRecord"));
    assert.equal(owner.records[1].name, "b");
    assert.deepEqual(Array.from(owner.records[0].value), [1, 2, 3, 4]);

    const list = owner.records, first = owner.records[0];
    assert.equal(CjsSchema.setValues(owner, source, { returnBoolean: true }), false, "equal records are no change");
    source.records[0].value = [9, 2, 3, 4];
    assert.equal(CjsSchema.setValues(owner, source, { returnBoolean: true }), true);
    assert.equal(owner.records, list, "the list keeps its identity");
    assert.equal(owner.records[0], first, "a record at the same index is filled in place");
    assert.equal(owner.records[0].value[0], 9);
    assert.equal(source.records[0].value[0], 9, "the source is never written");

    assert.equal(CjsSchema.setValues(owner, { records: [source.records[1]] }, { returnBoolean: true }), true);
    assert.equal(owner.records.length, 1);
    assert.equal(owner.records[0].name, "b");
});

test("a live record is copied into the list, never shared", () =>
{
    const live = new StructListRecord();
    live.name = "live";
    live.value = [1, 1, 1, 1];
    const owner = new StructListOwner();
    CjsSchema.setValues(owner, { records: [live] });
    assert.notEqual(owner.records[0], live);
    assert.equal(owner.records[0].name, "live");
    owner.records[0].name = "changed";
    assert.equal(live.name, "live");
});

test("the Copier copies records by value, into the destination's records", () =>
{
    const source = new StructListOwner();
    CjsSchema.setValues(source, { records: [{ name: "a", value: [1, 2, 3, 4] }] });
    const copy = new Copier().CloneTo(source);
    assert.equal(copy.records.length, 1);
    assert.notEqual(copy.records[0], source.records[0]);
    assert.equal(copy.records[0].name, "a");
    assert.deepEqual(Array.from(copy.records[0].value), [1, 2, 3, 4]);
    copy.records[0].name = "b";
    assert.equal(source.records[0].name, "a");
});

test("values export records as plain values that read back", () =>
{
    const owner = new StructListOwner();
    CjsSchema.setValues(owner, { records: [{ name: "a", value: [1, 2, 3, 4] }] });
    const values = CjsSchema.getValues(owner);
    const back = new StructListOwner();
    CjsSchema.setValues(back, values);
    assert.equal(back.records[0].name, "a");
    assert.deepEqual(Array.from(back.records[0].value), [1, 2, 3, 4]);
});

for (const forward of [false, true]) test(`struct-list ${forward ? "forward" : "backward"} references resolve by value and retain slots`, () =>
{
    const anchor = { _id: "record", name: "shared", value: [1, 2, 3, 4] };
    const source = { records: forward ? [{ _ref: "record" }, anchor] : [anchor, { _ref: "record" }] };
    const original = structuredClone(source);
    const owner = CjsSchema.from("StructListOwner", source);
    const list = owner.records, slots = [...list];
    assert.notEqual(slots[0], slots[1], "packed struct slots are not shared pointers");
    for (const record of slots)
    {
        assert.equal(record.name, "shared");
        assert.deepEqual(Array.from(record.value), [1, 2, 3, 4]);
    }
    assert.equal(CjsSchema.setValues(owner, source, { returnBoolean: true }), false);
    assert.equal(owner.records, list);
    slots.forEach((slot, index) => assert.equal(owner.records[index], slot));
    anchor.name = "updated";
    assert.equal(CjsSchema.setValues(owner, source, { returnBoolean: true }), true);
    assert.deepEqual(owner.records.map(record => record.name), ["updated", "updated"]);
    anchor.name = "shared";
    assert.deepEqual(source, original);
});

class StructReferenceRoot { first = null; second = null; }
CjsSchema.define(StructReferenceRoot, { name: "StructReferenceRoot", fields: {
    first: { type: { kind: "rootRef", className: "StructListOwner" } },
    second: { type: { kind: "rootRef", className: "StructListOwner" } }
} });

for (const declarations of [false, true]) test(`struct references share the enclosing graph (${declarations ? "declared" : "values"})`, () =>
{
    const source = {
        first: { records: [{ _ref: "other" }] },
        second: { records: [{ _id: "other", name: "cross-owner", value: [4, 3, 2, 1] }] }
    };
    const root = declarations ? new DictReader({ declarations }).CreateObject(source, StructReferenceRoot)
        : CjsSchema.from("StructReferenceRoot", source);
    assert.equal(root.first.records[0].name, "cross-owner");
    assert.notEqual(root.first.records[0], root.second.records[0]);
    assert.deepEqual(Array.from(root.first.records[0].value), [4, 3, 2, 1]);
});

class StructReferenceLifecycle
{
    records = [];
    initialized = [];
    notifications = [];
    Initialize() { this.initialized.push(this.records.map(record => record.name)); }
    OnModified(name) { this.notifications.push([name, this.records.map(record => record.name)]); }
}
CjsSchema.be.interface(IInitialize, INotify)(StructReferenceLifecycle, { kind: "class" });
CjsSchema.be.define(StructReferenceLifecycle, { name: "StructReferenceLifecycle", fields: {
    records: [ type.structList("StructListRecord"), be.mapAttribute(be.NOTIFY | be.PERSIST) ]
} });

for (const declarations of [false, true]) test(`struct references resolve before lifecycle (${declarations ? "declared" : "values"})`, () =>
{
    const source = { records: [{ _ref: "record" }, { _id: "record", name: "ready" }] };
    const owner = declarations ? new DictReader({ declarations }).CreateObject(source, StructReferenceLifecycle)
        : CjsSchema.from("StructReferenceLifecycle", source);
    assert.deepEqual(owner.initialized, [["ready", "ready"]]);
    for (const [, names] of owner.notifications) assert.deepEqual(names, ["ready", "ready"]);
    owner.notifications.length = 0;
    assert.equal(CjsSchema.setValues(owner, source, { returnBoolean: true }), false);
    assert.deepEqual(owner.notifications, []);
    const changed = { records: [{ _ref: "record" }, { _id: "record", name: "changed" }] };
    assert.equal(CjsSchema.setValues(owner, changed, { returnBoolean: true }), true);
    assert.deepEqual(owner.notifications, [["records", ["changed", "changed"]]]);
});

test("struct reference import rejects missing, duplicate and wrong-type anchors", () =>
{
    assert.throws(() => CjsSchema.from("StructListOwner", { records: [{ _ref: "missing" }] }), /Unresolved _ref/);
    assert.throws(() => CjsSchema.from("StructListOwner", { records: [{ _id: "same" }, { _id: "same" }] }), /Duplicate _id/);
    assert.throws(() => CjsSchema.from("StructListOwner", { _id: "owner", records: [{ _ref: "owner" }] }), /requires StructListRecord/);
    assert.throws(() => CjsSchema.from("StructListOwner", { records: [{ _type: "StructListOwner" }] }), /requires StructListRecord/);
});

test("a later struct-list edit supersedes pending reference copies", () =>
{
    const importContext = CreateAnchorTable();
    const owner = new StructListOwner();
    CjsSchema.setValues(owner, { records: [{ _ref: "later" }] }, { importContext });
    CjsSchema.setValues(owner, { records: [{ name: "new" }] }, { importContext });
    const record = new StructListRecord();
    record.name = "stale";
    importContext.register("later", record);
    importContext.finalize();
    importContext.initializeCreated();
    assert.equal(owner.records[0].name, "new");
});

test("new values-only owners notify after their struct references resolve", () =>
{
    class NotifiedStructOwner
    {
        records = [];
        notifications = [];
        OnModified(name) { this.notifications.push([name, this.records.map(record => record.name)]); }
    }
    CjsSchema.be.interface(INotify)(NotifiedStructOwner, { kind: "class" });
    CjsSchema.be.define(NotifiedStructOwner, { name: "NotifiedStructOwner", fields: {
        records: [ type.structList("StructListRecord"), be.mapAttribute(be.NOTIFY) ]
    } });
    const owner = CjsSchema.from("NotifiedStructOwner", {
        records: [{ _ref: "record" }, { _id: "record", name: "ready" }]
    });
    assert.deepEqual(owner.notifications, [["records", ["ready", "ready"]]]);
});

test("Tr2Effect shader options preserve referenced name and value", t =>
{
    const resources = composeStubResMan();
    t.after(() => resources.restore());
    for (const forward of [false, true])
    {
        const anchor = { _type: "Tr2ShaderOption", _id: "option", name: "SPACE_OBJECT_TRANSPARENCY", value: "OPAQUE" };
        const options = forward ? [{ _ref: "option" }, anchor] : [anchor, { _ref: "option" }];
        const effect = CjsSchema.from("Tr2Effect", { options });
        assert.notEqual(effect.options[0], effect.options[1]);
        assert.deepEqual(effect.options.map(option => [option.name, option.value]), [
            ["SPACE_OBJECT_TRANSPARENCY", "OPAQUE"], ["SPACE_OBJECT_TRANSPARENCY", "OPAQUE"]
        ]);
        assert.equal(CjsSchema.setValues(effect, { options }, { returnBoolean: true }), false);
    }
});
