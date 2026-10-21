import { exposure as be } from "#be";
import { random as carbonRandom } from "#math/random";
// Source: trinity/trinity/Controllers/Actions/Tr2ActionResetClipSphereCenter.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionResetClipSphereCenter.cpp
// Source: trinity/trinity/Controllers/Actions/Tr2ActionResetClipSphereCenter_Blue.cpp
import { CjsSchema, meta, type, blue } from "#schema";
import { EveSpaceObject2 } from "../../eve/spaceObject/EveSpaceObject2.js";
import { ResetBehavior } from "../enums.js";
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";


/**
 * Controller action that moves its owner's clip-sphere center on start, either
 * back to the object center or onto a locator chosen from a named set or from
 * the last damage-locator hit.
 */
@be.define("Tr2ActionResetClipSphereCenter")
export class Tr2ActionResetClipSphereCenter extends ITr2ControllerAction
{
  /** Named locator set the CUSTOM mode reads.
   * @type {string}
   */
  @blue.readwrite
  @blue.persist
  @type.string
  locatorSetName = "";

  /** Locator index the CUSTOM mode reads; negative picks one at random.
   * @type {number}
   */
  @blue.readwrite
  @blue.persist
  @type.int32
  locatorIndex = -1;

  /** Authored reset mode.
   * @type {number}
   */
  @blue.readwrite
  @blue.persist
  @type.int32
  @type.enum("trinity.Tr2ActionResetClipSphereCenter.ResetBehavior")
  resetBehavior = ResetBehavior.OBJECT_CENTER;

  /**
   * Carbon Start (Tr2ActionResetClipSphereCenter.cpp:30-49): an EveSpaceObject2
   * owner resets its clip sphere centre to the last damage locator hit, to the
   * authored locator, or (OBJECT_CENTER and any unknown mode) to its object
   * centre. Any other owner is ignored.
   * @param {ITr2ActionController} controller
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  Start(controller)
  {
    const owner = CjsSchema.cast(controller.GetOwner(), EveSpaceObject2);
    if (!owner) return;
    switch (this.resetBehavior)
    {
      case ResetBehavior.LAST_DAMAGELOCATOR_HIT:
        this._ResetClipSphereToLocator(owner, "damage", owner.GetLastDamageLocatorHit());
        break;
      case ResetBehavior.CUSTOM:
        this._ResetClipSphereToLocator(owner, this.locatorSetName, this.locatorIndex);
        break;
      case ResetBehavior.OBJECT_CENTER:
      default:
        owner.ResetClipSphereCenter();
        break;
    }
  }

  /**
   * Carbon ResetClipSphereToLocator (Tr2ActionResetClipSphereCenter.cpp:15-28):
   * moves the clip sphere centre to a locator of the named set; a negative
   * index picks one at random, an index past the set does nothing.
   *
   * Random draws delegate to the matching generator in global/math/random.js.
   * set when the index is negative, a division by zero (CE-56); an empty set
   * does nothing here.
   * @param {EveSpaceObject2} owner
   * @param {string} locatorSetName
   * @param {number} locatorIndex
   * @returns {void}
   */
  @meta.renamed("ResetClipSphereToLocator")
  @meta.adapted
  _ResetClipSphereToLocator(owner, locatorSetName, locatorIndex)
  {
    const locators = owner.GetLocatorsForSet(locatorSetName);
    if (locators && (locatorIndex < 0 || locators.length > locatorIndex))
    {
      if (locatorIndex < 0)
      {
        if (!locators.length) return;
        locatorIndex = (carbonRandom.crtRand() % (locators.length));
      }
      owner.ResetClipSphereCenterToPos(locators[locatorIndex].position);
    }
  }

  /**
   * Numeric object-center, last-damage-locator and custom-locator reset choices.
   * @type {Object<string, number>}
   */
  static ResetBehavior = ResetBehavior;

}

// Native exposure ends at this concrete table (Tr2ActionResetClipSphereCenter_Blue.cpp:21-22,26).
CjsSchema.exposure.mapInterface(ITr2ControllerAction)(Tr2ActionResetClipSphereCenter);
