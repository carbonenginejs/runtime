import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsCharacterRecord as _CjsCharacterRecord } from '../CjsCharacterRecord.js';

let _initClass, _init_resPath, _init_extra_resPath, _init_resourceCategory, _init_extra_resourceCategory, _init_typeID, _init_extra_typeID;

/** Authored portrait resource classified by its source category and optional type identity. */
let _CjsCharacterPortrait;
class CjsCharacterPortraitResource extends _CjsCharacterRecord {
  static {
    ({
      e: [_init_resPath, _init_extra_resPath, _init_resourceCategory, _init_extra_resourceCategory, _init_typeID, _init_extra_typeID],
      c: [_CjsCharacterPortrait, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterPortraitResource",
      family: "character"
    })], [[[io, io.readwrite, type, type.path], 16, "resPath"], [[io, io.readwrite, type, type.string], 16, "resourceCategory"], [[io, io.readwrite, type, type.string], 16, "typeID"]], 0, void 0, _CjsCharacterRecord));
  }
  constructor(...args) {
    super(...args);
    _init_extra_typeID(this);
  }
  resPath = _init_resPath(this, "");
  resourceCategory = (_init_extra_resPath(this), _init_resourceCategory(this, ""));
  typeID = (_init_extra_resourceCategory(this), _init_typeID(this, null));
  static {
    _initClass();
  }
}

export { _CjsCharacterPortrait as CjsCharacterPortraitResource };
//# sourceMappingURL=CjsCharacterPortraitResource.js.map
