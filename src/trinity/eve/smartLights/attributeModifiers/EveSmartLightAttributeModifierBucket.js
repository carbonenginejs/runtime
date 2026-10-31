import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/attributeModifiers/EveSmartLightAttributeModifierBucket.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";
import { IInitialize, INotify } from "#blue";
import { EveSmartLightBaseAttributeModifier } from "./EveSmartLightBaseAttributeModifier.js";
import { IEveSmartLightGroupAttributeModifier } from "./IEveSmartLightGroupAttributeModifier.js";

/** EveSmartLightAttributeModifierBucket (eve/smartLights/attributeModifiers) - generated from schema shapeHash cade668b.... */
@be.define("EveSmartLightAttributeModifierBucket")
@be.mapInterface(IEveSmartLightGroupAttributeModifier)
@be.mapInterface(EveSmartLightBaseAttributeModifier)
@be.mapInterface(IInitialize)
@be.mapInterface(INotify)
@be.mapAttribute(be.READWRITE | be.PERSIST, "attributeMultiplier")
@be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY, "active")
@be.mapAttribute(be.READWRITE | be.PERSIST, "startsActive")
@be.mapAttribute(be.READWRITE | be.PERSIST, "crossFadeDuration")
@be.mapAttribute(be.READWRITE | be.PERSIST, "crossFadeIntensity")
@be.mapAttribute(be.READ, "activationValue")
@be.mapAttribute(be.READ, "finalAttributeMultiplier")
export class EveSmartLightAttributeModifierBucket extends IEveSmartLightGroupAttributeModifier
{

  /** m_attributeModifiers (PIEveSmartLightGroupAttributeModifierVector) [READ, PERSIST, NOTIFY] */
  @be.mapAttribute(be.READ | be.PERSIST | be.NOTIFY)


  @type.list("IEveSmartLightGroupAttributeModifier")
  attributeModifiers = [];

  /** m_name (std::string) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "bucket";

  /**
   * Toggles the bucket, resetting the children only on an actual state change
   * (EveSmartLightAttributeModifierBucket.cpp:13-21).
   *
   * @implemented
   */

  SetActive(isActive)
  {
    this._isChangingActivation = isActive !== this.active;
    if (this._isChangingActivation)
    {
      this.ResetPlayTime(isActive);
    }
    this.active = isActive;
  }

  /**
   * Bucket override: resetting play time cascades to the children instead of
   * touching the bucket's own timers
   * (EveSmartLightAttributeModifierBucket.cpp:23-26).
   *
   * @implemented
   */

  ResetPlayTime(active)
  {
    this.ResetChildren(active);
  }

  /**
   * Fans the inherited color set out to the child modifiers (EveSmartLightAttributeModifierBucket.cpp:28-34).
   *
   * @implemented
   */

  SetInheritProperties(colorSet)
  {
    for (const attributeModifier of this.attributeModifiers)
    {
      attributeModifier.SetInheritProperties(colorSet);
    }
  }

  /**
   * Advances the bucket's crossfade, then updates the children with the
   * compounded multiplier (EveSmartLightAttributeModifierBucket.cpp:36-45).
   *
   * @implemented
   */

  UpdateSyncronous(updateContext, params, activationMultiplier)
  {
    this.UpdateActivationStrength(activationMultiplier, updateContext.GetDeltaT());
    const childMultiplier = activationMultiplier * this.finalAttributeMultiplier;

    for (const attributeModifier of this.attributeModifiers)
    {
      attributeModifier.UpdateSyncronous(updateContext, params, childMultiplier);
    }
  }

  /**
   * Runs the child modifiers with the bucket's per-placement activation
   * strength folded in (EveSmartLightAttributeModifierBucket.cpp:47-55).
   *
   * @implemented
   */

  ProcessAttributeModifier(attribute, placement, entityPosition, entityDirection, modifierStrength)
  {
    const activationStrength = this.GetActivationStrength(placement) * modifierStrength;

    for (const attributeModifier of this.attributeModifiers)
    {
      attributeModifier.ProcessAttributeModifier(attribute, placement, entityPosition, entityDirection, activationStrength);
    }
  }

  /**
   * Resets every child's play time; a child only becomes active when both the
   * parent request and the bucket state agree
   * (EveSmartLightAttributeModifierBucket.cpp:57-67). Carbon BlueCasts to
   * EveSmartLightBaseAttributeModifier; the JS children share that nominal base.
   *
   * @implemented
   */

  ResetChildren(parentActive = true)
  {
    const isActive = parentActive && this.active;
    for (const attributeModifier of this.attributeModifiers)
    {
      attributeModifier.ResetPlayTime(isActive);
    }
  }

}
