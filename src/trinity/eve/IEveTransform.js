import { IRoot } from "../../global/blue/IRoot.js";
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

import { CjsSchema, blue } from "#schema";


/** Contract for a child entry a space object drives and renders. */
export class IEveTransform
{

  /**
   * Decides frame visibility against the frustum.
   *
   * @param {object} _updateContext The frame's EveUpdateContext.
   * @param {Float32Array} _parentTransform The parent's world transform.
   */
  @blue.method
  UpdateVisibility(_updateContext, _parentTransform)
  {
    throw new Error("IEveTransform.UpdateVisibility must be implemented by a transform child.");
  }

  /**
   * Appends this child's renderables for the frame.
   *
   * @param {Array} _renderables Collected renderables.
   */
  @blue.method
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
  @blue.method
  GetBoundingSphere(_sphere, _query)
  {
    throw new Error("IEveTransform.GetBoundingSphere must be implemented by a transform child.");
  }

  /**
   * The child's current level of detail.
   *
   * @returns {number} A Tr2Lod value.
   */
  @blue.method
  GetLODLevel()
  {
    throw new Error("IEveTransform.GetLODLevel must be implemented by a transform child.");
  }
}


CjsSchema.blue.inherit(IRoot)(IEveTransform);
CjsSchema.blue.define(IEveTransform, { className: "IEveTransform" });
