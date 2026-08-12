import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import { CjsClassRegistry, CjsDocumentHydrator } from "@carbonenginejs/runtime-utils/document";
import { TriBatchType } from "@carbonenginejs/runtime-utils/graphics";
import {
  EveSOF,
  EveSOFDNA,
  EveSOFDataMgr,
  createSofHydrationAdapter,
} from "../npm/dist/sof/index.js";
import { EveSOFDataArea } from "../npm/dist/sof/shared/EveSOFDataArea.js";
import { EveSOFDataDecalIndexBuffer } from "../npm/dist/sof/shared/EveSOFDataDecalIndexBuffer.js";
import { EveSOFDataHull } from "../npm/dist/sof/hull/EveSOFDataHull.js";
import { EveSOFDataHullBanner } from "../npm/dist/sof/hull/EveSOFDataHullBanner.js";
import { EveSOFDataHullBannerSetItem } from "../npm/dist/sof/hull/EveSOFDataHullBannerSetItem.js";
import { EveSOFDataHullChild } from "../npm/dist/sof/hull/EveSOFDataHullChild.js";
import { EveSOFDataHullChildSet } from "../npm/dist/sof/hull/EveSOFDataHullChildSet.js";
import { EveSOFDataHullChildSetItem } from "../npm/dist/sof/hull/EveSOFDataHullChildSetItem.js";
import { EveSOFDataHullController } from "../npm/dist/sof/hull/EveSOFDataHullController.js";
import { EveSOFDataHullDecalSetItem } from "../npm/dist/sof/hull/EveSOFDataHullDecalSetItem.js";
import { EveSOFDataHullHazeSet } from "../npm/dist/sof/hull/EveSOFDataHullHazeSet.js";
import { EveSOFDataHullLightSetItem } from "../npm/dist/sof/hull/EveSOFDataHullLightSetItem.js";
import { EveSOFDataHullLightSetSpotLight } from "../npm/dist/sof/hull/EveSOFDataHullLightSetSpotLight.js";
import { EveSOFDataHullLightSetTexturedPointLight } from "../npm/dist/sof/hull/EveSOFDataHullLightSetTexturedPointLight.js";
import { EveSOFDataHullPlaneSet } from "../npm/dist/sof/hull/EveSOFDataHullPlaneSet.js";
import { EveSOFDataHullPlaneSetItem } from "../npm/dist/sof/hull/EveSOFDataHullPlaneSetItem.js";
import { EveSOFDataHullSpotlightSet } from "../npm/dist/sof/hull/EveSOFDataHullSpotlightSet.js";
import { EveSOFDataHullSpotlightSetItem } from "../npm/dist/sof/hull/EveSOFDataHullSpotlightSetItem.js";
import { EveSOFDataInstancedMesh } from "../npm/dist/sof/shared/EveSOFDataInstancedMesh.js";
import { EveSofDataMeshInstance } from "../npm/dist/sof/shared/EveSofDataMeshInstance.js";
import { EveSOFDataHullExtensionPlacementDistributionMapGraphicSettings } from "../npm/dist/sof/layout/EveSOFDataHullExtensionPlacementDistributionMapGraphicSettings.js";
import { EveSOFDataHullExtensionBucket } from "../npm/dist/sof/layout/EveSOFDataHullExtensionBucket.js";
import { EveSOFDataLogoSet } from "../npm/dist/sof/shared/EveSOFDataLogoSet.js";

const trinityConsumerEntry = new URL("../../runtime-trinity/npm/dist/index.js", import.meta.url);
// A SOF document now names an AudEmitter, so a registry built from
// runtime-trinity alone cannot resolve every node it contains. This entry point
// is data-only and creates no AudioContext, which is what lets a headless test
// -- and a headless consumer -- hydrate the audio node without an audio stack.
const audioTrinityConsumerEntry = new URL("../../runtime-audio/npm/dist/trinity/index.js", import.meta.url);


function createData()
{
  return {
    hull: [
      {
        name: "rifter",
        buildClass: 0,
        geometryResFilePath: "res:/model/rifter.gr2",
        boundingSphere: [1, 2, 3, 4],
        shapeEllipsoidCenter: [5, 6, 7],
        shapeEllipsoidRadius: [8, 9, 10],
        enableDynamicBoundingSphere: false,
        castShadow: true,
        isSkinned: false,
        sof6: false,
        opaqueAreas: [],
      },
      { name: "rifter2", buildClass: 1, isSkinned: true, sof6: true, opaqueAreas: [] },
    ],
    faction: [{ name: "minmatar" }],
    race: [{ name: "minmatar" }],
    material: [
      { name: "rust", parameters: [] },
      { name: "paint", parameters: [] },
    ],
    pattern: [{ name: "stripes" }],
    layout: [{ name: "antennae" }, { name: "cargo" }],
    generic: {
      materialPrefixes: [{ str: "Mtl1" }, { str: "Mtl2" }],
      variants: [{ name: "transparent", isTransparent: true, hullArea: { shader: "glass" } }],
    },
  };
}

function createManager()
{
  const manager = new EveSOFDataMgr();
  assert.equal(manager.SetData(createData()), true);
  return manager;
}

test("EveSOFDataMgr indexes every top-level SOF catalog", () => {
  const manager = createManager();
  assert.equal(manager.HasHullData("rifter"), true);
  assert.equal(manager.HasHullData("Rifter"), false);
  assert.equal(manager.GetFactionData("minmatar").name, "minmatar");
  assert.equal(manager.GetRaceData("missing"), null);
  assert.equal(manager.HasMaterialData("rust"), true);
  assert.equal(manager.HasPatternData("stripes"), true);
  assert.deepEqual(
    manager.GetLayoutData(["cargo", "missing", "antennae", "cargo"]).map(value => value.name),
    ["cargo", "antennae", "cargo"],
  );
  assert.deepEqual(manager.GetGenericData().materialPrefixes, ["Mtl1", "Mtl2"]);
  assert.equal(manager.GetGenericData().variants.has("transparent"), true);
});

// `mesh` is the spelling live EVE skins are authored with, and it carries one
// material per material prefix — the same payload as `material`. The Carbon
// snapshot validates CMD_MESH as exactly one argument and reads it nowhere in
// the tree, so porting it faithfully rejected real authored DNA and would have
// dropped the materials even had it passed. This fixture declares two prefixes,
// so "one per prefix" is two here rather than the four a live hull has.
test("a mesh command carries one material per prefix, exactly like material", () => {
  const sof = new EveSOF();
  sof.dataMgr.SetData(createData());

  assert.deepEqual(sof.InspectDna("rifter:minmatar:minmatar:mesh?rust;paint"), {
    buildable: true,
    valid: true,
    error: null,
  });

  // One argument is what the snapshot demanded. It is wrong for any hull with
  // more than one material prefix.
  assert.equal(sof.InspectDna("rifter:minmatar:minmatar:mesh?rust").valid, false);

  // An unknown material is still rejected, and "none" is still a valid slot.
  assert.equal(sof.InspectDna("rifter:minmatar:minmatar:mesh?rust;missing").valid, false);
  assert.equal(sof.InspectDna("rifter:minmatar:minmatar:mesh?none;paint").valid, true);

  // Accepting the command is only half of it: the materials must reach the
  // reader, which asks for CMD_MATERIAL.
  const dna = sof.CreateDna("rifter:minmatar:minmatar:mesh?rust;paint");
  assert.deepEqual(dna.GetDnaCommandArgs(EveSOFDNA.DnaCommand.CMD_MATERIAL), [ "rust", "paint" ]);

  // An explicit `material` command still wins when both are present.
  const both = sof.CreateDna("rifter:minmatar:minmatar:mesh?rust;rust:material?paint;paint");
  assert.deepEqual(both.GetDnaCommandArgs(EveSOFDNA.DnaCommand.CMD_MATERIAL), [ "paint", "paint" ]);
});

// Designs in the live feed carry `MATERIAL?...`. Carbon compares command names
// exactly, so the faithful port rejected them outright.
test("a DNA string is lowercased before parsing, so case never decides validity", () => {
  const sof = new EveSOF();
  sof.dataMgr.SetData(createData());

  assert.equal(sof.InspectDna("rifter:minmatar:minmatar:MATERIAL?rust;paint").valid, true);
  assert.equal(sof.InspectDna("RIFTER:MINMATAR:MINMATAR:MESH?RUST;PAINT").valid, true);

  const dna = sof.CreateDna("Rifter:Minmatar:Minmatar:Material?Rust;Paint");
  assert.deepEqual(dna.GetDnaCommandArgs(EveSOFDNA.DnaCommand.CMD_MATERIAL), [ "rust", "paint" ]);
  assert.deepEqual(dna.GetHullNames(), [ "rifter" ]);

  // The stored string is the folded one, so a consumer never sees a spelling
  // that would not parse again.
  assert.equal(dna.GetDnaString(), "rifter:minmatar:minmatar:material?rust;paint");
});

test("EveSOF DNA inspection distinguishes malformed and unknown selections", () => {
  const sof = new EveSOF();
  sof.dataMgr.SetData(createData());

  assert.deepEqual(sof.InspectDna("rifter:minmatar:minmatar"), {
    buildable: true,
    valid: true,
    error: null,
  });
  assert.deepEqual(sof.InspectDna("rifter:minmatar"), {
    buildable: false,
    valid: false,
    error: "not-enough-parts",
  });
  assert.deepEqual(sof.InspectDna("missing:minmatar:minmatar"), {
    buildable: false,
    valid: false,
    error: "unknown-hull",
  });
  assert.deepEqual(sof.InspectDna("rifter:minmatar:minmatar:pattern"), {
    buildable: false,
    valid: false,
    error: "malformed-command",
  });
});

test("a fresh EveSOFDataMgr exposes Carbon zero-valued damage records", () => {
  const generic = new EveSOFDataMgr().GetGenericData();
  assert.equal(generic.damage.armorParticleColorMidPoint, 0);
  assert.equal(generic.damage.armorParticleTurbulenceFrequency, 0);
  assert.equal(generic.hullDamage.hullParticleColorMidpoint, 0);
  assert.equal(generic.hullDamage.hullParticleTurbulenceFrequency, 0);
});

test("EveSOFDataMgr and EveSOFDNA preserve Carbon swarm behavior defaults", () => {
  const expected = {
    mass: 1,
    speedMultiplier: 1.1,
    speedMinimum: 10,
    agility: 2,
    maxDistance0: 500,
    maxDistance1: 125,
    timeMultiplier: 1,
    maxTime: 0.2,
    speed0: 700,
    speed1: 1000,
    weightCohesion: 0.1,
    weightSeparation: 0.1,
    separationDistance: 250,
    weightAlign: 50,
    weightWander: 0.33,
    wanderFluctuation: 0.05,
    wanderDistance: 100,
    wanderRadius: 80,
    weightAnchor: 0.5,
    anchorRadius0: 75,
    anchorRadius1: 250,
    weightDecelerate: 0.1,
    maxDeceleration: 200,
    weightFormation: 1,
    formationDistance: 50,
  };
  assert.deepEqual(new EveSOFDataMgr().GetGenericData().swarmBehavior, expected);

  const data = createData();
  data.generic.swarm = {
    speedMultiplier: 2.5,
    weightDeceleration: 0.75,
    formationDistance: 125,
  };
  const manager = new EveSOFDataMgr();
  assert.equal(manager.SetData(data), true);
  const behavior = manager.GetGenericData().swarmBehavior;
  assert.deepEqual(behavior, {
    ...expected,
    speedMultiplier: 2.5,
    weightDecelerate: 0.75,
    formationDistance: 125,
  });
  assert.notEqual(behavior, data.generic.swarm);

  const dna = new EveSOFDNA();
  dna.Setup("rifter:minmatar:minmatar", manager);
  assert.equal(dna.IsValid(), true);
  assert.equal(dna.GetGenericSwarmProperties(), behavior);
});

test("EveSOF emits and hydrates Carbon swarm behavior on the EveShip2-derived root", {
  skip: !existsSync(trinityConsumerEntry),
}, async () => {
  const data = createData();
  data.hull[0].buildClass = EveSOFDataHull.BuildClass.BUILDCLASS_SWARM;
  data.generic.swarm = {
    speedMultiplier: 2.5,
    weightDeceleration: 0.75,
    formationDistance: 125,
  };

  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  const document = sof.BuildFromDNA("rifter:minmatar:minmatar");
  const root = rootNode(document);
  assert.equal(root.kind, "EveSwarm");
  assert.equal(root.fields.mass, 1);
  assert.equal(root.fields.speedMultiplier, 2.5);
  assert.equal(root.fields.agility, 2);
  assert.equal(root.fields.timeMultiplier, 1);
  assert.equal(root.fields.weightDeceleration, 0.75);
  assert.equal(root.fields.formationDistance, 125);
  assert.equal(root.fields.boosters, null);

  const behavior = sof.dataMgr.GetGenericData().swarmBehavior;
  assert.equal(Object.keys(behavior).length, 25);
  for (const [key, value] of Object.entries(behavior))
  {
    const fieldName = key === "weightDecelerate" ? "weightDeceleration" : key;
    assert.equal(root.fields[fieldName], value, fieldName);
  }

  const trinity = await import(trinityConsumerEntry);
  const audioTrinity = await import(audioTrinityConsumerEntry);
  const registry = CjsClassRegistry.fromMaps({ constructors: { ...trinity, ...audioTrinity } });
  const adapter = createSofHydrationAdapter();
  const hydrated = CjsDocumentHydrator.hydrate(document, { registry, adapter });
  assert.deepEqual(hydrated.reports, []);
  assert.equal(hydrated.root.constructor.name, "EveSwarm");
  assert.equal(hydrated.root.speedMultiplier, 2.5);
  assert.equal(hydrated.root.weightDeceleration, 0.75);
  assert.equal(hydrated.root.formationDistance, 125);
  assert.equal(hydrated.root.boosters, null);
  for (const [key, value] of Object.entries(behavior))
  {
    const fieldName = key === "weightDecelerate" ? "weightDeceleration" : key;
    assert.equal(hydrated.root[fieldName], value, fieldName);
  }
});

test("EveSOFDNA variants construct fresh Carbon custom hull records", () => {
  const data = createData();
  Object.assign(data.hull[0], {
    category: "frigate",
    sof6: true,
    audioPosition: [11, 12, 13],
    opaqueAreas: [
      { name: "first", index: 3, count: 2, shader: "source.fx" },
      { name: "second", index: 9, count: 4, shader: "source.fx" },
    ],
    decalAreas: [{ name: "discarded", index: 20, count: 1 }],
    children: [{ redFilePath: "res:/discarded.red" }],
    locatorSets: [{
      name: "discarded",
      locators: [{ position: [1, 2, 3] }],
    }],
    booster: { items: [{ transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 7, 8, 9, 1] }] },
  });
  data.generic.variants[0].hullArea = {
    shader: "glass.fx",
    blockedMaterials: 7,
    textures: [{ name: "DiffuseMap", resFilePath: "res:/glass_d.dds" }],
    parameters: [{ name: "GlowColor", value: [1, 2, 3, 4] }],
  };
  data.generic.variants.push({ name: "missing-area", isTransparent: false });

  const manager = new EveSOFDataMgr();
  assert.equal(manager.SetData(data), true);
  assert.equal(manager.GetGenericData().variants.has("missing-area"), false);
  const source = manager.GetHullData("rifter");
  const variant = manager.GetGenericData().variants.get("transparent");
  const dna = new EveSOFDNA();
  dna.Setup("rifter:minmatar:minmatar:variant?transparent", manager);
  assert.equal(dna.IsValid(), true);

  const custom = dna.hullDatas[0];
  assert.equal(custom, dna.customHullData[0]);
  assert.notEqual(custom, source);
  assert.equal(custom.buildClass, source.buildClass);
  assert.equal(custom.geometryResFilePath, source.geometryResFilePath);
  assert.deepEqual(custom.boundingSphere, source.boundingSphere);
  assert.deepEqual(custom.shapeEllipsoid, source.shapeEllipsoid);
  assert.deepEqual(custom.audioPosition, [11, 12, 13]);
  assert.equal(custom.enableDynamicBoundingSphere, source.enableDynamicBoundingSphere);
  assert.equal(custom.castShadow, source.castShadow);
  assert.equal(custom.isSkinned, source.isSkinned);

  assert.deepEqual(custom.opaqueAreas, []);
  assert.deepEqual(custom.decalAreas, []);
  assert.deepEqual(custom.children, []);
  assert.equal(custom.locatorSets.size, 0);
  assert.deepEqual(custom.boosters.items, []);
  assert.equal(custom.category, "");
  assert.equal(custom.sof6, false);
  assert.equal(custom.name, undefined);
  assert.deepEqual(custom.defaultPattern.rotation, [0, 0, 0, 1]);

  assert.deepEqual(
    custom.transparentAreas.map(area => [area.index, area.count, area.shader, area.blockedMaterials]),
    [[3, 2, "glass.fx", 7], [9, 4, "glass.fx", 7]],
  );
  assert.notEqual(custom.transparentAreas[0], custom.transparentAreas[1]);
  assert.equal("name" in custom.transparentAreas[0], false);
  assert.notEqual(custom.transparentAreas[0].textures, variant.hullAreaData.textures);
  assert.notEqual(custom.transparentAreas[0].textures, custom.transparentAreas[1].textures);
  assert.deepEqual(custom.transparentAreas[0].textures.get("DiffuseMap"), {
    resFilePath: "res:/glass_d.dds",
  });
  assert.deepEqual(custom.transparentAreas[0].parameters.get("GlowColor"), [1, 2, 3, 4]);

  const unknown = new EveSOFDNA();
  unknown.Setup("rifter:minmatar:minmatar:variant?unknown", manager);
  assert.equal(unknown.ValidateContent(), false);
  assert.equal(unknown.customHullData.length, 1);
  assert.equal(unknown.hullDatas[0], unknown.customHullData[0]);
  assert.deepEqual(unknown.hullDatas[0].opaqueAreas, []);
  assert.deepEqual(unknown.hullDatas[0].transparentAreas, []);
  assert.equal(unknown.hullDatas[0].category, "");
});

test("EveSOFDataMgr rejects duplicates and supports deterministic reload", () => {
  const manager = createManager();
  const duplicate = createData();
  duplicate.pattern.push({ name: "stripes" });
  assert.equal(manager.SetData(duplicate), false);
  assert.equal(manager.SetData(createData()), true);
  assert.equal(manager.HasLayoutData("antennae"), true);
});

test("EveSOF async data loading consumes one deduplicated object result", async () => {
  const data = createData();
  let loads = 0;
  const sof = new EveSOF().Register({
    dataPath: "res:/sof/data.black",
    resources: {
      async getObject(path, request)
      {
        loads += 1;
        assert.equal(path, "res:/sof/data.black");
        assert.equal(request.role, "sofData");
        assert.equal(request.output, "runtime");
        return data;
      },
    },
  });

  const first = sof.LoadDataAsync();
  const second = sof.LoadDataAsync();
  assert.equal(await first, true);
  assert.equal(await second, true);
  assert.equal(loads, 1);
  assert.equal(sof.dataMgr.HasHullData("rifter"), true);

  sof.Register({ resources: { exists: async () => true } });
  assert.equal(await sof.LoadDataAsync("RES:\\SOF\\DATA.BLACK"), true);
  assert.equal(loads, 2);
  assert.throws(() => sof.Register({ resources: "" }), /must be an object or null/);

  sof.Register({ resources: { getObject: null } });
  assert.equal(await sof.LoadDataAsync(), false);
  assert.equal(loads, 2);
});

test("EveSOFDataMgr async loading deduplicates only in-flight work and permits retry", async () => {
  const manager = new EveSOFDataMgr();
  let attempts = 0;
  manager.SetResourceLoader(async path => {
    attempts += 1;
    assert.equal(path, "res:/sof/data.black");
    if (attempts === 1) return null;
    if (attempts === 2) throw new Error("temporary load failure");
    return createData();
  });

  assert.equal(await manager.LoadDataAsync(" RES:\\SOF\\DATA.BLACK "), false);
  await assert.rejects(manager.LoadDataAsync("res:/sof/data.black"), /temporary load failure/);
  const first = manager.LoadDataAsync("res:/sof/data.black");
  const second = manager.LoadDataAsync("RES:/SOF/DATA.BLACK");
  assert.equal(await first, true);
  assert.equal(await second, true);
  assert.equal(attempts, 3);

  const captured = new EveSOFDataMgr();
  let originalCalls = 0;
  let replacementCalls = 0;
  captured.SetResourceLoader(async () => {
    originalCalls += 1;
    return createData();
  });
  const pending = captured.LoadDataAsync("res:/sof/data.black");
  captured.SetResourceLoader(async () => {
    replacementCalls += 1;
    return null;
  });
  assert.equal(await pending, true);
  assert.equal(originalCalls, 1);
  assert.equal(replacementCalls, 0);
});

test("EveSOFDataMgr deeply projects Carbon extension layouts for DNA consumers", () => {
  const data = createData();
  data.hull[0].locatorSets = [{
    name: "hardpoints",
    locators: [{
      position: [1, 2, 3],
      rotation: [0, 0, 0, 1],
      scaling: [1, 1, 1],
      boneIndex: 4,
    }],
  }];
  const layout = {
    name: "deep",
    seed: -1,
    randomizeSeedOnLoad: true,
    depletionCounters: [{ name: "root", value: 2 }],
    placements: [{
      name: "outer",
      enabled: false,
      depletionCounters: [{ name: "group", value: 3 }],
      distributionConditions: [{ chanceOfUsage: 0.25 }],
      placements: [{
        name: "antenna",
        locatorSetName: "hardpoints",
        offset: [4, 5, 6],
        descriptor: {
          hull: "rifter2",
          faction: "minmatar",
          race: "minmatar",
          pattern: "stripes",
          material1: "rust",
          layout: "cargo",
        },
        distribution: {
          completeness: 0.75,
          placementBias: [1, 2, 3],
          centerBias: 0.5,
          cap: 7,
          randomRotationStepSizeYPR: [0, 0.5, 0, 0.5],
          randomRotationMaxSteps: [1, 2, 3],
          randomScaleMin: [0.5, 0.6, 0.7],
          randomScaleMax: [1.5, 1.6, 1.7],
          uniformScale: false,
          occupyLocators: false,
        },
        distributionConditions: [
          { parentDescriptor: { hull: "rifter", material2: "paint" } },
          { depletionCounters: [{ name: "leaf", value: 4 }] },
          { chanceOfUsage: 0.6 },
          { displayFilter: 3 },
        ],
        isInstanced: false,
        isShared: true,
        extendsBoundingSphere: false,
      }, {
        name: "defaulted",
        locatorSetName: "hardpoints",
      }],
    }],
  };
  data.layout = [layout];

  const manager = new EveSOFDataMgr();
  assert.equal(manager.SetData(data), true);
  assert.equal(Object.isFrozen(EveSOFDataMgr.DistributionMethod), true);
  assert.deepEqual(EveSOFDataMgr.DistributionMethod, {
    RANDOM_INCLUCION: 0,
    PARENT_MATCH: 1,
    DEPLETION_COUNTER: 2,
    GRAPHIC_SETTING_MAP: 3,
  });

  const projected = manager.GetLayoutData("deep");
  const group = projected.placements[0];
  const leaf = group.placements[0];
  assert.equal(projected.seed, 0xffffffff);
  assert.equal(projected.scrambleSeed, true);
  assert.deepEqual(projected.depletionCounters, [{ counterName: "root", counterValue: 2 }]);
  assert.equal(group.isAGroup, true);
  assert.equal(group.enabled, false);
  assert.deepEqual(group.depletionCounters, [{ counterName: "group", counterValue: 3 }]);
  assert.equal(group.placementConditions[0].distributionType, 0);
  assert.equal(group.placementConditions[0].triggerChance, 0.25);
  assert.equal(leaf.isAGroup, false);
  assert.equal(leaf.hasDistribution, true);
  assert.equal(leaf.isInstanced, false);
  assert.equal(leaf.isShared, true);
  assert.equal(leaf.extendsBoundingSphere, false);
  assert.equal(leaf.extendsShieldEllipsoid, true);
  assert.deepEqual(leaf.descriptor, {
    hull: "rifter2",
    faction: "minmatar",
    race: "minmatar",
    pattern: "stripes",
    material1: "rust",
    material2: "",
    material3: "",
    material4: "",
    layout: "cargo",
    seed: "",
  });
  assert.equal(leaf.distribution.uniformScaling, false);
  assert.equal(leaf.distribution.occupyLocators, false);
  assert.deepEqual(leaf.distribution.randomScaleMax, [1.5, 1.6, 1.7]);
  assert.deepEqual(
    leaf.placementConditions.map(value => value.distributionType),
    [1, 2, 0, 3],
  );
  assert.equal(leaf.placementConditions[0].spaceObjectParentDescriptor.material2, "paint");
  assert.deepEqual(leaf.placementConditions[1].depletionCounters, [
    { counterName: "leaf", counterValue: 4 },
  ]);
  assert.equal(leaf.placementConditions[2].triggerChance, 0.6);
  assert.equal(leaf.placementConditions[3].displayModifier, 3);
  assert.equal(group.placements[1].hasDistribution, false);
  assert.deepEqual(group.placements[1].distribution.randomScaleMin, [1, 1, 1]);

  layout.depletionCounters[0].value = 99;
  layout.placements[0].placements[0].descriptor.hull = "mutated";
  layout.placements[0].placements[0].distribution.randomScaleMax[0] = 99;
  assert.equal(projected.depletionCounters[0].counterValue, 2);
  assert.equal(leaf.descriptor.hull, "rifter2");
  assert.equal(leaf.distribution.randomScaleMax[0], 1.5);

  assert.equal(manager.UpdateLayout("deep", {
    name: "deep",
    seed: 9,
    placements: [{ name: "replacement", locatorSetName: "hardpoints" }],
  }), true);
  assert.equal(manager.GetLayoutData("deep").placements[0].name, "replacement");

  manager.UpdateLayout("deep", layout);
  const dna = new EveSOFDNA();
  dna.Setup("rifter:minmatar:minmatar:layout?deep", manager);
  assert.equal(dna.GetLayoutCount(), 1);
  assert.equal(dna.GetLayoutData(0).name, "deep");
  assert.equal(dna.GetLayoutData(1), null);
  assert.deepEqual(dna.GetPlacementLocators(0, "hardpoints")[0].position, [1, 2, 3]);
});

test("EveSOFDataMgr recognizes Carbon extension buckets after placement inheritance", () => {
  const data = createData();
  const bucket = new EveSOFDataHullExtensionBucket();
  bucket.name = "bucket";
  bucket.depletionCounters.push({ name: "remaining", value: 2 });
  bucket.placements.push({
    name: "leaf",
    locatorSetName: "hardpoints",
    descriptor: { hull: "rifter2" },
  });
  data.layout = [{
    name: "bucket-layout",
    seed: 1337,
    placements: [bucket],
    depletionCounters: [],
  }];

  const manager = new EveSOFDataMgr();
  assert.equal(manager.SetData(data), true);
  const projected = manager.GetLayoutData("bucket-layout").placements[0];
  assert.equal(projected.isAGroup, true);
  assert.equal(projected.name, "bucket");
  assert.deepEqual(projected.depletionCounters, [{
    counterName: "remaining",
    counterValue: 2,
  }]);
  assert.equal(projected.placements[0].isAGroup, false);
  assert.equal(projected.placements[0].descriptor.hull, "rifter2");
});

test("EveSOFDNA indexes all seven Carbon decal minimum-screen-size usages", () => {
  const data = createData();
  const expected = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5];
  Object.assign(data.generic, {
    decalMinScreenSizeSTANDARD: expected[0],
    decalMinScreenSizeKILLCOUNTER: expected[1],
    decalMinScreenSizeHOLE: expected[2],
    decalMinScreenSizeCYLINDRICAL: expected[3],
    decalMinScreenSizeGLOWCYLINDRICAL: expected[4],
    decalMinScreenSizeGLOWSTANDARD: expected[5],
    decalMinScreenSizeLOGO: expected[6],
  });

  const manager = new EveSOFDataMgr();
  assert.equal(manager.SetData(data), true);
  const dna = new EveSOFDNA();
  dna.Setup("rifter:minmatar:minmatar", manager);
  assert.deepEqual(
    expected.map((value, usage) => dna.GetDecalMinScreenSize(usage)),
    expected,
  );
  assert.equal(dna.GetDecalMinScreenSize(7), undefined);
});

test("EveSOF plans Carbon layout RNG, occupancy, and deterministic scramble offsets", () => {
  const data = createData();
  data.hull[0].locatorSets = [{
    name: "hardpoints",
    locators: [
      { position: [1, 0, 0], rotation: [0, 0, 0, 1], scaling: [1, 1, 1], boneIndex: 2 },
      { position: [2, 0, 0], rotation: [0, 0, 0, 1], scaling: [1, 1, 1], boneIndex: 3 },
    ],
  }, {
    name: "utility",
    locators: [
      { position: [0, 4, 0], rotation: [0, 0, 0, 1], scaling: [1, 1, 1], boneIndex: 5 },
    ],
  }];
  const distributed = (name, locatorSetName) => ({
    name,
    locatorSetName,
    descriptor: { hull: "rifter2" },
    distribution: {
      completeness: 1,
      placementBias: [0, 0, 0],
      centerBias: 0,
      cap: 0,
      randomRotationStepSizeYPR: [0, 0, 0, 1],
      randomRotationMaxSteps: [0, 0, 0],
      randomScaleMin: [1, 1, 1],
      randomScaleMax: [2, 2, 2],
      uniformScale: true,
      occupyLocators: true,
    },
  });
  data.layout = [{
    name: "deterministic",
    seed: 1337,
    placements: [
      distributed("first", "hardpoints"),
      { name: "occupied", locatorSetName: "hardpoints", descriptor: { hull: "rifter2" } },
    ],
  }, {
    name: "scrambled",
    seed: 1337,
    randomizeSeedOnLoad: true,
    placements: [distributed("second-layout", "utility")],
  }];

  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  const dna = "rifter:minmatar:minmatar:layout?deterministic;scrambled";
  const options = { scrambleSeedOffset: 10 };
  const first = sof.PlanLayoutFromDNA(dna, options);
  const second = sof.PlanLayoutFromDNA(dna, options);
  assert.deepEqual(second, first);
  assert.equal(first.schemaVersion, 1);
  assert.equal(first.layouts[0].effectiveSeed, 1337);
  assert.equal(first.layouts[0].randomStartState, 1337);
  assert.equal(first.layouts[0].randomEndState, 328814);
  assert.equal(first.layouts[0].randomDrawCount, 3);
  assert.equal(first.layouts[1].effectiveSeed, 1347);
  assert.equal(first.layouts[1].restoredRandomState, 328814);
  assert.equal(first.finalRandomState, 328814);
  assert.equal(first.placements.length, 3);
  assert.deepEqual(first.placements.map(value => value.locator.key), ["0:0", "0:1", "0:2"]);
  assert.deepEqual(first.placements.map(value => value.locator.boneIndex), [2, 3, 5]);
  assert.ok(Math.abs(first.placements[0].randomizedScaling[0] - 1.8445432782173157) < 1e-7);
  assert.ok(Math.abs(first.placements[1].randomizedScaling[0] - 1.4605076909065247) < 1e-7);
  assert.equal(first.skipped.find(value => value.name === "occupied").reason, "no-locators");

  first.placements[0].descriptor.hull = "mutated";
  first.placements[0].transform[12] = 99;
  const third = sof.PlanLayoutFromDNA(dna, options);
  assert.equal(third.placements[0].descriptor.hull, "rifter2");
  assert.equal(third.placements[0].transform[12], 1);
});

test("EveSOF composes randomized locator rotations in Carbon quaternion order", () => {
  const data = createData();
  const halfSqrt = Math.sqrt(0.5);
  data.hull[0].locatorSets = [{
    name: "rotated",
    locators: [{
      position: [0, 0, 0],
      rotation: [halfSqrt, 0, 0, halfSqrt],
      scaling: [1, 1, 1],
      boneIndex: 1,
    }],
  }];
  data.layout = [{
    name: "random-rotation",
    seed: 1337,
    placements: [{
      name: "placed",
      locatorSetName: "rotated",
      descriptor: { hull: "rifter2" },
      distribution: {
        completeness: 1,
        placementBias: [0, 0, 0],
        centerBias: 0,
        cap: 0,
        randomRotationStepSizeYPR: [0, halfSqrt, 0, halfSqrt],
        randomRotationMaxSteps: [1, 0, 0],
        randomScaleMin: [1, 1, 1],
        randomScaleMax: [1, 1, 1],
        uniformScale: true,
        occupyLocators: true,
      },
    }],
  }];

  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  const plan = sof.PlanLayoutFromDNA("rifter:minmatar:minmatar:layout?random-rotation");
  const expected = [0.5, 0.5, -0.5, 0.5];
  const dot = plan.placements[0].rotation.reduce(
    (sum, value, index) => sum + value * expected[index],
    0,
  );
  assert.ok(Math.abs(dot) > 1 - 1e-5, "randomized locator rotation");
});

