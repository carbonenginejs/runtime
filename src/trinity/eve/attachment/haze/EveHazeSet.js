// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveHazeSet.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveHazeSet.cpp
import { box3 } from "#math/box3";
import { mat4 } from "#math/mat4";
import { carbon, impl, io, type } from "#schema";
import { EveEntity } from "../../EveEntity.js";
import { EveHazeSetLight } from "./EveHazeSetLight.js";
import { EveComponentType } from "../../EveComponentTypes.js";
import { Tr2Light } from "../../lights/Tr2Light.js";
import { AsPerPointLightData, CreateLightRecord, MatrixCopyFrom3x4 } from "../../lights/lightConversion.js";
import { CreateItemSetBoundingBoxes, GetItemSetAabb } from "../itemSetBounds.js";


/**
 * A hull's authored haze volumes, owning their per-bone bounds and the point
 * lights the haze emits.
 */
@type.define({ className: "EveHazeSet", family: "eve/attachment/haze" })
export class EveHazeSet extends EveEntity
{
  @io.rebuild("packedGeometry")
  @io.persist
  @type.objectRef("Tr2Effect")
  effect = null;

  @io.persist
  @type.boolean
  display = true;

  @io.persist
  @type.string
  name = "";

  @io.rebuild("packedGeometry")
  @io.persist
  @type.list("EveHazeSetItem")
  hazes = [];

  @io.persist
  @type.list("EveHazeSetLight")
  lights = [];

  #rebuildRevision = 0;

  /** m_aabb - the union of every haze that rides the parent transform. */
  #staticBounds = box3.create();

  /** m_boundingBoxes - [{ boneIndex, bounds }], ascending. */
  #boneBounds = [];

  /** Carbon m_activationStrength (ctor 0, EveHazeSet.cpp:66) and
   * m_boosterGain (ctor `false` = 0.0f, cpp:67 - a float initialized with a
   * bool, verbatim quirk). Lights are BLACK until UpdateLights runs. */
  #activationStrength = 0;

  #boosterGain = 0;

  /** Sets the effect that draws the haze volumes. */
  @carbon.method
  @impl.implemented
  Setup(effect)
  {
    this.effect = effect ?? null;
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
   * Recomputes the item-set bounds and marks the packed geometry stale; a haze
   * set has no skinned flag, so every bone-indexed haze always gets its own box.
   */
  @carbon.method
  @impl.adapted
  Rebuild()
  {
    // Carbon rebuilds packed haze vertices and static bounds here. The
    // backend-neutral runtime keeps the authored graph and invalidates the
    // renderer-facing revision without allocating device resources.
    this.#rebuildRevision++;
    this.__state.rebuild.add("packedGeometry");
    // Carbon rebuilds the item-set bounds here too (cpp:247), passing
    // skinned=TRUE unconditionally: a haze set has no skinned flag, so every
    // bone-indexed haze gets its own box.
    CreateItemSetBoundingBoxes(this.#staticBounds, this.#boneBounds, true, this.hazes);
  }

  /** Carbon EveHazeSet::UpdateVisibility (cpp:208-218). Unlike the other sets
   * this one has no GetAabb of its own and never gates the bone count, because
   * its bounds are always built skinned. */
  @carbon.method
  @impl.implemented
  UpdateVisibility(updateContext, parentTransform, bones = null, boneCount = 0)
  {
    const aabb = GetItemSetAabb(
      EveHazeSet.#aabbScratch,
      this.#staticBounds,
      this.#boneBounds,
      bones,
      boneCount
    );
    if (box3.isEmpty(aabb))
    {
      return false;
    }

    box3.transformMat4(aabb, aabb, parentTransform);
    return !!updateContext?.GetFrustum?.()?.IsBoxVisible(aabb);
  }

  /**
   * Appends an authored haze item; the bounds only pick it up on the next
   * Rebuild.
   */
  @carbon.method
  @impl.implemented
  AddHazeItem(item)
  {
    this.hazes.push(item);
  }

  /**
   * Sets a shader option on the haze effect, doing nothing when no effect that
   * accepts options is attached.
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
   * Converts a SOF-authored light description into an EveHazeSetLight and
   * appends it to the set.
   */
  @carbon.method
  @impl.adapted
  AddLightFromSOF(light)
  {
    this.lights.push(EveHazeSetLight.FromSOF(light));
  }

  /** Carbon EveHazeSet::RegisterComponents (cpp:394-401): LightOwner when
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

  /** Carbon EveHazeSet::UpdateLights (cpp:219-239): the shared packed-set
   * bone pattern (boneIndex > 0 only; column-stride Float4x3 unpack; 4th
   * column zeroed, [15] = 1; boneMatrix *= parentTransform - Carbon
   * row-vector, bone FIRST: gl operands SWAP; else copy the parent). Stamps
   * BOTH activationStrength and boosterGain (cpp:237-238). */
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

  /** Carbon EveHazeSet::GetLights (cpp:403-418): parentBrightness is set
   * INSIDE the loop (cpp:409) because boosterGainInfluence lights multiply
   * it by the booster gain (cpp:410-413); point conversion on the bone
   * matrix; no blink/fade, no gates. */
  @carbon.method
  @impl.adapted
  @impl.reason("Profile-index packing is by-reference per lightConversion.js conventions.")
  GetLights(lightManager)
  {
    const features = EveHazeSet.#features;
    features.parentScale = 1;
    const quality = lightManager?.GetCurrentSpaceSceneShadowQuality?.() ?? 0;
    const record = EveHazeSet.#lightRecord;

    for (const light of this.lights)
    {
      features.parentBrightness = this.#activationStrength;
      if (light.boosterGainInfluence)
      {
        features.parentBrightness *= this.#boosterGain;
      }
      AsPerPointLightData(record, light.lightData, light.boneMatrix, features, quality);
      record.lightType = Tr2Light.POINT_LIGHT;
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
