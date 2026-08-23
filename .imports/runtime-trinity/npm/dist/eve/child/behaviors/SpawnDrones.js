import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initProto, _initClass, _init_gridSpacing, _init_extra_gridSpacing, _init_gridFullnessFactor, _init_extra_gridFullnessFactor, _init_regenerateDrones, _init_extra_regenerateDrones, _init_count, _init_extra_count, _init_seconds, _init_extra_seconds, _init_addOnGrid, _init_extra_addOnGrid, _init_addByCount, _init_extra_addByCount, _init_enabled, _init_extra_enabled, _init_time, _init_extra_time, _init_spawnPosition, _init_extra_spawnPosition, _init_gridInfo, _init_extra_gridInfo;
const NO_FORCES = [];

/** A steering behaviour that populates and repopulates a drone group's agents, either regenerating a jittered spawn grid or spawning agents by count on a schedule or one-shot trigger. */
let _SpawnDrones;
class SpawnDrones extends CjsModel {
  static {
    ({
      e: [_init_gridSpacing, _init_extra_gridSpacing, _init_gridFullnessFactor, _init_extra_gridFullnessFactor, _init_regenerateDrones, _init_extra_regenerateDrones, _init_count, _init_extra_count, _init_seconds, _init_extra_seconds, _init_addOnGrid, _init_extra_addOnGrid, _init_addByCount, _init_extra_addByCount, _init_enabled, _init_extra_enabled, _init_time, _init_extra_time, _init_spawnPosition, _init_extra_spawnPosition, _init_gridInfo, _init_extra_gridInfo, _initProto],
      c: [_SpawnDrones, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "SpawnDrones",
      family: "eve/child/behaviors"
    })], [[[io, io.persist, type, type.vec3], 16, "gridSpacing"], [[io, io.notify, io, io.persist, type, type.float32], 16, "gridFullnessFactor"], [[io, io.readwrite, type, type.boolean], 16, "regenerateDrones"], [[io, io.persist, type, type.int32], 16, "count"], [[io, io.persist, type, type.float32], 16, "seconds"], [[io, io.persist, type, type.boolean], 16, "addOnGrid"], [[io, io.persist, type, type.boolean], 16, "addByCount"], [[io, io.persist, type, type.boolean], 16, "enabled"], [[io, io.persist, type, type.float32], 16, "time"], [[io, io.persist, type, type.vec3], 16, "spawnPosition"], [[io, io.notify, io, io.persist, type, type.vec4], 16, "gridInfo"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("TriRand maps to Math.random; the spawn-point grid walk is ported verbatim.")], 18, "UpdateGrid"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("rand() maps to Math.random when picking the timed entrance point; the spawn scheduling is ported verbatim.")], 18, "CalculateBehavior"], [[carbon, carbon.method, impl, impl.implemented], 18, "gridToggleReset"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_gridInfo(this);
  }
  /** m_gridSpacing (Vector3) [READWRITE, PERSIST] */
  gridSpacing = (_initProto(this), _init_gridSpacing(this, vec3.create()));

  /** m_gridFullnessFactor (float) [READWRITE, PERSIST, NOTIFY] */
  gridFullnessFactor = (_init_extra_gridSpacing(this), _init_gridFullnessFactor(this, 1));

  /** m_regenerateDrones (bool) [READWRITE] */
  regenerateDrones = (_init_extra_gridFullnessFactor(this), _init_regenerateDrones(this, true));

  /** m_count (int) [READWRITE, PERSIST] */
  count = (_init_extra_regenerateDrones(this), _init_count(this, 1));

  /** m_seconds (float) [READWRITE, PERSIST] */
  seconds = (_init_extra_count(this), _init_seconds(this, -1));

  /** m_addOnGrid (bool) [READWRITE, PERSIST] */
  addOnGrid = (_init_extra_seconds(this), _init_addOnGrid(this, false));

  /** m_addByCount (bool) [READWRITE, PERSIST] */
  addByCount = (_init_extra_addOnGrid(this), _init_addByCount(this, false));

  /** m_enabled (bool) [READWRITE, PERSIST] */
  enabled = (_init_extra_addByCount(this), _init_enabled(this, true));

  /** m_time (float) [READ, PERSIST] */
  time = (_init_extra_enabled(this), _init_time(this, 0));

  /** m_spawnPosition (Vector3) [READWRITE, PERSIST] */
  spawnPosition = (_init_extra_time(this), _init_spawnPosition(this, vec3.create()));

  /** m_gridInfo (Vector4) [READWRITE, PERSIST, NOTIFY] */
  gridInfo = (_init_extra_spawnPosition(this), _init_gridInfo(this, vec4.fromValues(1, 1, 1, 10)));

