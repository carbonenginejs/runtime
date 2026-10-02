import assert from "node:assert/strict";
import test from "node:test";
import { EveSOF } from "../../../npm/dist/sof/index.js";

const base = "res:/dx9/model/spaceobjectfactory";
const missing = base + "/hulls/missing.black";
const dna = "root:faction:race:layout?hangar";

async function fixture()
{
  const hull = name => ({ name, buildClass: 0, geometryResFilePath: "res:/" + name + ".gr2", opaqueAreas: [] });
  const records = new Map([
    [base + "/generic.black", { materialPrefixes: [], variants: [] }],
    [base + "/hulls/root.black", { ...hull("root"), locatorSets: [{ name: "spots", locators: [
      { position: [1, 0, 0], rotation: [0, 0, 0, 1], scaling: [1, 1, 1], boneIndex: -1 }
    ] }] }],
    [base + "/hulls/before.black", hull("before")],
    [base + "/hulls/after.black", hull("after")],
    [base + "/factions/faction.black", { name: "faction" }],
    [base + "/races/race.black", { name: "race" }],
    [base + "/layouts/hangar.black", { name: "hangar", seed: 1, placements:
      ["before", "missing", "after"].map(name => ({ name, locatorSetName: "spots", descriptor: { hull: name }, isInstanced: false, isShared: false })) }]
  ]);
  const failures = new Map();
  const sof = new EveSOF();
  (await sof.Register({ lazyData: { source: async path => {
    if (records.has(path)) return records.get(path);
    const error = failures.get(path) ?? new Error("Unavailable: " + path);
    failures.set(path, error);
    throw error;
  } } }));
  return { sof, records, failures, hull };
}

test("optional layout failure preserves the path error and builds both siblings", async () =>
{
  const { sof, records, failures, hull } = (await fixture());
  const values = await sof.BuildValuesFromDNAAsync(dna);
  assert.equal(values._type, "EveShip2");
  const json = JSON.stringify(values);
  assert.ok(json.includes("res:/before.gr2"));
  assert.ok(json.includes("res:/after.gr2"));
  assert.ok(!json.includes("res:/missing.gr2"));
  const library = (await sof.GetSofLibraryBuilder());
  assert.deepEqual(library.GetLoadErrors(), [{ path: missing, error: failures.get(missing) }]);
  assert.equal(sof.dataMgr.HasHullData("missing"), false);
  await assert.rejects(library.FetchHull("missing"), error => error === failures.get(missing));
  records.set(missing, hull("missing"));
  const retried = await sof.BuildValuesFromDNAAsync(dna);
  assert.ok(JSON.stringify(retried).includes("res:/missing.gr2"));
  assert.deepEqual(library.GetLoadErrors(), []);
});

for (const suffix of ["generic.black", "hulls/root.black", "factions/faction.black", "races/race.black"])
{
  test("essential failure still aborts: " + suffix, async () =>
  {
    const { sof, records } = (await fixture());
    records.delete(base + "/" + suffix);
    await assert.rejects(sof.BuildValuesFromDNAAsync(dna), /Unavailable/);
  });
}

test("an aborted layout load is not treated as an optional missing part", async () =>
{
  const { sof } = (await fixture());
  const library = (await sof.GetSofLibraryBuilder());
  const original = library._readObject;
  library._readObject = path => path === missing ? Promise.reject(new DOMException("Cancelled", "AbortError")) : original(path);
  await assert.rejects(sof.BuildValuesFromDNAAsync(dna), { name: "AbortError" });
});

test("a required caller sharing an optional layout read still receives its error", async () =>
{
  const { sof } = (await fixture());
  const library = (await sof.GetSofLibraryBuilder());
  const original = library._readObject;
  let release;
  let reached;
  const started = new Promise(resolve => { reached = resolve; });
  const failure = new Error("shared missing hull");
  library._readObject = path => path === missing ? new Promise((resolve, reject) => {
    release = () => reject(failure);
    reached();
  }) : original(path);
  const optional = sof.BuildValuesFromDNAAsync(dna);
  await started;
  const required = assert.rejects(library.FetchHull("missing"), error => error === failure);
  release();
  const values = await optional;
  await required;
  assert.ok(JSON.stringify(values).includes("res:/after.gr2"));
});
