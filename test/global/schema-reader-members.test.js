import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema } from "../../src/global/schema/CjsSchema.js";
import { getReaderMemberValue, applyReaderMember, finalizeReaderObject } from "../../src/global/schema/hydration.js";
import { IInitialize } from "../../src/global/blue/IInitialize.js";
import { INotify } from "../../src/global/blue/INotify.js";

const member = (name, type, extra = {}) => ({
  name, key: name, role: "member", type: { kind: type }, edit: { persist: true }, ...extra
});

test("reader uses hidden backing data, not a live accessor or values service", () => {
  class Target {
    _value = 3;
    calls = [];
    get value() { throw new Error("live getter"); }
    set value(_) { throw new Error("live setter"); }
    SetValues() { throw new Error("editor transport"); }
    OnModified(name) { this.calls.push(name); return false; }
  }
  CjsSchema.carbon.mapInterface(INotify)(Target);
  const target = new Target();
  const field = member("value", "int32", { key: "_value", edit: { persist: true, hidden: true, notify: true } });
  assert.equal(getReaderMemberValue(target, field), 3);
  applyReaderMember(target, field, 3);
  applyReaderMember(target, field, 7);
  assert.equal(target._value, 7);
  assert.deepEqual(target.calls, ["value", "value"]);
  assert.equal(Object.hasOwn(target, "__state"), false);
});

test("mapped initialization suppresses notifications even when initialization is disabled", () => {
  class Target {
    value = 0;
    calls = [];
    Initialize() { this.calls.push("initialize"); return false; }
    OnModified() { throw new Error("mapped initialization suppresses notify"); }
  }
  CjsSchema.carbon.mapInterface(IInitialize, INotify)(Target);
  const target = new Target();
  applyReaderMember(target, member("value", "int32", { edit: { persist: true, notify: true } }), 2);
  finalizeReaderObject(target, { initialize: false });
  assert.deepEqual(target.calls, []);
  assert.equal(finalizeReaderObject(target), target);
  assert.deepEqual(target.calls, ["initialize"]);
  assert.equal(Object.hasOwn(target, "__state"), false);
});

test("method presence and native base composition do not imply mapped reader interfaces", () => {
  class Target extends IInitialize {
    value = 0;
    Initialize() { throw new Error("unmapped Initialize"); }
    OnModified() { throw new Error("unmapped OnModified"); }
  }
  const target = new Target();
  applyReaderMember(target, member("value", "int32", { edit: { persist: true, notify: true } }), 5);
  finalizeReaderObject(target);
  assert.equal(target.value, 5);
});

test("reader interface mappings use stable identities across constructor copies", () => {
  class OtherNotify {}
  CjsSchema.define(OtherNotify, { className: "INotify" });
  class Target {
    value = 1;
    calls = [];
    OnModified(name) { this.calls.push(name); }
  }
  CjsSchema.carbon.mapInterface(OtherNotify)(Target);
  const target = new Target();
  applyReaderMember(target, member("value", "int32", { edit: { persist: true, notify: true } }), 2);
  assert.deepEqual(target.calls, ["value"]);
});

test("indexed members select zero and preserve the other stored elements", () => {
  const target = { values: [1, 2] };
  applyReaderMember(target, member("first", "float32", { key: "values", index: 0 }), 8);
  applyReaderMember(target, member("second", "float32", { key: "values", index: 1 }), 9);
  assert.deepEqual(target.values, [8, 9]);
  assert.equal(getReaderMemberValue(target, member("first", "float32", { key: "values", index: 0 })), 8);
});

test("stored-member reads and writes reject accessor routes without invoking them", () => {
  let calls = 0;
  const target = { get value() { calls++; throw new Error("invoked"); }, set value(_) { calls++; } };
  const field = member("value", "int32");
  assert.throws(() => getReaderMemberValue(target, field), /backing key/);
  assert.throws(() => applyReaderMember(target, field, 1), /backing key/);
  assert.equal(calls, 0);
  assert.throws(() => applyReaderMember({}, { ...field, role: "property" }, 1), /stored PERSIST/);
  assert.throws(() => applyReaderMember({}, { ...field, edit: { rpersist: true } }, 1), /stored PERSIST/);
});

