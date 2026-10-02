import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { DictReader, DictWriter, Copier } from "../../npm/dist/global/blue/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { TriRect } from "../../npm/dist/trinity/core/view/TriRect.js";
import { TriViewport, Vec3TransformByViewport } from "../../npm/dist/trinity/core/view/TriViewport.js";
import { TriStepSetViewport } from "../../npm/dist/trinity/renderJob/step/TriStepSetViewport.js";

for (const [Type, className, values, query] of [
  [TriRect, "TriRect", {left: -10, top: 20, right: 60, bottom: 90}, []],
  [TriViewport, "TriViewport", {x: -10, y: 20, width: 640, height: 480, minZ: 0.25, maxZ: 0.75}, [TriViewport]]
]) test(`${Type.name} uses declared storage and supported queries without model services`, () =>
{
  const instance = new Type();
  assert.equal(Object.getPrototypeOf(Type.prototype), Object.prototype);
  assert.equal("GetValues" in instance, false);
  assert.deepEqual([...mappedInterfaces(Type)], query);
  assert.equal(Type.from, undefined);
  for (const key of ["GetValues", "SetValues", "UpdateValues", "Dispose"]) assert.equal(instance[key], undefined);
  const fields = CjsSchema.getSchema(Type).members;
  assert.deepEqual(fields.map(f => f.name), Object.keys(values));
  for (const field of fields)
  {
    assert.equal(field.edit.read, true);
    assert.equal(field.edit.write, true);
    assert.equal(field.edit.persist, true);
    assert.notEqual(field.edit.notify, true);
    assert.equal(field.type.kind, ["minZ", "maxZ"].includes(field.name) ? "float32" : "int32");
  }
  const created = new DictReader({declarations: true}).CreateObject({_type: className, ...values});
  const clone = new Copier().CloneTo(created);
  assert.ok(clone instanceof Type);
  assert.notEqual(clone, created);
  const written = new DictWriter().WriteObject(clone, {}, {persistOnly: true});
  for (const [key, value] of Object.entries(values)) assert.equal(written[key], value);
});

test("rectangle exposed optional-argument adapters preserve untouched edges", () =>
{
  const rect = new TriRect();
  assert.deepEqual([rect.left, rect.top, rect.right, rect.bottom], [0, 0, 0, 0]);
  rect.__init__(-10, 20, 60, 90);
  rect.SetRect(undefined, 25, -5);
  assert.deepEqual([rect.left, rect.top, rect.right, rect.bottom], [-10, 25, -5, 90]);
  rect.SetRect();
  assert.equal(rect.bottom, 90);
  rect.__init__();
  assert.deepEqual([rect.left, rect.top, rect.right, rect.bottom], [0, 0, 0, 0]);
  assert.equal(mappedInterfaces(TriRect).has(TriRect), false);
});

test("viewport adapters retain defaults, signed window coordinates and unguarded division", () =>
{
  const viewport = new TriViewport();
  assert.deepEqual([viewport.x, viewport.y, viewport.width, viewport.height, viewport.minZ, viewport.maxZ], [0, 0, 1, 1, 0, 1]);
  viewport.__init__(-100, -50, 200, 100, 0.25, 0.75);
  assert.equal(viewport.GetAspectRatio(), 2);
  const point = new Float32Array([1, -1, 0.5]);
  assert.equal(Vec3TransformByViewport(point, viewport), point);
  assert.deepEqual(Array.from(point), [100, 50, 0.5]);
  viewport.__init__(0, 0, 3, 0);
  assert.equal(viewport.GetAspectRatio(), Infinity);
  viewport.width = 0;
  assert.ok(Number.isNaN(viewport.GetAspectRatio()));
  viewport.__init__();
  assert.equal(viewport.maxZ, 1);
  assert.equal(viewport.GetAspectRatio(), 1);
});

test("existing viewport step preserves identity through the plain child and legacy owner graph", () =>
{
  const viewport = new TriViewport(), step = new TriStepSetViewport(), calls = [];
  step.__init__(viewport);
  const context = {GetEffectStateManager() { return {SetViewport(value) { calls.push(value); }}; }, SetFullScreenViewport() {calls.push(null);}};
  step.Execute(0, 0, context);
  assert.equal(calls[0], viewport);
  const clone = new Copier().CloneTo(step);
  assert.ok(clone.viewport instanceof TriViewport);
  assert.notEqual(clone.viewport, viewport);
  step.SetViewport(null);
  step.Execute(0, 0, context);
  assert.equal(calls[1], null);
});
