import { IsMatch, INotify, blue, TimeAsDouble } from "#blue";
import { IInitialize } from "../../../../global/blue/IInitialize.js";
// Source: trinity/trinity/Eve/SpaceObject/Children/Behaviors/BehaviorGroupBooster.h
//   trinity/trinity/Eve/SpaceObject/Children/Behaviors/BehaviorGroupBooster.cpp
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta } from "#schema";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { quat } from "#math/quat";
import { vec2 } from "#math/vec2";
import { mat4 } from "#math/mat4";
import { TriBatchType, TR2SHADERMODEL } from "#consts/graphics";
import { Tr2Renderer } from "../../../core/Tr2Renderer.js";
import { Tr2RenderBatch } from "../../../core/batch/TriRenderBatch/index.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../../core/context/Tr2RenderContext.js";
import { Tr2VertexDefinition } from "../../../core/vertex/Tr2VertexDefinition/index.js";
import { Tr2EffectStateManager } from "../../../shader/Tr2EffectStateManager.js";
import { MakeBoosterBoxBuffer } from "../../attachment/booster/boosterUtilities.js";
import { EveChildQuad } from "../EveChildQuad.js";
import { EveChildModifierHalo } from "../modifiers/EveChildModifierHalo.js";
import { packQuadInstanceData, QUAD_INSTANCE_SIZE } from "../packQuadInstanceData.js";
import { carbonPerlin1D } from "#math/noise";
import { Tr2Effect } from "../../../shader/Tr2Effect.js";

// Module scratch for the light registration path.
const LIGHT_COLOR = vec4.create();
const HALO_TRANSFORM = mat4.create();
const HALO_OFFSET = vec3.create();
const GROUP_SCALE = vec3.create();
const HALO_ROTATION = quat.fromValues(0, 1, 0, 0);

/** A drone-group component that builds and drives the group's shared booster and ambient or halo flare effects and contributes their point light to the scene. */
@meta.define({ className: "BehaviorGroupBooster", family: "eve/child/behaviors" })
@meta.blue.inherit(IInitialize, INotify)
@meta.blue.mapInterface(IInitialize, INotify)
export class BehaviorGroupBooster
{

  _vertexBuffer = MakeBoosterBoxBuffer();

  _vertexDeclarationHandle = Tr2EffectStateManager.Unknown;

  _haloModifier = new EveChildModifierHalo();

  _haloFlare = null;

  _ambientFlare = null;

  _haloFlares = [];

  _ambientFlares = [];

  _quadBytes = new Uint8Array(QUAD_INSTANCE_SIZE);

  /** m_display (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  display = true;

  /** m_boosterOffset (Vector3) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  boosterOffset = vec3.create();

  /** m_atlasIndex0 (uint32_t) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.uint32
  atlasIndex0 = 0;

  /** m_atlasIndex1 (uint32_t) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.uint32
  atlasIndex1 = 0;

  /** m_boosterEffect (Tr2EffectPtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2Effect")
  boosterEffect = null;

  /** m_flareCount (unsigned int) [READ] */
  @meta.blue.read
  @meta.type.uint32
  flareCount = 0;

