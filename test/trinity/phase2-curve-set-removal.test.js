import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { CjsSchema, meta } from "../../npm/dist/global/schema/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { Copier } from "../../npm/dist/global/blue/Copier.js";
import { DictReader } from "../../npm/dist/global/blue/DictReader.js";
import { IInitialize } from "../../npm/dist/global/blue/IInitialize.js";
import { INotify } from "../../npm/dist/global/blue/INotify.js";
import { ISimTimeRebaseNotify } from "../../npm/dist/global/blue/ISimTimeRebaseNotify.js";
import { ITriFunction } from "../../npm/dist/global/blue/ITriFunction.js";
import { ITriCurveLength } from "../../npm/dist/global/blue/ITriCurveLength.js";
import { blue } from "../../npm/dist/global/blue/blue.js";
import { Traverse } from "../../npm/dist/global/blue/find.js";
import { GetResources } from "../../npm/dist/global/blue/getResources.js";
import { ITr2Updateable } from "../../npm/dist/trinity/core/ITr2Updateable.js";
import { TriDevice } from "../../npm/dist/trinity/core/device/TriDevice.js";
import { TriValueBinding } from "../../npm/dist/trinity/core/binding/TriValueBinding.js";
import { ITriDuration } from "../../npm/dist/trinity/curves/ITriDuration.js";
import { ITr2ValueBinding } from "../../npm/dist/trinity/curves/ITr2ValueBinding.js";
import { TriCurveSet } from "../../npm/dist/trinity/curves/TriCurveSet.js";
import { Tr2CurveSetRange } from "../../npm/dist/trinity/curves/Tr2CurveSetRange.js";
import { EveShip2 } from "../../npm/dist/trinity/eve/spaceObject/EveShip2.js";
import { EveMeshOverlayEffect } from "../../npm/dist/trinity/eve/overlays/EveMeshOverlayEffect.js";
import { CjsBlackFormat } from "../../npm/dist/resource/formats/black/index.js";
import { StubResMan } from "../support/stubResMan.js";

class SampleFunction extends ITriFunction
{
  name = "sample";
  samples = [];
  resets = 0;
  Reset() { this.resets++; }
  UpdateValue(time, context) { this.samples.push([time, context]); }
}
CjsSchema.define(SampleFunction, { className: "Phase2CurveSetSampleFunction", fields: {
  name: { type: "string", edit: { read: true, write: true, persist: true } }
} });
meta.carbon.interfaceTable({ interfaces: [SampleFunction, ITriFunction], chainTo: null })(SampleFunction, { kind: "class" });

class SampleBinding extends ITr2ValueBinding
{
  copies = 0;
  CopyValue() { this.copies++; }
}
CjsSchema.define(SampleBinding, { className: "Phase2CurveSetSampleBinding" });
meta.carbon.interfaceTable({ interfaces: [SampleBinding, ITr2ValueBinding], chainTo: null })(SampleBinding, { kind: "class" });

test("curve-set and range have native bases and exact exposure without model conveniences", () =>
{
  const set = new TriCurveSet(), range = new Tr2CurveSetRange();
  assert.equal(Object.getPrototypeOf(TriCurveSet.prototype), IInitialize.prototype);
  assert.equal(Object.getPrototypeOf(Tr2CurveSetRange.prototype), Object.prototype);
  assert.deepEqual([...mappedInterfaces(TriCurveSet)], [TriCurveSet, IInitialize, ITr2Updateable]);
  assert.deepEqual([...mappedInterfaces(Tr2CurveSetRange)], [Tr2CurveSetRange]);
  assert.equal(CjsSchema.cast(set, ISimTimeRebaseNotify), set);
  assert.equal(mappedInterfaces(TriCurveSet).has(ISimTimeRebaseNotify), false);
  for (const value of [set, range])
    for (const name of ["SetValues", "GetValues", "Traverse", "GetResources", "OnEvent"])
      assert.equal(value[name], undefined, name);
  assert.equal(TriCurveSet.from, undefined);
  assert.equal(Tr2CurveSetRange.from, undefined);
  assert.equal(CjsSchema.GetConstructor("TriCurveSet"), TriCurveSet);
  assert.equal(CjsSchema.GetConstructor("Tr2CurveSetRange"), Tr2CurveSetRange);
});

