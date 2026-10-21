import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/IEveTransform.h
//
// The contract for entries in a `children` list on EveSpaceObject2 and
// EveTransform.
//
// Carbon's `Update( const EveUpdateContext& )` (IEveTransform.h:17) is an
// overload on EveTransform, which also keeps Tr2Transform's
// `Update( Be::Time )` (EveTransform.h:55,143; Tr2Transform.h:74). Per rule
// 11 the context form is `Update__UpdateContext` and the time form
// `Update__Time`; EveTransform's bare Update routes between them, and
// single-overload implementors forward their bare Update to
// Update__UpdateContext. Children loops call Update__UpdateContext.

import { CjsSchema, blue } from "#schema";


/** Contract for a child entry a space object drives and renders. */
export class IEveTransform extends IRoot
{

  /**
   * Carbon's `void Update( const EveUpdateContext& updateContext )`
   * (IEveTransform.h:17): advances the child for the frame.
   *
   * @param {object} _updateContext The frame's EveUpdateContext.
   */
  @blue.abstract
  Update__UpdateContext(_updateContext) {}

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


CjsSchema.blue.inherit(IRoot)(IEveTransform);
CjsSchema.exposure.interface("IEveTransform")(IEveTransform);
