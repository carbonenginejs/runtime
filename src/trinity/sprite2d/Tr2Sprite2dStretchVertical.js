// Source: trinity/trinity/Sprite2d/Tr2Sprite2dStretchVertical.h
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dStretchVertical.cpp
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dStretchVertical_Blue.cpp
// Promoted to hand-maintained source 2026-10-12 from the generated property shell.
import { meta, type, blue } from "#schema";
import { vec4 } from "#math/vec4";
import { Tr2SpriteObjectEffect, Tr2SpriteObjectPickState } from "../generated/sprite2d/enums.js";
import { Tr2Sprite2dD3DVertex } from "./Tr2Sprite2dD3DVertex.js";
import { Tr2Sprite2dVertexBase } from "./Tr2Sprite2dVertexBase.js";
import { Tr2TexturedSpriteObject } from "./Tr2TexturedSpriteObject.js";

/**
 * Carbon `s_frameIndices` (Tr2Sprite2dStretchVertical.cpp:11-33): top piece, bottom piece, then
 * the two centre triangles last so `fillCenter = false` can skip them.
 * @type {Uint16Array}
 */
const frameIndices = new Uint16Array([ // alloc: immutable module-level index table
  0, 2, 3, 0, 3, 1,
  4, 6, 7, 4, 7, 5,
  2, 4, 5, 2, 5, 3
]);

/** Carbon's local `const Color white( 1, 1, 1, 1 )` (Tr2Sprite2dStretchVertical.cpp:173). @type {Float32Array} */
const white = vec4.fromValues(1, 1, 1, 1); // alloc: immutable module-level colour

/**
 * Element stride handed to `Tr2Sprite2dScene.PrepareTriangleVerts`. Carbon passes
 * `sizeof( Tr2Sprite2dVertexBase )` bytes; JS arrays index whole vertex records, so one record is
 * one step.
 * @type {number}
 */
const vertexBaseStride = 1;

/**
 * Carbon's stack array `Tr2Sprite2dVertexBase vertices[8 * 3]` (Tr2Sprite2dStretchVertical.cpp:78).
 * Shared scratch: `PrepareTriangleVerts` copies it out synchronously, and `_PrepareVertices`
 * writes every field it reads.
 * @type {Tr2Sprite2dVertexBase[]}
 */
const srcVertices = Array.from({ length: 8 * 3 }, () => new Tr2Sprite2dVertexBase()); // alloc: module scratch reused by every stretch

/** The three 8-vertex segments of `srcVertices` (Carbon `&vertices[0]`, `[8]`, `[16]`). @type {Tr2Sprite2dVertexBase[][]} */
const srcVertexSegments = [0, 8, 16].map(start => srcVertices.slice(start, start + 8)); // alloc: module scratch views

/**
 * Writes one source vertex of the vertical stretch: z = 0, white, and the same UV in both
 * texture-coordinate sets, as each of Carbon's eight explicit vertex blocks does.
 *
 * @param {Tr2Sprite2dVertexBase} vertex Destination vertex.
 * @param {number} x Position x.
 * @param {number} y Position y.
 * @param {number} u Texture u.
 * @param {number} v Texture v.
 * @returns {void}
 */
function setVertex(vertex, x, y, u, v)
{
  vertex.position[0] = x;
  vertex.position[1] = y;
  vertex.position[2] = 0;
  vertex.texCoord[0][0] = u;
  vertex.texCoord[0][1] = v;
  vertex.texCoord[1][0] = u;
  vertex.texCoord[1][1] = v;
  vec4.copy(vertex.color, white);
}

/**
 * Tr2Sprite2dStretchVertical renders a sprite by cutting a texture into three vertical pieces and
 * stretching the centre piece to the display height (Tr2Sprite2dStretchVertical.h:14-20).
 * Vertices are local to the sprite; the translation is pushed on the scene while they are
 * submitted.
 */
@blue.define({ className: "Tr2Sprite2dStretchVertical", purpose: "Defines a vertically stretchable textured sprite with independent edge heights, center fill, offset and opacity." })
@blue.chainTo(Tr2TexturedSpriteObject)
export class Tr2Sprite2dStretchVertical extends Tr2TexturedSpriteObject
{

  /** m_topEdgeSize (unsigned int) [READWRITE, NOTIFY]: fixed pixels on the texture's top edge. */
  @blue.notify
  @blue.readwrite
  @type.uint32
  topEdgeSize = 0;

  /** m_bottomEdgeSize (unsigned int) [READWRITE, NOTIFY]: fixed pixels on the texture's bottom edge. */
  @blue.notify
  @blue.readwrite
  @type.uint32
  bottomEdgeSize = 0;

  /** m_edgeScale (float) [READWRITE, NOTIFY]: edge scaling when rendering, for UI scaling. */
  @blue.notify
  @blue.readwrite
  @type.float32
  edgeScale = 1;

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
   * Carbon m_offset (int): declared and read by `PrepareVertices` but not Blue-exposed
   * (Tr2Sprite2dStretchVertical_Blue.cpp), so it stays at Carbon's constructor value 0.
   * @type {number}
   */
  _offset = 0;

  /** Carbon m_resPath: declared but never read or exposed by Tr2Sprite2dStretchVertical.cpp. @type {string} */
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

