import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { sph3 } from '@carbonenginejs/runtime-utils/sph3';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { io, type, carbon, impl, schema } from '@carbonenginejs/runtime-utils/schema';
import { TriBatchType } from '@carbonenginejs/runtime-utils/graphics';
import { Tr2Transform as _Tr2Transform } from '../../generated/trinityCore/Tr2Transform.js';
import { EveLODHelper } from '../EveLODHelper.js';
import { Tr2Lod } from '@carbonenginejs/runtime-utils/const/trinity';

let _initProto, _initClass, _init_meshLod, _init_extra_meshLod, _init_children, _init_extra_children, _init_overrideBoundsMin, _init_extra_overrideBoundsMin, _init_overrideBoundsMax, _init_extra_overrideBoundsMax, _init_particleEmitters, _init_extra_particleEmitters, _init_particleSystems, _init_extra_particleSystems, _init_lodLevel, _init_extra_lodLevel, _init_hideOnLowQuality, _init_extra_hideOnLowQuality, _init_visibilityThreshold, _init_extra_visibilityThreshold, _init_observers, _init_extra_observers, _init_useLodLevel, _init_extra_useLodLevel;

// Static scratch for the singular-world patch fixup (allocation rules: hot
// per-object path, copy-into, never allocate per call).
const INVERSE_PATCH_SCRATCH = mat4.create();

/**
 * A placeable node in an Eve scene graph: local SRT placement, an optional mesh,
 * particle systems and emitters, curve sets, observers and child transforms,
 * with its own frustum and LOD visibility pass.
 */
