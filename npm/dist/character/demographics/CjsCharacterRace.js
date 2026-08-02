import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsCharacterRecord as _CjsCharacterRecord } from '../CjsCharacterRecord.js';

let _initClass, _init_skills, _init_extra_skills, _init_descriptionID, _init_extra_descriptionID, _init_iconID, _init_extra_iconID, _init_nameID, _init_extra_nameID, _init_shipTypeID, _init_extra_shipTypeID;

/** Character-creation race record with authored localization and starting-skill identities. */
let _CjsCharacterRace;
class CjsCharacterRace extends _CjsCharacterRecord {
  static {
    ({
      e: [_init_skills, _init_extra_skills, _init_descriptionID, _init_extra_descriptionID, _init_iconID, _init_extra_iconID, _init_nameID, _init_extra_nameID, _init_shipTypeID, _init_extra_shipTypeID],
      c: [_CjsCharacterRace, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterRace",
      family: "character"
    })], [[[io, io.readwrite, void 0, type.map("int32")], 16, "skills"], [[io, io.readwrite, type, type.string], 16, "descriptionID"], [[io, io.readwrite, type, type.string], 16, "iconID"], [[io, io.readwrite, type, type.string], 16, "nameID"], [[io, io.readwrite, type, type.string], 16, "shipTypeID"]], 0, void 0, _CjsCharacterRecord));
  }
  constructor(...args) {
    super(...args);
    _init_extra_shipTypeID(this);
  }
  skills = _init_skills(this, null);
  descriptionID = (_init_extra_skills(this), _init_descriptionID(this, null));
  iconID = (_init_extra_descriptionID(this), _init_iconID(this, null));
  nameID = (_init_extra_iconID(this), _init_nameID(this, ""));
  shipTypeID = (_init_extra_nameID(this), _init_shipTypeID(this, null));
  static {
    _initClass();
  }
}

export { _CjsCharacterRace as CjsCharacterRace };
//# sourceMappingURL=CjsCharacterRace.js.map
