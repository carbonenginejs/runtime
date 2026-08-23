import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initProto, _initClass, _init_depthStencilBuffer, _init_extra_depthStencilBuffer, _init_backBuffer, _init_extra_backBuffer, _init_width, _init_extra_width, _init_height, _init_extra_height;

/** Tr2SwapChain (trinityCore) - generated from schema shapeHash 955529ab.... */
let _Tr2SwapChain;
class Tr2SwapChain extends CjsModel {
  static {
    ({
      e: [_init_depthStencilBuffer, _init_extra_depthStencilBuffer, _init_backBuffer, _init_extra_backBuffer, _init_width, _init_extra_width, _init_height, _init_extra_height, _initProto],
      c: [_Tr2SwapChain, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2SwapChain",
      family: "trinityCore"
    })], [[[io, io.read, void 0, type.objectRef("Tr2DepthStencil")], 16, "depthStencilBuffer"], [[io, io.read, void 0, type.objectRef("Tr2RenderTarget")], 16, "backBuffer"], [[io, io.read, type, type.int32], 16, "width"], [[io, io.read, type, type.int32], 16, "height"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "CreateForWindow"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_height(this);
  }
  /** m_depthStencil (Tr2DepthStencilPtr) [READ] */
  depthStencilBuffer = (_initProto(this), _init_depthStencilBuffer(this, null));

  /** m_backBuffer (Tr2RenderTargetPtr) [READ] */
  backBuffer = (_init_extra_depthStencilBuffer(this), _init_backBuffer(this, null));
  width = (_init_extra_backBuffer(this), _init_width(this, 0));
  height = (_init_extra_width(this), _init_height(this, 0));

  /** Carbon method CreateForWindow (MAP_METHOD_AND_WRAP). */
  CreateForWindow(...args) {
    throw new Error("Tr2SwapChain.CreateForWindow is not implemented in CarbonEngineJS.");
  }
  static {
    _initClass();
  }
}

export { _Tr2SwapChain as Tr2SwapChain };
//# sourceMappingURL=Tr2SwapChain.js.map
