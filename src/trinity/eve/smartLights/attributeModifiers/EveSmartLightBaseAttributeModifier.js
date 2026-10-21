import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/attributeModifiers/EveSmartLightBaseAttributeModifier.h
import { IsMatch } from "#blue";
import { IInitialize } from "../../../../global/blue/IInitialize.js";
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta, type, blue } from "#schema";
import { INotify } from "#blue";
import { LifeTimeFormulas } from "./enums.js";

/** Owns common smart-light activation state and a nominal modifier contract whose optional colour and controller hooks default to no-ops while required update and attribute-processing methods throw until a concrete modifier implements them. */
@be.define("EveSmartLightBaseAttributeModifier")
@blue.inherit(IInitialize, INotify)
@be.mapInterface(IInitialize)
@be.mapInterface(INotify)
export class EveSmartLightBaseAttributeModifier
{

  /** m_lifeTimeFormula (LifeTimeFormulas - enum LifeTimeFormulas) [READWRITE, PERSIST, ENUM] */
  @blue.readwrite
  @blue.persist
  @type.int32
  @type.enum("LifeTimeFormulas")
  lifeTimeFormula = 0;

  /** m_activationOverLifetime (Tr2CurveScalarPtr) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.rootRef("Tr2CurveScalar")
  activationOverLifetime = null;

  /** m_activationValue (float) [READ] */
  @blue.read
  @type.float32
  activationValue = 1;

  /** m_playTime (float) [READ] */
  @blue.read
  @type.float32
  playTime = 0;

  /** m_crossFadeDuration (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  crossFadeDuration = 1;

  /** m_crossFadeIntensity (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  crossFadeIntensity = 1;

  /** m_perInstanceOffset (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  perInstanceOffset = 0;

  /** m_activationStrength (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  attributeMultiplier = 1;

  /** m_startsActive (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  startsActive = true;

  /** m_restartPlayTimeWhenInactive (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  restartPlayTimeWhenInactive = true;

  /** m_finalActivationStrength (float) [READ] */
  @blue.read
  @type.float32
  finalAttributeMultiplier = 1;

  /** m_active (bool) [READWRITE, PERSIST, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.boolean
  active = true;

  /** m_delayedActivation (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  delayedActivation = 0;

  // Carbon-protected crossfade state (EveSmartLightBaseAttributeModifier.h:47-60).
  // subclasses write them (EveSmartLightAttributeModifierBucket::SetActive);
  // the rest is private.

  /** m_isChangingActivation (bool) - crossfade in progress (EveSmartLightBaseAttributeModifier.h:49). */
  _isChangingActivation = false;

  /** Last `active` value applied by an edit path (JS-only change detection for the settle hook). */

  /** m_activationValuePreMapped (float) - linear crossfade position before intensity mapping (h:57). */
  _activationValuePreMapped = 1;

  /** m_lastActivationTimeStamp (float) - playTime captured on the last (de)activation (h:60). */
  _lastActivationTimeStamp = 0;

  /**
   * Seeds the crossfade state machine: a modifier authored active but not
   * starting active animates into its active state
   * (EveSmartLightBaseAttributeModifier.cpp:27-33).
   */
  @blue.method
  @meta.implemented
  Initialize()
  {
    this._isChangingActivation = this.active && !this.startsActive;
    this._activationValuePreMapped = this._isChangingActivation ? 0 : (this.active ? 1 : 0);
    this.MapActivationValue();
    return true;
  }

  /**
   * Reacts to an `active` edit by restarting the crossfade from the current
   * (unmapped) position (EveSmartLightBaseAttributeModifier.cpp:35-48).
   */
  @blue.method
  @meta.implemented
  OnModified(propertyName)
  {
    if (IsMatch(propertyName, "active"))
    {
      this._isChangingActivation = true;
      if (this.crossFadeIntensity > 0)
      {
        this._activationValuePreMapped = Math.pow(this._activationValuePreMapped, 1 / this.crossFadeIntensity);
      }
      this.ResetPlayTime(this.active);
    }
    return true;
  }

