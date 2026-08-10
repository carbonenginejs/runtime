import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveChildTransform as _EveChildTransform, applyTransformModifiers } from './EveChildTransform.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { sph3 } from '@carbonenginejs/runtime-utils/sph3';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { TriBatchType } from '@carbonenginejs/runtime-utils/graphics';
import { Tr2Lod } from '@carbonenginejs/runtime-utils/const/trinity';
import { ShouldReflect, EveComponentType } from '../EveComponentTypes.js';

let _initProto, _initClass, _init_reflectionMode, _init_extra_reflectionMode, _init_particleEmitters, _init_extra_particleEmitters, _init_particleSystems, _init_extra_particleSystems, _init_transformModifiers, _init_extra_transformModifiers, _init_display, _init_extra_display, _init_name, _init_extra_name, _init_mesh, _init_extra_mesh, _init_lodClampLow, _init_extra_lodClampLow, _init_lodSphereRadius, _init_extra_lodSphereRadius, _init_useDynamicLod, _init_extra_useDynamicLod, _init_lodFactorLow, _init_extra_lodFactorLow, _init_lodFactorMedium, _init_extra_lodFactorMedium, _init_minScreenSize, _init_extra_minScreenSize, _init_currentScreenSize, _init_extra_currentScreenSize;

