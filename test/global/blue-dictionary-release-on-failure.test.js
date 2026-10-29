import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/CjsSchema.js";
import { DictReader } from "../../npm/dist/global/blue/DictReader.js";

// Carbon populates a new object through a local smart pointer
// (DictReader.cpp:34-90); a thrown read unwinds it and runs the destructor.
let sequence = 0;
const define = (Constructor, fields = {}) => {
  const className = `ReleaseOnFailure${++sequence}`;
  CjsSchema.define(Constructor, { className, fields });
  return className;
};

function defineGraph()
{
  const targets = new Set();
  const released = [];
  class Target
  {
    constructor() { targets.add(this); }
    Destruct() { targets.delete(this); released.push(this); }
  }
  const targetName = define(Target);
  class Child
  {
    target = null;
    nested = null;
    Destruct() { if (this.target) this.target.Destruct(); this.target = null; released.push(this); }
  }
  const childName = define(Child, {
    target: { type: { kind: "rootRef", className: targetName } },
    nested: { type: { kind: "rootRef", className: "IRoot" } }
  });
  class Parent
  {
    child = null;
    Destruct() { if (this.child) this.child.Destruct(); this.child = null; released.push(this); }
  }
  define(Parent, { child: { type: { kind: "rootRef", className: childName } } });
  return { Parent, targets, released };
}

for (const declarations of [true, false])
{
  test(`a child whose population throws is released before the error leaves (declarations: ${declarations})`, () => {
    const { Parent, targets, released } = defineGraph();
    const reader = new DictReader({ declarations });
    // The child's `target` registers itself, then `nested` fails: a scalar
    // is not an object (IRootReader.cpp:229).
    assert.throws(() => reader.CreateObject({ child: { target: {}, nested: 7 } }, Parent), /Incorrect type for member/);
    assert.equal(targets.size, 0);
    // Target, then the unassigned child, then the parent that never held it.
    assert.equal(released.length, 3);
    assert.ok(released[2] instanceof Parent);
    assert.equal(released[2].child, null);
  });
}

test("a successful read releases nothing", () => {
  const { Parent, targets, released } = defineGraph();
  const parent = new DictReader({ declarations: true }).CreateObject({ child: { target: {} } }, Parent);
  assert.ok(parent.child.target);
  assert.equal(targets.size, 1);
  assert.equal(released.length, 0);
});
