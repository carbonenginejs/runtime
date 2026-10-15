// Source: trinity/trinity/Sprite2d/Tr2Sprite2dArc.h
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dArc.cpp
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dArc_Blue.cpp
// Promoted to hand-maintained source 2026-10-12 from the generated property shell.
import { meta, type, blue } from "#schema";
import { vec2 } from "#math/vec2";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { Tr2SpriteObjectEffect } from "../generated/sprite2d/enums.js";
import { Tr2Sprite2dD3DVertex } from "./Tr2Sprite2dD3DVertex.js";
import { Tr2Sprite2dVertexBase } from "./Tr2Sprite2dVertexBase.js";
import { Tr2SpriteObject } from "./Tr2SpriteObject.js";

/**
 * Element stride handed to `Tr2Sprite2dScene.PrepareTriangleVerts`. Carbon passes
 * `sizeof( Tr2Sprite2dVertexBase )` bytes; JS arrays index whole vertex records, so one record is
 * one step.
 * @type {number}
 */
const vertexBaseStride = 1;

/**
 * Carbon's stack array `Tr2Sprite2dVertexBase verts[2]` for the outline (Tr2Sprite2dArc.cpp:138).
 * Shared scratch: `PrepareTriangleVerts` copies it out synchronously.
 * @type {Tr2Sprite2dVertexBase[]}
 */
const lineVerts = Array.from({ length: 2 }, () => new Tr2Sprite2dVertexBase()); // alloc: module scratch reused by every arc

/**
 * Two-record destination window standing in for Carbon's `m_renderVertices + m_renderVertexCount`
 * (Tr2Sprite2dArc.cpp:161). JS has no pointer arithmetic; the window is refilled per step.
 * @type {Tr2Sprite2dD3DVertex[]}
 */
const lineDestination = [null, null]; // alloc: module scratch reused by every arc

/**
 * Carbon's `(unsigned int)arcLength / 4` (Tr2Sprite2dArc.cpp:32, 119, 200): truncate, then
 * integer division.
 *
 * Adapted: converting a negative float to `unsigned int` is undefined behaviour in C++, so a
 * negative radius has no defined Carbon result to reproduce. JS has no such conversion; the port
 * truncates toward zero and clamps at 0, which gives a single step.
 *
 * @param {number} arcLength Arc length in pixels.
 * @returns {number} The number of 4-pixel steps.
 */
function stepCount(arcLength)
{
  return Math.floor(Math.max(0, Math.trunc(arcLength)) / 4);
}

/**
 * Zeroes both texture-coordinate sets of an outline source vertex. Carbon leaves them
 * indeterminate on non-anti-aliased vertices (Tr2Sprite2dArc.cpp:141); see `GatherSprites`.
 *
 * @param {Tr2Sprite2dVertexBase} vertex Source vertex.
 * @returns {void}
 */
function clearTexCoords(vertex)
{
  vec2.set(vertex.texCoord[0], 0, 0);
  vec2.set(vertex.texCoord[1], 0, 0);
}

/**
 * Appends one triangle, narrowing each index to `unsigned short` as Carbon's
 * `TrackableStdVector<unsigned short>::push_back` does (Tr2Sprite2dArc.h:36).
 *
 * @param {number[]} indices Arc index list.
 * @param {number} i0 First index.
 * @param {number} i1 Second index.
 * @param {number} i2 Third index.
 * @returns {void}
 */
function pushTriangle(indices, i0, i1, i2)
{
  indices.push(i0 & 0xFFFF, i1 & 0xFFFF, i2 & 0xFFFF);
}

/**
 * One anti-aliasing edge quad of the fill, along the radius at `angle`. Carbon writes the same
 * block twice, for `m_startAngle` (Tr2Sprite2dArc.cpp:236-291) and `m_endAngle` (cpp:292-347):
 * 1.5 pixels either side of the radius plus a 2-pixel AA border, from the centre to
 * `innerRadius - 2`, with indices 0,1,3 and 3,1,2.
 *
 * @param {Tr2Sprite2dArc} arc The arc being gathered.
 * @param {Tr2Sprite2dVertexBase[]} verts Fill source vertices.
 * @param {number} current Index of the next free source vertex.
 * @param {number} angle Carbon's unadjusted `m_startAngle` or `m_endAngle`.
 * @param {number} innerRadius The anti-aliased fill radius.
 * @returns {number} The index after the four vertices written.
 */
