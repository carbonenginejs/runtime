// Source: trinity/trinity/Tr2VectorFunctionModifier.h
// Source: trinity/trinity/Tr2VectorFunctionModifier.cpp
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, edit, type } from "#schema";
import { ITriVectorFunction } from "#blue";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";

const OFFSET_SCRATCH = vec3.create();
const DIRECTION_SCRATCH = vec4.create();

/** Wraps a position source, offsetting and scaling what it reports, optionally in view space. */
@type.define({ className: "Tr2VectorFunctionModifier", family: "curves" })
export class Tr2VectorFunctionModifier extends ITriVectorFunction
{

  /** m_clientBall (ITriVectorFunctionPtr) [READWRITE] */
  @edit.readwrite
  @type.objectRef("ITriVectorFunction")
  clientBall = null;

  /** m_offsetPosition (Vector3) [READWRITE] */
  @edit.readwrite
  @type.vec3
  offsetPosition = vec3.create();

  /** m_scaleModifier (float) [READWRITE] */
  @edit.readwrite
  @type.float32
  scaleModifier = 1;

  /** m_useViewSpace (bool) [READWRITE] */
  @edit.readwrite
  @type.boolean
  useViewSpace = false;

  /** m_useSystemCoordinates (bool) [READWRITE] */
  @edit.readwrite
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
  // for view space without a context returns the raw offset under the existing
  // JavaScript nullable-context adaptation; native reads the renderer static.

  /**
   * Copies the world-space offset, using a supplied inverse view when requested.
   * JavaScript receives the relocated renderer context and an output buffer instead of native statics and a returned vector; absent context keeps the authored offset.
   * @param {Tr2RenderContext|null} renderContext Optional renderer context.
   * @param {Float32Array} out Destination vector; defaults to shared scratch.
   * @returns {Float32Array} The destination.
   */
  @carbon.method
  @impl.adapted
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
  @carbon.method
  @impl.adapted
  GetTransformedPosition(inOut, renderContext = null)
  {
    const offset = this.GetOffsetPosition(renderContext);

    vec3.add(inOut, inOut, offset);
    return vec3.scale(inOut, inOut, this.scaleModifier);
  }

  /**
   * Reads the child update or system position, then applies offset and scale.
   * JavaScript places time before output, followed by an optional renderer context; native implements the tick overload and rejects its double overload. No overload discrimination is added here.
   * @param {number} time Time forwarded unchanged to the child.
   * @param {Float32Array} inOut Destination position.
   * @param {Tr2RenderContext|null} renderContext Optional renderer context.
   * @returns {Float32Array} The destination.
   */
  @carbon.method
  @impl.adapted
  Update(time, inOut, renderContext = null)
  {
    this._ReadSource(time, inOut, "Update");
    return this.GetTransformedPosition(inOut, renderContext);
  }

  /**
   * Samples the child or system position, then applies offset and scale.
   * JavaScript keeps time first and explicit renderer context; native double overload rejection is not implemented.
   * @param {number} time Time forwarded unchanged.
   * @param {Float32Array} inOut Destination position.
   * @param {Tr2RenderContext|null} renderContext Optional renderer context.
   * @returns {Float32Array} The destination.
   */
  @carbon.method
  @impl.adapted
  GetValueAt(time, inOut, renderContext = null)
  {
    this._ReadSource(time, inOut, "GetValueAt");
    return this.GetTransformedPosition(inOut, renderContext);
  }

  /**
   * Samples the child velocity and scales the output without adding an offset.
   * JavaScript uses time-first/output-last calls. Existing null-child output scaling differs from native and remains outside this removal.
   * @param {number} time Time forwarded unchanged.
   * @param {Float32Array} inOut Destination velocity.
   * @returns {Float32Array} The destination.
   */
  @carbon.method
  @impl.adapted
  GetValueDotAt(time, inOut)
  {
    if (this.clientBall)
    {
      this.clientBall.GetValueDotAt(time, inOut);
    }
    return vec3.scale(inOut, inOut, this.scaleModifier);
  }

  /**
   * Samples the child acceleration and scales the output without an offset.
   * JavaScript uses time-first/output-last calls. Existing null-child output scaling differs from native and remains outside this removal.
   * @param {number} time Time forwarded unchanged.
   * @param {Float32Array} inOut Destination acceleration.
   * @returns {Float32Array} The destination.
   */
  @carbon.method
  @impl.adapted
  GetValueDoubleDotAt(time, inOut)
  {
    if (this.clientBall)
    {
      this.clientBall.GetValueDoubleDotAt(time, inOut);
    }
    return vec3.scale(inOut, inOut, this.scaleModifier);
  }

  /**
   * Forwards the interpolated position without applying offset or scale.
   * JavaScript places the time argument before the output buffer.
   * @param {number} time Time forwarded unchanged.
   * @param {Float32Array|Float64Array} out Destination position.
   * @returns {Float32Array|Float64Array} The destination.
   */
  @carbon.method
  @impl.adapted
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
  @carbon.method
  @impl.noop
  UpdateValue(_time)
  {
  }

  // Carbon branches on m_useSystemCoordinates before every position read
  // (cpp:37-50, :60-74): the system-coordinate path asks for the interpolated
  // double-precision position and narrows it, which Carbon flags as a
  // potential precision loss; JavaScript numbers are already double, so the
  // narrowing happens only when the value reaches a Float32Array.

  /**
   * Dispatches the shared source branch extracted from native Update and GetValueAt.
   * JavaScript helper writes directly into the caller buffer; native checked double-to-float overflow assertions remain unported.
   * @param {number} time Time forwarded unchanged.
   * @param {Float32Array} inOut Destination position.
   * @param {string} method Required child method name.
   * @returns {Float32Array} The destination.
   */
  @impl.custom
  _ReadSource(time, inOut, method)
  {
    if (!this.clientBall) return inOut;

    if (this.useSystemCoordinates)
    {
      this.clientBall.InterpolatedPosition(time, inOut);
      return inOut;
    }

    this.clientBall[method](time, inOut);
    return inOut;
  }

}

// Exact native exposure table; ITriFunction is intentionally not mapped.
carbon.interfaceTable({
  interfaces: [ITriVectorFunction, Tr2VectorFunctionModifier],
  chainTo: null
})(Tr2VectorFunctionModifier);
