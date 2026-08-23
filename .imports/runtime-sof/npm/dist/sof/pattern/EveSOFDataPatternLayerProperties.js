import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_projectionTypeU, _init_extra_projectionTypeU, _init_projectionTypeV, _init_extra_projectionTypeV, _init_Primary, _init_extra_Primary, _init_Glass, _init_extra_Glass, _init_Sails, _init_extra_Sails, _init_Reactor, _init_extra_Reactor, _init_Darkhull, _init_extra_Darkhull, _init_Rock, _init_extra_Rock, _init_Monument, _init_extra_Monument, _init_Ornament, _init_extra_Ornament, _init_SimplePrimary, _init_extra_SimplePrimary, _init_isTargetMtl, _init_extra_isTargetMtl, _init_isTargetMtl2, _init_extra_isTargetMtl2, _init_isTargetMtl3, _init_extra_isTargetMtl3, _init_isTargetMtl4, _init_extra_isTargetMtl4;

/** EveSOFDataPatternLayerProperties (eve) - generated from schema shapeHash 3f25edf9.... */
let _EveSOFDataPatternLay;
new class extends _identity {
  static [class EveSOFDataPatternLayerProperties extends CjsModel {
    static {
      ({
        e: [_init_projectionTypeU, _init_extra_projectionTypeU, _init_projectionTypeV, _init_extra_projectionTypeV, _init_Primary, _init_extra_Primary, _init_Glass, _init_extra_Glass, _init_Sails, _init_extra_Sails, _init_Reactor, _init_extra_Reactor, _init_Darkhull, _init_extra_Darkhull, _init_Rock, _init_extra_Rock, _init_Monument, _init_extra_Monument, _init_Ornament, _init_extra_Ornament, _init_SimplePrimary, _init_extra_SimplePrimary, _init_isTargetMtl, _init_extra_isTargetMtl, _init_isTargetMtl2, _init_extra_isTargetMtl2, _init_isTargetMtl3, _init_extra_isTargetMtl3, _init_isTargetMtl4, _init_extra_isTargetMtl4],
        c: [_EveSOFDataPatternLay, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveSOFDataPatternLayerProperties",
        family: "eve"
      })], [[[io, io.persist, type, type.int32, void 0, type.enum("ProjectionType")], 16, "projectionTypeU"], [[io, io.persist, type, type.int32, void 0, type.enum("ProjectionType")], 16, "projectionTypeV"], [[io, io.persist, type, type.boolean], 16, "Primary"], [[io, io.persist, type, type.boolean], 16, "Glass"], [[io, io.persist, type, type.boolean], 16, "Sails"], [[io, io.persist, type, type.boolean], 16, "Reactor"], [[io, io.persist, type, type.boolean], 16, "Darkhull"], [[io, io.persist, type, type.boolean], 16, "Rock"], [[io, io.persist, type, type.boolean], 16, "Monument"], [[io, io.persist, type, type.boolean], 16, "Ornament"], [[io, io.persist, type, type.boolean], 16, "SimplePrimary"], [[io, io.persist, type, type.boolean], 16, "isTargetMtl1"], [[io, io.persist, type, type.boolean], 16, "isTargetMtl2"], [[io, io.persist, type, type.boolean], 16, "isTargetMtl3"], [[io, io.persist, type, type.boolean], 16, "isTargetMtl4"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_isTargetMtl4(this);
    }
    /** m_projectionTypeU (ProjectionType - enum ProjectionType) [READWRITE, PERSIST, ENUM] */
    projectionTypeU = _init_projectionTypeU(this, 0);

    /** m_projectionTypeV (ProjectionType - enum ProjectionType) [READWRITE, PERSIST, ENUM] */
    projectionTypeV = (_init_extra_projectionTypeU(this), _init_projectionTypeV(this, 0));

    /** m_applicableAreas[EveSOFDataArea::AreaType::TYPE_PRIMARY] (bool) [READWRITE, PERSIST] */
    Primary = (_init_extra_projectionTypeV(this), _init_Primary(this, true));

    /** m_applicableAreas[EveSOFDataArea::AreaType::TYPE_GLASS] (bool) [READWRITE, PERSIST] */
    Glass = (_init_extra_Primary(this), _init_Glass(this, true));

    /** m_applicableAreas[EveSOFDataArea::AreaType::TYPE_SAILS] (bool) [READWRITE, PERSIST] */
    Sails = (_init_extra_Glass(this), _init_Sails(this, true));

    /** m_applicableAreas[EveSOFDataArea::AreaType::TYPE_REACTOR] (bool) [READWRITE, PERSIST] */
    Reactor = (_init_extra_Sails(this), _init_Reactor(this, true));

    /** m_applicableAreas[EveSOFDataArea::AreaType::TYPE_DARKHULL] (bool) [READWRITE, PERSIST] */
    Darkhull = (_init_extra_Reactor(this), _init_Darkhull(this, true));

    /** m_applicableAreas[EveSOFDataArea::AreaType::TYPE_ROCK] (bool) [READWRITE, PERSIST] */
    Rock = (_init_extra_Darkhull(this), _init_Rock(this, true));

    /** m_applicableAreas[EveSOFDataArea::AreaType::TYPE_MONUMENT] (bool) [READWRITE, PERSIST] */
    Monument = (_init_extra_Rock(this), _init_Monument(this, true));

    /** m_applicableAreas[EveSOFDataArea::AreaType::TYPE_ORNAMENT] (bool) [READWRITE, PERSIST] */
    Ornament = (_init_extra_Monument(this), _init_Ornament(this, true));

    /** m_applicableAreas[EveSOFDataArea::AreaType::TYPE_SIMPLEPRIMARY] (bool) [READWRITE, PERSIST] */
    SimplePrimary = (_init_extra_Ornament(this), _init_SimplePrimary(this, true));

    /** m_isTargetMtl1 (bool) [READWRITE, PERSIST] */
    isTargetMtl1 = (_init_extra_SimplePrimary(this), _init_isTargetMtl(this, true));

    /** m_isTargetMtl2 (bool) [READWRITE, PERSIST] */
    isTargetMtl2 = (_init_extra_isTargetMtl(this), _init_isTargetMtl2(this, true));

    /** m_isTargetMtl3 (bool) [READWRITE, PERSIST] */
    isTargetMtl3 = (_init_extra_isTargetMtl2(this), _init_isTargetMtl3(this, true));

    /** m_isTargetMtl4 (bool) [READWRITE, PERSIST] */
    isTargetMtl4 = (_init_extra_isTargetMtl3(this), _init_isTargetMtl4(this, true));
    IsApplicableToArea(areaType) {
      const name = typeof areaType === "number" ? this.constructor.AreaTypes[areaType] : areaType;
      return name ? this[name] !== false : true;
    }
  }];
  ProjectionType = Object.freeze({
    PROJECTION_REPEAT: 0,
    PROJECTION_CLAMP: 1,
    PROJECTION_BORDER: 2
  });
  AreaTypes = Object.freeze(["Primary", "Glass", "Sails", "Reactor", "Darkhull", null, "Rock", "Monument", "Ornament", "SimplePrimary", null]);
  constructor() {
    super(_EveSOFDataPatternLay), _initClass();
  }
}();

export { _EveSOFDataPatternLay as EveSOFDataPatternLayerProperties };
//# sourceMappingURL=EveSOFDataPatternLayerProperties.js.map
