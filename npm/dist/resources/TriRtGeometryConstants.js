import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_indexBufferId, _init_extra_indexBufferId, _init_indexBufferStride, _init_extra_indexBufferStride, _init_indexOffset, _init_extra_indexOffset, _init_vertexBufferId, _init_extra_vertexBufferId, _init_vertexBufferStride, _init_extra_vertexBufferStride, _init_positionOffset, _init_extra_positionOffset, _init_positionType, _init_extra_positionType, _init_normalOffset, _init_extra_normalOffset, _init_normalType, _init_extra_normalType, _init_tangentOffset, _init_extra_tangentOffset, _init_tangentType, _init_extra_tangentType, _init_bitangentOffset, _init_extra_bitangentOffset, _init_bitangentType, _init_extra_bitangentType, _init_texCoord0Offset, _init_extra_texCoord0Offset, _init_texCoord0Type, _init_extra_texCoord0Type, _init_texCoord1Offset, _init_extra_texCoord1Offset, _init_texCoord1Type, _init_extra_texCoord1Type, _init_texCoord2Offset, _init_extra_texCoord2Offset, _init_texCoord2Type, _init_extra_texCoord2Type, _init_padding, _init_extra_padding;

/** TriRtGeometryConstants (resources) - maintained from schema shapeHash cb7de752.... */
let _TriRtGeometryConstan;
class TriRtGeometryConstants extends CjsModel {
  static {
    ({
      e: [_init_indexBufferId, _init_extra_indexBufferId, _init_indexBufferStride, _init_extra_indexBufferStride, _init_indexOffset, _init_extra_indexOffset, _init_vertexBufferId, _init_extra_vertexBufferId, _init_vertexBufferStride, _init_extra_vertexBufferStride, _init_positionOffset, _init_extra_positionOffset, _init_positionType, _init_extra_positionType, _init_normalOffset, _init_extra_normalOffset, _init_normalType, _init_extra_normalType, _init_tangentOffset, _init_extra_tangentOffset, _init_tangentType, _init_extra_tangentType, _init_bitangentOffset, _init_extra_bitangentOffset, _init_bitangentType, _init_extra_bitangentType, _init_texCoord0Offset, _init_extra_texCoord0Offset, _init_texCoord0Type, _init_extra_texCoord0Type, _init_texCoord1Offset, _init_extra_texCoord1Offset, _init_texCoord1Type, _init_extra_texCoord1Type, _init_texCoord2Offset, _init_extra_texCoord2Offset, _init_texCoord2Type, _init_extra_texCoord2Type, _init_padding, _init_extra_padding],
      c: [_TriRtGeometryConstan, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriRtGeometryConstants",
      family: "resources"
    })], [[[type, type.uint32], 16, "indexBufferId"], [[type, type.uint32], 16, "indexBufferStride"], [[type, type.uint32], 16, "indexOffset"], [[type, type.uint32], 16, "vertexBufferId"], [[type, type.uint32], 16, "vertexBufferStride"], [[type, type.uint32], 16, "positionOffset"], [[type, type.uint32], 16, "positionType"], [[type, type.uint32], 16, "normalOffset"], [[type, type.uint32], 16, "normalType"], [[type, type.uint32], 16, "tangentOffset"], [[type, type.uint32], 16, "tangentType"], [[type, type.uint32], 16, "bitangentOffset"], [[type, type.uint32], 16, "bitangentType"], [[type, type.uint32], 16, "texCoord0Offset"], [[type, type.uint32], 16, "texCoord0Type"], [[type, type.uint32], 16, "texCoord1Offset"], [[type, type.uint32], 16, "texCoord1Type"], [[type, type.uint32], 16, "texCoord2Offset"], [[type, type.uint32], 16, "texCoord2Type"], [[type, type.uint32], 16, "padding"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_padding(this);
  }
  /** indexBufferId (uint32_t) */
  indexBufferId = _init_indexBufferId(this, 0);

  /** indexBufferStride (uint32_t) */
  indexBufferStride = (_init_extra_indexBufferId(this), _init_indexBufferStride(this, 0));

  /** indexOffset (uint32_t) */
  indexOffset = (_init_extra_indexBufferStride(this), _init_indexOffset(this, 0));

  /** vertexBufferId (uint32_t) */
  vertexBufferId = (_init_extra_indexOffset(this), _init_vertexBufferId(this, 0));

  /** vertexBufferStride (uint32_t) */
  vertexBufferStride = (_init_extra_vertexBufferId(this), _init_vertexBufferStride(this, 0));

  /** positionOffset (uint32_t) */
  positionOffset = (_init_extra_vertexBufferStride(this), _init_positionOffset(this, 0));

  /** positionType (uint32_t) */
  positionType = (_init_extra_positionOffset(this), _init_positionType(this, 0));

  /** normalOffset (uint32_t) */
  normalOffset = (_init_extra_positionType(this), _init_normalOffset(this, 0));

  /** normalType (uint32_t) */
  normalType = (_init_extra_normalOffset(this), _init_normalType(this, 0));

  /** tangentOffset (uint32_t) */
  tangentOffset = (_init_extra_normalType(this), _init_tangentOffset(this, 0));

  /** tangentType (uint32_t) */
  tangentType = (_init_extra_tangentOffset(this), _init_tangentType(this, 0));

  /** bitangentOffset (uint32_t) */
  bitangentOffset = (_init_extra_tangentType(this), _init_bitangentOffset(this, 0));

  /** bitangentType (uint32_t) */
  bitangentType = (_init_extra_bitangentOffset(this), _init_bitangentType(this, 0));

  /** texCoord0Offset (uint32_t) */
  texCoord0Offset = (_init_extra_bitangentType(this), _init_texCoord0Offset(this, 0));

  /** texCoord0Type (uint32_t) */
  texCoord0Type = (_init_extra_texCoord0Offset(this), _init_texCoord0Type(this, 0));

  /** texCoord1Offset (uint32_t) */
  texCoord1Offset = (_init_extra_texCoord0Type(this), _init_texCoord1Offset(this, 0));

  /** texCoord1Type (uint32_t) */
  texCoord1Type = (_init_extra_texCoord1Offset(this), _init_texCoord1Type(this, 0));

  /** texCoord2Offset (uint32_t) */
  texCoord2Offset = (_init_extra_texCoord1Type(this), _init_texCoord2Offset(this, 0));

  /** texCoord2Type (uint32_t) */
  texCoord2Type = (_init_extra_texCoord2Offset(this), _init_texCoord2Type(this, 0));

  /** padding (uint32_t) */
  padding = (_init_extra_texCoord2Type(this), _init_padding(this, 0));
  static {
    _initClass();
  }
}

export { _TriRtGeometryConstan as TriRtGeometryConstants };
//# sourceMappingURL=TriRtGeometryConstants.js.map