test("EveSOF layout planning preserves Carbon condition quirks and nested transform order", () => {
  const data = createData();
  data.hull[0].locatorSets = [{
    name: "root",
    locators: [{ position: [1, 0, 0], rotation: [0, 0, 0, 1], scaling: [1, 1, 1], boneIndex: 1 }],
  }];
  data.hull[1].locatorSets = [{
    name: "nested",
    locators: [{ position: [0, 0, 3], rotation: [0, 0, 0, 1], scaling: [1, 1, 1], boneIndex: 7 }],
  }];
  const leaf = (name, conditions = []) => ({
    name,
    locatorSetName: "root",
    descriptor: { hull: "rifter2" },
    distributionConditions: conditions,
  });
  data.layout = [{
    name: "parent",
    seed: 1337,
    placements: [
      leaf("strict-random", [{ chanceOfUsage: 0.8810139894485474 }]),
      leaf("wrong-faction", [{ parentDescriptor: { faction: "amarr" } }]),
      leaf("ignored-parent-fields", [{ parentDescriptor: { hull: "ignored", faction: "minmatar" } }]),
      leaf("depletion", [{ depletionCounters: [{ name: "unused", value: 1 }] }]),
      leaf("high", [{ displayFilter: 4 }]),
      leaf("unknown", [{}]),
      {
        name: "nested-request",
        locatorSetName: "root",
        offset: [0, 2, 0],
        descriptor: { hull: "rifter2", layout: "nested" },
      },
    ],
  }, {
    name: "nested",
    seed: 5,
    placements: [{
      name: "nested-leaf",
      locatorSetName: "nested",
      descriptor: { hull: "rifter" },
    }],
  }];

  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  const plan = sof.PlanLayoutFromDNA("rifter:minmatar:minmatar:layout?parent", {
    graphicsQuality: "high",
  });
  assert.deepEqual(
    plan.placements.map(value => value.name),
    ["ignored-parent-fields", "depletion", "high", "nested-request", "nested-leaf"],
  );
  assert.equal(plan.invocations.length, 2);
  assert.equal(plan.layouts[1].name, "nested");
  assert.equal(plan.layouts[1].invocationId, 1);
  assert.deepEqual(plan.placements[3].transform.slice(12, 15), [1, 2, 0]);
  assert.deepEqual(plan.placements[4].transform.slice(12, 15), [1, 2, 3]);
  assert.equal(plan.skipped.find(value => value.name === "strict-random").reason, "placement-condition-failed");
  assert.equal(plan.skipped.find(value => value.name === "wrong-faction").reason, "placement-condition-failed");
  assert.equal(plan.skipped.find(value => value.name === "unknown").reason, "placement-condition-failed");
  assert.ok(plan.diagnostics.some(value => value.code === "parent-match-fields-not-implemented-in-carbon"));
  assert.ok(plan.diagnostics.some(value => value.code === "depletion-condition-not-implemented-in-carbon"));
  assert.equal(sof.PlanLayoutFromDNA("missing:minmatar:minmatar"), null);
});

test("SOF emits and hydrates non-instanced, instanced, and shared layout placement graphs", {
  skip: !existsSync(trinityConsumerEntry),
}, async () => {
  const data = createData();
  data.hull[0].boundingSphere = [0, 0, 0, 1];
  data.hull[0].shapeEllipsoidCenter = [0, 0, 0];
  data.hull[0].shapeEllipsoidRadius = [1, 1, 1];
  data.hull[0].locatorSets = [{
    name: "ordinary",
    locators: [{ position: [1, 2, 3], rotation: [0, 0, 0, 1], scaling: [2, 2, 2], boneIndex: 4 }],
  }, {
    name: "instanced",
    locators: [
      { position: [5, 0, 0], rotation: [0, 0, 0, 1], scaling: [1, 1, 1], boneIndex: 6 },
      { position: [7, 0, 0], rotation: [0, 0, 0, 1], scaling: [1, 1, 1], boneIndex: 8 },
    ],
  }, {
    name: "shared",
    locators: [
      { position: [0, 9, 0], rotation: [0, 0, 0, 1], scaling: [1, 1, 1], boneIndex: 10 },
      { position: [0, 11, 0], rotation: [0, 0, 0, 1], scaling: [1, 1, 1], boneIndex: 12 },
    ],
  }, {
    name: "controlled",
    locators: [{ position: [0, 0, 20], rotation: [0, 0, 0, 1], scaling: [1, 1, 1], boneIndex: 14 }],
  }, {
    name: "damage",
    locators: [{ position: [0, 0, 0], rotation: [0, 0, 0, 1], scaling: [9, 9, 9], boneIndex: 16 }],
  }];
  data.hull.push({
    name: "controlled",
    buildClass: 1,
    geometryResFilePath: "res:/model/controlled.gr2",
    boundingSphere: [0, 0, 0, 1],
    shapeEllipsoidCenter: [0, 0, 0],
    shapeEllipsoidRadius: [1, 1, 1],
    castShadow: false,
    isSkinned: true,
    sof6: true,
    opaqueAreas: [],
    childSets: [{
      items: [{
        redFilePath: "res:/layout-child.red",
        buildFilter: EveSOFDataHull.BuildFilter.NON_INSTANCED_PLACEMENT,
      }],
    }],
    soundEmitters: [{
      name: "placed-audio",
      prefix: "layout_",
      position: [1, 0, 0],
      rotation: [0, 0, 0, 1],
      attenuationScalingFactor: 3,
    }],
    controllers: [{
      path: "res:/layout-controller.red",
      buildFilter: EveSOFDataHull.BuildFilter.NON_INSTANCED_PLACEMENT,
    }],
  });
  data.hull[1].geometryResFilePath = "res:/model/extension.gr2";
  data.hull[1].isSkinned = false;
  data.hull[1].castShadow = true;
  data.hull[1].reflectionMode = 2;
  data.hull[1].boundingSphere = [0, 0, 0, 1];
  data.hull[1].shapeEllipsoidCenter = [0, 0, 0];
  data.hull[1].shapeEllipsoidRadius = [1, 2, 3];
  data.hull[1].locatorSets = [{
    name: "damage",
    locators: [{
      position: [1, 0, 0],
      rotation: [0, 0, 0, 1],
      scaling: [3, 4, 5],
      boneIndex: 15,
    }],
  }];
  data.hull[1].opaqueAreas = [{
    name: "Extension Hull",
    index: 3,
    count: 2,
    areaType: 0,
    blockedMaterials: 0,
    shader: "extension.fx",
    textures: [],
    parameters: [],
  }];
  data.hull[1].decalAreas = [{
    name: "Extension Decal Area",
    index: 5,
    count: 1,
    areaType: 0,
    blockedMaterials: 0,
    shader: "extension.fx",
    textures: [],
    parameters: [],
  }];
  data.hull[1].decalSets = [{
    name: "extension-decals",
    visibilityGroup: "primary",
    items: [{
      name: "extension-decal",
      usage: EveSOFDataHullDecalSetItem.Usage.USAGE_STANDARD,
      position: [1, 0, 0],
      rotation: [0, 0, 0, 1],
      scaling: [1, 1, 1],
      indexBuffers: [{ indexBuffer: new Uint32Array([2, 4, 6]) }],
    }],
  }];
  data.generic.areaShaderLocation = "res:/effect";
  data.generic.shaderPrefix = "static_";
  data.generic.shaderPrefixAnimated = "skinned_";
  data.generic.areaShaders = [{
    shader: "extension.fx",
    parameters: [],
    defaultParameters: [],
    defaultTextures: [],
    doGenerateDepthArea: false,
    transparencyTextureName: "",
  }];
  data.faction[0].visibilityGroupSet = { visibilityGroups: [{ str: "primary" }] };
  data.layout = [{
    name: "graph",
    seed: 7,
    placements: [{
      name: "ordinary",
      locatorSetName: "ordinary",
      descriptor: { hull: "rifter2" },
      isInstanced: false,
      isShared: false,
      extendsBoundingSphere: false,
      extendsShieldEllipsoid: true,
    }, {
      name: "instanced",
      locatorSetName: "instanced",
      descriptor: { hull: "rifter2" },
      isInstanced: true,
      isShared: false,
      extendsBoundingSphere: true,
      extendsShieldEllipsoid: false,
    }, {
      name: "shared",
      locatorSetName: "shared",
      descriptor: { hull: "rifter2" },
      isInstanced: true,
      isShared: true,
      extendsBoundingSphere: false,
      extendsShieldEllipsoid: false,
    }, {
      name: "controlled",
      locatorSetName: "controlled",
      descriptor: { hull: "controlled" },
      isInstanced: false,
      isShared: false,
      extendsBoundingSphere: false,
      extendsShieldEllipsoid: false,
    }],
  }];

  const sof = new EveSOF();
  sof.SetChildResourceResolver(path => path === "res:/layout-child.red" ? {
    kind: "EveChildMesh",
    target: "effectChildren",
    fields: { name: "layout-effect", mesh: null, decals: [], attachments: [], lights: [] },
  } : null);
  sof.SetObjectResourceResolver((path, context) => {
    if (path === "res:/layout-controller.red" && context.role === "controller")
    {
      return { kind: "Tr2ControllerReference", fields: { name: "layout-controller", curves: [], bindings: [] } };
    }
    return null;
  });
  assert.equal(sof.dataMgr.SetData(data), true);
  const document = sof.BuildFromDNA("rifter:minmatar:minmatar:layout?graph");
  const root = rootNode(document);
  assert.deepEqual(root.fields.boundingSphereCenter, [3.5, 0, 0]);
  assert.equal(root.fields.boundingSphereRadius, 4.5);
  assert.deepEqual(root.fields.shapeEllipsoidCenter, [1, 2, 3]);
  assert.deepEqual(root.fields.shapeEllipsoidRadius, [2, 4, 6]);
  const children = root.fields.effectChildren.map(ref => referencedNode(document, ref));
  const layouts = children.find(node => node.kind === "EveChildContainer" && node.fields.name === "layouts");
  const shared = children.find(node => node.kind === "EveChildInstancedMeshes");
  assert.ok(layouts);
  assert.ok(shared);
  assert.equal(layouts.fields.objects.length, 3);

  const ordinary = referencedNode(document, layouts.fields.objects[0]);
  assert.equal(ordinary.kind, "EveChildMesh");
  assert.equal(ordinary.fields.name, "Hull");
  assert.equal(ordinary.fields.decals.length, 1);
  assert.deepEqual(ordinary.fields.scaling, [2, 2, 2]);
  assert.deepEqual(ordinary.fields.translation, [1, 2, 3]);

  const instanced = referencedNode(document, layouts.fields.objects[1]);
  const instancedMesh = referencedNode(document, instanced.fields.mesh);
  const runtimeData = referencedNode(document, instancedMesh.fields.instanceGeometryResource);
  assert.equal(instanced.fields.name, "Instanced Hull");
  assert.equal(instancedMesh.kind, "Tr2InstancedMesh");
  assert.equal(instanced.fields.decals.length, 1);
  const instancedDecal = referencedNode(document, instanced.fields.decals[0]);
  const instancedDecalEffect = referencedNode(document, instancedDecal.fields.decalEffect);
  assert.ok(instancedDecalEffect.fields.options.some(ref => (
    referencedNode(document, ref).fields.value === "SOIA_ENABLED"
  )));
  for (const areaRef of instancedMesh.fields.opaqueAreas)
  {
    const areaEffect = referencedNode(document, referencedNode(document, areaRef).fields.effect);
    assert.ok(areaEffect.fields.options.some(ref => (
      referencedNode(document, ref).fields.value === "SOIA_ENABLED"
    )));
  }
  assert.deepEqual(runtimeData.fields.rows.map(row => row.transform0[3]), [5, 7]);
  assert.deepEqual(runtimeData.fields.rows.map(row => row.boneIndex), [6, 8]);
  assert.equal(instanced.fields.instanceTransforms.length, 2);

  const controlled = layouts.fields.objects
    .map(ref => referencedNode(document, ref))
    .find(node => node.kind === "EveChildContainer" && node.fields.name === "controlled");
  assert.ok(controlled);
  assert.equal(controlled.fields.objects.length, 2);
  assert.equal(controlled.fields.observers.length, 1);
  assert.equal(controlled.fields.controllers.length, 1);
  assert.equal(referencedNode(document, controlled.fields.objects[0]).fields.animationUpdater.$ref > 0, true);
  assert.equal(controlled.fields.animationOwner.$ref, controlled.fields.objects[0].$ref);
  const controlledObserver = referencedNode(document, controlled.fields.observers[0]);
  assert.deepEqual(controlledObserver.fields.position, [1, 0, 20]);
  const controlledEmitter = referencedNode(document, controlledObserver.fields.observer);
  assert.equal(controlledEmitter.kind, "AudEmitter");
  assert.equal(controlledEmitter.fields.eventPrefix, "layout_");
  assert.equal(controlledObserver.raw, undefined);
  const controlledEffect = controlled.fields.objects
    .map(ref => referencedNode(document, ref))
    .find(node => node.fields.name === "layout-effect");
  assert.equal(controlledEffect.fields.name, "layout-effect");

  assert.equal(shared.fields.name, "SharedInstancedMeshes");
  assert.equal(shared.fields.meshes.length, 1);
  const sharedMesh = referencedNode(document, shared.fields.meshes[0]);
  assert.equal(sharedMesh.kind, "EveChildInstancedMesh");
  assert.equal(sharedMesh.fields.instances.length, 2);
  assert.equal(sharedMesh.fields.areas.length, 2);
  const sharedAreas = sharedMesh.fields.areas.map(ref => referencedNode(document, ref));
  assert.deepEqual(
    sharedAreas.map(area => area.fields.batchType),
    [0, 0],
  );
  const sharedEffect = referencedNode(
    document,
    sharedAreas[0].fields.effect,
  );
  assert.ok(sharedEffect.fields.options.some(ref => (
    referencedNode(document, ref).fields.value === "SOIA_SHARED"
  )));
  assert.equal(document.nodes.filter(node => node.kind === "EveSpaceObjectDecal").length, 2);
  const damageSet = root.fields.locatorSets
    .map(ref => referencedNode(document, ref))
    .find(node => node.fields.name === "damage");
  assert.ok(damageSet);
  assert.equal(damageSet.fields.locators.length, 6);
  const damageLocators = damageSet.fields.locators.map(ref => referencedNode(document, ref).fields);
  assert.deepEqual(damageLocators.slice(2, 4).map(locator => locator.position), [
    [6, 0, 0],
    [8, 0, 0],
  ]);
  assert.deepEqual(damageLocators.slice(4).map(locator => locator.position), [
    [1, 9, 0],
    [1, 11, 0],
  ]);
  assert.deepEqual(damageLocators[1].scale, [3, 4, 5]);
  assert.equal(damageLocators[1].boneIndex, 15);

  const trinity = await import(trinityConsumerEntry);
  const audioTrinity = await import(audioTrinityConsumerEntry);
  const registry = CjsClassRegistry.fromMaps({ constructors: { ...trinity, ...audioTrinity } });
  const adapter = createSofHydrationAdapter();
  const hydrated = CjsDocumentHydrator.hydrate(document, { registry, adapter });
  assert.deepEqual(hydrated.reports, []);
  const hydratedLayouts = hydrated.root.effectChildren.find(child => child.name === "layouts");
  const hydratedShared = hydrated.root.effectChildren.find(child => child.name === "SharedInstancedMeshes");
  assert.equal(hydratedLayouts.objects[1].mesh.instanceGeometryResource.GetCount(), 2);
  assert.equal(hydratedLayouts.objects[1].GetInstanceTransforms().length, 2);
  assert.equal(hydratedLayouts.objects[1].decals.length, 1);
  assert.deepEqual(hydratedLayouts.objects[1].decals[0].GetStaticIndexBuffers(), [[2, 4, 6]]);
  const hydratedControlled = hydratedLayouts.objects.find(child => child.name === "controlled");
  assert.equal(hydratedControlled.objects[0].name, "Hull");
  assert.equal(hydratedControlled.objects[1].name, "layout-effect");
  assert.equal(hydratedControlled.observers.length, 1);
  assert.equal(hydratedControlled.controllers.length, 1);
  assert.equal(hydratedControlled.animationOwner, hydratedControlled.objects[0]);
  assert.equal(hydratedControlled.objects[0].animationUpdater.constructor.name, "Tr2GrannyAnimation");
  assert.equal(hydratedControlled.observers[0].observer.constructor.name, "AudEmitter");
  assert.equal(hydratedControlled.observers[0].observer.eventPrefix, "layout_");
  assert.equal(hydratedShared.GetMeshCount(), 1);
  const sharedData = hydratedShared.GetMeshData(0);
  assert.equal(sharedData.instances.length, 2);
  assert.equal(sharedData.areas.length, 2);
  assert.equal(sharedData.areas[0].effect.constructor.name, "Tr2Effect");
  assert.equal(hydratedShared.meshes.length, 1);
  assert.equal(hydratedShared.meshes[0].constructor.name, "EveChildInstancedMesh");
  assert.equal(hydratedShared.meshes[0].instances[0].constructor.name, "EveChildInstancedMeshInstance");
  const hydratedDamage = hydrated.root.locatorSets.find(set => set.name === "damage");
  assert.equal(hydratedDamage.locators.length, 6);
  assert.deepEqual(Array.from(hydratedDamage.locators[1].scale), [3, 4, 5]);
});

test("EveSOFDataMgr recursively normalizes locator sets in Carbon order", () => {
  const data = createData();
  data.hull[0].opaqueAreas = [
    { index: 4, count: 1 },
    { index: 9, count: 1 },
    { index: 4, count: 1 },
  ];
  data.hull[0].locatorSets = [
    {
      name: "A",
      locators: [{ position: [1, 0, 0], rotation: [0, 0, 0, 1], scaling: [1, 1, 1], boneIndex: 2 }],
    },
    {
      name: "ignored-group",
      locatorSets: [
        {
          name: "B",
          locators: [{ position: [2, 0, 0], rotation: [0, 0, 0, 1], scaling: [2, 2, 2], boneIndex: 3 }],
        },
        {
          name: "nested",
          locatorSets: [{
            name: "A",
            locators: [{ position: [3, 0, 0], rotation: [0, 0, 0, 1], scaling: [3, 3, 3], boneIndex: 4 }],
          }],
        },
      ],
    },
    { name: "empty", locators: [] },
  ];
  const manager = new EveSOFDataMgr();
  assert.equal(manager.SetData(data), true);
  const hull = manager.GetHullData("rifter");

  assert.deepEqual([...hull.locatorSets.keys()], ["A", "B"]);
  assert.deepEqual(hull.locatorSets.get("A").map(locator => locator.uniqueID), [0, 2]);
  assert.equal(hull.locatorSets.get("B")[0].uniqueID, 1);
  assert.equal(hull.locatorSets.has("ignored-group"), false);
  assert.equal(hull.locatorSets.has("empty"), false);
  assert.equal(hull.meshIndexToOpaqueAreaLookup.get(4), 2);
  assert.equal(hull.meshIndexToOpaqueAreaLookup.get(9), 1);
});

test("SOF locator sets apply Carbon placement matrix order and retain authored metadata", () => {
  const data = createData();
  const halfSqrt = Math.sqrt(0.5);
  const nestedOffset = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    100, 0, 0, 1,
  ];
  data.hull[0].locatorSets = [{
    name: "placement",
    locators: [{
      position: [10, 20, 30],
      rotation: [0, 0, halfSqrt, halfSqrt],
      scaling: [2, 3, 4],
      boneIndex: 5,
    }],
  }];
  Object.assign(data.hull[1], {
    geometryResFilePath: "res:/model/extension.gr2",
    boundingSphere: [0, 0, 0, 1],
    shapeEllipsoidCenter: [0, 0, 0],
    shapeEllipsoidRadius: [1, 1, 1],
    opaqueAreas: [],
    locatorSets: [{
      name: "damage",
      locators: [{
        position: [1, 0, 0],
        rotation: [0, 0, 0, 1],
        scaling: [7, 8, 9],
        boneIndex: 11,
      }],
    }],
  });
  data.layout = [{
    name: "locator-transform",
    placements: [{
      name: "placed",
      locatorSetName: "placement",
      offset: [1, 0, 0],
      descriptor: { hull: "rifter2" },
      isInstanced: false,
      isShared: false,
    }],
  }];

  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  const dna = "rifter:minmatar:minmatar:layout?locator-transform";
  const plan = sof.PlanLayoutFromDNA(dna, { offsets: [nestedOffset] });
  assert.deepEqual(plan.placements[0].transform.slice(12, 15), [110, 22, 30]);
  const document = sof.BuildFromDNA(dna, { offsets: [nestedOffset] });
  const damage = rootNode(document).fields.locatorSets
    .map(ref => referencedNode(document, ref))
    .find(node => node.fields.name === "damage");
  assert.ok(damage);
  assert.equal(damage.fields.locators.length, 1);
  const locator = referencedNode(document, damage.fields.locators[0]).fields;
  locator.position.forEach((value, index) => {
    assert.ok(Math.abs(value - [110, 24, 30][index]) < 1e-5, `position[${index}]`);
  });
  const expectedDirection = [0, 0, halfSqrt, halfSqrt];
  const directionDot = locator.direction.reduce(
    (sum, value, index) => sum + value * expectedDirection[index],
    0,
  );
  assert.ok(Math.abs(directionDot) > 1 - 1e-5, "direction quaternion");
  assert.deepEqual(locator.scale, [7, 8, 9]);
  assert.equal(locator.boneIndex, 11);
});

test("SOF applies Carbon row transforms to placed attachments, audio, and instances", () => {
  const data = createData();
  const halfSqrt = Math.sqrt(0.5);
  data.hull[0].locatorSets = [{
    name: "placement",
    locators: [{
      position: [10, 20, 30],
      rotation: [0, 0, halfSqrt, halfSqrt],
      scaling: [2, 3, 4],
      boneIndex: 5,
    }],
  }];
  Object.assign(data.hull[1], {
    geometryResFilePath: "res:/model/placed.gr2",
    boundingSphere: [0, 0, 0, 1],
    shapeEllipsoidCenter: [0, 0, 0],
    shapeEllipsoidRadius: [1, 1, 1],
    castShadow: true,
    sof6: true,
    opaqueAreas: [],
    hazeSets: [{
      hazeType: EveSOFDataHullHazeSet.HazeType.TYPE_SPHERICAL,
      visibilityGroup: "primary",
      items: [{
        colorType: 0,
        position: [6, 0, 0],
        rotation: [0, 0, 0, 1],
        scaling: [7, 8, 9],
        hazeBrightness: 1,
        saturation: 1,
        lights: [{
          translation: [0, 1, 0],
          rotation: [halfSqrt, 0, 0, halfSqrt],
          saturation: 1,
          intensity: 1,
          innerScaleMultiplier: 1,
          outerScaleMultiplier: 2,
        }],
      }],
    }],
    spotlightSets: [{
      visibilityGroup: "primary",
      items: [{
        colorType: 0,
        coneIntensity: 1,
        flareIntensity: 1,
        spriteIntensity: 1,
        transform: [
          1, 0, 0, 0,
          0, 1, 0, 0,
          0, 0, 1, 0,
          1, 0, 0, 1,
        ],
        light: {
          innerScaleMultiplier: 2,
          outerScaleMultiplier: 3,
        },
      }],
    }],
    soundEmitters: [{
      name: "placed-audio",
      prefix: "placed_",
      position: [0, 0, 0],
      rotation: [halfSqrt, 0, 0, halfSqrt],
      attenuationScalingFactor: 1,
    }],
    instancedMeshes: [{
      name: "placed-instance",
      displayModifier: EveSOFDataInstancedMesh.DisplayQualityModifier.SHADER_ALL,
      geometryResPath: "res:/model/instance.gr2",
      shader: "",
      instances: [{
        rotation: [0, 0, 0, 1],
        scaling: [1, 1, 1],
        translation: [1, 0, 0],
        boneIndex: 9,
      }],
    }],
  });
  data.layout = [{
    name: "placed-transforms",
    placements: [{
      name: "placed",
      locatorSetName: "placement",
      descriptor: { hull: "rifter2" },
      isInstanced: true,
      isShared: false,
    }],
  }];
  data.faction[0].visibilityGroupSet = { visibilityGroups: [{ str: "primary" }] };
  data.faction[0].colorSet = { Primary: [1, 1, 1, 1] };

  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  const document = sof.BuildFromDNA("rifter:minmatar:minmatar:layout?placed-transforms");
  const root = rootNode(document);
  const containers = root.fields.effectChildren.map(ref => referencedNode(document, ref));
  const layouts = containers.find(node => node.fields.name === "layouts");
  assert.ok(layouts);
  const attachments = layouts.fields.attachments.map(ref => referencedNode(document, ref));

  const hazeSet = attachments.find(node => node.kind === "EveHazeSet");
  const haze = referencedNode(document, hazeSet.fields.hazes[0]);
  haze.fields.position.forEach((value, index) => {
    assert.ok(Math.abs(value - [10, 32, 30][index]) < 1e-5, `haze position[${index}]`);
  });
  assert.deepEqual(haze.fields.scaling, [7, 8, 9]);
  const hazeRotationDot = haze.fields.rotation.reduce(
    (sum, value, index) => sum + value * [0, 0, halfSqrt, halfSqrt][index],
    0,
  );
  assert.ok(Math.abs(hazeRotationDot) > 1 - 1e-5, "haze rotation");
  const hazeLight = referencedNode(document, hazeSet.fields.lights[0]).fields.lightData;
  hazeLight.position.forEach((value, index) => {
    assert.ok(Math.abs(value - [9, 32, 30][index]) < 1e-5, `haze light position[${index}]`);
  });
  const hazeLightRotationDot = hazeLight.rotation.reduce(
    (sum, value, index) => sum + value * [0.5, 0.5, 0.5, 0.5][index],
    0,
  );
  assert.ok(Math.abs(hazeLightRotationDot) > 1 - 1e-5, "haze light rotation");

  const spotlightSet = attachments.find(node => node.kind === "EveSpotlightSet");
  const spotlight = referencedNode(document, spotlightSet.fields.spotlightItems[0]);
  spotlight.fields.transform.slice(12, 15).forEach((value, index) => {
    assert.ok(Math.abs(value - [10, 22, 30][index]) < 1e-5, `spotlight position[${index}]`);
  });
  const spotlightLight = referencedNode(document, spotlightSet.fields.lights[0]).fields.lightData;
  assert.ok(Math.abs(spotlightLight.innerRadius - 8) < 1e-5);
  assert.ok(Math.abs(spotlightLight.radius - 12) < 1e-5);
  const spotlightRotationDot = spotlightLight.rotation.reduce(
    (sum, value, index) => sum + value * [0, 0, halfSqrt, halfSqrt][index],
    0,
  );
  assert.ok(Math.abs(spotlightRotationDot) > 1 - 1e-5, "spotlight rotation");

  const observer = referencedNode(document, layouts.fields.observers[0]);
  observer.fields.position.forEach((value, index) => {
    assert.ok(Math.abs(value - [10, 20, 30][index]) < 1e-5, `audio position[${index}]`);
  });
  observer.fields.front.forEach((value, index) => {
    assert.ok(Math.abs(value - [1, 0, 0][index]) < 1e-5, `audio front[${index}]`);
  });

  const instanceContainer = containers.find(node => node.fields.name === "Instanced Meshes");
  const instanceChild = referencedNode(document, instanceContainer.fields.objects[0]);
  const instanceMesh = referencedNode(document, instanceChild.fields.mesh);
  const instanceData = referencedNode(document, instanceMesh.fields.instanceGeometryResource);
  const row = instanceData.fields.rows[0];
  assert.deepEqual(
    [row.transform0[3], row.transform1[3], row.transform2[3]],
    [10, 22, 30],
  );
  const auxiliary = instanceChild.fields.instanceTransforms[0];
  assert.deepEqual([auxiliary[3], auxiliary[7], auxiliary[11]], [10, 22, 30]);
});

test("EveSOFDataMgr indexes faction colors by Carbon enum value", () => {
  const data = createData();
  data.faction[0].colorSet = {
    Killmark: [17, 0, 0, 1],
    Primary: [0, 1, 2, 3],
    PrimaryForcefield: [31, 0, 0, 1],
    PrimaryDockedFX: [43, 0, 0, 1],
  };
  const manager = new EveSOFDataMgr();
  assert.equal(manager.SetData(data), true);
  const colors = manager.GetFactionData("minmatar").colorData.colors;
  assert.equal(colors.length, 44);
  assert.deepEqual(colors[0], [0, 1, 2, 3]);
  assert.deepEqual(colors[17], [17, 0, 0, 1]);
  assert.deepEqual(colors[31], [31, 0, 0, 1]);
  assert.deepEqual(colors[43], [43, 0, 0, 1]);
  assert.deepEqual(colors[1], [0, 0, 0, 1]);
});

test("EveSOFDNA resolves a Carbon DNA string without normalizing it", () => {
  const dnaString = "rifter;rifter2:minmatar:minmatar:material?rust;none:class?mobile:layout?cargo;antennae";
  const dna = new EveSOFDNA();
  dna.Setup(dnaString, createManager());

  assert.equal(dna.IsValid(), true);
  assert.equal(dna.ValidateContent(), true);
  assert.equal(dna.GetDnaString(), dnaString);
  assert.equal(dna.GetMultiHullCount(), 2);
  assert.deepEqual(dna.GetHullNames(), ["rifter", "rifter2"]);
  assert.equal(dna.GetBuildClass(), 1);
  assert.deepEqual(
    dna.GetDnaCommandArgs(EveSOFDNA.DnaCommand.CMD_LAYOUT),
    ["cargo", "antennae"],
  );
});

test("class-owned enums are exposed as frozen parent objects", () => {
  assert.equal(EveSOFDNA.DnaCommand.CMD_LAYOUT, 7);
  assert.equal(EveSOFDataArea.AreaType.TYPE_NO_OVERWRITE, EveSOFDataArea.AreaType.TYPE_MAX);
  assert.equal(EveSOFDataHull.BuildClass.BUILDCLASS_EXTENSION, 4);
  assert.equal(EveSOFDataHull.ImpactEffectType.IMPACTEFFECT_HULL, 2);
  assert.equal(Object.isFrozen(EveSOFDNA.DnaCommand), true);
  assert.equal(Object.isFrozen(EveSOFDataArea.AreaType), true);
  assert.equal(Object.isFrozen(EveSOFDataHull.BuildClass), true);
  assert.equal(Object.isFrozen(EveSOFDataHull.ImpactEffectType), true);
  assert.equal(EveSOFDataHull.BuildFilter.STANDALONE, 1);
  assert.equal(EveSOFDataHull.BuildFilter.NON_INSTANCED_PLACEMENT, 2);
  assert.equal(EveSOFDataHull.BuildFilter.INSTANCED_PLACEMENT, 4);
  assert.equal(EveSOFDataHull.BuildFilter.DEFAULT_FILTER, 0xffffffff);
  assert.equal(Object.isFrozen(EveSOFDataHull.BuildFilter), true);
  assert.equal(EveSOFDataHullDecalSetItem.Usage.USAGE_LOGO, 6);
  assert.equal(EveSOFDataHullBanner.Usage.VERTICAL_BANNER, 3);
  assert.equal(EveSOFDataHullBannerSetItem.Usage.RECRUITMENT_INFORMATION_4, 23);
  assert.equal(EveSOFDataHullBannerSetItem.Usage._USAGE_COUNT, 24);
  assert.equal(Object.isFrozen(EveSOFDataHullBanner.Usage), true);
  assert.equal(Object.isFrozen(EveSOFDataHullBannerSetItem.Usage), true);
  assert.equal(EveSOFDataLogoSet.LogoType.TYPE_MARKING_02, 4);
  assert.equal(Object.hasOwn(EveSOFDNA, "CMD_LAYOUT"), false);
  assert.equal(Object.hasOwn(EveSOFDataArea, "TYPE_PRIMARY"), false);
  assert.equal(Object.hasOwn(EveSOFDataHull, "BUILDCLASS_SHIP"), false);
});

test("SOF child defaults resolve Carbon named constants", () => {
  assert.equal(new EveSOFDataHullChild().buildFilter, 0xffffffff);
  assert.equal(new EveSOFDataHullChildSetItem().buildFilter, 0xffffffff);
  assert.equal(new EveSOFDataHullController().buildFilter, 0xffffffff);
  assert.equal(new EveSOFDataHullChildSet().visibilityGroup, "primary");
});

