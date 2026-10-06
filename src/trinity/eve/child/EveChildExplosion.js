// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildExplosion.h
//   trinity/trinity/Eve/SpaceObject/Children/EveChildExplosion.cpp
// Hand-maintained from Carbon source, promoted out of generated intake.
import { CjsSchema, meta } from "#schema";
import { blue, ICopier } from "#blue";
import { addChild, removeChild, clearChildren } from "../../../global/blue/children.js";
import { EveChildContainer } from "./EveChildContainer.js";
import { EveEntity } from "../EveEntity.js";
import { EveSpaceObjectChild } from "./EveSpaceObjectChild.js";
import { IEveSpaceObjectChild } from "./IEveSpaceObjectChild.js";
import { Tr2Lod } from "../EveLODHelper.js";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { Tr2SphereShapeAttributeGenerator } from "../../particle/attribute/Tr2SphereShapeAttributeGenerator.js";

/** A container child that sequences and spawns local and global explosion instances over time from authored transforms and delays. */
@meta.define({ className: "EveChildExplosion", family: "eve/child" })
@meta.blue.interface(EveChildContainer, EveEntity, EveSpaceObjectChild, IEveSpaceObjectChild)
export class EveChildExplosion extends EveChildContainer
{

  /** m_countdownToGlobalExplosionStart: seconds until the global explosion spawns. */
  _countdownToGlobalExplosionStart = 0;

  /** m_sharedObjects: every object reachable from localExplosionShared, aliased through copies (cpp:319-388). */
  _sharedObjects = new Set();

  /** m_localExplosionTimes: per-explosion delays in seconds (cpp:113-141). */
  _localExplosionTimes = [];

  /** m_nextLocalExplosion: index into the local explosion transforms. */
  _nextLocalExplosion = 0;

  /** m_nextLocalExplosionTime: seconds until the next local explosion. */
  _nextLocalExplosionTime = 0;

  /** m_localExplosionTransforms: caller-supplied local explosion transforms (not Blue-exposed). */
  _localExplosionTransforms = [];

  /** m_globalExplosionOffset: global explosion offset divided by the explosion's scaling (cpp:167-173). */
  _globalExplosionOffset = vec3.create();

  /** m_globalExplosionInstances: the spawned global explosion copies (not Blue-exposed). */
  _globalExplosionInstances = [];

  /** m_globalExplosionContainer (EveChildContainerPtr) [READ] */
  @meta.blue.read
  @meta.type.rootRef("EveChildContainer")
  generatedGlobalExplosions = null;

  /** m_localExplosionScaling (Vector3) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  localScaling = vec3.fromValues(1, 1, 1);

  /** m_globalExplosionScaling (Vector3) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  globalScaling = vec3.fromValues(1, 1, 1);

  /** m_globalExplosion (IEveSpaceObjectChildPtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.rootRef("IEveSpaceObjectChild")
  globalExplosion = null;

  /** m_localExplosion (IEveSpaceObjectChildPtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.rootRef("IEveSpaceObjectChild")
  localExplosion = null;

  /** m_localExplosionShared (IEveSpaceObjectChildPtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.rootRef("IEveSpaceObjectChild")
  localExplosionShared = null;

  /** m_globalExplosions (PIEveSpaceObjectChildVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("IEveSpaceObjectChild")
  globalExplosions = [];

  /** m_localExplosionIntervalFactor (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  localExplosionIntervalFactor = 1;

  /** m_localExplosionDelay (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  localExplosionDelay = 0;

  /** m_globalExplosionDelay (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  globalExplosionDelay = 0;

  /** m_totalDuration (float) [READ] */
  @meta.blue.read
  @meta.type.float32
  totalDuration = 0;

  /** m_globalDuration (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  globalDuration = 0;

  /** m_isPlaying (bool) [READ] */
  @meta.blue.read
  @meta.type.boolean
  isPlaying = false;

  /** m_localExplosions (PIEveSpaceObjectChildVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("IEveSpaceObjectChild")
  localExplosions = [];

  /** m_localExplosionInterval (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  localExplosionInterval = 1;

  /** m_globalExplosionTime (float) [READ] */
  @meta.blue.read
  @meta.type.float32
  globalExplosionTime = 0;

