import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { Copier } from "../../npm/dist/global/blue/Copier.js";
import { DictReader } from "../../npm/dist/global/blue/DictReader.js";
import { DictWriter } from "../../npm/dist/global/blue/DictWriter.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { CjsModel } from "../../npm/dist/global/model/CjsModel.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { ExecuteMainThreadActions } from "../../npm/dist/trinity/core/continueOnMainThread.js";
import { Tr2GrannyAnimation } from "../../npm/dist/trinity/core/animation/Tr2GrannyAnimation.js";
import { Tr2GrannyAnimationLayer } from "../../npm/dist/trinity/core/animation/Tr2GrannyAnimationLayer.js";
import { Tr2Controller } from "../../npm/dist/trinity/controllers/Tr2Controller.js";
import { Tr2ControllerFloatVariable } from "../../npm/dist/trinity/controllers/expression/Tr2ControllerFloatVariable.js";
import { Tr2SyncToAnimation } from "../../npm/dist/trinity/controllers/Tr2SyncToAnimation.js";
import { ITr2StateMachineStateFinalizer } from "../../npm/dist/trinity/controllers/state/ITr2StateMachineStateFinalizer.js";
import { Tr2StateMachine } from "../../npm/dist/trinity/controllers/state/Tr2StateMachine.js";
import { Tr2StateMachineState } from "../../npm/dist/trinity/controllers/state/Tr2StateMachineState.js";
import { Tr2StateMachineTransition } from "../../npm/dist/trinity/controllers/state/Tr2StateMachineTransition.js";
import { EveSpaceObject2 } from "../../npm/dist/trinity/eve/spaceObject/EveSpaceObject2.js";

const Type = Tr2SyncToAnimation;

/** Synthetic one-bone, two-second animation, as used by granny-animation-layer.test.js. */
function CreateAnimation()
{
  const animation = new Tr2GrannyAnimation();
  animation.model_ = "Ship";
  animation.SetGrannyResource({
    models: [{
      name: "Ship",
      skeleton: { bones: [{ name: "Root", parentIndex: -1, position: [0, 0, 0],
        orientation: [0, 0, 0, 1], scaleShear: [1, 0, 0, 0, 1, 0, 0, 0, 1] }] },
      meshBindings: [0]
    }],
    meshes: [{ boneBindings: [{ name: "Root" }] }],
    animations: [{ name: "Move", duration: 2, trackGroups: [{ name: "Ship", transformTracks: [{
      name: "Root", position: { knots: [0, 2], controls: [0, 0, 0, 10, 0, 0], dimension: 3, degree: 1 }
    }] }] }]
  });
  return animation;
}

function State(name)
{
  const state = new Tr2StateMachineState();
  state.name = name;
  return state;
}

/** Observe the actual implementation, including its return value, and restore it. */
function Observe(t, object, method)
{
  const descriptor = Object.getOwnPropertyDescriptor(object, method), original = object[method], calls = [];
  Object.defineProperty(object, method, {
    configurable: true, writable: true,
    value(...args)
    {
      const result = Reflect.apply(original, this, args);
      calls.push({ receiver: this, args, result });
      return result;
    }
  });
  t.after(() =>
  {
    if (descriptor) Object.defineProperty(object, method, descriptor);
    else delete object[method];
  });
  return calls;
}

test("Sync exposes exactly its concrete and finalizer query identities in native order", () =>
{
  assert.deepEqual([...mappedInterfaces(Type)], [Type, ITr2StateMachineStateFinalizer]);
});

