import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema, meta, type, blue } from "../../src/global/schema/index.js";
import "../../src/global/blue/values.js";

test("member maps external names without changing storage and keyIndex is not a storage index", () =>
{
    class Record
    {
        ssao = false;
        Primary = 7;
        ordinary = 3;
    }
    CjsSchema.define(Record, {
        className: "KeyMetadataRecord",
        fields: {
            ssao: [meta.attribute("SSAO"), type.boolean, blue.readwrite, blue.persist],
            Primary: [meta.keyIndex(0), type.int32, blue.readwrite, blue.persist],
            ordinary: [type.int32, blue.readwrite, blue.persist]
        }
    });
    const schema = CjsSchema.getSchema(Record);
    const renamed = schema.members.find(field => field.name === "SSAO");
    assert.equal(renamed.key, "ssao");
    const primary = schema.members.find(field => field.name === "Primary");
    assert.equal(primary.keyIndex, 0);
    assert.equal(Object.hasOwn(primary, "index"), false);
    for (const field of schema.members.filter(field => field !== renamed))
    {
        assert.equal(field.key, field.name, "every declaration stores its JS key");
    }
    const value = new Record();
    CjsSchema.setValues(value, { SSAO: true, Primary: 19 });
    assert.equal(value.ssao, true);
    assert.equal(value.Primary, 19);
    assert.equal(Object.hasOwn(value, "SSAO"), false);
    assert.deepEqual(CjsSchema.getValues(value), { SSAO: true, Primary: 19, ordinary: 3 });
});

test("meta has no key or alias decorators and keyIndex rejects invalid indexes", () =>
{
    for (const name of ["key", "keyAlias", "alias"]) assert.equal(Object.hasOwn(meta, name), false);
    for (const value of [undefined, null, -1, 0.5, "0", Infinity, Number.MAX_SAFE_INTEGER + 1])
        assert.throws(() => meta.keyIndex(value), TypeError);
});

test("Stage-3 external keys preserve the JS key in either decorator order", () =>
{
    for (const reverse of [false, true])
    {
        const metadata = {};
        const decorators = [type.boolean, meta.attribute("SSAO"), blue.persist];
        if (reverse) decorators.reverse();
        for (const decorator of decorators)
            decorator(undefined, { metadata, name: "ssao", kind: "field", addInitializer() {} });
        class Record { ssao = true; }
        meta.define({ className: `Stage3Key${reverse}` })(Record, { metadata, kind: "class" });
        const field = CjsSchema.getSchema(Record).members[0];
        assert.equal(field.name, "SSAO");
        assert.equal(field.key, "ssao");
        assert.deepEqual(CjsSchema.getValues(new Record()), { SSAO: true });
    }
});
