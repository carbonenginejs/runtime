import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_resPath, _init_extra_resPath, _init_expects, _init_extra_expects;

/**
 * CarbonEngineJS-original external graph reference.
 *
 * Carbon ships deferred-loading nodes for children (EveChildRef) and
 * controllers (Tr2ControllerReference) but inline-loads everything else
 * because its blocking BeResMan made that free. For slots with no Carbon
 * reference class - currently the model rotation/translation curves - the
 * builder emits this node instead: the authored res path plus the interface
 * the loaded root must implement. A consuming loader resolves the reference
 * by fetching and decoding the target graph, verifying the root against
 * `expects`, and splicing it into the owning slot.
 */
let _CjsExternalRef;
class CjsExternalRef extends CjsModel {
  static {
    ({
      e: [_init_resPath, _init_extra_resPath, _init_expects, _init_extra_expects],
      c: [_CjsExternalRef, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsExternalRef",
      family: "sof"
    })], [[[io, io.persist, type, type.string], 16, "resPath"], [[io, io.persist, type, type.string], 16, "expects"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_expects(this);
  }
  resPath = _init_resPath(this, "");

  /** Carbon interface name the loaded root must implement (load-time gate). */
  expects = (_init_extra_resPath(this), _init_expects(this, ""));
  static {
    _initClass();
  }
}

export { _CjsExternalRef as CjsExternalRef };
//# sourceMappingURL=CjsExternalRef.js.map
