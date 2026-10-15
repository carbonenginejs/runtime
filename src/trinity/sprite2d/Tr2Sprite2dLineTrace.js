import { BlueList, IListNotify } from "#blue";
import { BLUELISTEVENT } from "#consts/blue";

// Source: trinity/trinity/Sprite2d/Tr2Sprite2dLineTrace.h
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dLineTrace.cpp
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dLineTrace_Blue.cpp
// Promoted to hand-maintained source 2026-08-22; portable value helpers are maintained here.
import { CornerType, Tr2Sprite2dTextureSettings, Tr2SpriteObjectEffect, Tr2SpriteObjectPickState } from "../generated/sprite2d/enums.js";
import { meta, type, blue } from "#schema";
import { Tr2TexturedSpriteObject } from "./Tr2TexturedSpriteObject.js";
import { Tr2Sprite2dLineTraceVertex } from "./Tr2Sprite2dLineTraceVertex.js";
import { Tr2Sprite2dVertexBase } from "./Tr2Sprite2dVertexBase.js";
import { Tr2Sprite2dD3DVertex } from "./Tr2Sprite2dD3DVertex.js";
import { mat4 } from "#math/mat4";
import { vec2 } from "#math/vec2";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";

/**
 * Carbon nested struct `Tr2Sprite2dLineTrace::DrawCall` (Tr2Sprite2dLineTrace.h:119-125).
 * @typedef {object} Tr2Sprite2dLineTraceDrawCall
 * @property {number} vertexOffset uint32 first vertex in `_renderVertices`.
 * @property {number} indexOffset uint32 first index in `_renderIndices`.
 * @property {number} vertexCount uint16 vertex count.
 * @property {number} indexCount uint16 index count.
 */

/**
 * Carbon `sizeof( Tr2Sprite2dVertexBase )`: Vector3 + Color + Vector2[2] = 11 floats = 44 bytes, the `stride`
 * argument of every `PrepareTriangleVerts` call here (Tr2Sprite2dLineTrace.cpp:415, 483, 631, 736).
 */
const VERTEX_BASE_STRIDE = 44;

/** DirectXMath `g_XMEpsilon` (FLT_EPSILON), used by XMVector2IntersectLine. */
const XM_EPSILON = 1.192092896e-7;

/**
 * Stores editable Sprite2D line-strip vertices and builds the stroked, jointed line geometry Carbon renders.
 * Carbon declares a private `AddVertex` (Tr2Sprite2dLineTrace.h:74) but never defines or calls it, so it has no port.
 */
@blue.define("Tr2Sprite2dLineTrace")
@blue.chainTo(Tr2TexturedSpriteObject)
@blue.inherit(IListNotify)
export class Tr2Sprite2dLineTrace extends Tr2TexturedSpriteObject
{

  /**
   * Per-call working values; always dirty, used within one call only. GatherSprites owns vec2_1/vec4_1 and the
   * Python wrapper ports own vec2_0/vec4_0/mat4_0, so the geometry helpers it calls never touch its slots.
   */
  static scratch = { vec2_0: vec2.create(), vec2_1: vec2.create(), vec4_0: vec4.create(), vec4_1: vec4.create(), mat4_0: mat4.create() };

  /** Carbon nested enum `Tr2Sprite2dLineTrace::CornerType` (Tr2Sprite2dLineTrace.h:56-61). */
  static CornerType = CornerType;

  /**
   * Carbon Tr2Sprite2dLineTrace.cpp:779-789 tests the unmasked event.
   * @param {number} event BLUELISTEVENT value.
   * @param {number} _key Changed key.
   * @param {number} _key2 Second key.
   * @param {object|null} _value Changed item.
   * @param {BlueList|null} _theList Changed list.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  OnListModified(event, _key, _key2, _value, _theList)
  {
    switch (event)
    {
      case BLUELISTEVENT.BELIST_INSERTED:
      case BLUELISTEVENT.BELIST_REMOVED:
      case BLUELISTEVENT.BELIST_UNLOADSTART:
        this.SetDirty();
        break;
    }
  }

  /** Installs Carbon's constructor-owned list observer. */
  constructor()
  {
    super();
    this.vertices.SetNotify(this);
  }


  /** m_cornerType (int) [READWRITE, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @type.int32
  cornerType = CornerType.CORNERTYPE_MITER;

  /** m_isLoop (bool) [READWRITE, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @type.boolean
  isLoop = false;

  /** m_textureOffset (float) [READWRITE, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @type.float32
  textureOffset = 0;

  /** m_end (float) [READWRITE, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @type.float32
  end = 1;

  /** m_start (float) [READWRITE, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @type.float32
  start = 0;

  /** m_vertices (PTr2Sprite2dLineTraceVertexVector) [READ, NOTIFY] */
  @blue.notify
  @blue.read
  @type.list("Tr2Sprite2dLineTraceVertex")
  vertices = new BlueList(Tr2Sprite2dLineTraceVertex, { className: "Tr2Sprite2dLineTraceVertex" });

  /** m_lineWidth (float) [READWRITE, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @type.float32
  lineWidth = 1;

  /** m_textureWidth (float) [READWRITE, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @type.float32
  textureWidth = 1;

  /** m_name (std::wstring): private and unused in Carbon (Tr2Sprite2dLineTrace.h:104). @type {string} */
  _name = "";

  /** m_textureOffsetAccum: texture distance laid down so far in this build. @type {number} */
  _textureOffsetAccum = 0;

  /** m_length: total trace length from CalcLength. @type {number} */
  _length = 0;

  /** m_renderIndices (uint16 per element), relative to each draw call's vertexOffset. @type {number[]} */
  _renderIndices = [];

  /** m_renderVertices: prepared vertices for every draw call. @type {Tr2Sprite2dD3DVertex[]} */
  _renderVertices = [];

  /** m_drawCalls. @type {Tr2Sprite2dLineTraceDrawCall[]} */
  _drawCalls = [];

