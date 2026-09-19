// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { blue, EnumRegistrationType } from "#blue";
import { CjsModel } from "#model";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";

/** Carbon-authored hull record. */
@type.define({ className: "EveSOFDataHull", family: "eve" })
export class EveSOFDataHull extends CjsModel
{

  static BuildClass = Object.freeze({
    BUILDCLASS_SHIP: 0,
    BUILDCLASS_MOBILE: 1,
    BUILDCLASS_STATIONARY: 2,
    BUILDCLASS_SWARM: 3,
    BUILDCLASS_EXTENSION: 4,
    BUILDCLASS_COUNT: 5
  });

  static ImpactEffectType = Object.freeze({
    IMPACTEFFECT_NONE: 0,
    IMPACTEFFECT_ELLIPSOID: 1,
    IMPACTEFFECT_HULL: 2
  });

  static BuildFilter = Object.freeze({
    STANDALONE: 1,
    NON_INSTANCED_PLACEMENT: 2,
    INSTANCED_PLACEMENT: 4,
    DEFAULT_FILTER: 0xffffffff
  });

  /** m_buildClass (BuildClass - enum BuildClass) [READWRITE, PERSIST, ENUM] */
  @edit.persist
  @type.int32
  @type.enum("trinity.EveSOFDataHull.BuildClass")
  buildClass = 0;

  /** m_impactEffectType (ImpactEffectType - enum ImpactEffectType) [READWRITE, PERSIST, ENUM] */
  @edit.persist
  @type.int32
  @type.enum("trinity.EveSOFDataHull.ImpactEffectType")
  impactEffectType = 0;

  /** m_banners (PEveSOFDataHullBannerVector) [READ, PERSIST] */
  @edit.persist
  @type.list("EveSOFDataHullBanner")
  banners = [];

  /** m_soundEmitters (PEveSOFDataHullSoundEmitterVector) [READ, PERSIST] */
  @edit.persist
  @type.list("EveSOFDataHullSoundEmitter")
  soundEmitters = [];

  /** m_category (BlueSharedString) [READWRITE, PERSIST] */
  @edit.persist
  @type.string
  category = "";

  /** m_description (std::string) [READWRITE, PERSIST] */
  @edit.persist
  @type.string
  description = "";

  /** m_locatorSets (PIEveSOFDataHullLocatorSetVector) [READ, PERSIST] */
  @edit.persist
  @type.list("IEveSOFDataHullLocatorSet")
  locatorSets = [];

  /** m_isSkinned (bool) [READWRITE, PERSIST] */
  @edit.persist
  @type.boolean
  isSkinned = false;

  /** m_animations (PEveSOFDataHullAnimationVector) [READ, PERSIST] */
  @edit.persist
  @type.list("EveSOFDataHullAnimation")
  animations = [];

  /** m_children (PEveSOFDataHullChildVector) [READ, PERSIST] */
  @edit.persist
  @type.list("EveSOFDataHullChild")
  children = [];

  /** m_controllers (PEveSOFDataHullControllerVector) [READ, PERSIST] */
  @edit.persist
  @type.list("EveSOFDataHullController")
  controllers = [];

  /** m_instancedMeshes (PEveSOFDataInstancedMeshVector) [READ, PERSIST] */
  @edit.persist
  @type.list("EveSOFDataInstancedMesh")
  instancedMeshes = [];

  /** m_modelRotationCurvePath (std::string) [READWRITE, PERSIST] */
  @edit.persist
  @type.string
  modelRotationCurvePath = "";

  /** m_modelTranslationCurvePath (std::string) [READWRITE, PERSIST] */
  @edit.persist
  @type.string
  modelTranslationCurvePath = "";

  /** m_childSets (PEveSOFDataHullChildSetVector) [READ, PERSIST] */
  @edit.persist
  @type.list("EveSOFDataHullChildSet")
  childSets = [];

  /** m_boundingSphere (Vector4) [READWRITE, PERSIST] */
  @edit.persist
  @type.vec4
  boundingSphere = vec4.create();

  /** m_additiveAreas (PEveSOFDataHullAreaVector) [READ, PERSIST] */
  @edit.persist
  @type.list("EveSOFDataHullArea")
  additiveAreas = [];

  /** m_audioPosition (Vector3) [READWRITE, PERSIST] */
  @edit.persist
  @type.vec3
  audioPosition = vec3.create();

  /** m_bannerSets (PEveSOFDataHullBannerSetVector) [READ, PERSIST] */
  @edit.persist
  @type.list("EveSOFDataHullBannerSet")
  bannerSets = [];

  /** m_booster (EveSOFDataHullBoosterPtr) [READWRITE, PERSIST] */
  @edit.persist
  @type.objectRef("EveSOFDataHullBooster")
  booster = null;

  /** m_decalAreas (PEveSOFDataHullAreaVector) [READ, PERSIST] */
  @edit.persist
  @type.list("EveSOFDataHullArea")
  decalAreas = [];

  /** m_decalSets (PEveSOFDataHullDecalSetVector) [READ, PERSIST] */
  @edit.persist
  @type.list("EveSOFDataHullDecalSet")
  decalSets = [];