  /** m_displayAmbientFlare (bool) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.boolean
  displayAmbientFlare = true;

  /** m_displayBoosters (bool) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.boolean
  displayBoosters = true;

  /** m_displayHazeFlare (bool) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.boolean
  displayHazeFlare = true;

  /** m_ambientFlareBrightness (float) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  ambientFlareBrightness = 0;

  /** m_haloFlareBrightness (float) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  haloFlareBrightness = 0;

  /** m_ambientFlareColor (Color) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  ambientFlareColor = vec4.fromValues(1, 1, 1, 1);

  /** m_haloFlareColor (Color) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  haloFlareColor = vec4.fromValues(1, 1, 1, 1);

  /** m_lightColor (Color) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  lightColor = vec4.fromValues(1, 1, 1, 1);

  /** m_ambientFlareEffect (Tr2EffectPtr) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2Effect")
  ambientFlareEffect = null;

  /** m_haloFlareEffect (Tr2EffectPtr) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2Effect")
  haloFlareEffect = null;

  /** m_ambientFlareNoiseAmplitude (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  ambientFlareNoiseAmplitude = 0.2;

  /** m_haloFlareNoiseAmplitude (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  haloFlareNoiseAmplitude = 0.2;

  /** m_ambientFlareNoiseOctaves (uint32_t) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.uint32
  ambientFlareNoiseOctaves = 1;

  /** m_haloFlareNoiseOctaves (uint32_t) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.uint32
  haloFlareNoiseOctaves = 1;

  /** m_ambientFlareNoiseSpeed (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  ambientFlareNoiseSpeed = 1;

  /** m_haloFlareNoiseSpeed (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  haloFlareNoiseSpeed = 1;

  /** m_ambientFlareOffset (Vector3) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  ambientFlareOffset = vec3.create();

  /** m_haloFlareOffset (Vector3) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  haloFlareOffset = vec3.create();

  /** m_lightRadius (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  lightRadius = 3.5;

  /** m_ambientFlareScale (Vector3) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  ambientFlareScale = vec3.fromValues(1, 1, 1);

  /** m_haloFlareScale (Vector3) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  haloFlareScale = vec3.fromValues(1, 1, 1);

  /**
   * Creates the hardcoded booster and flare effects when absent (Carbon
   * InitializeEffects, cpp:149-166). The scene registers their flare buckets
   * through RegisterWithQuadRenderer.
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Flare registration is performed by the existing scene-owned quad renderer rather than a native singleton.")
  InitializeEffects()
  {
    if (this.boosterEffect === null)
    {
      this.boosterEffect = BehaviorGroupBooster._CreateBoosterEffect("BOOSTER_LOD_HIGH");
    }
    if (this.ambientFlareEffect === null)
    {
      this.ambientFlareEffect = BehaviorGroupBooster._CreateFlareEffect();
    }
    if (this.haloFlareEffect === null)
    {
      this.haloFlareEffect = BehaviorGroupBooster._CreateFlareEffect();
    }
    this.SetupQuads();
  }

  /** Carbon BehaviorGroupBooster::GetDisplay (cpp:254-257). */
  @meta.blue.method
  @meta.implemented
  GetDisplay()
  {
    return this.display;
  }

  /** Carbon BehaviorGroupBooster::GetLightSize (cpp:259-266). */
  @meta.blue.method
  @meta.implemented
  GetLightSize()
  {
    if (this.display)
    {
      return this.lightRadius;
    }
    return 0;
  }

  /** Carbon BehaviorGroupBooster::GetOffset (cpp:268-271). */
  @meta.blue.method
  @meta.implemented
  GetOffset()
  {
    return this.boosterOffset;
  }

  /** Carbon BehaviorGroupBooster::GetAtlasIndex0 (cpp:273-276). */
  @meta.blue.method
  @meta.implemented
  GetAtlasIndex0()
  {
    return this.atlasIndex0;
  }

  /** Carbon BehaviorGroupBooster::GetAtlasIndex1 (cpp:278-281). */
  @meta.blue.method
  @meta.implemented
  GetAtlasIndex1()
  {
    return this.atlasIndex1;
  }

  /** Carbon BehaviorGroupBooster::GetEffect (cpp:365-368). */
  @meta.blue.method
  @meta.implemented
  GetEffect()
  {
    return this.boosterEffect;
  }

  /** Resizes the authored flare lists after an agent-count change. */
  @meta.blue.method
  @meta.implemented
  RebuildFlareBuffer(count)
  {
    this.flareCount = Math.max(0, Number(count) | 0);
    this.AdjustFlareLists();
  }

