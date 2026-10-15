// Source: trinity/trinity/Eve/EveTransform.h
// Source: trinity/trinity/Eve/EveTransform.cpp
// Source: trinity/trinity/Eve/EveTransform_Blue.cpp
import "#consts/trinity";
import { mat4 } from "#math/mat4";
import { IEveSpaceObject2 } from "../IEveSpaceObject2.js";
import { IEveTransform } from "../IEveTransform.js";
import { ITr2CurveSetOwner } from "../../curves/ITr2CurveSetOwner.js";
import { box3 } from "#math/box3";
import { quat } from "#math/quat";
import { sph3 } from "#math/sph3";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { meta, type, blue } from "#schema";
import { TriBatchType } from "#consts/graphics";
import { Tr2Transform } from "../../core/Tr2Transform.js";
import { EveLODHelper, Tr2Lod } from "../EveLODHelper.js";
import { TR2_PICK_TYPE_DEFAULT, Tr2PickType } from "#consts/graphics/tr2PickType";
import { ITr2BoundingBox } from "#interfaces";
import { IWorldPosition } from "../../core/IWorldPosition.js";
import { IInitialize } from "#blue/IInitialize";
import { CcpTime } from "../../../global/blue/CcpTime.js";
import { Tr2Renderer } from "../../core/Tr2Renderer.js";
import { ITr2GenericEmitterUpdateArguments } from "../../particle/ITr2GenericEmitter/index.js";

// Static scratch for the singular-world patch fixup (allocation rules: hot
// per-object path, copy-into, never allocate per call).
const INVERSE_PATCH_SCRATCH = mat4.create();


/**
 * A placeable node in an Eve scene graph: local SRT placement, an optional mesh,
 * particle systems and emitters, curve sets, observers and child transforms,
 * with its own frustum and LOD visibility pass.
 */
@blue.define("EveTransform")
@blue.inherit(IWorldPosition, ITr2BoundingBox, IEveSpaceObject2, IEveTransform, ITr2CurveSetOwner)
@blue.interface(IEveTransform, IEveSpaceObject2, IWorldPosition, IInitialize, ITr2BoundingBox)
@blue.chainTo(Tr2Transform)
export class EveTransform extends Tr2Transform
{

  /**
   * m_meshLod (Tr2MeshBasePtr) [READWRITE, PERSIST]
   *
   * Fallback mesh adopted during initialization when the primary mesh is unset.
   * @type {Tr2MeshBase|null}
   */
  @blue.readwrite
  @blue.persist
  @type.rootRef("Tr2MeshBase")
  meshLod = null;

  /**
   * m_children (PIEveTransformVector) [READ, PERSIST]
   *
   * Child transforms visited for updates, visibility, bounds and render submission.
   * @type {IEveTransform[]}
   */
  @blue.read
  @blue.persist
  @type.list("IEveTransform")
  children = [];

  /**
   * m_overrideBoundsMin (Vector3) [READWRITE, PERSIST]
   *
   * Local minimum of the override bounds, enabled when it differs from overrideBoundsMax.
   * @type {vec3}
   */
  @blue.readwrite
  @blue.persist
  @type.vec3
  overrideBoundsMin = vec3.create();

  /**
   * m_overrideBoundsMax (Vector3) [READWRITE, PERSIST]
   *
   * Local maximum of the override bounds, enabled when it differs from overrideBoundsMin.
   * @type {vec3}
   */
  @blue.readwrite
  @blue.persist
  @type.vec3
  overrideBoundsMax = vec3.create();

  /**
   * m_particleEmitters (PITr2GenericEmitterVector) [READ, PERSIST]
   *
   * Emitters advanced with the node's world transform and current update context.
   * @type {ITr2GenericEmitter[]}
   */
  @blue.read
  @blue.persist
  @type.list("ITr2GenericEmitter")
  particleEmitters = [];

