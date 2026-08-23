// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpotlightSet.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpotlightSet.cpp
import { box3 } from "#math/box3";
import { mat4 } from "#math/mat4";
import { carbon, impl, io, type } from "#schema";
import { EveEntity } from "../../EveEntity.js";
import { EveSpotlightLight } from "./EveSpotlightLight.js";
import { EveComponentType } from "../../EveComponentTypes.js";
import { Tr2Light } from "../../lights/Tr2Light.js";
import { CreateItemSetBoundingBoxes, GetItemSetAabb } from "../itemSetBounds.js";
import { AsPerSpotLightData, CreateLightRecord, MatrixCopyFrom3x4 } from "../../lights/lightConversion.js";


/**
 * A hull's authored spotlights, owning their static and per-bone bounds, the
 * cone and glow effects that draw them, and the spot lights they emit.
 */
@type.define({ className: "EveSpotlightSet", family: "eve/attachment/spotlights" })
export class EveSpotlightSet extends EveEntity
{
  @io.rebuild("packedGeometry")
  @io.persist
  @type.list("EveSpotlightSetItem")
  spotlightItems = [];

  @io.persist
  @type.string
  name = "";

  @io.persist
  @type.boolean
  display = true;

  @io.rebuild("packedGeometry")
  @io.persist
  @type.objectRef("Tr2Effect")
  coneEffect = null;

  @io.rebuild("packedGeometry")
  @io.persist
  @type.objectRef("Tr2Effect")
  glowEffect = null;

  @io.rebuild("packedGeometry")
  @io.persist
  @type.boolean
  skinned = false;

  @io.persist
  @type.float32
  intensity = 1;

  @io.persist
  @type.list("EveSpotlightLight")
  lights = [];

  #rebuildRevision = 0;

  /** m_aabb - the union of every unskinned spotlight (cpp:311). */
  #staticBounds = box3.create();

  /** m_boundingBoxes - [{ boneIndex, bounds }], ascending. */
  #boneBounds = [];

  /** Carbon m_activationStrength / m_boosterGain (ctor 0 / 0,
   * EveSpotlightSet.cpp:90-91). Lights are BLACK until UpdateLights runs. */
  #activationStrength = 0;

  #boosterGain = 0;

