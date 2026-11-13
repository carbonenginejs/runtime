import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema, meta, type } from "../../src/blue/schema/index.js";
const be = CjsSchema.exposure;


test("schema-only values use canonical member names without Blue services", () =>
{
    class Record { value = 1; }
    CjsSchema.define(Record, { name: "SchemaOnlyKeyRecord", fields: {
        value: [meta.mapAttribute(meta.NONE, "Value"), type.int32, be.mapAttribute(be.READWRITE)]
    } });
    const item = new Record();
    CjsSchema.setValues(item, { Value: 4 });
    assert.equal(item.value, 4);
    assert.deepEqual(CjsSchema.getValues(item), { Value: 4 });
});
