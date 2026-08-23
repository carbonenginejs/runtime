import assert from "node:assert/strict";
import { test } from "node:test";
import { CjsSchema } from "@carbonenginejs/runtime-utils/schema";
import {
  EveSOFDataParameter,
  EveSOFDataTexture,
  EveSOFDataTransform,
} from "../npm/dist/data/index.js";
import {
  ErrSOFLogoSetTypeNotFound,
  ErrSOFLogoSetTypeUnknown,
  EveSOFDataArea,
  EveSOFDataAreaMaterial,
  EveSOFDataBlink,
  EveSOFDataBlinkType,
  EveSOFDataBooster,
  EveSOFDataBoosterShape,
  EveSOFDataLogo,
  EveSOFDataLogoSet,
  EveSOFDataMaterial,
  EveSOFDataInstancedMesh,
  EveSofDataMeshInstance,
  EveSOFUtilsParameterName,
} from "../npm/dist/sof/shared/index.js";
import {
  EveSOFDataRace,
  EveSOFDataRaceDamage,
} from "../npm/dist/sof/race/index.js";
import { EveSOFDataHullExtensionPlacement } from "../npm/dist/sof/layout/EveSOFDataHullExtensionPlacement.js";
import { EveSOFDataHullExtensionBucket } from "../npm/dist/sof/layout/EveSOFDataHullExtensionBucket.js";
import { IEveSOFDataHullExtensionPlacementDistribution } from "../npm/dist/sof/layout/IEveSOFDataHullExtensionPlacementDistribution.js";
import { EveSOFDataHullExtensionPlacementDistributionDepletionCounter } from "../npm/dist/sof/layout/EveSOFDataHullExtensionPlacementDistributionDepletionCounter.js";
import { EveSOFDataHullExtensionPlacementDistributionMapGraphicSettings } from "../npm/dist/sof/layout/EveSOFDataHullExtensionPlacementDistributionMapGraphicSettings.js";
import { EveSOFDataHullExtensionPlacementDistributionParentMatch } from "../npm/dist/sof/layout/EveSOFDataHullExtensionPlacementDistributionParentMatch.js";
import { EveSOFDataHullExtensionPlacementDistributionRandomChance } from "../npm/dist/sof/layout/EveSOFDataHullExtensionPlacementDistributionRandomChance.js";
import { EveSOFDataHullExtensionPlacementDistributionPlacement } from "../npm/dist/sof/layout/EveSOFDataHullExtensionPlacementDistributionPlacement.js";
import { EveSOFData } from "../npm/dist/sof/EveSOFData.js";
import {
  EveSOFDataFaction,
  EveSOFDataFactionColorSet,
  EveSOFDataFactionHullArea,
  EveSOFDataFactionVisibilityGroupSet,
} from "../npm/dist/sof/faction/index.js";
import {
  EveSOFDataGeneric,
  EveSOFDataGenericDecalShader,
  EveSOFDataGenericHullCategory,
  EveSOFDataGenericShader,
  EveSOFDataGenericSwarm,
} from "../npm/dist/sof/generic/index.js";
import {
  EveSOFDataHull,
  EveSOFDataHullArea,
  EveSOFDataHullBanner,
  EveSOFDataHullBannerLight,
  EveSOFDataHullBannerSet,
  EveSOFDataHullBannerSetItem,
  EveSOFDataHullChild,
  EveSOFDataHullChildSet,
  EveSOFDataHullChildSetItem,
  EveSOFDataHullController,
  EveSOFDataHullDecalSetItem,
  EveSOFDataHullHazeSet,
  EveSOFDataHullPlaneSetItem,
  EveSOFDataHullSpriteLineSet,
} from "../npm/dist/sof/hull/index.js";
import {
  ErrSOFProjectionNotFound,
  EveSOFDataPattern,
  EveSOFDataPatternApplicationGroup,
  EveSOFDataPatternLayer,
  EveSOFDataPatternLayerProperties,
  EveSOFDataPatternMaterialOverride,
  EveSOFDataPatternPerHull,
  EveSOFDataPatternTransform,
} from "../npm/dist/sof/pattern/index.js";
import * as packageRoot from "../npm/dist/index.js";
import * as generatedQueue from "../npm/dist/generated/index.js";

test("EveSOFDataParameter: faithful defaults + schema registration", () => {
  const p = new EveSOFDataParameter();
  assert.equal(p.name, "");
  assert.deepEqual([...p.value], [0, 0, 0, 0]);
  // Class registered under its Carbon name in the generated Eve schema family.
  assert.equal(CjsSchema.GetConstructor("EveSOFDataParameter"), EveSOFDataParameter);
  // field types mapped from carbon m_name (BlueSharedString) / m_value (Vector4)
  assert.equal(
    CjsSchema.getField(EveSOFDataParameter, "name").type.kind,
    "string",
  );
  assert.equal(
    CjsSchema.getField(EveSOFDataParameter, "value").type.kind,
    "vec4",
  );
});

test("SOF blink data exposes Carbon enum values and lookup behavior", () => {
  const blink = new EveSOFDataBlink();
  const blinkTypes = new EveSOFDataBlinkType();

  assert.equal(blink.IsEmpty(), true);
  assert.deepEqual(EveSOFDataBlinkType.Type, {
    STATIC: 0,
    BLINK: 1,
    FADE_IN: 2,
    FADE_OUT: 3,
    CYCLE: 4,
  });
  assert.equal(Object.isFrozen(EveSOFDataBlinkType.Type), true);
  assert.equal(blinkTypes.GetByType(EveSOFDataBlinkType.Type.STATIC), null);
  blinkTypes.Blink = blink;
  assert.equal(blinkTypes.GetByType(EveSOFDataBlinkType.Type.BLINK), blink);
  assert.equal(CjsSchema.GetConstructor("EveSOFDataBlink"), EveSOFDataBlink);
});

test("EveSOFDataTexture: faithful defaults + schema registration", () => {
  const t = new EveSOFDataTexture();
  assert.equal(t.resFilePath, "");
  assert.equal(t.name, "");
  assert.equal(CjsSchema.GetConstructor("EveSOFDataTexture"), EveSOFDataTexture);
  assert.equal(CjsSchema.getField(EveSOFDataTexture, "resFilePath").type.kind, "string");
});

