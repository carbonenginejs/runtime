// Source: trinity/trinity/Curves/Tr2CurveColor.h
// Source: trinity/trinity/Curves/Tr2CurveColor.cpp
import { color } from "#math/color";
import { vec4 } from "#math/vec4";
import { ITriColorFunction, ITriFunction, ITriCurveLength } from "#blue";
import { carbon, impl, edit, type } from "#schema";
import { Tr2CurveInterpolation, Tr2CurveTangentType } from "../enums.js";
import { Tr2CurveScalar } from "./Tr2CurveScalar.js";


const CLAMP_MIN = vec4.create();

/**
 * Color curve composed of four independent scalar curves for r, g, b and a,
 * sampled at time minus timeOffset; an empty alpha curve yields 1, and the
 * result is converted to gamma space when srgbOutput is set.
 * JavaScript combines native time overloads as seconds-first calls with output last.
 */
@type.define({
  className: "Tr2CurveColor",
  family: "curves"
})
@carbon.inherit(ITriCurveLength)
export class Tr2CurveColor extends ITriColorFunction
{
  /**
   * Name identifying this composite color curve (native std::string m_name).
   * @type {string}
   */
  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

  /**
   * Requests gamma-space conversion of the sampled linear color (native bool m_srgbOutput).
   * @type {boolean}
   */
  @edit.readwrite
  @edit.persist
  @type.boolean
  srgbOutput = false;

  /**
   * Owned scalar curve supplying the red component (native PTr2CurveScalar m_r).
   * @type {Tr2CurveScalar}
   */
  @edit.read
  @edit.persist
  @type.struct("Tr2CurveScalar")
  r = new Tr2CurveScalar();

  /**
   * Owned scalar curve supplying the green component (native PTr2CurveScalar m_g).
   * @type {Tr2CurveScalar}
   */
  @edit.read
  @edit.persist
  @type.struct("Tr2CurveScalar")
  g = new Tr2CurveScalar();

  /**
   * Owned scalar curve supplying the blue component (native PTr2CurveScalar m_b).
   * @type {Tr2CurveScalar}
   */
  @edit.read
  @edit.persist
  @type.struct("Tr2CurveScalar")
  b = new Tr2CurveScalar();

  /**
   * Owned scalar curve supplying alpha; the parent substitutes alpha one when this curve is empty (native PTr2CurveScalar m_a).
   * @type {Tr2CurveScalar}
   */
  @edit.read
  @edit.persist
  @type.struct("Tr2CurveScalar")
  a = new Tr2CurveScalar();

  /**
   * Seconds subtracted from sample time before evaluating component curves (native float m_timeOffset).
   * @type {number}
   */
  @edit.readwrite
  @edit.persist
  @type.float32
  timeOffset = 0;

  /**
   * RGBA color cached by the last Update or UpdateValue call (native Color m_currentValue).
   * @type {Float32Array}
   */
  @edit.read
  @type.color
  currentValue = color.createLinear();

  /**
   * Updates the cached color value by updating each scalar component curve.
   *
   * @param {number} time Time in seconds.
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  UpdateValue(time)
  {
    const t = time - this.timeOffset;
    this.currentValue[0] = this.r.Update(t);
    this.currentValue[1] = this.g.Update(t);
    this.currentValue[2] = this.b.Update(t);
    this.currentValue[3] = this.a.Update(t);
    if (this.a.IsEmpty()) this.currentValue[3] = 1;
    if (this.srgbOutput)
    {
      color.linearToGamma(this.currentValue, this.currentValue);
    }
  }

  /**
   * Updates the cached value and copies it into `out`.
   *
   * @param {number} time Time in seconds.
   * @param {Float32Array|number[]} out Caller-owned output.
   * @returns {Float32Array|number[]} The caller-owned output.
   */
  @carbon.method
  @impl.adapted
  Update(time, out)
  {
    this.GetValueAt(time, this.currentValue);
    return vec4.copy(out, this.currentValue);
  }

