import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../../_virtual/_rollupPluginBabelHelpers.js';
import { type, io, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveShip2 as _EveShip } from '../../../../eve/spaceObject/EveShip2.js';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { EveSwarmRenderable as _EveSwarmRenderable } from '../../../../eve/spaceObject/swarm/EveSwarmRenderable.js';

let _initProto, _initClass, _init_vehicles, _init_extra_vehicles, _init_renderables, _init_extra_renderables, _init_targetIndex, _init_extra_targetIndex, _init_firingIndex, _init_extra_firingIndex, _init_squadBoundsMin, _init_extra_squadBoundsMin, _init_squadBoundsMax, _init_extra_squadBoundsMax, _init_weightFormation, _init_extra_weightFormation, _init_weightCohesion, _init_extra_weightCohesion, _init_weightSeparation, _init_extra_weightSeparation, _init_weightWander, _init_extra_weightWander, _init_weightAnchor, _init_extra_weightAnchor, _init_anchorRadius, _init_extra_anchorRadius, _init_anchorRadius2, _init_extra_anchorRadius2, _init_weightDeceleration, _init_extra_weightDeceleration, _init_maxDeceleration, _init_extra_maxDeceleration, _init_separationDistance, _init_extra_separationDistance, _init_formationDistance, _init_extra_formationDistance, _init_wanderFluctuation, _init_extra_wanderFluctuation, _init_wanderDistance, _init_extra_wanderDistance, _init_wanderRadius, _init_extra_wanderRadius, _init_debugShowForces, _init_extra_debugShowForces, _init_count, _init_extra_count, _init_swarmingEnabled, _init_extra_swarmingEnabled, _init_mass, _init_extra_mass, _init_speedMultiplier, _init_extra_speedMultiplier, _init_speedMinimum, _init_extra_speedMinimum, _init_maxDistance, _init_extra_maxDistance, _init_maxDistance2, _init_extra_maxDistance2, _init_maxTime, _init_extra_maxTime, _init_agility, _init_extra_agility, _init_speed, _init_extra_speed, _init_speed2, _init_extra_speed2, _init_timeMultiplier, _init_extra_timeMultiplier, _init_weightAlign, _init_extra_weightAlign;

