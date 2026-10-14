import assert from "node:assert/strict";
import test from "node:test";
import { EveSOF, EveSOFDNA, CjsSOFUpdater } from "../../../npm/dist/sof/index.js";
import { CjsSchema } from "../../../npm/dist/global/schema/index.js";
import { EveShip2, TriTextureParameter } from "../../../npm/dist/trinity/index.js";
import { composeStubResMan } from "../../support/stubResMan.js";

const resources = composeStubResMan();
const originalDna = "hull:faction:race:respathinsert?none";
const insertedDna = "hull:faction:race:respathinsert?insert";

/** SOF6 factions with inherited materials, palette, insert and pattern defaults. */
async function FactionFixture(configure = null, suffix = "")
{
  return Fixture(options =>
  {
    const data = options.black;
    data.hull[0].sof6 = true;
    data.generic.materialPrefixes = [{ str: "Mtl1" }, { str: "Mtl2" }];
    data.generic.areaShaders[0].parameters = [{ str: "Mtl1Diffuse" }, { str: "Mtl2Diffuse" }];
    data.material = ["red", "blue"].map((name, index) => ({ name,
      parameters: [{ name: "Diffuse", value: index ? [0, 0, 1, 1] : [1, 0, 0, 1] }] }));
    data.faction = ["faction", "other"].map((name, index) => ({ name,
      resPathInsert: index ? "insert" : "", defaultPatternName: index ? "two" : "one",
      areaTypes: { Primary: { material1: index ? "blue" : "red", material2: index ? "red" : "blue" } },
      colorSet: { Primary: index ? [0, 0, 1, 1] : [1, 0, 0, 1] },
      visibilityGroupSet: { visibilityGroups: [{ str: "primary" }] }
    }));
    data.pattern = ["one", "two"].map((name, index) => ({ name, sof6: true,
      layer1: { materialSource: 0, textureName: "PatternMask", textureResFilePath: `res:/${name}.dds` },
      layer2: null, applicationGroups: [{ name: "ships",
        layer1Properties: { projectionTypeU: index, projectionTypeV: index + 1, Primary: true, isTargetMtl1: true },
        layer2Properties: null, projections: [{ name: "hull",
          transformLayer1: { position: [index, 0, 0], scaling: [1, 1, 1], rotation: [0, 0, 0, 1], isMirrored: false },
          transformLayer2: null }]
      }]
    }));
    data.hull[0].spriteSets = [{ visibilityGroup: "primary", items: [{
      position: [1, 0, 0], colorType: 0, intensity: 1, saturation: 1,
      blinkRate: 0.25, blinkPhase: 0.5, minScale: 2, maxScale: 6, boneIndex: 3,
      light: { translation: [0, 0, 0], rotation: [0, 0, 0, 1], saturation: 1, intensity: 2 }
    }] }];
    if (configure) configure(options);
  }, "hull:faction:race" + suffix);
}

test("SOF6 faction appearance matches a full build without rebuilding the ship", async t =>
{
  const { sof, ship, updater } = await FactionFixture();
  const dna = "hull:other:race";
  const values = await sof.BuildValuesFromDNA(dna), expected = CjsSchema.from(values._type, values);
  const mesh = ship.mesh, attachments = ship.attachments, set = attachments[0], item = set.sprites[0];
  const light = set.lights[0], lightData = light.lightData, color = item.color, mask = ship.customMasks[0];
  t.mock.method(sof, "BuildValuesFromDNA", () => assert.fail("must not build a complete desired ship"));
  const rebuild = t.mock.method(set, "Rebuild");
  assert.ok(Array.isArray(await updater.UpdateFromDNA(ship, dna)));
  assert.equal(ship.mesh, mesh); assert.equal(ship.attachments, attachments); assert.equal(attachments[0], set);
  assert.equal(set.sprites[0], item); assert.equal(item.color, color);
  assert.equal(set.lights[0], light); assert.equal(light.lightData, lightData);
  assert.equal(ship.customMasks[0], mask); assert.equal(rebuild.mock.callCount(), 1);
  assert.deepEqual(CjsSchema.getValues(ship), CjsSchema.getValues(expected));
});

test("faction edits respect explicit material, insert and pattern overrides", async t =>
{
  const suffix = ":material?red;none:respathinsert?none:pattern?one";
  const { sof, ship, updater } = await FactionFixture(null, suffix);
  const dna = "hull:other:race" + suffix, effect = ship.mesh.opaqueAreas[0].effect;
  const values = await sof.BuildValuesFromDNA(dna), expected = CjsSchema.from(values._type, values);
  const diffuse = effect.resources.find(value => value.name === "DiffuseMap");
  const pattern = effect.resources.find(value => value.name === "PatternMask");
  t.mock.method(sof, "BuildValuesFromDNA", () => assert.fail("full build"));
  assert.ok(await updater.UpdateFromDNA(ship, dna));
  assert.equal(diffuse.resourcePath, "res:/ship_d.dds"); assert.equal(pattern.resourcePath, "res:/one.dds");
  assert.deepEqual(CjsSchema.getValues(ship), CjsSchema.getValues(expected));
});

test("faction palette updates preserve runtime transform, damage and attachment state", async () =>
{
  const { ship, updater } = await FactionFixture();
  ship.worldTransform[12] = 9;
  ship.impactOverlay = CjsSchema.from("EveImpactOverlay", {});
  ship.impactOverlay.hullDamageFactor = 0.37;
  const damage = ship.impactOverlay, set = ship.attachments[0], item = set.sprites[0];
  item.blinkPhase = 0.75;
  const inherit = ship.inheritProperties;
  assert.ok(await updater.UpdateFromDNA(ship, "hull:other:race"));
  assert.equal(ship.worldTransform[12], 9); assert.equal(ship.impactOverlay, damage);
  assert.equal(ship.impactOverlay.hullDamageFactor, 0.37);
  assert.equal(item.blinkPhase, 0.75); assert.equal(ship.inheritProperties, inherit);
});

test("same-sized visibility swaps request fallback before changing anything", async () =>
{
  const { ship, updater } = await FactionFixture(options =>
  {
    const data = options.black;
    data.hull[0].spriteSets.push({ ...structuredClone(data.hull[0].spriteSets[0]), visibilityGroup: "other" });
    data.faction[1].visibilityGroupSet.visibilityGroups[0].str = "other";
  });
  const before = CjsSchema.getValues(ship);
  assert.equal(await updater.UpdateFromDNA(ship, "hull:other:race"), null);
  assert.deepEqual(CjsSchema.getValues(ship), before);
});

test("edited attachment placement requests fallback with no partial material writes", async () =>
{
  const { ship, updater } = await FactionFixture();
  ship.attachments[0].sprites[0].position[0] = 99;
  const before = CjsSchema.getValues(ship);
  assert.equal(await updater.UpdateFromDNA(ship, "hull:other:race"), null);
  assert.deepEqual(CjsSchema.getValues(ship), before);
});

for (const rounded of [false, true])
test(`co-located ambiguous attachment sets fall back, including rounded placements: ${rounded}`, async () =>
{
  const { ship, updater } = await FactionFixture(options =>
  {
    const sets = options.black.hull[0].spriteSets;
    sets.push(structuredClone(sets[0]));
    sets[1].items[0].colorType = 1;
    sets[1].items[0].blinkRate = 0.8;
    if (rounded) sets[1].items[0].position[0] += 1e-9;
  });
  ship.attachments.reverse();
  const before = CjsSchema.getValues(ship);
  assert.equal(await updater.UpdateFromDNA(ship, "hull:other:race"), null);
  assert.deepEqual(CjsSchema.getValues(ship), before);
});

/** Adds glow and logo decals without changing the source topology. */
function FactionDecals(options)
{
  options.editorMode = true;
  const data = options.black;
  data.hull[0].decalSets = [{ visibilityGroup: "primary", items: [5, 6].map((usage, index) => ({
    name: `decal${index}`, usage, meshIndex: -1, boneIndex: -1, glowColorType: 0, logoType: 0,
    position: [index, 0, 0], rotation: [0, 0, 0, 1], scaling: [1, 1, 1],
    parameters: [], textures: [], indexBuffers: [{ indexBuffer: new Uint32Array([0, 1, 2]) }]
  })) }];
  data.generic.decalShaderLocation = "res:/decal";
  data.generic.decalShaders = ["decalv5.fx", "decalglowv5.fx"].map(shader => ({ shader,
    parameters: [], defaultTextures: [{ name: "NormalMap", resFilePath: "res:/normal.dds" }], parentTextures: [] }));
  data.faction.forEach((faction, index) =>
  {
    faction.logoSet = { logos: { primary: { textures: [{ name: "PatternMask", resFilePath: index ? "res:/two.dds" : "res:/one.dds" }] } } };
  });
}

test("faction glow and logo edits match fresh output while retaining decal identities", async t =>
{
  const { ship, sof, updater } = await FactionFixture(FactionDecals);
  const decals = ship.decals.slice(), effects = decals.map(value => value.decalEffect);
  const desired = await sof.BuildValuesFromDNA("hull:other:race");
  const expected = CjsSchema.from(desired._type, desired);
  t.mock.method(sof, "BuildValuesFromDNA", () => assert.fail("full build"));
  assert.ok(await updater.UpdateFromDNA(ship, "hull:other:race"));
  decals.forEach((decal, index) => { assert.equal(ship.decals[index], decal); assert.equal(decal.decalEffect, effects[index]); });
  assert.deepEqual(CjsSchema.getValues(ship), CjsSchema.getValues(expected));
});

test("a logo cannot overwrite an unchanged shared pattern texture", async () =>
{
  const { ship, updater } = await FactionFixture(FactionDecals, ":pattern?one");
  const effect = ship.mesh.opaqueAreas[0].effect;
  const pattern = effect.resources.find(value => value.name === "PatternMask");
  const logo = ship.decals[1].decalEffect;
  logo.resources[logo.resources.findIndex(value => value.name === "PatternMask")] = pattern;
  const before = CjsSchema.getValues(ship);
  assert.equal(await updater.UpdateFromDNA(ship, "hull:other:race:pattern?one"), null);
  assert.deepEqual(CjsSchema.getValues(ship), before);
});

test("shared decal effects require fallback before conflicting faction glow changes", async () =>
{
  const { ship, updater } = await FactionFixture(options =>
  {
    FactionDecals(options);
    const items = options.black.hull[0].decalSets[0].items;
    items[1] = { ...structuredClone(items[0]), glowColorType: 1, position: [2, 0, 0] };
  });
  ship.decals[1].decalEffect = ship.decals[0].decalEffect;
  const before = CjsSchema.getValues(ship);
  assert.equal(await updater.UpdateFromDNA(ship, "hull:other:race"), null);
  assert.deepEqual(CjsSchema.getValues(ship), before);
});

test("unchanged faction colours do not rebuild attachment buffers", async t =>
{
  const { ship, updater } = await FactionFixture(options =>
  {
    options.black.faction[1].colorSet = structuredClone(options.black.faction[0].colorSet);
  });
  t.mock.method(ship.attachments[0], "Rebuild", () => assert.fail("unchanged colours rebuilt buffers"));
  assert.ok(await updater.UpdateFromDNA(ship, "hull:other:race"));
});

