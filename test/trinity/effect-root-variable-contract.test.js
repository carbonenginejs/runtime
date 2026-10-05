import assert from "node:assert/strict";
import test from "node:test";
import { EveEffectRoot2, EveSpaceObjectChild } from "../../npm/dist/trinity/index.js";
import { ITr2Controller } from "../../npm/dist/trinity/controllers/ITr2Controller/ITr2Controller.js";

for (const [Type, method] of [[ITr2Controller, "SetVariable"], [EveSpaceObjectChild, "SetControllerVariable"]])
{
  test(`effect-root variable replay requires ${method} on its receiver`, () =>
  {
    const receiver = new Type();
    receiver[method] = undefined;
    assert.throws(() => EveEffectRoot2._ApplyControllerVariables(receiver, new Map([["speed", 2]]), method), TypeError);
  });

  test(`effect-root ${method} replay preserves receiver and empty-map behavior`, () =>
  {
    const receiver = new Type();
    const calls = [];
    receiver[method] = function(name, value) { assert.equal(this, receiver); calls.push([name, value]); };
    EveEffectRoot2._ApplyControllerVariables(receiver, new Map([["speed", 2]]), method);
    assert.deepEqual(calls, [["speed", 2]]);
    receiver[method] = undefined;
    assert.doesNotThrow(() => EveEffectRoot2._ApplyControllerVariables(receiver, new Map(), method));
  });
}
