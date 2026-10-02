import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CjsSchema } from "../../../npm/dist/global/schema/index.js";
import { mappedInterfaces } from "../../../npm/dist/global/compose/interface.js";
import { BlueList, IInitialize, INotify, IListNotify, ITriFunction, ITriCurveLength } from "../../../npm/dist/global/blue/index.js";
import { ITr2DebugRenderable } from "../../../npm/dist/global/interfaces/index.js";
import { AudEventCurve, AudEmitter, AudGameObjResource, AudParameter, Tr2AudioStretchBase, Tr2AudioStretchAuto, ITr2Audio } from "../../../npm/dist/audio/index.js";
import "../../../npm/dist/trinity/index.js";

const fixture = name => JSON.parse(readFileSync(new URL("../../support/" + name + ".json", import.meta.url), "utf8")).object;

test("real pillar audio curve initializes after its typed observer and emitter", () =>
{
  const values = fixture("audioCurveAsset");
  const curve = CjsSchema.from(values._type, values);
  assert.ok(curve instanceof AudEventCurve);
  assert.ok(curve.audioEmitter instanceof AudEmitter);
  assert.equal(curve.audioEmitter, curve.sourceTriObserver.observer);
  assert.equal(curve.Length(), 1);
  assert.equal(curve.GetKeyValue(0), "worldobject_pillars_active_play");
  assert.equal("SetValues" in curve, false);
  const control = CjsSchema.from(values._type, values, { initialize: false });
  assert.equal(control.Length(), 0, "negative control: uninitialized authored keys have no cached duration");
  assert.equal(control.audioEmitter, null);
  const emitter = curve.audioEmitter;
  const list = emitter.parameters;
  assert.ok(list instanceof BlueList);
  CjsSchema.setValues(emitter, { parameters: [] });
  assert.equal(emitter.parameters, list);
  const parameter = new AudParameter();
  list.Insert(-1, parameter);
  assert.equal(parameter._gameObjID, emitter.ID);
  const unbound = new AudParameter();
  list.push(unbound);
  assert.equal(unbound._gameObjID, 0, "negative control: raw array writes do not bind parameters");
});

test("real chain stretch retains authored emitter routing and native initialization exposure", () =>
{
  const values = fixture("audioStretchAsset");
  const stretch = CjsSchema.from(values._type, values);
  const calls = [];
  for (const field of ["sourceEmitter", "destinationEmitter", "stretchEmitter"])
  {
    assert.ok(stretch[field] instanceof AudEmitter);
    const emitter = stretch[field];
    emitter.SendEvent = event => calls.push([emitter.name, event]);
  }
  stretch.TriggerOutburstEvent();
  stretch.TriggerImpactEvent();
  stretch.TriggerStretchEvent();
  assert.deepEqual(calls, [
    ["stretch_source_sfx", "chain_lightning_outburst_play"],
    ["stretch_dest_sfx", "chain_lightning_impact_play"],
    ["stretch_mid_sfx", "chain_lightning_stretch_play"]
  ]);
  assert.equal(stretch.FindEmitterByName("stretch_dest_sfx"), stretch.destinationEmitter);
  assert.equal(stretch.FindEmitterByName("missing"), null);
  assert.equal(mappedInterfaces(stretch.constructor).has(IInitialize), false,
    "negative control: inherited Initialize alone does not expose the native interface");
  assert.equal("SetValues" in stretch, false);
  assert.deepEqual(mappedInterfaces(Tr2AudioStretchAuto), new Set([Tr2AudioStretchBase, ITr2Audio]));
  assert.deepEqual(mappedInterfaces(Tr2AudioStretchBase), new Set([IInitialize, ITr2DebugRenderable, ITr2Audio]));
  assert.deepEqual(mappedInterfaces(AudGameObjResource), new Set([IInitialize, IListNotify, INotify, AudGameObjResource]));
  assert.deepEqual(mappedInterfaces(AudEventCurve), new Set([AudEventCurve, ITriFunction, IInitialize, ITriCurveLength]));
});
