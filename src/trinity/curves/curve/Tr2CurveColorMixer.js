import { exposure as be } from "#be";
// Source: trinity/trinity/Curves/Tr2CurveColorMixer.h
// Source: trinity/trinity/Curves/Tr2CurveColorMixer.cpp
import { color } from "#math/color";
import { num } from "#math/num";
import { vec4 } from "#math/vec4";
import { ITriFunction, ITriColorFunction, ITriCurveLength } from "#blue";
import { meta, type, blue } from "#schema";


/**
 * Color function that blends two authored colors by a fixed lerp factor and
 * applies saturation and brightness, exposing both the mixed color and its
 * linear-space conversion.
 */
@be.define("Tr2CurveColorMixer")
@blue.inherit(ITriCurveLength)
@be.mapInterface(ITriColorFunction)
@be.mapInterface(ITriFunction)
@be.mapInterface(ITriCurveLength)
export class Tr2CurveColorMixer extends ITriColorFunction
{
  /**
   * Name identifying this color-mixing function (native std::string m_name).
   * @type {string}
   */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  /**
   * First authored RGBA endpoint, selected when lerpValue is zero (native Color m_color1).
   * @type {Float32Array}
   */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.color
  color1 = color.createLinear();

  /**
   * Second authored RGBA endpoint, selected when lerpValue is one (native Color m_color2).
   * @type {Float32Array}
   */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.color
  color2 = color.createLinear();

  /**
   * Interpolation factor from color1 to color2, without clamping (native float m_lerpValue).
   * @type {number}
   */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  lerpValue = 0;

  /**
   * Blend away from grayscale: zero gives grayscale and one preserves the mixed color (native float m_saturation).
   * @type {number}
   */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  saturation = 1;

  /**
   * Multiplier applied to all four mixed-color components (native float m_brightness).
   * @type {number}
   */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  brightness = 1;

  /**
   * Alpha written over the mixed colour, clamped to [0, 1]; -1 disables the
   * override (native float m_alphaOverride).
   * @type {number}
   */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  alphaOverride = -1;

  /**
   * Mixed RGBA color cached by the last Update or UpdateValue call (native Color m_currentValue).
   * @type {Float32Array}
   */
  @be.mapAttribute(be.READ)
  @type.color
  currentValue = color.createLinear();

  /**
   * currentValue converted from sRGB to linear by UpdateValue, alpha copied unchanged (native Color m_convertedLinearValue).
   * @type {Float32Array}
   */
  @be.mapAttribute(be.READ)
  @type.color
  convertedLinearValue = color.createLinear();

  /**
   * Reusable JavaScript RGBA intensity buffer used by the saturation interpolation.
   * @type {Float32Array}
   */
  _grayscale = vec4.create();

  /**
   * Updates both native color caches.
   * @param {number} time Time in seconds.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  UpdateValue(time)
  {
    this.GetValueAt(time, this.currentValue);
    this._InvertLinearColor(this.currentValue, this.convertedLinearValue);
  }

  /**
   * Converts `input`'s RGB from sRGB to linear into `out` and copies alpha
   * (Carbon cpp:72-79). Carbon's header comment calls this linear to sRGB; the
   * body is the sRGB-to-linear decode.
   * @param {Float32Array} input Source colour.
   * @param {Float32Array} out Destination colour; may be `input`.
   * @returns {void}
   */
  @meta.implemented
  _InvertLinearColor(input, out)
  {
    out[0] = this._InvertLinearValue(input[0]);
    out[2] = this._InvertLinearValue(input[2]);
    out[1] = this._InvertLinearValue(input[1]);
    out[3] = input[3];
  }

  /**
   * One sRGB channel to linear (Carbon cpp:81-89). num.linearFromSRGB is the
   * same piecewise curve, with the divisions folded into constants.
   * @param {number} x sRGB channel value.
   * @returns {number} Linear channel value.
   */
  @meta.implemented
  _InvertLinearValue(x)
  {
    return num.linearFromSRGB(x);
  }

  /**
   * Updates the mixed color cache without refreshing convertedLinearValue.
   * JavaScript uses seconds-first/output-last calls instead of native overloads.
   * @param {number} time Time in seconds.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The destination.
   */
  @blue.method
  @meta.adapted
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
  @blue.method
  @meta.adapted
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
    vec4.scale(out, out, this.brightness);
    if (this.alphaOverride !== -1)
    {
      out[3] = Math.min(1, Math.max(0, this.alphaOverride));
    }
    return out;
  }

  /**
   * Returns the native zero mixer duration.
   * @returns {number} Duration in seconds.
   */
  @blue.method
  @meta.implemented
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
  @blue.method
  @meta.adapted
  GetValue(time, out)
  {
    return this.GetValueAt(time, out);
  }
}

// Exact native exposure table, with no inherited exposure chain.