function prepareEdgeQuad(arc, verts, current, angle, innerRadius)
{
  const fromX = arc.displayX, fromY = arc.displayY;
  const toX = Math.cos(angle) * (innerRadius - 2) + arc.displayX;
  const toY = Math.sin(angle) * (innerRadius - 2) + arc.displayY;

  // Normalize( from - to ): Carbon's Vector2 Normalize leaves a zero vector at zero.
  let dx = fromX - toX, dy = fromY - toY;
  const length = Math.sqrt(dx * dx + dy * dy);
  const inverseLength = length ? 1 / length : 0;
  dx *= inverseLength;
  dy *= inverseLength;

  // Rotate 90 degrees.
  const normalX = dy, normalY = -dx;

  const halfWidth = 1.5;

  const aaOffsetX = normalX * 2, aaOffsetY = normalY * 2;
  const pixelWidthInTexels = 1 / (1 + 4);

  const corners = [
    [fromX - normalX * halfWidth - aaOffsetX, fromY - normalY * halfWidth - aaOffsetY, -pixelWidthInTexels],
    [fromX + normalX * halfWidth + aaOffsetX, fromY + normalY * halfWidth + aaOffsetY, 1 + pixelWidthInTexels],
    [toX + normalX * halfWidth + aaOffsetX, toY + normalY * halfWidth + aaOffsetY, 1 + pixelWidthInTexels],
    [toX - normalX * halfWidth - aaOffsetX, toY - normalY * halfWidth - aaOffsetY, -pixelWidthInTexels]
  ]; // alloc: dirty-path corner table
  for (const [x, y, u] of corners)
  {
    const v = verts[current++];
    vec3.set(v.position, x, y, arc.depth);
    vec4.copy(v.color, arc.color);
    vec2.set(v.texCoord[1], u, 1);
  }

  const n = arc._renderVertexCount;
  pushTriangle(arc._renderIndices, 0 + n, 1 + n, 3 + n);
  pushTriangle(arc._renderIndices, 3 + n, 1 + n, 2 + n);

  arc._renderVertexCount += 4;

  return current;
}

/**
 * Tr2Sprite2dArc draws a circular arc around its translation: an outline of `lineWidth`, a filled
 * pie, or both. Carbon builds the vertices only when dirty, in a heap buffer sized by
 * `GetVertexCount`, and draws them with its own index list.
 */
@blue.define({ className: "Tr2Sprite2dArc", purpose: "Defines a filled or outlined 2D arc with angular span, radius, colors, widths, and primary and secondary textures." })
@blue.chainTo(Tr2SpriteObject)
@blue.interface()
export class Tr2Sprite2dArc extends Tr2SpriteObject
{

  /** m_radius (float) [READWRITE, NOTIFY]. */
  @blue.notify
  @blue.readwrite
  @type.float32
  radius = 0;

  /** m_lineWidth (float) [READWRITE, NOTIFY]: width of the outline; 0 or less draws none. */
  @blue.notify
  @blue.readwrite
  @type.float32
  lineWidth = 1;

  /** m_lineColor (Color) [READWRITE, NOTIFY]: colour of the outline. */
  @blue.notify
  @blue.readwrite
  @type.color
  lineColor = vec4.fromValues(1, 1, 1, 1);

  /** m_startAngle (float) [READWRITE, NOTIFY]: start angle in radians. */
  @blue.notify
  @blue.readwrite
  @type.float32
  startAngle = 0;

  /** m_endAngle (float) [READWRITE, NOTIFY]: end angle in radians. */
  @blue.notify
  @blue.readwrite
  @type.float32
  endAngle = 0;

  /** m_fill (bool) [READWRITE, NOTIFY]: whether the arc is filled; otherwise only the line is drawn. */
  @blue.notify
  @blue.readwrite
  @type.boolean
  fill = false;

  /** m_texturePrimary (ITr2Sprite2dTexturePtr) [READWRITE, NOTIFY]. */
  @blue.notify
  @blue.readwrite
  @type.rootRef("ITr2Sprite2dTexture")
  texturePrimary = null;

  /** m_textureSecondary (ITr2Sprite2dTexturePtr) [READWRITE, NOTIFY]. */
  @blue.notify
  @blue.readwrite
  @type.rootRef("ITr2Sprite2dTexture")
  textureSecondary = null;

  /** Carbon m_renderVertices: prepared vertices, or null when cleared. @type {Tr2Sprite2dD3DVertex[]|null} */
  _renderVertices = null;

  /** Carbon m_renderVertexCapacity. @type {number} */
  _renderVertexCapacity = 0;

  /** Carbon m_renderVertexCount. @type {number} */
  _renderVertexCount = 0;

  /** Carbon m_renderIndices (TrackableStdVector<unsigned short>). @type {number[]} */
  _renderIndices = [];