test("stored declaration order and constructor-owned native lists retain exact element facts", () =>
{
  const set = new TriCurveSet();
  assert.deepEqual(CjsSchema.getSchema(TriCurveSet).members.map(field => field.name),
    ["name", "curves", "bindings", "driver", "ranges", "scale", "playOnLoad", "isPlaying", "scaledTime", "useSimTimeRebase", "useRealTime"]);
  for (const [name, type, clsid] of [["curves", ITriFunction, null], ["bindings", ITr2ValueBinding, null], ["ranges", Tr2CurveSetRange, "Tr2CurveSetRange"]])
  {
    const info = {};
    set[name].GetInfo(info);
    assert.equal(info.iid, type);
    assert.equal(info.clsid, clsid);
    assert.equal(info.listOps, 0);
    assert.equal(info.notify, null, "TriCurveSet owns no IListNotify callback");
    assert.equal(set[name].Append({}), false);
    assert.equal(set[name].Append(null), false);
    assert.equal(set[name].length, 0);
    const field = CjsSchema.getField(TriCurveSet, name);
    assert.equal(field.edit.read, true);
    assert.equal(field.edit.persist, true);
    assert.notEqual(field.edit.write, true);
  }
  assert.notEqual(set.curves, new TriCurveSet().curves);
  assert.equal(set.ranges.Append(new Tr2CurveSetRange()), true);
});

test("SetName assigns directly with the native void return", () =>
{
  const set = new TriCurveSet();
  set.SetValues = () => assert.fail("native setter must not use values machinery");
  assert.equal(set.SetName("movement"), undefined);
  assert.equal(set.GetName(), "movement");
  assert.equal(set.SetName("movement"), undefined);
});

test("native list Add methods admit mapped items and reject structural lookalikes", () =>
{
  const set = new TriCurveSet(), curve = new SampleFunction(), binding = new SampleBinding();
  assert.equal(set.AddCurve(curve), undefined);
  assert.equal(set.AddBinding(binding), undefined);
  set.AddCurve({ UpdateValue() {}, Reset() {} });
  set.AddBinding({ CopyValue() {} });
  assert.equal(set.GetCurvesCount(), 1);
  assert.equal(set.GetBindingsCount(), 1);
  assert.equal(set.GetCurve(0), curve);
  assert.equal(set.GetBinding(0), binding);
});

test("play requires Reset and applies every curve before bindings with the exact context", () =>
{
  const set = new TriCurveSet(), curve = new SampleFunction(), binding = new SampleBinding(), calls = [], context = {};
  curve.Reset = () => calls.push("reset");
  curve.UpdateValue = (time, received) => { assert.equal(time, 3); assert.equal(received, context); calls.push("curve"); };
  binding.CopyValue = () => calls.push("binding");
  set.AddCurve(curve);
  set.AddBinding(binding);
  set.PlayFrom(3);
  set.Update(40, undefined, context);
  assert.deepEqual(calls, ["reset", "curve", "binding"]);
  curve.Reset = undefined;
  assert.throws(() => set.Play(), { name: "TypeError", message: /Reset/ });
});

test("duration lookup uses mapped native interfaces and ignores a coincidental Length method", () =>
{
  class Duration extends SampleFunction { Length() { return 7; } }
  class CurveLength extends SampleFunction { Length() { return 5; } }
  class Unmapped extends SampleFunction { Length() { assert.fail("not exposed"); } }
  meta.carbon.inherit(ITriDuration)(Duration, { kind: "class" });
  meta.carbon.inherit(ITriCurveLength)(CurveLength, { kind: "class" });
  meta.carbon.inherit(ITriDuration)(Unmapped, { kind: "class" });
  meta.carbon.interfaceTable({ interfaces: [Duration, ITriFunction, ITriDuration], chainTo: null })(Duration, { kind: "class" });
  meta.carbon.interfaceTable({ interfaces: [CurveLength, ITriFunction, ITriCurveLength], chainTo: null })(CurveLength, { kind: "class" });
  meta.carbon.interfaceTable({ interfaces: [Unmapped, ITriFunction], chainTo: null })(Unmapped, { kind: "class" });
  const set = new TriCurveSet();
  set.AddCurve(new Unmapped());
  assert.equal(set.GetMaxCurveDuration(), 0);
  set.AddCurve(new CurveLength());
  assert.equal(set.GetMaxCurveDuration(), 5);
  const duration = new Duration();
  set.AddCurve(duration);
  assert.equal(set.GetMaxCurveDuration(), 7);
  duration.Length = undefined;
  assert.throws(() => set.GetMaxCurveDuration(), TypeError);
});

test("actual TriDevice owner supplies tick clocks while scalar Update remains seconds", () =>
{
  const device = new TriDevice(), set = new TriCurveSet(), curve = new SampleFunction();
  set.AddCurve(curve);
  set.Play();
  device.curveSets.push(set);
  device.Update(100000000, 200000000);
  device.Update(110000000, 220000000);
  assert.deepEqual(curve.samples.map(sample => sample[0]), [0, 2]);
  assert.equal(device.curveSets[0], set);
  set.useRealTime = true;
  set.Play();
  device.Update(500000000, 100000000);
  device.Update(510000000, 130000000);
  assert.equal(set.scaledTime, 1);
  set.Play();
  set.Update(100);
  set.Update(103);
  assert.equal(set.scaledTime, 3);
});

