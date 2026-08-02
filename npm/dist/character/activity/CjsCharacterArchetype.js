import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsCharacterRecord as _CjsCharacterRecord } from '../CjsCharacterRecord.js';

let _initClass, _init_contentTags, _init_extra_contentTags, _init_location, _init_extra_location, _init_descriptionID, _init_extra_descriptionID, _init_titleID, _init_extra_titleID;

/** Transparent activity-archetype record retained by the character source document. */
let _CjsCharacterArchetyp;
class CjsCharacterArchetype extends _CjsCharacterRecord {
  static {
    ({
      e: [_init_contentTags, _init_extra_contentTags, _init_location, _init_extra_location, _init_descriptionID, _init_extra_descriptionID, _init_titleID, _init_extra_titleID],
      c: [_CjsCharacterArchetyp, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterArchetype",
      family: "character"
    })], [[[io, io.readwrite, void 0, type.list("string")], 16, "contentTags"], [[io, io.readwrite, type, type.string], 16, "location"], [[io, io.readwrite, type, type.string], 16, "descriptionID"], [[io, io.readwrite, type, type.string], 16, "titleID"]], 0, void 0, _CjsCharacterRecord));
  }
  constructor(...args) {
    super(...args);
    _init_extra_titleID(this);
  }
  contentTags = _init_contentTags(this, null);
  location = (_init_extra_contentTags(this), _init_location(this, null));
  descriptionID = (_init_extra_location(this), _init_descriptionID(this, null));
  titleID = (_init_extra_descriptionID(this), _init_titleID(this, null));
  static {
    _initClass();
  }
}

export { _CjsCharacterArchetyp as CjsCharacterArchetype };
//# sourceMappingURL=CjsCharacterArchetype.js.map
