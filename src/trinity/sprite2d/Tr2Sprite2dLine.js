import { exposure as be } from "#be";
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dLine.h
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dLine.cpp
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dLine_Blue.cpp
// Promoted to hand-maintained source 2026-10-12 from the generated property shell.
import { meta, type, blue } from "#schema";
import { vec2 } from "#math/vec2";
import { vec4 } from "#math/vec4";
import { Tr2Sprite2dTextureSettings, Tr2SpriteObjectEffect } from "../generated/sprite2d/enums.js";
import { Tr2Sprite2dD3DVertex } from "./Tr2Sprite2dD3DVertex.js";
import { Tr2Sprite2dVertexBase } from "./Tr2Sprite2dVertexBase.js";
import { Tr2TexturedSpriteObject } from "./Tr2TexturedSpriteObject.js";

/** Carbon `s_spriteIndices` (Tr2Sprite2dLine.cpp:8-15): one quad as two triangles. @type {Uint16Array} */
const spriteIndices = new Uint16Array([0, 1, 3, 3, 1, 2]); // alloc: immutable module-level index table

/**
 * Element stride handed to `Tr2Sprite2dScene.PrepareTriangleVerts`. Carbon passes
 * `sizeof( Tr2Sprite2dVertexBase )` bytes; JS arrays index whole vertex records, so one record is
 * one step.
 * @type {number}
 */
const vertexBaseStride = 1;

/**
 * Carbon's stack array `Tr2Sprite2dVertexBase verts[4]` (Tr2Sprite2dLine.cpp:86). Shared
 * scratch: `PrepareTriangleVerts` copies it out synchronously, and every field it reads is
 * written first.
 * @type {Tr2Sprite2dVertexBase[]}
 */
const verts = Array.from({ length: 4 }, () => new Tr2Sprite2dVertexBase()); // alloc: module scratch reused by every line

/**
 * Tr2Sprite2dLine draws one textured quad from `translationFrom` to `translationTo`, with its
 * width and colour interpolated between the ends. The texture tiles along the line.
 */
@blue.define({ className: "Tr2Sprite2dLine", purpose: "Defines a textured 2D line segment with per-end widths and colors and texture offset controls." })
@blue.chainTo(Tr2TexturedSpriteObject)
@blue.interface()
export class Tr2Sprite2dLine extends Tr2TexturedSpriteObject
{

  /** m_translationFrom (Vector2) [READWRITE, NOTIFY]: start point, relative to the translation. */
  @be.mapAttribute(be.READWRITE | be.NOTIFY)

  @type.vec2
  translationFrom = vec2.create();

  /** m_translationTo (Vector2) [READWRITE, NOTIFY]: end point, relative to the translation. */
  @be.mapAttribute(be.READWRITE | be.NOTIFY)

  @type.vec2
  translationTo = vec2.create();

  /** m_widthFrom (float) [READWRITE, NOTIFY]: line width at the start point. */
  @be.mapAttribute(be.READWRITE | be.NOTIFY)

  @type.float32
  widthFrom = 0;

  /** m_colorFrom (Color) [READWRITE, NOTIFY]: line colour at the start point. */
  @be.mapAttribute(be.READWRITE | be.NOTIFY)

  @type.color
  colorFrom = vec4.fromValues(1, 1, 1, 1);

  /** m_widthTo (float) [READWRITE, NOTIFY]: line width at the end point. */
  @be.mapAttribute(be.READWRITE | be.NOTIFY)

  @type.float32
  widthTo = 0;

  /** m_textureWidth (float) [READWRITE, NOTIFY]: texture repeat length along the line. */
  @be.mapAttribute(be.READWRITE | be.NOTIFY)

  @type.float32
  textureWidth = 1;

  /** m_textureOffsetBase (float) [READWRITE, NOTIFY]: base texture offset, to hide seams between lines. */
  @be.mapAttribute(be.READWRITE | be.NOTIFY)

  @type.float32
  textureOffsetBase = 0;

  /** m_textureOffset (float) [READWRITE, NOTIFY]: texture offset along the line, for animation. */
  @be.mapAttribute(be.READWRITE | be.NOTIFY)

  @type.float32
  textureOffset = 0;

  /** m_colorTo (Color) [READWRITE, NOTIFY]: line colour at the end point. */
  @be.mapAttribute(be.READWRITE | be.NOTIFY)

  @type.color
  colorTo = vec4.fromValues(1, 1, 1, 1);

  /** Carbon m_vertices[4]: the prepared quad. @type {Tr2Sprite2dD3DVertex[]} */
  _vertices = Array.from({ length: 4 }, () => new Tr2Sprite2dD3DVertex());

