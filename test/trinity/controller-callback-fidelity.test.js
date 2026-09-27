import test from "node:test";
import assert from "node:assert/strict";
import { Tr2Controller } from "../../npm/dist/trinity/controllers/Tr2Controller.js";
import { Tr2TimelineController } from "../../npm/dist/trinity/controllers/timeline/Tr2TimelineController.js";
import { Tr2ActionSetExternalControllerVariable } from "../../npm/dist/trinity/controllers/action/Tr2ActionSetExternalControllerVariable.js";
import { TriCurveSet } from "../../npm/dist/trinity/curves/TriCurveSet.js";

for (const Constructor of [Tr2Controller, Tr2TimelineController])
{
  test(`${Constructor.name} reports failed callbacks and continues matching dispatch`, t =>
  {
    const controller = new Constructor();
    const reports = [], calls = [];
    t.mock.method(console, "error", (...args) => reports.push(args));
    controller.RegisterCallback("", () =>
    {
      calls.push("first");
      throw null;
    });
    controller.RegisterCallback("", () => calls.push("second"));
    controller.RegisterCallback("other", () => calls.push("wrong"));
    assert.equal(controller.Callback(""), false);
    controller.isPlaying = true;
    assert.equal(controller.Callback(""), true);
    assert.deepEqual(calls, ["first", "second"]);
    assert.equal(reports.length, 1);
    assert.equal(reports[0].at(-1), null);
    controller.isPlaying = false;
    assert.equal(controller.Callback(""), false);
    assert.equal(calls.length, 2);
  });
}

test("callback count is computed and read-only", () =>
{
  const controller = new Tr2Controller();
  assert.equal(controller.callbackCount, 0);
  controller.RegisterCallback("", () =>
  {
  });
  controller.RegisterCallback("", () =>
  {
  });
  assert.equal(controller.callbackCount, 2);
  assert.equal(controller.GetCallbackCount(), 2);
  assert.throws(() =>
  {
    controller.callbackCount = 100;
  }, TypeError);
  controller.ClearCallbacks();
  assert.equal(controller.callbackCount, 0);
});

for (const wrapped of [false, true])
{
  test(`curve-set stop cleans up a throwing ${wrapped ? "wrapper" : "function"} and completes playback`, t =>
  {
    const reports = [];
    t.mock.method(console, "error", (...args) => reports.push(args));
    let calls = 0, destroys = 0;
    const callback = () =>
    {
      calls++;
      throw false;
    };
    const value = new TriCurveSet();
    value.PlayFrom(0);
    value.StopAfterWithCallback(1, wrapped ? {
      CallVoid: callback,
      Destroy()
      {
        destroys++;
      }
    } : callback);
    value.Update(30);
    value.Update(32);
    value.Update(33);
    assert.equal(calls, 1);
    assert.equal(destroys, wrapped ? 1 : 0);
    assert.equal(value.IsPlaying(), false);
    assert.equal(value._callback, null);
    assert.equal(value._stopOnNextFrame, false);
    assert.equal(reports.length, 1);
    assert.equal(reports[0].at(-1), false);
  });
}

test("curve stop releases a replacement callback installed during invocation", () =>
{
  const value = new TriCurveSet();
  let invoked = 0, destroyed = 0;
  value.PlayFrom(0);
  value.StopAfterWithCallback(1, () =>
  {
    value.StopAfterWithCallback(10, {
      CallVoid()
      {
        invoked++;
      },
      Destroy()
      {
        destroyed++;
      }
    });
  });
  value.Update(30);
  value.Update(32);
  assert.equal(invoked, 0);
  assert.equal(destroyed, 1);
  assert.equal(value._callback, null);
  assert.equal(value.IsPlaying(), false);
});

test("external variable action starts before sampling and forwards empty variable names", () =>
{
  const events = [];
  let source = 1;
  const destination = {
    StartControllers()
    {
      events.push("start");
      source = 7;
    },
    SetControllerVariable(name, value)
    {
      events.push([name, value]);
    }
  };
  const controller = {
    GetOwner()
    {
      return { GetBindingRoots: () => [["Child", destination]] };
    },
    GetFloatVariableByName()
    {
      events.push("read");
      return source;
    }
  };
  const action = new Tr2ActionSetExternalControllerVariable();
  action.destinationOwner = "child";
  action.startControllers = true;
  action.sourceVariable = "input";
  action.value = 5;
  action.Link(controller);
  action.Start();
  assert.deepEqual(events, ["start", "read", ["", 7]]);
  action.startControllers = false;
  for (source of [undefined, 0, Infinity, NaN])
  {
    events.length = 0;
    action.Start();
    assert.deepEqual(events, ["read", ["", source ?? 5]]);
  }
});
