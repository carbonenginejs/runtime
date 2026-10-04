// RegisterVariableType: Carbon's funnel behind every RegisterVariable overload
// (Tr2VariableStore.h:59-80), public here because JavaScript has no static
// types to pick the overload with.
import assert from "node:assert/strict";
import test from "node:test";
import { Tr2VariableStore } from "../../npm/dist/trinity/core/index.js";
import { TriVariableContentType } from "../../npm/dist/trinity/generated/trinityCore/enums.js";
import { EveSpaceScene } from "../../npm/dist/trinity/eve/index.js";

const { TRIVARIABLE_FLOAT, TRIVARIABLE_INT, TRIVARIABLE_COLOR } = TriVariableContentType;


test("a stated type survives values that inference would misread", () =>
{
  const store = new Tr2VariableStore();

  // A whole float stays a float, and a colour a colour; value inference read
  // them as INT and FLOAT4 (CE-53), and is not ported.
  assert.throws(() => store.RegisterVariable("whole", 1), TypeError);

  const whole = store.RegisterVariableInternal("whole", TRIVARIABLE_FLOAT, 1);
  assert.equal(whole.GetType(), TRIVARIABLE_FLOAT);
  assert.equal(store.RegisterVariableInternal("whole", TRIVARIABLE_INT, 2), null, "conflict leaves the value");
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
