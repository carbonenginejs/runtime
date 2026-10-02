import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema, meta } from "../../npm/dist/global/schema/index.js";
import { BlueList } from "../../npm/dist/global/blue/BlueList.js";
import { IList } from "../../npm/dist/global/blue/IList.js";
import { IListNotify } from "../../npm/dist/global/blue/IListNotify.js";
import { INotify } from "../../npm/dist/global/blue/INotify.js";
import { BLUELISTEVENT } from "../../npm/dist/global/consts/blue.js";
import { CjsBlackReader } from "../../npm/dist/resource/formats/black/core/CjsBlackReader.js";

const { BELIST_UNLOADSTART, BELIST_LOADFINISHED } = BLUELISTEVENT;
let setup, lastOwner;
class Item {
    value = 0;
    parent = null;
    OnModified() { setup.observe?.(this, lastOwner.items); }
}
class WrongItem extends Item {}
class Owner {
    constructor() {
        lastOwner = this;
        this.items = setup.list;
    }
    after = 0;
    ordinary = [];
    values = [];
    unique = new Set();
    notifications = [];
    OnModified(name) { this.notifications.push(name); }
}
const field = (type, notify = false) => ({ type, edit: { persist: true, notify } });
CjsSchema.define(Item, { className: "BlackNativeListItem", fields: {
    value: field({ kind: "uint32" }, true), parent: field({ kind: "objectRef", className: "BlackNativeListOwner" })
} });
meta.blue.interfaceTable({ interfaces: [Item, INotify], chainTo: null })(Item);
CjsSchema.define(WrongItem, { className: "BlackNativeListWrongItem" });
meta.blue.interfaceTable({ interfaces: [], chainTo: null })(WrongItem);
CjsSchema.define(Owner, { className: "BlackNativeListOwner", fields: {
    items: field({ kind: "list", itemType: "BlackNativeListItem" }, true),
    after: field({ kind: "uint32" }),
    ordinary: field({ kind: "list", itemType: "BlackNativeListItem" }),
    values: field({ kind: "array", itemType: "BlackNativeListItem" }),
    unique: field({ kind: "set", itemType: "BlackNativeListItem" })
} });
meta.blue.interfaceTable({ interfaces: [INotify], chainTo: null })(Owner);

class Observer extends IListNotify {
    events = [];
    OnListModified(event, key, key2, value, list) {
        this.events.push({ event, key, key2, value, list, items: items(list), notify: info(list).notify });
        this.onEvent?.(event, list);
    }
}
function info(list) { const result = {}; list.GetInfo(result); return result; }
function items(list) { return Array.from({length:list.GetSize()}, (_, i) => list.GetAt(i)); }
function begin(list = new BlueList(Item, { className: "BlackNativeListItem", listOps: 7 }), populated = true) {
    const old = new Item(); old.value = 99;
    if (populated) list.Append(old);
    const observer = new Observer(); list.SetNotify(observer);
    setup = { list, old, observer };
    return setup;
}
function wire(makeEntries, more = () => []) {
    const f = new BlackFixture();
    const entries = makeEntries(f);
    return f.Finish(f.Object(1, "BlackNativeListOwner", [
        ["items", concat([u32(entries.length), ...entries])], ...more(f), ["after", u32(42)]
    ]));
}
function read(bytes) {
    const reader = new CjsBlackReader(bytes, { schema: null, initialize: false });
    const root = reader.ReadRuntime().root;
    assert.equal(root.items, setup.list);
    assert.equal(root.after, 42);
    assert.equal(reader.references.get(1), root);
    assert.equal(reader.reader.AtEnd(), true);
    assert.deepEqual(reader.reports, []);
    return { root, reader };
}