test("EveSOFDataTransform: identity defaults + schema registration", () => {
  const x = new EveSOFDataTransform();
  assert.deepEqual([...x.position], [0, 0, 0]);
  assert.deepEqual([...x.rotation], [0, 0, 0, 1]);
  assert.deepEqual([...x.scaling], [1, 1, 1]);
  assert.equal(
    CjsSchema.getField(EveSOFDataTransform, "position").type.kind,
    "vec3",
  );
  assert.equal(
    CjsSchema.getField(EveSOFDataTransform, "rotation").type.kind,
    "quat",
  );
  assert.equal(
    CjsSchema.getField(EveSOFDataTransform, "boneIndex").type.kind,
    "int32",
  );

  x.position.set([3, 4, 5]);
  x.scaling.set([2, 3, 4]);
  assert.deepEqual([...x.GetTransform(new Float32Array(16))], [
    2, 0, 0, 0,
    0, 3, 0, 0,
    0, 0, 4, 0,
    3, 4, 5, 1,
  ]);
});

test("SOF shared and race models preserve Carbon defaults and source-enum projections", () => {
  const area = new EveSOFDataAreaMaterial();
  assert.equal(area.colorType, 12);
  assert.equal("name" in area, false);
  assert.deepEqual(EveSOFDataAreaMaterial.MaterialType, {
    MATERIAL1: 0,
    MATERIAL2: 1,
    MATERIAL3: 2,
    MATERIAL4: 3,
    MATERIAL_MAX: 4,
  });
  assert.equal(Object.isFrozen(EveSOFDataAreaMaterial.MaterialType), true);

  const first = new EveSOFDataBooster();
  const second = new EveSOFDataBooster();
  const shapes = [first.shape0, first.shape1, first.warpShape0, first.warpShape1];
  assert.equal(shapes.every(shape => shape instanceof EveSOFDataBoosterShape), true);
  assert.equal(new Set(shapes).size, 4);
  assert.equal(shapes.includes(second.shape0), false);
  assert.deepEqual([...first.scale], [1, 1, 1, 1]);
  assert.deepEqual(
    [first.glowScale, first.haloScaleX, first.haloScaleY, first.symHaloScale],
    [1, 1, 1, 1],
  );
  assert.equal("shapeAtlasWidth" in first, false);
  first.warpHaloColor = [1, 2, 3, 4];
  assert.equal(first.warpHaloColor, first.warpHalpColor);
  assert.deepEqual([...first.warpHalpColor], [1, 2, 3, 4]);

  const race = new EveSOFDataRace();
  assert.deepEqual(
    [race.hullPrimaryHeatColorType, race.hullReactorHeatColorType],
    [16, 14],
  );
  assert.equal(race.booster, null);
  assert.equal(race.damage, null);
  assert.equal(CjsSchema.getField(EveSOFDataBooster, "shape0").type.kind, "objectRef");
  assert.equal(CjsSchema.getField(EveSOFDataRace, "damage").type.kind, "objectRef");
});

test("SOF logo lookup and authoring helpers produce detached configuration", () => {
  const logos = new EveSOFDataLogoSet();
  assert.deepEqual(EveSOFDataLogoSet.LogoType, {
    TYPE_PRIMARY: 0,
    TYPE_SECONDARY: 1,
    TYPE_TERTIARY: 2,
    TYPE_MARKING_01: 3,
    TYPE_MARKING_02: 4,
    TYPE_MAX: 5,
  });
  assert.equal(Object.isFrozen(EveSOFDataLogoSet.LogoType), true);
  assert.equal("Corporation" in logos, false);
  assert.equal(logos.Has(0), false);
  assert.throws(() => logos.Get(0), ErrSOFLogoSetTypeNotFound);
  assert.throws(() => logos.Has(5), ErrSOFLogoSetTypeUnknown);

  const texture = new EveSOFDataTexture();
  texture.name = "AlbedoMap";
  texture.resFilePath = "res:/albedo.dds";
  const logo = new EveSOFDataLogo();
  logo.textures.push(texture);
  logos.Primary = logo;
  assert.equal(logos.Get(0), logo);
  assert.deepEqual(logo.Assign(), { textures: { AlbedoMap: "res:/albedo.dds" } });

  const parameter = new EveSOFDataParameter();
  parameter.name = "DiffuseColor";
  parameter.value.set([1, 2, 3, 4]);
  const material = new EveSOFDataMaterial();
  material.parameters.push(parameter);
  const assigned = material.AssignParameters({}, "Material1");
  assert.deepEqual(assigned, { Material1DiffuseColor: [1, 2, 3, 4] });
  assert.notEqual(assigned.Material1DiffuseColor, parameter.value);

  const damage = new EveSOFDataRaceDamage();
  damage.armorImpactParameters.push(parameter);
  damage.armorImpactTextures.push(texture);
  assert.deepEqual(damage.AssignArmor(), {
    parameters: { DiffuseColor: [1, 2, 3, 4] },
    textures: { AlbedoMap: "res:/albedo.dds" },
  });
});

test("SOF legacy combines remain base-keyed, reusable, and non-erasing", () => {
  const baseParameter = new EveSOFDataParameter();
  baseParameter.name = "Base";
  baseParameter.value.set([1, 2, 3, 4]);
  const overrideParameter = new EveSOFDataParameter();
  overrideParameter.name = "Base";
  overrideParameter.value.set([4, 3, 2, 1]);
  const ignoredParameter = new EveSOFDataParameter();
  ignoredParameter.name = "OverrideOnly";
  const staleParameter = new EveSOFDataParameter();
  staleParameter.name = "Stale";
  const out = [staleParameter];
  assert.equal(
    EveSOFDataParameter.combineArrays(
      [baseParameter],
      [overrideParameter, ignoredParameter],
      out,
    ),
    out,
  );
  assert.deepEqual(out.map(value => value.name), ["Base"]);
  assert.deepEqual([...out[0].value], [4, 3, 2, 1]);
  assert.notEqual(out[0].value, overrideParameter.value);

  const baseTexture = new EveSOFDataTexture();
  baseTexture.name = "Map";
  baseTexture.resFilePath = "res:/base.dds";
  const emptyOverride = new EveSOFDataTexture();
  emptyOverride.name = "Map";
  const textures = EveSOFDataTexture.combineArrays([baseTexture], [emptyOverride]);
  assert.equal(textures[0].resFilePath, "res:/base.dds");

  const baseRace = new EveSOFDataRace();
  baseRace.name = "Amarr";
  const raceOverride = new EveSOFDataRace();
  raceOverride.name = "";
  raceOverride.hullPrimaryHeatColorType = 4;
  const combinedRace = EveSOFDataRace.combine(baseRace, raceOverride);
  assert.equal(combinedRace.name, "Amarr");
  assert.equal(combinedRace.hullPrimaryHeatColorType, 4);
  assert.equal(combinedRace.booster, null);
  assert.equal(combinedRace.damage, null);
});

