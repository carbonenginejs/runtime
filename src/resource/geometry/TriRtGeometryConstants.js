// Source: trinity/trinity/Resources/TriGeometryRes.h
// Schema: format-carbon resources/TriRtGeometryConstants.json; maintained by the runtime resource layer.
import { CjsSchema, meta } from "#schema";

/** Data record mirroring Carbon's ray-tracing geometry constants: index/vertex buffer ids and strides plus attribute offsets and types. */
export class TriRtGeometryConstants
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
    indexBufferId: meta.type.uint32,
    indexBufferStride: meta.type.uint32,
    indexOffset: meta.type.uint32,
    vertexBufferId: meta.type.uint32,
    vertexBufferStride: meta.type.uint32,
    positionOffset: meta.type.uint32,
    positionType: meta.type.uint32,
    normalOffset: meta.type.uint32,
    normalType: meta.type.uint32,
    tangentOffset: meta.type.uint32,
    tangentType: meta.type.uint32,
    bitangentOffset: meta.type.uint32,
    bitangentType: meta.type.uint32,
    texCoord0Offset: meta.type.uint32,
    texCoord0Type: meta.type.uint32,
    texCoord1Offset: meta.type.uint32,
    texCoord1Type: meta.type.uint32,
    texCoord2Offset: meta.type.uint32,
    texCoord2Type: meta.type.uint32,
    padding: meta.type.uint32
  }
});
