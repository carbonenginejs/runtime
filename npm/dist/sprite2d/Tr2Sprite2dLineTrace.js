import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { Tr2TexturedSpriteObject as _Tr2TexturedSpriteObj } from '../generated/sprite2d/Tr2TexturedSpriteObject.js';
import { Tr2Sprite2dLineTraceVertex as _Tr2Sprite2dLineTrace$1 } from './Tr2Sprite2dLineTraceVertex.js';
import { vec2 } from '@carbonenginejs/runtime-utils/vec2';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initProto, _initClass, _init_cornerType, _init_extra_cornerType, _init_isLoop, _init_extra_isLoop, _init_textureOffset, _init_extra_textureOffset, _init_end, _init_extra_end, _init_start, _init_extra_start, _init_vertices, _init_extra_vertices, _init_lineWidth, _init_extra_lineWidth, _init_textureWidth, _init_extra_textureWidth;

/** Stores editable Sprite2D line-strip vertices and validates wrapped append input. */
let _Tr2Sprite2dLineTrace;
new class extends _identity {
  static [class Tr2Sprite2dLineTrace extends _Tr2TexturedSpriteObj {
    static {
      ({
        e: [_init_cornerType, _init_extra_cornerType, _init_isLoop, _init_extra_isLoop, _init_textureOffset, _init_extra_textureOffset, _init_end, _init_extra_end, _init_start, _init_extra_start, _init_vertices, _init_extra_vertices, _init_lineWidth, _init_extra_lineWidth, _init_textureWidth, _init_extra_textureWidth, _initProto],
        c: [_Tr2Sprite2dLineTrace, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2Sprite2dLineTrace",
        family: "sprite2d"
      })], [[[io, io.notify, io, io.readwrite, type, type.int32], 16, "cornerType"], [[io, io.notify, io, io.readwrite, type, type.boolean], 16, "isLoop"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "textureOffset"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "end"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "start"], [[io, io.notify, io, io.read, void 0, type.list("Tr2Sprite2dLineTraceVertex")], 16, "vertices"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "lineWidth"], [[io, io.notify, io, io.readwrite, type, type.float32], 16, "textureWidth"], [[carbon, carbon.method, impl, impl.adapted], 18, "AppendVertices"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetVertices"]], 0, void 0, _Tr2TexturedSpriteObj));
    }
    constructor(...args) {
      super(...args);
      _init_extra_textureWidth(this);
    }
    /** m_cornerType (int) [READWRITE, NOTIFY] */
    cornerType = (_initProto(this), _init_cornerType(this, 0));

    /** m_isLoop (bool) [READWRITE, NOTIFY] */
    isLoop = (_init_extra_cornerType(this), _init_isLoop(this, false));

    /** m_textureOffset (float) [READWRITE, NOTIFY] */
    textureOffset = (_init_extra_isLoop(this), _init_textureOffset(this, 0));

    /** m_end (float) [READWRITE, NOTIFY] */
    end = (_init_extra_textureOffset(this), _init_end(this, 1));

    /** m_start (float) [READWRITE, NOTIFY] */
    start = (_init_extra_end(this), _init_start(this, 0));

    /** m_vertices (PTr2Sprite2dLineTraceVertexVector) [READ, NOTIFY] */
    vertices = (_init_extra_start(this), _init_vertices(this, []));

    /** m_lineWidth (float) [READWRITE, NOTIFY] */
    lineWidth = (_init_extra_vertices(this), _init_lineWidth(this, 1));

    /** m_textureWidth (float) [READWRITE, NOTIFY] */
    textureWidth = (_init_extra_lineWidth(this), _init_textureWidth(this, 1));

    /** Carbon method AppendVertices -> PyAppendVertices (MAP_METHOD). */
    AppendVertices(positions, positionTransform, colors, names = null) {
      const positionSource = _Tr2Sprite2dLineTrace.#PrepareVectorSource(positions, 2, "positions", true);
      const colorSource = _Tr2Sprite2dLineTrace.#PrepareVectorSource(colors, 4, "colors", true);
      const nameSource = _Tr2Sprite2dLineTrace.#PrepareNameSource(names, false);
      const sources = [positionSource, colorSource, nameSource].filter(Boolean);
      const varying = sources.filter(source => !source.constant);
      const count = varying.length ? Math.min(...varying.map(source => source.length)) : 1;
      const transform = _Tr2Sprite2dLineTrace.#GetTransform(positionTransform);
      for (let index = 0; index < count; index++) {
        const vertex = new _Tr2Sprite2dLineTrace$1();
        vec2.copy(vertex.position, _Tr2Sprite2dLineTrace.#TransformPosition(positionSource.get(index), transform));
        vec4.copy(vertex.color, colorSource.get(index));
        if (nameSource) vertex.name = nameSource.get(index);
        this.vertices.push(vertex);
      }
      this.SetDirty();
    }

    /** Carbon method SetVertices -> PySetVertices (MAP_METHOD). */
    SetVertices(positions = null, positionTransform = null, colors = null, names = null) {
      const positionSource = _Tr2Sprite2dLineTrace.#PrepareVectorSource(positions, 2, "positions");
      const colorSource = _Tr2Sprite2dLineTrace.#PrepareVectorSource(colors, 4, "colors");
      const nameSource = _Tr2Sprite2dLineTrace.#PrepareNameSource(names);
      const sources = [positionSource, colorSource, nameSource].filter(Boolean);
      const varying = sources.filter(source => !source.constant);
      const count = Math.min(this.vertices.length, varying.length ? Math.min(...varying.map(source => source.length)) : this.vertices.length);
      const transform = _Tr2Sprite2dLineTrace.#GetTransform(positionTransform);
      for (let index = 0; index < count; index++) {
        const vertex = this.vertices[index];
        if (positionSource) vec2.copy(vertex.position, _Tr2Sprite2dLineTrace.#TransformPosition(positionSource.get(index), transform));
        if (colorSource) vec4.copy(vertex.color, colorSource.get(index));
        if (nameSource) vertex.name = nameSource.get(index);
      }
      this.SetDirty();
    }

    /** Normalizes a constant or per-vertex vector input. */

    /** Normalizes a constant or per-vertex name input. */

    /** Tests whether a value is a finite vector with the requested width. */

    /** Validates or supplies the identity 3x3 position transform. */

    /** Applies a row-vector homogeneous 2D transform to a position. */
  }];
  #PrepareVectorSource(value, width, name, required = false) {
    if (value == null) {
      if (required) throw new TypeError(`${name} is required`);
      return null;
    }
    if (_Tr2Sprite2dLineTrace.#IsVector(value, width)) {
      return {
        constant: true,
        length: Infinity,
        get: () => value
      };
    }
    if (!Array.isArray(value) || !value.every(item => _Tr2Sprite2dLineTrace.#IsVector(item, width))) {
      throw new TypeError(`${name} must be a ${width}-item array or a sequence of them`);
    }
    return {
      constant: false,
      length: value.length,
      get: index => value[index]
    };
  }
  #PrepareNameSource(value, allowConstant = true) {
    if (value == null) return null;
    if (allowConstant && typeof value === "string") return {
      constant: true,
      length: Infinity,
      get: () => value
    };
    if (!Array.isArray(value) || !value.every(item => typeof item === "string")) {
      throw new TypeError("names must be a string or a sequence of strings");
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
  #GetTransform(value) {
    if (value == null) return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    if (!Array.isArray(value) || value.length !== 3 || !value.every(row => _Tr2Sprite2dLineTrace.#IsVector(row, 3))) {
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
    super(_Tr2Sprite2dLineTrace), _initClass();
  }
}();

export { _Tr2Sprite2dLineTrace as Tr2Sprite2dLineTrace };
//# sourceMappingURL=Tr2Sprite2dLineTrace.js.map
