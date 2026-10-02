import assert from "node:assert/strict";
import { test } from "node:test";
import { setImmediate as nextTurn } from "node:timers/promises";
import { EveSOF } from "../../../npm/dist/sof/index.js";

const DNA = "test:neutral:neutral";
const DATA_PATH = "res:/sof/data.black";
const BASE_PATH = "res:/dx9/model/spaceobjectfactory";

function catalog()
{
  return {
    generic: {},
    hull: [{ name: "test", buildClass: 0, opaqueAreas: [], boundingSphere: [0, 0, 0, 1] }],
    faction: [{ name: "neutral" }],
    race: [{ name: "neutral" }],
    material: [], pattern: [], layout: []
  };
}

function deferred()
{
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

const builds = {
  Fetch: sof => sof.Fetch(DNA),
  BuildFromDNAAsync: sof => sof.BuildFromDNAAsync(DNA),
  BuildAsync: sof => sof.BuildAsync("test", "neutral", "neutral"),
  BuildValuesFromDNAAsync: sof => sof.BuildValuesFromDNAAsync(DNA),
  BuildValuesAsync: sof => sof.BuildValuesAsync("test", "neutral", "neutral")
};

for (const [name, build] of Object.entries(builds))
{
  test(`${name} waits for a cold monolithic catalog and reuses successful initialization`, { timeout: 5000 }, async () => {
    const gate = deferred();
    const reads = [];
    const sof = (await new EveSOF().Register({
      dataPath: DATA_PATH,
      resources: { getObject: async (path, request) => {
        reads.push([path, request.role]);
        return gate.promise;
      } }
    }));
    let settled = false;
    const first = build(sof).then(value => { settled = true; return value; });
    const second = build(sof);
    await nextTurn();
    assert.equal(settled, false, "assembly must wait for the catalog");
    assert.deepEqual(reads, [[DATA_PATH, "sofData"]]);
    gate.resolve(catalog());
    const result = await first;
    assert.ok(result);
    assert.deepEqual(await second, result);
    assert.deepEqual(await build(sof), result);
    assert.equal(reads.length, 1, "successful initialization is retained");
    await sof.LoadDataAsync(DATA_PATH);
    assert.equal(reads.length, 2, "an explicit load still reloads");
  });
}

test("monolithic readiness retries rejection and invalid catalog results", async () => {
  let attempts = 0;
  const sof = (await new EveSOF().Register({
    dataPath: DATA_PATH,
    resources: { getObject: async () => {
      attempts++;
      if (attempts === 1) throw new Error("catalog temporarily unavailable");
      if (attempts === 2) return null;
      return catalog();
    } }
  }));
  await assert.rejects(sof.Fetch(DNA), error => error.path === DATA_PATH && error.cause?.message === "catalog temporarily unavailable");
  await assert.rejects(sof.Fetch(DNA), /catalog could not be loaded/);
  assert.ok(await sof.BuildValuesFromDNAAsync(DNA));
  assert.equal(attempts, 3);
  assert.ok(await sof.Fetch(DNA));
  assert.equal(attempts, 3);
});

test("monolithic readiness also tracks the data manager's async loader", async () => {
  const sof = (await new EveSOF().Register({ dataPath: DATA_PATH }));
  await assert.rejects(sof.Fetch(DNA), /catalog could not be loaded/);
  let reads = 0;
  sof.dataMgr.SetResourceLoader(async () => { reads++; return catalog(); });
  assert.ok(await sof.BuildValuesFromDNAAsync(DNA));
  assert.ok(await sof.Fetch(DNA));
  assert.equal(reads, 1);
});

test("changing a monolithic source invalidates readiness and rejects superseded publication", async () => {
  const gate = deferred();
  const sof = (await new EveSOF().Register({ dataPath: DATA_PATH, resources: { getObject: () => gate.promise } }));
  const pending = sof.Fetch(DNA);
  const rejected = assert.rejects(pending, /configuration changed while loading/);
  await nextTurn();
  let replacements = 0;
  const replacement = catalog();
  replacement.hull[0].boundingSphere = [1, 2, 3, 4];
  (await sof.Register({ resources: { getObject: async () => { replacements++; return replacement; } } }));
  assert.ok(await sof.Fetch(DNA));
  gate.resolve(catalog());
  await rejected;
  assert.deepEqual(sof.dataMgr.GetHullData("test").boundingSphere, [1, 2, 3, 4]);
  assert.ok(await sof.Fetch(DNA));
  assert.equal(replacements, 1);
});

async function lazyFactory(source)
{
  const data = catalog();
  data.generic.genericWreckMaterial = { material1: "wreck" };
  const records = new Map([
    [`${BASE_PATH}/generic.black`, data.generic],
    [`${BASE_PATH}/hulls/test.black`, data.hull[0]],
    [`${BASE_PATH}/factions/neutral.black`, data.faction[0]],
    [`${BASE_PATH}/races/neutral.black`, data.race[0]],
    [`${BASE_PATH}/materials/wreck.black`, { name: "wreck", parameters: [] }]
  ]);
  const reads = [];
  const sof = (await new EveSOF().Register({ lazyData: { source: async path => {
    reads.push(path);
    assert.ok(records.has(path), `unexpected catalog request ${path}`);
    await source(path);
    return records.get(path);
  } } }));
  return { sof, reads };
}

test("lazy builds and named fetches join generic material readiness", { timeout: 5000 }, async () => {
  const materialGate = deferred();
  const materialStarted = deferred();
  const { sof, reads } = (await lazyFactory(async path => {
    if (path.endsWith("/materials/wreck.black"))
    {
      materialStarted.resolve();
      await materialGate.promise;
    }
  }));
  const first = sof.BuildValuesFromDNAAsync(DNA);
  await materialStarted.promise;
  assert.equal(sof.dataMgr.HasGenericData(), true);
  let secondSettled = false;
  let hullSettled = false;
  const second = sof.BuildValuesFromDNAAsync(DNA).then(value => { secondSettled = true; return value; });
  const hull = (await sof.GetSofLibraryBuilder()).FetchHull("test").then(value => { hullSettled = true; return value; });
  await nextTurn();
  assert.equal(secondSettled, false, "a published generic record is not complete readiness");
  assert.equal(hullSettled, false, "named fetches join the same dependency closure");
  materialGate.resolve();
  const [a, b, h] = await Promise.all([first, second, hull]);
  assert.equal(a._type, "EveShip2");
  assert.deepEqual(a, b);
  assert.equal(h.name, "test");
  assert.equal(sof.dataMgr.HasMaterialData("wreck"), true);
  for (const path of new Set(reads)) assert.equal(reads.filter(value => value === path).length, 1, path);
});

test("generic material failure can retry after generic itself was published", { timeout: 5000 }, async () => {
  let attempts = 0;
  const { sof, reads } = (await lazyFactory(async path => {
    if (path.endsWith("/materials/wreck.black") && ++attempts === 1) throw new Error("wreck not ready");
  }));
  await assert.rejects(sof.BuildValuesFromDNAAsync(DNA), /wreck not ready/);
  assert.equal(sof.dataMgr.HasGenericData(), true);
  assert.equal(sof.dataMgr.HasMaterialData("wreck"), false);
  assert.equal((await sof.BuildValuesFromDNAAsync(DNA))._type, "EveShip2");
  assert.equal(sof.dataMgr.HasMaterialData("wreck"), true);
  assert.equal(attempts, 2);
  assert.equal(reads.filter(path => path.endsWith("/generic.black")).length, 1);
});

test("concurrent forced generic refreshes join one full dependency operation", { timeout: 5000 }, async () => {
  const { sof, reads } = (await lazyFactory(async () => {}));
  const builder = (await sof.GetSofLibraryBuilder());
  await builder.EnsureGeneric();
  await Promise.all([builder.EnsureGeneric({ force: true }), builder.EnsureGeneric({ force: true })]);
  assert.equal(reads.filter(path => path.endsWith("/generic.black")).length, 2);
  assert.equal(reads.filter(path => path.endsWith("/materials/wreck.black")).length, 2);
});

test("failed explicit reload invalidates earlier readiness and permits a clean retry", async () => {
  let reads = 0;
  const sof = (await new EveSOF().Register({ dataPath: DATA_PATH, resources: { getObject: async () => {
    reads++;
    return reads === 2 ? { ...catalog(), generic: null } : catalog();
  } } }));
  assert.ok(await sof.Fetch(DNA));
  assert.equal(await sof.LoadDataAsync(), false);
  assert.ok(await sof.Fetch(DNA));
  assert.equal(reads, 3);
});

test("builds await an explicit reload already in progress", { timeout: 5000 }, async () => {
  let reads = 0;
  const gate = deferred();
  const sof = (await new EveSOF().Register({ dataPath: DATA_PATH, resources: { getObject: async () => {
    reads++;
    return reads === 1 ? catalog() : gate.promise;
  } } }));
  assert.ok(await sof.Fetch(DNA));
  const reload = sof.LoadDataAsync();
  let settled = false;
  const build = sof.BuildValuesFromDNAAsync(DNA).then(value => { settled = true; return value; });
  await nextTurn();
  assert.equal(settled, false);
  const replacement = catalog();
  replacement.hull[0].boundingSphere = [4, 3, 2, 1];
  gate.resolve(replacement);
  assert.equal(await reload, true);
  assert.deepEqual((await build).boundingSphereCenter, [4, 3, 2]);
  assert.equal(reads, 2);
});

test("superseded manager fallback loads cannot overwrite a replacement source", async () => {
  const gate = deferred();
  const sof = (await new EveSOF().Register({ dataPath: DATA_PATH }));
  sof.dataMgr.SetResourceLoader(() => gate.promise);
  const old = assert.rejects(sof.Fetch(DNA), /configuration changed while loading/);
  await nextTurn();
  const replacement = catalog();
  replacement.hull[0].boundingSphere = [7, 8, 9, 10];
  (await sof.Register({ resources: { getObject: async () => replacement } }));
  assert.ok(await sof.Fetch(DNA));
  gate.resolve(catalog());
  await old;
  assert.deepEqual((await sof.BuildValuesFromDNAAsync(DNA)).boundingSphereCenter, [7, 8, 9]);
});

test("replacing the manager loader invalidates readiness and pending reads", async () => {
  const sof = (await new EveSOF().Register({ dataPath: DATA_PATH }));
  sof.dataMgr.SetResourceLoader(async () => catalog());
  assert.ok(await sof.Fetch(DNA));
  const gate = deferred();
  sof.dataMgr.SetResourceLoader(() => gate.promise);
  const pending = assert.rejects(sof.Fetch(DNA), /configuration changed while loading/);
  await nextTurn();
  const replacement = catalog();
  replacement.hull[0].boundingSphere = [9, 8, 7, 6];
  sof.dataMgr.SetResourceLoader(async () => replacement);
  assert.deepEqual((await sof.BuildValuesFromDNAAsync(DNA)).boundingSphereCenter, [9, 8, 7]);
  gate.resolve(catalog());
  await pending;
  assert.deepEqual((await sof.BuildValuesFromDNAAsync(DNA)).boundingSphereCenter, [9, 8, 7]);
});

for (const delayed of ["generic.black", "materials/wreck.black"])
{
  test(`replacing lazy data rejects publication from delayed ${delayed}`, { timeout: 5000 }, async () => {
    const gate = deferred();
    const started = deferred();
    const { sof } = (await lazyFactory(async path => {
      if (path.endsWith("/" + delayed)) { started.resolve(); await gate.promise; }
    }));
    const builder = (await sof.GetSofLibraryBuilder());
    const old = assert.rejects(builder.EnsureGeneric(), /catalog replaced while loading/);
    await started.promise;
    const replacement = catalog();
    replacement.generic.genericWreckMaterial = { material1: "replacement" };
    replacement.material = [{ name: "replacement", parameters: [] }];
    builder.SetData(replacement);
    await builder.EnsureGeneric();
    gate.resolve();
    await old;
    assert.equal(sof.dataMgr.HasMaterialData("wreck"), false);
    assert.equal(sof.dataMgr.HasMaterialData("replacement"), true);
    assert.equal(builder.data.generic, replacement.generic);
    assert.deepEqual(builder.GetLoadErrors(), []);
  });
}

test("public LoadData is asynchronous and shares reload readiness", async () => {
  let reads = 0;
  const sof = (await new EveSOF().Register({ dataPath: DATA_PATH, resources: { getObject: async () => {
    reads++;
    return reads === 2 ? { ...catalog(), generic: null } : catalog();
  } } }));
  const initial = sof.LoadData();
  assert.equal(typeof initial.then, "function");
  assert.equal(await initial, true);
  assert.ok(await sof.Fetch(DNA));
  assert.equal(reads, 1);
  assert.equal(await sof.LoadData(), false);
  assert.ok(await sof.Fetch(DNA));
  assert.equal(reads, 3);
});

test("failed lazy catalog replacement invalidates readiness before manager tables are cleared", async () => {
  const { sof, reads } = (await lazyFactory(async () => {}));
  const builder = (await sof.GetSofLibraryBuilder());
  await builder.EnsureGeneric();
  assert.throws(() => builder.SetData({ generic: {}, hull: [null] }), /could not install/);
  assert.equal(sof.dataMgr.HasGenericData(), false);
  await builder.EnsureGeneric();
  assert.equal(sof.dataMgr.HasGenericData(), true);
  assert.equal(sof.dataMgr.HasMaterialData("wreck"), true);
  assert.equal(reads.filter(path => path.endsWith("/generic.black")).length, 2);
});

test("ordinary readiness retries a failed forced material refresh instead of accepting stale material", async () => {
  let materialReads = 0;
  const sof = (await new EveSOF().Register({ lazyData: { source: async path => {
    if (path.endsWith("/generic.black")) return { genericWreckMaterial: { material1: "wreck" } };
    assert.ok(path.endsWith("/materials/wreck.black"));
    materialReads++;
    if (materialReads === 2) throw new Error("forced material temporarily unavailable");
    return { name: "wreck", parameters: [{ name: "Color", value: [materialReads, 0, 0, 1] }] };
  } } }));
  const builder = (await sof.GetSofLibraryBuilder());
  await builder.EnsureGeneric();
  await assert.rejects(builder.EnsureGeneric({ force: true }), /forced material temporarily unavailable/);
  await builder.EnsureGeneric();
  assert.equal(materialReads, 3, "ordinary retry must refresh the failed dependency");
  assert.equal(builder.data.material[0].parameters[0].value[0], 3);
});

test("ordinary readiness retries the generic record after a forced generic read fails", async () => {
  let genericReads = 0;
  const sof = (await new EveSOF().Register({ lazyData: { source: async () => {
    genericReads++;
    if (genericReads === 2) throw new Error("forced generic temporarily unavailable");
    return { areaShaderLocation: `res:/generation${genericReads}` };
  } } }));
  const builder = (await sof.GetSofLibraryBuilder());
  await builder.EnsureGeneric();
  await assert.rejects(builder.EnsureGeneric({ force: true }), /forced generic temporarily unavailable/);
  await builder.EnsureGeneric();
  assert.equal(genericReads, 3);
  assert.equal(builder.data.generic.areaShaderLocation, "res:/generation3");
});
