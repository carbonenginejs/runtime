import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl, schema } from '@carbonenginejs/core-types/schema';
import { CjsModel } from '@carbonenginejs/core-types/model';
import { vec3 } from '@carbonenginejs/core-math/vec3';
import { vec4 } from '@carbonenginejs/core-math/vec4';

let _initProto, _initClass, _init_backgroundCubemapPath, _init_extra_backgroundCubemapPath, _init_visualizeMethod, _init_extra_visualizeMethod, _init_curveSets, _init_extra_curveSets, _init_renderShadows, _init_extra_renderShadows, _init_debugRenderShadowMaps, _init_extra_debugRenderShadowMaps, _init_shadowCount, _init_extra_shadowCount, _init_minFogDistance, _init_extra_minFogDistance, _init_maxFogDistance, _init_extra_maxFogDistance, _init_fogColor, _init_extra_fogColor, _init_dynamics, _init_extra_dynamics, _init_lights, _init_extra_lights, _init_maxFogAmount, _init_extra_maxFogAmount, _init_debugRenderer, _init_extra_debugRenderer, _init_visibilityResults, _init_extra_visibilityResults, _init_ambientColor, _init_extra_ambientColor, _init_optimizeShadows, _init_extra_optimizeShadows, _init_shadowSize, _init_extra_shadowSize, _init_lightRenderTargets, _init_extra_lightRenderTargets, _init_sunDiffuseColor, _init_extra_sunDiffuseColor, _init_sunDirection, _init_extra_sunDirection, _init_sunSpecularColor, _init_extra_sunSpecularColor, _init_backgroundCubemapRes, _init_extra_backgroundCubemapRes, _init_backgroundEffect, _init_extra_backgroundEffect;

