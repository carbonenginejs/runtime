import { IRoot } from "../../../global/blueexposure/IRoot.js";
import { exposure as be } from "#be";
import { ITr2Scene } from "../../../trinity/core/ITr2Scene.js";
// Source: trinity/trinity/Wod/WodBakingScene.h
// Source: trinity/trinity/Wod/WodBakingScene.cpp
// Source: trinity/trinity/Wod/WodBakingScene_Blue.cpp
// CarbonEngineJS maintained source.
import { type, blue } from "#schema";
import { blueEnums } from "#blue/enums/CjsBlueEnumRegistry";

/** Visualizer methods of m_visualizeMethod: Carbon's VisualizeMethod (Tr2InteriorVisualization.h:9), shared with the interior scene. */
const VisualizeMethod = Object.freeze({
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

// VisualizerChooser (trinity/trinity/Wod/WodBakingScene_Blue.cpp:9) is file-local to Carbon's WodBakingScene and not registered there; its labels differ from the interior scene's.
blueEnums.Create("trinity.WodBakingScene.VisualizerChooser", VisualizeMethod, {
  chooser: [
    { name: "None", value: VisualizeMethod.VM_NONE, description: "No visualizer - use normal rendering" },
    { name: "White", value: VisualizeMethod.VM_WHITE, description: "Pixel shader returns white (useful to verify that something is output)" },
    { name: "Object normal", value: VisualizeMethod.VM_OBJECT_NORMAL, description: "Normal from vertices" },
    { name: "Tangent", value: VisualizeMethod.VM_TANGENT, description: "Tangent from vertices" },
    { name: "Bitangent", value: VisualizeMethod.VM_BITANGENT, description: "Bitangent from vertices" },
    { name: "TexCoord0", value: VisualizeMethod.VM_TEXCOORD0, description: "Texture coordinate 0" },
    { name: "TexCoord1", value: VisualizeMethod.VM_TEXCOORD1, description: "Texture coordinate 0" },
    { name: "TexelDensity0", value: VisualizeMethod.VM_TEXELDENSITY0, description: "Density of texels mapped through texture coordinate 0" },
    { name: "Normal map", value: VisualizeMethod.VM_NORMALMAP, description: "Tangent space normal from map" },
    { name: "Diffuse map", value: VisualizeMethod.VM_DIFFUSEMAP, description: "Diffuse map" },
    { name: "Specular map", value: VisualizeMethod.VM_SPECULARMAP, description: "Specular map" },
    { name: "Overdraw", value: VisualizeMethod.VM_OVERDRAW, description: "See the overdraw of the scene" },
    { name: "Enlighten only", value: VisualizeMethod.VM_EN_ONLY, description: "Enlighten only)" },
    { name: "Depth", value: VisualizeMethod.VM_DEPTH, description: "See the depth buffer of the scene" }
  ]
});

/**
 * Baking-scene record pairing a skinned avatar with a diagnostic visualization
 * mode. Native Carbon uses this scene to render the avatar through managed
 * skinned-object batches; CarbonEngineJS keeps the scene contract here and
 * leaves render-target realization to an engine adapter.
 */
@be.define("WodBakingScene")
@be.inherit(ITr2Scene)
@be.mapInterface(ITr2Scene)
export class WodBakingScene extends IRoot
{

  /**
   * m_visualizeMethod (VisualizeMethod - enum VisualizeMethod) [READWRITE, ENUM, NOTIFY]
   * Carbon: MAP_ATTRIBUTE_WITH_CHOOSER (trinity/trinity/Wod/WodBakingScene_Blue.cpp:65); chooser VisualizerChooser (trinity/trinity/Wod/WodBakingScene_Blue.cpp:9).
   */
  @be.mapAttributeWithChooser(be.READWRITE | be.ENUM | be.NOTIFY, "trinity.WodBakingScene.VisualizerChooser")
  @type.int32
  @type.enum("trinity.WodBakingScene.VisualizerChooser")
  visualizeMethod = 0;

  /** m_skinnedObject (Tr2SkinnedObjectPtr) [READWRITE] */
  @be.mapAttribute(be.READWRITE)
  @type.object.ref("Tr2SkinnedObject")
  Avatar = null;

  static VisualizeMethod = VisualizeMethod;

  /**
   * Engine-owned native render pass for baking the selected avatar.
   *
   * Adapted: Requires a Tr2RenderContext, effect-state manager, constant buffers, and GPU
   * batch rendering owned by an engine adapter.
   *
   * @notImplemented
   */

  Render()
  {
    throw new Error("WodBakingScene.Render is engine-owned and not implemented in CarbonEngineJS.");
  }

  /**
   * Engine-owned diagnostic visualization hook.
   *
   * Adapted: Carbon leaves this hook empty; the JavaScript hook throws its explicit
   * unimplemented error instead.
   *
   * @notImplemented
   */

  RenderDebugInfo()
  {
    throw new Error("WodBakingScene.RenderDebugInfo is engine-owned and not implemented in CarbonEngineJS.");
  }

  /**
   * Native update hook that advances the owned skinned object before baking.
   *
   * Adapted: The native method calls PrePhysicsUpdate and PostPhysicsUpdate on the skinned
   * object; frame ownership stays with the outer runtime adapter.
   *
   * @notImplemented
   */

  Update()
  {
    throw new Error("WodBakingScene.Update is engine-owned and not implemented in CarbonEngineJS.");
  }

}
