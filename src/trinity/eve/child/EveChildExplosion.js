// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildExplosion.h
//   trinity/trinity/Eve/SpaceObject/Children/EveChildExplosion.cpp
// Hand-maintained from Carbon source, promoted out of generated intake.
import { CjsSchema, carbon, impl, io, type } from "#schema";
import { EveChildContainer } from "./EveChildContainer.js";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { Tr2SphereShapeAttributeGenerator } from "../../particle/attribute/Tr2SphereShapeAttributeGenerator.js";

/** A container child that sequences and spawns local and global explosion instances over time from authored transforms and delays. */
@type.define({ className: "EveChildExplosion", family: "eve/child" })
export class EveChildExplosion extends EveChildContainer
{

  #countdownToGlobalExplosionStart = 0;

  /** m_sharedObjects - the aliased-through-copies subgraph (cpp:319). */
  #sharedObjects = new Set();

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
    // Carbon collects the shared subgraph right here (cpp:82), so every
    // later spawn's copy can alias rather than duplicate it.
    this.FindSharedObjects();
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
    for (const object of this.objects) object?.UpdateSyncronous(updateContext, params);
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
   * Carbon SpawnLocalExplosion (EveChildExplosion.cpp:456-481): decompose the
   * authored transform, copy a chosen source through the shared-preserving
   * copier (BeClasses->CopyTo with the CopyElement override and the
   * UpdateEmitter post-copy), set the copy up and track it.
   */
  #SpawnLocalExplosion(transform)
  {
    const source = this.localExplosions.length
      ? this.localExplosions[Math.floor(Math.random() * this.localExplosions.length)]
      : this.localExplosion;
    if (!source) return;
    const scale = mat4.getScaling(vec3.create(), transform);
    const rotation = mat4.getRotation(quat.create(), transform);
    const position = mat4.getTranslation(vec3.create(), transform);
    const instance = this.#CopyLocalExplosion(source, { position, rotation });
    if (!instance) return;
    instance.Setup?.(scale, rotation, position, 0);
    this.objects.push(instance);
  }

  /**
   * Carbon FindSharedObjects (EveChildExplosion.cpp:319-388): iterative DFS
   * from localExplosionShared collecting every reachable object into
   * #sharedObjects. Carbon walks the Blue member table for PERSIST
   * IROOT/IROOTPTR entries plus IList elements and IBlueDict values; the
   * CjsSchema field table is that member table here, and list fields ARE the
   * IList arm (this runtime's containers are fields, not container objects).
   */
  @carbon.method
  @impl.implemented
  FindSharedObjects()
  {
    this.#sharedObjects.clear();
    if (!this.localExplosionShared) return;

    const stack = [ this.localExplosionShared ];
    while (stack.length)
    {
      const node = stack.pop();
      if (!node || typeof node !== "object" || this.#sharedObjects.has(node)) continue;
      this.#sharedObjects.add(node);

      const fields = CjsSchema.getSchema(node.constructor)?.fields ?? [];
      for (const field of fields)
      {
        if (!field.io?.persist) continue;
        const kind = field.type?.kind;
        const value = node[field.name];
        if ((kind === "model" || kind === "objectRef") && value)
        {
          stack.push(value);
        }
        else if (kind === "list" && Array.isArray(value))
        {
          for (const item of value)
          {
            if (item && typeof item === "object") stack.push(item);
          }
        }
      }
    }
  }

  /**
   * Carbon CopyElement (EveChildExplosion.cpp:401-421), the ICopier override:
   * a node in the shared set is ALIASED into the copy rather than duplicated
   * (Carbon relocks the pointer; JS aliases the reference), anything else
   * falls back to the ordinary copier. Returns the object to use, or
   * undefined for FALLBACK.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon's ICopier callback writes an out-pointer and returns an OverrideResult; JS returns the alias or undefined-for-FALLBACK.")
  CopyElement(source)
  {
    return this.#sharedObjects.has(source) ? source : undefined;
  }

  /**
   * Carbon UpdateEmitter (EveChildExplosion.cpp:428-448), the post-copy
   * callback: a copied Tr2SphereShapeAttributeGenerator gets its transform
   * rebased into the explosion's frame so shared particle systems keep
   * working. TRANSCRIBED ODDITY: the donor's hand-rolled sandwich composes
   * to conj(rot) * position * rot - the INVERSE of Carbon's own canonical
   * TriVectorRotateQuaternion (q v q~, TriMath.cpp) - and is carried exactly
   * as written; a corrected port stops being evidence.
   *
   * Static in Carbon (a C callback), camelCase here by the statics rule.
   */
  static updateEmitter(dest, transform)
  {
    if (!(dest instanceof Tr2SphereShapeAttributeGenerator)) return;

    const position = vec3.create();
    const rotation = quat.create();
    dest.GetTransform(position, rotation);

    const conjugate = quat.conjugate(quat.create(), transform.rotation);
    const pure = quat.set(quat.create(), position[0], position[1], position[2], 0);
    // XMQuaternionMultiply(a, b) is b*a, so the donor's nesting is
    // conj * position * rot in Hamilton order.
    const sandwich = quat.multiply(quat.create(), quat.multiply(quat.create(), conjugate, pure), transform.rotation);
    vec3.set(position, sandwich[0], sandwich[1], sandwich[2]);

    // rotation' = XMQuaternionMultiply(transform.rotation, rotation)
    //           = rotation * transform.rotation in Hamilton order.
    quat.multiply(rotation, rotation, transform.rotation);

    dest.SetTransform(vec3.add(position, position, transform.position), rotation);
  }

  /**
   * The CopyTo call SpawnLocalExplosion makes (cpp:474): a deep copy of the
   * source graph in which CopyElement's shared aliases survive and every
   * copied node passes through UpdateEmitter. CjsModel.Clone rehydrates
   * through plain value bags and cannot alias, so the copy walks the schema
   * directly: persisted reference fields recurse, everything else takes the
   * clone-by-values path per node.
   */
  #CopyLocalExplosion(source, transform, copies = new Map())
  {
    if (!source || typeof source !== "object") return source;

    const aliased = this.CopyElement(source);
    if (aliased !== undefined) return aliased;
    if (copies.has(source)) return copies.get(source);

    if (typeof source.constructor !== "function" || !CjsSchema.getSchema(source.constructor)?.fields?.length)
    {
      // A schema-less duck (a host-supplied effect source) cannot be walked;
      // its own Clone is the ordinary-copier arm for it, passthrough failing
      // that. Shared aliasing above still applies to it.
      return typeof source.Clone === "function" ? source.Clone() : source;
    }

    const copy = new source.constructor();
    copies.set(source, copy);

    for (const field of CjsSchema.getSchema(source.constructor).fields)
    {
      if (!field.io?.persist) continue;
      const kind = field.type?.kind;
      const value = source[field.name];
      if (value === undefined) continue;

      if (kind === "model" || kind === "objectRef")
      {
        copy[field.name] = this.#CopyLocalExplosion(value, transform, copies);
      }
      else if (kind === "list" && Array.isArray(value))
      {
        copy[field.name] = value.map(item => this.#CopyLocalExplosion(item, transform, copies));
      }
      else if (ArrayBuffer.isView(value))
      {
        copy[field.name] = value.slice();
      }
      else if (Array.isArray(value))
      {
        copy[field.name] = value.map(item => ArrayBuffer.isView(item) ? item.slice() : item);
      }
      else
      {
        copy[field.name] = value;
      }
    }

    EveChildExplosion.updateEmitter(copy, transform);
    return copy;
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
