import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveEntity as _EveEntity } from '../../EveEntity.js';
import { EveBannerItem as _EveBannerItem } from './EveBannerItem.js';
import { EveBannerLight as _EveBannerLight } from './EveBannerLight.js';
import { EveComponentType } from '../../EveComponentTypes.js';
import { Saturate } from '../EveSpaceObjectAttachmentUtils.js';
import { Tr2Light as _Tr2Light } from '../../lights/Tr2Light.js';
import { MatrixCopyFrom3x4, CopyLightData, AsPerPointLightData, CreateLightRecord, CreateLightDataScratch } from '../../lights/lightConversion.js';

let _initProto, _initStatic, _initClass, _init_banners, _init_extra_banners, _init_name, _init_extra_name, _init_effect, _init_extra_effect, _init_isPickable, _init_extra_isPickable, _init_display, _init_extra_display, _init_key, _init_extra_key, _init_lights, _init_extra_lights, _init_primaryTextureParameter, _init_extra_primaryTextureParameter;
let _EveBannerSet;
new class extends _identity {
  static [class EveBannerSet extends _EveEntity {
    static {
      ({
        e: [_init_banners, _init_extra_banners, _init_name, _init_extra_name, _init_effect, _init_extra_effect, _init_isPickable, _init_extra_isPickable, _init_display, _init_extra_display, _init_key, _init_extra_key, _init_lights, _init_extra_lights, _init_primaryTextureParameter, _init_extra_primaryTextureParameter, _initProto, _initStatic],
        c: [_EveBannerSet, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveBannerSet",
        family: "eve/attachment/banners"
      })], [[[void 0, io.rebuild("packedGeometry"), io, io.persist, void 0, type.list("EveBannerItem")], 16, "banners"], [[io, io.persist, type, type.string], 16, "name"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, void 0, type.objectRef("Tr2Effect")], 16, "effect"], [[io, io.persist, type, type.boolean], 16, "isPickable"], [[io, io.readwrite, type, type.boolean], 16, "display"], [[io, io.persist, type, type.int32], 16, "key"], [[io, io.persist, void 0, type.list("EveBannerLight")], 16, "lights"], [[io, io.persist, void 0, type.objectRef("TriTextureParameter")], 16, "primaryTextureParameter"], [[carbon, carbon.method, impl, impl.adapted], 18, "Rebuild"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetReference"], [[carbon, carbon.method, impl, impl.implemented], 26, "GetBannerAspectRatio"], [[carbon, carbon.method, impl, impl.adapted], 18, "Initialize"], [[carbon, carbon.method, impl, impl.implemented], 18, "AddBanner"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetEffect"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetKey"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetPickingID"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetShaderOption"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetPrimaryTextureParameter"], [[carbon, carbon.method, impl, impl.adapted], 18, "AddLightFromSOF"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterComponents"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateLights"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The texture average color is a resource capability - read as a GetAverageColor duck on the parameter's resource, zero when absent.")], 18, "GetAverageColor"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The texture average color and profile packing follow the adapted ducks above.")], 18, "GetLights"]], 0, void 0, _EveEntity));
      _initStatic(this);
    }
    banners = (_initProto(this), _init_banners(this, []));
    name = (_init_extra_banners(this), _init_name(this, ""));
    effect = (_init_extra_name(this), _init_effect(this, null));
    isPickable = (_init_extra_effect(this), _init_isPickable(this, false));
    display = (_init_extra_isPickable(this), _init_display(this, true));
    key = (_init_extra_display(this), _init_key(this, 0));
    lights = (_init_extra_key(this), _init_lights(this, []));

    // SOF-authored primary banner texture parameter; persisted so the values
    // interchange reproduces Carbon's hidden banner binding.
    primaryTextureParameter = (_init_extra_lights(this), _init_primaryTextureParameter(this, null));
    #rebuildRevision = (_init_extra_primaryTextureParameter(this), 0);

    /** Carbon m_activationStrength (ctor 0, EveBannerSet.cpp:94). Lights are
     * BLACK until UpdateLights runs. */
    #activationStrength = 0;
    Rebuild() {
      // Physical geometry, buffers, bounds and batches are backend work.
      this.#rebuildRevision++;
      this.__state.rebuild.add("packedGeometry");
    }
    GetReference(index) {
      return this.banners[index].reference;
    }

    /** Measures the generated banner surface exactly as Carbon does: flat
     * banners use authored X/Y scale, while curved banners sum the same
     * approximately five-degree transformed arc chords used by geometry
     * generation. */
    static GetBannerAspectRatio(banner) {
      const flatX = banner.angleX <= 0;
      const flatY = banner.angleY <= 0;
      if (flatX && flatY) {
        return banner.scaling[0] / banner.scaling[1];
      }
      const transform = mat4.fromRotationTranslationScale(_EveBannerSet.#aspectTransform, banner.rotation, banner.position, banner.scaling);
      if (flatX) {
        const angleY = _EveBannerSet.#clampBannerAngle(banner.angleY);
        const halfAngleY = angleY / 180 * Math.PI / 2;
        const scaleY = 0.5 / Math.sin(halfAngleY);
        const vLength = _EveBannerSet.#measureVerticalArc(transform, angleY, halfAngleY, scaleY, scaleY);
        return banner.scaling[0] / vLength;
      }
      if (flatY) {
        const angleX = _EveBannerSet.#clampBannerAngle(banner.angleX);
        const halfAngleX = angleX / 180 * Math.PI / 2;
        const scaleX = 0.5 / Math.sin(halfAngleX);
        const uLength = _EveBannerSet.#measureHorizontalArc(transform, angleX, halfAngleX, scaleX, scaleX);
        return uLength / banner.scaling[1];
      }
      const angleX = _EveBannerSet.#clampBannerAngle(banner.angleX);
      const angleY = _EveBannerSet.#clampBannerAngle(banner.angleY);
      const halfAngleX = angleX / 180 * Math.PI / 2;
      const halfAngleY = angleY / 180 * Math.PI / 2;
      const scaleX = 0.5 / Math.sin(halfAngleX);
      const scaleY = 0.5 / Math.sin(halfAngleY);
      const scaleZ = Math.min(scaleX, scaleY);
      const uLength = _EveBannerSet.#measureHorizontalArc(transform, angleX, halfAngleX, scaleX, scaleZ);
      const vLength = _EveBannerSet.#measureVerticalArc(transform, angleY, halfAngleY, scaleY, scaleZ);
      return uLength / vLength;
    }
    Initialize() {
      this.Rebuild();
      return true;
    }
    AddBanner(banner) {
      const copy = _EveBannerSet.#copyBanner(banner);
      this.banners.push(copy);
      return copy;
    }
    SetEffect(effect) {
      this.effect = effect ?? null;
    }
    SetKey(key) {
      this.key = Number(key) | 0;
    }
    GetPickingID() {
      return 101 + this.key >>> 0;
    }
    SetShaderOption(name, value) {
      if (this.effect && typeof this.effect.SetOption === "function") {
        this.effect.SetOption(name, value);
      }
    }
    SetPrimaryTextureParameter(parameter) {
      this.primaryTextureParameter = parameter ?? null;
    }
    AddLightFromSOF(light) {
      this.lights.push(_EveBannerLight.FromSOF(light));
    }

    /** Carbon EveBannerSet::RegisterComponents (cpp:457-464): LightOwner
     * UNCONDITIONAL (no lights-empty check, unlike the other packed sets -
     * GetLights self-gates on display/lights instead, cpp:468). */
    RegisterComponents() {
      const registry = this.GetComponentRegistry();
      if (registry) {
        registry.RegisterComponent(EveComponentType.LightOwner, this);
      }
    }

    /** Carbon EveBannerSet::UpdateLights (cpp:164-183): the shared packed-set
     * bone pattern (boneIndex > 0 only; column-stride Float4x3 unpack; 4th
     * column zeroed, [15] = 1; boneMatrix *= parentTransform - Carbon
     * row-vector, bone FIRST: gl operands SWAP; else copy the parent). Stamps
     * the activation strength (boosterGain unused by banners). */
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

    /** Carbon EveBannerSet::GetAverageColor (cpp:441-455): the PRIMARY texture
     * parameter's average color, (0,0,0,0) when the map or resource is
     * missing (contrast EvePlaneSet's white default and four-map product). */
    GetAverageColor(out = new Float32Array(4)) {
      const average = this.primaryTextureParameter?.GetResource?.()?.GetAverageColor?.();
      if (average) {
        out[0] = average[0];
        out[1] = average[1];
        out[2] = average[2];
        out[3] = average[3];
      } else {
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
    GetLights(lightManager) {
      if (!this.display || this.lights.length === 0) {
        return;
      }
      const averageColor = _EveBannerSet.#averageColorScratch;
      this.GetAverageColor(averageColor);
      if (averageColor[3] === 0) {
        return;
      }
      const features = _EveBannerSet.#features;
      features.parentBrightness = this.#activationStrength;
      features.parentScale = 1;
      const quality = lightManager?.GetCurrentSpaceSceneShadowQuality?.() ?? 0;
      const record = _EveBannerSet.#lightRecord;
      const dataCopy = _EveBannerSet.#lightDataScratch;
      for (const light of this.lights) {
        CopyLightData(dataCopy, light.lightData);
        Saturate(dataCopy.color, averageColor, light.saturation);
        AsPerPointLightData(record, dataCopy, light.boneMatrix, features, quality);
        record.lightType = _Tr2Light.POINT_LIGHT;
        record.lightData = light.lightData;
        record.lightProfile = light.lightProfile;
        record.owner = this;
        lightManager?.AddLight?.(record);
      }
    }
  }];
  #features = {
    parentBrightness: 0,
    parentScale: 1
  };
  #lightRecord = CreateLightRecord();
  #lightDataScratch = CreateLightDataScratch();
  #averageColorScratch = new Float32Array(4);
  #aspectTransform = mat4.create();
  #aspectPosition = vec3.create();
  #aspectPreviousPosition = vec3.create();
  #clampBannerAngle(angle) {
    return Math.max(0, Math.min(Number(angle), 180));
  }
  #measureHorizontalArc(transform, angle, halfAngle, scaleX, scaleZ) {
    const segments = 1 + Math.floor(angle / 5);
    const position = _EveBannerSet.#aspectPosition;
    const previous = _EveBannerSet.#aspectPreviousPosition;
    let length = 0;
    for (let index = 0; index <= segments; index++) {
      const value = index / segments;
      const sampleAngle = -halfAngle + value * 2 * halfAngle;
      vec3.set(position, Math.sin(sampleAngle) * scaleX, 0, (Math.cos(sampleAngle) - 1) * scaleZ);
      vec3.transformMat4(position, position, transform);
      if (index) length += vec3.distance(previous, position);
      vec3.copy(previous, position);
    }
    return length;
  }
  #measureVerticalArc(transform, angle, halfAngle, scaleY, scaleZ) {
    const segments = 1 + Math.floor(angle / 5);
    const position = _EveBannerSet.#aspectPosition;
    const previous = _EveBannerSet.#aspectPreviousPosition;
    let length = 0;
    for (let index = 0; index <= segments; index++) {
      const value = index / segments;
      const sampleAngle = -halfAngle + value * 2 * halfAngle + Math.PI / 2;
      vec3.set(position, 0, Math.cos(sampleAngle) * scaleY, (Math.sin(sampleAngle) - 1) * scaleZ);
      vec3.transformMat4(position, position, transform);
      if (index) length += vec3.distance(previous, position);
      vec3.copy(previous, position);
    }
    return length;
  }
  #copyBanner(source) {
    const banner = new _EveBannerItem();
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
  constructor() {
    super(_EveBannerSet), _initClass();
  }
}();

export { _EveBannerSet as EveBannerSet };
//# sourceMappingURL=EveBannerSet.js.map
