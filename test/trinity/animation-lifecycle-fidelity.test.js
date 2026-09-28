import test from "node:test";
import assert from "node:assert/strict";
import { Tr2StateMachine, Tr2StateMachineState, Tr2StateMachineTransition, Tr2GrannyAnimation, Tr2TextureAnimationParameter, CjsGrannyCurves, CjsControllerExpressionProgram } from "../../npm/dist/trinity/index.js";

test("blank transition conditions are invalid without changing other expression defaults", () =>
{
  assert.equal(CjsControllerExpressionProgram.Compile("").IsValid(), true);
  for (const condition of ["", "   "])
  {
    const transition = new Tr2StateMachineTransition();
    transition.condition = condition;
    assert.equal(transition.IsConditionValid(), false);
  }
  const transition = new Tr2StateMachineTransition();
  transition.condition = "1";
  assert.equal(transition.IsConditionValid(), true);
});

test("state unlink clears the accumulated transition mask", () =>
{
  const state = new Tr2StateMachineState();
  state.transitions = [{ GetVariableMask: () => 4n, Link() {}, Unlink() {} }];
  state.Link({ GetController: () => null });
  assert.equal(state._transitionVariableMask, 4n);
  state.Unlink();
  assert.equal(state._transitionVariableMask, 0n);
});

test("state-machine self-loop guard follows Carbon's current-before-next counting", () =>
{
  let starts = 0;
  let updates = 0;
  const state = {
    Link() {},
    Start()
    {
      starts++;
    },
    Update()
    {
      updates++;
      return state;
    }
  };
  const machine = new Tr2StateMachine();
  machine.states = [state];
  machine.startState = state;
  machine.Link({});
  machine.Start();
  // Native: initial Start, 11 uncounted hops, 19 accepted counted hops.
  assert.equal(starts, 31);
  assert.equal(updates, 31);
});

test("owned Granny paths refresh while borrowed and explicit resources retain ownership", () =>
{
  const pathA = "res:/tests/animation-lifecycle/a.gr2";
  const pathB = "res:/tests/animation-lifecycle/b.gr2";
  const first = { models: [] };
  const second = { models: [] };
  CjsGrannyCurves.registerResource(pathA, first);
  CjsGrannyCurves.registerResource(pathB, second);
  try
  {
    const animation = new Tr2GrannyAnimation();
    animation.resPath = pathA;
    assert.equal(animation.grannyRes, first);
    animation.resPath = pathB;
    assert.equal(animation.grannyRes, second);
    animation.resPath = "";
    assert.equal(animation.grannyRes, null);
    animation.SetGrannyResource(first);
    animation.Initialize();
    assert.equal(animation.grannyRes, first);
    // Borrowed geometry answers its granny file through GetGrannyInfo, as a
    // TriGeometryRes read from a .gr2 does.
    const borrowed = { GetGrannyInfo: () => first, OnCompleted(listener, source) { listener.call(source, "completed", this); return this; }, OffEvent() {} };
    animation.resPath = pathB;
    animation.SetSharedGeometryRes(borrowed);
    assert.equal(animation.resPath, "");
    animation.resPath = pathB;
    assert.equal(animation.grannyRes, borrowed);
    animation.SetSharedGeometryRes(null);
    assert.equal(animation.grannyRes, null);
    assert.equal(animation.resPath, "");
  }
  finally
  {
    CjsGrannyCurves.unregisterResource(pathA);
    CjsGrannyCurves.unregisterResource(pathB);
  }
});

test("texture animation material registrations retain duplicates and invalidate only resource sets", () =>
{
  const parameter = new Tr2TextureAnimationParameter();
  let invalidations = 0;
  const material = {
    InvalidateResourceSets()
    {
      invalidations++;
    },
    ResourceChanged()
    {
      assert.fail("native hook does not call ResourceChanged");
    },
    MarkConstantBuffersDirty()
    {
      assert.fail("native hook does not dirty constant buffers");
    }
  };
  parameter.OnAddedToMaterial(material);
  parameter.OnAddedToMaterial(material);
  parameter.OnModified("channel");
  assert.equal(invalidations, 0);
  parameter.OnModified("animation");
  assert.equal(invalidations, 2);
  parameter.OnRemovedFromMaterial(material);
  parameter.OnModified("animation");
  assert.equal(invalidations, 3);
  parameter.OnRemovedFromMaterial(material);
  parameter.OnModified("animation");
  assert.equal(invalidations, 3);
});