  /**
   * m_particleSystems (PTr2ParticleSystemVector) [READ, PERSIST]
   *
   * Particle systems updated, sorted and transformed with this node.
   * @type {Tr2ParticleSystem[]}
   */
  @blue.read
  @blue.persist
  @type.list("Tr2ParticleSystem")
  particleSystems = [];

  /**
   * m_lodLevel (Tr2Lod - enum Tr2Lod) [READ]
   *
   * Current LOD selected by visibility testing and merged with the children's LOD levels.
   * @type {number}
   */
  @blue.read
  @type.int32
  @type.enum("trinity.Tr2Lod")
  lodLevel = Tr2Lod.TR2_LOD_LOW;

  /**
   * m_hideOnLowQuality (bool) [READWRITE, PERSIST]
   *
   * Whether low-quality rendering suppresses this node's visibility.
   * @type {boolean}
   */
  @blue.readwrite
  @blue.persist
  @type.boolean
  hideOnLowQuality = false;

  /**
   * m_visibilityThreshold (float) [READWRITE, PERSIST]
   *
   * Projected mesh-size threshold for visibility; a negative value bypasses sphere rejection.
   * @type {number}
   */
  @blue.readwrite
  @blue.persist
  @type.float32
  visibilityThreshold = 2;

  /**
   * m_observers (PTriObserverLocalVector) [READ, PERSIST]
   *
   * Observers updated from the node's world transform during view-dependent updates.
   * @type {TriObserverLocal[]}
   */
  @blue.read
  @blue.persist
  @type.list("TriObserverLocal")
  observers = [];

  /**
   * m_useLodLevel (bool) [READWRITE, PERSIST]
   *
   * Whether curve-set updates are throttled according to the current LOD.
   * @type {boolean}
   */
  @blue.readwrite
  @blue.persist
  @type.boolean
  useLodLevel = true;

  /**
   * Cached visibility result controlling submission of this node's mesh.
   * @type {boolean}
   */
  _isVisible = true;
  /**
   * Accumulated update delta used to decide when LOD-throttled curve sets advance.
   * @type {number}
   */
  _lastCurveUpdateDelta = EveLODHelper.lowUpdateRate;
  /**
   * The context delta seen by the last asynchronous update, in seconds.
   * @type {number}
   */
  _lastDeltaTime = 0;

  /**
   * Adopts an authored meshLod as the node's mesh when no mesh was set, so a
   * graph that only authored the LOD mesh still renders.
   */
  @blue.method
  @meta.implemented
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
   *
   * Adapted: Renderer-owned modifier state is supplied through the update
   * context; standard SRT and parent composition stay in Trinity.
  */
  @blue.method
  @blue.contextual(["camera"])
  @meta.adapted
  UpdateViewDependentData(context, parentTransform = EveTransform._identity)
  {
    const frustum = context.GetFrustum();
    super.UpdateViewDependentData(context.renderContext, parentTransform);
    for (const system of this.particleSystems) system.UpdateViewDependentData(frustum, this.worldTransform);
    for (const observer of this.observers) observer.Update(this.worldTransform);
    return this.worldTransform;
  }

  /** Runs the synchronous pass then the asynchronous pass, in Carbon's order. */
  @blue.method
  @meta.implemented
  Update(context)
  {
    this.UpdateSyncronous(context);
    this.UpdateAsyncronous(context);
  }

  /**
   * Does nothing: EveTransform performs all of its per-frame work in
   * UpdateAsyncronous.
   */
  @blue.method
  @meta.implemented
  UpdateSyncronous(_context)
  {
  }

