// Source: trinity/trinity/Tr2ScalingTool.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta, type, blue } from "#schema";
import { Tr2ManipulationTool } from "./Tr2ManipulationTool.js";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { quat } from "#math/quat";
import { Tr2LineSet } from "../line/Tr2LineSet.js";
import { Tr2SolidSet } from "../line/Tr2SolidSet.js";
import { Tr2PrimitiveSet } from "../line/Tr2PrimitiveSet.js";
import { Tr2Effect } from "../../shader/Tr2Effect.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../context/Tr2RenderContext.js";

const AXIS_COLORS = Object.freeze({
  x: vec4.fromValues(1, 0.01, 0.01, 1),
  y: vec4.fromValues(0.01, 1, 0.01, 1),
  z: vec4.fromValues(0.01, 0.01, 1, 1),
  w: vec4.fromValues(0, 1, 1, 1)
});

/** An interactive scaling manipulator that turns pointer drags along a selected axis into a scale. */
@blue.define("Tr2ScalingTool")
export class Tr2ScalingTool extends Tr2ManipulationTool
{
  _initialLength = 1;
  _initialScale = vec3.fromValues(1, 1, 1);

  /** Native constructor creates the scale boxes and guide lines. */
  constructor()
  {
    super();
    this.GenLineSets();
    this.SelectAxis("w");
    this.Init(this.localTransform);
  }

  /** Native initialization separates the tool's scale from its display transform. */
  @meta.adapted
  Init(transform)
  {
    const vec3_0 = vec3.alloc();
    const vec3_1 = vec3.alloc();
    const quat_0 = quat.alloc();
    const mat4_0 = mat4.alloc();
    try
    {
      const position = mat4.getTranslation(vec3.zero(vec3_0), transform);
      const scale = mat4.getScaling(vec3.zero(vec3_1), transform);
      const rotation = mat4.getRotation(quat.identity(quat_0), transform);
      mat4.fromRotationTranslation(this.localTransform, rotation, position);
      mat4.multiply(this.worldTransform, mat4.fromTranslation(mat4.identity(mat4_0), this.pivot), this.localTransform);
      this.ResetPrimitives();
      this._initialLength = -1;
      vec3.copy(this.scale, scale);
      vec3.copy(this._initialScale, scale);
    }
    finally
    {
      vec3.unalloc(vec3_0);
      vec3.unalloc(vec3_1);
      quat.unalloc(quat_0);
      mat4.unalloc(mat4_0);
    }
  }

  /** Native projected drag; scale callbacks carry scaling matrices, not object transforms. */
  @meta.adapted
  Move(_mouseX, _mouseY, dx, dy, viewport, view, projection)
  {
    const vec3_0 = vec3.alloc();
    const vec3_1 = vec3.alloc();
    const vec3_2 = vec3.alloc();
    const vec3_3 = vec3.alloc();
    const mat4_0 = mat4.alloc();
    const mat4_1 = mat4.alloc();
    const mat4_2 = mat4.alloc();
    const mat4_3 = mat4.alloc();
    try
    {
      // Carbon Tr2ScalingTool::Move evaluates even at zero delta: its ratio
      // reflects the preceding handle movement, which may still need applying.
      const position = vec3.set(vec3_0, this.localTransform[12], this.localTransform[13], this.localTransform[14]);
      const transformPoint = (point, solid) =>
      {
        const mat4_0 = mat4.alloc();
        try
        {
          const inverse = mat4.invert(mat4.identity(mat4_0), view);
          if (!inverse) throw new RangeError("Scale tool view must be invertible.");
          const local = solid.localTransform;
          const depth = (inverse[12] - local[12]) * view[2] + (inverse[13] - local[13]) * view[6] + (inverse[14] - local[14]) * view[10];
          const factor = Math.abs(depth * Tr2PrimitiveSet.primitiveDistanceScaleMultiplier * Tr2RenderContext_GetMainThreadRenderContext().GetFieldOfView());
          const scaled = vec3.scale(vec3.create(), point, factor); // alloc: transformed point returned to the caller.
          return vec3.transformMat4(scaled, scaled, local);
        }
        finally
        {
          mat4.unalloc(mat4_0);
        }
      };
      if (this._initialLength < 0) this._initialLength = vec3.distance(position, transformPoint([1, 0, 0], this.xBox));
      if (!this._initialLength) return;
      const screen = this.PointToScreenCoordinates(position, viewport, view, projection);
      const x = Math.trunc(screen[0]), y = Math.trunc(screen[1]);
      const ray = this.ScreenCoordinatesToRay(x, y, viewport, view, projection);
      const normal = this.GetDesiredPlaneNormal(ray.ray, view);
      const delta = this.MovePointOnPlane(x, y, x + dx, y + dy, position, normal, viewport, view, projection);
      const axes = this.GetBaseVectors(), index = ["x", "y", "z"].indexOf(this.selectedAxis);
      if (this.selectedAxis !== "w")
      {
        if (index < 0) return;
        vec3.scale(delta, axes[index], vec3.dot(delta, axes[index]));
      }
      vec3.add(this._movement, this._movement, delta);
      const boxes = [this.xBox, this.yBox, this.zBox];
      const selected = index < 0 ? 0 : index;
      const center = [0, 0, 0];
      center[selected] = 1;
      const world = [this.worldTransform[12], this.worldTransform[13], this.worldTransform[14]];
      const difference = vec3.subtract(vec3.zero(vec3_1), world, transformPoint(center, boxes[selected]));
      let ratio = vec3.length(difference) / this._initialLength;
      if (vec3.dot(difference, axes[selected]) >= 0) ratio = -ratio;
      const next = vec3.copy(vec3_2, this.scale);
      if (index < 0)
      {
        const distance = vec3.length(this._movement) * (dx < 0 ? -1 : 1);
        for (let i = 0; i < 3; i++)
        {
          const movement = vec3.scale(vec3.zero(vec3_3), axes[i], distance);
          const translation = mat4.fromTranslation(mat4.identity(mat4_0), movement);
          mat4.multiply(boxes[i].localTransform, translation, boxes[i].localTransform);
          next[i] = this._initialScale[i] * ratio;
        }
      }
      else
      {
        next[index] = this._initialScale[index] * ratio;
        const translation = mat4.fromTranslation(mat4.identity(mat4_1), this._movement);
        mat4.multiply(boxes[index].localTransform, translation, boxes[index].localTransform);
      }
      if (this.OnMoveCallback(mat4.fromScaling(mat4.identity(mat4_2), this.scale), mat4.fromScaling(mat4.identity(mat4_3), next)))
      {
        vec3.copy(this.scale, next);
        vec3.zero(this._movement);
      }
    }
    finally
    {
      vec3.unalloc(vec3_0);
      vec3.unalloc(vec3_1);
      vec3.unalloc(vec3_2);
      vec3.unalloc(vec3_3);
      mat4.unalloc(mat4_0);
      mat4.unalloc(mat4_1);
      mat4.unalloc(mat4_2);
      mat4.unalloc(mat4_3);
    }
  }