test("rebase converts the tick difference once and preserves pending relative stop", () =>
{
  const set = new TriCurveSet();
  set._startTime = 4;
  set._endTime = 8;
  set.OnSimClockRebase(100000000, 130000000);
  assert.equal(set._startTime, 7);
  assert.equal(set._endTime, 11);
  set._endTime = -2;
  set.OnSimClockRebase(130000000, 120000000);
  assert.equal(set._startTime, 6);
  assert.equal(set._endTime, -2);
});

test("initialization acquires once and explicit disposal releases the acquired OS after replacement", t =>
{
  const previous = blue.os, calls = [], owner = {
    RegisterForSimTimeRebase(value) { calls.push(["register", value]); },
    UnregisterForSimTimeRebase(value) { calls.push(["unregister", value]); }
  };
  blue.os = owner;
  t.after(() => { blue.os = previous; });
  const set = new TriCurveSet();
  set.playOnLoad = false;
  set.useSimTimeRebase = true;
  assert.equal(set.Initialize(), true);
  set.Initialize();
  set.useSimTimeRebase = false;
  set.Initialize();
  assert.equal(set.IsUsingSimTimeRebase(), true, "native false reinitialization does not clear an acquired subscription");
  set.Stop();
  assert.deepEqual(calls, [["register", set]]);
  blue.os = { UnregisterForSimTimeRebase() { assert.fail("wrong OS owner"); } };
  set.Dispose();
  set.Dispose();
  assert.deepEqual(calls, [["register", set], ["unregister", set]]);
  assert.equal(set.IsUsingSimTimeRebase(), false);
  assert.equal(set._rebaseOS, null);
});

test("declared construction initializes only after list population and preserves typed containers", () =>
{
  const set = new DictReader({ declarations: true }).CreateObject({
    _type: "TriCurveSet", name: "read", curves: [{ _type: "Phase2CurveSetSampleFunction", name: "child" }],
    bindings: [{ _type: "Phase2CurveSetSampleBinding" }],
    ranges: [{ _type: "Tr2CurveSetRange", name: "part", startTime: 2, endTime: 4, looped: true }]
  });
  assert.equal(set.GetCurve(0).resets, 1, "mapped IInitialize follows child population");
  assert.equal(set.isPlaying, true);
  assert.equal(set.ranges.GetAt(0).name, "part");
  assert.equal(set.GetRangeDuration("part"), 2);
  set.PlayTimeRange("part");
  assert.deepEqual(set.GetTimeRange(), [2, 4]);
  assert.equal(set.HasTimeRange(), true);
});

test("Copier clones shared plain ranges and typed lists with class-owned runtime state", () =>
{
  const set = new TriCurveSet(), range = new Tr2CurveSetRange();
  set.playOnLoad = false;
  set.name = "copy";
  range.name = "shared";
  set.ranges.Append(range);
  set.ranges.Append(range);
  set.curves.Append(new SampleFunction());
  const copy = new Copier().CopyTo(set);
  assert.notEqual(copy, set);
  assert.notEqual(copy.ranges, set.ranges);
  assert.notEqual(copy.ranges[0], range);
  assert.equal(copy.ranges[0], copy.ranges[1]);
  assert.equal(copy.ranges.GetSize(), 2);
  assert.equal(copy.name, "copy");
  assert.equal(copy.isPlaying, false);
  assert.equal(copy._rebaseOS, null);
});

test("real TriValueBinding exposes native admission and copies through a model-free set", () =>
{
  assert.deepEqual([...mappedInterfaces(TriValueBinding)], [TriValueBinding, ITr2ValueBinding, INotify]);
  assert.equal(mappedInterfaces(TriValueBinding).has(IInitialize), false);
  const set = new TriCurveSet(), binding = new TriValueBinding();
  const source = new Tr2CurveSetRange(), destination = new Tr2CurveSetRange();
  source.startTime = 4;
  binding.SetSource("startTime", source);
  binding.SetDestination("startTime", destination);
  binding.Initialize();
  set.AddBinding(binding);
  assert.equal(set.bindings.GetAt(0), binding);
  set.ApplyTime(3);
  assert.equal(destination.startTime, 4);
  let notified = 0;
  const original = binding.OnModified;
  binding.OnModified = function(name) { notified++; return original.call(this, name); };
  const changed = new TriValueBinding();
  changed.SetSource("startTime", new Tr2CurveSetRange());
  changed.SetDestination("startTime", new Tr2CurveSetRange());
  assert.equal(new Copier().CopyTo(changed, binding), binding);
  assert.ok(notified > 0, "actual Copier uses newly exposed INotify");
});

