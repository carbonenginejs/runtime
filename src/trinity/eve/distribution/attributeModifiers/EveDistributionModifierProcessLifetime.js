// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionAttributeModifiers/EveDistributionModifierProcessLifetime.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta, type, blue } from "#schema";
import { IEveDistributionModifier } from "./IEveDistributionModifier.js";
import { DistributionEntityLifeTimeEvent } from "./enums.js";

/** Ends or respawns a distributed placement with the authored lifetime event after its lifetime duration expires. */
@blue.define("EveDistributionModifierProcessLifetime")
export class EveDistributionModifierProcessLifetime extends IEveDistributionModifier
{

  /** m_killEvent (DistributionEntityLifeTimeEvent - enum DistributionEntityLifeTimeEvent) [READWRITE, PERSIST, ENUM] */
  @blue.readwrite
  @blue.persist
  @type.int32
  @type.enum("DistributionEntityLifeTimeEvent")
  killEvent = 1;

  /** m_lifetimeDuration (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  lifetimeDuration = -1;

  /**
   * Reports no transform effect, so this modifier alone never forces the
   * distribution into its per-frame transform reset.
   */
  @blue.method
  @meta.implemented
  AffectsTransform()
  {
    return false;
  }

  /**
   * Returns the authored kill event once a placement's accumulated lifetime
   * passes lifetimeDuration, and DO_NOTHING otherwise or when no positive
   * duration is authored.
   */
  @blue.method
  @meta.implemented
  ProcessDistributionModifier(placement, _deltaTime, _params)
  {
    return placement.lifeTime > this.lifetimeDuration && this.lifetimeDuration > 0
      ? this.killEvent
      : EveDistributionModifierProcessLifetime.DistributionEntityLifeTimeEvent.DO_NOTHING;
  }

  static DistributionEntityLifeTimeEvent = DistributionEntityLifeTimeEvent;

}