/** A child that hosts particle systems and emitters, driving their transforms, LOD-based particle budgets, and per-frame visibility and render submission. */
let _EveChildParticleSyst;
new class extends _identity {
  static [class EveChildParticleSystem extends _EveChildTransform {
    static {
      ({
        e: [_init_reflectionMode, _init_extra_reflectionMode, _init_particleEmitters, _init_extra_particleEmitters, _init_particleSystems, _init_extra_particleSystems, _init_transformModifiers, _init_extra_transformModifiers, _init_display, _init_extra_display, _init_name, _init_extra_name, _init_mesh, _init_extra_mesh, _init_lodClampLow, _init_extra_lodClampLow, _init_lodSphereRadius, _init_extra_lodSphereRadius, _init_useDynamicLod, _init_extra_useDynamicLod, _init_lodFactorLow, _init_extra_lodFactorLow, _init_lodFactorMedium, _init_extra_lodFactorMedium, _init_minScreenSize, _init_extra_minScreenSize, _init_currentScreenSize, _init_extra_currentScreenSize, _initProto],
        c: [_EveChildParticleSyst, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveChildParticleSystem",
        family: "eve/child"
      })], [[[io, io.notify, io, io.persist, type, type.int32, void 0, type.enum("ReflectionMode")], 16, "reflectionMode"], [[io, io.persist, void 0, type.list("ITr2GenericEmitter")], 16, "particleEmitters"], [[io, io.persist, void 0, type.list("Tr2ParticleSystem")], 16, "particleSystems"], [[io, io.persist, void 0, type.list("IEveChildTransformModifier")], 16, "transformModifiers"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "display"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, void 0, type.model("Tr2InstancedMesh")], 16, "mesh"], [[io, io.persist, type, type.uint32], 16, "lodClampLow"], [[io, io.persist, type, type.float32], 16, "lodSphereRadius"], [[io, io.persist, type, type.boolean], 16, "useDynamicLod"], [[io, io.persist, type, type.float32], 16, "lodFactorLow"], [[io, io.persist, type, type.float32], 16, "lodFactorMedium"], [[io, io.persist, type, type.float32], 16, "minScreenSize"], [[io, io.read, type, type.float32], 16, "currentScreenSize"], [[carbon, carbon.method, impl, impl.implemented], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon re-registers on m_reflectionMode/m_display Var edits; JS forwards every OnModified to the EveEntity ReRegister lifecycle.")], 18, "OnModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetName"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetName"], [[carbon, carbon.method, impl, impl.implemented], 18, "Setup"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Frustum and LOD factor are read from the explicit update context; a missing frustum is treated as visible.")], 18, "UpdateVisibility"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Frustum and LOD factor are read from the explicit update context; a missing frustum is treated as visible.")], 18, "IsVisible"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetRenderables"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBoundingSphere"], [[carbon, carbon.method, impl, impl.implemented], 18, "HasTransparentBatches"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "GetBatches"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon reads the Tr2Renderer view-position global; the relocated camera state arrives via the threaded render context.")], 18, "GetSortValue"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon's transient EveBasicPerObjectData fill (cpp:182-194): world/worldLast transposed, worldInverse = Inverse(world). Trinity Allocs the record from the accumulator's store and Sets logical values by name (the store transposes per the engine layout).")], 18, "GetPerObjectData"], [[carbon, carbon.method, impl, impl.noop], 18, "UpdateSyncronous"], [[carbon, carbon.method, void 0, carbon.contextual(["camera"]), impl, impl.adapted, void 0, impl.reason("Renderer-global frustum state is read from the update context, and emitter/system updates use the backend-neutral argument record.")], 18, "UpdateAsyncronous"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("CarbonEngineJS uses an out-last signature and returns the matrix when no output is supplied.")], 18, "GetLocalToWorldTransform"], [[carbon, carbon.method, impl, impl.implemented], 18, "ChangeLOD"], [[carbon, carbon.method, impl, impl.implemented], 18, "AddTransformModifier"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterComponents"]], 0, void 0, _EveChildTransform));
    }
    /** m_reflectionMode (EntityComponents::ReflectionMode - enum ReflectionMode) [READWRITE, PERSIST, NOTIFY, ENUM] */
    reflectionMode = (_initProto(this), _init_reflectionMode(this, 3));

    /** m_particleEmitters (PITr2GenericEmitterVector) [READ, PERSIST] */
    particleEmitters = (_init_extra_reflectionMode(this), _init_particleEmitters(this, []));

    /** m_particleSystems (PTr2ParticleSystemVector) [READ, PERSIST] */
    particleSystems = (_init_extra_particleEmitters(this), _init_particleSystems(this, []));

    /** m_transformModifiers (PIEveChildTransformModifierVector) [READ, PERSIST] */
    transformModifiers = (_init_extra_particleSystems(this), _init_transformModifiers(this, []));

    /** m_display (bool) [READWRITE, PERSIST, NOTIFY] */
    display = (_init_extra_transformModifiers(this), _init_display(this, true));

    /** m_name (BlueSharedString) [READWRITE, PERSIST] */
    name = (_init_extra_display(this), _init_name(this, ""));

    /** m_mesh (Tr2InstancedMeshPtr) [READWRITE, PERSIST] */
    mesh = (_init_extra_name(this), _init_mesh(this, null));

    /** m_lodClampLow (uint32_t) [READWRITE, PERSIST] */
    lodClampLow = (_init_extra_mesh(this), _init_lodClampLow(this, 5));

    /** m_lodSphereRadius (float) [READWRITE, PERSIST] */
    lodSphereRadius = (_init_extra_lodClampLow(this), _init_lodSphereRadius(this, 0));

    /** m_useDynamicLod (bool) [READWRITE, PERSIST] */
    useDynamicLod = (_init_extra_lodSphereRadius(this), _init_useDynamicLod(this, false));

    /** m_lodFactorLow (float) [READWRITE, PERSIST] */
    lodFactorLow = (_init_extra_useDynamicLod(this), _init_lodFactorLow(this, 0.125));

    /** m_lodFactorMedium (float) [READWRITE, PERSIST] */
    lodFactorMedium = (_init_extra_lodFactorLow(this), _init_lodFactorMedium(this, 0.25));

    /** m_minScreenSize (float) [READWRITE, PERSIST] */
    minScreenSize = (_init_extra_lodFactorMedium(this), _init_minScreenSize(this, 0));

    /** m_currentScreenSize (float) [READ] */
    currentScreenSize = (_init_extra_minScreenSize(this), _init_currentScreenSize(this, -1));

    /** m_boundingSphere (Vector4) - world-space mesh bound, radius -1 until built. */
    #boundingSphere = (_init_extra_currentScreenSize(this), vec4.fromValues(0, 0, 0, -1));

    /** m_lodSphere (Vector4) - world-space LOD probe, radius -1 while lodSphereRadius is unset. */
    #lodSphere = vec4.fromValues(0, 0, 0, -1);

    /** m_worldTransformLast (Matrix) - previous frame's world transform. */
    #worldTransformLast = mat4.create();

    /** m_isVisible (bool) - result of the last UpdateVisibility pass. */
    #isVisible = true;

    /** m_hasUpdated (bool) - until an update ran, the object cannot be rendered. */
    #hasUpdated = false;

    /** Rebuilds static local transforms (EveChildParticleSystem.cpp:43-50). */
    Initialize() {
      if (this.staticTransform) {
        this.RebuildLocalTransform();
      }
      return true;
    }

    /**
     * Carbon re-registers the renderable component when m_reflectionMode or
     * m_display change (EveChildParticleSystem.cpp:71-78).
     */
    OnModified(_value) {
      this.ReRegister?.();
      return true;
    }
    /**
     * The particle system child's name.
     */
    GetName() {
      return this.name;
    }
    /**
     * Sets the particle system child's name, coercing the value to a string.
     */
    SetName(name) {
      this.name = String(name ?? "");
    }

    /** Forwards to the base transform setup (EveChildParticleSystem.cpp:95-98). */
    Setup(scale = null, rotation = null, translation = null, lowestLodVisible = null) {
      return super.Setup(scale, rotation, translation, lowestLodVisible);
    }

    /**
     * Frustum/screen-size visibility against the mesh bound and the LOD probe
     * sphere, then per-system view-dependent updates
     * (EveChildParticleSystem.cpp:100-121).
     */
    UpdateVisibility(updateContext, _parentTransform, _parentLod) {
      const frustum = updateContext?.GetFrustum?.() ?? updateContext?.frustum;
      this.#isVisible = this.display && this.#hasUpdated && frustum?.IsSphereVisible?.(this.#boundingSphere) !== false;
      if (this.#isVisible) {
        this.currentScreenSize = Number(frustum?.GetPixelSizeAccrossEst?.(this.#lodSphere) ?? Infinity);
        const lodFactor = Number(updateContext?.GetLodFactor?.() ?? updateContext?.lodFactor) || 1;
        this.#isVisible = this.#isVisible && this.currentScreenSize >= this.minScreenSize * lodFactor;
      } else {
        this.currentScreenSize = -1;
      }
      if (this.#isVisible) {
        for (const system of this.particleSystems) {
          system?.UpdateViewDependentData?.(frustum, this.worldTransform);
        }
      }
    }

    /**
     * Stateless visibility probe used by the entity layer
     * (EveChildParticleSystem.cpp:123-127).
     */
    IsVisible(updateContext) {
      const frustum = updateContext?.GetFrustum?.() ?? updateContext?.frustum;
      const lodFactor = Number(updateContext?.GetLodFactor?.() ?? updateContext?.lodFactor) || 1;
      return frustum?.IsSphereVisible?.(this.#boundingSphere) !== false && Number(frustum?.GetPixelSizeAccrossEst?.(this.#lodSphere) ?? Infinity) >= this.minScreenSize * lodFactor;
    }

    /**
     * Sorts particles and publishes this child as a renderable when visible
     * (EveChildParticleSystem.cpp:130-143).
     */
    GetRenderables(renderables = []) {
      if (!this.#isVisible) {
        return renderables;
      }
      for (const system of this.particleSystems) {
        system?.SortParticles?.();
      }
      renderables.push(this);
      return renderables;
    }

    /** Copies the world-space mesh bound when built (EveChildParticleSystem.cpp:145-153). */
    GetBoundingSphere(out = vec4.create(), _query = 0) {
      if (this.#boundingSphere[3] === -1) {
        return false;
      }
      vec4.copy(out, this.#boundingSphere);
      return true;
    }
    /**
     * Whether the assigned mesh has transparent areas, when the child is displayed and a mesh is set.
     */
    HasTransparentBatches() {
      if (this.display && this.mesh) {
        return (this.mesh.GetAreas?.(TriBatchType.TRIBATCHTYPE_TRANSPARENT)?.length ?? 0) > 0;
      }
      return false;
    }

    /** Carbon method GetBatches (EveChildParticleSystem.cpp:165-171). */
    GetBatches(..._args) {
      throw new Error("EveChildParticleSystem.GetBatches is not implemented in CarbonEngineJS.");
    }

    /** Distance from the view position to the world translation (EveChildParticleSystem.cpp:173-178). */
    GetSortValue(renderContext = null) {
      const viewPosition = renderContext?.GetViewPosition?.();
      const x = (viewPosition?.[0] ?? 0) - this.worldTransform[12];
      const y = (viewPosition?.[1] ?? 0) - this.worldTransform[13];
      const z = (viewPosition?.[2] ?? 0) - this.worldTransform[14];
      return Math.hypot(x, y, z);
    }

    /** Carbon method GetPerObjectData (EveChildParticleSystem.cpp:180-195). */
    GetPerObjectData(accumulator) {
      const data = accumulator.Alloc("EveBasicPerObjectData");
      data.SetAndTranspose("world", this.worldTransform);
      data.SetAndTranspose("worldLast", this.#worldTransformLast);
      const inverse = mat4.create();
      if (!mat4.invert(inverse, this.worldTransform)) mat4.identity(inverse);
      data.SetAndTranspose("worldInverse", inverse);
      return data;
    }

    /** Carbon's synchronous pass is empty (EveChildParticleSystem.cpp:197-199). */
    UpdateSyncronous(_updateContext, _params) {}

    /**
     * Per-frame async update (EveChildParticleSystem.cpp:201-280): rebuild the
     * world transform, fold the transform modifiers, rebuild the bounding and
     * LOD spheres, then drive the particle systems and emitters.
     */
    UpdateAsyncronous(updateContext, params) {
      mat4.copy(this.#worldTransformLast, this.worldTransform);
      const parentTransform = params?.localToWorldTransform;
      if (parentTransform && parentTransform.length === 16) {
        this.UpdateTransform(parentTransform);
      }
      applyTransformModifiers(this, updateContext, params?.boneCount ?? 0, params?.bones ?? null);
      if (this.mesh?.GetBoundingBox?.(_EveChildParticleSyst.#boundsMin, _EveChildParticleSyst.#boundsMax)) {
        sph3.fromBounds(_EveChildParticleSyst.#localSphere, _EveChildParticleSyst.#boundsMin, _EveChildParticleSyst.#boundsMax);
        sph3.transformMat4(this.#boundingSphere, _EveChildParticleSyst.#localSphere, this.worldTransform);
      }
      if (this.lodSphereRadius > 0) {
        vec4.set(this.#lodSphere, 0, 0, 0, this.lodSphereRadius);
        sph3.transformMat4(this.#lodSphere, this.#lodSphere, this.worldTransform);
      } else {
        this.#lodSphere[3] = -1;
      }
      for (const system of this.particleSystems) {
        system?.UpdateTransform?.(this.worldTransform);
      }
      const time = Number(updateContext?.GetTime?.() ?? updateContext?.currentTime ?? 0);
      const gpuParticleSystem = updateContext?.GetGpuParticleSystem?.() ?? updateContext?.gpuParticleSystem ?? null;
      const originShift = updateContext?.GetOriginShift?.() ?? updateContext?.originShift ?? _EveChildParticleSyst.#zero;
      if (this.particleEmitters.length) {
        let emitCountFactor = 1;
        if (!(params?.isVisible ?? true) || !this.display) {
          emitCountFactor = 0;
        } else if (this.minScreenSize > 0 && this.lodSphereRadius > 0 && this.reflectionMode === _EveChildParticleSyst.ReflectionMode.REFLECT_NEVER) {
          // Carbon derives a scratch frustum from the Tr2Renderer view globals
          // here (EveChildParticleSystem.cpp:246-254); the relocated camera
          // state is the context frustum.
          const frustum = updateContext?.GetFrustum?.() ?? updateContext?.frustum;
          const size = Number(frustum?.GetPixelSizeAccrossEst?.(this.#lodSphere) ?? Infinity);
          const lodFactor = Number(updateContext?.GetLodFactor?.() ?? updateContext?.lodFactor) || 1;
          if (size < this.minScreenSize * lodFactor) {
            emitCountFactor = 0;
          }
        }
        const args = _EveChildParticleSyst.#emitterArgs;
        args.time = time;
        args.gpuParticleSystem = gpuParticleSystem;
        args.transform = this.worldTransform;
        args.originShift = originShift;
        args.emitCountFactor = emitCountFactor;
        args.context = updateContext;
        for (const emitter of this.particleEmitters) {
          emitter?.Update?.(args);
        }
      }
      if (this.particleSystems.length) {
        // Carbon passes IdentityMatrix() for the systems' own update
        // (EveChildParticleSystem.cpp:267-278).
        const args = _EveChildParticleSyst.#systemArgs;
        args.time = time;
        args.gpuParticleSystem = gpuParticleSystem;
        args.transform = _EveChildParticleSyst.#identity;
        args.originShift = originShift;
        args.emitCountFactor = 1;
        args.context = updateContext;
        for (const system of this.particleSystems) {
          system?.Update?.(args);
        }
      }
      this.#hasUpdated = true;
    }

    /** Returns the local-to-world matrix (EveChildParticleSystem.cpp:286-289). */
    GetLocalToWorldTransform(out = null) {
      if (out) {
        return mat4.copy(out, this.worldTransform);
      }
      return this.worldTransform;
    }

    /**
     * Clamps each system's particle budget when the parent's LOD changed
     * (EveChildParticleSystem.cpp:295-318).
     */
    ChangeLOD(lod) {
      if (!this.useDynamicLod) {
        return;
      }
      for (const system of this.particleSystems) {
        const original = Number(system?.GetOriginalMaxParticles?.() ?? 0) >>> 0;
        let particleCount = original;
        if (lod === Tr2Lod.TR2_LOD_LOW) {
          particleCount = Math.min(this.lodClampLow, Math.trunc(original * this.lodFactorLow));
        } else if (lod === Tr2Lod.TR2_LOD_MEDIUM) {
          particleCount = Math.trunc(original * this.lodFactorMedium);
        }
        system?.SetMaxParticleCount?.(particleCount);
      }
    }

    /** Carbon method AddTransformModifier (EveChildParticleSystem.cpp:344-347). */
    AddTransformModifier(modifier) {
      this.transformModifiers.push(modifier);
    }

    /** Carbon EveChildParticleSystem::RegisterComponents (cpp:58-68):
     * ReflectionRenderable leaf self-registration behind ShouldReflect (Carbon
     * redundantly re-checks m_display inside the outer display gate). */
    RegisterComponents() {
      const registry = this.GetComponentRegistry();
      if (registry && this.display) {
        if (ShouldReflect(this.reflectionMode) && this.display) {
          registry.RegisterComponent(EveComponentType.ReflectionRenderable, this);
        }
      }
    }

    // Reusable emitter/system argument records (backend-neutral mirror of
    // ITr2GenericEmitter::UpdateArguments); child updates run sequentially, so
    // the shared records are non-reentrant by design.
  }];
  ReflectionMode = Object.freeze({
    REFLECT_HIGH: 0,
    REFLECT_MEDIUM_AND_HIGH: 1,
    REFLECT_LOW_MEDIUM_HIGH: 2,
    REFLECT_NEVER: 3
  });
  Tr2Lod = Tr2Lod;
  #boundsMin = vec3.create();
  #boundsMax = vec3.create();
  #localSphere = vec4.create();
  #zero = vec3.create();
  #identity = mat4.create();
  #emitterArgs = {
    time: 0,
    gpuParticleSystem: null,
    transform: null,
    originShift: null,
    emitCountFactor: 1,
    context: null
  };
  #systemArgs = {
    time: 0,
    gpuParticleSystem: null,
    transform: null,
    originShift: null,
    emitCountFactor: 1,
    context: null
  };
  constructor() {
    super(_EveChildParticleSyst), _initClass();
  }
}();

export { _EveChildParticleSyst as EveChildParticleSystem };
//# sourceMappingURL=EveChildParticleSystem.js.map
