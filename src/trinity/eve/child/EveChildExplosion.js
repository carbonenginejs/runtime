// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildExplosion.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
import { EveChildContainer } from "./EveChildContainer.js";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";

/** A container child that sequences and spawns local and global explosion instances over time from authored transforms and delays. */
@type.define({ className: "EveChildExplosion", family: "eve/child" })
export class EveChildExplosion extends EveChildContainer
{

  #countdownToGlobalExplosionStart = 0;

  #localExplosionTimes = [];

  #nextLocalExplosion = 0;

  #nextLocalExplosionTime = 0;

  @type.array("mat4")
  localExplosionTransforms = [];

  @type.vec3
  globalExplosionOffset = vec3.create();

  @type.list("IEveSpaceObjectChild")
  globalExplosionInstances = [];

  /** m_globalExplosionContainer (EveChildContainerPtr) [READ] */
  @io.read
  @type.objectRef("EveChildContainer")
  generatedGlobalExplosions = null;

  /** m_localExplosionScaling (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  localScaling = vec3.fromValues(1, 1, 1);

  /** m_globalExplosionScaling (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  globalScaling = vec3.fromValues(1, 1, 1);

  /** m_globalExplosion (IEveSpaceObjectChildPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("IEveSpaceObjectChild")
  globalExplosion = null;

  /** m_localExplosion (IEveSpaceObjectChildPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("IEveSpaceObjectChild")
  localExplosion = null;

  /** m_localExplosionShared (IEveSpaceObjectChildPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("IEveSpaceObjectChild")
  localExplosionShared = null;

  /** m_globalExplosions (PIEveSpaceObjectChildVector) [READ, PERSIST] */
  @io.persist
  @type.list("IEveSpaceObjectChild")
  globalExplosions = [];

  /** m_localExplosionIntervalFactor (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  localExplosionIntervalFactor = 1;

  /** m_localExplosionDelay (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  localExplosionDelay = 0;

  /** m_globalExplosionDelay (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  globalExplosionDelay = 0;

  /** m_totalDuration (float) [READ] */
  @io.read
  @type.float32
  totalDuration = 0;

  /** m_globalDuration (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  globalDuration = 0;

  /** m_isPlaying (bool) [READ] */
  @io.read
  @type.boolean
  isPlaying = false;

  /** m_localExplosions (PIEveSpaceObjectChildVector) [READ, PERSIST] */
  @io.persist
  @type.list("IEveSpaceObjectChild")
  localExplosions = [];

  /** m_localExplosionInterval (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  localExplosionInterval = 1;

  /** m_globalExplosionTime (float) [READ] */
  @io.read
  @type.float32
  globalExplosionTime = 0;

  /** m_wreckSwitchTime (float) [READ] */
  @io.read
  @type.float32
  wreckSwitchTime = 0;

  /** m_wreckSwitchOffsetFromGlobalStart (float) [READWRITE] */
  @io.readwrite
  @type.float32
  wreckSwitchOffsetFromGlobalStart = 0;

  /** m_playTime (float) [READ] */
  @io.read
  @type.float32
  playTime = 0;

  /** m_localDuration (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  localDuration = 0;

  /** Carbon method SetLocalExplosionTransforms (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  SetLocalExplosionTransforms(transforms)
  {
    this.localExplosionTransforms = Array.from(transforms ?? [], transform => mat4.clone(transform));
  }

  /** Carbon method SetGlobalExplosionOffset (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  SetGlobalExplosionOffset(offset)
  {
    vec3.copy(this.globalExplosionOffset, offset);
    this.globalExplosionOffset[0] /= this.scaling[0];
    this.globalExplosionOffset[1] /= this.scaling[1];
    this.globalExplosionOffset[2] /= this.scaling[2];
  }

  /** Carbon EveChildExplosion::RegisterComponents (cpp:45-48): base container
   * registration only. */
  @carbon.method
  @impl.implemented
  RegisterComponents()
  {
    super.RegisterComponents();
  }