/** EveSwarm (eve/spaceObject/swarm) - generated from schema shapeHash e65716bf.... */
let _EveSwarm;
new class extends _identity {
  static [class EveSwarm extends _EveShip {
    static {
      ({
        e: [_init_vehicles, _init_extra_vehicles, _init_renderables, _init_extra_renderables, _init_targetIndex, _init_extra_targetIndex, _init_firingIndex, _init_extra_firingIndex, _init_squadBoundsMin, _init_extra_squadBoundsMin, _init_squadBoundsMax, _init_extra_squadBoundsMax, _init_weightFormation, _init_extra_weightFormation, _init_weightCohesion, _init_extra_weightCohesion, _init_weightSeparation, _init_extra_weightSeparation, _init_weightWander, _init_extra_weightWander, _init_weightAnchor, _init_extra_weightAnchor, _init_anchorRadius, _init_extra_anchorRadius, _init_anchorRadius2, _init_extra_anchorRadius2, _init_weightDeceleration, _init_extra_weightDeceleration, _init_maxDeceleration, _init_extra_maxDeceleration, _init_separationDistance, _init_extra_separationDistance, _init_formationDistance, _init_extra_formationDistance, _init_wanderFluctuation, _init_extra_wanderFluctuation, _init_wanderDistance, _init_extra_wanderDistance, _init_wanderRadius, _init_extra_wanderRadius, _init_debugShowForces, _init_extra_debugShowForces, _init_count, _init_extra_count, _init_swarmingEnabled, _init_extra_swarmingEnabled, _init_mass, _init_extra_mass, _init_speedMultiplier, _init_extra_speedMultiplier, _init_speedMinimum, _init_extra_speedMinimum, _init_maxDistance, _init_extra_maxDistance, _init_maxDistance2, _init_extra_maxDistance2, _init_maxTime, _init_extra_maxTime, _init_agility, _init_extra_agility, _init_speed, _init_extra_speed, _init_speed2, _init_extra_speed2, _init_timeMultiplier, _init_extra_timeMultiplier, _init_weightAlign, _init_extra_weightAlign, _initProto],
        c: [_EveSwarm, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveSwarm",
        family: "eve/spaceObject/swarm"
      })], [[type.list("SwarmVehicle"), 0, "vehicles"], [type.list("EveSwarmRenderable"), 0, "renderables"], [[type, type.int32], 16, "targetIndex"], [[type, type.int32], 16, "firingIndex"], [[type, type.vec3], 16, "squadBoundsMin"], [[type, type.vec3], 16, "squadBoundsMax"], [[io, io.persist, type, type.float32], 16, "weightFormation"], [[io, io.persist, type, type.float32], 16, "weightCohesion"], [[io, io.persist, type, type.float32], 16, "weightSeparation"], [[io, io.persist, type, type.float32], 16, "weightWander"], [[io, io.persist, type, type.float32], 16, "weightAnchor"], [[io, io.persist, type, type.float32], 16, "anchorRadius0"], [[io, io.persist, type, type.float32], 16, "anchorRadius1"], [[io, io.persist, type, type.float32], 16, "weightDeceleration"], [[io, io.persist, type, type.float32], 16, "maxDeceleration"], [[io, io.persist, type, type.float32], 16, "separationDistance"], [[io, io.persist, type, type.float32], 16, "formationDistance"], [[io, io.persist, type, type.float32], 16, "wanderFluctuation"], [[io, io.persist, type, type.float32], 16, "wanderDistance"], [[io, io.persist, type, type.float32], 16, "wanderRadius"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "debugShowForces"], [[io, io.persist, type, type.int32], 16, "count"], [[io, io.persist, type, type.boolean], 16, "swarmingEnabled"], [[io, io.persist, type, type.float32], 16, "mass"], [[io, io.persist, type, type.float32], 16, "speedMultiplier"], [[io, io.persist, type, type.float32], 16, "speedMinimum"], [[io, io.persist, type, type.float32], 16, "maxDistance0"], [[io, io.persist, type, type.float32], 16, "maxDistance1"], [[io, io.persist, type, type.float32], 16, "maxTime"], [[io, io.persist, type, type.float32], 16, "agility"], [[io, io.persist, type, type.float32], 16, "speed0"], [[io, io.persist, type, type.float32], 16, "speed1"], [[io, io.readwrite, type, type.float32], 16, "timeMultiplier"], [[io, io.persist, type, type.float32], 16, "weightAlign"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterComponents"], [[carbon, carbon.method, impl, impl.implemented], 18, "UnRegisterComponents"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBoundingSphere"], [[carbon, carbon.method, impl, impl.adapted], 18, "AddSwarmer"], [[carbon, carbon.method, impl, impl.adapted], 18, "RemoveSwarmer"], [[carbon, carbon.method, impl, impl.adapted], 18, "PickFiringOrigin"], [[carbon, carbon.method, impl, impl.adapted], 18, "EnableSwarming"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Clamps negative browser inputs and uses CPU vehicle count as the initialized source of truth.")], 18, "SetCount"]], 0, void 0, _EveShip));
    }
    constructor(...args) {
      super(...args);
      _init_extra_weightAlign(this);
    }
    /** CPU SwarmVehicle state; live draw resources remain renderer-owned. */
    vehicles = (_initProto(this), _init_vehicles(this, []));
    renderables = (_init_extra_vehicles(this), _init_renderables(this, []));
    targetIndex = (_init_extra_renderables(this), _init_targetIndex(this, 0));
    firingIndex = (_init_extra_targetIndex(this), _init_firingIndex(this, 0));
    squadBoundsMin = (_init_extra_firingIndex(this), _init_squadBoundsMin(this, vec3.create()));
    squadBoundsMax = (_init_extra_squadBoundsMin(this), _init_squadBoundsMax(this, vec3.create()));

    /** m_behavior.m_weightFormation (float) [READWRITE, PERSIST] */
    weightFormation = (_init_extra_squadBoundsMax(this), _init_weightFormation(this, 1));

    /** m_behavior.m_weightCohesion (float) [READWRITE, PERSIST] */
    weightCohesion = (_init_extra_weightFormation(this), _init_weightCohesion(this, 0.1));

    /** m_behavior.m_weightSeparation (float) [READWRITE, PERSIST] */
    weightSeparation = (_init_extra_weightCohesion(this), _init_weightSeparation(this, 0.1));

    /** m_behavior.m_weightWander (float) [READWRITE, PERSIST] */
    weightWander = (_init_extra_weightSeparation(this), _init_weightWander(this, 0.33));

    /** m_behavior.m_weightAnchor (float) [READWRITE, PERSIST] */
    weightAnchor = (_init_extra_weightWander(this), _init_weightAnchor(this, 0.5));

    /** m_behavior.m_anchorRadius0 (float) [READWRITE, PERSIST] */
    anchorRadius0 = (_init_extra_weightAnchor(this), _init_anchorRadius(this, 75));

    /** m_behavior.m_anchorRadius1 (float) [READWRITE, PERSIST] */
    anchorRadius1 = (_init_extra_anchorRadius(this), _init_anchorRadius2(this, 250));

    /** m_behavior.m_weightDecelerate (float) [READWRITE, PERSIST] */
    weightDeceleration = (_init_extra_anchorRadius2(this), _init_weightDeceleration(this, 0.1));

    /** m_behavior.m_maxDeceleration (float) [READWRITE, PERSIST] */
    maxDeceleration = (_init_extra_weightDeceleration(this), _init_maxDeceleration(this, 200));

    /** m_behavior.m_separationDistance (float) [READWRITE, PERSIST] */
    separationDistance = (_init_extra_maxDeceleration(this), _init_separationDistance(this, 250));

    /** m_behavior.m_formationDistance (float) [READWRITE, PERSIST] */
    formationDistance = (_init_extra_separationDistance(this), _init_formationDistance(this, 50));

    /** m_behavior.m_wanderFluctuation (float) [READWRITE, PERSIST] */
    wanderFluctuation = (_init_extra_formationDistance(this), _init_wanderFluctuation(this, 0.05));

    /** m_behavior.m_wanderDistance (float) [READWRITE, PERSIST] */
    wanderDistance = (_init_extra_wanderFluctuation(this), _init_wanderDistance(this, 100));

    /** m_behavior.m_wanderRadius (float) [READWRITE, PERSIST] */
    wanderRadius = (_init_extra_wanderDistance(this), _init_wanderRadius(this, 80));

    /** m_debugShowForces (bool) [READWRITE, PERSIST, NOTIFY] */
    debugShowForces = (_init_extra_wanderRadius(this), _init_debugShowForces(this, false));

    /** m_count (int32_t) [READ, PERSIST] */
    count = (_init_extra_debugShowForces(this), _init_count(this, 1));

    /** m_swarmingEnabled (bool) [READ, PERSIST] */
    swarmingEnabled = (_init_extra_count(this), _init_swarmingEnabled(this, false));

    /** m_behavior.m_mass (float) [READWRITE, PERSIST] */
    mass = (_init_extra_swarmingEnabled(this), _init_mass(this, 1));

    /** m_behavior.m_speedMultiplier (float) [READWRITE, PERSIST] */
    speedMultiplier = (_init_extra_mass(this), _init_speedMultiplier(this, 1.1));

    /** m_behavior.m_speedMinimum (float) [READWRITE, PERSIST] */
    speedMinimum = (_init_extra_speedMultiplier(this), _init_speedMinimum(this, 10));

    /** m_behavior.m_maxDistance0 (float) [READWRITE, PERSIST] */
    maxDistance0 = (_init_extra_speedMinimum(this), _init_maxDistance(this, 500));

    /** m_behavior.m_maxDistance1 (float) [READWRITE, PERSIST] */
    maxDistance1 = (_init_extra_maxDistance(this), _init_maxDistance2(this, 125));

    /** m_behavior.m_maxTime (float) [READWRITE, PERSIST] */
    maxTime = (_init_extra_maxDistance2(this), _init_maxTime(this, 0.2));

    /** m_behavior.m_agility (float) [READWRITE, PERSIST] */
    agility = (_init_extra_maxTime(this), _init_agility(this, 2));

    /** m_behavior.m_speed0 (float) [READWRITE, PERSIST] */
    speed0 = (_init_extra_agility(this), _init_speed(this, 700));

    /** m_behavior.m_speed1 (float) [READWRITE, PERSIST] */
    speed1 = (_init_extra_speed(this), _init_speed2(this, 1000));

    /** m_behavior.m_timeMultiplier (float) [READWRITE] */
    timeMultiplier = (_init_extra_speed2(this), _init_timeMultiplier(this, 1));

    /** m_behavior.m_weightAlign (float) [READWRITE, PERSIST] */
    weightAlign = (_init_extra_timeMultiplier(this), _init_weightAlign(this, 50));

    /** Carbon EveSwarm::RegisterComponents (EveSwarm.cpp:1000-1017): base
     * registration "to register all the turrets and things", then
     * UnRegisterAllComponents(this) because the swarm itself is container-only,
     * then forwards the per-swarmer renderables. */
    RegisterComponents() {
      super.RegisterComponents();
      const registry = this.GetComponentRegistry();
      if (registry) {
        registry.UnRegisterAllComponents(this);
        for (const renderable of this.renderables) {
          renderable?.Register?.(registry);
        }
      }
    }

    /** Carbon EveSwarm::UnRegisterComponents (EveSwarm.cpp:1019-1030): base,
     * then forwards the renderables. */
    UnRegisterComponents() {
      super.UnRegisterComponents();
      const registry = this.GetComponentRegistry();
      if (registry) {
        for (const renderable of this.renderables) {
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
    GetBoundingSphere(sphere, query = 0) {
      super.GetBoundingSphere(_EveSwarm.#shipSphereScratch, query);
      const min = this.squadBoundsMin;
      const max = this.squadBoundsMax;
      sphere[0] = (min[0] + max[0]) * 0.5;
      sphere[1] = (min[1] + max[1]) * 0.5;
      sphere[2] = (min[2] + max[2]) * 0.5;
      sphere[3] = Math.hypot(min[0] - max[0], min[1] - max[1], min[2] - max[2]) * 0.5;
      sphere[3] += _EveSwarm.#shipSphereScratch[3];
      return true;
    }

    /** Carbon method AddSwarmer (MAP_METHOD_AND_WRAP). */
    AddSwarmer() {
      const renderable = new _EveSwarmRenderable();
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
    RemoveSwarmer() {
      if (this.vehicles.length === 0) {
        return vec3.create();
      }
      const index = Math.min(Math.max(this.targetIndex, 0), this.vehicles.length - 1);
      const removedPosition = vec3.clone(this.vehicles[index].position);
      const removedRenderable = this.renderables[index];
      const lastVehicle = this.vehicles.pop();
      const lastRenderable = this.renderables.pop();
      if (index < this.vehicles.length) {
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
    PickFiringOrigin() {
      this.firingIndex = this.#pickIndex(this.count);
      return this.firingIndex;
    }

    /** Carbon method EnableSwarming (MAP_METHOD_AND_WRAP). */
    EnableSwarming(enable) {
      if (this.swarmingEnabled === enable) {
        return;
      }
      this.swarmingEnabled = enable;
      if (!enable) {
        this.SetCount(0);
        this.SetCount(1);
        vec3.set(this.squadBoundsMin, 0, 0, 0);
        vec3.set(this.squadBoundsMax, 0, 0, 0);
      }
    }

    /** Carbon method SetCount (MAP_METHOD_AND_WRAP). */
    SetCount(count) {
      const desired = Math.max(0, Math.trunc(count));
      this.count = this.vehicles.length;
      while (this.count !== desired) {
        if (this.count > desired) {
          this.RemoveSwarmer();
        } else {
          this.AddSwarmer();
        }
        this.targetIndex = this.#pickIndex(this.count);
      }
    }
    #pickIndex(count) {
      return count > 0 ? Math.floor(Math.random() * count) : 0;
    }
  }];
  #shipSphereScratch = new Float32Array(4);
  constructor() {
    super(_EveSwarm), _initClass();
  }
}();

export { _EveSwarm as EveSwarm };
//# sourceMappingURL=EveSwarm.js.map
