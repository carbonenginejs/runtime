import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { DictReader } from "../../npm/dist/global/blue/DictReader.js";
import { DictWriter } from "../../npm/dist/global/blue/DictWriter.js";
import { Copier } from "../../npm/dist/global/blue/Copier.js";
import { BlueList } from "../../npm/dist/global/blue/BlueList.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { ITr2ControllerAction } from "../../npm/dist/trinity/controllers/action/ITr2ControllerAction.js";
import { Tr2ActionCallback } from "../../npm/dist/trinity/controllers/action/Tr2ActionCallback.js";
import { Tr2ActionSetAudioEmitterPrefix } from "../../npm/dist/trinity/controllers/action/Tr2ActionSetAudioEmitterPrefix.js";
import { Tr2ActionSetAttenuationScaling } from "../../npm/dist/trinity/controllers/action/Tr2ActionSetAttenuationScaling.js";
import { Tr2ActionResetClipSphereCenter } from "../../npm/dist/trinity/controllers/action/Tr2ActionResetClipSphereCenter.js";
import { Tr2ActionSetShaderOption } from "../../npm/dist/trinity/controllers/action/Tr2ActionSetShaderOption.js";
import { ITr2SoundEmitterOwner } from "../../npm/dist/trinity/eve/ITr2SoundEmitterOwner.js";
import { ResetBehavior } from "../../npm/dist/trinity/controllers/enums.js";

const cases = [
  [Tr2ActionCallback, { callbackName: "finished" }],
  [Tr2ActionSetShaderOption, { key: "SPACE_OBJECT_CLIPPING", value: "SOC_ENABLED" }],
  [Tr2ActionSetAudioEmitterPrefix, { emitter: "main", prefix: "船" }],
  [Tr2ActionSetAttenuationScaling, { emitter: "main", controllerVariable: "scale", scalingFactor: 2 }],
  [Tr2ActionResetClipSphereCenter, { locatorSetName: "damage", locatorIndex: 1, resetBehavior: ResetBehavior.CUSTOM }]
];

for (const [Type, values] of cases)
{
  test(`${CjsSchema.getClassName(Type)} uses shared Blue construction and copying without model machinery`, () =>
  {
    const action = new DictReader().CreateObject({ _type: CjsSchema.getClassName(Type), ...values });
    assert.equal(Object.getPrototypeOf(Type.prototype), ITr2ControllerAction.prototype);
    assert.equal("GetValues" in action, false);
    assert.equal(CjsSchema.cast(action, ITr2ControllerAction), action);
    assert.deepEqual([...mappedInterfaces(Type)], [Type, ITr2ControllerAction]);
    assert.equal(Type.from, undefined);
    for (const name of ["SetValues", "GetValues", "UpdateValues", "Initialize", "Dispose"])
      assert.equal(action[name], undefined, name);
    const list = new BlueList(ITr2ControllerAction, { className: null, listOps: 0 });
    assert.equal(list.Append(action), true);
    assert.equal(list.GetAt(0), action);
    action.Link({});
    assert.equal(action.CanTransition(), true);
    assert.doesNotThrow(() => action.Stop({}));
    assert.doesNotThrow(() => action.RebaseSimTime(42));
    action.Unlink();
    const clone = new Copier().CloneTo(action);
    assert.ok(clone instanceof Type);
    assert.notEqual(clone, action);
    for (const [key, value] of Object.entries(values)) assert.equal(clone[key], value);
    new DictReader().ReadInto(clone, values);
    const written = new DictWriter().WriteObject(clone, {}, { persistOnly: true });
    for (const [key, value] of Object.entries(values)) assert.equal(written[key], value);
    assert.equal(Object.hasOwn(written, "finalScalingFactor"), false);
    assert.equal(Object.hasOwn(written, "_controller"), false);
  });
}

test("callback skips an empty name and requires the native controller method otherwise", () =>
{
  const action = new Tr2ActionCallback();
  assert.doesNotThrow(() => action.Start({}));
  action.callbackName = "done";
  const calls = [];
  action.Start({ Callback(name) { calls.push(name); } });
  assert.deepEqual(calls, ["done"]);
  assert.throws(() => action.Start({}), TypeError);
});

function SoundOwner(emitter)
{
  const owner = new ITr2SoundEmitterOwner();
  owner.FindSoundEmitter = name => {
    assert.equal(name, "main");
    return emitter;
  };
  return owner;
}

