import { exposure as be } from "#be";
// Source: trinity/trinity/Tr2ManipulationTool.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta, type, blue } from "#schema";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { quat } from "#math/quat";
import { CjsScriptCallback } from "#blue";

/** The interactive manipulator base: axis selection, drag handling and the callback a move reports through. */
@be.define("Tr2ManipulationTool")
export class Tr2ManipulationTool
{
  _moved = false;
  _movement = vec3.create();

  /** Carbon's selected primitive/axis name. */
  @type.string
  selectedAxis = "";

  /** Carbon's move callback (BlueScriptCallback): a CjsScriptCallback, or null. */
  @type.rawStruct("BlueScriptCallback")
  moveCallback = null;

  /** m_captured (bool) [READWRITE] */
  @blue.readwrite
  @type.boolean
  captured = false;

  /** m_primitives (PTr2PrimitiveSetVector) [READ] */
  @blue.read
  @type.list("Tr2PrimitiveSet")
  primitives = [];

  /** m_pythonUserData (PyObject*) [READWRITE] */
  @blue.readwrite
  @type.rootRef("PyObject")
  _userData = null;

  /** m_localTransform (Matrix) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.mat4
  localTransform = mat4.create();

  /** m_pivot (Vector3) [READWRITE] */
  @blue.readwrite
  @type.vec3
  pivot = vec3.create();

  /** m_worldTransform (Matrix) [READ] */
  @blue.read
  @type.mat4
  worldTransform = mat4.create();

  /** Carbon method SetMoveCallback (MAP_METHOD_AND_WRAP). */
  @blue.method
  @meta.adapted
  SetMoveCallback(callback)
  {
    this.moveCallback = CjsScriptCallback.from(callback);
  }

  /** Carbon method SelectAxis (MAP_METHOD_AND_WRAP). */
  @blue.method
  @meta.adapted
  SelectAxis(axisName)
  {
    const vec4_0 = vec4.alloc();
    try
    {
      const selected = this.primitives.filter(primitive => primitive?.name === axisName);
      if (selected.length === 0)
      {
        return false;
      }
      this.ResetPrimitiveColors();
      const yellow = vec4.set(vec4_0, 1, 1, 0.01, 1);
      for (const primitive of selected)
      {
        primitive.SetCurrentColor(yellow);
      }
      this.selectedAxis = axisName;
      return true;
    }
    finally
    {
      vec4.unalloc(vec4_0);
    }
  }

  /** Carbon method Init (MAP_METHOD_AND_WRAP). */
  @blue.method
  @meta.implemented
  Init(initialTransform)
  {
    mat4.copy(this.localTransform, initialTransform);
  }

  /**
   * Carbon GetBaseVectors (Tr2ManipulationTool.cpp): the tool's local basis,
   * each row of the local transform normalised. Row r maps to gl-matrix
   * indices [(r-1)*4 .. (r-1)*4+2].
   *
   * @param {Float32Array} [outX] Caller-owned; allocated when omitted.
   * @param {Float32Array} [outY]
   * @param {Float32Array} [outZ]
   * @returns {[Float32Array, Float32Array, Float32Array]} The three axes.
   */
  @blue.method
  @meta.implemented
  GetBaseVectors(outX = vec3.create(), outY = vec3.create(), outZ = vec3.create())
  {
    const local = this.localTransform;
    vec3.normalize(outX, vec3.set(outX, local[0], local[1], local[2]));
    vec3.normalize(outY, vec3.set(outY, local[4], local[5], local[6]));
    vec3.normalize(outZ, vec3.set(outZ, local[8], local[9], local[10]));
    return [ outX, outY, outZ ];
  }

  /**
   * Required per-frame manipulator update contract (Tr2ManipulationTool.h:37).
   * Carbon's `Update()` takes nothing; every caller and implementer passes the
   * frame context standing in for Carbon's renderer globals.
   *
   * @param {object} _context The frame context.
   */
  @meta.abstract
  Update(_context) {}

  /** Required guide-geometry construction contract (Tr2ManipulationTool.h:38). */
  @meta.abstract
  GenLineSets() {}

  /** Required primitive-colour reset contract (Tr2ManipulationTool.h:39). */
  @meta.abstract
  ResetPrimitiveColors() {}

  /** Required visible-primitive collection contract (Tr2ManipulationTool.h:40). */
  @meta.abstract
  GetPrimitivesToRender() {}

  /**
   * Carbon's pure-virtual `Move( int mouseX, int mouseY, int mouseXDelta, int
   * mouseYDelta, Tr2Viewport& viewport, Matrix& viewMatrix, Matrix&
   * projectionMatrix )` (Tr2ManipulationTool.h:41), exposed through PyMove.
   *
   * @param {number} _mouseX Cursor x.
   * @param {number} _mouseY Cursor y.
   * @param {number} _mouseXDelta Cursor x movement.
   * @param {number} _mouseYDelta Cursor y movement.
   * @param {Tr2Viewport} _viewport The viewport.
   * @param {mat4} _viewMatrix The view matrix.
   * @param {mat4} _projectionMatrix The projection matrix.
   */
  @blue.abstract
  Move(_mouseX, _mouseY, _mouseXDelta, _mouseYDelta, _viewport, _viewMatrix, _projectionMatrix) {}

