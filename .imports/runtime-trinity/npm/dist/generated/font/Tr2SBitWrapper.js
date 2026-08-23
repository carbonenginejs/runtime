import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initProto, _initClass, _init_x, _init_extra_x, _init_y, _init_extra_y;

/** Tr2SBitWrapper (font) - generated from schema shapeHash c0b95eac.... */
let _Tr2SBitWrapper;
class Tr2SBitWrapper extends CjsModel {
  static {
    ({
      e: [_init_x, _init_extra_x, _init_y, _init_extra_y, _initProto],
      c: [_Tr2SBitWrapper, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2SBitWrapper",
      family: "font"
    })], [[[io, io.read, type, type.int32], 16, "x"], [[io, io.read, type, type.int32], 16, "y"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "ToBuffer"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "ToBufferWithUnderline"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_y(this);
  }
  /** x (int) [READ] */
  x = (_initProto(this), _init_x(this, 0));

  /** y (int) [READ] */
  y = (_init_extra_x(this), _init_y(this, 0));

  /** Carbon method ToBuffer (MAP_METHOD_AND_WRAP). */
  ToBuffer(...args) {
    throw new Error("Tr2SBitWrapper.ToBuffer is not implemented in CarbonEngineJS.");
  }

  /** Carbon method ToBufferWithUnderline (MAP_METHOD_AND_WRAP). */
  ToBufferWithUnderline(...args) {
    throw new Error("Tr2SBitWrapper.ToBufferWithUnderline is not implemented in CarbonEngineJS.");
  }
  static {
    _initClass();
  }
}

export { _Tr2SBitWrapper as Tr2SBitWrapper };
//# sourceMappingURL=Tr2SBitWrapper.js.map
