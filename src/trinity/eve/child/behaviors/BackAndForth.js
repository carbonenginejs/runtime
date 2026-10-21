import { random as carbonRandom } from "#math/random";
// Source: trinity/trinity/Eve/SpaceObject/Children/Behaviors/BackAndForth.h
//   trinity/trinity/Eve/SpaceObject/Children/Behaviors/BackAndForth.cpp
// Hand-maintained from Carbon source, promoted out of generated intake.
import { IBehavior } from "./IBehavior.js";
import { meta, type, blue } from "#schema";
import { blue as be } from "#blue";
import { LocatorType } from "./enums.js";
import { quat } from "#math/quat";
import { mat3 } from "#math/mat3";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { ITr2DebugRenderer2, Tr2DebugColor, Tr2DebugObjectReference } from "#interfaces";
import { EveLocatorSets } from "../../locator/EveLocatorSets.js";

// Module scratch for the per-agent loop (behavior updates run sequentially).
const Z_AXIS = vec3.fromValues(0, 0, 1);
const UP_AXIS = vec3.fromValues(0, 1, 0);
const TARGET_POINT = vec3.create();
const AGENT_POSITION_WS = vec3.create();
const DESIRED_VELOCITY = vec3.create();
const INV_DIR = vec3.create();
const NO_FORCES = [];

// Debug-draw scratch (debug drawing runs sequentially).
const DEBUG_TRANSFORM = mat4.create();
const DEBUG_NORMAL_MATRIX = mat3.create();
const DEBUG_CENTER = vec3.create();
const DEBUG_DIRECTION = vec3.create();
const DEBUG_POSITION = vec3.create();

/** A steering behaviour that shuttles each drone between seek and deliver locators, slowing on approach, snapping its facing, and triggering effects on arrival. */
@blue.define("BackAndForth")
@blue.inherit(IBehavior)
@blue.interface(IBehavior)
export class BackAndForth
{

  /** m_priority (int32_t) [READWRITE, PERSIST, NOTIFY, ENUM] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.int32
  @type.enum("trinity.IBehavior.ProcessPriority")
  behaviorPriority = 0;

  /** m_enabled (bool) [READWRITE, PERSIST, NOTIFY, ENUM] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.boolean
  @type.enum("trinity.IBehavior.ProcessPriority")
  enabled = true;

  /** m_locatorType (LocatorType - enum LocatorType) [READWRITE, PERSIST, ENUM, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.int32
  @type.enum("trinity.BackAndForth.LocatorType")
  locatorType = 0;

  /** m_locatorSets (PEveLocatorSetsVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveLocatorSets")
  locatorSet = [];

  /** m_arrivedRadius (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  arrivedRadius = 50;

  /** m_distFromOrigin (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  distFromOrigin = 20;

  /** m_slowDownRadius (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  slowDownRadius = 200;

  /** m_backAndForthWeight (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  backAndForthWeight = 100;

  /** m_fxBehavior (IBehavior*) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.rootRef("IBehavior")
  fxBehavior = null;

  /** m_target (EveSpaceObject2*) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @meta.reference
  @type.rootRef("EveSpaceObject2")
  target = null;

  /** m_parent (EveSpaceObject2*) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @meta.reference
  @type.rootRef("EveSpaceObject2")
  parent = null;

  /** m_seconds (float) [READWRITE] */
  @blue.readwrite
  @type.float32
  secondsToTurn = 0.25;

  /** m_locatorSetName (BlueSharedString) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  locatorSetName = "damage";

  // Debug arrival point (Carbon m_arrivalPoint).
  _arrivalPoint = vec3.create();

  /** Carbon BackAndForth::GetProcessPriority (cpp:31-34). */

  @meta.implemented
  GetProcessPriority()
  {
    return this.behaviorPriority;
  }

  /** Carbon BackAndForth::GetBehaviorName (cpp:36-39). */

  @meta.implemented
  GetBehaviorName()
  {
    return "BackAndForth";
  }

  /**
   * Per-agent scratch record count (Carbon sizeof(BackAndForthData)).
   *
   * Adapted: Carbon returns a byte size; the JS port models scratch as one plain record per agent, so any non-zero
   * value means 'has scratch'.
   */

  @meta.adapted
  GetScratchMemorySize()
  {
    return 1;
  }