test("canonical native list streams admitted objects, shared references and cycles under the captured observer", () => {
    const { list, old, observer } = begin();
    const replacement = new Observer();
    observer.onEvent = event => { if (event === BELIST_UNLOADSTART) list.SetNotify(replacement); };
    const seen = [];
    setup.observe = (item, destination) => seen.push([item.value, items(destination), info(destination).notify]);
    const { root, reader } = read(wire(f => [
        f.Object(2, "BlackNativeListItem", [["parent", f.Object(1)], ["value", u32(7)]]),
        f.Object(3, "BlackNativeListWrongItem"), f.Object(0), f.Object(2),
        f.Object(4, "BlackNativeListItem", [["value", u32(8)]])
    ]));
    assert.deepEqual(items(list).map(item => item.value), [7,7,8]);
    assert.equal(list[0], list[1]);
    assert.equal(list[0], reader.references.get(2));
    assert.equal(list[0].parent, root);
    assert.ok(!items(list).includes(reader.references.get(3)));
    assert.deepEqual(seen, [[7, [], null], [8, [list[0],list[0]], null]]);
    assert.deepEqual(observer.events.map(e=>e.event), [BELIST_UNLOADSTART]);
    assert.deepEqual(observer.events[0].items, [old]);
    assert.deepEqual(replacement.events.map(e=>e.event), [BELIST_LOADFINISHED]);
    assert.deepEqual(replacement.events[0].items, items(list));
    assert.equal(replacement.events[0].notify, replacement);
    assert.deepEqual(info(list), { iid: Item, clsid: "BlackNativeListItem", listOps: 7, notify: replacement });
    assert.deepEqual(root.notifications, ["items"]);
});

test("empty native lists finish once even when there was nothing to unload", () => {
    const { observer } = begin(undefined, false);
    const { root } = read(wire(() => []));
    assert.deepEqual(observer.events.map(e=>e.event), [BELIST_LOADFINISHED]);
    assert.deepEqual(root.notifications, ["items"]);
});

test("a later malformed object keeps the accepted prefix and restores notify without completion", () => {
    const { list, observer } = begin();
    const bytes = wire(f => [f.Object(2, "BlackNativeListItem", [["value", u32(7)]]), f.Object(3, "BlackNativeListMissing")]);
    assert.throws(() => read(bytes), /BlackNativeList/);
    assert.deepEqual(items(list).map(item=>item.value), [7]);
    assert.equal(info(list).notify, observer);
    assert.deepEqual(observer.events.map(e=>e.event), [BELIST_UNLOADSTART]);
    assert.deepEqual(lastOwner.notifications, []);
});

test("an Append exception keeps its accepted prefix and restores the observer", () => {
    const { list, observer } = begin();
    const append = list.Append;
    list.Append = function(item) { if (item.value === 8) throw Error("append failed"); return append.call(this,item); };
    assert.throws(() => read(wire(f => [
        f.Object(2, "BlackNativeListItem", [["value", u32(7)]]),
        f.Object(3, "BlackNativeListItem", [["value", u32(8)]])
    ])), /append failed/);
    assert.deepEqual(items(list).map(item=>item.value), [7]);
    assert.equal(info(list).notify, observer);
    assert.deepEqual(observer.events.map(e=>e.event), [BELIST_UNLOADSTART]);
    assert.deepEqual(lastOwner.notifications, []);
});

test("native list clears before a truncated count is read", () => {
    const { list, observer } = begin();
    const f = new BlackFixture();
    const bytes = f.Finish(f.Object(1, "BlackNativeListOwner", [["items", new Uint8Array(2)]]));
    assert.throws(() => read(bytes));
    assert.equal(list.GetSize(), 0);
    assert.equal(info(list).notify, observer);
    assert.deepEqual(observer.events.map(e=>e.event), [BELIST_UNLOADSTART]);
    assert.deepEqual(lastOwner.notifications, []);
});

// A mapped IList can use non-Array storage; the transport only knows its interface.
class NonArrayList {
    storage = new BlueList(Item);
    notify = null;
    GetInfo(out) { this.storage.GetInfo(out); out.notify = this.notify; }
    GetSize() { return this.storage.GetSize(); }
    GetAt(index) { return this.storage.GetAt(index); }
    SetNotify(notify) { this.notify = notify; }
    Remove(key) {
        assert.equal(key,-1);
        if (this.GetSize() && this.notify) this.notify.OnListModified(BELIST_UNLOADSTART,0,0,null,this);
        return this.storage.Remove(key);
    }
    Append(item) { assert.equal(this.notify,null); return this.storage.Append(item); }
}
CjsSchema.define(NonArrayList, { className: "BlackNativeNonArrayList" });
meta.blue.interfaceTable({ interfaces: [IList], chainTo: null })(NonArrayList);