  /**
   * Carbon Tr2Sprite2dArc::GetVertexCount (Tr2Sprite2dArc.cpp:27-47): two vertices per step for
   * the outline, and for the fill the centre, one per step and eight anti-aliasing vertices
   * (reserved whether or not the effect is anti-aliased).
   *
   * Adapted: a negative arc length (negative radius) is clamped to zero steps; see `stepCount`.
   *
   * @returns {number} The vertex capacity the next dirty gather allocates.
   */
  @meta.adapted
  @blue.method
  GetVertexCount()
  {
    let numVerts = 0;

    const arcLength = (this.endAngle - this.startAngle) * this.radius;
    const numSteps = stepCount(arcLength);
    if (this.lineWidth > 0) numVerts += numSteps * 2 + 2;

    if (this.fill)
    {
      numVerts += 1 + numSteps + 1;

      // Add room for anti-aliasing.
      numVerts += 8;
    }

    return numVerts;
  }

  /**
   * Carbon Tr2Sprite2dArc::GatherSprites (Tr2Sprite2dArc.cpp:49-391).
   *
   * The outline is a strip of quads, two vertices per 4-pixel step. The fill is a fan around the
   * centre; TR2_SFX_FILL_AA pulls it in by 2 pixels and adds two anti-aliased edge quads along
   * the start and end radii.
   *
   * Adapted: Carbon never sets texture coordinates on the non-anti-aliased vertices
   * (`// TODO: UV coordinates`, cpp:141, 352). The outline's vertices are built on the stack and
   * zero-construct, so theirs are (0, 0) in Carbon too; only the fill's CCP_MALLOC'd vertices
   * (cpp:212-214) hold indeterminate heap memory (bug, CE-156). JS cannot reproduce indeterminate
   * memory, so they are 0.
   *
   * Quirks reproduced:
   * - Textures are applied only on a dirty gather; a clean gather draws with whatever textures
   *   the scene last bound (cpp:66-100) (bug, CE-163).
   * - Fill vertices take `m_color` and `PrepareTriangleVerts` multiplies by the scene colour,
   *   which `SetRegularRenderState` also set to `m_color`, so the fill is drawn in `color * color`
   *   (cpp:225, Tr2Sprite2dScene.cpp:925-998) (quirk, CE-164).
   * - Indices are stored as `unsigned short` and their count is narrowed to `unsigned short`
   *   (cpp:390) (quirk, CE-165).
   *
   * @param {Tr2Sprite2dScene} renderer Scene gathering this arc.
   * @returns {void}
   */
  @meta.adapted
  @blue.method
  GatherSprites(renderer)
  {
    const effects = Tr2SpriteObjectEffect;

    if (!this.display || this.spriteEffect === effects.TR2_SFX_NONE || this.radius === 0 || this.startAngle >= this.endAngle)
    {
      if (this._renderVertices) this._ClearVertices();
      return;
    }

    if (this.isDirty)
    {
      this._ClearVertices();

      if (this.spriteEffect >= effects.TR2_SFX_ONE_TEXTURE)
      {
        // Don't draw if no texture is set, or it is still loading (or failed).
        if (!this.texturePrimary || !this.texturePrimary.IsGood()) return;
        this.texturePrimary.Apply(renderer, 0);

        if (this.spriteEffect >= effects.TR2_SFX_TWO_TEXTURES)
        {
          if (!this.textureSecondary || !this.textureSecondary.IsGood()) return;
          this.textureSecondary.Apply(renderer, 1);
        }
      }

      // Anti-aliased lines use a larger quad; the pixel shader turns the extra pixels into alpha.
      const isAA = this.spriteEffect === effects.TR2_SFX_FILL_AA;
      renderer.SetSpriteEffect(this.spriteEffect);
      renderer.SetTileMode(0);

      this._SetRegularRenderState(renderer);

      this._renderVertexCapacity = this.GetVertexCount();
      this._renderVertices = Array.from({ length: this._renderVertexCapacity }, () => new Tr2Sprite2dD3DVertex()); // alloc: Carbon CCP_MALLOC on the dirty path
      this._renderVertexCount = 0;

      let arcLength = (this.endAngle - this.startAngle) * this.radius;
      let numSteps = stepCount(arcLength);
      let stepSize = (this.endAngle - this.startAngle) / numSteps;
      ++numSteps;

      if (this.lineWidth > 0)
      {
        const halfWidth = this.lineWidth * 0.5;
        let outerRadius = this.radius + halfWidth;
        let innerRadius = this.radius - halfWidth;
        let pixelWidthInTexels = 0;
        if (isAA)
        {
          innerRadius -= 2;
          outerRadius += 2;
          pixelWidthInTexels = 1 / (this.lineWidth + 4);
        }

        const [v0, v1] = lineVerts;
        clearTexCoords(v0);
        clearTexCoords(v1);

        let a = this.startAngle;
        for (let i = 0; i < numSteps; ++i)
        {
          vec3.set(v0.position, Math.cos(a) * outerRadius + this.displayX, Math.sin(a) * outerRadius + this.displayY, this.depth);
          vec4.copy(v0.color, this.lineColor);

          vec3.set(v1.position, Math.cos(a) * innerRadius + this.displayX, Math.sin(a) * innerRadius + this.displayY, this.depth);
          vec4.copy(v1.color, this.lineColor);

          if (isAA)
          {
            vec2.set(v0.texCoord[1], 1 + pixelWidthInTexels, this.lineWidth);
            vec2.set(v1.texCoord[1], -pixelWidthInTexels, this.lineWidth);
          }

          lineDestination[0] = this._renderVertices[this._renderVertexCount];
          lineDestination[1] = this._renderVertices[this._renderVertexCount + 1];
          renderer.PrepareTriangleVerts(lineDestination, lineVerts, vertexBaseStride, 2);

          if (i < numSteps - 1)
          {
            const n = this._renderVertexCount;
            pushTriangle(this._renderIndices, 0 + n, 1 + n, 2 + n);
            pushTriangle(this._renderIndices, 2 + n, 3 + n, 1 + n);
          }

          this._renderVertexCount += 2;
          a += stepSize;
        }

        lineDestination[0] = lineDestination[1] = null;
      }

      if (this.fill)
      {
        const halfWidth = this.lineWidth * 0.5;
        let innerRadius = this.radius - halfWidth;

        let startAngle = this.startAngle;
        let endAngle = this.endAngle;

        let pixelWidthInTexels = 0;
        if (isAA)
        {
          innerRadius += 2;
          pixelWidthInTexels = 1 / (innerRadius + 4);

          const angleDelta = 0.5 / this.radius;
          startAngle += angleDelta * 0.5;
          endAngle -= angleDelta * 0.5;
          arcLength = (endAngle - startAngle) * this.radius;
          numSteps = stepCount(arcLength);
          stepSize = (endAngle - startAngle) / numSteps;
          ++numSteps;
        }

        let fillVertCount = 1 + numSteps;
        if (isAA) fillVertCount += 8;
        const verts = Array.from({ length: fillVertCount }, () => new Tr2Sprite2dVertexBase()); // alloc: Carbon CCP_MALLOC on the dirty path

        const centerPointIx = this._renderVertexCount;
        let current = 0;

        // Centre point.
        const center = verts[current++];
        vec3.set(center.position, this.displayX, this.displayY, this.depth);
        vec4.copy(center.color, this.color);
        if (isAA) vec2.set(center.texCoord[1], 0, this.radius - halfWidth);
        this._renderVertexCount += 1;

        if (isAA)
        {
          current = prepareEdgeQuad(this, verts, current, this.startAngle, innerRadius);
          current = prepareEdgeQuad(this, verts, current, this.endAngle, innerRadius);
        }

        let a = startAngle;
        for (let i = 0; i < numSteps; ++i)
        {
          const v = verts[current++];
          vec3.set(v.position, Math.cos(a) * innerRadius + this.displayX, Math.sin(a) * innerRadius + this.displayY, this.depth);
          vec4.copy(v.color, this.color);
          if (isAA) vec2.set(v.texCoord[1], 1 + pixelWidthInTexels, this.radius - halfWidth);

          if (i > 0) pushTriangle(this._renderIndices, -1 + this._renderVertexCount, 0 + this._renderVertexCount, centerPointIx);

          this._renderVertexCount += 1;
          a += stepSize;
        }

        renderer.PrepareTriangleVerts(this._renderVertices.slice(centerPointIx), verts, vertexBaseStride, fillVertCount); // alloc: dirty-path view standing in for m_renderVertices + centerPointIx
      }

      this.isDirty = false;
    }

    renderer.RenderTriangleVerts(this._renderVertices, this._renderVertexCount, this._renderIndices, this._renderIndices.length & 0xFFFF);
  }

  /**
   * Carbon Tr2Sprite2dArc::PickPoint (Tr2Sprite2dArc.cpp:393-396): arcs are never picked.
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
   * Carbon Tr2Sprite2dArc::ClearVertices (Tr2Sprite2dArc.cpp:398-406): drops the prepared vertices
   * and indices.
   *
   * @returns {void}
   */
  @meta.implemented
  @blue.method
  _ClearVertices()
  {
    this._renderVertices = null;
    this._renderVertexCapacity = 0;
    this._renderVertexCount = 0;
    this._renderIndices.length = 0;
  }

}
