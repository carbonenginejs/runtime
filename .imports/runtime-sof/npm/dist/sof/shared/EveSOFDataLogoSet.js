import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { EveSOFDataLogo as _EveSOFDataLogo } from './EveSOFDataLogo.js';

let _initClass, _init_Primary, _init_extra_Primary, _init_Secondary, _init_extra_Secondary, _init_Tertiary, _init_extra_Tertiary, _init_Marking_, _init_extra_Marking_, _init_Marking_2, _init_extra_Marking_2;

/** EveSOFDataLogoSet (eve) - generated from schema shapeHash 1a77225e.... */
let _EveSOFDataLogoSet;
new class extends _identity {
  static [class EveSOFDataLogoSet extends CjsModel {
    static {
      ({
        e: [_init_Primary, _init_extra_Primary, _init_Secondary, _init_extra_Secondary, _init_Tertiary, _init_extra_Tertiary, _init_Marking_, _init_extra_Marking_, _init_Marking_2, _init_extra_Marking_2],
        c: [_EveSOFDataLogoSet, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveSOFDataLogoSet",
        family: "eve"
      })], [[[io, io.persist, void 0, type.objectRef("EveSOFDataLogo")], 16, "Primary"], [[io, io.persist, void 0, type.objectRef("EveSOFDataLogo")], 16, "Secondary"], [[io, io.persist, void 0, type.objectRef("EveSOFDataLogo")], 16, "Tertiary"], [[io, io.persist, void 0, type.objectRef("EveSOFDataLogo")], 16, "Marking_01"], [[io, io.persist, void 0, type.objectRef("EveSOFDataLogo")], 16, "Marking_02"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_Marking_2(this);
    }
    /** m_logos[TYPE_PRIMARY] (EveSOFDataLogoPtr) [READWRITE, PERSIST] */
    Primary = _init_Primary(this, null);

    /** m_logos[TYPE_SECONDARY] (EveSOFDataLogoPtr) [READWRITE, PERSIST] */
    Secondary = (_init_extra_Primary(this), _init_Secondary(this, null));

    /** m_logos[TYPE_TERTIARY] (EveSOFDataLogoPtr) [READWRITE, PERSIST] */
    Tertiary = (_init_extra_Secondary(this), _init_Tertiary(this, null));

    /** m_logos[TYPE_MARKING_01] (EveSOFDataLogoPtr) [READWRITE, PERSIST] */
    Marking_01 = (_init_extra_Tertiary(this), _init_Marking_(this, null));

    /** m_logos[TYPE_MARKING_02] (EveSOFDataLogoPtr) [READWRITE, PERSIST] */
    Marking_02 = (_init_extra_Marking_(this), _init_Marking_2(this, null));
    Has(type) {
      const name = this.constructor.Types[type];
      if (name === undefined) throw new ErrSOFLogoSetTypeUnknown(type);
      return this[name] !== null;
    }
    Get(type) {
      if (!this.Has(type)) throw new ErrSOFLogoSetTypeNotFound(type);
      return this[this.constructor.Types[type]];
    }
    static combine(base, overrides, out = null) {
      out ??= new this();
      if (!base) return out;
      for (const name of this.Types) {
        out[name] = _EveSOFDataLogo.combine(base[name], overrides?.[name], out[name]);
      }
      return out;
    }
  }];
  LogoType = Object.freeze({
    TYPE_PRIMARY: 0,
    TYPE_SECONDARY: 1,
    TYPE_TERTIARY: 2,
    TYPE_MARKING_01: 3,
    TYPE_MARKING_02: 4,
    TYPE_MAX: 5
  });
  Types = Object.freeze(["Primary", "Secondary", "Tertiary", "Marking_01", "Marking_02"]);
  constructor() {
    super(_EveSOFDataLogoSet), _initClass();
  }
}();
class ErrSOFLogoSetTypeUnknown extends RangeError {
  constructor(type) {
    super("SOF logo set type unknown (" + type + ")");
    this.name = "ErrSOFLogoSetTypeUnknown";
    this.code = "EVE_SOF_LOGO_TYPE_UNKNOWN";
    this.type = type;
  }
}
class ErrSOFLogoSetTypeNotFound extends Error {
  constructor(type) {
    super("SOF logo set type not found (" + type + ")");
    this.name = "ErrSOFLogoSetTypeNotFound";
    this.code = "EVE_SOF_LOGO_TYPE_NOT_FOUND";
    this.type = type;
  }
}

export { ErrSOFLogoSetTypeNotFound, ErrSOFLogoSetTypeUnknown, _EveSOFDataLogoSet as EveSOFDataLogoSet };
//# sourceMappingURL=EveSOFDataLogoSet.js.map