test("binding persisted endpoint storage is separate from live setters during copying", () =>
{
  const info = CjsSchema.getSchema(TriValueBinding);
  for (const name of ["sourceObject", "destinationObject"])
  {
    const stored = info.members.find(field => field.name === name);
    const property = info.properties.find(field => field.name === name);
    assert.equal(stored.key, "_" + name);
    assert.equal(stored.type.kind, "objectRef");
    assert.equal(stored.edit.persist, true);
    assert.equal(stored.edit.hidden, true);
    assert.equal(property.key, name);
    assert.equal(property.edit.read, true);
    assert.equal(property.edit.write, true);
    assert.notEqual(property.edit.persist, true);
  }
  const source = new TriValueBinding(), destination = new TriValueBinding(), endpoint = new Tr2CurveSetRange();
  source._sourceObject = endpoint;
  source._destinationObject = endpoint;
  endpoint.name = "shared endpoint";
  for (const value of [source, destination])
    for (const name of ["sourceObject", "destinationObject"])
      Object.defineProperty(value, name, {
        get() { assert.fail("persisted copy must not invoke a live getter"); },
        set() { assert.fail("persisted copy must not invoke a live setter"); }
      });
  assert.equal(new Copier().CopyTo(source, destination), destination);
  assert.notEqual(destination._sourceObject, endpoint);
  assert.equal(destination._sourceObject, destination._destinationObject);
  assert.equal(destination._sourceObject.name, "shared endpoint");
});

test("shared traversal reaches functions bindings and ranges without instance helpers", () =>
{
  const set = new TriCurveSet(), curve = new SampleFunction(), binding = new SampleBinding(), range = new Tr2CurveSetRange();
  set.curves.Append(curve);
  set.bindings.Append(binding);
  set.ranges.Append(range);
  const visited = [];
  Traverse(set, value => visited.push(value));
  for (const value of [set, curve, binding, range]) assert.equal(visited.includes(value), true);
  assert.deepEqual(GetResources(set), []);
});

const corpus = process.env.CURVE_SET_BLACK_CORPUS_DIR;
for (const route of ["declared dictionary", "canonical Black runtime", "default Black runtime"])
{
  test(`real skin-change ${route} retains native lists and drives ship binding targets`, {
    skip: !corpus && "set CURVE_SET_BLACK_CORPUS_DIR for the unmodified skin_change.black proof"
  }, t =>
  {
    const bytes = readFileSync(join(corpus, "skin_change.black"));
    assert.equal(bytes.length, 1514);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), "4f5ec0fe1b7a9669f979e131bfb53bdf171d111ef46560bfdce74fb4d858c656");
    const previous = blue.resMan;
    blue.resMan = new StubResMan();
    t.after(() => { blue.resMan = previous; });
    assert.equal(CjsSchema.GetConstructor("EveMeshOverlayEffect"), EveMeshOverlayEffect);
    const overlay = route === "declared dictionary"
      ? new DictReader({ declarations: true }).CreateObject(CjsBlackFormat.readPayload(bytes).object)
      : CjsBlackFormat.read(bytes, { emit: "runtime", ...(route === "canonical Black runtime" ? { schema: null } : {}) }).root;
    const set = overlay.curveSet;
    assert.equal(set.curves.GetSize(), 2);
    assert.equal(set.bindings.GetSize(), 4);
    assert.equal(set.ranges.GetSize(), 0);
    assert.equal(set.isPlaying, true);
    const oldShip = new EveShip2(), newShip = new EveShip2();
    const curves = new Map(set.curves.map(curve => [curve.name, curve]));
    for (const binding of set.bindings)
    {
      binding.destinationObject = binding.name.startsWith("old_") ? oldShip : newShip;
      binding.Initialize();
      assert.equal(binding.sourceObject, curves.get(binding.name.endsWith("activation") ? "ActivationAmount" : "CloakAmount"));
    }
    set.Play();
    const device = new TriDevice();
    device.curveSets.push(set);
    device.Update(100000000, 100000000);
    assert.equal(oldShip.activationStrength, 1);
    assert.equal(newShip.activationStrength, 0);
    device.Update(110000000, 110000000);
    assert.equal(set.scaledTime, 1);
    assert.ok(oldShip.activationStrength > 0 && oldShip.activationStrength < 1);
    assert.ok(Math.abs(oldShip.activationStrength + newShip.activationStrength - 1) < 1e-6);
    const added = new Tr2CurveSetRange();
    added.name = "post-load";
    assert.equal(set.ranges.Append(added), true);
    assert.equal(set.GetRangeDuration("post-load"), 1);
  });
}
