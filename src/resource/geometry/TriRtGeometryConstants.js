// Source: trinity/trinity/Resources/TriGeometryRes.h
// Schema: format-carbon resources/TriRtGeometryConstants.json; maintained by the runtime resource layer.
import { CjsSchema, type } from "#schema";

/** Data record mirroring Carbon's ray-tracing geometry constants: index/vertex buffer ids and strides plus attribute offsets and types. */
export class TriRtGeometryConstants
{

  /** indexBufferId (uint32_t). Carbon leaves it unset (TriGeometryRes.h:57). */
  indexBufferId = 0;

  /** indexBufferStride (uint32_t). Carbon leaves it unset (TriGeometryRes.h:58). */
  indexBufferStride = 0;

  /** indexOffset (uint32_t). Carbon leaves it unset (TriGeometryRes.h:60). */
  indexOffset = 0;

  /** vertexBufferId (uint32_t). Carbon leaves it unset (TriGeometryRes.h:62). */
  vertexBufferId = 0;

  /** vertexBufferStride (uint32_t). Carbon leaves it unset (TriGeometryRes.h:63). */
  vertexBufferStride = 0;

  /** positionOffset (uint32_t). Carbon leaves it unset (TriGeometryRes.h:65). */
  positionOffset = 0;

  /** positionType (uint32_t). Carbon leaves it unset (TriGeometryRes.h:66). */
  positionType = 0;

  /** normalOffset (uint32_t). Carbon leaves it unset (TriGeometryRes.h:68). */
  normalOffset = 0;

  /** normalType (uint32_t). Carbon leaves it unset (TriGeometryRes.h:69). */
  normalType = 0;

  /** tangentOffset (uint32_t). Carbon leaves it unset (TriGeometryRes.h:71). */
  tangentOffset = 0;

  /** tangentType (uint32_t). Carbon leaves it unset (TriGeometryRes.h:72). */
  tangentType = 0;

  /** bitangentOffset (uint32_t). Carbon leaves it unset (TriGeometryRes.h:74). */
  bitangentOffset = 0;

  /** bitangentType (uint32_t). Carbon leaves it unset (TriGeometryRes.h:75). */
  bitangentType = 0;

  /** texCoord0Offset (uint32_t). Carbon leaves it unset (TriGeometryRes.h:77). */
  texCoord0Offset = 0;

  /** texCoord0Type (uint32_t). Carbon leaves it unset (TriGeometryRes.h:78). */
  texCoord0Type = 0;

  /** texCoord1Offset (uint32_t). Carbon leaves it unset (TriGeometryRes.h:80). */
  texCoord1Offset = 0;

  /** texCoord1Type (uint32_t). Carbon leaves it unset (TriGeometryRes.h:81). */
  texCoord1Type = 0;

  /** texCoord2Offset (uint32_t). Carbon leaves it unset (TriGeometryRes.h:83). */
  texCoord2Offset = 0;

  /** texCoord2Type (uint32_t). Carbon leaves it unset (TriGeometryRes.h:84). */
  texCoord2Type = 0;

  /** padding (uint32_t). Carbon leaves it unset (TriGeometryRes.h:86). */
  padding = 0;

}

CjsSchema.blue.define(TriRtGeometryConstants, {
  className: "TriRtGeometryConstants",
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
