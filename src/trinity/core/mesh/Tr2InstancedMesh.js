// Source: trinity/trinity/Tr2InstancedMesh.h
// Source: trinity/trinity/Tr2InstancedMesh.cpp
// Source: trinity/trinity/Tr2InstancedMesh_Blue.cpp
import { vec3 } from "#math/vec3";
import { carbon, edit, impl, type } from "#schema";
import { Tr2Mesh } from "./Tr2Mesh.js";
import { Tr2EffectStateManager } from "../../shader/Tr2EffectStateManager.js";
import { Tr2Renderer } from "../Tr2Renderer.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../context/Tr2RenderContext.js";
import { Tr2RenderBatch } from "../batch/TriRenderBatch/index.js";
import { CarbonVertexElements } from "../vertex/vertexUsage.js";
import { CreateLodAllocations } from "./TriGeometryResAllocations.js";
import { blue, EnumRegistrationType } from "#blue";


/**
 * A mesh drawn once per entry of a separate instance-data stream, with static
 * bounds or bounds expanded by the per-instance size.
 */
@type.define({ className: "Tr2InstancedMesh", family: "trinityCore" })
export class Tr2InstancedMesh extends Tr2Mesh
{
  /** Carbon m_vertexDeclaration: combined mesh and instance elements. */
  _vertexDeclaration = Tr2EffectStateManager.Unknown;

  /** Carbon m_instanceDeclaration: provider handle used by the merge. */
  _instanceDeclaration = Tr2EffectStateManager.Unknown;

  @edit.readwrite
  @edit.persist
  @type.int32
  @type.enum("trinity.Tr2InstancedMesh.BoundsMethod")
  boundsMethod = 0;

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.string
  instanceGeometryResPath = "";

  @edit.readwrite
  @edit.persist
  @type.vec3
  maxBounds = vec3.create();

  @edit.readwrite
  @edit.persist
  @type.float32
  maxInstanceSize = 0;

  @edit.readwrite
  @edit.persist
  @type.vec3
  minBounds = vec3.create();

  @edit.readwrite
  @edit.persistOnly
  @type.objectRef("ITr2InstanceData")
  instanceGeometryResource = null;

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.int32
  instanceMeshIndex = 0;

  /** Defers to Tr2Mesh; the instance stream needs no extra CPU-side setup. */
  @carbon.method
  @impl.adapted
  Initialize()
  {
    return super.Initialize();
  }

  /** Resource path the instance data is loaded from. */
  @carbon.method
  @impl.implemented
  GetInstanceMeshResPath()
  {
    return this.instanceGeometryResPath;
  }

  /** Sets the instance-data resource path; schedules the instanceBuffer rebuild. */
  @carbon.method
  @impl.adapted
  SetInstanceMeshResPath(path)
  {
    this.instanceGeometryResPath = String(path ?? "");
  }

  /** Index of the instance buffer within the instance geometry resource. */
  @carbon.method
  @impl.implemented
  GetInstanceMeshIndex()
  {
    return this.instanceMeshIndex;
  }

  /**
   * The bound instance-data provider (an ITr2InstanceData), or null when none is
   * set.
   */
  @carbon.method
  @impl.implemented
  GetInstanceGeometryResource()
  {
    return this.instanceGeometryResource;
  }

  /** Binds the instance provider and rebuilds declarations (cpp:198-208). */
  @carbon.method
  @impl.implemented
  SetInstanceGeometryRes(resource)
  {
    if (this.instanceGeometryResource === resource) return;
    this.instanceGeometryResource = resource;
    this.CreateVertexDeclaration();
  }

  /** Invalidates both cached declarations (Tr2InstancedMesh.cpp:78-82). */
  @carbon.method
  @impl.implemented
  ReleaseResources()
  {
    this._vertexDeclaration = Tr2EffectStateManager.Unknown;
    this._instanceDeclaration = Tr2EffectStateManager.Unknown;
  }

  /** Recreates declarations when the device can prepare resources (cpp:89-93). */
  @carbon.method
  @impl.implemented
  OnPrepareResources()
  {
    this.CreateVertexDeclaration();
    return true;
  }

  /** Rebuilds the declaration before the base geometry caches (cpp:160-164). */
  @carbon.method
  @impl.implemented
  RebuildCachedData(resource)
  {
    this.CreateVertexDeclaration();
    super.RebuildCachedData(resource);
  }

