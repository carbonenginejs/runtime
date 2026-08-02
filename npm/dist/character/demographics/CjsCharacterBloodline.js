import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsCharacterRecord as _CjsCharacterRecord } from '../CjsCharacterRecord.js';

let _initClass, _init_charisma, _init_extra_charisma, _init_corporationID, _init_extra_corporationID, _init_descriptionID, _init_extra_descriptionID, _init_iconID, _init_extra_iconID, _init_intelligence, _init_extra_intelligence, _init_memory, _init_extra_memory, _init_nameID, _init_extra_nameID, _init_perception, _init_extra_perception, _init_raceID, _init_extra_raceID, _init_willpower, _init_extra_willpower;

/** Character-creation bloodline record linked to its owning race. */
let _CjsCharacterBloodlin;
class CjsCharacterBloodline extends _CjsCharacterRecord {
  static {
    ({
      e: [_init_charisma, _init_extra_charisma, _init_corporationID, _init_extra_corporationID, _init_descriptionID, _init_extra_descriptionID, _init_iconID, _init_extra_iconID, _init_intelligence, _init_extra_intelligence, _init_memory, _init_extra_memory, _init_nameID, _init_extra_nameID, _init_perception, _init_extra_perception, _init_raceID, _init_extra_raceID, _init_willpower, _init_extra_willpower],
      c: [_CjsCharacterBloodlin, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterBloodline",
      family: "character"
    })], [[[io, io.readwrite, type, type.int32], 16, "charisma"], [[io, io.readwrite, type, type.string], 16, "corporationID"], [[io, io.readwrite, type, type.string], 16, "descriptionID"], [[io, io.readwrite, type, type.string], 16, "iconID"], [[io, io.readwrite, type, type.int32], 16, "intelligence"], [[io, io.readwrite, type, type.int32], 16, "memory"], [[io, io.readwrite, type, type.string], 16, "nameID"], [[io, io.readwrite, type, type.int32], 16, "perception"], [[io, io.readwrite, void 0, type.model("CjsCharacterRace")], 16, "raceID"], [[io, io.readwrite, type, type.int32], 16, "willpower"]], 0, void 0, _CjsCharacterRecord));
  }
  constructor(...args) {
    super(...args);
    _init_extra_willpower(this);
  }
  charisma = _init_charisma(this, 0);
  corporationID = (_init_extra_charisma(this), _init_corporationID(this, null));
  descriptionID = (_init_extra_corporationID(this), _init_descriptionID(this, ""));
  iconID = (_init_extra_descriptionID(this), _init_iconID(this, null));
  intelligence = (_init_extra_iconID(this), _init_intelligence(this, 0));
  memory = (_init_extra_intelligence(this), _init_memory(this, 0));
  nameID = (_init_extra_memory(this), _init_nameID(this, ""));
  perception = (_init_extra_nameID(this), _init_perception(this, 0));
  raceID = (_init_extra_perception(this), _init_raceID(this, null));
  willpower = (_init_extra_raceID(this), _init_willpower(this, 0));
  static {
    _initClass();
  }
}

export { _CjsCharacterBloodlin as CjsCharacterBloodline };
//# sourceMappingURL=CjsCharacterBloodline.js.map