test("promoted shared and race constructors have one package identity", () => {
  for (const Constructor of [
    EveSOFDataAreaMaterial,
    EveSOFDataBooster,
    EveSOFDataBoosterShape,
    EveSOFDataLogo,
    EveSOFDataLogoSet,
    EveSOFDataMaterial,
    EveSOFDataParameter,
    EveSOFDataTexture,
    EveSOFDataTransform,
    EveSOFDataRace,
    EveSOFDataRaceDamage,
  ])
  {
    assert.equal(packageRoot[Constructor.name], Constructor, Constructor.name);
    assert.equal(Constructor.name in generatedQueue, false, Constructor.name);
  }
});

test("SOF catalog, area, hull, and hull-area records preserve Carbon shape", () => {
  const first = new EveSOFData();
  const second = new EveSOFData();
  assert.equal(first.generic, null);
  for (const name of ["faction", "hull", "layout", "material", "pattern", "race"])
  {
    assert.deepEqual(first[name], [], name);
    assert.notEqual(first[name], second[name], name);
  }

  const area = new EveSOFDataArea();
  assert.equal(EveSOFDataArea.Types[5], null);
  assert.equal("Wreck" in area, false);
  assert.equal(area.GetTypeByIndex(EveSOFDataArea.AreaType.TYPE_WRECK), null);
  area.Primary = new EveSOFDataAreaMaterial();
  assert.equal(area.Has(EveSOFDataArea.AreaType.TYPE_PRIMARY), true);
  assert.equal(area.Get(EveSOFDataArea.AreaType.TYPE_PRIMARY), area.Primary);

  const hull = new EveSOFDataHull();
  const nextHull = new EveSOFDataHull();
  assert.deepEqual([...hull.shapeEllipsoidRadius], [-1, -1, -1]);
  assert.equal(hull.castShadow, true);
  assert.equal(hull.isSkinned, false);
  assert.equal(hull.sof6, false);
  assert.notEqual(hull.opaqueAreas, nextHull.opaqueAreas);
  assert.equal("buildFilter" in hull, false);
  assert.equal("depthAreas" in hull, false);
  assert.equal("hullDecals" in hull, false);

  const hullArea = new EveSOFDataHullArea();
  const parameter = new EveSOFDataParameter();
  parameter.name = "Glow";
  parameter.value.set([1, 2, 3, 4]);
  const texture = new EveSOFDataTexture();
  texture.name = "GlowMap";
  texture.resFilePath = "res:/glow.dds";
  hullArea.parameters.push(parameter);
  hullArea.textures.push(texture);
  assert.deepEqual(hullArea.Assign(), {
    parameters: { Glow: [1, 2, 3, 4] },
    textures: { GlowMap: "res:/glow.dds" },
  });

  for (const Constructor of [
    EveSOFData,
    EveSOFDataArea,
    EveSOFDataHull,
    EveSOFDataHullArea,
  ])
  {
    assert.equal(packageRoot[Constructor.name], Constructor, Constructor.name);
    assert.equal(Constructor.name in generatedQueue, false, Constructor.name);
  }
});

test("SOF faction records retain Carbon color and material-usage defaults", () => {
  const colors = new EveSOFDataFactionColorSet();
  const nextColors = new EveSOFDataFactionColorSet();
  assert.equal(EveSOFDataFactionColorSet.Types.length, 44);
  assert.equal(EveSOFDataFactionColorSet.ColorType.TYPE_PRIMARY_DOCKED_FX, 43);
  assert.equal(EveSOFDataFactionColorSet.ColorType.TYPE_MAX, 44);
  assert.equal(Object.isFrozen(EveSOFDataFactionColorSet.ColorType), true);
  for (const name of EveSOFDataFactionColorSet.Types)
  {
    if (name !== "PrimaryBillboard") assert.equal(colors[name][3], 1, name);
    assert.notEqual(colors[name], nextColors[name], name);
  }
  assert.deepEqual([...colors.PrimaryBillboard], [2.5, 2.5, 2.5, 2.5]);
  assert.ok(Math.abs(colors.PrimaryWarpFx[1] - 99 / 255) < 1e-6);
  assert.ok(Math.abs(colors.PrimaryAttackFX[2] - 11 / 255) < 1e-6);
  assert.ok(Math.abs(colors.PrimarySiegeFX[1] - 94 / 255) < 1e-6);
  assert.ok(Math.abs(colors.PrimaryDockedFX[2] - 226 / 255) < 1e-6);
  const copied = colors.Get(
    EveSOFDataFactionColorSet.ColorType.TYPE_PRIMARY_DOCKED_FX,
    new Float32Array(4),
  );
  assert.notEqual(copied, colors.PrimaryDockedFX);
  assert.throws(() => colors.Has(44), RangeError);

  const faction = new EveSOFDataFaction();
  assert.deepEqual([
    faction.materialUsageMtl1,
    faction.materialUsageMtl2,
    faction.materialUsageMtl3,
    faction.materialUsageMtl4,
  ], [0, 1, 2, 3]);
  assert.equal(faction.GetAreaType(0), null);
  assert.equal(faction.GetLogoType(0), null);

  const hullArea = new EveSOFDataFactionHullArea();
  const parameter = new EveSOFDataParameter();
  parameter.name = "DiffuseColor";
  hullArea.parameters.push(parameter);
  assert.equal(hullArea.FindParameter("diffusecolor"), parameter);
  assert.equal(hullArea.FindParameter(null), null);

  const visibility = new EveSOFDataFactionVisibilityGroupSet();
  visibility.visibilityGroups.push({ str: "primary" });
  assert.equal(visibility.Has("PRIMARY"), true);
  assert.equal(visibility.IsObjectVisible({ visibilityGroup: "primary" }), true);
  assert.equal(visibility.IsObjectVisible(null), false);

  for (const Constructor of [
    EveSOFDataFaction,
    EveSOFDataFactionColorSet,
    EveSOFDataFactionHullArea,
    EveSOFDataFactionVisibilityGroupSet,
  ])
  {
    assert.equal(packageRoot[Constructor.name], Constructor, Constructor.name);
    assert.equal(Constructor.name in generatedQueue, false, Constructor.name);
  }
});

