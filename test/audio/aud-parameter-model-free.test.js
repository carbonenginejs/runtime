import test from "node:test";
import assert from "node:assert/strict";
import { AudParameter } from "../../npm/dist/audio/trinity/audio/AudParameter.js";
import { AudGameObjResource } from "../../npm/dist/audio/trinity/audio/AudGameObjResource.js";
import { AudManager } from "../../npm/dist/audio/trinity/audio/AudManager.js";
import { CjsWwiseSoundEngineStub } from "../../npm/dist/audio/CjsWwiseSoundEngineStub.js";
import { INotify } from "../../npm/dist/global/blue/INotify.js";
import { IInitialize } from "../../npm/dist/global/blue/IInitialize.js";
import { BlueList } from "../../npm/dist/global/blue/BlueList.js";
import { DictReader } from "../../npm/dist/global/blue/DictReader.js";
import { DictWriter } from "../../npm/dist/global/blue/DictWriter.js";
import { Copier } from "../../npm/dist/global/blue/Copier.js";
import { CjsSchema, meta } from "../../npm/dist/global/schema/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";

function WithServices(run)
{
  const previousManager = AudGameObjResource.manager;
  const previousBackend = AudGameObjResource.backend;
  const manager = new AudManager();
  const backend = new CjsWwiseSoundEngineStub();
  manager._state = "enabled";
  AudGameObjResource.manager = manager;
  AudGameObjResource.backend = backend;
  try { return run(manager, backend); }
  finally
  {
    AudGameObjResource.manager = previousManager;
    AudGameObjResource.backend = previousBackend;
  }
}

test("AudParameter has exactly its native INotify base and exposure without model machinery", () =>
{
  const parameter = new AudParameter();
  assert.strictEqual(Object.getPrototypeOf(AudParameter.prototype), INotify.prototype);
  assert.deepEqual([...mappedInterfaces(AudParameter)], [INotify, AudParameter]);
  assert.strictEqual(CjsSchema.cast(parameter, INotify), parameter);
  assert.strictEqual(CjsSchema.cast(parameter, AudParameter), parameter);
  assert.equal(CjsSchema.cast(parameter, IInitialize), null);
  assert.strictEqual(CjsSchema.GetConstructor("AudParameter"), AudParameter);
  assert.equal(AudParameter.from, undefined);
  for (const name of ["__state", "SetValues", "GetValues", "UpdateValues", "Traverse", "Initialize", "Dispose"])
  {
    assert.equal(name in parameter, false, name);
  }
  assert.equal(parameter.name, "");
  assert.equal(parameter.value, 0);
  assert.equal(parameter._gameObjID, 0);
});

test("native parameter fields retain wide strings, float32, notification and nonpersistence", () =>
{
  new AudParameter();
  const schema = CjsSchema.getSchema(AudParameter);
  assert.deepEqual(schema.members.map(field => field.name), ["name", "value"]);
  assert.deepEqual(schema.properties, []);
  const [name, value] = schema.members;
  assert.equal(name.type.kind, "wstring");
  assert.equal(value.type.kind, "float32");
  for (const field of schema.members)
  {
    assert.equal(field.edit.read, true);
    assert.equal(field.edit.write, true);
    assert.notEqual(field.edit.persist, true);
    assert.notEqual(field.edit.rpersist, true);
  }
  assert.notEqual(name.edit.notify, true);
  assert.equal(value.edit.notify, true);
});

test("real BlueList admits the parameter through its native exposure and rejects lookalikes", () =>
{
  const parameter = new AudParameter();
  const list = new BlueList(AudParameter);
  assert.equal(list.Append(parameter), true);
  assert.strictEqual(list[0], parameter);
  assert.equal(list.Append({name: "lookalike", value: 1, OnModified() { return true; }}), false);
  assert.equal(list.Append(new INotify()), false);
  class UnexposedParameter extends AudParameter {}
  meta.blue.interfaceTable({interfaces: [UnexposedParameter], chainTo: null})(UnexposedParameter, {kind: "class"});
  assert.equal(list.Append(new UnexposedParameter()), false, "JS inheritance does not create native admission");
  assert.equal(list.length, 1);
});

test("binding is silent and enabled value notifications retain safe Number IDs above 32 bits", () =>
{
  WithServices((manager, backend) =>
  {
    const log = [];
    manager.LogSetRTPC = (...args) => log.push(args);
    const parameter = new AudParameter();
    parameter.name = "速度";
    parameter.value = 3.5;
    for (const id of [2 ** 32 + 71, Number.MAX_SAFE_INTEGER])
    {
      backend.RegisterGameObj(id);
      parameter.SetGameObjectID(id);
      assert.equal(backend.GetGameObject(id).rtpcs.size, 0);
      assert.equal(parameter.OnModified("value"), true);
      assert.equal(backend.GetGameObject(id).rtpcs.get("速度"), 3.5);
      assert.deepEqual(log.at(-1), [id, "速度", 3.5]);
    }
    assert.equal(log.length, 2);
  });
});