test("a non-Array exact mapped IList is populated once and retained through shared hydration", () => {
    const { list, observer } = begin(new NonArrayList());
    assert.equal(Array.isArray(list),false);
    read(wire(f => [f.Object(2,"BlackNativeListItem"),f.Object(2)]));
    assert.equal(list.GetSize(),2);
    assert.equal(list.GetAt(0),list.GetAt(1));
    assert.deepEqual(observer.events.map(e=>e.event),[BELIST_UNLOADSTART,BELIST_LOADFINISHED]);
});

test("ordinary list, array and set retain their prior null and reference behavior", () => {
    begin();
    const { root } = read(wire(f => [f.Object(2,"BlackNativeListItem")], f => [
        ["ordinary",concat([u32(3),f.Object(2),f.Object(0),f.Object(2)])],
        ["values",concat([u32(2),f.Object(0),f.Object(2)])],
        ["unique",concat([u32(3),f.Object(2),f.Object(0),f.Object(2)])]
    ]));
    assert.deepEqual(root.ordinary,[root.items[0],root.items[0]]);
    assert.deepEqual(root.values,[null,root.items[0]]);
    assert.deepEqual([...root.unique],[root.items[0]]);
});

class UnmappedList extends BlueList {}
CjsSchema.define(UnmappedList, { className: "BlackNativeUnmappedList" });
meta.blue.interfaceTable({ interfaces: [], chainTo: null })(UnmappedList);
test("Array inheritance without an exact IList mapping keeps the ordinary population path", () => {
    const list = new UnmappedList(Item);
    const { observer } = begin(list);
    list.Remove = () => { throw Error("unmapped Remove must not run"); };
    list.Append = () => { throw Error("unmapped Append must not run"); };
    read(wire(f => [f.Object(2,"BlackNativeListWrongItem"),f.Object(0)]));
    assert.equal(list.length,1);
    assert.ok(list[0] instanceof WrongItem);
    assert.deepEqual(observer.events,[]);
});

test("a completion observer error propagates before owner notification", () => {
    const { list, observer } = begin();
    observer.onEvent = event => { if (event === BELIST_LOADFINISHED) throw Error("completion failed"); };
    assert.throws(() => read(wire(f=>[f.Object(2,"BlackNativeListItem")])), /completion failed/);
    assert.equal(list.length,1);
    assert.equal(info(list).notify,observer);
    assert.deepEqual(lastOwner.notifications,[]);
});
/** Bounded wire fixture for Black header/object framing, with no runtime schema source. */
class BlackFixture
{
    strings = [];
    String(value)
    {
        let index = this.strings.indexOf(value);
        if (index === -1) { index = this.strings.length; this.strings.push(value); }
        return u16(index);
    }
    Object(id, kind = null, fields = [])
    {
        if (kind === null) return u32(id);
        const parts = [this.String(kind)];
        for (const [name, value] of fields) parts.push(concat([this.String(name), value]));
        const body = concat(parts);
        return concat([u32(id), u32(body.length), body]);
    }
    Finish(root, wide = [])
    {
        const narrowParts = [u16(this.strings.length)];
        for (const value of this.strings) narrowParts.push(concat([new TextEncoder().encode(value), new Uint8Array(1)]));
        const wideParts = [u16(wide.length)];
        for (const value of wide)
        {
            for (let i = 0; i < value.length; i++) wideParts.push(u16(value.charCodeAt(i)));
            wideParts.push(u16(0));
        }
        const strings = concat(narrowParts), wideStrings = concat(wideParts);
        return concat([u32(0xb1acf11e), u32(1), u32(strings.length), strings, u32(wideStrings.length), wideStrings, root]);
    }
}

function concat(parts)
{
    const bytes = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
    let offset = 0;
    for (const part of parts) { bytes.set(part, offset); offset += part.length; }
    return bytes;
}
function u16(value)
{
    const bytes = new Uint8Array(2);
    new DataView(bytes.buffer).setUint16(0, value, true);
    return bytes;
}
function u32(value)
{
    const bytes = new Uint8Array(4);
    new DataView(bytes.buffer).setUint32(0, value, true);
    return bytes;
}
