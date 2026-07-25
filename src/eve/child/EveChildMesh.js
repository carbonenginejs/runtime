// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Children\EveChildMesh.h
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Children\EveChildMesh.cpp
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Children\EveChildMesh_Blue.cpp
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { sph3 } from "@carbonenginejs/runtime-utils/sph3";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { carbon, impl, io, schema, type } from "@carbonenginejs/runtime-utils/schema";
import { TriBatchType } from "@carbonenginejs/runtime-utils/graphics";
import { EveChildTransform, applyTransformModifiers } from "./EveChildTransform.js";
import { Origin } from "../../generated/eve/child/enums.js";
import { ReflectionMode } from "../../generated/eve/enums.js";
import { EveComponentType, ShouldReflect } from "../EveComponentTypes.js";
import { Tr2RenderReason } from "../../generated/trinityCore/enums.js";
import { Tr2Lod } from "../EveLODHelper.js";
import { Tr2PerObjectData } from "../../trinityCore/Tr2PerObjectData.js";

// Module scratch for the hot per-frame visibility/shadow paths (allocation
// rules: copy-into, never allocate per call; child updates run sequentially so
// the scratch is non-reentrant by construction).
const INVERSE_WORLD_SCRATCH = mat4.create();
const LOCAL_VIEW_SCRATCH = vec3.create();
const INSTANCE_SPHERE_SCRATCH = vec4.create();
const SHADOW_SPHERE_SCRATCH = vec4.create();
const BOX_CORNER_SCRATCH = vec3.create();
const BOX_QUERY_SCRATCH = { min: vec3.create(), max: vec3.create() };
const ZERO_VEC3 = vec3.create();


@type.define({ className: "EveChildMesh", family: "eve/child" })
export class EveChildMesh extends EveChildTransform
{
  #isMorphsBaked = false;

  #morphAnimationBuffer = [];

