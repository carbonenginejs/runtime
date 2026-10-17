// Source: trinity/trinity/Eve/Turret/EveTurretSet.h:399-404
import { type, blue } from "#schema";

/**
 * Carbon EveTurretSet::AnimationRequest: a PlayAnimation call buffered in
 * m_animationQueue while the geometry is still loading
 * (EveTurretSet.cpp:2483-2490), replayed once it is prepared
 * (cpp:1057-1064). Carbon gives it no initializers.
 */
@blue.define({ className: "EveTurretSetAnimationRequest", donors: [ "EveTurretSet::AnimationRequest" ] })
export class EveTurretSetAnimationRequest
{

  /** turretIndex (int). Carbon leaves it unset. */
  @type.int32
  turretIndex = 0;

  /** animName (std::string) */
  @type.string
  animName = "";

  /** animNameIdle (std::string) */
  @type.string
  animNameIdle = "";

}
