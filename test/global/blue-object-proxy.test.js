import test from "node:test";
import assert from "node:assert/strict";
// global/blue is raw source (no decorators), so its own tests import src.
import { be, BlueObjectProxy, CcpTime, IBlueObjectBuilder, IBlueObjectProxy, IUnloadable } from "../../src/global/blue/index.js";
import { CjsSchema, meta } from "../../src/global/schema/index.js";

// The LOD holder is decorated character source, so it comes from npm/dist,
// with that build's own Blue realm. Until npm/dist is rebuilt from a source
// tree containing BlueObjectProxy, those two tests report why they are skipped.
const dist = {
  blue: await import("../../npm/dist/global/blue/index.js"),
  character: await import("../../npm/dist/character/index.js")
};
const lodSkip = "BlueObjectProxy" in dist.blue ? false
  : "npm/dist predates BlueObjectProxy; rebuild npm/dist to run the LOD-holder tests";

// Builders and unloadable objects declare their Carbon interfaces, so the
// proxy's calls and casts are the ones the interfaces define.
class RecordingBuilder extends IBlueObjectBuilder
{
  created = 0;
  calls = [];
  CreateObject(objectMarker, callingProxy)
  {
    this.calls.push([ "CreateObject", objectMarker, callingProxy ]);
    this.created++;
    return { built: this.created, objectMarker };
  }
  OnObjectDestroyed(objectMarker, callingProxy) { this.calls.push([ "OnObjectDestroyed", objectMarker, callingProxy ]); }
  OnSelected(objectMarker, callingProxy) { this.calls.push([ "OnSelected", objectMarker, callingProxy ]); }
}

class UnloadableThing
{
  unloads = 0;
  reloads = 0;
  UnloadWhenUnreferenced() { this.unloads++; }
  ReloadWhenReferenced() { this.reloads++; }
}
meta.blue.inherit(IUnloadable)(UnloadableThing, { kind: "class" });

/** Drives `BeOS->GetInfo()->mRealTime` for the duration of one test. */
function realClock(t, start = 1000, os = be.os)
{
  const clock = { now: start };
  t.mock.method(os, "GetInfo", () => ({ realTime: clock.now }));
  return clock;
}

test("BlueObjectProxy is registered as Carbon's Blue class with its exposure", () =>
{
  assert.equal(be.classes.FindClsid("BlueObjectProxy"), "BlueObjectProxy");
  const proxy = be.classes.CreateInstance("BlueObjectProxy");
  assert.equal(CjsSchema.getClassName(proxy.constructor), "BlueObjectProxy");
  assert.equal(CjsSchema.cast(proxy, IBlueObjectProxy), proxy);
  assert.equal(CjsSchema.getSchema(BlueObjectProxy).carbon, "BlueObjectProxy");
  // BlueObjectProxy_Blue.cpp:17-59: object/builder/objectMarker/temporary read-write, isResident read-only.
  const info = CjsSchema.getSchema(BlueObjectProxy);
  const edit = name => [ ...info.members, ...info.properties ].find(field => field.name === name).edit;
  for (const name of [ "object", "builder", "objectMarker", "temporary" ]) assert.deepEqual([ edit(name).read, edit(name).write ], [ true, true ], name);
  assert.equal(edit("isResident").read, true);
  assert.notEqual(edit("isResident").write, true);
});

test("GetObject builds once from the builder and stamps real time (BlueObjectProxy.cpp:38-60)", t =>
{
  const clock = realClock(t);
  const proxy = new BlueObjectProxy(), builder = new RecordingBuilder();
  assert.equal(proxy.GetObject(), null, "no object and no builder");
  assert.equal(proxy.IsResident(), false);
  proxy.SetBuilder(builder, 7);
  const object = proxy.GetObject();
  assert.deepEqual(object, { built: 1, objectMarker: 7 });
  assert.equal(proxy.GetObject(), object, "a held object is not rebuilt");
  assert.equal(builder.created, 1);
  assert.equal(builder.calls[0][2], proxy, "the proxy passes itself as the calling proxy");
  assert.equal(proxy.object, object, "the Blue property reads through GetObject");
  assert.equal(proxy.isResident, true);
  assert.equal(proxy._lastTimeUsed, clock.now);
});

