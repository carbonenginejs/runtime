// Source: trinity/trinity/Tr2ScalingTool.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
import { Tr2ManipulationTool } from "./Tr2ManipulationTool.js";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";

/** An interactive scaling manipulator that turns pointer drags along a selected axis into a scale. */
@type.define({ className: "Tr2ScalingTool", family: "trinityCore" })
export class Tr2ScalingTool extends Tr2ManipulationTool
{

  /** m_scale (Vector3) [READ] */
  @io.read
  @type.vec3
  scale = vec3.fromValues(1, 1, 1);

  /** Carbon method ResetPrimitives (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("Copies the authored transform into portable primitive models; renderer-owned guide-line rebuilding remains optional.")
  ResetPrimitives()
  {
    for (const primitive of this.primitives)
    {
      if (primitive?.localTransform?.length >= 16)
      {
        mat4.copy(primitive.localTransform, this.localTransform);
      }
      else if (primitive)
      {
        primitive.localTransform = mat4.clone(this.localTransform);
      }
      primitive?.UpdateTransform?.();
    }
    for (const line of [this.xLine, this.yLine, this.zLine])
    {
      if (line?.localTransform?.length >= 16)
      {
        mat4.identity(line.localTransform);
      }
    }
    this.UpdateLines?.();
  }

}