/** Tr2InteriorScene (interior) - generated from schema shapeHash 3a5a36e9.... */
let _Tr2InteriorScene;
new class extends _identity {
  static [class Tr2InteriorScene extends CjsModel {
    static {
      ({
        e: [_init_backgroundCubemapPath, _init_extra_backgroundCubemapPath, _init_visualizeMethod, _init_extra_visualizeMethod, _init_curveSets, _init_extra_curveSets, _init_renderShadows, _init_extra_renderShadows, _init_debugRenderShadowMaps, _init_extra_debugRenderShadowMaps, _init_shadowCount, _init_extra_shadowCount, _init_minFogDistance, _init_extra_minFogDistance, _init_maxFogDistance, _init_extra_maxFogDistance, _init_fogColor, _init_extra_fogColor, _init_dynamics, _init_extra_dynamics, _init_lights, _init_extra_lights, _init_maxFogAmount, _init_extra_maxFogAmount, _init_debugRenderer, _init_extra_debugRenderer, _init_visibilityResults, _init_extra_visibilityResults, _init_ambientColor, _init_extra_ambientColor, _init_optimizeShadows, _init_extra_optimizeShadows, _init_shadowSize, _init_extra_shadowSize, _init_lightRenderTargets, _init_extra_lightRenderTargets, _init_sunDiffuseColor, _init_extra_sunDiffuseColor, _init_sunDirection, _init_extra_sunDirection, _init_sunSpecularColor, _init_extra_sunSpecularColor, _init_backgroundCubemapRes, _init_extra_backgroundCubemapRes, _init_backgroundEffect, _init_extra_backgroundEffect, _initProto],
        c: [_Tr2InteriorScene, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2InteriorScene",
        family: "interior"
      })], [[[io, io.notify, io, io.persist, type, type.string], 16, "backgroundCubemapPath"], [[io, io.notify, io, io.readwrite, type, type.int32, void 0, schema.enum("VisualizeMethod")], 16, "visualizeMethod"], [[io, io.persist, void 0, type.list("TriCurveSet")], 16, "curveSets"], [[io, io.notify, io, io.readwrite, type, type.boolean], 16, "renderShadows"], [[io, io.notify, io, io.readwrite, type, type.boolean], 16, "debugRenderShadowMaps"], [[io, io.notify, io, io.readwrite, type, type.int32], 16, "shadowCount"], [[io, io.persist, type, type.float32], 16, "minFogDistance"], [[io, io.persist, type, type.float32], 16, "maxFogDistance"], [[io, io.persist, type, type.color], 16, "fogColor"], [[io, io.notify, io, io.persist, void 0, type.list("ITr2InteriorDynamic")], 16, "dynamics"], [[io, io.notify, io, io.persist, void 0, type.list("ITr2InteriorLight")], 16, "lights"], [[io, io.persist, type, type.float32], 16, "maxFogAmount"], [[io, io.readwrite, void 0, type.objectRef("Tr2DebugRenderer")], 16, "debugRenderer"], [[io, io.read, void 0, type.objectRef("Tr2VisibilityResults")], 16, "visibilityResults"], [[io, io.persist, type, type.color], 16, "ambientColor"], [[io, io.notify, io, io.readwrite, type, type.boolean], 16, "optimizeShadows"], [[io, io.notify, io, io.readwrite, type, type.int32], 16, "shadowSize"], [[io, io.read, void 0, type.list("Tr2RenderTarget")], 16, "lightRenderTargets"], [[io, io.persist, type, type.color], 16, "sunDiffuseColor"], [[io, io.persist, type, type.vec3], 16, "sunDirection"], [[io, io.persist, type, type.color], 16, "sunSpecularColor"], [[io, io.read, void 0, type.objectRef("TriTextureRes")], 16, "backgroundCubemapRes"], [[io, io.persist, void 0, type.model("Tr2Effect")], 16, "backgroundEffect"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "PickObject"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "AddDynamic"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "AddLightSource"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "Pick"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "PickObjectAndArea"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "PickPointAndObject"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "PickObjectUV"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "RebuildSceneData"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "RemoveDynamic"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "RemoveLightSource"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "UpdateScene"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "SetupShadowMaps"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_backgroundEffect(this);
    }
    /** m_backgroundCubeMapPath (std::string) [READWRITE, PERSIST, NOTIFY] */
    backgroundCubemapPath = (_initProto(this), _init_backgroundCubemapPath(this, ""));

    /** m_visualizeMethod (VisualizeMethod - enum VisualizeMethod) [READWRITE, ENUM, NOTIFY] */
    visualizeMethod = (_init_extra_backgroundCubemapPath(this), _init_visualizeMethod(this, 0));

    /** m_curveSets (PTriCurveSetVector) [READ, PERSIST] */
    curveSets = (_init_extra_visualizeMethod(this), _init_curveSets(this, []));

    /** m_renderShadows (bool) [READWRITE, NOTIFY] */
    renderShadows = (_init_extra_curveSets(this), _init_renderShadows(this, true));

    /** m_debugRenderShadowMaps (bool) [READWRITE, NOTIFY] */
    debugRenderShadowMaps = (_init_extra_renderShadows(this), _init_debugRenderShadowMaps(this, false));

    /** m_shadowCount (int) [READWRITE, NOTIFY] */
    shadowCount = (_init_extra_debugRenderShadowMaps(this), _init_shadowCount(this, 4));

    /** m_minFogDistance (float) [READWRITE, PERSIST] */
    minFogDistance = (_init_extra_shadowCount(this), _init_minFogDistance(this, 0));

    /** m_maxFogDistance (float) [READWRITE, PERSIST] */
    maxFogDistance = (_init_extra_minFogDistance(this), _init_maxFogDistance(this, 1000));

    /** m_fogColor (Color) [READWRITE, PERSIST] */
    fogColor = (_init_extra_maxFogDistance(this), _init_fogColor(this, vec4.fromValues(1, 1, 1, 1)));

    /** m_dynamics (PITr2InteriorDynamicVector) [READ, PERSIST, NOTIFY] */
    dynamics = (_init_extra_fogColor(this), _init_dynamics(this, []));

    /** m_lights (PITr2InteriorLightVector) [READ, PERSIST, NOTIFY] */
    lights = (_init_extra_dynamics(this), _init_lights(this, []));

    /** m_maxFogAmount (float) [READWRITE, PERSIST] */
    maxFogAmount = (_init_extra_lights(this), _init_maxFogAmount(this, 0));

    /** m_debugRenderer (Tr2DebugRendererPtr) [READWRITE] */
    debugRenderer = (_init_extra_maxFogAmount(this), _init_debugRenderer(this, null));

    /** m_visibilityResults (Tr2VisibilityResultsPtr) [READ] */
    visibilityResults = (_init_extra_debugRenderer(this), _init_visibilityResults(this, null));

    /** m_ambientColor (Color) [READWRITE, PERSIST] */
    ambientColor = (_init_extra_visibilityResults(this), _init_ambientColor(this, vec4.create()));

    /** m_optimizeShadows (bool) [READWRITE, NOTIFY] */
    optimizeShadows = (_init_extra_ambientColor(this), _init_optimizeShadows(this, true));

    /** m_shadowSize (int) [READWRITE, NOTIFY] */
    shadowSize = (_init_extra_optimizeShadows(this), _init_shadowSize(this, 1024));

    /** m_lightRenderTargets (PTr2RenderTargetVector) [READ] */
    lightRenderTargets = (_init_extra_shadowSize(this), _init_lightRenderTargets(this, []));

    /** m_sunDiffuseColor (Color) [READWRITE, PERSIST] */
    sunDiffuseColor = (_init_extra_lightRenderTargets(this), _init_sunDiffuseColor(this, vec4.createLinear()));

    /** m_sunDirection (Vector3) [READWRITE, PERSIST] */
    sunDirection = (_init_extra_sunDiffuseColor(this), _init_sunDirection(this, vec3.fromValues(0, 0, 1)));

    /** m_sunSpecularColor (Color) [READWRITE, PERSIST] */
    sunSpecularColor = (_init_extra_sunDirection(this), _init_sunSpecularColor(this, vec4.fromValues(0.8, 0.8, 0.8, 1)));

    /** m_backgroundCubeMapRes (TriTextureResPtr) [READ] */
    backgroundCubemapRes = (_init_extra_sunSpecularColor(this), _init_backgroundCubemapRes(this, null));

    /** m_backgroundEffect (Tr2EffectPtr) [READWRITE, PERSIST] */
    backgroundEffect = (_init_extra_backgroundCubemapRes(this), _init_backgroundEffect(this, null));

    /** Carbon method PickObject -> PickObjectOnly (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
    PickObject(...args) {
      throw new Error("Tr2InteriorScene.PickObject is not implemented in CarbonEngineJS.");
    }

    /** Carbon method AddDynamic (MAP_METHOD_AND_WRAP). */
    AddDynamic(...args) {
      throw new Error("Tr2InteriorScene.AddDynamic is not implemented in CarbonEngineJS.");
    }

    /** Carbon method AddLightSource (MAP_METHOD_AND_WRAP). */
    AddLightSource(...args) {
      throw new Error("Tr2InteriorScene.AddLightSource is not implemented in CarbonEngineJS.");
    }

    /** Carbon method Pick -> PyPick (MAP_METHOD). */
    Pick(...args) {
      throw new Error("Tr2InteriorScene.Pick is not implemented in CarbonEngineJS.");
    }

    /** Carbon method PickObjectAndArea -> PyPickObjectAndArea (MAP_METHOD). */
    PickObjectAndArea(...args) {
      throw new Error("Tr2InteriorScene.PickObjectAndArea is not implemented in CarbonEngineJS.");
    }

    /** Carbon method PickPointAndObject -> PyInteriorPickPointAndObject (MAP_METHOD). */
    PickPointAndObject(...args) {
      throw new Error("Tr2InteriorScene.PickPointAndObject is not implemented in CarbonEngineJS.");
    }

    /** Carbon method PickObjectUV (MAP_METHOD_AND_WRAP). */
    PickObjectUV(...args) {
      throw new Error("Tr2InteriorScene.PickObjectUV is not implemented in CarbonEngineJS.");
    }

    /** Carbon method RebuildSceneData (MAP_METHOD_AND_WRAP). */
    RebuildSceneData(...args) {
      throw new Error("Tr2InteriorScene.RebuildSceneData is not implemented in CarbonEngineJS.");
    }

    /** Carbon method RemoveDynamic (MAP_METHOD_AND_WRAP). */
    RemoveDynamic(...args) {
      throw new Error("Tr2InteriorScene.RemoveDynamic is not implemented in CarbonEngineJS.");
    }

    /** Carbon method RemoveLightSource (MAP_METHOD_AND_WRAP). */
    RemoveLightSource(...args) {
      throw new Error("Tr2InteriorScene.RemoveLightSource is not implemented in CarbonEngineJS.");
    }

    /** Carbon method UpdateScene -> UpdateSceneFromScript (MAP_METHOD_AND_WRAP). */
    UpdateScene(...args) {
      throw new Error("Tr2InteriorScene.UpdateScene is not implemented in CarbonEngineJS.");
    }

    /** Carbon method SetupShadowMaps (MAP_METHOD_AND_WRAP). */
    SetupShadowMaps(...args) {
      throw new Error("Tr2InteriorScene.SetupShadowMaps is not implemented in CarbonEngineJS.");
    }
  }];
  VisualizeMethod = Object.freeze({
    VM_NONE: 0,
    VM_WHITE: 1,
    VM_OBJECT_NORMAL: 2,
    VM_TANGENT: 3,
    VM_BITANGENT: 4,
    VM_TEXCOORD0: 5,
    VM_TEXCOORD1: 6,
    VM_TEXELDENSITY0: 7,
    VM_NORMALMAP: 8,
    VM_DIFFUSEMAP: 9,
    VM_SPECULARMAP: 10,
    VM_OVERDRAW: 11,
    VM_EN_ONLY: 12,
    VM_DEPTH: 13,
    VM_ALL_LIGHTING: 14,
    VM_LIGHT_PRE_PASS_NORMALS: 15,
    VM_LIGHT_PRE_PASS_DEPTH: 16,
    VM_LIGHT_PRE_PASS_WORLD_POSITION: 17,
    VM_LIGHT_PRE_PASS_LIGHTING: 18,
    VM_LIGHT_PRE_PASS_LIGHT_OVERDRAW: 19,
    VM_LIGHT_PRE_PASS_DIFFUSE_LIGHTING: 20,
    VM_LIGHT_PRE_PASS_SPECULAR_LIGHTING: 21,
    VM_OCCLUSION: 22,
    VM_COUNT: 23
  });
  constructor() {
    super(_Tr2InteriorScene), _initClass();
  }
}();

export { _Tr2InteriorScene as Tr2InteriorScene };
//# sourceMappingURL=Tr2InteriorScene.js.map