test("all SOF6 attachment and hull light families match fresh faction colours", async () =>
{
  const { ship, sof, updater } = await FactionFixture(options =>
  {
    const hull = options.black.hull[0];
    const light = { translation: [0, 1, 0], rotation: [0, 0, 0, 1], saturation: 0.5,
      intensity: 2, innerScaleMultiplier: 1, outerScaleMultiplier: 2 };
    const item = { position: [2, 3, 4], rotation: [0, 0, 0, 1], scaling: [2, 3, 4],
      colorType: 0, boneIndex: 2, intensity: 2, saturation: 0.7, lights: [light] };
    hull.spotlightSets = [{ visibilityGroup: "primary", items: [{ colorType: 0,
      transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 3, 0, 0, 1],
      coneIntensity: 2, flareIntensity: 3, spriteIntensity: 4, saturation: 0.5, light }] }];
    hull.planeSets = [{ visibilityGroup: "primary", items: [item] }];
    hull.spriteLineSets = [{ visibilityGroup: "primary", items: [{ ...item, light, spacing: 1 }] }];
    hull.hazeSets = [{ visibilityGroup: "primary", hazeType: 0, items: [{ ...item, hazeBrightness: 2 }] }];
    hull.lightSets = [{ visibilityGroup: "primary", items: [0, 1, 2].map(type => ({
      type, lightColor: 0, position: [type, 1, 2], radius: 3, brightness: 2, texturePath: "res:/light.dds"
    })) }];
  });
  const values = await sof.BuildValuesFromDNA("hull:other:race"), expected = CjsSchema.from(values._type, values);
  assert.equal(ship.attachments.length, 5);
  assert.equal(ship.lights.length, 3);
  assert.ok(await updater.UpdateFromDNA(ship, "hull:other:race"));
  assert.deepEqual(CjsSchema.getValues(ship), CjsSchema.getValues(expected));
});

test("faction edits preserve externally supplied banner images and content-derived light colours", async () =>
{
  const { ship, updater } = await FactionFixture(options =>
  {
    options.black.hull[0].bannerSets = [{ visibilityGroup: "primary", banners: [{
      usage: 0, position: [2, 0, 0], scaling: [1, 3, 2],
      light: { translation: [1, 0, 0], rotation: [0, 0, 0, 1], saturation: 0.5, intensity: 4 }
    }] }];
    options.black.generic.bannerShader = { shader: "res:/banner.fx", defaultParameters: [], defaultTextures: [] };
  });
  const banner = ship.attachments.find(value => CjsSchema.isInstanceOf("EveBannerSet", value));
  const texture = ship.externalParameters[0].destinationObject;
  texture.resourcePath = "res:/user-banner.dds";
  banner.lights[0].lightData.color.set([0.5, 0.25, 0.75, 1]);
  const color = banner.lights[0].lightData.color;
  assert.ok(await updater.UpdateFromDNA(ship, "hull:other:race"));
  assert.equal(ship.attachments.at(-1), banner);
  assert.equal(texture.resourcePath, "res:/user-banner.dds");
  assert.equal(banner.lights[0].lightData.color, color);
  assert.deepEqual(Array.from(color), [0.5, 0.25, 0.75, 1]);
});

test("faction edits revalidate attachments after asynchronous path acquisition", async t =>
{
  const { ship, sof, updater } = await FactionFixture();
  const original = sof.ModifyTextureResPaths.bind(sof);
  t.mock.method(sof, "ModifyTextureResPaths", async (...args) =>
  {
    const paths = await original(...args);
    ship.attachments[0].sprites[0].position[0] = 99;
    return paths;
  });
  const mesh = CjsSchema.getValues(ship.mesh), dna = ship.dna;
  assert.equal(await updater.UpdateFromDNA(ship, "hull:other:race"), null);
  assert.equal(ship.dna, dna); assert.deepEqual(CjsSchema.getValues(ship.mesh), mesh);
});

test("update requests retain complete DNA while distinguishing insert states from change flags", async () =>
{
  const { sof, updater } = await Fixture();
  const command = EveSOFDNA.DnaCommand.CMD_RESPATHINSERT;
  const selections = await Promise.all(["hull:faction:race", originalDna, insertedDna].map(dna => sof.CreateDna(dna)));
  const values = [null, ["none"], ["insert"]];
  for (let from = 0; from < selections.length; from++)
  {
    for (let to = 0; to < selections.length; to++)
    {
      const request = updater.CreateUpdateRequest(selections[from], selections[to]);
      assert.equal(request.dna, selections[to]);
      assert.deepEqual(request.dna.GetDnaCommandArgs(command), values[to]);
      assert.equal(request.dna.GetRaceName(), "race");
      assert.equal(request.respathinsert, from !== to);
      assert.equal(request.refresh, from === to);
      assert.equal(request.hull, false); assert.equal(request.faction, false);
      assert.equal(request.materials, false); assert.equal(request.pattern, false);
    }
  }
});

test("update requests distinguish pattern selection from pattern materials and normalize mesh aliases", async () =>
{
  const { sof, ship, updater } = await PatternFixture();
  const before = await sof.CreateDna(ship.dna);
  const materials = await sof.CreateDna(ship.dna.replace("pattern?one;red;blue", "pattern?one;blue;red"));
  const request = updater.CreateUpdateRequest(before, materials);
  assert.equal(request.pattern, false); assert.equal(request.patternMaterials, true);
  assert.equal(request.materials, false); assert.equal(request.respathinsert, false);
  assert.equal(request.refresh, false);
  const alias = await sof.CreateDna(ship.dna.replace("material?", "mesh?"));
  const same = updater.CreateUpdateRequest(before, alias);
  assert.equal(same.materials, false); assert.equal(same.refresh, true);
  const inherited = await sof.CreateDna(originalDna);
  const disabled = await sof.CreateDna(originalDna + ":pattern?;red;blue");
  assert.equal(updater.CreateUpdateRequest(inherited, disabled).pattern, true);
});

test("hull and faction request flags are independent and always retain target race and insert context", async () =>
{
  const { sof, updater, ship } = await Fixture(options =>
  {
    options.black.hull.push({ ...structuredClone(options.black.hull[0]), name: "otherhull" });
    options.black.faction.push({ ...structuredClone(options.black.faction[0]), name: "otherfaction" });
  });
  const before = await sof.CreateDna(ship.dna);
  for (const [hull, faction] of [[true, false], [false, true], [true, true]])
  {
    const dna = `${hull ? "otherhull" : "hull"}:${faction ? "otherfaction" : "faction"}:race`;
    const after = await sof.CreateDna(dna);
    const request = updater.CreateUpdateRequest(before, after);
    assert.equal(request.hull, hull); assert.equal(request.faction, faction);
    assert.equal(request.race, false); assert.equal(request.dna.GetRaceName(), "race");
    assert.equal(request.dna.GetDnaCommandArgs(EveSOFDNA.DnaCommand.CMD_RESPATHINSERT), null);
    // Request representation does not enable unsafe partial hull/faction updates.
    const snapshot = CjsSchema.getValues(ship);
    assert.equal(await updater.UpdateFromDNA(ship, dna), null);
    assert.deepEqual(CjsSchema.getValues(ship), snapshot);
  }
});

test("material stage keeps unchanged target insert and race context without querying unrelated stages", async t =>
{
  const { sof, updater, ship } = await MaterialFixture();
  const next = ship.dna.replace("material?red;none", "material?blue;none");
  const expected = CjsSchema.getValues(CjsSchema.from("EveShip2", await sof.BuildValuesFromDNA(next)));
  const requests = t.mock.method(updater, "CreateUpdateRequest");
  const applies = t.mock.method(updater, "_ApplyPlan");
  t.mock.method(sof, "ModifyTextureResPaths", () => assert.fail("material edit queried inserts"));
  t.mock.method(sof, "BuildValuesFromDNA", () => assert.fail("material edit built a graph"));
  assert.ok(await updater.UpdateFromDNA(ship, next));
  assert.equal(requests.mock.callCount(), 1); assert.equal(applies.mock.callCount(), 1);
  const request = requests.mock.calls[0].result;
  assert.equal(request.materials, true); assert.equal(request.respathinsert, false);
  assert.deepEqual(request.dna.GetDnaCommandArgs(EveSOFDNA.DnaCommand.CMD_RESPATHINSERT), ["none"]);
  assert.equal(request.dna.GetRaceName(), "race");
  assert.deepEqual(CjsSchema.getValues(ship), expected);
});

test("mesh and race planners leave live objects unchanged until the common apply stage", async t =>
{
  for (const fixture of [MaterialFixture, RaceFixture])
  {
    const { sof, updater, ship } = await fixture();
    const next = fixture === RaceFixture ? ship.dna.replace(":race:", ":other:")
      : ship.dna.replace("material?red;none", "material?blue;none");
    const before = await sof.CreateDna(ship.dna), after = await sof.CreateDna(next);
    const request = updater.CreateUpdateRequest(before, after);
    const snapshot = CjsSchema.getValues(ship), resourcesBefore = resources.requests.length;
    t.mock.method(updater, "_ApplyChange", () => assert.fail("planner applied a live mutation"));
    const plan = request.race ? updater._PlanRace(ship, before, request)
      : updater._PlanPreparedMesh(ship, request, await updater._PrepareMeshUpdate(ship, before, request, {}, () => true));
    assert.ok(plan); assert.ok(plan.changes.length);
    assert.deepEqual(CjsSchema.getValues(ship), snapshot);
    assert.equal(resources.requests.length, resourcesBefore);
    assert.equal(updater._ApplyPlan(ship, before, request, plan, () => false), false);
    assert.deepEqual(CjsSchema.getValues(ship), snapshot);
  }
});

for (const insert of [false, true]) test(`final planning catches target replacement after preparation (insert: ${insert})`, async t =>
{
  const { sof, updater, ship } = await MaterialFixture();
  const next = insert ? ship.dna.replace("respathinsert?none", "respathinsert?insert")
    : ship.dna.replace("material?red;none", "material?blue;none");
  const expected = CjsSchema.getValues(CjsSchema.from("EveShip2", await sof.BuildValuesFromDNA(next)));
  const detached = ship.mesh.opaqueAreas[0].effect, detachedValues = CjsSchema.getValues(detached);
  const replacement = CjsSchema.from("EveShip2", await sof.BuildValuesFromDNA(ship.dna)).mesh.opaqueAreas[0].effect;
  const prepare = updater._PrepareMeshUpdate.bind(updater);
  t.mock.method(updater, "_PrepareMeshUpdate", async (...args) =>
  {
    const prepared = await prepare(...args);
    queueMicrotask(() => { ship.mesh.opaqueAreas[0].effect = replacement; });
    return prepared;
  });
  const result = await updater.UpdateFromDNA(ship, next);
  assert.deepEqual(CjsSchema.getValues(detached), detachedValues, "detached targets must never receive changes");
  if (insert)
  {
    assert.equal(result, null, "acquired texture results no longer belong to the current targets");
    assert.equal(ship.dna, originalDna + ":material?red;none");
    assert.deepEqual(CjsSchema.getValues(replacement), detachedValues);
  }
  else
  {
    assert.ok(result, "material-only work is planned against the current mesh");
    assert.deepEqual(CjsSchema.getValues(ship), expected);
  }
});

