// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Children\EveChildInstancedMeshes.h
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Children\EveChildInstancedMeshes.cpp
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Children\EveChildInstancedMeshes_Blue.cpp
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { EveEntity } from "../EveEntity.js";
import { EveComponentType, ShouldReflect } from "../EveComponentTypes.js";

/** Carbon EveInstancedMeshManager::InstanceFlags (EveInstancedMeshManager.h:
 * 13-26, cpp:998-1048): a uint32 bitfield - bit (1 << batchType) per present
 * batch type, CASTS_SHADOW = 1 << 30, RENDER_IN_REFLECTION = 1 << 31. */
export const INSTANCE_FLAG_CASTS_SHADOW = 0x40000000;
export const INSTANCE_FLAG_RENDER_IN_REFLECTION = 0x80000000;

const POSITION_SCRATCH = vec3.create();


/**
 * One shader area of an instanced mesh: the effect, its batch type, the area
 * range within the mesh, its cached effect hash and the mesh-group handle it is
 * registered under.
 */
@type.define({ className: "EveChildInstancedMeshArea", family: "eve/child" })
export class EveChildInstancedMeshArea extends CjsModel
{
  @io.rebuild("instanceBuffer")
  @io.persist
  @type.objectRef("Tr2Effect")
  effect = null;

  @io.rebuild("instanceBuffer")
  @io.persist
  @type.uint32
  batchType = 0;

  @io.rebuild("instanceBuffer")
  @io.persist
  @type.uint32
  areaIndex = 0;

  @io.rebuild("instanceBuffer")
  @io.persist
  @type.uint32
  areaCount = 1;

  @io.read
  @type.float32
  effectHash = 0;

  /** Carbon MeshArea::meshGroupHandle (EveChildInstancedMeshes.h:72) - the
   * manager registration handle; runtime state, not persisted. Truthy handles
   * carry .owner for the removal routing (EveInstancedMeshManager.h:41-72). */
  meshGroupHandle = null;
}


/**
 * A single placement of an instanced mesh: its transform and the index of its
 * cull sphere in the owning mesh's instance sphere list.
 */
@type.define({ className: "EveChildInstancedMeshInstance", family: "eve/child" })
export class EveChildInstancedMeshInstance extends CjsModel
{
  @io.rebuild("instanceBuffer")
  @io.persist
  @type.mat4
  transform = mat4.create();

  @io.rebuild("instanceBuffer")
  @io.persist
  @type.uint32
  sphereIndex = 0;
}


/**
 * One geometry-and-areas record inside an EveChildInstancedMeshes child, holding
 * its instance placements, per-instance world cull spheres, instance flags and
 * manager registration handles.
 */
@type.define({ className: "EveChildInstancedMesh", family: "eve/child" })
export class EveChildInstancedMesh extends CjsModel
{
  @io.persist
  @type.string
  geometryPath = "";

  @io.persist
  @type.boolean
  castsShadow = false;

  @io.persist
  @type.int32
  reflectionMode = 3;

  @io.persist
  @type.uint32
  meshIndex = 0;

  @io.persist
  @type.list("EveChildInstancedMeshArea")
  areas = [];

  @io.persist
  @type.list("EveChildInstancedMeshInstance")
  instances = [];

  @io.persist
  @type.string
  sofHullName = "";

  @io.persist
  @type.string
  sofLocatorSetName = "";

  @io.persist
  @type.boolean
  display = true;

  /** Carbon Mesh::sphereHandle (h:110) - manager registration handle;
   * runtime state, not persisted. */
  sphereHandle = null;

  /** Carbon Mesh::worldBoundingSphere - stamped by UpdateAsyncronous
   * (cpp:270); the TriFrustum sphere-duck shape. */
  worldBoundingSphere = { center: vec3.create(), radius: 0 };

  /** Carbon Mesh::instanceSpheres - per-instance world cull spheres, stamped
   * by UpdateAsyncronous (cpp:259-269). */
  instanceSpheres = [];

  /** Carbon Mesh::flags (InstanceFlags uint32) - batch-type bits stamped at
   * AddMesh (cpp:422-425), CASTS_SHADOW at AddMesh (cpp:418-421),
   * RENDER_IN_REFLECTION refreshed each async pass (cpp:251). */
  flags = 0;

