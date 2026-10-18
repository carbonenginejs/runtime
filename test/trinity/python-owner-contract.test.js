import assert from "node:assert/strict";
import test from "node:test";
import { Tr2ActionPython, Tr2Controller, ExecuteMainThreadActions } from "../../npm/dist/trinity/index.js";

// A real host instance, made through the registered factory so Initialize
// extracts its hooks the way Carbon's InstantiateObject does.
function ActionWithHost(t, host)
{
  const previous = Tr2ActionPython.registerFactory(() => host);
  t.after(() => Tr2ActionPython.registerFactory(previous));
  const action = new Tr2ActionPython();
  action.module = "python_owner_contract";
  action.className = "HostAction";
  action.Initialize();
  return action;
}

for (const hook of ["OnLink", "OnStart", "OnStop", "OnUpdate"])
{
  test(`Python ${hook} preserves the required owner getter result`, t =>
  {
    t.after(() => ExecuteMainThreadActions());
    const owners = [];
    const action = ActionWithHost(t, { [hook]: owner => owners.push(owner) });
    const controller = new Tr2Controller();
    controller.GetOwner = () => undefined;
    action._controller = controller;
    if (hook === "OnUpdate") action.Update(0, 0);
    else action[hook.slice(2)](controller);
    ExecuteMainThreadActions();
    assert.deepEqual(owners, [undefined], "Tr2ActionPython.cpp:79-141 directly captures the owner result");
  });
}

test("Python retains optional host hooks and absent linked-controller adapters", t =>
{
  const action = ActionWithHost(t, {});
  const controller = new Tr2Controller();
  controller.GetOwner = () => assert.fail("Absent hooks need no owner");
  action.Link(controller);
  action.Start(controller);
  action.Update(0, 0);
  action.Stop(controller);
  action.Unlink();
  action.Start();
  action.Stop();
  action.Update(0, 0);
  assert.equal(action.GetWriteBufferAndSize(), null);
  ExecuteMainThreadActions();
});
