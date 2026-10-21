import { exposure as be } from "#be";
import { BlueList, IListNotify } from "#blue";

// Source: trinity/trinity/Sprite2d/Tr2Sprite2dPolygon.h
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dPolygon.cpp
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dPolygon_Blue.cpp
// Promoted to hand-maintained source 2026-08-22; portable value helpers are maintained here.
import { Tr2SpriteObjectPickState } from "../generated/sprite2d/enums.js";
import { meta, type, blue } from "#schema";
import { Tr2TexturedSpriteObject } from "./Tr2TexturedSpriteObject.js";
import { Tr2Sprite2dTriangle } from "./Tr2Sprite2dTriangle.js";
import { Tr2Sprite2dVertex } from "./Tr2Sprite2dVertex.js";
import { Tr2Sprite2dVertexBase } from "./Tr2Sprite2dVertexBase.js";
import { Tr2Sprite2dD3DVertex } from "./Tr2Sprite2dD3DVertex.js";
import { mat4 } from "#math/mat4";
import { vec2 } from "#math/vec2";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";

/**
 * Carbon `sizeof( Tr2Sprite2dVertexBase )`: Vector3 + Color + Vector2[2] = 11 floats = 44 bytes.
 * Passed as the `stride` argument of `Tr2Sprite2dScene.PrepareTriangleVerts` (Tr2Sprite2dPolygon.cpp:65, 96).
 */
const VERTEX_BASE_STRIDE = 44;

/** Carbon `INVALID_INDEX` (Tr2Sprite2dPolygon.cpp:69). */
const INVALID_INDEX = 0xffff;

/** Stores editable Sprite2D polygon vertices and triangles and validates wrapped append input. */
@be.define("Tr2Sprite2dPolygon")
@be.exposureChainTo(Tr2TexturedSpriteObject)
@blue.inherit(IListNotify)

export class Tr2Sprite2dPolygon extends Tr2TexturedSpriteObject
{

  /**
   * Carbon Tr2Sprite2dPolygon.cpp:158-161 invalidates geometry for every list event.
   * @param {number} _event BLUELISTEVENT value.
   * @param {number} _key Changed key.
   * @param {number} _key2 Second key.
   * @param {object|null} _value Changed item.
   * @param {BlueList|null} _theList Changed list.
   * @returns {void}
   * Carbon declaration: Tr2Sprite2dPolygon::OnListModified (trinity/trinity/Sprite2d/Tr2Sprite2dPolygon.h:70).
   */
  @meta.implemented
  OnListModified(_event, _key, _key2, _value, _theList)
  {
    this.SetDirty();
  }

  /** Installs Carbon's constructor-owned list observers. */
  constructor()
  {
    super();
    this.vertices.SetNotify(this);
    this.triangles.SetNotify(this);
  }


  /** Per-call working values of the Python wrapper ports; always dirty, used within one call only. */
  static scratch = { vec2_0: vec2.create(), vec2_1: vec2.create(), vec2_2: vec2.create(), vec4_0: vec4.create(), mat4_0: mat4.create() };

  /** m_triangles (PTr2Sprite2dTriangleVector) [READ] */
  @be.mapAttribute(be.READ)
  @type.list("Tr2Sprite2dTriangle")
  triangles = new BlueList(Tr2Sprite2dTriangle, { className: "Tr2Sprite2dTriangle" });

  /** m_vertices (PTr2Sprite2dVertexVector) [READ] */
  @be.mapAttribute(be.READ)
  @type.list("Tr2Sprite2dVertex")
  vertices = new BlueList(Tr2Sprite2dVertex, { className: "Tr2Sprite2dVertex" });

  /**
   * m_indices (std::vector<std::vector<unsigned short>>): one index batch per draw call.
   * @type {number[][]}
   */
  _indices = [];

  /**
   * m_renderVertices (std::vector<std::vector<Tr2Sprite2dD3DVertex>>): one prepared vertex batch per draw call.
   * @type {Tr2Sprite2dD3DVertex[][]}
   */
  _renderVertices = [];

