import { composeStubResMan } from "../support/stubResMan.js";

// Texture parameters ask be.resMan for their texture as Carbon asks BeResMan,
// which always answers with the typed resource; the stub does the same. Import
// declarations are hoisted, so this runs after every import in the file.
composeStubResMan();

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { DictReader, be } from "../../npm/dist/global/blue/index.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { BLUELISTEVENT } from "../../npm/dist/global/consts/blue.js";
import {
  EveChildContainer,
  EveMultiEffect,
  EveMultiEffectParameter,
  EveStretch3,
  EveUpdateContext,
  Tr2Controller,
  Tr2ControllerExpression,
  Tr2DynamicBinding,
  Tr2ExternalParameter,
  Tr2FloatParameter,
  Tr2PyValueBinding,
  Tr2Vector3Parameter,
  TriCurveSet,
  TriTextureParameter,
  TriValueBinding
} from "../../npm/dist/trinity/index.js";
import { UpdateContext } from "../support/eveUpdateContext.js";


function closeArray(actual, expected, epsilon = 1e-6)
{
  assert.equal(actual.length, expected.length);
  for (let index = 0; index < expected.length; index++)
  {
    assert.ok(Math.abs(actual[index] - expected[index]) <= epsilon, `index ${index}`);
  }
}


test("Tr2DynamicBinding resolves Carbon path forms and delay boundaries", t =>
{
  // Link reads BeOS->GetCurrentFrameTime() and adds TimeFromMS(bindingDelay); Update compares
  // Be::Time ticks (Tr2DynamicBinding.cpp:221-251). 10 s is 100_000_000 ticks; 100 ms is 1_000_000.
  t.mock.method(be.os, "GetCurrentFrameTime", () => 100_000_000);
  const source = {
    children: [
      { name: "first", value: 2 },
      { name: "flare", value: 3 }
    ]
  };
  const destination = { value: 0 };
  const owner = {
    GetParameterMap()
    {
      return { Source: source, Destination: destination };
    }
  };
  const binding = new Tr2DynamicBinding();
  binding.sourceObjectPath = "Source.children[\"flare\"]";
  binding.sourceObjectAttribute = "value";
  binding.destinationObjectPath = "Destination";
  binding.destinationObjectAttribute = "value";
  binding.scale = 4;
  binding.bindingDelay = 100;
  binding.SetOwner(owner);

  assert.equal(binding.Link(), true);
  assert.equal(binding.IsSourceValid(), true);
  assert.equal(binding.IsDestinationValid(), true);
  assert.equal(binding.Update(100_990_000), false);
  assert.equal(destination.value, 0);
  assert.equal(binding.Update(101_000_000), true);
  assert.equal(destination.value, 12);

  binding.bindingDelay = 0;
  binding.sourceObjectPath = "Source.children[-2]";
  binding.OnModified();
  binding.Update(101_000_000);
  assert.equal(destination.value, 8);

  binding.sourceObjectPath = "Source.children[wat]";
  binding.OnModified();
  assert.equal(binding.IsSourceValid(), false);
  assert.equal(binding.binding, null);
});


test("Tr2DynamicBinding only relinks for Carbon NOTIFY fields", () =>
{
  const source = { value: 2 };
  const destination = { value: 0 };
  const binding = new Tr2DynamicBinding();
  binding.sourceObjectPath = "Source";
  binding.sourceObjectAttribute = "value";
  binding.destinationObjectPath = "Destination";
  binding.destinationObjectAttribute = "value";
  binding.SetOwner({ GetParameterMap: () => ({ Source: source, Destination: destination }) });
  binding.Link();
  const first = binding.binding;

  new DictReader({ declarations: true }).ReadInto(binding, { name: "renamed", bindingDelay: 500 });
  assert.equal(binding.binding, first);
  new DictReader({ declarations: true }).ReadInto(binding, { scale: 2 });
  assert.notEqual(binding.binding, first);
});


test("Tr2DynamicBinding relinks from Blue's frame time at the relink", t =>
{
  let frameTime = 200_000_000;
  t.mock.method(be.os, "GetCurrentFrameTime", () => frameTime);
  const source = { value: 2 };
  const destination = { value: 0 };
  const binding = new Tr2DynamicBinding();
  binding.sourceObjectPath = "Source";
  binding.sourceObjectAttribute = "value";
  binding.destinationObjectPath = "Destination";
  binding.destinationObjectAttribute = "value";
  binding.bindingDelay = 100;
  binding.SetOwner({ GetParameterMap: () => ({ Source: source, Destination: destination }) });
  binding.Link();
  binding.Update(201_000_000);
  assert.equal(destination.value, 2);

  destination.value = 0;
  frameTime = 201_000_000;
  binding.scale = 2;
  binding.OnModified();
  assert.equal(binding.Update(201_990_000), false);
  assert.equal(destination.value, 0);
  assert.equal(binding.Update(202_010_000), true);
  assert.equal(destination.value, 4);
});


