// Source: trinity/trinity/Sprite2d/Tr2Sprite2dPolygon.h
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dPolygon.cpp
// Promoted to hand-maintained source 2026-08-22; texture-coordinate accessors are maintained here.
import { carbon, impl, type } from "#schema";
import { Tr2Sprite2dVertexBase } from "./Tr2Sprite2dVertexBase.js";
import { vec2 } from "#math/vec2";

/** Represents one Sprite2D polygon vertex with two validated texture-coordinate channels. */
@type.define({ className: "Tr2Sprite2dVertex", family: "sprite2d" })
export class Tr2Sprite2dVertex extends Tr2Sprite2dVertexBase
{

  /** Carbon method GetTexCoord (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  GetTexCoord(index)
  {
    const value = this.texCoord[Tr2Sprite2dVertex.#GetIndex(index)];
    return vec2.clone(value);
  }

  /** Carbon method SetTexCoord (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  SetTexCoord(index, value)
  {
    vec2.copy(this.texCoord[Tr2Sprite2dVertex.#GetIndex(index)], value);
  }

  /** Validates and returns a texture-coordinate slot index. */
  static #GetIndex(index)
  {
    const value = Number(index);
    if (value !== 0 && value !== 1)
    {
      throw new RangeError("texture coordinate index must be 0 or 1");
    }
    return value;
  }

}