  #geometry = null;

  /**
   * Returns the geometry resource backing this mesh, or null while none has been
   * assigned; the mesh does not register with the manager until it is present
   * and good.
   */
  GetGeometryResource()
  {
    return this.#geometry;
  }

  /**
   * Assigns the geometry resource this mesh renders from; a nullish value clears
   * it. Runtime state, deliberately not persisted.
   */
  SetGeometryResource(resource)
  {
    this.#geometry = resource ?? null;
  }
}


/**
 * Space-object child that hands batches of instanced meshes to the engine's
 * instanced mesh manager, owning their registration handles, instance flags and
 * world cull bounds.
 */
@type.define({ className: "EveChildInstancedMeshes", family: "eve/child" })
export class EveChildInstancedMeshes extends EveEntity
{
  @io.persist
  @type.string
  name = "";

  @io.read
  @type.mat4
  worldTransform = mat4.create();

  @io.read
  @type.boolean
  hasUpdated = false;

  @io.persist
  @type.list("EveChildInstancedMesh")
  meshes = [];

  #revision = 0;

  /** Carbon m_perObjectDataHandle (h:143) - manager registration handle. */
  #perObjectDataHandle = null;

  /** Carbon m_allRegistered (h:147) - the AddMeshesToManager retry latch:
   * set optimistically each pass, cleared by ANY not-ready mesh/area so the
   * per-frame CollectMeshes retries until geometry streams in. */
  #allRegistered = false;

  /**
   * The authored name, persisted with the child and used to identify it in the
   * parent graph.
   */
  @carbon.method
  @impl.implemented
  GetName()
  {
    return this.name;
  }

  /** Sets the authored child name, coercing nullish to the empty string. */
  @carbon.method
  @impl.implemented
  SetName(name)
  {
    this.name = String(name ?? "");
  }

  /**
   * Carbon EveChildInstancedMeshes::UpdateVisibility (cpp:183-186) only caches
   * the frame's camera frustum for later use; the JS port has no consumer for
   * that cache, so the frame hook does nothing.
   */
  @carbon.method
  @impl.adapted
  UpdateVisibility()
  {
  }

  /**
   * Carbon EveChildInstancedMeshes::GetRenderables (cpp:188-190) collects
   * nothing: the instanced mesh manager emits the draws, so the accumulator
   * comes back unchanged.
   */
  @carbon.method
  @impl.implemented
  GetRenderables(renderables = [])
  {
    return renderables;
  }

  /**
   * Carbon EveChildInstancedMeshes::GetBoundingSphere (cpp:192-195) always
   * returns false - the child publishes no bounds of its own, because each mesh
   * registers its own sphere group with the manager.
   */
  @carbon.method
  @impl.implemented
  GetBoundingSphere()
  {
    return false;
  }

  /**
   * Stamps the child's world transform from the parent's localToWorldTransform
   * (Carbon cpp:197-200); every per-instance cull sphere the async pass builds
   * is derived from it.
   */
  @carbon.method
  @impl.implemented
  UpdateSyncronous(_updateContext, params)
  {
    if (params?.localToWorldTransform?.length === 16)
    {
      mat4.copy(this.worldTransform, params.localToWorldTransform);
    }
  }

