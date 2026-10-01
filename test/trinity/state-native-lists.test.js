import assert from "node:assert/strict";
import test from "node:test";
import { BlueList } from "../../npm/dist/global/blue/BlueList.js";
import { Copier } from "../../npm/dist/global/blue/Copier.js";
import { DictReader } from "../../npm/dist/global/blue/DictReader.js";
import { IListNotify } from "../../npm/dist/global/blue/IListNotify.js";
import { INotify } from "../../npm/dist/global/blue/INotify.js";
import { BLUELISTEVENT } from "../../npm/dist/global/consts/blue.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { CjsModel } from "../../npm/dist/global/model/CjsModel.js";
import { CjsSchema, meta } from "../../npm/dist/global/schema/index.js";
import { CjsBlackReader } from "../../npm/dist/resource/formats/black/core/CjsBlackReader.js";
import { ExecuteMainThreadActions } from "../../npm/dist/trinity/core/continueOnMainThread.js";
import { Tr2Controller } from "../../npm/dist/trinity/controllers/Tr2Controller.js";
import { ITr2ControllerAction } from "../../npm/dist/trinity/controllers/action/ITr2ControllerAction.js";
import { Tr2ActionCallback } from "../../npm/dist/trinity/controllers/action/Tr2ActionCallback.js";
import { Tr2ControllerFloatVariable } from "../../npm/dist/trinity/controllers/expression/Tr2ControllerFloatVariable.js";
import { ITr2StateMachineStateFinalizer } from "../../npm/dist/trinity/controllers/state/ITr2StateMachineStateFinalizer.js";
import { Tr2StateMachine } from "../../npm/dist/trinity/controllers/state/Tr2StateMachine.js";
import { Tr2StateMachineState } from "../../npm/dist/trinity/controllers/state/Tr2StateMachineState.js";
import { Tr2StateMachineTransition } from "../../npm/dist/trinity/controllers/state/Tr2StateMachineTransition.js";

const {
  BELIST_INSERTED, BELIST_REMOVED, BELIST_UNLOADSTART, BELIST_LOADFINISHED,
  BELIST_MOVED, BELIST_SWAPPED, BELIST_LOADING, BELIST_UNLOADING
} = BLUELISTEVENT;
const ALL_DIRTY = 0xffffffffffffffffn;

function Info(list) { const info = {}; list.GetInfo(info); return info; }
function State(name = "") { const state = new Tr2StateMachineState(); state.name = name; return state; }
function AssertOwned(state, actions = state.actions, transitions = state.transitions)
{
  assert.equal(state.actions, actions);
  assert.equal(state.transitions, transitions);
  assert.equal(Object.getPrototypeOf(actions), BlueList.prototype);
  assert.equal(Object.getPrototypeOf(transitions), BlueList.prototype);
  assert.deepEqual(Info(actions), { iid: ITr2ControllerAction, clsid: null, listOps: 0, notify: state });
  assert.deepEqual(Info(transitions), {
    iid: Tr2StateMachineTransition, clsid: "Tr2StateMachineTransition", listOps: 0, notify: state
  });
}
function Observe(state)
{
  const events = [], original = state.OnListModified;
  state.OnListModified = function(event, key, key2, value, list)
  {
    events.push({ event, key, key2, value, list, items: Array.from(list), notify: Info(list).notify });
    return original.call(this, event, key, key2, value, list);
  };
  return events;
}
function Spy(object, method, calls, label = method)
{
  const original = object[method];
  object[method] = function(...args)
  {
    calls.push([label, ...args]);
    return Reflect.apply(original, this, args);
  };
}
function Linked(t, state, peers = [])
{
  const machine = new Tr2StateMachine(), controller = new Tr2Controller();
  for (const child of [state, ...peers]) machine.states.Append(child);
  machine.Link(controller);
  t.after(() =>
  {
    machine.Unlink();
    for (const child of [state, ...peers]) child.Unlink();
    ExecuteMainThreadActions();
  });
  return { machine, controller };
}

// These locally registered subclasses observe State's dispatch, not the real
// action/transition algorithms. Transport and notification tests below use the
// production classes. No production class table is changed by these doubles.
class StateListObservedAction extends Tr2ActionCallback
{
  calls = [];
  allowsTransition = true;
  onLink = null;
  Link(controller) { this.calls.push(["Link", controller]); if (this.onLink) this.onLink(controller); }
  Unlink() { this.calls.push(["Unlink"]); }
  Start(controller) { this.calls.push(["Start", controller]); }
  Stop(controller) { this.calls.push(["Stop", controller]); }
  CanTransition() { this.calls.push(["CanTransition"]); return this.allowsTransition; }
  RebaseSimTime(diff) { this.calls.push(["RebaseSimTime", diff]); }
}
CjsSchema.define(StateListObservedAction, { className: "StateListObservedAction" });
meta.carbon.interfaceTable({ interfaces: [StateListObservedAction, ITr2ControllerAction], chainTo: null })(StateListObservedAction);

