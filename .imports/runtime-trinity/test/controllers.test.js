import test from "node:test";
import { BELIST_INSERTED, BELIST_REMOVED, CjsControllerExpressionProgram, EveChildUpdateParams, ITr2GenericEmitter, TR2_DIRTY_ALL, Tr2ActionAnimateCurveSet, Tr2ActionAnimateValue, Tr2ActionBindRTPC, Tr2ActionCallback, Tr2ActionChildEffect, Tr2ActionOverlay, Tr2ActionPlayCurveSet, Tr2ActionPlayMeshAnimation, Tr2ActionPlaySound, Tr2ActionPython, Tr2ActionResetClipSphereCenter, Tr2ActionSetAttenuationScaling, Tr2ActionSetAudioEmitterPrefix, Tr2ActionSetAudioSwitch, Tr2ActionSetExternalControllerVariable, Tr2ActionSetShaderOption, Tr2ActionSetValue, Tr2ActionSpawnParticles, Tr2BindingPoint, Tr2Controller, Tr2ControllerEventHandler, Tr2ControllerExpression, Tr2ControllerFloatVariable, Tr2ControllerReference, Tr2StateMachine, Tr2StateMachineState, Tr2StateMachineTransition, Tr2SyncToAnimation, Tr2TimelineController, PlayAction, ResetBehavior, StopAction, Type } from "../npm/dist/index.js";
import { CjsSchema } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";


