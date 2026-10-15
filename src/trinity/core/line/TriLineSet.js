// Source: trinity/trinity/TriLineSet.h
// Source: trinity/trinity/TriLineSet.cpp
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta, type, blue } from "#schema";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { Topology } from "#consts/render-context";
import { TriDebugResourceHelper } from "../TriDebugResourceHelper.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../context/Tr2RenderContext.js";


/** TriDebugResourceHelper::VertexPosColor: a float3 position and a packed colour, 16 bytes. */
const VERTEX_POS_COLOR_SIZE = 16;

/** Carbon's cap on a line set's vertices (cpp:32-36). */
const MAX_VERTICES = 100000;


/** A debug line set that builds boxes, spheres, cylinders and cones out of coloured line segments. */
@blue.define("TriLineSet")
export class TriLineSet
{

  @type.uint32
  defaultColor = 0xffffffff;

  /** m_vertices: { position, color } records, the colour already swizzled. */
  @type.list("TriDebugVertexPosColor")
  vertices = [];

  /** m_zEnable (bool) [READWRITE] */
  @blue.readwrite
  @type.boolean
  zEnable = true;

  /** m_transform (Matrix) [READWRITE] */
  @blue.readwrite
  @type.mat4
  transform = mat4.create();

  /** The VertexPosColor bytes SubmitGeometry draws from, grown with the vertex count. */
  _staging = new ArrayBuffer(0);

  /** Carbon AddDefaultColor (cpp:30-47): one line in the default colour; ignored past the vertex cap. */
  @meta.implemented
  AddDefaultColor(from, to)
  {
    this.Add(from, this.defaultColor, to, this.defaultColor);
  }

  /** Carbon Add (cpp:49-66): one line with a colour at each end; ignored past the vertex cap. */
  @blue.method
  @meta.implemented
  Add(from, colorFrom, to, colorTo)
  {
    if (this.vertices.length + 2 > MAX_VERTICES) return;
    this.vertices.push(
      { position: vec3.clone(from), color: TriLineSet._SwizzleColor(colorFrom) },
      { position: vec3.clone(to), color: TriLineSet._SwizzleColor(colorTo) }
    );
  }

  /** Carbon AddTransformed (cpp:68-75): one line with both ends taken through a transform first. */
  @meta.implemented
  AddTransformed(transform, from, colorFrom, to, colorTo)
  {
    const { vec3_0, vec3_1 } = TriLineSet.scratch;
    this.Add(vec3.transformMat4(vec3_0, from, transform), colorFrom, vec3.transformMat4(vec3_1, to, transform), colorTo);
  }

  /** Carbon AddSphere (cpp:77-143): rings of latitude and longitude, at least four segments, even. */
  @blue.method
  @meta.implemented
  AddSphere(center, radius, segments, color = 0xffffffff)
  {
    if (segments < 4) segments = 4;
    if (segments % 2 === 1) ++segments;
    const step = Math.PI * 2 / segments;
    const halfStep = step * 0.5;
    // vec3_0 is from, vec3_1 is to, vec3_2 is nextTo.
    const { vec3_0, vec3_1, vec3_2 } = TriLineSet.scratch;
    let curRadius = 0;
    let curY = 0;
    for (let i = 0; i < segments; ++i)
    {
      const nextRadius = Math.sin(i * halfStep) * radius;
      const nextY = Math.cos(i * halfStep) * radius;
      for (let j = 0; j < segments; ++j)
      {
        const t0 = j * step;
        const t1 = t0 + step;
        vec3.set(vec3_0, Math.sin(t0) * curRadius + center[0], center[1] - curY, Math.cos(t0) * curRadius + center[2]);
        vec3.set(vec3_1, Math.sin(t1) * curRadius + center[0], vec3_0[1], Math.cos(t1) * curRadius + center[2]);
        this.Add(vec3_0, color, vec3_1, color);

        vec3.set(vec3_2, center[0] + Math.sin(t0) * nextRadius, center[1] - nextY, center[2] + Math.cos(t0) * nextRadius);
        this.Add(vec3_0, color, vec3_2, color);

        vec3_0[1] = center[1] + curY;
        vec3_1[1] = vec3_0[1];
        this.Add(vec3_0, color, vec3_1, color);

        vec3_2[1] = center[1] + nextY;
        this.Add(vec3_0, color, vec3_2, color);
      }
      curRadius = nextRadius;
      curY = nextY;
    }
  }

