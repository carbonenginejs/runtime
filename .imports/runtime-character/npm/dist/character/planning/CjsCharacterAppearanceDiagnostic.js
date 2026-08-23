import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_code, _init_extra_code, _init_message, _init_extra_message, _init_severity, _init_extra_severity, _init_origin, _init_extra_origin;

/** Serializable diagnostic emitted while resolving a character appearance plan. */
let _CjsCharacterAppearan;
class CjsCharacterAppearanceDiagnostic extends CjsModel {
  static {
    ({
      e: [_init_code, _init_extra_code, _init_message, _init_extra_message, _init_severity, _init_extra_severity, _init_origin, _init_extra_origin],
      c: [_CjsCharacterAppearan, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterAppearanceDiagnostic",
      family: "character"
    })], [[[io, io.readwrite, type, type.string], 16, "code"], [[io, io.readwrite, type, type.string], 16, "message"], [[io, io.readwrite, type, type.string], 16, "severity"], [[io, io.readwrite, void 0, type.model("CjsCharacterOrigin")], 16, "origin"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_origin(this);
  }
  code = _init_code(this, "");
  message = (_init_extra_code(this), _init_message(this, ""));
  severity = (_init_extra_message(this), _init_severity(this, "warning"));
  origin = (_init_extra_severity(this), _init_origin(this, null));
  static {
    _initClass();
  }
}

export { _CjsCharacterAppearan as CjsCharacterAppearanceDiagnostic };
//# sourceMappingURL=CjsCharacterAppearanceDiagnostic.js.map
