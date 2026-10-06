// Source: trinity/trinity/Tr2VectorFunctionModifier.h
// Source: trinity/trinity/Tr2VectorFunctionModifier.cpp
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta } from "#schema";
import { ITriVectorFunction } from "#blue";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";

const OFFSET_SCRATCH = vec3.create();
const DIRECTION_SCRATCH = vec4.create();

/** Wraps a position source, offsetting and scaling what it reports, optionally in view space. */
@meta.define({ className: "Tr2VectorFunctionModifier", family: "curves" })
@meta.blue.interface(ITriVectorFunction)
export class Tr2VectorFunctionModifier extends ITriVectorFunction
{

  /** m_clientBall (ITriVectorFunctionPtr) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.objectRef("ITriVectorFunction")
  clientBall = null;

  /** m_offsetPosition (Vector3) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.vec3
  offsetPosition = vec3.create();

  /** m_scaleModifier (float) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.float32
  scaleModifier = 1;

  /** m_useViewSpace (bool) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.boolean
  useViewSpace = false;

  /** m_useSystemCoordinates (bool) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.boolean
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
  // for view space without a context returns the raw offset under the existing
  // JavaScript nullable-context adaptation; native reads the renderer static.

  /**
   * Copies the world-space offset, using a supplied inverse view when requested.
   * JavaScript receives the relocated renderer context and an output buffer instead of native statics and a returned vector; absent context keeps the authored offset.
   * @param {Tr2RenderContext|null} renderContext Optional renderer context.
   * @param {Float32Array} out Destination vector; defaults to shared scratch.
   * @returns {Float32Array} The destination.
   */
  @meta.blue.method
  @meta.adapted
  GetOffsetPosition(renderContext = null, out = OFFSET_SCRATCH)
  {
    vec3.copy(out, this.offsetPosition);

    if (!this.useViewSpace) return out;

    const inverseView = renderContext ? renderContext.GetInverseViewTransform() : null;

    if (!inverseView) return out;

    // Carbon transforms the offset with w = 0, so it rotates without picking
    // up the eye position (cpp:139).
    vec4.set(DIRECTION_SCRATCH, out[0], out[1], out[2], 0);
    vec4.transformMat4(DIRECTION_SCRATCH, DIRECTION_SCRATCH, inverseView);

    return vec3.set(out, DIRECTION_SCRATCH[0], DIRECTION_SCRATCH[1], DIRECTION_SCRATCH[2]);
  }

  /**
   * Adds the offset before scaling the position in place.
   * JavaScript passes the relocated renderer context explicitly.
   * @param {Float32Array} inOut Position to transform.
   * @param {Tr2RenderContext|null} renderContext Optional renderer context.
   * @returns {Float32Array} The position buffer.
   */
  @meta.blue.method
  @meta.adapted
  GetTransformedPosition(inOut, renderContext = null)
  {
    const offset = this.GetOffsetPosition(renderContext);

    vec3.add(inOut, inOut, offset);
    return vec3.scale(inOut, inOut, this.scaleModifier);
  }

  /**
   * Carbon's Update(double) is deprecated: it asserts in debug builds and returns the output untouched
   * (Tr2VectorFunctionModifier.cpp). Update__Ticks is the working overload.
   * @param {number} _time Unused seconds.
   * @param {Float32Array} inOut Destination, returned unchanged.
   * @returns {Float32Array} The destination.
   */
  @meta.blue.method
  @meta.implemented
  Update(_time, inOut)
  {
    return inOut;
  }

  /**
   * Carbon's GetValueAt(double) is deprecated: it asserts in debug builds and returns the output untouched
   * (Tr2VectorFunctionModifier.cpp). GetValueAt__Ticks is the working overload.
   * @param {number} _time Unused seconds.
   * @param {Float32Array} inOut Destination, returned unchanged.
   * @returns {Float32Array} The destination.
   */
  @meta.blue.method
  @meta.implemented
  GetValueAt(_time, inOut)
  {
    return inOut;
  }

  /**
   * Carbon's GetValueDotAt(double) is deprecated: it asserts in debug builds and returns the output untouched
   * (Tr2VectorFunctionModifier.cpp). GetValueDotAt__Ticks is the working overload.
   * @param {number} _time Unused seconds.
   * @param {Float32Array} inOut Destination, returned unchanged.
   * @returns {Float32Array} The destination.
   */
  @meta.blue.method
  @meta.implemented
  GetValueDotAt(_time, inOut)
  {
    return inOut;
  }

