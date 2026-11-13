import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema, type } from "../../src/blue/schema/index.js";
import { exposure as be } from "../../src/blue/exposure/be.js";
import { BlueList } from "../../src/blue/exposure/BlueList.js";
import { IInitialize } from "../../src/blue/exposure/IInitialize.js";
import { IListNotify } from "../../src/blue/exposure/IListNotify.js";
import { INotify } from "../../src/blue/exposure/INotify.js";
import { BLUELISTEVENT } from "../../src/global/consts/blue.js";
import { BlackReader } from "../../src/blue/formats/black/BlackReader.js";
import { CjsBlackRecordReader } from "../../src/blue/formats/black/CjsBlackRecordReader.js";

const blue = CjsSchema.be;

import { Fixture, bytesOf, concat, u8, u16, i32, u32, f32, i64, floats } from "../support/blackFixture.js";

const field = (type, notify = false) => ({ type, exposure: { macro: "MAP_ATTRIBUTE", flags: notify ? 20 : 16 }, edit: { persist: true, notify } });

class Leaf
{
    value = 0;
    initialized = 0;
    Initialize() { this.initialized++; return true; }
}
CjsSchema.define(Leaf, { name: "BlackPortLeaf", fields: { value: field({ kind: "uint32" }) } });
blue.interface(Leaf, IInitialize)(Leaf);

class Other {}
CjsSchema.define(Other, { name: "BlackPortOther" });

class Record
{
    position = new Float32Array(3);
    weight = 0;
    name = "";
}
CjsSchema.define(Record, { name: "BlackPortRecord", struct: { size: 24 }, members: [
    { name: "position", key: "position", struct: { dataType: "FLOAT32_3", offset: 0 } },
    { name: "weight", key: "weight", struct: { dataType: "FLOAT32_1", offset: 12 } },
    { name: "name", key: "name", struct: { dataType: "SHAREDSTRING_1", offset: 16 } }
] });

class Inner
{
    value = 0;
    OnModified() {}
}
CjsSchema.define(Inner, { name: "BlackPortInner", fields: { value: field({ kind: "uint32" }) } });
blue.interface()(Inner);

class Owner
{
    count = 0;
    negative = 0;
    big = 0;
    flag = false;
    wideName = "";
    position = new Float32Array(3);
    transform = new Float32Array(16);
    leaf = null;
    typed = null;
    embedded = new Inner();
    array = [];
    held = [ "old" ];
    unique = new Set();
    named = new Map();
    records = [];
    list = new BlueList(Leaf, { className: "BlackPortLeaf" });
    notified = [];
    _prop = 0;
    get prop() { return this._prop; }
    set prop(value) { this._prop = value + 1; }
    OnModified(name) { this.notified.push(name); }
}
CjsSchema.be.define(Owner, { name: "BlackPortOwner", fields: {
    count: field({ kind: "uint32" }, true),
    negative: field({ kind: "int16" }),
    big: field({ kind: "int64" }),
    flag: field({ kind: "boolean" }),
    wideName: field({ kind: "wstring" }),
    position: field({ kind: "vec3" }),
    transform: field({ kind: "mat4", wrapped: "TriMatrix" }),
    leaf: field({ kind: "rootRef" }),
    typed: field({ kind: "rootRef", className: "BlackPortLeaf" }),
    embedded: field({ kind: "root" }),
    array: field({ kind: "array", itemType: "BlackPortLeaf" }),
    held: field({ kind: "list", itemType: "BlackPortLeaf" }),
    unique: field({ kind: "set", itemType: "BlackPortLeaf" }),
    named: field({ kind: "map", valueType: "BlackPortLeaf" }),
    records: field({ kind: "structList", className: "BlackPortRecord" }),
    list: field({ kind: "list", itemType: "BlackPortLeaf" }, true)
}, properties: [
    { exposure: { macro: "MAP_ATTRIBUTE", flags: 16 }, name: "prop", key: "prop", role: "property", type: { kind: "uint32" }, edit: { persist: true } }
] });
blue.interface(INotify)(Owner);

