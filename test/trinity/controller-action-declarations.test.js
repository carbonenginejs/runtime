import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { BlueList } from "../../npm/dist/global/blue/BlueList.js";
import { Copier } from "../../npm/dist/global/blue/Copier.js";
import { DictReader } from "../../npm/dist/global/blue/DictReader.js";
import { ICustomPersist } from "../../npm/dist/global/blue/ICustomPersist.js";
import { IInitialize } from "../../npm/dist/global/blue/IInitialize.js";
import { INotify } from "../../npm/dist/global/blue/INotify.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { CjsSchema, meta } from "../../npm/dist/global/schema/index.js";
import { ITr2Updateable } from "../../npm/dist/trinity/core/ITr2Updateable.js";
import { Tr2Controller } from "../../npm/dist/trinity/controllers/Tr2Controller.js";
import { ITr2ControllerAction } from "../../npm/dist/trinity/controllers/action/ITr2ControllerAction.js";
import { Tr2ActionAnimateCurveSet } from "../../npm/dist/trinity/controllers/action/Tr2ActionAnimateCurveSet.js";
import { Tr2ActionAnimateValue } from "../../npm/dist/trinity/controllers/action/Tr2ActionAnimateValue.js";
import { Tr2ActionBindRTPC } from "../../npm/dist/trinity/controllers/action/Tr2ActionBindRTPC.js";
import { Tr2ActionCallback } from "../../npm/dist/trinity/controllers/action/Tr2ActionCallback.js";
import { Tr2ActionChildEffect } from "../../npm/dist/trinity/controllers/action/Tr2ActionChildEffect.js";
import { Tr2ActionOverlay } from "../../npm/dist/trinity/controllers/action/Tr2ActionOverlay.js";
import { Tr2ActionPlayCurveSet } from "../../npm/dist/trinity/controllers/action/Tr2ActionPlayCurveSet.js";
import { Tr2ActionPlayMeshAnimation } from "../../npm/dist/trinity/controllers/action/Tr2ActionPlayMeshAnimation.js";
import { Tr2ActionPlaySound } from "../../npm/dist/trinity/controllers/action/Tr2ActionPlaySound.js";
import { Tr2ActionPython } from "../../npm/dist/trinity/controllers/action/Tr2ActionPython.js";
import { Tr2ActionResetClipSphereCenter } from "../../npm/dist/trinity/controllers/action/Tr2ActionResetClipSphereCenter.js";
import { Tr2ActionSetAttenuationScaling } from "../../npm/dist/trinity/controllers/action/Tr2ActionSetAttenuationScaling.js";
import { Tr2ActionSetAudioEmitterPrefix } from "../../npm/dist/trinity/controllers/action/Tr2ActionSetAudioEmitterPrefix.js";
import { Tr2ActionSetAudioSwitch } from "../../npm/dist/trinity/controllers/action/Tr2ActionSetAudioSwitch.js";
import { Tr2ActionSetExternalControllerVariable } from "../../npm/dist/trinity/controllers/action/Tr2ActionSetExternalControllerVariable.js";
import { Tr2ActionSetShaderOption } from "../../npm/dist/trinity/controllers/action/Tr2ActionSetShaderOption.js";
import { Tr2ActionSetValue } from "../../npm/dist/trinity/controllers/action/Tr2ActionSetValue.js";
import { Tr2ActionSpawnParticles } from "../../npm/dist/trinity/controllers/action/Tr2ActionSpawnParticles.js";

const A = ITr2ControllerAction, U = ITr2Updateable, N = INotify, I = IInitialize, P = ICustomPersist;

