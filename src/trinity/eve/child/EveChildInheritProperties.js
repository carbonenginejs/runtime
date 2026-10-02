// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildInheritProperties.h
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildInheritProperties.cpp
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildInheritProperties_Blue.cpp
import { vec4 } from "#math/vec4";
import { meta } from "#schema";


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
@meta.define({ className: "EveChildInheritProperties", family: "eve/child" })
export class EveChildInheritProperties
{
  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  Primary = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  Secondary = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  Tertiary = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  Black = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  White = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  Yellow = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  Orange = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  Red = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  Blue = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  Green = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  Cyan = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  Fire = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  Hull = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  Glass = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  Reactor = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  Darkhull = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  Booster = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  Killmark = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  PrimaryLight = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  SecondaryLight = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  TertiaryLight = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  WhiteLight = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  PrimarySpotlight = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  SecondarySpotlight = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  TertiarySpotlight = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  PrimaryHologram = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  SecondaryHologram = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  TertiaryHologram = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  State0 = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  State1 = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  State2 = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  State3 = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  StateVulnerable = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  StateInvulnerable = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  PrimaryForcefield = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  SecondaryForcefield = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  PrimaryBanner = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  PrimaryBillboard = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  PrimaryFx = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  SecondaryFx = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  PrimaryWarpFx = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  PrimaryAttackFx = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  PrimarySiegeFx = vec4.create();

  // PERSIST is ours, not Carbon's: SOF's JSON output carries this value, which Carbon sets in C++.
  @meta.adapted
  @meta.blue.read
  @meta.blue.persist
  @meta.type.color
  PrimaryDockedFx = vec4.create();

  _properties = COLOR_PROPERTIES.map(name => this[name]);

  /**
   * Copies an indexed colour set into the named colour fields in the fixed SOF
   * property order; a nullish set is ignored, and the set must hold at least as
   * many entries as there are properties.
   */
  @meta.blue.method
  @meta.implemented
  SetProperties(colorSet)
  {
    if (!colorSet) return;
    for (let index = 0; index < this._properties.length; index++)
    {
      vec4.copy(this._properties[index], colorSet[index]);
    }
  }

  /**
   * Returns the colour vectors in SOF property order; the array and its vectors
   * are this object's live storage, not copies, so writes through it change the
   * inherited colours.
   */
  @meta.blue.method
  @meta.implemented
  GetProperties()
  {
    return this._properties;
  }
}