test("SOF generic records expose the seven Carbon decal usages and embedded banner", () => {
  const generic = new EveSOFDataGeneric();
  const next = new EveSOFDataGeneric();
  const usages = [
    "STANDARD",
    "KILLCOUNTER",
    "HOLE",
    "CYLINDRICAL",
    "GLOWCYLINDRICAL",
    "GLOWSTANDARD",
    "LOGO",
  ];
  for (const usage of usages)
  {
    assert.equal(generic["decalMinScreenSize" + usage], 0, usage);
  }
  assert.equal("decalMinScreenSize" in generic, false);
  assert.equal(CjsSchema.getField(EveSOFDataGeneric, "decalMinScreenSize"), null);
  assert.equal(CjsSchema.getField(EveSOFDataGeneric, "bannerShader").type.kind, "struct");
  assert.ok(generic.bannerShader instanceof EveSOFDataGenericShader);
  assert.notEqual(generic.bannerShader, next.bannerShader);
  assert.equal(generic.bannerShader.doGenerateDepthArea, true);
  assert.equal(new EveSOFDataGenericDecalShader().additive, false);

  generic.bannerShader.transparencyTextureName = "OpacityMap";
  assert.equal(generic.bannerShader.HasUsage("OpacityMap"), true);
  assert.equal(generic.bannerShader.HasUsage("Missing"), false);

  for (const Constructor of [
    EveSOFDataGeneric,
    EveSOFDataGenericShader,
    EveSOFDataGenericDecalShader,
  ])
  {
    assert.equal(packageRoot[Constructor.name], Constructor, Constructor.name);
    assert.equal(Constructor.name in generatedQueue, false, Constructor.name);
  }
});

test("SOF generic swarm preserves Carbon BehaviorProperties floats and defaults", () => {
  const swarm = new EveSOFDataGenericSwarm();
  const expected = {
    speedMultiplier: 1.1,
    speedMinimum: 10,
    maxDistance0: 500,
    maxDistance1: 125,
    maxTime: 0.2,
    speed0: 700,
    speed1: 1000,
    weightFormation: 1,
    formationDistance: 50,
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
    weightDeceleration: 0.1,
    maxDeceleration: 200,
  };

  assert.equal(Object.keys(expected).length, 22);
  for (const [name, value] of Object.entries(expected))
  {
    assert.equal(swarm[name], value, name);
    const field = CjsSchema.getField(EveSOFDataGenericSwarm, name);
    assert.equal(field.type.kind, "float32", name);
    assert.equal(field.enum, undefined, name);
  }
  assert.equal(packageRoot.EveSOFDataGenericSwarm, EveSOFDataGenericSwarm);
  assert.equal("EveSOFDataGenericSwarm" in generatedQueue, false);
});

test("SOF attachment records and runtime-only Carbon helpers are fully promoted", () => {
  const conditions = [
    new EveSOFDataHullExtensionPlacementDistributionDepletionCounter(),
    new EveSOFDataHullExtensionPlacementDistributionMapGraphicSettings(),
    new EveSOFDataHullExtensionPlacementDistributionParentMatch(),
    new EveSOFDataHullExtensionPlacementDistributionRandomChance(),
  ];
  for (const condition of conditions)
  {
    assert.ok(condition instanceof IEveSOFDataHullExtensionPlacementDistribution);
    assert.equal(condition.name, "");
    assert.equal(CjsSchema.getField(condition.constructor, "name").io.persist, true);
  }
  // Carbon derives DistributionPlacement directly from IRoot with its own
  // m_name (EveSOFData.h:1999-2021) - it is not a distribution condition.
  const placementRecord = new EveSOFDataHullExtensionPlacementDistributionPlacement();
  assert.equal(placementRecord instanceof IEveSOFDataHullExtensionPlacementDistribution, false);
  assert.equal(placementRecord.name, "");
  assert.equal(CjsSchema.getField(placementRecord.constructor, "name").io.persist, true);

  const bucket = new EveSOFDataHullExtensionBucket();
  const nextBucket = new EveSOFDataHullExtensionBucket();
  assert.ok(bucket instanceof EveSOFDataHullExtensionPlacement);
  assert.equal(bucket.IsBucket(), true);
  assert.notEqual(bucket.placements, nextBucket.placements);
  assert.notEqual(bucket.depletionCounters, nextBucket.depletionCounters);

  const plane = new EveSOFDataHullPlaneSetItem();
  assert.equal(plane.dutyCycle, 1);
  assert.equal(CjsSchema.getField(EveSOFDataHullPlaneSetItem, "dutyCycle"), null);
  assert.equal(CjsSchema.getField(EveSOFDataHullPlaneSetItem, "blinkMode").enum.enumType, "BlinkType");
  assert.deepEqual([...plane.color], [1, 1, 1, 1]);

  const decal = new EveSOFDataHullDecalSetItem();
  assert.equal(decal.meshIndex, -1);
  assert.equal(decal.boneIndex, -1);
  assert.deepEqual([...decal.scaling], [1, 1, 1]);
  assert.equal(EveSOFDataHullDecalSetItem.Usage.USAGE_MAX, 7);

  const instanced = new EveSOFDataInstancedMesh();
  assert.equal(instanced.displayModifier, 5);
  assert.equal(EveSOFDataInstancedMesh.DisplayQualityModifier.SHADER_ALL, 5);
  assert.deepEqual([...new EveSofDataMeshInstance().scaling], [1, 1, 1]);

  const parsed = new EveSOFUtilsParameterName(["Mtl1", "Mtl2"], "mTL1Diffuse");
  assert.equal(parsed.IsMaterialIdxValid(), true);
  assert.equal(parsed.GetMaterialIdx(), 0);
  assert.equal(parsed.GetFullName(), "mTL1Diffuse");
  assert.equal(parsed.GetShortName(), "Diffuse");
  parsed.ChangeMaterialIdx({ materialPrefixes: ["Mtl1", "Mtl2"] }, 1);
  assert.equal(parsed.GetMaterialIdx(), 1);
  assert.equal(parsed.GetFullName(), "Mtl2Diffuse");
  const unmatched = new EveSOFUtilsParameterName(["Mtl1"], "Glow");
  unmatched.ChangeMaterialIdx({ materialPrefixes: ["Mtl1"] }, 0);
  assert.equal(unmatched.GetMaterialIdx(), -1);
  assert.equal(unmatched.GetFullName(), "Glow");

  for (const Constructor of [
    EveSOFDataHullDecalSetItem,
    EveSOFDataHullExtensionBucket,
    EveSOFDataHullPlaneSetItem,
    EveSOFDataInstancedMesh,
    EveSofDataMeshInstance,
    EveSOFUtilsParameterName,
    IEveSOFDataHullExtensionPlacementDistribution,
  ])
  {
    assert.equal(packageRoot[Constructor.name], Constructor, Constructor.name);
    assert.equal(Constructor.name in generatedQueue, false, Constructor.name);
  }
});