  /** m_wreckSwitchTime (float) [READ] */
  @meta.blue.read
  @meta.type.float32
  wreckSwitchTime = 0;

  /** m_wreckSwitchOffsetFromGlobalStart (float) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.float32
  wreckSwitchOffsetFromGlobalStart = 0;

  /** m_playTime (float) [READ] */
  @meta.blue.read
  @meta.type.float32
  playTime = 0;

  /** m_localDuration (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  localDuration = 0;

  /** Blue read-only alias for m_objects (EveChildExplosion_Blue.cpp:108): the spawned explosions. */
  get generatedLocalExplosions()
  {
    return this.objects;
  }

  /**
   * Carbon SetLocalExplosionTransforms (cpp:149-157): replaces the local explosion transforms.
   * @param {Iterable<mat4>} transforms Local explosion transforms.
   */
  @meta.blue.method
  @meta.implemented
  SetLocalExplosionTransforms(transforms)
  {
    this._localExplosionTransforms = Array.from(transforms, transform => mat4.clone(transform));
  }

  /**
   * Carbon SetGlobalExplosionOffset (cpp:167-173): stores the offset divided by the explosion's own scaling.
   * @param {vec3} offset Offset in local coordinates.
   */
  @meta.blue.method
  @meta.implemented
  SetGlobalExplosionOffset(offset)
  {
    vec3.copy(this._globalExplosionOffset, offset);
    this._globalExplosionOffset[0] /= this.scaling[0];
    this._globalExplosionOffset[1] /= this.scaling[1];
    this._globalExplosionOffset[2] /= this.scaling[2];
  }

  /** Carbon RegisterComponents (cpp:45-48): base container registration only. */
  @meta.blue.method
  @meta.implemented
  RegisterComponents()
  {
    super.RegisterComponents();
  }

  /**
   * Carbon UnRegisterComponents (cpp:54-65): unregisters the generated global explosion container, then the
   * base container's children. The container is always an EveChildContainer, so Carbon's EveEntity cast holds.
   */
  @meta.blue.method
  @meta.implemented
  UnRegisterComponents()
  {
    if (this.generatedGlobalExplosions)
    {
      this.generatedGlobalExplosions.UnRegister(this.GetComponentRegistry());
    }
    super.UnRegisterComponents();
  }

  /**
   * Carbon Play (cpp:71-89): stops, then, when any explosion source exists, appends the shared child, collects
   * the shared subgraph, schedules the explosions and starts playback. A null shared child is not appended:
   * Carbon's BlueList Append rejects null (BlueListUtil.h:594-599).
   */
  @meta.blue.method
  @meta.implemented
  Play()
  {
    this.Stop();
    if (!this.localExplosion && !this.globalExplosion && !this.localExplosions.length && !this.globalExplosions.length)
    {
      return;
    }

    this._nextLocalExplosionTime = this.localExplosionDelay;
    this._nextLocalExplosion = 0;
    if (this.localExplosionShared) addChild(this, "objects", this.localExplosionShared, { listNotify: this });
    this.FindSharedObjects();
    this.CalculateExplosionTimes(this._localExplosionTransforms.length);
    this.playTime = 0;
    this._countdownToGlobalExplosionStart = this.globalExplosionTime;

    this.RebuildLocalTransform();
    this.isPlaying = true;
  }

  /**
   * Carbon Stop (cpp:95-107): while registered, unregisters the spawned children and the global container
   * (the explosion itself stays registered), clears the spawned children, and drops the shared set, the
   * global instances and the global container.
   */
  @meta.blue.method
  @meta.implemented
  Stop()
  {
    if (this.IsInRegistry())
    {
      this.UnRegisterComponents();
    }
    clearChildren(this, "objects", { listNotify: this });
    this.isPlaying = false;
    this._sharedObjects.clear();
    this._globalExplosionInstances.length = 0;
    this.generatedGlobalExplosions = null;
  }