  /**
   * Carbon Tr2Sprite2dPolygon::GatherSprites (Tr2Sprite2dPolygon.cpp:21-113): when dirty, copies the authored
   * vertices, splits the triangles into batches that fit one draw call, prepares each batch; then submits every
   * batch under the polygon translation.
   *
   * Adapted: JS arrays replace the native vectors and pointers. `std::vector::resize` becomes an explicit grow or
   * truncate, and `&m_renderVertices[i][0]` is the batch array itself, which `PrepareTriangleVerts` fills in place.
   * Carbon sizes `indexMap` by `m_triangles.size() * 3` but indexes it by vertex index (cpp:71, 86-89), which
   * writes out of bounds when a vertex index exceeds that size (Carbon bug CE-152, cpp:71). JS cannot reproduce the
   * undefined behaviour, so an out-of-range slot reads as unmapped, which is what the code evidently intends.
   * This is a silent fix, pending the operator's decision (CE-152).
   * @param {Tr2Sprite2dScene} renderer Gathering scene.
   * @returns {void}
   */
  @meta.adapted
  @blue.method
  GatherSprites(renderer)
  {
    if (this.isDirty && this.display && this.triangles.length !== 0)
    {
      if (!this._ValidateAndSetTextures(renderer)) return;

      renderer.SetSpriteEffect(this.spriteEffect);
      renderer.SetTileMode(0);
      this._SetRegularRenderState(renderer);

      // Copy the authored vertices into plain vertex records (cpp:35-46).
      const count = this.vertices.length;
      const verts = new Array(count);
      for (let i = 0; i < count; ++i)
      {
        const source = this.vertices[i];
        const dest = new Tr2Sprite2dVertexBase();
        vec3.copy(dest.position, source.position);
        vec4.copy(dest.color, source.color);
        vec2.copy(dest.texCoord[0], source.texCoord[0]);
        vec2.copy(dest.texCoord[1], source.texCoord[1]);
        verts[i] = dest;
      }

      // Size the batch lists; unsigned integer division as in Carbon (cpp:48-50).
      const maxTriangles = Math.min(Math.floor(renderer.GetMaxIndexCountPerDrawCall() / 3), Math.floor(renderer.GetMaxVertexCountPerDrawCall() / 3));
      const batchCount = Math.floor((this.triangles.length + maxTriangles - 1) / maxTriangles);
      Tr2Sprite2dPolygon.resizeBatches(this._indices, batchCount, () => []);
      Tr2Sprite2dPolygon.resizeBatches(this._renderVertices, batchCount, () => []);

      if (this._indices.length === 1)
      {
        // One batch: the triangle indices index the full vertex list directly (cpp:52-66).
        const indices = this._indices[0];
        indices.length = this.triangles.length * 3;
        let ix = 0;
        for (const triangle of this.triangles)
        {
          indices[ix++] = triangle.index0;
          indices[ix++] = triangle.index1;
          indices[ix++] = triangle.index2;
        }

        Tr2Sprite2dPolygon.resizeRenderVertices(this._renderVertices[0], this.vertices.length);
        renderer.PrepareTriangleVerts(this._renderVertices[0], verts, VERTEX_BASE_STRIDE, this.vertices.length);
      }
      else
      {
        // Several batches: remap each batch's vertices into a local list (cpp:67-98).
        let it = 0;
        const indexMap = new Array(this.triangles.length * 3);
        const localVerts = [];

        for (let i = 0; i < this._indices.length; ++i)
        {
          indexMap.fill(INVALID_INDEX);
          localVerts.length = 0;

          const indices = this._indices[i];
          indices.length = 0;
          while (it !== this.triangles.length && Math.floor(indices.length / 3) < maxTriangles)
          {
            const triangle = this.triangles[it];
            for (const vertexIndex of [triangle.index0, triangle.index1, triangle.index2])
            {
              const mapped = indexMap[vertexIndex];
              if (mapped === INVALID_INDEX || mapped === undefined)
              {
                localVerts.push(verts[vertexIndex]);
                indexMap[vertexIndex] = (localVerts.length - 1) & 0xffff;
              }
              indices.push(indexMap[vertexIndex]);
            }
            ++it;
          }

          Tr2Sprite2dPolygon.resizeRenderVertices(this._renderVertices[i], localVerts.length);
          renderer.PrepareTriangleVerts(this._renderVertices[i], localVerts, VERTEX_BASE_STRIDE, localVerts.length);
        }
      }

      this.isDirty = false;
    }

    if (!this.isDirty)
    {
      this._SetValidatedTextures(renderer);

      renderer.PushTranslation([this.displayX, this.displayY]);
      for (let i = 0; i < this._indices.length; ++i)
      {
        renderer.RenderTriangleVerts(this._renderVertices[i], this._renderVertices[i].length, this._indices[i], this._indices[i].length & 0xffff);
      }
      renderer.PopTranslation();
    }
  }