const read = bytes =>
{
    const reader = new BlackReader();
    const root = reader.ReadFromStream(bytes);
    assert.equal(reader.GetErrorMessage(), "");
    return root;
};
const failure = bytes =>
{
    const reader = new BlackReader();
    assert.equal(reader.ReadFromStream(bytes), null);
    return reader.GetErrorMessage();
};

test("scalars, strings and float arrays land in the member, arrays filled in place", () =>
{
    const f = new Fixture();
    const bytes = f.Finish(f.Object(1, "BlackPortOwner", [
        [ "count", u32(0xffffffff) ],
        [ "negative", bytesOf(2, view => view.setInt16(0, -2, true)) ],
        [ "big", i64(-5n) ],
        [ "flag", u8(1) ],
        [ "wideName", f.W("wide") ],
        [ "position", floats([ 1, 2, 3 ]) ]
    ]));

    const defaults = new Owner();
    const root = read(bytes);
    assert.equal(root.count, 0xffffffff);
    assert.equal(root.negative, -2);
    assert.equal(root.big, -5);
    assert.equal(root.flag, true);
    assert.equal(root.wideName, "wide");
    assert.ok(root.position instanceof Float32Array);
    assert.deepEqual(Array.from(root.position), [ 1, 2, 3 ]);
    assert.deepEqual(root.transform, defaults.transform);
});

test("a math wrapper's elements fill the member's array, and those the file omits keep their values", () =>
{
    const f = new Fixture();
    const bytes = f.Finish(f.Object(1, "BlackPortOwner", [
        [ "transform", f.Embedded("TriMatrix", [ [ "_12", f32(5) ], [ "_44", f32(2) ] ]) ]
    ]));
    const root = read(bytes);
    assert.equal(root.transform[1], 5);
    assert.equal(root.transform[15], 2);
    assert.equal(root.transform[0], 0);
});

test("HandleAttribute notifies a NOTIFY member of an object without IInitialize, in file order", () =>
{
    const f = new Fixture();
    const root = read(f.Finish(f.Object(1, "BlackPortOwner", [
        [ "count", u32(3) ], [ "flag", u8(1) ], [ "list", f.List([]) ]
    ])));
    assert.deepEqual(root.notified, [ "count", "list" ]);
});

test("a persisted property goes through its setter (Fixes CE-179)", () =>
{
    const f = new Fixture();
    assert.equal(read(f.Finish(f.Object(1, "BlackPortOwner", [ [ "prop", u32(4) ] ]))).prop, 5);
});

test("references: null, shared and repeated objects, and Initialize once per object", () =>
{
    const f = new Fixture();
    const root = read(f.Finish(f.Object(1, "BlackPortOwner", [
        [ "leaf", f.Object(2, "BlackPortLeaf", [ [ "value", u32(7) ] ]) ],
        [ "typed", f.Object(2) ],
        [ "array", f.List([ f.Object(2), f.Object(0) ]) ]
    ])));
    assert.equal(root.leaf.value, 7);
    assert.equal(root.typed, root.leaf);
    assert.equal(root.leaf.initialized, 1);
    assert.deepEqual(root.array, [ root.leaf, null ], "an array member keeps null items");
});

test("SetDoInitialize(false) stops Initialize", () =>
{
    const f = new Fixture();
    const reader = new BlackReader();
    reader.SetDoInitialize(false);
    assert.equal(reader.ReadFromStream(f.Finish(f.Object(1, "BlackPortLeaf"))).initialized, 0);
});

test("CreateObject builds a new graph from the cached file each time", () =>
{
    const f = new Fixture();
    const reader = new BlackReader();
    assert.equal(reader.ReadForCachingFromStream(f.Finish(f.Object(1, "BlackPortLeaf", [ [ "value", u32(1) ] ]))), true);
    const first = reader.CreateObject(0, null), second = reader.CreateObject(0, null);
    assert.notEqual(first, second);
    assert.equal(second.value, 1);
});

test("an embedded object is read into the one already there, whatever name the file gives", () =>
{
    const f = new Fixture();
    const owner = new Owner();
    const bytes = f.Finish(f.Object(1, "BlackPortOwner", [ [ "embedded", f.Embedded("BlackPortInner", [ [ "value", u32(9) ] ]) ] ]));
    const root = read(bytes);
    assert.equal(root.embedded.value, 9);
    assert.ok(root.embedded instanceof Inner);
    assert.notEqual(root.embedded, owner.embedded);
});

