import assert from "node:assert/strict";
import test from "node:test";
import { Copier } from "../../npm/dist/global/blue/Copier.js";
import { IInitialize } from "../../npm/dist/global/blue/IInitialize.js";
import { INotify } from "../../npm/dist/global/blue/INotify.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { Tr2Controller } from "../../npm/dist/trinity/controllers/Tr2Controller.js";
import { Tr2ControllerFloatVariable } from "../../npm/dist/trinity/controllers/expression/Tr2ControllerFloatVariable.js";
import { EveChildContainer } from "../../npm/dist/trinity/eve/child/EveChildContainer.js";
import { EveChildEffectPropagator } from "../../npm/dist/trinity/eve/child/EveChildEffectPropagator.js";
import { EveChildExplosion } from "../../npm/dist/trinity/eve/child/EveChildExplosion.js";
import { EveChildTransform } from "../../npm/dist/trinity/eve/child/EveChildTransform.js";
import { EveEntity } from "../../npm/dist/trinity/eve/EveEntity.js";
import { EveSpaceObjectChild } from "../../npm/dist/trinity/eve/child/EveSpaceObjectChild.js";
import { IEveSpaceObjectChild } from "../../npm/dist/trinity/eve/child/IEveSpaceObjectChild.js";
import { EveSpaceObject2 } from "../../npm/dist/trinity/eve/spaceObject/EveSpaceObject2.js";

function MakeSource(t)
{
  const source = new EveChildContainer();
  const controller = new Tr2Controller();
  for (const [ name, defaultValue ] of [ [ "TurretState", 2 ], [ "Gain", 0.5 ] ])
  {
    const variable = new Tr2ControllerFloatVariable();
    variable.name = name;
    variable.defaultValue = defaultValue;
    variable.Initialize();
    controller.variables.push(variable);
  }
  source.controllers.push(controller);
  source.objects.push(new EveChildContainer());
  source.Initialize();
  t.after(() => controller.Unlink());
  assert.equal(controller.GetOwner(), source, "the synthetic source is already linked");
  assert.deepEqual(Array.from(controller.GetVariableBuffer()), [ 2, 0.5 ]);
  return source;
}

function Clone(t, source, destination = null)
{
  const copy = new Copier().CloneTo(source, destination);
  assert.ok(copy, "copy construction succeeds before checking initialization");
  assert.equal(copy.controllers.length, 1);
  t.after(() => copy.controllers[0].Unlink());
  return copy;
}

test("the shared child transform base remains outside IInitialize exposure", () =>
{
  assert.equal(mappedInterfaces(EveChildTransform).has(IInitialize), false);
});

test("child containers expose their native initializer", () =>
{
  // EveChildContainer.h:38 and EveChildContainer_Blue.cpp:39.
  assert.equal(mappedInterfaces(EveChildContainer).has(IInitialize), true);
});

test("concrete descendant interface tables retain their exact native exposure boundaries", () =>
{
  // These concrete Blue tables map EveChildContainer but do not map IInitialize
  // or chain the parent exposure table: EveChildExplosion_Blue.cpp:148 and
  // EveChildEffectPropagator_Blue.cpp:79 end with EXPOSURE_END.
  assert.deepEqual(mappedInterfaces(EveChildExplosion), new Set([
    EveChildExplosion, EveChildContainer, EveEntity, EveSpaceObjectChild, IEveSpaceObjectChild
  ]));
  assert.deepEqual(mappedInterfaces(EveChildEffectPropagator), new Set([
    EveChildEffectPropagator, EveChildContainer, EveSpaceObjectChild, IEveSpaceObjectChild, INotify, EveEntity
  ]));
});

test("copying an explosion does not dispatch inherited initialization or notification methods", t =>
{
  const source = new EveChildExplosion();
  source.name = "synthetic explosion copy";
  const initialize = t.mock.method(EveChildExplosion.prototype, "Initialize");
  const modified = t.mock.method(EveChildExplosion.prototype, "OnModified");

  const copy = new Copier().CloneTo(source);

  assert.ok(copy);
  assert.notEqual(copy, source);
  assert.equal(copy.name, source.name, "a changed persisted member exercises lifecycle dispatch");
  assert.equal(initialize.mock.callCount(), 0, "the concrete table does not map IInitialize");
  assert.equal(modified.mock.callCount(), 0, "the concrete table does not map INotify");
});

