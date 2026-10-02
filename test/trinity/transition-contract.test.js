import assert from "node:assert/strict";
import test from "node:test";
import { Copier } from "../../npm/dist/global/blue/Copier.js";
import { DictReader } from "../../npm/dist/global/blue/DictReader.js";
import { DictWriter } from "../../npm/dist/global/blue/DictWriter.js";
import { INotify } from "../../npm/dist/global/blue/INotify.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { ExecuteMainThreadActions } from "../../npm/dist/trinity/core/continueOnMainThread.js";
import { Tr2Controller } from "../../npm/dist/trinity/controllers/Tr2Controller.js";
import { Tr2ControllerFloatVariable } from "../../npm/dist/trinity/controllers/expression/Tr2ControllerFloatVariable.js";
import { Tr2StateMachine } from "../../npm/dist/trinity/controllers/state/Tr2StateMachine.js";
import { Tr2StateMachineState } from "../../npm/dist/trinity/controllers/state/Tr2StateMachineState.js";
import { Tr2StateMachineTransition } from "../../npm/dist/trinity/controllers/state/Tr2StateMachineTransition.js";

const Type = Tr2StateMachineTransition;

function State(name)
{
  const state = new Tr2StateMachineState();
  state.name = name;
  return state;
}

/** Real linked classes expose notification effects without replacing the evaluator. */
function LinkedTransition(t)
{
  const controller = new Tr2Controller();
  for (const name of ["alpha", "beta"])
  {
    const variable = new Tr2ControllerFloatVariable();
    variable.name = name;
    variable.defaultValue = 1;
    variable.Initialize();
    assert.equal(controller.variables.Append(variable), true);
  }
  controller.Link({});
  const source = State("source"), first = State("first"), second = State("second");
  const machine = new Tr2StateMachine();
  for (const state of [source, first, second]) assert.equal(machine.states.Append(state), true);
  machine.Link(controller);
  t.after(() => { machine.Unlink(); controller.Unlink(); ExecuteMainThreadActions(); });
  const transition = new Type();
  transition.name = "first";
  transition.condition = "alpha > 0";
  assert.equal(source.transitions.Append(transition), true);
  assert.equal(transition.GetSource(), source);
  assert.equal(transition.GetDestination(), first);
  assert.equal(source._transitionVariableMask, 1n);
  return { controller, machine, source, first, second, transition };
}

/** Record the concrete OnModified result without invoking a lazy getter. */
function ObserveNotifications(transition, source)
{
  const calls = [], original = transition.OnModified;
  transition.OnModified = function(name)
  {
    const result = original.call(this, name);
    calls.push({ receiver: this, name, destination: this._destination, condition: this.condition,
      programSource: this._programSource, mask: source._transitionVariableMask, source: this._source });
    return result;
  };
  return calls;
}

test("model-free Transition retains its exact query contract and native stored-member/property declarations", () =>
{
  const transition = new Type(), schema = CjsSchema.getSchema(Type);
  assert.deepEqual([...mappedInterfaces(Type)], [Type, INotify]);
  assert.equal(CjsSchema.cast(transition, INotify), transition);
  assert.equal("GetValues" in transition, false);
  assert.equal(Object.getPrototypeOf(Type.prototype), Object.prototype);
  for (const name of ["GetValues", "SetValues", "UpdateValues"]) assert.equal(transition[name], undefined);
  assert.equal(Type.from, undefined);
  const members = schema.members.filter(field => field.declaringClass === Type);
  const properties = schema.properties.filter(field => field.declaringClass === Type);
  assert.deepEqual(members.map(field => field.name), ["name", "condition"]);
  assert.deepEqual(properties.map(field => field.name), ["isConditionValid"]);
  for (const member of members)
  {
    assert.equal(member.role, "member");
    assert.equal(member.type.kind, "string");
    for (const flag of ["read", "write", "persist", "notify"]) assert.equal(member.edit[flag], true);
    assert.equal(transition[member.name], "");
  }
  const property = properties[0];
  assert.equal(property.role, "property");
  assert.equal(property.key, "isConditionValid");
  assert.equal(property.type.kind, "boolean");
  assert.equal(property.edit.read, true);
  for (const flag of ["write", "persist", "persistOnly", "rpersist", "notify"])
    assert.notEqual(property.edit[flag], true, flag);
  assert.equal(CjsSchema.isFieldWritable(property), false);
  assert.equal(CjsSchema.isFieldExported(property), true);
  assert.equal(CjsSchema.isFieldExported(property, { persistOnly: true }), false);
  assert.equal(CjsSchema.isFieldExported(property, { roundTrip: true }), false);
  assert.equal(property.impl.status, "adapted");
});

