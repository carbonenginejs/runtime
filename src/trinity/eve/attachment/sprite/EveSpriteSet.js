// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpriteSet.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpriteSet.cpp
import { box3 } from "#math/box3";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { carbon, impl, io, type } from "#schema";
import { IEveSpaceObjectAttachment } from "../IEveSpaceObjectAttachment.js";
import { EveSpriteLight } from "./EveSpriteLight.js";
import { EveSpriteSetItem } from "./EveSpriteSetItem.js";
import { EveComponentType } from "../../EveComponentTypes.js";
import { Blink } from "../EveSpaceObjectAttachmentUtils.js";
import { CreateItemSetBoundingBoxes, GetItemSetAabb } from "../itemSetBounds.js";
import { Tr2Light } from "../../lights/Tr2Light.js";
import { AsPerPointLightData, CreateLightRecord, MatrixCopyFrom3x4 } from "../../lights/lightConversion.js";


/**
 * A hull's authored blinking sprites, owning their static and per-bone bounds
 * and the point lights the sprites emit.
 */
@type.define({ className: "EveSpriteSet", family: "eve/attachment/sprites" })
export class EveSpriteSet extends IEveSpaceObjectAttachment
{
  @io.rebuild("packedGeometry")
  @io.notify
  @io.persist
  @type.list("EveSpriteSetItem")
  sprites = [];

  @io.persist
  @type.string
  name = "";

  @io.rebuild("packedGeometry")
  @io.notify
  @io.persist
  @type.objectRef("Tr2Effect")
  effect = null;

  @io.rebuild("packedGeometry")
  @io.persist
  @type.boolean
  skinned = false;

  @io.persist
  @type.float32
  intensity = 1;

  @io.persist
  @type.boolean
  display = true;

  @io.persist
  @type.list("EveSpriteLight")
  lights = [];

  #rebuildRevision = 0;

  /** m_aabb (h:140) - the union of every unskinned sprite's bounds. */
  #staticBounds = box3.create();

  /** m_boundingBoxes (h:142) - [{ boneIndex, bounds }], ascending. */
  #boneBounds = [];

  /** Carbon m_activationStrength (ctor default 0, EveSpriteSet.cpp:67 - NOT
   * 1: packed-set lights are BLACK until the owner's update calls
   * UpdateLights). */
  #activationStrength = 0;

  /**
   * Drops every sprite and every light; the bounds only follow on the next
   * Rebuild.
   */
  @carbon.method
  @impl.implemented
  Clear()
  {
    this.sprites.length = 0;
    this.lights.length = 0;
  }

  /** Carbon EveSpriteSet::UpdateLights (cpp:142-161): per light - only
   * boneIndex > 0 takes the bone path (bone 0 can NEVER drive a packed-set
   * light; contrast Tr2Light::SetBoneMatrix's >= 0): the Float4x3 bone is
   * unpacked column-stride, the 4th column zeroed with [15] = 1, then
   * boneMatrix *= parentTransform - Carbon row-vector, bone FIRST, so the
   * gl-matrix operands SWAP; otherwise boneMatrix = parentTransform. Stamps
   * the activation strength (boosterGain is accepted but unused by sprites). */
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

  /**
   * Appends a sprite and returns the stored item, accepting either a ready-made item on its own or a position plus one of two argument forms.
   * @param {object|vec3} positionOrItem An existing sprite item, or the sprite position.
   * @param {...*} args Either (scale, color, warpColor) for a non-blinking sprite, or (blinkRate, blinkPhase, minScale, maxScale, falloff, color, warpColor).
   */
  @carbon.method
  @impl.adapted
  Add(positionOrItem, ...args)
  {
    if (positionOrItem && !ArrayBuffer.isView(positionOrItem) && !Array.isArray(positionOrItem) && args.length === 0)
    {
      this.sprites.push(positionOrItem);
      return positionOrItem;
    }

    const item = new EveSpriteSetItem();
    vec3.copy(item.position, positionOrItem ?? vec3.create());
    if (args.length === 3)
    {
      const [scale, color, warpColor] = args;
      item.blinkRate = 0;
      item.blinkPhase = 0;
      item.minScale = Number(scale);
      item.maxScale = Number(scale);
      item.falloff = 0;
      vec4.copy(item.color, color);
      vec4.copy(item.warpColor, warpColor);
    }
    else
    {
      const [blinkRate = 0, blinkPhase = 0, minScale = 1, maxScale = 1, falloff = 0, color = [1, 1, 1, 1], warpColor = [1, 1, 1, 1]] = args;
      item.blinkRate = Number(blinkRate);
      item.blinkPhase = Number(blinkPhase);
      item.minScale = Number(minScale);
      item.maxScale = Number(maxScale);
      item.falloff = Number(falloff);
      vec4.copy(item.color, color);
      vec4.copy(item.warpColor, warpColor);
    }
    item.boneIndex = 0;
    this.sprites.push(item);
    return item;
  }

