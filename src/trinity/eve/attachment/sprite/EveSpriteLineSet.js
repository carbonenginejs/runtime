// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpriteLineSet.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpriteLineSet.cpp
import { box3 } from "#math/box3";
import { mat4 } from "#math/mat4";
import { carbon, impl, io, type } from "#schema";
import { IEveSpaceObjectAttachment } from "../IEveSpaceObjectAttachment.js";
import { EveSpriteLight } from "./EveSpriteLight.js";
import { EveComponentType } from "../../EveComponentTypes.js";
import { Blink } from "../EveSpaceObjectAttachmentUtils.js";
import { Tr2Light } from "../../lights/Tr2Light.js";
import { CreateItemSetBoundingBoxes, GetItemSetAabb } from "../itemSetBounds.js";
import { AsPerPointLightData, CreateLightRecord, MatrixCopyFrom3x4 } from "../../lights/lightConversion.js";


/**
 * A hull's authored sprite runs - lines and circles of evenly spaced sprites -
 * owning their static and per-bone bounds and the point lights they emit.
 */
@type.define({ className: "EveSpriteLineSet", family: "eve/attachment/sprites" })
export class EveSpriteLineSet extends IEveSpaceObjectAttachment
{
  @io.rebuild("packedGeometry")
  @io.persist
  @type.list("EveSpriteLineSetItem")
  spriteLines = [];

  @io.rebuild("packedGeometry")
  @io.persist
  @type.boolean
  skinned = false;

  @io.read
  @type.uint32
  effectHash = 0;

  @io.rebuild("packedGeometry")
  @io.persist
  @type.objectRef("Tr2Effect")
  effect = null;

  @io.readwrite
  @type.boolean
  display = true;

  @io.persist
  @type.string
  name = "";

  @io.persist
  @type.list("EveSpriteLight")
  lights = [];

  #rebuildRevision = 0;

  /** m_aabb - the union of every unskinned sprite line (cpp:77). */
  #staticBounds = box3.create();

  /** m_boundingBoxes - [{ boneIndex, bounds }], ascending. */
  #boneBounds = [];

  /** Carbon m_activationStrength (ctor default 0, EveSpriteLineSet.cpp:26 -
   * NOT 1: packed-set lights are BLACK until UpdateLights runs). */
  #activationStrength = 0;

  /**
   * Recomputes the static and per-bone bounds from the authored sprite lines and
   * marks the packed geometry stale.
   */
  @carbon.method
  @impl.adapted
  Rebuild()
  {
    // Position expansion is available on each item, but packed quad data,
    // effect hashes, bounds caches and registration belong to the adapter.
    this.#rebuildRevision++;
    this.__state.rebuild.add("packedGeometry");
    CreateItemSetBoundingBoxes(this.#staticBounds, this.#boneBounds, this.skinned, this.spriteLines);
  }

  /**
   * Runs the first Rebuild so the set has bounds before its first visibility
   * test.
   */
  @carbon.method
  @impl.adapted
  Initialize()
  {
    this.Rebuild();
    return true;
  }

  /** Carbon EveSpriteLineSet::GetAabb (cpp:177-180): the item-set bounds, with the bone
   * list forwarded only when the set is skinned. */
  @carbon.method
  @impl.implemented
  GetAabb(out, bones = null, boneCount = 0)
  {
    return GetItemSetAabb(
      out,
      this.#staticBounds,
      this.#boneBounds,
      bones,
      this.skinned ? boneCount : 0
    );
  }

  /** Carbon EveSpriteLineSet::UpdateVisibility (cpp:140-150): an uninitialized set is
   * NOT visible; otherwise the bounds move into world space and take the
   * frustum box test. No LOD and no display gate. */
  @carbon.method
  @impl.implemented
  UpdateVisibility(updateContext, parentTransform, bones = null, boneCount = 0)
  {
    const aabb = this.GetAabb(EveSpriteLineSet.#aabbScratch, bones, boneCount);
    if (box3.isEmpty(aabb))
    {
      return false;
    }

    box3.transformMat4(aabb, aabb, parentTransform);
    return !!updateContext?.GetFrustum?.()?.IsBoxVisible(aabb);
  }

  /** Sets the drawing effect and the skinned flag in one call. */
  @carbon.method
  @impl.implemented
  Setup(effect, isSkinned)
  {
    this.effect = effect ?? null;
    this.skinned = !!isSkinned;
  }

  /**
   * Appends an authored sprite line item; the bounds only pick it up on the next
   * Rebuild.
   */
  @carbon.method
  @impl.implemented
  Add(item)
  {
    this.spriteLines.push(item);
  }

  /**
   * Sets a shader option on the sprite line effect, doing nothing when no effect
   * that accepts options is attached.
   */
  @carbon.method
  @impl.adapted
  SetShaderOption(name, value)
  {
    if (this.effect && typeof this.effect.SetOption === "function")
    {
      this.effect.SetOption(name, value);
    }
  }

  /**
   * Converts a SOF-authored light description into an EveSpriteLight and appends
   * it to the set.
   */
  @carbon.method
  @impl.adapted
  AddLightFromSOF(light)
  {
    this.lights.push(EveSpriteLight.FromSOF(light));
  }

  /** Carbon EveSpriteLineSet::RegisterComponents (cpp:349-356): LightOwner
   * when lights are authored. */
  @carbon.method
  @impl.implemented
  RegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry && this.lights.length)
    {
      registry.RegisterComponent(EveComponentType.LightOwner, this);
    }
  }