class StateListObservedTransition extends Tr2StateMachineTransition
{
  calls = [];
  mask = 0n;
  activates = false;
  destination = null;
  onDestination = null;
  Link(state) { this.calls.push(["Link", state]); this._source = state; }
  Unlink() { this.calls.push(["Unlink"]); this._source = null; }
  GetVariableMask() { this.calls.push(["GetVariableMask"]); return this.mask; }
  CanActivate(dirty) { this.calls.push(["CanActivate", dirty]); return this.activates; }
  GetDestination()
  {
    this.calls.push(["GetDestination"]);
    return this.onDestination ? this.onDestination() : this.destination;
  }
}
CjsSchema.define(StateListObservedTransition, { className: "StateListObservedTransition" });
meta.carbon.interfaceTable({ interfaces: [StateListObservedTransition, Tr2StateMachineTransition], chainTo: null })(StateListObservedTransition);

class StateListFinalizer extends ITr2StateMachineStateFinalizer
{
  calls = [];
  allow = true;
  onCanTransition = null;
  Link(controller) { this.calls.push(["Link", controller]); }
  Unlink() { this.calls.push(["Unlink"]); }
  CanTransition(controller)
  {
    this.calls.push(["CanTransition", controller]);
    if (this.onCanTransition) this.onCanTransition(controller);
    return this.allow;
  }
}

test("State owns independently subscribed native lists with READ/PERSIST declarations and real admissions", () =>
{
  const state = State(), other = State();
  AssertOwned(state);
  AssertOwned(other);
  assert.notEqual(state.actions, other.actions);
  assert.notEqual(state.transitions, other.transitions);
  assert.notEqual(state.actions, state.transitions);
  assert.deepEqual([...mappedInterfaces(Tr2StateMachineState)], [Tr2StateMachineState, IListNotify, INotify]);
  assert.equal(CjsSchema.cast(state, CjsModel), state);
  assert.deepEqual([...mappedInterfaces(Tr2StateMachineTransition)], [Tr2StateMachineTransition, INotify]);
  const action = new Tr2ActionCallback(), transition = new Tr2StateMachineTransition();
  assert.equal(CjsSchema.cast(transition, INotify), transition);
  assert.equal(state.actions.Append(action), true);
  assert.equal(state.transitions.Append(transition), true);
  assert.equal(state.actions.GetAt(0), action);
  assert.equal(state.transitions.GetAt(0), transition);
  assert.equal(transition.GetSource(), null);
  for (const [name, itemType] of [["actions", "ITr2ControllerAction"], ["transitions", "Tr2StateMachineTransition"]])
  {
    const field = CjsSchema.getSchema(Tr2StateMachineState).members.find(member => member.name === name);
    assert.equal(field.type.kind, "list");
    assert.equal(field.type.itemType, itemType);
    assert.equal(field.edit.read, true);
    assert.equal(field.edit.persist, true);
    assert.equal(CjsSchema.isFieldWritable(field), true, "PERSIST permits population under the existing writable-field policy");
  }
});

test("list admission and direct payload dispatch require exact query identities", t =>
{
  class UnexposedAction extends StateListObservedAction {}
  class UnexposedTransition extends StateListObservedTransition {}
  for (const Type of [UnexposedAction, UnexposedTransition])
  {
    CjsSchema.define(Type, { className: `StateNativeLists${Type.name}` });
    meta.carbon.interfaceTable({ interfaces: [], chainTo: null })(Type);
  }
  const state = State();
  Linked(t, state);
  const action = new UnexposedAction(), transition = new UnexposedTransition();
  assert.equal(CjsSchema.cast(action, ITr2ControllerAction), action);
  assert.equal(CjsSchema.cast(transition, Tr2StateMachineTransition), transition);
  const duck = { Link() { assert.fail("duck Link"); }, Unlink() { assert.fail("duck Unlink"); } };
  for (const [list, values] of [[state.actions, [action, duck, null, new Tr2StateMachineTransition()]],
    [state.transitions, [transition, duck, null, new Tr2ActionCallback()]]])
  {
    for (const value of values)
    {
      assert.equal(list.Append(value), false);
      state.OnListModified(BELIST_INSERTED, 0, 0, value, list);
      state.OnListModified(BELIST_REMOVED, 0, 0, value, list);
    }
    assert.equal(list.length, 0);
  }
  assert.deepEqual(action.calls, []);
  assert.deepEqual(transition.calls, []);
});

test("unlinked action insertion is inert and removal still calls Unlink", () =>
{
  const state = State(), action = new StateListObservedAction();
  assert.equal(state.actions.Append(action), true);
  assert.deepEqual(action.calls, []);
  assert.equal(state.actions.Remove(0), true);
  assert.deepEqual(action.calls, [["Unlink"]]);
});