  /**
   * Fresh per-agent scratch record (Carbon BackAndForthData placement init).
   *
   * Adapted: Carbon initializes caller-provided raw memory; the JS port returns the fresh record instead.
   */

  @meta.adapted
  InitializeScratch()
  {
    return {
      locatorTarget: vec3.create(),
      locatorDirection: vec3.create(),
      locatorIndex: -1,
      seek: true,
      deliver: false,
      arrived: true,
      timePassed: 0
    };
  }

  /**
   * Shuttles each agent between its seek/deliver (or parent/target) locators
   * with arrival slow-down, facing snap, and PlayFX triggering (Carbon
   * CalculateBehavior, cpp:51-194).
   * @param {Array} agents - DroneAgent records
   * @param {Array} scratchData - per-agent BackAndForthData records
   * @param {Number} deltaTime
   * @param {Object} group - owning BehaviorGroup
   * @param {Object} system - owning EveChildBehaviorSystem
   * @param {Array} _dronesInSearchRadius - unused
   * @returns {Array} empty (as Carbon)
   *
   * Random draws delegate to the matching generator in global/math/random.js.
   */

  @meta.adapted
  CalculateBehavior(agents, scratchData, deltaTime, group, system, _dronesInSearchRadius)
  {
    if (!this.enabled)
    {
      return NO_FORCES;
    }

    if (this.fxBehavior === null)
    {
      this.fxBehavior = group.GetBehaviorByName("PlayFX");
    }

    const worldTransform = system.GetWorldTransform();

    for (let c = 0; c < agents.length; c++)
    {
      const agent = agents[c];
      const data = scratchData?.[c];
      if (!data)
      {
        continue;
      }

      if (this.locatorType === BackAndForth.LocatorType.LOCAL_LOCATORS)
      {
        if (data.arrived)
        {
          if (data.seek)
          {
            const seekLocators = this._GetLocatorsForSet("seek");
            if (seekLocators !== null && seekLocators.length > 0)
            {
              const index = carbonRandom.triRandInt(seekLocators.length);
              vec3.copy(data.locatorTarget, seekLocators[index].position);
              vec3.transformQuat(data.locatorDirection, UP_AXIS, seekLocators[index].direction);
            }
          }
          else if (data.deliver)
          {
            const deliverLocators = this._GetLocatorsForSet("deliver");
            if (deliverLocators !== null && deliverLocators.length > 0)
            {
              const index = carbonRandom.triRandInt(deliverLocators.length);
              vec3.copy(data.locatorTarget, deliverLocators[index].position);
              vec3.transformQuat(data.locatorDirection, UP_AXIS, deliverLocators[index].direction);
            }
          }
          data.arrived = false;
        }
      }
      else if (this.locatorType === BackAndForth.LocatorType.PARENT_LOCATORS)
      {
        if (this.parent === null)
        {
          this.parent = group.GetParent();
        }

        if (data.arrived && this.parent)
        {
          // Pick a new locator to go to
          const count = this.parent.GetLocatorCount(this.locatorSetName);
          data.locatorIndex = carbonRandom.triRandInt(Math.max(count, 1));
        }

        this._GetOwnerLocatorPosition(this.parent, data);
        data.arrived = false;
      }
      else if (this.locatorType === BackAndForth.LocatorType.TARGET_LOCATORS)
      {
        if (data.arrived && this.target)
        {
          // Pick a new locator to go to
          const count = this.target.GetLocatorCount(this.locatorSetName);
          data.locatorIndex = carbonRandom.triRandInt(Math.max(count, 1));
        }

        this._GetOwnerLocatorPosition(this.target, data);
        data.arrived = false;
      }

      vec3.copy(agent.target, data.locatorTarget);

      // If the direction is (0,0,0) it points up, but then the slow-down
      // radius won't work
      if (vec3.squaredLength(data.locatorDirection) === 0)
      {
        vec3.set(data.locatorDirection, 0, 1, 0);
      }

      vec3.normalize(TARGET_POINT, data.locatorDirection);
      vec3.scale(TARGET_POINT, TARGET_POINT, this.distFromOrigin);
      vec3.add(TARGET_POINT, TARGET_POINT, data.locatorTarget);

      // For debugging
      vec3.copy(this._arrivalPoint, TARGET_POINT);

      vec3.transformMat4(AGENT_POSITION_WS, agent.position, worldTransform);

      vec3.subtract(DESIRED_VELOCITY, TARGET_POINT, AGENT_POSITION_WS);
      const distance = vec3.length(DESIRED_VELOCITY);
      vec3.normalize(DESIRED_VELOCITY, DESIRED_VELOCITY);

      // If we are approaching the target
      if (distance < this.slowDownRadius)
      {
        // make the agent slow down before arriving at target
        vec3.scale(DESIRED_VELOCITY, DESIRED_VELOCITY, this.backAndForthWeight * (distance / this.slowDownRadius));

        // Set the rotation of the drone
        vec3.subtract(INV_DIR, data.locatorTarget, AGENT_POSITION_WS);
        vec3.normalize(INV_DIR, INV_DIR);
        // Carbon TriQuaternionRotationArc(&newRotation, &zAxis, &invDir)
        // (BackAndForth.cpp:165); a zero direction yields identity.
        quat.rotationArc(agent.rotation, Z_AXIS, INV_DIR);
        data.timePassed = 0;

        // Start playing fx when slowing down
        if (!agent.playFX && this.fxBehavior !== null)
        {
          agent.fxStartTime = be.os.GetActualTime(); // BackAndForth.cpp:172
          agent.playFX = true;
        }

        // If the agent has arrived at the target, switch targets
        if (distance < this.arrivedRadius)
        {
          const seek = data.seek;
          data.seek = data.deliver;
          data.deliver = seek;
          data.arrived = true;
        }
      }
      else
      {
        // Have the drone slowly start moving based on time passed
        data.timePassed += deltaTime;
        data.timePassed = Math.max(data.timePassed, this.secondsToTurn);
        vec3.scale(DESIRED_VELOCITY, DESIRED_VELOCITY, Math.max(data.timePassed, this.secondsToTurn) / this.secondsToTurn);
      }
      vec3.add(agent.acceleration, agent.acceleration, DESIRED_VELOCITY);
      vec3.subtract(agent.acceleration, agent.acceleration, agent.velocity);
    }

    return NO_FORCES;
  }