  /**
   * Carbon Tr2Sprite2dLineTrace::GatherSprites (Tr2Sprite2dLineTrace.cpp:39-203): when dirty, walks the trace
   * from `start` to `end` (relative to its length), stroking each segment and its joint; then submits every draw
   * call under the trace translation.
   *
   * Carbon bug (CE-153), Tr2Sprite2dLineTrace.cpp:92-97 vs 134: the end clamp `end = min( m_end, m_start + 1 )` decides
   * WHEN the trace ends, but the interpolation of the last point still uses the unclamped `m_end`. Reproduced.
   * Carbon bug (CE-154), Tr2Sprite2dLineTrace.cpp:100-187: a looping trace whose total length is 0 gives a NaN relative
   * length, never reaches its end, and never leaves the loop. Reproduced (it hangs, as Carbon does).
   *
   * Adapted: JS arrays replace the native vectors; `m_renderVertices.reserve( GetEstimatedVertexCount() )`
   * (cpp:71) has no JS counterpart and is dropped. `RenderTriangleVerts` receives array slices in place of the
   * `&m_renderVertices[offset]` / `&m_renderIndices[offset]` pointers.
   * @param {Tr2Sprite2dScene} renderer Gathering scene.
   * @returns {void}
   */
  @meta.adapted
  GatherSprites(renderer)
  {
    if (!this.display || this.vertices.length === 0 || this.end <= this.start || this.spriteEffect === Tr2SpriteObjectEffect.TR2_SFX_NONE)
    {
      if (this._renderVertices.length !== 0) this._ClearVertices();
      return;
    }

    if (this.isDirty)
    {
      this._ClearVertices();
      if (this.vertices.length < 2) return;
      if (!this._ValidateAndSetTextures(renderer)) return;

      renderer.SetSpriteEffect(this.spriteEffect);
      renderer.SetTileMode(Tr2Sprite2dTextureSettings.S2D_TS_TILE_X | Tr2Sprite2dTextureSettings.S2D_TS_TILE_Y);
      this._SetRegularRenderState(renderer);

      this._drawCalls.push({ vertexOffset: 0, indexOffset: 0, vertexCount: 0, indexCount: 0 });

      // Walk state (cpp:80-97).
      this._length = this._CalcLength();
      let lastRelativeLength = 0;
      let length = 0;
      let hasReachedStart = this.start === 0;
      let hasReachedEnd = false;
      // Carbon locals: vec2_1 = fromPos, vec4_1 = fromColor.
      const { vec2_1, vec4_1 } = Tr2Sprite2dLineTrace.scratch;
      vec2.copy(vec2_1, this.vertices[0].position);
      vec4.copy(vec4_1, this.vertices[0].color);
      let prevCapAngle = 0;
      let end = this.end;
      if (end > this.start + 1) end = this.start + 1;

      let it = 1;
      while (!hasReachedEnd)
      {
        const toPos = this.vertices[it].position;
        const toColor = this.vertices[it].color;

        // Accumulate the segment length (cpp:105-108).
        let d = [toPos[0] - vec2_1[0], toPos[1] - vec2_1[1]];
        const curLength = Tr2Sprite2dLineTrace.length(d);
        length += curLength;
        const relativeLength = length / this._length;

        // Trim the segment start where the trace starts inside it (cpp:110-126).
        let adjustedFromPos, adjustedFromColor;
        if (!hasReachedStart && relativeLength > this.start)
        {
          const linePortionOfTotal = curLength / this._length;
          const portionOfLineToRender = (this.start - lastRelativeLength) / linePortionOfTotal;
          adjustedFromPos = Tr2Sprite2dLineTrace.mix(vec2_1, toPos, portionOfLineToRender, 2);
          adjustedFromColor = Tr2Sprite2dLineTrace.mix(vec4_1, toColor, portionOfLineToRender, 4);
          hasReachedStart = true;
        }
        else
        {
          adjustedFromPos = [vec2_1[0], vec2_1[1]];
          adjustedFromColor = [vec4_1[0], vec4_1[1], vec4_1[2], vec4_1[3]];
        }

        // Emit the segment, trimmed at the end or with the joint toward the next one (cpp:128-165).
        if (hasReachedStart)
        {
          if (relativeLength > end)
          {
            const linePortionOfTotal = curLength / this._length;
            const portionOfLineToRender = (this.end - lastRelativeLength) / linePortionOfTotal; // Carbon bug, CE-153: m_end, not end (cpp:134)
            const adjustedToPos = Tr2Sprite2dLineTrace.mix(vec2_1, toPos, portionOfLineToRender, 2);
            const adjustedToColor = Tr2Sprite2dLineTrace.mix(vec4_1, toColor, portionOfLineToRender, 4);
            this._AddSegment(renderer, adjustedFromPos, adjustedFromColor, prevCapAngle, adjustedToPos, adjustedToColor, 0);
            hasReachedEnd = true;
          }
          else
          {
            let capAngleTo = 0;
            if (this.lineWidth > 1)
            {
              let nextIt = it + 1;
              if (nextIt === this.vertices.length && this.isLoop) nextIt = 0;

              if (nextIt !== this.vertices.length)
              {
                const toPos2 = this.vertices[nextIt].position;
                let d2 = [toPos2[0] - toPos[0], toPos2[1] - toPos[1]];
                d = Tr2Sprite2dLineTrace.normalize(d);
                d2 = Tr2Sprite2dLineTrace.normalize(d2);
                capAngleTo = Math.atan2(d2[1], d2[0]) - Math.atan2(d[1], d[0]);
              }
            }
            this._AddSegment(renderer, adjustedFromPos, adjustedFromColor, prevCapAngle, toPos, toColor, capAngleTo);
            prevCapAngle = capAngleTo;
          }
        }

        // Advance, wrapping when looping (cpp:167-182).
        ++it;
        if (it === this.vertices.length)
        {
          if (this.isLoop) it = 0;
          else hasReachedEnd = true;
        }

        vec2.copy(vec2_1, toPos);
        vec4.copy(vec4_1, toColor);
        lastRelativeLength = relativeLength;
      }

      // Close the last draw call (cpp:188-191).
      const last = this._drawCalls.at(-1);
      last.vertexCount = (this._renderVertices.length - last.vertexOffset) & 0xffff;
      last.indexCount = (this._renderIndices.length - last.indexOffset) & 0xffff;
      this.isDirty = false;
    }

    // Submit every draw call under the translation (cpp:194-202).
    renderer.PushTranslation([this.displayX, this.displayY]);
    this._SetValidatedTextures(renderer);
    for (const dc of this._drawCalls)
    {
      renderer.RenderTriangleVerts(
        this._renderVertices.slice(dc.vertexOffset, dc.vertexOffset + dc.vertexCount),
        dc.vertexCount,
        this._renderIndices.slice(dc.indexOffset, dc.indexOffset + dc.indexCount),
        dc.indexCount);
    }
    renderer.PopTranslation();
  }

