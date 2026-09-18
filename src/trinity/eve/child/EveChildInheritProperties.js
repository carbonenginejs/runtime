// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildInheritProperties.h
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildInheritProperties.cpp
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildInheritProperties_Blue.cpp
import { vec4 } from "#math/vec4";
import { CjsModel } from "#model";
import { carbon, impl, edit, type } from "#schema";


const COLOR_PROPERTIES = Object.freeze([
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
  "PrimaryAttackFx",
  "PrimarySiegeFx",
  "PrimaryDockedFx"
]);


/**
 * The SOF colour set a space object hands down to its children: one colour per
 * named material slot (Primary, Hull, Booster, State0, ...) in a fixed order.
 */
@type.define({ className: "EveChildInheritProperties", family: "eve/child" })
export class EveChildInheritProperties extends CjsModel
{
  @edit.persist
  @type.color
  Primary = vec4.create();

  @edit.persist
  @type.color
  Secondary = vec4.create();

  @edit.persist
  @type.color
  Tertiary = vec4.create();

  @edit.persist
  @type.color
  Black = vec4.create();

  @edit.persist
  @type.color
  White = vec4.create();

  @edit.persist
  @type.color
  Yellow = vec4.create();

  @edit.persist
  @type.color
  Orange = vec4.create();

  @edit.persist
  @type.color
  Red = vec4.create();

  @edit.persist
  @type.color
  Blue = vec4.create();

  @edit.persist
  @type.color
  Green = vec4.create();

  @edit.persist
  @type.color
  Cyan = vec4.create();

  @edit.persist
  @type.color
  Fire = vec4.create();

  @edit.persist
  @type.color
  Hull = vec4.create();

  @edit.persist
  @type.color
  Glass = vec4.create();

  @edit.persist
  @type.color
  Reactor = vec4.create();

  @edit.persist
  @type.color
  Darkhull = vec4.create();

  @edit.persist
  @type.color
  Booster = vec4.create();

  @edit.persist
  @type.color
  Killmark = vec4.create();

  @edit.persist
  @type.color
  PrimaryLight = vec4.create();

  @edit.persist
  @type.color
  SecondaryLight = vec4.create();

  @edit.persist
  @type.color
  TertiaryLight = vec4.create();

  @edit.persist
  @type.color
  WhiteLight = vec4.create();

  @edit.persist
  @type.color
  PrimarySpotlight = vec4.create();

  @edit.persist
  @type.color
  SecondarySpotlight = vec4.create();

  @edit.persist
  @type.color
  TertiarySpotlight = vec4.create();

  @edit.persist
  @type.color
  PrimaryHologram = vec4.create();

  @edit.persist
  @type.color
  SecondaryHologram = vec4.create();

  @edit.persist
  @type.color
  TertiaryHologram = vec4.create();

  @edit.persist
  @type.color
  State0 = vec4.create();

  @edit.persist
  @type.color
  State1 = vec4.create();

  @edit.persist
  @type.color
  State2 = vec4.create();

  @edit.persist
  @type.color
  State3 = vec4.create();

  @edit.persist
  @type.color
  StateVulnerable = vec4.create();

  @edit.persist
  @type.color
  StateInvulnerable = vec4.create();

  @edit.persist
  @type.color
  PrimaryForcefield = vec4.create();

  @edit.persist
  @type.color
  SecondaryForcefield = vec4.create();

  @edit.persist
  @type.color
  PrimaryBanner = vec4.create();

  @edit.persist
  @type.color
  PrimaryBillboard = vec4.create();

  @edit.persist
  @type.color
  PrimaryFx = vec4.create();

  @edit.persist
  @type.color
  SecondaryFx = vec4.create();

  @edit.persist
  @type.color
  PrimaryWarpFx = vec4.create();

  @edit.persist
  @type.color
  PrimaryAttackFx = vec4.create();

  @edit.persist
  @type.color
  PrimarySiegeFx = vec4.create();

  @edit.persist
  @type.color
  PrimaryDockedFx = vec4.create();

  #properties = COLOR_PROPERTIES.map(name => this[name]);

  /**
   * Copies an indexed colour set into the named colour fields in the fixed SOF
   * property order; a nullish set is ignored, and the set must hold at least as
   * many entries as there are properties.
   */
  @carbon.method
  @impl.implemented
  SetProperties(colorSet)
  {
    if (!colorSet) return;
    for (let index = 0; index < this.#properties.length; index++)
    {
      vec4.copy(this.#properties[index], colorSet[index]);
    }
  }

  /**
   * Returns the colour vectors in SOF property order; the array and its vectors
   * are this object's live storage, not copies, so writes through it change the
   * inherited colours.
   */
  @carbon.method
  @impl.implemented
  GetProperties()
  {
    return this.#properties;
  }
}
