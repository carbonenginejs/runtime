// Source: trinity/trinity/Eve/SpaceObject/Utils/EveLocator2.h
// Source: trinity/trinity/Eve/SpaceObject/Utils/EveLocator2.cpp
import { mat4 } from "#math/mat4";
import { meta, type, blue } from "#schema";


/**
 * Named attachment point on a space object, carrying a full transform matrix
 * rather than decomposed components.
 */
@blue.define("EveLocator2")
export class EveLocator2
{
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  @blue.readwrite
  @blue.persist
  @type.mat4
  transform = mat4.create();

  /** Returns the name consumers select this locator by. */
  @blue.method
  @meta.implemented
  GetName()
  {
    return this.name;
  }

  /**
   * Sets the name consumers select this locator by, coercing the value to a
   * string.
   */
  @blue.method
  @meta.implemented
  SetName(name)
  {
    this.name = String(name);
  }

  /**
   * Returns the locator's live transform matrix, not a copy; writes through it
   * change the locator.
   */
  @blue.method
  @meta.implemented
  GetTransform()
  {
    return this.transform;
  }

  /** Copies a matrix into the locator's own transform storage. */
  @blue.method
  @meta.implemented
  SetTransform(value)
  {
    mat4.copy(this.transform, value);
  }
}