test("linked action insertion links before immediate active Start and re-reads the controller", t =>
{
  const state = State(), inactive = new StateListObservedAction();
  const { machine, controller } = Linked(t, state);
  state.actions.Append(inactive);
  assert.deepEqual(inactive.calls, [["Link", controller]]);
  assert.equal(inactive.calls[0][1], controller);
  state.actions.Remove(0);
  assert.deepEqual(inactive.calls, [["Link", controller], ["Unlink"]]);
  state.Start();
  const nextController = new Tr2Controller(), active = new StateListObservedAction();
  let currentController = controller, reads = 0;
  machine.GetController = () => { reads++; return currentController; };
  active.onLink = () => { currentController = nextController; };
  state.actions.Append(active);
  assert.deepEqual(active.calls, [["Link", controller], ["Start", nextController]]);
  assert.equal(active.calls[0][1], controller);
  assert.equal(active.calls[1][1], nextController);
  assert.equal(reads, 2);
  active.calls.length = 0;
  assert.equal(state.actions.Remove(0), true);
  assert.deepEqual(active.calls, [["Stop", nextController], ["Unlink"]]);
  assert.equal(active.calls[0][1], nextController);
  assert.equal(reads, 3);
  ExecuteMainThreadActions();
  assert.deepEqual(active.calls, [["Stop", nextController], ["Unlink"]], "list event dispatch is immediate");
});

test("required linked dispatch does not silently disappear when GetController returns null", t =>
{
  const state = State(), action = new StateListObservedAction(), finalizer = new StateListFinalizer();
  const { machine } = Linked(t, state);
  machine.GetController = () => null;
  state.actions.Append(action);
  assert.deepEqual(action.calls, [["Link", null]]);
  state.finalizer = finalizer;
  assert.equal(state.OnModified("finalizer"), true);
  assert.deepEqual(finalizer.calls, [["Link", null]]);
});

test("transition insertion and removal maintain masks after native Link and Unlink", t =>
{
  const state = State(), first = new StateListObservedTransition(), second = new StateListObservedTransition();
  first.mask = 1n;
  second.mask = 4n;
  state.transitions.Append(first);
  assert.deepEqual(first.calls, []);
  assert.equal(state._transitionVariableMask, 0n);
  Linked(t, state);
  first.calls.length = 0;
  assert.equal(state.transitions.Append(second), true);
  assert.deepEqual(second.calls, [["Link", state], ["GetVariableMask"]]);
  assert.deepEqual(first.calls, [["GetVariableMask"]]);
  assert.equal(state._transitionVariableMask, 5n);
  first.calls.length = second.calls.length = 0;
  assert.equal(state.transitions.Remove(1), true);
  assert.deepEqual(second.calls, [["Unlink"]]);
  assert.deepEqual(first.calls, [["GetVariableMask"]]);
  assert.equal(state._transitionVariableMask, 1n);
  const unknown = new StateListObservedTransition();
  state.transitions.Append(unknown);
  assert.equal(state._transitionVariableMask, 0n, "any zero mask disables the aggregate skip");
  state.transitions.Remove(1);
  assert.equal(state._transitionVariableMask, 1n);
  state.transitions.Remove(0);
  assert.equal(state._transitionVariableMask, 0n);
});

test("unlinked transition removal still unlinks and recomputes the remaining union", () =>
{
  const state = State(), first = new StateListObservedTransition(), removed = new StateListObservedTransition();
  first.mask = 8n;
  state.transitions.Append(first);
  state.transitions.Append(removed);
  state.transitions.Remove(1);
  assert.deepEqual(removed.calls, [["Unlink"]]);
  assert.deepEqual(first.calls, [["GetVariableMask"]]);
  assert.equal(state._transitionVariableMask, 8n);
});

test("foreign, unknown, flag-only, bulk and reorder notifications do not dispatch child lifecycle", t =>
{
  const state = State(), action = new StateListObservedAction(), transition = new StateListObservedTransition();
  Linked(t, state);
  const masks = [];
  Spy(state, "UpdateVariableMask", masks);
  for (const [list, child] of [[state.actions, action], [state.transitions, transition]])
  {
    state.OnListModified(BELIST_INSERTED, 0, 0, child, []);
    state.OnListModified(BELIST_REMOVED, 0, 0, child, []);
    for (const event of [0, 3, BELIST_LOADING, BELIST_UNLOADING, BELIST_UNLOADSTART,
      BELIST_LOADFINISHED, BELIST_MOVED, BELIST_SWAPPED]) state.OnListModified(event, 0, 0, child, list);
  }
  assert.deepEqual(action.calls, []);
  assert.deepEqual(transition.calls, []);
  assert.deepEqual(masks, []);
});

test("event flags are masked before action and transition insert/remove dispatch", t =>
{
  const state = State(), action = new StateListObservedAction(), transition = new StateListObservedTransition();
  const { controller } = Linked(t, state);
  state.OnListModified(BELIST_INSERTED | BELIST_LOADING, 0, 0, action, state.actions);
  state.OnListModified(BELIST_REMOVED | BELIST_UNLOADING, 0, 0, action, state.actions);
  assert.deepEqual(action.calls, [["Link", controller], ["Unlink"]]);
  assert.equal(action.calls[0][1], controller);
  state.OnListModified(BELIST_INSERTED | BELIST_LOADING, 0, 0, transition, state.transitions);
  state.OnListModified(BELIST_REMOVED | BELIST_UNLOADING, 0, 0, transition, state.transitions);
  assert.deepEqual(transition.calls, [["Link", state], ["Unlink"]]);
});

