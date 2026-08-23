// Source: trinity/trinity/Eve/SpaceObject/Utils/EveLocator2.h
// Source: trinity/trinity/Eve/SpaceObject/Utils/EveLocator2.cpp
import { mat4 } from "#math/mat4";
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";


/**
 * Named attachment point on a space object, carrying a full transform matrix
 * rather than decomposed components.
 */
@type.define({
  className: "EveLocator2",
  family: "eve/utils"
})
export class EveLocator2 extends CjsModel
{
  @io.persist
  @type.string
  name = "";

  @io.persist
  @type.mat4
  transform = mat4.create();

  /** Returns the name consumers select this locator by. */
  @carbon.method
  @impl.implemented
  GetName()
  {
    return this.name;
  }

  /**
   * Sets the name consumers select this locator by, coercing the value to a
   * string.
   */
  @carbon.method
  @impl.implemented
  SetName(name)
  {
    this.name = String(name);
  }

  /**
   * Returns the locator's live transform matrix, not a copy; writes through it
   * change the locator.
   */
  @carbon.method
  @impl.implemented
  GetTransform()
  {
    return this.transform;
  }

  /** Copies a matrix into the locator's own transform storage. */
  @carbon.method
  @impl.implemented
  SetTransform(value)
  {
    mat4.copy(this.transform, value);
  }
}
