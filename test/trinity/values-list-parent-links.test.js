import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { EveChildContainer, EveShip2 } from "../../npm/dist/trinity/index.js";

test("values list refill detaches old children and registers replacements on the existing parent", () =>
{
  const ship = new EveShip2(), parent = new EveChildContainer(), old = new EveChildContainer();
  parent.SetOwner(ship);
  parent.objects.push(old);
  parent.RegisterChildren(parent.objects);
  const list = parent.objects;
  assert.equal(old.GetParent(), parent);
  assert.equal(old.GetOwner(), ship);

  assert.equal(CjsSchema.setValues(parent, {
    objects: [ { _type: "EveChildContainer", name: "replacement" } ]
  }, { returnBoolean: true }), true);
  assert.equal(parent.objects, list);
  assert.equal(old.GetParent(), null);
  assert.equal(old.GetOwner(), null);
  assert.equal(list[0].GetParent(), parent);
  assert.equal(list[0].GetOwner(), ship);
  assert.equal(list[0].name, "replacement");

  const replacement = list[0];
  assert.equal(CjsSchema.setValues(parent, { objects: [] }, { returnBoolean: true }), true);
  assert.equal(replacement.GetParent(), null);
  assert.equal(replacement.GetOwner(), null);
  assert.equal(parent.objects, list);
});

test("unresolved references leave the live child list and its links intact", () =>
{
  const parent = new EveChildContainer(), old = new EveChildContainer();
  parent.objects.push(old);
  parent.RegisterChildren(parent.objects);
  assert.throws(() => CjsSchema.setValues(parent, { objects: [ { _ref: "missing" } ] }), /Unresolved _ref/u);
  assert.deepEqual(parent.objects, [ old ]);
  assert.equal(old.GetParent(), parent);
});

test("unchanged live members do not detach and register again", () =>
{
  const parent = new EveChildContainer(), child = new EveChildContainer();
  parent.objects.push(child);
  parent.RegisterChildren(parent.objects);
  parent.OnListModified = () => { assert.fail("unchanged membership must not notify"); };
  assert.equal(CjsSchema.setValues(parent, { objects: [ child ] }, { returnBoolean: true }), false);
  assert.equal(child.GetParent(), parent);
});
