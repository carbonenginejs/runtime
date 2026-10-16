import { random as carbonRandom } from "#math/random";
// Source: trinity/trinity/Eve/SpaceObject/Children/Behaviors/SeekTarget.h
// Source: trinity/trinity/Eve/SpaceObject/Children/Behaviors/SeekTarget.cpp
// Hand-maintained from Carbon source, promoted out of generated intake.
import { IBehavior } from "./IBehavior.js";
import { meta, type, blue } from "#schema";
import { be } from "#blue";
import { CjsScriptCallback } from "#blue/CjsScriptCallback";
import { vec3 } from "#math/vec3";
import { quat } from "#math/quat";
import { EveLocatorSets } from "../../locator/EveLocatorSets.js";

const Z_AXIS = vec3.fromValues(0, 0, 1);
const UP_AXIS = vec3.fromValues(0, 1, 0);

/** A steering behaviour that assigns drones to repair locators on a target ship, splitting the target's bounding box into buckets so damage-seeking agents distribute evenly across it. */
@blue.define("SeekTarget")
@blue.inherit(IBehavior)
@blue.interface(IBehavior)
export class SeekTarget
{

  _counter = 0;

  _doneRepairing = true;

  _droneArrived = false;

  _boundingBoxes = [];

  _locatorBucketIndices = [];

  _sortedLocators = false;

  /** m_repairTimePassed */
  _repairTimePassed = 0;

  /** m_startTimer */
  _startTimer = false;

  /** m_parent: the group's space object, taken on the first update. */
  _parent = null;

  /** CalculateBehavior's (position + offset, force) pairs, rewritten each update (Carbon m_returnForces). */
  _returnForces = [];

  _forcePool = [];

  /** m_priority (int32_t) [READWRITE, PERSIST, NOTIFY, ENUM] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.int32
  @type.enum("trinity.IBehavior.ProcessPriority")
  behaviorPriority = 0;

  /** m_behaviorWeight (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  behaviorWeight = 1200;

  /** m_distFromOrigin (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  distFromOrigin = 10;

  /** m_arrivedRadius (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  arrivedRadius = 10;

  /** m_slowDownRadius (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  slowDownRadius = 33;

  /** m_target (EveSpaceObject2*) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @meta.reference
  @type.rootRef("EveSpaceObject2")
  target = null;

  /** m_firstSpawnAtRandomPlaces (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  firstSpawnAtRandomPlaces = false;

  /** m_onFirstDroneArrivedCallback (BlueScriptCallback) [READWRITE] */
  @blue.readwrite
  @type.rawStruct("BlueScriptCallback")
  onFirstDroneArrivedCallback = null;

  /** m_totalRepairTime (float) [READWRITE] */
  @blue.readwrite
  @type.float32
  totalRepairTime = -1;

  /** m_seconds (float) [READWRITE] */
  @blue.readwrite
  @type.float32
  secondsToTurn = 0.35;

  /** m_locatorSetName (BlueSharedString) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  locatorSetName = "damage";

  /** m_locatorSet (EveLocatorSetsPtr) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.rootRef("EveLocatorSets")
  locatorSet = null;

  /** m_exit (bool) [READWRITE] */
  @blue.readwrite
  @type.boolean
  exit = false;

  /** m_repair (bool) [READWRITE] */
  @blue.readwrite
  @type.boolean
  repair = false;

  /** m_enabled (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  enabled = true;

  /** Carbon method AddLocatorSet (MAP_METHOD_AND_WRAP). */
  @blue.method
  @meta.implemented
  AddLocatorSet()
  {
    const locatorSet = new EveLocatorSets();
    locatorSet.SetName(this.locatorSetName);
    this.locatorSet = locatorSet;
  }

  /** Carbon method SetTarget (MAP_METHOD_AND_WRAP). */
  @blue.method
  @meta.implemented
  SetTarget(target)
  {
    this.target = target;
  }

  /** Carbon method ResetBehavior (MAP_METHOD_AND_WRAP). */
  @blue.method
  @meta.implemented
  ResetBehavior()
  {
    this._counter = 0;
    this.exit = false;
    this.repair = false;
    this._droneArrived = false;
    this._doneRepairing = true;
  }

  /** Carbon method SetBehaviorWeight (MAP_METHOD_AND_WRAP). */
  @blue.method
  @meta.implemented
  SetBehaviorWeight(value)
  {
    this.behaviorWeight = value;
  }

  /** Carbon method SetExit (MAP_METHOD_AND_WRAP). */
  @blue.method
  @meta.implemented
  SetExit(value)
  {
    this.exit = value;
  }

