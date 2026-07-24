import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveEntity as _EveEntity } from '../../../generated/eve/EveEntity.js';
import { EveHazeSetLight as _EveHazeSetLight } from './EveHazeSetLight.js';
import { EveComponentType } from '../../EveComponentTypes.js';
import { Tr2Light as _Tr2Light } from '../../lights/Tr2Light.js';
import { MatrixCopyFrom3x4, AsPerPointLightData, CreateLightRecord } from '../../lights/lightConversion.js';

let _initProto, _initClass, _init_effect, _init_extra_effect, _init_display, _init_extra_display, _init_name, _init_extra_name, _init_hazes, _init_extra_hazes, _init_lights, _init_extra_lights;
let _EveHazeSet;
new class extends _identity {
  static [class EveHazeSet extends _EveEntity {
    static {
      ({
        e: [_init_effect, _init_extra_effect, _init_display, _init_extra_display, _init_name, _init_extra_name, _init_hazes, _init_extra_hazes, _init_lights, _init_extra_lights, _initProto],
        c: [_EveHazeSet, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveHazeSet",
        family: "eve/attachment/haze"
      })], [[[void 0, io.rebuild("packedGeometry"), io, io.persist, void 0, type.objectRef("Tr2Effect")], 16, "effect"], [[io, io.persist, type, type.boolean], 16, "display"], [[io, io.persist, type, type.string], 16, "name"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, void 0, type.list("EveHazeSetItem")], 16, "hazes"], [[io, io.persist, void 0, type.list("EveHazeSetLight")], 16, "lights"], [[carbon, carbon.method, impl, impl.implemented], 18, "Setup"], [[carbon, carbon.method, impl, impl.adapted], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted], 18, "Rebuild"], [[carbon, carbon.method, impl, impl.implemented], 18, "AddHazeItem"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetShaderOption"], [[carbon, carbon.method, impl, impl.adapted], 18, "AddLightFromSOF"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterComponents"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateLights"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Profile-index packing is by-reference per lightConversion.js conventions.")], 18, "GetLights"]], 0, void 0, _EveEntity));
    }
    effect = (_initProto(this), _init_effect(this, null));
    display = (_init_extra_effect(this), _init_display(this, true));
    name = (_init_extra_display(this), _init_name(this, ""));
    hazes = (_init_extra_name(this), _init_hazes(this, []));
    lights = (_init_extra_hazes(this), _init_lights(this, []));
    #rebuildRevision = (_init_extra_lights(this), 0);

    /** Carbon m_activationStrength (ctor 0, EveHazeSet.cpp:66) and
     * m_boosterGain (ctor `false` = 0.0f, cpp:67 - a float initialized with a
     * bool, verbatim quirk). Lights are BLACK until UpdateLights runs. */
    #activationStrength = 0;
    #boosterGain = 0;
    Setup(effect) {
      this.effect = effect ?? null;
    }
    Initialize() {
      this.Rebuild();
      return true;
    }
    Rebuild() {
      // Carbon rebuilds packed haze vertices and static bounds here. The
      // backend-neutral runtime keeps the authored graph and invalidates the
      // renderer-facing revision without allocating device resources.
      this.#rebuildRevision++;
      this.__state.rebuild.add("packedGeometry");
    }
    AddHazeItem(item) {
      this.hazes.push(item);
    }
    SetShaderOption(name, value) {
      if (this.effect && typeof this.effect.SetOption === "function") {
        this.effect.SetOption(name, value);
      }
    }
    AddLightFromSOF(light) {
      this.lights.push(_EveHazeSetLight.FromSOF(light));
    }

    /** Carbon EveHazeSet::RegisterComponents (cpp:394-401): LightOwner when
     * lights are authored. */
    RegisterComponents() {
      const registry = this.GetComponentRegistry();
      if (registry && this.lights.length) {
        registry.RegisterComponent(EveComponentType.LightOwner, this);
      }
    }

    /** Carbon EveHazeSet::UpdateLights (cpp:219-239): the shared packed-set
     * bone pattern (boneIndex > 0 only; column-stride Float4x3 unpack; 4th
     * column zeroed, [15] = 1; boneMatrix *= parentTransform - Carbon
     * row-vector, bone FIRST: gl operands SWAP; else copy the parent). Stamps
     * BOTH activationStrength and boosterGain (cpp:237-238). */
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

    /** Carbon EveHazeSet::GetLights (cpp:403-418): parentBrightness is set
     * INSIDE the loop (cpp:409) because boosterGainInfluence lights multiply
     * it by the booster gain (cpp:410-413); point conversion on the bone
     * matrix; no blink/fade, no gates. */
    GetLights(lightManager) {
      const features = _EveHazeSet.#features;
      features.parentScale = 1;
      const quality = lightManager?.GetCurrentSpaceSceneShadowQuality?.() ?? 0;
      const record = _EveHazeSet.#lightRecord;
      for (const light of this.lights) {
        features.parentBrightness = this.#activationStrength;
        if (light.boosterGainInfluence) {
          features.parentBrightness *= this.#boosterGain;
        }
        AsPerPointLightData(record, light.lightData, light.boneMatrix, features, quality);
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
  constructor() {
    super(_EveHazeSet), _initClass();
  }
}();

export { _EveHazeSet as EveHazeSet };
//# sourceMappingURL=EveHazeSet.js.map
