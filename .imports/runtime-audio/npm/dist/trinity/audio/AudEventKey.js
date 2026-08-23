import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_value, _init_extra_value, _init_time, _init_extra_time;

/** AudEventKey (audio) - generated from schema shapeHash 54ef4422.... */
let _AudEventKey;
class AudEventKey extends CjsModel {
  static {
    ({
      e: [_init_value, _init_extra_value, _init_time, _init_extra_time],
      c: [_AudEventKey, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "AudEventKey",
      family: "audio"
    })], [[[io, io.persist, type, type.string], 16, "value"], [[io, io.persist, type, type.float32], 16, "time"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_time(this);
  }
  /** m_value (std::wstring) [READWRITE, PERSIST] */
  value = _init_value(this, "");

  /** m_time (float) [READWRITE, PERSIST] */
  time = (_init_extra_value(this), _init_time(this, 0));
  static {
    _initClass();
  }
}

export { _AudEventKey as AudEventKey };
//# sourceMappingURL=AudEventKey.js.map
