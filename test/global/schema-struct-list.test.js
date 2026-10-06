import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema } from "../../npm/dist/global/schema/CjsSchema.js";
import { Copier } from "../../npm/dist/global/blue/index.js";
import { CjsBlackSchemaRegistry } from "../../npm/dist/resource/formats/black/core/CjsBlackSchemaRegistry.js";

const { meta } = CjsSchema;

// A BlueStructureList record: a shared string at 0 and a float4 at 8, as
// Tr2ConstantEffectParameter lays it out.
class StructListRecord
{
    name = "";
    value = [0, 0, 0, 0];
}
CjsSchema.define(StructListRecord, { className: "StructListRecord", struct: { size: 24 }, fields: {
    name: [meta.blue.persist, meta.struct.SHAREDSTRING_1(0)],
    value: [meta.blue.persist, meta.struct.FLOAT32_4(8)]
} });

class StructListOwner
{
    records = [];
}
CjsSchema.define(StructListOwner, { className: "StructListOwner", fields: {
    records: [meta.type.structList("StructListRecord"), meta.blue.persist]
} });

test("structList declares a BlueStructureList of its item class", () =>
{
    const type = CjsSchema.getField(StructListOwner, "records").type;
    assert.equal(type.kind, "structList");
    assert.equal(type.className, "StructListRecord");
    assert.deepEqual(new StructListOwner().records, []);
    assert.throws(() => meta.type.structList(""), /registered class name/);
});

test("the Black codec takes the record layout from the item class", () =>
{
    const { black } = CjsSchemaRegistryCodec({ kind: "structList", className: "StructListRecord" });
    assert.equal(black.cppType, "StructureList");
    assert.equal(black.container, "list");
    assert.equal(black.itemClassName, "StructListRecord");
    assert.equal(black.structure.size, 24);
    assert.deepEqual(black.structure.members.map(member => [member.name, member.offset]), [["name", 0], ["value", 8]]);
});

function CjsSchemaRegistryCodec(type)
{
    return CjsBlackSchemaRegistry.fromDeclaredType(type);
}

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
