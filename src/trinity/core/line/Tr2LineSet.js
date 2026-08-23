// Source: trinity/trinity/Tr2LineSet.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, type } from "#schema";
import { Tr2PrimitiveSet } from "./Tr2PrimitiveSet.js";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";

/** A set of coloured lines with an accompanying picking-triangle list, submitted as one buffer. */
@type.define({ className: "Tr2LineSet", family: "trinityCore" })
export class Tr2LineSet extends Tr2PrimitiveSet
{

  /** m_lines (std::vector<LineData>) */
  @type.list("LineData")
  lines = [];

  /** m_maxCurrentLineCount (unsigned int) */
  @type.uint32
  maxCurrentLineCount = 0;

  /** m_currentSubmittedLineCount (unsigned int) */
  @type.uint32
  currentSubmittedLineCount = 0;

  /** m_pickingVertexDeclHandle (unsigned int) */
  @type.uint32
  pickingVertexDeclHandle = 0;

  /** m_pickingVertexBuffer (Tr2BufferAL) */
  @type.rawStruct("Tr2BufferAL")
  pickingVertexBuffer = null;

  /** m_triangles (std::vector<Triangle>) */
  @type.list("Triangle")
  triangles = [];

  /** m_maxCurrentTriangleCount (unsigned int) */
  @type.uint32
  maxCurrentTriangleCount = 0;

  /** m_currentSubmittedTriangleCount (unsigned int) */
  @type.uint32
  currentSubmittedTriangleCount = 0;

  /** Carbon method AddLine (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  AddLine(position1, color1, position2, color2)
  {
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
  @carbon.method
  @impl.adapted
  AddPickingTriangle(position1, position2, position3)
  {
    this.triangles.push({
      position1: vec3.clone(position1),
      position2: vec3.clone(position2),
      position3: vec3.clone(position3)
    });
  }

  /** Carbon method ClearLines (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  ClearLines()
  {
    this.lines.length = 0;
  }

  /** Carbon method ClearPickingTriangles (MAP_METHOD_AND_WRAP). */
  /**
   * Empties the picking-triangle list, leaving the lines intact.
   */
  @carbon.method
  @impl.implemented
  ClearPickingTriangles()
  {
    this.triangles.length = 0;
  }

  /** Carbon method SubmitChanges (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  SubmitChanges()
  {
    this.maxCurrentLineCount = Math.max(this.maxCurrentLineCount, this.lines.length);
    this.maxCurrentTriangleCount = Math.max(this.maxCurrentTriangleCount, this.triangles.length);
    this.currentSubmittedLineCount = this.lines.length;
    this.currentSubmittedTriangleCount = this.triangles.length;
    return true;
  }

  /**
   * Sets the colour subsequently added lines take by default.
   */
  @impl.adapted
  SetCurrentColor(color)
  {
    for (const line of this.lines)
    {
      vec4.copy(line.color1, color);
      vec4.copy(line.color2, color);
    }
    this.SubmitChanges();
  }

  /**
   * Resets the line and picking-triangle lists.
   */
  @impl.adapted
  Initialize()
  {
    return this.SubmitChanges();
  }

}
