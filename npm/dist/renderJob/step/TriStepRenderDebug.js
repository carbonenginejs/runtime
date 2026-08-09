import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderStep as _TriRenderStep } from './TriRenderStep.js';
import { TriLineSet as _TriLineSet } from '../../core/line/TriLineSet.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initProto, _initClass, _init_lineSet, _init_extra_lineSet, _init_text2d, _init_extra_text2d, _init_text3d, _init_extra_text3d, _init_autoClear, _init_extra_autoClear;

/** A render step that accumulates debug lines, boxes and 2D/3D text for one frame and hands them to the executor to draw. */
let _TriStepRenderDebug;
class TriStepRenderDebug extends _TriRenderStep {
  static {
    ({
      e: [_init_lineSet, _init_extra_lineSet, _init_text2d, _init_extra_text2d, _init_text3d, _init_extra_text3d, _init_autoClear, _init_extra_autoClear, _initProto],
      c: [_TriStepRenderDebug, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriStepRenderDebug",
      family: "renderJob"
    })], [[type.model("TriLineSet"), 0, "lineSet"], [type.list("TriDebugText2D"), 0, "text2d"], [type.list("TriDebugText3D"), 0, "text3d"], [[io, io.readwrite, type, type.boolean], 16, "autoClear"], [[carbon, carbon.method, impl, impl.implemented], 18, "Clear"], [[carbon, carbon.method, impl, impl.implemented], 18, "DrawBox"], [[carbon, carbon.method, impl, impl.implemented], 18, "DrawCapsule"], [[carbon, carbon.method, impl, impl.implemented], 18, "DrawCone"], [[carbon, carbon.method, impl, impl.implemented], 18, "DrawCylinder"], [[carbon, carbon.method, impl, impl.implemented], 18, "DrawLine"], [[carbon, carbon.method, impl, impl.implemented], 18, "DrawSphere"], [[carbon, carbon.method, impl, impl.adapted], 18, "Print3D"], [[carbon, carbon.method, impl, impl.adapted], 18, "Print2D"], [[carbon, carbon.method, impl, impl.adapted], 18, "Print2Df"], [[carbon, carbon.method, impl, impl.adapted], 18, "Execute"]], 0, void 0, _TriRenderStep));
  }
  constructor(...args) {
    super(...args);
    _init_extra_autoClear(this);
  }
  lineSet = (_initProto(this), _init_lineSet(this, new _TriLineSet()));
  text2d = (_init_extra_lineSet(this), _init_text2d(this, []));
  text3d = (_init_extra_text2d(this), _init_text3d(this, []));

  /** m_autoClear (bool) [READWRITE] */
  autoClear = (_init_extra_text3d(this), _init_autoClear(this, true));

  /** Carbon method Clear (MAP_METHOD_AND_WRAP). */
  Clear() {
    this.lineSet.Clear();
    this.text2d.length = 0;
    this.text3d.length = 0;
  }

  /** Carbon method DrawBox (MAP_METHOD_AND_WRAP). */
  DrawBox(min, max, color = 0xffffffff) {
    this.lineSet.AddBox(min, max, color);
  }

  /** Carbon method DrawCapsule (MAP_METHOD_AND_WRAP). */
  DrawCapsule(start, end, radius, segments, color = 0xffffffff) {
    this.lineSet.AddCylinder(start, end, radius, segments, color);
    this.lineSet.AddSphere(start, radius, segments, color);
    this.lineSet.AddSphere(end, radius, segments, color);
  }

  /** Carbon method DrawCone (MAP_METHOD_AND_WRAP). */
  DrawCone(start, end, radius, segments, color = 0xffffffff) {
    this.lineSet.AddCone(start, end, radius, segments, color);
  }

  /** Carbon method DrawCylinder (MAP_METHOD_AND_WRAP). */
  DrawCylinder(start, end, radius, segments, color = 0xffffffff) {
    this.lineSet.AddCylinder(start, end, radius, segments, color);
  }

  /** Carbon method DrawLine -> PyDrawLine (MAP_METHOD_AND_WRAP). */
  DrawLine(from, fromColor, to, toColor) {
    this.lineSet.Add(from, fromColor, to, toColor);
  }

  /** Carbon method DrawSphere (MAP_METHOD_AND_WRAP). */
  DrawSphere(center, radius, segments, color = 0xffffffff) {
    this.lineSet.AddSphere(center, radius, segments, color);
  }

  /** Carbon method Print3D (MAP_METHOD_AND_WRAP). */
  Print3D(position, color, message) {
    this.text3d.push({
      position: vec3.clone(position),
      color: Number(color) >>> 0,
      message: String(message)
    });
  }

  /** Carbon method Print2D (MAP_METHOD_AND_WRAP). */
  Print2D(x, y, color, message) {
    this.text2d.push({
      x: Number(x) | 0,
      y: Number(y) | 0,
      width: 1024,
      height: 512,
      format: 0,
      color: Number(color) >>> 0,
      message: String(message)
    });
  }

  /** Carbon method Print2Df (MAP_METHOD_AND_WRAP). */
  Print2Df(x, y, width, height, format, color, message) {
    this.text2d.push({
      x: Number(x) | 0,
      y: Number(y) | 0,
      width: Number(width) | 0,
      height: Number(height) | 0,
      format: Number(format) >>> 0,
      color: Number(color) >>> 0,
      message: String(message)
    });
  }

  /**
   * Hands the accumulated debug lines and text to the executor, then clears them for the next frame.
   */
  Execute(_realTime, _simTime, executor) {
    executor?.RenderDebug?.(this);
    if (this.autoClear) this.Clear();
    return _TriRenderStep.Result.RS_OK;
  }
  static {
    _initClass();
  }
}

export { _TriStepRenderDebug as TriStepRenderDebug };
//# sourceMappingURL=TriStepRenderDebug.js.map
