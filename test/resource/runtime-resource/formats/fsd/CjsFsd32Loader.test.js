// Legacy 32-bit FSD: the port of Carbon's open-source fsd loader.
// Fixtures are synthetic bytes built from the layout the loader reads; the
// FsdUnsignedIntegerKeyMap cases are Carbon's own tests/PyFSDTest/test/test_pyFSD.py.
import assert from "node:assert/strict";
import test from "node:test";

import { CjsFormatStore } from "../../../../../src/global/blue/CjsFormatStore.js";
import { CjsFsdFormat } from "../../../../../src/resource/formats/fsd/index.js";
import {
    CjsFsd32Format,
    FsdDict,
    FsdList,
    FsdObject,
    FsdSchemaAttributes,
    FsdUnsignedIntegerKeyMap,
    FsdVector,
    SchemaType,
} from "../../../../../src/resource/formats/fsd/32/index.js";

/** Little-endian byte builder. */
class Bytes
{
    parts = [];

    get length()
    {
        return this.parts.reduce((sum, part) => sum + part.length, 0);
    }

    raw(bytes)
    {
        this.parts.push(Uint8Array.from(bytes));
        return this;
    }

    u8(value)
    {
        return this.raw([ value ]);
    }

    u32(value)
    {
        const bytes = new Uint8Array(4);
        new DataView(bytes.buffer).setUint32(0, value >>> 0, true);
        return this.raw(bytes);
    }

    i32(value)
    {
        const bytes = new Uint8Array(4);
        new DataView(bytes.buffer).setInt32(0, value, true);
        return this.raw(bytes);
    }

    u64(value)
    {
        const bytes = new Uint8Array(8);
        new DataView(bytes.buffer).setBigUint64(0, BigInt(value), true);
        return this.raw(bytes);
    }

    f32(value)
    {
        const bytes = new Uint8Array(4);
        new DataView(bytes.buffer).setFloat32(0, value, true);
        return this.raw(bytes);
    }

    f64(value)
    {
        const bytes = new Uint8Array(8);
        new DataView(bytes.buffer).setFloat64(0, value, true);
        return this.raw(bytes);
    }

    str(value)
    {
        const bytes = typeof value === "string" ? new TextEncoder().encode(value) : Uint8Array.from(value);
        return this.u32(bytes.length).raw(bytes);
    }

    bytes()
    {
        const result = new Uint8Array(this.length);
        let offset = 0;
        for (const part of this.parts)
        {
            result.set(part, offset);
            offset += part.length;
        }
        return result;
    }
}

const read = (bytes, schema, extra = {}) => CjsFsd32Format.read(bytes, { bitWidth: 32, schema, path: "root", ...extra });

const intFooterSchema = (withSize) => ({
    type: "list",
    itemTypes: {
        type: "object",
        size: withSize ? 12 : 8,
        attributes: {
            key: { type: "int" },
            offset: { type: "int", min: 0 },
            ...(withSize ? { size: { type: "int", min: 0 } } : {}),
        },
        constantAttributeOffsets: { key: 0, offset: 4, ...(withSize ? { size: 8 } : {}) },
    },
});

const stringFooterSchema = {
    type: "list",
    itemTypes: {
        type: "object",
        attributes: { key: { type: "string" }, offset: { type: "int", min: 0 } },
        constantAttributeOffsets: { offset: 0 },
        endOfFixedSizeData: 4,
        attributesWithVariableOffsets: [ "key" ],
        optionalValueLookups: {},
    },
};

/** Build a dict: values, then the key footer, then the footer's size. */
function DictBytes(values, footer)
{
    const valueBytes = values.bytes();
    const footerBytes = footer.bytes();
    const totalDataSize = valueBytes.length + footerBytes.length + 4;

    return new Bytes().u32(totalDataSize).raw(valueBytes).raw(footerBytes).u32(footerBytes.length).bytes();
}