test("EveSOFDataPatternLayerProperties: Carbon applicability defaults", () => {
  const properties = new EveSOFDataPatternLayerProperties();
  for (const name of [
    "Primary",
    "Glass",
    "Sails",
    "Reactor",
    "Darkhull",
    "Rock",
    "Monument",
    "Ornament",
    "SimplePrimary",
  ])
  {
    assert.equal(properties[name], true, name);
  }
  assert.deepEqual(EveSOFDataPatternLayerProperties.ProjectionType, {
    PROJECTION_REPEAT: 0,
    PROJECTION_CLAMP: 1,
    PROJECTION_BORDER: 2,
  });
  assert.equal(Object.isFrozen(EveSOFDataPatternLayerProperties.ProjectionType), true);
  properties.Glass = false;
  assert.equal(properties.IsApplicableToArea(1), false);
  assert.equal(properties.IsApplicableToArea(5), true, "unexposed Carbon wreck slot defaults true");
  assert.equal(properties.IsApplicableToArea(10), true, "unexposed Carbon turret slot defaults true");
  assert.equal(properties.IsApplicableToArea("MissingArea"), true);
});

test("SOF pattern layers expose Carbon enums and legacy CPU conversion helpers", () => {
  const layer = new EveSOFDataPatternLayer("PatternMaskMap");
  assert.equal(layer.textureName, "PatternMaskMap");
  assert.deepEqual(EveSOFDataPatternLayer.ProjectionType, {
    PROJECTION_REPEAT: 0,
    PROJECTION_CLAMP: 1,
    PROJECTION_BORDER: 2,
  });
  assert.deepEqual(EveSOFDataPatternLayer.MaterialSource, {
    SOURCE_MATERIAL1: 0,
    SOURCE_MATERIAL2: 1,
    SOURCE_MATERIAL3: 2,
    SOURCE_MATERIAL4: 3,
    SOURCE_PATTERN1: 4,
    SOURCE_PATTERN2: 5,
  });
  assert.equal(Object.isFrozen(EveSOFDataPatternLayer.MaterialSource), true);
  assert.equal(EveSOFDataPatternLayer.ToAddressMode(0), 1);
  assert.equal(EveSOFDataPatternLayer.ToAddressMode(1), 3);
  assert.equal(EveSOFDataPatternLayer.ToAddressMode(2), 4);
  assert.equal(EveSOFDataPatternLayer.FromAddressMode(1), 0);
  assert.equal(EveSOFDataPatternLayer.FromAddressMode(3), 1);
  assert.equal(EveSOFDataPatternLayer.FromAddressMode(4), 2);

  const textureParameter = {
    GetValue: () => "res:/pattern.dds",
    useAllOverrides: true,
    overrides: { addressUMode: 3, addressVMode: 4 },
  };
  layer.SetFromCustomMask({
    targetMaterials: [1, 0, true, false],
    materialIndex: 5,
    parameters: { PatternMaskMap: textureParameter },
  });
  assert.equal(layer.textureResFilePath, "res:/pattern.dds");
  assert.equal(layer.projectionTypeU, 1);
  assert.equal(layer.projectionTypeV, 2);
  assert.deepEqual(
    [layer.isTargetMtl1, layer.isTargetMtl2, layer.isTargetMtl3, layer.isTargetMtl4],
    [true, false, true, false],
  );
  assert.equal(layer.materialSource, 5);
  layer.Empty();
  assert.equal(layer.textureName, "PatternMaskMap");
  assert.equal(layer.textureResFilePath, "");
  assert.deepEqual(
    [layer.isTargetMtl1, layer.isTargetMtl2, layer.isTargetMtl3, layer.isTargetMtl4],
    [false, false, false, false],
  );
});

test("SOF pattern transforms and per-hull helpers retain detached Carbon values", () => {
  const mask1 = {
    translation: [1, 2, 3],
    scaling: [2, 3, 4],
    rotation: [0, 0, 0, 1],
    isMirrored: true,
  };
  const mask2 = {
    translation: [5, 6, 7],
    scaling: [1, 1, 1],
    rotation: [0, 0, 0, 1],
    isMirrored: false,
  };
  const transform = new EveSOFDataPatternTransform().SetFromCustomMask(mask1);
  assert.deepEqual([...transform.position], [1, 2, 3]);
  assert.deepEqual([...transform.scaling], [2, 3, 4]);
  assert.notEqual(transform.position, mask1.translation);
  assert.deepEqual([...transform.GetTransform(new Float32Array(16))], [
    2, 0, 0, 0,
    0, 3, 0, 0,
    0, 0, 4, 0,
    1, 2, 3, 1,
  ]);

  const projection = new EveSOFDataPatternPerHull("Rifter").SetFromCustomMasks(mask1, mask2);
  const first = projection.transformLayer1;
  const second = projection.transformLayer2;
  projection.Flip();
  assert.equal(projection.transformLayer1, second);
  assert.equal(projection.transformLayer2, first);
  projection.Empty();
  assert.deepEqual([...first.scaling], [0, 0, 0]);
  projection.SetTransformLayer1FromCustomMask(null);
  assert.equal(projection.transformLayer1, null);
});

