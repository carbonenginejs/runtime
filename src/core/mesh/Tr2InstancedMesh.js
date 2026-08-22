// Source: E:\carbonengine\trinity\trinity\Tr2InstancedMesh.h
// Source: E:\carbonengine\trinity\trinity\Tr2InstancedMesh.cpp
// Source: E:\carbonengine\trinity\trinity\Tr2InstancedMesh_Blue.cpp
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { Tr2Mesh } from "./Tr2Mesh.js";


/**
 * A mesh drawn once per entry of a separate instance-data stream, with static
 * bounds or bounds expanded by the per-instance size.
 */
@type.define({ className: "Tr2InstancedMesh", family: "trinityCore" })
export class Tr2InstancedMesh extends Tr2Mesh
{
  @io.persist
  @type.int32
  @type.enum("BoundsMethod")
  boundsMethod = 0;

  @io.rebuild("instanceBuffer")
  @io.notify
  @io.persist
  @type.string
  instanceGeometryResPath = "";

  @io.persist
  @type.vec3
  maxBounds = vec3.create();

  @io.persist
  @type.float32
  maxInstanceSize = 0;

  @io.persist
  @type.vec3
  minBounds = vec3.create();

  @io.rebuild("instanceBuffer")
  @io.persistOnly
  @type.objectRef("ITr2InstanceData")
  instanceGeometryResource = null;

  @io.rebuild("instanceBuffer")
  @io.notify
  @io.persist
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

  /**
   * Binds an already-resolved instance-data provider; schedules the
   * instanceBuffer rebuild.
   */
  @carbon.method
  @impl.adapted
  SetInstanceGeometryRes(resource)
  {
    this.instanceGeometryResource = resource ?? null;
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
    const source = instanceResource?.GetInstanceBufferBoundingBox?.(this.instanceMeshIndex) ??
      instanceResource?.GetBoundingBox?.();
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