test("SOF projects first-hull legacy children, faction visibility, and animations", {
  skip: !existsSync(new URL("../../runtime-trinity/npm/dist/index.js", import.meta.url)),
}, async () => {
  const data = createData();
  data.hull[0].children = [
    {
      redFilePath: "res:/visible-transform.red",
      translation: [1, 2, 3],
      rotation: [0, 0, 0, 1],
      scaling: [4, 5, 6],
      lowestLodVisible: 1,
      id: 7,
      groupIndex: 10,
    },
    {
      redFilePath: "res:/hidden-child.red",
      buildFilter: EveSOFDataHull.BuildFilter.STANDALONE,
      groupIndex: 11,
    },
    {
      redFilePath: "res:/placement-only.red",
      buildFilter: EveSOFDataHull.BuildFilter.NON_INSTANCED_PLACEMENT,
      groupIndex: -1,
    },
  ];
  data.hull[0].animations = [
    {
      name: "spin-and-rate",
      id: 7,
      startRate: 2,
      endRate: 8,
      startRotationTime: 3,
      endRotationTime: 5,
      startRotationValue: [0, 0, 0, 1],
      endRotationValue: [0, 0, 1, 0],
      startTranslationTime: 1,
      endTranslationTime: 2,
      startTranslationValue: [1, 0, 0],
      endTranslationValue: [2, 0, 0],
    },
    { name: "empty", id: -1, startRate: -1, startRotationTime: -1 },
  ];
  data.hull[1].children = [{ redFilePath: "res:/ignored-second-hull.red" }];
  data.hull[1].animations = [{ name: "ignored-second-hull" }];
  data.faction[0].children = [
    { groupIndex: 10, name: "first", isVisible: false },
    { groupIndex: 10, name: "last-wins", isVisible: true },
    { groupIndex: 11, name: "hidden", isVisible: false },
  ];

  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  const dna = sof.CreateDna("rifter:minmatar:minmatar");
  assert.equal(dna.GetHullChildren().length, 3);
  assert.equal(dna.GetHullAnimations().length, 2);
  assert.equal(dna.GetFactionChildData(-1), null);
  assert.equal(dna.GetFactionChildData(10).name, "last-wins");
  assert.equal(dna.GetFactionChildData(99), null);

  const resolved = [];
  sof.SetChildResourceResolver((path, context) => {
    resolved.push([path, context.sof6]);
    return { kind: "EveTransform", target: "children", fields: {} };
  });
  const document = sof.Build("rifter", "minmatar", "minmatar");
  const root = rootNode(document);
  assert.deepEqual(resolved, [["res:/visible-transform.red", false]]);
  assert.equal(root.fields.children.length, 1);
  assert.equal(root.fields.effectChildren.length, 0);
  const child = referencedNode(document, root.fields.children[0]);
  assert.deepEqual(child.fields.translation, [1, 2, 3]);
  assert.deepEqual(child.fields.scaling, [4, 5, 6]);
  assert.equal(root.fields.curveSets.length, 2);
  const animated = referencedNode(document, root.fields.curveSets[0]);
  const empty = referencedNode(document, root.fields.curveSets[1]);
  assert.equal(animated.fields.name, "spin-and-rate");
  assert.equal(animated.fields.curves.length, 2);
  assert.equal(animated.fields.bindings.length, 1);
  assert.deepEqual(empty.fields, { name: "empty", curves: [], bindings: [] });
  const scalar = referencedNode(document, animated.fields.curves[0]);
  const rotation = referencedNode(document, animated.fields.curves[1]);
  assert.deepEqual(scalar.fields.keys.map(key => [key.time, key.value, key.interpolation, key.tangentType]), [
    [0, 2, 1, 1],
    [1, 8, 1, 1],
  ]);
  assert.deepEqual(rotation.fields.keys.map(key => [key.time, key.value]), [
    [3, [0, 0, 0, 1]],
    [5, [0, 0, 1, 0]],
  ]);
  assert.equal(root.fields.modelRotationCurve.$ref > 0, true);

  const trinity = await import(new URL("../../runtime-trinity/npm/dist/index.js", import.meta.url));
  const audioTrinity = await import(new URL("../../runtime-audio/npm/dist/trinity/index.js", import.meta.url));
  const registry = CjsClassRegistry.fromMaps({ constructors: { ...trinity, ...audioTrinity } });
  const adapter = createSofHydrationAdapter();
  const hydrated = CjsDocumentHydrator.hydrate(document, { registry, adapter });
  assert.deepEqual(hydrated.reports, []);
  assert.equal(hydrated.root.children[0].constructor.name, "EveTransform");
  assert.equal(hydrated.root.curveSets[0].bindings[0].destinationObject, hydrated.root.modelRotationCurve);
});

test("SOF6 child sets apply primary visibility and standalone filters", () => {
  const data = createData();
  data.hull[0].sof6 = true;
  data.hull[0].childSets = [
    {
      items: [
        { redFilePath: "res:/primary.red" },
        { redFilePath: "res:/placement.red", buildFilter: EveSOFDataHull.BuildFilter.NON_INSTANCED_PLACEMENT },
      ],
    },
    { visibilityGroup: "hidden", items: [{ redFilePath: "res:/hidden.red" }] },
  ];
  data.hull[0].children = [{ redFilePath: "res:/legacy-ignored.red" }];
  data.hull[0].animations = [{ name: "legacy-animation-ignored" }];
  data.faction[0].visibilityGroupSet = { visibilityGroups: [{ str: "primary" }] };

  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  const dna = sof.CreateDna("rifter:minmatar:minmatar");
  assert.equal(dna.GetHullChildSets()[0].items[0].buildFilter, 0xffffffff);
  const resolved = [];
  sof.SetChildResourceResolver(path => {
    resolved.push(path);
    return { kind: "EveChildRef", target: "effectChildren", fields: { resPath: path } };
  });
  const document = sof.Build("rifter", "minmatar", "minmatar");
  const root = rootNode(document);
  assert.deepEqual(resolved, ["res:/primary.red"]);
  assert.equal(root.fields.children.length, 0);
  assert.equal(root.fields.effectChildren.length, 1);
  assert.equal(root.fields.curveSets.length, 0);
  const child = referencedNode(document, root.fields.effectChildren[0]);
  assert.equal(child.fields.resPath, "res:/primary.red");
  assert.equal(child.fields.origin, 1);
});

test("SOF child sets hash authored empty visibility groups like Carbon", () => {
  // Carbon hashes the authored string as-is: an explicitly authored empty
  // string is its own visibility group. Only an absent value falls back to
  // "primary" (the projections use nullish, not falsy, defaults).
  const data = createData();
  data.hull[0].sof6 = true;
  data.hull[0].childSets = [
    { visibilityGroup: "", items: [{ redFilePath: "res:/empty-group.red" }] },
    { items: [{ redFilePath: "res:/default-group.red" }] },
  ];
  data.faction[0].visibilityGroupSet = { visibilityGroups: [{ str: "" }] };
  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  const resolved = [];
  sof.SetChildResourceResolver(path => {
    resolved.push(path);
    return { kind: "EveChildRef", target: "effectChildren", fields: { resPath: path } };
  });
  assert.ok(sof.Build("rifter", "minmatar", "minmatar"));
  // The faction authorizes only the empty-string group; the absent-value set
  // still resolves to "primary" and stays unplaced.
  assert.deepEqual(resolved, ["res:/empty-group.red"]);
});

test("SOF booster trails take the injected volumetric trail path", () => {
  // Carbon: trail->SetMeshResPath(g_volumetricTrailPath), a TRI setting that
  // defaults to the empty string (EveSOF.cpp:64-65,2720).
  const makeData = () => {
    const data = createData();
    data.hull[0].booster = { hasTrails: true, alwaysOn: false, items: [{}] };
    data.race[0].booster = { trailSize: [1, 2, 3, 4], trailColor: [5, 6, 7, 8] };
    return data;
  };
  const findTrails = document => {
    const boosters = referencedNode(document, rootNode(document).fields.boosters);
    return boosters.fields.trails ? referencedNode(document, boosters.fields.trails) : null;
  };

  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(makeData()), true);
  const trails = findTrails(sof.Build("rifter", "minmatar", "minmatar"));
  assert.ok(trails);
  assert.equal(trails.fields.geometryResPath, "");

  const configured = new EveSOF().Register({ volumetricTrailPath: "res:/trail.gr2" });
  assert.equal(configured.dataMgr.SetData(makeData()), true);
  const configuredTrails = findTrails(configured.Build("rifter", "minmatar", "minmatar"));
  assert.ok(configuredTrails);
  assert.equal(configuredTrails.fields.geometryResPath, "res:/trail.gr2");
});

test("SOF child resolver is explicit and synchronous", () => {
  const data = createData();
  data.hull[0].children = [{ redFilePath: "res:/child.red" }];
  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  assert.deepEqual(rootNode(sof.Build("rifter", "minmatar", "minmatar")).fields.children, []);
  assert.throws(() => sof.SetChildResourceResolver({}), /function or null/);
  sof.SetChildResourceResolver(() => Promise.resolve(null));
  assert.throws(() => sof.Build("rifter", "minmatar", "minmatar"), /must be synchronous/);
});

test("SOF async builds collect and deduplicate selected child resources", async () => {
  const data = createData();
  data.hull[0].children = [
    { redFilePath: "res:/child.red" },
    { redFilePath: "res:/child.red" },
  ];
  let loads = 0;
  const sof = new EveSOF().Register({
    resources: {
      async getObject(path, request)
      {
        loads += 1;
        assert.equal(path, "res:/child.red");
        assert.equal(request.role, "child");
        return { kind: "EveTransform", target: "children", fields: { name: "async-child" } };
      },
    },
  });
  assert.equal(sof.dataMgr.SetData(data), true);

  const document = await sof.BuildAsync("rifter", "minmatar", "minmatar");
  const root = rootNode(document);
  assert.equal(loads, 1);
  assert.equal(root.fields.children.length, 2);
  assert.equal(referencedNode(document, root.fields.children[0]).fields.name, "async-child");
});

test("SOF async builds resolve selected direct documents and existence probes deterministically", async () => {
  const data = createData();
  data.hull[0].children = [
    { redFilePath: "RES:\\CHILD.RED" },
    { redFilePath: "res:/child.red" },
    { redFilePath: "res:/x/insert/ship_insert_d.dds" },
    { redFilePath: "res:/hidden.red", groupIndex: 9 },
  ];
  data.faction[0].children = [{ groupIndex: 9, isVisible: false }];
  data.hull[0].controllers = [
    { path: "RES:\\CONTROLLER.RED" },
    { path: "res:/filtered-controller.red", buildFilter: EveSOFDataHull.BuildFilter.NON_INSTANCED_PLACEMENT },
  ];
  data.hull[0].modelRotationCurvePath = "res:/rotation.red";
  data.hull[0].modelTranslationCurvePath = "res:/translation.red";
  data.hull[0].opaqueAreas = [{
    name: "hull",
    index: 0,
    count: 1,
    areaType: 0,
    shader: "ship.fx",
    textures: [{ name: "DiffuseMap", resFilePath: "res:/x/ship_d.dds" }],
    parameters: [],
  }];
  data.faction[0].resPathInsert = "insert";
  data.generic.areaShaderLocation = "res:/effect";
  data.generic.areaShaders = [{
    shader: "ship.fx",
    parameters: [],
    defaultParameters: [],
    defaultTextures: [],
    doGenerateDepthArea: false,
    transparencyTextureName: "",
  }];

  const childDocument = {
    schema: "carbon.document",
    version: 1,
    roots: [{ name: "default", ref: { $ref: 10 } }],
    nodes: [
      { id: 10, kind: "EveTransform", fields: { name: "direct-child", children: [{ $ref: 20 }] }, raw: { rawOnly: { $ref: 30 } } },
      { id: 20, kind: "EveTransform", fields: { name: "nested", children: [] } },
      { id: 30, kind: "EveTransform", fields: { name: "raw-only", children: [] } },
    ],
  };
  const documents = new Map([
    ["res:/child.red", childDocument],
    ["res:/x/insert/ship_insert_d.dds", childDocument],
    ["res:/controller.red", carbonDocument("Tr2Controller", {})],
    ["res:/rotation.red", carbonDocument("Tr2RotationAdapter", {})],
    ["res:/translation.red", carbonDocument("Tr2TranslationAdapter", {})],
  ]);
  const requests = [];
  const sof = new EveSOF().Register({
    resources: {
      async getObject(path, request) {
        requests.push([path, request.role, request.output]);
        return documents.get(path) ?? null;
      },
      async exists(path, request) {
        requests.push([path, request.role, request.output]);
        return path === "res:/x/insert/ship_insert_d.dds";
      },
    },
  });
  assert.equal(sof.dataMgr.SetData(data), true);

  const asyncDocument = await sof.BuildFromDNAAsync("rifter:minmatar:minmatar");
  assert.deepEqual(requests.sort(), [
    ["res:/child.red", "child", "carbon.document"],
    ["res:/controller.red", "controller", "carbon.document"],
    ["res:/rotation.red", "modelRotationCurve", "carbon.document"],
    ["res:/translation.red", "modelTranslationCurve", "carbon.document"],
    ["res:/x/insert/ship_insert_d.dds", "child", "carbon.document"],
    ["res:/x/insert/ship_insert_d.dds", "exists", "boolean"],
  ].sort());

  const sync = new EveSOF();
  assert.equal(sync.dataMgr.SetData(data), true);
  sync.SetChildResourceResolver(path => documents.get(normalizeTestResourcePath(path)) ?? null);
  sync.SetObjectResourceResolver(path => documents.get(normalizeTestResourcePath(path)) ?? null);
  sync.SetResourceExistsResolver(path => normalizeTestResourcePath(path) === "res:/x/insert/ship_insert_d.dds");
  assert.deepEqual(asyncDocument, sync.BuildFromDNA("rifter:minmatar:minmatar"));

  const root = rootNode(asyncDocument);
  assert.equal(root.fields.children.length, 3);
  const imported = referencedNode(asyncDocument, root.fields.children[0]);
  assert.equal(imported.kind, "EveTransform");
  assert.deepEqual(imported.fields.scaling, [1, 1, 1]);
  assert.equal(referencedNode(asyncDocument, imported.raw.rawOnly).fields.name, "raw-only");
  assert.equal(referencedNode(asyncDocument, root.fields.controllers[0]).kind, "Tr2Controller");
  assert.equal(referencedNode(asyncDocument, root.fields.modelRotationCurve).kind, "Tr2RotationAdapter");
  assert.equal(referencedNode(asyncDocument, root.fields.modelTranslationCurve).kind, "Tr2TranslationAdapter");
  assert.equal(findTextureResourcePath(asyncDocument, "DiffuseMap"), "res:/x/insert/ship_insert_d.dds");
  assertDocumentRefsResolve(asyncDocument);

  if (existsSync(trinityConsumerEntry))
  {
    const trinity = await import(trinityConsumerEntry);
    const audioTrinity = await import(audioTrinityConsumerEntry);
    const registry = CjsClassRegistry.fromMaps({ constructors: { ...trinity, ...audioTrinity } });
    const adapter = createSofHydrationAdapter();
    const hydrated = CjsDocumentHydrator.hydrate(asyncDocument, { registry, adapter });
    assert.deepEqual(hydrated.reports, []);
    assert.equal(hydrated.root.controllers[0].IsLinked(), true);
  }
});

test("SOF async document requests deduplicate one normalized path across consumer roles", async () => {
  const data = createData();
  data.hull[0].children = [{ redFilePath: "RES:\\SHARED.RED" }];
  data.hull[0].controllers = [{ path: "res:/shared.red" }];
  let loads = 0;
  const sof = new EveSOF().Register({
    resources: {
      async getObject(path, request) {
        loads += 1;
        assert.equal(path, "res:/shared.red");
        assert.equal(request.output, "carbon.document");
        return carbonDocument("EveTransform", { name: "shared", children: [] });
      },
    },
  });
  assert.equal(sof.dataMgr.SetData(data), true);
  const document = await sof.BuildFromDNAAsync("rifter:minmatar:minmatar");
  const root = rootNode(document);
  assert.equal(loads, 1);
  assert.equal(root.fields.children.length, 1);
  assert.equal(referencedNode(document, root.fields.children[0]).fields.name, "shared");
  // The fetch deduplicates across roles, but the controller role then applies
  // Carbon's typed-load gate: an EveTransform root is not an ITr2Controller,
  // so the controller is skipped with a diagnostic (EveSOF.cpp:2024-2031).
  assert.equal(root.fields.controllers.length, 0);
  assert.deepEqual(sof.GetBuildDiagnostics(), [{
    code: "object-resource-wrong-type",
    role: "controller",
    path: "res:/shared.red",
    kind: "EveTransform",
    expected: "ITr2Controller",
  }]);
});

test("SOF enforces Carbon resource interfaces at the resolver boundary", () => {
  // Children: a root that casts to neither EveTransform nor
  // IEveSpaceObjectChild logs "not of correct type" and aborts the setup
  // pass, skipping the remaining children AND the animation pass
  // (EveSOF.cpp:1840-1844); SOF6 child sets abort identically (2000-2004).
  const data = createData();
  data.hull[0].children = [
    { redFilePath: "res:/wrong.red" },
    { redFilePath: "res:/after.red" },
  ];
  data.hull[0].animations = [{ id: -1, name: "anim", startRotationTime: 0, startRotationValue: [0, 0, 0, 1], endRotationTime: 1, endRotationValue: [0, 0, 0, 1], startRate: -1 }];
  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  const resolved = [];
  sof.SetChildResourceResolver(path => {
    resolved.push(path);
    return path === "res:/wrong.red"
      ? { kind: "Tr2Effect", target: "effectChildren", fields: {} }
      : { kind: "EveTransform", fields: {} };
  });
  const document = sof.Build("rifter", "minmatar", "minmatar");
  const root = rootNode(document);
  assert.deepEqual(resolved, ["res:/wrong.red"]);
  assert.equal(root.fields.children.length, 0);
  assert.equal(root.fields.effectChildren.length, 0);
  assert.equal(root.fields.curveSets.length, 0, "animation pass is skipped like Carbon");
  assert.deepEqual(sof.GetBuildDiagnostics(), [{
    code: "child-resource-wrong-type",
    path: "res:/wrong.red",
    kind: "Tr2Effect",
    target: "effectChildren",
  }]);

  // Model curves: Carbon's typed loads silently skip non-conforming roots
  // (EveSOF.cpp:1672-1690); the builder records the same rejection as a
  // diagnostic. A descriptor may claim interface conformance explicitly.
  const curveData = createData();
  curveData.hull[0].modelRotationCurvePath = "res:/rotation.red";
  curveData.hull[0].modelTranslationCurvePath = "res:/translation.red";
  const curveSof = new EveSOF();
  assert.equal(curveSof.dataMgr.SetData(curveData), true);
  curveSof.SetObjectResourceResolver(path => path.includes("rotation")
    ? { kind: "Tr2CurveScalar", fields: {} }
    : { kind: "CjsCustomCurve", implements: ["ITriVectorFunction"], fields: {} });
  const curveDocument = curveSof.Build("rifter", "minmatar", "minmatar");
  const curveRoot = rootNode(curveDocument);
  assert.equal(curveRoot.fields.modelRotationCurve, null);
  assert.ok(curveRoot.fields.modelTranslationCurve, "implements claim satisfies the gate");
  assert.deepEqual(curveSof.GetBuildDiagnostics(), [{
    code: "object-resource-wrong-type",
    role: "modelRotationCurve",
    path: "res:/rotation.red",
    kind: "Tr2CurveScalar",
    expected: "ITriQuaternionFunction",
  }]);

  // SOF6 child sets: the wrong-type return abandons the remaining sets.
  const sof6Data = createData();
  sof6Data.hull[0].sof6 = true;
  sof6Data.hull[0].childSets = [
    { items: [{ redFilePath: "res:/wrong.red" }] },
    { items: [{ redFilePath: "res:/valid.red" }] },
  ];
  sof6Data.faction[0].visibilityGroupSet = { visibilityGroups: [{ str: "primary" }] };
  const sof6 = new EveSOF();
  assert.equal(sof6.dataMgr.SetData(sof6Data), true);
  sof6.SetChildResourceResolver(path => path === "res:/wrong.red"
    ? { kind: "Tr2Effect", target: "effectChildren", fields: {} }
    : { kind: "EveChildMesh", fields: {} });
  const sof6Root = rootNode(sof6.Build("rifter", "minmatar", "minmatar"));
  assert.equal(sof6Root.fields.children.length, 0);
  assert.equal(sof6Root.fields.effectChildren.length, 0);
});

test("SOF async builds isolate concurrent descriptor and existence results", async () => {
  const data = createData();
  data.hull[0].children = [{ redFilePath: "res:/child.red" }];
  data.hull[0].opaqueAreas = [{
    name: "hull",
    index: 0,
    count: 1,
    areaType: 0,
    shader: "ship.fx",
    textures: [{ name: "DiffuseMap", resFilePath: "res:/x/ship_d.dds" }],
    parameters: [],
  }];
  data.faction[0].resPathInsert = "insert";
  data.generic.areaShaderLocation = "res:/effect";
  data.generic.areaShaders = [{
    shader: "ship.fx",
    parameters: [],
    defaultParameters: [],
    defaultTextures: [],
    doGenerateDepthArea: false,
    transparencyTextureName: "",
  }];

  let documentCall = 0;
  let existenceCall = 0;
  const documentResolvers = [];
  const existenceResolvers = [];
  const sof = new EveSOF().Register({
    resources: {
      getObject() {
        const call = ++documentCall;
        return new Promise(resolve => documentResolvers.push(() => resolve(
          carbonDocument("EveTransform", { name: `call-${call}`, children: [] }),
        )));
      },
      exists() {
        const call = ++existenceCall;
        return new Promise(resolve => existenceResolvers.push(() => resolve(call === 1)));
      },
    },
  });
  sof.SetResourceExistsResolver(() => false);
  assert.equal(sof.dataMgr.SetData(data), true);

  const firstPending = sof.BuildFromDNAAsync("rifter:minmatar:minmatar");
  const secondPending = sof.BuildFromDNAAsync("rifter:minmatar:minmatar");
  assert.equal(documentResolvers.length, 2);
  assert.equal(existenceResolvers.length, 2);

  sof.allowFileCaching = false;
  sof.SetChildResourceResolver(() => ({
    kind: "EveTransform",
    target: "children",
    fields: { name: "latest-sync", children: [] },
  }));
  documentResolvers[1]();
  existenceResolvers[1]();
  const second = await secondPending;
  documentResolvers[0]();
  existenceResolvers[0]();
  const first = await firstPending;
  assert.deepEqual([first, second].map(document => {
    const root = rootNode(document);
    return referencedNode(document, root.fields.children[0]).fields.name;
  }), ["call-1", "call-2"]);
  assert.deepEqual([first, second].map(document => findTextureResourcePath(document, "DiffuseMap")), [
    "res:/x/insert/ship_insert_d.dds",
    "res:/x/ship_d.dds",
  ]);
  assert.equal(documentCall, 2);
  assert.equal(existenceCall, 2);
  assert.equal(sof.allowFileCaching, false);
  const postBuild = sof.BuildFromDNA("rifter:minmatar:minmatar");
  assert.equal(findTextureResourcePath(postBuild, "DiffuseMap"), "res:/x/ship_d.dds");
  assert.equal(referencedNode(postBuild, rootNode(postBuild).fields.children[0]).fields.name, "latest-sync");
});

test("SOF async dependency failures are stable and null remains optional", async () => {
  const data = createData();
  data.hull[0].children = [{ redFilePath: "res:/optional.red" }];
  data.hull[0].controllers = [{ path: "RES:\\BROKEN.RED" }];
  const cause = new Error("adapter failed");
  const sof = new EveSOF().Register({
    resources: {
      async getObject(path) {
        if (path === "res:/optional.red") return null;
        throw cause;
      },
    },
  });
  assert.equal(sof.dataMgr.SetData(data), true);
  await assert.rejects(sof.BuildFromDNAAsync("rifter:minmatar:minmatar"), error => {
    assert.equal(error.code, "EVE_SOF_RESOURCE_RESOLUTION_FAILED");
    assert.equal(error.path, "res:/broken.red");
    assert.equal(error.role, "controller");
    assert.equal(error.cause, cause);
    return true;
  });

  data.hull[0].controllers = [];
  const optional = new EveSOF().Register({ resources: { getObject: async () => null } });
  assert.equal(optional.dataMgr.SetData(data), true);
  assert.deepEqual(rootNode(await optional.BuildFromDNAAsync("rifter:minmatar:minmatar")).fields.children, []);

  const dataLoad = new EveSOF().Register({
    dataPath: "RES:\\SOF\\BROKEN.BLACK",
    resources: { getObject: async () => { throw cause; } },
  });
  await assert.rejects(dataLoad.LoadDataAsync(), error => {
    assert.equal(error.code, "EVE_SOF_RESOURCE_RESOLUTION_FAILED");
    assert.equal(error.path, "res:/sof/broken.black");
    assert.equal(error.role, "sofData");
    assert.equal(error.cause, cause);
    return true;
  });
  dataLoad.Register({ resources: { getObject: async () => createData() } });
  assert.equal(await dataLoad.LoadDataAsync(), true);

  const existsData = configureTestTextureInsert(createData());
  const existsFailure = new EveSOF().Register({
    resources: { exists: async () => { throw cause; } },
  });
  assert.equal(existsFailure.dataMgr.SetData(existsData), true);
  await assert.rejects(existsFailure.BuildFromDNAAsync("rifter:minmatar:minmatar"), error => {
    assert.equal(error.code, "EVE_SOF_RESOURCE_RESOLUTION_FAILED");
    assert.equal(error.path, "res:/x/insert/ship_insert_d.dds");
    assert.equal(error.role, "exists");
    assert.equal(error.cause, cause);
    return true;
  });
});

test("SOF async collection skips hidden, build-filtered, and unplaced-layout dependencies", async () => {
  const data = createData();
  data.hull[0].sof6 = true;
  data.hull[0].childSets = [
    { visibilityGroup: "primary", items: [{ redFilePath: "res:/selected.red" }] },
    { visibilityGroup: "hidden", items: [{ redFilePath: "res:/hidden.red" }] },
  ];
  data.hull[0].controllers = [{
    path: "res:/filtered-controller.red",
    buildFilter: EveSOFDataHull.BuildFilter.NON_INSTANCED_PLACEMENT,
  }];
  data.hull[1].childSets = [{ items: [{ redFilePath: "res:/unplaced.red" }] }];
  data.hull[0].locatorSets = [{ name: "empty", locators: [] }];
  data.faction[0].visibilityGroupSet = { visibilityGroups: [{ str: "primary" }] };
  data.layout = [{
    name: "skip",
    seed: 1,
    placements: [{ name: "unplaced", locatorSetName: "empty", descriptor: { hull: "rifter2" } }],
  }];

  const requests = [];
  const sof = new EveSOF().Register({
    resources: {
      async getObject(path, request) {
        requests.push([path, request.role]);
        return carbonDocument("EveTransform", { children: [] });
      },
    },
  });
  assert.equal(sof.dataMgr.SetData(data), true);
  await sof.BuildFromDNAAsync("rifter:minmatar:minmatar:layout?skip");
  assert.deepEqual(requests, [["res:/selected.red", "child"]]);
});

test("synchronous existence resolution rejects promise results", () => {
  const data = createData();
  data.hull[0].opaqueAreas = [{
    name: "hull",
    index: 0,
    count: 1,
    areaType: 0,
    shader: "ship.fx",
    textures: [{ name: "DiffuseMap", resFilePath: "res:/x/ship_d.dds" }],
    parameters: [],
  }];
  data.faction[0].resPathInsert = "insert";
  data.generic.areaShaderLocation = "res:/effect";
  data.generic.areaShaders = [{
    shader: "ship.fx",
    parameters: [],
    defaultParameters: [],
    defaultTextures: [],
    doGenerateDepthArea: false,
    transparencyTextureName: "",
  }];
  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  sof.SetResourceExistsResolver(() => Promise.resolve(true));
  assert.throws(() => sof.BuildFromDNA("rifter:minmatar:minmatar"), /must be synchronous/);

  const manager = new EveSOFDataMgr();
  manager.SetResourceLoader(async () => createData());
  assert.throws(() => manager.LoadData("res:/sof/data.black"), /requires a synchronous loader/);
});