  /**
   * Carbon Tr2Sprite2dLineTrace::PickPoint (Tr2Sprite2dLineTrace.cpp:205-245): hit-tests the prepared triangles.
   * Carbon quirk (CE-155), Tr2Sprite2dLineTrace.cpp:219-240: unlike Tr2Sprite2dPolygon::PickPoint it neither pushes
   * `m_translation` nor tests the second winding, so a translated trace is picked at its untranslated position
   * and only triangles of the scene's expected winding hit. Reproduced.
   * @param {number} x Screen x.
   * @param {number} y Screen y.
   * @param {Tr2Sprite2dScene} renderer Picking scene.
   * @returns {Tr2Sprite2dLineTrace|null} This trace when hit.
   */
  @meta.implemented
  PickPoint(x, y, renderer)
  {
    if (!this.display) return null;

    if (this.pickState === Tr2SpriteObjectPickState.TR2_SPS_ON)
    {
      if (this._renderVertices.length < 2) return null;

      if (!this.pickingMask || this.pickingMask.SampleMask(renderer.InverseTransformPoint([x, y]), [this.displayX, this.displayY], this.displayWidth, this.displayHeight))
      {
        const p = [x, y];
        for (const dc of this._drawCalls)
        {
          const triangleCount = Math.floor(dc.indexCount / 3);
          for (let i = 0; i < triangleCount; ++i)
          {
            const ix0 = this._renderIndices[i * 3 + dc.indexOffset];
            const ix1 = this._renderIndices[i * 3 + dc.indexOffset + 1];
            const ix2 = this._renderIndices[i * 3 + dc.indexOffset + 2];

            const v0 = this._renderVertices[ix0 + dc.vertexOffset];
            const v1 = this._renderVertices[ix1 + dc.vertexOffset];
            const v2 = this._renderVertices[ix2 + dc.vertexOffset];

            if (renderer.IsInsideTriangle(p, v0.position, v1.position, v2.position)) return this;
          }
        }
      }
    }

    return null;
  }

  /**
   * Carbon Tr2Sprite2dLineTrace::CalcLength (Tr2Sprite2dLineTrace.cpp:247-274): polyline length, closed when looping.
   * @returns {number} Total length.
   */
  @meta.implemented
  _CalcLength()
  {
    if (this.vertices.length < 2) return 0;

    const fromPos = [this.vertices[0].position[0], this.vertices[0].position[1]];
    let length = 0;
    for (let it = 1; it !== this.vertices.length; ++it)
    {
      const toPos = this.vertices[it].position;
      length += Tr2Sprite2dLineTrace.length([toPos[0] - fromPos[0], toPos[1] - fromPos[1]]);
      fromPos[0] = toPos[0];
      fromPos[1] = toPos[1];
    }

    if (this.isLoop)
    {
      const first = this.vertices[0].position;
      length += Tr2Sprite2dLineTrace.length([first[0] - fromPos[0], first[1] - fromPos[1]]);
    }

    return length;
  }

  /**
   * Carbon Tr2Sprite2dLineTrace::GetEstimatedVertexCount (Tr2Sprite2dLineTrace.cpp:276-286): the reserve hint,
   * `size * 4 + 2 + size * (unsigned)m_lineWidth`.
   * @returns {number} Estimated vertex count.
   */
  @meta.implemented
  _GetEstimatedVertexCount()
  {
    let vertsNeeded = (this.vertices.length * 4 + 2) >>> 0;
    const w = Math.trunc(this.lineWidth) >>> 0;
    vertsNeeded = (vertsNeeded + this.vertices.length * w) >>> 0;
    return vertsNeeded;
  }

