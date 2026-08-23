// Source: trinity/trinity/Sprite2d/Tr2Sprite2dPolygon.h
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dPolygon.cpp
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dPolygon_Blue.cpp
// Promoted to hand-maintained source 2026-08-22; portable value helpers are maintained here.
import { carbon, impl, io, type } from "#schema";
import { Tr2TexturedSpriteObject } from "../generated/sprite2d/Tr2TexturedSpriteObject.js";
import { Tr2Sprite2dTriangle } from "./Tr2Sprite2dTriangle.js";
import { Tr2Sprite2dVertex } from "./Tr2Sprite2dVertex.js";
import { vec2 } from "#math/vec2";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";

/** Stores editable Sprite2D polygon vertices and triangles and validates wrapped append input. */
@type.define({ className: "Tr2Sprite2dPolygon", family: "sprite2d" })
export class Tr2Sprite2dPolygon extends Tr2TexturedSpriteObject
{

  /** m_triangles (PTr2Sprite2dTriangleVector) [READ] */
  @io.read
  @type.list("Tr2Sprite2dTriangle")
  triangles = [];

  /** m_vertices (PTr2Sprite2dVertexVector) [READ] */
  @io.read
  @type.list("Tr2Sprite2dVertex")
  vertices = [];

  /** Carbon method AppendTriangles -> PyAppendTriangles (MAP_METHOD). */
  @carbon.method
  @impl.adapted
  AppendTriangles(triangles)
  {
    if (!Array.isArray(triangles))
    {
      throw new TypeError("triangles must be a sequence of 3-item index arrays");
    }
    const next = triangles.map(value =>
    {
      if (!Tr2Sprite2dPolygon.#IsVector(value, 3))
      {
        throw new TypeError("triangles must be a sequence of 3-item index arrays");
      }
      const triangle = new Tr2Sprite2dTriangle();
      triangle.index0 = Number(value[0]) & 0xffff;
      triangle.index1 = Number(value[1]) & 0xffff;
      triangle.index2 = Number(value[2]) & 0xffff;
      return triangle;
    });
    this.triangles.push(...next);
    this.SetDirty();
  }

  /** Carbon method AppendVertices -> PyAppendVertices (MAP_METHOD). */
  @carbon.method
  @impl.adapted
  AppendVertices(positions, positionTransform = null, colors = [1, 1, 1, 1], texCoords0 = null, texCoords1 = null)
  {
    const sources = [
      Tr2Sprite2dPolygon.#PrepareSource(positions, 2, "positions", true),
      Tr2Sprite2dPolygon.#PrepareSource(colors, 4, "colors", true),
      Tr2Sprite2dPolygon.#PrepareSource(texCoords0 ?? [0, 0], 2, "texCoords0", true),
      Tr2Sprite2dPolygon.#PrepareSource(texCoords1 ?? [0, 0], 2, "texCoords1", true)
    ];
    const count = Tr2Sprite2dPolygon.#GetCount(sources, 1);
    const transform = Tr2Sprite2dPolygon.#GetTransform(positionTransform);
    for (let index = 0; index < count; index++)
    {
      const vertex = new Tr2Sprite2dVertex();
      const position = Tr2Sprite2dPolygon.#TransformPosition(sources[0].get(index), transform);
      vec3.set(vertex.position, position[0], position[1], 0);
      vec4.copy(vertex.color, sources[1].get(index));
      vec2.copy(vertex.texCoord[0], sources[2].get(index));
      vec2.copy(vertex.texCoord[1], sources[3].get(index));
      this.vertices.push(vertex);
    }
    this.SetDirty();
  }

  /** Carbon method SetVertices -> PySetVertices (MAP_METHOD). */
  @carbon.method
  @impl.adapted
  SetVertices(positions = null, positionTransform = null, colors = null, texCoords0 = null, texCoords1 = null)
  {
    const sources = [
      Tr2Sprite2dPolygon.#PrepareSource(positions, 2, "positions"),
      Tr2Sprite2dPolygon.#PrepareSource(colors, 4, "colors"),
      Tr2Sprite2dPolygon.#PrepareSource(texCoords0, 2, "texCoords0"),
      Tr2Sprite2dPolygon.#PrepareSource(texCoords1, 2, "texCoords1")
    ];
    const active = sources.filter(Boolean);
    const count = Math.min(this.vertices.length, Tr2Sprite2dPolygon.#GetCount(active, this.vertices.length));
    const transform = Tr2Sprite2dPolygon.#GetTransform(positionTransform);
    for (let index = 0; index < count; index++)
    {
      const vertex = this.vertices[index];
      if (sources[0])
      {
        const position = Tr2Sprite2dPolygon.#TransformPosition(sources[0].get(index), transform);
        vec3.set(vertex.position, position[0], position[1], 0);
      }
      if (sources[1]) vec4.copy(vertex.color, sources[1].get(index));
      if (sources[2]) vec2.copy(vertex.texCoord[0], sources[2].get(index));
      if (sources[3]) vec2.copy(vertex.texCoord[1], sources[3].get(index));
    }
    this.SetDirty();
  }

  /** Normalizes a constant or per-vertex polygon input. */
  static #PrepareSource(value, width, name, required = false)
  {
    if (value == null)
    {
      if (required) throw new TypeError(`${name} is required`);
      return null;
    }
    if (Tr2Sprite2dPolygon.#IsVector(value, width))
    {
      return { constant: true, length: Infinity, get: () => value };
    }
    if (!Array.isArray(value) || !value.every(item => Tr2Sprite2dPolygon.#IsVector(item, width)))
    {
      throw new TypeError(`${name} must be a ${width}-item array or a sequence of them`);
    }
    return { constant: false, length: value.length, get: index => value[index] };
  }

  /** Tests whether a value is a finite vector with the requested width. */
  static #IsVector(value, width)
  {
    return value != null && typeof value !== "string" && value.length === width && Array.from(value).every(Number.isFinite);
  }

  /** Derives the number of vertices available across active sources. */
  static #GetCount(sources, constantCount)
  {
    const varying = sources.filter(source => !source.constant);
    return varying.length ? Math.min(...varying.map(source => source.length)) : constantCount;
  }

  /** Validates or supplies the identity 3x3 position transform. */
  static #GetTransform(value)
  {
    if (value == null) return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    if (!Array.isArray(value) || value.length !== 3 || !value.every(row => Tr2Sprite2dPolygon.#IsVector(row, 3)))
    {
      throw new TypeError("positionTransform must be a 3x3 matrix or null");
    }
    return value;
  }

  /** Applies a row-vector homogeneous 2D transform to a position. */
  static #TransformPosition(position, matrix)
  {
    const x = position[0];
    const y = position[1];
    const w = x * matrix[0][2] + y * matrix[1][2] + matrix[2][2];
    const divisor = w || 1;
    return [
      (x * matrix[0][0] + y * matrix[1][0] + matrix[2][0]) / divisor,
      (x * matrix[0][1] + y * matrix[1][1] + matrix[2][1]) / divisor
    ];
  }

}