test("runtime-SOF async boundary introduces no engine or format-layer imports", () => {
  const specifiers = [];
  const importDeclarations = [];
  for (const file of collectJavaScriptFiles(new URL("../src/", import.meta.url)))
  {
    const source = readFileSync(file, "utf8");
    importDeclarations.push(...source.match(/^\s*import\b.*;$/gmu) ?? []);
    for (const match of source.matchAll(/(?:\bfrom\s+|\bimport\s*\(\s*|\bimport\s+)(["'])([^"']+)\1/gmu))
    {
      specifiers.push(match[2]);
    }
  }
  for (const manifestPath of ["../package.json", "../npm.package.json"])
  {
    const manifest = JSON.parse(readFileSync(new URL(manifestPath, import.meta.url), "utf8"));
    for (const key of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"])
    {
      specifiers.push(...Object.keys(manifest[key] ?? {}));
    }
  }
  // Maintainer decision 2026-07-24: the black FORMAT reader is a sanctioned
  // dependency (EveSOF.Create ingests raw data.black bytes); the resource
  // MANAGER layer (CjsResMan and the rest of runtime-resource) stays
  // forbidden - only the /formats/black subpath may be imported.
  const allowed = new Set(["@carbonenginejs/runtime-resource", "@carbonenginejs/runtime-resource/formats/black"]);
  const forbidden = /(?:^|[/@_-])(?:engine|runtime-(?:engine|trinity|resource)|webgl|webgpu|shader-format|format-shader|dxbc|hlsl)(?:$|[/_-])/iu;
  assert.deepEqual(specifiers.filter(specifier => forbidden.test(specifier) && !allowed.has(specifier)), []);
  assert.doesNotMatch(importDeclarations.join("\n"), /\b(?:CjsLibrary|CjsResMan)\b/u);
});

test("SOF imports complete child carbon.document fragments with remapped refs", {
  skip: !existsSync(new URL("../../runtime-trinity/npm/dist/index.js", import.meta.url)),
}, async () => {
  const data = createData();
  data.hull[0].children = [{
    redFilePath: "res:/nested-transform.red",
    translation: [9, 8, 7],
    scaling: [2, 3, 4],
  }];
  const fragment = {
    schema: "carbon.document",
    version: 1,
    roots: [{ name: "default", ref: { $ref: 40 } }],
    nodes: [
      { id: 40, kind: "EveTransform", fields: { children: [{ $ref: 90 }] }, raw: { importedChild: { $ref: 90 } } },
      { id: 90, kind: "EveTransform", fields: { children: [] } },
    ],
  };
  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  sof.SetChildResourceResolver(() => ({
    document: fragment,
    target: "children",
  }));
  const document = sof.Build("rifter", "minmatar", "minmatar");
  const root = rootNode(document);
  const importedRoot = referencedNode(document, root.fields.children[0]);
  const importedChild = referencedNode(document, importedRoot.fields.children[0]);
  assert.equal(importedRoot.kind, "EveTransform");
  assert.equal(importedChild.kind, "EveTransform");
  assert.notEqual(importedRoot.id, 40);
  assert.notEqual(importedChild.id, 90);
  assert.equal(importedRoot.raw.importedChild.$ref, importedChild.id);
  assert.deepEqual(importedRoot.fields.translation, [9, 8, 7]);

  const trinity = await import(new URL("../../runtime-trinity/npm/dist/index.js", import.meta.url));
  const audioTrinity = await import(new URL("../../runtime-audio/npm/dist/trinity/index.js", import.meta.url));
  const registry = CjsClassRegistry.fromMaps({ constructors: { ...trinity, ...audioTrinity } });
  const hydrated = CjsDocumentHydrator.hydrate(document, {
    registry,
    adapter: createSofHydrationAdapter(),
  });
  assert.deepEqual(hydrated.reports, []);
  assert.equal(hydrated.root.children[0].children[0].constructor.name, "EveTransform");

  const invalid = new EveSOF();
  assert.equal(invalid.dataMgr.SetData(data), true);
  invalid.SetChildResourceResolver(() => ({
    document: { ...fragment, nodes: [{ id: 40, kind: "EveTransform", fields: { children: [{ $ref: 999 }] } }] },
    target: "children",
  }));
  assert.throws(() => invalid.Build("rifter", "minmatar", "minmatar"), /ref 999 does not exist/);
});

test("legacy child animations bind only recursively reachable dynamic emitters", () => {
  const data = createData();
  data.hull[0].children = [{ redFilePath: "res:/particles.red", id: 4 }];
  data.hull[0].animations = [{ name: "rate", id: 4, startRate: 1, endRate: 9 }];
  const fragment = {
    schema: "carbon.document",
    version: 1,
    roots: [{ name: "default", ref: { $ref: 1 } }],
    nodes: [
      { id: 1, kind: "EveChildContainer", fields: { objects: [{ $ref: 2 }] } },
      { id: 2, kind: "EveChildParticleSystem", fields: { particleEmitters: [{ $ref: 3 }, { $ref: 4 }] } },
      { id: 3, kind: "Tr2DynamicEmitter", fields: { rate: 0 } },
      { id: 4, kind: "Tr2GpuUniqueEmitter", fields: { rate: 0 } },
    ],
  };
  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  sof.SetChildResourceResolver(() => ({ document: fragment, target: "effectChildren" }));
  const document = sof.Build("rifter", "minmatar", "minmatar");
  const root = rootNode(document);
  const curveSet = referencedNode(document, root.fields.curveSets[0]);
  assert.equal(curveSet.fields.curves.length, 1);
  assert.equal(curveSet.fields.bindings.length, 1);
  const binding = referencedNode(document, curveSet.fields.bindings[0]);
  assert.equal(binding.fields.sourceAttribute, "currentValue");
  assert.equal(binding.fields.destinationAttribute, "rate");
  assert.equal(referencedNode(document, binding.fields.destinationObject).kind, "Tr2DynamicEmitter");
});

test("SOF emits first-hull audio, filtered controllers, and model curve resources", {
  skip: !existsSync(new URL("../../runtime-trinity/npm/dist/index.js", import.meta.url)),
}, async () => {
  const data = createData();
  data.hull[0].soundEmitters = [{
    name: "engine",
    prefix: "ship_",
    position: [1, 2, 3],
    rotation: [0, 1, 0, 0],
    attenuationScalingFactor: 2.5,
  }];
  data.hull[0].controllers = [
    { path: "res:/standalone-controller.red" },
    { path: "res:/placement-controller.red", buildFilter: EveSOFDataHull.BuildFilter.NON_INSTANCED_PLACEMENT },
  ];
  data.hull[0].modelRotationCurvePath = "res:/rotation.red";
  data.hull[0].modelTranslationCurvePath = "res:/translation.red";
  data.hull[0].animations = [{
    name: "authored-rotation",
    startRotationTime: 0,
    endRotationTime: 1,
    startRotationValue: [0, 0, 0, 1],
    endRotationValue: [0, 0, 1, 0],
  }];
  data.hull[1].soundEmitters = [{ name: "ignored" }];
  data.hull[1].controllers = [{ path: "res:/ignored.red" }];

  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  const dna = sof.CreateDna("rifter:minmatar:minmatar");
  assert.equal(dna.GetHullSoundEmitters().length, 1);
  assert.equal(dna.GetHullControllers()[0].buildFilter, 0xffffffff);
  assert.equal(dna.GetModelRotationCurvePath(), "res:/rotation.red");
  assert.equal(dna.GetModelTranslationCurvePath(), "res:/translation.red");

  const resolved = [];
  sof.SetObjectResourceResolver((path, context) => {
    resolved.push([path, context.role]);
    if (context.role === "controller") return { kind: "Tr2ControllerReference", fields: { name: "controller" } };
    if (context.role === "modelRotationCurve") return { kind: "Tr2RotationAdapter", fields: {} };
    return { kind: "Tr2TranslationAdapter", fields: {} };
  });
  const document = sof.Build("rifter", "minmatar", "minmatar");
  const root = rootNode(document);
  assert.deepEqual(resolved, [
    ["res:/standalone-controller.red", "controller"],
    ["res:/rotation.red", "modelRotationCurve"],
    ["res:/translation.red", "modelTranslationCurve"],
  ]);
  assert.equal(root.fields.observers.length, 1);
  assert.equal(root.fields.controllers.length, 1);
  const observer = referencedNode(document, root.fields.observers[0]);
  assert.deepEqual(observer.fields.position, [1, 2, 3]);
  assert(Math.abs(observer.fields.front[0]) < 1e-6);
  assert(Math.abs(observer.fields.front[1]) < 1e-6);
  assert(Math.abs(observer.fields.front[2] + 1) < 1e-6);
  // The emitter is a declared node in the observer's own slot, and `raw` has no
  // writer left in this package.
  const emitter = referencedNode(document, observer.fields.observer);
  assert.equal(emitter.kind, "AudEmitter");
  assert.deepEqual(emitter.fields, {
    name: "engine",
    eventPrefix: "ship_",
    position: [1, 2, 3],
    scalingFactor: 2.5,
  });
  assert.equal(observer.raw, undefined);
  assert.equal(referencedNode(document, root.fields.controllers[0]).kind, "Tr2ControllerReference");
  assert.equal(referencedNode(document, root.fields.modelRotationCurve).kind, "Tr2RotationAdapter");
  assert.equal(referencedNode(document, root.fields.modelTranslationCurve).kind, "Tr2TranslationAdapter");
  const animationSet = referencedNode(document, root.fields.curveSets[0]);
  const animationBinding = referencedNode(document, animationSet.fields.bindings[0]);
  assert.notEqual(animationBinding.fields.destinationObject.$ref, root.fields.modelRotationCurve.$ref);

  const trinity = await import(new URL("../../runtime-trinity/npm/dist/index.js", import.meta.url));
  const audioTrinity = await import(new URL("../../runtime-audio/npm/dist/trinity/index.js", import.meta.url));
  const registry = CjsClassRegistry.fromMaps({ constructors: { ...trinity, ...audioTrinity } });
  const adapter = createSofHydrationAdapter();
  const hydrated = CjsDocumentHydrator.hydrate(document, { registry, adapter });
  assert.deepEqual(hydrated.reports, []);
  assert.equal(hydrated.root.observers[0].constructor.name, "TriObserverLocal");
  assert.equal(hydrated.root.observers[0].observer.constructor.name, "AudEmitter");
  assert.equal(hydrated.root.observers[0].observer.eventPrefix, "ship_");
  assert.equal(hydrated.root.modelRotationCurve.constructor.name, "Tr2RotationAdapter");
  assert.equal(hydrated.root.modelTranslationCurve.constructor.name, "Tr2TranslationAdapter");
});

test("SOF object resource resolution is explicit and synchronous", () => {
  const data = createData();
  data.hull[0].controllers = [{ path: "res:/controller.red" }];
  data.hull[0].modelRotationCurvePath = "res:/missing-rotation.red";
  data.hull[0].animations = [{
    name: "fallback",
    startRotationTime: 0,
    endRotationTime: 1,
    startRotationValue: [0, 0, 0, 1],
    endRotationValue: [0, 0, 1, 0],
  }];
  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  const unresolvedDocument = sof.Build("rifter", "minmatar", "minmatar");
  const unresolved = rootNode(unresolvedDocument);
  // Without a resolver the controller defers through Carbon's own
  // Tr2ControllerReference node instead of dropping silently.
  assert.equal(unresolved.fields.controllers.length, 1);
  const controllerRef = referencedNode(unresolvedDocument, unresolved.fields.controllers[0]);
  assert.equal(controllerRef.kind, "Tr2ControllerReference");
  assert.equal(controllerRef.fields.path, "res:/controller.red");
  assert.equal(unresolved.fields.modelRotationCurve.$ref > 0, true);
  assert.equal(sof.CreateDna("rifter:minmatar:minmatar").GetModelTranslationCurvePath(), null);
  assert.throws(() => sof.SetObjectResourceResolver(false), /function or null/);
  sof.SetObjectResourceResolver(() => Promise.resolve(null));
  assert.throws(() => sof.Build("rifter", "minmatar", "minmatar"), /must be synchronous/);
});

test("SOF emits and hydrates Carbon decal sets with uint32 static indices", {
  skip: !existsSync(new URL("../../runtime-trinity/npm/dist/index.js", import.meta.url)),
}, async () => {
  const buffer = new EveSOFDataDecalIndexBuffer();
  buffer.AddIndex(0);
  buffer.AddIndex(1);
  buffer.AddIndex(70000);
  assert.equal(buffer.indexBuffer instanceof Uint32Array, true);
  assert.deepEqual(buffer.GetIndices(), [0, 1, 70000]);

  const data = createData();
  data.hull[0].opaqueAreas = [{
    name: "Hull",
    index: 9,
    count: 1,
    areaType: 0,
    shader: "ship.fx",
    textures: [{ name: "ParentMap", resFilePath: "res:/parent.dds" }],
    parameters: [],
  }];
  data.hull[0].decalSets = [{
    name: "discarded",
    visibilityGroup: "primary",
    items: [{
      name: "discarded-item",
      usage: EveSOFDataHullDecalSetItem.Usage.USAGE_GLOWCYLINDRICAL,
      position: [1, 2, 3],
      rotation: [0, 0, 0, 1],
      scaling: [4, 5, 6],
      boneIndex: 7,
      meshIndex: 9,
      glowColorType: 17,
      logoType: EveSOFDataLogoSet.LogoType.TYPE_PRIMARY,
      textures: [
        { name: "AMap", resFilePath: "res:/old.dds" },
        { name: "AMap", resFilePath: "res:/item.dds" },
      ],
      parameters: [
        { name: "P", value: [1, 2, 3, 4] },
        { name: "P", value: [5, 6, 7, 8] },
      ],
      indexBuffers: [{ indexBuffer: new Uint32Array([0, 1, 70000]) }],
      multiHullIndexBuffers: [],
    }],
  }];
  data.faction[0].colorSet = { Killmark: [0.25, 0.5, 0.75, 1] };
  data.faction[0].visibilityGroupSet = { visibilityGroups: [{ str: "primary" }] };
  data.generic.areaShaderLocation = "res:/area";
  data.generic.decalShaderLocation = "res:/decal";
  data.generic.shaderPrefix = "static_";
  data.generic.areaShaders = [{
    shader: "ship.fx",
    parameters: [],
    defaultParameters: [],
    defaultTextures: [],
    doGenerateDepthArea: false,
    transparencyTextureName: "",
  }];
  data.generic.decalShaders = [{
    shader: "decalglowcylindricv5.fx",
    parameters: [],
    defaultTextures: [
      { name: "AMap", resFilePath: "res:/default-loses.dds" },
      { name: "DefaultMap", resFilePath: "res:/default.dds" },
    ],
    parentTextures: [{ str: "ParentMap" }],
    additive: true,
  }];

  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  const document = sof.Build("rifter", "minmatar", "minmatar");
  const decalNode = referencedNode(document, rootNode(document).fields.decals[0]);
  assert.deepEqual(decalNode.fields.position, [1, 2, 3]);
  assert.equal(decalNode.fields.parentBoneIndex, 7);
  assert.equal(decalNode.fields.minScreenSize, 10);
  assert.deepEqual(decalNode.fields.staticIndexBuffers, [[0, 1, 70000]]);
  const effect = referencedNode(document, decalNode.fields.decalEffect);
  assert.equal(effect.fields.effectFilePath, "res:/decal/static_decalglowcylindricv5.fx");
  assert.deepEqual(effect.fields.constParameters.map(ref => referencedNode(document, ref).fields), [
    { name: "DecalGlowColor", value: [0.25, 0.5, 0.75, 1] },
    { name: "P", value: [5, 6, 7, 8] },
  ]);
  assert.deepEqual(effect.fields.resources.map(ref => referencedNode(document, ref).fields), [
    { name: "AMap", resourcePath: "res:/item.dds" },
    { name: "DefaultMap", resourcePath: "res:/default.dds" },
    { name: "ParentMap", resourcePath: "res:/parent.dds" },
  ]);

  const trinity = await import(new URL("../../runtime-trinity/npm/dist/index.js", import.meta.url));
  const audioTrinity = await import(new URL("../../runtime-audio/npm/dist/trinity/index.js", import.meta.url));
  const registry = CjsClassRegistry.fromMaps({ constructors: { ...trinity, ...audioTrinity } });
  const hydrated = CjsDocumentHydrator.hydrate(document, {
    registry,
    adapter: createSofHydrationAdapter(),
  });
  assert.deepEqual(hydrated.reports, []);
  const decal = hydrated.root.decals[0];
  assert.deepEqual(decal.GetStaticIndexBuffers(), [[0, 1, 70000]]);
  assert.deepEqual(Array.from(decal.GetPosition()), [1, 2, 3]);
  assert.equal(decal.batchType, 1);
});

test("SOF selects multi-hull decal indices by the lowercased combined geometry path", () => {
  const data = createData();
  data.hull[0].decalSets = [{
    visibilityGroup: "primary",
    items: [
      {
        usage: EveSOFDataHullDecalSetItem.Usage.USAGE_STANDARD,
        indexBuffers: [{ indexBuffer: new Uint32Array([1, 2, 3]) }],
        multiHullIndexBuffers: [{
          combinedGeometryResPath: "res:/model/r2.gr2",
          indexBuffers: [{ indexBuffer: new Uint32Array([9, 8, 7]) }],
        }],
      },
      {
        usage: EveSOFDataHullDecalSetItem.Usage.USAGE_STANDARD,
        indexBuffers: [{ indexBuffer: new Uint32Array([4, 5, 6]) }],
        multiHullIndexBuffers: [{
          combinedGeometryResPath: "RES:/MODEL/R2.GR2",
          indexBuffers: [{ indexBuffer: new Uint32Array([6, 5, 4]) }],
        }],
      },
    ],
  }];
  data.faction[0].visibilityGroupSet = { visibilityGroups: [{ str: "primary" }] };
  data.generic.decalShaderLocation = "res:/decal";
  data.generic.decalShaders = [];
  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  const document = sof.BuildFromDNA("rifter;rifter2:minmatar:minmatar");
  const decals = rootNode(document).fields.decals.map(ref => referencedNode(document, ref));
  assert.deepEqual(decals[0].fields.staticIndexBuffers, [[9, 8, 7]]);
  assert.deepEqual(decals[1].fields.staticIndexBuffers, []);
});

test("SOF emits and hydrates Carbon sprite sets with SOF6 light metadata", {
  skip: !existsSync(new URL("../../runtime-trinity/npm/dist/index.js", import.meta.url)),
}, async () => {
  const data = createData();
  data.hull[0].sof6 = true;
  data.hull[0].locatorSets = [{
    name: "next_subsystem",
    locators: [{ position: [10, 0, 0] }],
  }];
  data.hull[0].spriteSets = [{
    skinned: true,
    visibilityGroup: "primary",
    items: [
      {
        position: [1, 0, 0],
        intensity: 2,
        saturation: 0,
        colorType: 0,
        blinkRate: 0.25,
        blinkPhase: 0.5,
        minScale: 2,
        maxScale: 6,
        boneIndex: 3,
      },
      {
        position: [2, 0, 0],
        colorType: 0,
        light: {
          translation: [0.5, 1, 0],
          rotation: [0, 0, 0, 1],
          saturation: 0,
          intensity: 4,
          innerScaleMultiplier: 2,
          outerScaleMultiplier: 5,
          noiseAmplitude: 0.2,
          noiseFrequency: 3,
          noiseOctaves: 2,
          lightProfilePath: "res:/profile.red",
        },
      },
    ],
  }, {
    visibilityGroup: "hidden",
    items: [{ position: [99, 0, 0], colorType: 0 }],
  }];
  data.hull[1].spriteSets = [{
    visibilityGroup: "primary",
    items: [{ position: [1, 0, 0], colorType: 0 }],
  }];
  data.faction[0].visibilityGroupSet = { visibilityGroups: [{ str: "primary" }] };
  data.faction[0].colorSet = { Primary: [1, 0, 0, 1] };

  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  const dna = sof.CreateDna("rifter;rifter2:minmatar:minmatar");
  assert.equal(dna.GetHullSpriteSets(0)[0].visibilityGroup > 0, true);
  const document = sof.BuildFromDNA("rifter;rifter2:minmatar:minmatar");
  const attachments = rootNode(document).fields.attachments.map(ref => referencedNode(document, ref));
  assert.equal(attachments.length, 2);
  assert.deepEqual(attachments.map(node => node.kind), ["EveSpriteSet", "EveSpriteSet"]);
  assert.equal(attachments[0].fields.skinned, true);
  assert.deepEqual(attachments[0].fields.effect, attachments[1].fields.effect);
  const effect = referencedNode(document, attachments[0].fields.effect);
  assert.equal(effect.fields.effectFilePath, "res:/graphics/effect/managed/space/spaceobject/fx/blinkinglightspool.fx");

  const first = referencedNode(document, attachments[0].fields.sprites[0]);
  assert.deepEqual(first.fields.position, [1, 0, 0]);
  assert.ok(Math.abs(first.fields.color[0] - 0.598) < 1e-12);
  assert.ok(Math.abs(first.fields.color[1] - 0.598) < 1e-12);
  assert.ok(Math.abs(first.fields.color[2] - 0.598) < 1e-12);
  assert.equal(first.fields.color[3], 2);
  const secondHull = referencedNode(document, attachments[1].fields.sprites[0]);
  assert.deepEqual(secondHull.fields.position, [11, 0, 0]);

  assert.equal(attachments[0].fields.lights.length, 1);
  const spriteLight = referencedNode(document, attachments[0].fields.lights[0]);
  assert.equal(spriteLight.kind, "EveSpriteLight");
  assert.equal(spriteLight.fields.index, 1);
  assert.equal(spriteLight.fields.lightProfilePath, "res:/profile.red");
  assert.deepEqual(spriteLight.fields.lightData.position, [2.5, 1, 0]);
  assert.equal(spriteLight.fields.lightData.radius, 5);
  assert.equal(spriteLight.fields.lightData.innerRadius, 2);
  assert.equal(spriteLight.fields.lightData.brightness, 4);

  const trinity = await import(new URL("../../runtime-trinity/npm/dist/index.js", import.meta.url));
  const audioTrinity = await import(new URL("../../runtime-audio/npm/dist/trinity/index.js", import.meta.url));
  const registry = CjsClassRegistry.fromMaps({ constructors: { ...trinity, ...audioTrinity } });
  const hydrated = CjsDocumentHydrator.hydrate(document, {
    registry,
    adapter: createSofHydrationAdapter(),
  });
  assert.deepEqual(hydrated.reports, []);
  assert.equal(hydrated.root.attachments[0].constructor.name, "EveSpriteSet");
  assert.equal(hydrated.root.attachments[0].lights[0].constructor.name, "EveSpriteLight");
  assert.equal(hydrated.root.attachments[0].lights[0].index, 1);
  assert.equal(hydrated.root.attachments[0].lights[0].lightData.constructor.name, "CjsLightData");
  assert.equal(hydrated.root.attachments[0].lights[0].lightData.position.constructor.name, "Float32Array");
  assert.deepEqual(Array.from(hydrated.root.attachments[1].sprites[0].position), [11, 0, 0]);
});

test("SOF emits and hydrates Carbon SOF6 spotlight sets with public typed lights", {
  skip: !existsSync(new URL("../../runtime-trinity/npm/dist/index.js", import.meta.url)),
}, async () => {
  assert.equal(new EveSOFDataHullSpotlightSet().visibilityGroup, "primary");
  assert.equal(new EveSOFDataHullSpotlightSetItem().colorType, 12);

  const data = createData();
  data.hull[0].sof6 = true;
  data.hull[0].locatorSets = [{
    name: "next_subsystem",
    locators: [{ position: [10, 0, 0] }],
  }];
  data.hull[0].spotlightSets = [{
    skinned: true,
    zOffset: 0.25,
    visibilityGroup: "primary",
    coneTextureResPath: "res:/cone.dds",
    glowTextureResPath: "res:/glow.dds",
    items: [{
      colorType: 12,
      transform: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        1, 0, 0, 1,
      ],
    }, {
      colorType: 12,
      boneIndex: 4,
      boosterGainInfluence: true,
      coneIntensity: 2,
      flareIntensity: 3,
      spriteIntensity: 4,
      saturation: 0.5,
      spriteScale: [5, 6, 7],
      transform: [
        2, 0, 0, 0,
        0, 4, 0, 0,
        0, 0, 8, 0,
        3, 0, 0, 1,
      ],
      light: {
        translation: [0, 2, 0],
        saturation: 0.5,
        intensity: 4,
        innerAngleMultiplier: 0.5,
        outerAngleMultiplier: 1.5,
        innerScaleMultiplier: 2,
        outerScaleMultiplier: 3,
        noiseAmplitude: 0.2,
        noiseFrequency: 5,
        noiseOctaves: 3,
        lightProfilePath: "res:/spotlight.profile",
      },
    }],
  }, {
    visibilityGroup: "hidden",
    items: [{ colorType: 12 }],
  }];
  data.hull[1].spotlightSets = [{
    visibilityGroup: "primary",
    coneTextureResPath: "res:/cone2.dds",
    glowTextureResPath: "res:/glow2.dds",
    items: [{
      colorType: 12,
      transform: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        1, 0, 0, 1,
      ],
    }],
  }];
  data.faction[0].visibilityGroupSet = { visibilityGroups: [{ str: "primary" }] };
  data.faction[0].colorSet = { Hull: [2, 1, 0, 1] };

  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  const dna = sof.CreateDna("rifter;rifter2:minmatar:minmatar");
  assert.equal(dna.GetHullSpotlightSets(0)[0].items[0].colorType, 12);
  const document = sof.BuildFromDNA("rifter;rifter2:minmatar:minmatar");
  const attachments = rootNode(document).fields.attachments.map(ref => referencedNode(document, ref));
  assert.deepEqual(attachments.map(node => node.kind), ["EveSpotlightSet", "EveSpotlightSet"]);
  assert.equal(attachments[0].fields.skinned, true);
  assert.notDeepEqual(attachments[0].fields.coneEffect, attachments[1].fields.coneEffect);

  const coneEffect = referencedNode(document, attachments[0].fields.coneEffect);
  const glowEffect = referencedNode(document, attachments[0].fields.glowEffect);
  assert.equal(coneEffect.fields.effectFilePath, "res:/graphics/effect/managed/space/spaceobject/fx/spotlightconepool.fx");
  assert.equal(glowEffect.fields.effectFilePath, "res:/graphics/effect/managed/space/spaceobject/fx/spotlightglowpool.fx");
  assert.deepEqual(referencedNode(document, coneEffect.fields.resources[0]).fields, {
    name: "TextureMap",
    resourcePath: "res:/cone.dds",
  });
  assert.deepEqual(referencedNode(document, glowEffect.fields.resources[0]).fields, {
    name: "TextureMap",
    resourcePath: "res:/glow.dds",
  });
  assert.deepEqual(referencedNode(document, coneEffect.fields.constParameters[0]).fields, {
    name: "zOffset",
    value: [0.25, 0.25, 0.25, 0.25],
  });

  const item = referencedNode(document, attachments[0].fields.spotlightItems[1]);
  assert.deepEqual(item.fields.spriteScale, [5, 6, 7]);
  assert.deepEqual(item.fields.coneColor, [1, 0.8125, 0.625, 2]);
  assert.deepEqual(item.fields.flareColor, [3, 2.25, 1.5, 3]);
  assert.ok(Math.abs(item.fields.spriteColor[0] - 3) < 1e-12);
  assert.ok(Math.abs(item.fields.spriteColor[1] - 2.325) < 1e-12);
  assert.ok(Math.abs(item.fields.spriteColor[2] - 1.65) < 1e-12);
  assert.equal(item.fields.spriteColor[3], 4);
  const secondHullItem = referencedNode(document, attachments[1].fields.spotlightItems[0]);
  assert.deepEqual(secondHullItem.fields.transform.slice(12, 15), [21, 0, 0]);

  assert.equal(attachments[0].fields.lights.length, 1);
  const spotlightLight = referencedNode(document, attachments[0].fields.lights[0]);
  const baseAngle = Math.atan(4 / 16) * 180 / Math.PI;
  assert.equal(spotlightLight.kind, "EveSpotlightLight");
  assert.equal(spotlightLight.fields.index, 1);
  assert.equal(spotlightLight.fields.boosterGainInfluence, true);
  assert.equal(spotlightLight.fields.lightProfilePath, "res:/spotlight.profile");
  assert.deepEqual(spotlightLight.fields.lightData.position, [3, 2, 0]);
  assert.ok(Math.abs(spotlightLight.fields.lightData.innerAngle - baseAngle * 0.5) < 1e-12);
  assert.ok(Math.abs(spotlightLight.fields.lightData.outerAngle - baseAngle * 1.5) < 1e-12);
  assert.equal(spotlightLight.fields.lightData.innerRadius, 16);
  assert.equal(spotlightLight.fields.lightData.radius, 24);
  assert.equal(spotlightLight.fields.lightData.brightness, 8);
  assert.equal(spotlightLight.fields.lightData.texturePath, "res:/spotlight.profile");

  const trinity = await import(new URL("../../runtime-trinity/npm/dist/index.js", import.meta.url));
  const audioTrinity = await import(new URL("../../runtime-audio/npm/dist/trinity/index.js", import.meta.url));
  const registry = CjsClassRegistry.fromMaps({ constructors: { ...trinity, ...audioTrinity } });
  const adapter = createSofHydrationAdapter();
  const hydrated = CjsDocumentHydrator.hydrate(document, { registry, adapter });
  assert.deepEqual(hydrated.reports, []);
  assert.equal(hydrated.root.attachments[0].constructor.name, "EveSpotlightSet");
  assert.equal(hydrated.root.attachments[0].spotlightItems.length, 2);
  assert.equal(hydrated.root.attachments[0].lights.length, 1);
  assert.equal(hydrated.root.attachments[0].lights[0].constructor.name, "EveSpotlightLight");
  assert.equal(hydrated.root.attachments[0].lights[0].lightData.constructor.name, "CjsLightData");
  assert.equal(hydrated.root.attachments[0].lights[0].lightData.rotation.constructor.name, "Float32Array");
});

test("SOF legacy spotlight sets use faction groups without SOF6 visibility filtering", () => {
  const data = createData();
  data.hull[0].spotlightSets = [{
    visibilityGroup: "not-enabled",
    items: [{ groupIndex: 99 }, {
      groupIndex: 7,
      coneIntensity: 2,
      flareIntensity: 3,
      spriteIntensity: 4,
    }],
  }];
  data.faction[0].spotlightSets = [{
    groupIndex: 7,
    coneColor: [1, 2, 3, 4],
    flareColor: [2, 3, 4, 5],
    spriteColor: [3, 4, 5, 6],
  }];

  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  const dna = sof.CreateDna("rifter:minmatar:minmatar");
  assert.deepEqual(dna.GetFactionSpotlightSetData(7).coneColor, [1, 2, 3, 4]);
  assert.equal(dna.GetFactionSpotlightSetData(-1), null);
  const document = sof.BuildFromDNA("rifter:minmatar:minmatar");
  const attachment = referencedNode(document, rootNode(document).fields.attachments[0]);
  assert.equal(attachment.kind, "EveSpotlightSet");
  assert.equal(attachment.fields.spotlightItems.length, 1);
  const item = referencedNode(document, attachment.fields.spotlightItems[0]);
  assert.deepEqual(item.fields.coneColor, [2, 4, 6, 8]);
  assert.deepEqual(item.fields.flareColor, [6, 9, 12, 15]);
  assert.deepEqual(item.fields.spriteColor, [12, 16, 20, 24]);
  assert.deepEqual(attachment.fields.lights, []);
});

test("SOF emits and hydrates Carbon SOF6 plane sets with public typed blink and light state", {
  skip: !existsSync(new URL("../../runtime-trinity/npm/dist/index.js", import.meta.url)),
}, async () => {
  assert.deepEqual(EveSOFDataHullPlaneSet.Usage, {
    USAGE_STANDARD: 0,
    USAGE_SPACE_VIDEO: 2,
    USAGE_HANGAR_VIDEO: 3,
    USAGE_HAZE: 5,
  });
  assert.equal(Object.isFrozen(EveSOFDataHullPlaneSet.Usage), true);
  assert.equal(new EveSOFDataHullPlaneSet().visibilityGroup, "primary");

  const data = createData();
  data.hull[0].sof6 = true;
  data.hull[0].locatorSets = [{
    name: "next_subsystem",
    locators: [{ position: [10, 0, 0] }],
  }];
  data.hull[0].planeSets = [{
    usage: EveSOFDataHullPlaneSet.Usage.USAGE_HAZE,
    skinned: true,
    visibilityGroup: "primary",
    atlasSize: 4,
    atlasAspectRatio: [2.7, 3.9],
    layer1MapResPath: "res:/layer1.dds",
    layer2MapResPath: "res:/layer2.dds",
    maskMapResPath: "res:/mask.dds",
    items: [Object.assign(new EveSOFDataHullPlaneSetItem(), {
      position: [1, 0, 0],
      scaling: [2, 3, 4],
      colorType: 0,
      intensity: 2,
      saturation: 0,
      boneIndex: 5,
      maskMapAtlasIndex: 7,
      blinkRate: 0.25,
      blinkPhase: 0.5,
      blinkMode: 1,
      lights: [{
        translation: [0, 1, 0],
        rotation: [0, 0, 0, 1],
        saturation: 0,
        intensity: 5,
        innerScaleMultiplier: 2,
        outerScaleMultiplier: 3,
        lightProfilePath: "res:/plane.profile",
      }],
    })],
  }, {
    visibilityGroup: "hidden",
    items: [{ colorType: 0 }],
  }];
  data.hull[1].planeSets = [{
    visibilityGroup: "primary",
    items: [{ position: [1, 0, 0], colorType: 0 }],
  }];
  data.faction[0].visibilityGroupSet = { visibilityGroups: [{ str: "primary" }] };
  data.faction[0].colorSet = { Primary: [1, 0, 0, 1] };

  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  const dna = sof.CreateDna("rifter;rifter2:minmatar:minmatar");
  assert.equal(dna.GetHullPlaneSets(0)[0].items[0].dutyCycle, 1);
  const document = sof.BuildFromDNA("rifter;rifter2:minmatar:minmatar");
  const attachments = rootNode(document).fields.attachments.map(ref => referencedNode(document, ref));
  assert.deepEqual(attachments.map(node => node.kind), ["EvePlaneSet", "EvePlaneSet"]);
  assert.equal(attachments[0].fields.skinned, true);
  assert.equal(attachments[0].fields.pickBufferID, 0);
  const effect = referencedNode(document, attachments[0].fields.effect);
  assert.equal(effect.fields.effectFilePath, "res:/graphics/effect/managed/space/spaceobject/fx/skinned_planeglow.fx");
  assert.deepEqual(referencedNode(document, effect.fields.constParameters[0]).fields, {
    name: "PlaneData",
    value: [1, 4, 2, 3],
  });
  assert.deepEqual(effect.fields.resources.map(ref => referencedNode(document, ref).fields), [{
    name: "Layer1Map",
    resourcePath: "res:/layer1.dds",
  }, {
    name: "Layer2Map",
    resourcePath: "res:/layer2.dds",
  }, {
    name: "MaskMap",
    resourcePath: "res:/mask.dds",
  }]);
  const item = referencedNode(document, attachments[0].fields.planes[0]);
  assert.deepEqual(item.fields.position, [1, 0, 0]);
  assert.deepEqual(item.fields.blinkData, [0.25, 0.5, 1, 1]);
  assert.ok(Math.abs(item.fields.color[0] - 0.598) < 1e-12);
  assert.ok(Math.abs(item.fields.color[1] - 0.598) < 1e-12);
  assert.ok(Math.abs(item.fields.color[2] - 0.598) < 1e-12);
  assert.equal(item.fields.color[3], 2);
  const nextHullItem = referencedNode(document, attachments[1].fields.planes[0]);
  assert.deepEqual(nextHullItem.fields.position, [11, 0, 0]);

  assert.equal(attachments[0].fields.imageMapParameter, null);
  assert.equal(attachments[0].fields.layerMap1Parameter.$ref, effect.fields.resources[0].$ref);
  assert.equal(attachments[0].fields.layerMap2Parameter.$ref, effect.fields.resources[1].$ref);
  assert.equal(attachments[0].fields.maskMapParameter.$ref, effect.fields.resources[2].$ref);
  assert.equal(attachments[0].fields.lights.length, 1);
  const planeLight = referencedNode(document, attachments[0].fields.lights[0]);
  assert.equal(planeLight.kind, "EvePlaneLight");
  assert.equal(planeLight.fields.index, 0);
  assert.equal(planeLight.fields.blinkPhase, 0.5);
  assert.equal(planeLight.fields.blinkRate, 0.25);
  assert.equal(planeLight.fields.lightProfilePath, "res:/plane.profile");
  assert.deepEqual(planeLight.fields.lightData.position, [1, 1, 0]);
  assert.equal(planeLight.fields.lightData.innerRadius, 8);
  assert.equal(planeLight.fields.lightData.radius, 12);
  assert.equal(planeLight.fields.lightData.brightness, 5);

  const trinity = await import(new URL("../../runtime-trinity/npm/dist/index.js", import.meta.url));
  const audioTrinity = await import(new URL("../../runtime-audio/npm/dist/trinity/index.js", import.meta.url));
  const registry = CjsClassRegistry.fromMaps({ constructors: { ...trinity, ...audioTrinity } });
  const hydrated = CjsDocumentHydrator.hydrate(document, {
    registry,
    adapter: createSofHydrationAdapter(),
  });
  assert.deepEqual(hydrated.reports, []);
  assert.equal(hydrated.root.attachments[0].constructor.name, "EvePlaneSet");
  assert.deepEqual(Array.from(hydrated.root.attachments[0].planes[0].blinkData), [0.25, 0.5, 1, 1]);
  assert.equal(hydrated.root.attachments[0].lights[0].constructor.name, "EvePlaneLight");
  assert.equal(hydrated.root.attachments[0].lights[0].lightData.constructor.name, "CjsLightData");
  assert.equal(hydrated.root.attachments[0].lights[0].lightData.position.constructor.name, "Float32Array");
});

test("SOF legacy hangar-video plane sets use faction colors without SOF6 visibility filtering", () => {
  const data = createData();
  data.hull[0].planeSets = [{
    usage: EveSOFDataHullPlaneSet.Usage.USAGE_HANGAR_VIDEO,
    visibilityGroup: "not-enabled",
    items: [{ groupIndex: 7, color: [1, 1, 1, 1] }],
  }];
  data.faction[0].planeSets = [{ groupIndex: 7, color: [2, 3, 4, 5] }];

  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  const dna = sof.CreateDna("rifter:minmatar:minmatar");
  assert.deepEqual(dna.GetFactionPlaneSetData(7).color, [2, 3, 4, 5]);
  assert.equal(dna.GetFactionPlaneSetData(-1), null);
  const document = sof.BuildFromDNA("rifter:minmatar:minmatar");
  const attachment = referencedNode(document, rootNode(document).fields.attachments[0]);
  assert.equal(attachment.kind, "EvePlaneSet");
  assert.equal(attachment.fields.pickBufferID, 100);
  const effect = referencedNode(document, attachment.fields.effect);
  assert.equal(effect.fields.effectFilePath, "res:/graphics/effect/managed/space/spaceobject/fx/planehologram.fx");
  assert.deepEqual(referencedNode(document, effect.fields.resources[0]).fields, {
    name: "ImageMap",
    resourcePath: "dynamic:/hangarvideos",
  });
  const item = referencedNode(document, attachment.fields.planes[0]);
  assert.deepEqual(item.fields.color, [2, 3, 4, 5]);
  assert.deepEqual(attachment.fields.lights, []);
});

test("SOF emits Carbon sprite-line sets with shared effects and per-sprite SOF6 lights", {
  skip: !existsSync(new URL("../../runtime-trinity/npm/dist/index.js", import.meta.url)),
}, async () => {
  const data = createData();
  data.hull[0].sof6 = true;
  data.hull[0].spriteSets = [{
    visibilityGroup: "primary",
    items: [{ position: [0, 0, 0], colorType: 0 }],
  }];
  data.hull[0].spriteLineSets = [{
    skinned: true,
    visibilityGroup: "primary",
    items: [{ scaling: [1, 1, 1], colorType: 0 }, {
      position: [2, 0, 0],
      scaling: [3, 1, 1],
      spacing: 2,
      colorType: 0,
      intensity: 2,
      saturation: 0,
      blinkRate: 0.25,
      blinkPhase: 0.5,
      blinkPhaseShift: 0.1,
      minScale: 2,
      maxScale: 6,
      boneIndex: 4,
      light: {
        translation: [0.5, 0, 0],
        saturation: 0,
        intensity: 5,
        innerScaleMultiplier: 2,
        outerScaleMultiplier: 3,
        lightProfilePath: "res:/line.profile",
      },
    }],
  }, {
    visibilityGroup: "hidden",
    items: [{ colorType: 0 }],
  }];
  data.faction[0].visibilityGroupSet = { visibilityGroups: [{ str: "primary" }] };
  data.faction[0].colorSet = { Primary: [1, 0, 0, 1] };

  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  const dna = sof.CreateDna("rifter:minmatar:minmatar");
  assert.equal(dna.GetHullSpriteLineSets(0)[0].visibilityGroup > 0, true);
  const document = sof.BuildFromDNA("rifter:minmatar:minmatar");
  const attachments = rootNode(document).fields.attachments.map(ref => referencedNode(document, ref));
  assert.deepEqual(attachments.map(node => node.kind), ["EveSpriteSet", "EveSpriteLineSet"]);
  assert.deepEqual(attachments[0].fields.effect, attachments[1].fields.effect);
  assert.equal(attachments[1].fields.skinned, true);
  assert.equal(attachments[1].fields.spriteLines.length, 2);
  const line = referencedNode(document, attachments[1].fields.spriteLines[1]);
  assert.deepEqual(line.fields.position, [2, 0, 0]);
  assert.deepEqual(line.fields.scaling, [3, 1, 1]);
  assert.ok(Math.abs(line.fields.color[0] - 0.598) < 1e-12);
  assert.ok(Math.abs(line.fields.color[1] - 0.598) < 1e-12);
  assert.ok(Math.abs(line.fields.color[2] - 0.598) < 1e-12);
  assert.equal(line.fields.color[3], 2);

  const lights = attachments[1].fields.lights.map(ref => referencedNode(document, ref));
  assert.equal(lights.length, 3);
  assert.deepEqual(lights.map(light => light.kind), ["EveSpriteLight", "EveSpriteLight", "EveSpriteLight"]);
  assert.deepEqual(lights.map(light => light.fields.index), [1, 1, 1]);
  assert.deepEqual(lights.map(light => light.fields.blinkPhase), [0.5, 0.6, 0.7]);
  assert.deepEqual(lights.map(light => light.fields.lightData.position), [
    [4.5, 0, 0],
    [6.5, 0, 0],
    [8.5, 0, 0],
  ]);
  assert.equal(lights[0].fields.lightData.innerRadius, 2);
  assert.equal(lights[0].fields.lightData.radius, 3);
  assert.equal(lights[0].fields.lightProfilePath, "res:/line.profile");

  const trinity = await import(new URL("../../runtime-trinity/npm/dist/index.js", import.meta.url));
  const audioTrinity = await import(new URL("../../runtime-audio/npm/dist/trinity/index.js", import.meta.url));
  const registry = CjsClassRegistry.fromMaps({ constructors: { ...trinity, ...audioTrinity } });
  const adapter = createSofHydrationAdapter();
  const hydrated = CjsDocumentHydrator.hydrate(document, { registry, adapter });
  assert.deepEqual(hydrated.reports, []);
  assert.equal(hydrated.root.attachments[1].constructor.name, "EveSpriteLineSet");
  assert.equal(hydrated.root.attachments[1].lights.length, 3);
  assert.equal(hydrated.root.attachments[1].lights[0].constructor.name, "EveSpriteLight");
});

test("SOF applies sprite-line visibility filtering to legacy hulls", () => {
  const data = createData();
  data.hull[0].spriteLineSets = [{
    visibilityGroup: "hidden",
    items: [{ colorType: 0 }],
  }];
  data.faction[0].colorSet = { Primary: [1, 1, 1, 1] };
  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  const document = sof.BuildFromDNA("rifter:minmatar:minmatar");
  assert.deepEqual(rootNode(document).fields.attachments, []);
});

test("SOF emits and operationally hydrates Carbon haze sets with SOF6 lights", {
  skip: !existsSync(new URL("../../runtime-trinity/npm/dist/index.js", import.meta.url)),
}, async () => {
  assert.deepEqual(EveSOFDataHullHazeSet.HazeType, {
    TYPE_SPHERICAL: 0,
    TYPE_HALFSPHERICAL: 1,
  });
  assert.equal(Object.isFrozen(EveSOFDataHullHazeSet.HazeType), true);

  const data = createData();
  data.hull[0].sof6 = true;
  data.hull[0].hazeSets = [{
    hazeType: EveSOFDataHullHazeSet.HazeType.TYPE_SPHERICAL,
    // visibilityGroup deliberately absent: only a missing value defaults to
    // "primary"; an authored empty string is its own group (Carbon hashes it).
    items: [{
      colorType: 0,
      boneIndex: 7,
      position: [1, 2, 3],
      rotation: [0, 0, 0, 1],
      scaling: [2, 4, 3],
      hazeBrightness: 2,
      hazeFalloff: 8,
      sourceSize: 0.5,
      sourceBrightness: 3,
      boosterGainInfluence: true,
      saturation: 0,
      lights: [{
        translation: [1, 0, 0],
        rotation: [0, 0, 0, 1],
        saturation: 0,
        intensity: 5,
        innerScaleMultiplier: 1,
        outerScaleMultiplier: 2,
        lightProfilePath: "res:/haze.profile",
      }],
    }],
  }, {
    hazeType: EveSOFDataHullHazeSet.HazeType.TYPE_SPHERICAL,
    visibilityGroup: "primary",
    items: [],
  }, {
    hazeType: EveSOFDataHullHazeSet.HazeType.TYPE_HALFSPHERICAL,
    skinned: true,
    visibilityGroup: "primary",
    items: [],
  }, {
    hazeType: EveSOFDataHullHazeSet.HazeType.TYPE_SPHERICAL,
    visibilityGroup: "hidden",
    items: [{}],
  }];
  data.faction[0].visibilityGroupSet = { visibilityGroups: [{ str: "primary" }] };
  data.faction[0].colorSet = { Primary: [0.2, 0.6, 1, 1] };

  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  const dna = new EveSOFDNA();
  dna.Setup("rifter:minmatar:minmatar", sof.dataMgr);
  assert.equal(dna.GetHullHazeSets(0)[0].visibilityGroup > 0, true);
  const document = sof.BuildFromDNA("rifter:minmatar:minmatar");
  const attachments = rootNode(document).fields.attachments.map(ref => referencedNode(document, ref));
  assert.deepEqual(attachments.map(node => node.kind), ["EveHazeSet", "EveHazeSet", "EveHazeSet"]);
  assert.deepEqual(attachments[0].fields.effect, attachments[1].fields.effect);
  const sphericalEffect = referencedNode(document, attachments[0].fields.effect);
  assert.equal(sphericalEffect.fields.effectFilePath, "res:/graphics/effect/managed/space/spaceobject/fx/hazespherical.fx");
  const halfEffect = referencedNode(document, attachments[2].fields.effect);
  assert.equal(halfEffect.fields.effectFilePath, "res:/graphics/effect/managed/space/spaceobject/fx/hazehalfspherical.fx");

  const haze = referencedNode(document, attachments[0].fields.hazes[0]);
  assert.deepEqual(haze.fields.position, [1, 2, 3]);
  assert.deepEqual(haze.fields.scaling, [2, 4, 3]);
  assert.deepEqual(haze.fields.hazeData, [8, 0.5, 3, 1]);
  assert.equal(haze.fields.boneIndex, 7);
  assert.ok(Math.abs(haze.fields.color[0] - 1.052) < 1e-12);
  assert.ok(Math.abs(haze.fields.color[1] - 1.052) < 1e-12);
  assert.ok(Math.abs(haze.fields.color[2] - 1.052) < 1e-12);
  assert.equal(haze.fields.color[3], 2);

  const lights = attachments[0].fields.lights.map(ref => referencedNode(document, ref));
  assert.equal(lights.length, 1);
  assert.equal(lights[0].kind, "EveHazeSetLight");
  assert.deepEqual(lights[0].fields.lightData.position, [2, 2, 3]);
  assert.deepEqual(lights[0].fields.lightData.color, [0.526, 0.526, 0.526, 1]);
  assert.equal(lights[0].fields.lightData.innerRadius, 4);
  assert.equal(lights[0].fields.lightData.radius, 8);
  assert.equal(lights[0].fields.lightData.brightness, 5);
  assert.equal(lights[0].fields.index, 0);
  assert.equal(lights[0].fields.boosterGainInfluence, true);
  assert.equal(lights[0].fields.lightProfilePath, "res:/haze.profile");

  const trinity = await import(new URL("../../runtime-trinity/npm/dist/index.js", import.meta.url));
  const audioTrinity = await import(new URL("../../runtime-audio/npm/dist/trinity/index.js", import.meta.url));
  class TrackingEveHazeSet extends trinity.EveHazeSet
  {
    calls = [];

    AddLightFromSOF(light)
    {
      this.calls.push(`AddLightFromSOF:${light.index}`);
      super.AddLightFromSOF(light);
    }

    Initialize()
    {
      this.calls.push("Initialize");
      return super.Initialize();
    }
  }
  const registry = CjsClassRegistry.fromMaps({
    constructors: { ...trinity, EveHazeSet: TrackingEveHazeSet },
  });
  const adapter = createSofHydrationAdapter();
  const hydrated = CjsDocumentHydrator.hydrate(document, { registry, adapter });
  assert.deepEqual(hydrated.reports, []);
  assert.ok(hydrated.root.attachments[0] instanceof TrackingEveHazeSet);
  assert.equal(hydrated.root.attachments[0].hazes[0].constructor.name, "EveHazeSetItem");
  assert.deepEqual(hydrated.root.attachments.map(set => set.calls), [
    ["Initialize"],
    ["Initialize"],
    ["Initialize"],
  ]);
  assert.equal(hydrated.root.attachments[0].lights.length, 1);
  assert.equal(hydrated.root.attachments[0].lights[0].constructor.name, "EveHazeSetLight");
  assert.equal(hydrated.root.attachments[0].lights[0].lightData.constructor.name, "CjsLightData");
  assert.equal(hydrated.root.attachments[0].lights[0].lightData.color.constructor.name, "Float32Array");
});

test("SOF applies haze visibility filtering to legacy hulls", () => {
  const data = createData();
  data.hull[0].hazeSets = [{
    visibilityGroup: "hidden",
    items: [{ colorType: 0 }],
  }];
  data.faction[0].colorSet = { Primary: [1, 1, 1, 1] };
  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  const document = sof.BuildFromDNA("rifter:minmatar:minmatar");
  assert.deepEqual(rootNode(document).fields.attachments, []);
});

test("SOF emits and hydrates legacy banners with external texture bindings", {
  skip: !existsSync(new URL("../../runtime-trinity/npm/dist/index.js", import.meta.url)),
}, async () => {
  const data = createData();
  data.hull[0].banners = [{
    usage: EveSOFDataHullBanner.Usage.HORIZONTAL_BANNER,
    visibilityGroup: "primary",
    boneIndex: 5,
    position: [1, 2, 3],
    rotation: [0, 0, 0, 1],
    scaling: [2, 4, 3],
    angleX: 0.25,
    angleY: 0.5,
    lightOverride: {
      radiusMultiplier: 2,
      innerRadiusMultiplier: 0.25,
      brightness: 3,
      noiseAmplitude: 0.5,
      noiseFrequency: 4,
      noiceOctaves: 6,
      saturation: 0.75,
    },
  }, {
    usage: EveSOFDataHullBanner.Usage.ALLIANCE_LOGO,
    visibilityGroup: "hidden",
  }, {
    usage: EveSOFDataHullBanner.Usage.HORIZONTAL_BANNER,
    visibilityGroup: "primary",
    position: [4, 5, 6],
  }];
  data.faction[0].visibilityGroupSet = { visibilityGroups: [{ str: "primary" }] };
  data.generic.bannerShader = {
    shader: "res:/banner.fx",
    defaultParameters: [
      { name: "Zed", value: [9, 8, 7, 6] },
      { name: "Alpha", value: [1, 2, 3, 4] },
    ],
    defaultTextures: [
      { name: "ZMap", resFilePath: "res:/z.dds" },
      { name: "AMap", resFilePath: "res:/a.dds" },
    ],
  };

  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  const document = sof.BuildFromDNA("rifter:minmatar:minmatar");
  const root = rootNode(document);
  assert.equal(root.fields.attachments.length, 1);
  assert.equal(root.fields.externalParameters.length, 1);
  const set = referencedNode(document, root.fields.attachments[0]);
  assert.equal(set.kind, "EveBannerSet");
  assert.equal(set.fields.key, EveSOFDataHullBanner.Usage.HORIZONTAL_BANNER);
  assert.equal(set.fields.banners.length, 2);
  const first = referencedNode(document, set.fields.banners[0]);
  const second = referencedNode(document, set.fields.banners[1]);
  assert.deepEqual(first.fields.position, [1, 2, 3]);
  assert.deepEqual(first.fields.scaling, [2, 4, 3]);
  assert.equal(first.fields.reference, 0);
  assert.equal(second.fields.reference, 2);

  const effect = referencedNode(document, set.fields.effect);
  assert.equal(effect.fields.effectFilePath, "res:/banner.fx");
  assert.deepEqual(effect.fields.constParameters.map(ref => referencedNode(document, ref).fields.name), ["Alpha", "Zed"]);
  assert.deepEqual(effect.fields.resources.map(ref => referencedNode(document, ref).fields.name), ["AMap", "ZMap", "ImageMap"]);
  const imageMapRef = effect.fields.resources[2];
  const external = referencedNode(document, root.fields.externalParameters[0]);
  assert.equal(external.fields.name, "HorizontalBannerResPath");
  assert.deepEqual(external.fields.destinationObject, imageMapRef);
  assert.equal(external.fields.destinationAttribute, "resourcePath");

  const lights = set.fields.lights.map(ref => referencedNode(document, ref));
  assert.deepEqual(lights.map(light => light.kind), ["EveBannerLight", "EveBannerLight"]);
  assert.deepEqual(lights.map(light => light.fields.index), [0, 1]);
  assert.equal(lights[0].fields.lightData.radius, 8);
  assert.equal(lights[0].fields.lightData.innerRadius, 2);
  assert.equal(lights[0].fields.lightData.noiseOctaves, 6);
  assert.equal(lights[0].fields.saturation, 0.75);

  const trinity = await import(new URL("../../runtime-trinity/npm/dist/index.js", import.meta.url));
  const audioTrinity = await import(new URL("../../runtime-audio/npm/dist/trinity/index.js", import.meta.url));
  const registry = CjsClassRegistry.fromMaps({ constructors: { ...trinity, ...audioTrinity } });
  const adapter = createSofHydrationAdapter();
  const hydrated = CjsDocumentHydrator.hydrate(document, { registry, adapter });
  assert.deepEqual(hydrated.reports, []);
  assert.equal(hydrated.root.attachments[0].banners[0].reference, 0);
  assert.equal(hydrated.root.attachments[0].banners[1].reference, 2);
  assert.equal(hydrated.root.externalParameters[0].destinationObject, hydrated.root.attachments[0].effect.resources[2]);
  assert.equal(hydrated.root.attachments[0].lights.length, 2);
  assert.equal(hydrated.root.attachments[0].lights[0].constructor.name, "EveBannerLight");
});

test("SOF6 banner sets group usages numerically and preserve optional lights", {
  skip: !existsSync(new URL("../../runtime-trinity/npm/dist/index.js", import.meta.url)),
}, async () => {
  const data = createData();
  data.hull[0].sof6 = true;
  data.hull[0].bannerSets = [{
    visibilityGroup: "primary",
    banners: [{
      usage: EveSOFDataHullBannerSetItem.Usage.HORIZONTAL_BANNER,
      position: [2, 0, 0],
      scaling: [1, 3, 2],
      light: {
        translation: [1, 0, 0],
        rotation: [0, 0, 0, 1],
        innerScaleMultiplier: 1,
        outerScaleMultiplier: 2,
        intensity: 4,
        saturation: 0.5,
        lightProfilePath: "res:/banner.profile",
      },
    }, {
      usage: EveSOFDataHullBannerSetItem.Usage.ALLIANCE_LOGO,
      position: [1, 0, 0],
    }],
  }, {
    visibilityGroup: "hidden",
    banners: [{ usage: 0 }],
  }, {
    visibilityGroup: "primary",
    banners: [],
  }];
  data.faction[0].visibilityGroupSet = { visibilityGroups: [{ str: "primary" }] };
  data.generic.bannerShader = { shader: "res:/banner6.fx", defaultParameters: [], defaultTextures: [] };

  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  const document = sof.BuildFromDNA("rifter:minmatar:minmatar");
  const root = rootNode(document);
  const sets = root.fields.attachments.map(ref => referencedNode(document, ref));
  assert.deepEqual(sets.map(set => set.fields.key), [
    EveSOFDataHullBannerSetItem.Usage.ALLIANCE_LOGO,
    EveSOFDataHullBannerSetItem.Usage.HORIZONTAL_BANNER,
  ]);
  assert.deepEqual(root.fields.externalParameters.map(ref => referencedNode(document, ref).fields.name), [
    "AllianceLogoResPath",
    "HorizontalBannerResPath",
  ]);
  const alliance = referencedNode(document, sets[0].fields.banners[0]);
  const horizontal = referencedNode(document, sets[1].fields.banners[0]);
  assert.equal(alliance.fields.reference, 1);
  assert.equal(horizontal.fields.reference, 0);
  const lights = sets[1].fields.lights.map(ref => referencedNode(document, ref));
  assert.equal(lights.length, 1);
  assert.equal(lights[0].kind, "EveBannerLight");
  assert.equal(lights[0].fields.index, 0);
  assert.deepEqual(lights[0].fields.lightData.position, [3, 0, 0]);
  assert.equal(lights[0].fields.lightData.innerRadius, 3);
  assert.equal(lights[0].fields.lightData.radius, 6);
  assert.equal(lights[0].fields.lightData.brightness, 4);
  assert.equal(lights[0].fields.lightProfilePath, "res:/banner.profile");

  const trinity = await import(new URL("../../runtime-trinity/npm/dist/index.js", import.meta.url));
  const audioTrinity = await import(new URL("../../runtime-audio/npm/dist/trinity/index.js", import.meta.url));
  const registry = CjsClassRegistry.fromMaps({ constructors: { ...trinity, ...audioTrinity } });
  const adapter = createSofHydrationAdapter();
  const hydrated = CjsDocumentHydrator.hydrate(document, { registry, adapter });
  assert.deepEqual(hydrated.reports, []);
  assert.equal(hydrated.root.attachments[0].banners[0].reference, 1);
  assert.equal(hydrated.root.attachments[1].banners[0].reference, 0);
  assert.equal(hydrated.root.attachments[1].lights.length, 1);
  assert.equal(hydrated.root.attachments[1].lights[0].constructor.name, "EveBannerLight");
});

test("SOF emits and hydrates visible Carbon hull light types with cumulative hull offsets", {
  skip: !existsSync(new URL("../../runtime-trinity/npm/dist/index.js", import.meta.url)),
}, async () => {
  assert.deepEqual(EveSOFDataHullLightSetItem.LightType, {
    POINT_LIGHT: 0,
    TEXTURED_POINT_LIGHT: 1,
    SPOT_LIGHT: 2,
  });
  assert.equal(Object.isFrozen(EveSOFDataHullLightSetItem.LightType), true);

  const data = createData();
  const textured = Object.assign(new EveSOFDataHullLightSetTexturedPointLight(), {
    position: [2, 0, 0],
    lightColor: 18,
    texturePath: "res:/light.dds",
  });
  const spot = Object.assign(new EveSOFDataHullLightSetSpotLight(), {
    position: [3, 0, 0],
    rotation: [0, 0, 0, 1],
    lightColor: 18,
    innerAngle: 0.4,
    outerAngle: 0.8,
  });
  data.hull[0].locatorSets = [{
    name: "next_subsystem",
    locators: [{ position: [10, 0, 0] }],
  }];
  data.hull[0].lightSets = [{
    visibilityGroup: "primary",
    items: [
      {
        type: EveSOFDataHullLightSetItem.LightType.POINT_LIGHT,
        position: [1, 2, 3],
        radius: 4,
        innerRadius: 2,
        brightness: 5,
        noiseAmplitude: 0.25,
        noiseFrequency: 3,
        noiseOctaves: 2,
        lightColor: 18,
        boneIndex: 7,
        flags: 9,
      },
      textured,
      spot,
      { type: 99, lightColor: 18 },
    ],
  }, {
    visibilityGroup: "hidden",
    items: [{ type: 0, lightColor: 18 }],
  }];
  data.hull[1].lightSets = [{
    visibilityGroup: "primary",
    items: [{ type: 0, position: [1, 0, 0], lightColor: 18 }],
  }];
  data.faction[0].visibilityGroupSet = { visibilityGroups: [{ str: "primary" }] };
  data.faction[0].colorSet = { PrimaryLight: [0.25, 0.5, 0.75, 1] };

  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  const document = sof.BuildFromDNA("rifter;rifter2:minmatar:minmatar");
  const lights = rootNode(document).fields.lights.map(ref => referencedNode(document, ref));
  assert.deepEqual(lights.map(node => node.kind), [
    "Tr2PointLight",
    "Tr2TexturedPointLight",
    "Tr2SpotLight",
    "Tr2PointLight",
  ]);
  assert.deepEqual(lights.map(node => node.fields.type), [1, 1, 2, 1]);
  assert.equal(lights[1].fields.isDynamic, true);

  // Flattened emission (2026-07-23 decision): hull lights carry Carbon's
  // flat Blue-persisted shape; no nested lightData bag.
  const pointFields = lights[0].fields;
  assert.equal(Object.hasOwn(pointFields, "lightData"), false, "hull lights emit the flattened Blue shape");
  assert.deepEqual(pointFields.position, [1, 2, 3]);
  assert.deepEqual(pointFields.color, [0.25, 0.5, 0.75, 1]);
  assert.equal(pointFields.radius, 4);
  assert.equal(pointFields.flags, 9);
  assert.equal(pointFields.boneIndex, 7);
  assert.equal(Object.hasOwn(pointFields, "innerAngle"), false, "point lights do not persist spot angles");
  assert.equal(Object.hasOwn(pointFields, "texturePath"), false, "point lights do not persist a texture path");
  const texturedFields = lights[1].fields;
  assert.equal(texturedFields.texturePath, "res:/light.dds");
  const spotFields = lights[2].fields;
  assert.equal(spotFields.innerAngle, 0.4);
  assert.equal(spotFields.outerAngle, 0.8);
  const secondHullFields = lights[3].fields;
  assert.deepEqual(secondHullFields.position, [11, 0, 0]);

  const trinity = await import(new URL("../../runtime-trinity/npm/dist/index.js", import.meta.url));
  const audioTrinity = await import(new URL("../../runtime-audio/npm/dist/trinity/index.js", import.meta.url));
  const registry = CjsClassRegistry.fromMaps({ constructors: { ...trinity, ...audioTrinity } });
  const hydrated = CjsDocumentHydrator.hydrate(document, {
    registry,
    adapter: createSofHydrationAdapter(),
  });
  assert.deepEqual(hydrated.reports, []);
  assert.equal(hydrated.root.lights[0].lightData.constructor.name, "CjsLightData");
  assert.deepEqual(Array.from(hydrated.root.lights[0].lightData.position), [1, 2, 3]);
  assert.equal(hydrated.root.lights[1].isDynamic, true);
});

test("SOF emits and hydrates Carbon impact overlays and preserves the HULL shield quirk", {
  skip: !existsSync(new URL("../../runtime-trinity/npm/dist/index.js", import.meta.url)),
}, async () => {
  const data = createData();
  data.hull[0].impactEffectType = EveSOFDataHull.ImpactEffectType.IMPACTEFFECT_ELLIPSOID;
  data.hull[0].locatorSets = [{
    name: "damage",
    locators: [
      { position: [1, 0, 0], rotation: [0, 0, 0, 1], scaling: [1, 1, 1] },
      { position: [2, 0, 0], rotation: [0, 0, 0, 1], scaling: [1, 1, 1] },
    ],
  }];
  data.generic.areaShaderLocation = "res:/effect";
  data.generic.shaderPrefix = "static_";
  data.generic.damage = {
    flickerPerlinSpeed: 1.25,
    flickerPerlinAlpha: 1.5,
    flickerPerlinBeta: 2.5,
    flickerPerlinN: 4,
    armorParticleRate: 10,
    armorParticleAngle: 0.2,
    armorParticleMinMaxSpeed: [3, 7],
    armorParticleMinMaxLifeTime: [0.5, 2],
    armorParticleSizes: [1, 2, 3, 0.25],
    armorParticleColor0: [1, 0, 0, 1],
    armorParticleColor1: [0, 1, 0, 0.75],
    armorParticleColor2: [0, 0, 1, 0.5],
    armorParticleColor3: [1, 1, 1, 0],
    armorParticleTextureIndex: 6,
    armorParticleVelocityStretchRotation: 0.3,
    armorParticleDrag: 0.4,
    armorParticleTurbulenceAmplitude: 0.5,
    armorParticleTurbulenceFrequency: 8,
    armorParticleColorMidPoint: 0.6,
    armorShader: "armor.fx",
    shieldShaderEllipsoid: "shield_ellipsoid.fx",
    shieldShaderHull: "shield_hull.fx",
    shieldGeometryResFilePath: "res:/shield.gr2",
  };
  data.generic.hullDamage = {
    hullParticleRate: 11,
    hullParticleAngle: 0.7,
    hullParticleInnerAngle: 0.1,
    hullParticleColorMidpoint: 0.65,
    hullParticleMinMaxSpeed: [4, 9],
    hullParticleMinMaxLifeTime: [0.25, 3],
    hullParticleSizes: [2, 3, 4, 0.5],
    hullParticleColor0: [0.1, 0.2, 0.3, 1],
    hullParticleColor1: [0.2, 0.3, 0.4, 0.8],
    hullParticleColor2: [0.3, 0.4, 0.5, 0.6],
    hullParticleColor3: [0.4, 0.5, 0.6, 0.4],
    hullParticleTextureIndex: 7,
    hullParticleVelocityStretchRotation: 0.8,
    hullParticleDrag: 0.9,
    hullParticleTurbulenceAmplitude: 1.1,
    hullParticleTurbulenceFrequency: 12,
  };
  data.race[0].damage = {
    armorImpactParameters: [{ name: "ArmorP", value: [1, 2, 3, 4] }],
    armorImpactTextures: [{ name: "ArmorMap", resFilePath: "res:/armor.dds" }],
    shieldImpactParameters: [{ name: "ShieldP", value: [5, 6, 7, 8] }],
    shieldImpactTextures: [{ name: "ShieldMap", resFilePath: "res:/shield.dds" }],
  };

  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  const document = sof.Build("rifter", "minmatar", "minmatar");
  const overlayNode = referencedNode(document, rootNode(document).fields.impactOverlay);
  const shieldMesh = referencedNode(document, overlayNode.fields.mesh);
  assert.equal(shieldMesh.fields.geometryResPath, "res:/shield.gr2");
  const shieldArea = referencedNode(document, shieldMesh.fields.additiveAreas[0]);
  const shieldEffect = referencedNode(document, shieldArea.fields.effect);
  assert.equal(shieldEffect.fields.effectFilePath, "res:/effect/shield_ellipsoid.fx");
  const armorEffect = referencedNode(document, overlayNode.fields.armorDamageShader);
  assert.equal(armorEffect.fields.effectFilePath, "res:/effect/static_armor.fx");
  const armorEmitterNode = referencedNode(document, overlayNode.fields.armorImpactEmitter);
  assert.equal(armorEmitterNode.fields.rate, 10);
  assert.equal(armorEmitterNode.fields.textureIndex, 6);
  assert.deepEqual(armorEmitterNode.fields.sizes, [1, 2, 3]);
  assert.equal(armorEmitterNode.raw, undefined);
  const hullEmitterNode = referencedNode(document, overlayNode.fields.hullImpactEmitter);
  assert.equal(hullEmitterNode.fields.innerAngle, 0.1);
  assert.equal(hullEmitterNode.fields.colorMidpoint, 0.65);
  assert.equal(hullEmitterNode.raw, undefined);
  const flicker = referencedNode(document, overlayNode.fields.hullDamageFlickerCurve);
  assert.deepEqual(flicker.fields, { alpha: 1.5, beta: 2.5, N: 4, speed: 1.25, offset: 1, scale: 0 });

  const trinity = await import(new URL("../../runtime-trinity/npm/dist/index.js", import.meta.url));
  const audioTrinity = await import(new URL("../../runtime-audio/npm/dist/trinity/index.js", import.meta.url));
  const registry = CjsClassRegistry.fromMaps({ constructors: { ...trinity, ...audioTrinity } });
  const hydrated = CjsDocumentHydrator.hydrate(document, {
    registry,
    adapter: createSofHydrationAdapter(),
  });
  assert.deepEqual(hydrated.reports, []);
  const overlay = hydrated.root.impactOverlay;
  assert.equal(overlay.GetDamageLocatorCount(), 2);
  assert.equal(overlay.HasShieldEllipsoid(), true);
  assert.equal(overlay.mesh.geometryResPath, "res:/shield.gr2");
  assert.equal(overlay.armorImpactEmitter.minSpeed, 3);
  assert.deepEqual(Array.from(overlay.armorImpactEmitter.color2), [0, 0, 1, 0.5]);
  assert.notEqual(overlay.shieldHardening, overlay.shieldBoosting);
  assert.notEqual(overlay.armorRepairing, overlay.hullRepairing);

  const hullData = createData();
  hullData.hull[0].impactEffectType = EveSOFDataHull.ImpactEffectType.IMPACTEFFECT_HULL;
  hullData.generic.areaShaderLocation = "res:/effect";
  hullData.generic.shaderPrefix = "static_";
  hullData.generic.damage = data.generic.damage;
  hullData.generic.hullDamage = data.generic.hullDamage;
  const hullSof = new EveSOF();
  assert.equal(hullSof.dataMgr.SetData(hullData), true);
  const hullDocument = hullSof.Build("rifter", "minmatar", "minmatar");
  const hullOverlay = referencedNode(hullDocument, rootNode(hullDocument).fields.impactOverlay);
  assert.equal(hullOverlay.fields.mesh, null);
  assert.equal(hullOverlay.fields.shieldIsEllipsoid, false);

  const noneSof = new EveSOF();
  assert.equal(noneSof.dataMgr.SetData(createData()), true);
  assert.equal(rootNode(noneSof.Build("rifter", "minmatar", "minmatar")).fields.impactOverlay, null);
});

test("EveSOFDataMgr normalizes impact damage records and DNA selectors", () => {
  const data = createData();
  const armorColor0 = [1, 0, 0, 1];
  data.hull[0].impactEffectType = EveSOFDataHull.ImpactEffectType.IMPACTEFFECT_ELLIPSOID;
  data.generic.damage = {
    flickerPerlinSpeed: 1.25,
    flickerPerlinAlpha: 1.5,
    flickerPerlinBeta: 2.5,
    flickerPerlinN: 4,
    armorParticleRate: 10,
    armorParticleAngle: 0.2,
    armorParticleMinMaxSpeed: [3, 7],
    armorParticleMinMaxLifeTime: [0.5, 2],
    armorParticleSizes: [1, 2, 3, 0.25],
    armorParticleColor0: armorColor0,
    armorParticleColor1: [0, 1, 0, 0.75],
    armorParticleColor2: [0, 0, 1, 0.5],
    armorParticleColor3: [1, 1, 1, 0],
    armorParticleTextureIndex: 6,
    armorParticleVelocityStretchRotation: 0.3,
    armorParticleDrag: 0.4,
    armorParticleTurbulenceAmplitude: 0.5,
    armorParticleTurbulenceFrequency: 8,
    armorParticleColorMidPoint: 0.6,
    armorShader: "armor.fx",
    shieldShaderEllipsoid: "shield_ellipsoid.fx",
    shieldShaderHull: "shield_hull.fx",
    shieldGeometryResFilePath: "res:/shield.gr2",
  };
  data.generic.hullDamage = {
    hullParticleRate: 11,
    hullParticleAngle: 0.7,
    hullParticleInnerAngle: 0.1,
    hullParticleColorMidpoint: 0.65,
    hullParticleMinMaxSpeed: [4, 9],
    hullParticleMinMaxLifeTime: [0.25, 3],
    hullParticleSizes: [2, 3, 4, 0.5],
    hullParticleColor0: [0.1, 0.2, 0.3, 1],
    hullParticleColor1: [0.2, 0.3, 0.4, 0.8],
    hullParticleColor2: [0.3, 0.4, 0.5, 0.6],
    hullParticleColor3: [0.4, 0.5, 0.6, 0.4],
    hullParticleTextureIndex: 7,
    hullParticleVelocityStretchRotation: 0.8,
    hullParticleDrag: 0.9,
    hullParticleTurbulenceAmplitude: 1.1,
    hullParticleTurbulenceFrequency: 12,
  };
  data.race[0].damage = {
    armorImpactParameters: [
      { name: "ArmorB", value: [9, 10, 11, 12] },
      { name: "ArmorA", value: [1, 2, 3, 4] },
      { name: "ArmorA", value: [5, 6, 7, 8] },
    ],
    armorImpactTextures: [{ name: "ArmorMap", resFilePath: "res:/armor.dds" }],
    shieldImpactParameters: [{ name: "ShieldA", value: [13, 14, 15, 16] }],
    shieldImpactTextures: [{ name: "ShieldMap", resFilePath: "res:/shield.dds" }],
  };

  const manager = new EveSOFDataMgr();
  assert.equal(manager.SetData(data), true);
  armorColor0[0] = 99;
  const dna = new EveSOFDNA();
  dna.Setup("rifter:minmatar:minmatar", manager);

  const damage = dna.GetGenericDamageData();
  assert.equal(damage.flickerPerlinSpeed, 1.25);
  assert.equal(damage.armorParticleColorMidPoint, 0.6);
  assert.deepEqual(damage.armorParticleColors[0], [1, 0, 0, 1]);
  assert.equal(damage.armorParticleColors.length, 4);
  assert.equal(damage.shieldGeometryResFilePath, "res:/shield.gr2");
  const hullDamage = dna.GetGenericHullDamageData();
  assert.equal(hullDamage.hullParticleColorMidpoint, 0.65);
  assert.deepEqual(hullDamage.hullParticleMinMaxSpeed, [4, 9]);
  assert.equal(hullDamage.hullParticleColors.length, 4);

  const raceDamage = dna.GetRaceDamageData();
  assert.deepEqual([...raceDamage.armorDamageParameters.keys()], ["ArmorA", "ArmorB"]);
  assert.deepEqual(raceDamage.armorDamageParameters.get("ArmorA"), [5, 6, 7, 8]);
  assert.deepEqual(raceDamage.armorDamageTextures.get("ArmorMap"), { resFilePath: "res:/armor.dds" });
  assert.deepEqual(raceDamage.shieldDamageParameters.get("ShieldA"), [13, 14, 15, 16]);
  assert.deepEqual(raceDamage.shieldDamageTextures.get("ShieldMap"), { resFilePath: "res:/shield.dds" });
  assert.equal(dna.GetImpactEffectType(), EveSOFDataHull.ImpactEffectType.IMPACTEFFECT_ELLIPSOID);
  assert.equal(dna.GetImpactShieldShader(), "shield_ellipsoid.fx");

  dna.hullDatas[0].impactEffectType = EveSOFDataHull.ImpactEffectType.IMPACTEFFECT_HULL;
  assert.equal(dna.GetImpactShieldShader(), "shield_hull.fx");
  dna.hullDatas[0].impactEffectType = EveSOFDataHull.ImpactEffectType.IMPACTEFFECT_NONE;
  assert.equal(dna.GetImpactShieldShader(), null);
});

test("absent impact damage sources produce Carbon value records", () => {
  const dna = new EveSOFDNA();
  dna.Setup("rifter:minmatar:minmatar", createManager());
  assert.deepEqual(dna.GetGenericDamageData().armorParticleColors, [
    [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0],
  ]);
  assert.equal(dna.GetGenericDamageData().armorParticleTurbulenceFrequency, 0);
  assert.equal(dna.GetGenericHullDamageData().hullParticleColorMidpoint, 0);
  assert.equal(dna.GetRaceDamageData().shieldDamageTextures.size, 0);
});

test("EveSOFDNA duplicate commands use the last occurrence", () => {
  const dna = new EveSOFDNA();
  dna.Setup("rifter:minmatar:minmatar:class?ship:class?extension", createManager());
  assert.equal(dna.ValidateContent(), true);
  assert.equal(dna.GetBuildClass(), 4);
});

test("EveSOFDNA safely rejects malformed and unknown commands", () => {
  const manager = createManager();
  for (const value of [
    "rifter:minmatar",
    "rifter:minmatar:minmatar:broken",
    "rifter:minmatar:minmatar:broken?value",
    "rifter:minmatar:minmatar:experimental?value",
  ])
  {
    const dna = new EveSOFDNA();
    dna.Setup(value, manager);
    assert.equal(dna.ValidateContent(), false, value);
  }
});

test("EveSOFDNA validates variants, pattern materials, and every layout", () => {
  const manager = createManager();
  const invalid = [
    "rifter:minmatar:minmatar:variant?missing",
    "rifter:minmatar:minmatar:variant?transparent;extra",
    "rifter:minmatar:minmatar:pattern?stripes;missing;none",
    "rifter:minmatar:minmatar:layout?cargo;missing:class?invalid",
  ];
  for (const value of invalid)
  {
    const dna = new EveSOFDNA();
    dna.Setup(value, manager);
    assert.equal(dna.ValidateContent(), false, value);
  }
});

test("EveSOFDNA descriptor setup inherits parent selections deterministically", () => {
  const manager = createManager();
  const parent = new EveSOFDNA();
  parent.Setup("rifter:minmatar:minmatar:material?rust;none:layout?cargo", manager);

  const child = new EveSOFDNA();
  child.Setup("antennae", {
    hull: "rifter2",
    faction: "",
    race: "",
    material1: "paint",
    material2: "",
    material3: "",
    material4: "",
    layout: "antennae",
    pattern: "stripes",
  }, parent, manager);

  assert.equal(child.IsValid(), true);
  assert.equal(child.GetDnaString(), "rifter2:minmatar:minmatar:layout?antennae:material?paint;none:pattern?stripes;none;none");
  assert.equal(child.ValidateContent(), true);
});

test("EveSOF emits the minimal GPU-free Trinity graph slice", () => {
  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(createData()), true);

  const document = sof.Build("rifter", "minmatar", "minmatar");
  const graph = rootNode(document);
  const mesh = referencedNode(document, graph.fields.mesh);
  assert.equal(document.schema, "carbon.document");
  assert.equal(graph.kind, "EveShip2");
  assert.equal(graph.fields.dna, "rifter:minmatar:minmatar");
  assert.deepEqual(graph.fields.boundingSphereCenter, [1, 2, 3]);
  assert.equal(graph.fields.boundingSphereRadius, 4);
  assert.deepEqual(graph.fields.shapeEllipsoidCenter, [5, 6, 7]);
  assert.equal(graph.fields.castShadow, true);
  assert.equal(graph.fields.reflectionMode, 3);
  assert.equal(mesh.kind, "Tr2Mesh");
  assert.equal(mesh.fields.geometryResPath, "res:/model/rifter.gr2");
  assert.equal("meshResPath" in mesh.fields, false);
  assert.deepEqual(graph.fields.effectChildren, []);
  assert.equal(sof.ValidateDNA("rifter:minmatar:minmatar"), true);
  assert.equal(sof.BuildFromDNA("missing:minmatar:minmatar"), null);
});

test("EveSOF stamps Carbon mesh-area shadow, depth, and LOD state", () => {
  // FillMeshAreaVector runtime state (Carbon EveSOF.cpp:576-592,668-672,
  // 2149-2153): opaque areas cast shadows, decals follow the injected
  // alphaCutoutShadowsEnabled setting (Carbon default false), other batch
  // types never cast; depth generation comes from the generic shader data;
  // distortion areas are limited to TR2_LOD_HIGH.
  const makeData = () => {
    const data = createData();
    const area = (name, index, shader) => ({
      name, index, count: 1, areaType: 0, shader, textures: [], parameters: [],
    });
    data.hull[0].opaqueAreas = [area("hull", 0, "ship.fx")];
    data.hull[0].decalAreas = [area("decal", 1, "ship.fx")];
    data.hull[0].transparentAreas = [area("glass", 2, "glass.fx")];
    data.hull[0].distortionAreas = [area("warp", 3, "ship.fx")];
    data.generic.areaShaderLocation = "res:/effect";
    const shaderData = shader => ({
      shader, parameters: [], defaultParameters: [], defaultTextures: [],
      doGenerateDepthArea: shader === "glass.fx", transparencyTextureName: "",
    });
    data.generic.areaShaders = [shaderData("ship.fx"), shaderData("glass.fx")];
    return data;
  };

  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(makeData()), true);
  const document = sof.BuildFromDNA("rifter:minmatar:minmatar");
  const mesh = referencedNode(document, rootNode(document).fields.mesh);
  const areaFields = (list, index = 0) => referencedNode(document, mesh.fields[list][index]).fields;

  const opaque = areaFields("opaqueAreas", 0);
  assert.equal(opaque.castsShadows, true);
  assert.equal(opaque.generateDepthArea, false);
  assert.equal(opaque.minLod, -1);
  // Decal areas append to the opaque vector; the setting defaults to false.
  const decal = areaFields("opaqueAreas", 1);
  assert.equal(decal.castsShadows, false);
  const glass = areaFields("transparentAreas");
  assert.equal(glass.castsShadows, false);
  assert.equal(glass.generateDepthArea, true);
  assert.equal(glass.minLod, -1);
  const warp = areaFields("distortionAreas");
  assert.equal(warp.castsShadows, false);
  assert.equal(warp.minLod, 2);
  // Carbon depth clones copy the transparent source area's runtime state.
  const depth = areaFields("depthAreas");
  assert.equal(depth.castsShadows, false);
  assert.equal(depth.generateDepthArea, true);

  const enabled = new EveSOF().Register({ alphaCutoutShadowsEnabled: true });
  assert.equal(enabled.dataMgr.SetData(makeData()), true);
  const enabledDocument = enabled.BuildFromDNA("rifter:minmatar:minmatar");
  const enabledMesh = referencedNode(enabledDocument, rootNode(enabledDocument).fields.mesh);
  const enabledDecal = referencedNode(enabledDocument, enabledMesh.fields.opaqueAreas[1]).fields;
  assert.equal(enabledDecal.castsShadows, true);
  assert.equal(referencedNode(enabledDocument, enabledMesh.fields.opaqueAreas[0]).fields.castsShadows, true);
});

test("EveSOF composes multi-hull bounds, mesh indices, and locator graphs", () => {
  const data = createData();
  const identity = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ];
  data.hull[0].boundingSphere = [0, 0, 0, 2];
  data.hull[0].locatorTurrets = [{ name: "turret_a", transform: [...identity.slice(0, 12), 1, 2, 3, 1] }];
  data.hull[0].locatorSets = [
    { name: "zeta", locators: [{ position: [0, 1, 0], rotation: [0, 0, 0, 1], scaling: [1, 1, 1], boneIndex: 1 }] },
    { name: "alpha", locators: [{ position: [1, 0, 0], rotation: [0, 0, 0, 1], scaling: [1, 1, 1], boneIndex: 2 }] },
    { name: "next_subsystem", locators: [{ position: [10, 0, 0], rotation: [0, 0, 0, 1], scaling: [1, 1, 1], boneIndex: -1 }] },
  ];
  data.hull[1].boundingSphere = [0, 0, 0, 1];
  data.hull[1].audioPosition = [2, 3, 4];
  data.hull[1].locatorTurrets = [{ name: "turret_b", transform: [...identity.slice(0, 12), 4, 5, 6, 1] }];
  data.hull[1].locatorSets = [
    { name: "alpha", locators: [{ position: [2, 0, 0], rotation: [0, 0, 0, 1], scaling: [2, 2, 2], boneIndex: 3 }] },
  ];
  for (const hull of data.hull)
  {
    hull.opaqueAreas = [{
      name: "Hull",
      index: 0,
      count: 1,
      areaType: 0,
      blockedMaterials: 0,
      shader: "ship.fx",
      textures: [],
      parameters: [],
    }];
  }
  data.generic.areaShaders = [{
    shader: "ship.fx",
    parameters: [],
    defaultParameters: [],
    defaultTextures: [],
    doGenerateDepthArea: false,
    transparencyTextureName: "",
  }];

  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  const dna = sof.CreateDna("rifter;rifter2:minmatar:minmatar");
  assert.deepEqual(dna.GetHullLocatorSetNames(0), ["alpha", "next_subsystem", "zeta"]);
  assert.equal(dna.GetLocatorCount("alpha"), 2);
  assert.deepEqual(dna.GetHullNextSubsystemOffset(0), [10, 0, 0]);
  assert.equal(dna.GetHullAudioPosition(0), null);
  assert.deepEqual(dna.GetHullBoundingSphere(), [4.5, 0, 0, 6.5]);

  const document = sof.BuildFromDNA("rifter;rifter2:minmatar:minmatar");
  const graph = rootNode(document);
  const mesh = referencedNode(document, graph.fields.mesh);
  assert.deepEqual([graph.fields.boundingSphereCenter, graph.fields.boundingSphereRadius], [[4.5, 0, 0], 6.5]);
  assert.deepEqual(
    graph.fields.locators.map(ref => referencedNode(document, ref).fields.transform.slice(12, 15)),
    [[1, 2, 3], [14, 5, 6], [12, 3, 4]],
  );
  assert.deepEqual(
    graph.fields.locators.map(ref => referencedNode(document, ref).fields.name),
    ["turret_a", "turret_b", "locator_audio_booster"],
  );
  const alpha = graph.fields.locatorSets
    .map(ref => referencedNode(document, ref))
    .find(node => node.fields.name === "alpha");
  assert.deepEqual(
    alpha.fields.locators.map(ref => referencedNode(document, ref).fields.position),
    [[1, 0, 0], [12, 0, 0]],
  );
  assert.deepEqual(
    mesh.fields.opaqueAreas.map(ref => referencedNode(document, ref).fields.index),
    [0, 1],
  );
});

test("EveSOF emits mesh areas, effects, parameters, resources, and depth clones", () => {
  const data = createData();
  data.hull[0].opaqueAreas = [{
    name: "Hull",
    index: 2,
    count: 3,
    areaType: 0,
    blockedMaterials: 0,
    shader: "ship.fx",
    textures: [{ name: "AlbedoMap", resFilePath: "res:/hull.dds" }],
    parameters: [{ name: "Mtl1Diffuse", value: [1, 1, 1, 1] }],
  }];
  data.hull[0].transparentAreas = [{
    name: "Glass",
    index: 5,
    count: 1,
    areaType: 1,
    blockedMaterials: 0,
    shader: "glass.fx",
    textures: [{ name: "AlbedoMap", resFilePath: "res:/glass.dds" }],
    parameters: [],
  }];
  data.material[0].parameters = [{ name: "Diffuse", value: [9, 8, 7, 6] }];
  data.generic.areaShaderLocation = "res:/effect";
  data.generic.shaderPrefix = "static_";
  data.generic.shaderPrefixAnimated = "skinned_";
  data.generic.areaShaders = [
    {
      shader: "ship.fx",
      parameters: [{ str: "Mtl1Diffuse" }],
      defaultParameters: [{ name: "Default", value: [2, 2, 2, 2] }],
      defaultTextures: [
        { name: "AlbedoMap", resFilePath: "res:/default.dds" },
        { name: "NormalMap", resFilePath: "res:/normal.dds" },
      ],
      doGenerateDepthArea: false,
      transparencyTextureName: "AlbedoMap",
    },
    {
      shader: "glass.fx",
      parameters: [],
      defaultParameters: [],
      defaultTextures: [],
      doGenerateDepthArea: true,
      transparencyTextureName: "AlbedoMap",
    },
    {
      shader: "depthonlyv5.fx",
      parameters: [],
      defaultParameters: [],
      defaultTextures: [],
      doGenerateDepthArea: false,
      transparencyTextureName: "AlbedoMap",
    },
  ];

  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  const document = sof.BuildFromDNA("rifter:minmatar:minmatar:material?rust;none");
  const mesh = referencedNode(document, rootNode(document).fields.mesh);

  assert.equal(mesh.fields.opaqueAreas.length, 1);
  assert.equal(mesh.fields.transparentAreas.length, 1);
  assert.equal(mesh.fields.depthAreas.length, 1);
  const hullArea = referencedNode(document, mesh.fields.opaqueAreas[0]);
  const hullEffect = referencedNode(document, hullArea.fields.effect);
  assert.equal(hullEffect.fields.effectFilePath, "res:/effect/static_ship.fx");
  assert.deepEqual(
    hullEffect.fields.constParameters.map(ref => referencedNode(document, ref).fields.value),
    [[9, 8, 7, 6], [2, 2, 2, 2]],
  );
  const resources = hullEffect.fields.resources.map(ref => referencedNode(document, ref).fields);
  assert.deepEqual(resources, [
    { name: "AlbedoMap", resourcePath: "res:/hull.dds" },
    { name: "NormalMap", resourcePath: "res:/normal.dds" },
  ]);
  const transparentArea = referencedNode(document, mesh.fields.transparentAreas[0]);
  const transparentEffect = referencedNode(document, transparentArea.fields.effect);
  assert.deepEqual(referencedNode(document, transparentEffect.fields.options[0]).fields, {
    name: "SPACE_OBJECT_TRANSPARENCY",
    value: "SOT_TRANSPARENT",
  });
  const depthArea = referencedNode(document, mesh.fields.depthAreas[0]);
  const depthEffect = referencedNode(document, depthArea.fields.effect);
  assert.equal(depthEffect.fields.effectFilePath, "res:/effect/static_depthonlyv5.fx");
  assert.equal(depthEffect.fields.resources.length, 1);
  assert.equal(referencedNode(document, depthEffect.fields.resources[0]).fields.resourcePath, "res:/glass.dds");
});

test("EveSOF routes all five Carbon hull-area batches", () => {
  const data = createData();
  const categories = [
    ["opaqueAreas", "opaque.fx"],
    ["decalAreas", "decal.fx"],
    ["transparentAreas", "transparent.fx"],
    ["additiveAreas", "additive.fx"],
    ["distortionAreas", "distortion.fx"],
  ];
  categories.forEach(([field, shader], index) => {
    data.hull[0][field] = [{
      name: field,
      index,
      count: 1,
      areaType: 0,
      blockedMaterials: 0,
      shader,
      textures: [],
      parameters: [],
    }];
  });
  data.generic.areaShaders = categories.map(([, shader]) => ({
    shader,
    parameters: [],
    defaultParameters: [],
    defaultTextures: [],
    doGenerateDepthArea: false,
    transparencyTextureName: "",
  }));
  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  const document = sof.Build("rifter", "minmatar", "minmatar");
  const mesh = referencedNode(document, rootNode(document).fields.mesh);

  assert.equal(mesh.fields.opaqueAreas.length, 2);
  assert.equal(mesh.fields.transparentAreas.length, 1);
  assert.equal(mesh.fields.additiveAreas.length, 1);
  assert.equal(mesh.fields.distortionAreas.length, 1);
  const opaqueEffect = referencedNode(document, referencedNode(document, mesh.fields.opaqueAreas[0]).fields.effect);
  const decalEffect = referencedNode(document, referencedNode(document, mesh.fields.opaqueAreas[1]).fields.effect);
  assert.equal(referencedNode(document, opaqueEffect.fields.options[0]).fields.value, "SOT_OPAQUE");
  assert.equal(referencedNode(document, decalEffect.fields.options[0]).fields.value, "SOT_CLIP");
});

test("EveSOFDataMgr and EveSOFDNA resolve legacy and SOF6 pattern applications", () => {
  const data = createData();
  const layer = {
    materialSource: 0,
    projectionTypeU: 1,
    projectionTypeV: 2,
    textureName: "PatternMask",
    textureResFilePath: "res:/pattern.dds",
    isTargetMtl1: true,
    isTargetMtl2: false,
    isTargetMtl3: true,
    isTargetMtl4: false,
  };
  const transform = {
    position: [1, 2, 3],
    scaling: [4, 5, 6],
    rotation: [0, 0, 0, 1],
    isMirrored: true,
  };
  data.pattern = [{
    name: "legacy",
    sof6: false,
    layer1: layer,
    layer2: null,
    projections: [{ name: "rifter", transformLayer1: transform, transformLayer2: null }],
    applicationGroups: [],
  }];
  data.faction[0].defaultPattern = layer;
  data.hull[0].defaultPattern = { transformLayer1: transform, transformLayer2: null };
  const manager = new EveSOFDataMgr();
  assert.equal(manager.SetData(data), true);

  const explicit = new EveSOFDNA();
  explicit.Setup("rifter:minmatar:minmatar:pattern?legacy;none;none", manager);
  const application = explicit.GetPatternApplicationData();
  assert.equal(explicit.GetPatternLayerCount(), 2);
  assert.deepEqual(explicit.GetPatternProjectionData(application, 0), {
    enabled: true,
    position: [1, 2, 3],
    scaling: [4, 5, 6],
    rotation: [0, 0, 0, 1],
    isMirrored: true,
  });
  assert.deepEqual(explicit.GetMaterialTargets(explicit.GetPatternLayerData(application, 0)), [1, 0, 1, 0]);
  assert.equal(explicit.IsPatternLayerApplicableToArea(explicit.GetPatternLayerData(application, 0), 0), true);
  assert.equal(explicit.GetPatternLayerData(application, 2), null);

  const fallback = new EveSOFDNA();
  fallback.Setup("rifter:minmatar:minmatar", manager);
  assert.equal(fallback.GetPatternLayerCount(), 1);
  assert.equal(fallback.GetPatternApplicationData().layerAndProjection.length, 1);
  const invalid = new EveSOFDNA();
  invalid.Setup("rifter:minmatar:minmatar:pattern?missing;none;none", manager);
  assert.equal(invalid.GetPatternLayerCount(), 0);
  assert.equal(invalid.GetPatternApplicationData(), null);

  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  const document = sof.BuildFromDNA("rifter:minmatar:minmatar:pattern?legacy;none;none");
  const masks = rootNode(document).fields.customMasks.map(ref => referencedNode(document, ref));
  assert.equal(masks.length, 1);
  assert.deepEqual(masks[0].fields, {
    position: [1, 2, 3],
    scaling: [4, 5, 6],
    rotation: [0, 0, 0, 1],
    isMirrored: true,
    clampU: true,
    clampV: false,
    materialIndex: 0,
    targetMaterials: [1, 0, 1, 0],
  });
});

test("EveSOF emits SOF6 PPT resources and Carbon sampler overrides", async () => {
  const data = createData();
  data.hull[0].sof6 = true;
  data.hull[0].opaqueAreas = [{
    name: "Hull",
    index: 0,
    count: 1,
    areaType: 0,
    blockedMaterials: 0,
    shader: "ship.fx",
    textures: [{ name: "PatternMask", resFilePath: "res:/hull-wins.dds" }],
    parameters: [],
  }];
  data.faction[0].defaultPatternName = "sof6";
  data.pattern = [{
    name: "sof6",
    sof6: true,
    layer1: {
      materialSource: 0,
      textureName: "PatternMask",
      textureResFilePath: "res:/pattern.dds",
      isTargetMtl1: true,
      isTargetMtl2: true,
      isTargetMtl3: true,
      isTargetMtl4: true,
    },
    layer2: null,
    projections: [],
    applicationGroups: [{
      name: "ships",
      layer1Properties: {
        projectionTypeU: 1,
        projectionTypeV: 2,
        Primary: true,
        Glass: false,
        Sails: true,
        Reactor: true,
        Darkhull: true,
        Rock: true,
        Monument: true,
        Ornament: true,
        SimplePrimary: true,
        isTargetMtl1: true,
        isTargetMtl2: false,
        isTargetMtl3: false,
        isTargetMtl4: true,
      },
      layer2Properties: null,
      projections: [{
        name: "rifter",
        transformLayer1: { position: [0, 0, 0], scaling: [1, 1, 1], rotation: [0, 0, 0, 1], isMirrored: false },
        transformLayer2: null,
      }],
    }],
  }];
  data.generic.areaShaders = [{
    shader: "ship.fx",
    parameters: [],
    defaultParameters: [],
    defaultTextures: [{ name: "PatternMask", resFilePath: "res:/default.dds" }],
    doGenerateDepthArea: false,
    transparencyTextureName: "",
  }];
  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  const document = sof.Build("rifter", "minmatar", "minmatar");
  const effect = referencedNode(
    document,
    referencedNode(document, referencedNode(document, rootNode(document).fields.mesh).fields.opaqueAreas[0]).fields.effect,
  );
  assert.deepEqual(
    effect.fields.options.map(ref => referencedNode(document, ref).fields.value),
    ["SOT_OPAQUE", "SOPPT_ENABLED"],
  );
  assert.deepEqual(effect.fields.resources.map(ref => referencedNode(document, ref).fields), [
    { name: "PatternMask", resourcePath: "res:/hull-wins.dds" },
  ]);
  assert.deepEqual(referencedNode(document, effect.fields.samplerOverrides[0]).fields, {
    name: "PatternMaskSampler",
    addressU: 3,
    addressV: 4,
    addressW: 1,
    filter: 3,
    mipFilter: 2,
    lodBias: 0,
    maxMipLevel: 0,
    maxAnisotropy: 4,
  });
  const customMask = referencedNode(document, rootNode(document).fields.customMasks[0]);
  assert.deepEqual(customMask.fields, {
    position: [0, 0, 0],
    scaling: [1, 1, 1],
    rotation: [0, 0, 0, 1],
    isMirrored: false,
    clampU: true,
    clampV: false,
    materialIndex: 0,
    targetMaterials: [1, 0, 0, 1],
  });
  if (existsSync(trinityConsumerEntry))
  {
    const trinity = await import(trinityConsumerEntry);
    const audioTrinity = await import(audioTrinityConsumerEntry);
    const registry = CjsClassRegistry.fromMaps({ constructors: { ...trinity, ...audioTrinity } });
    const hydrated = CjsDocumentHydrator.hydrate(document, { registry });
    assert.deepEqual(hydrated.reports, []);
    const sampler = hydrated.root.mesh.opaqueAreas[0].effect.samplerOverrides[0];
    assert.equal(sampler.constructor.name, "Tr2SamplerOverride");
    assert.equal(sampler.addressU, 3);
    assert.equal(sampler.addressW, 1);
    assert.equal(sampler.maxAnisotropy, 4);
    assert.equal(hydrated.root.customMasks[0].constructor.name, "EveCustomMask");
    assert.deepEqual(Array.from(hydrated.root.customMasks[0].targetMaterials), [1, 0, 0, 1]);
  }
});

test("EveSOF emits and hydrates Carbon's extension-root placement branch", {
  skip: !existsSync(trinityConsumerEntry),
}, async () => {
  const data = createData();
  data.hull[0].buildClass = EveSOFDataHull.BuildClass.BUILDCLASS_EXTENSION;
  data.hull[0].geometryResFilePath = "res:/model/solo-extension.gr2";
  data.hull[0].castShadow = true;
  data.hull[0].opaqueAreas = [];
  data.hull[0].instancedMeshes = [{
    geometryResPath: "res:/model/authored-instance.gr2",
    shader: "",
    instances: [{
      rotation: [0, 0, 0, 1],
      scaling: [1, 1, 1],
      translation: [4, 5, 6],
      boneIndex: 2,
    }],
  }];
  data.hull[0].locatorSets = [{
    name: "nested-ordinary",
    locators: [{ position: [10, 0, 0], rotation: [0, 0, 0, 1], scaling: [1, 1, 1], boneIndex: 3 }],
  }, {
    name: "nested-shared",
    locators: [{ position: [0, 10, 0], rotation: [0, 0, 0, 1], scaling: [1, 1, 1], boneIndex: 4 }],
  }];
  data.hull[1].geometryResFilePath = "res:/model/nested-extension.gr2";
  data.hull[1].isSkinned = false;
  data.hull[1].opaqueAreas = [{
    name: "Nested Hull",
    index: 0,
    count: 1,
    areaType: 0,
    blockedMaterials: 0,
    shader: "nested.fx",
    textures: [],
    parameters: [],
  }];
  data.generic.areaShaderLocation = "res:/effect";
  data.generic.shaderPrefix = "static_";
  data.generic.areaShaders = [{
    shader: "nested.fx",
    parameters: [],
    defaultParameters: [],
    defaultTextures: [],
    doGenerateDepthArea: false,
    transparencyTextureName: "",
  }];
  data.layout = [{
    name: "extension-layout",
    seed: 1,
    placements: [{
      name: "nested-ordinary",
      locatorSetName: "nested-ordinary",
      descriptor: { hull: "rifter2" },
      isInstanced: false,
      isShared: false,
      extendsBoundingSphere: false,
      extendsShieldEllipsoid: false,
    }, {
      name: "nested-shared",
      locatorSetName: "nested-shared",
      descriptor: { hull: "rifter2" },
      isInstanced: true,
      isShared: true,
      extendsBoundingSphere: false,
      extendsShieldEllipsoid: false,
    }],
  }];
  data.faction[0].colorSet = {
    Primary: [1, 0, 0, 1],
    PrimaryHologram: [22, 122, 222, 1],
    PrimarySpotlight: [36, 136, 236, 1],
    PrimaryDockedFX: [0, 1, 0, 1],
  };
  data.pattern = [{
    name: "legacy",
    sof6: false,
    layer1: { textureName: "PatternMask", textureResFilePath: "res:/pattern.dds" },
    layer2: null,
    projections: [{
      name: "rifter",
      transformLayer1: { position: [0, 0, 0], scaling: [1, 1, 1], rotation: [0, 0, 0, 1] },
      transformLayer2: null,
    }],
    applicationGroups: [],
  }];
  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  const document = sof.BuildFromDNA(
    "rifter:minmatar:minmatar:pattern?legacy;none;none:layout?extension-layout",
  );
  const root = rootNode(document);
  assert.equal(root.kind, "EveMobile");
  assert.deepEqual(root.fields.customMasks, []);
  assert.deepEqual(root.fields.decals, []);
  assert.deepEqual(root.fields.attachments, []);
  assert.deepEqual(root.fields.controllers, []);
  assert.deepEqual(root.fields.observers, []);
  assert.deepEqual(root.fields.shapeEllipsoidCenter, [0, 0, 0]);
  assert.deepEqual(root.fields.shapeEllipsoidRadius, [-1, -1, -1]);
  assert.equal(root.fields.dynamicBoundingSphereEnabled, false);
  assert.equal(root.fields.castShadow, false);
  assert.equal(root.fields.isAnimated, false);
  assert.equal(root.fields.reflectionMode, 3);
  const inheritNode = referencedNode(document, root.fields.inheritProperties);
  assert.equal(inheritNode.kind, "EveChildInheritProperties");
  assert.equal(Object.keys(inheritNode.fields).length, 44);
  assert.deepEqual(inheritNode.fields.Primary, [1, 0, 0, 1]);
  assert.deepEqual(inheritNode.fields.PrimaryHologram, [22, 122, 222, 1]);
  assert.deepEqual(inheritNode.fields.PrimarySpotlight, [36, 136, 236, 1]);
  assert.deepEqual(inheritNode.fields.PrimaryDockedFx, [0, 1, 0, 1]);
  const rootMesh = referencedNode(document, root.fields.mesh);
  assert.equal(rootMesh.kind, "Tr2Mesh");
  assert.deepEqual(rootMesh.fields, {});
  assert.deepEqual(root.fields.effectChildren.map(ref => referencedNode(document, ref).fields.name), [
    "Instanced Meshes",
    "SharedInstancedMeshes",
    "Extension Container",
  ]);
  const extensionContainer = referencedNode(document, root.fields.effectChildren.at(-1));
  assert.equal(extensionContainer.kind, "EveChildContainer");
  assert.equal(extensionContainer.fields.name, "Extension Container");
  assert.equal(extensionContainer.fields.alwaysOn, true);
  assert.equal(extensionContainer.fields.origin, 1);
  assert.equal(extensionContainer.fields.isPlacementRoot, true);
  assert.equal(extensionContainer.fields.objects.length, 2);
  const hull = referencedNode(document, extensionContainer.fields.objects[0]);
  assert.equal(hull.kind, "EveChildMesh");
  assert.equal(hull.fields.name, "Hull");
  assert.equal(hull.fields.castShadow, true);
  assert.equal(hull.fields.staticTransform, true);
  assert.equal(referencedNode(document, hull.fields.mesh).fields.geometryResPath, "res:/model/solo-extension.gr2");
  assert.equal(hull.fields.translation, undefined);
  assert.equal(referencedNode(document, extensionContainer.fields.objects[1]).fields.name, "Hull");

  const trinity = await import(trinityConsumerEntry);
  const audioTrinity = await import(audioTrinityConsumerEntry);
  const registry = CjsClassRegistry.fromMaps({ constructors: { ...trinity, ...audioTrinity } });
  const adapter = createSofHydrationAdapter();
  const hydrated = CjsDocumentHydrator.hydrate(document, { registry, adapter });
  assert.deepEqual(hydrated.reports, []);
  assert.equal(hydrated.root.constructor.name, "EveMobile");
  assert.equal(hydrated.root.mesh.geometryResPath, "");
  assert.deepEqual(hydrated.root.effectChildren.map(child => child.name), [
    "Instanced Meshes",
    "SharedInstancedMeshes",
    "Extension Container",
  ]);
  const hydratedExtension = hydrated.root.effectChildren.at(-1);
  assert.equal(hydratedExtension.origin, 1);
  assert.equal(hydratedExtension.objects[0].name, "Hull");
  assert.equal(hydratedExtension.objects[0].mesh.geometryResPath, "res:/model/solo-extension.gr2");
  assert.equal(hydratedExtension.objects[1].mesh.geometryResPath, "res:/model/nested-extension.gr2");
  assert.equal(hydrated.root.effectChildren[1].GetMeshCount(), 1);
  assert.equal(hydratedExtension.isPlacementRoot, true);
  const inheritedColors = hydrated.root.inheritProperties.GetProperties();
  const expectedColors = Object.values(inheritNode.fields);
  assert.equal(inheritedColors.length, 44);
  for (let colorIndex = 0; colorIndex < expectedColors.length; colorIndex++) {
    assert.equal(inheritedColors[colorIndex].length, 4);
    for (let component = 0; component < 4; component++) {
      assert.ok(
        Math.abs(inheritedColors[colorIndex][component] - expectedColors[colorIndex][component]) <= 1e-6,
        `inherit color ${colorIndex}[${component}]`,
      );
    }
  }
  assert.deepEqual(Array.from(inheritedColors[22]), [22, 122, 222, 1]);
  assert.deepEqual(Array.from(inheritedColors[36]), [36, 136, 236, 1]);
});

test("EveSOF degrades missing generic shaders to partial meshes with diagnostics", () => {
  // Carbon never aborts the build on a missing generic shader record: it
  // logs, returns zero for that source vector (keeping areas it already
  // appended), and continues with the remaining batches and hulls
  // (EveSOF.cpp:500-515,564-569,2131-2156).
  const data = createData();
  const area = (name, index, shader) => ({
    name, index, count: 1, areaType: 0, blockedMaterials: 0, shader, textures: [], parameters: [],
  });
  data.hull[0].opaqueAreas = [area("Good", 0, "ship.fx"), area("Broken", 1, "missing.fx")];
  data.hull[0].transparentAreas = [area("Glass", 2, "glass.fx")];
  data.generic.areaShaderLocation = "res:/effect";
  data.generic.areaShaders = [
    {
      shader: "ship.fx", parameters: [], defaultParameters: [], defaultTextures: [],
      doGenerateDepthArea: false, transparencyTextureName: "",
    },
    {
      shader: "glass.fx", parameters: [], defaultParameters: [], defaultTextures: [],
      doGenerateDepthArea: true, transparencyTextureName: "",
    },
  ];
  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  const document = sof.Build("rifter", "minmatar", "minmatar");
  assert.ok(document, "build continues despite the missing shader record");
  const mesh = referencedNode(document, rootNode(document).fields.mesh);
  // The area appended before the failure stays; the failed source stops there.
  assert.equal(mesh.fields.opaqueAreas.length, 1);
  assert.equal(referencedNode(document, mesh.fields.opaqueAreas[0]).fields.name, "Good");
  // Later batch types still fill, including their depth clones.
  assert.equal(mesh.fields.transparentAreas.length, 1);
  assert.equal(mesh.fields.depthAreas.length, 1);
  assert.deepEqual(sof.GetBuildDiagnostics(), [{
    code: "missing-generic-shader",
    batchType: TriBatchType.TRIBATCHTYPE_OPAQUE,
    hullIndex: 0,
    shader: "missing.fx",
    area: "Broken",
  }]);
  // A clean rebuild resets the diagnostics.
  data.hull[0].opaqueAreas = [area("Good", 0, "ship.fx")];
  const clean = new EveSOF();
  assert.equal(clean.dataMgr.SetData(data), true);
  assert.ok(clean.Build("rifter", "minmatar", "minmatar"));
  assert.deepEqual(clean.GetBuildDiagnostics(), []);
});

test("EveSOF extension builds continue when a placed hull shader is missing", () => {
  const data = createData();
  data.hull[0].buildClass = EveSOFDataHull.BuildClass.BUILDCLASS_EXTENSION;
  data.hull[0].opaqueAreas = [{
    name: "Broken",
    index: 0,
    count: 1,
    areaType: 0,
    blockedMaterials: 0,
    shader: "missing.fx",
    textures: [],
    parameters: [],
  }];
  data.generic.areaShaders = [];
  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  const document = sof.Build("rifter", "minmatar", "minmatar");
  assert.ok(document, "Carbon-aligned extension build degrades instead of aborting");
  assert.equal(
    sof.GetBuildDiagnostics().some(entry => entry.code === "missing-generic-shader"),
    true,
  );
});

test("EveSOF placement routing preserves root transform children without a Solo container", () => {
  const data = createData();
  data.hull[0].buildClass = EveSOFDataHull.BuildClass.BUILDCLASS_EXTENSION;
  data.hull[0].children = [{
    redFilePath: "res:/direct-transform.red",
    translation: [7, 8, 9],
    buildFilter: EveSOFDataHull.BuildFilter.NON_INSTANCED_PLACEMENT,
  }, {
    redFilePath: "res:/unowned-effect.red",
    buildFilter: EveSOFDataHull.BuildFilter.NON_INSTANCED_PLACEMENT,
  }];
  const sof = new EveSOF();
  sof.SetChildResourceResolver(path => path === "res:/direct-transform.red" ? {
    kind: "EveTransform",
    target: "children",
    fields: { children: [], particleEmitters: [] },
  } : path === "res:/unowned-effect.red" ? {
    kind: "EveChildMesh",
    target: "effectChildren",
    fields: { name: "unowned-effect", mesh: null, decals: [], attachments: [], lights: [] },
  } : null);
  assert.equal(sof.dataMgr.SetData(data), true);

  const document = sof.Build("rifter", "minmatar", "minmatar");
  const root = rootNode(document);
  const extension = referencedNode(document, root.fields.effectChildren.at(-1));
  assert.equal(root.fields.children.length, 1);
  assert.deepEqual(referencedNode(document, root.fields.children[0]).fields.translation, [7, 8, 9]);
  assert.equal(extension.fields.objects.length, 1);
  assert.equal(referencedNode(document, extension.fields.objects[0]).fields.name, "Hull");
  assert.equal(extension.fields.objects.some(ref => referencedNode(document, ref).fields.name === "unowned-effect"), false);
  assert.equal(document.nodes.some(node => node.fields?.name === "unowned-effect"), false);
});

test("EveSOF routes animated extension children through Solo Placement", {
  skip: !existsSync(trinityConsumerEntry),
}, async () => {
  const data = createData();
  data.hull[0].buildClass = EveSOFDataHull.BuildClass.BUILDCLASS_EXTENSION;
  data.hull[0].isSkinned = true;
  data.hull[0].children = [{
    redFilePath: "res:/extension-child.red",
    buildFilter: EveSOFDataHull.BuildFilter.NON_INSTANCED_PLACEMENT,
  }, {
    redFilePath: "res:/extension-transform.red",
    translation: [3, 4, 5],
    buildFilter: EveSOFDataHull.BuildFilter.NON_INSTANCED_PLACEMENT,
  }];
  data.hull[0].animations = [{
    name: "extension-animation",
    startRotationTime: 0,
    endRotationTime: 1,
    startRotationValue: [0, 0, 0, 1],
    endRotationValue: [0, 0, 1, 0],
  }];
  data.hull[0].controllers = [{
    path: "res:/extension-controller.red",
    buildFilter: EveSOFDataHull.BuildFilter.NON_INSTANCED_PLACEMENT,
  }];
  data.hull[0].soundEmitters = [{
    name: "extension-audio",
    prefix: "extension_",
    position: [2, 3, 4],
    rotation: [0, 0, 0, 1],
  }];

  const sof = new EveSOF();
  sof.SetChildResourceResolver(path => {
    if (path === "res:/extension-child.red") return {
      kind: "EveChildMesh",
      target: "effectChildren",
      fields: { name: "legacy-extension-effect", mesh: null, decals: [], attachments: [], lights: [] },
    };
    if (path === "res:/extension-transform.red") return {
      kind: "EveTransform",
      target: "children",
      fields: { name: "legacy-extension-transform", children: [], particleEmitters: [] },
    };
    return null;
  });
  sof.SetObjectResourceResolver((path, context) => (
    path === "res:/extension-controller.red" && context.role === "controller"
      ? { kind: "Tr2ControllerReference", fields: { name: "extension-controller", curves: [], bindings: [] } }
      : null
  ));
  assert.equal(sof.dataMgr.SetData(data), true);
  const document = sof.Build("rifter", "minmatar", "minmatar");
  const root = rootNode(document);
  const extension = referencedNode(document, root.fields.effectChildren.at(-1));
  assert.equal(extension.fields.name, "Extension Container");
  assert.equal(extension.fields.objects.length, 1);
  const solo = referencedNode(document, extension.fields.objects[0]);
  assert.equal(solo.kind, "EveChildContainer");
  assert.equal(solo.fields.name, "Solo Placement");
  assert.equal(solo.fields.objects.length, 2);
  assert.equal(referencedNode(document, solo.fields.objects[0]).fields.name, "Hull");
  assert.equal(referencedNode(document, solo.fields.objects[1]).fields.name, "legacy-extension-effect");
  assert.equal(solo.fields.controllers.length, 1);
  assert.equal(solo.fields.observers.length, 1);
  assert.equal(solo.fields.curveSets.length, 0);
  assert.equal(root.fields.children.length, 1);
  assert.equal(referencedNode(document, root.fields.children[0]).fields.name, "legacy-extension-transform");
  assert.deepEqual(referencedNode(document, root.fields.children[0]).fields.translation, [3, 4, 5]);
  assert.equal(root.fields.curveSets.length, 1);
  assert.equal(referencedNode(document, root.fields.curveSets[0]).fields.name, "extension-animation");
  assert.equal(referencedNode(document, root.fields.modelRotationCurve).kind, "Tr2RotationAdapter");
  assert.equal(solo.fields.animationOwner.$ref, solo.fields.objects[0].$ref);

  const trinity = await import(trinityConsumerEntry);
  const audioTrinity = await import(audioTrinityConsumerEntry);
  const registry = CjsClassRegistry.fromMaps({ constructors: { ...trinity, ...audioTrinity } });
  const adapter = createSofHydrationAdapter();
  const hydrated = CjsDocumentHydrator.hydrate(document, { registry, adapter });
  assert.deepEqual(hydrated.reports, []);
  const hydratedSolo = hydrated.root.effectChildren.at(-1).objects[0];
  assert.equal(hydratedSolo.animationOwner, hydratedSolo.objects[0]);
  assert.equal(hydratedSolo.objects[1].name, "legacy-extension-effect");
  assert.equal(hydratedSolo.controllers.length, 1);
  assert.equal(hydrated.root.children[0].constructor.name, "EveTransform");
  assert.equal(hydrated.root.curveSets[0].name, "extension-animation");
  assert.equal(hydrated.root.modelRotationCurve.constructor.name, "Tr2RotationAdapter");
  assert.equal(hydratedSolo.observers[0].observer.constructor.name, "AudEmitter");
  assert.equal(hydratedSolo.observers[0].observer.eventPrefix, "extension_");
});

test("EveSOFDNA resolves explicit and faction material parameters in Carbon order", () => {
  const data = createData();
  data.material.push(
    { name: "explicit", parameters: [{ name: "Diffuse", value: [1, 0, 0, 1] }] },
    { name: "faction", parameters: [{ name: "Diffuse", value: [0, 1, 0, 1] }] },
  );
  data.faction[0].areaTypes = {
    Primary: { material1: "faction", material2: "", material3: "", material4: "", colorType: 0 },
  };
  const manager = new EveSOFDataMgr();
  assert.equal(manager.SetData(data), true);
  const dna = new EveSOFDNA();
  dna.Setup("rifter:minmatar:minmatar:material?explicit;none", manager);
  const hullParameters = new Map([["Mtl1Diffuse", [0, 0, 1, 1]]]);

  assert.deepEqual(dna.GetMeshAreaParameter(0, "Mtl1Diffuse", hullParameters, 0), [1, 0, 0, 1]);
  assert.deepEqual(dna.GetMeshAreaParameter(0, "Mtl1Diffuse", hullParameters, 1), [0, 1, 0, 1]);
  assert.deepEqual(dna.GetMeshAreaParameter(0, "Unknown", hullParameters, 0), null);
});

test("EveSOFDNA remaps turret material slots through faction usage", () => {
  const data = createData();
  data.generic.turretAreaType = EveSOFDataArea.AreaType.TYPE_PRIMARY;
  data.material.push(
    { name: "explicit0", parameters: [{ name: "Diffuse", value: [1, 0, 0, 1] }] },
    { name: "explicit1", parameters: [{ name: "Diffuse", value: [0, 1, 0, 1] }] },
    { name: "faction1", parameters: [{ name: "Diffuse", value: [0, 0, 1, 1] }] },
  );
  data.faction[0].materialUsageMtl1 = 1;
  data.faction[0].areaTypes = {
    Primary: { material1: "", material2: "faction1", material3: "", material4: "", colorType: 0 },
  };
  const manager = new EveSOFDataMgr();
  assert.equal(manager.SetData(data), true);

  const explicit = new EveSOFDNA();
  explicit.Setup("rifter:minmatar:minmatar:material?explicit0;explicit1", manager);
  assert.equal(explicit.IsValid(), true);
  assert.deepEqual(explicit.GetFactionTurretParameters("Mtl1Diffuse"), [0, 1, 0, 1]);

  const faction = new EveSOFDNA();
  faction.Setup("rifter:minmatar:minmatar", manager);
  assert.equal(faction.IsValid(), true);
  assert.deepEqual(faction.GetFactionTurretParameters("Mtl1Diffuse"), [0, 0, 1, 1]);
  assert.equal(faction.GetFactionTurretParameters("Unknown"), null);
});

test("EveSOF applies faction and DNA turret materials to both effect parameter paths", () => {
  const data = createData();
  data.generic.turretAreaType = EveSOFDataArea.AreaType.TYPE_PRIMARY;
  data.material.push(
    { name: "explicit0", parameters: [{ name: "Diffuse", value: [1, 0, 0, 1] }] },
    { name: "explicit1", parameters: [{ name: "Diffuse", value: [0, 1, 0, 1] }] },
    { name: "faction1", parameters: [{ name: "Diffuse", value: [0, 0, 1, 1] }] },
  );
  data.faction[0].materialUsageMtl1 = 1;
  data.faction[0].areaTypes = {
    Primary: { material1: "", material2: "faction1", material3: "", material4: "", colorType: 0 },
  };
  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);

  let starts = 0;
  let ends = 0;
  let ignoredDynamicWrites = 0;
  const constantValue = new Float32Array(4);
  const constantEffect = {
    constParameters: [{ name: "Mtl1Diffuse", value: constantValue }],
    parameters: [{ name: "Mtl1Diffuse", SetValue: () => ignoredDynamicWrites++ }],
    StartUpdate: () => starts++,
    EndUpdate: () => ends++,
  };
  sof.SetupTurretMaterialFromFaction({ turretEffect: constantEffect }, "minmatar");
  assert.deepEqual(Array.from(constantValue), [0, 0, 1, 1]);
  assert.equal(starts, 1);
  assert.equal(ends, 1);
  assert.equal(ignoredDynamicWrites, 0);

  let dynamicValue = null;
  const dynamicEffect = {
    constParameters: [],
    parameters: [
      { GetParameterName: () => "Mtl1Diffuse", SetValue: value => dynamicValue = Array.from(value) },
      { GetParameterName: () => "Mtl1Diffuse" },
    ],
  };
  sof.SetupTurretMaterialFromDNA(
    { GetShader: () => dynamicEffect },
    "rifter:minmatar:minmatar:material?explicit0;explicit1",
  );
  assert.deepEqual(dynamicValue, [0, 1, 0, 1]);

  dynamicValue = null;
  sof.SetupTurretMaterialFromDNA({ turretEffect: dynamicEffect }, "invalid");
  assert.equal(dynamicValue, null);
});

