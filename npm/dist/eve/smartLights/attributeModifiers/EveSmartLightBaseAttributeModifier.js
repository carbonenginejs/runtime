import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl, schema } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initProto, _initClass, _init_lifeTimeFormula, _init_extra_lifeTimeFormula, _init_activationOverLifetime, _init_extra_activationOverLifetime, _init_activationValue, _init_extra_activationValue, _init_playTime, _init_extra_playTime, _init_crossFadeDuration, _init_extra_crossFadeDuration, _init_crossFadeIntensity, _init_extra_crossFadeIntensity, _init_perInstanceOffset, _init_extra_perInstanceOffset, _init_attributeMultiplier, _init_extra_attributeMultiplier, _init_startsActive, _init_extra_startsActive, _init_restartPlayTimeWhenInactive, _init_extra_restartPlayTimeWhenInactive, _init_finalAttributeMultiplier, _init_extra_finalAttributeMultiplier, _init_active, _init_extra_active, _init_delayedActivation, _init_extra_delayedActivation;

/** EveSmartLightBaseAttributeModifier (eve/smartLights/attributeModifiers) - generated from schema shapeHash d70f7c45.... */
let _EveSmartLightBaseAtt;
new class extends _identity {
  static [class EveSmartLightBaseAttributeModifier extends CjsModel {
    static {
      ({
        e: [_init_lifeTimeFormula, _init_extra_lifeTimeFormula, _init_activationOverLifetime, _init_extra_activationOverLifetime, _init_activationValue, _init_extra_activationValue, _init_playTime, _init_extra_playTime, _init_crossFadeDuration, _init_extra_crossFadeDuration, _init_crossFadeIntensity, _init_extra_crossFadeIntensity, _init_perInstanceOffset, _init_extra_perInstanceOffset, _init_attributeMultiplier, _init_extra_attributeMultiplier, _init_startsActive, _init_extra_startsActive, _init_restartPlayTimeWhenInactive, _init_extra_restartPlayTimeWhenInactive, _init_finalAttributeMultiplier, _init_extra_finalAttributeMultiplier, _init_active, _init_extra_active, _init_delayedActivation, _init_extra_delayedActivation, _initProto],
        c: [_EveSmartLightBaseAtt, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveSmartLightBaseAttributeModifier",
        family: "eve/smartLights/attributeModifiers"
      })], [[[io, io.persist, type, type.int32, void 0, schema.enum("LifeTimeFormulas")], 16, "lifeTimeFormula"], [[io, io.persist, void 0, type.model("Tr2CurveScalar")], 16, "activationOverLifetime"], [[io, io.read, type, type.float32], 16, "activationValue"], [[io, io.read, type, type.float32], 16, "playTime"], [[io, io.persist, type, type.float32], 16, "crossFadeDuration"], [[io, io.persist, type, type.float32], 16, "crossFadeIntensity"], [[io, io.persist, type, type.float32], 16, "perInstanceOffset"], [[io, io.persist, type, type.float32], 16, "attributeMultiplier"], [[io, io.persist, type, type.boolean], 16, "startsActive"], [[io, io.persist, type, type.boolean], 16, "restartPlayTimeWhenInactive"], [[io, io.read, type, type.float32], 16, "finalAttributeMultiplier"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "active"], [[io, io.persist, type, type.float32], 16, "delayedActivation"], [[carbon, carbon.method, impl, impl.implemented], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The settle hook receives no changed-property list; the active edit is detected by comparing the cached last-applied value.")], 18, "OnModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "ResetPlayTime"], [[carbon, carbon.method, impl, impl.implemented], 18, "MapActivationValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateActivationStrength"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetActivationStrength"], [[carbon, carbon.method, impl, impl.noop], 18, "ResetChildren"]], 0, void 0, CjsModel));
    }
    /** m_lifeTimeFormula (LifeTimeFormulas - enum LifeTimeFormulas) [READWRITE, PERSIST, ENUM] */
    lifeTimeFormula = (_initProto(this), _init_lifeTimeFormula(this, 0));

    /** m_activationOverLifetime (Tr2CurveScalarPtr) [READWRITE, PERSIST] */
    activationOverLifetime = (_init_extra_lifeTimeFormula(this), _init_activationOverLifetime(this, null));

    /** m_activationValue (float) [READ] */
    activationValue = (_init_extra_activationOverLifetime(this), _init_activationValue(this, 1));

    /** m_playTime (float) [READ] */
    playTime = (_init_extra_activationValue(this), _init_playTime(this, 0));

    /** m_crossFadeDuration (float) [READWRITE, PERSIST] */
    crossFadeDuration = (_init_extra_playTime(this), _init_crossFadeDuration(this, 1));

    /** m_crossFadeIntensity (float) [READWRITE, PERSIST] */
    crossFadeIntensity = (_init_extra_crossFadeDuration(this), _init_crossFadeIntensity(this, 1));

    /** m_perInstanceOffset (float) [READWRITE, PERSIST] */
    perInstanceOffset = (_init_extra_crossFadeIntensity(this), _init_perInstanceOffset(this, 0));

    /** m_activationStrength (float) [READWRITE, PERSIST] */
    attributeMultiplier = (_init_extra_perInstanceOffset(this), _init_attributeMultiplier(this, 1));

    /** m_startsActive (bool) [READWRITE, PERSIST] */
    startsActive = (_init_extra_attributeMultiplier(this), _init_startsActive(this, true));

    /** m_restartPlayTimeWhenInactive (bool) [READWRITE, PERSIST] */
    restartPlayTimeWhenInactive = (_init_extra_startsActive(this), _init_restartPlayTimeWhenInactive(this, true));

    /** m_finalActivationStrength (float) [READ] */
    finalAttributeMultiplier = (_init_extra_restartPlayTimeWhenInactive(this), _init_finalAttributeMultiplier(this, 1));

    /** m_active (bool) [READWRITE, PERSIST, NOTIFY] */
    active = (_init_extra_finalAttributeMultiplier(this), _init_active(this, true));

    /** m_delayedActivation (float) [READWRITE, PERSIST] */
    delayedActivation = (_init_extra_active(this), _init_delayedActivation(this, 0));

    // Carbon-protected crossfade state (EveSmartLightBaseAttributeModifier.h:47-60).
    // isChangingActivation and lastAppliedActive stay plain runtime fields because
    // subclasses write them (EveSmartLightAttributeModifierBucket::SetActive);
    // the rest is private.

    /** m_isChangingActivation (bool) - crossfade in progress (EveSmartLightBaseAttributeModifier.h:49). */
    isChangingActivation = (_init_extra_delayedActivation(this), false);

    /** Last `active` value applied by an edit path (JS-only change detection for the settle hook). */
    lastAppliedActive = true;

    /** m_activationValuePreMapped (float) - linear crossfade position before intensity mapping (h:57). */
    #activationValuePreMapped = 1;

    /** m_lastActivationTimeStamp (float) - playTime captured on the last (de)activation (h:60). */
    #lastActivationTimeStamp = 0;

    /**
     * Seeds the crossfade state machine: a modifier authored active but not
     * starting active animates into its active state
     * (EveSmartLightBaseAttributeModifier.cpp:27-33).
     */
    Initialize() {
      this.isChangingActivation = this.active && !this.startsActive;
      this.#activationValuePreMapped = this.isChangingActivation ? 0 : this.active ? 1 : 0;
      this.MapActivationValue();
      this.lastAppliedActive = this.active;
      return true;
    }

    /**
     * Reacts to an `active` edit by restarting the crossfade from the current
     * (unmapped) position (EveSmartLightBaseAttributeModifier.cpp:35-48).
     */
    OnModified(_options = {}) {
      if (this.active !== this.lastAppliedActive) {
        this.lastAppliedActive = this.active;
        this.isChangingActivation = true;
        if (this.crossFadeIntensity > 0) {
          this.#activationValuePreMapped = Math.pow(this.#activationValuePreMapped, 1 / this.crossFadeIntensity);
        }
        this.ResetPlayTime(this.active);
      }
      return true;
    }

    /**
     * Applies an activation state, optionally restarting the play time
     * (EveSmartLightBaseAttributeModifier.cpp:50-63).
     */
    ResetPlayTime(active) {
      if (active !== this.active) {
        this.isChangingActivation = true;
      }
      this.active = active;
      this.lastAppliedActive = this.active;
      if (this.restartPlayTimeWhenInactive && !this.active) {
        this.playTime = 0;
      }
      this.#lastActivationTimeStamp = this.playTime;
    }

    /**
     * Maps the linear crossfade position through the intensity power curve,
     * mirrored around the deactivating direction
     * (EveSmartLightBaseAttributeModifier.cpp:65-70).
     */
    MapActivationValue() {
      const scaleValue = this.active ? this.#activationValuePreMapped : 1 - this.#activationValuePreMapped;
      const mapped = Math.pow(scaleValue, this.crossFadeIntensity);
      this.activationValue = this.active ? mapped : 1 - mapped;
    }

    /**
     * Advances the crossfade/delayed-activation state machine and folds the
     * parent multiplier into the final activation strength
     * (EveSmartLightBaseAttributeModifier.cpp:72-125).
     */
    UpdateActivationStrength(parentActivationMultiplier, deltaTime) {
      if (this.isChangingActivation) {
        const activationTime = this.#lastActivationTimeStamp + this.delayedActivation;
        if (this.playTime < activationTime && this.active) {
          if (parentActivationMultiplier > 0) {
            this.playTime += deltaTime;
          }
          return;
        }
        if (this.crossFadeDuration === 0) {
          this.#activationValuePreMapped = this.active ? 1 : 0;
        } else {
          let valueAdjustment = deltaTime / this.crossFadeDuration;
          valueAdjustment = this.active ? valueAdjustment : -valueAdjustment;
          this.#activationValuePreMapped = Math.min(1, Math.max(0, this.#activationValuePreMapped + valueAdjustment));
        }
        this.MapActivationValue();
        const finishedActivating = this.active && this.#activationValuePreMapped >= 1;
        const finishedDeActivating = !this.active && this.#activationValuePreMapped <= 0;
        if (finishedActivating || finishedDeActivating) {
          this.isChangingActivation = false;
          if (finishedDeActivating && this.restartPlayTimeWhenInactive) {
            this.ResetChildren(false);
          }
          if (finishedActivating) {
            this.ResetChildren(true);
          }
        }
      }
      this.finalAttributeMultiplier = parentActivationMultiplier * this.attributeMultiplier * this.activationValue;
      if (this.finalAttributeMultiplier > 0) {
        this.playTime += deltaTime;
      }
    }

    /**
     * Final activation strength for one placement, multiplied by the optional
     * lifetime curve sampled per the lifetime formula
     * (EveSmartLightBaseAttributeModifier.cpp:127-151).
     */
    GetActivationStrength(placement) {
      let activationMultiplier = 1;
      if (this.activationOverLifetime) {
        const idOffset = Number(placement?.initialPlacementID ?? 0) * this.perInstanceOffset;
        switch (this.lifeTimeFormula) {
          case _EveSmartLightBaseAtt.LifeTimeFormulas.PER_INSTANCE_LIFETIME:
            activationMultiplier = this.activationOverLifetime.GetValueAt((placement?.lifeTime ?? 0) + idOffset);
            break;
          case _EveSmartLightBaseAtt.LifeTimeFormulas.PER_MODIFIER_PLAYTIME:
            activationMultiplier = this.activationOverLifetime.GetValueAt(this.playTime + idOffset);
            break;
          case _EveSmartLightBaseAtt.LifeTimeFormulas.STATIC:
            activationMultiplier = this.activationOverLifetime.GetValueAt(idOffset);
            break;
        }
      }
      return this.finalAttributeMultiplier * activationMultiplier;
    }

    /** Carbon declares ResetChildren inline empty on the base (EveSmartLightBaseAttributeModifier.h:41). */
    ResetChildren(_parentActive) {}
  }];
  LifeTimeFormulas = Object.freeze({
    PER_INSTANCE_LIFETIME: 0,
    PER_MODIFIER_PLAYTIME: 1,
    STATIC: 2
  });
  constructor() {
    super(_EveSmartLightBaseAtt), _initClass();
  }
}();

export { _EveSmartLightBaseAtt as EveSmartLightBaseAttributeModifier };
//# sourceMappingURL=EveSmartLightBaseAttributeModifier.js.map
