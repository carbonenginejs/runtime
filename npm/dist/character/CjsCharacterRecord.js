import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_recordID, _init_extra_recordID;

/** Base for one record whose identity is the key from its source document. */
let _CjsCharacterRecord;
class CjsCharacterRecord extends CjsModel {
  static {
    ({
      e: [_init_recordID, _init_extra_recordID],
      c: [_CjsCharacterRecord, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterRecord",
      family: "character"
    })], [[[io, io.readwrite, type, type.string], 16, "recordID"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_recordID(this);
  }
  recordID = _init_recordID(this, "");
  static {
    _initClass();
  }
}

export { _CjsCharacterRecord as CjsCharacterRecord };
//# sourceMappingURL=CjsCharacterRecord.js.map
