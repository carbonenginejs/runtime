// Source: trinity/trinity/Sprite2d/Tr2Sprite2dStretch.h
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dStretch.cpp
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dStretch_Blue.cpp
// Promoted to hand-maintained source 2026-10-12 from the generated property shell.
import { meta, type, blue } from "#schema";
import { vec4 } from "#math/vec4";
import { Tr2SpriteObjectEffect, Tr2SpriteObjectPickState, Tr2StretchScaleBehavior } from "../generated/sprite2d/enums.js";
import { Tr2Sprite2dD3DVertex } from "./Tr2Sprite2dD3DVertex.js";
import { Tr2Sprite2dVertexBase } from "./Tr2Sprite2dVertexBase.js";
import { Tr2TexturedSpriteObject } from "./Tr2TexturedSpriteObject.js";

/**
 * Carbon `s_frameIndices` (Tr2Sprite2dStretch.cpp:11-33): left piece, right piece, then the two
 * centre triangles last so `fillCenter = false` can skip them.
 * @type {Uint16Array}
 */
const frameIndices = new Uint16Array([ // alloc: immutable module-level index table
  0, 4, 5, 0, 5, 1,
  2, 6, 7, 2, 7, 3,
  1, 5, 6, 1, 6, 2
]);

/** Carbon's local `const Color white( 1, 1, 1, 1 )` (Tr2Sprite2dStretch.cpp:186). @type {Float32Array} */
const white = vec4.fromValues(1, 1, 1, 1); // alloc: immutable module-level colour

/**
 * Element stride handed to `Tr2Sprite2dScene.PrepareTriangleVerts`. Carbon passes
 * `sizeof( Tr2Sprite2dVertexBase )` bytes; JS arrays index whole vertex records, so one record is
 * one step.
 * @type {number}
 */
const vertexBaseStride = 1;

/**
 * Carbon's stack array `Tr2Sprite2dVertexBase vertices[8 * 3]` (Tr2Sprite2dStretch.cpp:87).
 * Shared scratch: `PrepareTriangleVerts` copies it out synchronously, and `_PrepareVertices`
 * writes every field it reads.
 * @type {Tr2Sprite2dVertexBase[]}
 */
const srcVertices = Array.from({ length: 8 * 3 }, () => new Tr2Sprite2dVertexBase()); // alloc: module scratch reused by every stretch

/** The three 8-vertex segments of `srcVertices` (Carbon `&vertices[0]`, `[8]`, `[16]`). @type {Tr2Sprite2dVertexBase[][]} */
const srcVertexSegments = [0, 8, 16].map(start => srcVertices.slice(start, start + 8)); // alloc: module scratch views

/**
 * Tr2Sprite2dStretch renders a sprite by cutting a texture into three horizontal pieces and
 * stretching the centre piece to the display width (Tr2Sprite2dStretch.h:21-27). Vertices are
 * local to the sprite; the translation is pushed on the scene while they are submitted.
 */
@blue.define({ className: "Tr2Sprite2dStretch", purpose: "Defines a horizontally stretchable textured sprite with independent edge widths, center fill, offset, opacity, and DPI scaling." })
@blue.chainTo(Tr2TexturedSpriteObject)
export class Tr2Sprite2dStretch extends Tr2TexturedSpriteObject
{

  /** m_leftEdgeSize (unsigned int) [READWRITE, NOTIFY]: fixed pixels on the texture's left edge. */
  @blue.notify
  @blue.readwrite
  @type.uint32
  leftEdgeSize = 0;

  /** m_rightEdgeSize (unsigned int) [READWRITE, NOTIFY]: fixed pixels on the texture's right edge. */
  @blue.notify
  @blue.readwrite
  @type.uint32
  rightEdgeSize = 0;

  /** m_edgeScale (float) [READWRITE, NOTIFY]: edge scaling when rendering, for UI scaling. */
  @blue.notify
  @blue.readwrite
  @type.float32
  edgeScale = 1;

  /** m_offset (int) [READWRITE, NOTIFY]: shrinks the sprite horizontally and shifts it down. */
  @blue.notify
  @blue.readwrite
  @type.int32
  offset = 0;

  /** m_fillCenter (bool) [READWRITE, NOTIFY]: whether the centre piece is drawn. */
  @blue.notify
  @blue.readwrite
  @type.boolean
  fillCenter = true;

  /** m_saturation (float) [READWRITE, NOTIFY]: used by TR2_SFX_COLOROVERLAY and TR2_SFX_SOFTLIGHT. */
  @blue.notify
  @blue.readwrite
  @type.float32
  saturation = 1;

