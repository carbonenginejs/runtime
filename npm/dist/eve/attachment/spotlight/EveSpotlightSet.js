import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { box3 } from '@carbonenginejs/runtime-utils/box3';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveEntity as _EveEntity } from '../../EveEntity.js';
import { EveSpotlightLight as _EveSpotlightLight } from './EveSpotlightLight.js';
import { EveComponentType } from '../../EveComponentTypes.js';
import { Tr2Light as _Tr2Light } from '../../lights/Tr2Light.js';
import { CreateItemSetBoundingBoxes, GetItemSetAabb } from '../itemSetBounds.js';
import { MatrixCopyFrom3x4, AsPerSpotLightData, CreateLightRecord } from '../../lights/lightConversion.js';

let _initProto, _initClass, _init_spotlightItems, _init_extra_spotlightItems, _init_name, _init_extra_name, _init_display, _init_extra_display, _init_coneEffect, _init_extra_coneEffect, _init_glowEffect, _init_extra_glowEffect, _init_skinned, _init_extra_skinned, _init_intensity, _init_extra_intensity, _init_lights, _init_extra_lights;

/**
 * A hull's authored spotlights, owning their static and per-bone bounds, the
 * cone and glow effects that draw them, and the spot lights they emit.
 */
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
      })], [[[void 0, io.rebuild("packedGeometry"), io, io.persist, void 0, type.list("EveSpotlightSetItem")], 16, "spotlightItems"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.boolean], 16, "display"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, void 0, type.objectRef("Tr2Effect")], 16, "coneEffect"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, void 0, type.objectRef("Tr2Effect")], 16, "glowEffect"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.boolean], 16, "skinned"], [[io, io.persist, type, type.float32], 16, "intensity"], [[io, io.persist, void 0, type.list("EveSpotlightLight")], 16, "lights"], [[carbon, carbon.method, impl, impl.adapted], 18, "Rebuild"], [[carbon, carbon.method, impl, impl.adapted], 18, "Initialize"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetConeEffect"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetConeEffect"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetGlowEffect"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetGlowEffect"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetAabb"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateVisibility"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetSkinned"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetName"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetName"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetSpotlightItems"], [[carbon, carbon.method, impl, impl.implemented], 18, "AddSpotlightItem"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetShaderOption"], [[carbon, carbon.method, impl, impl.adapted], 18, "AddLightFromSOF"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterComponents"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateLights"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Profile-index packing is by-reference per lightConversion.js conventions.")], 18, "GetLights"]], 0, void 0, _EveEntity));
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

    /** m_aabb - the union of every unskinned spotlight (cpp:311). */
    #staticBounds = box3.create();

    /** m_boundingBoxes - [{ boneIndex, bounds }], ascending. */
    #boneBounds = [];

    /** Carbon m_activationStrength / m_boosterGain (ctor 0 / 0,
     * EveSpotlightSet.cpp:90-91). Lights are BLACK until UpdateLights runs. */
    #activationStrength = 0;
    #boosterGain = 0;

    /**
     * Recomputes the static and per-bone bounds from the authored spotlight items
     * and marks the packed geometry stale.
     */
    Rebuild() {
      // Packed cone/glow vertices, bounds caches, effect hashes and quad
      // registration are reconciled by the concrete renderer adapter.
      this.#rebuildRevision++;
      this.__state.rebuild.add("packedGeometry");
      // Carbon rebuilds the item-set bounds at the tail of the same pack (cpp:311).
      CreateItemSetBoundingBoxes(this.#staticBounds, this.#boneBounds, this.skinned, this.spotlightItems);
    }

    /**
     * Runs the first Rebuild so the set has bounds before its first visibility
     * test.
     */
    Initialize() {
      this.Rebuild();
      return true;
    }

    /** The effect that draws the light cones. */
    GetConeEffect() {
      return this.coneEffect;
    }

    /** Sets the effect that draws the light cones. */
    SetConeEffect(effect) {
      this.coneEffect = effect ?? null;
    }

    /** The effect that draws the glow sprite at each cone's source. */
    GetGlowEffect() {
      return this.glowEffect;
    }

    /** Sets the effect that draws the glow sprite at each cone's source. */
    SetGlowEffect(effect) {
      this.glowEffect = effect ?? null;
    }

    /** Carbon EveSpotlightSet::GetAabb (cpp:176-179): the item-set bounds, with the bone
     * list forwarded only when the set is skinned. */
    GetAabb(out, bones = null, boneCount = 0) {
      return GetItemSetAabb(out, this.#staticBounds, this.#boneBounds, bones, this.skinned ? boneCount : 0);
    }

    /** Carbon EveSpotlightSet::UpdateVisibility (cpp:138-148): an uninitialized set is
     * NOT visible; otherwise the bounds move into world space and take the
     * frustum box test. No LOD and no display gate. */
    UpdateVisibility(updateContext, parentTransform, bones = null, boneCount = 0) {
      const aabb = this.GetAabb(_EveSpotlightSet.#aabbScratch, bones, boneCount);
      if (box3.isEmpty(aabb)) {
        return false;
      }
      box3.transformMat4(aabb, aabb, parentTransform);
      return !!updateContext?.GetFrustum?.()?.IsBoxVisible(aabb);
    }

    /**
     * Sets whether the spotlights ride skeleton bones, which is what decides if
     * GetAabb consults the caller's bone list at all.
     */
    SetSkinned(skinned) {
      this.skinned = !!skinned;
    }

    /** The authored set name, which SOF uses to match this set to its DNA entry. */
    GetName() {
      return this.name;
    }

    /** Sets the authored set name, coercing null or undefined to an empty string. */
    SetName(name) {
      this.name = String(name ?? "");
    }

    /** The live spotlight item list, not a copy. */
    GetSpotlightItems() {
      return this.spotlightItems;
    }

    /**
     * Appends an authored spotlight item; the bounds only pick it up on the next
     * Rebuild.
     */
    AddSpotlightItem(item) {
      this.spotlightItems.push(item);
    }

    /**
     * Sets a shader option on both the cone and the glow effect, skipping
     * whichever is absent or does not accept options.
     */
    SetShaderOption(name, value) {
      if (this.coneEffect && typeof this.coneEffect.SetOption === "function") {
        this.coneEffect.SetOption(name, value);
      }
      if (this.glowEffect && typeof this.glowEffect.SetOption === "function") {
        this.glowEffect.SetOption(name, value);
      }
    }

    /**
     * Converts a SOF-authored light description into an EveSpotlightLight and
     * appends it to the set.
     */
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

    /** Per-frame scratch - UpdateVisibility must not allocate. */
  }];
  #aabbScratch = box3.create();
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