  /**
   * Regenerates the group as a jittered grid of agents around the group's
   * spawn position (Carbon UpdateGrid, cpp:26-85). Grid spawn points are
   * allocated here - a regeneration event, not the per-frame path.
   * @param {Object} group - owning BehaviorGroup
   */
  UpdateGrid(group) {
    // for behaviors to work we always have to add one decoy drone; delete it
    // so it doesn't mess up the cube
    for (let i = 0; i < group.GetCount(); i++) {
      group.SetCount(0);
    }
    const startPos = vec3.clone(group.spawnPosition);
    const position = vec3.clone(startPos);
    const xCount = Math.trunc(this.gridInfo[0]);
    const yCount = Math.trunc(this.gridInfo[1]);
    const zCount = Math.trunc(this.gridInfo[2]);
    const distBetween = vec3.fromValues(this.gridInfo[3], this.gridInfo[3], this.gridInfo[3]);
    if (vec3.squaredLength(this.gridSpacing) !== 0) {
      vec3.copy(distBetween, this.gridSpacing);
    }
    let fullnessFactor = this.gridFullnessFactor;
    const spawnPoints = [];
    for (let i = 0; i < zCount; i++) {
      for (let j = 0; j < yCount; j++) {
        for (let k = 0; k < xCount; k++) {
          // sometimes we may want to randomize the fullness
          if (this.gridFullnessFactor === -1) {
            fullnessFactor = Math.random();
          }
          // the higher the gridRandomFactor the more full the grid should be
          if (Math.random() <= fullnessFactor) {
            spawnPoints.push(vec3.clone(position));
          }
          position[0] += distBetween[0];
        }
        position[1] += distBetween[1];
        position[0] = startPos[0];
      }
      position[2] += distBetween[2];
      position[1] = startPos[1];
    }
    if (spawnPoints.length !== 0) {
      group.AddAgents(spawnPoints);
    }
    this.regenerateDrones = false;
    // reset the spawn position to zero because otherwise it will offset
    // every group on the next spawn
    vec3.set(group.spawnPosition, 0, 0, 0);
  }

  /**
   * Spawn scheduling: one-shot grid spawns, one-shot count spawns, and timed
   * respawns at ProcessLifetime entrance points (Carbon CalculateBehavior,
   * cpp:87-146).
   * @param {Array} _agents - DroneAgent records (unused)
   * @param {Array|null} _scratchData - unused (no scratch)
   * @param {Number} deltaTime
   * @param {Object} group - owning BehaviorGroup
   * @param {Object} _system - owning EveChildBehaviorSystem
   * @param {Array} _dronesInSearchRadius - unused
   * @returns {Array} empty (as Carbon)
   */
  CalculateBehavior(_agents, _scratchData, deltaTime, group, _system, _dronesInSearchRadius) {
    if (!this.enabled) {
      return NO_FORCES;
    }
    if (this.addOnGrid && this.regenerateDrones) {
      this.UpdateGrid(group);
      return NO_FORCES;
    }

    // If m_addByCount is toggled on the behavior adds agents by count
    if (this.addByCount === true) {
      group.AddAgents(this.#MakeSpawnPoints(group.spawnPosition));
      this.addByCount = false;
    }
    if (this.seconds <= 0) {
      return NO_FORCES;
    }
    this.time += deltaTime;
    if (this.time > this.seconds && this.seconds >= 0) {
      const behavior = group.GetBehaviorByName("ProcessLifetime");
      if (behavior !== null) {
        const spawnPoints = behavior.GetEntrancePoints?.();
        if (Array.isArray(spawnPoints) && spawnPoints.length !== 0) {
          const randomNbr = Math.floor(Math.random() * spawnPoints.length);
          vec3.copy(this.spawnPosition, spawnPoints[randomNbr]);
        }
      }
      vec3.copy(group.spawnPosition, this.spawnPosition);
      group.AddAgents(this.#MakeSpawnPoints(group.spawnPosition));
      this.time = 0;
    }
    return NO_FORCES;
  }

  /** Carbon method gridToggleReset -> GridToggleReset (MAP_METHOD_AND_WRAP). */
  gridToggleReset() {
    this.regenerateDrones = true;
  }

  // Carbon's spawnPoints.resize(m_count, value) equivalent: m_count copies of
  // the spawn position (spawn-event allocation, not the per-frame path).
  /**
   * Builds an array of cloned copies of one spawn position, ready to be added as new agents.
   */
  #MakeSpawnPoints(position) {
    const spawnPoints = [];
    for (let i = 0; i < this.count; i++) {
      spawnPoints.push(vec3.clone(position));
    }
    return spawnPoints;
  }
  static {
    _initClass();
  }
}

export { _SpawnDrones as SpawnDrones };
//# sourceMappingURL=SpawnDrones.js.map
