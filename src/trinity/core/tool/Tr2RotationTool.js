// Source: trinity/trinity/Tr2RotationTool.h
// Source: trinity/trinity/Tr2RotationTool.cpp
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta } from "#schema";
import { Tr2ManipulationTool } from "./Tr2ManipulationTool.js";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { Tr2LineSet } from "../line/Tr2LineSet.js";
import { Tr2Effect } from "../../shader/Tr2Effect.js";

const AXIS_COLORS = Object.freeze({
  x: vec4.fromValues(1, 0.01, 0.01, 1),
  y: vec4.fromValues(0.01, 1, 0.01, 1),
  z: vec4.fromValues(0.01, 0.01, 1, 1),
  w: vec4.fromValues(0, 1, 1, 1),
  ww: vec4.fromValues(0.5, 0.5, 0.5, 1)
});

/** Extends the manipulation tool with quaternion rotation state and angular precision. */
@meta.define({ className: "Tr2RotationTool", family: "trinityCore", purpose: "Extends the manipulation tool with quaternion rotation state and angular precision." })
export class Tr2RotationTool extends Tr2ManipulationTool
{
  _angle = 0;

  /** Native constructor creates the five rings and selects screen rotation. */
  constructor()
  {
    super();
    this.GenLineSets();
    this.SelectAxis("w");
  }

  /** Native axis/view/arcball rotation from consecutive plane intersections. */
  @meta.adapted
  Move(x, y, dx, dy, viewport, view, projection)
  {
    const vec3_0 = vec3.alloc();
    const vec3_1 = vec3.alloc();
    const mat4_0 = mat4.alloc();
    const vec3_2 = vec3.alloc();
    const mat4_1 = mat4.alloc();
    try
    {
      if (!dx && !dy) return;
      const position = vec3.set(vec3_0, this.localTransform[12], this.localTransform[13], this.localTransform[14]);
      const current = this.ScreenCoordinatesToRay(x, y, viewport, view, projection);
      const normal = this.GetDesiredPlaneNormal(current.ray, view);
      const previous = this.ScreenCoordinatesToRay(x - dx, y - dy, viewport, view, projection);
      const start = this.RayToPlaneIntersection(previous.start, previous.ray, position, normal);
      const end = this.RayToPlaneIntersection(current.start, current.ray, position, normal);
      vec3.normalize(start, vec3.subtract(start, start, position));
      vec3.normalize(end, vec3.subtract(end, end, position));
      let dot = vec3.dot(start, end), sign = 1;
      if (1 - dot < 1.1920928955078125e-7) return;
      const cross = vec3.cross(vec3.zero(vec3_1), start, end);
      const inverse = mat4.invert(mat4.identity(mat4_0), this.localTransform);
      if (!inverse) return;
      const transformNormal = (out, input, matrix) =>
      {
        const vec4_0 = vec4.alloc();
        try
        {
          const value = vec4.set(vec4_0, input[0], input[1], input[2], 0);
          vec4.transformMat4(value, value, matrix);
          return vec3.set(out, value[0], value[1], value[2]);
        }
        finally
        {
          vec4.unalloc(vec4_0);
        }
      };
      if (this.selectedAxis === "w")
      {
        const viewDirection = [view[2], view[6], view[10]];
        transformNormal(this._movement, viewDirection, inverse);
        const rdot = vec3.dot(this._movement, viewDirection), ddot = vec3.dot(cross, this._movement);
        if (ddot < 0 && rdot > 0 || ddot > 0 && rdot < 0) sign = -1;
      }
      else if (this.selectedAxis === "ww")
      {
        const currentPoint = this.Hemisphere(x, y, viewport, view, projection);
        const previousPoint = this.Hemisphere(x - dx, y - dy, viewport, view, projection);
        const axis = vec3.cross(vec3.zero(vec3_2), previousPoint, currentPoint);
        const inverseView = mat4.invert(mat4.identity(mat4_1), view);
        if (!inverseView) return;
        transformNormal(axis, axis, inverseView);
        transformNormal(this._movement, axis, inverse);
        dot = vec3.dot(currentPoint, previousPoint);
      }
      else
      {
        const index = ["x", "y", "z"].indexOf(this.selectedAxis);
        if (index < 0) return;
        const axis = this.GetBaseVectors()[index];
        vec3.copy(this._movement, this.GetUnTransformedBaseVectors()[index]);
        if (vec3.dot(cross, axis) < 0) sign = -1;
      }
      this._angle = Math.acos(Math.max(-1, Math.min(1, dot))) * sign * this.precision;
      this._moved = true;
    }
    finally
    {
      vec3.unalloc(vec3_0);
      vec3.unalloc(vec3_1);
      mat4.unalloc(mat4_0);
      vec3.unalloc(vec3_2);
      mat4.unalloc(mat4_1);
    }
  }

