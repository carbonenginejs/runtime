import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { Tr2TexturedSpriteObject as _Tr2TexturedSpriteObj } from '../generated/sprite2d/Tr2TexturedSpriteObject.js';
import { Tr2Sprite2dTriangle as _Tr2Sprite2dTriangle } from './Tr2Sprite2dTriangle.js';
import { Tr2Sprite2dVertex as _Tr2Sprite2dVertex } from './Tr2Sprite2dVertex.js';
import { vec2 } from '@carbonenginejs/runtime-utils/vec2';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initProto, _initClass, _init_triangles, _init_extra_triangles, _init_vertices, _init_extra_vertices;

/** Stores editable Sprite2D polygon vertices and triangles and validates wrapped append input. */
let _Tr2Sprite2dPolygon;
new class extends _identity {
  static [class Tr2Sprite2dPolygon extends _Tr2TexturedSpriteObj {
    static {
      ({
        e: [_init_triangles, _init_extra_triangles, _init_vertices, _init_extra_vertices, _initProto],
        c: [_Tr2Sprite2dPolygon, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2Sprite2dPolygon",
        family: "sprite2d"
      })], [[[io, io.read, void 0, type.list("Tr2Sprite2dTriangle")], 16, "triangles"], [[io, io.read, void 0, type.list("Tr2Sprite2dVertex")], 16, "vertices"], [[carbon, carbon.method, impl, impl.adapted], 18, "AppendTriangles"], [[carbon, carbon.method, impl, impl.adapted], 18, "AppendVertices"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetVertices"]], 0, void 0, _Tr2TexturedSpriteObj));
    }
    constructor(...args) {
      super(...args);
      _init_extra_vertices(this);
    }
    /** m_triangles (PTr2Sprite2dTriangleVector) [READ] */
    triangles = (_initProto(this), _init_triangles(this, []));

    /** m_vertices (PTr2Sprite2dVertexVector) [READ] */
    vertices = (_init_extra_triangles(this), _init_vertices(this, []));

    /** Carbon method AppendTriangles -> PyAppendTriangles (MAP_METHOD). */
    AppendTriangles(triangles) {
      if (!Array.isArray(triangles)) {
        throw new TypeError("triangles must be a sequence of 3-item index arrays");
      }
      const next = triangles.map(value => {
        if (!_Tr2Sprite2dPolygon.#IsVector(value, 3)) {
          throw new TypeError("triangles must be a sequence of 3-item index arrays");
        }
        const triangle = new _Tr2Sprite2dTriangle();
        triangle.index0 = Number(value[0]) & 0xffff;
        triangle.index1 = Number(value[1]) & 0xffff;
        triangle.index2 = Number(value[2]) & 0xffff;
        return triangle;
      });
      this.triangles.push(...next);
      this.SetDirty();
    }

    /** Carbon method AppendVertices -> PyAppendVertices (MAP_METHOD). */
    AppendVertices(positions, positionTransform = null, colors = [1, 1, 1, 1], texCoords0 = null, texCoords1 = null) {
      const sources = [_Tr2Sprite2dPolygon.#PrepareSource(positions, 2, "positions", true), _Tr2Sprite2dPolygon.#PrepareSource(colors, 4, "colors", true), _Tr2Sprite2dPolygon.#PrepareSource(texCoords0 ?? [0, 0], 2, "texCoords0", true), _Tr2Sprite2dPolygon.#PrepareSource(texCoords1 ?? [0, 0], 2, "texCoords1", true)];
      const count = _Tr2Sprite2dPolygon.#GetCount(sources, 1);
      const transform = _Tr2Sprite2dPolygon.#GetTransform(positionTransform);
      for (let index = 0; index < count; index++) {
        const vertex = new _Tr2Sprite2dVertex();
        const position = _Tr2Sprite2dPolygon.#TransformPosition(sources[0].get(index), transform);
        vec3.set(vertex.position, position[0], position[1], 0);
        vec4.copy(vertex.color, sources[1].get(index));
        vec2.copy(vertex.texCoord[0], sources[2].get(index));
        vec2.copy(vertex.texCoord[1], sources[3].get(index));
        this.vertices.push(vertex);
      }
      this.SetDirty();
    }

    /** Carbon method SetVertices -> PySetVertices (MAP_METHOD). */
    SetVertices(positions = null, positionTransform = null, colors = null, texCoords0 = null, texCoords1 = null) {
      const sources = [_Tr2Sprite2dPolygon.#PrepareSource(positions, 2, "positions"), _Tr2Sprite2dPolygon.#PrepareSource(colors, 4, "colors"), _Tr2Sprite2dPolygon.#PrepareSource(texCoords0, 2, "texCoords0"), _Tr2Sprite2dPolygon.#PrepareSource(texCoords1, 2, "texCoords1")];
      const active = sources.filter(Boolean);
      const count = Math.min(this.vertices.length, _Tr2Sprite2dPolygon.#GetCount(active, this.vertices.length));
      const transform = _Tr2Sprite2dPolygon.#GetTransform(positionTransform);
      for (let index = 0; index < count; index++) {
        const vertex = this.vertices[index];
        if (sources[0]) {
          const position = _Tr2Sprite2dPolygon.#TransformPosition(sources[0].get(index), transform);
          vec3.set(vertex.position, position[0], position[1], 0);
        }
        if (sources[1]) vec4.copy(vertex.color, sources[1].get(index));
        if (sources[2]) vec2.copy(vertex.texCoord[0], sources[2].get(index));
        if (sources[3]) vec2.copy(vertex.texCoord[1], sources[3].get(index));
      }
      this.SetDirty();
    }

    /** Normalizes a constant or per-vertex polygon input. */

    /** Tests whether a value is a finite vector with the requested width. */

    /** Derives the number of vertices available across active sources. */

    /** Validates or supplies the identity 3x3 position transform. */

    /** Applies a row-vector homogeneous 2D transform to a position. */
  }];
  #PrepareSource(value, width, name, required = false) {
    if (value == null) {
      if (required) throw new TypeError(`${name} is required`);
      return null;
    }
    if (_Tr2Sprite2dPolygon.#IsVector(value, width)) {
      return {
        constant: true,
        length: Infinity,
        get: () => value
      };
    }
    if (!Array.isArray(value) || !value.every(item => _Tr2Sprite2dPolygon.#IsVector(item, width))) {
      throw new TypeError(`${name} must be a ${width}-item array or a sequence of them`);
    }
    return {
      constant: false,
      length: value.length,
      get: index => value[index]
    };
  }
  #IsVector(value, width) {
    return value != null && typeof value !== "string" && value.length === width && Array.from(value).every(Number.isFinite);
  }
  #GetCount(sources, constantCount) {
    const varying = sources.filter(source => !source.constant);
    return varying.length ? Math.min(...varying.map(source => source.length)) : constantCount;
  }
  #GetTransform(value) {
    if (value == null) return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    if (!Array.isArray(value) || value.length !== 3 || !value.every(row => _Tr2Sprite2dPolygon.#IsVector(row, 3))) {
      throw new TypeError("positionTransform must be a 3x3 matrix or null");
    }
    return value;
  }
  #TransformPosition(position, matrix) {
    const x = position[0];
    const y = position[1];
    const w = x * matrix[0][2] + y * matrix[1][2] + matrix[2][2];
    const divisor = w || 1;
    return [(x * matrix[0][0] + y * matrix[1][0] + matrix[2][0]) / divisor, (x * matrix[0][1] + y * matrix[1][1] + matrix[2][1]) / divisor];
  }
  constructor() {
    super(_Tr2Sprite2dPolygon), _initClass();
  }
}();

export { _Tr2Sprite2dPolygon as Tr2Sprite2dPolygon };
//# sourceMappingURL=Tr2Sprite2dPolygon.js.map