  /** Native primitive transforms and guide refresh. */
  @meta.adapted
  Update(context)
  {
    const mat4_0 = mat4.alloc();
    try
    {
      mat4.multiply(this.worldTransform, mat4.fromTranslation(mat4.identity(mat4_0), this.pivot), this.localTransform);
      for (const primitive of this.primitives) primitive.UpdateTransform(context);
      this.UpdateLines();
    }
    finally
    {
      mat4.unalloc(mat4_0);
    }
  }

  /** Native guides connect each transformed box's centre of mass. */
  @meta.implemented
  UpdateLines()
  {
    const center = this.wBox.GetCenterOfMass();
    const lines = [this.xLine, this.yLine, this.zLine], boxes = [this.xBox, this.yBox, this.zBox];
    const color = [0.5, 0.5, 0.5, 1];
    for (let i = 0; i < 3; i++)
    {
      lines[i].ClearLines();
      lines[i].AddLine(center, color, boxes[i].GetCenterOfMass(), color);
      lines[i].SubmitChanges();
    }
  }

  /** Native axis boxes, centre box and unpickable guide lines. */
  @meta.adapted
  GenLineSets()
  {
    const solidEffect = new Tr2Effect(), lineEffect = new Tr2Effect(), pickEffect = new Tr2Effect();
    solidEffect.SetEffectPathName("res:/Graphics/Effect/Managed/Utility/SolidsNoZ.fx");
    lineEffect.SetEffectPathName("res:/Graphics/Effect/Managed/Utility/LinesNoZ.fx");
    pickEffect.SetEffectPathName("res:/Graphics/Effect/Managed/Utility/PrimitivePicking.fx");
    const lines = [], boxes = [];
    for (let axis = 0; axis < 4; axis++)
    {
      const name = ["x", "y", "z", "w"][axis], color = AXIS_COLORS[name], offset = [0, 0, 0];
      if (axis < 3) offset[axis] = 1;
      const box = new Tr2SolidSet();
      box.name = name;
      box.effect = solidEffect;
      box.pickEffect = pickEffect;
      box.scaleByDistanceToView = true;
      const points = Tr2ManipulationTool.getBoxTriangles([-0.075, -0.075, -0.075], [0.075, 0.075, 0.075])
        .map(point => vec3.add(vec3.create(), point, offset)); // alloc: vertices retained for primitive construction.
      for (let i = 0; i < points.length; i += 3) box.AddTriangle(points[i], color, points[i + 1], color, points[i + 2], color);
      box.SubmitChanges();
      boxes.push(box);
      if (axis === 3) continue;
      const line = new Tr2LineSet(), grey = [0.5, 0.5, 0.5, 1];
      line.name = `_${name}`;
      line.effect = lineEffect;
      line.pickEffect = pickEffect;
      line.AddLine([0, 0, 0], grey, offset, grey);
      line.SubmitChanges();
      lines.push(line);
    }
    [this.xLine, this.yLine, this.zLine] = lines;
    [this.xBox, this.yBox, this.zBox, this.wBox] = boxes;
    this.primitives.push(...lines, ...boxes);
  }

  /** m_scale (Vector3) [READ] */
  @blue.read
  @type.vec3
  scale = vec3.fromValues(1, 1, 1);

  /** Carbon method ResetPrimitives (MAP_METHOD_AND_WRAP). */
  @blue.method
  @meta.adapted
  ResetPrimitives()
  {
    for (const primitive of this.primitives)
    {
      mat4.copy(primitive.localTransform, this.localTransform);
      primitive.UpdateTransform();
    }
    for (const line of [this.xLine, this.yLine, this.zLine])
    {
      mat4.identity(line.localTransform);
    }
    this.UpdateLines();
  }

  /**
   * Returns the full tool, or the captured axis, guide and centre primitives.
   *
   * Adapted: JavaScript returns a fresh array instead of Carbon's reused private
   * visible-object vector.
   */
  @blue.method
  @meta.adapted
  GetPrimitivesToRender()
  {
    if (!this.captured || this.selectedAxis === "w")
    {
      return Array.from(this.primitives);
    }
    return this.primitives.filter(primitive =>
      primitive.name === "w"
      || primitive.name === this.selectedAxis
      || primitive.name === `_${this.selectedAxis}`);
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
