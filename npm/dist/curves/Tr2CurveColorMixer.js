import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_name, _init_extra_name, _init_convertedLinearValue, _init_extra_convertedLinearValue, _init_color, _init_extra_color, _init_color2, _init_extra_color2, _init_currentValue, _init_extra_currentValue, _init_lerpValue, _init_extra_lerpValue, _init_saturation, _init_extra_saturation, _init_brightness, _init_extra_brightness;

/**
 * Color function that blends two authored colors by a fixed lerp factor and
 * applies saturation and brightness, exposing both the mixed color and its
 * linear-space conversion.
 */
let _Tr2CurveColorMixer;
class Tr2CurveColorMixer extends CjsModel {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_convertedLinearValue, _init_extra_convertedLinearValue, _init_color, _init_extra_color, _init_color2, _init_extra_color2, _init_currentValue, _init_extra_currentValue, _init_lerpValue, _init_extra_lerpValue, _init_saturation, _init_extra_saturation, _init_brightness, _init_extra_brightness, _initProto],
      c: [_Tr2CurveColorMixer, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2CurveColorMixer",
      family: "curves"
    })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.read, type, type.color], 16, "convertedLinearValue"], [[io, io.persist, type, type.color], 16, "color1"], [[io, io.persist, type, type.color], 16, "color2"], [[io, io.read, type, type.color], 16, "currentValue"], [[io, io.persist, type, type.float32], 16, "lerpValue"], [[io, io.persist, type, type.float32], 16, "saturation"], [[io, io.persist, type, type.float32], 16, "brightness"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateValue"], [[carbon, carbon.method, impl, impl.adapted], 18, "Update"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValueAt"], [[carbon, carbon.method, impl, impl.implemented], 18, "Length"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValue"]], 0, void 0, CjsModel));
  }
  name = (_initProto(this), _init_name(this, ""));
  convertedLinearValue = (_init_extra_name(this), _init_convertedLinearValue(this, vec4.createLinear()));
  color1 = (_init_extra_convertedLinearValue(this), _init_color(this, vec4.createLinear()));
  color2 = (_init_extra_color(this), _init_color2(this, vec4.createLinear()));
  currentValue = (_init_extra_color2(this), _init_currentValue(this, vec4.createLinear()));
  lerpValue = (_init_extra_currentValue(this), _init_lerpValue(this, 0));
  saturation = (_init_extra_lerpValue(this), _init_saturation(this, 1));
  brightness = (_init_extra_saturation(this), _init_brightness(this, 1));
  #grayscale = (_init_extra_brightness(this), vec4.create());

  /**
   * Updates the cached mixed color and converted linear color.
   */
  UpdateValue(time) {
    this.GetValueAt(time, this.currentValue);
    vec3.linearFromSRGB(this.convertedLinearValue, this.currentValue);
  }

  /**
   * Updates the cached value and copies it into `out`.
   */
  Update(time, out) {
    this.UpdateValue(time);
    return vec4.copy(out, this.currentValue);
  }

  /**
   * Gets the mixed color value at `time` into `out`.
   */
  GetValueAt(time, out) {
    vec4.lerp(out, this.color1, this.color2, this.lerpValue);
    if (this.saturation !== 1) {
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
  Length() {
    return 0;
  }

  /**
   * Gets the mixed color value at `time` into `out`.
   */
  GetValue(time, out) {
    return this.GetValueAt(time, out);
  }
  static {
    _initClass();
  }
}

export { _Tr2CurveColorMixer as Tr2CurveColorMixer };
//# sourceMappingURL=Tr2CurveColorMixer.js.map
