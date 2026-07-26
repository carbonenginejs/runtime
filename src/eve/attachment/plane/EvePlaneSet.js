// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\Sets\EvePlaneSet.h
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\Sets\EvePlaneSet.cpp
import { box3 } from "@carbonenginejs/runtime-utils/box3";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { EveEntity } from "../../EveEntity.js";
import { EvePlaneLight } from "./EvePlaneLight.js";
import { EveComponentType } from "../../EveComponentTypes.js";
import { Fade, Saturate } from "../EveSpaceObjectAttachmentUtils.js";
import { Tr2Light } from "../../lights/Tr2Light.js";
import { CreateItemSetBoundingBoxes, GetItemSetAabb } from "../itemSetBounds.js";
import {
  AsPerPointLightData,
  CopyLightData,
  CreateLightDataScratch,
  CreateLightRecord,
  MatrixCopyFrom3x4
} from "../../lights/lightConversion.js";

const WHITE = new Float32Array([1, 1, 1, 1]);


@type.define({ className: "EvePlaneSet", family: "eve/attachment/planes" })
export class EvePlaneSet extends EveEntity
{
  @io.rebuild("packedGeometry")
  @io.notify
  @io.persist
  @type.uint8
  pickBufferID = 0;

  @io.persist
  @type.boolean
  hideOnLowQuality = false;

  @io.rebuild("packedGeometry")
  @io.persist
  @type.objectRef("Tr2Effect")
  effect = null;

  @io.rebuild("packedGeometry")
  @io.persist
  @type.boolean
  skinned = false;

  @io.persist
  @type.boolean
  display = true;

  @io.persist
  @type.string
  name = "";

  @io.rebuild("packedGeometry")
  @io.persist
  @type.list("EvePlaneSetItem")
  planes = [];

  @io.persist
  @type.list("EvePlaneLight")
  lights = [];

  // SOF-authored shared texture parameters; persisted so the values
  // interchange reproduces Carbon's hidden plane-set bindings.
  @io.persist
  @type.objectRef("TriTextureParameter")
  imageMapParameter = null;

  @io.persist
  @type.objectRef("TriTextureParameter")
  layerMap1Parameter = null;

  @io.persist
  @type.objectRef("TriTextureParameter")
  layerMap2Parameter = null;

  @io.persist
  @type.objectRef("TriTextureParameter")
  maskMapParameter = null;
  #rebuildRevision = 0;

  /** m_aabb - the union of every unskinned, non-transparent plane (cpp:323-355). */
  #staticBounds = box3.create();

  /** m_boundingBoxes - [{ boneIndex, bounds }], ascending. */
  #boneBounds = [];

  /** Carbon m_activationStrength (ctor 0, EvePlaneSet.cpp:76). Lights are
   * BLACK until UpdateLights runs. */
  #activationStrength = 0;