  /**
   * Carbon's GetValueDoubleDotAt(double) is deprecated: it asserts in debug builds and returns the output untouched
   * (Tr2VectorFunctionModifier.cpp). GetValueDoubleDotAt__Ticks is the working overload.
   * @param {number} _time Unused seconds.
   * @param {Float32Array} inOut Destination, returned unchanged.
   * @returns {Float32Array} The destination.
   */
  @meta.blue.method
  @meta.implemented
  GetValueDoubleDotAt(_time, inOut)
  {
    return inOut;
  }

  /**
   * Carbon's Update(Be::Time): the ball's tick update, or its interpolated system position, then offset and scale
   * (cpp:35-52). The renderer context is a JavaScript addition for the view-space offset. JavaScript cannot overload on argument type, so the Be::Time overload has its own name.
   * @param {number} time Scene time in Blue 100ns ticks.
   * @param {Float32Array} inOut Destination position.
   * @param {Tr2RenderContext|null} renderContext Renderer context for the view-space offset.
   * @returns {Float32Array} The destination.
   */
  @meta.adapted
  Update__Ticks(time, inOut, renderContext = null)
  {
    if (this.clientBall)
    {
      if (this.useSystemCoordinates) this.clientBall.InterpolatedPosition(time, inOut);
      else this.clientBall.Update__Ticks(time, inOut);
    }
    return this.GetTransformedPosition(inOut, renderContext);
  }

  /**
   * Carbon's GetValueAt(Be::Time): the ball's tick sample, or its interpolated system position, then offset and
   * scale (cpp:60-76). JavaScript cannot overload on argument type, so the Be::Time overload has its own name.
   * @param {number} time Scene time in Blue 100ns ticks.
   * @param {Float32Array} inOut Destination position.
   * @param {Tr2RenderContext|null} renderContext Renderer context for the view-space offset.
   * @returns {Float32Array} The destination.
   */
  @meta.adapted
  GetValueAt__Ticks(time, inOut, renderContext = null)
  {
    if (this.clientBall)
    {
      if (this.useSystemCoordinates) this.clientBall.InterpolatedPosition(time, inOut);
      else this.clientBall.GetValueAt__Ticks(time, inOut);
    }
    return this.GetTransformedPosition(inOut, renderContext);
  }

  /**
   * Carbon's GetValueDotAt(Be::Time): the ball's velocity scaled, only when a ball is attached (cpp:85-93). JavaScript cannot overload on argument type, so the Be::Time overload has its own name.
   * @param {number} time Scene time in Blue 100ns ticks.
   * @param {Float32Array} inOut Destination velocity.
   * @returns {Float32Array} The destination.
   */
  @meta.adapted
  GetValueDotAt__Ticks(time, inOut)
  {
    if (this.clientBall)
    {
      this.clientBall.GetValueDotAt__Ticks(time, inOut);
      vec3.scale(inOut, inOut, this.scaleModifier);
    }
    return inOut;
  }

  /**
   * Carbon's GetValueDoubleDotAt(Be::Time): the ball's acceleration scaled, only when a ball is attached
   * (cpp:101-109). JavaScript cannot overload on argument type, so the Be::Time overload has its own name.
   * @param {number} time Scene time in Blue 100ns ticks.
   * @param {Float32Array} inOut Destination acceleration.
   * @returns {Float32Array} The destination.
   */
  @meta.adapted
  GetValueDoubleDotAt__Ticks(time, inOut)
  {
    if (this.clientBall)
    {
      this.clientBall.GetValueDoubleDotAt__Ticks(time, inOut);
      vec3.scale(inOut, inOut, this.scaleModifier);
    }
    return inOut;
  }

  /**
   * Forwards the interpolated position without applying offset or scale.
   * JavaScript places the time argument before the output buffer.
   * @param {number} time Time forwarded unchanged.
   * @param {Float32Array|Float64Array} out Destination position.
   * @returns {Float32Array|Float64Array} The destination.
   */
  @meta.blue.method
  @meta.adapted
  InterpolatedPosition(time, out)
  {
    if (this.clientBall)
    {
      this.clientBall.InterpolatedPosition(time, out);
    }
    return out;
  }

  /**
   * Retains the native empty curve-set update (Tr2VectorFunctionModifier.h:19-22).
   * @param {number} _time Unused time.
   * @returns {void}
   */
  @meta.blue.method
  @meta.noop
  UpdateValue(_time)
  {
  }

  // Carbon branches on m_useSystemCoordinates before every position read
  // (cpp:37-50, :60-74): the system-coordinate path asks for the interpolated
  // double-precision position and narrows it, which Carbon flags as a
  // potential precision loss; JavaScript numbers are already double, so the
  // narrowing happens only when the value reaches a Float32Array.


}

// Exact native exposure table; ITriFunction is intentionally not mapped.
