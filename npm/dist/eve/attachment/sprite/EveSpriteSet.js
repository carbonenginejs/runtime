import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveEntity as _EveEntity } from '../../EveEntity.js';
import { EveSpriteLight as _EveSpriteLight } from './EveSpriteLight.js';
import { EveSpriteSetItem as _EveSpriteSetItem } from './EveSpriteSetItem.js';
import { EveComponentType } from '../../EveComponentTypes.js';
import { Blink } from '../EveSpaceObjectAttachmentUtils.js';
import { Tr2Light as _Tr2Light } from '../../lights/Tr2Light.js';
import { MatrixCopyFrom3x4, AsPerPointLightData, CreateLightRecord } from '../../lights/lightConversion.js';

let _initProto, _initClass, _init_sprites, _init_extra_sprites, _init_name, _init_extra_name, _init_effect, _init_extra_effect, _init_skinned, _init_extra_skinned, _init_intensity, _init_extra_intensity, _init_display, _init_extra_display, _init_lights, _init_extra_lights;
let _EveSpriteSet;
new class extends _identity {
  static [class EveSpriteSet extends _EveEntity {
    static {
      ({
        e: [_init_sprites, _init_extra_sprites, _init_name, _init_extra_name, _init_effect, _init_extra_effect, _init_skinned, _init_extra_skinned, _init_intensity, _init_extra_intensity, _init_display, _init_extra_display, _init_lights, _init_extra_lights, _initProto],
        c: [_EveSpriteSet, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveSpriteSet",
        family: "eve/attachment/sprites"
      })], [[[void 0, io.rebuild("packedGeometry"), io, io.notify, io, io.persist, void 0, type.list("EveSpriteSetItem")], 16, "sprites"], [[io, io.persist, type, type.string], 16, "name"], [[void 0, io.rebuild("packedGeometry"), io, io.notify, io, io.persist, void 0, type.objectRef("Tr2Effect")], 16, "effect"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.boolean], 16, "skinned"], [[io, io.persist, type, type.float32], 16, "intensity"], [[io, io.persist, type, type.boolean], 16, "display"], [[io, io.persist, void 0, type.list("EveSpriteLight")], 16, "lights"], [[carbon, carbon.method, impl, impl.implemented], 18, "Clear"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateLights"], [[carbon, carbon.method, impl, impl.adapted], 18, "Add"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetSprites"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetName"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetName"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetEffect"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetEffect"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetSkinned"], [[carbon, carbon.method, impl, impl.adapted], 18, "Rebuild"], [[carbon, carbon.method, impl, impl.adapted], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted], 18, "AddLightFromSOF"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterComponents"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Tr2Renderer::GetAnimationTime relocates onto the light-manager duck (GetAnimationTime, default 0); profile-index packing is by-reference per lightConversion.js.")], 18, "GetLights"]], 0, void 0, _EveEntity));
    }
    sprites = (_initProto(this), _init_sprites(this, []));
    name = (_init_extra_sprites(this), _init_name(this, ""));
    effect = (_init_extra_name(this), _init_effect(this, null));
    skinned = (_init_extra_effect(this), _init_skinned(this, false));
    intensity = (_init_extra_skinned(this), _init_intensity(this, 1));
    display = (_init_extra_intensity(this), _init_display(this, true));
    lights = (_init_extra_display(this), _init_lights(this, []));
    #rebuildRevision = (_init_extra_lights(this), 0);

    /** Carbon m_activationStrength (ctor default 0, EveSpriteSet.cpp:67 - NOT
     * 1: packed-set lights are BLACK until the owner's update calls
     * UpdateLights). */
    #activationStrength = 0;
    Clear() {
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
    Add(positionOrItem, ...args) {
      if (positionOrItem && !ArrayBuffer.isView(positionOrItem) && !Array.isArray(positionOrItem) && args.length === 0) {
        this.sprites.push(positionOrItem);
        return positionOrItem;
      }
      const item = new _EveSpriteSetItem();
      vec3.copy(item.position, positionOrItem ?? vec3.create());
      if (args.length === 3) {
        const [scale, color, warpColor] = args;
        item.blinkRate = 0;
        item.blinkPhase = 0;
        item.minScale = Number(scale);
        item.maxScale = Number(scale);
        item.falloff = 0;
        vec4.copy(item.color, color);
        vec4.copy(item.warpColor, warpColor);
      } else {
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
    GetSprites() {
      return this.sprites;
    }
    GetName() {
      return this.name;
    }
    SetName(name) {
      this.name = String(name ?? "");
    }
    GetEffect() {
      return this.effect;
    }
    SetEffect(effect) {
      this.effect = effect ?? null;
    }
    SetSkinned(skinned) {
      this.skinned = !!skinned;
    }
    Rebuild() {
      this.#rebuildRevision++;
      this.__state.rebuild.add("packedGeometry");
    }
    Initialize() {
      this.Rebuild();
      return true;
    }
    AddLightFromSOF(light) {
      this.lights.push(_EveSpriteLight.FromSOF(light));
    }

    /** Carbon EveSpriteSet::RegisterComponents (cpp:445-452): LightOwner when
     * lights are authored. */
    RegisterComponents() {
      const registry = this.GetComponentRegistry();
      if (registry && this.lights.length) {
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
    GetLights(lightManager) {
      const features = _EveSpriteSet.#features;
      features.parentBrightness = this.#activationStrength;
      features.parentScale = 1;
      const time = lightManager?.GetAnimationTime?.() ?? 0;
      const quality = lightManager?.GetCurrentSpaceSceneShadowQuality?.() ?? 0;
      const record = _EveSpriteSet.#lightRecord;
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
    super(_EveSpriteSet), _initClass();
  }
}();

export { _EveSpriteSet as EveSpriteSet };
//# sourceMappingURL=EveSpriteSet.js.map