  /**
   * Picks both native triangle windings, restoring translation even on an early hit (Tr2Sprite2dPolygon.cpp:115-146).
   * @param {number} x Screen x.
   * @param {number} y Screen y.
   * @param {Tr2Sprite2dScene} renderer Picking scene.
   * @returns {Tr2Sprite2dPolygon|null} This polygon when hit.
   */
  @meta.implemented
  @blue.method
  PickPoint(x, y, renderer)
  {
    if (!this.display || this.pickState !== Tr2SpriteObjectPickState.TR2_SPS_ON) return null;

    const point = [x, y], translation = [this.displayX, this.displayY];
    if (this.pickingMask && !this.pickingMask.SampleMask(renderer.InverseTransformPoint(point), translation, this.displayWidth, this.displayHeight)) return null;

    renderer.PushTranslation(translation);
    try
    {
      for (const triangle of this.triangles)
      {
        const a = this.vertices[triangle.index0].position;
        const b = this.vertices[triangle.index1].position;
        const c = this.vertices[triangle.index2].position;
        if (renderer.IsInsideTriangle(point, a, b, c) || renderer.IsInsideTriangle(point, a, c, b)) return this;
      }
    }
    finally { renderer.PopTranslation(); }

    return null;
  }

  /**
   * Carbon Tr2Sprite2dPolygon::GetColor (Tr2Sprite2dPolygon.cpp:148-151).
   * @returns {Float32Array} A copy of the polygon colour.
   */
  @meta.implemented
  @blue.method
  GetColor()
  {
    return vec4.clone(this.color); // alloc: native value return belongs to the caller
  }

  /**
   * Carbon Tr2Sprite2dPolygon::SetColor (Tr2Sprite2dPolygon.cpp:153-156) hides the base setter and only stores the
   * colour. Carbon quirk, Tr2Sprite2dPolygon.cpp:153-156 (CE-127): unlike Tr2SpriteObject::SetColor it does not
   * call SetDirty, so prepared vertices keep the old tint until something else dirties the polygon. Reproduced.
   * @param {Float32Array|number[]} val New RGBA colour.
   * @returns {void}
   */
  @meta.implemented
  @blue.method
  SetColor(val)
  {
    vec4.copy(this.color, val);
  }

  /**
   * Carbon method AppendTriangles -> PyAppendTriangles (MAP_METHOD, Tr2Sprite2dPolygon_Blue.cpp:401-445).
   * Each item must be a 3-item array of integers; indices are truncated to uint16 as `uint16_t( int32_t )`. Items
   * before a bad one stay appended, then a TypeError is raised, as in Carbon.
   *
   * Adapted: Python tuples and sequences are JS arrays, and Python ints are integral JS numbers.
   * @param {Array<number[]>} triangles Sequence of 3-item vertex index arrays.
   * @returns {void}
   */
  @blue.method
  @meta.adapted
  AppendTriangles(triangles)
  {
    const message = "triangles parameter must be a sequence of 3-tuples";
    if (!Tr2Sprite2dPolygon.isSequence(triangles)) throw new TypeError(message);

    for (let index = 0; index < triangles.length; ++index)
    {
      const item = triangles[index];
      if (!Array.isArray(item) || item.length !== 3 || !item.every(Number.isInteger)) throw new TypeError(message);

      const triangle = new Tr2Sprite2dTriangle();
      triangle.index0 = item[0] & 0xffff;
      triangle.index1 = item[1] & 0xffff;
      triangle.index2 = item[2] & 0xffff;
      this.triangles.Append(triangle);
    }

    this.SetDirty();
  }

