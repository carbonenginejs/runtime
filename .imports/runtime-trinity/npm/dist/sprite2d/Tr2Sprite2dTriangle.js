import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_index, _init_extra_index, _init_index2, _init_extra_index2, _init_index3, _init_extra_index3;

/** Tr2Sprite2dTriangle (sprite2d) - generated from schema shapeHash b41a9ed3.... */
let _Tr2Sprite2dTriangle;
class Tr2Sprite2dTriangle extends CjsModel {
  static {
    ({
      e: [_init_index, _init_extra_index, _init_index2, _init_extra_index2, _init_index3, _init_extra_index3],
      c: [_Tr2Sprite2dTriangle, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2Sprite2dTriangle",
      family: "sprite2d"
    })], [[[io, io.persist, type, type.uint16], 16, "index0"], [[io, io.persist, type, type.uint16], 16, "index1"], [[io, io.persist, type, type.uint16], 16, "index2"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_index3(this);
  }
  /** m_index[0] (uint16_t) [READWRITE, PERSIST] */
  index0 = _init_index(this, 0);

  /** m_index[1] (uint16_t) [READWRITE, PERSIST] */
  index1 = (_init_extra_index(this), _init_index2(this, 0));

  /** m_index[2] (uint16_t) [READWRITE, PERSIST] */
  index2 = (_init_extra_index2(this), _init_index3(this, 0));
  static {
    _initClass();
  }
}

export { _Tr2Sprite2dTriangle as Tr2Sprite2dTriangle };
//# sourceMappingURL=Tr2Sprite2dTriangle.js.map
