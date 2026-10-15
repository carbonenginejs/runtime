import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema, meta, type, blue } from "../../src/global/schema/index.js";

test("schema-only values use canonical member names without Blue services", () =>
{
    class Record { value = 1; }
    CjsSchema.define(Record, { className: "SchemaOnlyKeyRecord", fields: {
        value: [meta.member("Value"), type.int32, blue.readwrite]
    } });
    const item = new Record();
    CjsSchema.setValues(item, { Value: 4 });
    assert.equal(item.value, 4);
    assert.deepEqual(CjsSchema.getValues(item), { Value: 4 });
});
