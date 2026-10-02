// Source: trinity/trinity/Eve/SpaceObject/Utils/EveLocator2.h
// Source: trinity/trinity/Eve/SpaceObject/Utils/EveLocator2.cpp
import { mat4 } from "#math/mat4";
import { meta } from "#schema";


/**
 * Named attachment point on a space object, carrying a full transform matrix
 * rather than decomposed components.
 */
@meta.define({
  className: "EveLocator2",
  family: "eve/utils"
})
export class EveLocator2
{
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.mat4
  transform = mat4.create();

  /** Returns the name consumers select this locator by. */
  @meta.blue.method
  @meta.implemented
  GetName()
  {
    return this.name;
  }

  /**
   * Sets the name consumers select this locator by, coercing the value to a
   * string.
   */
  @meta.blue.method
  @meta.implemented
  SetName(name)
  {
    this.name = String(name);
  }

  /**
   * Returns the locator's live transform matrix, not a copy; writes through it
   * change the locator.
   */
  @meta.blue.method
  @meta.implemented
  GetTransform()
  {
    return this.transform;
  }

  /** Copies a matrix into the locator's own transform storage. */
  @meta.blue.method
  @meta.implemented
  SetTransform(value)
  {
    mat4.copy(this.transform, value);
  }
}
