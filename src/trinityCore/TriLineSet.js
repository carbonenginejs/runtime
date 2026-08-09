// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/TriLineSet.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";


function swizzleColor(color)
{
  const value = Number(color) >>> 0;
  return (((value & 0xff0000) >>> 16) | (value & 0xff00ff00) | ((value & 0xff) << 16)) >>> 0;
}

/** A debug line set that builds boxes, spheres, cylinders and cones out of coloured line segments. */
@type.define({ className: "TriLineSet", family: "trinityCore" })
export class TriLineSet extends CjsModel
{

  @type.uint32
  defaultColor = 0xffffffff;

  @type.list("TriDebugVertexPosColor")
  vertices = [];

  /** m_zEnable (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  zEnable = true;

  /** m_transform (Matrix) [READWRITE] */
  @io.readwrite
  @type.mat4
  transform = mat4.create();

  /** Carbon method Add (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  Add(from, fromColor, to, toColor)
  {
    if (this.vertices.length + 2 > 100000) return false;
    this.vertices.push(
      { position: vec3.clone(from), color: swizzleColor(fromColor) },
      { position: vec3.clone(to), color: swizzleColor(toColor) }
    );
    return true;
  }

  /** Carbon method AddBox (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  AddBox(min, max, color = 0xffffffff)
  {
    const minA = vec3.fromValues(max[0], min[1], min[2]);
    const minB = vec3.fromValues(min[0], max[1], min[2]);
    const minC = vec3.fromValues(max[0], max[1], min[2]);
    const maxA = vec3.fromValues(max[0], min[1], max[2]);
    const maxB = vec3.fromValues(min[0], max[1], max[2]);
    const maxC = vec3.fromValues(min[0], min[1], max[2]);
    for (const [from, to] of [[min, minA], [min, minB], [minC, minB], [minA, minC], [max, maxA], [max, maxB], [maxC, maxB], [maxA, maxC], [min, maxC], [max, minC], [minB, maxB], [minA, maxA]])
    {
      this.Add(from, color, to, color);
    }
  }

  /** Carbon method AddLines (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  AddLines(lines)
  {
    if (!Array.isArray(lines)) return false;
    const pairs = lines.length && Array.isArray(lines[0]) && lines[0].length === 2 && typeof lines[0][0] !== "number"
      ? lines
      : Array.from({ length: Math.floor(lines.length / 2) }, (_, i) => [lines[i * 2], lines[i * 2 + 1]]);
    for (const [from, to] of pairs)
    {
      if (from && to) this.Add(from, this.defaultColor, to, this.defaultColor);
    }
    return true;
  }

  /** Carbon method AddSphere (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  AddSphere(center, radius, segments, color = 0xffffffff)
  {
    segments = Math.max(4, Math.trunc(Number(segments)) || 0);
    if (segments % 2) segments++;
    const step = Math.PI * 2 / segments;
    const halfStep = step * 0.5;
    let currentRadius = 0;
    let currentY = 0;
    for (let i = 0; i < segments; i++)
    {
      const nextRadius = Math.sin(i * halfStep) * radius;
      const nextY = Math.cos(i * halfStep) * radius;
      for (let j = 0; j < segments; j++)
      {
        const angle = j * step;
        const nextAngle = angle + step;
        const from = vec3.fromValues(
          center[0] + Math.sin(angle) * currentRadius,
          center[1] - currentY,
          center[2] + Math.cos(angle) * currentRadius
        );
        const to = vec3.fromValues(
          center[0] + Math.sin(nextAngle) * currentRadius,
          from[1],
          center[2] + Math.cos(nextAngle) * currentRadius
        );
        const nextTo = vec3.fromValues(
          center[0] + Math.sin(angle) * nextRadius,
          center[1] - nextY,
          center[2] + Math.cos(angle) * nextRadius
        );
        this.Add(from, color, to, color);
        this.Add(from, color, nextTo, color);
        from[1] = center[1] + currentY;
        to[1] = from[1];
        this.Add(from, color, to, color);
        nextTo[1] = center[1] + nextY;
        this.Add(from, color, nextTo, color);
      }
      currentRadius = nextRadius;
      currentY = nextY;
    }
  }

  /**
   * Appends a cylinder as line segments around an axis.
   */
  @impl.adapted
  AddCylinder(start, end, radius, segments, color = 0xffffffff)
  {
    return this.#AddRoundPrimitive(start, end, radius, segments, color, false);
  }

  /**
   * Appends a cone as line segments around an axis.
   */
  @impl.adapted
  AddCone(start, end, radius, segments, color = 0xffffffff)
  {
    return this.#AddRoundPrimitive(start, end, radius, segments, color, true);
  }

  /**
   * Appends the ring and side segments shared by the sphere, cylinder and cone.
   */
  #AddRoundPrimitive(start, end, radius, segments, color, cone)
  {
    const z = vec3.subtract(vec3.create(), start, end);
    const length = vec3.length(z);
    if (!length) return false;
    vec3.scale(z, z, 1 / length);
    const up = Math.abs(z[1]) > 0.99 ? vec3.fromValues(1, 0, 0) : vec3.fromValues(0, 1, 0);
    const xAxis = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), up, z));
    const yAxis = vec3.cross(vec3.create(), z, xAxis);
    const point = (angle, axial) =>
    {
      const out = vec3.clone(end);
      vec3.scaleAndAdd(out, out, xAxis, Math.cos(angle) * radius);
      vec3.scaleAndAdd(out, out, yAxis, Math.sin(angle) * radius);
      return vec3.scaleAndAdd(out, out, z, axial * length);
    };
    segments = Math.max(4, Math.trunc(Number(segments)) || 0);
    if (segments % 2) segments++;
    const step = Math.PI * 2 / segments;
    for (let i = 0; i < segments; i++)
    {
      const from = point(i * step, 0);
      const to = cone ? vec3.clone(start) : point(i * step, 1);
      const from2 = point((i + 1) * step, 0);
      const to2 = cone ? vec3.clone(start) : point((i + 1) * step, 1);
      this.Add(from, color, to, color);
      this.Add(from, color, end, color);
      this.Add(to, color, start, color);
      this.Add(from, color, from2, color);
      this.Add(to, color, to2, color);
    }
    return true;
  }

  /** Carbon method Clear (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  Clear()
  {
    this.vertices.length = 0;
  }

  /** Carbon method Render -> RenderFromScript (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  Render(renderContext = null)
  {
    if (!this.vertices.length || !renderContext?.DrawLineSet) return false;
    return renderContext.DrawLineSet(this);
  }

  /** Carbon method SetCurrentColor (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  SetCurrentColor(color)
  {
    const value = swizzleColor(color);
    for (const vertex of this.vertices) vertex.color = value;
  }

  /** Carbon method SetDefaultColor (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  SetDefaultColor(color)
  {
    this.defaultColor = Number(color) >>> 0;
  }

}