test("SOF pattern catalogs preserve case-insensitive lookup, editing, and package identity", () => {
  const pattern = new EveSOFDataPattern();
  pattern.name = "stripes";
  pattern.layer1 = new EveSOFDataPatternLayer("Layer1");
  pattern.layer2 = new EveSOFDataPatternLayer("Layer2");
  const projection = new EveSOFDataPatternPerHull("Rifter");
  projection.transformLayer1 = new EveSOFDataPatternTransform();
  projection.transformLayer2 = new EveSOFDataPatternTransform();
  pattern.projections.push(projection);
  assert.equal(pattern.Has("rifter"), true);
  assert.equal(pattern.Get("RIFTER").transformLayer1, projection.transformLayer1);
  assert.throws(
    () => pattern.Get("missing"),
    error => error instanceof ErrSOFProjectionNotFound &&
      error.code === "EVE_SOF_PROJECTION_NOT_FOUND" &&
      error.pattern === "stripes" &&
      error.projection === "missing",
  );

  const group = new EveSOFDataPatternApplicationGroup();
  group.projections.push(projection);
  assert.equal(group.FindProjection("rIfTeR"), projection);
  assert.equal(group.FindProjection("missing"), null);

  const targets = new EveSOFDataPatternMaterialOverride();
  targets.isTargetMtl2 = false;
  assert.deepEqual(targets.GetTargets(), [true, false, true, true]);

  const customMask = {
    targetMaterials: [1, 1, 0, 0],
    materialIndex: 4,
    parameters: {
      PatternMaskMap: {
        GetValue: () => "res:/custom.dds",
        useAllOverrides: false,
      },
    },
    translation: [8, 9, 10],
    scaling: [1, 2, 1],
    rotation: [0, 0, 0, 1],
    isMirrored: false,
  };
  const editable = new EveSOFDataPattern().SetLayersFromCustomMasks(customMask, null);
  assert.equal(editable.layer1.textureName, "PatternMask1Map");
  assert.equal(editable.layer2, null);
  const firstProjection = editable.SetHullProjectionFromCustomMasks("Rifter", customMask, null);
  const reusedProjection = editable.SetHullProjectionFromCustomMasks("rifter", customMask, null);
  assert.equal(reusedProjection, firstProjection);
  assert.equal(editable.projections.length, 1);

  for (const Constructor of [
    EveSOFDataPattern,
    EveSOFDataPatternApplicationGroup,
    EveSOFDataPatternLayer,
    EveSOFDataPatternLayerProperties,
    EveSOFDataPatternMaterialOverride,
    EveSOFDataPatternPerHull,
    EveSOFDataPatternTransform,
  ])
  {
    assert.equal(packageRoot[Constructor.name], Constructor, Constructor.name);
  }
});

test("SOF extension placements preserve Carbon constructed refs and inherited names", () => {
  const first = new EveSOFDataHullExtensionPlacement();
  const second = new EveSOFDataHullExtensionPlacement();

  assert.equal(first.distribution.constructor.name, "EveSOFDataHullExtensionPlacementDistributionPlacement");
  assert.equal(first.descriptor.constructor.name, "EveSOFDNADescriptor");
  assert.notEqual(first.distribution, second.distribution);
  assert.notEqual(first.descriptor, second.descriptor);

  const parent = new EveSOFDataHullExtensionPlacementDistributionParentMatch();
  const nextParent = new EveSOFDataHullExtensionPlacementDistributionParentMatch();
  assert.equal(parent.parentDescriptor.constructor.name, "EveSOFDNADescriptor");
  assert.notEqual(parent.parentDescriptor, nextParent.parentDescriptor);

  for (const condition of [
    parent,
    new EveSOFDataHullExtensionPlacementDistributionDepletionCounter(),
    new EveSOFDataHullExtensionPlacementDistributionMapGraphicSettings(),
    new EveSOFDataHullExtensionPlacementDistributionRandomChance(),
  ])
  {
    assert.equal(condition.name, "");
  }
});

test("banner, sprite-line, haze, and hull-category records restore Carbon constructor defaults", () => {
  const banner = new EveSOFDataHullBanner();
  assert.equal(banner.usage, EveSOFDataHullBanner.Usage.VERTICAL_BANNER);
  assert.equal(banner.visibilityGroup, "primary");
  assert.equal(banner.maintainAspectRatio, true);
  assert.equal(banner.boneIndex, -1);
  assert.ok(banner.lightOverride instanceof EveSOFDataHullBannerLight);
  assert.notEqual(banner.lightOverride, new EveSOFDataHullBanner().lightOverride);

  const item = new EveSOFDataHullBannerSetItem();
  assert.equal(item.usage, EveSOFDataHullBannerSetItem.Usage.VERTICAL_BANNER);
  assert.equal(item.light, null);
  assert.equal(item.maintainAspectRatio, true);
  assert.equal(item.boneIndex, -1);

  assert.equal(new EveSOFDataHullBannerSet().visibilityGroup, "primary");
  assert.equal(new EveSOFDataHullSpriteLineSet().visibilityGroup, "primary");
  assert.equal(new EveSOFDataHullHazeSet().visibilityGroup, "primary");
  assert.equal(new EveSOFDataGenericHullCategory().reflectionMode, 3);
});

test("banner aspect maintenance preserves Carbon mutation semantics", () => {
  const banner = new EveSOFDataHullBanner();
  assert.equal(banner.GetTargetAspectRatio(), 0.25);
  banner.usage = EveSOFDataHullBanner.Usage.PUBLICITY_POSTER;
  assert.equal(banner.GetTargetAspectRatio(), 0.75);
  banner.usage = EveSOFDataHullBanner.Usage.TARGET_SYSTEM_STATUS;
  assert.equal(banner.GetTargetAspectRatio(), 4);
  banner.usage = EveSOFDataHullBanner.Usage.CORP_LOGO;
  assert.equal(banner.GetTargetAspectRatio(), 1);

  banner.usage = EveSOFDataHullBanner.Usage.VERTICAL_BANNER;
  banner.scaling[0] = 2;
  assert.equal(banner.GetAspectRatio(), 2);
  const detached = banner.GetScaling();
  detached[0] = 99;
  assert.equal(banner.scaling[0], 2);

  const angledX = new EveSOFDataHullBanner();
  angledX.SetAngleX(0);
  assert.ok(Math.abs(angledX.scaling[1] - 4) < 1e-6);
  assert.equal(angledX.GetAngleX(), 0);

  const angledY = new EveSOFDataHullBanner();
  angledY.SetAngleY(0);
  assert.ok(Math.abs(angledY.scaling[0] - 0.25) < 1e-6);
  assert.equal(angledY.GetAngleY(), 0);

  const scaled = new EveSOFDataHullBanner();
  scaled.SetScaling([2, 1, 1]);
  assert.ok(Math.abs(scaled.scaling[0] - 0.25) < 1e-6);
  assert.ok(Math.abs(scaled.scaling[1] - 1) < 1e-6);

  const horizontal = new EveSOFDataHullBanner();
  horizontal.usage = EveSOFDataHullBanner.Usage.HORIZONTAL_BANNER;
  horizontal.SetScaling([2, 1, 1]);
  assert.ok(Math.abs(horizontal.scaling[0] - 2) < 1e-6);
  assert.ok(Math.abs(horizontal.scaling[1] - 0.5) < 1e-6);

  const raw = new EveSOFDataHullBanner();
  raw.maintainAspectRatio = false;
  raw.SetAngleX(90);
  raw.SetAngleY(45);
  raw.SetScaling([3, 2, 1]);
  assert.equal(raw.GetAngleX(), 90);
  assert.equal(raw.GetAngleY(), 45);
  assert.deepEqual(Array.from(raw.GetScaling()), [3, 2, 1]);

  const curved = new EveSOFDataHullBanner();
  curved.usage = EveSOFDataHullBanner.Usage.CORP_LOGO;
  curved.maintainAspectRatio = false;
  curved.SetAngleX(90);
  const halfAngle = Math.PI / 4;
  const chordScale = 0.5 / Math.sin(halfAngle);
  const expected = 19 * 2 * chordScale * Math.sin(halfAngle / 19);
  assert.ok(Math.abs(curved.GetAspectRatio() - expected) < 1e-4);

  const item = new EveSOFDataHullBannerSetItem();
  assert.equal(item.GetTargetAspectRatio(), 0.25);
  item.scaling[0] = 3;
  assert.equal(item.GetAspectRatio(), 3);
  item.SetAngleY(0);
  assert.ok(Math.abs(item.scaling[0] - 0.25) < 1e-6);
});

