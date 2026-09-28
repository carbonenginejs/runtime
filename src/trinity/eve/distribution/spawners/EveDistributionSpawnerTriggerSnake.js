// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionSpawners/EveDistributionSpawnerTriggerSnake.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { vec3 } from "#math/vec3";
import { carbon, impl, edit, type } from "#schema";
import { IEveDistributionSpawner } from "./IEveDistributionSpawner.js";

/** Triggers a timed chain of nearby free placements, walking forward from each previously reached destination. */
@type.define({ className: "EveDistributionSpawnerTriggerSnake", family: "eve/distribution/spawners" })
export class EveDistributionSpawnerTriggerSnake extends IEveDistributionSpawner
{

  _activeTargetUniqueID = 0;

  _targetPoint = vec3.create();

  _lastTarget = vec3.create();

  _currentTravelTime = 0;

  _travelDurationToNextPoint = 1;

  /** m_minTimeBetweenTriggers (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  minBaseTimeBetweenTriggers = 1;

  /** m_maxTimeBetweenTriggers (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  maxBaseTimeBetweenTriggers = 1;

  /** m_travelProgress (float) [READ] */
  @edit.read
  @type.float32
  travelProgress = 1;

  /** m_numDestinationsReached (int32_t) [READ] */
  @edit.read
  @type.int32
  destinationsReached = 0;

  /** m_totalDestinations (int32_t) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.int32
  totalDestinations = 5;

  /** m_distanceToTravelTimeMultiplier (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  distanceToTravelTimeMultiplier = 0;

  /**
   * Picks a random pooled placement as the first target of the walk and
   * restarts.
   */
  @carbon.method
  @impl.adapted
  Reset(placements)
  {
    if (placements.length === 0)
    {
      return;
    }

    const index = Math.floor(Math.random() * placements.length);
    const placement = placements[index].placement;
    vec3.copy(this._targetPoint, placement.initialTranslation);
    vec3.copy(this._lastTarget, this._targetPoint);
    this._activeTargetUniqueID = placement.uniqueID;
    this.Restart();
  }

  /**
   * Clears the travel timers and the destination count, leaving a zero travel
   * duration so the next update triggers the current target immediately.
   */
  @carbon.method
  @impl.implemented
  Restart()
  {
    this.destinationsReached = -1;
    this._currentTravelTime = 0;
    this._travelDurationToNextPoint = 0;
  }

  /**
   * Triggers the current target once its travel time is up, then hops to the
   * free placement nearest a point extrapolated past the last target, charging
   * extra travel time for the distance covered; stops after totalDestinations,
   * which -1 makes unlimited.
   */
  @carbon.method
  @impl.adapted
  UpdateSyncronous(updateContext, _params, owner)
  {
    if (this.destinationsReached >= this.totalDestinations && this.totalDestinations !== -1)
    {
      return;
    }

    this._currentTravelTime += updateContext.GetDeltaT();
    this.travelProgress = this._travelDurationToNextPoint > 0
      ? this._currentTravelTime / this._travelDurationToNextPoint
      : 1;

    if (this.travelProgress < 1)
    {
      return;
    }

    owner.TriggerEntityByID(this._activeTargetUniqueID);
    this._currentTravelTime = 0;
    this.travelProgress = 0;
    this.destinationsReached++;
    this._travelDurationToNextPoint = this.minBaseTimeBetweenTriggers
      + (this.maxBaseTimeBetweenTriggers - this.minBaseTimeBetweenTriggers) * Math.random();

    const searchPoint = vec3.lerp(vec3.create(), this._lastTarget, this._targetPoint, 1.3);
    const closestPlacement = owner.GetClosestFreePlacement(searchPoint);
    if (closestPlacement === -1)
    {
      return;
    }

    const placement = owner.GetInitialPlacementData(closestPlacement);
    if (placement)
    {
      vec3.copy(this._lastTarget, this._targetPoint);
      this._activeTargetUniqueID = placement.uniqueID;
      vec3.copy(this._targetPoint, placement.initialTranslation);
      this._travelDurationToNextPoint += vec3.distance(this._targetPoint, this._lastTarget)
        * this.distanceToTravelTimeMultiplier / 100;
    }
  }

  /** Ignores controller variables; the walk is purely time-driven. */
  @carbon.method
  @impl.noop
  SetControllerVariable(_name, _value)
  {
  }

}
