// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\Sets\EveSpriteSet.h
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\Sets\EveSpriteSet.cpp
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { EveEntity } from "../../../generated/eve/EveEntity.js";
import { EveSpriteSetItem } from "../../../generated/eve/attachment/sprites/EveSpriteSetItem.js";
import { EveSpriteLight } from "./EveSpriteLight.js";
import { EveComponentType } from "../../EveComponentTypes.js";
import { Blink } from "../EveSpaceObjectAttachmentUtils.js";
import { Tr2Light } from "../../lights/Tr2Light.js";
import { AsPerPointLightData, CreateLightRecord, MatrixCopyFrom3x4 } from "../../lights/lightConversion.js";


@type.define({ className: "EveSpriteSet", family: "eve/attachment/sprites" })
export class EveSpriteSet extends EveEntity
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

  /** Carbon m_activationStrength (ctor default 0, EveSpriteSet.cpp:67 - NOT
   * 1: packed-set lights are BLACK until the owner's update calls
   * UpdateLights). */
  #activationStrength = 0;

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

  @carbon.method
  @impl.implemented
  GetSprites()
  {
    return this.sprites;
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
  GetEffect()
  {
    return this.effect;
  }

  @carbon.method
  @impl.implemented
  SetEffect(effect)
  {
    this.effect = effect ?? null;
  }

  @carbon.method
  @impl.implemented
  SetSkinned(skinned)
  {
    this.skinned = !!skinned;
  }

  @carbon.method
  @impl.adapted
  Rebuild()
  {
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
    const time = lightManager?.GetAnimationTime?.() ?? 0;
    const quality = lightManager?.GetCurrentSpaceSceneShadowQuality?.() ?? 0;
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
      lightManager?.AddLight?.(record);
    }
  }

  static #features = { parentBrightness: 0, parentScale: 1 };

  static #lightRecord = CreateLightRecord();
}
