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

/** Normalizes process audio IDs and order-independent named effect bindings. */
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
    if (CjsSchema.cast(live, Tr2Effect))
    {
      for (const key of ["constParameters", "resources", "samplerOverrides", "lodTextureParameters"])
      {
        assert.equal(new Set(exported[key].map(value => value.name)).size, exported[key].length);
        exported[key].sort((a, b) => a.name.localeCompare(b.name));
      }
    }
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

test("real SOF DNA edits preserve live graphs and match standard builds", { skip: !resourceBase }, async t =>
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

  await t.test("af1 SOF6 faction appearance retains live objects and matches full builds", async context =>
  {
    const initial = "af1_t1:amarrbase:amarr";
    const initialValues = await sof.BuildValuesFromDNA(initial);
    const live = CjsSchema.from(initialValues._type, initialValues), updater = new CjsSOFUpdater(sof);
    const assertIdentities = Snapshot(live, initialValues);
    const mesh = live.mesh, attachments = live.attachments, children = live.effectChildren;
    const Build = sof.BuildValuesFromDNA.bind(sof);
    const forbidden = context.mock.method(sof, "BuildValuesFromDNA", () => assert.fail("faction full build"));
    for (const faction of ["amarrnavy", "khanid", "carthum", "viziam", "amarrbase"])
    {
      const dna = `af1_t1:${faction}:amarr`;
      const values = await Build(dna), expected = CjsSchema.from(values._type, values);
      const start = performance.now();
      assert.ok(Array.isArray(await updater.UpdateFromDNA(live, dna)), faction);
      const updateMs = performance.now() - start;
      assert.equal(live.mesh, mesh); assert.equal(live.attachments, attachments); assert.equal(live.effectChildren, children);
      assertIdentities();
      assert.deepEqual(ComparableValues(live), ComparableValues(expected), faction);
      context.diagnostic(JSON.stringify({ faction, updateMs, fullBuilds: 0 }));
    }
    forbidden.mock.restore();
  });

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
    const fullBuild = context.mock.method(sof, "BuildValuesFromDNA", () => assert.fail("Magnate material edit must not build the graph"));
    const start = performance.now();
    assert.ok(Array.isArray(await updater.UpdateFromDNA(live, nextDna)));
    const updateMs = performance.now() - start;
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
    fullBuild.mock.restore();
    context.diagnostic(JSON.stringify({ resourceBase, changedEffects: changed.size, updateMs, fullBuilds: 0 }));
  });

  await t.test("Magnate pattern swap preserves masks and matches a fresh pattern/material build", async context =>
  {
    const { dna } = await Read("/dna/resolve?name=Magnate");
    const originalDna = dna + ":pattern?glacialdrift_amarr;aqua_blue_colorshift_polished;aqua_electric_enamel";
    const nextDna = dna + ":pattern?igc_amarr;aqua_electric_enamel;aqua_blue_colorshift_polished";
    const before = await sof.BuildValuesFromDNA(originalDna);
    const live = CjsSchema.from(before._type, before), assertIdentities = Snapshot(live, before);
    const desired = await sof.BuildValuesFromDNA(nextDna);
    const rebuilt = CjsSchema.from(desired._type, desired);
    const oldPaths = new Map();
    VisitAuthored(live, before, object =>
    {
      if (CjsSchema.cast(object, TriTextureParameter)) oldPaths.set(object, object.resourcePath);
    });
    const calls = [], refreshes = [];
    const originalModified = TriTextureParameter.prototype.OnModified, rebuild = Tr2Effect.prototype.RebuildCachedDataInternal;
    const textureSpy = context.mock.method(TriTextureParameter.prototype, "OnModified", function(member)
    {
      calls.push([this, member]);
      return originalModified.call(this, member);
    });
    const effectSpy = context.mock.method(Tr2Effect.prototype, "RebuildCachedDataInternal", function(...args)
    {
      if (!this.insideStartUpdate) refreshes.push(this);
      return rebuild.apply(this, args);
    });
    const updater = new CjsSOFUpdater(sof);
    assert.ok(Array.isArray(await updater.UpdateFromDNA(live, nextDna)));
    assertIdentities();
    assert.deepEqual(ComparableValues(live), ComparableValues(rebuilt));
    const changed = new Set([...oldPaths].filter(([texture, path]) => texture.resourcePath !== path).map(([texture]) => texture));
    assert.ok(changed.size > 0);
    assert.equal(calls.length, changed.size);
    assert.equal(new Set(calls.map(([texture]) => texture)).size, changed.size);
    assert.ok(calls.every(([texture, member]) => changed.has(texture) && member === "resourcePath"));
    assert.equal(refreshes.length, new Set(refreshes).size);
    const requests = resources.requests.length, refreshCount = refreshes.length;
    assert.equal(await updater.UpdateFromDNA(live, nextDna), false);
    assert.equal(resources.requests.length, requests);
    assert.equal(calls.length, changed.size);
    assert.equal(refreshes.length, refreshCount);
    textureSpy.mock.restore();
    effectSpy.mock.restore();
    context.diagnostic(JSON.stringify({ resourceBase, masks: live.customMasks.length,
      changedTextures: changed.size, changedEffects: refreshCount }));
  });

  await t.test("af1 pattern materials apply and clear without rebuilding or reordering constants", async context =>
  {
    const patterns = await Read("/sof/hulls/af1_t1/patterns");
    assert.ok(patterns.length);
    for (const pattern of patterns)
    {
      await context.test(pattern, async sample =>
      {
        const base = `af1_t1:amarrbase:amarr:pattern?${pattern}`;
        const originalDna = base + ";none;none";
        const nextDna = base + ";aqua_blue_colorshift_polished;aqua_electric_enamel";
        const before = await sof.BuildValuesFromDNA(originalDna);
        const desired = await sof.BuildValuesFromDNA(nextDna);
        const live = CjsSchema.from(before._type, before);
        const rebuilt = CjsSchema.from(desired._type, desired);
        const original = CjsSchema.from(before._type, before);
        const assertIdentities = Snapshot(live, before), updater = new CjsSOFUpdater(sof);
        const requests = resources.requests.length;
        const spy = sample.mock.method(sof, "BuildValuesFromDNA", () => assert.fail("pattern materials must not build a graph"));
        assert.ok(Array.isArray(await updater.UpdateFromDNA(live, nextDna)));
        assertIdentities();
        assert.deepEqual(ComparableValues(live), ComparableValues(rebuilt));
        assert.equal(await updater.UpdateFromDNA(live, nextDna), false);
        assert.ok(Array.isArray(await updater.UpdateFromDNA(live, originalDna)));
        assertIdentities();
        assert.deepEqual(ComparableValues(live), ComparableValues(original));
        assert.equal(resources.requests.length, requests, "material edits acquire no resources");
        spy.mock.restore();
      });
    }
  });

  await t.test("af1 adds and removes supported patterns while retaining the hull", async context =>
  {
    const base = "af1_t1:amarrbase:amarr", empty = base + ":pattern?;none;none";
    const before = await sof.BuildValuesFromDNA(empty);
    const live = CjsSchema.from(before._type, before), updater = new CjsSOFUpdater(sof);
    const assertIdentities = Snapshot(live, before), masks = live.customMasks;
    assert.equal(masks.length, 0);
    const patterns = await Read("/sof/hulls/af1_t1/patterns");
    const build = sof.BuildValuesFromDNA.bind(sof);
    const spy = context.mock.method(sof, "BuildValuesFromDNA", () => assert.fail("ordinary pattern updates must not build a whole graph"));
    const timings = [];
    for (const pattern of patterns)
    {
      await context.test(pattern, async () =>
      {
        for (const dna of [base + `:pattern?${pattern};aqua_blue_colorshift_polished;aqua_electric_enamel`, empty])
        {
          const buildStart = performance.now();
          const desired = await build(dna), rebuilt = CjsSchema.from(desired._type, desired);
          const buildMs = performance.now() - buildStart, updateStart = performance.now();
          assert.ok(Array.isArray(await updater.UpdateFromDNA(live, dna)), dna);
          timings.push({ pattern, add: dna !== empty, updateMs: performance.now() - updateStart, buildMs });
          assertIdentities();
          assert.equal(live.customMasks, masks);
          assert.equal(masks.length, rebuilt.customMasks.length);
          assert.deepEqual(ComparableValues(live), ComparableValues(rebuilt));
          const requests = resources.requests.length;
          assert.equal(await updater.UpdateFromDNA(live, dna), false);
          assert.equal(resources.requests.length, requests);
        }
      });
    }
    assert.equal(spy.mock.callCount(), 0);
    spy.mock.restore();
    context.diagnostic(JSON.stringify({ patternTimings: timings, fullBuildCalls: spy.mock.callCount() }));
  });

  await t.test("af1 combines pattern and insert changes without full builds", async context =>
  {
    const base = "af1_t1:amarrbase:amarr", empty = base + ":respathinsert?none:pattern?;none;none";
    const before = await sof.BuildValuesFromDNA(empty);
    const live = CjsSchema.from(before._type, before), updater = new CjsSOFUpdater(sof);
    const assertIdentities = Snapshot(live, before);
    const patterns = await Read("/sof/hulls/af1_t1/patterns");
    const inserts = await Read("/sof/hulls/af1_t1/respathinserts");
    assert.ok(patterns.length); assert.ok(inserts.length);
    const build = sof.BuildValuesFromDNA.bind(sof);
    const spy = context.mock.method(sof, "BuildValuesFromDNA", () => assert.fail("combined edit built a full graph"));
    for (const pattern of patterns)
      for (const dna of [base + `:respathinsert?${inserts[0]}:pattern?${pattern};aqua_blue_colorshift_polished;aqua_electric_enamel`, empty])
      {
        const values = await build(dna), expected = CjsSchema.from(values._type, values);
        assert.ok(Array.isArray(await updater.UpdateFromDNA(live, dna)), dna);
        assertIdentities();
        assert.deepEqual(ComparableValues(live), ComparableValues(expected));
      }
    assert.equal(spy.mock.callCount(), 0);
    spy.mock.restore();
  });

  await t.test("af1 race swaps retain the hull and match fresh builds", async context =>
  {
    const initial = "af1_t1:amarrbase:amarr:respathinsert?none";
    const before = await sof.BuildValuesFromDNA(initial);
    const live = CjsSchema.from(before._type, before), updater = new CjsSOFUpdater(sof);
    const mesh = live.mesh, boosters = live.boosters, locators = live.locators, impact = live.impactOverlay;
    const trails = boosters?.trails, items = boosters?.items;
    const build = sof.BuildValuesFromDNA.bind(sof);
    const spy = context.mock.method(sof, "BuildValuesFromDNA", () => assert.fail("race edit built a complete graph"));
    for (const race of ["caldari", "gallente", "minmatar", "amarr"])
    {
      const dna = `af1_t1:amarrbase:${race}:respathinsert?none`;
      const values = await build(dna), expected = CjsSchema.from(values._type, values);
      assert.ok(Array.isArray(await updater.UpdateFromDNA(live, dna)), race);
      assert.equal(live.mesh, mesh); assert.equal(live.boosters, boosters);
      assert.equal(live.locators, locators); assert.equal(live.impactOverlay, impact);
      assert.equal(live.boosters?.trails, trails); assert.equal(live.boosters?.items, items);
      assert.deepEqual(ComparableValues(live), ComparableValues(expected));
    }
    assert.equal(spy.mock.callCount(), 0);
    spy.mock.restore();
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
