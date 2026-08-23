import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_Primary, _init_extra_Primary, _init_Secondary, _init_extra_Secondary, _init_Tertiary, _init_extra_Tertiary, _init_Black, _init_extra_Black, _init_White, _init_extra_White, _init_Yellow, _init_extra_Yellow, _init_Orange, _init_extra_Orange, _init_Red, _init_extra_Red, _init_Blue, _init_extra_Blue, _init_Green, _init_extra_Green, _init_Cyan, _init_extra_Cyan, _init_Fire, _init_extra_Fire, _init_Hull, _init_extra_Hull, _init_Glass, _init_extra_Glass, _init_Reactor, _init_extra_Reactor, _init_Darkhull, _init_extra_Darkhull, _init_Booster, _init_extra_Booster, _init_Killmark, _init_extra_Killmark, _init_PrimaryLight, _init_extra_PrimaryLight, _init_SecondaryLight, _init_extra_SecondaryLight, _init_TertiaryLight, _init_extra_TertiaryLight, _init_WhiteLight, _init_extra_WhiteLight, _init_PrimarySpotlight, _init_extra_PrimarySpotlight, _init_SecondarySpotlight, _init_extra_SecondarySpotlight, _init_TertiarySpotlight, _init_extra_TertiarySpotlight, _init_PrimaryHologram, _init_extra_PrimaryHologram, _init_SecondaryHologram, _init_extra_SecondaryHologram, _init_TertiaryHologram, _init_extra_TertiaryHologram, _init_State, _init_extra_State, _init_State2, _init_extra_State2, _init_State3, _init_extra_State3, _init_State4, _init_extra_State4, _init_StateVulnerable, _init_extra_StateVulnerable, _init_StateInvulnerable, _init_extra_StateInvulnerable, _init_PrimaryForcefield, _init_extra_PrimaryForcefield, _init_SecondaryForcefield, _init_extra_SecondaryForcefield, _init_PrimaryBanner, _init_extra_PrimaryBanner, _init_PrimaryBillboard, _init_extra_PrimaryBillboard, _init_PrimaryFx, _init_extra_PrimaryFx, _init_SecondaryFx, _init_extra_SecondaryFx, _init_PrimaryWarpFx, _init_extra_PrimaryWarpFx, _init_PrimaryAttackFx, _init_extra_PrimaryAttackFx, _init_PrimarySiegeFx, _init_extra_PrimarySiegeFx, _init_PrimaryDockedFx, _init_extra_PrimaryDockedFx;
const COLOR_PROPERTIES = Object.freeze(["Primary", "Secondary", "Tertiary", "Black", "White", "Yellow", "Orange", "Red", "Blue", "Green", "Cyan", "Fire", "Hull", "Glass", "Reactor", "Darkhull", "Booster", "Killmark", "PrimaryLight", "SecondaryLight", "TertiaryLight", "WhiteLight", "PrimaryHologram", "SecondaryHologram", "TertiaryHologram", "State0", "State1", "State2", "State3", "StateVulnerable", "StateInvulnerable", "PrimaryForcefield", "SecondaryForcefield", "PrimaryBanner", "PrimaryFx", "SecondaryFx", "PrimarySpotlight", "SecondarySpotlight", "TertiarySpotlight", "PrimaryBillboard", "PrimaryWarpFx", "PrimaryAttackFx", "PrimarySiegeFx", "PrimaryDockedFx"]);

/**
 * The SOF colour set a space object hands down to its children: one colour per
 * named material slot (Primary, Hull, Booster, State0, ...) in a fixed order.
 */
