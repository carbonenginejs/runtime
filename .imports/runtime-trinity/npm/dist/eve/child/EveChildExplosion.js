import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type, io, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveChildContainer as _EveChildContainer } from './EveChildContainer.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initProto, _initClass, _init_localExplosionTransforms, _init_extra_localExplosionTransforms, _init_globalExplosionOffset, _init_extra_globalExplosionOffset, _init_globalExplosionInstances, _init_extra_globalExplosionInstances, _init_generatedGlobalExplosions, _init_extra_generatedGlobalExplosions, _init_localScaling, _init_extra_localScaling, _init_globalScaling, _init_extra_globalScaling, _init_globalExplosion, _init_extra_globalExplosion, _init_localExplosion, _init_extra_localExplosion, _init_localExplosionShared, _init_extra_localExplosionShared, _init_globalExplosions, _init_extra_globalExplosions, _init_localExplosionIntervalFactor, _init_extra_localExplosionIntervalFactor, _init_localExplosionDelay, _init_extra_localExplosionDelay, _init_globalExplosionDelay, _init_extra_globalExplosionDelay, _init_totalDuration, _init_extra_totalDuration, _init_globalDuration, _init_extra_globalDuration, _init_isPlaying, _init_extra_isPlaying, _init_localExplosions, _init_extra_localExplosions, _init_localExplosionInterval, _init_extra_localExplosionInterval, _init_globalExplosionTime, _init_extra_globalExplosionTime, _init_wreckSwitchTime, _init_extra_wreckSwitchTime, _init_wreckSwitchOffsetFromGlobalStart, _init_extra_wreckSwitchOffsetFromGlobalStart, _init_playTime, _init_extra_playTime, _init_localDuration, _init_extra_localDuration;