test("FsdUnsignedIntegerKeyMap passes Carbon's test_pyFSD.py", () =>
{
    const pack = (...triples) =>
    {
        const bytes = new Bytes();
        for (const [ key, offset, size ] of triples) bytes.i32(key).u32(offset).u32(size);
        return bytes.bytes();
    };

    // testLengthPrefixedInput
    const prefixed = Uint8Array.from([ 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 13, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0 ]);
    assert.deepEqual(new FsdUnsignedIntegerKeyMap(prefixed).Get(13), [ 4, 4 ]);
    const prefixed8 = Uint8Array.from([ 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 13, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0 ]);
    assert.deepEqual(new FsdUnsignedIntegerKeyMap(prefixed8).Get(13), [ 4, 4 ]);

    // testSingleEntryLength / testSingleEntryContent
    assert.equal(new FsdUnsignedIntegerKeyMap(pack([ 1, 2, 3 ])).length(), 1);
    assert.deepEqual(new FsdUnsignedIntegerKeyMap(pack([ 1, 2, 3 ])).Get(1), [ 2, 3 ]);

    // testSignedKeyLookup
    assert.deepEqual(new FsdUnsignedIntegerKeyMap(pack([ -1, 2, 3 ])).Get(-1), [ 2, 3 ]);

    // testDoubleEntryLength / testDoubleEntryContent
    const two = new FsdUnsignedIntegerKeyMap(pack([ 1, 2, 3 ], [ 4, 5, 6 ]));
    assert.equal(two.length(), 2);
    assert.deepEqual(two.Get(1), [ 2, 3 ]);
    assert.deepEqual(two.Get(4), [ 5, 6 ]);

    // testMissingElementGet
    assert.throws(() => new FsdUnsignedIntegerKeyMap().Get(1), error => error.name === "IndexError");

    // testIteration (assertCountEqual)
    const listed = [ ...new FsdUnsignedIntegerKeyMap(pack([ 1, 2, 3 ], [ 4, 5, 6 ])) ];
    assert.deepEqual(listed.sort((a, b) => a[0] - b[0]), [ [ 1, [ 2, 3 ] ], [ 4, [ 5, 6 ] ] ]);

    // testGeneratorExhaustion: the shared cursor rewinds.
    assert.equal(two.length(), 2);
    assert.equal([ ...two ].length, 2);
    assert.equal([ ...two ].length, 2);
});

test("scalar types decode as Carbon's loader returns them", () =>
{
    assert.equal(read(Uint8Array.of(2), { type: "bool" }), true);
    assert.equal(read(new Bytes().i32(-5).bytes(), { type: "int" }), -5);
    assert.equal(read(new Bytes().i32(-1).bytes(), { type: "int", min: 0 }), 0xFFFFFFFF);
    assert.equal(read(new Bytes().i32(-1).bytes(), { type: "typeID", exclusiveMin: -1 }), 0xFFFFFFFF);
    assert.equal(read(new Bytes().f32(0.1).bytes(), { type: "float" }), Math.fround(0.1));
    assert.equal(read(new Bytes().f64(0.1).bytes(), { type: "float", precision: "double" }), 0.1);
    assert.equal(read(new Bytes().str("res:/a.red").bytes(), { type: "respath" }), "res:/a.red");
    assert.equal(read(new Bytes().str("﻿hé").bytes(), { type: "unicode" }), "﻿hé");
    assert.equal(read(new Bytes().str("").bytes(), { type: "unicode" }), "");
    assert.equal(read(new Bytes().u32(99).i32(7).bytes(), { type: "int" }, { offset: 4 }), 7);

    assert.throws(() => read(new Bytes().str([ 0xFF ]).bytes(), { type: "string" }), error => error.code === "CJS_FSD_32_UNICODE_DECODE_ERROR");
    assert.throws(() => read(new Bytes().str([ 0xFF ]).bytes(), { type: "unicode" }), error => error.code === "CJS_FSD_32_RUNTIME_ERROR");
});

test("vectors are component arrays unless the schema names aliases", () =>
{
    const floats = new Bytes().f32(1).f32(2).f32(3).f32(9).bytes();
    assert.deepEqual(read(floats, { type: "vector3" }), [ 1, 2, 3 ]);
    assert.deepEqual(read(new Bytes().f64(1.5).f64(2.5).bytes(), { type: "vector2", precision: "double" }), [ 1.5, 2.5 ]);

    const vector = read(floats, { type: "vector3", aliases: { x: 0, y: 1, z: 2 } });
    assert.ok(vector instanceof FsdVector);
    assert.equal(vector.GetByAttribute("y"), 2);
    assert.deepEqual(vector.GetByAttribute("data"), [ 1, 2, 3 ]);
    assert.equal(vector.GetLength(), 3);
    assert.equal(vector.GetByIndex(2), 3);
    // CE-117: index == length passes Carbon's check and reads the next float.
    assert.equal(vector.GetByIndex(3), 9);
    assert.throws(() => vector.GetByIndex(4), error => error.name === "IndexError");
    assert.throws(() => vector.GetByAttribute("w"), error => error.name === "AttributeError");

    // CE-116: double components are read at a 4-byte stride.
    const doubles = new Bytes().f64(1.5).f64(2.5).bytes();
    const vector2d = read(doubles, { type: "vector2", precision: "double", aliases: { x: 0, y: 1 } });
    const shifted = new DataView(doubles.buffer).getFloat64(4, true);
    assert.equal(vector2d.GetByAttribute("x"), 1.5);
    assert.equal(Object.is(vector2d.GetByAttribute("y"), shifted), true);
    assert.deepEqual(vector2d.GetByAttribute("data"), [ 1.5, 2.5 ]);
});

