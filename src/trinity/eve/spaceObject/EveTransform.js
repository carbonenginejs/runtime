// Source: trinity/trinity/Eve/EveTransform.h
// Source: trinity/trinity/Eve/EveTransform.cpp
import { mat4 } from "#math/mat4";
import { withIEveSpaceObject2 } from "../IEveSpaceObject2.js";
import { withIEveTransform } from "../IEveTransform.js";
import { box3 } from "#math/box3";
import { quat } from "#math/quat";
import { sph3 } from "#math/sph3";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { carbon, impl, io, type } from "#schema";
import { TriBatchType } from "#consts/graphics";
import { Tr2Transform } from "../../core/Tr2Transform.js";
import { EveLODHelper, Tr2Lod } from "../EveLODHelper.js";
import { TR2_PICK_TYPE_DEFAULT, Tr2PickType } from "../../core/view/Tr2PickType.js";
import { withITr2BoundingBox } from "#contracts";

// Static scratch for the singular-world patch fixup (allocation rules: hot
// per-object path, copy-into, never allocate per call).
const INVERSE_PATCH_SCRATCH = mat4.create();


/**
 * A placeable node in an Eve scene graph: local SRT placement, an optional mesh,
 * particle systems and emitters, curve sets, observers and child transforms,
 * with its own frustum and LOD visibility pass.
 */
@type.define({ className: "EveTransform", family: "eve/spaceObject" })
export class EveTransform extends withIEveTransform(withIEveSpaceObject2(withITr2BoundingBox(Tr2Transform)))
{

  /** m_meshLod (Tr2MeshBasePtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("Tr2MeshBase")
  meshLod = null;

  /** m_children (PIEveTransformVector) [READ, PERSIST] */
  @io.persist
  @type.list("IEveTransform")
  children = [];

  /** m_overrideBoundsMin (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  overrideBoundsMin = vec3.create();

  /** m_overrideBoundsMax (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  overrideBoundsMax = vec3.create();

  /** m_particleEmitters (PITr2GenericEmitterVector) [READ, PERSIST] */
  @io.persist
  @type.list("ITr2GenericEmitter")
  particleEmitters = [];

  /** m_particleSystems (PTr2ParticleSystemVector) [READ, PERSIST] */
  @io.persist
  @type.list("Tr2ParticleSystem")
  particleSystems = [];

  /** m_lodLevel (Tr2Lod - enum Tr2Lod) [READ] */
  @io.read
  @type.int32
  @type.enum("Tr2Lod")
  lodLevel = Tr2Lod.TR2_LOD_LOW;

  /** m_hideOnLowQuality (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  hideOnLowQuality = false;

  /** m_visibilityThreshold (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  visibilityThreshold = 2;

  /** m_observers (PTriObserverLocalVector) [READ, PERSIST] */
  @io.persist
  @type.list("TriObserverLocal")
  observers = [];

  /** m_useLodLevel (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  useLodLevel = true;

  #isVisible = true;
  #lastCurveUpdateDelta = EveLODHelper.lowUpdateRate;

  /**
   * Adopts an authored meshLod as the node's mesh when no mesh was set, so a
   * graph that only authored the LOD mesh still renders.
   */
  @carbon.method
  @impl.implemented
  Initialize()
  {
    if (!this.mesh)
    {
      this.mesh = this.meshLod;
      this.meshLod = null;
    }
    return true;
  }