/** Two races with matching effect bindings but different visual settings. */
async function RaceFixture(configure = null)
{
  return Fixture(options =>
  {
    const hull = options.black.hull[0];
    hull.booster = { hasTrails: true, items: [{ transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] }] };
    hull.impactEffectType = 1;
    options.black.generic.damage = { armorShader: "armor.fx", shieldShaderEllipsoid: "shield.fx", shieldGeometryResFilePath: "res:/shield.gr2" };
    options.black.generic.areaShaders[0].parameters = [{ str: "GeneralHeatGlowColor" }];
    options.black.faction[0].colorSet = { Booster: [1, 0, 0, 1], Reactor: [0, 0, 1, 1] };
    options.black.race = ["race", "other"].map((name, index) => ({ name,
      hullPrimaryHeatColorType: index ? 14 : 16,
      booster: { glowColor: [index, 0.2, 0.5, 1], glowScale: 1 + index,
        lightRadius: 10 + index, lightColor: [0.2, index, 0.4, 1],
        trailColor: [0, index, 1, 1], gradient0ResPath: `res:/${name}-gradient.dds`,
        shape0: { color: [index, 0, 1, 1] } },
      damage: {
        armorImpactParameters: [{ name: "ArmorP", value: [index, 1, 2, 3] }],
        armorImpactTextures: [{ name: "ArmorMap", resFilePath: `res:/${name}-armor.dds` }],
        shieldImpactParameters: [{ name: "ShieldP", value: [index, 4, 5, 6] }],
        shieldImpactTextures: [{ name: "ShieldMap", resFilePath: `res:/${name}-shield.dds` }]
      }
    }));
    if (configure) configure(options);
  });
}

test("race edits match fresh visuals while retaining mesh, boosters, trails and impact state", async t =>
{
  t.mock.method(Math, "random", () => 0.25);
  const { ship, sof, updater } = await RaceFixture();
  const next = originalDna.replace(":race:", ":other:");
  const desired = CjsSchema.from("EveShip2", await sof.BuildValuesFromDNA(next));
  const mesh = ship.mesh, boosters = ship.boosters, trails = boosters.trails, singleBoosters = boosters._singleBoosters;
  const impact = ship.impactOverlay, emitter = impact.armorImpactEmitter, locators = ship.locators;
  impact.armorRepairing = true; impact.hullDamageFactor = 0.37;
  const damageFactor = impact.hullDamageFactor;
  t.mock.method(impact, "SetDamageLocatorCount", () => assert.fail("race edit reset damage state"));
  t.mock.method(trails, "Clear", () => assert.fail("race edit reset trail history"));
  t.mock.method(sof, "BuildValuesFromDNA", () => assert.fail("race edit built a full graph"));
  t.mock.method(sof, "CreateMesh", () => assert.fail("race edit built a mesh"));
  t.mock.method(sof, "SetupBoosters", () => assert.fail("race edit regenerated hull booster placements"));
  t.mock.method(sof, "ModifyTextureResPaths", () => assert.fail("race edit queried inserts"));
  assert.ok(await updater.UpdateFromDNA(ship, next));
  assert.equal(ship.mesh, mesh); assert.equal(ship.boosters, boosters);
  assert.equal(boosters.trails, trails); assert.equal(boosters._singleBoosters, singleBoosters);
  assert.equal(ship.impactOverlay, impact); assert.equal(impact.armorImpactEmitter, emitter);
  assert.equal(ship.locators, locators); assert.equal(impact.armorRepairing, true);
  assert.equal(impact.hullDamageFactor, damageFactor);
  assert.deepEqual(CjsSchema.getValues(mesh), CjsSchema.getValues(desired.mesh));
  assert.deepEqual(CjsSchema.getValues(boosters), CjsSchema.getValues(desired.boosters));
  assert.deepEqual(CjsSchema.getValues(impact.armorDamageShader), CjsSchema.getValues(desired.impactOverlay.armorDamageShader));
  assert.deepEqual(CjsSchema.getValues(impact.mesh), CjsSchema.getValues(desired.impactOverlay.mesh));
  assert.equal(ship.dna, next);
});

test("race edits preserve unrelated live mesh constants and hull placements", async t =>
{
  const { ship, sof, updater } = await RaceFixture(options =>
  {
    options.black.generic.areaShaders[0].defaultParameters.push({ name: "CustomColor", value: [1, 1, 1, 1] });
  });
  const constant = ship.mesh.opaqueAreas[0].effect.constParameters.find(value => value.name === "CustomColor");
  constant.value.set([7, 8, 9, 10]);
  ship.boosters._singleBoosters[0].transform[12] = 42;
  ship.locators[0].transform[12] = 42;
  const placement = CjsSchema.getValues(ship.boosters._singleBoosters[0]);
  const locator = CjsSchema.getValues(ship.locators[0]);
  t.mock.method(sof, "SetupBoosters", () => assert.fail("race edit regenerated hull placements"));
  assert.ok(await updater.UpdateFromDNA(ship, originalDna.replace(":race:", ":other:")));
  assert.deepEqual(Array.from(constant.value), [7, 8, 9, 10]);
  assert.deepEqual(CjsSchema.getValues(ship.boosters._singleBoosters[0]), placement);
  assert.deepEqual(CjsSchema.getValues(ship.locators[0]), locator);
});

for (const unsupported of ["offset", "damage-bindings", "combined"])
{
  test(`unsupported race ${unsupported} edit falls back without partial writes`, async () =>
  {
    const { ship, updater } = await RaceFixture(options =>
    {
      if (unsupported === "offset") options.black.race[1].booster.lightOffset = 2;
      if (unsupported === "damage-bindings") options.black.race[1].damage.shieldImpactTextures.push({ name: "Extra", resFilePath: "res:/extra.dds" });
    });
    const before = CjsSchema.getValues(ship), requests = resources.requests.length;
    let next = originalDna.replace(":race:", ":other:");
    if (unsupported === "combined") next = next.replace("respathinsert?none", "respathinsert?insert");
    assert.equal(await updater.UpdateFromDNA(ship, next), null);
    assert.deepEqual(CjsSchema.getValues(ship), before);
    assert.equal(resources.requests.length, requests);
  });
}

test("race changes honor selection cancellation before writes", async () =>
{
  const { ship, updater } = await RaceFixture();
  const before = CjsSchema.getValues(ship);
  let checks = 0;
  assert.equal(await updater.UpdateFromDNA(ship, originalDna.replace(":race:", ":other:"), {}, () => ++checks < 3), false);
  assert.deepEqual(CjsSchema.getValues(ship), before);
});

test("material constants match by unique name without reordering live records", async t =>
{
  const { ship, updater, sof } = await PatternFixture();
  const effect = ship.mesh.opaqueAreas[0].effect, list = effect.constParameters;
  list.reverse();
  const records = list.slice(), vectors = list.map(value => value.value);
  const dna = ship.dna.replace("pattern?one;red;blue", "pattern?one;blue;red");
  const expected = await sof.BuildValuesFromDNA(dna);
  const values = new Map(expected.mesh.opaqueAreas[0].effect.constParameters.map(value => [value.name, value.value.map(Math.fround)]));
  t.mock.method(sof, "BuildValuesFromDNA", () => assert.fail("pattern material edit must not build a graph"));
  assert.ok(await updater.UpdateFromDNA(ship, dna));
  assert.equal(effect.constParameters, list);
  records.forEach((record, index) =>
  {
    assert.equal(list[index], record); assert.equal(record.value, vectors[index]);
    assert.deepEqual(Array.from(record.value), values.get(record.name));
  });
  assert.equal(await updater.UpdateFromDNA(ship, dna), false);
});

test("an inherited pattern and an explicit empty pattern are different selections", async () =>
{
  const { sof, updater } = await PatternFixture();
  const inherited = await sof.CreateDna(originalDna);
  const disabled = await sof.CreateDna(originalDna + ":pattern?;red;blue");
  assert.equal(updater._CanUpdateMesh(inherited, disabled), false);
  assert.equal(updater._CanUpdateMesh(disabled, await sof.CreateDna(originalDna + ":pattern?;blue;red")), true);
});

for (const depthShader of [false, true])
{
  test(`targeted material constants match folded/blocked/depth areas (depth shader: ${depthShader})`, async t =>
  {
    const { ship, updater, sof } = await MaterialFixture(options =>
    {
      const hull = options.black.hull[0], source = hull.opaqueAreas[0];
      hull.decalAreas = [{ ...structuredClone(source), name: "cutout", index: 1, blockedMaterials: 1 }];
      hull.transparentAreas = [{ ...structuredClone(source), name: "glass", index: 2 }];
      options.black.generic.areaShaders[0].doGenerateDepthArea = true;
      if (depthShader) options.black.generic.areaShaders.push({ shader: "depthonlyv5.fx", parameters: [],
        defaultParameters: [], defaultTextures: [], transparencyTextureName: "DiffuseMap" });
    });
    const nextDna = ship.dna.replace("material?red;none", "material?blue;none");
    const desired = await sof.BuildValuesFromDNA(nextDna);
    const expected = CjsSchema.getValues(CjsSchema.from(desired._type, desired));
    t.mock.method(sof, "BuildValuesFromDNA", () => assert.fail("targeted material edit built a whole graph"));
    t.mock.method(sof, "CreateMesh", () => assert.fail("targeted material edit built a mesh"));
    t.mock.method(sof, "ModifyTextureResPaths", () => assert.fail("material edit queried texture existence"));
    const mesh = ship.mesh, maskList = ship.customMasks, texture = mesh.opaqueAreas[0].effect.resources[0];
    const calls = t.mock.method(texture, "OnModified");
    assert.ok(await updater.UpdateFromDNA(ship, nextDna));
    assert.equal(ship.mesh, mesh); assert.equal(ship.customMasks, maskList);
    assert.equal(calls.mock.callCount(), 0);
    assert.deepEqual(CjsSchema.getValues(ship), expected);
  });
}

test("targeted pattern materials avoid full builds and projection/texture queries", async t =>
{
  const { ship, updater, sof } = await PatternFixture();
  const nextDna = ship.dna.replace("pattern?one;red;blue", "pattern?one;blue;red");
  const expected = CjsSchema.getValues(CjsSchema.from("EveShip2", await sof.BuildValuesFromDNA(nextDna)));
  t.mock.method(sof, "BuildValuesFromDNA", () => assert.fail("full build"));
  t.mock.method(sof, "ModifyTextureResPaths", () => assert.fail("texture query"));
  t.mock.method(EveSOFDNA.prototype, "GetPatternProjectionData", () => assert.fail("projection calculation"));
  assert.ok(await updater.UpdateFromDNA(ship, nextDna));
  assert.deepEqual(CjsSchema.getValues(ship), expected);
});

