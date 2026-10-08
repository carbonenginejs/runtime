import test from "node:test";
import assert from "node:assert/strict";
import { CjsSOFEditManager } from "../../../npm/dist/sof/CjsSOFEditManager.js";
import { CjsSchema } from "../../../npm/dist/global/schema/index.js";
import "../../../npm/dist/global/blue/values.js";
import { EveSOFDataGenericString } from "../../../npm/dist/sof/generic/EveSOFDataGenericString.js";
import { EveSOFDataParameterColor } from "../../../npm/dist/sof/shared/EveSOFDataParameterColor.js";

test("SOF definition edits use one direct receiver and ignore equal writes", () =>
{
  const changes = [], context = {}, target = new EveSOFDataGenericString();
  const manager = new CjsSOFEditManager({ receive: change => changes.push(change) });
  manager.SetValues(target, { str: "visibility_group" }, context);
  manager.SetValues(target, { str: "visibility_group" }, context);
  assert.equal(changes.length, 1);
  assert.equal(changes[0].target, target);
  assert.equal(changes[0].context, context);
  assert.deepEqual(changes[0].changes, [{ name: "str", kind: "string", before: "", after: "visibility_group" }]);
});

test("vectors retain backing storage and receipt values survive subsequent edits", () =>
{
  const changes = [], target = new EveSOFDataParameterColor(), original = target.value;
  const manager = new CjsSOFEditManager({ receive: change => changes.push(change) });
  manager.SetValues(target, { value: [2, 3, 4, 1] });
  manager.SetValues(target, { value: [5, 6, 7, 1] });
  assert.equal(target.value, original);
  assert.deepEqual(changes[0].changes[0].after, [2, 3, 4, 1]);
});

test("admitted list operations preserve identities and report membership/order", () =>
{
  const a = {}, b = {}, target = { items: [a, b] }, changes = [];
  const schema = { getField: (_type, name) => name === "items" ? { name, type: { kind: "list" } } : null };
  const manager = new CjsSOFEditManager({ schema, receive: change => changes.push(change) });
  const result = manager.Apply(target, ["items"], () => { target.items.reverse(); return b; }, null, "move");
  assert.equal(result, b);
  assert.deepEqual(changes[0].changes[0].before, [a, b]);
  assert.deepEqual(changes[0].changes[0].after, [b, a]);
  assert.equal(changes[0].changes[0].after[0], b);
  manager.Apply(target, ["items"], () => false, null, "delete");
  assert.equal(changes.length, 1);
});

test("indexed declared fields read the indexed value and partial failures are reported", () =>
{
  const target = { data: [0, 0] }, changes = [], failure = new Error("setter failed");
  const schema = { getField: (_type, name) => ({ name, key: "data", index: 1, type: { kind: "float32" } }) };
  const manager = new CjsSOFEditManager({ schema, receive: change => changes.push(change) });
  assert.throws(() => manager.Apply(target, ["y", "y"], () => { target.data[1] = 2; throw failure; }), error => error === failure);
  assert.deepEqual(changes[0].changes, [{ name: "y", kind: "float32", before: 0, after: 2 }]);
  assert.throws(() => manager.Apply(target, ["y"], () => { throw failure; }), error => error === failure);
  assert.equal(changes.length, 1);
});

test("unknown and read-only fields are rejected before mutation", () =>
{
  const target = new EveSOFDataGenericString(), changes = [];
  const manager = new CjsSOFEditManager({ receive: change => changes.push(change) });
  assert.throws(() => manager.SetValues(target, { str: "changed", absent: 3 }), /Unknown/);
  assert.equal(target.str, "");
  const schema = { getField: () => ({ name: "str", edit: { read: true }, type: { kind: "string" } }) };
  assert.throws(() => new CjsSOFEditManager({ schema }).SetValues(target, { str: "changed" }), /not editable/);
  assert.equal(changes.length, 0);
});

test("map and set mutations snapshot membership and order without cloning objects", () =>
{
  const a = {}, b = {}, target = { map: new Map([[a, 1]]), set: new Set([a, b]) }, changes = [];
  const schema = { getField: (_type, name) => ({ name, type: { kind: name } }) };
  const manager = new CjsSOFEditManager({ schema, receive: change => changes.push(change) });
  manager.Apply(target, ["map", "set"], () => { target.map.set(a, 2); target.set.delete(a); target.set.add(a); });
  const [map, set] = changes[0].changes;
  assert.equal(map.before.get(a), 1);
  assert.equal(map.after.get(a), 2);
  assert.deepEqual([...set.before], [a, b]);
  assert.deepEqual([...set.after], [b, a]);
  target.map.set(a, 3);
  assert.equal(map.after.get(a), 2);
  manager.Apply(target, ["map", "set"], () => { target.map.set(a, 3); target.set.add(a); });
  assert.equal(changes.length, 1);
});
