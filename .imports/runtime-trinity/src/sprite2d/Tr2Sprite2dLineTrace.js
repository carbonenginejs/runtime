// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dLineTrace.h
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dLineTrace_Blue.cpp
// Promoted to hand-maintained source 2026-08-22; portable value helpers are maintained here.
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { Tr2TexturedSpriteObject } from "../generated/sprite2d/Tr2TexturedSpriteObject.js";
import { Tr2Sprite2dLineTraceVertex } from "./Tr2Sprite2dLineTraceVertex.js";
import { vec2 } from "@carbonenginejs/runtime-utils/vec2";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";

/** Stores editable Sprite2D line-strip vertices and validates wrapped append input. */
@type.define({ className: "Tr2Sprite2dLineTrace", family: "sprite2d" })
export class Tr2Sprite2dLineTrace extends Tr2TexturedSpriteObject
{

  /** m_cornerType (int) [READWRITE, NOTIFY] */
  @io.notify
  @io.readwrite
  @type.int32
  cornerType = 0;

  /** m_isLoop (bool) [READWRITE, NOTIFY] */
  @io.notify
  @io.readwrite
  @type.boolean
  isLoop = false;

  /** m_textureOffset (float) [READWRITE, NOTIFY] */
  @io.notify
  @io.readwrite
  @type.float32
  textureOffset = 0;

  /** m_end (float) [READWRITE, NOTIFY] */
  @io.notify
  @io.readwrite
  @type.float32
  end = 1;

  /** m_start (float) [READWRITE, NOTIFY] */
  @io.notify
  @io.readwrite
  @type.float32
  start = 0;

  /** m_vertices (PTr2Sprite2dLineTraceVertexVector) [READ, NOTIFY] */
  @io.notify
  @io.read
  @type.list("Tr2Sprite2dLineTraceVertex")
  vertices = [];

  /** m_lineWidth (float) [READWRITE, NOTIFY] */
  @io.notify
  @io.readwrite
  @type.float32
  lineWidth = 1;

  /** m_textureWidth (float) [READWRITE, NOTIFY] */
  @io.notify
  @io.readwrite
  @type.float32
  textureWidth = 1;

  /** Carbon method AppendVertices -> PyAppendVertices (MAP_METHOD). */
  @carbon.method
  @impl.adapted
  AppendVertices(positions, positionTransform, colors, names = null)
  {
    const positionSource = Tr2Sprite2dLineTrace.#PrepareVectorSource(positions, 2, "positions", true);
    const colorSource = Tr2Sprite2dLineTrace.#PrepareVectorSource(colors, 4, "colors", true);
    const nameSource = Tr2Sprite2dLineTrace.#PrepareNameSource(names, false);
    const sources = [positionSource, colorSource, nameSource].filter(Boolean);
    const varying = sources.filter(source => !source.constant);
    const count = varying.length ? Math.min(...varying.map(source => source.length)) : 1;
    const transform = Tr2Sprite2dLineTrace.#GetTransform(positionTransform);
    for (let index = 0; index < count; index++)
    {
      const vertex = new Tr2Sprite2dLineTraceVertex();
      vec2.copy(vertex.position, Tr2Sprite2dLineTrace.#TransformPosition(positionSource.get(index), transform));
      vec4.copy(vertex.color, colorSource.get(index));
      if (nameSource) vertex.name = nameSource.get(index);
      this.vertices.push(vertex);
    }
    this.SetDirty();
  }

  /** Carbon method SetVertices -> PySetVertices (MAP_METHOD). */
  @carbon.method
  @impl.adapted
  SetVertices(positions = null, positionTransform = null, colors = null, names = null)
  {
    const positionSource = Tr2Sprite2dLineTrace.#PrepareVectorSource(positions, 2, "positions");
    const colorSource = Tr2Sprite2dLineTrace.#PrepareVectorSource(colors, 4, "colors");
    const nameSource = Tr2Sprite2dLineTrace.#PrepareNameSource(names);
    const sources = [positionSource, colorSource, nameSource].filter(Boolean);
    const varying = sources.filter(source => !source.constant);
    const count = Math.min(this.vertices.length, varying.length ? Math.min(...varying.map(source => source.length)) : this.vertices.length);
    const transform = Tr2Sprite2dLineTrace.#GetTransform(positionTransform);
    for (let index = 0; index < count; index++)
    {
      const vertex = this.vertices[index];
      if (positionSource) vec2.copy(vertex.position, Tr2Sprite2dLineTrace.#TransformPosition(positionSource.get(index), transform));
      if (colorSource) vec4.copy(vertex.color, colorSource.get(index));
      if (nameSource) vertex.name = nameSource.get(index);
    }
    this.SetDirty();
  }

  /** Normalizes a constant or per-vertex vector input. */
  static #PrepareVectorSource(value, width, name, required = false)
  {
    if (value == null)
    {
      if (required) throw new TypeError(`${name} is required`);
      return null;
    }
    if (Tr2Sprite2dLineTrace.#IsVector(value, width))
    {
      return { constant: true, length: Infinity, get: () => value };
    }
    if (!Array.isArray(value) || !value.every(item => Tr2Sprite2dLineTrace.#IsVector(item, width)))
    {
      throw new TypeError(`${name} must be a ${width}-item array or a sequence of them`);
    }
    return { constant: false, length: value.length, get: index => value[index] };
  }

  /** Normalizes a constant or per-vertex name input. */
  static #PrepareNameSource(value, allowConstant = true)
  {
    if (value == null) return null;
    if (allowConstant && typeof value === "string") return { constant: true, length: Infinity, get: () => value };
    if (!Array.isArray(value) || !value.every(item => typeof item === "string"))
    {
      throw new TypeError("names must be a string or a sequence of strings");
    }
    return { constant: false, length: value.length, get: index => value[index] };
  }

  /** Tests whether a value is a finite vector with the requested width. */
  static #IsVector(value, width)
  {
    return value != null && typeof value !== "string" && value.length === width && Array.from(value).every(Number.isFinite);
  }

  /** Validates or supplies the identity 3x3 position transform. */
  static #GetTransform(value)
  {
    if (value == null) return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    if (!Array.isArray(value) || value.length !== 3 || !value.every(row => Tr2Sprite2dLineTrace.#IsVector(row, 3)))
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
