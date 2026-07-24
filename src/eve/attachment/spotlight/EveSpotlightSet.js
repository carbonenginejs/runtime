// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\Sets\EveSpotlightSet.h
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\Sets\EveSpotlightSet.cpp
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { EveEntity } from "../../../generated/eve/EveEntity.js";
import { EveSpotlightLight } from "./EveSpotlightLight.js";
import { EveComponentType } from "../../EveComponentTypes.js";
import { Tr2Light } from "../../lights/Tr2Light.js";
import { AsPerSpotLightData, CreateLightRecord, MatrixCopyFrom3x4 } from "../../lights/lightConversion.js";


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

  /** Carbon m_activationStrength / m_boosterGain (ctor 0 / 0,
   * EveSpotlightSet.cpp:90-91). Lights are BLACK until UpdateLights runs. */
  #activationStrength = 0;

  #boosterGain = 0;

  @carbon.method
  @impl.adapted
  Rebuild()
  {
    // Packed cone/glow vertices, bounds caches, effect hashes and quad
    // registration are reconciled by the concrete renderer adapter.
    this.#rebuildRevision++;
    this.__state.rebuild.add("packedGeometry");
  }

  @carbon.method
  @impl.adapted
  Initialize()
  {
    this.Rebuild();
    return true;
  }

  @carbon.method
  @impl.implemented
  GetConeEffect()
  {
    return this.coneEffect;
  }

  @carbon.method
  @impl.implemented
  SetConeEffect(effect)
  {
    this.coneEffect = effect ?? null;
  }

  @carbon.method
  @impl.implemented
  GetGlowEffect()
  {
    return this.glowEffect;
  }

  @carbon.method
  @impl.implemented
  SetGlowEffect(effect)
  {
    this.glowEffect = effect ?? null;
  }

  @carbon.method
  @impl.implemented
  SetSkinned(skinned)
  {
    this.skinned = !!skinned;
  }

  @carbon.method
  @impl.implemented
  GetName()
  {
    return this.name;
  }

  @carbon.method
  @impl.implemented
  SetName(name)
  {
    this.name = String(name ?? "");
  }

  @carbon.method
  @impl.implemented
  GetSpotlightItems()
  {
    return this.spotlightItems;
  }

  @carbon.method
  @impl.implemented
  AddSpotlightItem(item)
  {
    this.spotlightItems.push(item);
  }

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

  static #features = { parentBrightness: 0, parentScale: 1 };

  static #lightRecord = CreateLightRecord();
}