test("legacy addChild/removeChild each notify exactly once on both subscribed lists", t =>
{
  const state = State(), action = new StateListObservedAction(), transition = new StateListObservedTransition();
  const { controller } = Linked(t, state), events = Observe(state);
  const actions = state.actions, transitions = state.transitions;
  for (const [field, child] of [["actions", action], ["transitions", transition]])
  {
    assert.equal(CjsModel.addChild(state, field, child), child);
    assert.equal(state[field][0], child);
    assert.equal(CjsModel.removeChild(state, field, child), true);
    assert.equal(state[field].length, 0);
  }
  assert.deepEqual(events.map(entry => entry.event), [BELIST_INSERTED, BELIST_REMOVED, BELIST_INSERTED, BELIST_REMOVED]);
  assert.deepEqual(events.map(entry => entry.list), [actions, actions, transitions, transitions]);
  assert.deepEqual(action.calls, [["Link", controller], ["Unlink"]]);
  assert.equal(action.calls[0][1], controller);
  assert.deepEqual(transition.calls, [["Link", state], ["GetVariableMask"], ["Unlink"]]);
  AssertOwned(state, actions, transitions);
});

test("OnModified links only the non-null finalizer of a linked state", t =>
{
  const state = State(), finalizer = new StateListFinalizer();
  state.finalizer = finalizer;
  assert.equal(state.OnModified("finalizer"), true);
  assert.deepEqual(finalizer.calls, []);
  const { controller } = Linked(t, state);
  finalizer.calls.length = 0;
  assert.equal(state.OnModified("name"), true);
  assert.deepEqual(finalizer.calls, []);
  assert.equal(state.OnModified("finalizer"), true);
  assert.deepEqual(finalizer.calls, [["Link", controller]]);
  assert.equal(finalizer.calls[0][1], controller);
  state.finalizer = null;
  assert.equal(state.OnModified("finalizer"), true);
  assert.deepEqual(finalizer.calls, [["Link", controller]]);
});

test("Link keeps the passed machine and fetches its controller afresh after an action unlinks the State", t =>
{
  const state = State(), first = new StateListObservedAction(), second = new StateListObservedAction();
  const finalizer = new StateListFinalizer(), machine = new Tr2StateMachine();
  const before = new Tr2Controller(), after = new Tr2Controller();
  let current = before, reads = 0;
  machine.GetController = () => { reads++; return current; };
  first.onLink = () => { state.Unlink(); current = after; };
  state.actions.Append(first);
  state.actions.Append(second);
  state.finalizer = finalizer;
  state.Link(machine);
  t.after(() => { state.Unlink(); ExecuteMainThreadActions(); });
  assert.equal(state.GetStateMachine(), null, "the first action called the real State.Unlink");
  assert.deepEqual(first.calls, [["Link", before], ["Unlink"]]);
  assert.deepEqual(second.calls, [["Unlink"], ["Link", after]]);
  assert.deepEqual(finalizer.calls, [["Unlink"], ["Link", after]]);
  assert.equal(first.calls[0][1], before);
  assert.equal(second.calls[1][1], after);
  assert.equal(finalizer.calls[1][1], after);
  assert.equal(reads, 3, "each required call reads the original parameter's controller independently");
});

test("Update short-circuits false activation without reading destination or controller", t =>
{
  const state = State(), transition = new StateListObservedTransition();
  state.transitions.Append(transition);
  const { machine } = Linked(t, state);
  state.Start();
  transition.calls.length = 0;
  transition.GetDestination = () => assert.fail("inactive transition destination must not be read");
  machine.GetController = () => assert.fail("Update has no unconditional controller dependency");
  assert.equal(state.Update(2n), null);
  assert.deepEqual(transition.calls, [["CanActivate", 2n]]);
});

test("Update reads activation before destination and reads a changed destination again after Stop", t =>
{
  const state = State(), transition = new StateListObservedTransition(), action = new StateListObservedAction();
  const oldDestination = State("old"), replacement = State("replacement"), finalizer = new StateListFinalizer();
  transition.activates = true;
  transition.destination = oldDestination;
  state.transitions.Append(transition);
  state.actions.Append(action);
  state.finalizer = finalizer;
  const { controller } = Linked(t, state);
  state.Start();
  ExecuteMainThreadActions();
  const calls = [];
  Spy(transition, "CanActivate", calls, "activate");
  Spy(transition, "GetDestination", calls, "destination");
  Spy(action, "CanTransition", calls, "veto");
  Spy(state, "Stop", calls, "stop");
  finalizer.onCanTransition = () => { calls.push(["finalizer"]); transition.destination = replacement; };
  action.calls.length = 0;
  assert.equal(state.Update(4n), replacement);
  assert.deepEqual(calls, [["activate", 4n], ["destination"], ["veto"], ["stop"], ["finalizer"], ["destination"]]);
  assert.equal(state._isActive, false);
  assert.deepEqual(action.calls, [["CanTransition"]], "Stop remains queued until the drain");
  ExecuteMainThreadActions();
  assert.deepEqual(action.calls, [["CanTransition"], ["Stop", controller]]);
  assert.equal(action.calls[1][1], controller);
});

