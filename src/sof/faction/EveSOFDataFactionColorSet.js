// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { CjsModel } from "#model";
import { blue, EnumRegistrationType } from "#blue";
import { color } from "#math/color";
import { vec4 } from "#math/vec4";
import { ErrSOFFactionColorSetTypeUnknown } from "./ErrSOFFactionColorSetTypeUnknown.js";
import { ErrSOFFactionColorSetTypeNotFound } from "./ErrSOFFactionColorSetTypeNotFound.js";

/** Stores a faction's semantic color palette and resolves enum-selected colors into vectors. */
@type.define({ className: "EveSOFDataFactionColorSet", family: "eve" })
export class EveSOFDataFactionColorSet extends CjsModel
{

  /** m_colors[SOFDataFactionColorChooser::TYPE_KILLMARK] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  Killmark = color.createLinear();

  /** m_colors[SOFDataFactionColorChooser::TYPE_PRIMARY_FORCEFIELD] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  PrimaryForcefield = color.createLinear();

  /** m_colors[SOFDataFactionColorChooser::TYPE_SECONDARY_FORCEFIELD] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  SecondaryForcefield = color.createLinear();

  /** m_colors[SOFDataFactionColorChooser::TYPE_PRIMARY_FX] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  PrimaryFx = color.createLinear();

  /** m_colors[SOFDataFactionColorChooser::TYPE_SECONDARY_FX] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  SecondaryFx = color.createLinear();

  /** m_colors[SOFDataFactionColorChooser::TYPE_PRIMARY_WARP_FX] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  PrimaryWarpFx = vec4.fromValues(1, 99 / 255, 51 / 255, 1);

  /** m_colors[SOFDataFactionColorChooser::TYPE_PRIMARY_ATTACK_FX] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  PrimaryAttackFX = vec4.fromValues(1, 24 / 255, 11 / 255, 1);

  /** m_colors[SOFDataFactionColorChooser::TYPE_PRIMARY_SIEGE_FX] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  PrimarySiegeFX = vec4.fromValues(1, 94 / 255, 45 / 255, 1);

  /** m_colors[SOFDataFactionColorChooser::TYPE_PRIMARY_DOCKED_FX] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  PrimaryDockedFX = vec4.fromValues(76 / 255, 130 / 255, 226 / 255, 1);

  /** m_colors[SOFDataFactionColorChooser::TYPE_PRIMARY] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  Primary = color.createLinear();

  /** m_colors[SOFDataFactionColorChooser::TYPE_SECONDARY] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  Secondary = color.createLinear();

  /** m_colors[SOFDataFactionColorChooser::TYPE_TERTIARY] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  Tertiary = color.createLinear();

  /** m_colors[SOFDataFactionColorChooser::TYPE_BLACK] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  Black = color.createLinear();

  /** m_colors[SOFDataFactionColorChooser::TYPE_WHITE] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  White = color.createLinear();

  /** m_colors[SOFDataFactionColorChooser::TYPE_YELLOW] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  Yellow = color.createLinear();

  /** m_colors[SOFDataFactionColorChooser::TYPE_ORANGE] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  Orange = color.createLinear();

  /** m_colors[SOFDataFactionColorChooser::TYPE_RED] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  Red = color.createLinear();

  /** m_colors[SOFDataFactionColorChooser::TYPE_BLUE] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  Blue = color.createLinear();

  /** m_colors[SOFDataFactionColorChooser::TYPE_GREEN] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  Green = color.createLinear();

  /** m_colors[SOFDataFactionColorChooser::TYPE_CYAN] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  Cyan = color.createLinear();

  /** m_colors[SOFDataFactionColorChooser::TYPE_FIRE] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  Fire = color.createLinear();

  /** m_colors[SOFDataFactionColorChooser::TYPE_PRIMARY_HOLOGRAM] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  PrimaryHologram = color.createLinear();

  /** m_colors[SOFDataFactionColorChooser::TYPE_SECONDARY_HOLOGRAM] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  SecondaryHologram = color.createLinear();

  /** m_colors[SOFDataFactionColorChooser::TYPE_TERTIARY_HOLOGRAM] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  TertiaryHologram = color.createLinear();

  /** m_colors[SOFDataFactionColorChooser::TYPE_PRIMARY_LIGHT] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  PrimaryLight = color.createLinear();

  /** m_colors[SOFDataFactionColorChooser::TYPE_SECONDARY_LIGHT] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  SecondaryLight = color.createLinear();

  /** m_colors[SOFDataFactionColorChooser::TYPE_TERTIARY_LIGHT] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  TertiaryLight = color.createLinear();

  /** m_colors[SOFDataFactionColorChooser::TYPE_WHITE_LIGHT] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  WhiteLight = color.createLinear();

  /** m_colors[SOFDataFactionColorChooser::TYPE_HULL] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  Hull = color.createLinear();

  /** m_colors[SOFDataFactionColorChooser::TYPE_GLASS] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  Glass = color.createLinear();

  /** m_colors[SOFDataFactionColorChooser::TYPE_REACTOR] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  Reactor = color.createLinear();

  /** m_colors[SOFDataFactionColorChooser::TYPE_DARKHULL] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  Darkhull = color.createLinear();

  /** m_colors[SOFDataFactionColorChooser::TYPE_BOOSTER] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  Booster = color.createLinear();

  /** m_colors[SOFDataFactionColorChooser::TYPE_PRIMARY_BANNER] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  PrimaryBanner = color.createLinear();

  /** m_colors[SOFDataFactionColorChooser::TYPE_PRIMARY_BILLBOARD] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  PrimaryBillboard = vec4.fromValues(2.5, 2.5, 2.5, 2.5);

  /** m_colors[SOFDataFactionColorChooser::TYPE_PRIMARY_SPOTLIGHT] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  PrimarySpotlight = color.createLinear();

  /** m_colors[SOFDataFactionColorChooser::TYPE_SECONDARY_SPOTLIGHT] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  SecondarySpotlight = color.createLinear();

  /** m_colors[SOFDataFactionColorChooser::TYPE_TERTIARY_SPOTLIGHT] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  TertiarySpotlight = color.createLinear();

  /** m_colors[SOFDataFactionColorChooser::TYPE_STATE_0] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  State0 = color.createLinear();

  /** m_colors[SOFDataFactionColorChooser::TYPE_STATE_1] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  State1 = color.createLinear();

  /** m_colors[SOFDataFactionColorChooser::TYPE_STATE_2] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  State2 = color.createLinear();

  /** m_colors[SOFDataFactionColorChooser::TYPE_STATE_3] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  State3 = color.createLinear();

  /** m_colors[SOFDataFactionColorChooser::TYPE_STATE_VULNERABLE] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  StateVulnerable = color.createLinear();

  /** m_colors[SOFDataFactionColorChooser::TYPE_STATE_INVULNERABLE] (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  StateInvulnerable = color.createLinear();


  /**
   * Validates a color-slot enum value and reports whether its corresponding
   * vector is assigned.
   */
  Has(type)
  {
    const name = this.constructor.Types[type];
    if (name === undefined) throw new ErrSOFFactionColorSetTypeUnknown(type);
    return this[name] !== null && this[name] !== undefined;
  }

