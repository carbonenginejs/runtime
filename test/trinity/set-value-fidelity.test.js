import test from "node:test";
import assert from "node:assert/strict";
import { Tr2ActionSetValue } from "../../npm/dist/trinity/controllers/action/Tr2ActionSetValue.js";
import { CjsControllerExpressionCompileError } from "../../npm/dist/trinity/controllers/expression/CjsControllerExpressionCompileError.js";
import { CjsControllerExpressionEvaluateError } from "../../npm/dist/trinity/controllers/expression/CjsControllerExpressionEvaluateError.js";

function fixture(source = "0", variable = 1)
{
  const destination = { value: 99 };
  const controller = {
    GetOwner()
    {
      return {};
    },
    GetVariableValue()
    {
      return variable;
    }
  };
  const action = new Tr2ActionSetValue();
  action.destination = destination;
  action.attribute = "value";
  action.value = source;
  return { action, controller, destination };
}

test("set-value validity observes retained compilation without compiling", () =>
{
  const { action, controller, destination } = fixture("5");
  assert.equal(action.IsExpressionValid(), false);
  action.Link(controller);
  assert.equal(action.IsExpressionValid(), true);
  action.value = "invalid(";
  assert.equal(action.IsExpressionValid(), true);
  action.Start();
  assert.equal(destination.value, 5);
  action.OnModified("value");
  assert.equal(action.IsExpressionValid(), false);
  destination.value = 99;
  action.Start();
  assert.equal(destination.value, 99);
  action.Unlink();
  action.value = "2";
  assert.equal(action.IsExpressionValid(), false);
});

test("blank set-value expressions skip writes while literal zero writes", () =>
{
  for (const source of ["", "   ", "0"])
  {
    const { action, controller, destination } = fixture(source);
    action.Link(controller);
    assert.equal(action.IsExpressionValid(), source === "0");
    action.Start();
    assert.equal(destination.value, source === "0" ? 0 : 99);
  }
});

test("set-value evaluates against its linked controller until relink", () =>
{
  const { action, controller, destination } = fixture("input", 3);
  const second = fixture("input", 8).controller;
  action.Link(controller);
  action.Start(second);
  assert.equal(destination.value, 3);
  action.Start({
    GetOwner()
    {
      throw new Error("unused Start controller owner");
    }
  });
  assert.equal(destination.value, 3);
  action.Link(second);
  action.Start(controller);
  assert.equal(destination.value, 8);
});

test("set-value expression errors distinguish unlinked, parsing and evaluation failures", () =>
{
  const { action, controller, destination } = fixture("1");
  assert.throws(() => action.EvaluateExpression("("), CjsControllerExpressionEvaluateError);
  action.Link(controller);
  for (const source of ["", " ", "("])
  {
    assert.throws(() => action.EvaluateExpression(source), CjsControllerExpressionCompileError);
  }
  assert.equal(action.EvaluateExpression("0"), 0);
  controller.GetExpressionContext = () =>
  {
    throw false;
  };
  assert.throws(() => action.EvaluateExpression("1"), error => error instanceof CjsControllerExpressionEvaluateError && error.cause === false);
  action.Start();
  assert.equal(destination.value, 99);
});

test("set-value preserves a successful nonfinite result", () =>
{
  const { action, controller, destination } = fixture("(-1)^0.5");
  action.Link(controller);
  assert.equal(action.IsExpressionValid(), true);
  action.Start();
  assert.ok(Number.isNaN(destination.value));
  assert.ok(Number.isNaN(action.EvaluateExpression("(-1)^0.5")));
});

test("binding write errors stay outside expression failure handling", () =>
{
  const { action, controller, destination } = fixture("2");
  action.Link(controller);
  const failure = new Error("destination write");
  Object.defineProperty(destination, "value", {
    get()
    {
      return 99;
    },
    set()
    {
      throw failure;
    }
  });
  assert.throws(() => action.Start(), error => error === failure);
});