test("GetNextState uses all dirty bits, skips false activation and reads the selected destination twice", () =>
{
  const state = State(), rejected = new StateListObservedTransition(), selected = new StateListObservedTransition();
  rejected.GetDestination = () => assert.fail("false activation must short-circuit its getter");
  selected.activates = true;
  const first = State("first"), second = State("second");
  let reads = 0;
  selected.onDestination = () => ++reads === 1 ? first : second;
  state.transitions.Append(rejected);
  state.transitions.Append(selected);
  assert.equal(state._getNextState(), second);
  assert.deepEqual(rejected.calls, [["CanActivate", ALL_DIRTY]]);
  assert.deepEqual(selected.calls, [["CanActivate", ALL_DIRTY], ["GetDestination"], ["GetDestination"]]);
  assert.equal(reads, 2);
});

test("an action veto keeps the state active and forces all dirty bits on the next Update", t =>
{
  const state = State(), transition = new StateListObservedTransition(), action = new StateListObservedAction();
  transition.mask = 8n;
  transition.activates = true;
  transition.destination = State("next");
  action.allowsTransition = false;
  state.transitions.Append(transition);
  state.actions.Append(action);
  Linked(t, state);
  state.Start();
  ExecuteMainThreadActions();
  transition.calls.length = action.calls.length = 0;
  assert.equal(state.Update(1n), null);
  assert.deepEqual(transition.calls, [], "disjoint dirty bits skip activation");
  assert.equal(state.Update(8n), null);
  assert.equal(state._hasBeenVetoed, true);
  assert.equal(state._isActive, true);
  assert.deepEqual(action.calls, [["CanTransition"]]);
  transition.calls.length = 0;
  action.allowsTransition = true;
  assert.equal(state.Update(0n), transition.destination);
  assert.equal(transition.calls[0][0], "CanActivate");
  assert.equal(transition.calls[0][1], ALL_DIRTY);
  assert.equal(state._isActive, false);
  ExecuteMainThreadActions();
});

test("finalizing waits on its finalizer, then restarts when its transition no longer activates", t =>
{
  const state = State(), transition = new StateListObservedTransition(), action = new StateListObservedAction();
  const finalizer = new StateListFinalizer();
  finalizer.allow = false;
  transition.activates = true;
  transition.destination = State("next");
  state.transitions.Append(transition);
  state.actions.Append(action);
  state.finalizer = finalizer;
  const { controller } = Linked(t, state);
  state.Start();
  ExecuteMainThreadActions();
  action.calls.length = 0;
  assert.equal(state.Update(0n), null);
  assert.equal(state._isFinalizing, true);
  assert.equal(state._isActive, true);
  ExecuteMainThreadActions();
  assert.deepEqual(action.calls, [["CanTransition"], ["Stop", controller]]);
  assert.equal(action.calls[1][1], controller);
  transition.calls.length = 0;
  assert.equal(state.Update(0n), null);
  assert.equal(state._isFinalizing, true);
  assert.equal(transition.calls[0][1], ALL_DIRTY);
  transition.activates = false;
  transition.GetDestination = () => assert.fail("restart must not inspect an inactive destination");
  action.calls.length = 0;
  assert.equal(state.Update(0n), null);
  assert.equal(state._isActive, true);
  assert.equal(state._isFinalizing, false);
  assert.equal(state._hasBeenVetoed, false);
  assert.deepEqual(action.calls, []);
  ExecuteMainThreadActions();
  assert.deepEqual(action.calls, [["Start", controller]]);
  assert.equal(action.calls[0][1], controller);
});

test("finalizing resolves the controller at the finalizer call after transition selection", t =>
{
  const state = State(), transition = new StateListObservedTransition(), finalizer = new StateListFinalizer();
  transition.activates = true;
  const next = State("next");
  transition.destination = next;
  state.transitions.Append(transition);
  state.finalizer = finalizer;
  const { machine, controller } = Linked(t, state);
  state.Start();
  state._isFinalizing = true;
  const replacement = new Tr2Controller();
  let current = controller, reads = 0;
  machine.GetController = () => { reads++; return current; };
  transition.onDestination = () => { current = replacement; return next; };
  finalizer.calls.length = 0;
  assert.equal(state.Update(0n), next);
  assert.deepEqual(finalizer.calls, [["CanTransition", replacement]]);
  assert.equal(finalizer.calls[0][1], replacement);
  assert.equal(reads, 1);
});

test("required action calls are not duck-typed while custom CanTransition retains its nullable controller", () =>
{
  const state = State(), first = new StateListObservedAction(), second = new StateListObservedAction();
  state.actions.Append(first);
  state.actions.Append(second);
  state.RebaseSimTime(12);
  assert.deepEqual(first.calls, [["RebaseSimTime", 12]]);
  assert.deepEqual(second.calls, [["RebaseSimTime", 12]]);
  const finalizer = new StateListFinalizer();
  finalizer.CanTransition = () => assert.fail("custom null-controller convenience retains its guard");
  state.finalizer = finalizer;
  assert.equal(state.CanTransition(null), true);
  first.CanTransition = undefined;
  assert.throws(() => state.CanTransition(null), TypeError);
  first.RebaseSimTime = undefined;
  assert.throws(() => state.RebaseSimTime(12), TypeError);
});