test("Sync is model-free with nominal finalizer composition, native empty defaults and its authored mask", () =>
{
  const finalizer = new Type(), controller = new Tr2Controller();
  assert.equal(CjsSchema.cast(finalizer, Type), finalizer);
  assert.equal(CjsSchema.cast(finalizer, ITr2StateMachineStateFinalizer), finalizer);
  assert.equal(CjsSchema.cast(finalizer, CjsModel), null);
  assert.equal(Object.getPrototypeOf(Type.prototype), Object.prototype);
  assert.equal(Type.from, undefined);
  assert.equal(finalizer.GetValues, undefined);
  assert.equal(finalizer.SetValues, undefined);
  assert.equal(finalizer.Link, ITr2StateMachineStateFinalizer.prototype.Link);
  assert.equal(finalizer.Unlink, ITr2StateMachineStateFinalizer.prototype.Unlink);
  assert.equal(finalizer.Link(controller), undefined);
  assert.equal(finalizer.Unlink(), undefined);
  assert.equal(finalizer.mask, "");
  const members = CjsSchema.getSchema(Type).members.filter(field => field.declaringClass === Type);
  assert.deepEqual(members.map(field => field.name), ["mask"]);
  assert.equal(members[0].type.kind, "string");
  for (const flag of ["read", "write", "persist"]) assert.equal(members[0].edit[flag], true);
  assert.notEqual(members[0].edit.notify, true);
  assert.equal(Object.hasOwn(Type.prototype, "CanTransition"), true);
  assert.notEqual(Type.prototype.CanTransition, ITr2StateMachineStateFinalizer.prototype.CanTransition);
  assert.equal(CjsSchema.getMethod(Type, "CanTransition").impl.status, "adapted");
});

test("Sync null-chain exposure excludes a temporary CjsModel parent mapping in a fresh process", () =>
{
  const moduleURL = path => new URL(`../../npm/dist/${path}`, import.meta.url).href;
  execFileSync(process.execPath, [
    ...process.execArgv, "--input-type=module", "--eval", `
      import assert from "node:assert/strict";
      import { carbon, CjsSchema } from ${JSON.stringify(moduleURL("global/schema/index.js"))};
      import { mappedInterfaces } from ${JSON.stringify(moduleURL("global/compose/interface.js"))};
      import { CjsModel } from ${JSON.stringify(moduleURL("global/model/CjsModel.js"))};
      import { ITr2StateMachineStateFinalizer } from ${JSON.stringify(moduleURL("trinity/controllers/state/ITr2StateMachineStateFinalizer.js"))};
      class ParentOnlyInterface {}
      carbon.mapInterface(ParentOnlyInterface)(CjsModel);
      assert.equal(mappedInterfaces(CjsModel).has(ParentOnlyInterface), true);
      const { Tr2SyncToAnimation } = await import(${JSON.stringify(moduleURL("trinity/controllers/Tr2SyncToAnimation.js"))});
      assert.deepEqual([...mappedInterfaces(Tr2SyncToAnimation)], [Tr2SyncToAnimation, ITr2StateMachineStateFinalizer]);
      assert.equal(mappedInterfaces(Tr2SyncToAnimation).has(ParentOnlyInterface), false);
      const finalizer = new Tr2SyncToAnimation();
      assert.equal(Object.getPrototypeOf(Tr2SyncToAnimation.prototype), Object.prototype);
      assert.equal(CjsSchema.cast(finalizer, CjsModel), null);
      assert.equal(CjsSchema.cast(finalizer, ITr2StateMachineStateFinalizer), finalizer);
    `
  ], { encoding: "utf8", timeout: 30000, windowsHide: true });
});