  /**
   * Copies the selected faction color into a required output vector after
   * validating its slot.
   */
  Get(type, out)
  {
    if (!out) throw new TypeError("Get requires an output vector");
    if (!this.Has(type)) throw new ErrSOFFactionColorSetTypeNotFound(type);
    return vec4.copy(out, this[this.constructor.Types[type]]);
  }

  static ColorType = Object.freeze({
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
  });

  static Types = Object.freeze([
    "Primary",
    "Secondary",
    "Tertiary",
    "Black",
    "White",
    "Yellow",
    "Orange",
    "Red",
    "Blue",
    "Green",
    "Cyan",
    "Fire",
    "Hull",
    "Glass",
    "Reactor",
    "Darkhull",
    "Booster",
    "Killmark",
    "PrimaryLight",
    "SecondaryLight",
    "TertiaryLight",
    "WhiteLight",
    "PrimaryHologram",
    "SecondaryHologram",
    "TertiaryHologram",
    "State0",
    "State1",
    "State2",
    "State3",
    "StateVulnerable",
    "StateInvulnerable",
    "PrimaryForcefield",
    "SecondaryForcefield",
    "PrimaryBanner",
    "PrimaryFx",
    "SecondaryFx",
    "PrimarySpotlight",
    "SecondarySpotlight",
    "TertiarySpotlight",
    "PrimaryBillboard",
    "PrimaryWarpFx",
    "PrimaryAttackFX",
    "PrimarySiegeFX",
    "PrimaryDockedFX"
  ]);

}

