// Source: trinity/trinity/Eve/SpaceObject/Children/Behaviors/BehaviorGroupBooster.h
//   trinity/trinity/Eve/SpaceObject/Children/Behaviors/BehaviorGroupBooster.cpp
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { carbonPerlin1D } from "#math/noise";
import { Tr2Effect } from "../../../shader/Tr2Effect.js";

// Module scratch for the light registration path.
const LIGHT_COLOR = vec4.create();

/** A drone-group component that builds and drives the group's shared booster and ambient or halo flare effects and contributes their point light to the scene. */
@type.define({ className: "BehaviorGroupBooster", family: "eve/child/behaviors" })
export class BehaviorGroupBooster extends CjsModel
{

  /** m_display (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  display = true;

  /** m_boosterOffset (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  boosterOffset = vec3.create();

  /** m_atlasIndex0 (uint32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.uint32
  atlasIndex0 = 0;

  /** m_atlasIndex1 (uint32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.uint32
  atlasIndex1 = 0;

  /** m_boosterEffect (Tr2EffectPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("Tr2Effect")
  boosterEffect = null;

  /** m_flareCount (unsigned int) [READ] */
  @io.read
  @type.uint32
  flareCount = 0;

  /** m_displayAmbientFlare (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  displayAmbientFlare = true;

  /** m_displayBoosters (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  displayBoosters = true;

  /** m_displayHazeFlare (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  displayHazeFlare = true;

  /** m_ambientFlareBrightness (float) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.float32
  ambientFlareBrightness = 0;

  /** m_haloFlareBrightness (float) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.float32
  haloFlareBrightness = 0;

  /** m_ambientFlareColor (Color) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.color
  ambientFlareColor = vec4.fromValues(1, 1, 1, 1);

  /** m_haloFlareColor (Color) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.color
  haloFlareColor = vec4.fromValues(1, 1, 1, 1);

  /** m_lightColor (Color) [READWRITE, PERSIST] */
  @io.persist
  @type.color
  lightColor = vec4.fromValues(1, 1, 1, 1);

  /** m_ambientFlareEffect (Tr2EffectPtr) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.model("Tr2Effect")
  ambientFlareEffect = null;

  /** m_haloFlareEffect (Tr2EffectPtr) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.model("Tr2Effect")
  haloFlareEffect = null;

  /** m_ambientFlareNoiseAmplitude (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  ambientFlareNoiseAmplitude = 0.2;

  /** m_haloFlareNoiseAmplitude (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  haloFlareNoiseAmplitude = 0.2;

  /** m_ambientFlareNoiseOctaves (uint32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.uint32
  ambientFlareNoiseOctaves = 1;

  /** m_haloFlareNoiseOctaves (uint32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.uint32
  haloFlareNoiseOctaves = 1;

  /** m_ambientFlareNoiseSpeed (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  ambientFlareNoiseSpeed = 1;

  /** m_haloFlareNoiseSpeed (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  haloFlareNoiseSpeed = 1;

  /** m_ambientFlareOffset (Vector3) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.vec3
  ambientFlareOffset = vec3.create();

  /** m_haloFlareOffset (Vector3) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.vec3
  haloFlareOffset = vec3.create();

  /** m_lightRadius (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  lightRadius = 3.5;

  /** m_ambientFlareScale (Vector3) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.vec3
  ambientFlareScale = vec3.fromValues(1, 1, 1);

  /** m_haloFlareScale (Vector3) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.vec3
  haloFlareScale = vec3.fromValues(1, 1, 1);

  /**
   * Creates the hardcoded booster and flare effects when absent (Carbon
   * InitializeEffects, cpp:149-166). Carbon also registers the flare effects
   * with the Tr2QuadRenderer singleton - a quad-renderer/GPU seam that the
   * JS port omits.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Effect graph construction is ported; Tr2QuadRenderer::Instance() flare registration and the quad buffers are renderer-owned seams.")
  InitializeEffects()
  {
    if (this.boosterEffect === null)
    {
      this.boosterEffect = BehaviorGroupBooster.#CreateBoosterEffect("BOOSTER_LOD_HIGH");
    }
    if (this.ambientFlareEffect === null)
    {
      this.ambientFlareEffect = BehaviorGroupBooster.#CreateFlareEffect();
    }
    if (this.haloFlareEffect === null)
    {
      this.haloFlareEffect = BehaviorGroupBooster.#CreateFlareEffect();
    }
  }

  /** Carbon BehaviorGroupBooster::GetDisplay (cpp:254-257). */
  @carbon.method
  @impl.implemented
  GetDisplay()
  {
    return this.display;
  }

