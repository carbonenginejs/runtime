import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { PixelFormat } from '@carbonenginejs/runtime-utils/render-context';

let _initProto, _initClass, _init_aoQuality, _init_extra_aoQuality, _init_antiAliasingQuality, _init_extra_antiAliasingQuality, _init_visualizeMethod, _init_extra_visualizeMethod, _init_postProcessingQuality, _init_extra_postProcessingQuality, _init_shadowQuality, _init_extra_shadowQuality, _init_customStencilFormat, _init_extra_customStencilFormat, _init_internalPixelFormat, _init_extra_internalPixelFormat, _init_volumetricQuality, _init_extra_volumetricQuality, _init_scene, _init_extra_scene, _init_name, _init_extra_name, _init_enableUpscaling, _init_extra_enableUpscaling, _init_projection, _init_extra_projection, _init_camera, _init_extra_camera, _init_view, _init_extra_view, _init_clearColor, _init_extra_clearColor, _init_distortionEffect, _init_extra_distortionEffect, _init_enableDistortion, _init_extra_enableDistortion, _init_reflectionCorrectionEnabled, _init_extra_reflectionCorrectionEnabled, _init_forceOpaqueBuffer, _init_extra_forceOpaqueBuffer, _init_forceNormalMap, _init_extra_forceNormalMap, _init_forceVelocityMap, _init_extra_forceVelocityMap, _init_fpsRenderer, _init_extra_fpsRenderer, _init_mainPassRenderingEnabled, _init_extra_mainPassRenderingEnabled, _init_toolsScenes, _init_extra_toolsScenes, _init_depthPassTechnique, _init_extra_depthPassTechnique, _init_postProcess, _init_extra_postProcess, _init_showFPS, _init_extra_showFPS, _init_sceneOverlay, _init_extra_sceneOverlay, _init_background, _init_extra_background, _init_SSAO, _init_extra_SSAO, _init_enableRendering, _init_extra_enableRendering;

