// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h:177-243
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.cpp:42-52
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue.cpp:10-56, 153-198
import { meta } from "#schema";
import { be, EnumRegistrationType } from "#blue";
import { color } from "#math/color";
import { vec4 } from "#math/vec4";

/**
 * `SOFDataFactionColorChooser::ColorType` (EveSOFData.h:177-224); TYPE_MAX is the slot count.
 * @type {Object<string, number>}
 */
const ColorType = {
  TYPE_PRIMARY: 0,
  TYPE_SECONDARY: 1,
  TYPE_TERTIARY: 2,
  TYPE_BLACK: 3,
  TYPE_WHITE: 4,
  TYPE_YELLOW: 5,
  TYPE_ORANGE: 6,
  TYPE_RED: 7,
  TYPE_BLUE: 8,
  TYPE_GREEN: 9,
  TYPE_CYAN: 10,
  TYPE_FIRE: 11,
  TYPE_HULL: 12,
  TYPE_GLASS: 13,
  TYPE_REACTOR: 14,
  TYPE_DARKHULL: 15,
  TYPE_BOOSTER: 16,
  TYPE_KILLMARK: 17,
  TYPE_PRIMARY_LIGHT: 18,
  TYPE_SECONDARY_LIGHT: 19,
  TYPE_TERTIARY_LIGHT: 20,
  TYPE_WHITE_LIGHT: 21,
  TYPE_PRIMARY_HOLOGRAM: 22,
  TYPE_SECONDARY_HOLOGRAM: 23,
  TYPE_TERTIARY_HOLOGRAM: 24,
  TYPE_STATE_0: 25,
  TYPE_STATE_1: 26,
  TYPE_STATE_2: 27,
  TYPE_STATE_3: 28,
  TYPE_STATE_VULNERABLE: 29,
  TYPE_STATE_INVULNERABLE: 30,
  TYPE_PRIMARY_FORCEFIELD: 31,
  TYPE_SECONDARY_FORCEFIELD: 32,
  TYPE_PRIMARY_BANNER: 33,
  TYPE_PRIMARY_FX: 34,
  TYPE_SECONDARY_FX: 35,
  TYPE_PRIMARY_SPOTLIGHT: 36,
  TYPE_SECONDARY_SPOTLIGHT: 37,
  TYPE_TERTIARY_SPOTLIGHT: 38,
  TYPE_PRIMARY_BILLBOARD: 39,
  TYPE_PRIMARY_WARP_FX: 40,
  TYPE_PRIMARY_ATTACK_FX: 41,
  TYPE_PRIMARY_SIEGE_FX: 42,
  TYPE_PRIMARY_DOCKED_FX: 43,
  TYPE_MAX: 44
};

/** One exposed `m_colors[type]` slot, named by its chooser key (EveSOFData_Blue.cpp:156-197). */
const slot = (name, index) => ({ name, key: "colors", index, type: { kind: "color" },
  edit: { read: true, write: true, persist: true } });

/**
 * A faction's colour palette: `Color m_colors[TYPE_MAX]`, exposed by chooser
 * name. Declarations keep the order this class has always exported.
 */
@meta.define({ className: "EveSOFDataFactionColorSet", family: "eve", members: [
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
] })
export class EveSOFDataFactionColorSet
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
  @meta.ours
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