let _EveTransform;
new class extends _identity {
  static [class EveTransform extends _Tr2Transform {
    static {
      ({
        e: [_init_meshLod, _init_extra_meshLod, _init_children, _init_extra_children, _init_overrideBoundsMin, _init_extra_overrideBoundsMin, _init_overrideBoundsMax, _init_extra_overrideBoundsMax, _init_particleEmitters, _init_extra_particleEmitters, _init_particleSystems, _init_extra_particleSystems, _init_lodLevel, _init_extra_lodLevel, _init_hideOnLowQuality, _init_extra_hideOnLowQuality, _init_visibilityThreshold, _init_extra_visibilityThreshold, _init_observers, _init_extra_observers, _init_useLodLevel, _init_extra_useLodLevel, _initProto],
        c: [_EveTransform, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveTransform",
        family: "eve/spaceObject"
      })], [[[io, io.persist, void 0, type.model("Tr2MeshBase")], 16, "meshLod"], [[io, io.persist, void 0, type.list("IEveTransform")], 16, "children"], [[io, io.persist, type, type.vec3], 16, "overrideBoundsMin"], [[io, io.persist, type, type.vec3], 16, "overrideBoundsMax"], [[io, io.persist, void 0, type.list("ITr2GenericEmitter")], 16, "particleEmitters"], [[io, io.persist, void 0, type.list("Tr2ParticleSystem")], 16, "particleSystems"], [[io, io.read, type, type.int32, void 0, schema.enum("Tr2Lod")], 16, "lodLevel"], [[io, io.persist, type, type.boolean], 16, "hideOnLowQuality"], [[io, io.persist, type, type.float32], 16, "visibilityThreshold"], [[io, io.persist, void 0, type.list("TriObserverLocal")], 16, "observers"], [[io, io.persist, type, type.boolean], 16, "useLodLevel"], [[carbon, carbon.method, impl, impl.implemented], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Renderer-owned modifier state is supplied through the update context; standard SRT and parent composition stay in Trinity.")], 18, "UpdateViewDependentData"], [[carbon, carbon.method, impl, impl.implemented], 18, "Update"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateSyncronous"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Particle updates are forwarded through backend-neutral emitter and system contracts; device particle managers remain engine-owned.")], 18, "UpdateAsyncronous"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Browser frustum and quality state are read from the explicit update context instead of renderer globals.")], 18, "UpdateVisibility"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetRenderables"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Constant-buffer layout/packing is engine-owned; Trinity Allocs the record from the accumulator's store and Sets logical values by name (the store transposes per the engine layout).")], 18, "GetPerObjectData"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Declared on Tr2Transform in Carbon; the generated base class stays data-only.")], 18, "GetBatches"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Declared on Tr2Transform in Carbon; the generated base class stays data-only.")], 18, "HasTransparentBatches"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon reads the Tr2Renderer view-position global; the relocated camera state arrives via the threaded render context.")], 18, "GetSortValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBoundingSphere"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetWorldPosition"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetWorldRotation"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetLODLevel"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetDisplay"], [[carbon, carbon.method, impl, impl.implemented], 18, "PlayCurveSets"], [[carbon, carbon.method, impl, impl.implemented], 18, "PlayCurveSet"], [[carbon, carbon.method, impl, impl.implemented], 18, "StopCurveSet"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetCurveSetDuration"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetRangeDuration"]], 0, void 0, _Tr2Transform));
    }
    /** m_meshLod (Tr2MeshBasePtr) [READWRITE, PERSIST] */
    meshLod = (_initProto(this), _init_meshLod(this, null));

    /** m_children (PIEveTransformVector) [READ, PERSIST] */
    children = (_init_extra_meshLod(this), _init_children(this, []));

    /** m_overrideBoundsMin (Vector3) [READWRITE, PERSIST] */
    overrideBoundsMin = (_init_extra_children(this), _init_overrideBoundsMin(this, vec3.create()));

    /** m_overrideBoundsMax (Vector3) [READWRITE, PERSIST] */
    overrideBoundsMax = (_init_extra_overrideBoundsMin(this), _init_overrideBoundsMax(this, vec3.create()));

    /** m_particleEmitters (PITr2GenericEmitterVector) [READ, PERSIST] */
    particleEmitters = (_init_extra_overrideBoundsMax(this), _init_particleEmitters(this, []));

    /** m_particleSystems (PTr2ParticleSystemVector) [READ, PERSIST] */
    particleSystems = (_init_extra_particleEmitters(this), _init_particleSystems(this, []));

    /** m_lodLevel (Tr2Lod - enum Tr2Lod) [READ] */
    lodLevel = (_init_extra_particleSystems(this), _init_lodLevel(this, Tr2Lod.TR2_LOD_LOW));

    /** m_hideOnLowQuality (bool) [READWRITE, PERSIST] */
    hideOnLowQuality = (_init_extra_lodLevel(this), _init_hideOnLowQuality(this, false));

    /** m_visibilityThreshold (float) [READWRITE, PERSIST] */
    visibilityThreshold = (_init_extra_hideOnLowQuality(this), _init_visibilityThreshold(this, 2));

    /** m_observers (PTriObserverLocalVector) [READ, PERSIST] */
    observers = (_init_extra_visibilityThreshold(this), _init_observers(this, []));

    /** m_useLodLevel (bool) [READWRITE, PERSIST] */
    useLodLevel = (_init_extra_observers(this), _init_useLodLevel(this, true));
    #isVisible = (_init_extra_useLodLevel(this), true);
    #lastCurveUpdateDelta = EveLODHelper.lowUpdateRate;
    #lastWorldTransform = mat4.create();

    /**
     * Adopts an authored meshLod as the node's mesh when no mesh was set, so a
     * graph that only authored the LOD mesh still renders.
     */
    Initialize() {
      if (!this.mesh) {
        this.mesh = this.meshLod;
        this.meshLod = null;
      }
      return true;
    }

    /**
     * Rebuilds the local matrix from rotation, translation and scaling and composes it with the parent to refresh worldTransform, keeping the previous world transform for motion vectors, then pushes the new transform to the particle systems and observers.
     * @returns {mat4} The node's live worldTransform, valid until the next update.
     */
    UpdateViewDependentData(context, parentTransform = _EveTransform.#identity) {
      mat4.copy(this.#lastWorldTransform, this.worldTransform);
      mat4.fromRotationTranslationScale(this.localTransform, this.rotation, this.translation, this.scaling);
      mat4.multiply(this.worldTransform, parentTransform, this.localTransform);
      for (const system of this.particleSystems) system?.UpdateViewDependentData?.(context?.GetFrustum?.() ?? context?.frustum ?? context, this.worldTransform);
      for (const observer of this.observers) observer?.Update?.(this.worldTransform);
      return this.worldTransform;
    }

    /** Runs the synchronous pass then the asynchronous pass, in Carbon's order. */
    Update(context) {
      this.UpdateSyncronous(context);
      this.UpdateAsyncronous(context);
    }

    /**
     * Does nothing: EveTransform performs all of its per-frame work in
     * UpdateAsyncronous.
     */
    UpdateSyncronous(_context) {}

    /**
     * Advances the curve sets once the accumulated delta satisfies the LOD update rate, then updates the children, particle systems and particle emitters.
     * @returns {boolean} False without doing any work when the node's update flag is off.
     */
    UpdateAsyncronous(context) {
      if (!this.update) return false;
      const time = Number(context?.GetTime?.() ?? context?.currentTime ?? context?.time ?? 0);
      const deltaTime = Number(context?.GetDeltaT?.() ?? context?.deltaTime ?? context?.deltaT ?? 0);
      this.#lastCurveUpdateDelta += deltaTime;
      if (!this.useLodLevel || EveLODHelper.ShouldUpdate(this.lodLevel, this.#lastCurveUpdateDelta)) {
        this.#lastCurveUpdateDelta = 0;
        for (const curveSet of this.curveSets) curveSet?.Update?.(time);
      }
      for (const child of this.children) child?.Update?.(context);
      for (const system of this.particleSystems) {
        system?.UpdateTransform?.(this.worldTransform);
        system?.Update?.(context);
      }
      const originShift = context?.GetOriginShift?.() ?? context?.originShift ?? _EveTransform.#zero;
      for (const emitter of this.particleEmitters) {
        emitter?.Update?.({
          time,
          transform: this.worldTransform,
          originShift,
          context
        });
      }
      return true;
    }

    /**
     * Refreshes the world transform, then derives visibility and LOD from the mesh bounding sphere: the sphere is frustum-tested and its on-screen size in pixels is compared against the context's medium and low detail thresholds for the LOD level and against visibilityThreshold for visibility; a node with no mesh is always visible, any particle system forces high LOD, and children's LOD levels are merged in.
     * @returns {boolean} Whether this node itself is visible.
     */
    UpdateVisibility(context, parentTransform = _EveTransform.#identity) {
      this.lodLevel = Tr2Lod.TR2_LOD_LOW;
      this.#isVisible = false;
      if (!this.display || this.hideOnLowQuality && (context?.lowQuality ?? context?.device?.lowQuality)) return false;
      this.UpdateViewDependentData(context, parentTransform);
      const frustum = context?.GetFrustum?.() ?? context?.frustum;
      if (this.mesh) {
        const valid = this.GetBoundingSphere(_EveTransform.#sphere);
        const visible = !valid || this.visibilityThreshold < 0 || frustum?.IsSphereVisible?.(_EveTransform.#sphere) !== false;
        if (visible) {
          const size = Number(frustum?.GetPixelSizeAccross?.(_EveTransform.#sphere) ?? Infinity);
          this.mesh.UseWithScreenSize?.(size, _EveTransform.#sphere[3]);
          const medium = Number(context?.GetMediumDetailThreshold?.() ?? context?.mediumDetailThreshold ?? 0);
          const low = Number(context?.GetLowDetailThreshold?.() ?? context?.lowDetailThreshold ?? 0);
          if (size >= medium) this.lodLevel = Tr2Lod.TR2_LOD_HIGH;else if (size >= low) this.lodLevel = Tr2Lod.TR2_LOD_MEDIUM;
          if (size > this.visibilityThreshold) this.#isVisible = true;
        }
      } else {
        this.#isVisible = true;
      }
      if (this.particleSystems.length) this.lodLevel = Tr2Lod.TR2_LOD_HIGH;
      for (const child of this.children) {
        child?.UpdateVisibility?.(context, this.worldTransform);
        this.lodLevel = EveLODHelper.MergeLOD(this.lodLevel, child?.GetLODLevel?.() ?? Tr2Lod.TR2_LOD_UNSPECIFIED);
      }
      return this.#isVisible;
    }

    /**
     * Sorts the particle systems, appends this node when it is visible and has a
     * mesh, then recurses into the children; nothing is appended while display is
     * off.
     */
    GetRenderables(out = []) {
      if (!this.display) return out;
      for (const system of this.particleSystems) system?.SortParticles?.();
      if (this.#isVisible && this.mesh) out.push(this);
      for (const child of this.children) child?.GetRenderables?.(out);
      return out;
    }

    // Carbon EveTransform::GetPerObjectData (EveTransform.cpp:49-77): fills the
    // EveBasicPerObjectData constant record. Trinity writes LOGICAL matrices by
    // name; the store (engine-supplied layout) transposes them on Set. Carbon's
    // worldInverse = Inverse(transposed world) == Transpose(Inverse(world)), so
    // it is just Set("worldInverse", Inverse(world)) - the store transposes.

    /**
     * Allocates an EveBasicPerObjectData record from the accumulator and fills it with the world, previous-world and inverse-world matrices, patching the first all-zero basis of a singular world matrix with a 0.1 diagonal before inverting, as Carbon does.
     * @returns {object} The allocated record, owned by the accumulator.
     */
    GetPerObjectData(accumulator) {
      const data = accumulator.Alloc("EveBasicPerObjectData");
      data.Set("world", this.worldTransform);
      data.Set("worldLast", this.#lastWorldTransform);
      if (!mat4.invert(INVERSE_PATCH_SCRATCH, this.worldTransform)) {
        // Carbon singular fixup (EveTransform.cpp:66-75): patch the first
        // all-zero basis of the LOGICAL world (its column [0,1,2]/[4,5,6]/
        // [8,9,10] equals Carbon's transposed-world row test on the shared
        // layout) with a 0.1 diagonal, then invert that.
        const patched = INVERSE_PATCH_SCRATCH;
        mat4.copy(patched, this.worldTransform);
        if (patched[0] === 0 && patched[1] === 0 && patched[2] === 0) patched[0] = 0.1;else if (patched[4] === 0 && patched[5] === 0 && patched[6] === 0) patched[5] = 0.1;else if (patched[8] === 0 && patched[9] === 0 && patched[10] === 0) patched[10] = 0.1;
        if (!mat4.invert(INVERSE_PATCH_SCRATCH, patched)) mat4.identity(INVERSE_PATCH_SCRATCH);
      }
      data.Set("worldInverse", INVERSE_PATCH_SCRATCH);
      return data;
    }

    /** Carbon declares the renderable batch contract on Tr2Transform
     * (Tr2Transform.cpp:250-276); the generated base stays data-only, so the
     * maintained renderable carries the behavior. */
    // Returns whether any batch was committed (JS addition; Carbon returns void).
    GetBatches(batches, batchType, perObjectData, _reason) {
      if (this.display && this.mesh) {
        return this.mesh.GetBatches(batches, this.mesh.GetAreas(batchType), perObjectData) === true;
      }
      return false;
    }

    /**
     * Reports whether the mesh has any transparent areas, which tells the renderer
     * to route this node through the sorted transparent pass.
     */
    HasTransparentBatches() {
      if (this.display && this.mesh) {
        return (this.mesh.GetAreas(TriBatchType.TRIBATCHTYPE_TRANSPARENT)?.length ?? 0) > 0;
      }
      return false;
    }

    // Distance from the view position to the world translation, scaled by the
    // authored multiplier (used to order transparent renderables back-to-front).

    /**
     * Returns the distance from the render context's view position to this node's
     * world translation, scaled by the authored sortValueMultiplier, used to order
     * transparent renderables back-to-front.
     */
    GetSortValue(renderContext = null) {
      const viewPosition = renderContext?.GetViewPosition?.();
      const x = (viewPosition?.[0] ?? 0) - this.worldTransform[12];
      const y = (viewPosition?.[1] ?? 0) - this.worldTransform[13];
      const z = (viewPosition?.[2] ?? 0) - this.worldTransform[14];
      return Math.hypot(x, y, z) * this.sortValueMultiplier;
    }

    /**
     * Writes the world-space bounding sphere, taken from the override bounds when they differ and otherwise from the mesh bounding box, and unions in the children's spheres when a query is passed.
     * @param {vec4} out Caller-owned sphere; left untouched when no source produced one.
     * @returns {boolean} Whether a sphere was written.
     */
    GetBoundingSphere(out = vec4.create(), query = 0) {
      let valid = false;
      if (!vec3.equals(this.overrideBoundsMin, this.overrideBoundsMax)) {
        sph3.fromBounds(_EveTransform.#localSphere, this.overrideBoundsMin, this.overrideBoundsMax);
        sph3.transformMat4(out, _EveTransform.#localSphere, this.worldTransform);
        valid = true;
      } else if (this.mesh?.GetBoundingBox?.(_EveTransform.#boundsMin, _EveTransform.#boundsMax)) {
        sph3.fromBounds(_EveTransform.#localSphere, _EveTransform.#boundsMin, _EveTransform.#boundsMax);
        sph3.transformMat4(out, _EveTransform.#localSphere, this.worldTransform);
        valid = true;
      }
      if (query) {
        for (const child of this.children) {
          if (child?.GetBoundingSphere?.(_EveTransform.#childSphere, query)) {
            if (valid) sph3.union(out, out, _EveTransform.#childSphere);else vec4.copy(out, _EveTransform.#childSphere);
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
    GetWorldPosition(out) {
      return out ? vec3.set(out, this.worldTransform[12], this.worldTransform[13], this.worldTransform[14]) : this.worldTransform.subarray(12, 15);
    }

    /**
     * Returns the node's local rotation quaternion; called without an out
     * parameter it returns the live field rather than a copy.
     */
    GetWorldRotation(out) {
      return out ? quat.copy(out, this.rotation) : this.rotation;
    }

    /** Returns the LOD level chosen by the last visibility pass. */
    GetLODLevel() {
      return this.lodLevel;
    }

    /** Turns rendering of this node and its subtree on or off. */
    SetDisplay(value) {
      this.display = !!value;
    }

    /** Starts playback on every curve set on this node. */
    PlayCurveSets() {
      for (const curveSet of this.curveSets) curveSet?.Play?.();
    }

    /**
     * Starts every curve set carrying the given name, playing a named time range
     * when one is supplied and otherwise resetting to the full range first.
     */
    PlayCurveSet(name, rangeName = "") {
      for (const curveSet of this.curveSets) {
        if ((curveSet?.GetName?.() ?? curveSet?.name) !== name) continue;
        if (rangeName) {
          curveSet.PlayTimeRange?.(rangeName);
        } else {
          curveSet.ResetTimeRange?.();
          curveSet.Play?.();
        }
      }
    }

    /** Stops every curve set carrying the given name. */
    StopCurveSet(name) {
      for (const curveSet of this.curveSets) if ((curveSet?.GetName?.() ?? curveSet?.name) === name) curveSet.Stop?.();
    }

    /**
     * Returns the longest curve duration across the curve sets carrying the given
     * name, or 0 when none match.
     */
    GetCurveSetDuration(name) {
      let duration = 0;
      for (const curveSet of this.curveSets) if ((curveSet?.GetName?.() ?? curveSet?.name) === name) duration = Math.max(duration, Number(curveSet.GetMaxCurveDuration?.() ?? 0));
      return duration;
    }

    /**
     * Returns the longest duration of a named time range across the curve sets
     * carrying the given name, or 0 when none match.
     */
    GetRangeDuration(name, rangeName) {
      let duration = 0;
      for (const curveSet of this.curveSets) if ((curveSet?.GetName?.() ?? curveSet?.name) === name) duration = Math.max(duration, Number(curveSet.GetRangeDuration?.(rangeName) ?? 0));
      return duration;
    }
  }];
  Tr2Lod = Tr2Lod;
  #identity = mat4.create();
  #zero = vec3.create();
  #sphere = vec4.create();
  #localSphere = vec4.create();
  #childSphere = vec4.create();
  #boundsMin = vec3.create();
  #boundsMax = vec3.create();
  constructor() {
    super(_EveTransform), _initClass();
  }
}();

export { _EveTransform as EveTransform };
//# sourceMappingURL=EveTransform.js.map
