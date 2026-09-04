// Source: trinity/trinity/RenderJob/TriStepRenderDebug.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { TriLineSet } from "../../core/line/TriLineSet.js";
import { vec3 } from "#math/vec3";

/** A render step that accumulates debug lines, boxes and 2D/3D text for one frame and hands them to the render context to draw. */
@type.define({ className: "TriStepRenderDebug", family: "renderJob" })
export class TriStepRenderDebug extends TriRenderStep
{

  @type.model("TriLineSet")
  lineSet = new TriLineSet();

  @type.list("TriDebugText2D")
  text2d = [];

  @type.list("TriDebugText3D")
  text3d = [];

  /** m_autoClear (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  autoClear = true;

  /** Carbon method Clear (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  Clear()
  {
    this.lineSet.Clear();
    this.text2d.length = 0;
    this.text3d.length = 0;
  }

  /** Carbon method DrawBox (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  DrawBox(min, max, color = 0xffffffff)
  {
    this.lineSet.AddBox(min, max, color);
  }

  /** Carbon method DrawCapsule (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  DrawCapsule(start, end, radius, segments, color = 0xffffffff)
  {
    this.lineSet.AddCylinder(start, end, radius, segments, color);
    this.lineSet.AddSphere(start, radius, segments, color);
    this.lineSet.AddSphere(end, radius, segments, color);
  }

  /** Carbon method DrawCone (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  DrawCone(start, end, radius, segments, color = 0xffffffff)
  {
    this.lineSet.AddCone(start, end, radius, segments, color);
  }

  /** Carbon method DrawCylinder (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  DrawCylinder(start, end, radius, segments, color = 0xffffffff)
  {
    this.lineSet.AddCylinder(start, end, radius, segments, color);
  }

  /** Carbon method DrawLine -> PyDrawLine (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  DrawLine(from, fromColor, to, toColor)
  {
    this.lineSet.Add(from, fromColor, to, toColor);
  }

  /** Carbon method DrawSphere (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  DrawSphere(center, radius, segments, color = 0xffffffff)
  {
    this.lineSet.AddSphere(center, radius, segments, color);
  }

  /** Carbon method Print3D (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  Print3D(position, color, message)
  {
    this.text3d.push({ position: vec3.clone(position), color: Number(color) >>> 0, message: String(message) });
  }

  /** Carbon method Print2D (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  Print2D(x, y, color, message)
  {
    this.text2d.push({ x: Number(x) | 0, y: Number(y) | 0, width: 1024, height: 512, format: 0, color: Number(color) >>> 0, message: String(message) });
  }

  /** Carbon method Print2Df (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  Print2Df(x, y, width, height, format, color, message)
  {
    this.text2d.push({ x: Number(x) | 0, y: Number(y) | 0, width: Number(width) | 0, height: Number(height) | 0, format: Number(format) >>> 0, color: Number(color) >>> 0, message: String(message) });
  }

  /**
   * Hands the accumulated debug lines and text to the render context, then clears them for the next frame.
   */
  @carbon.method
  @impl.adapted
  Execute(_realTime, _simTime, renderContext)
  {
    renderContext.RenderDebug(this);
    if (this.autoClear) this.Clear();
    return TriRenderStep.Result.RS_OK;
  }

}