test("Update requires CanTransition on an admitted action instead of silently bypassing a missing method", t =>
{
  const state = State(), action = new StateListObservedAction(), transition = new StateListObservedTransition();
  transition.activates = true;
  transition.destination = State("next");
  assert.equal(state.actions.Append(action), true);
  assert.equal(state.transitions.Append(transition), true);
  Linked(t, state);
  state.Start();
  ExecuteMainThreadActions();
  action.calls.length = transition.calls.length = 0;
  action.CanTransition = undefined;
  assert.throws(() => state.Update(0n), { name: "TypeError", message: /CanTransition/ });
  assert.deepEqual(transition.calls, [["CanActivate", 0n], ["GetDestination"]]);
  assert.deepEqual(action.calls, []);
  assert.equal(state._isActive, true);
  ExecuteMainThreadActions();
  assert.deepEqual(action.calls, [], "failed veto dispatch must not queue a Stop");
});

test("required transition methods fail visibly when an admitted instance is malformed", () =>
{
  const state = State(), transition = new StateListObservedTransition();
  state.transitions.Append(transition);
  transition.GetVariableMask = undefined;
  assert.throws(() => state.UpdateVariableMask(), TypeError);
  transition.CanActivate = undefined;
  assert.throws(() => state._getNextState(), TypeError);
  transition.CanActivate = () => true;
  transition.GetDestination = undefined;
  assert.throws(() => state._getNextState(), TypeError);
});

test("Start and Stop remain queued, re-read controllers at drain and skip actions after Unlink", t =>
{
  const state = State(), action = new StateListObservedAction();
  state.actions.Append(action);
  const { machine, controller } = Linked(t, state);
  action.calls.length = 0;
  state.Start();
  assert.deepEqual(action.calls, []);
  const next = new Tr2Controller();
  let current = next;
  machine.GetController = () => current;
  ExecuteMainThreadActions();
  assert.deepEqual(action.calls, [["Start", next]]);
  assert.equal(action.calls[0][1], next);
  state.Stop();
  assert.deepEqual(action.calls, [["Start", next]]);
  current = controller;
  ExecuteMainThreadActions();
  assert.deepEqual(action.calls, [["Start", next], ["Stop", controller]]);
  assert.equal(action.calls[1][1], controller);
  action.calls.length = 0;
  state.Start();
  state.Unlink();
  assert.deepEqual(action.calls, [["Unlink"]]);
  ExecuteMainThreadActions();
  assert.deepEqual(action.calls, [["Unlink"]]);
  assert.equal(state.GetStateMachine(), null);
});

test("DictReader populates owned READ containers with shared live children and restores their observers", () =>
{
  const state = State(), actions = state.actions, transitions = state.transitions;
  const oldAction = new Tr2ActionCallback(), oldTransition = new Tr2StateMachineTransition();
  actions.Append(oldAction);
  transitions.Append(oldTransition);
  const action = new Tr2ActionCallback(), transition = new Tr2StateMachineTransition();
  action.callbackName = "live-action";
  transition.name = "live-transition";
  const events = Observe(state);
  const changed = new DictReader().ReadInto(state, {
    actions: [action, action], transitions: [transition, transition], name: "live"
  });
  AssertOwned(state, actions, transitions);
  assert.deepEqual(new Set(changed), new Set(["actions", "transitions", "name"]));
  assert.deepEqual(Array.from(actions), [action, action]);
  assert.deepEqual(Array.from(transitions), [transition, transition]);
  assert.equal(transition.GetSource(), null, "bulk completion does not synthesize per-child Link");
  assert.deepEqual(events.map(entry => entry.event), [
    BELIST_UNLOADSTART, BELIST_LOADFINISHED, BELIST_UNLOADSTART, BELIST_LOADFINISHED
  ]);
  assert.deepEqual(events.map(entry => entry.items), [[oldAction], [action, action], [oldTransition], [transition, transition]]);
  for (const event of events) assert.equal(event.notify, state);
});

test("from and SetValues preserve configured storage and duplicate authored references in each list", () =>
{
  function Values(label)
  {
    return {
      name: label,
      actions: [{ _type: "Tr2ActionCallback", _id: "action", callbackName: label }, { _ref: "action" }],
      transitions: [{ _type: "Tr2StateMachineTransition", _id: "transition", name: label, condition: "1" }, { _ref: "transition" }]
    };
  }
  const state = Tr2StateMachineState.from(Values("first"));
  const actions = state.actions, transitions = state.transitions;
  AssertOwned(state, actions, transitions);
  assert.equal(actions.length, 2);
  assert.equal(transitions.length, 2);
  assert.equal(actions[0], actions[1]);
  assert.equal(transitions[0], transitions[1]);
  assert.ok(actions[0] instanceof Tr2ActionCallback);
  assert.ok(transitions[0] instanceof Tr2StateMachineTransition);
  const oldAction = actions[0], oldTransition = transitions[0], events = Observe(state);
  state.SetValues(Values("second"));
  AssertOwned(state, actions, transitions);
  assert.equal(actions[0], actions[1]);
  assert.equal(transitions[0], transitions[1]);
  assert.notEqual(actions[0], oldAction);
  assert.notEqual(transitions[0], oldTransition);
  assert.equal(actions[0].callbackName, "second");
  assert.equal(transitions[0].name, "second");
  assert.equal(state.GetName(), "second");
  assert.equal(transitions[0].GetSource(), null);
  assert.deepEqual(events.map(entry => entry.event), [
    BELIST_UNLOADSTART, BELIST_LOADFINISHED, BELIST_UNLOADSTART, BELIST_LOADFINISHED
  ]);
  for (const event of events) assert.equal(event.notify, state);
});