  /**
   * Applies an activation state, optionally restarting the play time
   * (EveSmartLightBaseAttributeModifier.cpp:50-63).
   */
  @blue.method
  @meta.implemented
  ResetPlayTime(active)
  {
    if (active !== this.active)
    {
      this._isChangingActivation = true;
    }

    this.active = active;
    if (this.restartPlayTimeWhenInactive && !this.active)
    {
      this.playTime = 0;
    }
    this._lastActivationTimeStamp = this.playTime;
  }

  /**
   * Maps the linear crossfade position through the intensity power curve,
   * mirrored around the deactivating direction
   * (EveSmartLightBaseAttributeModifier.cpp:65-70).
   */
  @blue.method
  @meta.implemented
  MapActivationValue()
  {
    const scaleValue = this.active ? this._activationValuePreMapped : 1 - this._activationValuePreMapped;
    const mapped = Math.pow(scaleValue, this.crossFadeIntensity);
    this.activationValue = this.active ? mapped : 1 - mapped;
  }

  /**
   * Advances the crossfade/delayed-activation state machine and folds the
   * parent multiplier into the final activation strength
   * (EveSmartLightBaseAttributeModifier.cpp:72-125).
   */
  @blue.method
  @meta.implemented
  UpdateActivationStrength(parentActivationMultiplier, deltaTime)
  {
    if (this._isChangingActivation)
    {
      const activationTime = this._lastActivationTimeStamp + this.delayedActivation;
      if (this.playTime < activationTime && this.active)
      {
        if (parentActivationMultiplier > 0)
        {
          this.playTime += deltaTime;
        }
        return;
      }

      if (this.crossFadeDuration === 0)
      {
        this._activationValuePreMapped = this.active ? 1 : 0;
      }
      else
      {
        let valueAdjustment = deltaTime / this.crossFadeDuration;
        valueAdjustment = this.active ? valueAdjustment : -valueAdjustment;
        this._activationValuePreMapped = Math.min(1, Math.max(0, this._activationValuePreMapped + valueAdjustment));
      }

      this.MapActivationValue();

      const finishedActivating = this.active && this._activationValuePreMapped >= 1;
      const finishedDeActivating = !this.active && this._activationValuePreMapped <= 0;

      if (finishedActivating || finishedDeActivating)
      {
        this._isChangingActivation = false;
        if (finishedDeActivating && this.restartPlayTimeWhenInactive)
        {
          this.ResetChildren(false);
        }
        if (finishedActivating)
        {
          this.ResetChildren(true);
        }
      }
    }

    this.finalAttributeMultiplier = parentActivationMultiplier * this.attributeMultiplier * this.activationValue;

    if (this.finalAttributeMultiplier > 0)
    {
      this.playTime += deltaTime;
    }
  }

  /**
   * Final activation strength for one placement, multiplied by the optional
   * lifetime curve sampled per the lifetime formula
   * (EveSmartLightBaseAttributeModifier.cpp:127-151).
   */
  @blue.method
  @meta.implemented
  GetActivationStrength(placement)
  {
    let activationMultiplier = 1;

    if (this.activationOverLifetime)
    {
      // The placement is read unchecked and the sums are float, as Carbon's are
      // (cpp:133-140; rulings 12 and 2026-10-16).
      const idOffset = Math.fround(Math.fround(placement.initialPlacementID) * this.perInstanceOffset);
      switch (this.lifeTimeFormula)
      {
        case EveSmartLightBaseAttributeModifier.LifeTimeFormulas.PER_INSTANCE_LIFETIME:
          activationMultiplier = this.activationOverLifetime.GetValueAt(Math.fround(placement.lifeTime + idOffset));
          break;
        case EveSmartLightBaseAttributeModifier.LifeTimeFormulas.PER_MODIFIER_PLAYTIME:
          activationMultiplier = this.activationOverLifetime.GetValueAt(Math.fround(this.playTime + idOffset));
          break;
        case EveSmartLightBaseAttributeModifier.LifeTimeFormulas.STATIC:
          activationMultiplier = this.activationOverLifetime.GetValueAt(idOffset);
          break;
        default:
          break;
      }
    }

    return this.finalAttributeMultiplier * activationMultiplier;
  }

  /** Carbon declares ResetChildren inline empty on the base (EveSmartLightBaseAttributeModifier.h:41). */
  @blue.method
  @meta.noop
  ResetChildren(_parentActive)
  {
  }

  static LifeTimeFormulas = LifeTimeFormulas;

}
