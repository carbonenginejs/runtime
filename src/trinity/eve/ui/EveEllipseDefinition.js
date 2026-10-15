// Source: trinity/trinity/Eve/UI/EveEllipseDefinition.h
import { type, blue } from "#schema";
import { INotify } from "../../../global/blue/INotify.js";
//   trinity/trinity/Eve/UI/EveEllipseDefinition.cpp
import { vec3 } from "#math/vec3";



/**
 * One authored ellipse of an ellipse set - centre, plane normal, in-plane
 * rotation in degrees and the two semi-axis lengths.
 */
@blue.define("EveEllipseDefinition")
@blue.inherit(INotify)
@blue.interface(INotify)
export class EveEllipseDefinition
{
  _dirtyFlag = null;

  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.vec3
  center = vec3.create();

  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.vec3
  planeNormal = vec3.fromValues(0, 1, 0);

  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.float32
  rotationDegrees = 0;

  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.float32
  semiMajor = 1;

  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.float32
  semiMinor = 1;

  /**
   * Invokes the bound dirty callback so the owning set regenerates its geometry
   * after any authored field changes.
   */
  OnModified(_value = null)
  {
    this._dirtyFlag?.();
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
    this._dirtyFlag = dirtyFlag;
  }
}

// Exact native Blue exposure: only these identities participate in loading.
