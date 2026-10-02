// Source: trinity/trinity/Resources/TriGeometryRes.h
// Schema: format-carbon resources/TriMorphTargetGeometryConstants.json; maintained by the runtime resource layer.
import { CjsSchema, meta } from "#schema";

/** Data record mirroring Carbon's morph-target geometry constants: vertex-buffer stride, position/tangent offsets and types, and vertex count. */
export class TriMorphTargetGeometryConstants
{

  /** vertexBufferStride (uint32_t) */
  vertexBufferStride = 0;

  /** positionOffset (uint32_t) */
  positionOffset = 0;

  /** positionType (uint32_t) */
  positionType = 0;

  /** tangentOffset (uint32_t) */
  tangentOffset = 0;

  /** tangentType (uint32_t) */
  tangentType = 0;

  /** vertexCount (uint32_t) */
  vertexCount = 0;

}

CjsSchema.define(TriMorphTargetGeometryConstants, {
  className: "TriMorphTargetGeometryConstants", family: "resources",
  fields: {
    vertexBufferStride: meta.type.uint32,
    positionOffset: meta.type.uint32,
    positionType: meta.type.uint32,
    tangentOffset: meta.type.uint32,
    tangentType: meta.type.uint32,
    vertexCount: meta.type.uint32
  }
});
