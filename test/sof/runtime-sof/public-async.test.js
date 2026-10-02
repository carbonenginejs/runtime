import assert from "node:assert/strict";
import { test } from "node:test";
import { setImmediate as nextTurn } from "node:timers/promises";
import { EveSOF } from "../../../npm/dist/sof/index.js";

const DNA = "test:neutral:neutral";
const BASE = "res:/dx9/model/spaceobjectfactory";
const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function data()
{
  return {
    generic: { materialPrefixes: [{ str: "Mtl1" }] },
    hull: [{ name: "test", buildClass: 0, opaqueAreas: [], boundingSphere: [0, 0, 0, 2] }],
    faction: [{ name: "neutral", areaTypes: { Primary: { material1: "paint" } } }],
    race: [{ name: "neutral" }],
    material: [{ name: "paint", parameters: [{ name: "Diffuse", value: [1, 2, 3, 4] }] }],
    pattern: [{ name: "pattern" }], layout: [{ name: "layout" }]
  };
}
function gate()
{
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function owner()
{
  return { _type: "EveStation2", effectChildren: [], children: [], attachments: [], curveSets: [], locatorSets: [] };
}
const operations = {
  Build: sof => sof.Build("test", "neutral", "neutral"),
  BuildFromDNA: sof => sof.BuildFromDNA(DNA),
  BuildValues: sof => sof.BuildValues("test", "neutral", "neutral"),
  BuildValuesFromDNA: sof => sof.BuildValuesFromDNA(DNA),
  CreateDna: async sof => (await sof.CreateDna(DNA)).IsValid(),
  InspectDna: async sof => (await sof.InspectDna(DNA)).buildable,
  ValidateDNA: sof => sof.ValidateDNA(DNA),
  GetDnaVisibilityGroups: sof => sof.GetDnaVisibilityGroups(DNA),
  PlanLayoutFromDNA: sof => sof.PlanLayoutFromDNA(DNA),
  GetGenericData: sof => sof.GetGenericData(),
  GetHullData: sof => sof.GetHullData("test"),
  GetFactionData: sof => sof.GetFactionData("neutral"),
  GetRaceData: sof => sof.GetRaceData("neutral"),
  GetMaterialData: sof => sof.GetMaterialData("paint"),
  GetPatternData: sof => sof.GetPatternData("pattern"),
  GetLayoutData: sof => sof.GetLayoutData("layout"),
  BuildChild: sof => sof.BuildChild(owner(), DNA, 7, IDENTITY),
  BuildChildValues: sof => sof.BuildChildValues(owner(), DNA, 7, IDENTITY)
};
for (const mode of ["monolithic", "lazy"])
{
  for (const [name, invoke] of Object.entries(operations))
  {
    test(`${name} awaits cold ${mode} data through the public entry`, { timeout: 5000 }, async () => {
      const ready = gate();
      const catalog = data();
      const records = new Map([[`${BASE}/generic.black`, catalog.generic]]);
      for (const kind of ["hull", "faction", "race", "material", "pattern", "layout"])
      {
        for (const record of catalog[kind]) records.set(`${BASE}/${kind}s/${record.name}.black`, record);
      }
      const sof = (await new EveSOF().Register(mode === "monolithic"
        ? { dataPath: "res:/sof/data.black", resources: { getObject: async () => { await ready.promise; return catalog; } } }
        : { lazyData: { source: async path => { await ready.promise; assert.ok(records.has(path), path); return records.get(path); } } }));
      let settled = false;
      const result = invoke(sof);
      assert.equal(typeof result.then, "function");
      const pending = result.then(value => { settled = true; return value; });
      await nextTurn();
      assert.equal(settled, false, "public operation must await catalog readiness");
      ready.resolve();
      assert.ok(await pending);
    });
  }
}

for (const method of ["SetupTurretMaterialFromFaction", "SetupChildTurretMaterialFromFaction", "SetupTurretMaterialFromDNA", "ApplyFactionToTurretShader"])
{
  test(`${method} acquires faction materials before applying parameters`, { timeout: 5000 }, async () => {
    const catalog = data();
    const material = gate(), started = gate();
    const sof = (await new EveSOF().Register({ lazyData: { source: async path => {
      if (path.endsWith("/generic.black")) return catalog.generic;
      if (path.includes("/materials/")) { started.resolve(); await material.promise; return catalog.material[0]; }
      if (path.includes("/factions/")) return catalog.faction[0];
      if (path.includes("/hulls/")) return catalog.hull[0];
      if (path.includes("/races/")) return catalog.race[0];
      throw new Error(path);
    } } }));
    const applied = [];
    const turret = { ApplySofTurretMaterial: resolve => applied.push(resolve("Mtl1Diffuse")) };
    const reference = new EveSOF();
    reference.dataMgr.SetData(catalog);
    const pending = method === "ApplyFactionToTurretShader"
      ? sof[method](turret, reference.dataMgr.GetGenericData(), reference.dataMgr.GetFactionData("neutral"))
      : sof[method](turret, method.endsWith("DNA") ? DNA : "neutral");
    await started.promise;
    assert.deepEqual(applied, [], "no parameter callback before material acquisition");
    material.resolve();
    await pending;
    assert.deepEqual(applied, [[1, 2, 3, 4]]);
  });
}

test("child dependency failure leaves the caller's owner untouched", async () => {
  const catalog = data();
  catalog.hull[0].children = [{ redFilePath: "res:/unavailable.red" }];
  const sof = (await new EveSOF().Register({ resources: { getObject: async () => { throw new Error("child unavailable"); } } }));
  sof.dataMgr.SetData(catalog);
  const target = owner();
  const before = structuredClone(target);
  await assert.rejects(sof.BuildChild(target, DNA, 1, IDENTITY), /failed to resolve child resource/);
  assert.deepEqual(target, before);
});

test("malformed lazy queries retain invalid results without requesting malformed paths", async () => {
  const sof = (await new EveSOF().Register({ lazyData: { source: async path => { throw new Error(`unexpected ${path}`); } } }));
  assert.equal(await sof.CreateDna("invalid"), null);
  assert.equal(await sof.BuildFromDNA("invalid"), null);
  assert.equal((await sof.InspectDna("invalid")).buildable, false);
});

test("supplied faction projections acquire their own material overrides", async () => {
  const catalog = data();
  const reference = new EveSOF();
  const edited = data();
  edited.faction[0].areaTypes.Primary.material1 = "override";
  reference.dataMgr.SetData(edited);
  const material = gate(), entered = gate();
  const paths = [];
  const sof = (await new EveSOF().Register({ lazyData: { source: async path => {
    paths.push(path);
    if (path.endsWith("/generic.black")) return catalog.generic;
    if (path.endsWith("/materials/override.black")) {
      entered.resolve(); await material.promise;
      return { name: "override", parameters: [{ name: "Diffuse", value: [5, 6, 7, 8] }] };
    }
    if (path.endsWith("/factions/neutral.black")) return catalog.faction[0];
    if (path.endsWith("/materials/paint.black")) return catalog.material[0];
    throw new Error(path);
  } } }));
  const applied = [];
  const pending = sof.ApplyFactionToTurretShader({ ApplySofTurretMaterial: resolve => applied.push(resolve("Mtl1Diffuse")) },
    reference.dataMgr.GetGenericData(), reference.dataMgr.GetFactionData("neutral"));
  assert.equal(await Promise.race([entered.promise.then(() => true), pending.then(() => false)]), true,
    "supplied projection material must be acquired before applying parameters");
  assert.deepEqual(applied, []);
  material.resolve();
  await pending;
  assert.deepEqual(applied, [[5, 6, 7, 8]]);
  assert.ok(paths.includes(BASE + "/materials/override.black"));
});

test("public data lookups normalize names consistently with lazy acquisition", async () => {
  const sof = new EveSOF();
  sof.dataMgr.SetData(data());
  for (const [kind, name] of [["Hull", "test"], ["Faction", "neutral"], ["Race", "neutral"], ["Material", "paint"], ["Pattern", "pattern"], ["Layout", "layout"]])
    assert.ok(await sof["Get" + kind + "Data"](" " + name.toUpperCase() + " "), kind);
});
