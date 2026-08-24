// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionSpawners/EveDistributionSpawnerTriggerSphere.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { carbon, impl, io, type } from "#schema";
import { IEveDistributionSpawner } from "./IEveDistributionSpawner.js";
import { vec3 } from "#math/vec3";

/** Triggers pooled placements in the order reached by a timed sphere expansion. */
@type.define({ className: "EveDistributionSpawnerTriggerSphere", family: "eve/distribution/spawners" })
export class EveDistributionSpawnerTriggerSphere extends IEveDistributionSpawner
{

  #distSortedIndexes = [];

  #currentPlayTime = 0;

  #currentTrigger = 0;

  /** m_triggerChance (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  triggerChance = 1;

  /** m_startSequenceAtFirstTrigger (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  startSequenceAtFirstTrigger = true;

  /** m_sphereOffset (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  sphereOffset = vec3.create();

  /** m_playDuration (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  playDuration = 1;

  /** m_delayBeforeActivation (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  delayBeforeActivation = 0;

  /** m_reverseSphereAnimation (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  reverseSphereAnimation = false;

  /**
   * Sorts the pooled placements by their distance from the sphere offset and
   * normalizes those distances into the 0..1 expansion order the update walks,
   * then restarts.
   */
  @carbon.method
  @impl.adapted
  Reset(placements)
  {
    if (placements.length === 0)
    {
      return;
    }

    this.#distSortedIndexes.length = 0;
    for (const placement of placements)
    {
      const distance = vec3.distance(placement.placement.initialTranslation, this.sphereOffset);
      this.#distSortedIndexes.push([distance, placement.placement.uniqueID]);
    }
    this.#distSortedIndexes.sort((a, b) => a[0] - b[0]);

    const minimumDistance = this.startSequenceAtFirstTrigger ? this.#distSortedIndexes[0][0] : 0;
    const maximumDistance = Math.max(1, this.#distSortedIndexes.at(-1)[0] - minimumDistance);
    for (const trigger of this.#distSortedIndexes)
    {
      trigger[0] = (trigger[0] - minimumDistance) / maximumDistance;
    }
    this.Restart();
  }

  /**
   * Rewinds the expansion to its first placement, or its last when the animation
   * is reversed, and clears the play time.
   */
  @carbon.method
  @impl.implemented
  Restart()
  {
    this.#currentTrigger = this.reverseSphereAnimation ? this.#distSortedIndexes.length - 1 : 0;
    this.#currentPlayTime = 0;
  }

  /**
   * Advances the play time and triggers every placement the expanding sphere has
   * reached, each subject to triggerChance, ending once the sorted order is
   * exhausted or the play duration elapses.
   */
  @carbon.method
  @impl.adapted
  UpdateSyncronous(updateContext, _params, owner)
  {
    if (this.#distSortedIndexes.length === 0
      || this.#currentPlayTime >= this.playDuration + this.delayBeforeActivation)
    {
      return;
    }

    this.#currentPlayTime += updateContext.GetDeltaT();
    if (this.#currentPlayTime < this.delayBeforeActivation)
    {
      return;
    }

    const normalizedPlayTime = (this.#currentPlayTime - this.delayBeforeActivation)
      / Math.max(0.01, this.playDuration);
    if (!this.reverseSphereAnimation)
    {
      while (normalizedPlayTime > this.#distSortedIndexes[this.#currentTrigger][0])
      {
        if (Math.random() < this.triggerChance)
        {
          owner.TriggerEntityByID(this.#distSortedIndexes[this.#currentTrigger][1]);
        }
        this.#currentTrigger++;
        if (this.#currentTrigger >= this.#distSortedIndexes.length)
        {
          this.#currentPlayTime = this.playDuration + this.delayBeforeActivation;
          break;
        }
      }
    }
    else
    {
      while (1 - normalizedPlayTime < this.#distSortedIndexes[this.#currentTrigger][0])
      {
        if (Math.random() < this.triggerChance)
        {
          owner.TriggerEntityByID(this.#distSortedIndexes[this.#currentTrigger][1]);
        }
        if (this.#currentTrigger === 0)
        {
          this.#currentPlayTime = this.playDuration + this.delayBeforeActivation;
          break;
        }
        this.#currentTrigger--;
      }
    }
  }

  /** Ignores controller variables; the expansion is purely time-driven. */
  @carbon.method
  @impl.noop
  SetControllerVariable(_name, _value)
  {
  }

}