  @carbon.method
  @impl.adapted
  Rebuild()
  {
    // Packed vertices, bounds caches and quad registration are reconciled by
    // the renderer adapter from this authored graph.
    this.#rebuildRevision++;
    this.__state.rebuild.add("packedGeometry");
    // Carbon CreateBoundingBoxes (cpp:323-355) is the shared builder plus one
    // filter: a fully transparent plane contributes NO bounds at all.
    CreateItemSetBoundingBoxes(
      this.#staticBounds,
      this.#boneBounds,
      this.skinned,
      this.planes.filter(item => !EvePlaneSet.#IsFullyTransparent(item))
    );
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
  SetEffect(effect)
  {
    this.effect = effect ?? null;
  }

  @carbon.method
  @impl.adapted
  SetPickBufferID(pickBufferID)
  {
    this.pickBufferID = Number(pickBufferID) & 0xff;
    if (this.planes.length) this.Rebuild();
  }

  /** Carbon EvePlaneSet::GetAabb (cpp:273-276): the item-set bounds, with the bone
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

  /** Carbon EvePlaneSet::UpdateVisibility (cpp:236-246): an uninitialized set is
   * NOT visible; otherwise the bounds move into world space and take the
   * frustum box test. No LOD and no display gate. */
  @carbon.method
  @impl.implemented
  UpdateVisibility(updateContext, parentTransform, bones = null, boneCount = 0)
  {
    const aabb = this.GetAabb(EvePlaneSet.#aabbScratch, bones, boneCount);
    if (box3.isEmpty(aabb))
    {
      return false;
    }

    box3.transformMat4(aabb, aabb, parentTransform);
    return !!updateContext?.GetFrustum?.()?.IsBoxVisible(aabb);
  }

  @carbon.method
  @impl.implemented
  SetIsSkinned(skinned)
  {
    this.skinned = !!skinned;
  }

  @carbon.method
  @impl.implemented
  AddPlaneItem(item)
  {
    this.planes.push(item);
  }

  @carbon.method
  @impl.implemented
  GetPlanes()
  {
    return this.planes;
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
  SetImageMapParameter(parameter)
  {
    this.imageMapParameter = parameter ?? null;
  }

  @carbon.method
  @impl.adapted
  SetLayerMap1Parameter(parameter)
  {
    this.layerMap1Parameter = parameter ?? null;
  }

  @carbon.method
  @impl.adapted
  SetLayerMap2Parameter(parameter)
  {
    this.layerMap2Parameter = parameter ?? null;
  }

  @carbon.method
  @impl.adapted
  SetMaskMapParameter(parameter)
  {
    this.maskMapParameter = parameter ?? null;
  }

  @carbon.method
  @impl.adapted
  AddLightFromSOF(light)
  {
    this.lights.push(EvePlaneLight.FromSOF(light));
  }

  /** Carbon EvePlaneSet::RegisterComponents (cpp:535-542): LightOwner when
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

  /** Carbon EvePlaneSet::UpdateLights (cpp:248-267): the shared packed-set
   * bone pattern (boneIndex > 0 only; column-stride Float4x3 unpack; 4th
   * column zeroed, [15] = 1; boneMatrix *= parentTransform - Carbon
   * row-vector, bone FIRST: gl operands SWAP; else copy the parent). Stamps
   * the activation strength (boosterGain unused by planes). */
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

  /** Carbon EvePlaneSet::GetAverageColor (cpp:499-528): the componentwise
   * product of the four texture parameters' average colors, each defaulting
   * to white when the map or its resource is missing. */
  @carbon.method
  @impl.adapted
  @impl.reason("The texture average color is a resource capability - read as a GetAverageColor duck on the parameter's resource, white when absent.")
  GetAverageColor(out = new Float32Array(4))
  {
    const layer1 = EvePlaneSet.#MapAverageColor(this.layerMap1Parameter);
    const layer2 = EvePlaneSet.#MapAverageColor(this.layerMap2Parameter);
    const image = EvePlaneSet.#MapAverageColor(this.imageMapParameter);
    const mask = EvePlaneSet.#MapAverageColor(this.maskMapParameter);
    for (let channel = 0; channel < 4; channel++)
    {
      out[channel] = layer1[channel] * layer2[channel] * image[channel] * mask[channel];
    }
    return out;
  }

  /** Carbon EvePlaneSet::GetLights (cpp:544-568): parentBrightness set once;
   * average color computed only when lights exist (cpp:550-553; zero
   * otherwise - moot, the loop is empty); the loop iterates BY VALUE
   * (cpp:555-557 `auto light` + lightDataCopy) so the stored items are never
   * mutated - a scratch copy carries: color = authored * averageColor
   * componentwise, then Saturate (extrapolating above 1), then brightness *=
   * Fade(fadeType, ...) (cpp:558-564); point conversion on the bone matrix. */
  @carbon.method
  @impl.adapted
  @impl.reason("Tr2Renderer::GetAnimationTime relocates onto the light-manager duck (GetAnimationTime, default 0); the texture average colors and profile packing follow the adapted ducks above.")
  GetLights(lightManager)
  {
    const features = EvePlaneSet.#features;
    features.parentBrightness = this.#activationStrength;
    features.parentScale = 1;
    const averageColor = EvePlaneSet.#averageColorScratch;
    if (this.lights.length > 0)
    {
      this.GetAverageColor(averageColor);
    }
    const time = lightManager?.GetAnimationTime?.() ?? 0;
    const quality = lightManager?.GetCurrentSpaceSceneShadowQuality?.() ?? 0;
    const record = EvePlaneSet.#lightRecord;
    const dataCopy = EvePlaneSet.#lightDataScratch;

    for (const light of this.lights)
    {
      CopyLightData(dataCopy, light.lightData);
      dataCopy.color[0] *= averageColor[0];
      dataCopy.color[1] *= averageColor[1];
      dataCopy.color[2] *= averageColor[2];
      dataCopy.color[3] *= averageColor[3];
      Saturate(dataCopy.color, dataCopy.color, light.saturation);
      dataCopy.brightness *= Fade(time, light.fadeType, light.blinkRate, light.blinkPhase);
      AsPerPointLightData(record, dataCopy, light.boneMatrix, features, quality);
      record.lightType = Tr2Light.POINT_LIGHT;
      record.lightData = light.lightData;
      record.lightProfile = light.lightProfile;
      record.owner = this;
      lightManager?.AddLight?.(record);
    }
  }

  static #MapAverageColor(parameter)
  {
    const average = parameter?.GetResource?.()?.GetAverageColor?.();
    return average ?? WHITE;
  }

  static #features = { parentBrightness: 0, parentScale: 1 };

  /** Carbon CreateBoundingBoxes skips an item whose color is exactly
   * Color(0, 0, 0, 0) (cpp:332-335) - an authored "off" plane contributes no
   * bounds. Any non-zero channel, alpha included, counts. */
  static #IsFullyTransparent(item)
  {
    const color = item?.color;
    return !!color && !color[0] && !color[1] && !color[2] && !color[3];
  }

  /** Per-frame scratch - UpdateVisibility must not allocate. */
  static #aabbScratch = box3.create();

  static #lightRecord = CreateLightRecord();

  static #lightDataScratch = CreateLightDataScratch();

  static #averageColorScratch = new Float32Array(4);
}
