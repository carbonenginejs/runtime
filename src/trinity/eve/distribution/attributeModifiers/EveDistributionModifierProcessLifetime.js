// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionAttributeModifiers/EveDistributionModifierProcessLifetime.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import { DistributionEntityLifeTimeEvent } from "./enums.js";

/** EveDistributionModifierProcessLifetime (eve/distribution/attributeModifiers) - generated from schema shapeHash d0a7425c.... */
@type.define({ className: "EveDistributionModifierProcessLifetime", family: "eve/distribution/attributeModifiers" })
export class EveDistributionModifierProcessLifetime extends CjsModel
{

  /** m_killEvent (DistributionEntityLifeTimeEvent - enum DistributionEntityLifeTimeEvent) [READWRITE, PERSIST, ENUM] */
  @io.persist
  @type.int32
  @type.enum("DistributionEntityLifeTimeEvent")
  killEvent = 1;

  /** m_lifetimeDuration (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  lifetimeDuration = -1;

  /**
   * Reports no transform effect, so this modifier alone never forces the
   * distribution into its per-frame transform reset.
   */
  @carbon.method
  @impl.implemented
  AffectsTransform()
  {
    return false;
  }

  /**
   * Returns the authored kill event once a placement's accumulated lifetime
   * passes lifetimeDuration, and DO_NOTHING otherwise or when no positive
   * duration is authored.
   */
  @carbon.method
  @impl.implemented
  ProcessDistributionModifier(placement, _deltaTime, _params)
  {
    return placement.lifeTime > this.lifetimeDuration && this.lifetimeDuration > 0
      ? this.killEvent
      : EveDistributionModifierProcessLifetime.DistributionEntityLifeTimeEvent.DO_NOTHING;
  }

  static DistributionEntityLifeTimeEvent = DistributionEntityLifeTimeEvent;

}
