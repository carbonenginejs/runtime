import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { Tr2PrimitiveSet as _Tr2PrimitiveSet } from './Tr2PrimitiveSet.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initProto, _initClass, _init_lines, _init_extra_lines, _init_maxCurrentLineCount, _init_extra_maxCurrentLineCount, _init_currentSubmittedLineCount, _init_extra_currentSubmittedLineCount, _init_pickingVertexDeclHandle, _init_extra_pickingVertexDeclHandle, _init_pickingVertexBuffer, _init_extra_pickingVertexBuffer, _init_triangles, _init_extra_triangles, _init_maxCurrentTriangleCount, _init_extra_maxCurrentTriangleCount, _init_currentSubmittedTriangleCount, _init_extra_currentSubmittedTriangleCount;

/** A set of coloured lines with an accompanying picking-triangle list, submitted as one buffer. */
let _Tr2LineSet;
class Tr2LineSet extends _Tr2PrimitiveSet {
  static {
    ({
      e: [_init_lines, _init_extra_lines, _init_maxCurrentLineCount, _init_extra_maxCurrentLineCount, _init_currentSubmittedLineCount, _init_extra_currentSubmittedLineCount, _init_pickingVertexDeclHandle, _init_extra_pickingVertexDeclHandle, _init_pickingVertexBuffer, _init_extra_pickingVertexBuffer, _init_triangles, _init_extra_triangles, _init_maxCurrentTriangleCount, _init_extra_maxCurrentTriangleCount, _init_currentSubmittedTriangleCount, _init_extra_currentSubmittedTriangleCount, _initProto],
      c: [_Tr2LineSet, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2LineSet",
      family: "trinityCore"
    })], [[type.list("LineData"), 0, "lines"], [[type, type.uint32], 16, "maxCurrentLineCount"], [[type, type.uint32], 16, "currentSubmittedLineCount"], [[type, type.uint32], 16, "pickingVertexDeclHandle"], [type.rawStruct("Tr2BufferAL"), 0, "pickingVertexBuffer"], [type.list("Triangle"), 0, "triangles"], [[type, type.uint32], 16, "maxCurrentTriangleCount"], [[type, type.uint32], 16, "currentSubmittedTriangleCount"], [[carbon, carbon.method, impl, impl.adapted], 18, "AddLine"], [[carbon, carbon.method, impl, impl.adapted], 18, "AddPickingTriangle"], [[carbon, carbon.method, impl, impl.implemented], 18, "ClearLines"], [[carbon, carbon.method, impl, impl.implemented], 18, "ClearPickingTriangles"], [[carbon, carbon.method, impl, impl.adapted], 18, "SubmitChanges"], [[impl, impl.adapted], 18, "SetCurrentColor"], [[impl, impl.adapted], 18, "Initialize"]], 0, void 0, _Tr2PrimitiveSet));
  }
  constructor(...args) {
    super(...args);
    _init_extra_currentSubmittedTriangleCount(this);
  }
  /** m_lines (std::vector<LineData>) */
  lines = (_initProto(this), _init_lines(this, []));

  /** m_maxCurrentLineCount (unsigned int) */
  maxCurrentLineCount = (_init_extra_lines(this), _init_maxCurrentLineCount(this, 0));

  /** m_currentSubmittedLineCount (unsigned int) */
  currentSubmittedLineCount = (_init_extra_maxCurrentLineCount(this), _init_currentSubmittedLineCount(this, 0));

  /** m_pickingVertexDeclHandle (unsigned int) */
  pickingVertexDeclHandle = (_init_extra_currentSubmittedLineCount(this), _init_pickingVertexDeclHandle(this, 0));

  /** m_pickingVertexBuffer (Tr2BufferAL) */
  pickingVertexBuffer = (_init_extra_pickingVertexDeclHandle(this), _init_pickingVertexBuffer(this, null));

  /** m_triangles (std::vector<Triangle>) */
  triangles = (_init_extra_pickingVertexBuffer(this), _init_triangles(this, []));

  /** m_maxCurrentTriangleCount (unsigned int) */
  maxCurrentTriangleCount = (_init_extra_triangles(this), _init_maxCurrentTriangleCount(this, 0));

  /** m_currentSubmittedTriangleCount (unsigned int) */
  currentSubmittedTriangleCount = (_init_extra_maxCurrentTriangleCount(this), _init_currentSubmittedTriangleCount(this, 0));

  /** Carbon method AddLine (MAP_METHOD_AND_WRAP). */
  AddLine(position1, color1, position2, color2) {
    this.lines.push({
      position1: vec3.clone(position1),
      color1: vec4.clone(color1),
      position2: vec3.clone(position2),
      color2: vec4.clone(color2)
    });
  }

  /** Carbon method AddPickingTriangle (MAP_METHOD_AND_WRAP). */
  /**
   * Appends a triangle to the picking list that accompanies the lines.
   */
  AddPickingTriangle(position1, position2, position3) {
    this.triangles.push({
      position1: vec3.clone(position1),
      position2: vec3.clone(position2),
      position3: vec3.clone(position3)
    });
  }

  /** Carbon method ClearLines (MAP_METHOD_AND_WRAP). */
  ClearLines() {
    this.lines.length = 0;
  }

  /** Carbon method ClearPickingTriangles (MAP_METHOD_AND_WRAP). */
  /**
   * Empties the picking-triangle list, leaving the lines intact.
   */
  ClearPickingTriangles() {
    this.triangles.length = 0;
  }

  /** Carbon method SubmitChanges (MAP_METHOD_AND_WRAP). */
  SubmitChanges() {
    this.maxCurrentLineCount = Math.max(this.maxCurrentLineCount, this.lines.length);
    this.maxCurrentTriangleCount = Math.max(this.maxCurrentTriangleCount, this.triangles.length);
    this.currentSubmittedLineCount = this.lines.length;
    this.currentSubmittedTriangleCount = this.triangles.length;
    return true;
  }

  /**
   * Sets the colour subsequently added lines take by default.
   */
  SetCurrentColor(color) {
    for (const line of this.lines) {
      vec4.copy(line.color1, color);
      vec4.copy(line.color2, color);
    }
    this.SubmitChanges();
  }

  /**
   * Resets the line and picking-triangle lists.
   */
  Initialize() {
    return this.SubmitChanges();
  }
  static {
    _initClass();
  }
}

export { _Tr2LineSet as Tr2LineSet };
//# sourceMappingURL=Tr2LineSet.js.map