// Expected additional bases and ordered Blue tables are independent of runtime
// metadata: trinity/Controllers/Actions/*.{h,_Blue.cpp}. These declarations do
// not qualify action algorithms or the custom-persistence buffer adaptation.
const cases = [
  {
    name: "Tr2ActionAnimateCurveSet", Type: Tr2ActionAnimateCurveSet, modelFree: true, nominal: [A, U, N], query: [Tr2ActionAnimateCurveSet, A, U, N],
    own: ["Link", "Unlink", "Start", "Stop", "RebaseSimTime", "Update", "OnModified"]
  },
  {
    name: "Tr2ActionAnimateValue", Type: Tr2ActionAnimateValue, modelFree: true, nominal: [A, U, N], query: [Tr2ActionAnimateValue, A, U, N],
    own: ["Link", "Unlink", "Start", "Stop", "RebaseSimTime", "Update", "OnModified"]
  },
  {
    name: "Tr2ActionBindRTPC", Type: Tr2ActionBindRTPC, modelFree: true, nominal: [A, U, N], query: [Tr2ActionBindRTPC, A, U, N],
    own: ["Link", "Unlink", "Start", "Stop", "Update", "OnModified"]
  },
  {
    name: "Tr2ActionCallback", Type: Tr2ActionCallback, modelFree: true, nominal: [A], query: [Tr2ActionCallback, A],
    own: ["Start"]
  },
  {
    name: "Tr2ActionChildEffect", Type: Tr2ActionChildEffect, modelFree: true, nominal: [A], query: [Tr2ActionChildEffect, A],
    own: ["Link", "Start", "Stop"]
  },
  {
    name: "Tr2ActionOverlay", Type: Tr2ActionOverlay, modelFree: true, nominal: [A], query: [Tr2ActionOverlay, A],
    own: ["Start", "Stop"]
  },
  {
    name: "Tr2ActionPlayCurveSet", Type: Tr2ActionPlayCurveSet, modelFree: true, nominal: [A, U], query: [Tr2ActionPlayCurveSet, A],
    own: ["Start", "Stop", "RebaseSimTime", "CanTransition", "Update"]
  },
  {
    name: "Tr2ActionPlayMeshAnimation", Type: Tr2ActionPlayMeshAnimation, modelFree: true, nominal: [A, N], query: [Tr2ActionPlayMeshAnimation, A, N],
    own: ["Link", "Unlink", "Start", "Stop", "OnModified"]
  },
  {
    name: "Tr2ActionPlaySound", Type: Tr2ActionPlaySound, modelFree: true, nominal: [A], query: [Tr2ActionPlaySound, A],
    own: ["Start"]
  },
  {
    name: "Tr2ActionPython", Type: Tr2ActionPython, modelFree: true, nominal: [A, U, N, I, P], query: [Tr2ActionPython, A, U, N, I, P],
    own: ["Initialize", "OnModified", "Link", "Unlink", "Start", "Stop", "Update",
      "GetWriteBufferAndSize", "ReleaseWriteBuffer", "AllocateReadBuffer", "SetBufferAndSize"]
  },
  {
    name: "Tr2ActionResetClipSphereCenter", Type: Tr2ActionResetClipSphereCenter, modelFree: true, nominal: [A], query: [Tr2ActionResetClipSphereCenter, A],
    own: ["Start"]
  },
  {
    name: "Tr2ActionSetAttenuationScaling", Type: Tr2ActionSetAttenuationScaling, modelFree: true, nominal: [A], query: [Tr2ActionSetAttenuationScaling, A],
    own: ["Link", "Unlink", "Start"]
  },
  {
    name: "Tr2ActionSetAudioEmitterPrefix", Type: Tr2ActionSetAudioEmitterPrefix, modelFree: true, nominal: [A], query: [Tr2ActionSetAudioEmitterPrefix, A],
    own: ["Start"]
  },
  {
    name: "Tr2ActionSetAudioSwitch", Type: Tr2ActionSetAudioSwitch, modelFree: true, nominal: [A], query: [Tr2ActionSetAudioSwitch, A],
    own: ["Start"]
  },
  {
    name: "Tr2ActionSetExternalControllerVariable", Type: Tr2ActionSetExternalControllerVariable, modelFree: true, nominal: [A, N], query: [Tr2ActionSetExternalControllerVariable, A, N],
    own: ["Link", "Unlink", "Start", "OnModified"]
  },
  {
    name: "Tr2ActionSetShaderOption", Type: Tr2ActionSetShaderOption, modelFree: true, nominal: [A], query: [Tr2ActionSetShaderOption, A],
    own: ["Start"]
  },
  {
    name: "Tr2ActionSetValue", Type: Tr2ActionSetValue, modelFree: true, nominal: [A, N], query: [Tr2ActionSetValue, A, N],
    own: ["Link", "Unlink", "Start", "OnModified"]
  },
  {
    name: "Tr2ActionSpawnParticles", Type: Tr2ActionSpawnParticles, modelFree: true, nominal: [A], query: [Tr2ActionSpawnParticles, A],
    own: ["Start"]
  }
];