  /**
   * Carbon Tr2Sprite2dLineTrace::AddSegment (Tr2Sprite2dLineTrace.cpp:288-525): strokes one segment as a quad
   * (shortened for its joints), starts a new draw call when the segment would overflow the current one, and adds
   * the miter or round joint toward the next segment.
   *
   * Carbon's `Tr2Sprite2dVertexBase` locals are built on the stack (cpp:386-409, 434-474), and their Vector3,
   * Color and Vector2 members zero-construct, so the `texCoord[1]` left unwritten when the line is not anti-aliased
   * is (0, 0), as the JS vertex default is. Only the CCP_MALLOC'd joint vertices are indeterminate (CE-156; see
   * AddRoundJoint and AddMiterJoint).
   * Carbon quirk (CE-158), cpp:428-431: a draw-call split copies the last two render vertices into the new draw
   * call; for round and no-corner traces nothing indexes them. Reproduced.
   * Adapted: copying a prepared vertex by value (cpp:428-431) uses copyD3DVertex, JS having no struct copy.
   * @param {Tr2Sprite2dScene} renderer Gathering scene.
   * @param {Float32Array|number[]} from Segment start.
   * @param {Float32Array|number[]} fromColor Start colour.
   * @param {number} capAngleFrom Joint angle at the start.
   * @param {Float32Array|number[]} to Segment end.
   * @param {Float32Array|number[]} toColor End colour.
   * @param {number} capAngleTo Joint angle at the end.
   * @returns {void}
   */
  @meta.adapted
  _AddSegment(renderer, from, fromColor, capAngleFrom, to, toColor, capAngleTo)
  {
    // Direction and length (cpp:297-299).
    let d = [to[0] - from[0], to[1] - from[1]];
    const segmentLength = Tr2Sprite2dLineTrace.length(d);
    d = Tr2Sprite2dLineTrace.normalize(d);

    // Texture offsets along the line (cpp:302-304).
    const texOffset1 = this._textureOffsetAccum / this.textureWidth - this.textureOffset;
    this._textureOffsetAccum += segmentLength;
    const texOffset2 = this._textureOffsetAccum / this.textureWidth - this.textureOffset;

    // Anti-aliased lines are two pixels wider on each side (cpp:310-319).
    const isAA = this.spriteEffect === Tr2SpriteObjectEffect.TR2_SFX_FILL_AA;
    let pixelWidthInTexels = 1;
    let halfWidth = 0.5 * this.lineWidth;
    if (isAA)
    {
      halfWidth += 2;
      pixelWidthInTexels = 1 / (this.lineWidth + 4);
    }

    capAngleFrom = this._ClampAngle(capAngleFrom);
    capAngleTo = this._ClampAngle(capAngleTo);

    // Shorten the quad to make room for the joints (cpp:325-338).
    let adjustedFrom, adjustedTo;
    if (this.cornerType !== CornerType.CORNERTYPE_NONE)
    {
      let shorteningForCap = halfWidth * Math.tan(Math.abs(capAngleTo) * 0.5);
      adjustedTo = [to[0] - shorteningForCap * d[0], to[1] - shorteningForCap * d[1]];
      shorteningForCap = halfWidth * Math.tan(Math.abs(capAngleFrom) * 0.5);
      adjustedFrom = [from[0] + shorteningForCap * d[0], from[1] + shorteningForCap * d[1]];
    }
    else
    {
      adjustedTo = [to[0], to[1]];
      adjustedFrom = [from[0], from[1]];
    }

    const normal = [d[1], -d[0]];

    // Count what this segment and its joint add (cpp:343-380).
    const back = this._drawCalls.at(-1);
    const totalVertexCount = (this._renderVertices.length - back.vertexOffset) >>> 0;
    const totalIndexCount = (this._renderIndices.length - back.indexOffset) >>> 0;
    let segmentVertices = 4;
    let segmentIndices = 6;
    if (capAngleTo !== 0)
    {
      if (this.cornerType === CornerType.CORNERTYPE_MITER)
      {
        segmentVertices += 1 + 2;
        segmentIndices += 6;
      }
      else
      {
        const jointWidth = halfWidth * 2;
        const startAngle = Math.atan2(normal[1], normal[0]);
        const endAngle = startAngle + capAngleTo;
        const angleDiff = endAngle - startAngle;
        const arcLength = angleDiff * this.lineWidth;
        let numSteps = Math.floor((Math.trunc(Math.abs(arcLength)) >>> 0) / 4);
        if (numSteps < 2) numSteps = 2;
        ++numSteps;
        if (numSteps > jointWidth) numSteps = Math.trunc(this.lineWidth) >>> 0;

        segmentVertices = (segmentVertices + numSteps) >>> 0;
        segmentIndices = (segmentIndices + ((numSteps - 1) >>> 0) * 3) >>> 0;
      }
    }

    // Start a new draw call when this segment would not fit (cpp:381-432).
    if (totalIndexCount + segmentIndices >= renderer.GetMaxIndexCountPerDrawCall() || totalVertexCount + segmentVertices >= renderer.GetMaxVertexCountPerDrawCall())
    {
      if (this.cornerType === CornerType.CORNERTYPE_MITER)
      {
        // The previous joint indexes this segment's first two vertices, so add them to the previous draw call.
        const cv0 = new Tr2Sprite2dVertexBase();
        vec3.set(cv0.position, adjustedFrom[0] - normal[0] * halfWidth, adjustedFrom[1] - normal[1] * halfWidth, this.depth);
        vec4.copy(cv0.color, fromColor);
        vec2.set(cv0.texCoord[0], texOffset1, 0);
        if (isAA) vec2.set(cv0.texCoord[1], -pixelWidthInTexels, this.lineWidth);

        const cv1 = new Tr2Sprite2dVertexBase();
        vec3.set(cv1.position, adjustedFrom[0] + normal[0] * halfWidth, adjustedFrom[1] + normal[1] * halfWidth, this.depth);
        vec4.copy(cv1.color, fromColor);
        vec2.set(cv1.texCoord[0], texOffset1, 1);
        if (isAA) vec2.set(cv1.texCoord[1], 1 + pixelWidthInTexels, this.lineWidth);

        const capSize = this._renderVertices.length;
        Tr2Sprite2dLineTrace.resizeRenderVertices(this._renderVertices, capSize + 2);
        renderer.PrepareTriangleVerts(this._renderVertices.slice(capSize, capSize + 2), [cv0, cv1], VERTEX_BASE_STRIDE, 2);
      }

      back.vertexCount = (this._renderVertices.length - back.vertexOffset) & 0xffff;
      back.indexCount = (this._renderIndices.length - back.indexOffset) & 0xffff;

      this._drawCalls.push({ vertexOffset: this._renderVertices.length >>> 0, vertexCount: 0, indexOffset: this._renderIndices.length >>> 0, indexCount: 0 });

      const v0 = Tr2Sprite2dLineTrace.copyD3DVertex(this._renderVertices[this._renderVertices.length - 2]);
      const v1 = Tr2Sprite2dLineTrace.copyD3DVertex(this._renderVertices[this._renderVertices.length - 1]);
      this._renderVertices.push(v0);
      this._renderVertices.push(v1);
    }

    // The segment quad: v0 top left, v1 bottom left, v2 bottom right, v3 top right (cpp:434-474).
    const v0 = new Tr2Sprite2dVertexBase();
    vec3.set(v0.position, adjustedFrom[0] - normal[0] * halfWidth, adjustedFrom[1] - normal[1] * halfWidth, this.depth);
    vec4.copy(v0.color, fromColor);
    vec2.set(v0.texCoord[0], texOffset1, 0);
    if (isAA) vec2.set(v0.texCoord[1], -pixelWidthInTexels, this.lineWidth);

    const v1 = new Tr2Sprite2dVertexBase();
    vec3.set(v1.position, adjustedFrom[0] + normal[0] * halfWidth, adjustedFrom[1] + normal[1] * halfWidth, this.depth);
    vec4.copy(v1.color, fromColor);
    vec2.set(v1.texCoord[0], texOffset1, 1);
    if (isAA) vec2.set(v1.texCoord[1], 1 + pixelWidthInTexels, this.lineWidth);

    const v2 = new Tr2Sprite2dVertexBase();
    vec3.set(v2.position, adjustedTo[0] + normal[0] * halfWidth, adjustedTo[1] + normal[1] * halfWidth, this.depth);
    vec4.copy(v2.color, toColor);
    vec2.set(v2.texCoord[0], texOffset2, 1);
    if (isAA) vec2.set(v2.texCoord[1], 1 + pixelWidthInTexels, this.lineWidth);

    const v3 = new Tr2Sprite2dVertexBase();
    vec3.set(v3.position, adjustedTo[0] - normal[0] * halfWidth, adjustedTo[1] - normal[1] * halfWidth, this.depth);
    vec4.copy(v3.color, toColor);
    vec2.set(v3.texCoord[0], texOffset2, 0);
    if (isAA) vec2.set(v3.texCoord[1], -pixelWidthInTexels, this.lineWidth);

    // Prepare the quad (cpp:477-484).
    const oldSize = this._renderVertices.length >>> 0;
    Tr2Sprite2dLineTrace.resizeRenderVertices(this._renderVertices, oldSize + 4);
    renderer.PrepareTriangleVerts(this._renderVertices.slice(oldSize, oldSize + 4), [v0, v1, v2, v3], VERTEX_BASE_STRIDE, 4);

    // Two triangles, relative to the draw call (cpp:487-493).
    const indexOffset = this._drawCalls.at(-1).vertexOffset;
    for (const corner of [0, 1, 3, 3, 1, 2]) this._renderIndices.push((corner + oldSize - indexOffset) & 0xffff);

    // The joint toward the next segment (cpp:496-524).
    if (capAngleTo !== 0)
    {
      if (this.cornerType === CornerType.CORNERTYPE_MITER)
      {
        this._AddMiterJoint(renderer, capAngleTo, v2, v3, normal, toColor, isAA, pixelWidthInTexels, halfWidth);
      }
      else if (this.cornerType === CornerType.CORNERTYPE_ROUND)
      {
        this._AddRoundJoint(renderer, capAngleTo, v2, v3, normal, toColor, isAA, pixelWidthInTexels, halfWidth);
      }
    }
  }

