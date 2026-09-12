// Source: trinity/trinity/Resources/TriGeometryRes.h
// Schema: format-carbon resources/TriRtGeometryConstants.json; maintained by the runtime resource layer.
import { CjsSchema, type } from "#schema";
import { CjsModel } from "#model";

/** TriRtGeometryConstants (resources) - maintained from schema shapeHash cb7de752.... */
export class TriRtGeometryConstants extends CjsModel
{

  /** indexBufferId (uint32_t) */
  indexBufferId = 0;

  /** indexBufferStride (uint32_t) */
  indexBufferStride = 0;

  /** indexOffset (uint32_t) */
  indexOffset = 0;

  /** vertexBufferId (uint32_t) */
  vertexBufferId = 0;

  /** vertexBufferStride (uint32_t) */
  vertexBufferStride = 0;

  /** positionOffset (uint32_t) */
  positionOffset = 0;

  /** positionType (uint32_t) */
  positionType = 0;

  /** normalOffset (uint32_t) */
  normalOffset = 0;

  /** normalType (uint32_t) */
  normalType = 0;

  /** tangentOffset (uint32_t) */
  tangentOffset = 0;

  /** tangentType (uint32_t) */
  tangentType = 0;

  /** bitangentOffset (uint32_t) */
  bitangentOffset = 0;

  /** bitangentType (uint32_t) */
  bitangentType = 0;

  /** texCoord0Offset (uint32_t) */
  texCoord0Offset = 0;

  /** texCoord0Type (uint32_t) */
  texCoord0Type = 0;

  /** texCoord1Offset (uint32_t) */
  texCoord1Offset = 0;

  /** texCoord1Type (uint32_t) */
  texCoord1Type = 0;

  /** texCoord2Offset (uint32_t) */
  texCoord2Offset = 0;

  /** texCoord2Type (uint32_t) */
  texCoord2Type = 0;

  /** padding (uint32_t) */
  padding = 0;

}

CjsSchema.define(TriRtGeometryConstants, {
  className: "TriRtGeometryConstants", family: "resources",
  fields: {
    indexBufferId: type.uint32,
    indexBufferStride: type.uint32,
    indexOffset: type.uint32,
    vertexBufferId: type.uint32,
    vertexBufferStride: type.uint32,
    positionOffset: type.uint32,
    positionType: type.uint32,
    normalOffset: type.uint32,
    normalType: type.uint32,
    tangentOffset: type.uint32,
    tangentType: type.uint32,
    bitangentOffset: type.uint32,
    bitangentType: type.uint32,
    texCoord0Offset: type.uint32,
    texCoord0Type: type.uint32,
    texCoord1Offset: type.uint32,
    texCoord1Type: type.uint32,
    texCoord2Offset: type.uint32,
    texCoord2Type: type.uint32,
    padding: type.uint32
  }
});
