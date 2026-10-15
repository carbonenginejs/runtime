import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";
import { be, EnumRegistrationType } from "#blue";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";

/** Carbon-authored hull record. */
@blue.define("EveSOFDataHull")
@blue.inherit(IRoot)
export class EveSOFDataHull
{

  static BuildClass = {
    BUILDCLASS_SHIP: 0,
    BUILDCLASS_MOBILE: 1,
    BUILDCLASS_STATIONARY: 2,
    BUILDCLASS_SWARM: 3,
    BUILDCLASS_EXTENSION: 4,
    BUILDCLASS_COUNT: 5
  };

  static ImpactEffectType = {
    IMPACTEFFECT_NONE: 0,
    IMPACTEFFECT_ELLIPSOID: 1,
    IMPACTEFFECT_HULL: 2
  };

  static BuildFilter = Object.freeze({
    STANDALONE: 1,
    NON_INSTANCED_PLACEMENT: 2,
    INSTANCED_PLACEMENT: 4,
    DEFAULT_FILTER: 0xffffffff
  });

  /** m_buildClass (BuildClass - enum BuildClass) [READWRITE, PERSIST, ENUM] */
  @blue.readwrite
  @blue.persist
  @type.int32
  @type.enum("trinity.EveSOFDataHull.BuildClass")
  buildClass = 0;

  /** m_impactEffectType (ImpactEffectType - enum ImpactEffectType) [READWRITE, PERSIST, ENUM] */
  @blue.readwrite
  @blue.persist
  @type.int32
  @type.enum("trinity.EveSOFDataHull.ImpactEffectType")
  impactEffectType = 0;

  /** m_banners (PEveSOFDataHullBannerVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataHullBanner")
  banners = [];

  /** m_soundEmitters (PEveSOFDataHullSoundEmitterVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataHullSoundEmitter")
  soundEmitters = [];

  /** m_category (BlueSharedString) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  category = "";

  /** m_description (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  description = "";

  /** m_locatorSets (PIEveSOFDataHullLocatorSetVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("IEveSOFDataHullLocatorSet")
  locatorSets = [];

  /** m_isSkinned (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  isSkinned = false;

  /** m_animations (PEveSOFDataHullAnimationVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataHullAnimation")
  animations = [];

  /** m_children (PEveSOFDataHullChildVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataHullChild")
  children = [];

  /** m_controllers (PEveSOFDataHullControllerVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataHullController")
  controllers = [];

  /** m_instancedMeshes (PEveSOFDataInstancedMeshVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataInstancedMesh")
  instancedMeshes = [];

  /** m_modelRotationCurvePath (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.path
  modelRotationCurvePath = "";

  /** m_modelTranslationCurvePath (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.path
  modelTranslationCurvePath = "";

  /** m_childSets (PEveSOFDataHullChildSetVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataHullChildSet")
  childSets = [];

  /** m_boundingSphere (Vector4) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.vec4
  boundingSphere = vec4.create();

  /** m_additiveAreas (PEveSOFDataHullAreaVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataHullArea")
  additiveAreas = [];

  /** m_audioPosition (Vector3) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.vec3
  audioPosition = vec3.create();

  /** m_bannerSets (PEveSOFDataHullBannerSetVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataHullBannerSet")
  bannerSets = [];

  /** m_booster (EveSOFDataHullBoosterPtr) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.rootRef("EveSOFDataHullBooster")
  booster = null;

  /** m_decalAreas (PEveSOFDataHullAreaVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataHullArea")
  decalAreas = [];

  /** m_decalSets (PEveSOFDataHullDecalSetVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataHullDecalSet")
  decalSets = [];

  /** m_defaultPattern (EveSOFDataPatternPerHullPtr) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.rootRef("EveSOFDataPatternPerHull")
  defaultPattern = null;

  /** m_distortionAreas (PEveSOFDataHullAreaVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataHullArea")
  distortionAreas = [];

  /** m_shapeEllipsoidCenter (Vector3) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.vec3
  shapeEllipsoidCenter = vec3.create();

  /** m_shapeEllipsoidRadius (Vector3) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.vec3
  shapeEllipsoidRadius = vec3.fromValues(-1, -1, -1);

  /** m_hazeSets (PEveSOFDataHullHazeSetVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataHullHazeSet")
  hazeSets = [];

  /** m_name (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  /** m_lightSets (PEveSOFDataHullLightSetVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataHullLightSet")
  lightSets = [];

  /** m_opaqueAreas (PEveSOFDataHullAreaVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataHullArea")
  opaqueAreas = [];

  /** m_planeSets (PEveSOFDataHullPlaneSetVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataHullPlaneSet")
  planeSets = [];

  /** m_geometryResFilePath (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.path("TriGeometryRes")
  geometryResFilePath = "";

  /** m_spotlightSets (PEveSOFDataHullSpotlightSetVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataHullSpotlightSet")
  spotlightSets = [];

  /** m_spriteLineSets (PEveSOFDataHullSpriteLineSetVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataHullSpriteLineSet")
  spriteLineSets = [];

  /** m_spriteSets (PEveSOFDataHullSpriteSetVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataHullSpriteSet")
  spriteSets = [];

  /** m_transparentAreas (PEveSOFDataHullAreaVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataHullArea")
  transparentAreas = [];

  /** m_locatorTurrets (PEveSOFDataHullLocatorVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataHullLocator")
  locatorTurrets = [];

  /** m_sof6 (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  sof6 = false;

  /** m_enableDynamicBoundingSphere (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  enableDynamicBoundingSphere = false;

  /** m_castShadow (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  castShadow = true;

}

// Native chooser labels and selection; the enum object retains all C++ members.
be.enums.Create("trinity.EveSOFDataHull.BuildClass", EveSOFDataHull.BuildClass, {
  exposedName: "BuildClass", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooser: [
    { name: "EveShip2", value: EveSOFDataHull.BuildClass.BUILDCLASS_SHIP, description: "Build an EveShip2" },
    { name: "EveMobile", value: EveSOFDataHull.BuildClass.BUILDCLASS_MOBILE, description: "Build an EveMobile" },
    { name: "EveStation2", value: EveSOFDataHull.BuildClass.BUILDCLASS_STATIONARY, description: "Build an EveStation2" },
    { name: "EveSwarm", value: EveSOFDataHull.BuildClass.BUILDCLASS_SWARM, description: "Build an EveSwarm" },
    { name: "Extension", value: EveSOFDataHull.BuildClass.BUILDCLASS_EXTENSION, description: "Build an EveEffectRoot with a child" }
  ]
});

// Native chooser labels and selection; the enum object retains all C++ members.
be.enums.Create("trinity.EveSOFDataHull.ImpactEffectType", EveSOFDataHull.ImpactEffectType, {
  exposedName: "ImpactEffectType", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooser: [
    { name: "Nothing", value: EveSOFDataHull.ImpactEffectType.IMPACTEFFECT_NONE, description: "No impact effects" },
    { name: "Ellipsoid", value: EveSOFDataHull.ImpactEffectType.IMPACTEFFECT_ELLIPSOID, description: "Use ellipsoid for shield" },
    { name: "Hull", value: EveSOFDataHull.ImpactEffectType.IMPACTEFFECT_HULL, description: "Use ellipsoid for hull" }
  ]
});
