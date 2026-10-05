import test from "node:test";
import assert from "node:assert/strict";
import { EveEllipseDefinition, EveEllipseSet } from "../../npm/dist/trinity/index.js";

test("clearing ellipses requires every definition's dirty-flag method", () =>
{
  const set = new EveEllipseSet();
  const ellipse = new EveEllipseDefinition();
  ellipse.SetDirtyFlag = undefined;
  set.ellipses.push(ellipse);
  assert.throws(() => set.ClearEllipses(), /SetDirtyFlag/);
  assert.equal(set.ellipses.length, 1);
});

test("clearing ellipses rejects a missing definition", () =>
{
  const set = new EveEllipseSet();
  set.ellipses.push(null);
  assert.throws(() => set.ClearEllipses(), TypeError);
});

test("clearing ellipses disconnects dirty callbacks and empties the set", () =>
{
  const set = new EveEllipseSet();
  const ellipse = new EveEllipseDefinition();
  let changes = 0;
  ellipse.SetDirtyFlag(() => changes++);
  set.ellipses.push(ellipse);
  ellipse.OnModified();
  assert.equal(changes, 1);
  set.ClearEllipses();
  ellipse.OnModified();
  assert.equal(changes, 1);
  assert.equal(set.ellipses.length, 0);
  assert.doesNotThrow(() => set.ClearEllipses());
});