  /**
   * Carbon Tr2Sprite2dLineTrace::AddRoundJoint (Tr2Sprite2dLineTrace.cpp:527-635): a triangle fan around the
   * inner corner of the joint.
   *
   * Carbon bugs reproduced: `vertexCount` is uint16 (cpp:585, CE-157), so `m_renderVertices.resize( vertexCount )` (cpp:627)
   * truncates once a trace holds more than 65535 render vertices; Carbon then writes past the end, which JS cannot
   * reproduce (the slice simply comes up short). The fan vertices come from CCP_MALLOC (cpp:578-580, CE-156) and the unused
   * texture coordinate (texCoord[0] when anti-aliased, texCoord[1] otherwise) is never written.
   * Adapted: JS uses the vertex default (0, 0) for those never-written coordinates.
   * @param {Tr2Sprite2dScene} renderer Gathering scene.
   * @param {number} capAngleTo Joint angle.
   * @param {Tr2Sprite2dVertexBase} v2 Segment bottom-right vertex.
   * @param {Tr2Sprite2dVertexBase} v3 Segment top-right vertex.
   * @param {number[]} normal Segment normal.
   * @param {Float32Array|number[]} color Joint colour.
   * @param {boolean} isAA Whether the line is anti-aliased.
   * @param {number} pixelWidthInTexels Anti-aliasing texel width.
   * @param {number} halfWidth Half stroke width.
   * @returns {void}
   */
  @meta.adapted
  _AddRoundJoint(renderer, capAngleTo, v2, v3, normal, color, isAA, pixelWidthInTexels, halfWidth)
  {
    // Fan base on the inner side of the turn (cpp:538-555).
    let fanBase = 0;
    let fanBaseTranslation = [0, 0];
    const fanVertexBase = this._renderVertices.length;
    let sign = 1;
    const jointWidth = halfWidth * 2;
    if (capAngleTo < 0)
    {
      fanBase = (2 + (fanVertexBase & 0xffff) - 4) & 0xffff;
      fanBaseTranslation = [v2.position[0], v2.position[1]];
      sign = -1;
    }
    else if (capAngleTo > 0)
    {
      fanBase = (3 + (fanVertexBase & 0xffff) - 4) & 0xffff;
      fanBaseTranslation = [v3.position[0], v3.position[1]];
    }

    // Arc steps (cpp:558-575).
    const startAngle = Math.atan2(normal[1], normal[0]);
    const endAngle = startAngle + capAngleTo;
    const angleDiff = endAngle - startAngle;
    const arcLength = angleDiff * this.lineWidth;
    let numSteps = Math.floor((Math.trunc(Math.abs(arcLength)) >>> 0) / 4);
    if (numSteps < 2) numSteps = 2;
    let stepSize = angleDiff / numSteps;
    ++numSteps;
    if (numSteps > jointWidth)
    {
      numSteps = Math.trunc(this.lineWidth) >>> 0;
      stepSize = angleDiff / ((numSteps - 1) >>> 0);
    }

    // Outer fan vertices and their triangles (cpp:578-625).
    const fanVerts = new Array(numSteps);
    let a = startAngle;
    let vertexCount = this._renderVertices.length & 0xffff;
    const indexOffset = this._drawCalls.at(-1).vertexOffset;
    for (let i = 0; i < numSteps; ++i)
    {
      const v = new Tr2Sprite2dVertexBase();
      vec3.set(v.position, sign * Math.cos(a) * jointWidth + fanBaseTranslation[0], sign * Math.sin(a) * jointWidth + fanBaseTranslation[1], this.depth);
      vec4.copy(v.color, color);

      if (isAA)
      {
        if (sign > 0) vec2.set(v.texCoord[1], 1 + pixelWidthInTexels, this.lineWidth);
        else vec2.set(v.texCoord[1], -pixelWidthInTexels, this.lineWidth);
      }
      else
      {
        this._textureOffsetAccum += Math.abs(arcLength) / numSteps;
        const texOffset = this._textureOffsetAccum / this.textureWidth - this.textureOffset;
        vec2.set(v.texCoord[0], texOffset, sign > 0 ? 1 : 0);
      }
      fanVerts[i] = v;

      if (i > 0)
      {
        this._renderIndices.push((-1 + vertexCount - indexOffset) & 0xffff);
        this._renderIndices.push((0 + vertexCount - indexOffset) & 0xffff);
        this._renderIndices.push((fanBase - indexOffset) & 0xffff);
      }

      a += stepSize;
      vertexCount = (vertexCount + 1) & 0xffff;
    }

    // Prepare the fan (cpp:627-632).
    Tr2Sprite2dLineTrace.resizeRenderVertices(this._renderVertices, vertexCount);
    renderer.PrepareTriangleVerts(this._renderVertices.slice(fanVertexBase, fanVertexBase + numSteps), fanVerts, VERTEX_BASE_STRIDE, numSteps);
  }

  /**
   * Carbon Tr2Sprite2dLineTrace::AddMiterJoint (Tr2Sprite2dLineTrace.cpp:637-740): one vertex at the outer
   * intersection of the two strokes, with two triangles that reach into the NEXT segment's first vertices.
   *
   * Carbon bugs reproduced as in AddRoundJoint: uint16 `vertexCount` in the resize (cpp:679, 732; CE-157) and the
   * never-written texture coordinate of the CCP_MALLOC vertex (cpp:673-707; CE-156).
   * Adapted: JS uses the vertex default (0, 0) for the never-written coordinate.
   * @param {Tr2Sprite2dScene} renderer Gathering scene.
   * @param {number} capAngleTo Joint angle.
   * @param {Tr2Sprite2dVertexBase} v2 Segment bottom-right vertex.
   * @param {Tr2Sprite2dVertexBase} v3 Segment top-right vertex.
   * @param {number[]} normal Segment normal.
   * @param {Float32Array|number[]} color Joint colour.
   * @param {boolean} isAA Whether the line is anti-aliased.
   * @param {number} pixelWidthInTexels Anti-aliasing texel width.
   * @param {number} halfWidth Half stroke width.
   * @returns {void}
   */
  @meta.adapted
  _AddMiterJoint(renderer, capAngleTo, v2, v3, normal, color, isAA, pixelWidthInTexels, halfWidth)
  {
    // Base and top points on either side of the turn (cpp:648-666).
    let fanBase = 0;
    let basePoint = [0, 0], topPoint = [0, 0];
    const fanVertexBase = this._renderVertices.length;
    let sign = 1;
    if (capAngleTo < 0)
    {
      fanBase = (2 + (fanVertexBase & 0xffff) - 4) & 0xffff;
      basePoint = [v2.position[0], v2.position[1]];
      topPoint = [v3.position[0], v3.position[1]];
      sign = -1;
    }
    else if (capAngleTo > 0)
    {
      fanBase = (3 + (fanVertexBase & 0xffff) - 4) & 0xffff;
      basePoint = [v3.position[0], v3.position[1]];
      topPoint = [v2.position[0], v2.position[1]];
    }

    const startAngle = Math.atan2(normal[1], normal[0]);
    const endAngle = startAngle + capAngleTo;

    // The miter vertex (cpp:679-707).
    const vertexCount = this._renderVertices.length & 0xffff;
    const v = new Tr2Sprite2dVertexBase();
    const p = this._GetMiterPoint(halfWidth, basePoint, startAngle, endAngle, sign);
    vec3.set(v.position, p[0], p[1], this.depth);
    vec4.copy(v.color, color);

    if (isAA)
    {
      if (sign > 0) vec2.set(v.texCoord[1], 1 + pixelWidthInTexels, this.lineWidth);
      else vec2.set(v.texCoord[1], -pixelWidthInTexels, this.lineWidth);
    }
    else
    {
      const arcLength = Tr2Sprite2dLineTrace.length([p[0] - topPoint[0], p[1] - topPoint[1]]);
      this._textureOffsetAccum += Math.abs(arcLength);
      const texOffset = this._textureOffsetAccum / this.textureWidth - this.textureOffset;
      vec2.set(v.texCoord[0], texOffset, sign > 0 ? 1 : 0);
    }

    // Two triangles; +1/+2 are the next segment's first vertices (cpp:710-730).
    const indexOffset = this._drawCalls.at(-1).vertexOffset;
    const near = sign === 1 ? -2 : -1;
    const far = sign === 1 ? 2 : 1;
    this._renderIndices.push((near + vertexCount - indexOffset) & 0xffff);
    this._renderIndices.push((fanBase - indexOffset) & 0xffff);
    this._renderIndices.push((0 + vertexCount - indexOffset) & 0xffff);
    this._renderIndices.push((far + vertexCount - indexOffset) & 0xffff);
    this._renderIndices.push((fanBase - indexOffset) & 0xffff);
    this._renderIndices.push((0 + vertexCount - indexOffset) & 0xffff);

    // Prepare the vertex (cpp:732-737).
    Tr2Sprite2dLineTrace.resizeRenderVertices(this._renderVertices, vertexCount + 1);
    renderer.PrepareTriangleVerts(this._renderVertices.slice(fanVertexBase, fanVertexBase + 1), [v], VERTEX_BASE_STRIDE, 1);
  }