test("targeted respaths query only existence, using current authored paths", async t =>
{
  const { ship, updater, sof } = await MaterialFixture();
  const nextDna = ship.dna.replace("respathinsert?none", "respathinsert?insert");
  // The request must read current data instead of rewriting the live old path.
  sof.dataMgr.GetHullData("hull").opaqueAreas[0].textures.get("DiffuseMap").resFilePath = "res:/updated_d.dds";
  const asked = [];
  await sof.Register({ resources: {
    exists: async path => { asked.push(path); return path.includes("updated_insert"); },
    getObject: () => assert.fail("respath edit acquired an unrelated object")
  } });
  t.mock.method(sof, "BuildValuesFromDNA", () => assert.fail("full build"));
  t.mock.method(sof, "CreateMesh", () => assert.fail("mesh build"));
  t.mock.method(EveSOFDNA.prototype, "GetMeshAreaParameter", () => assert.fail("respath edit calculated materials"));
  const effect = ship.mesh.opaqueAreas[0].effect, beforeConstants = effect.constParameters;
  assert.ok(await updater.UpdateFromDNA(ship, nextDna));
  assert.equal(effect.resources.find(value => value.name === "DiffuseMap").resourcePath, "res:/insert/updated_insert_d.dds");
  assert.equal(effect.constParameters, beforeConstants);
  assert.deepEqual(asked.sort(), ["res:/insert/ship_insert_n.dds", "res:/insert/updated_insert_d.dds"]);
});

test("targeted preflight rejects a late area mismatch before changing earlier constants", async () =>
{
  const { ship, updater } = await MaterialFixture(options =>
  {
    const areas = options.black.hull[0].opaqueAreas;
    areas.push({ ...structuredClone(areas[0]), name: "second", index: 1 });
  });
  ship.mesh.opaqueAreas[1].count = 999;
  const before = CjsSchema.getValues(ship);
  assert.equal(await updater.UpdateFromDNA(ship, ship.dna.replace("material?red;none", "material?blue;none")), null);
  assert.deepEqual(CjsSchema.getValues(ship), before);
});

test("targeted respath revalidates targets after asynchronous existence checks", async t =>
{
  const { ship, updater, sof } = await Fixture();
  const query = sof.ModifyTextureResPaths.bind(sof);
  let entered, release;
  const started = new Promise(resolve => { entered = resolve; });
  const waiting = new Promise(resolve => { release = resolve; });
  t.mock.method(sof, "ModifyTextureResPaths", async (...args) => { entered(); await waiting; return query(...args); });
  const pending = updater.UpdateFromDNA(ship, insertedDna);
  await started;
  ship.mesh.opaqueAreas[0].name = "user edit";
  const before = CjsSchema.getValues(ship);
  release();
  assert.equal(await pending, null);
  assert.deepEqual(CjsSchema.getValues(ship), before);
});

test("material updates retain externally supplied banner textures without reloads", async t =>
{
  const { ship, updater } = await MaterialFixture(options =>
  {
    options.black.hull[0].banners = [{ usage: 3, visibilityGroup: "primary" }];
    options.black.faction[0].visibilityGroupSet = { visibilityGroups: [{ str: "primary" }] };
    options.black.generic.bannerShader = { shader: "res:/banner.fx", defaultParameters: [], defaultTextures: [] };
  });
  assert.equal(ship.externalParameters.length, 1);
  const binding = ship.externalParameters[0], texture = binding.destinationObject;
  binding.SetValue("res:/host/banner.png");
  const notify = t.mock.method(texture, "OnModified");
  const requests = resources.requests.length;
  assert.ok(await updater.UpdateFromDNA(ship, ship.dna.replace("material?red;none", "material?blue;none")));
  assert.equal(binding.destinationObject, texture);
  assert.equal(texture.resourcePath, "res:/host/banner.png");
  assert.equal(notify.mock.callCount(), 0);
  assert.equal(resources.requests.length, requests);
  assert.equal(await updater.UpdateFromDNA(ship, ship.dna), false);
  assert.equal(notify.mock.callCount(), 0);
});

for (const reason of ["selection", "abort", "disposed", "removed"])
{
  test(`editor ${reason} while material data loads prevents all live writes`, async t =>
  {
    const { ship, updater, sof } = await MaterialFixture();
    const dna = ship.dna, snapshot = CjsSchema.getValues(ship);
    const scene = { objects: [ship] }, controller = new AbortController();
    let release, started, current = true, disposed = false;
    const waiting = new Promise(resolve => { release = resolve; });
    const entered = new Promise(resolve => { started = resolve; });
    const build = sof.CreateDna.bind(sof);
    t.mock.method(sof, "CreateDna", async (...args) =>
    {
      started(); await waiting; return build(...args);
    });
    const pending = updater.UpdateFromDNA(ship, dna.replace("material?red;none", "material?blue;none"), {}, () =>
    {
      controller.signal.throwIfAborted();
      return current && !disposed && scene.objects.includes(ship);
    });
    await entered;
    if (reason === "selection") current = false;
    if (reason === "abort") controller.abort();
    if (reason === "disposed") disposed = true;
    if (reason === "removed") scene.objects.length = 0;
    release();
    if (reason === "abort") await assert.rejects(pending, /aborted/);
    else assert.equal(await pending, false);
    assert.equal(ship.dna, dna);
    assert.deepEqual(CjsSchema.getValues(ship), snapshot);
  });
}

/** Material fixture with two independently changeable constants and a fallback. */
async function MaterialFixture(configure = null, suffix = "")
{
  return Fixture(options =>
  {
    options.black.generic.materialPrefixes = [{ str: "Mtl1" }, { str: "Mtl2" }];
    const shader = options.black.generic.areaShaders[0];
    shader.parameters = [{ str: "Mtl1Diffuse" }, { str: "Mtl1Fresnel" }];
    shader.defaultParameters = [{ name: "Mtl1Diffuse", value: [0.1, 0.2, 0.3, 1] },
      { name: "Mtl1Fresnel", value: [0.1, 0.1, 0.1, 1] }];
    options.black.material = [
      { name: "red", parameters: [{ name: "Diffuse", value: [1, 0.2, 0.1, 1] }, { name: "Fresnel", value: [0.3, 0.3, 0.3, 1] }] },
      { name: "blue", parameters: [{ name: "Diffuse", value: [0.1, 0.2, 2, 1] }, { name: "Fresnel", value: [0.6, 0.6, 0.6, 1] }] }
    ];
    if (configure) configure(options);
  }, originalDna + ":material?red;none" + suffix);
}

/** Two same-shape patterns with different textures, addressing and projections. */
async function PatternFixture(configure = null)
{
  return MaterialFixture(options =>
  {
    options.black.generic.patternMaterialPrefixes = [{ str: "Pmtl1" }, { str: "Pmtl2" }];
    const shader = options.black.generic.areaShaders[0];
    shader.parameters.push({ str: "Pmtl1Diffuse" }, { str: "Pmtl2Diffuse" });
    shader.defaultParameters.push({ name: "Pmtl1Diffuse", value: [0, 0, 0, 1] }, { name: "Pmtl2Diffuse", value: [0, 0, 0, 1] });
    options.black.pattern = ["one", "two"].map((name, index) => ({
      name, sof6: false,
      layer1: { materialSource: index, textureName: "PatternMask", textureResFilePath: `res:/${name}.dds`,
        projectionTypeU: index, projectionTypeV: index + 1, isTargetMtl1: !index, isTargetMtl2: !!index,
        isTargetMtl3: false, isTargetMtl4: true },
      layer2: null,
      projections: [{ name: "hull", transformLayer1: { position: [index, 2, 3], scaling: [index + 1, 2, 1],
        rotation: [0, 0, 0, 1], isMirrored: !!index }, transformLayer2: null }], applicationGroups: []
    }));
    options.black.pattern.push({ name: "empty", layer1: null, layer2: null, projections: [], applicationGroups: [] });
    if (configure) configure(options);
  }, ":pattern?one;red;blue");
}

/** Small authored catalog built and hydrated through the real public entry points. */
async function Fixture(configure = null, dna = originalDna)
{
  const options = {
    black: {
      hull: [{ name: "hull", buildClass: 0, geometryResFilePath: "res:/hull.gr2", opaqueAreas: [{
        name: "hull", index: 0, count: 1, areaType: 0, shader: "ship.fx",
        textures: [{ name: "DiffuseMap", resFilePath: "res:/ship_d.dds" },
          { name: "NormalMap", resFilePath: "res:/ship_n.dds" }], parameters: []
      }] }],
      faction: [{ name: "faction", resPathInsert: "insert" }], race: [{ name: "race" }],
      material: [], pattern: [], layout: [], generic: { materialPrefixes: [],
        areaShaderLocation: "res:/effect", areaShaders: [{ shader: "ship.fx", parameters: [],
          defaultParameters: [], defaultTextures: [], doGenerateDepthArea: false, transparencyTextureName: "" }] }
    },
    resFileIndex: ["res:/insert/ship_insert_d.dds"]
  };
  if (configure) configure(options);
  const sof = await EveSOF.Create(options);
  await sof.Register({ editorMode: options.editorMode === true });
  const before = await sof.BuildValuesFromDNA(dna);
  const ship = CjsSchema.from(before._type, before);
  const updater = new CjsSOFUpdater(sof);
  return { sof, ship, updater };
}

test("insert changes match a fresh build, preserve identities and notify only the changed texture", async t =>
{
  const { sof, ship, updater } = await Fixture();
  const mesh = ship.mesh, areas = mesh.opaqueAreas, area = areas[0], effect = area.effect;
  const slots = effect.resources, textures = slots.slice();
  const calls = [];
  const original = TriTextureParameter.prototype.OnModified;
  t.mock.method(TriTextureParameter.prototype, "OnModified", function(member)
  {
    calls.push([this, member]);
    return original.call(this, member);
  });
  const changes = await updater.UpdateFromDNA(ship, insertedDna);
  assert.ok(Array.isArray(changes));
  assert.equal(ship.mesh, mesh);
  assert.equal(mesh.opaqueAreas, areas);
  assert.equal(areas[0], area);
  assert.equal(area.effect, effect);
  assert.equal(effect.resources, slots);
  textures.forEach((texture, index) => assert.equal(slots[index], texture));
  assert.deepEqual(calls, [[textures.find(texture => texture.name === "DiffuseMap"), "resourcePath"]]);
  assert.equal(ship.dna, insertedDna);
  const desired = await sof.BuildValuesFromDNA(insertedDna);
  const rebuilt = CjsSchema.from(desired._type, desired);
  assert.deepEqual(CjsSchema.getValues(ship), CjsSchema.getValues(rebuilt));
  const requestCount = resources.requests.length;
  assert.equal(await updater.UpdateFromDNA(ship, insertedDna), false);
  assert.equal(resources.requests.length, requestCount);
});

test("live transform state survives a texture-only update", async () =>
{
  const { ship, updater } = await Fixture();
  ship.worldTransform[12] = 123;
  const transform = ship.worldTransform;
  assert.ok(await updater.UpdateFromDNA(ship, insertedDna));
  assert.equal(ship.worldTransform, transform);
  assert.equal(ship.worldTransform[12], 123);
});

test("generated booster glows survive an insert edit without relaxing ordinary sprite topology", async t =>
{
  t.mock.method(Math, "random", () => 0.25);
  const { ship, updater, sof } = await Fixture(options =>
  {
    options.black.hull[0].booster = { hasTrails: false, items: [{
      transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
    }] };
    options.black.race[0].booster = {};
  });
  const glows = ship.boosters.glows;
  const sprites = glows.sprites.slice();
  assert.ok(sprites.length > 0, "Initialize generates the glow sprites");
  assert.ok(await updater.UpdateFromDNA(ship, insertedDna));
  assert.equal(ship.boosters.glows, glows);
  sprites.forEach((sprite, index) => assert.equal(glows.sprites[index], sprite));
  const desired = await sof.BuildValuesFromDNA(insertedDna);
  assert.deepEqual(CjsSchema.getValues(ship), CjsSchema.getValues(CjsSchema.from(desired._type, desired)));
  assert.equal(updater._CollectChanges(glows, { _type: "EveSpriteSet", sprites: [] },
    new Map(), new WeakMap(), new WeakMap(), []), false);
});

