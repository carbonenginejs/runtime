import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { Tr2PrimitiveSet as _Tr2PrimitiveSet } from '../../core/line/Tr2PrimitiveSet.js';

let _initClass, _init_grannyResPath, _init_extra_grannyResPath, _init_renderSolid, _init_extra_renderSolid, _init_grannyRes, _init_extra_grannyRes;

/** Tr2GrannyPrimitiveSet (trinityCore) - generated from schema shapeHash abcc3e58.... */
let _Tr2GrannyPrimitiveSe;
class Tr2GrannyPrimitiveSet extends _Tr2PrimitiveSet {
  static {
    ({
      e: [_init_grannyResPath, _init_extra_grannyResPath, _init_renderSolid, _init_extra_renderSolid, _init_grannyRes, _init_extra_grannyRes],
      c: [_Tr2GrannyPrimitiveSe, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2GrannyPrimitiveSet",
      family: "trinityCore"
    })], [[[io, io.notify, io, io.persist, type, type.string], 16, "grannyResPath"], [[io, io.persist, type, type.boolean], 16, "renderSolid"], [[io, io.read, void 0, type.objectRef("TriGrannyRes")], 16, "grannyRes"]], 0, void 0, _Tr2PrimitiveSet));
  }
  constructor(...args) {
    super(...args);
    _init_extra_grannyRes(this);
  }
  /** m_grannyResPath (std::string) [READWRITE, PERSIST, NOTIFY] */
  grannyResPath = _init_grannyResPath(this, "");

  /** m_renderSolid (bool) [READWRITE, PERSIST] */
  renderSolid = (_init_extra_grannyResPath(this), _init_renderSolid(this, false));

  /** m_grannyRes (TriGrannyResPtr) [READ] */
  grannyRes = (_init_extra_renderSolid(this), _init_grannyRes(this, null));
  static {
    _initClass();
  }
}

export { _Tr2GrannyPrimitiveSe as Tr2GrannyPrimitiveSet };
//# sourceMappingURL=Tr2GrannyPrimitiveSet.js.map