test("canonical Black framing populates both owned lists with real shared children", t =>
{
  // Authored framing proves reader behavior; it is not an asset or corpus test.
  const fixture = new BlackFixture();
  const bytes = fixture.Finish(fixture.Object(1, "Tr2StateMachineState", [
    ["name", fixture.String("black-state")],
    ["actions", Concat([U32(2), fixture.Object(2, "Tr2ActionCallback", [["callbackName", fixture.String("callback")]]), fixture.Object(2)])],
    ["transitions", Concat([U32(2), fixture.Object(3, "Tr2StateMachineTransition", [
      ["name", fixture.String("destination")], ["condition", fixture.String("1")]
    ]), fixture.Object(3)])]
  ]));
  const events = [], original = Tr2StateMachineState.prototype.OnListModified;
  Tr2StateMachineState.prototype.OnListModified = function(event, key, key2, value, list)
  {
    events.push({ event, list, owner: this, notify: Info(list).notify });
    return original.call(this, event, key, key2, value, list);
  };
  t.after(() => { Tr2StateMachineState.prototype.OnListModified = original; });
  const reader = new CjsBlackReader(bytes, { schema: null });
  const state = reader.ReadRuntime().root;
  AssertOwned(state);
  assert.equal(state.GetName(), "black-state");
  assert.equal(state.actions.length, 2);
  assert.equal(state.transitions.length, 2);
  assert.equal(state.actions[0], state.actions[1]);
  assert.equal(state.actions[0], reader.references.get(2));
  assert.equal(state.transitions[0], state.transitions[1]);
  assert.equal(state.transitions[0], reader.references.get(3));
  assert.ok(state.actions[0] instanceof Tr2ActionCallback);
  assert.ok(state.transitions[0] instanceof Tr2StateMachineTransition);
  assert.equal(state.actions[0].callbackName, "callback");
  assert.equal(state.transitions[0].name, "destination");
  assert.deepEqual(events.map(entry => entry.event), [BELIST_LOADFINISHED, BELIST_LOADFINISHED]);
  assert.deepEqual(events.map(entry => entry.list), [state.actions, state.transitions]);
  for (const event of events)
  {
    assert.equal(event.owner, state);
    assert.equal(event.notify, state);
  }
  assert.equal(state.transitions[0].GetSource(), null);
  assert.equal(reader.reader.AtEnd(), true);
  assert.deepEqual(reader.reports, []);
});

test("Copier preserves existing and fresh owned lists, subscriptions and shared copied children", () =>
{
  const source = State("source"), action = new Tr2ActionCallback(), transition = new Tr2StateMachineTransition();
  action.callbackName = "shared-action";
  transition.name = "shared-transition";
  transition.condition = "1";
  source.actions.Append(action);
  source.actions.Append(action);
  source.transitions.Append(transition);
  source.transitions.Append(transition);
  const destination = State("destination"), actions = destination.actions, transitions = destination.transitions;
  actions.Append(new Tr2ActionCallback());
  transitions.Append(new Tr2StateMachineTransition());
  const events = Observe(destination);
  assert.equal(new Copier().CopyTo(source, destination), destination);
  AssertOwned(destination, actions, transitions);
  for (const result of [destination, new Copier().CloneTo(source)])
  {
    assert.ok(result instanceof Tr2StateMachineState);
    AssertOwned(result);
    assert.notEqual(result.actions, source.actions);
    assert.notEqual(result.transitions, source.transitions);
    assert.equal(result.actions.length, 2);
    assert.equal(result.transitions.length, 2);
    assert.equal(result.actions[0], result.actions[1]);
    assert.equal(result.transitions[0], result.transitions[1]);
    assert.notEqual(result.actions[0], action);
    assert.notEqual(result.transitions[0], transition);
    assert.equal(result.actions[0].callbackName, "shared-action");
    assert.equal(result.transitions[0].name, "shared-transition");
    assert.equal(result.transitions[0].GetSource(), null);
  }
  assert.deepEqual(events.map(entry => entry.event), [
    BELIST_UNLOADSTART, BELIST_LOADFINISHED, BELIST_UNLOADSTART, BELIST_LOADFINISHED
  ]);
  for (const event of events) assert.equal(event.notify, destination);
  assert.equal(source.actions[0], action);
  assert.equal(source.transitions[0], transition);
  AssertOwned(source);
});

