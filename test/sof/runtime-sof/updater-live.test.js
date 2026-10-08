import assert from "node:assert/strict";
import test from "node:test";
import { performance } from "node:perf_hooks";
import { EveSOF, CjsSOFUpdater } from "../../../npm/dist/sof/index.js";
import { CjsSchema } from "../../../npm/dist/global/schema/index.js";
import { TriTextureParameter, Tr2Effect } from "../../../npm/dist/trinity/index.js";
import { AudEmitter } from "../../../npm/dist/audio/trinity/index.js";
import { composeStubResMan } from "../../support/stubResMan.js";

// Opt in with an exact-build tools HTTP base. No game data is saved in the repo,
// and the resource manager is a CPU stub: this never starts a renderer.
const resourceBase = process.env.CJS_SOF_UPDATER_RESOURCE_BASE;

/** Reads one exact-build route, surfacing failed acquisition rather than hiding it. */
async function Read(route)
{
  const response = await fetch(resourceBase + route, { signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`${route}: HTTP ${response.status}`);
  return response.json();
}

/** Captures authored object/list identities without following acquired resource internals. */
function Snapshot(live, values)
{
  const anchors = new Map(), indexed = new WeakSet(), seen = new WeakSet(), slots = [];
  const Index = value =>
  {
    if (!value || typeof value !== "object" || indexed.has(value)) return;
    indexed.add(value);
    if (Object.hasOwn(value, "_id")) anchors.set(value._id, value);
    Object.values(value).forEach(Index);
  };
  const Visit = (object, value) =>
  {
    if (!object || typeof object !== "object" || !value || typeof value !== "object") return;
    if (Object.hasOwn(value, "_ref")) value = anchors.get(value._ref);
    if (!value || seen.has(value)) return;
    seen.add(value);
    for (const [key, child] of Object.entries(value))
    {
      if (key.startsWith("_") || !child || typeof child !== "object") continue;
      slots.push([object, key, object[key]]);
      Visit(object[key], child);
    }
  };
  Index(values);
  Visit(live, values);
  return () => slots.forEach(([owner, key, object]) => assert.equal(owner[key], object, key));
}

/** Excludes only process-allocated audio IDs, preserving all authored/exported fields. */
function ComparableValues(object)
{
  const values = CjsSchema.getValues(object);
  const Visit = (live, exported) =>
  {
    if (!exported || typeof exported !== "object" || !live) return;
    if (CjsSchema.cast(live, AudEmitter))
    {
      assert.equal(exported.ID, live.ID);
      exported.ID = "runtime-audio-id";
    }
    for (const [key, value] of Object.entries(exported)) Visit(live[key], value);
  };
  Visit(object, values);
  return values;
}

/** Visits only authored edges, avoiding resource caches and renderer internals. */
function VisitAuthored(live, values, callback)
{
  const anchors = new Map(), indexed = new WeakSet(), seen = new WeakSet();
  const Index = value =>
  {
    if (!value || typeof value !== "object" || indexed.has(value)) return;
    indexed.add(value);
    if (Object.hasOwn(value, "_id")) anchors.set(value._id, value);
    Object.values(value).forEach(Index);
  };
  const Visit = (object, value) =>
  {
    if (!object || typeof object !== "object" || !value || typeof value !== "object") return;
    if (Object.hasOwn(value, "_ref")) value = anchors.get(value._ref);
    if (!value || seen.has(object)) return;
    seen.add(object);
    callback(object, value);
    for (const [key, child] of Object.entries(value)) if (!key.startsWith("_")) Visit(object[key], child);
  };
  Index(values);
  Visit(live, values);
}

test("real SOF insert edits preserve live graphs and match standard builds", { skip: !resourceBase }, async t =>
{
  assert.match(resourceBase, /\/eve\/\d+$/, "pin an exact tools build");
  // Booster flare initialization uses Math.random independently of the SOF seed.
  t.mock.method(Math, "random", () => 0.25);
  const resources = composeStubResMan();
  t.after(() => resources.restore());
  const paths = await Read("/resfiles"), indexed = new Set(paths), records = new Map();
  const Source = path =>
  {
    // Authored .red references address their shipped .black payloads.
    path = path.toLowerCase().replace(/\.red$/, ".black");
    if (!records.has(path)) records.set(path, Read(`/resources/${path.slice(5)}?format=json`).then(value => value.object));
    return records.get(path);
  };
  const sof = await new EveSOF().Register({
    lazyData: { source: Source, exists: path => indexed.has(path.toLowerCase()) },
    resources: { getObject: Source }, resFileIndex: paths, editorMode: true
  });
  await sof.InitializeAsync();

  for (const name of ["Magnate", "Inquisitor", "Avatar Sanguinary Savant"])
  {
    await t.test(name, async context =>
    {
      const { dna } = await Read(`/dna/resolve?name=${encodeURIComponent(name)}`);
      const originalDna = dna.split(":").filter(part => !part.startsWith("respathinsert?")).join(":") + ":respathinsert?none";
      const inserts = await Read(`/sof/hulls/${dna.split(":")[0]}/respathinserts`);
      assert.ok(inserts.includes("bloodraider"));
      const nextDna = originalDna.replace(":respathinsert?none", ":respathinsert?bloodraider");
      const options = { seedOverwrite: 658 };
      const before = await sof.BuildValuesFromDNA(originalDna, options);
      const live = CjsSchema.from(before._type, before);
      const assertIdentities = Snapshot(live, before);
      const updater = new CjsSOFUpdater(sof);
      const calls = [], changedPaths = new Map();
      const originalModified = TriTextureParameter.prototype.OnModified;
      const spy = context.mock.method(TriTextureParameter.prototype, "OnModified", function(member)
      {
        calls.push([this, member]);
        return originalModified.call(this, member);
      });
      const oldPaths = new Map();
      const Gather = (value, seen = new WeakSet()) =>
      {
        if (!value || typeof value !== "object" || seen.has(value)) return;
        seen.add(value);
        if (CjsSchema.cast(value, TriTextureParameter)) oldPaths.set(value, value.resourcePath);
        if (ArrayBuffer.isView(value)) return;
        for (const [key, child] of Object.entries(value)) if (!key.startsWith("_")) Gather(child, seen);
      };
      Gather(live);
      const start = performance.now();
      const changes = await updater.UpdateFromDNA(live, nextDna, options);
      const updateMs = performance.now() - start;
      assert.ok(Array.isArray(changes));
      assertIdentities();
      for (const [texture, path] of oldPaths) if (texture.resourcePath !== path) changedPaths.set(texture, path);
      assert.ok(changedPaths.size > 0);
      assert.equal(calls.length, changedPaths.size);
      assert.equal(new Set(calls.map(([texture]) => texture)).size, changedPaths.size);
      assert.ok(calls.every(([texture, member]) => changedPaths.has(texture) && member === "resourcePath"));
      const requests = resources.requests.length;
      assert.equal(await updater.UpdateFromDNA(live, nextDna, options), false);
      assert.equal(resources.requests.length, requests);
      assert.equal(calls.length, changedPaths.size);
      spy.mock.restore();

      const fullStart = performance.now();
      const after = await sof.BuildValuesFromDNA(nextDna, options);
      const rebuilt = CjsSchema.from(after._type, after);
      const rebuildMs = performance.now() - fullStart;
      assert.deepEqual(ComparableValues(live), ComparableValues(rebuilt));
      if (name.startsWith("Avatar")) assert.ok(live.decals.length >= 10, "decal-heavy real fixture");
      context.diagnostic(JSON.stringify({ resourceBase, dna, textureChanges: changedPaths.size,
        decals: live.decals.length, updateMs, cpuBuildAndHydrateMs: rebuildMs }));
    });
  }

  await t.test("Magnate mesh materials retain constants and refresh only changed effects", async context =>
  {
    const { dna } = await Read("/dna/resolve?name=Magnate");
    const before = await sof.BuildValuesFromDNA(dna);
    const live = CjsSchema.from(before._type, before), assertIdentities = Snapshot(live, before);
    const nextDna = dna + ":material?aqua_blue_colorshift_polished;none;none;none";
    const desired = await sof.BuildValuesFromDNA(nextDna);
    const rebuilt = CjsSchema.from(desired._type, desired);
    const oldConstants = new Map();
    VisitAuthored(live, before, object =>
    {
      if (CjsSchema.cast(object, Tr2Effect)) oldConstants.set(object, JSON.stringify(object.constParameters.map(value => Array.from(value.value))));
    });
    const calls = [], rebuild = Tr2Effect.prototype.RebuildCachedDataInternal;
    const spy = context.mock.method(Tr2Effect.prototype, "RebuildCachedDataInternal", function(...args)
    {
      calls.push(this);
      return rebuild.apply(this, args);
    });
    const requests = resources.requests.length;
    const updater = new CjsSOFUpdater(sof);
    assert.ok(Array.isArray(await updater.UpdateFromDNA(live, nextDna)));
    assertIdentities();
    const changed = new Set([...oldConstants].filter(([effect, value]) => value !== JSON.stringify(effect.constParameters.map(record => Array.from(record.value)))).map(([effect]) => effect));
    assert.ok(changed.size > 0);
    assert.equal(calls.length, changed.size);
    assert.equal(new Set(calls).size, changed.size);
    assert.ok(calls.every(effect => changed.has(effect)));
    assert.equal(resources.requests.length, requests);
    assert.deepEqual(ComparableValues(live), ComparableValues(rebuilt));
    assert.equal(await updater.UpdateFromDNA(live, nextDna), false);
    assert.equal(calls.length, changed.size);
    spy.mock.restore();
    context.diagnostic(JSON.stringify({ resourceBase, changedEffects: changed.size }));
  });

  await t.test("Deathless hangar retains authored slots and matches requested texture paths", async context =>
  {
    const originalDna = "mdeha01:deathless:deathless:layout?deathless_hangar:respathinsert?none";
    const inserts = await Read("/sof/hulls/mdeha01/respathinserts");
    assert.ok(inserts.length);
    const nextDna = originalDna.replace("respathinsert?none", `respathinsert?${inserts[0]}`);
    const options = { seedOverwrite: 658 };
    const before = await sof.BuildValuesFromDNA(originalDna, options);
    const live = CjsSchema.from(before._type, before);
    const assertIdentities = Snapshot(live, before), oldPaths = new Map();
    VisitAuthored(live, before, object =>
    {
      if (CjsSchema.cast(object, TriTextureParameter)) oldPaths.set(object, object.resourcePath);
    });
    const calls = [], originalModified = TriTextureParameter.prototype.OnModified;
    const spy = context.mock.method(TriTextureParameter.prototype, "OnModified", function(member)
    {
      calls.push([this, member]);
      return originalModified.call(this, member);
    });
    const updater = new CjsSOFUpdater(sof);
    assert.ok(Array.isArray(await updater.UpdateFromDNA(live, nextDna, options)));
    assertIdentities();
    const changed = new Set([...oldPaths].filter(([texture, path]) => texture.resourcePath !== path).map(([texture]) => texture));
    assert.ok(changed.size > 0);
    assert.equal(calls.length, changed.size);
    assert.equal(new Set(calls.map(([texture]) => texture)).size, changed.size);
    assert.ok(calls.every(([texture, member]) => changed.has(texture) && member === "resourcePath"));
    const after = await sof.BuildValuesFromDNA(nextDna, options);
    let textures = 0, shaderOptions = 0;
    VisitAuthored(live, after, (object, value) =>
    {
      if (value._type === "TriTextureParameter")
      {
        assert.equal(object.resourcePath, value.resourcePath);
        textures++;
      }
      if (value._type === "Tr2ShaderOption")
      {
        assert.equal(object.name, value.name);
        assert.equal(object.value, value.value);
        shaderOptions++;
      }
    });
    const requests = resources.requests.length;
    assert.equal(await updater.UpdateFromDNA(live, nextDna, options), false);
    assert.equal(resources.requests.length, requests);
    assert.equal(calls.length, changed.size);
    spy.mock.restore();
    context.diagnostic(JSON.stringify({ resourceBase, textures, shaderOptions, changedTextures: changed.size }));
  });
});
