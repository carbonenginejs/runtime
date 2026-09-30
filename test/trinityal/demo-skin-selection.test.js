import assert from "node:assert/strict";
import test from "node:test";
import { createDemoSkinChange, resolveDemoDefaultDna } from "./webgpu/demo/demoSkinSelection.js";

const ANG = "angbc2_t1:crisis_angel:angel:pattern?crisis_angel;green_carapace_polished;none";
const ANG_BASE = "angbc2_t1:angelbase:angel";
const CROW = "cf2_t2a:caldaripolice:caldari:mesh?black_satin_enamel;black_satin_coated;none;none:pattern?caldaripolice;none;none";
const CROW_BASE = "cf2_t2a:kaalakiota:caldari";

/** The existing serialization contract: failed operations do not poison the queue. */
function queue()
{
  let pending = Promise.resolve();
  return action =>
  {
    const next = pending.then(action);
    pending = next.catch(() => {});
    return next;
  };
}

test("queued no-argument toggles preserve angbc2 and restore the exact skin string", async () =>
{
  const loaded = [];
  const change = createDemoSkinChange({ initialDna: ANG, serialize: queue(),
    resolveDefault: async () => ANG_BASE, replace: async dna => { loaded.push(dna); } });
  assert.deepEqual(await Promise.all([change(), change()]), [ANG_BASE, ANG]);
  assert.deepEqual(loaded, [ANG_BASE, ANG]);
});

test("explicit hull or skin LOAD replaces the remembered pair, including known type identity", async () =>
{
  const resolved = [], loaded = [];
  const change = createDemoSkinChange({ initialDna: ANG, serialize: queue(),
    resolveDefault: async (dna, typeID) => { resolved.push([dna, typeID]); return CROW_BASE; },
    replace: async dna => { loaded.push(dna); } });
  await change(CROW, 11176);
  assert.equal(await change(), CROW_BASE);
  assert.equal(await change(), CROW);
  assert.deepEqual(resolved, [[CROW, 11176]]);
  await change(CROW_BASE, 11176);
  assert.equal(await change(), CROW_BASE, "explicit base LOAD discards the prior skin, no invented alternate");
  assert.deepEqual(loaded, [CROW, CROW_BASE, CROW, CROW_BASE]);
});

test("failed replacement or resolution leaves selection state at the last successful ship", async () =>
{
  let fail = true, failResolve = true;
  const loaded = [];
  const change = createDemoSkinChange({ initialDna: ANG, serialize: queue(),
    resolveDefault: async () => { if (failResolve) throw Error("lookup failed"); return ANG_BASE; },
    replace: async dna => { if (fail) throw Error("overlay failed"); loaded.push(dna); } });
  await assert.rejects(change(), /lookup failed/);
  failResolve = false;
  await assert.rejects(change(CROW), /overlay failed/);
  fail = false;
  assert.equal(await change(), ANG_BASE);
  assert.equal(await change(), ANG);
  assert.deepEqual(loaded, [ANG_BASE, ANG]);
});

test("explicit type resolves without a skin, preserving structural clauses and dropping appearance overrides", async () =>
{
  const calls = [];
  const source = { resolve: async id => { calls.push(id); return { dna: CROW_BASE }; }, search: async () => { throw Error("not needed"); } };
  assert.equal(await resolveDemoDefaultDna(CROW + ":variant?x:layout?y", 11176, source), CROW_BASE + ":variant?x:layout?y");
  assert.deepEqual(calls, [11176]);
});

test("custom skin lookup uses only a complete, unique same-hull default result", async () =>
{
  const queries = [];
  const source = {
    search: async q => { queries.push(q); return { truncated: false, matches: q === ANG ? [] : [
      { dna: ANG_BASE, typeID: 78369, skinID: null },
      { dna: ANG, typeID: 78369, skinID: 999 },
      { dna: CROW_BASE, typeID: 11176, skinID: null }
    ] }; },
    resolve: async id => { assert.equal(id, 78369); return { dna: ANG_BASE }; }
  };
  assert.equal(await resolveDemoDefaultDna(ANG, null, source), ANG_BASE);
  assert.deepEqual(queries, [ANG, "angbc2_t1"]);
});

test("same exact skin on multiple types must resolve every type before deduplicating defaults", async () =>
{
  const source = { search: async () => ({ truncated: false, matches: [1,2].map(typeID => ({dna: ANG, typeID, exact:true, skinID:3})) }),
    resolve: async id => ({ dna: id === 1 ? ANG_BASE : "angbc2_t1:other:angel" }) };
  await assert.rejects(resolveDemoDefaultDna(ANG, null, source), /No unique default/);
  source.resolve = async () => ({ dna: ANG_BASE });
  assert.equal(await resolveDemoDefaultDna(ANG, null, source), ANG_BASE);
});

test("truncated or absent lookup never picks the first ranked result", async () =>
{
  const source = { search: async () => ({ truncated: true, matches: [{dna: ANG_BASE,typeID:78369,skinID:null}] }), resolve: async () => { throw Error("should not resolve"); } };
  await assert.rejects(resolveDemoDefaultDna(ANG, null, source), /incomplete/);
  source.search = async () => ({ truncated: false, matches: [] });
  await assert.rejects(resolveDemoDefaultDna(ANG, null, source), /No unique default/);
});

test("stale type, full multi-hull mismatch and structural conflict are rejected", async () =>
{
  const source = { resolve: async () => ({dna: CROW_BASE}) };
  await assert.rejects(resolveDemoDefaultDna(ANG, 11176, source), /hull and race/);
  source.resolve = async () => ({dna: ANG_BASE});
  await assert.rejects(resolveDemoDefaultDna("angbc2_t1;other:skin:angel", 78369, source), /hull and race/);
  source.resolve = async () => ({dna: ANG_BASE + ":variant?base"});
  await assert.rejects(resolveDemoDefaultDna(ANG + ":variant?custom", 78369, source), /conflicts with variant/);
});
