// Source: trinity/trinity/Resources/TriGeometryRes.h
// Schema: format-carbon resources/TriRtGeometryConstants.json; maintained by the runtime resource layer.
import { type } from "#schema";
import { CjsModel } from "#model";

/** TriRtGeometryConstants (resources) - maintained from schema shapeHash cb7de752.... */
@type.define({ className: "TriRtGeometryConstants", family: "resources" })
export class TriRtGeometryConstants extends CjsModel
{

  /** indexBufferId (uint32_t) */
  @type.uint32
  indexBufferId = 0;

  /** indexBufferStride (uint32_t) */
  @type.uint32
  indexBufferStride = 0;

  /** indexOffset (uint32_t) */
  @type.uint32
  indexOffset = 0;

  /** vertexBufferId (uint32_t) */
  @type.uint32
  vertexBufferId = 0;

  /** vertexBufferStride (uint32_t) */
  @type.uint32
  vertexBufferStride = 0;

  /** positionOffset (uint32_t) */
  @type.uint32
  positionOffset = 0;

  /** positionType (uint32_t) */
  @type.uint32
  positionType = 0;

  /** normalOffset (uint32_t) */
  @type.uint32
  normalOffset = 0;

  /** normalType (uint32_t) */
  @type.uint32
  normalType = 0;

  /** tangentOffset (uint32_t) */
  @type.uint32
  tangentOffset = 0;

  /** tangentType (uint32_t) */
  @type.uint32
  tangentType = 0;

  /** bitangentOffset (uint32_t) */
  @type.uint32
  bitangentOffset = 0;

  /** bitangentType (uint32_t) */
  @type.uint32
  bitangentType = 0;

  /** texCoord0Offset (uint32_t) */
  @type.uint32
  texCoord0Offset = 0;

  /** texCoord0Type (uint32_t) */
  @type.uint32
  texCoord0Type = 0;

  /** texCoord1Offset (uint32_t) */
  @type.uint32
  texCoord1Offset = 0;

  /** texCoord1Type (uint32_t) */
  @type.uint32
  texCoord1Type = 0;

  /** texCoord2Offset (uint32_t) */
  @type.uint32
  texCoord2Offset = 0;

  /** texCoord2Type (uint32_t) */
  @type.uint32
  texCoord2Type = 0;

  /** padding (uint32_t) */
  @type.uint32
  padding = 0;

}
