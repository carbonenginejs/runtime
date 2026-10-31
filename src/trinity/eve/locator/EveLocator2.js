import { exposure as be } from "#be";
import { IRoot } from "../../../global/blueexposure/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObject/Utils/EveLocator2.h
// Source: trinity/trinity/Eve/SpaceObject/Utils/EveLocator2.cpp
import { mat4 } from "#math/mat4";
import { type, blue } from "#schema";


/**
 * Named attachment point on a space object, carrying a full transform matrix
 * rather than decomposed components.
 */
@be.define("EveLocator2")
@be.inherit(IRoot)
export class EveLocator2 extends IRoot
{
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.mat4
  transform = mat4.create();

  /**
   * Returns the name consumers select this locator by.
   *
   * @implemented
   */

  GetName()
  {
    return this.name;
  }

  /**
   * Sets the name consumers select this locator by, coercing the value to a
   * string.
   *
   * @implemented
   */

  SetName(name)
  {
    this.name = String(name);
  }

  /**
   * Returns the locator's live transform matrix, not a copy; writes through it
   * change the locator.
   *
   * @implemented
   */

  GetTransform()
  {
    return this.transform;
  }

  /**
   * Copies a matrix into the locator's own transform storage.
   *
   * @implemented
   */

  SetTransform(value)
  {
    mat4.copy(this.transform, value);
  }
}
