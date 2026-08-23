import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { num } from '@carbonenginejs/runtime-utils/num';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_value, _init_extra_value, _init_fading, _init_extra_fading, _init_fadeTime, _init_extra_fadeTime;
const TRI_PI = Math.PI;

/**
 * Scalar fade envelope that ramps linearly between 0 and 1 over an authored fade
 * length, and also exposes a separate non-linear kick-in pulse that runs once
 * per fade-in.
 */
let _Tr2ScalarFader;
new class extends _identity {
  static [class Tr2ScalarFader extends CjsModel {
    static {
      ({
        e: [_init_value, _init_extra_value, _init_fading, _init_extra_fading, _init_fadeTime, _init_extra_fadeTime, _initProto],
        c: [_Tr2ScalarFader, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2ScalarFader",
        family: "curves"
      })], [[[io, io.readwrite, type, type.float32], 16, "value"], [[io, io.readwrite, type, type.float32], 16, "fading"], [[io, io.read, type, type.float32], 16, "fadeTime"], [[carbon, carbon.method, impl, impl.adapted], 18, "Update"], [[carbon, carbon.method, impl, impl.implemented], 18, "StartFade"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsZero"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetFaderValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsKickInZero"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetKickInValue"]], 0, void 0, CjsModel));
    }
    value = (_initProto(this), _init_value(this, 0));
    fading = (_init_extra_value(this), _init_fading(this, 0));
    fadeTime = (_init_extra_fading(this), _init_fadeTime(this, -1));
    kickInLength = (_init_extra_fadeTime(this), 3);

    /**
     * Advances fade state by the update context delta time.
     */
    Update(updateContext) {
      const deltaT = _Tr2ScalarFader.#getDeltaT(updateContext);
      if (this.fading !== 0) {
        this.value += this.fading * deltaT;
        if (this.value < 0) {
          this.value = 0;
          this.fading = 0;
        } else if (this.value > 1) {
          this.value = 1;
          this.fading = 0;
        }
      }
      if (this.fadeTime >= 0) {
        this.fadeTime += deltaT;
        if (this.fadeTime > this.kickInLength) {
          this.fadeTime = -1;
        }
      }
    }

    /**
     * Starts a fade-in or fade-out over the supplied duration.
     */
    StartFade(isFadeIn, fadeLength) {
      this.kickInLength = fadeLength;
      this.fading = isFadeIn ? 1 / this.kickInLength : -1 / this.kickInLength;
      if (isFadeIn) {
        this.fadeTime = 0;
      }
    }

    /**
     * Checks whether the fader is fully inactive and contributes no value.
     */
    IsZero() {
      return this.value === 0 && this.fading === 0;
    }

    /**
     * Gets the current linear fade value.
     */
    GetFaderValue() {
      return this.value;
    }

    /**
     * Checks whether the non-linear kick-in envelope has not started.
     */
    IsKickInZero() {
      return this.fadeTime <= 0;
    }

    /**
     * Gets Carbon's non-linear kick-in envelope value.
     */
    GetKickInValue() {
      if (this.fadeTime < 0) {
        return 0;
      }
      const x = num.clamp(this.fadeTime / this.kickInLength, 0, 1);
      return Math.pow(Math.sin(TRI_PI * Math.pow(x, 0.66)), 3);
    }

    /**
     * Reads the frame delta in seconds from an update context, accepting either a
     * GetDeltaT method or a plain deltaT property and defaulting to 0.
     */
  }];
  #getDeltaT(updateContext) {
    if (typeof updateContext.GetDeltaT === "function") {
      return updateContext.GetDeltaT();
    }
    return updateContext.deltaT ?? 0;
  }
  constructor() {
    super(_Tr2ScalarFader), _initClass();
  }
}();

export { _Tr2ScalarFader as Tr2ScalarFader };
//# sourceMappingURL=Tr2ScalarFader.js.map
