import assert from "node:assert/strict";
import test from "node:test";
import { Tr2ActionPython, Tr2Controller, ExecuteMainThreadActions } from "../../npm/dist/trinity/index.js";

for (const hook of ["OnLink", "OnStart", "OnStop", "OnUpdate"])
{
  test(`Python ${hook} preserves the required owner getter result`, t =>
  {
    t.after(() => ExecuteMainThreadActions());
    const action = new Tr2ActionPython();
    const controller = new Tr2Controller();
    const owners = [];
    controller.GetOwner = () => undefined;
    action._instance = { [hook]: owner => owners.push(owner) };
    action._controller = controller;
    if (hook === "OnUpdate") action.Update(0, 0);
    else action[hook.slice(2)](controller);
    ExecuteMainThreadActions();
    assert.deepEqual(owners, [undefined], "Tr2ActionPython.cpp:79-141 directly captures the owner result");
  });
}

test("Python retains optional host hooks and absent linked-controller adapters", () =>
{
  const action = new Tr2ActionPython();
  action._instance = {};
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
