import assert from "node:assert/strict";
import { test } from "node:test";

import { CjsModel } from "../../src/global/model/index.js";
import { CjsSchema } from "../../src/global/schema/index.js";

// The top-level values rule (operator ruling, 2026-09-14): from/set exist for
// hydration and dehydration, so what arrives at the top is a plain values
// object. A live object there used to be read as a bag, building a new object
// that aliased the original's children. null still means "no values".

class ValuesInputChild extends CjsModel
{
  value = 0;
}
CjsSchema.define(ValuesInputChild, { className: "ValuesInputChild" });
CjsSchema.defineField(ValuesInputChild, "value", "type", { kind: "float32" });

class ValuesInputParent extends CjsModel
{
  label = "";
  child = null;
}
CjsSchema.define(ValuesInputParent, { className: "ValuesInputParent" });
CjsSchema.defineField(ValuesInputParent, "label", "type", { kind: "string" });
CjsSchema.decorateField(ValuesInputParent, "child", CjsSchema.type.model("ValuesInputChild"));

const NOT_VALUES = [
  [ "a live instance", () => ValuesInputParent.from({ label: "x" }) ],
  [ "an array", () => [ { label: "x" } ] ],
  [ "a string", () => "label" ],
  [ "a null-prototype object", () => Object.assign(Object.create(null), { label: "x" }) ]
];

test("a plain values object is accepted at every top-level entry point", () =>
{
  const model = ValuesInputParent.from({ label: "a", child: { value: 2 } });
  assert.equal(model.label, "a");
  assert.equal(model.child.value, 2);

  assert.deepEqual([ ...model.SetValues({ label: "b" }) ], [ "label" ]);
  assert.deepEqual([ ...CjsSchema.setValues(model, { label: "c" }) ], [ "label" ]);
  assert.equal(CjsSchema.from("ValuesInputParent", { label: "d" }).label, "d");
});

for (const [ description, make ] of NOT_VALUES)
{
  test(`${description} is refused at the top level`, () =>
  {
    const target = ValuesInputParent.from({ label: "target" });

    assert.throws(() => ValuesInputParent.from(make()), { name: "TypeError", message: /CjsModel\.from requires a plain values object/ });
    assert.throws(() => target.SetValues(make()), { name: "TypeError", message: /CjsModel\.set requires a plain values object/ });
    assert.throws(() => CjsSchema.setValues(target, make()), { name: "TypeError", message: /CjsSchema\.setValues requires a plain values object/ });
    assert.throws(() => CjsSchema.from("ValuesInputParent", make()), { name: "TypeError", message: /CjsSchema\.from requires a plain values object/ });
    assert.equal(target.label, "target", "a refused call changes nothing");
  });
}

test("from(X) on a live model is refused instead of half-aliasing its graph", () =>
{
  const X = ValuesInputParent.from({ label: "x", child: { value: 7 } });
  assert.throws(() => X.constructor.from(X), /received an instance of ValuesInputParent/);
});

test("null still means no values", () =>
{
  const model = ValuesInputParent.from({ label: "kept" });

  assert.equal(model.SetValues(null), false);
  assert.equal(CjsSchema.setValues(model, null), false);
  assert.equal(model.label, "kept");

  assert.equal(ValuesInputParent.from(null).label, "", "a default instance");
  assert.equal(CjsSchema.from("ValuesInputParent", null).label, "");
});

test("CjsSchema.copy takes a live source or a plain one, and keeps the target", () =>
{
  const source = ValuesInputParent.from({ label: "from-live" });
  const target = ValuesInputParent.from({ label: "before" });

  assert.deepEqual([ ...CjsSchema.copy(target, source) ], [ "label" ]);
  assert.equal(target.label, "from-live");
  assert.notEqual(target, source, "a value copy into the existing target");

  CjsSchema.copy(target, { label: "from-plain" });
  assert.equal(target.label, "from-plain");
});

test("a child field still takes a live object as a reference", () =>
{
  const child = ValuesInputChild.from({ value: 3 });
  const parent = ValuesInputParent.from({ child });
  assert.equal(parent.child, child, "the rule is top-level only");
});

// GetValues produces data for something outside the object - JSON or a
// serializer (operator ruling, 2026-09-16). A copy between two live objects is
// neither, and exporting for one allocated a plain array per math field that
// the setter read back into the target's own buffer and dropped.

class CopySourceModel extends CjsModel
{
  position = new Float32Array([ 0, 0, 0 ]);
  count = 0;
}
CjsSchema.define(CopySourceModel, { className: "CopySourceModel" });
CjsSchema.defineField(CopySourceModel, "position", "type", { kind: "vector3" });
CjsSchema.defineField(CopySourceModel, "count", "type", { kind: "uint32" });

test("CjsSchema.copy does not export the source", () =>
{
  const source = CopySourceModel.from({ position: [ 1, 2, 3 ], count: 7 });
  const target = new CopySourceModel();
  const buffer = target.position;

  // The export door itself, because the model path reaches CjsModel.get
  // without going through the source's own GetValues.
  const getValues = CjsSchema.getValues;
  let exports = 0;
  CjsSchema.getValues = function (...args)
  {
    exports++;
    return getValues.apply(this, args);
  };

  try
  {
    CjsSchema.copy(target, source);
    assert.equal(exports, 0, "the copy asked the source for its values");

    // Negative control: the counter is wired to the door the copy used to use.
    CjsSchema.getValues(source);
    assert.equal(exports, 1);
  }
  finally
  {
    CjsSchema.getValues = getValues;
  }

  assert.deepEqual(Array.from(target.position), [ 1, 2, 3 ]);
  assert.equal(target.count, 7);
  assert.equal(target.position, buffer, "the target's own array was replaced");
  assert.notEqual(target.position, source.position, "the copy aliased the source's array");
});

test("copy refuses a source that does not read as the target's class", () =>
{
  const target = new CopySourceModel();
  assert.throws(() => CjsSchema.copy(target, ValuesInputParent.from({ label: "x" })),
    /requires a CopySourceModel source/);
  assert.throws(() => CjsSchema.copy(target, { _type: "ValuesInputParent", count: 1 }),
    /cannot copy ValuesInputParent values into CopySourceModel/);

  // A subclass declares its parent's name, so it reads as the target's class.
  class CopySubModel extends CopySourceModel {}
  CjsSchema.define(CopySubModel, { className: "CopySubModel" });
  CjsSchema.copy(target, CopySubModel.from({ count: 3 }));
  assert.equal(target.count, 3);
});