  /** m_effectOpacity (float) [READWRITE, NOTIFY]: used by TR2_SFX_COLOROVERLAY and TR2_SFX_SOFTLIGHT. */
  @blue.notify
  @blue.readwrite
  @type.float32
  effectOpacity = 1;

  /**
   * m_dpiScaleBehavior (Tr2StretchScaleBehavior) [READWRITE, PERSIST, ENUM]. Carbon stores and
   * exposes it but no Tr2Sprite2dStretch code reads it.
   */
  @blue.readwrite
  @blue.persist
  @type.int32
  @type.enum("Tr2StretchScaleBehavior")
  dpiScaleBehavior = Tr2StretchScaleBehavior.S2D_SSC_ALIGN_BOTTOMRIGHT;

  /** Carbon m_resPath: declared but never read or exposed by Tr2Sprite2dStretch.cpp. @type {string} */
  _resPath = "";

  /** Carbon m_vertices[8 * 3]: shadow, stretch and glow segments. @type {Tr2Sprite2dD3DVertex[]} */
  _vertices = Array.from({ length: 8 * 3 }, () => new Tr2Sprite2dD3DVertex());

  /**
   * The three 8-vertex segments of `_vertices`, sharing its records. Carbon addresses them as
   * `&m_vertices[0]`, `[8]` and `[16]`; JS has no pointer arithmetic, so each segment is an
   * array view built once.
   * @type {Tr2Sprite2dD3DVertex[][]}
   */
  _vertexSegments = [0, 8, 16].map(start => this._vertices.slice(start, start + 8)); // alloc: three retained views over the vertex records

  /** Class view of the Carbon enum declared beside this class (Tr2Sprite2dStretch.h:14-19). */
  static Tr2StretchScaleBehavior = Tr2StretchScaleBehavior;

  /**
   * Carbon Tr2Sprite2dStretch::GatherSprites (Tr2Sprite2dStretch.cpp:50-138).
   *
   * Quirks reproduced:
   * - With an effect below TR2_SFX_ONE_TEXTURE and no primary texture, Carbon dereferences a
   *   null `m_texturePrimary` (cpp:73); this throws a TypeError at the same point (bug, CE-162).
   *
   * @param {Tr2Sprite2dScene} renderer Scene gathering this sprite.
   * @returns {void}
   */
  @meta.implemented
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
      if (srcWidth === 0) srcWidth = this._texturePrimary.GetWidth();

      if (srcWidth < this.leftEdgeSize + this.rightEdgeSize) return;

      this._SetRegularRenderState(renderer);
      renderer.SetDepth(this.depth);

      if (this.shadowOffset[0] !== 0 || this.shadowOffset[1] !== 0)
      {
        this._SetShadowRenderState(renderer);
        this._PrepareVertices(srcVertexSegments[0], srcWidth, this.shadowOffset, [1, 1]);
        renderer.PrepareTriangleVerts(this._vertexSegments[0], srcVertexSegments[0], vertexBaseStride, 8);
      }

      this._SetRegularRenderState(renderer);
      this._PrepareVertices(srcVertexSegments[1], srcWidth, [0, 0], [1, 1]);
      renderer.PrepareTriangleVerts(this._vertexSegments[1], srcVertexSegments[1], vertexBaseStride, 8);

      if (this.glowFactor !== 0 || this.glowExpand !== 0)
      {
        const offset2 = this.glowExpand + this.glowExpand;

        this._SetGlowRenderState(renderer);
        this._PrepareVertices(srcVertexSegments[2], srcWidth, [-this.glowExpand, -this.glowExpand], [1 + offset2 / (this.displayWidth - this.offset * 2), 1 + offset2 / (this.displayHeight - this.offset)]);
        renderer.PrepareTriangleVerts(this._vertexSegments[2], srcVertexSegments[2], vertexBaseStride, 8);
      }

      if (this.spriteEffect < Tr2SpriteObjectEffect.TR2_SFX_TWO_TEXTURES && this.spriteEffect !== Tr2SpriteObjectEffect.TR2_SFX_BLUR && this.spriteEffect !== Tr2SpriteObjectEffect.TR2_SFX_GLOW)
      {
        for (const vertex of this._vertices)
        {
          vertex.texCoord[1][0] = this.saturation;
          vertex.texCoord[1][1] = this.effectOpacity;
        }
      }

