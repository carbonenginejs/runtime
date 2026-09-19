import assert from "node:assert/strict";
import { test } from "node:test";
import { CjsSchema } from "#schema";
import { CjsModel } from "#model";

let serial = 0;
function fixture(model)
{
  const Base = model ? CjsModel : class {};
  class Probe extends Base
  {
    a = 0;
    b = 0;
    quiet = 0;
    seen = [];
    OnModified(name) { this.seen.push(name); return this.action?.(name) ?? true; }
  }
  CjsSchema.define(Probe, { className: `MemberNotificationProbe${serial++}` });
  for (const name of ["a", "b", "quiet"])
  {
    CjsSchema.defineField(Probe, name, "type", { kind: "int32" });
    CjsSchema.defineField(Probe, name, "edit", { persist: true, notify: name !== "quiet" });
  }
  if (!model)
  {
    CjsSchema.compose.values(Probe, { kind: "class" });
    CjsSchema.compose.notify(Probe, { kind: "class" });
  }
  return new Probe();
}

for (const model of [true, false])
{
  const route = model ? "model" : "composition";
  test(`${route}: equal-write notifications do not invent changed fields`, () =>
  {
    const p = fixture(model);
    assert.equal(p.SetValues({ a: 0, quiet: 0 }, { returnBoolean: true }), false);
    assert.deepEqual(p.seen, ["a"]);
    p.SetValues({ a: 0 }, { notify: false });
    p.SetValues({ a: 0 }, { markDirty: false });
    assert.deepEqual(p.seen, ["a"]);
    p.SetValues({ a: 0 }, { skipUpdate: true });
    p.SetValues({ a: 0 }, { skipUpdate: true });
    p.UpdateValues();
    assert.deepEqual(p.seen, ["a", "a"]);
    const changed = p.SetValues({ a: 0, b: 1 });
    assert.deepEqual([...changed], ["b"]);
    assert.deepEqual(p.seen, ["a", "a", "a", "b"]);
  });
  test(`${route}: a batch dispatches individual notified members`, () =>
  {
    const p = fixture(model);
    p.SetValues({ a: 1, b: 2, quiet: 3 });
    assert.deepEqual(p.seen, ["a", "b"]);
    assert.equal(p.IsDirty(), false);
    p.SetValues({ quiet: 4 });
    assert.deepEqual(p.seen, ["a", "b"]);
  });
  test(`${route}: deferred notifications coalesce until one explicit flush`, () =>
  {
    const p = fixture(model);
    p.SetValues({ a: 1 }, { skipUpdate: true });
    p.SetValues({ a: 2, b: 3 }, { skipUpdate: true });
    assert.deepEqual(p.seen, []);
    p.UpdateValues();
    assert.deepEqual(p.seen, ["a", "b"]);
  });
  test(`${route}: nested same-member edits survive clearing dirty`, () =>
  {
    const p = fixture(model);
    p.action = name =>
    {
      if (name === "a" && p.a === 1)
      {
        p.SetValues({ a: 2, b: 1 }, { skipUpdate: true });
        p.ClearDirty();
      }
    };
    p.SetValues({ a: 1 });
    assert.deepEqual(p.seen, ["a", "a", "b"]);
  });
  test(`${route}: quiet nested edits do not become broad notifications`, () =>
  {
    const p = fixture(model);
    p.action = () => p.SetValues({ quiet: 3 });
    p.SetValues({ a: 1 });
    assert.deepEqual(p.seen, ["a"]);
  });
  test(`${route}: explicit nested update and MarkDirty each request another pass`, () =>
  {
    for (const repeat of [p => p.UpdateValues(), p => p.MarkDirty()])
    {
      const p = fixture(model);
      p.action = name => { if (name === "a") repeat(p); };
      p.SetValues({ a: 1 });
      assert.deepEqual(p.seen, ["a", null]);
    }
  });
  test(`${route}: successful writes survive a later setter failure`, () =>
  {
    const p = fixture(model);
    let reject = true;
    let b = 0;
    Object.defineProperty(p, "b", {
      configurable: true,
      get: () => b,
      set: value => { if (reject) throw new Error("setter failed"); b = value; }
    });
    assert.throws(() => p.SetValues({ a: 1, b: 2 }), /setter failed/);
    assert.equal(p.a, 1);
    reject = false;
    p.SetValues({ a: 1, b: 2 });
    assert.deepEqual(p.seen, ["a", "b"]);
    assert.equal(p.IsDirty(), false);
  });
  test(`${route}: events follow one completed outer settle`, () =>
  {
    const p = fixture(model);
    const events = [];
    p.OnEvent("modified", (name, target, detail) => events.push({ name, target, detail }));
    p.action = name => { if (name === "a") p.SetValues({ b: 2 }); };
    const source = {};
    p.SetValues({ a: 1 }, { source });
    assert.deepEqual(p.seen, ["a", "b"]);
    assert.equal(events.length, 1);
    assert.equal(events[0].target, p);
    assert.equal(events[0].detail.source, source);
    if (model) assert.deepEqual(events[0].detail, { source });
    else assert.deepEqual([...events[0].detail.changedFields], ["a"]);
    p.action = () => false;
    p.SetValues({ a: 2 });
    assert.equal(events.length, 1);
    p.action = () => { throw new Error("rejected"); };
    assert.throws(() => p.UpdateValues(), /rejected/);
    assert.equal(events.length, 1);
    p.action = null;
    p.UpdateValues({ skipEvents: true });
    assert.equal(events.length, 1);
  });
  test(`${route}: silent writes preserve earlier queued members`, () =>
  {
    const p = fixture(model);
    p.SetValues({ a: 1 }, { skipUpdate: true });
    p.SetValues({ b: 2 }, { notify: false, skipUpdate: true });
    p.SetValues({ b: 3 }, { markDirty: false });
    p.UpdateValues();
    assert.deepEqual(p.seen, ["a"]);
  });
  test(`${route}: failed or throwing members retry without replaying accepted members`, () =>
  {
    for (const throws of [false, true])
    {
      const p = fixture(model);
      p.action = name =>
      {
        if (name === "b")
        {
          if (throws) throw new Error("reject b");
          return false;
        }
      };
      if (throws) assert.throws(() => p.SetValues({ a: 1, b: 1 }), /reject b/);
      else p.SetValues({ a: 1, b: 1 });
      assert.equal(p.IsDirty(), true);
      p.action = null;
      p.UpdateValues();
      assert.deepEqual(p.seen, ["a", "b", "b"]);
      assert.equal(p.IsDirty(), false);
    }
  });
  test(`${route}: nonconvergent notifications retain pending work`, () =>
  {
    const p = fixture(model);
    p.action = () => p.SetValues({ a: p.a + 1 });
    assert.throws(() => p.SetValues({ a: 1 }), /32 settle passes/);
    assert.equal(p.IsDirty(), true);
    p.action = null;
    assert.equal(p.UpdateValues(), true);
  });
}
