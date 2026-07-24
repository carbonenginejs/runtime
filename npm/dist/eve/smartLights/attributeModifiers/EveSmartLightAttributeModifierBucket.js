import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveSmartLightBaseAttributeModifier as _EveSmartLightBaseAtt } from './EveSmartLightBaseAttributeModifier.js';

let _initProto, _initClass, _init_attributeModifiers, _init_extra_attributeModifiers, _init_name, _init_extra_name;

/** EveSmartLightAttributeModifierBucket (eve/smartLights/attributeModifiers) - generated from schema shapeHash cade668b.... */
let _EveSmartLightAttribu;
class EveSmartLightAttributeModifierBucket extends _EveSmartLightBaseAtt {
  static {
    ({
      e: [_init_attributeModifiers, _init_extra_attributeModifiers, _init_name, _init_extra_name, _initProto],
      c: [_EveSmartLightAttribu, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSmartLightAttributeModifierBucket",
      family: "eve/smartLights/attributeModifiers"
    })], [[[io, io.notify, io, io.persist, void 0, type.list("IEveSmartLightGroupAttributeModifier")], 16, "attributeModifiers"], [[io, io.persist, type, type.string], 16, "name"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetActive"], [[carbon, carbon.method, impl, impl.implemented], 18, "ResetPlayTime"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetInheritProperties"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateSyncronous"], [[carbon, carbon.method, impl, impl.implemented], 18, "ProcessAttributeModifier"], [[carbon, carbon.method, impl, impl.implemented], 18, "ResetChildren"]], 0, void 0, _EveSmartLightBaseAtt));
  }
  constructor(...args) {
    super(...args);
    _init_extra_name(this);
  }
  /** m_attributeModifiers (PIEveSmartLightGroupAttributeModifierVector) [READ, PERSIST, NOTIFY] */
  attributeModifiers = (_initProto(this), _init_attributeModifiers(this, []));

  /** m_name (std::string) [READWRITE, PERSIST] */
  name = (_init_extra_attributeModifiers(this), _init_name(this, "bucket"));

  /**
   * Toggles the bucket, resetting the children only on an actual state change
   * (EveSmartLightAttributeModifierBucket.cpp:13-21).
   */
  SetActive(isActive) {
    this.isChangingActivation = isActive !== this.active;
    if (this.isChangingActivation) {
      this.ResetPlayTime(isActive);
    }
    this.active = isActive;
    this.lastAppliedActive = isActive;
  }

  /**
   * Bucket override: resetting play time cascades to the children instead of
   * touching the bucket's own timers
   * (EveSmartLightAttributeModifierBucket.cpp:23-26).
   */
  ResetPlayTime(active) {
    this.ResetChildren(active);
  }

  /** Fans the inherited color set out to the child modifiers (EveSmartLightAttributeModifierBucket.cpp:28-34). */
  SetInheritProperties(colorSet) {
    for (const attributeModifier of this.attributeModifiers) {
      attributeModifier?.SetInheritProperties?.(colorSet);
    }
  }

  /**
   * Advances the bucket's crossfade, then updates the children with the
   * compounded multiplier (EveSmartLightAttributeModifierBucket.cpp:36-45).
   */
  UpdateSyncronous(updateContext, params, activationMultiplier) {
    this.UpdateActivationStrength(activationMultiplier, updateContext?.GetDeltaT?.() ?? 0);
    const childMultiplier = activationMultiplier * this.finalAttributeMultiplier;
    for (const attributeModifier of this.attributeModifiers) {
      attributeModifier?.UpdateSyncronous?.(updateContext, params, childMultiplier);
    }
  }

  /**
   * Runs the child modifiers with the bucket's per-placement activation
   * strength folded in (EveSmartLightAttributeModifierBucket.cpp:47-55).
   */
  ProcessAttributeModifier(attribute, placement, entityPosition, entityDirection, modifierStrength) {
    const activationStrength = this.GetActivationStrength(placement) * modifierStrength;
    for (const attributeModifier of this.attributeModifiers) {
      attributeModifier?.ProcessAttributeModifier?.(attribute, placement, entityPosition, entityDirection, activationStrength);
    }
  }

  /**
   * Resets every child's play time; a child only becomes active when both the
   * parent request and the bucket state agree
   * (EveSmartLightAttributeModifierBucket.cpp:57-67). Carbon BlueCasts to
   * EveSmartLightBaseAttributeModifier; the JS children are duck-typed.
   */
  ResetChildren(parentActive = true) {
    const isActive = parentActive && this.active;
    for (const attributeModifier of this.attributeModifiers) {
      attributeModifier?.ResetPlayTime?.(isActive);
    }
  }
  static {
    _initClass();
  }
}

export { _EveSmartLightAttribu as EveSmartLightAttributeModifierBucket };
//# sourceMappingURL=EveSmartLightAttributeModifierBucket.js.map