test("decoded references and collection destinations retain identities", () => {
  const shared = {};
  const target = { child: null, children: ["old"], byName: new Map([["old", shared]]), unique: new Set() };
  const list = target.children;
  const map = target.byName;
  const set = target.unique;
  applyReaderMember(target, member("child", "objectRef"), target);
  applyReaderMember(target, member("children", "list"), [shared, null, target, shared]);
  applyReaderMember(target, member("byName", "map"), { added: shared, empty: null });
  applyReaderMember(target, member("unique", "set"), [shared, null, shared]);
  assert.equal(target.child, target);
  assert.equal(target.children, list);
  assert.deepEqual(list, [shared, target, shared]);
  assert.equal(target.byName, map);
  assert.equal(map.get("old"), shared);
  assert.equal(map.get("added"), shared);
  assert.equal(map.has("empty"), false);
  assert.equal(target.unique, set);
  assert.deepEqual([...set], [shared]);
  assert.equal(Object.hasOwn(target, "__state"), false);
});

test("math storage is filled in place and embedded objects require the existing destination", () => {
  const position = new Float32Array(3);
  const embedded = {};
  const target = { position, embedded };
  applyReaderMember(target, member("position", "vec3"), [1, 2, 3]);
  assert.equal(target.position, position);
  assert.deepEqual([...position], [1, 2, 3]);
  applyReaderMember(target, member("embedded", "struct"), embedded);
  assert.equal(target.embedded, embedded);
  assert.throws(() => applyReaderMember(target, member("embedded", "struct"), {}), /existing destination/);
});

test("reader rejects unknown member types and dictionary accessors visibly", () => {
  assert.throws(() => applyReaderMember({}, member("value", "unknown"), {}), /precise type/);
  const dictionary = { get child() { throw new Error("must not invoke"); } };
  assert.throws(() => applyReaderMember({}, member("items", "map"), dictionary), /contains accessor/);
});


test("reader preserves signed zero in both directions", () => {
  const target = { value: 0 };
  const field = member("value", "float32");
  applyReaderMember(target, field, -0);
  assert.equal(Object.is(target.value, -0), true);
  applyReaderMember(target, field, 0);
  assert.equal(Object.is(target.value, 0), true);
});

test("indexed storage rejects out-of-bounds data before reading or notifying", () => {
  class Target {
    values = new Float32Array(1);
    calls = 0;
    OnModified() { this.calls++; }
  }
  CjsSchema.carbon.mapInterface(INotify)(Target);
  const target = new Target();
  const field = member("outside", "float32", { key: "values", index: 1, edit: { persist: true, notify: true } });
  assert.throws(() => getReaderMemberValue(target, field), /storage length/);
  assert.throws(() => applyReaderMember(target, field, 5), /storage length/);
  assert.equal(target.calls, 0);
  assert.deepEqual([...target.values], [0]);
  assert.throws(() => applyReaderMember({ values: [] }, { ...field, index: 0 }, 5), /storage length/);
});

test("reader preserves decoded non-finite scalars instead of applying editor normalization", () => {
  for (const kind of ["float32", "float64"]) {
    const target = { value: 0 };
    for (const value of [NaN, Infinity, -Infinity, -0, 0]) {
      applyReaderMember(target, member("value", kind), value);
      assert.equal(Object.is(target.value, value), true, `${kind}: ${String(value)}`);
    }
  }
});

test("reader fills math and typed buffers without losing signed zero or non-finite payloads", () => {
  const vector = new Float32Array(4);
  const buffer = new Float32Array(4);
  const target = { vector, buffer };
  const input = new Float32Array([-0, NaN, Infinity, -Infinity]);
  applyReaderMember(target, member("vector", "vec4"), input);
  applyReaderMember(target, member("buffer", "typedArray", { type: { kind: "typedArray", arrayType: "Float32Array" } }), input);
  assert.equal(target.vector, vector);
  assert.equal(target.buffer, buffer);
  for (const result of [vector, buffer]) {
    for (let i = 0; i < input.length; i++) assert.equal(Object.is(result[i], input[i]), true);
  }
});