  /**
   * Carbon method AppendVertices -> PyAppendVertices (MAP_METHOD, Tr2Sprite2dPolygon_Blue.cpp:50-209).
   * Each input is a constant tuple or a per-vertex sequence; appending stops at the shortest sequence, or after
   * one vertex when every input is constant. Vertices before a bad item stay appended, then a TypeError is raised.
   *
   * Positions go through `XMVector2TransformCoord( position, transform )` where Carbon writes the three rows of
   * `positionTransform` into `_11.._13`, `_21.._23` and `_41.._43` of an identity Matrix (cpp:69-77). See
   * {@link Tr2Sprite2dPolygon.transformPosition} for what that makes of z and w.
   *
   * Adapted: Python tuples/sequences are JS arrays (typed arrays and strings count as sequences, as Python's
   * PySequence_Check would), Python `None` is `null`, and an omitted optional argument is `undefined`. Carbon's
   * "OOO|OO" makes `positionTransform` and `colors` required. Carbon quirk (CE-151), Tr2Sprite2dPolygon_Blue.cpp:96-124:
   * unlike SetVertices this method does not map `None` texture coordinates to "absent", so an explicit `null`
   * raises the TypeError, which is reproduced.
   * @param {number[]|Array<number[]>} positions 2-item position or sequence of them.
   * @param {Array<number[]>|null} positionTransform Three 3-item rows, or null for identity.
   * @param {number[]|Array<number[]>} colors 4-item colour or sequence of them.
   * @param {number[]|Array<number[]>} [texCoords0] 2-item UV or sequence of them.
   * @param {number[]|Array<number[]>} [texCoords1] 2-item UV or sequence of them.
   * @returns {void}
   */
  @blue.method
  @meta.adapted
  AppendVertices(positions, positionTransform, colors, texCoords0, texCoords1)
  {
    if (positions === undefined || positionTransform === undefined || colors === undefined)
    {
      throw new TypeError("AppendVertices requires positions, positionTransform and colors");
    }

    // Carbon locals: vec2_0 = position, vec4_0 = color, vec2_1 = texcoord0, vec2_2 = texcoord1, mat4_0 = transform.
    const { vec2_0, vec4_0, vec2_1, vec2_2, mat4_0 } = Tr2Sprite2dPolygon.scratch;
    vec2.set(vec2_0, 0, 0); vec4.set(vec4_0, 0, 0, 0, 0); vec2.set(vec2_1, 0, 0); vec2.set(vec2_2, 0, 0);
    const transform = Tr2Sprite2dPolygon.readPositionTransform(mat4_0, positionTransform);

    // Classify each input as a constant tuple or a sequence (cpp:83-124).
    const constPosition = Tr2Sprite2dPolygon.toFloatTuple(positions, 2, vec2_0);
    if (!constPosition && !Tr2Sprite2dPolygon.isSequence(positions)) throw new TypeError("positions parameter must be a 2-tuple or a sequence of 2-tuples");

    const constColor = Tr2Sprite2dPolygon.toFloatTuple(colors, 4, vec4_0);
    if (!constColor && !Tr2Sprite2dPolygon.isSequence(colors)) throw new TypeError("colors parameter must be a 4-tuple or a sequence of 4-tuples");

    let constTexcoord0 = true;
    if (texCoords0 !== undefined)
    {
      constTexcoord0 = Tr2Sprite2dPolygon.toFloatTuple(texCoords0, 2, vec2_1);
      if (!constTexcoord0 && !Tr2Sprite2dPolygon.isSequence(texCoords0)) throw new TypeError("texCoords0 parameter must be a 2-tuple or a sequence of 2-tuples");
    }

    let constTexcoord1 = true;
    if (texCoords1 !== undefined)
    {
      constTexcoord1 = Tr2Sprite2dPolygon.toFloatTuple(texCoords1, 2, vec2_2);
      if (!constTexcoord1 && !Tr2Sprite2dPolygon.isSequence(texCoords1)) throw new TypeError("texCoords1 parameter must be a 2-tuple or a sequence of 2-tuples");
    }

    // Append until the shortest sequence runs out (cpp:126-206).
    for (let index = 0; ; ++index)
    {
      if (!constPosition)
      {
        if (index >= positions.length) break;
        if (!Tr2Sprite2dPolygon.toFloatTuple(positions[index], 2, vec2_0)) throw new TypeError("positions parameter must be a 2-tuple or a sequence of 2-tuples");
      }
      if (!constColor)
      {
        if (index >= colors.length) break;
        if (!Tr2Sprite2dPolygon.toFloatTuple(colors[index], 4, vec4_0)) throw new TypeError("colors parameter must be a 4-tuple or a sequence of 4-tuples");
      }
      if (!constTexcoord0)
      {
        if (index >= texCoords0.length) break;
        if (!Tr2Sprite2dPolygon.toFloatTuple(texCoords0[index], 2, vec2_1)) throw new TypeError("texCoords0 parameter must be a 2-tuple or a sequence of 2-tuples");
      }
      if (!constTexcoord1)
      {
        if (index >= texCoords1.length) break;
        if (!Tr2Sprite2dPolygon.toFloatTuple(texCoords1[index], 2, vec2_2)) throw new TypeError("texCoords1 parameter must be a 2-tuple or a sequence of 2-tuples");
      }

      const vertex = new Tr2Sprite2dVertex();
      Tr2Sprite2dPolygon.transformPosition(vertex.position, vec2_0, transform);
      vec4.copy(vertex.color, vec4_0);
      vec2.copy(vertex.texCoord[0], vec2_1);
      vec2.copy(vertex.texCoord[1], vec2_2);
      this.vertices.Append(vertex);

      if (constPosition && constColor && constTexcoord0 && constTexcoord1) break;
    }

    this.SetDirty();
  }

