// Source: trinity/trinity/Resources/TriGeometryRes.h
// Source: trinity/trinity/Resources/TriGeometryRes.cpp
import { CjsSchema, type } from "#schema";
import { CjsResource } from "../CjsResource.js";


/** CPU raycast session resource borrowed from a resident TriGeometryRes. */
export class Tr2RaycastGeometryRes extends CjsResource
{
  lodIndices = [];

  bvh = null;

  #source = null;

  /**
   * Carbon SetLodIndices (TriGeometryRes.cpp:78-81): one assignment, but
   * load-bearing - DoLoad validates the count against the CMF's mesh count
   * and each index against that mesh's LOD count, failing the load otherwise
   * (cpp:110-124), so the indices must be set before the load runs.
   */
  SetLodIndices(lodIndices)
  {
    this.lodIndices = lodIndices;
  }

  /**
   * Carbon GetBVH (TriGeometryRes.cpp:83-86): the CPU bounding-volume
   * hierarchy DoLoad built, by mutable reference. Null until this runtime
   * grows the BVH type; the accessor is the contract callers hold.
   */
  GetBVH()
  {
    return this.bvh;
  }

  /** Attaches the resident geometry that answers this raycast session. */
  SetSource(source)
  {
    this.#source = source;
    this.state = CjsResource.State.PREPARED;
    return this;
  }

  /** Appends ray intersections from the attached resident geometry. */
  GetIntersectionPoints(position, direction, result, areaIndex = -1, rayLength = Infinity)
  {
    if (!this.#source)
    {
      throw new Error("Tr2RaycastGeometryRes has no resident geometry source.");
    }
    return this.#source._IntersectRaycastGeometry(
      position, direction, result, areaIndex, rayLength);
  }
}


CjsSchema.define(Tr2RaycastGeometryRes, {
  className: "Tr2RaycastGeometryRes",
  family: "resources",
  fields: {
    lodIndices: type.list("int32_t"),
    bvh: type.rawStruct("BVH::BoundingVolumeHierarchy")
  }
});
