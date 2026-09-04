// Source: trinity/trinity/Eve/SpaceObject/EveSwarm.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
import { EveShip2 } from "../EveShip2.js";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { EveSwarmRenderable } from "./EveSwarmRenderable.js";

/** A ship that manages a squad of flocking sub-vehicle renderables with boid-style formation behaviour and aggregate bounding and component registration. */
@type.define({ className: "EveSwarm", family: "eve/spaceObject/swarm" })
export class EveSwarm extends EveShip2
{

  /** CPU SwarmVehicle state; live draw resources remain renderer-owned. */
  @type.list("SwarmVehicle")
  vehicles = [];

  @type.list("EveSwarmRenderable")
  renderables = [];

  @type.int32
  targetIndex = 0;

  @type.int32
  firingIndex = 0;

  @type.vec3
  squadBoundsMin = vec3.create();

  @type.vec3
  squadBoundsMax = vec3.create();

  /** m_behavior.m_weightFormation (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  weightFormation = 1;

  /** m_behavior.m_weightCohesion (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  weightCohesion = 0.1;

  /** m_behavior.m_weightSeparation (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  weightSeparation = 0.1;

  /** m_behavior.m_weightWander (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  weightWander = 0.33;

  /** m_behavior.m_weightAnchor (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  weightAnchor = 0.5;

  /** m_behavior.m_anchorRadius0 (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  anchorRadius0 = 75;

  /** m_behavior.m_anchorRadius1 (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  anchorRadius1 = 250;

  /** m_behavior.m_weightDecelerate (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  weightDeceleration = 0.1;

  /** m_behavior.m_maxDeceleration (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  maxDeceleration = 200;

  /** m_behavior.m_separationDistance (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  separationDistance = 250;

  /** m_behavior.m_formationDistance (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  formationDistance = 50;

  /** m_behavior.m_wanderFluctuation (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  wanderFluctuation = 0.05;

  /** m_behavior.m_wanderDistance (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  wanderDistance = 100;

  /** m_behavior.m_wanderRadius (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  wanderRadius = 80;

  /** m_debugShowForces (bool) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.boolean
  debugShowForces = false;

  /** m_count (int32_t) [READ, PERSIST] */
  @io.persist
  @type.int32
  count = 1;

  /** m_swarmingEnabled (bool) [READ, PERSIST] */
  @io.persist
  @type.boolean
  swarmingEnabled = false;

  /** m_behavior.m_mass (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  mass = 1;

  /** m_behavior.m_speedMultiplier (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  speedMultiplier = 1.1;

  /** m_behavior.m_speedMinimum (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  speedMinimum = 10;

  /** m_behavior.m_maxDistance0 (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  maxDistance0 = 500;

  /** m_behavior.m_maxDistance1 (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  maxDistance1 = 125;

  /** m_behavior.m_maxTime (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  maxTime = 0.2;

  /** m_behavior.m_agility (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  agility = 2;

  /** m_behavior.m_speed0 (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  speed0 = 700;

  /** m_behavior.m_speed1 (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  speed1 = 1000;

  /** m_behavior.m_timeMultiplier (float) [READWRITE] */
  @io.readwrite
  @type.float32
  timeMultiplier = 1;

