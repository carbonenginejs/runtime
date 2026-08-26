// Source: trinity/trinity/Tr2RotationTool.h
// Source: trinity/trinity/Tr2RotationTool.cpp
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
import { Tr2ManipulationTool } from "./Tr2ManipulationTool.js";
import { quat } from "#math/quat";
import { vec4 } from "#math/vec4";

const AXIS_COLORS = Object.freeze({
  x: vec4.fromValues(1, 0.01, 0.01, 1),
  y: vec4.fromValues(0.01, 1, 0.01, 1),
  z: vec4.fromValues(0.01, 0.01, 1, 1),
  w: vec4.fromValues(0, 1, 1, 1),
  ww: vec4.fromValues(0.5, 0.5, 0.5, 1)
});

/** Extends the manipulation tool with quaternion rotation state and angular precision. */
@type.define({ className: "Tr2RotationTool", family: "trinityCore", purpose: "Extends the manipulation tool with quaternion rotation state and angular precision." })
export class Tr2RotationTool extends Tr2ManipulationTool
{

  /** m_precision (float) [READWRITE] */
  @io.readwrite
  @type.float32
  precision = 1;

  /** m_rotation (Quaternion) [READ] */
  @io.read
  @type.quat
  rotation = quat.create();

  /** Returns all authored rotation primitives in their stored order. */
  @carbon.method
  @impl.adapted
  @impl.reason("JavaScript returns a fresh array instead of Carbon's reused private visible-object vector.")
  GetPrimitivesToRender()
  {
    return Array.from(this.primitives);
  }

  /** Restores Carbon's authored axis and ring colours. */
  @carbon.method
  @impl.implemented
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