test("Tr2DynamicBinding rejects primitive path endpoints", () =>
{
  const binding = new Tr2DynamicBinding();
  binding.sourceObjectPath = "Primitive";
  binding.sourceObjectAttribute = "value";
  binding.destinationObjectPath = "Destination";
  binding.destinationObjectAttribute = "value";
  binding.SetOwner({ GetParameterMap: () => ({ Primitive: 3, Destination: { value: 0 } }) });
  assert.doesNotThrow(() => binding.Link());
  assert.equal(binding.IsSourceValid(), false);
  assert.equal(binding.binding, null);
});


test("TriValueBinding enforces Carbon copy plans", () =>
{
  const invalid = new TriValueBinding();
  invalid.SetSource("value", { value: "source" });
  invalid.SetDestination("value", { value: "destination" });
  assert.equal(invalid.IsValid(), false);

  const matrix = mat4.create();
  matrix[12] = 4;
  matrix[13] = 5;
  matrix[14] = 6;
  const translated = { value: new Float32Array(3) };
  const matrixBinding = new TriValueBinding();
  matrixBinding.SetSource("value", { value: matrix });
  matrixBinding.SetDestination("value", translated);
  matrixBinding.scale = 2;
  matrixBinding.offset.set([1, 2, 3, 4]);
  matrixBinding.Initialize();
  assert.equal(matrixBinding.CopyValue(), true);
  closeArray(translated.value, [9, 12, 15]);

  const source2 = { value: new Float32Array([2, 3]) };
  const destination4 = { value: new Float32Array([9, 9, 9, 9]) };
  const vectorBinding = new TriValueBinding();
  vectorBinding.SetSource("value", source2);
  vectorBinding.SetDestination("value", destination4);
  vectorBinding.Initialize();
  vectorBinding.CopyValue();
  closeArray(destination4.value, [2, 3, 9, 9]);

  const broadcast = { value: new Float32Array(3) };
  const broadcastBinding = new TriValueBinding();
  broadcastBinding.SetSource("value", { value: 2 });
  broadcastBinding.SetDestination("value", broadcast);
  broadcastBinding.scale = 3;
  broadcastBinding.offset.set([1, 2, 3, 0]);
  broadcastBinding.Initialize();
  broadcastBinding.CopyValue();
  closeArray(broadcast.value, [7, 8, 9]);

  const matrixDestination = { value: mat4.create() };
  const matrixCopy = new TriValueBinding();
  matrixCopy.SetSource("value", { value: matrix });
  matrixCopy.SetDestination("value", matrixDestination);
  matrixCopy.scale = 99;
  matrixCopy.offset.set([99, 99, 99, 99]);
  matrixCopy.Initialize();
  matrixCopy.CopyValue();
  closeArray(matrixDestination.value, matrix);

  const booleanDestination = { value: false };
  const booleanCopy = new TriValueBinding();
  booleanCopy.SetSource("value", { value: -2 });
  booleanCopy.SetDestination("value", booleanDestination);
  booleanCopy.scale = 0;
  booleanCopy.offset[0] = 0;
  booleanCopy.Initialize();
  booleanCopy.CopyValue();
  assert.equal(booleanDestination.value, true);

  const int64Source = new Tr2ControllerExpression();
  const int64Destination = new Tr2ControllerExpression();
  int64Source.variableMask = 5n;
  int64Destination.variableMask = 1n;
  const int64Binding = new TriValueBinding();
  int64Binding.SetSource("variableMask", int64Source);
  int64Binding.SetDestination("variableMask", int64Destination);
  int64Binding.scale = 2;
  int64Binding.offset[0] = 1;
  assert.equal(int64Binding.CopyValue(), true);
  assert.equal(int64Destination.variableMask, 5n);
});


test("TriValueBinding callable copies remain publicly invalid like Carbon", () =>
{
  const source = { value: 3 };
  const destination = { value: 0 };
  const binding = new TriValueBinding();
  binding.SetSource("value", source);
  binding.SetDestination("value", destination);
  binding.copyValueCallable = (from, to) => { to.value = from.value; };
  binding.Initialize();
  assert.equal(binding.IsValid(), false);
  assert.equal(binding.CopyValue(), true);
  assert.equal(destination.value, 3);
});