  /** m_behavior.m_weightAlign (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  weightAlign = 50;

  /** Carbon EveSwarm::RegisterComponents (EveSwarm.cpp:1000-1017): base
   * registration "to register all the turrets and things", then
   * UnRegisterAllComponents(this) because the swarm itself is container-only,
   * then forwards the per-swarmer renderables. */
  @carbon.method
  @impl.implemented
  RegisterComponents()
  {
    super.RegisterComponents();
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      registry.UnRegisterAllComponents(this);
      for (const renderable of this.renderables)
      {
        renderable?.Register?.(registry);
      }
    }
  }

  /** Carbon EveSwarm::UnRegisterComponents (EveSwarm.cpp:1019-1030): base,
   * then forwards the renderables. */
  @carbon.method
  @impl.implemented
  UnRegisterComponents()
  {
    super.UnRegisterComponents();
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      for (const renderable of this.renderables)
      {
        renderable?.UnRegister?.(registry);
      }
    }
  }

  /** Carbon EveSwarm::GetBoundingSphere (EveSwarm.cpp:801-808): sphere from
   * the squad bounds box (BoundingSphereFromBox, Utilities/BoundingSphere.cpp:
   * 182-197 - center (min+max)/2, radius |min-max|/2), with the EveShip2
   * sphere's RADIUS added on top (the ship sphere's center is discarded).
   * Always returns true. Feeds EveSwarmRenderable.IsCastingShadow's
   * squad-radius-at-the-fighter cull sphere. */
  @carbon.method
  @impl.implemented
  GetBoundingSphere(sphere, query = 0)
  {
    super.GetBoundingSphere(EveSwarm.#shipSphereScratch, query);
    const min = this.squadBoundsMin;
    const max = this.squadBoundsMax;
    sphere[0] = (min[0] + max[0]) * 0.5;
    sphere[1] = (min[1] + max[1]) * 0.5;
    sphere[2] = (min[2] + max[2]) * 0.5;
    sphere[3] = Math.hypot(min[0] - max[0], min[1] - max[1], min[2] - max[2]) * 0.5;
    sphere[3] += EveSwarm.#shipSphereScratch[3];
    return true;
  }

  /**
   * Carbon EveSwarm::GetLocatorInObjectSpace (EveSwarm.cpp:1082-1090): the
   * base resolution, then re-based from the ship's object space into the
   * TARGET swarmer's - impacts land on the vehicle being shot, not on the
   * invisible aggregate hull. Row-vector renderableWorld * invWorld maps to
   * gl multiply(out, inverseWorldTransform, renderableWorld).
   */
  @carbon.method
  @impl.implemented
  GetLocatorInObjectSpace(outPosition, outDirection, locator, mergedDamageIndex = -1)
  {
    super.GetLocatorInObjectSpace(outPosition, outDirection, locator, mergedDamageIndex);
    if (this.count)
    {
      const local = EveSwarm.#localTransformScratch;
      mat4.multiply(local, this.inverseWorldTransform, this.renderables[this.targetIndex].worldTransform);
      vec3.transformMat4(outPosition, outPosition, local);
      const [ x, y, z ] = outDirection;
      outDirection[0] = local[0] * x + local[4] * y + local[8] * z;
      outDirection[1] = local[1] * x + local[5] * y + local[9] * z;
      outDirection[2] = local[2] * x + local[6] * y + local[10] * z;
    }
  }

  /** Carbon method AddSwarmer (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  AddSwarmer()
  {
    const renderable = new EveSwarmRenderable();
    renderable.InitializeRenderable(this, this.mesh);
    renderable.InitDecals(this.decals);
    this.renderables.push(renderable);
    this.vehicles.push({
      rotation: quat.create(),
      acceleration: vec3.create(),
      velocity: vec3.create(),
      position: vec3.clone(this.worldPosition),
      wanderTarget: vec3.create(),
      roll: 0
    });
    this.count = this.vehicles.length;
    this.boosters?.SetCount?.(this.count);
  }

  /** Carbon method RemoveSwarmer (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  RemoveSwarmer()
  {
    if (this.vehicles.length === 0)
    {
      return vec3.create();
    }
    const index = Math.min(Math.max(this.targetIndex, 0), this.vehicles.length - 1);
    const removedPosition = vec3.clone(this.vehicles[index].position);
    const removedRenderable = this.renderables[index];
    const lastVehicle = this.vehicles.pop();
    const lastRenderable = this.renderables.pop();
    if (index < this.vehicles.length)
    {
      this.vehicles[index] = lastVehicle;
      this.renderables[index] = lastRenderable;
    }
    removedRenderable?.InitializeRenderable?.(null, null);
    this.count = this.vehicles.length;
    this.boosters?.SetCount?.(this.count);
    this.targetIndex = this.#pickIndex(this.count);
    return removedPosition;
  }

  /** Carbon method PickFiringOrigin (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  PickFiringOrigin()
  {
    this.firingIndex = this.#pickIndex(this.count);
    return this.firingIndex;
  }

  /** Carbon method EnableSwarming (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  EnableSwarming(enable)
  {
    if (this.swarmingEnabled === enable)
    {
      return;
    }
    this.swarmingEnabled = enable;
    if (!enable)
    {
      this.SetCount(0);
      this.SetCount(1);
      vec3.set(this.squadBoundsMin, 0, 0, 0);
      vec3.set(this.squadBoundsMax, 0, 0, 0);
    }
  }

  /** Carbon method SetCount (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("Clamps negative browser inputs and uses CPU vehicle count as the initialized source of truth.")
  SetCount(count)
  {
    const desired = Math.max(0, Math.trunc(count));
    this.count = this.vehicles.length;
    while (this.count !== desired)
    {
      if (this.count > desired)
      {
        this.RemoveSwarmer();
      }
      else
      {
        this.AddSwarmer();
      }
      this.targetIndex = this.#pickIndex(this.count);
    }
  }

  /**
   * A random valid vehicle index for the given count, or zero when there are none.
   */
  #pickIndex(count)
  {
    return count > 0 ? Math.floor(Math.random() * count) : 0;
  }

  static #shipSphereScratch = new Float32Array(4);

  static #localTransformScratch = mat4.create();

}
