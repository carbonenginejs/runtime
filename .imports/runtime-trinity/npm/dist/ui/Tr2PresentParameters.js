import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_software, _init_extra_software, _init_backBufferWidth, _init_extra_backBufferWidth, _init_backBufferHeight, _init_extra_backBufferHeight, _init_windowed, _init_extra_windowed;

/** Tr2PresentParameters (ui) - generated from schema shapeHash 0f696098.... */
let _Tr2PresentParameters;
class Tr2PresentParameters extends CjsModel {
  static {
    ({
      e: [_init_software, _init_extra_software, _init_backBufferWidth, _init_extra_backBufferWidth, _init_backBufferHeight, _init_extra_backBufferHeight, _init_windowed, _init_extra_windowed],
      c: [_Tr2PresentParameters, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2PresentParameters",
      family: "ui"
    })], [[[io, io.readwrite, type, type.boolean], 16, "software"], [[io, io.readwrite, type, type.uint32], 16, "backBufferWidth"], [[io, io.readwrite, type, type.uint32], 16, "backBufferHeight"], [[io, io.readwrite, type, type.boolean], 16, "windowed"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_windowed(this);
  }
  /** software (unknown) [READWRITE, ENUM] */
  software = _init_software(this, false);

  /** mode.width (unknown) [READWRITE] */
  backBufferWidth = (_init_extra_software(this), _init_backBufferWidth(this, 0));

  /** mode.height (unknown) [READWRITE] */
  backBufferHeight = (_init_extra_backBufferWidth(this), _init_backBufferHeight(this, 0));

  /** windowed (unknown) [READWRITE] */
  windowed = (_init_extra_backBufferHeight(this), _init_windowed(this, false));
  static {
    _initClass();
  }
}

export { _Tr2PresentParameters as Tr2PresentParameters };
//# sourceMappingURL=Tr2PresentParameters.js.map
