// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { CjsModel } from "#model";
import { EveSOFDataBooster } from "../shared/EveSOFDataBooster.js";
import { EveSOFDataRaceDamage } from "./EveSOFDataRaceDamage.js";

/** EveSOFDataRace (eve) - generated from schema shapeHash f7cdba2b.... */
@type.define({ className: "EveSOFDataRace", family: "eve" })
export class EveSOFDataRace extends CjsModel
{

  /** m_hullPrimaryHeatColorType (SOFDataFactionColorChooser::ColorType - enum ColorType) [READWRITE, PERSIST, ENUM] */
  @edit.persist
  @type.int32
  @type.enum("ColorType")
  hullPrimaryHeatColorType = 16;

  /** m_hullReactorHeatColorType (SOFDataFactionColorChooser::ColorType - enum ColorType) [READWRITE, PERSIST, ENUM] */
  @edit.persist
  @type.int32
  @type.enum("ColorType")
  hullReactorHeatColorType = 14;

  /** m_booster (EveSOFDataBoosterPtr) [READWRITE, PERSIST] */
  @edit.persist
  @type.objectRef("EveSOFDataBooster")
  booster = null;

  /** m_damage (EveSOFDataRaceDamagePtr) [READWRITE, PERSIST] */
  @edit.persist
  @type.objectRef("EveSOFDataRaceDamage")
  damage = null;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @edit.persist
  @type.string
  name = "";

  /**
   * Composes the name, heat-color selectors, booster, and damage from base and
   * nonempty overrides into a reusable race record.
   */
  static combine(base, overrides, out = null)
  {
    out ??= new this();
    out.name = selectValue(base, overrides, "name", out.name);
    out.hullPrimaryHeatColorType = selectValue(base, overrides, "hullPrimaryHeatColorType", out.hullPrimaryHeatColorType);
    out.hullReactorHeatColorType = selectValue(base, overrides, "hullReactorHeatColorType", out.hullReactorHeatColorType);
    out.booster = base?.booster || overrides?.booster
      ? EveSOFDataBooster.combine(base?.booster, overrides?.booster, out.booster)
      : null;
    out.damage = base?.damage || overrides?.damage
      ? EveSOFDataRaceDamage.combine(base?.damage, overrides?.damage, out.damage)
      : null;
    return out;
  }

}

function selectValue(base, overrides, name, fallback)
{
  const value = overrides?.[name];
  if (value !== null && value !== undefined && value !== "") return value;
  return base?.[name] ?? fallback;
}