  /** Invokes Carbon's move veto callback with current and proposed transforms. */
  @meta.adapted
  OnMoveCallback(currentTransform, nextTransform)
  {
    if (!this.moveCallback)
    {
      return true;
    }
    return this.moveCallback.Call(currentTransform, nextTransform) !== false;
  }

  /** Native axis-compatible plane with the largest ray/normal dot product. */
  @meta.implemented
  GetDesiredPlaneNormal(ray, view)
  {
    const [x, y, z] = this.GetBaseVectors();
    if (this.selectedAxis === "x") return Math.abs(vec3.dot(ray, z)) > Math.abs(vec3.dot(ray, y)) ? z : y;
    if (this.selectedAxis === "y") return Math.abs(vec3.dot(ray, z)) > Math.abs(vec3.dot(ray, x)) ? z : x;
    if (this.selectedAxis === "z") return Math.abs(vec3.dot(ray, x)) > Math.abs(vec3.dot(ray, y)) ? x : y;
    return vec3.fromValues(view[2], view[6], view[10]); // alloc: returned plane normal belongs to the caller.
  }

  /** Native projected drag between two intersections on the same plane. */
  @meta.adapted
  MovePointOnPlane(x1, y1, x2, y2, point, normal, viewport, view, projection)
  {
    const first = this.ScreenCoordinatesToRay(x1, y1, viewport, view, projection);
    const second = this.ScreenCoordinatesToRay(x2, y2, viewport, view, projection);
    const start = this.RayToPlaneIntersection(first.start, first.ray, point, normal);
    const end = this.RayToPlaneIntersection(second.start, second.ray, point, normal);
    return vec3.subtract(end, end, start);
  }

  /** Native parallel-ray behavior returns the start point. */
  @meta.adapted
  RayToPlaneIntersection(start, direction, point, normal)
  {
    const denominator = vec3.dot(normal, direction);
    if (Math.abs(denominator) < 1.1920928955078125e-7) return vec3.clone(start); // alloc: returned intersection belongs to the caller.
    const t = (vec3.dot(point, normal) - vec3.dot(start, normal)) / denominator;
    return vec3.scaleAndAdd(vec3.create(), start, direction, t); // alloc: returned intersection belongs to the caller.
  }

  /** Native quadratic intersection, including tangent and behind-camera roots. */
  @meta.adapted
  RayToSphereIntersection(center, radius, start, ray, out)
  {
    const vec3_0 = vec3.alloc();
    try
    {
      const difference = vec3.subtract(vec3.zero(vec3_0), start, center);
      const a = vec3.dot(ray, ray), b = 2 * vec3.dot(ray, difference);
      const c = vec3.dot(difference, difference) - radius * radius, d = b * b - 4 * a * c;
      if (d < 0) return 0;
      out[0] = (-b + Math.sqrt(d)) / (2 * a);
      out[1] = d === 0 ? 0 : (-b - Math.sqrt(d)) / (2 * a);
      return d === 0 ? 1 : 2;
    }
    finally
    {
      vec3.unalloc(vec3_0);
    }
  }

  /** Tool pixels divide by width/height; scene picking uses width/height minus one. */
  @meta.adapted
  ScreenCoordinatesToRay(x, y, viewport, view, projection)
  {
    const mat4_0 = mat4.alloc();
    const mat4_1 = mat4.alloc();
    const vec4_0 = vec4.alloc();
    try
    {
      const inverseProjection = mat4.invert(mat4.identity(mat4_0), projection);
      const inverseView = mat4.invert(mat4.identity(mat4_1), view);
      if (!inverseProjection || !inverseView) throw new RangeError("Tool camera matrices must be invertible.");
      const start = vec3.fromValues(2 * (x - viewport.x) / viewport.width - 1, -2 * (y - viewport.y) / viewport.height + 1, 0); // alloc: start belongs to the returned ray record.
      const end = vec3.clone(start); // alloc: direction belongs to the returned ray record.
      end[2] = 0.5;
      vec3.transformMat4(start, start, inverseProjection);
      vec3.transformMat4(end, end, inverseProjection);
      // Carbon subtracts in view space, then TransformNormal excludes the
      // camera translation. Subtracting float32 world positions loses mouse
      // deltas when the camera is far from the origin.
      vec3.subtract(end, end, start);
      const direction = vec4.set(vec4_0, end[0], end[1], end[2], 0);
      vec4.transformMat4(direction, direction, inverseView);
      vec3.copy(end, direction);
      vec3.transformMat4(start, start, inverseView);
      // Native calls XMVector3Normalize without retaining its return value.
      return { start, ray: end };
    }
    finally
    {
      mat4.unalloc(mat4_0);
      mat4.unalloc(mat4_1);
      vec4.unalloc(vec4_0);
    }
  }

