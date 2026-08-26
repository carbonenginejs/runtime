// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildParticleSystem.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
import { EveChildTransform, applyTransformModifiers } from "./EveChildTransform.js";
import { mat4 } from "#math/mat4";
import { sph3 } from "#math/sph3";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { ReflectionMode, TriBatchType } from "#consts/graphics";
import { Tr2Lod } from "../EveLODHelper.js";
import { EveComponentType, ShouldReflect } from "../EveComponentTypes.js";
import { withITr2Renderable } from "../../core/ITr2Renderable.js";
import { Tr2RenderReason } from "../../generated/trinityCore/enums.js";
import { ITr2GenericEmitterUpdateArguments } from "../../particle/ITr2GenericEmitter.js";

/** A child that hosts particle systems and emitters, driving their transforms, LOD-based particle budgets, and per-frame visibility and render submission. */
@type.define({ className: "EveChildParticleSystem", family: "eve/child" })
export class EveChildParticleSystem extends withITr2Renderable(EveChildTransform)
{

  /** m_reflectionMode (EntityComponents::ReflectionMode - enum ReflectionMode) [READWRITE, PERSIST, NOTIFY, ENUM] */
  @io.notify
  @io.persist
  @type.int32
  @type.enum("ReflectionMode")
  reflectionMode = 3;

  /** m_particleEmitters (PITr2GenericEmitterVector) [READ, PERSIST] */
  @io.persist
  @type.list("ITr2GenericEmitter")
  particleEmitters = [];

  /** m_particleSystems (PTr2ParticleSystemVector) [READ, PERSIST] */
  @io.persist
  @type.list("Tr2ParticleSystem")
  particleSystems = [];

  /** m_transformModifiers (PIEveChildTransformModifierVector) [READ, PERSIST] */
  @io.persist
  @type.list("IEveChildTransformModifier")
  transformModifiers = [];

  /** m_display (bool) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.boolean
  display = true;

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_mesh (Tr2InstancedMeshPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("Tr2InstancedMesh")
  mesh = null;

  /** m_lodClampLow (uint32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.uint32
  lodClampLow = 5;

  /** m_lodSphereRadius (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  lodSphereRadius = 0;

  /** m_useDynamicLod (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  useDynamicLod = false;

  /** m_lodFactorLow (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  lodFactorLow = 0.125;

  /** m_lodFactorMedium (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  lodFactorMedium = 0.25;

  /** m_minScreenSize (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  minScreenSize = 0;

  /** m_currentScreenSize (float) [READ] */
  @io.read
  @type.float32
  currentScreenSize = -1;

  /** m_boundingSphere (Vector4) - world-space mesh bound, radius -1 until built. */
  #boundingSphere = vec4.fromValues(0, 0, 0, -1);

  /** m_lodSphere (Vector4) - world-space LOD probe, radius -1 while lodSphereRadius is unset. */
  #lodSphere = vec4.fromValues(0, 0, 0, -1);

  /** m_worldTransformLast (Matrix) - previous frame's world transform. */
  #worldTransformLast = mat4.create();

  /** m_isVisible (bool) - result of the last UpdateVisibility pass. */
  #isVisible = true;

  /** m_hasUpdated (bool) - until an update ran, the object cannot be rendered. */
  #hasUpdated = false;

  /** Rebuilds static local transforms (EveChildParticleSystem.cpp:43-50). */
  @carbon.method
  @impl.implemented
  Initialize()
  {
    if (this.staticTransform)
    {
      this.RebuildLocalTransform();
    }
    return true;
  }

  /**
   * Carbon re-registers the renderable component when m_reflectionMode or
   * m_display change (EveChildParticleSystem.cpp:71-78).
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon re-registers on m_reflectionMode/m_display Var edits; JS forwards every OnModified to the EveEntity ReRegister lifecycle.")
  OnModified(_value)
  {
    this.ReRegister?.();
    return true;
  }

  @carbon.method
  @impl.implemented
  /**
   * The particle system child's name.
   */
  GetName()
  {
    return this.name;
  }

  @carbon.method
  @impl.implemented
  /**
   * Sets the particle system child's name, coercing the value to a string.
   */
  SetName(name)
  {
    this.name = String(name ?? "");
  }

