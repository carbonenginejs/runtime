import { IInitialize } from "../../../global/blue/IInitialize.js";
// Source: trinity/trinity/Tr2SolidSet.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta } from "#schema";
import { Tr2PrimitiveSet } from "./Tr2PrimitiveSet.js";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";

/** A set of coloured triangles with a running centre of mass, submitted as one buffer. */
@meta.define({ className: "Tr2SolidSet", family: "trinityCore" })
@meta.blue.inherit(IInitialize)
@meta.blue.mapInterface(IInitialize)
export class Tr2SolidSet extends Tr2PrimitiveSet
{

  /** m_triangles (std::vector<TriangleData>) */
  @meta.type.list("TriangleData")
  triangles = [];

  /** m_maxCurrentTriangleCount (unsigned int) */
  @meta.type.uint32
  maxCurrentTriangleCount = 0;

  /** m_currentSubmittedTriangleCount (unsigned int) */
  @meta.type.uint32
  currentSubmittedTriangleCount = 0;

  /** Carbon method AddTriangle (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.adapted
  AddTriangle(position1, color1, position2, color2, position3, color3)
  {
    const dir13 = vec3.subtract(vec3.create(), position1, position3);
    const dir21 = vec3.subtract(vec3.create(), position2, position1);
    const normal = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), dir13, dir21));
    this.triangles.push({
      position1: vec3.clone(position1),
      color1: vec4.clone(color1),
      position2: vec3.clone(position2),
      color2: vec4.clone(color2),
      position3: vec3.clone(position3),
      color3: vec4.clone(color3),
      normal
    });
  }

  /** Carbon method ClearTriangles (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.implemented
  ClearTriangles()
  {
    this.triangles.length = 0;
  }

  /** Carbon method SubmitChanges (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.adapted
  SubmitChanges()
  {
    this.maxCurrentTriangleCount = Math.max(this.maxCurrentTriangleCount, this.triangles.length);
    this.currentSubmittedTriangleCount = this.triangles.length;
    return true;
  }

  /**
   * Sets the colour subsequently added triangles take by default.
   */
  @meta.adapted
  SetCurrentColor(color)
  {
    for (const triangle of this.triangles)
    {
      vec4.copy(triangle.color1, color);
      vec4.copy(triangle.color2, color);
      vec4.copy(triangle.color3, color);
    }
    this.SubmitChanges();
  }

  /**
   * Resets the triangle list and its accumulated centre of mass.
   */
  @meta.adapted
  Initialize()
  {
    return this.SubmitChanges();
  }

  /**
   * The average position of every triangle vertex added so far.
   */
  @meta.implemented
  GetCenterOfMass(out = vec3.create())
  {
    vec3.set(out, 0, 0, 0);
    if (!this.triangles.length) return out;
    for (const triangle of this.triangles)
    {
      vec3.add(out, out, triangle.position1);
      vec3.add(out, out, triangle.position2);
      vec3.add(out, out, triangle.position3);
    }
    return vec3.scale(out, out, 1 / (this.triangles.length * 3));
  }

}
