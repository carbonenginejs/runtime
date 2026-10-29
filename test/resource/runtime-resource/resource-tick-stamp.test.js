// Tick-stamp renewal: a plain KeepAlive() writes the manager tick's time onto
// the resource, and the MotherLode folds it into its record before it decides
// anything (BlueAsyncRes.KeepAlive, CjsMotherLode._SettleRenewals).
//
// Its own file because CjsBlueResMan.activityTime is process-wide: once a
// manager has ticked, every plain KeepAlive in the process takes the stamp.
import assert from "node:assert/strict";
import { test, beforeEach, afterEach } from "node:test";

import "../../../npm/dist/index.js";
import { CjsBlueResMan, BlueAsyncRes, blue } from "../../../npm/dist/global/blue/index.js";


/** A manager on a hand-driven clock, with one bound resource. */
async function managed()
{
  const clock = { now: 1000 };
  const resMan = new CjsBlueResMan({ source: { Read: () => "{}" } });
  blue.resMan = resMan;
  resMan.RegisterObjectLoader("data", value => JSON.parse(value));
  resMan.motherLode._now = () => clock.now;
  const resource = resMan.GetResource("res:/tick/stamp.data");
  // Settle the native load before measuring renewal.
  await resMan.Wait();
  return { clock, resMan, resource };
}


test("before the first tick, KeepAlive renews through MotherLode", async () =>
{
  const {resMan, resource} = await managed();
  resMan.activityTime = 0;
  let renewals = 0;
  const original = resMan.motherLode.KeepAlive;
  resMan.motherLode.KeepAlive = function (...args) { renewals++; return original.apply(this, args); };
  resource.KeepAlive();
  assert.equal(renewals, 1);
});


test("Update stamps the tick, and a plain KeepAlive avoids MotherLode lookup", async () =>
{
  const { clock, resMan, resource } = await managed();
  let renewals = 0;
  const original = resMan.motherLode.KeepAlive;
  resMan.motherLode.KeepAlive = function (...args) { renewals++; return original.apply(this, args); };
  clock.now = 2000;
  resMan.Update();
  assert.equal(resMan.activityTime, 2000);
  resource.KeepAlive();
  resource.IsGood();
  assert.equal(resource._lastUsedTime, 2000);
  assert.equal(renewals, 0);
  resource.KeepAlive({ time: 2100 });
  assert.equal(renewals, 1);
});


test("the sweep sees stamped renewals: a used resource is not purged, an unused one is", async () =>
{
  const { clock, resMan, resource } = await managed();

  clock.now = 5000;
  resMan.Update();
  resource.KeepAlive();

  // 1.5 s after the renewal, with a 2 s limit: kept.
  let result = resMan.PurgeInactive({ time: 6500, maxIdleMilliseconds: 2000 });
  assert.equal(result.purged, 0);
  assert.equal(resMan.GetResourceStatus(resource).purged, false);

  // 4 s after it, with no renewal since: purged.
  result = resMan.PurgeInactive({ time: 9000, maxIdleMilliseconds: 2000 });
  assert.equal(result.purged, 1);
  assert.equal(resMan.GetResourceStatus(resource).purged, true);
});


test("a stamped renewal promotes a cached entry out of the byte cache, as KeepAlive did", async () =>
{
  const { clock, resMan, resource } = await managed();
  const lode = resMan.motherLode;
  const record = [ ...lode._entries.values() ].find(entry => entry.resource === resource);
  record.cached = true;
  record.cacheSequence = 7;

  clock.now = 7000;
  resMan.Update();
  resource.KeepAlive();
  lode._SettleRenewals();
  assert.equal(record.cached, false);
  assert.equal(record.cacheSequence, 0);
  assert.equal(record.lastUsedTime, 7000);
});

let previous;
beforeEach(() => { previous = blue.resMan; });
afterEach(() => { try { blue.resMan.Clear(); } finally { blue.resMan = previous; } });