  /**
   * Carbon method SetVertices -> PySetVertices (MAP_METHOD, Tr2Sprite2dPolygon_Blue.cpp:212-399).
   * Overwrites existing vertices in order; `null` leaves that attribute unchanged. Stops at the shortest sequence.
   * Positions are transformed as in {@link Tr2Sprite2dPolygon#AppendVertices}.
   *
   * Adapted: Python tuples/sequences are JS arrays and `None` is `null`; an omitted optional argument is
   * `undefined` and is treated as `None`, as Carbon does (cpp:226-241, 249). Carbon's "O|OOOO" makes `positions`
   * required (it may be `null`).
   * @param {number[]|Array<number[]>|null} positions 2-item vec2_0, sequence of them, or null.
   * @param {Array<number[]>|null} [positionTransform] Three 3-item rows, or null for identity.
   * @param {number[]|Array<number[]>|null} [colors] 4-item colour, sequence of them, or null.
   * @param {number[]|Array<number[]>|null} [texCoords0] 2-item UV, sequence of them, or null.
   * @param {number[]|Array<number[]>|null} [texCoords1] 2-item UV, sequence of them, or null.
   * @returns {void}
   */
  @blue.method
  @meta.adapted
  SetVertices(positions, positionTransform, colors, texCoords0, texCoords1)
  {
    if (positions === undefined) throw new TypeError("SetVertices requires positions");

    positions = positions ?? null;
    colors = colors ?? null;
    texCoords0 = texCoords0 ?? null;
    texCoords1 = texCoords1 ?? null;

    // Carbon locals: vec2_0 = position, vec4_0 = color, vec2_1 = texcoord0, vec2_2 = texcoord1, mat4_0 = transform.
    const { vec2_0, vec4_0, vec2_1, vec2_2, mat4_0 } = Tr2Sprite2dPolygon.scratch;
    vec2.set(vec2_0, 0, 0); vec4.set(vec4_0, 0, 0, 0, 0); vec2.set(vec2_1, 0, 0); vec2.set(vec2_2, 0, 0);
    const transform = Tr2Sprite2dPolygon.readPositionTransform(mat4_0, positionTransform ?? null);

    // Classify each supplied input (cpp:262-311).
    let constPosition = true;
    if (positions)
    {
      constPosition = Tr2Sprite2dPolygon.toFloatTuple(positions, 2, vec2_0);
      if (!constPosition && !Tr2Sprite2dPolygon.isSequence(positions)) throw new TypeError("positions parameter must be a 2-tuple or a sequence of 2-tuples");
    }

    let constColor = true;
    if (colors)
    {
      constColor = Tr2Sprite2dPolygon.toFloatTuple(colors, 4, vec4_0);
      if (!constColor && !Tr2Sprite2dPolygon.isSequence(colors)) throw new TypeError("colors parameter must be a 4-tuple or a sequence of 4-tuples");
    }

    let constTexcoord0 = true;
    if (texCoords0)
    {
      constTexcoord0 = Tr2Sprite2dPolygon.toFloatTuple(texCoords0, 2, vec2_1);
      if (!constTexcoord0 && !Tr2Sprite2dPolygon.isSequence(texCoords0)) throw new TypeError("texCoords0 parameter must be a 2-tuple or a sequence of 2-tuples");
    }

    let constTexcoord1 = true;
    if (texCoords1)
    {
      constTexcoord1 = Tr2Sprite2dPolygon.toFloatTuple(texCoords1, 2, vec2_2);
      if (!constTexcoord1 && !Tr2Sprite2dPolygon.isSequence(texCoords1)) throw new TypeError("texCoords1 parameter must be a 2-tuple or a sequence of 2-tuples");
    }

    // Overwrite vertices in order until a sequence runs out (cpp:313-396).
    for (let index = 0; index < this.vertices.length; ++index)
    {
      const vertex = this.vertices[index];
      if (positions)
      {
        if (!constPosition)
        {
          if (index >= positions.length) break;
          if (!Tr2Sprite2dPolygon.toFloatTuple(positions[index], 2, vec2_0)) throw new TypeError("positions parameter must be a 2-tuple or a sequence of 2-tuples");
        }
        Tr2Sprite2dPolygon.transformPosition(vertex.position, vec2_0, transform);
      }
      if (colors)
      {
        if (!constColor)
        {
          if (index >= colors.length) break;
          if (!Tr2Sprite2dPolygon.toFloatTuple(colors[index], 4, vec4_0)) throw new TypeError("colors parameter must be a 4-tuple or a sequence of 4-tuples");
        }
        vec4.copy(vertex.color, vec4_0);
      }
      if (texCoords0)
      {
        if (!constTexcoord0)
        {
          if (index >= texCoords0.length) break;
          if (!Tr2Sprite2dPolygon.toFloatTuple(texCoords0[index], 2, vec2_1)) throw new TypeError("texCoords0 parameter must be a 2-tuple or a sequence of 2-tuples");
        }
        vec2.copy(vertex.texCoord[0], vec2_1);
      }
      if (texCoords1)
      {
        if (!constTexcoord1)
        {
          if (index >= texCoords1.length) break;
          if (!Tr2Sprite2dPolygon.toFloatTuple(texCoords1[index], 2, vec2_2)) throw new TypeError("texCoords1 parameter must be a 2-tuple or a sequence of 2-tuples");
        }
        vec2.copy(vertex.texCoord[1], vec2_2);
      }
    }

    this.SetDirty();
  }

