// Source: trinity/trinity/Curves/Tr2CurveColorMixer.h
// Source: trinity/trinity/Curves/Tr2CurveColorMixer.cpp
import { color } from "#math/color";
import { vec4 } from "#math/vec4";
import { ITriFunction, ITriColorFunction, ITriCurveLength } from "#blue";
import { carbon, impl, edit, type } from "#schema";


/**
 * Color function that blends two authored colors by a fixed lerp factor and
 * applies saturation and brightness, exposing both the mixed color and its
 * linear-space conversion.
 */
@type.define({
  className: "Tr2CurveColorMixer",
  family: "curves"
})
@carbon.inherit(ITriCurveLength)
export class Tr2CurveColorMixer extends ITriColorFunction
{
  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

  @edit.readwrite
  @edit.persist
  @type.color
  color1 = color.createLinear();

  @edit.readwrite
  @edit.persist
  @type.color
  color2 = color.createLinear();

  @edit.readwrite
  @edit.persist
  @type.float32
  lerpValue = 0;

  @edit.readwrite
  @edit.persist
  @type.float32
  saturation = 1;

  @edit.readwrite
  @edit.persist
  @type.float32
  brightness = 1;

  @edit.read
  @type.color
  currentValue = color.createLinear();

  @edit.read
  @type.color
  convertedLinearValue = color.createLinear();

  _grayscale = vec4.create();

  /**
   * Updates both native color caches; RGB conversion preserves converted alpha.
   * @param {number} time Time in seconds.
   * @returns {void}
   */
  @carbon.method
  @impl.implemented
  UpdateValue(time)
  {
    this.GetValueAt(time, this.currentValue);
    color.linearFromSRGB(this.convertedLinearValue, this.currentValue);
  }

  /**
   * Updates the mixed color cache without refreshing convertedLinearValue.
   * JavaScript uses seconds-first/output-last calls instead of native overloads.
   * @param {number} time Time in seconds.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The destination.
   */
  @carbon.method
  @impl.adapted
  Update(time, out)
  {
    this.GetValueAt(time, this.currentValue);
    return vec4.copy(out, this.currentValue);
  }

  /**
   * Samples the existing saturation and brightness algorithm into the output.
   * JavaScript uses seconds-first/output-last calls; native tick overloads are not dispatched.
   * @param {number} time Time in seconds.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The destination.
   */
  @carbon.method
  @impl.adapted
  GetValueAt(time, out)
  {
    void time;
    vec4.lerp(out, this.color1, this.color2, this.lerpValue);
    if (this.saturation !== 1)
    {
      const intensity = out[0] * 0.299 + out[1] * 0.587 + out[2] * 0.114;
      this._grayscale[0] = intensity;
      this._grayscale[1] = intensity;
      this._grayscale[2] = intensity;
      this._grayscale[3] = intensity;
      vec4.lerp(out, this._grayscale, out, Math.max(0, this.saturation));
    }
    return vec4.scale(out, out, this.brightness);
  }

  /**
   * Returns the native zero mixer duration.
   * @returns {number} Duration in seconds.
   */
  @carbon.method
  @impl.implemented
  Length()
  {
    return 0;
  }

  /**
   * Samples into a caller-owned destination instead of returning a native value.
   * @param {number} time Time in seconds.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The destination.
   */
  @carbon.method
  @impl.adapted
  GetValue(time, out)
  {
    return this.GetValueAt(time, out);
  }
}

// Exact native exposure table, with no inherited exposure chain.
carbon.interfaceTable({ interfaces: [Tr2CurveColorMixer, ITriColorFunction, ITriFunction, ITriCurveLength], chainTo: null })(Tr2CurveColorMixer);
