import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type } from '@carbonenginejs/runtime-utils/schema';

let _initClass, _init_callable, _init_extra_callable, _init_callableArgs, _init_extra_callableArgs, _init_value, _init_extra_value, _init_time, _init_extra_time;

/**
 * One key of a TriEventCurve: a time in seconds plus either a named event string
 * or a callable and its arguments to invoke when the playhead crosses it.
 */
let _TriEventKey;
class TriEventKey extends CjsModel {
  static {
    ({
      e: [_init_callable, _init_extra_callable, _init_callableArgs, _init_extra_callableArgs, _init_value, _init_extra_value, _init_time, _init_extra_time],
      c: [_TriEventKey, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriEventKey",
      family: "curves"
    })], [[[io, io.readwrite, void 0, type.objectRef("PyObject")], 16, "callable"], [[io, io.readwrite, void 0, type.objectRef("PyObject")], 16, "callableArgs"], [[io, io.persist, type, type.string], 16, "value"], [[io, io.persist, type, type.float32], 16, "time"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_time(this);
  }
  callable = _init_callable(this, null);
  callableArgs = (_init_extra_callable(this), _init_callableArgs(this, null));
  value = (_init_extra_callableArgs(this), _init_value(this, ""));
  time = (_init_extra_value(this), _init_time(this, 0));
  static {
    _initClass();
  }
}

export { _TriEventKey as TriEventKey };
//# sourceMappingURL=TriEventKey.js.map
