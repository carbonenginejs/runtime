import test from "node:test";
import assert from "node:assert/strict";
import { EveChildAudio, EveChildContainer, EveChildSpherePin, EveChildUpdateParams, EveUpdateContext, ITr2Controller, Tr2Controller, Tr2ControllerFloatVariable, TriCurveSet } from "../../npm/dist/trinity/index.js";
import { mat4 } from "../../npm/dist/global/math/index.js";

test("audio children require the parent's transform method", () =>
{
  const child = new EveChildAudio();
  const params = new EveChildUpdateParams();
  params.childParent = new EveChildContainer();
  params.childParent.GetLocalToWorldTransform = undefined;
  assert.throws(() => child.UpdateSyncronous(new EveUpdateContext(), params), /GetLocalToWorldTransform/);
});

test("audio children consume the parent's output buffer even with a void return", () =>
{
  class VoidParent extends EveChildContainer
  {
    GetLocalToWorldTransform(out) { super.GetLocalToWorldTransform(out); }
  }
  const parent = new VoidParent();
  mat4.fromTranslation(parent.worldTransform, [4, 5, 6]);
  const child = new EveChildAudio();
  const params = new EveChildUpdateParams();
  params.childParent = parent;
  mat4.fromTranslation(params.localToWorldTransform, [90, 91, 92]);
  child.UpdateSyncronous(new EveUpdateContext(), params);
  assert.deepEqual([...child.worldTransform].slice(12, 15), [4, 5, 6]);
});

test("audio children use identity without a parent, ignoring the unrelated params transform", () =>
{
  const child = new EveChildAudio();
  const params = new EveChildUpdateParams();
  mat4.fromTranslation(params.localToWorldTransform, [90, 91, 92]);
  child.UpdateSyncronous(new EveUpdateContext(), params);
  assert.deepEqual([...child.worldTransform], [...mat4.create()]);
});

test("audio children read a concrete child parent", () =>
{
  const child = new EveChildAudio();
  const params = new EveChildUpdateParams();
  params.childParent = new EveChildContainer();
  mat4.fromTranslation(params.childParent.worldTransform, [1, 2, 3]);
  child.UpdateSyncronous(new EveUpdateContext(), params);
  assert.deepEqual([...child.worldTransform].slice(12, 15), [1, 2, 3]);
});

test("sphere pins require the update-context clock", () =>
{
  const pin = new EveChildSpherePin();
  const context = new EveUpdateContext();
  context.GetTime = undefined;
  context.currentTime = 123;
  assert.throws(() => pin.UpdateAsyncronous(context, new EveChildUpdateParams()), /GetTime/);
});

test("sphere pins forward the clock result without substituting currentTime", () =>
{
  const pin = new EveChildSpherePin();
  const context = new EveUpdateContext();
  context.GetTime = () => undefined;
  context.currentTime = 123;
  const calls = [];
  pin.curveSets.push(Object.assign(new TriCurveSet(), {
    Update__RealTimeSimTime: (real, sim) => calls.push([real, sim])
  }));
  pin.UpdateAsyncronous(context, new EveChildUpdateParams());
  assert.deepEqual(calls, [[undefined, undefined]]);
});

test("sphere pins forward legitimate zero clock values", () =>
{
  const pin = new EveChildSpherePin();
  const context = new EveUpdateContext();
  context.SetTime(0);
  const calls = [];
  pin.curveSets.push(Object.assign(new TriCurveSet(), {
    Update__RealTimeSimTime: (real, sim) => calls.push([real, sim])
  }));
  pin.UpdateAsyncronous(context, new EveChildUpdateParams());
  assert.deepEqual(calls, [[0, 0]]);
});

test("container queries cast controllers to the action interface", () =>
{
  const container = new EveChildContainer();
  const nonAction = Object.assign(new ITr2Controller(), { GetFloatVariableByName: () => 99 });
  const controller = new Tr2Controller();
  const variable = new Tr2ControllerFloatVariable();
  variable.name = "speed";
  variable.value = 0;
  controller.variables.push(variable);
  container.controllers.push(nonAction, controller);
  assert.equal(container.GetControllerValueByName("speed"), 0);
  assert.equal(container.GetControllerValueByName("absent"), null);
});

test("container queries require the action controller's float getter", () =>
{
  const container = new EveChildContainer();
  const controller = new Tr2Controller();
  controller.GetFloatVariableByName = undefined;
  container.controllers.push(controller);
  assert.throws(() => container.GetControllerValueByName("speed"), /GetFloatVariableByName/);
});

test("container range duration does not replace an invalid curve-set result with zero", () =>
{
  const container = new EveChildContainer();
  const set = new TriCurveSet();
  set.SetName("animation");
  set.GetRangeDuration = () => undefined;
  container.curveSets.push(set);
  assert.equal(container.IsUpdating(), true);
  assert.ok(Number.isNaN(container.GetRangeDuration("animation", "range")));
});

test("container range duration preserves absent-range and inactive-container zero", () =>
{
  const container = new EveChildContainer();
  const set = new TriCurveSet();
  set.SetName("animation");
  container.curveSets.push(set);
  assert.equal(container.GetRangeDuration("animation", "absent"), 0);
  container.display = false;
  container.updateOnDisplay = true;
  assert.equal(container.GetRangeDuration("animation", "absent"), 0);
});
