// Source: E:\carbonengine\trinity\trinity\Curves\Tr2CurveVector2.h
// Source: E:\carbonengine\trinity\trinity\Curves\Tr2CurveVector2.cpp
import { vec2 } from "@carbonenginejs/runtime-utils/vec2";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { Tr2CurveInterpolation, Tr2CurveTangentType } from "./enums.js";
import { Tr2CurveScalar } from "./Tr2CurveScalar.js";


/**
 * Two-component vector curve composed of independent scalar curves for x and y;
 * its length is the longer of the two.
 */
@type.define({
  className: "Tr2CurveVector2",
  family: "curves"
})
export class Tr2CurveVector2 extends CjsModel
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

  @io.read
  @type.vec2
  currentValue = vec2.create();

  /**
   * Updates the cached vector value by updating each scalar component curve.
   */
  @carbon.method
  @impl.implemented
  UpdateValue(time)
  {
    this.currentValue[0] = this.x.Update(time);
    this.currentValue[1] = this.y.Update(time);
  }

  /**
   * Gets the longest scalar component curve length.
   */
  @carbon.method
  @impl.implemented
  Length()
  {
    return Math.max(this.x.Length(), this.y.Length());
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
    return out;
  }
}
