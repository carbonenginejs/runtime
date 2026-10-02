import { meta } from "#schema";
import { INotify } from "../../../global/blue/INotify.js";
// Source: trinity/trinity/Eve/UI/EveEllipseDefinition.h
//   trinity/trinity/Eve/UI/EveEllipseDefinition.cpp
import { vec3 } from "#math/vec3";



/**
 * One authored ellipse of an ellipse set - centre, plane normal, in-plane
 * rotation in degrees and the two semi-axis lengths.
 */
@meta.define({ className: "EveEllipseDefinition", family: "eve/ui" })
@meta.blue.inherit(INotify)
export class EveEllipseDefinition
{
  _dirtyFlag = null;

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  center = vec3.create();

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  planeNormal = vec3.fromValues(0, 1, 0);

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  rotationDegrees = 0;

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  semiMajor = 1;

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
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
meta.blue.interfaceTable({ interfaces: [EveEllipseDefinition, INotify], chainTo: null })(EveEllipseDefinition, { kind: "class" });