test("SOF derived GetName helpers mirror Carbon path stripping", () => {
  const controller = new EveSOFDataHullController();
  assert.equal(controller.GetName(), "");
  controller.path = "res:/fx/controllers/spin.red";
  assert.equal(controller.GetName(), "spin");
  controller.path = "nopath.red";
  assert.equal(controller.GetName(), "");
  controller.path = "res:/fx/plain";
  assert.equal(controller.GetName(), "plain");

  const child = new EveSOFDataHullChild();
  child.redFilePath = "res:/model/turret.blue.red";
  assert.equal(child.GetName(), "turret.blue");
  const childItem = new EveSOFDataHullChildSetItem();
  childItem.redFilePath = "res:/model/attach.red";
  assert.equal(childItem.GetName(), "attach");
  assert.equal(new EveSOFDataHullChildSet().GetName(), "primary");
  assert.equal(new EveSOFDataHullBannerSet().GetName(), "primary");
});

test("SOF locator-set and extension-placement records carry Carbon nominal identity", async () => {
  // Carbon declares both as empty BLUE_INTERFACE markers over IRoot
  // (EveSOFData.h:1107-1111,1911-1915); the concrete classes implement them.
  const { EveSOFDataHullLocatorSet, EveSOFDataHullLocatorSetGroup, IEveSOFDataHullLocatorSet } =
    await import("../npm/dist/sof/hull/index.js");
  const { IEveSOFDataHullExtensionPlacement } =
    await import("../npm/dist/sof/layout/IEveSOFDataHullExtensionPlacement.js");
  assert.equal(new EveSOFDataHullLocatorSet() instanceof IEveSOFDataHullLocatorSet, true);
  assert.equal(new EveSOFDataHullLocatorSetGroup() instanceof IEveSOFDataHullLocatorSet, true);
  assert.equal(new EveSOFDataHullExtensionPlacement() instanceof IEveSOFDataHullExtensionPlacement, true);
  // Buckets reach the marker interface through their real Carbon parent.
  assert.equal(new EveSOFDataHullExtensionBucket() instanceof IEveSOFDataHullExtensionPlacement, true);
  // Carbon: void AddIndex(uint32_t) (EveSOFData.h:1276).
  const { EveSOFDataDecalIndexBuffer } = await import("../npm/dist/sof/shared/index.js");
  assert.equal(new EveSOFDataDecalIndexBuffer().AddIndex(1), undefined);
});

test("SOF manager projections copy authored vectors and per-application layers", async () => {
  // Carbon copies material parameter Vector4s by value into the map
  // (EveSOFDataMgr.cpp:1845-1855) and copies the pattern layer struct into
  // every application pair (EveSOFDataMgr.cpp:1538-1570); neither projection
  // may alias its authored source or share records across applications.
  const { EveSOFDataMgr } = await import("../npm/dist/sof/EveSOFDataMgr.js");
  const data = {
    hull: [{ name: "rifter", geometryResFilePath: "res:/model/rifter.gr2", opaqueAreas: [] }],
    faction: [{ name: "minmatar" }],
    race: [{ name: "minmatar" }],
    material: [{ name: "rust", parameters: [{ name: "PaintColor", value: [1, 2, 3, 4] }] }],
    pattern: [{
      name: "stripes",
      layer1: { textureName: "PatternTex" },
      projections: [
        { name: "rifter", transformLayer1: {} },
        { name: "rifter2", transformLayer1: {} },
      ],
    }],
    layout: [],
    generic: { materialPrefixes: [{ str: "Mtl1" }], variants: [] },
  };
  const manager = new EveSOFDataMgr();
  assert.equal(manager.SetData(data), true);

  data.material[0].parameters[0].value[0] = 99;
  assert.deepEqual(Array.from(manager.GetMaterialData("rust").parameters.get("PaintColor")), [1, 2, 3, 4]);

  const pattern = manager.GetPatternData("stripes");
  const first = pattern.oldApplicationData.get("rifter").layerAndProjection[0].layer;
  const second = pattern.oldApplicationData.get("rifter2").layerAndProjection[0].layer;
  assert.notEqual(first, second, "each application owns an independent layer record");
});