  /**
   * Carbon BackAndForth::GetDebugOptions (cpp:196-200).
   * @param {Set<string>} options The caller-owned option set.
   */

  @meta.implemented
  GetDebugOptions(options)
  {
    options.add("Locators");
    options.add("Locator Radius");
  }

  /**
   * Carbon BackAndForth::RenderDebugInfo (cpp:202-316): a sphere arrow for
   * every locator the behavior shuttles between (its own sets, or the
   * parent's or target's named set), then the arrival spheres around the
   * target points.
   * @param {ITr2DebugRenderer2} renderer
   * @param {Array} _agents DroneAgent records (unused, as in Carbon).
   * @param {mat4} parentWorldLocation Places the locators in world space.
   */

  @meta.implemented
  RenderDebugInfo(renderer, _agents, parentWorldLocation)
  {
    const { Wireframe, Lit } = ITr2DebugRenderer2.Effect;
    if (renderer.HasOption(this, "Locators"))
    {
      const boundingSphereRadius = 100;
      const modelScale = 10;
      if (this.locatorType === BackAndForth.LocatorType.LOCAL_LOCATORS)
      {
        for (const set of this.locatorSet)
        {
          const locators = set.GetLocators();
          for (let i = 0; i < locators.length; ++i)
          {
            const locator = locators[i];
            const position = locator.position;
            const rotation = locator.direction;
            const color = 0x990088ff;

            // Carbon XMVector3TransformCoord( position, parentWorldLocation ).
            vec3.transformMat4(DEBUG_CENTER, position, parentWorldLocation);

            // Carbon (row-vector): XMVector3TransformNormal( Vector3( 0, 1, 0 ), Matrix( XMMatrixRotationQuaternion( rotation ) ) * parentWorldLocation ).
            mat4.fromQuat(DEBUG_TRANSFORM, rotation);
            mat4.multiply(DEBUG_TRANSFORM, parentWorldLocation, DEBUG_TRANSFORM);
            vec3.transformMat3(DEBUG_DIRECTION, UP_AXIS, mat3.fromMat4(DEBUG_NORMAL_MATRIX, DEBUG_TRANSFORM));

            renderer.DrawSphereArrow(
              Tr2DebugObjectReference.create__ObjectArea(locators, i),
              DEBUG_CENTER,
              DEBUG_DIRECTION,
              boundingSphereRadius * modelScale / 50,
              8,
              Lit,
              Tr2DebugColor.create__Uint32(color));
          }
        }
      }
      else if (this.locatorType === BackAndForth.LocatorType.PARENT_LOCATORS && this.parent)
      {
        const locatorList = this.parent.GetLocatorsForSet(this.locatorSetName);
        for (let i = 0; i < locatorList.length; ++i)
        {
          const locator = locatorList[i];
          const position = locator.position;
          const rotation = locator.direction;
          const color = 0x990088ff;

          // Carbon XMVector3TransformCoord( position, parentWorldLocation ).
          vec3.transformMat4(DEBUG_CENTER, position, parentWorldLocation);

          // Carbon (row-vector): XMVector3TransformNormal( Vector3( 0, 1, 0 ), Matrix( XMMatrixRotationQuaternion( rotation ) ) * parentWorldLocation ).
          mat4.fromQuat(DEBUG_TRANSFORM, rotation);
          mat4.multiply(DEBUG_TRANSFORM, parentWorldLocation, DEBUG_TRANSFORM);
          vec3.transformMat3(DEBUG_DIRECTION, UP_AXIS, mat3.fromMat4(DEBUG_NORMAL_MATRIX, DEBUG_TRANSFORM));

          renderer.DrawSphereArrow(
            Tr2DebugObjectReference.create__ObjectArea(locatorList, i),
            DEBUG_CENTER,
            DEBUG_DIRECTION,
            boundingSphereRadius * modelScale / 50,
            8,
            Lit,
            Tr2DebugColor.create__Uint32(color));
        }
      }
      else if (this.locatorType === BackAndForth.LocatorType.TARGET_LOCATORS && this.target)
      {
        const locatorList = this.target.GetLocatorsForSet(this.locatorSetName);
        for (let i = 0; i < locatorList.length; ++i)
        {
          const locator = locatorList[i];
          const position = locator.position;
          const rotation = locator.direction;
          const color = 0x990088ff;

          // Carbon XMVector3TransformCoord( position, parentWorldLocation ).
          vec3.transformMat4(DEBUG_CENTER, position, parentWorldLocation);

          // Carbon (row-vector): XMVector3TransformNormal( Vector3( 0, 1, 0 ), Matrix( XMMatrixRotationQuaternion( rotation ) ) * parentWorldLocation ).
          mat4.fromQuat(DEBUG_TRANSFORM, rotation);
          mat4.multiply(DEBUG_TRANSFORM, parentWorldLocation, DEBUG_TRANSFORM);
          vec3.transformMat3(DEBUG_DIRECTION, UP_AXIS, mat3.fromMat4(DEBUG_NORMAL_MATRIX, DEBUG_TRANSFORM));

          renderer.DrawSphereArrow(
            Tr2DebugObjectReference.create__ObjectArea(locatorList, i),
            DEBUG_CENTER,
            DEBUG_DIRECTION,
            boundingSphereRadius * modelScale / 50,
            8,
            Lit,
            Tr2DebugColor.create__Uint32(color));
        }
      }
    }

    if (renderer.HasOption(this, "Locator Radius"))
    {
      if (this.locatorType === BackAndForth.LocatorType.LOCAL_LOCATORS)
      {
        renderer.DrawSphere__CenterRadius(Tr2DebugObjectReference.create__Object(this), this._arrivalPoint, this.arrivedRadius, 8, Wireframe, Tr2DebugColor.create__Uint32(0xffff00ff));
        renderer.DrawSphere__CenterRadius(Tr2DebugObjectReference.create__Object(this), this._arrivalPoint, 5, 8, Wireframe, Tr2DebugColor.create__Uint32(0xff0000ff));
        renderer.DrawSphere__CenterRadius(Tr2DebugObjectReference.create__Object(this), this._arrivalPoint, this.slowDownRadius, 8, Wireframe, Tr2DebugColor.create__Uint32(0xff86d2fd));
      }
      else if (this.locatorType === BackAndForth.LocatorType.PARENT_LOCATORS && this.parent)
      {
        const count = this.parent.GetLocatorCount(this.locatorSetName);
        for (let i = 0; i < count; ++i)
        {
          const pos = vec3.set(DEBUG_POSITION, 0, 0, 0);
          const dir = vec3.set(DEBUG_DIRECTION, 0, 0, 0);
          this.parent.GetLocatorPosition(pos, i, true, this.locatorSetName);
          this.parent.GetLocatorDirection(dir, i, true, this.locatorSetName);

          const targetPoint = vec3.normalize(DEBUG_CENTER, dir);
          vec3.scale(targetPoint, targetPoint, this.arrivedRadius);
          vec3.add(targetPoint, targetPoint, pos);
          renderer.DrawSphere__CenterRadius(Tr2DebugObjectReference.create__Object(this), targetPoint, this.arrivedRadius, 8, Wireframe, Tr2DebugColor.create__Uint32(0xffff00ff));
          renderer.DrawSphere__CenterRadius(Tr2DebugObjectReference.create__Object(this), targetPoint, this.slowDownRadius, 8, Wireframe, Tr2DebugColor.create__Uint32(0xff86d2fd));
        }
      }
      else if (this.locatorType === BackAndForth.LocatorType.TARGET_LOCATORS && this.target)
      {
        const count = this.target.GetLocatorCount(this.locatorSetName);
        for (let i = 0; i < count; ++i)
        {
          const pos = vec3.set(DEBUG_POSITION, 0, 0, 0);
          const dir = vec3.set(DEBUG_DIRECTION, 0, 0, 0);
          this.target.GetLocatorPosition(pos, i, true, this.locatorSetName);
          this.target.GetLocatorDirection(dir, i, true, this.locatorSetName);

          const targetPoint = vec3.normalize(DEBUG_CENTER, dir);
          vec3.scale(targetPoint, targetPoint, this.arrivedRadius);
          vec3.add(targetPoint, targetPoint, pos);
          renderer.DrawSphere__CenterRadius(Tr2DebugObjectReference.create__Object(this), targetPoint, this.arrivedRadius, 8, Wireframe, Tr2DebugColor.create__Uint32(0xffff00ff));
          renderer.DrawSphere__CenterRadius(Tr2DebugObjectReference.create__Object(this), targetPoint, this.slowDownRadius, 8, Wireframe, Tr2DebugColor.create__Uint32(0xff86d2fd));
        }
      }
    }
  }