  /** Carbon EveSpriteLineSet::UpdateLights (cpp:152-171): byte-identical to
   * EveSpriteSet's - boneIndex > 0 only (bone 0 never drives a packed-set
   * light), column-stride Float4x3 unpack, 4th column zeroed with [15] = 1,
   * then boneMatrix *= parentTransform - Carbon row-vector, bone FIRST: the
   * gl-matrix operands SWAP; else boneMatrix = parentTransform. Stamps the
   * activation strength (boosterGain unused). */
  @carbon.method
  @impl.implemented
  UpdateLights(parentTransform, bones, boneCount, activationStrength, _boosterGain = 0)
  {
    for (const light of this.lights)
    {
      const boneIndex = light.lightData.boneIndex;
      if (bones && boneIndex > 0 && boneIndex < boneCount)
      {
        MatrixCopyFrom3x4(light.boneMatrix, bones, boneIndex);
        light.boneMatrix[3] = 0;
        light.boneMatrix[7] = 0;
        light.boneMatrix[11] = 0;
        light.boneMatrix[15] = 1;
        // Carbon (row-vector): boneMatrix * parentTransform - bone first.
        mat4.multiply(light.boneMatrix, parentTransform, light.boneMatrix);
      }
      else
      {
        mat4.copy(light.boneMatrix, parentTransform);
      }
    }
    this.#activationStrength = Number(activationStrength) || 0;
  }

  /** Carbon EveSpriteLineSet::GetLights (cpp:358-373): byte-identical to
   * EveSpriteSet's (shared EveSpriteLight items) - point conversion on the
   * bone matrix, Blink scales radius + innerRadius after conversion, no
   * gates. */
  @carbon.method
  @impl.adapted
  @impl.reason("Tr2Renderer::GetAnimationTime relocates onto the light-manager duck (GetAnimationTime, default 0); profile-index packing is by-reference per lightConversion.js.")
  GetLights(lightManager)
  {
    const features = EveSpriteLineSet.#features;
    features.parentBrightness = this.#activationStrength;
    features.parentScale = 1;
    const time = lightManager?.GetAnimationTime() ?? 0;
    const quality = lightManager?.GetCurrentSpaceSceneShadowQuality() ?? 0;
    const record = EveSpriteLineSet.#lightRecord;

    for (const light of this.lights)
    {
      AsPerPointLightData(record, light.lightData, light.boneMatrix, features, quality);
      const blinkScale = Blink(time, light.blinkRate, light.blinkPhase, light.minScale, light.maxScale);
      record.radius *= blinkScale;
      record.innerRadius *= blinkScale;
      record.lightType = Tr2Light.POINT_LIGHT;
      record.lightData = light.lightData;
      record.lightProfile = light.lightProfile;
      record.owner = this;
      lightManager?.AddLight(record);
    }
  }

  /** Per-frame scratch - UpdateVisibility must not allocate. */
  static #aabbScratch = box3.create();

  static #features = { parentBrightness: 0, parentScale: 1 };

  static #lightRecord = CreateLightRecord();
}