test("SOF manager exposes deterministic detached JSON catalogs", async () => {
  const { EveSOFDataMgr } = await import("../npm/dist/sof/EveSOFDataMgr.js");
  const model = new EveSOFDataTransform();
  model.position.set([3, 4, 5]);
  const data = {
    hull: [
      { name: "Zeta", opaqueAreas: [] },
      { name: "Ab1_T1", opaqueAreas: [], typed: new Uint16Array([7, 8]), model },
    ],
    faction: [
      { name: "Amarr" },
      { name: "amarr" },
    ],
    race: [{ name: "Amarr" }],
    material: [{
      name: "Gold",
      parameters: [{ name: "PaintColor", value: new Float32Array([1, 2, 3, 4]) }],
    }],
    pattern: [
      {
        name: "Stripes",
        layer1: { textureName: "PatternTex" },
        projections: [
          { name: "Ab1_T1", transformLayer1: { position: [1, 2, 3] } },
          { name: "Zeta", transformLayer1: {} },
        ],
      },
      {
        name: "NoMatch",
        projections: [{ name: "Zeta", transformLayer1: {} }],
      },
      {
        name: "Alpha",
        sof6: true,
        layer1: { textureName: "PatternTex" },
        applicationGroups: [{
          layer1Properties: {},
          projections: [{ name: "AB1_T1", transformLayer1: {} }],
        }],
      },
    ],
    layout: [{ name: "ANTENNAE" }],
    generic: { materialPrefixes: [], variants: [] },
  };
  const manager = new EveSOFDataMgr();

  assert.equal(manager.SetData(data), true);
  assert.deepEqual(manager.ListHullDataNames(), ["ab1_t1", "zeta"]);
  assert.deepEqual(manager.ListFactionDataNames(), ["amarr"]);
  assert.deepEqual(manager.ListRaceDataNames(), ["amarr"]);
  assert.deepEqual(manager.ListMaterialDataNames(), ["gold"]);
  assert.deepEqual(manager.ListPatternDataNames(), ["alpha", "nomatch", "stripes"]);
  assert.deepEqual(
    manager.ListPatternDataNamesForHull("AB1_t1"),
    ["alpha", "stripes"],
  );
  assert.deepEqual(
    manager.ListPatternDataNamesForHull("zeta"),
    ["nomatch", "stripes"],
  );
  assert.equal(manager.ListPatternDataNamesForHull("missing"), null);
  assert.equal(Object.isFrozen(manager.ListPatternDataNamesForHull("ab1_t1")), true);
  assert.deepEqual(manager.ListLayoutDataNames(), ["antennae"]);

  const hull = manager.GetHullDataJson("AB1_t1");
  assert.equal(hull.name, "Ab1_T1");
  assert.deepEqual(hull.typed, [7, 8]);
  assert.deepEqual(hull.model.position, [3, 4, 5]);
  assert.deepEqual(
    manager.GetMaterialDataJson("GOLD").parameters.PaintColor,
    [1, 2, 3, 4],
  );
  assert.notEqual(hull, manager.GetHullData("Ab1_T1"));
  hull.typed[0] = 99;
  assert.equal(manager.GetHullData("Ab1_T1").typed[0], 7);

  const application = manager.GetPatternHullDataJson("STRIPES", "ab1_t1");
  assert.equal(application.layerAndProjection.length, 2);
  assert.deepEqual(application.layerAndProjection[0].projection.position, [1, 2, 3]);
  assert.equal(Object.hasOwn(application, "oldApplicationData"), false);
  assert.equal(manager.GetPatternHullDataJson("stripes", "missing"), null);
  assert.equal(manager.GetHullDataJson("missing"), null);
});

test("SOF extension bucket exposes only Carbon's Blue-mapped fields", () => {
  // Carbon Blue-maps only name, depletionCounters, and placements on Bucket
  // (EveSOFData_Blue2.cpp:292-299) while really deriving it from the concrete
  // Placement type (EveSOFData.h:2088-2104). schema.hideInherited removes the
  // inherited placement fields from this class's schema surface without
  // changing the JavaScript inheritance.
  const hidden = [
    "distributionConditions",
    "extendsBoundingSphere",
    "extendsShieldEllipsoid",
    "isShared",
    "isInstanced",
    "enabled",
    "distribution",
    "descriptor",
    "locatorSetName",
    "offset",
  ];
  const bucket = new EveSOFDataHullExtensionBucket();
  assert.equal(bucket instanceof EveSOFDataHullExtensionPlacement, true);
  for (const name of ["name", "depletionCounters", "placements"])
  {
    assert.ok(CjsSchema.getField(EveSOFDataHullExtensionBucket, name), name);
  }
  for (const name of hidden)
  {
    assert.equal(CjsSchema.getField(EveSOFDataHullExtensionBucket, name), null, name);
    // The parent class keeps its own full surface.
    assert.ok(CjsSchema.getField(EveSOFDataHullExtensionPlacement, name), `parent ${name}`);
  }

  // GetValues carries only the Blue-mapped surface.
  bucket.name = "bucket";
  bucket.locatorSetName = "plain-js-value";
  assert.deepEqual(Object.keys(bucket.GetValues()).sort(), ["depletionCounters", "name", "placements"]);

  // Hidden fields on hydration input are ignored; direct JavaScript access
  // to the inherited properties keeps working.
  bucket.SetValues({ name: "updated", locatorSetName: "ignored", enabled: false });
  assert.equal(bucket.name, "updated");
  assert.equal(bucket.locatorSetName, "plain-js-value");
  assert.equal(bucket.enabled, true);
  bucket.enabled = false;
  assert.equal(bucket.enabled, false);
  assert.equal(bucket.IsBucket(), true);
});

test("SOF light-set records carry Carbon nominal identity with per-type Blue surfaces", async () => {
  // Carbon derives both from EveSOFDataHullLightSetItem (EveSOFData.h:
  // 1410-1429). Textured point lights re-map the base surface WITHOUT
  // lightColor (color comes from the texture) plus texturePath; spot lights
  // map the full base surface plus rotation and the two angles
  // (EveSOFData_Blue.cpp:1057-1114).
  const { EveSOFDataHullLightSetItem, EveSOFDataHullLightSetTexturedPointLight, EveSOFDataHullLightSetSpotLight } =
    await import("../npm/dist/sof/hull/index.js");
  const textured = new EveSOFDataHullLightSetTexturedPointLight();
  const spot = new EveSOFDataHullLightSetSpotLight();
  assert.equal(textured instanceof EveSOFDataHullLightSetItem, true);
  assert.equal(spot instanceof EveSOFDataHullLightSetItem, true);
  // Statics inherit through the real parent.
  assert.equal(EveSOFDataHullLightSetTexturedPointLight.LightType.SPOT_LIGHT, EveSOFDataHullLightSetItem.LightType.SPOT_LIGHT);

  // Textured point: no lightColor on the schema surface, texturePath added;
  // the JavaScript property itself remains usable.
  assert.equal(CjsSchema.getField(EveSOFDataHullLightSetTexturedPointLight, "lightColor"), null);
  assert.ok(CjsSchema.getField(EveSOFDataHullLightSetTexturedPointLight, "texturePath"));
  assert.ok(CjsSchema.getField(EveSOFDataHullLightSetTexturedPointLight, "brightness"));
  assert.equal("lightColor" in textured.GetValues(), false);
  textured.lightColor = 3;
  assert.equal(textured.lightColor, 3);

  // Spot: full base surface including lightColor, plus its own three fields.
  for (const name of ["lightColor", "rotation", "innerAngle", "outerAngle", "noiseOctaves"])
  {
    assert.ok(CjsSchema.getField(EveSOFDataHullLightSetSpotLight, name), name);
  }
});