test("isConditionValid is a live getter delegating to the retained lazy JS validity method", () =>
{
  const descriptor = Object.getOwnPropertyDescriptor(Type.prototype, "isConditionValid");
  assert.equal(typeof descriptor?.get, "function");
  assert.equal(descriptor.set, undefined);
  const transition = new Type(), original = transition.IsConditionValid;
  let calls = 0;
  transition.IsConditionValid = function() { calls++; return original.call(this); };
  assert.equal(transition._program, null);
  assert.equal(transition.GetSource(), null);
  transition.condition = "1";
  assert.equal(transition._program, null, "direct assignment retains the existing lazy compilation");
  assert.equal(transition.isConditionValid, true);
  assert.equal(calls, 1);
  const validProgram = transition._program;
  assert.notEqual(validProgram, null);
  transition.condition = "(";
  assert.equal(transition._program, validProgram, "assignment alone does not eagerly recompile");
  assert.equal(transition.isConditionValid, false);
  assert.equal(calls, 2);
  assert.notEqual(transition._program, validProgram);
  transition.condition = "   ";
  assert.equal(transition.isConditionValid, false);
  transition.condition = "2 > 1";
  assert.equal(transition.isConditionValid, true);
  assert.equal(calls, 4);
  assert.equal(Object.hasOwn(transition, "isConditionValid"), false);
  // This qualifies the existing lazy JS behavior, not native eager Link.SetExpr.
});

test("IsExpressionValid accepts its ignored attribute argument and retains no-argument calls", () =>
{
  const transition = new Type();
  assert.equal(Type.prototype.IsExpressionValid.length, 1);
  const ignored = { toString() { assert.fail("attribute argument must not be read or coerced"); } };
  for (const [condition, expected] of [["1", true], ["(", false], ["", false]])
  {
    transition.condition = condition;
    assert.equal(transition.IsExpressionValid(), expected);
    assert.equal(transition.IsExpressionValid("condition"), expected);
    assert.equal(transition.IsExpressionValid(ignored), expected);
  }
});

test("the READ-only property has no assignment route and dictionary input skips it before destination access", () =>
{
  const transition = new Type();
  transition.condition = "1";
  assert.equal(Reflect.set(transition, "isConditionValid", false), false);
  assert.throws(() => { transition.isConditionValid = false; }, TypeError);
  assert.equal(Object.hasOwn(transition, "isConditionValid"), false);
  let destinationReads = 0, notifications = 0;
  Object.defineProperty(transition, "isConditionValid", {
    configurable: true,
    get() { destinationReads++; throw new Error("READ-only destination getter must not run during input"); }
  });
  transition.OnModified = () => { notifications++; throw new Error("READ-only input must not notify"); };
  const changed = new DictReader({ declarations: true }).ReadInto(transition, { isConditionValid: false }, transition);
  assert.deepEqual([...changed], []);
  assert.equal(destinationReads, 0);
  assert.equal(notifications, 0);
  assert.equal(transition.condition, "1");
  assert.equal(transition._program, null);
  const created = new DictReader({ declarations: true }).CreateObject({ name: "from", condition: "1", isConditionValid: false }, Type);
  assert.equal(created.name, "from");
  assert.equal(created.isConditionValid, true, "the input cannot override the computed result");
  assert.equal(Object.hasOwn(created, "isConditionValid"), false);
});

test("unrestricted values include the current readable computed bool after the stored declarations", () =>
{
  const transition = new Type();
  transition.name = "values";
  transition.condition = "1";
  assert.equal(transition._program, null);
  const values = new DictWriter().WriteObject(transition);
  assert.equal(Object.hasOwn(values, "isConditionValid"), true);
  assert.equal(values.name, "values");
  assert.equal(values.condition, "1");
  assert.equal(values.isConditionValid, true);
  assert.deepEqual(Object.keys(values).filter(name => ["name", "condition", "isConditionValid"].includes(name)),
    ["name", "condition", "isConditionValid"]);
  assert.notEqual(transition._program, null, "unrestricted output invokes the current lazy getter");
  transition.condition = "(";
  assert.equal(new DictWriter().WriteObject(transition).isConditionValid, false);
});

