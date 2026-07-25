import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveEntity as _EveEntity } from '../../EveEntity.js';
import { EvePlaneLight as _EvePlaneLight } from './EvePlaneLight.js';
import { EveComponentType } from '../../EveComponentTypes.js';
import { Saturate, Fade } from '../EveSpaceObjectAttachmentUtils.js';
import { Tr2Light as _Tr2Light } from '../../lights/Tr2Light.js';
import { MatrixCopyFrom3x4, CopyLightData, AsPerPointLightData, CreateLightRecord, CreateLightDataScratch } from '../../lights/lightConversion.js';

let _initProto, _initClass, _init_pickBufferID, _init_extra_pickBufferID, _init_hideOnLowQuality, _init_extra_hideOnLowQuality, _init_effect, _init_extra_effect, _init_skinned, _init_extra_skinned, _init_display, _init_extra_display, _init_name, _init_extra_name, _init_planes, _init_extra_planes, _init_lights, _init_extra_lights, _init_imageMapParameter, _init_extra_imageMapParameter, _init_layerMap1Parameter, _init_extra_layerMap1Parameter, _init_layerMap2Parameter, _init_extra_layerMap2Parameter, _init_maskMapParameter, _init_extra_maskMapParameter;
const WHITE = new Float32Array([1, 1, 1, 1]);
let _EvePlaneSet;
new class extends _identity {
  static [class EvePlaneSet extends _EveEntity {
    static {
      ({
        e: [_init_pickBufferID, _init_extra_pickBufferID, _init_hideOnLowQuality, _init_extra_hideOnLowQuality, _init_effect, _init_extra_effect, _init_skinned, _init_extra_skinned, _init_display, _init_extra_display, _init_name, _init_extra_name, _init_planes, _init_extra_planes, _init_lights, _init_extra_lights, _init_imageMapParameter, _init_extra_imageMapParameter, _init_layerMap1Parameter, _init_extra_layerMap1Parameter, _init_layerMap2Parameter, _init_extra_layerMap2Parameter, _init_maskMapParameter, _init_extra_maskMapParameter, _initProto],
        c: [_EvePlaneSet, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EvePlaneSet",
        family: "eve/attachment/planes"
      })], [[[void 0, io.rebuild("packedGeometry"), io, io.notify, io, io.persist, type, type.uint8], 16, "pickBufferID"], [[io, io.persist, type, type.boolean], 16, "hideOnLowQuality"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, void 0, type.objectRef("Tr2Effect")], 16, "effect"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.boolean], 16, "skinned"], [[io, io.persist, type, type.boolean], 16, "display"], [[io, io.persist, type, type.string], 16, "name"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, void 0, type.list("EvePlaneSetItem")], 16, "planes"], [[io, io.persist, void 0, type.list("EvePlaneLight")], 16, "lights"], [[io, io.persist, void 0, type.objectRef("TriTextureParameter")], 16, "imageMapParameter"], [[io, io.persist, void 0, type.objectRef("TriTextureParameter")], 16, "layerMap1Parameter"], [[io, io.persist, void 0, type.objectRef("TriTextureParameter")], 16, "layerMap2Parameter"], [[io, io.persist, void 0, type.objectRef("TriTextureParameter")], 16, "maskMapParameter"], [[carbon, carbon.method, impl, impl.adapted], 18, "Rebuild"], [[carbon, carbon.method, impl, impl.adapted], 18, "Initialize"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetEffect"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetPickBufferID"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetIsSkinned"], [[carbon, carbon.method, impl, impl.implemented], 18, "AddPlaneItem"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetPlanes"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetShaderOption"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetImageMapParameter"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetLayerMap1Parameter"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetLayerMap2Parameter"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetMaskMapParameter"], [[carbon, carbon.method, impl, impl.adapted], 18, "AddLightFromSOF"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterComponents"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateLights"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The texture average color is a resource capability - read as a GetAverageColor duck on the parameter's resource, white when absent.")], 18, "GetAverageColor"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Tr2Renderer::GetAnimationTime relocates onto the light-manager duck (GetAnimationTime, default 0); the texture average colors and profile packing follow the adapted ducks above.")], 18, "GetLights"]], 0, void 0, _EveEntity));
    }
    pickBufferID = (_initProto(this), _init_pickBufferID(this, 0));
    hideOnLowQuality = (_init_extra_pickBufferID(this), _init_hideOnLowQuality(this, false));
    effect = (_init_extra_hideOnLowQuality(this), _init_effect(this, null));
    skinned = (_init_extra_effect(this), _init_skinned(this, false));
    display = (_init_extra_skinned(this), _init_display(this, true));
    name = (_init_extra_display(this), _init_name(this, ""));
    planes = (_init_extra_name(this), _init_planes(this, []));
    lights = (_init_extra_planes(this), _init_lights(this, []));

    // SOF-authored shared texture parameters; persisted so the values
    // interchange reproduces Carbon's hidden plane-set bindings.
    imageMapParameter = (_init_extra_lights(this), _init_imageMapParameter(this, null));
    layerMap1Parameter = (_init_extra_imageMapParameter(this), _init_layerMap1Parameter(this, null));
    layerMap2Parameter = (_init_extra_layerMap1Parameter(this), _init_layerMap2Parameter(this, null));
    maskMapParameter = (_init_extra_layerMap2Parameter(this), _init_maskMapParameter(this, null));
    #rebuildRevision = (_init_extra_maskMapParameter(this), 0);

    /** Carbon m_activationStrength (ctor 0, EvePlaneSet.cpp:76). Lights are
     * BLACK until UpdateLights runs. */
    #activationStrength = 0;
    Rebuild() {
      // Packed vertices, bounds caches and quad registration are reconciled by
      // the renderer adapter from this authored graph.
      this.#rebuildRevision++;
      this.__state.rebuild.add("packedGeometry");
    }
    Initialize() {
      this.Rebuild();
      return true;
    }
    SetEffect(effect) {
      this.effect = effect ?? null;
    }
    SetPickBufferID(pickBufferID) {
      this.pickBufferID = Number(pickBufferID) & 0xff;
      if (this.planes.length) this.Rebuild();
    }
    SetIsSkinned(skinned) {
      this.skinned = !!skinned;
    }
    AddPlaneItem(item) {
      this.planes.push(item);
    }
    GetPlanes() {
      return this.planes;
    }
    SetShaderOption(name, value) {
      if (this.effect && typeof this.effect.SetOption === "function") {
        this.effect.SetOption(name, value);
      }
    }
    SetImageMapParameter(parameter) {
      this.imageMapParameter = parameter ?? null;
    }
    SetLayerMap1Parameter(parameter) {
      this.layerMap1Parameter = parameter ?? null;
    }
    SetLayerMap2Parameter(parameter) {
      this.layerMap2Parameter = parameter ?? null;
    }
    SetMaskMapParameter(parameter) {
      this.maskMapParameter = parameter ?? null;
    }
    AddLightFromSOF(light) {
      this.lights.push(_EvePlaneLight.FromSOF(light));
    }

    /** Carbon EvePlaneSet::RegisterComponents (cpp:535-542): LightOwner when
     * lights are authored. */
    RegisterComponents() {
      const registry = this.GetComponentRegistry();
      if (registry && this.lights.length) {
        registry.RegisterComponent(EveComponentType.LightOwner, this);
      }
    }

    /** Carbon EvePlaneSet::UpdateLights (cpp:248-267): the shared packed-set
     * bone pattern (boneIndex > 0 only; column-stride Float4x3 unpack; 4th
     * column zeroed, [15] = 1; boneMatrix *= parentTransform - Carbon
     * row-vector, bone FIRST: gl operands SWAP; else copy the parent). Stamps
     * the activation strength (boosterGain unused by planes). */
    UpdateLights(parentTransform, bones, boneCount, activationStrength, _boosterGain = 0) {
      for (const light of this.lights) {
        const boneIndex = light.lightData.boneIndex;
        if (bones && boneIndex > 0 && boneIndex < boneCount) {
          MatrixCopyFrom3x4(light.boneMatrix, bones, boneIndex);
          light.boneMatrix[3] = 0;
          light.boneMatrix[7] = 0;
          light.boneMatrix[11] = 0;
          light.boneMatrix[15] = 1;
          // Carbon (row-vector): boneMatrix * parentTransform - bone first.
          mat4.multiply(light.boneMatrix, parentTransform, light.boneMatrix);
        } else {
          mat4.copy(light.boneMatrix, parentTransform);
        }
      }
      this.#activationStrength = Number(activationStrength) || 0;
    }

    /** Carbon EvePlaneSet::GetAverageColor (cpp:499-528): the componentwise
     * product of the four texture parameters' average colors, each defaulting
     * to white when the map or its resource is missing. */
    GetAverageColor(out = new Float32Array(4)) {
      const layer1 = _EvePlaneSet.#MapAverageColor(this.layerMap1Parameter);
      const layer2 = _EvePlaneSet.#MapAverageColor(this.layerMap2Parameter);
      const image = _EvePlaneSet.#MapAverageColor(this.imageMapParameter);
      const mask = _EvePlaneSet.#MapAverageColor(this.maskMapParameter);
      for (let channel = 0; channel < 4; channel++) {
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
    GetLights(lightManager) {
      const features = _EvePlaneSet.#features;
      features.parentBrightness = this.#activationStrength;
      features.parentScale = 1;
      const averageColor = _EvePlaneSet.#averageColorScratch;
      if (this.lights.length > 0) {
        this.GetAverageColor(averageColor);
      }
      const time = lightManager?.GetAnimationTime?.() ?? 0;
      const quality = lightManager?.GetCurrentSpaceSceneShadowQuality?.() ?? 0;
      const record = _EvePlaneSet.#lightRecord;
      const dataCopy = _EvePlaneSet.#lightDataScratch;
      for (const light of this.lights) {
        CopyLightData(dataCopy, light.lightData);
        dataCopy.color[0] *= averageColor[0];
        dataCopy.color[1] *= averageColor[1];
        dataCopy.color[2] *= averageColor[2];
        dataCopy.color[3] *= averageColor[3];
        Saturate(dataCopy.color, dataCopy.color, light.saturation);
        dataCopy.brightness *= Fade(time, light.fadeType, light.blinkRate, light.blinkPhase);
        AsPerPointLightData(record, dataCopy, light.boneMatrix, features, quality);
        record.lightType = _Tr2Light.POINT_LIGHT;
        record.lightData = light.lightData;
        record.lightProfile = light.lightProfile;
        record.owner = this;
        lightManager?.AddLight?.(record);
      }
    }
  }];
  #MapAverageColor(parameter) {
    const average = parameter?.GetResource?.()?.GetAverageColor?.();
    return average ?? WHITE;
  }
  #features = {
    parentBrightness: 0,
    parentScale: 1
  };
  #lightRecord = CreateLightRecord();
  #lightDataScratch = CreateLightDataScratch();
  #averageColorScratch = new Float32Array(4);
  constructor() {
    super(_EvePlaneSet), _initClass();
  }
}();

export { _EvePlaneSet as EvePlaneSet };
//# sourceMappingURL=EvePlaneSet.js.map