  /**
   * Refreshes declarations when either mesh index changes (cpp:128-134).
   * Adapted: JS notification names identify Carbon's member addresses; the
   * instance resource-path loader remains the existing caller-owned path.
   */
  @carbon.method
  @impl.adapted
  OnModified(propertyName)
  {
    if (propertyName === "instanceMeshIndex" || propertyName === "meshIndex") this.CreateVertexDeclaration();
    return super.OnModified(propertyName);
  }

  /**
   * Collects indexed instance batches (Tr2InstancedMesh.cpp:219-311).
   * Adapted: the resource layer cannot access the AL, so cold LOD allocations
   * are made here through the ambient context before binding both streams.
   * Deferring to SubmitGeometry would clear stream1 and reset instance count.
   * JS accepts a batch type or area list and returns whether it committed any
   * batch; Carbon returns void. The retired Mac NVIDIA driver flag has no JS
   * backend equivalent.
   * @param {object} batches Destination accumulator.
   * @param {number|Array} areas Batch type or mesh areas.
   * @param {object|null} data Per-object data.
   * @param {number} [screenSize] Projected mesh size.
   * @param {boolean} [reverseAreas] Reverse each area's authored winding.
   * @returns {boolean} Whether a batch was committed.
   */
  @carbon.method
  @impl.adapted
  GetBatches(batches, areas, data, screenSize = Infinity, reverseAreas = false)
  {
    if (!this.display) return false;
    const geometry = this.GetGeometryResource();
    if (!geometry || !geometry.IsGood()) return false;
    const provider = this.GetInstanceGeometryResource();
    if (!provider || !provider.IsInstanceDataReady()) return false;
    if (this._vertexDeclaration === Tr2EffectStateManager.Unknown ||
      this._instanceDeclaration !== provider.GetInstanceBufferVertexDeclaration(this.instanceMeshIndex))
    {
      this.CreateVertexDeclaration();
      if (this._vertexDeclaration === Tr2EffectStateManager.Unknown) return false;
    }
    const lod = geometry.GetMeshLod(this.meshIndex, screenSize);
    if (!lod || !CreateLodAllocations(geometry, this.meshIndex, lod, Tr2RenderContext_GetMainThreadRenderContext())) return false;
    const instanceData = provider.GetInstanceData(this.instanceMeshIndex, screenSize);
    if (instanceData.count === 0) return false;
    const list = Array.isArray(areas) ? areas : this.GetAreas(areas);
    if (!list) return false;
    let committed = false;
    for (const area of list)
    {
      if (!area.GetDisplay()) continue;
      const material = area.GetMaterialInterface();
      if (!material) continue;
      const reversed = area.GetReversed() !== reverseAreas;
      if (reversed && !lod.reversedIndicesValid) continue;
      const draw = Tr2RenderBatch.resolveDrawArguments(lod, area.GetIndex(), area.GetCount(), reversed);
      if (!draw) continue;
      const batch = new Tr2RenderBatch();
      batch.SetMaterial(material);
      batch.SetPerObjectData(data);
      batch.SetGeometryFromAllocations(this._vertexDeclaration, lod.vertexAllocation, lod.indexAllocation);
      batch.SetStreamSource(1, instanceData.buffer, instanceData.stride);
      batch.SetDrawIndexedInstanced(draw.indexCountPerInstance, instanceData.count,
        draw.startIndexLocation, draw.baseVertexLocation, instanceData.offset / instanceData.stride);
      committed = batches.Commit(batch) || committed;
    }
    return committed;
  }

  /**
   * Merges mesh and instance declarations (cpp:464-528). Only appended elements
   * change: stream1, step rate1 and semantic index+8. Adapted: the decoded mesh
   * uses CMF scalar type names, so the existing CarbonVertexElements/ESM array
   * representation is retained rather than inventing a numeric offset ledger.
   */
  @carbon.method
  @impl.adapted
  CreateVertexDeclaration()
  {
    this._vertexDeclaration = Tr2EffectStateManager.Unknown;
    this._instanceDeclaration = Tr2EffectStateManager.Unknown;
    if (!Tr2Renderer.IsResourceCreationAllowed()) return;
    const provider = this.GetInstanceGeometryResource();
    if (!provider || !provider.IsInstanceDataReady()) return;
    const handle = provider.GetInstanceBufferVertexDeclaration(this.instanceMeshIndex);
    this._instanceDeclaration = handle;
    if (handle === Tr2EffectStateManager.Unknown) return;
    const definition = Tr2EffectStateManager.getVertexDeclarationElements(handle);
    if (!definition) return;
    const instances = definition.items ?? definition;
    const geometry = this.GetGeometryResource();
    if (!geometry || !geometry.IsGood()) return;
    const mesh = CarbonVertexElements(geometry.GetMeshVertexElements(this.meshIndex));
    if (!mesh.length || !instances.length) return;
    const merged = mesh.map(item => ({ ...item }));
    for (const item of instances)
    {
      merged.push({ ...item, stream: 1, instanceStepRate: 1, usageIndex: item.usageIndex + 8 });
    }
    this._vertexDeclaration = Tr2EffectStateManager.getVertexDeclarationHandle(merged);
  }

