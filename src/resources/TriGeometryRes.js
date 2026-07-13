// Source: trinity/trinity/Resources/TriGeometryRes.h
// Source: trinity/trinity/Resources/TriGeometryRes.cpp
// Source: trinity/trinity/Resources/TriGeometryRes_Blue.cpp
import { carbon, impl, io, type } from "@carbonenginejs/core-types/schema";
import { CjsResource } from "../CjsResource.js";
import { CarbonStubError } from "./resourceBoundary.js";

/**
 * TriGeometryRes resource record.
 *
 * Geometry payload facts live here. Engine-gpu decides if and how they become
 * device buffers, vertex declarations, or draw-time state.
 */
@type.define({ className: "TriGeometryRes", family: "resources" })
export class TriGeometryRes extends CjsResource
{

  @io.readwrite
  @type.boolean
  forceLod = false;

  @io.readwrite
  @type.int32
  forcedLodIndex = -1;

  @io.readwrite
  @type.string
  name = "";

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
   * Attach a geometry DTO.
   *
   * @param {object|null} dto
   * @param {object|null} options
   * @returns {TriGeometryRes}
   */
  SetDTO(dto = null, options = null)
  {
    super.SetDTO(dto);
    this.SetValues(options || {});
    return this;
  }

  /**
   * Get mesh count from the CPU geometry payload.
   *
   * @returns {number}
   */
  @carbon.method
  @impl.adapted
  GetMeshCount()
  {
    return this.GetDTO()?.meshes?.length || 0;
  }

  /**
   * Get animation count from the CPU geometry DTO.
   *
   * @returns {number}
   */
  @carbon.method
  @impl.adapted
  GetAnimationCount()
  {
    return this.GetDTO()?.animations?.length || 0;
  }

  /**
   * Get mesh area count from a CPU geometry payload mesh.
   *
   * @param {number} meshIndex
   * @returns {number}
   */
  @carbon.method
  @impl.adapted
  GetMeshAreaCount(meshIndex = 0)
  {
    const mesh = this.GetDTO()?.meshes?.[meshIndex];
    return mesh?.areas?.length || 0;
  }

  /**
   * Get mesh name from a CPU geometry payload.
   *
   * @param {number} meshIndex
   * @returns {string}
   */
  @carbon.method
  @impl.adapted
  GetMeshName(meshIndex = 0)
  {
    return this.GetDTO()?.meshes?.[meshIndex]?.name || "";
  }

  /**
   * Get mesh area name from a CPU geometry payload.
   *
   * @param {number} meshIndex
   * @param {number} areaIndex
   * @returns {string}
   */
  @carbon.method
  @impl.adapted
  GetMeshAreaName(meshIndex = 0, areaIndex = 0)
  {
    return this.GetDTO()?.meshes?.[meshIndex]?.areas?.[areaIndex]?.name || "";
  }

  /**
   * Get area bounding box from geometry payload data.
   *
   * @param {number} meshIndex
   * @param {number} areaIndex
   * @returns {*}
   */
  @carbon.method
  @impl.adapted
  GetAreaBoundingBox(meshIndex = 0, areaIndex = 0)
  {
    return this.GetDTO()?.meshes?.[meshIndex]?.areas?.[areaIndex]?.bounds || null;
  }

  /**
   * Get mesh bounding box from geometry payload data.
   * TODO: Should have a box3 as an argument, and write the result to that box3
   *
   * @param {number} meshIndex
   * @returns {*}
   */
  @carbon.method
  @impl.adapted
  GetBoundingBox(meshIndex = 0)
  {
    return this.GetDTO()?.meshes?.[meshIndex]?.bounds || this.GetDTO()?.bounds || null;
  }

  /**
   * Get mesh bounding sphere from geometry payload data.
   * TODO: Should have a sph4 as an argument, and write the result to that sph4
   *
   * @param {number} meshIndex
   * @returns {*}
   */
  @carbon.method
  @impl.adapted
  GetBoundingSphere(meshIndex = 0)
  {
    return this.GetDTO()?.meshes?.[meshIndex]?.sphere || this.GetDTO()?.sphere || null;
  }

  /**
   * Calculate a transformed bounding box for a mesh.
   *
   * @throws {Error}
   */
  @carbon.method
  @impl.notImplemented
  CalculateBoundingBoxFromTransform()
  {
    throw CarbonStubError("TriGeometryRes", "CalculateBoundingBoxFromTransform");
  }

  /**
   * Recalculate bounding sphere data.
   *
   * @throws {Error}
   */
  @carbon.method
  @impl.notImplemented
  RecalculateBoundingSphere()
  {
    throw CarbonStubError("TriGeometryRes", "RecalculateBoundingSphere");
  }

  /**
   * Reload this geometry resource.
   *
   * @throws {Error}
   */
  @carbon.method
  @impl.notImplemented
  Reload() {
    throw CarbonStubError("TriGeometryRes", "Reload");
  }

  /**
   * Intersect a ray with this geometry resource.
   *
   * @throws {Error}
   */
  @carbon.method
  @impl.notImplemented
  GetIntersectionPointNormalBone()
  {
    throw CarbonStubError("TriGeometryRes", "GetIntersectionPointNormalBone");
  }

  /**
   * Intersect a ray with a single mesh area.
   *
   * @throws {Error}
   */
  @carbon.method
  @impl.notImplemented
  GetAreaIntersectionPointNormalBone()
  {
    throw CarbonStubError("TriGeometryRes", "GetAreaIntersectionPointNormalBone");
  }

  /**
   * Get vertex element descriptors for a mesh.
   *
   * @param {number} meshIndex
   * @returns {Array<*>}
   */
  @carbon.method
  @impl.adapted
  GetMeshVertexElements(meshIndex = 0)
  {
    return this.GetDTO()?.meshes?.[meshIndex]?.vertexElements || [];
  }

  /**
   * Save a mesh to a Granny file.
   *
   * @throws {Error}
   */
  @carbon.method
  @impl.notImplemented
  SaveMesh()
  {
    throw CarbonStubError("TriGeometryRes", "SaveMesh");
  }

  static payload = "geometry";

}
