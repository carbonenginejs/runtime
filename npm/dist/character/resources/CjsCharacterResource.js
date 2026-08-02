import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsCharacterRecord as _CjsCharacterRecord } from '../CjsCharacterRecord.js';

let _initClass, _init_empireRestrictions, _init_extra_empireRestrictions, _init_resPath, _init_extra_resPath, _init_clothingAlsoCoversCategory, _init_extra_clothingAlsoCoversCategory, _init_clothingAlsoCoversCategory2, _init_extra_clothingAlsoCoversCategory2, _init_clothingRemovesCategory, _init_extra_clothingRemovesCategory, _init_clothingRemovesCategory2, _init_extra_clothingRemovesCategory2, _init_typeID, _init_extra_typeID, _init_clothingRuleException, _init_extra_clothingRuleException, _init_resGender, _init_extra_resGender;

/** Authored character resource with explicit gender, type, and clothing-category rules. */
let _CjsCharacterResource;
class CjsCharacterResource extends _CjsCharacterRecord {
  static {
    ({
      e: [_init_empireRestrictions, _init_extra_empireRestrictions, _init_resPath, _init_extra_resPath, _init_clothingAlsoCoversCategory, _init_extra_clothingAlsoCoversCategory, _init_clothingAlsoCoversCategory2, _init_extra_clothingAlsoCoversCategory2, _init_clothingRemovesCategory, _init_extra_clothingRemovesCategory, _init_clothingRemovesCategory2, _init_extra_clothingRemovesCategory2, _init_typeID, _init_extra_typeID, _init_clothingRuleException, _init_extra_clothingRuleException, _init_resGender, _init_extra_resGender],
      c: [_CjsCharacterResource, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterResource",
      family: "character"
    })], [[[io, io.readwrite, void 0, type.list("string")], 16, "empireRestrictions"], [[io, io.readwrite, type, type.path], 16, "resPath"], [[io, io.readwrite, void 0, type.model("CjsCharacterModifierLocation")], 16, "clothingAlsoCoversCategory"], [[io, io.readwrite, void 0, type.model("CjsCharacterModifierLocation")], 16, "clothingAlsoCoversCategory2"], [[io, io.readwrite, void 0, type.model("CjsCharacterModifierLocation")], 16, "clothingRemovesCategory"], [[io, io.readwrite, void 0, type.model("CjsCharacterModifierLocation")], 16, "clothingRemovesCategory2"], [[io, io.readwrite, type, type.string], 16, "typeID"], [[io, io.readwrite, type, type.uint8], 16, "clothingRuleException"], [[io, io.readwrite, type, type.uint8], 16, "resGender"]], 0, void 0, _CjsCharacterRecord));
  }
  constructor(...args) {
    super(...args);
    _init_extra_resGender(this);
  }
  empireRestrictions = _init_empireRestrictions(this, null);
  resPath = (_init_extra_empireRestrictions(this), _init_resPath(this, ""));
  clothingAlsoCoversCategory = (_init_extra_resPath(this), _init_clothingAlsoCoversCategory(this, null));
  clothingAlsoCoversCategory2 = (_init_extra_clothingAlsoCoversCategory(this), _init_clothingAlsoCoversCategory2(this, null));
  clothingRemovesCategory = (_init_extra_clothingAlsoCoversCategory2(this), _init_clothingRemovesCategory(this, null));
  clothingRemovesCategory2 = (_init_extra_clothingRemovesCategory(this), _init_clothingRemovesCategory2(this, null));
  typeID = (_init_extra_clothingRemovesCategory2(this), _init_typeID(this, null));
  clothingRuleException = (_init_extra_typeID(this), _init_clothingRuleException(this, null));
  resGender = (_init_extra_clothingRuleException(this), _init_resGender(this, null));
  static {
    _initClass();
  }
}

export { _CjsCharacterResource as CjsCharacterResource };
//# sourceMappingURL=CjsCharacterResource.js.map
