import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h:177-243
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.cpp:42-52
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue.cpp:10-56, 153-198
import { blue as legacyBlue } from "#schema";
import { FactionColorType as ColorType } from "#consts/graphics";
import { color } from "#math/color";
import { vec4 } from "#math/vec4";


/** One exposed `m_colors[type]` slot, named by its chooser key (EveSOFData_Blue.cpp:156-197). */
const slot = (name, index) => ({ name, key: "colors", index, type: { kind: "color" },
  edit: { read: true, write: true, persist: true } });

/**
 * A faction's colour palette: `Color m_colors[TYPE_MAX]`, exposed by chooser
 * name. Declarations keep the order this class has always exported.
 */
@legacyBlue.define({
  className: "EveSOFDataFactionColorSet",
  members: [
  slot("Killmark", ColorType.TYPE_KILLMARK),
  slot("PrimaryForcefield", ColorType.TYPE_PRIMARY_FORCEFIELD),
  slot("SecondaryForcefield", ColorType.TYPE_SECONDARY_FORCEFIELD),
  slot("PrimaryFx", ColorType.TYPE_PRIMARY_FX),
  slot("SecondaryFx", ColorType.TYPE_SECONDARY_FX),
  slot("PrimaryWarpFx", ColorType.TYPE_PRIMARY_WARP_FX),
  slot("PrimaryAttackFX", ColorType.TYPE_PRIMARY_ATTACK_FX),
  slot("PrimarySiegeFX", ColorType.TYPE_PRIMARY_SIEGE_FX),
  slot("PrimaryDockedFX", ColorType.TYPE_PRIMARY_DOCKED_FX),
  slot("Primary", ColorType.TYPE_PRIMARY),
  slot("Secondary", ColorType.TYPE_SECONDARY),
  slot("Tertiary", ColorType.TYPE_TERTIARY),
  slot("Black", ColorType.TYPE_BLACK),
  slot("White", ColorType.TYPE_WHITE),
  slot("Yellow", ColorType.TYPE_YELLOW),
  slot("Orange", ColorType.TYPE_ORANGE),
  slot("Red", ColorType.TYPE_RED),
  slot("Blue", ColorType.TYPE_BLUE),
  slot("Green", ColorType.TYPE_GREEN),
  slot("Cyan", ColorType.TYPE_CYAN),
  slot("Fire", ColorType.TYPE_FIRE),
  slot("PrimaryHologram", ColorType.TYPE_PRIMARY_HOLOGRAM),
  slot("SecondaryHologram", ColorType.TYPE_SECONDARY_HOLOGRAM),
  slot("TertiaryHologram", ColorType.TYPE_TERTIARY_HOLOGRAM),
  slot("PrimaryLight", ColorType.TYPE_PRIMARY_LIGHT),
  slot("SecondaryLight", ColorType.TYPE_SECONDARY_LIGHT),
  slot("TertiaryLight", ColorType.TYPE_TERTIARY_LIGHT),
  slot("WhiteLight", ColorType.TYPE_WHITE_LIGHT),
  slot("Hull", ColorType.TYPE_HULL),
  slot("Glass", ColorType.TYPE_GLASS),
  slot("Reactor", ColorType.TYPE_REACTOR),
  slot("Darkhull", ColorType.TYPE_DARKHULL),
  slot("Booster", ColorType.TYPE_BOOSTER),
  slot("PrimaryBanner", ColorType.TYPE_PRIMARY_BANNER),
  slot("PrimaryBillboard", ColorType.TYPE_PRIMARY_BILLBOARD),
  slot("PrimarySpotlight", ColorType.TYPE_PRIMARY_SPOTLIGHT),
  slot("SecondarySpotlight", ColorType.TYPE_SECONDARY_SPOTLIGHT),
  slot("TertiarySpotlight", ColorType.TYPE_TERTIARY_SPOTLIGHT),
  slot("State0", ColorType.TYPE_STATE_0),
  slot("State1", ColorType.TYPE_STATE_1),
  slot("State2", ColorType.TYPE_STATE_2),
  slot("State3", ColorType.TYPE_STATE_3),
  slot("StateVulnerable", ColorType.TYPE_STATE_VULNERABLE),
  slot("StateInvulnerable", ColorType.TYPE_STATE_INVULNERABLE)
]
})
@legacyBlue.inherit(IRoot)
@legacyBlue.interface()
export class EveSOFDataFactionColorSet extends IRoot
{
  static ColorType = ColorType;

  /**
   * m_colors: one linear colour per ColorType. The constructor fills every
   * slot with (0, 0, 0, 1), then sets the authored defaults (EveSOFData.cpp:42-51).
   * @type {Array<Float32Array>}
   */
  colors = EveSOFDataFactionColorSet.createColors();

  /**
   * Builds the default slot array.
   *
   * Custom: JavaScript factory for the constructor's array fill.
   * @returns {Array<Float32Array>} One colour per ColorType.
   */
  static createColors()
  {
    const colors = Array.from({ length: ColorType.TYPE_MAX }, () => color.createLinear());
    colors[ColorType.TYPE_PRIMARY_WARP_FX] = vec4.fromValues(1, 99 / 255, 51 / 255, 1);
    colors[ColorType.TYPE_PRIMARY_ATTACK_FX] = vec4.fromValues(1, 24 / 255, 11 / 255, 1);
    colors[ColorType.TYPE_PRIMARY_SIEGE_FX] = vec4.fromValues(1, 94 / 255, 45 / 255, 1);
    colors[ColorType.TYPE_PRIMARY_DOCKED_FX] = vec4.fromValues(76 / 255, 130 / 255, 226 / 255, 1);
    colors[ColorType.TYPE_PRIMARY_BILLBOARD] = vec4.fromValues(2.5, 2.5, 2.5, 2.5);
    return colors;
  }
}

