// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";
import { EveSOFDataParameter } from "../shared/EveSOFDataParameter.js";
import { EveSOFDataTexture } from "../shared/EveSOFDataTexture.js";

/** EveSOFDataRaceDamage (eve) - generated from schema shapeHash 87369617.... */
@type.define({ className: "EveSOFDataRaceDamage", family: "eve" })
export class EveSOFDataRaceDamage extends CjsModel
{

  /** m_armorImpactParameters (PEveSOFDataParameterVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataParameter")
  armorImpactParameters = [];

  /** m_armorImpactTextures (PEveSOFDataTextureVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataTexture")
  armorImpactTextures = [];

  /** m_shieldImpactParameters (PEveSOFDataParameterVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataParameter")
  shieldImpactParameters = [];

  /** m_shieldImpactTextures (PEveSOFDataTextureVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataTexture")
  shieldImpactTextures = [];

  /**
   * Ensures output maps exist and writes the race's armor-impact parameters and
   * texture paths into them.
   */
  AssignArmor(out = {})
  {
    out.parameters ??= {};
    out.textures ??= {};
    for (const parameter of this.armorImpactParameters) parameter.Assign(out.parameters);
    for (const texture of this.armorImpactTextures) texture.Assign(out.textures);
    return out;
  }

  /**
   * Ensures output maps exist and writes the race's shield-impact parameters and
   * texture paths into them.
   */
  AssignShield(out = {})
  {
    out.parameters ??= {};
    out.textures ??= {};
    for (const parameter of this.shieldImpactParameters) parameter.Assign(out.parameters);
    for (const texture of this.shieldImpactTextures) texture.Assign(out.textures);
    return out;
  }

  /**
   * Merges base and override armor and shield parameter and texture lists by
   * authored name into a reusable damage record.
   */
  static combine(base, overrides, out = null)
  {
    out ??= new this();
    base ??= new this();
    EveSOFDataTexture.combineArrays(base.armorImpactTextures, overrides?.armorImpactTextures, out.armorImpactTextures);
    EveSOFDataTexture.combineArrays(base.shieldImpactTextures, overrides?.shieldImpactTextures, out.shieldImpactTextures);
    EveSOFDataParameter.combineArrays(base.armorImpactParameters, overrides?.armorImpactParameters, out.armorImpactParameters);
    EveSOFDataParameter.combineArrays(base.shieldImpactParameters, overrides?.shieldImpactParameters, out.shieldImpactParameters);
    return out;
  }

}
