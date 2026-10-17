import { IRoot } from "../../../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObject/Children/TransformModifiers/IEveChildTransformModifier.h
import { blue } from "#schema";


/** Required child-transform modifier contract (IEveChildTransformModifier.h:8-13). */
@blue.define("IEveChildTransformModifier")
@blue.inherit(IRoot)
export class IEveChildTransformModifier
{

  /**
   * Carbon `Matrix ApplyTransform( const Matrix& transform, size_t boneCount,
   * const Float4x3* bones ) const` (IEveChildTransformModifier.h:12), as every
   * caller and implementer calls it (`applyTransformModifiers`,
   * EveChildTransform.js): the frame context first, standing in for the
   * renderer globals the camera-dependent billboards read, and the returned
   * Matrix written into caller-owned `out` last.
   *
   * @param {object} _context The frame context.
   * @param {mat4} _transform The transform to modify (read only).
   * @param {number} _boneCount How many bones `bones` holds.
   * @param {Float32Array|null} _bones Float4x3 palette, 12 floats per bone.
   * @param {mat4} _out Caller-owned; receives the modified transform.
   * @returns {mat4} `out`.
   */
  @blue.abstract
  ApplyTransform(_context, _transform, _boneCount, _bones, _out) {}

}