  /**
   * Recomputes the static and per-bone bounds from the authored spotlight items
   * and marks the packed geometry stale.
   */
  @carbon.method
  @impl.adapted
  Rebuild()
  {
    // Packed cone/glow vertices, bounds caches, effect hashes and quad
    // registration are reconciled by the concrete renderer adapter.
    this.#rebuildRevision++;
    this.__state.rebuild.add("packedGeometry");
    // Carbon rebuilds the item-set bounds at the tail of the same pack (cpp:311).
    CreateItemSetBoundingBoxes(this.#staticBounds, this.#boneBounds, this.skinned, this.spotlightItems);
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

  /** The effect that draws the light cones. */
  @carbon.method
  @impl.implemented
  GetConeEffect()
  {
    return this.coneEffect;
  }

  /** Sets the effect that draws the light cones. */
  @carbon.method
  @impl.implemented
  SetConeEffect(effect)
  {
    this.coneEffect = effect ?? null;
  }

  /** The effect that draws the glow sprite at each cone's source. */
  @carbon.method
  @impl.implemented
  GetGlowEffect()
  {
    return this.glowEffect;
  }

  /** Sets the effect that draws the glow sprite at each cone's source. */
  @carbon.method
  @impl.implemented
  SetGlowEffect(effect)
  {
    this.glowEffect = effect ?? null;
  }

  /** Carbon EveSpotlightSet::GetAabb (cpp:176-179): the item-set bounds, with the bone
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

  /** Carbon EveSpotlightSet::UpdateVisibility (cpp:138-148): an uninitialized set is
   * NOT visible; otherwise the bounds move into world space and take the
   * frustum box test. No LOD and no display gate. */
  @carbon.method
  @impl.implemented
  UpdateVisibility(updateContext, parentTransform, bones = null, boneCount = 0)
  {
    const aabb = this.GetAabb(EveSpotlightSet.#aabbScratch, bones, boneCount);
    if (box3.isEmpty(aabb))
    {
      return false;
    }

    box3.transformMat4(aabb, aabb, parentTransform);
    return !!updateContext?.GetFrustum?.()?.IsBoxVisible(aabb);
  }

  /**
   * Sets whether the spotlights ride skeleton bones, which is what decides if
   * GetAabb consults the caller's bone list at all.
   */
  @carbon.method
  @impl.implemented
  SetSkinned(skinned)
  {
    this.skinned = !!skinned;
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

  /** The live spotlight item list, not a copy. */
  @carbon.method
  @impl.implemented
  GetSpotlightItems()
  {
    return this.spotlightItems;
  }

  /**
   * Appends an authored spotlight item; the bounds only pick it up on the next
   * Rebuild.
   */
  @carbon.method
  @impl.implemented
  AddSpotlightItem(item)
  {
    this.spotlightItems.push(item);
  }

  /**
   * Sets a shader option on both the cone and the glow effect, skipping
   * whichever is absent or does not accept options.
   */
  @carbon.method
  @impl.adapted
  SetShaderOption(name, value)
  {
    if (this.coneEffect && typeof this.coneEffect.SetOption === "function")
    {
      this.coneEffect.SetOption(name, value);
    }
    if (this.glowEffect && typeof this.glowEffect.SetOption === "function")
    {
      this.glowEffect.SetOption(name, value);
    }
  }

  /**
   * Converts a SOF-authored light description into an EveSpotlightLight and
   * appends it to the set.
   */
  @carbon.method
  @impl.adapted
  AddLightFromSOF(light)
  {
    this.lights.push(EveSpotlightLight.FromSOF(light));
  }

  /** Carbon EveSpotlightSet::RegisterComponents (cpp:527-534): LightOwner
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

  /** Carbon EveSpotlightSet::UpdateLights (cpp:150-170): the shared
   * packed-set bone pattern (boneIndex > 0 only; column-stride Float4x3
   * unpack; 4th column zeroed, [15] = 1; boneMatrix *= parentTransform -
   * Carbon row-vector, bone FIRST: gl operands SWAP; else copy the parent).
   * Stamps BOTH activationStrength and boosterGain (cpp:168-169). */
  @carbon.method
  @impl.implemented
  UpdateLights(parentTransform, bones, boneCount, activationStrength, boosterGain = 0)
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
    this.#boosterGain = Number(boosterGain) || 0;
  }

  /** Carbon EveSpotlightSet::GetLights (cpp:536-552): the haze pattern
   * (parentBrightness inside the loop, boosterGainInfluence multiply) but
   * with the SPOT conversion (cpp:549) - cos-of-degree angles and the
   * 1/tan(outerAngle) projection-plane distance, Infinity at outerAngle 0
   * exactly as Carbon ships. The spot direction comes from lightData.rotation
   * via the conversion's swapped RotationMatrix * transform composition. */
  @carbon.method
  @impl.adapted
  @impl.reason("Profile-index packing is by-reference per lightConversion.js conventions.")
  GetLights(lightManager)
  {
    const features = EveSpotlightSet.#features;
    features.parentScale = 1;
    const quality = lightManager?.GetCurrentSpaceSceneShadowQuality?.() ?? 0;
    const record = EveSpotlightSet.#lightRecord;

    for (const light of this.lights)
    {
      features.parentBrightness = this.#activationStrength;
      if (light.boosterGainInfluence)
      {
        features.parentBrightness *= this.#boosterGain;
      }
      AsPerSpotLightData(record, light.lightData, light.boneMatrix, features, quality);
      record.lightType = Tr2Light.SPOT_LIGHT;
      record.lightData = light.lightData;
      record.lightProfile = light.lightProfile;
      record.owner = this;
      lightManager?.AddLight?.(record);
    }
  }

  /** Per-frame scratch - UpdateVisibility must not allocate. */
  static #aabbScratch = box3.create();

  static #features = { parentBrightness: 0, parentScale: 1 };

  static #lightRecord = CreateLightRecord();
}
