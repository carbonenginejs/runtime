// Source: trinity/trinity/Interior/Tr2InteriorScene.h
import { meta } from "#schema";
import { color } from "#math/color";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";

/**
 * Interior-scene state record for authored dynamics, lights, environment, fog,
 * sun, shadows, and diagnostics.
 */
@meta.define({ className: "Tr2InteriorScene", family: "interior" })
export class Tr2InteriorScene
{

  /** m_backgroundCubeMapPath (std::string) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  backgroundCubemapPath = "";

  /** m_visualizeMethod (VisualizeMethod - enum VisualizeMethod) [READWRITE, ENUM, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.int32
  @meta.type.enum("VisualizeMethod")
  visualizeMethod = 0;

  /** m_curveSets (PTriCurveSetVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("TriCurveSet")
  curveSets = [];

  /** m_renderShadows (bool) [READWRITE, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.boolean
  renderShadows = true;

  /** m_debugRenderShadowMaps (bool) [READWRITE, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.boolean
  debugRenderShadowMaps = false;

  /** m_shadowCount (int) [READWRITE, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.int32
  shadowCount = 4;

  /** m_minFogDistance (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  minFogDistance = 0;

  /** m_maxFogDistance (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  maxFogDistance = 1000;

  /** m_fogColor (Color) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  fogColor = vec4.fromValues(1, 1, 1, 1);

  /** m_dynamics (PITr2InteriorDynamicVector) [READ, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("ITr2InteriorDynamic")
  dynamics = [];

  /** m_lights (PITr2InteriorLightVector) [READ, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("ITr2InteriorLight")
  lights = [];

  /** m_maxFogAmount (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  maxFogAmount = 0;

  /** m_debugRenderer (Tr2DebugRendererPtr) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.objectRef("Tr2DebugRenderer")
  debugRenderer = null;

  /** m_visibilityResults (Tr2VisibilityResultsPtr) [READ] */
  @meta.blue.read
  @meta.type.objectRef("Tr2VisibilityResults")
  visibilityResults = null;

  /** m_ambientColor (Color) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  ambientColor = vec4.create();

  /** m_optimizeShadows (bool) [READWRITE, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.boolean
  optimizeShadows = true;

  /** m_shadowSize (int) [READWRITE, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.int32
  shadowSize = 1024;

  /** m_lightRenderTargets (PTr2RenderTargetVector) [READ] */
  @meta.blue.read
  @meta.type.list("Tr2RenderTarget")
  lightRenderTargets = [];

  /** m_sunDiffuseColor (Color) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  sunDiffuseColor = color.createLinear();

  /** m_sunDirection (Vector3) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  sunDirection = vec3.fromValues(0, 0, 1);

  /** m_sunSpecularColor (Color) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  sunSpecularColor = vec4.fromValues(0.8, 0.8, 0.8, 1);

  /** m_backgroundCubeMapRes (TriTextureResPtr) [READ] */
  @meta.blue.read
  @meta.type.objectRef("TriTextureRes")
  backgroundCubemapRes = null;

  /** m_backgroundEffect (Tr2EffectPtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2Effect")
  backgroundEffect = null;

  /** Carbon method PickObject -> PickObjectOnly (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @meta.blue.method
  @meta.notImplemented
  PickObject(...args)
  {
    throw new Error("Tr2InteriorScene.PickObject is not implemented in CarbonEngineJS.");
  }

  /** Carbon method AddDynamic (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.notImplemented
  AddDynamic(...args)
  {
    throw new Error("Tr2InteriorScene.AddDynamic is not implemented in CarbonEngineJS.");
  }

  /** Carbon method AddLightSource (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.notImplemented
  AddLightSource(...args)
  {
    throw new Error("Tr2InteriorScene.AddLightSource is not implemented in CarbonEngineJS.");
  }

  /** Carbon method Pick -> PyPick (MAP_METHOD). */
  @meta.blue.method
  @meta.notImplemented
  Pick(...args)
  {
    throw new Error("Tr2InteriorScene.Pick is not implemented in CarbonEngineJS.");
  }

  /** Carbon method PickObjectAndArea -> PyPickObjectAndArea (MAP_METHOD). */
  @meta.blue.method
  @meta.notImplemented
  PickObjectAndArea(...args)
  {
    throw new Error("Tr2InteriorScene.PickObjectAndArea is not implemented in CarbonEngineJS.");
  }

  /** Carbon method PickPointAndObject -> PyInteriorPickPointAndObject (MAP_METHOD). */
  @meta.blue.method
  @meta.notImplemented
  PickPointAndObject(...args)
  {
    throw new Error("Tr2InteriorScene.PickPointAndObject is not implemented in CarbonEngineJS.");
  }

  /** Carbon method PickObjectUV (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.notImplemented
  PickObjectUV(...args)
  {
    throw new Error("Tr2InteriorScene.PickObjectUV is not implemented in CarbonEngineJS.");
  }

  /** Carbon method RebuildSceneData (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.notImplemented
  RebuildSceneData(...args)
  {
    throw new Error("Tr2InteriorScene.RebuildSceneData is not implemented in CarbonEngineJS.");
  }

  /** Carbon method RemoveDynamic (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.notImplemented
  RemoveDynamic(...args)
  {
    throw new Error("Tr2InteriorScene.RemoveDynamic is not implemented in CarbonEngineJS.");
  }

  /** Carbon method RemoveLightSource (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.notImplemented
  RemoveLightSource(...args)
  {
    throw new Error("Tr2InteriorScene.RemoveLightSource is not implemented in CarbonEngineJS.");
  }

  /** Carbon method UpdateScene -> UpdateSceneFromScript (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.notImplemented
  UpdateScene(...args)
  {
    throw new Error("Tr2InteriorScene.UpdateScene is not implemented in CarbonEngineJS.");
  }

  /** Carbon method SetupShadowMaps (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.notImplemented
  SetupShadowMaps(...args)
  {
    throw new Error("Tr2InteriorScene.SetupShadowMaps is not implemented in CarbonEngineJS.");
  }

  static VisualizeMethod = Object.freeze({
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
    VM_COUNT: 23,
  });

}
