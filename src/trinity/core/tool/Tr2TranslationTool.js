// Source: trinity/trinity/Tr2TranslationTool.h
// Source: trinity/trinity/Tr2TranslationTool.cpp
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
import { Tr2ManipulationTool } from "./Tr2ManipulationTool.js";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";

const AXIS_COLORS = Object.freeze({
  x: vec4.fromValues(1, 0.01, 0.01, 1),
  y: vec4.fromValues(0.01, 1, 0.01, 1),
  z: vec4.fromValues(0.01, 0.01, 1, 1),
  w: vec4.fromValues(0, 1, 1, 1)
});

/** Extends the manipulation tool with the current three-axis translation result. */
@type.define({ className: "Tr2TranslationTool", family: "trinityCore", purpose: "Extends the manipulation tool with the current three-axis translation result." })
export class Tr2TranslationTool extends Tr2ManipulationTool
{

  /** m_translation (Vector3) [READ] */
  @io.read
  @type.vec3
  translation = vec3.create();

  /** Returns the full tool, or the captured axis and centre primitive. */
  @carbon.method
  @impl.adapted
  @impl.reason("JavaScript returns a fresh array instead of Carbon's reused private visible-object vector.")
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
