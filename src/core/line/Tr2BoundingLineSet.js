// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Tr2BoundingLineSet.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { Tr2LineSet } from "./Tr2LineSet.js";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";

/** A line set that draws an axis-aligned bounding box and its picking volume. */
@type.define({ className: "Tr2BoundingLineSet", family: "trinityCore" })
export class Tr2BoundingLineSet extends Tr2LineSet
{

  /** m_maxBounds (Vector3) [READWRITE, NOTIFY, PERSIST] */
  @io.notify
  @io.persist
  @type.vec3
  maxBounds = vec3.create();

  /** m_minBounds (Vector3) [READWRITE, NOTIFY, PERSIST] */
  @io.notify
  @io.persist
  @type.vec3
  minBounds = vec3.create();

  /** Carbon method UpdateBounds (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  UpdateBounds(min, max)
  {
    vec3.copy(this.minBounds, min);
    vec3.copy(this.maxBounds, max);
    this.ClearLines();
    this.ClearPickingTriangles();
    this.#AddBox(this.minBounds, this.maxBounds, this.color);
    this.#AddPickingBox(this.minBounds, this.maxBounds);
    return this.SubmitChanges();
  }

  /**
   * Appends the twelve edges of an axis-aligned box.
   */
  #AddBox(min, max, color)
  {
    const minA = vec3.fromValues(max[0], min[1], min[2]);
    const minB = vec3.fromValues(min[0], max[1], min[2]);
    const minC = vec3.fromValues(max[0], max[1], min[2]);
    const maxA = vec3.fromValues(max[0], min[1], max[2]);
    const maxB = vec3.fromValues(min[0], max[1], max[2]);
    const maxC = vec3.fromValues(min[0], min[1], max[2]);
    for (const [from, to] of [[min, minA], [min, minB], [minC, minB], [minA, minC], [max, maxA], [max, maxB], [maxC, maxB], [maxA, maxC], [min, maxC], [max, minC], [minB, maxB], [minA, maxA]])
    {
      this.AddLine(from, color, to, color);
    }
  }

  /**
   * Appends the box's triangles so it can be picked as a solid volume.
   */
  #AddPickingBox(min, max)
  {
    const minA = vec3.fromValues(max[0], min[1], min[2]);
    const minB = vec3.fromValues(min[0], max[1], min[2]);
    const minC = vec3.fromValues(max[0], max[1], min[2]);
    const maxA = vec3.fromValues(max[0], min[1], max[2]);
    const maxB = vec3.fromValues(min[0], max[1], max[2]);
    const maxC = vec3.fromValues(min[0], min[1], max[2]);
    for (const [a, b, c] of [[maxA, max, maxB], [maxA, maxB, maxC], [maxC, maxB, min], [min, maxB, minB], [min, minB, minA], [minA, minB, minC], [minA, minC, max], [minA, max, maxA], [maxA, min, minA], [maxA, maxC, min], [max, minC, minB], [max, minB, maxB]])
    {
      this.AddPickingTriangle(a, b, c);
    }
  }

}