test("Tr2PyValueBinding copies named portable object attributes", () =>
{
  const source = { sourceValue: 9 };
  const destination = { destinationValue: 0 };
  const binding = new Tr2PyValueBinding();
  binding.sourceObject = source;
  binding.destinationObject = destination;
  binding.sourceAttribute = "sourceValue";
  binding.destinationAttribute = "destinationValue";
  binding.OnModified();
  assert.equal(binding.isValid, true);
  binding.CopyValue();
  assert.equal(destination.destinationValue, 9);

  binding.sourceAttribute = "missing";
  binding.OnModified();
  binding.CopyValue();
  assert.equal(destination.destinationValue, 9);
});


test("TriValueBinding follows real vector and scalar shader reroutes", () =>
{
  const vectorSource = { value: new Float32Array([1, 2, 3]) };
  const vectorParameter = new Tr2Vector3Parameter();
  const vectorBinding = new TriValueBinding();
  vectorBinding.SetSource("value", vectorSource);
  vectorBinding.SetDestination("value", vectorParameter);
  vectorBinding.CopyValue();
  closeArray(vectorParameter.GetValue(), [1, 2, 3]);

  const vectorStorage = new Float32Array(3);
  vectorParameter.SetDestination(vectorStorage, 12);
  vectorSource.value.set([4, 5, 6]);
  vectorBinding.CopyValue();
  closeArray(vectorStorage, [4, 5, 6]);
  closeArray(vectorParameter.GetValue(), [4, 5, 6]);

  const scalarSource = { value: 7 };
  const scalarParameter = new Tr2FloatParameter();
  const scalarBinding = new TriValueBinding();
  scalarBinding.SetSource("value", scalarSource);
  scalarBinding.SetDestination("value", scalarParameter);
  scalarBinding.CopyValue();
  assert.equal(scalarParameter.GetDestination().dest.value, 7);
  assert.equal(scalarParameter.GetValue(), 7);

  const scalarStorage = new Float32Array(1);
  scalarParameter.SetDestination(scalarStorage, 4);
  scalarSource.value = 11;
  scalarBinding.CopyValue();
  assert.equal(scalarStorage[0], 11);
  assert.equal(scalarParameter.GetValue(), 11);
});


test("Tr2ExternalParameter validates types and exposes schema entries", () =>
{
  const target = new Tr2Vector3Parameter();
  const external = new Tr2ExternalParameter();
  external.SetDestinationObject(target);
  external.SetDestinationAttribute("value");
  assert.equal(external.IsValid(), true);
  assert.equal(external.GetDestinationEntry()?.type?.kind, "vec3");
  external.SetValue([1, 2, 3]);
  closeArray(target.value, [1, 2, 3]);
  assert.throws(() => external.SetValue([4, 5]), /incompatible type/);
  closeArray(target.value, [1, 2, 3]);

  external.SetDestinationAttribute("value.g");
  external.SetValue(9);
  assert.equal(target.value[1], 9);

  const invalid = new Tr2ExternalParameter();
  invalid.SetDestinationObject({ label: "value" });
  invalid.SetDestinationAttribute("label.x");
  assert.equal(invalid.IsValid(), false);
});


test("Tr2ExternalParameter binds a path-typed member, as SOF's banner parameters do", () =>
{
  // EveSOF points AllianceLogoResPath at a TriTextureParameter's resourcePath,
  // a path field; Carbon binds any member (Tr2ExternalParameter.cpp:88-108).
  const target = new TriTextureParameter();
  const external = new Tr2ExternalParameter();
  external.SetDestinationObject(target);
  external.SetDestinationAttribute("resourcePath");
  assert.equal(external.IsValid(), true);
  external.SetValue("res:/ui/texture/alliance.png");
  assert.equal(target.resourcePath, "res:/ui/texture/alliance.png");
});