  /**
   * Carbon Tr2Sprite2dLine::GatherSprites (Tr2Sprite2dLine.cpp:31-157).
   *
   * The quad runs v0/v1 across the start and v2/v3 across the end, offset along the line normal
   * `(d.y, -d.x)`. TR2_SFX_FILL_AA widens each half width by 2 and stores the anti-aliasing
   * parameters in the second texture coordinate.
   *
   * @param {Tr2Sprite2dScene} renderer Scene gathering this line.
   * @returns {void}
   */
  @meta.implemented
  @blue.method
  GatherSprites(renderer)
  {
    if (!this.display || this.spriteEffect === Tr2SpriteObjectEffect.TR2_SFX_NONE) return;

    if (this.isDirty)
    {
      if (!this._ValidateAndSetTextures(renderer)) return;

      renderer.SetSpriteEffect(this.spriteEffect);
      renderer.SetTileMode(Tr2Sprite2dTextureSettings.S2D_TS_TILE_X | Tr2Sprite2dTextureSettings.S2D_TS_TILE_Y);

      this._SetRegularRenderState(renderer);

      const fromX = this.translationFrom[0] + this.displayX, fromY = this.translationFrom[1] + this.displayY;
      const toX = this.translationTo[0] + this.displayX, toY = this.translationTo[1] + this.displayY;

      let dx = this.translationTo[0] - this.translationFrom[0], dy = this.translationTo[1] - this.translationFrom[1];
      const segmentLength = Math.sqrt(dx * dx + dy * dy);
      const inverseLength = segmentLength ? 1 / segmentLength : 0;
      dx *= inverseLength;
      dy *= inverseLength;

      // Rotate 90 degrees.
      const normalX = dy, normalY = -dx;

      let halfWidthFrom = 0.5 * this.widthFrom;
      let halfWidthTo = 0.5 * this.widthTo;

      const isAA = this.spriteEffect === Tr2SpriteObjectEffect.TR2_SFX_FILL_AA;
      let pixelWidthFromInTexels = 0, pixelWidthToInTexels = 0;
      if (isAA)
      {
        halfWidthFrom += 2;
        halfWidthTo += 2;

        pixelWidthFromInTexels = 1 / (this.widthFrom + 4);
        pixelWidthToInTexels = 1 / (this.widthTo + 4);
      }

      const texOffset1 = this.textureOffsetBase - this.textureOffset;
      const texOffset2 = this.textureOffsetBase + segmentLength / this.textureWidth - this.textureOffset;

      const [v0, v1, v2, v3] = verts;

      vec2.set(v0.position, fromX - normalX * halfWidthFrom, fromY - normalY * halfWidthFrom);
      v0.position[2] = this.depth;
      vec4.copy(v0.color, this.colorFrom);
      vec2.set(v0.texCoord[0], texOffset1, 0);
      if (isAA) vec2.set(v0.texCoord[1], -pixelWidthFromInTexels, this.widthFrom);
      else vec2.set(v0.texCoord[1], texOffset1, 0);

      vec2.set(v1.position, fromX + normalX * halfWidthFrom, fromY + normalY * halfWidthFrom);
      v1.position[2] = this.depth;
      vec4.copy(v1.color, this.colorFrom);
      vec2.set(v1.texCoord[0], texOffset1, 1);
      if (isAA) vec2.set(v1.texCoord[1], 1 + pixelWidthFromInTexels, this.widthFrom);
      else vec2.set(v1.texCoord[1], texOffset1, 1);

      vec2.set(v2.position, toX + normalX * halfWidthTo, toY + normalY * halfWidthTo);
      v2.position[2] = this.depth;
      vec4.copy(v2.color, this.colorTo);
      vec2.set(v2.texCoord[0], texOffset2, 1);
      if (isAA) vec2.set(v2.texCoord[1], 1 + pixelWidthToInTexels, this.widthTo);
      else vec2.set(v2.texCoord[1], texOffset2, 1);

      vec2.set(v3.position, toX - normalX * halfWidthTo, toY - normalY * halfWidthTo);
      v3.position[2] = this.depth;
      vec4.copy(v3.color, this.colorTo);
      vec2.set(v3.texCoord[0], texOffset2, 0);
      if (isAA) vec2.set(v3.texCoord[1], -pixelWidthToInTexels, this.widthTo);
      else vec2.set(v3.texCoord[1], texOffset2, 0);

      renderer.PrepareTriangleVerts(this._vertices, verts, vertexBaseStride, 4);

      this.isDirty = false;
    }

    this._SetValidatedTextures(renderer);

    renderer.RenderTriangleVerts(this._vertices, 4, spriteIndices, 6);
  }

  /**
   * Carbon Tr2Sprite2dLine::PickPoint (Tr2Sprite2dLine.cpp:159-163) is an unimplemented
   * `// TODO` that returns NULL, so a line is never picked.
   *
   * @param {number} _x Screen x.
   * @param {number} _y Screen y.
   * @param {Tr2Sprite2dScene} _renderer Scene supplying the active transform.
   * @returns {null} Always null.
   */
  @meta.implemented
  @blue.method
  PickPoint(_x, _y, _renderer)
  {
    return null;
  }

  /**
   * Carbon Tr2Sprite2dLine::GetVertexCount (Tr2Sprite2dLine.cpp:165-168).
   *
   * @returns {number} 4.
   */
  @meta.implemented
  @blue.method
  GetVertexCount()
  {
    return 4;
  }

}
