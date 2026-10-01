// Source: trinity/trinity/Curves/Tr2CurveVector3.h
// Source: trinity/trinity/Curves/Tr2CurveVector3.cpp
import { vec3 } from "#math/vec3";
import { ITriFunction, ITriVectorFunction, ITriCurveLength } from "#blue";
import { carbon, impl, edit, type } from "#schema";
import { Tr2CurveInterpolation, Tr2CurveTangentType } from "../enums.js";
import { Tr2CurveScalar } from "./Tr2CurveScalar.js";


/**
 * Three-component vector curve composed of independent scalar curves for x, y
 * and z; its length is the longest of the three.
 * JavaScript combines native time overloads as seconds-first calls with output last.
 */
@type.define({
  className: "Tr2CurveVector3",
  family: "curves"
})
@carbon.inherit(ITriCurveLength)
export class Tr2CurveVector3 extends ITriVectorFunction
{
  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

  @edit.read
  @edit.persist
  @type.struct("Tr2CurveScalar")
  x = new Tr2CurveScalar();

  @edit.read
  @edit.persist
  @type.struct("Tr2CurveScalar")
  y = new Tr2CurveScalar();

  @edit.read
  @edit.persist
  @type.struct("Tr2CurveScalar")
  z = new Tr2CurveScalar();

  @edit.read
  @type.vec3
  currentValue = vec3.create();

  /**
   * Updates the cached vector value by updating each scalar component curve.
   *
   * @param {number} time Time in seconds.
   * @returns {void}
   */
  @carbon.method
  @impl.implemented
  UpdateValue(time)
  {
    this.currentValue[0] = this.x.Update(time);
    this.currentValue[1] = this.y.Update(time);
    this.currentValue[2] = this.z.Update(time);
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
    return Math.max(this.x.Length(), this.y.Length(), this.z.Length());
  }

  /**
   * Gets the vector value at `time` into `out`.
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
   * Adds one vector key by adding matching scalar keys to each component curve.
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
    this.x.AddKey(time, value[0], interpolation, leftTangent?.[0] ?? 0, useRightTangent ? rightTangent[0] : 0, tangentType);
    this.y.AddKey(time, value[1], interpolation, leftTangent?.[1] ?? 0, useRightTangent ? rightTangent[1] : 0, tangentType);
    this.z.AddKey(time, value[2], interpolation, leftTangent?.[2] ?? 0, useRightTangent ? rightTangent[2] : 0, tangentType);
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
    this.x.SetExtrapolation(extrapolation);
    this.y.SetExtrapolation(extrapolation);
    this.z.SetExtrapolation(extrapolation);
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
    return vec3.copy(out, this.currentValue);
  }

  /**
   * Gets the vector value at `time` into `out`.
   *
   * @param {number} time Time in seconds.
   * @param {Float32Array|number[]} out Caller-owned output.
   * @returns {Float32Array|number[]} The caller-owned output.
   */
  @carbon.method
  @impl.adapted
  GetValueAt(time, out)
  {
    out[0] = this.x.GetValue(time);
    out[1] = this.y.GetValue(time);
    out[2] = this.z.GetValue(time);
    return out;
  }

  /**
   * Native derivative operation leaves the supplied output unchanged.
   *
   * @param {number} _time Time in seconds.
   * @param {Float32Array|number[]} out Caller-owned output.
   * @returns {Float32Array|number[]} The caller-owned output.
   */
  @carbon.method
  @impl.noop
  GetValueDotAt(_time, out)
  {
    return out;
  }

  /**
   * Native second derivative leaves the supplied output unchanged.
   *
   * @param {number} _time Time in seconds.
   * @param {Float32Array|number[]} out Caller-owned output.
   * @returns {Float32Array|number[]} The caller-owned output.
   */
  @carbon.method
  @impl.noop
  GetValueDoubleDotAt(_time, out)
  {
    return out;
  }

  /**
   * Native position interpolation leaves the supplied output unchanged.
   *
   * @param {number} _time Time in seconds.
   * @param {Float32Array|number[]} out Caller-owned output.
   * @returns {Float32Array|number[]} The caller-owned output.
   */
  @carbon.method
  @impl.noop
  InterpolatedPosition(_time, out)
  {
    return out;
  }
}

// Native exposure ends at this concrete table (Tr2CurveVector3_Blue.cpp).
carbon.interfaceTable({
  interfaces: [Tr2CurveVector3, ITriFunction, ITriVectorFunction, ITriCurveLength],
  chainTo: null
})(Tr2CurveVector3);
