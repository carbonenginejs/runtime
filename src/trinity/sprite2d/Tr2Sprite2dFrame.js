import { exposure as be } from "#be";
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dFrame.h
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dFrame.cpp
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dFrame_Blue.cpp
// Promoted to hand-maintained source 2026-10-12 from the generated property shell.
import { meta, type, blue } from "#schema";
import { vec4 } from "#math/vec4";
import { Tr2SpriteObjectEffect, Tr2SpriteObjectPickState } from "../generated/sprite2d/enums.js";
import { Tr2Sprite2dD3DVertex } from "./Tr2Sprite2dD3DVertex.js";
import { Tr2Sprite2dVertexBase } from "./Tr2Sprite2dVertexBase.js";
import { Tr2TexturedSpriteObject } from "./Tr2TexturedSpriteObject.js";

/**
 * Carbon `s_frameIndices` (Tr2Sprite2dFrame.cpp:11-69): all frames share one layout. The two
 * centre triangles are last, so `fillCenter = false` skips them by sending 16 triangles, not 18.
 * @type {Uint16Array}
 */
const frameIndices = new Uint16Array([ // alloc: immutable module-level index table
  0, 4, 5, 0, 5, 1,
  1, 5, 6, 1, 6, 2,
  2, 6, 7, 2, 7, 3,
  4, 8, 9, 4, 9, 5,
  6, 10, 11, 6, 11, 7,
  8, 12, 13, 8, 13, 9,
  9, 13, 14, 9, 14, 10,
  10, 14, 15, 10, 15, 11,
  5, 9, 10, 5, 10, 6
]);

/** Carbon `static const Color WHITE` (Tr2Sprite2dFrame.cpp:71). @type {Float32Array} */
const white = vec4.fromValues(1, 1, 1, 1); // alloc: immutable module-level colour

/**
 * Element stride handed to `Tr2Sprite2dScene.PrepareTriangleVerts`. Carbon passes
 * `sizeof( Tr2Sprite2dVertexBase )` bytes; JS arrays index whole vertex records, so one record is
 * one step.
 * @type {number}
 */
const vertexBaseStride = 1;

/**
 * Carbon's stack array `Tr2Sprite2dVertexBase srcVertices[16 * 3]` (Tr2Sprite2dFrame.cpp:129).
 * Shared scratch: `PrepareTriangleVerts` copies it out synchronously, and `_PrepareVertices`
 * writes every field it reads.
 * @type {Tr2Sprite2dVertexBase[]}
 */
const srcVertices = Array.from({ length: 16 * 3 }, () => new Tr2Sprite2dVertexBase()); // alloc: module scratch reused by every frame

/** The three 16-vertex segments of `srcVertices` (Carbon `&srcVertices[0]`, `[16]`, `[32]`). @type {Tr2Sprite2dVertexBase[][]} */
const srcVertexSegments = [0, 16, 32].map(start => srcVertices.slice(start, start + 16)); // alloc: module scratch views

/**
 * Tr2Sprite2dFrame renders a frame by cutting a texture into nine pieces and stretching them to
 * the frame's display extents (Tr2Sprite2dFrame.h:15-23). Vertices hold the sprite translation;
 * three 16-vertex segments carry the shadow, the frame and its glow.
 */
@blue.define({ className: "Tr2Sprite2dFrame", purpose: "Defines a textured frame with corner sizing, corner scaling, center-fill, and offset controls." })
@blue.chainTo(Tr2TexturedSpriteObject)
@blue.interface()
export class Tr2Sprite2dFrame extends Tr2TexturedSpriteObject
{

  /** m_offset (int) [READWRITE, NOTIFY]: positive values make the frame smaller, negative bigger. */
  @be.mapAttribute(be.READWRITE | be.NOTIFY)

  @type.int32
  offset = 0;

  /** m_cornerSize (unsigned int) [READWRITE, NOTIFY]: size of the frame corner, in texels. */
  @be.mapAttribute(be.READWRITE | be.NOTIFY)

  @type.uint32
  cornerSize = 0;

  /** m_cornerScale (float) [READWRITE, NOTIFY]: corner scaling when rendering, for UI scaling. */
  @be.mapAttribute(be.READWRITE | be.NOTIFY)

  @type.float32
  cornerScale = 1;

  /** m_fillCenter (bool) [READWRITE, NOTIFY]: whether the centre piece is drawn. */
  @be.mapAttribute(be.READWRITE | be.NOTIFY)

  @type.boolean
  fillCenter = true;

  /** Carbon m_resPath: declared but never read or exposed by Tr2Sprite2dFrame.cpp. @type {string} */
  _resPath = "";

