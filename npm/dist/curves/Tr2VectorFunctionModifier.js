import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initProto, _initClass, _init_useViewSpace, _init_extra_useViewSpace, _init_clientBall, _init_extra_clientBall, _init_offsetPosition, _init_extra_offsetPosition, _init_scaleModifier, _init_extra_scaleModifier, _init_useSystemCoordinates, _init_extra_useSystemCoordinates;
const OFFSET_SCRATCH = vec3.create();
const DIRECTION_SCRATCH = vec4.create();

/** Wraps a position source, offsetting and scaling what it reports, optionally in view space. */
let _Tr2VectorFunctionMod;
class Tr2VectorFunctionModifier extends CjsModel {
  static {
    ({
      e: [_init_useViewSpace, _init_extra_useViewSpace, _init_clientBall, _init_extra_clientBall, _init_offsetPosition, _init_extra_offsetPosition, _init_scaleModifier, _init_extra_scaleModifier, _init_useSystemCoordinates, _init_extra_useSystemCoordinates, _initProto],
      c: [_Tr2VectorFunctionMod, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2VectorFunctionModifier",
      family: "curves"
    })], [[[io, io.readwrite, type, type.boolean], 16, "useViewSpace"], [[io, io.readwrite, void 0, type.objectRef("ITriVectorFunction")], 16, "clientBall"], [[io, io.readwrite, type, type.vec3], 16, "offsetPosition"], [[io, io.readwrite, type, type.float32], 16, "scaleModifier"], [[io, io.readwrite, type, type.boolean], 16, "useSystemCoordinates"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon reads Tr2Renderer's inverse-view static; the relocated statics live on the render context, so it is passed in.")], 18, "GetOffsetPosition"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Takes the render context Carbon reads from a Tr2Renderer static.")], 18, "GetTransformedPosition"], [[carbon, carbon.method, impl, impl.implemented], 18, "Update"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetValueAt"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetValueDotAt"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetValueDoubleDotAt"], [[carbon, carbon.method, impl, impl.implemented], 18, "InterpolatedPosition"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_useSystemCoordinates(this);
  }
  /** m_useViewSpace (bool) [READWRITE] */
  useViewSpace = (_initProto(this), _init_useViewSpace(this, false));

  /** m_clientBall (ITriVectorFunctionPtr) [READWRITE] */
  clientBall = (_init_extra_useViewSpace(this), _init_clientBall(this, null));

  /** m_offsetPosition (Vector3) [READWRITE] */
  offsetPosition = (_init_extra_clientBall(this), _init_offsetPosition(this, vec3.create()));

  /** m_scaleModifier (float) [READWRITE] */
  scaleModifier = (_init_extra_offsetPosition(this), _init_scaleModifier(this, 1));

  /** m_useSystemCoordinates (bool) [READWRITE] */
  useSystemCoordinates = (_init_extra_scaleModifier(this), _init_useSystemCoordinates(this, false));

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
  GetOffsetPosition(renderContext = null, out = OFFSET_SCRATCH) {
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
  GetTransformedPosition(inOut, renderContext = null) {
    const offset = this.GetOffsetPosition(renderContext);
    vec3.add(inOut, inOut, offset);
    return vec3.scale(inOut, inOut, this.scaleModifier);
  }

  /**
   * Advances the wrapped source to a time and reports its offset, scaled
   * position, reading system coordinates instead when this modifier is
   * authored in them.
   */
  Update(inOut, time, renderContext = null) {
    this.#ReadSource(inOut, time, "Update");
    return this.GetTransformedPosition(inOut, renderContext);
  }

  /**
   * The wrapped source's position at a time, offset and scaled, without
   * advancing it.
   */
  GetValueAt(inOut, time, renderContext = null) {
    this.#ReadSource(inOut, time, "GetValueAt");
    return this.GetTransformedPosition(inOut, renderContext);
  }

  /**
   * The wrapped source's velocity at a time, scaled but NOT offset, because a
   * constant offset has no rate of change.
   */
  GetValueDotAt(inOut, time) {
    this.clientBall?.GetValueDotAt?.(inOut, time);
    return vec3.scale(inOut, inOut, this.scaleModifier);
  }

  /**
   * The wrapped source's acceleration at a time, scaled but not offset.
   */
  GetValueDoubleDotAt(inOut, time) {
    this.clientBall?.GetValueDoubleDotAt?.(inOut, time);
    return vec3.scale(inOut, inOut, this.scaleModifier);
  }

  /**
   * The wrapped source's interpolated system-coordinate position at a time,
   * passed through untouched by the offset and scale.
   */
  InterpolatedPosition(out, time) {
    this.clientBall?.InterpolatedPosition?.(out, time);
    return out;
  }

  // Carbon branches on m_useSystemCoordinates before every position read
  // (cpp:37-50, :60-74): the system-coordinate path asks for the interpolated
  // double-precision position and narrows it, which Carbon flags as a
  // potential precision loss; JavaScript numbers are already double, so the
  // narrowing happens only when the value reaches a Float32Array.

  /** Reads the wrapped source into `inOut`, by whichever path is authored. */
  #ReadSource(inOut, time, method) {
    if (!this.clientBall) return inOut;
    if (this.useSystemCoordinates) {
      this.clientBall.InterpolatedPosition?.(inOut, time);
      return inOut;
    }
    this.clientBall[method]?.(inOut, time);
    return inOut;
  }
  static {
    _initClass();
  }
}

export { _Tr2VectorFunctionMod as Tr2VectorFunctionModifier };
//# sourceMappingURL=Tr2VectorFunctionModifier.js.map