test("the real Sync finalizer gates and releases a real controller State through an EveSpaceObject2 animation layer", t =>
{
  const owner = new EveSpaceObject2(), animation = CreateAnimation(), finalizer = new Type();
  owner.animationUpdater = animation;
  const controller = new Tr2Controller(), machine = new Tr2StateMachine();
  controller.updateThrottle = false;
  const gate = new Tr2ControllerFloatVariable();
  gate.name = "gate";
  gate.defaultValue = 0;
  gate.Initialize();
  assert.equal(controller.variables.Append(gate), true);
  const source = State("source"), destination = State("destination");
  source.finalizer = finalizer; // A scalar reference; this is not a query-admission operation.
  const transition = new Tr2StateMachineTransition();
  transition.name = "destination";
  transition.condition = "gate > 0";
  assert.equal(source.transitions.Append(transition), true);
  assert.equal(machine.states.Append(source), true);
  assert.equal(machine.states.Append(destination), true);
  machine.startState = source;
  assert.equal(controller.stateMachines.Append(machine), true);
  const links = Observe(t, finalizer, "Link"), unlinks = Observe(t, finalizer, "Unlink");
  const completion = Observe(t, finalizer, "CanTransition");
  controller.Link(owner);
  t.after(() => { controller.Unlink(); ExecuteMainThreadActions(); });
  assert.equal(controller.GetOwner(), owner);
  assert.equal(owner.GetAnimationController(), animation);
  assert.equal(machine.GetController(), controller);
  assert.equal(source.GetStateMachine(), machine);
  assert.equal(source.finalizer, finalizer);
  assert.equal(links.length, 1);
  assert.equal(links[0].receiver, finalizer);
  assert.equal(links[0].args[0], controller);
  assert.equal(links[0].result, undefined);
  animation.PlayAnimation("Move", true, 1, 0, 1, false);
  animation.Update(1);
  const layer = animation.GetAnimationLayer(null);
  assert.ok(layer instanceof Tr2GrannyAnimationLayer);
  assert.equal(layer.GetAnimationRemainingTime(), 1);
  controller.Start();
  assert.equal(machine.currentState, source);
  assert.equal(completion.length, 0, "the closed gate has not requested completion");
  controller.SetVariable("gate", 1);
  controller.Update(0.1);
  assert.equal(machine.currentState, source);
  assert.equal(source._isFinalizing, true);
  assert.equal(completion.length, 1);
  assert.equal(completion[0].receiver, finalizer);
  assert.equal(completion[0].args[0], controller);
  assert.equal(completion[0].result, false);
  ExecuteMainThreadActions();
  animation.Update(1.5);
  assert.equal(layer.GetAnimationRemainingTime(), 0);
  controller.Update(0.1);
  assert.equal(machine.currentState, destination);
  assert.equal(destination.GetStateMachine(), machine);
  assert.equal(destination._isActive, true);
  assert.equal(completion.length, 2);
  assert.equal(completion[1].receiver, finalizer);
  assert.equal(completion[1].args[0], controller);
  assert.equal(completion[1].result, true);
  ExecuteMainThreadActions();
  controller.Unlink();
  assert.equal(unlinks.length, 1);
  assert.equal(unlinks[0].receiver, finalizer);
  assert.deepEqual(unlinks[0].args, []);
  assert.equal(unlinks[0].result, undefined);
  assert.equal(source.GetStateMachine(), null);
  // Real classes with authored synthetic animation data; no corpus/native execution claim.
});

test("a real owner uses the base layer for an empty mask and permits an absent named layer", t =>
{
  const owner = new EveSpaceObject2(), animation = CreateAnimation(), controller = new Tr2Controller();
  owner.animationUpdater = animation;
  controller.Link(owner);
  t.after(() => controller.Unlink());
  const finalizer = new Type(), layerCalls = Observe(t, animation, "GetAnimationLayer");
  assert.equal(finalizer.CanTransition(controller), true, "the real base layer is initially idle");
  animation.PlayAnimation("Move", true, 1, 0, 1, false);
  animation.Update(1);
  assert.equal(finalizer.CanTransition(controller), false);
  finalizer.mask = "missing-layer";
  assert.equal(finalizer.CanTransition(controller), true);
  assert.deepEqual(layerCalls.map(call => call.args), [[null], [null], ["missing-layer"]]);
  for (const call of layerCalls) assert.equal(call.receiver, animation);
  assert.ok(layerCalls[0].result instanceof Tr2GrannyAnimationLayer);
  assert.equal(layerCalls[1].result, layerCalls[0].result);
  assert.equal(layerCalls[2].result, null);
});