test("EveSOFDNA texture inserts require an explicit resource-existence resolver", () => {
  const data = createData();
  data.faction[0].resPathInsert = "amarr";
  const manager = new EveSOFDataMgr();
  assert.equal(manager.SetData(data), true);
  const dna = new EveSOFDNA();
  dna.Setup("rifter:minmatar:minmatar", manager);
  const original = "res:/x/ship_d.dds";
  const candidate = "res:/x/amarr/ship_amarr_d.dds";

  assert.equal(dna.ModifyTextureResPath(original), original);
  assert.equal(dna.ModifyTextureResPath(original, path => path === candidate), candidate);
  const disabled = new EveSOFDNA();
  disabled.Setup("rifter:minmatar:minmatar:respathinsert?none", manager);
  assert.equal(disabled.ModifyTextureResPath(original, () => true), original);
});

test("instanced-mesh value defaults and parent enum objects match Carbon", () => {
  const data = new EveSOFDataInstancedMesh();
  assert.equal(data.displayModifier, 5);
  assert.equal(EveSOFDataInstancedMesh.DisplayQualityModifier.SHADER_ALL, 5);
  assert.equal(Object.isFrozen(EveSOFDataInstancedMesh.DisplayQualityModifier), true);
  assert.deepEqual(Array.from(new EveSofDataMeshInstance().scaling), [1, 1, 1]);

  const graphics = new EveSOFDataHullExtensionPlacementDistributionMapGraphicSettings();
  assert.equal(graphics.displayFilter, 5);
  assert.equal(graphics.constructor.DisplayQualityModifier.ONLY_REFLECTIONS, 6);
});