  /**
   * Carbon returns no vertices while hidden, otherwise the authored count (Tr2Sprite2dPolygon.cpp:163-171).
   * @returns {number} Vertex count.
   */
  @blue.method
  @meta.implemented
  GetVertexCount()
  {
    return this.display ? this.vertices.length : 0;
  }

  /**
   * Port of the anonymous-namespace `ToFloatTuple` (Tr2Sprite2dPolygon_Blue.cpp:16-45): when `value` is a tuple of
   * exactly `length` numbers, writes them as floats into `destination` and returns true.
   * Adapted: a Python tuple is a JS array or typed array; Python float/int items are JS numbers (any number,
   * including NaN and infinities, as PyFloat accepts them).
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
   * JS stand-in for Python's `PySequence_Check` on wrapper arguments (Tr2Sprite2dPolygon_Blue.cpp:84, 411).
   * Ours: the browser has no Python object protocol; arrays, typed arrays and strings are JS's sequences.
   * @param {*} value Candidate sequence.
   * @returns {boolean} Whether `value` is indexable as a sequence.
   */
  static isSequence(value)
  {
    return Array.isArray(value) || ArrayBuffer.isView(value) || typeof value === "string";
  }

  /**
   * Builds Carbon's `Matrix transform` from the Python `positionTransform` argument
   * (Tr2Sprite2dPolygon_Blue.cpp:69-81, 248-260): an identity Matrix whose rows `_11.._13`, `_21.._23` and
   * `_41.._43` receive the three tuples. `None` keeps the identity. The matrix shares gl-matrix's byte layout, so
   * `_11` is index 0, `_21` index 4 and `_41` index 12.
   * Adapted: Python tuples are JS arrays and `None` is `null`.
   * @param {Float32Array} transform Receives the 4x4 transform.
   * @param {Array<number[]>|null} value Three 3-item rows, or null.
   * @returns {Float32Array} `transform`.
   */
  @meta.cjs
    @meta.adapted
  static readPositionTransform(transform, value)
  {
    mat4.identity(transform);
    if (value === null) return transform;

    if (!Array.isArray(value) || value.length !== 3
      || !Tr2Sprite2dPolygon.toFloatTuple(value[0], 3, transform, 0)
      || !Tr2Sprite2dPolygon.toFloatTuple(value[1], 3, transform, 4)
      || !Tr2Sprite2dPolygon.toFloatTuple(value[2], 3, transform, 12))
    {
      throw new TypeError("positionTransform parameter must be a 3x3 matrix or None");
    }
    return transform;
  }