let _EveChildInheritPrope;
class EveChildInheritProperties extends CjsModel {
  static {
    ({
      e: [_init_Primary, _init_extra_Primary, _init_Secondary, _init_extra_Secondary, _init_Tertiary, _init_extra_Tertiary, _init_Black, _init_extra_Black, _init_White, _init_extra_White, _init_Yellow, _init_extra_Yellow, _init_Orange, _init_extra_Orange, _init_Red, _init_extra_Red, _init_Blue, _init_extra_Blue, _init_Green, _init_extra_Green, _init_Cyan, _init_extra_Cyan, _init_Fire, _init_extra_Fire, _init_Hull, _init_extra_Hull, _init_Glass, _init_extra_Glass, _init_Reactor, _init_extra_Reactor, _init_Darkhull, _init_extra_Darkhull, _init_Booster, _init_extra_Booster, _init_Killmark, _init_extra_Killmark, _init_PrimaryLight, _init_extra_PrimaryLight, _init_SecondaryLight, _init_extra_SecondaryLight, _init_TertiaryLight, _init_extra_TertiaryLight, _init_WhiteLight, _init_extra_WhiteLight, _init_PrimarySpotlight, _init_extra_PrimarySpotlight, _init_SecondarySpotlight, _init_extra_SecondarySpotlight, _init_TertiarySpotlight, _init_extra_TertiarySpotlight, _init_PrimaryHologram, _init_extra_PrimaryHologram, _init_SecondaryHologram, _init_extra_SecondaryHologram, _init_TertiaryHologram, _init_extra_TertiaryHologram, _init_State, _init_extra_State, _init_State2, _init_extra_State2, _init_State3, _init_extra_State3, _init_State4, _init_extra_State4, _init_StateVulnerable, _init_extra_StateVulnerable, _init_StateInvulnerable, _init_extra_StateInvulnerable, _init_PrimaryForcefield, _init_extra_PrimaryForcefield, _init_SecondaryForcefield, _init_extra_SecondaryForcefield, _init_PrimaryBanner, _init_extra_PrimaryBanner, _init_PrimaryBillboard, _init_extra_PrimaryBillboard, _init_PrimaryFx, _init_extra_PrimaryFx, _init_SecondaryFx, _init_extra_SecondaryFx, _init_PrimaryWarpFx, _init_extra_PrimaryWarpFx, _init_PrimaryAttackFx, _init_extra_PrimaryAttackFx, _init_PrimarySiegeFx, _init_extra_PrimarySiegeFx, _init_PrimaryDockedFx, _init_extra_PrimaryDockedFx, _initProto],
      c: [_EveChildInheritPrope, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveChildInheritProperties",
      family: "eve/child"
    })], [[[io, io.persist, type, type.color], 16, "Primary"], [[io, io.persist, type, type.color], 16, "Secondary"], [[io, io.persist, type, type.color], 16, "Tertiary"], [[io, io.persist, type, type.color], 16, "Black"], [[io, io.persist, type, type.color], 16, "White"], [[io, io.persist, type, type.color], 16, "Yellow"], [[io, io.persist, type, type.color], 16, "Orange"], [[io, io.persist, type, type.color], 16, "Red"], [[io, io.persist, type, type.color], 16, "Blue"], [[io, io.persist, type, type.color], 16, "Green"], [[io, io.persist, type, type.color], 16, "Cyan"], [[io, io.persist, type, type.color], 16, "Fire"], [[io, io.persist, type, type.color], 16, "Hull"], [[io, io.persist, type, type.color], 16, "Glass"], [[io, io.persist, type, type.color], 16, "Reactor"], [[io, io.persist, type, type.color], 16, "Darkhull"], [[io, io.persist, type, type.color], 16, "Booster"], [[io, io.persist, type, type.color], 16, "Killmark"], [[io, io.persist, type, type.color], 16, "PrimaryLight"], [[io, io.persist, type, type.color], 16, "SecondaryLight"], [[io, io.persist, type, type.color], 16, "TertiaryLight"], [[io, io.persist, type, type.color], 16, "WhiteLight"], [[io, io.persist, type, type.color], 16, "PrimarySpotlight"], [[io, io.persist, type, type.color], 16, "SecondarySpotlight"], [[io, io.persist, type, type.color], 16, "TertiarySpotlight"], [[io, io.persist, type, type.color], 16, "PrimaryHologram"], [[io, io.persist, type, type.color], 16, "SecondaryHologram"], [[io, io.persist, type, type.color], 16, "TertiaryHologram"], [[io, io.persist, type, type.color], 16, "State0"], [[io, io.persist, type, type.color], 16, "State1"], [[io, io.persist, type, type.color], 16, "State2"], [[io, io.persist, type, type.color], 16, "State3"], [[io, io.persist, type, type.color], 16, "StateVulnerable"], [[io, io.persist, type, type.color], 16, "StateInvulnerable"], [[io, io.persist, type, type.color], 16, "PrimaryForcefield"], [[io, io.persist, type, type.color], 16, "SecondaryForcefield"], [[io, io.persist, type, type.color], 16, "PrimaryBanner"], [[io, io.persist, type, type.color], 16, "PrimaryBillboard"], [[io, io.persist, type, type.color], 16, "PrimaryFx"], [[io, io.persist, type, type.color], 16, "SecondaryFx"], [[io, io.persist, type, type.color], 16, "PrimaryWarpFx"], [[io, io.persist, type, type.color], 16, "PrimaryAttackFx"], [[io, io.persist, type, type.color], 16, "PrimarySiegeFx"], [[io, io.persist, type, type.color], 16, "PrimaryDockedFx"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetProperties"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetProperties"]], 0, void 0, CjsModel));
  }
  Primary = (_initProto(this), _init_Primary(this, vec4.create()));
  Secondary = (_init_extra_Primary(this), _init_Secondary(this, vec4.create()));
  Tertiary = (_init_extra_Secondary(this), _init_Tertiary(this, vec4.create()));
  Black = (_init_extra_Tertiary(this), _init_Black(this, vec4.create()));
  White = (_init_extra_Black(this), _init_White(this, vec4.create()));
  Yellow = (_init_extra_White(this), _init_Yellow(this, vec4.create()));
  Orange = (_init_extra_Yellow(this), _init_Orange(this, vec4.create()));
  Red = (_init_extra_Orange(this), _init_Red(this, vec4.create()));
  Blue = (_init_extra_Red(this), _init_Blue(this, vec4.create()));
  Green = (_init_extra_Blue(this), _init_Green(this, vec4.create()));
  Cyan = (_init_extra_Green(this), _init_Cyan(this, vec4.create()));
  Fire = (_init_extra_Cyan(this), _init_Fire(this, vec4.create()));
  Hull = (_init_extra_Fire(this), _init_Hull(this, vec4.create()));
  Glass = (_init_extra_Hull(this), _init_Glass(this, vec4.create()));
  Reactor = (_init_extra_Glass(this), _init_Reactor(this, vec4.create()));
  Darkhull = (_init_extra_Reactor(this), _init_Darkhull(this, vec4.create()));
  Booster = (_init_extra_Darkhull(this), _init_Booster(this, vec4.create()));
  Killmark = (_init_extra_Booster(this), _init_Killmark(this, vec4.create()));
  PrimaryLight = (_init_extra_Killmark(this), _init_PrimaryLight(this, vec4.create()));
  SecondaryLight = (_init_extra_PrimaryLight(this), _init_SecondaryLight(this, vec4.create()));
  TertiaryLight = (_init_extra_SecondaryLight(this), _init_TertiaryLight(this, vec4.create()));
  WhiteLight = (_init_extra_TertiaryLight(this), _init_WhiteLight(this, vec4.create()));
  PrimarySpotlight = (_init_extra_WhiteLight(this), _init_PrimarySpotlight(this, vec4.create()));
  SecondarySpotlight = (_init_extra_PrimarySpotlight(this), _init_SecondarySpotlight(this, vec4.create()));
  TertiarySpotlight = (_init_extra_SecondarySpotlight(this), _init_TertiarySpotlight(this, vec4.create()));
  PrimaryHologram = (_init_extra_TertiarySpotlight(this), _init_PrimaryHologram(this, vec4.create()));
  SecondaryHologram = (_init_extra_PrimaryHologram(this), _init_SecondaryHologram(this, vec4.create()));
  TertiaryHologram = (_init_extra_SecondaryHologram(this), _init_TertiaryHologram(this, vec4.create()));
  State0 = (_init_extra_TertiaryHologram(this), _init_State(this, vec4.create()));
  State1 = (_init_extra_State(this), _init_State2(this, vec4.create()));
  State2 = (_init_extra_State2(this), _init_State3(this, vec4.create()));
  State3 = (_init_extra_State3(this), _init_State4(this, vec4.create()));
  StateVulnerable = (_init_extra_State4(this), _init_StateVulnerable(this, vec4.create()));
  StateInvulnerable = (_init_extra_StateVulnerable(this), _init_StateInvulnerable(this, vec4.create()));
  PrimaryForcefield = (_init_extra_StateInvulnerable(this), _init_PrimaryForcefield(this, vec4.create()));
  SecondaryForcefield = (_init_extra_PrimaryForcefield(this), _init_SecondaryForcefield(this, vec4.create()));
  PrimaryBanner = (_init_extra_SecondaryForcefield(this), _init_PrimaryBanner(this, vec4.create()));
  PrimaryBillboard = (_init_extra_PrimaryBanner(this), _init_PrimaryBillboard(this, vec4.create()));
  PrimaryFx = (_init_extra_PrimaryBillboard(this), _init_PrimaryFx(this, vec4.create()));
  SecondaryFx = (_init_extra_PrimaryFx(this), _init_SecondaryFx(this, vec4.create()));
  PrimaryWarpFx = (_init_extra_SecondaryFx(this), _init_PrimaryWarpFx(this, vec4.create()));
  PrimaryAttackFx = (_init_extra_PrimaryWarpFx(this), _init_PrimaryAttackFx(this, vec4.create()));
  PrimarySiegeFx = (_init_extra_PrimaryAttackFx(this), _init_PrimarySiegeFx(this, vec4.create()));
  PrimaryDockedFx = (_init_extra_PrimarySiegeFx(this), _init_PrimaryDockedFx(this, vec4.create()));
  #properties = (_init_extra_PrimaryDockedFx(this), COLOR_PROPERTIES.map(name => this[name]));

  /**
   * Copies an indexed colour set into the named colour fields in the fixed SOF
   * property order; a nullish set is ignored, and the set must hold at least as
   * many entries as there are properties.
   */
  SetProperties(colorSet) {
    if (!colorSet) return;
    for (let index = 0; index < this.#properties.length; index++) {
      vec4.copy(this.#properties[index], colorSet[index]);
    }
  }

  /**
   * Returns the colour vectors in SOF property order; the array and its vectors
   * are this object's live storage, not copies, so writes through it change the
   * inherited colours.
   */
  GetProperties() {
    return this.#properties;
  }
  static {
    _initClass();
  }
}

export { _EveChildInheritPrope as EveChildInheritProperties };
//# sourceMappingURL=EveChildInheritProperties.js.map
