import assert from "node:assert/strict";
import test from "node:test";
import { EveSOF, CjsSOFUpdater } from "../../../npm/dist/sof/index.js";
import { CjsSchema } from "../../../npm/dist/global/schema/index.js";
import { EveShip2, TriTextureParameter } from "../../../npm/dist/trinity/index.js";
import { composeStubResMan } from "../../support/stubResMan.js";

const resources = composeStubResMan();
const originalDna = "hull:faction:race:respathinsert?none";
const insertedDna = "hull:faction:race:respathinsert?insert";

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
  test(`a late ${mismatch} mismatch falls back without changing earlier textures`, async () =>
  {
    const { ship, updater } = await Fixture();
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

test("effective faction defaults are no-ops and unrelated DNA edits request rebuild", async () =>
{
  const { ship, updater, sof } = await Fixture();
  await updater.UpdateFromDNA(ship, insertedDna);
  assert.equal(await updater.UpdateFromDNA(ship, "hull:faction:race"), false);
  assert.equal(await updater.UpdateFromDNA(ship, "HULL:FACTION:RACE:RESPATHINSERT?INSERT"), false);
  assert.equal(await updater.UpdateFromDNA(ship, insertedDna + ":class?stationary"), null);
  assert.equal(await updater.UpdateFromDNA(ship, "bad:dna"), null);
  const before = resources.requests.length;
  assert.ok(await updater.UpdateFromDNA(ship, "hull:faction:race:respathinsert?missing"));
  assert.equal(ship.mesh.opaqueAreas[0].effect.resources[0].resourcePath, "res:/ship_d.dds");
  assert.ok(resources.requests.length > before);
  assert.ok(sof);
});

test("an older async update cannot overwrite a newer request", async t =>
{
  const { ship, updater, sof } = await Fixture();
  const build = sof.BuildValuesFromDNA.bind(sof);
  let release, started;
  const waiting = new Promise(resolve => { release = resolve; });
  const entered = new Promise(resolve => { started = resolve; });
  t.mock.method(sof, "BuildValuesFromDNA", async (...args) =>
  {
    started();
    await waiting;
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

test("a rejected build makes no partial changes", async t =>
{
  const { ship, updater, sof } = await Fixture();
  const before = CjsSchema.getValues(ship);
  t.mock.method(sof, "BuildValuesFromDNA", async () => { throw new Error("failed resource acquisition"); });
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
  t.mock.method(sof, "BuildValuesFromDNA", async () => desired);
  const before = CjsSchema.getValues(ship);
  assert.equal(await updater.UpdateFromDNA(ship, insertedDna), null);
  assert.deepEqual(CjsSchema.getValues(ship), before);
});

test("decal parent textures and editor DNA provenance update without replacing the decal", async () =>
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