test("Update drops an unused object after the timeout and the builder makes a new one (cpp:68-104)", t =>
{
  const clock = realClock(t);
  const proxy = new BlueObjectProxy(), builder = new RecordingBuilder();
  proxy.SetBuilder(builder, 3);
  const first = proxy.GetObject();
  const timeout = CcpTime.timeFromDouble(10.0);

  clock.now += timeout;
  assert.equal(proxy.Update(0, timeout), false, "exactly the timeout is not past it");
  clock.now += 1;
  assert.equal(proxy.Update(0, 0), false, "a zero timeout never unloads");
  assert.equal(proxy.Update(999999999, timeout), true, "sim time is ignored; real time decides");
  assert.equal(proxy.IsResident(), false);
  assert.deepEqual(builder.calls.at(-1), [ "OnObjectDestroyed", 3, proxy ]);

  const second = proxy.GetObject();
  assert.notEqual(second, first);
  assert.equal(builder.created, 2);
});

test("Update unloads an IUnloadable object in place and GetObject reloads it", t =>
{
  const clock = realClock(t);
  const thing = new UnloadableThing();
  const proxy = new BlueObjectProxy(), builder = new RecordingBuilder();
  proxy.SetBuilder(builder, 0);
  proxy.SetObjectFromBuilder(thing);
  proxy.GetObject();

  clock.now += 11;
  assert.equal(proxy.Update(0, 10), true);
  assert.equal(thing.unloads, 1);
  assert.equal(proxy.IsResident(), true, "an unloaded IUnloadable object is still held");
  assert.equal(proxy.Update(0, 10), false, "an unloaded proxy is not unloaded twice");

  assert.equal(proxy.GetObject(), thing, "same identity after reload");
  assert.equal(thing.reloads, 1);
  assert.equal(builder.created, 0, "the builder is not asked for an unloadable object");
});

test("Freeze builds the object and lets go of the builder, so it is never unloaded (cpp:141-150)", t =>
{
  const clock = realClock(t);
  const proxy = new BlueObjectProxy(), builder = new RecordingBuilder();
  proxy.SetBuilder(builder, 1);
  proxy.Freeze();
  assert.equal(builder.created, 1);
  assert.equal(proxy.builder, null);
  const object = proxy.GetObject();
  clock.now += CcpTime.timeFromDouble(60.0);
  assert.equal(proxy.Update(0, 1), false, "no builder, no unload");
  assert.equal(proxy.GetObject(), object);
});

test("SetObject, ClearObject, SetObjectFromBuilder, OnSelected and temporary follow the donor", t =>
{
  realClock(t);
  const proxy = new BlueObjectProxy(), builder = new RecordingBuilder();
  proxy.SetBuilder(builder, 4);
  proxy.GetObject();

  proxy.OnSelected();
  assert.deepEqual(builder.calls.at(-1), [ "OnSelected", 4, proxy ]);

  const replacement = { replacement: true };
  proxy.SetObjectFromBuilder(replacement);
  assert.equal(proxy.builder, builder, "SetObjectFromBuilder keeps the builder");
  assert.equal(builder.calls.at(-1)[0], "OnSelected", "and does not notify it");

  proxy.ClearObject();
  assert.deepEqual(builder.calls.at(-1), [ "OnObjectDestroyed", 4, proxy ]);
  assert.equal(proxy.IsResident(), false);

  const held = { held: true };
  proxy.SetObject(held);
  assert.equal(proxy.builder, null, "SetObject lets go of the builder");
  assert.equal(proxy.GetObject(), held);

  assert.equal(proxy.IsTemporary(), false);
  proxy.temporary = true;
  assert.equal(proxy.IsTemporary(), true);
});