function assert(condition, message = "assertion failed")
{
  if (!condition)
  {
    throw new Error(message);
  }
}
function assertEquals(actual, expected, message)
{
  if (actual !== expected)
  {
    throw new Error(message || `expected ${String(expected)}, got ${String(actual)}`);
  }
}
function assertAlmostEquals(actual, expected, epsilon = 1e-6)
{
  if (Math.abs(actual - expected) > epsilon)
  {
    throw new Error(`expected ${expected}, got ${actual}`);
  }
}
function assertThrows(fn, messageIncludes)
{
  try
  {
    fn();
  }
  catch (error)
  {
    if (error instanceof Error && error.message.includes(messageIncludes))
    {
      return;
    }
    throw error;
  }
  throw new Error("expected function to throw");
}
test("controller methods expose source-backed Carbon metadata", () =>
{
  new Tr2Controller();
  new Tr2ControllerEventHandler();
  new Tr2ControllerFloatVariable();
  new Tr2StateMachine();
  new Tr2StateMachineState();
  new Tr2StateMachineTransition();
  new Tr2ActionSetExternalControllerVariable();
  new Tr2BindingPoint();
  new Tr2ControllerExpression();
  const sourceBackedMethods = [[Tr2Controller, "OnListModified", "implemented"], [Tr2Controller, "Link", "implemented"], [Tr2Controller, "Unlink", "implemented"], [Tr2Controller, "ReLink", "implemented"], [Tr2Controller, "IsLinked", "implemented"], [Tr2Controller, "Start", "implemented"], [Tr2Controller, "Stop", "implemented"], [Tr2Controller, "Update", "adapted"], [Tr2Controller, "SetVariable", "implemented"], [Tr2Controller, "HandleEvent", "implemented"], [Tr2Controller, "GetOwner", "implemented"], [Tr2Controller, "GetVariableByName", "implemented"], [Tr2Controller, "GetFloatVariableByName", "implemented"], [Tr2Controller, "GetExpressionTermInfo", "implemented"], [Tr2Controller, "GetVariables", "implemented"], [Tr2Controller, "GetVariableView", "implemented"], [Tr2Controller, "GetVariableBuffer", "implemented"], [Tr2Controller, "EnsureTempArenaSize", "implemented"], [Tr2Controller, "GetTempArena", "implemented"], [Tr2Controller, "GetBindingPathRoots", "adapted"], [Tr2Controller, "RegisterUpdateable", "implemented"], [Tr2Controller, "UnRegisterUpdateable", "implemented"], [Tr2Controller, "Callback", "adapted"], [Tr2Controller, "RegisterCallback", "adapted"], [Tr2Controller, "ClearCallbacks", "implemented"], [Tr2ControllerEventHandler, "OnListModified", "implemented"], [Tr2ControllerEventHandler, "Link", "implemented"], [Tr2ControllerEventHandler, "Unlink", "implemented"], [Tr2ControllerEventHandler, "GetName", "implemented"], [Tr2ControllerEventHandler, "Execute", "implemented"], [Tr2ControllerFloatVariable, "Initialize", "implemented"], [Tr2ControllerFloatVariable, "OnModified", "implemented"], [Tr2ControllerFloatVariable, "GetName", "implemented"], [Tr2ControllerFloatVariable, "GetValue", "implemented"], [Tr2ControllerFloatVariable, "SetValue", "implemented"], [Tr2ControllerFloatVariable, "SetDestinationBuffer", "adapted"], [Tr2ControllerFloatVariable, "SetDirtyMask", "adapted"], [Tr2StateMachine, "OnListModified", "implemented"], [Tr2StateMachine, "OnModified", "implemented"], [Tr2StateMachine, "OnSimClockRebase", "adapted"], [Tr2StateMachine, "Link", "implemented"], [Tr2StateMachine, "Unlink", "implemented"], [Tr2StateMachine, "Start", "adapted"], [Tr2StateMachine, "Stop", "implemented"], [Tr2StateMachine, "Update", "adapted"], [Tr2StateMachine, "GetController", "implemented"], [Tr2StateMachine, "GetStateByName", "implemented"], [Tr2StateMachine, "GetMachineRunTime", "adapted"], [Tr2StateMachine, "GetStateRunTime", "adapted"], [Tr2StateMachineState, "OnModified", "implemented"], [Tr2StateMachineState, "OnListModified", "implemented"], [Tr2StateMachineState, "Link", "adapted"], [Tr2StateMachineState, "Unlink", "implemented"], [Tr2StateMachineState, "Start", "adapted"], [Tr2StateMachineState, "Stop", "adapted"], [Tr2StateMachineState, "Update", "adapted"], [Tr2StateMachineState, "RebaseSimTime", "implemented"], [Tr2StateMachineState, "GetStateMachine", "implemented"], [Tr2StateMachineState, "GetName", "implemented"], [Tr2StateMachineState, "UpdateVariableMask", "implemented"], [Tr2StateMachineTransition, "OnModified", "adapted"], [Tr2StateMachineTransition, "Link", "adapted"], [Tr2StateMachineTransition, "Unlink", "adapted"], [Tr2StateMachineTransition, "CanActivate", "adapted"], [Tr2StateMachineTransition, "GetVariableMask", "adapted"], [Tr2StateMachineTransition, "GetDestination", "adapted"], [Tr2StateMachineTransition, "GetSource", "adapted"], [Tr2StateMachineTransition, "GetState", "adapted"], [Tr2StateMachineTransition, "IsConditionValid", "adapted"], [Tr2StateMachineTransition, "IsExpressionValid", "adapted"], [Tr2StateMachineTransition, "EvaluateExpression", "adapted"], [Tr2StateMachineTransition, "GetExpressionTermInfo", "adapted"]];
  for (const [ctor, methodName, status] of sourceBackedMethods)
  {
    assertCarbonMethod(ctor, methodName, status);
  }
  const jsOnlyMethods = [[Tr2Controller, "GetTime"], [Tr2Controller, "GetVariableValue"], [Tr2Controller, "SetVariableValue"], [Tr2Controller, "GetExpressionContext"], [Tr2StateMachine, "GetCurrentState"], [Tr2StateMachine, "GetState"], [Tr2StateMachine, "GetStateTime"], [Tr2StateMachineState, "CanTransition"], [Tr2StateMachineTransition, "Compile"], [Tr2StateMachineTransition, "GetVariableNames"], [Tr2StateMachineTransition, "GetFunctionNames"]];
  for (const [ctor, methodName] of jsOnlyMethods)
  {
    assertEquals(CjsSchema.getMethod(ctor, methodName), null);
  }
  assertEquals(CjsSchema.getField(Tr2ActionSetExternalControllerVariable, "destination")?.type.kind, "objectRef");
  assertEquals(CjsSchema.getField(Tr2BindingPoint, "resolvedObject")?.type.kind, "objectRef");
  assertEquals(CjsSchema.getField(Tr2BindingPoint, "notifyPtr")?.type.kind, "objectRef");
  assertEquals(CjsSchema.getField(Tr2ControllerExpression, "OWNER_BUFFER_INDEX"), null);
  assertEquals(Tr2ControllerExpression.OWNER_BUFFER_INDEX, 1);
  assertEquals(Tr2ControllerExpression.STATE_MACHINE_BUFFER_INDEX, 2);
  assertEquals(Tr2ControllerExpression.EXTRA_BUFFER_INDEX, 3);
});
test("promoted controller families expose source-backed Carbon metadata", () =>
{
  const constructors = [Tr2ActionAnimateCurveSet, Tr2ActionAnimateValue, Tr2ActionBindRTPC, Tr2ActionCallback, Tr2ActionChildEffect, Tr2ActionOverlay, Tr2ActionPlayCurveSet, Tr2ActionPlayMeshAnimation, Tr2ActionPlaySound, Tr2ActionPython, Tr2ActionResetClipSphereCenter, Tr2ActionSetAttenuationScaling, Tr2ActionSetAudioEmitterPrefix, Tr2ActionSetAudioSwitch, Tr2ActionSetExternalControllerVariable, Tr2ActionSetShaderOption, Tr2ActionSetValue, Tr2ActionSpawnParticles, Tr2BindingPoint, Tr2ControllerExpression, Tr2ControllerReference, Tr2SyncToAnimation, Tr2TimelineController];
  for (const ctor of constructors)
  {
    new ctor();
  }
  assertEquals(CjsSchema.GetConstructor("Tr2Controller"), Tr2Controller);
  assertEquals(CjsSchema.GetConstructor("Tr2ActionPython"), Tr2ActionPython);
  const sourceBackedMethods = [[Tr2ActionAnimateCurveSet, "Link", "adapted"], [Tr2ActionAnimateCurveSet, "Unlink", "implemented"], [Tr2ActionAnimateCurveSet, "Start", "adapted"], [Tr2ActionAnimateCurveSet, "Stop", "implemented"], [Tr2ActionAnimateCurveSet, "RebaseSimTime", "implemented"], [Tr2ActionAnimateCurveSet, "Update", "adapted"], [Tr2ActionAnimateCurveSet, "OnModified", "adapted"], [Tr2ActionAnimateCurveSet, "IsExpressionValid", "implemented"], [Tr2ActionAnimateCurveSet, "GetExpressionTermInfo", "adapted"], [Tr2ActionAnimateCurveSet, "EvaluateExpression", "adapted"], [Tr2ActionAnimateValue, "Link", "adapted"], [Tr2ActionAnimateValue, "Unlink", "implemented"], [Tr2ActionAnimateValue, "Start", "adapted"], [Tr2ActionAnimateValue, "Stop", "implemented"], [Tr2ActionAnimateValue, "RebaseSimTime", "implemented"], [Tr2ActionAnimateValue, "Update", "adapted"], [Tr2ActionAnimateValue, "OnModified", "adapted"], [Tr2ActionAnimateValue, "IsBindingValid", "implemented"], [Tr2ActionAnimateValue, "IsExpressionValid", "implemented"], [Tr2ActionAnimateValue, "GetCurveValue", "adapted"], [Tr2ActionAnimateValue, "GetDestination", "implemented"], [Tr2ActionAnimateValue, "GetExpressionTermInfo", "adapted"], [Tr2ActionAnimateValue, "EvaluateExpression", "adapted"], [Tr2ActionBindRTPC, "Link", "adapted"], [Tr2ActionBindRTPC, "Unlink", "implemented"], [Tr2ActionBindRTPC, "Start", "adapted"], [Tr2ActionBindRTPC, "StartWithController", "implemented"], [Tr2ActionBindRTPC, "Stop", "implemented"], [Tr2ActionBindRTPC, "StopWithController", "implemented"], [Tr2ActionBindRTPC, "Update", "adapted"], [Tr2ActionBindRTPC, "OnModified", "adapted"], [Tr2ActionBindRTPC, "IsExpressionValid", "implemented"], [Tr2ActionBindRTPC, "GetCurveValue", "adapted"], [Tr2ActionBindRTPC, "GetExpressionTermInfo", "adapted"], [Tr2ActionBindRTPC, "EvaluateExpression", "adapted"], [Tr2ActionCallback, "Start", "implemented"], [Tr2ActionChildEffect, "Link", "noop"], [Tr2ActionChildEffect, "Start", "adapted"], [Tr2ActionChildEffect, "Stop", "adapted"], [Tr2ActionOverlay, "Start", "adapted"], [Tr2ActionOverlay, "Stop", "adapted"], [Tr2ActionPlayCurveSet, "Start", "adapted"], [Tr2ActionPlayCurveSet, "Stop", "adapted"], [Tr2ActionPlayCurveSet, "RebaseSimTime", "implemented"], [Tr2ActionPlayCurveSet, "CanTransition", "adapted"], [Tr2ActionPlayCurveSet, "Update", "implemented"], [Tr2ActionPlayMeshAnimation, "Link", "adapted"], [Tr2ActionPlayMeshAnimation, "Unlink", "implemented"], [Tr2ActionPlayMeshAnimation, "Start", "adapted"], [Tr2ActionPlayMeshAnimation, "Stop", "adapted"], [Tr2ActionPlayMeshAnimation, "OnModified", "adapted"], [Tr2ActionPlayMeshAnimation, "IsBindingValid", "adapted"], [Tr2ActionPlayMeshAnimation, "GetDestination", "adapted"], [Tr2ActionPlaySound, "Start", "adapted"], [Tr2ActionPlaySound, "StartWithController", "implemented"], [Tr2ActionPython, "Initialize", "adapted"], [Tr2ActionPython, "OnModified", "adapted"], [Tr2ActionPython, "Link", "adapted"], [Tr2ActionPython, "Unlink", "adapted"], [Tr2ActionPython, "Start", "adapted"], [Tr2ActionPython, "Stop", "adapted"], [Tr2ActionPython, "Update", "adapted"], [Tr2ActionPython, "GetInstance", "adapted"], [Tr2ActionPython, "GetWriteBufferAndSize", "adapted"], [Tr2ActionPython, "ReleaseWriteBuffer", "adapted"], [Tr2ActionPython, "AllocateReadBuffer", "adapted"], [Tr2ActionPython, "SetBufferAndSize", "adapted"], [Tr2ActionResetClipSphereCenter, "Start", "adapted"], [Tr2ActionSetAttenuationScaling, "Link", "adapted"], [Tr2ActionSetAttenuationScaling, "Unlink", "implemented"], [Tr2ActionSetAttenuationScaling, "Start", "adapted"], [Tr2ActionSetAttenuationScaling, "StartWithController", "implemented"], [Tr2ActionSetAttenuationScaling, "GetScalingFactor", "adapted"], [Tr2ActionSetAudioEmitterPrefix, "Start", "adapted"], [Tr2ActionSetAudioEmitterPrefix, "StartWithController", "implemented"], [Tr2ActionSetAudioSwitch, "Start", "adapted"], [Tr2ActionSetAudioSwitch, "StartWithController", "implemented"], [Tr2ActionSetExternalControllerVariable, "Link", "adapted"], [Tr2ActionSetExternalControllerVariable, "Unlink", "implemented"], [Tr2ActionSetExternalControllerVariable, "Start", "adapted"], [Tr2ActionSetExternalControllerVariable, "OnModified", "adapted"], [Tr2ActionSetExternalControllerVariable, "IsDestinationValid", "implemented"], [Tr2ActionSetShaderOption, "Start", "adapted"], [Tr2ActionSetValue, "Link", "adapted"], [Tr2ActionSetValue, "Unlink", "implemented"], [Tr2ActionSetValue, "Start", "adapted"], [Tr2ActionSetValue, "OnModified", "adapted"], [Tr2ActionSetValue, "IsBindingValid", "implemented"], [Tr2ActionSetValue, "IsExpressionValid", "implemented"], [Tr2ActionSetValue, "GetDestination", "implemented"], [Tr2ActionSetValue, "GetExpressionTermInfo", "adapted"], [Tr2ActionSetValue, "EvaluateExpression", "adapted"], [Tr2ActionSpawnParticles, "Start", "adapted"], [Tr2BindingPoint, "Link", "adapted"], [Tr2BindingPoint, "Unlink", "implemented"], [Tr2BindingPoint, "IsValid", "implemented"], [Tr2BindingPoint, "SetValue", "adapted"], [Tr2BindingPoint, "GetValue", "adapted"], [Tr2BindingPoint, "GetBoundObject", "implemented"], [Tr2BindingPoint, "SetDestination", "adapted"], [Tr2ControllerExpression, "SetExpr", "adapted"], [Tr2ControllerExpression, "Eval", "adapted"], [Tr2ControllerExpression, "Clear", "implemented"], [Tr2ControllerExpression, "IsExpressionValid", "implemented"], [Tr2ControllerExpression, "GetVariableMask", "adapted"], [Tr2ControllerExpression, "GetExpressionTermInfo", "adapted"], [Tr2ControllerReference, "Initialize", "adapted"], [Tr2ControllerReference, "OnModified", "adapted"], [Tr2ControllerReference, "Link", "implemented"], [Tr2ControllerReference, "Unlink", "implemented"], [Tr2ControllerReference, "IsLinked", "implemented"], [Tr2ControllerReference, "Start", "implemented"], [Tr2ControllerReference, "Stop", "implemented"], [Tr2ControllerReference, "Update", "implemented"], [Tr2ControllerReference, "SetVariable", "implemented"], [Tr2ControllerReference, "HandleEvent", "implemented"], [Tr2ControllerReference, "GetOwner", "implemented"], [Tr2SyncToAnimation, "CanTransition", "adapted"], [Tr2TimelineController, "Link", "adapted"], [Tr2TimelineController, "Unlink", "implemented"], [Tr2TimelineController, "IsLinked", "implemented"], [Tr2TimelineController, "Start", "adapted"], [Tr2TimelineController, "Stop", "adapted"], [Tr2TimelineController, "Update", "adapted"], [Tr2TimelineController, "SetVariable", "implemented"], [Tr2TimelineController, "HandleEvent", "implemented"], [Tr2TimelineController, "GetOwner", "implemented"], [Tr2TimelineController, "Callback", "adapted"], [Tr2TimelineController, "RegisterUpdateable", "implemented"], [Tr2TimelineController, "UnRegisterUpdateable", "implemented"], [Tr2TimelineController, "GetBindingPathRoots", "adapted"], [Tr2TimelineController, "GetFloatVariableByName", "implemented"], [Tr2TimelineController, "GetExpressionTermInfo", "implemented"], [Tr2TimelineController, "GetVariableView", "implemented"], [Tr2TimelineController, "GetVariableBuffer", "implemented"], [Tr2TimelineController, "EnsureTempArenaSize", "implemented"], [Tr2TimelineController, "GetTempArena", "implemented"], [Tr2TimelineController, "OnSimClockRebase", "adapted"], [Tr2TimelineController, "GetActionCount", "implemented"], [Tr2TimelineController, "GetAction", "adapted"], [Tr2TimelineController, "GetActionStartTime", "implemented"], [Tr2TimelineController, "GetActionEndTime", "implemented"], [Tr2TimelineController, "GetActionTrackID", "implemented"], [Tr2TimelineController, "SetActionStartTime", "adapted"], [Tr2TimelineController, "SetActionEndTime", "adapted"], [Tr2TimelineController, "SetActionTrackID", "adapted"], [Tr2TimelineController, "AddAction", "adapted"], [Tr2TimelineController, "RemoveAction", "adapted"], [Tr2TimelineController, "IsActionEnabled", "implemented"], [Tr2TimelineController, "IsTrackEnabled", "implemented"], [Tr2TimelineController, "EnableTrack", "adapted"], [Tr2TimelineController, "RegisterCallback", "adapted"], [Tr2TimelineController, "ClearCallbacks", "implemented"], [Tr2TimelineController, "GetTime", "implemented"], [Tr2TimelineController, "SetTime", "adapted"], [Tr2TimelineController, "Pause", "implemented"], [Tr2TimelineController, "Resume", "implemented"], [Tr2TimelineController, "ReLink", "implemented"]];
  for (const [ctor, methodName, status] of sourceBackedMethods)
  {
    assertCarbonMethod(ctor, methodName, status);
  }
  const jsOnlyMethods = [[Tr2ActionAnimateCurveSet, "CompileExpression"], [Tr2ActionAnimateValue, "CompileExpression"], [Tr2ActionBindRTPC, "CompileExpression"], [Tr2ActionOverlay, "LoadOverlay"], [Tr2ActionPlayMeshAnimation, "ResolveDestination"], [Tr2ActionPlayMeshAnimation, "IsDestinationValid"], [Tr2ActionSetExternalControllerVariable, "LinkToDestinationOwner"], [Tr2ActionSetExternalControllerVariable, "IsVariableValid"], [Tr2ActionSetValue, "CompileExpression"]];
  for (const [ctor, methodName] of jsOnlyMethods)
  {
    assertEquals(CjsSchema.getMethod(ctor, methodName), null);
  }
});
function assertCarbonMethod(ctor, methodName, status)
{
  const method = CjsSchema.getMethod(ctor, methodName);
  assertEquals(method?.carbon?.method, true, `${ctor.name}.${methodName} should be decorated as a Carbon method`);
  assertEquals(method?.impl?.status, status, `${ctor.name}.${methodName} should be marked ${status}`);
}
test("Tr2ControllerFloatVariable writes destinations and dirty masks", () =>
{
  const variable = new Tr2ControllerFloatVariable();
  variable.name = "throttle";
  variable.defaultValue = 4.5;
  assertEquals(variable.variableType, Type.FLOAT);
  assert(variable.Initialize());
  assertEquals(variable.GetName(), "throttle");
  assertAlmostEquals(variable.GetValue(), 4.5);
  const destination = new Float32Array(3);
  variable.SetDestinationBuffer(destination, 1);
  assertAlmostEquals(destination[1], 4.5);
  const dirty = {
    value: 0n
  };
  variable.SetDirtyMask(dirty, 0x10n);
  const events = [];
  variable.OnEvent("modified", (_model, payload) => events.push(payload));
  assertEquals(variable.SetValue(7.25), true);
  dirty.value = 0n;
  assertEquals(variable.SetValue(7.25), true);
  assertAlmostEquals(destination[1], 7.25);
  assertEquals(dirty.value, 0x10n);
  assertEquals(events.length, 2);
  assertEquals(events[0].source, variable);
  variable.defaultValue = 6.5;
  assert(variable.Initialize());
  assertAlmostEquals(variable.GetValue(), 6.5);
  assertAlmostEquals(destination[1], 6.5);
  assertEquals(events.length, 2);
  variable.value = 2.5;
  assert(variable.UpdateValues({ skipEvents: true }));
  assertAlmostEquals(destination[1], 2.5);
  assertEquals(dirty.value, 0x10n);
  const numberDirty = {
    value: 0
  };
  variable.SetDirtyMask(numberDirty, 0x20);
  assert(variable.UpdateValues({ skipEvents: true }));
  assertEquals(numberDirty.value, 0x20);
  assertEquals(CjsSchema.getField(Tr2ControllerFloatVariable, "variableType")?.type.kind, "int32");
  assertEquals(CjsSchema.getField(Tr2ControllerFloatVariable, "value")?.type.kind, "float32");
});