test("ReadList goes through the list's own methods, silently, then says load finished", () =>
{
    const events = [];
    class Observer extends IListNotify
    {
        OnListModified(event) { events.push(event); }
    }
    class Wired extends Owner
    {
        constructor() { super(); this.list.SetNotify(new Observer()); }
    }
    CjsSchema.define(Wired, { name: "BlackPortWired" });
    // Its members are Owner's, reached as Carbon reaches a parent's: through EXPOSURE_CHAINTO.
    be.exposureChainTo(Owner)(Wired);
    blue.interface(INotify)(Wired);

    const f = new Fixture();
    const root = read(f.Finish(f.Object(1, "BlackPortWired", [
        [ "list", f.List([ f.Object(2, "BlackPortLeaf"), f.Object(0), f.Object(2) ]) ]
    ])));
    assert.equal(root.list.GetSize(), 2, "a null is not appended; a repeat is");
    assert.equal(root.list[0], root.list[1]);
    assert.equal(events.at(-1), BLUELISTEVENT.BELIST_LOADFINISHED);
    assert.equal(events.filter(event => event === BLUELISTEVENT.BELIST_LOADFINISHED).length, 1);
});

test("a list member holding a plain array keeps its identity and drops nulls", () =>
{
    const f = new Fixture();
    const root = read(f.Finish(f.Object(1, "BlackPortOwner", [ [ "held", f.List([ f.Object(0), f.Object(2, "BlackPortLeaf") ]) ] ])));
    assert.equal(root.held.length, 1);
    assert.ok(root.held[0] instanceof Leaf);
});

test("a dictionary keeps old entries and skips nulls; a set takes its items", () =>
{
    const f = new Fixture();
    const dict = concat([ i32(2), f.S("a"), f.Object(2, "BlackPortLeaf"), f.S("b"), f.Object(0) ]);
    const root = read(f.Finish(f.Object(1, "BlackPortOwner", [
        [ "named", dict ],
        [ "unique", f.List([ f.Object(2), f.Object(0) ]) ]
    ])));
    assert.deepEqual([ ...root.named.keys() ], [ "a" ]);
    assert.deepEqual([ ...root.unique ], [ root.named.get("a") ]);
});

test("a structure list becomes item instances; a short record keeps later members' defaults", () =>
{
    const record = (x, weight, name) => concat([ floats([ x, 2, 3 ]), f32(weight), name, new Uint8Array(6) ]);
    const f = new Fixture();
    const full = concat([ i32(2), u16(24), record(1, .5, f.S("first")), record(4, .25, f.S("second")) ]);
    const short = concat([ i32(1), u16(16), floats([ 7, 8, 9 ]), f32(.75) ]);

    const records = read(f.Finish(f.Object(1, "BlackPortOwner", [ [ "records", full ] ]))).records;
    assert.equal(records.length, 2);
    assert.ok(records[0] instanceof Record);
    assert.deepEqual([ records[1].position[0], records[1].weight, records[1].name ], [ 4, .25, "second" ]);

    const g = new Fixture();
    const shortRecords = read(g.Finish(g.Object(1, "BlackPortOwner", [ [ "records", short ] ]))).records;
    assert.equal(shortRecords[0].weight, .75);
    assert.equal(shortRecords[0].name, "");
});

test("errors read as Carbon's, wrapped with each attribute on the way out", () =>
{
    let f = new Fixture();
    assert.equal(failure(f.Finish(f.Object(1, "BlackPortMissing"))), "Failed to create an instance of BlackPortMissing");

    f = new Fixture();
    assert.equal(failure(f.Finish(f.Object(1, "BlackPortOwner", [ [ "nothing", u32(0) ] ]))), "Invalid attribute: nothing");

    f = new Fixture();
    assert.equal(failure(f.Finish(f.Object(1, "BlackPortOwner", [ [ "typed", f.Object(2, "BlackPortOther") ] ]))),
        "typed: Incorrect type for member");

    f = new Fixture();
    assert.equal(failure(f.Finish(f.Object(1, "BlackPortOwner", [
        [ "embedded", f.Embedded("BlackPortInner", [ [ "missing", u32(0) ] ]) ]
    ]))), "embedded: Invalid attribute: missing");

    f = new Fixture();
    assert.equal(failure(f.Finish(f.Object(1, "BlackPortOwner", [ [ "records", concat([ i32(1), u16(19) ]) ] ]))),
        "records: Structure is not compatible with data in file");

    f = new Fixture();
    assert.equal(failure(f.Finish(concat([ u32(1), u32(100) ]))), "Reading out of bounds");
});