  /** Carbon method SetTotalRepairTime (MAP_METHOD_AND_WRAP). */
  @blue.method
  @meta.implemented
  SetTotalRepairTime(seconds)
  {
    this.totalRepairTime = seconds;
  }

  /** Carbon method SetupShipRepair (MAP_METHOD_AND_WRAP). */
  @blue.method
  @meta.implemented
  SetupShipRepair()
  {
    this.exit = false;
    this._droneArrived = false;
    this.repair = true;
  }

  /**
   * Carbon method SplitBoundingBox (MAP_METHOD_AND_WRAP; SeekTarget.cpp:349-411): slices the target's local box
   * along its longest axis into boxes about as long as the second-longest side, then SortLocators fills them.
   *
   * Adapted, stated divergences from Carbon defects (see the known-defects docket):
   * - When the two longest sides are equal, Carbon's secondLargest stays -FLT_MAX (cpp:372 skips an equal side) and
   *   `while( desiredLength > secondLargest )` never ends; here the second side is taken from the other two
   *   dimensions, so a cube still splits.
   * - Carbon counts boxes as int( largest ) / int( desiredLength ) with no last-box clamp; here the count rounds and
   *   the last box ends at the box maximum.
   */
  @blue.method
  @meta.adapted
  SplitBoundingBox()
  {
    this._boundingBoxes.length = 0;
    this._locatorBucketIndices.length = 0;
    this._sortedLocators = false;
    if (!this.target?.GetLocalBoundingBox)
    {
      return false;
    }

    const min = BOUNDS_MIN;
    const max = BOUNDS_MAX;
    if (!this.target.GetLocalBoundingBox(min, max))
    {
      return false;
    }
    const dimensions = vec3.subtract(BOUNDS_SIZE, max, min);
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
      this._boundingBoxes.push({ min: boxMin, max: boxMax });
      this._locatorBucketIndices.push([]);
    }

