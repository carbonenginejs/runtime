import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema, meta, type } from "../../src/global/schema/index.js";

let serial = 0;
function register(fields, size)
{
    class Record {}
    const className = `StructGuard${++serial}`;
    for (const [name, decorators] of Object.entries(fields))
        CjsSchema.decorateField(Record, name, ...[].concat(decorators));
    if (size !== undefined) meta.struct.define({ size })(Record);
    CjsSchema.define(Record, { className });
    return CjsSchema.getSchema(Record);
}

for (const [reason, fields, size, message] of [
    ["missing offset", { value: meta.struct.UINT32_1() }, 4, /offset/],
    ["negative offset", { value: meta.struct.UINT32_1(-4) }, 4, /offset/],
    ["fractional offset", { value: meta.struct.UINT32_1(.5) }, 4, /offset/],
    ["missing size", { value: meta.struct.UINT32_1(0) }, undefined, /size/],
    ["overlap", { first: meta.struct.FLOAT32_4(0), value: meta.struct.UINT32_1(12) }, 16, /overlapping/],
    ["out of size", { value: meta.struct.UINT32_1(4) }, 4, /outside size/],
    ["misaligned 32-bit", { value: meta.struct.UINT32_1(2) }, 8, /misaligned/],
    ["misaligned 16-bit", { value: meta.struct.USHORT_1(1) }, 4, /misaligned/],
    ["misaligned shared string", { value: meta.struct.SHAREDSTRING_1(4) }, 16, /misaligned/],
    ["incompatible meaning", { value: [meta.struct.INT32_1(0), type.color] }, 4, /incompatible/],
    ["repeated type", { value: [meta.struct.UINT32_1(0), type.uint32] }, 4, /repeated/],
    ["noninteger enum", { value: [meta.struct.FLOAT32_1(0), type.enum({ A: 0 })] }, 4, /integer struct/]
])
{
    test(`struct registration rejects ${reason} with class and member`, () =>
    {
        assert.throws(() => register(fields, size), error =>
            error instanceof TypeError && /StructGuard\d+\.value:/.test(error.message) && message.test(error.message));
    });
}

test("all donor storage names imply their schema types without redundant decorators", () =>
{
    const facts = [
        ["UINT32_1", "uint32", 4], ["FLOAT32_1", "float32", 4], ["FLOAT32_3", "vec3", 12],
        ["FLOAT32_4", "vec4", 16], ["INT32_1", "int32", 4], ["SHAREDSTRING_1", "string", 8],
        ["USHORT_1", "uint16", 2], ["UBYTE_1", "uint8", 1], ["BOOL8_1", "boolean", 1],
        ["SHORT_1", "int16", 2], ["BYTE_1", "int8", 1]
    ];
    assert.deepEqual(Object.keys(meta.struct).sort(), ["define", ...facts.map(([name]) => name)].sort());
    for (const [native, kind, size] of facts)
    {
        const info = register({ value: meta.struct[native](0) }, size);
        assert.equal(info.members[0].type.kind, kind);
        assert.equal(info.fields[0].type.kind, kind);
        assert.equal(info.structureDefinition.members[0].dataType, native);
        assert.deepEqual(info.structureDefinition.boundaries, [size]);
    }
});

test("field reordering leaves native offsets unchanged and permits gaps", () =>
{
    const first = meta.struct.UINT32_1(0), last = meta.struct.SHAREDSTRING_1(16);
    const left = register({ first, last }, 32).structureDefinition;
    const right = register({ last, first }, 32).structureDefinition;
    assert.deepEqual(left.members, right.members);
    assert.deepEqual(left.boundaries, [4, 24]);
    assert.equal(left.size, 32);
});

test("quaternion, color and integer enum meanings refine compatible storage", () =>
{
    const info = register({
        rotation: [meta.struct.FLOAT32_4(0), type.quat],
        color: [meta.struct.FLOAT32_4(16), type.color],
        mode: [meta.struct.UINT32_1(32), type.enum({ A: 0 })]
    }, 36);
    assert.deepEqual(info.members.map(member => member.type.kind), ["quat", "color", "uint32"]);
    assert.deepEqual(info.structureDefinition.members.map(member => member.type), ["quaternion", "color", "uint32"]);
});

test("stage-3 member metadata builds the layout before any instance is constructed", () =>
{
    class Record { constructor() { assert.fail("registration must not construct"); } }
    const metadata = {};
    meta.struct.UINT32_1(4)(undefined, { kind: "field", name: "value", metadata, addInitializer() {} });
    meta.struct.define({ size: 8 })(Record);
    meta.define({ className: "Stage3StructRegistration" })(Record, { kind: "class", metadata });
    assert.deepEqual(CjsSchema.getSchema(Record).structureDefinition.members,
        [{ name: "value", offset: 4, dataType: "UINT32_1", type: "uint32" }]);
});