  /**
   * Carbon Tr2Sprite2dLineTrace::GetMiterPoint (Tr2Sprite2dLineTrace.cpp:742-753): the outer intersection of the
   * two offset stroke edges.
   * @param {number} halfWidth Half stroke width.
   * @param {number[]} basePoint Inner corner.
   * @param {number} startAngle Incoming normal angle.
   * @param {number} endAngle Outgoing normal angle.
   * @param {number} sign Turn side, 1 or -1.
   * @returns {number[]} Miter point.
   */
  @meta.implemented
  _GetMiterPoint(halfWidth, basePoint, startAngle, endAngle, sign)
  {
    const k = halfWidth * 2 * sign;
    const v1 = [Math.cos(startAngle) * k, Math.sin(startAngle) * k];
    const p1 = [basePoint[0] + v1[0], basePoint[1] + v1[1]];
    const v2 = [Math.cos(endAngle) * k, Math.sin(endAngle) * k];
    const p2 = [basePoint[0] + v2[0], basePoint[1] + v2[1]];
    return Tr2Sprite2dLineTrace.xmVector2IntersectLine(p1, [p1[0] + v1[1], p1[1] - v1[0]], p2, [p2[0] + v2[1], p2[1] - v2[0]]);
  }

  /**
   * Carbon Tr2Sprite2dLineTrace::ClampAngle (Tr2Sprite2dLineTrace.cpp:755-766): one wrap into [-pi, pi].
   * @param {number} angle Angle in radians.
   * @returns {number} Wrapped angle.
   */
  @meta.implemented
  _ClampAngle(angle)
  {
    if (angle < -Math.PI) return angle + 2 * Math.PI;
    else if (angle > Math.PI) return angle - 2 * Math.PI;
    return angle;
  }

  /**
   * Carbon Tr2Sprite2dLineTrace::ClearVertices (Tr2Sprite2dLineTrace.cpp:768-777).
   * @returns {void}
   */
  @meta.implemented
  _ClearVertices()
  {
    this._renderVertices.length = 0;
    this._renderIndices.length = 0;
    this._drawCalls.length = 0;
    this._textureOffsetAccum = 0;
  }

  /**
   * Carbon method AppendVertices -> PyAppendVertices (MAP_METHOD, Tr2Sprite2dLineTrace_Blue.cpp:49-166).
   * Appends until the shortest sequence runs out. Carbon quirk (CE-161), Tr2Sprite2dLineTrace_Blue.cpp:159-162: the
   * one-vertex stop tests only positions and colours, so constant positions and colours append ONE vertex even
   * when `names` is a longer sequence. A string `names` is a Python sequence of one-character names. Vertices
   * before a bad item stay appended, then a TypeError is raised. All reproduced.
   *
   * Positions: `m_position = XMVector2TransformCoord( position, transform )` with the rows written to
   * `_11.._13`, `_21.._23`, `_41.._43` (cpp:66-78, 153). By the derivation on
   * {@link Tr2Sprite2dLineTrace.transformPosition}, x and y are affine and the third column (z) is discarded by
   * the Vector2 store (CE-150).
   *
   * Adapted: Python tuples/sequences are JS arrays (typed arrays and strings count as sequences), `None` is
   * `null`, and an omitted optional argument is `undefined`. Carbon's "OOO|O" makes `positionTransform` and
   * `colors` required.
   * @param {number[]|Array<number[]>} positions 2-item position or sequence of them.
   * @param {Array<number[]>|null} positionTransform Three 3-item rows, or null for identity.
   * @param {number[]|Array<number[]>} colors 4-item colour or sequence of them.
   * @param {string[]|string} [names] Sequence of names.
   * @returns {void}
   */
  @blue.method
  @meta.adapted
  AppendVertices(positions, positionTransform, colors, names)
  {
    if (positions === undefined || positionTransform === undefined || colors === undefined)
    {
      throw new TypeError("AppendVertices requires positions, positionTransform and colors");
    }

    // Carbon locals: vec2_0 = position, vec4_0 = color, mat4_0 = transform.
    const { vec2_0, vec4_0, mat4_0 } = Tr2Sprite2dLineTrace.scratch;
    vec2.set(vec2_0, 0, 0); vec4.set(vec4_0, 0, 0, 0, 0);
    let name = "";
    const transform = Tr2Sprite2dLineTrace.readPositionTransform(mat4_0, positionTransform);

    // Classify the inputs (cpp:80-99).
    const constPosition = Tr2Sprite2dLineTrace.toFloatTuple(positions, 2, vec2_0);
    if (!constPosition && !Tr2Sprite2dLineTrace.isSequence(positions)) throw new TypeError("positions parameter must be a 2-tuple or a sequence of 2-tuples");

    const constColor = Tr2Sprite2dLineTrace.toFloatTuple(colors, 4, vec4_0);
    if (!constColor && !Tr2Sprite2dLineTrace.isSequence(colors)) throw new TypeError("colors parameter must be a 4-tuple or a sequence of 4-tuples");

    if (names !== undefined && !Tr2Sprite2dLineTrace.isSequence(names)) throw new TypeError("names parameter must be a sequence of strings");

    // Append until a sequence runs out (cpp:101-163).
    for (let index = 0; ; ++index)
    {
      if (!constPosition)
      {
        if (index >= positions.length) break;
        if (!Tr2Sprite2dLineTrace.toFloatTuple(positions[index], 2, vec2_0)) throw new TypeError("positions parameter must be a 2-tuple or a sequence of 2-tuples");
      }
      if (!constColor)
      {
        if (index >= colors.length) break;
        if (!Tr2Sprite2dLineTrace.toFloatTuple(colors[index], 4, vec4_0)) throw new TypeError("colors parameter must be a 4-tuple or a sequence of 4-tuples");
      }
      if (names !== undefined)
      {
        if (index >= names.length) break;
        if (typeof names[index] !== "string") throw new TypeError("names parameter must be a sequence of strings");
        name = names[index];
      }

      const vertex = new Tr2Sprite2dLineTraceVertex();
      Tr2Sprite2dLineTrace.transformPosition(vertex.position, vec2_0, transform);
      vec4.copy(vertex.color, vec4_0);
      vertex.name = name;
      this.vertices.Append(vertex);

      if (constPosition && constColor) break;
    }

    this.SetDirty();
  }