  #morphAnimationOffsets = {
    runtimeEvaluatedOffset: 0,
    runtimeEvaluatedCount: 0,
    bakedOffset: 0,
    bakedCount: 0,
    allCount: 0
  };

  // Carbon m_isVisible/m_instancesVisible/m_hasUpdated/m_activationStrength:
  // runtime-only frame state (never persisted; Carbon keeps them out of the
  // Blue surface too).
  #isVisible = false;

  #instancesVisible = false;

  #hasUpdated = false;

  #activationStrength = 1;

  // Carbon m_worldBoundingBox/m_worldBoundingSphere: world-space bounds
  // refreshed by UpdateAsyncronous; the sphere is invalid while radius <= 0.
  #worldBoundsMin = vec3.create();

  #worldBoundsMax = vec3.create();

  #worldBoundsValid = false;

  #worldBoundingSphere = vec4.create();

  @io.notify
  @io.persist
  @type.int32
  @schema.enum("ReflectionMode")
  reflectionMode = 3;

  @io.persist
  @type.list("IEveChildTransformModifier")
  transformModifiers = [];

  @io.read
  @type.mat4
  worldTransform = mat4.create();

  @io.notify
  @io.persist
  @type.boolean
  display = true;

  @io.notify
  @io.persist
  @type.boolean
  castShadow = false;

  @io.notify
  @io.persist
  @type.objectRef("Tr2MeshBase")
  mesh = null;

  @io.persist
  @type.string
  name = "";

  @io.persist
  @type.quat
  rotation = quat.create();

  @io.persist
  @type.vec3
  translation = vec3.create();

  @io.persist
  @type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  @io.persist
  @type.mat4
  localTransform = mat4.create();

  @io.persist
  @type.list("EveSpaceObjectDecal")
  decals = [];

  @io.persist
  @type.boolean
  staticTransform = false;

  @io.notify
  @io.persist
  @type.objectRef("Tr2GrannyAnimation")
  animationUpdater = null;

  @io.persist
  @type.list("IEveSpaceObjectAttachment")
  attachments = [];

  @io.persist
  @type.list("Tr2Light")
  lights = [];

  @io.persist
  @type.int32
  @schema.enum("Tr2Lod")
  lowestLodVisible = 0;

  @io.persist
  @type.float32
  minScreenSize = 0;

  @io.persist
  @type.float32
  sortValueOffset = 0;

  @io.persist
  @type.float32
  sortValueScale = 1;

  @io.read
  @type.float32
  currentScreenSize = -1;

  @io.read
  @type.float32
  currentInstanceScreenSize = -1;

  @io.persist
  @type.boolean
  useSRT = true;

  @io.persist
  @type.boolean
  updateAnimation = true;

  // SOF-authored placement/instance values; persisted so the values
  // interchange reproduces Carbon's hidden child placement state.
  @io.persist
  @type.int32
  @schema.enum("Origin")
  origin = 0;

  @io.rebuild("instanceBuffer")
  @io.persist
  @type.array("mat4")
  instanceTransforms = [];

  @io.persist
  @type.string
  sofDna = "";

  @io.persist
  @type.string
  sofParentHullName = "";

  @io.persist
  @type.string
  sofLocatorSetName = "";

  @io.persist
  @type.string
  sofLocatorIndex = "";

  @carbon.method
  @impl.adapted
  Initialize()
  {
    if (this.staticTransform)
    {
      this.RebuildLocalTransform();
    }
    return true;
  }

  @carbon.method
  @impl.implemented
  Setup(scale = null, rotation = null, translation = null, lowestLodVisible = null)
  {
    super.Setup(scale, rotation, translation, lowestLodVisible);
    if (lowestLodVisible !== null && lowestLodVisible !== undefined)
    {
      this.lowestLodVisible = Number(lowestLodVisible) | 0;
    }
    return this.localTransform;
  }

  @carbon.method
  @impl.implemented
  SetInstanceTransforms(instances)
  {
    const next = [];
    for (const transform of instances ?? [])
    {
      if (!transform || transform.length !== 16)
      {
        throw new TypeError("EveChildMesh instance transforms must contain 16 values");
      }
      next.push(mat4.clone(transform));
    }
    this.instanceTransforms = next;
    return this.instanceTransforms;
  }

  @carbon.method
  @impl.adapted
  GetInstanceTransforms()
  {
    return this.instanceTransforms;
  }

  @carbon.method
  @impl.implemented
  SetMesh(mesh)
  {
    this.mesh = mesh ?? null;
  }

  @carbon.method
  @impl.implemented
  SetOrigin(origin)
  {
    this.origin = Number(origin) | 0;
  }

  @carbon.method
  @impl.implemented
  SetScale(scale)
  {
    vec3.copy(this.scaling, scale);
  }

  @carbon.method
  @impl.implemented
  SetReflectionMode(mode)
  {
    this.reflectionMode = Number(mode) | 0;
  }

  @carbon.method
  @impl.implemented
  SetCastShadow(castShadow)
  {
    this.castShadow = !!castShadow;
  }

  @carbon.method
  @impl.implemented
  SetMinScreenSize(minScreenSize)
  {
    this.minScreenSize = Number(minScreenSize);
  }

  /** Carbon EveChildMesh::GetLocalToWorldTransform (cpp:1047-1050); the
   * optional out follows the EveChildInstancedMeshes copy-out shape. */
  @carbon.method
  @impl.implemented
  GetLocalToWorldTransform(out = null)
  {
    if (out)
    {
      return mat4.copy(out, this.worldTransform);
    }
    return this.worldTransform;
  }

  @carbon.method
  @impl.implemented
  GetName()
  {
    return this.name;
  }

  @carbon.method
  @impl.implemented
  SetName(name)
  {
    this.name = String(name ?? "");
  }

  @carbon.method
  @impl.implemented
  AddTransformModifier(modifier)
  {
    this.transformModifiers.push(modifier);
  }

  @carbon.method
  @impl.implemented
  AddDecal(decal)
  {
    this.decals.push(decal);
  }

  @carbon.method
  @impl.implemented
  AddAttachment(attachment)
  {
    this.attachments.push(attachment);
  }

  @carbon.method
  @impl.implemented
  ClearAttachments()
  {
    this.attachments.length = 0;
  }

  @carbon.method
  @impl.implemented
  AddLight(light)
  {
    this.lights.push(light);
  }

  @carbon.method
  @impl.implemented
  ClearLights()
  {
    this.lights.length = 0;
  }

  @carbon.method
  @impl.implemented
  IsAlwaysOn()
  {
    return true;
  }

  @carbon.method
  @impl.implemented
  SetShaderOption(name, value)
  {
    this.mesh?.SetShaderOption?.(name, value);
    for (const decal of this.decals)
    {
      decal?.SetShaderOption?.(name, value);
    }
    for (const attachment of this.attachments)
    {
      attachment?.SetShaderOption?.(name, value);
    }
  }

  @carbon.method
  @impl.adapted
  GetMorphTargetNames()
  {
    return this.mesh?.GetMorphTargetNames?.() ?? [];
  }

  @carbon.method
  @impl.adapted
  SetMorphTargetWeight(name, weight)
  {
    this.mesh?.SetMorphTargetWeight?.(name, weight);
  }

  @carbon.method
  @impl.adapted
  GetMorphTargetWeight(name)
  {
    return this.mesh?.GetMorphTargetWeight?.(name) ?? 0;
  }

  /** Rebuilds the source-backed indexed morph buffer from manual and animation weights. */
  @impl.adapted
  UpdateMorphAnimationBuffer()
  {
    const names = this.mesh?.GetMorphTargetNames?.();

    this.#morphAnimationOffsets = {
      runtimeEvaluatedOffset: 0,
      runtimeEvaluatedCount: 0,
      bakedOffset: 0,
      bakedCount: 0,
      allCount: 0
    };

    if (!Array.isArray(names))
    {
      this.#morphAnimationBuffer = [];
      return 0;
    }

    const manual = this.mesh?.GetMorphAnimations?.();
    const records = names.map((name, index) => ({
      index,
      weight: ReadMorphWeight(
        ReadNamedMorph(manual, name) ?? this.mesh?.GetMorphTargetWeight?.(name) ?? 0,
        name,
        "mesh"
      ),
      baked: !!(this.mesh?.IsBakedMorph?.(index)
        ?? this.mesh?.GetBakedMorphTarget?.(name)
        ?? false)
    }));

    if (this.animationUpdater?.IsInitialized?.())
    {
      const animated = this.animationUpdater.GetMorphAnimations?.();

      for (const record of records)
      {
        const name = names[record.index];
        const value = ReadNamedMorph(animated, name);

        if (value !== undefined)
        {
          record.weight = ReadMorphWeight(value, name, "animation");
        }
      }
    }

    const runtime = [];
    const baked = [];
    const inactive = [];

    for (const record of records)
    {
      if (record.weight >= 0.001)
      {
        (record.baked ? baked : runtime).push(record);
      }
      else
      {
        inactive.push(record);
      }
    }

    this.#morphAnimationBuffer = [ ...runtime, ...baked, ...inactive ];
    this.#morphAnimationOffsets.runtimeEvaluatedCount = runtime.length;
    this.#morphAnimationOffsets.bakedOffset = runtime.length;
    this.#morphAnimationOffsets.bakedCount = baked.length;
    this.#morphAnimationOffsets.allCount = runtime.length + baked.length;
    return this.#morphAnimationOffsets.allCount;
  }

  /** Returns detached active indexed morph records for the native filter. */
  @impl.adapted
  GetMorphTargets(filter = 2)
  {
    const normalized = NormalizeMorphFilter(filter);
    let offset = 0;
    let count = 0;

    if (normalized === 2)
    {
      count = this.#morphAnimationOffsets.allCount;
    }
    else if (normalized === 0)
    {
      offset = this.#isMorphsBaked
        ? this.#morphAnimationOffsets.runtimeEvaluatedOffset
        : 0;
      count = this.#isMorphsBaked
        ? this.#morphAnimationOffsets.runtimeEvaluatedCount
        : this.#morphAnimationOffsets.allCount;
    }
    else
    {
      offset = this.#morphAnimationOffsets.bakedOffset;
      count = this.#morphAnimationOffsets.bakedCount;
    }

    return this.#morphAnimationBuffer.slice(offset, offset + count)
      .map(value => ({ index: value.index, weight: value.weight }));
  }

  @carbon.method
  @impl.adapted
  GetSofSourceLocator()
  {
    return null;
  }

  /**
   * Sync-side frame update (Carbon EveChildMesh::UpdateSyncronous,
   * cpp:1002-1045). Carbon's body is entirely audio-geometry registration
   * (cpp:1004-1010, 1044 - engine/audio-owned, omitted) plus animationUpdater
   * re-binding and PrePhysicsAnimation stepping (cpp:1011-1042 - skipped: the
   * JS animation seam is absent, there is no Tr2GrannyAnimation runtime), so
   * the port is a documented frame-contract no-op.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Audio-geometry registration is engine-owned and the animationUpdater branches await the JS animation seam; nothing else remains in Carbon's body.")
  UpdateSyncronous(_updateContext, _params)
  {
  }

  /**
   * Per-frame async update (Carbon EveChildMesh::UpdateAsyncronous,
   * cpp:903-1000): rebuild the world transform from the parent, fold the
   * transform modifiers over it, store the activation strength, refresh the
   * attachment lights, the morph buffer, and the world bounds. The GPU ring
   * buffer advance/per-object-data invalidation (cpp:905-909), audio geometry
   * (cpp:920-930), parent VS/PS struct refresh (cpp:932-960), and the skinned
   * GetBounds overload are not modelled, hence @impl.adapted.
   * @param {Object} updateContext - frame context (EveUpdateContext), threaded to modifiers
   * @param {EveChildUpdateParams} params - localToWorldTransform + boneCount/bones
   * @returns {Float32Array} worldTransform
   */
  @carbon.method
  @carbon.contextual(["camera"])
  @impl.adapted
  UpdateAsyncronous(updateContext, params)
  {
    const parentTransform = params?.localToWorldTransform;

    if (parentTransform && parentTransform.length === 16)
    {
      this.UpdateTransform(parentTransform);
    }

    applyTransformModifiers(
      this,
      updateContext,
      params?.boneCount ?? 0,
      params?.bones ?? null
    );

    this.#activationStrength = Number(params?.activationStrength ?? 1);

    // Carbon (cpp:962-970): attachments refresh their lights from the updated
    // world transform. Bones come from GetBoneTransforms (animationUpdater) -
    // null until the JS animation seam exists.
    for (const attachment of this.attachments)
    {
      attachment?.UpdateLights?.(this.worldTransform, null, 0, this.#activationStrength, 0);
    }

    this.UpdateMorphAnimationBuffer();

    // Carbon (cpp:974-997): world AABB from the mesh bounds, world sphere
    // enclosing it. The skinned GetBounds overload (animation transforms +
    // morph targets, cpp:977-982) awaits the animation seam; Tr2MeshBase::
    // GetBounds itself is a recorded gap (CARBON-PARITY-REVIEW-2026-07-23.md
    // section 2.3), hence the duck call (Tr2InstancedMesh implements it).
    this.#worldBoundsValid = false;
    const bounds = this.mesh?.GetBounds?.();

    if (bounds?.min && bounds?.max)
    {
      this.#worldBoundsMin[0] = this.#worldBoundsMin[1] = this.#worldBoundsMin[2] = Infinity;
      this.#worldBoundsMax[0] = this.#worldBoundsMax[1] = this.#worldBoundsMax[2] = -Infinity;
      for (let index = 0; index < 8; index++)
      {
        vec3.set(
          BOX_CORNER_SCRATCH,
          index & 1 ? bounds.max[0] : bounds.min[0],
          index & 2 ? bounds.max[1] : bounds.min[1],
          index & 4 ? bounds.max[2] : bounds.min[2]
        );
        vec3.transformMat4(BOX_CORNER_SCRATCH, BOX_CORNER_SCRATCH, this.worldTransform);
        vec3.min(this.#worldBoundsMin, this.#worldBoundsMin, BOX_CORNER_SCRATCH);
        vec3.max(this.#worldBoundsMax, this.#worldBoundsMax, BOX_CORNER_SCRATCH);
      }
      this.#worldBoundsValid = true;
      sph3.fromBounds(this.#worldBoundingSphere, this.#worldBoundsMin, this.#worldBoundsMax);
    }
    else
    {
      sph3.set(this.#worldBoundingSphere, 0, 0, 0, 0);
    }

    this.#hasUpdated = true;
    return this.worldTransform;
  }

  /**
   * Frame visibility + LOD state (Carbon EveChildMesh::UpdateVisibility,
   * cpp:366-463): screen size via the frustum, invLodFactor scaling, the
   * minScreenSize/lowestLodVisible gates, the per-instance visibility gate,
   * and the attachment/decal visibility fan-out. Carbon recomputes the local
   * mesh bounds here (cpp:380-394) but consumes only the world sphere/box
   * computed in UpdateAsyncronous, so the dead recompute is skipped. The
   * raytracing branch (cpp:450-462) is engine-owned and omitted.
   * @param {Object} updateContext - frame context (frustum + invLodFactor ducks)
   * @param {Float32Array} _parentTransform
   * @param {Number} parentLod - parent Tr2Lod level
   * @returns {Boolean} isVisible
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Bone-fed decal/attachment bounds await the animation seam and the raytracing refresh is engine-owned; the LOD/screen-size math is ported.")
  UpdateVisibility(updateContext, _parentTransform = null, parentLod = Tr2Lod.TR2_LOD_HIGH)
  {
    this.#isVisible = false;
    this.currentScreenSize = -1;
    this.#instancesVisible = false;
    this.currentInstanceScreenSize = -1;

    if (!this.#hasUpdated)
    {
      return false;
    }

    const frustum = updateContext?.GetFrustum?.() ?? updateContext?.frustum;
    const invLodFactor = Number(updateContext?.GetInvLodFactor?.() ?? updateContext?.invLodFactor) || 1;

    if (this.mesh)
    {
      this.currentScreenSize = Number(frustum?.GetPixelSizeAccross?.(this.#worldBoundingSphere) ?? Infinity) || 0;

      // Cached Tr2InstancedMesh downcast in Carbon (m_instancedMesh); the JS
      // port duck-types the instanced surface instead.
      const instanced = typeof this.mesh.GetInstanceBoundsClosestToPoint === "function";
      let instanceBounds = null;

      if (instanced)
      {
        // Carbon: TransformCoord(frustum.m_viewPos, Inverse(m_worldTransform))
        // - a single-matrix point transform (no composition; TransformCoord
        // maps to vec3.transformMat4 unchanged per the math conventions).
        if (!mat4.invert(INVERSE_WORLD_SCRATCH, this.worldTransform))
        {
          mat4.identity(INVERSE_WORLD_SCRATCH);
        }
        const viewPos = frustum?.m_viewPos ?? frustum?.viewPos ?? frustum?.GetViewPosition?.() ?? ZERO_VEC3;
        vec3.transformMat4(LOCAL_VIEW_SCRATCH, viewPos, INVERSE_WORLD_SCRATCH);
        instanceBounds = this.mesh.GetInstanceBoundsClosestToPoint(LOCAL_VIEW_SCRATCH);
      }

      if (instanceBounds)
      {
        // Carbon: instanceBounds.Transform(m_worldTransform) - single-matrix
        // sphere transform, ported via sph3.transformMat4.
        sph3.set(
          INSTANCE_SPHERE_SCRATCH,
          instanceBounds.center[0],
          instanceBounds.center[1],
          instanceBounds.center[2],
          instanceBounds.radius
        );
        sph3.transformMat4(INSTANCE_SPHERE_SCRATCH, INSTANCE_SPHERE_SCRATCH, this.worldTransform);
        this.currentInstanceScreenSize = Number(frustum?.GetPixelSizeAccross?.(INSTANCE_SPHERE_SCRATCH) ?? Infinity) || 0;
        this.mesh.UseWithScreenSize?.(this.currentInstanceScreenSize, INSTANCE_SPHERE_SCRATCH[3]);
      }
      else
      {
        // Carbon uses std::numeric_limits<float>::max(); Infinity keeps the
        // instance gate permanently open the same way.
        this.currentInstanceScreenSize = Infinity;
        this.mesh.UseWithScreenSize?.(this.currentScreenSize, this.#worldBoundingSphere[3]);
      }

      this.currentScreenSize *= invLodFactor;
      this.currentInstanceScreenSize *= invLodFactor;

      BOX_QUERY_SCRATCH.min = this.#worldBoundsMin;
      BOX_QUERY_SCRATCH.max = this.#worldBoundsMax;
      const boxVisible = this.#worldBoundsValid &&
        (frustum?.IsBoxVisible ? !!frustum.IsBoxVisible(BOX_QUERY_SCRATCH) : true);

      if (boxVisible)
      {
        this.#isVisible = parentLod >= this.lowestLodVisible && this.currentScreenSize >= this.minScreenSize;
        this.#instancesVisible = this.#isVisible &&
          this.currentInstanceScreenSize >= EveChildMesh.#instanceScreenSizeThreshold;
      }
    }

    // Carbon (cpp:427-435): attachments always refresh visibility; bones from
    // GetBoneTransforms await the animation seam.
    for (const attachment of this.attachments)
    {
      attachment?.UpdateVisibility?.(updateContext, this.worldTransform, null, 0);
    }

    if (this.#isVisible)
    {
      for (const decal of this.decals)
      {
        // Carbon (cpp:441-446) feeds animated bone matrices to the decal first
        // - skipped until the JS animation seam exists. Carbon passes
        // &m_parentData (per-object shading struct, GPU seam); the owning
        // child stands in as the duck-typed parent.
        decal?.UpdateVisibility?.(updateContext, this);
      }
    }

    return this.#isVisible;
  }

  /**
   * Collects this child (and its decals) as renderables (Carbon
   * EveChildMesh::GetRenderables, cpp:571-616): instanced meshes contribute
   * only while the per-instance gate passed; decals ride along through their
   * duck-typed renderable collectors (mesh cache is engine-owned, passed null
   * as in EveSpaceObject2.GetRenderables).
   */
  @carbon.method
  @impl.adapted
  @impl.reason("The decal mesh cache is engine-owned (null placeholder); collection structure is ported.")
  GetRenderables(out = [])
  {
    if (!this.#isVisible)
    {
      return out;
    }

    const instanced = typeof this.mesh?.GetInstanceBoundsClosestToPoint === "function";

    if (instanced)
    {
      if (this.#instancesVisible)
      {
        out.push(this);
        if (this.decals.length && this.mesh.GetGeometryResource?.())
        {
          for (const decal of this.decals)
          {
            decal?.GetInstancedRenderables?.(out, null, this.mesh, this.currentInstanceScreenSize);
          }
        }
      }
    }
    else
    {
      out.push(this);
      const geometryResource = this.mesh?.GetGeometryResource?.();
      if (this.decals.length && geometryResource)
      {
        for (const decal of this.decals)
        {
          decal?.GetRenderables?.(out, null, geometryResource, this.currentScreenSize);
        }
      }
    }

    return out;
  }

  /** Carbon EveChildMesh::GetBoundingSphere (cpp:618-627): the realized world
   * sphere, valid only after an update produced bounds (radius > 0). */
  @carbon.method
  @impl.implemented
  GetBoundingSphere(out = vec4.create(), _query = 0)
  {
    if (this.#worldBoundingSphere[3] > 0)
    {
      vec4.copy(out, this.#worldBoundingSphere);
      return true;
    }
    return false;
  }

  /** Carbon EveChildMesh::HasTransparentBatches (cpp:629-637). */
  @carbon.method
  @impl.implemented
  HasTransparentBatches()
  {
    if (this.display && this.mesh)
    {
      return (this.mesh.GetAreas?.(TriBatchType.TRIBATCHTYPE_TRANSPARENT)?.length ?? 0) > 0;
    }
    return false;
  }

  /** Carbon EveChildMesh::IsVisible (cpp:639-650): sphere-in-frustum plus the
   * estimated pixel size against the context visibility threshold. */
  @carbon.method
  @impl.adapted
  @impl.reason("Frustum and threshold arrive via the duck-typed update context instead of renderer state.")
  IsVisible(updateContext)
  {
    if (this.#worldBoundingSphere[3] > 0)
    {
      const frustum = updateContext?.GetFrustum?.() ?? updateContext?.frustum;
      if (frustum?.IsSphereVisible?.(this.#worldBoundingSphere) !== false)
      {
        const method = frustum?.GetPixelSizeAccrossEst ?? frustum?.GetPixelSizeAccross;
        const size = Number(typeof method === "function" ? method.call(frustum, this.#worldBoundingSphere) : 0) || 0;
        const threshold = Number(updateContext?.GetVisibilityThreshold?.() ?? updateContext?.visibilityThreshold) || 0;
        return size >= threshold;
      }
    }
    return false;
  }

  /** Carbon EveChildMesh::GetBatches (cpp:652-670): the mesh delegates per
   * batch type and activated attachments recurse. Carbon also passes
   * min(currentInstanceScreenSize, currentScreenSize) for LOD selection and a
   * reverse-winding flag from Determinant(m_worldTransform) < 0; both are
   * resolved by the engine at batch realization in the GPU-free port.
   * Returns whether any batch was committed (JS addition; Carbon returns
   * void). */
  @carbon.method
  @impl.adapted
  @impl.reason("Screen-size LOD selection and winding reversal are engine-resolved at realization; delegation structure is ported.")
  GetBatches(batches, batchType, perObjectData, reason = Tr2RenderReason.TR2RENDERREASON_NORMAL)
  {
    if (!this.display)
    {
      return false;
    }

    let committed = false;

    if (this.mesh)
    {
      committed = this.mesh.GetBatches(batches, this.mesh.GetAreas(batchType), perObjectData) === true;
    }

    if (this.#activationStrength !== 0)
    {
      for (const attachment of this.attachments)
      {
        committed = attachment?.GetBatches?.(batches, batchType, perObjectData, reason) === true || committed;
      }
    }

    return committed;
  }

  /** Carbon EveChildMesh::GetShadowBatches (cpp:672-681): the OPAQUE areas
   * only, gated on display/mesh/hasUpdated. shadowPixelSize and the
   * reverse-winding flag are engine-resolved at realization. Returns whether
   * any batch was committed (JS addition; Carbon returns void). */
  @carbon.method
  @impl.adapted
  @impl.reason("shadowPixelSize LOD selection and winding reversal are engine-resolved at realization; delegation structure is ported.")
  GetShadowBatches(batches, perObjectData, _shadowPixelSize)
  {
    if (this.display && this.mesh && this.#hasUpdated)
    {
      return this.mesh.GetBatches(batches, this.mesh.GetAreas(TriBatchType.TRIBATCHTYPE_OPAQUE), perObjectData) === true;
    }
    return false;
  }

  /** Carbon EveChildMesh::GetSortValue (cpp:787-792): view distance scaled by
   * sortValueScale plus sortValueOffset. */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon reads the Tr2Renderer view-position global; the relocated camera state arrives via the threaded render context.")
  GetSortValue(renderContext = null)
  {
    const viewPosition = renderContext?.GetViewPosition?.();
    const x = (viewPosition?.[0] ?? 0) - this.worldTransform[12];
    const y = (viewPosition?.[1] ?? 0) - this.worldTransform[13];
    const z = (viewPosition?.[2] ?? 0) - this.worldTransform[14];
    return Math.hypot(x, y, z) * this.sortValueScale + this.sortValueOffset;
  }

  /** Carbon EveChildMesh::GetShadowPerObjectData (cpp:794-797) forwards the
   * shadow pass to the same per-object record. */
  @carbon.method
  @impl.implemented
  GetShadowPerObjectData(accumulator = null)
  {
    return this.GetPerObjectData(accumulator);
  }

  /** Carbon EveChildMesh::GetPerObjectData (cpp:799-843) uploads bone/morph
   * ring-buffer offsets and allocates Tr2PerObjectDataWithPersistentBuffers;
   * those fills are GPU ring-buffer state, so the GPU-free record carries the
   * live object reference for the engine serializer to pull current values at
   * realization (mirrors EveSpaceObject2.GetPerObjectData). */
  @carbon.method
  @impl.adapted
  @impl.reason("Persistent VS/PS device buffers and bone/morph ring offsets are engine-owned; the record carries the object reference the engine serializer consumes.")
  GetPerObjectData(accumulator = null)
  {
    const data = typeof accumulator?.Allocate === "function"
      ? accumulator.Allocate(Tr2PerObjectData)
      : new Tr2PerObjectData();
    data.object = this;
    return data;
  }

  /**
   * Carbon's two IsCastingShadow overloads, dispatched on the second argument:
   * a position vector (length >= 3) selects the sphere-overlap overload
   * (cpp:338-364); anything else is the shadow-frustum overload (cpp:295-336),
   * whose Carbon out-param float& sizeInShadow becomes the optional trailing
   * length-1 array (out-params last).
   * @param {Object} cameraFrustum
   * @param {Object|Float32Array} shadowFrustumOrPosition
   * @param {Number} renderReasonOrRadius
   * @param {Array|Number} sizeInShadowOutOrRenderReason
   * @returns {Boolean}
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Overload dispatch by argument shape and a length-1 out array replace C++ overloading and the float& out-param; the shadow math is ported.")
  IsCastingShadow(cameraFrustum, shadowFrustumOrPosition, renderReasonOrRadius, sizeInShadowOutOrRenderReason = null)
  {
    if (!this.display || !this.castShadow || !this.#hasUpdated)
    {
      return false;
    }

    const positionOverload = typeof shadowFrustumOrPosition?.length === "number" &&
      shadowFrustumOrPosition.length >= 3;
    const renderReason = positionOverload
      ? Number(sizeInShadowOutOrRenderReason ?? Tr2RenderReason.TR2RENDERREASON_NORMAL)
      : Number(renderReasonOrRadius ?? Tr2RenderReason.TR2RENDERREASON_NORMAL);

    if (renderReason === Tr2RenderReason.TR2RENDERREASON_REFLECTION &&
      !ShouldReflect(this.reflectionMode))
    {
      return false;
    }

    if (positionOverload)
    {
      // Carbon (cpp:338-364): squared distance between the world sphere and
      // the query sphere against their combined radius.
      if (!this.GetBoundingSphere(SHADOW_SPHERE_SCRATCH))
      {
        return false;
      }
      const position = shadowFrustumOrPosition;
      const radius = Number(renderReasonOrRadius) || 0;
      const dx = SHADOW_SPHERE_SCRATCH[0] - position[0];
      const dy = SHADOW_SPHERE_SCRATCH[1] - position[1];
      const dz = SHADOW_SPHERE_SCRATCH[2] - position[2];
      const combined = radius + SHADOW_SPHERE_SCRATCH[3];
      return dx * dx + dy * dy + dz * dz - combined * combined < 0;
    }

    // Carbon (cpp:295-336): shadow-frustum visibility, then the size in the
    // shadow map from the instance sphere nearest the shadow eye (falling back
    // to the whole world sphere).
    const shadowFrustum = shadowFrustumOrPosition;
    const sizeOut = sizeInShadowOutOrRenderReason;
    if (sizeOut)
    {
      sizeOut[0] = 0;
    }

    if (this.#worldBoundingSphere[3] <= 0)
    {
      return false;
    }

    let sizeInShadow = 0;
    if (shadowFrustum?.IsVisible?.(cameraFrustum, this.#worldBoundingSphere))
    {
      let sphere = this.#worldBoundingSphere;
      if (typeof this.mesh?.GetInstanceBoundsClosestToPoint === "function")
      {
        // Carbon: TransformCoord(shadowFrustum.GetEyePos(), Inverse(
        // m_worldTransform)) - single-matrix point transform (no composition).
        if (!mat4.invert(INVERSE_WORLD_SCRATCH, this.worldTransform))
        {
          mat4.identity(INVERSE_WORLD_SCRATCH);
        }
        const eyePos = shadowFrustum?.GetEyePos?.() ?? ZERO_VEC3;
        vec3.transformMat4(LOCAL_VIEW_SCRATCH, eyePos, INVERSE_WORLD_SCRATCH);
        const instanceBounds = this.mesh.GetInstanceBoundsClosestToPoint(LOCAL_VIEW_SCRATCH);
        if (instanceBounds)
        {
          // Carbon: instanceBounds.Transform(m_worldTransform) - single-matrix
          // sphere transform.
          sph3.set(
            INSTANCE_SPHERE_SCRATCH,
            instanceBounds.center[0],
            instanceBounds.center[1],
            instanceBounds.center[2],
            instanceBounds.radius
          );
          sph3.transformMat4(INSTANCE_SPHERE_SCRATCH, INSTANCE_SPHERE_SCRATCH, this.worldTransform);
          sphere = INSTANCE_SPHERE_SCRATCH;
        }
      }
      sizeInShadow = Number(shadowFrustum?.GetSizeInShadow?.(sphere)) || 0;
    }

    if (sizeOut)
    {
      sizeOut[0] = sizeInShadow;
    }
    return sizeInShadow > 5;
  }

  /** Carbon EveChildMesh::ChangeLOD (cpp:1052-1054) is an intentional no-op. */
  @carbon.method
  @impl.implemented
  ChangeLOD(_lod)
  {
  }

  /** Carbon EveChildMesh::RegisterComponents (cpp:239-269): LightOwner when
   * lights are authored; ReflectionRenderable (ShouldReflect) and ShadowCaster
   * (castShadow) only when a mesh is present; then forwards the attachments.
   * Gate m_display. "MeshMorph" stays OUT-OF-BAND: Carbon registers it at
   * baked-morph need inside BakeMorphs (cpp:1404-1409), not here - the JS
   * BakeMorphs stub is the site that would register it when the GPU morph
   * bake is ported. */
  @carbon.method
  @impl.implemented
  RegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry && this.display)
    {
      if (this.lights.length)
      {
        registry.RegisterComponent(EveComponentType.LightOwner, this);
      }

      if (this.mesh !== null)
      {
        if (ShouldReflect(this.reflectionMode))
        {
          registry.RegisterComponent(EveComponentType.ReflectionRenderable, this);
        }
        if (this.castShadow)
        {
          registry.RegisterComponent(EveComponentType.ShadowCaster, this);
        }
      }

      for (const attachment of this.attachments)
      {
        attachment?.Register?.(registry);
      }
    }
  }

  /** Carbon EveChildMesh::UnRegisterComponents (cpp:275-290): forwards the
   * attachments only (own components were already removed by
   * EveEntity::UnRegister, EveEntity.cpp:90); no display re-check.
   * UnregisterAudioGeometry (cpp:277) is audio-engine-owned and unported. */
  @carbon.method
  @impl.implemented
  UnRegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      for (const attachment of this.attachments)
      {
        attachment?.UnRegister?.(registry);
      }
    }
  }

  /** Carbon EveChildMesh::GetLights (cpp:1638-1652): BOTH gates (empty
   * lights and display, cpp:1640 - unlike EveSpaceObject2's display-only),
   * then per light AddLight(manager, worldTransform, 1, bones, boneCount)
   * FOLLOWED by SetBrightnessMultiplier(m_activationStrength) - the
   * one-frame-lag order is contract (the submission uses the multiplier
   * stamped on the previous pass; the first pass uses the Tr2Light default
   * 1). */
  @carbon.method
  @impl.adapted
  @impl.reason("GetBoneTransforms (cpp:1285-1307) rides the granny animation updater - awaits the JS animation seam; (null, 0) is passed per the file's UpdateAsyncronous convention.")
  GetLights(lightManager)
  {
    if (!this.lights.length || !this.display)
    {
      return;
    }
    for (const light of this.lights)
    {
      light?.AddLight?.(lightManager, this.worldTransform, 1, null, 0);
      light?.SetBrightnessMultiplier?.(this.#activationStrength);
    }
  }

  /** Carbon EveChildMesh::GetID returns GetRawRoot(), i.e. this object. */
  @carbon.method
  @impl.implemented
  GetID(_area = 0)
  {
    return this;
  }

  /** Carbon EveChildMesh::GetPickingBatches (cpp:862-889) maps Tr2PickTypes
   * flags onto batch-type collections with transparent/additive special
   * casing; the pick-type flag enum is not yet ported, so the surface fails
   * loudly rather than mis-collecting. */
  @carbon.method
  @impl.notImplemented
  GetPickingBatches(..._args)
  {
    throw new Error("EveChildMesh.GetPickingBatches is not implemented in CarbonEngineJS.");
  }

  /** Carbon EveChildMesh::InitializeAnimation (cpp:217-232) wires the
   * animationUpdater to the mesh geometry resource; awaits the JS animation
   * seam (no Tr2GrannyAnimation runtime). */
  @carbon.method
  @impl.notImplemented
  InitializeAnimation(..._args)
  {
    throw new Error("EveChildMesh.InitializeAnimation is not implemented in CarbonEngineJS.");
  }

  /** Carbon BakeMorphs runs the merge-morphs GPU compute pass; GPU-owned. */
  @carbon.method
  @impl.notImplemented
  BakeMorphs(..._args)
  {
    throw new Error("EveChildMesh.BakeMorphs is not implemented in CarbonEngineJS.");
  }

  /** Carbon UnbakeMorphs releases the baked-morph GPU allocation; GPU-owned. */
  @carbon.method
  @impl.notImplemented
  UnbakeMorphs(..._args)
  {
    throw new Error("EveChildMesh.UnbakeMorphs is not implemented in CarbonEngineJS.");
  }

  /** Carbon IsMeshBaked reads the baked-morph GPU allocation state; GPU-owned. */
  @carbon.method
  @impl.notImplemented
  IsMeshBaked(..._args)
  {
    throw new Error("EveChildMesh.IsMeshBaked is not implemented in CarbonEngineJS.");
  }

  // Carbon s_instanceScreenSizeThreshold (EveChildMesh.cpp:22).
  static #instanceScreenSizeThreshold = 1;

  static Origin = Origin;

  static ReflectionMode = ReflectionMode;

  static Tr2Lod = Tr2Lod;

}

function ReadNamedMorph(values, name)
{
  if (values instanceof Map)
  {
    return values.has(name) ? values.get(name) : undefined;
  }

  if (values && typeof values === "object" && Object.hasOwn(values, name))
  {
    return values[name];
  }

  return undefined;
}

function ReadMorphWeight(value, name, source)
{
  const weight = Number(value && typeof value === "object" ? value.weight : value);

  if (!Number.isFinite(weight))
  {
    throw new TypeError(`EveChildMesh ${source} morph target "${name}" weight must be finite`);
  }

  return weight;
}

function NormalizeMorphFilter(value)
{
  if (typeof value === "string")
  {
    const normalized = value.toLowerCase();
    if (normalized === "runtime" || normalized === "runtime_evaluated") return 0;
    if (normalized === "baked") return 1;
    if (normalized === "all") return 2;
  }

  const filter = Number(value);
  if (filter === 0 || filter === 1 || filter === 2) return filter;
  throw new TypeError(`Unsupported EveChildMesh morph target filter "${value}"`);
}
