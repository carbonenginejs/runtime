import { IRoot } from "../../global/blue/IRoot.js";
import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h:177-243
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.cpp:42-52
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue.cpp:10-56, 153-198
import { type, blue as legacyBlue } from "#schema";
import { ColorType } from "#consts/graphics";
import { color } from "#math/color";
import { vec4 } from "#math/vec4";


/**
 * A faction's colour palette: `Color m_colors[TYPE_MAX]`, exposed by chooser
 * name. Declarations keep the order this class has always exported.
 */
@be.define("EveSOFDataFactionColorSet")
@legacyBlue.inherit(IRoot)
export class EveSOFDataFactionColorSet extends IRoot
{
  static ColorType = ColorType;

  /**
   * m_colors: one linear colour per ColorType. The constructor fills every
   * slot with (0, 0, 0, 1), then sets the authored defaults (EveSOFData.cpp:42-51).
   * @type {Array<Float32Array>}
   */
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "Killmark", ColorType.TYPE_KILLMARK)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "PrimaryForcefield", ColorType.TYPE_PRIMARY_FORCEFIELD)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "SecondaryForcefield", ColorType.TYPE_SECONDARY_FORCEFIELD)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "PrimaryFx", ColorType.TYPE_PRIMARY_FX)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "SecondaryFx", ColorType.TYPE_SECONDARY_FX)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "PrimaryWarpFx", ColorType.TYPE_PRIMARY_WARP_FX)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "PrimaryAttackFX", ColorType.TYPE_PRIMARY_ATTACK_FX)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "PrimarySiegeFX", ColorType.TYPE_PRIMARY_SIEGE_FX)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "PrimaryDockedFX", ColorType.TYPE_PRIMARY_DOCKED_FX)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "Primary", ColorType.TYPE_PRIMARY)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "Secondary", ColorType.TYPE_SECONDARY)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "Tertiary", ColorType.TYPE_TERTIARY)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "Black", ColorType.TYPE_BLACK)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "White", ColorType.TYPE_WHITE)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "Yellow", ColorType.TYPE_YELLOW)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "Orange", ColorType.TYPE_ORANGE)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "Red", ColorType.TYPE_RED)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "Blue", ColorType.TYPE_BLUE)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "Green", ColorType.TYPE_GREEN)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "Cyan", ColorType.TYPE_CYAN)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "Fire", ColorType.TYPE_FIRE)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "PrimaryHologram", ColorType.TYPE_PRIMARY_HOLOGRAM)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "SecondaryHologram", ColorType.TYPE_SECONDARY_HOLOGRAM)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "TertiaryHologram", ColorType.TYPE_TERTIARY_HOLOGRAM)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "PrimaryLight", ColorType.TYPE_PRIMARY_LIGHT)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "SecondaryLight", ColorType.TYPE_SECONDARY_LIGHT)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "TertiaryLight", ColorType.TYPE_TERTIARY_LIGHT)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "WhiteLight", ColorType.TYPE_WHITE_LIGHT)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "Hull", ColorType.TYPE_HULL)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "Glass", ColorType.TYPE_GLASS)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "Reactor", ColorType.TYPE_REACTOR)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "Darkhull", ColorType.TYPE_DARKHULL)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "Booster", ColorType.TYPE_BOOSTER)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "PrimaryBanner", ColorType.TYPE_PRIMARY_BANNER)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "PrimaryBillboard", ColorType.TYPE_PRIMARY_BILLBOARD)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "PrimarySpotlight", ColorType.TYPE_PRIMARY_SPOTLIGHT)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "SecondarySpotlight", ColorType.TYPE_SECONDARY_SPOTLIGHT)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "TertiarySpotlight", ColorType.TYPE_TERTIARY_SPOTLIGHT)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "State0", ColorType.TYPE_STATE_0)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "State1", ColorType.TYPE_STATE_1)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "State2", ColorType.TYPE_STATE_2)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "State3", ColorType.TYPE_STATE_3)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "StateVulnerable", ColorType.TYPE_STATE_VULNERABLE)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "StateInvulnerable", ColorType.TYPE_STATE_INVULNERABLE)
  @type.array({ kind: "color" })
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