for (const mismatch of ["name", "length", "type"])
{
  test(`a late ${mismatch} mismatch falls back without changing earlier textures`, async t =>
  {
    const { ship, updater } = await Fixture();
    t.mock.method(updater, "_CanUpdateMesh", () => false); // Full-graph topology preflight.
    const slots = ship.mesh.opaqueAreas[0].effect.resources;
    const first = slots[0], oldPath = first.resourcePath;
    if (mismatch === "name") slots[1].name = "edited";
    if (mismatch === "length") slots.push(new TriTextureParameter());
    if (mismatch === "type") slots[1] = new EveShip2();
    const requestCount = resources.requests.length;
    assert.equal(await updater.UpdateFromDNA(ship, insertedDna), null);
    assert.equal(first.resourcePath, oldPath);
    assert.equal(ship.dna, originalDna);
    assert.equal(resources.requests.length, requestCount);
  });
}

test("equivalent faction defaults update provenance without resource reloads; unrelated edits rebuild", async () =>
{
  const { ship, updater, sof } = await Fixture();
  await updater.UpdateFromDNA(ship, insertedDna);
  const requests = resources.requests.length;
  assert.ok(await updater.UpdateFromDNA(ship, "hull:faction:race"));
  assert.ok(await updater.UpdateFromDNA(ship, "HULL:FACTION:RACE:RESPATHINSERT?INSERT"));
  assert.equal(resources.requests.length, requests);
  assert.equal(await updater.UpdateFromDNA(ship, insertedDna + ":class?stationary"), null);
  assert.equal(await updater.UpdateFromDNA(ship, "bad:dna"), null);
  const before = resources.requests.length;
  assert.ok(await updater.UpdateFromDNA(ship, "hull:faction:race:respathinsert?missing"));
  assert.equal(ship.mesh.opaqueAreas[0].effect.resources[0].resourcePath, "res:/ship_d.dds");
  assert.ok(resources.requests.length > before);
  assert.ok(sof);
});

test("an older async texture query cannot overwrite a newer request", async t =>
{
  const { ship, updater, sof } = await Fixture();
  const build = sof.ModifyTextureResPaths.bind(sof);
  let release, started;
  const waiting = new Promise(resolve => { release = resolve; });
  const entered = new Promise(resolve => { started = resolve; });
  let builds = 0;
  t.mock.method(sof, "ModifyTextureResPaths", async (...args) =>
  {
    if (++builds === 1) { started(); await waiting; }
    return build(...args);
  });
  const pending = updater.UpdateFromDNA(ship, insertedDna);
  await entered;
  assert.equal(await updater.UpdateFromDNA(ship, originalDna), false);
  release();
  assert.equal(await pending, false);
  assert.equal(ship.dna, originalDna);
});

test("reordered duplicate commands cannot disguise a non-insert change", async () =>
{
  const { ship, updater } = await Fixture();
  ship.dna = originalDna + ":class?stationary:class?ship";
  const requests = resources.requests.length;
  assert.equal(await updater.UpdateFromDNA(ship, insertedDna + ":class?ship:class?stationary"), null);
  assert.equal(ship.dna, originalDna + ":class?stationary:class?ship");
  assert.equal(resources.requests.length, requests);
});

test("a rejected texture query makes no partial changes", async t =>
{
  const { ship, updater, sof } = await Fixture();
  const before = CjsSchema.getValues(ship);
  t.mock.method(sof, "ModifyTextureResPaths", async () => { throw new Error("failed resource acquisition"); });
  await assert.rejects(updater.UpdateFromDNA(ship, insertedDna), /failed resource acquisition/);
  assert.deepEqual(CjsSchema.getValues(ship), before);
});

test("shared values references notify the existing texture only once", async t =>
{
  const { ship, updater, sof } = await Fixture();
  const desired = await sof.BuildValuesFromDNA(insertedDna);
  const incoming = desired.mesh.opaqueAreas[0].effect.resources;
  incoming[0]._id = "shared-map";
  incoming[1] = { _ref: "shared-map" };
  const live = ship.mesh.opaqueAreas[0].effect.resources;
  live[1] = live[0];
  t.mock.method(updater, "_CanUpdateMesh", () => false); // Exercise the full-graph fallback comparator.
  t.mock.method(sof, "BuildValuesFromDNA", async () => desired);
  const notify = t.mock.method(live[0], "OnModified");
  assert.ok(await updater.UpdateFromDNA(ship, insertedDna));
  assert.equal(live[0], live[1]);
  assert.equal(notify.mock.callCount(), 1);
});

test("unresolved values references fall back before writes", async t =>
{
  const { ship, updater, sof } = await Fixture();
  const desired = await sof.BuildValuesFromDNA(insertedDna);
  desired.mesh.opaqueAreas[0].effect.resources[1] = { _ref: "missing" };
  t.mock.method(updater, "_CanUpdateMesh", () => false); // Exercise the full-graph fallback comparator.
  t.mock.method(sof, "BuildValuesFromDNA", async () => desired);
  const before = CjsSchema.getValues(ship);
  assert.equal(await updater.UpdateFromDNA(ship, insertedDna), null);
  assert.deepEqual(CjsSchema.getValues(ship), before);
});

for (const forward of [false, true]) test(`shader option ${forward ? "forward" : "backward"} references match distinct packed slots`, async t =>
{
  const { ship, updater, sof } = await Fixture();
  const desired = await sof.BuildValuesFromDNA(insertedDna);
  const anchor = { _type: "Tr2ShaderOption", _id: "option", name: "SPACE_OBJECT_TRANSPARENCY", value: "OPAQUE" };
  const options = forward ? [{ _ref: "option" }, anchor] : [anchor, { _ref: "option" }];
  const effect = ship.mesh.opaqueAreas[0].effect;
  CjsSchema.setValues(effect, { options });
  const slots = effect.options.slice(), list = effect.options;
  assert.notEqual(slots[0], slots[1]);
  desired.mesh.opaqueAreas[0].effect.options = options;
  t.mock.method(updater, "_CanUpdateMesh", () => false); // Exercise the full-graph fallback comparator.
  t.mock.method(sof, "BuildValuesFromDNA", async () => desired);
  assert.ok(await updater.UpdateFromDNA(ship, insertedDna));
  assert.equal(effect.options, list);
  assert.equal(effect.options[0], slots[0]);
  assert.equal(effect.options[1], slots[1]);
  assert.deepEqual(slots.map(value => [value.name, value.value]), [
    ["SPACE_OBJECT_TRANSPARENCY", "OPAQUE"], ["SPACE_OBJECT_TRANSPARENCY", "OPAQUE"]
  ]);
});

test("ordinary object references still require shared identity", async t =>
{
  const { ship, updater, sof } = await Fixture();
  const desired = await sof.BuildValuesFromDNA(insertedDna);
  const incoming = desired.mesh.opaqueAreas[0].effect.resources;
  incoming[0]._id = "shared-map";
  incoming[1] = { _ref: "shared-map" };
  const live = ship.mesh.opaqueAreas[0].effect.resources;
  live[1] = CjsSchema.from("TriTextureParameter", CjsSchema.getValues(live[0]));
  assert.notEqual(live[0], live[1]);
  t.mock.method(updater, "_CanUpdateMesh", () => false); // Exercise the full-graph fallback comparator.
  t.mock.method(sof, "BuildValuesFromDNA", async () => desired);
  const before = CjsSchema.getValues(ship);
  assert.equal(await updater.UpdateFromDNA(ship, insertedDna), null);
  assert.deepEqual(CjsSchema.getValues(ship), before);
});

test("decal parent textures and editor DNA provenance update without replacing the decal", async t =>
{
  const { ship, updater, sof } = await Fixture(options =>
  {
    options.editorMode = true;
    options.black.faction[0].visibilityGroupSet = { visibilityGroups: [{ str: "primary" }] };
    options.black.hull[0].decalSets = [{ visibilityGroup: "primary", items: [{
      name: "decal", usage: 0, meshIndex: 0, boneIndex: -1,
      position: [0, 0, 0], rotation: [0, 0, 0, 1], scaling: [1, 1, 1],
      parameters: [], textures: [], indexBuffers: [{ indexBuffer: new Uint32Array([0, 1, 2]) }]
    }] }];
    options.black.generic.decalShaderLocation = "res:/decal";
    options.black.generic.decalShaders = [{ shader: "decalv5.fx", parameters: [],
      defaultTextures: [], parentTextures: [{ str: "DiffuseMap" }] }];
  });
  assert.equal(ship.decals.length, 1);
  const decal = ship.decals[0], effect = decal.decalEffect;
  const texture = effect.resources.find(value => value.name === "DiffuseMap");
  assert.ok(texture);
  const sourceId = decal.__bluemetadata__.sof_source_id;
  assert.ok(await updater.UpdateFromDNA(ship, insertedDna));
  assert.equal(ship.decals[0], decal);
  assert.equal(decal.decalEffect, effect);
  assert.equal(texture.resourcePath, "res:/insert/ship_insert_d.dds");
  assert.equal(decal.__bluemetadata__.sof_source_id, sourceId);
  assert.equal(decal.__bluemetadata__.SofDna, insertedDna);
  const desired = await sof.BuildValuesFromDNA(insertedDna);
  assert.deepEqual(CjsSchema.getValues(ship), CjsSchema.getValues(CjsSchema.from(desired._type, desired)));
});

test("targeted inserts reject reordered stamped decals before writing any textures", async () =>
{
  const { ship, updater } = await Fixture(options =>
  {
    options.editorMode = true;
    const hull = options.black.hull[0];
    hull.opaqueAreas.push({ ...structuredClone(hull.opaqueAreas[0]), name: "second", index: 1,
      textures: [{ name: "DiffuseMap", resFilePath: "res:/other_d.dds" }] });
    options.black.faction[0].visibilityGroupSet = { visibilityGroups: [{ str: "primary" }] };
    hull.decalSets = [{ visibilityGroup: "primary", items: [0, 1].map(meshIndex => ({
      name: `decal${meshIndex}`, usage: 0, meshIndex, boneIndex: -1,
      position: [meshIndex, 0, 0], rotation: [0, 0, 0, 1], scaling: [1, 1, 1],
      parameters: [], textures: [], indexBuffers: [{ indexBuffer: new Uint32Array([0, 1, 2]) }]
    })) }];
    options.black.generic.decalShaderLocation = "res:/decal";
    options.black.generic.decalShaders = [{ shader: "decalv5.fx", parameters: [],
      defaultTextures: [], parentTextures: [{ str: "DiffuseMap" }] }];
  });
  assert.equal(ship.decals.length, 2);
  assert.notEqual(ship.decals[0].__bluemetadata__.sof_source_id, ship.decals[1].__bluemetadata__.sof_source_id);
  ship.decals.reverse();
  const before = CjsSchema.getValues(ship);
  assert.equal(await updater.UpdateFromDNA(ship, insertedDna), null);
  assert.deepEqual(CjsSchema.getValues(ship), before);
});