      this.isDirty = false;
    }

    this._SetValidatedTextures(renderer);

    renderer.PushTranslation([this.displayX, this.displayY]);

    const triangleCount = this.fillCenter ? 6 : 4;
    const indexCount = triangleCount * 3;
    if (this.shadowOffset[0] !== 0 || this.shadowOffset[1] !== 0) renderer.RenderTriangleVerts(this._vertexSegments[0], 8, frameIndices, indexCount);
    renderer.RenderTriangleVerts(this._vertexSegments[1], 8, frameIndices, indexCount);
    if (this.glowFactor !== 0 || this.glowExpand !== 0) renderer.RenderTriangleVerts(this._vertexSegments[2], 8, frameIndices, indexCount);

    renderer.PopTranslation();
  }

  /**
   * Carbon Tr2Sprite2dStretch::PickPoint (Tr2Sprite2dStretch.cpp:140-159): without a picking mask
   * the hit test uses radius -1, the scene's inscribed-ellipse test; with a mask, the rectangle
   * and then the mask.
   *
   * @param {number} x Screen x.
   * @param {number} y Screen y.
   * @param {Tr2Sprite2dScene} renderer Scene supplying the active transform and clip.
   * @returns {Tr2Sprite2dStretch|null} This sprite when hit, otherwise null.
   */
  @meta.implemented
  PickPoint(x, y, renderer)
  {
    if (!this.display) return null;

    if (this.pickState === Tr2SpriteObjectPickState.TR2_SPS_ON)
    {
      const point = [x, y], translation = [this.displayX, this.displayY];
      if (renderer.IsInside(point, translation, this.displayWidth, this.displayHeight, this.pickingMask ? 0 : -1))
      {
        if (!this.pickingMask || this.pickingMask.SampleMask(renderer.InverseTransformPoint(point), translation, this.displayWidth, this.displayHeight)) return this;
      }
    }

    return null;
  }

  /**
   * Carbon Tr2Sprite2dStretch::GetVertexCount (Tr2Sprite2dStretch.cpp:161-169).
   *
   * @returns {number} 0 when hidden, otherwise 24.
   */
  @meta.implemented
  GetVertexCount()
  {
    if (!this.display) return 0;

    return 8 * 3;
  }

  /**
   * Carbon Tr2Sprite2dStretch::PrepareVertices (Tr2Sprite2dStretch.cpp:171-280): writes the
   * 2 x 4 vertex grid in local coordinates. Carbon spells out all eight vertices; this walks the
   * same rows and columns with the same per-vertex expressions, in the same summation order.
   *
   * Columns: `offsetX`, `offsetX + leftEdgeSize * edgeScale * scale.x`,
   * `offsetX + scaledWidth - rightEdgeSize * edgeScale * scale.x`, `offsetX + scaledWidth`; rows:
   * `offsetY` and `scaledHeight + offsetY`, where `scaledWidth = displayWidth * scale.x -
   * 2 * offset * scale.x` but `scaledHeight = displayHeight * scale.y - offset * scale.y`. u is
   * `0`, `leftEdgeSize / srcWidth`, `1 - rightEdgeSize / srcWidth`, `1`; v is 0 or 1.
   *
   * @param {Tr2Sprite2dVertexBase[]} v Eight destination vertices.
   * @param {number} srcWidth Source width in texels.
   * @param {ArrayLike<number>} vertOffset Offset added to every position.
   * @param {ArrayLike<number>} scale Scale applied to the sprite extents.
   * @returns {void}
   */
  @meta.implemented
  _PrepareVertices(v, srcWidth, vertOffset, scale)
  {
    const leftEdgeSize = this.leftEdgeSize;
    const rightEdgeSize = this.rightEdgeSize;

    const offset = this.offset;
    const offset_2 = offset * 2;

    const scaledWidth = this.displayWidth * scale[0] - offset_2 * scale[0];
    const scaledHeight = this.displayHeight * scale[1] - offset * scale[1];
    const offsetX = offset * scale[0];
    const offsetY = offset * scale[1];

    const y1 = scaledHeight + offsetY;

    const xs = [offsetX, offsetX + leftEdgeSize * this.edgeScale * scale[0], offsetX + scaledWidth - rightEdgeSize * this.edgeScale * scale[0], offsetX + scaledWidth];
    const ys = [offsetY, y1];
    const us = [0, leftEdgeSize / srcWidth, 1 - rightEdgeSize / srcWidth, 1];
    const vs = [0, 1];

    for (let row = 0; row < 2; row++)
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