  /** Carbon m_saturation: not Blue-exposed on Frame (Tr2Sprite2dFrame_Blue.cpp). @type {number} */
  _saturation = 1;

  /** Carbon m_effectOpacity: not Blue-exposed on Frame (Tr2Sprite2dFrame_Blue.cpp). @type {number} */
  _effectOpacity = 1;

  /** Carbon m_vertices[16 * 3]: shadow, frame and glow segments. @type {Tr2Sprite2dD3DVertex[]} */
  _vertices = Array.from({ length: 16 * 3 }, () => new Tr2Sprite2dD3DVertex());

  /**
   * The three 16-vertex segments of `_vertices`, sharing its records. Carbon addresses them as
   * `&m_vertices[0]`, `[16]` and `[32]`; JS has no pointer arithmetic, so each segment is an
   * array view built once.
   * @type {Tr2Sprite2dD3DVertex[][]}
   */
  _vertexSegments = [0, 16, 32].map(start => this._vertices.slice(start, start + 16)); // alloc: three retained views over the vertex records

  /**
   * Carbon Tr2Sprite2dFrame::GatherSprites (Tr2Sprite2dFrame.cpp:84-179).
   *
   * Quirks reproduced:
   * - With an effect below TR2_SFX_ONE_TEXTURE and no primary texture, Carbon dereferences a
   *   null `m_texturePrimary` (cpp:107); this throws a TypeError at the same point (bug, CE-162).
   *
   * @param {Tr2Sprite2dScene} renderer Scene gathering this frame.
   * @returns {void}
   */
  @meta.implemented
  @blue.method
  GatherSprites(renderer)
  {
    if (!this.display) return;

    if (this.isDirty)
    {
      if (!this._ValidateAndSetTextures(renderer)) return;

      // Carbon: "don't support these atm".
      if (this.spriteEffect === Tr2SpriteObjectEffect.TR2_SFX_BLUR || this.spriteEffect === Tr2SpriteObjectEffect.TR2_SFX_GLOW) return;

      renderer.SetSpriteEffect(this.spriteEffect);
      renderer.SetTileMode(0);

      let srcWidth = this._texturePrimary.GetSrcWidth();
      let srcHeight = this._texturePrimary.GetSrcHeight();
      if (srcWidth === 0) srcWidth = this._texturePrimary.GetWidth();
      if (srcHeight === 0) srcHeight = this._texturePrimary.GetHeight();

      if (srcWidth < this.cornerSize * 2) return;
      if (srcHeight < this.cornerSize * 2) return;

      if (this.shadowOffset[0] !== 0 || this.shadowOffset[1] !== 0)
      {
        this._SetShadowRenderState(renderer);
        const source = srcVertexSegments[0];
        this._PrepareVertices(source, srcWidth, srcHeight, this.shadowOffset, [1, 1]);
        renderer.PrepareTriangleVerts(this._vertexSegments[0], source, vertexBaseStride, 16);
      }

      this._SetRegularRenderState(renderer);
      renderer.SetDepth(this.depth);
      const frame = srcVertexSegments[1];
      this._PrepareVertices(frame, srcWidth, srcHeight, [0, 0], [1, 1]);
      renderer.PrepareTriangleVerts(this._vertexSegments[1], frame, vertexBaseStride, 16);

      if (this.glowFactor !== 0 || this.glowExpand !== 0)
      {
        const offset2 = this.glowExpand + this.glowExpand;

        this._SetGlowRenderState(renderer);
        const glow = srcVertexSegments[2];
        this._PrepareVertices(glow, srcWidth, srcHeight, [-this.glowExpand, -this.glowExpand], [1 + offset2 / this.displayWidth, 1 + offset2 / this.displayHeight]);
        renderer.PrepareTriangleVerts(this._vertexSegments[2], glow, vertexBaseStride, 16);
      }

      if (this.spriteEffect < Tr2SpriteObjectEffect.TR2_SFX_TWO_TEXTURES && this.spriteEffect !== Tr2SpriteObjectEffect.TR2_SFX_BLUR && this.spriteEffect !== Tr2SpriteObjectEffect.TR2_SFX_GLOW)
      {
        for (const vertex of this._vertices)
        {
          vertex.texCoord[1][0] = this._saturation;
          vertex.texCoord[1][1] = this._effectOpacity;
        }
      }

      this.isDirty = false;
    }

    this._SetValidatedTextures(renderer);

    const triangleCount = this.fillCenter ? 18 : 16;
    const indexCount = triangleCount * 3;

    if (this.shadowOffset[0] !== 0 || this.shadowOffset[1] !== 0) renderer.RenderTriangleVerts(this._vertexSegments[0], 16, frameIndices, indexCount);
    renderer.RenderTriangleVerts(this._vertexSegments[1], 16, frameIndices, indexCount);
    if (this.glowFactor !== 0 || this.glowExpand !== 0) renderer.RenderTriangleVerts(this._vertexSegments[2], 16, frameIndices, indexCount);
  }