for (const mode of ["ordinary", "instanced", "shared"])
{
  test(`${mode} layout children retain their identities and match a fresh build`, async () =>
  {
    const { ship, updater, sof } = await Fixture(options =>
    {
      options.editorMode = true;
      const hull = options.black.hull[0];
      options.black.hull.push({ ...structuredClone(hull), name: "extension", buildClass: 1 });
      hull.locatorSets = [{ name: "slot", locators: [{ position: [1, 2, 3],
        rotation: [0, 0, 0, 1], scaling: [1, 1, 1], boneIndex: -1 }] }];
      options.black.layout = [{ name: "test", seed: 7, placements: [{ name: "slot",
        locatorSetName: "slot", descriptor: { hull: "extension" },
        isInstanced: mode !== "ordinary", isShared: mode === "shared" }] }];
    }, originalDna + ":layout?test");
    const children = ship.effectChildren.slice();
    assert.ok(children.length);
    const targetDna = insertedDna + ":layout?test";
    assert.ok(await updater.UpdateFromDNA(ship, targetDna));
    children.forEach((child, index) => assert.equal(ship.effectChildren[index], child));
    const desired = await sof.BuildValuesFromDNA(targetDna);
    assert.deepEqual(CjsSchema.getValues(ship), CjsSchema.getValues(CjsSchema.from(desired._type, desired)));
  });
}

for (const command of ["material", "mesh"]) test(`${command} edits refresh only their effect and preserve packed constants`, async t =>
{
  const { ship, updater, sof } = await MaterialFixture();
  const second = CjsSchema.from("EveShip2", await sof.BuildValuesFromDNA(ship.dna));
  const secondBefore = CjsSchema.getValues(second);
  const effect = ship.mesh.opaqueAreas[0].effect, list = effect.constParameters;
  const records = list.slice(), vectors = list.map(record => record.value);
  const rebuild = t.mock.method(effect, "RebuildCachedDataInternal");
  const requestCount = resources.requests.length;
  const nextDna = originalDna + `:${command}?blue;none`;
  const desired = await sof.BuildValuesFromDNA(nextDna);
  const rebuilt = CjsSchema.from(desired._type, desired);
  assert.ok(await updater.UpdateFromDNA(ship, nextDna));
  assert.equal(rebuild.mock.callCount(), 1);
  assert.equal(effect.constParameters, list);
  records.forEach((record, index) =>
  {
    assert.equal(list[index], record);
    assert.equal(list[index].value, vectors[index]);
  });
  assert.deepEqual(CjsSchema.getValues(ship), CjsSchema.getValues(rebuilt));
  assert.deepEqual(CjsSchema.getValues(second), secondBefore);
  // Fresh comparison construction acquires its own resources; replay must not.
  const requests = resources.requests.length;
  assert.equal(await updater.UpdateFromDNA(ship, nextDna), false);
  assert.equal(rebuild.mock.callCount(), 1);
  assert.equal(resources.requests.length, requests);
  assert.ok(requests >= requestCount);
  const defaults = originalDna + ":material?none;none";
  assert.ok(await updater.UpdateFromDNA(ship, defaults));
  assert.equal(rebuild.mock.callCount(), 2);
  assert.equal(await updater.UpdateFromDNA(ship, defaults), false, "float32 defaults are stable on replay");
});

test("material DNA edits use current catalog values and preflight late topology mismatches", async t =>
{
  const { ship, updater, sof } = await MaterialFixture();
  const nextDna = originalDna + ":material?blue;none";
  const material = sof.dataMgr.GetMaterialData("blue");
  material.parameters.get("Diffuse")[2] = 7;
  assert.ok(await updater.UpdateFromDNA(ship, nextDna));
  assert.equal(ship.mesh.opaqueAreas[0].effect.constParameters[0].value[2], 7);
  const desired = await sof.BuildValuesFromDNA(originalDna + ":material?red;none");
  desired.mesh.opaqueAreas[0].effect.constParameters[1].name = "unexpected";
  t.mock.method(updater, "_CanUpdateMesh", () => false); // Exercise the full-graph fallback comparator.
  t.mock.method(sof, "BuildValuesFromDNA", async () => desired);
  const before = CjsSchema.getValues(ship), effect = ship.mesh.opaqueAreas[0].effect;
  const rebuild = t.mock.method(effect, "RebuildCachedDataInternal");
  assert.equal(await updater.UpdateFromDNA(ship, originalDna + ":material?red;none"), null);
  assert.equal(rebuild.mock.callCount(), 0);
  assert.deepEqual(CjsSchema.getValues(ship), before);
});

test("a changed faction default cannot disguise a requested insert as a no-op", async () =>
{
  const { ship, updater, sof } = await Fixture(null, "hull:faction:race");
  const texture = ship.mesh.opaqueAreas[0].effect.resources[0];
  assert.equal(texture.resourcePath, "res:/insert/ship_insert_d.dds");
  sof.dataMgr.GetFactionData("faction").resPathInsert = "none";
  assert.ok(await updater.UpdateFromDNA(ship, originalDna));
  assert.equal(texture.resourcePath, "res:/ship_d.dds");
});

test("pattern swaps update textures, wraps, masks and materials without replacing their storage", async t =>
{
  const { ship, updater, sof } = await PatternFixture();
  const effect = ship.mesh.opaqueAreas[0].effect;
  assert.equal(ship.customMasks.length, 1);
  const masks = ship.customMasks, mask = masks[0], position = mask.position, targets = mask.targetMaterials;
  const samplers = effect.samplerOverrides, sampler = samplers[0], constants = effect.constParameters;
  const textures = effect.resources, patternTexture = textures.find(value => value.name === "PatternMask");
  const nextDna = originalDna + ":material?red;none:pattern?two;blue;red";
  const desired = await sof.BuildValuesFromDNA(nextDna), rebuilt = CjsSchema.from(desired._type, desired);
  t.mock.method(sof, "BuildValuesFromDNA", () => assert.fail("pattern edit must not build a complete graph"));
  t.mock.method(sof, "CreateMesh", () => assert.fail("pattern edit must not construct a mesh"));
  t.mock.method(sof, "SetupAttachments", () => assert.fail("pattern edit must not visit attachments"));
  const refreshes = [], rebuild = effect.RebuildCachedDataInternal;
  t.mock.method(effect, "RebuildCachedDataInternal", function(...args)
  {
    if (!this.insideStartUpdate) refreshes.push(this);
    return rebuild.apply(this, args);
  });
  const textureNotify = t.mock.method(patternTexture, "OnModified");
  ship.worldTransform[12] = 101;
  assert.ok(await updater.UpdateFromDNA(ship, nextDna));
  assert.equal(refreshes.length, 1, "constants and samplers share one owner refresh");
  assert.equal(textureNotify.mock.callCount(), 1);
  assert.equal(ship.customMasks, masks);
  assert.equal(masks[0], mask);
  assert.equal(mask.position, position);
  assert.equal(mask.targetMaterials, targets);
  assert.equal(effect.samplerOverrides, samplers);
  assert.equal(samplers[0], sampler);
  assert.equal(effect.constParameters, constants);
  assert.equal(effect.resources, textures);
  assert.equal(textures.find(value => value.name === "PatternMask"), patternTexture);
  assert.equal(ship.worldTransform[12], 101);
  const actual = CjsSchema.getValues(ship), expected = CjsSchema.getValues(rebuilt);
  expected.worldTransform[12] = 101;
  assert.deepEqual(actual, expected, "authored values match while the user's live transform stays intact");
  const requests = resources.requests.length;
  assert.equal(await updater.UpdateFromDNA(ship, nextDna), false);
  assert.equal(refreshes.length, 1);
  assert.equal(textureNotify.mock.callCount(), 1);
  assert.equal(resources.requests.length, requests);
});

test("pattern material-only edits do not reload textures or rewrite projection vectors", async t =>
{
  const { ship, updater } = await PatternFixture();
  const effect = ship.mesh.opaqueAreas[0].effect, mask = ship.customMasks[0];
  const position = mask.position, beforeMask = CjsSchema.getValues(mask);
  const notify = t.mock.method(effect.resources.find(value => value.name === "PatternMask"), "OnModified");
  const refresh = t.mock.method(effect, "RebuildCachedDataInternal");
  const requests = resources.requests.length;
  assert.ok(await updater.UpdateFromDNA(ship, originalDna + ":material?red;none:pattern?one;blue;red"));
  assert.equal(refresh.mock.callCount(), 1);
  assert.equal(notify.mock.callCount(), 0);
  assert.equal(resources.requests.length, requests);
  assert.equal(mask.position, position);
  assert.deepEqual(CjsSchema.getValues(mask), beforeMask);
});

test("changed shader options use their owner and retain a caller's open batch", async t =>
{
  const { ship, updater } = await PatternFixture();
  const effect = ship.mesh.opaqueAreas[0].effect, options = effect.options;
  const option = options.find(value => value.name === "SPACE_OBJECT_PPT_ENABLED");
  option.value = "SOPPT_DISABLED";
  const setOption = t.mock.method(effect, "SetOption");
  const end = t.mock.method(effect, "EndUpdate");
  effect.StartUpdate();
  assert.ok(await updater.UpdateFromDNA(ship, originalDna + ":material?red;none:pattern?two;blue;red"));
  assert.equal(setOption.mock.callCount(), 1);
  assert.equal(effect.options, options);
  assert.equal(options.find(value => value.name === option.name), option);
  assert.equal(option.value, "SOPPT_ENABLED");
  assert.equal(effect.insideStartUpdate, true);
  assert.equal(end.mock.callCount(), 0);
  effect.EndUpdate();
});

test("pattern layer removal retains hull storage and detaches only the removed binding", async t =>
{
  const { ship, updater, sof } = await PatternFixture();
  const mesh = ship.mesh, masks = ship.customMasks, effect = mesh.opaqueAreas[0].effect;
  const textures = effect.resources, samplers = effect.samplerOverrides;
  const removed = textures.find(value => value.name === "PatternMask");
  const detach = t.mock.method(removed, "OnRemovedFromMaterial");
  const nextDna = originalDna + ":material?blue;none:pattern?empty;blue;red";
  const expected = CjsSchema.from("EveShip2", await sof.BuildValuesFromDNA(nextDna));
  assert.ok(await updater.UpdateFromDNA(ship, nextDna));
  assert.equal(ship.mesh, mesh);
  assert.equal(ship.customMasks, masks);
  assert.equal(effect.resources, textures);
  assert.equal(effect.samplerOverrides, samplers);
  assert.equal(masks.length, 0);
  assert.equal(detach.mock.callCount(), 1);
  assert.equal(detach.mock.calls[0].arguments[0], effect);
  assert.deepEqual(CjsSchema.getValues(ship), CjsSchema.getValues(expected));
  assert.equal(await updater.UpdateFromDNA(ship, nextDna), false);
});

