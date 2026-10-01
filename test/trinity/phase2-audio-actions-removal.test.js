import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { CjsModel } from "../../npm/dist/global/model/index.js";
import { blue, DictReader, DictWriter, Copier, BlueList, INotify } from "../../npm/dist/global/blue/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { ITr2ControllerAction } from "../../npm/dist/trinity/controllers/action/ITr2ControllerAction.js";
import { ITr2Updateable } from "../../npm/dist/trinity/core/ITr2Updateable.js";
import { ITr2SoundEmitterOwner } from "../../npm/dist/trinity/eve/ITr2SoundEmitterOwner.js";
import { Tr2ActionPlaySound } from "../../npm/dist/trinity/controllers/action/Tr2ActionPlaySound.js";
import { Tr2ActionSetAudioSwitch } from "../../npm/dist/trinity/controllers/action/Tr2ActionSetAudioSwitch.js";
import { Tr2ActionBindRTPC } from "../../npm/dist/trinity/controllers/action/Tr2ActionBindRTPC.js";

for (const [Type, values, extra] of [
  [Tr2ActionPlaySound, { emitter: "main", event: "start", target: "", bypassPrefix: true }, []],
  [Tr2ActionSetAudioSwitch, { emitter: "main", switchGroup: "船", switchState: "航行" }, []],
  [Tr2ActionBindRTPC, { value: "2", emitter: "main", rtpcName: "推力", curve: null }, [ITr2Updateable, INotify]]
])
{
  test(`${CjsSchema.getClassName(Type)} uses Blue construction and copy without model state`, () =>
  {
    const instance = new Type();
    assert.equal(Object.getPrototypeOf(Type.prototype), ITr2ControllerAction.prototype);
    assert.equal(CjsSchema.cast(instance, CjsModel), null);
    assert.deepEqual([...mappedInterfaces(Type)], [Type, ITr2ControllerAction, ...extra]);
    assert.equal(Type.from, undefined);
    for (const key of ["SetValues", "GetValues", "UpdateValues", "Initialize", "Dispose"])
      assert.equal(instance[key], undefined);
    const created = new DictReader({ declarations: true }).CreateObject({ _type: CjsSchema.getClassName(Type), ...values });
    const clone = new Copier().CloneTo(created);
    assert.ok(clone instanceof Type);
    const written = new DictWriter().WriteObject(clone, {}, { persistOnly: true });
    for (const [key, value] of Object.entries(values)) assert.equal(written[key], value);
    for (const key of ["_runtime", "_emitter", "isExpressionValid"]) assert.equal(Object.hasOwn(written, key), false);
    const list = new BlueList(ITr2ControllerAction, { className: null, listOps: 0 });
    assert.equal(list.Append(clone), true);
    assert.equal(list.GetAt(0), clone);
    assert.equal(clone.CanTransition(), true);
  });
}

function SoundOwner(emitter)
{
  const owner = new ITr2SoundEmitterOwner();
  owner.FindSoundEmitter = () => emitter;
  return owner;
}

test("Switch uses nominal owners, wide strings and required emitter methods without audio output", () =>
{
  const action = new Tr2ActionSetAudioSwitch(), calls = [];
  action.switchGroup = "船";
  action.switchState = "航行";
  const emitter = { SetSwitch: (...args) => calls.push(args) };
  action.Start({ GetOwner: () => ({ FindSoundEmitter: () => emitter }) });
  assert.deepEqual(calls, []);
  action.Start({ GetOwner: () => SoundOwner(emitter) });
  assert.deepEqual(calls, [["船", "航行"]]);
  action.Start({ GetOwner: () => null });
  action.Start({ GetOwner: () => SoundOwner(null) });
  assert.throws(() => action.Start({ GetOwner: () => SoundOwner({}) }), TypeError);
  assert.throws(() => action.StartWithController(null), TypeError);
  for (const name of ["switchGroup", "switchState"])
    assert.equal(CjsSchema.getField(Tr2ActionSetAudioSwitch, name).type.kind, "wstring");
});

