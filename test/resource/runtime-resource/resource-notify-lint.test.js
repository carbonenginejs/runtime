import assert from "node:assert/strict";
import {test} from "node:test";
import {auditNotifyTargets} from "../../../scripts/lint-resource-notify-targets.js";

test("notify lint follows private teardown helpers and rejects unreachable removals", () =>
{
  const source = 'class Owner { Bind(r) { r.AddNotifyTarget(this); } #Detach() { this.r.RemoveNotifyTarget(this); } Destruct() { this.#Detach(); BlueAsyncRes.markNotifyTargetDestructed(this); } }';
  assert.deepEqual(auditNotifyTargets(source), []);
  assert.match(auditNotifyTargets(source.replace('this.#Detach();', ''))[0].message, /RemoveNotifyTarget/);
  assert.match(auditNotifyTargets(source.replace('BlueAsyncRes.markNotifyTargetDestructed(this);', ''))[0].message, /mark/);
});

test("notify lint ignores comments and requires the owner argument", () =>
{
  const source = 'class Owner { Bind(r) { r.AddNotifyTarget(this); } Destruct() { /* r.RemoveNotifyTarget(this); */ r.RemoveNotifyTarget(other); BlueAsyncRes.markNotifyTargetDestructed(this); } }';
  assert.equal(auditNotifyTargets(source).length, 1);
});
