// Source: trinity/trinity/Tr2TranslationTool.h
// Source: trinity/trinity/Tr2TranslationTool.cpp
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta, type, blue } from "#schema";
import { Tr2ManipulationTool } from "./Tr2ManipulationTool.js";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { mat4 } from "#math/mat4";
import { Tr2LineSet } from "../line/Tr2LineSet.js";
import { Tr2SolidSet } from "../line/Tr2SolidSet.js";
import { Tr2Effect } from "../../shader/Tr2Effect.js";

const AXIS_COLORS = Object.freeze({
  x: vec4.fromValues(1, 0.01, 0.01, 1),
  y: vec4.fromValues(0.01, 1, 0.01, 1),
  z: vec4.fromValues(0.01, 0.01, 1, 1),
  w: vec4.fromValues(0, 1, 1, 1)
});

/** Extends the manipulation tool with the current three-axis translation result. */
@blue.define({ className: "Tr2TranslationTool", purpose: "Extends the manipulation tool with the current three-axis translation result." })
export class Tr2TranslationTool extends Tr2ManipulationTool
{
  /** Native constructor builds arrows and selects the free-move ring. */
  constructor()
  {
    super();
    this.GenLineSets();
    this.SelectAxis("w");
  }

  /** Native projected incremental movement along the selected local basis. */
  @meta.adapted
  Move(_x, _y, dx, dy, viewport, view, projection)
  {
    const vec3_0 = vec3.alloc();
    try
    {
      if (!dx && !dy) return;
      const position = vec3.set(vec3_0, this.localTransform[12], this.localTransform[13], this.localTransform[14]);
      const screen = this.PointToScreenCoordinates(position, viewport, view, projection);
      const x = Math.trunc(screen[0]), y = Math.trunc(screen[1]);
      const ray = this.ScreenCoordinatesToRay(x, y, viewport, view, projection);
      const normal = this.GetDesiredPlaneNormal(ray.ray, view);
      const delta = this.MovePointOnPlane(x, y, x + dx, y + dy, position, normal, viewport, view, projection);
      if (this.selectedAxis !== "w")
      {
        const index = ["x", "y", "z"].indexOf(this.selectedAxis);
        if (index < 0) return;
        const axis = this.GetBaseVectors()[index];
        vec3.scale(delta, axis, vec3.dot(delta, axis));
      }
      vec3.add(this._movement, this._movement, delta);
      this._moved = true;
    }
    finally
    {
      vec3.unalloc(vec3_0);
    }
  }

