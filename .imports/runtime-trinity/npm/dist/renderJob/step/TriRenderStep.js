import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_enabled, _init_extra_enabled, _init_name, _init_extra_name;

/**
 * Base of every render-job step: an enable flag, a name, and the
 * begin/execute/end contract the owning job drives.
 */
let _TriRenderStep;
new class extends _identity {
  static [class TriRenderStep extends CjsModel {
    static {
      ({
        e: [_init_enabled, _init_extra_enabled, _init_name, _init_extra_name, _initProto],
        c: [_TriRenderStep, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "TriRenderStep",
        family: "renderJob"
      })], [[[io, io.readwrite, type, type.boolean], 16, "enabled"], [[io, io.persist, type, type.string], 16, "name"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsEnabled"], [[carbon, carbon.method, impl, impl.adapted], 18, "BeginExecute"], [[carbon, carbon.method, impl, impl.adapted], 18, "EndExecute"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_name(this);
    }
    enabled = (_initProto(this), _init_enabled(this, true));
    name = (_init_extra_enabled(this), _init_name(this, ""));

    /**
     * Reports whether the owning job should run this step; disabled steps are
     * skipped without advancing any state.
     */
    IsEnabled() {
      return this.enabled;
    }

    /**
     * Hook the owning job calls before Execute; the base step does nothing, and
     * subclasses use it to set up state that EndExecute tears down.
     */
    BeginExecute() {}

    /**
     * Hook the owning job calls after Execute, including when Execute threw; the
     * base step does nothing.
     */
    EndExecute() {}
  }];
  Result = Object.freeze({
    RS_OK: 0,
    RS_FAILED: 1,
    RS_IN_PROGRESS: 2,
    RS_TERMINATE: 3
  });
  RS_OK = 0;
  RS_FAILED = 1;
  RS_IN_PROGRESS = 2;
  RS_TERMINATE = 3;
  constructor() {
    super(_TriRenderStep), _initClass();
  }
}();

export { _TriRenderStep as TriRenderStep };
//# sourceMappingURL=TriRenderStep.js.map