  /**
   * Carbon UpdateSyncronous (cpp:180-292). While playing: advances play time; past the wreck-switch time
   * removes every spawned local explosion; spawns due local explosions, each translation moved into this
   * child's local frame (cpp:207-209); spawns the global explosion(s) when the countdown elapses and registers
   * the new container when this child is registered; stops after the total duration. Then, playing or not, the
   * base container update runs.
   *
   * Quirk, reproduced (cpp:220-284): the singular globalExplosion and the globalExplosions list are
   * independent branches that each decrement the countdown, so with both authored the countdown runs at twice
   * the rate and the singular branch, which spawns first, suppresses the list.
   *
   * @param {EveUpdateContext} updateContext Frame context; GetDeltaT is in seconds.
   * @param {object} params Child update params from the owner.
   */
  @meta.blue.method
  @meta.implemented
  UpdateSyncronous(updateContext, params)
  {
    if (this.isPlaying)
    {
      const dt = updateContext.GetDeltaT();
      this.playTime += dt;
      if (this.localExplosion || this.localExplosions.length)
      {
        // Small explosions are removed only when a big one follows.
        if (this.wreckSwitchTime > 0 && this.playTime > this.wreckSwitchTime && this.globalDuration > 0)
        {
          this._nextLocalExplosion = this._localExplosionTransforms.length;
          for (let i = 0; i < this.objects.length;)
          {
            const object = this.objects[i];
            if (object !== this.generatedGlobalExplosions && object !== this.localExplosionShared)
            {
              removeChild(this, "objects", object, { listNotify: this });
            }
            else
            {
              ++i;
            }
          }
        }

        while (this._nextLocalExplosionTime < dt && this._nextLocalExplosion < this._localExplosionTransforms.length)
        {
          const transform = mat4.copy(EveChildExplosion._spawnTransform, this._localExplosionTransforms[this._nextLocalExplosion]);
          // Carbon: translation = TransformCoord(translation, Inverse(m_localTransform)); one matrix, no composition.
          mat4.invert(EveChildExplosion._inverseLocal, this.localTransform);
          vec3.transformMat4(EveChildExplosion._translation, mat4.getTranslation(EveChildExplosion._translation, transform), EveChildExplosion._inverseLocal);
          transform[12] = EveChildExplosion._translation[0];
          transform[13] = EveChildExplosion._translation[1];
          transform[14] = EveChildExplosion._translation[2];
          this.SpawnLocalExplosion(transform);
          this._nextLocalExplosion++;
          if (this._nextLocalExplosion < this._localExplosionTransforms.length)
          {
            this._nextLocalExplosionTime = this._localExplosionTimes[this._nextLocalExplosion];
          }
        }

        this._nextLocalExplosionTime -= dt;
      }
      if (this.globalExplosion)
      {
        this._countdownToGlobalExplosionStart -= dt;
        if (this._countdownToGlobalExplosionStart < 0 && !this._globalExplosionInstances.length)
        {
          const instance = blue.classes.CopyTo(this.globalExplosion);
          if (instance)
          {
            const container = new EveChildContainer();
            this.generatedGlobalExplosions = container;
            container.SetupWithStaticRotation(this.globalScaling, quat.create(), this._globalExplosionOffset, Tr2Lod.TR2_LOD_LOW);
            addChild(container, "objects", instance, { listNotify: container });
            addChild(this, "objects", container, { listNotify: this });
            this._globalExplosionInstances.push(instance);
          }
          // Bug, reproduced (cpp:242): a failed copy leaves the container null, and a registered explosion
          // dereferences it anyway.
          if (this.IsInRegistry() && !this.generatedGlobalExplosions.IsInRegistry())
          {
            this.generatedGlobalExplosions.Register(this.GetComponentRegistry());
          }
        }
      }
      if (this.globalExplosions.length)
      {
        this._countdownToGlobalExplosionStart -= dt;
        if (this._countdownToGlobalExplosionStart < 0 && !this._globalExplosionInstances.length)
        {
          const container = new EveChildContainer();
          this.generatedGlobalExplosions = container;
          for (const globalExplosion of this.globalExplosions)
          {
            const instance = blue.classes.CopyTo(globalExplosion);
            if (instance)
            {
              addChild(container, "objects", instance, { listNotify: container });
              this._globalExplosionInstances.push(instance);
            }
          }
          if (this.IsInRegistry() && !container.IsInRegistry())
          {
            container.Register(this.GetComponentRegistry());
          }
          addChild(this, "objects", container, { listNotify: this });
        }
      }

      if (this.playTime > this.totalDuration)
      {
        this.Stop();
      }
    }
    super.UpdateSyncronous(updateContext, params);
  }

