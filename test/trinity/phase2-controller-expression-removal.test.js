import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { Copier, DictReader, IInitialize, INotify } from "../../npm/dist/global/blue/index.js";
import { Traverse } from "../../npm/dist/global/blue/find.js";
import { GetResources } from "../../npm/dist/global/blue/getResources.js";
import { Tr2ControllerFloatVariable, Tr2ControllerExpression, Tr2BindingPoint, Tr2Controller, Tr2StateMachine } from "../../npm/dist/trinity/controllers/index.js";

test("float variable is a native Blue class while expression and binding are plain helpers", () =>
{
  assert.equal(Object.getPrototypeOf(Tr2ControllerFloatVariable.prototype), IInitialize.prototype);
  assert.deepEqual([...mappedInterfaces(Tr2ControllerFloatVariable)], [Tr2ControllerFloatVariable, IInitialize, INotify]);
  for (const Type of [Tr2ControllerExpression, Tr2BindingPoint])
  {
    assert.equal(Object.getPrototypeOf(Type.prototype), Object.prototype);
    assert.deepEqual([...mappedInterfaces(Type)], []);
  }
  for (const Type of [Tr2ControllerFloatVariable, Tr2ControllerExpression, Tr2BindingPoint])
    for (const method of ["SetValues", "UpdateValues", "OnEvent", "Traverse", "GetResources"])
      assert.equal(method in new Type(), false, Type.name + "." + method);
});

test("float declarations retain native member order and nonpersistent notified value", () =>
{
  const members = CjsSchema.getSchema(Tr2ControllerFloatVariable).members;
  assert.deepEqual(members.map(field => field.name), ["name", "variableType", "value", "defaultValue", "enumValues"]);
  const value = members[2];
  assert.equal(value.type.kind, "float32");
  assert.equal(value.edit.notify, true);
  assert.notEqual(value.edit.persist, true);
  for (const field of members.filter(field => field.name !== "value")) assert.equal(field.edit.persist, true);
  const binding = CjsSchema.getSchema(Tr2BindingPoint).members;
  for (const name of ["resolvedObject", "notifyPtr"])
  {
    const field = binding.find(field => field.name === name);
    assert.equal(field.type.kind, "weakRef");
    assert.notEqual(field.edit?.persist, true);
  }
});

test("native Initialize changes value silently while equal SetValue writes publish and dirty", () =>
{
  const variable = new Tr2ControllerFloatVariable(), calls = [], dirty = { value: 0n };
  variable.SetDestinationBuffer(value => calls.push(value));
  variable.SetDirtyMask(dirty, 1n << 63n);
  calls.length = 0;
  variable.defaultValue = 7;
  assert.equal(variable.Initialize(), true);
  assert.equal(variable.GetValue(), 7);
  assert.deepEqual(calls, []);
  assert.equal(dirty.value, 0n);
  variable.SetValue(7);
  assert.deepEqual(calls, [7]);
  assert.equal(dirty.value, 1n << 63n);
  dirty.value = 0n;
  variable.SetValue(7);
  assert.deepEqual(calls, [7, 7]);
  assert.equal(dirty.value, 1n << 63n);
});

test("declared reader and Copier initialize authored defaults without copying destination ownership", () =>
{
  const source = new DictReader({ declarations: true }).CreateObject({ _type: "Tr2ControllerFloatVariable", name: "speed", defaultValue: 4 });
  assert.equal(source.value, 4);
  const old = new Float32Array(1), dirty = { value: 0n };
  source.SetDestinationBuffer(old);
  source.SetDirtyMask(dirty, 8n);
  source.SetValue(19);
  const copy = new Copier().CopyTo(source);
  assert.ok(copy);
  assert.equal(copy.name, "speed");
  assert.equal(copy.value, 4, "runtime value is reconstructed from the authored default");
  assert.equal(copy._destination, null);
  assert.equal(copy._dirtyMaskDestination, null);
  copy.SetValue(20);
  assert.equal(old[0], 19);
});

