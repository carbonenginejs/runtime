import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initClass, _init_vertexBuffer, _init_extra_vertexBuffer, _init_indexBuffer, _init_extra_indexBuffer, _init_job, _init_extra_job, _init_numVertices, _init_extra_numVertices, _init_startIndex, _init_extra_startIndex, _init_primitiveCount, _init_extra_primitiveCount, _init_texelSize, _init_extra_texelSize, _init_texelSize2, _init_extra_texelSize2, _init_texture, _init_extra_texture, _init_texture2, _init_extra_texture2, _init_effect, _init_extra_effect, _init_transformArray, _init_extra_transformArray, _init_uiTransformsCb, _init_extra_uiTransformsCb, _init_entries, _init_extra_entries, _init_owner, _init_extra_owner;

/** Tr2Sprite2dDisplayList (sprite2d) - generated from schema shapeHash 0206bb23.... */
let _Tr2Sprite2dDisplayLi;
class Tr2Sprite2dDisplayList extends CjsModel {
  static {
    ({
      e: [_init_vertexBuffer, _init_extra_vertexBuffer, _init_indexBuffer, _init_extra_indexBuffer, _init_job, _init_extra_job, _init_numVertices, _init_extra_numVertices, _init_startIndex, _init_extra_startIndex, _init_primitiveCount, _init_extra_primitiveCount, _init_texelSize, _init_extra_texelSize, _init_texelSize2, _init_extra_texelSize2, _init_texture, _init_extra_texture, _init_texture2, _init_extra_texture2, _init_effect, _init_extra_effect, _init_transformArray, _init_extra_transformArray, _init_uiTransformsCb, _init_extra_uiTransformsCb, _init_entries, _init_extra_entries, _init_owner, _init_extra_owner],
      c: [_Tr2Sprite2dDisplayLi, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2Sprite2dDisplayList",
      family: "sprite2d"
    })], [[type.rawStruct("Tr2BufferAL"), 0, "vertexBuffer"], [type.rawStruct("Tr2BufferAL"), 0, "indexBuffer"], [type.objectRef("TriRenderJob"), 0, "job"], [[type, type.uint32], 16, "numVertices"], [[type, type.uint32], 16, "startIndex"], [[type, type.uint32], 16, "primitiveCount"], [[type, type.vec4], 16, "texelSize0"], [[type, type.vec4], 16, "texelSize1"], [type.objectRef("Tr2AtlasTexture"), 0, "texture0"], [type.objectRef("Tr2AtlasTexture"), 0, "texture1"], [type.objectRef("Tr2Effect"), 0, "effect"], [[type, type.mat4], 16, "transformArray"], [type.objectRef("Tr2ConstantBufferAL"), 0, "uiTransformsCb"], [type.rawStruct("std::list<Entry>"), 0, "entries"], [type.objectRef("ITr2SpriteObject"), 0, "owner"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_owner(this);
  }
  /** vertexBuffer (Tr2BufferAL) */
  vertexBuffer = _init_vertexBuffer(this, null);

  /** indexBuffer (Tr2BufferAL) */
  indexBuffer = (_init_extra_vertexBuffer(this), _init_indexBuffer(this, null));

  /** job (TriRenderJobPtr) */
  job = (_init_extra_indexBuffer(this), _init_job(this, null));

  /** numVertices (uint32_t) */
  numVertices = (_init_extra_job(this), _init_numVertices(this, 0));

  /** startIndex (uint32_t) */
  startIndex = (_init_extra_numVertices(this), _init_startIndex(this, 0));

  /** primitiveCount (uint32_t) */
  primitiveCount = (_init_extra_startIndex(this), _init_primitiveCount(this, 0));

  /** texelSize0 (Vector4) */
  texelSize0 = (_init_extra_primitiveCount(this), _init_texelSize(this, vec4.create()));

  /** texelSize1 (Vector4) */
  texelSize1 = (_init_extra_texelSize(this), _init_texelSize2(this, vec4.create()));

  /** texture0 (Tr2AtlasTexturePtr) */
  texture0 = (_init_extra_texelSize2(this), _init_texture(this, null));

  /** texture1 (Tr2AtlasTexturePtr) */
  texture1 = (_init_extra_texture(this), _init_texture2(this, null));

  /** effect (Tr2EffectPtr) */
  effect = (_init_extra_texture2(this), _init_effect(this, null));

  /** transformArray (Matrix) */
  transformArray = (_init_extra_effect(this), _init_transformArray(this, mat4.create()));

  /** m_uiTransformsCb (Tr2ConstantBufferAL*) */
  uiTransformsCb = (_init_extra_transformArray(this), _init_uiTransformsCb(this, null));

  /** entries (std::list<Entry>) */
  entries = (_init_extra_uiTransformsCb(this), _init_entries(this, null));

  /** m_owner (ITr2SpriteObject*) */
  owner = (_init_extra_entries(this), _init_owner(this, null));
  static {
    _initClass();
  }
}

export { _Tr2Sprite2dDisplayLi as Tr2Sprite2dDisplayList };
//# sourceMappingURL=Tr2Sprite2dDisplayList.js.map
