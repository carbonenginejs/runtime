// Source: trinity/trinity/Eve/SpaceObject/Children/LineSetPaths/IEveLineSetPath.h
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { blue } from "#schema";
import { EveChildTransform } from "../EveChildTransform.js";


/** Required line-set path contract on the shared child-transform spine. */
@blue.define("IEveLineSetPath")
export class IEveLineSetPath extends EveChildTransform
{

  /** Updates the authored line path for the current child context. */
  @blue.abstract
  Update(_updateContext, _params) {}

  /**
   * Writes instance transforms to a mutable { view: DataView, offset: bytes }
   * cursor. The cursor replaces Carbon's advancing uint8_t*&; stride is bytes.
   */
  @blue.abstract
  UpdateBuffer(_renderContext, _cursor, _transform, _stride) {}

  /** Regenerates the path points beneath the supplied transform. */
  @blue.abstract
  GeneratePoints(_transform) {}

  /** Returns the number of generated points in the path. */
  @blue.abstract
  GetPointCount() {}

  /** Adds this path's lines to a maintained curve-line set. */
  @blue.abstract
  AddLinesToSet(_lineSet, _color, _animationColor, _scrollSpeed) {}

  /** Recalculates the path's bounding sphere. */
  @blue.abstract
  CalculateBoundingSphere(_radius = 0, _updateLines = true) {}

  /** Writes the path's current bounding sphere. */
  @blue.abstract
  GetBoundingSphere(_out) {}

  /** Updates path visibility for the current frustum and LOD. */
  @blue.abstract
  UpdateVisibility(_frustum, _lod, _parentTransform) {}

  /** Adds line-path debug controls. */
  @blue.abstract
  GetDebugOptions(_options) {}

  /** Renders line-path debug information. */
  @blue.abstract
  RenderDebugInfo(_renderer, _parentTransform) {}

  static scratch = { vec3_0: vec3.create(), vec4_0: vec4.create() };

}

/**
 * Native IEveLineSetPath.h:28-72 preliminary sphere: average centers plus the
 * maximum center distance and maximum radius. Empty input leaves out unchanged.
 * Scratch is used only after recursive child recalculation has completed.
 */
export function CalculateBoundingSphereForLineSetPaths(out, lines, reCalculateChildren, meshSize)
{
  if (!lines.length) return;
  if (reCalculateChildren)
  {
    for (const line of lines) line.CalculateBoundingSphere(meshSize, reCalculateChildren);
  }
  const { vec3_0, vec4_0 } = IEveLineSetPath.scratch;
  vec3.set(vec3_0, 0, 0, 0);
  let radius = 0, distanceSquared = 0;
  for (const line of lines)
  {
    line.GetBoundingSphere(vec4_0);
    vec3.add(vec3_0, vec3_0, vec4_0);
    radius = Math.max(radius, vec4_0[3]);
  }
  vec3.scale(vec3_0, vec3_0, 1 / lines.length);
  for (const line of lines)
  {
    line.GetBoundingSphere(vec4_0);
    distanceSquared = Math.max(distanceSquared, vec3.squaredDistance(vec4_0, vec3_0));
  }
  vec4.set(out, vec3_0[0], vec3_0[1], vec3_0[2], Math.sqrt(distanceSquared) + radius);
}