test("EveSOFDataMgr packs and detaches Carbon instanced-mesh projections", () => {
  const data = createData();
  const authored = {
    name: "antenna",
    lowestLodVisible: 2,
    displayModifier: 5,
    geometryResPath: "res:/model/antenna.gr2",
    shader: "instance.fx",
    textures: [
      { name: "ZMap", resFilePath: "res:/z.dds" },
      { name: "AMap", resFilePath: "res:/old-a.dds" },
      { name: "AMap", resFilePath: "res:/a.dds" },
    ],
    instances: [{
      rotation: [0, 0, 0, 1],
      scaling: [2, 3, 4],
      translation: [5, 6, 7],
      boneIndex: 9,
    }],
  };
  data.hull[0].instancedMeshes = [authored];
  data.hull[1].instancedMeshes = [{ name: "second-hull", instances: [] }];
  const manager = new EveSOFDataMgr();
  assert.equal(manager.SetData(data), true);
  const projected = manager.GetHullData("rifter").instancedMeshes[0];
  const instance = projected.instances[0];
  assert.deepEqual(instance.transform0, [2, 0, 0, 5]);
  assert.deepEqual(instance.transform1, [0, 3, 0, 6]);
  assert.deepEqual(instance.transform2, [0, 0, 4, 7]);
  assert.deepEqual(instance.lastTransform0, instance.transform0);
  assert.notEqual(instance.lastTransform0, instance.transform0);
  assert.equal(instance.boneIndex, 9);
  assert.deepEqual([...projected.textures.keys()], ["AMap", "ZMap"]);
  assert.equal(projected.textures.get("AMap").resFilePath, "res:/a.dds");
  assert.deepEqual(projected.bounds, { min: [1, -3, -9], max: [9, 15, 23] });

  authored.instances[0].translation[0] = 99;
  authored.textures[2].resFilePath = "res:/mutated.dds";
  assert.equal(instance.transform0[3], 5);
  assert.equal(projected.textures.get("AMap").resFilePath, "res:/a.dds");

  const dna = new EveSOFDNA();
  dna.Setup("rifter;rifter2:minmatar:minmatar", manager);
  assert.equal(dna.GetHullInstancedMeshes()[0].name, "antenna");
});

