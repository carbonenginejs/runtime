// Source: trinity/trinity/Resources/TriGeometryRes.h
// Schema: format-carbon resources/TriMorphTargetGeometryConstants.json; maintained by runtime-resource.
import { type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/** TriMorphTargetGeometryConstants (resources) - maintained from schema shapeHash d650628c.... */
@type.define({ className: "TriMorphTargetGeometryConstants", family: "resources" })
export class TriMorphTargetGeometryConstants extends CjsModel
{

  /** vertexBufferStride (uint32_t) */
  @type.uint32
  vertexBufferStride = 0;

  /** positionOffset (uint32_t) */
  @type.uint32
  positionOffset = 0;

  /** positionType (uint32_t) */
  @type.uint32
  positionType = 0;

  /** tangentOffset (uint32_t) */
  @type.uint32
  tangentOffset = 0;

  /** tangentType (uint32_t) */
  @type.uint32
  tangentType = 0;

  /** vertexCount (uint32_t) */
  @type.uint32
  vertexCount = 0;

}