  /** Carbon method AddLocatorSet (MAP_METHOD_AND_WRAP). */
  @blue.method
  @meta.implemented
  AddLocatorSet()
  {
    const seek = new EveLocatorSets();
    seek.SetName("seek");
    const deliver = new EveLocatorSets();
    deliver.SetName("deliver");
    this.locatorSet.push(seek, deliver);
  }

  /** Carbon BackAndForth::SetParent (cpp:348-354). */

  @meta.implemented
  SetParent(parent)
  {
    this.parent = parent ?? null;
  }

  // Carbon GetLocatorsForSet (cpp:322-332): first locator set with the name.
  /**
   * The locators of the first locator set matching a name, or null when none matches.
   */

  _GetLocatorsForSet(setName)
  {
    for (const set of this.locatorSet)
    {
      if (set.HasName(setName))
      {
        return set.GetLocators();
      }
    }
    return null;
  }

  /**
   * Carbon GetParentLocatorPosition (BackAndForth.cpp:356-363): null-guard
   * the parent, then the world position and direction of its indexed locator
   * from the behaviour's named set, into the caller's two out-vectors.
   */

  @meta.implemented
  GetParentLocatorPosition(locatorIndex, outPosition, outDirection)
  {
    this._ReadOwnerLocator(this.parent, locatorIndex, outPosition, outDirection);
  }

  /** Carbon GetTargetLocatorPosition (cpp:365-372): the target twin. */

  @meta.implemented
  GetTargetLocatorPosition(locatorIndex, outPosition, outDirection)
  {
    this._ReadOwnerLocator(this.target, locatorIndex, outPosition, outDirection);
  }

  /** The shared body of the pair above: Carbon's GetLocatorPosition and GetLocatorDirection on the owner (cpp:360-370). */
  _ReadOwnerLocator(owner, locatorIndex, outPosition, outDirection)
  {
    if (owner)
    {
      owner.GetLocatorPosition(outPosition, locatorIndex, true, this.locatorSetName);
      owner.GetLocatorDirection(outDirection, locatorIndex, true, this.locatorSetName);
    }
  }

  /**
   * Reads the world position and forward direction of an owner's currently indexed locator into the agent's scratch record.
   */
  _GetOwnerLocatorPosition(owner, data)
  {
    this._ReadOwnerLocator(owner, data.locatorIndex, data.locatorTarget, data.locatorDirection);
  }

  static LocatorType = LocatorType;

}
