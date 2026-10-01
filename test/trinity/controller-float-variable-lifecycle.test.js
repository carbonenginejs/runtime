import assert from "node:assert/strict";
import test from "node:test";
import { IInitialize } from "../../npm/dist/global/blue/IInitialize.js";
import { INotify } from "../../npm/dist/global/blue/INotify.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { Tr2Controller } from "../../npm/dist/trinity/controllers/Tr2Controller.js";
import { Tr2ControllerFloatVariable } from "../../npm/dist/trinity/controllers/expression/Tr2ControllerFloatVariable.js";
import { Tr2TimelineController } from "../../npm/dist/trinity/controllers/timeline/Tr2TimelineController.js";

test("controller float variable declares its native lifecycle interfaces", () =>
{
  const interfaces = mappedInterfaces(Tr2ControllerFloatVariable);
  assert.ok(interfaces.has(IInitialize));
  assert.ok(interfaces.has(INotify));
  assert.equal(CjsSchema.getField(Tr2ControllerFloatVariable, "value").type.kind, "float32");
});

test("controller float variable lifecycle does not call values helpers or emit events", () =>
{
  const variable = new Tr2ControllerFloatVariable();
  variable.SetValues = () => { throw new Error("unexpected values transport"); };
  variable.UpdateValues = () => { throw new Error("unexpected values settle"); };
  const events = [];
  variable.OnEvent("modified", (...args) => events.push(args));
  const calls = [];
  const dirty = { value: 0n };
  variable.SetDestinationBuffer(value => calls.push(value));
  variable.SetDirtyMask(dirty, 8n);
  calls.length = 0;

  // Native Initialize only assigns m_value (Tr2ControllerFloatVariable.cpp:17-20).
  variable.defaultValue = 7;
  assert.equal(variable.Initialize(), true);
  assert.equal(variable.GetValue(), 7);
  assert.deepEqual(calls, []);
  assert.equal(dirty.value, 0n);

  assert.equal(variable.SetValue(7), undefined);
  assert.deepEqual(calls, [7]);
  assert.equal(dirty.value, 8n);
  dirty.value = 0n;
  assert.equal(variable.SetValue(7), undefined);
  assert.deepEqual(calls, [7, 7], "equal native writes still publish");
  assert.equal(dirty.value, 8n);

  dirty.value = 0n;
  variable.value = 3;
  assert.equal(variable.OnModified("value"), true);
  assert.deepEqual(calls, [7, 7, 3]);
  assert.equal(dirty.value, 8n);
  assert.deepEqual(events, []);
});

for (const Constructor of [Tr2Controller, Tr2TimelineController])
{
  test(`${CjsSchema.getClassName(Constructor)} links an initialized variable into its expression buffer`, () =>
  {
    const variable = new Tr2ControllerFloatVariable();
    variable.name = "speed";
    variable.defaultValue = 7;
    variable.value = 2;
    assert.equal(variable.Initialize(), true);

    const controller = new Constructor();
    controller.variables.push(variable);
    controller.Link({});
    assert.equal(controller.GetVariableBuffer()[0], 7);
    assert.equal(variable.SetValue(9), undefined);
    assert.equal(controller.GetVariableBuffer()[0], 9);

    variable.defaultValue = 4;
    assert.equal(variable.Initialize(), true);
    assert.equal(variable.GetValue(), 4);
    assert.equal(controller.GetVariableBuffer()[0], 9,
      "initialization after Link does not republish the expression buffer");
    controller.Unlink();
  });
}