test("plain binding equal writes reach real FloatVariable OnModified and controller buffer", () =>
{
  const variable = new Tr2ControllerFloatVariable(), controller = new Tr2Controller();
  variable.name = "amount";
  variable.defaultValue = 3;
  variable.Initialize();
  controller.variables.Append(variable);
  controller.Link({});
  const binding = new Tr2BindingPoint();
  assert.equal(binding.SetDestination(variable, "value"), true);
  const dirty = { value: 0n };
  variable.SetDirtyMask(dirty, 16n);
  let notified = 0;
  const original = variable.OnModified;
  variable.OnModified = function(name) { notified++; return original.call(this, name); };
  assert.equal(binding.SetValue(3), false);
  assert.equal(notified, 1);
  assert.equal(controller.GetVariableBuffer()[0], 3);
  assert.equal(dirty.value, 16n);
  assert.equal(binding.SetValue(8), true);
  assert.equal(controller.GetVariableBuffer()[0], 8);
  controller.Unlink();
});

test("binding copy keeps authored graph identity and leaves resolved state unlinked", () =>
{
  const source = new Tr2BindingPoint(), target = new Tr2ControllerFloatVariable();
  target.defaultValue = 5;
  target.Initialize();
  source.object = target;
  source.attribute = "value";
  assert.equal(source.Link(), true);
  const copy = new Copier().CopyTo(source);
  assert.ok(copy);
  assert.equal(copy.attribute, "value");
  assert.notEqual(copy.object, target);
  assert.equal(copy.object.value, 5);
  assert.equal(copy.IsValid(), false);
  assert.equal(copy.resolvedObject, null);
  const seen = [];
  Traverse(copy, value => seen.push(value));
  assert.equal(seen.includes(copy.object), true);
  assert.deepEqual(GetResources(copy), []);
  assert.equal(copy.Link(), true);
  assert.equal(copy.GetValue(), 5);
});

test("real controller and state-machine overloads preserve expression execution and dirty mask", () =>
{
  const controller = new Tr2Controller(), variable = new Tr2ControllerFloatVariable();
  variable.name = "speed";
  variable.defaultValue = 5;
  variable.Initialize();
  controller.variables.Append(variable);
  controller.Link({});
  const expression = new Tr2ControllerExpression();
  assert.equal(expression.SetExpr("speed + 2", controller), "");
  assert.equal(expression.GetVariableMask(), 1n);
  assert.deepEqual(expression.Eval(), [true, 7]);
  variable.SetValue(8);
  assert.deepEqual(expression.Eval(), [true, 10]);
  const machine = new Tr2StateMachine();
  machine.Link(controller);
  assert.equal(expression.SetExpr("speed + 1", machine), "");
  assert.equal(expression.stateMachine, machine);
  assert.equal(expression.controller, controller);
  assert.deepEqual(expression.Eval(), [true, 9]);
  machine.Unlink();
  controller.Unlink();
});

test("nominal overload selection ignores a coincidental GetController method", () =>
{
  const controller = new Tr2Controller();
  controller.GetController = () => { assert.fail("coincidental method is not a state-machine overload"); };
  const expression = new Tr2ControllerExpression();
  assert.equal(expression.SetExpr("1", controller), "");
  assert.equal(expression.stateMachine, null);
  assert.equal(expression.controller, controller);
});

test("expression fails when an installed controller lacks its required variable-view method", () =>
{
  const controller = new Tr2Controller();
  controller.GetVariableView = undefined;
  assert.throws(() => new Tr2ControllerExpression().SetExpr("1", controller), TypeError);
});

test("controller binding roots require both native owner methods without method fallbacks", () =>
{
  const binding = new Tr2BindingPoint();
  binding.path = "Owner";
  binding.attribute = "value";
  assert.throws(() => binding.Link({ GetOwner() { return { value: 1 }; } }), TypeError);
  assert.throws(() => binding.Link({ GetBindingPathRoots() { return []; } }), TypeError);
  assert.equal(binding.Link({ Owner: { value: 4 } }), true, "existing named-root-map adapter remains supported");
  assert.equal(binding.GetValue(), 4);
});
