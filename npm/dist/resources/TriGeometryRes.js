import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsResource as _CjsResource } from '../CjsResource.js';
import { AssertResourcePayloadObject, AssertResourcePayloadArray, ResourcePayloadError, CarbonStubError } from './resourceBoundary.js';

let _initProto, _initClass, _init_forceLod, _init_extra_forceLod, _init_forcedLodIndex, _init_extra_forcedLodIndex, _init_name, _init_extra_name;

/**
 * TriGeometryRes resource record.
 *
 * Geometry payload facts live here. Engine-gpu decides if and how they become
 * device buffers, vertex declarations, or draw-time state.
 */
let _TriGeometryRes;
new class extends _identity {
  static [class TriGeometryRes extends _CjsResource {
    static {
      ({
        e: [_init_forceLod, _init_extra_forceLod, _init_forcedLodIndex, _init_extra_forcedLodIndex, _init_name, _init_extra_name, _initProto],
        c: [_TriGeometryRes, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "TriGeometryRes",
        family: "resources"
      })], [[[io, io.readwrite, type, type.boolean], 16, "forceLod"], [[io, io.readwrite, type, type.int32], 16, "forcedLodIndex"], [[io, io.readwrite, type, type.string], 16, "name"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetMeshCount"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetAnimationCount"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetSkeletonCount"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetSkeletonData"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetMeshAreaCount"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetMeshName"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetMeshAreaName"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetAreaBoundingBox"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetBoundingBox"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetBoundingSphere"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "CalculateBoundingBoxFromTransform"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "RecalculateBoundingSphere"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "Reload"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "GetIntersectionPointNormalBone"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "GetAreaIntersectionPointNormalBone"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetMeshVertexElements"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "SaveMesh"]], 0, void 0, _CjsResource));
    }
    forceLod = (_initProto(this), _init_forceLod(this, false));
    forcedLodIndex = (_init_extra_forceLod(this), _init_forcedLodIndex(this, -1));
    name = (_init_extra_forcedLodIndex(this), _init_name(this, ""));
    constructor(values = null) {
      super(), _init_extra_name(this);
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
    SetPayload(payload = null, options = null) {
      if (payload === null) {
        super.SetPayload(null);
        return this;
      }
      AssertResourcePayloadObject("TriGeometryRes", payload);
      AssertResourcePayloadArray("TriGeometryRes", payload, "meshes");
      for (const field of ["skeletons", "animations"]) {
        if (payload[field] !== undefined && !Array.isArray(payload[field])) {
          throw ResourcePayloadError("TriGeometryRes", "Expected an array when provided.", field);
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
    GetMeshCount() {
      return this.GetPayload()?.meshes?.length || 0;
    }

    /**
     * Get animation count from the CPU geometry payload.
     *
     * @returns {number}
     */
    GetAnimationCount() {
      return this.GetPayload()?.animations?.length || 0;
    }

    /**
     * Get skeleton count from the CPU geometry payload.
     *
     * @returns {number}
     */
    GetSkeletonCount() {
      return this.GetPayload()?.skeletons?.length || 0;
    }

    /**
     * Get one resource-owned skeleton from the CPU geometry payload.
     *
     * @param {number} skeletonIndex
     * @returns {*}
     */
    GetSkeletonData(skeletonIndex = 0) {
      const index = Number(skeletonIndex);
      if (!Number.isInteger(index) || index < 0) {
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
    GetMeshAreaCount(meshIndex = 0) {
      const mesh = this.GetPayload()?.meshes?.[meshIndex];
      return mesh?.areas?.length || 0;
    }

    /**
     * Get mesh name from a CPU geometry payload.
     *
     * @param {number} meshIndex
     * @returns {string}
     */
    GetMeshName(meshIndex = 0) {
      return this.GetPayload()?.meshes?.[meshIndex]?.name || "";
    }

    /**
     * Get mesh area name from a CPU geometry payload.
     *
     * @param {number} meshIndex
     * @param {number} areaIndex
     * @returns {string}
     */
    GetMeshAreaName(meshIndex = 0, areaIndex = 0) {
      return this.GetPayload()?.meshes?.[meshIndex]?.areas?.[areaIndex]?.name || "";
    }

    /**
     * Get area bounding box from geometry payload data.
     *
     * @param {number} meshIndex
     * @param {number} areaIndex
     * @returns {*}
     */
    GetAreaBoundingBox(meshIndex = 0, areaIndex = 0) {
      return this.GetPayload()?.meshes?.[meshIndex]?.areas?.[areaIndex]?.bounds || null;
    }

    /**
     * Get mesh bounding box from geometry payload data.
     * TODO: Should have a box3 as an argument, and write the result to that box3
     *
     * @param {number} meshIndex
     * @returns {*}
     */
    GetBoundingBox(meshIndex = 0) {
      return this.GetPayload()?.meshes?.[meshIndex]?.bounds || this.GetPayload()?.bounds || null;
    }

    /**
     * Get mesh bounding sphere from geometry payload data.
     * TODO: Should have a sph4 as an argument, and write the result to that sph4
     *
     * @param {number} meshIndex
     * @returns {*}
     */
    GetBoundingSphere(meshIndex = 0) {
      return this.GetPayload()?.meshes?.[meshIndex]?.sphere || this.GetPayload()?.sphere || null;
    }

    /**
     * Calculate a transformed bounding box for a mesh.
     *
     * @throws {Error}
     */
    CalculateBoundingBoxFromTransform() {
      throw CarbonStubError("TriGeometryRes", "CalculateBoundingBoxFromTransform");
    }

    /**
     * Recalculate bounding sphere data.
     *
     * @throws {Error}
     */
    RecalculateBoundingSphere() {
      throw CarbonStubError("TriGeometryRes", "RecalculateBoundingSphere");
    }

    /**
     * Reload this geometry resource.
     *
     * @throws {Error}
     */
    Reload() {
      throw CarbonStubError("TriGeometryRes", "Reload");
    }

    /**
     * Intersect a ray with this geometry resource.
     *
     * @throws {Error}
     */
    GetIntersectionPointNormalBone() {
      throw CarbonStubError("TriGeometryRes", "GetIntersectionPointNormalBone");
    }

    /**
     * Intersect a ray with a single mesh area.
     *
     * @throws {Error}
     */
    GetAreaIntersectionPointNormalBone() {
      throw CarbonStubError("TriGeometryRes", "GetAreaIntersectionPointNormalBone");
    }

    /**
     * Get vertex element descriptors for a mesh.
     *
     * @param {number} meshIndex
     * @returns {Array<*>}
     */
    GetMeshVertexElements(meshIndex = 0) {
      return this.GetPayload()?.meshes?.[meshIndex]?.vertexElements || [];
    }

    /**
     * Save a mesh to a Granny file.
     *
     * @throws {Error}
     */
    SaveMesh() {
      throw CarbonStubError("TriGeometryRes", "SaveMesh");
    }
  }];
  payload = "geometry";
  constructor() {
    super(_TriGeometryRes), _initClass();
  }
}();

export { _TriGeometryRes as TriGeometryRes };
//# sourceMappingURL=TriGeometryRes.js.map
