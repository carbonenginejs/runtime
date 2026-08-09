// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Tr2VectorFunctionModifier.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";

const OFFSET_SCRATCH = vec3.create();
const DIRECTION_SCRATCH = vec4.create();

/** Wraps a position source, offsetting and scaling what it reports, optionally in view space. */
@type.define({ className: "Tr2VectorFunctionModifier", family: "curves" })
export class Tr2VectorFunctionModifier extends CjsModel
{

  /** m_useViewSpace (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  useViewSpace = false;

  /** m_clientBall (ITriVectorFunctionPtr) [READWRITE] */
  @io.readwrite
  @type.objectRef("ITriVectorFunction")
  clientBall = null;

  /** m_offsetPosition (Vector3) [READWRITE] */
  @io.readwrite
  @type.vec3
  offsetPosition = vec3.create();

  /** m_scaleModifier (float) [READWRITE] */
  @io.readwrite
  @type.float32
  scaleModifier = 1;

  /** m_useSystemCoordinates (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  useSystemCoordinates = false;

  // Carbon Tr2VectorFunctionModifier.cpp:35-141. The modifier wraps a position
  // source - Carbon calls it the client ball - and reports what that source
  // says, moved by an offset and scaled.
  //
  // The offset is applied BEFORE the scale (cpp:126-131), so the scale
  // multiplies the offset too; swapping the order changes where an offset
  // child sits.
  //
  // The derivatives are NOT offset, only scaled (cpp:84-107): a constant
  // offset has no rate of change, so adding it to a velocity would be wrong.
  //
  // Carbon reads the inverse view transform from a Tr2Renderer static; this
  // port takes the render context that carries those relocated statics. Asking
  // for view space without a context returns the raw offset, which is what
  // Carbon does before a view has been set.

  /**
   * The offset in world space, rotated out of view space first when this
   * modifier is authored in view space and a render context supplies the view.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon reads Tr2Renderer's inverse-view static; the relocated statics live on the render context, so it is passed in.")
  GetOffsetPosition(renderContext = null, out = OFFSET_SCRATCH)
  {
    vec3.copy(out, this.offsetPosition);

    if (!this.useViewSpace) return out;

    const inverseView = renderContext?.GetInverseViewTransform?.();

    if (!inverseView) return out;

    // Carbon transforms the offset with w = 0, so it rotates without picking
    // up the eye position (cpp:139).
    vec4.set(DIRECTION_SCRATCH, out[0], out[1], out[2], 0);
    vec4.transformMat4(DIRECTION_SCRATCH, DIRECTION_SCRATCH, inverseView);

    return vec3.set(out, DIRECTION_SCRATCH[0], DIRECTION_SCRATCH[1], DIRECTION_SCRATCH[2]);
  }

  /**
   * Applies the offset and then the scale to a position in place, which is the
   * shared tail of Update and GetValueAt.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Takes the render context Carbon reads from a Tr2Renderer static.")
  GetTransformedPosition(inOut, renderContext = null)
  {
    const offset = this.GetOffsetPosition(renderContext);

    vec3.add(inOut, inOut, offset);
    return vec3.scale(inOut, inOut, this.scaleModifier);
  }

  /**
   * Advances the wrapped source to a time and reports its offset, scaled
   * position, reading system coordinates instead when this modifier is
   * authored in them.
   */
  @carbon.method
  @impl.implemented
  Update(inOut, time, renderContext = null)
  {
    this.#ReadSource(inOut, time, "Update");
    return this.GetTransformedPosition(inOut, renderContext);
  }

  /**
   * The wrapped source's position at a time, offset and scaled, without
   * advancing it.
   */
  @carbon.method
  @impl.implemented
  GetValueAt(inOut, time, renderContext = null)
  {
    this.#ReadSource(inOut, time, "GetValueAt");
    return this.GetTransformedPosition(inOut, renderContext);
  }

  /**
   * The wrapped source's velocity at a time, scaled but NOT offset, because a
   * constant offset has no rate of change.
   */
  @carbon.method
  @impl.implemented
  GetValueDotAt(inOut, time)
  {
    this.clientBall?.GetValueDotAt?.(inOut, time);
    return vec3.scale(inOut, inOut, this.scaleModifier);
  }

  /**
   * The wrapped source's acceleration at a time, scaled but not offset.
   */
  @carbon.method
  @impl.implemented
  GetValueDoubleDotAt(inOut, time)
  {
    this.clientBall?.GetValueDoubleDotAt?.(inOut, time);
    return vec3.scale(inOut, inOut, this.scaleModifier);
  }

  /**
   * The wrapped source's interpolated system-coordinate position at a time,
   * passed through untouched by the offset and scale.
   */
  @carbon.method
  @impl.implemented
  InterpolatedPosition(out, time)
  {
    this.clientBall?.InterpolatedPosition?.(out, time);
    return out;
  }

  // Carbon branches on m_useSystemCoordinates before every position read
  // (cpp:37-50, :60-74): the system-coordinate path asks for the interpolated
  // double-precision position and narrows it, which Carbon flags as a
  // potential precision loss; JavaScript numbers are already double, so the
  // narrowing happens only when the value reaches a Float32Array.

  /** Reads the wrapped source into `inOut`, by whichever path is authored. */
  #ReadSource(inOut, time, method)
  {
    if (!this.clientBall) return inOut;

    if (this.useSystemCoordinates)
    {
      this.clientBall.InterpolatedPosition?.(inOut, time);
      return inOut;
    }

    this.clientBall[method]?.(inOut, time);
    return inOut;
  }

}
