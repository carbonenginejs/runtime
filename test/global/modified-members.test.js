import { NotifyModified, IsMatch } from "#blue";
import assert from "node:assert/strict";
import { test } from "node:test";
import { CjsSchema } from "#schema";

let serial = 0;
function fixture(model, liveB = false)
{
  const Base = class {};
  class Probe extends Base
  {
    a = 0;
    b = 0;
    quiet = 0;
    seen = [];
    OnModified(name) { this.seen.push(name); return this.action?.(name) ?? true; }
  }
  for (const name of ["a", "b", "quiet"])
  {
    CjsSchema.defineField(Probe, name, "type", { kind: "int32" });
    CjsSchema.defineField(Probe, name, "edit", { persist: true, notify: name !== "quiet" });
    if (name === "b" && liveB)
    {
      // This fixture exercises live setter failure, not stored-member access.
      CjsSchema.defineField(Probe, name, "declaration", { role: "property" });
    }
  }
  CjsSchema.define(Probe, { className: `MemberNotificationProbe${serial++}` });
  if (!model)
  {
    CjsSchema.meta.values(Probe, { kind: "class" });
    CjsSchema.meta.events(Probe, { kind: "class" });
  }
  return new Probe();
}


test("equal values neither notify nor allocate editing state", () =>
{
  const p = fixture(false);
  assert.equal(p.SetValues({ a: 0, quiet: 0 }, { returnBoolean: true }), false);
  assert.deepEqual(p.seen, []);
  assert.equal(Object.hasOwn(p, "__state"), false);
  assert.deepEqual([...p.SetValues({ a: 0, b: 1 })], ["b"]);
  assert.deepEqual(p.seen, ["b"]);
});

test("one notification receives all changed NOTIFY members after the writes", () =>
{
  const p = fixture(false);
  p.action = () => assert.deepEqual([p.a, p.b, p.quiet], [1, 2, 3]);
  p.SetValues({ a: 1, b: 2, quiet: 3 });
  assert.deepEqual(p.seen, [["a", "b"]]);
  assert.equal(p.IsDirty(), false);
  p.action = null;
  p.SetValues({ quiet: 4 });
  assert.deepEqual(p.seen, [["a", "b"]]);
});

test("skipped updates keep dirty state but do not queue or replay names", () =>
{
  const p = fixture(false);
  p.SetValues({ a: 1 }, { skipUpdate: true });
  assert.equal(p.IsDirty(), true);
  p.SetValues({ b: 2 });
  assert.deepEqual(p.seen, ["b"]);
  assert.equal(Object.hasOwn(p.__state, "pendingModified"), false);
  assert.equal(Object.hasOwn(p.__state, "updating"), false);
});

test("a nested edit calls back immediately, with no reentrancy guard", () =>
{
  const p = fixture(false);
  let depth = 0, maximum = 0;
  p.action = name =>
  {
    maximum = Math.max(maximum, ++depth);
    if (name === "a") p.SetValues({ b: 2 });
    depth--;
  };
  p.SetValues({ a: 1 });
  assert.deepEqual(p.seen, ["a", "b"]);
  assert.equal(maximum, 2);
  assert.equal(p.IsDirty(), false);
});

test("a nested skipped write remains dirty without a later settle pass", () =>
{
  const p = fixture(false);
  p.action = () => p.SetValues({ b: 2 }, { skipUpdate: true });
  p.SetValues({ a: 1 });
  assert.deepEqual(p.seen, ["a"]);
  assert.equal(p.IsDirty(), true);
});

test("MarkDirty during a hook does not request another callback", () =>
{
  const p = fixture(false);
  p.action = () => p.MarkDirty();
  p.SetValues({ a: 1 });
  assert.deepEqual(p.seen, ["a"]);
  assert.equal(p.IsDirty(), true);
});

test("writes before a later setter failure survive without replaying names", () =>
{
  const p = fixture(false, true);
  let reject = true, b = 0;
  Object.defineProperty(p, "b", {
    configurable: true, get: () => b,
    set: value => { if (reject) throw new Error("setter failed"); b = value; }
  });
  assert.throws(() => p.SetValues({ a: 1, b: 2 }), /setter failed/);
  assert.equal(p.a, 1);
  assert.equal(p.IsDirty(), true);
  assert.deepEqual(p.seen, []);
  reject = false;
  p.SetValues({ a: 1, b: 2 });
  assert.deepEqual(p.seen, ["b"]);
  assert.equal(p.IsDirty(), false);
});

test("nested edits emit in completion order with each call's changed names", () =>
{
  const p = fixture(false);
  const events = [];
  p.OnEvent("modified", (name, target, detail) => events.push({ target, detail }));
  p.action = name => { if (name === "a") p.SetValues({ b: 2 }); };
  const source = {};
  p.SetValues({ a: 1 }, { source });
  assert.equal(events.length, 2);
  assert.deepEqual([...events[0].detail.changedFields], ["b"]);
  assert.deepEqual([...events[1].detail.changedFields], ["a"]);
  assert.equal(events[1].detail.source, source);
  assert.equal(events[1].target, p);
  p.action = null;
  p.SetValues({ a: 3 }, { skipEvents: true });
  assert.equal(events.length, 2);
  assert.deepEqual(p.seen, ["a", "b", "a"]);
});

test("notification and dirty suppression do not retain work for another call", () =>
{
  for (const options of [{notify: false}, {markDirty: false}, {skipUpdate: true}])
  {
    const p = fixture(false);
    p.SetValues({ a: 1 }, options);
    assert.deepEqual(p.seen, []);
    p.SetValues({ b: 2 });
    assert.deepEqual(p.seen, ["b"]);
  }
});

test("a refused or throwing batch stays dirty without automatic retries", () =>
{
  for (const throws of [false, true])
  {
    const p = fixture(false);
    const events = [];
    p.OnEvent("modified", (...args) => events.push(args));
    p.action = () => { if (throws) throw new Error("rejected"); return false; };
    if (throws) assert.throws(() => p.SetValues({ a: 1, b: 1 }), /rejected/);
    else p.SetValues({ a: 1, b: 1 });
    assert.equal(p.IsDirty(), true);
    assert.deepEqual(p.seen, [["a", "b"]]);
    assert.equal(events.length, 0);
    p.action = null;
    p.SetValues({ a: 2 });
    assert.deepEqual(p.seen, [["a", "b"], "a"]);
  }
});


test("explicit notification deduplicates names and isolates hook mutations from events", () =>
{
  const p = fixture(false);
  const input = ["a", "a", "b"];
  let detail;
  p.OnEvent("modified", (event, target, value) => { detail = value; });
  p.action = names => { assert.deepEqual(names, ["a", "b"]); names.push("quiet"); };
  assert.equal(NotifyModified(p, input), true);
  assert.deepEqual(input, ["a", "a", "b"]);
  assert.deepEqual([...detail.changedFields], ["a", "b"]);
  assert.equal(NotifyModified(p, []), true);
  assert.equal(p.seen.length, 1);
  p.action = null;
  NotifyModified(p, ["quiet", "quiet"]);
  assert.equal(p.seen[1], "quiet", "manual notification bypasses the NOTIFY declaration gate");
  assert.throws(() => NotifyModified(p, ["a", 1]), /names must be strings/);
});

test("IsMatch accepts single and multiple member names", () =>
{
  assert.equal(IsMatch("a", "a"), true);
  assert.equal(IsMatch(["a", "b"], "b"), true);
  assert.equal(IsMatch(["a", "b"], "c"), false);
  assert.equal(IsMatch([], "a"), false);
  assert.equal(IsMatch(null, "a"), false);
});