  /**
   * Carbon EveTransform::UpdateAsyncronous (EveTransform.cpp:108-158). Skipped
   * entirely for a hideOnLowQuality node under low quality; m_update is not
   * consulted here (only Tr2Transform::Update reads it, and this class
   * overrides that). Curve sets accrue the frame delta and advance at the LOD
   * rate with the context's Blue ticks converted to seconds; children update;
   * particle systems take the world transform; emitters update against the
   * world transform and particle systems against identity, both with the
   * context's GPU particle system and origin shift.
   *
   * Adapted: curve sets also receive the context's render context, which the
   * JavaScript curves read in place of Carbon's renderer globals; the emitter
   * and system argument records carry time in seconds, the unit every
   * JavaScript emitter reads.
   */
  @blue.method
  @meta.adapted
  UpdateAsyncronous(context)
  {
    if (this.hideOnLowQuality && Tr2Renderer.IsLowQuality()) return;

    const time = context.GetTime();
    this._lastDeltaTime = context.GetDeltaT();

    if (this.curveSets.length)
    {
      this._lastCurveUpdateDelta += this._lastDeltaTime;
      if (!this.useLodLevel || EveLODHelper.ShouldUpdate(this.lodLevel, this._lastCurveUpdateDelta))
      {
        this._lastCurveUpdateDelta = 0;
        for (const curveSet of this.curveSets) curveSet.Update(CcpTime.timeAsDouble(time), context.renderContext);
      }
    }

    for (const child of this.children) child.Update(context);

    for (const system of this.particleSystems) system.UpdateTransform(this.worldTransform);
    if (this.particleEmitters.length)
    {
      const args = EveTransform._emitterArgs;
      args.time = CcpTime.timeAsDouble(time);
      args.system = context.GetGpuParticleSystem();
      mat4.copy(args.parentTransform, this.worldTransform);
      vec3.copy(args.originShift, context.GetOriginShift());
      args.emitCountFactor = 1;
      for (const emitter of this.particleEmitters) emitter.Update(args);
    }
    if (this.particleSystems.length)
    {
      const args = EveTransform._systemArgs;
      args.time = CcpTime.timeAsDouble(time);
      args.system = context.GetGpuParticleSystem();
      mat4.identity(args.parentTransform);
      vec3.copy(args.originShift, context.GetOriginShift());
      args.emitCountFactor = 1;
      for (const system of this.particleSystems) system.Update(args);
    }
  }

  /**
   * Refreshes the world transform, then derives visibility and LOD from the mesh bounding sphere: the sphere is frustum-tested and its on-screen size in pixels is compared against the context's medium and low detail thresholds for the LOD level and against visibilityThreshold for visibility; a node with no mesh is always visible, any particle system forces high LOD, and children's LOD levels are merged in.
   * @returns {boolean} Whether this node itself is visible.
   */
  @blue.method
  @meta.implemented
  UpdateVisibility(context, parentTransform = EveTransform._identity)
  {
    this.lodLevel = Tr2Lod.TR2_LOD_LOW;
    this._isVisible = false;
    if (this.hideOnLowQuality && Tr2Renderer.IsLowQuality()) return false;
    if (!this.display) return false;

    this.UpdateViewDependentData(context, parentTransform);
    const frustum = context.GetFrustum();
    if (this.mesh)
    {
      // An invalid sphere leaves the transform invisible, as Carbon's nested ifs do.
      if (this.GetBoundingSphere(EveTransform._sphere))
      {
        if (frustum.IsSphereVisible(EveTransform._sphere) || this.visibilityThreshold < 0)
        {
          const size = frustum.GetPixelSizeAccross(EveTransform._sphere);
          this.mesh.UseWithScreenSize(size, EveTransform._sphere[3]);
          if (size >= context.GetMediumDetailThreshold()) this.lodLevel = Tr2Lod.TR2_LOD_HIGH;
          else if (size >= context.GetLowDetailThreshold()) this.lodLevel = Tr2Lod.TR2_LOD_MEDIUM;
          if (size > this.visibilityThreshold) this._isVisible = true;
        }
      }
    }
    else
    {
      this._isVisible = true;
    }
    if (this.particleSystems.length) this.lodLevel = Tr2Lod.TR2_LOD_HIGH;
    for (const child of this.children)
    {
      child.UpdateVisibility(context, this.worldTransform);
      this.lodLevel = EveLODHelper.MergeLOD(this.lodLevel, child.GetLODLevel());
    }
    return this._isVisible;
  }

