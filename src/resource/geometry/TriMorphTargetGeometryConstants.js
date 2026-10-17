// Source: trinity/trinity/Resources/TriGeometryRes.h
// Schema: format-carbon resources/TriMorphTargetGeometryConstants.json; maintained by the runtime resource layer.
import { CjsSchema, type } from "#schema";

/** Data record mirroring Carbon's morph-target geometry constants: vertex-buffer stride, position/tangent offsets and types, and vertex count. */
export class TriMorphTargetGeometryConstants
{

  /** vertexBufferStride (uint32_t). Carbon leaves it unset (TriGeometryRes.h:91). */
  vertexBufferStride = 0;

  /** positionOffset (uint32_t). Carbon leaves it unset (TriGeometryRes.h:93). */
  positionOffset = 0;

  /** positionType (uint32_t). Carbon leaves it unset (TriGeometryRes.h:94). */
  positionType = 0;

  /** tangentOffset (uint32_t). Carbon leaves it unset (TriGeometryRes.h:96). */
  tangentOffset = 0;

  /** tangentType (uint32_t). Carbon leaves it unset (TriGeometryRes.h:97). */
  tangentType = 0;

  /** vertexCount (uint32_t). Carbon leaves it unset (TriGeometryRes.h:99). */
  vertexCount = 0;

}

CjsSchema.blue.define(TriMorphTargetGeometryConstants, {
  className: "TriMorphTargetGeometryConstants",
  fields: {
    vertexBufferStride: type.uint32,
    positionOffset: type.uint32,
    positionType: type.uint32,
    tangentOffset: type.uint32,
    tangentType: type.uint32,
    vertexCount: type.uint32
  }
});