  /**
   * Carbon AddCylinder (cpp:145-223): a frame along end -> start, scaled by radius and length, then for each segment
   * a side line, lines to the two end points, and the two rim edges.
   */
  @meta.implemented
  AddCylinder(start, end, radius, segments, color = 0xffffffff)
  {
    // vec3_0 is from, vec3_1 is to, vec3_2 is from2, vec3_3 is to2.
    const { vec3_0, vec3_1, vec3_2, vec3_3, mat4_0 } = TriLineSet.scratch;
    const m = TriLineSet._RoundFrame(mat4_0, start, end, radius);
    if (segments < 4) segments = 4;
    if (segments % 2 === 1) ++segments;
    const step = Math.PI * 2 / segments;
    for (let i = 0; i < segments; ++i)
    {
      const x = Math.cos(i * step), y = Math.sin(i * step);
      vec3.transformMat4(vec3_0, vec3.set(vec3_0, x, y, 0), m);
      vec3.transformMat4(vec3_1, vec3.set(vec3_1, x, y, 1), m);
      this.Add(vec3_0, color, vec3_1, color);
      this.Add(vec3_0, color, end, color);
      this.Add(vec3_1, color, start, color);

      const x2 = Math.cos(i * step + step), y2 = Math.sin(i * step + step);
      vec3.transformMat4(vec3_2, vec3.set(vec3_2, x2, y2, 0), m);
      vec3.transformMat4(vec3_3, vec3.set(vec3_3, x2, y2, 1), m);
      this.Add(vec3_0, color, vec3_2, color);
      this.Add(vec3_1, color, vec3_3, color);
    }
  }

  /**
   * Carbon AddCone (cpp:225-303): the cylinder's frame with every top point at the apex (start). Carbon quirk, kept:
   * it still adds the apex-to-start and apex-to-apex lines, which have zero length.
   */
  @meta.implemented
  AddCone(start, end, radius, segments, color = 0xffffffff)
  {
    // vec3_0 is from, vec3_1 is to, vec3_2 is from2, vec3_3 is to2.
    const { vec3_0, vec3_1, vec3_2, vec3_3, mat4_0 } = TriLineSet.scratch;
    const m = TriLineSet._RoundFrame(mat4_0, start, end, radius);
    if (segments < 4) segments = 4;
    if (segments % 2 === 1) ++segments;
    const step = Math.PI * 2 / segments;
    for (let i = 0; i < segments; ++i)
    {
      const x = Math.cos(i * step), y = Math.sin(i * step);
      vec3.transformMat4(vec3_0, vec3.set(vec3_0, x, y, 0), m);
      vec3.transformMat4(vec3_1, vec3.set(vec3_1, 0, 0, 1), m);
      this.Add(vec3_0, color, vec3_1, color);
      this.Add(vec3_0, color, end, color);
      this.Add(vec3_1, color, start, color);

      const x2 = Math.cos(i * step + step), y2 = Math.sin(i * step + step);
      vec3.transformMat4(vec3_2, vec3.set(vec3_2, x2, y2, 0), m);
      vec3.transformMat4(vec3_3, vec3.set(vec3_3, 0, 0, 1), m);
      this.Add(vec3_0, color, vec3_2, color);
      this.Add(vec3_1, color, vec3_3, color);
    }
  }

  /** Carbon AddBox (cpp:305-328): the twelve edges of an axis-aligned box. */
  @blue.method
  @meta.implemented
  AddBox(min, max, color = 0xffffffff)
  {
    // vec3_0 is minA, vec3_1 is minB, vec3_2 is minC, vec3_3 is maxA, vec3_4 is maxB, vec3_5 is maxC.
    const { vec3_0, vec3_1, vec3_2, vec3_3, vec3_4, vec3_5 } = TriLineSet.scratch;
    TriLineSet._BoxCorners(min, max, vec3_0, vec3_1, vec3_2, vec3_3, vec3_4, vec3_5);
    this._AddBoxEdges(min, max, vec3_0, vec3_1, vec3_2, vec3_3, vec3_4, vec3_5, color, null);
  }

  /** Carbon's AddOrientedBox( transform, min, max, color ) (cpp:330-353): AddBox's edges through a transform. */
  @meta.implemented
  AddOrientedBox__MinMax(transform, min, max, color)
  {
    // vec3_0 is minA, vec3_1 is minB, vec3_2 is minC, vec3_3 is maxA, vec3_4 is maxB, vec3_5 is maxC.
    const { vec3_0, vec3_1, vec3_2, vec3_3, vec3_4, vec3_5 } = TriLineSet.scratch;
    TriLineSet._BoxCorners(min, max, vec3_0, vec3_1, vec3_2, vec3_3, vec3_4, vec3_5);
    this._AddBoxEdges(min, max, vec3_0, vec3_1, vec3_2, vec3_3, vec3_4, vec3_5, color, transform);
  }