test("native null-manager, disabled, unbound and other-member gates do not push", () =>
{
  WithServices(manager =>
  {
    const parameter = new AudParameter();
    parameter.SetGameObjectID(71);
    manager.LogSetRTPC = () => assert.fail("inactive parameter logged");
    AudGameObjResource.backend = null;
    for (const name of ["name", null, "unknown"])
    {
      assert.equal(parameter.OnModified(name), true);
    }
    manager._state = "disabled";
    assert.equal(parameter.OnModified("value"), true);
    manager._state = "uninitialized";
    assert.equal(parameter.OnModified("value"), true);
    manager._state = "enabled";
    parameter.SetGameObjectID(0);
    assert.equal(parameter.OnModified("value"), true);
    parameter.SetGameObjectID(71);
    AudGameObjResource.manager = null;
    assert.equal(parameter.OnModified("value"), true);
  });
});

test("value notification calls the backend before logging and ignores its status", () =>
{
  WithServices((manager, backend) =>
  {
    const parameter = new AudParameter();
    parameter.name = "speed";
    parameter.value = 4;
    parameter.SetGameObjectID(71);
    const calls = [];
    backend.SetRTPCValue = (...args) => { calls.push(["backend", ...args]); return false; };
    manager.LogSetRTPC = (...args) => calls.push(["log", ...args]);
    assert.equal(parameter.OnModified("value"), true);
    assert.deepEqual(calls, [["backend", "speed", 4, 71], ["log", 71, "speed", 4]]);
    calls.length = 0;
    const failure = new Error("backend failure");
    backend.SetRTPCValue = () => { throw failure; };
    assert.throws(() => parameter.OnModified("value"), error => error === failure);
    assert.deepEqual(calls, [], "backend failure prevents the subsequent log call");
  });
});

test("enabled bound parameters require their owned backend and logging methods", () =>
{
  WithServices((manager, backend) =>
  {
    const parameter = new AudParameter();
    parameter.SetGameObjectID(71);
    AudGameObjResource.backend = null;
    assert.throws(() => parameter.OnModified("value"), TypeError);
    AudGameObjResource.backend = backend;
    backend.SetRTPCValue = undefined;
    assert.throws(() => parameter.OnModified("value"), TypeError);
    backend.SetRTPCValue = () => false;
    manager.LogSetRTPC = undefined;
    assert.throws(() => parameter.OnModified("value"), TypeError);
  });
});

test("explicit dictionary reads notify only value, including an equal-value write", () =>
{
  WithServices((manager, backend) =>
  {
    const parameter = new AudParameter();
    parameter.SetGameObjectID(71);
    backend.RegisterGameObj(71);
    const log = [];
    manager.LogSetRTPC = (...args) => log.push(args);
    const reader = new DictReader();
    reader.ReadInto(parameter, {name: "速度", value: 2}, parameter);
    assert.deepEqual(log, [[71, "速度", 2]]);
    reader.ReadInto(parameter, {name: "renamed"}, parameter);
    assert.equal(log.length, 1);
    const changed = reader.ReadInto(parameter, {value: 2}, parameter);
    assert.equal(changed.size, 0);
    assert.deepEqual(log[1], [71, "renamed", 2]);
    reader.ReadInto(parameter, {value: 3}, null);
    assert.equal(parameter.value, 3);
    assert.equal(log.length, 2, "ReadInto caller explicitly owns notification selection");
    assert.equal(backend.GetGameObject(71).rtpcs.get("renamed"), 2);
  });
});

test("current dictionary construction creates unbound parameters without a model factory", () =>
{
  WithServices((manager, backend) =>
  {
    manager.LogSetRTPC = () => assert.fail("fresh unbound parameter logged");
    backend.SetRTPCValue = () => assert.fail("fresh unbound parameter pushed");
    const parameter = new DictReader().CreateObject({_type: "AudParameter", name: "主推力", value: 0.1});
    assert.strictEqual(parameter.constructor, AudParameter);
    assert.equal(parameter.name, "主推力");
    // The current dictionary normalizer retains a JS Number; native float32
    // declaration metadata is checked separately from storage precision.
    assert.equal(parameter.value, 0.1);
    assert.equal(parameter._gameObjID, 0);
    const values = new DictWriter().WriteObject(parameter);
    assert.equal(values.name, "主推力");
    assert.equal(values.value, 0.1);
    const persistent = new DictWriter().WriteObject(parameter, {}, {persistOnly: true});
    assert.equal(Object.hasOwn(persistent, "name"), false);
    assert.equal(Object.hasOwn(persistent, "value"), false);
    assert.equal(Object.hasOwn(values, "_gameObjID"), false);
  });
});

test("Copier respects nonpersisting parameter data and never copies an owner binding", () =>
{
  WithServices((manager, backend) =>
  {
    manager.LogSetRTPC = () => assert.fail("nonpersistent copy logged");
    backend.SetRTPCValue = () => assert.fail("nonpersistent copy pushed");
    const source = new AudParameter();
    source.name = "source";
    source.value = 9;
    source.SetGameObjectID(71);
    const copy = new Copier().CopyTo(source, null);
    assert.strictEqual(copy.constructor, AudParameter);
    assert.equal(copy.name, "");
    assert.equal(copy.value, 0);
    assert.equal(copy._gameObjID, 0);
    const destination = new AudParameter();
    destination.name = "destination";
    destination.value = 4;
    destination.SetGameObjectID(72);
    assert.strictEqual(new Copier().CopyTo(source, destination), destination);
    assert.equal(destination.name, "destination");
    assert.equal(destination.value, 4);
    assert.equal(destination._gameObjID, 72);
  });
});