/** EveSpaceSceneRenderDriver (eve/scene) - generated from schema shapeHash 9eaa96eb.... */
let _EveSpaceSceneRenderD;
new class extends _identity {
  static [class EveSpaceSceneRenderDriver extends CjsModel {
    static {
      ({
        e: [_init_aoQuality, _init_extra_aoQuality, _init_antiAliasingQuality, _init_extra_antiAliasingQuality, _init_visualizeMethod, _init_extra_visualizeMethod, _init_postProcessingQuality, _init_extra_postProcessingQuality, _init_shadowQuality, _init_extra_shadowQuality, _init_customStencilFormat, _init_extra_customStencilFormat, _init_internalPixelFormat, _init_extra_internalPixelFormat, _init_volumetricQuality, _init_extra_volumetricQuality, _init_scene, _init_extra_scene, _init_name, _init_extra_name, _init_enableUpscaling, _init_extra_enableUpscaling, _init_projection, _init_extra_projection, _init_camera, _init_extra_camera, _init_view, _init_extra_view, _init_clearColor, _init_extra_clearColor, _init_distortionEffect, _init_extra_distortionEffect, _init_enableDistortion, _init_extra_enableDistortion, _init_reflectionCorrectionEnabled, _init_extra_reflectionCorrectionEnabled, _init_forceOpaqueBuffer, _init_extra_forceOpaqueBuffer, _init_forceNormalMap, _init_extra_forceNormalMap, _init_forceVelocityMap, _init_extra_forceVelocityMap, _init_fpsRenderer, _init_extra_fpsRenderer, _init_mainPassRenderingEnabled, _init_extra_mainPassRenderingEnabled, _init_toolsScenes, _init_extra_toolsScenes, _init_depthPassTechnique, _init_extra_depthPassTechnique, _init_postProcess, _init_extra_postProcess, _init_showFPS, _init_extra_showFPS, _init_sceneOverlay, _init_extra_sceneOverlay, _init_background, _init_extra_background, _init_SSAO, _init_extra_SSAO, _init_enableRendering, _init_extra_enableRendering, _initProto],
        c: [_EveSpaceSceneRenderD, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveSpaceSceneRenderDriver",
        family: "eve/scene"
      })], [[[io, io.readwrite, type, type.int32, void 0, type.enum("AmbientOcclusionQuality")], 16, "aoQuality"], [[io, io.readwrite, type, type.int32, void 0, type.enum("AntiAliasingQuality")], 16, "antiAliasingQuality"], [[io, io.readwrite, type, type.int32, void 0, type.enum("EveVisualizeMethod")], 16, "visualizeMethod"], [[io, io.readwrite, type, type.int32, void 0, type.enum("Quality")], 16, "postProcessingQuality"], [[io, io.readwrite, type, type.int32, void 0, type.enum("ShadowQuality")], 16, "shadowQuality"], [[io, io.readwrite, type, type.int32, void 0, type.enum("PixelFormat")], 16, "customStencilFormat"], [[io, io.readwrite, type, type.int32, void 0, type.enum("PixelFormat")], 16, "internalPixelFormat"], [[io, io.readwrite, type, type.int32, void 0, type.enum("Tr2VolumerticQuality")], 16, "volumetricQuality"], [[io, io.persistOnly, void 0, type.model("EveSpaceScene")], 16, "scene"], [[io, io.readwrite, type, type.string], 16, "name"], [[io, io.readwrite, type, type.boolean], 16, "enableUpscaling"], [[io, io.readwrite, void 0, type.objectRef("TriProjection")], 16, "projection"], [[io, io.readwrite, void 0, type.objectRef("EveCamera")], 16, "camera"], [[io, io.readwrite, void 0, type.objectRef("TriView")], 16, "view"], [[io, io.readwrite, void 0, type.rawStruct("Settings")], 16, "clearColor"], [[io, io.read, void 0, type.objectRef("Tr2Effect")], 16, "distortionEffect"], [[io, io.readwrite, type, type.boolean], 16, "enableDistortion"], [[io, io.readwrite, type, type.boolean], 16, "reflectionCorrectionEnabled"], [[io, io.readwrite, type, type.boolean], 16, "forceOpaqueBuffer"], [[io, io.readwrite, type, type.boolean], 16, "forceNormalMap"], [[io, io.readwrite, type, type.boolean], 16, "forceVelocityMap"], [[io, io.read, void 0, type.objectRef("TriStepRenderFps")], 16, "fpsRenderer"], [[io, io.persist, type, type.boolean], 16, "mainPassRenderingEnabled"], [[io, io.read, void 0, type.list("ITr2Scene")], 16, "toolsScenes"], [[io, io.readwrite, type, type.string], 16, "depthPassTechnique"], [[io, io.read, void 0, type.objectRef("Tr2PostProcessRenderer")], 16, "postProcess"], [[io, io.readwrite, type, type.boolean], 16, "showFPS"], [[io, io.readwrite, void 0, type.objectRef("ITr2RenderNode")], 16, "sceneOverlay"], [[io, io.readwrite, void 0, type.objectRef("ITr2RenderNode")], 16, "background"], [[io, io.persist, void 0, type.model("Tr2SSAO")], 16, "SSAO"], [[io, io.readwrite, type, type.boolean], 16, "enableRendering"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "GetAllTempTextures"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_enableRendering(this);
    }
    /** m_settings.aoQuality (AmbientOcclusionQuality - enum AmbientOcclusionQuality) [READWRITE, ENUM] */
    aoQuality = (_initProto(this), _init_aoQuality(this, 0));

    /** m_settings.antiAliasingQuality (AntiAliasingQuality - enum AntiAliasingQuality) [READWRITE, ENUM] */
    antiAliasingQuality = (_init_extra_aoQuality(this), _init_antiAliasingQuality(this, 0));

    /** m_settings.visualizeMethod (EveSpaceScene::EveVisualizeMethod - enum EveVisualizeMethod) [READWRITE, ENUM] */
    visualizeMethod = (_init_extra_antiAliasingQuality(this), _init_visualizeMethod(this, 0));

    /** m_settings.postProcessingQuality (PostProcess::Quality - enum Quality) [READWRITE, ENUM] */
    postProcessingQuality = (_init_extra_visualizeMethod(this), _init_postProcessingQuality(this, 0));

    /** m_settings.shadowQuality (ShadowQuality - enum ShadowQuality) [READWRITE, ENUM] */
    shadowQuality = (_init_extra_postProcessingQuality(this), _init_shadowQuality(this, 0));

    /** m_customStencilFormat (ImageIO::PixelFormat - enum PixelFormat) [READWRITE, ENUM] */
    customStencilFormat = (_init_extra_shadowQuality(this), _init_customStencilFormat(this, 0));

    /** m_internalPixelFormat (ImageIO::PixelFormat - enum PixelFormat) [READWRITE, ENUM] */
    internalPixelFormat = (_init_extra_customStencilFormat(this), _init_internalPixelFormat(this, 10));

    /** m_settings.volumetricQuality (Tr2VolumerticQuality - enum Tr2VolumerticQuality) [READWRITE, ENUM] */
    volumetricQuality = (_init_extra_internalPixelFormat(this), _init_volumetricQuality(this, 0));

    /** m_scene (EveSpaceScenePtr) [PERSISTONLY] */
    scene = (_init_extra_volumetricQuality(this), _init_scene(this, null));

    /** m_name (std::string) [READWRITE] */
    name = (_init_extra_scene(this), _init_name(this, ""));

    /** m_settings.enableUpscaling (bool) [READWRITE] */
    enableUpscaling = (_init_extra_name(this), _init_enableUpscaling(this, false));

    /** m_projection (TriProjectionPtr) [READWRITE] */
    projection = (_init_extra_enableUpscaling(this), _init_projection(this, null));

    /** m_camera (EveCameraPtr) [READWRITE] */
    camera = (_init_extra_projection(this), _init_camera(this, null));

    /** m_view (TriViewPtr) [READWRITE] */
    view = (_init_extra_camera(this), _init_view(this, null));

    /** m_settings.clearColor (Settings) [READWRITE] */
    clearColor = (_init_extra_view(this), _init_clearColor(this, null));

    /** m_distortionEffect (Tr2EffectPtr) [READ] */
    distortionEffect = (_init_extra_clearColor(this), _init_distortionEffect(this, null));

    /** m_settings.enableDistortion (bool) [READWRITE] */
    enableDistortion = (_init_extra_distortionEffect(this), _init_enableDistortion(this, false));

    /** m_reflectionCorrectionEnabled (bool) [READWRITE] */
    reflectionCorrectionEnabled = (_init_extra_enableDistortion(this), _init_reflectionCorrectionEnabled(this, true));

    /** m_settings.forceOpaqueBuffer (bool) [READWRITE] */
    forceOpaqueBuffer = (_init_extra_reflectionCorrectionEnabled(this), _init_forceOpaqueBuffer(this, false));

    /** m_settings.forceNormalMap (bool) [READWRITE] */
    forceNormalMap = (_init_extra_forceOpaqueBuffer(this), _init_forceNormalMap(this, false));

    /** m_settings.forceVelocityMap (bool) [READWRITE] */
    forceVelocityMap = (_init_extra_forceNormalMap(this), _init_forceVelocityMap(this, false));

    /** m_fpsRenderer (TriStepRenderFpsPtr) [READ] */
    fpsRenderer = (_init_extra_forceVelocityMap(this), _init_fpsRenderer(this, null));

    /** m_mainPassRenderingEnabled (bool) [READWRITE, PERSIST] */
    mainPassRenderingEnabled = (_init_extra_fpsRenderer(this), _init_mainPassRenderingEnabled(this, true));

    /** m_toolsScenes (PITr2SceneVector) [READ] */
    toolsScenes = (_init_extra_mainPassRenderingEnabled(this), _init_toolsScenes(this, []));

    /** m_depthPassTechnique (unknown) [READWRITE] */
    depthPassTechnique = (_init_extra_toolsScenes(this), _init_depthPassTechnique(this, "Depth"));

    /** m_postProcess (Tr2PostProcessRendererPtr) [READ] */
    postProcess = (_init_extra_depthPassTechnique(this), _init_postProcess(this, null));

    /** m_settings.showFPS (bool) [READWRITE] */
    showFPS = (_init_extra_postProcess(this), _init_showFPS(this, false));

    /** m_sceneOverlay (ITr2RenderNodePtr) [READWRITE] */
    sceneOverlay = (_init_extra_showFPS(this), _init_sceneOverlay(this, null));

    /** m_background (ITr2RenderNodePtr) [READWRITE] */
    background = (_init_extra_sceneOverlay(this), _init_background(this, null));

    /** m_ssao (Tr2SSAOPtr) [READWRITE, PERSIST] */
    SSAO = (_init_extra_background(this), _init_SSAO(this, null));

    /** m_enableRendering (bool) [READWRITE] */
    enableRendering = (_init_extra_SSAO(this), _init_enableRendering(this, true));

    /** Carbon method GetAllTempTextures (MAP_METHOD_AND_WRAP). */
    GetAllTempTextures(...args) {
      throw new Error("EveSpaceSceneRenderDriver.GetAllTempTextures is not implemented in CarbonEngineJS.");
    }
  }];
  AmbientOcclusionQuality = Object.freeze({
    Disabled: 0,
    Low: 1,
    Medium: 2,
    High: 3
  });
  AntiAliasingQuality = Object.freeze({
    Disabled: 0,
    Low: 1,
    Medium: 2,
    High: 3
  });
  EveVisualizeMethod = Object.freeze({
    VM_NONE: 0,
    VM_TEXCOORD0: 1,
    VM_TEXCOORD1: 2,
    VM_WHITE: 3,
    VM_OVERDRAW: 4,
    VW_WIREFRAME: 5,
    VW_LIGHT_COUNT: 6,
    VM_COUNT: 7
  });
  Quality = Object.freeze({
    LOW: 0,
    MEDIUM: 1,
    HIGH: 2,
    COUNT: 3
  });
  ShadowQuality = Object.freeze({
    SHADOW_DISABLED: 0,
    SHADOW_LOW: 1,
    SHADOW_HIGH: 2,
    SHADOW_RAYTRACED: 3
  });
  Tr2VolumerticQuality = Object.freeze({
    Low: 0,
    Medium: 1,
    High: 2,
    Ultra: 3
  });
  PixelFormat = PixelFormat;
  constructor() {
    super(_EveSpaceSceneRenderD), _initClass();
  }
}();

export { _EveSpaceSceneRenderD as EveSpaceSceneRenderDriver };
//# sourceMappingURL=EveSpaceSceneRenderDriver.js.map
