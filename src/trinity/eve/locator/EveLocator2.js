import { exposure as be } from "#be";
import { IRoot } from "../../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObject/Utils/EveLocator2.h
// Source: trinity/trinity/Eve/SpaceObject/Utils/EveLocator2.cpp
import { mat4 } from "#math/mat4";
import { meta, type, blue } from "#schema";


/**
 * Named attachment point on a space object, carrying a full transform matrix
 * rather than decomposed components.
 */
@be.define("EveLocator2")
@blue.inherit(IRoot)
export class EveLocator2 extends IRoot
{
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.mat4
  transform = mat4.create();

  /** Returns the name consumers select this locator by. */

  @meta.implemented
  GetName()
  {
    return this.name;
  }

  /**
   * Sets the name consumers select this locator by, coercing the value to a
   * string.
   */

  @meta.implemented
  SetName(name)
  {
    this.name = String(name);
  }

  /**
   * Returns the locator's live transform matrix, not a copy; writes through it
   * change the locator.
   */

  @meta.implemented
  GetTransform()
  {
    return this.transform;
  }

  /** Copies a matrix into the locator's own transform storage. */

  @meta.implemented
  SetTransform(value)
  {
    mat4.copy(this.transform, value);
  }
}