test("Tr2SkinnedObjectLod creates real proxies for its models (Tr2SkinnedObjectLOD.cpp:151-200)", { skip: lodSkip }, t =>
{
  const { Tr2SkinnedModel, Tr2SkinnedObjectLod } = dist.character;
  realClock(t, 1000, dist.blue.be.os);
  const lod = new Tr2SkinnedObjectLod();
  const high = new Tr2SkinnedModel(), medium = new Tr2SkinnedModel(), low = new Tr2SkinnedModel();
  lod.SetHighDetailModel(high);
  lod.SetMediumDetailModel(medium);
  lod.SetLowDetailModel(low);
  for (const proxy of [ lod.highDetailProxy, lod.mediumDetailProxy, lod.lowDetailProxy ]) assert.equal(CjsSchema.getClassName(proxy.constructor), "BlueObjectProxy");
  assert.equal(lod.highDetailProxy.GetObject(), high);

  const proxy = lod.highDetailProxy;
  lod.SetHighDetailModel(null);
  assert.equal(lod.highDetailProxy, proxy, "an existing proxy is reused");
  assert.equal(proxy.GetObject(), high, "a null model leaves the held object alone");

  lod.PopulateLods();
  assert.equal(lod.SetLOD(null, 1000), high);
  assert.equal(lod.GetCurrentLod(), 0);
  assert.equal(lod.SetLOD(null, 100), low);
  assert.equal(lod.GetCurrentLod(), 2);
});

test("Tr2SkinnedObjectLod unloads unselected proxies after ten real seconds and rebuilds them", { skip: lodSkip }, t =>
{
  const { Tr2SkinnedObjectLod } = dist.character;
  const clock = realClock(t, 1000, dist.blue.be.os);
  const lod = new Tr2SkinnedObjectLod();
  const builder = new RecordingBuilder();
  for (const name of [ "highDetailProxy", "mediumDetailProxy", "lowDetailProxy" ])
  {
    lod[name] = new dist.blue.BlueObjectProxy();
    lod[name].SetBuilder(builder, name.length);
  }
  lod.PopulateLods();
  lod.SetLOD(null, 1000);
  assert.equal(lod.GetCurrentLod(), 0);
  assert.equal(lod.highDetailProxy.IsResident(), true);
  lod.mediumDetailProxy.GetObject();

  const frame = CcpTime.timeFromDouble(1 / 60);
  clock.now += CcpTime.timeFromDouble(11.0);
  lod.UnloadLodIfNeeded(0, CcpTime.timeFromDouble(0.5));
  assert.equal(lod.mediumDetailProxy.IsResident(), true, "a stalled frame unloads nothing");

  lod.UnloadLodIfNeeded(0, frame);
  assert.equal(lod.mediumDetailProxy.IsResident(), false, "unused medium unloaded");
  assert.equal(lod.highDetailProxy.IsResident(), true, "the selected proxy is never unloaded");

  const created = builder.created;
  assert.ok(lod.SetLOD(null, 300), "medium is rebuilt on demand");
  assert.equal(lod.GetCurrentLod(), 1);
  assert.equal(builder.created, created + 1);
});

test("CcpTime.timeFromDouble scales whole and fractional seconds separately (CcpTime.cpp:255-264)", () =>
{
  assert.equal(CcpTime.timeFromDouble(10.0), 100000000);
  assert.equal(CcpTime.timeFromDouble(1.25), 12500000);
  assert.equal(CcpTime.timeFromDouble(-1.5), -15000000);
  assert.equal(CcpTime.timeFromDouble(0.00000001), 0, "sub-tick fractions truncate");
});

test("CjsBlackReader is an IBlueObjectBuilder, as Carbon's BlackReader is (BlackReader.h:16-19)", async () =>
{
  const { CjsBlackReader } = await import("../../src/resource/formats/black/core/CjsBlackReader.js");
  const reader = Object.create(CjsBlackReader.prototype);
  assert.equal(CjsSchema.cast(reader, IBlueObjectBuilder), reader);
  // The interface's empty bodies (IBlueObjectBuilder.h:19-22); the proxy calls them directly.
  assert.equal(reader.OnObjectDestroyed(0, null), undefined);
  assert.equal(reader.OnSelected(0, null), undefined);
  // Not implemented by this reader: explicit obligations, never silent.
  assert.throws(() => reader.GetErrorMessage(), /must be implemented/);
  assert.throws(() => reader.CreateObjectWithYield(0, null), /must be implemented/);
});