test("objects read constant, variable, optional and default attributes", () =>
{
    // Fixed-size object: only constant offsets.
    const fixed = read(new Bytes().i32(5).f32(0.5).bytes(), {
        type: "object",
        size: 8,
        attributes: { a: { type: "int" }, b: { type: "float" }, u: { type: "union" } },
        constantAttributeOffsets: { a: 0, b: 4, u: 0 },
    });
    assert.ok(fixed instanceof FsdObject);
    assert.equal(fixed.GetAttr("a"), 5);
    assert.equal(fixed.GetAttr("b"), 0.5);
    assert.throws(() => fixed.GetAttr("u"), error => error.name === "TypeError" && /unsupported schema type .union./.test(error.message));

    // Variable object: id at 0, then the optional bit field, offset table and data.
    const schema = {
        type: "object",
        attributes: {
            id: { type: "int" },
            name: { type: "string" },
            note: { type: "string", isOptional: true, default: "none" },
            extra: { type: "int", isOptional: true },
        },
        constantAttributeOffsets: { id: 0 },
        endOfFixedSizeData: 4,
        attributesWithVariableOffsets: [ "name", "note", "extra" ],
        optionalValueLookups: { note: 1, extra: 2 },
    };
    const bytes = new Bytes()
        .i32(42)
        .u64(2) // extra present, note absent
        .u32(0).u32(8) // name at 0, extra at 8
        .str("abcd").i32(-3)
        .bytes();
    const object = read(bytes, schema);

    assert.equal(object.GetAttr("id"), 42);
    assert.equal(object.GetAttr("name"), "abcd");
    assert.equal(object.GetAttr("extra"), -3);
    assert.equal(object.GetAttr("note"), "none");
    assert.throws(() => object.GetAttr("missing"), error => error.name === "KeyError");

    const noExtra = read(new Bytes().i32(1).u64(0).u32(0).str("x").bytes(), schema);
    assert.equal(noExtra.GetAttr("name"), "x");
    assert.throws(() => noExtra.GetAttr("extra"), error => error.name === "AttributeError");
});

test("lists index counted, fixed-length and sized-item layouts", () =>
{
    const counted = read(new Bytes().u32(2).u32(12).u32(16).i32(10).i32(20).bytes(), { type: "list", itemTypes: { type: "int" } });
    assert.ok(counted instanceof FsdList);
    assert.equal(counted.GetLength(), 2);
    assert.equal(counted.GetIndex(0), 10);
    assert.equal(counted.GetIndex(-1), 20);
    // CE-117: Carbon lets index == length through to undefined behaviour; the port raises.
    assert.throws(() => counted.GetIndex(2), error => error.name === "IndexError");
    assert.throws(() => counted.GetIndex(-3), error => error.name === "IndexError");

    const fixed = read(new Bytes().f32(1).f32(2).f32(3).bytes(), { type: "list", length: 3, itemTypes: { type: "float", size: 4 } });
    assert.equal(fixed.GetLength(), 3);
    assert.equal(fixed.GetIndex(2), 3);

    const sized = read(new Bytes().u32(2).i32(7).i32(8).bytes(), { type: "list", itemTypes: { type: "int", size: 4 } });
    assert.equal(sized.GetIndex(1), 8);
});