  /** Native projection with viewport offsets, returning its Vector2 output. */
  @meta.adapted
  PointToScreenCoordinates(point, viewport, view, projection)
  {
    const vec4_0 = vec4.alloc();
    try
    {
      const value = vec4.set(vec4_0, point[0], point[1], point[2], 1);
      vec4.transformMat4(value, value, view);
      vec4.transformMat4(value, value, projection);
      return [viewport.x + viewport.width * (0.5 + 0.5 * value[0] / value[3]),
        viewport.y + viewport.height * (0.5 - 0.5 * value[1] / value[3])];
    }
    finally
    {
      vec4.unalloc(vec4_0);
    }
  }

  /** Native triangular prism used to make a line pickable. */
  @meta.adapted
  static getTrianglesAroundLine(start, end, radius)
  {
    const vec3_0 = vec3.alloc();
    const vec3_1 = vec3.alloc();
    const quat_0 = quat.alloc();
    const vec3_2 = vec3.alloc();
    const vec3_3 = vec3.alloc();
    const vec3_4 = vec3.alloc();
    try
    {
      const direction = vec3.normalize(vec3.zero(vec3_0), vec3.subtract(vec3.zero(vec3_1), start, end));
      const rotation = quat.identity(quat_0), dot = direction[2];
      if (Math.abs(dot) !== 1)
      {
        const axis = vec3.normalize(vec3.zero(vec3_2), vec3.cross(vec3.zero(vec3_3), [0, 0, 1], direction));
        quat.setAxisAngle(rotation, axis, Math.acos(dot));
      }
      const a = [], b = [];
      for (let i = 0; i < 3; i++)
      {
        const point = vec3.set(vec3_4, Math.cos(i * Math.PI * 2 / 3) * radius, Math.sin(i * Math.PI * 2 / 3) * radius, 0);
        vec3.transformQuat(point, point, rotation);
        a.push(vec3.add(vec3.create(), point, start)); // alloc: vertex retained in the returned triangle array.
        b.push(vec3.add(vec3.create(), point, end)); // alloc: vertex retained in the returned triangle array.
      }
      return [a[1], b[0], a[0], b[1], b[0], a[1], a[2], b[1], a[1], b[2], b[1], a[2], a[0], b[2], a[2], b[0], b[2], a[0]];
    }
    finally
    {
      vec3.unalloc(vec3_0);
      vec3.unalloc(vec3_1);
      quat.unalloc(quat_0);
      vec3.unalloc(vec3_2);
      vec3.unalloc(vec3_3);
      vec3.unalloc(vec3_4);
    }
  }

  /** Native Y-aligned capped cone triangles, retaining winding. */
  @meta.adapted
  static getConeTriangles(height, width, subdivisions)
  {
    const result = [], step = Math.PI * 2 / subdivisions, top = [0, height, 0];
    for (let i = 0; i < subdivisions; i++)
    {
      const a = [Math.cos(i * step) * width, 0, Math.sin(i * step) * width];
      const b = [Math.cos((i + 1) * step) * width, 0, Math.sin((i + 1) * step) * width];
      result.push(top, b, a, b, [0, 0, 0], a);
    }
    return result;
  }

  /** Native box vertex order and winding. */
  @meta.adapted
  static getBoxTriangles(min, max)
  {
    const a = [max[0], min[1], min[2]], b = [min[0], max[1], min[2]], c = [max[0], max[1], min[2]];
    const d = [max[0], min[1], max[2]], e = [min[0], max[1], max[2]], f = [min[0], min[1], max[2]];
    return [d, max, e, d, e, f, f, e, min, min, e, b, min, b, a, a, b, c, a, c, max, a, max, d, d, min, a, d, f, min, max, c, b, max, b, e];
  }

  /** Native circle fan anchored on its circumference, including degenerate ends. */
  @meta.adapted
  static getCircleTriangles(radius, subdivisions)
  {
    const points = this.getCirclePoints(radius, subdivisions), result = [];
    for (let i = 0; i < points.length; i += 2) result.push([radius, 0, 0], points[i], points[i + 1]);
    return result;
  }

  /** Native XY-plane circle as endpoint pairs. */
  @meta.adapted
  static getCirclePoints(radius, subdivisions)
  {
    const result = [], step = Math.PI * 2 / subdivisions;
    for (let i = 0; i < subdivisions; i++)
      result.push([Math.cos(i * step) * radius, Math.sin(i * step) * radius, 0],
        [Math.cos((i + 1) * step) * radius, Math.sin((i + 1) * step) * radius, 0]);
    return result;
  }

  /**
   * Explicit release of the native tool's owned primitive and effect references.
   *
   * Temporary destructor stand-in: exists because teardown is required before
   * the lifecycle (Destructor) pattern exists. NOT the final mechanism; do not
   * copy this as a pattern. Replaced by the lifecycle API after the IRoot pilot.
   */
  @meta.adapted
  Destruct()
  {
    const effects = new Set();
    for (const primitive of this.primitives)
    {
      if (primitive.effect) effects.add(primitive.effect);
      if (primitive.pickEffect) effects.add(primitive.pickEffect);
      primitive.Destruct();
    }
    for (const effect of effects) effect.Destruct();
    this.primitives.length = 0;
    this.moveCallback = null;
    this.captured = false;
  }

}