// Native chooser labels and descriptions are distinct from C++ member names.
blue.enums.RegisterEnum("trinity.SOFDataFactionColorChooser.ColorType", EveSOFDataFactionColorSet.ColorType, {
  source: "trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h", family: "eve", line: 177,
  exposedName: "EveSOFDataFactionColorSetType", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue.cpp:10",
  chooser: [
    { name: "Primary", value: EveSOFDataFactionColorSet.ColorType.TYPE_PRIMARY, description: "Primary Color" },
    { name: "Secondary", value: EveSOFDataFactionColorSet.ColorType.TYPE_SECONDARY, description: "Secondary Color" },
    { name: "Tertiary", value: EveSOFDataFactionColorSet.ColorType.TYPE_TERTIARY, description: "Tertiary Color" },
    { name: "Black", value: EveSOFDataFactionColorSet.ColorType.TYPE_BLACK, description: "Black Color" },
    { name: "White", value: EveSOFDataFactionColorSet.ColorType.TYPE_WHITE, description: "White" },
    { name: "Yellow", value: EveSOFDataFactionColorSet.ColorType.TYPE_YELLOW, description: "Yellow" },
    { name: "Orange", value: EveSOFDataFactionColorSet.ColorType.TYPE_ORANGE, description: "Orange" },
    { name: "Red", value: EveSOFDataFactionColorSet.ColorType.TYPE_RED, description: "Red" },
    { name: "Blue", value: EveSOFDataFactionColorSet.ColorType.TYPE_BLUE, description: "Blue" },
    { name: "Green", value: EveSOFDataFactionColorSet.ColorType.TYPE_GREEN, description: "Green" },
    { name: "Cyan", value: EveSOFDataFactionColorSet.ColorType.TYPE_CYAN, description: "Cyan" },
    { name: "Fire", value: EveSOFDataFactionColorSet.ColorType.TYPE_FIRE, description: "Fire" },
    { name: "Hull", value: EveSOFDataFactionColorSet.ColorType.TYPE_HULL, description: "Material Hullarea Glow" },
    { name: "Glass", value: EveSOFDataFactionColorSet.ColorType.TYPE_GLASS, description: "Material Glassarea Glow" },
    { name: "Reactor", value: EveSOFDataFactionColorSet.ColorType.TYPE_REACTOR, description: "Material Reactorarea Glow" },
    { name: "Darkhull", value: EveSOFDataFactionColorSet.ColorType.TYPE_DARKHULL, description: "Material Darkhull Glow" },
    { name: "Booster", value: EveSOFDataFactionColorSet.ColorType.TYPE_BOOSTER, description: "Material Hullarea Heat Shimmer Glow" },
    { name: "Killmark", value: EveSOFDataFactionColorSet.ColorType.TYPE_KILLMARK, description: "Killmark glow color" },
    { name: "PrimaryLight", value: EveSOFDataFactionColorSet.ColorType.TYPE_PRIMARY_LIGHT, description: "Primary light color" },
    { name: "SecondaryLight", value: EveSOFDataFactionColorSet.ColorType.TYPE_SECONDARY_LIGHT, description: "Secondary light color" },
    { name: "TertiaryLight", value: EveSOFDataFactionColorSet.ColorType.TYPE_TERTIARY_LIGHT, description: "Tertiary light color" },
    { name: "WhiteLight", value: EveSOFDataFactionColorSet.ColorType.TYPE_WHITE_LIGHT, description: "White light color" },
    { name: "PrimaryHologram", value: EveSOFDataFactionColorSet.ColorType.TYPE_PRIMARY_HOLOGRAM, description: "Primary Hologram" },
    { name: "SecondaryHologram", value: EveSOFDataFactionColorSet.ColorType.TYPE_SECONDARY_HOLOGRAM, description: "Secondary Hologram color" },
    { name: "TertiaryHologram", value: EveSOFDataFactionColorSet.ColorType.TYPE_TERTIARY_HOLOGRAM, description: "Tertiary Hologram color" },
    { name: "State0", value: EveSOFDataFactionColorSet.ColorType.TYPE_STATE_0, description: "State 0 color" },
    { name: "State1", value: EveSOFDataFactionColorSet.ColorType.TYPE_STATE_1, description: "State 1 color" },
    { name: "State2", value: EveSOFDataFactionColorSet.ColorType.TYPE_STATE_2, description: "State 2 color" },
    { name: "State3", value: EveSOFDataFactionColorSet.ColorType.TYPE_STATE_3, description: "State 3 color" },
    { name: "StateVulnerable", value: EveSOFDataFactionColorSet.ColorType.TYPE_STATE_VULNERABLE, description: "State Vulnerable color" },
    { name: "StateInvulnerable", value: EveSOFDataFactionColorSet.ColorType.TYPE_STATE_INVULNERABLE, description: "State Invulnerable color" },
    { name: "PrimaryForcefield", value: EveSOFDataFactionColorSet.ColorType.TYPE_PRIMARY_FORCEFIELD, description: "Primary Forcefield color" },
    { name: "SecondaryForcefield", value: EveSOFDataFactionColorSet.ColorType.TYPE_SECONDARY_FORCEFIELD, description: "Secondary Forcefield color" },
    { name: "PrimaryBanner", value: EveSOFDataFactionColorSet.ColorType.TYPE_PRIMARY_BANNER, description: "Primary Banner color" },
    { name: "PrimaryFx", value: EveSOFDataFactionColorSet.ColorType.TYPE_PRIMARY_FX, description: "Primary Fx color" },
    { name: "SecondaryFx", value: EveSOFDataFactionColorSet.ColorType.TYPE_SECONDARY_FX, description: "Secondary Fx color" },
    { name: "PrimarySpotlight", value: EveSOFDataFactionColorSet.ColorType.TYPE_PRIMARY_SPOTLIGHT, description: "Primary spotlight color" },
    { name: "SecondarySpotlight", value: EveSOFDataFactionColorSet.ColorType.TYPE_SECONDARY_SPOTLIGHT, description: "Secondary spotlight color" },
    { name: "TertiarySpotlight", value: EveSOFDataFactionColorSet.ColorType.TYPE_TERTIARY_SPOTLIGHT, description: "Tertiary spotlight color" },
    { name: "PrimaryBillboard", value: EveSOFDataFactionColorSet.ColorType.TYPE_PRIMARY_BILLBOARD, description: "Primary Billboard color" },
    { name: "PrimaryWarpFx", value: EveSOFDataFactionColorSet.ColorType.TYPE_PRIMARY_WARP_FX, description: "Primary Warp FX color" },
    { name: "PrimaryAttackFX", value: EveSOFDataFactionColorSet.ColorType.TYPE_PRIMARY_ATTACK_FX, description: "Primary Attack FX color" },
    { name: "PrimarySiegeFX", value: EveSOFDataFactionColorSet.ColorType.TYPE_PRIMARY_SIEGE_FX, description: "Primary Siege FX color" },
    { name: "PrimaryDockedFX", value: EveSOFDataFactionColorSet.ColorType.TYPE_PRIMARY_DOCKED_FX, description: "Primary Docked FX color" }
  ]
});
