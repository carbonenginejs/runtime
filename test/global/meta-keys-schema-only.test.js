import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema, meta } from "../../src/global/schema/index.js";

test("schema-only values use canonical keys and field aliases without Blue services", () =>
{
    class Record { value = 1; get oldValue() { return this.value; } }
    CjsSchema.define(Record, { className: "SchemaOnlyKeyRecord", fields: {
        value: [meta.member("Value"), meta.keyAlias("alternate"), meta.type.int32, meta.blue.readwrite], oldValue: [meta.keyAlias("Value")]
    } });
    const item = new Record();
    CjsSchema.setValues(item, { Value: 4 });
    assert.equal(item.value, 4);
    item.alternate = 6;
    assert.equal(item.value, 6);
    CjsSchema.setValues(item, { alternate: 9 });
    assert.equal(item.value, 9);
    CjsSchema.setValues(item, { oldValue: 10 });
    assert.equal(item.value, 10);
    assert.deepEqual(CjsSchema.getValues(item), { Value: 10 });
});