  /** Carbon BehaviorGroupBooster::GetLightSize (cpp:259-266). */
  @carbon.method
  @impl.implemented
  GetLightSize()
  {
    if (this.display)
    {
      return this.lightRadius;
    }
    return 0;
  }

  /** Carbon BehaviorGroupBooster::GetOffset (cpp:268-271). */
  @carbon.method
  @impl.implemented
  GetOffset()
  {
    return this.boosterOffset;
  }

  /** Carbon BehaviorGroupBooster::GetAtlasIndex0 (cpp:273-276). */
  @carbon.method
  @impl.implemented
  GetAtlasIndex0()
  {
    return this.atlasIndex0;
  }

  /** Carbon BehaviorGroupBooster::GetAtlasIndex1 (cpp:278-281). */
  @carbon.method
  @impl.implemented
  GetAtlasIndex1()
  {
    return this.atlasIndex1;
  }

  /** Carbon BehaviorGroupBooster::GetEffect (cpp:365-368). */
  @carbon.method
  @impl.implemented
  GetEffect()
  {
    return this.boosterEffect;
  }

  /**
   * Tracks the flare instance count (Carbon RebuildFlareBuffer, cpp:359-363).
   * The Quad lists Carbon resizes alongside it are GPU quad packing, kept
   * with the quad-renderer seam.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("The flare Quad lists are GPU quad packing owned by the quad-renderer seam; only the CPU count is tracked.")
  RebuildFlareBuffer(count)
  {
    this.flareCount = Math.max(0, Number(count) | 0);
  }

  /**
   * Registers one booster point light with the duck-typed light manager
   * (Carbon AddLight, cpp:435-445). Carbon ignores the parentTransform
   * parameter; the JS port keeps the signature.
   * @param {Object} lightManager
   * @param {Float32Array} position - light position (xyz read)
   * @param {Number} radiusModifier
   * @param {Number} agentIndex - phase-offsets the noise
   * @param {Float32Array} _parentTransform - unused (as Carbon)
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon's frame clock maps to Date.now seconds for the noise phase; the light registers through the duck-typed manager (AddPointLight), never a GPU structure.")
  AddLight(lightManager, position, radiusModifier, agentIndex, _parentTransform)
  {
    vec4.copy(LIGHT_COLOR, this.lightColor);
    if (this.ambientFlareNoiseAmplitude !== 0)
    {
      const time = Date.now() / 1000 + agentIndex * 0.01;
      const noise = carbonPerlin1D(time * this.ambientFlareNoiseSpeed, 2, 2, this.ambientFlareNoiseOctaves);
      vec4.scale(LIGHT_COLOR, LIGHT_COLOR, ((noise + 1) / 2) * this.ambientFlareNoiseAmplitude);
    }

    lightManager?.AddPointLight?.(position, radiusModifier * this.lightRadius, LIGHT_COLOR);
  }

  /** Carbon method Initialize (cpp:119-147) - flare quad setup and the
   * booster instanced vertex declaration; renderer-owned in JS. */
  @carbon.method
  @impl.noop
  Initialize()
  {
    return true;
  }

  /** Carbon method AddFlare (cpp:447-515) - fills the GPU flare quad lists. */
  @carbon.method
  @impl.notImplemented
  AddFlare(..._args)
  {
    throw new Error("BehaviorGroupBooster.AddFlare is not implemented in CarbonEngineJS (GPU flare-quad fill).");
  }

