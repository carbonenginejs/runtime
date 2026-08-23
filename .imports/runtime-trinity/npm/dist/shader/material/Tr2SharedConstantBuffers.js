import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_size, _init_extra_size, _init_hash, _init_extra_hash, _init_contents, _init_extra_contents, _init_buffer, _init_extra_buffer, _init_refCount, _init_extra_refCount;

/** Tr2SharedConstantBuffers (shader) - generated from schema shapeHash 692b0743.... */
let _Tr2SharedConstantBuf;
class Tr2SharedConstantBuffers extends CjsModel {
  static {
    ({
      e: [_init_size, _init_extra_size, _init_hash, _init_extra_hash, _init_contents, _init_extra_contents, _init_buffer, _init_extra_buffer, _init_refCount, _init_extra_refCount],
      c: [_Tr2SharedConstantBuf, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2SharedConstantBuffers",
      family: "shader"
    })], [[[type, type.uint32], 16, "size"], [[type, type.uint32], 16, "hash"], [type.objectRef("void"), 0, "contents"], [type.rawStruct("Tr2ConstantBufferAL"), 0, "buffer"], [[type, type.uint32], 16, "refCount"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_refCount(this);
  }
  /** size (uint32_t) */
  size = _init_size(this, 0);

  /** hash (uint32_t) */
  hash = (_init_extra_size(this), _init_hash(this, 0));

  /** contents (const void*) */
  contents = (_init_extra_hash(this), _init_contents(this, null));

  /** buffer (Tr2ConstantBufferAL) */
  buffer = (_init_extra_contents(this), _init_buffer(this, null));

  /** refCount (uint32_t) */
  refCount = (_init_extra_buffer(this), _init_refCount(this, 0));
  static {
    _initClass();
  }
}

export { _Tr2SharedConstantBuf as Tr2SharedConstantBuffers };
//# sourceMappingURL=Tr2SharedConstantBuffers.js.map
