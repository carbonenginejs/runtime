// Source: trinity/trinity/Eve/IEveTransform.h
//
// The contract for entries in a `children` list on EveSpaceObject2 and
// EveTransform. Carbon declares five pure virtuals; FOUR are ported.
//
// `Update(const EveUpdateContext&)` is DELIBERATELY NOT PORTED. The name is
// already taken on the transform lineage by Tr2Transform.Update(time,
// renderContext) - a different signature and meaning. C++ resolves the two by
// overload; JavaScript cannot, and a mixin installing a throwing Update would
// silently change what Tr2Transform.Update means for every subclass. Callers
// iterating `children` therefore keep their hedge on `child?.Update?.()`
// until the implementors' own Update surfaces are reconciled.

import { CjsSchema } from "#schema";
import { Adopt, Brand } from "../controllers/ITr2Controller.js";


const IEVE_TRANSFORM = Symbol.for("carbonenginejs.contract.IEveTransform");

const TRANSFORM_ABSTRACTS = [
  "UpdateVisibility", "GetRenderables", "GetBoundingSphere", "GetLODLevel"
];


/** Contract for a child entry a space object drives and renders. */
export class IEveTransform
{
  static [Symbol.hasInstance](value)
  {
    return value !== null && value !== undefined && value[IEVE_TRANSFORM] === true;
  }

  /**
   * Decides frame visibility against the frustum.
   *
   * @param {object} _updateContext The frame's EveUpdateContext.
   * @param {Float32Array} _parentTransform The parent's world transform.
   */
  UpdateVisibility(_updateContext, _parentTransform)
  {
    throw new Error("IEveTransform.UpdateVisibility must be implemented by a transform child.");
  }

  /**
   * Appends this child's renderables for the frame.
   *
   * @param {Array} _renderables Collected renderables.
   */
  GetRenderables(_renderables)
  {
    throw new Error("IEveTransform.GetRenderables must be implemented by a transform child.");
  }

  /**
   * Writes the world-space bounding sphere.
   *
   * @param {Float32Array} _sphere Receives centre xyz and radius w.
   * @param {number} [_query] A BoundingSphereQuery.
   * @returns {boolean} Whether a sphere was written.
   */
  GetBoundingSphere(_sphere, _query)
  {
    throw new Error("IEveTransform.GetBoundingSphere must be implemented by a transform child.");
  }

  /**
   * The child's current level of detail.
   *
   * @returns {number} A Tr2Lod value.
   */
  GetLODLevel()
  {
    throw new Error("IEveTransform.GetLODLevel must be implemented by a transform child.");
  }
}


Brand(IEveTransform, IEVE_TRANSFORM, [], TRANSFORM_ABSTRACTS);
CjsSchema.define(IEveTransform, { className: "IEveTransform" });


/**
 * Adds the IEveTransform contract without replacing an existing model base.
 *
 * @param {Function} Base The class to extend.
 * @returns {Function} A subclass carrying the contract.
 */
export function withIEveTransform(Base)
{
  const Transform = Adopt(Base, IEveTransform, TRANSFORM_ABSTRACTS);

  Brand(Transform, IEVE_TRANSFORM, [], TRANSFORM_ABSTRACTS);

  return Transform;
}