test("patterns grow and shrink compacted mask slots without replacing retained storage", async t =>
{
  const { ship, updater, sof } = await PatternFixture(options =>
  {
    const double = structuredClone(options.black.pattern[0]);
    double.name = "double";
    double.layer2 = { ...double.layer1, textureName: "SecondMask", textureResFilePath: "res:/second.dds", materialSource: 1 };
    double.projections[0].transformLayer2 = { ...double.projections[0].transformLayer1, position: [7, 8, 9] };
    const second = structuredClone(double);
    second.name = "second";
    second.layer1 = null;
    second.projections[0].transformLayer1 = null;
    options.black.pattern.push(double, second);
  });
  const mesh = ship.mesh, list = ship.customMasks, effect = mesh.opaqueAreas[0].effect;
  const textureList = effect.resources, samplerList = effect.samplerOverrides;
  const refreshes = [], rebuild = effect.RebuildCachedDataInternal;
  t.mock.method(effect, "RebuildCachedDataInternal", function(...args)
  {
    if (!this.insideStartUpdate) refreshes.push(this);
    return rebuild.apply(this, args);
  });
  for (const [name, count] of [["empty", 0], ["one", 1], ["double", 2], ["second", 1], ["empty", 0]])
  {
    const nextDna = originalDna + `:material?red;none:pattern?${name};red;blue`;
    const expected = CjsSchema.from("EveShip2", await sof.BuildValuesFromDNA(nextDna));
    const retained = list.slice(0, count), vectors = retained.map(mask => mask.position);
    const stableTextures = new Map(effect.resources.filter(value => expected.mesh.opaqueAreas[0].effect.resources.some(next => next.name === value.name)).map(value => [value.name, value]));
    refreshes.length = 0;
    assert.ok(await updater.UpdateFromDNA(ship, nextDna), name);
    assert.equal(ship.mesh, mesh);
    assert.equal(ship.customMasks, list);
    assert.equal(list.length, count);
    retained.forEach((mask, index) => { assert.equal(list[index], mask); assert.equal(mask.position, vectors[index]); });
    assert.equal(effect.resources, textureList);
    assert.equal(effect.samplerOverrides, samplerList);
    for (const [name, value] of stableTextures) assert.equal(effect.resources.find(texture => texture.name === name), value);
    assert.deepEqual(ComparablePatternValues(ship), ComparablePatternValues(expected));
    assert.equal(refreshes.length, 1, name);
    const requests = resources.requests.length;
    assert.equal(await updater.UpdateFromDNA(ship, nextDna), false);
    assert.equal(refreshes.length, 1);
    assert.equal(resources.requests.length, requests);
  }
});

/** Compares effect name maps without requiring a fresh builder's insertion order. */
function ComparablePatternValues(object)
{
  // A flat copy: the comparison sorts list entries by name, which a { _ref } lacks.
  const values = CjsSchema.getValues(object, {}, { refs: false });
  const visit = value =>
  {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value))
    {
      if (["resources", "textures", "lodTextureParameters", "samplerOverrides", "constParameters"].includes(key) && Array.isArray(child))
        child.sort((a, b) => a.name.localeCompare(b.name));
      visit(child);
    }
  };
  visit(values);
  return values;
}

for (const source of ["default", "hull"])
test(`removing a pattern restores the ${source} texture and removes its sampler`, async () =>
{
  const { ship, updater, sof } = await PatternFixture(options =>
  {
    const texture = { name: "PatternMask", resFilePath: `res:/${source}.dds` };
    if (source === "hull") options.black.hull[0].opaqueAreas[0].textures.push(texture);
    else options.black.generic.areaShaders[0].defaultTextures.push(texture);
  });
  const effect = ship.mesh.opaqueAreas[0].effect, texture = effect.resources.find(value => value.name === "PatternMask");
  const nextDna = originalDna + ":material?red;none:pattern?empty;red;blue";
  const expected = CjsSchema.from("EveShip2", await sof.BuildValuesFromDNA(nextDna));
  assert.ok(await updater.UpdateFromDNA(ship, nextDna));
  assert.equal(effect.resources.find(value => value.name === "PatternMask"), texture);
  assert.equal(texture.resourcePath, `res:/${source}.dds`);
  assert.equal(effect.samplerOverrides.length, 0);
  assert.deepEqual(CjsSchema.getValues(ship), CjsSchema.getValues(expected));
});

test("late unsupported topology cancels pending mask and pattern binding changes", async t =>
{
  const { ship, updater, sof } = await PatternFixture();
  const nextDna = originalDna + ":material?blue;none:pattern?empty;blue;red";
  ship.mesh.opaqueAreas[0].effect.resources[0].name = "UnrelatedReplacement";
  t.mock.method(sof, "BuildValuesFromDNA", () => assert.fail("pattern edit must not build a complete graph"));
  const before = CjsSchema.getValues(ship), requests = resources.requests.length;
  const mask = ship.customMasks[0], texture = ship.mesh.opaqueAreas[0].effect.resources[0];
  assert.equal(await updater.UpdateFromDNA(ship, nextDna), null);
  assert.deepEqual(CjsSchema.getValues(ship), before);
  assert.equal(ship.customMasks[0], mask);
  assert.equal(ship.mesh.opaqueAreas[0].effect.resources[0], texture);
  assert.equal(resources.requests.length, requests);
});

test("targeted patterns preserve unrelated live textures and acquire only their changed mask", async t =>
{
  const { ship, updater, sof } = await PatternFixture();
  const effect = ship.mesh.opaqueAreas[0].effect;
  const texture = effect.resources.find(value => value.name === "DiffuseMap");
  assert.ok(texture);
  texture.resourcePath = "res:/host-owned.dds";
  const notify = t.mock.method(texture, "OnModified");
  t.mock.method(sof, "BuildValuesFromDNA", () => assert.fail("full build"));
  t.mock.method(sof, "ModifyTextureResPaths", () => assert.fail("unchanged hull paths must not be probed"));
  assert.ok(await updater.UpdateFromDNA(ship, originalDna + ":material?red;none:pattern?two;red;blue"));
  assert.equal(texture.resourcePath, "res:/host-owned.dds");
  assert.equal(notify.mock.callCount(), 0);
});

test("PPT follows authored layers even when no projection emits a mask", async t =>
{
  const { ship, updater, sof } = await PatternFixture();
  sof.dataMgr.GetPatternData("two").oldApplicationData.get("hull").layerAndProjection[0].projection.enabled = false;
  const next = originalDna + ":material?red;none:pattern?two;red;blue";
  const expected = CjsSchema.from("EveShip2", await sof.BuildValuesFromDNA(next));
  t.mock.method(sof, "BuildValuesFromDNA", () => assert.fail("full build"));
  assert.ok(await updater.UpdateFromDNA(ship, next));
  assert.equal(ship.customMasks.length, 0);
  assert.equal(ship.mesh.opaqueAreas[0].effect.options.find(value => value.name === "SPACE_OBJECT_PPT_ENABLED").value, "SOPPT_ENABLED");
  assert.deepEqual(CjsSchema.getValues(ship), CjsSchema.getValues(expected));
});

test("targeted pattern preflight rejects conflicting shared effects before any writes", async () =>
{
  const { ship, updater } = await PatternFixture(options =>
  {
    const areas = options.black.hull[0].opaqueAreas;
    const second = structuredClone(areas[0]);
    second.name = "second"; second.index = 1;
    second.textures.push({ name: "PatternMask", resFilePath: "res:/hull-mask.dds" });
    areas.push(second);
  });
  ship.mesh.opaqueAreas[1].effect = ship.mesh.opaqueAreas[0].effect;
  // The shared effect satisfies both areas' names but their requested bindings conflict.
  const before = CjsSchema.getValues(ship);
  assert.equal(await updater.UpdateFromDNA(ship, originalDna + ":material?red;none:pattern?two;red;blue"), null);
  assert.deepEqual(CjsSchema.getValues(ship), before);
});

for (const conflict of [false, true])
{
  test(`targeted patterns preserve shared texture identity (conflicting paths: ${conflict})`, async t =>
  {
    const { ship, updater } = await PatternFixture(options =>
    {
      const areas = options.black.hull[0].opaqueAreas, second = structuredClone(areas[0]);
      second.name = "second"; second.index = 1;
      if (conflict) second.textures.push({ name: "PatternMask", resFilePath: "res:/one.dds" });
      areas.push(second);
    });
    const [first, second] = ship.mesh.opaqueAreas.map(area => area.effect);
    const texture = first.resources.find(value => value.name === "PatternMask");
    second.SetTextures({ PatternMask: null }); second.AddResource(texture);
    const before = CjsSchema.getValues(ship), notify = t.mock.method(texture, "OnModified");
    const next = originalDna + ":material?red;none:pattern?two;red;blue";
    const result = await updater.UpdateFromDNA(ship, next);
    if (conflict)
    {
      assert.equal(result, null);
      assert.deepEqual(CjsSchema.getValues(ship), before);
      assert.equal(notify.mock.callCount(), 0);
    }
    else
    {
      assert.ok(result);
      assert.equal(texture.resourcePath, "res:/two.dds");
      assert.equal(notify.mock.callCount(), 1);
      assert.equal(second.resources.find(value => value.name === "PatternMask"), texture);
    }
  });
}

test("invalid late mask topology leaves planned effects unchanged", async () =>
{
  const { ship, updater } = await PatternFixture();
  ship.customMasks.push(ship.customMasks[0]);
  const before = CjsSchema.getValues(ship), requests = resources.requests.length;
  assert.equal(await updater.UpdateFromDNA(ship, originalDna + ":material?blue;none:pattern?two;blue;red"), null);
  assert.deepEqual(CjsSchema.getValues(ship), before);
  assert.equal(resources.requests.length, requests);
});

test("combined insert and pattern changes avoid full builds and notify each texture once", async t =>
{
  const { ship, updater, sof } = await PatternFixture();
  const next = insertedDna + ":material?blue;none:pattern?two;blue;red";
  const expected = CjsSchema.from("EveShip2", await sof.BuildValuesFromDNA(next));
  t.mock.method(sof, "BuildValuesFromDNA", () => assert.fail("combined edit built a complete graph"));
  const effect = ship.mesh.opaqueAreas[0].effect, textures = effect.resources.slice();
  const expectedPaths = new Map(expected.mesh.opaqueAreas[0].effect.resources.map(texture => [texture.name, texture.resourcePath]));
  const changed = textures.map(texture => texture.resourcePath !== expectedPaths.get(texture.name));
  const notifications = textures.map(texture => t.mock.method(texture, "OnModified"));
  assert.ok(await updater.UpdateFromDNA(ship, next));
  assert.equal(ship.mesh.opaqueAreas[0].effect, effect);
  textures.forEach((texture, index) =>
  {
    assert.ok(effect.resources.includes(texture));
    assert.equal(notifications[index].mock.callCount(), changed[index] ? 1 : 0, texture.name);
  });
  assert.deepEqual(CjsSchema.getValues(ship), CjsSchema.getValues(expected));
});

test("combined edits use resolved hull texture precedence in pattern slots", async t =>
{
  const { ship, updater, sof } = await PatternFixture(options =>
  {
    options.black.hull[0].opaqueAreas[0].textures.push({ name: "PatternMask", resFilePath: "res:/mask_d.dds" });
    options.resFileIndex.push("res:/insert/mask_insert_d.dds");
  });
  const next = insertedDna + ":material?blue;none:pattern?two;blue;red";
  const expected = CjsSchema.from("EveShip2", await sof.BuildValuesFromDNA(next));
  t.mock.method(sof, "BuildValuesFromDNA", () => assert.fail("full build"));
  const texture = ship.mesh.opaqueAreas[0].effect.resources.find(value => value.name === "PatternMask");
  const notify = t.mock.method(texture, "OnModified");
  assert.ok(await updater.UpdateFromDNA(ship, next));
  assert.equal(texture.resourcePath, "res:/insert/mask_insert_d.dds");
  assert.equal(notify.mock.callCount(), 1);
  assert.deepEqual(CjsSchema.getValues(ship), CjsSchema.getValues(expected));
});