  /** Carbon EveChildInstancedMeshes::UpdateAsyncronous (cpp:202-328), the CPU
   * half: per-mesh RENDER_IN_REFLECTION refresh (cpp:251), the mesh-local
   * bounds sphere radius = |center| + radius (cpp:254-255), per-instance
   * world cull spheres - position from the instance translation (Carbon reads
   * the packed rows' w = _41.._43, i.e. the transform translation) moved
   * through the child world transform, radius scaled by the instance's max
   * basis length times the child worldScale (cpp:259-269; NOTE Carbon's two
   * scale extractions deliberately differ - worldScale uses the world
   * transform's basis ROWS while the instance scale uses the packed rows'
   * xyz = the transpose's rows; equal under rotation + uniform scale,
   * ported exactly) - the world bounding sphere over all instance spheres
   * (cpp:257-270), a live SetSphereGroupBounds refresh on registered handles
   * (cpp:272-278), and the hasUpdated stamp (cpp:281). */
  @carbon.method
  @impl.adapted
  @impl.reason("The EveSpaceObjectVS/PSData per-object constant copy (cpp:204-238) and the raytracing mesh build (cpp:283-327) are engine-owned; mesh bounds come from a GetMeshData duck ({minBounds, maxBounds}) and meshes without one are skipped fail-closed.")
  UpdateAsyncronous(_updateContext, _params)
  {
    const w = this.worldTransform;
    // cpp:240-242 - worldScale from the world transform's basis rows.
    const worldScale = Math.max(
      Math.hypot(w[0], w[1], w[2]),
      Math.hypot(w[4], w[5], w[6]),
      Math.hypot(w[8], w[9], w[10])
    );

    for (const mesh of this.meshes)
    {
      const geometry = mesh.GetGeometryResource();
      if (!geometry || geometry.IsGood?.() === false)
      {
        continue;
      }

      // cpp:251 - refreshed every pass (set OR cleared).
      mesh.flags = ShouldReflect(mesh.reflectionMode)
        ? (mesh.flags | INSTANCE_FLAG_RENDER_IN_REFLECTION) >>> 0
        : (mesh.flags & ~INSTANCE_FLAG_RENDER_IN_REFLECTION) >>> 0;

      const meshData = geometry.GetMeshData?.(mesh.meshIndex);
      const minBounds = meshData?.minBounds ?? meshData?.m_minBounds;
      const maxBounds = meshData?.maxBounds ?? meshData?.m_maxBounds;
      if (!minBounds || !maxBounds)
      {
        continue;
      }
      // cpp:254-255 - Sphere(AABB): center (min+max)/2, radius |max-min|/2;
      // then radius = sphere.radius + |sphere.center| (origin-inclusive).
      const centerX = (minBounds[0] + maxBounds[0]) * 0.5;
      const centerY = (minBounds[1] + maxBounds[1]) * 0.5;
      const centerZ = (minBounds[2] + maxBounds[2]) * 0.5;
      const localRadius =
        Math.hypot(maxBounds[0] - minBounds[0], maxBounds[1] - minBounds[1], maxBounds[2] - minBounds[2]) * 0.5 +
        Math.hypot(centerX, centerY, centerZ);

      mesh.instanceSpheres.length = mesh.instances.length;
      let boundsMinX = Infinity, boundsMinY = Infinity, boundsMinZ = Infinity;
      let boundsMaxX = -Infinity, boundsMaxY = -Infinity, boundsMaxZ = -Infinity;
      for (let index = 0; index < mesh.instances.length; index++)
      {
        const transform = mesh.instances[index].transform;
        // cpp:261 - packed rows' w = the transform translation (gl [12..14]).
        POSITION_SCRATCH[0] = transform[12];
        POSITION_SCRATCH[1] = transform[13];
        POSITION_SCRATCH[2] = transform[14];
        // cpp:262-264 - instance scale from the packed rows' xyz (the
        // transpose's rows: gl (t[0],t[4],t[8]) / (t[1],t[5],t[9]) /
        // (t[2],t[6],t[10])) - deliberately NOT the same extraction as
        // worldScale above.
        const scale = Math.max(
          Math.hypot(transform[0], transform[4], transform[8]),
          Math.hypot(transform[1], transform[5], transform[9]),
          Math.hypot(transform[2], transform[6], transform[10])
        ) * worldScale;
        vec3.transformMat4(POSITION_SCRATCH, POSITION_SCRATCH, w);

        const radius = localRadius * scale;
        const sphere = mesh.instanceSpheres[index] ??= { center: vec3.create(), radius: 0 };
        vec3.copy(sphere.center, POSITION_SCRATCH);
        sphere.radius = radius;

        boundsMinX = Math.min(boundsMinX, POSITION_SCRATCH[0] - radius);
        boundsMinY = Math.min(boundsMinY, POSITION_SCRATCH[1] - radius);
        boundsMinZ = Math.min(boundsMinZ, POSITION_SCRATCH[2] - radius);
        boundsMaxX = Math.max(boundsMaxX, POSITION_SCRATCH[0] + radius);
        boundsMaxY = Math.max(boundsMaxY, POSITION_SCRATCH[1] + radius);
        boundsMaxZ = Math.max(boundsMaxZ, POSITION_SCRATCH[2] + radius);
      }
      if (mesh.instances.length)
      {
        // cpp:270 - Sphere(worldBounds).
        const sphereCenter = mesh.worldBoundingSphere.center;
        sphereCenter[0] = (boundsMinX + boundsMaxX) * 0.5;
        sphereCenter[1] = (boundsMinY + boundsMaxY) * 0.5;
        sphereCenter[2] = (boundsMinZ + boundsMaxZ) * 0.5;
        mesh.worldBoundingSphere.radius =
          Math.hypot(boundsMaxX - boundsMinX, boundsMaxY - boundsMinY, boundsMaxZ - boundsMinZ) * 0.5;

        // cpp:272-278 - live refresh of a registered sphere group.
        if (mesh.sphereHandle)
        {
          mesh.sphereHandle.owner?.SetSphereGroupBounds?.(mesh.sphereHandle, mesh.worldBoundingSphere, mesh.flags);
        }
      }
    }

    this.hasUpdated = true;
  }

