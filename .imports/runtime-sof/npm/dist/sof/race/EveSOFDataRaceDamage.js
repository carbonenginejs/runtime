import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { EveSOFDataParameter as _EveSOFDataParameter } from '../shared/EveSOFDataParameter.js';
import { EveSOFDataTexture as _EveSOFDataTexture } from '../shared/EveSOFDataTexture.js';

let _initClass, _init_armorImpactParameters, _init_extra_armorImpactParameters, _init_armorImpactTextures, _init_extra_armorImpactTextures, _init_shieldImpactParameters, _init_extra_shieldImpactParameters, _init_shieldImpactTextures, _init_extra_shieldImpactTextures;

/** EveSOFDataRaceDamage (eve) - generated from schema shapeHash 87369617.... */
let _EveSOFDataRaceDamage;
class EveSOFDataRaceDamage extends CjsModel {
  static {
    ({
      e: [_init_armorImpactParameters, _init_extra_armorImpactParameters, _init_armorImpactTextures, _init_extra_armorImpactTextures, _init_shieldImpactParameters, _init_extra_shieldImpactParameters, _init_shieldImpactTextures, _init_extra_shieldImpactTextures],
      c: [_EveSOFDataRaceDamage, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataRaceDamage",
      family: "eve"
    })], [[[io, io.persist, void 0, type.list("EveSOFDataParameter")], 16, "armorImpactParameters"], [[io, io.persist, void 0, type.list("EveSOFDataTexture")], 16, "armorImpactTextures"], [[io, io.persist, void 0, type.list("EveSOFDataParameter")], 16, "shieldImpactParameters"], [[io, io.persist, void 0, type.list("EveSOFDataTexture")], 16, "shieldImpactTextures"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_shieldImpactTextures(this);
  }
  /** m_armorImpactParameters (PEveSOFDataParameterVector) [READ, PERSIST] */
  armorImpactParameters = _init_armorImpactParameters(this, []);

  /** m_armorImpactTextures (PEveSOFDataTextureVector) [READ, PERSIST] */
  armorImpactTextures = (_init_extra_armorImpactParameters(this), _init_armorImpactTextures(this, []));

  /** m_shieldImpactParameters (PEveSOFDataParameterVector) [READ, PERSIST] */
  shieldImpactParameters = (_init_extra_armorImpactTextures(this), _init_shieldImpactParameters(this, []));

  /** m_shieldImpactTextures (PEveSOFDataTextureVector) [READ, PERSIST] */
  shieldImpactTextures = (_init_extra_shieldImpactParameters(this), _init_shieldImpactTextures(this, []));
  AssignArmor(out = {}) {
    out.parameters ??= {};
    out.textures ??= {};
    for (const parameter of this.armorImpactParameters) parameter.Assign(out.parameters);
    for (const texture of this.armorImpactTextures) texture.Assign(out.textures);
    return out;
  }
  AssignShield(out = {}) {
    out.parameters ??= {};
    out.textures ??= {};
    for (const parameter of this.shieldImpactParameters) parameter.Assign(out.parameters);
    for (const texture of this.shieldImpactTextures) texture.Assign(out.textures);
    return out;
  }
  static combine(base, overrides, out = null) {
    out ??= new this();
    base ??= new this();
    _EveSOFDataTexture.combineArrays(base.armorImpactTextures, overrides?.armorImpactTextures, out.armorImpactTextures);
    _EveSOFDataTexture.combineArrays(base.shieldImpactTextures, overrides?.shieldImpactTextures, out.shieldImpactTextures);
    _EveSOFDataParameter.combineArrays(base.armorImpactParameters, overrides?.armorImpactParameters, out.armorImpactParameters);
    _EveSOFDataParameter.combineArrays(base.shieldImpactParameters, overrides?.shieldImpactParameters, out.shieldImpactParameters);
    return out;
  }
  static {
    _initClass();
  }
}

export { _EveSOFDataRaceDamage as EveSOFDataRaceDamage };
//# sourceMappingURL=EveSOFDataRaceDamage.js.map
