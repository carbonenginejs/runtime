// Source: trinity/trinity/Eve/SpaceObject/Children/LineSetPaths/IEveLineSetPath.h
import { meta } from "#schema";
import { EveChildTransform } from "../EveChildTransform.js";


/** Required line-set path contract on the shared child-transform spine. */
@meta.define({ className: "IEveLineSetPath", family: "eve/child/lineSetPaths" })
export class IEveLineSetPath extends EveChildTransform
{

  /** Updates the authored line path for the current child context. */
  @meta.blue.method
  @meta.abstract
  Update(_updateContext, _params)
  {
    throw new Error("IEveLineSetPath.Update must be implemented by a concrete line path.");
  }

  /** Writes this path's line data into a renderer-neutral buffer. */
  @meta.blue.method
  @meta.abstract
  UpdateBuffer(_renderContext, _cursor, _transform, _lineOffset)
  {
    throw new Error("IEveLineSetPath.UpdateBuffer must be implemented by a concrete line path.");
  }

  /** Regenerates the path points beneath the supplied transform. */
  @meta.blue.method
  @meta.abstract
  GeneratePoints(_transform)
  {
    throw new Error("IEveLineSetPath.GeneratePoints must be implemented by a concrete line path.");
  }

  /** Returns the number of generated points in the path. */
  @meta.blue.method
  @meta.abstract
  GetPointCount()
  {
    throw new Error("IEveLineSetPath.GetPointCount must be implemented by a concrete line path.");
  }

  /** Adds this path's lines to a maintained curve-line set. */
  @meta.blue.method
  @meta.abstract
  AddLinesToSet(_lineSet, _color, _animationColor, _scrollSpeed)
  {
    throw new Error("IEveLineSetPath.AddLinesToSet must be implemented by a concrete line path.");
  }

  /** Recalculates the path's bounding sphere. */
  @meta.blue.method
  @meta.abstract
  CalculateBoundingSphere(_radius = 0, _updateLines = true)
  {
    throw new Error("IEveLineSetPath.CalculateBoundingSphere must be implemented by a concrete line path.");
  }

  /** Writes the path's current bounding sphere. */
  @meta.blue.method
  @meta.abstract
  GetBoundingSphere(_out)
  {
    throw new Error("IEveLineSetPath.GetBoundingSphere must be implemented by a concrete line path.");
  }

  /** Updates path visibility for the current frustum and LOD. */
  @meta.blue.method
  @meta.abstract
  UpdateVisibility(_frustum, _lod, _parentTransform)
  {
    throw new Error("IEveLineSetPath.UpdateVisibility must be implemented by a concrete line path.");
  }

  /** Adds line-path debug controls. */
  @meta.blue.method
  @meta.abstract
  GetDebugOptions(_options)
  {
    throw new Error("IEveLineSetPath.GetDebugOptions must be implemented by a concrete line path.");
  }

  /** Renders line-path debug information. */
  @meta.blue.method
  @meta.abstract
  RenderDebugInfo(_renderer, _parentTransform)
  {
    throw new Error("IEveLineSetPath.RenderDebugInfo must be implemented by a concrete line path.");
  }

}