test("EveMultiEffect owns dynamic graphs, preserves map precedence, and updates in Carbon order", () =>
{
  const calls = [];
  // Records a real instance's method calls and still runs the method.
  const record = (target, method, tag, keep = args => args) =>
  {
    const original = target[method].bind(target);
    target[method] = (...args) => { calls.push([ tag, ...keep(args) ]); return original(...args); };
  };

  const ownerParameter = new EveMultiEffectParameter();
  ownerParameter.name = "Owner";
  ownerParameter.SetParameterObject({ id: "parameter-owner" });
  record(ownerParameter, "SetOwner", "parameter-owner");
  const duplicateParameter = new EveMultiEffectParameter();
  duplicateParameter.name = "Duplicate";
  duplicateParameter.SetParameterObject({ id: "parameter" });
  const curveSet = new TriCurveSet();
  curveSet.name = "Duplicate";
  record(curveSet, "Update__RealTimeSimTime", "curve", args => args.slice(0, 2));
  const binding = new Tr2DynamicBinding();
  record(binding, "SetOwner", "binding-owner");
  record(binding, "Link", "link", () => []);
  record(binding, "Update", "binding-update");
  const controller = new Tr2Controller();
  record(controller, "Link", "controller-link");
  record(controller, "Unlink", "controller-unlink");
  record(controller, "Update", "controller-update");

  const effect = new EveMultiEffect();
  effect.parameters.push(ownerParameter, duplicateParameter);
  effect.curveSets.push(curveSet);
  effect.bindings.push(binding);
  effect.controllers.push(controller);
  assert.equal(effect.Initialize(), true);
  assert.deepEqual(calls.filter(([ tag ]) => tag.endsWith("owner")), [ [ "parameter-owner", effect ], [ "binding-owner", effect ] ]);

  // EveMultiEffect.cpp:31-47: curve sets after parameters, Owner last; a curve set is its own raw root.
  const parameterMap = effect.GetParameterMap();
  assert.equal(parameterMap.Owner, effect);
  assert.equal(parameterMap.Duplicate, curveSet);
  // GetBindingRoots: Owner first, so a parameter slot named Owner wins.
  const bindingRoots = effect.GetBindingRoots({});
  assert.equal(bindingRoots.Owner.id, "parameter-owner");
  assert.equal(bindingRoots.Duplicate.id, "parameter");

  calls.length = 0;
  effect.UpdateSyncronous(UpdateContext({ time: 7 }));
  assert.deepEqual(calls, [
    [ "curve", 7, 7 ],
    [ "controller-update", 0.5 ],
    [ "binding-update", 7 ]
  ]);
  assert.equal(effect.GetCurveSetDuration("Duplicate"), curveSet.GetMaxCurveDuration());
  assert.equal(effect.GetRangeDuration("Duplicate", "range"), curveSet.GetRangeDuration("range"));

  calls.length = 0;
  effect.OnListModified(BLUELISTEVENT.BELIST_REMOVED, 0, 0, binding, effect.bindings);
  effect.OnListModified(BLUELISTEVENT.BELIST_INSERTED, 0, 0, binding, effect.bindings);
  assert.deepEqual(calls.filter(([ tag ]) => tag === "binding-owner"), [ [ "binding-owner", null ], [ "binding-owner", effect ] ]);
  calls.length = 0;
  effect.OnListModified(BLUELISTEVENT.BELIST_INSERTED, 0, 0, curveSet, effect.bindings);
  assert.equal(calls.some(([ tag ]) => tag === "binding-owner"), false, "a value that is not a Tr2DynamicBinding fails Carbon's BlueCastPtr");
  effect.OnListModified(BLUELISTEVENT.BELIST_UNLOADSTART, 0, 0, null, effect.controllers);
  assert.ok(calls.some(([ tag ]) => tag === "controller-unlink"));
  assert.equal(effect.GetBoundingSphere(new Float32Array(4)), false);
  assert.equal(effect.GetLocalBoundingBox(new Float32Array(3), new Float32Array(3)), false);
});


test("EveStretch3 supplies dynamic parameter roots and binding ownership", () =>
{
  const sourceObject = new EveChildContainer();
  const stretchObject = new EveChildContainer();
  sourceObject.translation.set([5, 2, 1]);
  const binding = new Tr2DynamicBinding();
  binding.sourceObjectPath = "SourceObject";
  binding.sourceObjectAttribute = "translation";
  binding.destinationObjectPath = "StretchObject";
  binding.destinationObjectAttribute = "translation";
  const stretch = new EveStretch3();
  stretch.sourceObject = sourceObject;
  stretch.stretchObject = stretchObject;
  stretch.dynamicBindings.push(binding);
  stretch.Initialize();
  const context = new EveUpdateContext();
  // The binding is due from Blue's frame time at Link (Tr2DynamicBinding.cpp:248); the scene
  // update time of a real frame is that same clock.
  context.SetTime(be.os.GetCurrentFrameTime());
  stretch.UpdateSynchronous(context);
  closeArray(stretchObject.translation, [5, 2, 1]);
  assert.equal(stretch.GetParameterMap().SourceObject, sourceObject);
});


