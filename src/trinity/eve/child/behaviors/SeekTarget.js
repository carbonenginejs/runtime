// Source: trinity/trinity/Eve/SpaceObject/Children/Behaviors/SeekTarget.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import { vec3 } from "#math/vec3";
import { EveLocatorSets } from "../../locator/EveLocatorSets.js";

/** A steering behaviour that assigns drones to repair locators on a target ship, splitting the target's bounding box into buckets so damage-seeking agents distribute evenly across it. */
@type.define({ className: "SeekTarget", family: "eve/child/behaviors" })
export class SeekTarget extends CjsModel
{

  #counter = 0;

  #doneRepairing = true;

  #droneArrived = false;

  #boundingBoxes = [];

  #locatorBucketIndices = [];

  #sortedLocators = false;

  /** m_priority (int32_t) [READWRITE, PERSIST, NOTIFY, ENUM] */
  @io.notify
  @io.persist
  @type.int32
  behaviorPriority = 0;

  /** m_behaviorWeight (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  behaviorWeight = 1200;

  /** m_distFromOrigin (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  distFromOrigin = 10;

  /** m_arrivedRadius (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  arrivedRadius = 10;

  /** m_slowDownRadius (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  slowDownRadius = 33;

  /** m_target (EveSpaceObject2*) [READWRITE, PERSIST] */
  @io.persist
  @type.model("EveSpaceObject2")
  target = null;

  /** m_firstSpawnAtRandomPlaces (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  firstSpawnAtRandomPlaces = false;

  /** m_onFirstDroneArrivedCallback (BlueScriptCallback) [READWRITE] */
  @io.readwrite
  @type.rawStruct("BlueScriptCallback")
  onFirstDroneArrivedCallback = null;

  /** m_totalRepairTime (float) [READWRITE] */
  @io.readwrite
  @type.float32
  totalRepairTime = -1;

  /** m_seconds (float) [READWRITE] */
  @io.readwrite
  @type.float32
  secondsToTurn = 0.35;

  /** m_locatorSetName (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  locatorSetName = "damage";

  /** m_locatorSet (EveLocatorSetsPtr) [READ, PERSIST] */
  @io.persist
  @type.model("EveLocatorSets")
  locatorSet = null;

  /** m_exit (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  exit = false;

  /** m_repair (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  repair = false;

  /** m_enabled (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  enabled = true;

  /** Carbon method AddLocatorSet (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  AddLocatorSet()
  {
    const locatorSet = new EveLocatorSets();
    locatorSet.SetName(this.locatorSetName);
    this.locatorSet = locatorSet;
  }

  /** Carbon method SetTarget (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  SetTarget(target)
  {
    this.target = target;
  }

  /** Carbon method ResetBehavior (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  ResetBehavior()
  {
    this.#counter = 0;
    this.exit = false;
    this.repair = false;
    this.#droneArrived = false;
    this.#doneRepairing = true;
  }

  /** Carbon method SetBehaviorWeight (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  SetBehaviorWeight(value)
  {
    this.behaviorWeight = value;
  }

  /** Carbon method SetExit (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  SetExit(value)
  {
    this.exit = value;
  }

  /** Carbon method SetTotalRepairTime (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  SetTotalRepairTime(seconds)
  {
    this.totalRepairTime = seconds;
  }

  /** Carbon method SetupShipRepair (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  SetupShipRepair()
  {
    this.exit = false;
    this.#droneArrived = false;
    this.repair = true;
  }

  /** Carbon method SplitBoundingBox (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("Uses EveSpaceObject2's portable bounds and locator query methods, and safely handles equal or degenerate box dimensions.")
  SplitBoundingBox()
  {
    this.#boundingBoxes.length = 0;
    this.#locatorBucketIndices.length = 0;
    this.#sortedLocators = false;
    if (!this.target?.GetLocalBoundingBox)
    {
      return false;
    }

    const min = vec3.create();
    const max = vec3.create();
    if (!this.target.GetLocalBoundingBox(min, max))
    {
      return false;
    }
    const dimensions = vec3.subtract(vec3.create(), max, min);
    let maxIndex = 0;
    for (let index = 1; index < 3; index++)
    {
      if (dimensions[index] > dimensions[maxIndex])
      {
        maxIndex = index;
      }
    }
    const largest = dimensions[maxIndex];
    if (!Number.isFinite(largest) || largest <= 0)
    {
      return false;
    }
    const otherDimensions = [
      dimensions[(maxIndex + 1) % 3],
      dimensions[(maxIndex + 2) % 3]
    ];
    const secondLargest = Math.max(...otherDimensions.filter(Number.isFinite), 0);
    let desiredLength = largest;
    if (secondLargest > 0)
    {
      while (desiredLength > secondLargest)
      {
        desiredLength *= 0.5;
      }
    }
    const boxCount = secondLargest > 0
      ? Math.max(1, Math.round(largest / desiredLength))
      : 1;
    for (let index = 0; index < boxCount; index++)
    {
      const boxMin = vec3.clone(min);
      const boxMax = vec3.clone(max);
      boxMin[maxIndex] = min[maxIndex] + index * desiredLength;
      boxMax[maxIndex] = index === boxCount - 1
        ? max[maxIndex]
        : min[maxIndex] + (index + 1) * desiredLength;
      this.#boundingBoxes.push({ min: boxMin, max: boxMax });
      this.#locatorBucketIndices.push([]);
    }

    const locatorCount = Math.max(0, Number(this.target.GetLocatorCount?.(this.locatorSetName)) || 0);
    const position = vec3.create();
    for (let locatorIndex = 0; locatorIndex < locatorCount; locatorIndex++)
    {
      const locatorPosition = this.target.GetLocatorPositionFromSet?.(
        locatorIndex,
        false,
        this.locatorSetName,
        position
      );
      if (!locatorPosition)
      {
        continue;
      }
      for (let bucketIndex = 0; bucketIndex < this.#boundingBoxes.length; bucketIndex++)
      {
        const box = this.#boundingBoxes[bucketIndex];
        if (locatorPosition[0] >= box.min[0] && locatorPosition[0] <= box.max[0]
          && locatorPosition[1] >= box.min[1] && locatorPosition[1] <= box.max[1]
          && locatorPosition[2] >= box.min[2] && locatorPosition[2] <= box.max[2])
        {
          this.#locatorBucketIndices[bucketIndex].push(locatorIndex);
          break;
        }
      }
    }

    for (let index = this.#locatorBucketIndices.length - 1; index >= 0; index--)
    {
      if (this.#locatorBucketIndices[index].length === 0)
      {
        this.#locatorBucketIndices.splice(index, 1);
        this.#boundingBoxes.splice(index, 1);
      }
    }
    this.#sortedLocators = true;
    return true;
  }

  @impl.implemented
  /**
   * A shallow copy of the locator index buckets produced by splitting the target's bounding box, one array per slice.
   */
  GetLocatorBucketIndices()
  {
    return this.#locatorBucketIndices.map(bucket => [...bucket]);
  }

}
