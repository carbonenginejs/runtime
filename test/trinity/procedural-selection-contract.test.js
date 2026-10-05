import assert from "node:assert/strict";
import test from "node:test";
import {
  EveChildRef, EveProceduralMethodAttributeMapParameter, EveProceduralMethodCyclingParameter,
  EveProceduralMethodRandomParameter, EveProceduralMethodThresholdParameter
} from "../../npm/dist/trinity/index.js";

const cases = [
  [EveProceduralMethodAttributeMapParameter, "EveProceduralMethodAttributeMapParameter.cpp:57-63"],
  [EveProceduralMethodCyclingParameter, "EveProceduralMethodCyclingParameter.cpp:66-83"],
  [EveProceduralMethodRandomParameter, "EveProceduralMethodRandomParameter.cpp:74-80"],
  [EveProceduralMethodThresholdParameter, "EveProceduralMethodThresholdParameter.cpp:64-70"]
];

for (const [Parameter, donor] of cases)
{
  test(`${Parameter.name} requires the child Reload method`, () =>
  {
    const parameter = new Parameter();
    parameter.child = Object.assign(new EveChildRef(), { Reload: undefined });
    assert.throws(() => parameter.Load(), TypeError, donor);
    if (Parameter === EveProceduralMethodCyclingParameter) assert.equal(parameter._hasLoaded, false);
  });

  test(`${Parameter.name} keeps Carbon's absent-child guard`, () =>
  {
    const parameter = new Parameter();
    parameter.child = null;
    assert.doesNotThrow(() => parameter.Load(), donor);
    if (Parameter === EveProceduralMethodCyclingParameter) assert.equal(parameter._hasLoaded, false);
  });

  test(`${Parameter.name} reloads the real child with its automatic-load blocker bypassed`, () =>
  {
    const parameter = new Parameter();
    const child = new EveChildRef();
    let loads = 0;
    child.LoadChild = () => { loads++; };
    child.SetAutoLoadBlocker(true);
    parameter.child = child;
    child.Reload();
    assert.equal(loads, 0, "EveChildRef.cpp:39-45 respects the automatic-load blocker");
    parameter.Load();
    assert.equal(loads, 1, donor);
    if (Parameter === EveProceduralMethodCyclingParameter) assert.equal(parameter._hasLoaded, true);
  });
}

test("cycling parameters retain the loaded restart and explicit reload branches", () =>
{
  const parameter = new EveProceduralMethodCyclingParameter();
  const calls = [];
  parameter.child = Object.assign(new EveChildRef(), {
    Reload: bypass => calls.push(["reload", bypass]),
    StartControllers: () => calls.push(["controllers"]),
    PlayAllCurveSets: () => calls.push(["curves"])
  });
  parameter.Load();
  assert.deepEqual(calls, [["reload", true]]);
  calls.length = 0;
  parameter.reloadRequired = false;
  parameter.restartRequired = true;
  parameter.Load();
  assert.deepEqual(calls, [["controllers"], ["curves"]], "EveProceduralMethodCyclingParameter.cpp:68-76");
  calls.length = 0;
  parameter.restartRequired = false;
  parameter.Load();
  assert.deepEqual(calls, []);
  parameter.reloadRequired = true;
  parameter.Load();
  assert.deepEqual(calls, [["reload", true]], "EveProceduralMethodCyclingParameter.cpp:78-82");
});