function TransitionGraph(t)
{
  const controller = new Tr2Controller();
  for (const name of ["alpha", "beta"])
  {
    const variable = new Tr2ControllerFloatVariable();
    variable.name = name;
    variable.defaultValue = 1;
    variable.Initialize();
    controller.variables.Append(variable);
  }
  controller.Link({});
  const source = State("source"), first = State("first"), second = State("second");
  const machine = new Tr2StateMachine();
  for (const state of [source, first, second]) machine.states.Append(state);
  machine.Link(controller);
  t.after(() => { machine.Unlink(); controller.Unlink(); ExecuteMainThreadActions(); });
  const transition = new Tr2StateMachineTransition();
  transition.name = "first";
  transition.condition = "alpha > 0";
  source.transitions.Append(transition);
  assert.equal(transition.GetDestination(), first);
  assert.equal(source._transitionVariableMask, 1n);
  return { source, first, second, transition };
}

test("mapped Transition INotify makes Copier recompile the real linked condition and refresh its destination", t =>
{
  const { source, second, transition } = TransitionGraph(t);
  const edited = new Tr2StateMachineTransition();
  edited.condition = "beta > 0";
  edited.name = "second";
  const oldProgram = transition._program, calls = [];
  Spy(transition, "OnModified", calls);
  assert.equal(new Copier().CopyTo(edited, transition), transition);
  // Check eager notification results before calling methods that can Compile.
  assert.deepEqual(calls, [["OnModified", "name"], ["OnModified", "condition"]]);
  assert.notEqual(transition._program, oldProgram);
  assert.equal(source._transitionVariableMask, 2n);
  assert.equal(transition.GetDestination(), second);
  assert.equal(transition.GetSource(), source);
  assert.equal(transition.CanActivate(2n), true);
  assert.equal(transition.CanActivate(1n), false);
  assert.equal(edited.GetSource(), null);
  assert.equal(edited._program, null);
});

test("DictReader retains explicit Transition notifications with real linked recompilation and destination lookup", t =>
{
  const { source, second, transition } = TransitionGraph(t);
  const oldProgram = transition._program, calls = [];
  Spy(transition, "OnModified", calls);
  // The existing ReadInto API takes its notify target explicitly; this does not
  // claim automatic root lifecycle selection or new reader dispatch.
  const changed = new DictReader().ReadInto(transition, { condition: "beta > 0", name: "second" }, transition);
  assert.deepEqual([...changed], ["condition", "name"]);
  assert.deepEqual(calls, [["OnModified", "condition"], ["OnModified", "name"]]);
  assert.notEqual(transition._program, oldProgram);
  assert.equal(source._transitionVariableMask, 2n);
  assert.equal(transition.GetDestination(), second);
  assert.equal(transition.GetSource(), source);
  assert.equal(transition.CanActivate(2n), true);
});

test("State labels native GetNextState and retained custom helpers without changing its model base", () =>
{
  const method = CjsSchema.getMethod(Tr2StateMachineState, "_getNextState");
  assert.equal(method.carbon.method, true);
  assert.equal(method.carbon.originalName, "GetNextState");
  assert.equal(method.impl.status, "adapted");
  const convenience = CjsSchema.getMethod(Tr2StateMachineState, "CanTransition");
  assert.equal(convenience.impl.status, "custom");
  assert.equal(convenience.carbon?.method, undefined);
  assert.equal(Object.getPrototypeOf(Tr2StateMachineState.prototype), CjsModel.prototype);
  assert.equal(Object.getPrototypeOf(Tr2StateMachineTransition.prototype), CjsModel.prototype);
  assert.equal(Object.hasOwn(Tr2StateMachineTransition.prototype, "OnModified"), true);
  assert.notEqual(Tr2StateMachineTransition.prototype.OnModified, INotify.prototype.OnModified);
});

/** Minimal authored Black framing; runtime declarations provide the schema. */
class BlackFixture
{
  strings = [];
  String(value)
  {
    let index = this.strings.indexOf(value);
    if (index === -1) { index = this.strings.length; this.strings.push(value); }
    return U16(index);
  }
  Object(id, kind = null, fields = [])
  {
    if (kind === null) return U32(id);
    const parts = [this.String(kind)];
    for (const [name, value] of fields) parts.push(Concat([this.String(name), value]));
    const body = Concat(parts);
    return Concat([U32(id), U32(body.length), body]);
  }
  Finish(root)
  {
    const parts = [U16(this.strings.length)];
    for (const value of this.strings) parts.push(Concat([new TextEncoder().encode(value), new Uint8Array(1)]));
    const strings = Concat(parts), wide = U16(0);
    return Concat([U32(0xb1acf11e), U32(1), U32(strings.length), strings, U32(wide.length), wide, root]);
  }
}
function Concat(parts)
{
  const bytes = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
  let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  return bytes;
}
function U16(value) { const bytes = new Uint8Array(2); new DataView(bytes.buffer).setUint16(0, value, true); return bytes; }
function U32(value) { const bytes = new Uint8Array(4); new DataView(bytes.buffer).setUint32(0, value, true); return bytes; }
