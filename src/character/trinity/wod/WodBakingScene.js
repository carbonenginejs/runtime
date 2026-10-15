import { ITr2Scene } from "../../../trinity/core/ITr2Scene.js";
// Source: trinity/trinity/Wod/WodBakingScene.h
// Source: trinity/trinity/Wod/WodBakingScene.cpp
// Source: trinity/trinity/Wod/WodBakingScene_Blue.cpp
// CarbonEngineJS maintained source.
import { meta, type, blue } from "#schema";

/**
 * Baking-scene record pairing a skinned avatar with a diagnostic visualization
 * mode. Native Carbon uses this scene to render the avatar through managed
 * skinned-object batches; CarbonEngineJS keeps the scene contract here and
 * leaves render-target realization to an engine adapter.
 */
@blue.define("WodBakingScene")
@blue.inherit(ITr2Scene)
@blue.interface(ITr2Scene)
export class WodBakingScene
{

  /** m_visualizeMethod (VisualizeMethod - enum VisualizeMethod) [READWRITE, ENUM, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @type.int32
  @type.enum("VisualizeMethod")
  visualizeMethod = 0;

  /** m_skinnedObject (Tr2SkinnedObjectPtr) [READWRITE] */
  @blue.readwrite
  @type.rootRef("Tr2SkinnedObject")
  Avatar = null;

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

  /**
   * Engine-owned native render pass for baking the selected avatar.
   *
   * Adapted: Requires a Tr2RenderContext, effect-state manager, constant buffers, and GPU
   * batch rendering owned by an engine adapter.
   */
  @blue.method
  @meta.notImplemented
  Render()
  {
    throw new Error("WodBakingScene.Render is engine-owned and not implemented in CarbonEngineJS.");
  }

  /**
   * Engine-owned diagnostic visualization hook.
   *
   * Adapted: Carbon leaves this hook empty; the JavaScript hook throws its explicit
   * unimplemented error instead.
   */
  @blue.method
  @meta.notImplemented
  RenderDebugInfo()
  {
    throw new Error("WodBakingScene.RenderDebugInfo is engine-owned and not implemented in CarbonEngineJS.");
  }

  /**
   * Native update hook that advances the owned skinned object before baking.
   *
   * Adapted: The native method calls PrePhysicsUpdate and PostPhysicsUpdate on the skinned
   * object; frame ownership stays with the outer runtime adapter.
   */
  @blue.method
  @meta.notImplemented
  Update()
  {
    throw new Error("WodBakingScene.Update is engine-owned and not implemented in CarbonEngineJS.");
  }

}
