import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveEntity as _EveEntity } from '../../EveEntity.js';
import { EveSpriteLight as _EveSpriteLight } from './EveSpriteLight.js';
import { EveComponentType } from '../../EveComponentTypes.js';
import { Blink } from '../EveSpaceObjectAttachmentUtils.js';
import { Tr2Light as _Tr2Light } from '../../lights/Tr2Light.js';
import { MatrixCopyFrom3x4, AsPerPointLightData, CreateLightRecord } from '../../lights/lightConversion.js';

let _initProto, _initClass, _init_spriteLines, _init_extra_spriteLines, _init_skinned, _init_extra_skinned, _init_effectHash, _init_extra_effectHash, _init_effect, _init_extra_effect, _init_display, _init_extra_display, _init_name, _init_extra_name, _init_lights, _init_extra_lights;
let _EveSpriteLineSet;
new class extends _identity {
  static [class EveSpriteLineSet extends _EveEntity {
    static {
      ({
        e: [_init_spriteLines, _init_extra_spriteLines, _init_skinned, _init_extra_skinned, _init_effectHash, _init_extra_effectHash, _init_effect, _init_extra_effect, _init_display, _init_extra_display, _init_name, _init_extra_name, _init_lights, _init_extra_lights, _initProto],
        c: [_EveSpriteLineSet, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveSpriteLineSet",
        family: "eve/attachment/sprites"
      })], [[[void 0, io.rebuild("packedGeometry"), io, io.persist, void 0, type.list("EveSpriteLineSetItem")], 16, "spriteLines"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.boolean], 16, "skinned"], [[io, io.read, type, type.uint32], 16, "effectHash"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, void 0, type.objectRef("Tr2Effect")], 16, "effect"], [[io, io.readwrite, type, type.boolean], 16, "display"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, void 0, type.list("EveSpriteLight")], 16, "lights"], [[carbon, carbon.method, impl, impl.adapted], 18, "Rebuild"], [[carbon, carbon.method, impl, impl.adapted], 18, "Initialize"], [[carbon, carbon.method, impl, impl.implemented], 18, "Setup"], [[carbon, carbon.method, impl, impl.implemented], 18, "Add"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetShaderOption"], [[carbon, carbon.method, impl, impl.adapted], 18, "AddLightFromSOF"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterComponents"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateLights"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Tr2Renderer::GetAnimationTime relocates onto the light-manager duck (GetAnimationTime, default 0); profile-index packing is by-reference per lightConversion.js.")], 18, "GetLights"]], 0, void 0, _EveEntity));
    }
    spriteLines = (_initProto(this), _init_spriteLines(this, []));
    skinned = (_init_extra_spriteLines(this), _init_skinned(this, false));
    effectHash = (_init_extra_skinned(this), _init_effectHash(this, 0));
    effect = (_init_extra_effectHash(this), _init_effect(this, null));
    display = (_init_extra_effect(this), _init_display(this, true));
    name = (_init_extra_display(this), _init_name(this, ""));
    lights = (_init_extra_name(this), _init_lights(this, []));
    #rebuildRevision = (_init_extra_lights(this), 0);

    /** Carbon m_activationStrength (ctor default 0, EveSpriteLineSet.cpp:26 -
     * NOT 1: packed-set lights are BLACK until UpdateLights runs). */
    #activationStrength = 0;
    Rebuild() {
      // Position expansion is available on each item, but packed quad data,
      // effect hashes, bounds caches and registration belong to the adapter.
      this.#rebuildRevision++;
      this.__state.rebuild.add("packedGeometry");
    }
    Initialize() {
      this.Rebuild();
      return true;
    }
    Setup(effect, isSkinned) {
      this.effect = effect ?? null;
      this.skinned = !!isSkinned;
    }
    Add(item) {
      this.spriteLines.push(item);
    }
    SetShaderOption(name, value) {
      if (this.effect && typeof this.effect.SetOption === "function") {
        this.effect.SetOption(name, value);
      }
    }
    AddLightFromSOF(light) {
      this.lights.push(_EveSpriteLight.FromSOF(light));
    }

    /** Carbon EveSpriteLineSet::RegisterComponents (cpp:349-356): LightOwner
     * when lights are authored. */
    RegisterComponents() {
      const registry = this.GetComponentRegistry();
      if (registry && this.lights.length) {
        registry.RegisterComponent(EveComponentType.LightOwner, this);
      }
    }

    /** Carbon EveSpriteLineSet::UpdateLights (cpp:152-171): byte-identical to
     * EveSpriteSet's - boneIndex > 0 only (bone 0 never drives a packed-set
     * light), column-stride Float4x3 unpack, 4th column zeroed with [15] = 1,
     * then boneMatrix *= parentTransform - Carbon row-vector, bone FIRST: the
     * gl-matrix operands SWAP; else boneMatrix = parentTransform. Stamps the
     * activation strength (boosterGain unused). */
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

    /** Carbon EveSpriteLineSet::GetLights (cpp:358-373): byte-identical to
     * EveSpriteSet's (shared EveSpriteLight items) - point conversion on the
     * bone matrix, Blink scales radius + innerRadius after conversion, no
     * gates. */
    GetLights(lightManager) {
      const features = _EveSpriteLineSet.#features;
      features.parentBrightness = this.#activationStrength;
      features.parentScale = 1;
      const time = lightManager?.GetAnimationTime?.() ?? 0;
      const quality = lightManager?.GetCurrentSpaceSceneShadowQuality?.() ?? 0;
      const record = _EveSpriteLineSet.#lightRecord;
      for (const light of this.lights) {
        AsPerPointLightData(record, light.lightData, light.boneMatrix, features, quality);
        const blinkScale = Blink(time, light.blinkRate, light.blinkPhase, light.minScale, light.maxScale);
        record.radius *= blinkScale;
        record.innerRadius *= blinkScale;
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
    super(_EveSpriteLineSet), _initClass();
  }
}();

export { _EveSpriteLineSet as EveSpriteLineSet };
//# sourceMappingURL=EveSpriteLineSet.js.map