test("copying a propagator notifies changed completeness and invokes its real clamp without initializing", t =>
{
  const source = new EveChildEffectPropagator();
  source.completeness = -0.25;
  const initialize = t.mock.method(EveChildEffectPropagator.prototype, "Initialize");
  const modified = t.mock.method(EveChildEffectPropagator.prototype, "OnModified");

  const copy = new Copier().CloneTo(source);

  assert.ok(copy);
  assert.notEqual(copy, source);
  assert.equal(initialize.mock.callCount(), 0, "the concrete table maps INotify but not IInitialize");
  assert.equal(modified.mock.callCount(), 1);
  assert.equal(modified.mock.calls[0].this, copy);
  assert.deepEqual(modified.mock.calls[0].arguments, [ "completeness" ]);
  assert.equal(copy.completeness, 0, "the call-through spy executes the real OnModified clamp");
  assert.equal(source.completeness, -0.25, "copy notification does not modify its source");
});

test("CloneTo links each copied controller and isolates its expression variable buffer", t =>
{
  const source = MakeSource(t);
  source.SetControllerVariable("TurretState", 11);
  const first = Clone(t, source);
  const second = Clone(t, source);
  const sourceController = source.controllers[0];
  const firstController = first.controllers[0];
  const secondController = second.controllers[0];

  assert.notEqual(firstController, sourceController);
  assert.notEqual(secondController, firstController);
  assert.equal(firstController.IsLinked(), true, "Copier must run the mapped owner initializer");
  assert.equal(firstController.GetOwner(), first);
  assert.equal(secondController.GetOwner(), second);
  assert.notEqual(firstController.variables[0], sourceController.variables[0]);
  assert.notEqual(secondController.variables[0], firstController.variables[0]);

  const sourceBuffer = sourceController.GetVariableBuffer();
  const firstBuffer = firstController.GetVariableBuffer();
  const secondBuffer = secondController.GetVariableBuffer();
  assert.notEqual(firstBuffer.buffer, sourceBuffer.buffer);
  assert.notEqual(secondBuffer.buffer, firstBuffer.buffer);
  assert.deepEqual(Array.from(firstBuffer), [ 2, 0.5 ], "copied variables publish their authored defaults");
  assert.deepEqual(Array.from(secondBuffer), [ 2, 0.5 ]);

  first.SetControllerVariable("TurretState", 7);
  second.SetControllerVariable("Gain", 3);
  assert.deepEqual(Array.from(firstBuffer), [ 7, 0.5 ]);
  assert.deepEqual(Array.from(secondBuffer), [ 2, 3 ]);
  assert.deepEqual(Array.from(sourceBuffer), [ 11, 0.5 ]);
  assert.equal(firstController.variables[0].GetValue(), 7);
  assert.equal(secondController.variables[1].GetValue(), 3);
  assert.equal(sourceController.GetOwner(), source);
});

test("CloneTo into an owned container registers copied children with the destination parent and owner", t =>
{
  const source = MakeSource(t);
  const sourceOwner = new EveSpaceObject2();
  const destinationOwner = new EveSpaceObject2();
  source.SetOwner(sourceOwner);
  // This destination is constructor-fresh. Replacing or unlinking a previously
  // linked destination controller is a separate lifecycle contract.
  const destination = new EveChildContainer();
  destination.SetOwner(destinationOwner);
  const copy = Clone(t, source, destination);
  const child = copy.objects[0];

  assert.equal(copy, destination);
  assert.notEqual(child, source.objects[0]);
  assert.ok(child.GetParent() === copy, "Initialize must execute RegisterChildren after the copy");
  assert.equal(copy.GetOwner(), destinationOwner);
  assert.equal(child.GetOwner(), destinationOwner);
  assert.equal(source.objects[0].GetParent(), source);
  assert.equal(source.objects[0].GetOwner(), sourceOwner);
  assert.equal(copy.controllers[0].GetOwner(), copy);
  // RegisterChildren attaches parent/owner links; scene component registration
  // still belongs to the separate explicit Register call.
});

test("repeated container initialization preserves an already copied controller link and buffer", t =>
{
  const copy = Clone(t, MakeSource(t));
  const controller = copy.controllers[0];
  assert.equal(controller.IsLinked(), true, "the first link belongs to CloneTo, not this test");
  assert.equal(controller.GetOwner(), copy);
  copy.SetControllerVariable("TurretState", 9);
  const buffer = controller.GetVariableBuffer();
  const view = controller.GetVariableView();
  const link = t.mock.method(controller, "Link");

  copy.Initialize();
  copy.Initialize();

  assert.equal(link.mock.callCount(), 0, "Initialize only links controllers that are unlinked");
  assert.equal(controller.GetOwner(), copy);
  assert.equal(controller.GetVariableBuffer(), buffer);
  assert.equal(controller.GetVariableView(), view);
  assert.deepEqual(Array.from(buffer), [ 9, 0.5 ]);
});