const interfaceNames = new Map([
  [A, "ITr2ControllerAction"], [U, "ITr2Updateable"], [N, "INotify"],
  [I, "IInitialize"], [P, "ICustomPersist"], ...cases.map(({Type, name}) => [Type, name])
]);

for (const { name, Type, nominal, query, modelFree = false } of cases)
{
  test(`${name} has its exact ordered query table and nominal native contracts`, () =>
  {
    const item = new Type();
    assert.deepEqual([...mappedInterfaces(Type)], query);
    assert.equal(CjsSchema.GetConstructor(name), Type);
    assert.equal(CjsSchema.cast(item, Type), item);
    assert.equal("GetValues" in item, false);
    for (const Interface of [A, U, N, I, P])
      assert.equal(CjsSchema.cast(item, Interface), nominal.includes(Interface) ? item : null, interfaceNames.get(Interface));
  });

  // Keep admission reachable independently of the table equality assertion.
  test(`${name} is admitted by the native action-interface list without replacement`, () =>
  {
    const item = new Type();
    const list = new BlueList(ITr2ControllerAction, { className: null, listOps: 0 });
    const info = {};
    list.GetInfo(info);
    assert.deepEqual(info, { iid: ITr2ControllerAction, clsid: null, listOps: 0, notify: null });
    assert.equal(list.Append(item), true);
    assert.equal(list.GetSize(), 1);
    assert.equal(list.GetAt(0), item);
    assert.equal(item.constructor, Type);
    list.GetInfo(info);
    assert.equal(info.notify, null);
  });
}

test("each concrete action exposes its own identity independently of action-interface admission", () =>
{
  for (const { name, Type } of cases)
  {
    const list = new BlueList(Type, { className: name, listOps: 0 });
    const item = new Type();
    assert.equal(list.Append(item), true, name);
    assert.equal(list.GetAt(0), item);
    const Other = Type === Tr2ActionCallback ? Tr2ActionPlaySound : Tr2ActionCallback;
    assert.equal(list.Append(new Other()), false, `${name} must reject another action's self identity`);
    assert.equal(list.GetSize(), 1);
  }
});

test("the action-interface list rejects nominal-only, duck, null and wrong-child objects", () =>
{
  class UnexposedControllerAction extends Tr2ActionCallback {}
  CjsSchema.define(UnexposedControllerAction, { className: "ControllerActionDeclarationsUnexposed" });
  meta.blue.interfaceTable({ interfaces: [], chainTo: null })(UnexposedControllerAction);
  const nominalOnly = new UnexposedControllerAction();
  assert.equal(CjsSchema.cast(nominalOnly, Tr2ActionCallback), nominalOnly);
  assert.equal(CjsSchema.cast(nominalOnly, ITr2ControllerAction), nominalOnly);
  assert.deepEqual([...mappedInterfaces(UnexposedControllerAction)], []);

  const list = new BlueList(ITr2ControllerAction, { className: null, listOps: 0 });
  const accepted = new Tr2ActionCallback();
  assert.equal(list.Append(accepted), true);
  for (const rejected of [nominalOnly, {
    Link() {}, Unlink() {}, Start() {}, Stop() {}, RebaseSimTime() {}, CanTransition() { return true; }
  }, null, new Tr2Controller()])
  {
    assert.equal(list.Append(rejected), false);
    assert.equal(list.GetSize(), 1);
    assert.equal(list.GetAt(0), accepted);
  }
});

