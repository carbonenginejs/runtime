import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initClass, _init_buildClass, _init_extra_buildClass, _init_impactEffectType, _init_extra_impactEffectType, _init_banners, _init_extra_banners, _init_soundEmitters, _init_extra_soundEmitters, _init_category, _init_extra_category, _init_description, _init_extra_description, _init_locatorSets, _init_extra_locatorSets, _init_isSkinned, _init_extra_isSkinned, _init_animations, _init_extra_animations, _init_children, _init_extra_children, _init_controllers, _init_extra_controllers, _init_instancedMeshes, _init_extra_instancedMeshes, _init_modelRotationCurvePath, _init_extra_modelRotationCurvePath, _init_modelTranslationCurvePath, _init_extra_modelTranslationCurvePath, _init_childSets, _init_extra_childSets, _init_boundingSphere, _init_extra_boundingSphere, _init_additiveAreas, _init_extra_additiveAreas, _init_audioPosition, _init_extra_audioPosition, _init_bannerSets, _init_extra_bannerSets, _init_booster, _init_extra_booster, _init_decalAreas, _init_extra_decalAreas, _init_decalSets, _init_extra_decalSets, _init_defaultPattern, _init_extra_defaultPattern, _init_distortionAreas, _init_extra_distortionAreas, _init_shapeEllipsoidCenter, _init_extra_shapeEllipsoidCenter, _init_shapeEllipsoidRadius, _init_extra_shapeEllipsoidRadius, _init_hazeSets, _init_extra_hazeSets, _init_name, _init_extra_name, _init_lightSets, _init_extra_lightSets, _init_opaqueAreas, _init_extra_opaqueAreas, _init_planeSets, _init_extra_planeSets, _init_geometryResFilePath, _init_extra_geometryResFilePath, _init_spotlightSets, _init_extra_spotlightSets, _init_spriteLineSets, _init_extra_spriteLineSets, _init_spriteSets, _init_extra_spriteSets, _init_transparentAreas, _init_extra_transparentAreas, _init_locatorTurrets, _init_extra_locatorTurrets, _init_sof, _init_extra_sof, _init_enableDynamicBoundingSphere, _init_extra_enableDynamicBoundingSphere, _init_castShadow, _init_extra_castShadow;

