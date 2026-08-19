// Source: trinity/trinity/Resources/TriGeometryRes.h
// Source: trinity/trinity/Resources/TriGeometryRes.cpp
// Source: trinity/trinity/Resources/TriGeometryRes_Blue.cpp
import { CjsSchema, carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { box3 } from "@carbonenginejs/runtime-utils/box3";
import { triangleNormalTo } from "@carbonenginejs/runtime-utils/mesh";
import { ray3 } from "@carbonenginejs/runtime-utils/ray3";
import { sph3 } from "@carbonenginejs/runtime-utils/sph3";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { CjsResource } from "../CjsResource.js";
import {
  assertResourcePayloadArray,
  assertResourcePayloadObject,
  resourceBoundaryError,
  resourcePayloadError
} from "../resourceBoundary.js";

/**
 * Resource record that owns geometry payload facts (meshes, optional
 * skeletons and animations) and LOD-force metadata, while engine packages
 * decide device buffers, vertex declarations, and draw-time state.
 *
 * Geometry inspection composes the generic math supplied by runtime-utils
 * with resource-specific payload traversal.
 */
export class TriGeometryRes extends CjsResource
{
  forceLod = false;
  forcedLodIndex = -1;
  name = "";

  /** Creates a TriGeometryRes with caller-provided initial state. */
  constructor(values = null)
  {
    super();
    this.SetValues(values || {}, {
      markDirty: false,
      skipUpdate: true,
      skipEvents: true
    });
  }

  /**
   * Attach a plain geometry payload.
   *
   * @param {object|null} payload
   * @param {object|null} options
   * @returns {TriGeometryRes}
   */
  SetPayload(payload = null, options = null)
  {
    if (payload === null)
    {
      super.SetPayload(null);
      return this;
    }
    assertResourcePayloadObject("TriGeometryRes", payload);
    assertResourcePayloadArray("TriGeometryRes", payload, "meshes");
    for (const field of [ "skeletons", "animations" ])
    {
      if (payload[field] !== undefined && !Array.isArray(payload[field]))
      {
        throw resourcePayloadError("TriGeometryRes", "Expected an array when provided.", field);
      }
    }
    super.SetPayload(payload);
    this.SetValues(options || {});
    return this;
  }

  /**
   * Get mesh count from the CPU geometry payload.
   *
   * @returns {number}
   */
  GetMeshCount()
  {
    return this.GetPayload()?.meshes?.length || 0;
  }

  /**
   * Get animation count from the CPU geometry payload.
   *
   * @returns {number}
   */
  GetAnimationCount()
  {
    return this.GetPayload()?.animations?.length || 0;
  }

  /**
   * Get skeleton count from the CPU geometry payload.
   *
   * @returns {number}
   */
  GetSkeletonCount()
  {
    return this.GetPayload()?.skeletons?.length || 0;
  }

  /**
   * Get one resource-owned skeleton from the CPU geometry payload.
   *
   * @param {number} skeletonIndex
   * @returns {*}
   */
  GetSkeletonData(skeletonIndex = 0)
  {
    const index = Number(skeletonIndex);

    if (!Number.isInteger(index) || index < 0)
    {
      return null;
    }

    return this.GetPayload()?.skeletons?.[index] || null;
  }

  /**
   * Get mesh area count from a CPU geometry payload mesh.
   *
   * @param {number} meshIndex
   * @returns {number}
   */
  GetMeshAreaCount(meshIndex = 0)
  {
    const mesh = this.GetPayload()?.meshes?.[meshIndex];
    return mesh?.areas?.length || 0;
  }

  // Carbon TriGeometryRes.cpp:294-319. Walks LODs from the LOWEST quality up
  // and takes the first whose authored maxScreenSize still covers the requested
  // size; a request larger than the best LOD falls back to LOD 0, which Carbon
  // comments explicitly. forceLod pins the index instead, clamped to the last
  // LOD.

  /**
   * The LOD index this mesh should be drawn at for a screen size, or -1 when the
   * mesh does not exist.
   *
   * @param {number} meshIndex
   * @param {number} screenSize
   * @returns {number}
   */
  GetLodIndexForScreenSize(meshIndex = 0, screenSize = Infinity)
  {
    const mesh = this.GetPayload()?.meshes?.[meshIndex];

    if (!mesh) return -1;

    // A decoder may flatten a single-LOD mesh, putting the areas on the mesh
    // itself; that mesh IS its own only LOD (see getMeshAreas).
    const lods = mesh.lods?.length ? mesh.lods : null;
    const lastLod = lods ? lods.length - 1 : 0;

    if (this.forceLod && this.forcedLodIndex >= 0)
    {
      return Math.min(this.forcedLodIndex, lastLod);
    }

    for (let index = lastLod; index >= 0; index--)
    {
      const maxScreenSize = (lods ? lods[index]?.maxScreenSize : mesh.maxScreenSize) ?? 0;
      if (maxScreenSize >= screenSize) return index;
    }

    return 0;
  }

  // Carbon TriGeometryRes.cpp:268-279. Carbon overloads this on float
  // screenSize versus int lodIndex; JavaScript cannot, so the index form is
  // GetMeshLodByIndex. Carbon indexes m_lods with the result unguarded, so a
  // mesh with an EMPTY lod list reads out of bounds there; this port returns
  // null (docs/research/carbon-known-defects.md).

  /**
   * The LOD data this mesh should be drawn at for a screen size, or null when
   * the mesh has no LODs.
   *
   * @param {number} meshIndex
   * @param {number} screenSize
   * @returns {object|null}
   */
  GetMeshLod(meshIndex = 0, screenSize = Infinity)
  {
    return this.GetMeshLodByIndex(meshIndex, this.GetLodIndexForScreenSize(meshIndex, screenSize));
  }

  /**
   * The LOD data at an explicit index, or null when the mesh or index does not
   * exist (Carbon TriGeometryRes.cpp:281-292).
   *
   * @param {number} meshIndex
   * @param {number} lodIndex
   * @returns {object|null}
   */
  GetMeshLodByIndex(meshIndex = 0, lodIndex = 0)
  {
    const mesh = this.GetPayload()?.meshes?.[meshIndex];

    if (!mesh || lodIndex < 0) return null;

    if (mesh.lods?.length)
    {
      return lodIndex < mesh.lods.length ? mesh.lods[lodIndex] : null;
    }

    return lodIndex === 0 && mesh.areas ? mesh : null;
  }

  /**
   * Get mesh name from a CPU geometry payload.
   *
   * @param {number} meshIndex
   * @returns {string}
   */
  GetMeshName(meshIndex = 0)
  {
    return this.GetPayload()?.meshes?.[meshIndex]?.name || "";
  }

  /**
   * Get mesh area name from a CPU geometry payload.
   *
   * @param {number} meshIndex
   * @param {number} areaIndex
   * @returns {string}
   */
  GetMeshAreaName(meshIndex = 0, areaIndex = 0)
  {
    return this.GetPayload()?.meshes?.[meshIndex]?.areas?.[areaIndex]?.name || "";
  }

  /**
   * Get area bounding box from geometry payload data.
   *
   * @param {number} meshIndex
   * @param {number} areaIndex
   * @param {ArrayLike<number>|null} outMin
   * @param {ArrayLike<number>|null} outMax
   * @returns {*|boolean}
   */
  GetAreaBoundingBox(meshIndex = 0, areaIndex = 0, outMin = null, outMax = null)
  {
    const area = TriGeometryRes.getMeshAreas(this.GetPayload()?.meshes?.[meshIndex])?.[areaIndex];
    const bounds = TriGeometryRes.getBounds(area);
    return TriGeometryRes.copyBounds(bounds, outMin, outMax);
  }

  /**
   * Get mesh bounding box from geometry payload data.
   * @param {number} meshIndex
   * @param {ArrayLike<number>|null} outMin
   * @param {ArrayLike<number>|null} outMax
   * @returns {*|boolean}
   */
  GetBoundingBox(meshIndex = 0, outMin = null, outMax = null)
  {
    const payload = this.GetPayload();
    const bounds = TriGeometryRes.getBounds(payload?.meshes?.[meshIndex])
      || TriGeometryRes.getBounds(payload);
    return TriGeometryRes.copyBounds(bounds, outMin, outMax);
  }

  /**
   * Get mesh bounding sphere from geometry payload data.
   * @param {number} meshIndex
   * @param {ArrayLike<number>|null} out
   * @returns {*|boolean}
   */
  GetBoundingSphere(meshIndex = 0, out = null)
  {
    const payload = this.GetPayload();
    const sphere = TriGeometryRes.getSphere(payload?.meshes?.[meshIndex])
      || TriGeometryRes.getSphere(payload);
    if (!out) return sphere;
    if (!sphere) return false;
    vec4.copy(out, sphere);
    return true;
  }

  /**
   * Calculate a transformed bounding box from canonical CPU vertex data.
   *
   * Carbon stores the same matrix bytes as gl-matrix; transforming one point
   * therefore uses the ordinary column-vector index layout.
   *
   * @param {number} meshIndex
   * @param {ArrayLike<number>} transform
   * @returns {{min: number[], max: number[]}|null}
   */
  CalculateBoundingBoxFromTransform(meshIndex = 0, transform = null)
  {
    if (!transform || transform.length < 16)
    {
      throw new TypeError("TriGeometryRes transform must contain 16 matrix elements.");
    }
    const mesh = this.GetPayload()?.meshes?.[meshIndex];
    if (!mesh) return null;
    const positions = TriGeometryRes.getMeshPositions(mesh);
    const sourceBounds = TriGeometryRes.getBounds(mesh);
    if (!positions && !sourceBounds) return null;

    const
      bounds = box3.alloc(),
      point = vec3.alloc();
    try
    {
      if (!TriGeometryRes.setBoundsFromPositions(bounds, positions, point))
      {
        if (!sourceBounds) return null;
        box3.fromBounds(bounds, sourceBounds.min, sourceBounds.max);
      }
      box3.transformMat4(bounds, bounds, transform);
      return {
        min: [ bounds[0], bounds[1], bounds[2] ],
        max: [ bounds[3], bounds[4], bounds[5] ]
      };
    }
    finally
    {
      vec3.unalloc(point);
      box3.unalloc(bounds);
    }
  }

  /**
   * Recalculate bounding sphere data from canonical CPU vertex positions.
   *
   * @returns {boolean}
   */
  RecalculateBoundingSphere()
  {
    let updated = false;
    const
      sphere = sph3.alloc(),
      point = vec3.alloc();
    try
    {
      for (const mesh of this.GetPayload()?.meshes || [])
      {
        if (!TriGeometryRes.calculateMeshSphere(sphere, mesh, point)) continue;
        TriGeometryRes.setMeshSphere(mesh, sphere);
        updated = true;
      }
      return updated;
    }
    finally
    {
      vec3.unalloc(point);
      sph3.unalloc(sphere);
    }
  }

  /**
   * Reloading belongs to the resource manager because it owns source and
   * canonical replacement policy.
   *
   * @throws {Error}
   */
  Reload() {
    throw resourceBoundaryError(
      "TriGeometryRes",
      "Reload",
      "Request a reload through CjsResMan so source reads and canonical replacement remain manager-owned."
    );
  }

  /**
   * Intersect a ray with canonical CPU triangle data.
   *
   * @param {ArrayLike<number>} position
   * @param {ArrayLike<number>} direction
   * @returns {object}
   */
  GetIntersectionPointNormalBone(position, direction)
  {
    return TriGeometryRes.intersectGeometry(
      this.RequireIntersectionMeshes(),
      position,
      direction,
      -1
    );
  }

  /**
   * Intersect a ray with one area index across canonical CPU meshes.
   *
   * @param {ArrayLike<number>} position
   * @param {ArrayLike<number>} direction
   * @param {number} areaIndex
   * @returns {object}
   */
  GetAreaIntersectionPointNormalBone(position, direction, areaIndex = -1)
  {
    if (!Number.isInteger(areaIndex) || areaIndex < -1)
    {
      throw new RangeError("TriGeometryRes area index must be -1 or a non-negative integer.");
    }
    return TriGeometryRes.intersectGeometry(
      this.RequireIntersectionMeshes(),
      position,
      direction,
      areaIndex
    );
  }

  /**
   * The CPU triangle data an intersection query needs, or a loud failure.
   *
   * A ray query used to read `GetPayload()?.meshes`, and `intersectGeometry`
   * loops over `meshes?.length || 0`. So an absent payload produced a clean
   * MISS: `hit: false`, no error, indistinguishable from the ray genuinely
   * passing the object by. Picking would appear to work and simply stop
   * hitting things, and the symptom reads as a maths bug rather than a
   * residency one.
   *
   * Carbon never has to answer this, because it holds the loaded file for the
   * resource's lifetime and its CPU data is always resident. Ours is
   * releasable, so the unavailable case is real and must be named.
   *
   * Throwing is the interim answer, not the final one: once accuracy tiers
   * exist a query degrades to bounds or sphere and reports which produced it.
   * What it must never do again is report absence as a miss. See
   * `/docs/contracts/cpu-geometry-residency.md`.
   *
   * @returns {Array<*>} Canonical CPU meshes.
   * @throws {Error} When the CPU geometry is not resident.
   */
  RequireIntersectionMeshes()
  {
    const meshes = this.GetPayload()?.meshes;
    if (!Array.isArray(meshes))
    {
      throw new Error(
        "TriGeometryRes cannot answer an intersection query: CPU geometry is "
        + "not resident. The payload was never loaded or has been released. "
        + "Reload through CjsResMan before querying."
      );
    }
    return meshes;
  }

  /**
   * Get vertex element descriptors for a mesh.
   *
   * @param {number} meshIndex
   * @returns {Array<*>}
   */
  GetMeshVertexElements(meshIndex = 0)
  {
    // The CMF reader emits the element list as `decl`, matching the CMF struct
    // field; this accessor read only `vertexElements`, which no reader in this
    // package populates, so it returned an empty list for every real decoded
    // payload. Both names are accepted because the name is the producer's.
    const mesh = this.GetPayload()?.meshes?.[meshIndex];

    return mesh?.decl || mesh?.vertexElements || [];
  }

  /**
   * Saving belongs to the selected geometry format writer and destination.
   *
   * @throws {Error}
   */
  SaveMesh()
  {
    throw resourceBoundaryError(
      "TriGeometryRes",
      "SaveMesh",
      "Use a geometry format writer with the resource payload and a caller-owned destination."
    );
  }

  static payload = "geometry";

  // Carbon TriGeometryRes.cpp:158-178, declared beside the class
  // (TriGeometryRes.h:202) because it reads LOD data rather than resource
  // state - which is why it is static here. It returns a PLAIN SUM and does not
  // multiply by three: the *3 belongs to the caller, so triangles-only is a
  // property of the mesh draw path rather than of the geometry layer.

  /**
   * The summed primitive count over `count` areas of a LOD starting at `index`,
   * with the run clamped to the area list as Carbon clamps it; zero when the
   * index is out of range, which callers treat as "emit no draw".
   *
   * @param {object|null} lod
   * @param {number} index
   * @param {number} count
   * @returns {number}
   */
  static getPrimitiveCount(lod, index, count)
  {
    const areas = lod?.areas ?? null;
    const areaCount = areas?.length ?? 0;

    if (!areaCount || index >= areaCount) return 0;

    const run = index + count > areaCount ? areaCount - index : count;

    let primitiveCount = 0;

    for (let offset = 0; offset < run; offset++)
    {
      primitiveCount += areas[index + offset]?.primitiveCount ?? 0;
    }

    return primitiveCount;
  }

  /**
   * Gets the canonical area list from a mesh or its first LOD.
   *
   * @param {object|null} mesh
   * @returns {Array<*>|null}
  */
  static getMeshAreas(mesh)
  {
    return mesh?.areas || mesh?.lods?.[0]?.areas || null;
  }

  /**
   * Gets canonical bounds from a geometry payload object.
   *
   * @param {object|null} value
   * @returns {{min: ArrayLike<number>, max: ArrayLike<number>}|null}
  */
  static getBounds(value)
  {
    if (!value || typeof value !== "object") return null;
    if (value.bounds?.min && value.bounds?.max) return value.bounds;
    if (value.minBounds && value.maxBounds)
    {
      return { min: value.minBounds, max: value.maxBounds };
    }
    return null;
  }

  /**
   * Gets the canonical bounding sphere from a geometry payload object.
   *
   * @param {object|null} value
   * @returns {ArrayLike<number>|null}
  */
  static getSphere(value)
  {
    if (!value || typeof value !== "object") return null;
    return value.sphere || value.boundingSphere || null;
  }

  /**
   * Copies bounds into caller-owned outputs, or returns the source object.
   *
   * @param {{min: ArrayLike<number>, max: ArrayLike<number>}|null} bounds
   * @param {ArrayLike<number>|null} outMin
   * @param {ArrayLike<number>|null} outMax
   * @returns {*|boolean}
  */
  static copyBounds(bounds, outMin, outMax)
  {
    if (!outMin && !outMax) return bounds;
    if (!bounds || !outMin || !outMax) return false;
    vec3.copy(outMin, bounds.min);
    vec3.copy(outMax, bounds.max);
    return true;
  }

  /**
   * Gets canonical positions from a mesh or its first LOD.
   *
   * @param {object|null} mesh
   * @returns {ArrayLike<number>|Array<ArrayLike<number>>|null}
  */
  static getMeshPositions(mesh)
  {
    return mesh?.vertex?.position
      || mesh?.positions
      || mesh?.lods?.[0]?.vertex?.position
      || mesh?.lods?.[0]?.positions
      || null;
  }

  /**
   * Gets the number of vertices represented by flat or nested positions.
   *
   * @param {ArrayLike<number>|Array<ArrayLike<number>>|null} positions
   * @returns {number}
  */
  static getPositionCount(positions)
  {
    if (!positions) return 0;
    return typeof positions[0] === "number"
      ? Math.floor(positions.length / 3)
      : positions.length;
  }

  /**
   * Calculates bounds from canonical positions using caller-owned scratch.
   *
   * @param {ArrayLike<number>} out
   * @param {ArrayLike<number>|Array<ArrayLike<number>>|null} positions
   * @param {ArrayLike<number>} point
   * @returns {boolean}
  */
  static setBoundsFromPositions(out, positions, point)
  {
    const count = this.getPositionCount(positions);
    let found = false;
    for (let index = 0; index < count; index++)
    {
      if (!this.copyPosition(point, positions, index)) continue;
      if (!found)
      {
        out[0] = out[3] = point[0];
        out[1] = out[4] = point[1];
        out[2] = out[5] = point[2];
        found = true;
        continue;
      }
      out[0] = Math.min(out[0], point[0]);
      out[1] = Math.min(out[1], point[1]);
      out[2] = Math.min(out[2], point[2]);
      out[3] = Math.max(out[3], point[0]);
      out[4] = Math.max(out[4], point[1]);
      out[5] = Math.max(out[5], point[2]);
    }
    return found;
  }

  /**
   * Calculates a bounding sphere from positions using caller-owned scratch.
   *
   * @param {ArrayLike<number>} out
   * @param {ArrayLike<number>|Array<ArrayLike<number>>|null} positions
   * @param {ArrayLike<number>} point
   * @returns {boolean}
  */
  static setSphereFromPositions(out, positions, point)
  {
    const count = this.getPositionCount(positions);
    let
      found = false,
      minX = Infinity,
      minY = Infinity,
      minZ = Infinity,
      maxX = -Infinity,
      maxY = -Infinity,
      maxZ = -Infinity;

    for (let index = 0; index < count; index++)
    {
      if (!this.copyPosition(point, positions, index)) continue;
      minX = Math.min(minX, point[0]);
      minY = Math.min(minY, point[1]);
      minZ = Math.min(minZ, point[2]);
      maxX = Math.max(maxX, point[0]);
      maxY = Math.max(maxY, point[1]);
      maxZ = Math.max(maxZ, point[2]);
      found = true;
    }
    if (!found) return false;

    out[0] = (minX + maxX) * 0.5;
    out[1] = (minY + maxY) * 0.5;
    out[2] = (minZ + maxZ) * 0.5;
    let maxSquaredRadius = 0;
    for (let index = 0; index < count; index++)
    {
      if (!this.copyPosition(point, positions, index)) continue;
      const
        x = out[0] - point[0],
        y = out[1] - point[1],
        z = out[2] - point[2];
      maxSquaredRadius = Math.max(maxSquaredRadius, x * x + y * y + z * z);
    }
    out[3] = Math.sqrt(maxSquaredRadius);
    return true;
  }

  /**
   * Calculates a mesh sphere from positions or existing bounds.
   *
   * @param {ArrayLike<number>} out
   * @param {object} mesh
   * @param {ArrayLike<number>} point
   * @returns {boolean}
  */
  static calculateMeshSphere(out, mesh, point)
  {
    if (this.setSphereFromPositions(out, this.getMeshPositions(mesh), point)) return true;
    const bounds = this.getBounds(mesh);
    if (!bounds) return false;
    sph3.fromBounds(out, bounds.min, bounds.max);
    return true;
  }

  /**
   * Stores a calculated sphere in the mesh's canonical sphere fields.
   *
   * @param {object} mesh
   * @param {ArrayLike<number>} sphere
   * @returns {void}
  */
  static setMeshSphere(mesh, sphere)
  {
    if (mesh.sphere && typeof mesh.sphere.set === "function") mesh.sphere.set(sphere);
    else mesh.sphere = [ ...sphere ];
    if (mesh.boundingSphere && typeof mesh.boundingSphere.set === "function")
    {
      mesh.boundingSphere.set(sphere);
    }
    else if ("boundingSphere" in mesh)
    {
      mesh.boundingSphere = [ ...sphere ];
    }
  }

  /**
   * Intersects a ray with canonical CPU geometry.
   *
   * @param {Array<object>|null} meshes
   * @param {ArrayLike<number>} position
   * @param {ArrayLike<number>} direction
   * @param {number} areaIndex
   * @returns {object}
  */
  static intersectGeometry(meshes, position, direction, areaIndex)
  {
    this.validateRayVector(position, "position");
    this.validateRayVector(direction, "direction");
    const
      ray = ray3.from(ray3.alloc(), position, direction),
      point = vec3.alloc(),
      vertexA = vec3.alloc(),
      vertexB = vec3.alloc(),
      vertexC = vec3.alloc(),
      normal = vec3.alloc();
    let nearest = null;
    try
    {
      for (let meshIndex = 0; meshIndex < (meshes?.length || 0); meshIndex++)
      {
        const mesh = meshes[meshIndex];
        const positions = this.getMeshPositions(mesh);
        if (!positions) continue;
        const groups = mesh?.indices || mesh?.lods?.[0]?.indices || null;
        if (ArrayBuffer.isView(groups)
          || (Array.isArray(groups) && typeof groups[0] === "number"))
        {
          if (areaIndex !== -1 && areaIndex !== 0) continue;
          nearest = this.intersectFaces(
            nearest,
            groups,
            0,
            mesh,
            meshIndex,
            positions,
            position,
            ray,
            point,
            vertexA,
            vertexB,
            vertexC,
            normal
          );
          continue;
        }
        if (Array.isArray(groups))
        {
          for (let groupIndex = 0; groupIndex < groups.length; groupIndex++)
          {
            if (areaIndex !== -1 && areaIndex !== groupIndex) continue;
            const faces = groups[groupIndex]?.faces || groups[groupIndex]?.indices || [];
            nearest = this.intersectFaces(
              nearest,
              faces,
              groupIndex,
              mesh,
              meshIndex,
              positions,
              position,
              ray,
              point,
              vertexA,
              vertexB,
              vertexC,
              normal
            );
          }
          continue;
        }
        if (areaIndex === -1 || areaIndex === 0)
        {
          nearest = this.intersectFaces(
            nearest,
            null,
            0,
            mesh,
            meshIndex,
            positions,
            position,
            ray,
            point,
            vertexA,
            vertexB,
            vertexC,
            normal
          );
        }
      }
      return nearest || {
        hit: false,
        boneIndex: -1,
        point: [ 0, 0, 0 ],
        normal: [ 0, 0, 0 ],
        distance: Infinity,
        meshIndex: -1,
        areaIndex
      };
    }
    finally
    {
      vec3.unalloc(normal);
      vec3.unalloc(vertexC);
      vec3.unalloc(vertexB);
      vec3.unalloc(vertexA);
      vec3.unalloc(point);
      ray3.unalloc(ray);
    }
  }

  /**
   * Validates a caller-provided ray vector.
   *
   * @param {ArrayLike<number>} value
   * @param {string} name
   * @returns {void}
  */
  static validateRayVector(value, name)
  {
    if (!value
      || value.length < 3
      || !Number.isFinite(value[0])
      || !Number.isFinite(value[1])
      || !Number.isFinite(value[2]))
    {
      throw new TypeError(`TriGeometryRes ray ${name} must contain three finite numbers.`);
    }
  }

  /**
   * Intersects a ray with one flat face list.
   *
   * @param {object|null} nearest
   * @param {ArrayLike<number>|null} faces
   * @param {number} areaIndex
   * @param {object} mesh
   * @param {number} meshIndex
   * @param {ArrayLike<number>|Array<ArrayLike<number>>} positions
   * @param {ArrayLike<number>} rayOrigin
   * @param {ArrayLike<number>} ray
   * @param {ArrayLike<number>} point
   * @param {ArrayLike<number>} vertexA
   * @param {ArrayLike<number>} vertexB
   * @param {ArrayLike<number>} vertexC
   * @param {ArrayLike<number>} normal
   * @returns {object|null}
  */
  static intersectFaces(
    nearest,
    faces,
    areaIndex,
    mesh,
    meshIndex,
    positions,
    rayOrigin,
    ray,
    point,
    vertexA,
    vertexB,
    vertexC,
    normal
  )
  {
    const count = faces?.length ?? this.getPositionCount(positions);
    for (let index = 0; index + 2 < count; index += 3)
    {
      const
        vertexIndexA = faces ? faces[index] : index,
        vertexIndexB = faces ? faces[index + 1] : index + 1,
        vertexIndexC = faces ? faces[index + 2] : index + 2;
      if (!this.copyPosition(vertexA, positions, vertexIndexA)
        || !this.copyPosition(vertexB, positions, vertexIndexB)
        || !this.copyPosition(vertexC, positions, vertexIndexC)
        || !ray3.getIntersectVertices(
          point,
          ray,
          vertexA,
          vertexB,
          vertexC,
          false
        ))
      {
        continue;
      }
      const distance = vec3.distance(rayOrigin, point);
      if (nearest && nearest.distance <= distance) continue;
      if (!nearest)
      {
        nearest = {
          hit: true,
          boneIndex: -1,
          point: [ 0, 0, 0 ],
          normal: [ 0, 0, 0 ],
          distance,
          meshIndex,
          areaIndex
        };
      }
      nearest.boneIndex = this.getMeshBoneIndex(mesh, vertexIndexA);
      vec3.copy(nearest.point, point);
      triangleNormalTo(normal, vertexA, vertexB, vertexC);
      vec3.copy(nearest.normal, normal);
      nearest.distance = distance;
      nearest.meshIndex = meshIndex;
      nearest.areaIndex = areaIndex;
    }
    return nearest;
  }

  /**
   * Copies one flat or nested position into caller-owned output.
   *
   * @param {ArrayLike<number>} out
   * @param {ArrayLike<number>|Array<ArrayLike<number>>} positions
   * @param {number} index
   * @returns {boolean}
  */
  static copyPosition(out, positions, index)
  {
    if (!Number.isInteger(index) || index < 0) return false;
    if (typeof positions[0] === "number")
    {
      const offset = index * 3;
      if (offset + 2 >= positions.length) return false;
      out[0] = positions[offset];
      out[1] = positions[offset + 1];
      out[2] = positions[offset + 2];
      return true;
    }
    const point = positions[index];
    if (!point || point.length < 3) return false;
    out[0] = point[0];
    out[1] = point[1];
    out[2] = point[2];
    return true;
  }

  /**
   * Gets the first blend index for a mesh vertex.
   *
   * @param {object} mesh
   * @param {number} vertexIndex
   * @returns {number}
  */
  static getMeshBoneIndex(mesh, vertexIndex)
  {
    const indices = mesh?.vertex?.blendIndices || mesh?.blendIndices;
    if (!indices) return -1;
    if (typeof indices[0] === "number")
    {
      return Number(indices[vertexIndex * 4] ?? indices[vertexIndex] ?? -1);
    }
    return Number(indices[vertexIndex]?.[0] ?? -1);
  }

}

// Declared as data rather than with decorators, so the resource tree loads from
// source without a transform. Field order is key order, and GetValues() exports
// in that order.
CjsSchema.define(TriGeometryRes, {
  className: "TriGeometryRes",
  family: "resources",
  fields: {
    forceLod: [ type.boolean, io.readwrite ],
    forcedLodIndex: [ type.int32, io.readwrite ],
    name: [ type.string, io.readwrite ]
  },
  methods: {
    GetMeshCount: [ carbon.method, impl.adapted ],
    GetAnimationCount: [ carbon.method, impl.adapted ],
    GetSkeletonCount: [ carbon.method, impl.adapted ],
    GetSkeletonData: [ carbon.method, impl.adapted ],
    GetMeshAreaCount: [ carbon.method, impl.adapted ],
    GetLodIndexForScreenSize: [ carbon.method, impl.adapted ],
    GetMeshLod: [ carbon.method, impl.adapted ],
    GetMeshLodByIndex: [ carbon.method, impl.adapted ],
    GetMeshName: [ carbon.method, impl.adapted ],
    GetMeshAreaName: [ carbon.method, impl.adapted ],
    GetAreaBoundingBox: [ carbon.method, impl.adapted ],
    GetBoundingBox: [ carbon.method, impl.adapted ],
    GetBoundingSphere: [ carbon.method, impl.adapted ],
    CalculateBoundingBoxFromTransform: [ carbon.method, impl.adapted ],
    RecalculateBoundingSphere: [ carbon.method, impl.adapted ],
    Reload: [ carbon.method, impl.notSupported ],
    GetIntersectionPointNormalBone: [ carbon.method, impl.adapted ],
    GetAreaIntersectionPointNormalBone: [ carbon.method, impl.adapted ],
    GetMeshVertexElements: [ carbon.method, impl.adapted ],
    SaveMesh: [ carbon.method, impl.notSupported ]
  }
});