  /** Carbon's GetRenderables( renderables ): forwards with no impostor manager. */
  @blue.method
  @meta.implemented
  GetRenderables(out)
  {
    return this.GetRenderables__Impostors(out, null);
  }

  /**
   * Sorts the particle systems, appends this node when it is visible and has a
   * mesh, then recurses into the children; nothing is appended while display is
   * off.
   */
  @meta.implemented
  GetRenderables__Impostors(out = [], _impostors)
  {
    if (!this.display) return out;
    for (const system of this.particleSystems) system.SortParticles();
    if (this._isVisible && this.mesh) out.push(this);
    for (const child of this.children) child.GetRenderables(out);
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
   *
   * Adapted: Trinity allocates the catalogued record and encodes its matrix
   * fields into the canonical stored layout; the engine owns GPU allocation,
   * upload, and binding.
   */
  @blue.method
  @meta.adapted
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
  @blue.method
  @meta.implemented
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
  @blue.method
  @meta.implemented
  GetID(_areaID = 0)
  {
    return this;
  }

  /** Writes the override bounds, or the displayed mesh's local bounds when no override exists. */
  @blue.method
  @meta.implemented
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
  @blue.method
  @meta.implemented
  GetWorldBoundingBox(min, max)
  {
    if (!this.GetLocalBoundingBox(min, max)) return false;
    const bounds = EveTransform._worldBounds;
    box3.fromBounds(bounds, min, max);
    box3.transformMat4(bounds, bounds, this.worldTransform);
    vec3.set(min, bounds[0], bounds[1], bounds[2]);
    vec3.set(max, bounds[3], bounds[4], bounds[5]);
    return true;
  }

  /** Reports whether override or mesh bounds are currently available. */
  @blue.method
  @meta.implemented
  IsBoundingBoxReady()
  {
    return this.GetLocalBoundingBox(EveTransform._boundsMin, EveTransform._boundsMax);
  }

  /**
   * Writes the world-space bounding sphere, taken from the override bounds when they differ and otherwise from the mesh bounding box, and unions in the children's spheres when a query is passed.
   * @param {vec4} out Caller-owned sphere; left untouched when no source produced one.
   * @returns {boolean} Whether a sphere was written.
   */
  @blue.method
  @meta.implemented
  GetBoundingSphere(out = vec4.create(), query = 0)
  {
    let valid = false;
    if (!vec3.equals(this.overrideBoundsMin, this.overrideBoundsMax))
    {
      sph3.fromBounds(EveTransform._localSphere, this.overrideBoundsMin, this.overrideBoundsMax);
      sph3.transformMat4(out, EveTransform._localSphere, this.worldTransform);
      valid = true;
    }
    else if (this.mesh && this.mesh.GetBoundingBox(EveTransform._boundsMin, EveTransform._boundsMax))
    {
      sph3.fromBounds(EveTransform._localSphere, EveTransform._boundsMin, EveTransform._boundsMax);
      sph3.transformMat4(out, EveTransform._localSphere, this.worldTransform);
      valid = true;
    }
    if (query)
    {
      for (const child of this.children)
      {
        if (child.GetBoundingSphere(EveTransform._childSphere, query))
        {
          if (valid) sph3.union(out, out, EveTransform._childSphere);
          else vec4.copy(out, EveTransform._childSphere);
          valid = true;
        }
      }
    }
    return valid;
  }

  /**
   * Writes the world translation into a caller-owned vector.
   * @param {Float32Array} out Caller-owned position.
   * @returns {Float32Array} out
   */
  @blue.method
  @meta.implemented
  GetWorldPosition(out)
  {
    return vec3.set(out, this.worldTransform[12], this.worldTransform[13], this.worldTransform[14]);
  }

  /**
   * Returns the node's local rotation quaternion; called without an out
   * parameter it returns the live field rather than a copy.
   */
  @blue.method
  @meta.implemented
  GetWorldRotation(out)
  {
    return out ? quat.copy(out, this.rotation) : this.rotation;
  }

  /** Returns the LOD level chosen by the last visibility pass. */
  @blue.method
  @meta.implemented
  GetLODLevel()
  {
    return this.lodLevel;
  }

  /** Turns rendering of this node and its subtree on or off. */
  @blue.method
  @meta.implemented
  SetDisplay(value)
  {
    this.display = !!value;
  }

  /** Starts playback on every curve set on this node. */
  @blue.method
  @meta.implemented
  PlayCurveSets()
  {
    for (const curveSet of this.curveSets) curveSet.Play();
  }

  /**
   * Starts every curve set carrying the given name, playing a named time range
   * when one is supplied and otherwise resetting to the full range first.
   */
  @blue.method
  @meta.implemented
  PlayCurveSet(name, rangeName = "")
  {
    for (const curveSet of this.curveSets)
    {
      if (curveSet.GetName() !== name) continue;
      if (rangeName)
      {
        curveSet.PlayTimeRange(rangeName);
      }
      else
      {
        curveSet.ResetTimeRange();
        curveSet.Play();
      }
    }
  }

  /** Stops every curve set carrying the given name. */
  @blue.method
  @meta.implemented
  StopCurveSet(name)
  {
    for (const curveSet of this.curveSets) if (curveSet.GetName() === name) curveSet.Stop();
  }

  /**
   * Returns the longest curve duration across the curve sets carrying the given
   * name, or 0 when none match.
   */
  @blue.method
  @meta.implemented
  GetCurveSetDuration(name)
  {
    let duration = 0;
    for (const curveSet of this.curveSets) if (curveSet.GetName() === name) duration = Math.max(duration, curveSet.GetMaxCurveDuration());
    return duration;
  }

  /**
   * Returns the longest duration of a named time range across the curve sets
   * carrying the given name, or 0 when none match.
   */
  @blue.method
  @meta.implemented
  GetRangeDuration(name, rangeName)
  {
    let duration = 0;
    for (const curveSet of this.curveSets) if (curveSet.GetName() === name) duration = Math.max(duration, curveSet.GetRangeDuration(rangeName));
    return duration;
  }

  /**
   * LOD constants exposed for configuring and inspecting transform detail levels.
   * @type {typeof Tr2Lod}
   */
  static Tr2Lod = Tr2Lod;

  /**
   * Identity parent-transform fallback for visibility and view-dependent updates.
   * @type {mat4}
   */
  static _identity = mat4.create();
  /**
   * Zero origin-shift fallback for emitter updates.
   * @type {vec3}
   */
  static _zero = vec3.create();
  /**
   * Shared emitter update arguments (world transform); updates run
   * sequentially, so one record is reused.
   * @type {ITr2GenericEmitterUpdateArguments}
   */
  static _emitterArgs = new ITr2GenericEmitterUpdateArguments();
  /**
   * Shared particle-system update arguments (identity transform).
   * @type {ITr2GenericEmitterUpdateArguments}
   */
  static _systemArgs = new ITr2GenericEmitterUpdateArguments();
  /**
   * Shared world bounding sphere scratch for visibility and projected-size queries.
   * @type {vec4}
   */
  static _sphere = vec4.create();
  /**
   * Shared local bounding sphere scratch before transformation to world space.
   * @type {vec4}
   */
  static _localSphere = vec4.create();
  /**
   * Shared output scratch for a child's sphere before merging it into the parent bound.
   * @type {vec4}
   */
  static _childSphere = vec4.create();
  /**
   * Shared output scratch for local bounding box minima.
   * @type {vec3}
   */
  static _boundsMin = vec3.create();
  /**
   * Shared output scratch for local bounding box maxima.
   * @type {vec3}
   */
  static _boundsMax = vec3.create();
  /**
   * Shared bounding box scratch for transforming local bounds into world space.
   * @type {box3}
   */
  static _worldBounds = box3.create();
}

// Supported native interfaces; ITr2Pickable has no runtime declaration yet.
// EveTransform_Blue.cpp:13-19,88 chains Tr2Transform explicitly.