  /**
   * Returns the child's world transform as stamped by the last sync update.
   * @param {Float32Array} [out] - caller-owned; when given, receives a copy and is returned instead of the live matrix
   * @returns {Float32Array} out when supplied, otherwise the live internal matrix
   */
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

  /**
   * Carbon EveChildInstancedMeshes::Setup (cpp:335-337) is an intentional no-op:
   * placement comes from the authored per-instance transforms, not from an SRT
   * setup.
   */
  @carbon.method
  @impl.implemented
  Setup()
  {
  }

  /**
   * Carbon EveChildInstancedMeshes::ChangeLOD (cpp:339-341) is an intentional
   * no-op; the child keeps no LOD state.
   */
  @carbon.method
  @impl.implemented
  ChangeLOD()
  {
  }

  /**
   * Accepts and discards the placement origin; this child has no Carbon origin
   * field and stores none.
   */
  @carbon.method
  @impl.adapted
  SetOrigin()
  {
  }

  /**
   * Returns false, so owners treat this child as subject to normal activation
   * gating.
   */
  @carbon.method
  @impl.implemented
  IsAlwaysOn()
  {
    return false;
  }

  /** Carbon EveChildInstancedMeshes::SetShaderOption (cpp:343-359): flips the
   * option and refreshes the effect hash on every area, then removes any
   * registered mesh-group handle and clears the latch - so the groups
   * re-register with the NEW effectHash on the next AddMeshesToManager pass.
   * Sphere/per-object handles deliberately stay registered. */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon dereferences area.effect unguarded; the JS option write is optional-chained. Handle removal + latch clear are ported.")
  SetShaderOption(name, value)
  {
    for (const mesh of this.meshes)
    {
      for (const area of mesh.areas)
      {
        area.effect?.SetOption?.(name, value);
        area.effectHash = EveChildInstancedMeshes.#GetEffectHash(area.effect);
        if (area.meshGroupHandle)
        {
          area.meshGroupHandle.owner?.RemoveMeshGroup?.(area.meshGroupHandle);
          area.meshGroupHandle = null;
          this.#allRegistered = false;
        }
      }
    }
    this.#revision++;
  }