  /** Forwards to the base transform setup (EveChildParticleSystem.cpp:95-98). */
  @carbon.method
  @impl.implemented
  Setup(scale = null, rotation = null, translation = null, lowestLodVisible = null)
  {
    return super.Setup(scale, rotation, translation, lowestLodVisible);
  }

  /**
   * Frustum/screen-size visibility against the mesh bound and the LOD probe
   * sphere, then per-system view-dependent updates
   * (EveChildParticleSystem.cpp:100-121).
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Frustum and LOD factor are read from the explicit update context; a missing frustum is treated as visible.")
  UpdateVisibility(updateContext, _parentTransform, _parentLod)
  {
    const frustum = updateContext?.GetFrustum?.() ?? updateContext?.frustum;
    this.#isVisible = this.display && this.#hasUpdated && frustum?.IsSphereVisible?.(this.#boundingSphere) !== false;
    if (this.#isVisible)
    {
      this.currentScreenSize = Number(frustum?.GetPixelSizeAccrossEst?.(this.#lodSphere) ?? Infinity);
      const lodFactor = Number(updateContext?.GetLodFactor?.() ?? updateContext?.lodFactor) || 1;
      this.#isVisible = this.#isVisible && this.currentScreenSize >= this.minScreenSize * lodFactor;
    }
    else
    {
      this.currentScreenSize = -1;
    }
    if (this.#isVisible)
    {
      for (const system of this.particleSystems)
      {
        system?.UpdateViewDependentData?.(frustum, this.worldTransform);
      }
    }
  }

  /**
   * Stateless visibility probe used by the entity layer
   * (EveChildParticleSystem.cpp:123-127).
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Frustum and LOD factor are read from the explicit update context; a missing frustum is treated as visible.")
  IsVisible(updateContext)
  {
    const frustum = updateContext?.GetFrustum?.() ?? updateContext?.frustum;
    const lodFactor = Number(updateContext?.GetLodFactor?.() ?? updateContext?.lodFactor) || 1;
    return frustum?.IsSphereVisible?.(this.#boundingSphere) !== false &&
      Number(frustum?.GetPixelSizeAccrossEst?.(this.#lodSphere) ?? Infinity) >= this.minScreenSize * lodFactor;
  }

  /**
   * Sorts particles and publishes this child as a renderable when visible
   * (EveChildParticleSystem.cpp:130-143).
   */
  @carbon.method
  @impl.implemented
  GetRenderables(renderables = [])
  {
    if (!this.#isVisible)
    {
      return renderables;
    }
    for (const system of this.particleSystems)
    {
      system?.SortParticles?.();
    }
    renderables.push(this);
    return renderables;
  }

  /** Copies the world-space mesh bound when built (EveChildParticleSystem.cpp:145-153). */
  @carbon.method
  @impl.implemented
  GetBoundingSphere(out = vec4.create(), _query = 0)
  {
    if (this.#boundingSphere[3] === -1)
    {
      return false;
    }
    vec4.copy(out, this.#boundingSphere);
    return true;
  }

  @carbon.method
  @impl.implemented
  /**
   * Whether the assigned mesh has transparent areas, when the child is displayed and a mesh is set.
   */
  HasTransparentBatches()
  {
    if (this.display && this.mesh)
    {
      return (this.mesh.GetAreas?.(TriBatchType.TRIBATCHTYPE_TRANSPARENT)?.length ?? 0) > 0;
    }
    return false;
  }

  /**
   * Delegates the selected mesh areas at Carbon's maximum screen size, reversing
   * winding for reflection renders (EveChildParticleSystem.cpp:155-161).
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Returns whether JavaScript mesh delegation committed a batch; Carbon's void method exposes no result.")
  GetBatches(batches, batchType, perObjectData, reason = Tr2RenderReason.TR2RENDERREASON_NORMAL)
  {
    if (!this.display || !this.mesh)
    {
      return false;
    }

    const areas = this.mesh.GetAreas(batchType);
    if (!areas.length)
    {
      return false;
    }

    return this.mesh.GetBatches(
      batches,
      areas,
      perObjectData,
      Infinity,
      reason === Tr2RenderReason.TR2RENDERREASON_REFLECTION
    ) === true;
  }

  /** Distance from the view position to the world translation (EveChildParticleSystem.cpp:173-178). */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon reads the Tr2Renderer view-position global; the relocated camera state arrives via the threaded render context.")
  GetSortValue(renderContext = null)
  {
    const viewPosition = renderContext?.GetViewPosition?.();
    const x = (viewPosition?.[0] ?? 0) - this.worldTransform[12];
    const y = (viewPosition?.[1] ?? 0) - this.worldTransform[13];
    const z = (viewPosition?.[2] ?? 0) - this.worldTransform[14];
    return Math.hypot(x, y, z);
  }

  /** Carbon method GetPerObjectData (EveChildParticleSystem.cpp:180-195). */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon's transient EveBasicPerObjectData fill (cpp:182-194): world/worldLast transposed, worldInverse = Inverse(world). Trinity Allocs the record from the accumulator's store and Sets logical values by name (the store transposes per the engine layout).")
  GetPerObjectData(accumulator)
  {
    const data = accumulator.Alloc("EveBasicPerObjectData");

    data.SetAndTranspose("world", this.worldTransform);
    data.SetAndTranspose("worldLast", this.#worldTransformLast);

    const inverse = mat4.create();
    if (!mat4.invert(inverse, this.worldTransform)) mat4.identity(inverse);
    data.SetAndTranspose("worldInverse", inverse);

    return data;
  }

  /** Carbon's synchronous pass is empty (EveChildParticleSystem.cpp:197-199). */
  @carbon.method
  @impl.noop
  UpdateSyncronous(_updateContext, _params)
  {
  }

  /**
   * Per-frame async update (EveChildParticleSystem.cpp:201-280): rebuild the
   * world transform, fold the transform modifiers, rebuild the bounding and
   * LOD spheres, then drive the particle systems and emitters.
   */
  @carbon.method
  @carbon.contextual(["camera"])
  @impl.adapted
  @impl.reason("Renderer-global frustum state is read from the update context, and emitter/system updates use the backend-neutral argument record.")
  UpdateAsyncronous(updateContext, params)
  {
    mat4.copy(this.#worldTransformLast, this.worldTransform);
    const parentTransform = params?.localToWorldTransform;
    if (parentTransform && parentTransform.length === 16)
    {
      this.UpdateTransform(parentTransform);
    }
    applyTransformModifiers(this, updateContext, params?.boneCount ?? 0, params?.bones ?? null);

    if (this.mesh?.GetBoundingBox?.(EveChildParticleSystem.#boundsMin, EveChildParticleSystem.#boundsMax))
    {
      sph3.fromBounds(EveChildParticleSystem.#localSphere, EveChildParticleSystem.#boundsMin, EveChildParticleSystem.#boundsMax);
      sph3.transformMat4(this.#boundingSphere, EveChildParticleSystem.#localSphere, this.worldTransform);
    }

    if (this.lodSphereRadius > 0)
    {
      vec4.set(this.#lodSphere, 0, 0, 0, this.lodSphereRadius);
      sph3.transformMat4(this.#lodSphere, this.#lodSphere, this.worldTransform);
    }
    else
    {
      this.#lodSphere[3] = -1;
    }

    for (const system of this.particleSystems)
    {
      system.UpdateTransform(this.worldTransform);
    }

    const time = Number(updateContext?.GetTime?.() ?? updateContext?.currentTime ?? 0);
    const gpuParticleSystem = updateContext?.GetGpuParticleSystem?.() ?? updateContext?.gpuParticleSystem ?? null;
    const originShift = updateContext?.GetOriginShift?.() ?? updateContext?.originShift ?? EveChildParticleSystem.#zero;

    if (this.particleEmitters.length)
    {
      let emitCountFactor = 1;
      if (!(params?.isVisible ?? true) || !this.display)
      {
        emitCountFactor = 0;
      }
      else if (this.minScreenSize > 0 && this.lodSphereRadius > 0 && this.reflectionMode === EveChildParticleSystem.ReflectionMode.REFLECT_NEVER)
      {
        // Carbon derives a scratch frustum from the Tr2Renderer view globals
        // here (EveChildParticleSystem.cpp:246-254); the relocated camera
        // state is the context frustum.
        const frustum = updateContext?.GetFrustum?.() ?? updateContext?.frustum;
        const size = Number(frustum?.GetPixelSizeAccrossEst?.(this.#lodSphere) ?? Infinity);
        const lodFactor = Number(updateContext?.GetLodFactor?.() ?? updateContext?.lodFactor) || 1;
        if (size < this.minScreenSize * lodFactor)
        {
          emitCountFactor = 0;
        }
      }
      const args = EveChildParticleSystem.#emitterArgs;
      args.time = time;
      args.system = gpuParticleSystem;
      mat4.copy(args.parentTransform, this.worldTransform);
      vec3.copy(args.originShift, originShift);
      args.emitCountFactor = emitCountFactor;
      for (const emitter of this.particleEmitters)
      {
        emitter.Update(args);
      }
    }

    if (this.particleSystems.length)
    {
      // Carbon passes IdentityMatrix() for the systems' own update
      // (EveChildParticleSystem.cpp:267-278).
      const args = EveChildParticleSystem.#systemArgs;
      args.time = time;
      args.system = gpuParticleSystem;
      mat4.copy(args.parentTransform, EveChildParticleSystem.#identity);
      vec3.copy(args.originShift, originShift);
      args.emitCountFactor = 1;
      for (const system of this.particleSystems)
      {
        system.Update(args);
      }
    }

    this.#hasUpdated = true;
  }

  /** Returns the local-to-world matrix (EveChildParticleSystem.cpp:286-289). */
  @carbon.method
  @impl.adapted
  @impl.reason("CarbonEngineJS uses an out-last signature and returns the matrix when no output is supplied.")
  GetLocalToWorldTransform(out = null)
  {
    if (out)
    {
      return mat4.copy(out, this.worldTransform);
    }
    return this.worldTransform;
  }

  /**
   * Clamps each system's particle budget when the parent's LOD changed
   * (EveChildParticleSystem.cpp:295-318).
   */
  @carbon.method
  @impl.implemented
  ChangeLOD(lod)
  {
    if (!this.useDynamicLod)
    {
      return;
    }
    for (const system of this.particleSystems)
    {
      const original = Number(system.GetOriginalMaxParticles()) >>> 0;
      let particleCount = original;
      if (lod === Tr2Lod.TR2_LOD_LOW)
      {
        particleCount = Math.min(this.lodClampLow, Math.trunc(original * this.lodFactorLow));
      }
      else if (lod === Tr2Lod.TR2_LOD_MEDIUM)
      {
        particleCount = Math.trunc(original * this.lodFactorMedium);
      }
      system.SetMaxParticleCount(particleCount);
    }
  }

  /** Carbon method AddTransformModifier (EveChildParticleSystem.cpp:344-347). */
  @carbon.method
  @impl.implemented
  AddTransformModifier(modifier)
  {
    this.transformModifiers.push(modifier);
  }

  /** Carbon EveChildParticleSystem::RegisterComponents (cpp:58-68):
   * ReflectionRenderable leaf self-registration behind ShouldReflect (Carbon
   * redundantly re-checks m_display inside the outer display gate). */
  @carbon.method
  @impl.implemented
  RegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry && this.display)
    {
      if (ShouldReflect(this.reflectionMode) && this.display)
      {
        registry.RegisterComponent(EveComponentType.ReflectionRenderable, this);
      }
    }
  }

  static ReflectionMode = ReflectionMode;

  static Tr2Lod = Tr2Lod;

  static #boundsMin = vec3.create();

  static #boundsMax = vec3.create();

  static #localSphere = vec4.create();

  static #zero = vec3.create();

  static #identity = mat4.create();

  // Reusable emitter/system argument records (backend-neutral mirror of
  // ITr2GenericEmitter::UpdateArguments); child updates run sequentially, so
  // the shared records are non-reentrant by design.
  static #emitterArgs = new ITr2GenericEmitterUpdateArguments();

  static #systemArgs = new ITr2GenericEmitterUpdateArguments();

}