  /** Carbon's AddOrientedBox( boxMatrix, color ) (cpp:355-389): the unit box's corners through boxMatrix. */
  @meta.implemented
  AddOrientedBox(boxMatrix, color)
  {
    // vec3_0 is minA, vec3_1 is minB, vec3_2 is minC, vec3_3 is maxA, vec3_4 is maxB, vec3_5 is maxC, vec3_6 is min, vec3_7 is max.
    const { vec3_0, vec3_1, vec3_2, vec3_3, vec3_4, vec3_5, vec3_6, vec3_7 } = TriLineSet.scratch;
    vec3.transformMat4(vec3_6, vec3.set(vec3_6, -1, -1, -1), boxMatrix);
    vec3.transformMat4(vec3_0, vec3.set(vec3_0, 1, -1, -1), boxMatrix);
    vec3.transformMat4(vec3_1, vec3.set(vec3_1, -1, 1, -1), boxMatrix);
    vec3.transformMat4(vec3_2, vec3.set(vec3_2, 1, 1, -1), boxMatrix);
    vec3.transformMat4(vec3_7, vec3.set(vec3_7, 1, 1, 1), boxMatrix);
    vec3.transformMat4(vec3_3, vec3.set(vec3_3, 1, -1, 1), boxMatrix);
    vec3.transformMat4(vec3_4, vec3.set(vec3_4, -1, 1, 1), boxMatrix);
    vec3.transformMat4(vec3_5, vec3.set(vec3_5, -1, -1, 1), boxMatrix);
    this._AddBoxEdges(vec3_6, vec3_7, vec3_0, vec3_1, vec3_2, vec3_3, vec3_4, vec3_5, color, null);
  }

  /** Carbon Clear (cpp:391-394). */
  @blue.method
  @meta.implemented
  Clear()
  {
    this.vertices.length = 0;
  }

  /** Carbon SetCurrentColor (cpp:396-404): recolours every vertex. */
  @blue.method
  @meta.implemented
  SetCurrentColor(color)
  {
    const value = TriLineSet._SwizzleColor(color);
    for (const vertex of this.vertices) vertex.color = value;
  }

  /** Carbon SetDefaultColor (TriLineSet.h:42-45). */
  @blue.method
  @meta.implemented
  SetDefaultColor(color)
  {
    this.defaultColor = color >>> 0;
  }

  /**
   * Carbon Render (cpp:406-418): with vertices, applies the debug position-and-colour declaration, sets the world
   * transform, and renders the debug line effect with this set as its geometry.
   * @param {Tr2RenderContext} renderContext The render context.
   */
  @meta.implemented
  Render(renderContext)
  {
    if (!this.vertices.length) return;
    const helper = TriDebugResourceHelper.g_debugResourceHelper();
    renderContext.GetEffectStateManager().ApplyVertexDeclaration(helper.GetVertexPosColorDecl());
    renderContext.SetWorldTransform(this.transform);
    helper.GetLineEffect().Render(this, renderContext);
  }

  /** Carbon SubmitGeometry (cpp:420-430): the vertices as a line list, drawn from memory. */
  @meta.implemented
  SubmitGeometry(renderContext)
  {
    const numLines = this.vertices.length / 2;
    renderContext.SetTopology(Topology.TOP_LINES);
    renderContext.DrawPrimitiveUP(numLines, this._Pack(), VERTEX_POS_COLOR_SIZE);
  }

  /** Carbon AddLines (cpp:432-438): each pair in the default colour. */
  @blue.method
  @meta.implemented
  AddLines(lines)
  {
    for (const [ from, to ] of lines) this.AddDefaultColor(from, to);
  }

  /** Carbon RenderFromScript (cpp:440-444), Blue's Render: renders on the main-thread render context. */
  @meta.renamed("Render")
  @meta.implemented
  RenderFromScript()
  {
    this.Render(Tr2RenderContext_GetMainThreadRenderContext());
  }

