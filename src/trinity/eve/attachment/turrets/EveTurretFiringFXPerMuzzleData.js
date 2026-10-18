// Source: trinity/trinity/Eve/Turret/EveTurretFiringFX.h:185-197
import { mat4 } from "#math/mat4";
import { type, meta } from "#schema";

/**
 * Carbon EveTurretFiringFX::PerMuzzleData: one muzzle's firing state, source
 * bone and transform, start delays and progress, held in the fixed
 * m_perMuzzleData[MUZZLECOUNT_MAX] array. Carbon gives it no initializers;
 * the EveTurretFiringFX constructor (EveTurretFiringFX.cpp:50-58) writes every
 * member except elapsedTime.
 */
@meta.define({ className: "EveTurretFiringFXPerMuzzleData", carbon: "EveTurretFiringFX::PerMuzzleData" })
export class EveTurretFiringFXPerMuzzleData
{

  /** started (bool). Carbon leaves it unset. */
  @type.boolean
  started = false;

  /** readyToStart (bool). Carbon leaves it unset. */
  @type.boolean
  readyToStart = false;

  /** muzzlePositionBoneID (unsigned int): the source of the firing stretch effect. Carbon leaves it unset. */
  @type.uint32
  muzzlePositionBoneID = 0;

  /** muzzleTransform (Matrix). Carbon leaves it unset. */
  @type.mat4
  muzzleTransform = mat4.create();

  /** currentStartDelay (float): the remaining delay that syncs firing with the animation. Carbon leaves it unset. */
  @type.float32
  currentStartDelay = 0;

  /** constantDelay (float). Carbon leaves it unset. */
  @type.float32
  constantDelay = 0;

  /** elapsedTime (float): the effect's progress. Carbon leaves it unset. */
  @type.float32
  elapsedTime = 0;

}
