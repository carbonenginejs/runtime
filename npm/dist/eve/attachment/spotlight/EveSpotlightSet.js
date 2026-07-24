import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveEntity as _EveEntity } from '../../../generated/eve/EveEntity.js';
import { EveSpotlightLight as _EveSpotlightLight } from './EveSpotlightLight.js';
import { EveComponentType } from '../../EveComponentTypes.js';
import { Tr2Light as _Tr2Light } from '../../lights/Tr2Light.js';
import { MatrixCopyFrom3x4, AsPerSpotLightData, CreateLightRecord } from '../../lights/lightConversion.js';

let _initProto, _initClass, _init_spotlightItems, _init_extra_spotlightItems, _init_name, _init_extra_name, _init_display, _init_extra_display, _init_coneEffect, _init_extra_coneEffect, _init_glowEffect, _init_extra_glowEffect, _init_skinned, _init_extra_skinned, _init_intensity, _init_extra_intensity, _init_lights, _init_extra_lights;
let _EveSpotlightSet;
new class extends _identity {
  static [class EveSpotlightSet extends _EveEntity {
    static {
      ({
        e: [_init_spotlightItems, _init_extra_spotlightItems, _init_name, _init_extra_name, _init_display, _init_extra_display, _init_coneEffect, _init_extra_coneEffect, _init_glowEffect, _init_extra_glowEffect, _init_skinned, _init_extra_skinned, _init_intensity, _init_extra_intensity, _init_lights, _init_extra_lights, _initProto],
        c: [_EveSpotlightSet, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveSpotlightSet",
        family: "eve/attachment/spotlights"
      })], [[[void 0, io.rebuild("packedGeometry"), io, io.persist, void 0, type.list("EveSpotlightSetItem")], 16, "spotlightItems"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.boolean], 16, "display"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, void 0, type.objectRef("Tr2Effect")], 16, "coneEffect"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, void 0, type.objectRef("Tr2Effect")], 16, "glowEffect"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.boolean], 16, "skinned"], [[io, io.persist, type, type.float32], 16, "intensity"], [[io, io.persist, void 0, type.list("EveSpotlightLight")], 16, "lights"], [[carbon, carbon.method, impl, impl.adapted], 18, "Rebuild"], [[carbon, carbon.method, impl, impl.adapted], 18, "Initialize"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetConeEffect"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetConeEffect"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetGlowEffect"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetGlowEffect"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetSkinned"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetName"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetName"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetSpotlightItems"], [[carbon, carbon.method, impl, impl.implemented], 18, "AddSpotlightItem"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetShaderOption"], [[carbon, carbon.method, impl, impl.adapted], 18, "AddLightFromSOF"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterComponents"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateLights"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Profile-index packing is by-reference per lightConversion.js conventions.")], 18, "GetLights"]], 0, void 0, _EveEntity));
    }
    spotlightItems = (_initProto(this), _init_spotlightItems(this, []));
    name = (_init_extra_spotlightItems(this), _init_name(this, ""));
    display = (_init_extra_name(this), _init_display(this, true));
    coneEffect = (_init_extra_display(this), _init_coneEffect(this, null));
    glowEffect = (_init_extra_coneEffect(this), _init_glowEffect(this, null));
    skinned = (_init_extra_glowEffect(this), _init_skinned(this, false));
    intensity = (_init_extra_skinned(this), _init_intensity(this, 1));
    lights = (_init_extra_intensity(this), _init_lights(this, []));
    #rebuildRevision = (_init_extra_lights(this), 0);

    /** Carbon m_activationStrength / m_boosterGain (ctor 0 / 0,
     * EveSpotlightSet.cpp:90-91). Lights are BLACK until UpdateLights runs. */
    #activationStrength = 0;
    #boosterGain = 0;
    Rebuild() {
      // Packed cone/glow vertices, bounds caches, effect hashes and quad
      // registration are reconciled by the concrete renderer adapter.
      this.#rebuildRevision++;
      this.__state.rebuild.add("packedGeometry");
    }
    Initialize() {
      this.Rebuild();
      return true;
    }
    GetConeEffect() {
      return this.coneEffect;
    }
    SetConeEffect(effect) {
      this.coneEffect = effect ?? null;
    }
    GetGlowEffect() {
      return this.glowEffect;
    }
    SetGlowEffect(effect) {
      this.glowEffect = effect ?? null;
    }
    SetSkinned(skinned) {
      this.skinned = !!skinned;
    }
    GetName() {
      return this.name;
    }
    SetName(name) {
      this.name = String(name ?? "");
    }
    GetSpotlightItems() {
      return this.spotlightItems;
    }
    AddSpotlightItem(item) {
      this.spotlightItems.push(item);
    }
    SetShaderOption(name, value) {
      if (this.coneEffect && typeof this.coneEffect.SetOption === "function") {
        this.coneEffect.SetOption(name, value);
      }
      if (this.glowEffect && typeof this.glowEffect.SetOption === "function") {
        this.glowEffect.SetOption(name, value);
      }
    }
    AddLightFromSOF(light) {
      this.lights.push(_EveSpotlightLight.FromSOF(light));
    }

    /** Carbon EveSpotlightSet::RegisterComponents (cpp:527-534): LightOwner
     * when lights are authored. */
    RegisterComponents() {
      const registry = this.GetComponentRegistry();
      if (registry && this.lights.length) {
        registry.RegisterComponent(EveComponentType.LightOwner, this);
      }
    }

    /** Carbon EveSpotlightSet::UpdateLights (cpp:150-170): the shared
     * packed-set bone pattern (boneIndex > 0 only; column-stride Float4x3
     * unpack; 4th column zeroed, [15] = 1; boneMatrix *= parentTransform -
     * Carbon row-vector, bone FIRST: gl operands SWAP; else copy the parent).
     * Stamps BOTH activationStrength and boosterGain (cpp:168-169). */
    UpdateLights(parentTransform, bones, boneCount, activationStrength, boosterGain = 0) {
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
      this.#boosterGain = Number(boosterGain) || 0;
    }

    /** Carbon EveSpotlightSet::GetLights (cpp:536-552): the haze pattern
     * (parentBrightness inside the loop, boosterGainInfluence multiply) but
     * with the SPOT conversion (cpp:549) - cos-of-degree angles and the
     * 1/tan(outerAngle) projection-plane distance, Infinity at outerAngle 0
     * exactly as Carbon ships. The spot direction comes from lightData.rotation
     * via the conversion's swapped RotationMatrix * transform composition. */
    GetLights(lightManager) {
      const features = _EveSpotlightSet.#features;
      features.parentScale = 1;
      const quality = lightManager?.GetCurrentSpaceSceneShadowQuality?.() ?? 0;
      const record = _EveSpotlightSet.#lightRecord;
      for (const light of this.lights) {
        features.parentBrightness = this.#activationStrength;
        if (light.boosterGainInfluence) {
          features.parentBrightness *= this.#boosterGain;
        }
        AsPerSpotLightData(record, light.lightData, light.boneMatrix, features, quality);
        record.lightType = _Tr2Light.SPOT_LIGHT;
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
  constructor() {
    super(_EveSpotlightSet), _initClass();
  }
}();

export { _EveSpotlightSet as EveSpotlightSet };
//# sourceMappingURL=EveSpotlightSet.js.map