test("PlayCurveSet is nominally updateable without exposing the updateable query identity", () =>
{
  const item = new Tr2ActionPlayCurveSet();
  assert.equal(CjsSchema.cast(item, ITr2Updateable), item);
  assert.equal(mappedInterfaces(Tr2ActionPlayCurveSet).has(ITr2Updateable), false);
  const updates = new BlueList(ITr2Updateable, { className: null, listOps: 0 });
  const exposed = new Tr2ActionAnimateCurveSet();
  assert.equal(updates.Append(exposed), true);
  assert.equal(updates.Append(item), false);
  assert.equal(updates.GetSize(), 1);
  assert.equal(updates.GetAt(0), exposed);
  const actions = new BlueList(ITr2ControllerAction, { className: null, listOps: 0 });
  assert.equal(actions.Append(item), true);
  assert.equal(actions.GetAt(0), item);
});

test("native nominal additions preserve every existing concrete contract override", () =>
{
  for (const { name, Type, nominal, own } of cases)
  {
    for (const method of own)
    {
      const descriptor = Object.getOwnPropertyDescriptor(Type.prototype, method);
      assert.equal(typeof descriptor?.value, "function", `${name}.${method} remains its own method`);
      assert.notEqual(CjsSchema.getMethod(Type, method)?.impl?.status, "abstract", `${name}.${method}`);
      for (const Interface of nominal)
      {
        if (Object.hasOwn(Interface.prototype, method))
          assert.notEqual(descriptor.value, Interface.prototype[method], `${name}.${method} must not be the contract default`);
      }
    }
  }
});

/** Record calls while executing the concrete implementation and restore it. */
function observeMethod(t, object, method)
{
  const descriptor = Object.getOwnPropertyDescriptor(object, method);
  const original = object[method];
  const calls = [];
  Object.defineProperty(object, method, {
    configurable: true, writable: true,
    value(...args)
    {
      calls.push({ receiver: this, args });
      return Reflect.apply(original, this, args);
    }
  });
  t.after(() =>
  {
    if (descriptor) Object.defineProperty(object, method, descriptor);
    else delete object[method];
  });
  return calls;
}

test("Copier dispatches mapped SetValue notifications to the concrete expression recompilation", t =>
{
  const controller = new Tr2Controller();
  const source = new Tr2ActionSetValue();
  source.value = "7";
  source.delayBinding = true;
  const destination = new Tr2ActionSetValue();
  destination.value = "1";
  destination.delayBinding = true;
  destination.Link(controller);
  t.after(() => destination.Unlink());
  assert.equal(destination.IsExpressionValid(), true);
  assert.equal(destination.GetValue(), 1);
  const notifications = observeMethod(t, destination, "OnModified");

  assert.equal(new Copier().CopyTo(source, destination), destination);
  assert.deepEqual(notifications.map(call => call.args), [["value"]]);
  assert.equal(notifications[0].receiver, destination);
  assert.equal(destination.IsExpressionValid(), true);
  assert.equal(destination.GetValue(), 7);
  assert.equal(source.value, "7");
  assert.equal(source.IsExpressionValid(), false, "copying must not link or initialize the source");
});

test("Copier runs the concrete Python Initialize after copying fields and suppresses member notifications", t =>
{
  const source = new Tr2ActionPython();
  source.module = "controller_action_test";
  source.className = "HostAction";
  source.state = Uint8Array.of(3, 5, 8);
  const destination = new Tr2ActionPython();
  const initializes = observeMethod(t, destination, "Initialize");
  const notifications = observeMethod(t, destination, "OnModified");
  const factories = [], loads = [];
  const host = { OnLoad(bytes) { loads.push(bytes); } };
  const previousFactory = Tr2ActionPython.registerFactory((moduleName, className, action) =>
  {
    factories.push({ moduleName, className, action, state: [...action.state] });
    return host;
  });
  t.after(() => Tr2ActionPython.registerFactory(previousFactory));

  assert.equal(new Copier().CopyTo(source, destination), destination);
  assert.equal(initializes.length, 1);
  assert.equal(initializes[0].receiver, destination);
  assert.deepEqual(initializes[0].args, []);
  assert.deepEqual(notifications, []);
  assert.equal(factories.length, 1);
  assert.equal(factories[0].action, destination);
  assert.equal(factories[0].moduleName, "controller_action_test");
  assert.equal(factories[0].className, "HostAction");
  assert.deepEqual(factories[0].state, [3, 5, 8]);
  assert.notEqual(destination.state, source.state);
  assert.notEqual(destination.state.buffer, source.state.buffer);
  assert.equal(loads.length, 1);
  assert.equal(loads[0], destination.state);
  // GetInstance lazily creates a host, so inspect all dispatch evidence first.
  // Do not call it on the source: that would initialize the source in this test.
  assert.equal(destination.GetInstance(), host);
  assert.equal(factories.length, 1);
  assert.equal(loads.length, 1);
  destination.state[0] = 99;
  assert.deepEqual([...source.state], [3, 5, 8]);
  // This exercises the existing Initialize/OnLoad adaptation, not custom binary
  // persistence dispatch or the native output-pointer representation.
});

