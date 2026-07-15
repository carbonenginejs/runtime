import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/core-types/model';
import { io, type } from '@carbonenginejs/core-types/schema';

let _initClass, _init_sourceFormat, _init_extra_sourceFormat, _init_metadata, _init_extra_metadata, _init_report, _init_extra_report;

/**
 * Optional runtime-resource DTO carrier for parsed content returned by format readers.
 *
 * Format packages may return plain semantic objects or their own hydrated
 * classes. Runtime-resource can use this class when it wants a known CjsModel
 * normalization target without adding resource lifecycle state.
 */
let _CjsObjectDTO;
new class extends _identity {
  static [class CjsObjectDTO extends CjsModel {
    static {
      ({
        e: [_init_sourceFormat, _init_extra_sourceFormat, _init_metadata, _init_extra_metadata, _init_report, _init_extra_report],
        c: [_CjsObjectDTO, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "CjsObjectDTO",
        family: "resource"
      })], [[[io, io.persist, type, type.string], 16, "sourceFormat"], [[io, io.persist, type, type.unknown], 16, "metadata"], [[io, io.persist, void 0, type.list("unknown")], 16, "report"]], 0, void 0, CjsModel));
    }
    sourceFormat = _init_sourceFormat(this, "");
    metadata = (_init_extra_sourceFormat(this), _init_metadata(this, null));
    report = (_init_extra_metadata(this), _init_report(this, []));
    constructor(values = null) {
      super(), _init_extra_report(this);
      this.SetValues(values || {}, {
        markDirty: false,
        skipUpdate: true,
        skipEvents: true
      });
    }
  }];
  payload = "object";
  constructor() {
    super(_CjsObjectDTO), _initClass();
  }
}();

export { _CjsObjectDTO as CjsObjectDTO };
//# sourceMappingURL=CjsObjectDTO.js.map