  /**
   * Carbon method SetVertices -> PySetVertices (MAP_METHOD, Tr2Sprite2dLineTrace_Blue.cpp:168-310).
   * Overwrites existing vertices in order; `null` leaves that attribute unchanged.
   *
   * Carbon bug (CE-159), Tr2Sprite2dLineTrace_Blue.cpp:232-305: a single string `names` is accepted as "constant", but the
   * local `name` is only ever assigned in the sequence branch, so every vertex's name becomes the empty string.
   * Carbon quirk (CE-160), Tr2Sprite2dLineTrace_Blue.cpp:299: a non-string item in a `names` sequence raises the
   * texCoords0 error message. Both reproduced.
   *
   * Adapted: Python tuples/sequences are JS arrays and `None` is `null`; an omitted optional argument is
   * `undefined` and is treated as `None`, as Carbon does (cpp:181-192, 199). Carbon's "O|OOO" makes `positions`
   * required (it may be `null`).
   * @param {number[]|Array<number[]>|null} positions 2-item vec2_0, sequence of them, or null.
   * @param {Array<number[]>|null} [positionTransform] Three 3-item rows, or null for identity.
   * @param {number[]|Array<number[]>|null} [colors] 4-item colour, sequence of them, or null.
   * @param {string[]|string|null} [names] Name, sequence of names, or null.
   * @returns {void}
   */
  @blue.method
  @meta.adapted
  SetVertices(positions, positionTransform, colors, names)
  {
    if (positions === undefined) throw new TypeError("SetVertices requires positions");

    positions = positions ?? null;
    colors = colors ?? null;
    names = names ?? null;

    // Carbon locals: vec2_0 = position, vec4_0 = color, mat4_0 = transform.
    const { vec2_0, vec4_0, mat4_0 } = Tr2Sprite2dLineTrace.scratch;
    vec2.set(vec2_0, 0, 0); vec4.set(vec4_0, 0, 0, 0, 0);
    let name = "";
    const transform = Tr2Sprite2dLineTrace.readPositionTransform(mat4_0, positionTransform ?? null);

    // Classify the supplied inputs (cpp:212-241).
    let constPosition = true;
    if (positions)
    {
      constPosition = Tr2Sprite2dLineTrace.toFloatTuple(positions, 2, vec2_0);
      if (!constPosition && !Tr2Sprite2dLineTrace.isSequence(positions)) throw new TypeError("positions parameter must be a 2-tuple or a sequence of 2-tuples");
    }

    let constColor = true;
    if (colors)
    {
      constColor = Tr2Sprite2dLineTrace.toFloatTuple(colors, 4, vec4_0);
      if (!constColor && !Tr2Sprite2dLineTrace.isSequence(colors)) throw new TypeError("colors parameter must be a 4-tuple or a sequence of 4-tuples");
    }

    let constName = true;
    if (names !== null)
    {
      constName = typeof names === "string";
      if (!constName && !Tr2Sprite2dLineTrace.isSequence(names)) throw new TypeError("names parameter must be a string or a sequence of strings");
    }

    // Overwrite vertices in order (cpp:243-307).
    for (let index = 0; index < this.vertices.length; ++index)
    {
      const vertex = this.vertices[index];
      if (positions)
      {
        if (!constPosition)
        {
          if (index >= positions.length) break;
          if (!Tr2Sprite2dLineTrace.toFloatTuple(positions[index], 2, vec2_0)) throw new TypeError("positions parameter must be a 2-tuple or a sequence of 2-tuples");
        }
        Tr2Sprite2dLineTrace.transformPosition(vertex.position, vec2_0, transform);
      }
      if (colors)
      {
        if (!constColor)
        {
          if (index >= colors.length) break;
          if (!Tr2Sprite2dLineTrace.toFloatTuple(colors[index], 4, vec4_0)) throw new TypeError("colors parameter must be a 4-tuple or a sequence of 4-tuples");
        }
        vec4.copy(vertex.color, vec4_0);
      }
      if (names !== null)
      {
        if (!constName)
        {
          if (index >= names.length) break;
          if (typeof names[index] !== "string") throw new TypeError("texCoords0 parameter must be a 2-tuple or a sequence of 2-tuples"); // Carbon quirk, CE-160: wrong message (_Blue.cpp:299)
          name = names[index];
        }
        vertex.name = name; // Carbon bug, CE-159: a constant string name is never read, so `name` stays "" (_Blue.cpp:232-305)
      }
    }

    this.SetDirty();
  }

  /**
   * Port of the anonymous-namespace `ToFloatTuple` (Tr2Sprite2dLineTrace_Blue.cpp:15-44).
   * Adapted: a Python tuple is a JS array or typed array; Python float/int items are JS numbers.
   * @param {*} value Candidate tuple.
   * @param {number} length Required item count.
   * @param {Float32Array|number[]} destination Receives the items.
   * @param {number} [offset] First destination slot; Carbon passes a pointer such as `&transform._21`.
   * @returns {boolean} Whether `value` was such a tuple.
   */
  @meta.adapted
  static toFloatTuple(value, length, destination, offset = 0)
  {
    if (!(Array.isArray(value) || ArrayBuffer.isView(value)) || value.length !== length) return false;

    for (let i = 0; i < length; ++i)
    {
      if (typeof value[i] !== "number") return false;
      destination[offset + i] = value[i];
    }
    return true;
  }

  /**
   * JS stand-in for Python's `PySequence_Check` on wrapper arguments (Tr2Sprite2dLineTrace_Blue.cpp:81, 94).
   * Ours: the browser has no Python object protocol; arrays, typed arrays and strings are JS's sequences.
   * @param {*} value Candidate sequence.
   * @returns {boolean} Whether `value` is indexable as a sequence.
   */
  @meta.ours
  static isSequence(value)
  {
    return Array.isArray(value) || ArrayBuffer.isView(value) || typeof value === "string";
  }