test("combined edits reject conflicting shared hull and pattern paths before writes", async t =>
{
  const { ship, updater, sof } = await PatternFixture(options =>
  {
    const areas = options.black.hull[0].opaqueAreas, second = structuredClone(areas[0]);
    second.name = "second"; second.index = 1;
    second.textures.push({ name: "PatternMask", resFilePath: "res:/one.dds" });
    options.resFileIndex.push("res:/insert/one_insert.dds");
    areas.push(second);
  });
  const [first, second] = ship.mesh.opaqueAreas.map(area => area.effect);
  const texture = first.resources.find(value => value.name === "PatternMask");
  second.SetTextures({ PatternMask: null }); second.AddResource(texture);
  const before = CjsSchema.getValues(ship), notify = t.mock.method(texture, "OnModified");
  t.mock.method(sof, "BuildValuesFromDNA", () => assert.fail("full build"));
  assert.equal(await updater.UpdateFromDNA(ship, insertedDna + ":pattern?two;blue;red"), null);
  assert.equal(notify.mock.callCount(), 0);
  assert.deepEqual(CjsSchema.getValues(ship), before);
});

test("combined edits revalidate masks after texture acquisition without partial writes", async t =>
{
  const { ship, updater, sof } = await PatternFixture();
  const query = sof.ModifyTextureResPaths.bind(sof);
  let before;
  t.mock.method(sof, "ModifyTextureResPaths", async (...args) =>
  {
    const result = await query(...args);
    ship.customMasks.push(ship.customMasks[0]);
    before = CjsSchema.getValues(ship);
    return result;
  });
  t.mock.method(sof, "BuildValuesFromDNA", () => assert.fail("full build"));
  assert.equal(await updater.UpdateFromDNA(ship, insertedDna + ":pattern?two;blue;red"), null);
  assert.deepEqual(CjsSchema.getValues(ship), before);
});

for (const agree of [false, true])
{
  test(`combined pattern and inherited decal targets share one final path (agree: ${agree})`, async t =>
  {
    const { ship, updater, sof } = await PatternFixture(options =>
    {
      const hull = options.black.hull[0], second = structuredClone(hull.opaqueAreas[0]);
      second.name = "second"; second.index = 1;
      second.textures.push({ name: "PatternMask", resFilePath: "res:/one_d.dds" });
      hull.opaqueAreas.push(second);
      options.black.pattern[0].layer1.textureResFilePath = "res:/one_d.dds";
      options.black.pattern[1].layer1.textureResFilePath = agree ? "res:/insert/one_insert_d.dds" : "res:/one_d.dds";
      options.resFileIndex.push("res:/insert/one_insert_d.dds");
      options.black.faction[0].visibilityGroupSet = { visibilityGroups: [{ str: "primary" }] };
      hull.decalSets = [{ visibilityGroup: "primary", items: [{
        name: "decal", usage: 0, meshIndex: 1, boneIndex: -1,
        position: [0, 0, 0], rotation: [0, 0, 0, 1], scaling: [1, 1, 1],
        parameters: [], textures: [], indexBuffers: [{ indexBuffer: new Uint32Array([0, 1, 2]) }]
      }] }];
      options.black.generic.decalShaderLocation = "res:/decal";
      options.black.generic.decalShaders = [{ shader: "decalv5.fx", parameters: [],
        defaultTextures: [], parentTextures: [{ str: "PatternMask" }] }];
    });
    const texture = ship.mesh.opaqueAreas[0].effect.resources.find(value => value.name === "PatternMask");
    const decalEffect = ship.decals[0].decalEffect;
    decalEffect.SetTextures({ PatternMask: null }); decalEffect.AddResource(texture);
    const before = CjsSchema.getValues(ship), notify = t.mock.method(texture, "OnModified");
    t.mock.method(sof, "BuildValuesFromDNA", () => assert.fail("full build"));
    const result = await updater.UpdateFromDNA(ship, insertedDna + ":material?blue;none:pattern?two;blue;red");
    if (agree)
    {
      assert.ok(result);
      assert.equal(texture.resourcePath, "res:/insert/one_insert_d.dds");
      assert.equal(notify.mock.callCount(), 1);
      assert.equal(decalEffect.resources.find(value => value.name === "PatternMask"), texture);
    }
    else
    {
      assert.equal(result, null);
      assert.equal(notify.mock.callCount(), 0);
      assert.deepEqual(CjsSchema.getValues(ship), before);
    }
  });
}

test("combined edits still plan patterns when a hull has no authored texture paths", async t =>
{
  const { ship, updater, sof } = await PatternFixture(options => { options.black.hull[0].opaqueAreas[0].textures = []; });
  const next = insertedDna + ":material?blue;none:pattern?two;blue;red";
  const expected = CjsSchema.from("EveShip2", await sof.BuildValuesFromDNA(next));
  t.mock.method(sof, "BuildValuesFromDNA", () => assert.fail("full build"));
  t.mock.method(sof, "ModifyTextureResPaths", () => assert.fail("empty texture query"));
  assert.ok(await updater.UpdateFromDNA(ship, next));
  assert.deepEqual(CjsSchema.getValues(ship), CjsSchema.getValues(expected));
});

test("pattern topology edits preserve an already-open effect batch", async () =>
{
  const { ship, updater } = await PatternFixture();
  const effect = ship.mesh.opaqueAreas[0].effect;
  effect.StartUpdate();
  try
  {
    assert.ok(await updater.UpdateFromDNA(ship, originalDna + ":material?red;none:pattern?empty;red;blue"));
    assert.equal(effect.insideStartUpdate, true);
    assert.equal(ship.customMasks.length, 0);
    assert.equal(effect.samplerOverrides.length, 0);
  }
  finally { effect.EndUpdate(); }
});

test("new shared pattern textures decline before writes rather than split shared identity", async t =>
{
  const { ship, updater, sof } = await PatternFixture();
  const effect = ship.mesh.opaqueAreas[0].effect;
  const nextDna = originalDna + ":material?blue;none:pattern?two;red;blue";
  const desired = await sof.BuildValuesFromDNA(nextDna);
  const area = desired.mesh.opaqueAreas[0], duplicate = structuredClone(area);
  const pattern = area.effect.resources.find(texture => texture.name === "PatternMask");
  effect.SetTextures({ PatternMask: null });
  pattern._id = "new-pattern-resource";
  duplicate.effect.resources[duplicate.effect.resources.findIndex(texture => texture.name === "PatternMask")] = { _ref: "new-pattern-resource" };
  // A second effect stands in for an owner such as a generated depth effect.
  ship.mesh.depthAreas.push(CjsSchema.from("Tr2MeshArea", { ...duplicate,
    effect: { ...duplicate.effect, resources: duplicate.effect.resources.filter(value => !Object.hasOwn(value, "_ref")) } }));
  desired.mesh.depthAreas = [duplicate];
  t.mock.method(sof, "BuildValuesFromDNA", async () => desired);
  // Exercise the full-values fallback's shared-anchor guard independently of
  // targeted eligibility; depth areas no longer force pattern edits onto it.
  t.mock.method(updater, "_CanUpdatePatterns", () => false);
  const before = CjsSchema.getValues(ship), requests = resources.requests.length;
  assert.equal(await updater.UpdateFromDNA(ship, nextDna), null);
  assert.deepEqual(CjsSchema.getValues(ship), before);
  assert.equal(resources.requests.length, requests);
});

test("pattern edits on transparent meshes retain depth areas without reading or rebuilding them", async t =>
{
  const { ship, updater, sof } = await PatternFixture(options =>
  {
    const hull = options.black.hull[0];
    hull.transparentAreas = hull.opaqueAreas; hull.opaqueAreas = [];
    options.black.generic.areaShaders[0].doGenerateDepthArea = true;
    options.black.generic.areaShaders.push({ shader: "depthonlyv5.fx", parameters: [],
      defaultParameters: [], defaultTextures: [], transparencyTextureName: "DiffuseMap" });
  });
  const depth = ship.mesh.depthAreas, beforeDepth = CjsSchema.getValues(depth[0]);
  const visible = ship.mesh.transparentAreas[0].effect;
  const build = sof.BuildValuesFromDNA.bind(sof);
  t.mock.method(sof, "BuildValuesFromDNA", () => assert.fail("pattern edit built a complete graph"));
  t.mock.method(sof, "ModifyTextureResPaths", () => assert.fail("pattern edit queried inserted textures"));
  const descriptor = Object.getOwnPropertyDescriptor(ship.mesh, "depthAreas");
  Object.defineProperty(ship.mesh, "depthAreas", { configurable: true, get() { assert.fail("pattern edit inspected depth areas"); } });
  t.after(() => Object.defineProperty(ship.mesh, "depthAreas", descriptor));
  for (const pattern of ["two;blue;red", "two;red;blue", "empty;none;none", "one;red;blue"])
  {
    const next = originalDna + ":material?red;none:pattern?" + pattern;
    const expected = CjsSchema.from("EveShip2", await build(next));
    assert.ok(await updater.UpdateFromDNA(ship, next));
    assert.equal(ship.mesh.transparentAreas[0].effect, visible);
    assert.deepEqual(CjsSchema.getValues(ship.mesh.transparentAreas[0]), CjsSchema.getValues(expected.mesh.transparentAreas[0]));
    assert.deepEqual(CjsSchema.getValues(depth[0]), beforeDepth);
  }
});

test("combined pattern and insert edits only change inherited depth texture paths", async t =>
{
  const { ship, updater, sof } = await PatternFixture(options =>
  {
    const hull = options.black.hull[0];
    hull.transparentAreas = hull.opaqueAreas; hull.opaqueAreas = [];
    options.black.generic.areaShaders[0].doGenerateDepthArea = true;
    options.black.generic.areaShaders.push({ shader: "depthonlyv5.fx", parameters: [],
      defaultParameters: [], defaultTextures: [], transparencyTextureName: "DiffuseMap" });
  });
  const depth = ship.mesh.depthAreas, effect = depth[0].effect;
  const options = CjsSchema.getValues(effect).options;
  const samplers = CjsSchema.getValues(effect).samplerOverrides;
  const texture = effect.resources[0], notify = t.mock.method(texture, "OnModified");
  t.mock.method(sof, "BuildValuesFromDNA", () => assert.fail("full build"));
  assert.ok(await updater.UpdateFromDNA(ship, insertedDna + ":material?red;none:pattern?empty;none;none"));
  assert.equal(ship.mesh.depthAreas, depth); assert.equal(depth[0].effect, effect);
  assert.equal(texture.resourcePath, "res:/insert/ship_insert_d.dds");
  assert.equal(notify.mock.callCount(), 1);
  assert.deepEqual(CjsSchema.getValues(effect).options, options);
  assert.deepEqual(CjsSchema.getValues(effect).samplerOverrides, samplers);
});