  /** Carbon method GetBatch (cpp:375-400) - builds the instanced render batch. */
  @carbon.method
  @impl.notImplemented
  GetBatch(..._args)
  {
    throw new Error("BehaviorGroupBooster.GetBatch is not implemented in CarbonEngineJS (render-batch construction).");
  }

  /** Carbon method CreateBuffer (cpp:351-357) - procedural GPU vertex buffer. */
  @carbon.method
  @impl.noop
  CreateBuffer()
  {
  }

  /** Carbon method RegisterWithQuadRenderer (cpp:402-415) - quad renderer
   * effect registration seam. */
  @carbon.method
  @impl.noop
  RegisterWithQuadRenderer(_quadRenderer)
  {
  }

  /** Carbon method AddQuadsToQuadRenderer (cpp:417-433) - quad renderer
   * submission seam. */
  @carbon.method
  @impl.noop
  AddQuadsToQuadRenderer(_frustum, _quadRenderer)
  {
  }

  // Builds the hardcoded volumetric drone booster effect (Carbon
  // CreateBoosterEffect + SetupBoosterEffect, cpp:284-336).
  /**
   * Builds and configures the drone booster effect, including its noise, colour and texture parameters.
   */
  static #CreateBoosterEffect(lodOption)
  {
    const effect = new Tr2Effect();
    effect.StartUpdate();

    effect.SetEffectPathName("res:/Graphics/Effect/Managed/Space/Booster/DroneBoosterVolumetric.fx");
    effect.SetOption("BOOSTER_LOD", lodOption);

    effect.AddParameterFloat("NoiseSpeed0", 6);
    effect.AddParameterVector4("NoiseAmplitudeStart0", vec4.fromValues(-0.05, -0.05, -0.05, -0.05));
    effect.AddParameterVector4("NoiseAmplitudeEnd0", vec4.fromValues(0.1, 0.1, 0.1, 0.2));
    effect.AddParameterVector4("NoiseFrequency0", vec4.fromValues(0.1, 0.1, 0, 0.1));
    effect.AddParameterColor("Color0", vec4.fromValues(10, 13, 15, 0));
    effect.AddParameterFloat("NoiseSpeed1", 6);
    effect.AddParameterVector4("NoiseAmplitudeStart1", vec4.fromValues(-0.05, -0.05, -0.05, -0.05));
    effect.AddParameterVector4("NoiseAmplitudeEnd1", vec4.fromValues(0.14, 0.7, 0.14, 0.14));
    effect.AddParameterColor("Color1", vec4.fromValues(15, 13, 13, 0));

    // omitted warping, since these drones don't warp yet (Carbon comment);
    // NoiseFrequency1 is likewise absent in Carbon's setup.

    effect.AddParameterVector4("ShapeAtlasSize", vec4.fromValues(256, 8, 0, 0));
    effect.AddParameterVector4("BoosterScale", vec4.fromValues(1, 1, 1, 1));

    effect.AddResourceTexture2D("ShapeMap", "res:/dx9/model/booster/shape01.dds");
    effect.AddResourceTexture2D("GradientMap0", "res:/dx9/model/booster/gradient01.dds");
    effect.AddResourceTexture2D("GradientMap1", "res:/dx9/model/booster/gradient02.dds");
    effect.AddResourceTexture2D("NoiseMap", "res:/Texture/Global/noise32cube_volume.dds");

    effect.EndUpdate();
    return effect;
  }

  // Builds the shared flare quad effect (Carbon CreateFlareEffect, cpp:338-349).
  /**
   * Builds the shared flare-quad effect used by both the ambient and halo flares.
   */
  static #CreateFlareEffect()
  {
    const effect = new Tr2Effect();
    effect.StartUpdate();

    effect.SetEffectPathName("res:/Graphics/Effect/Managed/Space/SpecialFX/FlareQuad.fx");

    effect.EndUpdate();
    return effect;
  }

}