  /**
   * Carbon SetupQuads updates the templates, retaining already-sized flare
   * records as native vector::resize does. JavaScript stores explicit row fields.
   */
  @meta.blue.method
  @meta.adapted
  SetupQuads()
  {
    if (!this.ambientFlareEffect && !this.haloFlareEffect) return;
    for (const [name, color, scale, offset] of [
      ["_ambientFlare", this.ambientFlareColor, [1, 1, 1], this.ambientFlareOffset],
      ["_haloFlare", this.haloFlareColor, this.haloFlareScale, [0, 0, 0]]
    ])
    {
      this[name] = {
        parentTransform0: vec4.fromValues(1, 0, 0, 0), // alloc: persistent native Quad template.
        parentTransform1: vec4.fromValues(0, 1, 0, 0), // alloc: persistent native Quad template.
        parentTransform2: vec4.fromValues(0, 0, 1, 0), // alloc: persistent native Quad template.
        localTransform0: vec4.fromValues(scale[0], 0, 0, offset[0]), // alloc: persistent native Quad template.
        localTransform1: vec4.fromValues(0, scale[1], 0, offset[1]), // alloc: persistent native Quad template.
        localTransform2: vec4.fromValues(0, 0, scale[2], offset[2]), // alloc: persistent native Quad template.
        color: vec4.clone(color), // alloc: persistent native Quad template.
        brightness: vec2.create() // alloc: persistent native Quad template.
      };
    }
    this.AdjustFlareLists();
  }

  /** Carbon AdjustFlareLists preserves old records and copies templates on growth. */
  @meta.blue.method
  @meta.adapted
  AdjustFlareLists()
  {
    if ((!this.ambientFlareEffect && !this.haloFlareEffect) || !this.flareCount) return;
    for (const [list, template] of [
      [this._ambientFlares, this._ambientFlare], [this._haloFlares, this._haloFlare]
    ])
    {
      if (list.length > this.flareCount) list.length = this.flareCount;
      while (list.length < this.flareCount)
      {
        list.push({
          parentTransform0: vec4.clone(template.parentTransform0), // alloc: owned native Quad value on list growth.
          parentTransform1: vec4.clone(template.parentTransform1), // alloc: owned native Quad value on list growth.
          parentTransform2: vec4.clone(template.parentTransform2), // alloc: owned native Quad value on list growth.
          localTransform0: vec4.clone(template.localTransform0), // alloc: owned native Quad value on list growth.
          localTransform1: vec4.clone(template.localTransform1), // alloc: owned native Quad value on list growth.
          localTransform2: vec4.clone(template.localTransform2), // alloc: owned native Quad value on list growth.
          color: vec4.clone(template.color), // alloc: owned native Quad value on list growth.
          brightness: vec2.clone(template.brightness) // alloc: owned native Quad value on list growth.
        });
      }
    }
  }