  /**
   * Gets the color value at `time` into `out`.
   *
   * @param {number} time Time in seconds.
   * @param {Float32Array|number[]} out Caller-owned output.
   * @returns {Float32Array|number[]} The caller-owned output.
   */
  @carbon.method
  @impl.adapted
  GetValueAt(time, out)
  {
    const t = time - this.timeOffset;
    out[0] = this.r.GetValue(t);
    out[1] = this.g.GetValue(t);
    out[2] = this.b.GetValue(t);
    out[3] = this.a.IsEmpty() ? 1 : this.a.GetValue(t);
    if (this.srgbOutput)
    {
      vec4.zero(CLAMP_MIN);
      vec4.max(out, out, CLAMP_MIN);
      color.linearToGamma(out, out);
    }
    return out;
  }

  /**
   * Gets the longest scalar component curve length.
   *
   * @returns {number} Longest scalar component length.
   */
  @carbon.method
  @impl.implemented
  Length()
  {
    return Math.max(this.r.Length(), this.g.Length(), this.b.Length(), this.a.Length());
  }

  /**
   * Gets the color value at `time` into `out`.
   *
   * @param {number} time Time in seconds.
   * @param {Float32Array|number[]} out Caller-owned output.
   * @returns {Float32Array|number[]} The caller-owned output.
   */
  @carbon.method
  @impl.adapted
  GetValue(time, out)
  {
    return this.GetValueAt(time, out);
  }

  /**
   * Adds one color key by adding matching scalar keys to each component curve.
   * Native right-tangent selection is gated by left-tangent presence. JavaScript
   * also treats a missing right array as zero; right-only input remains ignored.
   *
   * @param {number} time Time in seconds.
   * @param {Float32Array|number[]} value Authored component values.
   * @param {number} [interpolation = Tr2CurveInterpolation.HERMITE] Interpolation for the following segment.
   * @param {Float32Array|number[]} [leftTangent] Optional arriving component tangents.
   * @param {Float32Array|number[]} [rightTangent] Optional departing component tangents.
   * @param {number} [tangentType = Tr2CurveTangentType.AUTO_CLAMP] Scalar tangent-maintenance rule.
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  AddKey(time, value, interpolation = Tr2CurveInterpolation.HERMITE, leftTangent, rightTangent, tangentType = Tr2CurveTangentType.AUTO_CLAMP)
  {
    const useRightTangent = !!leftTangent && !!rightTangent;
    this.r.AddKey(time, value[0], interpolation, leftTangent?.[0] ?? 0, useRightTangent ? rightTangent[0] : 0, tangentType);
    this.g.AddKey(time, value[1], interpolation, leftTangent?.[1] ?? 0, useRightTangent ? rightTangent[1] : 0, tangentType);
    this.b.AddKey(time, value[2], interpolation, leftTangent?.[2] ?? 0, useRightTangent ? rightTangent[2] : 0, tangentType);
    this.a.AddKey(time, value[3], interpolation, leftTangent?.[3] ?? 0, useRightTangent ? rightTangent[3] : 0, tangentType);
  }

  /**
   * Sets extrapolation on all scalar component curves.
   *
   * @param {number} extrapolation Before and after extrapolation mode.
   * @returns {void}
   */
  @carbon.method
  @impl.implemented
  SetExtrapolation(extrapolation)
  {
    this.r.SetExtrapolation(extrapolation);
    this.g.SetExtrapolation(extrapolation);
    this.b.SetExtrapolation(extrapolation);
    this.a.SetExtrapolation(extrapolation);
  }
}

// Native exposure ends at this concrete table (Tr2CurveColor_Blue.cpp).
carbon.interfaceTable({
  interfaces: [Tr2CurveColor, ITriColorFunction, ITriFunction, ITriCurveLength],
  chainTo: null
})(Tr2CurveColor);
