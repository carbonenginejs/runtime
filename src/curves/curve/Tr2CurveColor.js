// Source: E:\carbonengine\trinity\trinity\Curves\Tr2CurveColor.h
// Source: E:\carbonengine\trinity\trinity\Curves\Tr2CurveColor.cpp
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { Tr2CurveInterpolation, Tr2CurveTangentType } from "../enums.js";
import { Tr2CurveScalar } from "./Tr2CurveScalar.js";


const CLAMP_MIN = vec4.create();

/**
 * Color curve composed of four independent scalar curves for r, g, b and a,
 * sampled at time minus timeOffset; an empty alpha curve yields 1, and the
 * result is converted to gamma space when srgbOutput is set.
 */
@type.define({
  className: "Tr2CurveColor",
  family: "curves"
})
export class Tr2CurveColor extends CjsModel
{
  @io.persist
  @type.string
  name = "";

  @io.persist
  @type.boolean
  srgbOutput = false;

  @io.persist
  @type.objectRef("Tr2CurveScalar")
  r = new Tr2CurveScalar();

  @io.persist
  @type.objectRef("Tr2CurveScalar")
  g = new Tr2CurveScalar();

  @io.persist
  @type.objectRef("Tr2CurveScalar")
  b = new Tr2CurveScalar();

  @io.persist
  @type.objectRef("Tr2CurveScalar")
  a = new Tr2CurveScalar();

  @io.persist
  @type.float32
  timeOffset = 0;

  @io.read
  @type.color
  currentValue = vec4.createLinear();

  /**
   * Updates the cached color value by updating each scalar component curve.
   */
  @carbon.method
  @impl.adapted
  UpdateValue(time)
  {
    const t = time - this.timeOffset;
    this.currentValue[0] = this.r.Update(t);
    this.currentValue[1] = this.g.Update(t);
    this.currentValue[2] = this.b.Update(t);
    this.currentValue[3] = this.a.IsEmpty() ? 1 : this.a.Update(t);
    if (this.srgbOutput)
    {
      vec3.linearToGamma(this.currentValue, this.currentValue);
    }
  }

  /**
   * Updates the cached value and copies it into `out`.
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
      vec3.linearToGamma(out, out);
    }
    return out;
  }

  /**
   * Gets the longest scalar component curve length.
   */
  @carbon.method
  @impl.implemented
  Length()
  {
    return Math.max(this.r.Length(), this.g.Length(), this.b.Length(), this.a.Length());
  }

  /**
   * Gets the color value at `time` into `out`.
   */
  @carbon.method
  @impl.adapted
  GetValue(time, out)
  {
    return this.GetValueAt(time, out);
  }

  /**
   * Adds one color key by adding matching scalar keys to each component curve.
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