  /**
   * Carbon Tr2Sprite2dStretchVertical::GatherSprites (Tr2Sprite2dStretchVertical.cpp:49-129).
   *
   * Unlike Tr2Sprite2dStretch it neither checks the edge sizes against the source height nor
   * calls `SetDepth`, and it sets the regular render state only after the shadow.
   *
   * Quirks reproduced:
   * - With an effect below TR2_SFX_ONE_TEXTURE and no primary texture, Carbon dereferences a
   *   null `m_texturePrimary` (cpp:72); this throws a TypeError at the same point (bug, CE-162).
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

      let srcHeight = this._texturePrimary.GetSrcHeight();
      if (srcHeight === 0) srcHeight = this._texturePrimary.GetHeight();

      if (this.shadowOffset[0] !== 0 || this.shadowOffset[1] !== 0)
      {
        this._SetShadowRenderState(renderer);
        this._PrepareVertices(srcVertexSegments[0], srcHeight, this.shadowOffset, [1, 1]);
        renderer.PrepareTriangleVerts(this._vertexSegments[0], srcVertexSegments[0], vertexBaseStride, 8);
      }

      this._SetRegularRenderState(renderer);
      this._PrepareVertices(srcVertexSegments[1], srcHeight, [0, 0], [1, 1]);
      renderer.PrepareTriangleVerts(this._vertexSegments[1], srcVertexSegments[1], vertexBaseStride, 8);

      if (this.glowFactor !== 0 || this.glowExpand !== 0)
      {
        const offset2 = this.glowExpand + this.glowExpand;

        this._SetGlowRenderState(renderer);
        this._PrepareVertices(srcVertexSegments[2], srcHeight, [-this.glowExpand, -this.glowExpand], [1 + offset2 / this.displayWidth, 1 + offset2 / this.displayHeight]);
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
   * Carbon Tr2Sprite2dStretchVertical::PickPoint (Tr2Sprite2dStretchVertical.cpp:131-150):
   * without a picking mask the hit test uses radius -1, the scene's inscribed-ellipse test; with a
   * mask, the rectangle and then the mask.
   *
   * @param {number} x Screen x.
   * @param {number} y Screen y.
   * @param {Tr2Sprite2dScene} renderer Scene supplying the active transform and clip.
   * @returns {Tr2Sprite2dStretchVertical|null} This sprite when hit, otherwise null.
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
   * Carbon Tr2Sprite2dStretchVertical::GetVertexCount (Tr2Sprite2dStretchVertical.cpp:152-160).
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
   * Carbon Tr2Sprite2dStretchVertical::PrepareVertices (Tr2Sprite2dStretchVertical.cpp:162-272):
   * eight local vertices, two per row, written in Carbon's order with Carbon's expressions.
   *
   * Unreachable: `m_offset` is only ever 0. With a non-zero `m_offset`, Carbon would not be the transpose of
   * Tr2Sprite2dStretch. Vertex 1 takes y = 0 where vertex 0 takes `offsetY` (cpp:190), vertices 6
   * and 7 omit `offsetY` (cpp:254, 265), and no vertex is shifted in x, although the header says
   * the sprite is shifted horizontally (Tr2Sprite2dStretchVertical.h:54-55). Carbon's expressions are
   * kept as written.
   *
   * @param {Tr2Sprite2dVertexBase[]} v Eight destination vertices.
   * @param {number} srcHeight Source height in texels.
   * @param {ArrayLike<number>} vertOffset Offset added to every position.
   * @param {ArrayLike<number>} scale Scale applied to the sprite extents.
   * @returns {void}
   */
  @meta.implemented
  _PrepareVertices(v, srcHeight, vertOffset, scale)
  {
    const topEdgeSize = this.topEdgeSize;
    const bottomEdgeSize = this.bottomEdgeSize;

    const offset = this._offset;

    const scaledWidth = this.displayWidth * scale[0] - offset * scale[0];
    const scaledHeight = this.displayHeight * scale[1] - offset * 2 * scale[1];
    const offsetY = offset * scale[1];

    const topY = offsetY + topEdgeSize * this.edgeScale * scale[1] + vertOffset[1];
    const bottomY = offsetY + scaledHeight - bottomEdgeSize * this.edgeScale * scale[1] + vertOffset[1];
    const topV = topEdgeSize / srcHeight;
    const bottomV = 1 - bottomEdgeSize / srcHeight;

    setVertex(v[0], 0 + vertOffset[0], offsetY + vertOffset[1], 0, 0);
    setVertex(v[1], scaledWidth + vertOffset[0], 0 + vertOffset[1], 1, 0);

    setVertex(v[2], 0 + vertOffset[0], topY, 0, topV);
    setVertex(v[3], scaledWidth + vertOffset[0], topY, 1, topV);

    setVertex(v[4], 0 + vertOffset[0], bottomY, 0, bottomV);
    setVertex(v[5], scaledWidth + vertOffset[0], bottomY, 1, bottomV);

    setVertex(v[6], 0 + vertOffset[0], scaledHeight + vertOffset[1], 0, 1);
    setVertex(v[7], scaledWidth + vertOffset[0], scaledHeight + vertOffset[1], 1, 1);
  }

}
