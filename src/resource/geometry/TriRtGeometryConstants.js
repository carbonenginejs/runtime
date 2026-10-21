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

CjsSchema.decorateField(TriRtGeometryConstants, "indexBufferId", type.uint32);
CjsSchema.decorateField(TriRtGeometryConstants, "indexBufferStride", type.uint32);
CjsSchema.decorateField(TriRtGeometryConstants, "indexOffset", type.uint32);
CjsSchema.decorateField(TriRtGeometryConstants, "vertexBufferId", type.uint32);
CjsSchema.decorateField(TriRtGeometryConstants, "vertexBufferStride", type.uint32);
CjsSchema.decorateField(TriRtGeometryConstants, "positionOffset", type.uint32);
CjsSchema.decorateField(TriRtGeometryConstants, "positionType", type.uint32);
CjsSchema.decorateField(TriRtGeometryConstants, "normalOffset", type.uint32);
CjsSchema.decorateField(TriRtGeometryConstants, "normalType", type.uint32);
CjsSchema.decorateField(TriRtGeometryConstants, "tangentOffset", type.uint32);
CjsSchema.decorateField(TriRtGeometryConstants, "tangentType", type.uint32);
CjsSchema.decorateField(TriRtGeometryConstants, "bitangentOffset", type.uint32);
CjsSchema.decorateField(TriRtGeometryConstants, "bitangentType", type.uint32);
CjsSchema.decorateField(TriRtGeometryConstants, "texCoord0Offset", type.uint32);
CjsSchema.decorateField(TriRtGeometryConstants, "texCoord0Type", type.uint32);
CjsSchema.decorateField(TriRtGeometryConstants, "texCoord1Offset", type.uint32);
CjsSchema.decorateField(TriRtGeometryConstants, "texCoord1Type", type.uint32);
CjsSchema.decorateField(TriRtGeometryConstants, "texCoord2Offset", type.uint32);
CjsSchema.decorateField(TriRtGeometryConstants, "texCoord2Type", type.uint32);
CjsSchema.decorateField(TriRtGeometryConstants, "padding", type.uint32);
CjsSchema.meta.carbon("TriRtGeometryConstants")(TriRtGeometryConstants);
