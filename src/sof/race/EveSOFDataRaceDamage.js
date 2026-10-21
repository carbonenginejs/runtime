import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";
import { EveSOFDataParameter } from "../shared/EveSOFDataParameter.js";
import { EveSOFDataTexture } from "../shared/EveSOFDataTexture.js";

/** Stores, combines, and assigns race-level armor and shield damage parameters and textures. */
@be.define("EveSOFDataRaceDamage")

@blue.inherit(IRoot)
export class EveSOFDataRaceDamage extends IRoot
{

  /** m_armorImpactParameters (PEveSOFDataParameterVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveSOFDataParameter")
  armorImpactParameters = [];

  /** m_armorImpactTextures (PEveSOFDataTextureVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveSOFDataTexture")
  armorImpactTextures = [];

  /** m_shieldImpactParameters (PEveSOFDataParameterVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveSOFDataParameter")
  shieldImpactParameters = [];

  /** m_shieldImpactTextures (PEveSOFDataTextureVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

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
