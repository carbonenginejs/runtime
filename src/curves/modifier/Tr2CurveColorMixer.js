// Source: E:\carbonengine\trinity\trinity\Curves\Tr2CurveColorMixer.h
// Source: E:\carbonengine\trinity\trinity\Curves\Tr2CurveColorMixer.cpp
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";


/**
 * Color function that blends two authored colors by a fixed lerp factor and
 * applies saturation and brightness, exposing both the mixed color and its
 * linear-space conversion.
 */
@type.define({
  className: "Tr2CurveColorMixer",
  family: "curves"
})
export class Tr2CurveColorMixer extends CjsModel
{
  @io.persist
  @type.string
  name = "";

  @io.read
  @type.color
  convertedLinearValue = vec4.createLinear();

  @io.persist
  @type.color
  color1 = vec4.createLinear();

  @io.persist
  @type.color
  color2 = vec4.createLinear();

  @io.read
  @type.color
  currentValue = vec4.createLinear();

  @io.persist
  @type.float32
  lerpValue = 0;

  @io.persist
  @type.float32
  saturation = 1;

  @io.persist
  @type.float32
  brightness = 1;

  #grayscale = vec4.create();

  /**
   * Updates the cached mixed color and converted linear color.
   */
  @carbon.method
  @impl.implemented
  UpdateValue(time)
  {
    this.GetValueAt(time, this.currentValue);
    vec3.linearFromSRGB(this.convertedLinearValue, this.currentValue);
  }

  /**
   * Updates the cached value and copies it into `out`.
   */
  @carbon.method
  @impl.adapted
  Update(time, out)
  {
    this.UpdateValue(time);
    return vec4.copy(out, this.currentValue);
  }

  /**
   * Gets the mixed color value at `time` into `out`.
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
      this.#grayscale[0] = intensity;
      this.#grayscale[1] = intensity;
      this.#grayscale[2] = intensity;
      this.#grayscale[3] = intensity;
      vec4.lerp(out, this.#grayscale, out, Math.max(0, this.saturation));
    }
    return vec4.scale(out, out, this.brightness);
  }

  /**
   * Gets the authored duration for this mixer.
   */
  @carbon.method
  @impl.implemented
  Length()
  {
    return 0;
  }

  /**
   * Gets the mixed color value at `time` into `out`.
   */
  @carbon.method
  @impl.adapted
  GetValue(time, out)
  {
    return this.GetValueAt(time, out);
  }
}