test("PlaySound preserves target adapters while requiring SendEvent on a returned emitter", () =>
{
  const action = new Tr2ActionPlaySound(), calls = [];
  const owner = SoundOwner({ SendEvent: (...args) => calls.push(args) });
  action.event = "event";
  action.bypassPrefix = true;
  action.Start({ GetOwner: () => owner });
  action.target = "speaker";
  action.Start({ GetOwner: () => ({ GetParameterByName: () => ({ GetParameterObject: () => owner }) }) });
  action.Start({ GetOwner: () => ({ GetEffectChildByName: () => owner }) });
  assert.deepEqual(calls, [["event", true], ["event", true], ["event", true]]);
  action.Start({ GetOwner: () => ({ GetParameterByName: () => null }) });
  assert.equal(calls.length, 3);
  action.target = "";
  assert.throws(() => action.Start({ GetOwner: () => SoundOwner({}) }), TypeError);
  assert.throws(() => action.StartWithController(null), TypeError);
});

test("BindRTPC retains expressions and cached targets, with Blue notification and balanced registration", t =>
{
  t.mock.method(blue.os, "GetCurrentFrameTime", () => 100000000);
  const action = new Tr2ActionBindRTPC(), writes = [], updates = new Set();
  let emitter = { SetRTPC: (...args) => writes.push(args) };
  const owner = SoundOwner(null);
  owner.FindSoundEmitter = () => emitter;
  const controller = { GetOwner: () => owner, RegisterUpdateable: item => updates.add(item), UnRegisterUpdateable: item => updates.delete(item) };
  assert.equal(action.isExpressionValid, false);
  action.value = "2";
  action.rtpcName = "推力";
  action.Link(controller);
  action.Start(controller);
  assert.equal(updates.has(action), true);
  emitter = { SetRTPC() { throw new Error("must use cached emitter"); } };
  action.Update(0, 110000000);
  action.value = "7";
  assert.equal(action.isExpressionValid, true);
  action.Update(0, 120000000);
  new DictReader({ declarations: true }).ReadInto(action, { value: "7" });
  action.Update(0, 130000000);
  assert.deepEqual(writes, [["推力", 2], ["推力", 2], ["推力", 7]]);
  assert.equal(action.RebaseSimTime, ITr2ControllerAction.prototype.RebaseSimTime);
  action.Stop(controller);
  assert.equal(updates.size, 0);
  action.Unlink();
  action.Update(0, 150000000);
  assert.equal(action._runtime.lastTime, 150000000);
  assert.equal(action.isExpressionValid, false);
  assert.equal(CjsSchema.getField(Tr2ActionBindRTPC, "rtpcName").type.kind, "wstring");
  assert.throws(() => action.StartWithController(null), TypeError);
  assert.throws(() => action.StopWithController(null), TypeError);
});

test("BindRTPC evaluates without an emitter and separates evaluation failure from target failure", () =>
{
  const action = new Tr2ActionBindRTPC();
  let value = 3, reads = 0;
  const writes = [];
  const controller = { GetOwner: () => null, GetVariableValue() { reads++; return value; } };
  action.value = "input";
  action.Link(controller);
  action.Update(0, 1);
  assert.equal(reads, 1);
  action._emitter = { SetRTPC: (_name, result) => writes.push(result) };
  for (value of [NaN, Infinity]) action.Update(0, 2);
  assert.ok(Number.isNaN(writes[0]));
  assert.equal(writes[1], Infinity);
  controller.GetVariableValue = () => { throw new Error("evaluation"); };
  assert.doesNotThrow(() => action.Update(0, 3));
  assert.equal(writes.length, 2);
  new DictReader({ declarations: true }).ReadInto(action, { value: "2" });
  action._emitter = {};
  assert.throws(() => action.Update(0, 4), TypeError);
  const failure = new Error("target");
  action._emitter = { SetRTPC() { throw failure; } };
  assert.throws(() => action.Update(0, 5), error => error === failure);
});

test("BindRTPC scalar curve evaluation uses the required GetValueAt contract", () =>
{
  const action = new Tr2ActionBindRTPC(), writes = [];
  action.value = "Curve(2)";
  action.curve = { GetValueAt: time => time * 3 };
  action.Link({ GetOwner: () => null });
  action._emitter = { SetRTPC: (_name, value) => writes.push(value) };
  action.Update(0, 1);
  assert.deepEqual(writes, [6]);
  action.curve = { GetValue: () => 99 };
  assert.throws(() => action.GetCurveValue(2), TypeError);
  assert.doesNotThrow(() => action.Update(0, 2));
  assert.deepEqual(writes, [6]);
});
