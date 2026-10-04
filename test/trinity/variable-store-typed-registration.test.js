// RegisterVariableType: Carbon's funnel behind every RegisterVariable overload
// (Tr2VariableStore.h:59-80), public here because JavaScript has no static
// types to pick the overload with.
import assert from "node:assert/strict";
import test from "node:test";
import { Tr2VariableStore } from "../../npm/dist/trinity/core/index.js";
import { TriVariableContentType } from "../../npm/dist/trinity/generated/trinityCore/enums.js";
import { EveSpaceScene } from "../../npm/dist/trinity/eve/index.js";

const { TRIVARIABLE_FLOAT, TRIVARIABLE_INT, TRIVARIABLE_FLOAT4, TRIVARIABLE_COLOR } = TriVariableContentType;


test("a stated type survives values that inference would misread", () =>
{
  const store = new Tr2VariableStore();

  // Inference reads a whole float as an int and any four numbers as FLOAT4.
  assert.equal(store.RegisterVariable("inferredWhole", 1).GetType(), TRIVARIABLE_INT);
  assert.equal(store.RegisterVariable("inferredColour", [ 1, 0, 0, 1 ]).GetType(), TRIVARIABLE_FLOAT4);

  const whole = store.RegisterVariableType("whole", TRIVARIABLE_FLOAT);
  whole.SetValue(1);
  assert.equal(whole.GetType(), TRIVARIABLE_FLOAT);
  assert.equal(whole.GetValue(), 1);

  const colour = store.RegisterVariableType("colour", TRIVARIABLE_COLOR);
  assert.equal(colour.GetType(), TRIVARIABLE_COLOR);
  assert.equal(colour.GetValue(), null, "holds nothing until SetValue");
});


test("RegisterVariableType reuses a matching variable and refuses a conflicting one", () =>
{
  const store = new Tr2VariableStore();
  const first = store.RegisterVariableType("x", TRIVARIABLE_FLOAT);
  assert.equal(store.RegisterVariableType("x", TRIVARIABLE_FLOAT), first);
  assert.equal(store.RegisterVariableType("x", TRIVARIABLE_INT), null, "Carbon returns null on a type conflict");
});


test("NebulaIntensity is Carbon's float, starting at 1 (EveSpaceScene.cpp:202)", () =>
{
  new EveSpaceScene();
  const variable = Tr2VariableStore.globalStore().FindVariable("NebulaIntensity");
  assert.equal(variable.GetType(), TRIVARIABLE_FLOAT);
  assert.equal(variable.GetValue(), 1);
});