/** Carbon-authored hull record. */
let _EveSOFDataHull;
new class extends _identity {
  static [class EveSOFDataHull extends CjsModel {
    static {
      ({
        e: [_init_buildClass, _init_extra_buildClass, _init_impactEffectType, _init_extra_impactEffectType, _init_banners, _init_extra_banners, _init_soundEmitters, _init_extra_soundEmitters, _init_category, _init_extra_category, _init_description, _init_extra_description, _init_locatorSets, _init_extra_locatorSets, _init_isSkinned, _init_extra_isSkinned, _init_animations, _init_extra_animations, _init_children, _init_extra_children, _init_controllers, _init_extra_controllers, _init_instancedMeshes, _init_extra_instancedMeshes, _init_modelRotationCurvePath, _init_extra_modelRotationCurvePath, _init_modelTranslationCurvePath, _init_extra_modelTranslationCurvePath, _init_childSets, _init_extra_childSets, _init_boundingSphere, _init_extra_boundingSphere, _init_additiveAreas, _init_extra_additiveAreas, _init_audioPosition, _init_extra_audioPosition, _init_bannerSets, _init_extra_bannerSets, _init_booster, _init_extra_booster, _init_decalAreas, _init_extra_decalAreas, _init_decalSets, _init_extra_decalSets, _init_defaultPattern, _init_extra_defaultPattern, _init_distortionAreas, _init_extra_distortionAreas, _init_shapeEllipsoidCenter, _init_extra_shapeEllipsoidCenter, _init_shapeEllipsoidRadius, _init_extra_shapeEllipsoidRadius, _init_hazeSets, _init_extra_hazeSets, _init_name, _init_extra_name, _init_lightSets, _init_extra_lightSets, _init_opaqueAreas, _init_extra_opaqueAreas, _init_planeSets, _init_extra_planeSets, _init_geometryResFilePath, _init_extra_geometryResFilePath, _init_spotlightSets, _init_extra_spotlightSets, _init_spriteLineSets, _init_extra_spriteLineSets, _init_spriteSets, _init_extra_spriteSets, _init_transparentAreas, _init_extra_transparentAreas, _init_locatorTurrets, _init_extra_locatorTurrets, _init_sof, _init_extra_sof, _init_enableDynamicBoundingSphere, _init_extra_enableDynamicBoundingSphere, _init_castShadow, _init_extra_castShadow],
        c: [_EveSOFDataHull, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveSOFDataHull",
        family: "eve"
      })], [[[io, io.persist, type, type.int32, void 0, type.enum("BuildClass")], 16, "buildClass"], [[io, io.persist, type, type.int32, void 0, type.enum("ImpactEffectType")], 16, "impactEffectType"], [[io, io.persist, void 0, type.list("EveSOFDataHullBanner")], 16, "banners"], [[io, io.persist, void 0, type.list("EveSOFDataHullSoundEmitter")], 16, "soundEmitters"], [[io, io.persist, type, type.string], 16, "category"], [[io, io.persist, type, type.string], 16, "description"], [[io, io.persist, void 0, type.list("IEveSOFDataHullLocatorSet")], 16, "locatorSets"], [[io, io.persist, type, type.boolean], 16, "isSkinned"], [[io, io.persist, void 0, type.list("EveSOFDataHullAnimation")], 16, "animations"], [[io, io.persist, void 0, type.list("EveSOFDataHullChild")], 16, "children"], [[io, io.persist, void 0, type.list("EveSOFDataHullController")], 16, "controllers"], [[io, io.persist, void 0, type.list("EveSOFDataInstancedMesh")], 16, "instancedMeshes"], [[io, io.persist, type, type.string], 16, "modelRotationCurvePath"], [[io, io.persist, type, type.string], 16, "modelTranslationCurvePath"], [[io, io.persist, void 0, type.list("EveSOFDataHullChildSet")], 16, "childSets"], [[io, io.persist, type, type.vec4], 16, "boundingSphere"], [[io, io.persist, void 0, type.list("EveSOFDataHullArea")], 16, "additiveAreas"], [[io, io.persist, type, type.vec3], 16, "audioPosition"], [[io, io.persist, void 0, type.list("EveSOFDataHullBannerSet")], 16, "bannerSets"], [[io, io.persist, void 0, type.objectRef("EveSOFDataHullBooster")], 16, "booster"], [[io, io.persist, void 0, type.list("EveSOFDataHullArea")], 16, "decalAreas"], [[io, io.persist, void 0, type.list("EveSOFDataHullDecalSet")], 16, "decalSets"], [[io, io.persist, void 0, type.objectRef("EveSOFDataPatternPerHull")], 16, "defaultPattern"], [[io, io.persist, void 0, type.list("EveSOFDataHullArea")], 16, "distortionAreas"], [[io, io.persist, type, type.vec3], 16, "shapeEllipsoidCenter"], [[io, io.persist, type, type.vec3], 16, "shapeEllipsoidRadius"], [[io, io.persist, void 0, type.list("EveSOFDataHullHazeSet")], 16, "hazeSets"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, void 0, type.list("EveSOFDataHullLightSet")], 16, "lightSets"], [[io, io.persist, void 0, type.list("EveSOFDataHullArea")], 16, "opaqueAreas"], [[io, io.persist, void 0, type.list("EveSOFDataHullPlaneSet")], 16, "planeSets"], [[io, io.persist, type, type.string], 16, "geometryResFilePath"], [[io, io.persist, void 0, type.list("EveSOFDataHullSpotlightSet")], 16, "spotlightSets"], [[io, io.persist, void 0, type.list("EveSOFDataHullSpriteLineSet")], 16, "spriteLineSets"], [[io, io.persist, void 0, type.list("EveSOFDataHullSpriteSet")], 16, "spriteSets"], [[io, io.persist, void 0, type.list("EveSOFDataHullArea")], 16, "transparentAreas"], [[io, io.persist, void 0, type.list("EveSOFDataHullLocator")], 16, "locatorTurrets"], [[io, io.persist, type, type.boolean], 16, "sof6"], [[io, io.persist, type, type.boolean], 16, "enableDynamicBoundingSphere"], [[io, io.persist, type, type.boolean], 16, "castShadow"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_castShadow(this);
    }
    /** m_buildClass (BuildClass - enum BuildClass) [READWRITE, PERSIST, ENUM] */
    buildClass = _init_buildClass(this, 0);

    /** m_impactEffectType (ImpactEffectType - enum ImpactEffectType) [READWRITE, PERSIST, ENUM] */
    impactEffectType = (_init_extra_buildClass(this), _init_impactEffectType(this, 0));

    /** m_banners (PEveSOFDataHullBannerVector) [READ, PERSIST] */
    banners = (_init_extra_impactEffectType(this), _init_banners(this, []));

    /** m_soundEmitters (PEveSOFDataHullSoundEmitterVector) [READ, PERSIST] */
    soundEmitters = (_init_extra_banners(this), _init_soundEmitters(this, []));

    /** m_category (BlueSharedString) [READWRITE, PERSIST] */
    category = (_init_extra_soundEmitters(this), _init_category(this, ""));

    /** m_description (std::string) [READWRITE, PERSIST] */
    description = (_init_extra_category(this), _init_description(this, ""));

    /** m_locatorSets (PIEveSOFDataHullLocatorSetVector) [READ, PERSIST] */
    locatorSets = (_init_extra_description(this), _init_locatorSets(this, []));

    /** m_isSkinned (bool) [READWRITE, PERSIST] */
    isSkinned = (_init_extra_locatorSets(this), _init_isSkinned(this, false));

    /** m_animations (PEveSOFDataHullAnimationVector) [READ, PERSIST] */
    animations = (_init_extra_isSkinned(this), _init_animations(this, []));

    /** m_children (PEveSOFDataHullChildVector) [READ, PERSIST] */
    children = (_init_extra_animations(this), _init_children(this, []));

    /** m_controllers (PEveSOFDataHullControllerVector) [READ, PERSIST] */
    controllers = (_init_extra_children(this), _init_controllers(this, []));

    /** m_instancedMeshes (PEveSOFDataInstancedMeshVector) [READ, PERSIST] */
    instancedMeshes = (_init_extra_controllers(this), _init_instancedMeshes(this, []));

    /** m_modelRotationCurvePath (std::string) [READWRITE, PERSIST] */
    modelRotationCurvePath = (_init_extra_instancedMeshes(this), _init_modelRotationCurvePath(this, ""));

    /** m_modelTranslationCurvePath (std::string) [READWRITE, PERSIST] */
    modelTranslationCurvePath = (_init_extra_modelRotationCurvePath(this), _init_modelTranslationCurvePath(this, ""));

    /** m_childSets (PEveSOFDataHullChildSetVector) [READ, PERSIST] */
    childSets = (_init_extra_modelTranslationCurvePath(this), _init_childSets(this, []));

    /** m_boundingSphere (Vector4) [READWRITE, PERSIST] */
    boundingSphere = (_init_extra_childSets(this), _init_boundingSphere(this, vec4.create()));

    /** m_additiveAreas (PEveSOFDataHullAreaVector) [READ, PERSIST] */
    additiveAreas = (_init_extra_boundingSphere(this), _init_additiveAreas(this, []));

    /** m_audioPosition (Vector3) [READWRITE, PERSIST] */
    audioPosition = (_init_extra_additiveAreas(this), _init_audioPosition(this, vec3.create()));

    /** m_bannerSets (PEveSOFDataHullBannerSetVector) [READ, PERSIST] */
    bannerSets = (_init_extra_audioPosition(this), _init_bannerSets(this, []));

    /** m_booster (EveSOFDataHullBoosterPtr) [READWRITE, PERSIST] */
    booster = (_init_extra_bannerSets(this), _init_booster(this, null));

    /** m_decalAreas (PEveSOFDataHullAreaVector) [READ, PERSIST] */
    decalAreas = (_init_extra_booster(this), _init_decalAreas(this, []));

    /** m_decalSets (PEveSOFDataHullDecalSetVector) [READ, PERSIST] */
    decalSets = (_init_extra_decalAreas(this), _init_decalSets(this, []));

    /** m_defaultPattern (EveSOFDataPatternPerHullPtr) [READWRITE, PERSIST] */
    defaultPattern = (_init_extra_decalSets(this), _init_defaultPattern(this, null));

    /** m_distortionAreas (PEveSOFDataHullAreaVector) [READ, PERSIST] */
    distortionAreas = (_init_extra_defaultPattern(this), _init_distortionAreas(this, []));

    /** m_shapeEllipsoidCenter (Vector3) [READWRITE, PERSIST] */
    shapeEllipsoidCenter = (_init_extra_distortionAreas(this), _init_shapeEllipsoidCenter(this, vec3.create()));

    /** m_shapeEllipsoidRadius (Vector3) [READWRITE, PERSIST] */
    shapeEllipsoidRadius = (_init_extra_shapeEllipsoidCenter(this), _init_shapeEllipsoidRadius(this, vec3.fromValues(-1, -1, -1)));

    /** m_hazeSets (PEveSOFDataHullHazeSetVector) [READ, PERSIST] */
    hazeSets = (_init_extra_shapeEllipsoidRadius(this), _init_hazeSets(this, []));

    /** m_name (std::string) [READWRITE, PERSIST] */
    name = (_init_extra_hazeSets(this), _init_name(this, ""));

    /** m_lightSets (PEveSOFDataHullLightSetVector) [READ, PERSIST] */
    lightSets = (_init_extra_name(this), _init_lightSets(this, []));

    /** m_opaqueAreas (PEveSOFDataHullAreaVector) [READ, PERSIST] */
    opaqueAreas = (_init_extra_lightSets(this), _init_opaqueAreas(this, []));

    /** m_planeSets (PEveSOFDataHullPlaneSetVector) [READ, PERSIST] */
    planeSets = (_init_extra_opaqueAreas(this), _init_planeSets(this, []));

    /** m_geometryResFilePath (std::string) [READWRITE, PERSIST] */
    geometryResFilePath = (_init_extra_planeSets(this), _init_geometryResFilePath(this, ""));

    /** m_spotlightSets (PEveSOFDataHullSpotlightSetVector) [READ, PERSIST] */
    spotlightSets = (_init_extra_geometryResFilePath(this), _init_spotlightSets(this, []));

    /** m_spriteLineSets (PEveSOFDataHullSpriteLineSetVector) [READ, PERSIST] */
    spriteLineSets = (_init_extra_spotlightSets(this), _init_spriteLineSets(this, []));

    /** m_spriteSets (PEveSOFDataHullSpriteSetVector) [READ, PERSIST] */
    spriteSets = (_init_extra_spriteLineSets(this), _init_spriteSets(this, []));

    /** m_transparentAreas (PEveSOFDataHullAreaVector) [READ, PERSIST] */
    transparentAreas = (_init_extra_spriteSets(this), _init_transparentAreas(this, []));

    /** m_locatorTurrets (PEveSOFDataHullLocatorVector) [READ, PERSIST] */
    locatorTurrets = (_init_extra_transparentAreas(this), _init_locatorTurrets(this, []));

    /** m_sof6 (bool) [READWRITE, PERSIST] */
    sof6 = (_init_extra_locatorTurrets(this), _init_sof(this, false));

    /** m_enableDynamicBoundingSphere (bool) [READWRITE, PERSIST] */
    enableDynamicBoundingSphere = (_init_extra_sof(this), _init_enableDynamicBoundingSphere(this, false));

    /** m_castShadow (bool) [READWRITE, PERSIST] */
    castShadow = (_init_extra_enableDynamicBoundingSphere(this), _init_castShadow(this, true));
  }];
  BuildClass = Object.freeze({
    BUILDCLASS_SHIP: 0,
    BUILDCLASS_MOBILE: 1,
    BUILDCLASS_STATIONARY: 2,
    BUILDCLASS_SWARM: 3,
    BUILDCLASS_EXTENSION: 4,
    BUILDCLASS_COUNT: 5
  });
  ImpactEffectType = Object.freeze({
    IMPACTEFFECT_NONE: 0,
    IMPACTEFFECT_ELLIPSOID: 1,
    IMPACTEFFECT_HULL: 2
  });
  BuildFilter = Object.freeze({
    STANDALONE: 1,
    NON_INSTANCED_PLACEMENT: 2,
    INSTANCED_PLACEMENT: 4,
    DEFAULT_FILTER: 0xffffffff
  });
  constructor() {
    super(_EveSOFDataHull), _initClass();
  }
}();

export { _EveSOFDataHull as EveSOFDataHull };
//# sourceMappingURL=EveSOFDataHull.js.map