test("SOF emits and hydrates Carbon instanced attachments with public CPU instance data", {
  skip: !existsSync(trinityConsumerEntry),
}, async () => {
  const data = createData();
  data.hull[0].castShadow = true;
  data.hull[0].instancedMeshes = [{
    name: "unused-authored-name",
    lowestLodVisible: 2,
    displayModifier: 0,
    geometryResPath: "res:/model/antenna.gr2",
    shader: "instance.fx",
    textures: [
      { name: "SharedMap", resFilePath: "res:/x/shared_d.dds" },
      { name: "ZMap", resFilePath: "res:/x/z_d.dds" },
    ],
    instances: [
      { rotation: [0, 0, 0, 1], scaling: [2, 3, 4], translation: [5, 6, 7], boneIndex: 9 },
      { rotation: [0, 0, 0, 1], scaling: [1, 1, 1], translation: [-1, 8, 2], boneIndex: 3 },
    ],
  }, {
    name: "empty-but-container-still-exists",
    instances: [],
  }];
  data.faction[0].resPathInsert = "insert";
  data.generic.areaShaderLocation = "res:/effect";
  data.generic.areaShaders = [{
    shader: "instance.fx",
    parameters: [],
    defaultParameters: [{ name: "General", value: [1, 2, 3, 4] }],
    defaultTextures: [
      { name: "AMap", resFilePath: "res:/generic/a.dds" },
      { name: "SharedMap", resFilePath: "res:/generic/shared.dds" },
    ],
    doGenerateDepthArea: false,
    transparencyTextureName: "",
  }];

  const sof = new EveSOF();
  sof.SetResourceExistsResolver(path => path.includes("/insert/"));
  assert.equal(sof.dataMgr.SetData(data), true);
  const document = sof.Build("rifter", "minmatar", "minmatar");
  const root = rootNode(document);
  assert.equal(root.fields.effectChildren.length, 1);
  const mainContainer = referencedNode(document, root.fields.effectChildren[0]);
  assert.equal(mainContainer.kind, "EveChildContainer");
  assert.equal(mainContainer.fields.name, "Instanced Meshes");
  assert.equal(mainContainer.fields.objects.length, 1);
  const quality = referencedNode(document, mainContainer.fields.objects[0]);
  assert.equal(quality.fields.name, "Shader Quality Controlled Instanced Mesh");
  assert.equal(quality.fields.displayFilter, 0);
  const child = referencedNode(document, quality.fields.objects[0]);
  assert.equal(child.fields.name, "");
  assert.equal(child.fields.minScreenSize, 2.5);
  assert.equal(child.fields.castShadow, true);
  assert.equal(child.fields.lowestLodVisible, 2);

  const mesh = referencedNode(document, child.fields.mesh);
  assert.equal(mesh.kind, "Tr2InstancedMesh");
  assert.equal(mesh.fields.geometryResPath, "res:/model/antenna.gr2");
  assert.equal(mesh.fields.boundsMethod, 2);
  assert.equal(mesh.fields.maxInstanceSize, 4);
  assert.equal(mesh.fields.opaqueAreas.length, 1);
  assert.equal(mesh.fields.instanceGeometryResPath, "res:/model/antenna.gr2");
  const runtimeData = referencedNode(document, mesh.fields.instanceGeometryResource);
  assert.equal(runtimeData.fields.layout.length, 7);
  assert.equal(runtimeData.fields.layout[6].type, "BYTE_4");
  assert.equal(runtimeData.fields.explicitBoundingBox, true);
  assert.deepEqual(runtimeData.fields.aabbMin, [-1, 6, 2]);
  assert.deepEqual(runtimeData.fields.aabbMax, [5, 8, 7]);
  assert.deepEqual(runtimeData.fields.rows[0].transform0, [2, 0, 0, 5]);
  assert.deepEqual(child.fields.instanceTransforms[0], [
    2, 0, 0, 0,
    0, 3, 0, 0,
    0, 0, 4, 0,
    5, 6, 7, 1,
  ]);

  const area = referencedNode(document, mesh.fields.opaqueAreas[0]);
  const effect = referencedNode(document, area.fields.effect);
  assert.equal(area.fields.name, "hull");
  assert.equal(effect.fields.effectFilePath, "res:/effect/instance.fx");
  assert.deepEqual(effect.fields.options.map(ref => referencedNode(document, ref).fields), [{
    name: "SPACE_OBJECT_INSTANCED_ATTACHMENT",
    value: "SOIA_ENABLED",
  }]);
  assert.deepEqual(effect.fields.resources.map(ref => referencedNode(document, ref).fields), [
    { name: "SharedMap", resourcePath: "res:/x/insert/shared_insert_d.dds" },
    { name: "ZMap", resourcePath: "res:/x/insert/z_insert_d.dds" },
    { name: "AMap", resourcePath: "res:/generic/a.dds" },
  ]);

  const trinity = await import(trinityConsumerEntry);
  const audioTrinity = await import(audioTrinityConsumerEntry);
  const registry = CjsClassRegistry.fromMaps({ constructors: { ...trinity, ...audioTrinity } });
  const adapter = createSofHydrationAdapter();
  const hydrated = CjsDocumentHydrator.hydrate(document, { registry, adapter });
  assert.deepEqual(hydrated.reports, []);
  const hydratedQuality = hydrated.root.effectChildren[0].objects[0];
  const hydratedChild = hydratedQuality.objects[0];
  assert.equal(hydratedChild.mesh.instanceGeometryResPath, "res:/model/antenna.gr2");
  assert.equal(hydratedChild.mesh.geometryResPath, "res:/model/antenna.gr2");
  assert.equal(hydratedChild.mesh.opaqueAreas[0].constructor.name, "Tr2MeshArea");
  const hydratedRuntimeData = hydratedChild.mesh.instanceGeometryResource;
  assert.equal(hydratedRuntimeData.rows.length, 2);
  assert.equal(hydratedRuntimeData.GetCount(), 2);
  assert.equal(hydratedRuntimeData.GetStride(), 100);
  assert.equal(hydratedRuntimeData.GetLayout().length, 7);
  assert.deepEqual(hydratedRuntimeData.GetItemElement(0, 0), [2, 0, 0, 5]);
  assert.equal(hydratedRuntimeData.GetItemElement(0, 6), 9);
  assert.deepEqual(Array.from(hydratedRuntimeData.aabbMin), [-1, 6, 2]);
  assert.deepEqual(Array.from(hydratedRuntimeData.aabbMax), [5, 8, 7]);
  assert.equal(hydratedRuntimeData.dirty, false);
  assert.equal(hydratedRuntimeData.dataRevision, 1);
  assert.equal(hydratedChild.GetInstanceTransforms().length, 2);
});

test("SOF projects, emits, and hydrates multi-hull Carbon boosters", {
  skip: !existsSync(trinityConsumerEntry),
}, async () => {
  const data = createData();
  data.hull[0].booster = {
    alwaysOn: true,
    hasTrails: false,
    items: [{
      transform: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        1, 2, 3, 1,
      ],
      functionality: [0.1, 0.2, 0.3, 0.4],
      hasTrail: false,
      atlasIndex0: 4,
      atlasIndex1: 5,
      lightScale: 1.5,
    }],
  };
  data.hull[0].locatorSets = [{
    name: "next_subsystem",
    locators: [{ position: [10, 0, 0], rotation: [0, 0, 0, 1], scaling: [1, 1, 1], boneIndex: -1 }],
  }];
  data.hull[1].booster = {
    alwaysOn: false,
    hasTrails: true,
    items: [{
      transform: [
        2, 0, 0, 0,
        0, 3, 0, 0,
        0, 0, 4, 0,
        4, 5, 6, 1,
      ],
      functionality: [1, 1, 1, 1],
      hasTrail: true,
      atlasIndex0: 6,
      atlasIndex1: 7,
      lightScale: 2,
    }],
  };
  const shape = (speed, color) => ({
    noiseFunction: 9,
    noiseSpeed: speed,
    noiseAmplitureStart: [1, 2, 3, 4],
    noiseAmplitureEnd: [5, 6, 7, 8],
    noiseFrequency: [9, 10, 11, 12],
    color,
  });
  data.race[0].booster = {
    scale: [2, 3, 4, 5],
    glowScale: 6,
    glowColor: [0.1, 0.2, 0.3, 0.4],
    warpGlowColor: [0.5, 0.6, 0.7, 0.8],
    symHaloScale: 7,
    haloScaleX: 8,
    haloScaleY: 9,
    haloColor: [0.2, 0.3, 0.4, 0.5],
    warpHalpColor: [0.6, 0.7, 0.8, 0.9],
    trailColor: [0.3, 0.4, 0.5, 0.6],
    trailSize: [10, 11, 12, 13],
    shape0: shape(1, [1, 0, 0, 1]),
    shape1: shape(2, [0, 1, 0, 1]),
    warpShape0: shape(3, [0, 0, 1, 1]),
    warpShape1: shape(4, [1, 1, 0, 1]),
    shapeAtlasResPath: "res:/booster/shape.dds",
    gradient0ResPath: "res:/booster/g0.dds",
    gradient1ResPath: "res:/booster/g1.dds",
    shapeAtlasHeight: 16,
    shapeAtlasCount: 32,
    lightOffset: 14,
    lightRadius: 15,
    lightWarpRadius: 16,
    lightFlickerAmplitude: 17,
    lightFlickerFrequency: 18,
    lightColor: [0.4, 0.5, 0.6, 0.7],
    lightWarpColor: [0.7, 0.8, 0.9, 1],
  };

  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  const dna = sof.CreateDna("rifter;rifter2:minmatar:minmatar");
  assert.equal(dna.GetHullBoosterCount(), 2);
  assert.deepEqual(dna.GetRaceBoosterData().warpHaloColor, [0.6, 0.7, 0.8, 0.9]);
  assert.equal(dna.GetHullBoosterData(1).items[0].atlasIndex1, 7);

  data.race[0].booster.glowColor[0] = 99;
  data.hull[0].booster.items[0].transform[12] = 99;
  assert.equal(dna.GetRaceBoosterData().glowColor[0], 0.1);
  assert.equal(dna.GetHullBoosterData(0).items[0].transform[12], 1);

  const document = sof.BuildFromDNA("rifter;rifter2:minmatar:minmatar");
  const root = rootNode(document);
  const booster = referencedNode(document, root.fields.boosters);
  assert.equal(booster.kind, "EveBoosterSet2");
  assert.equal(booster.fields.alwaysOn, false);
  assert.equal(booster.fields.glowScale, 6);
  assert.deepEqual(booster.fields.warpHaloColor, [0.6, 0.7, 0.8, 0.9]);
  assert.equal(booster.fields.items.length, 2);
  const boosterItems = booster.fields.items.map(ref => referencedNode(document, ref));
  assert.deepEqual(boosterItems.map(node => node.kind), ["EveBoosterSet2Item", "EveBoosterSet2Item"]);
  assert.deepEqual(boosterItems[1].fields.transform.slice(12, 15), [14, 5, 6]);
  assert.deepEqual(
    root.fields.locators
      .map(ref => referencedNode(document, ref))
      .filter(node => node.fields.name.startsWith("locator_booster_"))
      .map(node => [node.fields.name, node.fields.transform.slice(12, 15)]),
    [
      ["locator_booster_1", [1, 2, 3]],
      ["locator_booster_2", [14, 5, 6]],
    ],
  );
  const boosterLocatorSet = root.fields.locatorSets
    .map(ref => referencedNode(document, ref))
    .find(node => node.fields.name === "boosters");
  assert.deepEqual(
    boosterLocatorSet.fields.locators.map(ref => referencedNode(document, ref).fields.position),
    [[1, 2, 3], [14, 5, 6]],
  );
  assert.deepEqual(
    boosterLocatorSet.fields.locators.map(ref => referencedNode(document, ref).fields.scale),
    [[0, 0, 0], [0, 0, 0]],
  );
  assert.equal(referencedNode(document, booster.fields.trails).kind, "EveTrailsSet");
  const nearEffect = referencedNode(document, booster.fields.effect);
  assert.deepEqual(referencedNode(document, nearEffect.fields.options[0]).fields, {
    name: "BOOSTER_LOD",
    value: "BOOSTER_LOD_HIGH",
  });
  assert.deepEqual(
    nearEffect.fields.constParameters.slice(-2).map(ref => referencedNode(document, ref).fields),
    [
      { name: "ShapeAtlasSize", value: [16, 32, 0, 0] },
      { name: "BoosterScale", value: [2, 3, 4, 5] },
    ],
  );

  const trinity = await import(trinityConsumerEntry);
  const audioTrinity = await import(audioTrinityConsumerEntry);
  const registry = CjsClassRegistry.fromMaps({ constructors: { ...trinity, ...audioTrinity } });
  const adapter = createSofHydrationAdapter();
  const hydrated = CjsDocumentHydrator.hydrate(document, { registry, adapter });
  assert.deepEqual(hydrated.reports, []);
  assert.equal(hydrated.root.boosters.constructor.name, "EveBoosterSet2");
  assert.equal(hydrated.root.boosters.effect.constructor.name, "Tr2Effect");
  assert.equal(hydrated.root.boosters.glows.constructor.name, "EveSpriteSet");
  assert.equal(hydrated.root.boosters.items.length, 2);
  assert.equal(hydrated.root.boosters.items[0].constructor.name, "EveBoosterSet2Item");
  const boosterData = hydrated.root.boosters.GetBoosterData();
  assert.equal(boosterData.length, 2);
  assert.deepEqual(Array.from(boosterData[0].transform).slice(12, 15), [1, 2, 3]);
  assert.deepEqual(Array.from(boosterData[1].transform).slice(12, 15), [14, 5, 6]);
  assert.deepEqual(Array.from(boosterData[1].functionality), [1, 1, 1, 1]);
  assert.equal(boosterData[0].hasTrail, false);
  assert.equal(boosterData[1].hasTrail, true);
  assert.equal(boosterData[1].atlasIndex0, 6);
  assert.equal(boosterData[1].atlasIndex1, 7);
  assert.equal(hydrated.root.boosters.glows.GetSprites().length, 6);
  assert.equal(hydrated.root.boosters.trails.GetTrailData().length, 1);
  assert.equal(hydrated.root.boosters.maxSize, 3);
});

