import { blue as blueService } from "#blue/blue";
// Source: trinity/trinity/Resources/TriGeometryRes.h
// Source: trinity/trinity/Resources/TriGeometryRes.cpp
import { CjsSchema, type, blue } from "#schema";
import { BlueAsyncRes } from "#blue";


/** CPU raycast session resource borrowed from a resident TriGeometryRes. */
export class Tr2RaycastGeometryRes extends BlueAsyncRes
{
  lodIndices = [];

  bvh = null;

  _source = null;

  /**
   * Carbon SetLodIndices (TriGeometryRes.cpp:78-81): one assignment, but
   * load-bearing - DoLoad validates the count against the CMF's mesh count
   * and each index against that mesh's LOD count, failing the load otherwise
   * (cpp:110-124), so the indices must be set before the load runs.
   *
   * @implemented
   */
  SetLodIndices(lodIndices)
  {
    this.lodIndices = lodIndices;
  }

  /**
   * Carbon GetBVH (TriGeometryRes.cpp:83-86): the CPU bounding-volume
   * hierarchy DoLoad built, by mutable reference. Null until this runtime
   * grows the BVH type; the accessor is the contract callers hold.
   *
   * @adapted
   */
  GetBVH()
  {
    return this.bvh;
  }

  /**
   * Carbon: Tr2RaycastGeometryRes::DoPrepare (TriGeometryRes.cpp:130-133): nothing to
   * prepare. The BVH DoLoad builds is the whole resource; no device object is made.
   *
   * @implemented
   * @returns {boolean} Always true.
   */
  _DoPrepare()
  {
    return true;
  }

  /**
   * Attaches the resident geometry that answers this raycast session.
   *
   * @cjs
   * @implemented
   * @param {object} source Canonical geometry projection retained for CPU ray tests.
   */
  SetSource(source)
  {
    this._source = source;
    this._isPrepared = this._isGood = true;
    return this;
  }

  /** Appends ray intersections from the attached resident geometry. */
  GetIntersectionPoints(position, direction, result, areaIndex = -1, rayLength = Infinity)
  {
    if (!this._source)
    {
      throw new Error("Tr2RaycastGeometryRes has no resident geometry source.");
    }
    return this._source._IntersectRaycastGeometry(
      position, direction, result, areaIndex, rayLength);
  }
}



CjsSchema.decorateField(Tr2RaycastGeometryRes, "lodIndices", type.list("int32_t"));
CjsSchema.decorateField(Tr2RaycastGeometryRes, "bvh", type.rawStruct("BVH::BoundingVolumeHierarchy"));
CjsSchema.exposure.define("Tr2RaycastGeometryRes")(Tr2RaycastGeometryRes);
// Carbon: Tr2RaycastGeometryRes::ExposeToBlue (trinity/trinity/Resources/TriGeometryRes_Blue.cpp:33).
CjsSchema.blue.chainTo(BlueAsyncRes)(Tr2RaycastGeometryRes);