test("prefix requires a nominal sound owner and calls the emitter contract directly", () =>
{
  const action = new Tr2ActionSetAudioEmitterPrefix();
  action.emitter = "main";
  action.prefix = "船";
  const calls = [];
  const emitter = { SetPrefix(value) { calls.push(value); } };
  action.Start({ GetOwner: () => ({ FindSoundEmitter: () => emitter }) });
  assert.deepEqual(calls, []);
  action.Start({ GetOwner: () => SoundOwner(emitter) });
  assert.deepEqual(calls, ["船"]);
  action.Start({ GetOwner: () => null });
  action.Start({ GetOwner: () => SoundOwner(null) });
  assert.throws(() => action.Start({ GetOwner: () => SoundOwner({}) }), TypeError);
  assert.throws(() => action.StartWithController(null), TypeError);
  assert.equal(CjsSchema.getField(Tr2ActionSetAudioEmitterPrefix, "prefix").type.kind, "wstring");
});

test("attenuation uses Link for its variable source and Start only for the target", () =>
{
  const action = new Tr2ActionSetAttenuationScaling();
  action.emitter = "main";
  action.controllerVariable = "scale";
  action.scalingFactor = 2;
  let variable = 3, reads = 0;
  action.Link({ GetFloatVariableByName(name) { reads++; assert.equal(name, "scale"); return variable; } });
  const calls = [];
  const invoke = {
    GetOwner: () => SoundOwner({ SetAttenuationScalingFactor(value) { calls.push(value); } }),
    GetFloatVariableByName() { throw new Error("invocation controller must not supply the variable"); }
  };
  action.Start(invoke);
  assert.deepEqual(calls, [6]);
  for (const [input, expected] of [[4, 8], [0, 2], [undefined, 2], [-3, -6], [Infinity, Infinity], [NaN, NaN]])
  {
    variable = input;
    assert.equal(action.finalScalingFactor, expected);
  }
  const before = reads;
  action.Start({ GetOwner: () => null });
  action.Start({ GetOwner: () => SoundOwner(null) });
  action.Start({ GetOwner: () => ({ FindSoundEmitter() { throw new Error("duck owner called"); } }) });
  assert.equal(reads, before);
  action.Unlink();
  assert.equal(action.finalScalingFactor, 2);
  assert.equal(reads, before);
  action.Start(invoke);
  assert.equal(calls.at(-1), 2);
  assert.throws(() => { action.finalScalingFactor = 10; }, TypeError);
  assert.throws(() => action.StartWithController(null), TypeError);
});

test("shader option preserves its documented owner adapter during base removal", () =>
{
  const action = new Tr2ActionSetShaderOption(), calls = [];
  action.key = "key";
  action.value = "value";
  action.Start({ GetOwner: () => null });
  action.Start({ GetOwner: () => ({}) });
  action.Start({ GetOwner: () => ({ SetShaderOption(...args) { calls.push(args); } }) });
  assert.deepEqual(calls, [["key", "value"]]);
});

test("clip reset preserves its existing owner adapter during base removal", t =>
{
  const action = new Tr2ActionResetClipSphereCenter();
  const owner = {}, calls = [], positions = [{ position: [1, 2, 3] }, { position: [4, 5, 6] }];
  owner.ResetClipSphereCenter = () => calls.push("object");
  owner.ResetClipSphereCenterToPos = value => calls.push(value);
  owner.GetLastDamageLocatorHit = () => 1;
  owner.GetLocatorsForSet = name => name === "damage" ? positions : null;
  const controller = { GetOwner: () => owner };
  action.Start(controller);
  action.resetBehavior = ResetBehavior.LAST_DAMAGELOCATOR_HIT;
  action.Start(controller);
  assert.deepEqual(calls, ["object", positions[1].position]);
  action.resetBehavior = ResetBehavior.CUSTOM;
  action.locatorSetName = "missing";
  action.Start(controller);
  action.locatorSetName = "damage";
  action.locatorIndex = 2;
  action.Start(controller);
  assert.equal(calls.length, 2);
  const random = Math.random;
  t.after(() => { Math.random = random; });
  Math.random = () => 0.75;
  action.locatorIndex = -1;
  action.Start(controller);
  assert.deepEqual(Array.from(calls.at(-1)), positions[1].position);
  owner.GetLocatorsForSet = () => [];
  assert.doesNotThrow(() => action.Start(controller));
});