  /**
   * Carbon RegisterWithQuadRenderer (cpp:294-312): registers the explosion sources, not the spawned copies and
   * not the base container's children. Quirk, reproduced: the singular localExplosion is not registered.
   * @param {Tr2QuadRenderer} quadRenderer Quad renderer.
   */
  @meta.blue.method
  @meta.implemented
  RegisterWithQuadRenderer(quadRenderer)
  {
    for (const localExplosion of this.localExplosions) localExplosion.RegisterWithQuadRenderer(quadRenderer);
    if (this.localExplosionShared) this.localExplosionShared.RegisterWithQuadRenderer(quadRenderer);
    if (this.globalExplosion) this.globalExplosion.RegisterWithQuadRenderer(quadRenderer);
    for (const globalExplosion of this.globalExplosions) globalExplosion.RegisterWithQuadRenderer(quadRenderer);
  }

  /**
   * Carbon CalculateExplosionTimes (cpp:113-141): a random delay per local explosion, scaled by the interval
   * factor raised to its index; the global start, total duration and wreck-switch time follow from them.
   *
   * Adapted: C rand()/RAND_MAX, which can reach 1, becomes Math.random(), which stays below 1; JavaScript has
   * no C library generator.
   * @param {number} localExplosionCount Number of local explosions.
   */
  @meta.blue.method
  @meta.adapted
  CalculateExplosionTimes(localExplosionCount)
  {
    this._localExplosionTimes.length = 0;
    let timeUntilLastLocalExplosion = 0;
    this.globalExplosionTime = 0;
    this.totalDuration = 0;

    if (localExplosionCount !== 0)
    {
      timeUntilLastLocalExplosion += this.localExplosionDelay;
      this.globalExplosionTime += this.globalExplosionDelay;
    }

    for (let i = 0; i < localExplosionCount; i++)
    {
      const explosionTime = this.localExplosionIntervalFactor ** i * this.localExplosionInterval * Math.random();
      this._localExplosionTimes.push(explosionTime);
      timeUntilLastLocalExplosion += explosionTime;
    }
    const totalLocalDuration = this.localDuration + timeUntilLastLocalExplosion;
    this.globalExplosionTime += timeUntilLastLocalExplosion;

    // Max because an explosion may have no global part.
    this.totalDuration = Math.max(totalLocalDuration, this.globalExplosionTime + this.globalDuration);

    this.wreckSwitchTime = this.globalExplosionTime + this.wreckSwitchOffsetFromGlobalStart;
  }

  /**
   * Carbon FindSharedObjects (cpp:319-388): collects every object reachable from localExplosionShared through
   * persisted IROOT/IROOTPTR members, list items and dictionary values. The schema field table stands in for
   * the Blue member table; Carbon's extra push of the current object (cpp:360) is a no-op on the visited set.
   */
  @meta.blue.method
  @meta.implemented
  FindSharedObjects()
  {
    this._sharedObjects.clear();
    if (!this.localExplosionShared) return;

    const stack = [ this.localExplosionShared ];
    while (stack.length)
    {
      const node = stack.pop();
      if (this._sharedObjects.has(node)) continue;
      this._sharedObjects.add(node);

      for (const field of CjsSchema.getSchema(node.constructor).fields)
      {
        if (!field.edit?.persist) continue;
        const kind = field.type?.kind, value = node[field.name];
        if ((kind === "rootRef" || kind === "root") && value) stack.push(value);
        else if (kind === "list" && value)
        {
          for (const item of value) if (item) stack.push(item);
        }
        else if (kind === "map" && value instanceof Map)
        {
          for (const item of value.values()) if (item) stack.push(item);
        }
      }
    }
  }

