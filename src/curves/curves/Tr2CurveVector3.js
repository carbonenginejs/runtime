// Source: E:\carbonengine\trinity\trinity\Curves\Tr2CurveVector3.h
// Source: E:\carbonengine\trinity\trinity\Curves\Tr2CurveVector3.cpp
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { Tr2CurveInterpolation, Tr2CurveTangentType } from "../enums.js";
import { Tr2CurveScalar } from "./Tr2CurveScalar.js";


/**
 * Three-component vector curve composed of independent scalar curves for x, y
 * and z; its length is the longest of the three.
 */
@type.define({
  className: "Tr2CurveVector3",
  family: "curves"
})
export class Tr2CurveVector3 extends CjsModel
{
  @io.persist
  @type.string
  name = "";

  @io.persist
  @type.objectRef("Tr2CurveScalar")
  x = new Tr2CurveScalar();

  @io.persist
  @type.objectRef("Tr2CurveScalar")
  y = new Tr2CurveScalar();

  @io.persist
  @type.objectRef("Tr2CurveScalar")
  z = new Tr2CurveScalar();

  @io.read
  @type.vec3
  currentValue = vec3.create();

  /**
   * Updates the cached vector value by updating each scalar component curve.
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
   */
  @carbon.method
  @impl.implemented
  Length()
  {
    return Math.max(this.x.Length(), this.y.Length(), this.z.Length());
  }

  /**
   * Gets the vector value at `time` into `out`.
   */
  @carbon.method
  @impl.adapted
  GetValue(time, out)
  {
    return this.GetValueAt(time, out);
  }

  /**
   * Adds one vector key by adding matching scalar keys to each component curve.
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
   * Derivative stub retained for Carbon interface compatibility.
   */
  @carbon.method
  @impl.noop
  GetValueDotAt(_time, out)
  {
    return out;
  }

  /**
   * Second-derivative stub retained for Carbon interface compatibility.
   */
  @carbon.method
  @impl.noop
  GetValueDoubleDotAt(_time, out)
  {
    return out;
  }

  /**
   * Position interpolation stub retained for Carbon interface compatibility.
   */
  @carbon.method
  @impl.noop
  InterpolatedPosition(_time, out)
  {
    return out;
  }
}