  /**
   * Appends one instanced mesh: normalizes the area ducks, copies the instance transforms, stamps CASTS_SHADOW plus one flag bit per area batch type (Carbon cpp:418-425), and clears the registration latch so the next AddMeshesToManager pass picks it up.
   * @param {Iterable} areas - area ducks ({effect, batchType, areaIndex, areaCount})
   * @param {Iterable<Float32Array>} instanceTransforms - 16-value matrices; copied, not retained
   * @returns {Boolean} false when no areas or no instances were supplied (nothing is added)
   */
  @carbon.method
  @impl.adapted
  AddMesh(
    geometryPath,
    castsShadow,
    reflectionMode,
    meshIndex,
    areas,
    instanceTransforms,
    sofHullName = "",
    sofLocatorSetName = ""
  )
  {
    const sourceAreas = Array.from(areas ?? []);
    const sourceTransforms = Array.from(instanceTransforms ?? []);
    if (!sourceAreas.length || !sourceTransforms.length)
    {
      return false;
    }

    const normalizedAreas = sourceAreas.map(area => EveChildInstancedMeshes.#CreateArea(area));
    const instances = sourceTransforms.map((transform, sphereIndex) =>
    {
      if (!transform || transform.length !== 16)
      {
        throw new TypeError("EveChildInstancedMeshes instance transforms must contain 16 values");
      }
      const instance = new EveChildInstancedMeshInstance();
      mat4.copy(instance.transform, transform);
      instance.sphereIndex = sphereIndex;
      return instance;
    });

    const mesh = new EveChildInstancedMesh();
    mesh.geometryPath = String(geometryPath ?? "");
    mesh.castsShadow = !!castsShadow;
    mesh.reflectionMode = reflectionMode === undefined ? 3 : Number(reflectionMode) | 0;
    mesh.meshIndex = Number(meshIndex) >>> 0;
    mesh.areas = normalizedAreas;
    mesh.instances = instances;
    mesh.sofHullName = String(sofHullName ?? "");
    mesh.sofLocatorSetName = String(sofLocatorSetName ?? "");
    // Carbon (cpp:418-425): the CASTS_SHADOW flag and one bit per area batch
    // type are stamped at add time; RENDER_IN_REFLECTION is refreshed each
    // async pass. cpp:428 clears the registration latch.
    if (mesh.castsShadow)
    {
      mesh.flags = (mesh.flags | INSTANCE_FLAG_CASTS_SHADOW) >>> 0;
    }
    for (const area of mesh.areas)
    {
      mesh.flags = (mesh.flags | (1 << area.batchType)) >>> 0;
    }
    this.meshes.push(mesh);
    this.#allRegistered = false;
    this.#revision++;
    return true;
  }

  /**
   * Drops every mesh and clears the hasUpdated stamp so nothing re-registers
   * until another update pass runs; registration handles are NOT released here,
   * so call UnregisterFromMeshManager first when a manager still holds them.
   */
  @carbon.method
  @impl.adapted
  Clear()
  {
    this.meshes.length = 0;
    this.hasUpdated = false;
    this.#revision++;
  }

  /**
   * Decodes a picking area id back to the SOF locator it came from.
   * @param {Number} areaId - mesh ordinal in the high 16 bits, locator index in the low 16 (the pairing AddMeshesToManager registers)
   * @returns {Array|null} [sofHullName, sofLocatorSetName, locatorIndex], or null when the mesh is unknown or carries no SOF hull name
   */
  @carbon.method
  @impl.implemented
  GetSofSourceLocator(areaId)
  {
    const value = Number(areaId) >>> 0;
    const mesh = this.meshes[value >>> 16];
    if (!mesh || !mesh.sofHullName)
    {
      return null;
    }
    return [mesh.sofHullName, mesh.sofLocatorSetName, value & 0xffff];
  }

  /** Number of meshes currently held. */
  @carbon.method
  @impl.implemented
  GetMeshCount()
  {
    return this.meshes.length;
  }

  /**
   * Reports one mesh's authoring state as a positional tuple (Carbon's multiple out-params).
   * @param {Number} meshId - mesh index; RangeError when out of range
   * @returns {Array} [geometryPath, geometryResource, meshIndex, castsShadow, reflectionMode, areaCount, instanceCount]
   */
  @carbon.method
  @impl.adapted
  GetMeshInfo(meshId)
  {
    const mesh = EveChildInstancedMeshes.#GetMesh(this.meshes, meshId);
    return [
      mesh.geometryPath,
      mesh.GetGeometryResource(),
      mesh.meshIndex,
      mesh.castsShadow,
      mesh.reflectionMode,
      mesh.areas.length,
      mesh.instances.length
    ];
  }

  /**
   * Reports one area of one mesh as a positional tuple (Carbon's multiple out-params).
   * @param {Number} meshId - mesh index; RangeError when out of range
   * @param {Number} areaId - area index within that mesh; RangeError when out of range
   * @returns {Array} [effect, batchType, areaIndex, areaCount] - the effect is the live reference
   */
  @carbon.method
  @impl.adapted
  GetAreaInfo(meshId, areaId)
  {
    const mesh = EveChildInstancedMeshes.#GetMesh(this.meshes, meshId);
    const index = Number(areaId) >>> 0;
    if (index >= mesh.areas.length)
    {
      throw new RangeError(`EveChildInstancedMeshes area index ${index} is out of range`);
    }
    const area = mesh.areas[index];
    return [area.effect, area.batchType, area.areaIndex, area.areaCount];
  }

  /**
   * Whether the given mesh is currently displayed; throws RangeError for an
   * unknown mesh index.
   */
  @carbon.method
  @impl.adapted
  GetMeshDisplay(meshId)
  {
    return EveChildInstancedMeshes.#GetMesh(this.meshes, meshId).display;
  }

  /** Carbon EveChildInstancedMeshes::SetMeshDisplay (cpp:663-691): a toggle
   * clears the latch; turning a mesh OFF eagerly removes its sphere and
   * mesh-group handles - which is why AddMeshesToManager's display-off skip
   * does NOT clear the latch (the handles are already gone). */
  @carbon.method
  @impl.adapted
  @impl.reason("Handle invalidation after removal is explicit (Carbon's DataHandle is invalidated by the manager by reference).")
  SetMeshDisplay(meshId, display)
  {
    const mesh = EveChildInstancedMeshes.#GetMesh(this.meshes, meshId);
    const next = !!display;
    if (mesh.display !== next)
    {
      mesh.display = next;
      this.#allRegistered = false;
      if (!next)
      {
        if (mesh.sphereHandle)
        {
          mesh.sphereHandle.owner?.RemoveBoundingSphereGroup?.(mesh.sphereHandle);
          mesh.sphereHandle = null;
        }
        for (const area of mesh.areas)
        {
          if (area.meshGroupHandle)
          {
            area.meshGroupHandle.owner?.RemoveMeshGroup?.(area.meshGroupHandle);
            area.meshGroupHandle = null;
          }
        }
      }
      this.#revision++;
    }
  }

  /**
   * Assigns one mesh's geometry resource, bumping the revision only when it
   * actually changes; registration waits for the next AddMeshesToManager pass.
   */
  @carbon.method
  @impl.adapted
  SetGeometryResource(meshId, geometry)
  {
    const mesh = EveChildInstancedMeshes.#GetMesh(this.meshes, meshId);
    if (mesh.GetGeometryResource() !== geometry)
    {
      mesh.SetGeometryResource(geometry);
      this.#revision++;
    }
  }

  /**
   * Returns a detached snapshot of one mesh - instance transforms cloned, areas
   * shallow-copied, geometry resource shared by reference - so callers can read
   * it without touching live registration state.
   */
  @carbon.method
  @impl.adapted
  GetMeshData(meshId)
  {
    const mesh = EveChildInstancedMeshes.#GetMesh(this.meshes, meshId);
    return EveChildInstancedMeshes.#CloneMesh(mesh);
  }

  /**
   * Monotonic counter bumped by every structural change (AddMesh, Clear,
   * SetMeshDisplay, SetGeometryResource, SetShaderOption), for consumers caching
   * derived data.
   */
  @carbon.method
  @impl.implemented
  GetRevision()
  {
    return this.#revision;
  }

  /** Carbon EveChildInstancedMeshes::RegisterComponents (cpp:36-43):
   * unconditional InstancedMeshProvider + ShadowCaster leaf
   * self-registration. */
  @carbon.method
  @impl.implemented
  RegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      registry.RegisterComponent(EveComponentType.InstancedMeshProvider, this);
      registry.RegisterComponent(EveComponentType.ShadowCaster, this);
    }
  }

  /** Carbon EveChildInstancedMeshes::UnRegisterComponents (cpp:45-48) only
   * calls UnregisterFromMeshManager; own components were already removed by
   * EveEntity::UnRegister (EveEntity.cpp:90). */
  @carbon.method
  @impl.implemented
  UnRegisterComponents()
  {
    this.UnregisterFromMeshManager();
  }

  /** Carbon EveChildInstancedMeshes::UnregisterFromMeshManager (cpp:50-71):
   * every registered mesh-group / sphere-group / per-object handle is removed
   * through ITS OWN handle.owner (handles may span managers after a switch),
   * then the latch clears. */
  @carbon.method
  @impl.adapted
  @impl.reason("Handle invalidation after removal is explicit (Carbon's DataHandle is invalidated by the manager by reference).")
  UnregisterFromMeshManager()
  {
    for (const mesh of this.meshes)
    {
      for (const area of mesh.areas)
      {
        if (area.meshGroupHandle)
        {
          area.meshGroupHandle.owner?.RemoveMeshGroup?.(area.meshGroupHandle);
          area.meshGroupHandle = null;
        }
      }
      if (mesh.sphereHandle)
      {
        mesh.sphereHandle.owner?.RemoveBoundingSphereGroup?.(mesh.sphereHandle);
        mesh.sphereHandle = null;
      }
    }
    if (this.#perObjectDataHandle)
    {
      this.#perObjectDataHandle.owner?.RemovePerObjectData?.(this.#perObjectDataHandle);
      this.#perObjectDataHandle = null;
    }
    this.#allRegistered = false;
  }

  /** Carbon EveChildInstancedMeshes::AddMeshesToManager (cpp:472-553), the
   * InstancedMeshProvider entry the engine's CollectMeshes drives
   * (EveInstancedMeshManager.cpp:45-56; scene EveSpaceScene.cpp:1516).
   * Contract quirks preserved: nothing registers before the first update
   * pass (cpp:474); switching managers tears EVERYTHING down BEFORE the
   * latch early-out (cpp:478-481); the latch is set optimistically and
   * cleared by ANY not-ready mesh/area so the per-frame caller retries until
   * geometry streams in - EXCEPT display-off meshes, which skip WITHOUT
   * clearing it (their handles were already removed by SetMeshDisplay);
   * handles are add-once (partial re-registration after SetShaderOption /
   * display toggles); an area-level effect failure clears the latch while
   * the mesh's sphere group STAYS registered (Carbon's asymmetry);
   * pickingOwnerIndex is the mesh ordinal (pairs with GetSofSourceLocator's
   * meshIndex<<16 decode). */
  @carbon.method
  @impl.adapted
  @impl.reason("The manager is an injected engine duck returning handles (out-params become returns; .owner is stamped when the duck omits it); Carbon's combinedVertexDeclaration gate (cpp:499, a D3D declaration handle rebuilt in RebuildCachedData cpp:435-457) reduces to geometry presence + IsGood, and the declaration argument is passed as 0 for the engine to rebuild; GetRawRoot() becomes the object itself as picking owner.")
  AddMeshesToManager(manager)
  {
    if (!this.hasUpdated)
    {
      return;
    }
    if (this.#perObjectDataHandle && this.#perObjectDataHandle.owner !== manager)
    {
      this.UnregisterFromMeshManager();
    }
    if (this.#allRegistered)
    {
      return;
    }

    if (!this.#perObjectDataHandle)
    {
      const handle = manager?.AddPerObjectData?.(this) ?? null;
      if (handle && typeof handle === "object" && !handle.owner)
      {
        handle.owner = manager;
      }
      this.#perObjectDataHandle = handle;
    }

    this.#allRegistered = true;
    for (let meshIndex = 0; meshIndex < this.meshes.length; meshIndex++)
    {
      const mesh = this.meshes[meshIndex];
      if (!mesh.display)
      {
        continue;
      }
      const geometry = mesh.GetGeometryResource();
      if (!geometry || geometry.IsGood?.() === false)
      {
        this.#allRegistered = false;
        continue;
      }
      if (!mesh.instances.length)
      {
        this.#allRegistered = false;
        continue;
      }
      if (mesh.instances.length !== mesh.instanceSpheres.length)
      {
        this.#allRegistered = false;
        continue;
      }

      if (!mesh.sphereHandle)
      {
        const handle = manager?.AddBoundingSphereGroup?.(
          mesh.worldBoundingSphere,
          mesh.flags,
          mesh.instanceSpheres,
          mesh.instanceSpheres.length
        ) ?? null;
        if (handle && typeof handle === "object" && !handle.owner)
        {
          handle.owner = manager;
        }
        mesh.sphereHandle = handle;
      }

      for (const area of mesh.areas)
      {
        if (area.meshGroupHandle)
        {
          continue;
        }
        if (!area.effect)
        {
          this.#allRegistered = false;
          continue;
        }
        const handle = manager?.AddMeshGroup?.(
          geometry,
          0,
          area.batchType,
          mesh.meshIndex,
          area.areaIndex,
          area.areaCount,
          area.effect,
          area.effectHash,
          this.#perObjectDataHandle,
          mesh.sphereHandle,
          mesh.instances,
          mesh.instances.length,
          this,
          meshIndex
        ) ?? null;
        if (handle && typeof handle === "object" && !handle.owner)
        {
          handle.owner = manager;
        }
        area.meshGroupHandle = handle;
      }
    }
  }

  /** Carbon EveChildInstancedMeshes::IsCastingShadow (cpp:73-76) always
   * returns false (instanced shadows cull per instance group); presence
   * satisfies the "ShadowCaster" duck contract. */
  @carbon.method
  @impl.implemented
  IsCastingShadow(..._args)
  {
    return false;
  }

  /** Carbon EveChildInstancedMeshes::GetShadowBatches (cpp:78-80) is an
   * intentional no-op (the instanced mesh manager emits the batches). */
  @carbon.method
  @impl.noop
  GetShadowBatches(..._args)
  {
  }

  /** Carbon EveChildInstancedMeshes::GetShadowPerObjectData (cpp:82-85)
   * returns null (per-object data flows through the mesh manager). */
  @carbon.method
  @impl.implemented
  GetShadowPerObjectData(..._args)
  {
    return null;
  }

  /**
   * Resolves a mesh index against the list, throwing RangeError rather than
   * returning undefined so every public accessor fails loudly.
   */
  static #GetMesh(meshes, meshId)
  {
    const index = Number(meshId) >>> 0;
    if (index >= meshes.length)
    {
      throw new RangeError(`EveChildInstancedMeshes mesh index ${index} is out of range`);
    }
    return meshes[index];
  }

  /**
   * Builds an area record from a plain duck, defaulting areaCount to 1 and
   * caching the effect hash the manager registers the mesh group under.
   */
  static #CreateArea(value)
  {
    const source = value ?? {};
    const area = new EveChildInstancedMeshArea();
    area.effect = source.effect ?? null;
    area.batchType = Number(source.batchType) >>> 0;
    area.areaIndex = Number(source.areaIndex) >>> 0;
    area.areaCount = source.areaCount === undefined ? 1 : Number(source.areaCount) >>> 0;
    area.effectHash = EveChildInstancedMeshes.#GetEffectHash(area.effect);
    return area;
  }

  /**
   * Deep-copies a mesh into a plain object for GetMeshData: instance transforms
   * cloned, areas spread-copied, the geometry resource shared by reference.
   */
  static #CloneMesh(mesh)
  {
    return {
      geometryPath: mesh.geometryPath,
      geometry: mesh.GetGeometryResource(),
      castsShadow: mesh.castsShadow,
      reflectionMode: mesh.reflectionMode,
      meshIndex: mesh.meshIndex,
      areas: mesh.areas.map(area => ({ ...area })),
      instances: mesh.instances.map(instance => ({
        transform: mat4.clone(instance.transform),
        sphereIndex: instance.sphereIndex
      })),
      sofHullName: mesh.sofHullName,
      sofLocatorSetName: mesh.sofLocatorSetName,
      display: mesh.display
    };
  }

  /**
   * Reads an effect's hash through GetHashValue() or a .hash field, yielding 0
   * when neither is available so a hashless effect still registers
   * deterministically.
   */
  static #GetEffectHash(effect)
  {
    const hash = effect?.GetHashValue?.() ?? effect?.hash ?? 0;
    return Number(hash) || 0;
  }

}