test("dicts look up integer and string keys through the key footer", () =>
{
    // uint32 keys, footer without sizes; offsets relative to the data start.
    const values = new Bytes().i32(100).i32(200);
    const footer = new Bytes().u32(2).u32(7).u32(0).u32(0xFFFFFFFF).u32(4);
    const dict = read(DictBytes(values, footer), {
        type: "dict",
        keyTypes: { type: "int", min: 0 },
        valueTypes: { type: "int" },
        keyFooter: intFooterSchema(false),
    });

    assert.ok(dict instanceof FsdDict);
    assert.equal(dict.GetValue(7), 100);
    assert.equal(dict.GetValue(-1), 200);
    assert.equal(dict.Contains(7), true);
    assert.equal(dict.Contains(8), false);
    assert.equal(dict.Contains("7"), false);
    assert.throws(() => dict.GetValue(8), error => error.name === "KeyError" && error.message === "FsdDict 'root': does not have the following key 8");

    // int32 keys with sizes: a sized value is decoded from a copy.
    const sizedFooter = new Bytes().u32(1).i32(-4).u32(0).u32(8);
    const listValue = new Bytes().u32(1).i32(55);
    const sizedDict = read(DictBytes(listValue, sizedFooter), {
        type: "dict",
        keyTypes: { type: "int" },
        valueTypes: { type: "list", itemTypes: { type: "int", size: 4 } },
        keyFooter: intFooterSchema(true),
    });
    assert.equal(sizedDict.GetValue(-4).GetIndex(0), 55);

    // String keys walk the variable-sized footer items.
    const stringValues = new Bytes().str("first").str("second");
    const item = (offset, key) => new Bytes().u32(offset).u64(0).u32(0).str(key);
    const itemA = item(0, "a");
    const itemB = item(9, "bé");
    const stringFooter = new Bytes().u32(2).u32(12).u32(12 + itemA.length).raw(itemA.bytes()).raw(itemB.bytes());
    const stringDict = read(DictBytes(stringValues, stringFooter), {
        type: "dict",
        keyTypes: { type: "string" },
        valueTypes: { type: "string" },
        keyFooter: stringFooterSchema,
    });
    assert.equal(stringDict.GetValue("a"), "first");
    assert.equal(stringDict.GetValue("bé"), "second");
    assert.equal(stringDict.Contains("c"), false);
    assert.throws(() => stringDict.GetValue("c"), error => error.message.endsWith("key 'c'"));

    // CE-120: any other key type gets an index that finds nothing.
    const unicodeDict = read(DictBytes(stringValues, stringFooter), {
        type: "dict",
        keyTypes: { type: "unicode" },
        valueTypes: { type: "string" },
        keyFooter: stringFooterSchema,
    });
    assert.equal(unicodeDict.Contains("a"), false);
    assert.throws(() => unicodeDict.GetValue("a"), error => error.name === "KeyError");
});

test("schema parsing follows Carbon's CreateSchema", () =>
{
    const result = new FsdSchemaAttributes();

    assert.equal(FsdSchemaAttributes.createSchema({ type: "long" }, result), false);
    assert.equal(result.schemaType, SchemaType.UNKNOWN_SCHEMA_TYPE);
    assert.throws(() => FsdSchemaAttributes.createSchema([], new FsdSchemaAttributes()), error => error.name === "TypeError");
    assert.throws(() => FsdSchemaAttributes.createSchema({}, new FsdSchemaAttributes()), error => error.message === "Schema has no 'type' key");
    assert.throws(() => FsdSchemaAttributes.createSchema({ type: "int", min: 0.5 }, new FsdSchemaAttributes()), error => error.message === "Schema key 'min' is not a int");

    const object = new FsdSchemaAttributes();
    FsdSchemaAttributes.createSchema({ type: "object", attributes: { a: { type: "enum" } }, size: 4 }, object);
    assert.equal(object.objectAttributes.attributes.get("a").schemaType, SchemaType.UNKNOWN_SCHEMA_TYPE);
});

test("the format pipeline reads legacy FSD with a caller schema and refuses JSON", () =>
{
    const bytes = new Bytes().i32(3).bytes();
    const route = new CjsFormatStore().Register(CjsFsdFormat).Resolve(".fsdbinary", bytes);
    const schema = { type: "int" };

    assert.equal(route.Read(bytes, { bitWidth: 32, schema }), 3);
    assert.equal(CjsFsdFormat.getSupport(bytes, { bitWidth: 32, schema }).supported, true);
    assert.equal(CjsFsdFormat.getSupport(bytes, { bitWidth: 32, schema }).preferredOutput, "payload");
    assert.equal(CjsFsdFormat.inspect(bytes, { variant: "fsd32", schema }).decodable, true);

    assert.throws(() => CjsFsdFormat.readJSON(bytes, { bitWidth: 32, schema }), error => error.code === "CJS_FSD_32_UNSUPPORTED");
    assert.throws(() => CjsFsdFormat.read(bytes, { bitWidth: 32 }), error => error.code === "CJS_FSD_32_SCHEMA_REQUIRED");
    assert.throws(() => CjsFsdFormat.read(bytes, { bitWidth: 32, schema: { type: "union" } }), error => error.code === "CJS_FSD_32_SCHEMA_INVALID");
    assert.throws(() => CjsFsdFormat.read("x", { bitWidth: 32, schema }), error => error.code === "CJS_FSD_INPUT_INVALID" && error instanceof TypeError);
});
