import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_kind, _init_extra_kind, _init_document, _init_extra_document, _init_recordID, _init_extra_recordID, _init_jsonPointer, _init_extra_jsonPointer, _init_resourcePath, _init_extra_resourcePath, _init_rule, _init_extra_rule;

/** Provenance record classifying one appearance-plan fact or decision. */
let _CjsCharacterOrigin;
class CjsCharacterOrigin extends CjsModel {
  static {
    ({
      e: [_init_kind, _init_extra_kind, _init_document, _init_extra_document, _init_recordID, _init_extra_recordID, _init_jsonPointer, _init_extra_jsonPointer, _init_resourcePath, _init_extra_resourcePath, _init_rule, _init_extra_rule],
      c: [_CjsCharacterOrigin, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterOrigin",
      family: "character"
    })], [[[io, io.readwrite, type, type.string], 16, "kind"], [[io, io.readwrite, type, type.string], 16, "document"], [[io, io.readwrite, type, type.string], 16, "recordID"], [[io, io.readwrite, type, type.string], 16, "jsonPointer"], [[io, io.readwrite, type, type.path], 16, "resourcePath"], [[io, io.readwrite, type, type.string], 16, "rule"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_rule(this);
  }
  kind = _init_kind(this, "");
  document = (_init_extra_kind(this), _init_document(this, null));
  recordID = (_init_extra_document(this), _init_recordID(this, null));
  jsonPointer = (_init_extra_recordID(this), _init_jsonPointer(this, null));
  resourcePath = (_init_extra_jsonPointer(this), _init_resourcePath(this, null));
  rule = (_init_extra_resourcePath(this), _init_rule(this, null));
  static {
    _initClass();
  }
}

export { _CjsCharacterOrigin as CjsCharacterOrigin };
//# sourceMappingURL=CjsCharacterOrigin.js.map
