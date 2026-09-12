// Source: trinity/trinity/Resources/TriGeometryRes.h
// Schema: format-carbon resources/TriMorphTargetGeometryConstants.json; maintained by the runtime resource layer.
import { CjsSchema, type } from "#schema";
import { CjsModel } from "#model";

/** TriMorphTargetGeometryConstants (resources) - maintained from schema shapeHash d650628c.... */
export class TriMorphTargetGeometryConstants extends CjsModel
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
    vertexBufferStride: type.uint32,
    positionOffset: type.uint32,
    positionType: type.uint32,
    tangentOffset: type.uint32,
    tangentType: type.uint32,
    vertexCount: type.uint32
  }
});
