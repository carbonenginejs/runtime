import { random as carbonRandom } from "#math/random";
import { IEveShadowCaster } from "../../IEveShadowCaster.js";
import { EveEntity } from "../../EveEntity.js";
import { INotify } from "../../../../global/blue/INotify.js";
import { IInitialize } from "../../../../global/blue/IInitialize.js";
import { IEveSpaceObject2 } from "../../IEveSpaceObject2.js";
// Source: trinity/trinity/Eve/SpaceObject/EveSwarm.h
// Source: trinity/trinity/Eve/SpaceObject/EveSwarm.cpp
// Source: trinity/trinity/Eve/SpaceObject/EveSwarm_Blue.cpp
import { CjsSchema, meta, type, blue } from "#schema";
import { IsMatch, CcpTime } from "#blue";
import { EveShip2 } from "../EveShip2.js";
import { EveSpaceObject2 } from "../EveSpaceObject2.js";
import { IEveReferencePoint } from "../../IEveReferencePoint.js";
import { mat4 } from "#math/mat4";
import { num } from "#math/num";
import { quat } from "#math/quat";
import { sph3 } from "#math/sph3";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { EveSwarmRenderable } from "./EveSwarmRenderable.js";
import { SwarmVehicle } from "./SwarmVehicle.js";
import { SwarmVehicleDebug } from "./SwarmVehicleDebug.js";

/** Carbon BoundingBoxInitialize's FLT_MAX (Utilities/BoundingBox.cpp:118-127). */
const FLT_MAX = 3.4028234663852886e38;

/**
 * Carbon's EveSwarm (EveSwarm.h:96-313): a ship drawn as a squad of fighters. Each fighter is a SwarmVehicle steered
 * by weighted boid forces (wander, separation, alignment, cohesion, anchor, deceleration, formation) around the ball,
 * and drawn by its own EveSwarmRenderable with the squad's shared mesh.
 *
 * The behaviour weights are Carbon's BehaviorProperties (m_behavior.*), held flat under their Blue attribute names;
 * Carbon's SetBehavior is EveSOF's copy of the DNA's generic swarm properties onto those fields. Not ported:
 * GetDebugOptions and RenderDebugInfo (our space objects have no debug renderer; the per-vehicle force record they
 * draw is still kept).
 */