  /** Native callback veto and world/local transform propagation. */
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
        const translation = mat4.fromTranslation(mat4.identity(mat4_0), this._movement);
        const next = mat4.multiply(mat4.identity(mat4_1), translation, this.localTransform);
        if (this.OnMoveCallback(this.localTransform, next))
        {
          mat4.copy(this.localTransform, next);
          vec3.set(this.translation, next[12], next[13], next[14]);
          vec3.zero(this._movement);
        }
        this._moved = false;
      }
      mat4.multiply(this.worldTransform, mat4.fromTranslation(mat4.identity(mat4_2), this.pivot), this.localTransform);
      for (const primitive of this.primitives)
      {
        mat4.copy(primitive.localTransform, this.localTransform);
        primitive.UpdateTransform();
      }
    }
    finally
    {
      mat4.unalloc(mat4_0);
      mat4.unalloc(mat4_1);
      mat4.unalloc(mat4_2);
    }
  }

  /** Carbon's three cones, axis lines and view-oriented centre ring. */
  @meta.adapted
  GenLineSets()
  {
    const mat4_0 = mat4.alloc();
    const mat4_1 = mat4.alloc();
    const mat4_2 = mat4.alloc();
    const mat4_3 = mat4.alloc();
    const mat4_4 = mat4.alloc();
    try
    {
      const solidEffect = new Tr2Effect(), lineEffect = new Tr2Effect(), pickEffect = new Tr2Effect();
      solidEffect.SetEffectPathName("res:/Graphics/Effect/Managed/Utility/SolidsNoZ.fx");
      lineEffect.SetEffectPathName("res:/Graphics/Effect/Managed/Utility/LinesNoZ.fx");
      pickEffect.SetEffectPathName("res:/Graphics/Effect/Managed/Utility/PrimitivePicking.fx");
      const lines = [];
      for (let axis = 0; axis < 3; axis++)
      {
        const name = ["x", "y", "z"][axis], color = AXIS_COLORS[name];
        const end = [0, 0, 0], start = [0, 0, 0];
        end[axis] = 1;
        start[axis] = 0.3;
        const line = new Tr2LineSet();
        line.name = name;
        line.effect = lineEffect;
        line.pickEffect = pickEffect;
        line.scaleByDistanceToView = true;
        line.AddLine([0, 0, 0], color, end, color);
        const triangles = Tr2ManipulationTool.getTrianglesAroundLine(start, end, 0.08);
        for (let i = 0; i < triangles.length; i += 3) line.AddPickingTriangle(...triangles.slice(i, i + 3));
        line.SubmitChanges();
        lines.push(line);
        const cone = new Tr2SolidSet();
        cone.name = name;
        cone.effect = solidEffect;
        cone.pickEffect = pickEffect;
        cone.scaleByDistanceToView = true;
        const rotation = axis === 0 ? mat4.fromZRotation(mat4.identity(mat4_0), -Math.PI / 2)
          : axis === 2 ? mat4.fromXRotation(mat4.identity(mat4_1), Math.PI / 2) : mat4.identity(mat4_2);
        const transform = mat4.multiply(mat4.identity(mat4_3), rotation, mat4.fromTranslation(mat4.identity(mat4_4), [0, 1, 0]));
        const points = Tr2ManipulationTool.getConeTriangles(0.25, 0.075, 20).map(point => vec3.transformMat4(vec3.create(), point, transform)); // alloc: vertices retained for primitive construction.
        for (let i = 0; i < points.length; i += 3) cone.AddTriangle(points[i], color, points[i + 1], color, points[i + 2], color);
        cone.SubmitChanges();
        this.primitives.push(cone);
      }
      const ring = new Tr2LineSet(), color = AXIS_COLORS.w;
      ring.name = "w";
      ring.effect = lineEffect;
      ring.pickEffect = pickEffect;
      ring.scaleByDistanceToView = ring.viewOriented = true;
      const points = Tr2ManipulationTool.getCirclePoints(0.25, 20);
      for (let i = 0; i < points.length; i += 2) ring.AddLine(points[i], color, points[i + 1], color);
      const triangles = Tr2ManipulationTool.getCircleTriangles(0.25, 20);
      for (let i = 0; i < triangles.length; i += 3) ring.AddPickingTriangle(...triangles.slice(i, i + 3));
      ring.SubmitChanges();
      this.primitives.push(ring, ...lines);
    }
    finally
    {
      mat4.unalloc(mat4_0);
      mat4.unalloc(mat4_1);
      mat4.unalloc(mat4_2);
      mat4.unalloc(mat4_3);
      mat4.unalloc(mat4_4);
    }
  }

  /** m_translation (Vector3) [READ] */
  @blue.read
  @type.vec3
  translation = vec3.create();

  /**
   * Returns the full tool, or the captured axis and centre primitive.
   *
   * Adapted: JavaScript returns a fresh array instead of Carbon's reused private
   * visible-object vector.
   */
  @blue.method
  @meta.adapted
  GetPrimitivesToRender()
  {
    if (!this.captured)
    {
      return Array.from(this.primitives);
    }
    return this.primitives.filter(primitive =>
      primitive.name === "w" || primitive.name === this.selectedAxis);
  }

  /** Restores Carbon's authored axis and centre colours. */
  @blue.method
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

}