  /**
   * `vertex->position = XMVector2TransformCoord( position, transform )` (Tr2Sprite2dPolygon_Blue.cpp:195, 334).
   * Carbon quirk, CE-150: the third input column becomes z, never a projective w (derivation below).
   *
   * Derivation. DirectXMath defines XMVector2TransformCoord(V, M) as `x*row0 + y*row1 + row3`, divided by its w,
   * with w = x*m03 + y*m13 + m33. The matrix built by {@link Tr2Sprite2dPolygon.readPositionTransform} is
   *   row0 = (a00, a01, a02, 0), row1 = (a10, a11, a12, 0), row2 = (0, 0, 1, 0), row3 = (a20, a21, a22, 1)
   * for input rows a0, a1, a2, so w = x*0 + y*0 + 1 = 1 always, and
   *   x' = x*a00 + y*a10 + a20, y' = x*a01 + y*a11 + a21, z' = x*a02 + y*a12 + a22.
   * The third input column is therefore z, never a projective w. `Vector3( XMVECTOR )` stores x, y and z
   * (math/include/Vector3_inline.h:21-24), and Tr2Sprite2dScene::PrepareTriangleVerts copies z into the GPU vertex
   * (Tr2Sprite2dScene.cpp:948-950). With `None` the identity's `_43` is 0, so z = 0; an identity tuple
   * ((1,0,0),(0,1,0),(0,0,1)) gives z = 1.
   *
   * `vec3.transformMat4` on (x, y, 0) computes exactly this: row 2 is multiplied by z = 0, and its w division is
   * by the same w = 1 (math conventions: TransformCoord is vec3.transformMat4 on the shared layout).
   * @param {Float32Array} out Receives x, y and z.
   * @param {Float32Array|number[]} position Input x and y.
   * @param {Float32Array} transform Matrix from readPositionTransform.
   * @returns {Float32Array} `out`.
   */
  @meta.cjs
    @meta.implemented
  static transformPosition(out, position, transform)
  {
    return vec3.transformMat4(out, [position[0], position[1], 0], transform);
  }

  /**
   * `std::vector::resize` on the batch lists: keeps existing batches, appends new empty ones, drops the excess.
   * Ours: JS arrays have no resize.
   * @param {Array} list Batch list.
   * @param {number} size New length.
   * @param {Function} create Creates an empty batch.
   * @returns {void}
   */
  static resizeBatches(list, size, create)
  {
    while (list.length < size) list.push(create());
    list.length = size;
  }

  /**
   * `std::vector<Tr2Sprite2dD3DVertex>::resize`: keeps existing vertices, appends default ones, drops the excess.
   * Ours: JS arrays have no resize.
   * @param {Tr2Sprite2dD3DVertex[]} list Vertex list.
   * @param {number} size New length.
   * @returns {void}
   */
  static resizeRenderVertices(list, size)
  {
    while (list.length < size) list.push(new Tr2Sprite2dD3DVertex());
    list.length = size;
  }

}
