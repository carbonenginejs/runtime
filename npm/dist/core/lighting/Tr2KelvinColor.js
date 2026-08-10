import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initProto, _initClass, _init_whiteBalance, _init_extra_whiteBalance, _init_temperature, _init_extra_temperature, _init_tint, _init_extra_tint;

/** A light colour authored as a temperature in kelvin, a tint, and a white-balance illuminant. */
let _Tr2KelvinColor;
new class extends _identity {
  static [class Tr2KelvinColor extends CjsModel {
    static {
      ({
        e: [_init_whiteBalance, _init_extra_whiteBalance, _init_temperature, _init_extra_temperature, _init_tint, _init_extra_tint, _initProto],
        c: [_Tr2KelvinColor, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2KelvinColor",
        family: "trinityCore"
      })], [[[io, io.persist, type, type.int32, void 0, type.enum("Tr2StandardIlluminant")], 16, "whiteBalance"], [[io, io.persist, type, type.float32], 16, "temperature"], [[io, io.persist, type, type.float32], 16, "tint"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetColor"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_tint(this);
    }
    /** m_whiteBalance (Tr2StandardIlluminant - enum Tr2StandardIlluminant) [ENUM, READWRITE, PERSIST] */
    whiteBalance = (_initProto(this), _init_whiteBalance(this, 2));

    /** m_temperature (float) [READWRITE, PERSIST] */
    temperature = (_init_extra_whiteBalance(this), _init_temperature(this, 5500));

    /** m_tint (float) [READWRITE, PERSIST] */
    tint = (_init_extra_temperature(this), _init_tint(this, 0.5));
    // Carbon Tr2KelvinColor.cpp:23-186. An artist authors a light as a colour
    // TEMPERATURE rather than an RGB triple, and this turns that into one.
    //
    // The chain is: temperature -> chromaticity (x, y) by the Kim et al. cubic
    // approximation of the Planckian locus, -> CIE XYZ at unit luminance, ->
    // RGB, divided by the same conversion of the chosen white point so that
    // white point renders as white, then tinted and normalised so the brightest
    // channel is exactly one.
    //
    // Carbon works in doubles throughout and only narrows at the end, which
    // JavaScript gets for free.
    //
    // Two behaviours are Carbon's and are worth keeping: a temperature outside
    // 1000-25000 K returns BLACK rather than clamping, and the tint is not a
    // hue shift - it scales red and blue by (1 - tint) while scaling green by
    // tint, so the neutral value is 0.5 and the result is renormalised after.

    /** The chromaticity of a standard illuminant, as Carbon's table gives it. */
    static illuminantChromaticity(illuminant) {
      return _Tr2KelvinColor.#CHROMATICITY[illuminant] ?? _Tr2KelvinColor.#CHROMATICITY[2];
    }

    /** CIE 1931 two-degree standard observer XYZ to RGB. */
    static xyzToRgb(x, y, z, out = vec3.create()) {
      return vec3.set(out, 0.41866 * x - 0.15866 * y - 0.08283 * z, -0.09117 * x + 0.25243 * y + 0.01571 * z, 0.00092 * x - 0.00255 * y + 0.17860 * z);
    }

    /**
     * The linear RGB colour for a temperature in kelvin, a tint and a white
     * point; black when the temperature is outside 1000-25000 K.
     */
    static fromKelvin(temperature, tint, whitePoint, out = vec3.create()) {
      const T = Number(temperature);
      if (!(T >= 1000) || T > 25000) return vec3.set(out, 0, 0, 0);
      const Y = 1;
      const inverse = 1000 / T;
      let xc;
      if (T <= 4000) {
        xc = -0.2661239 * inverse ** 3 - 0.2343580 * inverse ** 2 + 0.8776956 * inverse + 0.179910;
      } else {
        xc = -3.0258469 * inverse ** 3 + 2.1070379 * inverse ** 2 + 0.2226347 * inverse + 0.24039;
      }
      let yc;
      if (T <= 2222) {
        yc = -1.1063814 * xc ** 3 - 1.3481102 * xc ** 2 + 2.1855583 * xc - 0.20219683;
      } else if (T <= 4000) {
        yc = -0.9549476 * xc ** 3 - 1.3741859 * xc ** 2 + 2.09137015 * xc - 0.16748867;
      } else {
        yc = 3.081758 * xc ** 3 - 5.8733867 * xc ** 2 + 3.75112997 * xc - 0.37001483;
      }
      const colorRgb = _Tr2KelvinColor.xyzToRgb(Y / yc * xc, Y, Y / yc * (1 - xc - yc), out);

      // The white point goes through the same conversion, and dividing by it is
      // what makes that illuminant come out neutral (cpp:154-171).
      const white = _Tr2KelvinColor.illuminantChromaticity(whitePoint);
      const whiteY = 0.54;
      const whiteRgb = _Tr2KelvinColor.xyzToRgb(whiteY / white[1] * white[0], whiteY, whiteY / white[1] * (1 - white[0] - white[1]), vec3.create());
      const red = colorRgb[0] / whiteRgb[0] * (1 - tint);
      const green = colorRgb[1] / whiteRgb[1] * tint;
      const blue = colorRgb[2] / whiteRgb[2] * (1 - tint);
      const brightest = Math.max(red, green, blue);
      return vec3.set(out, red / brightest, green / brightest, blue / brightest);
    }

    /** This record's authored colour as linear RGB. */
    GetColor(out = vec3.create()) {
      return _Tr2KelvinColor.fromKelvin(this.temperature, this.tint, this.whiteBalance, out);
    }

    /** Carbon's standard-illuminant chromaticity table, indexed by the enum. */
  }];
  Tr2StandardIlluminant = Object.freeze({
    TR2STANDARDILLUMINANT_A: 0,
    TR2STANDARDILLUMINANT_D50: 1,
    TR2STANDARDILLUMINANT_D55: 2,
    TR2STANDARDILLUMINANT_D65: 3,
    TR2STANDARDILLUMINANT_D75: 4,
    TR2STANDARDILLUMINANT_E: 5,
    TR2STANDARDILLUMINANT_F1: 6,
    TR2STANDARDILLUMINANT_F2: 7,
    TR2STANDARDILLUMINANT_F3: 8,
    TR2STANDARDILLUMINANT_F4: 9,
    TR2STANDARDILLUMINANT_F5: 10,
    TR2STANDARDILLUMINANT_F6: 11,
    TR2STANDARDILLUMINANT_F7: 12,
    TR2STANDARDILLUMINANT_F8: 13,
    TR2STANDARDILLUMINANT_F9: 14,
    TR2STANDARDILLUMINANT_F10: 15,
    TR2STANDARDILLUMINANT_F11: 16,
    TR2STANDARDILLUMINANT_F12: 17
  });
  #CHROMATICITY = Object.freeze([[0.44757, 0.40745], [0.34567, 0.35850], [0.33242, 0.34743], [0.31271, 0.32902], [0.29902, 0.31485], [0.33333, 0.33333], [0.31310, 0.33727], [0.37208, 0.37529], [0.40910, 0.39430], [0.44018, 0.40329], [0.31379, 0.34531], [0.37790, 0.38835], [0.31292, 0.32933], [0.34588, 0.35875], [0.37417, 0.37281], [0.34609, 0.35986], [0.38052, 0.37713], [0.43695, 0.40441]]);
  constructor() {
    super(_Tr2KelvinColor), _initClass();
  }
}();

export { _Tr2KelvinColor as Tr2KelvinColor };
//# sourceMappingURL=Tr2KelvinColor.js.map
