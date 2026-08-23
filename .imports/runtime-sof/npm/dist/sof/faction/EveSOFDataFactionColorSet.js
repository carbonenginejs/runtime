import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initClass, _init_Killmark, _init_extra_Killmark, _init_PrimaryForcefield, _init_extra_PrimaryForcefield, _init_SecondaryForcefield, _init_extra_SecondaryForcefield, _init_PrimaryFx, _init_extra_PrimaryFx, _init_SecondaryFx, _init_extra_SecondaryFx, _init_PrimaryWarpFx, _init_extra_PrimaryWarpFx, _init_PrimaryAttackFX, _init_extra_PrimaryAttackFX, _init_PrimarySiegeFX, _init_extra_PrimarySiegeFX, _init_PrimaryDockedFX, _init_extra_PrimaryDockedFX, _init_Primary, _init_extra_Primary, _init_Secondary, _init_extra_Secondary, _init_Tertiary, _init_extra_Tertiary, _init_Black, _init_extra_Black, _init_White, _init_extra_White, _init_Yellow, _init_extra_Yellow, _init_Orange, _init_extra_Orange, _init_Red, _init_extra_Red, _init_Blue, _init_extra_Blue, _init_Green, _init_extra_Green, _init_Cyan, _init_extra_Cyan, _init_Fire, _init_extra_Fire, _init_PrimaryHologram, _init_extra_PrimaryHologram, _init_SecondaryHologram, _init_extra_SecondaryHologram, _init_TertiaryHologram, _init_extra_TertiaryHologram, _init_PrimaryLight, _init_extra_PrimaryLight, _init_SecondaryLight, _init_extra_SecondaryLight, _init_TertiaryLight, _init_extra_TertiaryLight, _init_WhiteLight, _init_extra_WhiteLight, _init_Hull, _init_extra_Hull, _init_Glass, _init_extra_Glass, _init_Reactor, _init_extra_Reactor, _init_Darkhull, _init_extra_Darkhull, _init_Booster, _init_extra_Booster, _init_PrimaryBanner, _init_extra_PrimaryBanner, _init_PrimaryBillboard, _init_extra_PrimaryBillboard, _init_PrimarySpotlight, _init_extra_PrimarySpotlight, _init_SecondarySpotlight, _init_extra_SecondarySpotlight, _init_TertiarySpotlight, _init_extra_TertiarySpotlight, _init_State, _init_extra_State, _init_State2, _init_extra_State2, _init_State3, _init_extra_State3, _init_State4, _init_extra_State4, _init_StateVulnerable, _init_extra_StateVulnerable, _init_StateInvulnerable, _init_extra_StateInvulnerable;