test("Blue dictionary reads and writes preserve the model-free finalizer and authored mask", () =>
{
  const finalizer = new Type();
  new DictReader({ declarations: true }).ReadInto(finalizer, { mask: "body" });
  assert.ok(finalizer instanceof Type);
  assert.equal(finalizer.constructor, Type);
  assert.equal(finalizer.mask, "body");
  assert.equal(new DictWriter().WriteObject(finalizer).mask, "body");
  assert.equal(new DictWriter().WriteObject(finalizer, {}, { persistOnly: true }).mask, "body");
  assert.deepEqual([...new DictReader({ declarations: true }).ReadInto(finalizer, { mask: "upper" })], ["mask"]);
  assert.equal(finalizer.mask, "upper");
  assert.equal(new DictWriter().WriteObject(finalizer).mask, "upper");
  const restored = new Type();
  new DictReader({ declarations: true }).ReadInto(restored, new DictWriter().WriteObject(finalizer, {}, { persistOnly: true }));
  assert.equal(restored.constructor, Type);
  assert.notEqual(restored, finalizer);
  assert.equal(restored.mask, "upper");
});

test("DictReader creates a registered Sync finalizer without an inherited values factory", () =>
{
  assert.equal(Type.from, undefined);
  const declared = new DictReader({ declarations: true }).CreateObject({ mask: "declared-mask" }, Type);
  assert.equal(declared.constructor, Type);
  assert.equal(declared.mask, "declared-mask");
  assert.equal(CjsSchema.cast(declared, CjsModel), null);
  const named = new DictReader({ declarations: true }).CreateObject({ _type: "Tr2SyncToAnimation", mask: "named-mask" });
  assert.equal(named.constructor, Type);
  assert.notEqual(named, declared);
  assert.equal(named.mask, "named-mask");
  assert.equal(CjsSchema.cast(named, ITr2StateMachineStateFinalizer), named);
});

test("DictReader writes a mask into an existing finalizer without replacing it", () =>
{
  const finalizer = new Type();
  finalizer.mask = "old";
  const changed = new DictReader({ declarations: true }).ReadInto(finalizer, { _type: "Tr2SyncToAnimation", mask: "read" });
  assert.deepEqual([...changed], ["mask"]);
  assert.equal(finalizer.constructor, Type);
  assert.equal(finalizer.mask, "read");
  assert.equal(new DictWriter().WriteObject(finalizer, {}, { persistOnly: true }).mask, "read");
});

test("Copier preserves masks through existing and freshly constructed concrete finalizers", () =>
{
  const source = new Type(), destination = new Type();
  source.mask = "copy-mask";
  destination.mask = "old";
  assert.equal(new Copier().CopyTo(source, destination), destination);
  assert.equal(destination.mask, "copy-mask");
  const fresh = new Copier().CloneTo(source);
  assert.equal(fresh.constructor, Type);
  assert.notEqual(fresh, source);
  assert.equal(fresh.mask, "copy-mask");
  destination.mask = "changed";
  assert.equal(source.mask, "copy-mask");
  assert.equal(fresh.mask, "copy-mask");
});

test("State scalar-reference transports retain a real Sync finalizer and its mask without claiming admission", () =>
{
  const source = new Tr2StateMachineState();
  new DictReader({ declarations: true }).ReadInto(source, {
    name: "source", finalizer: { _type: "Tr2SyncToAnimation", mask: "nested-mask" }
  });
  assert.equal(source.finalizer.constructor, Type);
  assert.equal(source.finalizer.mask, "nested-mask");
  assert.equal(new DictWriter().WriteObject(source, {}, { persistOnly: true }).finalizer.mask, "nested-mask");
  const live = new Type();
  live.mask = "live-mask";
  new DictReader({ declarations: true }).ReadInto(source, { finalizer: live });
  assert.equal(source.finalizer, live, "the retained scalar object-reference path borrows the live value");
  const destination = State("destination");
  assert.equal(new Copier().CopyTo(source, destination), destination);
  assert.equal(destination.finalizer.constructor, Type);
  assert.notEqual(destination.finalizer, live);
  assert.equal(destination.finalizer.mask, "live-mask");
  assert.equal(source.finalizer, live);
  assert.equal(source.GetStateMachine(), null);
  assert.equal(destination.GetStateMachine(), null);
});