  /**
   * Rebuilds the local matrix from rotation, translation and scaling and composes it with the parent to refresh worldTransform, keeping the previous world transform for motion vectors, then pushes the new transform to the particle systems and observers.
   * @returns {mat4} The node's live worldTransform, valid until the next update.
  */
  @carbon.method
  @carbon.contextual(["camera"])
  @impl.adapted
  @impl.reason("Renderer-owned modifier state is supplied through the update context; standard SRT and parent composition stay in Trinity.")
  UpdateViewDependentData(context, parentTransform = EveTransform.#identity)
  {
    const frustum = context.GetFrustum();
    super.UpdateViewDependentData(context.renderContext, parentTransform);
    for (const system of this.particleSystems) system.UpdateViewDependentData(frustum, this.worldTransform);
    for (const observer of this.observers) observer.Update(this.worldTransform);
    return this.worldTransform;
  }

  /** Runs the synchronous pass then the asynchronous pass, in Carbon's order. */
  @carbon.method
  @impl.implemented
  Update(context)
  {
    this.UpdateSyncronous(context);
    this.UpdateAsyncronous(context);
  }

  /**
   * Does nothing: EveTransform performs all of its per-frame work in
   * UpdateAsyncronous.
   */
  @carbon.method
  @impl.implemented
  UpdateSyncronous(_context)
  {
  }

  /**
   * Advances the curve sets once the accumulated delta satisfies the LOD update rate, then updates the children, particle systems and particle emitters.
   * @returns {boolean} False without doing any work when the node's update flag is off.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Particle updates are forwarded through backend-neutral emitter and system contracts; device particle managers remain engine-owned.")
  UpdateAsyncronous(context)
  {
    if (!this.update) return false;
    const time = Number(context?.GetTime?.() ?? context?.currentTime ?? context?.time ?? 0);
    const deltaTime = Number(context?.GetDeltaT?.() ?? context?.deltaTime ?? context?.deltaT ?? 0);
    this.#lastCurveUpdateDelta += deltaTime;
    if (!this.useLodLevel || EveLODHelper.ShouldUpdate(this.lodLevel, this.#lastCurveUpdateDelta))
    {
      this.#lastCurveUpdateDelta = 0;
      for (const curveSet of this.curveSets) curveSet.Update(time, undefined, context.renderContext);
    }
    for (const child of this.children) child?.Update?.(context);
    for (const system of this.particleSystems)
    {
      system?.UpdateTransform(this.worldTransform);
      system?.Update(context);
    }
    const originShift = context?.GetOriginShift?.() ?? context?.originShift ?? EveTransform.#zero;
    for (const emitter of this.particleEmitters)
    {
      emitter?.Update({ time, transform: this.worldTransform, originShift, context });
    }
    return true;
  }

  /**
   * Refreshes the world transform, then derives visibility and LOD from the mesh bounding sphere: the sphere is frustum-tested and its on-screen size in pixels is compared against the context's medium and low detail thresholds for the LOD level and against visibilityThreshold for visibility; a node with no mesh is always visible, any particle system forces high LOD, and children's LOD levels are merged in.
   * @returns {boolean} Whether this node itself is visible.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Browser frustum and quality state are read from the explicit update context instead of renderer globals.")
  UpdateVisibility(context, parentTransform = EveTransform.#identity)
  {
    this.lodLevel = Tr2Lod.TR2_LOD_LOW;
    this.#isVisible = false;
    if (!this.display || (this.hideOnLowQuality && (context?.lowQuality ?? context?.device?.lowQuality))) return false;

    this.UpdateViewDependentData(context, parentTransform);
    const frustum = context?.GetFrustum?.() ?? context?.frustum;
    if (this.mesh)
    {
      const valid = this.GetBoundingSphere(EveTransform.#sphere);
      const visible = !valid || this.visibilityThreshold < 0 || frustum?.IsSphereVisible(EveTransform.#sphere) !== false;
      if (visible)
      {
        const size = Number(frustum?.GetPixelSizeAccross?.(EveTransform.#sphere) ?? Infinity);
        this.mesh.UseWithScreenSize?.(size, EveTransform.#sphere[3]);
        const medium = Number(context?.GetMediumDetailThreshold?.() ?? context?.mediumDetailThreshold ?? 0);
        const low = Number(context?.GetLowDetailThreshold?.() ?? context?.lowDetailThreshold ?? 0);
        if (size >= medium) this.lodLevel = Tr2Lod.TR2_LOD_HIGH;
        else if (size >= low) this.lodLevel = Tr2Lod.TR2_LOD_MEDIUM;
        if (size > this.visibilityThreshold) this.#isVisible = true;
      }
    }
    else
    {
      this.#isVisible = true;
    }
    if (this.particleSystems.length) this.lodLevel = Tr2Lod.TR2_LOD_HIGH;
    for (const child of this.children)
    {
      child?.UpdateVisibility(context, this.worldTransform);
      this.lodLevel = EveLODHelper.MergeLOD(this.lodLevel, child?.GetLODLevel?.() ?? Tr2Lod.TR2_LOD_UNSPECIFIED);
    }
    return this.#isVisible;
  }

  /**
   * Sorts the particle systems, appends this node when it is visible and has a
   * mesh, then recurses into the children; nothing is appended while display is
   * off.
   */
  @carbon.method
  @impl.implemented
  GetRenderables(out = [])
  {
    if (!this.display) return out;
    for (const system of this.particleSystems) system?.SortParticles?.();
    if (this.#isVisible && this.mesh) out.push(this);
    for (const child of this.children) child?.GetRenderables(out);
    return out;
  }

  // Carbon EveTransform::GetPerObjectData (EveTransform.cpp:49-77): fills the
  // EveBasicPerObjectData constant record. Trinity owns the catalogued layout;
  // SetAndTranspose writes each LOGICAL matrix into its canonical stored form.
  // Carbon's worldInverse = Inverse(transposed world) equals the transpose of
  // the logical inverse, so the port passes Inverse(world) to that encoder.

  /**
   * Allocates an EveBasicPerObjectData record from the accumulator and fills it with the world, previous-world and inverse-world matrices, patching the first all-zero basis of a singular world matrix with a 0.1 diagonal before inverting, as Carbon does.
   * @returns {object} The allocated record, owned by the accumulator.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Trinity allocates the catalogued record and encodes its matrix fields into the canonical stored layout; the engine owns GPU allocation, upload, and binding.")
  GetPerObjectData(accumulator)
  {
    const data = accumulator.Alloc("EveBasicPerObjectData");

    data.SetAndTranspose("world", this.worldTransform);
    data.SetAndTranspose("worldLast", this.lastWorldTransform);

    if (!mat4.invert(INVERSE_PATCH_SCRATCH, this.worldTransform))
    {
      // Carbon singular fixup (EveTransform.cpp:66-75): patch the first
      // all-zero basis of the LOGICAL world (its column [0,1,2]/[4,5,6]/
      // [8,9,10] equals Carbon's transposed-world row test on the shared
      // layout) with a 0.1 diagonal, then invert that.
      const patched = INVERSE_PATCH_SCRATCH;
      mat4.copy(patched, this.worldTransform);
      if (patched[0] === 0 && patched[1] === 0 && patched[2] === 0) patched[0] = 0.1;
      else if (patched[4] === 0 && patched[5] === 0 && patched[6] === 0) patched[5] = 0.1;
      else if (patched[8] === 0 && patched[9] === 0 && patched[10] === 0) patched[10] = 0.1;
      if (!mat4.invert(INVERSE_PATCH_SCRATCH, patched)) mat4.identity(INVERSE_PATCH_SCRATCH);
    }

    data.SetAndTranspose("worldInverse", INVERSE_PATCH_SCRATCH);
    return data;
  }

  /**
   * Carbon EveTransform::GetPickingBatches (EveTransform.cpp:?): collects the
   * geometry a pick pass should test, by mask.
   *
   * Simpler than the hull's version in two ways that are deliberate: there are
   * no decals or overlay effects to pull into the opaque bit, and the
   * transparent bit goes through this class's own `GetBatches` rather than
   * reaching into the mesh's areas - so a hidden transform contributes nothing
   * at all, instead of suppressing only its transparent pass.
   *
   * Inherited by `EveMissileWarhead` and `EveRootTransform`, which is how
   * Carbon gives them a pickable surface without declaring one.
   *
   * @param {Object} batches - the picking accumulator
   * @param {Number} pickTypes - a Tr2PickType mask
   * @param {Object} perObjectData - this transform's per-object record
   */
  @carbon.method
  @impl.implemented
  GetPickingBatches(batches, pickTypes = TR2_PICK_TYPE_DEFAULT, perObjectData = null)
  {
    if (pickTypes & Tr2PickType.PICK_TYPE_PICKING)
    {
      this.GetBatches(batches, TriBatchType.TRIBATCHTYPE_PICKING, perObjectData);
    }

    if (pickTypes & Tr2PickType.PICK_TYPE_OPAQUE)
    {
      this.GetBatches(batches, TriBatchType.TRIBATCHTYPE_OPAQUE, perObjectData);
    }

    if (pickTypes & Tr2PickType.PICK_TYPE_TRANSPARENT)
    {
      this.GetBatches(batches, TriBatchType.TRIBATCHTYPE_TRANSPARENT, perObjectData);
      this.GetBatches(batches, TriBatchType.TRIBATCHTYPE_ADDITIVE, perObjectData);
    }

    return true;
  }

  /**
   * Carbon EveTransform::GetID (EveTransform.h:83-86): a picked area resolves
   * to this transform, so the area index is deliberately ignored.
   * @param {Number} [_areaID] - the picked area, unused by this class
   * @returns {EveTransform} this
   */
  @carbon.method
  @impl.implemented
  GetID(_areaID = 0)
  {
    return this;
  }

  /** Writes the override bounds, or the displayed mesh's local bounds when no override exists. */
  @carbon.method
  @impl.implemented
  GetLocalBoundingBox(min, max)
  {
    if (!vec3.equals(this.overrideBoundsMin, this.overrideBoundsMax))
    {
      vec3.copy(min, this.overrideBoundsMin);
      vec3.copy(max, this.overrideBoundsMax);
      return true;
    }
    return this.mesh ? this.mesh.GetBoundingBox(min, max) : false;
  }

  /** Writes the direct local bounds transformed by the current world matrix. */
  @carbon.method
  @impl.implemented
  GetWorldBoundingBox(min, max)
  {
    if (!this.GetLocalBoundingBox(min, max)) return false;
    const bounds = EveTransform.#worldBounds;
    box3.fromBounds(bounds, min, max);
    box3.transformMat4(bounds, bounds, this.worldTransform);
    vec3.set(min, bounds[0], bounds[1], bounds[2]);
    vec3.set(max, bounds[3], bounds[4], bounds[5]);
    return true;
  }

  /** Reports whether override or mesh bounds are currently available. */
  @carbon.method
  @impl.implemented
  IsBoundingBoxReady()
  {
    return this.GetLocalBoundingBox(EveTransform.#boundsMin, EveTransform.#boundsMax);
  }

  /**
   * Writes the world-space bounding sphere, taken from the override bounds when they differ and otherwise from the mesh bounding box, and unions in the children's spheres when a query is passed.
   * @param {vec4} out Caller-owned sphere; left untouched when no source produced one.
   * @returns {boolean} Whether a sphere was written.
   */
  @carbon.method
  @impl.implemented
  GetBoundingSphere(out = vec4.create(), query = 0)
  {
    let valid = false;
    if (!vec3.equals(this.overrideBoundsMin, this.overrideBoundsMax))
    {
      sph3.fromBounds(EveTransform.#localSphere, this.overrideBoundsMin, this.overrideBoundsMax);
      sph3.transformMat4(out, EveTransform.#localSphere, this.worldTransform);
      valid = true;
    }
    else if (this.mesh && this.mesh.GetBoundingBox(EveTransform.#boundsMin, EveTransform.#boundsMax))
    {
      sph3.fromBounds(EveTransform.#localSphere, EveTransform.#boundsMin, EveTransform.#boundsMax);
      sph3.transformMat4(out, EveTransform.#localSphere, this.worldTransform);
      valid = true;
    }
    if (query)
    {
      for (const child of this.children)
      {
        if (child?.GetBoundingSphere?.(EveTransform.#childSphere, query))
        {
          if (valid) sph3.union(out, out, EveTransform.#childSphere);
          else vec4.copy(out, EveTransform.#childSphere);
          valid = true;
        }
      }
    }
    return valid;
  }

  /**
   * Returns the world translation; called without an out parameter it returns a
   * live subarray view of worldTransform that changes with the next transform
   * update.
   */
  @carbon.method
  @impl.implemented
  GetWorldPosition(out)
  {
    return out ? vec3.set(out, this.worldTransform[12], this.worldTransform[13], this.worldTransform[14]) : this.worldTransform.subarray(12, 15);
  }

  /**
   * Returns the node's local rotation quaternion; called without an out
   * parameter it returns the live field rather than a copy.
   */
  @carbon.method
  @impl.implemented
  GetWorldRotation(out)
  {
    return out ? quat.copy(out, this.rotation) : this.rotation;
  }

  /** Returns the LOD level chosen by the last visibility pass. */
  @carbon.method
  @impl.implemented
  GetLODLevel()
  {
    return this.lodLevel;
  }

  /** Turns rendering of this node and its subtree on or off. */
  @carbon.method
  @impl.implemented
  SetDisplay(value)
  {
    this.display = !!value;
  }

  /** Starts playback on every curve set on this node. */
  @carbon.method
  @impl.implemented
  PlayCurveSets()
  {
    for (const curveSet of this.curveSets) curveSet?.Play();
  }

  /**
   * Starts every curve set carrying the given name, playing a named time range
   * when one is supplied and otherwise resetting to the full range first.
   */
  @carbon.method
  @impl.implemented
  PlayCurveSet(name, rangeName = "")
  {
    for (const curveSet of this.curveSets)
    {
      if ((curveSet?.GetName() ?? curveSet?.name) !== name) continue;
      if (rangeName)
      {
        curveSet.PlayTimeRange?.(rangeName);
      }
      else
      {
        curveSet.ResetTimeRange();
        curveSet.Play();
      }
    }
  }

  /** Stops every curve set carrying the given name. */
  @carbon.method
  @impl.implemented
  StopCurveSet(name)
  {
    for (const curveSet of this.curveSets) if ((curveSet?.GetName() ?? curveSet?.name) === name) curveSet.Stop();
  }

  /**
   * Returns the longest curve duration across the curve sets carrying the given
   * name, or 0 when none match.
   */
  @carbon.method
  @impl.implemented
  GetCurveSetDuration(name)
  {
    let duration = 0;
    for (const curveSet of this.curveSets) if ((curveSet?.GetName() ?? curveSet?.name) === name) duration = Math.max(duration, Number(curveSet.GetMaxCurveDuration?.() ?? 0));
    return duration;
  }

  /**
   * Returns the longest duration of a named time range across the curve sets
   * carrying the given name, or 0 when none match.
   */
  @carbon.method
  @impl.implemented
  GetRangeDuration(name, rangeName)
  {
    let duration = 0;
    for (const curveSet of this.curveSets) if ((curveSet?.GetName() ?? curveSet?.name) === name) duration = Math.max(duration, Number(curveSet.GetRangeDuration(rangeName) ?? 0));
    return duration;
  }

  static Tr2Lod = Tr2Lod;

  static #identity = mat4.create();
  static #zero = vec3.create();
  static #sphere = vec4.create();
  static #localSphere = vec4.create();
  static #childSphere = vec4.create();
  static #boundsMin = vec3.create();
  static #boundsMax = vec3.create();
  static #worldBounds = box3.create();
}
