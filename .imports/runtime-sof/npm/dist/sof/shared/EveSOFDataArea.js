import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_Primary, _init_extra_Primary, _init_Glass, _init_extra_Glass, _init_Sails, _init_extra_Sails, _init_Reactor, _init_extra_Reactor, _init_Darkhull, _init_extra_Darkhull, _init_Rock, _init_extra_Rock, _init_Monument, _init_extra_Monument, _init_Ornament, _init_extra_Ornament, _init_SimplePrimary, _init_extra_SimplePrimary, _init_Turret, _init_extra_Turret;

/** Carbon area-material slots in canonical AreaType order. */
let _EveSOFDataArea;
new class extends _identity {
  static [class EveSOFDataArea extends CjsModel {
    static {
      ({
        e: [_init_Primary, _init_extra_Primary, _init_Glass, _init_extra_Glass, _init_Sails, _init_extra_Sails, _init_Reactor, _init_extra_Reactor, _init_Darkhull, _init_extra_Darkhull, _init_Rock, _init_extra_Rock, _init_Monument, _init_extra_Monument, _init_Ornament, _init_extra_Ornament, _init_SimplePrimary, _init_extra_SimplePrimary, _init_Turret, _init_extra_Turret],
        c: [_EveSOFDataArea, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveSOFDataArea",
        family: "eve"
      })], [[[io, io.persist, void 0, type.objectRef("EveSOFDataAreaMaterial")], 16, "Primary"], [[io, io.persist, void 0, type.objectRef("EveSOFDataAreaMaterial")], 16, "Glass"], [[io, io.persist, void 0, type.objectRef("EveSOFDataAreaMaterial")], 16, "Sails"], [[io, io.persist, void 0, type.objectRef("EveSOFDataAreaMaterial")], 16, "Reactor"], [[io, io.persist, void 0, type.objectRef("EveSOFDataAreaMaterial")], 16, "Darkhull"], [[io, io.persist, void 0, type.objectRef("EveSOFDataAreaMaterial")], 16, "Rock"], [[io, io.persist, void 0, type.objectRef("EveSOFDataAreaMaterial")], 16, "Monument"], [[io, io.persist, void 0, type.objectRef("EveSOFDataAreaMaterial")], 16, "Ornament"], [[io, io.persist, void 0, type.objectRef("EveSOFDataAreaMaterial")], 16, "SimplePrimary"], [[io, io.persist, void 0, type.objectRef("EveSOFDataAreaMaterial")], 16, "Turret"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_Turret(this);
    }
    /** m_materials[TYPE_PRIMARY] (EveSOFDataAreaMaterialPtr) [READWRITE, PERSIST] */
    Primary = _init_Primary(this, null);

    /** m_materials[TYPE_GLASS] (EveSOFDataAreaMaterialPtr) [READWRITE, PERSIST] */
    Glass = (_init_extra_Primary(this), _init_Glass(this, null));

    /** m_materials[TYPE_SAILS] (EveSOFDataAreaMaterialPtr) [READWRITE, PERSIST] */
    Sails = (_init_extra_Glass(this), _init_Sails(this, null));

    /** m_materials[TYPE_REACTOR] (EveSOFDataAreaMaterialPtr) [READWRITE, PERSIST] */
    Reactor = (_init_extra_Sails(this), _init_Reactor(this, null));

    /** m_materials[TYPE_DARKHULL] (EveSOFDataAreaMaterialPtr) [READWRITE, PERSIST] */
    Darkhull = (_init_extra_Reactor(this), _init_Darkhull(this, null));

    /** m_materials[TYPE_ROCK] (EveSOFDataAreaMaterialPtr) [READWRITE, PERSIST] */
    Rock = (_init_extra_Darkhull(this), _init_Rock(this, null));

    /** m_materials[TYPE_MONUMENT] (EveSOFDataAreaMaterialPtr) [READWRITE, PERSIST] */
    Monument = (_init_extra_Rock(this), _init_Monument(this, null));

    /** m_materials[TYPE_ORNAMENT] (EveSOFDataAreaMaterialPtr) [READWRITE, PERSIST] */
    Ornament = (_init_extra_Monument(this), _init_Ornament(this, null));

    /** m_materials[TYPE_SIMPLEPRIMARY] (EveSOFDataAreaMaterialPtr) [READWRITE, PERSIST] */
    SimplePrimary = (_init_extra_Ornament(this), _init_SimplePrimary(this, null));

    /** m_materials[TYPE_TURRET] (EveSOFDataAreaMaterialPtr) [READWRITE, PERSIST] */
    Turret = (_init_extra_SimplePrimary(this), _init_Turret(this, null));
    GetTypeByIndex(type) {
      const name = this.constructor.Types[type];
      return name ? this[name] : null;
    }
    Has(type) {
      return this.GetTypeByIndex(type) !== null;
    }
    Get(type) {
      const value = this.GetTypeByIndex(type);
      if (value === null) throw new ErrSOFAreaTypeNotFound(type);
      return value;
    }
  }];
  Types = Object.freeze(["Primary", "Glass", "Sails", "Reactor", "Darkhull", null, "Rock", "Monument", "Ornament", "SimplePrimary", "Turret"]);
  AreaType = Object.freeze({
    TYPE_PRIMARY: 0,
    TYPE_GLASS: 1,
    TYPE_SAILS: 2,
    TYPE_REACTOR: 3,
    TYPE_DARKHULL: 4,
    TYPE_WRECK: 5,
    TYPE_ROCK: 6,
    TYPE_MONUMENT: 7,
    TYPE_ORNAMENT: 8,
    TYPE_SIMPLEPRIMARY: 9,
    TYPE_TURRET: 10,
    TYPE_MAX: 11,
    TYPE_NO_OVERWRITE: 11
  });
  constructor() {
    super(_EveSOFDataArea), _initClass();
  }
}();
class ErrSOFAreaTypeNotFound extends Error {
  constructor(type) {
    super(`SOF area type not found (${type})`);
    this.name = "ErrSOFAreaTypeNotFound";
    this.code = "EVE_SOF_AREA_TYPE_NOT_FOUND";
    this.type = type;
  }
}

export { ErrSOFAreaTypeNotFound, _EveSOFDataArea as EveSOFDataArea };
//# sourceMappingURL=EveSOFDataArea.js.map