  /** m_defaultPattern (EveSOFDataPatternPerHullPtr) [READWRITE, PERSIST] */
  @edit.persist
  @type.objectRef("EveSOFDataPatternPerHull")
  defaultPattern = null;

  /** m_distortionAreas (PEveSOFDataHullAreaVector) [READ, PERSIST] */
  @edit.persist
  @type.list("EveSOFDataHullArea")
  distortionAreas = [];

  /** m_shapeEllipsoidCenter (Vector3) [READWRITE, PERSIST] */
  @edit.persist
  @type.vec3
  shapeEllipsoidCenter = vec3.create();

  /** m_shapeEllipsoidRadius (Vector3) [READWRITE, PERSIST] */
  @edit.persist
  @type.vec3
  shapeEllipsoidRadius = vec3.fromValues(-1, -1, -1);

  /** m_hazeSets (PEveSOFDataHullHazeSetVector) [READ, PERSIST] */
  @edit.persist
  @type.list("EveSOFDataHullHazeSet")
  hazeSets = [];

  /** m_name (std::string) [READWRITE, PERSIST] */
  @edit.persist
  @type.string
  name = "";

  /** m_lightSets (PEveSOFDataHullLightSetVector) [READ, PERSIST] */
  @edit.persist
  @type.list("EveSOFDataHullLightSet")
  lightSets = [];

  /** m_opaqueAreas (PEveSOFDataHullAreaVector) [READ, PERSIST] */
  @edit.persist
  @type.list("EveSOFDataHullArea")
  opaqueAreas = [];

  /** m_planeSets (PEveSOFDataHullPlaneSetVector) [READ, PERSIST] */
  @edit.persist
  @type.list("EveSOFDataHullPlaneSet")
  planeSets = [];

  /** m_geometryResFilePath (std::string) [READWRITE, PERSIST] */
  @edit.persist
  @type.string
  geometryResFilePath = "";

  /** m_spotlightSets (PEveSOFDataHullSpotlightSetVector) [READ, PERSIST] */
  @edit.persist
  @type.list("EveSOFDataHullSpotlightSet")
  spotlightSets = [];

  /** m_spriteLineSets (PEveSOFDataHullSpriteLineSetVector) [READ, PERSIST] */
  @edit.persist
  @type.list("EveSOFDataHullSpriteLineSet")
  spriteLineSets = [];

  /** m_spriteSets (PEveSOFDataHullSpriteSetVector) [READ, PERSIST] */
  @edit.persist
  @type.list("EveSOFDataHullSpriteSet")
  spriteSets = [];

  /** m_transparentAreas (PEveSOFDataHullAreaVector) [READ, PERSIST] */
  @edit.persist
  @type.list("EveSOFDataHullArea")
  transparentAreas = [];

  /** m_locatorTurrets (PEveSOFDataHullLocatorVector) [READ, PERSIST] */
  @edit.persist
  @type.list("EveSOFDataHullLocator")
  locatorTurrets = [];

  /** m_sof6 (bool) [READWRITE, PERSIST] */
  @edit.persist
  @type.boolean
  sof6 = false;

  /** m_enableDynamicBoundingSphere (bool) [READWRITE, PERSIST] */
  @edit.persist
  @type.boolean
  enableDynamicBoundingSphere = false;

  /** m_castShadow (bool) [READWRITE, PERSIST] */
  @edit.persist
  @type.boolean
  castShadow = true;

}

// Native chooser labels and selection; the enum object retains all C++ members.
blue.enums.RegisterEnum("trinity.EveSOFDataHull.BuildClass", EveSOFDataHull.BuildClass, {
  source: "trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h", family: "eve", line: 1536,
  exposedName: "BuildClass", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue.cpp:936",
  chooser: [
    { name: "EveShip2", value: EveSOFDataHull.BuildClass.BUILDCLASS_SHIP, description: "Build an EveShip2" },
    { name: "EveMobile", value: EveSOFDataHull.BuildClass.BUILDCLASS_MOBILE, description: "Build an EveMobile" },
    { name: "EveStation2", value: EveSOFDataHull.BuildClass.BUILDCLASS_STATIONARY, description: "Build an EveStation2" },
    { name: "EveSwarm", value: EveSOFDataHull.BuildClass.BUILDCLASS_SWARM, description: "Build an EveSwarm" },
    { name: "Extension", value: EveSOFDataHull.BuildClass.BUILDCLASS_EXTENSION, description: "Build an EveEffectRoot with a child" }
  ]
});

// Native chooser labels and selection; the enum object retains all C++ members.
blue.enums.RegisterEnum("trinity.EveSOFDataHull.ImpactEffectType", EveSOFDataHull.ImpactEffectType, {
  source: "trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h", family: "eve", line: 1548,
  exposedName: "ImpactEffectType", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue.cpp:946",
  chooser: [
    { name: "Nothing", value: EveSOFDataHull.ImpactEffectType.IMPACTEFFECT_NONE, description: "No impact effects" },
    { name: "Ellipsoid", value: EveSOFDataHull.ImpactEffectType.IMPACTEFFECT_ELLIPSOID, description: "Use ellipsoid for shield" },
    { name: "Hull", value: EveSOFDataHull.ImpactEffectType.IMPACTEFFECT_HULL, description: "Use ellipsoid for hull" }
  ]
});
