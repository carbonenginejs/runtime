import assert from "node:assert/strict";
import test from "node:test";

import {
  ITr2ActionController,
  ITr2Controller,
  withITr2ActionController,
  withITr2Controller
} from "../../npm/dist/trinity/controllers/index.js";

test("the seven defaulted verbs do nothing, which is Carbon's behaviour", () =>
{
  // Only IsLinked is pure virtual in ITr2Controller.h. Link, Unlink, Start,
  // Stop, Update, SetVariable and HandleEvent have EMPTY BODIES. That is what
  // 235 call sites were emulating one `?.` at a time.
  class Silent extends withITr2Controller(Object)
  {
    IsLinked()
    {
      return true;
    }
  }

  const controller = new Silent();

  assert.equal(controller.Link({}), undefined);
  assert.equal(controller.Unlink(), undefined);
  assert.equal(controller.Start(), undefined);
  assert.equal(controller.Stop(), undefined);
  assert.equal(controller.Update(0.5), undefined);
  assert.equal(controller.SetVariable("speed", 2), undefined);
  assert.equal(controller.HandleEvent("fired"), undefined);
});

test("the one method with no sensible default refuses to guess", () =>
{
  // Answering false would let an owner skip a linked controller; answering true
  // would let it drive an unlinked one. Carbon makes it pure virtual for that
  // reason, so an implementor that forgets it must find out.
  class Forgetful extends withITr2Controller(Object) {}

  assert.throws(() => new Forgetful().IsLinked(), /IsLinked must be implemented/);
});

test("a class keeps its own implementation, the contract only fills gaps", () =>
{
  class Real extends withITr2Controller(Object)
  {
    constructor()
    {
      super();
      this.updates = 0;
    }

    Update(frequency)
    {
      this.updates += frequency;
    }

    IsLinked()
    {
      return true;
    }
  }

  const controller = new Real();

  controller.Update(2);
  controller.Start();

  assert.equal(controller.updates, 2, "its own Update ran, not the empty one");
});

test("the contract is nominal, so an object literal is not a controller", () =>
{
  // This is the point. A bare `{ Update() {} }` reads as a controller to a
  // `?.Update?.()` call site and is not one, which is how a fake in a test
  // keeps a guard alive in production code.
  class Real extends withITr2Controller(Object)
  {
    IsLinked()
    {
      return true;
    }
  }

  assert.equal(new Real() instanceof ITr2Controller, true);
  assert.equal({ Update() {} } instanceof ITr2Controller, false);
  assert.equal(null instanceof ITr2Controller, false);
  assert.equal(undefined instanceof ITr2Controller, false);
});

test("an action controller is also a controller, and the reverse is not true", () =>
{
  // Carbon's ITr2ActionController extends ITr2Controller in the same header.
  // Tr2ControllerReference implements only the first eight methods, so a
  // caller must be able to tell the two apart.
  class Action extends withITr2ActionController(Object)
  {
    IsLinked()
    {
      return true;
    }
  }

  class Plain extends withITr2Controller(Object)
  {
    IsLinked()
    {
      return true;
    }
  }

  assert.equal(new Action() instanceof ITr2Controller, true);
  assert.equal(new Action() instanceof ITr2ActionController, true);
  assert.equal(new Plain() instanceof ITr2Controller, true);
  assert.equal(new Plain() instanceof ITr2ActionController, false);
});

test("the eleven action verbs have no defaults and say so", () =>
{
  // All eleven are pure virtual in Carbon. There is nothing harmless for
  // GetVariableBuffer to return.
  class Action extends withITr2ActionController(Object) {}

  const controller = new Action();

  assert.throws(() => controller.GetOwner(), /GetOwner must be implemented/);
  assert.throws(() => controller.Callback("x"), /Callback must be implemented/);
  assert.throws(() => controller.RegisterUpdateable({}), /RegisterUpdateable must be implemented/);
  assert.throws(() => controller.GetVariableBuffer(), /GetVariableBuffer must be implemented/);

  assert.equal(controller.Update(1), undefined, "but the inherited defaults still do nothing");
});