  /** The live sprite item list, not a copy. */
  @carbon.method
  @impl.implemented
  GetSprites()
  {
    return this.sprites;
  }

  /** The authored set name, which SOF uses to match this set to its DNA entry. */
  @carbon.method
  @impl.implemented
  GetName()
  {
    return this.name;
  }

  /** Sets the authored set name, coercing null or undefined to an empty string. */
  @carbon.method
  @impl.implemented
  SetName(name)
  {
    this.name = String(name ?? "");
  }

  /** The effect that draws the sprites. */
  @carbon.method
  @impl.implemented
  GetEffect()
  {
    return this.effect;
  }

  /** Sets the effect that draws the sprites. */
  @carbon.method
  @impl.implemented
  SetEffect(effect)
  {
    this.effect = effect ?? null;
  }

  /**
   * Sets whether the sprites ride skeleton bones, which is what decides if
   * GetAabb consults the caller's bone list at all.
   */
  @carbon.method
  @impl.implemented
  SetSkinned(skinned)
  {
    this.skinned = !!skinned;
  }

  /**
   * Recomputes the static and per-bone bounds from the authored sprites and
   * marks the packed geometry stale.
   */
  @carbon.method
  @impl.adapted
  Rebuild()
  {
    this.#rebuildRevision++;
    this.__state.rebuild.add("packedGeometry");
    // Carbon rebuilds the item-set bounds at the tail of the same pack
    // (cpp:342); the packing itself is engine-side, the bounds are not.
    CreateItemSetBoundingBoxes(this.#staticBounds, this.#boneBounds, this.skinned, this.sprites);
  }

  /** Carbon EveSpriteSet::GetAabb (cpp:163-166): the item-set bounds, with the
   * bone list forwarded only when the set is skinned. */
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

  /** Carbon EveSpriteSet::UpdateVisibility (cpp:130-140): an uninitialized set
   * is NOT visible; otherwise its bounds move into world space and take the
   * frustum box test. No LOD and no display gate - Carbon tests display at draw
   * time, not here. */
  @carbon.method
  @impl.implemented
  UpdateVisibility(updateContext, parentTransform, bones = null, boneCount = 0)
  {
    const aabb = this.GetAabb(EveSpriteSet.#aabbScratch, bones, boneCount);
    if (box3.isEmpty(aabb))
    {
      return false;
    }

    box3.transformMat4(aabb, aabb, parentTransform);
    return !!updateContext?.GetFrustum?.()?.IsBoxVisible(aabb);
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

  /** Carbon EveSpriteSet::RegisterComponents (cpp:445-452): LightOwner when
   * lights are authored. */
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

  /** Carbon EveSpriteSet::GetLights (cpp:454-469): parentBrightness =
   * activationStrength once before the loop; per light the point conversion
   * on the bone matrix, then Blink scales BOTH radius and innerRadius AFTER
   * conversion (cpp:464-466). No gates - registration covers presence. The
   * profile rides the record by reference (Carbon: GetTextureIndex() with NO
   * +1, unlike Tr2Light::AddLight - the asymmetry is moot by-reference but
   * recorded). */
  @carbon.method
  @impl.adapted
  @impl.reason("Tr2Renderer::GetAnimationTime relocates onto the light-manager duck (GetAnimationTime, default 0); profile-index packing is by-reference per lightConversion.js.")
  GetLights(lightManager)
  {
    const features = EveSpriteSet.#features;
    features.parentBrightness = this.#activationStrength;
    features.parentScale = 1;
    const time = lightManager?.GetAnimationTime() ?? 0;
    const quality = lightManager?.GetCurrentSpaceSceneShadowQuality() ?? 0;
    const record = EveSpriteSet.#lightRecord;

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