test("dynamic graph classes live only in maintained human-readable trees", () =>
{
  for (const path of [
    "../../src/trinity/core/binding/Tr2DynamicBinding.js",
    "../../src/trinity/core/binding/Tr2ExternalParameter.js",
    "../../src/trinity/core/binding/TriValueBinding.js",
    "../../src/trinity/eve/effect/multiEffect/EveMultiEffect.js"
  ])
  {
    assert.equal(existsSync(new URL(path, import.meta.url)), true, path);
  }
  for (const path of [
    "../../src/trinity/generated/trinityCore/Tr2DynamicBinding.js",
    "../../src/trinity/generated/trinityCore/Tr2ExternalParameter.js",
    "../../src/trinity/generated/trinityCore/TriValueBinding.js",
    "../../src/trinity/generated/eve/effect/EveMultiEffect.js"
  ])
  {
    assert.equal(existsSync(new URL(path, import.meta.url)), false, path);
  }
  assert.equal(CjsSchema.getMethod(Tr2DynamicBinding, "Link")?.impl?.status, "adapted");
  assert.equal(CjsSchema.getMethod(EveMultiEffect, "UpdateAsyncronous")?.impl?.status, "noop");
  const sourceProperty = CjsSchema.getSchema(TriValueBinding).properties.find(field => field.name === "sourceObject");
  const sourceMember = CjsSchema.getSchema(TriValueBinding).members.find(field => field.name === "sourceObject");
  assert.notEqual(sourceProperty.edit.persist, true);
  assert.equal(sourceProperty.edit.read, true);
  assert.equal(sourceProperty.edit.write, true);
  assert.equal(sourceMember.edit.persistOnly, true);
  assert.equal(sourceMember.type.kind, "rootRef");
  assert.equal(sourceMember.key, "_sourceObject");
});


test("TriValueBinding live endpoint edits rebuild and detach reroutes", () =>
{
  const source = new Tr2FloatParameter();
  source.SetValue(7);
  const oldTarget = new Tr2FloatParameter();
  const nextTarget = new Tr2FloatParameter();
  const binding = new TriValueBinding();
  assert.equal(binding.sourceObject, null);
  assert.equal(binding.destinationObject, null);
  binding.SetSource("value", source);
  binding.SetDestination("value", oldTarget);
  binding.CopyValue();
  assert.equal(oldTarget.GetValue(), 7);
  binding.SetDestinationObject(nextTarget);
  const storage = new Float32Array(1);
  nextTarget.SetDestination(storage, 4);
  source.SetValue(9);
  binding.CopyValue();
  assert.equal(storage[0], 9);
  assert.equal(oldTarget.GetValue(), 7);
  oldTarget.SetDestination(new Float32Array(1), 4);
  source.SetValue(11);
  binding.CopyValue();
  assert.equal(storage[0], 11);

  const replacement = new Tr2FloatParameter();
  replacement.SetValue(13);
  binding.CreateWeakBinding(source, "value", nextTarget, "value");
  binding.sourceObject = replacement;
  assert.equal(binding.isWeak, true);
  binding.CopyValue();
  assert.equal(storage[0], 13);
});


test("Tr2DynamicBinding registers for sim-time rebases from construction until Destroy", t =>
{
  // Carbon's constructor registers and its destructor unregisters (Tr2DynamicBinding.cpp:172-190);
  // a rebase moves the pending tick time (:206-209).
  t.mock.method(be.os, "GetCurrentFrameTime", () => 100_000_000);
  const binding = new Tr2DynamicBinding();
  assert.equal(be.os._rebaseListeners.includes(binding), true, "registered by the constructor");
  binding.sourceObjectPath = "Source";
  binding.sourceObjectAttribute = "value";
  binding.destinationObjectPath = "Destination";
  binding.destinationObjectAttribute = "value";
  binding.bindingDelay = 100;
  const destination = { value: 0 };
  binding.SetOwner({ GetParameterMap: () => ({ Source: { value: 7 }, Destination: destination }) });
  assert.equal(binding.Link(), true);
  for (const listener of be.os._rebaseListeners)
  {
    if (listener === binding) listener.OnSimClockRebase(100_000_000, 150_000_000);
  }
  assert.equal(binding.Update(101_000_000), false, "the due time moved with the rebase");
  assert.equal(binding.Update(151_000_000), true);
  assert.equal(destination.value, 7);
  binding.Destroy();
  assert.equal(be.os._rebaseListeners.includes(binding), false, "Destroy unregisters");
  assert.equal(binding.binding, null);
});