test("a file that is not version 1 Black is refused", () =>
{
    const reader = new BlackReader();
    assert.equal(reader.ReadForCachingFromStream(concat([ u32(1), u32(1) ])), false);
    assert.equal(reader.GetErrorMessage(), "Invalid file");
    assert.equal(reader.ReadForCachingFromStream(concat([ u32(0xb1acf11e), u32(2) ])), false);
    assert.equal(reader.GetErrorMessage(), "Invalid file");
    assert.deepEqual(reader.GetVersionsSupported(), [ 1 ]);
});

test("the string tables must hold exactly what they say", () =>
{
    const f = new Fixture();
    f.S("one");
    const bytes = f.Finish(u32(0));
    new DataView(bytes.buffer).setUint16(12, 2, true);
    const reader = new BlackReader();
    assert.equal(reader.ReadForCachingFromStream(bytes), false);
    assert.equal(reader.GetErrorMessage(), "String table is invalid");
});

test("a record is the file's values: names, new storage, markers, and nothing constructed", () =>
{
    const before = new Leaf();
    const f = new Fixture();
    const { object, comments } = new CjsBlackRecordReader().ReadRecord(f.Finish(f.Object(1, "BlackPortOwner", [
        [ "big", i64(5n) ],
        [ "position", floats([ 1, 2, 3 ]) ],
        [ "transform", f.Embedded("TriMatrix", [ [ "_12", f32(5) ] ]) ],
        [ "leaf", f.Object(2, "BlackPortLeaf", [ [ "value", u32(7) ] ]) ],
        [ "typed", f.Object(2) ],
        [ "embedded", f.Embedded("BlackPortInner", [ [ "value", u32(9) ] ]) ],
        [ "list", f.List([ f.Object(0), f.Object(2) ]) ],
        [ "named", concat([ i32(1), f.S("__proto__"), f.Object(0) ]) ],
        [ "records", concat([ i32(1), u16(16), floats([ 7, 8, 9 ]), f32(.75) ]) ]
    ])));

    assert.deepEqual(comments, []);
    assert.equal(Object.getPrototypeOf(object), null);
    assert.equal(object._type, "BlackPortOwner");
    assert.equal(object.big, 5n);
    assert.deepEqual(object.position, [ 1, 2, 3 ]);
    assert.deepEqual(object.transform, [ 1, 5, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 ]);
    assert.equal(object.leaf._type, "BlackPortLeaf");
    assert.equal(object.leaf._id, 2);
    assert.equal(object.leaf.initialized, undefined, "Initialize does not run");
    assert.deepEqual({ ...object.typed }, { _ref: 2 });
    assert.equal(object.embedded.value, 9);
    assert.deepEqual([ object.list[0], { ...object.list[1] } ], [ null, { _ref: 2 } ]);
    assert.equal(Object.hasOwn(object.named, "__proto__"), true);
    assert.deepEqual(object.records, [ { position: [ 7, 8, 9 ], weight: .75 } ]);
    assert.equal(before.initialized, 0);
});

class Either
{
    held = null;
    weakHeld = null;
    spare = null;
    inner = null;
}
for (const [ name, decorator ] of [
    [ "held", type.object.ref([ "BlackPortLeaf", "BlackPortInner" ]) ],
    [ "weakHeld", type.object.weak([ "BlackPortLeaf", "BlackPortInner" ]) ],
    [ "spare", type.object.ref.weak([ "BlackPortLeaf", "BlackPortInner", "BlackPortLeaf" ]) ],
    [ "inner", type.object.embed([ "BlackPortInner", "BlackPortLeaf" ]) ]
]) CjsSchema.decorateField(Either, name, be.mapAttribute(be.READWRITE | be.PERSIST), decorator);
be.define("BlackPortEither")(Either);

