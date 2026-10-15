// Source: trinity/trinity/Sprite2d/Tr2Sprite2dPolygon.h
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dPolygon.cpp
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dPolygon_Blue.cpp
// Promoted to hand-maintained source 2026-08-22; texture-coordinate accessors are maintained here.
import { meta, type, blue } from "#schema";
import { Tr2Sprite2dVertexBase } from "./Tr2Sprite2dVertexBase.js";
import { vec2 } from "#math/vec2";
import { vec4 } from "#math/vec4";

/**
 * Represents one Sprite2D polygon vertex with two texture-coordinate channels
 * (Tr2Sprite2dPolygon.h:21-32; constructor Tr2Sprite2dPolygon.cpp:173-179).
 */
@blue.define("Tr2Sprite2dVertex")
@blue.interface()
export class Tr2Sprite2dVertex extends Tr2Sprite2dVertexBase
{

  /**
   * Blue `color` property: Carbon `MAP_PROPERTY( "color", GetColor, SetColor )`, READWRITE and not persisted
   * (Tr2Sprite2dPolygon_Blue.cpp:521). GetColor/SetColor only read and write the inherited `color` storage.
   * Adapted: the base declares `color` as an instance field, which would shadow a prototype accessor of the same
   * name, so the field is redeclared here to carry the exposure; reads and writes reach the same storage the
   * Carbon property methods do.
   * @type {Float32Array}
   */
  @blue.readwrite
  @type.color
  color = vec4.fromValues(1, 1, 1, 1);

  /**
   * Carbon method GetTexCoord (MAP_METHOD_AND_WRAP; Tr2Sprite2dPolygon.cpp:187-191).
   * Adapted: Carbon only `CCP_ASSERT( i < 2 )`s and reads out of bounds in release builds; JS cannot reproduce
   * that undefined read, so it throws as the debug assert does.
   * @param {number} i Texture coordinate index, 0 or 1.
   * @returns {Float32Array} A copy of the coordinate.
   */
  @blue.method
  @meta.adapted
  GetTexCoord(i)
  {
    return vec2.clone(this.texCoord[Tr2Sprite2dVertex.checkIndex(i)]);
  }

  /**
   * Carbon method SetTexCoord (MAP_METHOD_AND_WRAP; Tr2Sprite2dPolygon.cpp:182-186).
   * Adapted: as GetTexCoord, an index of 2 or more throws instead of writing out of bounds.
   * @param {number} i Texture coordinate index, 0 or 1.
   * @param {Float32Array|number[]} uv New coordinate.
   * @returns {void}
   */
  @blue.method
  @meta.adapted
  SetTexCoord(i, uv)
  {
    vec2.copy(this.texCoord[Tr2Sprite2dVertex.checkIndex(i)], uv);
  }

  /**
   * Carbon Tr2Sprite2dVertex::SetColor (Tr2Sprite2dPolygon.cpp:193-196).
   * @param {Float32Array|number[]} c New RGBA colour.
   * @returns {void}
   */
  @meta.implemented
  SetColor(c)
  {
    vec4.copy(this.color, c);
  }

  /**
   * Carbon Tr2Sprite2dVertex::GetColor (Tr2Sprite2dPolygon.cpp:197-200).
   * @returns {Float32Array} A copy of the colour.
   */
  @meta.implemented
  GetColor()
  {
    return vec4.clone(this.color); // alloc: native value return belongs to the caller
  }

  /**
   * Stands in for `CCP_ASSERT( i < 2 )` (Tr2Sprite2dPolygon.cpp:184, 189).
   * Ours: JS has no assert macro; see GetTexCoord for why it throws.
   * @param {number} i Requested index.
   * @returns {number} The index when valid.
   */
  @meta.ours
  static checkIndex(i)
  {
    if (i !== 0 && i !== 1) throw new RangeError("texture coordinate index must be 0 or 1");
    return i;
  }

}
