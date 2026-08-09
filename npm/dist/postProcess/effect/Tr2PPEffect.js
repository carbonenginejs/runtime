import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_display, _init_extra_display;

/** Tr2PPEffect (postProcess) - generated from schema shapeHash 5a6b823d.... */
let _Tr2PPEffect;
class Tr2PPEffect extends CjsModel {
  static {
    ({
      e: [_init_display, _init_extra_display],
      c: [_Tr2PPEffect, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2PPEffect",
      family: "postProcess"
    })], [[[io, io.notify, io, io.readwrite, type, type.boolean], 16, "display"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_display(this);
  }
  /** m_display (bool) [READWRITE, NOTIFY] */
  display = _init_display(this, true);

  /** Carbon Tr2PPEffect::IsActive - the base activity gate. */
  IsActive() {
    return this.display;
  }
  static {
    _initClass();
  }
}

export { _Tr2PPEffect as Tr2PPEffect };
//# sourceMappingURL=Tr2PPEffect.js.map