test("every object kind takes a list of accepted classes: the first is className, and accepts holds them all", () =>
{
    const types = new Map(CjsSchema.getSchema(Either).members.map(member => [ member.name, member.type ]));
    for (const name of [ "held", "weakHeld", "spare" ])
    {
        assert.equal(types.get(name).className, "BlackPortLeaf");
        assert.deepEqual(types.get(name).accepts, [ "BlackPortLeaf", "BlackPortInner" ]);
    }
    assert.equal(types.get("spare").owned, false);
    assert.equal(types.get("inner").className, "BlackPortInner");
    assert.throws(() => type.object.ref([]), /at least one class/);
    assert.throws(() => type.object.ref([ 1 ]), /a class or its name/);
});

test("Carbon's type check accepts any listed class and still refuses the rest", () =>
{
    for (const member of [ "held", "weakHeld" ])
    {
        for (const className of [ "BlackPortLeaf", "BlackPortInner" ])
        {
            const f = new Fixture();
            assert.equal(CjsSchema.getClassName(read(f.Finish(f.Object(1, "BlackPortEither", [ [ member, f.Object(2, className) ] ])))[member].constructor), className);
        }
        const f = new Fixture();
        assert.equal(failure(f.Finish(f.Object(1, "BlackPortEither", [ [ member, f.Object(2, "BlackPortOther") ] ]))), `${member}: Incorrect type for member`);
    }
});

class Numbers
{
    single = 0;
    wide = 0;
    position = new Float32Array(3);
    transform = new Float32Array(16);
    records = [];
}
CjsSchema.define(Numbers, { name: "BlackPortNumbers", fields: {
    single: field({ kind: "float32" }),
    wide: field({ kind: "float64" }),
    position: field({ kind: "vec3" }),
    transform: field({ kind: "mat4", wrapped: "TriMatrix" }),
    records: field({ kind: "structList", className: "BlackPortRecord" })
} });

const f64 = value => bytesOf(8, view => view.setFloat64(0, value, true));
const nonFinite = f => f.Object(1, "BlackPortNumbers", [
    [ "single", f32(NaN) ],
    [ "wide", f64(Infinity) ],
    [ "position", floats([ 1, -Infinity, 3 ]) ],
    [ "transform", f.Embedded("TriMatrix", [ [ "_12", f32(NaN) ] ]) ],
    [ "records", concat([ i32(1), u16(16), floats([ NaN, 8, 9 ]), f32(Infinity) ]) ]
]);

test("a non-finite number in a file reads as 0, wherever a float is read", () =>
{
    const f = new Fixture();
    const reader = new BlackReader();
    reader.SetFileName("res:/numbers.black");
    const root = reader.ReadFromStream(f.Finish(nonFinite(f)));
    assert.equal(root.single, 0);
    assert.equal(root.wide, 0);
    assert.deepEqual(Array.from(root.position), [ 1, 0, 3 ]);
    assert.equal(root.transform[1], 0);
    assert.equal(root.records[0].position[0], 0);
    assert.equal(root.records[0].weight, 0);
    assert.equal(reader._loggedNonFinite, true);
});

test("a plain record gets the same 0s", () =>
{
    const f = new Fixture();
    const { object } = new CjsBlackRecordReader().ReadRecord(f.Finish(nonFinite(f)));
    assert.equal(object.single, 0);
    assert.equal(object.wide, 0);
    assert.deepEqual(object.position, [ 1, 0, 3 ]);
    assert.equal(object.transform[1], 0);
    assert.deepEqual(object.records, [ { position: [ 0, 8, 9 ], weight: 0 } ]);
});

test("the first non-finite number marks the file as logged, and a finite file is never marked", () =>
{
    const reader = new BlackReader();
    assert.equal(reader._ReplaceNonFinite("a"), 0);
    assert.equal(reader._loggedNonFinite, true);

    const f = new Fixture();
    const clean = new BlackReader();
    clean.ReadFromStream(f.Finish(f.Object(1, "BlackPortNumbers", [ [ "single", f32(-0) ], [ "wide", f64(1.5) ] ])));
    assert.equal(clean._loggedNonFinite, false);
});