/** EveSOFDataFactionColorSet (eve) - generated from schema shapeHash 715e3a12.... */
let _EveSOFDataFactionCol;
new class extends _identity {
  static [class EveSOFDataFactionColorSet extends CjsModel {
    static {
      ({
        e: [_init_Killmark, _init_extra_Killmark, _init_PrimaryForcefield, _init_extra_PrimaryForcefield, _init_SecondaryForcefield, _init_extra_SecondaryForcefield, _init_PrimaryFx, _init_extra_PrimaryFx, _init_SecondaryFx, _init_extra_SecondaryFx, _init_PrimaryWarpFx, _init_extra_PrimaryWarpFx, _init_PrimaryAttackFX, _init_extra_PrimaryAttackFX, _init_PrimarySiegeFX, _init_extra_PrimarySiegeFX, _init_PrimaryDockedFX, _init_extra_PrimaryDockedFX, _init_Primary, _init_extra_Primary, _init_Secondary, _init_extra_Secondary, _init_Tertiary, _init_extra_Tertiary, _init_Black, _init_extra_Black, _init_White, _init_extra_White, _init_Yellow, _init_extra_Yellow, _init_Orange, _init_extra_Orange, _init_Red, _init_extra_Red, _init_Blue, _init_extra_Blue, _init_Green, _init_extra_Green, _init_Cyan, _init_extra_Cyan, _init_Fire, _init_extra_Fire, _init_PrimaryHologram, _init_extra_PrimaryHologram, _init_SecondaryHologram, _init_extra_SecondaryHologram, _init_TertiaryHologram, _init_extra_TertiaryHologram, _init_PrimaryLight, _init_extra_PrimaryLight, _init_SecondaryLight, _init_extra_SecondaryLight, _init_TertiaryLight, _init_extra_TertiaryLight, _init_WhiteLight, _init_extra_WhiteLight, _init_Hull, _init_extra_Hull, _init_Glass, _init_extra_Glass, _init_Reactor, _init_extra_Reactor, _init_Darkhull, _init_extra_Darkhull, _init_Booster, _init_extra_Booster, _init_PrimaryBanner, _init_extra_PrimaryBanner, _init_PrimaryBillboard, _init_extra_PrimaryBillboard, _init_PrimarySpotlight, _init_extra_PrimarySpotlight, _init_SecondarySpotlight, _init_extra_SecondarySpotlight, _init_TertiarySpotlight, _init_extra_TertiarySpotlight, _init_State, _init_extra_State, _init_State2, _init_extra_State2, _init_State3, _init_extra_State3, _init_State4, _init_extra_State4, _init_StateVulnerable, _init_extra_StateVulnerable, _init_StateInvulnerable, _init_extra_StateInvulnerable],
        c: [_EveSOFDataFactionCol, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveSOFDataFactionColorSet",
        family: "eve"
      })], [[[io, io.persist, type, type.color], 16, "Killmark"], [[io, io.persist, type, type.color], 16, "PrimaryForcefield"], [[io, io.persist, type, type.color], 16, "SecondaryForcefield"], [[io, io.persist, type, type.color], 16, "PrimaryFx"], [[io, io.persist, type, type.color], 16, "SecondaryFx"], [[io, io.persist, type, type.color], 16, "PrimaryWarpFx"], [[io, io.persist, type, type.color], 16, "PrimaryAttackFX"], [[io, io.persist, type, type.color], 16, "PrimarySiegeFX"], [[io, io.persist, type, type.color], 16, "PrimaryDockedFX"], [[io, io.persist, type, type.color], 16, "Primary"], [[io, io.persist, type, type.color], 16, "Secondary"], [[io, io.persist, type, type.color], 16, "Tertiary"], [[io, io.persist, type, type.color], 16, "Black"], [[io, io.persist, type, type.color], 16, "White"], [[io, io.persist, type, type.color], 16, "Yellow"], [[io, io.persist, type, type.color], 16, "Orange"], [[io, io.persist, type, type.color], 16, "Red"], [[io, io.persist, type, type.color], 16, "Blue"], [[io, io.persist, type, type.color], 16, "Green"], [[io, io.persist, type, type.color], 16, "Cyan"], [[io, io.persist, type, type.color], 16, "Fire"], [[io, io.persist, type, type.color], 16, "PrimaryHologram"], [[io, io.persist, type, type.color], 16, "SecondaryHologram"], [[io, io.persist, type, type.color], 16, "TertiaryHologram"], [[io, io.persist, type, type.color], 16, "PrimaryLight"], [[io, io.persist, type, type.color], 16, "SecondaryLight"], [[io, io.persist, type, type.color], 16, "TertiaryLight"], [[io, io.persist, type, type.color], 16, "WhiteLight"], [[io, io.persist, type, type.color], 16, "Hull"], [[io, io.persist, type, type.color], 16, "Glass"], [[io, io.persist, type, type.color], 16, "Reactor"], [[io, io.persist, type, type.color], 16, "Darkhull"], [[io, io.persist, type, type.color], 16, "Booster"], [[io, io.persist, type, type.color], 16, "PrimaryBanner"], [[io, io.persist, type, type.color], 16, "PrimaryBillboard"], [[io, io.persist, type, type.color], 16, "PrimarySpotlight"], [[io, io.persist, type, type.color], 16, "SecondarySpotlight"], [[io, io.persist, type, type.color], 16, "TertiarySpotlight"], [[io, io.persist, type, type.color], 16, "State0"], [[io, io.persist, type, type.color], 16, "State1"], [[io, io.persist, type, type.color], 16, "State2"], [[io, io.persist, type, type.color], 16, "State3"], [[io, io.persist, type, type.color], 16, "StateVulnerable"], [[io, io.persist, type, type.color], 16, "StateInvulnerable"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_StateInvulnerable(this);
    }
    /** m_colors[SOFDataFactionColorChooser::TYPE_KILLMARK] (Color) [READWRITE, PERSIST] */
    Killmark = _init_Killmark(this, vec4.createLinear());

    /** m_colors[SOFDataFactionColorChooser::TYPE_PRIMARY_FORCEFIELD] (Color) [READWRITE, PERSIST] */
    PrimaryForcefield = (_init_extra_Killmark(this), _init_PrimaryForcefield(this, vec4.createLinear()));

    /** m_colors[SOFDataFactionColorChooser::TYPE_SECONDARY_FORCEFIELD] (Color) [READWRITE, PERSIST] */
    SecondaryForcefield = (_init_extra_PrimaryForcefield(this), _init_SecondaryForcefield(this, vec4.createLinear()));

    /** m_colors[SOFDataFactionColorChooser::TYPE_PRIMARY_FX] (Color) [READWRITE, PERSIST] */
    PrimaryFx = (_init_extra_SecondaryForcefield(this), _init_PrimaryFx(this, vec4.createLinear()));

    /** m_colors[SOFDataFactionColorChooser::TYPE_SECONDARY_FX] (Color) [READWRITE, PERSIST] */
    SecondaryFx = (_init_extra_PrimaryFx(this), _init_SecondaryFx(this, vec4.createLinear()));

    /** m_colors[SOFDataFactionColorChooser::TYPE_PRIMARY_WARP_FX] (Color) [READWRITE, PERSIST] */
    PrimaryWarpFx = (_init_extra_SecondaryFx(this), _init_PrimaryWarpFx(this, vec4.fromValues(1, 99 / 255, 51 / 255, 1)));

    /** m_colors[SOFDataFactionColorChooser::TYPE_PRIMARY_ATTACK_FX] (Color) [READWRITE, PERSIST] */
    PrimaryAttackFX = (_init_extra_PrimaryWarpFx(this), _init_PrimaryAttackFX(this, vec4.fromValues(1, 24 / 255, 11 / 255, 1)));

    /** m_colors[SOFDataFactionColorChooser::TYPE_PRIMARY_SIEGE_FX] (Color) [READWRITE, PERSIST] */
    PrimarySiegeFX = (_init_extra_PrimaryAttackFX(this), _init_PrimarySiegeFX(this, vec4.fromValues(1, 94 / 255, 45 / 255, 1)));

    /** m_colors[SOFDataFactionColorChooser::TYPE_PRIMARY_DOCKED_FX] (Color) [READWRITE, PERSIST] */
    PrimaryDockedFX = (_init_extra_PrimarySiegeFX(this), _init_PrimaryDockedFX(this, vec4.fromValues(76 / 255, 130 / 255, 226 / 255, 1)));

    /** m_colors[SOFDataFactionColorChooser::TYPE_PRIMARY] (Color) [READWRITE, PERSIST] */
    Primary = (_init_extra_PrimaryDockedFX(this), _init_Primary(this, vec4.createLinear()));

    /** m_colors[SOFDataFactionColorChooser::TYPE_SECONDARY] (Color) [READWRITE, PERSIST] */
    Secondary = (_init_extra_Primary(this), _init_Secondary(this, vec4.createLinear()));

    /** m_colors[SOFDataFactionColorChooser::TYPE_TERTIARY] (Color) [READWRITE, PERSIST] */
    Tertiary = (_init_extra_Secondary(this), _init_Tertiary(this, vec4.createLinear()));

    /** m_colors[SOFDataFactionColorChooser::TYPE_BLACK] (Color) [READWRITE, PERSIST] */
    Black = (_init_extra_Tertiary(this), _init_Black(this, vec4.createLinear()));

    /** m_colors[SOFDataFactionColorChooser::TYPE_WHITE] (Color) [READWRITE, PERSIST] */
    White = (_init_extra_Black(this), _init_White(this, vec4.createLinear()));

    /** m_colors[SOFDataFactionColorChooser::TYPE_YELLOW] (Color) [READWRITE, PERSIST] */
    Yellow = (_init_extra_White(this), _init_Yellow(this, vec4.createLinear()));

    /** m_colors[SOFDataFactionColorChooser::TYPE_ORANGE] (Color) [READWRITE, PERSIST] */
    Orange = (_init_extra_Yellow(this), _init_Orange(this, vec4.createLinear()));

    /** m_colors[SOFDataFactionColorChooser::TYPE_RED] (Color) [READWRITE, PERSIST] */
    Red = (_init_extra_Orange(this), _init_Red(this, vec4.createLinear()));

    /** m_colors[SOFDataFactionColorChooser::TYPE_BLUE] (Color) [READWRITE, PERSIST] */
    Blue = (_init_extra_Red(this), _init_Blue(this, vec4.createLinear()));

    /** m_colors[SOFDataFactionColorChooser::TYPE_GREEN] (Color) [READWRITE, PERSIST] */
    Green = (_init_extra_Blue(this), _init_Green(this, vec4.createLinear()));

    /** m_colors[SOFDataFactionColorChooser::TYPE_CYAN] (Color) [READWRITE, PERSIST] */
    Cyan = (_init_extra_Green(this), _init_Cyan(this, vec4.createLinear()));

    /** m_colors[SOFDataFactionColorChooser::TYPE_FIRE] (Color) [READWRITE, PERSIST] */
    Fire = (_init_extra_Cyan(this), _init_Fire(this, vec4.createLinear()));

    /** m_colors[SOFDataFactionColorChooser::TYPE_PRIMARY_HOLOGRAM] (Color) [READWRITE, PERSIST] */
    PrimaryHologram = (_init_extra_Fire(this), _init_PrimaryHologram(this, vec4.createLinear()));

    /** m_colors[SOFDataFactionColorChooser::TYPE_SECONDARY_HOLOGRAM] (Color) [READWRITE, PERSIST] */
    SecondaryHologram = (_init_extra_PrimaryHologram(this), _init_SecondaryHologram(this, vec4.createLinear()));

    /** m_colors[SOFDataFactionColorChooser::TYPE_TERTIARY_HOLOGRAM] (Color) [READWRITE, PERSIST] */
    TertiaryHologram = (_init_extra_SecondaryHologram(this), _init_TertiaryHologram(this, vec4.createLinear()));

    /** m_colors[SOFDataFactionColorChooser::TYPE_PRIMARY_LIGHT] (Color) [READWRITE, PERSIST] */
    PrimaryLight = (_init_extra_TertiaryHologram(this), _init_PrimaryLight(this, vec4.createLinear()));

    /** m_colors[SOFDataFactionColorChooser::TYPE_SECONDARY_LIGHT] (Color) [READWRITE, PERSIST] */
    SecondaryLight = (_init_extra_PrimaryLight(this), _init_SecondaryLight(this, vec4.createLinear()));

    /** m_colors[SOFDataFactionColorChooser::TYPE_TERTIARY_LIGHT] (Color) [READWRITE, PERSIST] */
    TertiaryLight = (_init_extra_SecondaryLight(this), _init_TertiaryLight(this, vec4.createLinear()));

    /** m_colors[SOFDataFactionColorChooser::TYPE_WHITE_LIGHT] (Color) [READWRITE, PERSIST] */
    WhiteLight = (_init_extra_TertiaryLight(this), _init_WhiteLight(this, vec4.createLinear()));

    /** m_colors[SOFDataFactionColorChooser::TYPE_HULL] (Color) [READWRITE, PERSIST] */
    Hull = (_init_extra_WhiteLight(this), _init_Hull(this, vec4.createLinear()));

    /** m_colors[SOFDataFactionColorChooser::TYPE_GLASS] (Color) [READWRITE, PERSIST] */
    Glass = (_init_extra_Hull(this), _init_Glass(this, vec4.createLinear()));

    /** m_colors[SOFDataFactionColorChooser::TYPE_REACTOR] (Color) [READWRITE, PERSIST] */
    Reactor = (_init_extra_Glass(this), _init_Reactor(this, vec4.createLinear()));

    /** m_colors[SOFDataFactionColorChooser::TYPE_DARKHULL] (Color) [READWRITE, PERSIST] */
    Darkhull = (_init_extra_Reactor(this), _init_Darkhull(this, vec4.createLinear()));

    /** m_colors[SOFDataFactionColorChooser::TYPE_BOOSTER] (Color) [READWRITE, PERSIST] */
    Booster = (_init_extra_Darkhull(this), _init_Booster(this, vec4.createLinear()));

    /** m_colors[SOFDataFactionColorChooser::TYPE_PRIMARY_BANNER] (Color) [READWRITE, PERSIST] */
    PrimaryBanner = (_init_extra_Booster(this), _init_PrimaryBanner(this, vec4.createLinear()));

    /** m_colors[SOFDataFactionColorChooser::TYPE_PRIMARY_BILLBOARD] (Color) [READWRITE, PERSIST] */
    PrimaryBillboard = (_init_extra_PrimaryBanner(this), _init_PrimaryBillboard(this, vec4.fromValues(2.5, 2.5, 2.5, 2.5)));

    /** m_colors[SOFDataFactionColorChooser::TYPE_PRIMARY_SPOTLIGHT] (Color) [READWRITE, PERSIST] */
    PrimarySpotlight = (_init_extra_PrimaryBillboard(this), _init_PrimarySpotlight(this, vec4.createLinear()));

    /** m_colors[SOFDataFactionColorChooser::TYPE_SECONDARY_SPOTLIGHT] (Color) [READWRITE, PERSIST] */
    SecondarySpotlight = (_init_extra_PrimarySpotlight(this), _init_SecondarySpotlight(this, vec4.createLinear()));

    /** m_colors[SOFDataFactionColorChooser::TYPE_TERTIARY_SPOTLIGHT] (Color) [READWRITE, PERSIST] */
    TertiarySpotlight = (_init_extra_SecondarySpotlight(this), _init_TertiarySpotlight(this, vec4.createLinear()));

    /** m_colors[SOFDataFactionColorChooser::TYPE_STATE_0] (Color) [READWRITE, PERSIST] */
    State0 = (_init_extra_TertiarySpotlight(this), _init_State(this, vec4.createLinear()));

    /** m_colors[SOFDataFactionColorChooser::TYPE_STATE_1] (Color) [READWRITE, PERSIST] */
    State1 = (_init_extra_State(this), _init_State2(this, vec4.createLinear()));

    /** m_colors[SOFDataFactionColorChooser::TYPE_STATE_2] (Color) [READWRITE, PERSIST] */
    State2 = (_init_extra_State2(this), _init_State3(this, vec4.createLinear()));

    /** m_colors[SOFDataFactionColorChooser::TYPE_STATE_3] (Color) [READWRITE, PERSIST] */
    State3 = (_init_extra_State3(this), _init_State4(this, vec4.createLinear()));

    /** m_colors[SOFDataFactionColorChooser::TYPE_STATE_VULNERABLE] (Color) [READWRITE, PERSIST] */
    StateVulnerable = (_init_extra_State4(this), _init_StateVulnerable(this, vec4.createLinear()));

    /** m_colors[SOFDataFactionColorChooser::TYPE_STATE_INVULNERABLE] (Color) [READWRITE, PERSIST] */
    StateInvulnerable = (_init_extra_StateVulnerable(this), _init_StateInvulnerable(this, vec4.createLinear()));
    Has(type) {
      const name = this.constructor.Types[type];
      if (name === undefined) throw new ErrSOFFactionColorSetTypeUnknown(type);
      return this[name] !== null && this[name] !== undefined;
    }
    Get(type, out) {
      if (!out) throw new TypeError("Get requires an output vector");
      if (!this.Has(type)) throw new ErrSOFFactionColorSetTypeNotFound(type);
      return vec4.copy(out, this[this.constructor.Types[type]]);
    }
  }];
  ColorType = Object.freeze({
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
  Types = Object.freeze(["Primary", "Secondary", "Tertiary", "Black", "White", "Yellow", "Orange", "Red", "Blue", "Green", "Cyan", "Fire", "Hull", "Glass", "Reactor", "Darkhull", "Booster", "Killmark", "PrimaryLight", "SecondaryLight", "TertiaryLight", "WhiteLight", "PrimaryHologram", "SecondaryHologram", "TertiaryHologram", "State0", "State1", "State2", "State3", "StateVulnerable", "StateInvulnerable", "PrimaryForcefield", "SecondaryForcefield", "PrimaryBanner", "PrimaryFx", "SecondaryFx", "PrimarySpotlight", "SecondarySpotlight", "TertiarySpotlight", "PrimaryBillboard", "PrimaryWarpFx", "PrimaryAttackFX", "PrimarySiegeFX", "PrimaryDockedFX"]);
  constructor() {
    super(_EveSOFDataFactionCol), _initClass();
  }
}();
class ErrSOFFactionColorSetTypeUnknown extends RangeError {
  constructor(type) {
    super("SOF faction color set type unknown (" + type + ")");
    this.name = "ErrSOFFactionColorSetTypeUnknown";
    this.code = "EVE_SOF_FACTION_COLOR_TYPE_UNKNOWN";
    this.type = type;
  }
}
class ErrSOFFactionColorSetTypeNotFound extends Error {
  constructor(type) {
    super("SOF faction color set type not found (" + type + ")");
    this.name = "ErrSOFFactionColorSetTypeNotFound";
    this.code = "EVE_SOF_FACTION_COLOR_TYPE_NOT_FOUND";
    this.type = type;
  }
}

export { ErrSOFFactionColorSetTypeNotFound, ErrSOFFactionColorSetTypeUnknown, _EveSOFDataFactionCol as EveSOFDataFactionColorSet };
//# sourceMappingURL=EveSOFDataFactionColorSet.js.map