@blue.define("EveSwarm")
@blue.interface(IEveSpaceObject2, IInitialize, INotify, EveEntity, IEveShadowCaster)
@blue.chainTo(EveShip2)
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
  @blue.readwrite
  @blue.persist
  @type.float32
  weightFormation = 1;

  /** m_behavior.m_weightCohesion (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  weightCohesion = 0.1;

  /** m_behavior.m_weightSeparation (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  weightSeparation = 0.1;

  /** m_behavior.m_weightWander (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  weightWander = 0.33;

  /** m_behavior.m_weightAnchor (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  weightAnchor = 0.5;

  /** m_behavior.m_anchorRadius0 (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  anchorRadius0 = 75;

  /** m_behavior.m_anchorRadius1 (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  anchorRadius1 = 250;

  /** m_behavior.m_weightDecelerate (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  weightDeceleration = 0.1;

  /** m_behavior.m_maxDeceleration (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  maxDeceleration = 200;

  /** m_behavior.m_separationDistance (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  separationDistance = 250;

  /** m_behavior.m_formationDistance (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  formationDistance = 50;

  /** m_behavior.m_wanderFluctuation (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  wanderFluctuation = 0.05;

  /** m_behavior.m_wanderDistance (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  wanderDistance = 100;

  /** m_behavior.m_wanderRadius (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  wanderRadius = 80;

  /** m_debugShowForces (bool) [READWRITE, PERSIST, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.boolean
  debugShowForces = false;

  /** m_count (int32_t) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.int32
  count = 1;

  /** m_swarmingEnabled (bool) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.boolean
  swarmingEnabled = false;

  /** m_behavior.m_mass (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  mass = 1;

  /** m_behavior.m_speedMultiplier (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  speedMultiplier = 1.1;

  /** m_behavior.m_speedMinimum (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  speedMinimum = 10;

  /** m_behavior.m_maxDistance0 (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  maxDistance0 = 500;

  /** m_behavior.m_maxDistance1 (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  maxDistance1 = 125;

  /** m_behavior.m_maxTime (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  maxTime = 0.2;

  /** m_behavior.m_agility (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  agility = 2;

  /** m_behavior.m_speed0 (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  speed0 = 700;

  /** m_behavior.m_speed1 (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  speed1 = 1000;

  /** m_behavior.m_timeMultiplier (float) [READWRITE] */
  @blue.readwrite
  @type.float32
  timeMultiplier = 1;

  /** m_behavior.m_weightAlign (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  weightAlign = 50;

  /** m_debugInfo: one force record per vehicle while debugShowForces is on. */
  _debugInfo = [];

  /** m_origin: the ball's reference point at the last update, Infinity until read (UNINITIALIZED_ORIGIN). */
  _origin = new Float64Array(3).fill(Infinity);

  /** m_timeLast, in Blue ticks. */
  _timeLast = 0;

  /** m_timeSinceUpdate, in seconds. */
  _timeSinceUpdate = 0;

  /** m_lodUpdateTime: staggered a little so all fighters do not update together (EveSwarm.cpp:335-336). */
  _lodUpdateTime = 1.1 - carbonRandom.triRand() * 0.2;

  /** m_started */
  _started = false;

  /** m_debugSize */
  _debugSize = 24;

  /** m_worldAcceleration: the change in world velocity over the last UpdateWorldTransform. */
  _worldAcceleration = vec3.create();

  /** Carbon EveSwarm::RegisterComponents (EveSwarm.cpp:1000-1017): base
   * registration "to register all the turrets and things", then
   * UnRegisterAllComponents(this) because the swarm itself is container-only,
   * then forwards the per-swarmer renderables. */
  @blue.method
  @meta.implemented
  RegisterComponents()
  {
    super.RegisterComponents();
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      registry.UnRegisterAllComponents(this);
      for (const renderable of this.renderables)
      {
        renderable.Register(registry);
      }
    }
  }

  /** Carbon EveSwarm::UnRegisterComponents (EveSwarm.cpp:1019-1030): base,
   * then forwards the renderables. */
  @blue.method
  @meta.implemented
  UnRegisterComponents()
  {
    super.UnRegisterComponents();
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      for (const renderable of this.renderables)
      {
        renderable.UnRegister(registry);
      }
    }
  }

  /**
   * Carbon GetObserverTransform (EveSwarm.cpp:347-352): the world transform moved to the model centre, for audio
   * observers. Row-vector worldTransform * translation adds the offset to the translation row.
   *
   * Adapted: Carbon returns the Matrix by value; it is written to the caller-owned out, which is returned.
   * @param {mat4} out - receives the transform
   * @returns {mat4} out
   */
  @blue.method
  @meta.adapted
  GetObserverTransform(out)
  {
    mat4.copy(out, this.worldTransform);
    out[12] += this.modelWorldPosition[0] - this.worldPosition[0];
    out[13] += this.modelWorldPosition[1] - this.worldPosition[1];
    out[14] += this.modelWorldPosition[2] - this.worldPosition[2];
    return out;
  }

  /**
   * Carbon GetTurretTransform (EveSwarm.cpp:358-365): a turret set rides the fighter its swarm ID names, or the
   * swarm's own transform when there is no such fighter.
   * @param {number} swarmID - the turret set's GetSwarmID()
   * @returns {mat4} the live transform, not a copy
   */
  @blue.method
  @meta.implemented
  GetTurretTransform(swarmID)
  {
    if (swarmID >= this.renderables.length)
    {
      return this.worldTransform;
    }
    return this.renderables[swarmID].GetWorldTransform();
  }

  /** Carbon RebuildCachedData (EveSwarm.cpp:371-378): the base, then every fighter rebinds to the rebuilt mesh. */
  @blue.method
  @meta.implemented
  RebuildCachedData(asyncRes)
  {
    super.RebuildCachedData(asyncRes);
    for (const renderable of this.renderables)
    {
      renderable.InitializeRenderable(this, this.mesh);
    }
  }

  /** Carbon UpdateSyncronous (EveSwarm.cpp:384-391): the swarm steps before the ship. */
  @blue.method
  @meta.implemented
  UpdateSyncronous(updateContext)
  {
    if (this.swarmingEnabled)
    {
      this.UpdateSwarm(updateContext.GetTime());
    }
    return super.UpdateSyncronous(updateContext);
  }

  /**
   * Carbon UpdateWorldTransform (EveSwarm.cpp:397-402): the base, recording the change in world velocity. A repeat
   * call at the same time leaves the velocity alone, so it records zero, as in Carbon.
   * @param {number} time - Blue ticks
   * @returns {boolean} the base's result
   */
  @blue.method
  @meta.implemented
  UpdateWorldTransform(time)
  {
    // vec3_26 is velocityLast.
    const { vec3_26 } = EveSwarm.scratch;
    vec3.copy(vec3_26, this.worldVelocity);
    const updated = super.UpdateWorldTransform(time);
    vec3.subtract(this._worldAcceleration, this.worldVelocity, vec3_26);
    return updated;
  }

  /**
   * Carbon UpdateOrientation (EveSwarm.cpp:408-424): faces the vehicle along its velocity, rolled into its sideways
   * acceleration, turning at agility per second.
   *
   * Adapted: gl-matrix's slerp switches to linear interpolation below 1 - dot = 1e-6 where Carbon's Slerp
   * (Quaternion_inline.h:244-266) switches at 0.001; the two agree to float precision in that band.
   * @param {SwarmVehicle} vehicle
   * @param {number} timeDiff - seconds
   */
  @meta.adapted
  @blue.method
  UpdateOrientation(vehicle, timeDiff)
  {
    // vec3_21 is dir, vec3_22 side, vec3_23 upDir; quat_0 the rotation.
    const { vec3_21, vec3_22, vec3_23, quat_0 } = EveSwarm.scratch;
    vec3.set(vec3_23, 0, 1, 0);
    vec3.normalize(vec3_21, vehicle.velocity);
    vec3.cross(vec3_22, vec3_21, vec3_23);
    const yaw = Math.atan2(vec3_21[0], vec3_21[2]);
    const pitch = Math.asin(-vec3_21[1]);
    let roll = 0;
    const speed = vec3.length(vehicle.velocity);
    if (speed > 0)
    {
      // Roll is based on how large acceleration is in the direction of the side vector.
      roll = 0.8 * vec3.dot(vehicle.acceleration, vec3_22) * Math.PI / speed;
    }
    quat.fromYawPitchRoll(quat_0, yaw, pitch, roll);
    quat.slerp(vehicle.rotation, vehicle.rotation, quat_0, timeDiff * this.agility);
  }

  /**
   * Carbon UpdateTurretsAsyncronous (EveSwarm.cpp:427-443): each turret set's parent data carries the transform of
   * the fighter it rides.
   *
   * Adapted: EveMobile's reusable parent-data record is refilled per set instead of a fresh zeroed stack record.
   */
  @blue.method
  @meta.adapted
  UpdateTurretsAsyncronous(updateContext)
  {
    const parent = this._turretParentData;
    for (const turretSet of this.turretSets)
    {
      mat4.copy(parent.transform, this.GetTurretTransform(turretSet.GetSwarmID()));
      vec4.copy(parent.shipData, this.spaceObjectShipData);
      vec3.copy(parent.clipSphereCenter, this._psData.Get("clipSphereCenter"));
      parent.clipRadiusSq = this._psData.Get("clipRadiusSq")[0];
      parent.clipRadius2Sq = this._psData.Get("clipRadius2Sq")[0];
      parent.clipFactor = this._psData.Get("clipSphereFactor")[0];
      parent.clipFactor2 = this._psData.Get("clipSphereFactor2")[0];
      turretSet.UpdateAsyncronous(updateContext, parent);
    }
    return true;
  }

  /**
   * Carbon UpdateAsyncronous (EveSwarm.cpp:449-494): without swarming, fighter 0 sits at the swarm's transform with
   * the ship's boosters; with it, each fighter takes its vehicle's rotation and position, and drives its own booster
   * instance. Then the base update, whose UpdateBoosters call this class leaves empty.
   */
  @blue.method
  @meta.implemented
  UpdateAsyncronous(updateContext)
  {
    if (!this.swarmingEnabled || this.count === 0)
    {
      vec3.set(this.squadBoundsMax, 0, 0, 0);
      vec3.set(this.squadBoundsMin, 0, 0, 0);
      if (this.renderables.length)
      {
        this.renderables[0].SetWorldTransform(this.worldTransform);
        super.UpdateBoosters(updateContext);
        if (this.boosters)
        {
          this.renderables[0].SetBoosterIntensity(this.boosters.GetBoosterIntensity());
        }
        this.renderables[0].SetShaderData(this._vsData, this._psData);
      }
    }
    else
    {
      // mat4_1 is world.
      const { mat4_1 } = EveSwarm.scratch;
      for (let i = 0; i < this.vehicles.length && i < this.renderables.length; i++)
      {
        const vehicle = this.vehicles[i];
        const renderable = this.renderables[i];
        // Row-vector RotationMatrix(rotation) * TranslationMatrix(position): rotate, then translate.
        mat4.fromRotationTranslation(mat4_1, vehicle.rotation, vehicle.position);
        renderable.SetWorldTransform(mat4_1);

        if (this.boosters)
        {
          const time = updateContext.GetTime();
          const deltaT = updateContext.GetDeltaT();
          const speed = vec3.length(vehicle.velocity);
          this.boosters.Update(deltaT, time, mat4_1, speed, vehicle.acceleration, vehicle.rotation, i);
          renderable.SetBoosterIntensity(this.boosters.GetBoosterIntensity());
        }
        renderable.SetShaderData(this._vsData, this._psData);
      }
      if (this.boosters)
      {
        this.boosters.UpdateTrails(updateContext.GetDeltaT(), updateContext.GetTime());
      }
    }

    return super.UpdateAsyncronous(updateContext);
  }

  /**
   * Carbon UpdateBoosters (EveSwarm.h:261-263): empty. UpdateAsyncronous drives the boosters per fighter instead.
   * @param {EveUpdateContext} _updateContext
   */
  @blue.method
  @meta.implemented
  UpdateBoosters(_updateContext)
  {
  }

  /**
   * Carbon UpdateSwarm (EveSwarm.cpp:497-643): one step of the flock. Off-screen swarms update at the staggered LOD
   * interval and otherwise just carry their vehicles along with the ball; a visible one moves every vehicle by its
   * forces, clamped to a speed and acceleration set by the ball's speed, and rebuilds the squad bounds. The squad
   * centre is never left more than maxDistance from the ball.
   *
   * Carbon quirk, kept in behaviour: with no vehicles Carbon still reads m_vehicles[0] for the formation direction,
   * out of bounds; here that direction is left zero, which no force calculation reads when there are no vehicles.
   * @param {number} t - Blue ticks
   */
  @meta.adapted
  @blue.method
  UpdateSwarm(t)
  {
    if (t === this._timeLast)
    {
      return;
    }
    if (!this._timeLast)
    {
      this._timeLast = t;
    }

    // vec3_10 is worldTransformLast (the previous world position), vec3_11 the movement or originShift, vec3_12 the
    // squad centre, vec3_13 alignment, vec3_14 formationDirection, vec3_15 formationSide, vec3_16 followPosition,
    // vec3_17 the force, vec3_18 d, vec3_19 the up axis; vec3d_0 is originNow.
    const { vec3_10, vec3_11, vec3_12, vec3_13, vec3_14, vec3_15, vec3_16, vec3_17, vec3_18, vec3_19, vec3d_0 } = EveSwarm.scratch;
    vec3.copy(vec3_10, this.worldPosition);
    this.UpdateWorldTransform(t);

    if (!this._started)
    {
      // Set initial position
      for (const vehicle of this.vehicles)
      {
        vec3.copy(vehicle.position, this.worldPosition);
      }
    }

    const timeDelta = CcpTime.timeAsFloat(t - this._timeLast);
    let timeSeconds = CcpTime.timeAsFloat(t - this._timeLast) * this.timeMultiplier;
    if (timeSeconds > this.maxTime)
    {
      timeSeconds = this.maxTime;
    }

    this._timeSinceUpdate += timeDelta;
    this._timeLast = t;

    const updateNow = this.isVisible || this._timeSinceUpdate >= this._lodUpdateTime;
    if (!updateNow)
    {
      if (this._started)
      {
        vec3.subtract(vec3_11, this.worldPosition, vec3_10);
        for (const vehicle of this.vehicles)
        {
          vec3.add(vehicle.position, vehicle.position, vec3_11);
        }
        vec3.add(this.squadBoundsMax, this.squadBoundsMax, vec3_11);
        vec3.add(this.squadBoundsMin, this.squadBoundsMin, vec3_11);
      }
      this._started = true;
      return;
    }
    this._timeSinceUpdate = 0;

    vec3.set(vec3_11, 0, 0, 0);
    const refObject = CjsSchema.cast(this.translationCurve, IEveReferencePoint);
    if (refObject)
    {
      refObject.GetReferencePoint(t, vec3d_0);
      if (this._origin[0] !== Infinity)
      {
        vec3_11[0] = this._origin[0] - vec3d_0[0];
        vec3_11[1] = this._origin[1] - vec3d_0[1];
        vec3_11[2] = this._origin[2] - vec3d_0[2];
      }
      this._origin.set(vec3d_0);
    }

    if (this._started)
    {
      for (const vehicle of this.vehicles)
      {
        vec3.add(vehicle.position, vehicle.position, vec3_11);
      }
    }
    else
    {
      this._started = true;
    }

    vec3.set(vec3_12, 0, 0, 0);
    vec3.set(vec3_13, 0, 0, 0);
    vec3.set(this.squadBoundsMin, FLT_MAX, FLT_MAX, FLT_MAX);
    vec3.set(this.squadBoundsMax, -FLT_MAX, -FLT_MAX, -FLT_MAX);
    // Calculate average velocity direction (alignment) and center position (pre update)
    for (const vehicle of this.vehicles)
    {
      vec3.add(vec3_12, vec3_12, vehicle.position);
      vec3.add(vec3_13, vec3_13, vehicle.velocity);
    }
    if (this.vehicles.length > 0)
    {
      vec3.scale(vec3_12, vec3_12, 1 / this.vehicles.length);
      vec3.normalize(vec3_13, vec3_13);
    }

    // Max speed is based of the ball speed + a minimum allowed speed
    let maxSpeed = this.speedMinimum;
    if (this.speed)
    {
      maxSpeed += this.speedMultiplier * this.speed.value;
    }
    const maxAcceleration = maxSpeed;

    // Calculate formation directions
    vec3.set(vec3_14, 0, 0, 0);
    if (this.vehicles.length > 0)
    {
      vec3.normalize(vec3_14, this.vehicles[0].velocity);
    }
    vec3.set(vec3_19, 0, 1, 0);
    vec3.cross(vec3_15, vec3_14, vec3_19);

    // followPosition = worldPosition + (worldVelocity + worldAcceleration * timeDelta) * timeDelta
    vec3.scaleAndAdd(vec3_16, this.worldVelocity, this._worldAcceleration, timeDelta);
    vec3.scaleAndAdd(vec3_16, this.worldPosition, vec3_16, timeDelta);

    // Calculate forces and acceleration
    for (let i = 0; i < this.vehicles.length; i++)
    {
      this.CalculateForces(i, this.vehicles, vec3_16, vec3_12, vec3_13, vec3_14, vec3_15, timeSeconds, vec3_17);
      const vehicle = this.vehicles[i];
      vec3.scale(vehicle.acceleration, vec3_17, 1 / this.mass);
      vec3.clampLength(vehicle.acceleration, vehicle.acceleration, maxAcceleration);
    }

    // Update velocities and positions
    for (const vehicle of this.vehicles)
    {
      vec3.scaleAndAdd(vehicle.velocity, vehicle.velocity, vehicle.acceleration, timeSeconds);
      vec3.clampLength(vehicle.velocity, vehicle.velocity, maxSpeed);
      vec3.scaleAndAdd(vehicle.position, vehicle.position, vehicle.velocity, timeSeconds);
      this.UpdateOrientation(vehicle, timeSeconds);
      vec3.min(this.squadBoundsMin, this.squadBoundsMin, vehicle.position);
      vec3.max(this.squadBoundsMax, this.squadBoundsMax, vehicle.position);
    }

    // Never let the center of the squadron get more than maxDistance from the world position (client hangs for a
    // while, for example)
    vec3.add(vec3_12, this.squadBoundsMin, this.squadBoundsMax);
    vec3.scale(vec3_12, vec3_12, 0.5);
    vec3.subtract(vec3_18, this.worldPosition, vec3_12);
    const distance = vec3.length(vec3_18);
    const blend = num.triLinearize(this.speed0, this.speed1, vec3.length(this.worldVelocity));
    const maxDistance = this.maxDistance0 + (this.maxDistance1 - this.maxDistance0) * blend;
    if (distance > maxDistance)
    {
      // Move the center of the squad to maxDistance away from the world position
      vec3.normalize(vec3_18, vec3_18);
      vec3.scale(vec3_18, vec3_18, distance - maxDistance);
      for (const vehicle of this.vehicles)
      {
        vec3.add(vehicle.position, vehicle.position, vec3_18);
      }
      vec3.add(this.squadBoundsMax, this.squadBoundsMax, vec3_18);
      vec3.add(this.squadBoundsMin, this.squadBoundsMin, vec3_18);
    }
  }

  /**
   * Carbon RegisterWithQuadRenderer (EveSwarm.cpp:651-661): the attachments' sprites and spotlights, then the booster
   * glows. Carbon does not call the base, so turret quads are not registered.
   */
  @blue.method
  @meta.implemented
  RegisterWithQuadRenderer(quadRenderer)
  {
    for (const attachment of this.attachments)
    {
      attachment.RegisterWithQuadRenderer(quadRenderer);
    }
    if (this.boosters)
    {
      this.boosters.RegisterWithQuadRenderer(quadRenderer);
    }
  }

  /**
   * Carbon AddQuadsToQuadRenderer (EveSwarm.cpp:669-687): every attachment once per fighter, at that fighter's
   * transform, at full activation and booster gain; then the booster glows, whose instances carry their own
   * fighters' transforms, so the world passed is the identity.
   */
  @blue.method
  @meta.implemented
  AddQuadsToQuadRenderer(frustum, quadRenderer)
  {
    if (!this._isInFrustum || !this.display)
    {
      return;
    }
    for (const renderable of this.renderables)
    {
      for (const attachment of this.attachments)
      {
        attachment.AddToQuadRenderer(quadRenderer, renderable.GetWorldTransform(), 1, 1, null, 0);
      }
    }
    if (this.DisplayBoosters())
    {
      this.boosters.AddToQuadRenderer(quadRenderer, EveSwarm._identity);
    }
  }

  /**
   * Carbon PushRenderables (EveSwarm.cpp:741-752): each fighter and its decals while the mesh is visible. The swarm
   * itself and its children are not pushed.
   * @param {ITr2Renderable[]} out - the frame's renderable list
   */
  @meta.implemented
  @blue.method
  PushRenderables(out)
  {
    if (this.mesh && this._isMeshVisible)
    {
      for (const renderable of this.renderables)
      {
        out.push(renderable);
        renderable.PushDecals(out, this._meshScreenSize);
      }
    }
  }

  /** Carbon UpdateVisibility (EveSwarm.cpp:754-770): the base, then each fighter places its own decals. */
  @blue.method
  @meta.implemented
  UpdateVisibility(updateContext, parentTransform)
  {
    const visible = super.UpdateVisibility(updateContext, parentTransform);
    if (this.mesh && this._isMeshVisible)
    {
      const parentData = this.GetParentData(this._decalParentData);
      for (const renderable of this.renderables)
      {
        renderable.UpdateDecalVisibility(updateContext, parentData, this.animationUpdater);
      }
    }
    return visible;
  }

  /**
   * Carbon EstimatePixelDiameter (EveSwarm.cpp:774-783): the squad sphere's size on screen, divided by the square
   * root of the fighter count while swarming, roughly one fighter's share.
   * @returns {number} the estimate
   */
  @blue.method
  @meta.implemented
  EstimatePixelDiameter(frustum)
  {
    const { vec4_0 } = EveSwarm.scratch;
    this.GetBoundingSphere(vec4_0);
    this.estimatedPixelDiameter = frustum.GetPixelSizeAccross(vec4_0);
    if (this.swarmingEnabled && this.count > 1)
    {
      this.estimatedPixelDiameter /= Math.sqrt(this.count);
    }
    return this.estimatedPixelDiameter;
  }

  /** Carbon UpdateWorldBounds (EveSwarm.cpp:787-795): the squad box's sphere, grown by the model's own radius. */
  @blue.method
  @meta.implemented
  UpdateWorldBounds()
  {
    const { vec4_0 } = EveSwarm.scratch;
    sph3.fromBounds(vec4_0, this.squadBoundsMin, this.squadBoundsMax);
    this.modelWorldPosition[0] = vec4_0[0];
    this.modelWorldPosition[1] = vec4_0[1];
    this.modelWorldPosition[2] = vec4_0[2];
    this._boundingSphereWorldRadius = vec4_0[3] + this.modelScale * this.boundingSphereRadius;
  }

  /** Carbon EveSwarm::GetBoundingSphere (EveSwarm.cpp:801-808): sphere from
   * the squad bounds box (BoundingSphereFromBox, Utilities/BoundingSphere.cpp:
   * 182-197 - center (min+max)/2, radius |min-max|/2), with the EveShip2
   * sphere's RADIUS added on top (the ship sphere's center is discarded).
   * Always returns true. Feeds EveSwarmRenderable.IsCastingShadow's
   * squad-radius-at-the-fighter cull sphere. */
  @blue.method
  @meta.implemented
  GetBoundingSphere(sphere, query = 0)
  {
    // vec4_1 is the ship's own sphere.
    const { vec4_1 } = EveSwarm.scratch;
    super.GetBoundingSphere(vec4_1, query);
    sph3.fromBounds(sphere, this.squadBoundsMin, this.squadBoundsMax);
    sphere[3] += vec4_1[3];
    return true;
  }

  /**
   * Carbon UpdateModelCenterWorldPosition (EveSwarm.cpp:816-827): while swarming, steps the swarm to t and answers
   * the squad box's centre; otherwise the base.
   * @param {vec3} position - receives the world-space centre
   * @param {number} t - Blue ticks
   */
  @meta.implemented
  @blue.method
  UpdateModelCenterWorldPosition(position, t)
  {
    if (this.swarmingEnabled)
    {
      this.UpdateSwarm(t);
      vec3.add(position, this.squadBoundsMax, this.squadBoundsMin);
      vec3.scale(position, position, 0.5);
    }
    else
    {
      super.UpdateModelCenterWorldPosition(position, t);
    }
  }

  /** Carbon GetModelCenterWorldPosition (EveSwarm.cpp:833-843): the squad box's centre while swarming. */
  @blue.method
  @meta.implemented
  GetModelCenterWorldPosition(out)
  {
    if (this.swarmingEnabled)
    {
      vec3.add(out, this.squadBoundsMax, this.squadBoundsMin);
      vec3.scale(out, out, 0.5);
    }
    else
    {
      super.GetModelCenterWorldPosition(out);
    }
  }

  /**
   * Carbon GetLocalBoundingBox (EveSwarm.cpp:849-877): the mesh box, grown to its bounding sphere's cube and offset by
   * the squad bounds, relative to the ball while swarming. Carbon does not call the base, so turret bounds are not
   * included.
   * @param {vec3} min - receives the box minimum
   * @param {vec3} max - receives the box maximum
   * @returns {boolean} true
   */
  @blue.method
  @meta.implemented
  GetLocalBoundingBox(min, max)
  {
    if (this.mesh && this.mesh.GetBoundingBox(min, max))
    {
      // vec4_0 is bs, vec3_27 one of its cube's corners.
      const { vec4_0, vec3_27 } = EveSwarm.scratch;
      sph3.fromBounds(vec4_0, min, max);
      vec3.set(vec3_27, vec4_0[0] - vec4_0[3], vec4_0[1] - vec4_0[3], vec4_0[2] - vec4_0[3]);
      vec3.min(min, min, vec3_27);
      vec3.max(max, max, vec3_27);
      vec3.set(vec3_27, vec4_0[0] + vec4_0[3], vec4_0[1] + vec4_0[3], vec4_0[2] + vec4_0[3]);
      vec3.min(min, min, vec3_27);
      vec3.max(max, max, vec3_27);
      vec3.add(min, min, this.squadBoundsMin);
      vec3.add(max, max, this.squadBoundsMax);
    }
    else
    {
      vec3.copy(min, this.squadBoundsMin);
      vec3.copy(max, this.squadBoundsMax);
    }
    if (this.swarmingEnabled)
    {
      vec3.subtract(this._localAabbMin, min, this.worldPosition);
      vec3.subtract(this._localAabbMax, max, this.worldPosition);
      vec3.copy(min, this._localAabbMin);
      vec3.copy(max, this._localAabbMax);
    }
    else
    {
      vec3.copy(this._localAabbMin, min);
      vec3.copy(this._localAabbMax, max);
    }
    return true;
  }

  /** Carbon Initialize (EveSwarm.cpp:883-891): the base, then the persisted count of fighters is created. */
  @blue.method
  @meta.implemented
  Initialize()
  {
    super.Initialize();
    const count = this.count;
    this.count = 0;
    this.SetCount(count);
    this.EnableSwarmForceDebug(this.debugShowForces);
    return true;
  }

  /** Carbon OnModified (EveSwarm.cpp:897-906): the base, then debugShowForces resizes the force record. */
  @blue.method
  @meta.implemented
  OnModified(propertyName = null)
  {
    super.OnModified(propertyName);
    if (IsMatch(propertyName, "debugShowForces"))
    {
      this.EnableSwarmForceDebug(this.debugShowForces);
    }
    return true;
  }

  /**
   * Carbon AddSwarmer (EveSwarm.cpp:912-940): a new fighter on the shared mesh with its own decals, registered with
   * the component registry, and a vehicle at the ball's position.
   */
  @blue.method
  @meta.implemented
  AddSwarmer()
  {
    const componentRegistry = this.GetComponentRegistry();

    const renderable = new EveSwarmRenderable();
    renderable.InitializeRenderable(this, this.mesh);
    renderable.InitDecals(this.decals);

    if (componentRegistry)
    {
      renderable.Register(componentRegistry);
    }

    this.renderables.push(renderable);
    const vehicle = new SwarmVehicle();
    vec3.copy(vehicle.position, this.worldPosition);
    this.vehicles.push(vehicle);
    if (this.debugShowForces)
    {
      this._debugInfo.push(new SwarmVehicleDebug());
    }
    this.count++;

    if (this.boosters)
    {
      this.boosters.SetCount(this.count);
    }
  }

  /**
   * Carbon RemoveSwarmer (EveSwarm.cpp:946-978): removes the fighter being shot (targetIndex) and picks a new target.
   *
   * Carbon quirk, kept: the vehicle is removed by moving the last vehicle into its slot, but the renderable is
   * erased, shifting the later ones down. When the removed fighter was not the last, the moved vehicle now drives
   * the renderable at the last index, not its old one, and the renderables after the removed slot each draw the
   * vehicle one slot later than before.
   *
   * Random draws delegate to the matching generator in global/math/random.js.
   * @returns {vec3} the removed vehicle's position
   */
  @blue.method
  @meta.adapted
  RemoveSwarmer()
  {
    if (this.vehicles.length === 0)
    {
      return vec3.create(); // alloc: returned by value to the Blue caller
    }

    const componentRegistry = this.GetComponentRegistry();

    const vehicle = this.vehicles[this.targetIndex];
    this.vehicles[this.targetIndex] = this.vehicles[this.vehicles.length - 1];
    this.vehicles.pop();
    this.renderables[this.targetIndex].InitializeRenderable(null, null);

    if (componentRegistry)
    {
      this.renderables[this.targetIndex].UnRegister(componentRegistry);
    }

    this.renderables.splice(this.targetIndex, 1);
    if (this.debugShowForces)
    {
      this._debugInfo.pop();
    }
    this.count--;

    if (this.boosters)
    {
      this.boosters.SetCount(this.count);
    }
    this.targetIndex = carbonRandom.triRandInt(this.count);
    return vec3.clone(vehicle.position); // alloc: returned by value to the Blue caller
  }

  /**
   * Carbon SetCount (EveSwarm.cpp:984-998): adds or removes fighters one at a time, re-picking the target each step.
   *
   * Carbon quirk, kept: a negative count never terminates, since RemoveSwarmer on an empty swarm does not change
   * the count.
   *
   * Random draws delegate to the matching generator in global/math/random.js.
   * @param {number} count
   */
  @blue.method
  @meta.adapted
  SetCount(count)
  {
    while (this.count !== count)
    {
      if (this.count > count)
      {
        this.RemoveSwarmer();
      }
      else
      {
        this.AddSwarmer();
      }
      this.targetIndex = carbonRandom.triRandInt(this.count);
    }
  }

  /**
   * Carbon EnableSwarming (EveSwarm.cpp:1037-1052): without swarming the squad collapses to one neutral fighter that
   * behaves as a normal space object.
   * @param {boolean} enable
   */
  @blue.method
  @meta.implemented
  EnableSwarming(enable)
  {
    if (this.swarmingEnabled === enable)
    {
      return;
    }

    this.swarmingEnabled = enable;
    if (!enable)
    {
      this.SetCount(0); // Remove all
      this.SetCount(1); // Add a single 'neutral' swarmer
      vec3.set(this.squadBoundsMin, 0, 0, 0);
      vec3.set(this.squadBoundsMax, 0, 0, 0);
    }
  }

  /**
   * Carbon PickFiringOrigin (EveSwarm.cpp:1058-1061): picks the fighter firing effects start from.
   *
   * Random draws delegate to the matching generator in global/math/random.js.
   */
  @blue.method
  @meta.adapted
  PickFiringOrigin()
  {
    this.firingIndex = carbonRandom.triRandInt(this.count);
  }

  /**
   * Carbon EnableSwarmForceDebug (EveSwarm.cpp:1067-1079): one force record per vehicle while enabled.
   * @param {boolean} enable
   */
  @meta.implemented
  @blue.method
  EnableSwarmForceDebug(enable)
  {
    this._debugInfo.length = 0;

    if (!enable)
    {
      return;
    }
    for (let i = 0; i < this.vehicles.length; i++)
    {
      this._debugInfo.push(new SwarmVehicleDebug());
    }
  }

  /**
   * Carbon EveSwarm::GetLocatorInObjectSpace (EveSwarm.cpp:1082-1090): the
   * base resolution, then re-based from the ship's object space into the
   * TARGET swarmer's - impacts land on the vehicle being shot, not on the
   * invisible aggregate hull. Row-vector renderableWorld * invWorld maps to
   * gl multiply(out, inverseWorldTransform, renderableWorld).
   */
  @blue.method
  @meta.implemented
  GetLocatorInObjectSpace(outPosition, outDirection, locator, mergedDamageIndex = -1)
  {
    super.GetLocatorInObjectSpace(outPosition, outDirection, locator, mergedDamageIndex);
    if (this.count)
    {
      const { mat4_0 } = EveSwarm.scratch;
      mat4.multiply(mat4_0, this.inverseWorldTransform, this.renderables[this.targetIndex].worldTransform);
      vec3.transformMat4(outPosition, outPosition, mat4_0);
      const [ x, y, z ] = outDirection;
      outDirection[0] = mat4_0[0] * x + mat4_0[4] * y + mat4_0[8] * z;
      outDirection[1] = mat4_0[1] * x + mat4_0[5] * y + mat4_0[9] * z;
      outDirection[2] = mat4_0[2] * x + mat4_0[6] * y + mat4_0[10] * z;
    }
  }

  /**
   * Carbon GetDamageLocatorPosition (EveSwarm.cpp:1097-1136): a damage locator on the fighter being shot, or that
   * fighter's position when the index names no locator.
   *
   * Carbon bug, kept: in world space the locator's DIRECTION is transformed as a point (cpp:1116), not its position.
   *
   * Adapted: arguments follow EveSpaceObject2's output-last order.
   * @param {number} index - damage locator index
   * @param {boolean} inWorldSpace
   * @param {vec3} out - receives the position
   * @returns {boolean} whether a locator was found
   */
  @blue.method
  @meta.adapted
  GetDamageLocatorPosition(index, inWorldSpace, out = vec3.create())
  {
    if (!this.count)
    {
      return super.GetDamageLocatorPosition(index, inWorldSpace, out);
    }

    if (index >= 0)
    {
      const damageLocators = this.GetLocatorsForSet(EveSpaceObject2._damageLocatorSetName);
      if (damageLocators && index < damageLocators.length)
      {
        // vec3_24 is position, vec3_25 direction.
        const { vec3_24, vec3_25 } = EveSwarm.scratch;
        this.GetLocatorInObjectSpace(vec3_24, vec3_25, damageLocators[index], index);

        if (inWorldSpace)
        {
          vec3.transformMat4(out, vec3_25, this.worldTransform);
        }
        else
        {
          vec3.copy(out, vec3_24);
        }
        return true;
      }
    }

    const world = this.renderables[this.targetIndex].GetWorldTransform();
    if (inWorldSpace)
    {
      vec3.set(out, world[12], world[13], world[14]);
    }
    else
    {
      const { mat4_0 } = EveSwarm.scratch;
      mat4.multiply(mat4_0, this.inverseWorldTransform, world);
      vec3.set(out, mat4_0[12], mat4_0[13], mat4_0[14]);
    }
    return false;
  }

  /**
   * Carbon CalculateForces (EveSwarm.cpp:1142-1190): the sum of every behaviour's weighted force on vehicle i0.
   * Formation places vehicle 0 ahead and the rest in a V behind it, odd indices to one side, even to the other.
   *
   * Adapted: the force is written to out, which is returned.
   * @returns {vec3} out
   */
  @meta.adapted
  @blue.method
  CalculateForces(i0, swarmers, followPosition, centerOfMass, alignment, formationDirection, formationSide, timeSeconds, out)
  {
    // vec3_0 is wander, vec3_1 cohesion, vec3_2 anchor, vec3_3 align, vec3_4 decelerate, vec3_5 separation,
    // vec3_6 one vehicle's separation, vec3_7 formationPosition, vec3_8 formation.
    const { vec3_0, vec3_1, vec3_2, vec3_3, vec3_4, vec3_5, vec3_6, vec3_7, vec3_8 } = EveSwarm.scratch;
    const swarmer = swarmers[i0];

    this.Calculate_Wander(swarmer, this.wanderDistance, this.wanderRadius, this.wanderFluctuation, timeSeconds, vec3_0);
    vec3.scale(vec3_0, vec3_0, this.weightWander);
    this.Calculate_Cohesion(swarmer.position, centerOfMass, vec3_1);
    vec3.scale(vec3_1, vec3_1, this.weightCohesion);
    this.Calculate_Cohesion(swarmer.position, followPosition, vec3_2);
    let anchorDistance = vec3.length(vec3_2);
    anchorDistance = num.triLinearize(this.anchorRadius0, this.anchorRadius1, anchorDistance);
    vec3.scale(vec3_2, vec3_2, anchorDistance * this.weightAnchor);
    vec3.scale(vec3_3, alignment, this.weightAlign);
    vec3.scale(vec3_4, swarmer.velocity, -this.weightDeceleration);
    vec3.clampLength(vec3_4, vec3_4, this.maxDeceleration);

    vec3.set(vec3_5, 0, 0, 0);
    for (let i = 0; i < swarmers.length; i++)
    {
      if (i0 !== i)
      {
        this.Calculate_Separation(swarmer.position, swarmers[i].position, vec3_6);
        vec3.scaleAndAdd(vec3_5, vec3_5, vec3_6, this.weightSeparation);
      }
    }

    // Formation
    vec3.scaleAndAdd(vec3_7, this.vehicles[0].position, formationDirection, this.formationDistance * this.vehicles.length * 0.25);
    if (i0 && i0 & 1)
    {
      const rankMultiplier = Math.floor(0.5 * i0 + 0.5);
      vec3.scaleAndAdd(vec3_7, vec3_7, formationDirection, -this.formationDistance * rankMultiplier);
      vec3.scaleAndAdd(vec3_7, vec3_7, formationSide, this.formationDistance * rankMultiplier * 0.5);
    }
    else if (i0)
    {
      const rankMultiplier = Math.floor(0.5 * i0 + 0.5);
      vec3.scaleAndAdd(vec3_7, vec3_7, formationDirection, -this.formationDistance * rankMultiplier);
      vec3.scaleAndAdd(vec3_7, vec3_7, formationSide, -this.formationDistance * rankMultiplier * 0.5);
    }
    this.Calculate_Cohesion(swarmer.position, vec3_7, vec3_8);
    vec3.scale(vec3_8, vec3_8, this.weightFormation);

    // Debug info
    if (this.debugShowForces && this._debugInfo.length > i0)
    {
      const debug = this._debugInfo[i0];
      vec3.copy(debug.alignment, vec3_3);
      vec3.copy(debug.anchor, vec3_2);
      vec3.copy(debug.cohesion, vec3_1);
      vec3.copy(debug.separation, vec3_5);
      vec3.copy(debug.wander, vec3_0);
      vec3.copy(debug.formation, vec3_8);
      vec3.copy(debug.deceleration, vec3_4);
    }

    vec3.add(out, vec3_0, vec3_5);
    vec3.add(out, out, vec3_3);
    vec3.add(out, out, vec3_1);
    vec3.add(out, out, vec3_2);
    vec3.add(out, out, vec3_4);
    return vec3.add(out, out, vec3_8);
  }

  /**
   * Carbon Calculate_Cohesion (EveSwarm.cpp:1196-1199): the vector from p0 to p1.
   *
   * Adapted: written to out, which is returned.
   * @returns {vec3} out
   */
  @meta.adapted
  @blue.method
  Calculate_Cohesion(p0, p1, out)
  {
    return vec3.subtract(out, p1, p0);
  }

  /**
   * Carbon Calculate_Separation (EveSwarm.cpp:1205-1214): pushes p0 away from p1, separationDistance / distance
   * strong; a random nudge when they coincide.
   *
   * Random draws delegate to the matching generator in global/math/random.js.
   * @returns {vec3} out
   */
  @meta.adapted
  @blue.method
  Calculate_Separation(p0, p1, out)
  {
    vec3.subtract(out, p0, p1);
    const length = vec3.length(out);
    if (length === 0)
    {
      for (let axis = 2; axis >= 0; axis--)
      {
        out[axis] = carbonRandom.triRand() - 0.5;
      }
      return out;
    }
    vec3.normalize(out, out);
    return vec3.scale(out, out, this.separationDistance / length);
  }

  /**
   * Carbon Calculate_Wander (EveSwarm.cpp:1220-1243): drifts the vehicle's wander target around a sphere of radius
   * radius, then aims at that target on a sphere wanderDistance ahead of the vehicle (along its velocity, or along
   * the target itself when it is not moving).
   *
   * Random draws delegate to the matching generator in global/math/random.js.
   * @returns {vec3} out
   */
  @meta.adapted
  @blue.method
  Calculate_Wander(s, wanderDistance, radius, fluctuation, t, out)
  {
    // Evolve the target point on the 'sphere' around a point wanderDistance in front of our swarmer.
    // vec3_20 is newOffset.
    const { vec3_20 } = EveSwarm.scratch;
    for (let axis = 2; axis >= 0; axis--)
    {
      vec3_20[axis] = 2 * carbonRandom.triRand() - 1;
    }
    vec3.normalize(vec3_20, vec3_20);
    vec3.scale(vec3_20, vec3_20, fluctuation * radius * t);
    vec3.add(out, s.wanderTarget, vec3_20);
    vec3.normalize(out, out);
    vec3.scale(out, out, radius);
    vec3.copy(s.wanderTarget, out);

    // And calculate the final target force
    if (vec3.squaredLength(s.velocity) !== 0)
    {
      vec3.normalize(out, s.velocity);
    }
    else
    {
      // start in the wander direction if no velocity
      vec3.normalize(out, s.wanderTarget);
    }
    return vec3.scaleAndAdd(out, s.wanderTarget, out, wanderDistance);
  }

  /** Carbon's IdentityMatrix(), for the booster glows. */
  static _identity = mat4.create();

  static scratch = {
    vec3_0: vec3.create(),
    vec3_1: vec3.create(),
    vec3_2: vec3.create(),
    vec3_3: vec3.create(),
    vec3_4: vec3.create(),
    vec3_5: vec3.create(),
    vec3_6: vec3.create(),
    vec3_7: vec3.create(),
    vec3_8: vec3.create(),
    vec3_10: vec3.create(),
    vec3_11: vec3.create(),
    vec3_12: vec3.create(),
    vec3_13: vec3.create(),
    vec3_14: vec3.create(),
    vec3_15: vec3.create(),
    vec3_16: vec3.create(),
    vec3_17: vec3.create(),
    vec3_18: vec3.create(),
    vec3_19: vec3.create(),
    vec3_20: vec3.create(),
    vec3_21: vec3.create(),
    vec3_22: vec3.create(),
    vec3_23: vec3.create(),
    vec3_24: vec3.create(),
    vec3_25: vec3.create(),
    vec3_26: vec3.create(),
    vec3_27: vec3.create(),
    vec3d_0: new Float64Array(3),
    vec4_0: vec4.create(),
    vec4_1: vec4.create(),
    quat_0: quat.create(),
    mat4_0: mat4.create(),
    mat4_1: mat4.create()
  };

}