test("persistOnly and roundTrip values omit the computed property before reading its getter", () =>
{
  const transition = new Type();
  transition.name = "persisted";
  transition.condition = "1";
  let reads = 0;
  Object.defineProperty(transition, "isConditionValid", {
    get() { reads++; throw new Error("filtered property getter must not run"); }
  });
  for (const options of [{ persistOnly: true }, { roundTrip: true }])
  {
    const values = new DictWriter().WriteObject(transition, {}, options);
    assert.equal(values.name, "persisted");
    assert.equal(values.condition, "1");
    assert.equal(Object.hasOwn(values, "isConditionValid"), false);
  }
  assert.equal(reads, 0);
  assert.equal(transition._program, null);
});

test("Copier copies the two stored values without reading or writing live validity properties", () =>
{
  const source = new Type(), destination = new Type();
  source.name = "copy";
  source.condition = "1";
  destination.name = "old";
  destination.condition = "2";
  let reads = 0, writes = 0;
  for (const object of [source, destination]) Object.defineProperty(object, "isConditionValid", {
    get() { reads++; throw new Error("Copier must not read a live property"); },
    set() { writes++; throw new Error("Copier must not write a live property"); }
  });
  assert.equal(new Copier().CopyTo(source, destination), destination);
  assert.equal(destination.name, "copy");
  assert.equal(destination.condition, "1");
  assert.equal(reads, 0);
  assert.equal(writes, 0);
  assert.equal(source._program, null);
  assert.equal(destination._program, null);
});

test("linked Copier notifies name before condition and leaves destination, source and program consistent", t =>
{
  const { source, first, second, transition } = LinkedTransition(t);
  const originalProgram = transition._program;
  const edited = new Type();
  edited.name = "second";
  edited.condition = "beta > 0";
  const calls = ObserveNotifications(transition, source);
  assert.equal(new Copier().CopyTo(edited, transition), transition);
  assert.deepEqual(calls.map(call => call.name), ["name", "condition"]);
  for (const call of calls)
  {
    assert.equal(call.receiver, transition);
    assert.equal(call.source, source);
  }
  assert.equal(calls[0].destination, second);
  assert.notEqual(calls[0].destination, first);
  assert.equal(calls[0].condition, "alpha > 0");
  assert.equal(calls[0].programSource, "alpha > 0");
  assert.equal(calls[0].mask, 1n);
  assert.equal(calls[1].destination, second);
  assert.equal(calls[1].condition, "beta > 0");
  assert.equal(calls[1].programSource, "beta > 0");
  assert.equal(calls[1].mask, 2n);
  assert.notEqual(transition._program, originalProgram);
  assert.equal(transition.GetDestination(), second);
  assert.equal(transition.GetSource(), source);
  assert.equal(source._transitionVariableMask, 2n);
  assert.equal(transition.CanActivate(2n), true);
  assert.equal(transition.CanActivate(1n), false);
  assert.equal(edited.GetSource(), null);
  assert.equal(edited._program, null);
});

test("explicit DictReader notifications preserve input order independently of declaration order", t =>
{
  const { source, first, second, transition } = LinkedTransition(t);
  const calls = ObserveNotifications(transition, source);
  // ReadInto receives its notification target explicitly and walks input keys.
  const changed = new DictReader({ declarations: true }).ReadInto(transition, { condition: "beta > 0", name: "second" }, transition);
  assert.deepEqual([...changed], ["condition", "name"]);
  assert.deepEqual(calls.map(call => call.name), ["condition", "name"]);
  for (const call of calls)
  {
    assert.equal(call.receiver, transition);
    assert.equal(call.source, source);
  }
  assert.equal(calls[0].destination, first);
  assert.equal(calls[0].programSource, "beta > 0");
  assert.equal(calls[0].mask, 2n);
  assert.equal(calls[1].destination, second);
  assert.equal(calls[1].programSource, "beta > 0");
  assert.equal(calls[1].mask, 2n);
  assert.equal(transition.GetDestination(), second);
  assert.equal(transition.GetSource(), source);
});