test("Tr2BindingPoint settles direct and swizzled writes through CjsModel", () =>
{
  const target = new CjsModel();
  target.value = 1;
  target.vector = new Float32Array([1, 2, 3]);
  const events = [];
  target.OnEvent("modified", (_model, payload) => events.push(payload));

  const scalar = new Tr2BindingPoint();
  assertEquals(scalar.SetDestination(target, "value"), true);
  assertEquals(scalar.SetValue(4), true);
  assertEquals(scalar.SetValue(4), false);

  const swizzle = new Tr2BindingPoint();
  assertEquals(swizzle.SetDestination(target, "vector.y"), true);
  assertEquals(swizzle.SetValue(8), true);

  assertEquals(target.value, 4);
  assertEquals(target.vector[1], 8);
  const vector = new Tr2BindingPoint();
  assertEquals(vector.SetDestination(target, "vector"), true);
  assertEquals(vector.GetValue(), 1);
  assertEquals(events.length, 2);
  assertEquals(events[0].source, scalar);
  assertEquals(events[1].source, swizzle);

  const alwaysTarget = new Tr2ControllerFloatVariable();
  alwaysTarget.value = 3;
  const alwaysEvents = [];
  alwaysTarget.OnEvent("modified", (_model, payload) => alwaysEvents.push(payload));
  const alwaysBinding = new Tr2BindingPoint();
  assertEquals(alwaysBinding.SetDestination(alwaysTarget, "value"), true);
  assertEquals(alwaysBinding.SetValue(3), true);
  assertEquals(alwaysEvents.length, 1);
  assertEquals(alwaysEvents[0].source, alwaysBinding);
});
test("Tr2BindingPoint resolves Carbon root, property, index, and name paths", () =>
{
  const first = { name: "first", value: 1 };
  const target = { name: "target", value: 2 };
  const root = {
    child: target,
    children: [first, target]
  };
  const roots = [["Root", root]];

  assertEquals(Tr2BindingPoint.ResolvePath("Root", roots), root);
  assertEquals(Tr2BindingPoint.ResolvePath("Root.child", roots), target);
  assertEquals(Tr2BindingPoint.ResolvePath("Root.children[1]", roots), target);
  assertEquals(Tr2BindingPoint.ResolvePath("Root.children[-1]", roots), target);
  assertEquals(Tr2BindingPoint.ResolvePath('Root.children["target"]', roots), target);
  assertEquals(Tr2BindingPoint.ResolvePath('Root["target"]', roots), target);
  assertEquals(Tr2BindingPoint.ResolvePath("Root.children[4]", roots), null);
  assertEquals(Tr2BindingPoint.ResolvePath("Root.children[target]", roots), null);
  assertEquals(Tr2BindingPoint.ResolvePath("Missing", roots), null);

  const binding = new Tr2BindingPoint();
  binding.path = 'Root["target"]';
  binding.attribute = "value";
  assertEquals(binding.Link({ Root: root }), true);
  assertEquals(binding.GetValue(), 2);
});
test("registered controller actions update with sim time", () =>
{
  const updateables = [];
  const appliedTimes = [];
  const controller = {
    GetTime()
    {
      return 10;
    },
    RegisterUpdateable(value)
    {
      updateables.push(value);
    }
  };
  const action = new Tr2ActionAnimateCurveSet();
  action.curveSet = {
    ApplyTime(time)
    {
      appliedTimes.push(time);
    }
  };
  action.value = "StateTime()";
  action.Link(controller);
  action.Start(controller);
  const registered = updateables[0];
  assert(registered);
  registered.Update?.(20, 14);
  assertEquals(appliedTimes.at(-1), 4);
});
test("controller expression actions expose Carbon local term info", () =>
{
  const controller = {
    GetOwner()
    {
      return {};
    },
    GetExpressionTermInfo(out)
    {
      out.push({
        group: "Variables",
        name: "speed",
        kind: "variable"
      });
    }
  };
  const curveSet = new Tr2ActionAnimateCurveSet();
  curveSet.Link(controller);
  const curveSetTerms = new Set(curveSet.GetExpressionTermInfo().map(term => term.name));
  assert(curveSetTerms.has("StateTime"));
  assert(curveSetTerms.has("Random"));
  assert(curveSetTerms.has("ServerYear"));
  assert(curveSetTerms.has("speed"));
  assert(!curveSetTerms.has("Curve"));
  assert(curveSet.GetExpressionTermInfo().some(term => term.group === "GraphicSettings" && term.name === "ShaderQuality"));
  const animateValue = new Tr2ActionAnimateValue();
  animateValue.Link(controller);
  const animateTerms = new Set(animateValue.GetExpressionTermInfo().map(term => term.name));
  assert(animateTerms.has("StateTime"));
  assert(animateTerms.has("ServerTimeGreaterThan"));
  assert(animateTerms.has("Curve"));
  const bind = new Tr2ActionBindRTPC();
  bind.Link(controller);
  const bindTerms = new Set(bind.GetExpressionTermInfo().map(term => term.name));
  assert(bindTerms.has("StateTime"));
  assert(bindTerms.has("Curve"));
  const setValue = new Tr2ActionSetValue();
  setValue.Link(controller);
  const setTerms = new Set(setValue.GetExpressionTermInfo().map(term => term.name));
  assert(setTerms.has("StateTime"));
  assert(!setTerms.has("Curve"));
});
test("Tr2ControllerEventHandler links and executes controller actions", () =>
{
  const events = [];
  const controller = {};
  const first = makeAction("first", events, controller);
  const second = makeAction("second", events, controller);
  const handler = new Tr2ControllerEventHandler();
  handler.name = "activate";
  handler.actions = [first, second];
  assertEquals(handler.GetName(), "activate");
  handler.Link(controller);
  assertEquals(events.join(","), "first:link,second:link");
  handler.Execute(controller);
  assertEquals(events.join(","), "first:link,second:link,first:start,second:start,first:stop,second:stop");
  const inserted = makeAction("inserted", events, controller);
  handler.OnListModified(BELIST_INSERTED, 0, 0, inserted, handler.actions);
  assertEquals(events.at(-1), "inserted:link");
  handler.OnListModified(BELIST_REMOVED, 0, 0, inserted, handler.actions);
  assertEquals(events.at(-1), "inserted:unlink");
  const unrelated = makeAction("unrelated", events, controller);
  handler.OnListModified(BELIST_INSERTED, 0, 0, unrelated, []);
  assertEquals(events.at(-1), "inserted:unlink");
  assertEquals(CjsSchema.getField(Tr2ControllerEventHandler, "actions")?.type.kind, "list");
});
test("Tr2Controller links variables, events, callbacks, and updateables", () =>
{
  const events = [];
  const dirtyMasks = [];
  const controller = new Tr2Controller();
  controller.updateThrottle = false;
  const variable = new Tr2ControllerFloatVariable();
  variable.name = "speed";
  variable.defaultValue = 2;
  assert(variable.Initialize());
  const action = makeAction("ignite", events, controller);
  const handler = new Tr2ControllerEventHandler();
  handler.name = "ignite";
  handler.actions = [action];
  const stateMachine = {
    Link(value)
    {
      assertEquals(value, controller);
      events.push("machine:link");
    },
    Start()
    {
      events.push("machine:start");
    },
    Update(variableDirtyMask = 0)
    {
      dirtyMasks.push(variableDirtyMask);
      events.push("machine:update");
    },
    Stop()
    {
      events.push("machine:stop");
    },
    Unlink()
    {
      events.push("machine:unlink");
    }
  };
  controller.variables = [variable];
  controller.eventHandlers = [handler];
  controller.stateMachines = [stateMachine];
  const owner = {
    name: "owner"
  };
  controller.Link(owner);
  assert(controller.IsLinked());
  assertEquals(controller.GetOwner(), owner);
  assertEquals(events.join(","), "machine:link,ignite:link");
  assertEquals(controller.GetVariableBuffer()[0], 2);
  assertEquals(controller.GetVariableView()[0].name, "speed");
  assertEquals(controller.GetBindingPathRoots()[0][1], owner);
  controller.SetVariable("speed", 5);
  assertEquals(variable.GetValue(), 5);
  assertEquals(controller.GetVariableBuffer()[0], 5);
  assertEquals(controller.GetFloatVariableByName("speed"), 5);
  let updateRealTime = 0;
  const updateSimTimes = [];
  controller.RegisterUpdateable({
    Update(realTime, simTime)
    {
      updateRealTime = realTime;
      updateSimTimes.push(simTime);
      events.push("updateable:update");
    }
  });
  let callbackCount = 0;
  controller.RegisterCallback("done", () =>
  {
    callbackCount++;
    events.push("callback:done");
  });
  controller.Start();
  controller.Update(1);
  assertEquals(dirtyMasks[0], TR2_DIRTY_ALL);
  assert(updateRealTime > 0);
  assert(updateSimTimes[0] > 0);
  controller.SetVariable("speed", 8);
  controller.Update(1);
  assertEquals(dirtyMasks[1], 1n);
  assert(updateSimTimes[1] >= updateSimTimes[0]);
  controller.HandleEvent("ignite");
  assertEquals(events.at(-2), "ignite:start");
  assertEquals(events.at(-1), "ignite:stop");
  controller.Callback("done");
  assertEquals(callbackCount, 1);
  controller.Stop();
  assert(!controller.isPlaying);
  controller.Unlink();
  assert(!controller.IsLinked());
  assertEquals(CjsSchema.getField(Tr2Controller, "stateMachines")?.type.kind, "list");
  assertEquals(CjsSchema.getField(Tr2Controller, "isPlaying")?.type.kind, "boolean");
  assertEquals(controller.currentUpdateFrequency, 10);
});
test("Tr2Controller applies Carbon EveThrottleable update gating", () =>
{
  let updateCount = 0;
  const controller = new Tr2Controller();
  const stateMachine = {
    Start()
    {},
    Update()
    {
      updateCount++;
    },
    Stop()
    {
    }
  };
  controller.stateMachines = [stateMachine];
  controller.Link({});
  controller.Start();
  controller.Update(1);
  controller.Update(1);
  assertEquals(updateCount, 1);
  assertEquals(controller.currentUpdateFrequency, 20);
  controller.updateThrottle = false;
  controller.Update(1);
  assertEquals(updateCount, 2);
});
test("CjsControllerExpressionProgram evaluates a safe parser subset without eval", () =>
{
  const program = CjsControllerExpressionProgram.Compile("speed > 5 ? max(speed, rint(2.5)) + 1 ^ 2 ^ 3 : 0");
  assert(program.IsValid());
  assertEquals(program.GetVariableNames().join(","), "speed");
  const functions = new Set(program.GetFunctionNames());
  assert(functions.has("max"));
  assert(functions.has("rint"));
  assertEquals(program.Evaluate({
    variables: {
      speed: 6
    }
  }), 7);
  assertEquals(program.Evaluate({
    variables: {
      speed: 4
    }
  }), 0);
  assertEquals(CjsControllerExpressionProgram.Compile("1 ^ 2 * 3").Evaluate(), 3);
  assertEquals(CjsControllerExpressionProgram.Compile("1 ^ 2 ^ 3").Evaluate(), 1);
  const unsafe = CjsControllerExpressionProgram.Compile("eval(1)");
  assert(!unsafe.IsValid());
});
test("controller expression program exposes Carbon controller DateTime functions", () =>
{
  const context = {
    serverTime: new Date(2026, 6, 4, 12, 34, 56)
  };
  assertEquals(CjsControllerExpressionProgram.Compile("ServerYear()").Evaluate(context), 2026);
  assertEquals(CjsControllerExpressionProgram.Compile("ServerMonth()").Evaluate(context), 7);
  assertEquals(CjsControllerExpressionProgram.Compile("ServerDayOfWeek()").Evaluate(context), 6);
  assertEquals(CjsControllerExpressionProgram.Compile("IsWeekend()").Evaluate(context), 1);
  assertEquals(CjsControllerExpressionProgram.Compile("ServerTimeGreaterThan(2026, 7, 4, 12, 34, 55)").Evaluate(context), 1);
  assertEquals(CjsControllerExpressionProgram.Compile("ServerTimeLessThanOrEqual(2026, 7, 4, 12, 34, 56)").Evaluate(context), 1);
  assertEquals(CjsControllerExpressionProgram.Compile("ServerTimeEqual(2026, 7, 4, 12, 34, 56)").Evaluate(context), 1);
});
test("controller expression dirty masks respect Carbon function purity", () =>
{
  const controller = {
    GetOwner()
    {
      return {};
    },
    GetVariableView()
    {
      return [{
        name: "speed",
        index: 0
      }];
    }
  };
  const expression = new Tr2ControllerExpression();
  assertEquals(expression.SetExpr("sin(speed)", controller), "");
  assertEquals(expression.GetVariableMask(), 1n);
  assertEquals(expression.SetExpr("speed + StateTime()", controller), "");
  assertEquals(expression.GetVariableMask(), 0n);
  assertEquals(expression.SetExpr("speed + ServerSecond()", controller), "");
  assertEquals(expression.GetVariableMask(), 0n);
  let sourceMaskUpdates = 0;
  const transition = new Tr2StateMachineTransition();
  const source = {
    GetStateMachine()
    {
      return {
        GetController()
        {
          return controller;
        }
      };
    },
    UpdateVariableMask()
    {
      sourceMaskUpdates++;
    }
  };
  transition.Link(source);
  transition.condition = "sin(speed) > 0";
  assertEquals(transition.GetVariableMask(), 1n);
  transition.condition = "speed + StateTime() > 0";
  transition.UpdateValues({ property: "condition" });
  assertEquals(transition.GetVariableMask(), 0n);
  assertEquals(sourceMaskUpdates, 1);
});
test("Tr2StateMachineTransition evaluates live expression state", () =>
{
  const events = [];
  const controller = new Tr2Controller();
  controller.updateThrottle = false;
  const speed = new Tr2ControllerFloatVariable();
  speed.name = "speed";
  speed.value = 0;
  const idle = new Tr2StateMachineState();
  idle.name = "idle";
  idle.actions = [makeAction("idle", events, controller)];
  const active = new Tr2StateMachineState();
  active.name = "active";
  active.actions = [makeAction("active", events, controller)];
  const transition = new Tr2StateMachineTransition();
  transition.name = "active";
  transition.condition = "speed > 5 && IsAnimationPlaying('gate') == 0";
  idle.transitions = [transition];
  const machine = new Tr2StateMachine();
  machine.startState = idle;
  machine.states = [idle, active];
  controller.variables = [speed];
  controller.stateMachines = [machine];
  controller.Link({
    IsAnimationPlaying(_name)
    {
      return 0;
    }
  });
  controller.Start();
  assertEquals(machine.currentState, idle);
  controller.Update(0.1);
  assertEquals(machine.currentState, idle);
  controller.SetVariable("speed", 6);
  controller.Update(0.1);
  assertEquals(machine.currentState, active);
  assert(events.includes("idle:stop"));
  assert(events.includes("active:start"));
  assertEquals(events.filter(event => event === "idle:stop").length, 1);
  assert(transition.IsExpressionValid());
  assertEquals(CjsSchema.getField(Tr2StateMachineTransition, "condition")?.type.kind, "string");
  assertEquals(CjsSchema.getField(Tr2StateMachineState, "transitions")?.type.kind, "list");
  assertEquals(CjsSchema.getField(Tr2StateMachine, "startState")?.type.kind, "objectRef");
  const transitionTerms = new Set(transition.GetExpressionTermInfo().map(term => term.name));
  assert(transitionTerms.has("StateTime"));
  assert(transitionTerms.has("ServerYear"));
  assert(transitionTerms.has("speed"));
});
test("Tr2StateMachineTransition refreshes source dirty masks on condition edits", () =>
{
  const events = [];
  const controller = new Tr2Controller();
  const a = new Tr2ControllerFloatVariable();
  a.name = "a";
  a.value = 0;
  const b = new Tr2ControllerFloatVariable();
  b.name = "b";
  b.value = 0;
  const source = new Tr2StateMachineState();
  source.name = "source";
  source.actions = [makeAction("source", events, controller)];
  const destination = new Tr2StateMachineState();
  destination.name = "destination";
  destination.actions = [makeAction("destination", events, controller)];
  const transition = new Tr2StateMachineTransition();
  transition.name = "destination";
  transition.condition = "a > 0";
  source.transitions = [transition];
  const machine = new Tr2StateMachine();
  machine.startState = source;
  machine.states = [source, destination];
  controller.variables = [a, b];
  controller.stateMachines = [machine];
  controller.Link({});
  controller.Start();
  assertEquals(machine.currentState, source);
  transition.condition = "b > 0";
  transition.UpdateValues({ property: "condition" });
  controller.SetVariable("b", 1);
  controller.Update(1);
  assertEquals(machine.currentState, destination);
});
test("Tr2StateMachine requires an explicit Carbon startState", () =>
{
  const events = [];
  const controller = new Tr2Controller();
  const state = new Tr2StateMachineState();
  state.name = "only";
  state.actions = [makeAction("only", events, controller)];
  const machine = new Tr2StateMachine();
  machine.states = [state];
  controller.stateMachines = [machine];
  controller.Link({});
  controller.Start();
  assertEquals(machine.currentState, null);
  assertEquals(events.join(","), "only:link");
  assertEquals(machine.GetStateByName("only"), state);
});
test("Tr2StateMachineState finalizer gates after actions stop", () =>
{
  const events = [];
  let canFinalize = false;
  let transitionActive = false;
  const controller = new Tr2Controller();
  controller.updateThrottle = false;
  const source = new Tr2StateMachineState();
  source.name = "source";
  source.actions = [makeAction("source", events, controller)];
  const destination = new Tr2StateMachineState();
  destination.name = "destination";
  destination.actions = [makeAction("destination", events, controller)];
  source.transitions = [{
    Link()
    {},
    Unlink()
    {},
    CanActivate()
    {
      return transitionActive;
    },
    GetDestination()
    {
      return destination;
    },
    GetVariableMask()
    {
      return 0n;
    }
  }];
  source.finalizer = {
    CanTransition()
    {
      return canFinalize;
    }
  };
  const machine = new Tr2StateMachine();
  machine.startState = source;
  machine.states = [source, destination];
  controller.stateMachines = [machine];
  controller.Link({});
  controller.Start();
  assertEquals(machine.currentState, source);
  assertEquals(events.at(-1), "source:start");
  transitionActive = true;

  controller.Update(0.1);
  assertEquals(machine.currentState, source);
  assertEquals(events.at(-1), "source:stop");
  canFinalize = true;

  controller.Update(0.1);
  assertEquals(machine.currentState, destination);
  assertEquals(events.at(-1), "destination:start");
  assertEquals(events.filter(event => event === "source:stop").length, 1);
});
test("Tr2StateMachineState ignores timeline-style disabled action flags", () =>
{
  const controller = new Tr2Controller();
  controller.updateThrottle = false;
  let startCount = 0;
  let stopCount = 0;
  let transitionChecks = 0;
  let canTransition = false;
  const source = new Tr2StateMachineState();
  source.name = "source";
  source.actions = [{
    isDisabled: true,
    Start()
    {
      startCount++;
    },
    Stop()
    {
      stopCount++;
    },
    CanTransition()
    {
      transitionChecks++;
      return canTransition;
    }
  }];
  const destination = new Tr2StateMachineState();
  destination.name = "destination";
  source.transitions = [{
    CanActivate()
    {
      return true;
    },
    GetDestination()
    {
      return destination;
    },
    GetVariableMask()
    {
      return 0n;
    }
  }];
  const machine = new Tr2StateMachine();
  machine.startState = source;
  machine.states = [source, destination];
  controller.stateMachines = [machine];
  controller.Link({});
  controller.Start();
  assertEquals(startCount, 1);
  controller.Update(0.1);
  assertEquals(machine.currentState, source);
  assert(transitionChecks > 0);
  const stopsAfterVeto = stopCount;
  const checksAfterVeto = transitionChecks;
  canTransition = true;

  controller.Update(0.1);
  assertEquals(machine.currentState, destination);
  assert(transitionChecks > checksAfterVeto);
  assert(stopCount > stopsAfterVeto);
});
test("Tr2TimelineController follows Carbon active range edits", () =>
{
  const events = [];
  const rebaseDiffs = [];
  const timeline = new Tr2TimelineController();
  const action = {
    Link(controller)
    {
      assertEquals(controller, timeline);
      events.push("link");
    },
    Start(controller)
    {
      assertEquals(controller, timeline);
      events.push("start");
    },
    Stop(controller)
    {
      assertEquals(controller, timeline);
      events.push("stop");
    },
    RebaseSimTime(diff)
    {
      rebaseDiffs.push(diff);
    }
  };
  timeline.AddAction(action, 5, 10, 1);
  timeline.Link({});
  assertEquals(events.join(","), "link");
  timeline.SetTime(6);
  assertEquals(timeline.GetTime(), 0);
  assertEquals(events.join(","), "link");
  timeline.Start();
  timeline.SetTime(6);
  assertEquals(timeline.GetTime(), 6);
  assertEquals(events.join(","), "link,start");
  assert(timeline.SetActionEndTime(0, 5));
  assertEquals(events.at(-1), "stop");
  assert(timeline.SetActionEndTime(0, 10));
  assertEquals(events.at(-1), "start");
  timeline.EnableTrack(2, false);
  assert(timeline.SetActionTrackID(0, 2));
  assertEquals(events.at(-1), "stop");
  assert(timeline.SetActionTrackID(0, 1));
  assertEquals(events.at(-1), "start");
  assert(timeline.SetActionStartTime(0, 7));
  assertEquals(events.at(-1), "stop");
  assert(timeline.SetActionStartTime(0, 5));
  assertEquals(events.at(-1), "start");
  timeline.OnSimClockRebase(12, 15);
  assertEquals(rebaseDiffs.at(-1), 3);
});
test("Tr2TimelineController keeps Carbon action bounds and owner gates", () =>
{
  const timeline = new Tr2TimelineController();
  assertEquals(timeline.GetActionStartTime(0), 0);
  assertEquals(timeline.GetActionEndTime(0), 0);
  assertEquals(timeline.GetActionTrackID(0), 0);
  assertEquals(timeline.entries.length, 0);
  timeline.AddAction(null, 1, 2);
  assertEquals(timeline.GetActionCount(), 0);
  const events = [];
  const action = {
    Unlink()
    {
      events.push("unlink");
    }
  };
  timeline.AddAction(action, 1, 2);
  assert(timeline.RemoveAction(0));
  assertEquals(events.join(","), "");
});
test("Tr2TimelineController applies Carbon EveThrottleable update gating", () =>
{
  let updateCount = 0;
  const timeline = new Tr2TimelineController();
  timeline.RegisterUpdateable({
    Update(realTime, simTime)
    {
      assert(realTime > 0);
      assert(simTime > 0);
      updateCount++;
    }
  });
  timeline.Link({});
  timeline.Start();
  timeline.Update(1);
  timeline.Update(1);
  assertEquals(updateCount, 1);
  assertEquals(timeline.currentUpdateFrequency, 20);
  timeline.updateThrottle = false;
  timeline.Update(1);
  assertEquals(updateCount, 2);
});
test("Tr2ControllerReference clears stale controller on path changes", () =>
{
  const events = [];
  const reference = new Tr2ControllerReference();
  reference.controller = {
    Link()
    {
      events.push("link");
    },
    Unlink()
    {
      events.push("unlink");
    }
  };
  reference.Link({});
  assertEquals(events.join(","), "link");
  reference.path = "res:/controller.red";
  reference.UpdateValues({ property: "path" });
  assertEquals(reference.controller, null);
  assertEquals(events.join(","), "link");
  assertEquals(CjsSchema.getField(Tr2ControllerReference, "path")?.type.kind, "path");
});
test("Tr2ControllerReference resolves and links controllers through host adapter", () =>
{
  const events = [];
  const owner = {};
  const resolvedController = {
    Link(value)
    {
      events.push(`link:${value === owner}`);
    }
  };
  const previous = Tr2ControllerReference.registerResourceResolver(path =>
  {
    events.push(`resolve:${path}`);
    return resolvedController;
  });
  const reference = new Tr2ControllerReference();
  reference.path = "res:/controller.red";
  assert(reference.Initialize());
  assertEquals(reference.controller, resolvedController);
  assertEquals(events.join(","), "resolve:res:/controller.red");
  reference.Link(owner);
  assertEquals(events.join(","), "resolve:res:/controller.red,link:true");
  events.length = 0;
  Tr2ControllerReference.registerResourceResolver(() =>
  {
    events.push("resolve-stale");
    return null;
  });
  reference.path = "res:/new-controller.red";
  reference.UpdateValues({ property: "path" });
  assertEquals(events.join(","), "resolve-stale");
  assertEquals(reference.controller, null);
  assertEquals(CjsSchema.GetConstructor("Tr2ControllerReference"), Tr2ControllerReference);
  Tr2ControllerReference.registerResourceResolver(previous);
  Tr2ControllerReference.clearResourceResolver();
});
test("Tr2ActionPlayCurveSet accepts Carbon void owner methods", () =>
{
  const events = [];
  const updateables = [];
  const owner = {
    PlayCurveSet(name, rangeName)
    {
      events.push(`play:${name}:${rangeName}`);
    },
    StopCurveSet(name)
    {
      events.push(`stop:${name}`);
    },
    GetRangeDuration(name, rangeName)
    {
      events.push(`duration:${name}:${rangeName}`);
      return 2;
    }
  };
  const controller = {
    GetOwner()
    {
      return owner;
    },
    RegisterUpdateable(updateable)
    {
      updateables.push(updateable);
    },
    UnRegisterUpdateable(updateable)
    {
      const index = updateables.indexOf(updateable);
      if (index !== -1)
      {
        updateables.splice(index, 1);
      }
    }
  };
  const action = new Tr2ActionPlayCurveSet();
  action.curveSetName = "warp";
  action.rangeName = "intro";
  action.syncToRange = true;
  action.Start(controller);
  assertEquals(events.join(","), "play:warp:intro,duration:warp:intro");
  assertEquals(updateables.length, 1);
  action.Stop(controller);
  assertEquals(events.at(-1), "stop:warp");
  assertEquals(updateables.length, 0);
});
test("Tr2ActionPlayCurveSet sync probes do not consume transition windows", () =>
{
  const updateables = [];
  const owner = {
    PlayCurveSet()
    {},
    StopCurveSet()
    {},
    GetRangeDuration()
    {
      return 0;
    }
  };
  const controller = {
    GetOwner()
    {
      return owner;
    },
    RegisterUpdateable(updateable)
    {
      updateables.push(updateable);
    }
  };
  const action = new Tr2ActionPlayCurveSet();
  action.syncToRange = true;
  action.rangeName = "zero";
  action.Start(controller);
  assertEquals(updateables.length, 1);
  assert(action.CanTransition());
  assert(action.CanTransition());
});
test("Tr2ActionSpawnParticles calls the Carbon emitter shape once", () =>
{
  const calls = [];
  const action = new Tr2ActionSpawnParticles();
  action.rate = 4;
  action.emitter = {
    SpawnParticles(...args)
    {
      calls.push(args);
    }
  };
  action.Start();
  assertEquals(calls.length, 1);
  assertEquals(calls[0].length, 4);
  assertEquals(calls[0][0].emitCountFactor, 1);
  assertEquals(calls[0][3], 4);
  action.Start();
  assertEquals(calls.length, 2);
  assert(calls[0][0] !== calls[1][0]);
  assertEquals(calls[1][0].emitCountFactor, 1);
  action.emitter = {};
  action.Start();
  assertEquals(calls.length, 2);
});
test("generated context packets keep Carbon constructor defaults", () =>
{
  const childParams = new EveChildUpdateParams();
  assertEquals(childParams.activationStrength, 1);
  assertEquals(childParams.controllerUpdateFrequency, 0.5);
  assertEquals(childParams.isVisible, true);
  const emitterArgs = new ITr2GenericEmitter();
  assertEquals(emitterArgs.emitCountFactor, 1);
});
test("Tr2ActionPlayMeshAnimation uses Carbon animation layer calls", () =>
{
  const events = [];
  const layer = {
    ClearAnimations()
    {
      events.push("clear");
    },
    EndAnimation()
    {
      events.push("end");
    }
  };
  const animationController = {
    AddAnimationLayerWithTrackMask(layerName, maskName)
    {
      events.push(`add:${layerName}:${maskName}`);
    },
    PlayLayerAnimationByName(layerName, animationName, playImmediately, loops, delay, speed, unknownFlag)
    {
      events.push(`play:${layerName}:${animationName}:${playImmediately}:${loops}:${delay}:${speed}:${unknownFlag}`);
    },
    GetAnimationLayer(layerName)
    {
      events.push(`layer:${layerName}`);
      return layer;
    },
    Play()
    {
      events.push("legacy:play");
    },
    Stop()
    {
      events.push("legacy:stop");
    }
  };
  const controller = {
    GetOwner()
    {
      return {
        GetAnimationController()
        {
          return animationController;
        }
      };
    }
  };
  const action = new Tr2ActionPlayMeshAnimation();
  action.animation = "WarpIn";
  action.mask = "body";
  action.playAction = PlayAction.PLAY;
  action.loops = -1;
  action.delay = 0.25;
  action.speed = 2;
  action.Start(controller);
  assertEquals(events.join(","), "add:body:body,play:body:WarpIn:true:0:0.25:2:false");
  action.stopAction = StopAction.ENQUEUE_STOP;
  action.Stop(controller);
  assertEquals(events.at(-2), "layer:body");
  assertEquals(events.at(-1), "end");
  action.stopAction = StopAction.STOP;
  action.Stop(controller);
  assertEquals(events.at(-2), "layer:body");
  assertEquals(events.at(-1), "clear");
  assert(!events.includes("legacy:play"));
  assert(!events.includes("legacy:stop"));
});
test("Tr2ActionOverlay follows Carbon overlay lifecycle", () =>
{
  const action = new Tr2ActionOverlay();
  const overlaySchema = CjsSchema.getSchema(Tr2ActionOverlay);
  assertEquals(overlaySchema.fields.map(field => field.name).join(","), "path,overlayName,targetAnotherOwner,addOnStart,removeOnStop");
  assertEquals(CjsSchema.getField(Tr2ActionOverlay, "path")?.type?.kind, "path");
  const events = [];
  const owner = makeOverlayOwner(events, true);
  const controller = {
    GetOwner()
    {
      return owner;
    }
  };
  action.overlayName = "glow";
  action.path = "RES:/Effect.red";
  action.Start(controller);
  assertEquals(events.join(","), "load:res:/effect_skinned.red,add:glow,start");
  action.Stop(controller);
  assertEquals(events.at(-1), "remove:glow");
  assert(!events.includes("stop"));
  events.length = 0;
  const existing = {
    name: "glow",
    StartControllers()
    {
      events.push("existing:start");
    },
    StopControllers()
    {
      events.push("existing:stop");
    }
  };
  owner.overlays = [existing];
  action.path = "";
  action.Start(controller);
  action.Stop(controller);
  assertEquals(events.join(","), "remove:glow");
  events.length = 0;
  const staticOwner = makeOverlayOwner(events, false);
  const staticController = {
    GetOwner()
    {
      return staticOwner;
    }
  };
  action.path = "res:/plain_skinned.red";
  action.removeOnStop = false;
  action.Start(staticController);
  action.Stop(staticController);
  action.Stop(staticController);
  assertEquals(events.join(","), "load:res:/plain.red,add:glow,start");
  events.length = 0;
  const missingOwner = {
    overlays: [],
    LoadOverlayEffectFromPath(path)
    {
      events.push(`miss:${path}`);
      return null;
    },
    AddOverlayEffect()
    {
      events.push("bad:add");
    }
  };
  const missingController = {
    GetOwner()
    {
      return missingOwner;
    }
  };
  action.path = "res:/missing.red";
  action.removeOnStop = true;
  action.Start(missingController);
  assertEquals(events.join(","), "miss:res:/missing.red");
  assertEquals(missingOwner.overlays.length, 0);
  events.length = 0;
  const parameterOwner = makeOverlayOwner(events, false);
  const parameterRoot = {
    GetParameterByName(name)
    {
      if (name !== "overlayTarget")
      {
        return null;
      }
      return {
        GetParameterObject()
        {
          return parameterOwner;
        }
      };
    },
    Rebind(value)
    {
      events.push(`rebind:${value}`);
    }
  };
  const parameterController = {
    GetOwner()
    {
      return parameterRoot;
    }
  };
  action.targetAnotherOwner = "overlayTarget";
  action.path = "res:/param.red";
  action.Start(parameterController);
  assertEquals(events.join(","), "load:res:/param.red,add:glow,start,rebind:true");
  events.length = 0;
  action.targetAnotherOwner = "missing";
  action.Start(parameterController);
  assertEquals(events.join(","), "");
});
test("Tr2ActionPlaySound follows Carbon emitter dispatch", () =>
{
  const action = new Tr2ActionPlaySound();
  const soundSchema = CjsSchema.getSchema(Tr2ActionPlaySound);
  assertEquals(soundSchema.fields.map(field => field.name).join(","), "emitter,event,target,bypassPrefix");
  const events = [];
  const emitter = {
    SendEvent(eventName, bypassPrefix)
    {
      events.push(`send:${eventName}:${bypassPrefix}`);
    },
    PlayEvent()
    {
      events.push("bad:play-event");
    },
    PlaySound()
    {
      events.push("bad:play-sound");
    }
  };
  const owner = {
    FindSoundEmitter(name)
    {
      events.push(`find:${name}`);
      return emitter;
    },
    GetSoundEmitter()
    {
      events.push("bad:get-sound-emitter");
      return emitter;
    }
  };
  const controller = {
    GetOwner()
    {
      return owner;
    }
  };
  action.emitter = "main";
  action.event = "ship_start";
  action.bypassPrefix = true;
  action.Start(controller);
  assertEquals(events.join(","), "find:main,send:ship_start:true");
  assertThrows(() => action.StartWithController(null), "StartWithController expects a Tr2Controller");
  events.length = 0;
  const targetOwner = {
    FindSoundEmitter(name)
    {
      events.push(`target-find:${name}`);
      return emitter;
    }
  };
  const parameterRoot = {
    GetParameterByName(name)
    {
      return name === "speaker" ? {
        GetParameterObject()
        {
          return targetOwner;
        }
      } : null;
    }
  };
  action.target = "speaker";
  action.Start({
    GetOwner()
    {
      return parameterRoot;
    }
  });
  assertEquals(events.join(","), "target-find:main,send:ship_start:true");
  events.length = 0;
  const childRoot = {
    FindSoundEmitter()
    {
      events.push("bad:root-find");
      return emitter;
    },
    GetEffectChildByName()
    {
      return null;
    }
  };
  action.target = "missing";
  action.Start({
    GetOwner()
    {
      return childRoot;
    }
  });
  assertEquals(events.join(","), "");
});
test("Tr2ActionSetValue leaves destination unchanged on failed eval", () =>
{
  const destination = {
    value: 5
  };
  const controller = {
    GetOwner()
    {
      return {};
    }
  };
  const action = new Tr2ActionSetValue();
  action.destination = destination;
  action.attribute = "value";
  action.value = "eval(1)";
  action.Link(controller);
  action.Start(controller);
  assertEquals(destination.value, 5);
  action.value = "0";
  action.UpdateValues();
  action.Start(controller);
  assertEquals(destination.value, 0);
  action.Unlink();
  assert(!action.IsBindingValid());
});
test("Tr2ActionBindRTPC caches Carbon emitter and expression state", () =>
{
  const action = new Tr2ActionBindRTPC();
  const bindSchema = CjsSchema.getSchema(Tr2ActionBindRTPC);
  assertEquals(bindSchema.fields.map(field => field.name).join(","), "value,emitter,rtpcName,curve");
  const events = [];
  const updateables = [];
  const emitter = {
    SetRTPC(name, value)
    {
      events.push(`set:${name}:${value}`);
    },
    SetRtpc()
    {
      events.push("bad:set-rtpc-alias");
    }
  };
  const lateEmitter = {
    SetRTPC()
    {
      events.push("bad:late-emitter");
    }
  };
  let resolvedEmitter = emitter;
  const owner = {
    FindSoundEmitter(name)
    {
      events.push(`find:${name}`);
      return resolvedEmitter;
    },
    GetSoundEmitter()
    {
      events.push("bad:get-sound-emitter");
      return lateEmitter;
    }
  };
  const controller = {
    GetOwner()
    {
      return owner;
    },
    GetTime()
    {
      return 10;
    },
    RegisterUpdateable(updateable)
    {
      updateables.push(updateable);
    },
    UnRegisterUpdateable(updateable)
    {
      const index = updateables.indexOf(updateable);
      if (index !== -1)
      {
        updateables.splice(index, 1);
      }
    }
  };
  action.value = "StateTime()";
  action.emitter = "main";
  action.rtpcName = "thrust";
  action.Link(controller);
  action.Start(controller);
  resolvedEmitter = lateEmitter;

  updateables[0].Update?.(20, 14);
  assertEquals(events.join(","), "find:main,set:thrust:4");
  assertEquals(action.EvaluateExpression("StateTime()"), 4);
  assert(!("RebaseSimTime" in action));
  assertThrows(() => action.StopWithController(null), "StopWithController expects a Tr2Controller");
  action.Stop(controller);
  assertEquals(updateables.length, 0);
});
test("Tr2ActionSetExternalControllerVariable only relinks destination owner edits", () =>
{
  const firstDestination = {
    SetControllerVariable()
    {
    }
  };
  const secondDestination = {
    SetControllerVariable()
    {
    }
  };
  let roots = [["Child", firstDestination]];
  const owner = {
    GetBindingRoots()
    {
      return roots;
    }
  };
  const controller = {
    GetOwner()
    {
      return owner;
    }
  };
  const action = new Tr2ActionSetExternalControllerVariable();
  action.destinationOwner = "child";
  action.Link(controller);
  assertEquals(action.destination, firstDestination);
  roots = [["Child", secondDestination], ["Backup", secondDestination]];

  // A value-only settle keeps the cached link even though the roots moved.
  action.SetValues({ value: 4 });
  assertEquals(action.destination, firstDestination);
  // Changing the owner name relinks against the current roots.
  action.SetValues({ destinationOwner: "backup" });
  assertEquals(action.destination, secondDestination);
  assertEquals(CjsSchema.getMethod(Tr2ActionSetExternalControllerVariable, "LinkToDestinationOwner"), null);
});
test("audio controller actions use Carbon emitter APIs only", () =>
{
  const events = [];
  const emitter = {
    SetPrefix(prefix)
    {
      events.push(`prefix:${prefix}`);
    },
    SetAudioPrefix()
    {
      events.push("bad:audio-prefix");
    },
    SetSwitch(group, state)
    {
      events.push(`switch:${group}:${state}`);
    },
    SetAudioSwitch()
    {
      events.push("bad:audio-switch");
    },
    SetAttenuationScalingFactor(value)
    {
      events.push(`attenuation:${value}`);
    },
    SetAttenuationScaling()
    {
      events.push("bad:attenuation-alias");
    }
  };
  const owner = {
    FindSoundEmitter(name)
    {
      events.push(`find:${name}`);
      return emitter;
    },
    GetSoundEmitter()
    {
      events.push("bad:get-sound-emitter");
      return emitter;
    },
    emitters: [emitter]
  };
  const controller = {
    GetOwner()
    {
      return owner;
    },
    GetFloatVariableByName(name)
    {
      return name === "scale" ? 2 : undefined;
    }
  };
  const prefix = new Tr2ActionSetAudioEmitterPrefix();
  prefix.emitter = "main";
  prefix.prefix = "ship";
  prefix.Start(controller);
  assertThrows(() => prefix.StartWithController(null), "StartWithController expects a Tr2Controller");
  const audioSwitch = new Tr2ActionSetAudioSwitch();
  audioSwitch.emitter = "main";
  audioSwitch.switchGroup = "mode";
  audioSwitch.switchState = "warp";
  audioSwitch.Start(controller);
  assertThrows(() => audioSwitch.StartWithController(null), "StartWithController expects a Tr2Controller");
  const attenuation = new Tr2ActionSetAttenuationScaling();
  attenuation.emitter = "main";
  attenuation.scalingFactor = 3;
  attenuation.controllerVariable = "scale";
  attenuation.Link(controller);
  attenuation.Start(controller);
  assertThrows(() => attenuation.StartWithController(null), "StartWithController expects a Tr2Controller");
  assertEquals(events.join(","), "find:main,prefix:ship,find:main,switch:mode:warp,find:main,attenuation:6");
});
test("Tr2ActionChildEffect follows Carbon child owner lifecycle", () =>
{
  const pathField = CjsSchema.getField(Tr2ActionChildEffect, "path");
  assertEquals(pathField?.type?.kind, "path");
  const events = [];
  const targetOwner = makeChildOwner("target", events);
  const rootOwner = {
    children: [targetOwner],
    GetEffectChildByName(name)
    {
      return this.children.find(child => child.name === name) ?? null;
    },
    Rebind(value)
    {
      events.push(`rebind:${value}`);
    }
  };
  const controller = {
    GetOwner()
    {
      return rootOwner;
    }
  };
  const action = new Tr2ActionChildEffect();
  action.targetAnotherOwner = "target";
  action.childName = "spark";
  action.path = "res:/spark.red";
  action.Start(controller);
  assertEquals(events.join(","), "load:res:/spark.red:spark,start");
  action.Stop(controller);
  assertEquals(events.join(","), "load:res:/spark.red:spark,start,remove");
  events.length = 0;
  const existing = {
    name: "spark",
    StartControllers()
    {
      events.push("existing:start");
    }
  };
  targetOwner.children = [existing];
  action.Start(controller);
  assertEquals(events.join(","), "");
  action.Stop(controller);
  assertEquals(events.join(","), "remove");
  events.length = 0;
  action.targetAnotherOwner = "missing";
  action.Start(controller);
  assertEquals(events.join(","), "");
  const parameterOwner = makeChildOwner("parameterOwner", events);
  const parameterRoot = {
    GetEffectChildByName()
    {
      return null;
    },
    GetParameterByName(name)
    {
      if (name !== "paramOwner")
      {
        return null;
      }
      return {
        GetParameterObject()
        {
          return parameterOwner;
        }
      };
    },
    Rebind(value)
    {
      events.push(`rebind:${value}`);
    }
  };
  const parameterController = {
    GetOwner()
    {
      return parameterRoot;
    }
  };
  action.targetAnotherOwner = "paramOwner";
  action.childName = "beam";
  action.path = "res:/beam.red";
  action.Start(parameterController);
  assertEquals(events.join(","), "load:res:/beam.red:beam,start,rebind:true");
});
test("Tr2ActionChildEffect.Link forwards prefetch through controller resource host", () =>
{
  const prefetch = [];
  const stopHost = Tr2ActionChildEffect.registerResourcePrefetcher(path =>
  {
    prefetch.push(`prefetch:${path}`);
  });
  const owner = {};
  const controller = {
    GetOwner()
    {
      return owner;
    }
  };
  const action = new Tr2ActionChildEffect();
  action.path = "res:/child.red";
  action.Link(controller);
  assertEquals(prefetch.join(","), "prefetch:res:/child.red");
  Tr2ActionChildEffect.registerResourcePrefetcher(stopHost);
  Tr2ActionChildEffect.clearResourcePrefetcher();
});
test("Tr2ActionPython delegates lifecycle to a JS host bridge", () =>
{
  const events = [];
  let updateCount = 0;
  const updateables = [];
  const owner = {
    name: "owner"
  };
  const controller = {
    GetOwner()
    {
      return owner;
    },
    RegisterUpdateable(updateable)
    {
      updateables.push(updateable);
      events.push("register");
    },
    UnRegisterUpdateable(updateable)
    {
      const index = updateables.indexOf(updateable);
      if (index !== -1)
      {
        updateables.splice(index, 1);
      }
      events.push("unregister");
    }
  };
  Tr2ActionPython.clearFactory();
  Tr2ActionPython.registerFactory((moduleName, className) =>
  {
    events.push(`factory:${moduleName}.${className}`);
    return {
      OnLink(linkOwner, linkController)
      {
        assertEquals(linkOwner, owner);
        assertEquals(linkController, controller);
        events.push("link");
      },
      OnUnlink()
      {
        events.push("unlink");
      },
      OnStart(startOwner, startController)
      {
        assertEquals(startOwner, owner);
        assertEquals(startController, controller);
        events.push("start");
      },
      OnStop(stopOwner, stopController)
      {
        assertEquals(stopOwner, owner);
        assertEquals(stopController, controller);
        events.push("stop");
      },
      OnUpdate(updateOwner, updateController, realDt, simDt)
      {
        assertEquals(updateOwner, owner);
        assertEquals(updateController, controller);
        if (updateCount === 0)
        {
          assert(Number.isFinite(realDt));
          assert(Number.isFinite(simDt));
          events.push("update:first");
        }
        else
        {
          events.push(`update:${realDt}:${simDt}`);
        }
        updateCount++;
      },
      OnLoad(state)
      {
        events.push(`load:${state[0]}:${state[1]}`);
      },
      OnSave()
      {
        events.push("save");
        return Uint8Array.from([7, 8]);
      }
    };
  });
  const action = new Tr2ActionPython();
  action.module = "mod";
  action.className = "Action";
  action.SetBufferAndSize("state", Uint8Array.from([1, 2, 3]), 2);
  action.Link(controller);
  action.Start(controller);
  assertEquals(updateables.length, 1);
  action.Update(12, 20);
  action.Update(15, 21);
  action.Stop(controller);
  action.Unlink();
  const saved = action.GetWriteBufferAndSize("state");
  assertEquals(saved?.[0], 7);
  assertEquals(saved?.[1], 8);
  assertEquals(action.state?.[0], 7);
  assertEquals(action.GetInstance() !== null, true);
  assertEquals(events.join(","), "factory:mod.Action,load:1:2,link,register,start,update:first,update:3:1,unregister,stop,unlink,save");
  Tr2ActionPython.clearFactory();
});
test("controller actions match Carbon reset and attenuation edge cases", () =>
{
  const shaderEvents = [];
  const shaderAction = new Tr2ActionSetShaderOption();
  shaderAction.key = "SPACE_OBJECT_CLIPPING";
  shaderAction.value = "SOC_ENABLED";
  shaderAction.Start({
    GetOwner()
    {
      return {
        SetShaderOption(name, value)
        {
          shaderEvents.push(`${name}:${value}`);
        }
      };
    }
  });
  assertEquals(shaderEvents.join(","), "SPACE_OBJECT_CLIPPING:SOC_ENABLED");
  const resetCalls = [];
  let locatorCenter = null;
  const resetOwner = {
    ResetClipSphereCenter()
    {
      resetCalls.push("object");
    },
    GetLastDamageLocatorHit()
    {
      return 1;
    },
    GetLocatorsForSet(name)
    {
      assertEquals(name, "damage");
      return [{
        position: [1, 2, 3]
      }, {
        position: [4, 5, 6]
      }];
    },
    ResetClipSphereCenterToPos(value)
    {
      locatorCenter = value;
      resetCalls.push("locator");
    }
  };
  const resetController = {
    GetOwner()
    {
      return resetOwner;
    }
  };
  const reset = new Tr2ActionResetClipSphereCenter();
  reset.resetBehavior = ResetBehavior.OBJECT_CENTER;
  reset.Start(resetController);
  reset.resetBehavior = ResetBehavior.LAST_DAMAGELOCATOR_HIT;
  reset.Start(resetController);
  assertEquals(resetCalls.join(","), "object,locator");
  assertEquals(locatorCenter?.[0], 4);
  let attenuation = 0;
  const emitter = {
    SetAttenuationScalingFactor(value)
    {
      attenuation = value;
    }
  };
  const attenuationController = {
    GetOwner()
    {
      return {
        FindSoundEmitter()
        {
          return emitter;
        }
      };
    },
    GetFloatVariableByName(name)
    {
      return name === "boost" ? 3 : 0;
    }
  };
  const scale = new Tr2ActionSetAttenuationScaling();
  scale.scalingFactor = 2;
  scale.controllerVariable = "zero";
  scale.Link(attenuationController);
  assertEquals(scale.GetScalingFactor(), 2);
  scale.Start(attenuationController);
  assertEquals(attenuation, 2);
  scale.controllerVariable = "boost";
  assertEquals(scale.GetScalingFactor(), 6);
  const order = [];
  const destination = {
    StartControllers()
    {
      order.push("start");
    },
    SetControllerVariable(name, value)
    {
      order.push(`${name}:${value}`);
    }
  };
  const externalController = {
    GetOwner()
    {
      return {
        GetBindingRoots()
        {
          return [["Child", destination]];
        }
      };
    },
    GetFloatVariableByName(name)
    {
      return name === "source" ? 7 : undefined;
    }
  };
  const external = new Tr2ActionSetExternalControllerVariable();
  external.destinationOwner = "child";
  external.variable = "target";
  external.value = 2;
  external.sourceVariable = "source";
  external.startControllers = true;
  external.Link(externalController);
  assert(external.IsDestinationValid());
  external.Start(externalController);
  assertEquals(order.join(","), "start,target:7");
  external.destinationOwner = "";
  external.UpdateValues();
  assert(!external.IsDestinationValid());
});
function makeAction(name, events, expectedController)
{
  return {
    Link(controller)
    {
      assertEquals(controller, expectedController);
      events.push(`${name}:link`);
    },
    Unlink()
    {
      events.push(`${name}:unlink`);
    },
    Start(controller)
    {
      assertEquals(controller, expectedController);
      events.push(`${name}:start`);
    },
    Stop(controller)
    {
      assertEquals(controller, expectedController);
      events.push(`${name}:stop`);
    }
  };
}
function makeChildOwner(name, events)
{
  return {
    name,
    children: [],
    AddChildFromPath(path, childName)
    {
      events.push(`load:${path}:${childName}`);
      const child = {
        name: childName,
        path,
        StartControllers()
        {
          events.push("start");
        },
        StopControllers()
        {
          events.push("stop");
        }
      };
      this.children.push(child);
      return child;
    },
    RemoveFromEffectChildrenList(child)
    {
      events.push("remove");
      const index = this.children.indexOf(child);
      if (index !== -1)
      {
        this.children.splice(index, 1);
      }
    }
  };
}
function makeOverlayOwner(events, animated)
{
  return {
    overlays: [],
    IsAnimated()
    {
      return animated;
    },
    GetOverlayEffectByName(name)
    {
      return this.overlays.find(overlay => overlay.name === name) ?? null;
    },
    LoadOverlayEffectFromPath(path)
    {
      events.push(`load:${path}`);
      return {
        path,
        StartControllers()
        {
          events.push("start");
        },
        StopControllers()
        {
          events.push("stop");
        }
      };
    },
    AddOverlayEffect(overlay)
    {
      const named = overlay;
      events.push(`add:${named.name}`);
      this.overlays.push(named);
    },
    RemoveOverlayEffect(overlay)
    {
      const named = overlay;
      events.push(`remove:${named.name}`);
      const index = this.overlays.indexOf(named);
      if (index !== -1)
      {
        this.overlays.splice(index, 1);
      }
    }
  };
}