function rootNode(document)
{
  return referencedNode(document, document.roots[0].ref);
}

function referencedNode(document, ref)
{
  return document.nodes.find(node => node.id === ref.$ref);
}

function carbonDocument(kind, fields, raw = null)
{
  const node = { id: 1, kind, fields };
  if (raw) node.raw = raw;
  return {
    schema: "carbon.document",
    version: 1,
    roots: [{ name: "default", ref: { $ref: 1 } }],
    nodes: [node],
  };
}

function normalizeTestResourcePath(value)
{
  return String(value ?? "").trim().replace(/\\/gu, "/").replace(/\/+/gu, "/").toLowerCase();
}

function findTextureResourcePath(document, name)
{
  return document.nodes.find(node => node.fields?.name === name && "resourcePath" in node.fields)?.fields.resourcePath ?? null;
}

function configureTestTextureInsert(data)
{
  data.hull[0].opaqueAreas = [{
    name: "hull",
    index: 0,
    count: 1,
    areaType: 0,
    shader: "ship.fx",
    textures: [{ name: "DiffuseMap", resFilePath: "res:/x/ship_d.dds" }],
    parameters: [],
  }];
  data.faction[0].resPathInsert = "insert";
  data.generic.areaShaderLocation = "res:/effect";
  data.generic.areaShaders = [{
    shader: "ship.fx",
    parameters: [],
    defaultParameters: [],
    defaultTextures: [],
    doGenerateDepthArea: false,
    transparencyTextureName: "",
  }];
  return data;
}

function collectJavaScriptFiles(directory)
{
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true }))
  {
    const child = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);
    if (entry.isDirectory()) files.push(...collectJavaScriptFiles(child));
    else if (entry.isFile() && entry.name.endsWith(".js")) files.push(child);
  }
  return files.sort((left, right) => left.href.localeCompare(right.href));
}

function assertDocumentRefsResolve(document)
{
  const ids = new Set(document.nodes.map(node => node.id));
  const visit = value =>
  {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== "object") return;
    if (Object.hasOwn(value, "$ref"))
    {
      assert.equal(ids.has(Number(value.$ref)), true, `missing document ref ${value.$ref}`);
      return;
    }
    Object.values(value).forEach(visit);
  };
  document.roots.forEach(visit);
  document.nodes.forEach(node => {
    visit(node.fields);
    visit(node.raw);
  });
}

test("SOF carbon.document hydrates through the sibling runtime-trinity consumer", {
  skip: !existsSync(trinityConsumerEntry),
}, async () => {
  const trinity = await import(trinityConsumerEntry);
  const audioTrinity = await import(audioTrinityConsumerEntry);
  const registry = CjsClassRegistry.fromMaps({ constructors: { ...trinity, ...audioTrinity } });
  const data = createData();
  data.hull[0].opaqueAreas = [{
    name: "Hull",
    index: 0,
    count: 1,
    areaType: 0,
    blockedMaterials: 0,
    shader: "ship.fx",
    textures: [{ name: "AlbedoMap", resFilePath: "res:/hull.dds" }],
    parameters: [],
  }];
  data.hull[0].locatorTurrets = [{
    name: "turret",
    transform: [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      1, 2, 3, 1,
    ],
  }];
  data.hull[0].locatorSets = [{
    name: "damage",
    locators: [{ position: [4, 5, 6], rotation: [0, 0, 0, 1], scaling: [1, 1, 1], boneIndex: 7 }],
  }];
  data.generic.areaShaderLocation = "res:/effect";
  data.generic.areaShaders = [{
    shader: "ship.fx",
    parameters: [],
    defaultParameters: [{ name: "General", value: [1, 2, 3, 4] }],
    defaultTextures: [],
    doGenerateDepthArea: false,
    transparencyTextureName: "AlbedoMap",
  }];
  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  const document = sof.Build("rifter", "minmatar", "minmatar");
  const hydrated = CjsDocumentHydrator.hydrate(document, { registry });

  assert.deepEqual(hydrated.reports, []);
  assert.equal(hydrated.root.constructor.name, "EveShip2");
  assert.equal(hydrated.root.mesh.constructor.name, "Tr2Mesh");
  assert.equal(hydrated.root.mesh.opaqueAreas[0].constructor.name, "Tr2MeshArea");
  assert.equal(hydrated.root.mesh.opaqueAreas[0].effect.constructor.name, "Tr2Effect");
  assert.equal(hydrated.root.locators[0].constructor.name, "EveLocator2");
  assert.equal(hydrated.root.locatorSets[0].constructor.name, "EveLocatorSets");
  assert.equal(hydrated.root.locatorSets[0].locators[0].constructor.name, "Locator");
  assert.deepEqual(Array.from(hydrated.root.locatorSets[0].locators[0].position), [4, 5, 6]);
});

test("DNA parent-bound accessors copy Carbon parent values", () => {
  const manager = createManager();
  const dna = new EveSOFDNA();
  dna.Setup("rifter:minmatar:minmatar", manager);

  const sphere = dna.GetParentBoundingSphere();
  assert.deepEqual(sphere, [1, 2, 3, 4]);
  sphere[0] = 99;
  assert.deepEqual(dna.GetParentBoundingSphere(), [1, 2, 3, 4]);

  const ellipsoid = dna.GetParentHullShapeEllipsoid();
  assert.deepEqual(Array.from(ellipsoid.center), [5, 6, 7]);
  assert.deepEqual(Array.from(ellipsoid.radius), [8, 9, 10]);
  ellipsoid.center[0] = 42;
  assert.equal(dna.GetParentHullShapeEllipsoid().center[0], 42);

  const sibling = new EveSOFDNA();
  sibling.Setup("rifter:minmatar:minmatar", manager);
  assert.deepEqual(Array.from(sibling.GetParentHullShapeEllipsoid().center), [5, 6, 7]);

  dna.SetParentBoundingSphere([9, 9, 9, 9]);
  const info = { center: [1, 1, 1], radius: [2, 2, 2] };
  dna.SetParentShapeEllipsoidInfo(info);
  info.center[0] = 77;
  assert.deepEqual(dna.GetParentBoundingSphere(), [9, 9, 9, 9]);
  assert.deepEqual(Array.from(dna.GetParentHullShapeEllipsoid().center), [1, 1, 1]);

  assert.equal(dna.GetDecalShader(), 0);
  assert.equal(dna.IsHullUsingDecalSets(), false);
});

test("banners only attach to space-object roots, never layout children", () => {
  const data = createData();
  data.faction[0].visibilityGroupSet = { visibilityGroups: [{ str: "primary" }] };
  data.generic.bannerShader = { shader: "res:/banner.fx", defaultParameters: [], defaultTextures: [] };
  data.hull[0].banners = [{ usage: 3, visibilityGroup: "primary" }];
  data.hull[0].locatorSets = [{
    name: "spots",
    locators: [{ position: [1, 0, 0], rotation: [0, 0, 0, 1], scaling: [1, 1, 1], boneIndex: -1 }],
  }];
  data.hull[1].geometryResFilePath = "res:/model/child.gr2";
  data.hull[1].banners = [{ usage: 3, visibilityGroup: "primary" }];
  data.hull[1].bannerSets = [{ visibilityGroup: "primary", banners: [{ usage: 3 }] }];
  data.layout = [{
    name: "graph",
    seed: 1,
    placements: [{
      name: "child",
      locatorSetName: "spots",
      descriptor: { hull: "rifter2" },
      isInstanced: false,
      isShared: false,
      extendsBoundingSphere: false,
      extendsShieldEllipsoid: false,
    }],
  }];

  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  const document = sof.BuildFromDNA("rifter:minmatar:minmatar:layout?graph");
  const root = rootNode(document);
  const bannerSets = document.nodes.filter(node => node.kind === "EveBannerSet");
  assert.equal(bannerSets.length, 1);
  assert.ok(root.fields.attachments.some(ref => referencedNode(document, ref).kind === "EveBannerSet"));
});

test("editor mode records Carbon placement metadata on layout children", () => {
  const makeData = () =>
  {
    const data = createData();
    data.hull[0].locatorSets = [{
      name: "ordinary",
      locators: [{ position: [1, 2, 3], rotation: [0, 0, 0, 1], scaling: [1, 1, 1], boneIndex: -1 }],
    }, {
      name: "instanced",
      locators: [
        { position: [5, 0, 0], rotation: [0, 0, 0, 1], scaling: [1, 1, 1], boneIndex: 6 },
        { position: [7, 0, 0], rotation: [0, 0, 0, 1], scaling: [1, 1, 1], boneIndex: 8 },
      ],
    }];
    data.generic.areaShaderLocation = "res:/effect";
    data.generic.shaderPrefix = "static_";
    data.generic.areaShaders = [{
      shader: "child.fx",
      parameters: [],
      defaultParameters: [],
      defaultTextures: [],
      doGenerateDepthArea: false,
      transparencyTextureName: "",
    }];
    data.hull[1].geometryResFilePath = "res:/model/child.gr2";
    data.hull[1].isSkinned = false;
    data.hull[1].opaqueAreas = [{
      name: "Child Hull",
      index: 0,
      count: 1,
      areaType: 0,
      blockedMaterials: 0,
      shader: "child.fx",
      textures: [],
      parameters: [],
    }];
    data.layout = [{
      name: "graph",
      seed: 1,
      placements: [{
        name: "ordinary",
        locatorSetName: "ordinary",
        descriptor: { hull: "rifter2" },
        isInstanced: false,
        isShared: false,
        extendsBoundingSphere: false,
        extendsShieldEllipsoid: false,
      }, {
        name: "instanced",
        locatorSetName: "instanced",
        descriptor: { hull: "rifter2" },
        isInstanced: true,
        isShared: false,
        extendsBoundingSphere: false,
        extendsShieldEllipsoid: false,
      }],
    }];
    return data;
  };

  const layoutChildren = document =>
  {
    const root = rootNode(document);
    const layouts = root.fields.effectChildren
      .map(ref => referencedNode(document, ref))
      .find(node => node.kind === "EveChildContainer" && node.fields.name === "layouts");
    assert.ok(layouts);
    return layouts.fields.objects.map(ref => referencedNode(document, ref));
  };

  const editor = new EveSOF().Register({ editorMode: true });
  assert.equal(editor.dataMgr.SetData(makeData()), true);
  const document = editor.BuildFromDNA("rifter:minmatar:minmatar:layout?graph");
  const children = layoutChildren(document);
  const ordinary = children.find(node => node.fields.name === "Hull");
  const instanced = children.find(node => node.fields.name === "Instanced Hull");
  assert.ok(ordinary);
  assert.ok(instanced);
  assert.ok(ordinary.fields.sofDna.startsWith("rifter2:minmatar:minmatar"));
  assert.equal(ordinary.fields.sofParentHullName, "rifter");
  assert.equal(ordinary.fields.sofLocatorSetName, "ordinary");
  assert.equal(ordinary.fields.sofLocatorIndex, "0");
  assert.ok(instanced.fields.sofDna.startsWith("rifter2:minmatar:minmatar"));
  assert.equal(instanced.fields.sofParentHullName, "rifter");
  assert.equal(instanced.fields.sofLocatorSetName, "instanced");
  assert.equal("sofLocatorIndex" in instanced.fields, false);

  const plain = new EveSOF();
  assert.equal(plain.dataMgr.SetData(makeData()), true);
  const plainChildren = layoutChildren(plain.BuildFromDNA("rifter:minmatar:minmatar:layout?graph"));
  for (const child of plainChildren)
  {
    assert.equal(child.fields.sofDna, "");
    assert.equal(child.fields.sofParentHullName, "");
    assert.equal(child.fields.sofLocatorSetName, "");
  }
});

// runtime-sof must be Trinity-free. That was enforced by "no dependency in the
// manifest, no import in the source", and both stayed green for months while
// BuildValuesFromDNA could not run unless its caller handed in the entire
// runtime-trinity class library -- the requirement was satisfied in spelling
// and broken in effect. This test states the property instead: values build
// with nothing supplied. It must not be given a registry, and it deliberately
// does not import runtime-trinity, so it fails the moment a class library
// becomes necessary again.
test("values build with no registry, because SOF emits JSON and JSON needs no classes", () => {
  const data = createData();
  data.hull[0].soundEmitters = [{
    name: "engine",
    prefix: "ship_",
    position: [1, 2, 3],
    rotation: [0, 1, 0, 0],
    attenuationScalingFactor: 2.5,
  }];
  data.hull[0].spriteSets = [
    { visibilityGroup: "primary", items: [{ position: [1, 0, 0], colorType: 0 }] },
    { visibilityGroup: "primary", items: [{ position: [2, 0, 0], colorType: 0 }] },
  ];
  data.faction[0].visibilityGroupSet = { visibilityGroups: [{ str: "primary" }] };
  data.faction[0].colorSet = { Primary: [1, 0, 0, 1] };

  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);

  const values = sof.BuildValuesFromDNA("rifter:minmatar:minmatar");

  assert.equal(values._type, "EveShip2");
  assert.equal(values.schema, undefined);
  assert.equal(values.nodes, undefined);

  // No node-table vocabulary survives the projection, at any depth.
  const text = JSON.stringify(values);
  for (const leaked of [ "\"kind\"", "\"$ref\"", "\"fields\"", "\"raw\"" ])
  {
    assert.equal(text.includes(leaked), false, `values leaked ${leaked} from the document form`);
  }

  // Shared topology still resolves without any class deciding it.
  const spriteSets = values.attachments.filter(item => item._type === "EveSpriteSet");
  assert.equal(spriteSets.length, 2);
  assert.notEqual(spriteSets[0].effect._id, undefined);
  assert.deepEqual(spriteSets[1].effect, { _ref: spriteSets[0].effect._id });

  // A class name is written as data; nothing resolves it here.
  assert.equal(values.observers[0].observer._type, "AudEmitter");
  assert.equal(values.observers[0].observer.eventPrefix, "ship_");
});

test("BuildValuesFromDNA emits plain model values with parity to document hydration", {
  skip: !existsSync(trinityConsumerEntry),
}, async () => {
  const data = createData();
  data.hull[0].sof6 = true;
  data.hull[0].spriteSets = [
    { visibilityGroup: "primary", items: [{ position: [1, 0, 0], colorType: 0 }] },
    { visibilityGroup: "primary", items: [{ position: [2, 0, 0], colorType: 0 }] },
  ];
  data.faction[0].visibilityGroupSet = { visibilityGroups: [{ str: "primary" }] };
  data.faction[0].colorSet = { Primary: [1, 0, 0, 1] };

  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  const trinity = await import(trinityConsumerEntry);
  const audioTrinity = await import(audioTrinityConsumerEntry);
  const registry = CjsClassRegistry.fromMaps({ constructors: { ...trinity, ...audioTrinity } });

  const values = sof.BuildValuesFromDNA("rifter:minmatar:minmatar", { registry });

  // The values result is the model's own GetValues shape: no document wrappers.
  assert.equal(values.schema, undefined);
  assert.equal(values.nodes, undefined);
  assert.equal(values.roots, undefined);
  assert.equal(values._type, "EveShip2");

  // The result survives an ordinary JSON transport hop.
  const transported = JSON.parse(JSON.stringify(values));

  // The shared sprite pool effect stays one object via _id/_ref.
  const spriteSets = transported.attachments.filter(item => item._type === "EveSpriteSet");
  assert.equal(spriteSets.length, 2);
  assert.notEqual(spriteSets[0].effect._id, undefined);
  assert.deepEqual(spriteSets[1].effect, { _ref: spriteSets[0].effect._id });

  // Hydrating the values recreates the same public graph as the document path,
  // and the shared effect is one instance again.
  const RootClass = registry.GetConstructor(transported._type);
  const fromValues = RootClass.from(transported, { registry });
  const hydratedSets = fromValues.attachments.filter(item => item.constructor.name === "EveSpriteSet");
  assert.equal(hydratedSets[0].effect, hydratedSets[1].effect);

  const document = sof.BuildFromDNA("rifter:minmatar:minmatar");
  const hydrated = CjsDocumentHydrator.hydrate(document, { registry, adapter: createSofHydrationAdapter() });
  assert.deepEqual(hydrated.reports, []);
  assert.deepEqual(
    fromValues.GetValues({ refs: true, typeTags: true }),
    hydrated.root.GetValues({ refs: true, typeTags: true })
  );
});

test("values projection carries the audio emitter as a declared node", {
  skip: !existsSync(trinityConsumerEntry),
}, async () => {
  const data = createData();
  data.hull[0].soundEmitters = [{
    name: "engine",
    prefix: "ship_",
    position: [1, 2, 3],
    rotation: [0, 1, 0, 0],
    attenuationScalingFactor: 2.5,
  }];

  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  const trinity = await import(trinityConsumerEntry);
  const audioTrinity = await import(audioTrinityConsumerEntry);
  const registry = CjsClassRegistry.fromMaps({ constructors: { ...trinity, ...audioTrinity } });

  const values = sof.BuildValuesFromDNA("rifter:minmatar:minmatar", { registry });

  // The emitter is declared data in both forms now, so the values graph is a
  // complete rebuild source rather than one that silently drops the audio
  // placement it was carrying all along.
  assert.equal(values.observers.length, 1);
  assert.deepEqual(values.observers[0].position, [1, 2, 3]);
  assert.equal(values.observers[0].observer._type, "AudEmitter");
  assert.equal(values.observers[0].observer.eventPrefix, "ship_");
  assert.equal(JSON.stringify(values).includes("sofAudioEmitterSetup"), false);

  // ...and nothing in this package writes a raw bag any more.
  const document = sof.BuildFromDNA("rifter:minmatar:minmatar");
  const observerNode = referencedNode(document, rootNode(document).fields.observers[0]);
  assert.equal(observerNode.raw, undefined);
  assert.equal(referencedNode(document, observerNode.fields.observer).kind, "AudEmitter");
  assert.equal(document.nodes.some(node => node.raw !== undefined), false);

  const hydrated = CjsDocumentHydrator.hydrate(document, { registry, adapter: createSofHydrationAdapter() });
  assert.deepEqual(hydrated.reports, []);
  const RootClass = registry.GetConstructor(values._type);
  const fromValues = RootClass.from(JSON.parse(JSON.stringify(values)), { registry });
  // The two graphs are built independently, so two things can differ without
  // the paths disagreeing: AudEmitter carries a per-instance runtime counter
  // that increments per construction, and a negated zero in a vector component
  // is a distinct value to strict deep-equal while being the same number.
  // Neither is authored data, and comparing them would assert construction
  // order rather than parity.
  const forParity = (value) => JSON.parse(JSON.stringify(value, (key, item) =>
  {
    if (key === "ID") return undefined;
    return Object.is(item, -0) ? 0 : item;
  }));
  assert.deepEqual(
    forParity(fromValues.GetValues({ refs: true, typeTags: true })),
    forParity(hydrated.root.GetValues({ refs: true, typeTags: true }))
  );
});

test("SOF sync builds defer references and diagnose failed resolution", () => {
  // Without resolvers the build stays complete AS DATA: children and
  // controllers defer through Carbon's own reference nodes (EveChildRef,
  // Tr2ControllerReference) and model curves through the CarbonEngineJS
  // CjsExternalRef, each carrying the authored res path; only bindings that
  // would reach into unloaded graphs are diagnosed.
  const data = createData();
  data.hull[0].children = [{ redFilePath: "res:/child.red", id: 3, translation: [1, 2, 3] }];
  data.hull[0].controllers = [{ path: "res:/controller.red" }];
  data.hull[0].modelTranslationCurvePath = "res:/translation.red";
  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData(data), true);
  const document = sof.Build("rifter", "minmatar", "minmatar");
  const root = rootNode(document);
  assert.equal(root.fields.children.length, 0);
  assert.equal(root.fields.effectChildren.length, 1);
  const childRef = referencedNode(document, root.fields.effectChildren[0]);
  assert.equal(childRef.kind, "EveChildRef");
  assert.equal(childRef.fields.resPath, "res:/child.red");
  assert.equal(childRef.fields.loadChildAutomatically, true);
  assert.deepEqual(childRef.fields.translation, [1, 2, 3]);
  assert.equal(root.fields.controllers.length, 1);
  assert.equal(referencedNode(document, root.fields.controllers[0]).kind, "Tr2ControllerReference");
  const curveRef = referencedNode(document, root.fields.modelTranslationCurve);
  assert.equal(curveRef.kind, "CjsExternalRef");
  assert.equal(curveRef.fields.resPath, "res:/translation.red");
  assert.equal(curveRef.fields.expects, "ITriVectorFunction");
  assert.deepEqual(sof.GetBuildDiagnostics(), [
    { code: "deferred-child-animation-binding", path: "res:/child.red", id: 3 },
  ]);

  // A configured resolver that cannot resolve matches Carbon's logged
  // invalid-resource skip (EveSOF.cpp:1779-1783,2028-2031).
  const resolving = new EveSOF();
  assert.equal(resolving.dataMgr.SetData(data), true);
  resolving.SetChildResourceResolver(() => null);
  resolving.SetObjectResourceResolver(() => null);
  const resolved = rootNode(resolving.Build("rifter", "minmatar", "minmatar"));
  assert.equal(resolved.fields.effectChildren.length, 0);
  assert.equal(resolved.fields.controllers.length, 0);
  assert.deepEqual(
    resolving.GetBuildDiagnostics().map(entry => entry.reason),
    ["not-resolved", "not-resolved", "not-resolved"],
  );
});

test("SOF resFileIndex registration wires the synchronous existence oracle", () => {
  const sof = new EveSOF();
  assert.throws(() => sof.Register({ resFileIndex: 5 }), /resFileIndex/);
  const seen = [];
  sof.Register({ resFileIndex: path => { seen.push(path); return path.endsWith("_d.dds"); } });
  // Set/Map/Has surfaces are accepted equivalently.
  new EveSOF().Register({ resFileIndex: new Set(["res:/a.dds"]) });
  new EveSOF().Register({ resFileIndex: new Map([["res:/a.dds", true]]) });
  new EveSOF().Register({ resFileIndex: { Has: () => true } });
  new EveSOF().Register({ resFileIndex: null });
});

test("EveSOF.Create instantiates from raw catalog inputs only", () => {
  // The catalog is mandatory; garbage bytes propagate the black decoder's
  // failure instead of silently producing an empty factory.
  assert.throws(() => EveSOF.Create(), /requires the sof catalog/);
  assert.throws(() => EveSOF.Create({}), /requires the sof catalog/);
  assert.throws(() => EveSOF.Create({ black: new Uint8Array([1, 2, 3, 4]) }));

  const makeData = () => {
    const data = createData();
    data.hull[0].opaqueAreas = [{
      name: "hull",
      index: 0,
      count: 1,
      areaType: 0,
      shader: "ship.fx",
      textures: [{ name: "DiffuseMap", resFilePath: "res:/x/ship_d.dds" }],
      parameters: [],
    }];
    data.faction[0].resPathInsert = "insert";
    data.generic.areaShaderLocation = "res:/effect";
    data.generic.areaShaders = [{
      shader: "ship.fx",
      parameters: [],
      defaultParameters: [],
      defaultTextures: [],
      doGenerateDepthArea: false,
      transparencyTextureName: "",
    }];
    return data;
  };

  // No file list: one warning, inserts report missing, base paths emit.
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = message => warnings.push(String(message));
  let bare;
  try
  {
    bare = EveSOF.Create({ black: makeData() });
  }
  finally
  {
    console.warn = originalWarn;
  }
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /resFileIndex/);
  const bareDocument = bare.BuildFromDNA("rifter:minmatar:minmatar");
  assert.equal(findTextureResourcePath(bareDocument, "DiffuseMap"), "res:/x/ship_d.dds");

  // A plain (case-insensitive) file list is the whole existence oracle.
  const indexed = EveSOF.Create({
    black: makeData(),
    resFileIndex: ["RES:/X/INSERT/SHIP_INSERT_D.DDS"],
  });
  const indexedDocument = indexed.BuildFromDNA("rifter:minmatar:minmatar");
  assert.equal(findTextureResourcePath(indexedDocument, "DiffuseMap"), "res:/x/insert/ship_insert_d.dds");
});

test("SOF stamps the injected buildTime as every light's startTime", () => {
  // Carbon initializes m_lightData.startTime from GetCurrentTime() at build,
  // phase-offsetting noise flicker; the injected buildTime seam reproduces
  // that with a deterministic default of zero.
  const makeData = () => {
    const data = createData();
    data.hull[0].spriteSets = [{
      name: "blinkers",
      visibilityGroup: "primary",
      skinned: false,
      items: [{
        name: "s1", groupIndex: -1, position: [1, 0, 0], blinkRate: 0.1, blinkPhase: 0,
        minScale: 1, maxScale: 1, falloff: 1, intensity: 1, color: [1, 1, 1, 1],
        light: { intensity: 2, outerScaleMultiplier: 2, innerScaleMultiplier: 1 },
      }],
    }];
    data.hull[0].lightSets = [{
      visibilityGroup: "primary",
      items: [{ name: "p1", type: 0, position: [0, 1, 0], radius: 5, brightness: 1, flags: 1 }],
    }];
    data.faction[0].visibilityGroupSet = { visibilityGroups: [{ str: "primary" }] };
    return data;
  };

  const findStartTimes = document => {
    const times = [];
    for (const node of document.nodes)
    {
      if (node.fields && "startTime" in node.fields) times.push([node.kind, node.fields.startTime]);
      if (node.fields?.lightData && typeof node.fields.lightData === "object" && "startTime" in node.fields.lightData)
      {
        times.push([`${node.kind}.lightData`, node.fields.lightData.startTime]);
      }
    }
    return times;
  };

  const deterministic = new EveSOF();
  assert.equal(deterministic.dataMgr.SetData(makeData()), true);
  const zeroTimes = findStartTimes(deterministic.BuildFromDNA("rifter:minmatar:minmatar"));
  assert.ok(zeroTimes.length >= 1, "expected light emissions with startTime");
  assert.ok(zeroTimes.every(([, value]) => value === 0));

  const clocked = new EveSOF().Register({ buildTime: 42.5 });
  assert.equal(clocked.dataMgr.SetData(makeData()), true);
  const stamped = findStartTimes(clocked.BuildFromDNA("rifter:minmatar:minmatar"));
  assert.equal(stamped.length, zeroTimes.length);
  assert.ok(stamped.every(([, value]) => value === 42.5), JSON.stringify(stamped));
});

test("faction area materials, colors, and logos survive the decoded data.black shape", () => {
  // data.black delivers these records as a single lowercase-keyed child map
  // instead of Carbon's declared per-slot properties, and wraps each material
  // name in its own single-key object. Reading only the declared names left
  // every Mtl1-4 shader parameter and every faction color unresolved.
  const manager = new EveSOFDataMgr();
  assert.equal(manager.SetData({
    hull: [{ name: "rifter", opaqueAreas: [] }],
    race: [{ name: "caldari" }],
    pattern: [],
    layout: [],
    generic: {},
    material: [
      {
        name: "blue_darknavy_enamel",
        parameters: [
          { name: "DiffuseColor", value: [0.1, 0.2, 0.3, 1] },
          { name: "Gloss", value: [0.5, 0, 0, 0] },
        ],
      },
    ],
    faction: [
      {
        name: "caldarinavy",
        areaTypes: {
          _type: "EveSOFDataArea",
          materials: {
            primary: {
              _type: "EveSOFDataAreaMaterial",
              colorType: 4,
              material1: { material1: "blue_darknavy_enamel" },
            },
          },
        },
        colorSet: {
          _type: "EveSOFDataFactionColorSet",
          colors: { primary: [0.2, 0.3, 0.5, 1] },
        },
        logoSet: {
          _type: "EveSOFDataLogoSet",
          logos: {
            primary: {
              _type: "EveSOFDataLogo",
              textures: [{ name: "DecalAlbedoMap", resFilePath: "res:/logo_a.dds" }],
            },
          },
        },
      },
    ],
  }), true);

  const faction = manager.GetFactionData("caldarinavy");
  assert.equal(faction.areaMaterials.materialNames.get("0:0"), "blue_darknavy_enamel");
  assert.equal(faction.areaMaterials.glowColor.get("0:GeneralGlowColor"), 4);
  assert.deepEqual(faction.colorData.colors[0], [0.2, 0.3, 0.5, 1]);
  assert.equal(
    faction.logoSetData.logos[0].textures.get("DecalAlbedoMap").resFilePath,
    "res:/logo_a.dds",
  );

  // The declared per-slot shape must keep working alongside it.
  const declared = new EveSOFDataMgr();
  assert.equal(declared.SetData({
    hull: [{ name: "rifter", opaqueAreas: [] }],
    race: [{ name: "minmatar" }],
    material: [],
    pattern: [],
    layout: [],
    generic: {},
    faction: [
      {
        name: "minmatar",
        areaTypes: { Primary: { material1: "rust", colorType: 2 } },
        colorSet: { Primary: [1, 0, 0, 1] },
      },
    ],
  }), true);
  const flat = declared.GetFactionData("minmatar");
  assert.equal(flat.areaMaterials.materialNames.get("0:0"), "rust");
  assert.deepEqual(flat.colorData.colors[0], [1, 0, 0, 1]);
});

test("mesh area parameters resolve faction materials into Mtl shader values", () => {
  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData({
    hull: [
      {
        name: "rifter",
        geometryResFilePath: "res:/model/rifter.gr2",
        opaqueAreas: [{ name: "area_hull", shader: "quadv5.fx", index: 0, count: 1, areaType: 0 }],
      },
    ],
    faction: [
      {
        name: "minmatar",
        areaTypes: {
          _type: "EveSOFDataArea",
          materials: {
            primary: { _type: "EveSOFDataAreaMaterial", material1: { material1: "rust" } },
          },
        },
      },
    ],
    race: [{ name: "minmatar" }],
    material: [
      { name: "rust", parameters: [{ name: "DiffuseColor", value: [0.4, 0.2, 0.1, 1] }] },
    ],
    generic: {
      materialPrefixes: [{ str: "Mtl1" }, { str: "Mtl2" }],
      areaShaders: [{ shader: "quadv5.fx", parameters: [{ str: "Mtl1DiffuseColor" }] }],
    },
  }), true);

  const document = sof.BuildFromDNA("rifter:minmatar:minmatar");
  const nodes = new Map(document.nodes.map(node => [node.id, node]));
  const parameters = document.nodes
    .filter(node => node.kind === "Tr2ConstantEffectParameter")
    .map(node => [node.fields.name, node.fields.value]);

  assert.ok(nodes.size > 0);
  assert.deepEqual(
    parameters.find(([name]) => name === "Mtl1DiffuseColor"),
    ["Mtl1DiffuseColor", [0.4, 0.2, 0.1, 1]],
  );
});

test("DNA visibility groups report what a faction turns on and off", () => {
  const sof = new EveSOF();
  assert.equal(sof.dataMgr.SetData({
    hull: [
      {
        name: "rifter",
        opaqueAreas: [],
        decalSets: [
          { name: "standard", visibilityGroup: "primary", items: [] },
          { name: "holiday", visibilityGroup: "holiday_19", items: [] },
        ],
        planeSets: [{ name: "glow", visibilityGroup: "police", items: [] }],
      },
    ],
    faction: [
      {
        name: "minmatar",
        visibilityGroupSet: { visibilityGroups: [{ str: "primary" }, { str: "unused" }] },
      },
      { name: "police", visibilityGroupSet: { visibilityGroups: [{ str: "police" }] } },
    ],
    race: [{ name: "minmatar" }],
    material: [],
    pattern: [],
    layout: [],
    generic: {},
  }), true);

  const standard = sof.GetDnaVisibilityGroups("rifter:minmatar:minmatar");
  assert.deepEqual(standard.declared, ["primary", "unused"]);
  assert.deepEqual(standard.authored, ["holiday_19", "police", "primary"]);
  assert.deepEqual(standard.visible, ["primary"]);
  assert.deepEqual(standard.hidden, ["holiday_19", "police"]);
  // Carbon's projected sets keep the visibility hash, not the authored set
  // name, so the report is keyed by collection and group.
  assert.deepEqual(
    standard.sets.map(set => [set.kind, set.visibilityGroup, set.visible]).sort(),
    [
      ["hullDecalSets", "holiday_19", false],
      ["hullDecalSets", "primary", true],
      ["planeSets", "police", false],
    ].sort(),
  );

  // The same hull under a faction that declares only "police" flips which sets build.
  const police = sof.GetDnaVisibilityGroups("rifter:police:minmatar");
  assert.deepEqual(police.visible, ["police"]);
  assert.deepEqual(police.hidden, ["holiday_19", "primary"]);

  assert.equal(sof.GetDnaVisibilityGroups("missing:minmatar:minmatar"), null);
});