test("DictReader ReadInto retains its explicit notification seam with the real SetValue method", t =>
{
  const controller = new Tr2Controller();
  const action = new Tr2ActionSetValue();
  action.delayBinding = true;
  action.value = "2";
  action.Link(controller);
  t.after(() => action.Unlink());
  assert.equal(action.GetValue(), 2);
  const notifications = observeMethod(t, action, "OnModified");

  // ReadInto receives its notify target explicitly; it does not select a root
  // INotify or IInitialize implementation from these new query declarations.
  const changed = new DictReader().ReadInto(action, { value: "11" }, action);
  assert.deepEqual([...changed], ["value"]);
  assert.deepEqual(notifications.map(call => call.args), [["value"]]);
  assert.equal(notifications[0].receiver, action);
  assert.equal(action.GetValue(), 11);
});

test("all action null-chain tables isolate a temporary native parent query mapping", () =>
{
  const moduleURL = path => new URL(`../../npm/dist/${path}`, import.meta.url).href;
  // Serialize only the independent expectations above, never runtime metadata.
  const expected = cases.map(({ name, Type, query, modelFree = false }) => ({
    modelFree,
    name: name,
    url: moduleURL(`trinity/controllers/action/${name}.js`),
    query: query.map(Interface => interfaceNames.get(Interface))
  }));
  execFileSync(process.execPath, [
    ...process.execArgv, "--input-type=module", "--eval", `
      import assert from "node:assert/strict";
      import { meta, CjsSchema } from ${JSON.stringify(moduleURL("global/schema/index.js"))};
      import { mappedInterfaces } from ${JSON.stringify(moduleURL("global/compose/interface.js"))};
            import { ICustomPersist } from ${JSON.stringify(moduleURL("global/blue/ICustomPersist.js"))};
      import { IInitialize } from ${JSON.stringify(moduleURL("global/blue/IInitialize.js"))};
      import { INotify } from ${JSON.stringify(moduleURL("global/blue/INotify.js"))};
      import { ITr2Updateable } from ${JSON.stringify(moduleURL("trinity/core/ITr2Updateable.js"))};
      import { ITr2ControllerAction } from ${JSON.stringify(moduleURL("trinity/controllers/action/ITr2ControllerAction.js"))};
      class ParentOnlyInterface {}
      const contracts = { ICustomPersist, IInitialize, INotify, ITr2Updateable, ITr2ControllerAction };
      for (const row of ${JSON.stringify(expected)})
      {
        const module = await import(row.url);
        const Type = module[row.name];
        const Parent = Object.getPrototypeOf(Type);
        if (Parent.prototype) meta.blue.mapInterface(ParentOnlyInterface)(Parent);
        const expectedTable = row.query.map(name => name === row.name ? Type : contracts[name]);
        assert.deepEqual([...mappedInterfaces(Type)], expectedTable, row.name);
        assert.equal(mappedInterfaces(Type).has(ParentOnlyInterface), false, row.name);
        const item = new Type();
        assert.equal("GetValues" in item, false);
      }
    `
  ], { encoding: "utf8", timeout: 30000, windowsHide: true });
});
