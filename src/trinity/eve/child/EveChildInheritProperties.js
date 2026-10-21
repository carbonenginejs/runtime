import { exposure as be } from "#be";
import { IRoot } from "../../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildInheritProperties.h
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildInheritProperties.cpp
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildInheritProperties_Blue.cpp
import { vec4 } from "#math/vec4";
import { meta, type, blue } from "#schema";


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
// Self-map: EveChildInheritProperties_Blue.cpp:13-14 (EXPOSURE_BEGIN / MAP_INTERFACE).

@be.define("EveChildInheritProperties")
@blue.inherit(IRoot)
export class EveChildInheritProperties
{
  /**
   * Inherited SOF Primary colour, stored as a four-component vector.
   * Carbon Primary exposure (EveChildInheritProperties_Blue.cpp:19).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  Primary = vec4.create();

  /**
   * Inherited SOF Secondary colour, stored as a four-component vector.
   * Carbon Secondary exposure (EveChildInheritProperties_Blue.cpp:20).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  Secondary = vec4.create();

  /**
   * Inherited SOF Tertiary colour, stored as a four-component vector.
   * Carbon Tertiary exposure (EveChildInheritProperties_Blue.cpp:21).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  Tertiary = vec4.create();

  /**
   * Inherited SOF Black colour, stored as a four-component vector.
   * Carbon Black exposure (EveChildInheritProperties_Blue.cpp:22).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  Black = vec4.create();

  /**
   * Inherited SOF White colour, stored as a four-component vector.
   * Carbon White exposure (EveChildInheritProperties_Blue.cpp:23).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  White = vec4.create();

  /**
   * Inherited SOF Yellow colour, stored as a four-component vector.
   * Carbon Yellow exposure (EveChildInheritProperties_Blue.cpp:24).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  Yellow = vec4.create();

  /**
   * Inherited SOF Orange colour, stored as a four-component vector.
   * Carbon Orange exposure (EveChildInheritProperties_Blue.cpp:25).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  Orange = vec4.create();

  /**
   * Inherited SOF Red colour, stored as a four-component vector.
   * Carbon Red exposure (EveChildInheritProperties_Blue.cpp:26).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  Red = vec4.create();

  /**
   * Inherited SOF Blue colour, stored as a four-component vector.
   * Carbon Blue exposure (EveChildInheritProperties_Blue.cpp:27).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  Blue = vec4.create();

  /**
   * Inherited SOF Green colour, stored as a four-component vector.
   * Carbon Green exposure (EveChildInheritProperties_Blue.cpp:28).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  Green = vec4.create();

  /**
   * Inherited SOF Cyan colour, stored as a four-component vector.
   * Carbon Cyan exposure (EveChildInheritProperties_Blue.cpp:29).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  Cyan = vec4.create();

  /**
   * Inherited SOF Fire colour, stored as a four-component vector.
   * Carbon Fire exposure (EveChildInheritProperties_Blue.cpp:30).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  Fire = vec4.create();

  /**
   * Inherited SOF Hull colour, stored as a four-component vector.
   * Carbon Hull exposure (EveChildInheritProperties_Blue.cpp:31).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  Hull = vec4.create();

  /**
   * Inherited SOF Glass colour, stored as a four-component vector.
   * Carbon Glass exposure (EveChildInheritProperties_Blue.cpp:32).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  Glass = vec4.create();

  /**
   * Inherited SOF Reactor colour, stored as a four-component vector.
   * Carbon Reactor exposure (EveChildInheritProperties_Blue.cpp:33).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  Reactor = vec4.create();

  /**
   * Inherited SOF Darkhull colour, stored as a four-component vector.
   * Carbon Darkhull exposure (EveChildInheritProperties_Blue.cpp:34).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  Darkhull = vec4.create();

  /**
   * Inherited SOF Booster colour, stored as a four-component vector.
   * Carbon Booster exposure (EveChildInheritProperties_Blue.cpp:35).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  Booster = vec4.create();

  /**
   * Inherited SOF Killmark colour, stored as a four-component vector.
   * Carbon Killmark exposure (EveChildInheritProperties_Blue.cpp:36).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  Killmark = vec4.create();

  /**
   * Inherited SOF PrimaryLight colour, stored as a four-component vector.
   * Carbon PrimaryLight exposure (EveChildInheritProperties_Blue.cpp:37).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  PrimaryLight = vec4.create();

  /**
   * Inherited SOF SecondaryLight colour, stored as a four-component vector.
   * Carbon SecondaryLight exposure (EveChildInheritProperties_Blue.cpp:38).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  SecondaryLight = vec4.create();

  /**
   * Inherited SOF TertiaryLight colour, stored as a four-component vector.
   * Carbon TertiaryLight exposure (EveChildInheritProperties_Blue.cpp:39).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  TertiaryLight = vec4.create();

  /**
   * Inherited SOF WhiteLight colour, stored as a four-component vector.
   * Carbon WhiteLight exposure (EveChildInheritProperties_Blue.cpp:40).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  WhiteLight = vec4.create();

  /**
   * Inherited SOF PrimarySpotlight colour, stored as a four-component vector.
   * Carbon PrimarySpotlight exposure (EveChildInheritProperties_Blue.cpp:41).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  PrimarySpotlight = vec4.create();

  /**
   * Inherited SOF SecondarySpotlight colour, stored as a four-component vector.
   * Carbon SecondarySpotlight exposure (EveChildInheritProperties_Blue.cpp:42).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  SecondarySpotlight = vec4.create();

  /**
   * Inherited SOF TertiarySpotlight colour, stored as a four-component vector.
   * Carbon TertiarySpotlight exposure (EveChildInheritProperties_Blue.cpp:43).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  TertiarySpotlight = vec4.create();

  /**
   * Inherited SOF PrimaryHologram colour, stored as a four-component vector.
   * Carbon PrimaryHologram exposure (EveChildInheritProperties_Blue.cpp:44).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  PrimaryHologram = vec4.create();

  /**
   * Inherited SOF SecondaryHologram colour, stored as a four-component vector.
   * Carbon SecondaryHologram exposure (EveChildInheritProperties_Blue.cpp:45).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  SecondaryHologram = vec4.create();

  /**
   * Inherited SOF TertiaryHologram colour, stored as a four-component vector.
   * Carbon TertiaryHologram exposure (EveChildInheritProperties_Blue.cpp:46).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  TertiaryHologram = vec4.create();

  /**
   * Inherited SOF State0 colour, stored as a four-component vector.
   * Carbon State0 exposure (EveChildInheritProperties_Blue.cpp:47).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  State0 = vec4.create();

  /**
   * Inherited SOF State1 colour, stored as a four-component vector.
   * Carbon State1 exposure (EveChildInheritProperties_Blue.cpp:48).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  State1 = vec4.create();

  /**
   * Inherited SOF State2 colour, stored as a four-component vector.
   * Carbon State2 exposure (EveChildInheritProperties_Blue.cpp:49).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  State2 = vec4.create();

  /**
   * Inherited SOF State3 colour, stored as a four-component vector.
   * Carbon State3 exposure (EveChildInheritProperties_Blue.cpp:50).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  State3 = vec4.create();

  /**
   * Inherited SOF StateVulnerable colour, stored as a four-component vector.
   * Carbon StateVulnerable exposure (EveChildInheritProperties_Blue.cpp:51).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  StateVulnerable = vec4.create();

  /**
   * Inherited SOF StateInvulnerable colour, stored as a four-component vector.
   * Carbon StateInvulnerable exposure (EveChildInheritProperties_Blue.cpp:52).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  StateInvulnerable = vec4.create();

  /**
   * Inherited SOF PrimaryForcefield colour, stored as a four-component vector.
   * Carbon PrimaryForcefield exposure (EveChildInheritProperties_Blue.cpp:53).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  PrimaryForcefield = vec4.create();

  /**
   * Inherited SOF SecondaryForcefield colour, stored as a four-component vector.
   * Carbon SecondaryForcefield exposure (EveChildInheritProperties_Blue.cpp:54).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  SecondaryForcefield = vec4.create();

  /**
   * Inherited SOF PrimaryBanner colour, stored as a four-component vector.
   * Carbon PrimaryBanner exposure (EveChildInheritProperties_Blue.cpp:55).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  PrimaryBanner = vec4.create();

  /**
   * Inherited SOF PrimaryBillboard colour, stored as a four-component vector.
   * Carbon PrimaryBillboard exposure (EveChildInheritProperties_Blue.cpp:56).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  PrimaryBillboard = vec4.create();

  /**
   * Inherited SOF PrimaryFx colour, stored as a four-component vector.
   * Carbon PrimaryFx exposure (EveChildInheritProperties_Blue.cpp:57).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  PrimaryFx = vec4.create();

  /**
   * Inherited SOF SecondaryFx colour, stored as a four-component vector.
   * Carbon SecondaryFx exposure (EveChildInheritProperties_Blue.cpp:58).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  SecondaryFx = vec4.create();

  /**
   * Inherited SOF PrimaryWarpFx colour, stored as a four-component vector.
   * Carbon PrimaryWarpFx exposure (EveChildInheritProperties_Blue.cpp:59).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  PrimaryWarpFx = vec4.create();

  /**
   * Inherited SOF PrimaryAttackFx colour, stored as a four-component vector.
   * Carbon PrimaryAttackFx exposure (EveChildInheritProperties_Blue.cpp:60).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  PrimaryAttackFx = vec4.create();

  /**
   * Inherited SOF PrimarySiegeFx colour, stored as a four-component vector.
   * Carbon PrimarySiegeFx exposure (EveChildInheritProperties_Blue.cpp:61).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  PrimarySiegeFx = vec4.create();

  /**
   * Inherited SOF PrimaryDockedFx colour, stored as a four-component vector.
   * Carbon PrimaryDockedFx exposure (EveChildInheritProperties_Blue.cpp:62).
   *
   * Adapted: Persisted by the JavaScript values format; Carbon exposes this field read-only.
   *
   * @type {vec4}
   */
  @meta.adapted
  @be.mapAttribute(be.READ)
  @meta.attribute(meta.PERSIST)
  @type.color
  PrimaryDockedFx = vec4.create();

  _properties = COLOR_PROPERTIES.map(name => this[name]);

  /**
   * Copies an indexed colour set into the named colour fields in the fixed SOF
   * property order; a nullish set is ignored, and the set must hold at least as
   * many entries as there are properties.
   */

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

  @meta.implemented
  GetProperties()
  {
    return this._properties;
  }
}