  /** Returns the combined declaration handle (Tr2InstancedMesh.cpp:531-534). */
  @carbon.method
  @impl.implemented
  GetVertexDeclaration()
  {
    return this._vertexDeclaration;
  }

  /**
   * Sets the static bounds used when boundsMethod is STATIC; a missing vector is
   * treated as the origin.
   */
  @carbon.method
  @impl.adapted
  SetBoundingBox(minBounds, maxBounds)
  {
    vec3.copy(this.minBounds, minBounds ?? Tr2InstancedMesh.#zero);
    vec3.copy(this.maxBounds, maxBounds ?? Tr2InstancedMesh.#zero);
  }

  /**
   * Switches to DYNAMIC bounds, where the instance stream's box is expanded by a
   * fixed instance size in world units.
   */
  @carbon.method
  @impl.adapted
  SetDynamicBounds(maxInstanceSize)
  {
    this.boundsMethod = Tr2InstancedMesh.BoundsMethod.DYNAMIC;
    this.maxInstanceSize = Number(maxInstanceSize) || 0;
  }

  /**
   * Switches to DYNAMIC_SCALED bounds, where the instance stream's box is
   * expanded by maxScale multiplied by the mesh geometry's own radius.
   */
  @carbon.method
  @impl.adapted
  SetDynamicScaledBounds(maxScale)
  {
    this.boundsMethod = Tr2InstancedMesh.BoundsMethod.DYNAMIC_SCALED;
    this.maxInstanceSize = Number(maxScale) || 0;
  }

  /**
   * The whole-mesh bounds: the authored static box, or the instance stream's box
   * expanded by the instance size (scaled by the geometry radius under
   * DYNAMIC_SCALED); a zero box when no instance bounds are available. Always a
   * freshly allocated pair.
   */
  @carbon.method
  @impl.adapted
  GetBounds()
  {
    if (this.boundsMethod === Tr2InstancedMesh.BoundsMethod.STATIC)
    {
      return Tr2InstancedMesh.#cloneBounds(this.minBounds, this.maxBounds);
    }

    const instanceResource = this.GetInstanceGeometryResource();
    if (!instanceResource)
    {
      return Tr2InstancedMesh.#cloneBounds(Tr2InstancedMesh.#zero, Tr2InstancedMesh.#zero);
    }
    const source = instanceResource.GetInstanceBufferBoundingBox(this.instanceMeshIndex);
    if (!source)
    {
      return Tr2InstancedMesh.#cloneBounds(Tr2InstancedMesh.#zero, Tr2InstancedMesh.#zero);
    }

    let size = this.maxInstanceSize;
    if (this.boundsMethod === Tr2InstancedMesh.BoundsMethod.DYNAMIC_SCALED)
    {
      size *= Tr2InstancedMesh.#getGeometryRadius(this.GetGeometryResource(), this.meshIndex);
    }

    const minBounds = vec3.clone(source.min ?? source.minBounds ?? Tr2InstancedMesh.#zero);
    const maxBounds = vec3.clone(source.max ?? source.maxBounds ?? Tr2InstancedMesh.#zero);
    for (let index = 0; index < 3; index++)
    {
      minBounds[index] -= size;
      maxBounds[index] += size;
    }
    return { min: minBounds, max: maxBounds };
  }

  /**
   * Overrides Tr2Mesh - loading state also waits on the instance geometry.
   * Carbon combines the terms with &&, so a ready base mesh reports loaded
   * even while instance data settles; ported verbatim.
   */
  get isLoading()
  {
    return super.isLoading &&
      !!this.GetInstanceGeometryResource() &&
      !this.GetInstanceGeometryResource().IsInstanceDataReady();
  }

  /** Overrides Tr2MeshBase - instanced areas share the whole-mesh bounds. */
  @carbon.method
  @impl.implemented
  GetAreaBounds(_areaIndex, _boneTransforms)
  {
    return this.GetBounds();
  }

  /** Bounding box of a single instance - the mesh's own geometry bounds. */
  @carbon.method
  @impl.adapted
  GetInstanceBounds()
  {
    const bounds = this.GetGeometryResource()?.GetBoundingBox?.(this.meshIndex);
    if (!bounds)
    {
      return Tr2InstancedMesh.#cloneBounds(Tr2InstancedMesh.#zero, Tr2InstancedMesh.#zero);
    }
    return {
      min: vec3.clone(bounds.min ?? bounds.minBounds ?? Tr2InstancedMesh.#zero),
      max: vec3.clone(bounds.max ?? bounds.maxBounds ?? Tr2InstancedMesh.#zero)
    };
  }

  /**
   * Sphere of the instance nearest to the given point: shrinks the outer
   * bounds by the instance size and clamps the point into the result.
   * Returns null for the STATIC bounds method, matching Carbon's empty
   * sphere.
   */
  @carbon.method
  @impl.adapted
  GetInstanceBoundsClosestToPoint(point)
  {
    let instanceSize = this.maxInstanceSize;
    switch (this.boundsMethod)
    {
      case Tr2InstancedMesh.BoundsMethod.DYNAMIC:
        break;
      case Tr2InstancedMesh.BoundsMethod.DYNAMIC_SCALED:
        instanceSize *= Tr2InstancedMesh.#getGeometryRadius(this.GetGeometryResource(), this.meshIndex);
        break;
      default:
        return null;
    }

    const outer = this.GetBounds();
    const minBounds = outer.min;
    const maxBounds = outer.max;
    const center = vec3.create();
    for (let index = 0; index < 3; index++)
    {
      minBounds[index] += instanceSize;
      maxBounds[index] -= instanceSize;
      center[index] = Math.min(Math.max(Number(point[index]) || 0, minBounds[index]), maxBounds[index]);
    }
    return { center, radius: instanceSize };
  }

  /** A detached { min, max } pair cloned from the two vectors. */
  static #cloneBounds(minBounds, maxBounds)
  {
    return {
      min: vec3.clone(minBounds),
      max: vec3.clone(maxBounds)
    };
  }

  /**
   * Radius of the mesh geometry's bounding box measured from the origin,
   * defaulting to 1 when the resource exposes no box.
   */
  static #getGeometryRadius(resource, meshIndex)
  {
    const bounds = resource?.GetBoundingBox?.(meshIndex);
    if (!bounds)
    {
      return 1;
    }

    const minBounds = bounds.min ?? bounds.minBounds ?? Tr2InstancedMesh.#zero;
    const maxBounds = bounds.max ?? bounds.maxBounds ?? Tr2InstancedMesh.#zero;
    const x = Math.max(Math.abs(Number(minBounds[0]) || 0), Math.abs(Number(maxBounds[0]) || 0));
    const y = Math.max(Math.abs(Number(minBounds[1]) || 0), Math.abs(Number(maxBounds[1]) || 0));
    const z = Math.max(Math.abs(Number(minBounds[2]) || 0), Math.abs(Number(maxBounds[2]) || 0));
    return Math.hypot(x, y, z);
  }

  static #zero = Object.freeze([0, 0, 0]);

  static BoundsMethod = Object.freeze({
    STATIC: 0,
    DYNAMIC: 1,
    DYNAMIC_SCALED: 2
  });
}

// Registered as Carbon registers it (trinity/trinity/Tr2InstancedMesh_Blue.cpp:21).
blue.enums.RegisterEnum("trinity.Tr2InstancedMesh.BoundsMethod", Tr2InstancedMesh.BoundsMethod, {
  source: "trinity/trinity/Tr2InstancedMesh.h", family: "trinityCore", line: 29,
  exposedName: "Tr2InstanceMeshBoundsMethod", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/Tr2InstancedMesh_Blue.cpp:13",
  chooser: [
    { name: "STATIC", value: Tr2InstancedMesh.BoundsMethod.STATIC, description: "Bounds are defined explicitely on the mesh" },
    { name: "DYNAMIC", value: Tr2InstancedMesh.BoundsMethod.DYNAMIC, description: "Bounds are defined by instance geometry and max instance size" },
    { name: "DYNAMIC_SCALED", value: Tr2InstancedMesh.BoundsMethod.DYNAMIC_SCALED, description: "Bounds are defined by instance geometry and max instance size; instance size is scaled by geometry size" }
  ]
});