  /** The vertices as packed VertexPosColor bytes: float3 position, then the colour word. */
  _Pack()
  {
    const bytes = this.vertices.length * VERTEX_POS_COLOR_SIZE;
    if (this._staging.byteLength < bytes) this._staging = new ArrayBuffer(bytes); // alloc: grows with the vertex count
    const floats = new Float32Array(this._staging, 0, bytes / 4); // alloc: view over the staging bytes
    const words = new Uint32Array(this._staging, 0, bytes / 4); // alloc: view over the staging bytes
    for (let index = 0; index < this.vertices.length; index++)
    {
      const vertex = this.vertices[index], offset = index * 4;
      floats[offset] = vertex.position[0];
      floats[offset + 1] = vertex.position[1];
      floats[offset + 2] = vertex.position[2];
      words[offset + 3] = vertex.color;
    }
    return new Uint8Array(this._staging, 0, bytes); // alloc: the draw's byte view
  }

  /** AddBox's twelve edges, each end through transform when one is given (AddTransformed), else as is (Add). */
  _AddBoxEdges(min, max, minA, minB, minC, maxA, maxB, maxC, color, transform)
  {
    const add = transform === null
      ? (from, to) => this.Add(from, color, to, color)
      : (from, to) => this.AddTransformed(transform, from, color, to, color);
    add(min, minA);
    add(min, minB);
    add(minC, minB);
    add(minA, minC);

    add(max, maxA);
    add(max, maxB);
    add(maxC, maxB);
    add(maxA, maxC);

    add(min, maxC);
    add(max, minC);
    add(minB, maxB);
    add(minA, maxA);
  }

  /** The six box corners AddBox and AddOrientedBox name minA..maxC (cpp:307-312). */
  static _BoxCorners(min, max, minA, minB, minC, maxA, maxB, maxC)
  {
    vec3.set(minA, max[0], min[1], min[2]);
    vec3.set(minB, min[0], max[1], min[2]);
    vec3.set(minC, max[0], max[1], min[2]);
    vec3.set(maxA, max[0], min[1], max[2]);
    vec3.set(maxB, min[0], max[1], max[2]);
    vec3.set(maxC, min[0], min[1], max[2]);
  }

  /**
   * The cylinder and cone frame (cpp:147-185): z along end -> start, x = normalize(cross(up, z)) with up +Y unless z
   * is nearly vertical, y = cross(z, x), translated to end, then Carbon's ScalingMatrix( radius, radius, length ) * m,
   * which applies the scale first: gl-matrix multiply( out, m, scale ).
   */
  static _RoundFrame(out, start, end, radius)
  {
    // vec3_8 is z, vec3_9 is up, vec3_10 is x, vec3_11 is y.
    const { vec3_8, vec3_9, vec3_10, vec3_11, mat4_1 } = TriLineSet.scratch;
    vec3.subtract(vec3_8, start, end);
    const length = vec3.length(vec3_8);
    vec3.scale(vec3_8, vec3_8, 1 / length);
    vec3.set(vec3_9, 0, 1, 0);
    if (Math.abs(vec3_8[1]) > 0.99) vec3.set(vec3_9, 1, 0, 0);
    vec3.normalize(vec3_10, vec3.cross(vec3_10, vec3_9, vec3_8));
    vec3.cross(vec3_11, vec3_8, vec3_10);
    mat4.set(out, vec3_10[0], vec3_10[1], vec3_10[2], 0, vec3_11[0], vec3_11[1], vec3_11[2], 0, vec3_8[0], vec3_8[1], vec3_8[2], 0, end[0], end[1], end[2], 1);
    const scale = mat4.fromScaling(mat4_1, vec3.set(vec3_9, radius, radius, length));
    return mat4.multiply(out, out, scale);
  }

  /** Carbon's SwizzleColor (cpp:19-22): RGBA to BGRA, swapping the red and blue bytes. */
  static _SwizzleColor(color)
  {
    const value = color >>> 0;
    return (((value & 0xff0000) >>> 16) | (value & 0xff00ff00) | ((value & 0xff) << 16)) >>> 0;
  }

  static scratch = {
    vec3_0: vec3.create(), vec3_1: vec3.create(), vec3_2: vec3.create(), vec3_3: vec3.create(),
    vec3_4: vec3.create(), vec3_5: vec3.create(), vec3_6: vec3.create(), vec3_7: vec3.create(),
    vec3_8: vec3.create(), vec3_9: vec3.create(), vec3_10: vec3.create(), vec3_11: vec3.create(),
    mat4_0: mat4.create(), mat4_1: mat4.create()
  };
}
