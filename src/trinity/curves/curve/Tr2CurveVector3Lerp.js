import { CjsSchema } from "#schema";
import { exposure as be } from "#be";
// Source: trinity/trinity/Curves/Tr2CurveVector3Lerp.h
// Source: trinity/trinity/Curves/Tr2CurveVector3Lerp.cpp
import { vec3 } from "#math/vec3";
import { ITriFunction, ITriVectorFunction } from "#blue";
import { meta, type, blue } from "#schema";
import { Tr2CurveVector3LerpKeyInterpolation } from "../enums.js";


/**
 * Vector curve that eases from a fixed initial value into a child vector curve,
 * blending over the interval ending at curveStartTime with the configured start
 * interpolation.
 */
@be.define("Tr2CurveVector3Lerp")
export class Tr2CurveVector3Lerp extends ITriVectorFunction
{
  /**
   * Authored curve label stored as native std::string.
   * @type {string}
   */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  /**
   * Starting vector for the blend into the child curve; copied to output when no child exists.
   * @type {Float32Array}
   */
  @be.mapAttribute(be.READWRITE)
  @type.vec3
  initialValue = vec3.create();

  /**
   * Native LINEAR or HERMITE mode used during the initial blend interval.
   * @type {number}
   * Carbon: MAP_ATTRIBUTE_WITH_CHOOSER (trinity/trinity/Curves/Tr2CurveVector3Lerp_Blue.cpp:39); chooser Tr2CurveVector3LerpKeyInterpolationChooser (trinity/trinity/Curves/Tr2CurveVector3Lerp_Blue.cpp:7).
   */
  @be.mapAttributeWithChooser(be.ENUM | be.READWRITE, "trinity.Tr2CurveVector3LerpKeyInterpolation")
  @type.int32
  @type.enum("trinity.Tr2CurveVector3LerpKeyInterpolation")
  startInterpolation = Tr2CurveVector3LerpKeyInterpolation.HERMITE;

  /**
   * Child vector function sampled at time minus curveStartTime after the initial blend.
   * @type {ITriVectorFunction|null}
   */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.object.ref("ITriVectorFunction")
  curve = null;

  /**
   * Seconds subtracted from child sampling time; positive values also define the initial blend duration.
   * @type {number}
   */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  curveStartTime = 1;

  /**
   * Cached vector produced by the most recent update.
   * @type {Float32Array}
   */
  @be.mapAttribute(be.READ)
  @type.vec3
  currentValue = vec3.create();

  /**
   * Scratch vector holding the child curve sample at time zero for initial blending.
   * @type {Float32Array}
   */
  _curveStartValue = vec3.create();

  /**
   * Per-instance zero vector used for both endpoint tangents by the JavaScript Hermite blend.
   * @type {Float32Array}
   */
  _zeroTangent = vec3.create();

  /**
   * Updates the cached value for the supplied time.
   *
   * @implemented
   * @param {number} time Time in seconds.
   * @returns {void}
   */

  UpdateValue(time)
  {
    this.GetValueAt(time, this.currentValue);
  }

  /**
   * Copies the native returned vector into a caller-owned output buffer.
   *
   * @adapted
   * @param {number} time Time in seconds.
   * @param {Float32Array} out Destination vector.
   * @returns {Float32Array} The destination.
   */
  @be.mapMethodAndWrap("GetValueAt")
  GetValue(time, out)
  {
    return this.GetValueAt(time, out);
  }

  /**
   * Updates the cache and copies it into the caller-owned output.
   * JavaScript combines native time overloads with seconds first and output last.
   *
   * @adapted
   * @param {number} time Time in seconds.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The destination.
   */

  Update(time, out)
  {
    this.GetValueAt(time, this.currentValue);
    return vec3.copy(out, this.currentValue);
  }

  /**
   * Samples into the caller-owned output without updating the cache.
   * JavaScript combines native time overloads with seconds first and output last.
   *
   * @adapted
   * @param {number} time Time in seconds.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The destination.
   */
  GetValueAt(time, out)
  {
    if (!this.curve)
    {
      return vec3.copy(out, this.initialValue);
    }
    if (time < this.curveStartTime && this.curveStartTime > 0)
    {
      return this.LerpToFirstKey(out, time);
    }
    return this.curve.GetValueAt(time - this.curveStartTime, out);
  }

  /**
   * Retains the native no-op first derivative, leaving output unchanged.
   *
   * @adapted
   * @param {number} _time Unused time in seconds.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The unchanged destination.
   */

  GetValueDotAt(_time, out)
  {
    return out;
  }

  /**
   * Retains the native no-op second derivative, leaving output unchanged.
   *
   * @adapted
   * @param {number} _time Unused time in seconds.
   * @param {Float32Array} out Destination value.
   * @returns {Float32Array} The unchanged destination.
   */

  GetValueDoubleDotAt(_time, out)
  {
    return out;
  }

  /**
   * Retains the native no-op position interpolation, leaving output unchanged.
   *
   * @adapted
   * @param {number} _time Unused time in seconds.
   * @param {Float32Array|Float64Array} out Destination position.
   * @returns {Float32Array|Float64Array} The unchanged destination.
   */

  InterpolatedPosition(_time, out)
  {
    return out;
  }

  /**
   * Blends the initial value to the child curve first value.
   * Native private helper; JavaScript uses a caller-owned output and reusable scratch vectors.
   *
   * @adapted
   * @param {Float32Array} out Destination vector.
   * @param {number} time Time in seconds.
   * @returns {Float32Array} The destination.
   */

  LerpToFirstKey(out, time)
  {
    if (!this.curve)
    {
      return vec3.copy(out, this.initialValue);
    }
    this.curve.GetValueAt(0, this._curveStartValue);
    if (this.curveStartTime <= 0)
    {
      return vec3.copy(out, this._curveStartValue);
    }
    const ratio = time / this.curveStartTime;
    if (this.startInterpolation === Tr2CurveVector3LerpKeyInterpolation.LINEAR)
    {
      return vec3.lerp(out, this.initialValue, this._curveStartValue, ratio);
    }
    return vec3.hermite(out, this.initialValue, this._zeroTangent, this._zeroTangent, this._curveStartValue, ratio);
  }

  /**
   * Declared and never defined.
   *
   * Carbon: Tr2CurveVector3Lerp::GetAutoTangent (trinity/trinity/Curves/Tr2CurveVector3Lerp.h:46). The header
   * declares this private const method; no translation unit in the Carbon checkout defines or calls it and no
   * exposure row names it.
   *
   * @notUsed
   * @throws {Error} Always.
   */
  @meta.notUsed
  _GetAutoTangent()
  {
    throw new Error("Tr2CurveVector3Lerp.GetAutoTangent is declared in Carbon (Tr2CurveVector3Lerp.h:46) and never defined.");
  }

  /**
   * Class-local view of the native initial-blend interpolation chooser.
   * @type {Object<string, number>}
   */
  static Tr2CurveVector3LerpKeyInterpolation = Tr2CurveVector3LerpKeyInterpolation;

}

// Exact native exposure table; no inherited or implicit entries.
CjsSchema.exposure.mapInterface(ITriFunction)(Tr2CurveVector3Lerp);
CjsSchema.exposure.mapInterface(ITriVectorFunction)(Tr2CurveVector3Lerp);