/** A container child that sequences and spawns local and global explosion instances over time from authored transforms and delays. */
let _EveChildExplosion;
class EveChildExplosion extends _EveChildContainer {
  static {
    ({
      e: [_init_localExplosionTransforms, _init_extra_localExplosionTransforms, _init_globalExplosionOffset, _init_extra_globalExplosionOffset, _init_globalExplosionInstances, _init_extra_globalExplosionInstances, _init_generatedGlobalExplosions, _init_extra_generatedGlobalExplosions, _init_localScaling, _init_extra_localScaling, _init_globalScaling, _init_extra_globalScaling, _init_globalExplosion, _init_extra_globalExplosion, _init_localExplosion, _init_extra_localExplosion, _init_localExplosionShared, _init_extra_localExplosionShared, _init_globalExplosions, _init_extra_globalExplosions, _init_localExplosionIntervalFactor, _init_extra_localExplosionIntervalFactor, _init_localExplosionDelay, _init_extra_localExplosionDelay, _init_globalExplosionDelay, _init_extra_globalExplosionDelay, _init_totalDuration, _init_extra_totalDuration, _init_globalDuration, _init_extra_globalDuration, _init_isPlaying, _init_extra_isPlaying, _init_localExplosions, _init_extra_localExplosions, _init_localExplosionInterval, _init_extra_localExplosionInterval, _init_globalExplosionTime, _init_extra_globalExplosionTime, _init_wreckSwitchTime, _init_extra_wreckSwitchTime, _init_wreckSwitchOffsetFromGlobalStart, _init_extra_wreckSwitchOffsetFromGlobalStart, _init_playTime, _init_extra_playTime, _init_localDuration, _init_extra_localDuration, _initProto],
      c: [_EveChildExplosion, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveChildExplosion",
      family: "eve/child"
    })], [[type.array("mat4"), 0, "localExplosionTransforms"], [[type, type.vec3], 16, "globalExplosionOffset"], [type.list("IEveSpaceObjectChild"), 0, "globalExplosionInstances"], [[io, io.read, void 0, type.objectRef("EveChildContainer")], 16, "generatedGlobalExplosions"], [[io, io.persist, type, type.vec3], 16, "localScaling"], [[io, io.persist, type, type.vec3], 16, "globalScaling"], [[io, io.persist, void 0, type.model("IEveSpaceObjectChild")], 16, "globalExplosion"], [[io, io.persist, void 0, type.model("IEveSpaceObjectChild")], 16, "localExplosion"], [[io, io.persist, void 0, type.model("IEveSpaceObjectChild")], 16, "localExplosionShared"], [[io, io.persist, void 0, type.list("IEveSpaceObjectChild")], 16, "globalExplosions"], [[io, io.persist, type, type.float32], 16, "localExplosionIntervalFactor"], [[io, io.persist, type, type.float32], 16, "localExplosionDelay"], [[io, io.persist, type, type.float32], 16, "globalExplosionDelay"], [[io, io.read, type, type.float32], 16, "totalDuration"], [[io, io.persist, type, type.float32], 16, "globalDuration"], [[io, io.read, type, type.boolean], 16, "isPlaying"], [[io, io.persist, void 0, type.list("IEveSpaceObjectChild")], 16, "localExplosions"], [[io, io.persist, type, type.float32], 16, "localExplosionInterval"], [[io, io.read, type, type.float32], 16, "globalExplosionTime"], [[io, io.read, type, type.float32], 16, "wreckSwitchTime"], [[io, io.readwrite, type, type.float32], 16, "wreckSwitchOffsetFromGlobalStart"], [[io, io.read, type, type.float32], 16, "playTime"], [[io, io.persist, type, type.float32], 16, "localDuration"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetLocalExplosionTransforms"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetGlobalExplosionOffset"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterComponents"], [[carbon, carbon.method, impl, impl.implemented], 18, "UnRegisterComponents"], [[carbon, carbon.method, impl, impl.adapted], 18, "Play"], [[carbon, carbon.method, impl, impl.implemented], 18, "Stop"], [[impl, impl.adapted], 18, "UpdateSyncronous"]], 0, void 0, _EveChildContainer));
  }
  constructor(...args) {
    super(...args);
    _init_extra_localDuration(this);
  }
  #countdownToGlobalExplosionStart = (_initProto(this), 0);
  #localExplosionTimes = [];
  #nextLocalExplosion = 0;
  #nextLocalExplosionTime = 0;
  localExplosionTransforms = _init_localExplosionTransforms(this, []);
  globalExplosionOffset = (_init_extra_localExplosionTransforms(this), _init_globalExplosionOffset(this, vec3.create()));
  globalExplosionInstances = (_init_extra_globalExplosionOffset(this), _init_globalExplosionInstances(this, []));

  /** m_globalExplosionContainer (EveChildContainerPtr) [READ] */
  generatedGlobalExplosions = (_init_extra_globalExplosionInstances(this), _init_generatedGlobalExplosions(this, null));

  /** m_localExplosionScaling (Vector3) [READWRITE, PERSIST] */
  localScaling = (_init_extra_generatedGlobalExplosions(this), _init_localScaling(this, vec3.fromValues(1, 1, 1)));

  /** m_globalExplosionScaling (Vector3) [READWRITE, PERSIST] */
  globalScaling = (_init_extra_localScaling(this), _init_globalScaling(this, vec3.fromValues(1, 1, 1)));

  /** m_globalExplosion (IEveSpaceObjectChildPtr) [READWRITE, PERSIST] */
  globalExplosion = (_init_extra_globalScaling(this), _init_globalExplosion(this, null));

  /** m_localExplosion (IEveSpaceObjectChildPtr) [READWRITE, PERSIST] */
  localExplosion = (_init_extra_globalExplosion(this), _init_localExplosion(this, null));

  /** m_localExplosionShared (IEveSpaceObjectChildPtr) [READWRITE, PERSIST] */
  localExplosionShared = (_init_extra_localExplosion(this), _init_localExplosionShared(this, null));

  /** m_globalExplosions (PIEveSpaceObjectChildVector) [READ, PERSIST] */
  globalExplosions = (_init_extra_localExplosionShared(this), _init_globalExplosions(this, []));

  /** m_localExplosionIntervalFactor (float) [READWRITE, PERSIST] */
  localExplosionIntervalFactor = (_init_extra_globalExplosions(this), _init_localExplosionIntervalFactor(this, 1));

  /** m_localExplosionDelay (float) [READWRITE, PERSIST] */
  localExplosionDelay = (_init_extra_localExplosionIntervalFactor(this), _init_localExplosionDelay(this, 0));

  /** m_globalExplosionDelay (float) [READWRITE, PERSIST] */
  globalExplosionDelay = (_init_extra_localExplosionDelay(this), _init_globalExplosionDelay(this, 0));

  /** m_totalDuration (float) [READ] */
  totalDuration = (_init_extra_globalExplosionDelay(this), _init_totalDuration(this, 0));

  /** m_globalDuration (float) [READWRITE, PERSIST] */
  globalDuration = (_init_extra_totalDuration(this), _init_globalDuration(this, 0));

  /** m_isPlaying (bool) [READ] */
  isPlaying = (_init_extra_globalDuration(this), _init_isPlaying(this, false));

  /** m_localExplosions (PIEveSpaceObjectChildVector) [READ, PERSIST] */
  localExplosions = (_init_extra_isPlaying(this), _init_localExplosions(this, []));

  /** m_localExplosionInterval (float) [READWRITE, PERSIST] */
  localExplosionInterval = (_init_extra_localExplosions(this), _init_localExplosionInterval(this, 1));

  /** m_globalExplosionTime (float) [READ] */
  globalExplosionTime = (_init_extra_localExplosionInterval(this), _init_globalExplosionTime(this, 0));

  /** m_wreckSwitchTime (float) [READ] */
  wreckSwitchTime = (_init_extra_globalExplosionTime(this), _init_wreckSwitchTime(this, 0));

  /** m_wreckSwitchOffsetFromGlobalStart (float) [READWRITE] */
  wreckSwitchOffsetFromGlobalStart = (_init_extra_wreckSwitchTime(this), _init_wreckSwitchOffsetFromGlobalStart(this, 0));

  /** m_playTime (float) [READ] */
  playTime = (_init_extra_wreckSwitchOffsetFromGlobalStart(this), _init_playTime(this, 0));

  /** m_localDuration (float) [READWRITE, PERSIST] */
  localDuration = (_init_extra_playTime(this), _init_localDuration(this, 0));

  /** Carbon method SetLocalExplosionTransforms (MAP_METHOD_AND_WRAP). */
  SetLocalExplosionTransforms(transforms) {
    this.localExplosionTransforms = Array.from(transforms ?? [], transform => mat4.clone(transform));
  }

  /** Carbon method SetGlobalExplosionOffset (MAP_METHOD_AND_WRAP). */
  SetGlobalExplosionOffset(offset) {
    vec3.copy(this.globalExplosionOffset, offset);
    this.globalExplosionOffset[0] /= this.scaling[0];
    this.globalExplosionOffset[1] /= this.scaling[1];
    this.globalExplosionOffset[2] /= this.scaling[2];
  }

  /** Carbon EveChildExplosion::RegisterComponents (cpp:45-48): base container
   * registration only. */
  RegisterComponents() {
    super.RegisterComponents();
  }

  /** Carbon EveChildExplosion::UnRegisterComponents (cpp:54-65): manually
   * un-registers the global explosion container (spawned outside m_objects,
   * JS field generatedGlobalExplosions), then the base container forwarding. */
  UnRegisterComponents() {
    if (this.generatedGlobalExplosions) {
      this.generatedGlobalExplosions.UnRegister?.(this.GetComponentRegistry());
    }
    super.UnRegisterComponents();
  }

  /** Carbon method Play (MAP_METHOD_AND_WRAP). */
  Play() {
    this.Stop();
    if (!this.localExplosion && !this.globalExplosion && !this.localExplosions.length && !this.globalExplosions.length) return false;
    this.#nextLocalExplosionTime = this.localExplosionDelay;
    this.#nextLocalExplosion = 0;
    if (this.localExplosionShared) this.objects.push(this.localExplosionShared);
    this.#CalculateExplosionTimes(this.localExplosionTransforms.length);
    this.playTime = 0;
    this.#countdownToGlobalExplosionStart = this.globalExplosionTime;
    this.RebuildLocalTransform?.();
    this.isPlaying = true;
    return true;
  }

  /** Carbon method Stop (MAP_METHOD_AND_WRAP). */
  Stop() {
    this.objects.length = 0;
    this.isPlaying = false;
    this.globalExplosionInstances.length = 0;
    this.generatedGlobalExplosions = null;
  }
  /**
   * Advances play time, spawns due local explosions and switches to wreck-only mode past the wreck-switch time, fires the global explosion batch once its countdown elapses, updates the children, and stops once the total duration passes.
   */
  UpdateSyncronous(updateContext, params = {}) {
    if (!this.isPlaying) return;
    const deltaTime = Number(updateContext?.GetDeltaT?.() ?? updateContext?.deltaTime ?? 0);
    this.playTime += deltaTime;
    if (this.localExplosion || this.localExplosions.length) {
      if (this.wreckSwitchTime > 0 && this.playTime > this.wreckSwitchTime && this.globalDuration > 0) {
        this.#nextLocalExplosion = this.localExplosionTransforms.length;
        this.objects = this.objects.filter(object => object === this.generatedGlobalExplosions || object === this.localExplosionShared);
      }
      while (this.#nextLocalExplosionTime < deltaTime && this.#nextLocalExplosion < this.localExplosionTransforms.length) {
        this.#SpawnLocalExplosion(this.localExplosionTransforms[this.#nextLocalExplosion]);
        this.#nextLocalExplosion++;
        if (this.#nextLocalExplosion < this.localExplosionTransforms.length) {
          this.#nextLocalExplosionTime = this.#localExplosionTimes[this.#nextLocalExplosion];
        }
      }
      this.#nextLocalExplosionTime -= deltaTime;
    }
    if (this.globalExplosion || this.globalExplosions.length) {
      this.#countdownToGlobalExplosionStart -= deltaTime;
      if (this.#countdownToGlobalExplosionStart < 0 && !this.globalExplosionInstances.length) this.#SpawnGlobalExplosions();
    }
    for (const object of this.objects) object?.UpdateSyncronous?.(updateContext, params);
    if (this.playTime > this.totalDuration) this.Stop();
  }

  /**
   * Randomises a delay per local explosion, scaled by an interval factor raised to its index, and derives the global start, total duration and wreck-switch times from the accumulated delays.
   */
  #CalculateExplosionTimes(localExplosionCount) {
    this.#localExplosionTimes.length = 0;
    let timeUntilLastLocalExplosion = localExplosionCount ? this.localExplosionDelay : 0;
    this.globalExplosionTime = localExplosionCount ? this.globalExplosionDelay : 0;
    for (let i = 0; i < localExplosionCount; i++) {
      const explosionTime = this.localExplosionIntervalFactor ** i * this.localExplosionInterval * Math.random();
      this.#localExplosionTimes.push(explosionTime);
      timeUntilLastLocalExplosion += explosionTime;
    }
    this.globalExplosionTime += timeUntilLastLocalExplosion;
    this.totalDuration = Math.max(this.localDuration + timeUntilLastLocalExplosion, this.globalExplosionTime + this.globalDuration);
    this.wreckSwitchTime = this.globalExplosionTime + this.wreckSwitchOffsetFromGlobalStart;
  }

  /**
   * Clones a chosen local explosion source, decomposes the given transform into scale, rotation and position, sets the clone up with them, and adds it to the objects.
   */
  #SpawnLocalExplosion(transform) {
    const source = this.localExplosions.length ? this.localExplosions[Math.floor(Math.random() * this.localExplosions.length)] : this.localExplosion;
    if (!source) return;
    const instance = source.Clone?.() ?? source;
    const scale = mat4.getScaling(vec3.create(), transform);
    const rotation = mat4.getRotation(quat.create(), transform);
    const position = mat4.getTranslation(vec3.create(), transform);
    instance.Setup?.(scale, rotation, position, 0);
    this.objects.push(instance);
  }

  /**
   * Clones the global explosion sources into a newly positioned and scaled container child, tracks the instances, and adds the container to the objects.
   */
  #SpawnGlobalExplosions() {
    const sources = this.globalExplosion ? [this.globalExplosion] : this.globalExplosions;
    const container = new _EveChildContainer();
    container.Setup(this.globalScaling, quat.create(), this.globalExplosionOffset, 0);
    for (const source of sources) {
      const instance = source?.Clone?.() ?? source;
      if (!instance) continue;
      container.objects.push(instance);
      this.globalExplosionInstances.push(instance);
    }
    this.generatedGlobalExplosions = container;
    this.objects.push(container);
  }
  static {
    _initClass();
  }
}

export { _EveChildExplosion as EveChildExplosion };
//# sourceMappingURL=EveChildExplosion.js.map