  /**
   * Carbon CopyElement (cpp:401-422), the copier override: a shared object is aliased into the copy instead of
   * duplicated; anything else falls back to the ordinary copier.
   *
   * Adapted: Carbon's static callback receives the explosion as void* context and writes an out-pointer; this is
   * bound to the explosion and returns the copier override's `{ result, dest }` record.
   * @param {object} source Object being copied.
   * @returns {{result: number, dest?: object}} Copier override result.
   */
  @meta.blue.method
  @meta.adapted
  CopyElement(source)
  {
    return this._sharedObjects.has(source)
      ? { result: ICopier.OverrideResult.SUCCESS, dest: source }
      : { result: ICopier.OverrideResult.FALLBACK };
  }

  /**
   * Carbon UpdateEmitter (cpp:435-449), the post-copy callback: a copied Tr2SphereShapeAttributeGenerator is
   * moved into the explosion's frame so shared particle systems keep working. Transcribed oddity: the donor's
   * sandwich composes to conj(rot) * position * rot, the inverse of TriVectorRotateQuaternion, carried as written.
   * Static in Carbon (a C callback), camelCase here by the statics rule.
   * @param {object} dest Copied object.
   * @param {{position: vec3, rotation: quat}} transform Local explosion transform.
   */
  static updateEmitter(dest, transform)
  {
    // Carbon BlueCastPtr to Tr2SphereShapeAttributeGeneratorPtr (cpp:438): the copier visits every copied object.
    const generator = CjsSchema.cast(dest, Tr2SphereShapeAttributeGenerator);
    if (!generator) return;

    const position = vec3.create();
    const rotation = quat.create();
    generator.GetTransform(position, rotation);

    const conjugate = quat.conjugate(quat.create(), transform.rotation);
    const pure = quat.set(quat.create(), position[0], position[1], position[2], 0);
    // XMQuaternionMultiply(a, b) is b*a, so the donor's nesting is conj * position * rot in Hamilton order.
    const sandwich = quat.multiply(quat.create(), quat.multiply(quat.create(), conjugate, pure), transform.rotation);
    vec3.set(position, sandwich[0], sandwich[1], sandwich[2]);

    // rotation' = XMQuaternionMultiply(transform.rotation, rotation) = rotation * transform.rotation (Hamilton).
    quat.multiply(rotation, rotation, transform.rotation);

    generator.SetTransform(vec3.add(position, position, transform.position), rotation);
  }

  /**
   * Carbon SpawnLocalExplosion (cpp:457-480): decomposes the transform, copies a source (the local explosion,
   * or a random entry of localExplosions) through the shared-preserving copier, sets the copy up at LOW lod
   * and appends it.
   *
   * Adapted: C rand() % n becomes Math.floor(Math.random() * n); JavaScript has no C library generator.
   * @param {mat4} transform Local explosion transform in this child's local frame.
   */
  @meta.blue.method
  @meta.adapted
  SpawnLocalExplosion(transform)
  {
    if (!this.localExplosion && !this.localExplosions.length)
    {
      return;
    }

    const t = { rotation: quat.create(), position: vec3.create() };
    const scale = vec3.create();
    mat4.decomposeCarbon(transform, t.rotation, t.position, scale);

    let localExplosion = this.localExplosion;
    if (this.localExplosions.length)
    {
      localExplosion = this.localExplosions[Math.floor(Math.random() * this.localExplosions.length)];
    }
    const instance = blue.classes.CopyTo(
      localExplosion,
      null,
      source => this.CopyElement(source),
      (_source, dest) => EveChildExplosion.updateEmitter(dest, t)
    );
    if (!instance)
    {
      return;
    }
    instance.Setup(scale, t.rotation, t.position, Tr2Lod.TR2_LOD_LOW);
    addChild(this, "objects", instance, { listNotify: this });
  }

  static _spawnTransform = mat4.create();
  static _inverseLocal = mat4.create();
  static _translation = vec3.create();
}

// EveChildExplosion_Blue.cpp ends this concrete interface table without chaining its base.
