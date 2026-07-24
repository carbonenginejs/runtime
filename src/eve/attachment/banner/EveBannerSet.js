// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\Sets\EveBannerSet.h
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\Sets\EveBannerSet.cpp
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { EveEntity } from "../../../generated/eve/EveEntity.js";
import { EveBannerItem } from "./EveBannerItem.js";
import { EveBannerLight } from "./EveBannerLight.js";
import { EveComponentType } from "../../EveComponentTypes.js";
import { Saturate } from "../EveSpaceObjectAttachmentUtils.js";
import { Tr2Light } from "../../lights/Tr2Light.js";
import {
  AsPerPointLightData,
  CopyLightData,
  CreateLightDataScratch,
  CreateLightRecord,
  MatrixCopyFrom3x4
} from "../../lights/lightConversion.js";


@type.define({ className: "EveBannerSet", family: "eve/attachment/banners" })
export class EveBannerSet extends EveEntity
{
  @io.rebuild("packedGeometry")
  @io.persist
  @type.list("EveBannerItem")
  banners = [];

  @io.persist
  @type.string
  name = "";

  @io.rebuild("packedGeometry")
  @io.persist
  @type.objectRef("Tr2Effect")
  effect = null;

  @io.persist
  @type.boolean
  isPickable = false;

  @io.readwrite
  @type.boolean
  display = true;

  @io.persist
  @type.int32
  key = 0;

  @io.persist
  @type.list("EveBannerLight")
  lights = [];

  // SOF-authored primary banner texture parameter; persisted so the values
  // interchange reproduces Carbon's hidden banner binding.
  @io.persist
  @type.objectRef("TriTextureParameter")
  primaryTextureParameter = null;

  #rebuildRevision = 0;

  /** Carbon m_activationStrength (ctor 0, EveBannerSet.cpp:94). Lights are
   * BLACK until UpdateLights runs. */
  #activationStrength = 0;

  @carbon.method
  @impl.adapted
  Rebuild()
  {
    // Physical geometry, buffers, bounds and batches are backend work.
    this.#rebuildRevision++;
    this.__state.rebuild.add("packedGeometry");
  }

  @carbon.method
  @impl.implemented
  GetReference(index)
  {
    return this.banners[index].reference;
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
  AddBanner(banner)
  {
    const copy = EveBannerSet.#copyBanner(banner);
    this.banners.push(copy);
    return copy;
  }

  @carbon.method
  @impl.implemented
  SetEffect(effect)
  {
    this.effect = effect ?? null;
  }

  @carbon.method
  @impl.implemented
  SetKey(key)
  {
    this.key = Number(key) | 0;
  }

  @carbon.method
  @impl.implemented
  GetPickingID()
  {
    return (101 + this.key) >>> 0;
  }

  @carbon.method
  @impl.adapted
  SetShaderOption(name, value)
  {
    if (this.effect && typeof this.effect.SetOption === "function")
    {
      this.effect.SetOption(name, value);
    }
  }

  @carbon.method
  @impl.adapted
  SetPrimaryTextureParameter(parameter)
  {
    this.primaryTextureParameter = parameter ?? null;
  }

  @carbon.method
  @impl.adapted
  AddLightFromSOF(light)
  {
    this.lights.push(EveBannerLight.FromSOF(light));
  }

  /** Carbon EveBannerSet::RegisterComponents (cpp:457-464): LightOwner
   * UNCONDITIONAL (no lights-empty check, unlike the other packed sets -
   * GetLights self-gates on display/lights instead, cpp:468). */
  @carbon.method
  @impl.implemented
  RegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      registry.RegisterComponent(EveComponentType.LightOwner, this);
    }
  }

  /** Carbon EveBannerSet::UpdateLights (cpp:164-183): the shared packed-set
   * bone pattern (boneIndex > 0 only; column-stride Float4x3 unpack; 4th
   * column zeroed, [15] = 1; boneMatrix *= parentTransform - Carbon
   * row-vector, bone FIRST: gl operands SWAP; else copy the parent). Stamps
   * the activation strength (boosterGain unused by banners). */
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

  /** Carbon EveBannerSet::GetAverageColor (cpp:441-455): the PRIMARY texture
   * parameter's average color, (0,0,0,0) when the map or resource is
   * missing (contrast EvePlaneSet's white default and four-map product). */
  @carbon.method
  @impl.adapted
  @impl.reason("The texture average color is a resource capability - read as a GetAverageColor duck on the parameter's resource, zero when absent.")
  GetAverageColor(out = new Float32Array(4))
  {
    const average = this.primaryTextureParameter?.GetResource?.()?.GetAverageColor?.();
    if (average)
    {
      out[0] = average[0];
      out[1] = average[1];
      out[2] = average[2];
      out[3] = average[3];
    }
    else
    {
      out.fill(0);
    }
    return out;
  }

  /** Carbon EveBannerSet::GetLights (cpp:466-491): the ONLY packed set with
   * a display gate in GetLights (its registration is unconditional,
   * cpp:457-464); an averageColor with zero alpha submits NOTHING (texture
   * not loaded yet, cpp:474-477); the loop iterates BY VALUE (`auto light`,
   * cpp:482) - the authored color is REPLACED entirely by
   * Saturate(averageColor, saturation) on a scratch copy (cpp:484 -
   * contrast EvePlaneSet's multiply); no blink/fade; point conversion on
   * the bone matrix. */
  @carbon.method
  @impl.adapted
  @impl.reason("The texture average color and profile packing follow the adapted ducks above.")
  GetLights(lightManager)
  {
    if (!this.display || this.lights.length === 0)
    {
      return;
    }
    const averageColor = EveBannerSet.#averageColorScratch;
    this.GetAverageColor(averageColor);
    if (averageColor[3] === 0)
    {
      return;
    }

    const features = EveBannerSet.#features;
    features.parentBrightness = this.#activationStrength;
    features.parentScale = 1;
    const quality = lightManager?.GetCurrentSpaceSceneShadowQuality?.() ?? 0;
    const record = EveBannerSet.#lightRecord;
    const dataCopy = EveBannerSet.#lightDataScratch;

    for (const light of this.lights)
    {
      CopyLightData(dataCopy, light.lightData);
      Saturate(dataCopy.color, averageColor, light.saturation);
      AsPerPointLightData(record, dataCopy, light.boneMatrix, features, quality);
      record.lightType = Tr2Light.POINT_LIGHT;
      record.lightData = light.lightData;
      record.lightProfile = light.lightProfile;
      record.owner = this;
      lightManager?.AddLight?.(record);
    }
  }

  static #features = { parentBrightness: 0, parentScale: 1 };

  static #lightRecord = CreateLightRecord();

  static #lightDataScratch = CreateLightDataScratch();

  static #averageColorScratch = new Float32Array(4);

  static #copyBanner(source)
  {
    const banner = new EveBannerItem();
    if (!source) return banner;
    banner.bone = Number(source.bone ?? -1) | 0;
    vec3.copy(banner.position, source.position ?? banner.position);
    quat.copy(banner.rotation, source.rotation ?? banner.rotation);
    vec3.copy(banner.scaling, source.scaling ?? banner.scaling);
    banner.angleX = Number(source.angleX ?? 0);
    banner.angleY = Number(source.angleY ?? 0);
    banner.reference = Number(source.reference ?? 0) | 0;
    return banner;
  }

}