  /**
   * Carbon Tr2Sprite2dFrame::PickPoint (Tr2Sprite2dFrame.cpp:181-200): a rectangle test with
   * radius 0, then the optional picking mask in local space.
   *
   * @param {number} x Screen x.
   * @param {number} y Screen y.
   * @param {Tr2Sprite2dScene} renderer Scene supplying the active transform and clip.
   * @returns {Tr2Sprite2dFrame|null} This frame when hit, otherwise null.
   */
  @meta.implemented
  @blue.method
  PickPoint(x, y, renderer)
  {
    if (!this.display) return null;

    if (this.pickState === Tr2SpriteObjectPickState.TR2_SPS_ON)
    {
      const point = [x, y], translation = [this.displayX, this.displayY];
      if (renderer.IsInside(point, translation, this.displayWidth, this.displayHeight, 0))
      {
        if (!this.pickingMask || this.pickingMask.SampleMask(renderer.InverseTransformPoint(point), translation, this.displayWidth, this.displayHeight)) return this;
      }
    }

    return null;
  }

  /**
   * Carbon Tr2Sprite2dFrame::GetVertexCount (Tr2Sprite2dFrame.cpp:202-205): always three
   * segments, displayed or not.
   *
   * @returns {number} 48.
   */
  @meta.implemented
  @blue.method
  GetVertexCount()
  {
    return 16 * 3;
  }

  /**
   * Carbon Tr2Sprite2dFrame::PrepareVertices (Tr2Sprite2dFrame.cpp:207-411): writes the 4 x 4
   * vertex grid of the nine-slice frame. Carbon spells out all sixteen vertices; this walks the
   * same rows and columns with the same per-vertex expressions, in the same summation order.
   *
   * Column x: `offsetX`, `cs * scale.x + offsetX`, `offsetWidth - cs * scale.x + offsetX`,
   * `offsetWidth + offsetX`, each plus `vertOffset.x`; rows likewise in y. Both texture
   * coordinate sets get `0`, `cornerSize / srcWidth`, `1 - cornerSize / srcWidth`, `1` (and the
   * same in v); z is 0 and the colour is white.
   *
   * @param {Tr2Sprite2dVertexBase[]} v Sixteen destination vertices.
   * @param {number} srcWidth Source width in texels.
   * @param {number} srcHeight Source height in texels.
   * @param {ArrayLike<number>} vertOffset Offset added to every position.
   * @param {ArrayLike<number>} scale Scale applied to the frame extents.
   * @returns {void}
   */
  @meta.implemented
  @blue.method
  _PrepareVertices(v, srcWidth, srcHeight, vertOffset, scale)
  {
    const cs = Math.floor(0.5 + this.cornerScale * this.cornerSize);

    const texHorizontalCs = this.cornerSize / srcWidth;
    const texVerticalCs = this.cornerSize / srcHeight;

    const offset = this.offset;
    const offset_2 = offset * 2;

    const offsetWidth = this.displayWidth * scale[0] - offset_2 * scale[0];
    const offsetHeight = this.displayHeight * scale[1] - offset_2 * scale[1];

    const offsetX = offset * scale[0] + this.displayX;
    const offsetY = offset * scale[1] + this.displayY;

    const xs = [offsetX, cs * scale[0] + offsetX, offsetWidth - cs * scale[0] + offsetX, offsetWidth + offsetX];
    const ys = [offsetY, cs * scale[1] + offsetY, offsetHeight - cs * scale[1] + offsetY, offsetHeight + offsetY];
    const us = [0, texHorizontalCs, 1 - texHorizontalCs, 1];
    const vs = [0, texVerticalCs, 1 - texVerticalCs, 1];

    for (let row = 0; row < 4; row++)
    {
      for (let column = 0; column < 4; column++)
      {
        const vertex = v[row * 4 + column];
        vertex.position[0] = xs[column] + vertOffset[0];
        vertex.position[1] = ys[row] + vertOffset[1];
        vertex.position[2] = 0;
        vertex.texCoord[0][0] = us[column];
        vertex.texCoord[0][1] = vs[row];
        vertex.texCoord[1][0] = us[column];
        vertex.texCoord[1][1] = vs[row];
        vec4.copy(vertex.color, white);
      }
    }
  }

}