    this.SortLocators();
    return true;
  }

  /**
   * Carbon SeekTarget::SortLocators (SeekTarget.cpp:413-446): every locator of the set whose raw position lies in a
   * bucket's box (bounds inclusive) joins that bucket. Buckets are the outer loop and there is no break, so a locator
   * on a shared face joins both neighbours (Carbon quirk, reproduced). Empty buckets are then dropped.
   *
   * Adapted: Carbon erases an empty bucket's index list but keeps its bounding box (cpp:432-443), so the box and
   * bucket lists fall out of step and UpdateAgents' bucketId = id % boxes.size() can index past the buckets
   * (undefined behaviour in C++, a throw here); the matching box is dropped too.
   */
  @blue.method
  @meta.adapted
  SortLocators()
  {
    const locators = this.target.GetLocatorsForSet(this.locatorSetName);
    if (!locators)
    {
      return;
    }

    for (let i = 0; i < this._locatorBucketIndices.length; ++i)
    {
      const box = this._boundingBoxes[i];
      for (let j = 0; j < locators.length; ++j)
      {
        const position = locators[j].position;
        if (position[0] >= box.min[0] && position[0] <= box.max[0]
          && position[1] >= box.min[1] && position[1] <= box.max[1]
          && position[2] >= box.min[2] && position[2] <= box.max[2])
        {
          this._locatorBucketIndices[i].push(j);
        }
      }
    }

    // In case we have an empty bucket
    for (let i = 0; i < this._locatorBucketIndices.length;)
    {
      if (this._locatorBucketIndices[i].length === 0)
      {
        this._locatorBucketIndices.splice(i, 1);
        this._boundingBoxes.splice(i, 1);
      }
      else
      {
        ++i;
      }
    }

    this._sortedLocators = true;
  }

  /**
   * A shallow copy of the locator index buckets produced by splitting the target's bounding box, one array per slice.
   */
  @meta.implemented
  GetLocatorBucketIndices()
  {
    return this._locatorBucketIndices.map(bucket => [...bucket]);
  }

  /** Carbon SeekTarget::GetProcessPriority (cpp:37-40). */
  @blue.method
  @meta.implemented
  GetProcessPriority()
  {
    return this.behaviorPriority;
  }

  /**
   * Carbon SeekTarget::GetScratchMemorySize (cpp:43-46). Adapted: scratch is one plain record per agent, so any
   * non-zero answer means "has scratch", as for the other behaviors.
   */
  @blue.method
  @meta.adapted
  GetScratchMemorySize()
  {
    return 1;
  }

  /** Carbon SeekTarget::InitializeScratch (cpp:48-51) and SeekTargetData's defaults (SeekTarget.h:13-34). Adapted: returns the record. */
  @blue.method
  @meta.adapted
  InitializeScratch()
  {
    return {
      bucketId: -1,
      locatorIndex: -1,
      timePassed: 0,
      position: vec3.create(),
      direction: vec3.create(),
      arrived: true,
      hasSpawned: false
    };
  }

  /**
   * Carbon SeekTarget::CalculateBehavior (cpp:53-277): each drone picks a locator - on the repair target when repairing,
   * else from this behavior's own locator set or the group's space object - and steers to a point off it, slowing
   * inside slowDownRadius, facing it and starting its effect, and marking arrival inside arrivedRadius.
   * Carbon quirks kept as written: timePassed is raised to at least secondsToTurn, so the ramp is always at full
   * weight; the force applies behaviorWeight on top of that.
   * Random draws delegate to the matching generator in global/math/random.js.
   */
  @blue.method
  @meta.adapted
  CalculateBehavior(agents, scratchData, deltaTime, group, _system, _dronesInSearchRadius)
  {
    const forces = this._returnForces;
    forces.length = 0;
    let pooled = 0;
    if (this._parent === null) this._parent = group.GetParent();
    if (this.behaviorWeight <= 0 || !this.enabled) return forces;

    if (this.exit && this._counter >= 1)
    {
      this._doneRepairing = true;
      this.exit = false;
      this._counter = 0;
    }

    const repairing = this.repair === true && this.target !== null;
    for (let index = 0; index < agents.length; index++)
    {
      const agent = agents[index], data = scratchData[index];

      if (!data.hasSpawned && this.firstSpawnAtRandomPlaces)
      {
        const spawnPosition = this._FindSpawnPoint(SPAWN_POINT);
        vec3.copy(group.spawnPosition, spawnPosition);
        vec3.copy(agent.position, spawnPosition);
        data.hasSpawned = true;
      }

      if (this.totalRepairTime !== -1 && this._repairTimePassed >= this.totalRepairTime)
      {
        this.SetExit(true);
        this.repair = false;
        this._repairTimePassed = 0;
      }

      if (this._doneRepairing) data.arrived = true;

      if (this.repair === true && this.target !== null)
      {
        if (vec3.exactEquals(agent.target, ORIGIN) || data.locatorIndex === -1)
        {
          if (this._sortedLocators)
          {
            data.bucketId = agent.id % this._boundingBoxes.length;
            data.locatorIndex = carbonRandom.triRandInt(this._locatorBucketIndices[data.bucketId].length);
          }
          else
          {
            data.locatorIndex = carbonRandom.triRandInt(this.target.GetLocatorCount(this.locatorSetName));
          }
        }
        const locatorIndex = this._sortedLocators ? this._locatorBucketIndices[data.bucketId][data.locatorIndex] : data.locatorIndex;
        this.target.GetLocatorPosition(data.position, locatorIndex, false, this.locatorSetName);
        this.target.GetLocatorDirection(data.direction, locatorIndex, false, this.locatorSetName);
      }
      else if (data.arrived && vec3.exactEquals(agent.target, ORIGIN))
      {
        const seekLocators = this._GetLocatorsForSet(this.locatorSetName);
        if (seekLocators !== null && seekLocators.length > 0)
        {
          const locator = seekLocators[carbonRandom.triRandInt(seekLocators.length)];
          vec3.copy(data.position, locator.position);
          vec3.transformQuat(data.direction, UP_AXIS, locator.direction);
        }
        else if (this._parent !== null)
        {
          const locatorIndex = carbonRandom.triRandInt(this._parent.GetLocatorCount(this.locatorSetName));
          vec3.copy(data.position, this._parent.GetLocatorPositionFromSet(locatorIndex, false, this.locatorSetName));
          this._parent.GetLocatorDirection(data.direction, locatorIndex, false, this.locatorSetName);
        }
        data.arrived = false;
      }

      vec3.copy(agent.target, data.position);

      // A zero direction would put the target point on the locator itself and defeat the slow-down radius.
      if (vec3.exactEquals(data.direction, ORIGIN)) vec3.set(data.direction, 0, 1, 0);

      const fakePoint = vec3.normalize(FAKE_POINT, data.direction);
      if (repairing)
      {
        this.target.GetShapeEllipsoid(ELLIPSOID_CENTER, ELLIPSOID_RADII);
        vec3.multiply(fakePoint, fakePoint, vec3.scale(ELLIPSOID_RADII, ELLIPSOID_RADII, 1.2));
      }
      else
      {
        vec3.scale(fakePoint, fakePoint, this.distFromOrigin);
      }
      vec3.add(fakePoint, fakePoint, agent.target);

      const desiredVelocity = vec3.subtract(DESIRED_VELOCITY, fakePoint, agent.position);
      const distance = vec3.length(desiredVelocity);
      vec3.normalize(desiredVelocity, desiredVelocity);

      if (distance < this.slowDownRadius)
      {
        vec3.scale(desiredVelocity, desiredVelocity, distance / this.slowDownRadius);

        if (!this._droneArrived && this.onFirstDroneArrivedCallback)
        {
          CjsScriptCallback.from(this.onFirstDroneArrivedCallback).CallVoid();
          this._droneArrived = true;
          this._doneRepairing = false;
          if (this.repair) this._startTimer = true;
        }

        const inverseDirection = vec3.normalize(INVERSE_DIRECTION, vec3.subtract(INVERSE_DIRECTION, data.position, agent.position));
        quat.rotationArc(agent.rotation, Z_AXIS, inverseDirection);
        data.timePassed = 0;

        if (!agent.playFX)
        {
          agent.fxStartTime = be.os.GetActualTime();
          agent.playFX = true;
        }

        if (distance < this.arrivedRadius) data.arrived = true;
      }
      else
      {
        data.timePassed = Math.max(data.timePassed + deltaTime, this.secondsToTurn);
        const value = this.behaviorWeight * (Math.max(data.timePassed, this.secondsToTurn) / this.secondsToTurn);
        vec3.scale(desiredVelocity, desiredVelocity, value);
      }

      if (this.exit)
      {
        agent.playFX = false;
        this.repair = false;
        data.locatorIndex = -1;
        this._droneArrived = false;
        this._counter++;
        this._startTimer = false;
      }

      const offset = this._PooledForce(pooled++);
      const force = this._PooledForce(pooled++);
      vec3.subtract(force, vec3.scale(FORCE_SCRATCH, desiredVelocity, this.behaviorWeight), agent.velocity);
      vec3.add(agent.acceleration, agent.acceleration, vec3.subtract(FORCE_SCRATCH, desiredVelocity, agent.velocity));
      forces.push(vec3.scaleAndAdd(offset, agent.position, force, group.GetBoundingSphereRadius()), force);
    }

    this._doneRepairing = false;
    if (this._startTimer) this._repairTimePassed += deltaTime;
    return forces;
  }

  /** One reusable vector of the returned force pairs, grown as the agent count does. */
  _PooledForce(index)
  {
    while (this._forcePool.length <= index) this._forcePool.push(vec3.create());
    return this._forcePool[index];
  }

  /** Carbon SeekTarget::GetLocatorsForSet (cpp:283-290): this behavior's own set when its name matches. */
  @blue.method
  _GetLocatorsForSet(setName)
  {
    return this.locatorSet !== null && this.locatorSet.HasName(setName) ? this.locatorSet.GetLocators() : null;
  }

  /** Carbon SeekTarget::FindSpawnPoint (cpp:337-355): a random locator from the own set, else from the group's space object. */
  @blue.method
  _FindSpawnPoint(out)
  {
    const seekLocators = this._GetLocatorsForSet(this.locatorSetName);
    if (seekLocators !== null && seekLocators.length > 0)
    {
      return vec3.copy(out, seekLocators[carbonRandom.triRandInt(seekLocators.length)].position);
    }
    if (this._parent !== null)
    {
      const locatorIndex = carbonRandom.triRandInt(this._parent.GetLocatorCount(this.locatorSetName));
      return vec3.copy(out, this._parent.GetLocatorPositionFromSet(locatorIndex, false, this.locatorSetName));
    }
    return vec3.set(out, 0, 0, 0);
  }

}

// Module scratch for the per-agent loop (behavior updates run sequentially).
const ORIGIN = vec3.create();
const FAKE_POINT = vec3.create();
const DESIRED_VELOCITY = vec3.create();
const INVERSE_DIRECTION = vec3.create();
const FORCE_SCRATCH = vec3.create();
const ELLIPSOID_CENTER = vec3.create();
const ELLIPSOID_RADII = vec3.create();
const SPAWN_POINT = vec3.create();
const BOUNDS_MIN = vec3.create();
const BOUNDS_MAX = vec3.create();
const BOUNDS_SIZE = vec3.create();