  /** Native rotation prepends in Carbon and therefore postmultiplies here. */
  @meta.adapted
  Update(context)
  {
    const mat4_0 = mat4.alloc();
    const mat4_1 = mat4.alloc();
    const mat4_2 = mat4.alloc();
    try
    {
      if (this._moved)
      {
        const rotation = mat4.fromRotation(mat4.identity(mat4_0), this._angle, this._movement);
        if (rotation)
        {
          const next = mat4.multiply(mat4.identity(mat4_1), this.localTransform, rotation);
          if (this.OnMoveCallback(this.localTransform, next))
          {
            mat4.copy(this.localTransform, next);
            mat4.getRotation(this.rotation, next);
            vec3.zero(this._movement);
          }
        }
        this._moved = false;
      }
      mat4.multiply(this.worldTransform, mat4.fromTranslation(mat4.identity(mat4_2), this.pivot), this.localTransform);
      for (const primitive of this.primitives)
      {
        mat4.copy(primitive.localTransform, this.localTransform);
        primitive.UpdateTransform(context);
      }
    }
    finally
    {
      mat4.unalloc(mat4_0);
      mat4.unalloc(mat4_1);
      mat4.unalloc(mat4_2);
    }
  }

  /** Native circular arcs, screen ring, arcball disk and thick picking prisms. */
  @meta.adapted
  GenLineSets()
  {
    const mat4_0 = mat4.alloc();
    const mat4_1 = mat4.alloc();
    const mat4_2 = mat4.alloc();
    try
    {
      const sphereEffect = new Tr2Effect(), lineEffect = new Tr2Effect(), pickEffect = new Tr2Effect();
      sphereEffect.SetEffectPathName("res:/Graphics/Effect/Managed/Utility/LinesRotationTool.fx");
      lineEffect.SetEffectPathName("res:/Graphics/Effect/Managed/Utility/LinesNoZ.fx");
      pickEffect.SetEffectPathName("res:/Graphics/Effect/Managed/Utility/PrimitivePicking.fx");
      for (const name of ["ww", "w", "x", "y", "z"])
      {
        const line = new Tr2LineSet(), color = AXIS_COLORS[name];
        line.name = name;
        line.viewOriented = name === "w" || name === "ww";
        line.scaleByDistanceToView = true;
        line.effect = line.viewOriented ? lineEffect : sphereEffect;
        line.pickEffect = pickEffect;
        const radius = name === "w" ? 1.2 : 1;
        const transform = name === "x" ? mat4.fromYRotation(mat4.identity(mat4_0), Math.PI / 2)
          : name === "y" ? mat4.fromXRotation(mat4.identity(mat4_1), Math.PI / 2) : mat4.identity(mat4_2);
        const points = Tr2ManipulationTool.getCirclePoints(radius, 60).map(point => vec3.transformMat4(vec3.create(), point, transform)); // alloc: vertices retained for primitive construction.
        for (let i = 0; i < points.length; i += 2)
        {
          line.AddLine(points[i], color, points[i + 1], color);
          if (name === "ww") continue;
          const triangles = Tr2ManipulationTool.getTrianglesAroundLine(points[i], points[i + 1], 0.08);
          for (let j = 0; j < triangles.length; j += 3) line.AddPickingTriangle(...triangles.slice(j, j + 3));
        }
        if (name === "ww")
        {
          const triangles = Tr2ManipulationTool.getCircleTriangles(1, 60);
          for (let i = 0; i < triangles.length; i += 3) line.AddPickingTriangle(...triangles.slice(i, i + 3));
          this.wwLine = line;
        }
        line.SubmitChanges();
        this.primitives.push(line);
      }
    }
    finally
    {
      mat4.unalloc(mat4_0);
      mat4.unalloc(mat4_1);
      mat4.unalloc(mat4_2);
    }
  }

