// Source: trinity/trinity/Eve/UI/EveEllipseDefinition.h
//   trinity/trinity/Eve/UI/EveEllipseDefinition.cpp
import { vec3 } from "#math/vec3";
import { CjsModel } from "#model";
import { io, type } from "#schema";


/**
 * One authored ellipse of an ellipse set - centre, plane normal, in-plane
 * rotation in degrees and the two semi-axis lengths.
 */
@type.define({ className: "EveEllipseDefinition", family: "eve/ui" })
export class EveEllipseDefinition extends CjsModel
{
  #dirtyFlag = null;

  @io.notify
  @io.persist
  @type.vec3
  center = vec3.create();

  @io.notify
  @io.persist
  @type.vec3
  planeNormal = vec3.fromValues(0, 1, 0);

  @io.notify
  @io.persist
  @type.float32
  rotationDegrees = 0;

  @io.notify
  @io.persist
  @type.float32
  semiMajor = 1;

  @io.notify
  @io.persist
  @type.float32
  semiMinor = 1;

  /**
   * Invokes the bound dirty callback so the owning set regenerates its geometry
   * after any authored field changes.
   */
  OnModified(_value = null)
  {
    this.#dirtyFlag?.();
    return true;
  }

  /**
   * Installs the callback invoked whenever this definition is modified; pass
   * null to unbind, and anything that is neither a function nor null throws.
   */
  SetDirtyFlag(dirtyFlag)
  {
    if (dirtyFlag !== null && typeof dirtyFlag !== "function")
    {
      throw new TypeError("EveEllipseDefinition dirty flag must be a function or null");
    }
    this.#dirtyFlag = dirtyFlag;
  }
}
