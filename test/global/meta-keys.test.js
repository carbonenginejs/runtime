import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema, meta } from "../../src/global/schema/index.js";
import "../../src/global/blue/values.js";

test("key maps external names without changing storage and keyIndex is not a storage index", () =>
{
    class Record
    {
        ssao = false;
        Primary = 7;
        ordinary = 3;
        get enabled() { return this.ssao; }
    }
    CjsSchema.define(Record, {
        className: "KeyMetadataRecord",
        fields: {
            ssao: [meta.key("SSAO"), meta.type.boolean, meta.blue.readwrite, meta.blue.persist],
            Primary: [meta.keyIndex(0), meta.type.int32, meta.blue.readwrite, meta.blue.persist],
            ordinary: [meta.type.int32, meta.blue.readwrite, meta.blue.persist],
            enabled: [meta.keyAlias("SSAO")]
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
        assert.equal(Object.hasOwn(field, "key"), false);
        assert.equal(Object.hasOwn(field, "alias"), false);
    }
    const value = new Record();
    CjsSchema.setValues(value, { SSAO: true, Primary: 19 });
    assert.equal(value.ssao, true);
    assert.equal(value.Primary, 19);
    assert.equal(Object.hasOwn(value, "SSAO"), false);
    CjsSchema.setValues(value, { enabled: false });
    assert.equal(value.ssao, false);
    assert.deepEqual(CjsSchema.getValues(value), { SSAO: false, Primary: 19, ordinary: 3 });
});

test("key decorators reject invalid names and indexes", () =>
{
    for (const value of [undefined, null, "", "  ", 3]) assert.throws(() => meta.key(value), TypeError);
    for (const value of [undefined, null, -1, 0.5, "0", Infinity, Number.MAX_SAFE_INTEGER + 1])
        assert.throws(() => meta.keyIndex(value), TypeError);
    assert.equal(Object.hasOwn(meta, "alias"), false);
});

test("Stage-3 external keys preserve the JS key in either decorator order", () =>
{
    for (const reverse of [false, true])
    {
        const metadata = {};
        const decorators = [meta.type.boolean, meta.key("SSAO"), meta.blue.persist];
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

test("field aliases share prototype accessors and preserve vectors through SetValues", () =>
{
    class Record { colour = new Float32Array([1, 2, 3, 4]); }
    CjsSchema.define(Record, { className: "FieldKeyAliasRecord", fields: {
        colour: [meta.key("Color"), meta.keyAlias("color"), meta.type.vec4, meta.blue.readwrite, meta.blue.persist]
    } });
    const a = new Record(), b = new Record(), original = a.colour;
    assert.equal(Object.hasOwn(a, "color"), false);
    assert.equal(a.color, original);
    a.color = [4, 3, 2, 1];
    assert.equal(a.colour, original);
    assert.deepEqual(Array.from(original), [4, 3, 2, 1]);
    assert.deepEqual(Array.from(b.color), [1, 2, 3, 4]);
    assert.deepEqual(CjsSchema.getValues(a), { Color: [4, 3, 2, 1] });
    CjsSchema.setValues(a, { color: [5, 6, 7, 8] });
    assert.equal(a.colour, original);
    assert.deepEqual(Array.from(a.color), [5, 6, 7, 8]);
});

test("field aliases reject collisions instead of replacing members", () =>
{
    class Record { value = 1; other = 2; }
    assert.throws(() => CjsSchema.define(Record, { className: "CollidingKeyAlias", fields: {
        value: [meta.type.int32, meta.keyAlias("other")], other: meta.type.int32
    } }), /collides/);
});