  /** m_precision (float) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.float32
  precision = 1;

  /** m_rotation (Quaternion) [READ] */
  @meta.blue.read
  @meta.type.quat
  rotation = quat.create();

  /** m_wwLine (Tr2LineSetPtr, Tr2RotationTool.h:33): the screen-space ring
   *  primitive whose scale is the arcball radius, built by GenLineSets. */
  @meta.blue.readwrite
  @meta.type.objectRef("Tr2LineSet")
  wwLine = null;

  /**
   * Carbon GetDesiredPlaneNormal (Tr2RotationTool.cpp:131-165), the rotation
   * tool's override: the best drag plane for the selected gizmo axis. The
   * view direction is the view matrix's third column (_13/_23/_33 -> gl
   * [2],[6],[10]); the screen-space handles ("w"/"ww") use it directly, an
   * axis handle uses that axis flipped toward the camera when
   * Dot(view, axis) > 0. Always normalised.
   *
   * @param {Float32Array} _ray Unused by this override, as in Carbon.
   * @param {Float32Array} viewMatrix
   * @param {Float32Array} [out] Caller-owned; allocated when omitted.
   * @returns {Float32Array} The plane normal.
   */
  @meta.blue.method
  @meta.implemented
  GetDesiredPlaneNormal(_ray, viewMatrix, out = vec3.create())
  {
    vec3.set(Tr2RotationTool.#view, viewMatrix[2], viewMatrix[6], viewMatrix[10]);

    if (this.selectedAxis === "w" || this.selectedAxis === "ww")
    {
      return vec3.normalize(out, vec3.copy(out, Tr2RotationTool.#view));
    }

    const [ xAxis, yAxis, zAxis ] = this.GetBaseVectors(
      Tr2RotationTool.#xAxis, Tr2RotationTool.#yAxis, Tr2RotationTool.#zAxis);
    const axis = this.selectedAxis === "x" ? xAxis : this.selectedAxis === "y" ? yAxis : zAxis;

    vec3.copy(out, axis);
    if (vec3.dot(Tr2RotationTool.#view, out) > 0)
    {
      vec3.negate(out, out);
    }
    return vec3.normalize(out, out);
  }

  /**
   * Carbon GetUnTransformedBaseVectors (Tr2RotationTool.cpp:211-216): the
   * identity axes, the untransformed counterpart to GetBaseVectors.
   */
  @meta.blue.method
  @meta.implemented
  GetUnTransformedBaseVectors(outX = vec3.create(), outY = vec3.create(), outZ = vec3.create())
  {
    vec3.set(outX, 1, 0, 0);
    vec3.set(outY, 0, 1, 0);
    vec3.set(outZ, 0, 0, 1);
    return [ outX, outY, outZ ];
  }

  /**
   * Carbon Hemisphere (Tr2RotationTool.cpp:396-439): maps a mouse position
   * onto the arcball. Projects the gizmo centre and a point one ring-radius
   * along the camera-right axis to derive the ring's pixel radius (plus 16px
   * for the cursor), normalises the mouse offset by it (y screen-inverted),
   * and lifts z as `1 - d` for d <= 1 - a CONE, not a hemisphere, despite
   * the name; transcribed as Carbon computes it. Returns the normalised
   * vector, in view space.
   *
   * Compositions follow the row-vector rule: Carbon's `view * projection`
   * is `mat4.multiply(out, projection, view)` here, and `v * M` is
   * `transformMat4(v, M)` over the shared byte layout.
   *
   * @param {number} mouseX
   * @param {number} mouseY
   * @param {{x:number,y:number,width:number,height:number}} viewport Tr2Viewport's m_x/m_y/m_width/m_height.
   * @param {Float32Array} viewMatrix
   * @param {Float32Array} projectionMatrix
   * @param {Float32Array} [out] Caller-owned; allocated when omitted.
   * @returns {Float32Array} The arcball vector.
   */
  @meta.blue.method
  @meta.implemented
  Hemisphere(mouseX, mouseY, viewport, viewMatrix, projectionMatrix, out = vec3.create())
  {
    const viewProj = mat4.multiply(Tr2RotationTool.#viewProj, projectionMatrix, viewMatrix);

    const project = (point, screen) =>
    {
      const projected = vec4.transformMat4(
        Tr2RotationTool.#projected,
        vec4.set(Tr2RotationTool.#projected, point[0], point[1], point[2], 1),
        viewProj);
      screen[0] = viewport.x + viewport.width * (0.5 + 0.5 * projected[0] / projected[3]);
      screen[1] = viewport.y + viewport.height * (0.5 - 0.5 * projected[1] / projected[3]);
      return screen;
    };

    // The ring radius comes from the ww line primitive's scale (cpp:412).
    const radius = this.wwLine.scale;
    const world = this.worldTransform;
    const center = vec3.set(Tr2RotationTool.#center, world[12], world[13], world[14]);
    // viewMatrix._11/_21/_31 is the view matrix's first column: camera right.
    const side = vec3.set(Tr2RotationTool.#side,
      center[0] - viewMatrix[0] * radius,
      center[1] - viewMatrix[4] * radius,
      center[2] - viewMatrix[8] * radius);

    const screenCenter = project(center, Tr2RotationTool.#screenCenter);
    const screenSide = project(side, Tr2RotationTool.#screenSide);
    const dx = screenCenter[0] - screenSide[0];
    const dy = screenCenter[1] - screenSide[1];
    // "add the width of the cursor" (cpp:424).
    const radiusPixels = Math.sqrt(dx * dx + dy * dy) + 16;

    const px = (mouseX - screenCenter[0]) / radiusPixels;
    const py = (screenCenter[1] - mouseY) / radiusPixels;
    const d = Math.sqrt(px * px + py * py);
    const z = d <= 1 ? 1 - d : 0;

    return vec3.normalize(out, vec3.set(out, px, py, z));
  }

  /**
   * Returns all authored rotation primitives in their stored order.
   *
   * Adapted: JavaScript returns a fresh array instead of Carbon's reused private
   * visible-object vector.
   */
  @meta.blue.method
  @meta.adapted
  GetPrimitivesToRender()
  {
    return Array.from(this.primitives);
  }

  /** Restores Carbon's authored axis and ring colours. */
  @meta.blue.method
  @meta.implemented
  ResetPrimitiveColors()
  {
    for (const primitive of this.primitives)
    {
      const color = AXIS_COLORS[primitive.name];
      if (color)
      {
        primitive.SetCurrentColor(color);
      }
    }
  }

  static #view = vec3.create();
  static #xAxis = vec3.create();
  static #yAxis = vec3.create();
  static #zAxis = vec3.create();
  static #viewProj = mat4.create();
  static #projected = vec4.create();
  static #center = vec3.create();
  static #side = vec3.create();
  static #screenCenter = new Float32Array(2);
  static #screenSide = new Float32Array(2);

}