  /** Carbon EveChildExplosion::UnRegisterComponents (cpp:54-65): manually
   * un-registers the global explosion container (spawned outside m_objects,
   * JS field generatedGlobalExplosions), then the base container forwarding. */
  @carbon.method
  @impl.implemented
  UnRegisterComponents()
  {
    if (this.generatedGlobalExplosions)
    {
      this.generatedGlobalExplosions.UnRegister(this.GetComponentRegistry());
    }
    super.UnRegisterComponents();
  }

  /** Carbon method Play (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  Play()
  {
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
  @carbon.method
  @impl.implemented
  Stop()
  {
    this.objects.length = 0;
    this.isPlaying = false;
    this.globalExplosionInstances.length = 0;
    this.generatedGlobalExplosions = null;
  }

  @impl.adapted
  /**
   * Advances play time, spawns due local explosions and switches to wreck-only mode past the wreck-switch time, fires the global explosion batch once its countdown elapses, updates the children, and stops once the total duration passes.
   */
  UpdateSyncronous(updateContext, params = {})
  {
    if (!this.isPlaying) return;
    const deltaTime = Number(updateContext?.GetDeltaT?.() ?? updateContext?.deltaTime ?? 0);
    this.playTime += deltaTime;
    if (this.localExplosion || this.localExplosions.length)
    {
      if (this.wreckSwitchTime > 0 && this.playTime > this.wreckSwitchTime && this.globalDuration > 0)
      {
        this.#nextLocalExplosion = this.localExplosionTransforms.length;
        this.objects = this.objects.filter(object => object === this.generatedGlobalExplosions || object === this.localExplosionShared);
      }
      while (this.#nextLocalExplosionTime < deltaTime && this.#nextLocalExplosion < this.localExplosionTransforms.length)
      {
        this.#SpawnLocalExplosion(this.localExplosionTransforms[this.#nextLocalExplosion]);
        this.#nextLocalExplosion++;
        if (this.#nextLocalExplosion < this.localExplosionTransforms.length)
        {
          this.#nextLocalExplosionTime = this.#localExplosionTimes[this.#nextLocalExplosion];
        }
      }
      this.#nextLocalExplosionTime -= deltaTime;
    }
    if (this.globalExplosion || this.globalExplosions.length)
    {
      this.#countdownToGlobalExplosionStart -= deltaTime;
      if (this.#countdownToGlobalExplosionStart < 0 && !this.globalExplosionInstances.length) this.#SpawnGlobalExplosions();
    }
    for (const object of this.objects) object?.UpdateSyncronous?.(updateContext, params);
    if (this.playTime > this.totalDuration) this.Stop();
  }

  /**
   * Randomises a delay per local explosion, scaled by an interval factor raised to its index, and derives the global start, total duration and wreck-switch times from the accumulated delays.
   */
  #CalculateExplosionTimes(localExplosionCount)
  {
    this.#localExplosionTimes.length = 0;
    let timeUntilLastLocalExplosion = localExplosionCount ? this.localExplosionDelay : 0;
    this.globalExplosionTime = localExplosionCount ? this.globalExplosionDelay : 0;
    for (let i = 0; i < localExplosionCount; i++)
    {
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
  #SpawnLocalExplosion(transform)
  {
    const source = this.localExplosions.length
      ? this.localExplosions[Math.floor(Math.random() * this.localExplosions.length)]
      : this.localExplosion;
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
  #SpawnGlobalExplosions()
  {
    const sources = this.globalExplosion ? [this.globalExplosion] : this.globalExplosions;
    const container = new EveChildContainer();
    container.Setup(this.globalScaling, quat.create(), this.globalExplosionOffset, 0);
    for (const source of sources)
    {
      const instance = source?.Clone?.() ?? source;
      if (!instance) continue;
      container.objects.push(instance);
      this.globalExplosionInstances.push(instance);
    }
    this.generatedGlobalExplosions = container;
    this.objects.push(container);
  }

}