test("metadata distinguishes custom JS helpers from renamed native UpdateDestination", () =>
{
  for (const name of ["Compile", "GetVariableNames", "GetFunctionNames", "_getExpressionContext", "_dirtyMaskMatches"])
  {
    const method = CjsSchema.getMethod(Type, name);
    assert.equal(method?.impl?.status, "custom", name);
    assert.equal(method.carbon?.method, undefined, name);
  }
  const update = CjsSchema.getMethod(Type, "_updateDestination");
  assert.equal(update.carbon.method, true);
  assert.equal(update.carbon.originalName, "UpdateDestination");
  assert.equal(update.impl.status, "adapted");
  assert.equal(CjsSchema.getMethod(Type, "GetState").carbon.method, true);
  const transition = new Type(), source = State("source");
  transition.Link(source);
  assert.equal(transition.GetState(), source);
  assert.equal(transition.GetSource(), source);
});

test("present malformed sources cannot silently omit required GetStateMachine calls", t =>
{
  const { source, transition } = LinkedTransition(t);
  source.GetStateMachine = undefined;
  for (const [method, args] of [["CanActivate", [1n]], ["GetVariableMask", []],
    ["EvaluateExpression", ["1"]], ["GetExpressionTermInfo", []]])
  {
    assert.throws(() => transition[method](...args), { name: "TypeError", message: /GetStateMachine/ }, method);
  }
});

test("a present controller must provide GetVariableView for transition masks", t =>
{
  const { controller, transition } = LinkedTransition(t);
  controller.GetVariableView = undefined;
  assert.throws(() => transition.GetVariableMask(), { name: "TypeError", message: /GetVariableView/ });
});

test("a present controller must provide GetExpressionTermInfo for transition term queries", t =>
{
  const { controller, transition } = LinkedTransition(t);
  controller.GetExpressionTermInfo = undefined;
  assert.throws(() => transition.GetExpressionTermInfo(), { name: "TypeError", message: /GetExpressionTermInfo/ });
});

test("null source, machine and controller retain the established JS inspection paths", t =>
{
  const transition = new Type();
  transition.condition = "1";
  assert.equal(transition.CanActivate(), false);
  assert.equal(transition.GetVariableMask(), 0n);
  assert.equal(transition.EvaluateExpression("2 + 3"), 5);
  assert.ok(Array.isArray(transition.GetExpressionTermInfo()));
  const source = State("source");
  transition.Link(source);
  assert.equal(transition.GetSource(), source);
  assert.equal(transition.GetDestination(), null);
  assert.equal(source.GetStateMachine(), null);
  assert.equal(transition.GetVariableMask(), 0n);
  assert.equal(transition.CanActivate(), true, "the current JS constant evaluator can inspect a source without a machine");
  assert.ok(Array.isArray(transition.GetExpressionTermInfo()));
  const machine = new Tr2StateMachine(), destination = State("target");
  machine.states.Append(source);
  machine.states.Append(destination);
  source.Link(machine);
  transition.name = "target";
  transition.Link(source);
  t.after(() => { transition.Unlink(); source.Unlink(); ExecuteMainThreadActions(); });
  assert.equal(machine.GetController(), null);
  assert.equal(transition.GetDestination(), destination);
  assert.equal(transition.GetVariableMask(), 0n);
  assert.equal(transition.CanActivate(), true);
  assert.equal(transition.EvaluateExpression("2 + 3"), 5);
  assert.ok(Array.isArray(transition.GetExpressionTermInfo()));
  transition.Unlink();
  assert.equal(transition.GetSource(), null);
  assert.equal(transition.GetDestination(), null);
  assert.equal(transition.CanActivate(), false);
});

test("the optional JS expression-context helper retains delegation and its fallback record", () =>
{
  const transition = new Type(), controller = new Tr2Controller(), machine = new Tr2StateMachine(), owner = {};
  const delegated = transition._getExpressionContext(controller, owner, machine);
  assert.equal(delegated.controller, controller);
  assert.equal(delegated.owner, owner);
  assert.equal(delegated.stateMachine, machine);
  controller.GetExpressionContext = undefined;
  const fallback = transition._getExpressionContext(controller, owner, machine);
  assert.equal(fallback.controller, controller);
  assert.equal(fallback.owner, owner);
  assert.equal(fallback.stateMachine, machine);
  const unlinked = transition._getExpressionContext(null, null, null);
  assert.equal(unlinked.controller, undefined);
  assert.equal(unlinked.owner, undefined);
  assert.equal(unlinked.stateMachine, null);
});