// Native chooser labels and descriptions are distinct from C++ member names.
be.enums.Create("trinity.SOFDataFactionColorChooser.ColorType", ColorType, {
  source: "trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h", family: "eve", line: 177,
  exposedName: "EveSOFDataFactionColorSetType", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue.cpp:10",
  chooser: [
    { name: "Primary", value: ColorType.TYPE_PRIMARY, description: "Primary Color" },
    { name: "Secondary", value: ColorType.TYPE_SECONDARY, description: "Secondary Color" },
    { name: "Tertiary", value: ColorType.TYPE_TERTIARY, description: "Tertiary Color" },
    { name: "Black", value: ColorType.TYPE_BLACK, description: "Black Color" },
    { name: "White", value: ColorType.TYPE_WHITE, description: "White" },
    { name: "Yellow", value: ColorType.TYPE_YELLOW, description: "Yellow" },
    { name: "Orange", value: ColorType.TYPE_ORANGE, description: "Orange" },
    { name: "Red", value: ColorType.TYPE_RED, description: "Red" },
    { name: "Blue", value: ColorType.TYPE_BLUE, description: "Blue" },
    { name: "Green", value: ColorType.TYPE_GREEN, description: "Green" },
    { name: "Cyan", value: ColorType.TYPE_CYAN, description: "Cyan" },
    { name: "Fire", value: ColorType.TYPE_FIRE, description: "Fire" },
    { name: "Hull", value: ColorType.TYPE_HULL, description: "Material Hullarea Glow" },
    { name: "Glass", value: ColorType.TYPE_GLASS, description: "Material Glassarea Glow" },
    { name: "Reactor", value: ColorType.TYPE_REACTOR, description: "Material Reactorarea Glow" },
    { name: "Darkhull", value: ColorType.TYPE_DARKHULL, description: "Material Darkhull Glow" },
    { name: "Booster", value: ColorType.TYPE_BOOSTER, description: "Material Hullarea Heat Shimmer Glow" },
    { name: "Killmark", value: ColorType.TYPE_KILLMARK, description: "Killmark glow color" },
    { name: "PrimaryLight", value: ColorType.TYPE_PRIMARY_LIGHT, description: "Primary light color" },
    { name: "SecondaryLight", value: ColorType.TYPE_SECONDARY_LIGHT, description: "Secondary light color" },
    { name: "TertiaryLight", value: ColorType.TYPE_TERTIARY_LIGHT, description: "Tertiary light color" },
    { name: "WhiteLight", value: ColorType.TYPE_WHITE_LIGHT, description: "White light color" },
    { name: "PrimaryHologram", value: ColorType.TYPE_PRIMARY_HOLOGRAM, description: "Primary Hologram" },
    { name: "SecondaryHologram", value: ColorType.TYPE_SECONDARY_HOLOGRAM, description: "Secondary Hologram color" },
    { name: "TertiaryHologram", value: ColorType.TYPE_TERTIARY_HOLOGRAM, description: "Tertiary Hologram color" },
    { name: "State0", value: ColorType.TYPE_STATE_0, description: "State 0 color" },
    { name: "State1", value: ColorType.TYPE_STATE_1, description: "State 1 color" },
    { name: "State2", value: ColorType.TYPE_STATE_2, description: "State 2 color" },
    { name: "State3", value: ColorType.TYPE_STATE_3, description: "State 3 color" },
    { name: "StateVulnerable", value: ColorType.TYPE_STATE_VULNERABLE, description: "State Vulnerable color" },
    { name: "StateInvulnerable", value: ColorType.TYPE_STATE_INVULNERABLE, description: "State Invulnerable color" },
    { name: "PrimaryForcefield", value: ColorType.TYPE_PRIMARY_FORCEFIELD, description: "Primary Forcefield color" },
    { name: "SecondaryForcefield", value: ColorType.TYPE_SECONDARY_FORCEFIELD, description: "Secondary Forcefield color" },
    { name: "PrimaryBanner", value: ColorType.TYPE_PRIMARY_BANNER, description: "Primary Banner color" },
    { name: "PrimaryFx", value: ColorType.TYPE_PRIMARY_FX, description: "Primary Fx color" },
    { name: "SecondaryFx", value: ColorType.TYPE_SECONDARY_FX, description: "Secondary Fx color" },
    { name: "PrimarySpotlight", value: ColorType.TYPE_PRIMARY_SPOTLIGHT, description: "Primary spotlight color" },
    { name: "SecondarySpotlight", value: ColorType.TYPE_SECONDARY_SPOTLIGHT, description: "Secondary spotlight color" },
    { name: "TertiarySpotlight", value: ColorType.TYPE_TERTIARY_SPOTLIGHT, description: "Tertiary spotlight color" },
    { name: "PrimaryBillboard", value: ColorType.TYPE_PRIMARY_BILLBOARD, description: "Primary Billboard color" },
    { name: "PrimaryWarpFx", value: ColorType.TYPE_PRIMARY_WARP_FX, description: "Primary Warp FX color" },
    { name: "PrimaryAttackFX", value: ColorType.TYPE_PRIMARY_ATTACK_FX, description: "Primary Attack FX color" },
    { name: "PrimarySiegeFX", value: ColorType.TYPE_PRIMARY_SIEGE_FX, description: "Primary Siege FX color" },
    { name: "PrimaryDockedFX", value: ColorType.TYPE_PRIMARY_DOCKED_FX, description: "Primary Docked FX color" }
  ]
});