  /**
   * Builds Carbon's `Matrix transform` from `positionTransform` (Tr2Sprite2dLineTrace_Blue.cpp:66-78, 198-210):
   * an identity Matrix whose `_11.._13`, `_21.._23` and `_41.._43` receive the three tuples (gl indices 0, 4, 12).
   * Adapted: Python tuples are JS arrays and `None` is `null`.
   * @param {Float32Array} transform Receives the 4x4 transform.
   * @param {Array<number[]>|null} value Three 3-item rows, or null.
   * @returns {Float32Array} `transform`.
   */
  @meta.adapted
  static readPositionTransform(transform, value)
  {
    mat4.identity(transform);
    if (value === null) return transform;

    if (!Array.isArray(value) || value.length !== 3
      || !Tr2Sprite2dLineTrace.toFloatTuple(value[0], 3, transform, 0)
      || !Tr2Sprite2dLineTrace.toFloatTuple(value[1], 3, transform, 4)
      || !Tr2Sprite2dLineTrace.toFloatTuple(value[2], 3, transform, 12))
    {
      throw new TypeError("positionTransform parameter must be a 3x3 matrix or None");
    }
    return transform;
  }

  /**
   * `m_position = XMVector2TransformCoord( position, transform )` (Tr2Sprite2dLineTrace_Blue.cpp:153, 264).
   * DirectXMath: result = (x*row0 + y*row1 + row3) / w with w = x*m03 + y*m13 + m33. For the matrix built by
   * readPositionTransform, m03 = m13 = 0 and m33 = 1, so w = 1 and
   *   x' = x*a00 + y*a10 + a20, y' = x*a01 + y*a11 + a21 (z' = x*a02 + y*a12 + a22).
   * `Vector2( XMVECTOR )` keeps x and y only, so the third input column has no effect here.
   * gl-matrix `vec2.transformMat4` computes exactly x' and y' on the shared layout.
   * @param {Float32Array} out Receives x and y.
   * @param {Float32Array|number[]} position Input x and y.
   * @param {Float32Array} transform Matrix from readPositionTransform.
   * @returns {Float32Array} `out`.
   */
  @meta.implemented
  static transformPosition(out, position, transform)
  {
    return vec2.transformMat4(out, position, transform);
  }

  /**
   * Carbon `Length( const Vector2& )` (math/include/Vector2_inline.h:157-160).
   * @param {number[]} v Vector.
   * @returns {number} Euclidean length.
   */
  @meta.implemented
  static length(v)
  {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1]);
  }

  /**
   * Carbon `Normalize( const Vector2& )` (math/include/Vector2_inline.h:163-171): a zero vector stays zero.
   * @param {number[]} v Vector.
   * @returns {number[]} New normalised vector.
   */
  @meta.implemented
  static normalize(v)
  {
    let length = Tr2Sprite2dLineTrace.length(v);
    if (length) length = 1 / length;
    return [v[0] * length, v[1] * length];
  }

  /**
   * Carbon's `to * t + from * ( 1.0f - t )` on Vector2 or Color (Tr2Sprite2dLineTrace.cpp:118-119, 135-136).
   * Ours: JS has no operator overloading for the Vector2/Color expression.
   * @param {ArrayLike<number>} from Value at t = 0.
   * @param {ArrayLike<number>} to Value at t = 1.
   * @param {number} t Blend factor.
   * @param {number} size Component count.
   * @returns {number[]} New blended value.
   */
  @meta.ours
  static mix(from, to, t, size)
  {
    const out = new Array(size);
    for (let i = 0; i < size; ++i) out[i] = to[i] * t + from[i] * (1 - t);
    return out;
  }

  /**
   * DirectXMath `XMVector2IntersectLine` (used at Tr2Sprite2dLineTrace.cpp:751), from its published definition:
   * V1 = L1P2 - L1P1, V2 = L2P2 - L2P1, V3 = L1P1 - L2P1, C1 = cross(V1, V2), C2 = cross(V2, V3) with
   * cross(a, b) = a.x*b.y - a.y*b.x. When |C1| <= FLT_EPSILON the lines are coincident (|C2| <= FLT_EPSILON,
   * result +infinity) or parallel (result NaN); otherwise the result is L1P1 + V1 * (C2 / C1).
   * Ours: DirectXMath has no counterpart in the runtime math modules.
   * @param {number[]} line1Point1 First point of line 1.
   * @param {number[]} line1Point2 Second point of line 1.
   * @param {number[]} line2Point1 First point of line 2.
   * @param {number[]} line2Point2 Second point of line 2.
   * @returns {number[]} Intersection point.
   */
  @meta.ours
  static xmVector2IntersectLine(line1Point1, line1Point2, line2Point1, line2Point2)
  {
    const v1 = [line1Point2[0] - line1Point1[0], line1Point2[1] - line1Point1[1]];
    const v2 = [line2Point2[0] - line2Point1[0], line2Point2[1] - line2Point1[1]];
    const v3 = [line1Point1[0] - line2Point1[0], line1Point1[1] - line2Point1[1]];
    const c1 = v1[0] * v2[1] - v1[1] * v2[0];
    const c2 = v2[0] * v3[1] - v2[1] * v3[0];

    if (Math.abs(c1) <= XM_EPSILON)
    {
      return Math.abs(c2) <= XM_EPSILON ? [Infinity, Infinity] : [NaN, NaN];
    }

    const scale = c2 / c1;
    return [v1[0] * scale + line1Point1[0], v1[1] * scale + line1Point1[1]];
  }

  /**
   * `std::vector<Tr2Sprite2dD3DVertex>::resize`: keeps existing vertices, appends default ones, drops the excess.
   * Ours: JS arrays have no resize.
   * @param {Tr2Sprite2dD3DVertex[]} list Vertex list.
   * @param {number} size New length.
   * @returns {void}
   */
  @meta.ours
  static resizeRenderVertices(list, size)
  {
    while (list.length < size) list.push(new Tr2Sprite2dD3DVertex());
    list.length = size;
  }

  /**
   * Copies a prepared vertex by value, as C++ `auto v0 = m_renderVertices[...]` does (Tr2Sprite2dLineTrace.cpp:428-431).
   * Ours: JS objects are references; the struct copy has to be spelled out.
   * @param {Tr2Sprite2dD3DVertex} source Vertex to copy.
   * @returns {Tr2Sprite2dD3DVertex} Independent copy.
   */
  @meta.ours
  static copyD3DVertex(source)
  {
    const out = new Tr2Sprite2dD3DVertex();
    vec3.copy(out.position, source.position);
    vec4.copy(out.color, source.color);
    vec2.copy(out.texCoord[0], source.texCoord[0]);
    vec2.copy(out.texCoord[1], source.texCoord[1]);
    Object.assign(out.clipRect, source.clipRect);
    out.glowBrightness = source.glowBrightness;
    out.transformIndex = source.transformIndex;
    out.blendMode = source.blendMode;
    out.spriteEffect = source.spriteEffect;
    out.tileMode = source.tileMode;
    vec4.copy(out.outlineColor, source.outlineColor);
    out.outlineThreshold = source.outlineThreshold;
    return out;
  }

}