  /**
   * Carbon OnModified refreshes flare templates and removes detached effects
   * (BehaviorGroupBooster.cpp:143-175). JS coalesces changed names: rebuild once,
   * then clear each detached list so another edit cannot regrow it in this call.
   * Carbon registers replacements through its global quad renderer; our scene
   * owns that renderer, so submission registers the current effect before use.
   */
  @meta.blue.method
  @meta.adapted
  OnModified(value)
  {
    let clearHalo = false, clearAmbient = false, setup = false;
    for (const name of Array.isArray(value) ? value : [value])
    {
      if (IsMatch(name, "haloFlareEffect") && !this.haloFlareEffect) clearHalo = true;
      else if (IsMatch(name, "ambientFlareEffect") && !this.ambientFlareEffect) clearAmbient = true;
      else setup = true;
    }
    if (setup) this.SetupQuads();
    if (clearHalo) this._haloFlares.length = 0;
    if (clearAmbient) this._ambientFlares.length = 0;
    return true;
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
  @meta.blue.method
  @meta.adapted
  @meta.reason("Carbon's Blue frame clock converts once to seconds for the noise phase; the light registers through the duck-typed manager (AddPointLight), never a GPU structure.")
  AddLight(lightManager, position, radiusModifier, agentIndex, _parentTransform)
  {
    vec4.copy(LIGHT_COLOR, this.lightColor);
    if (this.ambientFlareNoiseAmplitude !== 0)
    {
      const time = TimeAsDouble(blue.os.GetCurrentFrameTime()) + agentIndex * 0.01;
      const noise = carbonPerlin1D(time * this.ambientFlareNoiseSpeed, 2, 2, this.ambientFlareNoiseOctaves);
      vec4.scale(LIGHT_COLOR, LIGHT_COLOR, ((noise + 1) / 2) * this.ambientFlareNoiseAmplitude);
    }

    lightManager?.AddPointLight(position, radiusModifier * this.lightRadius, LIGHT_COLOR);
  }

  /**
   * Carbon Initialize builds the booster declaration and shared box indices.
   * Flare registration uses the scene-owned quad renderer when it collects us.
   */
  @meta.blue.method
  @meta.adapted
  Initialize()
  {
    this.SetupQuads();
    const definition = new Tr2VertexDefinition();
    definition.Add("FLOAT32_3", "POSITION");
    definition.Add("FLOAT32_2", "TEXCOORD");
    for (let index = 1; index <= 3; index++) definition.Add("FLOAT32_4", "TEXCOORD", index, 1, 1);
    this._vertexDeclarationHandle = Tr2EffectStateManager.getVertexDeclarationHandle(definition);
    Tr2Renderer.ReserveQuadListIndexBuffer(6);
    return true;
  }

  /**
   * Carbon AddFlare writes world/local quad rows and the two authored LOD curves.
   * Existing quad packing handles float16 storage; Blue ticks convert once to
   * seconds for noise. The halo modifier receives the owning render context.
   */
  @meta.blue.method
  @meta.adapted
  AddFlare(agentTransform, lod, intensity, agentIndex, shipBoundingSphereRadius, groupScale)
  {
    if (!this.flareCount) return;
    const time = TimeAsDouble(blue.os.GetCurrentFrameTime()) + agentIndex * 0.01;
    if (this.haloFlareEffect && this._haloFlares.length === this.flareCount)
    {
      const quad = this._haloFlares[agentIndex];
      const mod = Math.max(0, (1 + lod) ** 2 * (lod - 1) ** 2);
      let brightness = 0.1 + 0.9 * intensity * this.haloFlareBrightness * mod;
      vec3.scale(HALO_OFFSET, this.haloFlareOffset, mod * groupScale);
      vec3.set(GROUP_SCALE, groupScale, groupScale, groupScale);
      // Carbon haloRotation * translation * groupScale * agent: rotation
      // first, reverse the composition for gl-matrix.
      mat4.fromRotationTranslationScale(HALO_TRANSFORM, HALO_ROTATION, HALO_OFFSET, GROUP_SCALE);
      mat4.multiply(HALO_TRANSFORM, agentTransform, HALO_TRANSFORM);
      this._haloModifier.ApplyTransform({renderContext: Tr2RenderContext_GetMainThreadRenderContext()},
        HALO_TRANSFORM, 0, null, HALO_TRANSFORM);
      if (this.haloFlareNoiseAmplitude !== 0)
      {
        brightness *= (carbonPerlin1D(time * this.haloFlareNoiseSpeed, 2, 2, this.haloFlareNoiseOctaves) + 1) / 2 * this.haloFlareNoiseAmplitude;
      }
      quad.brightness[0] = brightness;
      BehaviorGroupBooster._setParentRows(quad, HALO_TRANSFORM);
    }
    if (this.ambientFlareEffect && this._ambientFlares.length === this.flareCount)
    {
      const quad = this._ambientFlares[agentIndex];
      const mod = (1 - lod) * (lod + 1) * (lod - 1) ** 2;
      let brightness = (0.25 + 0.25 * intensity + 0.5 * mod * intensity) * this.ambientFlareBrightness;
      if (this.ambientFlareNoiseAmplitude !== 0)
      {
        brightness *= (carbonPerlin1D(time * this.ambientFlareNoiseSpeed, 2, 2, this.ambientFlareNoiseOctaves) + 1) / 2 * this.ambientFlareNoiseAmplitude;
      }
      quad.brightness[0] = brightness;
      BehaviorGroupBooster._setParentRows(quad, agentTransform);
      const farScale = (1 - mod) * shipBoundingSphereRadius * groupScale * 2;
      for (let row = 0; row < 3; row++)
      {
        const local = quad[`localTransform${row}`];
        local[row] = mod * this.ambientFlareScale[row] * groupScale + farScale;
        local[3] = mod * this.ambientFlareOffset[row] * groupScale;
      }
    }
  }

  /** Writes Carbon Quad's three parent rows using the shared matrix byte layout. */
  static _setParentRows(quad, transform)
  {
    for (let row = 0; row < 3; row++)
    {
      const target = quad[`parentTransform${row}`];
      for (let column = 0; column < 4; column++) target[column] = transform[column * 4 + row];
    }
  }

  /** Carbon GetVertexDeclaration returns the combined box/instance declaration. */
  @meta.blue.method
  @meta.implemented
  GetVertexDeclaration()
  {
    return this._vertexDeclarationHandle;
  }

  /** Carbon GetBatch binds the shared box and the owning system's instance stream. */
  @meta.blue.method
  @meta.adapted
  GetBatch(instanceBuffer, startInstance, instanceDataStride, count)
  {
    const batch = new Tr2RenderBatch();
    const vertices = this._vertexBuffer.GetSharedResource();
    if (!instanceBuffer || !this.displayBoosters || !this.display || !vertices || !vertices.IsValid()) return batch;
    if (Tr2Renderer.GetShaderModel() < TR2SHADERMODEL.TR2SM_3_0_HI) return batch;
    const indices = Tr2Renderer.GetQuadListIndexBuffer();
    if (!indices.IsValid()) return batch;
    batch.SetMaterial(this.boosterEffect);
    batch.SetVertexDeclaration(this.GetVertexDeclaration());
    batch.SetIndices(indices.GetBuffer(), indices.GetStride());
    batch.SetStreamSource(0, vertices.GetBuffer(), vertices.GetStride());
    batch.SetStreamSource(1, instanceBuffer, instanceDataStride);
    batch.SetDrawIndexedInstanced(36, count, indices.GetStartIndex(), vertices.GetOffset() / vertices.GetStride(), startInstance);
    return batch;
  }

  /** Carbon CreateBuffer selects the shared box for high shader quality. */
  @meta.blue.method
  @meta.implemented
  CreateBuffer()
  {
    if (Tr2Renderer.GetShaderModel() >= TR2SHADERMODEL.TR2SM_3_0_HI) this._vertexBuffer = MakeBoosterBoxBuffer();
  }

  /** Registers Carbon's identical child-quad layout with the scene-owned renderer. */
  @meta.blue.method
  @meta.adapted
  RegisterWithQuadRenderer(quadRenderer)
  {
    for (const effect of [this.ambientFlareEffect, this.haloFlareEffect])
    {
      if (effect) quadRenderer.RegisterEffect(effect.GetHashValue(), TriBatchType.TRIBATCHTYPE_ADDITIVE,
        QUAD_INSTANCE_SIZE, 1, EveChildQuad.GetQuadDefinition(), effect);
    }
  }

  /**
   * Submits the native flare lists with their independent display switches.
   * Registration is idempotent and deferred to the scene-owned renderer: edits
   * before scene attachment and replacement effects reach the correct bucket,
   * including when a booster is shared by scenes. Old buckets may have other
   * owners and remain registered, as in Carbon's InitializeHalo/AmbientFlare.
   */
  @meta.blue.method
  @meta.adapted
  AddQuadsToQuadRenderer(_frustum, quadRenderer)
  {
    if (!this.display) return;
    for (const [effect, display, quads] of [
      [this.haloFlareEffect, this.displayHazeFlare, this._haloFlares],
      [this.ambientFlareEffect, this.displayAmbientFlare, this._ambientFlares]
    ])
    {
      if (!effect || !display || !quads.length) continue;
      const key = effect.GetHashValue();
      quadRenderer.RegisterEffect(key, TriBatchType.TRIBATCHTYPE_ADDITIVE,
        QUAD_INSTANCE_SIZE, 1, EveChildQuad.GetQuadDefinition(), effect);
      for (let index = 0; index < this.flareCount; index++)
        quadRenderer.AddQuads(key, packQuadInstanceData(quads[index], this._quadBytes), 1);
    }
  }

  // Builds the hardcoded volumetric drone booster effect (Carbon
  // CreateBoosterEffect + SetupBoosterEffect, cpp:284-336).
  /**
   * Builds and configures the drone booster effect, including its noise, colour and texture parameters.
   */
  static _CreateBoosterEffect(lodOption)
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
  static _CreateFlareEffect()
  {
    const effect = new Tr2Effect();
    effect.StartUpdate();

    effect.SetEffectPathName("res:/Graphics/Effect/Managed/Space/SpecialFX/FlareQuad.fx");

    effect.EndUpdate();
    return effect;
  }

}
